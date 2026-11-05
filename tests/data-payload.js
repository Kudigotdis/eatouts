/* Payload behind the gate tests - Milestone C of the roadmap
   (docs/ACCESS-CONTROL-PLAN.md section 5.4).

   Covers, in order:
     A. method            - GET/HEAD only
     B. path safety       - traversal, escapes, dots, double slashes, empty
     C. extension gate    - the four types the app loads, nothing else
     D. serving           - body passthrough, content-type, private no-store
     E. revalidation      - ETag passthrough and a real 304
     F. failure modes     - no asset binding, store errors, upstream 404
     G. routes contract   - /data/* is NOT excluded, so the gate still runs
     H. consumers         - no app file still points at /data

   In-memory fake of env.ASSETS only: no wrangler, no network, no dist needed.
   The Functions are ESM, so they are imported through pathToFileURL (same
   pattern as tests/access-gate.js).
   */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

/* --------------------------------------------------------------- fakes ---- */

/* Every path this store is asked for, so a test can prove the Function asked
   the asset server for the right thing. */
const asked = [];

function fakeAssets(files) {
  const map = new Map(Object.entries(files || {}));
  return {
    async fetch(input) {
      const url = typeof input === 'string' ? input : input.url;
      asked.push(url);
      const hit = map.get(new URL(url).pathname);
      if (!hit) return new Response('nope', { status: 404 });
      const headers = {};
      if (hit.etag) headers.etag = hit.etag;
      return new Response(hit.body, { status: 200, headers });
    }
  };
}

function req(pathname, opts) {
  const o = opts || {};
  return new Request('https://www.eatouts.site' + pathname, {
    method: o.method || 'GET',
    headers: new Headers(o.headers || {})
  });
}

function ctx(pathname, env, opts) {
  return { request: req(pathname, opts), env: env || {}, next: async () => new Response('next') };
}

