# EatOuts — Complete Page & Screen Inventory

> Generated: 2026-10-15 · Verify with `npm run inventory`

This document lists every surface in the EatOuts app — both standalone HTML
files and the screens rendered inside the main SPA (`index.html`). It explains
**what each page is for**, **how you reach it**, and the **in-code `PAGE:`
marker** and approximate line for jumping straight to the code.

Run `npm run inventory` to **validate** that every listed file and screen still
carries its `PAGE:` marker and that the SPA marker map is in sync. The validator
only reads; it never rewrites this file. It warns on line drift.

---

## How to use this document

- **Part 1** — Standalone `*.html` files (67 files in the project root). Each
  carries `<!-- PAGE: <title> -->` near the top and `data-page="<slug>"` on
  `<body>`.
- **Part 2** — Screens within the SPA (`index.html`), organised by tab. Each
  screen carries a `/* PAGE: <id> — <title> */` banner. At runtime the active
  screen is written to `.screen` as `data-page` / `data-page-title`.
- **FAQ** at the end explains the marker scheme and how anchors stay valid.
- Run `npm run inventory` to verify all markers are still present.

---

# Part 1 — Standalone HTML Pages

## A. Public & Customer Facing

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 1 | `index.html` | **Main SPA** — mobile-first customer app with 5 tabs. Contains ~30 sub-screens (see Part 2). | Site root via `run-eatouts.bat` | `PAGE: EatOuts (customer SPA)` | 9250 |
| 2 | `get-started.html` | Marketing landing for operators explaining the offer and linking into intake/pricing. | Direct / marketing links | `PAGE: Get Started — EatOuts for Restaurants` | 185 |
| 3 | `pricing.html` | Public pricing page with plan tiers. | Marketing links; get-started.html | `PAGE: Partner Pricing` | 243 |
| 4 | `one-pager.html` | Static sales one-pager for prospects. | Direct link | `PAGE: EatOuts — Pitch One-Pager` | 157 |
| 5 | `partner-terms.html` | Static partner/merchant terms. | Direct link | `PAGE: Merchant Terms` | 188 |
| 6 | `404.html` | Custom not-found page with rotating Mophutsi quotes. | Served automatically | `PAGE: 404 — Page Not Here` | 232 |
| 7 | `eatouts-blog.html` | Blog feed with per-post pages + on-device authoring. | Direct / home links | `PAGE: Blog` | 493 |
| 8 | `eatouts-suppliers.html` | Supplier directory + self-onboarding and sign-in. | Direct link | `PAGE: Suppliers` | 1795 |
| 9 | `eatouts_feedback.html` | Multi-step feedback form → WhatsApp to support. | About → Settings → Feedback | `PAGE: Send feedback` | 834 |
| 10 | `eatouts-about.html` | Public About EatOuts page (standalone). | About → Settings → About EatOuts | `PAGE: About` | 92 |
| 11 | `eatouts-checkout-summary.html` | Post-checkout order summary. | Direct link | `PAGE: Checkout summary` | 23 |
| 12 | `intake.html` | Business intake / lead form. | Direct / marketing links | `PAGE: Concierge Intake` | 1155 |
| 13 | `invoice.html` | Invoice page. | Direct link | `PAGE: Invoice` | 395 |

## B. Customer Account & Auth

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 15 | `eatouts-login.html` | Universal WhatsApp + PIN sign-in; routes by role. | Direct; also About → Operator Sign in | `PAGE: Login` | 44 |
| 16 | `eatouts-user-onboarding.html` | Customer account creation with an 18+ gate. | login → create account | `PAGE: Customer onboarding` | 130 |
| 17 | `eatouts-profile.html` | User profile page. | Profile card → My Profile | `PAGE: My profile` | 19 |
| 18 | `eatouts-orders.html` | Order history. | Profile card → Order History | `PAGE: My orders` | 37 |
| 19 | `eatouts-favourites.html` | Saved favourites. | Profile card → Favourites | `PAGE: Favourites` | 213 |
| 20 | `eatouts-summaries.html` | Saved summaries. | Profile card → Saved Summaries | `PAGE: Saved summaries` | 23 |
| 21 | `eatouts-events.html` | Events page (standalone). | Profile card → Events | `PAGE: Events` | 25 |
| 22 | `eatouts-gallery.html` | Gallery page (standalone). | Profile card → Gallery | `PAGE: Gallery` | 17 |
| 23 | `eatouts-notifications.html` | Notifications page. | Direct / app links | `PAGE: Notifications` | 3 |
| 24 | `eatouts-addresses.html` | Saved addresses. | Profile card → Addresses | `PAGE: Addresses` | 54 |
| 25 | `eatouts-settings.html` | App settings page. | Direct / app links | `PAGE: Platform settings` | 3 |

