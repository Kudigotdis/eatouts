/* ============================================================
   Shared security helpers for the staged access-control pipeline.

   Milestone A (Phase 3 - the admin exception) is built on this module, and the
   Stage 3-7 middleware lands on top of it in Milestone B, so nothing here is
   route-specific: the leading "_" keeps Pages from routing it.

   Design rules (see docs/ACCESS-CONTROL-PLAN.md):
     - FAIL CLOSED. A missing secret or binding is a denial, never an allow.
     - GENERIC DENIALS. deny() is a bare 403 with no country, platform, ASN,
       rule name or reason, so blocked traffic learns nothing from the reply.
     - NO RAW IDENTIFIERS. IPs and user agents are only ever logged or stored as
       SHA-256 hashes (the stance 0017_venue_interest.sql already takes).
     - NO NEW CRYPTO. HMAC/SHA-256 ride on Web Crypto and the PBKDF2 password
       helpers are reused from _auth.js instead of being re-implemented.

   Token format (all of our cookies):
     v1.<base64url(json payload)>.<base64url(HMAC-SHA256(secret, "v1.payload"))>
   ============================================================ */
import { hashPassword, safeEqual, toHex, PBKDF2_ITER } from './_auth.js';
import { isProduction, clientIp, uid } from './_shared.js';

/* Cookie names are contract: the edge WAF rule (Phase 2) matches the bypass
   cookie by name, so renaming one here means renaming it in the dashboard. */
export var ADMIN_COOKIE = 'eatouts_admin_bypass';
export var ADMIN_DEVICE_COOKIE = 'eatouts_admin_device';
export var ADMIN_BYPASS_DAYS = 30;
export var ADMIN_DEVICE_DAYS = 365;

var EPOCH_KEY = 'admin:epoch';

/* Hosting/provider networks that no Botswana consumer uses. Kept in one place
   so the WAF rule, the middleware and the tests cannot drift apart. Used from
   Milestone B onwards. */
export var DATACENTER_ASNS = [
  16509, 14618, 8987,      /* AWS */
  15169, 396982, 19527,    /* Google */
  8075, 8068, 20940,       /* Microsoft / Akamai */
  14061,                   /* DigitalOcean */
  24940, 213230,           /* Hetzner */
  16276,                   /* OVH */
  63949,                   /* Linode */
  20473,                   /* Vultr */
  51167, 40021,            /* Contabo */
  9009, 51396, 212238,     /* M247 / Datacamp / CDN77 */
  202425                   /* IP Volume */
];

/* ---------------------------------------------------------------- encoding */

function enc(str) { return new TextEncoder().encode(String(str)); }

