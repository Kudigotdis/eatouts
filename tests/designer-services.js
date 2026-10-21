#!/usr/bin/env node
/**
 * designer-services.html — public design marketplace flow.
 *
 * Boots the page in jsdom, then drives catalogue -> service -> designer ->
 * brief -> summary -> done, asserting the roster picker, the pricing summary,
 * the WhatsApp handoff, and that the submitted request lands in
 * `eatouts_jobs_v1` as `awaiting_admin`. Also guards the designer-workspace
 * entry link added to the catalogue footer.
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

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(inline('designer-services.html'), {
  url: 'http://localhost/designer-services.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) { w.open = () => null; }
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

  /* ---------- catalogue ---------- */
  const hero = doc.querySelector('#view .hero h1');
  check('catalogue hero renders', hero && /designed/i.test(hero.textContent), hero && hero.textContent);
  const cards = doc.querySelectorAll('#view .card[data-service]');
  check('catalogue lists all 30 services', cards.length === 30, cards.length);
  const wsLink = doc.querySelector('.ds-workspace a[href="designer-dashboard.html"]');
  check('catalogue footer links the designer workspace', !!wsLink, wsLink && wsLink.getAttribute('href'));

  /* ---------- pick first service ---------- */
  const firstPick = doc.querySelector('#view [data-act="pickService"]');
  check('a service offers "Choose this service"', !!firstPick);
  click(firstPick);
  const svcH1 = doc.querySelector('#view .hero h1');
  check('service detail shows the service name', svcH1 && svcH1.textContent === 'Logo clean-up', svcH1 && svcH1.textContent);
  const svcSum = doc.querySelector('#view .summary');
  check('service detail prices a total', svcSum && /Total/.test(svcSum.textContent), svcSum ? svcSum.textContent.slice(0, 60) : 'no summary');

  /* ---------- continue to the designer step ---------- */
  click(doc.getElementById('btnNextStep'));
  const dCards = doc.querySelectorAll('#view .designer-card');
  check('designer step lists the roster (5)', dCards.length === 5, dCards.length);
  check('designer avatars render (5)', doc.querySelectorAll('#view .designer-card .av-wrap').length === 5, doc.querySelectorAll('#view .designer-card .av-wrap').length);
  const pickDes = doc.querySelector('#view [data-act="pickDesigner"]');
  check('an available portfolio can be picked', !!pickDes, pickDes && pickDes.getAttribute('data-id'));

  /* ---------- brief ---------- */
  click(pickDes);
  check('brief step shows the business fields', !!doc.getElementById('fName') && !!doc.getElementById('fWhats'));
  check('brief requires accepting the terms', !!doc.querySelector('[data-act="toggleTerms"]'));
  type(doc.getElementById('fName'), 'Test Bistro');
  type(doc.getElementById('fWhats'), '26771234567');
  click(doc.querySelector('[data-act="toggleTerms"]'));

  /* ---------- summary ---------- */
  click(doc.getElementById('btnNextStep'));
  const sum = doc.querySelector('#view .summary');
  check('summary shows a total and the EatOuts fee', sum && /Total/.test(sum.textContent) && /EatOuts fee/.test(sum.textContent), sum ? sum.textContent.slice(0, 70) : 'no summary');

  /* ---------- submit ---------- */
  click(doc.getElementById('btnNextStep'));
  check('done step confirms the request', /Request submitted/.test(doc.body.textContent));
  const sendWa = doc.getElementById('sendWa');
  check('WhatsApp handoff is a wa.me URL', sendWa && /^https:\/\/wa\.me\/\d+\?text=/.test(sendWa.getAttribute('href')), sendWa && sendWa.getAttribute('href'));

  const stored = jobs();
  check('job persisted to eatouts_jobs_v1', stored.length === 1 && stored[0].business_name === 'Test Bistro', JSON.stringify(stored[0] && { b: stored[0].business_name, s: stored[0].status }));
  check('job starts awaiting admin', !!stored[0] && stored[0].status === 'awaiting_admin', stored[0] && stored[0].status);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nDESIGNER-SERVICES TEST PASSED' : '\nDESIGNER-SERVICES TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
