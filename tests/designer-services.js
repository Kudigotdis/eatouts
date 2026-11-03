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

const V1_PRICES = [
  ['svc_logo_cleanup', 250], ['svc_brand_kit', 350], ['svc_brand_kit_plus', 500], ['svc_brand_guidelines', 900],
  ['svc_promo_single', 80], ['svc_promo_pack5', 300], ['svc_promo_pack10', 550], ['svc_promo_retainer', 500],
  ['svc_story_pack10', 450], ['svc_event_flyer', 120], ['svc_event_pack', 280], ['svc_event_programme', 350],
  ['svc_menu_refresh', 400], ['svc_menu_full', 700], ['svc_menu_photo', 1200],
  ['svc_print_cards', 200], ['svc_print_flyer_a5', 180], ['svc_print_table_tent', 220], ['svc_print_poster', 240],
  ['svc_print_shopfront', 800], ['svc_print_vehicle', 1500],
  ['svc_social_weekly', 350], ['svc_social_monthly', 1200], ['svc_social_banners', 280],
  ['svc_pack_bag', 500], ['svc_pack_system', 1800],
  ['svc_motion_promo', 400], ['svc_motion_teaser', 800], ['svc_motion_social', 1200], ['svc_motion_logo', 500]
];

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(inline('designer-services.html'), {
  url: 'http://localhost/designer-services.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(w) {
    w.open = () => null;
    /* a returning browser still holding catalogue v1 — boot must migrate it */
    w.localStorage.setItem('eatouts_services_v1', JSON.stringify({
      services: V1_PRICES.map(([id, price]) => ({ id, base_price: price, category: 'identity', name: id }))
    }));
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

  /* ---------- catalogue ---------- */
  const hero = doc.querySelector('#view .hero h1');
  check('catalogue hero renders', hero && /designed/i.test(hero.textContent), hero && hero.textContent);
  const cards = doc.querySelectorAll('#view .card[data-service]');
  check('catalogue lists all 24 services', cards.length === 24, cards.length);
  const wsLink = doc.querySelector('.ds-workspace a[href="designer-dashboard.html"]');
  check('catalogue footer links the designer workspace', !!wsLink, wsLink && wsLink.getAttribute('href'));

  /* ---------- v1 -> v2 catalogue migration ---------- */
  const cats = JSON.parse(window.localStorage.getItem('eatouts_services_v1') || '{}');
  const storedSvc = cats.services || [];
  check('stored v1 catalogue migrated to v2', cats.version === 2 && storedSvc.length === 24, cats.version + ' / ' + storedSvc.length);
  check('retired v1 offers are gone', !storedSvc.some(s => s.id === 'svc_logo_cleanup' || s.id === 'svc_event_flyer'), storedSvc.map(s => s.id).join(','));
  const kit = storedSvc.filter(s => s.id === 'svc_brand_kit')[0] || {};
  check('Brand Kit repriced to P1,500', kit.base_price === 1500, kit.base_price);

  /* ---------- pick first service ---------- */
  const firstPick = doc.querySelector('#view [data-act="pickService"]');
  check('a service offers "Choose this service"', !!firstPick);
  click(firstPick);
  const svcH1 = doc.querySelector('#view .hero h1');
  check('service detail shows the service name', svcH1 && svcH1.textContent === 'Brand Kit', svcH1 && svcH1.textContent);
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
