/* API flow tests for the shared auth endpoints (/api/auth/signup|verify|login).
   Drives the real handlers against an in-memory fake of D1 + KV to cover the
   business/customer account creation + session paths added for D4. */
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

function fakeKV() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); }
  };
}

function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeDB(seed) {
  const db = { users: [], verifications: [] };
  Object.keys(seed || {}).forEach((t) => { db[t] = seed[t].slice(); });

  function exec(sql, args, mode) {
    const s = norm(sql);
    const first = (r) => (mode === 'first' ? (r || null) : (r ? [r] : []));

    if (s.startsWith('SELECT id, username, whatsapp FROM users WHERE username = ? OR whatsapp = ? OR email = ?')) {
      const rows = db.users.filter((u) => u.username === args[0] || u.whatsapp === args[1] || u.email === args[2]);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('INSERT INTO users')) {
      const [id, email, name, status, created_at, username, whatsapp, password_hash,
        password_salt, password_iter, type, profile, updated_at] = args;
      db.users.push({
        id, email, name, status, is_admin: 0, created_at, username, whatsapp,
        password_hash, password_salt, password_iter, verified: 0, type, profile, updated_at
      });
      return null;
    }
    if (s.startsWith('INSERT INTO verifications')) {
      const [id, user_id, channel, code_hash, expires_at, created_at] = args;
      db.verifications.push({ id, user_id, channel, code_hash, expires_at, attempts: 0, created_at, consumed_at: null });
      return null;
    }
    if (s.startsWith('SELECT * FROM users WHERE whatsapp = ? AND type = ?')) {
      return first(db.users.find((u) => u.whatsapp === args[0] && u.type === args[1]));
    }
    if (s.startsWith('SELECT * FROM users WHERE username = ?')) {
      return first(db.users.find((u) => u.username === args[0]));
    }
    if (s.startsWith('SELECT * FROM users WHERE whatsapp = ?')) {
      return first(db.users.find((u) => u.whatsapp === args[0]));
    }
    if (s.startsWith('UPDATE users SET verified = 1')) {
      const u = db.users.find((x) => x.id === args[2]);
      if (u) { u.verified = 1; u.verified_at = args[0]; u.updated_at = args[1]; }
      return null;
    }
    if (s.startsWith('SELECT id FROM verifications WHERE user_id = ?')) {
      const rows = db.verifications
        .filter((v) => v.user_id === args[0] && v.consumed_at == null)
        .sort((a, b) => b.created_at - a.created_at);
      return first(rows[0] || null);
    }
    if (s.startsWith('UPDATE verifications SET consumed_at = ?')) {
      const v = db.verifications.find((x) => x.id === args[1]);
      if (v) v.consumed_at = args[0];
      return null;
    }
    if (s.startsWith('UPDATE users SET last_login_at = ?')) {
      const u = db.users.find((x) => x.id === args[2]);
      if (u) { u.last_login_at = args[0]; u.updated_at = args[1]; }
      return null;
    }

    throw new Error('fakeDB: unhandled SQL -> ' + s);
  }

  return {
    _db: db,
    prepare(sql) {
      return {
        bind() {
          const args = [].slice.call(arguments);
          return {
            first: async () => exec(sql, args, 'first'),
            all: async () => ({ results: exec(sql, args, 'all') || [] }),
            run: async () => { exec(sql, args, 'run'); return { success: true }; }
          };
        }
      };
    }
  };
}

