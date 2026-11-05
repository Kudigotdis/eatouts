/* Access-control middleware tests - Milestone B of the roadmap
   (docs/ACCESS-CONTROL-PLAN.md section 5).

   Covers, in order:
     A. mode resolution   - off / monitor / enforce, and every way to get "off"
     B. skip paths        - the way in must never be geo-gated
     C. stage 1           - UA sanity
     D. stage 2           - datacenter ASN sanity
     E. stage 3           - the revocable admin bypass
     F. stage 4           - geo, and the one generic denial body
     G. monitor / off     - logging without blocking, and total silence
     H. fail closed       - missing bindings and unexpected exceptions
     I. privacy           - denial_log only ever holds hashed identifiers
     J. routes contract   - _routes.json really lets pages reach the middleware
     K. login page        - /admin/login is reachable and leaks nothing

   In-memory fakes of KV and D1 only: no wrangler, no network, no real secrets.
   The worker modules are ESM, so they are imported through pathToFileURL (same
   pattern as tests/security-admin.js).
   */
'use strict';

const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const UA_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_WHATSAPP = 'WhatsApp/2.25.16.78 A';
const SECRET = 'test-bypass-secret-not-a-real-key';
const BW_ASN = 37678;      /* Botswana Fibre Networks - a real consumer path */
const AWS_ASN = 16509;     /* in DATACENTER_ASNS */

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

/* ------------------------------------------------------------------- fakes */

function fakeKV() {
  const map = new Map();
  return {
    map,
    reads: 0,
    async get(k) { this.reads++; return map.has(k) ? map.get(k) : null; },
    async put(k, v) { map.set(k, String(v)); },
    async delete(k) { map.delete(k); },
    async list() { return { keys: [] }; }
  };
}

function fakeDB() {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      const stmt = {
        args: [],
        bind(...args) { stmt.args = args; return stmt; },
        async run() { writes.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), args: stmt.args }); return { success: true }; },
        async first() { return null; },
        async all() { return { results: [] }; }
      };
      return stmt;
    }
  };
}

function fakeRequest(opts) {
  const o = opts || {};
  const headers = new Headers();
  Object.keys(o.headers || {}).forEach((k) => headers.set(k, o.headers[k]));
  return {
    url: o.url || 'https://www.eatouts.site/eatouts-about.html',
    method: o.method || 'GET',
    headers,
    cf: o.cf === undefined ? { country: 'BW', asn: BW_ASN, colo: 'JNB' } : o.cf
  };
}

/* A Pages request context: env, request and the next() the middleware hands
   control to when it allows the request. */
function fakeContext(opts) {
  const o = opts || {};
  const state = { next: 0 };
  const env = o.env === undefined ? gateEnv({}) : o.env;
  return {
    state,
    env,
    request: o.request || fakeRequest({}),
    async next() {
      state.next++;
      return new Response('NEXT', { status: 200, headers: { 'content-type': 'text/plain' } });
    }
  };
}

/* A production-like environment. The gate mode is the only thing that varies
   between blocks, so a mode test can never be confused with a secret test. */
function gateEnv(overrides) {
  const env = {
    ENV: 'production',
    OPS_KV: fakeKV(),
    DB: fakeDB(),
    ADMIN_USERNAME: 'ops',
    ADMIN_PASSWORD_PBKDF2: '2048:00112233445566778899aabbccddeeff:deadbeef',
    ADMIN_BYPASS_SECRET: SECRET
  };
  return Object.assign(env, overrides || {});
}

function denialRows(env) {
  return env.DB.writes.filter((w) => /^INSERT INTO denial_log/.test(w.sql));
}

