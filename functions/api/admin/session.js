/* ============================================================
   GET /api/admin/session       (Milestone A / Phase 3)

   "Am I still an admin?" - the only read-only endpoint of the pipeline. Used by
   the dashboard to show the bypass banner and by the tests to prove that a
   revoked or tampered cookie is rejected.

   Returns 403 (indistinguishable from any other denial in the system) when the
   bypass cookie is absent, tampered, expired, epoch-stale or from another
   browser family.
   ============================================================ */
import { json } from './../_shared.js';
import { adminGate, readEpoch, deviceId } from './../_security.js';

export async function onRequestGet(context) {
  var env = context.env;
  var request = context.request;

  var gate = await adminGate(env, request);
  if (!gate.ok) return gate.response;

  return json({
    ok: true,
    admin: {
      user: String(gate.admin.usr || ''),
      expires: Number(gate.admin.exp || 0) * 1000,
      epoch: await readEpoch(env),
      device: await deviceId(request.headers.get('User-Agent') || '')
    }
  });
}

export async function onRequestPost() {
  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
