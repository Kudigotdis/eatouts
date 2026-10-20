/* Integration tests for venue-slug routing (Layer 3).
   Loads index.html in jsdom with injected <meta name="eatouts-venue"> so
   boot runs openVenueFromSlug(readVenueMeta()). About is now a standalone
   page (venue-about.html?link=<slug>), so this test verifies that the
   inline .screen[data-page="venue-about"] is no longer rendered in
   index.html and that boot does not crash on navigation.

   a) restaurant slug not in bridge -> no inline about screen
   b) bottle_store orphan slug -> no inline about screen, no orphan meta
   c) Meta parsing: readVenueMeta() parses all three kinds
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

function buildHtml(venueMeta) {
  let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  if (venueMeta) {
    const meta = '<meta name="eatouts-venue" content="' +
      JSON.stringify(venueMeta).replace(/"/g, '&quot;') + '">';
    html = html.replace(/<head>/, '<head>' + meta);
  }
  return html;
}

function runJSDOM(html, fn) {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', e => {
    if (/Not implemented: navigation/.test(String((e && e.message) || ''))) return;
    errors.push('jsdomError: ' + (e.stack || e.message));
  });
  const dom = new JSDOM(html, {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const { window } = dom;
  const doc = window.document;
  const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  setTimeout(() => fn(window, doc, click, errors), 200);
}

let fails = 0;
let pending = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}
function done() {
  pending--;
  if (pending === 0) {
    console.log('');
    console.log(fails ? (fails + ' FAILED') : 'all integration checks passed');
    process.exit(fails ? 1 : 0);
  }
}

function screenDoc(doc) { return doc.querySelector('.screen'); }

/* ---- a) restaurant slug: no inline venue-about screen ---- */
pending++;
runJSDOM(buildHtml({ id: 'rest_test', slug: 'testrest', kind: 'restaurant', name: 'Test Restaurant' }), (window, doc, click, errors) => {
  const s = screenDoc(doc);
  check('a) no inline venue-about screen', !s || s.getAttribute('data-page') !== 'venue-about', s ? s.getAttribute('data-page') : 'missing');
  done();
});

/* ---- b) bottle_store orphan slug: no inline about screen, no orphan meta ---- */
pending++;
runJSDOM(buildHtml({ id: 'blk_orphan', slug: 'orphanstore', kind: 'bottle_store', name: 'Orphan Store' }), (window, doc, click, errors) => {
  const s = screenDoc(doc);
  check('b) no inline venue-about screen for orphan', !s || s.getAttribute('data-page') !== 'venue-about', s ? s.getAttribute('data-page') : 'missing');
  check('b) no orphan robots meta', doc.querySelector('meta[name="robots"][data-orphan="1"]') === null);
  done();
});

/* ---- c) Meta parsing: readVenueMeta() parses all three kinds ---- */
pending++;
runJSDOM(buildHtml(null), (window, doc, click, errors) => {
  const readVenueMeta = window.readVenueMeta;
  check('c) no meta -> readVenueMeta returns null', readVenueMeta() === null);

  function injectAndCheck(kind, name) {
    const existing = doc.querySelector('meta[name="eatouts-venue"]');
    if (existing) existing.remove();
    const meta = doc.createElement('meta');
    meta.name = 'eatouts-venue';
    meta.setAttribute('content', JSON.stringify({ id: 'x', slug: 's', kind: kind, name: name }));
    doc.head.appendChild(meta);
    const m = readVenueMeta();
    check('c) readVenueMeta ' + kind + ' parses', !!m && m.kind === kind && m.name === name, JSON.stringify(m));
  }

  injectAndCheck('restaurant', 'Test Restaurant');
  injectAndCheck('bottle_store', 'LIQUORAMA');
  injectAndCheck('catering', 'Bontle Makoni Catering');
  done();
});