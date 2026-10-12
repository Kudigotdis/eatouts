# EatOuts — Root HTML Pages Assessment

Status ledger for every `.html` page in the project root (57 files), built
2026-10-11 from a fresh source scan (JS-marker + storage-key probe of each file)
plus the capability audit in `HTML_PAGES.md`. This is the **per-page
complement** to `INTEGRATION_AUDIT.md` / `INTEGRATION_DECISIONS.md`; it records
what each page is, what it does, what is missing, and what should change. For the
numbered page index (purpose, audience, navigation, size), see **`HTML_CATALOG.md`**
(generated — `npm run catalog`).

Run the app with **`run-eatouts.bat`** (serves the root over `http://127.0.0.1`;
`file://` isolates `localStorage` and breaks `crypto.subtle` sign-in).

---

## 1. Summary

| Count | Status | Meaning |
|------|--------|---------|
| 52 | FULL | Complete and functional for its purpose |
| 1 | PARTIAL | Works, but has a documented stub / dead control / data-source gap (`analytics-manager.html` — read-only, non-paginated by design) |
| 4 | STUB / DEMO | Scaffold, demo, or developer harness (not production surfaces) |
| 0 | MISSING files | All spec pages referenced at runtime exist as files |
| 0 | MISSING routes | `eatouts-user-*` aliases added in `_redirects` (D19, see §5) |

Shared scan markers used below: `shell` = platform shell (`EO.shell`), `auth` =
auth gate (`EO.guard` / `requireSession`), `esc` = output escaping (`EO.esc`),
`pager` = pagination (`EO.pager`), `confirm` = delete/confirm dialog
(`EO.confirm`/`confirmAction`), `audit` = `EatoutsAudit` calls, `alert` = number
of `alert()` calls (placeholders/simulated UI). "Size" is raw KB / lines
(minified manager pages are single long lines).

## 2. Master table (alphabetical)

