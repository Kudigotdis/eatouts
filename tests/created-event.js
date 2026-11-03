#!/usr/bin/env node
/**
 * Created_Event.html (T13).
 *
 * Boots the read-only event page in jsdom with the real js/eatouts-customer.js
 * and a saved record that carries a snapshot, then asserts the hero, every
 * card, the privacy switches, the read-only guarantee, the Web Share / wa.me
 * share path and both empty states. Also pins the builder side of the
 * contract: eventSavePayload() writes the snapshot and a kept created_at.
 *
 * Usage:  node tests/created-event.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const PAGE = path.join(APP_DIR, 'Created_Event.html');
const BUILDER = path.join(APP_DIR, 'eatout_event_builder.html');
const errors = [];
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const pageSrc = fs.readFileSync(PAGE, 'utf8');
const html = pageSrc.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const DAY = 86400000;
const EVENT = {
  id: 'evt_1',
  ref: 'lerato-tumelo-mokolodi',
  type: 'event',
  title: 'Lerato & Tumelo Wedding',
  subtitle: 'Mokolodi Lodge · 12 Dec 2026 16:00',
  created_at: Date.now() - 3 * DAY,
  updated_at: Date.now() - 3600000,
  meta: { venue: 'mokolodi-lodge', eventType: 'wedding', when: '12 Dec 2026 16:00', guests: 2, budget: null, flyer: null },
  snapshot: {
    version: 1,
    description: 'Garden ceremony, plated dinner, live band.',
    eventType: 'Wedding',
    flyerImages: ['assets/logo/EatOuts_Logo.png', 'assets/icons/whatsApp_icon_on.png'],
    venue: { name: 'Mokolodi Lodge', city: 'Gaborone', area: 'Main Mall', capacity: 180, spaces: ['Garden', 'Main Hall'] },
    days: [
      { startDate: '12 Dec 2026', startTime: '16:00', endDate: '', endTime: '23:00' },
      { startDate: '13 Dec 2026', startTime: '09:00', endDate: '', endTime: '' }
    ],
    dresscode: 'Formal — garden colours',
    dress: [{ name: 'Formal', photo: '' }],
    contacts: [{ type: 'WhatsApp', value: '71123456' }],
    tickets: [{ url: 'https://tickets.example.com/lt', notes: 'R150 per person' }],
    food: [{ name: 'Beef fillet', qty: 2, price: 120 }],
    beverages: [{ name: 'Mojito', qty: 3, price: 45 }],
    suppliers: [{ name: 'Kalahari Blooms', bucket: 'Décor', cost: 1500, custom: ['Colour: white'] }],
    rsvp: [{ title: 'Thabo', note: 'Best man', contactType: 'Call', contactValue: '71100002' }],
    guests: [{ name: 'Thabo', role: 'Best man', plus: 1 }],
    privacy: { showBudget: false, showGuests: false, showSuppliers: true, showAddress: true, showRsvp: true },
    budget: { venue: 4000, food: 240, beverages: 135, suppliers: 1500, total: 5875 }
  }
};
const SEED = { user: { id: 'u1', name: 'Lerato', phone: '71100001' }, favourites: [], addresses: [], summaries: [], events: [EVENT] };

function boot(eventList, query) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  return new JSDOM(html, {
    url: 'http://localhost/Created_Event.html' + (query || ''),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      w.localStorage.setItem('eatouts_customer_v1',
        JSON.stringify(Object.assign({}, SEED, { events: eventList })));
    }
  });
}

const dom = boot([EVENT], '?id=evt_1');
const w = dom.window;
const d = w.document;
const q = sel => d.querySelector(sel);
const all = sel => Array.from(d.querySelectorAll(sel));

setTimeout(() => {
  /* ---- page shell ---- */
  check('page slug is Created_Event', d.body.getAttribute('data-page') === 'Created_Event');
  check('PAGE banner present', /<!--\s*PAGE:\s*Created Event\s*-->/.test(pageSrc));
  check('standard header with the back-history mark',
    !!d.getElementById('hdr') && !!q('#hdr .brand-mark[data-act="backHistory"]'));
  check('bottom nav is present', all('.appnav a').length === 5);
  check('no bottom-nav tab is marked active', all('.appnav .on').length === 0);

  /* ---- hero ---- */
  check('flyer hero renders one slide per flyer', all('#heroTrack .preview-hero-slide').length === 2,
    all('#heroTrack .preview-hero-slide').length);
  check('one indicator dot per flyer', all('.ev-dot').length === 2);
  check('first dot is on', !!q('.ev-dot') && q('.ev-dot').classList.contains('on'));
  check('title rides with the hero meta line when flyers hide it',
    !!q('.ev-meta b') && /Lerato & Tumelo Wedding/.test(q('.ev-meta b').textContent));
  check('saved + edited dates are shown',
    /Saved .* · Edited /.test(q('.ev-meta').textContent), q('.ev-meta').textContent);

  /* ---- cards ---- */
  const titles = all('.preview-card h3').map(h => h.textContent.trim());
  check('venue, dates, dress, menu, suppliers, contact, tickets, RSVP cards',
    titles.join(' | ') === 'Venue | Date & Time | Dress Code | Menu | Suppliers · 1 | Contact | Tickets | RSVP',
    titles.join(' | '));
  check('guest list is hidden while its switch is off', titles.indexOf('Guest List · 2') === -1);
  check('budget card is hidden while its switch is off', titles.indexOf('Estimated Budget') === -1);

  const venueCard = q('.preview-card');
  check('venue name + location + spaces + capacity',
    /Mokolodi Lodge/.test(venueCard.textContent) && /Gaborone · Main Mall/.test(venueCard.textContent) &&
      /Garden, Main Hall/.test(venueCard.textContent) && /Up to 180/.test(venueCard.textContent),
    venueCard.textContent);
  check('two-day schedule lists Day 1 and Day 2',
    /Day 1/.test(d.body.textContent) && /Day 2/.test(d.body.textContent));
  check('dress code text renders', /Formal — garden colours/.test(d.body.textContent));
  check('menu lines carry qty + line total',
    /Beef fillet × 2/.test(d.body.textContent) && /P240\.00/.test(d.body.textContent) &&
      /Mojito × 3/.test(d.body.textContent) && /P135\.00/.test(d.body.textContent));
  check('supplier line shows bucket, customisation and cost',
    /Kalahari Blooms/.test(d.body.textContent) && /Décor/.test(d.body.textContent) &&
      /Colour: white/.test(d.body.textContent) && /P1500\.00/.test(d.body.textContent));
  check('contact chip becomes a wa.me link',
    !!q('.preview-social-item') && q('.preview-social-item').getAttribute('href') === 'https://wa.me/71123456',
    q('.preview-social-item') && q('.preview-social-item').getAttribute('href'));
  check('ticket row renders',
    /tickets\.example\.com\/lt/.test(d.body.textContent) && /R150 per person/.test(d.body.textContent));
  check('RSVP row renders', /Thabo/.test(d.body.textContent) && /Best man/.test(d.body.textContent));

  /* ---- read-only guarantee ---- */
  const ACTIONS = ['saveEvent', 'favEvent', 'postOnPromos', 'closePreview', 'togglePrivacy', 'togglePreviewVis'];
  const found = ACTIONS.filter(a => pageSrc.indexOf(a) !== -1);
  check('page ships no edit affordances', found.length === 0, found.join(','));
  check('no privacy switches render', all('.privacy-row, .switch').length === 0);
  check('the only data-act values are backHistory + share',
    all('[data-act]').map(el => el.getAttribute('data-act')).sort().join(',') === 'backHistory,share',
    all('[data-act]').map(el => el.getAttribute('data-act')).join(','));
  check('share button sits in the page footer',
    !!q('.ev-foot button[data-act="share"]') && /Share this event/.test(q('.ev-foot').textContent));
  next();
}, 400);

