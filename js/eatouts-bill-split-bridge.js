/* js/eatouts-bill-split-bridge.js
 *
 * Parent-side coordinator for the Split-the-Bill overlay.
 *
 * The full bridge (people, assignments, WhatsApp formatting) lives inside
 * bill-split.html. This file exposes what the SPA and tests need:
 *   open({source}) opens the overlay and points the iframe at bill-split.html
 *   close() closes it and resets the iframe
 *   snapshot() returns {itemCount, total, ...} for the ACTIVE cart
 *   signedIn() reports whether the visitor is authenticated
 *   sharePerson/sendWhatsApp/saveSummary return 'auth_required' for guests
 *   and delegate to the iframe's bridge otherwise.
 */
(function(){
  "use strict";
  var HOST_ID  = "billSplitHost";
  var FRAME_ID = "billSplitFrame";
  var VERSION  = "20261108";

  function hostEl(){  return document.getElementById(HOST_ID);  }
  function frameEl(){ return document.getElementById(FRAME_ID); }
  function iframeBridge(){
    var f = frameEl();
    var cw = f && f.contentWindow;
    return cw && cw.EatoutsBillSplitBridge;
  }

  function open(opts){
    opts = opts || {};
    var h = hostEl(), f = frameEl();
    if (!h || !f) return false;
    var q = "v=" + VERSION;
    if (opts.source) q += "&from=" + encodeURIComponent(opts.source);
    if (opts.venue)  q += "&venue=" + encodeURIComponent(opts.venue);
    f.src = "bill-split.html?" + q;
    h.classList.add("on");
    h.setAttribute("aria-hidden", "false");
    return true;
  }

  function close(){
    var h = hostEl(), f = frameEl();
    if (f) f.src = "about:blank";
    if (h){ h.classList.remove("on"); h.setAttribute("aria-hidden", "true"); }
    return true;
  }

  function isSignedIn(){
    if (typeof window.aboutUser === "function"){ try { return !!window.aboutUser(); } catch (e) {} }
    if (window.EatoutsAuth){
      var A = window.EatoutsAuth;
      if (typeof A.user === "function"){ try { return !!A.user(); } catch (e) {} }
      if (typeof A.current === "function"){ try { return !!A.current(); } catch (e) {} }
      if (A.currentUser) return true;
    }
    if (window.currentUser) return true;
    return false;
  }

  function snapshot(){
    /* Prefer the iframe's bridge when it is loaded and live. */
    var B = iframeBridge();
    if (B && typeof B.snapshot === "function"){
      try {
        var s = B.snapshot();
        if (s && typeof s.itemCount === "number") return s;
      } catch (e) {}
    }
    /* Otherwise compute from the parent's cart for the active source. */
    var itemCount = 0, total = 0;
    try {
      if (typeof bevCartCount === "function")  itemCount = bevCartCount();
      if (typeof bevCartTotal === "function")  total     = bevCartTotal();
    } catch (e) {}
    return { itemCount: itemCount, total: total, people: [], lines: [], restaurant: {} };
  }

  function sharePerson(id){
    if (!isSignedIn()) return "auth_required";
    var B = iframeBridge();
    if (B && typeof B.sharePerson === "function"){
      try { return B.sharePerson(id); } catch (e) {}
    }
    return false;
  }

  function sendWhatsApp(vals){
    if (!isSignedIn()) return "auth_required";
    var B = iframeBridge();
    if (B && typeof B.sendWhatsApp === "function"){
      try { return B.sendWhatsApp(vals); } catch (e) {}
    }
    return false;
  }

  function saveSummary(){
    if (!isSignedIn()) return "auth_required";
    var B = iframeBridge();
    if (B && typeof B.saveSummary === "function"){
      try { return B.saveSummary(); } catch (e) {}
    }
    return false;
  }

  window.EatoutsBillSplitBridge = {
    open: open,
    close: close,
    signedIn: isSignedIn,
    snapshot: snapshot,
    sharePerson: sharePerson,
    sendWhatsApp: sendWhatsApp,
    saveSummary: saveSummary
  };
})();
