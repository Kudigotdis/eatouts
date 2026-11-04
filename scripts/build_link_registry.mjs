#!/usr/bin/env node
/**
 * EatOuts business-link registry builder.
 *
 * Derives the public link namespace for  www.eatouts.online/<country>/<slug>
 * from the real data the app already ships:
 *
 *   restaurants   assets/data/restaurant_listings/directory_runtime_data.json
 *   bottle/liquor assets/data/BottleLliquorStoresDatabase.js (window.EATOUTS_BOTTLE_STORES)
 *   suppliers     assets/data/event_supplier_demo_catalogue.js (window.EATOUTS_SUPPLIERS)
 *
 * Restaurants are grouped into BRANDS exactly like the customer app
 * (EatoutsBridge.brandKeyOf): all KFC branches become one "/bw/kfc" link that
 * resolves to the brand's primary branch. Bottle stores are already brand-level;
 * suppliers are one link each. Every future listing gets a link automatically
 * the next time this runs (it is part of `npm run build`).
 *
 * Slug rules match js/eatouts-slug.js: lowercase, a-z 0-9 and "." only, spaces
 * smashed ("KFC Francistown" -> "kfcfrancistown"), unique per country. Name
 * clashes fall back to name+town, then a trailing number.
 *
 * Emits:
 *   assets/data/link_registry.json    - byCountry[cc][slug] -> { type, refId, name }
 *                                       (plus bySlug, the default country's flat map)
 *   scripts/seeds/business_links.sql  - INSERT OR IGNORE seed for D1
 *
 * Usage:  npm run link-registry
 *         node scripts/build_link_registry.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

/* A record may declare a region. Anything written before regions existed has no
   field and reads as the default - the same rule the client applies in
   js/eatouts-regions.js (recordRegion). Codes are lowercase because they are
   both a URL segment and business_links.country_code. */
const DEFAULT_COUNTRY = 'bw';

function countryOf(record) {
  const code = String((record && record.region) || '').trim().toLowerCase();
  return /^[a-z]{2}$/.test(code) ? code : DEFAULT_COUNTRY;
}

const BRAND_JS = path.join(ROOT, 'js', 'eatouts-brand.js');
const RESTAURANTS_JSON = path.join(ROOT, 'assets', 'data', 'restaurant_listings', 'directory_runtime_data.json');
const BOTTLE_JS = path.join(ROOT, 'assets', 'data', 'BottleLliquorStoresDatabase.js');
const SUPPLIERS_JS = path.join(ROOT, 'assets', 'data', 'event_supplier_demo_catalogue.js');
const CATERING_JS = path.join(ROOT, 'assets', 'data', 'CateringServicesDatabase.js');
const OUT_JSON = path.join(ROOT, 'assets', 'data', 'link_registry.json');
const OUT_SQL = path.join(ROOT, 'scripts', 'seeds', 'business_links.sql');

/* Reserved words mirrored from js/eatouts-slug.js - a derived slug must never
   shadow a real route. */
const RESERVED = new Set([
  'api', 'assets', 'js', 'css', 'img', 'static', 'cdn', 'mail', 'bw', 'www',
  'app', 'admin', 'root', 'public', 'about', 'blog', 'help', 'support',
  'terms', 'privacy', 'login', 'logout', 'signup', 'register', 'account',
  'settings', 'index', 'home', 'new', 'edit', 'me', 'my', 'null', 'undefined',
  'restaurants', 'restaurant', 'suppliers', 'supplier', 'events', 'event',
  'promos', 'promo', 'gallery', 'reserve', 'business', 'dashboard', 'ops',
  'test', 'demo', 'health', 'robots'
]);

/* Branch rows whose brand key can't be derived from their name - mirrors
   BRAND_ALIAS in js/eatouts-bridge.js. */
/* Custom public-slug overrides for specific restaurants (name-derived slug -> desired slug). */
const SLUG_OVERRIDE = {
  'touchdownrestaurantpub': 'touchdown'
};

const BRAND_ALIAS = {
  'chicken-licken-station': 'chicken-licken',
  'chicken-licken-warehouse-lobatse': 'chicken-licken',
  'debonairs-pizza-pty-limited': 'debonairs-pizza',
  'bull-and-bush-maun': 'bull-and-bush',
  'hungry-lion-take-aways': 'hungry-lion',
  'kfc-francistown-francistown': 'kfc',
  'milky-lane-restaurant': 'milky-lane',
  'nandos-head-office': 'nandos',
  'spur-at-metcourt-hotel-francistown': 'spur',
  'silver-spur-steakhouse': 'spur',
  'diamond-creek-spur': 'spur',
  'steers-riverwalk': 'steers',
  'steers-game-city': 'steers',
  'steers-broadhurst': 'steers',
  'whistle-stop-steers-diner': 'steers',
  'denjebuya-restaurant-branch': 'denjebuya-restaurant'
};

