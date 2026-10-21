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

console.log('');
console.log(pass + ' passed, ' + fail + ' failed');
/* jsdom cannot navigate to another document — gotoVenueAbout deliberately
   dispatches eatouts:about-nav before setting location.href, and we assert
   on that event, so this specific error is expected. */
const realErrors = errors.filter(e => !/navigation to another Document/.test(e));
if (realErrors.length) { console.log('window errors: ' + realErrors.length); realErrors.slice(0, 5).forEach(e => console.log('  ' + e)); }
process.exit(fail || realErrors.length ? 1 : 0);
