/* D3: one definition of money.
   js/eatouts-analytics.js owns money() / sumMoney(); the dashboards must call
   them instead of hand-rolled reduce()s, which is how a single string price
   turned a total into "0NaN" or "1050" concatenation.

   Runs the real js/eatouts-analytics.js in jsdom (no mock), then checks the
   four dashboard pages that used to sum money inline. */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const SRC = path.join(APP_DIR, 'js', 'eatouts-analytics.js');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'outside-only'
});
dom.window.eval(fs.readFileSync(SRC, 'utf8'));
const A = dom.window.EatoutsAnalytics;

check('eatouts-analytics.js booted', !!A);
check('money + sumMoney are exported', typeof A.money === 'function' && typeof A.sumMoney === 'function');

/* ---------- money() ---------- */
console.log('\n-- money() --');
check('money keeps a number', A.money(1250.5) === 1250.5);
check('money parses a numeric string', A.money('19.99') === 19.99);
check('money(null) is 0', A.money(null) === 0);
check('money(undefined) is 0', A.money(undefined) === 0);
check('money("") is 0', A.money('') === 0);
check('money("abc") is 0, never NaN', A.money('abc') === 0);
check('money(NaN) is 0', A.money(NaN) === 0);
check('money(Infinity) is 0', A.money(Infinity) === 0);
check('money("1e999") is 0', A.money('1e999') === 0);
check('money(true) is 1 (Number semantics, documented not hidden)', A.money(true) === 1);

/* ---------- sumMoney() ---------- */
console.log('\n-- sumMoney() --');
const mixed = [{ total: 10 }, { total: '5' }, { total: null }, { total: 'abc' }, {}];
check('sumMoney skips null/blank/garbage', A.sumMoney(mixed, 'total') === 15, String(A.sumMoney(mixed, 'total')));
check('sumMoney([]) is 0', A.sumMoney([], 'total') === 0);
check('sumMoney(undefined) is 0', A.sumMoney(undefined, 'total') === 0);
check('sumMoney ignores falsy rows', A.sumMoney([null, { total: 4 }, undefined], 'total') === 4);
const legacy = [{ total: 10 }, { grandTotal: 7 }, { total: '', grandTotal: 3 }, { total: 'x', grandTotal: '2' }];
check('sumMoney uses the alt column when total is blank', A.sumMoney(legacy, 'total', 'grandTotal') === 20,
  String(A.sumMoney(legacy, 'total', 'grandTotal')));
check('sumMoney does not fall back to alt when total is present but garbage',
  A.sumMoney([{ total: 'x', grandTotal: 2 }], 'total', 'grandTotal') === 0);
check('sumMoney prefers total over alt', A.sumMoney([{ total: 5, grandTotal: 99 }], 'total', 'grandTotal') === 5);
const strTotals = [{ total: '100' }, { total: '250' }];
check('sumMoney adds strings as numbers, not concatenation', A.sumMoney(strTotals, 'total') === 350,
  String(A.sumMoney(strTotals, 'total')));

/* sum() is NOT money and stays as it was: it sums non-price fields (stars). */
check('sum() still sums plain fields', A.sum([{ stars: 4 }, { stars: 2 }], 'stars') === 6);

/* ---------- the dashboards call it ---------- */
console.log('\n-- dashboards use sumMoney() --');
const PAGES = [
  'analytics-manager.html',
  'operator-dashboard1.html',
  'eatouts-staff-admin1.html',
  'eatouts-platform-analytics.html'
];
PAGES.forEach((page) => {
  const html = fs.readFileSync(path.join(APP_DIR, page), 'utf8');
  check(page + ' loads js/eatouts-analytics.js', html.indexOf('js/eatouts-analytics.js') > -1);
  check(page + ' calls sumMoney()', html.indexOf('sumMoney(') > -1);
});
check('analytics-manager.html no longer sums totals inline',
  fs.readFileSync(path.join(APP_DIR, 'analytics-manager.html'), 'utf8').indexOf('o.reduce((s,x)=>s+x.total,0)') === -1);
check('operator-dashboard1.html no longer sums money inline',
  fs.readFileSync(path.join(APP_DIR, 'operator-dashboard1.html'), 'utf8').indexOf('todayOrders.reduce(') === -1);
check('eatouts-staff-admin1.html no longer sums money inline',
  fs.readFileSync(path.join(APP_DIR, 'eatouts-staff-admin1.html'), 'utf8').indexOf('orders.reduce(function(n,o){ return n + Number(o.total') === -1);
check('eatouts-platform-analytics.html no longer sums money inline',
  fs.readFileSync(path.join(APP_DIR, 'eatouts-platform-analytics.html'), 'utf8').indexOf('orders.reduce(function(s,x){ return s + Number(x.total') === -1);

console.log('');
console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
process.exit(fails ? 1 : 0);
