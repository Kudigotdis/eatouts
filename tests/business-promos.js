// Menu & Promos API tests — see plan 1792320102859
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
  Object.keys(sessions).forEach((tok) => m.set('sess:' + tok, JSON.stringify(sessions[tok])));
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeDB(seed) {
  const db = {
    users: [], restaurants: [], memberships: [],
    promos: [], favourites: []
  };
  Object.keys(seed || {}).forEach((t) => { db[t] = seed[t].slice(); });

  function exec(sql, args, mode) {
    const s = norm(sql);
    const first = (r) => (mode === 'first' ? (r || null) : (r ? [r] : []));

    if (s.startsWith('SELECT * FROM promos WHERE restaurant_id = ?')) {
      const rows = db.promos.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('SELECT * FROM promos WHERE id = ?')) {
      return first(db.promos.find((x) => x.id === args[0]));
    }
    if (s.startsWith('INSERT INTO promos')) {
      const cols = ['id', 'restaurant_id', 'title', 'image', 'type', 'description',
        'original_price', 'promo_price', 'location_json', 'start_date', 'start_time',
        'end_date', 'end_time', 'recurring', 'days_json', 'linked_menu_items_json',
        'action_json', 'sponsor', 'terms', 'status', 'created_at', 'updated_at'];
      const row = {}; cols.forEach((c, i) => { row[c] = args[i]; });
      db.promos.push(row); return null;
    }
    if (s.startsWith('UPDATE promos SET')) {
      const p = db.promos.find((x) => x.id === args[args.length - 1]);
      if (p) {
        const cols = ['title', 'image', 'type', 'description', 'original_price',
          'promo_price', 'location_json', 'start_date', 'start_time', 'end_date',
          'end_time', 'recurring', 'days_json', 'linked_menu_items_json',
          'action_json', 'sponsor', 'terms', 'status', 'updated_at'];
        cols.forEach((c, i) => { p[c] = args[i]; });
      }
      return null;
    }
    if (s.startsWith('DELETE FROM promos WHERE id = ?')) {
      const i = db.promos.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.promos.splice(i, 1);
      return null;
    }
    if (s.startsWith('INSERT INTO favourites')) {
      const cols = ['id', 'user_id', 'type', 'ref_id', 'title', 'created_at'];
      const row = {}; cols.forEach((c, i) => { row[c] = args[i]; });
      db.favourites.push(row); return null;
    }
    if (s.startsWith('DELETE FROM favourites WHERE type = ? AND ref_id = ?')) {
      const before = db.favourites.length;
      db.favourites = db.favourites.filter((f) => !(f.type === args[0] && f.ref_id === args[1]));
      return { changes: before - db.favourites.length };
    }
    if (s.startsWith('SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ? AND status')) {
      return first(db.memberships.find((m) => m.user_id === args[0] && m.restaurant_id === args[1] && m.status === 'active'));
    }
    if (s.startsWith('SELECT * FROM users WHERE email = ?')) {
      return first(db.users.find((u) => u.email === args[0]));
    }
    throw new Error('fakeDB: unhandled SQL -> ' + s);
  }

  return {
    _db: db,
    prepare(sql) {
      return {
        bind() { const args = [].slice.call(arguments); return {
          first: async () => exec(sql, args, 'first'),
          all: async () => ({ results: exec(sql, args, 'all') || [] }),
          run: async () => { exec(sql, args, 'run'); return { success: true }; }
        }; }
      };
    }
  };
}

