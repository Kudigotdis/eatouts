# Eatouts — Root HTML Pages Audit

What each HTML page in the project root can and cannot do, the constraints they
share, and how they line up against `MARKETING_ONBOARDING_PLAN.md`.

> Run the app through **`run-eatouts.bat`** (serves the root over
> `http://127.0.0.1`). Opening a page via `file://` isolates `localStorage`
> per page and breaks operator sign-in.

---

## Overview

| Page | Audience | Writes to | Auth-gated |
|------|----------|-----------|------------|
| `index.html` | Customers (+ operator sign-in entry) | `eatouts_db_v2`, `eatouts_session_v1` | No (public); sign-in is opt-in |
| `eatouts-blog.html` | Readers (+ local blog admin) | `eatouts_blog_v1`, `eatouts_blog_cache_v1` | No (admin tool is an on-device key) |
| `eatouts-event-planner.html` | Customers / event hosts | `eatouts_event_planner_v1` | No |
| `eatouts-suppliers.html` | Customers + supplier self-onboarding | `eatouts_suppliers_v1`, `eatouts_supplier_session_v1`, `eatouts_supplier_draft_v1` | No (supplier self-login, not `EatoutsAuth`) |
| `get-started.html` | Prospective owners (marketing) | reads `eatouts_db_v2` settings only | No |
| `pricing.html` | Public pricing | `eatouts_db_v2` (`settings.pricing`) | No |
| `restaurant-onboarding.html` | Restaurant owner | `eatouts_db_v2` (via owner-compat) | Yes |
| `menu-onboarding.html` | Restaurant owner | `eatouts_db_v2` | Yes |
| `promo-onboarding.html` | Restaurant owner | `eatouts_db_v2` | Yes |
| `event-onboarding.html` | Restaurant owner | `eatouts_db_v2` | Yes |
| `gallery-onboarding.html` | Restaurant owner | `eatouts_db_v2` | Yes |
| `restaurant-dashboard.html` | Restaurant owner | `eatouts_db_v2` (+ reads `eatouts_ops_v1`) | Yes |
| `intake.html` | Operator / concierge intake | `eatouts_intake_draft_v1` (+ reads `eatouts_ops_v1`) | Yes |
| `invoice.html` | Operator / ops billing | `eatouts_ops_v1` | Yes |
| `ops-console.html` | Internal ops tracker | `eatouts_ops_v1` | Yes |
| `partner-terms.html`, `one-pager.html`, `404.html` | Static | none | No |
| `seed-demo.html` | Developer harness | `eatouts_db_v2` (+ `eatouts_db_v1`) | No |
| `customer-delivery.html` | Customers (post-checkout) | reads/writes `eatouts_order_v1` | No |
| `driver-delivery.html` | Delivery rider (demo) | none (reads demo dataset) | No |
| `restaurant-delivery.html` | Restaurant dispatch (demo) | reads `eatouts_delivery_orders_v1` | No |
| `eatouts_feedback.html` | Customers / visitors | writes `eatouts_feedback_queue_v1` (WhatsApp to `+267 71 844 129`) | No |
| `designer-services.html` | Businesses / customers | `eatouts_services_v1`, `eatouts_designers_v1`, `eatouts_jobs_v1` (via `EatoutsBrandKit`) | No |
| `designer-dashboard.html` | Designers | `eatouts_designers_v1`, `eatouts_jobs_v1` (+ `eatouts_designer_session_v1` pick) | No (prototype picker, not `EatoutsAuth`) |
| `brand-kit-admin.html` | Platform admin / ops | `eatouts_designers_v1`, `eatouts_services_v1`, `eatouts_jobs_v1`, `eatouts_audit_log_v1` | Guard only (permissive with no session) |
| `eatout_event_builder.html` | Staff / experimental | none | No |

The eight operator pages share one tab bar (Restaurant · Menu · Promos · Events · Gallery · Dashboard), so they behave as one back-office app. `seed-demo.html` is a developer page and is **not** in the tab bar.

## Shared constraints

These limits apply to every page above.

