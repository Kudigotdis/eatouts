-- EatOuts schema v4 (Cloudflare D1 / SQLite)
-- Public business links:  www.eatouts.online/<country>/<slug>
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local
--
-- One country-scoped namespace shared by restaurants, bottle/liquor stores
-- and event suppliers. Every listing gets an auto row (seeded from the
-- generated registry); an owner who claims a business may set a custom slug.
-- Changing a slug keeps a "redirect" row behind so old shared links 301 to
-- the new one.
--
--   status:
--     active    -> resolves to (type, ref_id)
--     pending   -> reserved but not yet live
--     redirect  -> old slug; redirect_to holds the live slug
--     revoked   -> disabled by an admin
--
-- Uniqueness is per (country_code, slug): the SAME slug may exist under
-- different country codes (bw/, za/, ...), but not twice within one.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS business_links (
  id           TEXT PRIMARY KEY,
  country_code TEXT NOT NULL DEFAULT 'bw',
  slug         TEXT NOT NULL,             -- canonical lowercase, [a-z0-9.]
  type         TEXT NOT NULL,             -- restaurant | bottlestore | supplier
  ref_id       TEXT NOT NULL,             -- rest_<slug> | <store/brand id> | <supplier id>
  display_slug TEXT,                      -- owner-preferred capitalization (display only)
  name         TEXT,
  status       TEXT NOT NULL DEFAULT 'active',
  redirect_to  TEXT,                      -- live slug when status='redirect'
  claimed_by   TEXT,                      -- user id that claimed the custom slug
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bl_country_slug ON business_links(country_code, slug);
CREATE INDEX IF NOT EXISTS idx_bl_ref            ON business_links(type, ref_id);
CREATE INDEX IF NOT EXISTS idx_bl_claimed        ON business_links(claimed_by);
CREATE INDEX IF NOT EXISTS idx_bl_status         ON business_links(status);
