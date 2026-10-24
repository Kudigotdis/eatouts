/* ============================================================
   EATOUTS PROMO RULES (server)

   Two jobs:

   1. AGE. Age-restricted promos are the ones that sell or push
      alcohol: beer, cider, spirits, wine and the drinks made from
      them. Only an account that is 18 or older may receive them.

   2. LISTING + PRICING. Which Promos-tab segment a promo belongs
      to, how many *active promo-days* it costs, and what it costs.

   This file and js/eatouts-age.js (+ js/eatouts-promo-rules.js for
   the pricing half) hold the same lists and the same maths.
   tests/age-gate.js and tests/promo-rules.js assert they never drift.

   Files starting with "_" are not routed by Pages, so this module is
   import-only.
   ============================================================ */

/* Every word that marks a promo as age restricted. Keep this list
   identical to the one in js/eatouts-age.js. */
export var ALCOHOL_WORDS = [
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

/* Named drinks that are alcohol even when the generic word is absent. */
export var ALCOHOL_BRANDS = [
  'st louis', 'savanna', 'hunters dry', 'castle lite', 'castle lager',
  'windhoek', 'heineken', 'bernini', 'carling', 'corona', 'guinness',
  'baileys', 'jack daniels', 'jagermeister', 'jagerbomb',
  'fitch & leedes', 'fitch and leedes'
];

/* Phrases that cancel a nearby alcohol word. Keep identical to the
   client copy. */
export var ALCOHOL_NEGATIONS = [
  'non-alcoholic', 'non alcoholic', 'nonalcoholic', 'no alcohol',
  'without alcohol', 'alcohol-free', 'alcohol free', 'zero alcohol',
  'mocktail', 'mocktails', 'virgin mojito', 'virgin margarita',
  'virgin pina colada', 'virgin martini', 'virgin daiquiri'
];

/* Drinks that are not alcohol: the catalogue's own subtypes decide
   that before any text is read. */
export var NON_ALCOHOL_SUBTYPES = ['fizzydrinks', 'icedtea', 'softdrinks', 'juices',
  'fruitjuices', 'fruitjuice', 'nonalcoholic', 'mocktails', 'water', 'soda'];

/* ---------- the Promos tab ---------- */

export var PROMO_SEGMENTS = ['Food', 'Combo', 'Beverage'];

/* The eight operator families that may reach the Promos tab. Events
   are listed on the Events tab instead. */
export var FAMILY_SEGMENT = {
  Food: 'Food',
  Platter: 'Food',
  Seasonal: 'Food',
  Beverage: 'Beverage',
  Combo: 'Combo',
  Loyalty: 'Combo'
};

export var BEVERAGE_WORDS = ['beer', 'cider', 'wine', 'spirit', 'whisky', 'whiskey',
  'vodka', 'gin', 'rum', 'brandy', 'tequila', 'champagne', 'prosecco',
  'cocktail', 'drink', 'drinks', 'beverage', 'beverages', 'coffee', 'tea',
  'juice', 'smoothie', 'milkshake', 'soda', 'water', 'cola', 'mocktail'];

export var FOOD_WORDS = ['pizza', 'burger', 'meal', 'meals', 'platter', 'steak',
  'chicken', 'wings', 'ribs', 'fish', 'chips', 'breakfast', 'lunch', 'dinner',
  'brunch', 'snack', 'sandwich', 'wrap', 'salad', 'dessert', 'cake', 'bread',
  'bun', 'rice', 'pasta', 'sushi', 'food', 'eat'];

/* ---------- pricing ---------- */

/* 3 free promo-DAYS per calendar month, per venue. */
export var INCLUDED_PROMO_DAYS_PER_MONTH = 3;
export var FIRST_DAY_FEE = 50;
export var ADDITIONAL_DAY_FEE = 10;
export var PROMO_CURRENCY = 'BWP';

export var WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
  'Friday', 'Saturday', 'Sunday'];