function b64urlFromBytes(bytes) {
  var b = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
  var s = '';
  for (var i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromB64url(str) {
  var s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  var raw = atob(s);
  var out = new Uint8Array(raw.length);
  for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** sha256 hex of an arbitrary string. Used for every identifier we store. */
export async function sha256Hex(str) {
  var bits = await crypto.subtle.digest('SHA-256', enc(str));
  return toHex(new Uint8Array(bits));
}

/* ------------------------------------------------------------------ tokens */

async function hmac(secret, message) {
  var key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  var sig = await crypto.subtle.sign('HMAC', key, enc(message));
  return b64urlFromBytes(new Uint8Array(sig));
}

/**
 * Sign a payload into a token. A `ttlSec` of 0 (or less) produces a token that
 * is already expired, which is what the tests use. Returns null when there is
 * no secret, so callers fail closed instead of minting an unsigned token.
 */
export async function signToken(payload, secret, ttlSec, nowMs) {
  if (!secret) return null;
  var ts = Math.floor((nowMs == null ? Date.now() : nowMs) / 1000);
  var body = {};
  Object.keys(payload || {}).forEach(function (k) {
    if (k !== 'iat' && k !== 'exp') body[k] = payload[k];
  });
  body.iat = ts;
  body.exp = ts + (Number(ttlSec) || 0);
  var head = 'v1.' + b64urlFromBytes(enc(JSON.stringify(body)));
  return head + '.' + (await hmac(secret, head));
}

/** Verify a token. The signature is checked before the payload is trusted. */
export async function verifyToken(token, secret, nowMs) {
  if (!token || !secret) return { ok: false, reason: 'missing' };
  var parts = String(token).split('.');
  if (parts.length !== 3 || parts[0] !== 'v1' || !parts[1] || !parts[2]) {
    return { ok: false, reason: 'format' };
  }
  var head = parts[0] + '.' + parts[1];
  var expected = await hmac(secret, head);
  if (!safeEqual(expected, parts[2])) return { ok: false, reason: 'signature' };
  var payload;
  try { payload = JSON.parse(new TextDecoder().decode(bytesFromB64url(parts[1]))); }
  catch (e) { return { ok: false, reason: 'payload' }; }
  if (!payload || typeof payload !== 'object') return { ok: false, reason: 'payload' };
  var ts = Math.floor((nowMs == null ? Date.now() : nowMs) / 1000);
  if (!payload.exp || ts > Number(payload.exp)) return { ok: false, reason: 'expired' };
  return { ok: true, payload: payload };
}

/* ----------------------------------------------------------------- cookies */

export function readCookie(request, name) {
  var header = (request && request.headers && request.headers.get('Cookie')) || '';
  var parts = String(header).split(';');
  for (var i = 0; i < parts.length; i++) {
    var at = parts[i].indexOf('=');
    if (at < 0) continue;
    if (parts[i].slice(0, at).trim() !== name) continue;
    var raw = parts[i].slice(at + 1).trim();
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }
  return '';
}

/**
 * Build a Set-Cookie value. Secure is dropped outside production so that
 * `wrangler pages dev` over plain http can still store the cookie - the same
 * rule _shared.js already applies to eatouts_session.
 */
export function cookie(name, value, opts) {
  var o = opts || {};
  var out = [
    name + '=' + encodeURIComponent(value == null ? '' : value),
    'Path=/',
    'HttpOnly'
  ];
  if (isProduction(o.env)) out.push('Secure');
  out.push('SameSite=' + (o.sameSite || 'Strict'));
  if (o.maxAge != null) out.push('Max-Age=' + Math.max(0, Math.floor(o.maxAge)));
  return out.join('; ');
}

/** JSON response carrying several Set-Cookie headers (login sets two). */
export function jsonWithCookies(data, cookies, status) {
  var headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  (cookies || []).forEach(function (c) { if (c) headers.append('Set-Cookie', c); });
  return new Response(JSON.stringify(data), { status: status || 200, headers: headers });
}

/* ------------------------------------------------------------------ denial */

/**
 * The only denial body this system ever emits. Deliberately says nothing about
 * why: no country, no platform, no ASN, no rule name, no "blocked" wording.
 */
export function deny() {
  return new Response('Forbidden', {
    status: 403,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }
  });
}

/* --------------------------------------------------------------------- geo */

/** Cloudflare geo/ASN for the request. Tolerates a missing `cf` (local dev). */
export function geo(request) {
  var cf = (request && request.cf) || {};
  return {
    ip: clientIp(request),
    country: String(cf.country || '').toUpperCase(),
    asn: Number(cf.asn) || 0,
    colo: String(cf.colo || '')
  };
}

export function isDatacenterAsn(asn) {
  return DATACENTER_ASNS.indexOf(Number(asn) || 0) >= 0;
}

/* Browser family + platform only. Version numbers are dropped on purpose: a
   Chrome auto-update must not invalidate the admin's device binding. */
export function uaFamily(ua) {
  var s = String(ua || '').toLowerCase();
  var browser = 'other';
  if (s.indexOf('edg/') >= 0) browser = 'edge';
  else if (s.indexOf('opr/') >= 0 || s.indexOf('opera') >= 0) browser = 'opera';
  else if (s.indexOf('chrome') >= 0 || s.indexOf('crios') >= 0) browser = 'chrome';
  else if (s.indexOf('firefox') >= 0 || s.indexOf('fxios') >= 0) browser = 'firefox';
  else if (s.indexOf('safari') >= 0) browser = 'safari';

  var os = 'other';
  if (s.indexOf('windows') >= 0) os = 'windows';
  else if (s.indexOf('android') >= 0) os = 'android';
  else if (s.indexOf('iphone') >= 0 || s.indexOf('ipad') >= 0) os = 'ios';
  else if (s.indexOf('mac os') >= 0 || s.indexOf('macintosh') >= 0) os = 'mac';
  else if (s.indexOf('linux') >= 0) os = 'linux';

  return browser + '|' + os;
}

export async function deviceId(ua) {
  return sha256Hex('adm-dev:' + uaFamily(ua));
}

/* -------------------------------------------------------------------- epoch */

/** Global revocation counter. Bumping it invalidates every issued token. */
export async function readEpoch(env) {
  if (!env || !env.OPS_KV) return 0;
  try { return parseInt(await env.OPS_KV.get(EPOCH_KEY), 10) || 0; }
  catch (e) { return 0; }
}

export async function bumpEpoch(env) {
  var next = (await readEpoch(env)) + 1;
  await env.OPS_KV.put(EPOCH_KEY, String(next));
  return next;
}

/* --------------------------------------------------------------- admin gate */

/** True when every secret the admin flow needs is present. */
export function adminConfigured(env) {
  return !!(env && env.OPS_KV && env.ADMIN_USERNAME &&
    env.ADMIN_PASSWORD_PBKDF2 && env.ADMIN_BYPASS_SECRET);
}

/**
 * The authoritative admin check: signature, token kind, global epoch and the
 * coarse device family. Every failure path returns the same generic 403.
 */
export async function adminGate(env, request, nowMs) {
  if (!env || !env.OPS_KV || !env.ADMIN_BYPASS_SECRET) return { ok: false, response: deny() };
  var raw = readCookie(request, ADMIN_COOKIE);
  if (!raw) return { ok: false, response: deny() };

  var v = await verifyToken(raw, env.ADMIN_BYPASS_SECRET, nowMs);
  if (!v.ok || !v.payload || v.payload.kind !== 'bypass') {
    return { ok: false, response: deny() };
  }
  if (Number(v.payload.epoch || 0) !== (await readEpoch(env))) {
    return { ok: false, response: deny() };
  }
  if (v.payload.dev) {
    var dev = await deviceId(request.headers.get('User-Agent') || '');
    if (!safeEqual(dev, String(v.payload.dev))) return { ok: false, response: deny() };
  }
  return { ok: true, admin: v.payload };
}

/* ---------------------------------------------------------------- passwords */

/**
 * Verify the admin username + password against the environment.
 * ADMIN_PASSWORD_PBKDF2 is "iterations:saltHex:hashHex", produced by
 * scripts/hash-admin-password.mjs. Exactly one PBKDF2 run happens on every
 * call, so a wrong username costs the same as a wrong password.
 */
export async function verifyAdminCredentials(env, username, password) {
  var spec = String((env && env.ADMIN_PASSWORD_PBKDF2) || '');
  var parts = spec.split(':');
  var iter = parseInt(parts[0], 10) || 0;
  var salt = parts[1] || '';
  var expected = parts[2] || '';
  var configuredUser = String((env && env.ADMIN_USERNAME) || '').trim().toLowerCase();
  var given = String(username == null ? '' : username).trim().toLowerCase();

  var computed = await hashPassword(
    String(password == null ? '' : password),
    salt || '00'.repeat(16),
    iter || PBKDF2_ITER
  );

  var passwordOk = !!expected && safeEqual(computed, expected);
  var userOk = !!configuredUser && safeEqual(given, configuredUser);
  return userOk && passwordOk && !!password;
}

/* ----------------------------------------------------------- audit + device */

/** Append to admin_audit. Best effort: never breaks the caller. */
export async function audit(env, request, action, actor, detail) {
  if (!env || !env.DB) return null;
  var g = geo(request);
  var row = {
    id: uid('aud'),
    at: Date.now(),
    action: String(action || ''),
    actor: String(actor || '').slice(0, 80) || null,
    country: g.country || null,
    asn: g.asn || null,
    detail: detail ? JSON.stringify(detail).slice(0, 500) : null
  };
  try {
    await env.DB.prepare(
      'INSERT INTO admin_audit (id, at, action, actor, country, asn, fp_hash, detail) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(row.id, row.at, row.action, row.actor, row.country, row.asn, null, row.detail).run();
  } catch (e) { /* audit is best effort */ }
  return row;
}

/** Record/refresh the admin browser row and return its device id. */
export async function rememberDevice(env, request, username) {
  var ua = request.headers.get('User-Agent') || '';
  var dev = await deviceId(ua);
  if (!env || !env.DB) return dev;
  var g = geo(request);
  var ts = Date.now();
  try {
    await env.DB.prepare(
      'INSERT INTO admin_devices (id, user_ref, device_hash, ua_hash, label, created_at, last_seen_at, last_country, last_asn) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
      'ON CONFLICT(device_hash) DO UPDATE SET last_seen_at = excluded.last_seen_at, ' +
      'last_country = excluded.last_country, last_asn = excluded.last_asn, ua_hash = excluded.ua_hash'
    ).bind(
      uid('adev'), String(username || ''), dev, await sha256Hex('ua:' + ua),
      uaFamily(ua), ts, ts, g.country || null, g.asn || null
    ).run();
  } catch (e) { /* device bookkeeping is best effort */ }
  return dev;
}

/* ---------------------------------------------------------- denial logging */

/**
 * Phase 7: emit one structured denial record. A console line for Workers Logs
 * plus a best-effort row in denial_log. Never includes the raw IP, the raw user
 * agent, a cookie value or any secret.
 */
export async function logDenial(env, request, rec) {
  var g = geo(request);
  var ua = request.headers.get('User-Agent') || '';
  var row = {
    at: Date.now(),
    stage: Number((rec && rec.stage) || 0),
    rule: String((rec && rec.rule) || 'unknown'),
    ip_hash: await sha256Hex('ip:' + g.ip),
    country: g.country || null,
    asn: g.asn || null,
    ua_hash: await sha256Hex('ua:' + ua),
    fp_hash: (rec && rec.fpHash) || null,
    path: String((rec && rec.path) || '').slice(0, 300),
    confidence: Number((rec && rec.confidence) || 0)
  };
  try { console.log('access-denied ' + JSON.stringify(row)); } catch (e) { /* noop */ }
  if (!env || !env.DB) return row;
  try {
    await env.DB.prepare(
      'INSERT INTO denial_log (id, at, stage, rule, ip_hash, country, asn, ua_hash, fp_hash, path, confidence) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      uid('den'), row.at, row.stage, row.rule, row.ip_hash, row.country,
      row.asn, row.ua_hash, row.fp_hash, row.path, row.confidence
    ).run();
  } catch (e) { /* logging is best effort */ }
  return row;
}
