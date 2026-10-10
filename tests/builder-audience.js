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
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
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

function draftWith(venueId, extra) {
  return Object.assign({
    eventTitle: 'Gallery Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ id: 'd1', startDate: '', startTime: '', endDate: '', endTime: '', noteTitle: '', noteText: '' }] },
    suppliers: {},
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], budget: '1', guestCount: '' },
    guests: [], rsvp: [], notes: [], flyerImages: [], venueSpaces: [], venueRules: [],
    targetAudience: []
  }, extra || {});
}

(async () => {
  const probe = boot(null);
  check('builder boot: external scripts present', !probe.errors.some(e => e.indexOf('missing script') === 0), probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes venue list', !!venueId, 'no venues');
  if (!venueId) { console.log('BUILDER-AUDIENCE TEST FAILED (no venue)'); process.exit(fails ? 1 : 0); }

  /* ---------- Scoped field-hint size ---------- */
  const raw = fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8');
  check('audience field-hint has a 14px scoped rule',
    /\[data-sec="audience"\]\s*\.field-hint\s*\{[^}]*font-size:14px/.test(raw));
  check('global field-hint stays 11px', /\.field-hint\{font-size:11px/.test(raw));

  const a = boot(draftWith(venueId));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors', !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  const sec = doc.querySelector('[data-sec="audience"]');
  check('audience section exists', !!sec);
  check('audience hint carries field-hint class',
    !!sec.querySelector('.field-hint'));

  /* ---------- Optional guest count ---------- */
  const gc = sec.querySelector('[data-field="guestCount"]');
  check('guest count input present', !!gc);
  check('guest count is a number input', gc && gc.getAttribute('type') === 'number');
  check('guest count is optional (blank + placeholder)',
    gc && gc.value === '' && !!gc.getAttribute('placeholder'));
  const gcField = gc && gc.closest('.field');
  check('guest count is the first body field', !!gcField && /Number of guests \(optional\)/.test(gcField.textContent));

  type(w, gc, '120');
  w.render();
  check('guest count persists across a re-render',
    doc.querySelector('[data-field="guestCount"]').value === '120');

  /* ---------- Event Rules (repeatable) ---------- */
  const rulesField = Array.from(doc.querySelectorAll('[data-sec="audience"] .field'))
    .find(f => /Event Rules/.test((f.querySelector('label') || {}).textContent || ''));
  check('Event Rules field present', !!rulesField);
  check('Event Rules starts empty', rulesField && !rulesField.querySelector('.audience-card'));
  check('Event Rules Add button present', !!doc.querySelector('[data-sec="audience"] [data-act="addRule"]'));

  click(w, doc.querySelector('[data-act="addRule"]'));
  const panel = doc.querySelector('.prompt-panel');
  check('add rule prompt opens', !!panel);
  check('rule prompt has title + note fields',
    !!panel && !!panel.querySelector('[data-prompt-field="title"]') && !!panel.querySelector('[data-prompt-field="note"]'));
  type(w, panel.querySelector('[data-prompt-field="title"]'), 'No outside alcohol');
  type(w, panel.querySelector('[data-prompt-field="note"]'), 'Bar service is on site.');
  click(w, panel.querySelector('[data-act="savePrompt"]'));
  check('rule prompt closes after save', !doc.querySelector('.prompt-panel'));

  const rulesField2 = Array.from(doc.querySelectorAll('[data-sec="audience"] .field'))
    .find(f => /Event Rules/.test((f.querySelector('label') || {}).textContent || ''));
  const ruleCards = rulesField2.querySelectorAll('.audience-card');
  check('one rule card after save', ruleCards.length === 1, 'got ' + ruleCards.length);
  check('rule card shows title + note',
    /No outside alcohol/.test(ruleCards[0].textContent) && /Bar service is on site\./.test(ruleCards[0].textContent));

  click(w, doc.querySelector('[data-sec="audience"] [data-act="removeRule"]'));
  const rulesField3 = Array.from(doc.querySelectorAll('[data-sec="audience"] .field'))
    .find(f => /Event Rules/.test((f.querySelector('label') || {}).textContent || ''));
  check('rule removed', rulesField3.querySelectorAll('.audience-card').length === 0);

  /* ---------- Persistence across reload ---------- */
  const b = boot(draftWith(venueId, {
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], budget: '1', guestCount: '250' },
    venueRules: [{ id: 'r1', title: 'No outside alcohol', note: 'Bar service is on site.' }]
  }));
  const ddoc = b.doc;
  check('seeded boot: no window errors', !b.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), b.errors.join(' | '));
  check('seeded guest count restored', ddoc.querySelector('[data-field="guestCount"]').value === '250');
  const seededField = Array.from(ddoc.querySelectorAll('[data-sec="audience"] .field'))
    .find(f => /Event Rules/.test((f.querySelector('label') || {}).textContent || ''));
  check('seeded rule restored',
    !!seededField.querySelector('.audience-card') && /No outside alcohol/.test(seededField.textContent));

  console.log('\nBUILDER-AUDIENCE TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