1. **Client-side only.** State lives in the browser's `localStorage` under a single key `eatouts_db_v2` (`js/eatouts-db.js:24`). There is no server, API, or database.
2. **Operator pages are auth-gated.** Each runs `EatoutsAuth.requireSession()` before painting and redirects to `index.html#about` when there is no session (e.g. `restaurant-onboarding.html:121`).
3. **Sign-in needs a secure context.** Passwords are hashed with `crypto.subtle` (SHA-256 + per-user salt) and the login **fails closed** on `file://` — it only works over `https://` or `http://127.0.0.1`, which is why the app is served by `run-eatouts.bat` (`js/eatouts-auth.js:14-22,209-215`).
4. **Sign-in is "a front door, not security."** Everything is client-side `localStorage`; the session key can be written from devtools (`js/eatouts-auth.js:19-22`).
5. **No server-side file storage / upload.** There is no upload endpoint. Images are entered as **URLs or emoji** through prompts; `intake.html` additionally offers an optional client-side **file picker** that compresses the chosen image with `js/eatouts-image-compressor.js` into an embedded `data:` URL (URL entry remains the fallback), and validates videos with `js/eatouts-video-validator.js` (host and paste a URL, since data URLs are too large for `localStorage`).
6. **Owner edits fork a shared template.** Content is stored once and shared; the first edit forks it into the restaurant's own copy (`EatoutsDB.forkContent`, `js/eatouts-db.js:380-388`). This keeps the DB small (`< ~5 MB` quota).
7. **Owner → live publish path now exists for the onboarding forms.** The six business onboarding pages (restaurant, mobile kitchen, bottle store, caterer, bakery, event supplier) share `js/eatouts-onboarding-bridge.js`: "Save & publish" writes the D1 `business_profiles` row (including the new `hosting_json` column, migration 0010) *and* the local customer directory row, then exports an `eatouts.venue.v1` submission that `scripts/merge_submissions.py` folds into `assets/data/restaurant_listings/directory_runtime_data.js` on the next build. The other operator pages still only touch `localStorage`.
8. **Demo vs real session.** A real (non-demo) session locks the operator switcher to that restaurant; Demo mode keeps a `<select>` so all venues stay reachable (`js/eatouts-owner-compat.js:155-176`).

## index.html — customer app (8450 lines)

**Purpose:** the public, mobile-first customer experience and the entry point to operator sign-in.

**Can do**
- Browse the restaurant directory grouped into **472 brands** from 563 source rows, with search and **town / area** filters; multi-location chains collapse to one row with per-branch menu/photo/promo resolution.
- Open a venue to view its **menu, promotions, events, gallery, about** and legal content.
- Per-venue options panel: pick town/area/branch; Menu and Promos show as inactive with a floating notice when not applicable.
- WhatsApp ordering/reservation intents routed to the **venue's own number** (flagship as fallback), split-the-bill, social icons.
- Operator sign-in and one-tap demo login (About Us → Operator Sign in), redirecting to `restaurant-dashboard.html` (`index.html:105-...`, `js/eatouts-auth.js:206-303`).
- Seeds/loads the DB via `js/eatouts-bridge.js`.

**Cannot do**
- No real analytics, accounts, or payment/checkout processing (orders are WhatsApp intents only).
- Cannot display owner-side edits made in the dashboard — it reads the static directory JSON, not `localStorage` forks.
- No server-side data; per-device only.

## restaurant-onboarding.html — operator profile (573 lines, brand + branches)

**Purpose:** the restaurant setup editor — brand identity on top, per-branch/outlet
details underneath, with a real publish.

**Can do** — shared brand settings (name, description, logo/cover URLs, types,
character, amenities, menu tags, payments, reservations, hosting, staff, users) plus
an outlet manager for the branches. Location is a live typeahead over
`botswana_locations.js` (district → town → area) plus a mall/shopping-centre lookup
over `assets/data/botswana_shopping_malls_and_shopping_centres.js`. The **Hosting
Services** section captures capacity spaces, the hostable event types (from
`assets/data/event_types.js`) and the booking rules. Save & publish writes the D1
profile, the customer directory row and an `eatouts.venue.v1` submission.

