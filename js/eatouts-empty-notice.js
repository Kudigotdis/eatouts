/* ============================================================
   EATOUTS EMPTY NOTICE
   The one "nothing here" card: the Eish mascot (180px) above a
   line of copy. Two copy pools — one for a search that found
   nothing, one for a directory a region has not listed yet.

   Both pages that show an empty state (index.html, search
   screen) render the same card, so the wording lives here once.

   A different line every time it is drawn: the cursor is kept in
   sessionStorage and advanced on every call, so walking the app
   and landing on two empty pages never shows the same message
   twice in a row.

   Pure presentation — no data, no dependencies. html() returns a
   string; callers drop it straight into their render output.
   ============================================================ */
(function () {
  'use strict';

  var CURSOR_KEY = 'eatouts.empty.idx.v1';

  /* Spaces are the real filenames, so they are percent-encoded. */
  var IMAGES = [
    'assets/images/notices/Eish%20(1).png',
    'assets/images/notices/Eish%20(2).png',
    'assets/images/notices/Eish%20(3).png',
    'assets/images/notices/Eish%20(4).png',
    'assets/images/notices/Eish%20(5).png',
    'assets/images/notices/Eish%20(6).png',
    'assets/images/notices/Eish%20(7).png'
  ];

  /* Zero results for a search. One per navigation. */
  var SEARCH_MESSAGES = [
    "Eish, no spots match what you're looking for!",
    "Ah shem, nothing came up for that search. Try another.",
    "You're curving offroad shem, we couldn't find any restaurants matching your search.",
    "Dololo like nonono bru, no spots found for this one. Try tweaking your search!",
    "Cooked! No restaurants matched your keywords. Try searching for something else.",
    "Not happening, zero results for that search!",
    "Asseblief nie, looks like no spots matched that search. Try widening your area or food type.",
    "Nyah neh, couldn't find any places matching that! Try another term.",
    "Hayi bo! No restaurants pop up for this one.",
    "Hayikona, nothing matched your search! Try searching by area or cuisine instead.",
    "Ag nee man, we drew a blank on that search! Try something else.",
    "Eish, no spots found matching that description.",
    "Jack ekse, no restaurants came up! Try clearing a few filters.",
    "Aye na, no matches found. Try searching for a different area or dish!",
    "Eish, no results for this search! Double-check your spelling or try another keyword.",
    "Pure cap. Nothing on the menu for that search! Try looking up another spot.",
    "Harde cousin, we couldn't find any restaurants matching your search criteria.",
    "Eish, no spots match this right now. Try another search!",
    "Looks like there are no restaurants matching that search.",
    "Askies there neh, the results are unresulting."
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* Advance the cursor, wrap it into the pool length. */
  function nextIndex(len) {
    var at = 0;
    try { at = parseInt(sessionStorage.getItem(CURSOR_KEY) || '0', 10) || 0; } catch (e) { at = 0; }
    at = (at + 1) % Math.max(len, 1);
    try { sessionStorage.setItem(CURSOR_KEY, String(at)); } catch (e) {}
    return at;
  }

  /* A render loop (typing in search, a state repaint) calls html() many times
     a second. The pick is held for HOLD_MS so the card sits still while the
     user works, and rotates on the next real navigation. */
  var HOLD_MS = 1500;
  var held = null;

  /**
   * The card.
   * @param {object} opts
   *   pool    - 'search' (default) or an array of strings
   *   title   - optional bold line above the copy
   *   message - force this line instead of rotating
   *   image   - force an image instead of rotating
   */
  function html(opts) {
    var o = opts || {};
    var pool = Object.prototype.toString.call(o.pool) === '[object Array]' ? o.pool : SEARCH_MESSAGES;
    var forced = o.message ? String(o.message) : '';
    var now = Date.now();
    var pick = held;

    if (!pick || pick.pool !== pool || pick.forced !== forced || (now - pick.at) > HOLD_MS) {
      var at = nextIndex(pool.length * IMAGES.length);
      pick = held = {
        at: now,
        pool: pool,
        forced: forced,
        message: forced || pool[at % pool.length] || SEARCH_MESSAGES[0],
        image: o.image || IMAGES[at % IMAGES.length]
      };
    }

    return '<div class="empty-notice">' +
      '<img src="' + esc(pick.image) + '" alt="" loading="lazy">' +
      (o.title ? '<div class="empty-notice-title">' + esc(o.title) + '</div>' : '') +
      '<p>' + esc(pick.message) + '</p>' +
    '</div>';
  }

  window.EatoutsEmptyNotice = {
    IMAGES: IMAGES,
    SEARCH_MESSAGES: SEARCH_MESSAGES,
    nextIndex: nextIndex,
    html: html
  };
})();