| Page | Audience | Auth | Store (keys) | Status | Size | esc/pager/confirm/audit | alert |
|------|----------|------|--------------|--------|------|------------------------|-------|
| 404.html | visitors | no | — | FULL (static) | 3.5K/69 | — | 0 |
| analytics-manager.html | biz owner/admin | guard | EatoutsMgrDB `eatouts_manager_v1` | PARTIAL | 1.8K/2 | esc — / pager — / confirm — / audit — | 0 |
| billing-manager.html | biz owner | guard | EatoutsMgrDB | FULL | 2.2K/2 | esc ✔ / audit ✔ | 0 |
| blog-creator-dashboard.html | platform author | guard | EatoutsMgrDB + blog stores | FULL | 2.2K/2 | esc ✔ / pager — / audit — | 0 |
| booking-manager.html | supplier/lodge | guard | EatoutsMgrDB | FULL | 1.5K/2 | esc ✔ / pager — / audit — | 0 |
| bottle-store-onboarding.html | bottlestore owner | n/a | EATOUTS adapter (redirects) | FULL (wrapper) | 0.7K/2 | — | 0 |
| business-onboarding1.html | owner/admin | guard | EatoutsMgrDB + `eatouts_ops_v1` + root v2 | FULL | 47K/84 | esc ✔ / audit ✔ | 1 |
| caterer-onboarding.html | caterer owner | n/a | redirect wrapper | FULL (wrapper) | 0.7K/2 | — | 0 |
| customer-delivery.html | customers | no | `eatouts_order_v1`, read `eatouts_active_session_v2` | FULL | 53K/954 | esc ✔ / audit — | 0 |
| delivery-manager.html | biz owner/admin | guard | EatoutsMgrDB | FULL | 2.7K/2 | esc ✔ / pager — / audit — | 0 |
| driver-delivery.html | rider (demo) | no | none | STUB/DEMO | 30K/502 | esc ✔ | 0 |
| eatout_event_builder.html | staff/experimental | no | none (legacy builder) | STUB/DEMO | 187K/3929 | esc ✔ | 0 |
| eatouts-addresses.html | customers | guard | EatoutsMgrDB | FULL | 4.8K/9 | esc ✔ / confirm ✔ / audit ✔ | 0 |
| eatouts-admin-dashboard.html | platform admin | guard | EatoutsMgrDB | FULL | 2.2K/1 | — / audit — | 0 |
| eatouts-blog.html | readers + local admin | no (on-device key) | `eatouts_blog_v1` + cache | FULL | 28K/492 | — | 0 |
| eatouts-business-signup.html | new business | no | EatoutsMgrDB | FULL | 2.3K/12 | — | 0 |
| eatouts-disputes.html | platform admin/ops | guard | EatoutsMgrDB | FULL | 1.7K/2 | esc ✔ / audit — | 0 |
| eatouts-event-planner.html | event hosts | no | `eatouts_event_planner_v1` | FULL | 67K/1365 | esc ✔ | 0 |
| eatouts-favourites.html | customers | guard | EatoutsMgrDB | FULL | 1.5K/1 | esc ✔ / confirm ✔ / audit ✔ | 0 |
| eatouts-login.html | all | n/a | EatoutsMgrDB + auth | FULL | 2.8K/15 | — | 0 |
| eatouts-notifications.html | platform admin | guard | EatoutsMgrDB | FULL | 2.1K/2 | esc ✔ / audit — | 0 |
| eatouts-orders.html | customers | guard | EatoutsMgrDB | FULL | 1.4K/1 | esc ✔ / pager ✔ / audit ✔ | 0 |
| eatouts-platform-analytics.html | platform admin/analyst | guard | EatoutsMgrDB + analytics | FULL | 1.7K/2 | esc ✔ | 0 |
| eatouts-profile.html | customers | guard | EatoutsMgrDB | FULL | 5.1K/18 | esc ✔ / audit — | 0 |
| eatouts-settings.html | platform admin | guard | EatoutsMgrDB `settings` | FULL | 2.3K/2 | esc — / audit ✔ | 0 |
| eatouts-staff-admin1.html | platform staff | guard | EatoutsMgrDB + legacy keys | FULL | 19K/55 | esc ✔ / audit ✔ | 0 |
| eatouts-suppliers.html | suppliers/customers | no (local label) | `eatouts_suppliers_*` | FULL | 88K/1674 | esc ✔ | 0 |
| eatouts-user-onboarding.html | customers | n/a | EatoutsMgrDB | FULL | 3.2K/14 | — | 1 |
| eatouts-users-manager.html | platform admin/ops | guard | EatoutsMgrDB | FULL | 3.2K/6 | esc ✔ / pager ✔ / confirm ✔ / audit ✔ | 0 |
| eatouts-verification-queue.html | platform ops | guard | EatoutsMgrDB | FULL | 1.9K/2 | esc ✔ / audit — | 0 |
| eatouts_feedback.html | customers/visitors | no | `eatouts_feedback_queue_v1` | FULL | 40K/833 | esc ✔ | 0 |
| event-onboarding.html | restaurant owner | auth | root `eatouts_db_v2` | FULL | 27K/416 | esc ✔ / audit — | 0 |
| feedback-manager.html | platform admin/support | guard | EatoutsMgrDB + adapter | FULL | 2.8K/3 | esc ✔ / pager ✔ / audit ✔ | 0 |
| food-truck-schedule1.html | food truck owner | guard | adapter + EatoutsMgrDB | FULL | 19K/37 | esc ✔ / audit ✔ | 0 |
| gallery-onboarding.html | restaurant owner | auth | root `eatouts_db_v2` | FULL | 15K/242 | esc ✔ | 0 |
| get-started.html | prospective owners | no | reads `eatouts_db_v2` settings | FULL | 13K/184 | — | 0 |
| index.html | customers | no | root `eatouts_db_v2` + `eatouts_order_v1` | FULL | 409K/8445 | esc ✔ | 5 (validation) |
| intake.html | operator/concierge | auth | `eatouts_ops_v1` + `eatouts_intake_draft_v1` | FULL | 69K/1154 | esc ✔ | 0 |
| invoice.html | operator/ops | auth | `eatouts_ops_v1` | FULL | 21K/394 | esc ✔ | 0 |
| lodge-onboarding.html | lodge owner | n/a | redirect wrapper | FULL (wrapper) | 0.6K/2 | — | 0 |
| menu-onboarding.html | restaurant owner | auth | root `eatouts_db_v2` | FULL | 23K/371 | esc ✔ | 0 |
| one-pager.html | sales/prospects | no | — (static) | FULL | 8.4K/156 | — | 0 |
| operator-dashboard1.html | linked biz owner/admin | guard | adapter + `eatouts_order_v1` + `eatouts_ops_v1` + `eatouts_delivery_orders_v1` | FULL | 40K/81 | esc ✔ / audit ✔ | 0 |
| ops-console.html | internal ops | auth | `eatouts_ops_v1` | FULL | 22K/405 | esc ✔ | 0 |
| order-manager.html | biz + staff | guard | EatoutsMgrDB | FULL | 2.1K/2 | esc ✔ / pager — / audit ✔ | 0 |
| partner-terms.html | merchants | no | — (static) | FULL | 15K/187 | — | 0 |
| pricing.html | public | no | `eatouts_db_v2` settings.pricing | FULL | 13K/242 | esc ✔ | 0 |
| promo-onboarding.html | restaurant owner | auth | root `eatouts_db_v2` | FULL | 22K/358 | esc ✔ | 0 |
| quote-manager.html | caterer/supplier | guard | EatoutsMgrDB | FULL | 2.4K/2 | esc ✔ / audit ✔ | 0 |
| reservation-manager.html | biz owner/admin | guard | EatoutsMgrDB | FULL | 2.4K/2 | esc ✔ / audit ✔ | 0 |
| restaurant-dashboard.html | restaurant owner | auth | root `eatouts_db_v2` + `eatouts_ops_v1` | FULL | 24K/403 | esc ✔ / audit — | 0 |
| restaurant-delivery.html | restaurant dispatch | no (demo) | `eatouts_delivery_orders_v1` | STUB/DEMO | 42K/701 | esc ✔ | 0 |
| restaurant-onboarding.html | restaurant owner | auth | root `eatouts_db_v2` | FULL | 51K/792 | esc ✔ | 0 |
| room-manager.html | lodge owners | guard | EatoutsMgrDB | FULL | 2.3K/2 | esc ✔ / audit ✔ | 0 |
| seed-demo.html | developer harness | no | `eatouts_db_v2` | STUB/DEMO | 22K/440 | esc ✔ | 0 |
| staff-manager.html | biz owner/admin/manager | guard | EatoutsMgrDB | FULL | 5.1K/5 | esc ✔ / confirm ✔ / audit ✔ | 0 |
| supplier-onboarding.html | supplier owner | n/a | redirect wrapper | FULL (wrapper) | 0.7K/2 | — | 0 |

