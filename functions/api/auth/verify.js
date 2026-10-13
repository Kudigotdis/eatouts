/* ============================================================
   POST /api/auth/verify
   Mark a freshly signed-up account as verified after the user has
   tapped the WhatsApp click-to-chat confirmation, then start a
   session so onboarding can continue.

   Body: { whatsapp }
   ============================================================ */
import { json, now, readJson, createSession, jsonWithCookie, rateLimit, clientIp } from './../_shared.js';
import { normalisePhone, publicUser } from './../_auth.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!env.DB || !env.OPS_KV) {
    return json({ ok: false, error: 'backend_not_configured' }, 503);
  }

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'verify:' + ip, 30, 3600);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  var body = await readJson(request);
  var whatsapp = normalisePhone(body.whatsapp);
  if (whatsapp.length < 8) {
    return json({ ok: false, error: 'WhatsApp number is required.' }, 400);
  }

  var row = await env.DB.prepare(
    'SELECT * FROM users WHERE whatsapp = ? AND type = ?'
  ).bind(whatsapp, 'customer').first();

  if (!row) return json({ ok: false, error: 'Account not found.' }, 404);

  var ts = now();
  if (!row.verified) {
    await env.DB.prepare(
      'UPDATE users SET verified = 1, verified_at = ?, updated_at = ? WHERE id = ?'
    ).bind(ts, ts, row.id).run();
    row.verified = 1;
  }

  try {
    var pending = await env.DB.prepare(
      'SELECT id FROM verifications WHERE user_id = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1'
    ).bind(row.id).first();
    if (pending) {
      await env.DB.prepare('UPDATE verifications SET consumed_at = ? WHERE id = ?')
        .bind(ts, pending.id).run();
    }
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
    route: 'eatouts-profile.html'
  }, session.cookie);
}
