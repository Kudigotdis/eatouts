-- EatOuts schema v9 (Cloudflare D1 / SQLite)
-- Business promo CRUD columns.
--
-- The v8 migration declared a full `promos` table via CREATE TABLE IF NOT EXISTS,
-- but v1 had already created a minimal one, so the IF NOT EXISTS was a no-op and
-- the rich columns never landed. This migration adds them to the live table.
--
-- Column set matches the operator promo-onboarding UI
-- (promo-onboarding.html `newPromo` shape) and the promoOut exporter.
--
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local

PRAGMA foreign_keys = ON;

ALTER TABLE promos ADD COLUMN type                     TEXT;
ALTER TABLE promos ADD COLUMN description              TEXT;
ALTER TABLE promos ADD COLUMN original_price           REAL;
ALTER TABLE promos ADD COLUMN promo_price              REAL;
ALTER TABLE promos ADD COLUMN location_json             TEXT;
ALTER TABLE promos ADD COLUMN start_date                TEXT;
ALTER TABLE promos ADD COLUMN start_time                TEXT;
ALTER TABLE promos ADD COLUMN end_date                  TEXT;
ALTER TABLE promos ADD COLUMN end_time                  TEXT;
ALTER TABLE promos ADD COLUMN recurring                 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN days_json                 TEXT;
ALTER TABLE promos ADD COLUMN linked_menu_items_json    TEXT;
ALTER TABLE promos ADD COLUMN action_json               TEXT;
ALTER TABLE promos ADD COLUMN sponsor                   TEXT;
ALTER TABLE promos ADD COLUMN terms                     TEXT;
ALTER TABLE promos ADD COLUMN status                    TEXT NOT NULL DEFAULT 'active';