#!/usr/bin/env node
/**
 * T22 step 3 — region data gating.
 *
 * Proves that the client data layers only ever see the active region:
 *   - the registry exposes the active region's code / currency / locale /
 *     location file, and its gating helpers;
 *   - prices format through the region (symbol() / money()), so a page never
 *     re-implements the currency itself (T22b);
 *   - a record written before gating (no `region`) reads as BW, so no saved
 *     venue disappears;
 *   - EatoutsBridge.all() — the single read path every directory, menu and
 *     promo surface in index.html uses — drops records from other regions;
 *   - EatoutsDB stamps the active region on a new venue;
 *   - EatoutsLocations resolves its dataset through the registry and stays
 *     empty (degrading to "Other / not listed") when the active region's
 *     location file is not Botswana's.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const SCRIPTS = [
  'botswana_locations.js',
  'js/eatouts-locations.js',
  'js/eatouts-db.js',
  'js/eatouts-bridge.js',
  'js/eatouts-regions.js'
];

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const source = rel => fs.readFileSync(path.join(APP_DIR, rel.split('/').join(path.sep)), 'utf8');
const BRIDGE_SRC = source('js/eatouts-bridge.js');
const DB_SRC = source('js/eatouts-db.js');
const LOC_SRC = source('js/eatouts-locations.js');

function boot() {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const body = SCRIPTS.map(rel => '<script>' + source(rel) + '</script>').join('\n');
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>', {
    url: 'http://127.0.0.1/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

/** Re-evaluate a file in the same window (the IIFE rebuilds its indexes). */
function rerun(w, rel) {
  const s = w.document.createElement('script');
  s.textContent = source(rel);
  w.document.body.appendChild(s);
}

const a = boot();
const w = a.w;
const R = w.EatoutsRegions;
const DB = w.EatoutsDB;
const Bridge = w.EatoutsBridge;
const Loc = w.EatoutsLocations;

check('all five scripts boot without errors', a.errors.length === 0, a.errors.join(' | '));
check('the registry and the data layers are present',
  !!(R && DB && Bridge && Loc));

/* ================= registry: active-region settings ================= */
check('the active region is Botswana', R.code() === 'BW', R.code());
check('currency follows the region', R.currency() === 'BWP', R.currency());
check('the currency prints as the pages have always printed it', R.symbol() === 'P', R.symbol());
check('money() formats in the active region', R.money(1250.5) === 'P1250.50', R.money(1250.5));
check('money() never prints NaN', R.money('abc') === 'P0.00' && R.money(null) === 'P0.00',
  R.money('abc') + ' / ' + R.money(null));
check('symbol() takes an explicit code', R.symbol('ZAR') === 'R' && R.symbol('kes') === 'KSh',
  R.symbol('ZAR') + ' / ' + R.symbol('kes'));
check('an unmapped currency prints its own code, not a wrong symbol',
  R.symbol('EUR') === 'EUR', R.symbol('EUR'));
check('locale follows the region', R.locale() === 'en-BW', R.locale());
check('the location file is resolved through the registry',
  R.locationsFile() === 'botswana_locations.js', R.locationsFile());

/* ================= registry: gating helpers ================= */
check('a region-less record reads as the default region', R.recordRegion({ id: 'x' }) === 'BW');
check('a missing record reads as the default region', R.recordRegion(null) === 'BW');
check('a region code is case-insensitive', R.recordRegion({ region: 'bw' }) === 'BW');
check('another region is read as itself', R.recordRegion({ region: 'za' }) === 'ZA');
check('an unknown region falls back to the default', R.recordRegion({ region: 'XX' }) === 'BW');
check('inActiveRegion accepts BW and legacy records',
  R.inActiveRegion({ region: 'BW' }) === true && R.inActiveRegion({}) === true);
check('inActiveRegion rejects another region', R.inActiveRegion({ region: 'ZA' }) === false);
check('filterByRegion keeps BW + legacy records only',
  R.filterByRegion([{ region: 'ZA' }, { region: 'BW' }, {}]).length === 2);
check('filterByRegion never returns a non-array',
  Array.isArray(R.filterByRegion(null)) && R.filterByRegion(undefined).length === 0);
check('BW has its catering / bakery / beverage directories',
  R.hasDirectory('catering') === true && R.hasDirectory('bakery') === true &&
  R.hasDirectory('beverages') === true);
check('an unknown directory stays available', R.hasDirectory('not-a-directory') === true);

/* ================= the DB stamps a new venue ================= */
const db = DB.load();
const alpha = DB.addRestaurant('Alpha Grill', db);
check('a new venue carries the active region', alpha.region === 'BW', alpha.region);
check('existing venues are untouched',
  (DB.listRestaurants(db) || []).every(r => typeof r.region === 'string'));

/* ================= the bridge is the gate ================= */
check('the bridge gates through the registry', /filterByRegion\(list\)/.test(BRIDGE_SRC));

const beta = DB.addRestaurant('Beta Braai', db);
const gamma = DB.addRestaurant('Gamma Tavern', db);
beta.region = 'ZA';          /* pretend a South African venue exists */
delete gamma.region;         /* a venue saved before gating */
alpha.lastActive = 3; beta.lastActive = 2; gamma.lastActive = 1;
DB.save(db);