**Cannot do**
- No image upload or embedded map (URLs / external link only).
- The Users roles are labels — no permission enforcement.

## menu-onboarding.html — menu editor (350 lines)

**Purpose:** build categories and menu items.

**Can do** — categories (name, emoji icon, description, visible) with expand/collapse; items (name, one of 23 types, description, image URL, base price, prep time, 4 statuses available/sold-out/temporarily-unavailable/hidden, comma tags); **variants** (size label + price); live money formatting from settings.

**Cannot do**
- The **modifier-group options editor is a stub** — its button fires `alert('Modifiers editor coming in the next iteration.')` (`menu-onboarding.html:329`).
- No item duplicate, reorder, bulk import, or file upload.

## promo-onboarding.html — promotions (337 lines)

**Purpose:** create and manage promotions.

**Can do** — promo list with **auto status** (active/expired/paused); create / edit / duplicate / pause / delete; 7 accordion sections: Identity, Pricing (original vs promo price + saving), Location (inherit restaurant location), Schedule (start/end date+time, recurring days), **Menu connection** (link existing menu items via chips), Action (Order/Reserve/Book/RSVP/Enquire/Call + contact), Sponsor & Terms. Edits save live to `localStorage`.

**Cannot do**
- No image upload (URL only), no preview, no real analytics.
- "Recurring" is just a stored list of day names — no scheduling engine.

## event-onboarding.html — events & performers (383 lines)

**Purpose:** manage events and the performer roster.

**Can do** — event list with auto status (draft/published/expired); create/edit/duplicate/delete; 8 accordion sections: Identity, Location, Date & time (recurrence), Attendance (expected/max + quick-fill from restaurant capacity), Admission (Free/RSVP/Reservation/Paid/Invite + ticket price + booking contact), Performers (link existing or create new), Services, RSVP (enable + contact + max). Full **performers manager** (stage name, type, genre, bio, socials, contact).

**Cannot do**
- **"Add Service" linker is a stub** — `alert('Service linker coming next.')` (`event-onboarding.html:282`).
- No image upload, no attendee/RSVP list management, no ticketing.

## gallery-onboarding.html — gallery (220 lines)

**Purpose:** manage gallery groups and images.

**Can do** — six groups seeded on first load (Food, Interior, Exterior, Events, Drinks, Atmosphere); rename, show/hide, reorder (↑/↓), delete groups; add image by URL; delete images; thumbnail grid preview.

**Cannot do**
- No file upload (URL only), no in-group image reorder, no per-image captions or editing, no cropping.

## restaurant-dashboard.html — owner dashboard (391 lines)

**Purpose:** at-a-glance status, simulated analytics, and quick actions.

**Can do** — hero showing **Live/Draft**; profile completeness % with suggestions; quick actions; "this month"/"today" stat cards; top menu items bar chart; WhatsApp-activity table; active promos and upcoming events; **billing panel** (Starter P100 / Growth P300 / Pro P500, "Manage Subscription" cycles the tier); Weekly/Monthly report **alerts**; "View as Customer" link.

**Cannot do**
- The analytics are **simulated** — derived pseudo-randomly from content counts, not real events (`restaurant-dashboard.html:95-130`).
- Reports are `alert()` previews, not downloads.
- Billing is cosmetic - no payment gateway; the plan is a stored label and the monthly prices now come from the shared pricing settings (P100 / P300 / P500).
- An **"Export this restaurant"** JSON download now exists (see below), but there is still no automated publish into the live directory.

## seed-demo.html — developer harness (418 lines)

**Purpose:** seed and verify the data layer. Not an end-user page.

**Can do** — seed the **133-restaurant roster** into `eatouts_db_v2`; run ~30 verification assertions (roster count/dedupe, unique slugs, towns/districts, no guessed areas, template sharing, storage under quota, fork isolation, `resetToShared`, delete safety, ordering, WhatsApp number); a **v1 → v2 migration test**; hard reset; town/location/thumbnail previews.

