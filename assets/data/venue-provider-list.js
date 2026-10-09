/* ============================================================
   EATOUTS VENUE PROVIDER LIST
   Classic script (no modules). Reads from
   window.DIRECTORY_RUNTIME_DATA.restaurants and exposes a
   planner-ready venue catalogue.

   Exposes:
     window.EATOUTS_VENUE_PROVIDERS = {
       all, forEvent, byId, allVenues, eventsFor, thumbFor
     }
     window.EATOUTS_VENUES          (array in the planner schema)
     window.EVENT_TAXONOMY          (alias of EATOUTS_EVENT_TAXONOMY)

   All provider lookups are lazy because EatoutsBridge and
   EatoutsBrand finish loading AFTER this file.
   ============================================================ */
(function () {
  'use strict';

  var plannerVenues = [];      // memoized EATOUTS_VENUES array
  var venuesComputed = false;  // true once we produced a non-empty list
  var providerCache = null;    // memoized providers array (all())

  function rows() {
    var d = (typeof window !== 'undefined' && window.DIRECTORY_RUNTIME_DATA) || null;
    if (!d || !Array.isArray(d.restaurants)) return [];
    return d.restaurants;
  }

  function brandKey(row) {
    if (!row) return '';
    var B = window.EatoutsBrand;
    if (B && typeof B.canonicalKey === 'function') {
      var k = B.canonicalKey(row.slug || '');
      if (k) return k;
    }
    return String(row.slug || '');
  }

  function eventIds() {
    var out = [];
    var tax = window.EATOUTS_EVENT_TAXONOMY;
    if (tax && typeof tax === 'object') {
      Object.keys(tax).forEach(function (k) {
        var cat = tax[k] || {};
        (cat.subCategories || []).forEach(function (sub) {
          (sub.events || []).forEach(function (ev) {
            if (ev && ev.id) out.push(ev.id);
          });
        });
      });
      if (out.length) return out;
    }
    var ET = window.EATOUTS_EVENT_TYPES;
    if (ET && typeof ET.getAllEventTypes === 'function') {
      try {
        return ET.getAllEventTypes().map(function (e) { return e.id; }).filter(Boolean);
      } catch (e) {}
    }
    return [];
  }

  function isGaborone(town) {
    return String(town || '').trim().toLowerCase() === 'gaborone';
  }

  function thumbFor(row) {
    var cat = String((row && row.category) || '').toLowerCase();
    var types = ((row && row.types) || []).join(' ').toLowerCase();
    var hay = cat + ' ' + types;
    if (/bar|pub|lounge|night ?club/.test(hay)) return '🍸';
    if (/cafe|coffee/.test(hay)) return '☕';
    if (/fast food|takeout|take-away|takeaway/.test(hay)) return '🍔';
    if (/steakhouse|steak/.test(hay)) return '🥩';
    if (/hotel|guest ?house|lodge/.test(hay)) return '🏨';
    return '🍽';
  }

  /* ---------- Providers (one per brand group) ---------- */

  function computeAll() {
    if (providerCache) return providerCache;

    // Prefer the bridge's groupedListing() when available: it already
    // returns one row per brand with thumbHtml + branch metadata.
    var B = window.EatoutsBridge;
    if (B && typeof B.groupedListing === 'function') {
      try {
        var list = B.groupedListing() || [];
        providerCache = list.map(function (g) {
          var branches = g.branches || [];
          var rep = null;
          for (var i = 0; i < branches.length; i++) {
            if (isGaborone((branches[i].location && branches[i].location.town) || '')) {
              rep = branches[i]; break;
            }
          }
          if (!rep && branches.length) rep = branches[0];
          var town = (rep && rep.location && rep.location.town) ||
                     (g.location && g.location.town) || '';
          var area = (rep && rep.location && rep.location.area) ||
                     (g.location && g.location.area) || '';
          return {
            id: (rep && rep.id) || g.id,
            name: g.name || (rep && rep.name) || '',
            slug: g.slug || '',
            key: g.key || g.brandKey || '',
            brandKey: g.brandKey || g.key || '',
            town: town,
            area: area,
            placeLabel: (town && area) ? (town + ' · ' + area) : (town || area || ''),
            types: (g.types || []).slice(),
            category: g.category || (g.types || []).join(' · '),
            logo: g.logo || '',
            thumbHtml: g.thumbHtml || '',
            locationCount: g.locationCount || branches.length || 1,
            branchNames: g.branchNames || branches.map(function (b) { return b.name; }),
            _row: rep,
            _branches: branches
          };
        });
        return providerCache;
      } catch (e) { /* fall through to manual grouping */ }
    }

    // Manual grouping: one row per brandKey, representative = a Gaborone
    // branch when present, otherwise the first branch in roster order.
    var byKey = {};
    var order = [];
    rows().forEach(function (r) {
      var k = brandKey(r);
      if (!k) return;
      if (!byKey[k]) { byKey[k] = []; order.push(k); }
      byKey[k].push(r);
    });

    providerCache = order.map(function (k) {
      var branches = byKey[k];
      var rep = null;
      for (var i = 0; i < branches.length; i++) {
        if (isGaborone(branches[i].town)) { rep = branches[i]; break; }
      }
      if (!rep) rep = branches[0];
      var town = String(rep.town || '');
      var area = String(rep.area || '');
      var cat = String(rep.category || ((rep.types || []).join(' · ')));
      var thumb = '';
      var BB = window.EatoutsBrand;
      if (BB && typeof BB.thumbHtml === 'function') {
        try { thumb = BB.thumbHtml(rep, { size: 56 }); } catch (e) { thumb = ''; }
      }
      return {
        id: rep.id,
        name: rep.name || '',
        slug: rep.slug || '',
        key: k,
        brandKey: k,
        town: town,
        area: area,
        placeLabel: (town && area) ? (town + ' · ' + area) : (town || area || ''),
        types: (rep.types || []).slice(),
        category: cat,
        logo: rep.logo || '',
        thumbHtml: thumb,
        locationCount: branches.length,
        branchNames: branches.map(function (b) { return b.name; }),
        _row: rep,
        _branches: branches
      };
    });
    return providerCache;
  }

  function all() { return computeAll(); }

  /* Demo policy: every provider supports every event type.
     Filtering by venue capability is a future step. */
  function forEvent(eventId) {
    return all();
  }

  function byId(id) {
    if (!id) return null;
    var list = all();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.id === id) return p;
      if (p.brandKey === id || p.key === id) return p;
      if (p._branches) {
        for (var j = 0; j < p._branches.length; j++) {
          if (p._branches[j].id === id) return p;
        }
      }
    }
    return null;
  }

  /* ---------- Planner-schema venue catalogue (one per RAW row) ---------- */

  function computeVenues() {
    if (venuesComputed) return plannerVenues;
    var ids = eventIds();
    plannerVenues = rows().map(function (r) {
      var thumb = thumbFor(r);
      return {
        id: r.id,
        name: r.name || '',
        city: r.town || '',
        area: r.area || '',
        logo: r.logo || '',
        thumb: thumb,
        fromPrice: 0,
        capacity: 0,
        eventTypes: ids.slice(),
        rules: '',
        seating: '',
        spaces: [
          { id: r.id + '-main', name: 'Main Space', type: 'Indoor', cap: 0, price: 0,
            desc: 'Confirm capacity & layout with the venue' },
          { id: r.id + '-out', name: 'Outdoor Area', type: 'Outdoor', cap: 0, price: 0,
            desc: 'Confirm with the venue' }
        ],
        menu: [],
        gallery: [
          { emoji: thumb, title: r.name || '', desc: 'Venue photo' },
          { emoji: '📍', title: (r.town || 'Location'), desc: r.area || '' }
        ],
        pricing: { perPerson: 0, minSpend: 0, hourly: 0 }
      };
    });
    if (plannerVenues.length) venuesComputed = true;
    return plannerVenues;
  }

  window.EATOUTS_VENUE_PROVIDERS = {
    all: all,
    forEvent: forEvent,
    byId: byId,
    allVenues: computeVenues,
    eventsFor: function () { return eventIds(); },
    thumbFor: thumbFor
  };

  /* The planner reads this array directly (getVenues). Compute eagerly:
     directory_runtime_data.js and event_types.js are guaranteed to have
     executed before this file in both the planner and index.html. */
  window.EATOUTS_VENUES = computeVenues();

  window.EVENT_TAXONOMY = window.EVENT_TAXONOMY || window.EATOUTS_EVENT_TAXONOMY;
})();