async function main() {
  const mw = await import(pathToFileURL(path.join(ROOT, 'functions/_middleware.js')).href);
  const sec = await import(pathToFileURL(path.join(ROOT, 'functions/api/_security.js')).href);
  const loginPage = await import(pathToFileURL(path.join(ROOT, 'functions/admin/login.js')).href);

  /* -------------------------------------------------------------- A. mode */
  console.log('\n-- A. mode resolution --');
  check("unset ACCESS_GATE means off", mw.gateMode({}) === 'off');
  check("null env means off", mw.gateMode(null) === 'off');
  check("'off' is off", mw.gateMode({ ACCESS_GATE: 'off' }) === 'off');
  check("'monitor' is monitor", mw.gateMode({ ACCESS_GATE: 'monitor' }) === 'monitor');
  check("'MONITOR' (uppercase) is monitor", mw.gateMode({ ACCESS_GATE: 'MONITOR' }) === 'monitor');
  check("'enforce' is enforce", mw.gateMode({ ACCESS_GATE: 'enforce' }) === 'enforce');
  check("'on' is treated as enforce", mw.gateMode({ ACCESS_GATE: 'on' }) === 'enforce');
  check("an unknown value is off, not enforce", mw.gateMode({ ACCESS_GATE: 'yes-please' }) === 'off');

  let ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'off' }), request: fakeRequest({
    headers: { 'User-Agent': 'curl/8.4.0' }, cf: { country: 'ZW', asn: AWS_ASN }
  }) });
  let res = await mw.onRequest(ctx);
  check('off mode serves a curl request from Zimbabwe untouched',
    res.status === 200 && ctx.state.next === 1 && denialRows(ctx.env).length === 0);

  /* -------------------------------------------------------- B. skip paths */
  console.log('\n-- B. skip paths (the way in) --');
  const SKIPPY = [
    '/api/admin/login', '/api/admin/session', '/api/admin/revoke-all',
    '/api/admin/logout', '/api/auth/login', '/api/health', '/admin/login',
    '/ADMIN/Login', '/_headers', '/robots.txt'
  ];
  for (const p of SKIPPY) {
    const c = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
      url: 'https://www.eatouts.site' + p, headers: { 'User-Agent': 'curl/8.4.0' }, cf: { country: 'ZW', asn: AWS_ASN }
    }) });
    const r = await mw.onRequest(c);
    check('enforce still lets ' + p + ' through (no cookie, ZW, curl)',
      r.status === 200 && c.state.next === 1 && denialRows(c.env).length === 0);
  }
  check('isSkipPath is false for a normal page', mw.isSkipPath('/eatouts-about.html') === false);
  check('isSkipPath is false for the api root', mw.isSkipPath('/api/venues') === false);

  /* ------------------------------------------------------------ C. stage 1 */
  console.log('\n-- C. stage 1: UA sanity --');
  const UA_CASES = [
    ['curl/8.4.0', 'ua_known_bad'],
    ['python-requests/2.31.0', 'ua_known_bad'],
    ['Scrapy/2.11.0 (+https://scrapy.org)', 'ua_known_bad'],
    ['Mozilla/5.0 (X11) HeadlessChrome/141.0.0.0', 'ua_known_bad'],
    ['node-fetch/1.0 (+https://github.com/bitinn/node-fetch)', 'ua_known_bad'],
    ['Bytespider; spider-feedback@bytedance.com', 'ua_known_bad'],
    ['', 'ua_missing']
  ];
  for (const [ua, rule] of UA_CASES) {
    const c = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
      headers: { 'User-Agent': ua }, cf: { country: 'BW', asn: BW_ASN }
    }) });
    const r = await mw.onRequest(c);
    const row = denialRows(c.env)[0];
    check('stage 1 denies ' + (ua ? ua.split('/')[0] : 'an empty UA') + ' with ' + rule,
      r.status === 403 && !!row && row.args[2] === 1 && row.args[3] === rule,
      r.status + ' / ' + (row && row.args[3]));
  }
  check('badUa accepts WhatsApp link previews',
    mw.badUa(UA_WHATSAPP) === '' && mw.badUa('facebookexternalhit/1.1') === '');
  check('badUa accepts a normal Chrome UA', mw.badUa(UA_WIN) === '');
  check('badUa accepts googlebot, which is stopped by stage 2 instead',
    mw.badUa('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') === '');

  /* ------------------------------------------------------------ D. stage 2 */
  console.log('\n-- D. stage 2: datacenter ASN --');
  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'BW', asn: AWS_ASN }
  }) });
  res = await mw.onRequest(ctx);
  check('a Botswana visitor on an AWS ASN is denied with datacenter_asn',
    res.status === 403 && denialRows(ctx.env)[0].args[2] === 2 &&
    denialRows(ctx.env)[0].args[3] === 'datacenter_asn');

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'BW', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  check('a Botswana visitor on a Botswana ISP ASN is served',
    res.status === 200 && ctx.state.next === 1 && denialRows(ctx.env).length === 0);
  check('a Botswana page view costs no KV read at all',
    ctx.env.OPS_KV.reads === 0, 'reads=' + ctx.env.OPS_KV.reads);

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'BW', asn: 0 }
  }) });
  res = await mw.onRequest(ctx);
  check('a missing ASN is not a stage 2 denial', res.status === 200 && ctx.state.next === 1);

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
    cf: { country: 'US', asn: 15169 }
  }) });
  res = await mw.onRequest(ctx);
  check('googlebot is denied by stage 2 (this is what enforce costs in SEO)',
    res.status === 403 && denialRows(ctx.env)[0].args[3] === 'datacenter_asn');

  /* ------------------------------------------------------------ E. stage 3 */
  console.log('\n-- E. stage 3: the revocable admin bypass --');
  const DEV_WIN = await sec.deviceId(UA_WIN);
  const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';

  async function bypassCtx(opts) {
    const o = opts || {};
    const env = gateEnv(Object.assign({ ACCESS_GATE: 'enforce' }, o.env || {}));
    const token = o.token !== undefined
      ? o.token
      : await sec.signToken({ kind: 'bypass', usr: 'ops', dev: o.dev === undefined ? DEV_WIN : o.dev, epoch: 0 },
        o.secret || SECRET, o.ttl === undefined ? 3600 : o.ttl);
    const headers = { 'User-Agent': o.ua || UA_WIN };
    if (token) headers.Cookie = 'eatouts_admin_bypass=' + token;
    return fakeContext({ env, request: fakeRequest({
      headers, cf: o.cf || { country: 'ZW', asn: 14988 }
    }) });
  }

  ctx = await bypassCtx({});
  res = await mw.onRequest(ctx);
  check('a valid bypass cookie opens the gate from Zimbabwe',
    res.status === 200 && ctx.state.next === 1 && denialRows(ctx.env).length === 0);
  check('a cross-border request does read the epoch from KV',
    ctx.env.OPS_KV.reads > 0, 'reads=' + ctx.env.OPS_KV.reads);

  ctx = await bypassCtx({ ua: UA_MAC });
  res = await mw.onRequest(ctx);
  check('the same cookie on another browser family is refused (device binding)',
    res.status === 403 && denialRows(ctx.env)[0].args[3] === 'country_not_bw');

  const deviceTok = await sec.signToken({ kind: 'device', usr: 'ops', dev: DEV_WIN, epoch: 0 }, SECRET, 3600);
  ctx = await bypassCtx({ token: deviceTok });
  res = await mw.onRequest(ctx);
  check('the 365-day device cookie is not a bypass', res.status === 403);

  ctx = await bypassCtx({});
  await ctx.env.OPS_KV.put('admin:epoch', '1');
  res = await mw.onRequest(ctx);
  check('bumping admin:epoch kills the cookie immediately', res.status === 403);

  ctx = await bypassCtx({ secret: 'some-other-secret' });
  res = await mw.onRequest(ctx);
  check('a cookie signed with another secret is refused', res.status === 403);

  const staleTok = await sec.signToken(
    { kind: 'bypass', usr: 'ops', dev: DEV_WIN, epoch: 0 }, SECRET, 60, Date.now() - 120000);
  ctx = await bypassCtx({ token: staleTok });
  res = await mw.onRequest(ctx);
  check('an expired cookie is refused', res.status === 403);

  ctx = await bypassCtx({ ua: 'curl/8.4.0' });
  res = await mw.onRequest(ctx);
  check('stage 3 does not rescue a curl user agent (stage 1 wins)',
    res.status === 403 && denialRows(ctx.env)[0].args[3] === 'ua_known_bad');

  ctx = await bypassCtx({ cf: { country: 'ZW', asn: AWS_ASN } });
  res = await mw.onRequest(ctx);
  check('stage 3 does not rescue a datacenter ASN (stage 2 wins)',
    res.status === 403 && denialRows(ctx.env)[0].args[3] === 'datacenter_asn');

  /* ------------------------------------------------------------ F. stage 4 */
  console.log('\n-- F. stage 4: geo, and the denial body --');
  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_IPHONE }, cf: { country: 'ZW', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  const body = await res.text();
  check('a Zimbabwe visitor without a cookie is denied', res.status === 403);
  check('the denial body is the single generic one', body === 'Forbidden', body.slice(0, 80));
  check('the denial body names no country, rule or stage',
    !/ZW|Botswana|country|stage|rule|asn/i.test(body), body);
  check('the denial is never cached', res.headers.get('cache-control') === 'no-store');
  check('the denial carries no Set-Cookie', !res.headers.get('set-cookie'));
  check('the geo denial is logged against stage 4',
    denialRows(ctx.env)[0].args[2] === 4 && denialRows(ctx.env)[0].args[3] === 'country_not_bw');

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'bw', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  check('a lowercase country code from a Botswana visitor is served', res.status === 200);

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: null
  }) });
  res = await mw.onRequest(ctx);
  check('a request with no cf object fails closed (country_missing)',
    res.status === 403 && denialRows(ctx.env)[0].args[3] === 'country_missing');

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'enforce' }), request: fakeRequest({
    url: 'https://www.eatouts.site/api/venues', headers: { 'User-Agent': UA_WIN },
    cf: { country: 'ZA', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  check('the JSON API is gated too', res.status === 403);

  /* --------------------------------------------------------- G. monitor/off */
  console.log('\n-- G. monitor and off --');
  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'monitor' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'ZW', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  check('monitor mode serves the page it would have denied',
    res.status === 200 && ctx.state.next === 1);
  check('monitor mode still writes the denial record',
    denialRows(ctx.env).length === 1 && denialRows(ctx.env)[0].args[3] === 'country_not_bw' &&
    denialRows(ctx.env)[0].args[10] === 90);

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'monitor' }), request: fakeRequest({
    headers: { 'User-Agent': 'curl/8.4.0' }, cf: { country: 'BW', asn: BW_ASN }
  }) });
  res = await mw.onRequest(ctx);
  check('monitor mode records a bot too, without blocking it',
    res.status === 200 && denialRows(ctx.env)[0].args[3] === 'ua_known_bad');

  ctx = fakeContext({ env: gateEnv({ ACCESS_GATE: 'monitor' }), request: fakeRequest({
    headers: { 'User-Agent': UA_WIN }, cf: { country: 'BW', asn: BW_ASN }
  }) });
  res = await mw.onRequest(ctx);
  check('monitor mode writes nothing for a clean Botswana visit',
    res.status === 200 && denialRows(ctx.env).length === 0);

  ctx = fakeContext({ env: gateEnv({}), request: fakeRequest({
    headers: { 'User-Agent': 'curl/8.4.0' }, cf: { country: 'ZW', asn: AWS_ASN }
  }) });
  res = await mw.onRequest(ctx);
  check('an unset ACCESS_GATE writes nothing at all (off is silent)',
    res.status === 200 && denialRows(ctx.env).length === 0);

  /* -------------------------------------------------------- H. fail closed */
  console.log('\n-- H. fail closed --');
  const bare = { ACCESS_GATE: 'enforce', DB: fakeDB() };
  ctx = fakeContext({ env: bare, request: fakeRequest({
    headers: { 'User-Agent': UA_WIN, Cookie: 'eatouts_admin_bypass=v1.aaaa.bbbb' },
    cf: { country: 'ZW', asn: 14988 }
  }) });
  res = await mw.onRequest(ctx);
  check('without OPS_KV / ADMIN_BYPASS_SECRET the bypass cannot be trusted',
    res.status === 403, res.status);

  ctx = fakeContext({ env: { ACCESS_GATE: 'enforce', DB: fakeDB(), OPS_KV: fakeKV(), ADMIN_BYPASS_SECRET: SECRET },
    request: fakeRequest({ headers: { 'User-Agent': UA_WIN }, cf: { country: 'BW', asn: 14988 } }) });
  res = await mw.onRequest(ctx);
  check('an unconfigured admin flow still serves Botswana normally',
    res.status === 200 && ctx.state.next === 1);

  const broken = {
    env: gateEnv({ ACCESS_GATE: 'enforce' }),
    request: { url: 'https://www.eatouts.site/x', method: 'GET', cf: {} },
    async next() { return new Response('NEXT'); }
  };
  res = await mw.onRequest(broken);
  check('an unexpected exception is a generic 403, never a 500 or a crash',
    res.status === 403 && (await res.text()) === 'Forbidden');

  /* ----------------------------------------------------------- I. privacy */
  console.log('\n-- I. privacy (denial_log) --');
  const privEnv = gateEnv({ ACCESS_GATE: 'enforce' });
  ctx = fakeContext({ env: privEnv, request: fakeRequest({
    url: 'https://www.eatouts.site/eatouts-about.html',
    headers: { 'User-Agent': UA_IPHONE, 'CF-Connecting-IP': '203.0.113.9' },
    cf: { country: 'ZW', asn: 14988 }
  }) });
  await mw.onRequest(ctx);
  const row = denialRows(privEnv)[0];
  const flat = JSON.stringify(row && row.args);
  check('exactly one denial_log row per denial',
    denialRows(privEnv).length === 1 && row.args.length === 11);
  check('no raw IP address reaches denial_log', flat.indexOf('203.0.113.9') === -1);
  check('no raw user agent reaches denial_log',
    flat.indexOf('iPhone') === -1 && flat.indexOf('Mozilla') === -1);
  check('the IP is stored as the sha256 hash',
    row.args[4] === await sec.sha256Hex('ip:203.0.113.9'));
  check('country and ASN are kept for triage', row.args[5] === 'ZW' && row.args[6] === 14988);
  check('stage, rule, path and confidence round-trip',
    row.args[2] === 4 && row.args[3] === 'country_not_bw' &&
    row.args[9] === '/eatouts-about.html' && row.args[10] === 90);

  /* ---------------------------------------------------- J. routes contract */
  console.log('\n-- J. _routes.json contract --');
  const stageSrc = fs.readFileSync(path.join(ROOT, 'copy-static.mjs'), 'utf8');
  const exBlock = (stageSrc.match(/const staticExcludes = \[([\s\S]*?)\];/) || ['', ''])[1];
  check("copy-static no longer excludes '/*.html' so pages reach the middleware",
    exBlock.length > 0 && exBlock.indexOf("/*.html") === -1 && exBlock.indexOf('*.html') === -1, exBlock);
  check('the asset folders stay excluded until Milestone C',
    /'\/assets\/\*'/.test(exBlock) && /'\/js\/\*'/.test(exBlock) && /'\/img\/\*'/.test(exBlock));
  check('the middleware lives at the Functions root and exports onRequest',
    fs.existsSync(path.join(ROOT, 'functions/_middleware.js')) &&
    typeof mw.onRequest === 'function');
  check('the way in is a Function, not a .html page the gate would block',
    fs.existsSync(path.join(ROOT, 'functions/admin/login.js')) &&
    !fs.existsSync(path.join(ROOT, 'admin-login.html')));

  /* ------------------------------------------------------ K. login page */
  console.log('\n-- K. /admin/login --');
  const configured = gateEnv({ ADMIN_USERNAME: 'ops-secret-name' });
  let pageRes = await loginPage.onRequestGet({ env: configured });
  const pageBody = await pageRes.text();
  check('a configured deployment serves the sign-in page', pageRes.status === 200);
  check('the page is html and never cached',
    /^text\/html/.test(pageRes.headers.get('content-type') || '') &&
    pageRes.headers.get('cache-control') === 'no-store');
  check('the page is noindex', /noindex/.test(pageRes.headers.get('x-robots-tag') || ''));
  check('the page posts to /api/admin/login',
    pageBody.indexOf('action="/api/admin/login"') > 0 &&
    pageBody.indexOf('fetch("/api/admin/login"') > 0);
  check('the page echoes no configuration',
    pageBody.indexOf('ops-secret-name') === -1 && pageBody.indexOf(SECRET) === -1 &&
    pageBody.indexOf('ADMIN_PASSWORD_PBKDF2') === -1);

  pageRes = await loginPage.onRequestGet({ env: { ENV: 'production' } });
  check('an unconfigured deployment answers 503', pageRes.status === 503);

  const postRes = await loginPage.onRequest({
    request: fakeRequest({ method: 'POST', url: 'https://www.eatouts.site/admin/login' }),
    env: configured
  });
  check('only GET/HEAD are served, everything else is 405',
    postRes.status === 405 && /GET/.test(postRes.headers.get('allow') || ''));
}

main().then(() => {
  console.log('');
  if (fails) {
    console.log(checks + ' checks, ' + fails + ' failed -- access gate FAILED.');
    process.exit(1);
  }
  console.log('ACCESS-GATE PASSED (' + checks + ' checks).');
}).catch((err) => {
  console.log('FAIL suite crashed -- ' + (err && err.stack ? err.stack : err));
  process.exit(1);
});
