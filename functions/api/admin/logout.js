/* ============================================================
   POST /api/admin/logout       (Milestone A / Phase 3)

   Clears both admin cookies and records the sign-out. Idempotent and
   unauthenticated on purpose: a stale or forged cookie must always be
   removable, so this route never denies.
   ============================================================ */
import { json } from './../_shared.js';
import {
  ADMIN_COOKIE, ADMIN_DEVICE_COOKIE, cookie, jsonWithCookies,
  readCookie, verifyToken, audit, geo
} from './../_security.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  /* Who signed out is read from the cookie when it still verifies; a broken
     cookie is logged as an anonymous logout rather than being rejected. */
  var actor = '';
  var raw = readCookie(request, ADMIN_COOKIE);
  if (raw && env.ADMIN_BYPASS_SECRET) {
    var v = await verifyToken(raw, env.ADMIN_BYPASS_SECRET);
    if (v.ok && v.payload) actor = String(v.payload.usr || '');
  }

  await audit(env, request, 'admin_logout', actor, { country: geo(request).country });

  return jsonWithCookies({ ok: true }, [
    cookie(ADMIN_COOKIE, '', { env: env, maxAge: 0 }),
    cookie(ADMIN_DEVICE_COOKIE, '', { env: env, maxAge: 0 })
  ]);
}

export async function onRequestGet(context) {
  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
