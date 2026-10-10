const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

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

function click(w, el) {
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
}
function type(w, inp, val) {
  inp.value = val;
  inp.dispatchEvent(new w.Event('input', { bubbles: true }));
}

function draftWith(venueId, suppliers) {
  return {
    eventTitle: 'Test Event',
    venueId: venueId,
    eventType: { eventId: 'wedding_ceremony', name: 'Wedding Ceremony', categoryId: 'weddings_cultural', categoryName: 'Weddings & Cultural Traditions', subCategoryName: 'Ceremony & Weekend', description: '', icon: '💍' },
    schedule: { mode: 'one-day', days: [{ startDate: '2026-11-07', startTime: '09:00', endDate: '2026-11-07', endTime: '17:00' }] },
    suppliers: suppliers,
    eventDetails: { mode: 'private', entryType: 'free', tiers: [], contacts: [] },
    guests: [], rsvp: [], notes: [], flyerImages: [], venueSpaces: [], venueRules: [],
    targetAudience: []
  };
}

(async () => {
  /* ---------- probe instance: find a venue id for seeding ---------- */
  const probe = boot(null);
  check('builder boot: external scripts present (catalogue + master)', !probe.errors.some(e => e.indexOf('missing script') === 0), probe.errors.filter(e => e.indexOf('missing script') === 0).join(' | '));
  const venueId = (probe.w.getVenues()[0] || {}).id;
  check('probe exposes venue list', !!venueId, 'no venues');
  if (!venueId) { console.log('SUPPLIERS TEST PASSED? no, cannot seed venue'); process.exit(fails ? 1 : 0); }

  /* ---------- main instance: named suppliers ---------- */
  const a = boot(draftWith(venueId, {
    event_planning: [ { supplierId: 'demo_supplier_001', customisations: { qty: '1', addon_0: '1', addon_1: '0' } } ]
  }));
  const w = a.w, doc = a.doc;
  check('main boot: no window errors', !a.errors.some(e => e.indexOf('missing script') !== 0 && !/console\.error/.test(e)), a.errors.join(' | '));

  /* ---------- catalogue globals ---------- */
  check('EATOUTS_SUPPLIERS has 200 profiles', Array.isArray(w.EATOUTS_SUPPLIERS) && w.EATOUTS_SUPPLIERS.length === 200, 'got ' + (w.EATOUTS_SUPPLIERS && w.EATOUTS_SUPPLIERS.length));
  check('EATOUTS_SUPPLIER_CATS has 40 categories', Array.isArray(w.EATOUTS_SUPPLIER_CATS) && w.EATOUTS_SUPPLIER_CATS.length === 40, 'got ' + (w.EATOUTS_SUPPLIER_CATS && w.EATOUTS_SUPPLIER_CATS.length));
  check('master catalogue loads (40 main cats)', !!(w.MASTER_SUPPLIER_CATALOGUE && w.MASTER_SUPPLIER_CATALOGUE.counts.mainCategories === 40));
  check('unit map covers 76 pricing models', !!w.EATOUTS_SUPPLIER_UNIT_MAP && Object.keys(w.EATOUTS_SUPPLIER_UNIT_MAP).length === 76, 'got ' + (w.EATOUTS_SUPPLIER_UNIT_MAP && Object.keys(w.EATOUTS_SUPPLIER_UNIT_MAP).length));

  /* ---------- normalized data access ---------- */
  const all = w.getSuppliers();
  check('getSuppliers normalizes 200 records', all.length === 200);
  const first = all[0];
  check('normalized record has businessName/unit/rating/thumb/catId', !!(first && first.businessName && first.unit && first.rating && first.thumb && first.catId),
    first ? (first.name + ' | ' + first.catId + ' | ' + first.unit + ' | ' + first.rating) : 'no first');
  check('findSupplier resolves a catalogue id', w.findSupplier('demo_supplier_001') && w.findSupplier('demo_supplier_001').unit === 'per event');
  check('findSupplier falls back to legacy draft ids', w.findSupplier('sup2') && w.findSupplier('sup2').name === 'Kalahari Feasts');

  /* ---------- suppliers section groups by category ---------- */
  const groups = doc.querySelectorAll('[data-sec="suppliers"] .sup-group');
  check('suppliers section renders one category group', groups.length === 1, 'got ' + groups.length);
  const gname = doc.querySelector('[data-sec="suppliers"] .sup-group .sup-group-name');
  check('group header shows the catalogue category name', gname && /Event Planning/i.test(gname.textContent), gname && gname.textContent);
  const slotName = doc.querySelector('[data-sec="suppliers"] .sup-slot-name');
  check('slot shows the supplier name', slotName && slotName.textContent.trim() === 'Tebogo Molefe', slotName && slotName.textContent.trim());
  const budget = doc.querySelector('[data-sec="suppliers"] .sup-stat .gold');
  check('budget = unit x qty + one add-on (P5850.00)', budget && budget.textContent.trim() === 'P5,850.00', budget && budget.textContent.trim());

  /* ---------- directory popup: filtered categories + rename ---------- */
  const browse = doc.querySelector('[data-sec="suppliers"] .sup-add-btn[data-cat=""]');
  click(w, browse);
  let cats = doc.querySelectorAll('.stm-cat');
  check('directory popup lists 36 visible categories', cats.length === 36, 'got ' + cats.length);
  const catNames = [].slice.call(doc.querySelectorAll('.stm-cat-name')).map(n => n.textContent.trim());
  const catLower = catNames.map(n => n.toLowerCase());
  check('hidden categories are absent from the list',
    ['venues', 'permits,', 'travel, tourism', 'clothing, fashion'].every(frag => !catLower.some(n => n.indexOf(frag) > -1)),
    catNames.join(' | '));
  check('Beverages renamed to Bartenders',
    catLower.indexOf('bartenders') > -1 && catLower.indexOf('beverages, bars and drinks') === -1,
    catNames.join(' | '));
  check('category header has no icon or count meta', !doc.querySelector('.stm-cat-ico') && !doc.querySelector('.stm-cat-meta'));

  /* ---------- live search ---------- */
  const search = doc.getElementById('stmSearch');
  type(w, search, 'zzzz-no-match');
  check('no-match search collapses every category to empty', doc.querySelectorAll('.stm-empty').length === 36, 'got ' + doc.querySelectorAll('.stm-empty').length);
  check('demo-rate note removed', !doc.querySelector('.fpop-note'));

  /* ---------- reopen via in-group Add (pre-selected category) ---------- */
  click(w, doc.querySelector('.fpop-close'));
  click(w, doc.querySelector('[data-sec="suppliers"] .sup-group .sup-add-btn'));
  const openCat = doc.querySelector('.stm-cat.open');
  check('in-group Add opens that category expanded', openCat && /event planning/i.test(openCat.querySelector('.stm-cat-name').textContent), openCat && openCat.querySelector('.stm-cat-name').textContent);
  const rows = [].slice.call(doc.querySelectorAll('.stm-sup'));
  check('directory offers rows that open a supplier profile', rows.length > 0, 'got ' + rows.length);

  /* ---------- an already-added supplier is flagged and closed via scrim ---------- */
  const addedRow = rows.find(r => w.findAddedEntry(r.getAttribute('data-id')));
  if (addedRow) {
    click(w, addedRow);
    check('profile labels an already-added supplier', !!doc.querySelector('.sup-profile-added'));
    click(w, doc.querySelector('[data-act="closeSupplierProfile"]'));
    check('profile closes on scrim tap', !doc.querySelector('.sup-profile-panel'));
  } else {
    console.log('  note: no seeded supplier row found in the open category; skipping already-added branch');
  }

  /* ---------- add a supplier via its profile popup (prefer one with add-ons) ---------- */
  const freshRows = [].slice.call(doc.querySelectorAll('.stm-sup'));
  let target = null;
  for (let i = 0; i < freshRows.length; i++) {
    const id = freshRows[i].getAttribute('data-id');
    const s = w.findSupplier(id);
    if (s && s.addons && s.addons.length && !w.findAddedEntry(id)) { target = s; click(w, freshRows[i]); break; }
  }
  if (!target) { target = w.findSupplier(freshRows[0].getAttribute('data-id')); click(w, freshRows[0]); }
  check('profile popup opens on row tap', !!doc.querySelector('.sup-profile-panel'));
  check('profile shows avatar + name', !!(doc.querySelector('.sup-profile-avatar') && doc.querySelector('.sup-profile-name')),
    doc.querySelector('.sup-profile-name') && doc.querySelector('.sup-profile-name').textContent);
  const pitCards = doc.querySelectorAll('.sup-profile-panel .pit-card');
  check('profile lists priced items (base service + add-ons)', pitCards.length >= 1, 'got ' + pitCards.length + ' for ' + target.name);
  const addonPrice = (target.addons && target.addons.length) ? w.parseAddonPrice(target.addons[0]).price : null;
  click(w, doc.querySelector('.sup-profile-panel .pit-card .qty-stepper [data-act="incProfileItem"]'));
  if (addonPrice) {
    const addonStep = doc.querySelectorAll('.sup-profile-panel .pit-card .qty-stepper')[1];
    click(w, addonStep.querySelector('[data-act="incProfileItem"]'));
  }
  click(w, doc.querySelector('[data-act="addSupplierFromProfile"]'));
  const slots = doc.querySelectorAll('[data-sec="suppliers"] .sup-group .sup-slot');
  check('new supplier added into the category bucket', slots.length === 2, 'got ' + slots.length);
  check('profile popup closed after adding', !doc.querySelector('.sup-profile-panel') && !doc.querySelector('.fpop'));
  const expected1 = 5500 + 350 + target.price * 2 + (addonPrice || 0); // sup1 (1x + 1 addon) + new supplier (2x + 1 addon)
  const budget1 = doc.querySelector('[data-sec="suppliers"] .sup-stat .gold').textContent.trim();
  check('budget reflects offering quantities (' + w.fmt(expected1) + ')', budget1 === w.fmt(expected1), budget1 + ' vs ' + w.fmt(expected1));

  /* ---------- qty stepper ---------- */
  click(w, doc.querySelectorAll('[data-act="customiseSupplier"]')[1]); // open customise for the new supplier
  click(w, doc.querySelector('[data-act="incSupQty"]'));
  const expected2 = expected1 + target.price; // base qty 3
  const budget2 = doc.querySelector('[data-sec="suppliers"] .sup-stat .gold').textContent.trim();
  check('+qty grows that supplier line (' + w.fmt(expected2) + ')', budget2 === w.fmt(expected2), budget2 + ' vs ' + w.fmt(expected2));

  /* ---------- add-on stepper ---------- */
  if (addonPrice) {
    click(w, doc.querySelector('[data-act="incSupAddon"]'));
    const expected3 = expected2 + addonPrice;
    const budget3 = doc.querySelector('[data-sec="suppliers"] .sup-stat .gold').textContent.trim();
    check('+add-on adds its listed P-price (' + w.fmt(expected3) + ')', budget3 === w.fmt(expected3), budget3 + ' vs ' + w.fmt(expected3));
  }

  /* ---------- save customisations (notes) ---------- */
  const notesIn = doc.querySelector('[data-sup-notes]');
  if (notesIn) {
    notesIn.value = 'Arrive early';
    notesIn.dispatchEvent(new w.Event('input', { bubbles: true }));
    click(w, doc.querySelector('[data-act="saveSupplierCustom"]'));
    check('customise panel closes on Done', !doc.querySelector('.sup-custom'));
    await sleep(550);
    const saved = JSON.parse(w.localStorage.getItem('eatouts.event.draft.v2'));
    const second = Object.keys(saved.suppliers).reduce((acc, k) => acc.concat(saved.suppliers[k] || []), [])[1];
    check('notes persisted into the draft', second && second.customisations.notes === 'Arrive early', second && JSON.stringify(second.customisations));
  } else {
    check('customise panel exposes notes input', false, 'no [data-sup-notes]');
  }

  /* ---------- legacy bucket (old field id) still renders ---------- */
  const b = boot(draftWith(venueId, {
    main_catering: [ { supplierId: 'sup2', customisations: {} } ]
  }));
  const legacyLabel = b.doc.querySelector('[data-sec="suppliers"] .sup-group .sup-group-name, [data-sec="suppliers"] .sup-field .sup-field-in');
  const legacySlot = b.doc.querySelector('[data-sec="suppliers"] .sup-slot-name');
  check('legacy draft bucket renders under its old label', b.doc.querySelector('[data-sec="suppliers"] .sup-group') && legacyLabel && /Saved supplier types/i.test(b.doc.querySelector('[data-sec="suppliers"] .sup-group .sup-group-name').textContent), legacyLabel && legacyLabel.textContent);
  check('legacy supplier slot resolves via findSupplier fallback', legacySlot && legacySlot.textContent.trim() === 'Kalahari Feasts', legacySlot && legacySlot.textContent.trim());

  console.log('');
  if (fails) console.log('FAILED: ' + fails + ' check(s)');
  else console.log('BUILDER-SUPPLIERS TEST PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('unhandled: ' + (e && e.stack || e)); process.exit(1); });