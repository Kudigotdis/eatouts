-- EatOuts schema v17 (Cloudflare D1 / SQLite)
-- Venue interest tracking for the checkout WhatsApp hand-off.
--
-- WHY: The checkout screen invites people to send an order summary when a
-- venue is not participating yet. Those taps are useful sales signals, so we
-- store one row per tap and let the admin report count distinct people,
-- repeat taps, and coarse browser signals.
--
-- We deliberately do NOT store names, phone numbers, email addresses, raw
-- dates of birth, IP addresses, or raw user agents. Signed-in accounts are
-- represented by a SHA-256 hash of the user id; anonymous browsers are
-- represented by a SHA-256 hash of a locally generated visitor id.
--
-- IDEMPOTENCY: SQLite has no `ADD COLUMN IF NOT EXISTS`, so the ALTER below
-- is not re-runnable by hand. Wrangler records applied migrations in
-- d1_migrations and never re-applies one, which is the supported path.
--
-- Applied with:
--   npx wrangler d1 migrations apply eatouts --local    (npm run db:migrate:local)
--   npx wrangler d1 migrations apply eatouts --remote   (npm run db:migrate)
-- The --remote apply is the LAST step, run by a human after `git push`.

ALTER TABLE restaurants ADD COLUMN participating INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_restaurants_participating ON restaurants(participating);

CREATE TABLE IF NOT EXISTS venue_interest (
  id TEXT PRIMARY KEY,
  venue_id TEXT NOT NULL,
  venue_name TEXT,
  venue_town TEXT,
  venue_area TEXT,
  venue_status TEXT,
  person_key TEXT NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'browser',
  gender TEXT,
  age_band TEXT,
  town TEXT,
  area TEXT,
  browser_json TEXT,
  at INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'checkout'
);

CREATE INDEX IF NOT EXISTS idx_venue_interest_venue ON venue_interest(venue_id, at);
CREATE INDEX IF NOT EXISTS idx_venue_interest_person ON venue_interest(person_key, at);
CREATE INDEX IF NOT EXISTS idx_venue_interest_at ON venue_interest(at);
