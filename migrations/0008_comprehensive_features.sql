-- EatOuts schema v8 (Cloudflare D1 / SQLite)
-- Comprehensive features: business profiles, staff manager, room manager,
-- delivery management, menu/promos/events, food truck schedule, gallery,
-- system settings, invoices, notifications.
--
-- All deep frontend state objects/arrays are stored as TEXT (_json columns)
-- so JSON.stringify() round-trips without losing structure.
--
-- Applied with:  npx wrangler d1 migrations apply eatouts --remote
--                npx wrangler d1 migrations apply eatouts --local

PRAGMA foreign_keys = ON;

-- ====================================================================
-- 1. BUSINESS PROFILES & ONBOARDING
-- ====================================================================

CREATE TABLE IF NOT EXISTS business_profiles (
  id                TEXT PRIMARY KEY,
  user_id           TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  name              TEXT NOT NULL,
  description       TEXT,
  logo              TEXT,
  cover_image       TEXT,
  status            TEXT NOT NULL DEFAULT 'draft',   -- draft | published
  types_json        TEXT,                            -- JSON array
  category          TEXT,
  location_json     TEXT,                            -- JSON: district, districtName, town, area, plotNumber, streetName, streetNumber, building, landmark, lat, lng
  socials_json      TEXT,                            -- JSON: instagram, facebook, whatsapp, tiktok, youtube, twitter, website
  operating_hours_json TEXT,                        -- JSON: weekly array of {day, open, close, closed}, customSchedules array
  character_json    TEXT,                            -- JSON array: {id, name, order}
  amenities_json    TEXT,                            -- JSON array: {id, name, order}
  menu_tags_json    TEXT,                            -- JSON array: {id, name, order}
  capacity_json     TEXT,                            -- JSON array: {id, title, value, description, order}
  payments_json     TEXT,                            -- JSON array: ['Cash', 'Visa', etc.]
  reservations_json TEXT,                            -- JSON: enabled, whatsappContactId, callContactId, minimumGuests, maximumGuests, sameDay, advanceBooking, cancellationNotes
  setup_fee_paid    INTEGER NOT NULL DEFAULT 0,
  plan              TEXT,
  created_at        INTEGER NOT NULL,
  updated_at        INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_business_profiles_user     ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_slug     ON business_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_business_profiles_status   ON business_profiles(status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_created  ON business_profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_business_profiles_updated  ON business_profiles(updated_at);

CREATE TABLE IF NOT EXISTS business_contacts (
  id            TEXT PRIMARY KEY,
  business_id   TEXT NOT NULL,
  title         TEXT,
  country_code  TEXT,
  number        TEXT,
  purpose       TEXT,
  primary       INTEGER NOT NULL DEFAULT 0,
  whatsapp      INTEGER NOT NULL DEFAULT 0,
  active        INTEGER NOT NULL DEFAULT 1,
  order_index   INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_business_contacts_business ON business_contacts(business_id);
CREATE INDEX IF NOT EXISTS idx_business_contacts_active   ON business_contacts(active);

CREATE TABLE IF NOT EXISTS business_services (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL,
  name             TEXT NOT NULL,
  description      TEXT,
  price            REAL,
  pricing_type     TEXT,
  whatsapp_contact_id TEXT,
  active           INTEGER NOT NULL DEFAULT 1,
  order_index      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_business_services_business ON business_services(business_id);
CREATE INDEX IF NOT EXISTS idx_business_services_active   ON business_services(active);

CREATE TABLE IF NOT EXISTS business_users (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  role         TEXT,
  whatsapp     TEXT,
  password_hash TEXT,
  salt         TEXT,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_business_users_business ON business_users(business_id);
CREATE INDEX IF NOT EXISTS idx_business_users_email    ON business_users(email);

-- ====================================================================
-- 2. STAFF MANAGER
-- ====================================================================

CREATE TABLE IF NOT EXISTS staff (
  id                TEXT PRIMARY KEY,
  business_id       TEXT NOT NULL,
  first_name        TEXT,
  surname           TEXT,
  preferred_name    TEXT,
  employee_id       TEXT,
  dob               TEXT,
  gender            TEXT,
  nationality       TEXT,
  id_type           TEXT,
  id_number         TEXT,
  job_title         TEXT,
  department        TEXT,
  roles_json        TEXT,                            -- JSON array
  responsibilities_json TEXT,                      -- JSON array
  shift             TEXT,
  employment_type   TEXT,
  access_level      TEXT,
  salary_amount     REAL,
  salary_period     TEXT,
  pay_frequency     TEXT,
  overtime_rate     REAL,
  contact           TEXT,
  email             TEXT,
  emergency_contact TEXT,
  start_date        TEXT,
  status            TEXT,
  bank_json         TEXT,                            -- JSON: name, branch, account, payoutMethod
  attendance_json   TEXT,                            -- JSON: lastClockIn, lastClockOut, hours, breaks, lateness
  tips_json         TEXT,                            -- JSON: cash, card, poolToKitchen, net, tipPctOfSales
  performance_json  TEXT,                            -- JSON: salesDaily, avgOrderValue, tablesTurned, upsellRate, voids, ...
  kitchen_json      TEXT,                            -- JSON: pending, preparing, completedToday, avgPrepMins, efficiencyPct, wasteCost
  delivery_json     TEXT,                            -- JSON: active, completedToday, avgMins, kmWeek, rating, fuelAllowance
  security_json     TEXT,                            -- JSON: incidents, visitorLog
  payroll_json      TEXT,                            -- JSON: gross, tips, paye, bpopf, net, period
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_staff_business   ON staff(business_id);
CREATE INDEX IF NOT EXISTS idx_staff_status     ON staff(status);
CREATE INDEX IF NOT EXISTS idx_staff_employee   ON staff(employee_id);

-- ====================================================================
-- 3. ROOM MANAGER & RESERVATIONS
-- ====================================================================

CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT,
  rate        REAL,
  status      TEXT NOT NULL DEFAULT 'available',   -- available | occupied | maintenance
  housekeeping TEXT NOT NULL DEFAULT 'clean',     -- clean | needs_service | maintenance
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_rooms_business   ON rooms(business_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status     ON rooms(status);

CREATE TABLE IF NOT EXISTS reservations (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  guest        TEXT NOT NULL,
  guests       INTEGER NOT NULL,
  date         TEXT NOT NULL,
  time         TEXT NOT NULL,
  deposit      REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending',   -- pending | confirmed | cancelled | completed
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_business ON reservations(business_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status   ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_date     ON reservations(date);

-- ====================================================================
-- 4. DELIVERY MANAGEMENT
-- ====================================================================

CREATE TABLE IF NOT EXISTS delivery_slots (
  id         TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  window     TEXT NOT NULL,
  cap        INTEGER NOT NULL DEFAULT 0,
  accepted   INTEGER NOT NULL DEFAULT 0,
  route      TEXT,
  closed     INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_slots_business ON delivery_slots(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_slots_window   ON delivery_slots(window);

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name        TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'peripheral',  -- core | peripheral
  status      TEXT NOT NULL DEFAULT 'active',      -- active | off_duty | suspended
  assigned    INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_delivery_drivers_business ON delivery_drivers(business_id);
CREATE INDEX IF NOT EXISTS idx_delivery_drivers_status   ON delivery_drivers(status);

CREATE TABLE IF NOT EXISTS orders (
  id               TEXT PRIMARY KEY,
  business_id      TEXT NOT NULL,
  customer_id      TEXT,
  ref              TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'immediate',  -- immediate | scheduled
  window           TEXT,
  items_json       TEXT,                            -- JSON array
  subtotal         REAL NOT NULL DEFAULT 0,
  fee              REAL NOT NULL DEFAULT 0,
  total            REAL NOT NULL DEFAULT 0,
  area             TEXT,
  status           TEXT NOT NULL DEFAULT 'awaiting', -- awaiting | accepted | preparing | ready | delivered
  destination_json TEXT,                            -- JSON
  recipient_json   TEXT,                            -- JSON
  payment_method   TEXT,
  payment_bank     TEXT,
  driver_id        TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id),
  FOREIGN KEY (customer_id) REFERENCES users(id),
  FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_business     ON orders(business_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created      ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_driver       ON orders(driver_id);

-- ====================================================================
-- 5. MENU, PROMOS & EVENTS
-- ====================================================================

CREATE TABLE IF NOT EXISTS menu_categories (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  name         TEXT NOT NULL,
  icon         TEXT,
  description  TEXT,
  visible      INTEGER NOT NULL DEFAULT 1,
  order_index  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_menu_categories_business ON menu_categories(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_categories_visible  ON menu_categories(visible);

CREATE TABLE IF NOT EXISTS menu_items (
  id                 TEXT PRIMARY KEY,
  business_id        TEXT NOT NULL,
  category_id        TEXT,
  name               TEXT NOT NULL,
  type               TEXT,
  description        TEXT,
  image              TEXT,
  base_price         REAL,
  preparation_minutes INTEGER,
  status             TEXT NOT NULL DEFAULT 'active',
  tags_json          TEXT,                            -- JSON array
  variants_json      TEXT,                            -- JSON array
  modifier_groups_json TEXT,                        -- JSON array
  order_index        INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id),
  FOREIGN KEY (category_id) REFERENCES menu_categories(id)
);

CREATE INDEX IF NOT EXISTS idx_menu_items_business     ON menu_items(business_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category     ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_status       ON menu_items(status);

CREATE TABLE IF NOT EXISTS promos (
  id                 TEXT PRIMARY KEY,
  business_id        TEXT NOT NULL,
  title              TEXT NOT NULL,
  image              TEXT,
  type               TEXT,
  description        TEXT,
  original_price     REAL,
  promo_price        REAL,
  location_json      TEXT,                            -- JSON
  start_date         TEXT,
  start_time         TEXT,
  end_date           TEXT,
  end_time           TEXT,
  recurring          INTEGER NOT NULL DEFAULT 0,
  days_json          TEXT,                            -- JSON array
  linked_menu_items_json TEXT,                      -- JSON array
  action_json        TEXT,                            -- JSON
  sponsor            TEXT,
  terms              TEXT,
  status             TEXT NOT NULL DEFAULT 'draft', -- draft | active | expired
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_promos_business   ON promos(business_id);
CREATE INDEX IF NOT EXISTS idx_promos_status     ON promos(status);
CREATE INDEX IF NOT EXISTS idx_promos_created    ON promos(created_at);

CREATE TABLE IF NOT EXISTS events (
  id                 TEXT PRIMARY KEY,
  business_id        TEXT NOT NULL,
  name               TEXT NOT NULL,
  type               TEXT,
  cover_image        TEXT,
  description        TEXT,
  organizer          TEXT,
  sponsor            TEXT,
  location_json      TEXT,                            -- JSON
  start_date         TEXT,
  start_time         TEXT,
  end_date           TEXT,
  end_time           TEXT,
  recurring          INTEGER NOT NULL DEFAULT 0,
  recurrence_json    TEXT,                            -- JSON
  expected_guests    INTEGER,
  max_capacity       INTEGER,
  admission          TEXT,
  ticket_price       REAL,
  booking_contact_id TEXT,
  performances_json  TEXT,                            -- JSON array
  service_ids_json   TEXT,                            -- JSON array
  rsvp_enabled       INTEGER NOT NULL DEFAULT 0,
  rsvp_contact_id    TEXT,
  rsvp_max           INTEGER,
  status             TEXT NOT NULL DEFAULT 'draft', -- draft | published | cancelled
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_events_business   ON events(business_id);
CREATE INDEX IF NOT EXISTS idx_events_status     ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_created    ON events(created_at);

CREATE TABLE IF NOT EXISTS performers (
  id             TEXT PRIMARY KEY,
  business_id    TEXT NOT NULL,
  stage_name     TEXT NOT NULL,
  full_name      TEXT,
  type           TEXT,
  genre          TEXT,
  sub_genre      TEXT,
  bio            TEXT,
  description    TEXT,
  years_active   INTEGER,
  location       TEXT,
  instagram      TEXT,
  tiktok         TEXT,
  website        TEXT,
  contact        TEXT,
  whatsapp       TEXT,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_performers_business ON performers(business_id);

-- ====================================================================
-- 6. FOOD TRUCK SCHEDULE & GALLERY
-- ====================================================================

CREATE TABLE IF NOT EXISTS schedule_weekly (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  day         TEXT NOT NULL,                        -- mon | tue | wed | thu | fri | sat | sun
  location_json TEXT,                               -- JSON
  start_time  TEXT,
  end_time    TEXT,
  status      TEXT NOT NULL DEFAULT 'active',
  notes       TEXT,
  live_now    INTEGER NOT NULL DEFAULT 0,
  live_set_at INTEGER,
  backup      INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_weekly_business ON schedule_weekly(business_id);
CREATE INDEX IF NOT EXISTS idx_schedule_weekly_day      ON schedule_weekly(day);

CREATE TABLE IF NOT EXISTS schedule_substitutions (
  id             TEXT PRIMARY KEY,
  business_id    TEXT NOT NULL,
  date           TEXT NOT NULL,
  original_day   TEXT,
  override_json  TEXT,                              -- JSON
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_substitutions_business ON schedule_substitutions(business_id);
CREATE INDEX IF NOT EXISTS idx_schedule_substitutions_date     ON schedule_substitutions(date);

CREATE TABLE IF NOT EXISTS gallery_groups (
  id           TEXT PRIMARY KEY,
  business_id  TEXT NOT NULL,
  title        TEXT NOT NULL,
  cover_image_id TEXT,
  visible      INTEGER NOT NULL DEFAULT 1,
  order_index  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_groups_business ON gallery_groups(business_id);
CREATE INDEX IF NOT EXISTS idx_gallery_groups_visible  ON gallery_groups(visible);

CREATE TABLE IF NOT EXISTS gallery_images (
  id          TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  group_id    TEXT,
  src         TEXT NOT NULL,
  label       TEXT,
  visible     INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (business_id) REFERENCES business_profiles(id),
  FOREIGN KEY (group_id) REFERENCES gallery_groups(id)
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_business ON gallery_images(business_id);
CREATE INDEX IF NOT EXISTS idx_gallery_images_group    ON gallery_images(group_id);

-- ====================================================================
-- 7. SYSTEM & ANALYTICS
-- ====================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id        TEXT PRIMARY KEY,
  key       TEXT NOT NULL UNIQUE,
  value_json TEXT,                                   -- JSON
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Extend invoices (created in v7) with business-profile billing columns.
ALTER TABLE invoices ADD COLUMN business_id TEXT;
ALTER TABLE invoices ADD COLUMN number TEXT;
ALTER TABLE invoices ADD COLUMN venue TEXT;
ALTER TABLE invoices ADD COLUMN contact TEXT;
ALTER TABLE invoices ADD COLUMN tier TEXT;
ALTER TABLE invoices ADD COLUMN setup_fee REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN monthly_fee REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN total REAL DEFAULT 0;
ALTER TABLE invoices ADD COLUMN issue_date TEXT;
ALTER TABLE invoices ADD COLUMN due_date TEXT;
ALTER TABLE invoices ADD COLUMN billing_month TEXT;
ALTER TABLE invoices ADD COLUMN bank_json TEXT;       -- JSON

CREATE INDEX IF NOT EXISTS idx_invoices_business    ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_billing_month ON invoices(billing_month);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  segment    TEXT,
  title      TEXT,
  message    TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
