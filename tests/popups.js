const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
const raw = html;
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
const ev = s => window.eval(s);
const evj = s => JSON.parse(JSON.stringify(ev(s)));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- CSS source checks (jsdom drops max()/calc() from computed
     left/right, so the geometry itself is asserted against the stylesheet) ---------- */
  const base = (raw.match(/(^|\n)\.fpop\{([^}]*)\}/m) || [])[2] || '';
  check('base .fpop rule found', base.length > 0);
  check('.fpop is position:fixed', /(^|;|\s)position:fixed(;|$)/.test(base), base.slice(0, 120));
  check('.fpop top:66px', /(^|;|\s)top:66px(;|$)/.test(base));
  check('.fpop bottom:auto', /(^|;|\s)bottom:auto(;|$)/.test(base));
  const inset = 'max(16px,calc((100% - 460px)/2 + 16px))';
  const leftM = base.match(/(^|;|\s)left:([^;]+)/);
  const rightM = base.match(/(^|;|\s)right:([^;]+)/);
  check('.fpop left is the 16px frame inset', !!leftM && leftM[2].trim() === inset, leftM && leftM[2]);
  check('.fpop right mirrors left (equal spacing)', !!rightM && rightM[2].trim() === (leftM ? leftM[2].trim() : ''), rightM && rightM[2]);
  check('no popup rule keeps an 8px edge cap', raw.indexOf('left:8px;right:8px') === -1);
  check('no popup rule anchors to its trigger', raw.indexOf('bottom:calc(100%') === -1);
  check('promo-focus popup tucks to top:16px', raw.indexOf('#shell.promos-tab.promo-focus .fpop{top:16px}') !== -1);
  /* .fpop-note itself stays left-aligned: only the branch picker centres it */
  const noteRule = (raw.match(/(^|\n)\.fpop-note\{([^}]*)\}/m) || [])[2] || '';
  check('shared .fpop-note rule has no text-align', noteRule.length > 0 && noteRule.indexOf('text-align') === -1, noteRule);
  check('only rest-loc-pop centres its notes', /\.fpop\.rest-loc-pop \.fpop-note\{text-align:center\}/.test(raw));

  /* ---------- per-popup computed geometry ---------- */
  const INSET_RE = /max\(16px,calc\(\(100% - 460px\)\/2 \+ 16px\)\)/;
  const seen = [];
  const assertPop = (label, el) => {
    if (!el) { check(label + ' opens', false); return; }
    check(label + ' opens', true);
    const cs = window.getComputedStyle(el);
    check(label + ' is position:fixed', cs.position === 'fixed', cs.position);
    check(label + ' top:66px', cs.top === '66px', cs.top);
    check(label + ' bottom:auto (not bottom-anchored)', cs.bottom === 'auto', cs.bottom);
    seen.push(label);
  };

  const closeAll = () => ev(
    'state.promoFilterOpen=false;state.promoTownPicker=false;state.promoAreaPicker=false;state.promoTypePicker=false;' +
    'state.restTownPicker=false;state.restAreaPicker=false;state.restTypePicker=false;state.restLocPicker=null;' +
    'state.filterOpen=false;state.galPopup=false;state.restFilterOpen=false;render()');

  /* promos tab: town / area / type filter popups */
  click(doc.querySelector('[data-tab="promos"]'));
  closeAll();
  ev('state.promoFilterOpen=true;state.promoTownPicker=true;render()');
  assertPop('promo town popup', doc.querySelector('#filter-bar .fpop.town-pop'));
  closeAll();
  ev('state.promoFilterOpen=true;state.promoAreaPicker=true;render()');
  assertPop('promo area popup', doc.querySelector('#filter-bar .fpop.area-pop'));
  closeAll();
  ev('state.promoFilterOpen=true;state.promoTypePicker=true;render()');
  assertPop('promo type popup', doc.querySelector('#filter-bar .fpop.type-pop'));
  closeAll();

  /* restaurants tab: town / area / type / branch popups */
  click(doc.querySelector('[data-tab="restaurants"]'));
  closeAll();
  ev('state.restFilterOpen=true;state.restTownPicker=true;render()');
  assertPop('restaurant town popup', doc.querySelector('#cbar .fpop.town-pop.rest-town-pop'));
  closeAll();
  ev('state.restFilterOpen=true;state.restAreaPicker=true;render()');
  assertPop('restaurant area popup', doc.querySelector('#cbar .fpop.area-pop.rest-area-pop'));
  closeAll();
  ev('state.restFilterOpen=true;state.restTypePicker=true;render()');
  assertPop('restaurant type popup', doc.querySelector('#cbar .fpop.rest-type-pop'));
  closeAll();
  const brand = evj('EatoutsBridge.groupedListing().find(function(g){return g.branches.length>1}).key');
  ev('state.restaurantOpen=' + JSON.stringify(brand) + ';state.restLocPicker={brand:' + JSON.stringify(brand) + ',axis:"town"};render()');
  assertPop('restaurant branch (rest-loc) popup', doc.querySelector('#viewport .fpop.rest-loc-pop'));
  closeAll();

  /* gallery tab: View Filter + Viewed Restaurant popups */
  click(doc.querySelector('[data-tab="gallery"]'));
  closeAll();
  ev('state.filterOpen=true;render()');
  assertPop('gallery View Filter popup', doc.querySelector('#cbar .fpop[aria-label="Gallery View Filter"]'));
  closeAll();
  ev('state.galPopup=true;render()');
  assertPop('gallery Viewed Restaurant popup', doc.querySelector('#cbar .fpop.gal-rest-pop'));
  closeAll();

  check('every popup variant exercised', seen.length >= 8, seen.length);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nPOPUPS TEST PASSED' : '\nPOPUPS TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);
