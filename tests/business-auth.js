/* Client-side business auth suite.
   Covers js/eatouts-business-auth.js: the offline/dual-mode contract, the
   signup + verify session flow, login, and the local mirroring that bridges a
   D1 user into EatoutsMgrDB / EatoutsAuth. */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
let checks = 0;
const check = (label, cond, extra) => {
  checks++;
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const errors = [];
const rel = 'js/eatouts-business-auth.js';
const f = path.join(APP_DIR, rel.split('?')[0].replace(/\//g, path.sep));
if (!fs.existsSync(f)) { console.log('missing script: ' + rel); process.exit(1); }
const html = '<!doctype html><html><head><meta charset="utf-8"></head><body><script>' +
  fs.readFileSync(f, 'utf8') + '</script></body></html>';

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/eatouts-business-signup.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const w = dom.window;

const store = {};
let sessionStarted = null;
w.EatoutsUsers = {
  find: id => store[id] || null,
  create: data => { store[data.id] = data; return data; },
  update: (id, data) => { store[id] = data; return data; }
};
w.EatoutsAuth = { startSession: u => { sessionStarted = u; return u; } };
w.EatoutsMgrDB = { upsert: () => {} };

function mockFetch(handler) {
  const calls = [];
  w.fetch = function (url, opts) {
    const call = { url: String(url), opts: opts || {} };
    calls.push(call);
    const out = typeof handler === 'function' ? handler(call) : handler;
    const status = out && out.status != null ? out.status : 200;
    const body = out && out.body !== undefined ? out.body : {};
    const ok = status >= 200 && status < 300;
    return Promise.resolve({ status, ok, json: () => Promise.resolve(body) });
  };
  w.fetch.calls = calls;
  return w.fetch;
}

setTimeout(async () => {
  const BA = w.EatoutsBusinessAuth;

  check('jsdom booted without window errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('EatoutsBusinessAuth exposed', !!BA);
  if (!BA) { console.log('BUSINESS AUTH TEST FAILED: module did not boot'); process.exit(1); }

  ['available', 'signup', 'login', 'mirror', 'usernameFor', 'normWa']
    .forEach(k => check('exposes ' + k, typeof BA[k] === 'function'));

  console.log('\n-- helpers --');
  check('normWa prefixes country code', BA.normWa('71 234 567') === '26771234567', BA.normWa('71 234 567'));
  check('normWa accepts full number', BA.normWa('+267 71 234 567') === '26771234567', BA.normWa('+267 71 234 567'));
  check('normWa strips leading zero', BA.normWa('071234567') === '26771234567', BA.normWa('071234567'));
  check('normWa rejects junk', BA.normWa('123') === null, BA.normWa('123'));
  check('usernameFor is valid', /^[a-z0-9][a-z0-9._-]{2,29}$/.test(BA.usernameFor('Kgale Kitchen')), BA.usernameFor('Kgale Kitchen'));

  console.log('\n-- offline / unavailable --');
  delete w.fetch;
  check('available false without fetch', BA.available() === false);
  let r = await BA.signup({ name: 'Kudu', whatsapp: '71234567', password: 'secretpass' });
  check('signup offline -> backend:false', r.ok === false && r.backend === false, JSON.stringify(r));
  r = await BA.login({ whatsapp: '71234567', password: 'secretpass' });
  check('login offline -> backend:false', r.ok === false && r.backend === false, JSON.stringify(r));

  console.log('\n-- network error --');
  mockFetch(() => { throw new Error('offline'); });
  r = await BA.signup({ name: 'Kudu', whatsapp: '71234567', password: 'secretpass' });
  check('signup network error -> backend:false', r.ok === false && r.backend === false, JSON.stringify(r));

  console.log('\n-- unconfigured backend --');
  mockFetch({ status: 503, body: { error: 'backend_not_configured' } });
  r = await BA.signup({ name: 'Kudu', whatsapp: '71234567', password: 'secretpass' });
  check('signup 503 -> backend:false', r.ok === false && r.backend === false, JSON.stringify(r));

  console.log('\n-- client-side validation --');
  mockFetch({ status: 200, body: {} });
  r = await BA.signup({ name: 'Kudu', whatsapp: '123', password: 'secretpass' });
  check('signup bad phone -> backend:true error', r.ok === false && r.backend === true && /phone/i.test(r.error), JSON.stringify(r));
  r = await BA.signup({ name: 'Kudu', whatsapp: '71234567', password: 'short' });
  check('signup short password -> backend:true error', r.ok === false && r.backend === true && /8 characters/.test(r.error), JSON.stringify(r));

  console.log('\n-- signup server error --');
  mockFetch({ status: 409, body: { error: 'That username is taken.' } });
  r = await BA.signup({ name: 'Kudu', whatsapp: '71234567', password: 'secretpass' });
  check('signup 409 -> backend:true with message', r.ok === false && r.backend === true && r.error === 'That username is taken.', JSON.stringify(r));

  console.log('\n-- signup success (signup + verify) --');
  sessionStarted = null;
  const serverUser = {
    id: 'usr_abc123', username: 'kudubites', whatsapp: '26771234567', email: 'x@y.co',
    name: 'Kudu Bites', type: 'business', verified: true,
    profile: { firstName: 'Kudu', surname: 'Bites' }
  };
  const fetchStub = mockFetch(call => {
    if (/\/auth\/signup$/.test(call.url)) return { status: 201, body: { ok: true, user: Object.assign({}, serverUser, { verified: false }) } };
    if (/\/auth\/verify$/.test(call.url)) return { status: 200, body: { ok: true, user: serverUser } };
    return { status: 404, body: {} };
  });
  r = await BA.signup({ name: 'Kudu Bites', whatsapp: '71 234 567', password: 'secretpass' });
  check('signup success -> ok/backend:true', r.ok === true && r.backend === true, JSON.stringify(r));
  const signupCall = fetchStub.calls.find(c => /\/auth\/signup$/.test(c.url));
  const sentBody = JSON.parse(signupCall.opts.body);
  check('signup sends type business + derived username', sentBody.type === 'business' && /^kudubites/.test(sentBody.username), signupCall.opts.body);
  check('signup uses include credentials', signupCall.opts.credentials === 'include');
  check('signup hit verify with business type', fetchStub.calls.some(c => /\/auth\/verify$/.test(c.url) && JSON.parse(c.opts.body).type === 'business'));
  check('mirror stored the D1 user', store['usr_abc123'] && store['usr_abc123'].type === 'business', JSON.stringify(store['usr_abc123']));
  check('mirror sets biz_owner role', store['usr_abc123'] && store['usr_abc123'].roles.indexOf('biz_owner') >= 0);
  check('mirror starts the local session with the D1 id', sessionStarted && sessionStarted.id === 'usr_abc123');

  console.log('\n-- login --');
  sessionStarted = null;
  mockFetch({ status: 200, body: { ok: true, user: serverUser, route: 'eatouts-business-signup.html' } });
  r = await BA.login({ whatsapp: '71 234 567', password: 'secretpass' });
  check('login success -> ok + route', r.ok === true && r.backend === true && r.route === 'eatouts-business-signup.html', JSON.stringify(r));
  check('login mirrored into local store', store['usr_abc123'] && sessionStarted && sessionStarted.id === 'usr_abc123');

  mockFetch({ status: 401, body: { error: 'Invalid username, WhatsApp number or password.' } });
  r = await BA.login({ whatsapp: '71 234 567', password: 'nope' });
  check('login 401 -> backend:true error', r.ok === false && r.backend === true && /Invalid/.test(r.error), JSON.stringify(r));

  console.log('\n-- mirror updates existing --');
  store['usr_xyz'] = { id: 'usr_xyz', firstName: 'Old', type: 'customer' };
  BA.mirror({ id: 'usr_xyz', name: 'New Name', type: 'business', whatsapp: '26770000000', profile: {} });
  check('mirror updates rather than duplicates', Object.keys(store).filter(k => k === 'usr_xyz').length === 1 && store['usr_xyz'].whatsapp === '26770000000');

  console.log('\n' + checks + ' checks, ' + fails + ' failures');
  if (fails) process.exit(1);
}, 50);
