/**
 * EatOuts-Region.html + js/eatouts-regions.js — T22 coverage.
 *
 * Proves:
 *   - the page carries the PAGE banner / <title> / data-page the inventory
 *     validator demands, plus the standard EatOuts header and bottom nav;
 *   - only the LIVE regions render (Botswana, Kenya, Mauritius, South Africa,
 *     Zimbabwe), each with a real flag file behind it, the one you are in first;
 *   - the selected row is marked and the others recede (40% opacity) but stay
 *     tappable — no "coming soon" card, no dead rows;
 *   - search filters by name and by code, and says so when nothing matches;
 *   - tapping another region persists 'eatouts.region.v1' and hands off to
 *     index.html#restaurants, where that region's payload is loaded;
 *   - the registry still refuses Malawi / Nigeria / Ghana.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const PAGE = path.join(APP_DIR, 'EatOuts-Region.html');
const REGISTRY = path.join(APP_DIR, 'js', 'eatouts-regions.js');

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const src = fs.readFileSync(PAGE, 'utf8');

function boot() {
  const errors = [];
  const html = src.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
    const f = path.join(APP_DIR, s.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + s); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/EatOuts-Region.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const key = (w, doc, k) => doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));

/* ---------- inventory contract ---------- */
check('page carries a <title>', /<title>[^<]*EatOuts/i.test(src));
check('page carries the <!-- PAGE: --> banner', /<!--\s*PAGE:\s*Select Region\s*-->/.test(src));
check('body declares data-page', /<body[^>]*data-page="EatOuts-Region"/.test(src));
check('page loads the region registry', /<script src="js\/eatouts-regions\.js"><\/script>/.test(src));
check('registry file exists', fs.existsSync(REGISTRY));

const a = boot();
const w = a.w, doc = a.doc;
check('no window errors on boot', a.errors.length === 0, a.errors.join(' | '));

/* ---------- header + nav ---------- */
const brand = doc.querySelector('#hdr button.brand-mark');
check('header is the standard brand mark',
  !!brand && brand.getAttribute('data-act') === 'backHistory' && brand.getAttribute('aria-label') === 'EatOuts home');
check('brand mark shows the EatOuts logo', !!brand && /assets\/logo\/EatOuts_Logo\.png/.test(brand.innerHTML));
const brandCs = w.getComputedStyle(brand);
check('brand mark is a 34px-tall logo sized by its own aspect ratio',
  brandCs.height === '34px' && /aspect-ratio:\s*1172\s*\/\s*504/.test(src), brandCs.height);
const brandLink = doc.querySelector('#hdr a.brand-mark');
check('brand mark is a button, not a link', !brandLink);
check('page loads the back-history script', /<script src="js\/eatouts-back-history\.js"><\/script>/.test(src));
const navEl = doc.getElementById('nav');
const navCs = navEl ? w.getComputedStyle(navEl) : null;
check('bottom nav is the house dark bar',
  !!navCs && navCs.backgroundColor === 'rgb(10, 10, 10)' && navCs.display === 'flex',
  navCs && [navCs.display, navCs.backgroundColor].join(' / '));
const nav = Array.from(doc.querySelectorAll('#nav .nav-btn')).map(el => el.getAttribute('data-tab'));
check('bottom nav is the house five', nav.length === 5 && nav.join(',') ===
  'promos,restaurants,reserve,gallery,about', nav.join(','));


/* ---------- every live region renders ---------- */
const items = () => Array.from(doc.querySelectorAll('#regionList .rs-item'));
const item = code => doc.querySelector('#regionList .rs-item[data-code="' + code + '"]');
check('only the five live regions render', items().length === 5, String(items().length));
check('the region you are in comes first, the rest alphabetically',
  items().map(b => b.getAttribute('data-code')).join(',') === 'BW,KE,MU,ZA,ZW',
  items().map(b => b.getAttribute('data-code')).join(','));
check('no inactive region is offered',
  !item('MW') && !item('NG') && !item('GH') && !/Coming soon/.test(doc.getElementById('regionList').textContent));
check('Botswana is the active row',
  !!item('BW') && item('BW').getAttribute('aria-pressed') === 'true' && /Selected/.test(item('BW').textContent));
check('the other rows are unselected and carry no Selected tag',
  item('ZA').getAttribute('aria-pressed') === 'false' && !/Selected/.test(item('ZA').textContent));
check('unselected rows recede to 40% but stay tappable', (() => {
  const z = item('ZA');
  return w.getComputedStyle(z).opacity === '0.4' && !z.disabled &&
    z.getAttribute('aria-disabled') !== 'true';
})(), w.getComputedStyle(item('ZA')).opacity);
check('header echoes the active region code', doc.getElementById('regionCode').textContent === 'BW');

