/* T03 — tapping a row in any directory panel pins the opened card to the top of
   its list and dims the rest. jsdom has neither layout nor scrollIntoView, so
   the scroll is observed through a stub: what matters is that exactly one
   element is targeted, that it is the opened card, and that it asks for
   block:"start" (the height-independent alignment that also survives the
   .acc-wrap grid-rows transition). */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
/* ---- test-only: ignore jsdom 'Not implemented: navigation' noise ---- */
(function () {
  var _emit = vc.emit.bind(vc);
  vc.emit = function (ev, e) {
    if (ev === 'jsdomError' && e && /Not implemented: navigation/.test(String(e.message || ''))) return false;
    return _emit(ev, e);
  };
})();
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
const ev = s => window.eval(s);
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log('ok    ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra !== undefined ? ' :: ' + extra : '')); }
};

/* jsdom does not implement scrollIntoView: record the requests instead. */
const scrolls = [];
window.Element.prototype.scrollIntoView = function (opts) {
  scrolls.push({ el: this, block: opts && opts.block, behavior: opts && opts.behavior });
};

const PANELS = [
  { page: 'food', attr: 'data-racc', act: 'toggleRestaurant', key: 'restaurantOpen', sync: 'syncRestAccordions' },
  { page: 'catering', attr: 'data-cacc', act: 'toggleCatering', key: 'cateringOpen', sync: 'syncCateringAccordions' },
  { page: 'bakeries', attr: 'data-bacc', act: 'toggleBakery', key: 'bakeryOpen', sync: 'syncBakeryAccordions' },
  { page: 'beverages', attr: 'data-bacc', act: 'toggleBottleStore', key: 'bottleOpen', sync: 'syncBottleAccordions' }
];

setTimeout(() => {
  ev('state.tab="restaurants"; state.restPanel="food"; render();');

  PANELS.forEach(p => {
    const rows = () => Array.prototype.slice.call(
      doc.querySelectorAll('.bevpage[data-page="' + p.page + '"] [' + p.attr + ']'));
    const list = rows();
    check(p.page + ': panel lists rows', list.length > 5, list.length + ' rows');
    if (list.length < 6) return;

    /* clean, closed state */
    ev('state.' + p.key + '=null;' + p.sync + '();');
    scrolls.length = 0;
    check(p.page + ': no focused card while closed', doc.querySelectorAll('.scroll.has-open').length === 0);

    /* the row header is the tap target; row 5 so it is not already at the top */
    const row = list[4];
    click(row.querySelector('.rrow[data-act="' + p.act + '"]'));

    check(p.page + ': tap opens the card', row.classList.contains('open'), row.className);
    check(p.page + ': exactly one scroll request', scrolls.length === 1, scrolls.length);
    check(p.page + ': scroll targets the opened card', !!scrolls[0] && scrolls[0].el === row);
    check(p.page + ': card is pinned to the top', !!scrolls[0] && scrolls[0].block === 'start', scrolls[0] && scrolls[0].block);
    check(p.page + ': scroll is animated', !!scrolls[0] && scrolls[0].behavior === 'smooth', scrolls[0] && scrolls[0].behavior);
    check(p.page + ': the card\'s own list takes the focus',
      !!row.parentNode && row.parentNode.classList.contains('has-open'),
      row.parentNode ? row.parentNode.className : 'no parent');
    check(p.page + ': other rows dim to 25%', window.getComputedStyle(list[0]).opacity === '0.25',
      window.getComputedStyle(list[0]).opacity);
    check(p.page + ': the open card stays lit', window.getComputedStyle(row).opacity === '1',
      window.getComputedStyle(row).opacity);

    /* closing restores the list and must not scroll again */
    scrolls.length = 0;
    click(row.querySelector('.rrow[data-act="' + p.act + '"]'));
    check(p.page + ': second tap closes the card', !row.classList.contains('open'));
    check(p.page + ': closing clears the focus dim', doc.querySelectorAll('.scroll.has-open').length === 0);
    check(p.page + ': closing restores the dimmed rows', window.getComputedStyle(list[0]).opacity === '1',
      window.getComputedStyle(list[0]).opacity);
    check(p.page + ': closing never scrolls', scrolls.length === 0, scrolls.length);

    /* a row near the bottom still asks to be pinned to the top */
    scrolls.length = 0;
    const low = list[list.length - 2];
    click(low.querySelector('.rrow[data-act="' + p.act + '"]'));
    check(p.page + ': a bottom row still pins to the top',
      scrolls.length === 1 && scrolls[0].el === low && scrolls[0].block === 'start', scrolls.length);
    ev('state.' + p.key + '=null;' + p.sync + '();');
  });

  /* ---- bakery and bottle-store rows share data-bacc: no cross-talk ---- */
  const bottleRows = Array.prototype.slice.call(doc.querySelectorAll('.bevpage[data-page="beverages"] [data-bacc]'));
  const bakeryRows = Array.prototype.slice.call(doc.querySelectorAll('.bevpage[data-page="bakeries"] [data-bacc]'));
  ev('state.bottleOpen="' + bottleRows[0].getAttribute('data-bacc') + '";state.bakeryOpen=null;' +
    'syncBottleAccordions();syncBakeryAccordions();');
  check('a bottle store opens in the beverages column', bottleRows[0].classList.contains('open'));
  ev('state.bakeryOpen="' + bakeryRows[0].getAttribute('data-bacc') + '";syncBakeryAccordions();');
  check('opening a bakery leaves the bottle store open', bottleRows[0].classList.contains('open'));
  check('the tapped bakery row opens', bakeryRows[0].classList.contains('open'));
  ev('state.bakeryOpen=null;syncBakeryAccordions();');
  check('closing the bakery leaves the bottle store untouched', bottleRows[0].classList.contains('open'));

  /* ---- leaving the tab collapses every panel, beverages included ---- */
  check('closeAllRitemAccordions clears all four panels',
    ev('(function(){state.restaurantOpen="a";state.cateringOpen="b";state.bakeryOpen="c";state.bottleOpen="d";' +
      'closeAllRitemAccordions();return state.restaurantOpen===null&&state.cateringOpen===null&&' +
      'state.bakeryOpen===null&&state.bottleOpen===null;})()'));
  check('no card stays focused or open after closeAll',
    doc.querySelectorAll('.scroll.has-open').length === 0 && doc.querySelectorAll('.ritem.open').length === 0,
    doc.querySelectorAll('.ritem.open').length + ' open rows');

  /* ---- regression guard: a directory card must never show a street address ---- */
  const rawSrc = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  check('no address line renders in any directory card',
    doc.querySelectorAll('.baddr').length === 0,
    doc.querySelectorAll('.baddr').length + ' found');
  check('no card builder emits an address line', !/class="baddr"/.test(rawSrc));


  console.log('');
  console.log(pass + ' passed, ' + fail + ' failed');
  const realErrors = errors.filter(e => !/navigation to another Document/.test(e));
  if (realErrors.length) {
    console.log('window errors: ' + realErrors.length);
    realErrors.slice(0, 5).forEach(e => console.log('  ' + e));
  }
  process.exit(fail || realErrors.length ? 1 : 0);
}, 50);