function ctx(env, opts) {
  opts = opts || {};
  const headers = {};
  if (opts.cookie) headers.cookie = 'eatouts_session=' + opts.cookie;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const req = new Request('https://eatouts.test/api/auth/x', {
    method: 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  return { env, request: req, params: {} };
}

function cookieToken(res) {
  const raw = res.headers.get('Set-Cookie') || res.headers.get('set-cookie') || '';
  const m = raw.match(/eatouts_session=([^;]+)/);
  return m ? m[1] : '';
}

(async () => {
  const base = path.resolve(__dirname, '..', 'functions', 'api', 'auth');
  const signup = await import(pathToFileURL(path.join(base, 'signup.js')).href);
  const verify = await import(pathToFileURL(path.join(base, 'verify.js')).href);
  const login = await import(pathToFileURL(path.join(base, 'login.js')).href);

  const env = { DB: fakeDB(), OPS_KV: fakeKV(), ENV: 'development' };

  /* ---- business signup ignores the 18+ gate ---- */
  let r = await signup.onRequestPost(ctx(env, {
    body: { type: 'business', username: 'kudu_bites', whatsapp: '26771111111',
      password: 'secretpass', firstName: 'Kudu', surname: 'Bites' }
  }));
  let j = await r.json();
  check('business signup -> 201', r.status === 201, r.status + ' ' + JSON.stringify(j));
  check('business user typed + unverified', j.user && j.user.type === 'business' && j.user.verified === false);
  check('business signup returns verify link', j.verify && /^https:\/\/wa\.me\//.test(j.verify.link || ''));

  /* ---- customer signup still enforces the age gate ---- */
  r = await signup.onRequestPost(ctx(env, {
    body: { username: 'young_one', whatsapp: '26772222222', password: 'secretpass',
      firstName: 'Young', surname: 'One', dob: '2020-01-01' }
  }));
  j = await r.json();
  check('customer signup under 18 -> 400', r.status === 400, r.status);

  /* ---- customer signup (adult) ---- */
  r = await signup.onRequestPost(ctx(env, {
    body: { username: 'adult_one', whatsapp: '26773333333', password: 'secretpass',
      firstName: 'Adult', surname: 'One', dob: '1990-01-01' }
  }));
  j = await r.json();
  check('customer signup -> 201', r.status === 201, r.status + ' ' + JSON.stringify(j));
  check('customer user typed customer', j.user && j.user.type === 'customer');

  /* ---- duplicate whatsapp rejected ---- */
  r = await signup.onRequestPost(ctx(env, {
    body: { type: 'business', username: 'other_biz', whatsapp: '26771111111',
      password: 'secretpass', firstName: 'Other', surname: 'Biz' }
  }));
  check('duplicate whatsapp -> 409', r.status === 409, r.status);

  /* ---- business verify starts a session ---- */
  r = await verify.onRequestPost(ctx(env, { body: { whatsapp: '26771111111', type: 'business' } }));
  j = await r.json();
  const bizCookie = cookieToken(r);
  check('business verify -> 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  check('business verify sets cookie', !!bizCookie);
  check('business verify marks verified', j.user && j.user.verified === true);
  check('business verify routes to business signup', j.route === 'eatouts-business-signup.html', j.route);

  /* verify wrong type -> not found */
  r = await verify.onRequestPost(ctx(env, { body: { whatsapp: '26771111111', type: 'customer' } }));
  check('business verify as customer -> 404', r.status === 404, r.status);

  /* ---- business login by whatsapp + password ---- */
  r = await login.onRequestPost(ctx(env, { body: { whatsapp: '26771111111', password: 'secretpass' } }));
  j = await r.json();
  check('business login -> 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  check('business login sets cookie', !!cookieToken(r));
  check('business login routes to business signup', j.route === 'eatouts-business-signup.html', j.route);

  r = await login.onRequestPost(ctx(env, { body: { whatsapp: '26771111111', password: 'wrongpass1' } }));
  check('business login wrong password -> 401', r.status === 401, r.status);

  /* ---- customer login unchanged (username + whatsapp + password) ---- */
  r = await verify.onRequestPost(ctx(env, { body: { whatsapp: '26773333333' } }));
  j = await r.json();
  check('customer verify -> verified + profile route', r.status === 200 && j.route === 'eatouts-profile.html', JSON.stringify(j));

  r = await login.onRequestPost(ctx(env, {
    body: { username: 'adult_one', whatsapp: '26773333333', password: 'secretpass' }
  }));
  j = await r.json();
  check('customer login by username -> 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  check('customer login routes to profile', j.route === 'eatouts-profile.html', j.route);

  /* mismatched whatsapp still rejected */
  r = await login.onRequestPost(ctx(env, {
    body: { username: 'adult_one', whatsapp: '26779999999', password: 'secretpass' }
  }));
  check('customer login whatsapp mismatch -> 401', r.status === 401, r.status);

  /* unknown whatsapp -> 401 */
  r = await login.onRequestPost(ctx(env, { body: { whatsapp: '26770000000', password: 'secretpass' } }));
  check('unknown whatsapp login -> 401', r.status === 401, r.status);

  /* missing password -> 400 */
  r = await login.onRequestPost(ctx(env, { body: { whatsapp: '26773333333' } }));
  check('login without password -> 400', r.status === 400, r.status);

  /* unconfigured backend -> 503 */
  r = await signup.onRequestPost(ctx({}, { body: {} }));
  check('signup unconfigured backend -> 503', r.status === 503, r.status);
  r = await login.onRequestPost(ctx({}, { body: {} }));
  check('login unconfigured backend -> 503', r.status === 503, r.status);

  console.log('\n' + checks + ' checks, ' + fails + ' failures');
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
