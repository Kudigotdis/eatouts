#!/usr/bin/env node
/**
 * HTML catalog guard.
 *
 * Asserts that scripts/html_catalog.meta.json and the root *.html files stay in
 * sync, so HTML_CATALOG.md can never silently drift. Fails when:
 *   - a root .html file has no catalog entry (or a catalog entry has no file)
 *   - a catalog entry is missing a required field
 *   - page ids are not unique and contiguous from 1
 *   - an entry references an unknown group key
 *   - a changelog entry lacks a date or note
 *
 * Regenerate the catalog with `npm run catalog` after fixing the meta file.
 *
 * Usage:  node tests/html-catalog.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const META = path.join(ROOT, 'scripts', 'html_catalog.meta.json');

let fails = 0;
let checks = 0;

function check(label, cond, extra) {
  checks++;
  if (cond) {
    console.log('ok   ' + label);
  } else {
    fails++;
    console.log('FAIL ' + label + (extra ? '  -- ' + extra : ''));
  }
}

if (!fs.existsSync(META)) {
  console.log('FAIL meta file missing: scripts/html_catalog.meta.json');
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(META, 'utf8'));
const pages = Array.isArray(meta.pages) ? meta.pages : [];
const groups = new Set((meta.groups || []).map((g) => g.key));

const onDisk = fs
  .readdirSync(ROOT)
  .filter((f) => f.toLowerCase().endsWith('.html'))
  .sort();
const metaFiles = pages.map((p) => p.file).sort();

const missingMeta = onDisk.filter((f) => !metaFiles.includes(f));
const missingFile = metaFiles.filter((f) => !fs.existsSync(path.join(ROOT, f)));
const dupFiles = metaFiles.filter((f, i) => metaFiles.indexOf(f) !== i);

check('meta parses and has pages', pages.length > 0, pages.length + ' entries');
check('every root .html has a catalog entry', missingMeta.length === 0, missingMeta.join(', '));
check('every catalog entry has a file', missingFile.length === 0, missingFile.join(', '));
check('no duplicate file entries', dupFiles.length === 0, dupFiles.join(', '));

const REQUIRED = ['id', 'file', 'group', 'purpose', 'audience', 'entry', 'interactions', 'status'];
const incomplete = pages.filter((p) => REQUIRED.some((k) => p[k] == null || p[k] === ''));
check('every entry has all required fields', incomplete.length === 0, incomplete.map((p) => p.file).join(', '));

const ids = pages.map((p) => p.id).sort((a, b) => a - b);
const idsOk = ids.every((v, i) => v === i + 1);
check('page ids are unique and contiguous from 1', idsOk, ids.join(','));

const badGroup = pages.filter((p) => !groups.has(p.group));
check('every entry references a known group', badGroup.length === 0, badGroup.map((p) => p.file + ':' + p.group).join(', '));

const nav = Array.isArray(meta.navigation) ? meta.navigation : [];
check('navigation map present', nav.length > 0 && nav.every((n) => n && n.title && n.body));

const log = Array.isArray(meta.changelog) ? meta.changelog : [];
check('changelog entries are dated with a note', log.every((c) => c && c.date && c.note));

console.log('');
if (fails) {
  console.log(checks + ' checks, ' + fails + ' failed — edit scripts/html_catalog.meta.json then run `npm run catalog`.');
  process.exit(1);
}
console.log('HTML-CATALOG PASSED (' + checks + ' checks, ' + pages.length + ' pages).');
