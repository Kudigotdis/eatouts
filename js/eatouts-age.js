/* ============================================================
   EATOUTS AGE RULES (client)

   Age-restricted promos are the ones that sell or push alcohol:
   beer, cider, spirits, wine and the drinks made from them.
   Only a signed-in account that is 18 or older may see them.

   This file and functions/api/_promo-rules.js hold the same word
   list; tests/age-gate.js asserts the two never drift apart.

   Loaded as a plain script, so it exposes window.EatoutsAge.
   ============================================================ */
(function () {
  'use strict';

  /* Every word that marks a promo as age restricted. Keep this list
     identical to the one in functions/api/_promo-rules.js. */
  var ALCOHOL_WORDS = [
    'beer', 'beers', 'lager', 'ale', 'stout', 'pilsner',
    'cider', 'ciders', 'perry',
    'wine', 'wines', 'champagne', 'prosecco', 'sherry', 'port',
    'spirit', 'spirits',
    'whisky', 'whiskey', 'bourbon', 'scotch',
    'vodka', 'gin', 'rum', 'brandy', 'cognac', 'tequila', 'mezcal',
    'liqueur', 'liquor', 'liquour',
    'cocktail', 'cocktails', 'mcc', 'martini', 'shandy', 'sake',
    'absinthe', 'ouzo', 'schnapps', 'grappa', 'vermouth'
  ];

  var WORD_SET = {};
  ALCOHOL_WORDS.forEach(function (w) { WORD_SET[w] = true; });

  /* "Fizzy Drinks" and "Iced Tea" are drinks, but not alcohol: the
     catalogue's own subtypes decide that before any text is read. */
  var NON_ALCOHOL_SUBTYPES = ['fizzydrinks', 'icedtea', 'softdrinks', 'juices',
    'fruitjuices', 'fruitjuice', 'nonalcoholic', 'mocktails', 'water', 'soda'];

  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }

  function text(v) { return String(v == null ? '' : v).toLowerCase(); }

  /* Does this string name an alcoholic drink? */
  function mentionsAlcohol(value) {
    var t = text(value);
    if (!t) return false;
    /* "platter without beer" is food, so drop the negated tail */
    t = t.replace(/\bwithout\b[\s\S]*/g, ' ');
    if (!t) return false;
    for (var i = 0; i < ALCOHOL_WORDS.length; i++) {
      var w = ALCOHOL_WORDS[i];
      var re = new RegExp('(^|[^a-z])' + w + '([^a-z]|$)');
      if (re.test(t)) return true;
    }
    return false;
  }

  function isNonAlcoholSubtype(value) {
    return NON_ALCOHOL_SUBTYPES.indexOf(norm(value)) !== -1;
  }

  /* The explicit flag an operator can set on a promo. */
  function hasExplicitFlag(p) {
    if (!p) return false;
    var v = p.ageRestricted;
    if (v === undefined) v = p.age_restricted;
    if (v === undefined) v = p.ageRestrictedFlag;
    if (v === true || v === 1 || v === '1' || v === 'true') return true;
    return false;
  }

  /**
   * True when a promo must only be shown to an 18+ account.
   *
   * A promo is age restricted when the operator flagged it, or when its
   * type/subtype or wording names an alcoholic drink.
   */
  function isAgeRestrictedPromo(p) {
    if (!p) return false;
    if (hasExplicitFlag(p)) return true;

    var type = p.type;
    var subtype = p.subtype;
    var category = p.category;

    /* An explicit "food" category settles it: a food promo is not
       age restricted even when the copy mentions a drink it excludes. */
    var cat = text(category).trim();
    if (cat.indexOf('food') === 0) return false;

    /* The catalogue subtypes come first: Beers, Ciders and Spirits are
       age restricted, Fizzy Drinks and Iced Tea are not. */
    if (subtype && !isNonAlcoholSubtype(subtype) && mentionsAlcohol(subtype)) return true;
    if (type && !isNonAlcoholSubtype(type) && mentionsAlcohol(type)) {
      /* A combo (food + drink) still counts when the drink is alcohol. */
      return true;
    }
    if (cat && cat.indexOf('bev') === 0 && mentionsAlcohol(p.title) ) return true;

    /* Last resort: the wording of the promo itself. */
    var fields = [p.title, p.desc, p.description, p.details, p.brand, p.sponsor, p.terms];
    for (var i = 0; i < fields.length; i++) {
      if (mentionsAlcohol(fields[i])) return true;
    }
    return false;
  }

  /* ---------- the viewer ---------- */

  function ageFromDob(dob) {
    if (!dob) return null;
    var d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    var now = new Date();
    var age = now.getFullYear() - d.getFullYear();
    var m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age;
  }

  /** The date of birth of whoever is signed in, or ''. */
  function viewerDob() {
    try {
      var users = [];
      if (window.EatoutsCustomer && typeof window.EatoutsCustomer.getUser === 'function') {
        var u = window.EatoutsCustomer.getUser();
        if (u) users.push(u);
      }
      if (window.EatoutsAuth && typeof window.EatoutsAuth.getUser === 'function') {
        var a = window.EatoutsAuth.getUser();
        if (a) users.push(a);
      }
      for (var i = 0; i < users.length; i++) {
        var x = users[i] || {};
        if (x.dob) return String(x.dob);
        if (x.profile && x.profile.dob) return String(x.profile.dob);
      }
    } catch (e) { /* no session: stay anonymous */ }
    return '';
  }

  /** Age of the signed-in account, or null when nobody is signed in. */
  function viewerAge() {
    return ageFromDob(viewerDob());
  }

  /** True when the signed-in account may see age-restricted promos. */
  function canViewFlaggedPromos() {
    var age = viewerAge();
    return age != null && age >= 18;
  }

  window.EatoutsAge = {
    ALCOHOL_WORDS: ALCOHOL_WORDS,
    NON_ALCOHOL_SUBTYPES: NON_ALCOHOL_SUBTYPES,
    mentionsAlcohol: mentionsAlcohol,
    isAgeRestrictedPromo: isAgeRestrictedPromo,
    ageFromDob: ageFromDob,
    viewerDob: viewerDob,
    viewerAge: viewerAge,
    canViewFlaggedPromos: canViewFlaggedPromos
  };
})();
