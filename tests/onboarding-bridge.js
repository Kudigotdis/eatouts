/* Onboarding bridge tests.
   Covers:
   * js/eatouts-onboarding-bridge.js exposes EOPlaces / EOHosting / EOPublish / EOOnboard
   * EOPlaces indexes towns (botswana_locations.js) and malls
     (assets/data/botswana_shopping_malls_and_shopping_centres.js) and suggests
   * EOHosting reads assets/data/event_types.js and normalises capacity rows
   * EOPublish builds the eatouts.venue.v1 submission and the customer-directory
     row, and pushes the row into the local directory (eatouts_db_v2)
   * the six business onboarding forms load the bridge and the datasets
   * business-onboarding1.html is gone and nothing links to it
   * assets/data/business_types.js maps every business type to its own form
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

const read = (rel) => fs.readFileSync(path.join(APP_DIR, rel.split('?')[0].replace(/\//g, path.sep)), 'utf8');
const has = (rel) => fs.existsSync(path.join(APP_DIR, rel.split('?')[0].replace(/\//g, path.sep)));

/* ------------------------------------------------------------------ */
/* 1. static checks (no DOM needed)                                    */
/* ------------------------------------------------------------------ */

const RETIRED = 'business-onboarding1.html';
check('business-onboarding1.html is deleted', !has(RETIRED));

const linkScan = [];
function walk(dir, out) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
  entries.forEach((e) => {
    if (['node_modules', '.git', 'dist', 'staging', 'tests', 'reference', '_trash',
      'Onboarding Designs', 'SORT_REDESIGNS_ARCHIVED_20261017'].includes(e.name)) return;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { walk(full, out); return; }
    /* Code only — the docs mention the retired page on purpose. */
    if (/\.(html|js|mjs|py)$/i.test(e.name)) out.push(full);
  });
}
walk(APP_DIR, linkScan);
const offenders = linkScan.filter((f) => read(path.relative(APP_DIR, f)).indexOf('business-onboarding1.html') >= 0);
check('no code file links to business-onboarding1.html', offenders.length === 0,
  offenders.map((f) => path.relative(APP_DIR, f)).join(', '));

