/* ============================================================
   POST /api/admin/login        (Milestone A / Phase 3)

   The single exception to the Botswana geo-gate: the operator works from
   Zimbabwe, so instead of widening the gate we issue a signed, device-bound,
   revocable bypass cookie. The edge only checks that a cookie is present; this
   endpoint plus adminGate() and _middleware.js are the real authority.

   Body: { username, password }
   Sets: eatouts_admin_bypass (30d) + eatouts_admin_device (365d)

   FAIL CLOSED: without ADMIN_USERNAME, ADMIN_PASSWORD_PBKDF2,
   ADMIN_BYPASS_SECRET and OPS_KV this endpoint answers 503 and mints nothing.
   ============================================================ */
import { json, readJson, rateLimit, clientIp } from './../_shared.js';
import {
  ADMIN_COOKIE, ADMIN_DEVICE_COOKIE, ADMIN_BYPASS_DAYS, ADMIN_DEVICE_DAYS,
  adminConfigured, verifyAdminCredentials, signToken, readEpoch, cookie,
  jsonWithCookies, rememberDevice, audit, logDenial
} from './../_security.js';

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!adminConfigured(env)) {
    return json({ ok: false, error: 'admin_not_configured' }, 503);
  }

  /* Same limiter shape as /api/auth/login, but tighter: this account is the
     only thing standing between a Zimbabwe IP and the gated site. */
  var ip = clientIp(request);
  var rl = await rateLimit(env, 'adm-login:' + ip, 6, 900);
  if (!rl.ok) return json({ ok: false, error: 'Too many attempts. Try again shortly.' }, 429);

  var body = await readJson(request);
  var username = String(body.username || '');
  var password = String(body.password || '');
  if (!username || !password) {
    return json({ ok: false, error: 'Username and password are required.' }, 400);
  }

  var ok = await verifyAdminCredentials(env, username, password);
  if (!ok) {
    await logDenial(env, request, {
      stage: 3, rule: 'admin_credentials', path: '/api/admin/login', confidence: 100
    });
    return json({ ok: false, error: 'Invalid credentials.' }, 401);
  }

  var user = String(env.ADMIN_USERNAME).trim().toLowerCase();
  var dev = await rememberDevice(env, request, user);
  var epoch = await readEpoch(env);

  var bypass = await signToken(
    { kind: 'bypass', usr: user, dev: dev, epoch: epoch },
    env.ADMIN_BYPASS_SECRET, ADMIN_BYPASS_DAYS * 86400
  );
  var device = await signToken(
    { kind: 'device', usr: user, dev: dev, epoch: epoch },
    env.ADMIN_BYPASS_SECRET, ADMIN_DEVICE_DAYS * 86400
  );
  if (!bypass || !device) return json({ ok: false, error: 'admin_not_configured' }, 503);

  await audit(env, request, 'admin_login', user, { dev: dev });

  return jsonWithCookies({
    ok: true,
    route: 'eatouts-admin-dashboard.html',
    expiresIn: ADMIN_BYPASS_DAYS * 86400
  }, [
    cookie(ADMIN_COOKIE, bypass, { env: env, maxAge: ADMIN_BYPASS_DAYS * 86400 }),
    cookie(ADMIN_DEVICE_COOKIE, device, { env: env, maxAge: ADMIN_DEVICE_DAYS * 86400 })
  ]);
}
