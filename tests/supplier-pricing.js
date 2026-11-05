#!/usr/bin/env node
/**
 * Supplier onboarding — per-service pricing (T18 step 4).
 *
 * What must hold:
 *   - tapping a service opens a floating popup (never a bottom sheet) where
 *     that service is configured: title, base rate, half/full day, deposit,
 *     minimum notice;
 *   - each selected service gets its own Step 3 with its own rates, payment
 *     terms, packages, discount codes and photos — nothing leaks between
 *     services;
 *   - the old single aggregated pricing step is gone;
 *   - the publish checklist and the summary card read the per-service data.
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

/* the catalogue the page renders its service picks from */
function loadCatalog() {
  const win = {};
  new Function('window', fs.readFileSync(path.join(APP_DIR, 'data', 'supplier_catalog.js'), 'utf8'))(win);
  return win.EATOUTS_SUPPLIER_CATALOG || [];
}

function boot() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(SOURCE.html, {
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
const type = (w, doc, sel, value) => {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('missing ' + sel);
  el.value = String(value);
  el.dispatchEvent(new w.Event('input', { bubbles: true }));
  return el;
};
const fill = (doc, sel, value) => {
  const el = doc.querySelector(sel);
  if (!el) throw new Error('missing ' + sel);
  el.value = String(value);
  return el;
};
const stepIdx = key => '[data-act="toggleStep"][data-step="' + key + '"]';

async function run() {
  const CATALOG = loadCatalog();
  const cat = CATALOG.filter(c => c.types && c.types.length > 1)[0];
  const t0 = cat.types[0];
  const t1 = cat.types[1];
  const keyA = 'pricing:' + cat.id + ':' + t0.id;
  const keyB = 'pricing:' + cat.id + ':' + t1.id;

  const a = boot();
  await settle(400);
  check('page boots without script errors', a.errors.length === 0, a.errors.join(' | '));

  /* ---------- the popup is a floating card, not a bottom sheet ---------- */
  check('the overlay is centred on every screen size',
    /\.scrim\{[^}]*align-items:center/.test(SOURCE.html) && !/\.scrim\{[^}]*align-items:flex-end/.test(SOURCE.html));
  check('the popup is a 420px floating card',
    /\.sheet\{[^}]*max-width:420px[^}]*max-height:80dvh/.test(SOURCE.html));

  /* ---------- add a service through the popup ---------- */
  tap(a.w, a.doc, '[data-act="newProfile"]');
  tap(a.w, a.doc, stepIdx('services'));
  tap(a.w, a.doc, '[data-act="toggleCat"][data-cat="' + cat.id + '"]');
  tap(a.w, a.doc, '[data-act="toggleService"][data-type="' + t0.id + '"]');

  check('tapping a service opens a floating popup', !!a.doc.querySelector('.scrim .sheet'));
  check('the popup configures the service itself',
    !!a.doc.querySelector('#__svcRate') && !!a.doc.querySelector('#__svcHalf') &&
    !!a.doc.querySelector('#__svcFull') && !!a.doc.querySelector('#__svcDep') &&
    !!a.doc.querySelector('#__svcMin'));
  check('the popup prefills the service type name',
    a.doc.querySelector('#__svcTitle').value === t0.name, a.doc.querySelector('#__svcTitle').value);

  fill(a.doc, '#__svcTitle', 'Wedding buffet');
  fill(a.doc, '#__svcRate', 500);
  fill(a.doc, '#__svcHalf', 300);
  fill(a.doc, '#__svcFull', 800);
  fill(a.doc, '#__svcDep', 40);
  fill(a.doc, '#__svcMin', 7);
  tap(a.w, a.doc, '.scrim [data-save]');

  check('the popup closes on save', !a.doc.querySelector('.scrim'));
  const svcPanel = a.doc.querySelector(stepIdx('services')).closest('.acc-item');
  check('the service renders in Step 2', /Wedding buffet/.test(svcPanel.textContent));

  /* ---------- add a second service ---------- */
  tap(a.w, a.doc, '[data-act="toggleService"][data-type="' + t1.id + '"]');
  fill(a.doc, '#__svcTitle', 'Live cooking station');
  fill(a.doc, '#__svcRate', 1200);
  tap(a.w, a.doc, '.scrim [data-save]');

  /* ---------- one pricing step per service ---------- */
  const pricingSteps = Array.from(a.doc.querySelectorAll('[data-act="toggleStep"]'))
    .filter(b => (b.getAttribute('data-step') || '').indexOf('pricing:') === 0);
  check('each selected service gets its own pricing step', pricingSteps.length === 2, pricingSteps.length);
  check('every pricing step is labelled Step 3',
    pricingSteps.every(b => /STEP 3/.test(b.querySelector('.n').textContent)));
  check('the pricing steps are named after the services',
    pricingSteps.map(b => b.querySelector('.t').textContent).join('|') === 'Wedding buffet|Live cooking station',
    pricingSteps.map(b => b.querySelector('.t').textContent).join('|'));
  check('the single aggregated pricing step is gone',
    !a.doc.querySelector('[data-step="pricing"]'));
  check('no aggregated rate inputs remain',
    !/data-model="pricing\.(hourlyRate|halfDayRate|fullDayRate|depositPercent)"/.test(SOURCE.html));

  /* ---------- the per-service rates ---------- */
  tap(a.w, a.doc, stepIdx(keyA));
  check('the rates bind to the first service',
    !!a.doc.querySelector('[data-model="services.0.halfDayRate"]') &&
    a.doc.querySelector('[data-model="services.0.halfDayRate"]').value === '300',
    (a.doc.querySelector('[data-model="services.0.halfDayRate"]') || {}).value);
  check('the deposit is stored per service',
    a.doc.querySelector('[data-model="services.0.depositPercent"]').value === '40');

  /* payment terms are per service */
  const chipsOf = doc => Array.from(doc.querySelectorAll('.acc-item.open .chip'));
  const eft = chipsOf(a.doc).find(c => c.textContent.trim() === 'EFT');
  check('payment terms are offered per service', !!eft);
  eft.dispatchEvent(new a.w.MouseEvent('click', { bubbles: true }));
  check('the tapped term turns on', /on/.test(a.doc.querySelector('.acc-item.open .chip.on').className));

  /* ---------- packages and discounts stay with their service ---------- */
  tap(a.w, a.doc, '[data-act="addPackage"]');
  fill(a.doc, '#__pkName', 'Wedding package');
  fill(a.doc, '#__pkPrice', 2500);
  tap(a.w, a.doc, '.scrim [data-save]');
  check('the package is listed under its own service',
    /Wedding package/.test(a.doc.querySelector('.acc-item.open').textContent));

  tap(a.w, a.doc, '[data-act="addDiscount"]');
  fill(a.doc, '#__dCode', 'WED10');
  fill(a.doc, '#__dLabel', '10% off weddings');
  tap(a.w, a.doc, '.scrim [data-save]');
  check('the discount code is listed under its own service',
    /WED10/.test(a.doc.querySelector('.acc-item.open').textContent));

  /* ---------- the second service is untouched ---------- */
  tap(a.w, a.doc, stepIdx(keyB));
  const bPanel = a.doc.querySelector('.acc-item.open');
  check('the other service has no packages', !bPanel.querySelector('.svc-card'));
  check('the other service has no discounts', !bPanel.querySelector('.disc-card'));
  check('the other service has no payment term on', !bPanel.querySelector('.chip.on'));
  check('the other service has its own (empty) rates',
    bPanel.querySelector('[data-model="services.1.halfDayRate"]').value === '');

  /* ---------- service photos ---------- */
  let picks = 0;
  a.w.EatoutsUpload.pickImage = (onPick) => { picks++; onPick('data:image/png;base64,SVC'); };
  tap(a.w, a.doc, stepIdx(keyA));
  tap(a.w, a.doc, '[data-act="addSvcPhoto"]');
  check('the photo comes from the device picker', picks === 1, picks);
  check('the photo renders under its service',
    (a.doc.querySelector('.acc-item.open .gal-cell img') || {}).src === 'data:image/png;base64,SVC');
  tap(a.w, a.doc, '.acc-item.open .gal-cell img');
  check('tapping a photo opens the viewer',
    (a.doc.querySelector('.scrim img') || {}).src === 'data:image/png;base64,SVC');
  tap(a.w, a.doc, '.scrim [data-act="closeSheet"]');
  check('the viewer closes', !a.doc.querySelector('.scrim'));

  tap(a.w, a.doc, '[data-act="removeSvcPhoto"]');
  check('a photo can be removed', !a.doc.querySelector('.acc-item.open .gal-cell'));
  a.w.EatoutsUpload.pickImage = (onPick) => onPick('data:image/png;base64,SVC');
  tap(a.w, a.doc, '[data-act="addSvcPhoto"]');

  /* a rate typed into the second service must not touch the first */
  tap(a.w, a.doc, stepIdx(keyB));
  type(a.w, a.doc, '[data-model="services.1.halfDayRate"]', 600);
  check('the second service keeps its own rate',
    a.doc.querySelector('[data-model="services.1.halfDayRate"]').value === '600');

  /* ---------- checklist + summary card read the per-service data ---------- */
  tap(a.w, a.doc, stepIdx('review'));
  const review = a.doc.querySelector('.acc-item.open').textContent;
  check('the checklist counts the service photo', /1 photo in gallery/.test(review),
    review.slice(0, 200).replace(/\s+/g, ' '));
  check('the checklist sees the per-service price', /Pricing is set/.test(review));
  check('the summary card quotes the cheapest service', /From/.test(review) && /P500\.00/.test(review));

  /* ---------- the draft carries everything on the right service ---------- */
  await settle(2600);
  const draft = JSON.parse(a.w.localStorage.getItem(DRAFT_KEY) || '{}');
  const s0 = (draft.services || [])[0] || {};
  const s1 = (draft.services || [])[1] || {};
  check('the draft holds both services', (draft.services || []).length === 2);
  check('the first service keeps its rates',
    s0.baseRate === 500 && s0.halfDayRate === 300 && s0.fullDayRate === 800 && s0.depositPercent === 40,
    JSON.stringify([s0.baseRate, s0.halfDayRate, s0.fullDayRate, s0.depositPercent]));
  check('the first service keeps its payment terms', s0.paymentTerms === 'EFT', s0.paymentTerms);
  check('the first service keeps its package', ((s0.packages || [])[0] || {}).name === 'Wedding package');
  check('the first service keeps its discount', ((s0.discounts || [])[0] || {}).code === 'WED10');
  check('the first service keeps its photo', (s0.images || []).length === 1, (s0.images || []).length);
  check('the second service kept its own rate', s1.halfDayRate === 600, s1.halfDayRate);
  check('the second service got no package', (s1.packages || []).length === 0);
  check('the second service got no discount', (s1.discounts || []).length === 0);
  check('the second service got no photo', (s1.images || []).length === 0);

  /* ---------- removing a service removes its step ---------- */
  tap(a.w, a.doc, stepIdx('services'));
  const removeBtns = a.doc.querySelectorAll('[data-act="removeService"]');
  removeBtns[1].dispatchEvent(new a.w.MouseEvent('click', { bubbles: true }));
  const after = Array.from(a.doc.querySelectorAll('[data-act="toggleStep"]'))
    .filter(b => (b.getAttribute('data-step') || '').indexOf('pricing:') === 0);
  check('removing a service removes its pricing step', after.length === 1, after.length);

  const errs = a.errors.filter(e => e.indexOf('Not implemented') === -1);
  check('no script errors during the walkthrough', errs.length === 0, errs.join(' | '));

  console.log(fails === 0 ? 'SUPPLIER-PRICING TEST PASSED' : 'SUPPLIER-PRICING TEST FAILED (' + fails + ')');
  process.exit(fails === 0 ? 0 : 1);
}

run().catch(e => { console.error('CRASH ' + (e && e.stack || e)); process.exit(1); });

