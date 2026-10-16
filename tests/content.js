/* Client suite for js/eatouts-content.js (window.EatoutsContent).
   Loads the real EatoutsDB so hydrate() writes through the same
   resolveContent/forkContent path the app uses, then drives the
   D1-bundle -> v2-flat-content mapper and the conservative merge
   rules (never clobber a locally authored fork). */
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

const files = ['js/eatouts-db.js', 'js/eatouts-content.js'];
let scripts = '';
for (const rel of files) {
  const f = path.join(APP_DIR, rel.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { console.log('missing script: ' + rel); process.exit(1); }
  scripts += '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
}

const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + scripts + '</body></html>';

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
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

function venue(over) {
  const v = {
    id: 'rest_1', slug: 'the-yard', name: 'The Yard', status: 'published',
    town: 'Gaborone', district: 'SE', districtName: 'South East', area: 'CBD',
    landmark: 'Main Mall', description: 'A yard.', website: 'https://yard.bw',
    logoRef: 'logo.png', coverRef: 'cover.png', types: ['Restaurant'],
    category: 'Restaurant', contacts: [], socials: [],
    content: {
      profile: null,
      menuCategories: [{ id: 'cat_1', name: 'Grills', position: 0 }],
      menuItems: [{ id: 'it_1', categoryId: 'cat_1', name: 'Steak', description: 'Ribeye', price: 120, visible: true, position: 0 }],
      galleryGroups: [{ id: 'grp_1', title: 'Food', visible: true, position: 0 }],
      galleryImages: [{ id: 'img_1', groupId: 'grp_1', imageKey: 'a.jpg', label: 'A', visible: true, position: 0 }],
      promos: [{ id: 'pro_1', title: 'Live', details: 'x', active: true, startsAt: 1700000000000, endsAt: null }],
      events: [{ id: 'evt_1', title: 'Gig', description: 'd', startsAt: 1700000000000, endsAt: null, published: true, figure: { lineup: ['A'] } }]
    }
  };
  return Object.assign({}, v, over || {});
}

setTimeout(async () => {
  const DB = w.EatoutsDB;
  const C = w.EatoutsContent;

  check('jsdom booted without window errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  check('EatoutsDB exposed', !!DB);
  check('EatoutsContent exposed', !!C);
  if (!C || !DB) { console.log('CONTENT CLIENT TEST FAILED: module did not boot'); process.exit(1); }

  const expected = ['fetchVenue', 'contentFrom', 'profileFrom', 'promoFrom', 'eventFrom', 'applyVenue', 'hydrate', 'hydrateActive', 'available'];
  const missing = expected.filter(k => typeof C[k] !== 'function');
  check('every public method exists', missing.length === 0, missing.join(','));

  /* ======================== mappers ======================== */
  const server = C.contentFrom(venue());
  check('contentFrom maps profile identity', server.profile.name === 'The Yard' && server.profile.town === 'Gaborone');
  check('contentFrom maps menu categories to {id,name,order}', server.menuCategories[0].id === 'cat_1' && server.menuCategories[0].order === 0);
  check('contentFrom maps menu items', server.menuItems[0].name === 'Steak' && server.menuItems[0].categoryId === 'cat_1' && server.menuItems[0].price === 120);
  check('contentFrom maps gallery image cat from group title', server.galleryImages[0].cat === 'Food' && server.galleryImages[0].src === 'a.jpg');
  check('contentFrom maps promo (day + valid)', server.promos[0].day === 'Monday' && server.promos[0].title === 'Live');
  check('contentFrom maps event (day + title)', ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(server.events[0].day) >= 0 && server.events[0].title === 'Gig');
  check('contentFrom keeps figures', server.events[0].figure && server.events[0].figure.lineup[0] === 'A');
  check('emptyContent shape reused', Array.isArray(server.performers) && server.performances.length === 0);

  /* ======================== hydrate ======================== */
  console.log('\n-- hydrate --');
  const r = DB.addRestaurant('The Yard');
  DB.save(DB.load());
  check('seeded restaurant shares the template', DB.isSharing(r.id), r.id);

  mockFetch({ status: 200, body: { ok: true, venue: venue() } });
  let applied = await C.hydrate(r.id);
  check('hydrate applies server content', applied === true);
  check('fetch path is /api/venues/<id>', w.fetch.calls[0].url === '/api/venues/' + encodeURIComponent(r.id), w.fetch.calls[0].url);
  check('fetch includes credentials', w.fetch.calls[0].opts.credentials === 'include');

  let content = DB.resolveContent(r.id);
  check('menu written into ownContent', content.menuItems.length === 1 && content.menuItems[0].name === 'Steak');
  check('gallery written into ownContent', content.galleryImages.length === 1 && content.galleryImages[0].cat === 'Food');
  check('events written into ownContent', content.events.length === 1 && content.events[0].title === 'Gig');
  check('promos written into ownContent', content.promos.length === 1 && content.promos[0].title === 'Live');
  check('row marked server-owned', DB.getRestaurant(r.id).contentSource === 'd1');

  /* a later server update re-applies (still d1-owned) */
  const v2 = venue();
  v2.content.menuItems = [{ id: 'it_1', categoryId: 'cat_1', name: 'Steak', description: '', price: 150, visible: true, position: 0 }];
  mockFetch({ status: 200, body: { ok: true, venue: v2 } });
  applied = await C.hydrate(r.id);
  check('re-hydrate updates server-owned row', applied === true && DB.resolveContent(r.id).menuItems[0].price === 150);

  /* ======================== conservative skips ======================== */
  console.log('\n-- skips --');
  const local = DB.addRestaurant('Local Fork');
  DB.forkContent(local.id, DB.load());
  DB.save(DB.load());
  mockFetch({ status: 200, body: { ok: true, venue: venue({ id: local.id }) } });
  applied = await C.hydrate(local.id);
  check('locally authored fork is not clobbered', applied === false);

  const plain = DB.addRestaurant('Plain Place');
  DB.save(DB.load());
  const emptyVenue = venue({ id: plain.id, content: { profile: null, menuCategories: [], menuItems: [], galleryGroups: [], galleryImages: [], promos: [], events: [] } });
  mockFetch({ status: 200, body: { ok: true, venue: emptyVenue } });
  applied = await C.hydrate(plain.id);
  check('venue with no published content -> false', applied === false);
  check('plain place still shares template', DB.isSharing(plain.id));

  mockFetch({ status: 404, body: { ok: false, error: 'not_found' } });
  applied = await C.hydrate(plain.id);
  check('404 -> false', applied === false);

  w.fetch = undefined;
  applied = await C.hydrate(plain.id);
  check('no fetch -> false (offline safe)', applied === false);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
}, 50);
