#!/usr/bin/env node
/**
 * Venue About "Options" accordion — town/area pickers, Menu & Promos.
 *
 * venue-about.html renders a grey "Menu" accordion (inside <details>)
 * with four identifiable buttons:
 *   #optTown   — floating "Select Town" popup (single town shown inline)
 *   #optArea   — floating "Select Area" popup, gated on a town being chosen
 *   #optMenu   — opens index.html#<slug>/menu  (toast if no menu)
 *   #optPromos — opens index.html#<slug>/promos (toast if no promos)
 *
 * Loads venue-about.html in jsdom for a multi-town chain (KFC) and a
 * single-town caterer (Boifys), taps each option, and asserts the behaviour.
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

function loadPage(slug) {
  let html = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing ' + src + ' -->';
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const errors = [];
  const navs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) { navs.push(m); return; }
    errors.push('jsdomError: ' + (e.stack || e.message));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://localhost/venue-about.html?link=' + encodeURIComponent(slug),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, doc: dom.window.document, window: dom.window, errors, navs };
}

function click(el) {
  if (!el) return;
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/* ---------- multi-town chain: KFC ---------- */
(function () {
  const { dom, doc, errors, navs } = loadPage('kfc');
  const q = s => doc.querySelector(s);
  const qa = s => Array.prototype.slice.call(doc.querySelectorAll(s));

  check('KFC: page resolved (not "Venue not found")',
    !/not found/i.test((q('.hero h1') || {}).textContent || ''), (q('.hero h1') || {}).textContent);

  const opts = qa('#optList [data-opt]').map(b => b.getAttribute('data-opt'));
  check('KFC: four identifiable option buttons', opts.join(',') === 'town,area,menu,promos', opts.join(','));
  check('KFC: no generic .lead prefixes remain', qa('#optList .lead').length === 0);
  check('KFC: buttons centred',
    /center/.test((doc.defaultView.getComputedStyle(q('#optTown')).justifyContent) || ''),
    q('#optTown') && doc.defaultView.getComputedStyle(q('#optTown')).justifyContent);
  check('KFC: town shows "Select Town" (multiple towns)',
    (q('#optTown') || {}).textContent.trim() === 'Select Town', (q('#optTown') || {}).textContent.trim());
  check('KFC: area shows "Select Area" before a town is chosen',
    (q('#optArea') || {}).textContent.trim() === 'Select Area', (q('#optArea') || {}).textContent.trim());

  /* area before town -> toast, no popup */
  click(q('#optArea'));
  check('KFC: area before town does NOT open a popup', !q('#popup.open'));
  check('KFC: area before town shows "Select a Town first" toast',
    /select a town first/i.test(q('#toast').textContent) && q('#toast').classList.contains('show'),
    q('#toast').textContent);

  /* town picker -> floating popup list */
  click(q('#optTown'));
  check('KFC: town opens a floating popup', !!q('#popup.open'));
  check('KFC: popup is titled "Select Town"', q('#popupTitle').textContent === 'Select Town', q('#popupTitle').textContent);
  const townRows = qa('#popupBody [data-pick-town]');
  check('KFC: town popup lists the towns', townRows.length > 1, townRows.length);
  check('KFC: popup is not a bottom sheet', !/bottom/.test(q('#popup').className));

  /* pick Gaborone */
  const gabs = townRows.filter(r => r.getAttribute('data-pick-town') === 'Gaborone')[0] || townRows[0];
  click(gabs);
  check('KFC: popup closes after picking a town', !q('#popup.open'));
  check('KFC: town button shows the picked town',
    (q('#optTown') || {}).textContent.trim() === gabs.getAttribute('data-pick-town'),
    (q('#optTown') || {}).textContent.trim());

  /* area picker for the chosen town */
  click(q('#optArea'));
  check('KFC: area opens a floating popup once a town is set', !!q('#popup.open'));
  check('KFC: popup titled "Select Area"', q('#popupTitle').textContent === 'Select Area', q('#popupTitle').textContent);
  const areaRows = qa('#popupBody [data-pick-area]');
  check('KFC: area popup lists the town areas', areaRows.length > 0, areaRows.length);
  if (areaRows.length) {
    click(areaRows[0]);
    check('KFC: area button shows picked area',
      (q('#optArea') || {}).textContent.trim() === areaRows[0].getAttribute('data-pick-area'),
      (q('#optArea') || {}).textContent.trim());
  }

  /* KFC has an imported menu -> Menu navigates, no toast */
  navs.length = 0;
  q('#toast').textContent = '';
  click(q('#optMenu'));
  check('KFC: menu click navigates (has a menu)', navs.length > 0, 'navs=' + navs.length);
  check('KFC: menu click shows no toast', !/not yet loaded/i.test(q('#toast').textContent), q('#toast').textContent);

  /* KFC has no promos -> toast, no navigation */
  navs.length = 0;
  q('#toast').textContent = '';
  click(q('#optPromos'));
  check('KFC: promos click shows a "no promos available" toast',
    /no promos available/i.test(q('#toast').textContent), q('#toast').textContent);
  check('KFC: promos click does not navigate', navs.length === 0, 'navs=' + navs.length);

  check('KFC: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
})();

/* ---------- single-town caterer: Boifys ---------- */
(function () {
  const { dom, doc, errors } = loadPage('boifyscateringservices');
  const q = s => doc.querySelector(s);
  const qa = s => Array.prototype.slice.call(doc.querySelectorAll(s));

  check('Boifys: page resolved', !/not found/i.test((q('.hero h1') || {}).textContent || ''));
  const opts = qa('#optList [data-opt]').map(b => b.getAttribute('data-opt'));
  check('Boifys: four identifiable option buttons', opts.join(',') === 'town,area,menu,promos', opts.join(','));
  check('Boifys: single town shown inline (no "Select Town")',
    (q('#optTown') || {}).textContent.trim() === 'Thamaga', (q('#optTown') || {}).textContent.trim());
  check('Boifys: area shows "Select Area" (none on file)',
    (q('#optArea') || {}).textContent.trim() === 'Select Area', (q('#optArea') || {}).textContent.trim());

  /* tapping a single-town picker does not open a popup */
  click(q('#optTown'));
  check('Boifys: single-town tap does not open a popup', !q('#popup.open'));

  click(q('#optMenu'));
  check('Boifys: menu toast names the business',
    /Boifys Catering Services has not yet loaded their menu/.test(q('#toast').textContent), q('#toast').textContent);

  check('Boifys: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
})();

/* ---------- round trip: index.html#<slug>/menu is understood ----------
   venue-about.html's Menu/Promos buttons leave for index.html#<biz.slug>/menu
   or /promos. index.html must parse that hash back into the same venue's
   menu/promos view (historically the SPA did not understand the slug form). */
(function () {
  const seen = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8');
  check('About emits index.html#<slug>/menu',
    /window\.location\.href\s*=\s*'index\.html#'\s*\+\s*biz\.slug\s*\+\s*'\/menu'/.test(seen));
  check('About emits index.html#<slug>/promos',
    /window\.location\.href\s*=\s*'index\.html#'\s*\+\s*biz\.slug\s*\+\s*'\/promos'/.test(seen));
  check('index.html parses the #<slug>/menu|promos hash',
    /hashParts\[1\]==="menu"\|\|hashParts\[1\]==="promos"/.test(fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8')));
})();

console.log('');
if (fails) {
  console.log('VENUE ABOUT OPTIONS TEST FAILED (' + fails + ' checks)');
  process.exit(1);
}
console.log('VENUE ABOUT OPTIONS TEST PASSED');
