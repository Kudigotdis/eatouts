/* ============================================================
   EATOUTS PROMO RULES (client)

   The browser twin of functions/api/_promo-rules.js: the
   Promos-tab segment map, the Rule A active-day count and the
   all-or-nothing fee maths.

   The server is always the authority. The editor and the
   dashboards use this file to *estimate* and to explain the
   quote; they never write a fee to the database.

   Loaded as a plain script, so it exposes window.EatoutsPromoRules.
   ============================================================ */
(function () {
  'use strict';

  var PROMO_SEGMENTS = ['Food', 'Combo', 'Beverage'];

  /* The eight operator families that may reach the Promos tab.
     Events are listed on the Events tab instead. */
  var FAMILY_SEGMENT = {
    Food: 'Food',
    Platter: 'Food',
    Seasonal: 'Food',
    Beverage: 'Beverage',
    Combo: 'Combo',
    Loyalty: 'Combo'
  };

  var BEVERAGE_WORDS = ['beer', 'cider', 'wine', 'spirit', 'whisky', 'whiskey',
    'vodka', 'gin', 'rum', 'brandy', 'tequila', 'champagne', 'prosecco',
    'cocktail', 'drink', 'drinks', 'beverage', 'beverages', 'coffee', 'tea',
    'juice', 'smoothie', 'milkshake', 'soda', 'water', 'cola', 'mocktail'];

  var FOOD_WORDS = ['pizza', 'burger', 'meal', 'meals', 'platter', 'steak',
    'chicken', 'wings', 'ribs', 'fish', 'chips', 'breakfast', 'lunch', 'dinner',
    'brunch', 'snack', 'sandwich', 'wrap', 'salad', 'dessert', 'cake', 'bread',
    'bun', 'rice', 'pasta', 'sushi', 'food', 'eat'];

  /* 3 free promo-DAYS per calendar month, per venue. */
  var INCLUDED_PROMO_DAYS_PER_MONTH = 3;
  var FIRST_DAY_FEE = 50;
  var ADDITIONAL_DAY_FEE = 10;
  var PROMO_CURRENCY = 'BWP';

  var WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday',
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

  /* 0 = Monday ... 6 = Sunday, or -1. */
  function dayIndex(name) {
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

  function weekdayNames(list) {
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

  function promoDays(p) {
    if (!p) return [];
    var raw = p.days;
    if (raw === undefined) raw = p.days_json;
    if (raw === undefined) raw = p.daysJson;
    if (raw === undefined) raw = p.weekdays;
    if (raw === undefined) raw = p.day;
    return weekdayNames(raw);
  }

  function isRecurring(p) {
    return !!p && isTrue(p.recurring);
  }

  /**
   * Rule A - the number of days the promo is actually offered.
   *
   *   recurring + start + end -> matching weekdays in the range
   *   start + end             -> the inclusive calendar span
   *   otherwise               -> 1
   */
  function activeDays(p) {
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
  function activeWeekdays(p) {
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

  function promoFamilyOf(p) {
    if (!p) return '';
    var f = p.promoFamily;
    if (f === undefined) f = p.promo_family;
    if (f === undefined) f = p.family;
    return String(f == null ? '' : f).trim();
  }

  function mentionsAlcohol(v) {
    if (window.EatoutsAge && typeof window.EatoutsAge.mentionsAlcohol === 'function') {
      return window.EatoutsAge.mentionsAlcohol(v);
    }
    return false;
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
  function segmentForPromo(p) {
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

  /**
   * All-or-nothing quote.
   *
   * A promo is free only when it fits entirely in the free days that
   * remain. Otherwise the whole promo is charged, and a charged promo
   * uses none of the remaining free days.
   */
  function quotePromoFee(opts) {
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

  function monthKey(ts) {
    var d = ts instanceof Date ? ts : new Date(ts == null ? Date.now() : ts);
    if (isNaN(d.getTime())) d = new Date();
    var m = d.getUTCMonth() + 1;
    return d.getUTCFullYear() + '-' + (m < 10 ? '0' : '') + m;
  }

  /**
   * The free days a venue has left this month.
   * `rows` = promo_submissions rows or client promos with
   * `quotedDays` / `quotedFree` (or the camelCase twins) and a status.
   */
  function freeDaysLeft(rows, month) {
    var key = month || monthKey(Date.now());
    var used = 0;
    (rows || []).forEach(function (r) {
      if (!r) return;
      var free = r.quotedFree !== undefined ? r.quotedFree : r.quoted_free;
      if (!isTrue(free)) return;
      var status = String(r.status == null ? '' : r.status);
      if (['pending', 'approved', 'published', 'active', 'in review', 'in_review'].indexOf(status) === -1) return;
      var mk = r.monthKey !== undefined ? r.monthKey : (r.month_key !== undefined ? r.month_key : r.quotaMonth);
      if (mk && mk !== key) return;
      var d = Number(r.quotedDays !== undefined ? r.quotedDays : r.quoted_days);
      used += isFinite(d) ? d : 0;
    });
    return Math.max(0, INCLUDED_PROMO_DAYS_PER_MONTH - used);
  }

  window.EatoutsPromoRules = {
    PROMO_SEGMENTS: PROMO_SEGMENTS,
    FAMILY_SEGMENT: FAMILY_SEGMENT,
    BEVERAGE_WORDS: BEVERAGE_WORDS,
    FOOD_WORDS: FOOD_WORDS,
    WEEKDAYS: WEEKDAYS,
    INCLUDED_PROMO_DAYS_PER_MONTH: INCLUDED_PROMO_DAYS_PER_MONTH,
    FIRST_DAY_FEE: FIRST_DAY_FEE,
    ADDITIONAL_DAY_FEE: ADDITIONAL_DAY_FEE,
    PROMO_CURRENCY: PROMO_CURRENCY,
    dayIndex: dayIndex,
    weekdayNames: weekdayNames,
    promoDays: promoDays,
    isRecurring: isRecurring,
    activeDays: activeDays,
    activeWeekdays: activeWeekdays,
    promoFamilyOf: promoFamilyOf,
    segmentForPromo: segmentForPromo,
    quotePromoFee: quotePromoFee,
    monthKey: monthKey,
    freeDaysLeft: freeDaysLeft
  };
})();
