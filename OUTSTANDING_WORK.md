# EatOuts Botswana — Outstanding Work (Deep Audit)

**Date:** 2026-10-16
**Live site:** https://www.eatouts.site (Cloudflare Pages; apex `eatouts.site` 301→ www)
**Progress:** Phase 1 customer-account fixes landed (B1–B4, B7, B8) — `npm test` **38/38 green**.
**Phase 2 server foundation landed** (C0 `requireBusiness` guard, C1–C3 endpoints, `0005_business`
migration). Supabase project + public `eatouts-media` bucket exist (E1). Backend **deployed and
live** on Cloudflare Pages (Phase 0 complete — A1–A5 resolved). **Phase 0.5 done** (domain/email
cleanup). Remaining Phase 2+ work (client wiring, C4–C10, E4–E6) is tracked below.
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

The app is a **very complete front-end** and the **back-end is now live**. Almost every "real data"
question is now about wiring the front-end flows to the deployed endpoints rather than about the
hosting:

> **Blocker #0 — RESOLVED.** `www.eatouts.site` is served by Cloudflare Pages, so the Pages
> Functions under `functions/api/**` (`/api/*`), the D1 database, the KV sessions and Supabase
> uploads **all run on the live origin**. The project is connected to `Kudigotdis/eatouts` (`main`)
> and deploys automatically on every push.

`wrangler.toml` now carries the real D1/KV IDs and the Supabase secrets are set on the Pages
project, so the API no longer returns `503 backend_not_configured` / `storage_not_configured`.

### Readiness scorecard

| Area | Back-end code exists? | Works on live site? | Verdict |
|---|---|---|---|
| Customer signup / login / logout / session | Yes (`functions/api/auth/*`) | Yes | Live |
| Customer profile view/edit | Yes (`functions/api/me.js`) | Yes | Live |
| Favourites / summaries / saved events | Yes (endpoints + D1 tables) | Yes | Live |
| Addresses | Yes (endpoint + `[id]`) | Yes | Live (B4) |
| Orders | No endpoint/table | No (localStorage) | Not started |
| Notifications (customer) | None | No | Not started |
| Business create/update profile | No endpoint | No (localStorage) | Not started (server) |
| Staff management | No endpoint | No (localStorage) | Not started (server) |
| Menu + prices + images | No endpoint | No (localStorage) | Not started (server) |
| Media upload (Supabase) | Endpoint + bucket exist | Yes (avatar wired) | Live (B7/E2) |
| Admin: users | No endpoint | No (demo UI only) | Not started |
| Admin: businesses | No endpoint | No (demo UI only) | Not started |
| Admin: promo queue | Yes | Yes | Live |
| Admin: slug/link moderation | Yes | Yes | Live |
| Admin: analytics / verification / brand / blog | None | No (local) | Mock |

---

## Product decisions (locked 2026-10-16)

The user confirmed the following; work must follow them:

1. **Domain / emails:** the only domain is `eatouts.site` (`www.eatouts.site` canonical; apex
   301→ www). **`eatouts.co.bw` does not exist** and must never appear. The only mailbox is
   **`info@eatouts.site`** — all `privacy@` / `legal@` / `hello@` references consolidate onto it.
   *(Done — Phase 0.5.)* Legal `[Registered Address]` / `[Registered Company Name]` / `[Plot/Address]`
   **stay as placeholders** until real entity details exist.
2. **Business promos are moderated:** every business promo goes through the **existing admin
   promo-submission queue** (`/api/admin/promo-submissions`) and only goes live on admin approval.
3. **Promo quota / fee:** each business gets **3 free promos per calendar month**, then
   **P50.00 each**.
4. **Payments:** **no gateway yet** — tracking only, via **invoices** that an admin marks paid
   (onboarding fee, monthly plan, promo overage).
5. **Verification:** still WhatsApp click-to-chat (no OTP); storage stays local (no Dexie); auth
   stays PBKDF2.

---

## Phase 0.5 — Domain & email cleanup (DONE)

- `assets/data/eatouts_privacy_policy.{json,js}` and `assets/data/eatouts_terms_of_service.{json,js}`
  rewritten: every `eatouts.co.bw` address → `info@eatouts.site`; legal placeholders untouched.
- Fixed `scripts/build_legal_docs.js` → **`scripts/build_legal_docs.cjs`** (the generator was
  unrunnable under `"type": "module"`); re-ran it to regenerate both `.js` files from the `.json`
  sources (self-check passed).
- Verified: zero `eatouts.co.bw` matches remain anywhere in the repo.

---

## Part A — Infrastructure (DONE — backend live)