**Cannot do**
- Only meaningful when served over the local server; `file://` isolates `localStorage` per page (`seed-demo.html:80`).
- Reset is destructive; the harness notes the Yellow Giraffe content bundle wiring is elsewhere.



## eatouts-blog.html - blog + local admin (484 lines)

**Purpose:** public blog feed with per-post pages and a local authoring tool.

**Can do** - feed + tag/search filtering (shareable `#tag-` hash and `?post=` deep links with OG tags), post view, admin create/edit/delete, **version history** (snapshot / restore), image upload via the shared compressor. Stores to `eatouts_blog_v1` (with a `history{}` map; history is shed before a save can exceed the 4 MB browser budget).

**Cannot do** - No server/CMS; posts live in this browser only (export the feed JSON to publish).

## eatouts-event-planner.html - event planner (1430 lines)

**Purpose:** plan an event (guests, budget, timeline) and send a structured enquiry.

**Can do** - self-contained single-page planner; saves a draft to `eatouts_event_planner_v1`; deep-links the venue enquiry to WhatsApp.

**Cannot do** - No accounts or server; per-device draft only.

## eatouts-suppliers.html - supplier directory + self-onboarding (1737 lines)

**Purpose:** browse event suppliers, and let a supplier publish a profile on-device.

**Can do** - supplier profiles under `eatouts_suppliers_v1`; supplier sign-in (`eatouts_supplier_session_v1`) and drafts (`eatouts_supplier_draft_v1`); directory search.

**Cannot do** - Supplier "sign-in" is a local label, not `EatoutsAuth` and not a real account; profiles are per-device.

## get-started.html - owner landing (157 lines) / pricing.html - public pricing (221 lines)

**Purpose:** marketing entry for prospective owners, and the pricing page.

**Can do** - `pricing.html` reads and persists the shared plan prices (`eatouts_db_v2` settings.pricing) that the dashboard and ops console also read; `get-started.html` links into intake and pricing.

**Cannot do** - No checkout; "Start" is a link into the WhatsApp/onboarding flow.

## intake.html - concierge intake (1082 lines)

**Purpose:** guided, operator-run capture of a restaurant record; auth-gated like the onboarding pages.

**Can do** - full draft (`eatouts_intake_draft_v1`) mirroring the runtime venue shape; optional **client-side image picker** (compressor -> embedded data URL) for logo/cover/menu/gallery images, plus video validation; exports a venue object for the merge step.

**Cannot do** - No server upload (data URLs stay in this browser); export still feeds the manual merge.

## invoice.html / ops-console.html - internal ops (auth-gated)

**Purpose:** generate invoices and track MRR/activity.

**Can do** - both read/write `eatouts_ops_v1` (venues, invoices, submissions, metrics); the console recomputes MRR from active tiers and reuses `settings.pricing`.

**Cannot do** - Single-device prototype tracker; no accounting backend.

## partner-terms.html, one-pager.html, 404.html

Static legal/marketing pages and the custom 404. No storage, no auth. The 404 is served by Cloudflare Pages (`404.html` at the build root).

## Delivery interfaces — customer / restaurant / driver (demo)

Three standalone pages share the customer shell (logo header → `index.html#promos`, five-tab bottom nav) but keep their own header chip:

- **`customer-delivery.html`** — the customer's post-checkout delivery flow. Reads the order the main app wrote to `eatouts_order_v1` and writes back the chosen delivery details; delivery zones come from `assets/data/delivery_zones.js` (`window.EatoutsDelivery`).
- **`restaurant-delivery.html`** — the restaurant's dispatch board (incoming requests, immediate orders, scheduled rounds, kitchen prep, routes & drivers, settings, comms templates, exceptions). Persists accepted orders under `eatouts_delivery_orders_v1`.
- **`driver-delivery.html`** — a rider's board (duty status, rounds, active stop checklist, problems, feedback, completed log). Demo-only; no storage.

