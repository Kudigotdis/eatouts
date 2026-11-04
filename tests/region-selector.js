/**
 * EatOuts-Region.html + js/eatouts-regions.js — T22 coverage.
 *
 * Proves:
 *   - the page carries the PAGE banner / <title> / data-page the inventory
 *     validator demands, plus the standard EatOuts header and bottom nav;
 *   - every region in the registry renders with a real flag file behind it,
 *     Botswana marked as the active one;
 *   - search filters by name and by code, and says so when nothing matches;
 *   - tapping an inactive region opens the "coming soon" floating card
 *     (G3: 420px / 16px, plain X, closes on X, outside tap and Escape);
 *   - tapping the active region persists 'eatouts.region.v1' = BW;
 *   - the registry refuses to activate anything still flagged inactive.
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


/* ---------- every region renders ---------- */
const items = () => Array.from(doc.querySelectorAll('#regionList .rs-item'));
const item = code => doc.querySelector('#regionList .rs-item[data-code="' + code + '"]');
check('all eight registry regions render', items().length === 8, String(items().length));
check('regions render in registry order',
  items().map(b => b.getAttribute('data-code')).join(',') === 'BW,ZA,ZW,MW,KE,NG,GH,MU',
  items().map(b => b.getAttribute('data-code')).join(','));
check('Botswana is the active row',
  !!item('BW') && item('BW').getAttribute('aria-pressed') === 'true' && /Selected/.test(item('BW').textContent));
check('active row is marked, inactive rows are not',
  item('ZA').getAttribute('aria-pressed') === 'false' && /Coming soon/.test(item('ZA').textContent));
check('header echoes the active region code', doc.getElementById('regionCode').textContent === 'BW');

const flags = items().map(b => b.querySelector('.rs-flag').getAttribute('src'));
check('flags come from assets/flags/',
  flags.length === 8 && flags.every(s => /^assets\/flags\/[a-z]{2}\.png$/.test(s)), flags.join(','));
const missing = flags.map(s => path.join(APP_DIR, s.replace(/\//g, path.sep))).filter(f => !fs.existsSync(f));
check('every rendered flag file exists on disk', missing.length === 0, missing.join(', '));
check('flag alt text is the region name',
  item('KE').querySelector('.rs-flag').getAttribute('alt') === 'Kenya');

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
check('row name uses the 16px body size',
  w.getComputedStyle(item('BW').querySelector('.rs-name')).fontSize === '16px');

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
check('clearing search restores all eight', items().length === 8);

/* ---------- coming-soon card (G3) ---------- */
const scrim = doc.getElementById('soonScrim');
check('scrim starts closed', !scrim.classList.contains('open') && scrim.hidden);
click(w, item('ZA'));
check('tapping an inactive region opens the popup', scrim.classList.contains('open') && !scrim.hidden);
check('popup headline is the coming-soon line',
  /This region is coming soon\./.test(doc.getElementById('soonTitle').textContent));
check('popup body names the tapped region',
  /South Africa/.test(doc.getElementById('soonBody').textContent) &&
  /Botswana is the only region live today/.test(doc.getElementById('soonBody').textContent));
const scrimCs = w.getComputedStyle(scrim);
check('popup scrim is the centred flex layer',
  scrimCs.display === 'flex' && scrimCs.alignItems === 'center' && scrimCs.justifyContent === 'center',
  [scrimCs.display, scrimCs.alignItems, scrimCs.justifyContent].join(' / '));
const card = scrim.querySelector('.fpop');
const cs = w.getComputedStyle(card);
check('popup card is 420px wide with 16px corners', cs.maxWidth === '420px' && cs.borderRadius === '16px',
  cs.maxWidth + ' / ' + cs.borderRadius);
check('popup card is capped at 80dvh', /max-height:\s*80dvh/.test(src));
const x = card.querySelector('.fpop-hdr .fpop-x');
const xCs = x ? w.getComputedStyle(x) : null;
check('close is a plain X glyph, no beige circle',
  !!x && x.textContent.trim() === '\u00d7' && !!xCs &&
  (xCs.backgroundColor === 'transparent' || xCs.backgroundColor === 'rgba(0, 0, 0, 0)') &&
  (xCs.borderRadius === '' || xCs.borderRadius === '0px'),
  xCs ? [x.textContent.trim(), xCs.backgroundColor, xCs.borderRadius].join(' / ') : 'no .fpop-x');
check('no .fpop-close anywhere', !doc.querySelector('.fpop-close'));

click(w, x);
check('the X closes the popup', !scrim.classList.contains('open') && scrim.hidden);
click(w, item('ZW'));
click(w, scrim);
check('an outside tap closes the popup', !scrim.classList.contains('open'));
click(w, item('MW'));
key(w, doc, 'Escape');
check('Escape closes the popup', !scrim.classList.contains('open'));
click(w, item('KE'));
click(w, card.querySelector('.fpop-btn'));
check('the Got it button closes the popup', !scrim.classList.contains('open'));

/* ---------- selecting the active region ---------- */
click(w, item('BW'));
check('tapping the active region writes eatouts.region.v1',
  w.localStorage.getItem('eatouts.region.v1') === 'BW', String(w.localStorage.getItem('eatouts.region.v1')));
check('selecting does not open the popup', !scrim.classList.contains('open'));
check('Botswana stays the selected row',
  item('BW').getAttribute('aria-pressed') === 'true' && item('ZA').getAttribute('aria-pressed') === 'false');

/* ---------- registry API ---------- */
const R = w.EatoutsRegions;
check('registry exposes the eight regions', !!R && R.all().length === 8);
check('getActiveRegion() defaults to Botswana', R.getActiveRegion().code === 'BW');
check('isActive is true for BW and false for ZA', R.isActive('BW') === true && R.isActive('ZA') === false);
check('setActiveRegion refuses an inactive region',
  R.setActiveRegion('ZA') === false && R.getActiveRegion().code === 'BW');
check('setActiveRegion accepts BW', R.setActiveRegion('BW') === true && R.getActiveRegion().code === 'BW');

/* ---------- a stale stored region falls back ---------- */
const b = boot();
b.w.localStorage.setItem('eatouts.region.v1', 'ZA');
const fallback = b.w.EatoutsRegions.getActiveRegion();
check('a stored inactive region falls back to BW', fallback && fallback.code === 'BW', fallback && fallback.code);
b.w.localStorage.setItem('eatouts.region.v1', 'XX');
check('an unknown stored code falls back to BW', b.w.EatoutsRegions.getActiveRegion().code === 'BW');

console.log('\nREGION-SELECTOR TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
process.exit(fails ? 1 : 0);

type('');
check('clearing search restores all five', items().length === 5);