async function main() {
  const mod = await import(pathToFileURL(path.join(ROOT, 'functions', 'data', '[[path]].js')).href);
  const onRequest = mod.onRequest;

  /* --------------------------------------------------- A. method ---- */
  console.log('\n-- A. method --');
  {
    const env = { ASSETS: fakeAssets({ '/data/event_types.js': { body: 'x' } }) };
    const res = await onRequest(ctx('/data/event_types.js', env, { method: 'POST' }));
    check('POST is 405', res.status === 405);
    check('405 names the allowed methods', (res.headers.get('allow') || '').indexOf('GET') >= 0);
    check('HEAD is served', (await onRequest(ctx('/data/event_types.js', env, { method: 'HEAD' }))).status === 200);
    check('GET is served', (await onRequest(ctx('/data/event_types.js', env))).status === 200);
  }

  /* --------------------------------------------- B. path safety ---- */
  console.log('\n-- B. path safety --');
  {
    const env = { ASSETS: fakeAssets({}) };
    asked.length = 0;   /* section A already used the store */
    const bad = [
      '/data/../../etc/passwd',
      '/data/%2e%2e/secret.json',
      '/data/demo//demo-data.js',
      '/data/',
      '/data'
    ];
    for (const p of bad) {
      const res = await onRequest(ctx(p, env));
      check('rejects ' + p, res.status === 404, String(res.status));
    }
    check('a rejected path never reaches the asset store', asked.length === 0, asked.join(' | '));

    /* "." and ".." are collapsed by the URL parser before the Function sees the
       path, so /data/./x IS /data/x - the invariant is that it can never resolve
       outside /data, not that the dot is refused. */
    const dotted = { ASSETS: fakeAssets({ '/data/event_types.js': { body: 'x' } }) };
    const dotRes = await onRequest(ctx('/data/./event_types.js', dotted));
    check('a dot segment stays inside /data', dotRes.status === 200);
    check('... and is normalised, not passed through',
      asked.length === 1 && asked[0] === 'https://www.eatouts.site/data/event_types.js',
      asked.join(' | '));
  }

  /* ------------------------------------------- C. extension gate ---- */
  console.log('\n-- C. extension gate --');
  {
    const env = { ASSETS: fakeAssets({
      '/data/event_types.js': { body: 'x' },
      '/data/listings_export.csv': { body: 'a,b' },
      '/data/restaurant_listings/directory_data.db': { body: 'BIN' },
      '/data/CateringServicesDatabase.js.bak': { body: 'OLD' },
      '/data/noext': { body: 'x' }
    }) };
    const jsonEnv = { ASSETS: fakeAssets({ '/data/alcohols.json': { body: '{}' } }) };
    check('.json is served', (await onRequest(ctx('/data/alcohols.json', jsonEnv))).status === 200);
    check('.js is served', (await onRequest(ctx('/data/event_types.js', env))).status === 200);
    check('.csv is served', (await onRequest(ctx('/data/listings_export.csv', env))).status === 200);
    for (const p of ['/data/restaurant_listings/directory_data.db', '/data/CateringServicesDatabase.js.bak', '/data/noext']) {
      const res = await onRequest(ctx(p, env));
      check('refuses ' + p, res.status === 404, String(res.status));
    }
  }

  /* -------------------------------------------------- D. serving ---- */
  console.log('\n-- D. serving --');
  {
    const payload = JSON.stringify({ venues: ['a', 'b'] });
    const env = { ASSETS: fakeAssets({ '/data/venue-provider-list.js': { body: payload, etag: '"abc123"' } }) };
    const res = await onRequest(ctx('/data/venue-provider-list.js', env));
    check('the body is passed through untouched', (await res.text()) === payload);
    check('content-type follows the extension',
      (res.headers.get('content-type') || '').indexOf('text/javascript') === 0,
      res.headers.get('content-type'));
    check('cache-control is private, no-store',
      (res.headers.get('cache-control') || '') === 'private, no-store, must-revalidate',
      res.headers.get('cache-control'));
    check('nosniff is set', res.headers.get('x-content-type-options') === 'nosniff');
    check('x-robots-tag is noindex', (res.headers.get('x-robots-tag') || '').indexOf('noindex') >= 0);
    check('the asset store was asked for /data/<file>',
      asked.some(u => u.indexOf('/data/venue-provider-list.js') >= 0), asked.join(' | '));
    const sub = { ASSETS: fakeAssets({ '/data/demo/the-food-place/demo-data.js': { body: 'var x=1;' } }) };
    check('nested folders work',
      (await onRequest(ctx('/data/demo/the-food-place/demo-data.js', sub))).status === 200);
  }

  /* ------------------------------------------- E. revalidation ---- */
  console.log('\n-- E. revalidation --');
  {
    const env = { ASSETS: fakeAssets({ '/data/alcohols.json': { body: '{"a":1}', etag: '"v7"' } }) };
    const first = await onRequest(ctx('/data/alcohols.json', env));
    check('the asset validator is passed through', first.headers.get('etag') === '"v7"');
    const again = await onRequest(ctx('/data/alcohols.json', env, { headers: { 'if-none-match': '"v7"' } }));
    check('a matching If-None-Match is a 304', again.status === 304, String(again.status));
    check('the 304 carries no body', again.body === null);
    check('the 304 keeps the no-store header', (again.headers.get('cache-control') || '').indexOf('no-store') > -1);
    const stale = await onRequest(ctx('/data/alcohols.json', env, { headers: { 'if-none-match': '"v6"' } }));
    check('a stale If-None-Match is still 200', stale.status === 200);
    const noTag = { ASSETS: fakeAssets({ '/data/alcohols.json': { body: '{"a":1}' } }) };
    const untagged = await onRequest(ctx('/data/alcohols.json', noTag));
    check('no upstream ETag means no ETag header', !untagged.headers.get('etag'));
    check('... and no 304 support without one',
      (await onRequest(ctx('/data/alcohols.json', noTag, { headers: { 'if-none-match': '*' } }))).status === 200);
  }

  /* -------------------------------------------- F. failure modes ---- */
  console.log('\n-- F. failure modes --');
  {
    const noBinding = await onRequest(ctx('/data/alcohols.json', {}));
    check('a missing asset binding is 503, not a crash', noBinding.status === 503);
    check('... and says nothing about the path', (await noBinding.json()).error === 'assets_unavailable');

    const boom = { ASSETS: { fetch: async () => { throw new Error('kaboom'); } } };
    check('a throwing asset store is 404', (await onRequest(ctx('/data/alcohols.json', boom))).status === 404);

    const missing = await onRequest(ctx('/data/does-not-exist.json', { ASSETS: fakeAssets({}) }));
    check('an upstream 404 is a 404', missing.status === 404);
    check('the 404 body is generic', (await missing.json()).error === 'not_found');
  }

  /* ------------------------------------------ G. routes contract ---- */
  console.log('\n-- G. routes contract --');
  {
    const src = fs.readFileSync(path.join(ROOT, 'copy-static.mjs'), 'utf8');
    const block = (src.match(/const staticExcludes = \[([\s\S]*?)\];/) || ['', ''])[1];
    check('/data/* is not excluded, so the gate sees it',
      block.indexOf("'/data/*'") === -1 && block.indexOf('"/data/*"') === -1);
    check('/assets/* is still excluded', block.indexOf("'/assets/*'") !== -1);
    check('the payload folder is published by name', /const FOLDERS = \[[\s\S]*?'data'/.test(src));
    check('no /assets/data special case is left',
      src.indexOf("'assets/data'") === -1 && src.indexOf('"assets/data"') === -1);
  }

  /* ------------------------------------------------ H. consumers ---- */
  console.log('\n-- H. consumers --');
  {
    const consumers = []
      .concat(fs.readdirSync(ROOT).filter(f => /\.html$/.test(f)).map(f => path.join(ROOT, f)))
      .concat(fs.readdirSync(path.join(ROOT, 'js')).filter(f => /\.js$/.test(f)).map(f => path.join(ROOT, 'js', f)))
      .concat(fs.readdirSync(path.join(ROOT, 'functions')).filter(f => /\.js$/.test(f)).map(f => path.join(ROOT, 'functions', f)));
    const offenders = consumers.filter(f => {
      const text = fs.readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')   /* a block comment may still explain the old layout */
        .replace(/^\s*\/\/.*$/gm, '');      /* ... and so may a line comment */
      return /['"]\/?assets\/data\//.test(text);
    });
    check('no app file still requests /assets/data', offenders.length === 0,
      offenders.map(f => path.basename(f)).join(' | '));

    /* The payload only reaches a visitor through the Function now, so the app
       has to actually be asking for /data/*. */
    const asking = consumers.filter(f => /['"]\/data\/[A-Za-z0-9._/-]+/.test(fs.readFileSync(f, 'utf8')));
    check('the app asks for /data/* instead', asking.length > 20, String(asking.length));
  }

  /* -------------------------------------------------------- summary */
  console.log('');
  if (fails === 0) {
    console.log(`DATA-PAYLOAD PASSED (${checks} checks).`);
    process.exit(0);
  }
  console.log(`DATA-PAYLOAD FAILED: ${fails} of ${checks} checks failed.`);
  process.exit(1);
}

main().catch(e => {
  console.log('DATA-PAYLOAD CRASHED: ' + (e && e.stack ? e.stack : e));
  process.exit(1);
});
