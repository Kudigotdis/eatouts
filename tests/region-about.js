#!/usr/bin/env node
/**
 * Zimbabwe — an About tap stays inside Zimbabwe.
 *
 * The reported symptom: with Zimbabwe active, tapping About on a venue dropped
 * the visitor back on the Restaurants list. venue-about.html resolves the
 * ?link= slug against the ACTIVE region's payload, so any venue the list shows
 * that the ZW payload does not contain has nothing to resolve and bounces home.
 *
 * Two leaks caused exactly that, and both are asserted below:
 *   1. js/eatouts-seed.js stamped the ACTIVE region onto the seed roster, the
 *      flagship profile and the Botswana demo databases (which carry no region
 *      of their own), so those rows survived EatoutsRegions.filterByRegion()
 *      under ZW;
 *   2. EatoutsBridge.groups() — the only source of the Restaurants list — read
 *      the database directly instead of going through the gated all().
 *
 * Covered:
 *   - ZW: EatoutsBridge.all() is exactly the ZW payload, every row region ZW
 *   - ZW: the Restaurants list carries no Botswana-only venue
 *   - ZW: the list is not empty and its venues open About without a bounce
 *   - BW: the same Botswana venues are still listed and About still opens
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const withRegionPayload = require('./_region-payload');
const REGION_KEY = 'eatouts.region.v1';

/* Botswana-only venues: the flagship and the demo roster. None of them exists
   in the ZW payload, so each one listed under ZW is a guaranteed bounce. */
const BW_ONLY = ['the-yellow-giraffe', 'chicken-licken', 'the-game-reserve'];

let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

const source = rel => fs.readFileSync(path.join(APP_DIR, rel.split('/').join(path.sep)), 'utf8');

/** Inline every <script src> the page references (jsdom would not fetch them). */
function inline(html) {
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const file = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(file)) return '<!-- missing ' + src + ' -->';
    return '<script>' + fs.readFileSync(file, 'utf8') + '</script>';
  });
}

/** Boot a page as that region's visitor; collect errors and blocked navigations. */
function boot(page, region, link) {
  const payload = withRegionPayload(inline(source(page)), region);
  const errors = [];
  const bounces = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) { bounces.push(m); return; }
    /* jsdom has no fetch(); the customer-app refresh is the only caller. */
    if (/fetch is not defined/.test(m)) return;
    errors.push('jsdomError: ' + m);
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(payload, {
    url: 'http://localhost/' + page + (link ? '?link=' + encodeURIComponent(link) : ''),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      try { win.localStorage.setItem(REGION_KEY, region); } catch (e) {}
      /* index.html launches as Botswana unless this tab already chose a region. */
      try { win.sessionStorage.setItem('eatouts.region.session', region); } catch (e) {}
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors, bounces };
}

const settle = ms => new Promise(r => setTimeout(r, ms));
const up = v => String(v || '').toUpperCase();

/** The Restaurants list, as index.html builds it. */
function listedKeys(w) {
  return (w.restaurantBaseRows ? w.restaurantBaseRows() : []).map(r => r.slug);
}

