-- EatOuts schema v3 (Cloudflare D1 / SQLite)
-- Promoted-event submissions queued for admin review (the P50 promo listing).
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local
--
-- A customer builds an event in eatout_event_builder.html and taps
-- "Promote Event · P50". That creates a row here with status='pending'.
-- An admin reviews it in the dashboard and moves it through
-- pending -> approved -> published (or rejected). Publishing is what makes
-- the event appear under the Promos feed.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS promo_submissions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  event_ref   TEXT,
  title       TEXT,
  venue_id    TEXT,
  venue_name  TEXT,
  when_text   TEXT,
  summary     TEXT,
  image_ref   TEXT,
  fee         REAL NOT NULL DEFAULT 50,
  currency    TEXT NOT NULL DEFAULT 'BWP',
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | approved | published | rejected
  admin_note  TEXT,
  payload     TEXT,           -- JSON blob (full event payload)
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_promo_sub_status   ON promo_submissions(status);
CREATE INDEX IF NOT EXISTS idx_promo_sub_user     ON promo_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_sub_created  ON promo_submissions(created_at);
