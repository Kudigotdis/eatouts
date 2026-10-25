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
 *   assets/data/link_registry.json    - slug -> { type, refId, name } (edge + client)
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
const COUNTRY = 'bw';

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
  const seen = new Set();

  function push(type, refId, name, fallbackParts) {
    if (!refId || !name) return;
    const base = slugFromParts([name]);
    const alt = slugFromParts([name].concat(fallbackParts || []));
    if (!base && !alt) return;
    let seed = base || alt;
    if (SLUG_OVERRIDE[seed]) seed = SLUG_OVERRIDE[seed];
    if (RESERVED.has(seed)) seed += 'biz';
    let candidate = seed;
    let n = 2;
    while (seen.has(candidate)) {
      candidate = (alt && alt !== seed && n === 2) ? alt : (alt || seed) + String(n);
      n++;
    }
    seen.add(candidate);
    candidates.push({
      slug: candidate,
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
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });
  // sorted for deterministic output
  const groupEntries = Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  groupEntries.forEach(([key, branches]) => {
    const owned = branches.find((b) => b.slug === key);
    const gaborone = branches.find((b) => String(b.town || '').toLowerCase() === 'gaborone');
    const primary = owned || gaborone || branches[0];
    const name = (owned && owned.name) || branches[0].name || key;
    const refId = primary.id || ('rest_' + primary.slug);
    push('restaurant', refId, name, [primary.town || primary.area]);
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

  const bySlug = {};
  candidates.forEach((c) => { bySlug[c.slug] = c; });

  fs.writeFileSync(OUT_JSON, JSON.stringify({
    generatedAt: null,
    country: COUNTRY,
    count: candidates.length,
    bySlug: bySlug
  }), 'utf8');

  /* content-derived epoch (was Date.now()) - deterministic; changes iff inputs change.
     Kept at 13 digits so it stays in the same range as a Date.now() timestamp. */
  const inputDigest = createHash('sha256')
    .update(candidates.map((c) => [c.type, c.slug, c.refId, c.name].join('|')).sort().join('\n'))
    .digest('hex');
  const now = Number(1_000_000_000_000n + (BigInt('0x' + inputDigest.slice(0, 16)) % 9_000_000_000_000n));
  const lines = [
    '-- Auto-generated by scripts/build_link_registry.mjs',
    '-- Public business links: www.eatouts.online/' + COUNTRY + '/<slug>',
    '-- Entries: ' + candidates.length,
    '-- Apply with: npx wrangler d1 execute eatouts --file scripts/seeds/business_links.sql --remote',
    ''
  ];
  candidates.forEach((c) => {
    lines.push(
      'INSERT OR IGNORE INTO business_links ' +
      '(id, country_code, slug, type, ref_id, display_slug, name, status, created_at, updated_at) VALUES (' +
      [
        sqlStr('blk_' + c.slug), sqlStr(COUNTRY), sqlStr(c.slug), sqlStr(c.type), sqlStr(c.refId),
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
