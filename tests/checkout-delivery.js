#!/usr/bin/env node
/**
 * Checkout → delivery round-trip.
 *
 * Boots the standalone customer-delivery.html in jsdom with a seeded
 * eatouts_order_v1, drives the flow (method → area → plot → payment),
 * and asserts: the restaurant + order render, the delivery fee lands in
 * the grand total, the selection is written back to the shared key, and
 * the WhatsApp message carries the delivery section.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];

let html = fs.readFileSync(path.join(APP_DIR, 'customer-delivery.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
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
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
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

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- seeded render ---------- */
  const rname = doc.querySelector('.rcard .rname');
  check('restaurant card renders the seed name', rname && rname.textContent === 'Test Kitchen', rname && rname.textContent);
  const rmeta = doc.querySelector('.rcard .rmeta');
  check('restaurant card renders the seed meta', rmeta && rmeta.textContent.indexOf('Kgale View') > -1, rmeta && rmeta.textContent);
  const osumTot = doc.querySelector('.osum .osum-tot');
  check('order summary shows the seeded subtotal', osumTot && osumTot.textContent === 'P100.00', osumTot && osumTot.textContent);
  const osumItems = doc.querySelector('.osum .osum-items');
  check('order summary counts the items', osumItems && osumItems.textContent.indexOf('2 items') > -1, osumItems && osumItems.textContent);
  check('order summary offers a route back to the order', !!doc.querySelector('[data-act="backToOrder"]'));
  check('method accordion opens by default', !!doc.querySelector('.acc.open [data-acc="method"], .acc [data-acc="method"]'));

  /* ---------- choose Deliver Now ---------- */
  click(doc.querySelector('[data-act="pickMode"][data-val="now"]'));
  const osumAfterMode = doc.querySelector('.osum .osum-tot');
  check('no fee is added before an area is picked', osumAfterMode && osumAfterMode.textContent === 'P100.00', osumAfterMode && osumAfterMode.textContent);
  check('the now mode card is selected', !!doc.querySelector('[data-act="pickMode"][data-val="now"].on'));

  /* ---------- pick the area ---------- */
  click(doc.querySelector('[data-drp-open="area"]'));
  const areaOpt = doc.querySelector('[data-drp-pick="area"][data-drp-val="Kgale View"]');
  check('area dropdown offers Kgale View', !!areaOpt);
  click(areaOpt);
  const osumAfterArea = doc.querySelector('.osum .osum-tot');
  check('grand total now includes the P40 core fee', osumAfterArea && osumAfterArea.textContent === 'P140.00', osumAfterArea && osumAfterArea.textContent);
  check('destination summary resolved the tier', !!doc.querySelector('.osum') && doc.body.innerHTML.indexOf('Gaborone') > -1);

  /* ---------- address + payment ---------- */
  type(doc.querySelector('[data-field="plot"]'), '1234');
  click(doc.querySelector('[data-act="pickPay"][data-val="cash"]'));
  check('cash payment card is selected', !!doc.querySelector('[data-act="pickPay"][data-val="cash"].on'));

  /* ---------- review + WA message ---------- */
  const msgbox = doc.querySelector('.msgbox');
  check('complete order reveals the WhatsApp preview', !!msgbox, msgbox ? '' : 'no .msgbox');
  const msg = msgbox ? msgbox.textContent : '';
  check('WA message names the delivery type', msg.indexOf('DELIVERY TYPE') > -1 && msg.indexOf('Deliver Now') > -1, msg.slice(0, 80));
  check('WA message lists a P40 delivery fee', msg.indexOf('DELIVERY FEE: P40.00') > -1, msg.match(/DELIVERY FEE:[^\n]*/));
  check('WA message shows the P140 estimated total', msg.indexOf('ESTIMATED TOTAL: P140.00') > -1, msg.match(/ESTIMATED TOTAL:[^\n]*/));
  check('WA message carries the destination area', msg.indexOf('Area: Kgale View') > -1, msg.match(/Area:[^\n]*/));
  check('WA message records the payment preference', msg.indexOf('Cash on Delivery') > -1);
  const bar = doc.querySelector('#bar .btn.primary');
  check('bar button offers review & send with the total', bar && bar.textContent.indexOf('P140.00') > -1, bar && bar.textContent);

  /* ---------- persisted back into the shared key ---------- */
  const o = stored();
  check('shared key still holds the order', !!o && o.restaurant && o.restaurant.name === 'Test Kitchen');
  check('shared key gained a delivery block', !!o && !!o.delivery, o && JSON.stringify(o.delivery));
  if (o && o.delivery) {
    check('delivery mode persisted', o.delivery.mode === 'now', o.delivery.mode);
    check('delivery area persisted', o.delivery.area === 'Kgale View', o.delivery.area);
    check('delivery tier persisted', o.delivery.tier === 'core', o.delivery.tier);
    check('delivery fee persisted as 40', o.delivery.fee === 40, o.delivery.fee);
    check('delivery address persisted', o.delivery.address && o.delivery.address.plot === '1234', JSON.stringify(o.delivery.address));
    check('delivery payment persisted', o.delivery.payment === 'cash', o.delivery.payment);
  }

  /* ---------- switch to schedule ---------- */
  click(doc.querySelector('[data-act="pickMode"][data-val="schedule"]'));
  check('schedule card is now selected', !!doc.querySelector('[data-act="pickMode"][data-val="schedule"].on'));
  const osumAfterSchedule = doc.querySelector('.osum .osum-tot');
  check('schedule fee drops the total to P115.00', osumAfterSchedule && osumAfterSchedule.textContent === 'P115.00', osumAfterSchedule && osumAfterSchedule.textContent);
  const barIncomplete = doc.querySelector('#bar .btn.primary');
  check('bar asks for the missing window', barIncomplete && barIncomplete.textContent.indexOf('Complete') > -1, barIncomplete && barIncomplete.textContent);
  check('schedule section is rendered', !!doc.querySelector('[data-acc="schedule"]'));

  const slot = doc.querySelector('[data-act="pickSlot"]:not(.full):not([disabled])');
  check('an open delivery window is offered', !!slot);
  if (slot) {
    click(slot);
    const o2 = stored();
    check('window persisted after picking a slot', !!o2 && o2.delivery && !!o2.delivery.window, o2 && o2.delivery && o2.delivery.window);
    check('schedule fee persisted as 15', !!o2 && o2.delivery && o2.delivery.fee === 15, o2 && o2.delivery && o2.delivery.fee);
    const barReady = doc.querySelector('#bar .btn.primary');
    check('bar is ready to review once the window is set', barReady && barReady.textContent.indexOf('Review') > -1, barReady && barReady.textContent);
    const msg2 = doc.querySelector('.msgbox');
    check('WA message now carries the requested window', !!msg2 && msg2.textContent.indexOf('REQUESTED WINDOW') > -1);
  }

  /* ============================================================
     index.html side of the round-trip: restoreOrder() rebuilds the
     checkout from the shared key and deliverySummaryLine() feeds the
     fee back into the summary + WhatsApp message.
     ============================================================ */
  let idxHtml = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  idxHtml = idxHtml.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('index missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });

  const ORDER_WITH_DELIVERY = {
    v: 1, source: 'menu', savedAt: Date.now(),
    restaurant: { id: 'test-kitchen', name: 'Test Kitchen', meta: 'Gaborone · Kgale View', logo: null, whatsapp: '26771111111' },
    contact: { name: 'Kagiso', phone: '71100001', notes: 'Ring the bell' },
    menu: { restId: 'test-kitchen', cart: {} },
    bev: null,
    items: [{ name: 'Beef Burger', size: null, qty: 2, unit: 50, extras: [], lineTotal: 100 }],
    subtotal: 100, split: null,
    delivery: {
      mode: 'now', tier: 'core', area: 'Kgale View', fee: 40,
      date: '', window: '',
      recipient: { first: 'Kagiso', last: 'Sithole', name: 'Kagiso Sithole', phone: '+267 71100001', country: '+267', number: '71100001' },
      payment: 'cash', bank: '',
      address: { plot: '1234', street: '', propType: '', cond: {}, directions: '' }
    }
  };

  const idxVc = new VirtualConsole();
  idxVc.on('jsdomError', e => errors.push('index jsdomError: ' + (e.stack || e.message)));
  idxVc.on('error', (...a) => errors.push('index console.error: ' + a.join(' ')));

  const idxDom = new JSDOM(idxHtml, {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: idxVc,
    beforeParse(w) {
      w.localStorage.setItem('eatouts_order_v1', JSON.stringify(ORDER_WITH_DELIVERY));
    }
  });
  const iw = idxDom.window;
  const idxEval = s => iw.eval(s);

  const restored = idxEval('restoreOrder()');
  check('index restoreOrder() returns true', restored === true, restored);
  check('index restores the delivery block', idxEval('state.delivery && state.delivery.fee') === 40, idxEval('JSON.stringify(state.delivery)'));
  check('index restores the checkout view', idxEval('state.checkoutView') === true, idxEval('state.checkoutView'));
  const line = idxEval('JSON.stringify(deliverySummaryLine())');
  check('deliverySummaryLine() reflects the chosen delivery', !!line && line.indexOf('"fee":40') > -1, line);
  check('deliverySummaryLine() reads Deliver Now', !!line && line.indexOf('Deliver Now') > -1, line);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nCHECKOUT-DELIVERY TEST PASSED' : '\nCHECKOUT-DELIVERY TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);