The two operator boards are seeded from the **50-order scheduled-delivery snapshot** at `assets/data/deliveries/the_food_place_50_scheduled_deliveries.js` (`window.EATOUTS_FOOD_PLACE_DELIVERY_BACKFILL`) when no stored orders exist yet: `restaurant-delivery.html` maps its 50 orders / 2 riders / analytics into the board and window slot counts, and `driver-delivery.html` builds Thabo Molefe's 10 round-ledger from the same snapshot (street-level plot/property/landmark/phone fields the dataset does not carry render blank). Sibling files in that folder — raw `.json`, flat `.txt`, and the two `.md` shift/driver manifest summaries — are data assets, not deploy targets (`copy-static.mjs` copies the whole `assets` folder).

**Cannot do (architecture planned for a later session)** — no role enforcement: the "Operators" sign-in currently lands on `restaurant-dashboard.html`, and `restaurant-onboarding.html` offers both delivery views to anyone holding a session. Real per-role gating (owner/manager vs rider), a shared `EatoutsDelivery` state module, and a live customer→restaurant→driver order flow are deliberately deferred.

## eatouts_feedback.html - feedback form (961 lines)

**Purpose:** collect structured feedback and deliver it to the EatOuts support line over WhatsApp.

**Can do** - multi-step accordion form (feedback-type chips → "Summary" + "Details" with tap-in suggestions per type → optional extra fields that adapt to the type → screenshot web URL → device chips → contact info), input validation, saves each submission to `eatouts_feedback_queue_v1`, then opens a `https://wa.me/26771844129` compose with the packaged message. Reached from the About tab Settings accordion (Feedback row, below Privacy Policy).

**Cannot do** - No server, no attachments: the screenshot is a pasted web URL and the resulting WhatsApp compose is a manual "Send" intent, not an automatic upload.

## Design marketplace — designer-services.html / designer-dashboard.html / brand-kit-admin.html

Three pages share the design data layer `js/eatouts-brand-kit.js` (`EatoutsBrandKit`), which seeds and stores services, designers and jobs in `eatouts_services_v1`, `eatouts_designers_v1` and `eatouts_jobs_v1` (seeds in `js/eatouts-services-seed.js`, `js/eatouts-designers-seed.js`).

- **`designer-services.html`** — the public, customer-facing marketplace. Reached from `index.html` → About → Settings → **Need Design**. A step flow (catalogue → service → designer → brief → summary → done) browses services by category, picks a designer (avatars), captures a brief (`validateBrief`) and options (rush, extra revisions, reveal opt-in, founding, terms), then submits: it writes the job to `eatouts_jobs_v1` and hands off to WhatsApp, returning to `index.html`. Its catalogue footer links designers on to `designer-dashboard.html`.
- **`designer-dashboard.html`** — the designer's private workspace. Prototype sign-in: on first load a picker lists the designers and stores the choice in `eatouts_designer_session_v1` (it does **not** use `EatoutsAuth`). Once "signed in" it shows capacity metrics, active project/retainer job cards and a per-job detail (brief, price breakdown, payout status, progress note, deliverable URL), letting the designer submit a draft or request clarification — but not close their own job.
- **`brand-kit-admin.html`** — the platform-admin console ("Brand & Design Services Admin"). Reached from `eatouts-admin-dashboard.html` → **Brand & Design** card. Four tabs (Jobs · Designers · Payouts · Services) run the job lifecycle (approve/reject, assign designer, mark delivered, client-approved, close job/cycle, end retainer, cancel, payout sent) and manage the designer roster and service catalogue, logging to `eatouts_audit_log_v1`. Its `currentUserDenied()` guard requires a platform-admin role (`super_admin`/`platform_admin`/`platform_admin_owner`/`admin`) when an `EatoutsAuth` session exists, but falls open in local prototype mode (no session or no auth module).

**Cannot do** — No server: all three are browser-only prototypes over `localStorage`. The designer "sign-in" is a local picker and the admin guard is a convenience check, not real permissions; nothing here publishes to the live directory.

## eatout_event_builder.html — legacy event builder (4104 lines)

**Purpose:** a superseded experimental event builder retained for the test harness; not an end-user surface and reachable by direct link only. Covered by `tests/appshell.js` (tool mode) and the five `builder-*.js` suites. **Cannot do** — production use; it has been replaced by `event-onboarding.html`.

