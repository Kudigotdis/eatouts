/* ============================================================
   POST /api/auth/password-reset/confirm
   Finish a password reset by setting the new password.

   Body: { token, password }

   The token is the raw value from the emailed link. Only its SHA-256
   hash was stored, so a leaked database row cannot be used to sign in.
   A successful reset marks the token used and signs every other live
   session for that account out.
   ============================================================ */
import { json, now, readJson, rateLimit, clientIp, revokeUserSessions } from './../../_shared.js';
import { validatePassword, randomSalt, hashPassword, PBKDF2_ITER } from './../../_auth.js';

/** SHA-256 of the raw token - matches password-reset.js. */
async function tokenHash(raw) {
  var data = new TextEncoder().encode(String(raw));
  var digest = await crypto.subtle.digest('SHA-256', data);
  var bytes = new Uint8Array(digest);
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += (bytes[i] + 0x100).toString(16).slice(1);
  return out;
}

var INVALID = 'That reset link is invalid or has expired. Request a new one.';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'pwreset-confirm:' + ip, 20, 900);
  if (!rl.ok) return json({ ok: false, error: INVALID }, 429);

  var body = await readJson(request);
  var token = String(body.token || '').trim();
  var password = String(body.password || '');

  if (!token || token.length < 20) {
    return json({ ok: false, error: INVALID }, 400);
  }

  var p = validatePassword(password);
  if (!p.ok) return json({ ok: false, error: p.error }, 400);

  var hash = await tokenHash(token);

  var row = null;
  try {
    row = await env.DB.prepare(
      'SELECT * FROM password_resets WHERE token_hash = ? LIMIT 1'
    ).bind(hash).first();
  } catch (e) {
    row = null;
  }

  if (!row) return json({ ok: false, error: INVALID }, 400);

  /* Used already, expired, or too many tries: same answer for all three. */
  if (row.used_at || Number(row.expires_at || 0) < now() || Number(row.attempts || 0) >= 5) {
    return json({ ok: false, error: INVALID }, 400);
  }

  var user = null;
  try {
    user = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(row.user_id).first();
  } catch (e) {
    user = null;
  }
  if (!user) return json({ ok: false, error: INVALID }, 400);

  /* One more try is allowed after this one, then the token is dead. */
  try {
    await env.DB.prepare(
      'UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?'
    ).bind(row.id).run();
  } catch (e) { /* non-fatal */ }

  var salt = randomSalt(16);
  var passwordHash = await hashPassword(p.password, salt, PBKDF2_ITER);
  var ts = now();

  try {
    await env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_salt = ?, password_iter = ?, updated_at = ? WHERE id = ?'
    ).bind(passwordHash, salt, PBKDF2_ITER, ts, user.id).run();
  } catch (e) {
    return json({ ok: false, error: 'Could not update the password. Try again.' }, 500);
  }

  try {
    await env.DB.prepare(
      'UPDATE password_resets SET used_at = ? WHERE id = ?'
    ).bind(ts, row.id).run();
  } catch (e) { /* non-fatal: the token still expires on its own */ }

  /* A password reset ends every other session for this account. */
  var revoked = await revokeUserSessions(env, user.id);

  return json({ ok: true, sessionsRevoked: revoked });
}
