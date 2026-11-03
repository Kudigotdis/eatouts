#!/usr/bin/env node
/**
 * T12.9 — builder share + save.
 *
 * Asserts: the 2-option share popup (venue / contacts) behind the account gate,
 * the floating sign-up gate that replaces confirm(), the save sheet (rename +
 * card thumbnail) writing the snapshot + dates, the "Save draft?" guard on
 * leaving, and the reserve-tab "Create New Event" entry point. Every popup is
 * checked against the shared floating-card contract (420px, plain X, no
 * .fpop-close).
 *
 * Usage:  node tests/builder-save-share.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const BUILDER = path.join(APP_DIR, 'eatout_event_builder.html');
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inline(file) {
  const errors = [];
  const html = fs.readFileSync(file, 'utf8').replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

function boot(draft, seed) {
  const { html, errors } = inline(BUILDER);
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || '')));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/eatout_event_builder.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (draft) w.localStorage.setItem('eatouts.event.draft.v2', JSON.stringify(draft));
      if (seed) w.localStorage.setItem('eatouts_customer_v1', JSON.stringify(seed));
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const tick = () => new Promise(r => setTimeout(r, 30));
/* jsdom cannot navigate away; ignore that one error, fail on anything else */
const realErrors = list => list.filter(e => !/Not implemented: navigation/.test(e));

function floatingCard(label, w, panel) {
  const scrim = panel ? panel.closest('.fpop-scrim') : null;
  const scrimCs = scrim ? w.getComputedStyle(scrim) : null;
  check(label + ': floats in a centred scrim',
    !!scrimCs && scrimCs.display === 'flex' && scrimCs.alignItems === 'center' &&
      scrimCs.justifyContent === 'center');
  const cs = panel ? w.getComputedStyle(panel) : null;
  check(label + ': is the 420px rounded card',
    !!cs && cs.maxWidth === '420px' && cs.borderRadius === '16px',
    cs ? cs.maxWidth + ' / ' + cs.borderRadius : 'no panel');
  const x = panel ? panel.querySelector('.fpop-hdr .fpop-x') : null;
  const xCs = x ? w.getComputedStyle(x) : null;
  check(label + ': plain X glyph, no beige circle',
    !!x && x.textContent.trim() === '\u00d7' && !!xCs &&
      (xCs.backgroundColor === 'transparent' || xCs.backgroundColor === 'rgba(0, 0, 0, 0)'),
    xCs ? x.textContent.trim() + ' / ' + xCs.backgroundColor : 'no X');
  check(label + ': no .fpop-close anywhere', !panel.ownerDocument.querySelector('.fpop-close'));
}

function draftWith(venueId) {
  return {
    eventTitle: 'Gallery Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural',
      categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend',
      description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ startDate: '2026-11-07', startTime: '09:00', endDate: '2026-11-07', endTime: '17:00' }] },
    suppliers: {},
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], dress: [], dresscode: '', contacts: [], ticketLinks: [] },
    guests: [], rsvp: [], notes: [], flyerImages: ['assets/logo/EatOuts_Logo.png'],
    venueSpaces: [], venueRules: [], targetAudience: []
  };
}
const USER = { id: 'u1', name: 'Neo', phone: '71100009' };
const seed = events => Object.assign({ user: USER, favourites: [], events: events || [], summaries: [], addresses: [] }, {});

