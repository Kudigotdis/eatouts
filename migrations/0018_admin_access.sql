-- EatOuts schema v18 (Cloudflare D1 / SQLite)
-- Phase 3 (admin exception) + Phase 7 (structured denial logging).
--
-- WHY: the site is geo-gated to Botswana. One admin works from Zimbabwe and
-- needs a persistent-but-revocable exception; every denial also has to be
-- attributable so false positives against real Botswana visitors can be
-- spotted quickly.
--
-- PRIVACY (same stance as 0017_venue_interest.sql): no raw IP addresses, no
-- raw user agents and no phone numbers are stored. Identifiers are SHA-256
-- hashes. The bypass/device tokens are HMAC-signed cookies and are never
-- written to the database at all.
--
-- IDEMPOTENCY: every statement below is CREATE ... IF NOT EXISTS, so this file
-- is re-runnable. Wrangler still records applied migrations in d1_migrations
-- and never re-applies one, which is the supported path.
--
-- Applied with:
--   npx wrangler d1 migrations apply eatouts --local    (npm run db:migrate:local)
--   npx wrangler d1 migrations apply eatouts --remote   (npm run db:migrate)
-- The --remote apply is the LAST step, run by a human after `git push`.

PRAGMA foreign_keys = ON;

/* One row per admin browser. `device_hash` is
   sha256('adm-dev:' + coarse UA family), so a browser version bump does not
   lock the operator out while a different browser or platform does. */
CREATE TABLE IF NOT EXISTS admin_devices (
  id           TEXT PRIMARY KEY,
  user_ref     TEXT NOT NULL,
  device_hash  TEXT NOT NULL,
  ua_hash      TEXT,
  label        TEXT,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER,
  last_country TEXT,
  last_asn     INTEGER,
  revoked_at   INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_devices_hash ON admin_devices(device_hash);
CREATE INDEX IF NOT EXISTS idx_admin_devices_seen ON admin_devices(last_seen_at);

/* Append-only trail for admin sign-in, sign-out, global revocation and any
   future privileged action. Country/ASN are the Cloudflare geo values: coarse
   by design and not personal identifiers on their own. */
CREATE TABLE IF NOT EXISTS admin_audit (
  id      TEXT PRIMARY KEY,
  at      INTEGER NOT NULL,
  action  TEXT NOT NULL,
  actor   TEXT,
  country TEXT,
  asn     INTEGER,
  fp_hash TEXT,
  detail  TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit(at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON admin_audit(action, at);

/* Phase 7: one row per denial, written best-effort by the middleware and by the
   admin endpoints. `stage` is 1-7, `rule` is the machine name of the control
   that denied, `confidence` is 0-100 for the heuristic stages. */
CREATE TABLE IF NOT EXISTS denial_log (
  id         TEXT PRIMARY KEY,
  at         INTEGER NOT NULL,
  stage      INTEGER NOT NULL,
  rule       TEXT NOT NULL,
  ip_hash    TEXT,
  country    TEXT,
  asn        INTEGER,
  ua_hash    TEXT,
  fp_hash    TEXT,
  path       TEXT,
  confidence INTEGER
);

CREATE INDEX IF NOT EXISTS idx_denial_log_at ON denial_log(at);
CREATE INDEX IF NOT EXISTS idx_denial_log_rule ON denial_log(rule, at);
CREATE INDEX IF NOT EXISTS idx_denial_log_country ON denial_log(country, at);

/* Phase 6/7 canary tokens: watermarked ids planted in menus and image URLs. A
   canary is only ever "seen" if the payload leaks out of the gated views. */
CREATE TABLE IF NOT EXISTS canary_tokens (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL,
  ref_id        TEXT,
  label         TEXT,
  created_at    INTEGER NOT NULL,
  first_seen_at INTEGER,
  leak_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_canary_kind ON canary_tokens(kind, created_at);
