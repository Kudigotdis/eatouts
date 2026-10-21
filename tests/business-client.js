/* Client-side business API suite.
   Covers js/eatouts-business-api.js: the fetch wrapper contract, dual-mode
   (backend:false) fallback, resolve() id/slug/name/create paths, the claim
   call, and the local <-> server field mappers the operator pages use. */
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
const f = path.join(APP_DIR, rel.split('?')[0].replace(/\//g, path.sep));
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
  url: 'http://localhost/menu-onboarding.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const w = dom.window;

function mockFetch(handler) {
  const calls = [];
  w.fetch = function (url, opts) {
    const call = { url: String(url), opts: opts || {} };
    calls.push(call);
    const out = typeof handler === 'function' ? handler(call) : handler;
    const status = out && out.status != null ? out.status : 200;
    const body = out && out.body !== undefined ? out.body : {};
    const ok = status >= 200 && status < 300;
    return Promise.resolve({
      status: status,
      ok: ok,
      json: function () { return Promise.resolve(body); }
    });
  };
  w.fetch.calls = calls;
  return w.fetch;
}

setTimeout(async () => {
  const API = w.EatoutsBusinessApi;

  check('jsdom booted without window errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('EatoutsBusinessApi exposed', !!API);
  if (!API) { console.log('BUSINESS CLIENT TEST FAILED: module did not boot'); process.exit(1); }

  const expected = ['api', 'mine', 'resolve', 'create', 'claim', 'profileGet', 'profilePatch',
    'profileFromModel', 'staffList', 'staffAdd', 'staffUpdate', 'staffRemove', 'menuRead',
    'menuAddCategory', 'menuUpdateCategory', 'menuDeleteCategory', 'menuAddItem',
    'menuUpdateItem', 'menuDeleteItem', 'itemToServer', 'itemFromServer', 'categoryFromServer',
    'galleryRead', 'galleryAddGroup', 'galleryUpdateGroup', 'galleryDeleteGroup',
    'galleryAddImage', 'galleryUpdateImage', 'galleryDeleteImage',
    'groupToServer', 'groupFromServer', 'imageToServer', 'imageFromServer',
    'eventsRead', 'eventAdd', 'eventUpdate', 'eventDelete', 'eventToServer', 'eventFromServer',
    'promosRead', 'promoSubmit', 'promoToSubmission'];
  const missing = expected.filter(k => typeof API[k] !== 'function');
  check('every public method exists', missing.length === 0, missing.join(','));

  /* ======================== fetch wrapper ======================== */
  console.log('\n-- api() wrapper --');
  mockFetch({ status: 200, body: { hello: 1 } });
  let r = await API.api('/business/mine');
  check('GET prefixes /api and reports status/ok/data/backend',
    r.status === 200 && r.ok === true && r.backend === true && r.data.hello === 1, JSON.stringify(r));
  check('request path is /api/business/mine', w.fetch.calls[0].url === '/api/business/mine', w.fetch.calls[0].url);
  check('credentials include so the session cookie rides along', w.fetch.calls[0].opts.credentials === 'include');

  mockFetch({ status: 201, body: { ok: true } });
  r = await API.api('/business/mine', { method: 'POST', body: { name: 'B' } });
  check('POST returns 201 ok', r.status === 201 && r.ok === true);
  const postCall = w.fetch.calls[0];
  check('object body serialises to JSON', typeof postCall.opts.body === 'string' && postCall.opts.body === '{"name":"B"}', String(postCall.opts.body));
  check('JSON content-type set automatically',
    postCall.opts.headers['content-type'] === 'application/json', JSON.stringify(postCall.opts.headers));

  mockFetch({ status: 404, body: { error: 'no_restaurant' } });
  r = await API.api('/business/claim', { method: 'POST', body: { refId: 'rest_x' } });
  check('non-2xx surfaces ok:false + data.error', r.ok === false && r.status === 404 && r.data.error === 'no_restaurant');

  mockFetch(() => { throw new Error('network down'); });
  r = await API.api('/business/mine');
  check('network failure resolves {ok:false, backend:false} instead of throwing',
    r.ok === false && r.backend === false && r.status === 0, JSON.stringify(r));

  const realFetch = w.fetch;
  delete w.fetch;
  r = await API.api('/business/mine');
  check('no fetch available -> backend:false (localStorage fallback mode)',
    r.backend === false && r.ok === false);
  w.fetch = realFetch;

  /* ======================== mine() ======================== */
  console.log('\n-- mine() --');
  const mineList = [
    { id: 'rest_the-yellow-giraffe', slug: 'the-yellow-giraffe', name: 'The Yellow Giraffe', role: 'owner' },
    { id: 'rest_khutomas-grill', slug: 'khutomas-grill', name: 'Khutoma\u2019s Grill', role: 'manager' }
  ];
  mockFetch({ status: 200, body: { businesses: mineList } });
  let m = await API.mine();
  check('mine ok populates state.restaurants', m.ok && API.state.restaurants.length === 2);
  check('mine sets backend:true + loaded', API.state.backend === true && API.state.loaded === true);
  check('mine keeps role + membership shape', API.state.restaurants[0].role === 'owner');

  mockFetch({ status: 503, body: { error: 'backend_not_configured' } });
  m = await API.mine();
  check('mine 5xx does not clobber the cached list', m.ok === false && API.state.restaurants.length === 2);

  /* ======================== resolve() ======================== */
  console.log('\n-- resolve() --');
  mockFetch({ status: 200, body: { businesses: mineList } });
  let res = await API.resolve({ serverRestaurantId: 'rest_cached' }, { create: false });
  check('resolve short-circuits on a cached rid (no network)', res.rid === 'rest_cached' && res.backend === true);
  check('cached resolve made no fetch call', w.fetch.calls.length === 0, String(w.fetch.calls.length));

  res = await API.resolve({ restaurantId: 'rest_khutomas-grill' }, { create: false });
  check('resolve matches D1 id directly', res.rid === 'rest_khutomas-grill', String(res.rid));

  res = await API.resolve({ id: 'local-biz-42', slug: 'the-yellow-giraffe' }, { create: false });
  check('resolve matches by slug', res.rid === 'rest_the-yellow-giraffe', String(res.rid));

  res = await API.resolve({ id: 'local-biz-42', name: 'Khutoma\u2019s Grill' }, { create: false });
  check('resolve matches by unique name', res.rid === 'rest_khutomas-grill', String(res.rid));

  res = await API.resolve({ id: 'local-biz-42', name: 'Totally Unknown Place' }, { create: false });
  check('no match + create:false -> rid null', res.rid === null && res.created === false);

  const createdFetch = function (url, opts) {
    const urlStr = String(url);
    const method = (opts && opts.method) || 'GET';
    createdFetch.calls.push({ url: urlStr, opts: opts || {} });
    if (urlStr === '/api/business/mine' && method === 'GET') {
      return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ businesses: mineList }) });
    }
    if (urlStr === '/api/business/mine' && method === 'POST') {
      return Promise.resolve({ status: 201, ok: true, json: () => Promise.resolve({ ok: true, business: { id: 'rest_new_one' } }) });
    }
    return Promise.resolve({ status: 404, ok: false, json: () => Promise.resolve({}) });
  };
  createdFetch.calls = [];
  w.fetch = createdFetch;
  res = await API.resolve({ id: 'local-biz-99', name: 'Brand New Joint' }, { create: true });
  check('no match + create:true -> POST /business/mine and returns the new rid',
    res.rid === 'rest_new_one' && res.created === true, JSON.stringify(res));
  check('create posts a name payload',
    createdFetch.calls.some(c => c.opts.method === 'POST' && c.opts.body === '{"name":"Brand New Joint"}'),
    JSON.stringify(createdFetch.calls.map(c => c.url + ' ' + (c.opts.method || 'GET'))));

  /* ======================== claim() ======================== */
  console.log('\n-- claim() --');
  w.fetch = function (url, opts) {
    w.fetch.calls.push({ url: String(url), opts: opts || {} });
    return Promise.resolve({
      status: 201, ok: true,
      json: () => Promise.resolve({ ok: true, claim: { id: 'clm_1', status: 'approved' }, restaurantId: 'rest_the-yellow-giraffe', membership: { id: 'mem_1', role: 'owner' } })
    });
  };
  w.fetch.calls = [];
  r = await API.claim('rest_the-yellow-giraffe');
  check('claim posts to /api/business/claim', w.fetch.calls[0].url === '/api/business/claim', w.fetch.calls[0].url);
  check('claim sends refId in a JSON body', w.fetch.calls[0].opts.body === '{"refId":"rest_the-yellow-giraffe"}', String(w.fetch.calls[0].opts.body));
  check('claim returns the membership bridge payload',
    r.ok && r.data.membership.role === 'owner' && r.data.restaurantId === 'rest_the-yellow-giraffe');

  /* ======================== profile ======================== */
  console.log('\n-- profile + profileFromModel --');
  w.fetch = function (url, opts) { w.fetch.calls.push({ url: String(url), opts: opts || {} }); return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true, business: {} }) }); };
  w.fetch.calls = [];
  await API.profilePatch('rest_x', { name: 'Zed' });
  check('profilePatch hits /business/profile?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/profile?restaurant=rest_x', w.fetch.calls[0].url);
  check('profilePatch uses PATCH', w.fetch.calls[0].opts.method === 'PATCH');

  const model = {
    identity: { name: 'Bistro Zero', description: 'nice food' },
    location: { town: 'Gaborone', district: 'Gaborone', districtName: 'Gaborone', area: 'Broadhurst', landmark: 'near the mall' },
    type: 'restaurant',
    contacts: [{ title: 'WhatsApp', cc: '+267', number: '71111111', whatsapp: true }, { title: 'Empty', number: '' }],
    socialsFields: { facebook: 'https://fb.com/bz', instagram: '' },
    hours: { open: '08:00', close: '22:00', days: ['Mon', 'Tue'], notes: '' },
    amenities: ['wifi', 'parking'],
    menuTags: { cuisine: ['brazilian'], meals: ['lunch'], dietary: ['halal'] }
  };
  const pf = API.profileFromModel(model);
  check('profileFromModel maps identity/location', pf.name === 'Bistro Zero' && pf.town === 'Gaborone' && pf.area === 'Broadhurst');
  check('profileFromModel sets category from type', pf.category === 'restaurant');
  check('profileFromModel maps contacts with cc + skips blanks',
    pf.contacts.length === 1 && pf.contacts[0].value === '+26771111111' && pf.contacts[0].whatsapp === true, JSON.stringify(pf.contacts));
  check('profileFromModel maps socials and drops empty urls',
    pf.socials.length === 1 && pf.socials[0].platform === 'facebook', JSON.stringify(pf.socials));
  check('profileFromModel maps hours', pf.hours.open === '08:00' && pf.hours.days.length === 2);
  check('profileFromModel maps amenities -> features', JSON.stringify(pf.features) === '["wifi","parking"]');
  check('profileFromModel maps menuTags -> types', JSON.stringify(pf.types) === '["brazilian","lunch","halal"]', JSON.stringify(pf.types));
  check('profileFromModel omits absent fields', pf.website === undefined && pf.priceRange === undefined);

  const sparse = API.profileFromModel({ identity: { name: 'Only Name' } });
  check('sparse model only sends defined values',
    sparse.name === 'Only Name' && sparse.town === undefined && sparse.contacts === undefined,
    JSON.stringify(sparse));

  /* ======================== staff ======================== */
  console.log('\n-- staff endpoints --');
  w.fetch.calls = [];
  await API.staffList('rest_x');
  check('staffList GET /business/staff?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/staff?restaurant=rest_x', w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.staffAdd('rest_x', { email: 'a@b.co', role: 'manager' });
  check('staffAdd POST with email/role payload',
    w.fetch.calls[0].opts.method === 'POST' && w.fetch.calls[0].opts.body === '{"email":"a@b.co","role":"manager"}',
    String(w.fetch.calls[0].opts.body));
  w.fetch.calls = [];
  await API.staffUpdate('rest_x', 'mem_9', { role: 'menu_manager' });
  check('staffUpdate PATCH /business/staff/mem_9',
    w.fetch.calls[0].url === '/api/business/staff/mem_9?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'PATCH',
    w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.staffRemove('rest_x', 'mem_9');
  check('staffRemove DELETE /business/staff/mem_9',
    w.fetch.calls[0].url === '/api/business/staff/mem_9?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'DELETE',
    w.fetch.calls[0].url);

  /* ======================== menu ======================== */
  console.log('\n-- menu endpoints --');
  w.fetch.calls = [];
  await API.menuRead('rest_x');
  check('menuRead GET /business/menu?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/menu?restaurant=rest_x', w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.menuAddItem('rest_x', { name: 'Pap & Beef', price: 45 });
  check('menuAddItem POST /business/menu/items',
    w.fetch.calls[0].url === '/api/business/menu/items?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'POST');
  w.fetch.calls = [];
  await API.menuUpdateCategory('rest_x', 'cat_7', { name: 'Grill', position: 2 });
  check('menuUpdateCategory PATCH /business/menu/categories/cat_7',
    w.fetch.calls[0].url === '/api/business/menu/categories/cat_7?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'PATCH');
  w.fetch.calls = [];
  await API.menuDeleteItem('rest_x', 'item_3');
  check('menuDeleteItem DELETE /business/menu/items/item_3',
    w.fetch.calls[0].url === '/api/business/menu/items/item_3?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'DELETE');

  /* ======================== mappers ======================== */
  console.log('\n-- local <-> server mappers --');
  const localItem = {
    id: 'item_1', categoryId: 'cat_1', order: 4, name: 'Peri Peri Chicken',
    type: 'main', description: 'hot', image: 'assets/img/x.jpg',
    basePrice: 78, preparationMinutes: 20, status: 'available',
    tags: ['Popular'], variants: [], modifierGroups: []
  };
  let s = API.itemToServer(localItem, 'cat_1');
  check('itemToServer maps price/category/order', s.price === 78 && s.categoryId === 'cat_1' && s.position === 4);
  check('itemToServer: available -> visible true', s.visible === true);
  s = API.itemToServer({ name: 'X', basePrice: 10, status: 'hidden' }, null);
  check('itemToServer: hidden -> visible false', s.visible === false);
  s = API.itemToServer({ name: 'X', basePrice: 10, status: 'sold-out' }, 'cat_2');
  check('itemToServer: sold-out still visible (it is on the menu)',
    s.visible === true && s.categoryId === 'cat_2');

  const back = API.itemFromServer({
    id: 'srv_1', restaurantId: 'rest_x', categoryId: 'cat_1',
    name: 'Pap', description: null, price: 30, currency: 'BWP',
    imageKey: 'menu/pap.png', visible: false, position: 9
  });
  check('itemFromServer maps price/position/category', back.basePrice === 30 && back.order === 9 && back.categoryId === 'cat_1');
  check('itemFromServer: visible false -> status hidden', back.status === 'hidden');
  check('itemFromServer: imageKey -> image', back.image === 'menu/pap.png');
  check('itemFromServer: server id kept as serverId', back.serverId === 'srv_1');

  const visibleBack = API.itemFromServer({ id: 'srv_2', name: 'Soup', price: 25, visible: true, position: 1 });
  check('itemFromServer: visible true -> status available', visibleBack.status === 'available');

  const cat = API.categoryFromServer({ id: 'mcat_1', name: 'Starters', position: 3 });
  check('categoryFromServer maps id/name/order', cat.id === 'mcat_1' && cat.name === 'Starters' && cat.order === 3 && cat.visible === true);

  /* round trip: local -> server -> local keeps the money and visibility */
  const rt = API.itemFromServer(Object.assign({ id: 'item_1' }, API.itemToServer(localItem, 'cat_1')));
  check('round trip preserves price', rt.basePrice === 78, String(rt.basePrice));
  check('round trip preserves visible state', rt.status === 'available', rt.status);
  const rtHidden = API.itemFromServer(Object.assign({ id: 'item_9' }, API.itemToServer({ name: 'Y', basePrice: 5, status: 'hidden' }, 'cat_1')));
  check('round trip keeps hidden hidden', rtHidden.status === 'hidden', rtHidden.status);

  /* ======================== gallery ======================== */
  console.log('\n-- gallery endpoints --');
  w.fetch = function (url, opts) { w.fetch.calls.push({ url: String(url), opts: opts || {} }); return Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true }) }); };
  w.fetch.calls = [];
  await API.galleryRead('rest_x');
  check('galleryRead GET /business/gallery?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/gallery?restaurant=rest_x', w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.galleryAddGroup('rest_x', { title: 'Food' });
  check('galleryAddGroup POST /business/gallery/groups',
    w.fetch.calls[0].url === '/api/business/gallery/groups?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'POST');
  w.fetch.calls = [];
  await API.galleryUpdateGroup('rest_x', 'gg_1', { title: 'Feasts' });
  check('galleryUpdateGroup PATCH /business/gallery/groups/gg_1',
    w.fetch.calls[0].url === '/api/business/gallery/groups/gg_1?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'PATCH');
  w.fetch.calls = [];
  await API.galleryDeleteGroup('rest_x', 'gg_1');
  check('galleryDeleteGroup DELETE /business/gallery/groups/gg_1',
    w.fetch.calls[0].url === '/api/business/gallery/groups/gg_1?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'DELETE');
  w.fetch.calls = [];
  await API.galleryAddImage('rest_x', { groupId: 'gg_1', imageKey: 'a.jpg' });
  check('galleryAddImage POST /business/gallery/images',
    w.fetch.calls[0].url === '/api/business/gallery/images?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'POST');
  w.fetch.calls = [];
  await API.galleryUpdateImage('rest_x', 'img_2', { label: 'Big' });
  check('galleryUpdateImage PATCH /business/gallery/images/img_2',
    w.fetch.calls[0].url === '/api/business/gallery/images/img_2?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'PATCH');
  w.fetch.calls = [];
  await API.galleryDeleteImage('rest_x', 'img_2');
  check('galleryDeleteImage DELETE /business/gallery/images/img_2',
    w.fetch.calls[0].url === '/api/business/gallery/images/img_2?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'DELETE');

  console.log('\n-- gallery mappers --');
  const gSrv = API.groupToServer({ title: 'Food', order: 2, visible: true });
  check('groupToServer maps title/order/visible', gSrv.title === 'Food' && gSrv.position === 2 && gSrv.visible === true, JSON.stringify(gSrv));
  check('groupToServer defaults visible true', API.groupToServer({ title: 'X' }).visible === true);
  const gBack = API.groupFromServer({ id: 'gg_1', title: 'Food', position: 2, visible: 0 });
  check('groupFromServer maps id/order/visible', gBack.id === 'gg_1' && gBack.order === 2 && gBack.visible === false);
  check('groupFromServer seeds empty images', Array.isArray(gBack.images) && gBack.images.length === 0);

  const iSrv = API.imageToServer({ src: 'a.jpg', label: 'Plate', order: 3, visible: true }, 'gg_1');
  check('imageToServer maps src->imageKey + groupId + position',
    iSrv.imageKey === 'a.jpg' && iSrv.groupId === 'gg_1' && iSrv.position === 3 && iSrv.visible === true, JSON.stringify(iSrv));
  const iBack = API.imageFromServer({ id: 'img_1', groupId: 'gg_1', imageKey: 'a.jpg', label: 'Plate', position: 3, visible: false });
  check('imageFromServer maps imageKey->src + order',
    iBack.src === 'a.jpg' && iBack.order === 3 && iBack.visible === false && iBack.groupId === 'gg_1', JSON.stringify(iBack));

  /* ======================== events ======================== */
  console.log('\n-- events endpoints --');
  w.fetch.calls = [];
  await API.eventsRead('rest_x');
  check('eventsRead GET /business/events?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/events?restaurant=rest_x', w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.eventAdd('rest_x', { title: 'Gig' });
  check('eventAdd POST /business/events',
    w.fetch.calls[0].url === '/api/business/events?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'POST');
  w.fetch.calls = [];
  await API.eventUpdate('rest_x', 'evt_1', { title: 'Gig 2' });
  check('eventUpdate PATCH /business/events/evt_1',
    w.fetch.calls[0].url === '/api/business/events/evt_1?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'PATCH');
  w.fetch.calls = [];
  await API.eventDelete('rest_x', 'evt_1');
  check('eventDelete DELETE /business/events/evt_1',
    w.fetch.calls[0].url === '/api/business/events/evt_1?restaurant=rest_x' && w.fetch.calls[0].opts.method === 'DELETE');

  console.log('\n-- event mappers --');
  const localEvent = {
    id: 'event_1', name: 'Afro Night', type: 'DJ Night', coverImage: 'cover.jpg',
    description: 'All night', organizer: 'Yard', sponsor: 'ACME',
    location: { city: 'Gaborone', area: 'CBD' },
    startDate: '2026-03-01', startTime: '20:00', endDate: '2026-03-02', endTime: '02:00',
    recurring: true, recurrence: ['Friday'], expectedGuests: 200, maxCapacity: 250,
    admission: 'Paid', ticketPrice: 100, bookingContactId: 'c1',
    performances: [{ id: 'p1', performerId: 'perf1' }], serviceIds: ['s1'],
    rsvpEnabled: true, rsvpContactId: 'c2', rsvpMax: 10,
    status: 'published', createdAt: 1
  };
  const evSrv = API.eventToServer(localEvent);
  check('eventToServer maps name->title, imageKey, admission',
    evSrv.title === 'Afro Night' && evSrv.imageKey === 'cover.jpg' && evSrv.admission === 'Paid', JSON.stringify(evSrv));
  check('eventToServer publishes only when status published', evSrv.published === true);
  check('eventToServer sets epoch startsAt/endsAt', typeof evSrv.startsAt === 'number' && evSrv.endsAt > evSrv.startsAt, JSON.stringify([evSrv.startsAt, evSrv.endsAt]));
  check('eventToServer packs extras into figure',
    evSrv.figure.type === 'DJ Night' && evSrv.figure.organizer === 'Yard' && evSrv.figure.performance === undefined &&
    evSrv.figure.performances.length === 1 && evSrv.figure.serviceIds[0] === 's1', JSON.stringify(evSrv.figure));

  const evBack = API.eventFromServer({
    id: 'evt_1', title: 'Afro Night', description: 'All night', imageKey: 'cover.jpg',
    admission: 'Paid', startsAt: evSrv.startsAt, endsAt: evSrv.endsAt, published: true,
    figure: evSrv.figure, created_at: 5
  });
  check('eventFromServer maps title->name + status', evBack.name === 'Afro Night' && evBack.status === 'published');
  check('eventFromServer restores date/time', evBack.startDate === '2026-03-01' && evBack.startTime === '20:00', evBack.startDate + ' ' + evBack.startTime);
  check('eventFromServer restores figure extras',
    evBack.type === 'DJ Night' && evBack.maxCapacity === 250 && evBack.rsvpEnabled === true, JSON.stringify(evBack.type));
  check('eventFromServer unpublish -> draft', API.eventFromServer({ id: 'e', title: 'T', published: false }).status === 'draft');

  /* round trip: local -> server -> local keeps the name + date + admission */
  const evRt = API.eventFromServer(Object.assign({ id: 'event_1' }, API.eventToServer(localEvent)));
  check('event round trip preserves name', evRt.name === 'Afro Night', evRt.name);
  check('event round trip preserves start date/time', evRt.startDate === '2026-03-01' && evRt.startTime === '20:00', evRt.startDate);
  check('event round trip preserves admission + ticket', evRt.admission === 'Paid' && evRt.ticketPrice === 100);

  /* ======================== promos (moderation queue) ======================== */
  console.log('\n-- promo endpoints --');
  w.fetch.calls = [];
  await API.promosRead('rest_x');
  check('promosRead GET /api/business/promos?restaurant=rest_x',
    w.fetch.calls[0].url === '/api/business/promos?restaurant=rest_x', w.fetch.calls[0].url);
  w.fetch.calls = [];
  await API.promoSubmit('rest_x', { title: 'Special', eventRef: 'promo_1' });
  check('promoSubmit POST /customer/promo-submissions',
    w.fetch.calls[0].url === '/api/customer/promo-submissions' && w.fetch.calls[0].opts.method === 'POST');
  check('promoSubmit injects restaurantId into the body',
    /"restaurantId":"rest_x"/.test(w.fetch.calls[0].opts.body), w.fetch.calls[0].opts.body);

  console.log('\n-- promo mapper --');
  const localPromo = {
    id: 'promo_1', title: 'Weekend Special', image: 'promo.jpg', description: 'Two for one',
    location: { city: 'Gaborone', area: 'CBD' },
    startDate: '2026-04-01', startTime: '18:00', endDate: '2026-04-30', endTime: '22:00',
    status: 'active'
  };
  const sub = API.promoToSubmission(localPromo, { identity: { name: 'The Yard' } });
  check('promoToSubmission keeps promo id as eventRef', sub.eventRef === 'promo_1', JSON.stringify(sub));
  check('promoToSubmission maps title/venue/summary/image',
    sub.title === 'Weekend Special' && sub.venueName === 'The Yard' && sub.summary === 'Two for one' && sub.imageRef === 'promo.jpg',
    JSON.stringify(sub));
  check('promoToSubmission builds a when string', /2026-04-01/.test(sub.whenText) && /2026-04-30/.test(sub.whenText), sub.whenText);
  check('promoToSubmission sets the P50 fee', sub.fee === 50 && sub.currency === 'BWP');
  check('promoToSubmission embeds the full promo payload', sub.payload && sub.payload.id === 'promo_1');

  check('no window errors during the run', errors.length === 0, errors.slice(0, 3).join(' | '));

  console.log('');
  console.log(checks - fails + '/' + checks + ' checks passed');
  if (fails) { console.log('BUSINESS CLIENT TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('BUSINESS CLIENT TEST PASSED');
}, 300);
