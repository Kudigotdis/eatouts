// copy-static.mjs
// Stages the public app files into ./dist for Cloudflare Workers deployment.
// Local-only files (notes, fix scripts, backups) are never copied.

import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const OUT = 'dist';

// ---- FOLDERS to copy (whole directory) ----
const FOLDERS = [
  'js',
  'assets',
];

// ---- SINGLE FILES to copy (root-level) ----
const FILES = [
  // Core JS
  'botswana_locations.js',

  // HTML pages (public)
  'index.html',
  '404.html',
  'seed-demo.html',
  'restaurant-dashboard.html',
  'restaurant-onboarding.html',
  'promo-onboarding.html',
  'menu-onboarding.html',
  'gallery-onboarding.html',
  'event-onboarding.html',
  'one-pager.html',
  'ops-console.html',
  'invoice.html',
  'intake.html',
  'partner-terms.html',
  'get-started.html',
  'pricing.html',

  // Demo data used by the app
  'demo_info_menu-items-food-beverages.json',
  'demo_restaurant_list.json',
  'masa_poetry_nights_artists.json.json',
  'promos&events-demo-info.json',
  'the_yellow_giraffe_menu-master.json.json',
];

// ---- Start fresh ----
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

let copied = 0;
const missing = [];

// ---- Copy folders ----
for (const folder of FOLDERS) {
  if (!existsSync(folder)) {
    missing.push(folder + '/');
    continue;
  }
  await cp(folder, `${OUT}/${folder}`, { recursive: true });
  console.log(`✓ copied folder: ${folder}/`);
  copied++;
}

// ---- Copy files ----
for (const file of FILES) {
  if (!existsSync(file)) {
    missing.push(file);
    continue;
  }
  await cp(file, `${OUT}/${file}`);
  console.log(`✓ copied file:   ${file}`);
  copied++;
}

// ---- Summary ----
console.log('');
console.log(`Done. ${copied} items copied into ./${OUT}/`);

if (missing.length > 0) {
  console.log('');
  console.log('⚠️  Skipped (not found in repo):');
  for (const m of missing) console.log(`   - ${m}`);
  console.log('');
  console.log('If any of the above are real pages you want served, add them to');
  console.log('the FILES or FOLDERS list in copy-static.mjs and re-run.');
}