> Note on scroll markers: many "—" entries are cosmetic (read-mostly pages). The
> ones that matter for safety are the write paths listed in §4. The single
> remaining PARTIAL row, `analytics-manager.html`, is read-only with bounded,
> non-paginated lists by design (see §4.2).

## 3. Pages with known gaps (detail)

Ordered by the four cross-cutting problems, then by page.

### 3.1 `customer-delivery.html`, `index.html`, `order-manager.html`, `eatouts-orders.html`, `operator-dashboard1.html` — order bridge

- **What works:** the customer app (`index.html` + `customer-delivery.html`)
  composes an order draft, persists it under `eatouts_order_v1`, lets the
  customer pick a delivery mode, and opens a WhatsApp compose to the venue.
  `order-manager.html` renders the business order queue and
  `eatouts-orders.html` the customer's order list from `EatoutsMgrDB.orders`.
  `operator-dashboard1.html` has an Orders tab.
- **Missing (critical):** checkout never appends a completed order to the store
  that `order-manager.html` / `eatouts-orders.html` / the operator Orders tab
  read. `EatoutsMgrDB.orders` only ever shows seed rows; `eatouts_order_v1` is a
  draft key round-tripped between the two customer pages. The customer-facing
  "order sent" state is not mirrored into the business workspace, so a real
  order placed on this device never reaches the operator board on another
  device or even on the same device.
