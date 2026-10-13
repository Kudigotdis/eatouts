/* ============================================================
   POST /api/auth/login
   Regular-user sign in. All three credentials must match:
   username + WhatsApp number + password.

   Body: { username, whatsapp, password }
   ============================================================ */
import { json, now, readJson, createSession, jsonWithCookie, rateLimit, clientIp } from './../_shared.js';
import { normalisePhone, verifyPassword, publicUser } from './../_auth.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!env.DB || !env.OPS_KV) {
    return json({ ok: false, error: 'backend_not_configured' }, 503);
  }

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'login:' + ip, 15, 900);
  if (!rl.ok) return json({ ok: false, error: 'Too many attempts. Try again shortly.' }, 429);

  var body = await readJson(request);
  var username = String(body.username || '').trim().toLowerCase();
  var whatsapp = normalisePhone(body.whatsapp);
  var password = String(body.password || '');

  if (!username || !whatsapp || !password) {
    return json({ ok: false, error: 'Username, WhatsApp number and password are all required.' }, 400);
  }

  var row = await env.DB.prepare(
    'SELECT * FROM users WHERE username = ? AND type = ?'
  ).bind(username, 'customer').first();

  /* Always run the hash to keep timing similar whether or not the user exists. */
  if (!row) {
    await verifyPassword(password, 'x'.repeat(32), 100000, 'y'.repeat(64));
    return json({ ok: false, error: 'Invalid username, WhatsApp number or password.' }, 401);
  }

  var ok = await verifyPassword(password, row.password_salt, row.password_iter, row.password_hash);
  if (!ok || normalisePhone(row.whatsapp) !== whatsapp) {
    return json({ ok: false, error: 'Invalid username, WhatsApp number or password.' }, 401);
  }

  if (String(row.status || 'active').toLowerCase() !== 'active') {
    return json({ ok: false, error: 'This account is not active.' }, 403);
  }

  var ts = now();
  try {
    await env.DB.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
      .bind(ts, ts, row.id).run();
  } catch (e) { /* non-fatal */ }

  var session = await createSession(env, {
    userId: row.id,
    email: row.email,
    name: row.name,
    isAdmin: !!row.is_admin,
    type: 'customer',
    username: row.username,
    whatsapp: row.whatsapp
  });

  return jsonWithCookie({
    ok: true,
    user: publicUser(row),
    route: row.verified ? 'eatouts-profile.html' : 'eatouts-user-onboarding.html'
  }, session.cookie);
}
