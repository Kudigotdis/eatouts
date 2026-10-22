-- EatOuts schema v13 (Cloudflare D1 / SQLite)
-- Normalise the six venue-content tables onto the canonical owner key.
--
-- Applied with:
--   npx wrangler d1 execute eatouts --file migrations/0013_canonical_restaurant_columns.sql --remote
--
-- The problem
-- -----------
-- Every endpoint that reads or writes venue content keys the row off
-- `restaurant_id` -> restaurants(id):
--
--   functions/api/venues/[id].js          the public venue bundle
--   functions/api/business/promos.js       + promos/[id].js
--   functions/api/business/menu/*.js
--   functions/api/business/gallery/*.js
--   functions/api/business/events.js       + events/[id].js
--   functions/api/business/mine.js         creates restaurants + memberships
--
-- But migration 0008 created promos / menu_categories / menu_items /
-- gallery_groups / gallery_images / events with `business_id` pointing
-- at business_profiles(id). That is a different id space from
-- restaurants(id): a business_profiles row is never a restaurants row,
-- so the two can never be joined.
--
-- The effect in production was that GET /api/venues/:id threw
-- "no such column: restaurant_id" and answered HTTP 500 for every
-- single venue, and every operator write to those tables failed the
-- same way.
--
-- What this migration does
-- ------------------------
-- Step 1  ADD COLUMN the canonical columns the endpoints use, so the
--         table shape no longer depends on which schema created it.
-- Step 2  Build the rebuilt tables alongside the old ones and copy the
--         rows across.
-- Step 3  Drop the old tables, children before parents.
-- Step 4  Rename the rebuilt tables into place, parents before children.
-- Step 5  Recreate the indexes.
--
-- Two details make the rebuild safe when the tables still hold rows:
--
--   * The rebuilt child tables point their foreign key at the parent's
--     temporary name (gallery_groups_v13, menu_categories_v13). SQLite
--     rewrites those references when the parent is renamed in step 4,
--     so dropping the old parent in step 3 never orphans a child row.
--
--   * Every column any endpoint touches survives the rebuild, including
--     the newer `image` / `status` pair on promos, so both the operator
--     tools and the public venue bundle work off the same table.
--
-- `business_id` is dropped: it is a pointer into a model the app does
-- not use, and nothing reads it.

PRAGMA defer_foreign_keys = ON;

-- =====================================================================
-- Step 1 - make the canonical columns exist
-- =====================================================================

-- menu_categories
ALTER TABLE menu_categories ADD COLUMN restaurant_id TEXT;
ALTER TABLE menu_categories ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_categories ADD COLUMN created_at INTEGER;

-- menu_items
ALTER TABLE menu_items ADD COLUMN restaurant_id TEXT;
ALTER TABLE menu_items ADD COLUMN price REAL;
ALTER TABLE menu_items ADD COLUMN currency TEXT;
ALTER TABLE menu_items ADD COLUMN image_key TEXT;
ALTER TABLE menu_items ADD COLUMN visible INTEGER NOT NULL DEFAULT 1;
ALTER TABLE menu_items ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE menu_items ADD COLUMN created_at INTEGER;
ALTER TABLE menu_items ADD COLUMN updated_at INTEGER;

-- gallery_groups
ALTER TABLE gallery_groups ADD COLUMN restaurant_id TEXT;
ALTER TABLE gallery_groups ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_groups ADD COLUMN created_at INTEGER;

-- gallery_images
ALTER TABLE gallery_images ADD COLUMN restaurant_id TEXT;
ALTER TABLE gallery_images ADD COLUMN image_key TEXT NOT NULL DEFAULT '';
ALTER TABLE gallery_images ADD COLUMN position INTEGER NOT NULL DEFAULT 0;
ALTER TABLE gallery_images ADD COLUMN created_at INTEGER;

-- promos
ALTER TABLE promos ADD COLUMN restaurant_id TEXT;
ALTER TABLE promos ADD COLUMN details TEXT;
ALTER TABLE promos ADD COLUMN image_key TEXT;
ALTER TABLE promos ADD COLUMN active INTEGER NOT NULL DEFAULT 0;
ALTER TABLE promos ADD COLUMN starts_at INTEGER;
ALTER TABLE promos ADD COLUMN ends_at INTEGER;

-- events
ALTER TABLE events ADD COLUMN restaurant_id TEXT;
ALTER TABLE events ADD COLUMN title TEXT NOT NULL DEFAULT '';
ALTER TABLE events ADD COLUMN figure TEXT;
ALTER TABLE events ADD COLUMN image_key TEXT;
ALTER TABLE events ADD COLUMN starts_at INTEGER;
ALTER TABLE events ADD COLUMN ends_at INTEGER;
ALTER TABLE events ADD COLUMN published INTEGER NOT NULL DEFAULT 0;

-- =====================================================================
-- Step 2 - build the rebuilt tables and copy the rows across
-- =====================================================================

-- ---------------------------------------------------------------------
-- promos
-- ---------------------------------------------------------------------
CREATE TABLE promos_v13 (
  id                     TEXT PRIMARY KEY,
  restaurant_id          TEXT,
  title                  TEXT NOT NULL,
  details                TEXT,
  image_key              TEXT,
  image                  TEXT,
  type                   TEXT,
  description            TEXT,
  original_price         REAL,
  promo_price            REAL,
  location_json          TEXT,
  start_date             TEXT,
  start_time             TEXT,
  end_date               TEXT,
  end_time               TEXT,
  recurring              INTEGER NOT NULL DEFAULT 0,
  days_json              TEXT,
  linked_menu_items_json TEXT,
  action_json            TEXT,
  sponsor                TEXT,
  terms                  TEXT,
  status                 TEXT NOT NULL DEFAULT 'draft',
  active                 INTEGER NOT NULL DEFAULT 0,
  starts_at              INTEGER,
  ends_at                INTEGER,
  age_restricted         INTEGER NOT NULL DEFAULT 0,
  created_at             INTEGER NOT NULL,
  updated_at             INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

INSERT INTO promos_v13 (
  id, restaurant_id, title, details, image_key, image, type, description,
  original_price, promo_price, location_json, start_date, start_time,
  end_date, end_time, recurring, days_json, linked_menu_items_json,
  action_json, sponsor, terms, status, active, starts_at, ends_at,
  age_restricted, created_at, updated_at
)
SELECT
  id, restaurant_id, title, details, image_key, image, type, description,
  original_price, promo_price, location_json, start_date, start_time,
  end_date, end_time, recurring, days_json, linked_menu_items_json,
  action_json, sponsor, terms, status, active, starts_at, ends_at,
  age_restricted, created_at, updated_at
FROM promos;

-- ---------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------
CREATE TABLE events_v13 (
  id                 TEXT PRIMARY KEY,
  restaurant_id      TEXT,
  title              TEXT NOT NULL DEFAULT '',
  name               TEXT,
  type               TEXT,
  cover_image        TEXT,
  image_key          TEXT,
  description        TEXT,
  figure             TEXT,
  organizer          TEXT,
  sponsor            TEXT,
  location_json      TEXT,
  start_date         TEXT,
  start_time         TEXT,
  end_date           TEXT,
  end_time           TEXT,
  starts_at          INTEGER,
  ends_at            INTEGER,
  recurring          INTEGER NOT NULL DEFAULT 0,
  recurrence_json    TEXT,
  expected_guests    INTEGER,
  max_capacity       INTEGER,
  admission          TEXT,
  ticket_price       REAL,
  booking_contact_id TEXT,
  performances_json  TEXT,
  service_ids_json   TEXT,
  rsvp_enabled       INTEGER NOT NULL DEFAULT 0,
  rsvp_contact_id    TEXT,
  rsvp_max           INTEGER,
  published          INTEGER NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'draft',
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

INSERT INTO events_v13 (
  id, restaurant_id, title, name, type, cover_image, image_key, description,
  figure, organizer, sponsor, location_json, start_date, start_time,
  end_date, end_time, starts_at, ends_at, recurring, recurrence_json,
  expected_guests, max_capacity, admission, ticket_price,
  booking_contact_id, performances_json, service_ids_json, rsvp_enabled,
  rsvp_contact_id, rsvp_max, published, status, created_at, updated_at
)
SELECT
  id, restaurant_id, title, name, type, cover_image, image_key, description,
  figure, organizer, sponsor, location_json, start_date, start_time,
  end_date, end_time, starts_at, ends_at, recurring, recurrence_json,
  expected_guests, max_capacity, admission, ticket_price,
  booking_contact_id, performances_json, service_ids_json, rsvp_enabled,
  rsvp_contact_id, rsvp_max, published, status, created_at, updated_at
FROM events;

-- ---------------------------------------------------------------------
-- gallery_groups
-- ---------------------------------------------------------------------
CREATE TABLE gallery_groups_v13 (
  id             TEXT PRIMARY KEY,
  restaurant_id  TEXT,
  title          TEXT NOT NULL,
  cover_image_id TEXT,
  visible        INTEGER NOT NULL DEFAULT 1,
  position       INTEGER NOT NULL DEFAULT 0,
  order_index    INTEGER NOT NULL DEFAULT 0,
  created_at     INTEGER,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

INSERT INTO gallery_groups_v13 (
  id, restaurant_id, title, cover_image_id, visible, position, order_index,
  created_at
)
SELECT id, restaurant_id, title, cover_image_id, visible, position,
       order_index, created_at
FROM gallery_groups;

-- ---------------------------------------------------------------------
-- gallery_images
-- The foreign key points at gallery_groups_v13; SQLite rewrites it to
-- gallery_groups when that table is renamed in step 4.
-- ---------------------------------------------------------------------
CREATE TABLE gallery_images_v13 (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT,
  group_id      TEXT,
  image_key     TEXT NOT NULL DEFAULT '',
  src           TEXT,
  label         TEXT,
  visible       INTEGER NOT NULL DEFAULT 1,
  position      INTEGER NOT NULL DEFAULT 0,
  order_index   INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (group_id) REFERENCES gallery_groups_v13(id)
);

INSERT INTO gallery_images_v13 (
  id, restaurant_id, group_id, image_key, src, label, visible, position,
  order_index, created_at
)
SELECT id, restaurant_id, group_id, image_key, src, label, visible, position,
       order_index, created_at
FROM gallery_images;

-- ---------------------------------------------------------------------
-- menu_categories
-- ---------------------------------------------------------------------
CREATE TABLE menu_categories_v13 (
  id            TEXT PRIMARY KEY,
  restaurant_id TEXT,
  name          TEXT NOT NULL,
  icon          TEXT,
  description   TEXT,
  position      INTEGER NOT NULL DEFAULT 0,
  order_index   INTEGER NOT NULL DEFAULT 0,
  visible       INTEGER NOT NULL DEFAULT 1,
  created_at    INTEGER,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id)
);

INSERT INTO menu_categories_v13 (
  id, restaurant_id, name, icon, description, position, order_index, visible,
  created_at
)
SELECT id, restaurant_id, name, icon, description, position, order_index,
       visible, created_at
FROM menu_categories;

-- ---------------------------------------------------------------------
-- menu_items
-- The foreign key points at menu_categories_v13; SQLite rewrites it to
-- menu_categories when that table is renamed in step 4.
-- ---------------------------------------------------------------------
CREATE TABLE menu_items_v13 (
  id                   TEXT PRIMARY KEY,
  restaurant_id        TEXT,
  category_id          TEXT,
  name                 TEXT NOT NULL,
  type                 TEXT,
  description          TEXT,
  image                TEXT,
  image_key            TEXT,
  price                REAL,
  base_price           REAL,
  currency             TEXT,
  preparation_minutes  INTEGER,
  visible              INTEGER NOT NULL DEFAULT 1,
  position             INTEGER NOT NULL DEFAULT 0,
  order_index          INTEGER NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'active',
  tags_json            TEXT,
  variants_json        TEXT,
  modifier_groups_json TEXT,
  created_at           INTEGER,
  updated_at           INTEGER,
  FOREIGN KEY (restaurant_id) REFERENCES restaurants(id),
  FOREIGN KEY (category_id) REFERENCES menu_categories_v13(id)
);

INSERT INTO menu_items_v13 (
  id, restaurant_id, category_id, name, type, description, image, image_key,
  price, base_price, currency, preparation_minutes, visible, position,
  order_index, status, tags_json, variants_json, modifier_groups_json,
  created_at, updated_at
)
SELECT
  id, restaurant_id, category_id, name, type, description, image, image_key,
  price, base_price, currency, preparation_minutes, visible, position,
  order_index, status, tags_json, variants_json, modifier_groups_json,
  created_at, updated_at
FROM menu_items;

-- =====================================================================
-- Step 3 - drop the old tables, children before parents
-- =====================================================================
DROP TABLE gallery_images;
DROP TABLE menu_items;
DROP TABLE promos;
DROP TABLE events;
DROP TABLE gallery_groups;
DROP TABLE menu_categories;

-- =====================================================================
-- Step 4 - put the rebuilt tables in place, parents before children
-- =====================================================================
ALTER TABLE gallery_groups_v13 RENAME TO gallery_groups;
ALTER TABLE menu_categories_v13 RENAME TO menu_categories;
ALTER TABLE gallery_images_v13 RENAME TO gallery_images;
ALTER TABLE menu_items_v13 RENAME TO menu_items;
ALTER TABLE promos_v13 RENAME TO promos;
ALTER TABLE events_v13 RENAME TO events;

-- =====================================================================
-- Step 5 - recreate the indexes
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_promos_restaurant        ON promos(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_promos_status            ON promos(status);
CREATE INDEX IF NOT EXISTS idx_promos_created           ON promos(created_at);
CREATE INDEX IF NOT EXISTS idx_events_restaurant        ON events(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_events_status            ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created           ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_gallery_groups_restaurant ON gallery_groups(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_gallery_groups_visible    ON gallery_groups(visible);
CREATE INDEX IF NOT EXISTS idx_gallery_images_restaurant ON gallery_images(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_group     ON gallery_images(group_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_visible    ON menu_categories(visible);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant    ON menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category      ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status        ON menu_items(status);
