/* ============================================================
   DEMO SEED test
   A - static: the generated bundle and renamed delivery assets.
   B - jsdom: loading eatouts-manager-db.js + demo-data.js +
       eatouts-manager-seed.js populates EatoutsMgrDB idempotently.
   Run: node tests/demo-seed.js
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

const DEMO_DIR = path.join(APP_DIR, 'assets', 'data', 'demo', 'the-food-place');
const BUNDLE = path.join(DEMO_DIR, 'demo-data.js');

/* ---------------- Part A: static bundle + renamed assets ---------------- */
(function staticChecks() {
  check('demo bundle exists', fs.existsSync(BUNDLE));

  const srcFiles = fs.readdirSync(DEMO_DIR).filter((f) => f.endsWith('.js') && f !== 'demo-data.js').sort();
  check('21 domain source files', srcFiles.length === 21, srcFiles.length);

  const bundle = fs.readFileSync(BUNDLE, 'utf8');
  check('bundle defines window.EATOUTS_DEMO', /window\.EATOUTS_DEMO\s*=/.test(bundle));

  const demoFiles = [BUNDLE].concat(srcFiles.map((f) => path.join(DEMO_DIR, f)));
  const legacy = demoFiles.filter((f) => /yellow_giraffe|Yellow Giraffe/i.test(fs.readFileSync(f, 'utf8')));
  check('no demo file references the old brand', legacy.length === 0, legacy.map((f) => path.basename(f)).join(','));

  const deliv = path.join(APP_DIR, 'assets', 'data', 'deliveries');
  const renamed = [
    'the_food_place_50_scheduled_deliveries.js',
    'the_food_place_50_scheduled_deliveries.json',
    'the_food_place_50_scheduled_deliveries.txt',
    'the_food_place_1600_active_driver_manifest.md',
    'the_food_place_shift_manifest_0600_1600.md'
  ];
  const old = [
    'yellow_giraffe_50_scheduled_deliveries.js',
    'yellow_giraffe_50_scheduled_deliveries.json',
    'yellow_giraffe_50_scheduled_deliveries.txt',
    'yellow_giraffe_1600_active_driver_manifest.md',
    'yellow_giraffe_shift_manifest_0600_1600.md'
  ];
  check('renamed delivery files exist', renamed.every((f) => fs.existsSync(path.join(deliv, f))),
    renamed.filter((f) => !fs.existsSync(path.join(deliv, f))).join(','));
  check('old delivery files are gone', old.every((f) => !fs.existsSync(path.join(deliv, f))),
    old.filter((f) => fs.existsSync(path.join(deliv, f))).join(','));

  const dl = fs.readFileSync(path.join(deliv, 'the_food_place_50_scheduled_deliveries.js'), 'utf8');
  check('delivery global renamed to EATOUTS_FOOD_PLACE_DELIVERY_BACKFILL',
    /window\.EATOUTS_FOOD_PLACE_DELIVERY_BACKFILL\s*=/.test(dl) && !/EATOUTS_DELIVERY_BACKFILL\s*=/.test(dl));

  const mgrdb = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-manager-db.js'), 'utf8');
  check('manager-db seed business renamed to The Food Place',
    /name:"The Food Place"/.test(mgrdb) && !/The Yellow Giraffe Coffee Club/.test(mgrdb));

  const driver = fs.readFileSync(path.join(APP_DIR, 'driver-delivery.html'), 'utf8');
  const rest = fs.readFileSync(path.join(APP_DIR, 'restaurant-delivery.html'), 'utf8');
  check('driver board uses renamed src + global',
    driver.includes('the_food_place_50_scheduled_deliveries.js') && driver.includes('EATOUTS_FOOD_PLACE_DELIVERY_BACKFILL') && !driver.includes('yellow_giraffe'));
  check('restaurant board uses renamed src + global',
    rest.includes('the_food_place_50_scheduled_deliveries.js') && rest.includes('EATOUTS_FOOD_PLACE_DELIVERY_BACKFILL') && !rest.includes('yellow_giraffe'));
})();

