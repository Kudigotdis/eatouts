/* API flow tests for the business/staff/menu endpoints.
   Stands up an in-memory fake of D1 + KV and drives the real handlers under
   functions/api/business/* through create -> profile -> staff -> menu.
   Also checks the pure _business.js mappers + role ranking. */
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
    restaurants: [], memberships: [], users: [],
    invites: [], menu_categories: [], menu_items: []
  };
  Object.keys(seed || {}).forEach((t) => { db[t] = seed[t].slice(); });

  function userById(id) { return db.users.find((u) => u.id === id); }
  function withUser(m) {
    const u = userById(m.user_id) || {};
    return Object.assign({}, m, {
      username: u.username || null, name: u.name || null, email: u.email || null,
      whatsapp: u.whatsapp || null, photo_key: u.photo_key || null
    });
  }

  function exec(sql, args, mode) {
    const s = norm(sql);
    const first = (r) => (mode === 'first' ? (r || null) : (r ? [r] : []));

    /* restaurants */
    if (s.startsWith('INSERT INTO restaurants')) {
      const cols = ['id', 'slug', 'name', 'status', 'plan', 'claimed', 'town', 'district',
        'district_name', 'area', 'landmark', 'description', 'website', 'types', 'category',
        'contacts', 'socials', 'hours', 'price_range', 'features', 'created_at', 'updated_at'];
      const row = {}; cols.forEach((c, i) => { row[c] = args[i]; });
      db.restaurants.push(row); return null;
    }
    if (s.startsWith('SELECT id FROM restaurants WHERE slug = ?')) {
      return first(db.restaurants.find((r) => r.slug === args[0]));
    }
    if (s.startsWith('SELECT * FROM restaurants WHERE id = ?')) {
      return first(db.restaurants.find((r) => r.id === args[0]));
    }
    if (s.startsWith('UPDATE restaurants SET')) {
      const r = db.restaurants.find((x) => x.id === args[args.length - 1]);
      if (r) {
        const cols = ['name', 'town', 'district', 'district_name', 'area', 'landmark',
          'description', 'website', 'logo_ref', 'cover_ref', 'types', 'category', 'contacts',
          'socials', 'hours', 'price_range', 'features', 'updated_at'];
        cols.forEach((c, i) => { r[c] = args[i]; });
      }
      return null;
    }

    /* memberships */
    if (s.startsWith('INSERT INTO memberships')) {
      const [id, user_id, restaurant_id, role, status, created_at] = args;
      db.memberships.push({ id, user_id, restaurant_id, role, status, created_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ? AND status')) {
      return first(db.memberships.find((m) => m.user_id === args[0] && m.restaurant_id === args[1] && m.status === 'active'));
    }
    if (s.startsWith('SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ?')) {
      return first(db.memberships.find((m) => m.user_id === args[0] && m.restaurant_id === args[1]));
    }
    if (s.startsWith('SELECT COUNT(*) AS n FROM memberships WHERE restaurant_id = ?')) {
      const n = db.memberships.filter((m) => m.restaurant_id === args[0] && m.role === 'owner' && m.status === 'active').length;
      return mode === 'first' ? { n } : [{ n }];
    }
    if (s.startsWith('SELECT m.*') && s.indexOf('WHERE m.restaurant_id = ?') > 0) {
      const rows = db.memberships.filter((m) => m.restaurant_id === args[0]);
      return mode === 'all' ? rows.map(withUser) : (rows[0] ? withUser(rows[0]) : null);
    }
    if (s.startsWith('SELECT * FROM memberships WHERE id = ?') ||
        s.startsWith('SELECT m.*, u.username')) {
      const id = args[0];
      const m = db.memberships.find((x) => x.id === id);
      return first(m ? withUser(m) : null);
    }
    if (s.startsWith('SELECT r.*, m.role AS role')) {
      const rows = db.memberships
        .filter((m) => m.user_id === args[0] && m.status === 'active')
        .map((m) => {
          const r = db.restaurants.find((x) => x.id === m.restaurant_id) || {};
          return Object.assign({}, r, { role: m.role, membership_id: m.id });
        })
        .sort((a, b) => String(a.name).localeCompare(String(b.name)));
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE memberships SET role = ?, status = ? WHERE id = ?')) {
      const m = db.memberships.find((x) => x.id === args[2]);
      if (m) { m.role = args[0]; m.status = args[1]; }
      return null;
    }
    if (s.startsWith("UPDATE memberships SET role = ?, status = 'active' WHERE id = ?")) {
      const m = db.memberships.find((x) => x.id === args[1]);
      if (m) { m.role = args[0]; m.status = 'active'; }
      return null;
    }
    if (s.startsWith('DELETE FROM memberships WHERE id = ?')) {
      const i = db.memberships.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.memberships.splice(i, 1);
      return null;
    }

    /* users */
    if (s.startsWith('SELECT * FROM users WHERE email = ?')) {
      return first(db.users.find((u) => u.email === args[0]));
    }
    if (s.startsWith('SELECT * FROM users WHERE whatsapp = ?')) {
      return first(db.users.find((u) => u.whatsapp === args[0]));
    }
    if (s.startsWith('SELECT * FROM users WHERE username = ?')) {
      return first(db.users.find((u) => u.username === args[0]));
    }

    /* invites */
    if (s.startsWith('INSERT INTO invites')) {
      const [id, restaurant_id, email, role, token, invited_by, expires_at, created_at] = args;
      db.invites.push({ id, restaurant_id, email, role, token, invited_by, expires_at, created_at });
      return null;
    }

    /* menu categories */
    if (s.startsWith('INSERT INTO menu_categories')) {
      const [id, restaurant_id, name, position, created_at] = args;
      db.menu_categories.push({ id, restaurant_id, name, position, created_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM menu_categories WHERE id = ?')) {
      return first(db.menu_categories.find((x) => x.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM menu_categories WHERE restaurant_id = ?')) {
      const rows = db.menu_categories.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE menu_categories SET name = ?, position = ? WHERE id = ?')) {
      const c = db.menu_categories.find((x) => x.id === args[2]);
      if (c) { c.name = args[0]; c.position = args[1]; }
      return null;
    }
    if (s.startsWith('DELETE FROM menu_categories WHERE id = ?')) {
      const i = db.menu_categories.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.menu_categories.splice(i, 1);
      return null;
    }

    /* menu items */
    if (s.startsWith('INSERT INTO menu_items')) {
      const [id, restaurant_id, category_id, name, description, price, currency, image_key, visible, position, created_at, updated_at] = args;
      db.menu_items.push({ id, restaurant_id, category_id, name, description, price, currency, image_key, visible, position, created_at, updated_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM menu_items WHERE id = ?')) {
      return first(db.menu_items.find((x) => x.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM menu_items WHERE restaurant_id = ?')) {
      const rows = db.menu_items.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE menu_items SET category_id = NULL WHERE category_id = ?')) {
      db.menu_items.forEach((x) => { if (x.category_id === args[0]) x.category_id = null; });
      return null;
    }
    if (s.startsWith('UPDATE menu_items SET category_id = ?')) {
      const it = db.menu_items.find((x) => x.id === args[args.length - 1]);
      if (it) {
        const cols = ['category_id', 'name', 'description', 'price', 'currency', 'image_key', 'visible', 'position', 'updated_at'];
        cols.forEach((c, i) => { it[c] = args[i]; });
      }
      return null;
    }
    if (s.startsWith('DELETE FROM menu_items WHERE id = ?')) {
      const i = db.menu_items.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.menu_items.splice(i, 1);
      return null;
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
  const url = new URL(opts.url || 'https://eatouts.test/api/business/mine');
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
  const mine = await import(pathToFileURL(path.join(base, 'business', 'mine.js')).href);
  const profile = await import(pathToFileURL(path.join(base, 'business', 'profile.js')).href);
  const staff = await import(pathToFileURL(path.join(base, 'business', 'staff.js')).href);
  const staffId = await import(pathToFileURL(path.join(base, 'business', 'staff', '[id].js')).href);
  const menu = await import(pathToFileURL(path.join(base, 'business', 'menu.js')).href);
  const cats = await import(pathToFileURL(path.join(base, 'business', 'menu', 'categories.js')).href);
  const catId = await import(pathToFileURL(path.join(base, 'business', 'menu', 'categories', '[id].js')).href);
  const items = await import(pathToFileURL(path.join(base, 'business', 'menu', 'items.js')).href);
  const itemId = await import(pathToFileURL(path.join(base, 'business', 'menu', 'items', '[id].js')).href);

  /* ---- pure helpers ---- */
  check('roleRank orders roles', biz.roleRank('owner') > biz.roleRank('manager') &&
    biz.roleRank('manager') > biz.roleRank('menu_manager'));
  check('validRole accepts known', biz.validRole('menu_manager') === true);
  check('validRole rejects unknown', biz.validRole('wizard') === false);
  check('slugify normalises', biz.slugify('The Yard! BBQ') === 'the-yard-bbq');
  const ro = biz.restaurantOut({ id: 'r1', slug: 's', name: 'N', types: '["bar"]', features: '["wifi"]', hours: '{"mon":"9-5"}' });
  check('restaurantOut parses lists', ro.types[0] === 'bar' && ro.features[0] === 'wifi' && ro.hours.mon === '9-5');
  check('restaurantOut null-safe', biz.restaurantOut(null) === null);
  check('categoryOut maps', biz.categoryOut({ id: 'c', restaurant_id: 'r', name: 'Mains' }).name === 'Mains');
  check('itemOut maps', biz.itemOut({ id: 'i', name: 'Stew', price: 50, currency: 'BWP' }).price === 50);

  /* ---- seed store ---- */
  const seed = {
    users: [
      { id: 'usr_owner', username: 'owner', name: 'Owner', email: 'owner@x.co', whatsapp: '26770000001' },
      { id: 'usr_mark', username: 'mark', name: 'Marketer', email: 'mark@x.co', whatsapp: '26770000002' },
      { id: 'usr_other', username: 'other', name: 'Other', email: 'other@x.co', whatsapp: '26770000003' }
    ],
    restaurants: [
      { id: 'rest_1', slug: 'the-yard', name: 'The Yard', status: 'published', plan: 'pro', claimed: 1, types: '[]', contacts: '[]', socials: '[]', features: '[]', created_at: 1, updated_at: 1 },
      { id: 'rest_2', slug: 'bar-one', name: 'Bar One', status: 'draft', plan: 'starter', claimed: 1, types: '[]', contacts: '[]', socials: '[]', features: '[]', created_at: 1, updated_at: 1 }
    ],
    memberships: [
      { id: 'mem_owner1', user_id: 'usr_owner', restaurant_id: 'rest_1', role: 'owner', status: 'active', created_at: 1 },
      { id: 'mem_mark1', user_id: 'usr_mark', restaurant_id: 'rest_1', role: 'marketing_manager', status: 'active', created_at: 2 }
    ]
  };
  const sessions = {
    owner: { userId: 'usr_owner', type: 'customer', isAdmin: false },
    mark: { userId: 'usr_mark', type: 'customer', isAdmin: false },
    other: { userId: 'usr_other', type: 'customer', isAdmin: false },
    admin: { userId: 'usr_admin', type: 'customer', isAdmin: true }
  };
  const env = { DB: fakeDB(seed), OPS_KV: fakeKV(sessions) };

  /* ---- auth guards ---- */
  let r = await mine.onRequestGet(ctx(env, {}));
  check('mine without session -> 401', r.status === 401, r.status);
  r = await mine.onRequestGet(ctx({}, { token: 'owner' }));
  check('mine unconfigured backend -> 503', r.status === 503, r.status);

  /* ---- list mine ---- */
  r = await mine.onRequestGet(ctx(env, { token: 'owner' }));
  let j = await r.json();
  check('owner sees own business', j.businesses.length === 1 && j.businesses[0].id === 'rest_1' && j.businesses[0].role === 'owner', JSON.stringify(j));
  r = await mine.onRequestGet(ctx(env, { token: 'other' }));
  j = await r.json();
  check('non-member sees none', j.businesses.length === 0, JSON.stringify(j));

  /* ---- create business ---- */
  r = await mine.onRequestPost(ctx(env, { token: 'other', method: 'POST', body: { name: 'New Spot' } }));
  j = await r.json();
  check('create -> 201', r.status === 201, r.status);
  check('create seeds owner role', j.business && j.business.role === 'owner' && j.business.status === 'draft');
  check('create slugifies', /^new-spot/.test(j.business.slug), j.business.slug);
  const newId = j.business.id;
  r = await mine.onRequestPost(ctx(env, { token: 'other', body: {} }));
  check('create without name -> 400', r.status === 400, r.status);

  /* ---- profile read/update ---- */
  r = await profile.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/profile?restaurant=rest_1' }));
  j = await r.json();
  check('profile read for owner', j.business.id === 'rest_1' && j.business.role === 'owner', JSON.stringify(j));

  r = await profile.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', url: 'https://eatouts.test/api/business/profile?restaurant=rest_1', body: { name: 'The Yard 2', town: 'Gaborone', features: ['wifi', 'parking'] } }));
  j = await r.json();
  check('owner patches profile', r.status === 200 && j.business.name === 'The Yard 2' && j.business.features.length === 2, JSON.stringify(j));

  r = await profile.onRequestPatch(ctx(env, { token: 'mark', method: 'PATCH', url: 'https://eatouts.test/api/business/profile?restaurant=rest_1', body: { name: 'hack' } }));
  check('marketing_manager cannot patch profile -> 403', r.status === 403, r.status);
  r = await profile.onRequestGet(ctx(env, { token: 'mark', url: 'https://eatouts.test/api/business/profile?restaurant=rest_1' }));
  check('marketing_manager can read profile', r.status === 200, r.status);

  r = await profile.onRequestGet(ctx(env, { token: 'other', url: 'https://eatouts.test/api/business/profile?restaurant=rest_1' }));
  check('non-member profile -> 403', r.status === 403, r.status);
  r = await profile.onRequestGet(ctx(env, { token: 'owner', url: 'https://eatouts.test/api/business/profile?restaurant=rest_2' }));
  check('owner of other venue -> 403', r.status === 403, r.status);

  /* ---- staff ---- */
  r = await staff.onRequestGet(ctx(env, { token: 'owner', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1' }));
  j = await r.json();
  check('owner lists staff', j.staff.length === 2 && j.staff[0].user.email, JSON.stringify(j));
  r = await staff.onRequestGet(ctx(env, { token: 'mark', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1' }));
  check('marketing_manager cannot list staff -> 403', r.status === 403, r.status);

  r = await staff.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1', body: { email: 'other@x.co', role: 'manager' } }));
  j = await r.json();
  check('owner adds existing staff member', r.status === 201 && j.membership.role === 'manager' && j.membership.user.id === 'usr_other', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await staff.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1', body: { email: 'new@x.co', role: 'menu_manager' } }));
  j = await r.json();
  check('unknown email -> invite', r.status === 201 && j.invited === true && j.invite.token, JSON.stringify(j));

  r = await staff.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1', body: { email: 'x@x.co', role: 'wizard' } }));
  check('bad role -> 400', r.status === 400, r.status);

  r = await staff.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://eatouts.test/api/business/staff?restaurant=rest_1', body: { email: 'z@x.co', role: 'manager' } }));
  check('marketing_manager cannot add staff -> 403', r.status === 403, r.status);

  /* ---- staff [id]: change + last-owner guard ---- */
  r = await staffId.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', params: { id: 'mem_mark1' }, url: 'https://eatouts.test/api/business/staff/mem_mark1', body: { role: 'manager' } }));
  j = await r.json();
  check('owner changes a member role', r.status === 200 && j.membership.role === 'manager', JSON.stringify(j));

  r = await staffId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: 'mem_owner1' }, url: 'https://eatouts.test/api/business/staff/mem_owner1' }));
  check('cannot delete last owner -> 400', r.status === 400, r.status);
  r = await staffId.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', params: { id: 'mem_owner1' }, url: 'https://eatouts.test/api/business/staff/mem_owner1', body: { role: 'manager' } }));
  check('cannot demote last owner -> 400', r.status === 400, r.status);

  r = await staffId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: 'mem_mark1' }, url: 'https://eatouts.test/api/business/staff/mem_mark1' }));
  check('owner removes non-owner member', r.status === 200, r.status);

  /* ---- menu ---- */
  r = await cats.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/menu/categories?restaurant=rest_1', body: { name: 'Mains' } }));
  j = await r.json();
  check('create category', r.status === 201 && j.category.name === 'Mains', JSON.stringify(j));
  const catIdVal = j.category.id;

  r = await items.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/menu/items?restaurant=rest_1', body: { name: 'Beef Stew', categoryId: catIdVal, price: 55 } }));
  j = await r.json();
  check('create item', r.status === 201 && j.item.name === 'Beef Stew' && j.item.price === 55, JSON.stringify(j));
  const itemIdVal = j.item.id;

  r = await menu.onRequestGet(ctx(env, { token: 'mark', url: 'https://eatouts.test/api/business/menu?restaurant=rest_1' }));
  check('menu read requires menu_manager -> 403 for marketing', r.status === 403, r.status);
  r = await menu.onRequestGet(ctx(env, { token: 'owner', url: 'https://eatouts.test/api/business/menu?restaurant=rest_1' }));
  j = await r.json();
  check('menu lists category + item', j.categories.length === 1 && j.items.length === 1, JSON.stringify(j));

  r = await itemId.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', params: { id: itemIdVal }, url: 'https://eatouts.test/api/business/menu/items/' + itemIdVal, body: { price: 60, visible: false } }));
  j = await r.json();
  check('patch item', r.status === 200 && j.item.price === 60 && j.item.visible === false, JSON.stringify(j));

  r = await catId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: catIdVal }, url: 'https://eatouts.test/api/business/menu/categories/' + catIdVal }));
  check('delete category', r.status === 200, r.status);
  j = await menu.onRequestGet(ctx(env, { token: 'owner', url: 'https://eatouts.test/api/business/menu?restaurant=rest_1' })).then((x) => x.json());
  check('deleting category detaches item', j.categories.length === 0 && j.items.length === 1 && j.items[0].categoryId === null, JSON.stringify(j));

  r = await catId.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', params: { id: 'nope' }, url: 'https://eatouts.test/api/business/menu/categories/nope', body: { name: 'x' } }));
  check('missing category -> 404', r.status === 404, r.status);

  /* ---- admin bypass ---- */
  r = await profile.onRequestGet(ctx(env, { token: 'admin', url: 'https://eatouts.test/api/business/profile?restaurant=rest_2' }));
  check('admin bypasses membership', r.status === 200, r.status);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.stack || err));
  process.exit(1);
});
