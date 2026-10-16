-- EatOuts schema v7 (Cloudflare D1 / SQLite)
-- Promo quota + invoices. Business promos that are published are counted
-- per calendar month; 4th+ in a month result in a draft invoice line.
--
--   promo_submissions: + month_key, promo_id, fee_charged, billed
--   invoices: new table for tracking-only billing (no gateway)
--
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local

PRAGMA foreign_keys = ON;

ALTER TABLE promo_submissions ADD COLUMN month_key TEXT;
ALTER TABLE promo_submissions ADD COLUMN promo_id TEXT;
ALTER TABLE promo_submissions ADD COLUMN fee_charged REAL DEFAULT 0;
ALTER TABLE promo_submissions ADD COLUMN billed INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS invoices (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'promo',   -- onboarding | plan | promo
  amount        REAL NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'BWP',
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | due | paid
  reference     TEXT,
  note          TEXT,
  created_at    INTEGER NOT NULL,
  paid_at       INTEGER
);

CREATE INDEX IF NOT EXISTS idx_invoices_restaurant ON invoices(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_promo_sub_month ON promo_submissions(restaurant_id, month_key);
