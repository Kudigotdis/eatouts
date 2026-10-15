#!/usr/bin/env node
/**
 * EatOuts RESTAURANTS_WITHOUT_LOGOS.md generator.
 *
 * Loads index.html in jsdom (scripts inlined, exactly like the test
 * harness) and asks the app itself which venues resolve to the
 * placeholder tile instead of a real logo:
 *
 *   usesGenuineLogo(r)  ->  EatoutsBrand.logoFor(r)
 *                        ->  manifest key | record logo | REAL_LOGOS | tile
 *
 * Writes RESTAURANTS_WITHOUT_LOGOS.md. Re-run it after adding logo art
 * so the list reflects reality — it overwrites the doc, including any
 * manual checkboxes.
 *
 * Usage:  npm run missing-logos
 *         node scripts/missing-logos.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DOC = path.join(ROOT, 'RESTAURANTS_WITHOUT_LOGOS.md');
const INDEX = path.join(ROOT, 'index.html');
const DIRECTORY = path.join(ROOT, 'assets', 'data', 'restaurant_listings', 'directory_runtime_data.json');
const LOGO_DIR = path.join(ROOT, 'assets', 'logo');

const require = createRequire(import.meta.url);
function loadJsdom() {
  for (const base of [path.join(ROOT, 'node_modules'), path.join(ROOT, 'tests', 'node_modules')]) {
    try { return require(path.join(base, 'jsdom')); } catch (e) { /* try next */ }
  }
  console.error('jsdom not found — run `npm install` (or install in tests/).');
  process.exit(1);
}

const { JSDOM, VirtualConsole } = loadJsdom();

