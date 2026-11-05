/* EatoutsCurrency — the display currency for the active region.
 *
 * Botswana prices are stored in pula, so BW pages print "P12.00" and are not
 * affected by anything here.
 *
 * Zimbabwe prices are stored in USD (the directory payload is built in USD, see
 * scripts/build_zimbabwe_directory.py). A ZW user can show them as USD, or
 * converted to ZiG at one of the two baselines in
 * assets/Zimbabwe/rates-zig.json:
 *
 *   official      26.54 ZiG per USD   (RBZ)
 *   alternative   25.00 ZiG per USD   (parallel market)
 *
 * The choice is persisted under localStorage 'eatouts.currency.v1'. fmt() is the
 * single formatter: index.html's fmt() delegates to it, and the header pill
 * (#curPill) only appears in Zimbabwe.
 */
(function(){
  "use strict";

  var STORE_KEY = "eatouts.currency.v1";
  var RATES_PATH = "assets/Zimbabwe/rates-zig.json";
  var OFFICIAL_FALLBACK = 26.54;
  var ALTERNATIVE_FALLBACK = 25.00;
  var MODES = ["USD", "ZIG_OFFICIAL", "ZIG_MARKET"];

  var rates = { official: OFFICIAL_FALLBACK, alternative: ALTERNATIVE_FALLBACK };
  var mode = "USD";

  function regionCode(){
    var R = window.EatoutsRegions;
    if (R && typeof R.code === "function") return String(R.code()).toUpperCase();
    return "BW";
  }

  function isZimbabwe(){
    return regionCode() === "ZW";
  }

  function load(){
    var stored = "";
    try { stored = String(localStorage.getItem(STORE_KEY) || "").toUpperCase(); } catch (e) {}
    mode = MODES.indexOf(stored) > -1 ? stored : "USD";
  }

  function save(){
    try { localStorage.setItem(STORE_KEY, mode); } catch (e) {}
  }

  /* The baselines come from the same file the directory build reads, so the
     pill and the payload can never disagree about the rate. A missing file
     leaves the fallbacks above in place. */
  function loadRates(){
    if (typeof fetch !== "function") return;
    fetch(RATES_PATH)
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        var official = data && data.rates && data.rates.official && Number(data.rates.official.baseline);
        var alternative = data && data.rates && data.rates.alternative && Number(data.rates.alternative.baseline);
        if (official > 0) rates.official = official;
        if (alternative > 0) rates.alternative = alternative;
        syncPill();
      })
      .catch(function(){ /* rates file unavailable: fallbacks stand */ });
  }

  /** ZiG per USD for the current mode; 1 while prices are shown in USD. */
  function rate(){
    if (mode === "ZIG_OFFICIAL") return rates.official;
    if (mode === "ZIG_MARKET") return rates.alternative;
    return 1;
  }

  /** The pill's label: "$ USD", "ZiG 26.54" or "ZiG 25.00". */
  function label(){
    if (!isZimbabwe()) return "";
    if (mode === "ZIG_OFFICIAL") return "ZiG " + rates.official.toFixed(2);
    if (mode === "ZIG_MARKET") return "ZiG " + rates.alternative.toFixed(2);
    return "$ USD";
  }

  /** The one price formatter: "P12.00" (BW), "$12.00" or "ZiG 318.48" (ZW). */
  function fmt(value){
    var amount = Number(value) || 0;
    if (!isZimbabwe()) {
      var R = window.EatoutsRegions;
      var symbol = R && typeof R.symbol === "function" ? R.symbol() : "P";
      return symbol + amount.toFixed(2);
    }
    if (mode === "USD") return "$" + amount.toFixed(2);
    return "ZiG " + (amount * rate()).toFixed(2);
  }

  function syncPill(){
    var el = document.getElementById("curPill");
    if (!el) return;
    var on = isZimbabwe();
    el.hidden = !on;
    if (on) el.textContent = label();
  }

  /** $ USD -> ZiG 26.54 -> ZiG 25.00 -> $ USD. */
  function cycle(){
    if (!isZimbabwe()) return mode;
    mode = mode === "USD" ? "ZIG_OFFICIAL" : mode === "ZIG_OFFICIAL" ? "ZIG_MARKET" : "USD";
    save();
    syncPill();
    return mode;
  }

  /** Read the stored mode, fetch the rates and paint the pill. */
  function mount(){
    load();
    loadRates();
    syncPill();
  }

  window.EatoutsCurrency = {
    STORE_KEY: STORE_KEY,
    RATES_PATH: RATES_PATH,
    mount: mount,
    fmt: fmt,
    cycle: cycle,
    rate: rate,
    label: label,
    isZimbabwe: isZimbabwe,
    mode: function(){ return mode; },
    baselines: function(){ return { official: rates.official, alternative: rates.alternative }; },
    sync: syncPill
  };
})();
