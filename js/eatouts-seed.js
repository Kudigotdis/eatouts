/* ============================================================
   EATOUTS SEED
   Builds the demo restaurant roster from the generated row table
   in eatouts-seed-data.js.

   Content is NOT duplicated per restaurant. Every seeded
   restaurant points at the shared template
   (EatoutsDB.SHARED_TEMPLATE) so the whole database stays small.
   An owner dashboard forks a restaurant's content on first edit.
   ============================================================ */
(function () {
  'use strict';

  var ROWS = (typeof window !== 'undefined' && window.EATOUTS_SEED_RESTAURANTS) || [];

  /** Generated rows are { n, c, t, a, m }. Normalise once to
      [ name, districtCode, town, area, landmark ] so every consumer
      below reads positionally. */
  ROWS = ROWS.map(function (r) {
    return Array.isArray(r) ? r : [r.n, r.c, r.t, r.a, r.m];
  });

  /* Cuisine hints derived from the brand name. This is a display
     category only — never a claim about what the kitchen serves. */
  var TYPE_RULES = [
    [/pizza|pizzer|panorottis|roman's|cappellos|barcelos|debonairs|domino/i, 'Pizzeria'],
    [/burger|steers|spur|wimpy|fego|astro|boerewors/i, 'Burger Bar'],
    [/coffee|caffe|cafe\b|cafe'|kaaui|blue tree|life|carlito|doppio|cafe mfk|blue tree|fine thirty/i, 'Café'],
    [/grill|rib room|boma|braai|kebabish|steakhouse|bar and grill|bar & grill/i, 'Grill'],
    [/pub|tavern|bar\b/i, 'Pub & Bar'],
    [/bakery|bakery|deli|patio cafe/i, 'Bakery & Deli'],
    [/chinese|china restaurant|beijing|china\b/i, 'Chinese'],
    [/curry|indian|tandoor|ashoka|nyamakhaya|habesha|ethiopian/i, 'Indian & Curry'],
    [/brazil|rodizio|churrasc/i, 'Brazilian'],
    [/ice cream|polari/i, 'Ice Cream'],
    [/lounge|jara|jarateng|living/i, 'Lounge'],
    [/sushi|japan/i, 'Japanese'],
    [/chinese|wok|noodle/i, 'Chinese'],
    [/kfc|steers|chicken|kfc/i, 'Fast Food'],
    [/tai pan|mo'?s|king'?s takeaway|takeaway|badri/i, 'Takeaway'],
    [/health generation/i, 'Health & Wellness']
  ];

  function typesFor(name) {
    var n = String(name || '');
    var out = [];
    TYPE_RULES.forEach(function (rule) {
      if (rule[0].test(n) && out.indexOf(rule[1]) === -1) out.push(rule[1]);
    });
    return out.length ? out : ['Restaurant'];
  }

  /* hash() and slugify() are owned by eatouts-brand.js so a slug
     generated here is always identical to the one a card renders. */
  function hash(s) { return window.EatoutsBrand.hash(s); }
  function slugify(name) { return window.EatoutsBrand.slugify(name); }

  /** District code -> display name, from the gazetteer when available. */
  function districtName(code) {
    var L = window.EatoutsLocations;
    if (!L) return code;
    var d = L.allDistricts().find(function (x) {
      return x.code === String(code);
    });
    return d ? d.name : code;
  }

  /**
   * Build one restaurant record from a seed row.
   * Row shape: [ name, districtCode, town, area, landmark ]
   */
  function toRestaurant(row, index, now) {
    var source = Array.isArray(row) ? {
      name: row[0], district: row[1], town: row[2], area: row[3], landmark: row[4]
    } : (row || {});
    var name = source.name || source.n || 'Untitled restaurant';
    var code = source.district || source.c || '';
    var town = source.town || source.t || '';
    var area = source.area || source.a || (source.areas && source.areas[0]) || '';
    var landmark = source.landmark || source.m || '';

    var slug = source.slug || slugify(name);

    /* Stagger activity so "newest first" is meaningful and stable.
       Row order is preserved as the newest-first ordering. */
    var ageMinutes = hash(slug) % 43200;         /* up to 30 days */
    var lastActive = now - ageMinutes * 60000;

    return {
      id: source.id || 'rest_' + slug,
      slug: slug,
      name: name,
      logo: (window.EatoutsBrand && window.EatoutsBrand.logoFor({ slug: slug, name: name, logo: source.logo || null })) || null,
      landmark: landmark || '',
      location: {
        district: code || '',
        districtName: source.districtName || districtName(code),
        town: town || '',
        area: area || ''
      },
      types: Array.isArray(source.types) && source.types.length ? source.types.slice() : typesFor(name),
      directory: {
        areas: source.areas || [],
        addresses: source.addresses || [],
        contacts: source.contacts || [],
        socials: source.socials || [],
        description: source.description || '',
        website: source.website || '',
        sources: source.sources || []
      },
      status: 'published',
      templateId: (window.EatoutsDB && window.EatoutsDB.SHARED_TEMPLATE) || 'tpl_shared',
      ownContent: null,
      lastActive: lastActive,
      contacts: [],
      socials: [],
      createdAt: lastActive
    };
  }

  function mergeDirectory(payload) {
    var DB = window.EatoutsDB;
    if (!DB) return { added: 0, enriched: 0 };
    var db = DB.load();
    var added = 0;
    var enriched = 0;
    var now = Date.now();
    var incomingRows = payload && Array.isArray(payload.restaurants) ? payload.restaurants : [];
    var byId = {};
    db.restaurants.forEach(function (restaurant) { byId[restaurant.id] = restaurant; });

    function mergeList(target, source) {
      var changed = false;
      (source || []).forEach(function (value) {
        var key = JSON.stringify(value);
        if (!target.some(function (item) { return JSON.stringify(item) === key; })) {
          target.push(value); changed = true;
        }
      });
      return changed;
    }

    incomingRows.forEach(function (row, index) {
      var incoming = toRestaurant(row, index, now);
      var existing = byId[incoming.id];
      if (!existing) {
        db.restaurants.push(incoming);
        byId[incoming.id] = incoming;
        added++;
        return;
      }

      var changed = false;
      ['district', 'districtName', 'town', 'area'].forEach(function (field) {
        if (!existing.location[field] && incoming.location[field]) {
          existing.location[field] = incoming.location[field]; changed = true;
        }
      });
      if ((!existing.logo || existing.logo === 'assets/logo/logo_placement_image.png') && incoming.logo && incoming.logo !== 'assets/logo/logo_placement_image.png') {
        existing.logo = incoming.logo; changed = true;
      }
      if ((!existing.types || !existing.types.length) && incoming.types.length) {
        existing.types = incoming.types.slice(); changed = true;
      }
      if (!existing.landmark && incoming.landmark) { existing.landmark = incoming.landmark; changed = true; }

      existing.directory = existing.directory || { areas: [], addresses: [], contacts: [], socials: [], description: '', website: '', sources: [] };
      var directory = existing.directory;
      ['areas', 'addresses', 'contacts', 'socials', 'sources'].forEach(function (field) {
        directory[field] = directory[field] || [];
        if (mergeList(directory[field], incoming.directory[field])) changed = true;
      });
      ['description', 'website'].forEach(function (field) {
        if (!directory[field] && incoming.directory[field]) { directory[field] = incoming.directory[field]; changed = true; }
      });
      if (changed) enriched++;
    });

    if (added || enriched) DB.save(db);
    return { added: added, enriched: enriched };
  }

  /**
   * Write the roster into the database.
   *
   * @param {object} opts
   *   content  - optional shared content bundle (profile, menuItems,
   *              promos, events, galleryGroups…). Omit to seed an
   *              empty template; the customer app supplies the real
   *              Yellow Giraffe bundle when it boots.
   *   forkIds  - restaurant ids that should own their content copy
   *              immediately (e.g. the flagship).
   *   preserveExisting - keep restaurants already in the DB
   * @returns {object} report
   */
  /**
   * The demo owner account for The Yellow Giraffe.
   *
   * Credentials are 0 / 0 on purpose - this is still a demo, and
   * the login screen shows them. Password is stored as a salted
   * SHA-256 hash, never as plaintext. Re-seeding never duplicates
   * the account or resets an edited password.
   *
   * Needs crypto.subtle, so it only works over https:// or
   * http://127.0.0.1. On file:// it is skipped, not faked.
   */
  function seedDemoOwner(db) {
    var DB = window.EatoutsDB;
    var AUTH = window.EatoutsAuth;
    if (!DB || !AUTH) return Promise.resolve({ seeded: false, reason: 'prereqs' });

    /* The demo account belongs to The Yellow Giraffe specifically, because
       that is the slug EatoutsAuth.loginDemo() resolves. It is NOT
       roster[0]: row order is the seeded roster order, and row 0 is
       whatever restaurant the roster happens to start with. */
    var flagship = DB.getRestaurantBySlug(AUTH.FLAGSHIP_SLUG, db);
    if (!flagship) return Promise.resolve({ seeded: false, reason: 'no-flagship' });
    if (!AUTH.secureContextAvailable()) {
      console.warn('[EatoutsSeed] demo owner skipped - needs a secure context (start run-eatouts.bat)');
      return Promise.resolve({ seeded: false, reason: 'insecure-context' });
    }

    /* Fork FIRST. resolveContent() hands back the SHARED template
       when a venue has no ownContent, and pushing the owner onto
       that would leak the demo account into every other
       restaurant. */
    if (DB.isSharing(flagship.id, db)) DB.forkFromShared(flagship.id, db);

    var content = DB.resolveContent(flagship.id, db) || DB.emptyContent();
    content.profile = content.profile || {};
    var users = Array.isArray(content.profile.users) ? content.profile.users : [];
    content.profile.users = users;

    var existing = users.filter(function (u) { return u && u.demoOwner === true; })[0];

    function commit(result) {
      DB.save(db);
      result.restaurantId = flagship.id;
      result.restaurantName = flagship.name;
      return result;
    }

    if (existing) {
      /* repair only what is missing; never reset an edited password */
      if (existing.salt && existing.passwordHash && existing.whatsapp === '0') {
        return Promise.resolve(commit({ seeded: false, reason: 'already-present' }));
      }
      existing.whatsapp = '0';
      var keep = existing.salt || (existing.salt = AUTH.randomSalt());
      return AUTH.hashPassword('0', keep)
        .then(function (h) { existing.passwordHash = h; return commit({ seeded: true, repaired: true }); })
        .catch(function (e) {
          console.warn('[EatoutsSeed] demo owner hash failed', e);
          return { seeded: false, reason: 'hash-failed' };
        });
    }

    var salt = AUTH.randomSalt();
    return AUTH.hashPassword('0', salt).then(function (hash) {
      users.push({
        id: DB.uid('user'),
        name: 'Owner',
        email: 'owner@yellowgiraffe.bw',
        role: 'Owner',
        whatsapp: '0',
        salt: salt,
        passwordHash: hash,
        demoOwner: true
      });
      return commit({ seeded: true });
    }).catch(function (e) {
      console.warn('[EatoutsSeed] demo owner hash failed', e);
      return { seeded: false, reason: 'hash-failed' };
    });
  }

  function seed(opts) {
    opts = opts || {};
    var DB = window.EatoutsDB;
    if (!DB) throw new Error('EatoutsDB must load before EatoutsSeed');

    var now = Date.now();
    var db = opts.preserveExisting ? DB.load() : DB.emptyDb();
    var previousActiveId = db.activeRestaurantId;

    /* Shared content template — one copy, referenced by everyone. */
    if (opts.content) {
      var tpl = db.contentTemplates[DB.SHARED_TEMPLATE] || DB.emptyContent();
      Object.keys(opts.content).forEach(function (k) {
        tpl[k] = opts.content[k];
      });
      db.contentTemplates[DB.SHARED_TEMPLATE] = tpl;
    }

    var roster = ROWS.map(function (row, i) {
      return toRestaurant(row, i, now);
    });

    /* Keep custom restaurants and existing owner-edited roster entries. */
    var existingById = {};
    if (opts.preserveExisting) {
      db.restaurants.forEach(function (r) { existingById[r.id] = r; });
    }
    var keep = [];
    Object.keys(existingById).forEach(function (id) {
      if (!roster.some(function (r) { return r.id === id; })) keep.push(existingById[id]);
    });
    var mergedRoster = roster.map(function (r) {
      var existing = existingById[r.id];
      return existing && existing.ownContent ? existing : r;
    });
    db.restaurants = keep.concat(mergedRoster);

    /* Optionally fork specific restaurants off the shared template. */
    (opts.forkIds || []).forEach(function (id) {
      DB.forkFromShared(id, db);
    });

    var flagship = roster[0];
    var activeStillExists = db.restaurants.some(function (r) { return r.id === previousActiveId; });
    db.activeRestaurantId = activeStillExists ? previousActiveId : ((flagship && flagship.id) || (db.restaurants[0] && db.restaurants[0].id) || null);
    db.seededAt = now;
    db.settings.whatsapp = '26771844129';

    var ok = DB.save(db);

    var report = {
      ok: ok,
      count: db.restaurants.length,
      rows: ROWS.length,
      activeId: db.activeRestaurantId,
      sizeBytes: DB.sizeBytes(),
      roster: roster,
      /* resolves to {seeded:bool, reason?:string} - hashed, so async */
      demoOwner: seedDemoOwner(db)
    };

    if (report.demoOwner && typeof report.demoOwner.then === 'function') {
      report.demoOwner.catch(function () { /* already logged */ });
    }
    return report;
  }

  /** Summary of what the roster looks like, for the harness. */
  function rosterStats() {
    var byTown = {};
    var byType = {};
    var withArea = 0;
    var withLandmark = 0;

    ROWS.forEach(function (row) {
      var t = row[2] || '(none)';
      byTown[t] = (byTown[t] || 0) + 1;
      if (row[3]) withArea++;
      if (row[4]) withLandmark++;
      typesFor(row[0]).forEach(function (ty) {
        byType[ty] = (byType[ty] || 0) + 1;
      });
    });

    return {
      rows: ROWS.length,
      withArea: withArea,
      withLandmark: withLandmark,
      byTown: byTown,
      byType: byType
    };
  }

  /** Validate every seeded row against the gazetteer. Returns problems[]. */
  function validateLocations() {
    var L = window.EatoutsLocations;
    var problems = [];
    if (!L) return [{ msg: 'EatoutsLocations not loaded' }];

    ROWS.forEach(function (row) {
      var name = row[0];
      var r = L.resolve(row[1], row[2], row[3]);
      (r.warnings || []).forEach(function (w) {
        problems.push({ name: name, msg: w });
      });
      if (!r.town) problems.push({ name: name, msg: 'town did not resolve' });
    });
    return problems;
  }

  window.EatoutsSeed = {
    ROWS: ROWS,
    seed: seed,
    mergeDirectory: mergeDirectory,
    rosterStats: rosterStats,
    validateLocations: validateLocations,
    toRestaurant: toRestaurant,
    typesFor: typesFor,
    slugify: slugify
  };
})();