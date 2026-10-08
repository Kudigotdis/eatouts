/* ============================================================
   POST /api/upload?path=<key>   (requires a signed-in session)
   Body: raw file bytes. Content-Type is preserved.

   Media is stored in a Supabase Storage bucket (Cloudflare R2 is
   not used — it needs a card on file). Uploads go through the
   Supabase Storage REST API using a server-side service key that
   is kept as a Cloudflare secret, never in the browser.
   ============================================================ */
import { json, getSession } from './_shared.js';

function safeKey(raw) {
  var key = String(raw || '').replace(/^\/+/, '').trim();
  if (!key) return null;
  if (key.indexOf('..') !== -1) return null;
  if (!/^[A-Za-z0-9._\-\/]+$/.test(key)) return null;
  return key;
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;

  var session = await getSession(env, request);
  if (!session) return json({ error: 'unauthorized' }, 401);
  if (!env.SUPABASE_URL || !env.SUPABASE_KEY) {
    return json({ error: 'storage_not_configured' }, 503);
  }

  var url = new URL(request.url);
  var key = safeKey(url.searchParams.get('path'));
  if (!key) return json({ error: 'invalid path' }, 400);

  var bucket = env.SUPABASE_BUCKET || 'eatouts-media';
  var base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  var contentType = request.headers.get('content-type') || 'application/octet-stream';
  var body = await request.arrayBuffer();
  if (!body || !body.byteLength) return json({ error: 'empty body' }, 400);

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