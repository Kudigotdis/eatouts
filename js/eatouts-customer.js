/* ============================================================
   EATOUTS CUSTOMER
   Client for the regular-user ("customer") account API plus a
   local-first store for favourites, saved summaries and saved
   events.

   Dual-mode by design:
     * When the Cloudflare backend is reachable (AfterEndpoints in
       functions/api/), calls hit the server and the account is
       real.
     * When it is not (static / offline / demo), everything falls
       back to localStorage so the app keeps working.

   Loaded by index.html, the manager pages and the event builder.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'eatouts_customer_v1';
  var API_BASE = '/api';
  var EVENT = 'eatouts:customer-changed';

  var state = {
    user: null,
    backend: false,
    favourites: [],
    summaries: [],
    events: [],
    loaded: false
  };

  /* ---------- tiny helpers ---------- */

  function shallowCopy(o) { return Object.assign({}, o || {}); }

  function emit() {
    if (typeof window === 'undefined' || !window.dispatchEvent) return;
    var ev;
    try { ev = new CustomEvent(EVENT, { detail: state }); }
    catch (e) { ev = document.createEvent('Event'); ev.initEvent(EVENT, true, true); ev.detail = state; }
    window.dispatchEvent(ev);
  }

  function readLocal() {
    try {
      var raw = (typeof localStorage !== 'undefined') && localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }

  function writeLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        user: state.user,
        favourites: state.favourites,
        summaries: state.summaries,
        events: state.events
      }));
    } catch (e) { /* quota / disabled storage: ignore */ }
  }

  function applyLocal() {
    var d = readLocal();
    state.user = d.user || null;
    state.favourites = Array.isArray(d.favourites) ? d.favourites : [];
    state.summaries = Array.isArray(d.summaries) ? d.summaries : [];
    state.events = Array.isArray(d.events) ? d.events : [];
  }

  function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8);
  }

  /* ---------- fetch wrapper ---------- */

  function hasFetch() {
    return typeof fetch === 'function';
  }

  function api(path, opts) {
    if (!hasFetch()) return Promise.resolve({ status: 0, ok: false, data: {} });
    var options = Object.assign({ credentials: 'include', headers: {} }, opts || {});
    if (options.body && typeof options.body !== 'string') {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(API_BASE + path, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    });
  }

  /* ---------- auth ---------- */

  function refresh() {
    return api('/me').then(function (r) {
      if (r.ok && r.data && r.data.user) {
        state.backend = true;
        state.user = r.data.user;
        state.loaded = true;
        writeLocal();
        emit();
        return state.user;
      }
      /* backend answered "no session" -> stay in local mode */
      state.backend = r.ok;
      return state.user;
    }).catch(function () {
      state.backend = false;
      return state.user;
    });
  }

  function signup(data) {
    return api('/auth/signup', { method: 'POST', body: data }).then(function (r) {
      if (r.ok && r.data && r.data.user) onAuthed(r.data.user);
      return r.data;
    });
  }

  function verify(data) {
    return api('/auth/verify', { method: 'POST', body: data }).then(function (r) {
      if (r.ok && r.data && r.data.user) onAuthed(r.data.user);
      return r.data;
    });
  }

  function login(data) {
    return api('/auth/login', { method: 'POST', body: data }).then(function (r) {
      if (r.ok && r.data && r.data.user) onAuthed(r.data.user);
      return r.data;
    });
  }

  function logout() {
    return api('/auth/logout', { method: 'POST' }).catch(function () { return {}; })
      .then(function () {
        state.user = null;
        state.backend = false;
        /* keep favourites/summaries on this device; only the session ends */
        writeLocal();
        emit();
        return { ok: true };
      });
  }

  /* Mirror a server-signed-in customer into the local manager store so the
     existing EO.guard()-based pages keep working during the transition. */
  function bridgeLocal() {
    var u = state.user;
    if (!u || !u.id) return;
    try {
      if (typeof window !== 'undefined' && window.EatoutsUsers && !window.EatoutsUsers.find(u.id)) {
        var p = u.profile || {};
        window.EatoutsUsers.create({
          id: u.id,
          firstName: p.firstName || u.name || '',
          surname: p.surname || '',
          dob: p.dob || '',
          gender: p.gender || 'Prefer not to say',
          town: p.town || '',
          area: p.area || '',
          whatsapp: u.whatsapp || '',
          contacts: p.contacts || [],
          email: u.email || '',
          type: 'customer',
          roles: ['customer'],
          username: u.username || ''
        });
      }
      if (window.EatoutsAuth && window.EatoutsAuth.startSession) window.EatoutsAuth.startSession(u);
    } catch (e) { /* local mirroring is best-effort */ }
  }

  function onAuthed(user) {
    state.user = user;
    state.backend = true;
    state.loaded = true;
    writeLocal();
    bridgeLocal();
    emit();
    pull();
  }

  function updateProfile(patch) {
    if (state.backend) {
      return api('/me', { method: 'PATCH', body: patch }).then(function (r) {
        if (r.ok && r.data && r.data.user) { state.user = r.data.user; writeLocal(); emit(); }
        return r.data;
      }).catch(function () {
        return localProfile(patch);
      });
    }
    return Promise.resolve(localProfile(patch));
  }

  function localProfile(patch) {
    var u = shallowCopy(state.user || {});
    var p = shallowCopy(u.profile || {});
    Object.keys(patch || {}).forEach(function (k) { p[k] = patch[k]; });
    u.profile = p;
    if (patch && (patch.firstName || patch.surname)) {
      u.name = String((p.firstName || '') + ' ' + (p.surname || '')).trim();
    }
    state.user = u;
    writeLocal();
    emit();
    return { ok: true, user: u };
  }

  /* ---------- store: favourites / summaries / events ---------- */

  function pull() {
    if (!state.backend) return Promise.resolve(state);
    return Promise.all([
      api('/customer/favourites').catch(function () { return {}; }),
      api('/customer/summaries').catch(function () { return {}; }),
      api('/customer/events').catch(function () { return {}; })
    ]).then(function (res) {
      var f = res[0].data, s = res[1].data, e = res[2].data;
      if (f && Array.isArray(f.favourites)) state.favourites = f.favourites;
      if (s && Array.isArray(s.summaries)) state.summaries = s.summaries;
      if (e && Array.isArray(e.events)) state.events = e.events;
      writeLocal();
      emit();
      return state;
    });
  }

  function favKey(item) { return String(item.type || '') + ':' + String(item.refId || item.ref_id || ''); }

  function has(item) {
    var k = favKey(item);
    return state.favourites.some(function (f) { return favKey(f) === k; });
  }

  function toggle(item) {
    if (has(item)) return removeFav(item);
    var entry = shallowCopy(item);
    entry.id = entry.id || uid('fav');
    entry.created_at = Date.now();
    state.favourites.unshift(entry);
    writeLocal(); emit();
    if (state.backend) {
      api('/customer/favourites', { method: 'POST', body: entry })
        .then(function (r) { if (r.ok && r.data && r.data.id) { entry.id = r.data.id; writeLocal(); } })
        .catch(function () { /* stays local until next sync */ });
    }
    return Promise.resolve({ ok: true, added: true, item: entry });
  }

  function removeFav(item) {
    var k = favKey(item);
    state.favourites = state.favourites.filter(function (f) { return favKey(f) !== k; });
    writeLocal(); emit();
    if (state.backend) {
      api('/customer/favourites?type=' + encodeURIComponent(item.type) +
        '&ref=' + encodeURIComponent(item.refId || item.ref_id), { method: 'DELETE' })
        .catch(function () { });
    }
    return Promise.resolve({ ok: true, added: false });
  }

  function listFavourites(type) {
    if (!type) return state.favourites.slice();
    return state.favourites.filter(function (f) { return f.type === type; });
  }

  function addSummary(payload) {
    var entry = shallowCopy(payload);
    entry.id = entry.id || uid('sum');
    entry.created_at = entry.created_at || Date.now();
    state.summaries.unshift(entry);
    writeLocal(); emit();
    if (state.backend) {
      api('/customer/summaries', { method: 'POST', body: entry })
        .then(function (r) { if (r.ok && r.data && r.data.id) { entry.id = r.data.id; writeLocal(); } })
        .catch(function () { });
    }
    return Promise.resolve({ ok: true, item: entry });
  }

  function removeSummary(id) {
    state.summaries = state.summaries.filter(function (s) { return s.id !== id; });
    writeLocal(); emit();
    if (state.backend) api('/customer/summaries/' + id, { method: 'DELETE' }).catch(function () { });
    return Promise.resolve({ ok: true });
  }

  function saveEvent(payload) {
    var entry = shallowCopy(payload);
    entry.id = entry.id || uid('evt');
    entry.created_at = entry.created_at || Date.now();
    var key = String(entry.eventRef || entry.event_ref || entry.id);
    var i = state.events.findIndex(function (e) {
      return String(e.eventRef || e.event_ref || e.id) === key;
    });
    if (i >= 0) state.events[i] = entry; else state.events.unshift(entry);
    writeLocal(); emit();
    if (state.backend) {
      api('/customer/events', { method: 'POST', body: entry }).catch(function () { });
    }
    return Promise.resolve({ ok: true, item: entry });
  }

  function removeEvent(ref) {
    var key = String(ref);
    state.events = state.events.filter(function (e) {
      return String(e.eventRef || e.event_ref || e.id) !== key;
    });
    writeLocal(); emit();
    if (state.backend) api('/customer/events/' + encodeURIComponent(key), { method: 'DELETE' }).catch(function () { });
    return Promise.resolve({ ok: true });
  }

  /* ---------- init ---------- */

  function init() {
    applyLocal();
    bridgeLocal();
    emit();
    return refresh().then(function () {
      bridgeLocal();
      return pull();
    }).catch(function () { return state; });
  }

  var ready = init();

  var apiObj = {
    KEY: KEY,
    EVENT: EVENT,
    state: state,
    ready: ready,
    init: init,
    refresh: refresh,
    pull: pull,
    getUser: function () { return state.user; },
    isSignedIn: function () { return !!state.user; },
    signup: signup,
    verify: verify,
    login: login,
    logout: logout,
    updateProfile: updateProfile,
    favourites: {
      list: listFavourites,
      has: has,
      toggle: toggle,
      add: function (item) { if (!has(item)) return toggle(item); return Promise.resolve({ ok: true, added: true }); },
      remove: removeFav
    },
    summaries: { list: function () { return state.summaries.slice(); }, add: addSummary, remove: removeSummary },
    events: { list: function () { return state.events.slice(); }, save: saveEvent, remove: removeEvent },
    onChange: function (fn) {
      if (typeof window === 'undefined' || !window.addEventListener) return;
      window.addEventListener(EVENT, function (e) { fn(e.detail); });
    }
  };

  if (typeof window !== 'undefined') {
    if (window.EatoutsCustomer) {
      /* someone already booted us (script included twice) - keep first */
      apiObj = window.EatoutsCustomer;
    } else {
      window.EatoutsCustomer = apiObj;
    }
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = apiObj;
})();
