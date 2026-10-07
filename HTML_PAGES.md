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

The eight operator pages share one tab bar (Restaurant · Menu · Promos · Events · Gallery · Dashboard), so they behave as one back-office app. `seed-demo.html` is a developer page and is **not** in the tab bar.

## Shared constraints

These limits apply to every page above.

1. **Client-side only.** State lives in the browser's `localStorage` under a single key `eatouts_db_v2` (`js/eatouts-db.js:24`). There is no server, API, or database.
2. **Operator pages are auth-gated.** Each runs `EatoutsAuth.requireSession()` before painting and redirects to `index.html#about` when there is no session (e.g. `restaurant-onboarding.html:121`).
3. **Sign-in needs a secure context.** Passwords are hashed with `crypto.subtle` (SHA-256 + per-user salt) and the login **fails closed** on `file://` — it only works over `https://` or `http://127.0.0.1`, which is why the app is served by `run-eatouts.bat` (`js/eatouts-auth.js:14-22,209-215`).
4. **Sign-in is "a front door, not security."** Everything is client-side `localStorage`; the session key can be written from devtools (`js/eatouts-auth.js:19-22`).
5. **No server-side file storage / upload.** There is no upload endpoint. Images are entered as **URLs or emoji** through prompts; `intake.html` additionally offers an optional client-side **file picker** that compresses the chosen image with `js/eatouts-image-compressor.js` into an embedded `data:` URL (URL entry remains the fallback), and validates videos with `js/eatouts-video-validator.js` (host and paste a URL, since data URLs are too large for `localStorage`).
6. **Owner edits fork a shared template.** Content is stored once and shared; the first edit forks it into the restaurant's own copy (`EatoutsDB.forkContent`, `js/eatouts-db.js:380-388`). This keeps the DB small (`< ~5 MB` quota).
7. **No owner → live publish path.** The public directory in `index.html` is built from the static file `assets/data/restaurant_listings/directory_runtime_data.json`; owner edits only ever touch `localStorage`. The two are disconnected (this is the gap called out in `MARKETING_ONBOARDING_PLAN.md`).
8. **Demo vs real session.** A real (non-demo) session locks the operator switcher to that restaurant; Demo mode keeps a `<select>` so all venues stay reachable (`js/eatouts-owner-compat.js:155-176`).

## index.html — customer app (6295 lines)

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

## restaurant-onboarding.html — operator profile (741 lines, 14 sections)

**Purpose:** the master profile editor for a single restaurant.

**Can do** — 14 sections: Identity (name, description, logo/cover URLs, types), Location (town/area/plot/street/building/landmark, lat/lng, GPS button, Google Maps link), Contacts (CRUD, duplicate, reorder, primary/WhatsApp/active, purpose), Socials (7 platforms), Operating hours (weekly + custom schedules), Character, Amenities, Menu tags (cuisine/meal/dietary), Capacity, Payments, Reservations (enable, WhatsApp/call contacts, guest min/max, same-day/advance, cancellation notes), Reservation services (CRUD/dup/reorder), Service staff (CRUD/reorder), Users (roles + **hashed login credentials**). Plus a completeness meter and Save-draft / Publish / Preview actions.

**Cannot do**
- No image upload or embedded map (URLs / external link only).
- No real publish: Publish only validates name + town + one contact and sets `status='published'`; it does not propagate to the live site.
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

**Cannot do** - No server/CMS; posts live in this browser only. Optional cloud sync via `js/eatouts-cloud.js` needs the Worker deployed and configured.

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

## Gaps vs MARKETING_ONBOARDING_PLAN.md

The plan's paid, launch-ready model assumes an owner can get a venue onto the public site. The current build does not close that loop:

- **Export exists; automatic publish does not (plan task #1).** The dashboard now offers an **"Export this restaurant"** JSON download (`eatouts.venue.v1`), but nothing moves that file into `directory_runtime_data.json` automatically - the merge-and-deploy step is still manual (`scripts/merge_submissions.py` + `npm run build`).
- **Dashboard analytics are simulated** (`restaurant-dashboard.html:95-130`), so the plan's menu-view / WhatsApp-action metrics cannot be trusted until the customer app emits real events and the dashboard reads `EatoutsDB.summary()`.
- **Billing is a label, not a charge.** The plan's **P300 one-time setup + P100 / P300 / P500 monthly** model has no invoicing, no gate, and no payment integration in the UI (the dashboard now reads the shared P100 / P300 / P500 prices and shows a setup-fee status badge sourced from `eatouts_ops_v1`).
- **Publish has no gate.** `restaurant-onboarding.html` Publish only sets a status flag; the plan's rule "listing is published only after the P300 onboarding fee is confirmed" is not enforced anywhere.

## How to run

1. Start `run-eatouts.bat` and open the `http://127.0.0.1:PORT` address it prints.
2. First visit: open `seed-demo.html` → **Seed demo data**, then **Run verification** (all assertions should read PASS).
3. Operator pages: from `index.html` → About Us → **Operator Sign in** (or Demo login), then the Dashboard and the other operator tabs.
4. Opening any page via `file://` breaks password login (no secure context) and isolates `localStorage` per page.