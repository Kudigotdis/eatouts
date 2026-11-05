/* ============================================================
   /api/venue-interest

   POST  public  - record one checkout interest tap
   GET   admin   - aggregate interest per venue
   PATCH admin   - mark a venue participating / not participating

   Privacy: only a hashed person key and coarse browser metadata are stored.
   No names, phone numbers, emails, raw dates of birth, IP addresses or raw
   user agents are written to D1.
   ============================================================ */
import { json, readJson, getSession, now, uid, clientIp, rateLimit } from './_shared.js';
import { ageFromDob } from './_auth.js';
import { requireAdmin } from './_customer.js';

function cleanStr(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, max || 200);
}

function truthyFlag(value) {
  return value === true || value === 1 || value === '1';
}

function venueIsParticipating(row) {
  if (!row) return false;
  if (truthyFlag(row.participating)) return true;
  if (truthyFlag(row.claimed)) return true;
  return String(row.status || '').toLowerCase() === 'claimed';
}

export function bandForAge(age) {
  if (age == null || isNaN(age)) return '';
  if (age < 18) return 'Under 18';
  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

export function parseUa(raw) {
  var ua = String(raw || '');
  var browser = 'Other';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/.test(ua)) browser = 'Opera';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  var os = 'Other';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  var device = 'Desktop';
  if (/iPad|Tablet/.test(ua)) device = 'Tablet';
  else if (/Mobi|Android|iPhone|iPod/.test(ua)) device = 'Mobile';

  return { browser: browser, os: os, device: device };
}

function browserFrom(body, request) {
  var b = body && body.browser && typeof body.browser === 'object' ? body.browser : {};
  var ua = String(request.headers.get('User-Agent') || '');
  var parsed = parseUa(ua);
  var ratio = Number(b.pixelRatio);
  return {
    language: cleanStr(b.language, 40),
    timezone: cleanStr(b.timezone, 80),
    screen: cleanStr(b.screen, 24),
    pixelRatio: ratio > 0 && ratio <= 10 ? Math.round(ratio * 100) / 100 : 1,
    platform: cleanStr(b.platform, 60),
    mobile: typeof b.mobile === 'boolean' ? b.mobile : /Mobi|Android|iPhone|iPad/i.test(ua),
    touch: typeof b.touch === 'boolean' ? b.touch : false,
    referrer: cleanStr(b.referrer, 200),
    region: cleanStr(b.region, 8),
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device
  };
}

async function hashKey(scope, raw) {
  var data = new TextEncoder().encode(String(scope) + '|' + String(raw));
  var buf = await crypto.subtle.digest('SHA-256', data);
  return Array.prototype.map.call(new Uint8Array(buf), function (b) {
    return b.toString(16).padStart(2, '0');
  }).join('');
}

async function venueLookup(db, id, slug) {
  var slugKey = slug || id;
  var sql = 'SELECT id, slug, name, town, area, status, claimed, participating ' +
    'FROM restaurants WHERE id = ? OR lower(slug) = lower(?) LIMIT 1';
  try {
    return await db.prepare(sql).bind(id, slugKey).first();
  } catch (e) {
    /* A deployment can briefly run ahead of 0017; keep the tap working. */
    var fallback = 'SELECT id, slug, name, town, area, status, claimed, 0 AS participating ' +
      'FROM restaurants WHERE id = ? OR lower(slug) = lower(?) LIMIT 1';
    return await db.prepare(fallback).bind(id, slugKey).first();
  }
}

function increment(obj, key) {
  var k = key || 'Unknown';
  obj[k] = (obj[k] || 0) + 1;
}

function parseBrowser(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    var parsed = JSON.parse(String(raw));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}

function browserBuckets() {
  return {
    family: {},
    os: {},
    device: {},
    language: {},
    timezone: {},
    screen: {}
  };
}

