/* ============================================================
   POST /api/admin/revoke-all   (Milestone A / Phase 3)

   The panic button. Bumps the global epoch in OPS_KV, which invalidates every
   bypass token ever issued (adminGate compares the token's `epoch` claim with
   the stored value), marks every known admin browser revoked, clears this
   browser's cookies and writes an audit row.

   Requires a live admin cookie: a revoked session cannot re-revoke.
   ============================================================ */
import { json } from './../_shared.js';
import {
  ADMIN_COOKIE, ADMIN_DEVICE_COOKIE, adminGate, bumpEpoch, cookie,
  jsonWithCookies, audit
} from './../_security.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  var gate = await adminGate(env, request);
  if (!gate.ok) return gate.response;

  var epoch = await bumpEpoch(env);
  var ts = Date.now();

  /* Best effort: the epoch alone is already authoritative, this only keeps the
     device table honest for the Milestone B management screen. */
  if (env.DB) {
    try { await env.DB.prepare('UPDATE admin_devices SET revoked_at = ? WHERE revoked_at IS NULL').bind(ts).run(); }
    catch (e) { /* non-fatal */ }
  }

  await audit(env, request, 'admin_revoke_all', String(gate.admin.usr || ''), { epoch: epoch });

  return jsonWithCookies({ ok: true, epoch: epoch }, [
    cookie(ADMIN_COOKIE, '', { env: env, maxAge: 0 }),
    cookie(ADMIN_DEVICE_COOKIE, '', { env: env, maxAge: 0 })
  ]);
}

export async function onRequestGet() {
  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
