#!/usr/bin/env node
/**
 * brand-kit-admin.html — platform-admin brand/design console.
 *
 * Boots with no EatoutsAuth session and asserts the prototype-open guard,
 * the four tabs, a seeded job appearing in the Jobs table, and the roster /
 * payouts / services tabs. Also guards the admin-dashboard entry card and the
 * (previously broken) login link in the access-denied card.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];

function inline(file) {
  const html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push(file + ' missing script: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
}

const SEED_JOB = {
  id: 'JOB-KIT1',
  business_name: 'Test Bistro',
  business_whatsapp: '26770000000',
  service_id: 'svc_logo_cleanup',
  service_category: 'identity',
  service_name: 'Logo clean-up',
  designer_id: 'designer_neoframe',
  total: 250,
  base_price: 250,
  is_recurring: false,
  slot_type: 'project',
  status: 'awaiting_admin',
  payout_status: 'pending',
  brief: { industry: 'Food', likes: 'Bold', dislikes: 'Neon', references: [] },
  price_breakdown: { gross: 250, platform_cut: 37.5, designer_payout: 212.5 },
  created_at: Date.now(),
  updated_at: Date.now()
};

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(inline('brand-kit-admin.html'), {
  url: 'http://localhost/brand-kit-admin.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) {
    w.open = () => null;
    w.alert = () => null;
    w.confirm = () => true;
    w.prompt = () => null;
    w.localStorage.setItem('eatouts_jobs_v1', JSON.stringify([SEED_JOB]));
  }
});
const { window } = dom;
const doc = window.document;
const click = el => { if (el) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const app = () => doc.getElementById('app');
const setTab = name => { click(doc.querySelector('.tabs [data-tab="' + name + '"]')); };

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- guard + chrome ---------- */
  check('no session shows local preview mode', doc.getElementById('mode-note').textContent === 'Local preview mode', doc.getElementById('mode-note').textContent);
  check('four admin tabs render', doc.querySelectorAll('.tabs .tab').length === 4, doc.querySelectorAll('.tabs .tab').length);
  check('jobs tab is active by default', doc.querySelector('.tabs [data-tab="jobs"]').classList.contains('active'));

  /* ---------- jobs tab ---------- */
  const headings = Array.from(doc.querySelectorAll('#app h2')).map(h => h.textContent);
  check('jobs tab heading counts the seeded job', headings.some(t => /Brand & design jobs \(1\)/.test(t)), headings.join(' | '));
  const row = doc.querySelector('#app table tbody tr');
  check('jobs table renders the seeded job', !!row && /Test Bistro/.test(row.textContent), row ? row.textContent.slice(0, 40) : 'no row');
  check('jobs table shows the awaiting-admin status', !!row && /Awaiting admin/.test(row.textContent));

  /* ---------- designers tab ---------- */
  setTab('designers');
  check('designers tab heading renders', /Designer roster/.test(app().textContent));
  const avs = app().querySelectorAll('.ds-av-wrap');
  check('designer roster shows avatars (5)', avs.length === 5, avs.length);

  /* ---------- services tab ---------- */
  setTab('services');
  const svcH = Array.from(app().querySelectorAll('h2')).map(h => h.textContent);
  check('services tab lists the catalogue', svcH.some(t => /Service catalogue \(\d+\)/.test(t)) && /Logo clean-up/.test(app().textContent), svcH.join(' | '));

  /* ---------- payouts tab ---------- */
  setTab('payouts');
  check('payouts tab renders the reconciliation table', /Payout reconciliation/.test(app().textContent));

  /* ---------- static wiring guards ---------- */
  const adminDash = fs.readFileSync(path.join(APP_DIR, 'eatouts-admin-dashboard.html'), 'utf8');
  check('admin dashboard links to brand-kit-admin', /href="brand-kit-admin\.html"/.test(adminDash));
  const kitSrc = fs.readFileSync(path.join(APP_DIR, 'brand-kit-admin.html'), 'utf8');
  check('access-denied login link uses eatouts-login.html', /href="eatouts-login\.html"/.test(kitSrc) && !/eatouts_login\.html/.test(kitSrc));

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nBRAND-KIT-ADMIN TEST PASSED' : '\nBRAND-KIT-ADMIN TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
