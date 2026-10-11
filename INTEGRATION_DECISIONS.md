# EatOuts Integration Decisions

Locked decisions for merging the manager/auth/admin package + the four `*1` spec
workspaces with the root app. Changes that contradict these need an explicit
override. Companion doc: `INTEGRATION_AUDIT.md`.

## D1 — One app, adaptive adapter, both stores preserved

- Both stores stay: `eatouts_db_v2` (venue content) and `eatouts_manager_v1`
  (identity, users, roles, businesses, feedback, blog, ops records).
- The adapter (`js/eatouts-data.js`) patches the root `EatoutsDB` with
  `collection/find/upsert/remove`. Name `restaurants` → root venue store (and
  `save()` the root DB); every other name → `EatoutsMgrDB`.
- Migration/linking runs once per page load (guarded by sessionStorage tag
  `eatouts:data-linked`): manager `businesses` are linked to root venues via
  `restaurantId`/slug, and legacy spec keys are read, never deleted.

## D2 — Canonical page names, legacy names as aliases

- The `*1` pages are the canonical workspaces: `business-onboarding1.html`,
  `operator-dashboard1.html`, `eatouts-staff-admin1.html`,
  `food-truck-schedule1.html`. Base duplicates are deleted.
- Other canonical names are the hyphenated pages already in the root
  (`eatouts-login.html`, `eatouts-business-signup.html`, `feedback-manager.html`,
  `blog-creator-dashboard.html`, `eatouts-admin-dashboard.html`, …). Their
  legacy underscore variants (still supplied by the package / referenced
  anywhere) are compatibility aliases; Phase 1 adds redirects (`_redirects` /
  `_headers`) and rewrites any remaining in-app references to point at the
  canonical names.
- All internal cross-links use the canonical names (already done for the 4
  winners and their targets).

## D3 — Session: unify, keep legacy keys readable

- Target canonical session key: `eatouts_auth_session_v1`; alias/legacy keys
  `eatouts_session_v1` and `eatouts_active_session_v2` remain readable and are
  rewritten on login/logout (never duplicated into two live sessions).
- `EatoutsAuth` remains the single auth gate. `getUser()` / `currentSession()`
  reconcile across the two stores by user id; `getActiveBusiness()` /
  `setActiveBusiness()` reconcile manager businesses ↔ root venues.
- **Implemented (Phase 3):** `getActiveSession()` reads canonical → legacy → root
  session; `startSession(user)` writes canonical + legacy; `loginManager` mirrors
  a root operator session only when the business maps to a real venue;
  `logout`/`logoutManager` clear all session keys. `EatoutsAuth.SESSION` is now
  the canonical key so existing direct writers normalize automatically.
  `routeFor()` sends business owners to `operator-dashboard1.html?biz=…`,
  lodges to `room-manager.html`, food trucks to `food-truck-schedule1.html?biz=…`,
  customers to `eatouts-profile.html`, platform staff to the admin dashboard,
  and unlinked owners to `eatouts-business-signup.html`.


## D4 — Business types live in one module

- `assets/data/business_types.js` (`EatoutsBusinessTypes`) is the single
  registry: 7 types (restaurant, bottlestore, caterer, lodge, bakery, foodtruck,
  supplier) with label/icon/description/modules/roles and a `normalize()`
  synonym map (`bottle_store`, `food_truck`, lodges, …). Nothing else hardcodes
  type labels/descriptions.

## D5 — Blog posts: one union, one authoring surface

- `EatoutsBlog.all()` returns manager-store posts + legacy `eatouts_blog_posts_v1`,
  deduped by id; the public feed (`eatouts-blog.html`) and the staff-admin blog
  tab use this single source. Publishing continues via
  `blog-creator-dashboard.html` (uses the existing blog module).

## D6 — Audit trail on write paths

- `js/eatouts-audit.js` (`EatoutsAudit.log/list/clear`, key `eatouts_audit_v1`,
  capped 500) records identity-changing, business-changing, role-changing and
  publish actions across the manager/workspace pages. Phase 2 wires it into the
  write paths; pages must already load the module (the 4 winners do).

## D7 — Roles and gating stay centralized

- `js/eatouts-roles.js` remains the role source; `EO.guard` is the gate.
  Spec workspaces rely on the platform-role model (platform_admin / staff /
  operator) and business membership via user ↔ business links — no new ad-hoc
  role flags in page scripts.
