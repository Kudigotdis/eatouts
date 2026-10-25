-- EatOuts schema v15 (Cloudflare D1 / SQLite)
-- Canonical business-type slugs, step 1: bottle stores and food trucks.
--
--   bottle_store | bottle-store | liquor_store | liquor-store  ->  bottlestore
--   food_truck   | food-truck                                 ->  foodtruck
--
-- WHY: three spellings of one type shipped at once. The slug catalog
-- (assets/data/business_types.js) says `bottlestore`, the field enum
-- (js/eatouts-field.js) said `liquor_store`, and this table's rows say
-- `bottle_store`. Reads were already tolerant because both normalisers map
-- every spelling, but comparisons were not: functions/api/me.js decided
-- onboarding completion with `x.type === 'bottle_store'`, so a favourite stored
-- in any other spelling silently scored zero. One spelling removes the class.
--
-- SUPPLIER IS DELIBERATELY ABSENT. business_links holds 315 `supplier` rows and
-- 0 `event_supplier`, and `supplier` is canonical in business_types.js (which
-- also drives onboarding and dashboard file routing), functions/api/business/
-- link.js:14, functions/[slug].js:77 and functions/api/_business.js:178. Only
-- js/eatouts-field.js FIELD_TYPES says `event_supplier`, and its normaliser
-- already bridges both ways. Flipping it is a 315-row bet nobody has called, so
-- this migration does not touch it. A future agent flipping it must re-read
-- those five sites AND update the FIELD_TYPES comment that records the split.
--
-- IDEMPOTENT: every statement is scoped `WHERE type IN (<old>, <new>)`, so a
-- second run only re-sets rows that are already canonical and cannot rewrite
-- anything else. This matters: `favourites` also stores non-venue types
-- (functions/api/customer/favourites.js accepts ?type=promo), and the scoped
-- WHERE clause means those rows are unreachable from this file.
--
-- Applied with:
--   npx wrangler d1 migrations apply eatouts --local    (npm run db:migrate:local)
--   npx wrangler d1 migrations apply eatouts --remote   (npm run db:migrate)
--
-- ORDERING, DO NOT SKIP: the code that reads `bottlestore`/`foodtruck` ships in
-- the same release as this file (js/eatouts-field.js, functions/api/me.js,
-- functions/api/business/link.js, functions/[slug].js). The --remote apply is
-- the LAST step, run by a human after `git push`. Applying it against the old
-- code is exactly what makes the onboarding counters read zero.
--
-- NO DOWN MIGRATION: this repo has no rollback convention - no migration
-- carries a reverse body, and a sibling `*_down.sql` would be applied in
-- filename order like any other. The reverse statements are therefore kept as a
-- commented block at the end of this file. Uncomment by hand, after reverting
-- the code, only for a deliberate rollback.

PRAGMA foreign_keys = ON;

UPDATE business_links
   SET type = 'bottlestore'
 WHERE type IN ('bottlestore', 'bottle_store', 'bottle-store', 'liquor_store', 'liquor-store');

UPDATE favourites
   SET type = 'bottlestore'
 WHERE type IN ('bottlestore', 'bottle_store', 'bottle-store', 'liquor_store', 'liquor-store');

UPDATE business_links
   SET type = 'foodtruck'
 WHERE type IN ('foodtruck', 'food_truck', 'food-truck');

UPDATE favourites
   SET type = 'foodtruck'
 WHERE type IN ('foodtruck', 'food_truck', 'food-truck');

-- ---- rollback (manual, commented on purpose - see header) -------------------
-- UPDATE business_links SET type = 'bottle_store' WHERE type = 'bottlestore';
-- UPDATE favourites     SET type = 'bottle_store' WHERE type = 'bottlestore';
-- UPDATE business_links SET type = 'food_truck'   WHERE type = 'foodtruck';
-- UPDATE favourites     SET type = 'food_truck'   WHERE type = 'foodtruck';
-- ---------------------------------------------------------------------------
