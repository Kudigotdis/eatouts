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

  /* ---------- 12.2 — equal-width centred mode chips ---------- */
  const raw = fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8');
  check('12.2: mode chips are an equal two-up grid in CSS',
    /\.chip-row\.eq\{display:grid;grid-template-columns:1fr 1fr/.test(raw));
  check('12.2: grid chips are centred in CSS', /\.chip-row\.eq \.chip\{text-align:center/.test(raw));
  const chipRow = sec.querySelector('.chip-row.eq');
  check('12.2: schedule chips sit in the equal row', !!chipRow,
    (sec.querySelector('.chip-row') || {}).className || 'no .chip-row');
  const chipCs = chipRow ? w.getComputedStyle(chipRow) : null;
  check('12.2: chip row computes to a grid', !!chipCs && chipCs.display === 'grid', chipCs && chipCs.display);
  const chips = chipRow ? chipRow.querySelectorAll('.chip') : [];
  check('12.2: two mode chips', chips.length === 2, 'got ' + chips.length);
  check('12.2: both chips are centre-aligned', chips.length === 2 &&
    w.getComputedStyle(chips[0]).textAlign === 'center' && w.getComputedStyle(chips[1]).textAlign === 'center');

  /* ---------- 12.2 — each day is a collapsible accordion ---------- */
  let acc = doc.querySelector('[data-sec="schedule"] .schedule-day');
  const accHdr = acc.querySelector('.schedule-day-hdr');
  check('12.2: the day header is the accordion toggle',
    !!accHdr && accHdr.getAttribute('data-act') === 'toggleDayOpen' && accHdr.getAttribute('data-idx') === '0',
    accHdr && accHdr.getAttribute('data-act'));
  check('12.2: the day starts expanded',
    !acc.classList.contains('collapsed') && !!acc.querySelector('.schedule-day-in'));
  click(w, accHdr);
  acc = doc.querySelector('[data-sec="schedule"] .schedule-day');
  check('12.2: tapping the header collapses the day', acc.classList.contains('collapsed'));
  const bodyCs = w.getComputedStyle(acc.querySelector('.schedule-day-in'));
  check('12.2: a collapsed day hides its body', bodyCs.display === 'none', bodyCs.display);
  check('12.2: a collapsed day drops the header rule',
    /\.schedule-day\.collapsed \.schedule-day-hdr\{border-bottom:0\}/.test(raw));
  click(w, doc.querySelector('[data-sec="schedule"] .schedule-day-hdr'));
  acc = doc.querySelector('[data-sec="schedule"] .schedule-day');
  check('12.2: tapping again expands the day',
    !acc.classList.contains('collapsed') && !!acc.querySelector('.schedule-day-in'));

  /* ---------- 12.2 — Year | Month | Day and Hour | Minute rows ---------- */
  check('12.2: date row is a 3-column grid in CSS', /\.dt-row\.dt-3\{grid-template-columns:1fr 1fr 1fr\}/.test(raw));
  check('12.2: time row is a 2-column grid in CSS', /\.dt-row\.dt-2\{grid-template-columns:1fr 1fr\}/.test(raw));
  const dtDay = doc.querySelector('[data-sec="schedule"] .schedule-day');
  const dateRows = dtDay.querySelectorAll('.dt-row.dt-3');
  check('12.2: each date is one row of three buttons', dateRows.length === 2, 'got ' + dateRows.length);
  const startParts = Array.from(dateRows[0].querySelectorAll('.dt-btn')).map(b => b.getAttribute('data-part'));
  check('12.2: start date row is Year | Month | Day', startParts.join(',') === 'y,m,d', startParts.join(','));
  const startLabels = Array.from(dateRows[0].querySelectorAll('.dt-btn')).map(b => b.textContent.trim());
  check('12.2: empty start date reads Year | Month | Day', startLabels.join('|') === 'Year|Month|Day', startLabels.join('|'));
  const timeRows = dtDay.querySelectorAll('.dt-row.dt-2');
  check('12.2: each time is one row of two buttons', timeRows.length === 2, 'got ' + timeRows.length);
  const timeParts = Array.from(timeRows[0].querySelectorAll('.dt-btn')).map(b => b.getAttribute('data-part'));
  check('12.2: start time row is Hour | Minute', timeParts.join(',') === 'h,mi', timeParts.join(','));
  check('12.2: the date/time buttons target their own day + field',
    dateRows[0].querySelector('.dt-btn').getAttribute('data-idx') === '0' &&
    dateRows[0].querySelector('.dt-btn').getAttribute('data-dfield') === 'startDate' &&
    dateRows[1].querySelector('.dt-btn').getAttribute('data-dfield') === 'endDate');
  check('12.2: no native date/time inputs left in the schedule',
    dtDay.querySelectorAll('input[type="date"],input[type="time"]').length === 0,
    dtDay.querySelectorAll('input[type="date"],input[type="time"]').length + ' left');

  /* ---------- Per-day Add Note ---------- */
  let day = doc.querySelector('[data-sec="schedule"] .schedule-day');
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

  /* ---------- 12.2 — the floating scroll-list pickers ---------- */
  const c = boot(draftWith(venueId, [
    { id: 'd1', startDate: '2028-02-10', startTime: '19:30', endDate: '2028-02-10', endTime: '23:00', noteTitle: '', noteText: '' }
  ]));
  const cw = c.w, cdoc = c.doc;
  check('picker boot: no window errors', !c.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), c.errors.join(' | '));
  const pick = (part) => cdoc.querySelector('.dt-btn[data-part="' + part + '"]');
  check('12.2: a stored date renders as Year | Month | Day',
    pick('y').textContent.trim() === '2028' && pick('m').textContent.trim() === 'Feb' && pick('d').textContent.trim() === '10',
    [pick('y'), pick('m'), pick('d')].map(b => b.textContent.trim()).join('|'));
  check('12.2: a stored time renders as Hour | Minute',
    pick('h').textContent.trim() === '19' && pick('mi').textContent.trim() === '30',
    pick('h').textContent.trim() + '|' + pick('mi').textContent.trim());

  click(cw, pick('d'));
  let pop = cdoc.querySelector('.fpop-scrim .fpop');
  check('12.2: tapping a part opens the floating picker', !!pop);
  check('12.2: the picker floats over a centred scrim',
    !!pop && cw.getComputedStyle(pop.closest('.fpop-scrim')).display === 'flex');
  check('12.2: the picker holds a scroll list', !!pop && !!pop.querySelector('.fpop-body.sp-body'));
  check('12.2: the picker is titled Day', !!pop && pop.querySelector('.fpop-hdr h3').textContent === 'Day',
    pop && pop.querySelector('.fpop-hdr h3').textContent);
  check('12.2: leap February offers 29 days',
    !!pop && pop.querySelectorAll('.sp-opt').length === 29, pop && pop.querySelectorAll('.sp-opt').length);
  check('12.2: the stored day is preselected',
    !!pop && pop.querySelector('.sp-opt.on .sp-lbl').textContent === '10');

  click(cw, cdoc.querySelectorAll('.sp-opt')[28]);
  check('12.2: the picker closes after a pick', !cdoc.querySelector('.fpop-scrim .fpop'));
  check('12.2: picking the 29th writes it back', pick('d').textContent.trim() === '29', pick('d').textContent.trim());

  click(cw, pick('y'));
  pop = cdoc.querySelector('.fpop-scrim .fpop');
  check('12.2: the year picker spans 13 years', !!pop && pop.querySelectorAll('.sp-opt').length === 13,
    pop && pop.querySelectorAll('.sp-opt').length);
  const y2027 = Array.from(pop.querySelectorAll('.sp-opt')).find(o => o.getAttribute('data-val') === '2027');
  click(cw, y2027);
  check('12.2: 29 Feb clamps to 28 when the year is not a leap year',
    pick('y').textContent.trim() === '2027' && pick('d').textContent.trim() === '28',
    pick('y').textContent.trim() + '-' + pick('d').textContent.trim());

  click(cw, pick('mi'));
  pop = cdoc.querySelector('.fpop-scrim .fpop');
  check('12.2: the minute picker offers 60 values', !!pop && pop.querySelectorAll('.sp-opt').length === 60,
    pop && pop.querySelectorAll('.sp-opt').length);
  click(cw, Array.from(pop.querySelectorAll('.sp-opt')).find(o => o.getAttribute('data-val') === '45'));
  check('12.2: picking a minute keeps the hour',
    pick('h').textContent.trim() === '19' && pick('mi').textContent.trim() === '45',
    pick('h').textContent.trim() + ':' + pick('mi').textContent.trim());

  click(cw, pick('h'));
  pop = cdoc.querySelector('.fpop-scrim .fpop');
  check('12.2: the hour picker offers 24 values', !!pop && pop.querySelectorAll('.sp-opt').length === 24,
    pop && pop.querySelectorAll('.sp-opt').length);
  await new Promise(r => setTimeout(r, 500)); // scheduleSave() debounces the draft by 400ms
  check('12.2: a picked schedule survives into the saved draft',
    JSON.parse(cw.localStorage.getItem('eatouts.event.draft.v2')).schedule.days[0].startTime === '19:45',
    JSON.parse(cw.localStorage.getItem('eatouts.event.draft.v2')).schedule.days[0].startTime);
  click(cw, pop.querySelector('.fpop-x'));
  check('12.2: the picker X closes it', !cdoc.querySelector('.fpop-scrim .fpop'));

  console.log('\nBUILDER-SCHEDULE TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
