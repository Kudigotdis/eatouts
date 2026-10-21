# EatOuts — HTML Catalog

> **Auto-generated — do not edit by hand.** Edit `scripts/html_catalog.meta.json`,
> then run `npm run catalog` (regenerates this file) and `npm test` (guards parity).
>
> Generated: 2026-10-21 · Source scan of the project-root `*.html` files.

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
| Public & customer surfaces | 14 | 878 KB | 17503 |
| Restaurant operator back-office | 9 | 536 KB | 6723 |
| Manager / auth / platform admin (staged package) | 38 | 1145 KB | 22773 |
| Delivery flows | 3 | 129 KB | 2226 |
| Internal ops & billing | 3 | 153 KB | 2750 |
| Developer harness | 2 | 224 KB | 4643 |
| **Total** | **69** | **3063 KB** | **56618** |

Status: 63 FULL · 1 REDIRECT · 1 PARTIAL · 4 STUB/DEMO.

> Run the app through **`run-eatouts.bat`** (serves the root over `http://127.0.0.1`).
> Opening a page via `file://` isolates `localStorage` per page and breaks
> `crypto.subtle` sign-in. Relevant to the 69 catalogued surfaces below.

## 2. Master index

| # | File | Group | Purpose | How you reach it | Auth | Store keys | Size |
|---|------|-------|---------|------------------|------|-----------|------|
| 1 | `index.html` | public-customer | Public, mobile-first customer app: browse the restaurant directory and open each venue's menu, promotions, events, gallery and about content. | Open the site root served by run-eatouts.bat; About Us hosts Operator Sign in. | - | `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 502 KB / 9967 lines |
| 2 | `get-started.html` | public-customer | Marketing landing that explains the operator offer and links into the intake and pricing flows. | Direct / marketing links. | - | `EatoutsDB`→`eatouts_db_v2` | 13 KB / 185 lines |
| 3 | `pricing.html` | public-customer | Public pricing page; reads and can persist the shared plan prices. | Marketing links; get-started.html. | - | `EatoutsDB`→`eatouts_db_v2` | 13 KB / 243 lines |
| 4 | `one-pager.html` | public-customer | Static sales one-pager for prospects. | Direct link. | - | — | 17 KB / 650 lines |
| 5 | `partner-terms.html` | public-customer | Static partner/merchant terms. | Direct link. | - | — | 15 KB / 188 lines |
| 6 | `404.html` | public-customer | Custom not-found page served by Cloudflare Pages from the build root. | Served automatically on a missing route. | - | — | 9 KB / 232 lines |
| 7 | `eatouts-blog.html` | public-customer | Public blog feed with per-post pages and an on-device authoring tool with version history. | Direct / home links. | - | `EatoutsDB`→`eatouts_db_v2` | 27 KB / 491 lines |
| 8 | `eatouts-suppliers.html` | public-customer | Supplier directory plus on-device supplier self-onboarding and sign-in. | Direct link. | - | `eatouts_supplier_draft_v1` `eatouts_supplier_session_v1` `eatouts_suppliers_v1` | 93 KB / 1780 lines |
| 9 | `eatouts_feedback.html` | public-customer | Multi-step feedback form that queues submissions and composes a WhatsApp message to support. | About tab â†’ Settings accordion â†’ Feedback row. | - | `eatouts_feedback_queue_v1` | 40 KB / 834 lines |
| 10 | `restaurant-onboarding.html` | operator-onboarding | Restaurant setup: brand identity, branches/outlets, venue spaces, menu, promotions and the Hosting Services block. | eatouts-business-signup.html → Restaurant; the operator dashboard. | yes | — | 125 KB / 574 lines |
| 11 | `menu-onboarding.html` | operator-onboarding | Build menu categories, items and variants. | Operator back-office â†’ Menu tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 28 KB / 433 lines |
| 12 | `promo-onboarding.html` | operator-onboarding | Create and manage promotions. | Operator back-office â†’ Promos tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 26 KB / 398 lines |
| 13 | `event-onboarding.html` | operator-onboarding | Manage events and the performer roster. | Operator back-office â†’ Events tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 52 KB / 1409 lines |
| 14 | `gallery-onboarding.html` | operator-onboarding | Manage gallery groups and images. | Operator back-office â†’ Gallery tab. | yes | `EatoutsDB`→`eatouts_db_v2` | 18 KB / 267 lines |
| 15 | `restaurant-dashboard.html` | operator-onboarding | Owner dashboard: status, completeness, simulated analytics, billing and downloadable/printable reports. | Operator back-office â†’ Dashboard tab. | yes | `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 30 KB / 485 lines |
| 16 | `eatouts-login.html` | manager-admin | Universal WhatsApp + PIN sign-in; routes the user by role. | Direct link; also index.html â†’ About â†’ Operator Sign in â†’ Universal sign-in. | - | — | 5 KB / 44 lines |
| 17 | `eatouts-user-onboarding.html` | manager-admin | Redirect shim — the customer account page now lives at eatouts_user_onboarding.html. | Old bookmarks and links. | - | — | 1 KB / 30 lines |
| 18 | `eatouts-business-signup.html` | manager-admin | Business-type chooser for new businesses; each card opens that type’s own onboarding form. | eatouts-login.html / marketing links. | - | — | 31 KB / 947 lines |
| 19 | `bottle-store-onboarding.html` | manager-admin | Bottle & liquor store setup: brand and outlets, stock, tastings, delivery and the Hosting Services block. | eatouts-business-signup.html → Bottle store; the operator dashboard. | - | — | 117 KB / 1630 lines |
| 20 | `caterer-onboarding.html` | manager-admin | Caterer setup: brand and outlets, menus, service coverage and delivery areas, plus the Hosting Services block. | eatouts-business-signup.html → Caterer; the operator dashboard. | - | — | 137 KB / 1903 lines |
| 21 | `lodge-onboarding.html` | manager-admin | Lodge setup: property details, rooms, amenities, rates and booking rules. | eatouts-business-signup.html → Lodge; the operator dashboard. | - | — | 32 KB / 1093 lines |
| 22 | `supplier-onboarding.html` | manager-admin | Event supplier setup: the catalogue of services this supplier offers, contact and coverage details, and the Hosting Services block. | eatouts-business-signup.html → Event supplier; the operator dashboard. | - | — | 130 KB / 1234 lines |
| 23 | `operator-dashboard1.html` | manager-admin | Role-gated business workspace (orders, staff, reports, settings tabs) with a business switcher. | eatouts-login.html after publishing. | yes | `eatouts_active_business_v2` `eatouts_delivery_orders_v1` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2` | 44 KB / 105 lines |
| 24 | `eatouts-staff-admin1.html` | manager-admin | Restricted platform-staff workspace with role-limited tabs. | eatouts-login.html / eatouts-admin-dashboard.html. | yes | `eatouts_analytics_events_v1` `eatouts_blog_posts_v1` `eatouts_delivery_orders_v1` `eatouts_feedback_queue_v1` `eatouts_feedback_v2` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2` | 54 KB / 1506 lines |
| 25 | `food-truck-schedule1.html` | manager-admin | Food-truck location and service-day schedule management. | eatouts-login.html. | yes | `EatoutsDB`→`eatouts_db_v2` | 19 KB / 38 lines |
| 26 | `staff-manager.html` | manager-admin | Staff CRUD, employment records and roles. | eatouts-login.html â†’ operator/admin shell â†’ Staff. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 18 KB / 43 lines |
| 27 | `delivery-manager.html` | manager-admin | Delivery zones, fees, capacity, drivers and windows. | eatouts-login.html â†’ business shell â†’ Delivery. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 33 KB / 824 lines |
| 28 | `order-manager.html` | manager-admin | Live business order queue. | eatouts-login.html â†’ business shell â†’ Orders. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 29 | `reservation-manager.html` | manager-admin | Table bookings, guests and deposits. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 30 | `room-manager.html` | manager-admin | Lodge rooms, rates and housekeeping. | eatouts-login.html â†’ lodge shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 31 | `billing-manager.html` | manager-admin | Subscription tiers and invoice history. | eatouts-login.html â†’ business shell â†’ Billing. | yes | `eatouts_db_v2` `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 5 lines |
| 32 | `analytics-manager.html` | manager-admin | Order/delivery analytics as read-only aggregates. | eatouts-login.html â†’ business shell â†’ Analytics. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 33 | `quote-manager.html` | manager-admin | Caterer/supplier quote builder. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 3 lines |
| 34 | `booking-manager.html` | manager-admin | Supplier/lodge booking requests. | eatouts-login.html â†’ business shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 2 KB / 3 lines |
| 35 | `eatouts-admin-dashboard.html` | manager-admin | Platform control centre: admin links, the promo-submissions queue and the business-links (/bw/<slug>) admin. | eatouts-login.html (admin role). | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 42 KB / 1012 lines |
| 36 | `eatouts-users-manager.html` | manager-admin | Users and role management. | eatouts-login.html â†’ admin shell â†’ Users. | yes | — | 29 KB / 957 lines |
| 37 | `feedback-manager.html` | manager-admin | Feedback ticket queue. | eatouts-login.html â†’ admin shell â†’ Feedback. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 3 KB / 4 lines |
| 38 | `blog-creator-dashboard.html` | manager-admin | Blog writer/publisher using EatoutsBlogAdmin. | eatouts-login.html â†’ admin shell â†’ Blog. | yes | — | 29 KB / 700 lines |
| 39 | `eatouts-verification-queue.html` | manager-admin | Business verification queue. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 21 KB / 713 lines |
| 40 | `eatouts-disputes.html` | manager-admin | Issues, refunds and escalations. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 20 KB / 432 lines |
| 41 | `eatouts-platform-analytics.html` | manager-admin | Cross-platform analytics. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 24 KB / 809 lines |
| 42 | `eatouts-notifications.html` | manager-admin | Segment notifications. | eatouts-login.html â†’ admin shell. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 27 KB / 941 lines |
| 43 | `eatouts-settings.html` | manager-admin | Platform configuration. | eatouts-login.html â†’ admin shell â†’ Settings. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 31 KB / 1006 lines |
| 44 | `eatouts-favourites.html` | manager-admin | Customer saved favourites. | eatouts-login.html â†’ customer shell â†’ Saved. | yes | `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 37 KB / 1278 lines |
| 45 | `eatouts-orders.html` | manager-admin | Customer order history. | eatouts-login.html â†’ customer shell â†’ Orders. | yes | `EatoutsMgrDB`→`eatouts_manager_v1` | 29 KB / 967 lines |
| 46 | `eatouts-profile.html` | manager-admin | Customer profile. | eatouts-login.html â†’ customer shell â†’ Profile. | yes | — | 39 KB / 1217 lines |
| 47 | `eatouts-addresses.html` | manager-admin | Customer delivery addresses. | eatouts-login.html â†’ customer shell â†’ Addresses. | yes | — | 29 KB / 707 lines |
| 48 | `customer-delivery.html` | delivery | Customer post-checkout delivery flow; collects delivery details and persists the completed order. | Reached after checkout in the customer app (reads the eatouts_order_v1 draft). | - | `eatouts_active_session_v2` `eatouts_auth_session_v1` `eatouts_manager_v1` `eatouts_order_v1` `eatouts_order_v1_history` `EatoutsMgrDB`→`eatouts_manager_v1` | 56 KB / 1021 lines |
| 49 | `restaurant-delivery.html` | delivery | Restaurant dispatch board (demo): incoming requests, rounds, kitchen prep, routes and settings. | restaurant-onboarding.html Delivery & Dispatch buttons. | - | `eatouts_delivery_orders_v1` | 42 KB / 702 lines |
| 50 | `driver-delivery.html` | delivery | Rider board (demo): duty status, rounds, active stop checklist, problems and completed log. | restaurant-onboarding.html Delivery & Dispatch buttons. | - | — | 31 KB / 503 lines |
| 51 | `intake.html` | internal-ops | Guided operator/concierge intake capture of a restaurant record. | get-started.html / operator links; auth-gated. | yes | `eatouts_intake_draft_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 72 KB / 1195 lines |
| 52 | `invoice.html` | internal-ops | Operator/ops invoice generation. | Ops links; auth-gated. | yes | `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2` | 20 KB / 395 lines |
| 53 | `ops-console.html` | internal-ops | Internal ops tracker: venues, submissions, MRR/activity. | Ops links; auth-gated. | yes | `eatouts_ops_v1` `EatoutsMgrDB`→`eatouts_manager_v1` | 61 KB / 1160 lines |
| 54 | `seed-demo.html` | dev-harness | Developer harness that seeds the roster and runs data-layer verification assertions. | run-eatouts.bat â†’ open seed-demo.html. | - | `eatouts_db_v2` `EatoutsDB`→`eatouts_db_v2` | 22 KB / 441 lines |
| 55 | `eatout_event_builder.html` | dev-harness | Legacy experimental event builder. | Direct link. | - | — | 202 KB / 4202 lines |
| 56 | `brand-kit-admin.html` | manager-admin | Admin workspace for design jobs, designers, payouts and services | From eatouts-admin-dashboard.html → Brand & Design card (or direct link) | yes | `eatouts_audit_log_v1` `eatouts_auth_session_v1` `eatouts_brand_jobs_v1` `eatouts_db_v2` `eatouts_designers_v1` `eatouts_jobs_v1` `eatouts_services_v1` `eatouts_users_v1` `EatoutsDB`→`eatouts_db_v2` | 66 KB / 724 lines |
| 57 | `designer-dashboard.html` | manager-admin | Designer private workspace | From designer-services.html → Open your workspace (prototype designer sign-in) | yes | `eatouts_designer_session_v1` | 18 KB / 323 lines |
| 58 | `designer-services.html` | public-customer | Public marketplace for design services | From index.html About → Settings → Need Design | - | — | 38 KB / 746 lines |
| 59 | `eatouts-summaries.html` | manager-admin | Customer saved summaries. | eatouts-login.html → customer shell → Saved Summaries. | yes | — | 23 KB / 756 lines |
| 60 | `eatouts-events.html` | manager-admin | Customer saved events. | eatouts-login.html → customer shell → Events. | yes | — | 18 KB / 402 lines |
| 61 | `eatouts-gallery.html` | manager-admin | Customer saved gallery photos. | eatouts-login.html → customer shell → Gallery. | yes | — | 2 KB / 17 lines |
| 62 | `eatouts-checkout-summary.html` | manager-admin | Checkout summary snapshot. | Reached from checkout flows. | yes | — | 18 KB / 388 lines |
| 63 | `eatouts-about.html` | public-customer | Public About EatOuts page. | From index.html About → Settings → About EatOuts. | - | — | 5 KB / 92 lines |
| 64 | `about-guest-popup.html` | public-customer | Standalone demo of the Create Profile popup on the About tab. | Open from About tab | - | — | 11 KB / 162 lines |
| 65 | `about-profile-options.html` | public-customer | Standalone demo of the logged‑in profile‑options popup. | Open from About tab | - | — | 35 KB / 473 lines |
| 66 | `venue-about.html` | public-customer | Data-driven standalone venue About page: renders ANY resolved business's About surface (logo, hero, status, social row, Options, Operating Hours, Venue, Promos, Ambience, Amenities, Menu Tags) from the resolved business alone — no hardcoded venue values, section visibility driven only by present data. | Open directly; pick a business with ?link=<slug> (e.g. venue-about.html?link=nandos) or #<slug> (e.g. venue-about.html#nandos). No slug or an unresolvable slug hands straight back to the directory (location.replace('index.html#restaurants')) — there is no placeholder screen. | - | — | 60 KB / 1460 lines |
| 67 | `bakery-onboarding.html` | operator-onboarding | Bakery setup: brand identity, outlets, product range, café/seating capability and the Hosting Services block. | eatouts-business-signup.html → Bakery; the operator dashboard. | - | — | 127 KB / 1702 lines |
| 68 | `mobile-kitchen-onboarding.html` | operator-onboarding | Mobile kitchen setup: units, service locations, grab-and-go menu, throughput and the Hosting Services block. | eatouts-business-signup.html → Mobile Kitchen; the operator dashboard. | - | — | 113 KB / 1185 lines |
| 69 | `eatouts_user_onboarding.html` | operator-onboarding | Customer account creation: name, 18+ gate, live town/area lookup, username + WhatsApp login, WhatsApp confirmation and favourite picks. | eatouts-login.html “Create an account”; the About Us guest popup; index.html. | - | — | 17 KB / 270 lines |