- [x] **A1. Deploy the Cloudflare backend.** Cloudflare Pages serves `www.eatouts.site` (project
  `eatouts`, Git-connected to `Kudigotdis/eatouts` `main`, auto-deploy on push). The app is
  same-origin with the API — no CORS/subdomain needed.
- [x] **A2. Provision D1 + KV.** D1 `eatouts` and KV `OPS_KV` created; real IDs wired into
  `wrangler.toml`.
- [x] **A3. Apply migrations** `migrations/0001`–`0004` (`npm run db:migrate`) and seed.
- [x] **A4. Set secrets** (Cloudflare dashboard): `SESSION_SECRET`, `ADMIN_EMAILS`,
  `DEV_LOGIN_EMAILS`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `PUBLIC_BASE`; `ENV=production`.
- [x] **A5. Fix the "no backend" experience.** Resolved by deploying the real backend — `/api/*`
  now runs on the live origin and no longer 404s.

---

## Part B — Customer accounts & data

The code exists and is well built (PBKDF2 passwords `functions/api/_auth.js:12,39-50`; KV sessions
`functions/api/_shared.js:69-76`; D1 tables `users`, `favourites`, `saved_summaries`,
`saved_events`, `addresses`, `promo_submissions`). But on the live site none of it runs, and there
are real bugs even once deployed:

- [x] **B1.** `/api/*` reachable from the live origin (A1) — the backend is deployed and live, so
  customers can register and log in.
- [x] **B2. Locally-created accounts can log in.** The onboarding fallback
  (`eatouts-user-onboarding.html`) now stores a local `passwordHash`+`salt` (via
  `EatoutsAuth.hashPassword`), and `EatoutsCustomer.login` falls back to verifying locally-created
  accounts when the backend is unconfigured/unreachable (`loginLocal`). Covered by
  `tests/customer-local-login.js`.
- [x] **B3. Verify flow is WhatsApp click-to-chat only** — `signup.js:19-23,107` writes the
  `verifications` row + click-to-chat link, and `/api/auth/verify` consumes it
  (`functions/api/auth/verify.js:37-49`). Confirmed covered.
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
- [x] **B8. Fix the demo role bypass.** `EO.guard` now requires a real session for role-gated
  areas — a guest hitting a customer/manager page is redirected to login instead of being seated
  as the demo owner (`js/eatouts-manager.js:85-90`). Covered by `tests/customer.js`.

---

## Part C — Businesses, staff & content (profile, menu, gallery, promos, events)

Front-end: yes, richly. Server: essentially no. There is **no `/api` endpoint that persists a
business, its staff, or any of its content.** Those flows write to two localStorage stores
(`eatouts_db_v2` and `eatouts_manager_v1`) — device-local, non-durable, invisible to customers.

**Foundation for every C-item:** a `requireBusiness(context, restaurantId, minRole)` guard in
`functions/api/_business.js` (session via `_shared.js:getSession` + membership row lookup in
`memberships`) — the existing `_customer.js` only knows `requireCustomer`/`requireAdmin`.
Roles to honour: `owner`, `manager`, `menu_manager`, `marketing_manager`.

**Phase 2 server foundation landed (this change):** `functions/api/_business.js` (guard + row
mappers), `migrations/0005_business.sql` (profile columns + `media`), and the endpoints
`/api/business/mine` (list/create), `/api/business/profile` (read/update),
`/api/business/staff` (+`/:id`), `/api/business/menu` + `/menu/categories` + `/menu/items`
(+`/:id`). Covered by `tests/api-business.js`. **Client wiring of these endpoints + C4–C10 remain.**

- [x] **C1 (server). Build business endpoints:** create/read/update business profile (name,
  address, contact, hours). D1 `restaurants` extended in `0005_business.sql`; exposed via
  `/api/business/mine` (create/list) + `/api/business/profile` (read `menu_manager+`, patch
  `manager+`; admins bypass).
- [~] **C2. Build staff endpoints + UI wiring.** Server done: `/api/business/staff` (list
  `manager+`, add/invite `owner`) + `/api/business/staff/:id` (role/status/delete, last-owner
  guarded). **UI wiring of `staff-manager.html` / `eatouts-staff-admin1.html` still pending.**
- [~] **C3. Build menu endpoints + wiring.** Server done: `/api/business/menu` (read
  `menu_manager+`), category + item CRUD. Persists to D1 (`menu_categories`, `menu_items`).
  **Unifying the client stores (`menu-onboarding.html`, `business-onboarding1.html`) still pending.**
