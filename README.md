# EatOuts

**Restaurant discovery and WhatsApp ordering for Botswana.**

Customers browse menus offline, customise orders, and send requests through their own WhatsApp — no commission, no restaurant API required. Restaurants get a management console for menus, promos, events, galleries, reservations, and service staff.

---

## Why EatOuts

- **Offline-first** — customers browse menus without a data connection.
- **WhatsApp is the bridge** — orders, reservations, and RSVPs are compiled into clean human-readable messages sent from the customer's own WhatsApp. No restaurant integration needed.
- **No commission** — the restaurant keeps 100% of every sale. EatOuts charges a flat monthly subscription.
- **Concierge onboarding** — the EatOuts team sets each restaurant up (profile, menu, photos, first promo) so the venue is live without self-serve work.

**Pricing (paid from day one):** one-time **P300 onboarding/setup fee** (non-refundable, paid before publishing), then monthly **Starter P100 · Growth P300 · Pro P500**. No commission on any order; every WhatsApp message goes to the venue's own number.

---

## Onboarding model

Concierge. There is no self-serve sign-up UI at launch. A restaurant owner reaches the team via the **List your restaurant** CTA (`get-started.html`), then the team captures the venue through the internal **Concierge Intake** (`intake.html`), exports a JSON record for the directory generator, and the venue goes live once the P300 setup fee is confirmed.

**Publish rule:** a listing is published to the live directory only after the P300 setup fee is confirmed as received.

---

## Architecture

Root HTML pages (single self-contained files, vanilla JS + inline CSS, no frameworks, no CDNs). There is no runtime build step; a Python merge + Cloudflare Pages build runs only for deploy:

- **Public:** `index.html` (customer app), `get-started.html` (partner landing), `pricing.html` (pricing + feature matrix), `partner-terms.html` (merchant ToS + subscription agreement + privacy addendum), `one-pager.html` (printable pitch sheet), `eatouts-blog.html` (blog + on-device admin), `eatouts-event-planner.html`, `eatouts-suppliers.html` (supplier directory + self-onboarding). `404.html` is the Pages 404.
- **Internal (operator, auth-gated):** `restaurant-onboarding.html`, `menu-onboarding.html`, `promo-onboarding.html`, `event-onboarding.html`, `gallery-onboarding.html`, `restaurant-dashboard.html`, plus the new `intake.html`, `invoice.html`, `ops-console.html`.

**Currently no backend at runtime.** All live state is browser `localStorage` (a Cloudflare Pages Functions + D1 backend is being added on top — see **Cloudflare backend (M0)** below):

- `eatouts_db_v1` / `eatouts_db_v2` — the main restaurant DB (`js/eatouts-db.js`).
- `eatouts_session_v1` — operator sessions (`js/eatouts-auth.js`).
- `eatouts_ops_v1` — new internal business state (venues, invoices, submissions, metrics) used by `intake.html`, `invoice.html`, `ops-console.html`.
- `eatouts_intake_draft_v1` — in-progress intake draft.
- `eatouts_blog_v1` / `eatouts_blog_cache_v1` — blog posts (+ version history) and the cached feed (`js/eatouts-blog.js`).
- `eatouts_event_planner_v1`, `eatouts_suppliers_v1` / `eatouts_supplier_session_v1` / `eatouts_supplier_draft_v1` — the planner and supplier pages.

## Run

Serve the root over `http://127.0.0.1` with `run-eatouts.bat`. Opening a page via `file://` isolates `localStorage` per page and breaks operator sign-in (password hashing needs a secure context).

First visit: open `seed-demo.html`, seed demo data, then run verification (all assertions should read PASS). Then operator pages are reachable from `index.html` → About Us → Operator Sign in (or Demo login).

## Client-side upload helpers

- `eatouts-image-compressor.js` — client-side image compression via Canvas (WebP with JPEG fallback). Wired into `intake.html` for logo / cover / menu / gallery images: the chosen file is compressed to an embedded `data:` URL, with plain URL entry kept as the fallback.
- `eatouts-video-validator.js` — client-side video validation (size + duration) via the native `<video>` element. Wired into `intake.html`; a valid video is reported but must be hosted and pasted as a URL (data URLs are too large for `localStorage`).

## Pricing reference

