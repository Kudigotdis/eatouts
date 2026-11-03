#!/usr/bin/env node
/**
 * Standalone Back History (T08b) - js/eatouts-back-history.js.
 *
 * Boots two real pages in jsdom (customer-delivery, venue-about) with the
 * shared script inlined and asserts:
 *   - the header logo is a button wired to data-act="backHistory";
 *   - a page records itself into eatouts.history.v1 on load;
 *   - tapping the logo opens the shared "Recent pages" popup, with a label
 *     and a relative timestamp per row;
 *   - the scrim, Escape and a row tap all close it;
 *   - the entry cap (5) and revisit dedupe hold;
 *   - target() sends standalone entries to their URL and SPA snapshots to
 *     index.html#<tab>;
 *   - every standard-header page loads the script and wires the button.
 *
 * Usage:  node tests/back-history.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const KEY = 'eatouts.history.v1';
const errors = [];
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function boot(file, seed) {
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const msg = e && e.message ? e.message : String(e);
    /* jsdom cannot navigate: venue-about.html calls location.replace() on boot */
    if (/Not implemented: navigation/.test(msg)) return;
    errors.push('jsdomError: ' + (e && e.stack ? e.stack : msg));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  return new JSDOM(html, {
    url: 'http://localhost/' + file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) { if (seed) w.sessionStorage.setItem(KEY, JSON.stringify(seed)); }
  });
}

const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

const dom = boot('customer-delivery.html');
const w = dom.window;
const d = w.document;

setTimeout(() => {
  const logo = d.querySelector('#hdr .brand-mark');

  check('the page carries the standard header', !!d.getElementById('hdr'));
  check('logo is a button, not a link', !!logo && logo.tagName === 'BUTTON', logo && logo.tagName);
  check('logo carries the T08b action', !!logo && logo.getAttribute('data-act') === 'backHistory');
  check('logo keeps its accessible name', !!logo && /EatOuts home/.test(logo.getAttribute('aria-label') || ''));
  check('the shared script is loaded', !!w.EatoutsBackHistory);

  const store = JSON.parse(w.sessionStorage.getItem(KEY) || '[]');
  check('the page recorded itself on load', store.length === 1 && store[0].href === 'customer-delivery.html',
    JSON.stringify(store));
  check('the label comes from the document title', !!store[0] && store[0].label === 'Delivery',
    store[0] && store[0].label);

  click(w, logo);
  const pop = d.getElementById('hist-pop');
  check('tapping the logo opens the popup', !!pop);
  check('popup heading is "Recent pages"', !!pop && /Recent pages/.test(pop.textContent));
  check('popup CSS is injected once', !!d.getElementById('eo-hist-css') &&
    d.querySelectorAll('#eo-hist-css').length === 1);
  check('no beige close circle inside', !d.querySelector('#hist-pop .fpop-close'));

  const rows = Array.from(d.querySelectorAll('#hist-pop .hist-row'));
  check('one row per recorded page', rows.length === 1, rows.length);
  check('row shows the page label', !!rows[0] && /Delivery/.test((rows[0].querySelector('.lab') || {}).textContent || ''));
  check('row shows a relative time', !!rows[0] && (rows[0].querySelector('.ago') || {}).textContent === 'now');

  click(w, d.querySelector('#hist-pop .hist-scrim'));
  check('scrim tap closes the popup', !d.getElementById('hist-pop'));

  click(w, logo);
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Escape closes the popup', !d.getElementById('hist-pop'));

  check('row tap target: standalone entry -> its own url',
    w.EatoutsBackHistory.target({ href: 'venue-about.html' }) === 'venue-about.html');
  check('row tap target: SPA snapshot -> index.html#tab',
    w.EatoutsBackHistory.target({ key: 'x', label: 'Gallery', snap: { tab: 'gallery' } }) === 'index.html#gallery');
  check('row tap target: snapshot without a tab -> promos',
    w.EatoutsBackHistory.target({ key: 'x', label: 'EatOuts', snap: {} }) === 'index.html#promos');

  w.sessionStorage.removeItem(KEY);
  w.EatoutsBackHistory.open();
  check('empty state reads "No recent pages yet."',
    /No recent pages yet\./.test((d.getElementById('hist-pop') || {}).textContent || ''));
  w.EatoutsBackHistory.close();

  done();
}, 60);


/* cap + dedupe: six seeded entries, one of them the page under test */
function done() {
  const old = Date.now() - 3600000;
  const seed = [
    { href: 'index.html#promos', label: 'Promos', t: old },
    { href: 'venue-about.html', label: 'Venue about', t: old },
    { href: 'eatouts-login.html', label: 'Sign in', t: old },
    { href: 'pricing.html', label: 'Pricing', t: old },
    { href: 'get-started.html', label: 'Get started', t: old },
    { href: '404.html', label: 'Not found', t: old }
  ];
  const dom2 = boot('venue-about.html', seed);
  const w2 = dom2.window;

  setTimeout(() => {
    const list = w2.EatoutsBackHistory.read();
    check('the store is capped at five entries', list.length === 5, list.length);
    check('a revisit moves to the top without duplicating',
      list[0].href === 'venue-about.html' &&
        list.filter(e => e.href === 'venue-about.html').length === 1,
      JSON.stringify(list.map(e => e.href)));
    check('the revisited entry is stamped now', list[0].t > old);

    /* parity sweep: no page may keep the old bar, every logo must be wired */
    const pages = fs.readdirSync(APP_DIR).filter(f => f.endsWith('.html'));
    const src = f => fs.readFileSync(path.join(APP_DIR, f), 'utf8');
    const legacy = pages.filter(f => /class="topbar"|topbar-row|hdr-chip/.test(src(f)));
    check('no page keeps the old .topbar / .topbar-row / .hdr-chip', legacy.length === 0, legacy.join(','));
    const branded = pages.filter(f => /class="brand-mark"/.test(src(f)) && f !== 'index.html');
    check('fifty-seven pages carry the standard brand mark', branded.length === 57, branded.length);
    const unwired = branded.filter(f => !(/data-act="backHistory"/.test(src(f)) &&
      src(f).includes('js/eatouts-back-history.js')));
    check('every standard-header page wires the button and loads the script',
      unwired.length === 0, unwired.join(','));
    const odd = pages.filter(f => /<header/.test(src(f)) && !/<header id="hdr"/.test(src(f)));
    check('only the two .top pages keep a bespoke header', odd.length === 2, odd.join(','));

    const indexSrc = src('index.html');
    check('index.html keeps its own SPA copy of the popup',
      indexSrc.includes('eatouts.history.v1') && indexSrc.includes('renderBackHistory'));

    check('no window errors', errors.length === 0, errors.slice(0, 3).join(' | '));

    console.log('\n' + (fails === 0 ? 'BACK-HISTORY PASSED' : 'BACK-HISTORY FAILED (' + fails + ')') +
      '  (' + checks + ' checks)');
    process.exit(fails ? 1 : 0);
  }, 60);
}
