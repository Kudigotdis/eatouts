/* EatOuts region registry (T22).
 *
 * The single source of truth for which country the app is running in.
 * Botswana (BW) is the only active region today; ZA/ZW/MW/KE are listed so
 * the selector can show them, but they stay inactive until their data lands.
 *
 * Nothing here activates a region on its own: setActiveRegion() refuses any
 * region not flagged active, and getActiveRegion() falls back to BW if the
 * stored value is missing, unknown, or belongs to an inactive region.
 *
 * Persisted under localStorage 'eatouts.region.v1'.
 *
 * No existing page loads this file yet — the index.html wiring, the
 * EatOuts-Region.html selector, and the data-gating pass land after
 * T09 / T13 / T21 are merged onto main.
 */
(function(){
  "use strict";

  var STORE_KEY    = "eatouts.region.v1";
  var DEFAULT_CODE = "BW";

  var REGIONS = [
    { code:"BW", name:"Botswana",     currency:"BWP", active:true,  locale:"en-BW",
      locations:"botswana_locations.js", whatsappChannel:"" },
    { code:"ZA", name:"South Africa", currency:"ZAR", active:false },
    { code:"ZW", name:"Zimbabwe",     currency:"USD", active:false },
    { code:"MW", name:"Malawi",       currency:"MWK", active:false },
    { code:"KE", name:"Kenya",        currency:"KES", active:false }
  ];
  window.EATOUTS_REGIONS = REGIONS;

  function byCode(code){
    var up = String(code || "").toUpperCase();
    for (var i = 0; i < REGIONS.length; i++) {
      if (REGIONS[i].code === up) return REGIONS[i];
    }
    return null;
  }

  function isActive(code){
    var r = byCode(code);
    return !!(r && r.active);
  }

  function getActiveRegion(){
    var code = null;
    try { code = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (code && isActive(code)) return byCode(code);
    return byCode(DEFAULT_CODE);
  }

  function setActiveRegion(code){
    var up = String(code || "").toUpperCase();
    if (!isActive(up)) return false;
    try { localStorage.setItem(STORE_KEY, up); } catch (e) { return false; }
    return true;
  }

  window.EatoutsRegions = {
    all: REGIONS.slice.bind(REGIONS),
    get: byCode,
    isActive: isActive,
    getActiveRegion: getActiveRegion,
    setActiveRegion: setActiveRegion,
    DEFAULT_CODE: DEFAULT_CODE,
    STORE_KEY: STORE_KEY
  };
})();
