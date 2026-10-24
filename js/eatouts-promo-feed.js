/* ============================================================
   EATOUTS PROMO FEED (client)

   Pulls GET /api/promos - every live business promo across every
   venue - and hands it to the bridge, so the Promos tab renders it
   exactly like the venue-local promos.

   The feed is additive: if the phone is offline, or the endpoint is
   not deployed yet, the tab keeps working off the local store.

   Fires `eatouts:promos-feed` when the list is installed.
   ============================================================ */
(function () {
  'use strict';

  var inFlight = null;
  var loaded = false;

  function bridge() { return window.EatoutsBridge; }

  function install(list) {
    var b = bridge();
    var n = 0;
    if (b && typeof b.setFeedPromos === 'function') n = b.setFeedPromos(list);
    loaded = true;
    try {
      window.dispatchEvent(new CustomEvent('eatouts:promos-feed', {
        detail: { count: n, promos: list || [] }
      }));
    } catch (e) { /* CustomEvent unavailable */ }
    return n;
  }

  function load(force) {
    if (loaded && !force) return Promise.resolve(0);
    if (inFlight) return inFlight;
    if (typeof fetch !== 'function') return Promise.resolve(0);

    inFlight = fetch('/api/promos', { credentials: 'include' })
      .then(function (res) {
        return res.json().catch(function () { return {}; })
          .then(function (data) {
            if (!res.ok || !data || !Array.isArray(data.promos)) return 0;
            return install(data.promos);
          });
      })
      .catch(function () { return 0; })
      .then(function (n) {
        inFlight = null;
        return n;
      });

    return inFlight;
  }

  window.EatoutsPromoFeed = {
    load: load,
    install: install,
    loaded: function () { return loaded; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { load(); });
  } else {
    load();
  }
})();
