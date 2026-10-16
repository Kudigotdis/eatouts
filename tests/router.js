/* Public business links (vanity URLs).
   Covers: client slug rules + router, server slug parity + resolution,
   the /api/links/*, /api/business/link and /api/admin/links handlers, and
   the /bw/<slug> edge function - all against an in-memory fake of D1/KV/ASSETS. */
'use strict';

const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { pathToFileURL } = require('url');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

/* ---- client modules are classic scripts (root package.json is ESM), so
   load them in a browser-ish vm context that exposes window. ---- */
function loadClassic(rel, exportName) {
  const code = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  const win = {};
  const sandbox = {
    window: win,
    module: { exports: {} },
    URL, URLSearchParams, decodeURIComponent, encodeURIComponent,
    fetch: async () => { throw new Error('fetch not stubbed'); },
    console, Promise, setTimeout, clearTimeout
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return { api: win[exportName], sandbox: sandbox };
}

const slugLoaded = loadClassic('js/eatouts-slug.js', 'EatoutsSlug');
const routerLoaded = loadClassic('js/eatouts-router.js', 'EatoutsRouter');
const Slug = slugLoaded.api;
const Router = routerLoaded.api;
const routerSandbox = routerLoaded.sandbox;

/* ---- in-memory infra ---- */
function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeKV(sessions) {
  const m = new Map();
  Object.keys(sessions || {}).forEach((t) => m.set('sess:' + t, JSON.stringify(sessions[t])));
  return {
    _m: m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

const REGISTRY = {
  kfc: { slug: 'kfc', type: 'restaurant', refId: 'rest_kfc', name: 'KFC', display: 'KFC' },
  nandos: { slug: 'nandos', type: 'restaurant', refId: 'rest_nando-s', name: "Nando's", display: "Nando's" },
  tebogomolefeeventplanning: { slug: 'tebogomolefeeventplanning', type: 'supplier', refId: 'demo_supplier_001', name: 'Tebogo Molefe Event Planning', display: 'Tebogo Molefe Event Planning' },
  sefalana: { slug: 'sefalana', type: 'bottle_store', refId: 'store_sefalana', name: 'Sefalana Liquor', display: 'Sefalana Liquor' }
};

function fakeAssets(files) {
  return {
    async fetch(u) {
      const p = new URL(u && u.url ? u.url : u).pathname;
      if (Object.prototype.hasOwnProperty.call(files, p)) {
        return new Response(files[p], { status: 200 });
      }
      return new Response('not found', { status: 404 });
    }
  };
}

const ASSETS = fakeAssets({
  '/assets/data/link_registry.json': JSON.stringify({ country: 'bw', count: 4, bySlug: REGISTRY }),
  '/index.html': '<!doctype html><html><head><title>EatOuts</title></head><body>app</body></html>',
  '/404.html': '<!doctype html><title>Not found</title>'
});

function fakeDB(seed, restSeed) {
  const store = (seed || []).map((r) => Object.assign({}, r));
  const rests = (restSeed || []).map((r) => Object.assign({}, r));
  const memberships = [];
  const claims = [];
  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.startsWith('SELECT id, status, claimed FROM restaurants WHERE id = ?')) {
      const r = rests.find((x) => x.id === args[0]);
      const out = r ? { id: r.id, status: r.status, claimed: r.claimed } : null;
      return mode === 'first' ? out : (out ? [out] : []);
    }
    if (s.startsWith('SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ?')) {
      const r = memberships.find((x) => x.user_id === args[0] && x.restaurant_id === args[1]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.startsWith('SELECT COUNT(*) AS n FROM memberships')) {
      const n = memberships.filter((x) => x.restaurant_id === args[0] && x.role === 'owner' && x.status === 'active').length;
      const out = { n: n };
      return mode === 'first' ? out : [out];
    }
    if (s.startsWith('INSERT INTO memberships')) {
      const [id, user_id, restaurant_id, role, status, created_at] = args;
      memberships.push({ id, user_id, restaurant_id, role, status, created_at });
      return null;
    }
    if (s.startsWith('UPDATE restaurants SET claimed = 1')) {
      const r = rests.find((x) => x.id === args[1]);
      if (r) { r.claimed = 1; r.status = 'claimed'; }
      return null;
    }
    if (s.startsWith('INSERT INTO claims')) {
      const status = /'approved'/.test(s) ? 'approved' : 'pending';
      claims.push({ id: args[0], restaurant_id: args[1], user_id: args[2], status: status, evidence: args[3] });
      return null;
    }
    if (s.startsWith('SELECT type, ref_id, status FROM business_links WHERE country_code = ? AND slug = ?')) {
      const r = store.find((x) => x.country_code === args[0] && x.slug === args[1]);
      const out = r ? { type: r.type, ref_id: r.ref_id, status: r.status } : null;
      return mode === 'first' ? out : (out ? [out] : []);
    }
    if (s.startsWith('SELECT * FROM business_links WHERE country_code = ? AND slug = ?')) {
      const r = store.find((x) => x.country_code === args[0] && x.slug === args[1]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.startsWith('SELECT * FROM business_links WHERE country_code = ? AND ref_id = ?')) {
      const rows = store.filter((x) => x.country_code === args[0] && x.ref_id === args[1])
        .sort((a, b) => b.updated_at - a.updated_at).slice(0, args[2] || 20);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('SELECT * FROM business_links WHERE country_code = ? AND type = ? AND ref_id = ?')) {
      const r = store.find((x) => x.country_code === args[0] && x.type === args[1] &&
        x.ref_id === args[2] && x.status === 'active' && x.claimed_by) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.startsWith('SELECT * FROM business_links WHERE id = ?')) {
      const r = store.find((x) => x.id === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.startsWith('SELECT * FROM business_links')) {
      let rows = store.slice();
      let i = 0;
      if (s.includes('country_code = ?')) { const cc = args[i++]; rows = rows.filter((x) => x.country_code === cc); }
      if (s.includes('status = ?')) { const st = args[i++]; rows = rows.filter((x) => x.status === st); }
      if (s.includes('slug LIKE ?')) {
        const q = String(args[i++]).replace(/%/g, ''); i++; /* name LIKE ? */
        rows = rows.filter((x) => String(x.slug || '').includes(q) || String(x.name || '').includes(q));
      }
      rows = rows.sort((a, b) => b.updated_at - a.updated_at);
      const lim = args[args.length - 1];
      return mode === 'all' ? rows.slice(0, lim || 200) : (rows[0] || null);
    }
    if (s.startsWith("UPDATE business_links SET status = 'redirect'")) {
      const r = store.find((x) => x.id === args[2]);
      if (r) { r.status = 'redirect'; r.redirect_to = args[0]; r.updated_at = args[1]; }
      return null;
    }
    if (s.startsWith('UPDATE business_links SET status = ?, updated_at = ? WHERE id = ?')) {
      const r = store.find((x) => x.id === args[2]);
      if (r) { r.status = args[0]; r.updated_at = args[1]; }
      return null;
    }
    if (s.startsWith('INSERT INTO business_links')) {
      const [id, country_code, slug, type, ref_id, display_slug, name, , , claimed_by, created_at, updated_at] = args;
      const idx = store.findIndex((x) => x.country_code === country_code && x.slug === slug);
      if (idx >= 0) {
        store[idx] = Object.assign({}, store[idx], { type, ref_id, display_slug, name, status: 'active', redirect_to: null, claimed_by, updated_at });
      } else {
        store.push({ id, country_code, slug, type, ref_id, display_slug, name, status: 'active', redirect_to: null, claimed_by, created_at, updated_at });
      }
      return null;
    }
    throw new Error('Unhandled SQL: ' + s);
  }
  return {
    _store: store,
    _rests: rests,
    _memberships: memberships,
    _claims: claims,
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

function req(url, token, method, body) {
  const headers = {};
  if (token) headers.cookie = 'eatouts_session=' + token;
  const init = { method: method || 'GET', headers };
  if (body) { headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
  return new Request(url || 'https://eatouts.test/api/x', init);
}

const CUST = { userId: 'usr_cust', type: 'customer', isAdmin: false };
const ADMIN = { userId: 'usr_admin', type: 'customer', isAdmin: true };

(async () => {
  /* ===================== A. client slug rules ===================== */
  check('normalize strips spaces', Slug.normalize('Bright Star Bakery') === 'brightstarbakery', Slug.normalize('Bright Star Bakery'));
  check('normalize drops &', Slug.normalize('Fish & Chips') === 'fishchips', Slug.normalize('Fish & Chips'));
  check('normalize collapses dots', Slug.normalize('Bright..Star') === 'bright.star', Slug.normalize('Bright..Star'));
  check('normalize trims dots', Slug.normalize('.Lead.') === 'lead', Slug.normalize('.Lead.'));
  check('normalize lowercases + strips accents', Slug.normalize('Café') === 'cafe', Slug.normalize('Café'));
  check('isValid min length', Slug.isValid('ab') === false && Slug.isValid('abc') === true);
  check('isValid reserved', Slug.isValid('api') === false && Slug.isValid('bw') === false);
  check('isValid charset', Slug.isValid('a_b') === false && Slug.isValid('a-b') === false && Slug.isValid('a.b') === true);
  check('isValid max length', Slug.isValid('a'.repeat(41)) === false && Slug.isValid('a'.repeat(40)) === true);
  check('reason explains short', /at least/.test(Slug.reason('ab')), Slug.reason('ab'));
  check('reason reserved', /reserved/.test(Slug.reason('api')), Slug.reason('api'));
  check('url builds pretty link', Slug.url('bw', 'tops') === 'www.eatouts.online/bw/tops', Slug.url('bw', 'tops'));
  check('display capitalizes segments', Slug.display('brightstar.bakery') === 'Brightstar.Bakery', Slug.display('brightstar.bakery'));

  /* ===================== B. client router ===================== */
  const p1 = Router.fromPath('/bw/tops');
  check('fromPath parses /bw/<slug>', p1 && p1.country === 'bw' && p1.slug === 'tops', JSON.stringify(p1));
  check('fromPath ignores multi-char segment', Router.fromPath('/repo/readme') === null);
  check('fromPath ignores html page', Router.fromPath('/eatouts-suppliers.html') === null);
  const q1 = Router.fromQuery('?link=tops&country=bw');
  check('fromQuery parses ?link=', q1 && q1.slug === 'tops' && q1.country === 'bw', JSON.stringify(q1));
  check('fromQuery null without link', Router.fromQuery('?foo=1') === null);

  const metaDoc = { querySelector: (sel) => sel === 'meta[name="eatouts-vanity"]' ? { getAttribute: () => 'supplier|demo_supplier_001|tebogomolefeeventplanning' } : null };
  const metaTarget = Router.detect({ search: '', pathname: '/bw/whatever' }, metaDoc);
  check('detect prefers meta hint', metaTarget && metaTarget.type === 'supplier' && metaTarget.refId === 'demo_supplier_001', JSON.stringify(metaTarget));

  const pathTarget = Router.detect({ search: '', pathname: '/bw/tops' }, { querySelector: () => null });
  check('detect falls to path + needsResolve', pathTarget && pathTarget.slug === 'tops' && pathTarget.needsResolve === 1, JSON.stringify(pathTarget));

  const queryTarget = Router.detect({ search: '?link=sefalana', pathname: '/eatouts-suppliers.html' }, { querySelector: () => null });
  check('detect falls to ?link=', queryTarget && queryTarget.slug === 'sefalana' && queryTarget.needsResolve === 1, JSON.stringify(queryTarget));

  check('detect null on plain visit', Router.detect({ search: '', pathname: '/index.html' }, { querySelector: () => null }) === null);

  const realFetch = routerSandbox.fetch;
  routerSandbox.fetch = async () => ({ json: async () => ({ ok: true, found: true, link: { type: 'restaurant', refId: 'rest_x', slug: 'x', country: 'bw', name: 'X' } }) });
  const resolved = await Router.resolve({ slug: 'x', country: 'bw', needsResolve: 1 });
  check('resolve fills type/refId', resolved && resolved.type === 'restaurant' && resolved.refId === 'rest_x', JSON.stringify(resolved));
  routerSandbox.fetch = async () => ({ json: async () => ({ ok: true, found: true, redirect: true, country: 'bw', to: 'x2' }) });
  const redirect = await Router.resolve({ slug: 'x', country: 'bw', needsResolve: 1 });
  check('resolve passes redirect through', redirect && redirect.redirect === true && redirect.slug === 'x2', JSON.stringify(redirect));
  routerSandbox.fetch = realFetch;

  /* ===================== C. server slug parity ===================== */
  const linksMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', '_links.js')).href);
  check('server normalize matches client', linksMod.normalizeSlug('Bright Star Bakery') === Slug.normalize('Bright Star Bakery'));
  check('server isValidSlug matches client', linksMod.isValidSlug('nandos') === Slug.isValid('nandos') && linksMod.isValidSlug('ab') === Slug.isValid('ab'));
  check('server slugReason reserved', /reserved/.test(linksMod.slugReason('api')), linksMod.slugReason('api'));
  check('countryOf defaults + validates', linksMod.countryOf('BW') === 'bw' && linksMod.countryOf('usa') === 'bw' && linksMod.countryOf('') === 'bw');
  const lo = linksMod.linkOut({ id: 'b', country_code: 'bw', slug: 's', type: 'restaurant', ref_id: 'r', status: 'active', claimed_by: 'u1' });
  check('linkOut maps snake->camel', lo.refId === 'r' && lo.claimedBy === 'u1' && lo.displaySlug === 's', JSON.stringify(lo));

  const env = { DB: fakeDB(), OPS_KV: fakeKV({ ctok: CUST, atok: ADMIN }), ASSETS };

  /* ===================== D. resolveLink ===================== */
  const db1 = fakeDB([
    { id: 'blk_bw_kfc', country_code: 'bw', slug: 'kfc', type: 'restaurant', ref_id: 'rest_kfc', name: 'KFC', status: 'active', redirect_to: null, claimed_by: 'u1', created_at: 1, updated_at: 2 },
    { id: 'blk_bw_old', country_code: 'bw', slug: 'oldkfc', type: 'restaurant', ref_id: 'rest_kfc', name: 'KFC', status: 'redirect', redirect_to: 'kfc', claimed_by: 'u1', created_at: 1, updated_at: 3 },
    { id: 'blk_bw_dead', country_code: 'bw', slug: 'dead', type: 'restaurant', ref_id: 'rest_dead', name: 'Dead', status: 'revoked', redirect_to: null, claimed_by: 'u1', created_at: 1, updated_at: 1 }
  ]);
  const envD = { DB: db1, OPS_KV: env.OPS_KV, ASSETS };
  let hit = await linksMod.resolveLink({ env: envD, request: req('https://eatouts.test/bw/kfc') }, 'bw', 'kfc');
  check('resolveLink claimed active', hit.found && hit.type === 'restaurant' && hit.refId === 'rest_kfc' && hit.source === 'claimed', JSON.stringify(hit));
  hit = await linksMod.resolveLink({ env: envD, request: req('https://eatouts.test/bw/oldkfc') }, 'bw', 'oldkfc');
  check('resolveLink redirect', hit.found && hit.redirect === 'kfc', JSON.stringify(hit));
  hit = await linksMod.resolveLink({ env: envD, request: req('https://eatouts.test/bw/dead') }, 'bw', 'dead');
  check('resolveLink revoked -> not found', hit.found === false, JSON.stringify(hit));
  hit = await linksMod.resolveLink({ env: envD, request: req('https://eatouts.test/bw/nandos') }, 'bw', 'nandos');
  check('resolveLink registry fallback', hit.found && hit.refId === 'rest_nando-s' && hit.source === 'registry', JSON.stringify(hit));
  hit = await linksMod.resolveLink({ env: envD, request: req('https://eatouts.test/bw/zzz') }, 'bw', 'zzz');
  check('resolveLink miss', hit.found === false, JSON.stringify(hit));

  /* ===================== E. /api/links/check ===================== */
  const checkMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', 'links', 'check.js')).href);
  async function getCheck(url, e) {
    const r = await checkMod.onRequestGet({ request: new Request(url), env: e || env });
    return { status: r.status, body: await r.json() };
  }
  let c = await getCheck('https://eatouts.test/api/links/check?country=bw&slug=brandnew');
  check('check available', c.body.available === true && c.body.normalized === 'brandnew', JSON.stringify(c.body));
  c = await getCheck('https://eatouts.test/api/links/check?country=bw&slug=api');
  check('check reserved -> unavailable', c.body.available === false && /reserved/.test(c.body.reason), JSON.stringify(c.body));
  c = await getCheck('https://eatouts.test/api/links/check?country=bw&slug=nandos');
  check('check registry-taken -> unavailable', c.body.available === false && /taken/.test(c.body.reason), JSON.stringify(c.body));
  c = await getCheck('https://eatouts.test/api/links/check?country=bw&slug=nandos&refId=rest_nando-s');
  check('check own registry slug -> available', c.body.available === true, JSON.stringify(c.body));

  /* ===================== F. /api/links/resolve ===================== */
  const resolveMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', 'links', 'resolve.js')).href);
  async function getResolve(url, e) {
    const r = await resolveMod.onRequestGet({ request: new Request(url), env: e || env });
    return { status: r.status, body: await r.json() };
  }
  let rv = await getResolve('https://eatouts.test/api/links/resolve?country=bw&slug=kfc');
  check('resolve endpoint returns link', rv.body.found === true && rv.body.link.refId === 'rest_kfc', JSON.stringify(rv.body));
  rv = await getResolve('https://eatouts.test/api/links/resolve?country=bw&slug=oldkfc', envD);
  check('resolve endpoint returns redirect', rv.body.found === true && rv.body.redirect === true && rv.body.to === 'kfc', JSON.stringify(rv.body));
  rv = await getResolve('https://eatouts.test/api/links/resolve?country=bw&slug=zzz');
  check('resolve endpoint miss', rv.body.found === false, JSON.stringify(rv.body));

  /* ===================== G. /api/business/link ===================== */
  const bizMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', 'business', 'link.js')).href);
  const envG = { DB: fakeDB([], [{ id: 'rest_x', slug: 'x', name: 'Bakery X', status: 'unclaimed', claimed: 0 }]), OPS_KV: fakeKV({ ctok: CUST, atok: ADMIN, btok: { userId: 'usr_other', type: 'customer', isAdmin: false } }), ASSETS };

  let res = await bizMod.onRequestGet({ request: req('https://eatouts.test/api/business/link?country=bw&refId=rest_kfc'), env: envG });
  let j = await res.json();
  check('business GET no link -> null', res.status === 200 && j.link === null && Array.isArray(j.history), JSON.stringify(j));

  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', null, 'POST', { type: 'restaurant', refId: 'rest_x', slug: 'mybakery' }), env: envG });
  check('business POST without session -> 401', res.status === 401, res.status);

  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_x', slug: 'ab' }), env: envG });
  check('business POST short slug -> 400', res.status === 400, res.status);

  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'bogus', refId: 'rest_x', slug: 'mybakery' }), env: envG });
  check('business POST bad type -> 400', res.status === 400, res.status);

  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_x', slug: 'nandos' }), env: envG });
  check('business POST taken registry slug -> 409', res.status === 409, res.status);

  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_x', slug: 'mybakery' }), env: envG });
  j = await res.json();
  check('business POST claims slug', res.status === 200 && j.ok && j.link.slug === 'mybakery' && j.link.claimedBy === 'usr_cust', JSON.stringify(j));
  check('link POST bridges claim -> owner membership', j.claim === 'granted' && j.restaurantId === 'rest_x' && j.membership === 'owner', JSON.stringify(j));
  check('claim flips the restaurant to claimed', envG.DB._rests[0].claimed === 1 && envG.DB._rests[0].status === 'claimed', JSON.stringify(envG.DB._rests[0]));
  check('claim writes an approved claims row', envG.DB._claims.length === 1 && envG.DB._claims[0].status === 'approved', JSON.stringify(envG.DB._claims));

  /* second-claimer and re-claim bridge paths run in an isolated env so the
     downstream link-count assertions for envG stay unchanged */
  const envClaim = { DB: fakeDB([], [{ id: 'rest_y', slug: 'y', name: 'Cafe Y', status: 'unclaimed', claimed: 0 }]), OPS_KV: fakeKV({ ctok: CUST, btok: { userId: 'usr_other', type: 'customer', isAdmin: false } }), ASSETS };
  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_y', slug: 'y-one' }), env: envClaim });
  j = await res.json();
  check('isolated first claim -> granted owner', j.claim === 'granted' && j.membership === 'owner', JSON.stringify(j));
  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_y', slug: 'y-one' }), env: envClaim });
  j = await res.json();
  check('same active slug again -> already:true + already_member', j.ok && j.already === true && j.claim === 'already_member', JSON.stringify(j));
  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'btok', 'POST', { type: 'restaurant', refId: 'rest_y', slug: 'y-two' }), env: envClaim });
  j = await res.json();
  check('second claimer -> pending_review, no membership', j.claim === 'pending_review' && j.membership === null, JSON.stringify(j));
  check('second claim wrote a pending row', envClaim.DB._claims.some((x) => x.status === 'pending' && x.user_id === 'usr_other'), JSON.stringify(envClaim.DB._claims));

  /* change slug -> previous becomes redirect */
  res = await bizMod.onRequestPost({ request: req('https://eatouts.test/api/business/link', 'ctok', 'POST', { type: 'restaurant', refId: 'rest_x', slug: 'mybakery2' }), env: envG });
  j = await res.json();
  check('owner re-claim via slug change -> already_member', j.claim === 'already_member' && j.membership === 'owner', JSON.stringify(j));
  check('business POST change slug -> new active', j.link.slug === 'mybakery2' && j.link.status === 'active', JSON.stringify(j));
  const oldRow = envG.DB._store.find((x) => x.slug === 'mybakery');
  check('old slug retired to redirect', oldRow && oldRow.status === 'redirect' && oldRow.redirect_to === 'mybakery2', JSON.stringify(oldRow));

  res = await bizMod.onRequestGet({ request: req('https://eatouts.test/api/business/link?country=bw&refId=rest_x'), env: envG });
  j = await res.json();
  check('business GET returns active + history', j.link && j.link.slug === 'mybakery2' && j.history.length === 2, JSON.stringify(j));

  /* ===================== H. /api/admin/links ===================== */
  const adminMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', 'admin', 'links.js')).href);
  res = await adminMod.onRequestGet({ request: req('https://eatouts.test/api/admin/links', 'ctok'), env: envG });
  check('admin links GET non-admin -> 403', res.status === 403, res.status);

  res = await adminMod.onRequestGet({ request: req('https://eatouts.test/api/admin/links', 'atok'), env: envG });
  j = await res.json();
  check('admin links GET lists', Array.isArray(j.links) && j.links.length === 2, JSON.stringify(j.links));

  res = await adminMod.onRequestGet({ request: req('https://eatouts.test/api/admin/links?status=redirect', 'atok'), env: envG });
  j = await res.json();
  check('admin links status filter', j.links.length === 1 && j.links[0].status === 'redirect', JSON.stringify(j.links));

  res = await adminMod.onRequestGet({ request: req('https://eatouts.test/api/admin/links?q=mybakery2', 'atok'), env: envG });
  j = await res.json();
  check('admin links search', j.links.length === 1 && j.links[0].slug === 'mybakery2', JSON.stringify(j.links));

  const targetId = envG.DB._store.find((x) => x.slug === 'mybakery2').id;
  res = await adminMod.onRequestPatch({ request: req('https://eatouts.test/api/admin/links', 'atok', 'PATCH', { id: targetId, action: 'revoke' }), env: envG });
  j = await res.json();
  check('admin links revoke', j.ok && j.link.status === 'revoked', JSON.stringify(j));

  res = await adminMod.onRequestPatch({ request: req('https://eatouts.test/api/admin/links', 'atok', 'PATCH', { id: targetId, action: 'activate' }), env: envG });
  j = await res.json();
  check('admin links activate', j.ok && j.link.status === 'active', JSON.stringify(j));

  res = await adminMod.onRequestPatch({ request: req('https://eatouts.test/api/admin/links', 'atok', 'PATCH', { id: targetId, action: 'explode' }), env: envG });
  check('admin links bad action -> 400', res.status === 400, res.status);
  res = await adminMod.onRequestPatch({ request: req('https://eatouts.test/api/admin/links', 'atok', 'PATCH', { id: 'nope', action: 'revoke' }), env: envG });
  check('admin links missing row -> 404', res.status === 404, res.status);

  /* ===================== I. edge function /bw/<slug> ===================== */
  const edgeMod = await import(pathToFileURL(path.resolve(__dirname, '..', 'functions', 'bw', '[[path]].js')).href);
  async function edge(pathname, e) {
    const r = await edgeMod.onRequest({ request: new Request('https://www.eatouts.online' + pathname), env: e || env });
    return { status: r.status, location: r.headers.get('location'), body: await r.text() };
  }
  let e1 = await edge('/bw/kfc');
  check('edge found -> 200', e1.status === 200, e1.status);
  check('edge injects <base href="/">', e1.body.indexOf('<base href="/">') >= 0);
  check('edge injects vanity meta', /<meta name="eatouts-vanity" content="restaurant\|rest_kfc\|kfc">/.test(e1.body), e1.body.slice(0, 200));

  let e2 = await edge('/bw/oldkfc', envD);
  check('edge redirect -> 301', e2.status === 301 && e2.location === '/bw/kfc', e2.status + ' ' + e2.location);

  let e3 = await edge('/bw/zzz');
  check('edge miss -> 404', e3.status === 404, e3.status);

  let e4 = await edge('/bw/');
  check('edge no slug -> 404', e4.status === 404, e4.status);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.stack || err));
  process.exit(1);
});