function loadApp() {
  let html = fs.readFileSync(INDEX, 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const file = path.resolve(ROOT, src.replace(/\//g, path.sep));
    if (!fs.existsSync(file)) return '';
    return '<script>' + fs.readFileSync(file, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', () => {});
  return new JSDOM(html, {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
}

function genuineOf(window, r) {
  const logo = window.EatoutsBrand.logoFor(r);
  return !!logo && !window.EatoutsBrand.isPlaceholderLogo(logo);
}

function townOf(r) {
  const loc = r.location || {};
  return loc.town || loc.districtName || '';
}

function main() {
  const dom = loadApp();
  const window = dom.window;

  setTimeout(() => {
    const rows = window.eval('EatoutsBridge.all()');
    const missing = rows.filter((r) => !genuineOf(window, r));
    const withLogo = rows.length - missing.length;

    const directory = JSON.parse(fs.readFileSync(DIRECTORY, 'utf8'));
    const townBySlug = {};
    directory.restaurants.forEach((r) => {
      townBySlug[r.slug] = r.town || r.districtName || 'Unknown';
    });
    const townOfRow = (r) => townBySlug[r.slug] || townOf(r) || 'Unknown';

    const byTown = {};
    missing.forEach((r) => {
      const town = townOfRow(r);
      (byTown[town] = byTown[town] || []).push(r);
    });

    const nameKey = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const groups = {};
    rows.forEach((r) => {
      (groups[nameKey(r.name)] = groups[nameKey(r.name)] || []).push(r);
    });
    const multiNoLogo = Object.values(groups).filter(
      (g) => g.length > 1 && g.every((r) => !genuineOf(window, r))
    );

    const manifestLogos = (window.EATOUTS_MANIFEST && window.EATOUTS_MANIFEST.logos) || {};
    const used = new Set(Object.values(manifestLogos).map((p) => String(p).split('?')[0]));
    rows.forEach((r) => { if (r.logo) used.add(String(r.logo).split('?')[0]); });
    const skip = new Set(['desktop.ini', 'EatOuts_Badge.png', 'EatOuts_Logo.png', 'logo_placement_image.png', 'riversmeeticon.psd']);
    const orphans = fs.readdirSync(LOGO_DIR).filter((f) => !skip.has(f) && !used.has('assets/logo/' + f));

    const today = new Date().toISOString().slice(0, 10);
    const out = [];
    out.push('# Restaurants without logos');
    out.push('');
    out.push('Generated `' + today + '` by `npm run missing-logos` (`scripts/missing-logos.mjs`).');
    out.push('Re-run that command after adding logo art — it rewrites this file, so any');
    out.push('manual checkboxes below are reset to unticked.');
    out.push('');
    out.push('A venue counts as logo\'d when `EatoutsBrand.logoFor()` resolves to real art');
    out.push('via the manifest (`assets/data/restaurant_listings/eatouts_manifest.js`), a');
    out.push('record `logo` field, or `REAL_LOGOS` in `js/eatouts-brand.js`. Everything');
    out.push('else renders the grey letter tile `assets/logo/logo_placement_image.png`.');
    out.push('');
    out.push('## Summary');
    out.push('');
    out.push('| | |');
    out.push('|---|---|');
    out.push('| Restaurants in the app | ' + rows.length + ' |');
    out.push('| With a real logo | ' + withLogo + ' |');
    out.push('| **Without a logo** | **' + missing.length + '** |');
    out.push('| Towns affected | ' + Object.keys(byTown).length + ' |');
    out.push('| Unused logo art files | ' + orphans.length + ' |');
    out.push('');
    out.push('## How to fix a venue');
    out.push('');
    out.push('1. Drop the art in `assets/logo/` (square, under ~200KB).');
    out.push('2. Add one key to `logos` in `assets/data/restaurant_listings/eatouts_manifest.js`.');
    out.push('   Use the venue slug exactly, or a brand prefix that also covers its branches');
    out.push('   (`milky-lane` covers `milky-lane-francistown` and friends).');
    out.push('3. Re-run `npm run missing-logos` — the venue should disappear from this list.');
    out.push('');

    if (multiNoLogo.length) {
      out.push('## Priority: multi-branch brands with no logo anywhere');
      out.push('');
      multiNoLogo.sort((a, b) => b.length - a.length).forEach((g) => {
        out.push('- **' + g[0].name + '** (' + g.length + ' branches): ' + g.map((r) => '`' + r.slug + '`').join(', '));
      });
      out.push('');
      out.push('Adding one manifest key for the brand name clears every branch at once.');
      out.push('');
    }

    const nearMiss = missing.filter((r) =>
      Object.keys(manifestLogos).some((k) => k.length >= 4 && r.slug.indexOf(k) > -1)
    );
    if (nearMiss.length) {
      out.push('## Near misses (brand key exists, slug does not match)');
      out.push('');
      nearMiss.forEach((r) => {
        const keys = Object.keys(manifestLogos).filter((k) => k.length >= 4 && r.slug.indexOf(k) > -1);
        out.push('- ' + r.name + ' (`' + r.slug + '`) — closest manifest key: ' + keys.map((k) => '`' + k + '`').join(', '));
      });
      out.push('');
    }

    out.push('## Missing by town');
    out.push('');
    Object.keys(byTown).sort((a, b) => byTown[b].length - byTown[a].length || a.localeCompare(b)).forEach((town) => {
      const list = byTown[town].slice().sort((a, b) => a.name.localeCompare(b.name));
      out.push('### ' + town + ' (' + list.length + ')');
      out.push('');
      list.forEach((r) => {
        out.push('- [ ] ' + r.name + ' (`' + r.slug + '`)');
      });
      out.push('');
    });

    if (orphans.length) {
      out.push('## Unused logo art');
      out.push('');
      out.push('Files in `assets/logo/` that no manifest key and no record `logo` field points at:');
      out.push('');
      orphans.forEach((f) => out.push('- `assets/logo/' + f + '`'));
      out.push('');
    }

    out.push('## Related data bugs');
    out.push('');
    out.push('- Seed rows carry a default district code `01` / town `Gaborone`');
    out.push('  (`js/eatouts-seed-data.js`), and `mergeDirectory()` only fills empty location');
    out.push('  fields (`js/eatouts-seed.js`), so venues outside Gaborone display Gaborone in');
    out.push('  the app. Towns in this document come from the directory data instead.');
    out.push('- `logoFor()` is declared twice in `js/eatouts-brand.js` (lines 96 and 210);');
    out.push('  hoisting makes line 210 win, so the earlier `isUsableLogo`-validated version');
    out.push('  is dead code.');
    out.push('');

    fs.writeFileSync(DOC, out.join('\n') + '\n', 'utf8');

    console.log('RESTAURANTS_WITHOUT_LOGOS.md written');
    console.log('  restaurants: ' + rows.length + ' | with logo: ' + withLogo + ' | without: ' + missing.length);
    console.log('  towns: ' + Object.keys(byTown).length + ' | multi-branch gaps: ' + multiNoLogo.length + ' | unused art: ' + orphans.length);
    dom.window.close();
    process.exit(0);
  }, 2500);
}

main();
