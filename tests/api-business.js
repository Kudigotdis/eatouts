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
    invites: [], menu_categories: [], menu_items: [],
    gallery_groups: [], gallery_images: [], events: [],
    business_links: [], claims: [],
    business_profiles: [], business_contacts: [], business_users: [], business_services: []
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
    if (s.startsWith('SELECT id, status, claimed FROM restaurants WHERE id = ?')) {
      const r = db.restaurants.find((x) => x.id === args[0]);
      return first(r ? { id: r.id, status: r.status, claimed: r.claimed } : null);
    }
    if (s.startsWith('UPDATE restaurants SET claimed = 1')) {
      const r = db.restaurants.find((x) => x.id === args[1]);
      if (r) { r.claimed = 1; r.status = 'claimed'; r.updated_at = args[0]; }
      return null;
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

    /* gallery groups */
    if (s.startsWith('INSERT INTO gallery_groups')) {
      const [id, restaurant_id, title, visible, position, created_at] = args;
      db.gallery_groups.push({ id, restaurant_id, title, visible, position, created_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM gallery_groups WHERE id = ?')) {
      return first(db.gallery_groups.find((x) => x.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM gallery_groups WHERE restaurant_id = ?')) {
      const rows = db.gallery_groups.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE gallery_groups SET title = ?, visible = ?, position = ? WHERE id = ?')) {
      const g = db.gallery_groups.find((x) => x.id === args[3]);
      if (g) { g.title = args[0]; g.visible = args[1]; g.position = args[2]; }
      return null;
    }
    if (s.startsWith('DELETE FROM gallery_groups WHERE id = ?')) {
      const i = db.gallery_groups.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.gallery_groups.splice(i, 1);
      return null;
    }

    /* gallery images */
    if (s.startsWith('INSERT INTO gallery_images')) {
      const [id, restaurant_id, group_id, image_key, label, visible, position, created_at] = args;
      db.gallery_images.push({ id, restaurant_id, group_id, image_key, label, visible, position, created_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM gallery_images WHERE id = ?')) {
      return first(db.gallery_images.find((x) => x.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM gallery_images WHERE restaurant_id = ?')) {
      const rows = db.gallery_images.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE gallery_images SET group_id = ?')) {
      const im = db.gallery_images.find((x) => x.id === args[args.length - 1]);
      if (im) {
        const cols = ['group_id', 'image_key', 'label', 'visible', 'position'];
        cols.forEach((c, i) => { im[c] = args[i]; });
      }
      return null;
    }
    if (s.startsWith('DELETE FROM gallery_images WHERE group_id = ?')) {
      db.gallery_images = db.gallery_images.filter((x) => x.group_id !== args[0]);
      return null;
    }
    if (s.startsWith('DELETE FROM gallery_images WHERE id = ?')) {
      const i = db.gallery_images.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.gallery_images.splice(i, 1);
      return null;
    }

    /* events */
    if (s.startsWith('INSERT INTO events')) {
      const [id, restaurant_id, title, description, figure, image_key, admission, starts_at, ends_at, published, created_at, updated_at] = args;
      db.events.push({ id, restaurant_id, title, description, figure, image_key, admission, starts_at, ends_at, published, created_at, updated_at });
      return null;
    }
    if (s.startsWith('SELECT * FROM events WHERE id = ?')) {
      return first(db.events.find((x) => x.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM events WHERE restaurant_id = ?')) {
      const rows = db.events.filter((x) => x.restaurant_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('UPDATE events SET title = ?')) {
      const ev = db.events.find((x) => x.id === args[args.length - 1]);
      if (ev) {
        const cols = ['title', 'description', 'figure', 'image_key', 'admission', 'starts_at', 'ends_at', 'published', 'updated_at'];
        cols.forEach((c, i) => { ev[c] = args[i]; });
      }
      return null;
    }
    if (s.startsWith('DELETE FROM events WHERE id = ?')) {
      const i = db.events.findIndex((x) => x.id === args[0]);
      if (i >= 0) db.events.splice(i, 1);
      return null;
    }

    /* business links (claim bridge) */
    if (s.startsWith('SELECT * FROM business_links WHERE country_code = ? AND slug = ?')) {
      return first(db.business_links.find((l) => l.country_code === args[0] && l.slug === args[1]));
    }
    if (s.startsWith('SELECT * FROM business_links WHERE country_code = ? AND type = ? AND ref_id = ?')) {
      const rows = db.business_links.filter((l) =>
        l.country_code === args[0] && l.type === args[1] && l.ref_id === args[2] &&
        l.status === 'active' && l.claimed_by != null);
      return first(rows[0] || null);
    }
    if (s.startsWith('INSERT INTO business_links')) {
      const [id, country_code, slug, type, ref_id, display_slug, name, status, redirect_to, claimed_by, created_at, updated_at] = args;
      const existing = db.business_links.find((l) => l.country_code === country_code && l.slug === slug);
      const row = { id, country_code, slug, type, ref_id, display_slug, name, status, redirect_to, claimed_by, created_at, updated_at };
      if (existing) Object.assign(existing, row);
      else db.business_links.push(row);
      return null;
    }
    if (s.startsWith('UPDATE business_links SET status =')) {
      const l = db.business_links.find((x) => x.id === args[2]);
      if (l) { l.status = 'redirect'; l.redirect_to = args[0]; l.updated_at = args[1]; }
      return null;
    }

    /* claims */
    if (s.startsWith('INSERT INTO claims')) {
      const status = (s.match(/'(approved|pending)'/) || [])[1] || 'pending';
      const [id, restaurant_id, user_id, evidence, created_at] = args;
      db.claims.push({ id, restaurant_id, user_id, status, evidence, created_at });
      return null;
    }

    /* business_profiles ownership lookup (contacts/users GET guard) */
    if (s.startsWith('SELECT id FROM business_profiles WHERE id = ? AND user_id = ?')) {
      return first(db.business_profiles.find((x) => x.id === args[0] && x.user_id === args[1]));
    }
    if (s.startsWith('SELECT * FROM business_profiles WHERE id = ?')) {
      return first(db.business_profiles.find((x) => x.id === args[0]));
    }

    /* business contacts + team members */
    if (s.startsWith('SELECT * FROM business_contacts WHERE business_id = ?')) {
      const rows = db.business_contacts.filter((x) => x.business_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('SELECT * FROM business_users WHERE business_id = ?')) {
      const rows = db.business_users.filter((x) => x.business_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('SELECT * FROM business_services WHERE business_id = ?')) {
      const rows = db.business_services.filter((x) => x.business_id === args[0]);
      return mode === 'all' ? rows : (rows[0] || null);
    }

    if (s.startsWith('DELETE FROM favourites WHERE type = ? AND ref_id = ?')) {
      return { changes: 0 };
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
  const link = await import(pathToFileURL(path.join(base, 'business', 'link.js')).href);
  const claim = await import(pathToFileURL(path.join(base, 'business', 'claim.js')).href);
  const gallery = await import(pathToFileURL(path.join(base, 'business', 'gallery.js')).href);
  const gg = await import(pathToFileURL(path.join(base, 'business', 'gallery', 'groups.js')).href);
  const ggId = await import(pathToFileURL(path.join(base, 'business', 'gallery', 'groups', '[id].js')).href);
  const gi = await import(pathToFileURL(path.join(base, 'business', 'gallery', 'images.js')).href);
  const giId = await import(pathToFileURL(path.join(base, 'business', 'gallery', 'images', '[id].js')).href);
  const events = await import(pathToFileURL(path.join(base, 'business', 'events.js')).href);
  const eventId = await import(pathToFileURL(path.join(base, 'business', 'events', '[id].js')).href);
  const contacts = await import(pathToFileURL(path.join(base, 'business', 'contacts.js')).href);
  const teamUsers = await import(pathToFileURL(path.join(base, 'business', 'users.js')).href);
  const services = await import(pathToFileURL(path.join(base, 'business', 'services.js')).href);

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
  const go = biz.galleryGroupOut({ id: 'g', restaurant_id: 'r', title: 'Food', visible: 1, position: 2 });
  check('galleryGroupOut maps', go.title === 'Food' && go.visible === true && go.position === 2);
  const imo = biz.galleryImageOut({ id: 'i', image_key: 'k.jpg', group_id: null, visible: 0 });
  check('galleryImageOut maps', imo.imageKey === 'k.jpg' && imo.visible === false && imo.groupId === null);
  const eo = biz.eventOut({ id: 'e', title: 'Gig', figure: '{"type":"DJ"}', starts_at: 123, published: 1 });
  check('eventOut parses figure + flags', eo.figure.type === 'DJ' && eo.startsAt === 123 && eo.published === true);
  check('eventOut null-safe', biz.eventOut(null) === null && biz.galleryGroupOut(null) === null);
  check('jsonString passes strings through', biz.jsonString('{"a":1}') === '{"a":1}');
  check('jsonString encodes objects', biz.jsonString({ a: 1 }) === '{"a":1}');
  check('jsonString null stays null', biz.jsonString(null) === null);
  check('numOrNull coerces + blanks', biz.numOrNull('5') === 5 && biz.numOrNull('') === null && biz.numOrNull('x') === null);

  /* ---- seed store ---- */
  const seed = {
    users: [
      { id: 'usr_owner', username: 'owner', name: 'Owner', email: 'owner@x.co', whatsapp: '26770000001' },
      { id: 'usr_mark', username: 'mark', name: 'Marketer', email: 'mark@x.co', whatsapp: '26770000002' },
      { id: 'usr_other', username: 'other', name: 'Other', email: 'other@x.co', whatsapp: '26770000003' },
      { id: 'usr_menu', username: 'menu', name: 'Menu Manager', email: 'menu@x.co', whatsapp: '26770000004' },
      { id: 'usr_mkt', username: 'mkt', name: 'Marketer 2', email: 'mkt@x.co', whatsapp: '26770000005' },
      { id: 'usr_stranger', username: 'stranger', name: 'No Member', email: 'nobody@x.co', whatsapp: '26770000006' }
    ],
    restaurants: [
      { id: 'rest_1', slug: 'the-yard', name: 'The Yard', status: 'published', plan: 'pro', claimed: 1, types: '[]', contacts: '[]', socials: '[]', features: '[]', created_at: 1, updated_at: 1 },
      { id: 'rest_2', slug: 'bar-one', name: 'Bar One', status: 'unclaimed', plan: 'starter', claimed: 0, types: '[]', contacts: '[]', socials: '[]', features: '[]', created_at: 1, updated_at: 1 }
    ],
    memberships: [
      { id: 'mem_owner1', user_id: 'usr_owner', restaurant_id: 'rest_1', role: 'owner', status: 'active', created_at: 1 },
      { id: 'mem_mark1', user_id: 'usr_mark', restaurant_id: 'rest_1', role: 'marketing_manager', status: 'active', created_at: 2 }
    ],
    business_profiles: [
      { id: 'biz_own', user_id: 'usr_owner', slug: 'the-yard', name: 'The Yard', status: 'published' },
      { id: 'biz_other', user_id: 'usr_other', slug: 'bar-one', name: 'Bar One', status: 'published' }
    ],
    business_contacts: [
      { id: 'cnt_own', business_id: 'biz_own', title: 'Owner', country_code: '+267', number: '70000001', purpose: 'Bookings', primary: 1, whatsapp: 1, active: 1, order_index: 0 },
      { id: 'cnt_other', business_id: 'biz_other', title: 'Secret', country_code: '+267', number: '70009999', purpose: 'Private', primary: 1, whatsapp: 1, active: 1, order_index: 0 }
    ],
    business_users: [
      { id: 'bu_own', business_id: 'biz_own', name: 'Owner One', email: 'owner@x.co', role: 'owner', whatsapp: '26770000001' },
      { id: 'bu_other', business_id: 'biz_other', name: 'Other One', email: 'other@x.co', role: 'owner', whatsapp: '26770000003' }
    ],
    business_services: [
      { id: 'svc_own', business_id: 'biz_own', name: 'Braai Platter', description: 'Meat for two', price: 250, pricing_type: 'fixed', whatsapp_contact_id: 'cnt_own', active: 1, order_index: 0 },
      { id: 'svc_other', business_id: 'biz_other', name: 'Private Tasting', description: 'Secret menu', price: 900, pricing_type: 'per_person', whatsapp_contact_id: 'cnt_other', active: 1, order_index: 0 }
    ]
  };
  const sessions = {
    owner: { userId: 'usr_owner', type: 'customer', isAdmin: false },
    mark: { userId: 'usr_mark', type: 'customer', isAdmin: false },
    other: { userId: 'usr_other', type: 'customer', isAdmin: false },
    menu: { userId: 'usr_menu', type: 'customer', isAdmin: false },
    marketing: { userId: 'usr_mkt', type: 'customer', isAdmin: false },
    stranger: { userId: 'usr_stranger', type: 'customer', isAdmin: false },
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

  /* ---- contacts / users: cross-tenant reads are refused ---- */
  r = await contacts.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/contacts?business_id=biz_own' }));
  j = await r.json();
  check('contacts: own business -> 200', r.status === 200 && j.contacts.length === 1 && j.contacts[0].number === '70000001', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await contacts.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/contacts?business_id=biz_other' }));
  j = await r.json();
  check('contacts: other tenant -> 404 not_found', r.status === 404 && j.error === 'not_found', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await contacts.onRequestGet(ctx(env, { token: 'stranger', url: 'https://x/api/business/contacts?business_id=biz_own' }));
  check('contacts: signed-in non-owner -> 404', r.status === 404, r.status);

  r = await contacts.onRequestGet(ctx(env, { url: 'https://x/api/business/contacts?business_id=biz_own' }));
  check('contacts: no session -> 401', r.status === 401, r.status);

  r = await contacts.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/contacts' }));
  check('contacts: no business_id -> 400', r.status === 400, r.status);

  r = await teamUsers.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/users?business_id=biz_own' }));
  j = await r.json();
  check('users: own business -> 200', r.status === 200 && j.users.length === 1 && j.users[0].email === 'owner@x.co', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await teamUsers.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/users?business_id=biz_other' }));
  j = await r.json();
  check('users: other tenant -> 404 not_found', r.status === 404 && j.error === 'not_found', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await teamUsers.onRequestGet(ctx(env, { token: 'stranger', url: 'https://x/api/business/users?business_id=biz_other' }));
  check('users: signed-in non-owner -> 404', r.status === 404, r.status);

  r = await teamUsers.onRequestGet(ctx(env, { url: 'https://x/api/business/users?business_id=biz_own' }));
  check('users: no session -> 401', r.status === 401, r.status);

  /* ---- services: cross-tenant read is refused ---- */
  r = await services.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/services?business_id=biz_own' }));
  j = await r.json();
  check('services: own business -> 200', r.status === 200 && j.services.length === 1 && j.services[0].name === 'Braai Platter', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await services.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/services?business_id=biz_other' }));
  j = await r.json();
  check('services: other tenant -> 404 not_found', r.status === 404 && j.error === 'not_found', 'status=' + r.status + ' ' + JSON.stringify(j));

  r = await services.onRequestGet(ctx(env, { token: 'stranger', url: 'https://x/api/business/services?business_id=biz_own' }));
  check('services: signed-in non-owner -> 404', r.status === 404, r.status);

  r = await services.onRequestGet(ctx(env, { url: 'https://x/api/business/services?business_id=biz_own' }));
  check('services: no session -> 401', r.status === 401, r.status);

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

  /* ---- claim bridge (link POST grants membership) ---- */
  r = await link.onRequestPost(ctx(env, { token: 'other', method: 'POST', url: 'https://eatouts.test/api/business/link', body: { country: 'bw', type: 'restaurant', refId: 'rest_2', slug: 'baronebw', name: 'Bar One' } }));
  j = await r.json();
  check('claim grants owner membership', r.status === 200 && j.ok && j.claim === 'granted' && j.membership === 'owner' && j.restaurantId === 'rest_2', JSON.stringify(j));
  const claimed = env.DB._db.restaurants.find((x) => x.id === 'rest_2');
  check('claim marks restaurant claimed', claimed.claimed === 1 && claimed.status === 'claimed', JSON.stringify(claimed));
  check('claim writes a claims row', env.DB._db.claims.some((c) => c.restaurant_id === 'rest_2' && c.user_id === 'usr_other' && c.status === 'approved'));

  r = await mine.onRequestGet(ctx(env, { token: 'other' }));
  j = await r.json();
  check('mine lists the claimed venue', j.businesses.some((b) => b.id === 'rest_2' && b.role === 'owner'), JSON.stringify(j.businesses));

  r = await profile.onRequestGet(ctx(env, { token: 'other', url: 'https://eatouts.test/api/business/profile?restaurant=rest_2' }));
  check('claimer can read profile after claim', r.status === 200, r.status);

  r = await link.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://eatouts.test/api/business/link', body: { country: 'bw', type: 'restaurant', refId: 'rest_2', slug: 'baronebw2', name: 'Bar One' } }));
  j = await r.json();
  check('second claimer gets pending_review', j.ok && j.claim === 'pending_review' && j.membership === null, JSON.stringify(j));
  check('second claimer gets no membership', !env.DB._db.memberships.some((m) => m.user_id === 'usr_mark' && m.restaurant_id === 'rest_2'));
  check('pending claim recorded', env.DB._db.claims.some((c) => c.restaurant_id === 'rest_2' && c.user_id === 'usr_mark' && c.status === 'pending'));

  r = await link.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/link', body: { country: 'bw', type: 'restaurant', refId: 'rest_1', slug: 'theyardbw', name: 'The Yard 2' } }));
  j = await r.json();
  check('existing member re-claim is already_member', j.ok && j.claim === 'already_member' && j.membership === 'owner', JSON.stringify(j));

  r = await link.onRequestPost(ctx(env, { token: 'other', method: 'POST', url: 'https://eatouts.test/api/business/link', body: { country: 'bw', type: 'restaurant', refId: 'rest_nope', slug: 'notavenue', name: 'Ghost' } }));
  j = await r.json();
  check('unknown refId -> claim no_restaurant', r.status === 200 && j.claim === 'no_restaurant', JSON.stringify(j));

  /* ---- dedicated claim endpoint ---- */
  r = await claim.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://eatouts.test/api/business/claim', body: { refId: 'rest_1' } }));
  j = await r.json();
  check('claim endpoint: non-owner on owned venue -> pending_review', r.status === 200 && j.claim === 'pending_review' && j.membership === null, JSON.stringify(j));

  r = await claim.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://eatouts.test/api/business/claim', body: { refId: 'rest_1' } }));
  j = await r.json();
  check('claim endpoint: existing owner -> already_member', j.ok && j.claim === 'already_member' && j.membership === 'owner', JSON.stringify(j));

  r = await claim.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://eatouts.test/api/business/claim', body: {} }));
  check('claim endpoint: missing refId -> 400', r.status === 400, r.status);

  r = await claim.onRequestPost(ctx(env, { token: 'mark', method: 'POST', url: 'https://eatouts.test/api/business/claim', body: { refId: 'rest_missing' } }));
  check('claim endpoint: unknown restaurant -> 404', r.status === 404, r.status);

  r = await claim.onRequestPost(ctx(env, { method: 'POST', url: 'https://eatouts.test/api/business/claim', body: { refId: 'rest_1' } }));
  check('claim endpoint: no session -> 401', r.status === 401, r.status);

  /* ---- gallery (marketing_manager+) ---- */
  env.DB._db.memberships.push(
    { id: 'mem_menu1', user_id: 'usr_menu', restaurant_id: 'rest_1', role: 'menu_manager', status: 'active', created_at: 3 },
    { id: 'mem_mkt1', user_id: 'usr_mkt', restaurant_id: 'rest_1', role: 'marketing_manager', status: 'active', created_at: 3 }
  );

  r = await gallery.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/gallery?restaurant=rest_1' }));
  j = await r.json();
  check('gallery read empty for owner', r.status === 200 && j.groups.length === 0 && j.images.length === 0, JSON.stringify(j));

  r = await gallery.onRequestGet(ctx(env, { token: 'menu', url: 'https://x/api/business/gallery?restaurant=rest_1' }));
  check('menu_manager cannot read gallery -> 403', r.status === 403, r.status);
  r = await gallery.onRequestGet(ctx(env, { token: 'stranger', url: 'https://x/api/business/gallery?restaurant=rest_1' }));
  check('non-member cannot read gallery -> 403', r.status === 403, r.status);

  r = await gg.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/gallery/groups?restaurant=rest_1', body: { title: 'Food' } }));
  j = await r.json();
  check('marketing_manager creates group', r.status === 201 && j.group.title === 'Food' && j.group.visible === true, JSON.stringify(j));
  const groupIdVal = j.group.id;

  r = await gg.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/gallery/groups?restaurant=rest_1', body: {} }));
  check('group without title -> 400', r.status === 400, r.status);

  r = await gi.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/gallery/images?restaurant=rest_1', body: { groupId: groupIdVal, imageKey: 'gallery/a.jpg', label: 'Plate', position: 1 } }));
  j = await r.json();
  check('creates image', r.status === 201 && j.image.imageKey === 'gallery/a.jpg' && j.image.groupId === groupIdVal, JSON.stringify(j));
  const imageIdVal = j.image.id;

  r = await gi.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/gallery/images?restaurant=rest_1', body: { groupId: groupIdVal } }));
  check('image without key -> 400', r.status === 400, r.status);

  r = await gallery.onRequestGet(ctx(env, { token: 'marketing', url: 'https://x/api/business/gallery?restaurant=rest_1' }));
  j = await r.json();
  check('gallery lists group + image', j.groups.length === 1 && j.images.length === 1, JSON.stringify(j));

  r = await ggId.onRequestPatch(ctx(env, { token: 'marketing', method: 'PATCH', params: { id: groupIdVal }, url: 'https://x/api/business/gallery/groups/' + groupIdVal, body: { title: 'Feasts', visible: false } }));
  j = await r.json();
  check('patch group', r.status === 200 && j.group.title === 'Feasts' && j.group.visible === false, JSON.stringify(j));

  r = await giId.onRequestPatch(ctx(env, { token: 'marketing', method: 'PATCH', params: { id: imageIdVal }, url: 'https://x/api/business/gallery/images/' + imageIdVal, body: { label: 'Big plate', position: 5 } }));
  j = await r.json();
  check('patch image', r.status === 200 && j.image.label === 'Big plate' && j.image.position === 5, JSON.stringify(j));

  r = await ggId.onRequestPatch(ctx(env, { token: 'menu', method: 'PATCH', params: { id: groupIdVal }, url: 'https://x/api/business/gallery/groups/' + groupIdVal, body: { title: 'x' } }));
  check('menu_manager cannot patch group -> 403', r.status === 403, r.status);

  r = await giId.onRequestDelete(ctx(env, { token: 'marketing', method: 'DELETE', params: { id: imageIdVal }, url: 'https://x/api/business/gallery/images/' + imageIdVal }));
  check('delete image', r.status === 200, r.status);
  check('image row removed', !env.DB._db.gallery_images.some((x) => x.id === imageIdVal));

  r = await gi.onRequestPost(ctx(env, { token: 'owner', method: 'POST', url: 'https://x/api/business/gallery/images?restaurant=rest_1', body: { groupId: groupIdVal, imageKey: 'gallery/b.jpg' } }));
  check('owner can add image too', r.status === 201, r.status);
  r = await ggId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: groupIdVal }, url: 'https://x/api/business/gallery/groups/' + groupIdVal }));
  check('delete group', r.status === 200, r.status);
  check('group delete cascades its images', env.DB._db.gallery_groups.length === 0 && env.DB._db.gallery_images.length === 0,
    JSON.stringify(env.DB._db.gallery_images));

  r = await ggId.onRequestPatch(ctx(env, { token: 'owner', method: 'PATCH', params: { id: 'nope' }, url: 'https://x/api/business/gallery/groups/nope', body: { title: 'x' } }));
  check('missing group -> 404', r.status === 404, r.status);

  /* ---- events (marketing_manager+) ---- */
  r = await events.onRequestGet(ctx(env, { token: 'owner', url: 'https://x/api/business/events?restaurant=rest_1' }));
  j = await r.json();
  check('events read empty', r.status === 200 && j.events.length === 0, JSON.stringify(j));

  r = await events.onRequestGet(ctx(env, { token: 'menu', url: 'https://x/api/business/events?restaurant=rest_1' }));
  check('menu_manager cannot read events -> 403', r.status === 403, r.status);

  r = await events.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/events?restaurant=rest_1', body: { title: 'Afro Night', description: 'All night', admission: 'Paid', startsAt: 1000, endsAt: 2000, published: true, figure: { type: 'DJ Night', performer: 'X' } } }));
  j = await r.json();
  check('marketing_manager creates event', r.status === 201 && j.event.title === 'Afro Night' && j.event.published === true, JSON.stringify(j));
  check('event figure round-trips as object', j.event.figure && j.event.figure.type === 'DJ Night', JSON.stringify(j.event.figure));
  const eventIdVal = j.event.id;

  r = await events.onRequestPost(ctx(env, { token: 'marketing', method: 'POST', url: 'https://x/api/business/events?restaurant=rest_1', body: { description: 'no title' } }));
  check('event without title -> 400', r.status === 400, r.status);

  r = await events.onRequestGet(ctx(env, { token: 'marketing', url: 'https://x/api/business/events?restaurant=rest_1' }));
  j = await r.json();
  check('events lists the created one', j.events.length === 1 && j.events[0].id === eventIdVal, JSON.stringify(j));

  r = await eventId.onRequestPatch(ctx(env, { token: 'marketing', method: 'PATCH', params: { id: eventIdVal }, url: 'https://x/api/business/events/' + eventIdVal, body: { title: 'Afro Night 2', published: false, endsAt: null } }));
  j = await r.json();
  check('patch event', r.status === 200 && j.event.title === 'Afro Night 2' && j.event.published === false && j.event.endsAt === null, JSON.stringify(j));
  check('patch event keeps untouched figure', j.event.figure && j.event.figure.type === 'DJ Night');

  r = await eventId.onRequestPatch(ctx(env, { token: 'menu', method: 'PATCH', params: { id: eventIdVal }, url: 'https://x/api/business/events/' + eventIdVal, body: { title: 'x' } }));
  check('menu_manager cannot patch event -> 403', r.status === 403, r.status);

  r = await eventId.onRequestDelete(ctx(env, { token: 'owner', method: 'DELETE', params: { id: eventIdVal }, url: 'https://x/api/business/events/' + eventIdVal }));
  check('delete event', r.status === 200, r.status);
  check('event row removed', !env.DB._db.events.some((x) => x.id === eventIdVal));

  r = await events.onRequestGet(ctx(env, { token: 'other', url: 'https://x/api/business/events?restaurant=rest_2' }));
  check('events scope to the venue (empty for other)', r.status === 200 && (await r.json()).events.length === 0, 'rest_2');

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
