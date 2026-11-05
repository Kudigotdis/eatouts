#!/usr/bin/env node
/**
 * Search screen — the result index must include EVERY discoverable venue.
 *
 * Zorz (slug `zors`) used to be an overlay-only venue: it had no row in
 * directory_runtime_data.js, so its identity lived in
 * assets/data/venue_about_info.js. It is now a real directory row
 * (`rest_zorz-luxury-chisanyama`, seeded from the `extras` block of
 * eatouts_manifest.json), so buildIndex() must NOT add a second, overlay-only
 * row for it - the curated slug/aliases are folded into the directory row's
 * search text instead (same rule that keeps Ocean Basket and Bukhara single).
 *
 * Covered here:
 *   - the index builds from the directory (results render, no "Loading…")
 *   - "zors" finds "Zorz Luxury Chisanyama" (the curated alias, not the name)
 *   - "zorz", "chisanyama" and "remmogo" find it too
 *   - "zors" / "zorz" resolve to one and the same directory row (alias fold)
 *   - "ocean basket" / "bukhara" still return only their directory rows
 *   - the row carries Gaborone / Remmogo Crossing for the filters
 *   - the row is an accordion: a tap opens its panel (it does not navigate),
 *     the panel's primary action opens the in-app menu, tap-again closes it,
 *     one card is open at a time and the rest dim
 *   - the 90px thumb enlarges in the shared photo preview (X, outside tap,
 *     Escape) and a letter tile does not
 *   - the header region button shows the active region's square flag
 *   - one row per BRAND: a 13-branch chain (KFC) is a single row reading
 *     "13 places", every branch town / name stays in its search text, and no
 *     two rows share an id
 *   - the panel's Town / Area rows are real branch pickers: the popup lists
 *     every town the chain trades in (counted) or the branches inside the
 *     active town, Escape closes it, and menu / promos follow the pick
 *   - no runtime errors
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

let html = fs.readFileSync(path.join(APP_DIR, 'search_screen.html'), 'utf8');
const loadErrors = [];
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { loadErrors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const errors = [];
const navs = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  const m = String((e && e.message) || '');
  if (/Not implemented: navigation/.test(m)) { navs.push(m); return; }
  errors.push('jsdomError: ' + (e.stack || e.message));
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/search_screen.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;

function search(value) {
  const input = doc.getElementById('searchInput');
  const clear = doc.querySelector('.clear-btn');
  if (clear && clear.hidden === false) {
    clear.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  return Array.prototype.slice.call(doc.querySelectorAll('#results .result'));
}

function names(rows) {
  return rows.map(r => (r.querySelector('.result-name') || {}).textContent || '');
}

function metaOf(rows, name) {
  const row = rows.filter(r => ((r.querySelector('.result-name') || {}).textContent || '') === name)[0];
  return row ? ((row.querySelector('.result-meta') || {}).textContent || '') : '';
}

function click(el) {
  if (el) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/* A picker option's own label: the text of its first span, minus the town line
   an area option carries underneath (and minus any count pill beside it). */
function optLabel(b) {
  const first = b.querySelector('span');
  if (!first) return '';
  const sub = first.querySelector('.opt-sub');
  const pill = b.querySelector('.opt-count');
  let t = first.textContent || '';
  if (sub) t = t.slice(0, t.length - (sub.textContent || '').length);
  return t.replace(pill ? String(pill.textContent || '') : '', '').trim();
}

/* Search, then make sure the row's panel is open (a card that is already open
   would close on a second header tap). `name` picks an exact row. */
