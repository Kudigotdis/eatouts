/* ============================================================
   EATOUTS ANALYTICS
   Central, local-first event tracker and dashboard builder.

   Everything runs against the local stores (EatoutsMgrDB / the
   EatoutsDB adapter / EatoutsFeedback). There is no backend, so
   every aggregate is explicitly flagged offline:true and dashboards
   must not present these numbers as live server metrics.

   Events are appended to localStorage key
   "eatouts_analytics_events_v1" (capped, newest kept) and echoed on
   the "eatouts:analytics" event for live views.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'eatouts_analytics_events_v1';
  var CAP = 1000;

  function currentUserId() {
    try {
      if (window.EatoutsAuth) {
        if (EatoutsAuth.getActiveSession) return EatoutsAuth.getActiveSession();
        if (EatoutsAuth.getUser) { var u = EatoutsAuth.getUser(); return (u && u.id) || null; }
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function currentBusinessId() {
    try {
      if (window.EatoutsAuth && EatoutsAuth.getActiveBusiness) {
        var b = EatoutsAuth.getActiveBusiness();
        return (b && b.id) || null;
      }
    } catch (e) { /* ignore */ }
    return null;
  }

  function currency() {
    try { return ((EatoutsMgrDB.get().settings || {}).currency) || 'BWP'; } catch (e) { return 'BWP'; }
  }

  function collection(name) {
    try { if (window.EatoutsMgrDB) return EatoutsMgrDB.collection(name); } catch (e) { /* ignore */ }
    return [];
  }

  function buffer() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }

  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP))); } catch (e) { /* ignore */ }
  }

  function safeProps(props) {
    var out = {};
    if (!props || typeof props !== 'object') return out;
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (typeof v === 'string' && v.length > 240) v = v.slice(0, 240);
      out[k] = v;
    });
    return out;
  }

  /** Record a meaningful event. Returns the stored record. */
  function track(event, props, opts) {
    opts = opts || {};
    var rec = {
      eventName: String(event || 'event'),
      at: opts.at || new Date().toISOString(),
      userId: opts.userId || currentUserId(),
      businessId: opts.businessId || currentBusinessId(),
      properties: safeProps(props)
    };
    var list = buffer();
    list.push(rec);
    persist(list);
    try { document.dispatchEvent(new CustomEvent('eatouts:analytics', { detail: rec })); } catch (e) { /* ignore */ }
    return rec;
  }

  function all() { return buffer(); }

  function since(iso) {
    var t = Date.parse(iso);
    if (isNaN(t)) return all();
    return buffer().filter(function (e) { return Date.parse(e.at) >= t; });
  }

  function count(eventName, iso) {
    var list = iso ? since(iso) : all();
    return list.filter(function (e) { return e.eventName === eventName; }).length;
  }

  function clear() { persist([]); }

  function countBy(list, field) {
    var out = {};
    list.forEach(function (x) {
      var k = String(x[field] == null ? 'unknown' : x[field]);
      out[k] = (out[k] || 0) + 1;
    });
    return out;
  }

  function sum(list, field) {
    return list.reduce(function (n, x) { return n + Number(x[field] || 0); }, 0);
  }

  /** Real, business-scoped aggregates from stored records. */
  function businessMetrics(businessId) {
    var id = businessId || currentBusinessId();
    var orders = collection('orders').filter(function (o) { return String(o.businessId || o.bizId) === String(id); });
    var deliveries = collection('deliveries').filter(function (d) { return String(d.businessId || d.bizId) === String(id); });
    var feedback = [];
    try { if (window.EatoutsFeedback && EatoutsFeedback.all) feedback = EatoutsFeedback.all().filter(function (f) { return String(f.businessId || f.bizId) === String(id); }); } catch (e) { /* ignore */ }
    var reviews = collection('reviews').filter(function (r) { return String(r.businessId || r.bizId) === String(id); });
    return {
      businessId: id,
      currency: currency(),
      orders: { total: orders.length, value: sum(orders, 'total'), byStatus: countBy(orders, 'status') },
      deliveries: { total: deliveries.length, byStatus: countBy(deliveries, 'status') },
      feedback: { total: feedback.length },
      reviews: { total: reviews.length, averageStars: reviews.length ? (sum(reviews, 'stars') / reviews.length) : 0 },
      offline: true,
      note: 'Local records only. Backend metrics (impressions, unique visitors, cross-device totals) are unavailable offline.'
    };
  }

  /** Real, cross-platform aggregates from stored records. */
  function platformMetrics() {
    var businesses = collection('businesses');
    var users = collection('users');
    var orders = collection('orders');
    var deliveries = collection('deliveries');
    var towns = {};
    businesses.forEach(function (b) {
      var t = String((b.location && b.location.town) || b.town || 'unlisted');
      towns[t] = (towns[t] || 0) + 1;
    });
    return {
      currency: currency(),
      users: users.length,
      businesses: businesses.length,
      businessesByType: countBy(businesses, 'type'),
      businessesByTown: towns,
      orders: { total: orders.length, value: sum(orders, 'total'), byStatus: countBy(orders, 'status') },
      deliveries: { total: deliveries.length, byStatus: countBy(deliveries, 'status') },
      trackedEvents: all().length,
      offline: true,
      note: 'Local records only. Cross-platform metrics are derived from this device\'s stored data, not a server.'
    };
  }

  window.EatoutsAnalytics = {
    KEY: KEY,
    track: track,
    all: all,
    since: since,
    count: count,
    clear: clear,
    countBy: countBy,
    sum: sum,
    businessMetrics: businessMetrics,
    platformMetrics: platformMetrics
  };
})();
