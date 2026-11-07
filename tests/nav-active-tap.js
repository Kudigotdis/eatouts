#!/usr/bin/env node
/**
 * Bottom nav: tapping the tab you are already on navigates - it does not filter.
 *
 * Tapping the already-active nav tab used to toggle that tab's filter bar (the
 * promo feed, the restaurant list, the beverages / catering / bakery panels),
 * so a second tap on Restaurants silently opened a search + filter bar and the
 * button looked broken. The nav now only navigates: at the tab root the tap is
 * a no-op, from a sub-view it returns to the root. The filter bars open from
 * the explicit header filter button (#hdrFilter, data-act="toggleFilterBar").
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
  const filterBtn = doc.getElementById('hdrFilter');

  /* ---------- nav tap on the active tab must not toggle a filter bar ------ */
  ev('state.tab="promos"; state.promoView="feed"; render();');
  click(tab('promos'));
  check('2nd Promos tap does not open the promo filter bar',
    ev('state.promoFilterOpen') === false && !promoBar.classList.contains('on'), ev('state.promoFilterOpen'));

  ev('state.tab="restaurants"; state.restPanel="food"; state.restaurantView=null; render();');
  click(tab('restaurants'));
  check('2nd Restaurants tap does not open the food filter bar',
    ev('state.restFilterOpen') === false && !cbar.classList.contains('on'), ev('state.restFilterOpen'));
  check('the restaurant list is still on screen',
    doc.querySelectorAll('#viewport .ritem').length > 0, doc.querySelectorAll('#viewport .ritem').length);

  /* the reported sequence: Promos -> Restaurants -> Restaurants */
  ev('state.tab="promos"; state.promoView="feed"; render();');
  click(tab('restaurants'));
  click(tab('restaurants'));
  check('Promos -> Restaurants -> Restaurants leaves every filter bar closed',
    ev('state.restFilterOpen') === false && ev('state.promoFilterOpen') === false &&
    ev('state.bevFilterOpen') === false && ev('state.cateringFilterOpen') === false &&
    ev('state.bakeryFilterOpen') === false && !cbar.classList.contains('on') &&
    !promoBar.classList.contains('on'),
    JSON.stringify(ev('({rest:state.restFilterOpen,bev:state.bevFilterOpen,catering:state.cateringFilterOpen,bakery:state.bakeryFilterOpen})')));

  /* ---------- the header button is the explicit filter control ----------- */
  check('header filter button shows on the restaurant list', !!filterBtn && !filterBtn.hidden);
  click(filterBtn);
  check('header filter button opens the food filter bar',
    ev('state.restFilterOpen') === true && cbar.classList.contains('on'), ev('state.restFilterOpen'));
  check('the open bar is reflected on the button',
    !!filterBtn && filterBtn.classList.contains('on') && filterBtn.getAttribute('aria-expanded') === 'true');
  click(filterBtn);
  check('header filter button closes the food filter bar again',
    ev('state.restFilterOpen') === false && !cbar.classList.contains('on'), ev('state.restFilterOpen'));
  check('the button drops its active state',
    !!filterBtn && !filterBtn.classList.contains('on') && filterBtn.getAttribute('aria-expanded') === 'false');

  click(tab('promos'));
  check('header filter button shows on the promo feed', !!filterBtn && !filterBtn.hidden);
  click(filterBtn);
  check('header filter button opens the promo filter bar',
    ev('state.promoFilterOpen') === true && promoBar.classList.contains('on'), ev('state.promoFilterOpen'));
  click(filterBtn);
  check('header filter button closes the promo filter bar again',
    ev('state.promoFilterOpen') === false && !promoBar.classList.contains('on'), ev('state.promoFilterOpen'));

  /* ---------- tabs without a filter bar hide the button ------------------- */
  click(tab('gallery'));
  check('header filter button hides on Gallery', !!filterBtn && filterBtn.hidden);
  click(tab('about'));
  check('header filter button hides on About', !!filterBtn && filterBtn.hidden);
  click(tab('restaurants'));
  check('header filter button is back on Restaurants', !!filterBtn && !filterBtn.hidden);

  /* ---------- from a sub-view the tab tap still navigates home ------------ */
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