## C. Business Onboarding / Signup

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 26 | `eatouts-business-signup.html` | Business-type chooser for new businesses. | login / marketing links | `PAGE: List your business` | 565 |
| 27 | `business-onboarding1.html` | Unified per-type business setup (module rail, draft autosave, preview, publish). | business-signup / per-type wrappers | `PAGE: Business onboarding` | 95 |
| 28 | `restaurant-onboarding.html` | Master profile editor for a single restaurant (15 sections). | Operator back-office → Restaurant tab | `PAGE: Restaurant Setup` | 793 |
| 29 | `bottle-store-onboarding.html` | Redirect wrapper into unified onboarding (bottle store). | business-signup | `PAGE: Bottle store onboarding` | 3 |
| 30 | `caterer-onboarding.html` | Redirect wrapper into unified onboarding (caterer). | business-signup | `PAGE: Caterer onboarding` | 3 |
| 31 | `lodge-onboarding.html` | Redirect wrapper into unified onboarding (lodge). | business-signup | `PAGE: Lodge onboarding` | 3 |
| 32 | `supplier-onboarding.html` | Redirect wrapper into unified onboarding (supplier). | business-signup | `PAGE: Supplier onboarding` | 3 |
| 33 | `event-onboarding.html` | Manage events and the performer roster. | Operator back-office → Events tab | `PAGE: Events & Performers` | 470 |
| 34 | `menu-onboarding.html` | Build menu categories, items and variants. | Operator back-office → Menu tab | `PAGE: Menu Management` | 412 |
| 35 | `promo-onboarding.html` | Create and manage promotions. | Operator back-office → Promos tab | `PAGE: Promotions` | 359 |
| 36 | `gallery-onboarding.html` | Manage gallery groups and images. | Operator back-office → Gallery tab | `PAGE: Gallery` | 243 |
| 37 | `food-truck-schedule1.html` | Food-truck location and service-day schedule. | Operator login | `PAGE: Food truck schedule` | 38 |

## D. Delivery Flows

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 38 | `customer-delivery.html` | Customer delivery tracking / status. | After placing an order | `PAGE: Delivery` | 1021 |
| 39 | `restaurant-delivery.html` | Restaurant delivery management page. | Operator back-office → Delivery | `PAGE: Restaurant Delivery` | 702 |
| 40 | `driver-delivery.html` | Driver delivery interface. | Driver login | `PAGE: Driver Delivery` | 503 |

## E. Business Back-Office

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 41 | `restaurant-dashboard.html` | Owner dashboard: status, completeness, analytics, billing, reports. | Operator back-office → Dashboard tab | `PAGE: Dashboard` | 485 |
| 42 | `operator-dashboard1.html` | Role-gated business workspace with a business switcher. | login → after publishing | `PAGE: Business workspace` | 105 |
| 43 | `order-manager.html` | Live order queue with status management + audit. | Operator back-office → Orders | `PAGE: Order manager` | 3 |
| 44 | `reservation-manager.html` | Table bookings, guests and deposits. | Operator back-office → Reservations | `PAGE: Reservation manager` | 3 |
| 45 | `booking-manager.html` | Supplier/lodge booking requests with calendar. | Operator back-office → Bookings | `PAGE: Booking manager` | 3 |
| 46 | `delivery-manager.html` | Delivery zones, fees, capacity, drivers, windows. | Operator back-office → Delivery | `PAGE: Delivery manager` | 3 |
| 47 | `staff-manager.html` | Staff CRUD, employment records, roles. | Operator back-office → Staff | `PAGE: Staff manager` | 41 |
| 48 | `room-manager.html` | Room/lodge unit management. | Operator back-office → Rooms | `PAGE: Room manager` | 3 |
| 49 | `quote-manager.html` | Quote / estimate management. | Operator back-office → Quotes | `PAGE: Quote manager` | 3 |
| 50 | `billing-manager.html` | Billing and payments. | Operator back-office → Billing | `PAGE: Billing manager` | 5 |
| 51 | `feedback-manager.html` | Business feedback management. | Operator back-office → Feedback | `PAGE: Feedback manager` | 4 |
| 52 | `analytics-manager.html` | Analytics manager (staging). | Operator back-office → Analytics | `PAGE: Analytics manager` | 3 |

