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
 *   - tapping it opens its in-app menu (index.html#<slug>/menu)
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

  /* ---------- D: tap opens the venue's in-app menu ---------- */
  let navUrl = null;
  doc.addEventListener('eatouts:about-nav', e => { navUrl = e.detail && e.detail.url; });
  rows = search('zors');
  click(rows[0]);
  check('tapping Zorz opens index.html#zorz-luxury-chisanyama/menu',
    navUrl === 'index.html#zorz-luxury-chisanyama/menu', navUrl);

  /* a normal restaurant still keeps the in-app menu route */
  navUrl = null;
  rows = search('kfc');
  click(rows[0]);
  check('a directory restaurant still opens index.html#<slug>/menu',
    /^index\.html#.+\/menu$/.test(String(navUrl)), navUrl);

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
