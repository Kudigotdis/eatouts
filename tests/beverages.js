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
const ev = s => window.eval(s);
const evj = s => JSON.parse(JSON.stringify(ev(s)));

const readJson = f => JSON.parse(fs.readFileSync(path.join(APP_DIR, f), 'utf8'));
const bevData = readJson('assets/data/beverages.json');
const alcData = readJson('assets/data/alcohols.json');

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* jsdom has no fetch: hand the app its beverage catalogues directly. */
  ev('window._BEV=' + JSON.stringify({
    beverages: bevData, alcohols: alcData, promos: { promotions: [] }
  }));

  click(doc.querySelector('[data-tab="restaurants"]'));
  check('restaurants pager rendered', !!doc.querySelector('#viewport #bev-pager'));
  check('pager has a food page', !!doc.querySelector('#viewport .bevpage[data-page="food"]'));
  check('pager has a beverages page', !!doc.querySelector('#viewport .bevpage[data-page="beverages"]'));
  check('panel toggle strip present', doc.querySelectorAll('.bev-toggle-btn').length === 2);
  const toggle = doc.querySelector('.bev-toggle');
  check('toggle rides a sliding thumb', !!doc.querySelector('.bev-toggle-thumb'), toggle ? toggle.outerHTML : 'missing');
  check('toggle starts in food position', toggle && toggle.classList.contains('food'), toggle && toggle.className);
  ev('state.restPanel="beverages";render()');
  check('toggle thumb moves to beverages',
    doc.querySelector('.bev-toggle').classList.contains('bev'),
    doc.querySelector('.bev-toggle').className);
  ev('state.restPanel="food";render()');

  /* ---------- landing ---------- */
  ev('state.restPanel="beverages";render()');
  const tiles = doc.querySelectorAll('.bevpage[data-page="beverages"] .bev-tile[data-act="bevOpenSub"]');
  check('6 drink tiles', tiles.length === 6, tiles.length);
  const empty = doc.querySelector('.bevpage[data-page="beverages"] .bev-tile.off');
  check('no empty subcategory tiles (iced tea & cordials populated)', !empty, empty ? empty.textContent : 'none');
  const subData = {};
  bevData.subcats.forEach(s => { subData[s.id] = s.count; });
  check('iced tea and cordials have items', subData.icedtea > 0 && subData.cordials > 0,
    'icedtea=' + subData.icedtea + ' cordials=' + subData.cordials);
  const accRows = doc.querySelectorAll('.bevpage[data-page="beverages"] .bev-tile[data-act="bevOpenBucket"]');
  check('11 liquor tiles', accRows.length === 11, accRows.length);
  check('liquor tiles are square thumbnails',
    Array.prototype.every.call(accRows, t => t.classList.contains('sq')) &&
    Array.prototype.every.call(accRows, t => !!t.closest('.bev-grid')), accRows.length);
  check('no accordion rows or chevrons left',
    !doc.querySelector('.bev-acc-row') && !doc.querySelector('.bev-acc-go'));

  const subIds = evj('window._BEV.beverages.subcats.map(s=>s.id)');
  check('subcategories match the catalogue', JSON.stringify(subIds) === JSON.stringify(bevData.subcats.map(s => s.id)), JSON.stringify(subIds));
  const bucketIds = evj('window._BEV.alcohols.buckets.map(b=>b.id)');
  check('buckets match the catalogue', JSON.stringify(bucketIds) === JSON.stringify(alcData.buckets.map(b => b.id)), JSON.stringify(bucketIds));

  /* ---------- open a subcategory ---------- */
  const fizzy = Array.from(tiles).find(t => t.getAttribute('data-id') === 'fizzy');
  click(fizzy);
  check('subcategory opens', ev('state.bevView && state.bevView.type') === 'subcat');
  const rows = doc.querySelectorAll('.bevpage[data-page="beverages"] .bev-item');
  const fizzyCount = evj('window._BEV.beverages.items.filter(i=>i.subcat==="fizzy").length');
  check('subcategory lists its items', rows.length === fizzyCount, rows.length + ' of ' + fizzyCount);
  check('item rows show a price', /P\d/.test((rows[0] || {}).textContent || ''), (rows[0] || {}).textContent);
  check('checkout button starts disabled', ev('bevCartCount()') === 0);

  /* ---------- cart ---------- */
  const bevSel = '.bevpage[data-page="beverages"] ';
  click(doc.querySelector(bevSel + '[data-act="bevAdd"]'));
  check('adding records one unit', ev('bevCartCount()') === 1, ev('bevCartCount()'));
  check('cart total uses the item price', ev('bevCartTotal()') > 0, ev('bevCartTotal()'));
  check('stepper appears after adding', !!doc.querySelector(bevSel + '[data-act="bevDec"]'));
  click(doc.querySelector(bevSel + '[data-act="bevDec"]'));
  check('decrementing clears an empty line', ev('bevCartCount()') === 0, ev('bevCartCount()'));
  check('row falls back to Add', !!doc.querySelector(bevSel + '[data-act="bevAdd"]'));
  click(doc.querySelector(bevSel + '[data-act="bevAdd"]'));
  click(doc.querySelector(bevSel + '[data-act="bevInc"]'));
  check('incrementing stacks', ev('bevCartCount()') === 2, ev('bevCartCount()'));

  /* ---------- checkout ---------- */
  click(doc.querySelector(bevSel + '[data-act="bevGoCheckout"]'));
  check('checkout view opens', ev('state.bevCheckout') === true);
  const waGeneric = doc.querySelector('[data-act="bevSendWaGeneric"]');
  const waShare = doc.querySelector('[data-act="bevShareWa"]');
  check('generic EatOuts WhatsApp button', !!waGeneric);
  check('share-to-contact WhatsApp button', !!waShare);
  check('generic button carries the EatOuts number', !!waGeneric && waGeneric.textContent.indexOf('267 718 29765') > -1, waGeneric ? waGeneric.textContent : '');
  const text = ev('bevOrderText()');
  check('order text lists items', /×\s*\d/.test(text), text.slice(0, 120));
  check('order text shows a Pula total', /Total: P\d/.test(text), text.slice(-80));

  /* ---------- split the bill ---------- */
  const splitBtn = doc.querySelector('[data-act="bevOpenSplit"]');
  check('split entry point on checkout', !!splitBtn);
  click(splitBtn);
  check('split view opens', ev('state.bevSplitOpen') === true);
  doc.getElementById('bevSplitNewName').value = 'Kagiso';
  click(doc.querySelector('[data-act="bevAddSplitPerson"]'));
  check('person added', ev('state.bevSplitPeople.length') === 1, ev('state.bevSplitPeople.length'));
  check('name field clears after adding', doc.getElementById('bevSplitNewName').value === '',
    doc.getElementById('bevSplitNewName').value);
  ev('(function(){var l=bevLines()[0];bevSetSplitQty(l.key,state.bevSplitPeople[0].id,l.qty);render();})()');
  check('assigning every unit clears the unassigned total', ev('bevUnassignedTotal()') === 0, ev('bevUnassignedTotal()'));
  check('person total covers the whole cart',
    Math.abs(ev('bevPersonTotal(state.bevSplitPeople[0].id)') - ev('bevCartTotal()')) < 0.005,
    ev('bevPersonTotal(state.bevSplitPeople[0].id)') + ' vs ' + ev('bevCartTotal()'));
  check('split order text carries the share', /Share total: P/.test(ev('bevPersonMessage(state.bevSplitPeople[0])')),
    ev('bevPersonMessage(state.bevSplitPeople[0])').slice(-60));
  click(doc.querySelector('[data-act="bevBackFromSplit"]'));
  check('back returns to checkout', ev('state.bevSplitOpen') === false);
  check('split preview shown on checkout', !!doc.querySelector('.split-preview'));
  check('order text now carries the split', /Split:/.test(ev('bevOrderText()')));

  click(doc.querySelector('[data-act="bevBackFromCheckout"]'));
  check('back returns to the list', ev('state.bevCheckout') === false);
  click(doc.querySelector('.bevpage[data-page="beverages"] [data-act="bevBackLanding"]'));
  check('back returns to the landing', ev('state.bevView') === null);

  /* ---------- data integrity ---------- */
  const badPrice = evj('window._BEV.beverages.items.filter(i=>!(typeof i.price==="number"&&i.price>0)).length') +
    evj('window._BEV.alcohols.items.filter(i=>!(typeof i.price==="number"&&i.price>0)).length');
  check('every item has a positive BWP price', badPrice === 0, badPrice);
  const noImage = evj('window._BEV.beverages.items.filter(i=>!i.image).length') +
    evj('window._BEV.alcohols.items.filter(i=>!i.image).length');
  check('every listed item has an image', noImage === 0, noImage);
  const dupIds = evj('(()=>{const a=window._BEV.beverages.items.map(i=>i.id),b=window._BEV.alcohols.items.map(i=>i.id);return a.length-new Set(a).size+(b.length-new Set(b).size)})()');
  check('item ids are unique', dupIds === 0, dupIds);

  /* ---------- beverage filter bar (2nd tap of Restaurants nav) ---------- */
  const cbarEl = doc.getElementById('cbar');
  check('beverage filter bar hidden by default', ev('state.bevFilterOpen') === false && !cbarEl.classList.contains('on'));
  click(doc.querySelector('[data-tab="restaurants"]'));
  check('2nd Restaurants tap opens the beverage filter bar',
    ev('state.bevFilterOpen') === true && cbarEl.classList.contains('on'), ev('state.bevFilterOpen'));
  check('filter bar shows a Beverage Type button',
    !!cbarEl.querySelector('[data-act="openBevaergeTypePicker"]'));
  click(cbarEl.querySelector('[data-act="openBevaergeTypePicker"]'));
  check('type picker opens with grouped options',
    ev('state.bevTypePicker') === true && doc.querySelectorAll('[data-bev-type-option]').length > 0,
    doc.querySelectorAll('[data-bev-type-option]').length);
  check('picker groups Drinks and Liquors',
    doc.body.textContent.indexOf('Drinks') > -1 && doc.body.textContent.indexOf('Liquors') > -1);
  const firstBevType = doc.querySelector('[data-bev-type-option]');
  firstBevType.checked = true;
  firstBevType.dispatchEvent(new window.Event('change', { bubbles: true }));
  check('picking a type updates the draft', ev('state.bevTypeDraft.length') === 1, ev('state.bevTypeDraft.length'));
  click(doc.querySelector('[data-act="applyBevTypeSelection"]'));
  check('apply commits the beverage types', ev('state.bevTypes.length') === 1, ev('state.bevTypes.length'));
  check('filtered results list renders', doc.querySelectorAll('.bevpage[data-page="beverages"] .bev-result').length > 0,
    doc.querySelectorAll('.bevpage[data-page="beverages"] .bev-result').length);
  check('landing grids replaced by results', !doc.querySelector('.bevpage[data-page="beverages"] .bev-grid'));
  const firstResult = doc.querySelector('.bevpage[data-page="beverages"] .bev-result[data-act="bevGotoCat"]');
  check('result rows navigate to their category', !!firstResult &&
    ['subcat', 'bucket'].indexOf(firstResult.getAttribute('data-type')) > -1);
  click(firstResult);
  check('tapping a result opens the category page', !!ev('state.bevView && state.bevView.id'), JSON.stringify(ev('state.bevView')));
  click(doc.querySelector('.bevpage[data-page="beverages"] [data-act="bevBackLanding"]'));
  check('back from a result keeps the filter', ev('state.bevView') === null && ev('state.bevTypes.length') === 1);
  click(doc.querySelector('[data-act="bevClearTypes"]'));
  check('Clear Search resets the filter', ev('state.bevTypes.length') === 0 && !!doc.querySelector('.bevpage[data-page="beverages"] .bev-grid'));

  /* ---------- back to food ---------- */
  click(doc.querySelector('.bev-toggle-btn[data-act="panelFood"]'));
  check('food panel restored', ev('state.restPanel') === 'food');
  check('food page still lists restaurants', !!doc.querySelector('#viewport .ritem'));

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nBEVERAGES TEST PASSED' : '\nBEVERAGES TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);