- One-time setup: **P300** (non-refundable).
- Monthly: **Starter P100 · Growth P300 · Pro P500**.
- The canonical price object is defined in `pricing.html` and persisted to `DB.settings.pricing` so every page reads the same numbers.

## Status

The interaction analytics dashboard mentioned in earlier revisions is **not built** and is marked as roadmap, not a current capability. The export → merge → deploy loop is now wired end to end: `restaurant-dashboard.html` and `intake.html` export a `eatouts.venue.v1` record, `scripts/build_restaurant_directory.py` merges `owner_submissions/*.json` into `directory_runtime_data.json`, `npm run build` stages `dist/`, and `npm run deploy` publishes to Cloudflare Pages. Owner edits still live in the browser's `localStorage` until that export is run.

## Tests

`tests/` holds a jsdom suite (via `scripts` in `tests/package.json`). Run everything with:

```
cd tests
npm install
npm test
```

CI (`.github/workflows/test.yml`) runs the same suites plus the build-time merge on every push and pull request. No Cloudflare secrets are required.

## Cloudflare backend (M0)

The self-serve platform runs on **Cloudflare Pages Functions + D1 + KV + R2**. Functions live in `functions/api/` and deploy automatically with the Git-connected Pages project.

Bindings (`wrangler.toml`):

- `DB` — D1 database `eatouts` (schema in `migrations/`).
- `OPS_KV` — KV namespace holding login sessions.
- Media lives in **Supabase Storage** (no Cloudflare binding; R2 is not used because it requires a card on file). The upload function calls the Supabase Storage REST API with a server-side key.

Endpoints:

- `GET  /api/health` — readiness + which bindings are live.
- `POST /api/auth/dev-login` — passwordless login (**development only**; refuses when `ENV=production`).
- `POST /api/auth/logout`, `GET /api/me` — session management.
- `GET  /api/venues` — list / search / "mine" venues.
- `POST /api/upload?path=<key>` — session-gated upload to Supabase Storage.

First-time setup (run once, paste the IDs each command prints back into `wrangler.toml`):

```
npx wrangler d1 create eatouts         # paste the database_id into wrangler.toml
npx wrangler kv namespace create OPS_KV   # paste the id into wrangler.toml
npm run db:migrate     # create the tables
npm run db:seed        # import the 563 directory listings as claimable venues
```

Media uses a **Supabase Storage** bucket instead of R2. Create a bucket in your Supabase project (e.g. `eatouts-media`) and set `SUPABASE_URL`, `SUPABASE_KEY` (service_role) and `SUPABASE_BUCKET` as secrets.

Local development:

```
copy .dev.vars.example .dev.vars   # then set DEV_LOGIN_EMAILS
npm run pages:dev                  # builds dist/ and serves with bindings
```

Production secrets (`SESSION_SECRET`, `DEV_LOGIN_EMAILS`, `ADMIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `PUBLIC_BASE`) are set in the Cloudflare dashboard under Workers & Pages → eatouts → Settings → Variables and Secrets. `ENV=production` disables the dev-login shortcut.

## Cloud media — legacy R2 worker (superseded by Supabase Storage)

> **Legacy / optional, kept for reference.** This R2-based path is superseded by the Supabase Storage upload endpoint (`POST /api/upload`), because Cloudflare R2 requires a card on file. The supplier/blog/event pages will move onto the Supabase path.

The supplier, blog and event pages can store media in a Cloudflare R2 bucket through a small Worker. The client (`js/eatouts-cloud.js`) degrades gracefully until it is configured, so this is optional for launch.

1. Deploy the Worker: paste `cloudflare-worker.js` into the Cloudflare Workers editor.
2. In the Worker settings, set the environment variables:
   - `BUCKET` — your R2 bucket binding (name it `eatouts-media`).
   - `SECRET` — a long random string.
   - `PUBLIC_BASE` — the public URL prefix of your R2 bucket (e.g. `https://pub-xxxxx.r2.dev`).
3. In `js/eatouts-cloud.js`, set `window.EATOUTS_CLOUD.workerUrl` to the deployed Worker URL (e.g. `https://eatouts-media.YOUR-NAME.workers.dev`) and `secret` to the same value as the Worker's `SECRET`.

Until step 3 is done, `EatoutsCloud` reports "not configured" and callers fall back to local behaviour. The `workerUrl` and `secret` values are intentionally left blank in the repo; fill them in per environment.
