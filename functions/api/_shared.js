/* ============================================================
   Shared helpers for Pages Functions.
   Files/dirs starting with "_" are NOT routed by Pages, so this
   module is import-only.
   ============================================================ */

export function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: Object.assign(
      { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
      headers || {}
    )
  });
}

export function uid(prefix) {
  return (prefix || 'id') + '_' + Date.now().toString(36) +
    crypto.randomUUID().replace(/-/g, '').slice(0, 10);
}

export function now() {
  return Date.now();
}

function parseCookies(header) {
  var out = {};
  String(header || '').split(';').forEach(function (part) {
    var i = part.indexOf('=');
    if (i < 0) return;
    var k = part.slice(0, i).trim();
    var v = part.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

var COOKIE = 'eatouts_session';
var MAX_AGE = 60 * 60 * 24 * 30; /* 30 days */

function sessionKey(token) {
  return 'sess:' + token;
}

/* Second index keyed by user, so every live session for one account can be
   revoked at once (used when a password is reset). The session payload is
   still the only source of truth - this is just a lookup handle. */
function userSessionKey(userId, token) {
  return 'sessu:' + userId + ':' + token;
}

/** Read the session for the incoming request, or null. */
export async function getSession(env, request) {
  if (!env || !env.OPS_KV) return null;
  var cookies = parseCookies(request.headers.get('Cookie') || '');
  var token = cookies[COOKIE];
  if (!token) return null;
  var raw = await env.OPS_KV.get(sessionKey(token));
  if (!raw) return null;
  try {
    var s = JSON.parse(raw);
    s._token = token;
    return s;
  } catch (e) {
    return null;
  }
}

/* Secure cookies require HTTPS. Keep them on in production; drop the
   flag in local dev so plain http://localhost can store the session. */
function cookieAttrs(env) {
  return '; Path=/; HttpOnly;' + (isProduction(env) ? ' Secure;' : '') + ' SameSite=Lax';
}

/** Create a session in KV and return its Set-Cookie value. */
export async function createSession(env, payload) {
  var token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
  await env.OPS_KV.put(sessionKey(token), JSON.stringify(payload), { expirationTtl: MAX_AGE });
  if (payload && payload.userId) {
    await env.OPS_KV.put(userSessionKey(payload.userId, token), '1', { expirationTtl: MAX_AGE });
  }
  return {
    token: token,
    cookie: COOKIE + '=' + token + cookieAttrs(env) + '; Max-Age=' + MAX_AGE
  };
}

export async function destroySession(env, request) {
  var cookies = parseCookies(request.headers.get('Cookie') || '');
  var token = cookies[COOKIE];
  if (token && env && env.OPS_KV) {
    await env.OPS_KV.delete(sessionKey(token));
    /* drop the per-user handle too, so a revoked session does not linger */
    var session = null;
    try { session = await getSession(env, request); } catch (e) { session = null; }
    if (session && session.userId) {
      await env.OPS_KV.delete(userSessionKey(session.userId, token));
    }
  }
  return COOKIE + '=;' + cookieAttrs(env) + '; Max-Age=0';
}

/**
 * Patch the stored session payload (for example after the account email
 * changes). Returns true when the session was found and rewritten.
 */
export async function updateSession(env, request, patch) {
  if (!env || !env.OPS_KV) return false;
  var session = await getSession(env, request);
  if (!session || !session._token) return false;
  var payload = {};
  Object.keys(session).forEach(function (k) {
    if (k !== '_token') payload[k] = session[k];
  });
  Object.keys(patch || {}).forEach(function (k) { payload[k] = patch[k]; });
  await env.OPS_KV.put(sessionKey(session._token), JSON.stringify(payload), { expirationTtl: MAX_AGE });
  return true;
}

/**
 * Sign every live session of one account out.
 * Used after a password reset so a stolen session cannot outlive the
 * password it was opened with. Returns how many sessions were killed.
 */
export async function revokeUserSessions(env, userId) {
  if (!env || !env.OPS_KV || !userId) return 0;
  var prefix = 'sessu:' + userId + ':';
  var killed = 0;
  try {
    var res = await env.OPS_KV.list({ prefix: prefix, limit: 1000 });
    var keys = (res && res.keys) || [];
    for (var i = 0; i < keys.length; i++) {
      var token = String(keys[i].name).slice(prefix.length);
      if (!token) continue;
      await env.OPS_KV.delete(sessionKey(token));
      await env.OPS_KV.delete(keys[i].name);
      killed++;
    }
  } catch (e) { /* revocation is best-effort */ }
  return killed;
}

export function jsonWithCookie(data, cookie, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'Set-Cookie': cookie
    }
  });
}

/** Parse a comma-separated env allowlist into a lowercased array. */
export function allowlist(value) {
  return String(value || '')
    .split(',')
    .map(function (s) { return s.trim().toLowerCase(); })
    .filter(Boolean);
}

export function isProduction(env) {
  return String((env && env.ENV) || 'development').toLowerCase() === 'production';
}

/** Parse a JSON body without throwing. */
export async function readJson(request) {
  try { return await request.json(); } catch (e) { return {}; }
}

/** Best-effort client IP for rate limiting. */
export function clientIp(request) {
  return String(
    (request.headers.get('CF-Connecting-IP')) ||
    (request.headers.get('x-forwarded-for') || '').split(',')[0] ||
    'unknown'
  ).trim();
}

/* Simple KV fixed-window rate limiter. KV is eventually consistent, so this
   is a throttle rather than a hard guarantee - good enough to blunt abuse. */
export async function rateLimit(env, key, limit, windowSec) {
  if (!env || !env.OPS_KV) return { ok: true };
  var k = 'rl:' + key;
  var raw = await env.OPS_KV.get(k);
  var n = raw ? (parseInt(raw, 10) || 0) : 0;
  if (n >= limit) return { ok: false, count: n };
  await env.OPS_KV.put(k, String(n + 1), { expirationTtl: windowSec || 60 });
  return { ok: true, count: n + 1 };
}