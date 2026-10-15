#!/usr/bin/env node
/**
 * EatOuts PAGE_INVENTORY.md validator (read-only).
 *
 * Checks that every surface in the app carries its in-code PAGE marker and
 * that PAGE_INVENTORY.md agrees with the code. It NEVER rewrites the doc —
 * edit PAGE_INVENTORY.md and the source by hand; this script only reports.
 *
 * Checks (fail):
 *   - a root *.html lacks <title>, a `<!-- PAGE: ... -->` banner, or
 *     `<body ... data-page="...">`
 *   - a `/* PAGE: id — title *​/` banner in index.html is missing from
 *     PAGE_TITLES (or vice versa), has a mismatched title, or a page("id", …)
 *     call references an unknown id
 *   - index.html has no `.screen` data-page wiring
 *
 * Warnings (do not fail):
 *   - a line number listed in PAGE_INVENTORY.md looks stale
 *
 * Usage:  npm run inventory
 *         node scripts/update-inventory.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const DOC = path.join(ROOT, 'PAGE_INVENTORY.md');

let fails = 0;
let warnings = 0;
let checks = 0;

function ok(label) { checks++; console.log('ok   ' + label); }
function fail(label, extra) { checks++; fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
function warn(label, extra) { warnings++; console.log('warn ' + label + (extra ? '  -- ' + extra : '')); }

function lines(src) { return src.split(/\r?\n/).length; }

// ---------- standalone pages ----------

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort();

const standalone = new Map();
for (const file of htmlFiles) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const rec = { file, src, lines: lines(src) };
  const titleM = src.match(/<title>([\s\S]*?)<\/title>/i);
  const bannerM = src.match(/<!--\s*PAGE:\s*(.*?)\s*-->/);
  const bodyM = src.match(/<body[^>]*\bdata-page="([^"]*)"/i);
  rec.title = titleM ? titleM[1].trim() : null;
  rec.banner = bannerM ? bannerM[1].trim() : null;
  rec.slug = bodyM ? bodyM[1].trim() : null;
  standalone.set(file, rec);

  const missing = [];
  if (!rec.title) missing.push('title');
  if (!rec.banner) missing.push('<!-- PAGE: -->');
  if (!rec.slug) missing.push('body data-page');
  if (missing.length) fail(file + ': missing ' + missing.join(', '));
}
ok(standalone.size + ' root .html files carry title + PAGE banner + body data-page');

// ---------- index.html SPA markers ----------

const indexSrc = fs.readFileSync(INDEX, 'utf8');
const indexLineCount = lines(indexSrc);

const titleMap = {};
const mapM = indexSrc.match(/const PAGE_TITLES\s*=\s*\{([\s\S]*?)\n\};/);
if (!mapM) {
  fail('index.html: PAGE_TITLES map not found');
} else {
  const pairRe = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let pm;
  while ((pm = pairRe.exec(mapM[1]))) titleMap[pm[1]] = pm[2];
}
ok('PAGE_TITLES declared with ' + Object.keys(titleMap).length + ' entries');

const banners = new Map(); // id -> { title, line }
const bannerRe = /\/\* PAGE:\s*(\S+)\s+—\s+(.*?)\s*\*\//g;
let bm;
while ((bm = bannerRe.exec(indexSrc))) {
  banners.set(bm[1], { title: bm[2], line: indexSrc.slice(0, bm.index).split(/\r?\n/).length });
}

const pageIds = new Set();
const pageRe = /\bpage\(\s*"([^"]+)"/g;
let pm2;
while ((pm2 = pageRe.exec(indexSrc))) pageIds.add(pm2[1]);

const keys = Object.keys(titleMap);
const missingBanner = keys.filter((k) => !banners.has(k));
const extraBanner = [...banners.keys()].filter((k) => !(k in titleMap));
const titleMismatch = keys
  .filter((k) => banners.has(k) && banners.get(k).title !== titleMap[k])
  .map((k) => k + ' (banner "' + banners.get(k).title + '" vs map "' + titleMap[k] + '")');
const unknownPage = [...pageIds].filter((id) => !(id in titleMap));

if (missingBanner.length) fail('PAGE_TITLES ids without a PAGE banner', missingBanner.join(', '));
else ok('every PAGE_TITLES id has a /* PAGE: */ banner');
if (extraBanner.length) fail('PAGE banners not in PAGE_TITLES', extraBanner.join(', '));
else ok('every PAGE banner is in PAGE_TITLES');
if (titleMismatch.length) fail('PAGE banner title != PAGE_TITLES title', titleMismatch.join(', '));
else ok('banner titles match PAGE_TITLES');
if (unknownPage.length) fail('page() ids not in PAGE_TITLES', unknownPage.join(', '));
else ok('every page() id is in PAGE_TITLES');

const screenWired = /data-page="'\+esc\(pageId\)\+'"/.test(indexSrc);
if (screenWired) ok('renderViewport() writes data-page onto .screen');
else fail('renderViewport() is missing the .screen data-page wiring');

// ---------- cross-check PAGE_INVENTORY.md (warnings) ----------

if (!fs.existsSync(DOC)) {
  warn('PAGE_INVENTORY.md not found — cannot cross-check line drift');
} else {
  const doc = fs.readFileSync(DOC, 'utf8');
  const docLines = doc.split(/\r?\n/);

  // Part 1 rows: | n | `file` | ... | `PAGE: title` | lines |
  const part1Re = /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|.*\|\s*`PAGE:\s*(.*?)`\s*\|\s*([\d,]+)\s*\|\s*$/;
  // Part 2 rows: | ... | `PAGE: id — title` | line |
  const part2Re = /^\|.*\|\s*`PAGE:\s*(\S+)\s+—\s+(.*?)`\s*\|\s*(\d+)\s*\|\s*$/;

  let drift = 0;
  for (const row of docLines) {
    let m = row.match(part1Re);
    if (m) {
      const rec = standalone.get(m[1]);
      if (!rec) { warn('doc lists unknown file', m[1]); continue; }
      if (rec.banner !== m[2]) warn('doc marker for ' + m[1] + ' is stale', '"' + m[2] + '" vs "' + rec.banner + '"');
      if (Number(m[3].replace(/,/g, '')) !== rec.lines) { warn('doc ~Lines for ' + m[1] + ' is stale', m[3] + ' vs ' + rec.lines); drift++; }
      continue;
    }
    m = row.match(part2Re);
    if (m) {
      const b = banners.get(m[1]);
      if (!b) { warn('doc lists unknown screen id', m[1]); continue; }
      if (b.title !== m[2]) warn('doc marker for ' + m[1] + ' is stale', '"' + m[2] + '" vs "' + b.title + '"');
      if (Number(m[3]) !== b.line) { warn('doc line for ' + m[1] + ' is stale', m[3] + ' vs ' + b.line); drift++; }
    }
  }
  if (!drift) ok('PAGE_INVENTORY.md line numbers are current');
  else warn('PAGE_INVENTORY.md has ' + drift + ' stale line number(s) (markers are the stable anchors)');
}

// ---------- summary ----------

console.log('');
console.log('index.html: ' + indexLineCount + ' lines, ' + banners.size + ' screen banners, ' + keys.length + ' titled screens.');
console.log('standalone: ' + standalone.size + ' files.');
if (fails) {
  console.log('INVENTORY FAILED: ' + checks + ' checks, ' + fails + ' failed, ' + warnings + ' warnings.');
  process.exit(1);
}
console.log('INVENTORY PASSED (' + checks + ' checks, ' + warnings + ' warnings).');
