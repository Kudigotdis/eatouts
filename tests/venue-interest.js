/* Venue interest suite.
   Covers the checkout copy/hand-off wiring, the D1 endpoint
   (POST / GET / PATCH), the aggregate math, the privacy boundary and the
   client-side participation flag sync. */
'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}
function norm(sql) { return String(sql).replace(/\s+/g, ' ').trim(); }

function fakeD1() {
  const state = {
    restaurants: [
      { id: 'rest_closed', slug: 'closed-kitchen', name: 'Closed Kitchen', town: 'Gaborone', area: 'CBD', status: 'published', claimed: 0, participating: 0 },
      { id: 'rest_claimed', slug: 'claimed-kitchen', name: 'Claimed Kitchen', town: 'Gaborone', area: 'CBD', status: 'claimed', claimed: 1, participating: 0 },
      { id: 'rest_marked', slug: 'marked-kitchen', name: 'Marked Kitchen', town: 'Francistown', area: 'CBD', status: 'published', claimed: 0, participating: 1 },
      { id: 'rest_b', slug: 'beta-kitchen', name: 'Beta', town: 'Francistown', area: 'CBD', status: 'published', claimed: 0, participating: 1 }
    ],
    venue_interest: [],
    users: {}
  };

  function restaurantFor(id, slug) {
    const sid = String(id || '').toLowerCase();
    const sslug = String(slug || '').toLowerCase();
    return state.restaurants.find(function (r) {
      return String(r.id).toLowerCase() === sid ||
        String(r.slug).toLowerCase() === sslug ||
        String(r.slug).toLowerCase() === sid;
    }) || null;
  }

  function exec(sql, args, mode) {
    const s = norm(sql);
    if (s.indexOf('SELECT profile FROM users') >= 0) {
      return state.users[args[0]] || null;
    }
    if (s.indexOf('FROM restaurants WHERE id = ?') >= 0 && s.indexOf('LIMIT 1') >= 0) {
      return restaurantFor(args[0], args[1]);
    }
    if (s.indexOf('INSERT INTO venue_interest') >= 0) {
      const cols = ['id', 'venue_id', 'venue_name', 'venue_town', 'venue_area', 'venue_status',
        'person_key', 'user_type', 'gender', 'age_band', 'town', 'area', 'browser_json', 'at', 'source'];
      const row = {};
      cols.forEach(function (c, i) { row[c] = args[i]; });
      state.venue_interest.push(row);
      return { success: true, meta: { changes: 1 } };
    }
    if (s.indexOf('FROM venue_interest') >= 0) {
      return state.venue_interest.slice().sort(function (a, b) { return b.at - a.at; }).map(function (r) {
        const rest = state.restaurants.find(function (x) { return x.id === r.venue_id; }) || null;
        return Object.assign({}, r, {
          current_name: rest ? rest.name : null,
          current_status: rest ? rest.status : null,
          current_claimed: rest ? rest.claimed : null,
          current_participating: rest ? rest.participating : null
        });
      });
    }
    if (s.indexOf('UPDATE restaurants SET participating') >= 0) {
      const rest = state.restaurants.find(function (r) { return r.id === args[2]; });
      if (rest) {
        rest.participating = args[0];
        rest.updated_at = args[1];
      }
      return { success: true, meta: { changes: rest ? 1 : 0 } };
    }
    throw new Error('Unhandled SQL: ' + s);
  }

  return {
    state: state,
    prepare(sql) {
      let bound = [];
      const stmt = {
        bind() { bound = Array.prototype.slice.call(arguments); return stmt; },
        async first() {
          const out = exec(sql, bound, 'first');
          return Array.isArray(out) ? (out[0] || null) : out;
        },
        async all() {
          const out = exec(sql, bound, 'all');
          return { results: Array.isArray(out) ? out : (out ? [out] : []) };
        },
        async run() {
          const out = exec(sql, bound, 'run');
          return out || { success: true };
        }
      };
      return stmt;
    }
  };
}

function fakeKV() {
  const map = new Map();
  return {
    map: map,
    async get(k) { return map.has(k) ? map.get(k) : null; },
    async put(k, v) { map.set(k, String(v)); },
    async delete(k) { map.delete(k); }
  };
}

