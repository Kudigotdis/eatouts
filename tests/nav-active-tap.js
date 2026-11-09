#!/usr/bin/env node
/**
 * Bottom nav: tapping the tab you are already on toggles that page's filter bar.
 *
 * The header filter button was removed; the bars live on the active tab again:
 * Promos feed, Restaurants, Catering, Bakeries and Beverages. At the tab root
 * the tap reveals/hides the bar; from a sub-view it returns to the root.
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const withRegionPayload = require('./_region-payload');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
  const f = path.join(APP_DIR, s.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + s); return '<!-- missing ' + s + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});
/* The directory payload is document.write()n by js/eatouts-region-data.js, which
   jsdom never fetches — hand the page the Botswana payload the browser gets. */
html = withRegionPayload(html, 'BW');

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window: w } = dom;
const doc = w.document;
const ev = s => w.eval(s);
const click = el => { if (el) el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); };
const tab = name => doc.querySelector('#nav [data-tab="' + name + '"]');

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };
  const appErrors = errors.filter(e => e.indexOf('missing script') !== 0);
  const cbar = doc.getElementById('cbar');
  const promoBar = doc.getElementById('filter-bar');

  check('the header no longer has a filter button', !doc.getElementById('hdrFilter'));

  /* ---------- active tab toggles its filter bar ---------- */
  ev('state.tab="promos"; state.promoView="feed"; state.promoFilterOpen=false; render();');
  click(tab('promos'));
  check('2nd Promos tap opens the promo filter bar',
    ev('state.promoFilterOpen') === true && promoBar.classList.contains('on'), ev('state.promoFilterOpen'));
  click(tab('promos'));
  check('3rd Promos tap closes the promo filter bar',
    ev('state.promoFilterOpen') === false && !promoBar.classList.contains('on'), ev('state.promoFilterOpen'));

  ev('state.tab="restaurants"; state.restPanel="food"; state.restaurantView=null; state.restFilterOpen=false; render();');
  click(tab('restaurants'));
  check('2nd Restaurants tap opens the food filter bar',
    ev('state.restFilterOpen') === true && cbar.classList.contains('on'), ev('state.restFilterOpen'));
  check('the restaurant list is still on screen',
    doc.querySelectorAll('#viewport .ritem').length > 0, doc.querySelectorAll('#viewport .ritem').length);
  click(tab('restaurants'));
  check('3rd Restaurants tap closes the food filter bar',
    ev('state.restFilterOpen') === false && !cbar.classList.contains('on'), ev('state.restFilterOpen'));

  /* the reported sequence: Promos -> Restaurants -> Restaurants */
  ev('state.tab="promos"; state.promoView="feed"; state.promoFilterOpen=false; state.restFilterOpen=false; render();');
  click(tab('restaurants'));
  click(tab('restaurants'));
  check('Promos -> Restaurants -> Restaurants opens only the restaurant bar',
    ev('state.restFilterOpen') === true && ev('state.promoFilterOpen') === false &&
    ev('state.bevFilterOpen') === false && ev('state.cateringFilterOpen') === false &&
    ev('state.bakeryFilterOpen') === false && cbar.classList.contains('on') &&
    !promoBar.classList.contains('on'),
    JSON.stringify(ev('({rest:state.restFilterOpen,bev:state.bevFilterOpen,catering:state.cateringFilterOpen,bakery:state.bakeryFilterOpen})')));

  /* ---------- tabs without a filter bar do nothing extra ------------------ */
  click(tab('gallery'));
  check('Gallery tab still navigates', ev('state.tab') === 'gallery', ev('state.tab'));

  /* ---------- from a sub-view the tab tap still navigates home ------------ */
  ev('state.tab="restaurants";state.restFilterOpen=false;render();');
  ev('(function(){var r=EatoutsBridge.listing()[0];' +
    'state.restaurantView={id:r.id,brand:EatoutsBridge.brandKeyOf(r),view:"menu",promoId:null};' +
    'EatoutsBridge.setActive(r.id); render(); return true;})()');
  check('a venue sub-view is open', ev('!!state.restaurantView'));
  click(tab('restaurants'));
  check('Restaurants tap closes the venue sub-view',
    ev('state.restaurantView') === null, ev('JSON.stringify(state.restaurantView)'));
  check('coming back home leaves the filter bar closed',
    ev('state.restFilterOpen') === false && !cbar.classList.contains('on'), ev('state.restFilterOpen'));

  check('no runtime errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  console.log('');
  console.log(fails === 0 ? 'NAV ACTIVE TAB TEST PASSED' : 'NAV ACTIVE TAB TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 ? 0 : 1);
}, 1200);