const seen = Bridge.all();
check('the bridge returns an array', Array.isArray(seen), typeof seen);
check('the other region is filtered out', !seen.some(r => r.name === 'Beta Braai'));
check('a legacy region-less venue survives', seen.some(r => r.name === 'Gamma Tavern'));
check('the active region still loads', seen.some(r => r.name === 'Alpha Grill'));
check('nothing else was dropped', seen.length === 2, seen.length);
check('ordering is preserved', seen[0].name === 'Alpha Grill' && seen[1].name === 'Gamma Tavern',
  seen.map(r => r.name).join(','));

/* ================= locations follow the region ================= */
/* The adapter resolves the file the registry names for the active region on
   every build (never once at load), so gating is a property of the resolution
   itself — and switching region re-indexes without a page reload. */
check('the locations adapter gates through the registry',
  /window\.EatoutsRegions/.test(LOC_SRC) && /locationsFile\(\)/.test(LOC_SRC) &&
  /function dataset\(file\)/.test(LOC_SRC) && /dataset\(file\)/.test(LOC_SRC));
check('Botswana locations load', Loc.stats().loaded === true, Loc.stats().loaded);
check('every Botswana district is indexed', Loc.allDistricts().length === 28, Loc.allDistricts().length);
check('every Botswana town is indexed', Loc.allTowns().length === 486, Loc.allTowns().length);

/* switch to South Africa — every live region is selectable from the UI */
check('ZA can be selected', R.setActiveRegion('ZA') === true);
check('the active code follows', R.code() === 'ZA', R.code());
check('currency follows the new region', R.currency() === 'ZAR', R.currency());
check('money() prints the new region\'s symbol', R.symbol() === 'R' && R.money(12) === 'R12.00',
  R.symbol() + ' / ' + R.money(12));
check('the location file follows the region', R.locationsFile() === 'south_africa_locations.js',
  R.locationsFile());
check('ZA has no catering / bakery / beverage directory yet',
  R.hasDirectory('catering') === false && R.hasDirectory('bakery') === false &&
  R.hasDirectory('beverages') === false);
check('the default stamp follows the active region',
  DB.addRestaurant('Delta Grill', db).region === 'ZA');

rerun(w, 'js/eatouts-locations.js');
check('Botswana towns are not offered for another region', w.EatoutsLocations.stats().loaded === false,
  w.EatoutsLocations.stats().loaded);
check('the town list is empty, not wrong', w.EatoutsLocations.allTowns().length === 0,
  w.EatoutsLocations.allTowns().length);
check('the district list is empty too', w.EatoutsLocations.allDistricts().length === 0);
check('an unknown district resolves with a warning, not a throw',
  (function () {
    const out = w.EatoutsLocations.resolve('05', 'Orapa', '');
    return !!out && out.district === '' && out.warnings.length > 0;
  })());

const zaSeen = Bridge.all();
check('the bridge now serves the other region',
  zaSeen.length === 2 && zaSeen.every(r => r.region === 'ZA') &&
  !zaSeen.some(r => r.name === 'Alpha Grill') && !zaSeen.some(r => r.name === 'Gamma Tavern'),
  zaSeen.map(r => r.name + ':' + r.region).join(','));

['KE', 'MU'].forEach(function (code) {
  check(code + ' can be selected', R.setActiveRegion(code) === true);
  check(code + ' has no catering / bakery / beverage directory yet',
    R.hasDirectory('catering') === false && R.hasDirectory('bakery') === false &&
    R.hasDirectory('beverages') === false);
});

/* the lazy rebuild: a gazetteer that arrives AFTER the adapter loaded is picked
   up by the next call, which is what keeps a page that loads js/eatouts-regions.js
   late (or a region switched in-session) from serving Botswana's towns. */
w.MAURITIUS_LOCATIONS_DATA = {
  districts: [{ name: 'Port Louis', code: 'MU11', towns: [{ name: 'Port Louis', areas: ['Harbour View Flats'] }] }]
};
R.setActiveRegion('MU');
check('the adapter indexes the new region without a reload',
  w.EatoutsLocations.allDistricts().length === 1 && w.EatoutsLocations.allTowns()[0].label === 'Port Louis',
  w.EatoutsLocations.allTowns().map(t => t.label).join(','));
check('and resolves the new region\'s places',
  w.EatoutsLocations.resolve('MU11', 'Port Louis', 'Harbour View Flats').area === 'Harbour View Flats');

/* and back */
check('BW can be restored', R.setActiveRegion('BW') === true);
check('BW directories return with the region',
  R.hasDirectory('catering') === true && R.hasDirectory('bakery') === true &&
  R.hasDirectory('beverages') === true);
rerun(w, 'js/eatouts-locations.js');
check('Botswana towns come back', w.EatoutsLocations.allTowns().length === 486,
  w.EatoutsLocations.allTowns().length);
check('the bridge serves Botswana again', Bridge.all().length === 2);
check('the region is persisted', w.localStorage.getItem(R.STORE_KEY) === 'BW',
  w.localStorage.getItem(R.STORE_KEY));

/* ================= the source no longer hard-codes BW as the only truth = */
check('the DB stamps region on every new venue', /region:/.test(DB_SRC));

const errs = a.errors.filter(e => e.indexOf('Not implemented') === -1);
check('no script errors during the walkthrough', errs.length === 0, errs.join(' | '));

console.log(fails === 0 ? 'REGION-GATING TEST PASSED' : 'REGION-GATING TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);

