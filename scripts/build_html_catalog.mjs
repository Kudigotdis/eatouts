#!/usr/bin/env node
/**
 * EatOuts HTML catalog generator.
 *
 * Merges the hand-authored metadata in scripts/html_catalog.meta.json with a
 * live scan of the root *.html files and writes HTML_CATALOG.md.
 *
 * The volatile columns (size, store keys, shell/auth/esc/pager/confirm/audit
 * markers, alert count, script/style dependencies) are computed here so they can
 * never drift. Human fields (purpose, audience, entry, interactions, status)
 * live in the meta file only.
 *
 * Fails (exit 1) if a root .html has no meta entry, or a meta entry has no file,
 * so the catalog cannot silently go stale.
 *
 * Usage:  npm run catalog
 *         node scripts/build_html_catalog.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const META_PATH = path.join(__dirname, 'html_catalog.meta.json');
const OUT_PATH = path.join(ROOT, 'HTML_CATALOG.md');

function fail(msg) {
  console.error('build_html_catalog: ' + msg);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf8'));
const pages = meta.pages || [];
const groups = meta.groups || [];
const groupLabel = new Map(groups.map((g) => [g.key, g.label]));

// --- scan -------------------------------------------------------------------
const filesOnDisk = fs
  .readdirSync(ROOT)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort((a, b) => a.localeCompare(b));

const metaFiles = new Set(pages.map((p) => p.file));

// parity
const missingMeta = filesOnDisk.filter((f) => !metaFiles.has(f));
const missingFile = pages.map((p) => p.file).filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (missingMeta.length) fail('root page not in meta: ' + missingMeta.join(', '));
if (missingFile.length) fail('meta entry has no file: ' + missingFile.join(', '));

// id sanity
const ids = pages.map((p) => p.id).sort((a, b) => a - b);
for (let i = 0; i < ids.length; i++) {
  if (ids[i] !== i + 1) fail('page ids must be unique and contiguous from 1 (got ' + ids.join(',') + ')');
}

function scan(file) {
  const buf = fs.readFileSync(path.join(ROOT, file));
  const src = buf.toString('utf8');
  const bytes = buf.length;
  const lines = src.split(/\r?\n/).length;

  const keySet = new Set();
  let m;
  const accRe = /(?:localStorage|sessionStorage)\s*\.\s*(?:get|set|remove)Item\s*\(\s*["']([^"']+)["']/gi;
  while ((m = accRe.exec(src))) keySet.add(m[1]);
  const verRe = /["'](eatouts_[a-z0-9_]*_v\d+[a-z0-9_]*)["']/gi;
  while ((m = verRe.exec(src))) keySet.add(m[1]);
  const keys = Array.from(keySet).sort();

  const deps = [];
  const scriptRe = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi;
  while ((m = scriptRe.exec(src))) deps.push(m[1]);
  const linkRe = /<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*\bhref\s*=\s*["']([^"']+)["']/gi;
  while ((m = linkRe.exec(src))) deps.push(m[1]);

  const alerts = (src.match(/\balert\s*\(/g) || []).length;

  return {
    file,
    bytes,
    kb: Math.round(bytes / 1024),
    lines,
    keys,
    mgr: /\bEatoutsMgrDB\b/.test(src),
    dbf: /\bEatoutsDB\b/.test(src),
    deps: Array.from(new Set(deps)),
    alerts,
    shell: /\bEO\.shell\b/.test(src),
    auth: /requireSession|EO\.guard/.test(src),
    esc: /\bEO\.esc\b/.test(src),
    pager: /\bEO\.pager\b/.test(src),
    confirm: /\bEO\.confirm\b|confirmAction/.test(src),
    audit: /EatoutsAudit/.test(src)
  };
}

const scans = new Map();
let totalBytes = 0;
let totalLines = 0;
for (const file of filesOnDisk) {
  const s = scan(file);
  scans.set(file, s);
  totalBytes += s.bytes;
  totalLines += s.lines;
}

// --- helpers ----------------------------------------------------------------
const cell = (v) => String(v == null ? '' : v).replace(/\r?\n/g, ' ').replace(/\|/g, '\\|');
const marker = (b) => (b ? 'yes' : '-');
const sizeFmt = (s) => s.kb + ' KB / ' + s.lines + ' lines';
const today = new Date().toISOString().slice(0, 10);

function storeStr(s) {
  const parts = s.keys.map((k) => '`' + k + '`');
  if (s.mgr) parts.push('`EatoutsMgrDB`→`eatouts_manager_v1`');
  else if (s.dbf) parts.push('`EatoutsDB`→`eatouts_db_v2`');
  return parts.length ? parts.join(' ') : '—';
}

function groupOf(p) {
  return groupLabel.get(p.group) || p.group;
}

// --- build ------------------------------------------------------------------
const out = [];
const w = (line = '') => out.push(line);

w('# EatOuts — HTML Catalog');
w();
w('> **Auto-generated — do not edit by hand.** Edit `scripts/html_catalog.meta.json`,');
w('> then run `npm run catalog` (regenerates this file) and `npm test` (guards parity).');
w('>');
w('> Generated: ' + today + ' · Source scan of the project-root `*.html` files.');
w();
w('The numbered, always-current index of every page in the project root: what it is');
w('for, who uses it, how you reach and operate it, and where it stores data. It is');
w('the reference layer; `HTML_ASSESSMENT.md` remains the per-page status/gaps ledger');
w('and `HTML_PAGES.md` the longer capability narrative.');
w();
w('## How to update this file');
w();
w('1. Add / rename / remove a page, or change a page.');
w('2. Edit `scripts/html_catalog.meta.json` — add or update the `pages[]` entry');
w('   (keep the existing `id`; new pages take the next free id), and append a');
w('   dated `changelog[]` entry. Purpose / audience / entry / interactions are the');
w('   human fields; size, store keys, markers and dependencies are computed.');
w('3. Run `npm run catalog` to regenerate `HTML_CATALOG.md`.');
w('4. Run `npm test` — `tests/html-catalog.js` fails if any root `.html` is not');
w('   catalogued (or vice versa), so this file cannot silently drift.');
w();
w('## 1. Summary');
w();
w('| Group | Pages | Size | Lines |');
w('|-------|-------|------|-------|');
for (const g of groups) {
  const rows = pages.filter((p) => p.group === g.key);
  if (!rows.length) continue;
  let kb = 0;
  let ln = 0;
  for (const p of rows) {
    kb += scans.get(p.file).kb;
    ln += scans.get(p.file).lines;
  }
  w('| ' + cell(g.label) + ' | ' + rows.length + ' | ' + kb + ' KB | ' + ln + ' |');
}
w('| **Total** | **' + filesOnDisk.length + '** | **' + Math.round(totalBytes / 1024) + ' KB** | **' + totalLines + '** |');
w();
const byStatus = {};
for (const p of pages) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
w('Status: ' + Object.entries(byStatus).map(([k, v]) => v + ' ' + k).join(' · ') + '.');
w();
w('> Run the app through **`run-eatouts.bat`** (serves the root over `http://127.0.0.1`).');
w('> Opening a page via `file://` isolates `localStorage` per page and breaks');
w('> `crypto.subtle` sign-in. Relevant to the ' + filesOnDisk.length + ' catalogued surfaces below.');
w();
w('## 2. Master index');
w();
w('| # | File | Group | Purpose | How you reach it | Auth | Store keys | Size |');
w('|---|------|-------|---------|------------------|------|-----------|------|');
for (const p of [...pages].sort((a, b) => a.id - b.id)) {
  const s = scans.get(p.file);
  w(
    '| ' + p.id +
    ' | `' + p.file + '`' +
    ' | ' + cell(p.group) +
    ' | ' + cell(p.purpose) +
    ' | ' + cell(p.entry) +
    ' | ' + (p.auth ? 'yes' : '-') +
    ' | ' + storeStr(s) +
    ' | ' + sizeFmt(s) +
    ' |'
  );
}
w();
w('## 3. Navigation map');
w();
for (const nav of meta.navigation || []) {
  w('### ' + nav.title);
  w();
  w(nav.body);
  w();
}
w('## 4. Per-page detail');
w();
for (const g of groups) {
  const rows = pages.filter((p) => p.group === g.key).sort((a, b) => a.id - b.id);
  if (!rows.length) continue;
  w('### ' + g.label);
  w();
  for (const p of rows) {
    const s = scans.get(p.file);
    w('#### #' + p.id + ' `' + p.file + '`');
    w();
    w('- **Purpose:** ' + p.purpose);
    w('- **Audience:** ' + p.audience);
    w('- **Reach it:** ' + p.entry);
    w('- **How you use it:** ' + p.interactions);
    w('- **Auth:** ' + (p.auth ? 'gated' : 'open') + ' · **Status:** ' + p.status);
    w('- **Store:** ' + storeStr(s));
    w('- **Markers:** shell ' + marker(s.shell) + ' · auth ' + marker(s.auth) + ' · esc ' + marker(s.esc) + ' · pager ' + marker(s.pager) + ' · confirm ' + marker(s.confirm) + ' · audit ' + marker(s.audit) + ' · alerts ' + s.alerts);
    w('- **Size:** ' + sizeFmt(s) + ' (' + s.bytes + ' bytes)');
    w('- **Loads:** ' + (s.deps.length ? s.deps.map((d) => '`' + d + '`').join(', ') : '—'));
    if (p.notes) w('- **Notes:** ' + p.notes);
    w();
  }
}
w('## 5. Change log');
w();
for (const c of meta.changelog || []) {
  w('- **' + c.date + '** — ' + c.note);
}
if (!(meta.changelog || []).length) w('- (no entries yet)');
w();

fs.writeFileSync(OUT_PATH, out.join('\n'), 'utf8');
console.log('Wrote ' + path.relative(ROOT, OUT_PATH) + ' (' + filesOnDisk.length + ' pages, ' + out.length + ' lines).');
