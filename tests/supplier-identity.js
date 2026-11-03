#!/usr/bin/env node
/**
 * Supplier onboarding — identity step (T18 step 3).
 *
 * What must hold:
 *   - the profile photo and the business logo are picked from the device
 *     (no URL fields), through the shared EatoutsUpload layer;
 *   - date of birth is mandatory and picked as Year / Month / Day columns,
 *     each opening a floating scroll-list popup; the day list honours month
 *     length and leap years and clamps when the month shrinks;
 *   - a listing belongs to an account, so a new profile opens with the
 *     account holder's details already filled in.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const PAGE = 'eatouts-suppliers.html';
const URL_BASE = 'http://127.0.0.1/';

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inline(file) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

const SOURCE = inline(PAGE);

function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(SOURCE.html, {
    url: URL_BASE + PAGE,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) { if (seed) seed(w); }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

/* the page boots on DOMContentLoaded, so wait a beat before driving it */
const settle = (ms) => new Promise(r => setTimeout(r, ms || 300));

const tap = (w, doc, sel) => {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('missing ' + sel);
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  return el;
};
const sheetItems = doc => Array.from(doc.querySelectorAll('.scrim .pick-item'));
const clearSheets = doc => doc.querySelectorAll('.scrim').forEach(s => s.remove());
const pickOption = (w, doc, label) => {
  const b = sheetItems(doc).find(x => x.textContent.trim() === label);
  if (!b) throw new Error('no option "' + label + '" in the open popup');
  b.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
};