function next() {
  /* ---- the saved privacy switches drive the cards ---- */
  const flipped = JSON.parse(JSON.stringify(EVENT));
  flipped.snapshot.privacy = { showBudget: true, showGuests: true, showSuppliers: false, showAddress: false, showRsvp: false };
  w.localStorage.setItem('eatouts_customer_v1', JSON.stringify(Object.assign({}, SEED, { events: [flipped] })));
  w.dispatchEvent(new w.Event('storage'));

  const after = Array.from(d.querySelectorAll('.preview-card h3')).map(h => h.textContent.trim());
  check('a storage event repaints the page',
    after.join(' | ') === 'Venue | Date & Time | Dress Code | Menu | Contact | Tickets | Guest List · 2 | Estimated Budget',
    after.join(' | '));
  check('hidden suppliers + RSVP drop their cards',
    after.indexOf('Suppliers · 1') === -1 && after.indexOf('RSVP') === -1);
  check('address switch keeps the town but drops the area',
    /Gaborone/.test(q('.preview-card').textContent) && !/Main Mall/.test(q('.preview-card').textContent),
    q('.preview-card').textContent);
  check('budget card totals the saved breakdown', /P5875\.00/.test(d.body.textContent) && /Total/.test(d.body.textContent));

  /* ---- sharing ---- */
  const opened = [];
  w.open = function (u) { opened.push(u); };
  q('.ev-foot button[data-act="share"]').click();
  check('share falls back to wa.me', opened.length === 1 && /^https:\/\/wa\.me\/\?text=/.test(opened[0]), opened[0]);
  const decoded = decodeURIComponent(String(opened[0] || '').replace('https://wa.me/?text=', ''));
  check('wa.me text carries the event + the page link',
    /\*Lerato & Tumelo Wedding\*/.test(decoded) && /Created_Event\.html\?id=evt_1/.test(decoded), decoded);

  let shared = null;
  Object.defineProperty(w.navigator, 'share', {
    value: function (o) { shared = o; return Promise.resolve(); }, configurable: true
  });
  q('.ev-foot button[data-act="share"]').click();
  check('Web Share API wins when the browser has it',
    !!shared && shared.url === 'http://localhost/Created_Event.html?id=evt_1', shared && shared.url);
  check('share payload carries the title', !!shared && /Lerato & Tumelo Wedding/.test(shared.title));
  third();
}

