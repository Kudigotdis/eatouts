#!/usr/bin/env node
/**
 * eatouts-profile.html — "My design requests" module (T21 step 8).
 *
 * Boots the profile page for a signed-in customer and asserts the module
 * lists only that customer's requests from `eatouts_jobs_v1` (by
 * `customer_id`, or by WhatsApp number for requests sent before accounts
 * were required), with the right status labels, and that a customer with no
 * requests gets the empty state plus the catalogue link.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

function inline(file) {
  const html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing ' + src + ' -->';
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
}

const PAGE = inline('eatouts-profile.html');
const USER = {
  id: 'u-design-test', firstName: 'Tumi', surname: 'Molefe', whatsapp: '71234567',
  type: 'customer', roles: ['customer'], status: 'active'
};
const DAY = 86400000;

function boot(jobs) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

  const dom = new JSDOM(PAGE, {
    url: 'http://localhost/eatouts-profile.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem('eatouts_manager_v1', JSON.stringify({
        users: [USER],
        settings: { whatsapp: '26771844129', currency: 'BWP' }
      }));
      /* a signed-in customer: the same keys EatoutsAuth.startSession() writes */
      w.localStorage.setItem('eatouts_auth_session_v1', USER.id);
      w.localStorage.setItem('eatouts_active_session_v2', USER.id);
      if (jobs) w.localStorage.setItem('eatouts_jobs_v1', JSON.stringify({ jobs }));
    }
  });

  return { dom, window: dom.window, doc: dom.window.document, errors };
}

const job = (o) => Object.assign({
  service_id: 'svc_brand_kit', service_category: 'identity', service_name: 'Brand Kit',
  is_recurring: false, business_name: 'Test Bistro', business_whatsapp: '26771234567',
  base_price: 1500, add_ons: [], total: 1500,
  price_breakdown: { gross: 1500, platform_cut: 225, designer_payout: 1275 },
  designer_id: 'designer_neoframe', slot_type: 'project', status: 'awaiting_admin',
  brief: { industry: '', likes: '', dislikes: '', references: [] },
  created_at: Date.now(), updated_at: Date.now()
}, o);

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

/* a customer with two requests, plus another customer's request */
const a = boot([
  job({ id: 'JOB-AAA111', customer_id: USER.id, status: 'awaiting_admin', total: 1500, created_at: Date.now() }),
  job({ id: 'JOB-BBB222', customer_id: 'someone-else', service_name: 'Menu Refresh', business_whatsapp: '26799999999', status: 'closed', total: 400, created_at: Date.now() - DAY }),
  job({ id: 'JOB-CCC333', service_name: 'Promo Pack', business_whatsapp: '26771234567', status: 'in_progress', total: 300, created_at: Date.now() - 2 * DAY })
]);

/* a customer with none */
const b = boot([]);
setTimeout(() => {
  /* ---------- the module is wired into the profile ---------- */
  const sec = a.doc.querySelector('.acc[data-key="designs"]');
  check('profile has a My design requests section', !!sec);
  check('section title is My design requests',
    /My design requests/.test((sec && sec.querySelector('.acc-title b') || {}).textContent || ''),
    sec && (sec.querySelector('.acc-title b') || {}).textContent);
  check('section subtitle counts the requests',
    ((sec && sec.querySelector('.acc-sub') || {}).textContent || '') === '2 requests',
    sec && (sec.querySelector('.acc-sub') || {}).textContent);

  /* ---------- only this customer's requests ---------- */
  const rows = Array.from(a.doc.querySelectorAll('.acc[data-key="designs"] .dreq'));
  check('module lists two requests', rows.length === 2, rows.length);
  check('rows are newest first',
    rows.map(r => r.getAttribute('data-job')).join(',') === 'JOB-AAA111,JOB-CCC333',
    rows.map(r => r.getAttribute('data-job')).join(','));
  check('another customer\'s request is not listed', !a.doc.querySelector('.dreq[data-job="JOB-BBB222"]'));
  check('a request without customer_id still matches on the number',
    !!a.doc.querySelector('.dreq[data-job="JOB-CCC333"]'));

  /* ---------- row content ---------- */
  const first = rows[0] || { querySelector: () => null, textContent: '' };
  check('row shows the service name', /Brand Kit/.test((first.querySelector('.dreq-top b') || {}).textContent || ''),
    (first.querySelector('.dreq-top b') || {}).textContent);
  check('awaiting_admin reads With EatOuts',
    ((first.querySelector('.dreq-st') || {}).textContent || '') === 'With EatOuts',
    (first.querySelector('.dreq-st') || {}).textContent);
  check('awaiting_admin pill is the waiting tone', !!first.querySelector('.dreq-st.wait'));
  check('row carries the reference and the amount',
    /JOB-AAA111/.test(first.textContent) && /P1500/.test(first.textContent),
    first.textContent.replace(/\s+/g, ' ').trim().slice(0, 80));
  const second = rows[1] || { querySelector: () => null };
  check('in_progress reads In progress',
    ((second.querySelector('.dreq-st') || {}).textContent || '') === 'In progress',
    (second.querySelector('.dreq-st') || {}).textContent);

  const ask = a.doc.querySelector('.acc[data-key="designs"] .save-row a.btn');
  check('module offers a WhatsApp follow-up',
    !!ask && /^https:\/\/wa\.me\/26771844129\?text=/.test(ask.getAttribute('href') || ''),
    ask && ask.getAttribute('href'));
  check('follow-up message quotes the newest reference',
    !!ask && /JOB-AAA111/.test(decodeURIComponent(ask.getAttribute('href') || '')));

  /* ---------- empty state ---------- */
  const emptySec = b.doc.querySelector('.acc[data-key="designs"]');
  check('a customer with no requests still sees the section', !!emptySec);
  check('empty subtitle says None yet',
    ((emptySec && emptySec.querySelector('.acc-sub') || {}).textContent || '') === 'None yet',
    emptySec && (emptySec.querySelector('.acc-sub') || {}).textContent);
  check('empty state explains the module and links the catalogue',
    !!b.doc.querySelector('.acc[data-key="designs"] .empty-note') &&
    !!b.doc.querySelector('.acc[data-key="designs"] a[href="designer-services.html"]'));
  check('no rows render when there is nothing to show',
    b.doc.querySelectorAll('.acc[data-key="designs"] .dreq').length === 0,
    b.doc.querySelectorAll('.acc[data-key="designs"] .dreq').length);

  const errors = a.errors.concat(b.errors);
  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0
    ? '\nPROFILE-DESIGN-REQUESTS TEST PASSED'
    : '\nPROFILE-DESIGN-REQUESTS TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1800);