## F. Platform Admin

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 53 | `eatouts-admin-dashboard.html` | Platform admin dashboard — analytics, business explorer, alert mgr, roles, seed data. | admin login | `PAGE: EatOuts admin dashboard` | 122 |
| 54 | `eatouts-users-manager.html` | User management (platform). | admin dashboard | `PAGE: Users manager` | 7 |
| 55 | `eatouts-verification-queue.html` | Verification queue for listings. | admin dashboard | `PAGE: Verification queue` | 3 |
| 56 | `eatouts-platform-analytics.html` | Platform-wide analytics. | admin dashboard | `PAGE: Platform analytics` | 3 |
| 57 | `eatouts-staff-admin1.html` | Restricted platform-staff workspace with role-limited tabs. | admin login | `PAGE: EatOuts staff workspace` | 56 |
| 58 | `blog-creator-dashboard.html` | Blog writer/publisher workspace. | admin login | `PAGE: Blog creator dashboard` | 3 |
| 59 | `ops-console.html` | Operations console (field agent tracking, venue mgmt). | admin login | `PAGE: Ops Console` | 1160 |
| 60 | `brand-kit-admin.html` | Brand kit / designer job admin. | admin login | `PAGE: Brand Jobs — EatOuts Admin` | 724 |

## G. Designer Services

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 61 | `designer-services.html` | Public marketplace for design services. | About → Settings → Need Design | `PAGE: Design Services` | 746 |
| 62 | `designer-dashboard.html` | Designer workspace — jobs, payouts, availability. | designer login | `PAGE: Designer Workspace` | 323 |

## H. Developer Tools

| # | File | What it is | How you reach it | Page marker | ~Lines |
|---|------|-----------|------------------|-------------|--------|
| 63 | `seed-demo.html` | Seed demo data tool. | Direct link | `PAGE: Seed & Verify` | 441 |
| 64 | `eatout_event_builder.html` | Event builder tool for testing. | Direct link | `PAGE: EatOuts — Event Planner` | 4202 |
| 65 | `eatouts-disputes.html` | Disputes page. | admin dashboard / app links | `PAGE: Disputes` | 3 |
| 66 | `about-guest-popup.html` | Standalone demo of the Create Profile (guest) popup on the About tab. | About tab | `PAGE: About Guest Popup` | 162 |
| 67 | `about-profile-options.html` | Standalone demo of the logged-in profile-options popup. | About tab | `PAGE: About Profile Options` | 473 |
| 68 | `venue-about.html` | Data-driven standalone venue About page — resolves a business from the directory/demo registry/bottle/catering/bridge/API and renders its About surface from that business alone; unresolvable slugs show a "Choose a business" empty state. | Direct / shared links; `index.html#<slug>` | `PAGE: venue-about` | 1495 |

---

# Part 2 — Screens Within index.html (SPA)

The SPA uses `renderScreen()` as the central dispatcher. Each screen is recorded
via `page("<id>", html)`, listed in `PAGE_TITLES`, and written to the rendered
`.screen` element as:

- `data-page="<id>"` — the screen template (e.g. `venue-menu-item`)
- `data-page-title="<title>"` — the human label (e.g. `Menu · Item`)
- `data-page-ref="<instance>"` — the live instance, e.g. the venue id plus
  category (`rest_pizza-perfect:burgers`), the promo/store/photo id, etc.

The same values are mirrored onto `<body>` (`document.body.dataset.page` /
`pageRef`). Type `eoPage()` in the DevTools console to print a paste-ready
one-liner, e.g. `PAGE: venue-menu-item — Menu · Item  [rest_pizza-perfect:burgers]`.

---

## Tab 1: Promos (`state.tab === "promos"`)

| Screen | Description | Trigger | Render function | Page marker | Line |
|--------|------------|---------|-----------------|-------------|------|
| Promos Feed | Weekly calendar + accordion promo cards | `state.promoView === "feed"` | `renderPromosFeed()` | `PAGE: promos-feed — Promos · Feed` | 6267 |
| Promo Detail | Expanded single promo with full info | `"detail"` | `renderPromoDetail()` | `PAGE: promos-detail — Promos · Detail` | 6412 |
| Promo Gallery | Image gallery for a specific promo | `"gallery"` | `renderPromoGallery()` | `PAGE: promos-gallery — Promos · Gallery` | 6512 |
| Promo Link | External-link promo view | `"link"` | `renderPromoLink()` | `PAGE: promos-link — Promos · Link` | 6530 |

