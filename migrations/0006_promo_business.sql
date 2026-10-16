-- EatOuts schema v6 (Cloudflare D1 / SQLite)
-- Business-submitted promos join the same admin moderation queue as customer
-- event promotions (see 0003_promo_submissions.sql). A business promo is NEVER
-- published directly: it is queued with status='pending' and only goes live once
-- an admin approves/publishes it in the dashboard.
--
--   restaurant_id  -> the venue the promo belongs to (NULL for customer submissions)
--   source         -> 'business' | 'customer'
--
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local

PRAGMA foreign_keys = ON;

ALTER TABLE promo_submissions ADD COLUMN restaurant_id TEXT;
ALTER TABLE promo_submissions ADD COLUMN source TEXT NOT NULL DEFAULT 'customer';

CREATE INDEX IF NOT EXISTS idx_promo_sub_restaurant ON promo_submissions(restaurant_id);
