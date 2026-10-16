# EatOuts — HTML Catalog

> **Auto-generated — do not edit by hand.** Edit `scripts/html_catalog.meta.json`,
> then run `npm run catalog` (regenerates this file) and `npm test` (guards parity).
>
> Generated: 2026-10-16 · Source scan of the project-root `*.html` files.

The numbered, always-current index of every page in the project root: what it is
for, who uses it, how you reach and operate it, and where it stores data. It is
the reference layer; `HTML_ASSESSMENT.md` remains the per-page status/gaps ledger
and `HTML_PAGES.md` the longer capability narrative.

## How to update this file

1. Add / rename / remove a page, or change a page.
2. Edit `scripts/html_catalog.meta.json` — add or update the `pages[]` entry
   (keep the existing `id`; new pages take the next free id), and append a
   dated `changelog[]` entry. Purpose / audience / entry / interactions are the
   human fields; size, store keys, markers and dependencies are computed.
3. Run `npm run catalog` to regenerate `HTML_CATALOG.md`.
4. Run `npm test` — `tests/html-catalog.js` fails if any root `.html` is not
   catalogued (or vice versa), so this file cannot silently drift.

## 1. Summary

| Group | Pages | Size | Lines |
|-------|-------|------|-------|
| Public & customer surfaces | 12 | 793 KB | 15706 |
| Restaurant operator back-office | 6 | 174 KB | 2762 |
| Manager / auth / platform admin (staged package) | 39 | 374 KB | 2724 |
| Delivery flows | 3 | 129 KB | 2226 |
| Internal ops & billing | 3 | 151 KB | 2710 |
| Developer harness | 2 | 224 KB | 4643 |
| **Total** | **65** | **1841 KB** | **30771** |

Status: 60 FULL · 1 PARTIAL · 4 STUB/DEMO.

> Run the app through **`run-eatouts.bat`** (serves the root over `http://127.0.0.1`).
> Opening a page via `file://` isolates `localStorage` per page and breaks
> `crypto.subtle` sign-in. Relevant to the 65 catalogued surfaces below.

## 2. Master index

