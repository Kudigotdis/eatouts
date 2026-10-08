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
  return {
    token: token,
    cookie: COOKIE + '=' + token + cookieAttrs(env) + '; Max-Age=' + MAX_AGE
  };
}

export async function destroySession(env, request) {
  var cookies = parseCookies(request.headers.get('Cookie') || '');
  var token = cookies[COOKIE];
  if (token && env && env.OPS_KV) await env.OPS_KV.delete(sessionKey(token));
  return COOKIE + '=;' + cookieAttrs(env) + '; Max-Age=0';
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