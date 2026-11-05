/* Security tests for Milestone A of the access-control roadmap (Phase 3 - the
   admin exception).

   Covers, in order:
     A. token crypto      - signToken / verifyToken round trip and tampering
     B. cookies           - readCookie parsing, production vs local attributes
     C. device binding    - uaFamily / deviceId stability across version bumps
     D. adminGate         - the authoritative check, including fail-closed
     E. credentials       - PBKDF2 verification against ADMIN_PASSWORD_PBKDF2
     F. endpoints         - login / session / revoke-all / logout behaviour
     G. privacy           - denial_log never stores a raw IP or user agent
     H. migration 0018    - the four tables the milestone depends on

   Everything runs against in-memory fakes of KV and D1, so it needs no
   wrangler, no network and no real secrets. The worker modules are ESM, hence
   the dynamic import through pathToFileURL (same pattern as api-venues.js).
   */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { pbkdf2Sync } = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_EDGE = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}
function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

/* ------------------------------------------------------------------- fakes */

function fakeKV() {
  const map = new Map();
  return {
    map,
    async get(k) { return map.has(k) ? map.get(k) : null; },
    async put(k, v) { map.set(k, String(v)); },
    async delete(k) { map.delete(k); },
    async list(opts) {
      const prefix = (opts && opts.prefix) || '';
      const keys = [...map.keys()].filter((k) => k.indexOf(prefix) === 0).map((name) => ({ name }));
      return { keys };
    }
  };
}

function fakeDB() {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      const stmt = {
        sql,
        args: [],
        bind(...args) { stmt.args = args; return stmt; },
        async run() { writes.push({ sql: norm(sql), args: stmt.args }); return { success: true }; },
        async first() { return null; },
        async all() { return { results: [] }; }
      };
      return stmt;
    }
  };
}

/* Requests are plain objects: the handlers only touch .headers, .json() and .cf,
   which keeps the tests independent of the Request implementation. */
function fakeRequest(opts) {
  const o = opts || {};
  const headers = new Headers();
  Object.keys(o.headers || {}).forEach((k) => headers.set(k, o.headers[k]));
  return {
    url: o.url || 'https://www.eatouts.site/api/admin/login',
    method: o.method || 'POST',
    headers,
    cf: o.cf || { country: 'ZW', asn: 1221, colo: 'JNB' },
    async json() { return o.body == null ? {} : o.body; }
  };
}

function setCookies(res) {
  const raw = typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('Set-Cookie') || ''];
  return raw.filter(Boolean);
}

/* An ADMIN_PASSWORD_PBKDF2 spec built with a low iteration count so the suite
   stays fast. The worker reads the iterations from the spec, so the format is
   exercised end to end without paying the 600k production cost. */
const PASS = 'correct-horse-battery-staple';
const SALT_HEX = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
const ITER_TEST = 2048;
const SPEC = ITER_TEST + ':' + SALT_HEX + ':' +
  pbkdf2Sync(PASS, Buffer.from(SALT_HEX, 'hex'), ITER_TEST, 32, 'sha256').toString('hex');
const SECRET = 'test-bypass-secret-not-a-real-key';

/* A fully configured production-like environment. Each test block gets its own
   so a bumped epoch or a rate-limit counter never leaks into the next block. */
function configuredEnv(overrides) {
  const env = {
    ENV: 'production',
    OPS_KV: fakeKV(),
    DB: fakeDB(),
    ADMIN_USERNAME: 'ops',
    ADMIN_PASSWORD_PBKDF2: SPEC,
    ADMIN_BYPASS_SECRET: SECRET
  };
  return Object.assign(env, overrides || {});
}

