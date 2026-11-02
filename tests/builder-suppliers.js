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
  click(w, doc.querySelector('.fpop-x'));
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

  /* ---------- T12.1 venue bar: 16px text, trimmed rows, floating title edit ---------- */
  click(w, doc.querySelector('[data-act="toggleVenueBar"]'));
  const vbar = doc.querySelector('#venue-bar');
  check('T12.1: venue bar expands', !!doc.querySelector('#venue-bar .venue-bar-expand.open'));
  check('T12.1: no "Venue Provider" heading', !/Venue Provider/.test(vbar.textContent || ''), (vbar.textContent || '').slice(0, 110));
  const kvKeys = Array.prototype.slice.call(doc.querySelectorAll('#venue-bar .venue-kv .k')).map(k => k.textContent.trim());
  check('T12.1: rows are Location / Capacity / For Event Type', kvKeys.join(',') === 'Location,Capacity,For Event Type', kvKeys.join(','));
  check('T12.1: Name / From / Spaces / Selected removed', !/(^|,)(Name|From|Spaces|Selected)(,|$)/.test(kvKeys.join(',')), kvKeys.join(','));
  const fs2 = el => w.getComputedStyle(el).fontSize;
  check('T12.1: venue name is 16px', fs2(doc.querySelector('.venue-bar-name')) === '16px', fs2(doc.querySelector('.venue-bar-name')));
  check('T12.1: venue sub is 16px', fs2(doc.querySelector('.venue-bar-sub')) === '16px', fs2(doc.querySelector('.venue-bar-sub')));
  check('T12.1: .venue-kv is 16px', fs2(doc.querySelector('.venue-kv')) === '16px', fs2(doc.querySelector('.venue-kv')));

  const builderSrc = fs.readFileSync(path.join(APP_DIR, 'eatout_event_builder.html'), 'utf8');
  check('T12.1: .title-edit-panel capped at 420px', /\.title-edit-panel\{[^}]*max-width:420px/.test(builderSrc));
  check('T12.1: .title-edit-panel capped at 80dvh', /\.title-edit-panel\{[^}]*max-height:80dvh/.test(builderSrc));
  check('T12.1: .title-edit-panel has no squared bottom corners', !/\.title-edit-panel\{[^}]*border-radius:20px 20px 0 0/.test(builderSrc));

  /* ---------- T12.4: supplier directory popup (search pinned to the foot, plain X) ---------- */
  click(w, doc.querySelector('[data-sec="suppliers"] .sup-add-btn[data-cat=""]'));
  const stm = doc.querySelector('.fpop');
  check('T12.4: directory popup reopens', !!stm);
  const stmKids = stm ? [].slice.call(stm.children).map(el => el.className.split(' ')[0]) : [];
  check('T12.4: popup order is header > list > search',
    stmKids.join('>') === 'fpop-hdr>fpop-body>fpop-search', stmKids.join('>'));
  check('T12.4: search is pinned under the list',
    !!stm && !!stm.querySelector('.fpop-search.is-foot') && stm.lastElementChild.classList.contains('fpop-search'));
  check('T12.4: the foot search keeps its rule on top',
    /\.fpop-search\.is-foot\{border-bottom:0;border-top:1px solid var\(--border-soft\)\}/.test(builderSrc));
  const stmX = stm && stm.querySelector('.fpop-x');
  const stmXCs = stmX ? w.getComputedStyle(stmX) : null;
  check('T12.4: directory close is a plain X, no beige circle',
    !!stmX && stmX.textContent.trim() === '\u00d7' && !!stmXCs &&
    (stmXCs.backgroundColor === 'transparent' || stmXCs.backgroundColor === 'rgba(0, 0, 0, 0)') &&
    (stmXCs.borderRadius === '' || stmXCs.borderRadius === '0px'),
    stmXCs ? [stmX.textContent.trim(), stmXCs.backgroundColor, stmXCs.borderRadius].join(' / ') : 'no .fpop-x');

  /* ---------- T12.4: floating profile card ---------- */
  const stmRows = [].slice.call(doc.querySelectorAll('.stm-sup'));
  const prRow = stmRows.find(r => {
    const s = w.findSupplier(r.getAttribute('data-id'));
    return s && typeof s.price === 'number' && s.photo;
  }) || stmRows[0];
  click(w, prRow);
  const prSup = w.findSupplier(prRow.getAttribute('data-id'));
  const prof = doc.querySelector('.sup-profile-panel');
  check('T12.4: profile opens as a floating card', !!prof && !!prof.closest('.fpop-scrim'));
  const profCs = prof ? w.getComputedStyle(prof) : null;
  check('T12.4: profile card is 420px / 80dvh / 16px',
    !!profCs && profCs.maxWidth === '420px' && profCs.maxHeight === '80dvh' && profCs.borderRadius === '16px',
    profCs ? [profCs.maxWidth, profCs.maxHeight, profCs.borderRadius].join(' / ') : 'no panel');
  const avCs = w.getComputedStyle(doc.querySelector('.sup-profile-avatar'));
  check('T12.4: avatar is 150px', avCs.width === '150px' && avCs.height === '150px', avCs.width + ' x ' + avCs.height);
  const locEl = doc.querySelector('.sup-profile-loc');
  check('T12.4: location line is 16px',
    (!!locEl && w.getComputedStyle(locEl).fontSize === '16px') && /\.sup-profile-loc\{font-size:16px/.test(builderSrc),
    locEl ? w.getComputedStyle(locEl).fontSize : 'no .sup-profile-loc');

  /* ---------- T12.4: item card — 90px thumb left, title + price right ---------- */
  const pitCard = doc.querySelector('.sup-profile-panel .pit-card');
  const pitInfo = pitCard && pitCard.querySelector('.pit-info');
  check('T12.4: item card is a two-column grid', !!pitCard && w.getComputedStyle(pitCard).display === 'grid',
    pitCard && w.getComputedStyle(pitCard).display);
  check('T12.4: item card columns are 90px + the rest',
    /\.pit-card\{display:grid;grid-template-columns:90px 1fr/.test(builderSrc));
  const pitThumbCs = w.getComputedStyle(doc.querySelector('.sup-profile-panel .pit-thumb'));
  check('T12.4: item thumb is 90px', pitThumbCs.width === '90px' && pitThumbCs.height === '90px',
    pitThumbCs.width + ' x ' + pitThumbCs.height);
  check('T12.4: title + price sit in the right-hand column',
    !!pitInfo && !!pitInfo.querySelector('.pit-title') && !!pitInfo.querySelector('.pit-price'),
    pitInfo && pitInfo.textContent.trim());
  check('T12.4: the thumb comes before the info column',
    !!pitCard && pitCard.children[0].classList.contains('pit-thumb') && pitCard.children[1].classList.contains('pit-info'));

  /* ---------- T12.4: cost + stepper on their own row ---------- */
  const pitFoot = pitCard && pitCard.querySelector('.pit-foot');
  check('T12.4: cost + stepper sit on their own row under the info',
    !!pitFoot && pitCard.children[2] === pitFoot && w.getComputedStyle(pitFoot).display === 'flex');
  check('T12.4: cost is left, stepper is right',
    !!pitFoot && pitFoot.children[0].classList.contains('pit-cost') && pitFoot.children[1].classList.contains('qty-stepper'),
    pitFoot && [].slice.call(pitFoot.children).map(c => c.className).join(' | '));
  check('T12.4: the foot stepper is pushed to the right',
    /\.pit-foot \.qty-stepper\.sm\{flex:0 0 auto;width:118px;margin-left:auto\}/.test(builderSrc));
  const smBtn = pitFoot && pitFoot.querySelector('.qty-stepper.sm button');
  const smBtnCs = smBtn ? w.getComputedStyle(smBtn) : null;
  check('T12.4: the small stepper glyphs are centred',
    !!smBtnCs && smBtnCs.display === 'flex' && smBtnCs.alignItems === 'center' && smBtnCs.justifyContent === 'center',
    smBtnCs ? [smBtnCs.display, smBtnCs.alignItems, smBtnCs.justifyContent].join(' / ') : 'no stepper button');

  /* ---------- T12.4: avatar tap -> full-image gallery ---------- */
  click(w, doc.querySelector('.sup-profile-avatar'));
  let gal = doc.querySelector('.img-gal');
  check('T12.4: tapping the avatar opens the gallery', !!gal);
  check('T12.4: gallery backdrop is feint black',
    !!gal && w.getComputedStyle(gal).backgroundColor === 'rgba(0, 0, 0, 0.55)',
    gal && w.getComputedStyle(gal).backgroundColor);
  check('T12.4: the gallery shows the provider photo',
    !!gal && !!gal.querySelector('.img-gal-track .img-gal-slide img'));
  const galIn = gal && gal.querySelector('.img-gal-in');
  check('T12.4: the caption sits under the image',
    !!galIn && galIn.children[galIn.children.length - 1].classList.contains('img-gal-cap') &&
    /./.test(gal.querySelector('.img-gal-cap').textContent),
    galIn && galIn.children[galIn.children.length - 1].className);
  check('T12.4: the profile stays open behind the gallery', !!doc.querySelector('.sup-profile-panel'));
  click(w, doc.querySelector('.img-gal'));
  check('T12.4: tapping outside closes the gallery',
    !doc.querySelector('.img-gal') && !!doc.querySelector('.sup-profile-panel'));

  /* ---------- T12.4: several photos -> dots above the image ---------- */
  const savedPhotos = prSup.photos;
  prSup.photos = [prSup.photo, prSup.photo];
  w.render();
  click(w, doc.querySelector('.sup-profile-avatar'));
  gal = doc.querySelector('.img-gal');
  const galKids = gal ? [].slice.call(gal.querySelector('.img-gal-in').children) : [];
  check('T12.4: dots sit above the image',
    galKids.length === 3 && galKids[0].classList.contains('img-gal-dots') && galKids[1].classList.contains('img-gal-track'),
    galKids.map(c => c.className).join(' > '));
  check('T12.4: one dot per photo, first one active',
    !!gal && gal.querySelectorAll('.img-gal-dot').length === 2 && gal.querySelector('.img-gal-dot').classList.contains('on'));
  click(w, doc.querySelectorAll('.img-gal-dot')[1]);
  check('T12.4: tapping a dot moves the highlight',
    doc.querySelectorAll('.img-gal-dot')[1].classList.contains('on') &&
    !doc.querySelectorAll('.img-gal-dot')[0].classList.contains('on'));
  click(w, doc.querySelector('.img-gal'));
  prSup.photos = savedPhotos;
  w.render();
  check('T12.4: the gallery closes and the profile is still behind it',
    !doc.querySelector('.img-gal') && !!doc.querySelector('.sup-profile-panel'));

  /* ---------- T12.4: item thumb tap -> captioned gallery ---------- */
  click(w, doc.querySelector('.sup-profile-panel .pit-thumb'));
  gal = doc.querySelector('.img-gal');
  check('T12.4: tapping an item thumb opens the gallery', !!gal);
  const itemTitle = doc.querySelector('.sup-profile-panel .pit-title').textContent.trim();
  check('T12.4: the item gallery is captioned with that item',
    !!gal && gal.querySelector('.img-gal-cap').textContent.trim() === itemTitle,
    (gal && gal.querySelector('.img-gal-cap') && gal.querySelector('.img-gal-cap').textContent.trim()) + ' vs ' + itemTitle);
  click(w, doc.querySelector('.img-gal'));
  check('T12.4: the item gallery closes on an outside tap', !doc.querySelector('.img-gal'));

  /* ---------- T12.4: name tap -> Service Provider Info popup ---------- */
  click(w, doc.querySelector('.sup-profile-name'));
  const info = doc.querySelector('.sup-info-panel');
  check('T12.4: tapping the provider name opens Service Provider Info',
    !!info && /Service Provider Info/.test(info.querySelector('h3').textContent));
  const infoTop = info && info.querySelector('.sup-info-top');
  check('T12.4: info shows a thumb beside the name + services',
    !!infoTop && infoTop.children[0].classList.contains('sup-info-thumb') &&
    infoTop.children[1].classList.contains('sup-info-meta') &&
    !!info.querySelector('.sup-info-name') && !!info.querySelector('.sup-info-svc'),
    infoTop && [].slice.call(infoTop.children).map(c => c.className).join(' | '));
  check('T12.4: info thumb is 90px', !!info &&
    w.getComputedStyle(info.querySelector('.sup-info-thumb')).width === '90px',
    info && w.getComputedStyle(info.querySelector('.sup-info-thumb')).width);
  check('T12.4: the info popup is the 420px floating card',
    !!info && w.getComputedStyle(info).maxWidth === '420px' && w.getComputedStyle(info).borderRadius === '16px',
    info && w.getComputedStyle(info).maxWidth);
  const infoScroll = info && info.querySelector('.sup-info-scroll');
  const descEl = info && info.querySelector('.sup-info-desc');
  check('T12.4: the description sits below the top row',
    !!descEl && !!infoScroll &&
    [].slice.call(infoScroll.children).indexOf(infoTop) < [].slice.call(infoScroll.children).indexOf(descEl),
    !descEl ? 'no description for this supplier' : 'order mismatch');
  click(w, info.querySelector('.fpop-x'));
  check('T12.4: info popup closes on its X', !doc.querySelector('.sup-info-panel'));
  check('T12.4: the profile survives the info popup', !!doc.querySelector('.sup-profile-panel'));

  console.log('');
  if (fails) console.log('FAILED: ' + fails + ' check(s)');
  else console.log('BUILDER-SUPPLIERS TEST PASSED');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.log('unhandled: ' + (e && e.stack || e)); process.exit(1); });