export function aggregateInterest(rows, nowMs) {
  var list = Array.isArray(rows) ? rows : [];
  var current = nowMs || Date.now();
  var todayStart = new Date(current);
  todayStart.setHours(0, 0, 0, 0);
  var todayMs = todayStart.getTime();
  var weekMs = current - 7 * 24 * 60 * 60 * 1000;

  var venues = {};
  var globalPeople = {};
  var globalPersonTaps = {};
  var globalLatest = {};
  var totals = {
    people: 0,
    taps: 0,
    repeatPeople: 0,
    repeatTaps: 0,
    users: 0,
    browsers: 0,
    firstAt: null,
    lastAt: null,
    today: 0,
    last7: 0
  };

  list.forEach(function (r) {
    var at = Number(r.at) || 0;
    var vid = String(r.venue_id || 'unknown');
    var pk = String(r.person_key || 'unknown');
    var v = venues[vid];
    if (!v) {
      var status = r.current_status || r.venue_status || '';
      var claimed = truthyFlag(r.current_claimed) || String(status).toLowerCase() === 'claimed';
      v = venues[vid] = {
        venueId: vid,
        venueName: r.current_name || r.venue_name || vid,
        venueTown: r.venue_town || '',
        venueArea: r.venue_area || '',
        venueStatus: status,
        participating: venueIsParticipating({
          participating: r.current_participating,
          claimed: claimed,
          status: status
        }),
        claimed: claimed,
        people: {},
        personTaps: {},
        taps: 0,
        firstAt: null,
        lastAt: null,
        today: 0,
        last7: 0,
        users: 0,
        browsers: 0,
        gender: {},
        ageBands: {},
        towns: {},
        areas: {},
        browser: browserBuckets(),
        latest: {}
      };
    }

    v.taps++;
    v.personTaps[pk] = (v.personTaps[pk] || 0) + 1;
    v.people[pk] = true;
    if (!v.firstAt || at < v.firstAt) v.firstAt = at;
    if (!v.lastAt || at > v.lastAt) v.lastAt = at;
    if (at >= todayMs) v.today++;
    if (at >= weekMs) v.last7++;
    if (!v.latest[pk] || at > v.latest[pk].at) v.latest[pk] = { row: r, at: at };

    globalPeople[pk] = true;
    globalPersonTaps[pk] = (globalPersonTaps[pk] || 0) + 1;
    totals.taps++;
    if (!totals.firstAt || at < totals.firstAt) totals.firstAt = at;
    if (!totals.lastAt || at > totals.lastAt) totals.lastAt = at;
    if (at >= todayMs) totals.today++;
    if (at >= weekMs) totals.last7++;
    if (!globalLatest[pk] || at > globalLatest[pk].at) globalLatest[pk] = { row: r, at: at };
  });

  Object.keys(venues).forEach(function (key) {
    var v = venues[key];
    v.people = Object.keys(v.people).length;
    var repeatPeople = 0;
    Object.keys(v.personTaps).forEach(function (pk) {
      if (v.personTaps[pk] > 1) repeatPeople++;
    });
    v.repeatPeople = repeatPeople;
    v.repeatTaps = v.taps - v.people;

    Object.keys(v.latest).forEach(function (pk) {
      var row = v.latest[pk].row;
      if (String(row.user_type) === 'user') v.users++;
      else v.browsers++;
      increment(v.gender, row.gender || 'Unknown');
      increment(v.ageBands, row.age_band || 'Unknown');
      increment(v.towns, row.town || 'Unknown');
      increment(v.areas, row.area || 'Unknown');
      if (String(row.user_type) !== 'user') {
        var b = parseBrowser(row.browser_json);
        increment(v.browser.family, b.browser || 'Other');
        increment(v.browser.os, b.os || 'Other');
        increment(v.browser.device, b.device || 'Other');
        increment(v.browser.language, b.language || 'Unknown');
        increment(v.browser.timezone, b.timezone || 'Unknown');
        increment(v.browser.screen, b.screen || 'Unknown');
      }
    });

    delete v.personTaps;
    delete v.latest;
  });

  totals.people = Object.keys(globalPeople).length;
  Object.keys(globalPersonTaps).forEach(function (pk) {
    if (globalPersonTaps[pk] > 1) totals.repeatPeople++;
  });
  totals.repeatTaps = totals.taps - totals.people;

  Object.keys(globalLatest).forEach(function (pk) {
    if (String(globalLatest[pk].row.user_type) === 'user') totals.users++;
    else totals.browsers++;
  });

  var venueList = Object.keys(venues).map(function (key) {
    return venues[key];
  }).sort(function (a, b) {
    if (b.people !== a.people) return b.people - a.people;
    if (b.taps !== a.taps) return b.taps - a.taps;
    return String(a.venueName).localeCompare(String(b.venueName));
  });

  return { totals: totals, venues: venueList };
}

async function readInterestRows(db) {
  var sql = 'SELECT vi.id, vi.venue_id, vi.venue_name, vi.venue_town, vi.venue_area, ' +
    'vi.venue_status, vi.person_key, vi.user_type, vi.gender, vi.age_band, vi.town, ' +
    'vi.area, vi.browser_json, vi.at, r.name AS current_name, r.status AS current_status, ' +
    'r.claimed AS current_claimed, r.participating AS current_participating ' +
    'FROM venue_interest vi LEFT JOIN restaurants r ON r.id = vi.venue_id ' +
    'ORDER BY vi.at DESC';
  try {
    var res = await db.prepare(sql).all();
    return (res && res.results) || [];
  } catch (e) {
    var fallback = 'SELECT vi.id, vi.venue_id, vi.venue_name, vi.venue_town, vi.venue_area, ' +
      'vi.venue_status, vi.person_key, vi.user_type, vi.gender, vi.age_band, vi.town, ' +
      'vi.area, vi.browser_json, vi.at, r.name AS current_name, r.status AS current_status, ' +
      'r.claimed AS current_claimed, 0 AS current_participating ' +
      'FROM venue_interest vi LEFT JOIN restaurants r ON r.id = vi.venue_id ' +
      'ORDER BY vi.at DESC';
    var res2 = await db.prepare(fallback).all();
    return (res2 && res2.results) || [];
  }
}