- **Implemented (Phase 4):** `eatouts-roles.js` now carries both the coarse
  package tokens (kept for back-compat) and the spec's fine-grained permission
  catalog (`users.view/edit/delete`, `businesses.view/approve/suspend`,
  `orders.view/fulfil`, `deliveries.view/dispatch`,
  `staff.view/edit/create_login/delete/view_salary`, `feedback.view/respond/delete`,
  `blog.view/edit/publish/delete`, `finance.view/edit`, `analytics.view`,
  `settings.view/edit`). `can(user, perm)` resolves grants with `*`, `<domain>.*`,
  explicit coarse expansions and scoped `business:*` core (sensitive actions like
  view_salary/billing.edit are owner-only). Presets cover platform roles
  (super_admin, staff_content/ops/support, moderator, platform_analyst + legacy
  aliases) and business roles (owner/admin/manager + type jobs). `grants(user)`
  also honours an explicit `user.platformRole`.

## D7b — Analytics and locations

- **Analytics (Phase 4):** `js/eatouts-analytics.js` (`EatoutsAnalytics`) is the
  central tracker (`track/all/since/count`) over key
  `eatouts_analytics_events_v1` (capped 1000) plus dashboard builders
  `businessMetrics()` / `platformMetrics()` computed from stored records. Every
  aggregate is flagged `offline:true`; pages must not present these as live
  server metrics. `EO.bindCommon()` emits a `page.view` event when the module is
  present.
- **Locations:** the existing `js/eatouts-locations.js` (+ `botswana_locations.js`)
  stays the single district → town → area picker. Do not add duplicate location
  arrays; wire onboarding/profile/addresses/schedules/filters to it.


## D8 — Data safety

