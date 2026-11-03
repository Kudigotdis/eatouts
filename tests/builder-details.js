/* T12.5 — builder "Event Details" section:
   centred chips/hints + Dress-Code-Cards (90px thumb → gallery with add/remove/swipe). */
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
const wait = ms => new Promise(r => setTimeout(r, ms));
const PHOTO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';

function draftWith(venueId, extra) {
  return Object.assign({
    eventTitle: 'Dress Gala',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ id: 'd1', startDate: '', startTime: '', endDate: '', endTime: '', noteTitle: '', noteText: '' }] },
    suppliers: {},
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], guestCount: '' },
    guests: [], rsvp: [], notes: [], flyerImages: [], venueSpaces: [], venueRules: [],
    targetAudience: []
  }, extra || {});
}

(async () => {
  const raw = fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8');
  const probe = boot(null);
  check('builder boot: external scripts present',
    !probe.errors.some(e => e.indexOf('missing script') === 0),
    probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes venue list', !!venueId, 'no venues');
  if (!venueId) { console.log('BUILDER-DETAILS TEST FAILED (no venue)'); process.exit(1); }

  /* ---------- CSS rules ---------- */
  check('details chip rows are centred',
    /\[data-sec="details"\]\s*\.chip-row\s*\{[^}]*justify-content:center/.test(raw));
  check('details field hints are centred at 14px',
    /\[data-sec="details"\]\s*\.field-hint\s*\{[^}]*text-align:center[^}]*font-size:14px/.test(raw));
  check('dress thumb is a 90px square',
    /\.dc-thumb\s*\{[^}]*width:90px[^}]*height:90px/.test(raw));

  const a = boot(draftWith(venueId));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors',
    !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  const sec = doc.querySelector('[data-sec="details"]');
  check('details section exists', !!sec);

  /* ---------- 1. centred chips + hint ---------- */
  const modeRow = sec.querySelector('.chip-row');
  check('visibility chips use the equal-width row',
    !!modeRow && modeRow.classList.contains('eq') && modeRow.querySelectorAll('.chip').length === 2,
    modeRow ? modeRow.className : 'no .chip-row');
  const rowCs = modeRow ? w.getComputedStyle(modeRow) : null;
  check('visibility row is centred', !!rowCs && rowCs.justifyContent === 'center',
    rowCs ? rowCs.justifyContent : 'no row');
  const hint = sec.querySelector('.field-hint');
  const hintCs = hint ? w.getComputedStyle(hint) : null;
  check('field hint is centred', !!hintCs && hintCs.textAlign === 'center', hintCs ? hintCs.textAlign : 'no hint');
  check('field hint is 14px', !!hintCs && hintCs.fontSize === '14px', hintCs ? hintCs.fontSize : 'no hint');

  /* ---------- 2. dress-code cards ---------- */
  check('the old dress-code textarea is gone', !sec.querySelector('textarea[data-field="dresscode"]'));
  check('empty state explains the cards', /No dress code yet/.test(sec.textContent));
  const addBtn = sec.querySelector('[data-act="addDress"]');
  check('add dress code button present', !!addBtn && /Add dress code/.test(addBtn.textContent));
  check('no dress cards before adding', sec.querySelectorAll('.dc-card').length === 0);

  click(w, addBtn);
  const panel = doc.querySelector('.prompt-panel');
  check('add dress code opens the floating prompt', !!panel && !!panel.closest('.fpop-scrim'));
  check('prompt is titled Add Dress Code',
    !!panel && /Add Dress Code/.test((panel.querySelector('.fpop-hdr h3') || {}).textContent || ''));
  const panelCs = panel ? w.getComputedStyle(panel) : null;
  check('prompt uses the 420px / 16px card recipe',
    !!panelCs && panelCs.maxWidth === '420px' && panelCs.borderRadius === '16px',
    panelCs ? panelCs.maxWidth + ' / ' + panelCs.borderRadius : 'no panel');
  check('prompt has a 150px square photo picker',
    !!panel && !!panel.querySelector('.prompt-thumb') &&
    w.getComputedStyle(panel.querySelector('.prompt-thumb')).width === '150px');
  const hiddenThumb = panel && panel.querySelector('input[type="hidden"][data-prompt-field="thumb"]');
  check('photo picker keeps its value in the form', !!hiddenThumb);

  type(w, panel.querySelector('[data-prompt-field="name"]'), 'Black tie');
  if (hiddenThumb) hiddenThumb.value = PHOTO;
  click(w, panel.querySelector('[data-act="savePrompt"]'));
  check('prompt closes after save', !doc.querySelector('.prompt-panel'));

  const cards = () => doc.querySelectorAll('[data-sec="details"] .dc-card');
  check('one dress card after save', cards().length === 1, 'got ' + cards().length);
  const card = cards()[0];
  const thumb = card && card.querySelector('.dc-thumb');
  const thumbCs = thumb ? w.getComputedStyle(thumb) : null;
  check('card thumb is 90px square',
    !!thumbCs && thumbCs.width === '90px' && thumbCs.height === '90px',
    thumbCs ? thumbCs.width + '×' + thumbCs.height : 'no thumb');
  const img = thumb && thumb.querySelector('img');
  check('card thumb renders the picked photo', !!img && img.getAttribute('src') === PHOTO);
  check('card shows the dress-code name', /Black tie/.test(card.textContent));
  const x = card.querySelector('.dc-x');
  const xCs = x ? w.getComputedStyle(x) : null;
  check('card remove is a plain × glyph',
    !!x && x.textContent.trim() === '\u00d7' && !!xCs &&
    (xCs.backgroundColor === 'transparent' || xCs.backgroundColor === 'rgba(0, 0, 0, 0)') &&
    (xCs.borderRadius === '' || xCs.borderRadius === '0px'),
    xCs ? [x.textContent.trim(), xCs.backgroundColor, xCs.borderRadius].join(' / ') : 'no .dc-x');

  /* ---------- 3. edit + mirror ---------- */
  click(w, doc.querySelector('[data-sec="details"] .dc-name'));
  const editPanel = doc.querySelector('.prompt-panel');
  check('tapping the name opens Edit Dress Code',
    !!editPanel && /Edit Dress Code/.test((editPanel.querySelector('.fpop-hdr h3') || {}).textContent || ''));
  check('edit prompt is prefilled',
    !!editPanel && editPanel.querySelector('[data-prompt-field="name"]').value === 'Black tie');
  type(w, editPanel.querySelector('[data-prompt-field="name"]'), 'Black tie & gowns');
  click(w, editPanel.querySelector('[data-act="savePrompt"]'));
  check('edited name shows on the card', /Black tie & gowns/.test(doc.querySelector('.dc-card').textContent));
  check('dresscode mirror follows the cards',
    w.eval('STATE.eventDetails.dresscode') === 'Black tie & gowns',
    String(w.eval('STATE.eventDetails.dresscode')));

  click(w, doc.querySelector('[data-act="addDress"]'));
  const p2 = doc.querySelector('.prompt-panel');
  type(w, p2.querySelector('[data-prompt-field="name"]'), 'Smart casual');
  click(w, p2.querySelector('[data-act="savePrompt"]'));
  check('second card added', cards().length === 2, 'got ' + cards().length);
  check('mirror joins both cards',
    w.eval('STATE.eventDetails.dresscode') === 'Black tie & gowns, Smart casual',
    String(w.eval('STATE.eventDetails.dresscode')));

  /* ---------- 4. gallery: swipe + add/remove ---------- */
  click(w, doc.querySelector('[data-sec="details"] .dc-thumb'));
  let gal = doc.querySelector('.img-gal');
  check('tapping the thumb opens the full-image gallery', !!gal);
  check('gallery captions the card', !!gal && /Black tie & gowns/.test(gal.textContent));
  check('gallery shows the photo track', !!gal && !!gal.querySelector('.img-gal-track img'));
  check('gallery offers add + remove photo',
    !!gal && !!gal.querySelector('[data-act="galAddPhoto"]') &&
    !!gal.querySelector('[data-act="galRemovePhoto"]'));
  check('gallery has no dots for a single photo', !!gal && !gal.querySelector('.img-gal-dot'));

  click(w, gal.querySelector('[data-act="galRemovePhoto"]'));
  gal = doc.querySelector('.img-gal');
  check('removing the only photo clears the card',
    w.eval('STATE.eventDetails.dress[0].photos.length') === 0,
    String(w.eval('STATE.eventDetails.dress[0].photos.length')));
  check('empty gallery says so and hides remove',
    !!gal && /No photos yet/.test(gal.textContent) && !gal.querySelector('[data-act="galRemovePhoto"]'));

  click(w, gal); // outside tap = the backdrop element itself
  check('outside tap closes the gallery', !doc.querySelector('.img-gal'));
  check('card falls back to the hanger glyph', !doc.querySelector('[data-sec="details"] .dc-thumb img'));

  /* ---------- 5. remove a card ---------- */
  click(w, doc.querySelectorAll('[data-sec="details"] .dc-x')[1]);
  check('× removes the card', cards().length === 1, 'got ' + cards().length);
  check('mirror drops the removed card',
    w.eval('STATE.eventDetails.dresscode') === 'Black tie & gowns',
    String(w.eval('STATE.eventDetails.dresscode')));

  /* ---------- 6. delete from the edit prompt ---------- */
  click(w, doc.querySelector('[data-sec="details"] .dc-name'));
  click(w, doc.querySelector('[data-act="deletePrompt"]'));
  check('delete in the edit prompt removes the card', cards().length === 0, 'got ' + cards().length);
  check('empty state returns', /No dress code yet/.test(doc.querySelector('[data-sec="details"]').textContent));

  /* ---------- 7. draft round-trip ---------- */
  click(w, doc.querySelector('[data-act="addDress"]'));
  const p3 = doc.querySelector('.prompt-panel');
  type(w, p3.querySelector('[data-prompt-field="name"]'), 'Traditional attire');
  click(w, p3.querySelector('[data-act="savePrompt"]'));
  await wait(700); // autosave debounce
  const saved = JSON.parse(w.localStorage.getItem('eatouts.event.draft.v2') || '{}');
  check('autosave keeps the dress cards',
    Array.isArray((saved.eventDetails || {}).dress) && saved.eventDetails.dress.length === 1,
    JSON.stringify((saved.eventDetails || {}).dress || null));
  const b = boot(saved);
  check('reloaded draft: no window errors',
    !b.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), b.errors.join(' | '));
  check('reloaded draft restores the card',
    !!b.doc.querySelector('[data-sec="details"] .dc-card') &&
    /Traditional attire/.test(b.doc.querySelector('[data-sec="details"] .dc-card').textContent));

  /* legacy draft: dresscode string only, no cards array */
  const legacy = boot(draftWith(venueId, {
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [], guestCount: '', dresscode: 'Smart casual' }
  }));
  check('legacy draft: no window errors',
    !legacy.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), legacy.errors.join(' | '));
  check('legacy draft renders the empty card state',
    !legacy.doc.querySelector('[data-sec="details"] .dc-card') &&
    /No dress code yet/.test(legacy.doc.querySelector('[data-sec="details"]').textContent));

  console.log('\nBUILDER-DETAILS TEST ' + (fails ? 'FAILED (' + fails + ')' : 'PASSED'));
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