/* ===================== Zimbabwe ===================== */
(async function main() {
  const zw = boot('index.html', 'ZW');
  await settle(500);
  const w = zw.w;
  const zwPayload = w.ZIMBABWE_RUNTIME_DATA;
  const zwAll = w.EatoutsBridge.all();
  const zwKeys = listedKeys(w);

  check('ZW: the page boots as Zimbabwe', w.EatoutsRegions.code() === 'ZW', w.EatoutsRegions.code());
  check('ZW: the ZW payload is the one on the page', !!zwPayload && zwPayload.restaurants.length > 500,
    zwPayload && zwPayload.restaurants.length);
  check('ZW: EatoutsBridge.all() is exactly the ZW payload',
    zwAll.length === zwPayload.restaurants.length, zwAll.length + ' vs ' + zwPayload.restaurants.length);
  check('ZW: every bridged venue is a Zimbabwe venue',
    zwAll.every(r => up(r.region) === 'ZW'),
    zwAll.filter(r => up(r.region) !== 'ZW').slice(0, 3).map(r => r.slug + ':' + r.region).join(', '));

  const leaked = BW_ONLY.filter(k => zwKeys.indexOf(k) > -1);
  check('ZW: no Botswana-only venue is on the Restaurants list', leaked.length === 0, leaked.join(', '));
  check('ZW: the list is not empty', zwKeys.length > 500, zwKeys.length);
  check('ZW: the list never outgrows the gated records', zwKeys.length <= zwAll.length,
    zwKeys.length + ' > ' + zwAll.length);
  check('ZW: no runtime errors', zw.errors.length === 0, zw.errors.slice(0, 3).join(' | '));

  const zwTarget = zwKeys[0];
  zw.dom.window.close();

  const zwAbout = boot('venue-about.html', 'ZW', zwTarget);
  await settle(300);
  const zwTitle = String((zwAbout.doc.querySelector('.hero h1') || {}).textContent || '').trim();
  check('ZW: a listed venue opens About instead of bouncing home (' + zwTarget + ')',
    zwAbout.bounces.length === 0, zwAbout.bounces[0]);
  check('ZW: About renders that venue', !!zwTitle && zwAbout.doc.title.indexOf(zwTitle) === 0,
    zwTitle + ' / ' + zwAbout.doc.title);
  check('ZW: About has no runtime errors', zwAbout.errors.length === 0, zwAbout.errors.slice(0, 3).join(' | '));
  zwAbout.dom.window.close();

  /* ===================== Botswana (unchanged) ===================== */
  const bw = boot('index.html', 'BW');
  await settle(500);
  const bwPayload = bw.w.DIRECTORY_RUNTIME_DATA;
  const bwAll = bw.w.EatoutsBridge.all();
  const bwKeys = listedKeys(bw.w);

  check('BW: the page boots as Botswana', bw.w.EatoutsRegions.code() === 'BW', bw.w.EatoutsRegions.code());
  check('BW: EatoutsBridge.all() is exactly the BW payload',
    bwAll.length === bwPayload.restaurants.length, bwAll.length + ' vs ' + bwPayload.restaurants.length);
  check('BW: every bridged venue is a Botswana venue',
    bwAll.every(r => up(r.region) === 'BW'),
    bwAll.filter(r => up(r.region) !== 'BW').slice(0, 3).map(r => r.slug + ':' + r.region).join(', '));
  check('BW: the flagship is still listed', bwKeys.indexOf('the-yellow-giraffe') > -1);
  check('BW: the rest of the demo roster is still listed',
    BW_ONLY.filter(k => bwKeys.indexOf(k) === -1).length === 0,
    BW_ONLY.filter(k => bwKeys.indexOf(k) === -1).join(', '));
  check('BW: no runtime errors', bw.errors.length === 0, bw.errors.slice(0, 3).join(' | '));

  const bwTarget = bwKeys[0];
  bw.dom.window.close();

  const bwAbout = boot('venue-about.html', 'BW', bwTarget);
  await settle(300);
  const bwTitle = String((bwAbout.doc.querySelector('.hero h1') || {}).textContent || '').trim();
  check('BW: a listed venue opens About (' + bwTarget + ')', bwAbout.bounces.length === 0, bwAbout.bounces[0]);
  check('BW: About renders that venue', !!bwTitle && bwAbout.doc.title.indexOf(bwTitle) === 0,
    bwTitle + ' / ' + bwAbout.doc.title);
  bwAbout.dom.window.close();

  /* ===================== the leaks stay closed in source ===================== */
  check('seed rows do not inherit the active region',
    /region:\s*String\(source\.region \|\| 'BW'\)\.toUpperCase\(\)/.test(source('js/eatouts-seed.js')));
  check('the grouped listing reads through the gate',
    /function groups\(\)[\s\S]{0,500}var rows = all\(\);/.test(source('js/eatouts-bridge.js')));

  console.log('');
  if (fails) {
    console.log('REGION ABOUT TEST FAILED (' + fails + ' checks)');
    process.exit(1);
  }
  console.log('REGION ABOUT TEST PASSED');
  process.exit(0);
})();

