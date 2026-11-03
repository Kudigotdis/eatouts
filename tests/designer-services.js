#!/usr/bin/env node
/**
 * designer-services.html — public design marketplace flow.
 *
 * Boots the page in jsdom, then drives catalogue -> service -> designer ->
 * brief -> summary -> done, asserting the roster picker, the pricing summary,
 * the WhatsApp handoff, and that the submitted request lands in
 * `eatouts_jobs_v1` as `awaiting_admin`. Also guards the designer-workspace
 * entry link in the catalogue footer, and the T21 standard-shell rework
 * (bottom `appnav`, centred chip row, 16px type, no pill badges / icons /
 * plus glyphs) plus the step-2 rework (Available/Previous toggle, 90px
 * avatars, 3-image snap carousel, portfolio lightbox + 3-across grid),
 * the account gate that guards the request flow, and step 3 prefilling
 * from a listed business (or "For Unlisted Business").
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const HTML = fs.readFileSync(path.join(APP_DIR, 'designer-services.html'), 'utf8');
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

  /* ---------- T21 standard shell ---------- */
  const nav = doc.querySelector('#shell > nav.appnav');
  const navLinks = nav ? Array.from(nav.querySelectorAll('a')) : [];
  check('standard bottom nav renders with 5 links', navLinks.length === 5, navLinks.length);
  check('nav links to the shared destinations',
    navLinks.map(a => a.getAttribute('href')).join(',') === 'index.html#promos,index.html#restaurants,index.html#reserve,index.html#gallery,index.html#about',
    navLinks.map(a => a.getAttribute('href')).join(','));
  check('nav sits after the scrolling view', nav && nav.previousElementSibling && nav.previousElementSibling.id === 'actionBar',
    nav && nav.previousElementSibling && (nav.previousElementSibling.id || nav.previousElementSibling.className));
  check('hero copy says local designers', /local designers/.test((doc.querySelector('#view .hero p') || {}).textContent || ''),
    (doc.querySelector('#view .hero p') || {}).textContent);
  const heroNote = doc.querySelector('#view .hero-note');
  check('hero keeps the P120 / fee / founding line', !!heroNote && /From P120/.test(heroNote.textContent) && /15% platform fee/.test(heroNote.textContent),
    heroNote && heroNote.textContent);
  check('catalogue drops the pill badges', !doc.querySelector('#view .badges') && !doc.querySelector('#view .badge'), doc.querySelectorAll('#view .badge').length);
  check('chips drop the icon spans', !doc.querySelector('#view .cat-chip .ico'), doc.querySelectorAll('#view .cat-chip .ico').length);
  check('cards drop the plus glyph', !doc.querySelector('#view .plus'), doc.querySelectorAll('#view .plus').length);
  check('retired pill / icon / plus rules are gone', !/\.hero \.badges|\.hero \.badge\{|\.cat-chip \.ico|\.plus\{/.test(HTML));
  check('chip row is centred', /\.cat-chips\{[^}]*justify-content:center/.test(HTML));
  check('card image keeps an aspect ratio', /\.card-img\{[^}]*aspect-ratio:16\/10/.test(HTML) && !/\.card-img\{[^}]*height:118px/.test(HTML));
  check('service sub-line is 16px', /\.service-sub\{[^}]*font-size:16px/.test(HTML));
  check('footnote is centred at 16px', /\.footnote\{[^}]*font-size:16px[^}]*text-align:center/.test(HTML));
  const chipStyle = window.getComputedStyle(doc.querySelector('#view .cat-chips'));
  check('chip row computes a centred flex row', chipStyle.justifyContent === 'center' && chipStyle.display === 'flex', chipStyle.display + ' / ' + chipStyle.justifyContent);
  const noteStyle = window.getComputedStyle(doc.querySelector('#view .footnote'));
  check('footnote computes 16px centred', noteStyle.fontSize === '16px' && noteStyle.textAlign === 'center', noteStyle.fontSize + ' / ' + noteStyle.textAlign);

  /* ---------- v1 -> v2 catalogue migration ---------- */
  const cats = JSON.parse(window.localStorage.getItem('eatouts_services_v1') || '{}');
  const storedSvc = cats.services || [];
  check('stored v1 catalogue migrated to v2', cats.version === 2 && storedSvc.length === 24, cats.version + ' / ' + storedSvc.length);
  check('retired v1 offers are gone', !storedSvc.some(s => s.id === 'svc_logo_cleanup' || s.id === 'svc_event_flyer'), storedSvc.map(s => s.id).join(','));
  const kit = storedSvc.filter(s => s.id === 'svc_brand_kit')[0] || {};
  check('Brand Kit repriced to P1,500', kit.base_price === 1500, kit.base_price);

  /* ---------- account gate (T21 steps 5 + 9) ---------- */
  const firstPick = doc.querySelector('#view [data-act="pickService"]');
  const firstPickId = firstPick && firstPick.getAttribute('data-id');
  check('a service offers "Choose this service"', !!firstPick);
  click(firstPick);
  const gateH1 = doc.querySelector('#view .hero h1');
  check('signed-out pick opens the account gate', gateH1 && /Create a free EatOuts account/.test(gateH1.textContent), gateH1 && gateH1.textContent);
  check('gate names the service being requested', /Brand Kit/.test((doc.querySelector('#view .hero p') || {}).textContent || ''),
    (doc.querySelector('#view .hero p') || {}).textContent);
  const gateLinks = Array.from(doc.querySelectorAll('#view a.btn'));
  check('gate offers sign-up and log-in',
    gateLinks.length === 2 &&
    /eatouts-customer-signup\.html$/.test(gateLinks[0].getAttribute('href') || '') &&
    /eatouts-login\.html$/.test(gateLinks[1].getAttribute('href') || ''),
    gateLinks.map(a => a.getAttribute('href')).join(','));
  check('gate hides the action bar', doc.getElementById('actionBar').classList.contains('hidden'), doc.getElementById('actionBar').className);
  check('gate remembers the service to resume', window.sessionStorage.getItem('eatouts_design_resume_v1') === firstPickId,
    window.sessionStorage.getItem('eatouts_design_resume_v1'));
  check('signed-out pick never reaches step 2', !doc.querySelector('#view .designer-card'));
  click(doc.querySelector('#view [data-act="gateBack"]'));
  check('keep browsing returns to the catalogue', doc.querySelectorAll('#view .card[data-service]').length === 24,
    doc.querySelectorAll('#view .card[data-service]').length);
  check('keep browsing clears the pending resume', window.sessionStorage.getItem('eatouts_design_resume_v1') === null,
    window.sessionStorage.getItem('eatouts_design_resume_v1'));

  /* ---------- sign in: an owner who already has a listed business ---------- */
  window.EatoutsMgrDB.upsert('businesses', { id: 'biz-test', name: 'Test Bistro', whatsapp: '26771234567', category: 'restaurant' });
  const me = window.EatoutsUsers.create({
    firstName: 'Tumi', surname: 'Molefe', whatsapp: '26771234567',
    type: 'customer', roles: ['customer'], status: 'active', businessId: 'biz-test'
  });
  window.EatoutsAuth.startSession(me);
  check('the account is recognised after signing in', !!window.EatoutsAuth.getUser(), window.EatoutsAuth.getUser() && window.EatoutsAuth.getUser().id);

  /* ---------- pick first service ---------- */
  click(doc.querySelector('#view [data-act="pickService"]'));
  const svcH1 = doc.querySelector('#view .hero h1');
  check('signed-in pick opens the service detail', svcH1 && svcH1.textContent === 'Brand Kit', svcH1 && svcH1.textContent);
  const svcSum = doc.querySelector('#view .summary');
  check('service detail prices a total', svcSum && /Total/.test(svcSum.textContent), svcSum ? svcSum.textContent.slice(0, 60) : 'no summary');

  /* ---------- continue to the designer step ---------- */
  /* a returning browser with design history: one closed job, one still open */
  const DAY = 86400000;
  const seedJob = (o) => Object.assign({
    service_id: 'svc_brand_kit', service_category: 'identity', service_name: 'Brand Kit',
    is_recurring: false, business_name: 'Old Bistro', business_whatsapp: '26770000000',
    base_price: 1500, add_ons: [], bundle_discount: 0, founding_discount: 0, total: 1500,
    price_breakdown: { gross: 1500, platform_cut: 225, designer_payout: 1275 },
    slot_type: 'project', brief: { industry: '', likes: '', dislikes: '', references: [] },
    deadlines: { admin_response_due_by: 0, first_draft_due_by: null, client_review_due_by: null },
    payout_status: 'paid', founding_gift: false, onboard_upsell_checked: false,
    created_at: Date.now(), updated_at: Date.now()
  }, o);
  window.localStorage.setItem('eatouts_jobs_v1', JSON.stringify({ jobs: [
    seedJob({ id: 'JOB-PAST01', designer_id: 'designer_neoframe', status: 'closed', created_at: Date.now() - 40 * DAY }),
    seedJob({ id: 'JOB-OPEN01', designer_id: 'designer_thuto_motion', status: 'in_progress', created_at: Date.now() - 3 * DAY })
  ] }));
  click(doc.getElementById('btnNextStep'));
  const dCards = doc.querySelectorAll('#view .designer-card');
  check('designer step lists the roster (5)', dCards.length === 5, dCards.length);
  check('designer avatars render (5)', doc.querySelectorAll('#view .designer-card .av-wrap').length === 5, doc.querySelectorAll('#view .designer-card .av-wrap').length);
  check('an available portfolio can be picked', !!doc.querySelector('#view [data-act="pickDesigner"]'), doc.querySelector('#view [data-act="pickDesigner"]'));

  /* ---------- T21 step 7: designer step rework ---------- */
  const dH1 = doc.querySelector('#view .hero h1');
  check('designer step heading says Available Designers', dH1 && dH1.textContent === 'Available Designers', dH1 && dH1.textContent);
  const dCopy = doc.querySelector('#view .hero p');
  check('designer step copy is 16px', dCopy && window.getComputedStyle(dCopy).fontSize === '16px', dCopy && window.getComputedStyle(dCopy).fontSize);
  const tabs = Array.from(doc.querySelectorAll('#view .seg-btn'));
  check('available / previous toggle renders', tabs.length === 2 && tabs.map(b => b.getAttribute('data-val')).join(',') === 'available,previous',
    tabs.map(b => b.getAttribute('data-val')).join(','));
  check('available tab is active by default', tabs[0] && tabs[0].classList.contains('on') && !tabs[1].classList.contains('on'), tabs[0] && tabs[0].className);
  check('retired available pill is gone', !doc.querySelector('#view .pill.ok') && !/\.pill\.ok\{/.test(HTML), doc.querySelectorAll('#view .pill.ok').length);

  const av = doc.querySelector('#view .designer-card .av-wrap');
  const avStyle = window.getComputedStyle(av);
  check('avatar is a 90px square', av && av.style.width === '90px' && av.style.height === '90px' && avStyle.borderRadius === '16px',
    av && av.style.width + 'x' + av.style.height + ' r=' + avStyle.borderRadius);
  check('avatar is tappable to enlarge', !!doc.querySelector('#view .designer-card .av-btn[data-act="zoomAvatar"]'));

  const card = doc.querySelector('#view .designer-card');
  const seq = Array.from(card.children).map(n => n.tagName.toLowerCase() + (n.className ? '.' + String(n.className).split(' ')[0] : ''));
  check('card orders avatar, title, blurb, work, action', seq.join(',') === 'div.designer-top,h4,p,div.mosaic,button.mos-dots,button.btn', seq.join(','));
  check('title + blurb sit centred under the avatar',
    window.getComputedStyle(card).textAlign === 'center' && window.getComputedStyle(card.querySelector('h4')).fontSize === '16px',
    window.getComputedStyle(card).textAlign + ' / ' + window.getComputedStyle(card.querySelector('h4')).fontSize);
  const mosaics = Array.from(doc.querySelectorAll('#view .designer-card .mosaic'));
  check('work strip is a 3-image snap carousel', /\.mosaic\{[^}]*scroll-snap-type:x mandatory/.test(HTML) && mosaics.every(m => m.querySelectorAll('.cell').length === 3),
    mosaics.map(m => m.querySelectorAll('.cell').length).join(','));
  const mosDots = card.querySelector('.mos-dots');
  check('carousel shows 3 dots under the work strip', mosDots && mosDots.children.length === 3 && mosDots.children[0].classList.contains('on'),
    mosDots && mosDots.children.length);

  const lockedCards = Array.from(doc.querySelectorAll('#view .designer-card.locked'));
  check('engaged designers stay listed but inactive', lockedCards.length === 4, lockedCards.length);
  check('engaged cards offer notify-me, never a pick', lockedCards.every(c => c.querySelector('[data-act="notifyMe"]') && !c.querySelector('[data-act="pickDesigner"]')));
  const busyCard = doc.querySelector('#view .designer-card[data-designer="designer_thuto_motion"]');
  check('engaged card shows the date it frees up', busyCard && /Available from \d/.test(busyCard.textContent),
    busyCard && busyCard.textContent.slice(-120));
  const idleBusy = doc.querySelector('#view .designer-card[data-designer="designer_dineo_social"]');
  check('engaged card without a job still invites a queue request', idleBusy && /work waiting/i.test(idleBusy.textContent),
    idleBusy && idleBusy.textContent.slice(-120));

  /* carousel -> lightbox pager -> 3-across grid -> enlarge -> swipe */
  const lbEl = doc.getElementById('lb');
  const swipe = (dx) => {
    const start = new window.Event('touchstart', { bubbles: true });
    Object.defineProperty(start, 'touches', { value: [{ clientX: 200 }] });
    lbEl.dispatchEvent(start);
    const end = new window.Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientX: 200 + dx }] });
    lbEl.dispatchEvent(end);
  };
  const lbDots = () => Array.from(lbEl.querySelectorAll('.lb-dots span'));
  const onDot = () => lbDots().findIndex(d => d.classList.contains('on'));
  const neoCells = doc.querySelectorAll('#view .designer-card[data-designer="designer_neoframe"] .cell');
  click(neoCells[1]);
  check('tapping a work image opens the lightbox', !lbEl.classList.contains('hide') && !!lbEl.querySelector('.lb-stage'),
    lbEl.className + ' / ' + lbEl.innerHTML.slice(0, 40));
  check('lightbox dots track the tapped photo', lbDots().length === 9 && onDot() === 1, lbDots().length + ' / on=' + onDot());
  swipe(-120);
  check('swiping left advances the photo', onDot() === 2, onDot());
  swipe(120);
  check('swiping right goes back', onDot() === 1, onDot());
  click(lbEl.querySelector('.lb-dots'));
  check('tapping the dots opens the 3-across grid',
    !!lbEl.querySelector('.lb-grid') && lbEl.querySelectorAll('.lb-grid img').length === 9,
    lbEl.querySelectorAll('.lb-grid img').length);
  check('grid is 3 across on feint black', /\.lb-grid\{[^}]*columns:3/.test(HTML) && /\.lb\{[^}]*rgba\(10,10,10/.test(HTML));
  click(lbEl.querySelectorAll('.lb-grid img')[4]);
  check('tapping a grid photo enlarges it', !!lbEl.querySelector('.lb-stage') && !lbEl.querySelector('.lb-grid') && onDot() === 4, onDot());
  click(lbEl.querySelector('[data-act="lbClose"]'));
  check('closing the lightbox clears it', lbEl.classList.contains('hide') && lbEl.innerHTML === '', lbEl.className);
  click(doc.querySelector('#view .designer-card .av-btn'));
  check('tapping the avatar enlarges it',
    !lbEl.classList.contains('hide') && !!lbEl.querySelector('.lb-stage img') && lbDots().length === 1, lbDots().length);
  click(lbEl.querySelector('[data-act="lbClose"]'));

  /* previous designers come from the request history */
  click(tabs[1]);
  const prevCards = Array.from(doc.querySelectorAll('#view .designer-card'));
  check('previous designers come from past requests',
    prevCards.length === 2 && !!doc.querySelector('#view [data-designer="designer_neoframe"]') && !!doc.querySelector('#view [data-designer="designer_thuto_motion"]'),
    prevCards.map(c => c.getAttribute('data-designer')).join(','));
  check('previous tab drops the engaged list', !/Currently engaged/.test(doc.querySelector('#view .list').textContent));
  check('previous tab keeps the available pick', !!doc.querySelector('#view [data-designer="designer_neoframe"] [data-act="pickDesigner"]'));
  click(doc.querySelector('#view .seg-btn[data-val="available"]'));
  check('toggle returns to the available roster', doc.querySelectorAll('#view .designer-card').length === 5,
    doc.querySelectorAll('#view .designer-card').length);
  check('pick survives the toggle round-trip', !!doc.querySelector('#view [data-act="pickDesigner"]'));

  /* ---------- brief ---------- */
  click(doc.querySelector('#view [data-act="pickDesigner"]'));
  check('brief step shows the business fields', !!doc.getElementById('fName') && !!doc.getElementById('fWhats'));
  check('brief requires accepting the terms', !!doc.querySelector('[data-act="toggleTerms"]'));

  /* T21 step 9: step 3 starts from the listed business, or an unlisted brief */
  const briefSeg = Array.from(doc.querySelectorAll('#view .seg-btn')).map(b => b.textContent.trim());
  check('step 3 offers the listed business and an unlisted option', briefSeg.join('|') === 'Test Bistro|For Unlisted Business', briefSeg.join('|'));
  check('step 3 opens on the listed business', !!doc.querySelector('#view .seg-btn[data-val="listed"].on'));
  check('step 3 prefills name and whatsapp from the listing',
    doc.getElementById('fName').value === 'Test Bistro' && doc.getElementById('fWhats').value === '26771234567',
    doc.getElementById('fName').value + ' / ' + doc.getElementById('fWhats').value);
  check('step 3 prefills the industry', doc.getElementById('fIndustry').value === 'restaurant', doc.getElementById('fIndustry').value);
  check('step 3 shows who is signed in', /Signed in as Tumi Molefe/.test((doc.querySelector('#view .hero-note') || {}).textContent || ''),
    (doc.querySelector('#view .hero-note') || {}).textContent);
  click(doc.querySelector('#view .seg-btn[data-val="unlisted"]'));
  check('for unlisted business clears the listing fields',
    doc.getElementById('fName').value === '' && doc.getElementById('fIndustry').value === '',
    doc.getElementById('fName').value + ' / ' + doc.getElementById('fIndustry').value);
  check('for unlisted business keeps the account whatsapp', doc.getElementById('fWhats').value === '26771234567', doc.getElementById('fWhats').value);
  click(doc.querySelector('#view .seg-btn[data-val="listed"]'));
  check('switching back restores the listing prefill', doc.getElementById('fName').value === 'Test Bistro', doc.getElementById('fName').value);

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
  const mine = stored.filter(j => j.business_name === 'Test Bistro');
  check('job persisted to eatouts_jobs_v1', mine.length === 1 && stored.length === 3,
    JSON.stringify({ total: stored.length, mine: mine.length, status: mine[0] && mine[0].status }));
  check('job starts awaiting admin', !!mine[0] && mine[0].status === 'awaiting_admin', mine[0] && mine[0].status);
  check('job records the signed-in customer', !!mine[0] && mine[0].customer_id === me.id, mine[0] && mine[0].customer_id);
  check('job links the listed business', !!mine[0] && mine[0].business_id === 'biz-test', mine[0] && mine[0].business_id);

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 10).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log(fails === 0 && errors.length === 0 ? '\nDESIGNER-SERVICES TEST PASSED' : '\nDESIGNER-SERVICES TEST FAILED (' + fails + ' checks)');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}, 1500);
