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

  check('About page opened', ev('state.restaurantView && state.restaurantView.view') === 'about', ev('JSON.stringify(state.restaurantView)'));
  const rid = ev('state.restaurantView && state.restaurantView.id');
  const rbrand = ev('state.restaurantView && state.restaurantView.brand');
  check('About is scoped to the chosen venue (not the flagship)', rbrand === brand && rbrand !== 'the-yellow-giraffe',
    'brand=' + rbrand + ' row=' + brand);

  const vm = vp.querySelector('.venuemenu');
  check('Options accordion rendered under social-row', !!vm && !!vp.querySelector('.social-row'));

  const header = vm && vm.querySelector('.vmrow');
  check('accordion header reads "Options"', !!header && header.textContent.trim() === 'Options', header && header.textContent.trim());
  check('accordion starts open', !!vm && vm.classList.contains('open'));

  const menuBtn = vm && vm.querySelector('[data-act="openRestView"][data-view="menu"]');
  const promosBtn = vm && vm.querySelector('[data-act="openRestView"][data-view="promos"]');
  check('Menu button carries the venue id', !!menuBtn && menuBtn.getAttribute('data-id') === rid, menuBtn && menuBtn.getAttribute('data-id'));
  check('Menu button carries the venue brand', !!menuBtn && menuBtn.getAttribute('data-brand') === rbrand, menuBtn && menuBtn.getAttribute('data-brand'));
  check('Menu button is NOT the flagship', !!menuBtn && menuBtn.getAttribute('data-brand') !== 'the-yellow-giraffe');
  check('Promos button matches the venue', !!promosBtn && promosBtn.getAttribute('data-id') === rid && promosBtn.getAttribute('data-brand') === rbrand);

  const locBtns = vm ? Array.prototype.slice.call(vm.querySelectorAll('[data-act="openRestLocPicker"]')) : [];
  check('town + area pickers bound to the venue brand',
    locBtns.length === 2 && locBtns.every(b => b.getAttribute('data-brand') === rbrand),
    locBtns.map(b => b.getAttribute('data-brand')).join(','));
  const townBtn = vm && vm.querySelector('[data-act="openRestLocPicker"][data-axis="town"]');
  const rtown = ev('(((EatoutsBridge.byId(' + JSON.stringify(rid) + ')||{}).location||{}).town)||""');
  const townLabel = townBtn && townBtn.textContent.trim();
  check('town picker reflects the venue town',
    !!townBtn && townLabel === (rtown || 'Select Town / City'),
    'label=' + townLabel + ' town=' + rtown);

  /* ---------- spacing under the grey header ---------- */
  const ropts = vm && vm.querySelector('.ropts.brows');
  const padTop = ropts ? parseFloat(w.getComputedStyle(ropts).paddingTop) : 0;
  check('buttons have breathing room under the header', padTop > 2, 'paddingTop=' + padTop + 'px');

  /* ---------- collapse / re-render persistence ---------- */
  click(header);
  check('tapping the header collapses the accordion', !vm.classList.contains('open'));
  check('collapsed header is aria-expanded=false', header.getAttribute('aria-expanded') === 'false');
  click(header);
  check('tapping again expands it', vm.classList.contains('open'));

  /* collapsing then re-rendering must keep the state */
  click(header);
  ev('render()');
  const vm2 = vp.querySelector('.venuemenu');
  check('collapsed state survives a re-render', !!vm2 && !vm2.classList.contains('open'));

  /* ---------- Menu opens the viewed venue's menu ---------- */
  ev('state.venueMenuOpen=true; render();');
  const openMenu = vp.querySelector('.venuemenu [data-act="openRestView"][data-view="menu"]');
  click(openMenu);
  check('Menu opens the venue menu view', ev('state.restaurantView && state.restaurantView.view') === 'menu', ev('JSON.stringify(state.restaurantView)'));
  check('Menu opened the same venue', ev('state.restaurantView && state.restaurantView.id') === rid, ev('state.restaurantView && state.restaurantView.id'));
  check('venue menu rendered (categories or empty state)', vp.querySelectorAll('.cat-row').length > 0 || /Menu|items/i.test(vp.textContent));
  check('flagship menu was NOT opened', ev('state.restaurantView && state.restaurantView.brand') !== 'the-yellow-giraffe');

  check('no runtime errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  console.log('');
  console.log(fails === 0 ? 'VENUE ABOUT MENU TEST PASSED' : 'VENUE ABOUT MENU TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 ? 0 : 1);
}, 1000);
