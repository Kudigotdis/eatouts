/* Verify the bakery panel: tab order, rendered rows, disabled WhatsApp,
   Store details -> venue-about navigation target. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return ''; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/', virtualConsole: vc });
const w = dom.window;
const doc = w.document;

let pass = 0, fail = 0;
const check = (name, ok, extra) => {
  if (ok) { pass++; console.log('ok    ' + name); }
  else { fail++; console.log('FAIL  ' + name + (extra ? ' :: ' + extra : '')); }
};

const ev = s => w.eval(s);

// 1. tab order
ev('state.tab="restaurants"; state.restPanel="food"; render();');
const tabs = [...doc.querySelectorAll('.bev-toggle-btn')].map(b => b.textContent.trim());
check('4 tabs render', tabs.length === 4, JSON.stringify(tabs));
check('order = Restaurants, Catering, Bakery, Beverages',
  JSON.stringify(tabs) === JSON.stringify(['Restaurants', 'Catering', 'Bakery', 'Beverages']), JSON.stringify(tabs));

// 2. bakery panel renders with data-page="bakeries"
ev('switchRestPanel("bakery"); render();');
const screen = doc.querySelector('.screen');
check('screen data-page="bakeries"', screen && screen.getAttribute('data-page') === 'bakeries', screen && screen.getAttribute('data-page'));
check('screen has data-page-ref', screen && screen.hasAttribute('data-page-ref'), screen && screen.getAttribute('data-page-ref'));

// 3. rows are ritem accordions, same pattern as restaurants/catering
const rows = doc.querySelectorAll('.bevpage[data-page="bakeries"] .ritem');
check('bakery rows render', rows.length > 50, rows.length + ' rows');
check('row has rrow toggle', !!doc.querySelector('.bevpage[data-page="bakeries"] .rrow[data-act="toggleBakery"]'));
check('row uses acc-wrap accordion', !!doc.querySelector('.bevpage[data-page="bakeries"] .ritem .acc-wrap'));

// 4. first row uses the placeholder logo
const firstThumb = doc.querySelector('.bevpage[data-page="bakeries"] .rthumb img');
check('thumb uses logo_placement_image', firstThumb && /logo_placement_image/.test(firstThumb.getAttribute('src') || ''), firstThumb && firstThumb.getAttribute('src'));

// 5. accordion toggles open on tap
const firstRow = rows[0];
ev('state.bakeryOpen=null; syncBakeryAccordions();');
check('row starts closed', !firstRow.classList.contains('open'));
ev('state.bakeryOpen="' + firstRow.getAttribute('data-bacc') + '"; syncBakeryAccordions();');
check('row opens on toggle', firstRow.classList.contains('open'));

// 6. WhatsApp disabled, Store details present
const openRow = firstRow;
const waBtn = openRow.querySelector('.ico-btn.is-disabled[data-act="showRestNotice"]');
check('WhatsApp button disabled in open row', !!waBtn, openRow.querySelector('.card-ico-row') ? openRow.querySelector('.card-ico-row').innerHTML.slice(0, 300) : 'no card-ico-row');
const infoBtn = openRow.querySelector('.ico-btn[title="Store details"][data-act="openBakeryAbout"]');
check('Store details button present', !!infoBtn);

// 7. store-details tap navigates to venue-about with the bakery slug
let aboutNav = null;
doc.addEventListener('eatouts:about-nav', e => { aboutNav = e.detail; });
if (infoBtn) infoBtn.click();
check('navigates to venue-about.html?link=bakery-1',
  aboutNav && /^venue-about\.html\?link=bakery-\d+$/.test(aboutNav.url), aboutNav && aboutNav.url);

// 8. venue-about.html resolves a bakery slug and renders its About page
const aboutHtml = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8')
  .replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('venue-about missing script: ' + src); return ''; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
const aboutDom = new JSDOM(aboutHtml, {
  runScripts: 'dangerously',
  url: 'https://example.test/venue-about.html?link=bakery-3',
  virtualConsole: vc
});
const aw = aboutDom.window;
const adoc = aw.document;
check('venue-about body data-page="venue-about"', adoc.body.getAttribute('data-page') === 'venue-about');
const h1 = adoc.querySelector('.hero h1');
check('venue-about hero shows the bakery name', !!h1 && h1.textContent.indexOf('Bakeology') > -1, h1 && h1.textContent);
check('venue-about document title set', adoc.title.indexOf('Bakeology') > -1, adoc.title);

// 9. swipe-between-panels machinery: thumb pixel-sync + settle-then-commit
check('thumb follows via setBevToggleThumb', ev('typeof setBevToggleThumb') === 'function');
check('swipe commit is deferred (commitRestPanelFromScroll)', ev('typeof commitRestPanelFromScroll') === 'function');
check('settle timer variable exists', ev('typeof bevSettleTimer !== "undefined"'));
let syncThrew = false;
try { ev('(function(){state.tab="restaurants";state.restPanel="food";render();syncBeveragesPanel();commitRestPanelFromScroll();})()'); } catch (e) { syncThrew = true; }
check('sync/commit paths never throw (no-layout guard)', !syncThrew);
check('commit with no scroll keeps the panel', ev('state.restPanel') === 'food', ev('state.restPanel'));
check('thumb element carries no dead marker class', !doc.querySelector('.bev-toggle-thumb.ai-custom-slider'));
check('thumb has will-change for GPU slide', /will-change:\s*transform/.test(ev('(function(){var s=[].slice.call(document.styleSheets).map(function(x){try{return [].slice.call(x.cssRules).map(function(r){return r.cssText;}).join("");}catch(e){return "";}}).join("");return s;})()') || ''));

// 10. rich accordion content (matches the catering pattern)
const accRow = doc.querySelector('.bevpage[data-page="bakeries"] .ritem') || firstRow;
const accHtml = accRow.querySelector('.acc-wrap').innerHTML;
check('row shows town + area select lines', (accHtml.match(/line line-select/g) || []).length === 2, (accHtml.match(/line line-select/g) || []).length + ' found');
check('row shows Menu + Promos action lines', (accHtml.match(/line line-action/g) || []).length === 2, (accHtml.match(/line line-action/g) || []).length + ' found');
check('town/area lines are display-only (no data-act)', !accRow.querySelector('.line-select[data-act]'));
check('Menu and Promos are disabled notice buttons', accRow.querySelectorAll('.line-action.is-disabled[data-act="showRestNotice"]').length === 2);
check('card-ico-row has favourite + WhatsApp + info', (accHtml.match(/ico-btn/g) || []).length >= 3 && accHtml.indexOf('data-act="toggleFav"') > -1 && accHtml.indexOf('data-act="openBakeryAbout"') > -1);

// 11. WhatsApp activates only when the record has a real phone
const withPhone = ev('bakeryOptions(bakeryBrands().filter(function(x){return x.slug==="bakery-3";})[0])');
check('bakery with a phone gets a live WhatsApp button', withPhone.indexOf('data-act="waBakery"') > -1);
const noPhone = ev('bakeryOptions(bakeryBrands().filter(function(x){return x.slug==="bakery-1";})[0])');
check('bakery without a phone keeps disabled WhatsApp', noPhone.indexOf('ico-btn is-disabled') > -1 && noPhone.indexOf('waBakery') === -1);

// 12. thumb never double-counts the container padding
let thumbThrew = false;
try { ev('setBevToggleThumb(document.querySelector(".bev-toggle"),3)'); } catch (e) { thumbThrew = true; }
check('thumb guard: no layout => pure-CSS fallback, no inline translate', !thumbThrew && !doc.querySelector('.bev-toggle-thumb').style.transform);

// 13. leaving a tab / switching panels collapses every ritem
check('closeAllRitemAccordions clears restaurant/catering/bakery open state',
  ev('(function(){state.restaurantOpen="r1";state.cateringOpen="c1";state.bakeryOpen="bakery-1";closeAllRitemAccordions();return state.restaurantOpen===null&&state.cateringOpen===null&&state.bakeryOpen===null;})()'));

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
/* jsdom cannot navigate to another document — gotoVenueAbout deliberately
   dispatches eatouts:about-nav before setting location.href, and we assert
   on that event, so this specific error is expected. */
const realErrors = errors.filter(e => !/navigation to another Document/.test(e));
if (realErrors.length) { console.log('window errors: ' + realErrors.length); realErrors.slice(0, 5).forEach(e => console.log('  ' + e)); }
process.exit(fail || realErrors.length ? 1 : 0);
