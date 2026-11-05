#!/usr/bin/env node
/**
 * Botswana Halaal certification surfaces.
 *
 * Verifies the shared helper plus the three badge/popup placements:
 *   - venue-menu restaurant card
 *   - venue-menu-item card (must NOT show the badge)
 *   - restaurants-pager open row only
 *   - venue-about status line + popup
 *
 * CommonJS on purpose - tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const withRegionPayload = require('./_region-payload');
let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}
function inline(file) {
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  const missing = [];
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { missing.push(src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  /* The directory payload is document.write()n by js/eatouts-region-data.js, which
     jsdom never fetches — hand the page the Botswana payload the browser gets. */
  html = withRegionPayload(html, 'BW');
  return { html, missing };
}
function load(file, url) {
  const { html, missing } = inline(file);
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) return;
    errors.push('jsdomError: ' + (e.stack || e.message));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, doc: dom.window.document, window: dom.window, errors, missing };
}
function click(el) {
  if (!el) return;
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

const index = load('index.html', 'http://localhost/index.html');

setTimeout(() => {
  const { doc, window, errors, missing } = index;
  const ev = s => window.eval(s);
  const vp = doc.getElementById('viewport');

  check('index loads every script', missing.length === 0, missing.join(' | '));
  check('the shared helper is exported', typeof window.EatoutsBrand.isHalaalVenue === 'function');

  /* ---------- venue-menu: badge top-right of the restaurant card ---------- */
  const opened = ev(`(function(){
    var r = EatoutsBridge.all().filter(function(x){ return x.slug === 'kfc'; })[0];
    if(!r) return null;
    state.tab = 'restaurants';
    state.restaurantOpen = r.slug;
    state.restaurantView = { id: r.id, brand: r.slug, view: 'menu', promoId: null };
    state.menuCat = null; state.menuOpen = null;
    state.checkoutView = false; state.splitOpen = false;
    EatoutsBridge.setActive(r.id);
    render();
    return { id: r.id, name: r.name };
  })()`);
  check('KFC menu opened', !!(opened && opened.id), opened && JSON.stringify(opened));
  let card = vp.querySelector('.screen[data-page="venue-menu"] .restcard');
  check('venue-menu renders the restaurant card', !!card);
  const menuBadge = card && card.querySelector('.halaal-badge-card');
  check('venue-menu card carries the Halaal badge', !!menuBadge,
    card && card.textContent);
  check('the badge is the Botswana Halaal logo',
    !!menuBadge && /assets\/halaal-logos\/Botswana_Halaal_Logo\.jpg$/.test(menuBadge.querySelector('img').getAttribute('src')),
    menuBadge && menuBadge.querySelector('img').getAttribute('src'));

  /* popup */
  click(menuBadge);
  let alert = doc.querySelector('.card-alert');
  check('tapping the badge opens the Halaal popup', !!alert);
  check('popup title is Certified Halaal',
    (alert.querySelector('h3') || {}).textContent === 'Certified Halaal',
    alert && alert.querySelector('h3') && alert.querySelector('h3').textContent);
  check('popup explains the Botswana Halaal Authority certification',
    /certified by the Botswana Halaal Authority/i.test((alert.querySelector('p') || {}).textContent || ''));
  check('popup offers View All Halaal Options',
    !!alert.querySelector('a.dlg-btn') &&
      alert.querySelector('a.dlg-btn').textContent === 'View All Halaal Options',
    alert.querySelector('a.dlg-btn') && alert.querySelector('a.dlg-btn').textContent);
  check('the CTA opens search_screen.html?halaal=1',
    alert.querySelector('a.dlg-btn').getAttribute('href') === 'search_screen.html?halaal=1',
    alert.querySelector('a.dlg-btn').getAttribute('href'));
  check('popup has a top-right close control', !!alert.querySelector('.card-alert-close'));
  click(alert.querySelector('.card-alert-close'));
  check('the close control dismisses the popup', !doc.querySelector('.card-alert'));

  click(menuBadge);
  click(doc.querySelector('.card-alert-dismiss'));
  check('the Dismiss link also closes the popup', !doc.querySelector('.card-alert'));

  /* ---------- venue-menu-item: badge must not appear here ---------- */
  ev(`(function(){
    var M = curMenu();
    state.menuCat = M[0].id;
    state.menuOpen = null;
    render();
    return M[0].id;
  })()`);
  card = vp.querySelector('.screen[data-page="venue-menu-item"] .restcard');
  check('venue-menu-item renders the restaurant card', !!card);
  check('venue-menu-item does NOT carry the Halaal badge', !card.querySelector('.halaal-badge'));

  /* ---------- restaurants-pager: badge only while the row is open ---------- */
  ev(`(function(){
    state.restaurantView = null;
    state.restaurantOpen = null;
    state.menuCat = null;
    state.menuOpen = null;
    state.restQuery = '';
    state.restTypes = [];
    state.restTown = 'All';
    state.restDistrict = '';
    state.restDistrictName = '';
    state.restArea = 'All';
    render();
  })()`);
  const kfcRow = vp.querySelector('.screen[data-page="restaurants-pager"] .ritem[data-racc="kfc"]');
  check('restaurants-pager renders the KFC group', !!kfcRow);
  const rowBadge = kfcRow && kfcRow.querySelector('.halaal-badge-row');
  check('the open/closed row has a Halaal badge sibling', !!rowBadge);
  check('the badge is hidden while the row is collapsed',
    !!rowBadge && window.getComputedStyle(rowBadge).display === 'none',
    rowBadge && window.getComputedStyle(rowBadge).display);
  click(kfcRow.querySelector('.rrow'));
  check('opening the row reveals the badge', window.getComputedStyle(rowBadge).display !== 'none',
    window.getComputedStyle(rowBadge).display);
  check('the badge sits outside the row button',
    rowBadge.parentElement === kfcRow && rowBadge.previousElementSibling === kfcRow.querySelector('.rrow'));
  click(kfcRow.querySelector('.rrow'));
  check('closing the row hides the badge again', window.getComputedStyle(rowBadge).display === 'none',
    window.getComputedStyle(rowBadge).display);

  const steersRow = vp.querySelector('.screen[data-page="restaurants-pager"] .ritem[data-racc="steers"]');
  check('a non-certified row carries no Halaal badge',
    !!steersRow && !steersRow.querySelector('.halaal-badge'));

  check('index has no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));

  /* ---------- venue-about: badge left of the status text + popup ---------- */
  index.dom.window.close();
  const about = load('venue-about.html', 'http://localhost/venue-about.html?link=kfc');
  const adoc = about.doc;
  const awin = about.window;
  const status = adoc.getElementById('statusLine');
  const aboutBadge = status && status.querySelector('#halaalBadge');
  check('venue-about status line carries the Halaal badge', !!aboutBadge);
  check('the badge is the first child, ahead of the status text',
    !!aboutBadge && status.firstElementChild === aboutBadge);
  check('the status text still follows the badge',
    !!status && /Open|Closed/.test(status.textContent || ''), status && status.textContent);

  click(aboutBadge);
  const popup = adoc.getElementById('popup');
  check('tapping the venue-about badge opens the popup', popup.classList.contains('open'));
  check('venue-about popup title is Certified Halaal',
    adoc.getElementById('popupTitle').textContent === 'Certified Halaal',
    adoc.getElementById('popupTitle').textContent);
  check('venue-about popup has the certification copy',
    /certified by the Botswana Halaal Authority/i.test(adoc.getElementById('popupBody').textContent || ''));
  const cta = adoc.querySelector('#popupBody a.halaal-pop-cta');
  check('venue-about CTA opens search_screen.html?halaal=1',
    !!cta && cta.getAttribute('href') === 'search_screen.html?halaal=1',
    cta && cta.getAttribute('href'));
  check('venue-about popup has a top-right close control', !!adoc.getElementById('popupClose'));
  click(adoc.getElementById('popupClose'));
  check('the X closes the venue-about popup', !popup.classList.contains('open'));

  click(aboutBadge);
  click(adoc.querySelector('#popupBody [data-halaal-close]'));
  check('Dismiss closes the venue-about popup', !popup.classList.contains('open'));

  check('venue-about loads every script', about.missing.length === 0, about.missing.join(' | '));
  check('venue-about has no runtime errors', about.errors.length === 0, about.errors.slice(0, 3).join(' | '));
  about.dom.window.close();

  /* ---------- search_screen.html?halaal=1 arrives pre-filtered ---------- */
  const searchPage = load('search_screen.html', 'http://localhost/search_screen.html?halaal=1');
  setTimeout(() => {
    const sdoc = searchPage.doc;
    const chip = sdoc.querySelector('.filter-btn[data-halaal-toggle]');
    check('the ?halaal=1 deep link switches the chip on',
      !!chip && chip.classList.contains('on') && chip.getAttribute('aria-pressed') === 'true',
      chip && chip.getAttribute('aria-pressed'));
    const resultNames = Array.from(sdoc.querySelectorAll('#results .result-name')).map(el => el.textContent);
    check('the deep link only shows certified venues',
      resultNames.length > 0 && resultNames.indexOf('KFC') > -1 &&
        resultNames.indexOf('Steers') === -1 && resultNames.indexOf('Ocean Basket') === -1,
      resultNames.slice(0, 8).join(' | '));
    check('search_screen.html loads every script', searchPage.missing.length === 0, searchPage.missing.join(' | '));
    check('search_screen.html has no runtime errors', searchPage.errors.length === 0,
      searchPage.errors.slice(0, 3).join(' | '));

    console.log('');
    console.log(fails === 0 ? 'HALAAL TEST PASSED' : 'HALAAL TEST FAILED (' + fails + ' checks)');
    searchPage.dom.window.close();
    process.exit(fails === 0 ? 0 : 1);
  }, 1200);
}, 1000);
