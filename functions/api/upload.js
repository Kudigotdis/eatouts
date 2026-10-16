/* ============================================================
   POST /api/upload?path=<key>   (requires a signed-in session)
   Body: raw file bytes. Content-Type is preserved.

   Media is stored in a Supabase Storage bucket (Cloudflare R2 is
   not used — it needs a card on file). Uploads go through the
   Supabase Storage REST API using a server-side service key that
   is kept as a Cloudflare secret, never in the browser.
   ============================================================ */
import { json, getSession } from './_shared.js';

/* Allowlist of media types the app ever stores. Anything else is rejected
   before we touch storage, so the bucket cannot be used as a generic file
   host. Keep in sync with the client compressors/validators. */
var ALLOWED_TYPES = {
  'image/jpeg': 1,
  'image/png': 1,
  'image/webp': 1,
  'image/gif': 1,
  'image/avif': 1,
  'image/svg+xml': 0,
  'video/mp4': 1,
  'video/webm': 1,
  'video/quicktime': 1
};

var MAX_BYTES = 10 * 1024 * 1024;

function maxBytes(env) {
  var n = Number(env && env.EATOUTS_UPLOAD_MAX_BYTES);
  return n > 0 ? n : MAX_BYTES;
}

function normaliseType(raw) {
  var t = String(raw || '').split(';')[0].trim().toLowerCase();
  return t;
}

function safeKey(raw) {
  var key = String(raw || '').replace(/^\/+/, '').trim();
  if (!key) return null;
  if (key.indexOf('..') !== -1) return null;
  if (!/^[A-Za-z0-9._\-\/]+$/.test(key)) return null;
  return key;
}

export function onRequestGet(context) {
  return json({
    ok: true,
    maxBytes: maxBytes(context && context.env),
    types: Object.keys(ALLOWED_TYPES).filter(function (k) { return ALLOWED_TYPES[k]; })
  });
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  var session = await getSession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return json({ error: 'storage_not_configured' }, 503);
  }

  var limit = maxBytes(env);
  var url = new URL(request.url);
  var key = safeKey(url.searchParams.get('path'));
  if (!key) return json({ error: 'invalid path' }, 400);

  var bucket = env.SUPABASE_BUCKET || 'eatouts-media';
  var base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  var contentType = normaliseType(request.headers.get('content-type'));
  if (!ALLOWED_TYPES[contentType]) {
    return json({ error: 'unsupported_type', type: contentType || '' }, 415);
  }

  var declared = Number(request.headers.get('content-length'));
  if (declared && declared > limit) {
    return json({ error: 'too_large', maxBytes: limit }, 413);
  }

  var body = await request.arrayBuffer();
  if (!body || !body.byteLength) return json({ error: 'empty body' }, 400);
  if (body.byteLength > limit) {
    return json({ error: 'too_large', maxBytes: limit }, 413);
  }

  var endpoint = base + '/storage/v1/object/' + bucket + '/' + key;
  var res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      authorization: 'Bearer ' + env.SUPABASE_KEY,
      'content-type': contentType,
      'cache-control': 'public, max-age=31536000',
      'x-upsert': 'true'
    },
    body: body
  });

  if (!res.ok) {
    var detail = '';
    try { detail = await res.text(); } catch (e) { /* ignore */ }
    return json({ error: 'upload_failed', status: res.status, detail: String(detail).slice(0, 300) }, 502);
  }

  var publicBase = String(env.PUBLIC_BASE || (base + '/storage/v1/object/public/' + bucket)).replace(/\/+$/, '');
  return json({
    ok: true,
    key: key,
    bucket: bucket,
    url: publicBase + '/' + key,
    bytes: body.byteLength,
    contentType: contentType
  });
}