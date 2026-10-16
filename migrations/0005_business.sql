-- EatOuts schema v5 (Cloudflare D1 / SQLite)
-- Business profile fields + media ownership tracking.
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local
--
-- Notes:
--  * The v1 `restaurants` table is extended in place with the freshly
--    editable business-profile fields the onboarding / profile endpoints
--    write. JSON columns store structured blobs (hours, features).
--  * `media` records every uploaded asset (Supabase storage url + key) so a
--    venue's gallery/menu/logo/event images can be listed and cleaned up.

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------
-- Extend restaurants with editable profile fields
-- ------------------------------------------------------------------
ALTER TABLE restaurants ADD COLUMN hours         TEXT;                        -- JSON: [{day,open,close,closed}]
ALTER TABLE restaurants ADD COLUMN price_range   TEXT;                        -- e.g. 'P' | 'PP' | 'PPP'
ALTER TABLE restaurants ADD COLUMN features      TEXT;                        -- JSON array of amenity keys
ALTER TABLE restaurants ADD COLUMN verified      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE restaurants ADD COLUMN verified_at   INTEGER;
ALTER TABLE restaurants ADD COLUMN published_at  INTEGER;

-- ------------------------------------------------------------------
-- Media (Supabase storage assets owned by a user and/or restaurant)
-- kind: logo | cover | menu | gallery | event | promo | profile
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media (
  id            TEXT PRIMARY KEY,
  owner_user_id TEXT,
  restaurant_id TEXT,
  kind          TEXT,
  url           TEXT NOT NULL,
  storage_key   TEXT,
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE INDEX IF NOT EXISTS idx_media_restaurant ON media(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_media_owner      ON media(owner_user_id);