/* ---------------- Part B: jsdom seeding ---------------- */
const vc = new VirtualConsole();
const errors = [];
vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;

function load(rel) {
  window.eval(fs.readFileSync(path.join(APP_DIR, rel), 'utf8') + '\n//# sourceURL=' + rel);
}

const DEMO_KEYS = [
  'businesses', 'users', 'settings', 'staff', 'orders', 'deliveries', 'reservations',
  'reviews', 'invoices', 'feedback', 'menu', 'beverage', 'promos', 'events', 'gallery',
  'verification', 'disputes', 'notifications', 'customerOrders', 'favourites', 'addresses'
];

load('js/eatouts-manager-db.js');
load('assets/data/demo/the-food-place/demo-data.js');

const D = window.EATOUTS_DEMO;
check('EATOUTS_DEMO exposes all 21 keys',
  D && DEMO_KEYS.every((k) => D[k] != null),
  D ? DEMO_KEYS.filter((k) => D[k] == null).join(',') : typeof D);

load('js/eatouts-manager-seed.js');

const DB = window.EatoutsMgrDB;
check('EatoutsMgrDB available', !!DB);

const biz = DB.find('businesses', 'biz-restaurant');
check('demo business is The Food Place', biz && biz.name === 'The Food Place', biz && biz.name);
check('demo business carries a status + verified flag',
  biz && !!biz.status && biz.verified === true, biz && (biz.status + '/' + biz.verified));
check('demo business has identity/contacts/hours',
  biz && biz.identity && biz.identity.slug === 'the-food-place' &&
  Array.isArray(biz.contacts) && biz.contacts.length >= 2 &&
  biz.operatingHours && biz.operatingHours.weekly.length === 7);
check('demo business logo points at the supplied art',
  biz && biz.logo === 'assets/logo/the_food_place_logo.jpg' &&
  biz.identity && biz.identity.logo === 'assets/logo/the_food_place_logo.jpg',
  biz && biz.logo);
check('demo logo file exists',
  fs.existsSync(path.join(APP_DIR, 'assets', 'logo', 'the_food_place_logo.jpg')));

check('menu module seeded', biz && biz.modules && biz.modules.menu && biz.modules.menu.items.length >= 30,
  biz && biz.modules && biz.modules.menu ? biz.modules.menu.items.length : 'none');
check('beverage module seeded', biz && biz.modules && biz.modules.beverage && biz.modules.beverage.items.length >= 15,
  biz && biz.modules && biz.modules.beverage ? biz.modules.beverage.items.length : 'none');
check('promos module seeded', biz && biz.modules && Array.isArray(biz.modules.promos) && biz.modules.promos.length >= 6);
check('events module seeded', biz && biz.modules && Array.isArray(biz.modules.events) && biz.modules.events.length >= 4);
check('gallery module seeded', biz && biz.modules && biz.modules.gallery && biz.modules.gallery.images.length >= 12,
  biz && biz.modules && biz.modules.gallery ? biz.modules.gallery.images.length : 'none');

const counts = {
  staff: DB.filter('staff', (s) => s.businessId === 'biz-restaurant').length,
  orders: DB.collection('orders').length,
  deliveries: DB.filter('deliveries', (d) => d.businessId === 'biz-restaurant').length,
  reservations: DB.filter('reservations', (r) => r.businessId === 'biz-restaurant').length,
  reviews: DB.filter('reviews', (r) => r.businessId === 'biz-restaurant').length,
  invoices: DB.filter('invoices', (i) => i.businessId === 'biz-restaurant').length,
  feedback: DB.collection('feedback').length,
  notifications: DB.collection('notifications').length,
  favourites: DB.collection('favourites').length,
  addresses: DB.collection('addresses').length,
  verification: DB.collection('verification').length,
  disputes: DB.collection('disputes').length
};
check('staff roster is the 21-profile demo', counts.staff === 21, counts.staff);
check('orders >= 40 venue + 10 customer', counts.orders >= 50, counts.orders);
check('deliveries >= 20', counts.deliveries >= 20, counts.deliveries);
check('reservations >= 8', counts.reservations >= 8, counts.reservations);
check('reviews >= 15', counts.reviews >= 15, counts.reviews);
check('invoices >= 6', counts.invoices >= 6, counts.invoices);
check('feedback >= 6', counts.feedback >= 6, counts.feedback);
check('notifications >= 5', counts.notifications >= 5, counts.notifications);
check('favourites >= 8', counts.favourites >= 8, counts.favourites);
check('addresses >= 3', counts.addresses >= 3, counts.addresses);
check('verification >= 4', counts.verification >= 4, counts.verification);
check('disputes >= 4', counts.disputes >= 4, counts.disputes);

