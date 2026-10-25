/* ============================================================
   EATOUTS FIELD
   Field-onboarding + business-tracking for the EatOuts sales team.

   One shared module for the three surfaces that care:
     - eatouts-business-signup.html   (owner/reps claim & register)
     - ops-console.html               (the "Field" tab)
     - index.html                     (customer gating + activity hooks)

   Venues are the manager store's "businesses" collection
   (EatoutsMgrDB / "eatouts_manager_v1"). The customer directory
   (EatoutsDB / "eatouts_db_v2") receives a slim mirror row per
   searchable venue via publishToDirectory() so pending-payment
   venues show up in the customer app greyed, while archived /
   rejected / closed_lost venues disappear.

   Locked business rules (do not change without the user):
   - Five types only: restaurant | bottlestore | event_supplier
     | foodtruck | caterer   (canonical slugs; every older spelling
     stays a permanent alias in normaliseType() below)
   - Full setup fee, one payment: P300 first branch + P100 per
     extra branch (P500 first branch after escalation + P100 each).
   - Fee timeline starts on "Start onboarding" (fee_due_at = day 7).
   - Escalate exactly once on day 7. Archive on day 30.
   - A venue is At-risk after 20 days with no owner login, order
     or rep contact. closed in the UI always means closed_won;
     losses are recorded separately as closed_lost.
   - contact_log is append-only: any failed write aborts the whole
     change so nothing is silently recorded.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- enums (locked) ---------- */

  /* Keys are canonical slugs (bottlestore, foodtruck). Supplier is the one
     deferred divergence: this enum says 'event_supplier' while D1
     business_links, business_types.js, link.js and [slug].js all say
     'supplier'. normaliseType() bridges them until a human decides. */
  var FIELD_TYPES = {
    restaurant: { label: 'Restaurant' },
    bottlestore: { label: 'Liquor store' },
    event_supplier: { label: 'Event supplier' },
    foodtruck: { label: 'Food truck' },
    caterer: { label: 'Caterer' }
  };

  var FIELD_STATUSES = [
    'unclaimed', 'pending_verification', 'onboarding', 'pending_payment',
    'live', 'archived', 'rejected'
  ];

  var CLOSED_OUTCOMES = ['closed_won', 'closed_lost'];

  var MENU_SOURCES = ['upload', 'rep_typed', 'linked', 'none'];

  var CONTACT_OUTCOMES = [
    'visited_no_owner', 'visited_no_answer', 'spoke_to_owner',
    'spoke_to_manager', 'wrong_number', 'closed_permanently',
    'signed_awaiting_payment', 'signed_paid', 'declined', 'other'
  ];

  var OPEN_MISSING = 'Missing venue:';

  /* ---------- constants ---------- */

  var DAY = 86400000;
  var ESCALATE_DAYS = 7;   /* day-7 fee escalation (working-day spirit, calendar-approx) */
  var ARCHIVE_DAYS = 30;   /* archive overdue venues on day 30 */
  var RISK_DAYS = 20;      /* 20-day inactivity churn threshold */

  var BASE_FEE = 300;
  var ESCALATED_FEE = 500;
  var BRANCH_FEE = 100;

  /* ---------- helpers ---------- */

  function db() {
    return globalThis.EatoutsMgrDB || null;
  }

  function clone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  function now() {
    return Date.now();
  }

  function iso(ts) {
    try { return new Date(ts == null ? now() : ts).toISOString(); }
    catch (e) { return String(ts || ''); }
  }

  function pretty(ts) {
    if (!ts) return '—';
    try {
      var d = new Date(ts);
      return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) { return String(ts); }
  }

  function dayStamp(ts) {
    var d = new Date(ts == null ? now() : ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function feeFor(venue, escalated) {
    var branches = Math.max(1, parseInt(venue.branch_count, 10) || 1);
    var base = escalated ? ESCALATED_FEE : BASE_FEE;
    return base + BRANCH_FEE * (branches - 1);
  }

  function venueTypeLabel(type) {
    var t = FIELD_TYPES[normaliseType(type)];
    return t ? t.label : String(type || 'business');
  }

  /* Canonical slugs only. Every legacy spelling below stays a permanent
     alias: stored venues, seeds and older pages still write liquor_store,
     bottle_store, bottle-store, food_truck and food-truck.
     An unknown type returns null - NOT 'restaurant'. A silent restaurant
     default is how a bakery or a supplier listing used to be counted and
     rendered as a restaurant in the field views. Callers keep the raw
     string instead (venueDefaults/normaliseVenue) or skip the row and
     report it (allVenues/skippedVenues). */
  function normaliseType(type) {
    var t = String(type || '');
    if (t === 'bottlestore' || t === 'bottle_store' || t === 'bottle-store' ||
        t === 'liquor_store' || t === 'liquor-store' || t === 'liquorStore') return 'bottlestore';
    if (t === 'foodtruck' || t === 'food_truck' || t === 'food-truck' ||
        t === 'foodTruck') return 'foodtruck';
    if (t === 'supplier') return 'event_supplier';
    if (FIELD_TYPES[t]) return t;
    return null;
  }

  /* ---------- venue shape (T3/T4/T5 data model) ---------- */

  function venueDefaults(type) {
    /* A type this module does not track is kept verbatim rather than coerced:
       'bakery' stays 'bakery' so the row keeps meaning when it is read back. */
    var t = normaliseType(type) || String(type || '');
    return {
      id: 've-' + now().toString(36),
      name: '',
      slug: '',
      business_type: t,
      type: t,
      status: 'unclaimed',
      description: '',
      tagline: '',
      since_year: '',
      district: '',
      town: '',
      area: '',
      address: '',
      landmark: '',
      map_link: '',
      whatsapp: '',
      order_whatsapp: '',
      email: '',
      website: '',
      logo: '',
      main_image: '',
      photos: [],
      working_hours: '',
      years_in_business: '',
      supplier_categories: [],
      services: [],
      delivery_notes: '',
      menu_source: 'none',
      menu_document_url: '',
      branch_count: 1,
      claimed_by_user_id: null,
      pre_registered_by_rep_id: null,
      onboarded_by_rep_id: null,
      assigned_rep_id: null,
      fee_status: 'due',
      fee_amount: BASE_FEE,
      fee_due_at: null,
      onboarded_at: null,
      first_contacted_at: null,
      last_contacted_at: null,
      last_login_at: null,
      last_order_at: null,
      closed_at: null,
      closed_outcome: null,
      restaurantId: null,
      venue_contacts: [],
      contact_log: [],
      payments: [],
      audit_log: [],
      createdAt: now(),
      updatedAt: now()
    };
  }

  function normaliseVenue(raw, type) {
    var v = Object.assign(venueDefaults(type), clone(raw || {}));
    /* Known types land on the canonical slug; anything else keeps its own
       spelling (see normaliseType above). */
    var rawType = (raw && (raw.business_type || raw.type)) || type;
    v.business_type = normaliseType(rawType) || String(rawType || '');
    v.type = v.business_type;
    if (String(v.id) === '' || v.id == null) v.id = 've-' + now().toString(36);
    v.slug = String(v.slug || slugOf(v.name, v.id));
    v.branch_count = Math.max(1, parseInt(v.branch_count, 10) || 1);
    v.supplier_categories = Array.isArray(v.supplier_categories) ? v.supplier_categories : [];
    v.services = Array.isArray(v.services) ? v.services : [];
    v.photos = Array.isArray(v.photos) ? v.photos : [];
    v.venue_contacts = Array.isArray(v.venue_contacts) ? v.venue_contacts : [];
    v.contact_log = Array.isArray(v.contact_log) ? v.contact_log : [];
    v.payments = Array.isArray(v.payments) ? v.payments : [];
    v.audit_log = Array.isArray(v.audit_log) ? v.audit_log : [];
    if (FIELD_STATUSES.indexOf(v.status) < 0) v.status = 'unclaimed';
    if (['menu_upload', 'uploaded', 'rep_typed', 'rep'].indexOf(v.menu_source) > -1) v.menu_source = (v.menu_source === 'rep_typed' || v.menu_source === 'rep') ? 'rep_typed' : 'upload';
    if (MENU_SOURCES.indexOf(v.menu_source) < 0) v.menu_source = 'none';
    if (CLOSED_OUTCOMES.indexOf(v.closed_outcome) < 0) v.closed_outcome = null;
    v.fee_amount = isFinite(v.fee_amount) ? Number(v.fee_amount) : feeFor(v, false);
    if (!v.order_whatsapp && v.whatsapp) v.order_whatsapp = v.whatsapp;
    return v;
  }

  function slugOf(name, fallback) {
    var s = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || String(fallback || 'venue').toLowerCase();
  }

  /* ---------- reads ---------- */

  /* Rows allVenues() could not classify (no type stored at all). Reported,
     never guessed: they used to be relabelled 'restaurant' and then showed up
     in the restaurant counts. Reset on every allVenues() call. */
  var _skipped = [];

  function allVenues() {
    var d = db();
    _skipped = [];
    if (!d) return [];
    var out = [];
    d.collection('businesses').forEach(function (b) {
      if (!b || !b.id) return;
      var raw = b.type || b.business_type;
      if (!String(raw || '').trim()) { _skipped.push(b); return; }
      out.push(normaliseVenue(b));
    });
    return out;
  }

  /* The rows the last allVenues()/fieldVenues() call refused to classify. */
  function skippedVenues() { return _skipped.slice(); }

  function venueById(id) {
    if (!id) return null;
    var all = allVenues();
    for (var i = 0; i < all.length; i++) {
      if (String(all[i].id) === String(id)) return all[i];
    }
    var d = db();
    return d ? normaliseVenue(d.find('businesses', id)) : null;
  }

  /* Field views only: the 5 tracked business types, name non-empty. */
  function fieldVenues() {
    return allVenues().filter(function (v) {
      return FIELD_TYPES[v.business_type] && String(v.name || '').trim() !== '';
    });
  }

  /* ---------- rules (T8) ---------- */

  function feeDue(venue) {
    return venue.fee_status !== 'paid';
  }

  function isOverdue(venue) {
    if (feeDue(venue) && venue.status === 'pending_payment' && venue.fee_due_at) {
      return now() > venue.fee_due_at;
    }
    return false;
  }

  function lastActivityAt(venue) {
    return Math.max(
      venue.last_login_at || 0,
      venue.last_order_at || 0,
      venue.last_contacted_at || 0
    );
  }

  function isAtRisk(venue) {
    if (['live', 'archived', 'rejected'].indexOf(venue.status) > -1) return false;
    if (venue.closed_outcome) return false;
    var last = lastActivityAt(venue);
    if (!last) return false; /* never touched: still being worked, not yet churned */
    return now() - last > RISK_DAYS * DAY;
  }

  function overdueAt(venue, fromTs) {
    var from = fromTs || venue.onboarded_at || venue.fee_due_at || now();
    return from + ESCALATE_DAYS * DAY;
  }

  function archiveDeadline(venue) {
    var from = venue.onboarded_at || venue.fee_due_at || now();
    return from + ARCHIVE_DAYS * DAY;
  }

  function statusBuckets() {
    var buckets = { open: 0, won: 0, lost: 0, overdue: 0, atRisk: 0, pendingPayment: 0 };
    fieldVenues().forEach(function (v) {
      if (v.closed_outcome === 'closed_won') { buckets.won++; return; }
      if (v.closed_outcome === 'closed_lost') { buckets.lost++; return; }
      if (['archived', 'rejected'].indexOf(v.status) > -1) return;
      buckets.open++;
      if (v.status === 'pending_payment') buckets.pendingPayment++;
      if (isOverdue(v)) buckets.overdue++;
      if (isAtRisk(v)) buckets.atRisk++;
    });
    return buckets;
  }

  /* ---------- activity hooks (T9) ---------- */

  function touchLogin(venue) {
    if (!venue) return false;
    return commitVenue(venue, Object.assign({}, venue, {
      last_login_at: now(),
      updatedAt: now()
    }), null, 'activity.login').ok;
  }

  function touchOrder(venue) {
    if (!venue) return false;
    return commitVenue(venue, Object.assign({}, venue, {
      last_order_at: now(),
      updatedAt: now()
    }), null, 'activity.order').ok;
  }

  /* ---------- audit (append-only, fails closed) ---------- */

  function auditEntry(actorId, action, before, after) {
    return {
      id: 'au-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      actor_user_id: actorId || null,
      action: action,
      entity_type: 'business',
      entity_id: (after && after.id) || null,
      before: before || null,
      after: after || null,
      at: now()
    };
  }

  /**
   * Atomic commit: build the full next record (including its new audit
   * entry), THEN persist. If anything throws nothing is written, so a
   * failed contact_log/audit append always aborts the whole change.
   */
  function commitVenue(venue, next, actorId, action, noAudit) {
    try {
      var M = db();
      if (!M) return { ok: false, error: 'EatoutsMgrDB unavailable' };
      if (!venue || !venue.id) return { ok: false, error: OPEN_MISSING + ' no id' };
      next = normaliseVenue(next);
      next.updatedAt = now();
      if (!noAudit) {
        next.audit_log.push(auditEntry(actorId, action || 'update',
          slimAudit(venue), slimAudit(next)));
        if (next.audit_log.length > 500) next.audit_log = next.audit_log.slice(-500);
      }
      M.upsert('businesses', next);
      return { ok: true, venue: next, error: null };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  function slimAudit(v) {
    if (!v) return null;
    var keys = ['name', 'type', 'status', 'fee_status', 'fee_amount', 'fee_due_at',
      'branch_count', 'closed_outcome', 'assigned_rep_id', 'menu_source', 'order_whatsapp'];
    var out = {};
    keys.forEach(function (k) { out[k] = v[k]; });
    return out;
  }

  /* ---------- transitions ---------- */

  function claim(venue, userId, repId) {
    if (['live', 'archived', 'rejected'].indexOf(venue.status) > -1 || venue.closed_outcome) {
      return { ok: false, error: 'This venue is not claimable.' };
    }
    var next = Object.assign({}, venue);
    next.status = 'pending_verification';
    next.claimed_by_user_id = userId || next.claimed_by_user_id;
    if (repId) next.pre_registered_by_rep_id = next.pre_registered_by_rep_id || repId;
    if (repId) next.assigned_rep_id = next.assigned_rep_id || repId;
    if (!next.first_contacted_at) next.first_contacted_at = now();
    return commitVenue(venue, next, userId || repId, 'venue.claim');
  }

  /* Bind a manager/business-owner user as the venue owner so the owner can
     open the business editors (e.g. mobile-kitchen-onboarding.html?biz=<id>). */
  function bindOwner(venue, userId, actorId) {
    if (!userId) return { ok: false, error: 'Missing owner user id' };
    var next = Object.assign({}, venue);
    next.ownerUserId = userId;
    next.ownerId = userId;
    next.claimed_by_user_id = next.claimed_by_user_id || userId;
    return commitVenue(venue, next, actorId || userId, 'venue.owner_bind');
  }

  function assign(venue, repId, actorId) {
    var next = Object.assign({}, venue);
    next.assigned_rep_id = repId || null;
    return commitVenue(venue, next, actorId, 'venue.assign');
  }

  function startOnboarding(venue, repId) {
    var next = Object.assign({}, venue);
    next.status = 'onboarding';
    next.onboarded_by_rep_id = repId || next.onboarded_by_rep_id;
    if (repId) next.assigned_rep_id = repId || next.assigned_rep_id;
    next.onboarded_at = now();
    next.fee_status = 'due';
    next.fee_amount = feeFor(next, false);
    next.fee_due_at = now() + ESCALATE_DAYS * DAY;
    return commitVenue(venue, next, repId, 'venue.start_onboarding');
  }

  function readyForPayment(venue, actorId) {
    var next = Object.assign({}, venue);
    next.status = 'pending_payment';
    if (next.fee_due_at && now() > next.fee_due_at) next.fee_due_at = now() + ESCALATE_DAYS * DAY;
    var r = commitVenue(venue, next, actorId, 'venue.ready_for_payment');
    if (r.ok) publishToDirectory(r.venue);
    return r;
  }

  function escalateFee(venue, actorId) {
    var next = Object.assign({}, venue);
    next.fee_status = 'escalated';
    next.fee_amount = feeFor(next, true);
    next.fee_due_at = Math.max(now() + ESCALATE_DAYS * DAY, next.fee_due_at || now());
    return commitVenue(venue, next, actorId, 'venue.escalate_fee');
  }

  function recordPayment(venue, payment, actorId) {
    if (!payment || !(payment.amount >= 0)) return { ok: false, error: 'Invalid payment' };
    var next = Object.assign({}, venue);
    var p = {
      id: 'pay-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      amount: Number(payment.amount),
      method: String(payment.method || 'cash'),
      reference: String(payment.reference || ''),
      received_at: payment.received_at || now(),
      received_by_rep_id: actorId || (venue.assigned_rep_id) || null,
      notes: String(payment.notes || '')
    };
    next.payments.push(p);
    if (next.payments.length > 200) next.payments = next.payments.slice(-200);
    next.fee_status = 'paid';
    next.status = 'live';
    next.closed_at = p.received_at;
    next.closed_outcome = 'closed_won';
    next.updatedAt = now();
    var r = commitVenue(venue, next, actorId, 'venue.payment_received');
    if (r.ok) publishToDirectory(r.venue);
    return r;
  }

  function markLost(venue, actorId, why) {
    var next = Object.assign({}, venue);
    next.closed_outcome = 'closed_lost';
    next.closed_at = now();
    next.status = 'archived';
    if (why) next.delivery_notes = String(why || '').trim() || next.delivery_notes;
    var r = commitVenue(venue, next, actorId, 'venue.mark_lost');
    if (r.ok) unpublishFromDirectory(next);
    return r;
  }

  function archive(venue, actorId, why) {
    var next = Object.assign({}, venue);
    next.status = 'archived';
    if (why) next.delivery_notes = String(why || '').trim() || next.delivery_notes;
    var r = commitVenue(venue, next, actorId, 'venue.archive');
    if (r.ok) unpublishFromDirectory(next);
    return r;
  }

  function reject(venue, actorId, why) {
    var next = Object.assign({}, venue);
    next.status = 'rejected';
    if (why) next.delivery_notes = String(why || '').trim() || next.delivery_notes;
    var r = commitVenue(venue, next, actorId, 'venue.reject');
    if (r.ok) unpublishFromDirectory(next);
    return r;
  }

  function reopen(venue, actorId) {
    var next = Object.assign({}, venue);
    next.status = 'pending_verification';
    next.closed_outcome = null;
    next.closed_at = null;
    next.fee_status = 'due';
    var r = commitVenue(venue, next, actorId, 'venue.reopen');
    if (r.ok) unpublishFromDirectory(r.venue);
    return r;
  }

  /* ---------- contacts ---------- */

  function addVenueContact(venue, contact, actorId) {
    var next = Object.assign({}, venue);
    if (!contact || !(contact.name || contact.whatsapp)) {
      return { ok: false, error: 'Contact needs a name or WhatsApp number' };
    }
    var c = {
      id: 'vc-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      name: String(contact.name || ''),
      whatsapp: String(contact.whatsapp || ''),
      role: String(contact.role || ''),
      profile_pic_url: String(contact.profile_pic_url || ''),
      notes: String(contact.notes || '')
    };
    next.venue_contacts.push(c);
    if (next.venue_contacts.length > 100) next.venue_contacts = next.venue_contacts.slice(-100);
    return commitVenue(venue, next, actorId, 'venue.contact_add');
  }

  function updateVenueContact(venue, contactId, patch, actorId) {
    var next = Object.assign({}, venue);
    var idx = next.venue_contacts.findIndex(function (c) { return String(c.id) === String(contactId); });
    if (idx < 0) return { ok: false, error: opening('venue.contact', contactId, 'not found') };
    next.venue_contacts[idx] = Object.assign({}, next.venue_contacts[idx], patch || {});
    return commitVenue(venue, next, actorId, 'venue.contact_update');
  }

  function removeVenueContact(venue, contactId, actorId) {
    var next = Object.assign({}, venue);
    next.venue_contacts = next.venue_contacts.filter(function (c) { return String(c.id) !== String(contactId); });
    return commitVenue(venue, next, actorId, 'venue.contact_remove');
  }

  function opening(prefix, id, state) {
    return prefix + ' ' + String(id) + ' ' + state;
  }

  /* ---------- contact log (append-only, T7) ---------- */

  function logContact(venue, entry, actorId) {
    if (!entry) return { ok: false, error: 'Nothing to log' };
    var outcomeValid = CONTACT_OUTCOMES.indexOf(entry.outcome) > -1;
    var hasBody = String(entry.body || '').trim() !== '';
    if (!outcomeValid && !hasBody) {
      return { ok: false, error: 'Choose an outcome or write a note' };
    }
    var next = Object.assign({}, venue);
    var rec = {
      id: 'log-' + now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      rep_id: actorId || (venue.assigned_rep_id) || null,
      occurred_at: entry.occurred_at || now(),
      outcome: outcomeValid ? entry.outcome : null,
      body: String(entry.body || '').trim(),
      photo_urls: Array.isArray(entry.photo_urls) ? entry.photo_urls.slice() : []
    };
    next.contact_log.push(rec);
    if (next.contact_log.length > 500) next.contact_log = next.contact_log.slice(-500);
    next.last_contacted_at = rec.occurred_at;
    var r = commitVenue(venue, next, actorId, 'venue.contact_log', true);
    if (r.ok) {
      /* record the append in the audit trail as well */
      try {
        var M = db();
        if (M) {
          var withAudit = clone(r.venue);
          withAudit.audit_log.push(auditEntry(actorId, 'venue.contact_log', null, {
            id: rec.id, outcome: rec.outcome, body: rec.body.slice(0, 80), at: rec.occurred_at
          }));
          if (withAudit.audit_log.length > 500) withAudit.audit_log = withAudit.audit_log.slice(-500);
          M.upsert('businesses', withAudit);
          r.venue = withAudit;
        }
      } catch (e) { /* audit is cosmetic here; the log entry is already safe */ }
    }
    return r;
  }

  /* ---------- profile editing (owners + reps, T4/T5) ---------- */

  var EDITABLE_FIELDS = [
    'name', 'slug', 'description', 'tagline', 'since_year',
    'district', 'town', 'area', 'address', 'landmark', 'map_link',
    'whatsapp', 'order_whatsapp', 'email', 'website',
    'logo', 'main_image', 'working_hours', 'years_in_business',
    'supplier_categories', 'services', 'delivery_notes',
    'menu_source', 'menu_document_url', 'branch_count'
  ];

  function canEditProfile(venue) {
    return ['pending_verification', 'onboarding'].indexOf(venue.status) > -1;
  }

  function updateProfile(venue, patch, actorId) {
    if (!canEditProfile(venue)) {
      return { ok: false, error: 'Profile is only editable while pending_verification or onboarding' };
    }
    var next = Object.assign({}, venue);
    EDITABLE_FIELDS.forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(patch || {}, k)) next[k] = patch[k];
    });
    next.supplier_categories = Array.isArray(next.supplier_categories) ? next.supplier_categories : [];
    next.services = Array.isArray(next.services) ? next.services : [];
    return commitVenue(venue, next, actorId, 'venue.profile_update');
  }

  /* ---------- directory mirror (T9) ---------- */

  function statusForDirectory(venue) {
    if (venue.status === 'live') return 'published';
    if (venue.status === 'pending_payment') return 'pending_payment';
    return 'hidden';
  }

  function directoryIdFor(venue) {
    return venue.restaurantId || ('ve-' + venue.id);
  }

  function toDirectoryRow(venue) {
    var loc = { district: venue.district, districtName: '', town: venue.town, area: venue.area };
    return {
      id: directoryIdFor(venue),
      slug: String(venue.slug || slugOf(venue.name, venue.id)),
      name: venue.name,
      logo: venue.logo || 'assets/logo/logo_placement_image.png',
      landmark: venue.landmark || '',
      location: loc,
      types: [venueTypeLabel(venue.business_type)],
      status: statusForDirectory(venue),
      templateId: 'tpl_shared',
      ownContent: null,
      lastActive: now(),
      contacts: [],
      socials: [],
      createdAt: now(),
      field: {
        venueId: venue.id,
        feeStatus: venue.fee_status,
        feeAmount: venue.fee_amount,
        contactNumber: venue.order_whatsapp || venue.whatsapp || ''
      }
    };
  }

  function publishToDirectory(venue) {
    var s = statusForDirectory(venue);
    if (s === 'hidden') return unpublishFromDirectory(venue);
    var DB = globalThis.EatoutsDB;
    if (!DB) return false;
    var db = DB.load();
    var id = directoryIdFor(venue);
    var idx = db.restaurants.findIndex(function (r) { return String(r.id) === String(id); });
    var row = toDirectoryRow(venue);
    if (idx < 0) db.restaurants.push(row);
    else db.restaurants[idx] = row;
    DB.save(db);
    return true;
  }

  function unpublishFromDirectory(venue) {
    var DB = globalThis.EatoutsDB;
    if (!DB) return false;
    var db = DB.load();
    var id = directoryIdFor(venue);
    db.restaurants = db.restaurants.filter(function (r) { return String(r.id) !== String(id); });
    DB.save(db);
    return true;
  }

  /* ---------- rep/permission context ---------- */

  function reps() {
    var M = db();
    if (!M) return [];
    return M.collection('users').filter(function (u) {
      var roles = Array.isArray(u.roles) ? u.roles : [];
      return roles.indexOf('rep') > -1 || u.type === 'rep' || u.type === 'admin';
    });
  }

  function repLabel(u) {
    if (!u) return '—';
    return (u.firstName || '') + (u.surname ? ' ' + u.surname : '');
  }

  function currentScope() {
    var auth = globalThis.EatoutsAuth;
    var u = (auth && auth.getUser()) || null;
    var isRep = u && (Array.isArray(u.roles) && u.roles.indexOf('rep') > -1 || u.type === 'rep');
    var isAdmin = u && (Array.isArray(u.roles) && (u.roles.indexOf('admin') > -1 || u.roles.indexOf('platform_admin') > -1) || u.type === 'platform_admin');
    return { user: u, isRep: !!isRep, isAdmin: !!isAdmin };
  }

  function myScopeVenues() {
    var scope = currentScope();
    var uid = scope.user && scope.user.id;
    return fieldVenues().filter(function (v) {
      if (!uid) return false;
      if (scope.isAdmin) return true;
      return String(v.assigned_rep_id || '') === String(uid) ||
        String(v.pre_registered_by_rep_id || '') === String(uid);
    });
  }

  /* ---------- seeding (T12) ---------- */

  function FIELD_SEED() {
    var base = [
      /* ---- RESTAURANTS ---- */
      { id: 've-r1', name: 'Maru Roadhouse Diner', town: 'Gaborone', area: 'Mogoditshane', whatsapp: '26771230001', order_whatsapp: '26771230001', branch_count: 1 },
      { id: 've-r2', name: 'Kgale Kitchen', town: 'Gaborone', area: 'Kgale', whatsapp: '26771230002', branch_count: 2 },
      { id: 've-r3', name: 'Thapama Grill House', town: 'Francistown', area: 'Thapama', whatsapp: '26771230003', branch_count: 1 },
      { id: 've-r4', name: 'Maun Mouse Cafe', town: 'Maun', area: 'CBD', whatsapp: '26771230004', branch_count: 1 },
      { id: 've-r5', name: 'Palapye Steak & Chops', town: 'Palapye', area: 'Central', whatsapp: '26771230005', branch_count: 3 },
      /* ---- LIQUOR STORES ---- */
      { id: 've-l1', name: 'Tau Build & Bottles', town: 'Gaborone', area: 'Tlokweng', whatsapp: '26771230101', branch_count: 1 },
      { id: 've-l2', name: 'Lobatse Bottle Emporium', town: 'Lobatse', area: 'CBD', whatsapp: '26771230102', branch_count: 1 },
      { id: 've-l3', name: 'Selibe Liquor Zone', town: 'Selibe-Phikwe', area: 'Central', whatsapp: '26771230103', branch_count: 1 },
      { id: 've-l4', name: 'Jwaneng Whisky Den', town: 'Jwaneng', area: 'CBD', whatsapp: '26771230104', branch_count: 2 },
      { id: 've-l5', name: 'Mochudi Bierkeller', town: 'Mochudi', area: 'Main', whatsapp: '26771230105', branch_count: 1 },
      /* ---- EVENT SUPPLIERS ---- */
      { id: 've-e1', name: 'Sankara Events & Tents', town: 'Gaborone', area: 'Broadhurst', whatsapp: '26771230201', branch_count: 1 },
      { id: 've-e2', name: 'Gabs Marquee Hire', town: 'Gaborone', area: 'CBD', whatsapp: '26771230202', branch_count: 1 },
      { id: 've-e3', name: 'Kgalagadi Sound Co', town: 'Molepolole', area: 'Village', whatsapp: '26771230203', branch_count: 1 },
      { id: 've-e4', name: 'Tsabong Party Hire', town: 'Tsabong', area: 'CBD', whatsapp: '26771230204', branch_count: 2 },
      { id: 've-e5', name: 'Okavango Decor & Lights', town: 'Maun', area: 'Old Mall', whatsapp: '26771230205', branch_count: 1 },
      /* ---- FOOD TRUCKS ---- */
      { id: 've-f1', name: 'Braai Express Truck', town: 'Gaborone', area: 'Game City', whatsapp: '26771230301', branch_count: 1 },
      { id: 've-f2', name: 'Bite Rollers', town: 'Gaborone', area: 'Airport Junction', whatsapp: '26771230302', branch_count: 1 },
      { id: 've-f3', name: 'Francistown Feast Wagon', town: 'Francistown', area: 'Blue Jacket', whatsapp: '26771230303', branch_count: 1 },
      { id: 've-f4', name: 'Kgale Curbside Kitchen', town: 'Gaborone', area: 'Kgale', whatsapp: '26771230304', branch_count: 1 },
      { id: 've-f5', name: 'Ramotswa Rollers', town: 'Ramotswa', area: 'Main', whatsapp: '26771230305', branch_count: 1 },
      /* ---- CATERERS ---- */
      { id: 've-c1', name: 'Mmathebe Catering', town: 'Gaborone', area: 'Block 8', whatsapp: '26771230401', branch_count: 1 },
      { id: 've-c2', name: 'Serowe Platters', town: 'Serowe', area: 'CBD', whatsapp: '26771230402', branch_count: 1 },
      { id: 've-c3', name: 'Mahalapye Meals', town: 'Mahalapye', area: 'Kgwaripe', whatsapp: '26771230403', branch_count: 2 },
      { id: 've-c4', name: 'Kasane Catering Co', town: 'Kasane', area: 'CBD', whatsapp: '26771230404', branch_count: 1 },
      { id: 've-c5', name: 'Tonota Tastes', town: 'Tonota', area: 'Central', whatsapp: '26771230405', branch_count: 1 }
    ];

    var typeOf = {
      've-r': 'restaurant', 've-l': 'liquor_store', 've-e': 'event_supplier',
      've-f': 'food_truck', 've-c': 'caterer'
    };
    var prefixMap = {};
    base.forEach(function (v) { prefixMap[v.id.slice(0, 4)] = typeOf[v.id.slice(0, 4)]; });

    var config = {
      've-r1': { status: 'pending_payment', fee_status: 'due', rep: 'u-tiro' },
      've-r2': { status: 'live', fee_status: 'paid', rep: 'u-tiro' },
      've-r3': { status: 'onboarding', fee_status: 'due', rep: 'u-nartey' },
      've-r4': { status: 'pending_payment', fee_status: 'escalated', escalated: true, rep: 'u-nartey' },
      've-r5': { status: 'pending_payment', fee_status: 'due', overdue: true, rep: 'u-kudi' },
      've-l1': { status: 'live', fee_status: 'paid', rep: 'u-tiro' },
      've-l2': { status: 'closed_lost', rep: 'u-nartey' },
      've-l3': { status: 'onboarding', fee_status: 'due', rep: 'u-kudi' },
      've-l4': { status: 'pending_payment', fee_status: 'due', rep: 'u-tiro' },
      've-l5': { status: 'live', fee_status: 'paid', rep: 'u-nartey' },
      've-e1': { status: 'live', fee_status: 'paid', rep: 'u-kudi' },
      've-e2': { status: 'pending_payment', fee_status: 'due', rep: 'u-tiro' },
      've-e3': { status: 'pending_verification', rep: 'u-nartey' },
      've-e4': { status: 'at_risk', rep: 'u-kudi' },
      've-e5': { status: 'unclaimed', rep: null },
      've-f1': { status: 'live', fee_status: 'paid', rep: 'u-kudi' },
      've-f2': { status: 'pending_payment', fee_status: 'due', rep: 'u-tiro' },
      've-f3': { status: 'onboarding', fee_status: 'due', rep: 'u-nartey' },
      've-f4': { status: 'closed_lost', rep: 'u-nartey' },
      've-f5': { status: 'live', fee_status: 'paid', rep: 'u-kudi' },
      've-c1': { status: 'live', fee_status: 'paid', rep: 'u-tiro' },
      've-c2': { status: 'pending_verification', rep: 'u-nartey' },
      've-c3': { status: 'pending_payment', fee_status: 'escalated', escalated: true, rep: 'u-kudi' },
      've-c4': { status: 'live', fee_status: 'paid', rep: 'u-tiro' },
      've-c5': { status: 'at_risk', rep: 'u-nartey' }
    };

    return base.map(function (raw) {
      var cfg = config[raw.id] || {};
      var v = normaliseVenue(Object.assign({}, raw, {
        type: prefixMap[raw.id.slice(0, 4)] || 'restaurant'
      }));
      v.name = raw.name;
      v.status = cfg.status === 'closed_lost' ? 'archived' : (cfg.status || 'unclaimed');
      v.closed_outcome = cfg.status === 'closed_lost' ? 'closed_lost' : null;
      v.fee_status = cfg.fee_status || (v.status === 'live' ? 'paid' : 'due');
      v.fee_amount = feeFor(v, cfg.escalated);
      v.assigned_rep_id = cfg.rep || null;
      v.pre_registered_by_rep_id = cfg.rep || null;
      v.fee_due_at = v.status === 'live' ? now() - 30 * DAY : (cfg.overdue ? now() + 2 * DAY : now() + ESCALATE_DAYS * DAY);
      v.onboarded_at = v.status === 'live' ? now() - 60 * DAY : now() - 3 * DAY;
      v.last_contacted_at = cfg.status === 'at_risk' ? now() - RISK_DAYS * DAY - 2 * DAY : now() - 3 * DAY;
      v.first_contacted_at = now() - 10 * DAY;
      v.createdAt = now() - 30 * DAY;
      v.updatedAt = now() - 1 * DAY;
      if (v.status === 'live') v.closed_at = now() - 60 * DAY;
      return v;
    });
  }

  function seedFieldVenues() {
    var M = db();
    if (!M) return { added: 0 };
    var added = 0;
    FIELD_SEED().forEach(function (v) {
      var existing = M.find('businesses', v.id);
      if (!existing) {
        v.audit_log.push(auditEntry('system', 'venue.seed', null, slimAudit(v)));
        M.upsert('businesses', v);
        added++;
      }
    });
    return { added: added };
  }

  /**
   * One-shot mirror for the customer app: seed the field venues (if absent)
   * and publish the searchable subset to the customer directory so
   * pending/live rows appear in index.html.
   */
  function syncDirectoryIfNeeded() {
    var M = db();
    if (!M) return { seeded: 0, published: 0 };
    var seeded = seedFieldVenues().added;
    var published = 0;
    fieldVenues().forEach(function (v) {
      var s = statusForDirectory(v);
      if (s === 'hidden') return;
      if (publishToDirectory(v)) published++;
    });
    return { seeded: seeded, published: published };
  }

  /* ---------- admin delete ---------- */

  function deleteVenue(venue, actorId) {
    var M = db();
    if (!M) return { ok: false, error: 'EatoutsMgrDB unavailable' };
    unpublishFromDirectory(venue);
    M.remove('businesses', venue.id);
    return { ok: true, error: null };
  }

  /* Menu source is editable by reps at any status (even live) — a rep-only
     update that never blocks on the profile-editable window. */
  function updateMenuSource(venue, source, url, actorId) {
    var next = Object.assign({}, venue);
    if (MENU_SOURCES.indexOf(source) < 0) return { ok: false, error: 'Unknown menu source' };
    next.menu_source = source;
    next.menu_document_url = String(url || '').trim();
    return commitVenue(venue, next, actorId, 'venue.menu_source');
  }

  /* ---------- reminders (T8) ---------- */

  /* Composed reminder copy. Days 1-6 nudge; day 7+ states the escalation.
     Reps tap a button which fills the contact-log composer (no auto-send). */
  function reminderCopy(venue, day) {
    var who = String(venue.name || 'this business');
    var escalated = venue.fee_status === 'escalated';
    var feeLabel = 'P' + feeFor(venue, escalated);
    var d = parseInt(day, 10) || 1;
    if (d >= ESCALATE_DAYS || venue.fee_status === 'escalated') {
      return 'Final reminder, ' + who + ': your EatOuts setup fee is now P' + feeFor(venue, true) +
        '. Pay today and we switch your listing live right away. If you prefer not to go ahead, let me know and we will pause it for now.';
    }
    return 'Good day, ' + who + '! EatOuts here' + (venue.business_type ? ' (' + venueTypeLabel(venue.business_type) + ')' : '') +
      '. Your listing is ' + (d === 1 ? 'now being prepared' : 'almost ready') +
      ' — once the ' + feeLabel + ' setup fee is paid (Orange Money, MyZaka or cash), we go live on day ' + (d + 1) + '. ' +
      'Reply here and we can collect or take payment now.';
  }

  /* ---------- public API ---------- */

  window.EatoutsField = {
    FIELD_TYPES: FIELD_TYPES,
    FIELD_STATUSES: FIELD_STATUSES,
    CLOSED_OUTCOMES: CLOSED_OUTCOMES,
    MENU_SOURCES: MENU_SOURCES,
    CONTACT_OUTCOMES: CONTACT_OUTCOMES,

    DAY: DAY,
    ESCALATE_DAYS: ESCALATE_DAYS,
    ARCHIVE_DAYS: ARCHIVE_DAYS,
    RISK_DAYS: RISK_DAYS,
    BASE_FEE: BASE_FEE,
    ESCALATED_FEE: ESCALATED_FEE,
    BRANCH_FEE: BRANCH_FEE,

    now: now,
    iso: iso,
    pretty: pretty,
    dayStamp: dayStamp,
    clone: clone,
    normaliseType: normaliseType,
    venueTypeLabel: venueTypeLabel,
    venueDefaults: venueDefaults,
    normaliseVenue: normaliseVenue,
    slugOf: slugOf,

    feeFor: feeFor,
    feeDue: feeDue,
    isOverdue: isOverdue,
    lastActivityAt: lastActivityAt,
    isAtRisk: isAtRisk,
    overdueAt: overdueAt,
    archiveDeadline: archiveDeadline,
    statusBuckets: statusBuckets,

    allVenues: allVenues,
    skippedVenues: skippedVenues,
    venueById: venueById,
    fieldVenues: fieldVenues,

    touchLogin: touchLogin,
    touchOrder: touchOrder,

    claim: claim,
    bindOwner: bindOwner,
    assign: assign,
    startOnboarding: startOnboarding,
    readyForPayment: readyForPayment,
    escalateFee: escalateFee,
    recordPayment: recordPayment,
    markLost: markLost,
    archive: archive,
    reject: reject,
    reopen: reopen,

    addVenueContact: addVenueContact,
    updateVenueContact: updateVenueContact,
    removeVenueContact: removeVenueContact,
    logContact: logContact,
    updateProfile: updateProfile,
    updateMenuSource: updateMenuSource,
    canEditProfile: canEditProfile,
    EDITABLE_FIELDS: EDITABLE_FIELDS,

    statusForDirectory: statusForDirectory,
    directoryIdFor: directoryIdFor,
    publishToDirectory: publishToDirectory,
    unpublishFromDirectory: unpublishFromDirectory,

    reps: reps,
    repLabel: repLabel,
    currentScope: currentScope,
    myScopeVenues: myScopeVenues,

    FIELD_SEED: FIELD_SEED,
    seedFieldVenues: seedFieldVenues,
    syncDirectoryIfNeeded: syncDirectoryIfNeeded,
    deleteVenue: deleteVenue,
    reminderCopy: reminderCopy
  };
})();