## Tab 2: Restaurants (`state.tab === "restaurants"`)

### Directory level

| Screen | Description | Trigger | Render function | Page marker | Line |
|--------|------------|---------|-----------------|-------------|------|
| Restaurants Pager | Four-panel view: Food + Catering + Bakery + Beverages (swipe) | No sub-view active | `renderRestaurantsPager()` | `PAGE: restaurants-pager — Restaurants` | 5007 |
| Bakery Directory | Flat list of bakeries (placeholder logos, disabled WhatsApp) | `state.restPanel === "bakery"` | `renderBakeries()` | `PAGE: bakeries — Bakeries` | 5380 |
| Bottle Store Directory | Beverages landing with store list | `state.restPanel === "beverages"` | `renderBottleStores()` | `PAGE: beverages — Beverages` | 5186 |

### Within a restaurant (`state.restaurantView` set — routed by `renderRestaurantSubView()`)

| Screen | Description | State condition | Render function | Page marker | Line |
|--------|------------|-----------------|-----------------|-------------|------|
| Menu (Categories) | Restaurant card + list of categories | `rv.view === "menu"` | Inline | `PAGE: venue-menu — Menu` | 5411 |
| Menu (Locked) | Locked listing placeholder | `listingLocked(r)` | `renderMenuLocked(r)` | `PAGE: venue-locked — Menu (locked)` | 4663 |
| Menu Item | Items in a category with steppers + cart | `state.menuCat` set | `renderMenuCategory()` | `PAGE: venue-menu-item — Menu · Item` | 7047 |
| Checkout / Order Summary | Review cart + delivery + send | `state.checkoutView` truthy | `renderCheckout()` | `PAGE: venue-checkout — Checkout` | 7130 |
| Split the Bill | People + item assignment | `state.splitOpen` truthy | `renderCheckoutSplit()` | `PAGE: venue-checkout-split — Split the Bill` | 7325 |
| Book Venue | Enquiry form → WhatsApp | `rv.view === "venue"` | `renderRestaurantVenue(r)` | `PAGE: venue-book — Book Venue` | 5425 |
| Venue Promos | That venue's own promotions | `rv.view === "promos"` | `renderRestaurantPromos(r)` | `PAGE: venue-promos — Promos` | 5441 |
| Venue Promo Detail | Deep-link to a specific promo | `rv.view === "promo"` | `renderRestaurantPromoDetail(r, promoId)` | `PAGE: venue-promo-detail — Promo` | 5464 |
| Catering About | Catering supplier info / contact page | `rv.kind === "catering"` | `renderCateringAbout()` | `PAGE: catering — Catering` | 5988 |

### Beverages panel sub-screens

| Screen | Description | State condition | Render function | Page marker | Line |
|--------|------------|-----------------|-----------------|-------------|------|
| Bottle Menu | Expanded bottle-store menu | `state.bevView.type === "store"` | `renderBottleMenu()` | `PAGE: bottle-menu — Bottle Menu` | 6651 |
| Beverage Filter Results | Search results for types | `state.bevTypes.length` | `renderBeverageFilterResults()` | `PAGE: bev-filter — Beverages · Filter` | 6695 |
| Beverages Category | Items list for a subcategory | `state.bevView` set | `renderBeveragesCategory()` | `PAGE: bev-category — Beverages · Category` | 6743 |
| Beverages Checkout | Cart review + send/share | `state.bevCheckout` truthy | `renderBeveragesCheckout()` | `PAGE: bev-checkout — Beverages · Checkout` | 6856 |
| Beverages Split the Bill | Split items per person | `state.bevSplitOpen` truthy | `renderBevSplit()` | `PAGE: bev-split — Beverages · Split the Bill` | 6915 |

## Tab 3: Reserve / Plan Event (`state.tab === "reserve"`)