function norm(s) {
  return String(s == null ? '' : s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function text(v) {
  return String(v == null ? '' : v)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function negationHit(prefix) {
  for (var i = 0; i < ALCOHOL_NEGATIONS.length; i++) {
    if (prefix.indexOf(ALCOHOL_NEGATIONS[i]) !== -1) return true;
  }
  return false;
}

/** Does this string name an alcoholic drink? */
export function mentionsAlcohol(value) {
  var t = text(value);
  if (!t) return false;
  /* "platter without beer" is food, so drop the negated tail */
  t = t.replace(/\bwithout\b[\s\S]*/g, ' ');
  if (!t) return false;

  var i, idx, prefix;
  for (i = 0; i < ALCOHOL_WORDS.length; i++) {
    var w = ALCOHOL_WORDS[i];
    var re = new RegExp('(^|[^a-z])' + w + '([^a-z]|$)');
    var m = re.exec(t);
    if (!m) continue;
    idx = m.index + m[1].length;
    prefix = t.slice(Math.max(0, idx - 32), idx);
    if (!negationHit(prefix)) return true;
  }
  for (i = 0; i < ALCOHOL_BRANDS.length; i++) {
    idx = t.indexOf(ALCOHOL_BRANDS[i]);
    if (idx === -1) continue;
    prefix = t.slice(Math.max(0, idx - 32), idx);
    if (!negationHit(prefix)) return true;
  }
  return false;
}

function isNonAlcoholSubtype(value) {
  return NON_ALCOHOL_SUBTYPES.indexOf(norm(value)) !== -1;
}

/** The explicit flag an operator can set on a promo. */
export function hasExplicitFlag(p) {
  if (!p) return false;
  var v = p.ageRestricted;
  if (v === undefined) v = p.age_restricted;
  if (v === undefined) v = p.ageRestrictedFlag;
  if (v === undefined && p.audience !== undefined) v = p.audience === '18plus' || p.audience === '18+';
  if (v === true || v === 1 || v === '1' || v === 'true') return true;
  return false;
}

/**
 * True when a promo must only be shown to an 18+ account.
 *
 * A promo is age restricted when the operator flagged it, or when its
 * type/subtype or wording names an alcoholic drink.
 */
export function isAgeRestrictedPromo(p) {
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
  if (type && !isNonAlcoholSubtype(type) && mentionsAlcohol(type)) return true;
  if (cat && cat.indexOf('bev') === 0 && mentionsAlcohol(p.title)) return true;

  /* Last resort: the wording of the promo itself. */
  var fields = [p.title, p.desc, p.description, p.details, p.brand, p.sponsor, p.terms];
  for (var i = 0; i < fields.length; i++) {
    if (mentionsAlcohol(fields[i])) return true;
  }
  return false;
}

/* ---------- dates and weekdays ---------- */

function isTrue(v) {
  return v === true || v === 1 || v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function parseDate(s) {
  if (!s) return null;
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s).trim());
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  var d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

/** 0 = Monday ... 6 = Sunday, or -1. */
export function dayIndex(name) {
  var n = norm(name);
  if (!n) return -1;
  var table = {
    mon: 0, monday: 0, tue: 1, tues: 1, tuesday: 1,
    wed: 2, weds: 2, wednesday: 2, thu: 3, thur: 3, thurs: 3, thursday: 3,
    fri: 4, friday: 4, sat: 5, saturday: 5, sun: 6, sunday: 6
  };
  if (table[n] !== undefined) return table[n];
  if (/^[1-7]$/.test(n)) return (+n) - 1; // 1 = Monday
  return -1;
}

export function weekdayNames(list) {
  if (!list) return [];
  var arr = list;
  if (typeof arr === 'string') {
    var s = arr.trim();
    if (!s) return [];
    if (s.charAt(0) === '[') {
      try { arr = JSON.parse(s); } catch (e) { arr = s.split(','); }
    } else {
      arr = s.split(',');
    }
  }
  if (!Array.isArray(arr)) return [];
  var seen = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var idx = dayIndex(arr[i]);
    if (idx === -1 || seen[idx]) continue;
    seen[idx] = true;
    out.push(idx);
  }
  out.sort(function (a, b) { return a - b; });
  return out.map(function (i) { return WEEKDAYS[i]; });
}

export function promoDays(p) {
  if (!p) return [];
  var raw = p.days;
  if (raw === undefined) raw = p.days_json;
  if (raw === undefined) raw = p.daysJson;
  if (raw === undefined) raw = p.weekdays;
  if (raw === undefined) raw = p.day;
  return weekdayNames(raw);
}

export function isRecurring(p) {
  return !!p && isTrue(p.recurring);
}

/**
 * Rule A - the number of days the promo is actually offered.
 *
 *   recurring + start + end -> matching weekdays in the range
 *   start + end             -> the inclusive calendar span
 *   otherwise               -> 1
 */
export function activeDays(p) {
  if (!p) return 1;
  var start = parseDate(p.startDate !== undefined ? p.startDate : p.start_date);
  var end = parseDate(p.endDate !== undefined ? p.endDate : p.end_date);
  if (start == null && end == null) return 1;
  if (start == null) start = end;
  if (end == null) end = start;
  if (end < start) { var t = start; start = end; end = t; }

  var slots = promoDays(p);
  if (isRecurring(p) && slots.length) {
    var want = slots.map(dayIndex);
    var n = 0;
    for (var at = start; at <= end; at += 86400000) {
      var jsDay = new Date(at).getUTCDay();     // 0 = Sunday
      var mon = (jsDay + 6) % 7;                // 0 = Monday
      if (want.indexOf(mon) !== -1) n++;
    }
    return n;
  }
  return Math.round((end - start) / 86400000) + 1;
}

/**
 * The weekdays the promo is actually shown on. Empty means "every day"
 * for a non-recurring promo with no dates.
 */
export function activeWeekdays(p) {
  if (!p) return [];
  var start = parseDate(p.startDate !== undefined ? p.startDate : p.start_date);
  var end = parseDate(p.endDate !== undefined ? p.endDate : p.end_date);

  if (isRecurring(p)) {
    var slots = promoDays(p);
    if (slots.length) return slots;
  }
  if (start != null || end != null) {
    if (start == null) start = end;
    if (end == null) end = start;
    if (end < start) { var t = start; start = end; end = t; }
    var seen = {};
    var out = [];
    for (var at = start; at <= end; at += 86400000) {
      var jsDay = new Date(at).getUTCDay();
      var mon = (jsDay + 6) % 7;
      if (seen[mon]) continue;
      seen[mon] = true;
      out.push(mon);
    }
    out.sort(function (a, b) { return a - b; });
    return out.map(function (i) { return WEEKDAYS[i]; });
  }
  return promoDays(p);
}

/* ---------- segment ---------- */

export function promoFamilyOf(p) {
  if (!p) return '';
  var f = p.promoFamily;
  if (f === undefined) f = p.promo_family;
  if (f === undefined) f = p.family;
  return String(f == null ? '' : f).trim();
}

function namesDrink(p) {
  var fields = [p.subtype, p.type, p.brand, p.title, p.desc, p.description, p.details];
  for (var i = 0; i < fields.length; i++) {
    var t = text(fields[i]);
    if (!t) continue;
    if (mentionsAlcohol(t)) return true;
    for (var j = 0; j < BEVERAGE_WORDS.length; j++) {
      if (new RegExp('(^|[^a-z])' + BEVERAGE_WORDS[j] + '([^a-z]|$)').test(t)) return true;
    }
  }
  return false;
}

function namesFood(p) {
  var fields = [p.subtype, p.type, p.title, p.desc, p.description, p.details];
  for (var i = 0; i < fields.length; i++) {
    var t = text(fields[i]);
    if (!t) continue;
    for (var j = 0; j < FOOD_WORDS.length; j++) {
      if (new RegExp('(^|[^a-z])' + FOOD_WORDS[j] + '([^a-z]|$)').test(t)) return true;
    }
  }
  return false;
}

/**
 * The Promos-tab segment: Food | Combo | Beverage.
 * Events return null (they belong on the Events tab).
 */
export function segmentForPromo(p) {
  if (!p) return 'Food';

  var format = String(p.contentFormat !== undefined ? p.contentFormat
    : (p.content_format !== undefined ? p.content_format : 'offer')).trim();
  if (format === 'offer_event') return 'Combo';
  if (format === 'event') return null;

  var family = promoFamilyOf(p);
  var key = '';
  var keys = Object.keys(FAMILY_SEGMENT);
  for (var i = 0; i < keys.length; i++) {
    if (norm(keys[i]) === norm(family)) { key = keys[i]; break; }
  }
  if (key) return FAMILY_SEGMENT[key];

  if (norm(family) === 'happyhour') {
    var drink = namesDrink(p);
    var food = namesFood(p);
    if (drink && food) return 'Combo';
    if (drink) return 'Beverage';
    return 'Food';
  }
  if (norm(family) === 'event' || norm(family) === 'events') return null;

  /* No family: a category that is already a segment wins, then a type
     that names one, then the copy. */
  var cat = String(p.category == null ? '' : p.category).trim();
  for (var s = 0; s < PROMO_SEGMENTS.length; s++) {
    if (norm(PROMO_SEGMENTS[s]) === norm(cat)) return PROMO_SEGMENTS[s];
  }
  var typ = norm(p.type);
  if (typ.indexOf('food') === 0 || typ.indexOf('platter') === 0 || typ.indexOf('seasonal') === 0) return 'Food';
  if (typ.indexOf('bev') === 0 || typ.indexOf('drink') === 0) return 'Beverage';
  if (typ.indexOf('comb') === 0 || typ.indexOf('loyalty') === 0) return 'Combo';

  if (norm(cat).indexOf('bev') === 0) return 'Beverage';
  if (norm(cat).indexOf('combo') === 0) return 'Combo';

  var drink = namesDrink(p);
  var food = namesFood(p);
  if (drink && food) return 'Combo';
  if (drink) return 'Beverage';
  return 'Food';
}

/* ---------- fee ---------- */

/**
 * All-or-nothing quote.
 *
 * A promo is free only when it fits entirely in the free days that
 * remain. Otherwise the whole promo is charged, and a charged promo
 * uses none of the remaining free days.
 */
export function quotePromoFee(opts) {
  var days = Math.max(1, Math.floor(Number(opts && opts.days) || 1));
  var left = Math.max(0, Math.floor(Number(opts && opts.freeDaysLeft) || 0));
  if (days <= left) {
    return { included: true, fee: 0, freeDaysUsed: days };
  }
  return {
    included: false,
    fee: FIRST_DAY_FEE + (days - 1) * ADDITIONAL_DAY_FEE,
    freeDaysUsed: 0
  };
}

/** `YYYY-MM` for the month a timestamp falls in (UTC). */
export function monthKey(ts) {
  var d = ts instanceof Date ? ts : new Date(ts == null ? Date.now() : ts);
  if (isNaN(d.getTime())) d = new Date();
  var m = d.getUTCMonth() + 1;
  return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m;
}
