#!/usr/bin/env node
/**
 * Page-title guard.
 *
 * Asserts that every surface carries its in-code PAGE marker and that
 * PAGE_INVENTORY.md agrees with the code. Fails when:
 *   - a root *.html lacks <title>, a `<!-- PAGE: ... -->` banner, or
 *     <body ... data-page="...">
 *   - index.html PAGE_TITLES and its `/* PAGE: *​/` banners disagree
 *     (missing/extra/mismatched id or title)
 *   - a page("id", …) call references an unknown id
 *   - renderViewport() no longer writes data-page / data-page-ref onto .screen
 *   - pageRef() or window.eoPage() is missing
 *   - PAGE_INVENTORY.md is missing or lists a marker that no longer exists
 *
 * Line numbers are intentionally NOT asserted (they drift); `npm run inventory`
 * reports those as warnings. Regenerate the doc by hand.
 *
 * Usage:  node tests/inventory.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const DOC = path.join(ROOT, 'PAGE_INVENTORY.md');

let fails = 0;
let checks = 0;

function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else {
    fails++;
    console.log('FAIL ' + label + (extra ? '  -- ' + extra : ''));
  }
}

const htmlFiles = fs
  .readdirSync(ROOT)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort();

const noTitle = [];
const noBanner = [];
const noBody = [];
const standalone = new Map();
for (const file of htmlFiles) {
  const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const title = (src.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  const banner = (src.match(/<!--\s*PAGE:\s*(.*?)\s*-->/) || [])[1];
  const slug = (src.match(/<body[^>]*\bdata-page="([^"]*)"/i) || [])[1];
  standalone.set(file, { title: title && title.trim(), banner: banner && banner.trim(), slug: slug && slug.trim() });
  if (!title) noTitle.push(file);
  if (!banner) noBanner.push(file);
  if (!slug) noBody.push(file);
}

check('root .html files exist', htmlFiles.length > 0, htmlFiles.length + ' files');
check('every root .html has a <title>', noTitle.length === 0, noTitle.join(', '));
check('every root .html has a <!-- PAGE: --> banner', noBanner.length === 0, noBanner.join(', '));
check('every root .html has <body data-page="...">', noBody.length === 0, noBody.join(', '));

const indexSrc = fs.readFileSync(INDEX, 'utf8');

const mapM = indexSrc.match(/const PAGE_TITLES\s*=\s*\{([\s\S]*?)\n\};/);
const titleMap = {};
if (mapM) {
  const re = /"([^"]+)"\s*:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(mapM[1]))) titleMap[m[1]] = m[2];
}
const keys = Object.keys(titleMap);
check('index.html declares PAGE_TITLES', keys.length > 0, keys.length + ' entries');

const banners = new Map();
const bannerRe = /\/\* PAGE:\s*(\S+)\s+—\s+(.*?)\s*\*\//g;
let bm;
while ((bm = bannerRe.exec(indexSrc))) banners.set(bm[1], bm[2]);

const missingBanner = keys.filter((k) => !banners.has(k));
const extraBanner = [...banners.keys()].filter((k) => !(k in titleMap));
const titleMismatch = keys.filter((k) => banners.has(k) && banners.get(k) !== titleMap[k]);

check('every PAGE_TITLES id has a /* PAGE: */ banner', missingBanner.length === 0, missingBanner.join(', '));
check('every /* PAGE: */ banner is in PAGE_TITLES', extraBanner.length === 0, extraBanner.join(', '));
check('banner titles match PAGE_TITLES titles', titleMismatch.length === 0, titleMismatch.join(', '));

const pageIds = new Set();
const pageRe = /\bpage\(\s*"([^"]+)"/g;
let pm;
while ((pm = pageRe.exec(indexSrc))) pageIds.add(pm[1]);
const unknownPage = [...pageIds].filter((id) => !(id in titleMap));
check('every literal page() id is in PAGE_TITLES', unknownPage.length === 0, unknownPage.join(', '));

check('renderViewport() writes data-page onto .screen', /data-page="'\+esc\(pageId\)\+'"/.test(indexSrc));
check('renderViewport() writes data-page-ref onto .screen', /data-page-ref="'\+esc\(pageIns\)\+'"/.test(indexSrc));
check('index.html declares pageRef()', /\bfunction pageRef\s*\(/.test(indexSrc));
check('pageRef() has a default branch', /case[\s\S]*?default:\s*return ""/.test(indexSrc));
check('index.html declares window.eoPage()', /window\.eoPage\s*=\s*function/.test(indexSrc));

check('PAGE_INVENTORY.md exists', fs.existsSync(DOC));
if (fs.existsSync(DOC)) {
  const doc = fs.readFileSync(DOC, 'utf8');
  const docLines = doc.split(/\r?\n/);
  const part1Re = /^\|\s*\d+\s*\|\s*`([^`]+)`\s*\|.*\|\s*`PAGE:\s*(.*?)`\s*\|\s*[\d,]+\s*\|\s*$/;
  const part2Re = /^\|.*\|\s*`PAGE:\s*(\S+)\s+—\s+(.*?)`\s*\|\s*\d+\s*\|\s*$/;

  const badPart1 = [];
  const badPart2 = [];
  let listedStandalone = 0;
  let listedScreens = 0;
  for (const row of docLines) {
    let m = row.match(part1Re);
    if (m) {
      listedStandalone++;
      const rec = standalone.get(m[1]);
      if (!rec) badPart1.push(m[1] + ' (no such file)');
      else if (rec.banner !== m[2]) badPart1.push(m[1] + ' marker mismatch');
      else if (rec.slug !== m[1].replace(/\.html$/i, '')) badPart1.push(m[1] + ' slug ' + rec.slug);
      continue;
    }
    m = row.match(part2Re);
    if (m) {
      listedScreens++;
      if (!banners.has(m[1])) badPart2.push(m[1] + ' (unknown id)');
      else if (banners.get(m[1]) !== m[2]) badPart2.push(m[1] + ' title mismatch');
    }
  }

  check('PAGE_INVENTORY.md lists all root .html files', listedStandalone === htmlFiles.length, listedStandalone + ' vs ' + htmlFiles.length);
  check('PAGE_INVENTORY.md Part 1 markers match code', badPart1.length === 0, badPart1.join(', '));
  check('PAGE_INVENTORY.md lists all SPA screens', listedScreens === banners.size, listedScreens + ' vs ' + banners.size);
  check('PAGE_INVENTORY.md Part 2 markers match code', badPart2.length === 0, badPart2.join(', '));
}

console.log('');
if (fails) {
  console.log(checks + ' checks, ' + fails + ' failed — fix markers or restore PAGE_INVENTORY.md.');
  process.exit(1);
}
console.log('INVENTORY PASSED (' + checks + ' checks, ' + htmlFiles.length + ' pages, ' + banners.size + ' screens).');
