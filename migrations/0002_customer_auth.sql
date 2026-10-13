-- EatOuts schema v2 (Cloudflare D1 / SQLite)
-- Regular-user ("customer") authentication + account features.
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local
--
-- Notes:
--  * The v1 `users` table is extended in place (no rebuild) because D1 does
--    not reliably allow disabling foreign keys mid-migration. Columns are
--    therefore added as nullable; a customer row is created with an explicit
--    `type='customer'` by the signup endpoint.
--  * `email` stays NOT NULL UNIQUE from v1, so the signup endpoint supplies a
--    synthetic unique address when the user does not provide one:
--        <whatsapp>@whatsapp.eatouts
--  * Sessions stay in KV (OPS_KV); only durable account data lives here.

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------
-- Extend users with credentials + customer profile
-- ------------------------------------------------------------------
ALTER TABLE users ADD COLUMN username      TEXT;
ALTER TABLE users ADD COLUMN whatsapp      TEXT;
ALTER TABLE users ADD COLUMN password_hash TEXT;
ALTER TABLE users ADD COLUMN password_salt TEXT;
ALTER TABLE users ADD COLUMN password_iter INTEGER;
ALTER TABLE users ADD COLUMN verified      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN verified_at   INTEGER;
ALTER TABLE users ADD COLUMN photo_key     TEXT;
ALTER TABLE users ADD COLUMN type          TEXT;
ALTER TABLE users ADD COLUMN profile       TEXT;   -- JSON blob
ALTER TABLE users ADD COLUMN last_login_at INTEGER;
ALTER TABLE users ADD COLUMN updated_at    INTEGER;

-- Usernames / WhatsApp numbers are unique when present.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp) WHERE whatsapp IS NOT NULL AND whatsapp <> '';
CREATE INDEX IF NOT EXISTS idx_users_type ON users(type);

-- ------------------------------------------------------------------
-- Customer favourites (promos, restaurants, menus, items, events, gallery)
-- type: promo | restaurant | menu | item | drink | event | gallery
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favourites (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  type       TEXT NOT NULL,
  ref_id     TEXT NOT NULL,
  title      TEXT,
  subtitle   TEXT,
  price      REAL,
  image_ref  TEXT,
  venue_id   TEXT,
  payload    TEXT,           -- JSON blob for extra fields
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, type, ref_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Saved summaries (a shared/saved order or checkout summary)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_summaries (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  order_ref   TEXT,
  venue_id    TEXT,
  venue_name  TEXT,
  venue_logo  TEXT,
  item_count  INTEGER NOT NULL DEFAULT 0,
  total       REAL,
  source      TEXT,          -- whatsapp | app | manual
  payload     TEXT NOT NULL, -- JSON blob (full summary)
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Saved events (customer-saved events / event-builder drafts)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_events (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  event_ref  TEXT,
  title      TEXT,
  venue_id   TEXT,
  venue_name TEXT,
  image_ref  TEXT,
  payload    TEXT,           -- JSON blob
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, event_ref),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Customer address book
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  label      TEXT,
  district   TEXT,
  town       TEXT,
  area       TEXT,
  street     TEXT,
  address    TEXT,
  contact    TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Signup verification (WhatsApp click-to-chat confirmation + future OTP)
-- channel: whatsapp | email | manual
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verifications (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'whatsapp',
  code_hash   TEXT,
  expires_at  INTEGER,
  attempts    INTEGER NOT NULL DEFAULT 0,
  consumed_at INTEGER,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_favourites_user    ON favourites(user_id);
CREATE INDEX IF NOT EXISTS idx_favourites_user_type ON favourites(user_id, type);
CREATE INDEX IF NOT EXISTS idx_summaries_user     ON saved_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_events_user  ON saved_events(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user     ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_verifications_user ON verifications(user_id);
