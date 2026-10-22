/* ============================================================
   POST /api/auth/login
   Sign in a customer or business account.

   All three identifiers are mandatory: username + WhatsApp number
   + password. The username finds the row, the password is verified
   against it, and the WhatsApp number must match the row too.

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

  if (!password || !username || !whatsapp) {
    return json({ ok: false, error: 'Provide your username, WhatsApp number and password.' }, 400);
  }

  /* The username finds the row; the password and the WhatsApp number must
     both match it before anyone is let in. */
  var row = await env.DB.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();

  var kind = row ? String(row.type || 'customer').toLowerCase() : '';

  /* Always run the hash to keep timing similar whether or not the user exists. */
  if (!row || (kind !== 'customer' && kind !== 'business')) {
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
    type: kind,
    username: row.username,
    whatsapp: row.whatsapp
  });

  var route;
  if (kind === 'business') {
    route = 'eatouts-business-signup.html';
  } else {
    route = row.verified ? 'eatouts-profile.html' : 'eatouts-customer-signup.html';
  }

  return jsonWithCookie({
    ok: true,
    user: publicUser(row),
    route: route
  }, session.cookie);
}
