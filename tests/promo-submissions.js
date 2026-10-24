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

/* Read the column list out of an INSERT / UPDATE so the fake never has to
   hardcode the (growing) promo shape. */
function insertCols(s, table) {
  const m = new RegExp('INSERT INTO ' + table + ' \\(([^)]+)\\)').exec(s);
  return m ? m[1].split(',').map((x) => x.trim()) : null;
}
function updateParts(s, table) {
  const m = new RegExp('UPDATE ' + table + ' SET (.+) WHERE id = \\?').exec(s);
  if (!m) return null;
  return m[1].split(',').map((x) => {
    const part = x.trim();
    const eq = part.indexOf('=');
    return { col: part.slice(0, eq).trim(), ph: part.indexOf('?') !== -1 };
  });
}
function applyUpdate(row, parts, args) {
  if (!row || !parts) return;
  let i = 0;
  parts.forEach((p) => {
    if (!p.ph) return;
    row[p.col] = args[i];
    i++;
  });
}

function fakeDB() {
  const store = [];
  const promos = [];
  const invoices = [];
  const memberships = [{ id: 'mem_1', user_id: 'usr_biz', restaurant_id: 'rest_1', role: 'owner', status: 'active' }];
  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.indexOf('INSERT INTO promo_submissions') === 0) {
      const cols = insertCols(s, 'promo_submissions');
      const row = {};
      cols.forEach((c, i) => { row[c] = args[i]; });
      row.admin_note = row.admin_note || null;
      row.quoted_free = row.quoted_free || 0;
      row.quoted_days = row.quoted_days || 0;
      store.push(row);
      return null;
    }
    if (s.indexOf('INSERT INTO promos') === 0) {
      const cols = insertCols(s, 'promos');
      const row = {};
      cols.forEach((c, i) => { row[c] = args[i]; });
      promos.push(row);
      return null;
    }
    if (s.indexOf('UPDATE promos SET') === 0) {
      const p = promos.find((x) => x.id === args[args.length - 1]);
      applyUpdate(p, updateParts(s, 'promos'), args);
      return null;
    }
    if (s.indexOf('INSERT INTO invoices') === 0) {
      const cols = insertCols(s, 'invoices');
      const row = {};
      cols.forEach((c, i) => { row[c] = args[i]; });
      invoices.push(row);
      return null;
    }
    if (s.indexOf('UPDATE invoices SET') === 0) {
      const p = invoices.find((x) => x.id === args[args.length - 1]);
      applyUpdate(p, updateParts(s, 'invoices'), args);
      return null;
    }
    if (s.indexOf('UPDATE invoices SET status = ?') === 0) {
      const p = invoices.find((x) => x.id === args[args.length - 1]);
      if (p) p.status = args[0];
      return null;
    }
    if (s.indexOf('SELECT * FROM invoices WHERE id = ?') === 0) {
      const r = invoices.find((x) => x.id === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('SELECT * FROM promos WHERE id = ?') === 0) {
      const r = promos.find((x) => x.id === args[0]) || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    if (s.indexOf('SELECT id FROM promo_submissions WHERE user_id = ?') === 0) {
      const r = store.find((x) => x.user_id === args[0] && x.event_ref === args[1] &&
        (x.status === 'pending' || x.status === 'approved'));
      return mode === 'first' ? (r ? { id: r.id } : null) : (r ? [{ id: r.id }] : []);
    }
    if (s.indexOf('SELECT * FROM promo_submissions WHERE restaurant_id = ? AND event_ref = ?') === 0) {
      const r = store.find((x) => x.restaurant_id === args[0] && x.event_ref === args[1] &&
        (x.status === 'pending' || x.status === 'approved' || x.status === 'published'));
      return mode === 'first' ? (r || null) : (r ? [r] : []);
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
    if (s.indexOf('UPDATE promo_submissions SET ') === 0) {
      const r = store.find((x) => x.id === args[args.length - 1]);
      applyUpdate(r, updateParts(s, 'promo_submissions'), args);
      return null;
    }
    if (s.indexOf('SELECT COALESCE(SUM(quoted_days)') === 0) {
      const used = store
        .filter((x) => x.restaurant_id === args[0] && x.month_key === args[1] && x.quoted_free === 1 &&
          ['pending', 'approved', 'published'].indexOf(x.status) !== -1 &&
          (!args[2] || x.id !== args[2]))
        .reduce((n, x) => n + Number(x.quoted_days || 0), 0);
      return mode === 'first' ? { used } : [{ used }];
    }
    if (s.indexOf('SELECT * FROM memberships WHERE user_id = ?') === 0) {
      const r = memberships.find((x) => x.user_id === args[0] && x.restaurant_id === args[1] && x.status === 'active') || null;
      return mode === 'first' ? r : (r ? [r] : []);
    }
    throw new Error('Unhandled SQL: ' + s);
  }
  return {
    _store: store,
    _db: { promos, invoices },
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
  const promotion = {
    id: 'promo_biz_1', title: 'Weekend Special', description: 'Two for one',
    promoFamily: 'Food', subtype: 'Pizza', startDate: '2026-11-06',
    endDate: '2026-11-06', promoPrice: 60, originalPrice: 120
  };
  res = await cust.onRequestPost({
    request: req('btok', 'POST', {
      title: 'Weekend Special', restaurantId: 'rest_1', eventRef: 'promo_biz_1',
      venueName: 'The Yard', payload: promotion
    }),
    env
  });
  j = await res.json();
  check('business create -> 201', res.status === 201, res.status + ' ' + JSON.stringify(j));
  check('business create marks source', j.source === 'business', JSON.stringify(j));
  check('business create quotes one free day', j.quote && j.quote.days === 1 && j.quote.fee === 0 && j.quote.included === true, JSON.stringify(j.quote));
  check('business create writes the full promo row',
    (env.DB._db.promos[0] || {}).id === 'promo_biz_1' &&
    env.DB._db.promos[0].category === 'Food' &&
    env.DB._db.promos[0].status === 'submitted' &&
    env.DB._db.promos[0].active === 0,
    JSON.stringify(env.DB._db.promos[0]));

  /* a resubmit updates in place rather than returning already:true */
  res = await cust.onRequestPost({
    request: req('btok', 'POST', {
      title: 'Weekend Special v2', restaurantId: 'rest_1', eventRef: 'promo_biz_1',
      payload: Object.assign({}, promotion, { title: 'Weekend Special v2' })
    }),
    env
  });
  j = await res.json();
  check('resubmit updates in place -> 200', res.status === 200 && j.updated === true, res.status + ' ' + JSON.stringify(j));
  check('resubmit keeps one row', env.DB._db.promos.length === 1 && (env.DB._db.promos[0] || {}).title === 'Weekend Special v2', JSON.stringify(env.DB._db.promos.map((p) => p.title)));

  /* an expensive promo is charged, and is NOT blocked from being submitted */
  res = await cust.onRequestPost({
    request: req('btok', 'POST', {
      title: 'Six Friday Nights', restaurantId: 'rest_1', eventRef: 'promo_biz_2',
      payload: {
        id: 'promo_biz_2', title: 'Six Friday Nights', promoFamily: 'Beverage',
        startDate: '2026-11-06', endDate: '2026-12-11', recurring: true, days: ['Friday']
      }
    }),
    env
  });
  j = await res.json();
  check('a charged promo is quoted P100 for 6 days', j.quote && j.quote.days === 6 && j.quote.fee === 100 && j.quote.included === false, JSON.stringify(j.quote));
  check('a charged promo leaves the free days alone', j.quote && j.quote.freeDaysLeft === 2, JSON.stringify(j.quote));

  /* ---- the publish gate ---- */
  const chargedId = j.id;
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: chargedId, action: 'approve' }), env });
  j = await res.json();
  check('approve a charged promo -> approved', res.status === 200 && j.submission.status === 'approved', JSON.stringify(j));
  check('approve raises a due invoice', j.submission.invoiceId && env.DB._db.invoices.some((i) => i.status === 'due'), JSON.stringify(env.DB._db.invoices));

  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: chargedId, action: 'publish' }), env });
  j = await res.json();
  check('publish an unpaid promo -> 409 payment_required', res.status === 409 && j.error === 'payment_required', res.status + ' ' + JSON.stringify(j));
  check('the unpaid promo stays off the feed', (env.DB._db.promos.find((p) => p.id === 'promo_biz_2') || {}).active === 0);

  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: chargedId, action: 'publish', override: true }), env });
  j = await res.json();
  check('publish anyway -> published', res.status === 200 && j.submission.status === 'published', res.status + ' ' + JSON.stringify(j));
  check('the override is logged', j.submission.adminOverride === true, JSON.stringify(j.submission));

  /* ---- approved free promo publishes by UPDATE, never a second INSERT ---- */
  const before = env.DB._db.promos.length;
  const freeId = env.DB._store.find((s) => s.event_ref === 'promo_biz_1').id;
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: freeId, action: 'approve' }), env });
  j = await res.json();
  check('approve a free promo -> approved', res.status === 200 && j.submission.status === 'approved', JSON.stringify(j));
  res = await admin.onRequestPatch({ request: req('atok', 'PATCH', { id: freeId, action: 'publish' }), env });
  j = await res.json();
  check('a free promo publishes without payment', res.status === 200 && j.submission.status === 'published', res.status + ' ' + JSON.stringify(j));
  check('publishing UPDATEs, it does not INSERT', env.DB._db.promos.length === before, before + ' -> ' + env.DB._db.promos.length);
  check('the published row carries the full shape',
    (env.DB._db.promos.find((p) => p.id === 'promo_biz_1') || {}).active === 1,
    JSON.stringify(env.DB._db.promos.find((p) => p.id === 'promo_biz_1')));

  /* ---- the operator can withdraw a pending submission ---- */
  res = await cust.onRequestPost({
    request: req('btok', 'POST', {
      title: 'Withdrawn Special', restaurantId: 'rest_1', eventRef: 'promo_biz_3',
      payload: { id: 'promo_biz_3', title: 'Withdrawn Special', promoFamily: 'Food', startDate: '2026-11-09', endDate: '2026-11-09' }
    }),
    env
  });
  j = await res.json();
  const withdrawId = j.id;
  check('a third free promo is still free', j.quote && j.quote.included === true, JSON.stringify(j.quote));
  res = await cust.onRequestPatch({ request: req('btok', 'PATCH', { id: withdrawId, action: 'cancel' }), env });
  j = await res.json();
  check('the operator can cancel a pending submission', res.status === 200 && j.status === 'rejected', res.status + ' ' + JSON.stringify(j));
  check('cancelling returns the draft to the operator', (env.DB._db.promos.find((p) => p.id === 'promo_biz_3') || {}).status === 'draft', JSON.stringify(env.DB._db.promos.find((p) => p.id === 'promo_biz_3')));

  res = await cust.onRequestGet({ request: req('btok', 'GET', null, '?restaurantId=rest_1'), env });
  j = await res.json();
  check('business lists own restaurant submissions',
    j.submissions && j.submissions.length === 3 && j.submissions.every((s) => s.restaurantId === 'rest_1'),
    JSON.stringify(j.submissions.map((s) => [s.id, s.status])));

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
