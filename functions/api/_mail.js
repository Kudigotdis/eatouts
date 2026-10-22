/* ============================================================
   EATOUTS MAIL
   Provider-agnostic transactional email for Pages Functions.

   Workers cannot open raw SMTP sockets, so the mailer speaks HTTP to
   a transactional API. The provider is detected from whichever secret
   is present, in this order:

     1. Resend  (RESEND_API_KEY)   -> https://api.resend.com/emails
     2. Brevo  (BREVO_API_KEY)     -> https://api.brevo.com/v3/smtp/email

   When nothing is configured the mailer returns
   { ok: false, error: 'email_not_configured' } so the caller can
   degrade instead of throwing.

   The sender comes from EMAIL_FROM ("EatOuts <info@eatouts.site>").
   Files starting with "_" are not routed by Pages, so this module is
   import-only.
   ============================================================ */

var FROM_FALLBACK = 'EatOuts <info@eatouts.site>';

/** "EatOuts <info@eatouts.site>" -> { name: 'EatOuts', email: '...' } */
export function parseFrom(raw) {
  var s = String(raw == null ? '' : raw).trim() || FROM_FALLBACK;
  var m = s.match(/^\s*(.*?)\s*<\s*([^>]+?)\s*>\s*$/);
  if (m) {
    var name = String(m[1] || '').replace(/^"|"$/g, '').trim();
    return { name: name, email: m[2] };
  }
  return { name: '', email: s };
}

/** Which provider this deployment is wired to, or null. */
export function mailProvider(env) {
  if (!env) return null;
  if (env.RESEND_API_KEY) return 'resend';
  if (env.BREVO_API_KEY) return 'brevo';
  return null;
}

/** True when this deployment can actually send mail. */
export function mailConfigured(env) {
  return !!mailProvider(env);
}

async function sendResend(env, opts, from) {
  var body = {
    from: from.name ? (from.name + ' <' + from.email + '>') : from.email,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject || 'EatOuts'
  };
  if (opts.html) body.html = opts.html;
  if (opts.text) body.text = opts.text;
  if (opts.replyTo) body.reply_to = opts.replyTo;

  var res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'authorization': 'Bearer ' + env.RESEND_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  var data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON error page */ }

  if (!res.ok) {
    return {
      ok: false,
      error: 'email_send_failed',
      status: res.status,
      detail: (data && (data.message || data.name)) || 'resend error'
    };
  }
  return { ok: true, provider: 'resend', id: (data && data.id) || null };
}

async function sendBrevo(env, opts, from) {
  var body = {
    sender: { name: from.name || 'EatOuts', email: from.email },
    to: [{ email: Array.isArray(opts.to) ? opts.to[0] : opts.to }],
    subject: opts.subject || 'EatOuts'
  };
  if (opts.html) body.htmlContent = opts.html;
  if (opts.text) body.textContent = opts.text;
  if (opts.replyTo) body.replyTo = { email: opts.replyTo };

  var res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  var data = {};
  try { data = await res.json(); } catch (e) { /* non-JSON error page */ }

  if (!res.ok) {
    return {
      ok: false,
      error: 'email_send_failed',
      status: res.status,
      detail: (data && (data.message || (data.error && data.error.message))) || 'brevo error'
    };
  }
  return { ok: true, provider: 'brevo', id: (data && data.messageId) || null };
}

/**
 * Send one email.
 *
 * @param env      { RESEND_API_KEY | BREVO_API_KEY, EMAIL_FROM }
 * @param options  { to, subject, html?, text?, from?, replyTo? }
 * @returns        { ok: true, provider, id } | { ok: false, error, detail? }
 */
export async function sendEmail(env, options) {
  var opts = options || {};
  if (!opts.to) return { ok: false, error: 'missing_recipient' };

  var provider = mailProvider(env);
  if (!provider) return { ok: false, error: 'email_not_configured' };

  var from = parseFrom(opts.from || env.EMAIL_FROM);

  try {
    if (provider === 'resend') return await sendResend(env, opts, from);
    if (provider === 'brevo') return await sendBrevo(env, opts, from);
    return { ok: false, error: 'email_provider_unsupported' };
  } catch (e) {
    return {
      ok: false,
      error: 'email_send_failed',
      detail: String((e && e.message) || e)
    };
  }
}

/** Absolute link back into the app, honouring PUBLIC_BASE when set. */
export function appBase(env, request) {
  var base = String((env && env.PUBLIC_BASE) || '').trim();
  if (!base) {
    try { base = new URL(request.url).origin; }
    catch (e) { base = ''; }
  }
  return base.replace(/\/+$/, '');
}
