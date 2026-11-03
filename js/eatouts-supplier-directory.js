/* ============================================================
   EATOUTS SUPPLIER DIRECTORY BRIDGE
   eatouts-suppliers.html lets a supplier build a profile and
   publish it. That profile lands in localStorage
   (eatouts_suppliers_v1) and, until now, nothing else in the app
   could see it.

   This file turns every published profile into one directory
   record — the same shape assets/data/event_supplier_demo_catalogue.js
   ships — and appends it to window.EATOUTS_SUPPLIERS. The planner
   (eatout_event_builder.html) reads that array, so an activated
   supplier becomes pickable and costable with no server involved.

   Load AFTER assets/data/event_supplier_demo_catalogue.js and
   AFTER assets/data/supplier_catalog.js. Safe on pages that have
   neither: it then only exposes window.EatoutsSupplierDirectory.
   ============================================================ */
(function(){
  'use strict';

  var PROFILES_KEY = 'eatouts_suppliers_v1';

  /* The onboarding form uses 8 categories; the planner directory has 40.
     One explicit hop keeps a new supplier discoverable in the bucket a
     venue actually browses. Unmapped categories fall back to planning. */
  var CAT_MAP = {
    infrastructure: 'tents_structures',
    catering:       'food_catering',
    decor:          'decor_floristry',
    technical:      'audio_sound',
    entertainment:  'entertainment_artists',
    security:       'security_crowd',
    media:          'photography_media',
    management:     'event_planning'
  };
  var DEFAULT_CAT = 'event_planning';

  /* onboarding rate types -> directory units (the strings the cost model reads) */
  var UNIT_MAP = {
    'Per hour':    'per hour',
    'Per day':     'per day',
    'Per booking': 'per event',
    'Per person':  'per person',
    'Per item':    'per item',
    'Custom quote':'per event'
  };

  var THUMBS = {
    infrastructure:'🏗', catering:'🍽', decor:'🌿', technical:'🎚',
    entertainment:'🎤', security:'🛡', media:'📸', management:'📋'
  };

  function esc(s){ return String(s == null ? '' : s); }
  function num(v){ var n = Number(v); return isFinite(n) ? n : 0; }
  function slugOf(raw){
    if (window.EatoutsSlug && typeof EatoutsSlug.normalize === 'function') return EatoutsSlug.normalize(raw);
    return String(raw || '').toLowerCase().replace(/[^a-z0-9.]+/g, '');
  }
  function priceLabel(n){ return 'P' + num(n).toLocaleString('en-US'); }

  function readProfiles(){
    try {
      var raw = localStorage.getItem(PROFILES_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch(e){ return []; }
  }

  function onboardingCat(cid){
    var catalog = window.EATOUTS_SUPPLIER_CATALOG || [];
    for (var i = 0; i < catalog.length; i++) if (catalog[i].id === cid) return catalog[i];
    return null;
  }
  function directoryCat(cid){
    var cats = window.EATOUTS_SUPPLIER_CATS || [];
    for (var i = 0; i < cats.length; i++) if (cats[i].id === cid) return cats[i];
    return null;
  }


  /* Highest rate a profile can quote, so the planner has a number to cost. */
  function rateOf(p){
    var svcs = Array.isArray(p.services) ? p.services : [];
    for (var i = 0; i < svcs.length; i++) {
      if (num(svcs[i].baseRate) > 0) {
        return { amount: num(svcs[i].baseRate), rateType: svcs[i].rateType || 'Per booking', svc: svcs[i] };
      }
    }
    var pr = p.pricing || {};
    if (num(pr.fullDayRate) > 0)  return { amount: num(pr.fullDayRate),  rateType: 'Per day',     svc: null };
    if (num(pr.halfDayRate) > 0)  return { amount: num(pr.halfDayRate),  rateType: 'Per booking', svc: null };
    if (num(pr.hourlyRate) > 0)   return { amount: num(pr.hourlyRate),   rateType: 'Per hour',    svc: null };
    return null;
  }

  function firstService(p){
    var svcs = Array.isArray(p.services) ? p.services : [];
    for (var i = 0; i < svcs.length; i++) if (svcs[i] && svcs[i].title) return svcs[i];
    return null;
  }

  function serviceAreaOf(p){
    var loc = p.location || {};
    if (loc.servesNationwide) return ['Nationwide'];
    if (loc.town) return [esc(loc.town)];
    if (loc.districtName) return [esc(loc.districtName)];
    return [];
  }

  function toRecord(p){
    if (!p) return null;
    var biz = p.business || {};
    var loc = p.location || {};
    var name = esc(biz.name).trim();
    if (!name) return null;                       /* nothing to list yet */

    var lead = firstService(p);
    var rate = rateOf(p);
    var catId = (lead && CAT_MAP[lead.categoryId]) || DEFAULT_CAT;
    var dirCat = directoryCat(catId);
    var onbCat = onboardingCat(lead && lead.categoryId);
    var type = (lead && onbCat && Array.isArray(onbCat.types))
      ? onbCat.types.filter(function(t){ return t.id === lead.typeId; })[0]
      : null;

    /* every other service becomes an add-on line the cost model can price */
    var addons = (Array.isArray(p.services) ? p.services : [])
      .filter(function(s){ return s && s.title && (!lead || s.id !== lead.id); })
      .map(function(s){
        var r = num(s.baseRate);
        return r > 0 ? esc(s.title) + ' (' + priceLabel(r) + ')' : esc(s.title);
      });

    return {
      id: 'local_' + esc(p.id),
      profileId: esc(p.id),
      catId: catId,
      catName: (dirCat && dirCat.name) || (onbCat && onbCat.name) || 'Event supplier',
      masterId: '',
      subcategory: (type && type.name) || (onbCat && onbCat.name) || '',
      businessName: name,
      service: (lead && esc(lead.title)) || esc(biz.tagline) || '',
      description: esc(biz.about) || esc(biz.tagline) || '',
      price: rate ? rate.amount : 0,
      displayPrice: rate ? priceLabel(rate.amount) : '',
      unit: (rate && UNIT_MAP[rate.rateType]) || 'per event',
      included: '',
      addons: addons,
      serviceArea: serviceAreaOf(p),
      city: esc(loc.town) || esc(loc.districtName) || '',
      rating: null,                                /* no invented scores */
      thumb: THUMBS[(lead && lead.categoryId) || ''] || '🏪',
      slug: p.slug || slugOf(name),
      listingStatus: 'published',
      source: 'supplier-profile'
    };
  }

  function published(){
    return readProfiles()
      .filter(function(p){ return p && p.status === 'published'; })
      .map(toRecord)
      .filter(function(r){ return !!r; });
  }

  /* Append to the directory the planner already reads. Re-running replaces
     the records this bridge added last time, so a re-publish is picked up
     without duplicating anything. */
  function sync(){
    var dir = window.EATOUTS_SUPPLIERS;
    if (!Array.isArray(dir)) return published();
    for (var i = dir.length - 1; i >= 0; i--) {
      if (dir[i] && dir[i].source === 'supplier-profile') dir.splice(i, 1);
    }
    var mine = published();
    for (var j = 0; j < mine.length; j++) dir.push(mine[j]);
    return mine;
  }

  function find(term){
    var t = esc(term).trim();
    if (!t) return null;
    var list = published();
    for (var i = 0; i < list.length; i++) if (list[i].id === t || list[i].profileId === t) return list[i];
    var want = slugOf(t);
    for (var j = 0; j < list.length; j++) {
      if (list[j].slug === want || slugOf(list[j].businessName) === want) return list[j];
    }
    return null;
  }

  window.EatoutsSupplierDirectory = {
    CAT_MAP: CAT_MAP,
    records: published,
    find: find,
    sync: sync,
    toRecord: toRecord
  };

  /* Directory pages get the published profiles mixed in with the demo set. */
  sync();
})();