async function run() {
  const sec = await import(pathToFileURL(path.join(ROOT, 'functions/api/_security.js')).href);
  const loginMod = await import(pathToFileURL(path.join(ROOT, 'functions/api/admin/login.js')).href);
  const sessionMod = await import(pathToFileURL(path.join(ROOT, 'functions/api/admin/session.js')).href);
  const revokeMod = await import(pathToFileURL(path.join(ROOT, 'functions/api/admin/revoke-all.js')).href);
  const logoutMod = await import(pathToFileURL(path.join(ROOT, 'functions/api/admin/logout.js')).href);

  /* ------------------------------------------------------------- A. tokens */
  console.log('\n-- A. token crypto --');
  const known = await sec.sha256Hex('abc');
  check('sha256Hex matches the published SHA-256 vector',
    known === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', known);

  check('signToken refuses to mint a token without a secret',
    (await sec.signToken({ kind: 'bypass' }, '', 60)) === null);

  const tok = await sec.signToken({ kind: 'bypass', usr: 'ops', epoch: 0 }, SECRET, 3600);
  const parts = String(tok).split('.');
  check('the token is v1.<payload>.<signature>',
    parts.length === 3 && parts[0] === 'v1' && parts[1].length > 0 && parts[2].length > 0, tok);
  check('the token is url-safe (no +, / or =)',
    !/[+/=]/.test(parts[1]) && !/[+/=]/.test(parts[2]), tok);

  const good = await sec.verifyToken(tok, SECRET);
  check('verifyToken accepts a freshly signed token', good.ok === true);
  check('the payload keeps the claims and adds iat/exp',
    good.payload.usr === 'ops' && good.payload.kind === 'bypass' &&
    good.payload.iat > 0 && good.payload.exp > good.payload.iat);

  const tampered = parts[0] + '.' + parts[1] + '.' + parts[2].slice(0, -3) + 'AAA';
  check('verifyToken rejects a tampered signature',
    (await sec.verifyToken(tampered, SECRET)).reason === 'signature');
  check('verifyToken rejects a token signed with another secret',
    (await sec.verifyToken(tok, 'some-other-secret')).reason === 'signature');
  check('verifyToken rejects a malformed token',
    (await sec.verifyToken('not-a-token', SECRET)).reason === 'format');
  check('verifyToken rejects a missing token',
    (await sec.verifyToken('', SECRET)).reason === 'missing');
  const stale = await sec.signToken({ kind: 'bypass' }, SECRET, 0, Date.now() - 5000);
  check('verifyToken rejects an expired token',
    (await sec.verifyToken(stale, SECRET)).reason === 'expired');

  /* ------------------------------------------------------------ B. cookies */
  console.log('\n-- B. cookies --');
  const cookieReq = fakeRequest({ headers: { Cookie: 'a=1; eatouts_admin_bypass=' + tok + '; b=2' } });
  check('readCookie finds a value among other cookies',
    sec.readCookie(cookieReq, 'eatouts_admin_bypass') === tok);
  check('readCookie returns an empty string when the cookie is absent',
    sec.readCookie(cookieReq, 'eatouts_admin_device') === '');
  check('readCookie tolerates a missing Cookie header',
    sec.readCookie(fakeRequest({}), 'anything') === '');
  const encoded = fakeRequest({ headers: { Cookie: 'eatouts_admin_bypass=v1.aa%3D%3D.bb' } });
  check('readCookie URL-decodes the value',
    sec.readCookie(encoded, 'eatouts_admin_bypass') === 'v1.aa==.bb');

  const prodCookie = sec.cookie(sec.ADMIN_COOKIE, tok, { env: { ENV: 'production' }, maxAge: 2592000 });
  check('production cookie is HttpOnly + Secure + SameSite=Strict + Path=/',
    /HttpOnly/.test(prodCookie) && /Secure/.test(prodCookie) &&
    /SameSite=Strict/.test(prodCookie) && /Path=\//.test(prodCookie) &&
    /Max-Age=2592000/.test(prodCookie), prodCookie);
  const devCookie = sec.cookie(sec.ADMIN_COOKIE, tok, { env: { ENV: 'development' }, maxAge: 60 });
  check('non-production cookie drops Secure so wrangler pages dev can store it',
    !/Secure/.test(devCookie), devCookie);
  const cleared = sec.cookie(sec.ADMIN_COOKIE, '', { env: { ENV: 'production' }, maxAge: 0 });
  check('the clearing cookie uses Max-Age=0',
    /Max-Age=0/.test(cleared) && /eatouts_admin_bypass=;/.test(cleared), cleared);

  /* ---------------------------------------------------- C. device binding */
  console.log('\n-- C. device binding --');
  check('uaFamily: Chrome on Windows', sec.uaFamily(UA_WIN) === 'chrome|windows', sec.uaFamily(UA_WIN));
  check('uaFamily: Edge is not reported as Chrome', sec.uaFamily(UA_EDGE) === 'edge|windows', sec.uaFamily(UA_EDGE));
  check('uaFamily: Safari on iOS', sec.uaFamily(UA_IPHONE) === 'safari|ios', sec.uaFamily(UA_IPHONE));
  check('uaFamily: Chrome on Android', sec.uaFamily(UA_ANDROID) === 'chrome|android', sec.uaFamily(UA_ANDROID));
  check('uaFamily: an empty UA is other|other', sec.uaFamily('') === 'other|other', sec.uaFamily(''));
  check('deviceId survives a browser version bump',
    (await sec.deviceId(UA_WIN)) === (await sec.deviceId(UA_WIN.replace('141.0.0.0', '142.0.0.0'))));
  check('deviceId changes with the platform',
    (await sec.deviceId(UA_WIN)) !== (await sec.deviceId(UA_MAC)));

  /* --------------------------------------------------------- D. adminGate */
  console.log('\n-- D. adminGate --');
  const gateEnv = configuredEnv();
  const devId = await sec.deviceId(UA_WIN);
  const bypass = await sec.signToken({ kind: 'bypass', usr: 'ops', dev: devId, epoch: 0 }, SECRET, 3600);
  const withCookie = (ua, token) => fakeRequest({
    method: 'GET',
    headers: { Cookie: 'eatouts_admin_bypass=' + (token || bypass), 'User-Agent': ua || UA_WIN }
  });

  const gateOk = await sec.adminGate(gateEnv, withCookie());
  check('adminGate accepts a valid device-bound bypass cookie',
    gateOk.ok === true && gateOk.admin.usr === 'ops');
  check('adminGate returns no response object on success', gateOk.response === undefined);

  const noCookie = await sec.adminGate(gateEnv, fakeRequest({ method: 'GET', headers: { 'User-Agent': UA_WIN } }));
  check('adminGate denies (403) without a cookie', noCookie.ok === false && noCookie.response.status === 403);
  const denyBody = await noCookie.response.text();
  check('the denial body is a bare "Forbidden"', denyBody === 'Forbidden', denyBody);
  check('the denial is uncached and says nothing else',
    noCookie.response.headers.get('cache-control') === 'no-store' &&
    noCookie.response.headers.get('www-authenticate') === null);

  check('adminGate denies the same token from another browser family',
    (await sec.adminGate(gateEnv, withCookie(UA_IPHONE))).ok === false);
  const deviceKind = await sec.signToken({ kind: 'device', usr: 'ops', epoch: 0 }, SECRET, 3600);
  check('adminGate rejects a token of the wrong kind',
    (await sec.adminGate(gateEnv, withCookie(UA_WIN, deviceKind))).ok === false);
  check('adminGate rejects a token signed with a foreign secret',
    (await sec.adminGate(gateEnv, withCookie(UA_WIN, await sec.signToken({ kind: 'bypass' }, 'foreign', 3600)))).ok === false);
  check('adminGate rejects a forged token that skips the HMAC',
    (await sec.adminGate(gateEnv, withCookie(UA_WIN, 'v1.eyJraW5kIjoiYnlwYXNzIn0.AAAA'))).ok === false);

  check('readEpoch is 0 when KV is missing', (await sec.readEpoch({})) === 0);
  const before = await sec.readEpoch(gateEnv);
  const bumped = await sec.bumpEpoch(gateEnv);
  check('bumpEpoch increments the stored counter', bumped === before + 1 && (await sec.readEpoch(gateEnv)) === bumped);
  check('adminGate rejects a token issued before the last revoke-all',
    (await sec.adminGate(gateEnv, withCookie())).ok === false);

  check('adminGate fails closed when ADMIN_BYPASS_SECRET is missing',
    (await sec.adminGate({ OPS_KV: fakeKV() }, withCookie())).ok === false);
  check('adminGate fails closed when OPS_KV is missing',
    (await sec.adminGate({ ADMIN_BYPASS_SECRET: SECRET }, withCookie())).ok === false);
  check('adminConfigured is true only with every secret present',
    sec.adminConfigured(gateEnv) === true &&
    sec.adminConfigured({ OPS_KV: fakeKV(), ADMIN_USERNAME: 'ops', ADMIN_PASSWORD_PBKDF2: SPEC }) === false &&
    sec.adminConfigured({}) === false);
  check('isDatacenterAsn flags hosting networks and clears consumer ASNs',
    sec.isDatacenterAsn(16509) === true && sec.isDatacenterAsn(24940) === true &&
    sec.isDatacenterAsn(37662) === false && sec.isDatacenterAsn(0) === false);

  /* ------------------------------------------------------ E. credentials */
  console.log('\n-- E. admin credentials --');
  const credEnv = configuredEnv();
  check('the correct username + password verifies',
    (await sec.verifyAdminCredentials(credEnv, 'ops', PASS)) === true);
  check('the username comparison is case/whitespace insensitive',
    (await sec.verifyAdminCredentials(credEnv, ' OPS ', PASS)) === true);
  check('a wrong password is rejected',
    (await sec.verifyAdminCredentials(credEnv, 'ops', PASS + 'x')) === false);
  check('a wrong username is rejected',
    (await sec.verifyAdminCredentials(credEnv, 'root', PASS)) === false);
  check('an empty password is rejected',
    (await sec.verifyAdminCredentials(credEnv, 'ops', '')) === false);
  check('an undefined password is rejected',
    (await sec.verifyAdminCredentials(credEnv, 'ops', undefined)) === false);
  check('an environment with no ADMIN_PASSWORD_PBKDF2 rejects everyone',
    (await sec.verifyAdminCredentials({ OPS_KV: fakeKV(), ADMIN_USERNAME: 'ops' }, 'ops', PASS)) === false);

  /* -------------------------------------------------------- F. endpoints */
  console.log('\n-- F. endpoints --');
  const unconfigured = await loginMod.onRequestPost({
    env: { ENV: 'production' },
    request: fakeRequest({ body: { username: 'ops', password: PASS } })
  });
  check('POST /api/admin/login is 503 before the secrets exist', unconfigured.status === 503);

  const apiEnv = configuredEnv();
  const loginCall = (body, ip) => ({
    env: apiEnv,
    request: fakeRequest({
      headers: { 'CF-Connecting-IP': ip || '203.0.113.9', 'User-Agent': UA_WIN },
      body: body
    })
  });

  check('login rejects an empty body with 400', (await loginMod.onRequestPost(loginCall({}))).status === 400);

  const badPass = await loginMod.onRequestPost(loginCall({ username: 'ops', password: 'nope' }));
  const badPassBody = await badPass.json();
  check('login rejects a wrong password with 401', badPass.status === 401);
  check('login does not say which field was wrong',
    badPassBody.error === 'Invalid credentials.' &&
    Object.keys(badPassBody).join(',') === 'ok,error', JSON.stringify(badPassBody));

  const okRes = await loginMod.onRequestPost(loginCall({ username: 'ops', password: PASS }));
  const okBody = await okRes.json();
  const jar = setCookies(okRes);
  const jarText = jar.join(' | ');
  check('a correct login answers 200 with the dashboard route',
    okRes.status === 200 && okBody.ok === true &&
    okBody.route === 'eatouts-admin-dashboard.html' &&
    okBody.expiresIn === 30 * 86400, JSON.stringify(okBody));
  check('the login sets the bypass and the device cookie',
    jar.length === 2 && /eatouts_admin_bypass=v1\./.test(jarText) &&
    /eatouts_admin_device=v1\./.test(jarText), jarText);
  check('both cookies are HttpOnly, Secure and SameSite=Strict',
    jar.every((c) => /HttpOnly/.test(c) && /Secure/.test(c) && /SameSite=Strict/.test(c)), jarText);

  const bypassValue = (jarText.match(/eatouts_admin_bypass=([^;|\s]+)/) || [])[1] || '';
  const authed = (ua) => fakeRequest({
    method: 'GET',
    headers: { Cookie: 'eatouts_admin_bypass=' + bypassValue, 'User-Agent': ua || UA_WIN }
  });

  const anonSession = await sessionMod.onRequestGet({
    env: apiEnv, request: fakeRequest({ method: 'GET', headers: { 'User-Agent': UA_WIN } })
  });
  check('GET /api/admin/session is 403 without a cookie', anonSession.status === 403);

  const liveSession = await sessionMod.onRequestGet({ env: apiEnv, request: authed() });
  const liveBody = await liveSession.json();
  check('GET /api/admin/session reports the live admin',
    liveSession.status === 200 && liveBody.ok === true && liveBody.admin.user === 'ops',
    JSON.stringify(liveBody));
  check('the session endpoint reports the current epoch and device id',
    liveBody.admin.epoch === 0 && liveBody.admin.device === devId, JSON.stringify(liveBody.admin));
  check('POST /api/admin/session is 405', (await sessionMod.onRequestPost()).status === 405);

  check('the login recorded the admin browser in admin_devices',
    apiEnv.DB.writes.some((w) => /^INSERT INTO admin_devices/.test(w.sql)));
  check('the login wrote an admin_login audit row',
    apiEnv.DB.writes.some((w) => /^INSERT INTO admin_audit/.test(w.sql) && w.args[2] === 'admin_login'));

  const revokeAnon = await revokeMod.onRequestPost({
    env: apiEnv, request: fakeRequest({ method: 'POST', headers: { 'User-Agent': UA_WIN } })
  });
  check('POST /api/admin/revoke-all is 403 without a cookie', revokeAnon.status === 403);

  const revokeRes = await revokeMod.onRequestPost({ env: apiEnv, request: authed() });
  const revokeBody = await revokeRes.json();
  check('revoke-all bumps the epoch to 1',
    revokeRes.status === 200 && revokeBody.epoch === 1, JSON.stringify(revokeBody));
  check('revoke-all clears both cookies',
    setCookies(revokeRes).length === 2 &&
    setCookies(revokeRes).every((c) => /Max-Age=0/.test(c)));
  check('revoke-all marked every device revoked',
    apiEnv.DB.writes.some((w) => /^UPDATE admin_devices SET revoked_at = \?/.test(w.sql)));

  const afterRevoke = await sessionMod.onRequestGet({ env: apiEnv, request: authed() });
  check('the cookie issued before revoke-all is now refused', afterRevoke.status === 403);
  const deviceOnly = await sessionMod.onRequestGet({
    env: apiEnv,
    request: fakeRequest({ headers: { Cookie: 'eatouts_admin_device=' + bypassValue, 'User-Agent': UA_WIN } })
  });
  check('the device cookie alone is not a bypass', deviceOnly.status === 403);
  check('revoke-all cannot be re-run with a revoked cookie',
    (await revokeMod.onRequestPost({ env: apiEnv, request: authed() })).status === 403);

  const logoutRes = await logoutMod.onRequestPost({
    env: apiEnv, request: fakeRequest({ method: 'POST', headers: { 'User-Agent': UA_WIN } })
  });
  check('logout is idempotent: 200 and both cookies cleared',
    logoutRes.status === 200 && setCookies(logoutRes).length === 2 &&
    setCookies(logoutRes).every((c) => /Max-Age=0/.test(c)));
  check('logout wrote an admin_logout audit row',
    apiEnv.DB.writes.some((w) => /^INSERT INTO admin_audit/.test(w.sql) && w.args[2] === 'admin_logout'));
  check('GET on logout is 405', (await logoutMod.onRequestGet()).status === 405);

  /* The limiter is the only thing between an off-shore IP and six free guesses. */
  const rlEnv = configuredEnv();
  const rlStatuses = [];
  for (let i = 0; i < 7; i++) {
    const res = await loginMod.onRequestPost({
      env: rlEnv,
      request: fakeRequest({
        headers: { 'CF-Connecting-IP': '198.51.100.7', 'User-Agent': UA_WIN },
        body: { username: 'ops', password: 'wrong-' + i }
      })
    });
    rlStatuses.push(res.status);
  }
  check('the 7th attempt from one IP is rate limited (429)',
    rlStatuses.slice(0, 6).every((s) => s === 401) && rlStatuses[6] === 429,
    rlStatuses.join(','));

  /* ---------------------------------------------------------- G. privacy */
  console.log('\n-- G. privacy (denial_log) --');
  const privEnv = configuredEnv();
  const privReq = fakeRequest({
    headers: { 'CF-Connecting-IP': '203.0.113.9', 'User-Agent': UA_IPHONE },
    cf: { country: 'ZW', asn: 1221 }
  });
  const row = await sec.logDenial(privEnv, privReq, {
    stage: 4, rule: 'datacenter_asn', path: '/eatouts-about.html', confidence: 80
  });
  const denialWrite = privEnv.DB.writes.filter((w) => /^INSERT INTO denial_log/.test(w.sql))[0];
  const flatArgs = JSON.stringify(denialWrite && denialWrite.args);
  check('logDenial writes exactly one denial_log row with 11 columns',
    !!denialWrite && denialWrite.args.length === 11, flatArgs);
  check('no raw IP address reaches denial_log', flatArgs.indexOf('203.0.113.9') === -1);
  check('no raw user agent reaches denial_log',
    flatArgs.indexOf('iPhone') === -1 && flatArgs.indexOf('Mozilla') === -1);
  check('the stored IP identifier is the salted SHA-256',
    denialWrite.args[4] === await sec.sha256Hex('ip:203.0.113.9'));
  check('country + ASN are kept so false positives can be triaged',
    denialWrite.args[5] === 'ZW' && denialWrite.args[6] === 1221);
  check('stage, rule, path and confidence round-trip',
    denialWrite.args[2] === 4 && denialWrite.args[3] === 'datacenter_asn' &&
    denialWrite.args[9] === '/eatouts-about.html' && denialWrite.args[10] === 80);
  check('the returned record mirrors the stored row',
    row.rule === 'datacenter_asn' && row.stage === 4 && row.confidence === 80);
  check('logDenial still returns a record when DB is absent',
    (await sec.logDenial({}, privReq, { stage: 1, rule: 'ua_known_bad' })).rule === 'ua_known_bad');

  /* --------------------------------------------------- H. migration + CLI */
  console.log('\n-- H. migration 0018 + hash script --');
  const mig = fs.readFileSync(path.join(ROOT, 'migrations/0018_admin_access.sql'), 'utf8');
  check('migration 0018 defines admin_devices',
    /CREATE TABLE IF NOT EXISTS admin_devices/.test(mig));
  check('migration 0018 defines admin_audit',
    /CREATE TABLE IF NOT EXISTS admin_audit/.test(mig));
  check('migration 0018 defines denial_log',
    /CREATE TABLE IF NOT EXISTS denial_log/.test(mig));
  check('migration 0018 defines canary_tokens',
    /CREATE TABLE IF NOT EXISTS canary_tokens/.test(mig));
  const createTables = (mig.match(/CREATE TABLE/g) || []).length;
  const idempotentTables = (mig.match(/CREATE TABLE IF NOT EXISTS/g) || []).length;
  check('all four tables are created idempotently',
    createTables === 4 && idempotentTables === 4, createTables + '/' + idempotentTables);
  check('denial_log hashes identifiers instead of storing them raw',
    /ip_hash/.test(mig) && /ua_hash/.test(mig) && !/\bip TEXT\b/.test(mig));

  const script = fs.readFileSync(path.join(ROOT, 'scripts/hash-admin-password.mjs'), 'utf8');
  check('the hash script targets 600,000 PBKDF2 iterations',
    /var ITER = 600000;/.test(script));
  check('the hash script prints only <iterations>:<salt>:<hash>',
    /process\.stdout\.write\(ITER \+ ':' \+ saltHex \+ ':' \+ hashHex/.test(script));
  check('the hash script refuses short passwords',
    /length < 12/.test(script));

  /* -------------------------------------------- I. access overview (B2) */
  console.log('\n-- I. access overview (B2) --');
  const accessMod = await import(pathToFileURL(path.join(ROOT, 'functions/api/admin/access.js')).href);
  const ACCESS_URL = 'https://www.eatouts.site/api/admin/access';

  const accessNoDb = await accessMod.onRequestGet({
    env: { ENV: 'production' },
    request: fakeRequest({ method: 'GET', url: ACCESS_URL })
  });
  check('GET /api/admin/access is 503 without the DB binding', accessNoDb.status === 503);

  const accessAnon = await accessMod.onRequestGet({
    env: configuredEnv(),
    request: fakeRequest({ method: 'GET', url: ACCESS_URL })
  });
  check('GET /api/admin/access is 401 without an admin session', accessAnon.status === 401);
  check('POST /api/admin/access is 405', (await accessMod.onRequestPost()).status === 405);

  /* A DB whose queries actually answer, so the row mapping is exercised. The
     denial row deliberately carries hash columns that must never come out. */
  function rowsDB(rows) {
    return {
      prepare(sql) {
        const stmt = {
          sql,
          args: [],
          bind(...args) { stmt.args = args; return stmt; },
          async run() { return { success: true }; },
          async first() { return null; },
          async all() {
            const s = norm(sql);
            if (/FROM admin_devices/.test(s)) return { results: rows.devices || [] };
            if (/FROM denial_log/.test(s)) {
              return { results: /GROUP BY/.test(s) ? (rows.rules || []) : (rows.recent || []) };
            }
            return { results: [] };
          }
        };
        return stmt;
      }
    };
  }

  const ovEnv = configuredEnv({
    DB: rowsDB({
      devices: [
        { id: 'adev_1', user_ref: 'ops', device_hash: devId, label: 'chrome|windows', created_at: 1000, last_seen_at: 5000, last_country: 'ZW', last_asn: 1221, revoked_at: null },
        { id: 'adev_2', user_ref: 'ops', device_hash: 'f'.repeat(64), label: 'safari|mac', created_at: 2000, last_seen_at: null, last_country: 'BW', last_asn: 37662, revoked_at: 9000 }
      ],
      rules: [{ rule: 'datacenter_asn', stage: 2, country: 'US', n: 41, last: 7000 }],
      recent: [{ at: 7000, stage: 2, rule: 'datacenter_asn', country: 'US', asn: 16509, path: '/eatouts-about', confidence: 80, ip_hash: 'LEAK1', ua_hash: 'LEAK2', fp_hash: 'LEAK3' }]
    })
  });
  const ovReq = fakeRequest({ method: 'GET', headers: { 'User-Agent': UA_WIN } });
  const ov = await accessMod.accessOverview(ovEnv, ovReq, { days: '7' });

  check('the overview reports the gate mode and the window',
    ov.ok === true && ov.gate === 'off' && ov.windowDays === 7,
    JSON.stringify({ gate: ov.gate, days: ov.windowDays }));
  check('a request with no cookie is not a bypass', ov.bypass.active === false && ov.bypass.user === 'ops');
  check('devices are mapped with the current browser flagged',
    ov.devices.length === 2 && ov.devices[0].current === true && ov.devices[0].revokedAt === null &&
    ov.devices[1].current === false && ov.devices[1].revokedAt === 9000,
    JSON.stringify(ov.devices.map((d) => [d.current, d.revokedAt])));
  check('denials are grouped and totalled',
    ov.denied.byRule.length === 1 && ov.denied.byRule[0].count === 41 && ov.denied.total === 41);
  check('a recent denial is mapped without its hashes',
    ov.denied.recent.length === 1 && ov.denied.recent[0].rule === 'datacenter_asn' &&
    JSON.stringify(ov).indexOf('LEAK') === -1, JSON.stringify(ov.denied.recent[0]));
  check('the overview never exposes ip_hash, ua_hash or fp_hash',
    !/ip_hash|ua_hash|fp_hash/.test(JSON.stringify(ov)));

  const ovBypass = await accessMod.accessOverview(
    ovEnv,
    fakeRequest({ method: 'GET', headers: { Cookie: 'eatouts_admin_bypass=' + bypass, 'User-Agent': UA_WIN } }),
    { days: '7' }
  );
  check('a live bypass cookie is reported as active with its expiry',
    ovBypass.bypass.active === true && ovBypass.bypass.user === 'ops' &&
    ovBypass.bypass.expires > Date.now() && ovBypass.bypass.device === devId,
    JSON.stringify(ovBypass.bypass));
  check('a bypass minted for another browser is not reported as active',
    (await accessMod.accessOverview(
      ovEnv,
      fakeRequest({ method: 'GET', headers: { Cookie: 'eatouts_admin_bypass=' + bypass, 'User-Agent': UA_IPHONE } }),
      {}
    )).bypass.active === false);

  const gateOf = async (v) => (await accessMod.accessOverview(
    configuredEnv({ ACCESS_GATE: v }), fakeRequest({ headers: { 'User-Agent': UA_WIN } }), {}
  )).gate;
  check('the gate mode comes from ACCESS_GATE and fails safe',
    (await gateOf('monitor')) === 'monitor' && (await gateOf('enforce')) === 'enforce' &&
    (await gateOf('nonsense')) === 'off' && (await gateOf(undefined)) === 'off');

  check('?days= is clamped to 1..90 with a 7-day default',
    accessMod.clampDays('30') === 30 && accessMod.clampDays('999') === 90 &&
    accessMod.clampDays('0') === 7 && accessMod.clampDays('-3') === 7 && accessMod.clampDays('abc') === 7);

  const ovBroken = await accessMod.accessOverview(
    configuredEnv({ DB: { prepare() { throw new Error('no such table: denial_log'); } } }),
    fakeRequest({ headers: { 'User-Agent': UA_WIN } }),
    {}
  );
  check('a missing table degrades to a warning instead of a 500',
    ovBroken.ok === true && ovBroken.warnings.indexOf('admin_devices_unavailable') >= 0 &&
    ovBroken.warnings.indexOf('denial_log_unavailable') >= 0 && ovBroken.denied.total === 0,
    JSON.stringify(ovBroken.warnings));

  const ovNoDb = await accessMod.accessOverview(
    { ENV: 'production', ADMIN_USERNAME: 'ops' },
    fakeRequest({ headers: { 'User-Agent': UA_WIN } }),
    {}
  );
  check('without a DB the overview still answers with a warning',
    ovNoDb.ok === true && ovNoDb.warnings.indexOf('backend_not_configured') >= 0 &&
    ovNoDb.devices.length === 0);
}

run().then(() => {
  console.log('');
  if (fails) {
    console.log(checks + ' checks, ' + fails + ' failed — admin access control FAILED.');
    process.exit(1);
  }
  console.log('SECURITY-ADMIN PASSED (' + checks + ' checks).');
}).catch((err) => {
  console.log('FAIL suite crashed -- ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
