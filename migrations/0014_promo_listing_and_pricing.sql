-- EatOuts schema v14 (Cloudflare D1 / SQLite)
-- Promo listing, active-day pricing and the business-type anchor.
--
-- Applied with:
--   npx wrangler d1 execute eatouts --local  --file migrations/0014_promo_listing_and_pricing.sql
--   npx wrangler@4 d1 execute eatouts --remote --file migrations/0014_promo_listing_and_pricing.sql
--
-- Purely additive. Every column is nullable or has a constant default, so
-- no table rebuild is required and existing rows survive untouched.
--
-- What this migration adds
-- ------------------------
-- promos            the fields the Promos tab and the priced workflow need
-- promo_submissions the locked quote + payment state
-- invoices          the promo / submission the invoice is for
-- restaurants       the business type slug (the hub + dashboard routing key)
--
-- Notes
-- -----
-- * `promos.restaurant_id` is the venue the promo belongs to (already in
--   0013). The quota is per venue, keyed on that column.
-- * `billable_days` is the Rule A active-day count, not the calendar span.
-- * `quota_month` is `YYYY-MM` - the month the promo was counted against.
-- * `promo_submissions.quoted_free = 1` means the submission consumed free
--   days. The allowance is the sum of `quoted_days` over the rows where
--   `quoted_free = 1` and `status` is pending / approved / published.
-- * `promo_submissions.billed` (0007) is repurposed as "the invoice is
--   settled"; `payment_status` is the authoritative field.
-- * `promos.fee_charged` / `promos.payment_status` mirror the submission so
--   the public feed never has to join.

-- =====================================================================
-- promos - listing shape + locked quote
-- =====================================================================
ALTER TABLE promos ADD COLUMN category        TEXT;
ALTER TABLE promos ADD COLUMN subtype        TEXT;
ALTER TABLE promos ADD COLUMN promo_family    TEXT;
ALTER TABLE promos ADD COLUMN content_format  TEXT NOT NULL DEFAULT 'offer';
ALTER TABLE promos ADD COLUMN mechanic        TEXT;
ALTER TABLE promos ADD COLUMN audience        TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE promos ADD COLUMN brand           TEXT;
ALTER TABLE promos ADD COLUMN billable_days   INTEGER NOT NULL DEFAULT 1;
ALTER TABLE promos ADD COLUMN quota_month     TEXT;
ALTER TABLE promos ADD COLUMN submission_id   TEXT;
ALTER TABLE promos ADD COLUMN payment_status  TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE promos ADD COLUMN invoice_id      TEXT;
ALTER TABLE promos ADD COLUMN fee_charged     REAL NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN currency        TEXT NOT NULL DEFAULT 'BWP';
ALTER TABLE promos ADD COLUMN cta_type        TEXT;
ALTER TABLE promos ADD COLUMN cta_url         TEXT;
ALTER TABLE promos ADD COLUMN cross_post_event INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN submitted_at    INTEGER;
ALTER TABLE promos ADD COLUMN published_at    INTEGER;

CREATE INDEX IF NOT EXISTS idx_promos_category   ON promos(category);
CREATE INDEX IF NOT EXISTS idx_promos_active_day ON promos(active, status, published_at);
CREATE INDEX IF NOT EXISTS idx_promos_submission ON promos(submission_id);
CREATE INDEX IF NOT EXISTS idx_promos_quota      ON promos(restaurant_id, quota_month);

-- =====================================================================
-- promo_submissions - locked quote + payment
-- =====================================================================
ALTER TABLE promo_submissions ADD COLUMN quoted_days    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_submissions ADD COLUMN quoted_free    INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_submissions ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'not_required';
ALTER TABLE promo_submissions ADD COLUMN invoice_id     TEXT;
ALTER TABLE promo_submissions ADD COLUMN promo_draft_id TEXT;
ALTER TABLE promo_submissions ADD COLUMN admin_override INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promo_submissions ADD COLUMN reviewed_at    INTEGER;

CREATE INDEX IF NOT EXISTS idx_promo_sub_promo ON promo_submissions(promo_id);
CREATE INDEX IF NOT EXISTS idx_promo_sub_status ON promo_submissions(status);

-- =====================================================================
-- invoices - the promo the invoice is for
-- =====================================================================
ALTER TABLE invoices ADD COLUMN promo_id      TEXT;
ALTER TABLE invoices ADD COLUMN submission_id TEXT;
ALTER TABLE invoices ADD COLUMN due_at        INTEGER;

CREATE INDEX IF NOT EXISTS idx_invoices_promo ON invoices(promo_id);

-- =====================================================================
-- restaurants - the business type slug
-- =====================================================================
ALTER TABLE restaurants ADD COLUMN type TEXT;

-- Backfill the rows we can prove from the existing branch vocabulary.
UPDATE restaurants SET type = 'bottlestore'
  WHERE type IS NULL AND (
    LOWER(IFNULL(category, '')) LIKE '%bottle%'
    OR LOWER(IFNULL(types, '')) LIKE '%bottle%'
    OR LOWER(IFNULL(types, '')) LIKE '%liquor%'
  );

UPDATE restaurants SET type = 'bakery'
  WHERE type IS NULL AND (
    LOWER(IFNULL(category, '')) LIKE '%bakery%'
    OR LOWER(IFNULL(category, '')) LIKE '%bake%'
    OR LOWER(IFNULL(types, '')) LIKE '%bakery%'
  );

UPDATE restaurants SET type = 'caterer'
  WHERE type IS NULL AND (
    LOWER(IFNULL(category, '')) LIKE '%cater%'
    OR LOWER(IFNULL(types, '')) LIKE '%cater%'
  );

UPDATE restaurants SET type = 'foodtruck'
  WHERE type IS NULL AND (
    LOWER(IFNULL(category, '')) LIKE '%mobile%'
    OR LOWER(IFNULL(category, '')) LIKE '%food truck%'
    OR LOWER(IFNULL(types, '')) LIKE '%food truck%'
    OR LOWER(IFNULL(types, '')) LIKE '%mobile kitchen%'
  );

UPDATE restaurants SET type = 'supplier'
  WHERE type IS NULL AND (
    LOWER(IFNULL(category, '')) LIKE '%supplier%'
    OR LOWER(IFNULL(types, '')) LIKE '%supplier%'
    OR LOWER(IFNULL(category, '')) LIKE '%event service%'
  );

-- Everything else is a restaurant (or a lodge, which has the same
-- dashboard story as a restaurant for now). Defaulting keeps the hub and
-- the routing total; the admin dashboard flags the defaulted rows.
UPDATE restaurants SET type = 'restaurant' WHERE type IS NULL;
