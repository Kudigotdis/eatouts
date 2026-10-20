/* ============================================================
   BOTTLE STORES test
   Part A - the data file (assets/data/BottleLliquorStoresDatabase.js)
            and the API layer (js/eatouts-bottle-stores.js) in plain Node.
   Part B - the Beverages landing UI in index.html (jsdom): the store
            card list, expand-to-options, branch picker, town/area
            filter bar and live search.
   Run: node tests/bottle-stores.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

/* ---------------- Part A: data + API ---------------- */
(function dataAndApi() {
  const w = {};
  global.window = w;
  require(path.join(APP_DIR, 'assets', 'data', 'BottleLliquorStoresDatabase.js'));
  const D = w.EATOUTS_BOTTLE_STORES;
  require(path.join(APP_DIR, 'js', 'eatouts-bottle-stores.js'));
  const A = w.EatoutsBottleStores;

  check('data global exposes brands/stores/towns',
    D && Array.isArray(D.brands) && Array.isArray(D.stores) && Array.isArray(D.towns),
    D ? Object.keys(D).join(',') : typeof D);
  check('47 brands in the directory', D.brands.length === 47, D.brands.length);
  check('110 stores in the directory', D.stores.length === 110, D.stores.length);
  check('24 unique towns', D.towns.length === 24, D.towns.length);
  check('totals match the arrays',
    D.totals.brands === D.brands.length && D.totals.stores === D.stores.length,
    JSON.stringify(D.totals));

  const ids = new Set(D.stores.map(s => s.id));
  check('every store id is unique', ids.size === D.stores.length, ids.size);
  const shapeless = D.stores.filter(s => !s.id || !s.slug || !s.name || !s.brand || !s.brandName);
  check('every store has id/slug/name/brand', shapeless.length === 0, shapeless.length);
  const townless = D.stores.filter(s => !s.town).map(s => s.id).sort();
  check('only the two known chain placeholders lack a town',
    JSON.stringify(townless) === JSON.stringify(['boxer-liquor', 'choppies-liquor']),
    townless.join(','));

  const chain = {};
  D.brands.filter(b => b.isChain).forEach(b => { chain[b.slug] = b.branches.length; });
  check('LIQUORAMA expands to 43 branches', chain['liquorama'] === 43, chain['liquorama']);
  check('SEGWANA expands to 4 branches', chain['segwana'] === 4, chain['segwana']);
  check('TOPS AT SPAR expands to 14 branches', chain['tops-at-spar'] === 14, chain['tops-at-spar']);
  check('SEFALANA is a chain of 6 branches', chain['sefalana'] === 6 && A.get('sefalana').isChain, chain['sefalana']);

  const sef = A.get('sefalana');
  check('Sefalana towns include Maun/Gaborone/Jwaneng/Letlhakane',
    ['Maun', 'Gaborone', 'Jwaneng', 'Letlhakane'].every(t => sef.branches.some(s => s.town === t)),
    sef.towns.join(','));
  check('Sefalana carries its logo', sef.logo === 'assets/logo/sefalana_logo.jpg', sef.logo);
  const sefAddr = sef.branches.filter(s => s.address);
  check('Sefalana branches carry addresses', sefAddr.length >= 4 &&
    sefAddr.some(s => /Plot 9WXQ\+54X, A1 Highway/.test(s.address)),
    sefAddr.map(s => s.address).join(' | '));

  const checkedNames = [
    'Sefalana', 'Tops At Spar', 'Segwana',
    'Tops At Spar Molepolole', 'Tops At Spar Mafenyatlala',
    'Sefalana Gaborone A1',
    "Bateman's Fine Wine & Liquor Store", 'Sexanana Holdings (Pty) Ltd',
    'Segwana (KBL) Head Office'
  ];
  const storeNames = D.stores.map(s => s.name);
  const brandNames = D.brands.map(b => b.name);
  const missing = checkedNames.filter(n => brandNames.indexOf(n) === -1 && storeNames.indexOf(n) === -1);
  check('brands/stores are Title Cased, acronyms kept',
    missing.length === 0, 'missing: ' + missing.join(', '));

  check('logo map points at the four supplied logos',
    D.logoByPrefix.sefalana === 'assets/logo/sefalana_logo.jpg' &&
    D.logoByPrefix.boxer === 'assets/logo/Boxer_Liqours_Logo.png' &&
    D.logoByPrefix.tops === 'assets/logo/tops_logo.png' &&
    D.logoByPrefix.liquorama === 'assets/logo/liqourama_logo.jpg',
    JSON.stringify(D.logoByPrefix));
  const withLogo = D.stores.filter(s => s.logo).length;
  check('64 stores carry a logo', withLogo === 64, withLogo);

  check('API is exposed', !!A && typeof A.all === 'function');
  const all = A.all();
  check('API.all() returns every brand', all.length === 47, all.length);
  check('brands with a logo sort to the top',
    all.findIndex(b => !b.logo) === -1 || all.findIndex(b => b.logo) < all.findIndex(b => !b.logo),
    'firstLogo=' + all.findIndex(b => b.logo) + ' firstPlain=' + all.findIndex(b => !b.logo));
  check('API.get() finds a chain by slug',
    !!A.get('liquorama') && A.get('liquorama').branches.length === 43);
  check('API.store() finds a branch by id',
    !!A.store(D.stores[0].id) && A.store(D.stores[0].id).name === D.stores[0].name);
  check('API.search() matches a brand name',
    A.search('liquorama').some(b => b.slug === 'liquorama'),
    A.search('liquorama').map(b => b.slug).join(','));
  const gabs = A.filter({ town: 'Gaborone' });
  check('API.filter({town}) narrows the list',
    gabs.length > 0 && gabs.length < 47 &&
    gabs.every(b => b.branches.some(s => s.town === 'Gaborone')), gabs.length);
  check('API.towns() equals the data towns',
    JSON.stringify(A.towns()) === JSON.stringify(D.towns));
  check('API.offeringStores() covers every store unfiltered',
    A.offeringStores({}).length === 110, A.offeringStores({}).length);
  check('API.metaFor() counts chain branches',
    A.metaFor(A.get('liquorama')) === '43 places', A.metaFor(A.get('liquorama')));
  check('API.norm() trims and lowercases',
    A.norm('  Gaborone  ') === 'gaborone', A.norm('  Gaborone  '));

  delete global.window;
})();

