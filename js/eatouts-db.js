/* ============================================================
   EATOUTS DATABASE  —  schema v2 (multi-restaurant)

   One localStorage key shared by every page:
     eatouts_db_v2

   The central idea: restaurants do NOT each own a copy of their
   menu / promos / events / gallery. They point at a shared
   content template and only fork their own copy when an owner
   actually edits something.

     resolveContent(id)  ->  ownContent  ||  contentTemplates[templateId]

   Deep-copying per restaurant would be ~6 MB for 133 restaurants
   and blow the ~5 MB localStorage quota. The template approach
   holds the whole database under ~1 MB.

   Migration: a v1 blob (eatouts_db_v1) is wrapped into
   restaurants[0] on first read, so nothing already entered is lost.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'eatouts_db_v2';
  var LEGACY_KEY = 'eatouts_db_v1';
  var VERSION = 2;
  var SHARED_TEMPLATE = 'tpl_shared';

  /* Cached result of load(): the DB blob is ~1 MB JSON and callers (the
     directory list, bundleOf per row, ensureSeeded, ...) read it many times
     per render. load() parses once; save()/reset()/migration swap the cache. */
  var _loadCache = null;

  var EMPTY_SETTINGS = {
    currency: 'BWP',
    currencySymbol: 'P',
    countryCode: 'BW',
    plan: 'starter',
    whatsapp: '26771844129'
  };

  function emptyContent() {
    return {
      profile: null,
      menuCategories: [],
      menuItems: [],
      promos: [],
      events: [],
      performers: [],
      performances: [],
      galleryGroups: [],
      galleryImages: []
    };
  }

  function emptyRestaurant(id, name, slug) {
    return {
      id: id || 'rest_001',
      slug: slug || 'restaurant',
      name: name || 'Untitled restaurant',
      logo: null,
      landmark: '',
      location: { district: '', town: '', area: '' },
      types: [],
      status: 'draft',
      templateId: SHARED_TEMPLATE,
      ownContent: null,
      lastActive: Date.now(),
      contacts: [],
      socials: [],
      createdAt: Date.now()
    };
  }

  function emptyDb() {
    var db = {
      version: VERSION,
      restaurants: [],
      activeRestaurantId: null,
      contentTemplates: {},
      analytics: [],
      settings: Object.assign({}, EMPTY_SETTINGS),
      seededAt: null
    };
    db.contentTemplates[SHARED_TEMPLATE] = emptyContent();
    return db;
  }

  function clone(o) {
    return o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  }

  /* ---------- v1 -> v2 migration ---------- */

  function isV1(blob) {
    return !!blob && typeof blob === 'object' && !Array.isArray(blob.restaurants) && !!blob.restaurant;
  }

  /**
   * Wrap a single-restaurant v1 database into the v2 shape.
   * The old restaurant's own content becomes its ownContent, so
   * every edit it had is preserved verbatim.
   */
  function migrateV1(v1) {
    var db = emptyDb();
    var r = v1.restaurant || {};
    var id = r.id || 'rest_001';

    var rest = emptyRestaurant(id, (r.identity && r.identity.name) || 'Untitled restaurant', null);
    rest.slug = slugOf(rest.name, id);
    rest.status = (r.identity && r.identity.status) || 'draft';
    rest.types = (r.identity && r.identity.types) || [];
    rest.logo = (r.identity && r.identity.logo) || null;
    rest.location = {
      district: '',
      town: (r.location && r.location.city) || '',
      area: (r.location && r.location.area) || ''
    };
    rest.contacts = r.contacts || [];
    rest.socials = r.socials || [];

    /* v1 had no restaurantId on entities. Stamp them all. */
    rest.ownContent = {
      profile: v1.restaurant || null,
      menuCategories: stampAll(v1.menuCategories || [], id),
      menuItems: stampAll(v1.menuItems || [], id),
      promos: stampAll(v1.promos || [], id),
      events: stampAll(v1.events || [], id),
      performers: stampAll(v1.performers || [], id),
      performances: stampAll(v1.performances || [], id),
      galleryGroups: stampAll(v1.galleryGroups || [], id),
      galleryImages: stampAll(v1.galleryImages || [], id)
    };

    db.restaurants.push(rest);
    db.activeRestaurantId = id;
    if (v1.settings) db.settings = Object.assign({}, EMPTY_SETTINGS, v1.settings);
    db.migratedFrom = { key: LEGACY_KEY, at: Date.now() };
    return db;
  }

  function stampAll(arr, restaurantId) {
    return arr.map(function (x) {
      if (x && typeof x === 'object' && !x.restaurantId) {
        var c = Object.assign({}, x);
        c.restaurantId = restaurantId;
        return c;
      }
      return x;
    });
  }

  function slugOf(name, fallback) {
    var s = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return s || String(fallback || 'restaurant').toLowerCase();
  }

  /* ---------- read / write ---------- */

  function raw() {
    try {
      return localStorage.getItem(KEY);
    } catch (e) {
      console.warn('[EatoutsDB] localStorage unavailable', e);
      return null;
    }
  }

  function load() {
    if (_loadCache) return _loadCache;
    var parsed = null;
    var text = raw();
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        console.warn('[EatoutsDB] corrupt v2 blob, ignoring', e);
        parsed = null;
      }
    }

    if (!parsed) {
      /* Look for a v1 blob to migrate. */
      var legacyText = null;
      try {
        legacyText = localStorage.getItem(LEGACY_KEY);
      } catch (e) { /* ignore */ }
      if (legacyText) {
        try {
          var v1 = JSON.parse(legacyText);
          if (isV1(v1)) {
            var migrated = migrateV1(v1);
            save(migrated);
            _loadCache = migrated;
            return migrated;
          }
        } catch (e) {
          console.warn('[EatoutsDB] v1 migration failed', e);
        }
      }
      _loadCache = emptyDb();
      return _loadCache;
    }

    _loadCache = normalise(parsed);
    return _loadCache;
  }

  /** Fill in any missing top-level keys so callers never guard. */
  function normalise(db) {
    var base = emptyDb();
    var out = Object.assign(base, db);
    out.version = VERSION;
    out.restaurants = Array.isArray(db.restaurants) ? db.restaurants : [];
    out.analytics = Array.isArray(db.analytics) ? db.analytics : [];
    out.settings = Object.assign({}, EMPTY_SETTINGS, db.settings || {});
    out.contentTemplates = db.contentTemplates && typeof db.contentTemplates === 'object'
      ? db.contentTemplates
      : base.contentTemplates;
    if (!out.contentTemplates[SHARED_TEMPLATE]) {
      out.contentTemplates[SHARED_TEMPLATE] = emptyContent();
    }
    if (!out.activeRestaurantId && out.restaurants.length) {
      out.activeRestaurantId = out.restaurants[0].id;
    }
    out.restaurants.forEach(function (r) {
      r.location = Object.assign({ district: '', town: '', area: '' }, r.location || {});
      r.types = r.types || [];
      r.contacts = r.contacts || [];
      r.socials = r.socials || [];
      if (r.templateId == null) r.templateId = SHARED_TEMPLATE;
    });
    return out;
  }

  function save(db) {
    try {
      db.version = VERSION;
      localStorage.setItem(KEY, JSON.stringify(db));
      _loadCache = db;
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('eatouts:db-saved', { detail: db }));
      }
      return true;
    } catch (e) {
      console.error('[EatoutsDB] save failed — localStorage quota?', e);
      return false;
    }
  }

  function reset() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) { /* ignore */ }
    _loadCache = null;
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('eatouts:db-reset'));
    }
  }

  function uid(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /** Approximate stored size, for the quota check in the harness. */
  function sizeBytes() {
    var t = raw();
    return t ? t.length * 2 : 0;   /* UTF-16 code units */
  }

  function isEmpty() {
    var d = load();
    return !d.restaurants.length && !d.analytics.length;
  }

  /* ---------- restaurants ---------- */

  function listRestaurants(db) {
    return (db || load()).restaurants.slice();
  }

  function getRestaurant(id, db) {
    return listRestaurants(db).find(function (r) {
      return r.id === id;
    }) || null;
  }

  function getRestaurantBySlug(slug, db) {
    return listRestaurants(db).find(function (r) {
      return r.slug === slug;
    }) || null;
  }

  /** Newest-active first — the Restaurants tab ordering. */
  function byLastActive(db) {
    return listRestaurants(db).sort(function (a, b) {
      return (b.lastActive || 0) - (a.lastActive || 0);
    });
  }

  function addRestaurant(name, db) {
    db = db || load();
    var base = slugOf(name, 'restaurant');
    var slug = base;
    var n = 2;
    while (getRestaurantBySlug(slug, db)) {
      slug = base + '-' + n;
      n++;
    }
    var r = emptyRestaurant(uid('rest'), name, slug);
    db.restaurants.push(r);
    if (!db.activeRestaurantId) db.activeRestaurantId = r.id;
    return r;
  }

  function removeRestaurant(id, db) {
    db = db || load();
    var r = getRestaurant(id, db);
    if (!r) return false;
    /* A fork lives in r.ownContent, so there is normally nothing to
       delete here. Only a private (non-shared) template may be
       dropped — deleting tpl_shared would wipe content for every
       restaurant still sharing it. */
    if (r.templateId && r.templateId !== SHARED_TEMPLATE) {
      delete db.contentTemplates[r.templateId];
    }
    db.restaurants = db.restaurants.filter(function (x) {
      return x.id !== id;
    });
    if (db.activeRestaurantId === id) {
      db.activeRestaurantId = db.restaurants.length ? db.restaurants[0].id : null;
    }
    return true;
  }

  function setActive(id, db) {
    db = db || load();
    if (!getRestaurant(id, db)) return false;
    db.activeRestaurantId = id;
    return true;
  }

  function active(db) {
    db = db || load();
    return getRestaurant(db.activeRestaurantId, db);
  }

  /* ---------- content: the shared template + fork ---------- */

  /**
   * Read a restaurant's content WITHOUT forking.
   * Returns the shared template object when the restaurant has
   * never been edited — callers must treat the result as read-only.
   */
  function resolveContent(id, db) {
    db = db || load();
    var r = getRestaurant(id, db);
    if (!r) return null;
    if (r.ownContent) return r.ownContent;
    return db.contentTemplates[r.templateId] || db.contentTemplates[SHARED_TEMPLATE] || null;
  }

  /** True when this restaurant is still sharing the template. */
  function isSharing(id, db) {
    var r = getRestaurant(id, db);
    return !!r && !r.ownContent;
  }

  /**
   * Give a restaurant its own copy of the content.
   * Idempotent — calling twice does not re-copy, so it is safe to
   * call at the top of every dashboard save.
   */
  function forkContent(id, db) {
    db = db || load();
    var r = getRestaurant(id, db);
    if (!r) return null;
    if (r.ownContent) return r.ownContent;
    var src = db.contentTemplates[r.templateId] || db.contentTemplates[SHARED_TEMPLATE] || emptyContent();
    r.ownContent = clone(src);
    return r.ownContent;
  }

  /**
   * Give a restaurant its own copy of the SHARED template, leaving
   * other restaurants untouched. Used when seeding so the flagship
   * restaurant is independently editable from the start.
   */
  function forkFromShared(id, db) {
    db = db || load();
    var r = getRestaurant(id, db);
    if (!r) return null;
    if (r.ownContent) return r.ownContent;
    r.ownContent = clone(db.contentTemplates[SHARED_TEMPLATE] || emptyContent());
    return r.ownContent;
  }

  /** Point every restaurant back at the shared template, discarding forks. */
  function resetToShared(db) {
    db = db || load();
    db.restaurants.forEach(function (r) {
      /* Drop a private template if one was assigned. The shared
         template is never deleted — every other restaurant is
         still reading from it. */
      if (r.templateId && r.templateId !== SHARED_TEMPLATE) {
        delete db.contentTemplates[r.templateId];
      }
      r.templateId = SHARED_TEMPLATE;
      r.ownContent = null;
    });
    return db;
  }

  /* ---------- entity scoping ---------- */

  /**
   * Filter an entity array down to one restaurant.
   * Entities with no restaurantId are treated as belonging to the
   * active restaurant, which keeps freshly-seeded data visible.
   */
  function scope(arr, restaurantId, db) {
    if (!Array.isArray(arr)) return [];
    var id = restaurantId || (db || load()).activeRestaurantId;
    return arr.filter(function (x) {
      if (!x || typeof x !== 'object') return false;
      return !x.restaurantId || x.restaurantId === id;
    });
  }

  /** Stamp an entity with its owning restaurant. */
  function claim(entity, restaurantId, db) {
    var id = restaurantId || (db || load()).activeRestaurantId;
    if (entity && typeof entity === 'object') entity.restaurantId = id;
    return entity;
  }

  /* ---------- analytics ---------- */

  function track(event, entityId, meta) {
    var db = load();
    var item = {
      eventId: 'evt_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      restaurantId: db.activeRestaurantId,
      event: event,
      entityId: entityId == null ? null : entityId,
      meta: meta || null,
      timestamp: Date.now()
    };
    db.analytics.push(item);
    if (db.analytics.length > 2000) db.analytics = db.analytics.slice(-2000);
    save(db);
    return item;
  }

  function summary(days, restaurantId, db) {
    db = db || load();
    var cutoff = Date.now() - (days || 30) * 86400000;
    var events = db.analytics.filter(function (e) {
      if (e.timestamp < cutoff) return false;
      if (!restaurantId) return true;
      return e.restaurantId === restaurantId;
    });
    var counts = {};
    events.forEach(function (e) {
      counts[e.event] = (counts[e.event] || 0) + 1;
    });
    return { total: events.length, counts: counts, events: events };
  }

  /* ---------- platform stats, for the dashboard overview ---------- */

  function platformStats(db) {
    db = db || load();
    var s = {
      restaurants: db.restaurants.length,
      live: 0,
      draft: 0,
      sharingTemplate: 0,
      forked: 0,
      towns: 0,
      promos: 0,
      events: 0
    };
    var towns = {};
    db.restaurants.forEach(function (r) {
      if (r.status === 'published') s.live++; else s.draft++;
      if (r.ownContent) s.forked++; else s.sharingTemplate++;
      if (r.location && r.location.town) towns[r.location.town] = 1;
    });
    s.towns = Object.keys(towns).length;

    Object.keys(db.contentTemplates).forEach(function (k) {
      var c = db.contentTemplates[k] || {};
      s.promos += (c.promos || []).length;
      s.events += (c.events || []).length;
    });
    db.restaurants.forEach(function (r) {
      if (!r.ownContent) return;
      s.promos += (r.ownContent.promos || []).length;
      s.events += (r.ownContent.events || []).length;
    });
    return s;
  }

  window.EatoutsDB = {
    KEY: KEY,
    LEGACY_KEY: LEGACY_KEY,
    VERSION: VERSION,
    SHARED_TEMPLATE: SHARED_TEMPLATE,

    load: load,
    save: save,
    reset: reset,
    isEmpty: isEmpty,
    uid: uid,
    clone: clone,
    emptyContent: emptyContent,
    emptyDb: emptyDb,
    sizeBytes: sizeBytes,

    listRestaurants: listRestaurants,
    getRestaurant: getRestaurant,
    getRestaurantBySlug: getRestaurantBySlug,
    byLastActive: byLastActive,
    addRestaurant: addRestaurant,
    removeRestaurant: removeRestaurant,
    setActive: setActive,
    active: active,

    resolveContent: resolveContent,
    isSharing: isSharing,
    forkContent: forkContent,
    forkFromShared: forkFromShared,
    resetToShared: resetToShared,

    scope: scope,
    claim: claim,

    track: track,
    summary: summary,
    platformStats: platformStats,

    migrateV1: migrateV1,
    isV1: isV1
  };
})();