## Manager / auth / admin / customer accounts (staged package)

These pages were dropped in from a received package and normalized to the platform
shell (top header + bottom nav). They share a **namespaced** store
`EatoutsMgrDB` (`localStorage` key `eatouts_manager_v1`) so they never touch the
customer app's `eatouts_db_v2`, and a role layer merged onto `EatoutsAuth`
(`getUser/hasRole/can/routeFor`). They load
`js/eatouts-manager-db.js`, `js/eatouts-roles.js`, `js/eatouts-users.js`,
`js/eatouts-feedback.js`, `js/eatouts-blog-admin.js`, `js/eatouts-auth.js`,
`js/eatouts-manager.js`, plus `assets/eatouts-manager.css`.

**Demo credentials** (all PIN `1234`): customer `26770000001`, restaurant owner
`26770000002`, bottle store `26770000003`, caterer `26770000004`, lodge
`26770000005`, supplier `26770000006`, platform admin `26770000099`. Universal
sign-in is `eatouts-login.html` (also reachable from `index.html` → About →
Operator Sign in → "Universal sign-in").

Navigation is role-based (rendered by `EO.shell`): **customer** (Promos · Saved ·
Orders · Addresses · Profile), **operator** (Dashboard · Orders · Menu · Staff ·
More) and **admin** (Admin · Users · Feedback · Analytics · Settings). Auth and
onboarding screens use the centred `.login` card with a platform logo header.

| Page | Who | Purpose |
|------|-----|---------|
| `eatouts-login.html` | all | Universal WhatsApp + PIN sign-in, routes by role |
| `eatouts-customer-signup.html` | customer | Customer account creation (18+ gate, live town/area, WhatsApp login, favourites) |
| `eatouts_user_onboarding.html` | caterer | Caterer setup form (brand, outlets, menus, packages, service coverage) |
| `eatouts-business-signup.html` | new business | Business-type chooser — each card opens that type's own form |
| `restaurant-onboarding.html` / `mobile-kitchen-onboarding.html` / `bottle-store-onboarding.html` / `caterer-onboarding.html` / `bakery-onboarding.html` / `supplier-onboarding.html` / `lodge-onboarding.html` | each type | Per-type business onboarding (shared bridge: live town/area + place lookup, Hosting Services, publish to D1 + customer directory) |
| `staff-manager.html` | biz owner/admin/manager | Staff CRUD, employment records, roles, attendance, tips, performance, payroll tabs |
| `delivery-manager.html` | biz owner/admin | Zones, fees, capacity, drivers, windows |
| `order-manager.html` | biz + staff | Live order queue |
| `reservation-manager.html` | biz owner/admin | Table bookings, guests, deposits |
| `room-manager.html` | lodge owners | Rooms, rates, housekeeping |
| `billing-manager.html` | biz owner | Subscription and invoices |
| `analytics-manager.html` | biz owner/admin | Order / delivery analytics |
| `quote-manager.html` | caterer/supplier | Quote builder |
| `booking-manager.html` | supplier/lodge | Booking requests |
| `eatouts-admin-dashboard.html` | platform admin | Platform control centre |
| `eatouts-users-manager.html` | platform admin/ops | Users and role management |
| `feedback-manager.html` | platform admin/support | Feedback ticket queue |
| `blog-creator-dashboard.html` | platform author | Blog writer/publisher (uses `EatoutsBlogAdmin`) |
| `eatouts-verification-queue.html` | platform ops | Business verification |
| `eatouts-disputes.html` | platform admin/ops | Issues / refunds / escalations |
| `eatouts-platform-analytics.html` | platform admin/analyst | Cross-platform analytics |
| `eatouts-notifications.html` | platform admin | Segment notifications |
| `eatouts-settings.html` | platform admin | Platform configuration |
| `eatouts-favourites.html` / `eatouts-orders.html` / `eatouts-profile.html` / `eatouts-addresses.html` | customer | Account surfaces |

### Spec workspaces (recovered `*1` pages)

