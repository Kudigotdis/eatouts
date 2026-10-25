/* EatoutsManagerSeed — merges the generated demo dataset
   (window.EATOUTS_DEMO, from assets/data/demo/the-food-place/demo-data.js) into
   the manager store (EatoutsMgrDB / "eatouts_manager_v1").

   Safe and idempotent:
   - records are only added when their id is absent, so real user edits win;
   - the business record is filled field-by-field without overwriting values;
   - the demo modules (menu, beverage, promos, events, gallery) only populate a
     module that is still empty;
   - a version marker on the store prevents re-merging on every page load;
   - demo order timestamps are re-anchored to the seed moment (newest = five
     minutes ago) so "Orders today" is meaningful on the day the demo is seeded.

   Add "?demo=reset" to the URL to reset the store and re-seed from scratch. */
(function () {
  'use strict';
  var DB = window.EatoutsMgrDB;
  if (!DB || typeof DB.get !== 'function' || typeof DB.upsert !== 'function') return;
  var DEMO = window.EATOUTS_DEMO;
  if (!DEMO || typeof DEMO !== 'object') return;

  var VERSION = 3;
  var BIZ_ID = 'biz-restaurant';
  var reset = /[?&]demo=reset\b/.test(String((window.location && window.location.search) || ''));

  /* Ids retired in an earlier demo seed; pruned on the version bump so the
     replaced roster leaves no leftovers in an already-populated store. */
  var OBSOLETE = {
    staff: ['st-1', 'st-2', 'st-101', 'st-102', 'st-103', 'st-104', 'st-105', 'st-106', 'st-107', 'st-108', 'st-109', 'st-110'],
    users: ['u-st-1', 'u-st-2', 'u-st-3', 'u-st-4', 'u-st-5']
  };

  function prune() {
    Object.keys(OBSOLETE).forEach(function (collection) {
      OBSOLETE[collection].forEach(function (id) { if (DB.find(collection, id)) DB.remove(collection, id); });
    });
  }

  /* ---- Demo order dates -------------------------------------------------
     The generated dataset ships with frozen dates ("2026-10-10 07:12"), so a
     store seeded weeks ago shows nothing under "Orders today". Re-anchor the
     ledger to the seed moment instead: the newest demo order becomes five
     minutes ago and the older ones keep their spacing. Dates are written in
     Africa/Gaborone, the same zone operator-dashboard1.html uses to decide
     what "today" is. */
  var GABORONE = 'Africa/Gaborone';
  function gaboroneFormatter() {
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: GABORONE, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
      });
    } catch (e) { return null; }
  }
  var DATE_FMT = gaboroneFormatter();

  function stamp(ms) {
    if (!DATE_FMT) return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
    var p = {};
    DATE_FMT.formatToParts(new Date(ms)).forEach(function (x) { p[x.type] = x.value; });
    return p.year + '-' + p.month + '-' + p.day + ' ' + p.hour + ':' + p.minute;
  }

  function parseDemoDate(v) {
    var t = Date.parse(String(v || '').replace(' ', 'T'));
    return isFinite(t) ? t : null;
  }

  /* Rewrites DEMO.orders[].created in place; returns the {from,to} map so the
     same shift can be applied to copies already sitting in the store. */
  function anchorDemoOrders() {
    var list = Array.isArray(DEMO.orders) ? DEMO.orders : [];
    var times = list.map(function (o) { return parseDemoDate(o && o.created); });
    var newest = null;
    times.forEach(function (t) { if (t != null && (newest == null || t > newest)) newest = t; });
    if (newest == null) return null;
    var shift = Date.now() - 5 * 60000 - newest;
    var moved = {};
    list.forEach(function (o, i) {
      if (!o || times[i] == null) return;
      var from = String(o.created || '');
      o.created = stamp(times[i] + shift);
      if (o.id != null) moved[String(o.id)] = { from: from, to: o.created };
    });
    return moved;
  }

  function reanchorStored(moved) {
    if (!moved) return;
    var touched = false;
    DB.collection('orders').forEach(function (o) {
      var m = o && o.id != null ? moved[String(o.id)] : null;
      if (m && String(o.created || '') === m.from) { o.created = m.to; touched = true; }
    });
    if (touched) save();
  }

  /* Rename the pre-2.0 generic demo owner to the named demo owner. */
  function refreshOwner() {
    var u = DB.find('users', 'u-owner');
    if (u && (u.firstName === 'Demo' || !u.employeeId)) {
      DB.upsert('users', Object.assign({}, u, { firstName: 'Kagiso', surname: 'Phiri', employeeId: 'TFP-OWN-01' }));
    }
  }

  function state() { try { return DB.get(); } catch (e) { return null; } }
  function save() { try { DB.save(); } catch (e) { /* non-fatal */ } }

  function mergeArray(key, arr, target) {
    if (!Array.isArray(arr) || !arr.length) return;
    var name = target || key;
    var seen = {};
    DB.collection(name).forEach(function (x) { if (x && x.id != null) seen[String(x.id)] = 1; });
    arr.forEach(function (rec) {
      if (!rec || rec.id == null) return;
      if (seen[String(rec.id)]) return;
      DB.upsert(name, rec);
      seen[String(rec.id)] = 1;
    });
  }

  function mergeSettings(obj) {
    if (!obj || typeof obj !== 'object') return;
    var s = state();
    if (!s) return;
    s.settings = s.settings || {};
    Object.keys(obj).forEach(function (k) {
      var cur = s.settings[k];
      if (k === 'pricing' || k === 'featureFlags') {
        s.settings[k] = Object.assign({}, obj[k], cur || {});
      } else if (cur == null || (Array.isArray(cur) && !cur.length)) {
        s.settings[k] = obj[k];
      }
    });
    save();
  }

  function mergeBusiness() {
    var biz = (DEMO.businesses || [])[0];
    if (!biz || biz.id == null) return;
    var existing = DB.find('businesses', biz.id);
    if (!existing) { DB.upsert('businesses', biz); return; }
    Object.keys(biz).forEach(function (k) {
      var cur = existing[k];
      if (cur == null || (typeof cur === 'string' && !cur)) existing[k] = biz[k];
    });
    ['identity', 'location', 'operatingHours', 'amenities', 'payments', 'capacity', 'contacts', 'socials'].forEach(function (k) {
      if (existing[k] == null && biz[k] != null) existing[k] = biz[k];
    });
    save();
  }

  function mergeModules() {
    var biz = DB.find('businesses', BIZ_ID);
    if (!biz) return;
    biz.modules = biz.modules || {};
    var mods = biz.modules;
    function fill(key, value, isEmpty) {
      if (value == null) return;
      if (mods[key] == null || isEmpty(mods[key])) mods[key] = value;
    }
    fill('menu', DEMO.menu, function (v) { return !v || !v.items || !v.items.length; });
    fill('beverage', DEMO.beverage, function (v) { return !v || !v.items || !v.items.length; });
    fill('promos', DEMO.promos, function (v) { return !Array.isArray(v) || !v.length; });
    fill('events', DEMO.events, function (v) { return !Array.isArray(v) || !v.length; });
    fill('gallery', DEMO.gallery, function (v) { return !v || !v.images || !v.images.length; });
    save();
  }

  var s = state();
  if (!reset && s && s.demoSeed === VERSION) return;

  if (reset && typeof DB.reset === 'function') {
    DB.reset();
    s = state();
  }

  prune();
  refreshOwner();

  var moved = anchorDemoOrders();

  ['users', 'staff', 'orders', 'deliveries', 'reservations', 'reviews', 'invoices',
   'feedback', 'notifications', 'favourites', 'addresses', 'verification', 'disputes']
    .forEach(function (k) { mergeArray(k, DEMO[k]); });

  mergeArray('customerOrders', DEMO.customerOrders, 'orders');
  reanchorStored(moved);

  mergeBusiness();
  mergeSettings(DEMO.settings);
  mergeModules();

  s = state();
  if (s) {
    s.demoSeed = VERSION;
    s.demoSeedAt = (s.demoSeedAt || new Date().toISOString());
  }
  save();

  try {
    document.dispatchEvent(new CustomEvent('eatouts:demo-seeded', { detail: { version: VERSION } }));
  } catch (e) { /* non-fatal */ }
})();