- No write path may silently drop legacy/store data; type changes keep hidden
  module data (warn, don't delete). Deletes behind an explicit confirm or the
  existing data-safety dialogs. `dist/` stays a generated artifact (gitignored).

## D9 — Test/verification baseline

- `npm test` (22 suites) must stay green; the four spec pages must keep
  compiling (inline + module syntax checks) and be staged by `copy-static.mjs`.
- Constraints from `HTML_PAGES.md` (client-side only, `localStorage`,
  `crypto.subtle` sign-in needs a secure context) apply to the workspaces too.

## D10 — Scope guard

- Do not add accounts/payments/publish pipelines in the integration work; the
  existing gaps (real analytics, publish gate, billing) stay documented in
  `MARKETING_ONBOARDING_PLAN.md` and are out of scope for this merge.

## D11 — New-business workflow glue (Phase 5)

- `eatouts-business-signup.html` is the single entry point: each type choice
  forwards to `business-onboarding1.html?type=<canonical slug>` (restaurant,
  bottlestore, caterer, lodge, bakery, foodtruck, supplier). The canonical
  onboarding workspace reads `?type=`, normalizes via `EatoutsBusinessTypes`,
  saves drafts locally, and on publish writes the business + staff + owner links
  through the unified adapter before redirecting to
  `operator-dashboard1.html?biz=<id>`. Legacy per-type onboarding pages
  (`restaurant-onboarding.html`, `bottle-store-onboarding.html`, …) are retained
  but are no longer linked from signup; converting them into thin wrappers into
  the canonical onboarding is Phase 6 work.
- Winner pages carry no links to the deleted base pages
  (`operator-dashboard.html`, `business-onboarding.html`,
  `food-truck-schedule.html`); all internal links now use the canonical
  `*1.html` names.

## D12 — Role equivalence + staff/admin guard alignment (Phase 5)

- `EatoutsRoles.hasRole(user, role)` is the central role test: it collects the
  session user's effective roles (`roles` + `platformRole` + `type`) and matches
  through alias groups (`platform_admin ≡ super_admin`, `platform_ops ≡
  staff_ops`, `platform_support ≡ staff_support`, `platform_author/editor ≡
  staff_content`, `platform_analyst ≡ staff_analyst`, `biz_owner ≡ owner`,
  `biz_admin ≡ admin`, `biz_manager ≡ manager`). `EatoutsAuth.hasRole` delegates
  to it, so `EO.guard({roles:[…]})` accepts either canonical or legacy names and
  honours `platformRole`.
- Manager/admin page guards were widened to their canonical roles:
  `feedback-manager.html` now admits `staff_ops`/`staff_support` (plus legacy
  aliases) and loads the unified data adapter so its feedback queue shows the
  same migrated union the staff console shows; `blog-creator-dashboard.html`
  admits `staff_content`. The staff console keeps its per-role tab matrix and
  read-only gating; platform staff opening a business workspace in
  `operator-dashboard1.html` remain read-only (blocked writes).
- `js/eatouts-manager.js` navigation is canonical: `NAV.operator` points at
  `operator-dashboard1.html`, `homeFor("operator")` delegates to
  `EatoutsAuth.routeFor`, and `roleGroup()` classifies canonical `staff_*` /
  `super_admin` / `moderator` accounts as the admin group (previously only
  `platform_*` prefixes were detected).

## D13 — Legacy per-type pages + location wiring (Phase 6)

- The four small legacy per-type onboarding pages (`bottle-store-onboarding.html`,
  `caterer-onboarding.html`, `lodge-onboarding.html`, `supplier-onboarding.html`)
  are now thin wrappers: they forward to
  `business-onboarding1.html?type=<slug>` (preserving any query string, with a
  `<noscript>` fallback and a `<link rel="canonical">`). Legacy in-app links to
  the old "Restaurant" / "Dashboard" pages were repointed to
  `business-onboarding1.html?type=restaurant` and `operator-dashboard1.html`
  across `event-onboarding.html`, `gallery-onboarding.html`, `intake.html`,
  `invoice.html`, `menu-onboarding.html`, `ops-console.html`,
  `promo-onboarding.html` and `seed-demo.html`; `index.html` operator sign-in now
  routes through `EatoutsAuth.routeFor`.
- `restaurant-onboarding.html` and `restaurant-dashboard.html` are **kept as full
  pages** and are NOT wrapped: the 22-suite baseline (D9) asserts them as
  full-featured pages (`tests/appshell.js`, `tests/upload.js`, `tests/dashboard.js`
  check their shell/logo/tabs/compressor/tier constants), so wrapping them would
  break the suite. Users reach the canonical workspace via the relative links and
  `routeFor` above. Revisit only alongside an intentional test update.
- Location selection is now gazetteer-backed. `business-onboarding1.html`'s
  Location module renders cascading District → Town / City → Area / Neighbourhood
  `<select>`s from `EatoutsLocations` (`botswana_locations.js` +
  `js/eatouts-locations.js`, both loaded on the page). It stores the district
  **code** plus human `districtName`, keeps any existing free-text value by
  injecting it as an option, offers the "Other / not listed" escape hatch where
  the source has no areas, and degrades to the previous text inputs if the data
  fails to load. `eatouts-addresses.html` was rewritten from `prompt()`-based
  entry to the same cascading picker, saving a structured address
  (`district`/`districtName`/`town`/`area`/`street` + formatted `address`).
  Verified by a jsdom harness (12 checks: data load, cascade population, escape
  hatch, no runtime errors).
- The picker now reaches the rest of the supplied pages: `food-truck-schedule1.html`
  loads the gazetteer and uses cascading District/Town/Area selects in both the
  weekly day-edit form and the one-off substitution form (storing
  `district` code + `districtName`, with the "Other / not listed" escape hatch and
  a graceful text-input fallback if the data is missing); `eatouts-profile.html`
  gained a "Default delivery location" card (district/town/area + plot) persisted
  to `user.deliveryLocation`; and `customer-delivery.html` prefills the
  destination (area + tier, street/plot, recipient number) from the customer's
  saved default address (address book `isDefault`, else first, else profile
  `deliveryLocation`) **only** when a session exists and no delivery has been
  chosen yet — so `tests/checkout-delivery.js` (which seeds no session/address)
  is unaffected and no fee is added before the customer picks a mode. Verified by
  jsdom harnesses: food-truck (11 checks), profile (6 checks), checkout prefill
  (4 checks); `npm test` remains 22/22.

## D14 — Shared supplier taxonomy (Phase 5 #5)
- `eatouts-event-planner.html` and `eatouts-suppliers.html` each carried a full
  inline copy of the same 8-category supplier catalogue (`var CATALOG = […]`,
  ~4.7 KB each) — two hand-edited variants whose notes/blurbs had drifted.
- `assets/data/supplier_catalog.js` is now the single source of truth. It holds
  the 8 categories with their full `types[]` (`{id,name,note}`) — taken from the
  canonical `reference/eatouts-suppliers-catalog.js` (the most complete variant) —
  and derives an `items[]` (type names) per category for lightweight consumers.
  It exposes the **array** at `window.EATOUTS_SUPPLIER_CATALOG` (so the tiny
  supplied `staging/package/eatouts-suppliers.html` demo, which does
  `EATOUTS_SUPPLIER_CATALOG.map(c => c.items.map(...))`, keeps working).
- Both pages now load `<script src="assets/data/supplier_catalog.js"></script>`
  immediately before their engine script and use
  `var CATALOG = window.EATOUTS_SUPPLIER_CATALOG || []`. The duplicated inline
  arrays were removed (~9.4 KB total). `copy-static.mjs` already copies the whole
  `assets` folder, so the shared file ships. Verified by a jsdom harness (6 checks:
  both pages render the shared catalogue, the 8-category global is present, no
  runtime errors); `npm test` remains 22/22.
## D15 - Phase 8: data-safety / error-handling / UX pass
- Centralised small UI helpers in `js/eatouts-manager.js` (exported on `EO`) so
  every manager page behaves consistently instead of each re-implementing:
  `uid(prefix)`, `phone(v)` (digits, strips a leading `267` for matching),
  `phoneDisplay(v)` (`+267 XX XXX XXX`), `phoneIntl(v)` (keeps the country code --
  `wa.me`/`tel:` links), `page(rows,pageNo,size)` (default 50/page -> `{rows,page,
  pages,size,total,hasPrev,hasNext}`), `pager(state,attr)` (nav markup, default
  `data-page`), `empty(msg,hint)`, and `confirmAction(msg)` (aliased `EO.confirm`
  / `EO.ask`).
- `EatoutsMgrDB.upsert(k,obj)` now rejects records with a missing/empty `id`
  (returns `null`) before writing, so a malformed call can no longer push an
  unkeyed row. All existing callers already supply an id.
- `eatouts-users-manager.html`: escapes all user fields, searches by normalised
  phone as well as name, paginates 50/page, and guards "Reset PIN" with a
  confirmation **and** an `EatoutsAudit.log("user.pin-reset", ...)` entry;
  "Impersonate" logs `user.impersonate`. The page now loads `js/eatouts-audit.js`.
- `feedback-manager.html`: fixed the malformed WhatsApp `href` (missing closing
  quote that broke the whole link and swallowed the anchor text), escapes all
  managed fields, uses `EO.phoneIntl` for a valid `wa.me` link, paginates 50/page,
  and logs `feedback.resolve` on resolve. Loads `js/eatouts-audit.js`.
- `eatouts-addresses.html`: deleting a saved address now requires confirmation and
  logs `address.delete` (before/after snapshot). Loads `js/eatouts-audit.js`.
- Verified by jsdom harness `harness-phase8.mjs` (10 checks: pagination + escaping
  + audit entries on all three pages, plus a well-formed `wa.me/26771100001?...`
  link); `npm test` remains 22/22.

## D16 - Phase 9: integration test plan
- Added `INTEGRATION_TEST_PLAN.md`: how to run the suites, the jsdom limitations to
  filter, a coverage map from the spec's 15 Phase-9 checks to the 22 automated
  suites plus the ad-hoc jsdom harnesses, the Phase-8 harnesses, and a 15-item
  manual browser checklist for the flows jsdom cannot exercise (cross-device order
  visibility, `?biz=` isolation, onboarding resume, 12h staleness, migrations with
  a legacy `eatouts_db_v1` blob, storage-quota failure). Offline/deferred
  behaviours (no server push, local-only analytics, append-only audit) are stated
  explicitly so no capability is over-claimed.

## D17 - 2026-10-11 cleanup + assessment pass (user-approved scope: "fix now")
- **Deleted stale/junk** (not staging/package or reference): research artifact
  `root_inventory_report.md` (accidentally written during planning; plan mode
  blocked removing it at the time, so it was parked in the cleanup list),
  `How they connect.txt`, `indexhtml changes to be made.txt`, junk file `0`,
  `_quarantine/`, superseded drop-in guide `EATOUTS_IMPLEMENTATION_GUIDE.md`, and
  the stale task log `New Pages & AI Build Prompts Task.md`. Retained:
  `staging/package/`, `reference/`, `integration_file.txt`, the two newer
  integration docs, and `SESSION_NOTES.md`.
- **`INTEGRATION_AUDIT.md` refreshed** from the stale "Phase 0" header to
  Phases 1–9 complete, with the remaining page-level gaps listed up front and
  tracked per page in the new `HTML_ASSESSMENT.md`.
- **`.gitignore` cleaned** of entries for deleted files (`How they connect.txt`,
  `indexhtml changes to be made.txt`, `/0`, `_quarantine/`).
- **Pricing seed normalized to P300.** `js/eatouts-manager-db.js` seeded
  `settings.setupFee:450`; changed to `300`. Fresh installs now agree with the
  canonical pricing in `README.md` / `pricing.html` /
  `MARKETING_ONBOARDING_PLAN.md` (P300 setup + P100/P300/P500 monthly).
  `billing-manager.html` still hardcodes its own BWP numbers (250/450/850 +
  450 setup) and is flagged in `HTML_ASSESSMENT.md` to read the shared settings.
- **`HTML_ASSESSMENT.md` created** (Phase C): a per-page status ledger of all 57
  root HTML pages (purpose / audience / auth / stores / status / works / missing /
  needs improvement), cross-cutting gaps (order bridge, escaping/pagination/audit
  coverage, raw-embed XSS), missing routes, and spec deviations, ending in a
  prioritized remediation checklist.
- **Fixes applied (Phase D).** Details recorded as D18–D21 below once completed.
  Deferred/documented-only: reviews subsystem, real APK, push/SMS, cloud media
  uploads for supplier/blog/event pages, legal review of partner terms, live
  one-pager QR/URL — these need external systems or product decisions.

## D18 - 2026-10-11 order bridge: checkout -> shared order store
- **Problem.** `customer-delivery.html` composed a draft under `eatouts_order_v1`
  and opened a WhatsApp compose, but nothing ever wrote a real order into the
  store the business side reads. `order-manager.html`, `eatouts-orders.html` and
  the operator Orders tab therefore only ever showed seed rows.
- **Fix.** On the provider-side "I have sent this on WhatsApp" action (the
  `markSent` toggle flipping to true), `customer-delivery.html` now calls
  `persistCompletedOrder()`. It builds a normalised order and appends it to
  `eatouts_manager_v1.orders` (via `EatoutsMgrDB`), then mirrors it into
  `eatouts_order_v1_history`. The record carries: `id`, `businessId`, `customer`,
  `contact`, `mode`/`window`, `items` (name/size/qty strings), `total` (including
  the delivery fee), `notes`, `created`, `status:"new"`, `source:"whatsapp"`,
  `meta` (area/tier/fee/mode) and a `restaurant:{id,name,whatsapp,meta}` block.
- **Business resolution.** `resolveBusinessId()` matches the draft restaurant
  against `eatouts_manager_v1.businesses` by `slug` then `id`; with no match it
  falls back to a stable derived id so the order still lands in the queue.
- **Idempotency.** `persistCompletedOrder()` guards on the order ref already
  present in the store, so toggling sent off/on (or a repeat send) never
  duplicates the row.
- **Consumers.** `order-manager.html`, `eatouts-orders.html` and
  `operator-dashboard1.html` already read `EatoutsMgrDB.orders`; no change needed
  there. `eatouts-orders.html` gained Reorder/Replay on top (D20).
- **Verification.** Ad-hoc jsdom harness: drives checkout now -> Kgale View ->
  plot -> cash, clicks `markSent`, asserts one order with status `new`,
  `source:"whatsapp"`, resolved `businessId`, customer, size/qty items, P140
  total, restaurant block and area meta, and that re-sending does not duplicate
  (14/14 checks, 0 window errors). `tests/checkout-delivery.js` remains green.

## D19 - 2026-10-11 spec route aliases
- The spec references `eatouts-user-profile.html`, `eatouts-user-orders.html` and
  `eatouts-user-favourites.html`, none of which exist. Added 301 aliases in
  `_redirects` to the canonical `eatouts-profile.html`, `eatouts-orders.html` and
  `eatouts-favourites.html`.

## D20 - 2026-10-11 Phase-8 hardening sweep
- Applied pagination / delete-confirmation / escaping / audit where missing:
  - `staff-manager.html` — audit `staff.delete`; confirmed delete.
  - `order-manager.html` — audit `order.status.changed` (before/after); escaping.
  - `room-manager.html` — escaping on rendered fields; audit `room.status.changed`.
  - `billing-manager.html` — removed hardcoded BWP literals; reads
    `PRICE {setup:300,starter:100,growth:300,pro:500}` with an
    `eatouts_db_v2.settings.pricing` override; audit `billing.tier.changed`.
  - `eatouts-settings.html` — audit `settings.updated`.
  - `quote-manager.html` — audit `quote.created`.
  - `reservation-manager.html` — audit `reservation.created`.
  - `eatouts-orders.html` — escaping + pagination (25/page); Reorder/Replay open
    WhatsApp to `o.restaurant.whatsapp` and log `order.reorder` / `order.replay`.
  - `eatouts-favourites.html` — wired to `EatoutsMgrDB.favourites`; remove via
    `EO.confirm` + audit `favourite.remove`.
- `analytics-manager.html` deliberately left untouched: read-only aggregates, no
  write paths to audit (documented decision).

## D21 - 2026-10-11 Phase-7 page completions (stub alerts replaced)
- `menu-onboarding.html` — the modifier-group `…` button opens a real options
  editor (`editModOptions` + `modOptRow`); selections persist via the row's
  `__mods`/`__mid` and `collectMods()` writes each item's `modifierGroups`.
- `event-onboarding.html` — "Add Service" opens `linkServices` (checkbox list of
  `restaurant.reservationServices` + quick-add) writing `ev.serviceIds`; legacy
  string service entries are normalized to objects, and the event summary handles
  both shapes.
- `operator-dashboard1.html` — tapping an order opens `orderDetail()`, a
  self-contained bottom-sheet drawer (customer/contact/mode/created/notes +
  itemised lines and totals), replacing the `alert()`.
- `business-onboarding1.html` — Preview now renders `showPreview()` (identity,
  location, contact, hours, socials, saved-content counts, live publish
  checklist, "Review & publish"), replacing the `alert()`.
- All four files' inline scripts pass `node --check`; `npm test` remains 22/22.

## D22 - 2026-10-11 restaurant-dashboard weekly/monthly reports (local, no backend)
- **Problem.** The Weekly/Monthly report buttons fired `alert()` previews built
  from the local `deriveAnalytics()` aggregate — not a usable report, and the
  last remaining flagged frontend gap in `HTML_ASSESSMENT.md` §3.9.
- **Fix.** Added `reportData/reportHTML/reportCSV/downloadReport/printReport/
  showReport/closeReport` to `restaurant-dashboard.html`. Each button now opens a
  self-contained on-screen panel (fixed scrim + sheet, inline styles, no new CSS
  dependency): weekly shows the core metrics plus a top-menu-items table; monthly
  adds promo/event interactions and the WhatsApp action-type breakdown. The panel
  offers **Download CSV** (UTF-8 BOM for Excel; `Blob` + `URL.createObjectURL` +
  anchor download, revoking the URL), **Print** (hidden print iframe,
  popup-free), and **Close** (button, backdrop click, or Esc). The card hint text
  was updated to say reports can be opened/downloaded/printed.
- **Still simulated.** The engagement numbers remain pseudo-random derivations of
  content counts. Swapping in real analytics events needs the analytics engine
  (backend/domain) — deferred.
- **Verification.** Ad-hoc jsdom harness: weekly/monthly each open `#reportScrim`
  (no `alert`, count 0), weekly includes the top-menu table and monthly does not,
  monthly includes the WhatsApp breakdown, CSV download yields a blob whose first
  bytes are `EF BB BF` and whose text has the Metric,Value header + rows, and
  Close removes the overlay (16/16 checks, 0 window errors). `npm test` remains
  22/22 ; `tests/dashboard.js` unchanged and green.
- **Scope note.** Backend/domain items remain deferred as agreed: notifications,
  media uploads, customer-review submit flow + `review-manager`, real APK,
  publish verification gate, one-pager QR/URL, partner-terms legal review, event
  RSVP submit flow.
