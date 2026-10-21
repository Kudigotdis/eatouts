#!/usr/bin/env node
/**
 * EatOuts test runner.
 *
 * Runs each suite file in its own Node process so one suite's failure
 * or hang never affects the next. Suites that do not exist are skipped.
 *
 * CommonJS on purpose — the root package.json declares "type":"module",
 * so tests/package.json pins this directory to CommonJS.
 *
 * Usage:  node tests/run-all.js
 *         npm test
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SUITES = [
  'smoke.js',
  'checks.js',
  'gallery.js',
  'restloc.js',
  'popups.js',
  'about.js',
  'venue-about-menu.js',
  'venue-about-options.js',
  'blog.js',
  'dashboard.js',
  'wa.js',
  'intake8.js',
  'contracts.js',
  'upload.js',
  'beverages.js',
  'bottle-stores.js',
  'demo-seed.js',
  'delivery.js',
  'checkout-delivery.js',
  'promocats.js',
  'builder-suppliers.js',
  'builder-preview.js',
  'builder-guests.js',
  'builder-schedule.js',
  'builder-audience.js',
  'appshell.js',
  'html-catalog.js',
  'field.js',
  'designer-services.js',
  'designer-dashboard.js',
  'brand-kit-admin.js',
  'api-auth.js',
  'api-auth-flow.js',
  'api-business.js',
  'api-venues.js',
  'api-upload.js',
  'promo-submissions.js',
  'router.js',
  'menuview.js',
  'menu-nav-state.js',
  'customer.js',
  'customer-local-login.js',
  'business-client.js',
  'business-auth.js',
  'content.js',
  'inventory.js',
  'venue-slug.js',
  'venue-slug-integration.js',
  'catering-directory.js',
  'bakery-directory.js',
  'business-profiles.js',
  'business-promos.js'
];

function pad(n, width) {
  var s = String(n);
  while (s.length < width) s = ' ' + s;
  return s;
}

function divider(label) {
  console.log('');
  console.log('=== ' + label + ' ===');
}

let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

for (const name of SUITES) {
  const file = path.resolve(__dirname, name);
  divider(name);

  if (!fs.existsSync(file)) {
    console.log('skip ' + name + ' (not found)');
    skipped++;
    continue;
  }

  const result = spawnSync(process.execPath, [file], { stdio: 'inherit' });

  if (result.error) {
    console.log('FAIL ' + name + ' — ' + result.error.message);
    failed++;
    failures.push(name);
    continue;
  }

  const code = typeof result.status === 'number' ? result.status : 1;
  if (code === 0) {
    console.log('ok   ' + name);
    passed++;
  } else {
    console.log('FAIL ' + name + ' (exit ' + code + ')');
    failed++;
    failures.push(name);
  }
}

console.log('');
console.log('--------------------------------------------');
if (failures.length) {
  console.log('Failing suites:');
  for (const f of failures) console.log('  - ' + f);
}
console.log(pad(passed, 2) + ' passed, ' + failed + ' failed' +
  (skipped ? ', ' + skipped + ' skipped' : ''));
console.log('--------------------------------------------');

process.exit(failed ? 1 : 0);