- **Needed:** on checkout completion (WhatsApp send in `customer-delivery.html`),
  append an order record to the shared order store (`EatoutsMgrDB.orders` keyed
  by business id), and have all three consumers read that same store. Keep
  `tests/checkout-delivery.js` green (it seeds no session/address).
- **Resolved (D18):** on "I have sent this on WhatsApp", `customer-delivery.html`
  calls `persistCompletedOrder()`, appending an idempotent (per order ref) record
  to `eatouts_manager_v1.orders` with `businessId` (via `resolveBusinessId()`,
  which matches the restaurant slug/id against `eatouts_manager_v1.businesses`),
  customer, items, total, `status:"new"`, `source:"whatsapp"`, delivery meta and a
  `restaurant:{id,name,whatsapp,meta}` block, mirrored into
  `eatouts_order_v1_history`. Verified by an ad-hoc jsdom harness (14 checks, 0
  window errors); `tests/checkout-delivery.js` stays green.

### 3.2 `menu-onboarding.html` — modifier-group editor is a stub

- **Works:** categories + items + variants (size/price) fully functional.
- **Missing:** the "Modifiers" editor button fires
  `alert('Modifiers editor coming in the next iteration.')`
  (`menu-onboarding.html:329`). No way to define modifier groups, options, or
  option prices per item.
- **Resolved (D21):** the group `…` button now opens a real modifiers editor
  (`editModOptions`) to add/remove options with an add-on price per option; the
  selections are carried through `collectMods()` via the row's `__mods`/`__mid`
  state and persisted on the item's `modifierGroups`. Group ids and options now
  survive save/reopen.

### 3.3 `event-onboarding.html` — service linker is a stub

- **Works:** full events + performers manager.
- **Missing:** "Add Service" fires `alert('Service linker coming next.')`
  (`event-onboarding.html:282`) — services cannot be linked to an event. Also no
  attendee/RSVP list management.
- **Resolved (D21):** "Add Service" opens a real linker (`linkServices`) listing
  `restaurant.reservationServices` with checkboxes (plus quick-add), writing the
  selection to `ev.serviceIds`; string legacy entries are normalized to objects,
  and the editor summary resolves both shapes. (Attendee/RSVP list management is
  still deferred — no submit flow exists.)

### 3.4 `eatouts-orders.html` — dead controls

- **Works:** renders the customer's order history from `EatoutsMgrDB.orders`.
- **Missing:** Reorder / Replay buttons do not actually re-create an order;
  combined with §3.1 the list is empty for real users.
- **Resolved (D20):** list now escapes/paginates (25/page via `EO.page`/`EO.pager`)
  and Reorder/Replay open WhatsApp to the order's venue (`o.restaurant.whatsapp`,
  via `EO.phoneIntl`) with the order text, logging `order.reorder`/`order.replay`.
  With D18, real completed orders now appear here.

### 3.5 `eatouts-favourites.html` — static

- **Works:** renders shell only.
- **Missing:** no favourite/unfavourite wiring to the store; the page is a
  hard-coded placeholder despite an `eatouts_manager_v1` favourites collection
  existing in the seed.
- **Resolved (D20):** wired to `EatoutsMgrDB.favourites` with type tabs, empty
  states, and remove via `EO.confirm` + audit `favourite.remove`.

### 3.6 `operator-dashboard1.html` — order detail is an alert

- **Works:** orders tab lists rows; audit + escaping present.
- **Missing:** tapping an order shows `alert()`; there is no order-detail
  drawer/panel (replace with a real UI) and no audit entry for status changes.
- **Resolved (D21 + D20):** tapping an order opens a real detail drawer
  (`orderDetail`) with customer/contact/mode/created/notes and an itemised line
  list with totals. Status changes already log `order.status.changed` with
  before/after (D20).

### 3.7 `business-onboarding1.html` — preview is an alert

- **Works:** full module-based onboarding with draft autosave, validation,
  publish → `operator-dashboard1.html`.
- **Missing:** the Preview action shows an `alert()` instead of a rendered
  preview of the business.
