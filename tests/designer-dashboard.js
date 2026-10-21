#!/usr/bin/env node
/**
 * designer-dashboard.html — designer workspace.
 *
 * Boots with no session and asserts the prototype sign-in picker, then opens
 * a portfolio and checks the home metrics/job card, the job detail (brief,
 * price breakdown, payout status) and the draft-submission action. Also
 * verifies sign-out returns to the picker.
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
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push(file + ' missing script: ' + src); return '<!-- missing ' + src + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
}

const SEED_JOB = {
  id: 'JOB-DASH1',
  designer_id: 'designer_kudigotdis',
  service_id: 'svc_logo_cleanup',
  service_category: 'identity',
  service_name: 'Logo clean-up',
  business_name: 'Dash Bistro',
  business_whatsapp: '26770000000',
  is_recurring: false,
  slot_type: 'project',
  status: 'assigned',
  total: 250,
  base_price: 250,
  payout_status: 'pending',
  brief: { industry: 'Food', likes: 'Bold', dislikes: 'Neon', references: [] },
  price_breakdown: { gross: 250, platform_cut: 37.5, designer_payout: 212.5 },
  created_at: Date.now(),
  updated_at: Date.now()
};

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(inline('designer-dashboard.html'), {
  url: 'http://localhost/designer-dashboard.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) {
    w.open = () => null;
    w.localStorage.setItem('eatouts_jobs_v1', JSON.stringify({ jobs: [SEED_JOB] }));
  }
});
const { window } = dom;
const doc = window.document;
const click = el => { if (el) el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); };
const type = (el, v) => { if (el) { el.value = v; el.dispatchEvent(new window.Event('input', { bubbles: true })); } };
const jobs = () => (JSON.parse(window.localStorage.getItem('eatouts_jobs_v1') || '{"jobs":[]}').jobs) || [];

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  /* ---------- prototype sign-in picker ---------- */
  check('no session shows the designer sign-in', /Designer sign-in/.test(doc.getElementById('view').textContent));
  const rows = doc.querySelectorAll('#view .pickrow');
  check('picker lists the roster (5)', rows.length === 5, rows.length);
  check('picker renders avatars (5)', doc.querySelectorAll('#view .pickrow .av-wrap').length === 5, doc.querySelectorAll('#view .pickrow .av-wrap').length);
  const openBtn = doc.querySelector('#view [data-act="pick"]');
  check('picker offers an Open button', !!openBtn, openBtn && openBtn.getAttribute('data-id'));

  /* ---------- open a portfolio ---------- */
  click(openBtn);
  check('session stored in eatouts_designer_session_v1', window.localStorage.getItem('eatouts_designer_session_v1') === 'designer_kudigotdis', window.localStorage.getItem('eatouts_designer_session_v1'));
  const h1 = doc.querySelector('#view .profile-hd h1');
  check('home shows the portfolio style', h1 && h1.textContent === 'Bold & Youthful', h1 && h1.textContent);
  check('home shows four metrics', doc.querySelectorAll('#view .metric').length === 4, doc.querySelectorAll('#view .metric').length);
  const jobCard = doc.querySelector('#view .job');
  check('home shows the active project card', !!jobCard && /Logo clean-up/.test(jobCard.textContent), jobCard ? jobCard.textContent.slice(0, 50) : 'no job card');
  check('job card renders a 5-step stepper', doc.querySelectorAll('#view .job .stepper span').length === 5, doc.querySelectorAll('#view .job .stepper span').length);
  check('home states designers cannot close own jobs', /cannot close your own jobs/.test(doc.getElementById('view').textContent));

  /* ---------- job detail ---------- */
  click(doc.querySelector('#view [data-act="openJob"]'));
  check('job detail shows the brief', /Industry/.test(doc.getElementById('view').textContent) && /Bold/.test(doc.getElementById('view').textContent));
  check('job detail shows the payout breakdown', /EatOuts fee/.test(doc.getElementById('view').textContent) && /Your payout/.test(doc.getElementById('view').textContent));
  check('job detail offers draft submission', !!doc.querySelector('#view [data-act="submitDelivery"]'));

  /* ---------- submit a draft ---------- */
  type(doc.getElementById('note'), 'First pass ready');
  type(doc.getElementById('deliver'), 'https://example.com/draft.png');
  click(doc.querySelector('#view [data-act="submitDelivery"]'));
  const after = jobs()[0];
  check('draft submission updates the job status', after.status === 'delivered', after.status);
  check('draft submission stores the progress note', after.progress_note === 'First pass ready', after.progress_note);

  /* ---------- back + sign out ---------- */
  click(doc.querySelector('#view [data-act="back"]'));
  click(doc.querySelector('#view [data-act="signOut"]'));
  check('sign out clears the session', !window.localStorage.getItem('eatouts_designer_session_v1'));
  check('sign out returns to the picker', /Designer sign-in/.test(doc.getElementById('view').textContent));

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nDESIGNER-DASHBOARD TEST PASSED' : '\nDESIGNER-DASHBOARD TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
