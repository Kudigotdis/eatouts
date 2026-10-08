const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const feed = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'assets', 'data', 'blog_posts.json'), 'utf8'));
const posts = Array.isArray(feed.posts) ? feed.posts : [];
const first = posts.filter(p => p.status === 'published')[0] || posts[0];
const sleep = ms => new Promise(r => setTimeout(r, ms));

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function boot(url) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, 'eatouts-blog.html'), 'utf8');
  // serve the real feed through a fetch polyfill injected before any page script
  const polyfill = '<script>window.__FEED__=' + JSON.stringify(feed) +
    ';window.fetch=function(u){if(String(u).indexOf("blog_posts")>-1){' +
    'return Promise.resolve({ok:true,status:200,json:function(){return Promise.resolve(window.__FEED__);}});}' +
    'return Promise.reject(new Error("offline "+u));};</script>';
  html = html.replace(/<head([^>]*)>/, '<head$1>' + polyfill);
  // inline every external script so jsdom runs the page with no HTTP server
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { url, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  dom.window.confirm = () => true;
  return { dom, window: dom.window, doc: dom.window.document, errors };
}

async function main() {
  /* ---------- 1. timeline boots from the public feed ---------- */
  const a = boot('http://localhost/eatouts-blog.html');
  await sleep(300);
  const items = a.doc.querySelectorAll('.tl-item');
  check('timeline renders feed posts', items.length >= 5, 'got ' + items.length + ' of ' + posts.length + ' feed posts');
  check('search input present', !!a.doc.getElementById('blogSearch'));
  check('feed boot: no window errors', a.errors.length === 0, a.errors.join(' | '));
  const B = a.window.EatoutsBlog;
  check('EatoutsBlog public API', !!B && typeof B.init === 'function' && typeof B.openPostBySlug === 'function');
  check('public feed cached locally', !!a.window.localStorage.getItem('eatouts_blog_cache_v1'));

  /* ---------- 2. deep link ?post=slug fills OG tags ---------- */
  const d2 = boot('http://localhost/eatouts-blog.html?post=' + encodeURIComponent(first.slug));
  await sleep(300);
  const postTitle = d2.doc.querySelector('.post-title');
  check('deep link opens the post', !!postTitle && postTitle.textContent === first.title,
    postTitle ? 'got "' + postTitle.textContent + '"' : 'no .post-title');
  const og = d2.doc.querySelector('meta[property="og:title"]');
  check('og:title filled', !!og && og.getAttribute('content') === first.title,
    og ? 'content="' + og.getAttribute('content') + '"' : 'meta missing');
  const ogUrl = d2.doc.querySelector('meta[property="og:url"]');
  check('og:url points at ?post= link', !!ogUrl && ogUrl.getAttribute('content').indexOf('?post=' + first.slug) > -1,
    ogUrl ? ogUrl.getAttribute('content') : 'missing');
  check('og:description filled', !!(d2.doc.querySelector('meta[property="og:description"]') || {}).content);
  check('document.title tracks the post', d2.window.document.title.indexOf(first.title) > -1,
    d2.window.document.title);
  const tw = d2.doc.querySelector('meta[name="twitter:card"]');
  check('twitter:card present', !!tw);
  check('deep-link boot: no window errors', d2.errors.length === 0, d2.errors.join(' | '));

  /* leaving the post clears the OG tags again */
  d2.window.EatoutsBlog.back();
  check('back() clears og:title', !d2.doc.querySelector('meta[property="og:title"]'));
  check('back() restores document.title', d2.window.document.title.indexOf(first.title) === -1,
    d2.window.document.title);

  /* ---------- 3. tag pills write #tag- deep links ---------- */
  const pill = a.doc.querySelector('[data-act="pickTag"][data-tag]:not([data-tag=""])');
  if (pill) {
    const tag = pill.getAttribute('data-tag');
    pill.dispatchEvent(new a.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    check('pickTag sets #tag- hash', (a.window.location.hash || '').indexOf('#tag-') === 0,
      'hash=' + a.window.location.hash);
    check('activeTag matches pill', B._state().activeTag === tag,
      B._state().activeTag + ' vs ' + tag);
    const clear = a.doc.querySelector('[data-act="pickTag"][data-tag=""]');
    clear.dispatchEvent(new a.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    check('All-posts clears the hash', !a.window.location.hash, 'hash=' + a.window.location.hash);
  } else {
    check('tag pill available for hash test', false, 'no pickTag pill in timeline');
  }

  /* boot straight from a #tag- hash */
  const tagSlug = (first.tags && first.tags[0]) ? first.tags[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') : '';
  if (tagSlug) {
    const d4 = boot('http://localhost/eatouts-blog.html#tag-' + tagSlug);
    await sleep(300);
    check('boot reads active tag from hash', d4.window.EatoutsBlog._state().activeTag !== '',
      'activeTag="' + d4.window.EatoutsBlog._state().activeTag + '"');
    check('hash boot: no window errors', d4.errors.length === 0, d4.errors.join(' | '));
  }

  /* ---------- 4. admin: version history + size guard ---------- */
  B.setAdmin(true);
  B.handleAction('adminNew', { getAttribute: () => null });
  let st = B._state();
  check('admin edit view open', st.view === 'admin-edit' && !!st.draft);
  st.draft.title = 'Version test';
  st.draft.blocks = [{ type: 'text', text: 'v1 body' }];
  B.handleAction('savePost', { getAttribute: () => null });
  const store1 = JSON.parse(a.window.localStorage.getItem('eatouts_blog_v1'));
  check('first save writes history snapshot', store1.history && store1.history[st.draft.id] &&
    store1.history[st.draft.id].length === 1,
    store1.history ? 'len=' + (store1.history[st.draft.id] || []).length : 'no history key');
  check('post persisted on first save', store1.posts.some(p => p.id === st.draft.id));

  st.draft.title = 'Version test 2';
  B.handleAction('savePost', { getAttribute: () => null });
  const store2 = JSON.parse(a.window.localStorage.getItem('eatouts_blog_v1'));
  check('second save adds second snapshot', store2.history[st.draft.id].length === 2,
    'len=' + store2.history[st.draft.id].length);

  B.handleAction('adminEdit', { getAttribute: () => st.draft.id });
  check('version list rendered in editor', /Previous versions/.test(a.doc.body.innerHTML));
  check('two restore buttons', a.doc.querySelectorAll('[data-act="restoreVer"]').length === 2,
    'got ' + a.doc.querySelectorAll('[data-act="restoreVer"]').length);

  B.handleAction('restoreVer', { getAttribute: n => (n === 'data-i' ? '0' : null) });
  check('restore version 0 reverts title', B._state().draft.title === 'Version test',
    'title="' + B._state().draft.title + '"');

  const histBefore = JSON.parse(a.window.localStorage.getItem('eatouts_blog_v1')).history[st.draft.id].length;
  B._state().draft.blocks = [{ type: 'text', text: 'x'.repeat(210 * 1024) }];
  B.handleAction('savePost', { getAttribute: () => null });
  const histAfter = JSON.parse(a.window.localStorage.getItem('eatouts_blog_v1')).history[st.draft.id].length;
  check('oversized post is refused (no snapshot)', histAfter === histBefore,
    'before=' + histBefore + ' after=' + histAfter);

  check('admin flow: no window errors', a.errors.length === 0, a.errors.join(' | '));

  console.log('');
  if (fails) { console.log('BLOG TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('BLOG TEST PASSED');
}

main().catch(e => { console.error('BLOG TEST CRASH:', e); process.exit(1); });