| # | File | Group | Purpose | How you reach it | Auth | Store keys | Size |
|---|------|-------|---------|------------------|------|-----------|------|
| 1 | `index.html` | public-customer | Public, mobile-first customer app: browse the restaurant directory and open each venue's menu, promotions, events, gallery and about content. | Open the site root served by run-eatouts.bat; About Us hosts Operator Sign in. | - | `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 465 KB / 9392 lines |
| 2 | `get-started.html` | public-customer | Marketing landing that explains the operator offer and links into the intake and pricing flows. | Direct / marketing links. | - | `EatoutsDB`→`eatouts_db_v2` | 13 KB / 185 lines |
| 3 | `pricing.html` | public-customer | Public pricing page; reads and can persist the shared plan prices. | Marketing links; get-started.html. | - | `EatoutsDB`→`eatouts_db_v2` | 13 KB / 243 lines |
| 4 | `one-pager.html` | public-customer | Static sales one-pager for prospects. | Direct link. | - | — | 8 KB / 157 lines |
| 5 | `partner-terms.html` | public-customer | Static partner/merchant terms. | Direct link. | - | — | 15 KB / 188 lines |
| 6 | `404.html` | public-customer | Custom not-found page served by Cloudflare Pages from the build root. | Served automatically on a missing route. | - | — | 9 KB / 232 lines |
| 7 | `eatouts-blog.html` | public-customer | Public blog feed with per-post pages and an on-device authoring tool with version history. | Direct / home links. | - | `EatoutsDB`→`eatouts_db_v2` | 27 KB / 491 lines |
| 8 | `eatouts-event-planner.html` | public-customer | Self-contained event planner (guests, budget, timeline) that deep-links a structured enquiry to WhatsApp. | Direct link. | - | `eatouts_event_planner_v1` | 67 KB / 1366 lines |
| 9 | `eatouts-suppliers.html` | public-customer | Supplier directory plus on-device supplier self-onboarding and sign-in. | Direct link. | - | `eatouts_supplier_draft_v1` `eatouts_supplier_session_v1` `eatouts_suppliers_v1` | 93 KB / 1780 lines |
| 10 | `eatouts_feedback.html` | public-customer | Multi-step feedback form that queues submissions and composes a WhatsApp message to support. | About tab â†’ Settings accordion â†’ Feedback row. | - | `eatouts_feedback_queue_v1` | 40 KB / 834 lines |
| 11 | `restaurant-onboarding.html` | operator-onboarding | Master profile editor for a single restaurant (15 sections). | index.html â†’ About Us â†’ Operator Sign in, then the Restaurant tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 51 KB / 793 lines |
| 12 | `menu-onboarding.html` | operator-onboarding | Build menu categories, items and variants. | Operator back-office â†’ Menu tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 25 KB / 412 lines |
| 13 | `promo-onboarding.html` | operator-onboarding | Create and manage promotions. | Operator back-office â†’ Promos tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 22 KB / 359 lines |
| 14 | `event-onboarding.html` | operator-onboarding | Manage events and the performer roster. | Operator back-office â†’ Events tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 31 KB / 470 lines |
| 15 | `gallery-onboarding.html` | operator-onboarding | Manage gallery groups and images. | Operator back-office â†’ Gallery tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 15 KB / 243 lines |
| 16 | `restaurant-dashboard.html` | operator-onboarding | Owner dashboard: status, completeness, simulated analytics, billing and downloadable/printable reports. | Operator back-office â†’ Dashboard tab. | yes | `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 30 KB / 485 lines |
| 17 | `eatouts-login.html` | manager-admin | Universal WhatsApp + PIN sign-in; routes the user by role. | Direct link; also index.html â†’ About â†’ Operator Sign in â†’ Universal sign-in. | - | — | 5 KB / 44 lines |
| 18 | `eatouts-user-onboarding.html` | manager-admin | Customer account creation with an 18+ gate. | eatouts-login.html â†’ create account. | - | — | 12 KB / 130 lines |
| 19 | `eatouts-business-signup.html` | manager-admin | Business-type chooser for new businesses. | eatouts-login.html / marketing links. | - | `EatoutsMgrDB`→`eatouts_manager_v1` | 28 KB / 565 lines |
| 20 | `bottle-store-onboarding.html` | manager-admin | Redirect wrapper into the unified business onboarding (bottle store). | eatouts-business-signup.html. | - | — | 1 KB / 3 lines |
| 21 | `caterer-onboarding.html` | manager-admin | Redirect wrapper into the unified business onboarding (caterer). | eatouts-business-signup.html. | - | — | 1 KB / 3 lines |
| 22 | `lodge-onboarding.html` | manager-admin | Redirect wrapper into the unified business onboarding (lodge). | eatouts-business-signup.html. | - | — | 1 KB / 3 lines |
| 23 | `supplier-onboarding.html` | manager-admin | Redirect wrapper into the unified business onboarding (supplier). | eatouts-business-signup.html. | - | — | 1 KB / 3 lines |
| 24 | `business-onboarding1.html` | manager-admin | Unified per-type business setup (module rail, draft autosave, preview, save & publish). | eatouts-business-signup.html / per-type wrappers. | yes | `eatouts_business_drafts_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 51 KB / 95 lines |
| 25 | `operator-dashboard1.html` | manager-admin | Role-gated business workspace (orders, staff, reports, settings tabs) with a business switcher. | eatouts-login.html after publishing. | yes | `eatouts_active_business_v2` `eatouts_delivery_orders_v1` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2` | 44 KB / 105 lines |
| 26 | `eatouts-staff-admin1.html` | manager-admin | Restricted platform-staff workspace with role-limited tabs. | eatouts-login.html / eatouts-admin-dashboard.html. | yes | `eatouts_analytics_events_v1` `eatouts_blog_posts_v1` `eatouts_delivery_orders_v1` `eatouts_feedback_queue_v1` `eatouts_feedback_v2` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2` | 19 KB / 56 lines |
| 27 | `food-truck-schedule1.html` | manager-admin | Food-truck location and service-day schedule management. | eatouts-login.html. | yes | `EatoutsDB`→`eatouts_db_v2` | 19 KB / 38 lines |
| 28 | `staff-manager.html` | manager-admin | Staff CRUD, employment records and roles. | eatouts-login.html â†’ operator/admin shell â†’ Staff. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 16 KB / 41 lines |
| 29 | `delivery-manager.html` | manager-admin | Delivery zones, fees, capacity, drivers and windows. | eatouts-login.html â†’ business shell â†’ Delivery. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 30 | `order-manager.html` | manager-admin | Live business order queue. | eatouts-login.html â†’ business shell â†’ Orders. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 31 | `reservation-manager.html` | manager-admin | Table bookings, guests and deposits. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 32 | `room-manager.html` | manager-admin | Lodge rooms, rates and housekeeping. | eatouts-login.html â†’ lodge shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 33 | `billing-manager.html` | manager-admin | Subscription tiers and invoice history. | eatouts-login.html â†’ business shell â†’ Billing. | yes | `eatouts_db_v2` `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 5 lines |
| 34 | `analytics-manager.html` | manager-admin | Order/delivery analytics as read-only aggregates. | eatouts-login.html â†’ business shell â†’ Analytics. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 35 | `quote-manager.html` | manager-admin | Caterer/supplier quote builder. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 36 | `booking-manager.html` | manager-admin | Supplier/lodge booking requests. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 37 | `eatouts-admin-dashboard.html` | manager-admin | Platform control centre: admin links, the promo-submissions queue and the business-links (/bw/<slug>) admin. | eatouts-login.html (admin role). | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 12 KB / 122 lines |
| 38 | `eatouts-users-manager.html` | manager-admin | Users and role management. | eatouts-login.html â†’ admin shell â†’ Users. | yes | — | 3 KB / 7 lines |
| 39 | `feedback-manager.html` | manager-admin | Feedback ticket queue. | eatouts-login.html â†’ admin shell â†’ Feedback. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 4 lines |
| 40 | `blog-creator-dashboard.html` | manager-admin | Blog writer/publisher using EatoutsBlogAdmin. | eatouts-login.html â†’ admin shell â†’ Blog. | yes | — | 2 KB / 3 lines |
| 41 | `eatouts-verification-queue.html` | manager-admin | Business verification queue. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 42 | `eatouts-disputes.html` | manager-admin | Issues, refunds and escalations. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 43 | `eatouts-platform-analytics.html` | manager-admin | Cross-platform analytics. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 44 | `eatouts-notifications.html` | manager-admin | Segment notifications. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 45 | `eatouts-settings.html` | manager-admin | Platform configuration. | eatouts-login.html â†’ admin shell â†’ Settings. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 46 | `eatouts-favourites.html` | manager-admin | Customer saved favourites. | eatouts-login.html â†’ customer shell â†’ Saved. | yes | `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 13 KB / 213 lines |
| 47 | `eatouts-orders.html` | manager-admin | Customer order history. | eatouts-login.html â†’ customer shell â†’ Orders. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 4 KB / 37 lines |
| 48 | `eatouts-profile.html` | manager-admin | Customer profile. | eatouts-login.html â†’ customer shell â†’ Profile. | yes | — | 6 KB / 19 lines |
| 49 | `eatouts-addresses.html` | manager-admin | Customer delivery addresses. | eatouts-login.html â†’ customer shell â†’ Addresses. | yes | — | 6 KB / 57 lines |
| 50 | `customer-delivery.html` | delivery | Customer post-checkout delivery flow; collects delivery details and persists the completed order. | Reached after checkout in the customer app (reads the eatouts_order_v1 draft). | - | `eatouts_active_session_v2` `eatouts_auth_session_v1` `eatouts_manager_v1` `eatouts_order_v1` `eatouts_order_v1_history` `EatoutsMgrDB`→`eatouts_manager_v1` | 56 KB / 1021 lines |
| 51 | `restaurant-delivery.html` | delivery | Restaurant dispatch board (demo): incoming requests, rounds, kitchen prep, routes and settings. | restaurant-onboarding.html Delivery & Dispatch buttons. | - | `eatouts_delivery_orders_v1` | 42 KB / 702 lines |
| 52 | `driver-delivery.html` | delivery | Rider board (demo): duty status, rounds, active stop checklist, problems and completed log. | restaurant-onboarding.html Delivery & Dispatch buttons. | - | — | 31 KB / 503 lines |
| 53 | `intake.html` | internal-ops | Guided operator/concierge intake capture of a restaurant record. | get-started.html / operator links; auth-gated. | yes | `eatouts_intake_draft_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 69 KB / 1155 lines |
| 54 | `invoice.html` | internal-ops | Operator/ops invoice generation. | Ops links; auth-gated. | yes | `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 21 KB / 395 lines |
| 55 | `ops-console.html` | internal-ops | Internal ops tracker: venues, submissions, MRR/activity. | Ops links; auth-gated. | yes | `eatouts_ops_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 61 KB / 1160 lines |
| 56 | `seed-demo.html` | dev-harness | Developer harness that seeds the roster and runs data-layer verification assertions. | run-eatouts.bat â†’ open seed-demo.html. | - | `eatouts_db_v2` `EatoutsDB`→`eatouts_db_v2` | 22 KB / 441 lines |
| 57 | `eatout_event_builder.html` | dev-harness | Legacy experimental event builder. | Direct link. | - | — | 202 KB / 4202 lines |
| 58 | `brand-kit-admin.html` | manager-admin | Admin workspace for design jobs, designers, payouts and services | From eatouts-admin-dashboard.html → Brand & Design card (or direct link) | yes | `eatouts_audit_log_v1` `eatouts_auth_session_v1` `eatouts_brand_jobs_v1` `eatouts_db_v2` `eatouts_designers_v1` `eatouts_jobs_v1` `eatouts_services_v1` `eatouts_users_v1` `EatoutsDB`→`eatouts_db_v2` | 66 KB / 724 lines |
| 59 | `designer-dashboard.html` | manager-admin | Designer private workspace | From designer-services.html → Open your workspace (prototype designer sign-in) | yes | `eatouts_designer_session_v1` | 18 KB / 323 lines |
| 60 | `designer-services.html` | public-customer | Public marketplace for design services | From index.html About → Settings → Need Design | - | — | 38 KB / 746 lines |
| 61 | `eatouts-summaries.html` | manager-admin | Customer saved summaries. | eatouts-login.html → customer shell → Saved Summaries. | yes | — | 2 KB / 23 lines |
| 62 | `eatouts-events.html` | manager-admin | Customer saved events. | eatouts-login.html → customer shell → Events. | yes | — | 3 KB / 25 lines |
| 63 | `eatouts-gallery.html` | manager-admin | Customer saved gallery photos. | eatouts-login.html → customer shell → Gallery. | yes | — | 2 KB / 17 lines |
| 64 | `eatouts-checkout-summary.html` | manager-admin | Checkout summary snapshot. | Reached from checkout flows. | yes | — | 3 KB / 23 lines |
| 65 | `eatouts-about.html` | public-customer | Public About EatOuts page. | From index.html About → Settings → About EatOuts. | - | — | 5 KB / 92 lines |

## 3. Navigation map

### Customer journey (public)

`index.html` is the entry point. Customers search/filter the directory, open a venue and switch between Menu / Promos / Events / Gallery / About, then tap a WhatsApp order or reservation intent. `eatouts-event-planner.html`, `eatouts-suppliers.html`, `eatouts-blog.html` and `eatouts_feedback.html` are reached directly (or from About); `get-started.html` and `pricing.html` are the owner-facing marketing pages, and `one-pager.html`, `partner-terms.html` and `404.html` are static.

### Operator back-office (restaurant owners)

From `index.html` â†’ About Us â†’ Operator Sign in (or demo login) the operator lands on `restaurant-dashboard.html`. The eight onboarding pages share one tab bar (Restaurant Â· Menu Â· Promos Â· Events Â· Gallery Â· Dashboard): `restaurant-onboarding.html`, `menu-onboarding.html`, `promo-onboarding.html`, `event-onboarding.html`, `gallery-onboarding.html`, `restaurant-dashboard.html`. Publish only flags status; there is no server-side publish path.

### Universal sign-in â†’ role shells (staged package)

`eatouts-login.html` is the universal WhatsApp + PIN sign-in and routes by role: customer â†’ `eatouts-profile/orders/favourites/addresses`, operator â†’ `operator-dashboard1.html` (or the `*-manager.html` surfaces), admin â†’ `eatouts-admin-dashboard.html`. `eatouts-business-signup.html` â†’ per-type onboarding (`business-onboarding1.html` and the redirect wrappers). Auth screens use the centred `.login` card; signed-in screens render a role-based shell via `EO.shell`.

### Onboarding & publish

`eatouts-business-signup.html` (or `bottle-store`/`caterer`/`lodge`/`supplier`-`onboarding.html` wrappers) feed `business-onboarding1.html`, which autosaves a draft, previews, and saves/publishes into `operator-dashboard1.html`. Specs are role-gated business workspaces; `eatouts-staff-admin1.html` and `food-truck-schedule1.html` are the other recovered `*1` surfaces.

### Delivery flows

The customer app writes a draft order to `eatouts_order_v1`; `customer-delivery.html` collects delivery mode and, on 'sent on WhatsApp', persists a completed order into `eatouts_manager_v1.orders` (the order bridge). `restaurant-delivery.html` (dispatch board) and `driver-delivery.html` (rider board) are demo boards seeded from the Yellow Giraffe 50-order snapshot; the restaurant board persists to `eatouts_delivery_orders_v1`.

### Internal ops & developer harness

`intake.html`, `invoice.html` and `ops-console.html` are auth-gated operator/ops tools over `eatouts_ops_v1`. `seed-demo.html` seeds the roster and runs data-layer verification; `eatout_event_builder.html` is a legacy experimental builder. Not end-user surfaces.

## 4. Per-page detail

### Public & customer surfaces

#### #1 `index.html`

- **Purpose:** Public, mobile-first customer app: browse the restaurant directory and open each venue's menu, promotions, events, gallery and about content.
- **Audience:** Customers (+ operator sign-in entry)
- **Reach it:** Open the site root served by run-eatouts.bat; About Us hosts Operator Sign in.
- **How you use it:** Search and filter by town/area; open a venue and switch tabs; favourite + WhatsApp icon rows on promo/event cards; the promo detail shows a venue card and a Back to Promos row; tap WhatsApp order/reserve intents; About â†’ Operator Sign in / demo login.
- **Auth:** open · **Status:** FULL
- **Store:** `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 8
- **Size:** 465 KB / 9392 lines (476378 bytes)
- **Loads:** `assets/data/restaurant_listings/restaurant_types_filter.js`, `assets/data/restaurant_listings/directory_runtime_data.js`, `assets/data/restaurant_listings/eatouts_manifest.js`, `assets/data/eatouts_terms_of_service.js`, `assets/data/eatouts_privacy_policy.js`, `assets/data/event_types.js`, `assets/data/venue-provider-list.js`, `assets/data/BottleLliquorStoresDatabase.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-brand.js`, `js/eatouts-bottle-stores.js`, `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-customer.js`, `js/eatouts-seed-data.js`, `js/eatouts-seed.js`, `js/eatouts-bridge.js`, `js/eatouts-slug.js`, `js/eatouts-router.js`
- **Notes:** Promo/event cards and detail pages use bare heart + WhatsApp icon rows; the app resolves /bw/<slug> vanity deep-links (openVanityTarget). The 8 alerts are informational/validation only.

