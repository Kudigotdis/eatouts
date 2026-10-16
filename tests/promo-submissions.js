/* API flow tests for promo submissions.
   Stands up an in-memory fake of D1 + KV and drives the real handlers in
   functions/api/customer/promo-submissions.js and
   functions/api/admin/promo-submissions.js through create -> list -> review.
   Also checks the pure promoSubmissionOut mapper. */
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

const CUST = { userId: 'usr_cust', type: 'customer', isAdmin: false };
const ADMIN = { userId: 'usr_admin', type: 'customer', isAdmin: true };
const BIZ = { userId: 'usr_biz', type: 'business', isAdmin: false };
const STRANGER = { userId: 'usr_str', type: 'business', isAdmin: false };

function fakeKV(sessions) {
  const m = new Map();
  Object.keys(sessions).forEach((tok) => m.set('sess:' + tok, JSON.stringify(sessions[tok])));
  return {
    _m: m,
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeDB() {
  const store = [];
  const memberships = [{ id: 'mem_1', user_id: 'usr_biz', restaurant_id: 'rest_1', role: 'owner', status: 'active' }];
  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.indexOf('INSERT INTO promo_submissions') === 0) {
      const [id, user_id, event_ref, title, venue_id, venue_name, when_text, summary,
        image_ref, fee, currency, status, payload, created_at, updated_at,
        restaurant_id, source] = args;
      store.push({ id, user_id, event_ref, title, venue_id, venue_name, when_text, summary,
        image_ref, fee, currency, status, admin_note: null, payload, created_at, updated_at,
        restaurant_id: restaurant_id || null, source: source || 'customer' });
      return null;
    }
    if (s.indexOf('SELECT id FROM promo_submissions WHERE user_id = ?') === 0) {
      const r = store.find((x) => x.user_id === args[0] && x.event_ref === args[1] &&
        (x.status === 'pending' || x.status === 'approved'));
      return mode === 'first' ? (r ? { id: r.id } : null) : (r ? [{ id: r.id }] : []);
    }
    if (s.indexOf('SELECT id FROM promo_submissions WHERE restaurant_id = ?') === 0) {
      const r = store.find((x) => x.restaurant_id === args[0] && x.event_ref === args[1] &&
        (x.status === 'pending' || x.status === 'approved' || x.status === 'published'));
      return mode === 'first' ? (r ? { id: r.id } : null) : (r ? [{ id: r.id }] : []);
    }
    if (s.indexOf('SELECT * FROM promo_submissions WHERE restaurant_id = ?') === 0) {
      const rows = store.filter((x) => x.restaurant_id === args[0]).sort((a, b) => b.created_at - a.created_at);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.indexOf('SELECT * FROM promo_submissions WHERE user_id = ?') === 0) {
      const rows = store.filter((x) => x.user_id === args[0]).sort((a, b) => b.created_at - a.created_at);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.indexOf('SELECT * FROM promo_submissions WHERE id = ?') === 0) {
      const r = store.find((x) => x.id === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s === 'SELECT * FROM promo_submissions ORDER BY created_at DESC LIMIT 200') {
      return [...store].sort((a, b) => b.created_at - a.created_at).slice(0, 200);
    }
    if (s.indexOf('SELECT * FROM promo_submissions WHERE status = ?') === 0) {
      return store.filter((x) => x.status === args[0]).sort((a, b) => b.created_at - a.created_at).slice(0, 200);
    }
    if (s.indexOf('UPDATE promo_submissions SET status = ?') === 0) {
      const r = store.find((x) => x.id === args[3]);
      if (r) { r.status = args[0]; r.admin_note = args[1]; r.updated_at = args[2]; }
      return null;
    }
    if (s.indexOf('SELECT * FROM memberships WHERE user_id = ?') === 0) {
      const r = memberships.find((x) => x.user_id === args[0] && x.restaurant_id === args[1] && x.status === 'active') || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    throw new Error('Unhandled SQL: ' + s);
  }
  return {
    _store: store,
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

function req(token, method, body, qs) {
  const headers = {};
  if (token) headers.cookie = 'eatouts_session=' + token;
  const init = { method: method || 'GET', headers };
  if (body) { headers['content-type'] = 'application/json'; init.body = JSON.stringify(body); }
  return new Request('https://eatouts.test/api/x' + (qs || ''), init);
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions', 'api');
  const cust = await import(pathToFileURL(path.join(base, 'customer', 'promo-submissions.js')).href);
  const admin = await import(pathToFileURL(path.join(base, 'admin', 'promo-submissions.js')).href);
  const custMod = await import(pathToFileURL(path.join(base, '_customer.js')).href);

  /* ---- pure mapper ---- */
  const out = custMod.promoSubmissionOut({
    id: 'psub_1', user_id: 'u1', event_ref: 'my-event', title: 'Launch',
    venue_id: 'v1', venue_name: 'The Yard', when_text: '2026-01-01 18:00',
    summary: 'hi', image_ref: null, fee: 50, currency: 'BWP', status: 'pending',
    admin_note: null, payload: '{"a":1}', created_at: 1, updated_at: 2
  });
  check('mapper maps core fields', out.id === 'psub_1' && out.eventRef === 'my-event' && out.title === 'Launch');
  check('mapper parses payload JSON', out.payload && out.payload.a === 1);
  check('mapper defaults fee/currency', custMod.promoSubmissionOut({ id: 'x' }).fee === 50);
  check('mapper tolerates bad payload', custMod.promoSubmissionOut({ id: 'x', payload: 'nope' }).payload === null);
  check('mapper defaults source to customer', custMod.promoSubmissionOut({ id: 'x' }).source === 'customer');
  check('mapper maps business source', custMod.promoSubmissionOut({ id: 'x', source: 'business', restaurant_id: 'rest_1' }).restaurantId === 'rest_1');

  /* ---- guard: no session ---- */
  const env = { DB: fakeDB(), OPS_KV: fakeKV({ ctok: CUST, atok: ADMIN, btok: BIZ, stok: STRANGER }) };

  let res = await cust.onRequestPost({ request: req(null, 'POST', { title: 'X' }), env });
  check('create without session -> 401', res.status === 401, res.status);

  res = await cust.onRequestPost({ request: req('ctok', 'POST', {}), env });
  check('create without title -> 400', res.status === 400, res.status);

  /* ---- create ---- */
  res = await cust.onRequestPost({
    request: req('ctok', 'POST', { eventRef: 'launch', title: 'Launch Night', venueName: 'The Yard', whenText: '2026-02-02 19:00', fee: 50 }),
    env
  });
  let j = await res.json();
  check('create -> 201', res.status === 201, res.status);
  check('create returns id', !!j.id && j.status === 'pending', JSON.stringify(j));

  /* ---- duplicate is idempotent ---- */
  res = await cust.onRequestPost({ request: req('ctok', 'POST', { eventRef: 'launch', title: 'Launch Night' }), env });
  j = await res.json();
  check('duplicate returns already:true', res.status === 200 && j.already === true, JSON.stringify(j));

  /* ---- list own ---- */
  res = await cust.onRequestGet({ request: req('ctok'), env });
  j = await res.json();
  check('customer lists own submissions', Array.isArray(j.submissions) && j.submissions.length === 1, JSON.stringify(j));

  /* ---- admin guard: customer cannot read admin queue ---- */
  res = await admin.onRequestGet({ request: req('ctok'), env });
  check('non-admin admin GET -> 403', res.status === 403, res.status);

  /* ---- admin list pending ---- */
  res = await admin.onRequestGet({ request: req('atok'), env });
  j = await res.json();
  check('admin lists all submissions', j.submissions && j.submissions.length === 1, JSON.stringify(j));
  const id = j.submissions[0].id;

  res = await admin.onRequestGet({ request: req('atok'), env: { DB: env.DB, OPS_KV: env.OPS_KV } });
  check('admin GET without status ok', res.status === 200);

  /* ---- approve ---- */
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id, action: 'approve', adminNote: 'looks good' }), env });
  j = await res.json();
  check('approve -> approved', res.status === 200 && j.submission.status === 'approved', JSON.stringify(j));
  check('approve stores admin note', j.submission.adminNote === 'looks good');

  /* ---- publish ---- */
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id, action: 'publish' }), env });
  j = await res.json();
  check('publish -> published', j.submission.status === 'published', JSON.stringify(j));

  /* ---- filtered list ---- */
  const url = new URL('https://eatouts.test/api/admin/promo-submissions?status=published');
  res = await admin.onRequestGet({ request: new Request(url, { headers: { cookie: 'eatouts_session=atok' } }), env });
  j = await res.json();
  check('status filter returns published only', j.submissions.length === 1 && j.submissions[0].status === 'published', JSON.stringify(j));

  /* ---- reject ---- */
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id, action: 'reject' }), env });
  j = await res.json();
  check('reject -> rejected', j.submission.status === 'rejected', JSON.stringify(j));

  /* ---- bad action ---- */
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id, action: 'explode' }), env });
  check('bad action -> 400', res.status === 400, res.status);
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: 'nope', action: 'approve' }), env });
  check('missing row -> 404', res.status === 404, res.status);

  /* ---- business promos use the same queue (C8) ---- */
  res = await cust.onRequestPost({
    request: req('btok', 'POST', { title: 'Weekend Special', restaurantId: 'rest_1', eventRef: 'promo_biz_1', venueName: 'The Yard' }),
    env
  });
  j = await res.json();
  check('business create -> 201', res.status === 201, res.status);
  check('business create marks source', j.source === 'business', JSON.stringify(j));

  res = await cust.onRequestPost({
    request: req('btok', 'POST', { title: 'Weekend Special', restaurantId: 'rest_1', eventRef: 'promo_biz_1' }),
    env
  });
  j = await res.json();
  check('business duplicate is idempotent', res.status === 200 && j.already === true, JSON.stringify(j));

  res = await cust.onRequestGet({ request: req('btok', 'GET', null, '?restaurantId=rest_1'), env });
  j = await res.json();
  check('business lists own restaurant submissions',
    j.submissions && j.submissions.length === 1 && j.submissions[0].source === 'business' && j.submissions[0].restaurantId === 'rest_1',
    JSON.stringify(j));

  res = await cust.onRequestGet({ request: req('stok', 'GET', null, '?restaurantId=rest_1'), env });
  check('non-member business GET -> 403', res.status === 403, res.status);

  res = await cust.onRequestPost({ request: req('stok', 'POST', { title: 'X', restaurantId: 'rest_1' }), env });
  check('non-member business POST -> 403', res.status === 403, res.status);

  res = await cust.onRequestPost({ request: req('btok', 'POST', { title: 'No venue' }), env });
  check('business session without restaurantId -> 403 not_a_customer', res.status === 403, res.status);

  res = await cust.onRequestGet({ request: req('atok', 'GET', null, '?restaurantId=rest_1'), env });
  check('admin can read a business queue', res.status === 200, res.status);

  /* ---- no backend ---- */
  res = await cust.onRequestGet({ request: req('ctok'), env: {} });
  check('unconfigured backend -> 503', res.status === 503, res.status);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.stack || err));
  process.exit(1);
});