function openRow(query, name) {
  const rows = search(query);
  const row = name
    ? rows.filter(r => ((r.querySelector('.result-name') || {}).textContent || '') === name)[0]
    : rows[0];
  if (!row) return null;
  if (row.getAttribute('aria-expanded') !== 'true') click(row);
  return row.closest('.ritem');
}

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- A: the index builds ---------- */
  check('page loaded every data script', loadErrors.length === 0, loadErrors.join(' | '));
  check('venue_about_info.js is loaded by the search screen',
    !!window.EATOUTS_VENUE_ABOUT && !!window.EATOUTS_VENUE_ABOUT.zors);
  const all = search('');
  check('index built from the directory (results render)', all.length > 50, all.length);
  check('no "Loading…" placeholder left behind',
    !/Loading/.test((doc.getElementById('results') || {}).textContent || ''));
  check('directory rows still present (KFC found)', search('kfc').length === 1, search('kfc').length);

  /* ---------- B: Zorz is findable by the typed alias ---------- */
  const ZORZ = 'Zorz Luxury Chisanyama';
  let rows = search('zors');
  check('"zors" returns exactly one row', rows.length === 1, names(rows).join(' | '));
  check('"zors" row is Zorz Luxury Chisanyama', names(rows).indexOf(ZORZ) > -1, names(rows).join(' | '));

  rows = search('zorz');
  check('"zorz" finds it', names(rows).indexOf(ZORZ) > -1, names(rows).join(' | '));

  rows = search('chisanyama');
  check('"chisanyama" finds it', names(rows).indexOf(ZORZ) > -1, names(rows).join(' | '));

  rows = search('remmogo');
  check('"remmogo" (its area) finds it', names(rows).indexOf(ZORZ) > -1, names(rows).join(' | '));

  /* Zorz is a normal directory row now, so its subtitle is the directory's
     "town · area"; the words the curated overlay supplied ("zors") live in
     that row's search text (asserted below). */
  const meta = metaOf(search('zors'), ZORZ);
  check('row carries town + area for the filters', /Gaborone/.test(meta) && /Remmogo Crossing/.test(meta), meta);

  /* ---------- C: one row per venue (no overlay duplicate) ---------- */
  const idsFor = q => search(q).map(r => r.getAttribute('data-id'));
  check('Zorz is the directory row rest_zorz-luxury-chisanyama',
    search('zors')[0].getAttribute('data-id') === 'rest_zorz-luxury-chisanyama',
    search('zors')[0].getAttribute('data-id'));
  check('"zors" and "zorz" resolve to that same single row',
    idsFor('zors').length === 1 && idsFor('zorz').join() === idsFor('zors').join(),
    idsFor('zors').join(' | ') + ' vs ' + idsFor('zorz').join(' | '));
  /* Ocean Basket has two real directory branches, but a chain is ONE row now,
     and the overlay entry for it must NOT add a second ("venue-ocean-basket"). */
  check('"ocean basket" adds no overlay duplicate',
    idsFor('ocean basket').every(id => id.indexOf('venue-') !== 0), idsFor('ocean basket').join(' | '));
  check('"ocean basket" collapses to one row', idsFor('ocean basket').length === 1, idsFor('ocean basket').join(' | '));
  check('"bukhara" adds no overlay duplicate',
    idsFor('bukhara').every(id => id.indexOf('venue-') !== 0), idsFor('bukhara').join(' | '));
  check('"bukhara" is still exactly one row', idsFor('bukhara').length === 1, idsFor('bukhara').length);

  /* ---------- C2: one row per BRAND (a chain does not repeat per branch) ---------- */
  /* KFC has 13 directory branches. The results must show the brand once and
     let the card's town / area pickers choose the branch (section D3). */
  check('"kfc" collapses its 13 branches into one row', search('kfc').length === 1,
    names(search('kfc')).join(' | '));
  check('the collapsed row is the brand, not a branch', names(search('kfc'))[0] === 'KFC',
    names(search('kfc'))[0]);
  check('a chain row says how many places it covers', /13 places/.test(metaOf(search('kfc'), 'KFC')),
    metaOf(search('kfc'), 'KFC'));
  check('"nando" is one row too', names(search('nando')).join(' | ') === "Nando's",
    names(search('nando')).join(' | '));
  check('"chicken licken" is one row', search('chicken licken').length === 1,
    names(search('chicken licken')).join(' | '));
  check('"steers" is one row', search('steers').length === 1, names(search('steers')).join(' | '));

  /* every branch's town and name stay searchable on the collapsed row */
  check('a branch town still finds the brand ("maun")',
    names(search('maun')).indexOf('KFC') > -1, names(search('maun')).slice(0, 6).join(' | '));
  check('a branch name still finds the brand ("kfc francistown")',
    names(search('kfc francistown')).indexOf('KFC') > -1, names(search('kfc francistown')).join(' | '));

  /* the whole index must be free of repeated rows */
  const everyId = search('').map(r => r.getAttribute('data-id'));
  check('no row id appears twice in the index',
    everyId.length === new Set(everyId).size,
    everyId.length + ' rows, ' + new Set(everyId).size + ' unique');

  /* ---------- D: the row opens its panel, the panel opens the venue ---------- */
  let navUrl = null;
  doc.addEventListener('eatouts:about-nav', e => { navUrl = e.detail && e.detail.url; });

  rows = search('zors');
  const card = rows[0].closest('.ritem');
  check('the row sits in a .ritem card', !!card);
  check('the panel starts closed',
    !card.classList.contains('open') && rows[0].getAttribute('aria-expanded') === 'false');

  click(rows[0]);
  check('tapping the row opens its panel, it does not navigate',
    navUrl === null && card.classList.contains('open'), navUrl);
  check('the open row reports aria-expanded=true',
    rows[0].getAttribute('aria-expanded') === 'true');
  check('the list is dimmed around the open card',
    doc.getElementById('results').classList.contains('has-open'));

  /* the panel is the directory card's body: 5 rows, 7 buttons */
  const panel = card.querySelector('.ropts');
  check('the panel is the directory card body (5 rows)',
    !!panel && panel.children.length === 5, panel && panel.children.length);
  check('the panel carries 7 buttons',
    !!panel && panel.querySelectorAll('button').length === 7,
    panel && panel.querySelectorAll('button').length);

  const townLine = panel && panel.children[0];
  check('row 1 is the town, a branch picker',
    !!townLine && /Gaborone/.test(townLine.textContent) &&
      townLine.getAttribute('aria-haspopup') === 'listbox' &&
      townLine.getAttribute('data-act') === 'openLocPicker' && townLine.classList.contains('is-set'),
    townLine && townLine.textContent);
  const areaLine = panel && panel.children[1];
  check('row 2 is the area, a branch picker',
    !!areaLine && /Remmogo Crossing/.test(areaLine.textContent) &&
      areaLine.getAttribute('data-act') === 'openLocPicker' &&
      areaLine.getAttribute('data-axis') === 'area',
    areaLine && areaLine.textContent);

  const primOpt = panel.querySelector('.line[data-act="openResult"]');
  check('row 3 is the Menu action', !!primOpt && /View menu/.test(primOpt.textContent),
    primOpt && primOpt.textContent);
  const promosOpt = panel.querySelector('.line[data-act="openPromos"]');
  check('row 4 is Promos for a venue that lives in the database',
    !!promosOpt && /Promos/.test(promosOpt.textContent), promosOpt && promosOpt.textContent);

  const icoRow = panel.querySelector('.card-ico-row');
  check('row 5 is the heart / WhatsApp / info icon row',
    !!icoRow && icoRow.querySelectorAll('.ico-btn').length === 3 &&
      !!icoRow.querySelector('[data-act="toggleFav"]') &&
      !!icoRow.querySelector('[data-act="sendWhatsApp"]') &&
      !!icoRow.querySelector('.ico-btn[data-act="openAbout"]'),
    icoRow && icoRow.querySelectorAll('.ico-btn').length);

  click(primOpt);
  check('the panel action opens index.html#zorz-luxury-chisanyama/menu',
    navUrl === 'index.html#zorz-luxury-chisanyama/menu', navUrl);

  navUrl = null;
  click(promosOpt);
  check('Promos opens index.html#zorz-luxury-chisanyama/promos',
    navUrl === 'index.html#zorz-luxury-chisanyama/promos', navUrl);

  /* tapping the same header again closes the panel and un-dims the list */
  navUrl = null;
  click(rows[0]);
  check('tapping the open row again closes it',
    !card.classList.contains('open') && !doc.getElementById('results').classList.contains('has-open'));

  /* a normal restaurant still keeps the in-app menu route */
  navUrl = null;
  rows = search('kfc');
  click(rows[0]);
  click(rows[0].closest('.ritem').querySelector('.line[data-act="openResult"]'));
  check('a directory restaurant still opens index.html#<slug>/menu',
    /^index\.html#.+\/menu$/.test(String(navUrl)), navUrl);

  /* ---------- D3: the town / area rows are real branch pickers ---------- */
  /* KFC trades in 13 towns, so one row cannot show them all: the card opens on
     the brand's default branch and the pickers retarget it. */
  const kfcGroup = window.EatoutsBridge.groupedListing().filter(g => g.brandKey === 'kfc')[0];
  let kfcCard = openRow('kfc');
  let kfcPanel = kfcCard.querySelector('.ropts');
  check('a chain card opens on the default branch town',
    /Gaborone/.test(kfcPanel.children[0].textContent), kfcPanel.children[0].textContent);

  click(kfcPanel.children[0]);
  const pop = doc.getElementById('popup');
  const scrim = doc.getElementById('popup-scrim');
  check('tapping the town opens the branch popup',
    !pop.classList.contains('hidden') && !scrim.classList.contains('hidden'));
  const townOpts = Array.prototype.slice.call(pop.querySelectorAll('button.opt-row'));
  const kfcTowns = [];
  kfcGroup.branches.forEach(b => {
    const t = (b.location || {}).town;
    if (t && kfcTowns.indexOf(t) < 0) kfcTowns.push(t);
  });
  check('the popup lists every town the chain trades in',
    townOpts.length === kfcTowns.length, townOpts.length + ' of ' + kfcTowns.length);
  check('a town with several branches carries its count',
    townOpts.some(b => !!b.querySelector('.opt-count')),
    townOpts.map(b => b.textContent).join(' | '));
  check('the branch the card shows is marked',
    townOpts.some(b => b.classList.contains('on') && optLabel(b) === 'Gaborone'),
    townOpts.map(b => b.className + ':' + optLabel(b)).join(' | '));

  const kfcMaun = kfcGroup.branches.filter(b => (b.location || {}).town === 'Maun')[0];
  click(townOpts.filter(b => optLabel(b) === 'Maun')[0]);
  check('picking a town closes the popup', pop.classList.contains('hidden'));
  kfcPanel = doc.querySelector('#results .ritem.open .ropts');
  check('the town row follows the pick',
    kfcPanel.children[0].textContent === 'Maun', kfcPanel.children[0].textContent);
  check('the card keeps its one row while the branch changes',
    doc.querySelectorAll('#results .result').length === 1,
    doc.querySelectorAll('#results .result').length);

  navUrl = null;
  click(kfcPanel.querySelector('.line[data-act="openResult"]'));
  check('the menu action opens the picked branch',
    navUrl === 'index.html#' + kfcMaun.slug + '/menu', navUrl);

  /* reopening the picker shows the pick, Escape leaves it alone */
  click(kfcPanel.children[0]);
  const pickedOpt = doc.querySelector('#popup button.opt-row.on');
  check('the popup marks the picked branch',
    !!pickedOpt && optLabel(pickedOpt) === 'Maun', pickedOpt && optLabel(pickedOpt));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes the branch popup',
    doc.getElementById('popup').classList.contains('hidden') &&
      doc.getElementById('popup-scrim').classList.contains('hidden'));
  check('the pick survives closing the popup',
    doc.querySelector('#results .ritem.open .ropts').children[0].textContent === 'Maun');

  /* the area axis is scoped to the picked town: Nando's has two Gaborone
     branches, so the area row opens the branches inside Gaborone */
  const nandoGroup = window.EatoutsBridge.groupedListing().filter(g => g.brandKey === 'nandos')[0];
  const riverwalk = nandoGroup.branches.filter(b => (b.location || {}).town === 'Gaborone' && (b.location || {}).area === 'Riverwalk')[0];
  let nandoCard = openRow('nando');
  click(nandoCard.querySelector('.ropts').children[0]);
  const gabsOpt = Array.prototype.slice.call(doc.querySelectorAll('#popup button.opt-row'))
    .filter(b => optLabel(b) === 'Gaborone')[0];
  check('Gaborone is one of the chain towns', !!gabsOpt);
  click(gabsOpt);
  let nandoPanel = doc.querySelector('#results .ritem.open .ropts');
  click(nandoPanel.children[1]);
  const areaOpts = Array.prototype.slice.call(doc.querySelectorAll('#popup button.opt-row'));
  check('the area popup lists the branches inside the active town',
    areaOpts.length > 1 &&
      areaOpts.every(b => ((b.querySelector('.opt-sub') || {}).textContent || '') === 'Gaborone'),
    areaOpts.map(b => b.textContent).join(' | '));
  const rwOpt = areaOpts.filter(b => optLabel(b) === 'Riverwalk')[0];
  check('a neighbourhood row is listed for its branch', !!rwOpt,
    areaOpts.map(b => b.textContent).join(' | '));
  click(rwOpt);
  nandoPanel = doc.querySelector('#results .ritem.open .ropts');
  check('the area row shows the picked neighbourhood',
    nandoPanel.children[1].textContent === 'Riverwalk', nandoPanel.children[1].textContent);
  check('the town row stays on that town',
    /Gaborone/.test(nandoPanel.children[0].textContent), nandoPanel.children[0].textContent);

  navUrl = null;
  click(nandoPanel.querySelector('.line[data-act="openResult"]'));
  check('the menu action follows the area pick',
    navUrl === 'index.html#' + riverwalk.slug + '/menu', navUrl);
  navUrl = null;
  click(nandoPanel.querySelector('.line[data-act="openPromos"]'));
  check('Promos follows the area pick too',
    navUrl === 'index.html#' + riverwalk.slug + '/promos', navUrl);

  /* ---------- D2: the icon row (heart + WhatsApp) ---------- */
  /* jsdom has no dialog, so capture the sign-in prompt instead of blocking */
  let askedToSignIn = false;
  window.confirm = () => { askedToSignIn = true; return false; };
  const favsBefore = window.EatoutsCustomer.favourites.list().length;

  rows = search('zors');
  click(rows[0]);
  let heartBtn = rows[0].closest('.ritem').querySelector('.ico-btn[data-act="toggleFav"]');
  check('the heart starts unsaved',
    !!heartBtn && heartBtn.getAttribute('aria-pressed') === 'false' &&
      /heart_inactive_icon\.png$/.test(heartBtn.querySelector('img').getAttribute('src')),
    heartBtn && heartBtn.getAttribute('aria-pressed'));

  click(heartBtn);
  check('saving asks a visitor with no account to sign in', askedToSignIn);
  check('nothing is saved while signed out',
    window.EatoutsCustomer.favourites.list().length === favsBefore,
    window.EatoutsCustomer.favourites.list().length);

  /* the same tap with a customer present saves the row and fills the heart */
  window.EatoutsCustomer.getUser = () => ({ id: 'test-customer' });
  click(doc.querySelector('#results .ritem.open .ico-btn[data-act="toggleFav"]'));

  const savedCard = doc.querySelector('#results .ritem.open');
  heartBtn = savedCard && savedCard.querySelector('.ico-btn[data-act="toggleFav"]');
  check('a signed-in tap fills the heart',
    !!heartBtn && heartBtn.getAttribute('aria-pressed') === 'true' &&
      /heart_active_icon\.png$/.test(heartBtn.querySelector('img').getAttribute('src')),
    heartBtn && heartBtn.getAttribute('aria-pressed'));
  check('the panel stays open while the heart flips', !!savedCard);
  const saved = window.EatoutsCustomer.favourites.list();
  check('the venue is in the customer favourites store',
    saved.length === favsBefore + 1 &&
      saved[saved.length - 1].title === 'Zorz Luxury Chisanyama',
    saved.length);

  /* WhatsApp: a venue's own line when the record carries one, otherwise the
     platform line - never a dead tap */
  navUrl = null;
  click(savedCard.querySelector('.ico-btn[data-act="sendWhatsApp"]'));
  check('a venue with no WhatsApp contact falls back to the platform line',
    /^https:\/\/wa\.me\/26771844129\?text=/.test(String(navUrl)), navUrl);

  /* a directory row that carries a real WhatsApp contact dials that number */
  const dirRows = (window.DIRECTORY_RUNTIME_DATA || {}).restaurants || [];
  const waVenue = dirRows.filter(r => (r.contacts || []).some(c => /whatsapp/i.test(String(c.label || ''))))[0];
  const waContact = waVenue && waVenue.contacts.filter(c => /whatsapp/i.test(String(c.label || '')))[0];
  const waExpected = String((waContact || {}).value || '').replace(/[^\d]/g, '');
  const waCard = openRow(waVenue.name, waVenue.name);
  navUrl = null;
  click(waCard.querySelector('.ico-btn[data-act="sendWhatsApp"]'));
  check('a venue with a WhatsApp contact dials its own number',
    String(navUrl).indexOf('https://wa.me/' + waExpected + '?text=') === 0,
    navUrl + ' | expected ' + waExpected);

  /* a curated-only row (bakery) has no promos route: row 4 falls back to About */
  const bakeryName = ((window.BAKERY_BUSINESSES_DATA || [])[0] || {}).businessName;
  const bakeryCard = bakeryName ? openRow(bakeryName, bakeryName) : null;
  const bakeryPanel = bakeryCard && bakeryCard.querySelector('.ropts');
  check('a bakery panel offers About instead of Promos',
    !!bakeryPanel && !bakeryPanel.querySelector('[data-act="openPromos"]') &&
      /About this venue/.test((bakeryPanel.querySelector('.line[data-act="openAbout"]') || {}).textContent || ''),
    bakeryPanel && bakeryPanel.textContent);

  /* ---------- E: one card open at a time ---------- */
  /* "pizza" spans several brands, so there are two rows to compare */
  rows = search('pizza');
  check('the list has more than one row to compare', rows.length >= 2, rows.length);
  click(rows[0]);
  click(rows[1]);
  const openCards = doc.querySelectorAll('#results .ritem.open');
  check('opening a second row closes the first',
    openCards.length === 1 && openCards[0].contains(rows[1]), String(openCards.length));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes the open panel',
    !doc.getElementById('results').classList.contains('has-open'));

  /* ---------- F: the 90px thumb enlarges ---------- */
  search('kfc');
  const logoThumb = doc.querySelector('#results .result-thumb[data-src]');
  check('a row with a real image gets the enlarge affordance', !!logoThumb,
    doc.querySelectorAll('#results .result-thumb').length);
  const thumbCs = window.getComputedStyle(logoThumb);
  check('the thumb is a 90px tile', thumbCs.width === '90px' && thumbCs.height === '90px',
    thumbCs.width + ' x ' + thumbCs.height);

  click(logoThumb);
  const layer = doc.querySelector('#previewHost .preview-layer');
  check('tapping the thumb opens the photo preview', !!layer);
  check('the preview shows the row image',
    !!layer && layer.querySelector('.preview-img').getAttribute('src') === logoThumb.getAttribute('data-src'));
  check('the thumb tap does not also open the row panel',
    !doc.getElementById('results').classList.contains('has-open'));

  click(layer.querySelector('.preview-close'));
  check('the X closes the preview', !doc.querySelector('#previewHost .preview-layer'));
  click(logoThumb);
  click(doc.querySelector('#previewHost .preview-layer'));
  check('an outside tap closes the preview', !doc.querySelector('#previewHost .preview-layer'));
  click(logoThumb);
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes the preview', !doc.querySelector('#previewHost .preview-layer'));

  /* a letter tile is not a preview trigger: every previewable thumb wraps a
     real image, so "no logo" rows can never open an empty preview */
  const previewThumbs = doc.querySelectorAll('#results .result-thumb[data-src]');
  check('every preview thumb wraps a real image',
    previewThumbs.length > 0 &&
      Array.prototype.every.call(previewThumbs, t => !!t.querySelector('img')),
    previewThumbs.length);

  /* ---------- G: the header region button ---------- */
  const pageSrc = fs.readFileSync(path.join(APP_DIR, 'search_screen.html'), 'utf8');
  check('the search page loads the region registry',
    /<script src="js\/eatouts-regions\.js"><\/script>/.test(pageSrc));
  const regionBtn = doc.getElementById('regionBtn');
  check('the header carries a region button', !!regionBtn);
  const regionImg = regionBtn && regionBtn.querySelector('img');
  check('the region button shows the active region square flag',
    !!regionImg && /assets\/flags-square-rounded\/botswana-bw\.svg$/.test(regionImg.getAttribute('src')),
    regionImg && regionImg.getAttribute('src'));
  check('the region flag file exists on disk',
    fs.existsSync(path.join(APP_DIR, 'assets', 'flags-square-rounded', 'botswana-bw.svg')));
  navUrl = null;
  click(regionBtn);
  check('tapping the region button opens EatOuts-Region.html',
    navUrl === 'EatOuts-Region.html', navUrl);

  /* ---------- E: the town filter knows the overlay venue's town ---------- */
  search('');
  click(doc.querySelector('.filter-btn[data-filter="town"]'));
  const popupText = (doc.getElementById('popup') || {}).textContent || '';
  check('town filter lists Gaborone', /Gaborone/.test(popupText));
  /* a town only one branch trades in still lists: the chain row keeps every
     branch's town even though it shows a single row */
  check('town filter lists a town only one branch has (Maun)', /Maun/.test(popupText),
    popupText.slice(0, 160));

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('');
  dom.window.close();
  if (fails) {
    console.log('SEARCH SCREEN TEST FAILED (' + fails + ' checks)');
    process.exit(1);
  }
  console.log('SEARCH SCREEN TEST PASSED');
}, 300);