- **Resolved (D21):** the Preview action opens a rendered overlay (`showPreview`)
  showing identity/tagline/description, location, primary contact, hours,
  socials, a saved-content summary and the live publish checklist, with a
  "Review & publish" jump.

### 3.8 `billing-manager.html` — hardcoded, off-model pricing

- **Works:** tier switcher, invoice history, setup-fee badge.
- **Missing/incorrect:** prices are hardcoded (**setup BWP 450; Starter 250 ·
  Growth 450 · Pro 850**) and disagree with the canonical model
  (**P300 setup · P100 / P300 / P500 monthly**, the same numbers everywhere else:
  `pricing.html`, `partner-terms.html`, `ops-console.html`, `invoice.html`,
  `restaurant-dashboard.html`, `MARKETING_ONBOARDING_PLAN.md`). Should read
  `EatoutsMgrDB.settings.setupFee` + the shared tier prices instead of literals.
  (The manager-db seed was already corrected 450→300; this page still shows the
  old BWP literals.)
- **Resolved (D20):** `billing-manager.html` no longer hardcodes prices. It reads
  `PRICE {setup:300,starter:100,growth:300,pro:500}` with an
  `eatouts_db_v2.settings.pricing` override, and logs `billing.tier.changed` with
  before/after on tier switches. `tests/dashboard.js` asserts the P100 starter
  price and P300 setup fee.

### 3.9 `restaurant-dashboard.html` — reports now render locally (D22)

- **Was:** Weekly/Monthly were `alert()` previews (2 alerts) rather than a
  usable report.
- **Resolved (D22):** both buttons now open a self-contained on-screen report
  panel (`showReport`) built from the same local `deriveAnalytics()` aggregate —
  weekly adds a top-menu-items table, monthly adds promo/event interactions and
  the WhatsApp action-type breakdown. Each panel offers **Download CSV** (with a
  UTF-8 BOM so Excel opens it cleanly), **Print** (hidden print iframe) and
  **Close** (Esc/backdrop). No `alert()` remains in the file.
- **Still simulated:** the underlying engagement numbers are derived
  pseudo-randomly from content counts, not real analytics events. Replacing them
  with real event data needs the analytics engine (backend) — deferred.

### 3.10 Other minor alerts

- `index.html` (5 alerts), `eatouts-user-onboarding.html` (1) — informational
  toasts/confirm prompts; acceptable, low priority.

## 4. Cross-cutting gaps

1. **Order bridge** (see §3.1) — the single most important gap: broken
   customer → business → history ordering loop.
2. **Phase-8 hardening on write paths (resolved D20).** `EatoutsMgrDB` pages that
   were missing one or more of pagination / delete-confirmation / escaping /
   audit have now been hardened:
   - `staff-manager.html` — added audit on staff.delete; delete confirmation.
   - `order-manager.html` — added `order.status.changed` audit with before/after;
     escaping tightened.
   - `room-manager.html` — escaping on rendered fields; `room.status.changed`
     audit.
   - `billing-manager.html` — `billing.tier.changed` audit; data-driven pricing.
   - `eatouts-settings.html` — `settings.updated` audit.
   - `quote-manager.html` — `quote.created` audit.
   - `reservation-manager.html` — `reservation.created` audit.
   - `eatouts-orders.html` — escaping + pagination; Reorder/Replay wired.
   - `eatouts-favourites.html` — wired to the store (was static).
   - `analytics-manager.html` — left as-is by design: read-only aggregates, no
     writes to audit; long event lists are non-paginated but bounded.
   Compare with the already-hardened pages: `eatouts-addresses.html`,
   `eatouts-users-manager.html`, `feedback-manager.html` (D15).
3. **Escaping vs raw embed (verified).** Manager pages commonly render user
   fields through `innerHTML`; pages without `EO.esc` on managed fields risk
   stored-XSS from anything saved in `eatouts_manager_v1` / root `eatouts_db_v2`.
   Audit result: write-path pages now escape managed fields, and the previously
   ungated read-only ones are numeric-only — `analytics-manager.html` builds only
   `EO.metric(...)` numbers, and `delivery-manager.html` escapes zones via
   `EO.esc`. No manager page was found injecting a raw user-controlled string.
   `eatouts-settings.html` remains `esc —` but renders only admin-controlled
   platform settings (low risk).
