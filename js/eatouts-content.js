/* ============================================================
   EATOUTS CONTENT
   Hydrates a venue's public content from the canonical D1 record
   (GET /api/venues/:id) into the customer app's local store, so
   every existing renderer that reads through EatoutsBridge shows
   server-published content instead of the shared template.

   Dual-mode by design, like the other eatouts-* clients:
     * backend reachable + venue has published content -> the D1
       bundle is merged into EatoutsDB (ownContent) and the caller
       re-renders.
     * backend unreachable / no content -> resolve(false); the
       existing localStorage / imported-directory path is untouched.

   Conservative by contract: a restaurant that already owns locally
   authored content (an operator fork, or the flagship) is never
   clobbered. Only template-sharing rows, or rows this module has
   previously hydrated ('d1'), are written.
   ============================================================ */
(function () {
  'use strict';

  var API_BASE = '/api';
  var SOURCE = 'd1';

  function DB() { return window.EatoutsDB; }
  function Bridge() { return window.EatoutsBridge; }
  function hasFetch() { return typeof fetch === 'function'; }

  function num(v) {
    if (v == null || v === '') return 0;
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  function isoDate(ts) {
    if (ts == null || ts === '') return '';
    if (typeof ts === 'number') {
      var d = new Date(ts);
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
    }
    return String(ts).slice(0, 10);
  }

  function timeText(ts) {
    if (ts == null || typeof ts !== 'number') return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  var DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function dayNameFrom(ts) {
    if (ts == null || typeof ts !== 'number') return null;
    var d = new Date(ts);
    if (isNaN(d.getTime())) return null;
    return DAY_NAMES[d.getDay()];
  }

  /* ---------- fetch ---------- */

  function fetchVenue(idOrSlug) {
    if (!hasFetch() || !idOrSlug) return Promise.resolve({ ok: false, backend: false, data: {} });
    var url = API_BASE + '/venues/' + encodeURIComponent(idOrSlug);
    try {
      return fetch(url, { credentials: 'include' }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, ok: res.ok, backend: true, data: data || {} };
        });
      }).catch(function () {
        return { status: 0, ok: false, backend: false, data: {} };
      });
    } catch (e) {
      return Promise.resolve({ status: 0, ok: false, backend: false, data: {} });
    }
  }

  /* ---------- D1 native -> v2 flat content ---------- */

  function profileFrom(v) {
    v = v || {};
    return {
      id: v.id || null,
      slug: v.slug || null,
      name: v.name || null,
      tagline: v.description || '',
      description: v.description || '',
      town: v.town || '',
      district: v.district || '',
      districtName: v.districtName || '',
      area: v.area || '',
      landmark: v.landmark || '',
      website: v.website || '',
      logo: v.logoRef || null,
      cover: v.coverRef || null,
      types: v.types || [],
      category: v.category || null,
      contacts: v.contacts || [],
      socials: v.socials || [],
      status: v.status || null
    };
  }

  function promoFrom(x) {
    x = x || {};
    var rules = window.EatoutsPromoRules;
    var src = {
      startDate: x.startDate || isoDate(x.startsAt),
      endDate: x.endDate || isoDate(x.endsAt),
      recurring: !!x.recurring,
      days: Array.isArray(x.days) ? x.days : []
    };
    var days = rules && rules.activeWeekdays
      ? rules.activeWeekdays(src)
      : (src.days.length ? src.days.slice() : []);
    var day = x.day || days[0] || null;
    if (!day && src.startDate) {
      var t = Date.parse(src.startDate + 'T00:00:00');
      if (!isNaN(t)) day = dayNameFrom(t);
    }
    var was = num(x.originalPrice != null ? x.originalPrice : x.was);
    var price = num(x.promoPrice != null ? x.promoPrice : x.price);
    var save = x.savings != null ? num(x.savings) : (x.save != null ? num(x.save) : Math.max(0, was - price));
    return {
      id: x.id,
      day: day,
      days: days.length ? days : (day ? [day] : []),
      /* Do not invent a type: the Promos tab reads category + subtype and
         falls back to the copy when they are missing. */
      type: x.type || '',
      subtype: x.subtype || '',
      category: x.category || '',
      brand: x.brand || '',
      mechanic: x.mechanic || '',
      title: x.title || '',
      desc: x.details || x.description || x.desc || '',
      items: Array.isArray(x.items) ? x.items : [],
      was: was,
      price: price,
      save: save,
      valid: x.valid || [src.startDate, src.endDate === src.startDate ? '' : src.endDate].filter(Boolean).join(' to '),
      imageKey: x.imageKey || null,
      image: x.imageKey || null,
      /* The operator's own 18+ switch, carried so the timeline can hide
         the promo from anyone under 18. */
      ageRestricted: !!x.ageRestricted,
      audience: x.audience || (x.ageRestricted ? '18plus' : 'everyone'),
      recurring: !!x.recurring,
      startDate: src.startDate,
      endDate: src.endDate
    };
  }

  function eventFrom(x) {
    x = x || {};
    var day = x.day || dayNameFrom(x.startsAt) || 'Monday';
    return {
      id: x.id,
      day: day,
      title: x.title || 'Event',
      desc: x.description || '',
      description: x.description || '',
      time: x.time || timeText(x.startsAt),
      valid: x.valid || isoDate(x.startsAt),
      admission: x.admission != null ? x.admission : null,
      imageKey: x.imageKey || null,
      image: x.imageKey || null,
      figure: x.figure || null,
      startDate: isoDate(x.startsAt),
      endDate: isoDate(x.endsAt)
    };
  }

  function contentFrom(venue) {
    var v = venue || {};
    var c = v.content || {};
    var d = DB();
    var out = d ? d.emptyContent() : {
      profile: null, menuCategories: [], menuItems: [], promos: [], events: [],
      performers: [], performances: [], galleryGroups: [], galleryImages: []
    };

    out.profile = profileFrom(v);
    out.menuCategories = (c.menuCategories || []).map(function (x, i) {
      return {
        id: x.id, name: x.name, icon: null, note: '',
        order: x.position != null ? x.position : i, status: 'active'
      };
    });
    out.menuItems = (c.menuItems || []).map(function (x, i) {
      return {
        id: x.id,
        categoryId: x.categoryId || null,
        order: x.position != null ? x.position : i,
        name: x.name,
        description: x.description || '',
        price: x.price != null ? x.price : null,
        extras: [],
        status: x.visible === false ? 'hidden' : 'available',
        restaurantId: v.id || null,
        imageKey: x.imageKey || null
      };
    });

    out.galleryGroups = (c.galleryGroups || []).map(function (x, i) {
      return {
        id: x.id, title: x.title || '',
        visible: x.visible !== false,
        position: x.position != null ? x.position : i
      };
    });
    var titleOf = {};
    out.galleryGroups.forEach(function (g) { titleOf[g.id] = g.title; });
    out.galleryImages = (c.galleryImages || []).map(function (x, i) {
      return {
        id: x.id,
        cat: titleOf[x.groupId] || v.name || '',
        src: x.imageKey,
        label: x.label || '',
        file: x.imageKey || '',
        groupId: x.groupId || null,
        order: x.position != null ? x.position : i
      };
    });

    out.promos = (c.promos || []).map(promoFrom);
    out.events = (c.events || []).map(eventFrom);
    out.performers = [];
    out.performances = [];
    return out;
  }

  /* ---------- merge into EatoutsDB ---------- */

  function isEmptyContent(server) {
    return !(server.menuItems && server.menuItems.length) &&
      !(server.galleryImages && server.galleryImages.length) &&
      !(server.events && server.events.length) &&
      !(server.promos && server.promos.length);
  }

  /**
   * Merge one venue bundle into the local store. Returns true when the
   * local content was (re)written and the caller should re-render.
   */
  function applyVenue(venue) {
    var d = DB();
    if (!d || !venue) return false;
    var db = d.load();
    var r = (venue.id && d.getRestaurant(venue.id, db)) || (venue.slug && d.getRestaurantBySlug(venue.slug, db));
    if (!r) return false;
    var id = r.id;

    /* Never clobber locally authored content (operator fork / flagship). */
    if (r.ownContent && r.contentSource !== SOURCE) return false;

    var server = contentFrom(venue);
    if (isEmptyContent(server)) return false;

    var hasMenu = (server.menuItems || []).length > 0;
    var hasGallery = (server.galleryImages || []).length > 0;
    var hasEvents = (server.events || []).length > 0;
    var hasPromos = (server.promos || []).length > 0;

    /* When the server ships no menu, preserve whatever menu the venue
       currently resolves to (imported/directory menus included) so a
       forked row does not lose its display menu. */
    var effectiveMenu = null;
    if (!hasMenu) {
      var B = Bridge();
      try {
        var bundle = B && B.bundleOf ? B.bundleOf(id) : null;
        if (bundle && bundle.menu) effectiveMenu = B.flattenMenu(bundle.menu);
      } catch (e) { effectiveMenu = null; }
    }

    var own = d.forkContent(id, db);
    if (!own) return false;

    own.profile = server.profile;
    if (hasMenu) {
      own.menuCategories = server.menuCategories;
      own.menuItems = server.menuItems;
    } else if (effectiveMenu) {
      own.menuCategories = effectiveMenu.menuCategories;
      own.menuItems = effectiveMenu.menuItems;
    }
    if (hasGallery) own.galleryImages = server.galleryImages;
    if (hasEvents) own.events = server.events;
    if (hasPromos) own.promos = server.promos;

    r.contentSource = SOURCE;
    r.contentSyncedAt = Date.now();
    d.save(db);
    return true;
  }

  function hydrate(idOrSlug) {
    if (!DB() || !idOrSlug) return Promise.resolve(false);
    return fetchVenue(idOrSlug).then(function (res) {
      if (!res.ok || !res.data || !res.data.venue) return false;
      return applyVenue(res.data.venue);
    }).catch(function () { return false; });
  }

  function hydrateActive() {
    var B = Bridge();
    var id = B && B.activeId ? B.activeId : null;
    if (!id) return Promise.resolve(false);
    return hydrate(id);
  }

  window.EatoutsContent = {
    SOURCE: SOURCE,
    available: hasFetch,
    fetchVenue: fetchVenue,
    contentFrom: contentFrom,
    profileFrom: profileFrom,
    promoFrom: promoFrom,
    eventFrom: eventFrom,
    applyVenue: applyVenue,
    hydrate: hydrate,
    hydrateActive: hydrateActive
  };
})();
