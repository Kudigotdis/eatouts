#!/usr/bin/env node
/**
 * T05 — customer-delivery redesign.
 *
 * Boots the standalone customer-delivery.html in jsdom and asserts the
 * T05 bullets: no .hdr-chip, one-line .osum, 3% grey accordion panel,
 * gated accordions + floating "choose a method first" popup, floating
 * area/property/bank dropdowns, centred directions hint, attach-location
 * button, me/someone-else toggle with recipient cards + viewer actions,
 * bank in .acc-val, full-page review with Edit/Delete, no "WhatsApp
 * Request" label and the "Add P#.## to P#.## for # items" bar.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];

let html = fs.readFileSync(path.join(APP_DIR, 'customer-delivery.html'), 'utf8');
const SOURCE = html;
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const SEED = {
  v: 1, source: 'menu', savedAt: Date.now(),
  restaurant: { id: 'test-kitchen', name: 'Test Kitchen', meta: 'Gaborone · Kgale View', logo: null, whatsapp: '26771111111' },
  contact: { name: '', phone: '', notes: '' },
  menu: { restId: 'test-kitchen', cart: {} },
  bev: null,
  items: [
    { name: 'Beef Burger', size: null, qty: 2, unit: 50, extras: [], lineTotal: 100 }
  ],
  subtotal: 100, split: null, delivery: null
};

const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  const msg = e && e.message ? e.message : String(e);
  if (/Not implemented: navigation/.test(msg)) return;
  errors.push('jsdomError: ' + (e && e.stack ? e.stack : msg));
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/customer-delivery.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.localStorage.setItem('eatouts_order_v1', JSON.stringify(SEED));
  }
});
const { window } = dom;
const doc = window.document;
const click = el => { if (!el) return; el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const type = (el, v) => { if (!el) return; el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); };
const stored = () => JSON.parse(window.localStorage.getItem('eatouts_order_v1') || 'null');
const accOf = key => {
  const hdr = doc.querySelector('[data-acc="' + key + '"]');
  return hdr ? hdr.closest('.acc') : null;
};

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- 1. header / 2. order summary ---------- */
  check('no .hdr-chip in the header', !doc.querySelector('.hdr-chip'));
  check('no .osum-back markup', !doc.querySelector('.osum-back') && SOURCE.indexOf('.osum-back') === -1);
  const line = doc.querySelector('.osum .osum-line');
  check('order summary puts total + count on one line',
    !!line && !!line.querySelector('.osum-tot') && !!line.querySelector('.osum-items'),
    line && line.textContent);
  check('order summary reads "P100.00 for 2 items"',
    !!line && /P100\.00/.test(line.textContent) && /for 2 items/.test(line.textContent),
    line && line.textContent);

  /* ---------- 3/4. accordion panel + open title ---------- */
  check('.acc sits on a 3% grey panel', /\.acc\{margin:12px 14px;background:rgba\(0,0,0,\.03\)/.test(SOURCE));
  check('.acc-title turns 5% grey when open', /\.acc\.open \.acc-title\{[^}]*background:rgba\(0,0,0,\.05\)/.test(SOURCE));

  /* ---------- 5. method gates the rest ---------- */
  check('lower accordions are locked before a method is chosen',
    ['dest', 'recip', 'pay', 'wa'].every(k => accOf(k) && accOf(k).classList.contains('locked')));
  check('method accordion is not locked', !!accOf('method') && !accOf('method').classList.contains('locked'));
  click(doc.querySelector('[data-acc="dest"]'));
  const pop = doc.getElementById('fpop');
  check('tapping a locked accordion floats a popup',
    !!pop && pop.classList.contains('on') && /Choose a delivery method first/.test(pop.textContent),
    pop && pop.textContent);
  check('locked accordion did not open', !!accOf('dest') && !accOf('dest').classList.contains('open'));
  click(doc.querySelector('[data-act="fpopClose"]'));
  check('popup closes', !pop.classList.contains('on'));

  /* ---------- unlock ---------- */
  click(doc.querySelector('[data-act="pickMode"][data-val="now"]'));
  check('choosing a method unlocks the lower accordions',
    ['dest', 'recip', 'pay', 'wa'].every(k => accOf(k) && !accOf(k).classList.contains('locked')));

  /* ---------- 6. destination ---------- */
  click(doc.querySelector('[data-acc="dest"]'));
  check('destination accordion opens after the method', accOf('dest').classList.contains('open'));
  click(doc.querySelector('[data-drp-open="area"]'));
  check('area dropdown floats (not inline)', !!doc.querySelector('.drp-list.open.float'));
  check('floating dropdown paints a scrim', !!doc.querySelector('.fpop-scrim.on'));
  click(doc.querySelector('[data-drp-pick="area"][data-drp-val="Kgale View"]'));
  check('picking an area closes the floating list', !doc.querySelector('.drp-list.open.float'));
  check('order summary picks up the fee', /P140\.00/.test((doc.querySelector('.osum-tot') || {}).textContent || ''));
  const hint = doc.querySelector('.fld .hint.centre');
  check('directions hint is centred with the exact copy',
    !!hint && hint.textContent === 'Help the delivery driver find you. Gate colour, road name, nearby landmark etc.',
    hint && hint.textContent);
  const gps = doc.querySelector('[data-act="pickGps"]');
  check('attach-location button renders', !!gps && /current location/.test(gps.textContent), gps && gps.textContent);
  check('attach-location button is light grey with dark grey text',
    /\.gps-btn\{[^}]*background:rgba\(0,0,0,\.05\)[^}]*color:#4a463c/.test(SOURCE));

  /* ---------- 7. recipient ---------- */
  check('recipient starts on "Me"',
    /Me · Kagiso Sithole/.test((doc.querySelector('[data-acc="recip"] .acc-val') || {}).textContent || ''),
    (doc.querySelector('[data-acc="recip"] .acc-val') || {}).textContent);
  click(doc.querySelector('[data-act="recipWho"][data-val="other"]'));
  check('someone-else toggle is a real toggle', !!doc.querySelector('[data-act="recipWho"][data-val="other"].on'));
  const cards = doc.querySelectorAll('.rcpt-card');
  check('recipient history renders recipient cards', cards.length === 2, cards.length);
  check('card thumb is a 90px square', /\.rcpt-thumb\{width:90px;height:90px/.test(SOURCE));
  check('card line 2 reads "# orders received"', /7 orders received/.test(cards[0] ? cards[0].textContent : ''),
    cards[0] && cards[0].textContent);
  click(doc.querySelector('[data-act="rcView"]'));
  check('tapping the thumb opens the enlarged image', !!doc.querySelector('#fpop .rcpt-view-hero'));
  check('viewer offers add image / edit / delete',
    !!doc.querySelector('[data-rcphoto]') && !!doc.querySelector('[data-act="rcEdit"]') && !!doc.querySelector('[data-act="rcDelete"]'));
  click(doc.querySelector('[data-act="rcEdit"]'));
  check('edit details offers first / surname / mobile inputs',
    !!doc.querySelector('[data-rcedit="first"]') && !!doc.querySelector('[data-rcedit="last"]') && !!doc.querySelector('[data-rcedit="number"]'));
  type(doc.querySelector('[data-rcedit="first"]'), 'Naledi-Edited');
  click(doc.querySelector('[data-act="rcSaveEdit"]'));
  const savedRc = JSON.parse(window.localStorage.getItem('eatouts_recipients_v1') || '[]');
  check('edited details persist to localStorage', !!savedRc.filter(r => r.first === 'Naledi-Edited')[0],
    JSON.stringify(savedRc[0]));
  click(doc.querySelector('[data-act="rcDelete"]'));
  check('deleting a recipient removes it from the list', doc.querySelectorAll('.rcpt-card').length === 1,
    doc.querySelectorAll('.rcpt-card').length);
  check('delete closes the viewer', !doc.getElementById('fpop').classList.contains('on'));

  /* ---------- new recipient form ---------- */
  click(doc.querySelector('[data-act="rcNew"]'));
  check('new-recipient form renders a photo picker', !!doc.querySelector('[data-newphoto]'));
  check('new-recipient form has a 150px hero thumb', /\.rcpt-hero\{width:150px;height:150px/.test(SOURCE));
  check('new-recipient form asks for name + gender + mobile',
    !!doc.querySelector('[data-newrec="first"]') && !!doc.querySelector('[data-newrec="last"]') &&
    !!doc.querySelector('[data-newrec="number"]') && /Gender/.test(accOf('recip').textContent));
  type(doc.querySelector('[data-newrec="first"]'), 'Kabelo');
  type(doc.querySelector('[data-newrec="last"]'), 'Phiri');
  type(doc.querySelector('[data-newrec="number"]'), '72555000');
  click(doc.querySelector('[data-act="rcSaveNew"]'));
  check('photo is mandatory before saving', /Add a photo of the recipient/.test(doc.getElementById('fpop').textContent),
    doc.getElementById('fpop').textContent);
  click(doc.querySelector('[data-act="fpopClose"]'));

  /* ---------- select a card ---------- */
  click(doc.querySelector('[data-act="rcPick"]'));
  check('.acc-val shows the selected recipient name',
    /Thabo Dube/.test((doc.querySelector('[data-acc="recip"] .acc-val') || {}).textContent || ''),
    (doc.querySelector('[data-acc="recip"] .acc-val') || {}).textContent);
  check('selected recipient persists back into the shared order',
    !!stored().delivery && !!stored().delivery.recipient && stored().delivery.recipient.first === 'Thabo');

  /* ---------- 8. payment ---------- */
  click(doc.querySelector('[data-acc="pay"]'));
  click(doc.querySelector('[data-act="pickPay"][data-val="card"]'));
  check('card payment reveals the bank picker', !!doc.querySelector('[data-drp-open="bank"]'));
  click(doc.querySelector('[data-drp-open="bank"]'));
  check('bank picker floats', !!doc.querySelector('.drp-list.open.float'));
  click(doc.querySelector('[data-drp-pick="bank"]'));
  const bankVal = (doc.querySelector('[data-acc="pay"] .acc-val') || {}).textContent || '';
  check('.acc-val shows the chosen bank', /Bank/.test(bankVal), bankVal);
  const payText = doc.querySelector('[data-acc="pay"]') ? doc.querySelector('[data-acc="pay"]').textContent : '';
  check('no "Payment preference recorded" copy', payText.indexOf('Payment preference recorded') === -1);
  check('no hint under the bank picker', !doc.querySelector('[data-acc="pay"] .hint'));

  /* ---------- 9. review page ---------- */
  const review = doc.getElementById('reviewPage');
  check('review is a full page block, not an accordion',
    !!review && !review.classList.contains('acc') && !doc.querySelector('[data-acc="review"]'));
  const reviewActs = review
    ? Array.prototype.map.call(review.querySelectorAll('[data-act]'), e => e.getAttribute('data-act'))
    : [];
  check('review ends with Edit + Delete', reviewActs.slice(-2).join(',') === 'reviewEdit,reviewDelete', reviewActs.join(','));
  check('review lists delivery + recipient + payment',
    !!review && /Delivery Review/.test(review.textContent) && /Recipient/.test(review.textContent) && /Payment/.test(review.textContent));

  /* ---------- 10. WhatsApp label ---------- */
  check('"WhatsApp Request" label is gone', SOURCE.indexOf('WhatsApp Request') === -1);

  /* ---------- 11. bar ---------- */
  const bar = doc.querySelector('#bar .btn.primary');
  check('bar reads "Add P#.## to P#.## for # items"',
    !!bar && /^Add P\d+\.\d{2} to P\d+\.\d{2} for \d+ items?$/.test(bar.textContent), bar && bar.textContent);

  /* ---------- review delete resets the flow ---------- */
  click(doc.querySelector('[data-act="reviewDelete"]'));
  check('delete clears the selected mode', !doc.querySelector('[data-act="pickMode"][data-val="now"].on'));
  check('delete restores the plain subtotal',
    /P100\.00/.test((doc.querySelector('.osum') || {}).textContent || '') &&
    /for 2 items/.test((doc.querySelector('.osum') || {}).textContent || ''),
    (doc.querySelector('.osum') || {}).textContent);
  check('delete re-locks the lower accordions', !!accOf('dest') && accOf('dest').classList.contains('locked'));
  check('delete removes the delivery block from the shared order', !stored().delivery, JSON.stringify(stored().delivery));
  check('bar returns to "Choose a delivery method"',
    /Choose a delivery method/.test((doc.querySelector('#bar .btn.primary') || {}).textContent || ''));

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nCUSTOMER-DELIVERY TEST PASSED' : '\nCUSTOMER-DELIVERY TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);