/* ---------------- Part B: the UI ---------------- */
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
  /* ---- test-only: ignore jsdom 'Not implemented: navigation' noise ---- */
  (function(){ var _emit = vc.emit.bind(vc);
    vc.emit = function(ev, e){ if (ev === 'jsdomError' && e && /Not implemented: navigation/.test(String(e.message || ''))) return false; return _emit(ev, e); };
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
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
const ev = s => window.eval(s);

setTimeout(() => {
  const bevSel = '.bevpage[data-page="beverages"] ';

  click(doc.querySelector('[data-tab="restaurants"]'));
  ev('state.restPanel="beverages";render()');

  /* ---- the directory landing ---- */
  const cards = doc.querySelectorAll(bevSel + '.ritem[data-bacc]');
  check('directory lists every brand', cards.length === 47, cards.length);
  check('each card has a toggle-row',
    doc.querySelectorAll(bevSel + '.rrow[data-act="toggleBottleStore"]').length === 47);
  check('cards are collapsed by default',
    doc.querySelectorAll(bevSel + '.ritem.open').length === 0);

  /* ---- expand a card ---- */
  const firstRow = doc.querySelector(bevSel + '.rrow[data-act="toggleBottleStore"]');
  const firstSlug = firstRow.getAttribute('data-id');
  click(firstRow);
  check('tapping a card remembers the open slug', ev('state.bottleOpen') === firstSlug, ev('state.bottleOpen'));
  check('tapping a card opens it in place',
    !!doc.querySelector(bevSel + '.ritem[data-bacc="' + firstSlug + '"].open'));
  check('options row has Town / Area / Menu / Promos',
    !!doc.querySelector(bevSel + '[data-act="openBottleLocPicker"][data-axis="town"]') &&
    !!doc.querySelector(bevSel + '[data-act="openBottleLocPicker"][data-axis="area"]') &&
    !!doc.querySelector(bevSel + '[data-act="openBottleMenu"]') &&
    !!doc.querySelector(bevSel + '[data-act="openBottlePromos"]'));
  const openOpts = doc.querySelector(bevSel + '.ritem[data-bacc="' + firstSlug + '"] .ropts.brows');
  check('bottle card stacks four action rows + an icon row',
    !!openOpts && openOpts.querySelectorAll('.line').length === 4 && !openOpts.querySelector('.brow'));
  const bottleIconRow = openOpts ? openOpts.querySelector('.card-ico-row') : null;
  check('bottle icon row = heart + WhatsApp + info',
    !!bottleIconRow && !!bottleIconRow.querySelector('[data-act="toggleFav"]') &&
    !!bottleIconRow.querySelector('[data-act="waBottle"]') &&
    !!bottleIconRow.querySelector('[data-act="bottleStoreInfo"]'));
  check('bottle card has no Save Summary button',
    !doc.querySelector(bevSel + '[data-act="saveBottleSummary"]'));
  click(firstRow);
  check('tapping the open card collapses it', ev('state.bottleOpen') === null, ev('state.bottleOpen'));

  /* ---- a chain exposes a branch picker ---- */
  ev('state.bottleOpen="liquorama";render()');
  const locBtn = doc.querySelector(bevSel + '.ritem[data-bacc="liquorama"] [data-act="openBottleLocPicker"][data-axis="town"]');
  click(locBtn);
  check('branch picker opens for a chain',
    ev('state.bottleLocPicker && state.bottleLocPicker.brand') === 'liquorama', JSON.stringify(ev('state.bottleLocPicker')));
  const branchOpts = doc.querySelectorAll('.fpop.rest-loc-pop [data-act="pickBottleBranch"]');
  check('branch picker lists the chain towns', branchOpts.length > 1, branchOpts.length);
  const branchId = branchOpts[0].getAttribute('data-id');
  click(branchOpts[0]);
  check('picking a branch stores the choice',
    ev('state.bottleBranchOf.liquorama') === branchId, ev('state.bottleBranchOf.liquorama'));
  check('picking a branch closes the picker', ev('state.bottleLocPicker') === null);

  /* ---- Menu opens the shared grid ---- */
  click(doc.querySelector(bevSel + '.ritem[data-bacc="liquorama"] [data-act="openBottleMenu"]'));
  check('Menu opens the store grid',
    ev('state.bevView && state.bevView.type') === 'store' && !!doc.querySelector(bevSel + '.bev-grid'));
  check('store grid shows a bottom Back button',
    !!doc.querySelector(bevSel + '.pad [data-act="bevBackLanding"]'));
  click(doc.querySelector(bevSel + '[data-act="bevBackLanding"]'));
  check('back from the grid returns to the directory',
    ev('state.bevView') === null && doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length === 47);

  /* ---- About icon opens the shared venue-about page ---- */
  ev('state.bottleOpen="liquorama";render()');
  click(doc.querySelector(bevSel + '.ritem[data-bacc="liquorama"] [data-act="bottleStoreInfo"]'));
  check('store About did not set inline about state', ev('state.restaurantView && state.restaurantView.view') !== 'about', ev('JSON.stringify(state.restaurantView)'));
  check('inline venue-about screen is gone for the store', doc.querySelector('#viewport .screen[data-page="venue-about"]') === null);
  ev('state.bottleOpen=null;render()');

  /* ---- Promos jumps to the Promos tab ---- */
  click(doc.querySelector(bevSel + '.ritem[data-bacc="liquorama"] [data-act="openBottlePromos"]'));
  check('Promos switches to the Promos tab', ev('state.tab') === 'promos', ev('state.tab'));
  check('Promos filters by the Beverage type', ev('state.promoType') === 'Beverage', ev('state.promoType'));
  click(doc.querySelector('[data-tab="restaurants"]'));
  ev('state.restPanel="beverages";state.bevView=null;state.tab="restaurants";render()');

  /* ---- town / area filter bar (2nd Restaurants tap) ---- */
  click(doc.querySelector('[data-tab="restaurants"]'));
  check('2nd Restaurants tap opens the store filter bar', ev('state.bevFilterOpen') === true);
  const cbar = doc.getElementById('cbar');
  check('filter bar has a live search box', !!cbar.querySelector('#bottleSearch'));
  click(cbar.querySelector('[data-act="openBottleTownFilter"]'));
  const townPop = cbar.querySelector('.fpop.town-pop');
  check('town picker opens', !!townPop && ev('state.bottleTownFilter') === true);
  check('town picker lists All + every town',
    !!townPop && townPop.querySelectorAll('.loc-town-main').length === 24 &&
    !!townPop.querySelector('.loc-all'), townPop ? townPop.querySelectorAll('.loc-town-main').length : 'none');
  const townBtn = townPop.querySelector('.loc-town-main');
  const townName = townBtn.getAttribute('data-town');
  click(townBtn);
  check('picking a town applies it', ev('state.bottleTown') === townName, ev('state.bottleTown'));
  check('picking a town closes the picker', ev('state.bottleTownFilter') === false);
  check('the list is filtered to that town',
    doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length ===
    ev('window.EatoutsBottleStores.filter({town:' + JSON.stringify(townName) + '}).length'),
    doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length);

  click(doc.querySelector('#cbar [data-act="openBottleAreaFilter"]'));
  const areaPop = doc.querySelector('#cbar .fpop.area-pop');
  check('area picker opens', !!areaPop && ev('state.bottleAreaFilter') === true);
  check('area picker lists All Areas plus areas',
    !!areaPop && areaPop.querySelectorAll('.loc-area-option').length >= 1,
    areaPop ? areaPop.querySelectorAll('.loc-area-option').length : 'none');
  click(doc.querySelector('#cbar [data-act="closeBottleAreaFilter"]'));
  check('closing the area picker hides it', ev('state.bottleAreaFilter') === false);

  /* ---- live search ---- */
  const search = doc.getElementById('bottleSearch');
  search.value = 'liquorama';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('typing sets the query', ev('state.bottleQuery') === 'liquorama', ev('state.bottleQuery'));
  check('typing filters the directory',
    doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length < 47,
    doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length);
  check('focused search box survives the re-render',
    doc.activeElement && doc.activeElement.id === 'bottleSearch',
    doc.activeElement ? doc.activeElement.id : 'none');
  const reset = doc.getElementById('bottleSearch');
  reset.value = '';
  reset.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('clearing the query restores the list', ev('state.bottleQuery') === '');
  ev('state.bottleTown="All";render()');
  check('All Towns brings every card back',
    doc.querySelectorAll(bevSel + '.ritem[data-bacc]').length === 47);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nBOTTLE STORES TEST PASSED' : '\nBOTTLE STORES TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);