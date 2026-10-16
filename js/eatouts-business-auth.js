/* ============================================================
   EATOUTS BUSINESS AUTH
   Establishes a real server (KV) session for business owners so the
   server-gated /api/business/* and /api/upload endpoints work, then
   mirrors the D1 user into the local manager store (EatoutsMgrDB) and
   starts the local session so the existing operator pages keep working.

   Dual-mode by design: when the backend is unreachable it returns
   { ok:false, backend:false } and callers fall back to local accounts.

   Loaded by the business sign-up page.
   ============================================================ */
(function () {
  'use strict';

  function hasFetch() { return typeof fetch === 'function'; }

  function normWa(raw) {
    var d = String(raw == null ? '' : raw).replace(/\D/g, '');
    if (d.indexOf('267') === 0 && d.length > 8) d = d.slice(3);
    if (d.charAt(0) === '0') d = d.slice(1);
    if (!/^[67]\d{7}$/.test(d)) return null;
    return '267' + d;
  }

  function nameParts(name) {
    var parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    return { first: parts.shift() || '', rest: parts.join(' ') };
  }

  function slugify(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
  }

  function usernameFor(name) {
    var base = slugify(name);
    if (base.length < 3) base = 'biz';
    return base.slice(0, 24) + String(Math.floor(100 + Math.random() * 900));
  }

  function call(path, body) {
    if (!hasFetch()) return Promise.resolve({ status: 0, ok: false, data: {} });
    return Promise.resolve().then(function () {
      return fetch('/api' + path, {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {})
      });
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    }).catch(function () {
      return { status: 0, ok: false, data: {} };
    });
  }

  /* Mirror a server (D1) user into the local manager store and start the
     local session so EO.guard()-based operator pages see the account. */
  function mirror(user) {
    if (!user || !user.id) return null;
    try {
      var p = user.profile || {};
      var parts = nameParts(user.name);
      var existing = (window.EatoutsUsers && window.EatoutsUsers.find(user.id)) || null;
      var rec = Object.assign({}, existing || {}, {
        id: user.id,
        username: user.username || (existing && existing.username) || '',
        firstName: p.firstName || (existing && existing.firstName) || parts.first,
        surname: p.surname || (existing && existing.surname) || parts.rest,
        whatsapp: user.whatsapp || (existing && existing.whatsapp) || '',
        email: user.email || (existing && existing.email) || '',
        type: user.type || 'business',
        status: (existing && existing.status) || 'active',
        roles: (existing && existing.roles && existing.roles.length)
          ? existing.roles
          : (user.type === 'business' ? ['biz_owner'] : ['customer'])
      });
      if (window.EatoutsUsers) {
        if (existing) window.EatoutsUsers.update(user.id, rec);
        else window.EatoutsUsers.create(rec);
      }
      if (window.EatoutsAuth && window.EatoutsAuth.startSession) window.EatoutsAuth.startSession(user);
    } catch (e) { /* local mirroring is best-effort */ }
    return user;
  }

  /* Create a business account on the server and start a session.
     Returns { ok, backend, user?, error? }. backend:false means the
     caller should fall back to a local account. */
  async function signup(opts) {
    opts = opts || {};
    if (!hasFetch()) return { ok: false, backend: false };
    var wa = normWa(opts.whatsapp);
    if (!wa) return { ok: false, backend: true, error: 'Enter a valid Botswana phone like 71 234 567.' };
    if (String(opts.password || '').length < 8) {
      return { ok: false, backend: true, error: 'Password must be at least 8 characters.' };
    }
    var parts = nameParts(opts.name);
    var username = String(opts.username || '').trim().toLowerCase() || usernameFor(opts.name);

    var r = await call('/auth/signup', {
      type: 'business',
      username: username,
      whatsapp: wa,
      password: opts.password,
      firstName: parts.first || 'Owner',
      surname: parts.rest || '.',
      email: opts.email || ''
    });
    if (r.status === 503 || r.status === 0) return { ok: false, backend: false };
    if (!r.ok) {
      return { ok: false, backend: true, error: (r.data && r.data.error) || 'Could not create the account.' };
    }

    var v = await call('/auth/verify', { whatsapp: wa, type: 'business' });
    if (!v.ok || !v.data || !v.data.user) {
      return { ok: false, backend: true, error: (v.data && v.data.error) || 'Could not confirm the account.' };
    }

    mirror(v.data.user);
    return { ok: true, backend: true, user: v.data.user };
  }

  /* Sign a business owner in on the server (WhatsApp + password) and start
     a session. backend:false means the caller should fall back to local. */
  async function login(opts) {
    opts = opts || {};
    if (!hasFetch()) return { ok: false, backend: false };
    var wa = normWa(opts.whatsapp);
    var r = await call('/auth/login', {
      username: String(opts.username || '').trim().toLowerCase(),
      whatsapp: wa || '',
      password: opts.password || ''
    });
    if (r.status === 503 || r.status === 0) return { ok: false, backend: false };
    if (!r.ok) {
      return { ok: false, backend: true, error: (r.data && r.data.error) || 'Sign-in failed. Check your details.' };
    }
    if (r.data && r.data.user) mirror(r.data.user);
    return { ok: true, backend: true, user: r.data && r.data.user, route: r.data && r.data.route };
  }

  function available() { return hasFetch(); }

  window.EatoutsBusinessAuth = {
    available: available,
    signup: signup,
    login: login,
    mirror: mirror,
    usernameFor: usernameFor,
    normWa: normWa
  };
})();