function third() {
  /* ---- empty states: unknown id, no id, a record saved before snapshots ---- */
  const missing = boot([EVENT], '?id=nope');
  const noId = boot([EVENT], '');
  const legacy = boot([{ id: 'evt_old', ref: 'old', title: 'Old event', created_at: Date.now() }], '?id=evt_old');
  setTimeout(() => {
    const m = missing.window.document.querySelector('.empty');
    check('unknown id shows the not-on-this-device state', !!m && /not on this device/.test(m.textContent),
      m && m.textContent);
    check('empty state links back to the planner',
      !!missing.window.document.querySelector('a[href="eatout_event_builder.html"]'));
    const n = noId.window.document.querySelector('.empty');
    check('no id shows the pick-an-event state', !!n && /No event selected/.test(n.textContent), n && n.textContent);
    const l = legacy.window.document.querySelector('.empty');
    check('a record without a snapshot falls back to the empty state', !!l);
    builder();
  }, 400);
}

function builder() {
  const src = fs.readFileSync(BUILDER, 'utf8');
  check('builder saves a snapshot with every event', /snapshot:eventSnapshot\(\)/.test(src));
  check('snapshot declares its version', /version:1/.test(src));
  check('saved events keep created_at and carry updated_at',
    /created_at:STATE\.eventCreatedAt\|\|Date\.now\(\)/.test(src) && /updated_at:Date\.now\(\)/.test(src));
  check('the saved id is kept for the next save', /STATE\.eventId=item\.id/.test(src));
  check('id + created stamp survive a draft reload',
    /eventId:STATE\.eventId/.test(src) && /STATE\.eventId=d\.eventId/.test(src) &&
      /STATE\.eventCreatedAt=d\.eventCreatedAt/.test(src));
  check('snapshot carries the costs so the page needs no engines', /budget:\{venue:venueCost\(\)/.test(src));
  check('privacy switches are saved with the event', /showBudget:STATE\.showBudget===true/.test(src));

  const stage = fs.readFileSync(path.join(APP_DIR, 'copy-static.mjs'), 'utf8');
  check('page is staged for deploy', /'Created_Event\.html'/.test(stage));
  const meta = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'scripts', 'html_catalog.meta.json'), 'utf8'));
  check('catalog meta.json has the page entry', meta.pages.some(p => p.file === 'Created_Event.html'));
  check('catalog changelog records the page', meta.changelog.some(c => /Created_Event\.html/.test(c.note)));
  check('PAGE_INVENTORY lists the page',
    /\| 73 \| `Created_Event\.html`/.test(fs.readFileSync(path.join(APP_DIR, 'PAGE_INVENTORY.md'), 'utf8')));
  check('HTML_PAGES lists the page',
    /`Created_Event\.html`/.test(fs.readFileSync(path.join(APP_DIR, 'HTML_PAGES.md'), 'utf8')));

  console.log('\nwindow errors: ' + errors.length);
  errors.slice(0, 5).forEach(e => console.log('  ' + e.split('\n')[0]));
  console.log('\n' + checks + ' checks, ' + fails + ' failed');
  console.log(fails === 0 && errors.length === 0 ? 'CREATED-EVENT TEST PASSED' : 'CREATED-EVENT TEST FAILED (' + fails + ')');
  process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
}


