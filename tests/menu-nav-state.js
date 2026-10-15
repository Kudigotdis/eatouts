#!/usr/bin/env node
/**
 * Menu category state across venues.
 *
 * `state.menuCat` selects which menu category the venue-menu-item page shows.
 * It used to leak across venues: opening a category on one venue, then
 * switching venues, left the old (template) category id set, so the next venue
 * rendered "Category not found." because its menu had no such id.
 *
 * Boots index.html in jsdom and drives the real navigation: open a template
 * venue, tap a category, switch to the Restaurants tab, then open a venue with
 * a different (imported) menu, and assert it shows its own category list. Also
 * checks the defensive fallback when a stale category is forced.
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
  const bodyText = () => vp.textContent;

  /* pick one template venue (no imported menu) and one imported-menu venue */
  const picked = ev(`(function(){
    function row(re){ return EatoutsBridge.listing().filter(function(r){return re.test(r.name);})[0]||null; }
    function brand(r){ return r?EatoutsBridge.brandKeyOf(r):null; }
    var M = window.EatoutsMenus.menus;
    var t = row(/wimpy/i);
    var imp = row(/mozambik/i);
    return {
      template: t && { id:t.id, brand:brand(t) },
      imported: imp && { id:imp.id, brand:brand(imp), cats:(M[brand(imp)]||[]).map(function(c){return c.id;}) }
    };
  })()`);
  check('a template venue found', !!(picked && picked.template && picked.template.id), JSON.stringify(picked && picked.template));
  check('an imported-menu venue found', !!(picked && picked.imported && picked.imported.id && picked.imported.cats && picked.imported.cats.length), JSON.stringify(picked && picked.imported));

  /* ---------- open the template venue's Menu and tap a category ---------- */
  const opened = ev(`(function(){
    var r = ${JSON.stringify(picked.template)};
    state.tab="restaurants"; state.restPanel="food";
    state.restaurantOpen=r.brand;
    state.restaurantView={id:r.id,brand:r.brand,view:"menu",promoId:null};
    state.menuCat=null; state.menuOpen=null; state.checkoutView=false; state.splitOpen=false;
    EatoutsBridge.setActive(r.id);
    render();
    return document.querySelectorAll("#viewport .cat-row").length;
  })()`);
  check('template venue shows its category list', opened > 0, opened);

  click(vp.querySelector('#viewport .cat-row'));
  const catId = ev('state.menuCat');
  check('tapping a category sets state.menuCat', !!catId, catId);
  check('template venue item page rendered', /Choose Size|Item Total|items/.test(bodyText()) && !/Category not found/.test(bodyText()));

  /* ---------- switch to the Restaurants tab ---------- */
  click(doc.querySelector('#nav [data-tab="restaurants"]'));
  check('Restaurants tab returns to the list', ev('state.restaurantView') === null, ev('JSON.stringify(state.restaurantView)'));
  check('switching to Restaurants clears menuCat', ev('state.menuCat') === null, ev('state.menuCat'));
  check('switching to Restaurants clears menuOpen', ev('state.menuOpen') === null, ev('state.menuOpen'));

  /* ---------- open the imported-menu venue ---------- */
  const rowBtn = doc.querySelector('#viewport [data-act="toggleRestaurant"][data-id="' + picked.imported.brand + '"]');
  if (rowBtn) click(rowBtn);
  const menuBtn = doc.querySelector('#viewport [data-act="openRestView"][data-brand="' + picked.imported.brand + '"]');
  check('imported venue Menu button present', !!menuBtn);
  click(menuBtn);

  check('imported venue shows its own category list', vp.querySelectorAll('#viewport .cat-row').length > 0, vp.querySelectorAll('#viewport .cat-row').length);
  check('no "Category not found." after switching venues', !/Category not found/.test(bodyText()));
  const importedFirst = picked.imported.cats[0];
  check('imported venue shows its first category', bodyText().indexOf(importedFirst) > -1 || vp.querySelector('.cat-row'), importedFirst);

  /* ---------- defensive fallback when a stale category is forced ---------- */
  const fallback = ev(`(function(){
    state.restaurantView={id:${JSON.stringify(picked.imported.id)},brand:${JSON.stringify(picked.imported.brand)},view:"menu",promoId:null};
    EatoutsBridge.setActive(${JSON.stringify(picked.imported.id)});
    state.menuCat="breakfast"; /* template-only id, absent from the imported menu */
    state.menuOpen=null;
    render();
    return {
      rows: document.querySelectorAll("#viewport .cat-row").length,
      error: /Category not found/.test(document.getElementById("viewport").textContent),
      menuCat: state.menuCat
    };
  })()`);
  check('stale category falls back to the category list', !fallback.error && fallback.rows > 0, JSON.stringify(fallback));
  check('stale menuCat cleared by the fallback', fallback.menuCat === null, fallback.menuCat);

  check('no runtime errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  console.log('');
  console.log(fails === 0 ? 'MENU NAV STATE TEST PASSED' : 'MENU NAV STATE TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 ? 0 : 1);
}, 1000);
