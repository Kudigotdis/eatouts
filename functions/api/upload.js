/* ============================================================
   POST /api/upload?path=<key>   (requires a signed-in session)
   Body: raw file bytes. Content-Type is preserved.
   Stores into the R2 bucket bound as UPLOADS and returns the key
   plus a public URL when PUBLIC_BASE is configured.
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
  if (!env.UPLOADS) return json({ error: 'storage_not_configured' }, 503);

  var url = new URL(request.url);
  var key = safeKey(url.searchParams.get('path'));
  if (!key) return json({ error: 'invalid path' }, 400);

  var contentType = request.headers.get('content-type') || 'application/octet-stream';
  var body = await request.arrayBuffer();
  if (!body || !body.byteLength) return json({ error: 'empty body' }, 400);

  await env.UPLOADS.put(key, body, { httpMetadata: { contentType: contentType } });

  var base = String(env.PUBLIC_BASE || '').replace(/\/+$/, '');
  return json({
    ok: true,
    key: key,
    url: base ? base + '/' + key : null,
    bytes: body.byteLength,
    contentType: contentType
  });
}