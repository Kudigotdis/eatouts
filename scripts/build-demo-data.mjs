#!/usr/bin/env node
/**
 * EatOuts demo-data bundler.
 *
 * Concatenates the individual per-domain data files in
 * assets/data/demo/the-food-place/ into a single loadable bundle
 * (assets/data/demo/the-food-place/demo-data.js) which defines the global
 * window.EATOUTS_DEMO. The bundle is consumed by js/eatouts-manager-seed.js,
 * which merges the records into EatoutsMgrDB.
 *
 * Usage:  npm run demo-data
 *         node scripts/build-demo-data.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'assets', 'data', 'demo', 'the-food-place');
const OUT = path.join(DIR, 'demo-data.js');

const FILES = [
  'business.js',
  'users.js',
  'settings.js',
  'staff.js',
  'orders.js',
  'deliveries.js',
  'reservations.js',
  'reviews.js',
  'invoices.js',
  'feedback.js',
  'menu.js',
  'beverages.js',
  'promos.js',
  'events.js',
  'gallery.js',
  'verification.js',
  'disputes.js',
  'notifications.js',
  'customer-orders.js',
  'favourites.js',
  'addresses.js'
];

for (const f of FILES) {
  if (!fs.existsSync(path.join(DIR, f))) {
    console.error('build-demo-data: missing source file ' + f);
    process.exit(1);
  }
}

const today = new Date().toISOString().slice(0, 10);
const header = [
  '/* The Food Place — generated demo-data bundle. DO NOT EDIT DIRECTLY.',
  '   Source: assets/data/demo/the-food-place/*.js',
  '   Rebuild: npm run demo-data',
  '   Generated: ' + today + ' */',
  'window.EATOUTS_DEMO = window.EATOUTS_DEMO || {};',
  ''
].join('\n');

const parts = [header];
for (const f of FILES) {
  const body = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\s+$/, '');
  parts.push('/* ---- ' + f + ' ---- */');
  parts.push(body);
  parts.push('');
}

fs.writeFileSync(OUT, parts.join('\n'), 'utf8');
console.log('Wrote ' + path.relative(ROOT, OUT) + ' (' + FILES.length + ' sources).');