async function run() {
  /* ---------- part 1: pickers + date of birth on a fresh profile ---------- */
  const a = boot();
  await settle(400);
  check('page boots without script errors', a.errors.length === 0, a.errors.join(' | '));
  check('shared upload layer is available', typeof a.w.EatoutsUpload.pickImage === 'function');

  tap(a.w, a.doc, '[data-act="newProfile"]');
  check('identity step opens on a profile photo picker', !!a.doc.querySelector('[data-act="pickPhoto"]'));
  check('profile photo picker is a 150px square',
    /\.photo-pick \.pic\{width:150px;height:150px/.test(SOURCE.html));
  check('business logo has its own picker', !!a.doc.querySelector('[data-act="pickLogo"]'));
  check('no headshot URL field', !/data-model="owner\.headshot"/.test(SOURCE.html));
  check('no logo URL field', !/data-model="business\.logo"/.test(SOURCE.html));
  check('no age number input', !/data-model="owner\.age"/.test(SOURCE.html));
  check('three date-of-birth columns', a.doc.querySelectorAll('.age-col').length === 3);

  let picks = 0;
  a.w.EatoutsUpload.pickImage = (onPick) => { picks++; onPick('data:image/png;base64,PHOTO'); };
  tap(a.w, a.doc, '[data-act="pickPhoto"]');
  check('tapping the photo opens the device picker once', picks === 1, picks);
  check('the picked photo renders in the picker',
    (a.doc.querySelector('.photo-pick .pic img') || {}).src === 'data:image/png;base64,PHOTO');
  check('the caption switches to Change photo',
    /Change photo/.test(a.doc.querySelector('.photo-pick .cap').textContent));

  a.w.EatoutsUpload.pickImage = (onPick) => onPick('data:image/png;base64,LOGO');
  tap(a.w, a.doc, '[data-act="pickLogo"]');
  check('the picked logo renders in the row',
    (a.doc.querySelector('.logo-pick .pic img') || {}).src === 'data:image/png;base64,LOGO');

  /* year popup */
  tap(a.w, a.doc, '[data-part="y"]');
  check('year column opens a floating list', !!a.doc.querySelector('.scrim .sheet'));
  check('year list offers ages 18 to 90', sheetItems(a.doc).length === 73, sheetItems(a.doc).length);
  pickOption(a.w, a.doc, '1990');
  check('the list closes on pick', !a.doc.querySelector('.scrim'));

  /* month popup */
  tap(a.w, a.doc, '[data-part="m"]');
  check('month list offers 12 months', sheetItems(a.doc).length === 12, sheetItems(a.doc).length);
  pickOption(a.w, a.doc, 'Feb');

  /* day popup honours a non-leap February */
  tap(a.w, a.doc, '[data-part="d"]');
  check('Feb 1990 offers 28 days', sheetItems(a.doc).length === 28, sheetItems(a.doc).length);
  pickOption(a.w, a.doc, '28');
  check('the columns show the picked date',
    a.doc.querySelector('[data-part="y"] .v').textContent === '1990' &&
    a.doc.querySelector('[data-part="m"] .v').textContent === 'Feb' &&
    a.doc.querySelector('[data-part="d"] .v').textContent === '28',
    Array.from(a.doc.querySelectorAll('.age-col .v')).map(e => e.textContent).join('|'));

  /* leap year */
  clearSheets(a.doc);
  tap(a.w, a.doc, '[data-part="y"]');
  pickOption(a.w, a.doc, '1992');
  clearSheets(a.doc);
  tap(a.w, a.doc, '[data-part="d"]');
  check('Feb 1992 offers 29 days', sheetItems(a.doc).length === 29, sheetItems(a.doc).length);
  pickOption(a.w, a.doc, '29');

  /* the day clamps when the month shrinks */
  clearSheets(a.doc);
  tap(a.w, a.doc, '[data-part="m"]');
  pickOption(a.w, a.doc, 'Jan');
  clearSheets(a.doc);
  tap(a.w, a.doc, '[data-part="d"]');
  check('January offers 31 days', sheetItems(a.doc).length === 31, sheetItems(a.doc).length);
  pickOption(a.w, a.doc, '31');
  clearSheets(a.doc);
  tap(a.w, a.doc, '[data-part="m"]');
  pickOption(a.w, a.doc, 'Apr');
  check('31 Jan clamps to 30 when the month becomes April',
    a.doc.querySelector('[data-part="d"] .v').textContent === '30',
    a.doc.querySelector('[data-part="d"] .v').textContent);

  /* the saved record */
  await settle(2300);            /* autosave debounce */
  const draft = JSON.parse(a.w.localStorage.getItem('eatouts_supplier_draft_v1') || '{}');
  check('the date of birth is stored as YYYY-MM-DD', draft.owner && draft.owner.dob === '1992-04-30',
    draft.owner && draft.owner.dob);
  check('the age is derived from it', draft.owner && typeof draft.owner.age === 'number' && draft.owner.age >= 33,
    draft.owner && draft.owner.age);
  check('the photo reaches the draft', draft.owner && draft.owner.photo === 'data:image/png;base64,PHOTO',
    draft.owner && draft.owner.photo);
  check('the logo reaches the draft',
    draft.business && draft.business.logo === 'data:image/png;base64,LOGO',
    draft.business && draft.business.logo);



  /* ---------- part 2: the account holder prefills step 1 ---------- */
  const b = boot(w => {
    w.localStorage.setItem('eatouts_suppliers_v1', JSON.stringify([{
      id: 'sup_existing',
      status: 'published',
      owner: {
        firstName: 'Neo', lastName: 'Kgosana', photo: 'data:image/png;base64,OLD',
        dob: '1990-05-06', age: 36, birth: { y: 1990, m: 5, d: 6 }
      },
      business: { name: 'Neo Catering' }
    }]));
  });
  await settle(400);
  check('a device with an existing profile still lands on the landing screen',
    !!b.doc.querySelector('[data-act="newProfile"]'));
  tap(b.w, b.doc, '[data-act="newProfile"]');
  const first = b.doc.querySelector('[data-model="owner.firstName"]');
  const last = b.doc.querySelector('[data-model="owner.lastName"]');
  check('the account holder first name prefills', first && first.value === 'Neo', first && first.value);
  check('the account holder last name prefills', last && last.value === 'Kgosana', last && last.value);
  check('the account holder photo prefills', !!b.doc.querySelector('.photo-pick .pic img'));
  check('the account holder date of birth prefills',
    b.doc.querySelector('[data-part="y"] .v').textContent === '1990' &&
    b.doc.querySelector('[data-part="m"] .v').textContent === 'May' &&
    b.doc.querySelector('[data-part="d"] .v').textContent === '6',
    Array.from(b.doc.querySelectorAll('.age-col .v')).map(e => e.textContent).join('|'));

  /* ---------- part 3: both halves are mandatory to publish ---------- */
  check('publish warns when the date of birth is missing',
    SOURCE.html.indexOf('date of birth (Step 1)') > -1);
  check('publish warns when the account holder name is missing',
    SOURCE.html.indexOf('Listings belong to an account') > -1);

  console.log(fails ? 'SUPPLIER-IDENTITY TEST FAILED (' + fails + ')' : 'SUPPLIER-IDENTITY TEST PASSED');
  process.exit(fails ? 1 : 0);
}

run().catch(e => {
  console.log('FAIL  harness threw :: ' + (e && e.stack || e));
  console.log('SUPPLIER-IDENTITY TEST FAILED (1)');
  process.exit(1);
});
