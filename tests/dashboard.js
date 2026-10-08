const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function boot(opsV1) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, 'restaurant-dashboard.html'), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://localhost/restaurant-dashboard.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem('eatouts_session_v1', JSON.stringify({ restaurantId: 'r_demo', name: 'Demo' }));
      if (opsV1) w.localStorage.setItem('eatouts_ops_v1', JSON.stringify(opsV1));
      w.HTMLAnchorElement.prototype.click = function () {}; // suppress blob download navigation
    }
  });
  return { dom, window: dom.window, doc: dom.window.document, errors };
}

/* ---------- owed state (no ops row) ---------- */
const a = boot(null);
const bodyA = a.doc.body.textContent;
check('dashboard rendered', !!a.doc.getElementById('app') && a.doc.getElementById('app').innerHTML.length > 500);
check('tier price P100 (was hardcoded 300)', bodyA.includes('P100 / month'), 'billing text: ' + (bodyA.match(/P\d+ \/ month/)||['none'])[0]);
check('no stale P500/P800 starter price', !bodyA.includes('P800 / month'));
check('setup fee shows P300 owing', bodyA.includes('P300 setup owing'));
check('export button present', !!a.doc.getElementById('btnExport'));
check('billing has no 300/500/800 hardcode in HTML source', !/starter:300,growth:500,pro:800/.test(fs.readFileSync(path.join(APP_DIR, 'restaurant-dashboard.html'), 'utf8')));
check('boot (owed): no window errors', a.errors.length === 0, a.errors.join(' | '));

/* ---------- export payload shape ---------- */
let captured = null;
a.window.URL.createObjectURL = b => { captured = b; return 'blob:fake'; };
a.window.URL.revokeObjectURL = () => {};
a.doc.getElementById('btnExport').dispatchEvent(new a.window.MouseEvent('click', { bubbles: true }));
check('export produced a blob', !!captured);
if (captured) {
  captured.text().then(text => {
    const p = JSON.parse(text);
    check('export $schema eatouts.venue.v1', p.$schema === 'eatouts.venue.v1');
    check('export has intake field names', ['slug','name','description','logo','coverImage','types','category','location','landmark','contacts','socials','profile','content','generatedAt'].every(k => k in p),
      Object.keys(p).join(','));
    check('export content has menu+gallery keys', ['menuCategories','menuItems','promos','events','galleryGroups','galleryImages','performers','performances'].every(k => k in p.content));
    check('export slug generated', typeof p.slug === 'string' && p.slug.length > 0, 'slug=' + p.slug);
    phase2();
  });
} else { phase2(); }

/* ---------- paid state (ops row) ---------- */
function phase2() {
  const b = boot({ venues: [{ slug: 'untitled-restaurant', name: 'Untitled restaurant', setupPaid: true }] });
  const bodyB = b.doc.body.textContent;
  check('setup fee shows P300 paid when ops says so', bodyB.includes('P300 setup paid'));
  check('boot (paid): no window errors', b.errors.length === 0, b.errors.join(' | '));

  console.log('');
  if (fails) { console.log('DASHBOARD TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('DASHBOARD TEST PASSED');
}