function ctx(env, opts) {
  opts = opts || {};
  const url = new URL(opts.url || 'https://eatouts.test/api/business/promos');
  const headers = {};
  if (opts.token) headers.cookie = 'eatouts_session=' + opts.token;
  const method = opts.method || 'GET';
  let body;
  if (opts.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    headers['content-type'] = 'application/json'; body = JSON.stringify(opts.body);
  }
  const req = new Request(url, { method, headers, body });
  return { env, request: req, params: opts.params || {} };
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions', 'api');
const biz = await import(pathToFileURL(path.join(base, '_business.js')).href);
const promos = await import(pathToFileURL(path.join(base, 'business', 'promos.js')).href);
const promosId = await import(pathToFileURL(path.join(base, 'business', 'promos', '[id].js')).href);

const seed = {
  users: [
    { id: 'usr_owner', username: 'owner', name: 'Owner', email: 'owner@x.co', whatsapp: '26770000001' },
    { id: 'usr_mark', username: 'mark', name: 'Marketer', email: 'mark@x.co', whatsapp: '26770000002' }
  ],
  restaurants: [
    { id: 'rest_1', slug: 'the-yard', name: 'The Yard', status: 'published', plan: 'pro', claimed: 1, types: '[]', contacts: '[]', socials: '[]', features: '[]', created_at: 1, updated_at: 1 }
  ],
  memberships: [
    { id: 'mem_owner1', user_id: 'usr_owner', restaurant_id: 'rest_1', role: 'owner', status: 'active', created_at: 1 },
    { id: 'mem_mark1', user_id: 'usr_mark', restaurant_id: 'rest_1', role: 'marketing_manager', status: 'active', created_at: 2 }
  ],
  favourites: [
    { id: 'fav_old', user_id: 'usr_owner', type: 'promo', ref_id: 'promo_ghost', title: 'Ghost', created_at: 1 }
  ]
};
const sessions = {
  owner: { userId: 'usr_owner', type: 'customer', isAdmin: false },
  mark: { userId: 'usr_mark', type: 'customer', isAdmin: false }
};
const env = { DB: fakeDB(seed), OPS_KV: fakeKV(sessions) };

/* ---- pure helpers ---- */
const po = biz.promoOut({
  id: 'p1', restaurant_id: 'rest_1', title: '2-for-1', image: 'i.jpg', type: 'Food Special',
  description: 'desc', original_price: 100, promo_price: 50,
  location_json: '{"city":"Gaborone"}', start_date: '2026-11-01', start_time: '12:00',
  end_date: '2026-11-30', end_time: '23:00', recurring: 1,
  days_json: '["Monday"]', linked_menu_items_json: '["m1"]',
  action_json: '{"type":"reserve"}', sponsor: 'Sponsor', terms: 'T&Cs', status: 'active',
  created_at: 1000, updated_at: 2000
});
check('promoOut maps scalars', po.title === '2-for-1' && po.image === 'i.jpg' && po.type === 'Food Special');
check('promoOut parses JSON columns', po.locationJson.city === 'Gaborone' && po.daysJson[0] === 'Monday' && po.linkedMenuItemsJson[0] === 'm1' && po.actionJson.type === 'reserve');
check('promoOut parses numerics', po.originalPrice === 100 && po.promoPrice === 50);
check('promoOut parses flags', po.recurring === true && po.status === 'active' && po.createdAt === 1000 && po.updatedAt === 2000);
check('promoOut null-safe', biz.promoOut(null) === null);

/* ---- GET / POST ---- */
let r = await promos.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/promos?restaurant=rest_1' }));
let j = await r.json();
check('GET promos empty initially', r.status === 200 && j.ok && j.promos.length === 0, JSON.stringify(j));

r = await promos.onRequestGet(ctx(env, { token: 'mark', url: 'https://x/api/business/promos?restaurant=rest_2' }));
check('marketing_manager cannot read other venue -> 403', r.status === 403, r.status);

r = await promos.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://x/api/business/promos?restaurant=rest_1', body: { description: 'no title' } }));
check('POST without title -> 400', r.status === 400, r.status);

r = await promos.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://x/api/business/promos?restaurant=rest_1', body: {
  title: 'Castle Lite Bucket', image: 'castle.jpg', type: 'Beverage', description: 'Deal',
  originalPrice: 220, promoPrice: 180, locationJson: { city: 'Gaborone' }, startDate: '2026-11-01',
  startTime: '18:00', endDate: '2026-11-30', endTime: '23:00', recurring: true, daysJson: ['Monday'],
  linkedMenuItemsJson: ['m1'], actionJson: { type: 'reserve' }, sponsor: 'Castle', terms: 'T&Cs', status: 'active'
} }));
j = await r.json();
check('POST creates promo -> 201', r.status === 201 && j.ok && j.promo, r.status + ' ' + JSON.stringify(j));
check('POST returns mapped fields', j.promo && j.promo.title === 'Castle Lite Bucket' && j.promo.originalPrice === 220 && j.promo.promoPrice === 180 && j.promo.recurring === true && j.promo.status === 'active');
const promoId = j.promo && j.promo.id;

