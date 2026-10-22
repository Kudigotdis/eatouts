/* ============================================================
   EATOUTS AUTH
   Operator sign-in for restaurant owners.

   Credentials live on the existing restaurant.users[] records
   (see js/eatouts-owner-compat.js) - no new top-level DB key,
   so emptyDb() and the v1 -> v2 migration are untouched.

   Passwords are stored as SHA-256(salt + password). The salt is
   16 random bytes per user, so two users with the same password
   get different hashes and the seed cannot be reused elsewhere.

   REQUIRES A SECURE CONTEXT. crypto.subtle only exists on
   https:// or http://127.0.0.1 - which is exactly why
   run-eatouts.bat serves the app instead of opening it off disk.
   On file:// every login below fails closed with a clear message
   rather than silently accepting anything.

   THIS IS A FRONT DOOR, NOT SECURITY. Everything is client-side
   localStorage: anyone can bypass it by writing the session key
   from devtools. Real protection needs a server.
   ============================================================ */
(function () {
  'use strict';

  var SESSION_KEY = 'eatouts_session_v1';
  var FLAGSHIP_SLUG = 'the-yellow-giraffe';

  /* ---------- helpers ---------- */

  function subtle() {
    var c = (typeof globalThis !== 'undefined' && globalThis.crypto) || null;
    return c && c.subtle ? c.subtle : null;
  }

  function secureContextAvailable() {
    return !!subtle();
  }

  /** subtle.digest() resolves to an ArrayBuffer, which has no .length. */
  function toHex(buffer) {
    var bytes = (buffer instanceof Uint8Array) ? buffer : new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += (bytes[i] + 0x100).toString(16).slice(1);
    }
    return out;
  }

  function randomSalt() {
    var buf = new Uint8Array(16);
    if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(buf);
    } else {
      /* not expected on any real browser; keeps Node harnesses alive */
      for (var i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    }
    return toHex(buf);
  }

  function utf8Bytes(str) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(str);
    var enc = unescape(encodeURIComponent(str));   /* legacy fallback */
    var out = new Uint8Array(enc.length);
    for (var i = 0; i < enc.length; i++) out[i] = enc.charCodeAt(i);
    return out;
  }

  function hashHex(text) {
    var s = subtle();
    if (!s) return Promise.reject(new Error('no-subtle'));
    return s.digest('SHA-256', utf8Bytes(text)).then(toHex);
  }

  /* separator between salt and password in the hashed string */
  var SEP = '|';

  function hashPassword(password, salt) {
    return hashHex(salt + SEP + String(password));
  }

  /** Length-independent, content-constant-time-ish compare. */
  function safeEqual(a, b) {
    var x = String(a == null ? '' : a);
    var y = String(b == null ? '' : b);
    if (x.length !== y.length) return false;
    var diff = 0;
    for (var i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
    return diff === 0;
  }

  /**
   * "+267 71 844 129", "26771844129" and "0026771844129" all
   * normalise to "26771844129".
   */
  function normaliseWhatsapp(raw) {
    var digits = String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
    if (digits.indexOf('00') === 0) digits = digits.slice(2);
    return digits;
  }

  /**
   * The seeded demo account uses "0". Treat blank and "0" as
   * "no real number" so the demo credential can never match a
   * different account by accident.
   */
  function isRealNumber(norm) {
    if (!norm) return false;
    if (/^0+$/.test(norm)) return false;
    return norm.length >= 6;
  }

  /* ---------- session ---------- */

  function currentSession() {
    try {
      var raw = globalThis.localStorage ? localStorage.getItem(SESSION_KEY) : null;
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.restaurantId) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function saveSession(session) {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      try {
        if (session && session.userId) {
          localStorage.setItem(AUTH_SESSION_KEY, String(session.userId));
        }
      } catch (e2) { /* ignore */ }
      if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
        globalThis.dispatchEvent(new CustomEvent('eatouts:auth', { detail: session }));
      }
      return true;
    } catch (e) {
      console.warn('[EatoutsAuth] could not persist session', e);
      return false;
    }
  }

  function clearAllSessions() {
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(AUTH_SESSION_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(MGR_SESSION_KEY); } catch (e) { /* ignore */ }
    try { localStorage.removeItem(MGR_BUSINESS_KEY); } catch (e) { /* ignore */ }
  }

  function logout() {
    clearAllSessions();
    if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
      globalThis.dispatchEvent(new CustomEvent('eatouts:auth', { detail: null }));
    }
  }

  /**
   * True when the session is not pinned to one restaurant -
   * i.e. Demo mode, where browsing every venue is intended.
   */
  function isUnlocked() {
    var s = currentSession();
    return !!(s && s.demo);
  }

  /**
   * Gate for the operator pages. Returns true when a session
   * exists; the caller is responsible for redirecting otherwise.
   */
  function requireSession() {
    return !!currentSession();
  }

  /* One sign-in surface: eatouts-login.html. The page we came from is
     passed along as ?next= so the user lands back where they started. */
  function redirectToLogin() {
    if (typeof location !== 'undefined') {
      var next = '';
      try {
        next = location.pathname + (location.search || '');
        if (next.charAt(0) !== '/') next = '/' + next;
      } catch (e) { next = ''; }
      location.replace('eatouts-login.html' + (next ? '?next=' + encodeURIComponent(next) : ''));
    }
  }

  /* ---------- credential lookup ---------- */

  function db() {
    return globalThis.EatoutsDB ? EatoutsDB.load() : null;
  }

  function contentFor(d, restaurantId) {
    if (globalThis.EatoutsDB && typeof EatoutsDB.resolveContent === 'function') {
      return EatoutsDB.resolveContent(restaurantId, d) || EatoutsDB.emptyContent();
    }
    return (globalThis.EatoutsDB && EatoutsDB.emptyContent) ? EatoutsDB.emptyContent() : {};
  }

  /** users[] lives on the content profile, not on the restaurant record. */
  function usersFor(d, restaurantId) {
    var content = contentFor(d, restaurantId);
    var profile = content.profile || {};
    return Array.isArray(profile.users) ? profile.users : [];
  }

  function findFlagship(d) {
    if (globalThis.EatoutsDB && typeof EatoutsDB.getRestaurantBySlug === 'function') {
      return EatoutsDB.getRestaurantBySlug(FLAGSHIP_SLUG, d);
    }
    var list = (d && d.restaurants) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].slug === FLAGSHIP_SLUG) return list[i];
    }
    return null;
  }

  /* ---------- public API ---------- */

  /**
   * Operator sign-in. All three identifiers are required: username,
   * WhatsApp number and password.
   *
   * @returns {Promise<{ok:true, session:object}|{ok:false, reason:string}>}
   */
  function login(whatsapp, password, username) {
    var norm = normaliseWhatsapp(whatsapp);
    var uname = String(username == null ? '' : username).trim().toLowerCase();

    if (!secureContextAvailable()) {
      return Promise.resolve({
        ok: false,
        reason: 'unavailable',
        message: 'Sign-in needs http://127.0.0.1. Start run-eatouts.bat and use the address it prints.'
      });
    }

    if (!uname) {
      return Promise.resolve({ ok: false, reason: 'username', message: 'Enter your username.' });
    }
    if (!norm) {
      return Promise.resolve({ ok: false, reason: 'number', message: 'Enter your WhatsApp number.' });
    }
    if (!password) {
      return Promise.resolve({ ok: false, reason: 'password', message: 'Enter your password.' });
    }

    var d = db();
    if (!d) {
      return Promise.resolve({ ok: false, reason: 'error', message: 'Could not read restaurant data.' });
    }

    var candidates = [];
    var searchable = isRealNumber(norm);
    (d.restaurants || []).forEach(function (r) {
      usersFor(d, r.id).forEach(function (u) {
        candidates.push({ user: u, restaurant: r });
      });
    });

    if (!searchable) {
      /* "0" only ever matches the seeded demo owner */
      candidates = candidates.filter(function (c) {
        return normaliseWhatsapp(c.user.whatsapp) === '0' || normaliseWhatsapp(c.user.whatsapp) === '';
      });
    }

    /* The username has to match the record as well. */
    candidates = candidates.filter(function (c) {
      return String(c.user.username || '').trim().toLowerCase() === uname;
    });

    if (!candidates.length) {
      return Promise.resolve({ ok: false, reason: 'notfound', message: 'No account matches those details.' });
    }

    /* try every candidate so we never leak which number exists */
    return candidates.reduce(function (chain, c) {
      return chain.then(function (found) {
        if (found) return found;
        var u = c.user;
        if (!u.passwordHash || !u.salt) return null;
        return hashPassword(password, u.salt).then(function (h) {
          if (!safeEqual(h, u.passwordHash)) return null;
          return {
            ok: true,
            session: {
              userId: u.id || null,
              userName: u.name || 'Owner',
              role: u.role || 'Owner',
              restaurantId: c.restaurant.id,
              restaurantName: c.restaurant.name || '',
              demo: false,
              at: Date.now()
            }
          };
        });
      });
    }, Promise.resolve(null)).then(function (found) {
      if (!found) {
        return { ok: false, reason: 'badpassword', message: 'That WhatsApp number and password do not match.' };
      }
      saveSession(found.session);
      return found;
    });
  }

  /**
   * One tap, no password: enter as owner of The Yellow Giraffe.
   */
  function loginDemo() {
    var d = db();
    var r = d ? findFlagship(d) : null;
    if (!r) {
      return Promise.resolve({
        ok: false,
        reason: 'error',
        message: 'The Yellow Giraffe is not set up yet. Run seed-demo.html first.'
      });
    }
    var session = {
      userId: null,
      userName: 'Demo',
      role: 'Owner',
      restaurantId: r.id,
      restaurantName: r.name || 'The Yellow Giraffe',
      demo: true,
      at: Date.now()
    };
    saveSession(session);
    return Promise.resolve({ ok: true, session: session });
  }

  /** Set the DB's active restaurant to whatever the session is scoped to. */
  function applyActive() {
    var s = currentSession();
    if (!s) return false;
    var d = db();
    if (!d) return false;
    if (d.activeRestaurantId !== s.restaurantId && typeof EatoutsDB.setActive === 'function') {
      if (EatoutsDB.setActive(s.restaurantId, d)) EatoutsDB.save(d);
      return true;
    }
    return false;
  }

  /* ============================================================
     MANAGER / ADMIN ROLE LAYER
     Backs the onboarding, manager and platform-admin pages. Uses its
     own store (EatoutsMgrDB, key "eatouts_manager_v1") and its own
     session keys, so the hashed operator login above is untouched.
     ============================================================ */

  var MGR_SESSION_KEY = 'eatouts_active_session_v2';
  var MGR_BUSINESS_KEY = 'eatouts_active_business_v2';
  var AUTH_SESSION_KEY = 'eatouts_auth_session_v1';

  var demoRoleCredentials = {
    customer:       { whatsapp: '26770000001', pin: '1234' },
    restaurant:     { whatsapp: '26770000002', pin: '1234' },
    bottle_store:   { whatsapp: '26770000003', pin: '1234' },
    caterer:        { whatsapp: '26770000004', pin: '1234' },
    lodge:          { whatsapp: '26770000005', pin: '1234' },
    supplier:       { whatsapp: '26770000006', pin: '1234' },
    investor:      { whatsapp: '26773456789', pin: '1234' },
    platform_admin: { whatsapp: '26770000099', pin: '1234' },
    rep:           { whatsapp: '26775896569', pin: '1234' },
    rep_nartey:    { whatsapp: '26771844129', pin: '1234' },
    field_admin:   { whatsapp: '26771829765', pin: '1234' }
  };

  /* Canonical manager session id. Falls back to the legacy manager key and to
     the root operator session's userId so one login is visible everywhere. */
  function getActiveSession() {
    try {
      if (!globalThis.localStorage) return null;
      var id = localStorage.getItem(AUTH_SESSION_KEY);
      if (id) return id;
      id = localStorage.getItem(MGR_SESSION_KEY);
      if (id) return id;
      var s = currentSession();
      return (s && s.userId) || null;
    } catch (e) {
      return null;
    }
  }

  function getUser() {
    try {
      var id = getActiveSession();
      if (!id) return null;
      return (globalThis.EatoutsUsers && EatoutsUsers.find(id)) || null;
    } catch (e) { return null; }
  }

  /* Canonical start of a manager/workspace session. Keeps the legacy manager
     key in sync so older pages that read it directly keep working. */
  function startSession(user) {
    if (!user || !user.id) return null;
    try {
      localStorage.setItem(AUTH_SESSION_KEY, user.id);
      localStorage.setItem(MGR_SESSION_KEY, user.id);
    } catch (e) { /* ignore */ }
    if (user.businessId) setActiveBusiness(user.businessId);
    return user;
  }

  function roles() {
    var u = getUser();
    return (u && globalThis.EatoutsRoles) ? EatoutsRoles.roles(u) : [];
  }

  function hasRole(r) {
    var u = getUser();
    if (u && globalThis.EatoutsRoles && EatoutsRoles.hasRole) return EatoutsRoles.hasRole(u, r);
    return roles().indexOf(r) >= 0;
  }

  function can(perm) {
    var u = getUser();
    return !!u && !!globalThis.EatoutsRoles && EatoutsRoles.can(u, perm);
  }

  function setActiveBusiness(id) {
    try {
      if (id) localStorage.setItem(MGR_BUSINESS_KEY, id);
      else localStorage.removeItem(MGR_BUSINESS_KEY);
    } catch (e) { /* ignore */ }
    return id;
  }

  function getActiveBusiness() {
    var u = getUser();
    var id = null;
    try { id = globalThis.localStorage ? localStorage.getItem(MGR_BUSINESS_KEY) : null; } catch (e) { /* ignore */ }
    if (!id && u) id = u.businessId;
    return (id && globalThis.EatoutsMgrDB) ? EatoutsMgrDB.find('businesses', id) : null;
  }

  function isLoggedIn() { return !!getUser(); }

  function routeFor(u) {
    if (!u) return 'eatouts-login.html';
    var r = u.roles || [];
    if (r.some(function (x) { return x === 'rep'; }) || u.type === 'rep') {
      return 'ops-console.html#field';
    }
    if (r.some(function (x) { return String(x).indexOf('platform_') === 0; }) || u.type === 'platform_admin') {
      return 'eatouts-admin-dashboard.html';
    }
    if (u.type === 'customer') return 'eatouts-profile.html';
    if (u.type === 'supplier') return 'quote-manager.html';
    if (u.type === 'investor') return 'analytics-manager.html';
    var b = globalThis.EatoutsMgrDB ? EatoutsMgrDB.find('businesses', u.businessId) : null;
    if (b) {
      var bt = globalThis.EatoutsBusinessTypes;
      var btype = (bt && typeof bt.normalize === 'function') ? bt.normalize(b.type) : b.type;
      if (btype === 'lodge') return 'room-manager.html';
      if (btype === 'foodtruck') return 'food-truck-schedule1.html?biz=' + encodeURIComponent(b.id);
      return 'operator-dashboard1.html?biz=' + encodeURIComponent(b.id);
    }
    return 'eatouts-business-signup.html';
  }

  function loginManager(whatsapp, pin) {
    var u = globalThis.EatoutsUsers ? EatoutsUsers.byWhatsapp(normaliseWhatsapp(whatsapp)) : null;
    if (!u) return Promise.resolve({ ok: false, message: 'No EatOuts account matches that WhatsApp number.' });
    if (u.status !== 'active') return Promise.resolve({ ok: false, message: 'This account is not active.' });
    if (String(pin || '') !== '1234') return Promise.resolve({ ok: false, message: 'Incorrect PIN. Demo PIN: 1234.' });
    startSession(u);
    if (u.businessId) setActiveBusiness(u.businessId);
    /* field activity: stamp the user's last_login_at and, when they own a
       tracked venue, the venue's last_login_at so the at-risk clock moves. */
    try {
      var mgr = globalThis.EatoutsMgrDB;
      if (mgr) {
        mgr.upsert('users', Object.assign({}, mgr.find('users', u.id) || u, { last_login_at: Date.now() }));
      }
      if (globalThis.EatoutsField && u.businessId) {
        var owned = globalThis.EatoutsField.venueById(u.businessId);
        if (owned) globalThis.EatoutsField.touchLogin(owned);
      }
    } catch (e) { /* non-fatal */ }
    /* Mirror into the operator session only when the business maps to a real
       venue on the customer side, so legacy operator pages stay consistent. */
    var b = globalThis.EatoutsMgrDB ? EatoutsMgrDB.find('businesses', u.businessId) : null;
    if (b && b.restaurantId) {
      saveSession({
        userId: u.id,
        userName: [u.firstName, u.surname].filter(Boolean).join(' ') || u.name || 'Owner',
        role: 'Owner',
        restaurantId: b.restaurantId,
        restaurantName: b.name || '',
        demo: false,
        at: Date.now()
      });
    }
    return Promise.resolve({ ok: true, user: u, route: routeFor(u) });
  }

  function loginDemoRole(type) {
    var d = demoRoleCredentials[type] || demoRoleCredentials.restaurant;
    return loginManager(d.whatsapp, d.pin);
  }

  function logoutManager() {
    clearAllSessions();
  }

  globalThis.EatoutsAuth = {
    SESSION_KEY: SESSION_KEY,
    FLAGSHIP_SLUG: FLAGSHIP_SLUG,
    demoCredentials: { whatsapp: '0', username: 'demo', password: '0' },

    login: login,
    loginDemo: loginDemo,
    logout: logout,

    currentSession: currentSession,
    requireSession: requireSession,
    redirectToLogin: redirectToLogin,
    isUnlocked: isUnlocked,
    applyActive: applyActive,

    /* manager / admin role layer */
    SESSION: AUTH_SESSION_KEY,
    BUSINESS: MGR_BUSINESS_KEY,
    AUTH_SESSION_KEY: AUTH_SESSION_KEY,
    demoRoleCredentials: demoRoleCredentials,
    getActiveSession: getActiveSession,
    startSession: startSession,
    getUser: getUser,
    roles: roles,
    hasRole: hasRole,
    can: can,
    setActiveBusiness: setActiveBusiness,
    getActiveBusiness: getActiveBusiness,
    isLoggedIn: isLoggedIn,
    routeFor: routeFor,
    loginManager: loginManager,
    loginDemoRole: loginDemoRole,
    logoutManager: logoutManager,

    /* exposed for the seeding code and the test harness */
    normaliseWhatsapp: normaliseWhatsapp,
    isRealNumber: isRealNumber,
    randomSalt: randomSalt,
    hashPassword: hashPassword,
    hashHex: hashHex,
    secureContextAvailable: secureContextAvailable,
    usersFor: usersFor
  };
})();