4. **Publish gate is setup-fee-only.** `restaurant-onboarding.html` publish
   checks name/town/contact + (via ops) setup-fee paid; there is no
   verification/approval gate (ok by design — D13).

## 5. Missing routes / aliases

The spec references `eatouts-user-profile.html`, `eatouts-user-orders.html` and
`eatouts-user-favourites.html`. None of these files exist and no redirect covers
them. The canonical pages are `eatouts-profile.html`, `eatouts-orders.html` and
`eatouts-favourites.html` respectively. Applied in `_redirects` (D19):

```
/eatouts-user-profile.html   /eatouts-profile.html    301
/eatouts-user-orders.html    /eatouts-orders.html     301
/eatouts-user-favourites.html /eatouts-favourites.html 301
```

## 6. Spec deviations (already accepted)

- **`*1` names vs spec dash-names.** `business-onboarding1/operator-dashboard1/
  eatouts-staff-admin1/food-truck-schedule1` are canonical; base pages deleted
  (D2). Old underscore names (`eatouts_feedback.html`, `eatout_event_builder.html`)
  remain as-is.
- **Reviews module dropped** (`review-manager.html`) — decision D-dropped; the
  `reviews` seed collection exists but there is no customer submit flow.
- **Audit key name** `eatouts_audit_v1` (D6) is a deliberate rename from the
  package's key.
- **Pricing.** The package's own BWP 250/450/850 + setup 450 model (still shown by
  `billing-manager.html`) is superseded by the canonical P300 + P100/P300/P500
  (see §3.8).

## 7. Prioritized remediation checklist

Priority ordered by risk × user impact. Items marked **[done]** landed in this
pass; the rest are the open backlog (documented exactly where they live so they
can be picked up without re-research).

1. [x] **Order bridge** — persist completed order on checkout; make
   `order-manager.html` / `eatouts-orders.html` / `operator-dashboard1.html`
   read the shared store (§3.1). **Done (D18)** — verified by jsdom harness.
2. [x] **Route aliases** — three `eatouts-user-*` 301 redirects (§5). **Done (D19).**
3. [x] **Phase-8 sweep** — pagination/confirm/esc/audit on staff-manager,
   order-manager, room-manager, billing-manager, eatouts-settings,
   quote-manager, reservation-manager, eatouts-orders, eatouts-favourites;
   analytics-manager left read-only by design (§4.2). **Done (D20).**
4. [x] **`billing-manager.html` pricing** — read shared settings instead of
   BWP literals (§3.8). **Done (D20).**
5. [x] **Menu modifiers editor** — replace `menu-onboarding.html` stub (§3.2).
   **Done (D21).**
6. [x] **Event service linker** — replace `event-onboarding.html` stub (§3.3).
   **Done (D21).**
7. [x] **Wire `eatouts-favourites.html`** to `EatoutsMgrDB.favourites` (§3.5);
   wire `eatouts-orders.html` Reorder/Replay (§3.4). **Done (D20).**
8. [x] **Replace alert placeholders** — operator order-detail drawer and
   onboarding preview (§3.6, §3.7). **Done (D21).**
9. [~] **Deferred — backend/domain (waiting on the live domain + server):**
   push/SMS notifications, Cloudflare/Supabase media uploads for
   supplier/blog/event pages, customer-review submit flow + `review-manager`,
   real APK install, publish verification/approval gate (ops), live one-pager
   QR/URL, and the event RSVP *submit* flow. **Deferred — product/legal:** legal
   review of partner terms. None of these are frontend-completeable now.
10. [x] **Ongoing:** keep `npm test` (22 suites) green on every change; re-run
    the phase-8 jsdom harnesses after the sweep. **Done** — 22/22 suites pass;
    the order-bridge harness passes 14/14.
11. [x] **Restaurant reports** — replace `restaurant-dashboard.html` report
    `alert()`s with a local overlay + CSV + print (§3.9). **Done (D22)** —
    verified by jsdom harness (16 checks, 0 alerts).