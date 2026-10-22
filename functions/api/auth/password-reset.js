/* ============================================================
   POST /api/auth/password-reset
   Start a password reset by email.

   Body: { email }

   The reply is ALWAYS the same generic message, whether or not the
   address belongs to an account, so this endpoint cannot be used to
   discover who has an EatOuts account.

   Only the SHA-256 hash of the reset token is stored. The raw token
   travels by email only, expires in 30 minutes and can be used once.
   ============================================================ */
import { json, now, readJson, rateLimit, clientIp, uid } from './../_shared.js';
import { validEmail } from './../_auth.js';
import { sendEmail, appBase } from './../_mail.js';

var TOKEN_TTL_MS = 30 * 60 * 1000;
var GENERIC_MESSAGE =
  'If an account exists for that email, we have sent a password reset link. ' +
  'It expires in 30 minutes.';

/** 32 random bytes as hex. */
function randomToken() {
  var buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  var out = '';
  for (var i = 0; i < buf.length; i++) out += (buf[i] + 0x100).toString(16).slice(1);
  return out;
}

/** SHA-256 of the raw token - the only part that is ever stored. */
async function tokenHash(raw) {
  var data = new TextEncoder().encode(String(raw));
  var digest = await crypto.subtle.digest('SHA-256', data);
  var bytes = new Uint8Array(digest);
  var out = '';
  for (var i = 0; i < bytes.length; i++) out += (bytes[i] + 0x100).toString(16).slice(1);
  return out;
}

function resetEmailHtml(link, name) {
  var who = name ? ('Hi ' + name + ',') : 'Hi,';
  return '' +
    '<div style="font-family:Inter,-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#171719;line-height:1.55">' +
      '<p style="font-size:17px;margin:0 0 16px">' + who + '</p>' +
      '<p style="font-size:15px;margin:0 0 16px">We received a request to reset the password on your EatOuts account.</p>' +
      '<p style="font-size:15px;margin:0 0 24px">' +
        '<a href="' + link + '" style="display:inline-block;background:#FF5A1F;color:#fff;text-decoration:none;' +
        'padding:13px 22px;border-radius:4px;font-weight:700;font-size:15px">Reset my password</a>' +
      '</p>' +
      '<p style="font-size:13.5px;color:#5E626B;margin:0 0 8px">Or paste this link into your browser:</p>' +
      '<p style="font-size:13px;color:#5E626B;margin:0 0 24px;word-break:break-all">' + link + '</p>' +
      '<p style="font-size:13.5px;color:#5E626B;margin:0 0 8px">This link expires in 30 minutes and can only be used once.</p>' +
      '<p style="font-size:13.5px;color:#5E626B;margin:0">' +
        'If you did not ask for this, you can ignore this email - your password will not change.' +
      '</p>' +
    '</div>';
}

function resetEmailText(link) {
  return [
    'We received a request to reset the password on your EatOuts account.',
    '',
    'Reset your password here:',
    link,
    '',
    'This link expires in 30 minutes and can only be used once.',
    'If you did not ask for this, you can ignore this email - your password will not change.'
  ].join('\n');
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var ip = clientIp(request);

  /* Throttle per IP. A throttled request still gets the generic reply so the
     endpoint cannot be used to probe for accounts either. */
  var ipLimit = await rateLimit(env, 'pwreset-ip:' + ip, 8, 900);
  if (!ipLimit.ok) return json({ ok: true, message: GENERIC_MESSAGE });

  var body = await readJson(request);
  var email = validEmail(body.email);
  if (!email) {
    return json({ ok: false, error: 'Enter a valid email address.' }, 400);
  }

  var emailLimit = await rateLimit(env, 'pwreset-mail:' + email, 3, 3600);
  if (!emailLimit.ok) return json({ ok: true, message: GENERIC_MESSAGE });

  var row = null;
  try {
    row = await env.DB.prepare(
      'SELECT id, name, email, type FROM users WHERE lower(email) = ? LIMIT 1'
    ).bind(email).first();
  } catch (e) {
    row = null;
  }

  if (!row) {
    /* No account for this address - answer exactly like we would for a real
       account so nothing can be learned from the response. */
    return json({ ok: true, message: GENERIC_MESSAGE });
  }

  var raw = randomToken();
  var hash = await tokenHash(raw);
  var ts = now();
  var expiresAt = ts + TOKEN_TTL_MS;

  try {
    /* Only the newest link stays usable. */
    await env.DB.prepare(
      'DELETE FROM password_resets WHERE user_id = ? AND used_at IS NULL'
    ).bind(row.id).run();

    await env.DB.prepare(
      'INSERT INTO password_resets (id, user_id, email, token_hash, expires_at, attempts, request_ip, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, 0, ?, ?)'
    ).bind(uid('pr'), row.id, email, hash, expiresAt, ip, ts).run();
  } catch (e) {
    /* The password_resets table may not exist yet (migration not applied).
       Stay quiet rather than leaking the state of the database. */
    return json({ ok: true, message: GENERIC_MESSAGE });
  }

  var base = appBase(env, request);
  var link = base + '/eatouts-login.html?reset_token=' + encodeURIComponent(raw);

  var sent = await sendEmail(env, {
    to: email,
    subject: 'Reset your EatOuts password',
    html: resetEmailHtml(link, row.name ? String(row.name).split(' ')[0] : ''),
    text: resetEmailText(link)
  });

  if (!sent.ok) {
    /* The address exists but the mail could not leave the building. The user
       still gets the generic reply; the failure is a server-side concern. */
    console.error('[password-reset] mail failed:', sent.error, sent.detail || '');
  }

  return json({ ok: true, message: GENERIC_MESSAGE });
}
