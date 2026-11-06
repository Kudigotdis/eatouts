/* EatOuts region registry (T22).
 *
 * The single source of truth for which country the app is running in.
 * Botswana (BW) and Zimbabwe (ZW) are the active regions today; ZA/MW/KE/NG/
 * GH/MU are listed so the selector can show them, but they stay inactive
 * until their data lands. `flag` is the base name of the square flag in
 * assets/flags-square-rounded/<flag>.svg (the selector list keeps using the
 * 2-letter assets/flags/<code>.png pair).
 *
 * Nothing here activates a region on its own: setActiveRegion() refuses any
 * region not flagged active, and getActiveRegion() falls back to BW if the
 * stored value is missing, unknown, or belongs to an inactive region.
 *
 * Data gating (T22 step 3): every place / venue / menu / directory record
 * carries a region code. recordRegion() reads it (a record written before
 * gating has no field and reads as the default), and filterByRegion() is the
 * gate the data layers apply — see EatoutsBridge.all() and
 * EatoutsLocations. locationsFile() / currency() / locale() expose the active
 * region's own settings so callers stop hard-coding Botswana, and symbol() /
 * money(v) are the display half: money(12) is "P12.00" in BW, "R12.00" in ZA.
 * A page that has not been switched over keeps its own 'P' helper; the two are
 * the same string for Botswana, so the change is invisible until region 2.
 *
 * Persisted under localStorage 'eatouts.region.v1'.
 */
(function(){
  "use strict";

  var STORE_KEY    = "eatouts.region.v1";
  var DEFAULT_CODE = "BW";

  /* Which regions actually carry data for each directory. A region that is
     missing here gets the "yet to be listed" state instead of another
     country's businesses. Add a code when that directory's data lands. */
  var DIRECTORY_REGIONS = {
    catering:  ["BW"],
    bakery:    ["BW"],
    beverages: ["BW"]
  };

  var REGIONS = [
    { code:"BW", name:"Botswana",     currency:"BWP", active:true,  locale:"en-BW",
      locations:"botswana_locations.js", whatsappChannel:"", flag:"botswana-bw" },
    { code:"ZA", name:"South Africa", currency:"ZAR", active:false, flag:"south-africa-za" },
    { code:"ZW", name:"Zimbabwe",     currency:"USD", active:true,  locale:"en-ZW",
      locations:"zimbabwe_locations.js", flag:"zimbabwe-zw" },
    { code:"MW", name:"Malawi",       currency:"MWK", active:false, flag:"malawi-mw" },
    { code:"KE", name:"Kenya",        currency:"KES", active:false, flag:"kenya-ke" },
    { code:"NG", name:"Nigeria",      currency:"NGN", active:false, flag:"nigeria-ng" },
    { code:"GH", name:"Ghana",        currency:"GHS", active:false, flag:"ghana-gh" },
    { code:"MU", name:"Mauritius",    currency:"MUR", active:false, flag:"mauritius-mu" }
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

  /* ---------- active-region settings ---------- */

  function activeCode(){
    return getActiveRegion().code;
  }

  function currency(){
    var r = getActiveRegion();
    return (r && r.currency) || "BWP";
  }

  /* The letter a page prints, not the ISO code: Botswana pages have always
     written "P", and a currency with no mapping falls back to its own code so
     nothing silently prints the wrong symbol. */
  var SYMBOLS = { BWP:"P", ZAR:"R", USD:"$", MWK:"MK", KES:"KSh",
                  NGN:"\u20a6", GHS:"\u20b5", MUR:"\u20a8" };

  function symbol(code){
    var cur = String(code || currency()).toUpperCase();
    return SYMBOLS[cur] || cur;
  }

  /** Region-aware price formatter — the one call site a page needs (T22b). */
  function money(v){
    return symbol() + (Number(v) || 0).toFixed(2);
  }

  function locale(){
    var r = getActiveRegion();
    return (r && r.locale) || "en-BW";
  }

  /** The location dataset the active region uses — null when it has none. */
  function locationsFile(){
    var r = getActiveRegion();
    return (r && r.locations) || null;
  }

  /** Does the active region have data for this directory? Unknown kinds stay
      available so a typo never hides a working directory. */
  function hasDirectory(kind){
    var list = DIRECTORY_REGIONS[String(kind || "").toLowerCase()];
    if (!list) return true;
    return list.indexOf(activeCode()) !== -1;
  }

  /* ---------- data gating ---------- */

  /**
   * Region code of one record. An unknown code and a record written before
   * gating both read as the default region, so no saved data disappears.
   */
  function recordRegion(record){
    var code = (record && record.region) ? String(record.region).toUpperCase() : "";
    if (!code || !byCode(code)) return DEFAULT_CODE;
    return code;
  }

  function inActiveRegion(record){
    return recordRegion(record) === activeCode();
  }

  /** The gate every data layer applies. Never returns a non-array. */
  function filterByRegion(list){
    if (!Array.isArray(list)) return [];
    return list.filter(inActiveRegion);
  }

  window.EatoutsRegions = {
    all: REGIONS.slice.bind(REGIONS),
    get: byCode,
    isActive: isActive,
    getActiveRegion: getActiveRegion,
    setActiveRegion: setActiveRegion,
    code: activeCode,
    currency: currency,
    symbol: symbol,
    money: money,
    locale: locale,
    locationsFile: locationsFile,
    hasDirectory: hasDirectory,
    recordRegion: recordRegion,
    inActiveRegion: inActiveRegion,
    filterByRegion: filterByRegion,
    DEFAULT_CODE: DEFAULT_CODE,
    STORE_KEY: STORE_KEY
  };
})();
