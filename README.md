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

**No backend.** All state is browser `localStorage`:

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
