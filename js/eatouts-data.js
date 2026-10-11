/* EatoutsData — unified access layer bridging the customer venue store
   (EatoutsDB / "eatouts_db_v2") and the manager store
   (EatoutsMgrDB / "eatouts_manager_v1") behind one API added to EatoutsDB:

       EatoutsDB.collection(name)  -> live array of records
       EatoutsDB.find(name, id)    -> single record or null
       EatoutsDB.upsert(name, doc) -> insert/merge by id (persists)
       EatoutsDB.remove(name, id)  -> delete by id (persists)

   The collection "restaurants" maps to the customer venue store; every other
   name (businesses, users, staff, orders, deliveries, ...) maps to the
   canonical manager store. Also layers EatoutsBlog.all() over the two blog
   storages, centers EatoutsFeedback.all() on the manager "feedback" collection
   plus legacy spec keys, migrates legacy feedback once, canonicalizes stored
   business/vendor types via EatoutsBusinessTypes, and audits curated write
   paths through EatoutsAudit.

   Safe to load on any page: never deletes legacy keys, never clobbers an
   existing richer implementation. */
(function () {
  const mgr = function () { return window.EatoutsMgrDB || null; };
  const root = function () { return window.EatoutsDB || null; };

  function patch(target) {
    if (!target) return;

    function restaurantsCollection() {
      const db = target.load ? target.load() : null;
      if (db && !db.restaurants) db.restaurants = [];
      return db ? db.restaurants : [];
    }

    function collection(name) {
      if (name === 'restaurants') return restaurantsCollection();
      const m = mgr();
      return m && m.collection ? m.collection(name) : [];
    }

    function find(name, id) {
      const m = mgr();
      if (name === 'restaurants') {
        if (target.getRestaurant) return target.getRestaurant(id);
        return restaurantsCollection().find(function (r) { return String(r.id) === String(id); }) || null;
      }
      return m ? m.find(name, id) : null;
    }

    function audit(name, action, docId, before, after) {
      try {
        if (window.EatoutsAudit && window.EatoutsAudit.log) {
          window.EatoutsAudit.log(action + ':' + name, docId, before, after, null);
        }
      } catch (e) { /* non-fatal */ }
    }

    function upsert(name, doc) {
      if (!doc || doc.id == null) return doc;
      if (name === 'restaurants') {
        const db = target.load ? target.load() : null;
        if (!db) return doc;
        if (!Array.isArray(db.restaurants)) db.restaurants = [];
        const i = db.restaurants.findIndex(function (r) { return String(r.id) === String(doc.id); });
        const before = i >= 0 ? { id: db.restaurants[i].id } : null;
        if (i < 0) db.restaurants.push(doc);
        else db.restaurants[i] = Object.assign({}, db.restaurants[i], doc);
        if (target.save) target.save(db);
        audit('restaurants', 'upsert', doc.id, before, { id: doc.id });
        return doc;
      }
      const m = mgr();
      if (m && m.upsert) {
        m.upsert(name, doc);
        return doc;
      }
      return doc;
    }

    function remove(name, id) {
      if (name === 'restaurants') {
        const db = target.load ? target.load() : null;
        if (!db) return false;
        const before = (db.restaurants || []).find(function (r) { return String(r.id) === String(id); }) || null;
        db.restaurants = (db.restaurants || []).filter(function (r) { return String(r.id) !== String(id); });
        if (target.save) target.save(db);
        audit('restaurants', 'remove', id, before ? { id: before.id } : null, null);
        return true;
      }
      const m = mgr();
      if (m && m.remove) {
        m.remove(name, id);
        return true;
      }
      return false;
    }

    /* Curated collections that get a central audit entry on every change. */
    const AUDIT_COLLECTIONS = { users: 1, businesses: 1, feedback: 1, staff: 1, blog: 1 };

    /* Wrap the underlying manager store writes so direct page calls to
       EatoutsMgrDB.upsert/remove are audited too. */
    function wireAudit() {
      const m = mgr();
      if (!m || !window.EatoutsAudit) return;
      const origU = m.upsert, origR = m.remove;
      if (typeof origU === 'function') {
        m.upsert = function (name, doc) {
          const r = origU.call(this, name, doc);
          if (AUDIT_COLLECTIONS[name]) {
            try {
              const before = m.find ? m.find(name, doc && doc.id) : null;
              window.EatoutsAudit.log('upsert:' + name, doc && doc.id, before ? { id: before.id } : null, { id: doc && doc.id }, null);
            } catch (e) { /* non-fatal */ }
          }
          return r;
        };
      }
      if (typeof origR === 'function') {
        m.remove = function (name, id) {
          const before = m.find ? m.find(name, id) : null;
          const r = origR.call(this, name, id);
          if (AUDIT_COLLECTIONS[name]) {
            try {
              window.EatoutsAudit.log('remove:' + name, id, before ? { id: before.id } : null, null, null);
            } catch (e) { /* non-fatal */ }
          }
          return r;
        };
      }
    }

    /* Link a manager business to a customer venue, by slug or explicit
       restaurantId. Returns the linked venue (or null). Never deletes. */
    function linkBusiness(business) {
      if (!business) return null;
      let venue = null;
      const slug = business.slug || (business.identity && business.identity.slug) || '';
      if (slug && target.getRestaurantBySlug) {
        try { venue = target.getRestaurantBySlug(slug); } catch (e) { venue = null; }
      }
      if (!venue && business.restaurantId && target.getRestaurant) {
        try { venue = target.getRestaurant(business.restaurantId); } catch (e) { venue = null; }
      }
      if (venue && (!business.restaurantId || String(business.restaurantId) !== String(venue.id))) {
        upsert('businesses', Object.assign({}, business, { restaurantId: venue.id }));
      }
      return venue;
    }

    if (typeof target.collection !== 'function') target.collection = collection;
    if (typeof target.find !== 'function') target.find = find;
    if (typeof target.upsert !== 'function') target.upsert = upsert;
    if (typeof target.remove !== 'function') target.remove = remove;
    if (typeof target.linkBusiness !== 'function') target.linkBusiness = linkBusiness;
    wireAudit();
  }

  /* Expose EatoutsBlog.all(): union of the manager "blog" collection and
     the legacy eatouts_blog_posts_v1 spec key, deduped by id. */
  function wireBlog() {
    const B = window.EatoutsBlog;
    if (!B || typeof B.all === 'function') return;
    B.all = function () {
      const out = [];
      const seen = {};
      const push = function (p) {
        if (p && p.id != null && !seen[p.id]) { seen[p.id] = 1; out.push(p); }
      };
      const m = mgr();
      if (m && m.collection) (m.collection('blog') || []).forEach(push);
      try {
        const legacy = JSON.parse(localStorage.getItem('eatouts_blog_posts_v1') || '[]');
        if (Array.isArray(legacy)) legacy.forEach(push);
      } catch (e) { /* ignore */ }
      return out;
    };
  }

  /* One-time, idempotent link pass: attach restaurantId where a business has
     a matching venue. Guarded by a session tag so it runs once per visit. */
  function linkPass() {
    const d = root();
    const m = mgr();
    if (!d || !d.linkBusiness || !m) return;
    try {
      if (sessionStorage.getItem('eatouts:data-linked')) return;
      sessionStorage.setItem('eatouts:data-linked', '1');
      (m.collection('businesses') || []).forEach(function (b) {
        if (!b.restaurantId) d.linkBusiness(b);
      });
    } catch (e) { /* non-fatal */ }
  }

  /* Canonicalize stored business/vendor types once: write the normalized
     canonical slug back onto manager businesses and root venues where a
     legacy/descriptive form (bottle_store, food-truck, "Lodge / Hotel", ...)
     is stored. Read-only never; only enriches existing docs. */
  function normalizeTypePass() {
    const T = window.EatoutsBusinessTypes;
    if (!T || typeof T.normalize !== 'function') {
      /* business_types.js may load after this module; retry when DOM is ready. */
      const onReady = function () {
        window.removeEventListener('DOMContentLoaded', onReady);
        try { normalizeTypePass(); } catch (e2) { /* non-fatal */ }
      };
      try { window.addEventListener('DOMContentLoaded', onReady); } catch (e3) { /* ignore */ }
      return;
    }
    const m = mgr();
    const d = root();
    if (!d || !d.collection || !d.upsert) return;
    try {
      (function forEachBusiness() {
        if (!m || !m.collection) return;
        (m.collection('businesses') || []).forEach(function (b) {
          const raw = b.type || (b.businessType) || ((b.identity && b.identity.type));
          const canon = T.normalize(raw);
          if (raw !== canon && canon !== 'restaurant') d.upsert('businesses', Object.assign({}, b, { type: canon }));
        });
      })();
      (d.collection('restaurants') || []).forEach(function (r) {
        const raw = r.type || r.businessType;
        if (!raw) return;
        const canon = T.normalize(raw);
        if (raw !== canon && canon !== 'restaurant') d.upsert('restaurants', Object.assign({}, r, { type: canon }));
      });
    } catch (e) { /* non-fatal */ }
  }

  /* Migrate legacy feedback keys into the canonical manager "feedback"
     collection once (deduped by id/ref, legacy keys left intact). */
  function migrateTickets() {
    const m = mgr();
    if (!m || !m.collection || !m.upsert || !m.find) return;
    const LEGACY = ['eatouts_feedback_queue_v1', 'eatouts_feedback_v2'];
    try {
      const existing = new Map();
      (m.collection('feedback') || []).forEach(function (t) {
        existing.set(String(t.id || t.ref || ''), t);
      });
      LEGACY.forEach(function (key) {
        let arr = [];
        try { arr = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { arr = []; }
        if (!Array.isArray(arr)) return;
        arr.forEach(function (t) {
          if (!t) return;
          const k = String(t.id || t.ref || '');
          if (k && existing.has(k)) return;
          const canon = Object.assign({}, t, {
            migratedFrom: t.migratedFrom || key,
            status: t.status || 'open'
          });
          if (!canon.id) canon.id = canon.ref || ('FB-' + String(Date.now()).slice(-8) + '-' + Math.random().toString(36).slice(2, 5));
          m.upsert('feedback', canon);
          if (k) existing.set(k, canon);
        });
      });
    } catch (e) { /* non-fatal */ }
  }

  /* Centralize EatoutsFeedback.all(): union of the canonical manager
     "feedback" collection and the two legacy spec keys, deduped by id/ref,
     newest first. create/update keep writing the canonical collection. */
  function wireFeedback() {
    const F = window.EatoutsFeedback;
    const m = mgr();
    if (!F || !m) return;
    if (typeof F.all !== 'function' || F.all.__wired) return;
    const sorted = function (arr) {
      return arr.slice().sort(function (a, b) {
        return String(b.created || b.submittedAt || '').localeCompare(String(a.created || a.submittedAt || ''));
      });
    };
    F.all = function () {
      const out = [];
      const seen = new Map();
      const push = function (t) {
        if (!t) return;
        const k = String(t.id || t.ref || '');
        if (k && seen.has(k)) return;
        if (k) seen.set(k, t);
        out.push(t);
      };
      (m.collection('feedback') || []).forEach(push);
      ['eatouts_feedback_v2', 'eatouts_feedback_queue_v1'].forEach(function (key) {
        try {
          const arr = JSON.parse(localStorage.getItem(key) || '[]');
          if (Array.isArray(arr)) arr.forEach(push);
        } catch (e) { /* ignore */ }
      });
      return sorted(out);
    };
    F.all.__wired = true;
  }

  patch(root());
  wireBlog();
  wireFeedback();
  linkPass();
  normalizeTypePass();
  migrateTickets();
})();