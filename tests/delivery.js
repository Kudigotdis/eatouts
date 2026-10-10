#!/usr/bin/env node
/**
 * Delivery zones — unit checks for assets/data/delivery_zones.js.
 *
 * Loaded through jsdom so the file runs the same way it does in the
 * browser (it attaches window.EatoutsDelivery). The root package is
 * "type":"module", so a plain require() would treat the file as ESM.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(APP_DIR, 'assets', 'data', 'delivery_zones.js'), 'utf8');

const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'dangerously'
});
dom.window.eval(src);

const API = dom.window.EatoutsDelivery;

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

check('exposes window.EatoutsDelivery', !!API);
if (!API) {
  console.log('');
  console.log('DELIVERY TEST FAILED');
  process.exit(1);
}

/* ---------- modes ---------- */
const modes = API.modes();
check('exposes two delivery modes', modes.length === 2, modes.length);
check('mode ids are now + schedule', modes.map(m => m.id).join(',') === 'now,schedule', modes.map(m => m.id));
const now = modes.filter(m => m.id === 'now')[0];
const schedule = modes.filter(m => m.id === 'schedule')[0];
check('Deliver Now fees core 40 / peripheral 60', now.fees.core === 40 && now.fees.peripheral === 60, JSON.stringify(now.fees));
check('Schedule fees core 15 / peripheral 30', schedule.fees.core === 15 && schedule.fees.peripheral === 30, JSON.stringify(schedule.fees));

/* ---------- tierFor ---------- */
const core = API.tierFor('Kgale View');
check('Kgale View resolves to the core tier', core && core.id === 'core', core && core.id);
const periph = API.tierFor('Phakalane Ext 97');
check('Phakalane Ext 97 resolves to peripheral', periph && periph.id === 'peripheral', periph && periph.id);
check('tierFor is case/space tolerant', (API.tierFor('  kgale   view ') || {}).id === 'core');
check('unknown area resolves to null', API.tierFor('Nowhereville 9') === null);
check('empty name resolves to null', API.tierFor('') === null);

/* ---------- feeFor ---------- */
check('feeFor Kgale View / now = 40', API.feeFor('Kgale View', 'now') === 40, API.feeFor('Kgale View', 'now'));
check('feeFor Kgale View / schedule = 15', API.feeFor('Kgale View', 'schedule') === 15, API.feeFor('Kgale View', 'schedule'));
check('feeFor Phakalane / now = 60', API.feeFor('Phakalane Ext 97', 'now') === 60, API.feeFor('Phakalane Ext 97', 'now'));
check('feeFor Phakalane / schedule = 30', API.feeFor('Phakalane Ext 97', 'schedule') === 30, API.feeFor('Phakalane Ext 97', 'schedule'));
check('feeFor unknown area = null', API.feeFor('Nowhereville 9', 'now') === null);
check('feeFor defaults to the now mode', API.feeFor('Kgale View') === 40);

/* ---------- allAreas ---------- */
const areas = API.allAreas();
check('allAreas is non-empty', areas.length > 0, areas.length);
check('every area resolves a tier', areas.every(a => a.tierId === 'core' || a.tierId === 'peripheral'));
check('every area carries both mode fees', areas.every(a => typeof a.fees.now === 'number' && typeof a.fees.schedule === 'number'));
check('every area carries a group name', areas.every(a => !!a.group));
check('core areas are all P40 on now', areas.filter(a => a.tierId === 'core').every(a => a.fees.now === 40));
check('peripheral areas are all P60 on now', areas.filter(a => a.tierId === 'peripheral').every(a => a.fees.now === 60));

/* ---------- zonesIn ---------- */
check('zonesIn(core) returns groups', API.zonesIn('core').length > 0);
check('zonesIn of an unknown tier is empty', API.zonesIn('nope').length === 0);

console.log('');
console.log(fails === 0 ? 'DELIVERY TEST PASSED' : 'DELIVERY TEST FAILED (' + fails + ' checks)');
process.exit(fails === 0 ? 0 : 1);