(async () => {
  const probe = boot(null, null);
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes a venue', !!venueId);
  if (!venueId) { console.log('BUILDER SAVE-SHARE TEST FAILED (no venue)'); process.exit(1); }

  /* ================= signed out: the gate replaces confirm() ================= */
  const out = boot(draftWith(venueId), null);
  const ow = out.w, od = out.doc;
  check('signed-out boot has no window errors', realErrors(out.errors).length === 0, realErrors(out.errors).join(' | '));

  click(ow, od.querySelector('[data-act="saveEvent"]'));
  let panel = od.querySelector('.prompt-panel');
  check('Save Event opens the floating sign-up gate', !!panel && /Create a free account/.test(panel.textContent));
  floatingCard('sign-up gate', ow, panel);
  check('gate offers account + sign-in + keep browsing',
    !!panel.querySelector('a[href*="eatouts-login.html"]') &&
      /I already have an EatOuts account/.test(panel.textContent) &&
      !!panel.querySelector('[data-act="closeSignupGate"]'));
  check('no native confirm() survives in the builder',
    !/confirm\("Sign in to save this event/.test(fs.readFileSync(BUILDER, 'utf8')));

  click(ow, panel.querySelector('[data-act="closeSignupGate"]'));
  check('Keep browsing closes the gate', !od.querySelector('.prompt-panel'));

  const opened0 = [];
  ow.open = u => { opened0.push(u); };
  click(ow, od.querySelector('[data-act="shareWhatsApp"]'));
  check('signed-out share shows the gate, sends nothing', opened0.length === 0 &&
    /Create a free account/.test((od.querySelector('.prompt-panel') || {}).textContent || ''));
  click(ow, od.querySelector('[data-act="closeSignupGate"]'));

  /* ================= signed in: 2-option share popup ================= */
  const a = boot(draftWith(venueId), seed());
  const w = a.w, doc = a.doc;
  check('signed-in boot has no window errors', realErrors(a.errors).length === 0, realErrors(a.errors).join(' | '));

  click(w, doc.querySelector('[data-act="shareWhatsApp"]'));
  panel = doc.querySelector('.prompt-panel');
  const opts = Array.from(doc.querySelectorAll('.opt-card'));
  check('share opens the 2-option popup', !!panel && opts.length === 2, opts.length);
  check('the two options are venue + contacts',
    opts.map(o => o.querySelector('b').textContent).join(' | ') ===
      'Share with Venue Provider | Share with WhatsApp Contacts',
    opts.map(o => o.querySelector('b').textContent).join(' | '));
  floatingCard('share popup', w, panel);

  const opened = [];
  w.open = u => { opened.push(u); };
  click(w, doc.querySelector('[data-act="shareVenue"]'));
  check('venue share opens WhatsApp to the venue number',
    opened.length === 1 && /^https:\/\/wa\.me\/\d+\?text=/.test(opened[0]), opened[0]);
  const sent = decodeURIComponent(String(opened[0] || '').split('text=')[1] || '');
  check('venue message carries the event name + the read-only page link',
    /Gallery Gala/.test(sent) && /Created_Event\.html\?id=/.test(sent), sent);
  check('share popup closed after choosing', !doc.querySelector('.opt-card'));

  const opened2 = [];
  w.open = u => { opened2.push(u); };
  click(w, doc.querySelector('[data-act="shareWhatsApp"]'));
  click(w, doc.querySelector('[data-act="shareContacts"]'));
  check('contacts share falls back to wa.me without a number',
    opened2.length === 1 && /^https:\/\/wa\.me\/\?text=/.test(opened2[0]), opened2[0]);

  let shared = null;
  Object.defineProperty(w.navigator, 'share', {
    value: o => { shared = o; return Promise.resolve(); }, configurable: true
  });
  click(w, doc.querySelector('[data-act="shareWhatsApp"]'));
  click(w, doc.querySelector('[data-act="shareContacts"]'));
  check('contacts share prefers the Web Share API',
    !!shared && /Gallery Gala/.test(shared.text || ''), shared && shared.title);
  next(w, doc, a);
})().catch(e => { console.log('FAIL  suite crashed :: ' + (e.stack || e.message)); process.exit(1); });

async function next(w, doc, a) {
  /* ================= save sheet: rename + card photo ================= */
  click(w, doc.querySelector('[data-act="saveEvent"]'));
  let panel = doc.querySelector('.prompt-panel');
  check('Save Event opens the save sheet', !!panel && /Event name/.test(panel.textContent));
  floatingCard('save sheet', w, panel);
  const titleInp = doc.getElementById('saveTitle');
  check('the rename field carries the current title', !!titleInp && titleInp.value === 'Gallery Gala',
    titleInp && titleInp.value);
  const thumbs = Array.from(doc.querySelectorAll('.thumb-strip .save-thumb'));
  check('the sheet offers the flyer plus a device picker',
    thumbs.length === 2 && !!doc.querySelector('[data-act="saveThumbDevice"]'), thumbs.length);
  check('the flyer is pre-selected',
    !!doc.querySelector('.save-thumb.on[data-src="assets/logo/EatOuts_Logo.png"]'));

  titleInp.value = 'Renamed Gala';
  click(w, doc.querySelector('[data-act="saveSheetSave"]'));
  await tick();
  const store = () => JSON.parse(w.localStorage.getItem('eatouts_customer_v1'));
  const saved = store().events[0] || {};
  check('save writes one event with the renamed title',
    store().events.length === 1 && saved.title === 'Renamed Gala', saved.title);
  check('the saved record carries the snapshot', !!saved.snapshot && saved.snapshot.version === 1);
  check('the saved record carries created + edited dates', !!saved.created_at && !!saved.updated_at);
  check('the saved record carries the chosen card photo',
    saved.image === 'assets/logo/EatOuts_Logo.png', saved.image);
  check('the sheet closes after saving', !doc.querySelector('#saveTitle'));

  click(w, doc.querySelector('[data-act="saveEvent"]'));
  doc.getElementById('saveTitle').value = 'Renamed Again';
  click(w, doc.querySelector('[data-act="saveSheetSave"]'));
  await tick();
  check('a second save updates the same record (rename does not duplicate)',
    store().events.length === 1 && store().events[0].title === 'Renamed Again',
    store().events.length + ' / ' + store().events[0].title);

  click(w, doc.querySelector('[data-act="saveEvent"]'));
  const deviceThumb = doc.querySelector('[data-act="saveThumbDevice"]');
  check('the device picker is a bare ＋ tile',
    !!deviceThumb && deviceThumb.textContent.trim() === '\uff0b');
  click(w, doc.querySelector('.prompt-panel [data-act="closeSaveSheet"]'));
  check('Cancel closes the save sheet', !doc.querySelector('#saveTitle'));
  /* backdrop tap is the second close path */
  click(w, doc.querySelector('[data-act="saveEvent"]'));
  click(w, doc.querySelector('.fpop-scrim[data-act="closeSaveSheet"]'));
  check('a backdrop tap closes the save sheet too', !doc.querySelector('#saveTitle'));

  /* ================= "Save draft?" guard ================= */
  click(w, doc.querySelector('[data-act="backToVenueList"]'));
  panel = doc.querySelector('.prompt-panel');
  check('Back to Venues asks about the draft', !!panel && /Save draft\?/.test(panel.textContent));
  floatingCard('leave guard', w, panel);
  check('the guard offers save / discard / keep editing',
    !!panel.querySelector('[data-act="leaveSaveDraft"]') &&
      !!panel.querySelector('[data-act="leaveDiscardDraft"]') &&
      !!panel.querySelector('[data-act="closeLeaveGuard"]'));
  click(w, doc.querySelector('[data-act="closeLeaveGuard"]'));
  check('Keep editing closes the draft prompt', !doc.querySelector('.prompt-panel'));

  w.localStorage.removeItem('eatouts.event.draft.v2');
  click(w, doc.querySelector('[data-act="backToVenueList"]'));
  click(w, doc.querySelector('[data-act="leaveSaveDraft"]'));
  check('Save draft writes the draft', !!w.localStorage.getItem('eatouts.event.draft.v2'));

  click(w, doc.querySelector('[data-act="backToVenueList"]'));
  click(w, doc.querySelector('[data-act="leaveDiscardDraft"]'));
  check('Discard draft clears it', !w.localStorage.getItem('eatouts.event.draft.v2'));

  console.log('\nignored jsdom navigation errors: ' + (a.errors.length - realErrors(a.errors).length));
  final(w);
}

function final() {
  /* ================= entry points ================= */
  const idx = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  check('the reserve tab offers Create New Event',
    /data-act="createEvent"/.test(idx) && /Create New Event/.test(idx));
  check('createEvent opens the builder',
    /act==="createEvent"\)\{location\.href="eatout_event_builder\.html"/.test(idx));

  const eventsSrc = fs.readFileSync(path.join(APP_DIR, 'eatouts-events.html'), 'utf8');
  check('saved-event cards show created + edited dates',
    /function dayLine\(/.test(eventsSrc) && /Edited /.test(eventsSrc));
  check('saved-event cards fall back to the snapshot flyer',
    /e\.snapshot && \(e\.snapshot\.flyerImages \|\| \[\]\)\[0\]/.test(eventsSrc));
  check('saved-event cards open the read-only page', /Created_Event\.html\?id=/.test(eventsSrc));

  console.log('\n' + checks + ' checks, ' + fails + ' failed');
  console.log(fails === 0 ? 'BUILDER SAVE-SHARE TEST PASSED' : 'BUILDER SAVE-SHARE TEST FAILED (' + fails + ')');
  process.exit(fails === 0 ? 0 : 1);
}

