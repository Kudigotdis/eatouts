/* ============================================================
   EATOUTS CATERING
   Filter / search / sort layer over the catering services
   directory in assets/data/CateringServicesDatabase.js
   (window.EATOUTS_CATERING).

   The data file expands every business location into its own branch and
   groups them into brands, so the app can render one row per business
   (with a branch picker) exactly like the restaurants list.

   Loaded via <script src>, no fetch — works from file:// too.

   API (window.EatoutsCatering):
      all()               brands, sorted (logo first, then A-Z)
      sorted(list)        sort any brand list the same way
      get(slug)           brand group by slug
      branch(id)          a single branch by id
      search(query)       brands matching a name / town / area
      filter(opts)        filter({town, area, query})
      offeringBranches(opts) every branch matching the filter
      towns()             sorted unique towns
      metaFor(brand)      short meta line for a brand row
    ============================================================ */
(function () {
  'use strict';

  var DATA = (typeof window !== 'undefined' && window.EATOUTS_CATERING) || null;

  var brands = (DATA && Array.isArray(DATA.brands)) ? DATA.brands : [];
  var branches = (DATA && Array.isArray(DATA.branches)) ? DATA.branches : [];
  var towns = (DATA && Array.isArray(DATA.towns)) ? DATA.towns : [];

  var brandBySlug = {};
  var branchById = {};
  brands.forEach(function (b) { if (b && b.slug) brandBySlug[b.slug] = b; });
  branches.forEach(function (s) { if (s && s.id) branchById[s.id] = s; });

  function norm(s) {
    return String(s == null ? '' : s).trim().toLowerCase();
  }

  /* Brands with a real logo float to the top, then alphabetical. */
  function sorted(list) {
    return (list || []).slice().sort(function (a, b) {
      var la = a && a.logo ? 1 : 0;
      var lb = b && b.logo ? 1 : 0;
      if (lb !== la) return lb - la;
      return norm(a && a.name).localeCompare(norm(b && b.name));
    });
  }

  function all() { return sorted(brands); }

  function get(slug) { return brandBySlug[slug] || null; }

  function branch(id) { return branchById[id] || null; }

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
    if (norm(brand.type).indexOf(needle) > -1) return true;
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

  /* Every branch belongs to its brand, so "offering" is just the branches
     that survive the current town/area/query filter. */
  function offeringBranches(opts) {
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

  window.EatoutsCatering = {
    all: all,
    sorted: sorted,
    get: get,
    branch: branch,
    search: search,
    filter: filter,
    offeringBranches: offeringBranches,
    towns: function () { return towns.slice(); },
    metaFor: metaFor,
    norm: norm
  };
})();
