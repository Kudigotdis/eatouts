// copy-static.mjs
// Stages the public app files into ./dist for Cloudflare Workers deployment.
// Local-only files (notes, fix scripts, backups) are never copied.

import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
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
  'mobile-kitchen-onboarding.html',
  'bakery-onboarding.html',
  'promo-onboarding.html',
  'menu-onboarding.html',
  'gallery-onboarding.html',
  'event-onboarding.html',
  'eatout_event_builder.html',
  'one-pager.html',
  'ops-console.html',
  'invoice.html',
  'intake.html',
  'partner-terms.html',
  'get-started.html',
  'pricing.html',

  // Content + marketing pages
  'eatouts-blog.html',
  'eatouts-suppliers.html',
  'eatouts-about.html',

  // Standalone customer surfaces reached from index.html
  'venue-about.html',
  'about-guest-popup.html',
  'about-profile-options.html',

  // Delivery interfaces
  'customer-delivery.html',
  'driver-delivery.html',
  'restaurant-delivery.html',

  // Feedback page
  'eatouts_feedback.html',

  // Design marketplace (reached from index.html About -> Settings -> Need Design)
  'designer-services.html',
  'designer-dashboard.html',
  'brand-kit-admin.html',

  // Auth / onboarding
  'eatouts-login.html',
  'eatouts-customer-signup.html',
  'eatouts_user_onboarding.html',
  'eatouts-business-signup.html',
  'bottle-store-onboarding.html',
  'caterer-onboarding.html',
  'lodge-onboarding.html',
  'supplier-onboarding.html',

  // Business manager
  'staff-manager.html',
  'delivery-manager.html',
  'order-manager.html',
  'reservation-manager.html',
  'room-manager.html',
  'billing-manager.html',
  'analytics-manager.html',
  'quote-manager.html',
  'booking-manager.html',

  // Spec workspaces (business / staff / food truck)
  'operator-dashboard1.html',
  'eatouts-staff-admin1.html',
  'food-truck-schedule1.html',

  // Platform admin
  'eatouts-admin-dashboard.html',
  'eatouts-users-manager.html',
  'feedback-manager.html',
  'blog-creator-dashboard.html',
  'eatouts-verification-queue.html',
  'eatouts-disputes.html',
  'eatouts-platform-analytics.html',
  'eatouts-notifications.html',
  'eatouts-settings.html',

  // Customer account
  'eatouts-favourites.html',
  'eatouts-orders.html',
  'eatouts-profile.html',
  'eatouts-addresses.html',
  'eatouts-summaries.html',
  'eatouts-events.html',
  'eatouts-gallery.html',
  'eatouts-checkout-summary.html',

  // Cloudflare Pages config
  '_headers',
  '_redirects',

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

// ---- _routes.json -----------------------------------------------------------
// functions/[slug].js is a catch-all for /<slug>, so it shadows every static
// page (and the _redirects rules, which only run when no Function matches).
// The Function itself now falls through via context.next() when the path is a
// real asset; these excludes keep static/asset traffic off the Function
// entirely (and keep the file within the 100-rule cap).
const staticExcludes = [
  '/assets/*', '/js/*', '/css/*', '/img/*',
  '/*.html', '/_headers', '/_redirects', '/_routes.json',
  '/robots.txt', '/manifest.json', '/favicon.ico',
];

const routes = {
  version: 1,
  include: ['/*'],
  exclude: staticExcludes,
};
await writeFile(`${OUT}/_routes.json`, JSON.stringify(routes, null, 2) + '\n');
console.log(`✓ generated:    _routes.json (${routes.exclude.length} excludes)`);
copied++;

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