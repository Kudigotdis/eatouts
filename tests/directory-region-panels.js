#!/usr/bin/env node
/* ============================================================
   Every region renders its listings.

   The reported failure was "Botswana shows no catering / bakeries /
   beverages" and "Kenya, Mauritius, South Africa and Zimbabwe show no
   restaurants at all". Two causes are guarded here:

     - the panels only ever list businesses for the ACTIVE region, so the
       header must say which region is active (an empty ZW panel used to
       read as an empty Botswana one)
     - each region's merged payload must reach the list

   Measured on the shipped payloads: BW 477 restaurants / 115 catering /
   97 bakeries / 47 beverage rows.
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

function boot(html, region, opts) {
  opts = opts || {};
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) return;
    errors.push('jsdomError: ' + (e.stack || m));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const page = opts.withPayload === false ? html : withRegionPayload(html, region);
  const dom = new JSDOM(page, {
    url: 'https://example.test/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(window) {
      try { window.localStorage.setItem('eatouts.region.v1', region); } catch (e) {}
      /* opts.quota: simulate a full localStorage so the merge write throws the
         way it does on a device that has already stored three regions. */
      if (opts.quota) {
        const real = window.localStorage.setItem.bind(window.localStorage);
        window.localStorage.setItem = function (key, value) {
          if (String(key) === 'eatouts_db_v2') throw new Error('QuotaExceededError');
          return real(key, value);
        };
      }
      window.fetch = function () { return Promise.reject(new Error('offline test')); };
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

const index = inlineScripts('index.html');
check('index.html scripts all exist', index.errors.length === 0, index.errors.join(' | '));

/* ---------------- Botswana: the three directories ---------------- */

const bw = boot(index.html, 'BW');
const w = bw.w;
const doc = bw.doc;

check('Botswana is the active region', w.EatoutsRegions.code() === 'BW', w.EatoutsRegions.code());
check('the header chip shows the active region flag',
  /assets\/flags-circlular\/botswana-bw\.svg$/.test((doc.getElementById('hdrRegionFlag') || {}).src || ''),
  (doc.getElementById('hdrRegionFlag') || {}).src);
check('the header no longer prints the region name',
  !doc.getElementById('hdrRegionName'));
check('the header chip is tappable to change country',
  !!doc.querySelector('[data-act="openRegionScreen"]'));

w.eval('state.tab="restaurants"; render();');

const panels = [
  { panel: 'catering', page: 'catering', label: 'Catering', min: 100, known: 'Boifys' },
  { panel: 'bakery', page: 'bakeries', label: 'Bakeries', min: 90, known: 'Antony' },
  { panel: 'beverages', page: 'beverages', label: 'Beverages', min: 40, known: 'Liquor' }
];

panels.forEach(function (p) {
  w.eval('switchRestPanel(' + JSON.stringify(p.panel) + '); render();');
  const el = doc.querySelector('.bevpage[data-page="' + p.page + '"]');
  const rows = el ? el.querySelectorAll('.ritem').length : -1;
  check(p.label + ': panel renders', !!el);
  check(p.label + ': lists businesses', rows >= p.min, rows);
  check(p.label + ': lists a known Botswana business',
    !!el && el.textContent.indexOf(p.known) !== -1, el && el.textContent.slice(0, 120));
});

w.eval('switchRestPanel("food"); render();');
const foodEl = doc.querySelector('.bevpage[data-page="food"]');
const foodRows = doc.querySelectorAll('.bevpage[data-page="food"] [data-racc]').length;
check('Restaurants: Botswana lists venues', foodRows >= 400, foodRows);
check('Restaurants: no bogus "did not load" card',
  !!foodEl && foodEl.textContent.indexOf('Listings did not load') === -1,
  foodEl && foodEl.textContent.slice(0, 140));

/* ---------------- every region merges its own payload ---------------- */

[['ZW', 'Zimbabwe'], ['KE', 'Kenya'], ['MU', 'Mauritius'], ['ZA', 'South Africa']].forEach(function (r) {
  const region = r[0], name = r[1];
  const page = boot(index.html, region);
  const cw = page.w;
  check(name + ' is the active region', cw.EatoutsRegions.code() === region, cw.EatoutsRegions.code());
  check(name + ': the header flag follows the region',
    new RegExp('/assets/flags-circlular/' + page.w.EatoutsRegions.get(region).flag + '\\.svg$').test((page.doc.getElementById('hdrRegionFlag') || {}).src || ''),
    (page.doc.getElementById('hdrRegionFlag') || {}).src);
  cw.eval('state.tab="restaurants"; state.restPanel="food"; render();');
  const rows = page.doc.querySelectorAll('.bevpage[data-page="food"] [data-racc]').length;
  const el = page.doc.querySelector('.bevpage[data-page="food"]');
  check(name + ': restaurants list is not empty', rows > 0, rows);
  check(name + ': no silent failure card',
    !!el && el.textContent.indexOf('Listings did not load') === -1,
    el && el.textContent.slice(0, 140));
  check(name + ': no runtime errors', page.errors.length === 0, page.errors.join(' | '));
  try { cw.close(); } catch (e) {}
});

/* ---------------- a full localStorage must not empty the list ---------------- */

const full = boot(index.html, 'ZW', { quota: true });
const fw = full.w;
fw.eval('state.tab="restaurants"; state.restPanel="food"; render();');
const fullRows = full.doc.querySelectorAll('.bevpage[data-page="food"] [data-racc]').length;
check('a failed DB write still lists the merged region rows', fullRows > 0, fullRows);
check('the DB still holds the merged rows in memory',
  fw.EatoutsBridge.all().length > 0, fw.EatoutsBridge.all().length);
try { fw.close(); } catch (e) {}

/* ---------------- payload missing: say so, never a blank list ---------------- */

const broken = boot(index.html, 'ZW', { withPayload: false });
const bw2 = broken.w;
bw2.eval('state.tab="restaurants"; state.restPanel="food"; render();');
const brokenText = broken.doc.querySelector('.bevpage[data-page="food"]').textContent;
check('a missing payload explains itself', brokenText.indexOf('Listings did not load') !== -1,
  brokenText.slice(0, 140));
check('a missing payload offers a retry', !!broken.doc.querySelector('[data-act="retryDirectory"]'));
check('a missing payload never leaks a Botswana venue',
  brokenText.indexOf('The Yellow Giraffe') === -1);

check('no runtime errors (Botswana)', bw.errors.length === 0, bw.errors.join(' | '));

if (global.gc) { global.gc(); global.gc(); }
console.log('HEAP end: ' + Math.round(process.memoryUsage().heapUsed / 1048576) + 'MB');
console.log('');
console.log(fails === 0 ? 'DIRECTORY REGION PANELS TEST PASSED' : 'DIRECTORY REGION PANELS TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
