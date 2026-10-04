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
      menu: unflattenMenu(content),
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