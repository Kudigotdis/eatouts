/* Server-side tests for POST /api/upload (functions/api/upload.js).
   Covers auth/config guards plus the E4 hardening: content-type allowlist,
   max-size limit, path validation, and the success path against a stubbed
   Supabase Storage API (global fetch is monkey-patched). */
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

function fakeKV(sessions) {
  const m = new Map();
  Object.keys(sessions || {}).forEach((tok) => m.set('sess:' + tok, JSON.stringify(sessions[tok])));
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

const ENV = {
  SUPABASE_URL: 'https://proj.supabase.co',
  SUPABASE_KEY: 'service-key',
  SUPABASE_BUCKET: 'eatouts-media',
  PUBLIC_BASE: '',
  OPS_KV: fakeKV({ good: { userId: 'u1', email: 'a@b.co' } })
};

function req(opts) {
  opts = opts || {};
  const url = new URL(opts.url || 'https://eatouts.test/api/upload?path=venues%2Fx%2Fa.png');
  const headers = {};
  if (opts.token) headers.cookie = 'eatouts_session=' + opts.token;
  if (opts.type) headers['content-type'] = opts.type;
  const body = opts.body;
  return new Request(url, { method: opts.method || 'POST', headers, body });
}

function ctx(env, request, params) {
  return { env: env || ENV, request, params: params || {} };
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions', 'api');
  const upload = await import(pathToFileURL(path.join(base, 'upload.js')).href);

  /* capture Supabase calls */
  const origFetch = globalThis.fetch;
  let lastFetch = null;
  let fetchResult = new Response('', { status: 200 });
  globalThis.fetch = function (url, init) {
    lastFetch = { url: String(url), init };
    return Promise.resolve(fetchResult);
  };

  async function body(res) { return res.json(); }

  /* ---- GET metadata ---- */
  let r = upload.onRequestGet({ env: ENV });
  let j = await body(r);
  check('GET returns 200 with allowlist', r.status === 200 && Array.isArray(j.types) && j.types.indexOf('image/png') >= 0);
  check('GET reports a max size', typeof j.maxBytes === 'number' && j.maxBytes > 0);

  /* ---- auth ---- */
  r = await upload.onRequestPost(ctx(ENV, req({})));
  check('401 without a session', r.status === 401, String(r.status));

  /* ---- config ---- */
  r = await upload.onRequestPost(ctx({ OPS_KV: ENV.OPS_KV }, req({ token: 'good' })));
  check('503 without storage config', r.status === 503, String(r.status));

  /* ---- path ---- */
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', url: 'https://x/api/upload?path=' + encodeURIComponent('../evil.png') })));
  check('400 on traversal path', r.status === 400, String(r.status));
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', url: 'https://x/api/upload' })));
  check('400 on missing path', r.status === 400, String(r.status));

  /* ---- content-type allowlist ---- */
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', body: 'xx', type: 'text/html' })));
  check('415 on disallowed type', r.status === 415, String(r.status));
  j = await body(r);
  check('415 echoes offending type', j.type === 'text/html', JSON.stringify(j));
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', body: 'xx' })));
  check('415 when content-type absent', r.status === 415, String(r.status));

  /* ---- max size ---- */
  const bigEnv = Object.assign({}, ENV, { EATOUTS_UPLOAD_MAX_BYTES: 4 });
  r = await upload.onRequestPost(ctx(bigEnv, req({ token: 'good', body: 'xxxxx', type: 'image/png' })));
  check('413 when body exceeds max', r.status === 413, String(r.status));
  j = await body(r);
  check('413 reports the limit', j.maxBytes === 4, JSON.stringify(j));

  /* ---- success ---- */
  fetchResult = new Response('', { status: 200 });
  lastFetch = null;
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', body: 'PNGDATA', type: 'image/png; charset=utf-8' })));
  check('200 on valid upload', r.status === 200, String(r.status));
  j = await body(r);
  check('success returns a public url', j.ok === true && /venues\/x\/a\.png$/.test(j.url), JSON.stringify(j));
  check('success posts to Supabase object endpoint',
    !!lastFetch && lastFetch.url === 'https://proj.supabase.co/storage/v1/object/eatouts-media/venues/x/a.png',
    lastFetch && lastFetch.url);
  check('success strips content-type params upstream',
    !!lastFetch && lastFetch.init.headers['content-type'] === 'image/png',
    lastFetch && lastFetch.init.headers['content-type']);

  /* ---- upstream failure ---- */
  fetchResult = new Response('nope', { status: 500 });
  r = await upload.onRequestPost(ctx(ENV, req({ token: 'good', body: 'PNGDATA', type: 'image/png' })));
  check('502 when Supabase fails', r.status === 502, String(r.status));

  /* ---- video allowed ---- */
  fetchResult = new Response('', { status: 200 });
  r = await upload.onRequestPost(ctx(ENV, req({
    token: 'good', body: 'MP4', type: 'video/mp4',
    url: 'https://x/api/upload?path=venues%2Fx%2Fa.mp4'
  })));
  check('200 on allowed video type', r.status === 200, String(r.status));

  globalThis.fetch = origFetch;

  console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
