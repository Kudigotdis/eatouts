-- EatOuts schema v12 (Cloudflare D1 / SQLite)
-- Age-restricted promos.
--
-- Applied with:
--   npx wrangler d1 execute eatouts --file migrations/0012_promo_age_restriction.sql --remote
--
-- Notes:
--  * age_restricted = 1 means the operator marked the promo as 18+ only.
--  * Promos that sell alcohol are also treated as 18+ by the shared rule
--    (functions/api/_promo-rules.js and js/eatouts-age.js), so this column
--    is the operator's own switch rather than the only source.
--  * The column is read defensively: the endpoints work before this
--    migration is applied.

PRAGMA foreign_keys = ON;

ALTER TABLE promos ADD COLUMN age_restricted INTEGER NOT NULL DEFAULT 0;
