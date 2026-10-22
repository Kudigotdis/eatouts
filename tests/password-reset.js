/* Password reset tests.
 *
 * Covers the whole "Forgot your Password" flow:
 *   POST /api/auth/password-reset          -> asks for a reset link
 *   POST /api/auth/password-reset/confirm  -> sets the new password
 *
 * The handlers are driven against an in-memory fake of D1 + KV, and the
 * outbound email is captured from a stubbed fetch, so nothing leaves the
 * machine.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

const APP_DIR = path.resolve(__dirname, '..');

/* ---------- fake KV ---------- */
function fakeKV() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, v); },
    async delete(k) { m.delete(k); },
    async list({ prefix } = {}) {
      const keys = [];
      for (const name of m.keys()) {
        if (!prefix || name.startsWith(prefix)) keys.push({ name });
      }
      return { keys };
    }
  };
}

/* ---------- fake D1 ---------- */
function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeDB(seed) {
  const db = { users: [], password_resets: [] };
  Object.keys(seed || {}).forEach((t) => { db[t] = seed[t].slice(); });

  function exec(sql, args, mode) {
    const s = norm(sql);
    const one = (r) => (mode === 'first' ? (r || null) : (r ? [r] : []));

    if (s.startsWith('SELECT id, name, email, type FROM users WHERE lower(email) = ?')) {
      const mail = String(args[0]).toLowerCase();
      const rows = db.users.filter((u) => String(u.email || '').toLowerCase() === mail);
      return mode === 'all' ? rows : (rows[0] || null);
    }
    if (s.startsWith('SELECT id FROM users WHERE id = ?')) {
      return one(db.users.find((u) => u.id === args[0]));
    }
    if (s.startsWith('SELECT * FROM password_resets WHERE token_hash = ?')) {
      return one(db.password_resets.find((r) => r.token_hash === args[0]));
    }
    if (s.startsWith('DELETE FROM password_resets WHERE user_id = ?')) {
      db.password_resets = db.password_resets.filter(
        (r) => !(r.user_id === args[0] && r.used_at == null)
      );
      return null;
    }
    if (s.startsWith('INSERT INTO password_resets')) {
      const [id, user_id, email, token_hash, expires_at, attempts, request_ip, created_at] = args;
      db.password_resets.push({
        id, user_id, email, token_hash, expires_at, attempts, request_ip, created_at, used_at: null
      });
      return null;
    }
    if (s.startsWith('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?')) {
      const r = db.password_resets.find((x) => x.id === args[0]);
      if (r) r.attempts = Number(r.attempts || 0) + 1;
      return null;
    }
    if (s.startsWith('UPDATE password_resets SET used_at = ? WHERE id = ?')) {
      const r = db.password_resets.find((x) => x.id === args[1]);
      if (r) r.used_at = args[0];
      return null;
    }
    if (s.startsWith('UPDATE users SET password_hash = ?')) {
      const u = db.users.find((x) => x.id === args[4]);
      if (u) {
        u.password_hash = args[0];
        u.password_salt = args[1];
        u.password_iter = args[2];
        u.updated_at = args[3];
      }
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
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  const req = new Request('https://eatouts.test/api/auth/password-reset', {
    method: 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
  });
  return { env, request: req, params: {} };
}

/* ---------- capture the outbound email ---------- */
let sent = [];
const realFetch = global.fetch;
global.fetch = async function (url, init) {
  sent.push({ url: String(url), init: init || {} });
  return new Response(JSON.stringify({ id: 'mail_1' }), {
    status: 200, headers: { 'content-type': 'application/json' }
  });
};

(async () => {
  const base = path.resolve(APP_DIR, 'functions', 'api');
  const request = await import(pathToFileURL(path.join(base, 'auth', 'password-reset.js')).href);
  const confirm = await import(pathToFileURL(path.join(base, 'auth', 'password-reset', 'confirm.js')).href);
  const mail = await import(pathToFileURL(path.join(base, '_mail.js')).href);

  /* ---------- the mailer ---------- */
  check('no provider without a secret', mail.mailProvider({}) === null);
  check('resend is picked when RESEND_API_KEY is set',
    mail.mailProvider({ RESEND_API_KEY: 're_x' }) === 'resend');
  check('brevo is picked when BREVO_API_KEY is set',
    mail.mailProvider({ BREVO_API_KEY: 'x' }) === 'brevo');
  check('resend wins over brevo',
    mail.mailProvider({ RESEND_API_KEY: 're_x', BREVO_API_KEY: 'x' }) === 'resend');
  check('the sender is EatOuts <info@eatouts.site>',
    mail.parseFrom('').email === 'info@eatouts.site' && mail.parseFrom('').name === 'EatOuts');
  check('a custom sender is parsed',
    mail.parseFrom('EatOuts <hello@eatouts.site>').email === 'hello@eatouts.site');
  check('appBase uses PUBLIC_BASE',
    mail.appBase({ PUBLIC_BASE: 'https://www.eatouts.site/' }, { url: 'https://x.test' }) === 'https://www.eatouts.site');
  check('appBase falls back to the request origin',
    mail.appBase({}, { url: 'https://x.test/a' }) === 'https://x.test');

  const env = {
    DB: fakeDB({
      users: [
        { id: 'usr_1', username: 'kudz', whatsapp: '26771844129', email: 'kudz@example.com',
          name: 'Kudz M', type: 'customer', password_hash: 'old', password_salt: 'salt', password_iter: 10000 }
      ]
    }),
    OPS_KV: fakeKV(),
    RESEND_API_KEY: 're_test',
    EMAIL_FROM: 'EatOuts <info@eatouts.site>',
    PUBLIC_BASE: 'https://www.eatouts.site'
  };

  /* ---------- ask for a reset link ---------- */
  sent = [];
  let r = await request.onRequestPost(ctx(env, { body: { email: 'kudz@example.com' } }));
  let j = await r.json();
  check('reset request -> 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  check('reset request answers with the generic message',
    /If an account exists/i.test(j.message || ''), JSON.stringify(j));
  check('one email was sent', sent.length === 1, String(sent.length));
  const mailBody = JSON.parse((sent[0] && sent[0].init.body) || '{}');
  check('the email goes to the account address', (mailBody.to || []).indexOf('kudz@example.com') !== -1,
    JSON.stringify(mailBody.to));
  check('the sender is EatOuts', /EatOuts <info@eatouts\.site>/.test(mailBody.from || ''), mailBody.from);
  check('the email carries a reset link',
    /eatouts-login\.html\?reset_token=/.test(String(mailBody.html || '') + String(mailBody.text || '')));
  const token = decodeURIComponent(/reset_token=([0-9a-f]+)/.exec(String(mailBody.html || ''))[1]);
  check('the raw token is long enough', token.length >= 32, String(token.length));
  check('only the hash of the token is stored',
    env.DB._db.password_resets.length === 1 && env.DB._db.password_resets[0].token_hash !== token);

  /* an unknown address must look exactly the same */
  sent = [];
  r = await request.onRequestPost(ctx(env, { body: { email: 'nobody@example.com' } }));
  j = await r.json();
  check('an unknown address still answers 200', r.status === 200, r.status);
  check('an unknown address gets the same message',
    /If an account exists/i.test(j.message || ''));
  check('an unknown address gets no email', sent.length === 0, String(sent.length));

  /* a malformed address is refused */
  r = await request.onRequestPost(ctx(env, { body: { email: 'not-an-email' } }));
  check('a malformed address -> 400', r.status === 400, r.status);

  /* ---------- set the new password ---------- */
  r = await confirm.onRequestPost(ctx(env, { body: { token, password: 'a-new-password' } }));
  j = await r.json();
  check('confirm -> 200', r.status === 200, r.status + ' ' + JSON.stringify(j));
  check('the password hash changed',
    env.DB._db.users[0].password_hash !== 'old' && env.DB._db.users[0].password_hash.length === 64);
  check('the token is marked used', env.DB._db.password_resets[0].used_at != null);

  /* the same link cannot be used twice */
  r = await confirm.onRequestPost(ctx(env, { body: { token, password: 'another-password' } }));
  check('the link is single use -> 400', r.status === 400, r.status);

  /* an unknown link is refused */
  r = await confirm.onRequestPost(ctx(env, { body: { token: 'f'.repeat(64), password: 'a-new-password' } }));
  check('an unknown token -> 400', r.status === 400, r.status);

  /* a short password is refused */
  r = await confirm.onRequestPost(ctx(env, { body: { token: 'e'.repeat(64), password: 'short' } }));
  check('a short password -> 400', r.status === 400, r.status);

  /* ---------- the migration that backs the table ---------- */
  const migration = path.join(APP_DIR, 'migrations', '0011_password_reset.sql');
  check('the password_resets migration exists', fs.existsSync(migration));
  const sql = fs.existsSync(migration) ? fs.readFileSync(migration, 'utf8') : '';
  check('the migration creates password_resets', /CREATE TABLE[^;]*password_resets/i.test(sql));
  check('the migration stores only the token hash',
    /token_hash/.test(sql) && !/\btoken\b\s+TEXT/i.test(sql.replace(/token_hash/g, '')));

  /* ---------- the login page wires the two endpoints ---------- */
  const loginPage = fs.readFileSync(path.join(APP_DIR, 'eatouts-login.html'), 'utf8');
  check('the login page calls the reset endpoint', /password-reset/.test(loginPage));
  check('the login page has a forgot-password panel',
    /forgotForm/i.test(loginPage) && /resetEmail/i.test(loginPage));

  /* ---------- the client helper ---------- */
  const customerSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-customer.js'), 'utf8');
  check('the client exposes passwordReset', /passwordReset\s*:\s*passwordReset/.test(customerSrc));
  check('the client exposes passwordResetConfirm',
    /passwordResetConfirm\s*:\s*passwordResetConfirm/.test(customerSrc));

  global.fetch = realFetch;

  console.log('\n' + checks + ' checks, ' + fails + ' failures');
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); global.fetch = realFetch; process.exit(1); });