const flags = items().map(b => b.querySelector('.rs-flag').getAttribute('src'));
check('flags come from assets/flags/',
  flags.length === 5 && flags.every(s => /^assets\/flags\/[a-z]{2}\.png$/.test(s)), flags.join(','));
const missing = flags.map(s => path.join(APP_DIR, s.replace(/\//g, path.sep))).filter(f => !fs.existsSync(f));
check('every rendered flag file exists on disk', missing.length === 0, missing.join(', '));
check('flag alt text is the region name',
  item('KE').querySelector('.rs-flag').getAttribute('alt') === 'Kenya');
check('row name uses the 16px body size',
  w.getComputedStyle(item('BW').querySelector('.rs-name')).fontSize === '16px');

/* the registry's `flag` base name feeds the square flag the search header
   shows (search_screen.html#regionBtn), so every one of them must resolve */
const sqFlags = w.EatoutsRegions.all().map(r => r.flag);
check('every region carries a square-flag base name',
  sqFlags.every(f => /^[a-z]+(-[a-z]+)*$/.test(f)), sqFlags.join(','));
const sqMissing = sqFlags
  .map(f => path.join(APP_DIR, 'assets', 'flags-square-rounded', f + '.svg'))
  .filter(f => !fs.existsSync(f));
check('every region square flag exists on disk', sqMissing.length === 0,
  sqMissing.map(f => path.basename(f)).join(', '));

/* ---------- search ---------- */
const search = doc.getElementById('regionSearch');
const type = v => { search.value = v; search.dispatchEvent(new w.Event('input', { bubbles: true })); };
type('kenya');
check('search by name narrows to one row', items().length === 1 && items()[0].getAttribute('data-code') === 'KE');
type('zw');
check('search by code works too', items().length === 1 && items()[0].getAttribute('data-code') === 'ZW');
type('atlantis');
check('no-match shows an empty state',
  !items().length && /No region matches/.test(doc.getElementById('regionList').textContent));
type('');
check('clearing search restores all five', items().length === 5);

/* ---------- switching region ---------- */
check('the coming-soon card is gone',
  !doc.getElementById('soonScrim') && !/This region is coming soon/.test(src));
click(w, item('KE'));
check('tapping another region persists it',
  w.localStorage.getItem('eatouts.region.v1') === 'KE', String(w.localStorage.getItem('eatouts.region.v1')));

/* the page leaves for the restaurants tab: jsdom cannot navigate, so the
   attempt is recorded as a jsdomError instead */
check('tapping a region hands off to index.html#restaurants',
  a.errors.some(e => /Not implemented: navigation|index\.html#restaurants/.test(e) ||
    /index\.html#restaurants/.test(w.location.href)),
  a.errors.join(' | ') + ' :: ' + w.location.href);

/* ---------- registry API ---------- */
const R = w.EatoutsRegions;
R.setActiveRegion('BW');            /* the tap above left Kenya stored */
check('registry exposes the eight regions', !!R && R.all().length === 8);
check('five regions are live, three are still listed only',
  R.all().filter(r => r.active).map(r => r.code).join(',') === 'BW,ZA,ZW,KE,MU',
  R.all().filter(r => r.active).map(r => r.code).join(','));
check('every live region names its own location file',
  R.all().filter(r => r.active).every(r => /_locations\.js$/.test(String(r.locations))),
  R.all().filter(r => r.active).map(r => r.locations).join(','));
check('getActiveRegion() falls back to Botswana', R.getActiveRegion().code === 'BW');
check('isActive is true for the four new regions',
  ['KE', 'MU', 'ZA', 'ZW'].every(c => R.isActive(c) === true));
check('isActive is false for Malawi, Nigeria and Ghana',
  R.isActive('MW') === false && R.isActive('NG') === false && R.isActive('GH') === false);
check('setActiveRegion refuses an inactive region',
  R.setActiveRegion('MW') === false && R.getActiveRegion().code === 'BW');
check('setActiveRegion accepts every live region',
  ['KE', 'MU', 'ZA', 'ZW', 'BW'].every(c => R.setActiveRegion(c) === true && R.getActiveRegion().code === c));

/* ---------- a stale stored region falls back ---------- */
const b = boot();
b.w.localStorage.setItem('eatouts.region.v1', 'MW');
const fallback = b.w.EatoutsRegions.getActiveRegion();
check('a stored inactive region falls back to BW', fallback && fallback.code === 'BW', fallback && fallback.code);
b.w.localStorage.setItem('eatouts.region.v1', 'XX');
check('an unknown stored code falls back to BW', b.w.EatoutsRegions.getActiveRegion().code === 'BW');

console.log('\nREGION-SELECTOR TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
process.exit(fails ? 1 : 0);
