/* Field-onboarding / business-tracking suite (T11).
   Covers js/eatouts-field.js: fee math, the locked state machine,
   the append-only contact log, the directory mirror, the rep/admin
   scope matrix, the 25-venue seed and reminder copy.

   Runs the field stack in jsdom so the real EatoutsMgrDB / EatoutsDB /
   EatoutsAuth modules are exercised, not a mock. */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const errors = [];
const FILES = [
  'js/eatouts-manager-db.js',
  'js/eatouts-roles.js',
  'js/eatouts-users.js',
  'js/eatouts-db.js',
  'js/eatouts-auth.js',
  'js/eatouts-field.js'
];

let html = '<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>';
FILES.forEach((rel) => {
  const f = path.join(APP_DIR, rel.split('?')[0].replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script: ' + rel); return; }
  html = html.replace('</body>', '<script>' + fs.readFileSync(f, 'utf8') + '</script></body>');
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/field.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const w = dom.window;

setTimeout(() => {
  const F = w.EatoutsField;
  const M = w.EatoutsMgrDB;
  const DB = w.EatoutsDB;

  check('field stack booted without window errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('EatoutsField exposed', !!F);
  check('EatoutsMgrDB exposed', !!M);
  check('EatoutsDB exposed', !!DB);
  if (!F || !M || !DB) {
    console.log('\nFIELD TEST FAILED: field stack did not boot');
    process.exit(1);
  }

  const DAY = F.DAY;
  const RISK_DAYS = F.RISK_DAYS;

  /* isolate from the manager demo seed */
  try { M.collection('businesses').slice().forEach(b => M.remove('businesses', b.id)); } catch (e) {}
  try { const blob = DB.load(); blob.restaurants = []; DB.save(blob); } catch (e) {}

  let seq = 0;
  function mk(id, over) {
    seq++;
    const v = F.normaliseVenue(Object.assign({
      id: id,
      name: over && over.name ? over.name : ('Test Venue ' + seq),
      type: (over && over.type) || 'restaurant',
      branch_count: 1,
      whatsapp: '26771999000',
      order_whatsapp: '26771999000'
    }, over || {}));
    if (over && over.status) v.status = over.status;
    M.upsert('businesses', v);
    return F.venueById(id);
  }
  const auditTail = (v) => (v.audit_log && v.audit_log.length) ? v.audit_log[v.audit_log.length - 1].action : null;
  const dirRow = (v) => DB.load().restaurants.find(r => String(r.id) === String(F.directoryIdFor(v)));

  /* ======================== enums + constants ======================== */
  console.log('\n-- enums + constants --');
  check('five business types only', Object.keys(F.FIELD_TYPES).length === 5);
  ['restaurant', 'bottlestore', 'event_supplier', 'foodtruck', 'caterer'].forEach(t =>
    check('FIELD_TYPES has ' + t, !!F.FIELD_TYPES[t]));
  check('ESCALATE_DAYS is 7', F.ESCALATE_DAYS === 7);
  check('RISK_DAYS is 20', F.RISK_DAYS === 20);
  check('ARCHIVE_DAYS is 30', F.ARCHIVE_DAYS === 30);
  check('BASE_FEE is 300', F.BASE_FEE === 300);
  check('ESCALATED_FEE is 500', F.ESCALATED_FEE === 500);
  check('BRANCH_FEE is 100', F.BRANCH_FEE === 100);
  check('CLOSED_OUTCOMES are won/lost',
    F.CLOSED_OUTCOMES.indexOf('closed_won') > -1 && F.CLOSED_OUTCOMES.indexOf('closed_lost') > -1);

  /* ======================== normaliseType ======================== */
  console.log('\n-- normaliseType --');
  check('bottlestore stays bottlestore', F.normaliseType('bottlestore') === 'bottlestore');
  check('bottle_store -> bottlestore', F.normaliseType('bottle_store') === 'bottlestore');
  check('liquor_store -> bottlestore', F.normaliseType('liquor_store') === 'bottlestore');
  check('foodtruck stays foodtruck', F.normaliseType('foodtruck') === 'foodtruck');
  check('food-truck -> foodtruck', F.normaliseType('food-truck') === 'foodtruck');
  check('food_truck -> foodtruck', F.normaliseType('food_truck') === 'foodtruck');
  check('supplier -> event_supplier', F.normaliseType('supplier') === 'event_supplier');
  check('unknown -> null, no silent restaurant default', F.normaliseType('banana') === null);
  check('empty -> null', F.normaliseType('') === null && F.normaliseType(undefined) === null);

  /* ======================== fee math ======================== */
  console.log('\n-- fee math --');
  check('1 branch, not escalated = P300', F.feeFor({ branch_count: 1 }, false) === 300);
  check('3 branches, not escalated = P500', F.feeFor({ branch_count: 3 }, false) === 500);
  check('1 branch, escalated = P500', F.feeFor({ branch_count: 1 }, true) === 500);
  check('3 branches, escalated = P700', F.feeFor({ branch_count: 3 }, true) === 700);
  check('branch_count coerces to >= 1', F.feeFor({ branch_count: 0 }, false) === 300);

  /* ======================== normaliseVenue keeps type ======================== */
  console.log('\n-- normaliseVenue type preservation --');
  check('raw business_type wins over fallback',
    F.normaliseVenue({ business_type: 'foodtruck', type: 'restaurant' }, 'caterer').business_type === 'foodtruck');
  check('legacy raw business_type canonicalises',
    F.normaliseVenue({ business_type: 'food_truck' }, 'restaurant').business_type === 'foodtruck');
  check('raw type used when business_type absent',
    F.normaliseVenue({ type: 'liquor_store' }, 'restaurant').business_type === 'bottlestore');
  check('fallback type used when raw has none',
    F.normaliseVenue({}, 'caterer').business_type === 'caterer');
  check('type mirrors business_type',
    F.normaliseVenue({ type: 'event_supplier' }, 'restaurant').type === 'event_supplier');
  check('defaults object keeps its type',
    F.normaliseVenue(F.venueDefaults('event_supplier')).business_type === 'event_supplier');
  check('an untracked type is kept verbatim, not coerced',
    F.normaliseVenue({ type: 'bakery' }, 'restaurant').business_type === 'bakery' &&
    F.venueDefaults('bakery').business_type === 'bakery' &&
    F.venueDefaults('bakery').type === 'bakery');

  /* ======================== seed ======================== */
  console.log('\n-- FIELD_SEED --');
  const seed = F.FIELD_SEED();
  check('FIELD_SEED has 25 venues', seed.length === 25, 'got ' + seed.length);
  const byType = {};
  seed.forEach(v => { byType[v.business_type] = (byType[v.business_type] || 0) + 1; });
  check('5 per type', JSON.stringify(byType) === JSON.stringify({
    restaurant: 5, bottlestore: 5, event_supplier: 5, foodtruck: 5, caterer: 5
  }), JSON.stringify(byType));
  const lostSeed = seed.filter(v => v.closed_outcome === 'closed_lost');
  check('lost seed rows are archived + closed_lost',
    lostSeed.length === 2 && lostSeed.every(v => v.status === 'archived'));
  const escSeed = seed.find(v => v.id === 've-r4');
  check('escalated seed carries P500', escSeed.fee_status === 'escalated' && escSeed.fee_amount === 500);
  const escBranch = seed.find(v => v.id === 've-c3');
  check('escalated 2-branch seed carries P600',
    escBranch.fee_status === 'escalated' && escBranch.fee_amount === 600, String(escBranch.fee_amount));

  const seeded = F.seedFieldVenues();
  check('seedFieldVenues adds 25', seeded.added === 25, 'got ' + seeded.added);
  check('seedFieldVenues is idempotent', F.seedFieldVenues().added === 0);
  const stored = F.fieldVenues();
  check('fieldVenues sees the 25 seeded venues', stored.length === 25, 'got ' + stored.length);

  /* ======================== D2: no silent restaurant default ======================== */
  console.log('\n-- unknown / untracked types --');
  M.upsert('businesses', { id: 've-t-bakery', name: 'Corner Bakehouse', type: 'bakery' });
  M.upsert('businesses', { id: 've-t-notype', name: 'Ghost Listing' });
  const all = F.allVenues();
  const bakery = all.find(v => v.id === 've-t-bakery');
  check('a bakery listing survives allVenues() with its own type',
    !!bakery && bakery.business_type === 'bakery', bakery && bakery.business_type);
  check('a bakery is not counted as a restaurant', !all.some(v => v.id === 've-t-bakery' && v.business_type === 'restaurant'));
  check('fieldVenues still shows only the 5 tracked types',
    !F.fieldVenues().some(v => v.id === 've-t-bakery' || v.id === 've-t-notype'));
  check('a typeless row is skipped, not guessed',
    !all.some(v => v.id === 've-t-notype') &&
    JSON.stringify(F.skippedVenues().map(v => v.id)) === JSON.stringify(['ve-t-notype']),
    JSON.stringify(F.skippedVenues().map(v => v.id)));
  M.remove('businesses', 've-t-bakery');
  M.remove('businesses', 've-t-notype');
  check('skippedVenues resets on the next read', F.allVenues() && F.skippedVenues().length === 0);

  /* ======================== bucket rules ======================== */
  console.log('\n-- status buckets --');
  const buckets = F.statusBuckets();
  check('buckets: 2 lost', buckets.lost === 2, JSON.stringify(buckets));
  check('buckets: no won yet', buckets.won === 0, JSON.stringify(buckets));
  check('buckets: 7 pending payment', buckets.pendingPayment === 7, JSON.stringify(buckets));
  check('buckets: 2 at risk', buckets.atRisk === 2, JSON.stringify(buckets));
  check('buckets: 23 open', buckets.open === 23, JSON.stringify(buckets));

  /* ======================== overdue / at-risk ======================== */
  console.log('\n-- overdue / at-risk rules --');
  check('overdueAt = onboarded + 7d', F.overdueAt({ onboarded_at: 1000000 }) === 1000000 + 7 * DAY);
  check('archiveDeadline = onboarded + 30d', F.archiveDeadline({ onboarded_at: 1000000 }) === 1000000 + 30 * DAY);

  const odDue = mk('ve-t-od', { status: 'pending_payment', fee_status: 'due', fee_due_at: Date.now() - 1000 });
  check('overdue: due past fee_due_at', F.isOverdue(odDue) === true);
  const odFuture = mk('ve-t-odf', { status: 'pending_payment', fee_status: 'due', fee_due_at: Date.now() + 100000 });
  check('not overdue: fee_due_at in the future', F.isOverdue(odFuture) === false);
  const odPaid = mk('ve-t-odp', { status: 'pending_payment', fee_status: 'paid', fee_due_at: Date.now() - 1000 });
  check('not overdue: already paid', F.isOverdue(odPaid) === false);

  const rkYes = mk('ve-t-risk', { status: 'pending_verification', last_contacted_at: Date.now() - (RISK_DAYS * DAY + DAY) });
  check('at risk after 21 inactive days', F.isAtRisk(rkYes) === true);
  const rkNo = mk('ve-t-riskno', { status: 'pending_verification', last_contacted_at: Date.now() - (RISK_DAYS * DAY - DAY) });
  check('not at risk within 19 days', F.isAtRisk(rkNo) === false);
  const rkNever = mk('ve-t-never', { status: 'pending_verification' });
  check('never-touched venue is not at risk', F.isAtRisk(rkNever) === false);
  const rkLive = mk('ve-t-risk-live', { status: 'live', last_contacted_at: Date.now() - 40 * DAY });
  check('live venue is never at risk', F.isAtRisk(rkLive) === false);

  /* ======================== claim + guard ======================== */
  console.log('\n-- claim + guard --');
  const live = mk('ve-t-live');
  live.status = 'live'; M.upsert('businesses', live);
  const claimLive = F.claim(F.venueById('ve-t-live'), 'u-x', 'u-tiro');
  check('claim on a live venue is refused', !claimLive.ok && /not claimable/i.test(claimLive.error || ''), JSON.stringify(claimLive));

  const arch = mk('ve-t-arch'); arch.status = 'archived'; M.upsert('businesses', arch);
  check('claim on an archived venue is refused', !F.claim(F.venueById('ve-t-arch'), 'u-x').ok);

  const won = mk('ve-t-won'); won.status = 'live'; won.closed_outcome = 'closed_won'; M.upsert('businesses', won);
  check('claim on a closed_won venue is refused', !F.claim(F.venueById('ve-t-won'), 'u-x').ok);

  const fresh = mk('ve-t-c1');
  const claimed = F.claim(fresh, 'u-owner', 'u-tiro');
  check('claim on an unclaimed venue succeeds', claimed.ok === true, JSON.stringify(claimed));
  check('claim -> pending_verification', claimed.venue.status === 'pending_verification');
  check('claim stamps first_contacted_at', claimed.venue.first_contacted_at > 0);
  check('claim records the rep', claimed.venue.pre_registered_by_rep_id === 'u-tiro' && claimed.venue.assigned_rep_id === 'u-tiro');
  check('claim stamps claimed_by_user_id', claimed.venue.claimed_by_user_id === 'u-owner');
  check('claim writes an audit entry', auditTail(claimed.venue) === 'venue.claim');

  /* ======================== bindOwner ======================== */
  console.log('\n-- bindOwner --');
  const toBind = mk('ve-t-bind');
  const bound = F.bindOwner(toBind, 'u-owner', 'u-admin');
  check('bindOwner sets ownerUserId/ownerId', bound.venue.ownerUserId === 'u-owner' && bound.venue.ownerId === 'u-owner');
  check('bindOwner fills claimed_by_user_id', bound.venue.claimed_by_user_id === 'u-owner');
  check('bindOwner writes venue.owner_bind', auditTail(bound.venue) === 'venue.owner_bind');
  check('bindOwner requires a user id', !F.bindOwner(toBind, null).ok);

  /* ======================== state machine ======================== */
  console.log('\n-- state machine --');
  const start = mk('ve-t-start', { branch_count: 3 });
  const beforeStart = Date.now();
  const started = F.startOnboarding(start, 'u-tiro');
  check('startOnboarding -> onboarding', started.venue.status === 'onboarding');
  check('startOnboarding sets the 3-branch fee', started.venue.fee_amount === F.feeFor({ branch_count: 3 }, false));
  check('startOnboarding sets fee_due_at ~ +7d',
    started.venue.fee_due_at >= beforeStart + 7 * DAY - 2000 && started.venue.fee_due_at <= Date.now() + 7 * DAY + 2000);
  check('startOnboarding records onboarded_by_rep_id', started.venue.onboarded_by_rep_id === 'u-tiro');
  check('startOnboarding sets onboarded_at', started.venue.onboarded_at > 0);

  const ready = F.readyForPayment(mk('ve-t-pay'), 'u-tiro');
  check('readyForPayment -> pending_payment', ready.venue.status === 'pending_payment');
  const payRow = dirRow(ready.venue);
  check('pending_payment venue is published to the directory', !!payRow && payRow.status === 'pending_payment');
  check('directory row carries field.contactNumber', !!payRow && payRow.field && payRow.field.contactNumber === '26771999000');
  check('directory row carries field.venueId', !!payRow && payRow.field.venueId === ready.venue.id);

  const esc = F.escalateFee(mk('ve-t-esc', { branch_count: 3 }), 'u-tiro');
  check('escalateFee -> fee_status escalated', esc.venue.fee_status === 'escalated');
  check('escalateFee sets the escalated fee', esc.venue.fee_amount === 700, String(esc.venue.fee_amount));

  const rec = F.recordPayment(mk('ve-t-rec', { status: 'pending_payment' }), { amount: 300, method: 'cash' }, 'u-tiro');
  check('recordPayment -> live', rec.venue.status === 'live');
  check('recordPayment -> fee paid', rec.venue.fee_status === 'paid');
  check('recordPayment -> closed_won', rec.venue.closed_outcome === 'closed_won');
  check('recordPayment stamps closed_at', rec.venue.closed_at > 0);
  check('recordPayment appends the payment', rec.venue.payments.length === 1 && rec.venue.payments[0].amount === 300);
  const liveRow = dirRow(rec.venue);
  check('paid venue publishes as published', !!liveRow && liveRow.status === 'published');
  check('recordPayment rejects a bad payment', !F.recordPayment(mk('ve-t-rec2', { status: 'pending_payment' }), null).ok);

  /* lost / archive / reject / reopen */
  const lostVenue = mk('ve-t-lost', { status: 'pending_payment' });
  F.publishToDirectory(lostVenue);
  const lost = F.markLost(lostVenue, 'u-tiro', 'moved away');
  check('markLost -> closed_lost + archived', lost.venue.closed_outcome === 'closed_lost' && lost.venue.status === 'archived');
  check('markLost removes the directory row', !dirRow(lost.venue));

  const rejected = F.reject(mk('ve-t-rej', { status: 'pending_payment' }), 'u-admin', 'spam');
  check('reject -> rejected', rejected.venue.status === 'rejected');
  const archived = F.archive(mk('ve-t-arc2', { status: 'pending_payment' }), 'u-admin', 'overdue');
  check('archive -> archived', archived.venue.status === 'archived');

  const reopened = F.reopen(mk('ve-t-re', { status: 'archived', closed_outcome: 'closed_lost' }), 'u-admin');
  check('reopen -> pending_verification', reopened.venue.status === 'pending_verification');
  check('reopen clears closed_outcome', reopened.venue.closed_outcome === null);
  check('reopen resets fee to due', reopened.venue.fee_status === 'due');
  check('claim works after reopen', F.claim(reopened.venue, 'u-o', 'u-tiro').ok === true);

  /* ======================== contact log (append-only) ======================== */
  console.log('\n-- contact log --');
  const cv = mk('ve-t-log');
  const log1 = F.logContact(cv, { outcome: 'spoke_to_owner', body: 'first visit' }, 'u-tiro');
  check('logContact appends an entry', log1.ok && log1.venue.contact_log.length === 1);
  check('logContact stamps last_contacted_at', log1.venue.last_contacted_at > 0);
  const log2 = F.logContact(log1.venue, { outcome: 'signed_paid', body: 'second' }, 'u-tiro');
  check('contact log is append-only (grows, order kept)',
    log2.venue.contact_log.length === 2 &&
    log2.venue.contact_log[0].body === 'first visit' &&
    log2.venue.contact_log[1].body === 'second');
  check('contact log outcome recorded', log2.venue.contact_log[1].outcome === 'signed_paid');
  check('logContact requires outcome or body', !F.logContact(log2.venue, {}, 'u-tiro').ok);
  check('logContact audit trail recorded', auditTail(log2.venue) === 'venue.contact_log');

  /* append-only fails closed: a store error must abort the whole change */
  const logF = mk('ve-t-logf');
  const upReal = M.upsert;
  M.upsert = function () { throw new Error('boom'); };
  const failedLog = F.logContact(logF, { outcome: 'other', body: 'should not persist' }, 'u-tiro');
  M.upsert = upReal;
  check('failed contact-log write is refused', failedLog.ok === false);
  check('failed write leaves the record untouched',
    F.venueById('ve-t-logf').contact_log.length === 0);

  /* ======================== profile + menu editing ======================== */
  console.log('\n-- profile / menu editing --');
  const prof = mk('ve-t-prof', { status: 'pending_verification' });
  const up = F.updateProfile(prof, { name: 'New Name', description: 'hi', town: 'Gaborone', services: ['x'] }, 'u-o');
  check('updateProfile applies editable fields', up.ok && up.venue.name === 'New Name' && up.venue.town === 'Gaborone');
  check('updateProfile coerces services to an array', Array.isArray(up.venue.services));
  check('canEditProfile true while pending_verification', F.canEditProfile(prof) === true);
  check('canEditProfile false once live',
    F.canEditProfile(mk('ve-t-prof-live', { status: 'live' })) === false);
  check('updateProfile refused when live',
    !F.updateProfile(mk('ve-t-prof-live2', { status: 'live' }), { name: 'X' }, 'u-o').ok);

  const menuV = mk('ve-t-menu', { status: 'live' });
  const menuUp = F.updateMenuSource(menuV, 'rep_typed', 'http://doc', 'u-tiro');
  check('updateMenuSource works on a live venue', menuUp.ok && menuUp.venue.menu_source === 'rep_typed');
  check('updateMenuSource rejects an unknown source', !F.updateMenuSource(menuV, 'bogus', '', 'u-tiro').ok);

  /* ======================== venue contacts ======================== */
  console.log('\n-- venue contacts --');
  const cvc = mk('ve-t-c');
  const addC = F.addVenueContact(cvc, { name: 'Ann', whatsapp: '26771' }, 'u-tiro');
  check('addVenueContact appends', addC.ok && addC.venue.venue_contacts.length === 1);
  const cid = addC.venue.venue_contacts[0].id;
  const updC = F.updateVenueContact(addC.venue, cid, { role: 'owner' }, 'u-tiro');
  check('updateVenueContact patches', updC.ok && updC.venue.venue_contacts[0].role === 'owner');
  const remC = F.removeVenueContact(updC.venue, cid, 'u-tiro');
  check('removeVenueContact deletes', remC.ok && remC.venue.venue_contacts.length === 0);
  check('addVenueContact needs a name or WhatsApp', !F.addVenueContact(cvc, {}, 'u-tiro').ok);

  /* ======================== directory mirror ======================== */
  console.log('\n-- directory mirror --');
  check('statusForDirectory live -> published', F.statusForDirectory({ status: 'live' }) === 'published');
  check('statusForDirectory pending_payment -> pending_payment', F.statusForDirectory({ status: 'pending_payment' }) === 'pending_payment');
  check('statusForDirectory onboarding -> hidden', F.statusForDirectory({ status: 'onboarding' }) === 'hidden');
  check('statusForDirectory archived -> hidden', F.statusForDirectory({ status: 'archived' }) === 'hidden');

  const orderVenue = mk('ve-x1', { status: 'pending_payment', type: 'liquor_store', whatsapp: '267700', order_whatsapp: '267711' });
  F.publishToDirectory(orderVenue);
  const rowWithOrder = dirRow(orderVenue);
  check('directory contactNumber prefers order_whatsapp', !!rowWithOrder && rowWithOrder.field.contactNumber === '267711');
  check('directory types uses the human label', !!rowWithOrder && rowWithOrder.types[0] === 'Liquor store');
  check('directory row is template-linked', !!rowWithOrder && rowWithOrder.templateId === 'tpl_shared');

  const hidden = F.normaliseVenue({ id: 've-h1', name: 'H', type: 'restaurant', status: 'onboarding' });
  F.publishToDirectory(hidden);
  check('publishing a hidden venue removes its row', !DB.load().restaurants.some(r => String(r.id) === String(F.directoryIdFor(hidden))));

  /* syncDirectoryIfNeeded idempotency + coverage */
  try { const blob = DB.load(); blob.restaurants = []; DB.save(blob); } catch (e) {}
  const sync1 = F.syncDirectoryIfNeeded();
  check('syncDirectoryIfNeeded reports seeded count', sync1.seeded === 0, String(sync1.seeded));
  const searchable = F.fieldVenues().filter(v => ['live', 'pending_payment'].indexOf(v.status) > -1).length;
  const publishedRows = DB.load().restaurants.filter(r => r && r.field).length;
  check('every live/pending venue has a directory row', publishedRows === searchable, publishedRows + ' vs ' + searchable);
  const sync2 = F.syncDirectoryIfNeeded();
  check('syncDirectoryIfNeeded is stable', sync2.published === searchable, String(sync2.published));

  /* ======================== rep vs admin scope ======================== */
  console.log('\n-- rep vs admin scope --');
  const A = w.EatoutsAuth;
  const savedGetUser = A.getUser;
  A.getUser = function () { return { id: 'u-tiro', roles: ['rep'], type: 'rep' }; };
  check('currentScope sees a rep', F.currentScope().isRep === true && F.currentScope().isAdmin === false);
  const repVenues = F.myScopeVenues();
  check('rep scope is non-empty', repVenues.length > 0);
  check('rep scope only shows their venues',
    repVenues.every(v => String(v.assigned_rep_id) === 'u-tiro' || String(v.pre_registered_by_rep_id) === 'u-tiro'));

  A.getUser = function () { return { id: 'u-admin', roles: ['admin'], type: 'admin' }; };
  check('currentScope sees an admin', F.currentScope().isAdmin === true);
  check('admin scope covers every field venue', F.myScopeVenues().length === F.fieldVenues().length);

  A.getUser = function () { return null; };
  check('no user -> empty scope', F.myScopeVenues().length === 0);
  A.getUser = savedGetUser;

  check('reps() exposes the seeded reps', Array.isArray(F.reps()) && F.reps().length > 0);

  /* ======================== reminders ======================== */
  console.log('\n-- reminder copy --');
  const dueV = F.normaliseVenue({ name: 'Kofi', type: 'restaurant', branch_count: 1, fee_status: 'due' });
  const c1 = F.reminderCopy(dueV, 2);
  check('day-2 reminder quotes P300', /P300/.test(c1) && !/P500/.test(c1), c1);
  const escV = F.normaliseVenue({ name: 'Kofi', type: 'restaurant', branch_count: 1, fee_status: 'escalated' });
  const c2 = F.reminderCopy(escV, 8);
  check('escalated reminder is final + P500', /Final reminder/.test(c2) && /P500/.test(c2), c2);
  const c3 = F.reminderCopy(dueV, 7);
  check('day-7 reminder states the escalation', /Final reminder/.test(c3) && /P500/.test(c3), c3);

  /* ======================== delete ======================== */
  console.log('\n-- delete --');
  const del = mk('ve-t-del', { status: 'pending_payment' });
  F.publishToDirectory(del);
  check('delete precondition: row exists', !!dirRow(del));
  const delRes = F.deleteVenue(F.venueById('ve-t-del'), 'u-admin');
  check('deleteVenue succeeds', delRes.ok === true);
  check('deleteVenue removes the store record', M.find('businesses', 've-t-del') == null);
  check('deleteVenue removes the directory row', !dirRow(del));

  /* ======================== D1: a field-written venue lands canonical ======================== */
  console.log('\n-- legacy spelling written by the field --');
  ['bottle_store', 'liquor_store', 'food_truck'].forEach((legacy) => {
    const id = 've-t-d1-' + legacy.replace(/_/g, '-');
    const v = F.normaliseVenue({ id: id, name: 'Legacy ' + legacy, type: legacy });
    M.upsert('businesses', v);
    const back = F.venueById(id);
    check('field-written ' + legacy + ' is stored canonical',
      v.business_type === (legacy === 'food_truck' ? 'foodtruck' : 'bottlestore') &&
      back && back.business_type === v.business_type && back.type === v.business_type,
      back && back.business_type);
    M.remove('businesses', id);
  });

  /* ======================== summary ======================== */
  check('no window errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('');
  console.log(checks - fails + '/' + checks + ' checks passed');
  if (fails) { console.log('FIELD TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('FIELD TEST PASSED');
}, 500);