function envFor(db, sessions) {
  const kv = fakeKV();
  Object.keys(sessions || {}).forEach(function (token) {
    kv.map.set('sess:' + token, JSON.stringify(sessions[token]));
  });
  return { DB: db, OPS_KV: kv };
}

function requestFor(method, env, opts) {
  opts = opts || {};
  const headers = {
    'content-type': 'application/json',
    'user-agent': opts.ua || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'cf-connecting-ip': opts.ip || '203.0.113.7'
  };
  if (opts.cookie) headers.cookie = 'eatouts_session=' + opts.cookie;
  return {
    request: new Request('https://eatouts.test/api/venue-interest', {
      method: method,
      headers: headers,
      body: opts.body == null ? undefined : JSON.stringify(opts.body)
    }),
    env: env
  };
}

async function jsonOf(response) {
  return response.json();
}

(async function () {
  const vUrl = pathToFileURL(path.resolve(APP_DIR, 'functions', 'api', 'venue-interest.js')).href;
  const bUrl = pathToFileURL(path.resolve(APP_DIR, 'functions', 'api', '_business.js')).href;
  const V = await import(vUrl);
  const B = await import(bUrl);

  /* ======================== copy + wiring ======================== */
  console.log('\n-- checkout wiring --');
  const index = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const noticeStart = index.indexOf('const VENUE_INTEREST_NOTICE=[');
  const nudgeStart = index.indexOf('const VENUE_INTEREST_NUDGE=[');
  const helperStart = index.indexOf('function interestNext(');
  const noticeBlock = index.slice(noticeStart, nudgeStart);
  const nudgeBlock = index.slice(nudgeStart, helperStart);
  check('notice copy bank present', noticeStart >= 0 && nudgeStart > noticeStart);
  check('notice copy has 20 messages', (noticeBlock.match(/\{title:/g) || []).length === 20);
  check('nudge copy has 19 messages', (nudgeBlock.match(/\{title:/g) || []).length === 19);
  check('both duplicate nudge titles preserved',
    (nudgeBlock.match(/Help this menu go live/g) || []).length === 2);
  check('named nudge copy preserved',
    nudgeBlock.indexOf("Mare, why wait?") >= 0 &&
    nudgeBlock.indexOf("Bona, spill the tea!") >= 0 &&
    nudgeBlock.indexOf("Save the world like a cheerleader.") >= 0);
  check('contact number field removed', index.indexOf('id="orderContact"') < 0);
  check('contact message line removed', index.indexOf('msg+="\\nContact: "') < 0);
  check('participation helper present', index.indexOf('function isParticipatingVenue(') >= 0);
  check('interest logging present', index.indexOf('function logVenueInterest(') >= 0);
  check('two-popup flow present',
    index.indexOf('function showInterestNotice(') >= 0 &&
    index.indexOf('function showInterestNudge(') >= 0);
  check('notice closes into the nudge',
    index.indexOf('dismissAct:"interestNoticeClose"') >= 0 &&
    index.indexOf('interestNoticeContinue') >= 0);
  check('final non-participating send uses contact picker',
    index.indexOf('waShareLink(buildFullBillMessage())') >= 0);

  const admin = fs.readFileSync(path.join(APP_DIR, 'eatouts-platform-analytics.html'), 'utf8');
  check('admin interest section present',
    admin.indexOf('Venue interest') >= 0 &&
    admin.indexOf('function interestModule(') >= 0 &&
    admin.indexOf('function loadInterest(') >= 0);
  check('admin participation toggle present',
    admin.indexOf('interestToggle') >= 0 && admin.indexOf('interestPitch') >= 0);

  const migration = fs.readFileSync(path.join(APP_DIR, 'migrations', '0017_venue_interest.sql'), 'utf8');
  check('migration adds participating flag',
    migration.indexOf('ALTER TABLE restaurants ADD COLUMN participating') >= 0);
  check('migration creates interest table',
    migration.indexOf('CREATE TABLE IF NOT EXISTS venue_interest') >= 0);
  check('migration indexes venue + person',
    migration.indexOf('idx_venue_interest_venue') >= 0 &&
    migration.indexOf('idx_venue_interest_person') >= 0);

  /* ======================== pure helpers ======================== */
  console.log('\n-- helpers --');
  check('age bands', V.bandForAge(17) === 'Under 18' && V.bandForAge(18) === '18-24' &&
    V.bandForAge(34) === '25-34' && V.bandForAge(65) === '65+');
  const ua = V.parseUa('Mozilla/5.0 (Windows NT 10.0) Chrome/120.0.0.0 Safari/537.36');
  check('UA parser identifies desktop Chrome', ua.browser === 'Chrome' && ua.os === 'Windows' && ua.device === 'Desktop');
  const mobileUa = V.parseUa('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1');
  check('UA parser identifies mobile Safari', mobileUa.browser === 'Safari' && mobileUa.os === 'iOS' && mobileUa.device === 'Mobile');

  const businessRow = B.restaurantOut({ id: 'r', claimed: 1, participating: 1 });
  check('restaurantOut exposes participation', businessRow.claimed === true && businessRow.participating === true);

  /* ======================== aggregate ======================== */
  console.log('\n-- aggregate --');
  const t0 = Date.parse('2026-11-05T10:00:00Z');
  const rows = [
    { venue_id: 'rest_a', venue_name: 'Alpha', venue_town: 'Gaborone', venue_area: 'CBD', venue_status: 'published', person_key: 'p1', user_type: 'user', gender: 'Female', age_band: '25-34', town: 'Gaborone', area: 'CBD', browser_json: '', at: t0 - 1000, current_name: 'Alpha', current_status: 'published', current_claimed: 0, current_participating: 0 },
    { venue_id: 'rest_a', venue_name: 'Alpha', venue_town: 'Gaborone', venue_area: 'CBD', venue_status: 'published', person_key: 'p1', user_type: 'user', gender: 'Female', age_band: '25-34', town: 'Gaborone', area: 'CBD', browser_json: '', at: t0, current_name: 'Alpha', current_status: 'published', current_claimed: 0, current_participating: 0 },
    { venue_id: 'rest_a', venue_name: 'Alpha', venue_town: 'Gaborone', venue_area: 'CBD', venue_status: 'published', person_key: 'p2', user_type: 'browser', gender: '', age_band: '', town: '', area: '', browser_json: JSON.stringify({ browser: 'Chrome', os: 'Windows', device: 'Desktop', language: 'en-BW', timezone: 'Africa/Gaborone', screen: '390x844' }), at: t0 + 1000, current_name: 'Alpha', current_status: 'published', current_claimed: 0, current_participating: 0 },
    { venue_id: 'rest_b', venue_name: 'Beta', venue_town: 'Francistown', venue_area: 'CBD', venue_status: 'published', person_key: 'p1', user_type: 'user', gender: 'Female', age_band: '25-34', town: 'Gaborone', area: 'CBD', browser_json: '', at: t0 + 2000, current_name: 'Beta', current_status: 'published', current_claimed: 0, current_participating: 1 }
  ];
  const agg = V.aggregateInterest(rows, t0 + 3000);
  check('aggregate counts distinct people', agg.totals.people === 2);
  check('aggregate counts every tap', agg.totals.taps === 4);
  check('aggregate derives repeats', agg.totals.repeatPeople === 1 && agg.totals.repeatTaps === 2);
  check('aggregate splits users and browsers', agg.totals.users === 1 && agg.totals.browsers === 1);
  const alpha = agg.venues.find(function (v) { return v.venueId === 'rest_a'; });
  const beta = agg.venues.find(function (v) { return v.venueId === 'rest_b'; });
  check('per-venue totals', alpha && alpha.people === 2 && alpha.taps === 3 && alpha.repeatTaps === 1);
  check('per-venue demographics', alpha.gender.Female === 1 && alpha.ageBands['25-34'] === 1 && alpha.towns.Gaborone === 1);
  check('per-venue browser buckets', alpha.browser.family.Chrome === 1 && alpha.browser.os.Windows === 1 &&
    alpha.browser.language['en-BW'] === 1 && alpha.browser.screen['390x844'] === 1);
  check('participation flag carried through', alpha.participating === false && beta.participating === true);
  const statusClaimed = V.aggregateInterest([{
    venue_id: 'rest_status', venue_name: 'Status Claimed', venue_status: 'claimed',
    person_key: 'p9', user_type: 'browser', browser_json: '', at: t0,
    current_name: 'Status Claimed', current_status: 'claimed',
    current_claimed: 0, current_participating: 0
  }], t0);
  check('claimed status is treated as claimed',
    statusClaimed.venues[0].claimed === true && statusClaimed.venues[0].participating === true);

  /* ======================== POST ======================== */
  console.log('\n-- POST --');
  let db = fakeD1();
  let env = envFor(db);
  let res = await V.onRequestPost(requestFor('POST', env, {
    body: {
      venueId: 'rest_closed',
      visitorId: 'visitor-abc',
      browser: {
        language: 'en-BW', languages: 'en-BW,en', timezone: 'Africa/Gaborone',
        screen: '390x844', pixelRatio: 2, platform: 'Win32', mobile: false,
        touch: false, referrer: 'https://eatouts.test/index.html', region: 'BW', connection: '4g'
      }
    }
  }));
  let body = await jsonOf(res);
  check('anonymous tap accepted', res.status === 200 && body.ok === true && body.logged === true && body.personType === 'browser');
  check('one row per tap', db.state.venue_interest.length === 1);
  const anonRow = db.state.venue_interest[0];
  check('canonical venue stored', anonRow.venue_id === 'rest_closed' && anonRow.venue_name === 'Closed Kitchen');
  check('visitor id is hashed, not stored raw', anonRow.person_key.length === 64 && anonRow.person_key !== 'visitor-abc');
  check('browser metadata is coarse', (function () {
    const b = JSON.parse(anonRow.browser_json);
    return b.browser === 'Chrome' && b.os === 'Windows' && b.device === 'Desktop' &&
      b.language === 'en-BW' && b.screen === '390x844' && b.region === 'BW';
  })());
  check('no raw UA stored', JSON.stringify(anonRow).indexOf('Mozilla') < 0);
  check('no IP stored', !Object.prototype.hasOwnProperty.call(anonRow, 'ip'));

  await V.onRequestPost(requestFor('POST', env, {
    body: { venueId: 'rest_closed', visitorId: 'visitor-abc', browser: {} }
  }));
  check('same visitor hashes to the same person key',
    db.state.venue_interest.length === 2 &&
    db.state.venue_interest[0].person_key === db.state.venue_interest[1].person_key);

  db = fakeD1();
  env = envFor(db);
  res = await V.onRequestPost(requestFor('POST', env, { body: { venueId: 'rest_claimed', visitorId: 'v2' } }));
  body = await jsonOf(res);
  check('claimed venue skips the tap', res.status === 200 && body.logged === false && db.state.venue_interest.length === 0);
  res = await V.onRequestPost(requestFor('POST', env, { body: { venueId: 'rest_marked', visitorId: 'v3' } }));
  body = await jsonOf(res);
  check('admin-marked venue skips the tap', res.status === 200 && body.logged === false && db.state.venue_interest.length === 0);

  db = fakeD1();
  env = envFor(db, { tok_user: { userId: 'user_1', type: 'customer' } });
  db.state.users.user_1 = { profile: JSON.stringify({ gender: 'Male', dob: '1990-05-10', town: 'Francistown', area: 'CBD' }) };
  res = await V.onRequestPost(requestFor('POST', env, {
    cookie: 'tok_user',
    body: { venueId: 'rest_closed', visitorId: 'visitor-xyz', browser: { language: 'en' } }
  }));
  body = await jsonOf(res);
  check('signed-in tap accepted as user', res.status === 200 && body.personType === 'user');
  const userRow = db.state.venue_interest[0];
  check('server derives demographics', userRow.user_type === 'user' && userRow.gender === 'Male' &&
    userRow.age_band === '35-44' && userRow.town === 'Francistown' && userRow.area === 'CBD');
  check('user key is hashed', userRow.person_key.length === 64 && userRow.person_key !== 'user_1');
  check('no raw DOB or name stored',
    JSON.stringify(userRow).indexOf('1990-05-10') < 0 &&
    JSON.stringify(userRow).indexOf('user_1') < 0);

  /* ======================== GET / PATCH ======================== */
  console.log('\n-- GET / PATCH --');
  db = fakeD1();
  env = envFor(db, {
    tok_user: { userId: 'user_1', type: 'customer' },
    tok_admin: { userId: 'admin_1', type: 'customer', isAdmin: true }
  });
  db.state.venue_interest = rows.map(function (r) { return Object.assign({}, r); });
  res = await V.onRequestGet(requestFor('GET', env, {}));
  check('GET requires auth', res.status === 401);
  res = await V.onRequestGet(requestFor('GET', env, { cookie: 'tok_user' }));
  check('GET requires admin', res.status === 403);
  res = await V.onRequestGet(requestFor('GET', env, { cookie: 'tok_admin' }));
  body = await jsonOf(res);
  check('GET returns the aggregate', res.status === 200 && body.ok === true &&
    body.totals.taps === 4 && body.venues.length === 2);
  check('GET marks the participating venue',
    body.venues.find(function (v) { return v.venueId === 'rest_b'; }).participating === true);

  res = await V.onRequestPatch(requestFor('PATCH', env, { cookie: 'tok_user', body: { venueId: 'rest_closed', participating: true } }));
  check('PATCH requires admin', res.status === 403);
  res = await V.onRequestPatch(requestFor('PATCH', env, { cookie: 'tok_admin', body: { venueId: 'rest_closed', participating: true } }));
  body = await jsonOf(res);
  check('PATCH marks participating', res.status === 200 && body.ok === true && body.participating === true);
  check('PATCH writes the restaurant row',
    db.state.restaurants.find(function (r) { return r.id === 'rest_closed'; }).participating === 1);

  /* ======================== client flag sync ======================== */
  console.log('\n-- client flag sync --');
  const files = ['js/eatouts-db.js', 'js/eatouts-content.js'];
  let scripts = '';
  for (const rel of files) {
    scripts += '<script>' + fs.readFileSync(path.join(APP_DIR, rel), 'utf8') + '</script>';
  }
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', function (e) { errors.push('jsdomError: ' + (e.stack || e.message)); });
  vc.on('error', function () { errors.push('console.error: ' + Array.prototype.join.call(arguments, ' ')); });
  const dom = new JSDOM('<!doctype html><html><head><meta charset="utf-8"></head><body>' + scripts + '</body></html>', {
    url: 'http://localhost/index.html',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  await new Promise(function (resolve) { setTimeout(resolve, 50); });
  const DB = w.EatoutsDB;
  const C = w.EatoutsContent;
  check('content module booted', errors.length === 0 && !!DB && !!C, errors.slice(0, 2).join(' | '));
  if (DB && C) {
    const profile = C.profileFrom({ claimed: 1, participating: 1 });
    check('profileFrom carries participation flags', profile.claimed === true && profile.participating === true);
    const empty = { profile: null, menuCategories: [], menuItems: [], galleryGroups: [], galleryImages: [], promos: [], events: [] };

    const plain = DB.addRestaurant('Flag Sync');
    DB.save(DB.load());
    let applied = C.applyVenue({ id: plain.id, claimed: true, participating: true, status: 'claimed', content: empty });
    let stored = DB.getRestaurant(plain.id);
    check('empty-content venue still syncs flags',
      applied === false && stored.claimed === true && stored.participating === true && stored.status === 'claimed');

    const fork = DB.addRestaurant('Fork Sync');
    DB.forkContent(fork.id, DB.load());
    DB.save(DB.load());
    applied = C.applyVenue({ id: fork.id, claimed: true, participating: true, status: 'claimed', content: empty });
    stored = DB.getRestaurant(fork.id);
    check('operator fork still syncs flags before its early return',
      applied === false && stored.claimed === true && stored.participating === true && stored.status === 'claimed');
  }

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch(function (e) {
  console.error('FAIL suite crashed: ' + (e && e.stack || e));
  process.exit(1);
});
