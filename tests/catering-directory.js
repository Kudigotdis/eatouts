/* ============================================================
   Catering directory coverage.

   Guards the curated catering businesses added to
   assets/data/CateringServicesDatabase.js (window.EATOUTS_CATERING):
     - the new brands exist with the expected slug
     - each new brand carries its real logo (not the placeholder)
     - the public link registry exposes their no-hyphen deep-link slugs
       (e.g. www.eatouts.site/boifyscateringservices)
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP_DIR = path.resolve(__dirname, '..');

function loadWindowGlobal(file, name) {
  const code = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox[name];
}

let fails = 0;
const check = (label, cond, extra) => {
  if (cond) {
    console.log('ok   ' + label);
  } else {
    fails++;
    console.log('FAIL ' + label + (extra !== undefined ? '  -- ' + extra : ''));
  }
};

const CATERING = loadWindowGlobal('assets/data/CateringServicesDatabase.js', 'EATOUTS_CATERING');
const brands = (CATERING && CATERING.brands) || [];
const bySlug = {};
brands.forEach(b => { if (b && b.slug) bySlug[b.slug] = b; });

/* brand slug -> expected logo file (relative to app root) */
const NEW_BRANDS = {
  'boifys-catering-services': 'assets/logo/Boifys_Catering_Services_Logo.jpg',
  'kalanga-private-chefs': 'assets/logo/Kalanga_Private_Chefs_Logo.jpg',
  'shared-affair-catering': 'assets/logo/Shared_Affair_Catering_Logo.jpg',
  'cafe-sunset': 'assets/logo/cafe_Sunset_Logo.jpg',
  'jiki-jiki-pop-up-restaurant': 'assets/logo/Jiki-Jiki_Pop_Up_Restaurant_Logo.jpg',
  'donut-heart': 'assets/logo/Donut_Heart_Logo.jpg',
  'the-enticing-eatery': 'assets/logo/The_Enticing_Eatery_Logo.jpg',
  'ginger-and-vanilla': 'assets/logo/Ginger_&_Vanilla_Logo.jpg',
  'savory-chef': 'assets/logo/Savory_Chef_Logo.jpg',
  'melkayd-catering': 'assets/logo/Melkayd_Catering_Logo.jpg',
  'da-best-best-catering-services': 'assets/logo/Da_Best-Best-Catering_Services_Logo.jpg',
  'melty-bites-daily-delights': 'assets/logo/Melty_Bites_Daily_Delights_Logo.jpg',
  'food-cloud': 'assets/logo/Food_Cloud_Logo.jpg',
  'comforts-foods-catering-services': 'assets/logo/Comforts_Foods_Catering_Services_Logo.jpg',
  'sweetziehs-cakery-and-catering': 'assets/logo/SweetZiehs_Cakery_&_Catering_Logo.jpg',
  'doubles-lounge-and-catering-services': 'assets/logo/Doubles_Lounge_&_Catering_Services_Logo.jpg',
  'dripsins-burger-and-grill': 'assets/logo/Dripsins_Burger_&_Grill_Logo.jpg',
  'lh-cuisine-and-events': 'assets/logo/LH_Cuisine&_Events_Logo.jpg',
  'platter-house': 'assets/logo/Platter_House_Logo.jpg'
};

/* Catering DB exports a valid directory. */
check('EATOUTS_CATERING exposes brands', Array.isArray(brands) && brands.length > 0, brands.length);
check('catering directory includes Boifys', !!bySlug['boifys-catering-services']);
check('Boifys is located in Thamaga',
  !!bySlug['boifys-catering-services'] &&
  (bySlug['boifys-catering-services'].branches[0] || {}).town === 'Thamaga',
  bySlug['boifys-catering-services'] && (bySlug['boifys-catering-services'].branches[0] || {}).town);