Four next-iteration workspaces came in with the package and replaced their root
duplicates (`business-onboarding.html`, `operator-dashboard.html`,
`eatouts-staff-admin.html`, `food-truck-schedule.html` were deleted; the `*1`
variants are canonical). They load the same manager stack plus
`js/eatouts-data.js` (adapter exposing `EatoutsDB.collection/find/upsert/remove`
and `EatoutsBlog.all()` over `EatoutsMgrDB` + legacy keys) and
`assets/data/business_types.js` (`EatoutsBusinessTypes`).

| Page | Who | Purpose |
|------|-----|---------|
| `operator-dashboard1.html` | linked business owner/admin | Role-gated business workspace (orders, staff, reports, settings tabs; business switcher); entry links normalized to `eatouts-login.html` |
| `eatouts-staff-admin1.html` | platform staff roles | Restricted staff workspace (role-limited tabs, read-only feedback for unauth ops); links normalized to `eatouts-login.html` / `eatouts-admin-dashboard.html` / `feedback-manager.html` / `blog-creator-dashboard.html` |
| `food-truck-schedule1.html` | food truck owner | Food truck location / service-day schedule management |

`business-onboarding1.html` was the fourth member of this family — the unified
per-type setup form. It has been **retired**: the six business types now each have
their own form (see the table above) and `eatouts-business-signup.html`,
`operator-dashboard1.html` and `food-truck-schedule1.html` route to the right one via
`EatoutsBusinessTypes.onboardingPage(type)`. `_redirects` answers the old URL with a
301 to `eatouts-business-signup.html`.

All of them read/write through the adapted `EatoutsDB` namespace (root `eatouts_db_v2`
for `restaurants`, `EatoutsMgrDB` under `eatouts_manager_v1` for the rest; blog
union includes legacy `eatouts_blog_posts_v1`) and record actions via
`EatoutsAudit.log` (`js/eatouts-audit.js`, key `eatouts_audit_v1`).

Dropped on merge (the existing root page won): the package's stubs of
`restaurant-onboarding.html`, `restaurant-dashboard.html`, `menu-onboarding.html`,
`eatouts-suppliers.html`, `eatouts_feedback.html`. Dropped by decision: reviews
(`review-manager.html`). The original package is kept verbatim under
`staging/package/`.

## Gaps vs MARKETING_ONBOARDING_PLAN.md

The plan's paid, launch-ready model assumes an owner can get a venue onto the public site. The onboarding forms now close most of that loop:

- **Export and publish both exist (plan task #1).** The dashboard offers an **"Export this restaurant"** JSON download (`eatouts.venue.v1`), and the onboarding pages' **Save & publish** writes the D1 business profile, the local customer directory row and an `eatouts.venue.v1` submission in one go. The submission is merged into `directory_runtime_data.json` / `.js` by `scripts/merge_submissions.py`, which `npm run build` now runs after the directory build so owner submissions survive it.
- **Dashboard analytics are simulated** (`restaurant-dashboard.html:95-130`), so the plan's menu-view / WhatsApp-action metrics cannot be trusted until the customer app emits real events and the dashboard reads `EatoutsDB.summary()`.
- **Billing is a label, not a charge.** The plan's **P300 one-time setup + P100 / P300 / P500 monthly** model has no invoicing, no gate, and no payment integration in the UI (the dashboard now reads the shared P100 / P300 / P500 prices and shows a setup-fee status badge sourced from `eatouts_ops_v1`).
- **Publish has no fee gate.** The onboarding publish action requires an owner session but does not check that the P300 onboarding fee was paid; the plan's rule "listing is published only after the P300 onboarding fee is confirmed" is still not enforced anywhere.

## How to run

1. Start `run-eatouts.bat` and open the `http://127.0.0.1:PORT` address it prints.
2. First visit: open `seed-demo.html` → **Seed demo data**, then **Run verification** (all assertions should read PASS).
3. Operator pages: from `index.html` → About Us → **Operator Sign in** (or Demo login), then the Dashboard and the other operator tabs.
4. Opening any page via `file://` breaks password login (no secure context) and isolates `localStorage` per page.