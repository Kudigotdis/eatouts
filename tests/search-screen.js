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
  check('directory rows still present (KFC found)', search('kfc').length >= 1, search('kfc').length);

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
  /* Ocean Basket has two real directory branches, so two rows are correct -
     the overlay entry for it must NOT add a third ("venue-ocean-basket"). */
  check('"ocean basket" adds no overlay duplicate',
    idsFor('ocean basket').every(id => id.indexOf('venue-') !== 0), idsFor('ocean basket').join(' | '));
  check('"bukhara" adds no overlay duplicate',
    idsFor('bukhara').every(id => id.indexOf('venue-') !== 0), idsFor('bukhara').join(' | '));
  check('"bukhara" is still exactly one row', idsFor('bukhara').length === 1, idsFor('bukhara').length);

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
  check('row 1 is the town, read-only',
    !!townLine && /Gaborone/.test(townLine.textContent) &&
      townLine.getAttribute('aria-haspopup') === 'false' && townLine.classList.contains('is-set'),
    townLine && townLine.textContent);
  const areaLine = panel && panel.children[1];
  check('row 2 is the area',
    !!areaLine && /Remmogo Crossing/.test(areaLine.textContent),
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
  rows = search('kfc');
  check('"kfc" returns more than one row to compare', rows.length >= 2, rows.length);
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

  check('no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('');
  dom.window.close();
  if (fails) {
    console.log('SEARCH SCREEN TEST FAILED (' + fails + ' checks)');
    process.exit(1);
  }
  console.log('SEARCH SCREEN TEST PASSED');
}, 300);
