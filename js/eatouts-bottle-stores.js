/* ============================================================
   EATOUTS BOTTLE STORES
   Filter / search / sort layer over the bottle & liquor store
   directory in assets/data/BottleLliquorStoresDatabase.js
   (window.EATOUTS_BOTTLE_STORES).

   The data file expands every chain branch into its own store and
   groups them into brands, so the app can render one row per brand
   (with a branch picker) exactly like the restaurants list.

   Loaded via <script src>, no fetch — works from file:// too.

   API (window.EatoutsBottleStores):
     all()               brands, sorted (logo first, then A-Z)
     sorted(list)        sort any brand list the same way
     get(slug)           brand group by slug
     store(id)           a single branch/store by id
     search(query)       brands matching a name / town / area
     filter(opts)        filter({town, area, query})
     offeringStores(opts) every store offering the shared catalogue
     towns()             sorted unique towns
   ============================================================ */
(function () {
  'use strict';

  var DATA = (typeof window !== 'undefined' && window.EATOUTS_BOTTLE_STORES) || null;

  var brands = (DATA && Array.isArray(DATA.brands)) ? DATA.brands : [];
  var stores = (DATA && Array.isArray(DATA.stores)) ? DATA.stores : [];
  var towns = (DATA && Array.isArray(DATA.towns)) ? DATA.towns : [];

  var brandBySlug = {};
  var storeById = {};
  brands.forEach(function (b) { if (b && b.slug) brandBySlug[b.slug] = b; });
  stores.forEach(function (s) { if (s && s.id) storeById[s.id] = s; });

  function norm(s) {
    return String(s == null ? '' : s).trim().toLowerCase();
  }

  /* Brands with a real logo float to the top, then alphabetical.
     `recentlyActive` (a future timestamp/rank set by the manager tools)
     is the primary key so an active store can jump the queue later. */
  function sorted(list) {
    return (list || []).slice().sort(function (a, b) {
      var ra = Number(a && a.recentlyActive) || 0;
      var rb = Number(b && b.recentlyActive) || 0;
      if (rb !== ra) return rb - ra;
      var la = a && a.logo ? 1 : 0;
      var lb = b && b.logo ? 1 : 0;
      if (lb !== la) return lb - la;
      return norm(a && a.name).localeCompare(norm(b && b.name));
    });
  }

  function all() { return sorted(brands); }

  function get(slug) { return brandBySlug[slug] || null; }

  function store(id) { return storeById[id] || null; }

  /* Does a brand touch this town / area anywhere among its branches? */
  function brandInTown(brand, town) {
    if (!town || town === 'All') return true;
    var t = norm(town);
    return (brand.branches || []).some(function (b) { return norm(b.town) === t; });
  }
  function brandInArea(brand, area) {
    if (!area || area === 'All') return true;
    var a = norm(area);
    return (brand.branches || []).some(function (b) { return norm(b.area) === a; });
  }

  function matchesQuery(brand, q) {
    if (!q) return true;
    var needle = norm(q);
    if (norm(brand.name).indexOf(needle) > -1) return true;
    return (brand.branches || []).some(function (b) {
      return norm(b.name).indexOf(needle) > -1 ||
             norm(b.town).indexOf(needle) > -1 ||
             norm(b.area).indexOf(needle) > -1;
    });
  }

  function search(query) {
    return sorted(brands.filter(function (b) { return matchesQuery(b, query); }));
  }

  function filter(opts) {
    opts = opts || {};
    return sorted(brands.filter(function (b) {
      return brandInTown(b, opts.town) &&
             brandInArea(b, opts.area) &&
             matchesQuery(b, opts.query);
    }));
  }

  /* Every store offers the shared catalogue for now, so "offering" is just
     the stores that survive the current town/area/query filter. */
  function offeringStores(opts) {
    opts = opts || {};
    var matched = filter(opts);
    var out = [];
    matched.forEach(function (b) {
      (b.branches || []).forEach(function (s) {
        if (brandInTown(b, opts.town) && brandInArea(b, opts.area)) out.push(s);
      });
    });
    return out;
  }

  function metaFor(brand) {
    if (!brand) return '';
    if (brand.locationCount > 1) return brand.locationCount + ' places';
    var b = brand.branches && brand.branches[0];
    return (b && b.town) || '';
  }

  window.EatoutsBottleStores = {
    all: all,
    sorted: sorted,
    get: get,
    store: store,
    search: search,
    filter: filter,
    offeringStores: offeringStores,
    towns: function () { return towns.slice(); },
    metaFor: metaFor,
    norm: norm
  };
})();
