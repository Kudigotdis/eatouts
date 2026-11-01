/* ============================================================
   TrackHype - territory registry (ALL COUNTRIES) + lazy genre
   pool and location loaders.
   No npm, no build step. Load AFTER trackhype.js (merges into
   window.TrackHype) or standalone (exposes window.TrackHypeTerritories).

   Doctrine:
   - Offline-first: never throw. Every async op resolves to
     { data, error } (mirror of js/api.js).
   - The territory table itself is a generated, eagerly loaded file
     (js/territory-registry.js, 196 countries). It is small and is
     needed the moment any page asks "what country is this?".
   - Mobile doctrine: NO genre data is preloaded. The selected
     country's genre directory is injected on demand as a dynamic
     <script> node, exactly like the legacy ZW/BW location
     globals. A <script> tag is used rather than fetch() so the
     loader keeps working under file://, where fetch is blocked.
   - City-level LOCATION files (cities-&-towns-*.geojson) only exist
     for the 15 SADC countries. loadTerritoryLocations() returns
     { data: null, error } for every other country by design.
   - Currency rows mirror docs/info/world_currencies.json
     (USD base; region is display, never price). The 12 countries
     absent from that file carry ISO code + label but null
     $5/$10 equivalents; describeTerritory() substitutes the ISO
     code so nothing ever renders the string "null".
   ============================================================ */
