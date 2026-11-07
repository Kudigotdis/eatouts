/* EatoutsRegionData — the directory payload for the ACTIVE region.
 *
 * The app used to hard-code Botswana's payload, which is why a Zimbabwe venue
 * never resolved. One region, one file:
 *
 *   BW  /data/restaurant_listings/directory_runtime_data.{js,json}
 *       -> window.DIRECTORY_RUNTIME_DATA
 *   ZW  /data/restaurant_listings/zimbabwe_runtime_data.{js,json}
 *       -> window.ZIMBABWE_RUNTIME_DATA
 *   ZA  /data/restaurant_listings/southafrica_runtime_data.{js,json}
 *       -> window.SOUTH_AFRICA_RUNTIME_DATA
 *   KE  /data/restaurant_listings/kenya_runtime_data.{js,json}
 *       -> window.KENYA_RUNTIME_DATA
 *   MU  /data/restaurant_listings/mauritius_runtime_data.{js,json}
 *       -> window.MAURITIUS_RUNTIME_DATA
 *
 * Only the active region's file is ever downloaded: index.html calls
 * injectSync() while the page is parsing, so a ZW user never fetches the
 * Botswana payload and a BW user never fetches Zimbabwe's.
 *
 * Both files share one shape — { region, currency, restaurants[], menuFiles{},
 * menusRaw{}, logos{} } — so page code reads payload() and jsonUrl() and never
 * needs to know which country it is running in.
 */
(function(){
  "use strict";

  var DIRECTORY = "/data/restaurant_listings/";
  var FALLBACK_CODE = "BW";
  var REGION_STORE_KEY = "eatouts.region.v1";

  var PAYLOADS = {
    BW: { globalName: "DIRECTORY_RUNTIME_DATA", file: "directory_runtime_data" },
    ZW: { globalName: "ZIMBABWE_RUNTIME_DATA", file: "zimbabwe_runtime_data" },
    ZA: { globalName: "SOUTH_AFRICA_RUNTIME_DATA", file: "southafrica_runtime_data" },
    KE: { globalName: "KENYA_RUNTIME_DATA", file: "kenya_runtime_data" },
    MU: { globalName: "MAURITIUS_RUNTIME_DATA", file: "mauritius_runtime_data" }
  };

  /* EatoutsRegions is the source of truth, but the payload is injected while
     the page is still parsing and that script loads later in some pages — so
     the stored region code is read directly as the fallback. */
  function code(){
    var R = window.EatoutsRegions;
    var stored = "";
    if (R && typeof R.code === "function") {
      stored = R.code();
    } else {
      try { stored = localStorage.getItem(REGION_STORE_KEY) || ""; } catch (e) { stored = ""; }
    }
    var up = String(stored || FALLBACK_CODE).toUpperCase();
    return PAYLOADS[up] ? up : FALLBACK_CODE;
  }

  function entry(){
    return PAYLOADS[code()];
  }

  /** The payload already on the page (a <script> tag set it), or null. */
  function payload(){
    return window[entry().globalName] || null;
  }

  function payloadRegion(){
    var data = payload();
    return (data && data.region) || code();
  }

  function jsonUrl(){
    return DIRECTORY + entry().file + ".json";
  }

  function scriptUrl(){
    return DIRECTORY + entry().file + ".js";
  }

  /**
   * Pull the active region's payload in synchronously, during parsing. Returns
   * true when the global is available afterwards; callers keep their own fetch
   * fallback for the case where nothing was injected.
   */
  function injectSync(){
    if (payload()) return true;
    if (typeof document === "undefined" || typeof document.write !== "function") return false;
    document.write('<script src="' + scriptUrl() + '"><\/script>');
    return true;
  }

  window.EatoutsRegionData = {
    code: code,
    payload: payload,
    payloadRegion: payloadRegion,
    jsonUrl: jsonUrl,
    scriptUrl: scriptUrl,
    injectSync: injectSync,
    DIRECTORY: DIRECTORY
  };
})();