const settings = DB.get().settings;
check('settings zones present', Array.isArray(settings.zones) && settings.zones.length >= 3, settings.zones && settings.zones.length);
check('settings pricing present', settings.pricing && settings.pricing.growth === 300);

/* ---------------- Part C: roster depth, users, roles, compliance ---------------- */
const roster = DB.filter('staff', (s) => s.businessId === 'biz-restaurant');
const ids = roster.map((s) => s.id);
check('staff ids unique', new Set(ids).size === ids.length, ids.length);
const empIds = roster.map((s) => s.employeeId).filter(Boolean);
check('every staff member has an employeeId', empIds.length === roster.length, empIds.length);
check('employeeIds unique', new Set(empIds).size === empIds.length);
const contacts = roster.map((s) => String(s.contact || '').replace(/\D/g, ''));
check('staff contact numbers unique', new Set(contacts).size === contacts.length, contacts.length);
check('every staff member has a nested attendance block', roster.every((s) => s.attendance && s.attendance.lastClockIn));
check('every staff member has a nested performance block', roster.every((s) => s.performance));
check('every staff member has a nested payroll block', roster.every((s) => s.payroll && s.payroll.net != null));
check('kitchen section present for chefs', roster.filter((s) => s.kitchen).length >= 3, roster.filter((s) => s.kitchen).length);
check('delivery + security sections present', roster.filter((s) => s.delivery).length >= 2 && roster.filter((s) => s.security).length >= 2);

const OMANG = /^[1245]\d{8}$/;
const PASSPORT = /^[A-Z]{2}\d{6}$/;
const badId = roster.filter((s) => (s.idType === 'omang' ? !OMANG.test(String(s.idNumber)) : s.idType === 'passport' ? !PASSPORT.test(String(s.idNumber)) : false));
check('Omang / passport numbers match format', badId.length === 0, badId.map((s) => s.idNumber).join(','));
check('non-citizen passports present', roster.filter((s) => s.idType === 'passport').length >= 2,
  roster.filter((s) => s.idType === 'passport').length);

const users = DB.collection('users');
const investors = users.filter((u) => u.type === 'investor');
check('three investor accounts', investors.length === 3, investors.length);
check('investors carry the investor role', investors.every((u) => (u.roles || []).includes('investor')));
check('staff logins seeded', users.filter((u) => String(u.id).indexOf('u-st-') === 0).length >= 20,
  users.filter((u) => String(u.id).indexOf('u-st-') === 0).length);
const owner = DB.find('users', 'u-owner');
check('base seed owner renamed to Kagiso Phiri',
  owner && owner.firstName === 'Kagiso' && owner.surname === 'Phiri', owner && (owner.firstName + ' ' + owner.surname));
check('old base staff ids removed', !DB.find('staff', 'st-1') && !DB.find('staff', 'st-2'));
check('no generic "Demo Owner" user remains', !users.some((u) => u.firstName === 'Demo' && u.surname === 'Owner'));

const rolesSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-roles.js'), 'utf8');
check('investor role defined with read-only finance perms',
  /investor\s*:\s*\[[^\]]*finance\.view/.test(rolesSrc));
const authSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-auth.js'), 'utf8');
check('auth exposes an investor demo credential', /investor\s*:\s*\{[^}]*whatsapp/.test(authSrc));
check('auth routes investors to analytics', /type\s*===\s*['"]investor['"][^\n]*analytics-manager/.test(authSrc));
const loginSrc = fs.readFileSync(path.join(APP_DIR, 'eatouts-login.html'), 'utf8');
/* The sign-in page offers the seven workspace demo tiles. The investor tile
   is not one of them: investors reach the analytics workspace through their
   own console, so the tile is checked here rather than on the sign-in page. */
const DEMO_TILES = ['customer', 'restaurant', 'bottle_store', 'caterer', 'lodge', 'supplier', 'platform_admin'];
const missingTiles = DEMO_TILES.filter((r) => !new RegExp('data-demo=["\']' + r + '["\']').test(loginSrc));
check('login page offers the seven workspace demo tiles', missingTiles.length === 0, missingTiles.join(','));
check('login page has no investor demo tile', !/data-demo=["']investor["']/.test(loginSrc));
const usersMgr = fs.readFileSync(path.join(APP_DIR, 'eatouts-users-manager.html'), 'utf8');
check('users manager filter offers investor', /<option[^>]*>investor<\/option>/i.test(usersMgr));
const staffMgr = fs.readFileSync(path.join(APP_DIR, 'staff-manager.html'), 'utf8');
check('staff manager exposes the five tabs',
  /\["roster","attendance","tips","performance","payroll"\]/.test(staffMgr) &&
  staffMgr.includes('data-tab=') && staffMgr.includes('renderAttendance') && staffMgr.includes('renderPayroll'));

check('version marker set', DB.get().demoSeed === 3, DB.get().demoSeed);

/* live auth: an investor demo login resolves and routes to analytics */
try {
  load('js/eatouts-roles.js');
  load('js/eatouts-users.js');
  load('js/eatouts-auth.js');
  const Auth = window.EatoutsAuth;
  check('EatoutsAuth loads over the seeded store', !!Auth && !!Auth.loginDemoRole);
  const res = Auth.loginDemoRole('investor');
  check('investor demo login starts a session', res && typeof res.then === 'function');
  const inv = Auth.getUser();
  check('active user is the investor',
    inv && inv.type === 'investor' && (inv.roles || []).includes('investor'), inv && inv.type);
  check('investor routes to the analytics dashboard',
    Auth.routeFor(inv) === 'analytics-manager.html', Auth.routeFor(inv));
} catch (e) {
  check('investor demo login flow', false, e.message);
}

/* idempotency: a second seed pass must not duplicate records */
const before = {
  staff: DB.collection('staff').length,
  orders: DB.collection('orders').length,
  feedback: DB.collection('feedback').length,
  favourites: DB.collection('favourites').length
};
window.eval('/* re-run */');
load('js/eatouts-manager-seed.js');
check('re-seeding does not duplicate staff', DB.collection('staff').length === before.staff,
  before.staff + ' -> ' + DB.collection('staff').length);
check('re-seeding does not duplicate orders', DB.collection('orders').length === before.orders,
  before.orders + ' -> ' + DB.collection('orders').length);
check('re-seeding does not duplicate feedback', DB.collection('feedback').length === before.feedback,
  before.feedback + ' -> ' + DB.collection('feedback').length);
check('re-seeding does not duplicate favourites', DB.collection('favourites').length === before.favourites,
  before.favourites + ' -> ' + DB.collection('favourites').length);

console.log('\nwindow errors: ' + errors.length);
errors.slice(0, 10).forEach((e) => console.log('  ' + e.split('\n')[0]));
console.log(fails === 0 && errors.length === 0 ? '\nDEMO SEED TEST PASSED' : '\nDEMO SEED TEST FAILED (' + fails + ' checks)');
process.exit(fails === 0 && errors.length === 0 ? 0 : 1);
