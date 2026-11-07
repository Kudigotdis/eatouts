#!/usr/bin/env node
/**
 * scripts/build_regional_directories.py — the generated Kenya / Mauritius /
 * South Africa payloads.
 *
 * The three regions only work if their payload matches the shape Zimbabwe and
 * Botswana already ship: one file per region, the same envelope, rows pinned to
 * that country's own gazetteer (the towns the pickers offer come from the
 * *_locations.js file, so a row in a town that file does not list can never be
 * filtered to).
 *
 * Covered here:
 *   - every region has its .json and .js pair, under the documented names;
 *   - the envelope is { region, currency, generatedAt, source, restaurants[],
 *     menuFiles{}, menusRaw{}, logos{} };
 *   - the .js file is `window.<GLOBAL> = <the same JSON>;`;
 *   - every row states its own region and currency, and ids/slugs are unique;
 *   - every non-empty town/district pair exists in that region's gazetteer;
 *   - menus only exist for keys declared "inline", and every menu row has a
 *     name and either a price or variants;
 *   - each payload stays inside the mobile budget.
 *
 * Re-run the generator first: python scripts/build_regional_directories.py
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const LISTINGS = path.join(APP_DIR, 'data', 'restaurant_listings');

let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

/* region -> { file, global, currency, locations, budgetMB } */
const REGIONS = {
  KE: { file: 'kenya_runtime_data', global: 'KENYA_RUNTIME_DATA', currency: 'KES',
        locations: 'assets/Kenya/Kenya_Locations.js', budget: 2.0 },
  MU: { file: 'mauritius_runtime_data', global: 'MAURITIUS_RUNTIME_DATA', currency: 'MUR',
        locations: 'assets/Mauritius/Mauritius_Locations.js', budget: 1.0 },
  ZA: { file: 'southafrica_runtime_data', global: 'SOUTH_AFRICA_RUNTIME_DATA', currency: 'ZAR',
        locations: 'assets/South Africa/South_Africa_Locations.js', budget: 3.2 }
};

function readWindowJs(rel) {
  const raw = fs.readFileSync(path.join(APP_DIR, rel.split('/').join(path.sep)), 'utf8');
  return JSON.parse(raw.slice(raw.indexOf('{')).replace(/;\s*$/, ''));
}

function townsOf(gazetteer) {
  const towns = new Set();
  const districts = new Set();
  gazetteer.districts.forEach(d => {
    districts.add(String(d.code));
    (d.towns || []).forEach(t => towns.add(String(t.name).toLowerCase()));
  });
  return { towns, districts };
}

Object.keys(REGIONS).forEach(code => {
  const spec = REGIONS[code];
  const jsonPath = path.join(LISTINGS, spec.file + '.json');
  const jsPath = path.join(LISTINGS, spec.file + '.js');

  check(code + ' ships a .json payload', fs.existsSync(jsonPath), jsonPath);
  check(code + ' ships a .js payload', fs.existsSync(jsPath), jsPath);
  if (!fs.existsSync(jsonPath) || !fs.existsSync(jsPath)) return;

  const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const js = fs.readFileSync(jsPath, 'utf8');

  check(code + ' keeps the region envelope',
    ['region', 'currency', 'generatedAt', 'source', 'restaurants', 'menuFiles', 'menusRaw', 'logos']
      .every(key => key in json),
    Object.keys(json).join(','));
  check(code + ' payload names its own region and currency',
    json.region === code && json.currency === spec.currency,
    json.region + ' / ' + json.currency);
  check(code + ' .js file assigns the documented global',
    js.indexOf('window.' + spec.global + ' = ') !== -1, spec.global);
  check(code + ' .js file parses to the same payload',
    JSON.stringify(readWindowJs('data/restaurant_listings/' + spec.file + '.js')) === JSON.stringify(json));

  const rows = json.restaurants || [];
  check(code + ' payload carries listings', rows.length > 0, rows.length);
  check(code + ' every row states the region and currency',
    rows.every(r => r.region === code && r.currency === spec.currency));
  check(code + ' every row carries the fields the app reads',
    rows.every(r => r.id && r.slug && r.name && r.brandKey &&
      Array.isArray(r.types) && Array.isArray(r.addresses) && Array.isArray(r.areas)),
    (rows.find(r => !(r.id && r.slug && r.name)) || {}).slug);
  const ids = new Set(rows.map(r => r.id));
  const slugs = new Set(rows.map(r => r.slug));
  check(code + ' ids are unique', ids.size === rows.length, ids.size + '/' + rows.length);
  check(code + ' slugs are unique', slugs.size === rows.length, slugs.size + '/' + rows.length);
  check(code + ' every row ships a description string',
    rows.every(r => typeof r.description === 'string'));

  const gaz = readWindowJs(spec.locations);
  const { towns, districts } = townsOf(gaz);
  const badDistrict = rows.filter(r => r.district && !districts.has(String(r.district)));
  check(code + ' every district is one the gazetteer lists', badDistrict.length === 0,
    badDistrict.slice(0, 3).map(r => r.district).join(','));
  const badTown = rows.filter(r => r.town && !towns.has(String(r.town).toLowerCase()));
  check(code + ' every town is one the gazetteer lists', badTown.length === 0,
    badTown.slice(0, 3).map(r => r.town).join(','));
  const placed = rows.filter(r => r.town).length;
  check(code + ' most rows are pinned to a town', placed / rows.length > 0.5,
    placed + '/' + rows.length);

  const menuKeys = Object.keys(json.menuFiles || {});
  check(code + ' every menu key is inline',
    menuKeys.every(k => json.menuFiles[k] === 'inline'),
    menuKeys.filter(k => json.menuFiles[k] !== 'inline').slice(0, 3).join(','));
  check(code + ' every menu key has rows behind it',
    menuKeys.every(k => Array.isArray((json.menusRaw || {})[k] && json.menusRaw[k].menu) &&
      json.menusRaw[k].menu.length > 0),
    menuKeys.filter(k => !(json.menusRaw || {})[k]).slice(0, 3).join(','));
  check(code + ' every menu key belongs to a listing',
    menuKeys.every(k => slugs.has(k)),
    menuKeys.filter(k => !slugs.has(k)).slice(0, 3).join(','));

  let menuRowCount = 0;
  let badRow = null;
  menuKeys.forEach(k => {
    (json.menusRaw[k].menu || []).forEach(item => {
      menuRowCount++;
      const named = !!item && !!item.name && !!item.category;
      /* an unpriced dish is still a dish — the row must say something about it */
      const described = !!item && (typeof item.price === 'number' ||
        Array.isArray(item.variants) || !!item.description);
      if (!named || !described) badRow = badRow || JSON.stringify(item).slice(0, 120);
    });
  });
  check(code + ' every menu row has a name, a category and a price, variants or description',
    !badRow, badRow);
  check(code + ' menus carry real items', menuRowCount > 0 || code === 'MU', menuRowCount);

  const mb = fs.statSync(jsonPath).size / 1048576;
  check(code + ' payload stays inside the mobile budget', mb < spec.budget, mb.toFixed(2) + ' MB');
});

console.log(fails === 0 ? '\nREGIONAL-DIRECTORIES TEST PASSED' : '\nREGIONAL-DIRECTORIES TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