/* ---- PATCH / DELETE (purge) ---- */
r = await promosId.onRequestPatch(ctx(env, { token: 'mark', method: 'PATCH', params: { id: promoId }, url: 'https://x/api/business/promos/' + promoId, body: { title: 'Castle Lite Bucket 2', promoPrice: 150, endsAt: null } }));
j = await r.json();
check('PATCH updates promo', r.status === 200 && j.promo && j.promo.title === 'Castle Lite Bucket 2' && j.promo.promoPrice === 150, JSON.stringify(j));

/* add a favourite pointing at the promo, then delete the promo */
await env.DB.prepare('INSERT INTO favourites (id, user_id, type, ref_id, title, created_at) VALUES (?, ?, ?, ?, ?, ?)')
  .bind('fav_promo', 'usr_owner', 'promo', promoId, 'Castle', 5000).run();
check('favourite seeded', env.DB._db.favourites.some((f) => f.type === 'promo' && f.ref_id === promoId));

r = await promosId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: promoId }, url: 'https://x/api/business/promos/' + promoId }));
check('DELETE promo -> 200', r.status === 200, r.status);
check('promo row removed', !env.DB._db.promos.some((x) => x.id === promoId));
check('DELETE purges matching favourite', !env.DB._db.favourites.some((f) => f.type === 'promo' && f.ref_id === promoId));
check('unrelated favourite survives', env.DB._db.favourites.some((f) => f.id === 'fav_old'));

/* ---- bridge contract (jsdom) ---- */
const fs = require('fs');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const rel = 'js/eatouts-business-api.js';
const f = path.join(path.resolve(__dirname, '..'), rel.split('?')[0].replace(/\//g, path.sep));
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
  fs.readFileSync(f, 'utf8') + '</script></body></html>';
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
const dom = new JSDOM(html, { url: 'http://localhost/promo-onboarding.html', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
setTimeout(() => {
  const api = w.EatoutsBusinessApi;
  check('EatoutsBusinessApi exists', !!api);
  ['promosRead', 'promoCreate', 'promoUpdate', 'promoDelete', 'promoToServer', 'promoFromServer'].forEach((m) => {
    check('bridge method ' + m, typeof api[m] === 'function');
  });

  const local = { id: 'p1', title: 'Deal', image: 'i.jpg', type: 'Food Special', description: 'd',
    originalPrice: 100, promoPrice: 50, location: { city: 'Gaborone' }, startDate: '2026-11-01',
    startTime: '12:00', endDate: '2026-11-30', endTime: '23:00', recurring: true, days: ['Monday'],
    linkedMenuItems: ['m1'], action: { type: 'reserve' }, sponsor: 'S', terms: 'T', status: 'active' };
  const toServer = api.promoToServer(local);
  check('promoToServer maps', toServer.title === 'Deal' && toServer.originalPrice === 100 && toServer.recurring === true && Array.isArray(toServer.daysJson) && toServer.daysJson[0] === 'Monday' && toServer.actionJson.type === 'reserve');

  const fromServer = api.promoFromServer({ id: 'p1', title: 'Deal', image: 'i.jpg', type: 'Food Special',
    description: 'd', originalPrice: 100, promoPrice: 50, locationJson: { city: 'Gaborone' },
    startDate: '2026-11-01', startTime: '12:00', endDate: '2026-11-30', endTime: '23:00', recurring: 1,
    daysJson: ['Monday'], linkedMenuItemsJson: ['m1'], actionJson: { type: 'reserve' },
    sponsor: 'S', terms: 'T', status: 'active', createdAt: 1000, updatedAt: 2000 });
  check('promoFromServer maps', fromServer.title === 'Deal' && fromServer.originalPrice === 100 && fromServer.recurring === true && fromServer.days[0] === 'Monday' && fromServer.linkedMenuItems[0] === 'm1' && fromServer.status === 'active');
  check('promoFromServer round-trips location', fromServer.location && fromServer.location.city === 'Gaborone');

  console.log('');
  console.log(fails ? (fails + ' FAILED') : ('all ' + checks + ' business promo checks passed'));
  process.exit(fails ? 1 : 0);
}, 200);
})().catch((err) => { console.log('FAIL suite threw: ' + (err && err.stack || err)); process.exit(1); });