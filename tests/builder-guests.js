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

function draftWith(venueId) {
  return {
    eventTitle: 'Gallery Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ startDate: '2026-11-07', startTime: '09:00', endDate: '2026-11-07', endTime: '17:00' }] },
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
  if (!venueId) { console.log('BUILDER-GUESTS TEST FAILED (no venue)'); process.exit(fails ? 1 : 0); }

  const a = boot(draftWith(venueId));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors', !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  /* ---------- Guests section is present and empty ---------- */
  const sec = doc.querySelector('[data-sec="guests"]');
  check('guests section exists', !!sec);
  check('empty hint mentions photo/role/notes and drops dietary',
    !!sec && /photo/i.test(sec.textContent) && !/dietary/i.test(sec.textContent));

  /* ---------- Add guest prompt ---------- */
  click(w, sec.querySelector('[data-act="addGuest"]'));
  const panel = doc.querySelector('.prompt-panel');
  check('add guest prompt opens', !!panel);

  const thumb = panel.querySelector('.prompt-thumb');
  const nameField = panel.querySelector('[data-prompt-field="name"]');
  check('centered thumbnail picker present', !!thumb && thumb.getAttribute('data-act') === 'pickPromptThumb');
  check('thumbnail sits above the name field',
    !!(thumb && nameField && (thumb.compareDocumentPosition(nameField) & w.Node.DOCUMENT_POSITION_FOLLOWING)));
  check('no Dietary notes field in the prompt',
    !/dietary/i.test(panel.textContent) && !panel.querySelector('[data-prompt-field="dietary"]'));

  const stepper = panel.querySelector('.qty-stepper');
  const kids = stepper ? Array.from(stepper.children) : [];
  check('plus-ones stepper is - # + (button,input,button)',
    kids.length === 3 && kids[0].tagName === 'BUTTON' && kids[1].tagName === 'INPUT' && kids[2].tagName === 'BUTTON');
  check('stepper minus is left with data-delta -1', !!kids[0] && kids[0].getAttribute('data-delta') === '-1');
  check('stepper plus is right with data-delta 1', !!kids[2] && kids[2].getAttribute('data-delta') === '1');

  const plusInput = panel.querySelector('[data-prompt-field="plus"]');
  click(w, kids[0]);
  click(w, kids[0]);
  check('stepper clamps at 0', plusInput.value === '0', 'got ' + plusInput.value);
  click(w, kids[2]); click(w, kids[2]);
  check('stepper increments to 2', plusInput.value === '2', 'got ' + plusInput.value);

  const noteBtn = panel.querySelector('[data-act="togglePromptNote"]');
  const noteBox = panel.querySelector('[data-note-box="note"]');
  check('Add Note button present', !!noteBtn);
  check('note fields hidden by default', !!noteBox && noteBox.style.display === 'none');
  check('note box has a Title and a Note input',
    !!noteBox && !!noteBox.querySelector('[data-prompt-field="noteTitle"]') && !!noteBox.querySelector('[data-prompt-field="noteText"]'));
  click(w, noteBtn);
  check('Add Note reveals the fields', noteBox.style.display !== 'none');

  type(w, nameField, 'Kagiso M.');
  type(w, panel.querySelector('[data-prompt-field="role"]'), 'Speaker');
  type(w, panel.querySelector('[data-prompt-field="noteTitle"]'), 'VIP entry');
  type(w, panel.querySelector('[data-prompt-field="noteText"]'), 'Arrive 30 min early.');
  click(w, panel.querySelector('[data-act="savePrompt"]'));
  check('prompt closes after save', !doc.querySelector('.prompt-panel'));

  /* ---------- Row: thumbnail left, name/meta right ---------- */
  const slot = doc.querySelector('[data-sec="guests"] .sup-slot');
  check('guest row rendered', !!slot);
  const slotThumb = slot && slot.querySelector('.sup-slot-thumb');
  const slotInfo = slot && slot.querySelector('.sup-slot-info');
  check('row has a thumbnail cell', !!slotThumb);
  check('thumbnail sits left of the info block',
    !!(slotThumb && slotInfo && (slotThumb.compareDocumentPosition(slotInfo) & w.Node.DOCUMENT_POSITION_FOLLOWING)));
  check('row shows the guest name', !!slot && /Kagiso M\./.test(slot.textContent));
  check('row meta carries role, note and plus',
    !!slot && /Speaker/.test(slot.textContent) && /VIP entry/.test(slot.textContent) && /\+2/.test(slot.textContent));
  check('section subtitle counts plus ones',
    /3 guests total/.test(doc.querySelector('[data-sec="guests"] .section-sub').textContent));

  /* ---------- Editable rows pre-fill the prompt ---------- */
  click(w, slot.querySelector('.sup-slot-info'));
  const epanel = doc.querySelector('.prompt-panel');
  check('tapping the row opens an edit prompt', !!epanel);
  check('edit pre-fills the name', !!epanel && epanel.querySelector('[data-prompt-field="name"]').value === 'Kagiso M.');
  check('edit pre-fills plus ones', !!epanel && epanel.querySelector('[data-prompt-field="plus"]').value === '2');
  check('edit pre-fills the note title', !!epanel && epanel.querySelector('[data-prompt-field="noteTitle"]').value === 'VIP entry');
  check('edit reveals the existing note', !!epanel && epanel.querySelector('[data-note-box="note"]').style.display !== 'none');
  check('edit offers a Delete button', !!epanel.querySelector('[data-act="deletePrompt"]'));
  click(w, epanel.querySelector('[data-act="closePrompt"]'));
  check('edit prompt closes', !doc.querySelector('.prompt-panel'));

  /* ---------- Remove ---------- */
  click(w, doc.querySelector('[data-sec="guests"] .sup-slot-btn.danger'));
  check('remove clears the guest list', !doc.querySelector('[data-sec="guests"] .sup-slot'));

  console.log('\nBUILDER-GUESTS TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