## 3. Navigation map

### Customer journey (public)

`index.html` is the entry point. Customers search/filter the directory, open a venue and switch between Menu / Promos / Events / Gallery / About, then tap a WhatsApp order or reservation intent. `eatouts-suppliers.html`, `eatouts-blog.html` and `eatouts_feedback.html` are reached directly (or from About); `get-started.html` and `pricing.html` are the owner-facing marketing pages, and `one-pager.html`, `partner-terms.html` and `404.html` are static.

### Operator back-office (restaurant owners)

From `index.html` → About Us → Operator Sign in (or demo login) the operator lands on `restaurant-dashboard.html`. The eight onboarding pages share one tab bar (Restaurant · Menu · Promos · Events · Gallery · Dashboard): `restaurant-onboarding.html`, `menu-onboarding.html`, `promo-onboarding.html`, `event-onboarding.html`, `gallery-onboarding.html`, `restaurant-dashboard.html`. The onboarding forms now publish for real — see "Onboarding & publish".

### Universal sign-in â†’ role shells (staged package)

`eatouts-login.html` is the universal WhatsApp + PIN sign-in and routes by role: customer → `eatouts-profile/orders/favourites/addresses`, operator → `operator-dashboard1.html` (or the `*-manager.html` surfaces), admin → `eatouts-admin-dashboard.html`. `eatouts-business-signup.html` → the per-type onboarding form for that business type. Auth screens use the centred `.login` card; signed-in screens render a role-based shell via `EO.shell`.