(function () {
  "use strict";

  var FALLBACK_CODE = "ZW";

  /* The generated 196-country table. Kept as a variable (not used
     directly) so a page that forgot to include the registry still
     boots on the Zimbabwe-only fallback below rather than throwing. */
  var TERRITORIES = Array.isArray(window.TrackHypeTerritoryRegistry) && window.TrackHypeTerritoryRegistry.length
    ? window.TrackHypeTerritoryRegistry
    : [
        { code: "ZW", name: "Zimbabwe", lower: "zw", genreKey: "zimbabwe", region: "Africa",
          source: "script", script: "zimbabwe_locations.js", global: "ZIMBABWE_LOCATIONS_DATA",
          currency: { code: "USD", label: "United States Dollar", five: "$5.00", ten: "$10.00" } }
      ];

  /* Indexes built once, so findTerritory is O(1)-ish rather than a
     196-iteration scan on every call. */
  var BY_CODE = {};
  var BY_LOWER = {};
  var BY_NAME = {};
  var BY_GENREKEY = {};
  for (var i = 0; i < TERRITORIES.length; i++) {
    var t = TERRITORIES[i];
    if (t.code) BY_CODE[t.code] = t;
    if (t.lower) BY_LOWER[t.lower] = t;
    if (t.name) BY_NAME[t.name.toUpperCase()] = t;
    if (t.genreKey) BY_GENREKEY[String(t.genreKey).toUpperCase()] = t;
  }

  var loadedLocations = {};
  var pendingFetches = {};

  /* ---- Genre pools ------------------------------------------------
     Each generated country file registers itself here. We also keep a
     copy so getGenrePool() can answer synchronously for an
     already-loaded country, and so a page can re-read a pool after an
     await without touching window. */
  var genrePools = window.TrackHypeGenrePools || {};
  window.TrackHypeGenrePools = genrePools;

  function registerGenrePool(slug, rec) {
    if (slug && rec) genrePools[slug] = rec;
  }

  function genrePoolFor(genreKey) {
    if (!genreKey) return null;
    return genrePools[genreKey] || genrePools[String(genreKey).toLowerCase()] || null;
  }

  /* Path is derived from the registry's own genreKey, so the folder
     name always matches what the generator emitted. */
  function genrePoolPath(territory) {
    return "docs/Genres/" + territory.name + "/" + territory.genreKey + "_music_genre_directory.js";
  }

  /* Injected <script> nodes, keyed by src.
     Deliberately NOT found with a querySelector: the src contains the
     country name, and one of them is "Cote d'Ivoire". A selector built
     by concatenation ("script[data-th-genre='" + src + "']") terminates
     the quoted string at the apostrophe, leaving a syntax error, so the
     lookup threw for that country. A plain map has no escaping problem
     and also lets a failed injection be retried. */
  var injectedScripts = {};

  function loadScriptOnce(src, onOk, onErr) {
    var prior = injectedScripts[src];
    if (prior) {
      if (prior.done) { onOk(); return; }
      if (prior.failed) {
        /* Previous attempt errored. Drop it so a retry re-injects. */
        delete injectedScripts[src];
        if (prior.el && prior.el.parentNode) prior.el.parentNode.removeChild(prior.el);
      } else {
        prior.waiters.push(onOk, onErr);
        return;
      }
    }
    var entry = { el: null, done: false, failed: false, waiters: [onOk, onErr] };
    injectedScripts[src] = entry;
    var s = document.createElement("script");
    entry.el = s;
    s.setAttribute("data-th-genre", src);
    s.src = src;
    s.onload = function () {
      entry.done = true;
      s.setAttribute("data-th-done", "1");
      var w = entry.waiters;
      entry.waiters = [];
      for (var i = 0; i < w.length; i += 2) w[i]();
    };
    s.onerror = function () {
      entry.failed = true;
      var w = entry.waiters;
      entry.waiters = [];
      for (var i = 0; i < w.length; i += 2) w[i + 1](new Error("Failed to load " + src));
    };
    document.head.appendChild(s);
  }

  /* Loads the selected country's genre directory. Resolves
     { data, error } and never throws, so callers can render a
     graceful empty state. */
  function loadGenrePools(query) {
    return new Promise(function (resolve) {
      var t = findTerritory(query);
      if (!t) { resolve({ data: null, error: "Unknown country: " + query }); return; }
      if (!t.genreKey) { resolve({ data: null, error: "No genre key for " + t.name }); return; }
      var existing = genrePoolFor(t.genreKey);
      if (existing) { resolve({ data: existing, error: null }); return; }
      loadScriptOnce(
        genrePoolPath(t),
        function () {
          var rec = genrePoolFor(t.genreKey);
          if (rec) { resolve({ data: rec, error: null }); return; }
          resolve({ data: null, error: "Genre pool did not register for " + t.name });
        },
        function (err) { resolve({ data: null, error: err && err.message ? err.message : String(err) }); }
      );
    });
  }

  /* Synchronous read. Returns the merged global+regional+local list
     when the country is already loaded, otherwise []. Callers that
     need it up front should await loadGenrePools() first. */
  function getGenrePool(genreKey) {
    var rec = genrePoolFor(genreKey);
    return rec && Array.isArray(rec.all) ? rec.all.slice() : [];
  }

  /* Convenience: the structured record (global/regional/local kept
     separate), for UIs that group by tier. */
  function getGenreRecord(genreKey) {
    return genrePoolFor(genreKey);
  }

  /* ---- Locations -------------------------------------------------- */
  function makeGeojsonPath(territory) {
    return "docs/info/locations/cities-&-towns-" + territory.geojson + ".geojson";
  }

  function describeTerritory(t) {
    var cur = t.currency || {};
    return {
      code: t.code,
      name: t.name,
      lower: t.lower || (t.code ? t.code.toLowerCase() : ""),
      genreKey: t.genreKey,
      region: t.region || "",
      hasLocations: !!(t.geojson || t.source === "script"),
      currency: {
        code: cur.code || "",
        label: cur.label || "",
        /* The 12 countries with no row in world_currencies.json carry
           null equivalents; fall back to the ISO code so the UI shows
           something real rather than "null". */
        five: cur.five || cur.code || "",
        ten: cur.ten || cur.code || ""
      }
    };
  }

  function getTerritories() {
    return TERRITORIES.map(describeTerritory);
  }

  function findTerritory(query) {
    if (!query) return null;
    if (typeof query === "object") {
      return findTerritory(query.code || query.lower || query.name || query.genreKey);
    }
    var raw = String(query).trim();
    if (!raw) return null;
    var up = raw.toUpperCase();
    return (
      BY_CODE[up] ||
      BY_LOWER[raw.toLowerCase()] ||
      BY_NAME[up] ||
      BY_GENREKEY[up] ||
      null
    );
  }

  function territoryFor(query) {
    var t = findTerritory(query);
    return t ? describeTerritory(t) : null;
  }

  /* A territory the registry has no row for: a dependency or overseas
     territory (Bermuda, Puerto Rico, Hong Kong, Reunion) that the country
     picker can still offer. Described honestly so pages render the
     picker's own name with no genre data, instead of borrowing another
     country's content. */
  function unsupportedTerritory(saved) {
    var code = String((saved && saved.code) || "").toUpperCase();
    var name = (saved && saved.name) || code || "This country";
    return {
      code: code,
      name: name,
      lower: code.toLowerCase(),
      genreKey: "",
      region: "",
      hasLocations: false,
      /* No currency row: the UI must not price this selection in another
         country's currency. */
      currency: { code: "", label: "", five: "", ten: "" },
      supported: false
    };
  }

  function regionDefault() {
    if (window.TrackHype && typeof window.TrackHype.currentMode === "function" &&
        window.TrackHype.currentMode() === "demo") {
      return {
        code: "DEMO",
        name: "Browser",
        lower: "",
        genreKey: "",
        region: "",
        hasLocations: false,
        currency: { code: "", label: "", five: "", ten: "" }
      };
    }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem("trackhype.region") || "null"); } catch (e) { saved = null; }
    if (saved && saved.code) {
      var t = findTerritory(saved.code);
      /* Returning a real country's data for a DIFFERENT saved country is
         worse than returning nothing: the page header shows the selected
         name while the rails show someone else's charts. Only fall back to
         the default when nothing at all was saved. */
      if (t) return describeTerritory(t);
      return unsupportedTerritory(saved);
    }
    return territoryFor(FALLBACK_CODE) || describeTerritory(TERRITORIES[0]);
  }

  /* Same quoting hazard as loadScriptOnce, so the same fix: a map
     instead of a selector. Location srcs are SADC slugs today, but this
     is the code path a new country's location file would go through. */
  var injectedLocationScripts = {};

  function loadLegacyScript(src, onOk, onErr) {
    var prior = injectedLocationScripts[src];
    if (prior) {
      if (prior.done) { onOk(); return; }
      prior.waiters.push(onOk, onErr);
      return;
    }
    var entry = { el: null, done: false, failed: false, waiters: [onOk, onErr] };
    injectedLocationScripts[src] = entry;
    var s = document.createElement("script");
    entry.el = s;
    s.setAttribute("data-th-loc", src);
    s.src = src;
    s.onload = function () {
      entry.done = true;
      var w = entry.waiters;
      entry.waiters = [];
      for (var i = 0; i < w.length; i += 2) w[i]();
    };
    s.onerror = function () {
      entry.failed = true;
      var w = entry.waiters;
      entry.waiters = [];
      for (var i = 0; i < w.length; i += 2) w[i + 1](new Error("Failed to load " + src));
    };
    document.head.appendChild(s);
  }

  function fetchGeojson(territory, onDone) {
    var dec = describeTerritory(territory);
    if (pendingFetches[territory.code]) {
      pendingFetches[territory.code].push(onDone);
      return;
    }
    pendingFetches[territory.code] = [onDone];
    var settled = false;
    function settle(data, error) {
      if (settled) return;
      settled = true;
      var waiters = pendingFetches[territory.code] || [];
      delete pendingFetches[territory.code];
      if (data) loadedLocations[territory.code] = data;
      for (var i = 0; i < waiters.length; i++) waiters[i]({ data: data, error: error });
    }
    fetch(makeGeojsonPath(territory))
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (json) {
        var places = [];
        var regionNames = {};
        var features = json && Array.isArray(json.features) ? json.features : [];
        for (var i = 0; i < features.length; i++) {
          var p = features[i].properties || {};
          if (!p.name) continue;
          places.push({ name: p.name, region: p.region || "", country: p.country || dec.name });
          if (p.region) regionNames[p.region] = true;
        }
        settle({
          countries: dec.name,
          code: dec.code,
          places: places,
          regions: Object.keys(regionNames),
          features: features
        }, null);
      })
      .catch(function (err) {
        settle(null, err && err.message ? err.message : String(err));
      });
  }

  function loadTerritoryLocations(query, cb) {
    var done = typeof cb === "function" ? cb : function () {};
    var t = findTerritory(query);
    if (!t) {
      done({ data: null, error: "Unknown country: " + query, territories: TERRITORIES.map(describeTerritory) });
      return;
    }
    if (loadedLocations[t.code]) {
      done({ data: loadedLocations[t.code], error: null });
      return;
    }
    if (t.source === "script") {
      var existingGlobal = window[t.global];
      if (existingGlobal) {
        loadedLocations[t.code] = existingGlobal;
        done({ data: existingGlobal, error: null });
        return;
      }
      loadLegacyScript(
        t.script,
        function () {
          var data = window[t.global] || null;
          if (!data) { done({ data: null, error: "Missing global " + t.global }); return; }
          loadedLocations[t.code] = data;
          done({ data: data, error: null });
        },
        function (err) { done({ data: null, error: err && err.message ? err.message : String(err) }); }
      );
      return;
    }
    if (!t.geojson) {
      /* Expected for the 181 countries with no committed city file. */
      done({ data: null, error: "No location data for " + t.name, unsupported: true });
      return;
    }
    fetchGeojson(t, done);
  }

  var api = {
    TERRITORY_CODES: TERRITORIES.map(function (t) { return t.code; }),
    getTerritories: getTerritories,
    territoryFor: territoryFor,
    findTerritory: findTerritory,
    regionDefault: regionDefault,
    loadTerritoryLocations: loadTerritoryLocations,
    loadGenrePools: loadGenrePools,
    getGenrePool: getGenrePool,
    getGenreRecord: getGenreRecord,
    registerGenrePool: registerGenrePool
  };

  if (window.TrackHype && typeof window.TrackHype === "object") {
    for (var k in api) {
      if (Object.prototype.hasOwnProperty.call(api, k)) window.TrackHype[k] = api[k];
    }
  }
  window.TrackHypeTerritories = api;
})();
