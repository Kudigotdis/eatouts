#!/usr/bin/env node
/* ============================================================
   Directory region empty states.

   Catering, bakery and beverage data is Botswana-only today. In every
   other active region those three panels must say the businesses are
   yet to be listed instead of showing Botswana's businesses.

   Covered here:
     - Zimbabwe boots as the active region
     - Catering / Bakery / Beverages show the message, no rows and no
       Botswana names
     - the Town / Area / Type filter bar stays hidden for those panels
     - the message names whatever region is active (South Africa check)
     - search_screen.html does not index the Botswana-only directories
       while Zimbabwe is active
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const withRegionPayload = require('./_region-payload');

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inlineScripts(file) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

function boot(html, region) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) return;
    errors.push('jsdomError: ' + (e.stack || m));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(withRegionPayload(html, region), {
    url: 'https://example.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      try { window.localStorage.setItem('eatouts.region.v1', region); } catch (e) {}
      /* jsdom has no fetch; the page's menu/type/beverage loaders all catch. */
      window.fetch = function () { return Promise.reject(new Error('offline test')); };
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

/* ---------------- index.html: the three panels ---------------- */

const index = inlineScripts('index.html');
check('index.html scripts all exist', index.errors.length === 0, index.errors.join(' | '));
const idx = boot(index.html, 'ZW');
const w = idx.w;
const doc = idx.doc;
const ev = s => w.eval(s);

check('Zimbabwe is the active region', w.EatoutsRegions && w.EatoutsRegions.code() === 'ZW',
  w.EatoutsRegions && w.EatoutsRegions.code());
check('Zimbabwe has no catering / bakery / beverage directory',
  w.EatoutsRegions && w.EatoutsRegions.hasDirectory('catering') === false &&
  w.EatoutsRegions.hasDirectory('bakery') === false &&
  w.EatoutsRegions.hasDirectory('beverages') === false);

ev('state.tab="restaurants"; state.restPanel="food"; render();');

const panels = [
  { panel: 'catering', page: 'catering', label: 'Catering businesses', known: 'Mmantlo Goodies' },
  { panel: 'bakery', page: 'bakeries', label: 'Bakeries', known: "Antony's Bakery" },
  { panel: 'beverages', page: 'beverages', label: 'Beverage businesses', known: 'Liquorama' }
];

panels.forEach(function (p) {
  ev('switchRestPanel(' + JSON.stringify(p.panel) + '); render();');
  const el = doc.querySelector('.bevpage[data-page="' + p.page + '"]');
  const text = el ? el.textContent : '';
  check(p.label + ': panel renders', !!el);
  check(p.label + ': shows the yet-to-be-listed message',
    text.indexOf(p.label + ' in Zimbabwe are yet to be listed.') !== -1, text.slice(0, 180));
  check(p.label + ': renders no business rows',
    !!el && el.querySelectorAll('.ritem').length === 0,
    el && el.querySelectorAll('.ritem').length);
  check(p.label + ': does not leak a Botswana business', text.indexOf(p.known) === -1);
});

/* The filter bar must not open for a directory with no data. */
const filterCases = [
  { panel: 'catering', state: 'state.cateringFilterOpen=true' },
  { panel: 'bakery', state: 'state.bakeryFilterOpen=true' },
  { panel: 'beverages', state: 'state.bevFilterOpen=true' }
];

filterCases.forEach(function (c) {
  ev('state.tab="restaurants"; state.restPanel=' + JSON.stringify(c.panel) + '; ' +
    c.state + '; render(); renderControlBar();');
  const cbar = doc.getElementById('cbar');
  check(c.panel + ': filter bar stays hidden',
    !!cbar && !cbar.classList.contains('on') && cbar.innerHTML.trim() === '',
    cbar && cbar.innerHTML.slice(0, 120));
});

/* The copy follows the active region, so SA/KE/MU need no new string. */
w.EATOUTS_REGIONS.forEach(function (r) { if (r.code === 'ZA') r.active = true; });
check('South Africa can be activated for this check', w.EatoutsRegions.setActiveRegion('ZA') === true);
ev('state.tab="restaurants"; state.restPanel="catering"; render();');
const zaText = (doc.querySelector('.bevpage[data-page="catering"]') || {}).textContent || '';
check('the empty state names the active country, not a hard-coded Zimbabwe',
  zaText.indexOf('Catering businesses in South Africa are yet to be listed.') !== -1,
  zaText.slice(0, 180));
w.EatoutsRegions.setActiveRegion('BW');

/* ---------------- search_screen.html: no Botswana-only rows in ZW ---------------- */

const search = inlineScripts('search_screen.html');
check('search_screen.html scripts all exist', search.errors.length === 0, search.errors.join(' | '));
const s = boot(search.html, 'ZW');
const sw = s.w;
const sdoc = s.doc;

check('search screen boots in Zimbabwe',
  sw.EatoutsRegions && sw.EatoutsRegions.code() === 'ZW',
  sw.EatoutsRegions && sw.EatoutsRegions.code());

function searchFor(value) {
  const input = sdoc.getElementById('searchInput');
  const clear = sdoc.querySelector('.clear-btn');
  if (clear && clear.hidden === false) clear.dispatchEvent(new sw.MouseEvent('click', { bubbles: true }));
  input.value = value;
  input.dispatchEvent(new sw.Event('input', { bubbles: true }));
  return Array.prototype.slice.call(sdoc.querySelectorAll('#results .result'));
}

[
  ['Mmantlo', 'Botswana catering'],
  ['Antony', 'Botswana bakery'],
  ['Liquorama', 'Botswana bottle store']
].forEach(function (row) {
  const hits = searchFor(row[0]);
  check('ZW search hides ' + row[1] + ' (' + row[0] + ')', hits.length === 0, hits.length);
});

/* ---------------- runtime errors ---------------- */

const realErrors = idx.errors.concat(s.errors);
check('no runtime errors', realErrors.length === 0, realErrors.join(' | '));

console.log('');
console.log(fails === 0
  ? 'DIRECTORY REGION EMPTY TEST PASSED'
  : 'DIRECTORY REGION EMPTY TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
