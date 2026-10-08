/* ============================================================
   EATOUTS PRICING SOURCE
   One resolver for the canonical pricing object so no page
   hardcodes numbers. Resolution order:
     window.EATOUTS_PRICING
       -> EatoutsDB.load().settings.pricing
       -> built-in fallback.
   ============================================================ */
(function () {
  'use strict';

  var FALLBACK = {
    setup: 300,
    tiers: {
      starter: { price: 100 },
      growth: { price: 300 },
      pro: { price: 500 }
    }
  };

  function resolve() {
    if (window.EATOUTS_PRICING) return window.EATOUTS_PRICING;
    try {
      if (window.EatoutsDB && typeof window.EatoutsDB.load === 'function') {
        var db = window.EatoutsDB.load();
        if (db && db.settings && db.settings.pricing) return db.settings.pricing;
      }
    } catch (e) { /* fall through to fallback */ }
    return FALLBACK;
  }

  function numberFor(key, resolved) {
    if (!key || !resolved) return null;
    if (key === 'setup') return resolved.setup;
    var tiers = resolved.tiers || {};
    var tier = tiers[key];
    if (tier && tier.price != null) return tier.price;
    return null;
  }

  function fill(root) {
    var host = root || (typeof document !== 'undefined' ? document : null);
    if (!host || typeof host.querySelectorAll !== 'function') return;
    var resolved = resolve();
    var nodes = host.querySelectorAll('[data-price]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var key = el.getAttribute('data-price');
      var value = numberFor(key, resolved);
      if (value == null || isNaN(Number(value))) continue; /* leave static text */
      var plain = el.getAttribute('data-price-format') === 'plain';
      el.textContent = (plain ? '' : 'P') + Number(value);
    }
  }

  window.EatoutsPricing = {
    FALLBACK: FALLBACK,
    resolve: resolve,
    fill: fill
  };
})();