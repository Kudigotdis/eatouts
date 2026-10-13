/* ============================================================
   Shared auth helpers for the customer (regular-user) endpoints.

   Passwords are stored as PBKDF2-SHA256(password, per-user salt)
   using the Web Crypto API that is native to Cloudflare Workers
   (and to Node's global `crypto` used by the test harness).

   No bcrypt/argon2 dependency: deriveBits is available on the edge
   and is strong enough with a high iteration count.
   ============================================================ */

export var PBKDF2_ITER = 100000;
var KEY_LEN_BITS = 256;

function enc(str) { return new TextEncoder().encode(String(str)); }

export function toHex(bytes) {
  var b = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
  var out = '';
  for (var i = 0; i < b.length; i++) out += (b[i] + 0x100).toString(16).slice(1);
  return out;
}

export function fromHex(hex) {
  var s = String(hex || '');
  var out = new Uint8Array(s.length / 2);
  for (var i = 0; i < out.length; i++) out[i] = parseInt(s.substr(i * 2, 2), 16);
  return out;
}

export function randomSalt(bytes) {
  var n = bytes || 16;
  var buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return toHex(buf);
}

/** PBKDF2-SHA256 -> hex. Rejects if Web Crypto is unavailable. */
export async function hashPassword(password, saltHex, iterations) {
  var iter = Number(iterations) || PBKDF2_ITER;
  var material = await crypto.subtle.importKey(
    'raw', enc(String(password)), 'PBKDF2', false, ['deriveBits']
  );
  var bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: fromHex(saltHex), iterations: iter, hash: 'SHA-256' },
    material,
    KEY_LEN_BITS
  );
  return toHex(new Uint8Array(bits));
}

/** Constant-time-ish string compare. */
export function safeEqual(a, b) {
  var x = String(a == null ? '' : a);
  var y = String(b == null ? '' : b);
  if (x.length !== y.length) return false;
  var diff = 0;
  for (var i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function verifyPassword(password, saltHex, iterations, expectedHash) {
  if (!saltHex || !expectedHash) return false;
  var h = await hashPassword(password, saltHex, iterations);
  return safeEqual(h, expectedHash);
}

/** "+267 71 844 129" / "00267..." / "26771844129" -> "26771844129". */
export function normalisePhone(raw) {
  var digits = String(raw == null ? '' : raw).replace(/[^0-9]/g, '');
  if (digits.indexOf('00') === 0) digits = digits.slice(2);
  return digits;
}

/** Local 8-digit Botswana number -> +267XXXXXXXX (for wa.me links). */
export function phoneIntl(raw) {
  var d = normalisePhone(raw);
  if (/^\d{7,8}$/.test(d)) d = '267' + d.replace(/^0+/, '');
  return d;
}

/** Username: 3-30 chars, letters/digits/dot/underscore/hyphen. */
export function validateUsername(raw) {
  var u = String(raw == null ? '' : raw).trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(u)) {
    return { ok: false, error: 'Username must be 3-30 characters (letters, numbers, . _ -).' };
  }
  return { ok: true, username: u };
}

export function validatePassword(raw) {
  var p = String(raw == null ? '' : raw);
  if (p.length < 8) return { ok: false, error: 'Password must be at least 8 characters.' };
  if (p.length > 200) return { ok: false, error: 'Password is too long.' };
  return { ok: true, password: p };
}

/** Parse "YYYY-MM-DD" (or ISO) and return age in whole years, or null. */
export function ageFromDob(dob) {
  if (!dob) return null;
  var d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  var now = new Date();
  var age = now.getFullYear() - d.getFullYear();
  var m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function isAdult(dob, minAge) {
  var age = ageFromDob(dob);
  return age != null && age >= (minAge || 18);
}

/** Synthetic unique email for customers who do not give one. */
export function syntheticEmail(whatsapp) {
  var w = normalisePhone(whatsapp) || ('u' + Date.now().toString(36));
  return w + '@whatsapp.eatouts';
}

export function validEmail(email) {
  var e = String(email == null ? '' : email).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null;
}

/** Maps a customer row/record to the shape the client expects. */
export function publicUser(row) {
  if (!row) return null;
  var profile = {};
  try { profile = row.profile ? JSON.parse(row.profile) : {}; } catch (e) { profile = {}; }
  return {
    id: row.id,
    username: row.username || null,
    whatsapp: row.whatsapp || null,
    email: row.email || null,
    name: row.name || null,
    type: row.type || 'customer',
    verified: !!row.verified,
    photoKey: row.photo_key || null,
    avatar: row.photo_key || null,
    onboardingStatus: profile.onboardingComplete ? 'complete' : 'pending',
    profile: profile
  };
}
