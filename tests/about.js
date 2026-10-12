const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  click(doc.querySelector('[data-tab="about"]'));
  const vp = doc.getElementById('viewport');
  check('about rendered', !!vp && vp.innerHTML.length > 500);

  const blog = vp.querySelector('a[href="eatouts-blog.html"]');
  check('blog link present', !!blog, blog ? 'text=' + blog.textContent.trim() : 'missing');
  check('blog link labelled Blog', !!blog && blog.textContent.trim() === 'Blog');
  check('blog stub button gone', !vp.querySelector('button[data-notice*="blog is coming soon"]'));

  const planner = vp.querySelector('a[href="eatouts-event-planner.html"]');
  check('event planner link gone', !planner, planner ? 'text=' + planner.textContent.trim() : 'ok');

  const suppliers = vp.querySelector('a[href="eatouts-suppliers.html"]');
  check('suppliers link present', !!suppliers, suppliers ? 'text=' + suppliers.textContent.trim() : 'missing');

  const typeLinks = vp.querySelectorAll('a[href^="eatouts-business-signup.html?type="]');
  check('list-business CTA present', typeLinks.length > 0, 'count=' + typeLinks.length);
  check('five business-type links present', typeLinks.length === 5, 'count=' + typeLinks.length);
  const typeSlugs = Array.from(typeLinks).map(a => (a.getAttribute('href') || '').split('type=')[1]).sort();
  check('type links are the five canonical slugs',
    JSON.stringify(typeSlugs) === JSON.stringify(['caterer', 'event_supplier', 'food_truck', 'liquor_store', 'restaurant']),
    typeSlugs.join(','));
  check('CTA offers List As "Restaurant"',
    Array.from(typeLinks).some(a => /list as .*restaurant/i.test(a.textContent)));

  const settings = vp.querySelector('button[data-act="toggleAboutSettings"]');
  check('Settings accordion toggle present', !!settings && settings.textContent.trim() === 'Settings');
  const listBiz = vp.querySelector('details.setacc summary.setrow');
  check('List Business accordion toggle present', !!listBiz && /list business/i.test(listBiz.textContent));

  const needDesign = vp.querySelector('a[href="designer-services.html"]');
  check('Need Design link present', !!needDesign, needDesign ? 'text=' + needDesign.textContent.trim() : 'missing');
  check('Need Design labelled correctly', !!needDesign && /need design/i.test(needDesign.textContent.trim()));
  const listBizDetails = listBiz && listBiz.parentElement;
  const needDesignRow = needDesign && needDesign.closest('.acc-in');
  check('Need Design is a Settings-level row (not inside List Business)',
    !!needDesignRow && !needDesign.closest('details.setacc'), needDesignRow ? 'inside settings panel' : 'missing');
  check('Need Design sits directly after the List Business panel',
    !!needDesign && !!listBizDetails && needDesign.previousElementSibling === listBizDetails,
    'expected the Need Design anchor to immediately follow <details.setacc>');
  const bizPanel = listBizDetails && listBizDetails.querySelector('.acc-in');
  const bizLinks = bizPanel ? Array.from(bizPanel.querySelectorAll('a[href^="eatouts-business-signup.html?type="]')) : [];
  check('List Business panel holds only the 5 List As links',
    !!bizPanel && bizLinks.length === 5 && !bizPanel.querySelector('a[href="designer-services.html"]'),
    'count=' + bizLinks.length);

  const share = vp.querySelector('a.btn.share');
  check('Share EatOuts link present', !!share, share ? 'text=' + share.textContent.trim() : 'missing');
  check('Share EatOuts opens WhatsApp share', !!share && /wa\.me\/\?text=/.test(share.getAttribute('href') || ''));

  check('no window errors', errors.length === 0, errors.join(' | '));

  console.log('');
  if (fails) { console.log('ABOUT TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('ABOUT TEST PASSED');
}, 400);
