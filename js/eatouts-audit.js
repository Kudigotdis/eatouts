/* EatoutsAudit — client-side activity log for manager / operator / admin
   actions. Persisted to localStorage key "eatouts_audit_v1" (newest first).
   Records are capped at 500 entries to stay inside localStorage quotas. */
(function () {
  const KEY = 'eatouts_audit_v1';
  const CAP = 500;

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function persist(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(-CAP)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function who() {
    try {
      const A = window.EatoutsAuth;
      if (!A) return null;
      const u = (A.getUser && A.getUser()) || (A.currentSession && A.currentSession()) || null;
      if (!u) return null;
      return {
        userId: u.userId || u.id || '',
        name: [u.firstName, u.surname].filter(Boolean).join(' ') || u.name || '',
        type: u.type || u.platformRole || ''
      };
    } catch (e) {
      return null;
    }
  }

  window.EatoutsAudit = {
    KEY: KEY,

    log(action, entityId, before, after, meta) {
      const rec = {
        id: 'au-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7),
        ts: Date.now(),
        action: action || 'unknown',
        entityId: entityId == null ? '' : String(entityId),
        user: who(),
        before: before === undefined ? null : before,
        after: after === undefined ? null : after,
        meta: meta === undefined ? null : meta
      };
      const list = load();
      list.push(rec);
      persist(list);
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('eatouts:audit-saved', { detail: rec }));
      }
      return rec;
    },

    list(opts) {
      opts = opts || {};
      let out = load().slice().reverse();
      if (opts.entityId != null) out = out.filter(function (x) { return String(x.entityId) === String(opts.entityId); });
      if (opts.action) out = out.filter(function (x) { return x.action === opts.action; });
      if (opts.limit) out = out.slice(0, Number(opts.limit));
      return out;
    },

    clear() {
      persist([]);
    }
  };
})();