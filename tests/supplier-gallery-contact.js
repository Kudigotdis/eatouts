#!/usr/bin/env node
/**
 * Supplier onboarding — step 4 gallery and step 6 contact (T18 steps 5+7).
 *
 * What must hold:
 *   - the gallery is device-only: no image-URL button, no URL sheet. Photos
 *     are picked, swiped (scroll-snap strip) and enlarged on tap;
 *   - the town is a floating picker sourced from botswana_locations.js, and
 *     picking one stores the town plus its district;
 *   - "Neighbourhood / area" and "Peak season" are gone;
 *   - every `.chip` is the same width.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const PAGE = 'eatouts-suppliers.html';
const URL_BASE = 'http://127.0.0.1/';
const DRAFT_KEY = 'eatouts_supplier_draft_v1';

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inline(file) {
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing -->';
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return html;
}

const SOURCE = inline(PAGE);

function boot() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(SOURCE, {
    url: URL_BASE + PAGE,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

const settle = (ms) => new Promise(r => setTimeout(r, ms || 300));

const tap = (w, doc, sel) => {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('missing ' + sel);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return el;
};
const stepIdx = key => '[data-act="toggleStep"][data-step="' + key + '"]';
const visibleItems = doc => Array.from(doc.querySelectorAll('.scrim .pick-item'))
  .filter(b => b.style.display !== 'none');

async function run() {
  const a = boot();
  await settle(400);
  check('page boots without script errors', a.errors.length === 0, a.errors.join(' | '));
  check('the location adapter is loaded', typeof a.w.EatoutsLocations.allTowns === 'function');

  tap(a.w, a.doc, '[data-act="newProfile"]');

  /* ================= STEP 4 — GALLERY ================= */
  tap(a.w, a.doc, stepIdx('gallery'));
  check('no image-URL button anywhere', !/data-act="addImage"/.test(SOURCE));
  check('no "Add image URL" label anywhere', !/Add image URL/.test(SOURCE));
  check('no image URL sheet is left', !/function editImage/.test(SOURCE));
  check('the gallery adds photos from the device', !!a.doc.querySelector('[data-act="addGalleryPhoto"]'));
  check('the gallery starts empty', /No photos yet/.test(a.doc.querySelector('.acc-item.open').textContent));

  let picks = 0;
  a.w.EatoutsUpload.pickImage = (onPick) => { picks++; onPick('data:image/png;base64,GAL1'); };
  tap(a.w, a.doc, '[data-act="addGalleryPhoto"]');
  check('tapping Add photo opens the device picker once', picks === 1, picks);
  check('the picked photo renders',
    (a.doc.querySelector('.acc-item.open .gal-cell img') || {}).src === 'data:image/png;base64,GAL1');

  /* swipe = a scroll-snap strip, not a static grid */
  check('the gallery renders as a swipe strip',
    !!a.doc.querySelector('.acc-item.open .gal-strip .gal-cell'));
  check('the strip scroll-snaps horizontally',
    /\.gal-strip\{[^}]*overflow-x:auto[^}]*scroll-snap-type:x mandatory/.test(SOURCE));
  check('each cell snaps to the start',
    /\.gal-strip \.gal-cell\{[^}]*scroll-snap-align:start/.test(SOURCE));

  /* tap to enlarge */
  tap(a.w, a.doc, '.acc-item.open .gal-cell img');
  check('tapping a photo opens the viewer',
    (a.doc.querySelector('.scrim img') || {}).src === 'data:image/png;base64,GAL1');
  tap(a.w, a.doc, '.scrim [data-act="closeSheet"]');
  check('the viewer closes', !a.doc.querySelector('.scrim'));

  a.w.EatoutsUpload.pickImage = (onPick) => onPick('data:image/png;base64,GAL2');
  tap(a.w, a.doc, '[data-act="addGalleryPhoto"]');
  check('a second photo is added', a.doc.querySelectorAll('.acc-item.open .gal-cell').length === 2);

  tap(a.w, a.doc, '.acc-item.open [data-act="removeImage"][data-i="0"]');
  check('a photo can be removed', a.doc.querySelectorAll('.acc-item.open .gal-cell').length === 1);

  /* ================= STEP 6 — CONTACT ================= */
  tap(a.w, a.doc, stepIdx('contact'));
  const contact = a.doc.querySelector('.acc-item.open');
  check('the town is a picker, not a text field',
    !!contact.querySelector('[data-act="pickTown"]') && !/data-model="location\.town"/.test(SOURCE));
  check('the town field is empty until picked', /Select your town/.test(contact.textContent));
  check('"Neighbourhood / area" is gone',
    !/Neighbourhood/.test(SOURCE) && !/data-model="location\.area"/.test(SOURCE));
  check('"Peak season" is gone',
    !/Peak season/.test(SOURCE) && !/data-model="availability\.peakSeason"/.test(SOURCE));

  tap(a.w, a.doc, '[data-act="pickTown"]');
  check('the town picker is a floating popup', !!a.doc.querySelector('.scrim .sheet'));
  const townCount = a.w.EatoutsLocations.allTowns().length;
  check('the picker lists every town from botswana_locations.js',
    a.doc.querySelectorAll('.scrim .pick-item').length === townCount, townCount);
  check('the picker offers a search box', !!a.doc.querySelector('.scrim #__pickSearch'));

  const box = a.doc.querySelector('.scrim #__pickSearch');
  box.value = 'gaborone';
  box.dispatchEvent(new a.w.Event('input', { bubbles: true }));
  check('search narrows the list', visibleItems(a.doc).length > 0 && visibleItems(a.doc).length < townCount,
    visibleItems(a.doc).length + ' of ' + townCount);
  box.value = '';
  box.dispatchEvent(new a.w.Event('input', { bubbles: true }));
  check('clearing the search restores every town', visibleItems(a.doc).length === townCount);

  const gaborone = Array.from(a.doc.querySelectorAll('.scrim .pick-item'))
    .find(b => b.textContent.trim() === 'Gaborone');
  check('Gaborone is on the list', !!gaborone);
  gaborone.dispatchEvent(new a.w.MouseEvent('click', { bubbles: true }));
  check('picking a town closes the popup', !a.doc.querySelector('.scrim'));
  check('the picked town shows in the field',
    /Gaborone/.test(a.doc.querySelector('[data-act="pickTown"]').textContent));

  /* chips: equal width, still tappable */
  check('chips sit in an equal-width grid',
    /\.chips\{display:grid;grid-template-columns:repeat\(3,1fr\)/.test(SOURCE) &&
    /\.chip\{[^}]*text-align:center/.test(SOURCE));
  const mon = Array.from(a.doc.querySelectorAll('.acc-item.open .chip'))
    .find(c => c.textContent.trim() === 'Mon');
  mon.dispatchEvent(new a.w.MouseEvent('click', { bubbles: true }));
  check('a chip still toggles', /on/.test(a.doc.querySelector('.acc-item.open .chip.on').className));

  /* ================= the draft ================= */
  await settle(2600);
  const draft = JSON.parse(a.w.localStorage.getItem(DRAFT_KEY) || '{}');
  check('the gallery photo reaches the draft',
    (((draft.gallery || {}).images) || []).length === 1,
    (((draft.gallery || {}).images) || []).length);
  check('the town reaches the draft', (draft.location || {}).town === 'Gaborone', (draft.location || {}).town);
  check('the district comes with the town',
    (draft.location || {}).district === '01' && (draft.location || {}).districtName === 'Gaborone',
    JSON.stringify([(draft.location || {}).district, (draft.location || {}).districtName]));
  check('the draft carries no area field', !('area' in (draft.location || {})));
  check('the draft carries no peak season', !('peakSeason' in (draft.availability || {})));
  check('the weekday chip reaches the draft', ((draft.availability || {}).days || []).indexOf('Mon') > -1);

  const errs = a.errors.filter(e => e.indexOf('Not implemented') === -1);
  check('no script errors during the walkthrough', errs.length === 0, errs.join(' | '));

  console.log(fails === 0 ? 'SUPPLIER-GALLERY-CONTACT TEST PASSED' : 'SUPPLIER-GALLERY-CONTACT TEST FAILED (' + fails + ')');
  process.exit(fails === 0 ? 0 : 1);
}

run().catch(e => { console.error('CRASH ' + (e && e.stack || e)); process.exit(1); });