- [ ] **C4. Wire real image upload.** Onboarding pages embed **base64 data URLs** into localStorage
  via `EatoutsUpload.decorate` (`js/eatouts-upload.js:96-155`) — never calling the real
  `POST /api/upload`. See Part E.
- [ ] **C5. Business onboarding persistence.** `business-onboarding1.html:90` publishes to
  localStorage only; `eatouts-business-signup.html` is the only onboarding page touching the API
  (slug claim only, `:138,491`).
- [ ] **C6. Gallery endpoints.** Read/write `gallery_groups` + `gallery_images`
  (`0001_init.sql`), wired to `gallery-onboarding.html` (currently localStorage + base64).
- [ ] **C7. Events endpoints.** CRUD `events` (`0001_init.sql`), wired to
  `eatout_event_builder.html` / `event-onboarding.html`; they must surface in the customer
  calendar and saved-Favourites→Events.
- [ ] **C8. Business promos through the moderation queue.** Business-submitted promos must write
  to the **existing `promo_submissions` queue** (never publish directly); extend
  `functions/api/customer/promo-submissions.js` to accept a `restaurant_id` + `source='business'`.
- [ ] **C9. Unify the content model.** One canonical record set per restaurant in D1, read by the
  public venue/`eatouts-*` pages — replacing the two incompatible localStorage stores; keep the
  customer read paths (`venues.js`, `restaurants`) as the single source for display.
- [ ] **C10. Real image upload for all onboarding.** Replace base64-in-localStorage
  (`EatoutsUpload.decorate`) with `POST /api/upload` (Supabase) for profile/logo/menu/gallery/event
  images.

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

**It is coded as a media/storage bucket only — not auth, not database — and it is live.**

- **Purpose:** image/media storage via `POST /api/upload` → Supabase Storage REST
  (`functions/api/upload.js:5-8,40-50`); bucket defaults to `eatouts-media`. No Supabase Auth, no
  Supabase Postgres anywhere.
- **Status:** project exists (`repqoombckaobqtqwwzb`, eu-west-1), the **public `eatouts-media`
  bucket is created**, and the secrets are set on the Cloudflare Pages project (A4) — the endpoint
  runs live. Client-side `POST /api/upload` is wired via `EatoutsCustomer.uploadPhoto` (B7). The
  legacy R2 uploader (`js/eatouts-cloud.js` + `cloudflare-worker.js`) has been **removed** (E3).

- [x] **E1. Create the Supabase project + public `eatouts-media` bucket** and set the 4 secrets
  (A4). Project, bucket and Cloudflare secrets done.
- [x] **E2. Wire the client** to POST compressed blobs to `/api/upload?path=…` and store the
  returned URL. Done for the customer avatar/profile photo (`index.html` → `EatoutsCustomer.
  uploadPhoto`); business/menu/onboarding images still use base64 data URLs (C4).
- [x] **E3. Repoint/deprecate `EatoutsCloud`** (R2 → `/api/upload`) to avoid two competing
  uploaders. The R2 client + worker were deleted; `/api/upload` is the only media path.
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
- [ ] **F4.** Payment: no real gateway — **accepted for now (locked decision: tracking only via
  Part G invoices)**; bookings stay simulated. Revisit a real gateway post-launch.
- [ ] **F5.** Manual placeholders needing your data: bank/MoMo in `invoice.html`, live URL/QR in
  `one-pager.html`, partner-terms legal review, get-started testimonial (`SESSION_NOTES.md:43`).

---

## Part G — Promotions, moderation quota & invoicing

Business-submitted content must be moderated and billed per the locked decisions (3 free
promos/venue/calendar-month, then P50.00 each; payments = tracking only).

- [ ] **G1. Promo quota.** Add `source`, `month_key`, `restaurant_id` to `promo_submissions`
  (new migration) and count a business's promos per calendar month, enforcing **3 free on
  admin approval** (the 4th+ approvals as **P50.00 + an invoice line**).
- [ ] **G2. Approval → publish.** Approved business promos publish to the customer-facing
  promos/offers surface (only admin-managed promos do today).
- [ ] **G3. Invoices (tracking only).** New D1 `invoices` table (restaurant_id, type:
  `onboarding|plan|promo`, amount, status `draft|due|paid`, reference, created_at/paid_at).
  Admin list endpoint + "mark paid" action; **no gateway, no PDF, no email.**
- [ ] **G4. Fee disclosure.** Onboarding + `promo-onboarding.html` show the 3-free/P50 rule as a
  quote before the business submits.

---

## Phased plan

