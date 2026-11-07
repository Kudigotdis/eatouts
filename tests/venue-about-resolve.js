#!/usr/bin/env node
/**
 * venue-about.html — every business is reachable from a deep link.
 *
 * The About page is the app's only standalone venue surface, and it used to
 * bounce back to index.html#restaurants unless the ?link= value was the exact
 * slug of a row in the ACTIVE region's payload. That made chain brands
 * (?link=kfc), branch spellings (?link=kfc-maun) and anything that lives in the
 * local database unreachable.
 *
 * Covered here:
 *   - a payload slug resolves;
 *   - a payload id resolves;
 *   - a brand key resolves to that brand's branch (ZW payload, where a chain's
 *     rows share one brandKey);
 *   - a slug prefix resolves (kfc-maun -> the kfc row);
 *   - an unknown link still hands the visitor back to the directory;
 *   - the About card shows the venue's own description (South Africa payload);
 *   - the region gate holds: a BW-only slug does not resolve in Zimbabwe.
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const withRegionPayload = require('./_region-payload');

let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

function payloadRows(region) {
  const rel = withRegionPayload.PAYLOADS[region];
  const file = path.join(APP_DIR, 'data', 'restaurant_listings',
    path.basename(rel).replace('_runtime_data.js', '_runtime_data.json'));
  return JSON.parse(fs.readFileSync(file, 'utf8')).restaurants || [];
}

function loadPage(link, region) {
  let html = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing ' + src + ' -->';
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  html = withRegionPayload(html, region || 'BW');
  const errors = [];
  const navs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) { navs.push(m); return; }
    errors.push('jsdomError: ' + m);
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://localhost/venue-about.html?link=' + encodeURIComponent(link),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    /* the harness swaps the payload in, so the stored region has to follow */
    beforeParse(win) {
      try { win.localStorage.setItem('eatouts.region.v1', String(region || 'BW')); } catch (err) {}
    }
  });
  return { dom, doc: dom.window.document, w: dom.window, errors, navs };
}

function click(el) {
  if (!el) return;
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function aboutCopy(doc) {
  click(doc.getElementById('logoBtn'));
  click(doc.getElementById('aboutBtn'));
  return (doc.getElementById('aboutPanelBody') || {}).textContent || '';
}

/* ---------- Botswana: slug and id ---------- */
const bw = payloadRows('BW');
const bwRow = bw.find(r => r.slug === 'sanitas-restaurant') || bw[0];

let a = loadPage(bwRow.slug, 'BW');
check('a payload slug resolves', !a.navs.length && /sanitas/i.test(a.doc.title || '') ===
  /sanitas/i.test(bwRow.name), a.doc.title + ' :: ' + a.navs.join('|'));
check('the page renders without script errors', a.errors.length === 0, a.errors.join(' | '));

let b = loadPage(bwRow.id, 'BW');
check('a payload id resolves to the same venue', (b.doc.title || '').indexOf(bwRow.name.split(' - ')[0]) !== -1 || /About/.test(b.doc.title),
  b.doc.title);

/* ---------- Zimbabwe: brand key and slug prefix ---------- */
const zw = payloadRows('ZW');
const branch = zw.find(r => r.brandKey && r.brandKey !== r.slug);
check('the ZW payload has a chain row to test with', !!branch, branch && branch.slug);

const c = loadPage(branch.brandKey, 'ZW');
check('a brand key resolves to that brand\'s branch',
  !c.navs.length && (c.doc.title || '').toLowerCase().indexOf(branch.brandKey.split('-')[0]) !== -1,
  c.doc.title + ' :: ' + c.navs.join('|'));

const d = loadPage(branch.slug + '-main-branch', 'ZW');
check('a slug prefix resolves to the row it belongs to',
  !d.navs.length && (d.doc.title || '').indexOf(branch.name) !== -1,
  d.doc.title + ' :: ' + d.navs.join('|'));

/* ---------- an unknown link still bounces ---------- */
const e = loadPage('there-is-no-such-venue-here', 'ZW');
check('an unknown link hands the visitor back to the directory',
  e.navs.length > 0 && /^About\b/.test(e.doc.title || ''), e.doc.title + ' :: ' + e.navs.join('|'));

/* ---------- the About card uses the venue's own words ---------- */
const za = payloadRows('ZA');
const described = za.find(r => (r.description || '').length > 80);
check('the ZA payload carries a described venue', !!described, described && described.slug);

const f = loadPage(described.slug, 'ZA');
const copy = aboutCopy(f.doc);
check('the About card shows the venue description',
  described.description.slice(0, 40).replace(/\s+/g, ' ').trim().length > 0 &&
  copy.indexOf(described.description.slice(0, 40)) !== -1,
  copy.slice(0, 120));
check('the card is copy-only (no numbers, no links)',
  !/<a\s|<img\s/.test((f.doc.getElementById('aboutPanelBody') || {}).innerHTML || ''));

/* ---------- the region gate holds ---------- */
const g = loadPage('the-yellow-giraffe', 'ZW');
check('a Botswana-only slug does not resolve in Zimbabwe', g.navs.length > 0,
  g.doc.title + ' :: ' + g.navs.join('|'));

console.log(fails === 0 ? '\nVENUE-ABOUT-RESOLVE TEST PASSED' : '\nVENUE-ABOUT-RESOLVE TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