#### #2 `get-started.html`

- **Purpose:** Marketing landing that explains the operator offer and links into the intake and pricing flows.
- **Audience:** Prospective owners
- **Reach it:** Direct / marketing links.
- **How you use it:** Read the pitch, click through to pricing.html and the intake flow.
- **Auth:** open · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 13 KB / 185 lines (13703 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`, `js/eatouts-pricing-source.js`
- **Notes:** Reads eatouts_db_v2 settings only.

#### #3 `pricing.html`

- **Purpose:** Public pricing page; reads and can persist the shared plan prices.
- **Audience:** Public / prospects
- **Reach it:** Marketing links; get-started.html.
- **How you use it:** View plans; persists eatouts_db_v2 settings.pricing that the dashboard and ops console also read.
- **Auth:** open · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 13 KB / 243 lines (13437 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`
- **Notes:** Canonical model: P300 setup + P100/P300/P500 monthly.

#### #4 `one-pager.html`

- **Purpose:** Static sales one-pager for prospects.
- **Audience:** Sales / prospects
- **Reach it:** Direct link.
- **How you use it:** Read / print.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 8 KB / 157 lines (8649 bytes)
- **Loads:** —
- **Notes:** No storage.

#### #5 `partner-terms.html`

- **Purpose:** Static partner/merchant terms.
- **Audience:** Merchants
- **Reach it:** Direct link.
- **How you use it:** Read.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 15 KB / 188 lines (14856 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-pricing-source.js`
- **Notes:** No storage; legal review deferred.

#### #6 `404.html`

- **Purpose:** Custom not-found page served by Cloudflare Pages from the build root.
- **Audience:** Visitors
- **Reach it:** Served automatically on a missing route.
- **How you use it:** Read; tap/click (or Enter/Space) to rotate the headline; follow the home link.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 9 KB / 232 lines (8991 bytes)
- **Loads:** —
- **Notes:** Static and dependency-free. Rotating serif headline (10 messages, 6s), brand-blue (#2C6288) 404, black-2% backdrop, branded top bar + bottom nav.

#### #7 `eatouts-blog.html`

- **Purpose:** Public blog feed with per-post pages and an on-device authoring tool with version history.
- **Audience:** Readers (+ local blog admin)
- **Reach it:** Direct / home links.
- **How you use it:** Read posts, filter by tag/search, share ?post= deep links; admin create/edit/delete with snapshot/restore history.
- **Auth:** open · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 27 KB / 491 lines (28134 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`, `js/eatouts-blog.js`
- **Notes:** Local admin is an on-device key, not EatoutsAuth. Posts export as JSON to publish; no cloud sync.

#### #8 `eatouts-event-planner.html`

- **Purpose:** Self-contained event planner (guests, budget, timeline) that deep-links a structured enquiry to WhatsApp.
- **Audience:** Customers / event hosts
- **Reach it:** Direct link.
- **How you use it:** Plan an event, save a local draft, send the enquiry via WhatsApp.
- **Auth:** open · **Status:** FULL
- **Store:** `eatouts_event_planner_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 67 KB / 1366 lines (68395 bytes)
- **Loads:** `assets/data/supplier_catalog.js`
- **Notes:** Per-device draft only.

#### #9 `eatouts-suppliers.html`

- **Purpose:** Supplier directory plus on-device supplier self-onboarding and sign-in.
- **Audience:** Customers + suppliers
- **Reach it:** Direct link.
- **How you use it:** Search suppliers; a supplier can create/sign into a local profile.
- **Auth:** open · **Status:** FULL
- **Store:** `eatouts_supplier_draft_v1` `eatouts_supplier_session_v1` `eatouts_suppliers_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 93 KB / 1780 lines (94841 bytes)
- **Loads:** `assets/data/supplier_catalog.js`, `assets/data/event_supplier_demo_catalogue.js`, `js/eatouts-slug.js`, `js/eatouts-router.js`
- **Notes:** Supplier 'sign-in' is a local label, not EatoutsAuth. A public read-only supplier profile is reached via /bw/<slug> (/api/links/resolve); loads js/eatouts-slug.js.

#### #10 `eatouts_feedback.html`

- **Purpose:** Multi-step feedback form that queues submissions and composes a WhatsApp message to support.
- **Audience:** Customers / visitors
- **Reach it:** About tab â†’ Settings accordion â†’ Feedback row.
- **How you use it:** Pick a type, fill Summary/Details with tap-in suggestions, add optional fields, then send via WhatsApp.
- **Auth:** open · **Status:** FULL
- **Store:** `eatouts_feedback_queue_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 40 KB / 834 lines (41028 bytes)
- **Loads:** —
- **Notes:** No attachments; screenshot is a pasted web URL.

#### #60 `designer-services.html`

- **Purpose:** Public marketplace for design services
- **Audience:** Businesses/customers
- **Reach it:** From index.html About → Settings → Need Design
- **How you use it:** Browse services, select designer, submit brief
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 38 KB / 746 lines (39208 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-services-seed.js`, `js/eatouts-designers-seed.js`, `js/eatouts-brand-kit.js`
- **Notes:** Uses EatoutsBrandKit

#### #65 `eatouts-about.html`

- **Purpose:** Public About EatOuts page.
- **Audience:** Everyone
- **Reach it:** From index.html About → Settings → About EatOuts.
- **How you use it:** Read the EatOuts story; follow social links.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 5 KB / 92 lines (4990 bytes)
- **Loads:** —
- **Notes:** Standalone page split out of the About tab.

### Restaurant operator back-office

#### #11 `restaurant-onboarding.html`

- **Purpose:** Master profile editor for a single restaurant (15 sections).
- **Audience:** Restaurant owner
- **Reach it:** index.html â†’ About Us â†’ Operator Sign in, then the Restaurant tab.
- **How you use it:** Edit identity/location/contacts/socials/hours/amenities/capacity/payments/reservations/staff/users/delivery; save draft, publish, preview; completeness meter.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 51 KB / 793 lines (52036 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`
- **Notes:** Publish only flags status; no live publish path.

#### #12 `menu-onboarding.html`

- **Purpose:** Build menu categories, items and variants.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Menu tab.
- **How you use it:** Add categories and items (type, price, status, tags); edit variants; open the modifiers editor per item.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 25 KB / 412 lines (25488 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`
- **Notes:** Modifier editor wired in D21.

#### #13 `promo-onboarding.html`

- **Purpose:** Create and manage promotions.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Promos tab.
- **How you use it:** Create/edit/duplicate/pause/delete promos; set pricing, schedule, linked menu items and action.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 22 KB / 359 lines (22477 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`
- **Notes:** Recurring is a stored day list, not a scheduler.

#### #14 `event-onboarding.html`

- **Purpose:** Manage events and the performer roster.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Events tab.
- **How you use it:** Create/edit/duplicate/delete events across 8 sections; link services and performers.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 31 KB / 470 lines (31241 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`
- **Notes:** Service linker wired in D21; attendee/RSVP submit flow still deferred.

#### #15 `gallery-onboarding.html`

- **Purpose:** Manage gallery groups and images.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Gallery tab.
- **How you use it:** Rename/show-hide/reorder/delete groups; add and delete images by URL; thumbnail preview.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 15 KB / 243 lines (14898 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`
- **Notes:** URL-only images; no upload.

#### #16 `restaurant-dashboard.html`

- **Purpose:** Owner dashboard: status, completeness, simulated analytics, billing and downloadable/printable reports.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Dashboard tab.
- **How you use it:** Review KPIs and completeness; cycle the billing tier; open Weekly/Monthly reports (overlay + CSV + print).
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 30 KB / 485 lines (30339 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`
- **Notes:** Analytics remain simulated (pseudo-random from content counts). Reports added in D22.

### Manager / auth / platform admin (staged package)

#### #17 `eatouts-login.html`

- **Purpose:** Universal WhatsApp + PIN sign-in; routes the user by role.
- **Audience:** All
- **Reach it:** Direct link; also index.html â†’ About â†’ Operator Sign in â†’ Universal sign-in.
- **How you use it:** Enter WhatsApp number + PIN; on success redirect by role.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 5 KB / 44 lines (4984 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `assets/data/business_types.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Demo PIN 1234; the gate for every role shell.

#### #18 `eatouts-user-onboarding.html`

- **Purpose:** Customer account creation with an 18+ gate.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ create account.
- **How you use it:** Complete the sign-up form with the age gate.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 2
- **Size:** 12 KB / 130 lines (12185 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/data/restaurant_listings/eatouts_restaurant_picks.js`, `assets/data/BottleLliquorStoresDatabase.js`, `js/eatouts-bottle-stores.js`, `assets/eatouts-manager.css`
- **Notes:** 1 informational alert.

#### #19 `eatouts-business-signup.html`

- **Purpose:** Business-type chooser for new businesses.
- **Audience:** New business
- **Reach it:** eatouts-login.html / marketing links.
- **How you use it:** Pick a business type; routes into the matching onboarding.
- **Auth:** open · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 1
- **Size:** 28 KB / 565 lines (28443 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-field.js`, `js/eatouts-auth.js`, `js/eatouts-slug.js`, `assets/eatouts-manager.css`
- **Notes:** Owners can claim a custom /bw/<slug> link (/api/links/check, /api/business/link); loads js/eatouts-slug.js.

#### #20 `bottle-store-onboarding.html`

- **Purpose:** Redirect wrapper into the unified business onboarding (bottle store).
- **Audience:** Bottle-store owner
- **Reach it:** eatouts-business-signup.html.
- **How you use it:** Redirects to business-onboarding1.html with the type preselected.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 1 KB / 3 lines (767 bytes)
- **Loads:** —
- **Notes:** Wrapper.

#### #21 `caterer-onboarding.html`

- **Purpose:** Redirect wrapper into the unified business onboarding (caterer).
- **Audience:** Caterer owner
- **Reach it:** eatouts-business-signup.html.
- **How you use it:** Redirects to business-onboarding1.html with the type preselected.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 1 KB / 3 lines (736 bytes)
- **Loads:** —
- **Notes:** Wrapper.

#### #22 `lodge-onboarding.html`

- **Purpose:** Redirect wrapper into the unified business onboarding (lodge).
- **Audience:** Lodge owner
- **Reach it:** eatouts-business-signup.html.
- **How you use it:** Redirects to business-onboarding1.html with the type preselected.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 1 KB / 3 lines (722 bytes)
- **Loads:** —
- **Notes:** Wrapper.

#### #23 `supplier-onboarding.html`

- **Purpose:** Redirect wrapper into the unified business onboarding (supplier).
- **Audience:** Supplier owner
- **Reach it:** eatouts-business-signup.html.
- **How you use it:** Redirects to business-onboarding1.html with the type preselected.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 1 KB / 3 lines (743 bytes)
- **Loads:** —
- **Notes:** Wrapper.

#### #24 `business-onboarding1.html`

- **Purpose:** Unified per-type business setup (module rail, draft autosave, preview, save & publish).
- **Audience:** Any owner, or admin-assisted
- **Reach it:** eatouts-business-signup.html / per-type wrappers.
- **How you use it:** Step through modules, autosave a draft, open the rendered preview, then Save & publish â†’ operator-dashboard1.html.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_business_drafts_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 51 KB / 95 lines (52019 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/business_types.js`, `assets/eatouts-manager.css`
- **Notes:** Preview overlay wired in D21; 1 remaining alert.

#### #25 `operator-dashboard1.html`

- **Purpose:** Role-gated business workspace (orders, staff, reports, settings tabs) with a business switcher.
- **Audience:** Linked business owner/admin
- **Reach it:** eatouts-login.html after publishing.
- **How you use it:** Switch businesses; work the orders/staff/reports/settings tabs; open an order's detail drawer.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_active_business_v2` `eatouts_delivery_orders_v1` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 44 KB / 105 lines (44594 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `assets/data/business_types.js`, `assets/eatouts-manager.css`
- **Notes:** Order detail drawer wired in D21.

#### #26 `eatouts-staff-admin1.html`

- **Purpose:** Restricted platform-staff workspace with role-limited tabs.
- **Audience:** Platform staff roles
- **Reach it:** eatouts-login.html / eatouts-admin-dashboard.html.
- **How you use it:** Use the tabs permitted by the signed-in role; read-only feedback for unauth ops.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_analytics_events_v1` `eatouts_blog_posts_v1` `eatouts_delivery_orders_v1` `eatouts_feedback_queue_v1` `eatouts_feedback_v2` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 19 KB / 56 lines (19891 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `assets/eatouts-manager.css`
- **Notes:** Recovered *1 surface.

#### #27 `food-truck-schedule1.html`

- **Purpose:** Food-truck location and service-day schedule management.
- **Audience:** Food-truck owner
- **Reach it:** eatouts-login.html.
- **How you use it:** Set locations and service days; saved through the adapter.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 19 KB / 38 lines (19082 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/business_types.js`, `assets/eatouts-manager.css`
- **Notes:** Recovered *1 surface.

#### #28 `staff-manager.html`

- **Purpose:** Staff CRUD, employment records and roles.
- **Audience:** Biz owner/admin/manager
- **Reach it:** eatouts-login.html â†’ operator/admin shell â†’ Staff.
- **How you use it:** Add/edit/delete staff; assign roles; delete uses a confirm dialog with audit.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm yes · audit yes · alerts 0
- **Size:** 16 KB / 41 lines (15982 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20.

#### #29 `delivery-manager.html`

- **Purpose:** Delivery zones, fees, capacity, drivers and windows.
- **Audience:** Biz owner/admin
- **Reach it:** eatouts-login.html â†’ business shell â†’ Delivery.
- **How you use it:** Manage zones/fees/drivers/windows.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 3 KB / 3 lines (2904 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Zones escaped via EO.esc.

#### #30 `order-manager.html`

- **Purpose:** Live business order queue.
- **Audience:** Biz + staff
- **Reach it:** eatouts-login.html â†’ business shell â†’ Orders.
- **How you use it:** View incoming orders (from the order bridge); change status with before/after audit.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 3 lines (2627 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20.

#### #31 `reservation-manager.html`

- **Purpose:** Table bookings, guests and deposits.
- **Audience:** Biz owner/admin
- **Reach it:** eatouts-login.html â†’ business shell.
- **How you use it:** Create/view reservations; creation is audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 3 lines (2875 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20.

#### #32 `room-manager.html`

- **Purpose:** Lodge rooms, rates and housekeeping.
- **Audience:** Lodge owners
- **Reach it:** eatouts-login.html â†’ lodge shell.
- **How you use it:** Manage rooms/rates; status changes audited; fields escaped.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 3 lines (2837 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20.

#### #33 `billing-manager.html`

- **Purpose:** Subscription tiers and invoice history.
- **Audience:** Biz owner
- **Reach it:** eatouts-login.html â†’ business shell â†’ Billing.
- **How you use it:** Switch tier (audited, before/after); view invoices and setup-fee badge.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_db_v2` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 5 lines (3303 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Data-driven pricing (P300 setup, P100/P300/P500) since D20.

#### #34 `analytics-manager.html`

- **Purpose:** Order/delivery analytics as read-only aggregates.
- **Audience:** Biz owner/admin
- **Reach it:** eatouts-login.html â†’ business shell â†’ Analytics.
- **How you use it:** View metric cards; no writes.
- **Auth:** gated · **Status:** PARTIAL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (2043 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-analytics.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Intentionally read-only and non-paginated (bounded, numeric-only).

#### #35 `quote-manager.html`

- **Purpose:** Caterer/supplier quote builder.
- **Audience:** Caterer/supplier
- **Reach it:** eatouts-login.html â†’ business shell.
- **How you use it:** Build a quote; creation is audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 3 lines (2884 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20.

#### #36 `booking-manager.html`

- **Purpose:** Supplier/lodge booking requests.
- **Audience:** Supplier/lodge
- **Reach it:** eatouts-login.html â†’ business shell.
- **How you use it:** Review and manage booking requests.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (1712 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #37 `eatouts-admin-dashboard.html`

- **Purpose:** Platform control centre: admin links, the promo-submissions queue and the business-links (/bw/<slug>) admin.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html (admin role).
- **How you use it:** Navigate to platform admin surfaces; triage the P50 promo-submission queue (approve/reject/publish); search/filter and revoke/activate business links.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 12 KB / 122 lines (11905 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-analytics.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Promo-submissions actions hit /api/admin/promo-submissions; business links hit /api/admin/links.

#### #38 `eatouts-users-manager.html`

- **Purpose:** Users and role management.
- **Audience:** Platform admin/ops
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Users.
- **How you use it:** Search/paginate users; edit roles; delete with confirm; audited.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager yes · confirm yes · audit yes · alerts 0
- **Size:** 3 KB / 7 lines (3475 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D15.

#### #39 `feedback-manager.html`

- **Purpose:** Feedback ticket queue.
- **Audience:** Platform admin/support
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Feedback.
- **How you use it:** Paginate and triage feedback tickets; audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager yes · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 4 lines (3016 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-data.js`, `js/eatouts-audit.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D15.

#### #40 `blog-creator-dashboard.html`

- **Purpose:** Blog writer/publisher using EatoutsBlogAdmin.
- **Audience:** Platform author
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Blog.
- **How you use it:** Create/edit/publish blog posts.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (2412 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #41 `eatouts-verification-queue.html`

- **Purpose:** Business verification queue.
- **Audience:** Platform ops
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Review and action verification items.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (2150 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #42 `eatouts-disputes.html`

- **Purpose:** Issues, refunds and escalations.
- **Audience:** Platform admin/ops
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Review and manage disputes.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (1920 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #43 `eatouts-platform-analytics.html`

- **Purpose:** Cross-platform analytics.
- **Audience:** Platform admin/analyst
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** View platform-wide metrics.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (1931 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-analytics.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #44 `eatouts-notifications.html`

- **Purpose:** Segment notifications.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Compose/queue segment notifications.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (2322 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Delivery backend deferred.

#### #45 `eatouts-settings.html`

- **Purpose:** Platform configuration.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Settings.
- **How you use it:** Edit platform settings; updates audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc - · pager - · confirm - · audit yes · alerts 0
- **Size:** 3 KB / 3 lines (2812 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `assets/eatouts-manager.css`
- **Notes:** Renders admin-only values (esc n/a, low risk).

#### #46 `eatouts-favourites.html`

- **Purpose:** Customer saved favourites.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Saved.
- **How you use it:** Browse favourite type tabs; remove a favourite with confirm + audit.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth - · esc yes · pager - · confirm yes · audit - · alerts 0
- **Size:** 13 KB / 213 lines (13232 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Wired to the store in D20 (was static).

#### #47 `eatouts-orders.html`

- **Purpose:** Customer order history.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Orders.
- **How you use it:** Browse orders (25/page); Reorder/Replay open WhatsApp to the venue; audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager yes · confirm - · audit yes · alerts 0
- **Size:** 4 KB / 37 lines (4538 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Wired in D20; shows real orders via the D18 bridge.

#### #48 `eatouts-profile.html`

- **Purpose:** Customer profile.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Profile.
- **How you use it:** View/edit the customer profile.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 6 KB / 19 lines (5862 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`

#### #49 `eatouts-addresses.html`

- **Purpose:** Customer delivery addresses.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Addresses.
- **How you use it:** Add/edit/delete addresses; confirm + audit.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm yes · audit yes · alerts 0
- **Size:** 6 KB / 57 lines (6554 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-audit.js`, `js/eatouts-customer.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D15.

#### #58 `brand-kit-admin.html`

- **Purpose:** Admin workspace for design jobs, designers, payouts and services
- **Audience:** Platform admin/ops
- **Reach it:** From eatouts-admin-dashboard.html → Brand & Design card (or direct link)
- **How you use it:** Manage jobs, designers, payouts, services
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_audit_log_v1` `eatouts_auth_session_v1` `eatouts_brand_jobs_v1` `eatouts_db_v2` `eatouts_designers_v1` `eatouts_jobs_v1` `eatouts_services_v1` `eatouts_users_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 66 KB / 724 lines (67538 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-services-seed.js`, `js/eatouts-designers-seed.js`, `js/eatouts-brand-kit.js`
- **Notes:** Connects to EatoutsBrandKit and EatoutsAuth

#### #59 `designer-dashboard.html`

- **Purpose:** Designer private workspace
- **Audience:** Designers
- **Reach it:** From designer-services.html → Open your workspace (prototype designer sign-in)
- **How you use it:** View assigned work, deliverables, revisions, payouts
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_designer_session_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 18 KB / 323 lines (18180 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-services-seed.js`, `js/eatouts-designers-seed.js`, `js/eatouts-brand-kit.js`
- **Notes:** Uses EatoutsBrandKit

#### #61 `eatouts-summaries.html`

- **Purpose:** Customer saved summaries.
- **Audience:** Customers
- **Reach it:** eatouts-login.html → customer shell → Saved Summaries.
- **How you use it:** List saved promo/bottle summaries; remove a summary.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm yes · audit - · alerts 0
- **Size:** 2 KB / 23 lines (2451 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Reads the EatoutsCustomer store.

#### #62 `eatouts-events.html`

- **Purpose:** Customer saved events.
- **Audience:** Customers
- **Reach it:** eatouts-login.html → customer shell → Events.
- **How you use it:** List saved events; remove an event.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm yes · audit - · alerts 0
- **Size:** 3 KB / 25 lines (2756 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Reads the EatoutsCustomer store.

#### #63 `eatouts-gallery.html`

- **Purpose:** Customer saved gallery photos.
- **Audience:** Customers
- **Reach it:** eatouts-login.html → customer shell → Gallery.
- **How you use it:** Grid of saved photos; remove a photo.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 17 lines (2382 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Reads the EatoutsCustomer store.

#### #64 `eatouts-checkout-summary.html`

- **Purpose:** Checkout summary snapshot.
- **Audience:** Customers
- **Reach it:** Reached from checkout flows.
- **How you use it:** Review an order snapshot; save it as a summary.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 3 KB / 23 lines (2610 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** Reads the EatoutsCustomer store.

### Delivery flows

#### #50 `customer-delivery.html`

- **Purpose:** Customer post-checkout delivery flow; collects delivery details and persists the completed order.
- **Audience:** Customers
- **Reach it:** Reached after checkout in the customer app (reads the eatouts_order_v1 draft).
- **How you use it:** Choose delivery mode/zone, confirm details, then 'sent on WhatsApp' persists the order via the order bridge.
- **Auth:** open · **Status:** FULL
- **Store:** `eatouts_active_session_v2` `eatouts_auth_session_v1` `eatouts_manager_v1` `eatouts_order_v1` `eatouts_order_v1_history` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 56 KB / 1021 lines (57807 bytes)
- **Loads:** `assets/data/delivery_zones.js`
- **Notes:** Order bridge (persistCompletedOrder/resolveBusinessId) added D18.

#### #51 `restaurant-delivery.html`

- **Purpose:** Restaurant dispatch board (demo): incoming requests, rounds, kitchen prep, routes and settings.
- **Audience:** Restaurant dispatch (demo)
- **Reach it:** restaurant-onboarding.html Delivery & Dispatch buttons.
- **How you use it:** Accept/manage delivery orders; persists to eatouts_delivery_orders_v1; seeded from the 50-order snapshot.
- **Auth:** open · **Status:** STUB/DEMO
- **Store:** `eatouts_delivery_orders_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 42 KB / 702 lines (43348 bytes)
- **Loads:** `assets/data/deliveries/the_food_place_50_scheduled_deliveries.js`
- **Notes:** No role gating yet (deferred).

#### #52 `driver-delivery.html`

- **Purpose:** Rider board (demo): duty status, rounds, active stop checklist, problems and completed log.
- **Audience:** Delivery rider (demo)
- **Reach it:** restaurant-onboarding.html Delivery & Dispatch buttons.
- **How you use it:** Work through rounds/stops; demo-only, no storage.
- **Auth:** open · **Status:** STUB/DEMO
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 31 KB / 503 lines (31232 bytes)
- **Loads:** `assets/data/deliveries/the_food_place_50_scheduled_deliveries.js`
- **Notes:** Built from the same snapshot; blank street fields render empty.

### Internal ops & billing

#### #53 `intake.html`

- **Purpose:** Guided operator/concierge intake capture of a restaurant record.
- **Audience:** Operator / concierge
- **Reach it:** get-started.html / operator links; auth-gated.
- **How you use it:** Fill the intake draft; optional client-side image picker (compressor â†’ data URL) and video validation; export a venue object.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_intake_draft_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 69 KB / 1155 lines (70953 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-brand.js`, `js/eatouts-locations.js`, `botswana_locations.js`
- **Notes:** No server upload; export feeds the manual merge.

#### #54 `invoice.html`

- **Purpose:** Operator/ops invoice generation.
- **Audience:** Operator / ops
- **Reach it:** Ops links; auth-gated.
- **How you use it:** Create invoices over eatouts_ops_v1.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 21 KB / 395 lines (20992 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`

#### #55 `ops-console.html`

- **Purpose:** Internal ops tracker: venues, submissions, MRR/activity.
- **Audience:** Internal ops
- **Reach it:** Ops links; auth-gated.
- **How you use it:** Track venues/submissions; recomputes MRR from active tiers using shared pricing.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_ops_v1` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 61 KB / 1160 lines (62443 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-field.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`

### Developer harness

#### #56 `seed-demo.html`

- **Purpose:** Developer harness that seeds the roster and runs data-layer verification assertions.
- **Audience:** Developer
- **Reach it:** run-eatouts.bat â†’ open seed-demo.html.
- **How you use it:** Seed demo data, run verification, run the v1â†’v2 migration test, hard reset.
- **Auth:** open · **Status:** STUB/DEMO
- **Store:** `eatouts_db_v2` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 22 KB / 441 lines (22974 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-brand.js`, `js/eatouts-db.js`, `js/eatouts-seed-data.js`, `js/eatouts-seed.js`
- **Notes:** Only meaningful when served over the local server.

#### #57 `eatout_event_builder.html`

- **Purpose:** Legacy experimental event builder.
- **Audience:** Staff / experimental
- **Reach it:** Direct link.
- **How you use it:** Legacy builder UI; not a production surface.
- **Auth:** open · **Status:** STUB/DEMO
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 202 KB / 4202 lines (207170 bytes)
- **Loads:** `assets/data/restaurant_listings/directory_runtime_data.js`, `assets/data/event_types.js`, `assets/data/venue-provider-list.js`, `botswana_locations.js`, `assets/data/masterSupplierCatalogue.js`, `assets/data/event_supplier_demo_catalogue.js`, `js/eatouts-customer.js`
- **Notes:** Superseded by event-onboarding.html.

## 5. Change log

- **2026-10-11** — Created HTML_CATALOG.md with a numbered master index, navigation map and per-page detail; generator (scripts/build_html_catalog.mjs) + guard test (tests/html-catalog.js) enforce that every root .html is catalogued.
- **2026-10-12** — Added brand-kit-admin, designer-dashboard, designer-services to catalog
- **2026-10-12** — Wired entry points: designer-dashboard reachable from designer-services.html, brand-kit-admin from eatouts-admin-dashboard.html; fixed brand-kit-admin login link; generator now prints the live catalogued-surface count.
- **2026-10-13** — Added customer account pages (eatouts-summaries, eatouts-events, eatouts-gallery, eatouts-checkout-summary) and public eatouts-about.html to catalog.
- **2026-10-13** — Renamed eatout-about.html to eatouts-about.html to match the customer-surface naming convention.
- **2026-10-14** — Full refresh: promo/event card icon rows and the promo-detail venue card in index.html; /bw/<slug> vanity links in index.html, eatouts-suppliers.html and eatouts-business-signup.html; business-links + promo-submissions admin on eatouts-admin-dashboard.html.
- **2026-10-14** — Redesigned 404.html: dependency-free rotating-headline layout in brand colours (brand-blue #2C6288 accent, black-2% #00000005 background) with the branded top bar + bottom nav.
- **2026-10-14** — index.html location pickers: all .fpop now fill 66px top / calc(66px+navh) bottom; 24px town labels, 18px transparent count badges, 20px area options; a vertical A–Z jump rail (scroll-spy + drag + bubble) on the promo, restaurant, bottle and reserve town pickers; "All Towns" rows centred; removed the "Picking one makes it active" note.
- **2026-10-14** — index.html bottle + restaurant filter bars: 12px top padding above the first row, 18px button labels, and All Areas centred between the left Town and right Type buttons; renamed the beverage type button to "Type" and the restaurant town button to "All Towns".
- **2026-10-15** — index.html Menu views: replaced the breadcrumb with a tappable Restaurant-Card (white, 4% black border, 90px logo tap-to-preview, name + tagline tap-to-About); removed the per-category heart; .phead h2 now 28px app-wide; enlarged the item thumbnail (54→90px), item/meta text and counters, moved the item heart to right:24px; added a bottom Back button to both views (new openRestAbout act).
- **2026-10-15** — index.html Menu categories + spacing: centred the .cat-row icon/text group (symmetrical 16px padding, .cat-row .minfo flex:none); slimmed the menu-view .phead (8px top/bottom, h2 margin-bottom 0); gave the Menu "Save Summary" pad 40px top / 4px bottom; tightened the two menu-view 24px separators to 10px.
- **2026-10-15** — index.html item labels + steppers: menu-view .ctr labels left-aligned with the price em at 20px (em.price); dropped the redundant item-name label from single-price size rows; enlarged the shared .stp stepper worldwide (buttons 50x45 @24px, .val 20px/min-width 44px, gap 8px).
- **2026-10-15** — index.html menu item price em: .menu-view .ctr .lbl em.price now bold black (#000, weight 800) on top of the 20px size.
- **2026-10-15** — Inactive heart: every img showing heart_inactive_icon.png renders at 50% opacity (index.html + eatout_event_builder.html) via img[src*="heart_inactive_icon"]; active heart/WhatsApp/Reserve untouched.
- **2026-10-15** — Page titles: every root .html now carries a <!-- PAGE: title --> banner after the doctype and <body data-page="slug">; every SPA screen carries a /* PAGE: id — title */ banner and is recorded at runtime as data-page/data-page-title on .screen (PAGE_TITLES map + page() helper). Added PAGE_INVENTORY.md and a read-only validator npm run inventory (scripts/update-inventory.mjs) plus tests/inventory.js.
- **2026-10-15** — Exact-page identity: renderViewport() now also writes data-page-ref (the live instance: venue/category/promo/store/photo id) onto .screen and <body>, via the new pageRef() resolver; added the read-only window.eoPage() console helper that prints a paste-ready one-liner. Validator + tests/inventory.js guard the new wiring; PAGE_INVENTORY.md FAQ documents it.
- **2026-10-15** — index.html Menu navigation: fixed stale state.menuCat leaking across venues (switching venue/tab could show a previous venue's category id, so venue-menu-item rendered "Category not found."). renderRestaurantSubView() now only opens the item page when the category exists in the active venue's menu (else falls back to the category list), and menuCat/menuOpen reset on nav Restaurants, toggleRestaurant, openRestView, openRestFromSearch, backFromRestView and openPromoVenue. Added tests/menu-nav-state.js.
- **2026-10-15** — Bottle menu (.screen[data-page="bottle-menu"]): all .bev-tile labels now use #8A7D63 (rgb(138,125,99)) to match the Drinks/Liquors headings, and tile borders use the same hue at 30% opacity instead of the per-category colour. Disabled (.off) tiles keep the dimmer #6f6553 label. tests/beverages.js asserts both computed colours.
- **2026-10-15** — Beverages navigation: added a bottom Back button to the store grid (data-page="bottle-menu") and a bottom "Back to Menu" button to the category page (data-page="bev-category"). The category back is hierarchical: bevOpenSub/bevOpenBucket now record the origin store on the view, and a new bevBack action returns to that store's Drinks/Liquors grid (or the filter results when the category was opened from search). tests/bottle-stores.js and tests/beverages.js cover both buttons.
- **2026-10-15** — Beverages category (data-page="bev-category"): when a category is opened from a store grid, the breadcrumb is replaced by that store's card (.restcard: logo tile + name + Liquor chain/store meta, tap = bevBack to the store grid); when opened from filter results (no origin store) the crumb is kept. Added press feedback to .bev-item rows and thumbnails (.bev-item:active / .bev-item .mthumb:active scale). tests/beverages.js asserts the store card replaces the crumb and the crumb fallback for search-opened categories.
- **2026-10-15** — Gallery full-photo view (data-page="gallery-photo"): dropped the breadcrumb (backAlbum) and the dots, and moved to an immersive full-screen photo — renderViewport() toggles #shell.gal-photo so the top header, control/filter bar and bottom nav hide while viewing; the image is sized to its content so the dark slide stays tappable around it, and tapping the backdrop (data-act="closePhoto") returns to the grid while tapping the image stays inert; the favourite + WhatsApp buttons are kept. tests/gallery.js updated.
- **2026-10-15** — Gallery full-photo view action row: the favourite + WhatsApp .ico-row split moved out of the bottom of the page and into every slide, directly under that photo (slide becomes a top-aligned column: 16px top offset, 14px gap, image capped at calc(100% - 78px)); the row now hugs the photo at any aspect ratio and travels with it while swiping. Vertical swipe, scroll-snap, backdrop dismiss and image-tap inertia are unchanged. tests/gallery.js asserts the row lives inside the slide.
- **2026-10-15** — Gallery full-photo view polish: the photo is inset 14px from both side edges (slide padding) so it is no longer edge-to-edge, and the favourite + WhatsApp pair is centred under it with a 36px gap (was split space-between across the full width, buttons near the screen edges). Photo height unchanged (~77% of the viewport). tests/gallery.js asserts the pair is centred and the CSS carries the gap + side padding.
- **2026-10-15** — Restaurant + bottle-store directory cards (data-page="restaurants-pager" and data-page="beverages") rebuilt to the menu-selector layout: each card now stacks four full-width rows (Town/City, Neighbourhood, Menu, Promos) above a centred icon row (favourite, WhatsApp, information). Rows are locked until a branch is chosen — single-branch brands auto-count as ready — and tapping a locked row opens a .card-alert explaining that every location has its own menu, with a primary button that jumps straight into the location picker (state.cardAlert, renderCardAlert(), data-locked/data-lock-* attributes + a dispatcher branch). The information icon (assets/icons/information-icon.svg, 50% opacity) leads to the venue-about page for restaurants and a store-details alert for bottle stores. The restaurant logo thumb is now a 54px rounded tile (tap still enlarges it via the existing preview). tests/restloc.js and tests/bottle-stores.js assert the five-row body, lock state and icon row.
- **2026-10-15** — About page (data-page="about-main") polish: the guest profile card is now an orange accent accordion — the secondary line is gone, the whole card is a centred 30px call-to-action that drops the stacked "Create an account"/"Sign in" rows, and opening it (as a signed-out browser) raises a .card-alert popup offering to navigate to the login page via openUniversalLogin (previously a guest tap hard-redirected). Settings rows (.setrow) bumped to 25px/1.35 for readability. The standalone "Share EatOuts" button was removed and the About social row's dead "Website — contact unavailable" slot replaced with a live Share_On icon that opens the WhatsApp share sheet; the unused .btn.share rule was dropped. tests/about.js covers the share icon and the guest accordion/popup.
- **2026-10-15** — About page guest profile card reworked from accordion to a focused sign-in popup: tapping "Create Profile" no longer drops the .pc-rows accordion (that block is now guarded to signed-in users only) and instead opens a centred .card-alert headed by the EatOuts logo, with a six-option vertical list (Favourites, Orders, Events, Saved Summaries, Profile, Gallery — each routing to eatouts-login.html) and Create an account (eatouts-user-onboarding.html) / Sign in / Not now actions. renderCardAlert gained optional a.logo, a.options[] and a.actions[] (href or data-act) while keeping the single-act locked-row alert path; .card-alert now scrolls if tall. tests/about.js asserts the popup content and that no accordion opens.
- **2026-10-16** — Removed the legacy Cloudflare R2 media path: deleted cloudflare-worker.js and js/eatouts-cloud.js and stripped the EatoutsCloud client from eatouts-blog.html (script tag + optional probe), js/eatouts-blog.js (feed fetch / cloud publish branches) and eatouts-suppliers.html (cloud hints, publish button, publishSupplier export path). Media now uses Supabase via /api/upload exclusively.