const MIN = 3;
const MAX = 40;

function deaccent(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Smash a phrase into a canonical slug: a-z 0-9 and "." only. */
function slugFromParts(parts) {
  const words = deaccent(parts.filter(Boolean).join(' ').toLowerCase()).match(/[a-z0-9]+/g) || [];
  const s = words.join('').slice(0, MAX);
  return s.length >= MIN ? s : '';
}

/** Load a classic <script> file that assigns to window.<name>. */
function loadWindowGlobal(file, name) {
  const code = fs.readFileSync(file, 'utf8');
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
  return sandbox[name];
}

function sqlStr(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  return "'" + String(value).replace(/'/g, "''") + "'";
}

function main() {
  const Brand = (() => {
    try { return loadWindowGlobal(BRAND_JS, 'EatoutsBrand'); } catch (e) { return null; }
  })();
  const slugifyName = (name) => (Brand && Brand.slugify ? Brand.slugify(name) : slugFromParts([name]));
  const canonicalKey = (slug) => (Brand && Brand.canonicalKey ? Brand.canonicalKey(slug) : String(slug || '').toLowerCase());

  const candidates = [];
  /* Uniqueness is per COUNTRY: /bw/kfc and /zw/kfc are different businesses.
     Keying on the bare slug would publish Zimbabwe's KFC as "/zw/kfc2". */
  const seen = new Set();

  function push(type, refId, name, fallbackParts, country) {
    if (!refId || !name) return;
    const cc = country || DEFAULT_COUNTRY;
    const base = slugFromParts([name]);
    const alt = slugFromParts([name].concat(fallbackParts || []));
    if (!base && !alt) return;
    let seed = base || alt;
    if (SLUG_OVERRIDE[seed]) seed = SLUG_OVERRIDE[seed];
    if (RESERVED.has(seed)) seed += 'biz';
    let candidate = seed;
    let n = 2;
    while (seen.has(cc + '|' + candidate)) {
      candidate = (alt && alt !== seed && n === 2) ? alt : (alt || seed) + String(n);
      n++;
    }
    seen.add(cc + '|' + candidate);
    candidates.push({
      slug: candidate,
      country: cc,
      type: type,
      refId: String(refId),
      name: String(name).trim(),
      display: candidate
    });
  }

  /* ---- restaurants (brand-level, like the app) ---- */
  let restaurants = [];
  try {
    const data = JSON.parse(fs.readFileSync(RESTAURANTS_JSON, 'utf8'));
    restaurants = Array.isArray(data) ? data : (data.restaurants || []);
  } catch (e) {
    console.warn('[link-registry] restaurants source missing:', e.message);
  }

  function brandKeyOf(r) {
    const slug = String(r.slug || '');
    if (BRAND_ALIAS[slug]) return BRAND_ALIAS[slug];
    const nameSlug = slugifyName(r.name || slug);
    const canonical = canonicalKey(slug);
    if (canonical && canonical !== slug) return canonical;
    if (nameSlug && nameSlug !== slug) return nameSlug;
    return slug || nameSlug;
  }

  const groups = new Map();
  restaurants.forEach((r) => {
    const key = brandKeyOf(r);
    if (!key) return;
    /* A brand does not span regions: a Harare KFC is not a branch of the
       Gaborone one, so the group key carries the country too. */
    const gk = countryOf(r) + '|' + key;
    if (!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(r);
  });
  // sorted for deterministic output
  const groupEntries = Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  groupEntries.forEach(([gk, branches]) => {
    const sep = gk.indexOf('|');
    const cc = gk.slice(0, sep);
    const key = gk.slice(sep + 1);
    const owned = branches.find((b) => b.slug === key);
    const gaborone = branches.find((b) => String(b.town || '').toLowerCase() === 'gaborone');
    const primary = owned || gaborone || branches[0];
    const name = (owned && owned.name) || branches[0].name || key;
    const refId = primary.id || ('rest_' + primary.slug);
    push('restaurant', refId, name, [primary.town || primary.area], cc);
  });

  /* ---- bottle / liquor stores (brand level) ---- */
  let bottle = null;
  try { bottle = loadWindowGlobal(BOTTLE_JS, 'EATOUTS_BOTTLE_STORES'); } catch (e) {}
  if (bottle && Array.isArray(bottle.brands)) {
    bottle.brands.forEach((b) => {
      push('bottlestore', b.slug || b.brandKey, b.name, [b.towns && b.towns[0]]);
    });
  }

  /* ---- event suppliers ---- */
  let suppliers = null;
  try { suppliers = loadWindowGlobal(SUPPLIERS_JS, 'EATOUTS_SUPPLIERS'); } catch (e) {}
  if (Array.isArray(suppliers)) {
    suppliers.forEach((s) => {
      push('supplier', s.id, s.businessName || s.name, [s.catName]);
    });
  }

  /* ---- catering services (brand level, like the app's EatoutsCatering) ---- */
  let catering = null;
  try { catering = loadWindowGlobal(CATERING_JS, 'EATOUTS_CATERING'); } catch (e) {}
  if (catering && Array.isArray(catering.brands)) {
    catering.brands.forEach((b) => {
      const town = (b.branches && b.branches[0] && b.branches[0].town) || '';
      push('supplier', b.slug || b.brandKey, b.name, [town]);
    });
  }

  /* Two views of one dataset. byCountry is authoritative - the resolver only
     ever reads byCountry[cc]. bySlug stays the flat map of the default country
     so older consumers (tests/catering-directory.js, cached copies) keep
     working, and it must stay the default country only. */
  const byCountry = {};
  candidates.forEach((c) => {
    if (!byCountry[c.country]) byCountry[c.country] = {};
    byCountry[c.country][c.slug] = c;
  });
  const bySlug = byCountry[DEFAULT_COUNTRY] || {};

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    generatedAt: null,
    country: DEFAULT_COUNTRY,
    count: candidates.length,
    bySlug: bySlug,
    byCountry: byCountry
  }), 'utf8');

  /* content-derived epoch (was Date.now()) - deterministic; changes iff inputs change.
     Kept at 13 digits so it stays in the same range as a Date.now() timestamp. */
  const inputDigest = createHash('sha256')
    .update(candidates.map((c) => [c.type, c.slug, c.refId, c.name].join('|')).sort().join('\n'))
    .digest('hex');
  const now = Number(1_000_000_000_000n + (BigInt('0x' + inputDigest.slice(0, 16)) % 9_000_000_000_000n));
  /* id is only a primary key; (country_code, slug) is the real identity. The
     country is prefixed only when the bare id would be shared, so a slug that
     exists in two regions cannot collide on the PK while today's seed - where
     every slug is unique - stays byte for byte identical. */
  const idCount = {};
  candidates.forEach((c) => { idCount['blk_' + c.slug] = (idCount['blk_' + c.slug] || 0) + 1; });
  const rowId = (c) => (idCount['blk_' + c.slug] > 1 ? 'blk_' + c.country + '_' + c.slug : 'blk_' + c.slug);
  const lines = [
    '-- Auto-generated by scripts/build_link_registry.mjs',
    '-- Public business links: www.eatouts.online/<country>/<slug>',
    '-- Entries: ' + candidates.length,
    '-- Apply with: npx wrangler d1 execute eatouts --file scripts/seeds/business_links.sql --remote',
    ''
  ];
  candidates.forEach((c) => {
    lines.push(
      'INSERT OR IGNORE INTO business_links ' +
      '(id, country_code, slug, type, ref_id, display_slug, name, status, created_at, updated_at) VALUES (' +
      [
        sqlStr(rowId(c)), sqlStr(c.country), sqlStr(c.slug), sqlStr(c.type), sqlStr(c.refId),
        sqlStr(c.display), sqlStr(c.name), sqlStr('active'), String(now), String(now)
      ].join(', ') + ');'
    );
  });
  lines.push('');
  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  fs.writeFileSync(OUT_SQL, lines.join('\n'), 'utf8');

  const byType = candidates.reduce((m, c) => { m[c.type] = (m[c.type] || 0) + 1; return m; }, {});
  console.log('[link-registry] restaurants=' + restaurants.length +
    ' bottleBrands=' + ((bottle && bottle.brands) ? bottle.brands.length : 0) +
    ' suppliers=' + (Array.isArray(suppliers) ? suppliers.length : 0) +
    ' caterers=' + ((catering && catering.brands) ? catering.brands.length : 0));
  console.log('[link-registry] wrote ' + candidates.length + ' links (' +
    JSON.stringify(byType) + ') -> ' + path.relative(ROOT, OUT_JSON));
}

main();
