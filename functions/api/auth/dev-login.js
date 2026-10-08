/* ============================================================
   POST /api/auth/dev-login
   Passwordless login for the pre-domain phase ONLY.

   Disabled whenever ENV === "production". In development it will
   sign in any email that is listed in DEV_LOGIN_EMAILS (or any
   email at all if that allowlist is empty, for first-run setup).
   ============================================================ */
import { json, jsonWithCookie, uid, createSession, allowlist } from './../_shared.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (String(env.ENV || '') === 'production') {
    return json({ ok: false, error: 'dev_login_disabled' }, 403);
  }
  if (!env.DB || !env.OPS_KV) {
    return json({ ok: false, error: 'backend_not_configured' }, 503);
  }

  var body = {};
  try { body = await request.json(); } catch (e) { /* ignore */ }
  var email = String((body && body.email) || '').trim().toLowerCase();
  if (!email || email.indexOf('@') === -1) {
    return json({ error: 'valid email required' }, 400);
  }

  var listed = allowlist(env.DEV_LOGIN_EMAILS);
  if (listed.length && listed.indexOf(email) === -1) {
    return json({ error: 'email not allowed' }, 403);
  }

  var now = Date.now();
  var row = await env.DB.prepare('SELECT id, email, name, is_admin FROM users WHERE email = ?')
    .bind(email).first();

  var isAdmin = allowlist(env.ADMIN_EMAILS).indexOf(email) !== -1 ? 1 : 0;

  if (!row) {
    var id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, status, is_admin, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(id, email, email, 'active', isAdmin, now).run();
    row = { id: id, email: email, name: email, is_admin: isAdmin };
  } else if (isAdmin && !row.is_admin) {
    await env.DB.prepare('UPDATE users SET is_admin = 1 WHERE id = ?').bind(row.id).run();
    row.is_admin = 1;
  }

  var sess = await createSession(env, {
    userId: row.id,
    email: row.email,
    name: row.name || row.email,
    isAdmin: !!row.is_admin
  });

  return jsonWithCookie({ ok: true, user: { id: row.id, email: row.email, isAdmin: !!row.is_admin } }, sess.cookie);
}