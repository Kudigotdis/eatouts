/* Business profiles & contacts & services & users API tests.
   Covers:
   * client bridge mappers (businessProfileToModel / businessProfileFromServer round-trip)
   * client bridge methods exist on window.EatoutsBusinessApi
   * D1 API functions would be tested separately via wrangler; here we verify
     the client-side contract is complete.
 */
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
const rel = 'js/eatouts-business-api.js';
const f = path.join(APP_DIR, rel.replace(/\//g, path.sep));
if (!fs.existsSync(f)) {
  console.log('missing script: ' + rel);
  process.exit(1);
}
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

setTimeout(() => {
  const api = w.EatoutsBusinessApi;
  check('EatoutsBusinessApi exists', !!api);

  /* ---------- mapper round-trip ---------- */
  const model = {
    name: 'Test Kitchen',
    description: 'A test restaurant',
    logo: '/logo.png',
    coverImage: '/cover.png',
    status: 'draft',
    types: ['Restaurant', 'Cafe'],
    category: 'Casual Dining',
    location: { town: 'Gaborone', area: 'CBD' },
    socials: { instagram: '@test', facebook: '' },
    operatingHours: { weekly: [], customSchedules: [] },
    character: [{ id: 'c1', name: 'Family-friendly', order: 1 }],
    amenities: [{ id: 'a1', name: 'WiFi', order: 1 }],
    menuTags: [{ id: 't1', name: 'Burgers', order: 1 }],
    capacity: [{ id: 'cap1', title: 'Seats', value: 50, description: '', order: 1 }],
    payments: ['Cash', 'Visa'],
    reservations: { enabled: true, whatsappContactId: null, callContactId: null, minimumGuests: 2, maximumGuests: 12, sameDay: true, advanceBooking: true, cancellationNotes: '' },
    setupFeePaid: 0,
    plan: 'starter'
  };

  const toServer = api.businessProfileToModel(model);
  check('toModel preserves name', toServer.name === 'Test Kitchen');
  check('toModel preserves types', Array.isArray(toServer.types) && toServer.types[0] === 'Restaurant');
  check('toModel preserves category', toServer.category === 'Casual Dining');
  check('toModel preserves location', toServer.location && toServer.location.town === 'Gaborone');
  check('toModel preserves socials', toServer.socials && toServer.socials.instagram === '@test');

  const serverRow = {
    id: 'biz_123',
    user_id: 'user_456',
    slug: 'test-kitchen',
    name: 'Test Kitchen',
    description: 'A test restaurant',
    logo: '/logo.png',
    cover_image: '/cover.png',
    status: 'draft',
    types_json: JSON.stringify(['Restaurant', 'Cafe']),
    category: 'Casual Dining',
    location_json: JSON.stringify({ town: 'Gaborone', area: 'CBD' }),
    socials_json: JSON.stringify({ instagram: '@test', facebook: '' }),
    operating_hours_json: JSON.stringify({ weekly: [], customSchedules: [] }),
    character_json: JSON.stringify([{ id: 'c1', name: 'Family-friendly', order: 1 }]),
    amenities_json: JSON.stringify([{ id: 'a1', name: 'WiFi', order: 1 }]),
    menu_tags_json: JSON.stringify([{ id: 't1', name: 'Burgers', order: 1 }]),
    capacity_json: JSON.stringify([{ id: 'cap1', title: 'Seats', value: 50, description: '', order: 1 }]),
    payments_json: JSON.stringify(['Cash', 'Visa']),
    reservations_json: JSON.stringify({ enabled: true, minimumGuests: 2, maximumGuests: 12 }),
    setup_fee_paid: 0,
    plan: 'starter',
    created_at: 1000,
    updated_at: 2000
  };

  const fromServer = api.businessProfileFromServer(serverRow);
  check('fromServer preserves id', fromServer.id === 'biz_123');
  check('fromServer preserves name', fromServer.name === 'Test Kitchen');
  check('fromServer preserves slug', fromServer.slug === 'test-kitchen');
  check('fromServer preserves types', Array.isArray(fromServer.types) && fromServer.types[0] === 'Restaurant');
  check('fromServer preserves location', fromServer.location && fromServer.location.town === 'Gaborone');

  /* ---------- bridge methods exist ---------- */
  const methods = [
    'businessProfilesGet', 'businessProfilesCreate', 'businessProfilesPatch', 'businessProfilesDelete',
    'businessContactsGet', 'businessContactsCreate', 'businessContactsPatch', 'businessContactsDelete',
    'businessServicesGet', 'businessServicesCreate', 'businessServicesPatch', 'businessServicesDelete',
    'businessUsersGet', 'businessUsersCreate', 'businessUsersPatch', 'businessUsersDelete',
    'businessProfileToModel', 'businessProfileFromServer'
  ];
  methods.forEach(function (m) {
    check('bridge method ' + m, typeof api[m] === 'function');
  });

  /* ---------- mock fetch integration ---------- */
  let lastUrl = null, lastOpts = null;
  w.fetch = function (url, opts) {
    lastUrl = String(url);
    lastOpts = opts || {};
    const body = lastOpts.body ? JSON.parse(String(lastOpts.body)) : null;
    if (lastUrl.indexOf('/api/business/profiles') >= 0 && lastOpts.method === 'POST') {
      return Promise.resolve({ status: 201, ok: true, json: () => Promise.resolve({ ok: true, business: { id: 'biz_new', businessId: 'biz_new', slug: 'new-biz', name: body.name, status: 'draft' } }) });
    }
    if (lastUrl.indexOf('/api/business/profiles?business_id=biz_123') >= 0) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, business: serverRow }) });
    }
    if (lastUrl.indexOf('/api/business/contacts?business_id=') >= 0) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, contacts: [] }) });
    }
    if (lastUrl.indexOf('/api/business/services?business_id=') >= 0) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, services: [] }) });
    }
    if (lastUrl.indexOf('/api/business/users?business_id=') >= 0) {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, users: [] }) });
    }
    return Promise.resolve({ status: 404, ok: false, json: () => Promise.resolve({ ok: false, error: 'not found' }) });
  };

  /* async integration test */
  (async () => {
    const create = await api.businessProfilesCreate({ userId: 'u1', name: 'New Biz', slug: 'new-biz', status: 'draft', types: [], category: null, location: {}, socials: {}, operatingHours: {}, character: [], amenities: [], menuTags: [], capacity: [], payments: [], reservations: {}, setupFeePaid: 0, plan: 'starter' });
    check('create profile via bridge returns ok', create.ok === true, JSON.stringify(create));
    check('create profile created business id', create.data && create.data.business && create.data.business.id === 'biz_new');

    const get = await api.businessProfilesGet('biz_123');
    check('get profile via bridge returns ok', get.ok === true);
    check('get profile has business', !!get.data && !!get.data.business);

    const contacts = await api.businessContactsGet('biz_123');
    check('get contacts via bridge returns ok', contacts.ok === true);

    const services = await api.businessServicesGet('biz_123');
    check('get services via bridge returns ok', services.ok === true);

    const users = await api.businessUsersGet('biz_123');
    check('get users via bridge returns ok', users.ok === true);

    console.log('');
    console.log(fails ? (fails + ' FAILED') : ('all ' + checks + ' business profile checks passed'));
    process.exit(fails ? 1 : 0);
  })().catch(function (e) {
    console.log('FAIL suite threw: ' + (e && e.stack || e));
    process.exit(1);
  });
}, 200);