const BUSINESS_PAGES = [
  'restaurant-onboarding.html',
  'mobile-kitchen-onboarding.html',
  'bottle-store-onboarding.html',
  'bakery-onboarding.html',
  'supplier-onboarding.html'
];
const DATA_SCRIPTS = [
  'botswana_locations.js',
  'js/eatouts-locations.js',
  'assets/data/botswana_shopping_malls_and_shopping_centres.js',
  'assets/data/event_types.js',
  'js/eatouts-pricing-source.js',
  'js/eatouts-onboarding-bridge.js'
];
BUSINESS_PAGES.forEach((p) => {
  check(p + ' exists', has(p));
  const src = read(p);
  DATA_SCRIPTS.forEach((s) => {
    check(p + ' loads ' + s, src.indexOf(s) >= 0);
  });
  check(p + ' registers with the bridge', /EOOnboard\.register\s*\(/.test(src));
  check(p + ' exposes EOOnboardPage', src.indexOf('EOOnboardPage') >= 0);
  check(p + ' has a hosting section', /hosting/i.test(src));
});

/* The caterer form is its own self-contained page (brand + branches), so it
   does not run the shared onboarding bridge. */
const CATERER_PAGE = 'caterer-onboarding.html';
check(CATERER_PAGE + ' exists', has(CATERER_PAGE));
const catererSrc = read(CATERER_PAGE);
check(CATERER_PAGE + ' has a PAGE marker', /<!-- PAGE: Caterer setup -->/.test(catererSrc));
check(CATERER_PAGE + ' declares its page id', /<body data-page="caterer-onboarding">/.test(catererSrc));
check(CATERER_PAGE + ' manages branches', /branch/i.test(catererSrc));
check(CATERER_PAGE + ' can publish the profile', /publish/i.test(catererSrc));

/* business type -> onboarding page */
const btSrc = read('assets/data/business_types.js');
check('business_types.js exposes onboardingPage', /onboardingPage\s*[:=]/.test(btSrc));
const EXPECTED = {
  restaurant: 'restaurant-onboarding.html',
  caterer: 'caterer-onboarding.html',
  bakery: 'bakery-onboarding.html',
  liquor_store: 'bottle-store-onboarding.html',
  food_truck: 'mobile-kitchen-onboarding.html',
  event_supplier: 'supplier-onboarding.html'
};
Object.keys(EXPECTED).forEach((k) => {
  check('business_types.js maps ' + k + ' -> ' + EXPECTED[k], btSrc.indexOf(EXPECTED[k]) >= 0);
});
check('business_types.js has no reservationServices module key', btSrc.indexOf('reservationServices') < 0);
check('business_types.js has a hostingServices module key', btSrc.indexOf('hostingServices') >= 0);

/* the signup popup routes each type */
const signupSrc = read('eatouts-business-signup.html');
Object.keys(EXPECTED).forEach((k) => {
  check('eatouts-business-signup.html routes ' + k, signupSrc.indexOf(EXPECTED[k]) >= 0);
});
check('signup popup still uses #typePopupCta', signupSrc.indexOf('typePopupCta') >= 0);
check('signup popup still uses .popup-scrim', signupSrc.indexOf('popup-scrim') >= 0);

/* the customer account page */
const CUSTOMER_PAGE = 'eatouts-customer-signup.html';
check(CUSTOMER_PAGE + ' exists', has(CUSTOMER_PAGE));
check('the customer page is the one every sign-up link points at',
  read('index.html').indexOf('"' + CUSTOMER_PAGE + '"') >= 0 &&
  read('eatouts-login.html').indexOf(CUSTOMER_PAGE) >= 0);
const userOnboard = read(CUSTOMER_PAGE);
check('customer page has the 10+ gate',
  /const MIN_AGE = 10/.test(userOnboard) && /years < MIN_AGE/.test(userOnboard) &&
  /or older/.test(userOnboard));
check('customer page creates the account through EatoutsCustomer.signup', /EatoutsCustomer[\s\S]{0,200}\.signup\(|ecustomer\.signup\(/.test(userOnboard));
check('customer page verifies through EatoutsCustomer.verify', /ecustomer\.verify\(/.test(userOnboard));
const customerApi = read('js/eatouts-customer.js');
check('the customer API posts to /auth/signup', customerApi.indexOf("'/auth/signup'") >= 0);
check('the customer API posts to /auth/verify', customerApi.indexOf("'/auth/verify'") >= 0);
check('customer page uses the live town/area lookup', userOnboard.indexOf('eatouts-locations.js') >= 0);
check('customer page keeps a device draft', /DRAFT_KEY\s*=\s*'eatouts\.customer-signup\./.test(userOnboard));

/* ------------------------------------------------------------------ */
/* 2. DOM checks (the bridge, with the real datasets)                   */
/* ------------------------------------------------------------------ */

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const scripts = [
  'botswana_locations.js',
  'js/eatouts-locations.js',
  'assets/data/botswana_shopping_malls_and_shopping_centres.js',
  'assets/data/event_types.js',
  'js/eatouts-pricing-source.js',
  'js/eatouts-db.js',
  'js/eatouts-onboarding-bridge.js'
].map((s) => '<script>' + read(s) + '</script>').join('\n');

const html = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + scripts +
  '<div class="footer-actions"><button class="btn" data-action="save">Save draft</button></div></body></html>';

const dom = new JSDOM(html, {
  url: 'http://localhost/restaurant-onboarding.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const w = dom.window;

setTimeout(() => {
  const places = w.EOPlaces;
  const hosting = w.EOHosting;
  const publish = w.EOPublish;
  const onboard = w.EOOnboard;

  check('EOPlaces exists', !!places);
  check('EOHosting exists', !!hosting);
  check('EOPublish exists', !!publish);
  check('EOOnboard exists', !!onboard);

  if (places) {
    const towns = places.towns();
    check('EOPlaces indexes towns', Array.isArray(towns) && towns.length > 100, 'got ' + towns.length);
    const placesList = places.places();
    check('EOPlaces indexes malls / shopping centres', Array.isArray(placesList) && placesList.length > 10, 'got ' + placesList.length);

    const cityHits = places.suggest('city', 'gaborone');
    check('EOPlaces suggests Gaborone as a city', cityHits.some((t) => /gaborone/i.test(t.label)));
    check('EOPlaces city suggestion carries the district', cityHits.length > 0 && !!cityHits[0].meta);

    const placeHits = places.suggest('place', 'mall');
    check('EOPlaces suggests malls for "mall"', placeHits.length > 0, 'got ' + placeHits.length);
    check('EOPlaces mall suggestion carries the town', placeHits.length > 0 && !!placeHits[0].meta);

    check('EOPlaces ignores an empty query', places.suggest('city', '').length === 0);
  }

  if (hosting) {
    const types = hosting.eventTypes();
    check('EOHosting reads the event taxonomy', Array.isArray(types) && types.length > 50, 'got ' + types.length);
    const cats = hosting.categories();
    check('EOHosting reads the event categories', Array.isArray(cats) && cats.length > 0, 'got ' + cats.length);
    const first = types[0];
    check('EOHosting event types have an id and a name', !!first && !!first.id && !!first.name);
    check('EOHosting.byId finds an event type', !!hosting.byId(first.id));

    const opts = hosting.options();
    check('EOHosting.options() maps to value/label/group',
      Array.isArray(opts) && opts.length === types.length && !!opts[0].value && !!opts[0].label);

    const rows = hosting.capacityRows([
      { name: 'Garden', seated: 40, standing: 80, notes: 'shaded' },
      { name: '', seated: 0, standing: 0 }
    ]);
    check('EOHosting.capacityRows normalises the rows',
      rows.length === 1 && rows[0].title === 'Garden' && /40/.test(String(rows[0].value)) && /80/.test(String(rows[0].value)),
      JSON.stringify(rows));

    const sum = hosting.summarize([{ name: 'Hall', seated: 100, standing: 50 }]);
    check('EOHosting.summarize totals the spaces', !!sum && sum.seated === 100 && sum.standing === 50, JSON.stringify(sum));

    const recs = hosting.eventTypeRecords(first.id ? [first.id] : []);
    check('EOHosting.eventTypeRecords resolves ids', Array.isArray(recs) && recs.length === 1 && recs[0].id === first.id);
  }

  if (publish) {
    const profile = {
      name: 'The Test Kitchen',
      slug: 'the-test-kitchen',
      description: 'A test venue',
      types: ['Restaurant'],
      category: 'Restaurant',
      location: {
        town: 'Gaborone', district: 'SE', districtName: 'South-East', area: 'Main Mall',
        landmark: 'Near the fountain', plotNumber: 'Plot 123', streetName: 'Main Street',
        building: 'The Test Kitchen',
        place: { businessName: 'Gaborone Mall', address: 'Plot 123, Main Street, Gaborone' }
      },
      contacts: [{ label: 'Phone', number: '+267 71234567', primary: true, whatsapp: true }],
      socials: [{ platform: 'instagram', url: 'https://instagram.com/test' }],
      capacity: [{ id: 'cap1', title: 'Seats', value: 50 }],
      hosting: {
        spaces: [{ id: 'sp1', title: 'Garden', value: '40 seated', description: 'shaded' }],
        eventTypes: [{ id: 'et1', typeId: firstId(), name: 'Birthday Party', category: 'Celebrations' }],
        rules: { minimumGuests: 10, maximumGuests: 120 }
      }
    };
    function firstId() {
      const t = hosting && hosting.eventTypes()[0];
      return t ? t.id : '';
    }

    const sub = publish.toSubmission(profile);
    check('toSubmission uses the eatouts.venue.v1 schema', sub.$schema === 'eatouts.venue.v1');
    check('toSubmission carries the slug', sub.slug === 'the-test-kitchen');
    check('toSubmission carries the place', sub.location.place === 'Gaborone Mall');
    check('toSubmission carries the place address', sub.location.placeAddress.indexOf('Main Street') >= 0);
    check('toSubmission carries the capacity list', Array.isArray(sub.capacity) && sub.capacity.length === 1);
    check('toSubmission carries the hosting block',
      !!sub.hosting && Array.isArray(sub.hosting.spaces) && Array.isArray(sub.hosting.eventTypes));

    const row = publish.toDirectoryRow(profile);
    check('toDirectoryRow keeps the id and slug', row.id === 'own-the-test-kitchen' && row.slug === 'the-test-kitchen');
    check('toDirectoryRow carries the location', row.location.town === 'Gaborone' && row.location.area === 'Main Mall');
    check('toDirectoryRow carries the place', row.place === 'Gaborone Mall');
    check('toDirectoryRow carries the capacity list', Array.isArray(row.capacity) && row.capacity.length === 1);
    check('toDirectoryRow carries the hosting block', !!row.hosting && row.hosting.spaces.length === 1);
    check('toDirectoryRow is published', row.status === 'published');

    const pushed = publish.pushLocalDirectory(row);
    check('pushLocalDirectory writes to the local directory', pushed === true);
    const db = w.EatoutsDB.load();
    const saved = (db.restaurants || []).filter((r) => r.id === row.id);
    check('the local directory holds the published venue', saved.length === 1);
    check('the local directory row keeps the place', saved.length === 1 && saved[0].place === 'Gaborone Mall');
    check('the local directory row keeps the hosting block', saved.length === 1 && !!saved[0].hosting);

    /* publish() guards */
    publish.publish({ page: null }).then((res) => {
      check('publish without a page fails cleanly', res && res.ok === false && res.error === 'no_page');

      return publish.publish({ page: { key: 'test', buildProfile: () => ({ name: '' }) } });
    }).then((res) => {
      check('publish without a name reports name_required', res && res.ok === false && res.error === 'name_required');

      return publish.publish({ page: { key: 'test', buildProfile: () => ({ name: 'Test' }) } });
    }).then((res) => {
      check('publish without a backend reports backend_not_configured',
        res && res.ok === false && res.error === 'backend_not_configured', JSON.stringify(res));

      /* the registry */
      const page = { key: 'test', type: 'restaurant', buildProfile: () => ({ name: 'Test' }) };
      onboard.register(page);
      check('EOOnboard.register stores the page', onboard.page() && onboard.page().key === 'test');

      /* The publish bar replaces the retired form's billing module. */
      const note = w.document.querySelector('.eop-publish-note');
      check('the publish bar is injected', !!note);
      check('the publish bar discloses the setup fee', !!note && /P300/.test(note.textContent), note && note.textContent);
      check('the publish bar lists the plans', !!note && /Starter P100\/mo/.test(note.textContent), note && note.textContent);
      check('the publish bar still tells the owner the draft is local',
        !!note && /saved on this device/.test(note.textContent));
      check('the original footer buttons are preserved',
        !!w.document.querySelector('.footer-actions [data-action="save"]'));

      check('no uncaught errors in the bridge', errors.length === 0, errors.join(' | '));

      console.log('');
      console.log(fails ? (fails + ' FAILED') : ('all ' + checks + ' onboarding bridge checks passed'));
      process.exit(fails ? 1 : 0);
    }).catch((e) => {
      console.log('FAIL suite threw: ' + ((e && e.stack) || e));
      process.exit(1);
    });
  } else {
    check('bridge loaded', false);
    console.log('');
    console.log(fails + ' FAILED');
    process.exit(1);
  }
}, 400);
