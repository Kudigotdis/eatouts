/* Integration tests for venue-slug routing (Layer 3).
   Loads index.html in jsdom with injected <meta name="eatouts-venue"> so
   boot runs openVenueFromSlug(readVenueMeta()). Covers H4 cases a-e:

   a) Null-bridge skeleton: restaurant slug not in bridge → venue-about skeleton
   b) Orphan shell: bottle_store / catering slug not in client API → orphan page
   c) Meta parsing: readVenueMeta() parses all three kinds
   d) resetSeoMeta: click CTA from orphan → meta removed, title reset
   e) backFromRestView: click CTA from orphan → orphan state cleared
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
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
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

/* ---- a) Null-bridge skeleton: restaurant not in bridge → venue-about skeleton ---- */
pending++;
runJSDOM(buildHtml({ id: 'rest_test', slug: 'testrest', kind: 'restaurant', name: 'Test Restaurant' }), (window, doc, click, errors) => {
  const s = screenDoc(doc);
  check('a) venue-about page present', s && s.getAttribute('data-page') === 'venue-about', s ? s.getAttribute('data-page') : 'missing');
  check('a) hero contains name not slug', doc.body.textContent.indexOf('Test Restaurant') >= 0);
  check('a) skeleton present', doc.querySelector('.skeleton') !== null);
  done();
});

/* ---- b) Orphan shell: bottle_store not in client API ---- */
pending++;
runJSDOM(buildHtml({ id: 'blk_orphan', slug: 'orphanstore', kind: 'bottle_store', name: 'Orphan Store' }), (window, doc, click, errors) => {
  const s = screenDoc(doc);
  check('b) venue-about page present for orphan', s && s.getAttribute('data-page') === 'venue-about', s ? s.getAttribute('data-page') : 'missing');
  check('b) title is "Business not available — EatOuts"', doc.title === 'Business not available — EatOuts', doc.title);
  const robots = doc.querySelector('meta[name="robots"][data-orphan="1"]');
  check('b) robots noindex orphan meta exists', !!robots && robots.getAttribute('content') === 'noindex', robots ? robots.outerHTML : 'missing');
  check('b) hero does NOT contain orphan name', doc.body.textContent.indexOf('Orphan Store') < 0);

  /* ---- d) resetSeoMeta: click CTA clears orphan meta + title ---- */
  const cta = s.querySelector('button[data-act="backFromRestView"]');
  check('b/d) CTA button present', !!cta);
  if (cta) {
    click(cta);
    check('d) orphan meta removed after CTA', !doc.querySelector('meta[name="robots"][data-orphan="1"]'));
    check('d) title reset to "EatOuts" after CTA', doc.title === 'EatOuts', doc.title);
  }

  /* ---- e) backFromRestView clears orphan state ---- */
  check('e) orphan meta removed after backFromRestView', !doc.querySelector('meta[name="robots"][data-orphan="1"]'));
  check('e) title reset after backFromRestView', doc.title === 'EatOuts', doc.title);
  done();
});

/* ---- c) Meta parsing: readVenueMeta() parses all three kinds ---- */
pending++;
runJSDOM(buildHtml(null), (window, doc, click, errors) => {
  const readVenueMeta = window.readVenueMeta;
  check('c) no meta → readVenueMeta returns null', readVenueMeta() === null);

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