### Onboarding & publish

`eatouts-business-signup.html` sends each business type to its own form: `restaurant-onboarding.html`, `mobile-kitchen-onboarding.html`, `bottle-store-onboarding.html`, `caterer-onboarding.html`, `bakery-onboarding.html`, `supplier-onboarding.html` (lodge still uses `lodge-onboarding.html`). Every one of them shares `js/eatouts-onboarding-bridge.js`: live town/area lookup from `botswana_locations.js`, mall/shopping-centre lookup from `assets/data/botswana_shopping_malls_and_shopping_centres.js`, a Hosting Services section (capacity spaces + hostable event types from `assets/data/event_types.js` + booking rules) and a "Save & publish" action that writes the D1 business profile and the local customer directory, then exports an `eatouts.venue.v1` submission for the build-time merge. `operator-dashboard1.html`, `eatouts-staff-admin1.html` and `food-truck-schedule1.html` are the recovered `*1` workspaces.

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
- **Size:** 502 KB / 9967 lines (513568 bytes)
- **Loads:** `assets/data/restaurant_listings/restaurant_types_filter.js`, `assets/data/restaurant_listings/directory_runtime_data.js`, `assets/data/restaurant_listings/eatouts_manifest.js`, `assets/data/eatouts_terms_of_service.js`, `assets/data/eatouts_privacy_policy.js`, `assets/data/event_types.js`, `assets/data/venue-provider-list.js`, `assets/data/BottleLliquorStoresDatabase.js`, `assets/data/CateringServicesDatabase.js?v=20261021`, `assets/data/bakery_services_database.js?v=20261021`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-brand.js`, `js/eatouts-bottle-stores.js`, `js/eatouts-catering.js`, `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-customer.js`, `js/eatouts-seed-data.js`, `js/eatouts-seed.js`, `js/eatouts-bridge.js`, `js/eatouts-content.js`, `js/eatouts-slug.js`, `js/eatouts-router.js`
- **Notes:** Promo/event cards and detail pages use bare heart + WhatsApp icon rows; the app resolves /bw/<slug> vanity deep-links (openVanityTarget). The 8 alerts are informational/validation only. On venue open the app hydrates that venue's canonical D1 content via window.EatoutsContent (js/eatouts-content.js), merging profile/menu/gallery/promos/events into the local store before re-rendering; an unreachable backend leaves the imported-directory path untouched.

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
- **Size:** 17 KB / 650 lines (17568 bytes)
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

#### #8 `eatouts-suppliers.html`

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

#### #9 `eatouts_feedback.html`

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

#### #58 `designer-services.html`

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

#### #63 `eatouts-about.html`

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

#### #64 `about-guest-popup.html`

- **Purpose:** Standalone demo of the Create Profile popup on the About tab.
- **Audience:** Everyone
- **Reach it:** Open from About tab
- **How you use it:** Popup opens on click, Sign In navigates to profile options.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 11 KB / 162 lines (11330 bytes)
- **Loads:** —
- **Notes:** Added as part of Pop‑Up States Plan.

#### #65 `about-profile-options.html`

- **Purpose:** Standalone demo of the logged‑in profile‑options popup.
- **Audience:** Everyone
- **Reach it:** Open from About tab
- **How you use it:** Popup opens on load, navigation via buttons.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 1
- **Size:** 35 KB / 473 lines (36027 bytes)
- **Loads:** —
- **Notes:** Added as part of Pop‑Up States Plan.

#### #66 `venue-about.html`

- **Purpose:** Data-driven standalone venue About page: renders ANY resolved business's About surface (logo, hero, status, social row, Options, Operating Hours, Venue, Promos, Ambience, Amenities, Menu Tags) from the resolved business alone — no hardcoded venue values, section visibility driven only by present data.
- **Audience:** Customers (+ shared links)
- **Reach it:** Open directly; pick a business with ?link=<slug> (e.g. venue-about.html?link=nandos) or #<slug> (e.g. venue-about.html#nandos). No slug or an unresolvable slug hands straight back to the directory (location.replace('index.html#restaurants')) — there is no placeholder screen.
- **How you use it:** Loads the shared modules (locations, brand, db, manager-db, users, seed, bridge, auth), the directory runtime data, the bottle/catering directories, and the page-scoped demo registry; seeds the bridge like index.html (EatoutsSeed.mergeDirectory + EatoutsBridge.setSource/ensureSeeded). Resolve order: demo registry → EatoutsBottleStores.get → EatoutsCatering.get → EatoutsBridge groups → /api/links/resolve. Social channels, Options rows, and the tabbar/Back button navigate into the SPA (index.html#..., index.html#<slug>/menu|promos, tel:, wa.me, maps). The Options accordion has four identifiable buttons (#optTown/#optArea/#optMenu/#optPromos): Town opens a floating town list (single town inline), Area a floating area list filtered to the chosen town (gated on a town being set), Menu/Promos open the venue's menu/promos or toast when absent. The logo overlay lightbox is available to everyone; its Settings accordion, colour editor, and drag handle are DOM-injected only when isOwnerOf(biz) is true.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 60 KB / 1460 lines (60998 bytes)
- **Loads:** `js/eatouts-brand.js`, `assets/data/restaurant_listings/directory_runtime_data.js`, `assets/data/BottleLliquorStoresDatabase.js`, `js/eatouts-bottle-stores.js`, `assets/data/CateringServicesDatabase.js`, `assets/data/bakery_services_database.js?v=20261021`, `js/eatouts-catering.js`
- **Notes:** Design/layout/behaviours derive from the preserved mockup (byte-identical to _trash/venue-about-demo.html), but every business value comes from the resolved business. No flagship fallback and no slug substitution. Owner detection is window.EatoutsAuth.currentSession() (restaurantId match) plus a manager-DB owner lookup. The page-scoped demo registry (assets/data/eatouts_demo_businesses.js) is loaded ONLY here and never merged into the customer DB, so index.html's browse list stays clean. Slug read order: ?link= → #hash; when neither resolves to a business the page redirects to index.html#restaurants instead of rendering an empty state.

### Restaurant operator back-office

#### #10 `restaurant-onboarding.html`

- **Purpose:** Restaurant setup: brand identity, branches/outlets, venue spaces, menu, promotions and the Hosting Services block.
- **Audience:** Restaurant owner
- **Reach it:** eatouts-business-signup.html → Restaurant; the operator dashboard.
- **How you use it:** Branch and venue-space forms, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 125 KB / 574 lines (127660 bytes)
- **Loads:** `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory). Logo/cover uploads POST to /api/upload (Supabase) with a data-URL fallback.

