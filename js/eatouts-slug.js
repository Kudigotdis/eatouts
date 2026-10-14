/* ============================================================
   EATOUTS SLUG - public link-name rules (single source of truth)

   A business link is  https://www.eatouts.online/<country>/<slug>
   e.g. www.eatouts.online/bw/brightstarbakery

   Rules (per product spec):
     - lowercase canonical, case-insensitive when resolved
     - allowed characters: a-z, 0-9 and "."
     - NO spaces: "Bright Star Bakery" -> "brightstarbakery"
     - dots cannot lead, trail, or repeat
     - 3..40 characters
     - a short blocklist of platform words cannot be claimed

   Exposes window.EatoutsSlug. Loaded as a classic script so it works
   over http:// and file:// alike, before js/eatouts-router.js.
   ============================================================ */
(function () {
  'use strict';

  var MIN = 3;
  var MAX = 40;

  /* Route segments and platform words that must never be a business link. */
  var RESERVED = {
    api: 1, assets: 1, js: 1, css: 1, img: 1, static: 1, cdn: 1, mail: 1,
    bw: 1, www: 1, app: 1, admin: 1, root: 1, public: 1,
    about: 1, blog: 1, help: 1, support: 1, terms: 1, privacy: 1,
    login: 1, logout: 1, signup: 1, register: 1, account: 1, settings: 1,
    index: 1, home: 1, new: 1, edit: 1, me: 1, my: 1, null: 1, undefined: 1,
    restaurants: 1, restaurant: 1, suppliers: 1, supplier: 1, events: 1,
    event: 1, promos: 1, promo: 1, gallery: 1, reserve: 1, business: 1,
    dashboard: 1, ops: 1, test: 1, demo: 1, health: 1, robots: 1
  };

  /**
   * Canonical lowercase form of a raw link name: strip accents, drop every
   * character outside a-z 0-9 and ".", collapse/trim dots, cap the length.
   */
  function normalize(input) {
    var s = String(input == null ? '' : input).toLowerCase();
    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    s = s.replace(/&/g, '');              /* "Fish & Chips" -> "fishchips" */
    s = s.replace(/[^a-z0-9.]+/g, '');    /* drop spaces + punctuation */
    s = s.replace(/\.{2,}/g, '.');        /* collapse ".." */
    s = s.replace(/^\.+/, '').replace(/\.+$/, '');
    if (s.length > MAX) s = s.slice(0, MAX).replace(/\.+$/, '');
    return s;
  }

  /** True when a (already normalized) slug is claimable per the rules. */
  function isValid(slug) {
    var s = String(slug || '');
    if (s.length < MIN || s.length > MAX) return false;
    if (!/^[a-z0-9]+(\.[a-z0-9]+)*$/.test(s)) return false;
    if (Object.prototype.hasOwnProperty.call(RESERVED, s)) return false;
    return true;
  }

  function isReserved(slug) {
    return Object.prototype.hasOwnProperty.call(RESERVED, String(slug || ''));
  }

  /** Human reason a slug is not usable, or '' when it is fine. */
  function reason(input) {
    var s = normalize(input);
    if (!s) return 'Enter a link name.';
    if (s.length < MIN) return 'Use at least ' + MIN + ' characters.';
    if (isReserved(s)) return 'That name is reserved by EatOuts.';
    if (!isValid(s)) return 'Use only letters, numbers and periods.';
    return '';
  }

  /**
   * Display form: the canonical slug with each dot-separated segment
   * capitalized ("brightstar.bakery" -> "Brightstar.Bakery"). Display only;
   * resolution is always case-insensitive on the canonical form.
   */
  function display(input) {
    return normalize(input).split('.').map(function (seg) {
      return seg ? seg.charAt(0).toUpperCase() + seg.slice(1) : seg;
    }).join('.');
  }

  /** Full pretty URL for a slug, e.g. url('bw','tops') -> '/bw/tops'. */
  function path(country, slug) {
    return '/' + String(country || 'bw').toLowerCase() + '/' + normalize(slug);
  }

  /** Full pretty URL incl. host, e.g. www.eatouts.online/bw/tops. */
  function url(country, slug) {
    return 'www.eatouts.online' + path(country, slug);
  }

  var API = {
    MIN: MIN,
    MAX: MAX,
    RESERVED: RESERVED,
    normalize: normalize,
    isValid: isValid,
    isReserved: isReserved,
    reason: reason,
    display: display,
    path: path,
    url: url
  };

  if (typeof window !== 'undefined') window.EatoutsSlug = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
