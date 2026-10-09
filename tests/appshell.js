#!/usr/bin/env node
/**
 * App-shell parity audit for the 20 root HTML files.
 *
 * Verifies that every page now matches the index.html shell standard:
 *   - zero brand-gold tokens (--gold | c9a84c | b59437 | 201,168,76)
 *   - a 460px #shell wrapper (blog excepted — it owns its layout)
 *   - logo header linking to index.html#promos
 *   - bottom navigation to the index tabs (promos/restaurants/reserve/gallery/about)
 *   - merchant admin pages keep their own .tabs (no extra bottom nav)
 *
 * Static text analysis on purpose: none of the pages' scripts are executed.
 *
 * Usage:  node tests/appshell.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');
const GOLD = new RegExp('--gold|c9a84c|b59437|201,168,76', 'gi');
const TABS = ['promos', 'restaurants', 'reserve', 'gallery', 'about'];

// per-file expectations
const MODES = {
  'index.html': 'index',
  'eatout_event_builder.html': 'tool',
  'eatouts-event-planner.html': 'opinion',
  'eatouts-suppliers.html': 'opinion',
  'eatouts-blog.html': 'blog',
  'restaurant-onboarding.html': 'merchant',
  'menu-onboarding.html': 'merchant',
  'promo-onboarding.html': 'merchant',
  'event-onboarding.html': 'merchant',
  'gallery-onboarding.html': 'merchant',
  'restaurant-dashboard.html': 'merchant',
  'intake.html': 'merchant',
  'invoice.html': 'merchant',
  'ops-console.html': 'merchant',
  'get-started.html': 'static',
  'pricing.html': 'static',
  'partner-terms.html': 'static',
  'seed-demo.html': 'static',
  'one-pager.html': 'static',
  '404.html': 'static'
};

const indexTabs = (s) => new Set(Array.from(s.matchAll(/href="index\.html#([a-z]+)"/g), (m) => m[1]));
const missingTabs = (set) => TABS.filter((t) => !set.has(t));

let fails = 0;
const check = (label, cond, notes) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (notes ? ' :: ' + notes : '')); }
  else console.log('ok    ' + label);
};

for (const file of Object.keys(MODES)) {
  const mode = MODES[file];
  const p = path.join(APP_DIR, file);
  if (!fs.existsSync(p)) { check(file + ' exists', false); continue; }
  const s = fs.readFileSync(p, 'utf8');

  const gold = (s.match(GOLD) || []).length;
  check(file + ' has zero gold tokens', gold === 0, 'got ' + gold);

  if (mode === 'index') {
    check(file + ' has homeTap branch', s.includes('homeTap'));
    check(file + ' has #shell', s.includes('id="shell"'));
    check(file + ' references the logo', s.includes('assets/logo/EatOuts_Logo.png'));
    continue;
  }

  const hasShell = s.includes('<div id="shell">');
  if (mode !== 'blog') check(file + ' has a #shell wrapper', hasShell);

  const logoAnchor = /<a[^>]*class="brand(?:-mark)?"[^>]*href="index\.html#promos"/.test(s);
  check(file + ' logo header links to index.html#promos', logoAnchor);

  if (mode === 'blog') {
    check(file + ' has bottom navigation', /class="bottom-nav"/.test(s));
    const missing = missingTabs(indexTabs(s));
    check(file + ' nav links every index tab', missing.length === 0, 'missing ' + missing.join(','));
    continue;
  }

  if (mode === 'opinion') {
    const missing = missingTabs(indexTabs(s));
    check(file + ' nav links every index tab', missing.length === 0, 'missing ' + missing.join(','));
    continue;
  }

  if (mode === 'tool') {
    check(file + ' links to index.html#promos', /index\.html#promos/.test(s));
    continue;
  }

  if (mode === 'merchant') {
    check(file + ' keeps its own tabs', /class="tabs"/.test(s));
    check(file + ' has a hdr-chip page label', /class="hdr-chip"/.test(s));
    check(file + ' does not add an appnav', !/class="appnav"/.test(s));
    continue;
  }

  // static
  check(file + ' has appnav bottom nav', /class="appnav"/.test(s));
  const navBlock = (s.match(/<nav class="appnav">[\s\S]*?<\/nav>/) || [''])[0];
  const missing = missingTabs(indexTabs(navBlock));
  check(file + ' appnav links every index tab', missing.length === 0, 'missing ' + missing.join(','));
  check(file + ' has one class="on" tab', /class="appnav"[^]*class="on"/.test(s));
}

console.log('\n' + (fails === 0 ? 'APPSHELL PASSED' : 'APPSHELL FAILED (' + fails + ')'));
process.exit(fails ? 1 : 0);