| Screen | Description | Trigger | Render function | Page marker | Line |
|--------|------------|---------|-----------------|-------------|------|
| Plan Event (Categories) | Event category grid (Wedding, Birthday, etc.) | Default | `renderReserveCats()` | `PAGE: reserve-cats — Plan Event` | 7424 |
| Reserve Groups | Sub-category groups within a category | `state.reserveCat` set | `renderReserveGroups()` | `PAGE: reserve-groups — Plan Event · Groups` | 7436 |
| Reserve Events / Types | Specific event types with descriptions | `state.reserveGroup` set | `renderReserveEvents()` | `PAGE: reserve-events — Plan Event · Events` | 7452 |
| Choose Venue | Search / select venue or provider | `state.reserveSub` set | `renderReserveProviders()` | `PAGE: reserve-providers — Plan Event · Choose Venue` | 7488 |

## Tab 4: Gallery (`state.tab === "gallery"`)

| Screen | Description | Trigger | Render function | Page marker | Line |
|--------|------------|---------|-----------------|-------------|------|
| Gallery Grid | Photo grid with filters + search | Default | `renderGalleryGrid()` | `PAGE: gallery-grid — Gallery` | 7656 |
| Fullscreen Photo | Full-screen viewer with swipe | `state.galleryView === "photo"` | `renderPhoto()` | `PAGE: gallery-photo — Gallery · Photo` | 7836 |

## Tab 5: About (`state.tab === "about"`)

| Screen | Description | Trigger | Render function | Page marker | Line |
|--------|------------|---------|-----------------|-------------|------|
| About Main | Brand info + social links + settings | Default | `renderAbout()` | `PAGE: about-main — About` | 7937 |
| Restaurant Gallery | Dedicated gallery view | `state.aboutView === "gallery"` | `renderRestaurantGallery()` | `PAGE: about-restaurant-gallery — Gallery (restaurant)` | 7864 |
| Legal Document | Terms / Privacy / Cookies | `state.legalView` set | `renderLegalDoc(type)` | `PAGE: about-legal — Legal` | 8023 |
| Operator Login | Sign-in for business operators | `state.operatorView === "login"` | `renderOperatorLogin()` | `PAGE: about-operator-login — Operator Sign in` | 8052 |

## Shell & shared elements

These are shared chrome / components inside the SPA, not independently
addressable pages. They have no `PAGE:` marker (and never become `data-page`).

| Element | Description | Render function |
|---------|------------|-----------------|
| Header (top bar) | Brand mark + location chips | `renderHeader()` |
| Bottom Nav | 5-tab icon tab bar | `renderNav()` |
| Control Bar | Filter/search bar | `renderControlBar()` |
| Viewport | Content area (wraps `.screen`) | `renderViewport()` |
| Profile Card | Signed-in customer card on About | `renderProfileCard()` |

---

## FAQ

### How is a page titled in the code?

- **Standalone pages** carry `<!-- PAGE: <title> -->` on the line after the
  doctype, and `data-page="<slug>"` on `<body>` (slug = filename without
  `.html`). Grep for `<!-- PAGE:` to list them all.
- **SPA screens** carry `/* PAGE: <id> — <title> */` above the render function
  (and inline for the one screen without a dedicated function), and are recorded
  at runtime as `data-page` / `data-page-title` / `data-page-ref` on `.screen`.
  Grep for `PAGE:` inside `index.html`.

### How do I see the EXACT page I'm looking at in DevTools?

Open DevTools → Elements and select the `.screen` element inside `#viewport`:

```html
<div class="screen" data-page="venue-menu-item" data-page-title="Menu · Item"
     data-page-ref="rest_pizza-perfect:burgers">
```

- `data-page` is the screen template — use this id when asking which page to edit.
- `data-page-ref` is the live instance (venue id, category, promo/store/photo id).
- Or run `eoPage()` in the console to print a paste-ready line:
  `PAGE: venue-menu-item — Menu · Item  [rest_pizza-perfect:burgers]`.

### Why the id + marker and not just a line number?

Line numbers drift every time lines are added above a screen. The stable anchor
is the `PAGE:` marker/id, which never moves. The `~Lines` / `Line` columns are
kept for convenience but are approximate; the validator warns (does not fail) on
drift.

### What does `npm run inventory` check?

It is **read-only** — it never rewrites this file. It fails when:

- a root `*.html` has no `<title>`, no `<!-- PAGE: -->` banner, or no
  `data-page` on `<body>`;
- a `/* PAGE: */` banner in `index.html` is missing from `PAGE_TITLES` (or vice
  versa), or a `page("<id>", …)` call references an unknown id;
- `index.html` has no `.screen` `data-page` / `data-page-ref` wiring, no
  `pageRef()`, or no `window.eoPage()` helper.

It warns when a listed line number looks stale.

*End of inventory.*