Object.keys(NEW_BRANDS).forEach(slug => {
  const brand = bySlug[slug];
  check('catering brand present: ' + slug, !!brand);
  if (!brand) return;
  check('catering brand logo: ' + slug + ' -> ' + NEW_BRANDS[slug],
    brand.logo === NEW_BRANDS[slug], brand.logo);
  check('catering logo file exists: ' + NEW_BRANDS[slug],
    fs.existsSync(path.join(APP_DIR, NEW_BRANDS[slug])), NEW_BRANDS[slug]);
});

/* Attached logos for pre-existing catering brands. */
check('Moghul Catering has its logo',
  !!bySlug['moghul-catering'] && bySlug['moghul-catering'].logo === 'assets/logo/Moghul_Catering_Logo.jpg',
  bySlug['moghul-catering'] && bySlug['moghul-catering'].logo);
check('Kels Foods has its logo',
  !!bySlug['kels-foods-pty-ltd'] && bySlug['kels-foods-pty-ltd'].logo === 'assets/logo/Kels_Caterers_Logo.jpg',
  bySlug['kels-foods-pty-ltd'] && bySlug['kels-foods-pty-ltd'].logo);

/* Public link registry: the no-hyphen deep-link slug resolves to the brand. */
const registry = JSON.parse(fs.readFileSync(path.join(APP_DIR, 'assets', 'data', 'link_registry.json'), 'utf8'));
const reg = registry.bySlug || {};

function slugFromName(name) {
  return String(name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]+/g).join('');
}

const DEEP_LINKS = {
  boifyscateringservices: 'boifys-catering-services',
  kalangaprivatechefs: 'kalanga-private-chefs',
  platterhouse: 'platter-house',
  foodcloud: 'food-cloud',
  dripsinsburgergrill: 'dripsins-burger-and-grill'};

Object.keys(DEEP_LINKS).forEach(slug => {
  const entry = reg[slug];
  check('registry link resolves: /' + slug, !!entry && entry.type === 'supplier',
    entry ? entry.type : 'missing');
  if (entry) {
    check('registry /' + slug + ' -> ' + DEEP_LINKS[slug],
      entry.refId === DEEP_LINKS[slug], entry.refId);
  }
});

/* The curated brands added by hand must all have a public deep link. */
const curated = Object.keys(NEW_BRANDS);
const missingLinks = [];
curated.forEach(slug => {
  const brand = bySlug[slug];
  if (!brand || !brand.name) return;
  const link = slugFromName(brand.name);
  if (link && !reg[link]) missingLinks.push(brand.name + ' -> ' + link);
});
check('every curated catering brand has a public link', missingLinks.length === 0, missingLinks.join('; '));

/* venue-about.html?link=<no-hyphen slug> must resolve to the brand.
   Guards the canon() comparison between the link slug and the
   hyphenated catering brand slug (EatoutsBrand.canonicalKey passes
   unknown slugs through unchanged). */
try {
  const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
  let page = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8');
  const scripts = [];
  page = page.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing ' + src + ' -->';
    scripts.push(src);
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  const loadErrors = [];
  vc.on('jsdomError', e => {
    if (/Not implemented: navigation/.test(String((e && e.message) || ''))) return;
    loadErrors.push(String((e && e.stack) || (e && e.message) || e));
  });
  const dom = new JSDOM(page, {
    url: 'http://localhost/venue-about.html?link=boifyscateringservices',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const d = dom.window.document;
  const heading = d.querySelector('.hero h1');
  const text = heading ? heading.textContent.trim() : '';
  check('venue-about resolves /boifyscateringservices', /boifys/i.test(text), text || 'no heading');
  check('venue-about does not show "Venue not found"', !/not found/i.test(text), text);
  check('venue-about loaded its scripts', scripts.length > 0, scripts.join(', '));
  check('venue-about booted without errors', loadErrors.length === 0, loadErrors.slice(0, 2).join(' | '));
  dom.window.close();
} catch (e) {
  check('venue-about jsdom probe ran', false, String(e && e.message));
}

console.log('');
if (fails) {
  console.log('CATERING DIRECTORY FAILED (' + fails + ' failed).');
  process.exit(1);
}
console.log('CATERING DIRECTORY PASSED.');