- **Phase 0 — Go live with a real backend (unblocks everything).** A1–A5 — **DONE (live on Cloudflare Pages).**
- **Phase 0.5 — Domain & email cleanup.** **DONE (this change).** `eatouts.co.bw` purged; legal
  privacy/terms email consolidated to `info@eatouts.site`; legal builder fixed (`build_legal_docs.cjs`).
- **Phase 1 — Customer accounts & data.** B1–B4, B6–B8 (sign-up/login, addresses, recovery).
  **B5 (orders) deferred to Phase 6** — need restaurant-side fulfilment first.
- **Phase 2 — Business accounts + staff.** C0 (`requireBusiness` RBAC guard), C1–C5 (profile,
  staff/roles, menu unification, onboarding persistence), E1–E6 (media).
- **Phase 3 — Business content.** C6–C10 (gallery, promos, events, unified content model, uploads).
- **Phase 4 — Moderation quota + invoicing.** G1–G4 (3 free/venue/calendar-month then P50.00;
  invoices tracking-only) + admin queue approval for business promos.
- **Phase 5 — Admin.** D1–D7 (production admin path, user/business management over real data,
  invoice "mark paid").
- **Phase 6 — Product polish.** F1, F2, F3, F5 + **B5 (orders)**; F4 (real payment gateway)
  intentionally out of scope until after launch.

**Assumptions (state here; change if wrong):** business auth reuses the existing `users`
login + `memberships` roles (no separate business login); admin notifications/in-app messaging
(B6) stay as-is this pass; invoices are a server list + admin "mark paid" only (no PDF/email).

---

## Phase 0 runbook (COMPLETED — for reference)

The backend is live; these steps were carried out and are kept for reference/repeat environments.

```powershell
# 0. Wrangler (already a dev dependency is fine, otherwise install)
npm install -D wrangler

# 1. Log in to Cloudflare
npx wrangler login

# 2. Create the D1 database, then paste the printed database_id into wrangler.toml
npx wrangler d1 create eatouts

# 3. Create the KV namespace, then paste the printed id into wrangler.toml
npx wrangler kv namespace create OPS_KV

# 4. Build the static bundle
npm run build

# 5. Apply migrations to the remote database, then (optional) seed demo data
npm run db:migrate
npm run db:seed
```

Deploy happens automatically: the Pages project is Git-connected to `Kudigotdis/eatouts` (`main`),
build command `npm run build`, output dir `dist`. A manual `npm run deploy`
(`wrangler pages deploy dist`) is only needed for a one-off.

In the Cloudflare dashboard → **Workers & Pages → eatouts → Settings → Variables and secrets**:

```
ENV=production
SESSION_SECRET=<long random string>
ADMIN_EMAILS=info@eatouts.site
DEV_LOGIN_EMAILS=
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_KEY=<service_role key>
SUPABASE_BUCKET=eatouts-media
PUBLIC_BASE=
```

**Supabase:** project `repqoombckaobqtqwwzb` with a **public** storage bucket named `eatouts-media`;
Project URL + service_role key set as `SUPABASE_URL` / `SUPABASE_KEY`.

**Domain (resolved):** `eatouts.site` is on Cloudflare and added as a custom domain on the Pages
project (`www.eatouts.site`; apex 301→ www). Everything runs same-origin; the GitHub Pages mirror
was retired.

---

## Decisions (resolved)

1. **Hosting:** Cloudflare Pages is the live origin for `www.eatouts.site` (same-origin API). ✅
2. **Supabase:** existing project used — no new project needed. ✅
3. **Domain + official email:** `www.eatouts.site` canonical; only `info@eatouts.site`; `eatouts.co.bw`
   purged. ✅ (Phase 0.5)
4. **Business promos:** moderated through the existing admin queue; 3 free per venue per calendar
   month, then P50.00 each. ✅ (locked 2026-10-16)
5. **Payments:** no gateway — invoices are tracking-only, admin marks paid. ✅ (locked 2026-10-16)
6. **Priority:** phased plan above (Phase 1 → 2 → 3 → 4 → 5 → 6). ✅

**Still open (non-blocking):** business auth = existing `users` login + `memberships` roles
(no separate business login) assumed; admin notifications / in-app messaging (B6) assumed out of
scope this pass; invoice PDFs/email reminders out of scope.

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
- **Deploy:** Git-connected Cloudflare Pages deployment on push to `main` (build `npm run build`,
  output `dist`). Manual `npm run deploy` = build + `wrangler pages deploy dist`. The GitHub Pages
  workflow was retired.
- **Tests:** 36 suites (`tests/run-all.js:20-57`) — none cover upload/health server-side;
  regression is green.