#### #11 `menu-onboarding.html`

- **Purpose:** Build menu categories, items and variants.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Menu tab.
- **How you use it:** Add categories and items (type, price, status, tags); edit variants; open the modifiers editor per item.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 28 KB / 433 lines (28318 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`, `js/eatouts-business-api.js`
- **Notes:** Modifier editor wired in D21. Reconciles the menu with /api/business/menu (js/eatouts-business-api.js), pushing local-only categories/items and merging server rows; local storage remains the offline fallback. Item images upload to /api/upload (Supabase) with a data-URL fallback.

#### #12 `promo-onboarding.html`

- **Purpose:** Create and manage promotions.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Promos tab.
- **How you use it:** Create/edit/duplicate/pause/delete promos; set pricing, schedule, linked menu items and action.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 26 KB / 398 lines (26287 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`, `js/eatouts-business-api.js`
- **Notes:** Recurring is a stored day list, not a scheduler. Promo images upload to /api/upload (Supabase) with a data-URL fallback. Saving a promo queues it for admin review via POST /api/customer/promo-submissions (source=business, marketing_manager+) and reads back review status; promos are never published directly.

#### #13 `event-onboarding.html`

- **Purpose:** Manage events and the performer roster.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Events tab.
- **How you use it:** Create/edit/duplicate/delete events across 8 sections; link services and performers.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 52 KB / 1409 lines (53123 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`, `js/eatouts-business-api.js`
- **Notes:** Syncs to /api/business/events (marketing_manager+) in server mode, mirroring rows into the local store via EatoutsBusinessApi.eventToServer/eventFromServer; extended fields ride in the server `figure` JSON blob. Service linker wired in D21; attendee/RSVP submit flow still deferred. Event images upload to /api/upload (Supabase) with a data-URL fallback.

#### #14 `gallery-onboarding.html`

- **Purpose:** Manage gallery groups and images.
- **Audience:** Restaurant owner
- **Reach it:** Operator back-office â†’ Gallery tab.
- **How you use it:** Rename/show-hide/reorder/delete groups; add and delete images by URL; thumbnail preview.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 18 KB / 267 lines (18463 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-upload.js`, `js/eatouts-business-api.js`
- **Notes:** Syncs to /api/business/gallery (groups + images, marketing_manager+) in server mode, mirroring rows into the local store via EatoutsBusinessApi.groupToServer/imageToServer; images upload to /api/upload (Supabase) with a data-URL fallback; a pasted URL still works.

#### #15 `restaurant-dashboard.html`

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

#### #67 `bakery-onboarding.html`

- **Purpose:** Bakery setup: brand identity, outlets, product range, café/seating capability and the Hosting Services block.
- **Audience:** Bakery owner
- **Reach it:** eatouts-business-signup.html → Bakery; the operator dashboard.
- **How you use it:** Product and capability forms, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 127 KB / 1702 lines (129705 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory).

#### #68 `mobile-kitchen-onboarding.html`

- **Purpose:** Mobile kitchen setup: units, service locations, grab-and-go menu, throughput and the Hosting Services block.
- **Audience:** Mobile-kitchen owner
- **Reach it:** eatouts-business-signup.html → Mobile Kitchen; the operator dashboard.
- **How you use it:** Unit and menu forms, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 113 KB / 1185 lines (115795 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory).

#### #69 `eatouts_user_onboarding.html`

- **Purpose:** Customer account creation: name, 18+ gate, live town/area lookup, username + WhatsApp login, WhatsApp confirmation and favourite picks.
- **Audience:** Redesign draft
- **Reach it:** eatouts-login.html “Create an account”; the About Us guest popup; index.html.
- **How you use it:** Live town/area typeahead over botswana_locations.js, POST /api/auth/signup, WhatsApp click-to-chat confirmation, POST /api/auth/verify, then pick up to 5 restaurants and 1 bottle store.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 1
- **Size:** 17 KB / 270 lines (17309 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/data/restaurant_listings/eatouts_restaurant_picks.js`, `assets/data/BottleLliquorStoresDatabase.js`, `js/eatouts-bottle-stores.js`, `assets/eatouts-manager.css`
- **Notes:** Rebuilt from the old caterer copy. The draft (minus passwords) survives a refresh under eatouts.user-onboarding.v1. eatouts-user-onboarding.html now redirects here.

### Manager / auth / platform admin (staged package)

#### #16 `eatouts-login.html`

- **Purpose:** Universal WhatsApp + PIN sign-in; routes the user by role.
- **Audience:** All
- **Reach it:** Direct link; also index.html â†’ About â†’ Operator Sign in â†’ Universal sign-in.
- **How you use it:** Enter WhatsApp number + password (username optional) for the customer/business form, or WhatsApp + PIN under Business sign-in; on success redirect by role.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 5 KB / 44 lines (4998 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `assets/data/business_types.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`, `assets/eatouts-manager.css`
- **Notes:** The customer form posts to /api/auth/login (type-aware; business owners sign in here with WhatsApp + password and route to eatouts-business-signup.html) and falls back to a local password check offline. The Business sign-in details block still uses the demo PIN 1234.

#### #17 `eatouts-user-onboarding.html`

- **Purpose:** Redirect shim — the customer account page now lives at eatouts_user_onboarding.html.
- **Audience:** Legacy links only
- **Reach it:** Old bookmarks and links.
- **How you use it:** Meta refresh + location.replace to eatouts_user_onboarding.html.
- **Auth:** open · **Status:** REDIRECT
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 1 KB / 30 lines (1136 bytes)
- **Loads:** —
- **Notes:** _redirects also answers /eatouts-user-onboarding.html with a 301.

#### #18 `eatouts-business-signup.html`

- **Purpose:** Business-type chooser for new businesses; each card opens that type’s own onboarding form.
- **Audience:** New business
- **Reach it:** eatouts-login.html / marketing links.
- **How you use it:** Pick a business type, create the owner account, then land on the matching onboarding form (restaurant, mobile kitchen, bottle store, caterer, bakery, event supplier).
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 31 KB / 947 lines (31983 bytes)
- **Loads:** —
- **Notes:** Owners can claim a custom /bw/<slug> link (/api/links/check, /api/business/link); claiming a real listing also calls /api/business/claim. Account creation establishes a server session via js/eatouts-business-auth.js (/api/auth/signup type=business + /api/auth/verify), with a local-account fallback offline.

#### #19 `bottle-store-onboarding.html`

- **Purpose:** Bottle & liquor store setup: brand and outlets, stock, tastings, delivery and the Hosting Services block.
- **Audience:** Bottle-store owner
- **Reach it:** eatouts-business-signup.html → Bottle store; the operator dashboard.
- **How you use it:** Stock and tasting forms, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 117 KB / 1630 lines (120016 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory).

#### #20 `caterer-onboarding.html`

- **Purpose:** Caterer setup: brand and outlets, menus, service coverage and delivery areas, plus the Hosting Services block.
- **Audience:** Caterer owner
- **Reach it:** eatouts-business-signup.html → Caterer; the operator dashboard.
- **How you use it:** Menu and coverage forms, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 137 KB / 1903 lines (140503 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory). The embedded event taxonomy was replaced by assets/data/event_types.js.

#### #21 `lodge-onboarding.html`

- **Purpose:** Lodge setup: property details, rooms, amenities, rates and booking rules.
- **Audience:** Lodge owner
- **Reach it:** eatouts-business-signup.html → Lodge; the operator dashboard.
- **How you use it:** Room and rate forms, draft autosave under eatouts.lodge-onboarding.v2.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 32 KB / 1093 lines (33178 bytes)
- **Loads:** —
- **Notes:** Standalone lodge flow — deliberately not wired into the shared onboarding bridge yet.

#### #22 `supplier-onboarding.html`

- **Purpose:** Event supplier setup: the catalogue of services this supplier offers, contact and coverage details, and the Hosting Services block.
- **Audience:** Supplier owner
- **Reach it:** eatouts-business-signup.html → Event supplier; the operator dashboard.
- **How you use it:** Per-service forms from the shared supplier catalogue, live town/area and place lookup, event types from assets/data/event_types.js, publish to the D1 profile and the customer directory.
- **Auth:** open · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 130 KB / 1234 lines (132629 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/botswana_shopping_malls_and_shopping_centres.js`, `assets/data/event_types.js`, `js/eatouts-db.js`, `js/eatouts-business-api.js`, `js/eatouts-pricing-source.js`, `js/eatouts-onboarding-bridge.js`
- **Notes:** Uses the shared js/eatouts-onboarding-bridge.js (live town/area + place lookup, Hosting Services, publish to the D1 profile and the customer directory). Supersedes the older 2 474-line supplier page.

#### #23 `operator-dashboard1.html`

- **Purpose:** Role-gated business workspace (orders, staff, reports, settings tabs) with a business switcher.
- **Audience:** Linked business owner/admin
- **Reach it:** eatouts-login.html after publishing.
- **How you use it:** Switch businesses; work the orders/staff/reports/settings tabs; open an order's detail drawer.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_active_business_v2` `eatouts_delivery_orders_v1` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 44 KB / 105 lines (44570 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `assets/data/business_types.js`, `assets/eatouts-manager.css`
- **Notes:** Order detail drawer wired in D21.

#### #24 `eatouts-staff-admin1.html`

- **Purpose:** Restricted platform-staff workspace with role-limited tabs.
- **Audience:** Platform staff roles
- **Reach it:** eatouts-login.html / eatouts-admin-dashboard.html.
- **How you use it:** Use the tabs permitted by the signed-in role; read-only feedback for unauth ops.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_analytics_events_v1` `eatouts_blog_posts_v1` `eatouts_delivery_orders_v1` `eatouts_feedback_queue_v1` `eatouts_feedback_v2` `eatouts_ops_v1` `eatouts_order_v1_history` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit yes · alerts 0
- **Size:** 54 KB / 1506 lines (55166 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`
- **Notes:** Recovered *1 surface.

#### #25 `food-truck-schedule1.html`

- **Purpose:** Food-truck location and service-day schedule management.
- **Audience:** Food-truck owner
- **Reach it:** eatouts-login.html.
- **How you use it:** Set locations and service days; saved through the adapter.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc yes · pager - · confirm - · audit yes · alerts 0
- **Size:** 19 KB / 38 lines (19095 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog.js`, `js/eatouts-data.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-analytics.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `assets/data/business_types.js`, `assets/eatouts-manager.css`
- **Notes:** Recovered *1 surface.

#### #26 `staff-manager.html`

- **Purpose:** Staff CRUD, employment records and roles.
- **Audience:** Biz owner/admin/manager
- **Reach it:** eatouts-login.html â†’ operator/admin shell â†’ Staff.
- **How you use it:** Add/edit/delete staff; assign roles; delete uses a confirm dialog with audit.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm yes · audit yes · alerts 0
- **Size:** 18 KB / 43 lines (18328 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-business-api.js`, `assets/eatouts-manager.css`
- **Notes:** Hardened D20. Team records now sync to D1 memberships (/api/business/staff) with an EatOuts sign-in role selector; identity fields are pulled back and merged on load.

#### #27 `delivery-manager.html`

- **Purpose:** Delivery zones, fees, capacity, drivers and windows.
- **Audience:** Biz owner/admin
- **Reach it:** eatouts-login.html â†’ business shell â†’ Delivery.
- **How you use it:** Manage zones/fees/drivers/windows.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit - · alerts 0
- **Size:** 33 KB / 824 lines (33870 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`
- **Notes:** Zones escaped via EO.esc.

#### #28 `order-manager.html`

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

#### #29 `reservation-manager.html`

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

#### #30 `room-manager.html`

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

#### #31 `billing-manager.html`

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

#### #32 `analytics-manager.html`

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

#### #33 `quote-manager.html`

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

#### #34 `booking-manager.html`

- **Purpose:** Supplier/lodge booking requests.
- **Audience:** Supplier/lodge
- **Reach it:** eatouts-login.html â†’ business shell.
- **How you use it:** Review and manage booking requests.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell yes · auth yes · esc yes · pager - · confirm - · audit - · alerts 0
- **Size:** 2 KB / 3 lines (1712 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `assets/eatouts-manager.css`

#### #35 `eatouts-admin-dashboard.html`

- **Purpose:** Platform control centre: admin links, the promo-submissions queue and the business-links (/bw/<slug>) admin.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html (admin role).
- **How you use it:** Navigate to platform admin surfaces; triage the P50 promo-submission queue (approve/reject/publish); search/filter and revoke/activate business links.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 42 KB / 1012 lines (43277 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-analytics.js`, `js/eatouts-manager.js`
- **Notes:** Promo-submissions actions hit /api/admin/promo-submissions; business links hit /api/admin/links. The queue now mixes customer event promos and business promos (source=business, restaurantId shown as a pill).

#### #36 `eatouts-users-manager.html`

- **Purpose:** Users and role management.
- **Audience:** Platform admin/ops
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Users.
- **How you use it:** Search/paginate users; edit roles; delete with confirm; audited.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit yes · alerts 0
- **Size:** 29 KB / 957 lines (29981 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`
- **Notes:** Hardened D15.

#### #37 `feedback-manager.html`

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

#### #38 `blog-creator-dashboard.html`

- **Purpose:** Blog writer/publisher using EatoutsBlogAdmin.
- **Audience:** Platform author
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Blog.
- **How you use it:** Create/edit/publish blog posts.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit - · alerts 0
- **Size:** 29 KB / 700 lines (29633 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`

#### #39 `eatouts-verification-queue.html`

- **Purpose:** Business verification queue.
- **Audience:** Platform ops
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Review and action verification items.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 21 KB / 713 lines (21272 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`

#### #40 `eatouts-disputes.html`

- **Purpose:** Issues, refunds and escalations.
- **Audience:** Platform admin/ops
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Review and manage disputes.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 20 KB / 432 lines (20041 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`

#### #41 `eatouts-platform-analytics.html`

- **Purpose:** Cross-platform analytics.
- **Audience:** Platform admin/analyst
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** View platform-wide metrics.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 24 KB / 809 lines (24710 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-analytics.js`, `js/eatouts-manager.js`

#### #42 `eatouts-notifications.html`

- **Purpose:** Segment notifications.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html â†’ admin shell.
- **How you use it:** Compose/queue segment notifications.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 27 KB / 941 lines (28157 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`
- **Notes:** Delivery backend deferred.

#### #43 `eatouts-settings.html`

- **Purpose:** Platform configuration.
- **Audience:** Platform admin
- **Reach it:** eatouts-login.html â†’ admin shell â†’ Settings.
- **How you use it:** Edit platform settings; updates audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit yes · alerts 0
- **Size:** 31 KB / 1006 lines (32098 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`
- **Notes:** Renders admin-only values (esc n/a, low risk).

#### #44 `eatouts-favourites.html`

- **Purpose:** Customer saved favourites.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Saved.
- **How you use it:** Browse favourite type tabs; remove a favourite with confirm + audit.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_order_v1` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm yes · audit - · alerts 0
- **Size:** 37 KB / 1278 lines (38331 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`
- **Notes:** Wired to the store in D20 (was static).

#### #45 `eatouts-orders.html`

- **Purpose:** Customer order history.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Orders.
- **How you use it:** Browse orders (25/page); Reorder/Replay open WhatsApp to the venue; audited.
- **Auth:** gated · **Status:** FULL
- **Store:** `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit yes · alerts 0
- **Size:** 29 KB / 967 lines (29583 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-audit.js`, `js/eatouts-customer.js`
- **Notes:** Wired in D20; shows real orders via the D18 bridge.

#### #46 `eatouts-profile.html`

- **Purpose:** Customer profile.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Profile.
- **How you use it:** View/edit the customer profile.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 39 KB / 1217 lines (40242 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`

#### #47 `eatouts-addresses.html`

- **Purpose:** Customer delivery addresses.
- **Audience:** Customers
- **Reach it:** eatouts-login.html â†’ customer shell â†’ Addresses.
- **How you use it:** Add/edit/delete addresses; confirm + audit.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit yes · alerts 0
- **Size:** 29 KB / 707 lines (29208 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-audit.js`, `js/eatouts-customer.js`, `js/eatouts-manager.js`
- **Notes:** Hardened D15.

#### #56 `brand-kit-admin.html`

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

#### #57 `designer-dashboard.html`

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

#### #59 `eatouts-summaries.html`

- **Purpose:** Customer saved summaries.
- **Audience:** Customers
- **Reach it:** eatouts-login.html → customer shell → Saved Summaries.
- **How you use it:** List saved promo/bottle summaries; remove a summary.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit - · alerts 0
- **Size:** 23 KB / 756 lines (23111 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`
- **Notes:** Reads the EatoutsCustomer store.

#### #60 `eatouts-events.html`

- **Purpose:** Customer saved events.
- **Audience:** Customers
- **Reach it:** eatouts-login.html → customer shell → Events.
- **How you use it:** List saved events; remove an event.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm yes · audit - · alerts 0
- **Size:** 18 KB / 402 lines (18411 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`
- **Notes:** Reads the EatoutsCustomer store.

#### #61 `eatouts-gallery.html`

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

#### #62 `eatouts-checkout-summary.html`

- **Purpose:** Checkout summary snapshot.
- **Audience:** Customers
- **Reach it:** Reached from checkout flows.
- **How you use it:** Review an order snapshot; save it as a summary.
- **Auth:** gated · **Status:** FULL
- **Store:** —
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 18 KB / 388 lines (17997 bytes)
- **Loads:** `js/eatouts-manager-db.js`, `assets/data/demo/the-food-place/demo-data.js`, `js/eatouts-manager-seed.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`, `js/eatouts-manager.js`, `js/eatouts-customer.js`
- **Notes:** Reads the EatoutsCustomer store.

### Delivery flows

#### #48 `customer-delivery.html`

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

#### #49 `restaurant-delivery.html`

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

#### #50 `driver-delivery.html`

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

#### #51 `intake.html`

- **Purpose:** Guided operator/concierge intake capture of a restaurant record.
- **Audience:** Operator / concierge
- **Reach it:** get-started.html / operator links; auth-gated.
- **How you use it:** Fill the intake draft; optional client-side image picker (compressor â†’ data URL) and video validation; export a venue object.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_intake_draft_v1` `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 72 KB / 1195 lines (73602 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-image-compressor.js`, `js/eatouts-video-validator.js`, `js/eatouts-brand.js`, `js/eatouts-locations.js`, `js/eatouts-business-api.js`, `botswana_locations.js`
- **Notes:** No server upload; export feeds the manual merge.

#### #52 `invoice.html`

- **Purpose:** Operator/ops invoice generation.
- **Audience:** Operator / ops
- **Reach it:** Ops links; auth-gated.
- **How you use it:** Create invoices over eatouts_ops_v1.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_ops_v1` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth yes · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 20 KB / 395 lines (20977 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`

#### #53 `ops-console.html`

- **Purpose:** Internal ops tracker: venues, submissions, MRR/activity.
- **Audience:** Internal ops
- **Reach it:** Ops links; auth-gated.
- **How you use it:** Track venues/submissions; recomputes MRR from active tiers using shared pricing.
- **Auth:** gated · **Status:** FULL
- **Store:** `eatouts_ops_v1` `EatoutsMgrDB`→`eatouts_manager_v1`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 61 KB / 1160 lines (62428 bytes)
- **Loads:** `js/eatouts-db.js`, `js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`, `js/eatouts-field.js`, `js/eatouts-auth.js`, `js/eatouts-brand.js`

### Developer harness

#### #54 `seed-demo.html`

- **Purpose:** Developer harness that seeds the roster and runs data-layer verification assertions.
- **Audience:** Developer
- **Reach it:** run-eatouts.bat â†’ open seed-demo.html.
- **How you use it:** Seed demo data, run verification, run the v1â†’v2 migration test, hard reset.
- **Auth:** open · **Status:** STUB/DEMO
- **Store:** `eatouts_db_v2` `EatoutsDB`→`eatouts_db_v2`
- **Markers:** shell - · auth - · esc - · pager - · confirm - · audit - · alerts 0
- **Size:** 22 KB / 441 lines (22959 bytes)
- **Loads:** `botswana_locations.js`, `js/eatouts-locations.js`, `js/eatouts-brand.js`, `js/eatouts-db.js`, `js/eatouts-seed-data.js`, `js/eatouts-seed.js`
- **Notes:** Only meaningful when served over the local server.

#### #55 `eatout_event_builder.html`

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

- **2026-10-21** — Onboarding pages now publish for real. The six business forms (restaurant, mobile kitchen, bottle store, caterer, bakery, event supplier) share js/eatouts-onboarding-bridge.js: live town/area lookup from botswana_locations.js, mall/shopping-centre lookup from assets/data/botswana_shopping_malls_and_shopping_centres.js, a Hosting Services section (capacity spaces + hostable event types from assets/data/event_types.js + booking rules) and a Save & publish action that writes the D1 business profile (business_profiles.hosting_json, new migration 0010) and the local customer directory, then exports an eatouts.venue.v1 submission for the build-time merge. business-onboarding1.html was retired — every link now points at the matching per-type form (assets/data/business_types.js gained EatoutsBusinessTypes.onboardingPage). eatouts_user_onboarding.html was rebuilt as the real customer account page (18+ gate, live town/area, /api/auth/signup + /api/auth/verify, favourites) and eatouts-user-onboarding.html is now a redirect. scripts/merge_submissions.py carries place/capacity/hosting into the runtime directory and rewrites directory_runtime_data.js; npm run build now merges the owner submissions after the directory build so they survive.
- **2026-10-21** — Brought the 2026-10 onboarding redesign pages up to the test contracts without touching the tests. Restored the `<!-- PAGE: X -->` banner and matching `<body data-page>` slug on all six: restaurant-, bottle-store-, caterer-, bakery-, mobile-kitchen-onboarding and eatouts_user_onboarding. restaurant-onboarding.html joined the app-shell standard: #app-shell renamed to #shell, brand mark wrapped in a home link to index.html#promos, hdr-chip page label, and the merchant tab strip (Restaurant active) — no appnav; it also now loads the upload libs (eatouts-image-compressor, eatouts-video-validator, eatouts-upload) ahead of its inline scripts, mirroring menu-onboarding. PAGE_INVENTORY.md gained section I (rows 69-71 for bakery/mobile-kitchen/user redesigns) and refreshed stale rows 28-30 (they are full editors now, not 3-line redirect wrappers). Catalog: added bakery-onboarding, mobile-kitchen-onboarding and eatouts_user_onboarding as ids 68-70 (operator-onboarding), and refreshed the stale 'Redirect wrapper' purposes on ids 10/19/20. npm test 52/52; npm run catalog 70 pages.
- **2026-10-20** — Venue About is now a true out-of-SPA hand-off. Every 'view a business' tap in index.html (openRestAbout from the card/info icon, bottleStoreInfo, openCateringAbout, and the boot-time openVenueFromSlug used by shared/SEO deep links) routes through a single gotoVenueAbout(target) → venue-about.html?link=<slug>, so a tap on KFC opens KFC's About page and Nando's opens Nando's. The inline data-page="venue-about" screen, its js/eatouts-venue-about.js renderer, state.venueAboutOrphan, and the orphan/catering/bottle/about branches of renderRestaurantSubView were removed. venue-about.html drops the 'Choose a business' empty state: a missing or unresolvable slug now redirects to index.html#restaurants. Its Menu/Promos options emit index.html#<slug>/menu|promos, which index.html boot parses back into the venue-menu / venue-promos screens. Deleted the root venue-about-new.html mockup and the js/eatouts-venue-about.js renderer. Updated tests/venue-about-menu.js (asserts the out-of-SPA target carries the chosen venue), venue-about-options.js (hash round-trip), beverages.js, bottle-stores.js and venue-slug-integration.js (boot hand-off target).
- **2026-10-20** — venue-about.html Options accordion: replaced the four generic class="opt" rows (Town/Area/View/View) with four identifiable, centre-aligned buttons (#optTown / #optArea / #optMenu / #optPromos, data-opt). Town opens a floating 'Select Town' popup (single town shown inline) built from every branch of the business (catering/bottle-store branches[] plus same-named restaurant-directory records, so chains like KFC/Nando's list all towns); Area opens a floating 'Select Area' popup filtered to the chosen town, gated behind a 'Select a Town first' toast when none is set. Menu/Promos navigate to index.html#<slug>/menu|promos, or toast '<name> has not yet loaded their menu' / 'has no promos available'. Menu availability read from directory_runtime_data menusRaw/menuFiles by canonical brand slug (the same source index.html uses). index.html boot now resolves #<slug>/menu|promos to the venue-menu / venue-promos screens. Added tests/venue-about-options.js (registered in run-all). npm test 51/51; npm run catalog 68 pages.
- **2026-10-19** — venue-about.html reworked again into a single data-driven page (the earlier EatoutsVenueAbout approach was dropped): every value now comes from the resolved business, section visibility is data-only (never type-based), and there is no flagship fallback. Resolution: page-scoped demo registry → EatoutsBottleStores → EatoutsCatering → EatoutsBridge groups → /api/links/resolve (4s abort). Owner-only Settings accordion/colour editor/drag handle are DOM-injected only when isOwnerOf(biz) (session restaurantId match, else manager-DB owner link). Loads the bottle/catering directories; the demo registry (assets/data/eatouts_demo_businesses.js, two demo rows) is loaded only here and kept out of the customer DB, so index.html's browse list is unaffected. Manager-db seed gains restaurantId on the demo businesses + a biz-truck/u-truck owner. Verified headlessly for restaurant/caterer/bottle/supplier/truck, owner and non-owner, plus empty-state and SPA-isolation checks. npm test 49/49; npm run catalog 68 pages.
- **2026-10-19** — Standalone venue-about.html rebuilt from a hardcoded Yellow Giraffe demo into a real top-level About page: it loads the same shared modules the SPA uses and renders the identical surface via window.EatoutsVenueAbout (renderRestaurantAbout / renderVenueNotFound), seeding the bridge from assets/data/restaurant_listings/directory_runtime_data.js with EatoutsSeed.mergeDirectory + EatoutsBridge.setSource/ensureSeeded. Slug contract: ?link=<slug> → #<slug> → flagship the-yellow-giraffe; venue actions link back into the SPA (index.html#<slug>, index.html#<slug>/menu). The old demo was preserved at _trash/venue-about-demo.html. index.html untouched. Catalogued as page #68; tests/inventory PASSED.
- **2026-10-19** — index.html About tab: the guest profile card and the signed-in profile card now open the About popups (from about-guest-popup.html / about-profile-options.html) instead of the guest card-alert and the signed-in .pc-rows accordion. Guest tap opens a .card-alert.pp explainer (4 feature options → per-feature explainer with Create Account → eatouts-user-onboarding.html; Sign In → eatouts-login.html; Not Now). Signed-in tap opens a .card-alert.fpop.pp shell (My Profile) with four list screens wired to real data — Favourites + Summaries read the EatoutsCustomer store; Orders + Gallery use placeholders (no customer store yet). Added renderAboutPopup/renderAboutPreview and helpers (aboutBack, aboutShell, aboutTile, aboutUser, aboutFavList, aboutSummaryList), scoped .about-*/.pp CSS, .pc-chev on the closed card, plus click/Escape dispatch and about-state reset on tab change. Updated tests/about.js and tests/customer.js. npm test 49/49.
- **2026-10-18** — Added about‑guest-popup.html and about‑profile‑options.html as new catalog entries.
- **2026-10-18** — Venue About page fix (index.html): the shared venue-about screen now correctly shows the specific venue (Nando's, KFC, caterers, bottle stores) instead of the flagship profile. The About icon (i) on each venue card navigates to that venue's About page. Reused state.restaurantView with a kind field (restaurant|catering|bottle_store) for unified routing. Added renderCateringAbout/renderBottleStoreAbout, venueAboutLocationRows/venueAboutOptions helpers. Updated openCateringAbout, bottleStoreInfo, openBottleMenu, pickCateringBranch/pickBottleBranch, viewKey. Extended tests/beverages.js and tests/bottle-stores.js with About navigation coverage. npm test 48/48.
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
- **2026-10-16** — Customer-account fixes: EO.guard now requires a real session for role-gated areas, so a guest hitting a customer/manager page is redirected to login instead of being seated as the demo owner (js/eatouts-manager.js); eatouts-user-onboarding.html's offline fallback now stores a local password hash and EatoutsCustomer.login verifies locally-created accounts when the backend is unavailable (js/eatouts-customer.js). Legal privacy/terms data consolidated onto info@eatouts.site and eatouts.co.bw purged.
- **2026-10-16** — Business client wiring (Phase 2): new js/eatouts-business-api.js wraps /api/business/* (mine/claim/profile/staff/menu) with a dual-mode fetch client. staff-manager.html syncs memberships to D1, eatouts-business-signup.html claims via /api/business/claim and caches the D1 restaurant id, business-onboarding1.html's Save & publish PATCHes the live profile, and menu-onboarding.html reconciles its menu with the server. Tests: added tests/business-client.js, extended tests/router.js claim-bridge coverage.
- **2026-10-16** — Real media uploads (C4/C10 + E4/E5): js/eatouts-upload.js gained an opt-in server mode (uploadPrefix/uploadBlob/setUploadPrefix/sessionPrefix) that POSTs compressed images to /api/upload and stores the returned public URL, with a base64 data-URL fallback for offline/unauthenticated use. menu-onboarding, gallery-onboarding, restaurant-onboarding, promo-onboarding and event-onboarding now set a venues/<id> prefix before decorating. functions/api/upload.js hardened with a content-type allowlist (415) and 10 MB max size (413) plus a GET metadata endpoint. Tests: added tests/api-upload.js, extended tests/upload.js.
- **2026-10-16** — Real business sessions (D4): /api/auth/signup, verify and login are type-aware (customer|business); signup skips the 18+ gate for businesses, verify starts a session for the row's own type, and login accepts username-or-WhatsApp + password and routes business owners to eatouts-business-signup.html. New js/eatouts-business-auth.js calls signup+verify (or login), mirrors the D1 user into EatoutsMgrDB and starts the local session, with a local-account fallback when the backend is down. eatouts-business-signup.html's account step now collects a username + password (was demo PIN 1234) and creates a server account; eatouts-login.html's customer form makes the username optional so owners can sign in with WhatsApp + password. js/eatouts-customer.js bridgeLocal now mirrors the server user type/roles. Tests: added tests/api-auth-flow.js and tests/business-auth.js.
- **2026-10-16** — Business content endpoints (C6/C7): new /api/business/gallery (GET groups+images, POST groups, PATCH/DELETE groups/:id with image cascade, POST images, PATCH/DELETE images/:id) and /api/business/events (GET, POST, PATCH/DELETE events/:id) behind requireBusiness at marketing_manager+, with galleryGroupOut/galleryImageOut/eventOut mappers + jsonString/numOrNull helpers in functions/api/_business.js. js/eatouts-business-api.js gained gallery*/event* calls plus groupToServer/groupFromServer/imageToServer/imageFromServer and eventToServer/eventFromServer (extended event fields ride in the server `figure` JSON blob). gallery-onboarding.html and event-onboarding.html now reconcile their local stores with the server (push-on-change + push-missing-local + merge). Tests: extended tests/api-business.js and tests/business-client.js.
- **2026-10-16** — Business promos through the moderation queue (C8): migration 0006_promo_business.sql adds restaurant_id + source ('business'|'customer') to promo_submissions; promoSubmissionOut exposes both. functions/api/customer/promo-submissions.js now dual-serves: a body/query restaurantId routes to requireBusiness (marketing_manager+) and stamps source='business', otherwise requireCustomer as before; business promos always queue as status='pending' (never published directly). js/eatouts-business-api.js gained promosRead/promoSubmit/promoToSubmission. promo-onboarding.html submits on Save, reads back review status, and shows a review badge; the admin dashboard shows a Business/source pill and now labels the queue for events + business promos. Tests: extended tests/promo-submissions.js and tests/business-client.js.
- **2026-10-16** — Unified content model, public read (C9): new public GET /api/venues/:id (functions/api/venues/[id].js) resolves a venue by D1 id or slug and returns one canonical bundle — identity + visible menu categories/items, visible gallery groups/images, active promos and published events — reusing the _business.js row mappers. New js/eatouts-content.js (window.EatoutsContent) fetches that bundle, maps it to the v2 flat content shape and merges it into EatoutsDB (forkContent + contentSource='d1'), so every existing EatoutsBridge renderer shows D1-published content; it is conservative — a locally authored fork/flagship is never clobbered and an unreachable backend falls back to the imported directory. js/eatouts-bridge.js setActive now dispatches an 'eatouts:venue-active' event and index.html hydrates on venue open (plus the boot venue) and re-renders only when content applied. Tests: added tests/api-venues.js and tests/content.js.
- **2026-10-20** — About actions in index.html (openRestAbout, bottleStoreInfo, openCateringAbout, openVenueFromSlug) now navigate to the standalone venue-about.html?link=<slug> page instead of rendering an inline .screen[data-page=venue-about]. The inline renderer, EatoutsVenueAbout module and state.venueAboutOrphan were removed. venue-about.html replaces its history.back() handler with a 3-item Page-history popup (EatOuts Home / Restaurants / biz Menu). Tests updated to assert navigation target and absence of the inline about screen. venue-about-new.html mockup deleted; preserved copy in _trash/.
