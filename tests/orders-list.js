#!/usr/bin/env node
/**
 * Orders-List.html (T06).
 *
 * Boots the page in jsdom with the real js/eatouts-customer.js, seeds the
 * local store with three saved summaries from two places, and asserts the
 * header counter, the Order Groups, the Order Summary Cards, the tap target
 * and the empty state.
 *
 * Usage:  node tests/orders-list.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

let html = fs.readFileSync(path.join(APP_DIR, 'Orders-List.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const SEED = {
  user: { id: 'u1', name: 'Kagiso', phone: '71100001' },
  favourites: [], events: [], addresses: [],
  summaries: [
    { id: 'sum_1', orderRef: 'pizza-perfect', venueName: 'Pizza Perfect',
      venueLogo: 'assets/logo/EatOuts_Logo.png', itemCount: 3, total: 245,
      created_at: Date.now() - 3600000, payload: { items: [] } },
    { id: 'sum_2', orderRef: 'pizza-perfect', venueName: 'Pizza Perfect',
      itemCount: 1, total: 60, created_at: Date.now() - 120000, payload: { items: [] } },
    { id: 'sum_3', orderRef: 'bottle-x', venueName: 'The Bottle Store',
      itemCount: 2, total: 180, created_at: Date.now() - 172800000, payload: { items: [] } }
  ]
};

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/Orders-List.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) { w.localStorage.setItem('eatouts_customer_v1', JSON.stringify(SEED)); }
});
const w = dom.window;
const d = w.document;
const q = sel => d.querySelector(sel);
const all = sel => Array.from(d.querySelectorAll(sel));

setTimeout(() => {
  const counter = d.getElementById('ordCount');

  check('page slug is Orders-List', d.body.getAttribute('data-page') === 'Orders-List');
  check('standard header present', !!d.getElementById('hdr') && !!q('#hdr .brand-mark'));
  check('header counter visible for a signed-in user', !!counter && !counter.hasAttribute('hidden'));
  check('counter shows the store count', !!counter && counter.textContent === '3', counter && counter.textContent);

  const grps = all('.grp');
  check('one Order Group per place', grps.length === 2, grps.length);
  check('newest place first', !!grps[0] && /Pizza Perfect/.test(grps[0].textContent));
  check('group header counts its orders', !!grps[0] && /2 orders/.test(grps[0].textContent));
  check('every summary has a card', all('.osum-card').length === 3);

  const card = q('.osum-card');
  check('newest summary is the first card', !!card && card.getAttribute('data-open') === 'sum_2',
    card && card.getAttribute('data-open'));
  check('card shows item count + total', !!card && /1 item · P60\.00/.test(card.textContent),
    card && card.textContent);
  check('card thumb borrows the group logo', !!card && !!card.querySelector('.osum-thumb img'));
  check('cards open the saved summary',
    !!card && card.getAttribute('data-open') !== '' &&
      /eatouts-checkout-summary\.html\?id=/.test(fs.readFileSync(path.join(APP_DIR, 'Orders-List.html'), 'utf8')));
  check('no bottom-nav tab is marked active', all('.appnav .on').length === 0);

  /* store changes elsewhere (another tab / another page) */
  w.localStorage.setItem('eatouts_customer_v1',
    JSON.stringify({ user: null, favourites: [], events: [], addresses: [], summaries: [] }));
  w.dispatchEvent(new w.Event('storage'));
  const empty = q('.empty');
  check('storage event repaints the empty state', !!empty && /Sign in/.test(empty.textContent),
    empty && empty.textContent);
  check('counter hidden for a browser', counter.hasAttribute('hidden'));

  /* T06b: the counter widget on the #hdr pages that carry a customer session */
  const BADGE_PAGES = ['index.html', 'eatout_event_builder.html', 'eatouts-login.html', 'operator-businesses.html'];
  BADGE_PAGES.forEach(file => {
    const src = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
    check(file + ' has the orders counter slot', /id="ordCount"[^>]*data-act="ordersCount"/.test(src));
    check(file + ' loads the orders badge', src.includes('js/eatouts-orders-badge.js'));
  });

  /* T06c: no page-label chip survives inside an #hdr block */
  const hdrPages = fs.readdirSync(APP_DIR).filter(f => f.endsWith('.html'))
    .filter(f => /id="hdr"/.test(fs.readFileSync(path.join(APP_DIR, f), 'utf8')));
  const dirty = hdrPages.filter(f => /hdr-chip/.test(fs.readFileSync(path.join(APP_DIR, f), 'utf8')));
  check('every #hdr page is free of .hdr-chip', dirty.length === 0, dirty.join(','));

  /* the badge itself: hidden for browsers, count for signed-in users */
  const badgeHtml = '<!doctype html><body><header id="hdr"><div class="hdr-right">' +
    '<button id="ordCount" data-act="ordersCount" hidden>0</button></div></header></body>';
  const badgeSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-orders-badge.js'), 'utf8');
  let fakeUser = null;
  const badgeDom = new JSDOM(badgeHtml.replace('</body>', '<script>' + badgeSrc + '</script></body>'), {
    url: 'http://localhost/x.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.EatoutsCustomer = {
        getUser: function () { return fakeUser; },
        summaries: { list: function () { return [{ id: 'a' }, { id: 'b' }]; } },
        refresh: function () { },
        reloadLocal: function () { }
      };
    }
  });
  const bw = badgeDom.window, bel = bw.document.getElementById('ordCount');
  check('badge stays hidden for a browser', bel.hasAttribute('hidden'));
  fakeUser = { id: 'u1' };
  bw.EatoutsOrdersBadge.paint();
  check('badge shows the count when signed in', !bel.hasAttribute('hidden') && bel.textContent === '2',
    bel.textContent);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 5).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log('\n' + checks + ' checks, ' + fails + ' failed');
  console.log(fails === 0 && errors.length === 0 ? 'ORDERS-LIST TEST PASSED' : 'ORDERS-LIST TEST FAILED (' + fails + ')');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 400);
