/* ============================================================
   EATOUTS BRIDGE
   Translates between index.html's runtime shapes and the
   normalised v2 content stored in localStorage.

   index.html (nested)              v2 (flat + normalised)
   --------------------------       -------------------------
   MENU   [{id,items:[[id,name,     menuCategories [{id,name}]
            desc,price,extras]]}    menuItems      [{id,categoryId,name}]
   PROMOS {Monday:[{...}]}          promos  [{...,day}]
   EVENTS {Monday:{...}}             events  [{...,day}]
   PROFILE {...}                     profile {...}
   GALLERY [{id,cat,src,label}]     galleryImages [{id,cat,src,label}]

   The conversion is lossless in both directions, so every
   existing renderer in index.html keeps working unchanged -
   it just receives a different bundle.

   Ownership model (Bit 2 decision):
     shared template = menu + gallery + profile
     flagship (The Yellow Giraffe) additionally owns promos + events
   ============================================================ */
(function () {
  'use strict';

  var DB = window.EatoutsDB;
  var Seed = window.EatoutsSeed;
  var Brand = window.EatoutsBrand;

  var FLAGSLAG = 'rest_the-yellow-giraffe';

  var FLAGSHIP_SLUGS = ['the-yellow-giraffe', 'yellow-giraffe'];

  /* index.html hands us its globals once they are built */
  var SRC = null;
  var activeId = null;

  function setSource(src) { SRC = src; }

  /* ---------- index.html nested -> v2 flat ---------- */

  function flattenMenu(menu) {
    var cats = [], items = [];
    (menu || []).forEach(function (c, ci) {
      cats.push({
        id: c.id, name: c.name, icon: c.icon || null,
        note: c.note || '', order: ci, status: 'active'
      });
      (c.items || []).forEach(function (it, ii) {
        items.push({
          id: it[0],
          categoryId: c.id,
          order: ii,
          name: it[1],
          description: it[2] || '',
          price: it[3],
          extras: it[4] || [],
          status: 'available',
          restaurantId: null
        });
      });
    });
    return { menuCategories: cats, menuItems: items };
  }

  function unflattenMenu(content) {
    var byCat = {};
    (content.menuCategories || []).forEach(function (c) {
      byCat[c.id] = {
        id: c.id, name: c.name, icon: c.icon || '🍽',
        note: c.note || '', items: []
      };
    });
    (content.menuItems || []).forEach(function (it) {
      var c = byCat[it.categoryId];
      if (!c) { c = byCat[it.categoryId] = { id: it.categoryId, name: it.categoryId, icon: '🍽', note: '', items: [] }; }
      var variantPrice = it.variants && it.variants.length ? it.variants[0].price : null;
      c.items.push([it.id, it.name, it.description || '', it.price != null ? it.price : (variantPrice != null ? variantPrice : it.basePrice), it.extras || []]);
    });
    return Object.keys(byCat).map(function (k) { return byCat[k]; });
  }

  function flattenPromos(promos) {
    var out = [];
    for (var day in promos) {
      (promos[day] || []).forEach(function (p) {
        var row = {};
        for (var k in p) row[k] = p[k];
        row.day = day;
        row.restaurantId = null;
        out.push(row);
      });
    }
    return out;
  }

  function unflattenPromos(list) {
    var out = {};
    (list || []).forEach(function (p) {
      var row = {};
      for (var k in p) { if (k !== 'day' && k !== 'restaurantId') row[k] = p[k]; }
      if (row.desc == null) row.desc = row.description || '';
      if (row.price == null) row.price = row.promoPrice != null ? row.promoPrice : 0;
      if (row.was == null) row.was = row.originalPrice != null ? row.originalPrice : 0;
      if (row.save == null) row.save = Math.max(0, Number(row.was || 0) - Number(row.price || 0));
      if (row.valid == null) row.valid = [row.startDate, row.endDate].filter(Boolean).join(' to ');
      var day = p.day || (p.days && p.days[0]) || 'Monday';
      (out[day] = out[day] || []).push(row);
    });
    return out;
  }

  function flattenEvents(events) {
    var out = [];
    for (var day in events) {
      var e = events[day];
      if (!e) continue;
      var row = {};
      for (var k in e) row[k] = e[k];
      row.day = day;
      row.restaurantId = null;
      out.push(row);
    }
    return out;
  }

  function unflattenEvents(list) {
    var out = {};
    (list || []).forEach(function (e) {
      var row = {};
      for (var k in e) { if (k !== 'day' && k !== 'restaurantId') row[k] = e[k]; }
      out[e.day || 'Monday'] = row;
    });
    return out;
  }

  function toGalleryList(gallery) {
    return (gallery || []).map(function (g) {
      return { id: g.id, cat: g.cat, src: g.src, label: g.label, file: g.file || '' };
    });
  }

  /* ---------- seeding ---------- */

  /**
   * Build the shared template (menu + gallery + profile, NO promos/events)
   * and a flagship fork that also carries the promos and events.
   * Never clobbers an existing database - once an owner dashboard has
   * written edits, this is a no-op.
   */
  function ensureSeeded() {
    if (!DB || !Seed || !SRC) return null;

    var existing = DB.load();
    var shared = existing.contentTemplates && existing.contentTemplates[DB.SHARED_TEMPLATE];
    var hasSourceBundle = !!(shared && shared.profile && ((shared.menuItems || []).length || (shared.galleryImages || []).length));
    if (existing.seededAt && hasSourceBundle && existing.restaurants.length) {
      return { seeded: false, db: existing, count: existing.restaurants.length };
    }

    var menu = flattenMenu(SRC.menu);
    var content = DB.emptyContent();
    content.profile = SRC.profile;
    content.menuCategories = menu.menuCategories;
    content.menuItems = menu.menuItems;
    content.galleryImages = toGalleryList(SRC.gallery);
    content.performers = SRC.performers || [];

    /* promos + events live only on the flagship */
    var flagshipContent = DB.emptyContent();
    flagshipContent.profile = SRC.profile;
    flagshipContent.menuCategories = menu.menuCategories;
    flagshipContent.menuItems = menu.menuItems;
    flagshipContent.galleryImages = content.galleryImages;
    flagshipContent.performers = content.performers;
    flagshipContent.promos = flattenPromos(SRC.promos);
    flagshipContent.events = flattenEvents(SRC.events);

    var priorActiveId = existing.activeRestaurantId;
    var report = Seed.seed({ content: content, preserveExisting: existing.restaurants.length > 0 });

    /* give the flagship its promos/events */
    var d = DB.load();
    var flagship = DB.getRestaurantBySlug('the-yellow-giraffe', d);
    if (flagship) {
      DB.forkFromShared(flagship.id, d);
      var own = flagship.ownContent;
      own.promos = flagshipContent.promos;
      own.events = flagshipContent.events;
      own.performances = SRC.performances || [];
      DB.save(d);
      /* the flagship is the app's default venue */
      if (!priorActiveId) DB.setActive(flagship.id);
    }

    return {
      seeded: true,
      count: report.count,
      flagshipId: flagship ? flagship.id : FLAGSLAG
    };
  }

  /* ---------- reading ---------- */

  function db() { return DB.load(); }

  function all() {
    return DB.byLastActive(db());
  }

  function byId(id) { return DB.getRestaurant(id, db()); }

  function flagship() { return DB.getRestaurantBySlug('the-yellow-giraffe', db()); }

  /* ---------- brand grouping ---------- */

  /* Branch rows whose slug can't be derived from their name (name
     variants, dead-clear aliases). Everything else groups via the
     name slug or EatoutsBrand.canonicalKey(). */
  var BRAND_ALIAS = {
    'chicken-licken-station': 'chicken-licken',
    'chicken-licken-warehouse-lobatse': 'chicken-licken',
    'debonairs-pizza-pty-limited': 'debonairs-pizza',
    'bull-and-bush-maun': 'bull-and-bush',
    'hungry-lion-take-aways': 'hungry-lion',
    'kfc-francistown-francistown': 'kfc',
    'milky-lane-restaurant': 'milky-lane',
    'nandos-head-office': 'nandos',
    'spur-at-metcourt-hotel-francistown': 'spur',
    'silver-spur-steakhouse': 'spur',
    'diamond-creek-spur': 'spur',
    'steers-riverwalk': 'steers',
    'steers-game-city': 'steers',
    'steers-broadhurst': 'steers',
    'whistle-stop-steers-diner': 'steers',
    'denjebuya-restaurant-branch': 'denjebuya-restaurant'
  };

  /**
   * Canonical brand key for one restaurant row. Branch rows of a chain
   * all share a key, so KFC's Gaborone + Maun + Kasane rows all land on
   * 'kfc'. Derivation: explicit alias wins, then EatoutsBrand's known
   * remaps (Nando's -> nandos, ...), then the name slug (Wimpy -> wimpy
   * even when the slug is wimpy-orapa), then the slug itself.
   */
  function brandKeyOf(r) {
    if (!r) return null;
    var slug = String(r.slug || '');
    var alias = BRAND_ALIAS[slug];
    if (alias) return alias;
    var nameSlug = Brand ? (Brand.slugify ? Brand.slugify(r.name || slug) : slug) : slug;
    var canonical = Brand && typeof Brand.canonicalKey === 'function' ? Brand.canonicalKey(slug) : slug;
    if (canonical && canonical !== slug) return canonical;
    if (nameSlug && nameSlug !== slug) return nameSlug;
    return slug;
  }

  function sameTown(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  /**
   * Default branch for a group: the Gaborone branch when one exists,
   * otherwise the first branch in roster (newest-first) order.
   */
  function primaryBranch(branches) {
    var list = branches || [];
    var gaborone = [];
    for (var i = 0; i < list.length; i++) {
      if (sameTown((list[i].location && list[i].location.town) || '', 'Gaborone')) gaborone.push(list[i]);
    }
    var pool = gaborone.length ? gaborone : list;
    return pool[0] || null;
  }

  /* Static brand groups: [{ key, branches:[records] }], in newest-first
     roster order. The customer app composes a display row per group; the
     owner pages keep the raw branch-level listing(). */
  function groups() {
    var d = db();
    var rows = DB.byLastActive(d);
    var byKey = {};
    var order = [];
    rows.forEach(function (r) {
      var k = brandKeyOf(r);
      if (!(k in byKey)) { byKey[k] = []; order.push(k); }
      byKey[k].push(r);
    });
    return order.map(function (k) {
      return { key: k, branches: byKey[k] };
    });
  }

  /* Display name for a group: the branch that owns the brand slug when
     present (Spur), else the first branch's name. */
  function groupName(g) {
    var branches = g && g.branches ? g.branches : [];
    var key = g && (g.key || g.brandKey);
    for (var i = 0; i < branches.length; i++) {
      if (branches[i].slug === key) return branches[i].name;
    }
    return branches.length ? branches[0].name : key;
  }

  /** Display record for the Restaurants list. */
  function listing() {
    var d = db();
    return DB.byLastActive(d).map(function (r) {
      return {
        id: r.id,
        name: r.name,
        slug: r.slug,
        types: r.types && r.types.length ? r.types : ['Restaurant'],
        category: (r.types && r.types.length ? r.types : ['Restaurant']).join(' · '),
        location: r.location || {},
        placeLabel: placeLabel(r),
        landmark: r.landmark || '',
        logo: r.logo || null,
        socials: r.socials || [],
        status: r.status,
        lastActive: r.lastActive,
        isFlagship: r.slug === 'the-yellow-giraffe',
        thumbHtml: Brand ? Brand.thumbHtml(r, { size: 56 }) : ''
      };
    });
  }

  /**
   * Display records for the denduplicated Restaurants list: one row per
   * brand group, with the branch array attached so the app can filter,
   * count, and swap the active branch without more DB reads.
   */
  function groupedListing() {
    return groups().map(function (g) {
      var primary = primaryBranch(g.branches);
      var name = groupName(g);
      var primaryTypes = primary && primary.types && primary.types.length ? primary.types : ['Restaurant'];
      return {
        id: g.key,
        name: name,
        slug: g.key,
        types: primaryTypes,
        category: primaryTypes.join(' · '),
        location: primary ? (primary.location || {}) : {},
        placeLabel: placeLabel(primary || {}),
        landmark: primary ? (primary.landmark || '') : '',
        logo: primary ? (primary.logo || null) : null,
        socials: (primary && primary.socials) || [],
        status: primary ? primary.status : 'published',
        lastActive: primary ? primary.lastActive : 0,
        isFlagship: g.key === 'the-yellow-giraffe',
        thumbHtml: primary ? (Brand ? Brand.thumbHtml(primary, { size: 56 }) : '') : '',
        key: g.key,
        brandKey: g.key,
        branches: g.branches,
        locationCount: g.branches.length,
        branchNames: g.branches.map(function (b) { return b.name; }),
        branchLabels: g.branches.map(function (b) { return placeLabel(b); })
      };
    });
  }

  /** "Gaborone · Kgale View" or "Gaborone · Acacia Mall" */
  function placeLabel(r) {
    var loc = r.location || {};
    var bits = [];
    if (loc.town) bits.push(loc.town);
    if (loc.area) bits.push(loc.area);
    if (!bits.length && r.landmark) bits.push(r.landmark);
    return bits.join(' · ');
  }

  /**
   * Menu to show for a restaurant bundle.
   *
   * A restaurant that OWNS its content keeps exactly what the owner wrote -
   * imported menus never replace it.
   *
   * A restaurant still SHARING the template conditionally shows one of:
   *   1. its specific imported menu (KFC, Nando's, ...) by canonical slug
   *   2. the demo menu (restaurants with no uploaded menu yet)
   * The Yellow Giraffe itself always keeps index.html's own menu, which is
   * the same shared template - so it never shows the demo/imported menus.
   * Falling back to the shared template keeps this safe even when the
   * directory has not loaded yet.
   */
  function menuFor(content, r, sharing) {
    if (!r || !sharing || FLAGSHIP_SLUGS.indexOf(r.slug) > -1) {
      return unflattenMenu(content);
    }
    var M = window.EatoutsMenus;
    if (M) {
      var key = brandKeyOf(r);
      var town = (r.location && r.location.town) || '';
      var townKey = town && Brand ? Brand.slugify(town) : '';
      /* A location-specific menu (menus_data/{brand}-{town}.json) wins
         when one exists; otherwise every branch of the chain shares the
         brand menu (kfc-maun -> kfc), else the demo, else the template. */
      var menus = M.menus;
      var override = townKey && menus ? menus[key + '-' + townKey] : null;
      if (override && override.length) return override;
      var imported = menus ? menus[key] : null;
      if (imported && imported.length) return imported;
      if (M.demo && M.demo.length) return M.demo;
    }
    return unflattenMenu(content);
  }

  /**
   * The nested bundle for one restaurant, in the exact shapes
   * index.html's existing renderers expect.
   */
  function bundleOf(id) {
    var r = byId(id);
    if (!r) return null;
    var content = DB.resolveContent(id, db()) || DB.emptyContent();
    return {
      restaurant: r,
      id: r.id,
      name: r.name,
      isSharing: DB.isSharing(id, db()),
      menu: menuFor(content, r, DB.isSharing(id, db())),
      promos: unflattenPromos(content.promos),
      events: unflattenEvents(content.events),
      profile: content.profile || null,
      gallery: content.galleryImages || [],
      performers: content.performers || []
    };
  }

  /** Bundle for whatever restaurant the user is currently viewing. */
  function activeBundle() {
    if (!activeId) return null;
    return bundleOf(activeId);
  }

  function setActive(id) {
    activeId = id || null;
    if (id) {
      var d = DB.load();
      if (DB.setActive(id, d)) DB.save(d);
    }
  }

  function activeId_() { return activeId; }

  /** The fallback bundle built from index.html's own globals (TYG). */
  function sourceBundle() {
    if (!SRC) return null;
    return {
      restaurant: null,
      id: FLAGSLAG,
      name: (SRC.profile && SRC.profile.name) || 'The Yellow Giraffe',
      isSharing: false,
      menu: SRC.menu || [],
      promos: SRC.promos || {},
      events: SRC.events || {},
      profile: SRC.profile || null,
      gallery: SRC.gallery || [],
      performers: SRC.performers || []
    };
  }

  /* ---------- cross-restaurant promo lookups ---------- */

  /** Every restaurant that actually owns promos or events. */
  function promoOwners() {
    return all().filter(function (r) {
      var c = DB.resolveContent(r.id, db());
      return !!c && ((c.promos && c.promos.length) || (c.events && c.events.length));
    });
  }

  /** Promo towns available in the filter bar. */
  function promoTowns() {
    var set = {};
    promoOwners().forEach(function (r) {
      var t = (r.location && r.location.town) || 'Gaborone';
      set[t] = 1;
    });
    return Object.keys(set).sort();
  }

  /** Distinct promo types available in the filter bar. */
  function promoTypes() {
    var set = {};
    promoOwners().forEach(function (r) {
      var c = DB.resolveContent(r.id, db());
      (c.promos || []).forEach(function (p) { if (p.type) set[p.type] = 1; });
    });
    return Object.keys(set).sort();
  }

  function samePlaceValue(a, b) {
    return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
  }

  function locationMatches(r, location) {
    location = location || {};
    var loc = r.location || {};
    if (location.town && location.town !== 'All' && !samePlaceValue(loc.town || 'Gaborone', location.town)) return false;
    if (location.district) {
      var district = loc.district || loc.districtCode || '';
      if (district && !samePlaceValue(district, location.district) && !samePlaceValue(loc.districtName, location.districtName)) return false;
    }
    if (location.area && location.area !== 'All' && !samePlaceValue(loc.area, location.area)) return false;
    return true;
  }

  function restaurantCountAt(location) {
    return all().filter(function (r) { return locationMatches(r, location); }).length;
  }

  /** Find a promo by id across every restaurant. */
  function findPromoAnywhere(id) {
    for (var i = 0; i < promoOwners().length; i++) {
      var r = promoOwners()[i];
      var c = DB.resolveContent(r.id, db());
      var hit = (c.promos || []).find(function (p) { return p.id === id; });
      if (hit) return { promo: unflattenPromos([hit])[hit.day || (hit.days && hit.days[0]) || 'Monday'][0], day: hit.day || (hit.days && hit.days[0]), restaurant: r };
    }
    return null;
  }

  function findEventAnywhere(evId) {
    var owners = promoOwners();
    for (var i = 0; i < owners.length; i++) {
      var r = owners[i];
      var c = DB.resolveContent(r.id, db());
      var hit = (c.events || []).find(function (e) { return e.id === evId; });
      if (hit) return { event: hit, day: hit.day, restaurant: r };
    }
    return null;
  }

  /* Top-level `const DAY_NAMES` in index.html is not a window property,
     so the weekday list is mirrored here. Kept in sync by setDayNames(). */
  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function setDayNames(list) {
    if (list && list.length === 7) DAY_NAMES = list.slice();
  }
  function dayName(idx) {
    var d = DAY_NAMES[idx];
    return typeof d === 'string' ? d : null;
  }

  /** Promos for a weekday index, honouring the town + type filters. */
  function promosForDay(dayIdx, townFilter, typeFilter, areaFilter, districtFilter, districtName) {
    var want = dayName(dayIdx);
    var out = [];
    promoOwners().forEach(function (r) {
      if (!locationMatches(r, { town: townFilter, district: districtFilter, districtName: districtName, area: areaFilter })) return;
      var c = DB.resolveContent(r.id, db());
      (c.promos || []).forEach(function (p) {
        var promoDays = p.days && p.days.length ? p.days : [p.day];
        if (want && promoDays.indexOf(want) === -1) return;
        if (typeFilter && typeFilter !== 'All') {
          if ((p.type || '').toLowerCase().indexOf(typeFilter.toLowerCase()) === -1) return;
        }
        var displayPromo = unflattenPromos([p])[p.day || (p.days && p.days[0]) || 'Monday'][0];
        out.push({ promo: displayPromo, day: want || p.day || (p.days && p.days[0]), restaurant: r });
      });
    });
    return out;
  }

  function eventsForDay(dayIdx, townFilter, areaFilter, districtFilter, districtName) {
    var want = dayName(dayIdx);
    var out = [];
    promoOwners().forEach(function (r) {
      if (!locationMatches(r, { town: townFilter, district: districtFilter, districtName: districtName, area: areaFilter })) return;
      var c = DB.resolveContent(r.id, db());
      (c.events || []).forEach(function (e) {
        var eventDays = e.recurrence && e.recurrence.length ? e.recurrence : [e.day || (e.startDate ? new Date(e.startDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }) : null)];
        if (want && eventDays.indexOf(want) === -1) return;
        var displayEvent = Object.assign({}, e, {
          title: e.title || e.name || 'Event',
          time: e.time || e.startTime || '',
          valid: e.valid || e.startDate || ''
        });
        out.push({ event: displayEvent, day: want || e.day || eventDays[0], restaurant: r });
      });
    });
    return out;
  }

  window.EatoutsBridge = {
    FLAGSLAG: FLAGSLAG,
    setSource: setSource,
    ensureSeeded: ensureSeeded,
    setDayNames: setDayNames,
    dayName: dayName,
    all: all,
    byId: byId,
    flagship: flagship,
    listing: listing,
    brandKeyOf: brandKeyOf,
    groups: groups,
    primaryBranch: primaryBranch,
    groupName: groupName,
    groupedListing: groupedListing,
    bundleOf: bundleOf,
    activeBundle: activeBundle,
    sourceBundle: sourceBundle,
    setActive: setActive,
    get activeId() { return activeId_; },
    placeLabel: placeLabel,
    promoOwners: promoOwners,
    promoTowns: promoTowns,
    promoTypes: promoTypes,
    restaurantCountAt: restaurantCountAt,
    findPromoAnywhere: findPromoAnywhere,
    findEventAnywhere: findEventAnywhere,
    promosForDay: promosForDay,
    eventsForDay: eventsForDay,
    flattenMenu: flattenMenu,
    unflattenMenu: unflattenMenu,
    flattenPromos: flattenPromos,
    unflattenPromos: unflattenPromos,
    flattenEvents: flattenEvents,
    unflattenEvents: unflattenEvents
  };
})();