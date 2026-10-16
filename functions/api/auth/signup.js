/* ============================================================
   POST /api/auth/signup
   Create an account. `type` may be "customer" (default) or
   "business"; the 18+ gate applies to customers only.

   Body: { username, whatsapp, password, firstName, surname,
           dob, gender, town, area, email?, type? }

   No external OTP channel: the account is created unverified and
   the response returns a WhatsApp click-to-chat link the user taps
   to confirm, then calls /api/auth/verify.
   ============================================================ */
import { json, uid, now, readJson, rateLimit, clientIp } from './../_shared.js';
import {
  validateUsername, validatePassword, normalisePhone, phoneIntl,
  syntheticEmail, validEmail, isAdult, randomSalt, hashPassword,
  PBKDF2_ITER, publicUser
} from './../_auth.js';

function confirmLink(env, username, whatsapp) {
  var number = normalisePhone(env.EATOUTS_WHATSAPP || '26771844129');
  var text = 'EatOuts account confirmation for @' + username + ' (' + whatsapp + ').';
  return 'https://wa.me/' + number + '?text=' + encodeURIComponent(text);
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!env.DB || !env.OPS_KV) {
    return json({ ok: false, error: 'backend_not_configured' }, 503);
  }

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'signup:' + ip, 10, 3600);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  var body = await readJson(request);

  var type = String(body.type || '').toLowerCase() === 'business' ? 'business' : 'customer';

  var u = validateUsername(body.username);
  if (!u.ok) return json({ ok: false, error: u.error }, 400);

  var p = validatePassword(body.password);
  if (!p.ok) return json({ ok: false, error: p.error }, 400);

  var whatsapp = normalisePhone(body.whatsapp || body.whatsapp_number);
  if (whatsapp.length < 8) {
    return json({ ok: false, error: 'A valid WhatsApp number is required.' }, 400);
  }

  /* The 18+ gate applies to customer accounts only; business owners are
     businesses rather than consumers of age-restricted content. */
  if (type === 'customer' && !isAdult(body.dob, 18)) {
    return json({ ok: false, error: 'You must be 18 or older to create an account.' }, 400);
  }

  var firstName = String(body.firstName || '').trim();
  var surname = String(body.surname || '').trim();
  if (!firstName || !surname) {
    return json({ ok: false, error: 'First name and surname are required.' }, 400);
  }

  var email = validEmail(body.email) || syntheticEmail(whatsapp);

  /* uniqueness */
  var clash = await env.DB.prepare(
    'SELECT id, username, whatsapp FROM users WHERE username = ? OR whatsapp = ? OR email = ?'
  ).bind(u.username, whatsapp, email).all();
  var rows = (clash && clash.results) || [];
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].username === u.username) return json({ ok: false, error: 'That username is taken.' }, 409);
    if (rows[i].whatsapp === whatsapp) return json({ ok: false, error: 'That WhatsApp number is already registered.' }, 409);
    if (rows[i].email === email) return json({ ok: false, error: 'That email is already registered.' }, 409);
  }

  var salt = randomSalt(16);
  var hash = await hashPassword(p.password, salt, PBKDF2_ITER);
  var ts = now();
  var id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);

  var profile = {
    firstName: firstName,
    surname: surname,
    dob: body.dob || null,
    gender: body.gender || 'Prefer not to say',
    town: body.town || '',
    area: body.area || '',
    contacts: Array.isArray(body.contacts) ? body.contacts : [],
    favRestaurants: Array.isArray(body.favRestaurants) ? body.favRestaurants : [],
    favBottleStore: body.favBottleStore || null,
    notify: { promo: true, order: true }
  };

  try {
    await env.DB.prepare(
      'INSERT INTO users (id, email, name, status, is_admin, created_at, username, whatsapp, ' +
      'password_hash, password_salt, password_iter, verified, type, profile, updated_at) ' +
      'VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)'
    ).bind(
      id, email, firstName + ' ' + surname, 'active', ts,
      u.username, whatsapp, hash, salt, PBKDF2_ITER,
      type, JSON.stringify(profile), ts
    ).run();
  } catch (e) {
    return json({ ok: false, error: 'Could not create account. Try again.' }, 500);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO verifications (id, user_id, channel, code_hash, expires_at, attempts, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, 0, ?)'
    ).bind(uid('ver'), id, 'whatsapp', null, ts + (60 * 60 * 1000), ts).run();
  } catch (e) { /* non-fatal */ }

  var row = {
    id: id, username: u.username, whatsapp: whatsapp, email: email,
    name: firstName + ' ' + surname, type: type, verified: 0,
    photo_key: null, profile: JSON.stringify(profile)
  };

  return json({
    ok: true,
    user: publicUser(row),
    verify: {
      required: true,
      channel: 'whatsapp',
      whatsapp: phoneIntl(whatsapp),
      link: confirmLink(env, u.username, whatsapp)
    }
  }, 201);
}
