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
    addresses: [],
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
        events: state.events,
        addresses: state.addresses
      }));
    } catch (e) { /* quota / disabled storage: ignore */ }
  }

  function applyLocal() {
    var d = readLocal();
    state.user = d.user || null;
    state.favourites = Array.isArray(d.favourites) ? d.favourites : [];
    state.summaries = Array.isArray(d.summaries) ? d.summaries : [];
    state.events = Array.isArray(d.events) ? d.events : [];
    state.addresses = Array.isArray(d.addresses) ? d.addresses : [];
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
      if (r.ok && r.data && r.data.user) { onAuthed(r.data.user); return r.data; }
      /* Backend reachable but unconfigured, or no fetch at all: use a local account. */
      if ((r.data && r.data.error === 'backend_not_configured') || r.status === 0) return loginLocal(data);
      return r.data;
    }).catch(function () {
      /* Offline / network failure: fall back to a locally-created account. */
      return loginLocal(data);
    });
  }

  /* ---------- password reset ---------- */

  /* Ask the server to email a reset link. The server always answers with the
     same generic message, so this call never reveals whether an account
     exists for the address. */
  function passwordReset(data) {
    var body = { email: String((data && data.email) || '').trim() };
    return api('/auth/password-reset', { method: 'POST', body: body })
      .then(function (r) {
        if (r.status === 0) {
          return { ok: false, error: 'Password reset needs a connection to the EatOuts server.' };
        }
        return normaliseResetResult(r);
      })
      .catch(function () {
        return { ok: false, error: 'Could not reach the EatOuts server. Try again shortly.' };
      });
  }

  /* Set the new password with the token from the emailed link. */
  function passwordResetConfirm(data) {
    var body = {
      token: String((data && data.token) || '').trim(),
      password: String((data && data.password) || '')
    };
    return api('/auth/password-reset/confirm', { method: 'POST', body: body })
      .then(function (r) {
        if (r.status === 0) {
          return { ok: false, error: 'Password reset needs a connection to the EatOuts server.' };
        }
        return normaliseResetResult(r);
      })
      .catch(function () {
        return { ok: false, error: 'Could not reach the EatOuts server. Try again shortly.' };
      });
  }

  /* The API answers with `error`; the login page reads `message`. */
  function normaliseResetResult(r) {
    var data = (r && r.data) || {};
    var out = Object.assign({}, data);
    out.ok = !!r.ok;
    if (!out.ok && !out.message && out.error) out.message = out.error;
    return out;
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
        var biz = u.type === 'business';
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
          type: u.type || 'customer',
          roles: biz ? ['biz_owner'] : ['customer'],
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

  /* Local-only sign-in against a locally-created account (B2). Mirrors the
     server result shape so the login page can treat it identically. */
  function setLocalUser(user) {
    state.user = user;
    state.backend = false;
    state.loaded = true;
    writeLocal();
    bridgeLocal();
    emit();
    return user;
  }

  function loginLocal(data) {
    if (typeof window === 'undefined' || !window.EatoutsUsers || !window.EatoutsAuth || !EatoutsAuth.hashPassword) {
      return Promise.resolve({ ok: false, error: 'backend_not_configured' });
    }
    var username = String((data && data.username) || '').trim().toLowerCase();
    var wa = String((data && (data.whatsapp || data.phone)) || '').replace(/\D/g, '');
    var password = String((data && data.password) || '');
    /* All three identifiers are mandatory: username AND WhatsApp AND password. */
    if (!username || !wa || !password) {
      return Promise.resolve({ ok: false, error: 'Enter your username, WhatsApp number and password.' });
    }
    var candidates = (EatoutsUsers.all() || []).filter(function (u) {
      if (!u || !u.passwordHash || !u.salt) return false;
      var nameMatch = String(u.username || '').toLowerCase() === username;
      var waMatch = String(u.whatsapp || '').replace(/\D/g, '') === wa;
      return nameMatch && waMatch;
    });
    if (!candidates.length) return Promise.resolve({ ok: false, error: 'notfound' });
    return candidates.reduce(function (chain, u) {
      return chain.then(function (found) {
        if (found) return found;
        return EatoutsAuth.hashPassword(password, u.salt).then(function (h) {
          return h === u.passwordHash ? u : null;
        });
      });
    }, Promise.resolve(null)).then(function (u) {
      if (!u) return { ok: false, error: 'badpassword' };
      var user = {
        id: u.id,
        username: u.username || '',
        name: String((u.firstName || '') + ' ' + (u.surname || '')).trim(),
        whatsapp: u.whatsapp || '',
        email: u.email || '',
        type: 'customer',
        local: true
      };
      setLocalUser(user);
      return { ok: true, user: user, route: 'eatouts-profile.html' };
    });
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
      api('/customer/events').catch(function () { return {}; }),
      api('/customer/addresses').catch(function () { return {}; })
    ]).then(function (res) {
      var f = res[0].data, s = res[1].data, e = res[2].data, a = res[3].data;
      if (f && Array.isArray(f.favourites)) state.favourites = f.favourites;
      if (s && Array.isArray(s.summaries)) state.summaries = s.summaries;
      if (e && Array.isArray(e.events)) state.events = e.events;
      if (a && Array.isArray(a.addresses)) state.addresses = a.addresses;
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

  /* ---------- store: addresses ---------- */

  function addrList() { return state.addresses.slice(); }

  function addrSave(payload) {
    var entry = shallowCopy(payload);
    entry.id = entry.id || ('AD-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));
    var ts = Date.now();
    if (entry.created_at == null) entry.created_at = ts;
    entry.updated_at = ts;
    var i = state.addresses.findIndex(function (x) { return x.id === entry.id; });
    var isNew = i < 0;
    if (isNew) state.addresses.unshift(entry); else state.addresses[i] = entry;
    writeLocal(); emit();
    if (!state.backend) return Promise.resolve({ ok: true, item: entry, local: true });
    var call = isNew
      ? api('/customer/addresses', { method: 'POST', body: entry })
      : api('/customer/addresses/' + encodeURIComponent(entry.id), { method: 'PATCH', body: entry });
    return call.then(function (r) {
      if (isNew && r.ok && r.data && r.data.id) {
        entry.id = r.data.id;
        writeLocal(); emit();
      }
      return { ok: r.ok, item: entry };
    }).catch(function () { return { ok: true, item: entry, local: true }; });
  }

  function addrRemove(id) {
    state.addresses = state.addresses.filter(function (x) { return x.id !== id; });
    writeLocal(); emit();
    if (state.backend) api('/customer/addresses/' + encodeURIComponent(id), { method: 'DELETE' }).catch(function () { });
    return Promise.resolve({ ok: true });
  }

  function addrPull() {
    if (!state.backend) return Promise.resolve(addrList());
    return api('/customer/addresses').then(function (r) {
      if (r.ok && r.data && Array.isArray(r.data.addresses)) {
        state.addresses = r.data.addresses;
        writeLocal(); emit();
      }
      return addrList();
    }).catch(function () { return addrList(); });
  }

  /* ---------- media upload (Supabase Storage via /api/upload) ---------- */

  function uploadFile(file, pathPrefix) {
    if (!hasFetch() || !file) return Promise.resolve(null);
    var name = String(file.name || '');
    var dot = name.lastIndexOf('.');
    var ext = dot >= 0 ? name.slice(dot).toLowerCase() : '';
    var path = String(pathPrefix || 'uploads') + '/' + uid('f') + ext;
    return fetch(API_BASE + '/upload?path=' + encodeURIComponent(path), {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: file
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        return (r.ok && d && d.ok && d.url) ? d.url : null;
      });
    }).catch(function () { return null; });
  }

  function uploadPhoto(file) {
    var id = (state.user && state.user.id) || 'anon';
    return uploadFile(file, 'customers/' + id);
  }

  function uploadAvatar(file, id) {
    var uid = id || (state.user && state.user.id);
    if (!file || !uid) return Promise.resolve(null);
    return uploadFile(file, 'customers/' + uid).then(function (res) {
      var keyOrUrl = res && res.url ? res.url : res;
      if (!keyOrUrl) return null;
      try {
        updateProfile({ photoKey: keyOrUrl, avatar: keyOrUrl, photo: keyOrUrl });
      } catch (e) {}
      return keyOrUrl;
    });
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
    passwordReset: passwordReset,
    passwordResetConfirm: passwordResetConfirm,
    logout: logout,
    uploadAvatar: uploadAvatar,
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
    addresses: { list: addrList, pull: addrPull, save: addrSave, remove: addrRemove },
    upload: uploadFile,
    uploadPhoto: uploadPhoto,
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
