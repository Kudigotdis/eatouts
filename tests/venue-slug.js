/* Edge-function tests for functions/[slug].js — venue slug router.

   Stands up an in-memory fake of D1 and drives onRequest through:
   restaurant found, bottle_store found, catering supplier found,
   case-insensitive fallback, unknown slug (404), unconfigured (503),
   reserved word (next), invalid slug format (next), multi-segment (next).
 */
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

function unescapeHtml(s) {
  return String(s || '')
    .replace(/&quot;/g, '"').replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

const restaurants = [{
  id: 'rest_kfc', slug: 'kfc', name: 'KFC', status: 'published',
  town: 'Gaborone', created_at: 1, updated_at: 2
}];

const business_links = [{
  id: 'blk_liquorama', country_code: 'bw', slug: 'liquorama', type: 'bottle_store',
  ref_id: 'liquorama', name: 'LIQUORAMA', status: 'active',
  created_at: 1, updated_at: 2
}, {
  id: 'blk_bontle', country_code: 'bw', slug: 'bontlemakonicatering', type: 'supplier',
  ref_id: 'demo_supplier_011', name: 'Bontle Makoni Catering', status: 'active',
  created_at: 1, updated_at: 2
}];

function fakeDB() {
  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.indexOf('FROM restaurants WHERE slug = ?') >= 0) {
      const r = restaurants.find((x) => x.slug === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('FROM restaurants WHERE lower(slug) = ?') >= 0) {
      const r = restaurants.find((x) => String(x.slug).toLowerCase() === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('FROM business_links WHERE country_code = ? AND slug = ?') >= 0) {
      const r = business_links.find((x) => x.country_code === args[0] && x.slug === args[1]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('FROM business_links WHERE country_code = ? AND lower(slug) = ?') >= 0) {
      const r = business_links.find((x) => x.country_code === args[0] && String(x.slug).toLowerCase() === args[1]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    throw new Error('Unhandled SQL: ' + s);
  }
  return {
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind() { bound = Array.prototype.slice.call(arguments); return stmt; },
        async first() { return exec(sql, bound, 'first'); },
        async all() { return { results: exec(sql, bound, 'all') }; },
        async run() { exec(sql, bound, 'run'); return { success: true }; }
      };
      return stmt;
    }
  };
}

const NEXT_SENTINEL = new Response('next', { status: 202 });

function ctx(url, env, nextFn) {
  return {
    request: new Request(url),
    env: env,
    params: {},
    next: nextFn || (() => NEXT_SENTINEL)
  };
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions');
  const mod = await import(pathToFileURL(path.join(base, '[slug].js')).href);
  const env = { DB: fakeDB(), ASSETS: { fetch: async () => new Response('<!doctype html><html><head><title>EatOuts</title></head><body></body></html>', { status: 200, headers: { 'content-type': 'text/html' } }) } };

  /* ---- restaurant found ---- */
  let res = await mod.onRequest(ctx('https://eatouts.site/kfc', env));
  check('restaurant -> 200', res.status === 200, res.status);
  let text = await res.text();
  check('restaurant -> text/html', res.headers.get('content-type').indexOf('text/html') >= 0);
  check('restaurant -> has base href', text.indexOf('<base href="/">') >= 0);
  check('restaurant -> has venue meta', text.indexOf('<meta name="eatouts-venue"') >= 0);
  let m = text.match(/<meta name="eatouts-venue" content="([^"]+)">/);
  check('restaurant -> meta parses', !!m);
  if (m) {
    let meta = JSON.parse(unescapeHtml(m[1]));
    check('restaurant meta id', meta.id === 'rest_kfc');
    check('restaurant meta slug', meta.slug === 'kfc');
    check('restaurant meta kind', meta.kind === 'restaurant');
    check('restaurant meta name', meta.name === 'KFC');
  }

  /* ---- bottle store found ---- */
  res = await mod.onRequest(ctx('https://eatouts.site/liquorama', env));
  check('bottle_store -> 200', res.status === 200, res.status);
  text = await res.text();
  m = text.match(/<meta name="eatouts-venue" content="([^"]+)">/);
  if (m) {
    let meta = JSON.parse(unescapeHtml(m[1]));
    check('bottle_store meta kind', meta.kind === 'bottle_store');
    check('bottle_store meta name', meta.name === 'LIQUORAMA');
  }

  /* ---- catering supplier found ---- */
  res = await mod.onRequest(ctx('https://eatouts.site/bontlemakonicatering', env));
  check('catering -> 200', res.status === 200, res.status);
  text = await res.text();
  m = text.match(/<meta name="eatouts-venue" content="([^"]+)">/);
  if (m) {
    let meta = JSON.parse(unescapeHtml(m[1]));
    check('catering meta kind', meta.kind === 'catering');
    check('catering meta name', meta.name === 'Bontle Makoni Catering');
  }

  /* ---- case-insensitive slug (business_links fallback) ---- */
  res = await mod.onRequest(ctx('https://eatouts.site/LIQUORAMA', env));
  check('case-insensitive bottle_store -> 200', res.status === 200, res.status);

  /* ---- unknown slug -> 404 ---- */
  res = await mod.onRequest(ctx('https://eatouts.site/nope', env));
  check('unknown -> 404', res.status === 404, res.status);
  text = await res.text();
  check('unknown -> has base href', text.indexOf('<base href="/">') >= 0);

  /* ---- unconfigured -> 503 ---- */
  res = await mod.onRequest(ctx('https://eatouts.site/kfc', {}));
  check('no backend -> 503', res.status === 503, res.status);

  /* ---- reserved word -> next() ---- */
  let nextCalled = false;
  res = await mod.onRequest(ctx('https://eatouts.site/api', env, () => { nextCalled = true; return NEXT_SENTINEL; }));
  check('reserved api -> next()', nextCalled && res === NEXT_SENTINEL);

  nextCalled = false;
  res = await mod.onRequest(ctx('https://eatouts.site/robots', env, () => { nextCalled = true; return NEXT_SENTINEL; }));
  check('reserved robots -> next()', nextCalled && res === NEXT_SENTINEL);

  /* ---- invalid slug format -> next() ---- */
  nextCalled = false;
  res = await mod.onRequest(ctx('https://eatouts.site/not-a-slug', env, () => { nextCalled = true; return NEXT_SENTINEL; }));
  check('hyphenated slug -> 404 (hyphens now valid)', !nextCalled && res.status === 404, nextCalled ? 'next() called' : res.status);

  nextCalled = false;
  res = await mod.onRequest(ctx('https://eatouts.site/has.dot', env, () => { nextCalled = true; return NEXT_SENTINEL; }));
  check('dotted slug -> next()', nextCalled && res === NEXT_SENTINEL);

  /* ---- multi-segment path -> next() ---- */
  nextCalled = false;
  res = await mod.onRequest(ctx('https://eatouts.site/kfc/menu', env, () => { nextCalled = true; return NEXT_SENTINEL; }));
  check('multi-segment -> next()', nextCalled && res === NEXT_SENTINEL);

  /* ---- D1 throws -> serve index.html without meta, boot to home, status 200 ---- */
  const SHELL = '<!doctype html><html><head><title>EatOuts</title></head><body></body></html>';
  const NEXT_SENTINEL2 = new Response('next', { status: 202 });
  const envThrow = {
    DB: { prepare() { throw new Error('D1 down'); } },
    ASSETS: { fetch: async () => new Response(SHELL, { status: 200, headers: { 'content-type': 'text/html' } }) }
  };
  const resThrow = await mod.onRequest({ request: new Request('https://eatouts.site/kfc'), env: envThrow, next: () => NEXT_SENTINEL2 });
  check('D1 error -> 200 (not 500)', resThrow.status === 200, resThrow.status);
  const textThrow = await resThrow.text();
  check('D1 error -> has base href', /<base href="\/">/i.test(textThrow));
  check('D1 error -> no venue meta', !/<meta name="eatouts-venue"/i.test(textThrow));

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.stack || err));
  process.exit(1);
});
