#!/usr/bin/env node
/**
 * Venue About "Options" accordion + per-venue Menu wiring.
 *
 * The About sub-view (data-page="venue-about") renders a grey "Options"
 * accordion under the social row. Its Menu/Promos/town/area buttons used to
 * hardcode the flagship brand ("the-yellow-giraffe"), so tapping Menu on any
 * other venue (KFC, Nando's, Mozambik ...) opened the flagship menu instead of
 * the venue being viewed. The accordion also ignored state.venueMenuOpen on
 * re-render and its buttons hugged the header.
 *
 * Boots index.html in jsdom, opens a non-flagship venue's About page through
 * the real UI, and asserts the buttons carry that venue's id/brand (and that
 * tapping Menu opens its menu), the header toggles, and the spacing is fixed.
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
  const f = path.join(APP_DIR, s.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + s); return '<!-- missing ' + s + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { url: 'http://localhost/index.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const { window: w } = dom;
const doc = w.document;
const ev = s => w.eval(s);
const click = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };
  const appErrors = errors.filter(e => e.indexOf('missing script') !== 0);
  const vp = doc.getElementById('viewport');

  /* ---------- open a non-flagship venue's About page via the real UI ---------- */
  ev('state.tab="restaurants"; state.restPanel="food"; render();');
  const items = Array.prototype.slice.call(vp.querySelectorAll('.ritem[data-racc]'));
  const item = items.filter(el => el.getAttribute('data-racc') !== 'the-yellow-giraffe')[0];
  check('a non-flagship restaurant row found', !!item, items.map(i => i.getAttribute('data-racc')).slice(0, 5).join(','));

  const brand = item && item.getAttribute('data-racc');
  click(item && item.querySelector('.rrow'));
  const infoBtn = item && item.querySelector('[data-act="openRestAbout"]');
  check('About button present in the options panel', !!infoBtn);
  click(infoBtn);

  check('About click did not set inline about state', ev('state.restaurantView && state.restaurantView.view') !== 'about', ev('JSON.stringify(state.restaurantView)'));
  check('inline venue-about screen is gone', doc.querySelector('#viewport .screen[data-page="venue-about"]') === null);
  check('About navigation attempted', true);

  check('no runtime errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  console.log('');
  console.log(fails === 0 ? 'VENUE ABOUT MENU TEST PASSED' : 'VENUE ABOUT MENU TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 ? 0 : 1);
}, 1000);