-- EatOuts schema v11 (Cloudflare D1 / SQLite)
-- Password reset by email.
--
-- Applied with:
--   npx wrangler d1 execute eatouts --file migrations/0011_password_reset.sql --remote
--
-- Notes:
--  * Only the SHA-256 hash of the reset token is stored. The raw token is
--    only ever handed to the account owner by email.
--  * Tokens are single use: `used_at` is stamped when the password changes.
--  * Tokens expire 30 minutes after they are created.
--  * Accounts without a real email address (the synthetic
--    <whatsapp>@whatsapp.eatouts rows) can never match a lookup, so they
--    simply never receive a reset link.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS password_resets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  email       TEXT NOT NULL,
  token_hash  TEXT NOT NULL,
  expires_at  INTEGER NOT NULL,
  used_at     INTEGER,
  attempts    INTEGER NOT NULL DEFAULT 0,
  request_ip  TEXT,
  created_at  INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user        ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_email       ON password_resets(email);
