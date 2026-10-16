# EatOuts Botswana — Outstanding Work (Deep Audit)

**Date:** 2026-10-16
**Live site:** https://eatouts.site (GitHub Pages)
**Progress:** Phase 1 code edits landed (B4, B7, E2 partial) — `npm test` 36/36 green. Supabase
project + public `eatouts-media` bucket exist (E1); secrets in local `.dev.vars` only. Backend
still **not deployed** (Blocker #0 open).
**Repo:** `Kudigotdis/eatouts`
**Method:** full read of `functions/api/**`, `migrations/**`, `js/**`, onboarding + admin pages,
deploy config, and the repo's own `HTML_ASSESSMENT.md` / `INTEGRATION_AUDIT.md`.

This document answers five questions and then gives a phased plan to finish:

1. Is Supabase working 100% and what is it for?
2. When users create profiles, is their information stored, can they log in/out and save
   favourites/summaries, etc.?
3. Can businesses create/update profiles (name, address, staff) and menus with prices and images?
4. Are the admin features ready (manage users and businesses)?
5. What is everything still outstanding?

---

## 0. Executive summary — the one root cause

The app is a **very complete front-end** with the **back-end code written but not wired to the live
site**. Almost every "real data" question has the same root cause:

> **Blocker #0 — The backend isn't live.** `eatouts.site` is served by GitHub Pages, which serves
> **files only** (`.github/workflows/pages.yml:3-6`, `README.md:56`). The Cloudflare Pages
> Functions under `functions/api/**` (`/api/*`), the D1 database, the KV sessions, and Supabase
> uploads **do not run there**. On the live domain every `/api/*` call 404s and the app silently
> falls back to **localStorage demo mode**.

Compounding this: `wrangler.toml` still has placeholder IDs (`<D1_DATABASE_ID>` line 20,
`<KV_NAMESPACE_ID>` line 26) and the Supabase secrets are unset (only `.dev.vars.example`), so even
a deployed backend would currently return `503 backend_not_configured` / `storage_not_configured`.

### Readiness scorecard

| Area | Back-end code exists? | Works on live site? | Verdict |
|---|---|---|---|
| Customer signup / login / logout / session | Yes (`functions/api/auth/*`) | No (404 → fallback broken) | Not production-ready |
| Customer profile view/edit | Yes (`functions/api/me.js`) | No (local only) | Partial |
| Favourites / summaries / saved events | Yes (endpoints + D1 tables) | No (local only) | Code ready, not live |
| Addresses | Yes (endpoint + `[id]`) | No (client wired, needs backend) | Wired (B4) |
| Orders | No endpoint/table | No (localStorage) | Not started |
| Notifications (customer) | None | No | Not started |
| Business create/update profile | No endpoint | No (localStorage) | Not started (server) |
| Staff management | No endpoint | No (localStorage) | Not started (server) |
| Menu + prices + images | No endpoint | No (localStorage) | Not started (server) |
| Media upload (Supabase) | Endpoint + bucket exist | No (avatar wired, needs backend) | Partly wired (B7/E2) |
| Admin: users | No endpoint | No (demo UI only) | Not started |
| Admin: businesses | No endpoint | No (demo UI only) | Not started |
| Admin: promo queue | Yes | No (404 on GH Pages) | Code ready, not live |
| Admin: slug/link moderation | Yes | No (404 on GH Pages) | Code ready, not live |
| Admin: analytics / verification / brand / blog | None | No (local) | Mock |

---

## Part A — Infrastructure (must be first)

- [ ] **A1. Deploy the Cloudflare backend** (`npm run deploy` → `wrangler pages deploy dist`,
  `package.json:11`) as the origin for the app — either serve `eatouts.site` from Cloudflare, or
  run the API on a subdomain (e.g. `api.eatouts.site`) and point the client at it. The app is
  currently **same-origin**, so a subdomain needs CORS + cookie changes.
- [ ] **A2. Provision D1 + KV:** `npx wrangler d1 create eatouts` and
  `npx wrangler kv namespace create OPS_KV`; paste the real IDs into `wrangler.toml:20,26`.
- [ ] **A3. Apply migrations** `migrations/0001`–`0004` (`npm run db:migrate`) and seed
  (`npm run db:seed`, `package.json:19-22`).
- [ ] **A4. Set secrets** (Cloudflare dashboard): `SESSION_SECRET`, `ADMIN_EMAILS`,
  `DEV_LOGIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `PUBLIC_BASE`; set
  `ENV=production` (`wrangler.toml:46-47`).
- [ ] **A5. Fix the "no backend" experience.** Signup/login show a generic failure because the
  client only falls back on the exact `backend_not_configured` error
  (`eatouts-user-onboarding.html:52`), but GitHub Pages returns **404**, not 503. Either deploy a
  real backend, or show a clear "accounts require the live app" message.

---

## Part B — Customer accounts & data

The code exists and is well built (PBKDF2 passwords `functions/api/_auth.js:12,39-50`; KV sessions
`functions/api/_shared.js:69-76`; D1 tables `users`, `favourites`, `saved_summaries`,
`saved_events`, `addresses`, `promo_submissions`). But on the live site none of it runs, and there
are real bugs even once deployed:

- [ ] **B1.** Make `/api/*` reachable from the live origin (A1) — otherwise no customer can
  register or log in.
- [ ] **B2. Locally-created accounts can't log in.** The onboarding fallback creates a local user
  with **no password hash** (`eatouts-user-onboarding.html:73`), while login always hits the server
  (`js/eatouts-customer.js:130-135`).
- [ ] **B3. Verify flow is WhatsApp click-to-chat only** (`signup.js:19-23,118-127`); confirm the
  `verifications` row / `/api/auth/verify` path is covered.
- [x] **B4. Wire addresses to the API.** Added `EatoutsCustomer.addresses` (`list`/`pull`/`save`/
  `remove`) to `js/eatouts-customer.js` and wired `eatouts-addresses.html` to it (POST
  `/customer/addresses`, PATCH/DELETE `/customer/addresses/:id`), keeping the static page
  contracts. Verified via `tests/customer.js`.
- [ ] **B5. Decide orders' fate.** No order endpoint/table exists; `eatouts-orders.html:16` reads
  localStorage. This is the "**single most important gap**" per `HTML_ASSESSMENT.md:258` — the
  customer → business → order-history loop is broken. Build `orders` endpoint + table and wire
  checkout (`eatouts-checkout-summary.html`) to append an order.
- [ ] **B6. Customer notifications** don't exist server-side (`eatouts-notifications.html` is
  platform-admin only). Build endpoint + table if in scope.
- [x] **B7. Profile gaps:** `deliveryLocation` added to the server whitelist
  (`functions/api/me.js` `PROFILE_FIELDS`) and now saved via `EatoutsCustomer.updateProfile`
  (`eatouts-profile.html`); the `index.html` profile-photo handler now previews then uploads the
  compressed image via `EatoutsCustomer.uploadPhoto` (Supabase `/api/upload`) with a data-URL
  fallback. Still persists a data URL if the backend is unreachable (Blocker #0).
- [ ] **B8. Fix the demo role bypass:** `EO.guard` auto-seeds a demo session and **returns before
  checking roles** (`js/eatouts-manager.js:86`), so guests hit customer pages as the demo owner.

---

## Part C — Businesses (profiles, staff, menus, images)

Front-end: yes, richly. Server: essentially no. There is **no `/api` endpoint that persists a
business, its staff, or its menu.** Those flows write to two localStorage stores (`eatouts_db_v2`
and `eatouts_manager_v1`) — device-local, non-durable, invisible to customers.

- [ ] **C1. Build business endpoints:** create/read/update business profile (name, address,
  contact, hours) + status/approval. D1 schema already supports it (`restaurants`,
  `restaurant_branches`, `claims` in `migrations/0001_init.sql:23-45,76-87`) but **no function
  exposes it**.
- [ ] **C2. Build staff endpoints + UI wiring.** `staff-manager.html:6,20,39` and
  `eatouts-staff-admin1.html:47` are localStorage-only. D1 `memberships` exists but isn't written.
- [ ] **C3. Build menu endpoints + wiring.** `menu-onboarding.html` writes `EatoutsDB.menuItems`
  (`:261`); `business-onboarding1.html` writes `businesses.modules.menu.items`. **Menu data is
  split across two incompatible stores** — unify and persist to D1 (`menu_categories`,
  `menu_items` exist in `0001_init.sql`).
- [ ] **C4. Wire real image upload.** Onboarding pages embed **base64 data URLs** into localStorage
  via `EatoutsUpload.decorate` (`js/eatouts-upload.js:96-155`) — never calling the real
  `POST /api/upload`. See Part E.
- [ ] **C5. Business onboarding persistence.** `business-onboarding1.html:90` publishes to
  localStorage only; `eatouts-business-signup.html` is the only onboarding page touching the API
  (slug claim only, `:138,491`).

---

## Part D — Admin

Only two admin workflows are real (and only on Cloudflare): **promo submissions** and **slug/link
moderation**. User & business management are **UI-only over demo localStorage data**.

- [ ] **D1. No production way to become an admin.** `is_admin` is only ever set by `dev-login`
  (disabled in production, `functions/api/auth/dev-login.js:15,38`); signup hard-codes `is_admin=0`
  (`signup.js:93-100`). Build an admin-grant path and a real role model (today `is_admin` is a
  single boolean, not "other admins").
- [ ] **D2. Build `/api/admin/users`** (list / view / edit / disable / set role). None exists;
  `eatouts-users-manager.html:2,6` is demo-only and its "Reset PIN" is a no-op toast.
- [ ] **D3. Build `/api/admin/businesses`** (list / approve / verify / suspend / edit). None
  exists; `eatouts-verification-queue.html:2-3` is localStorage-only.
- [ ] **D4. Bridge client admin identity to the server session.** `EO.guard`/`EatoutsAuth` read
  localStorage (`js/eatouts-manager-db.js:8` seed `u-admin`), and the server session's `isAdmin`
  is never propagated; on the static site any visitor can become "admin".
- [ ] **D5. Get the two working queues live.** Promo queue
  (`functions/api/admin/promo-submissions.js` + `eatouts-admin-dashboard.html:35,44`) and links
  (`functions/api/admin/links.js`) are complete — they need the backend deployed (A1) and a real
  admin session.
- [ ] **D6. Analytics / verification / brand-kit / blog admin** are mock/local
  (`js/eatouts-analytics.js:132-134` flags events `offline:true`; `brand-kit-admin.html:193-205`
  guard *falls open* with no session).
- [ ] **D7. Audit logs are local-only** (`js/eatouts-audit.js`). For real admin accountability,
  record server-side.

---

## Part E — Supabase

**It is coded as a media/storage bucket only — not auth, not database — and it is NOT working yet.**

- **Purpose:** image/media storage via `POST /api/upload` → Supabase Storage REST
  (`functions/api/upload.js:5-8,40-50`); bucket defaults to `eatouts-media`. No Supabase Auth, no
  Supabase Postgres anywhere.
- **Status:** project exists (`repqoombckaobqtqwwzb`, eu-west-1) and the **public `eatouts-media`
  bucket is created**. Secrets live in local `.dev.vars` (gitignored) but are **not yet set on
  Cloudflare** (see A4) and the endpoint still returns `503 storage_not_configured` there.
  Client-side `POST /api/upload` is now wired via `EatoutsCustomer.uploadPhoto` (B7). A legacy R2
  uploader (`js/eatouts-cloud.js:85`) exists but its `workerUrl` is never set, so it is inert.

- [x] **E1. Create the Supabase project + public `eatouts-media` bucket** and set the 4 secrets
  (A4). Project + bucket done; secrets added to local `.dev.vars` — still to be pushed to
  Cloudflare as part of A4.
- [~] **E2. Wire the client** to POST compressed blobs to `/api/upload?path=…` and store the
  returned URL. Done for the customer avatar/profile photo (`index.html` → `EatoutsCustomer.
  uploadPhoto`); business/menu/onboarding images still use base64 data URLs (C4).
- [ ] **E3. Repoint/deprecate `EatoutsCloud`** (R2 → `/api/upload`) to avoid two competing
  uploaders.
- [ ] **E4. Harden `upload.js`:** max-size + content-type allowlist, rate limiting (`rateLimit`
  helper exists at `_shared.js:123-131` but unused), and per-user/venue **path scoping** (currently
  `x-upsert:true` lets any session overwrite any key, `upload.js:47`).
- [ ] **E5. Add server tests** for upload (401/503/400/success) — none exist today.
- [ ] **E6. Decide the media record model:** D1 has inline columns (`restaurants.logo_ref/cover_ref`,
  `menu_items.image_key`, etc.) but no writes populate them and no media table tracks
  ownership/cleanup.

---

## Part F — Product gaps already documented in-repo

From `HTML_ASSESSMENT.md` / `INTEGRATION_AUDIT.md` (still open):

- [ ] **F1.** Order bridge (the top gap).
- [ ] **F2.** Menu modifier-group editor stub (`HTML_ASSESSMENT.md:135-138`).
- [ ] **F3.** Event "Add Service" linker stub (`:148-151`).
- [ ] **F4.** Payment: no real gateway — bookings/invoices are simulated.
- [ ] **F5.** Manual placeholders needing your data: bank/MoMo in `invoice.html`, live URL/QR in
  `one-pager.html`, partner-terms legal review, get-started testimonial (`SESSION_NOTES.md:43`).

---

## Phased plan

- **Phase 0 — Go live with a real backend (unblocks everything).** A1–A5.
- **Phase 1 — Customer persistence in production.** B1–B8 (esp. B2, B4, B5).
- **Phase 2 — Business + media.** C1–C5, E1–E6.
- **Phase 3 — Admin.** D1–D7.
- **Phase 4 — Product polish.** F1–F5.

---

## Phase 0 manual runbook (exact steps)

Run these from the repo root. Steps 1–3 and 5 must be done by you (they need your Cloudflare
login); the rest I can help with.

```powershell
# 0. Wrangler (already a dev dependency is fine, otherwise install)
npm install -D wrangler

# 1. Log in to Cloudflare
npx wrangler login

# 2. Create the D1 database, then paste the printed database_id into wrangler.toml line 20
npx wrangler d1 create eatouts

# 3. Create the KV namespace, then paste the printed id into wrangler.toml line 26
npx wrangler kv namespace create OPS_KV

# 4. Build the static bundle
npm run build

# 5. Apply migrations to the remote database, then (optional) seed demo data
npm run db:migrate
npm run db:seed

# 6. Deploy to Cloudflare Pages
npm run deploy
```

Then in the Cloudflare dashboard → **Workers & Pages → eatouts → Settings → Variables and secrets**,
add:

```
ENV=production
SESSION_SECRET=<long random string>
ADMIN_EMAILS=<your-email@example.com>
DEV_LOGIN_EMAILS=
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service_role key>
SUPABASE_BUCKET=eatouts-media
PUBLIC_BASE=
```

**Supabase:** create a project, create a **public** storage bucket named `eatouts-media`, and copy
the Project URL + service_role key into the secrets above.

**Domain choice (pick one):**
- **(Simple)** Move `eatouts.site` DNS to Cloudflare, add it as a custom domain on the Pages
  project, and retire the GitHub Pages mirror. Everything keeps working same-origin.
- **(Mirror)** Keep GitHub Pages for static files and run the API on `api.eatouts.site` — requires
  CORS + cookie-domain changes in the client and `_shared.js`.

---

## Decisions needed

1. **Hosting:** make Cloudflare Pages the live origin for `eatouts.site` (recommended, simplest),
   or run the API on a subdomain and keep GitHub Pages as the mirror?
2. **Priority:** Phase 0–1 (real accounts) first, or the full stack (through admin) before launch?
3. **Payments:** in scope now (F4), or deferred?
4. **Supabase:** do you already have a project, or should the plan include creating one?

---

## Appendix — key facts

- **Real endpoints:** `functions/api/auth/{signup,login,logout,session,verify,dev-login}.js`,
  `me.js`, `upload.js`, `venues.js` (read-only), `business/link.js`, `links/{check,resolve}.js`,
  `customer/{favourites,addresses,events,summaries,promo-submissions}.js`,
  `admin/{promo-submissions,links}.js`, `bw/[[path]].js` (vanity router).
- **D1 tables:** `users`, `business_links`, `favourites`, `saved_summaries`, `saved_events`,
  `addresses`, `promo_submissions`, `restaurants`, `restaurant_branches`, `menu_categories`,
  `menu_items`, `gallery_images`, `promos`, `events`, `memberships`, `claims`, `subscriptions`.
- **Env needed:** `ENV`, `SESSION_SECRET`, `ADMIN_EMAILS`, `DEV_LOGIN_EMAILS`, `SUPABASE_URL`,
  `SUPABASE_KEY`, `SUPABASE_BUCKET`, `PUBLIC_BASE`.
- **Deploy:** `npm run deploy` = build + `wrangler pages deploy dist`; GitHub Actions
  `.github/workflows/pages.yml` deploys the static mirror only.
- **Tests:** 36 suites (`tests/run-all.js:20-57`) — none cover upload/health server-side;
  regression is green.
