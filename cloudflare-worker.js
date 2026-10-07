/* ============================================================
   EATOUTS MEDIA WORKER
   Cloudflare Worker that fronts an R2 bucket.
   Paste this into the Workers editor when you set up Cloudflare.

   Environment variables to set in the Worker settings:
     BUCKET     = your R2 bucket binding (name it eatouts-media)
     SECRET     = a long random string; paste the same into
                  window.EATOUTS_CLOUD.secret in the client
     PUBLIC_BASE= the public URL prefix of your R2 bucket
                  (e.g. https://pub-xxxxx.r2.dev)

   Routes:
     POST /upload?path=<path>   store a file (body = bytes)
     GET  /json?path=<path>     return a JSON file
     GET  /health               simple ping
   ============================================================ */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.searchParams.get('path');

    /* ---------- basic CORS ---------- */
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Eatouts-Secret',
      'Access-Control-Max-Age': '86400'
    };
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    /* ---------- health ---------- */
    if (url.pathname === '/health') {
      return json({ ok: true, at: Date.now() }, cors);
    }

    /* ---------- auth ---------- */
    const supplied = request.headers.get('X-Eatouts-Secret') || '';
    if (!env.SECRET || supplied !== env.SECRET) {
      return json({ ok: false, error: 'unauthorised' }, cors, 401);
    }

    /* ---------- validate path ---------- */
    if (!path || path.indexOf('..') > -1 || path.startsWith('/')) {
      return json({ ok: false, error: 'bad path' }, cors, 400);
    }

    /* ---------- routes ---------- */
    if (url.pathname === '/upload' && request.method === 'POST') {
      return handleUpload(path, request, env, cors);
    }
    if (url.pathname === '/json' && request.method === 'GET') {
      return handleJson(path, env, cors);
    }

    return json({ ok: false, error: 'not found' }, cors, 404);
  }
};

async function handleUpload(path, request, env, cors) {
  try {
    const contentType = request.headers.get('content-type') || 'application/octet-stream';
    const body = await request.arrayBuffer();
    if (!body || body.byteLength === 0) {
      return json({ ok: false, error: 'empty body' }, cors, 400);
    }
    /* hard cap at 25 MB — bigger than any image, small enough to
       keep a single request safe */
    if (body.byteLength > 25 * 1024 * 1024) {
      return json({ ok: false, error: 'too large' }, cors, 413);
    }
    await env.BUCKET.put(path, body, {
      httpMetadata: { contentType: contentType }
    });
    const publicBase = String(env.PUBLIC_BASE || '').replace(/\/+$/,'');
    return json({
      ok: true,
      path: path,
      url: publicBase ? (publicBase + '/' + path) : path,
      size: body.byteLength
    }, cors);
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) }, cors, 500);
  }
}

async function handleJson(path, env, cors) {
  try {
    const obj = await env.BUCKET.get(path);
    if (!obj) {
      return json({ ok: false, error: 'not found' }, cors, 404);
    }
    const text = await obj.text();
    return new Response(text, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    });
  } catch (err) {
    return json({ ok: false, error: String(err && err.message || err) }, cors, 500);
  }
}

function json(obj, cors, status) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}