export async function onRequestPost(context) {
  var env = context.env;
  var request = context.request;
  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'venue-interest:' + ip, 60, 3600);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  var body = await readJson(request);
  var venueId = cleanStr(body.venueId, 120);
  var venueSlug = cleanStr(body.venueSlug, 120);
  if (!venueId && !venueSlug) return json({ ok: false, error: 'venue_required' }, 400);

  var venue;
  try {
    venue = await venueLookup(env.DB, venueId, venueSlug);
  } catch (e) {
    return json({ ok: false, error: 'venue_lookup_failed' }, 500);
  }
  if (!venue) return json({ ok: false, error: 'venue_not_found' }, 404);
  if (venueIsParticipating(venue)) {
    return json({ ok: true, participating: true, logged: false });
  }

  var session = await getSession(env, request);
  var personKey = '';
  var userType = 'browser';
  var gender = '';
  var ageBand = '';
  var town = '';
  var area = '';

  if (session && session.userId) {
    userType = 'user';
    personKey = await hashKey('u', session.userId);
    try {
      var userRow = await env.DB.prepare('SELECT profile FROM users WHERE id = ?')
        .bind(session.userId).first();
      var profile = {};
      try {
        if (userRow && userRow.profile) {
          profile = typeof userRow.profile === 'string'
            ? JSON.parse(userRow.profile)
            : userRow.profile;
          if (!profile || typeof profile !== 'object') profile = {};
        }
      } catch (e) { profile = {}; }
      gender = cleanStr(profile.gender, 40);
      town = cleanStr(profile.town, 80);
      area = cleanStr(profile.area, 80);
      ageBand = bandForAge(ageFromDob(profile.dob));
    } catch (e) { /* demographics stay blank */ }
  } else {
    var visitorId = cleanStr(body.visitorId, 120);
    if (!visitorId) visitorId = 'anon_' + crypto.randomUUID();
    personKey = await hashKey('b', visitorId);
  }

  var browser = browserFrom(body, request);
  var ts = now();
  try {
    await env.DB.prepare(
      'INSERT INTO venue_interest (id, venue_id, venue_name, venue_town, venue_area, ' +
      'venue_status, person_key, user_type, gender, age_band, town, area, browser_json, at, source) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      uid('vi'), venue.id, venue.name || '', venue.town || '', venue.area || '',
      venue.status || '', personKey, userType, gender, ageBand, town, area,
      JSON.stringify(browser), ts, 'checkout'
    ).run();
  } catch (e) {
    return json({ ok: false, error: 'interest_save_failed' }, 500);
  }

  return json({
    ok: true,
    logged: true,
    personType: userType,
    participating: false,
    at: ts
  });
}

export async function onRequestGet(context) {
  var auth = await requireAdmin(context);
  if (auth.error) return auth.error;

  var rows;
  try {
    rows = await readInterestRows(auth.db);
  } catch (e) {
    return json({ ok: false, error: 'interest_read_failed' }, 500);
  }

  var data = aggregateInterest(rows);
  return json({
    ok: true,
    generatedAt: now(),
    totals: data.totals,
    venues: data.venues
  });
}

export async function onRequestPatch(context) {
  var auth = await requireAdmin(context);
  if (auth.error) return auth.error;

  var body = await readJson(context.request);
  var id = cleanStr(body.venueId, 120);
  if (!id) return json({ ok: false, error: 'venue_required' }, 400);
  var on = truthyFlag(body.participating);

  var venue;
  try {
    venue = await venueLookup(auth.db, id, id);
  } catch (e) {
    return json({ ok: false, error: 'venue_lookup_failed' }, 500);
  }
  if (!venue) return json({ ok: false, error: 'venue_not_found' }, 404);

  try {
    await auth.db.prepare('UPDATE restaurants SET participating = ?, updated_at = ? WHERE id = ?')
      .bind(on ? 1 : 0, now(), venue.id).run();
  } catch (e) {
    return json({ ok: false, error: 'venue_update_failed' }, 500);
  }

  return json({
    ok: true,
    venueId: venue.id,
    participating: on,
    claimed: truthyFlag(venue.claimed) || String(venue.status || '').toLowerCase() === 'claimed'
  });
}
