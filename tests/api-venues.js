/* API tests for the public canonical venue bundle:
   functions/api/venues/[id].js

   Stands up an in-memory fake of D1 and drives onRequestGet through
   id lookup, slug lookup, public-safe filtering (visible menu/gallery,
   active promos, published events) and the not-found / unconfigured
   paths. Also checks the row -> client mappers shape.

   Since T22b the same file also covers the LIST endpoint
   (functions/api/venues.js) with its own fake D1: the region filter on all
   three branches, the BW default, the unknown-code fallback, and region
   combining with ?q / ?mine rather than overriding it. */
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

function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeDB() {
  const restaurants = [{
    id: 'rest_1', slug: 'the-yard', name: 'The Yard', status: 'published', plan: 'growth',
    claimed: 1, town: 'Gaborone', district: 'SE', district_name: 'South East', area: 'CBD',
    landmark: 'Main Mall', description: 'A yard.', website: 'https://yard.bw',
    logo_ref: 'assets/logo.png', cover_ref: 'assets/cover.png', types: '["Restaurant","Bar"]',
    category: 'Restaurant', contacts: '[{"phone":"123"}]', socials: '[]',
    created_at: 1, updated_at: 2
  }];

  const menu_categories = [
    { id: 'cat_1', restaurant_id: 'rest_1', name: 'Grills', position: 0, created_at: 1 },
    { id: 'cat_2', restaurant_id: 'rest_1', name: 'Drinks', position: 1, created_at: 2 },
    { id: 'cat_x', restaurant_id: 'other', name: 'Nope', position: 0, created_at: 1 }
  ];
  const menu_items = [
    { id: 'it_1', restaurant_id: 'rest_1', category_id: 'cat_1', name: 'Steak', description: 'Ribeye', price: 120, currency: 'BWP', image_key: null, visible: 1, position: 0, created_at: 1, updated_at: 1 },
    { id: 'it_2', restaurant_id: 'rest_1', category_id: 'cat_1', name: 'Secret', description: 'hidden', price: 10, currency: 'BWP', image_key: null, visible: 0, position: 1, created_at: 2, updated_at: 2 },
    { id: 'it_x', restaurant_id: 'other', category_id: null, name: 'Other', description: '', price: 5, currency: 'BWP', image_key: null, visible: 1, position: 0, created_at: 1, updated_at: 1 }
  ];
  const gallery_groups = [
    { id: 'grp_1', restaurant_id: 'rest_1', title: 'Food', visible: 1, position: 0, created_at: 1 },
    { id: 'grp_2', restaurant_id: 'rest_1', title: 'Hidden', visible: 0, position: 1, created_at: 2 }
  ];
  const gallery_images = [
    { id: 'img_1', restaurant_id: 'rest_1', group_id: 'grp_1', image_key: 'a.jpg', label: 'A', visible: 1, position: 0, created_at: 1 },
    { id: 'img_2', restaurant_id: 'rest_1', group_id: 'grp_1', image_key: 'b.jpg', label: 'B', visible: 0, position: 1, created_at: 2 }
  ];
  const promos = [
    { id: 'pro_1', restaurant_id: 'rest_1', title: 'Live', details: 'x', image_key: null, active: 1, starts_at: 10, ends_at: 20, created_at: 1, updated_at: 1 },
    { id: 'pro_2', restaurant_id: 'rest_1', title: 'Dead', details: 'y', image_key: null, active: 0, starts_at: null, ends_at: null, created_at: 2, updated_at: 2 }
  ];
  const events = [
    { id: 'evt_1', restaurant_id: 'rest_1', title: 'Gig', description: 'd', figure: '{"lineup":["A"]}', image_key: 'e.jpg', admission: 'P50', starts_at: 1000, ends_at: 2000, published: 1, created_at: 1, updated_at: 1 },
    { id: 'evt_2', restaurant_id: 'rest_1', title: 'Draft', description: 'd', figure: null, image_key: null, admission: null, starts_at: 5, ends_at: 6, published: 0, created_at: 2, updated_at: 2 }
  ];

  function matches(sql) {
    const s = norm(sql);
    if (s.indexOf('FROM menu_categories WHERE restaurant_id = ?') >= 0) return { rows: menu_categories, filter: () => true };
    if (s.indexOf('FROM menu_items WHERE restaurant_id = ?') >= 0) return { rows: menu_items, filter: (x) => x.visible === 1 };
    if (s.indexOf('FROM gallery_groups WHERE restaurant_id = ?') >= 0) return { rows: gallery_groups, filter: (x) => x.visible === 1 };
    if (s.indexOf('FROM gallery_images WHERE restaurant_id = ?') >= 0) return { rows: gallery_images, filter: (x) => x.visible === 1 };
    if (s.indexOf('FROM promos WHERE restaurant_id = ?') >= 0) return { rows: promos, filter: (x) => x.active === 1 };
    if (s.indexOf('FROM events WHERE restaurant_id = ?') >= 0) return { rows: events, filter: (x) => x.published === 1 };
    return null;
  }

  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.indexOf('FROM restaurants WHERE id = ? OR slug = ?') >= 0) {
      const r = restaurants.find((x) => x.id === args[0] || x.slug === args[1]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('FROM restaurants WHERE lower(slug) = ?') >= 0) {
      const r = restaurants.find((x) => String(x.slug).toLowerCase() === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    const m = matches(sql);
    if (m) {
      const rows = m.rows.filter((x) => x.restaurant_id === args[0]).filter(m.filter);
      return rows;
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

function ctx(id, env) {
  return {
    request: new Request('https://eatouts.test/api/venues/' + encodeURIComponent(id || '')),
    env: env,
    params: id == null ? {} : { id: id }
  };
}

/* ---------- fake D1 for the LIST endpoint (functions/api/venues.js, T22b) ----------
   The list handler is a different module from venues/[id].js, so it gets its own
   seed: two BW venues, one ZA venue. Enough to prove the region filter, the BW
   default, and that region combines with q / mine instead of being overridden. */
function fakeListDB() {
  const restaurants = [
    { id: 'bw_1', slug: 'the-yard', name: 'The Yard', status: 'published', plan: 'growth', town: 'Gaborone', district_name: 'South East', area: 'CBD', logo_ref: 'a.png', types: '["Restaurant"]', region: 'BW' },
    { id: 'bw_2', slug: 'kgale-cafe', name: 'Kgale Cafe', status: 'unclaimed', plan: 'starter', town: 'Gaborone', district_name: 'South East', area: 'Kgale', logo_ref: null, types: null, region: 'BW' },
    { id: 'za_1', slug: 'moyo', name: 'Moyo', status: 'published', plan: 'pro', town: 'Cape Town', district_name: 'Western Cape', area: 'V&A', logo_ref: 'b.png', types: '["Bar"]', region: 'ZA' }
  ];
  const memberships = { user_1: ['bw_1', 'za_1'] };

  function exec(sql, args) {
    const s = norm(sql);
    if (s.indexOf('JOIN memberships m ON m.restaurant_id = r.id') >= 0) {
      const mine = memberships[args[0]] || [];
      return restaurants.filter((r) => mine.indexOf(r.id) >= 0 && r.region === args[1]).slice(0, args[2]);
    }
    if (s.indexOf('(name LIKE ? OR town LIKE ?)') >= 0) {
      const needle = String(args[0]).replace(/%/g, '').toLowerCase();
      return restaurants.filter((r) => r.region === args[2] &&
        (String(r.name).toLowerCase().indexOf(needle) >= 0 ||
         String(r.town).toLowerCase().indexOf(needle) >= 0)
      ).slice(0, args[3]);
    }
    if (s.indexOf('FROM restaurants WHERE region = ?') >= 0) {
      return restaurants.filter((r) => r.region === args[0]).slice(0, args[1]);
    }
    throw new Error('Unhandled SQL (list): ' + s);
  }

  return {
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind() { bound = Array.prototype.slice.call(arguments); return stmt; },
        async all() { return { results: exec(sql, bound) }; },
        async first() { return (exec(sql, bound) || [])[0] || null; },
        async run() { return { success: true }; }
      };
      return stmt;
    }
  };
}

/* Same shape as tests/api-business.js: _shared getSession() reads 'sess:<token>'. */
function fakeKV(sessions) {
  const m = new Map();
  Object.keys(sessions).forEach((tok) => m.set('sess:' + tok, JSON.stringify(sessions[tok])));
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

function listCtx(query, env) {
  const headers = {};
  if (env && env.token) headers.cookie = 'eatouts_session=' + env.token;
  return {
    request: new Request('https://eatouts.test/api/venues' + (query || ''), { headers: headers }),
    env: env,
    params: {}
  };
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions', 'api');
  const mod = await import(pathToFileURL(path.join(base, 'venues', '[id].js')).href);
  const env = { DB: fakeDB() };

  /* ---- by id ---- */
  let res = await mod.onRequestGet(ctx('rest_1', env));
  let j = await res.json();
  check('by id -> 200', res.status === 200, res.status);
  check('by id -> ok + venue', j.ok === true && j.venue && j.venue.id === 'rest_1', JSON.stringify(j).slice(0, 120));
  check('venue identity mapped', j.venue.slug === 'the-yard' && j.venue.town === 'Gaborone' && j.venue.types.length === 2);

  const c = j.venue.content;
  check('content bundle present', !!c && !!c.profile && Array.isArray(c.menuCategories));
  check('menu categories scoped + mapped', c.menuCategories.length === 2 && c.menuCategories[0].name === 'Grills', JSON.stringify(c.menuCategories));
  check('hidden menu item filtered', c.menuItems.length === 1 && c.menuItems[0].name === 'Steak', JSON.stringify(c.menuItems));
  check('menu item price mapped', c.menuItems[0].price === 120 && c.menuItems[0].categoryId === 'cat_1');
  check('hidden gallery group filtered', c.galleryGroups.length === 1 && c.galleryGroups[0].title === 'Food');
  check('hidden gallery image filtered', c.galleryImages.length === 1 && c.galleryImages[0].imageKey === 'a.jpg');
  check('inactive promo filtered', c.promos.length === 1 && c.promos[0].title === 'Live');
  check('unpublished event filtered', c.events.length === 1 && c.events[0].title === 'Gig');
  check('event figure parsed to JSON', c.events[0].figure && Array.isArray(c.events[0].figure.lineup));
  check('profile snapshot has no content cycle', c.profile && !c.profile.content && c.profile.id === 'rest_1');

  /* ---- by slug ---- */
  res = await mod.onRequestGet(ctx('the-yard', env));
  j = await res.json();
  check('by slug -> 200', res.status === 200 && j.venue && j.venue.id === 'rest_1', res.status);

  /* ---- case-insensitive slug ---- */
  res = await mod.onRequestGet(ctx('THE-YARD', env));
  j = await res.json();
  check('case-insensitive slug resolves', res.status === 200 && j.venue && j.venue.id === 'rest_1', res.status);

  /* ---- not found ---- */
  res = await mod.onRequestGet(ctx('nope', env));
  check('unknown id -> 404', res.status === 404, res.status);
  res = await mod.onRequestGet(ctx('', env));
  check('missing id -> 404', res.status === 404, res.status);

  /* ---- unconfigured ---- */
  res = await mod.onRequestGet(ctx('rest_1', {}));
  check('no backend -> 503', res.status === 503, res.status);

  /* ---- list endpoint: region filter (T22b) ----------------------------------
     functions/api/venues.js scopes every branch to one region. No param means
     BW (the only active region), an unknown code falls back to BW rather than
     returning nothing, and `region` rides along in the payload so the client
     never has to guess which region it just read. */
  console.log('');
  console.log('-- /api/venues (list) region filter --');
  const listMod = await import(pathToFileURL(path.join(base, 'venues.js')).href);

  let lres = await listMod.onRequestGet(listCtx('', { DB: fakeListDB() }));
  let lj = await lres.json();
  check('list -> 200', lres.status === 200, lres.status);
  check('list defaults to BW', lj.region === 'BW', JSON.stringify(lj).slice(0, 120));
  check('list returns only BW rows', lj.venues.length === 2 && lj.venues.every((v) => v.region === 'BW'),
    JSON.stringify(lj.venues.map((v) => v.region)));
  check('list rows carry the region column', lj.venues[0].region === 'BW');
  check('list parses types, null types -> []',
    Array.isArray(lj.venues[0].types) && lj.venues[0].types.length === 1 &&
    Array.isArray(lj.venues[1].types) && lj.venues[1].types.length === 0,
    JSON.stringify(lj.venues.map((v) => v.types)));

  lres = await listMod.onRequestGet(listCtx('?region=ZA', { DB: fakeListDB() }));
  lj = await lres.json();
  check('?region=ZA -> only the ZA venue',
    lj.region === 'ZA' && lj.venues.length === 1 && lj.venues[0].id === 'za_1', JSON.stringify(lj.venues));

  lres = await listMod.onRequestGet(listCtx('?region=za', { DB: fakeListDB() }));
  lj = await lres.json();
  check('?region=za is case-insensitive', lj.region === 'ZA' && lj.venues.length === 1, JSON.stringify(lj));

  lres = await listMod.onRequestGet(listCtx('?region=XX', { DB: fakeListDB() }));
  lj = await lres.json();
  check('unknown region falls back to BW, never an empty list',
    lj.region === 'BW' && lj.venues.length === 2, JSON.stringify(lj));

  lres = await listMod.onRequestGet(listCtx('?q=gaborone', { DB: fakeListDB() }));
  lj = await lres.json();
  check('?q= searches inside the region', lj.venues.length === 2, JSON.stringify(lj.venues));

  lres = await listMod.onRequestGet(listCtx('?q=cape%20town', { DB: fakeListDB() }));
  lj = await lres.json();
  check('?q= cannot reach another region', lj.venues.length === 0, JSON.stringify(lj.venues));

  lres = await listMod.onRequestGet(listCtx('?q=gaborone&region=ZA', { DB: fakeListDB() }));
  lj = await lres.json();
  check('q and region combine', lj.region === 'ZA' && lj.venues.length === 0, JSON.stringify(lj));

  lres = await listMod.onRequestGet(listCtx('?limit=1', { DB: fakeListDB() }));
  lj = await lres.json();
  check('limit is still honoured', lj.venues.length === 1, String(lj.venues.length));

  lres = await listMod.onRequestGet(listCtx('?mine=1', { DB: fakeListDB() }));
  check('mine without a session -> 401', lres.status === 401, lres.status);

  const mineEnv = { DB: fakeListDB(), OPS_KV: fakeKV({ tok1: { userId: 'user_1' } }), token: 'tok1' };
  lres = await listMod.onRequestGet(listCtx('?mine=1', mineEnv));
  lj = await lres.json();
  check('mine -> only this user\'s BW venues',
    lj.venues.length === 1 && lj.venues[0].id === 'bw_1', JSON.stringify(lj.venues));

  lres = await listMod.onRequestGet(listCtx('?mine=1&region=ZA', mineEnv));
  lj = await lres.json();
  check('mine + region -> only this user\'s ZA venues',
    lj.venues.length === 1 && lj.venues[0].id === 'za_1', JSON.stringify(lj.venues));

  lres = await listMod.onRequestGet(listCtx('', {}));
  check('list with no backend -> 503', lres.status === 503, lres.status);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.stack || err));
  process.exit(1);
});
