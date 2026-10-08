-- EatOuts schema v1 (Cloudflare D1 / SQLite)
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
-- Local:         npx wrangler d1 migrations apply eatouts --local

PRAGMA foreign_keys = ON;

-- ------------------------------------------------------------------
-- Accounts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  name        TEXT,
  status      TEXT NOT NULL DEFAULT 'active',   -- active | disabled
  is_admin    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

-- ------------------------------------------------------------------
-- Venues (claimable directory records + owner-created restaurants)
-- status: unclaimed | claimed | draft | published | suspended
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS restaurants (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'unclaimed',
  plan          TEXT NOT NULL DEFAULT 'starter', -- starter | growth | pro
  claimed       INTEGER NOT NULL DEFAULT 0,
  town          TEXT,
  district      TEXT,
  district_name TEXT,
  area          TEXT,
  landmark      TEXT,
  description   TEXT,
  website       TEXT,
  logo_ref      TEXT,      -- asset path or R2 key
  cover_ref     TEXT,
  types         TEXT,      -- JSON array
  category      TEXT,
  contacts      TEXT,      -- JSON array
  socials       TEXT,      -- JSON array
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

-- ------------------------------------------------------------------
-- Team membership (user <-> restaurant, with a role)
-- role: owner | manager | menu_manager | marketing_manager
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL,
  restaurant_id TEXT NOT NULL,
  role          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    INTEGER NOT NULL,
  UNIQUE (user_id, restaurant_id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS invites (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          TEXT NOT NULL,
  token         TEXT NOT NULL UNIQUE,
  invited_by    TEXT,
  expires_at    INTEGER NOT NULL,
  accepted_at   INTEGER,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS claims (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  evidence      TEXT,
  reviewed_by   TEXT,
  reviewed_at   INTEGER,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------------
-- Billing (manual for now: an admin marks setup/plan paid)
-- status: unpaid | active | past_due | cancelled
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  restaurant_id      TEXT PRIMARY KEY,
  plan               TEXT NOT NULL DEFAULT 'starter',
  status             TEXT NOT NULL DEFAULT 'unpaid',
  setup_paid_at      INTEGER,
  current_period_end INTEGER,
  marked_paid_by     TEXT,
  marked_paid_at     INTEGER,
  updated_at         INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- ------------------------------------------------------------------
-- Content
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS menu_categories (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  name          TEXT NOT NULL,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS menu_items (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  category_id   TEXT,
  name          TEXT NOT NULL,
  description   TEXT,
  price         REAL,
  currency      TEXT DEFAULT 'BWP',
  image_key     TEXT,
  visible       INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS gallery_groups (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title         TEXT NOT NULL,
  visible       INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS gallery_images (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  group_id      TEXT,
  image_key     TEXT NOT NULL,
  label         TEXT,
  visible       INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS promos (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title         TEXT NOT NULL,
  details       TEXT,
  image_key     TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  starts_at     INTEGER,
  ends_at       INTEGER,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

CREATE TABLE IF NOT EXISTS events (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  figure        TEXT,      -- JSON blob (lineup, schedule, etc.)
  image_key     TEXT,
  admission     TEXT,
  starts_at     INTEGER,
  ends_at       INTEGER,
  published     INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

-- ------------------------------------------------------------------
-- Audit
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id            TEXT PRIMARY KEY,
  actor_user_id TEXT,
  restaurant_id TEXT,
  action        TEXT NOT NULL,
  meta          TEXT,
  created_at    INTEGER NOT NULL
);

-- ------------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_restaurants_status        ON restaurants(status);
CREATE INDEX IF NOT EXISTS idx_restaurants_town          ON restaurants(town);
CREATE INDEX IF NOT EXISTS idx_memberships_user          ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_restaurant    ON memberships(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant     ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_restaurant ON gallery_images(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promos_restaurant         ON promos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_claims_status             ON claims(status);
CREATE INDEX IF NOT EXISTS idx_invites_token             ON invites(token);