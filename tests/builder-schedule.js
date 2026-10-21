const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function inline(html) {
  const errors = [];
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + src); return '<!-- missing -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  return { html, errors };
}

function boot(draft) {
  const { html, errors } = inline(fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8'));
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://127.0.0.1/eatout_event_builder.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(w) {
      if (draft) w.localStorage.setItem('eatouts.event.draft.v2', JSON.stringify(draft));
    }
  });
  return { dom, w: dom.window, doc: dom.window.document, errors };
}

function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function type(w, inp, val) { inp.value = val; inp.dispatchEvent(new w.Event('input', { bubbles: true })); }

function draftWith(venueId, days) {
  return {
    eventTitle: 'Gallery Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: days || [{ id: 'd1', startDate: '', startTime: '', endDate: '', endTime: '', noteTitle: '', noteText: '' }] },
    suppliers: {},
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], budget: '1' },
    guests: [], rsvp: [], notes: [], flyerImages: [], venueSpaces: [], venueRules: [],
    targetAudience: []
  };
}

(async () => {
  const probe = boot(null);
  check('builder boot: external scripts present', !probe.errors.some(e => e.indexOf('missing script') === 0), probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes venue list', !!venueId, 'no venues');
  if (!venueId) { console.log('BUILDER-SCHEDULE TEST FAILED (no venue)'); process.exit(fails ? 1 : 0); }

  const a = boot(draftWith(venueId));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors', !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  const sec = doc.querySelector('[data-sec="schedule"]');
  check('schedule section exists', !!sec);

  /* ---------- 24px above Schedule type ---------- */
  const typeField = sec.querySelector('.section-body-in > .field');
  check('Schedule type field is the first body field', !!typeField && /Schedule type/.test(typeField.textContent));
  check('Schedule type field has margin-top 24px', !!typeField && typeField.style.marginTop === '24px', typeField && typeField.getAttribute('style'));

  /* ---------- Per-day Add Note ---------- */
  let day = sec.querySelector('.schedule-day');
  check('day block rendered', !!day);
  check('note sits below the date/time grids (after the day-in fields)',
    !!day && !!day.querySelector('.schedule-day-in [data-act="toggleDayNote"]'));
  let noteBtn = day.querySelector('[data-act="toggleDayNote"]');
  check('Add Note button present', !!noteBtn);
  check('note collapsed when empty', !day.querySelector('.sched-note-box'));
  check('empty button reads Add Note', /Add Note/.test(noteBtn.textContent));

  click(w, noteBtn);
  day = doc.querySelector('[data-sec="schedule"] .schedule-day');
  let box = day.querySelector('.sched-note-box');
  check('tapping reveals the note box', !!box);
  check('note box has a Title and a Note field',
    !!box.querySelector('[data-dfield="noteTitle"]') && !!box.querySelector('[data-dfield="noteText"]'));
  check('note fields target the day index',
    box.querySelector('[data-dfield="noteTitle"]').getAttribute('data-day') === '0' &&
    box.querySelector('[data-dfield="noteText"]').getAttribute('data-day') === '0');

  type(w, box.querySelector('[data-dfield="noteTitle"]'), 'Setup & soundcheck');
  type(w, box.querySelector('[data-dfield="noteText"]'), 'Doors open 18:00.');
  click(w, day.querySelector('[data-act="toggleDayNote"]'));
  day = doc.querySelector('[data-sec="schedule"] .schedule-day');
  check('collapsed note shows the saved summary',
    !day.querySelector('.sched-note-box') && /Note added/.test(day.querySelector('[data-act="toggleDayNote"]').textContent) &&
    /Setup & soundcheck/.test(day.querySelector('[data-act="toggleDayNote"]').textContent));

  click(w, day.querySelector('[data-act="toggleDayNote"]'));
  day = doc.querySelector('[data-sec="schedule"] .schedule-day');
  check('reopened note kept its title', day.querySelector('[data-dfield="noteTitle"]').value === 'Setup & soundcheck');
  check('reopened note kept its body', day.querySelector('[data-dfield="noteText"]').value === 'Doors open 18:00.');

  /* ---------- Multi-day: new days get the block too ---------- */
  click(w, doc.querySelector('[data-sec="schedule"] [data-act="setScheduleMode"][data-val="multi-day"]'));
  click(w, doc.querySelector('[data-sec="schedule"] [data-act="addDay"]'));
  const days = doc.querySelectorAll('[data-sec="schedule"] .schedule-day');
  check('two days after Add another day', days.length === 2, 'got ' + days.length);
  const day2 = days[1];
  check('second day has an Add Note button', !!day2.querySelector('[data-act="toggleDayNote"]'));
  check('second day note starts collapsed', !day2.querySelector('.sched-note-box'));
  check('second day note targets index 1',
    day2.querySelector('[data-act="toggleDayNote"]').getAttribute('data-idx') === '1');

  /* ---------- Seeded note opens by default ---------- */
  const b = boot(draftWith(venueId, [
    { id: 'd1', startDate: '2026-11-07', startTime: '09:00', endDate: '2026-11-07', endTime: '17:00', noteTitle: 'Rehearsal', noteText: 'Arrive early.' }
  ]));
  const dw = b.w, ddoc = b.doc;
  check('seeded boot: no window errors', !b.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), b.errors.join(' | '));
  const sday = ddoc.querySelector('[data-sec="schedule"] .schedule-day');
  check('seeded day note opens by default', !!sday.querySelector('.sched-note-box'));
  check('seeded note title restored', sday.querySelector('[data-dfield="noteTitle"]').value === 'Rehearsal');
  check('seeded note body restored', sday.querySelector('[data-dfield="noteText"]').value === 'Arrive early.');

  console.log('\nBUILDER-SCHEDULE TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
