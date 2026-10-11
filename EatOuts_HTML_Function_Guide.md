# EatOuts — HTML Purpose, Function & Integration Guide

## 1. What this guide covers

This guide explains the 35 HTML pages in **EatOuts_Manager_Auth_Build.zip**: 30 new pages and 5 existing pages that were updated. It is written for the VS Code AI agent that will integrate them into the main EatOuts application.

Use three distinctions throughout:

1. **Intended function** explains what the page must do in the finished product.
2. **Current package** describes the code that was actually supplied. Many pages are functional local/demo scaffolds, not production-complete implementations of every requirement in the attached `Pasted text(3).txt` build spec.
3. **Integration requirement** explains what the coding agent must connect, normalize, test, or extend.

The attached build spec is the desired product behavior. The generated package is the starting code. Do not treat a page existing or passing JavaScript syntax validation as proof that its full business workflow is complete.

## 2. The application as a whole

EatOuts has four major experiences that must feel like one app:

- **Customer experience:** discover businesses, menus, beverages, promos, events and suppliers; place orders or submit requests; view profile, addresses, history, favourites, notifications and feedback.
- **Business experience:** set up a business, publish its public listing, manage products/menus, staff, deliveries, orders, reservations, rooms, quotes, bookings, reviews and billing.
- **Platform operations:** verify businesses, manage users and permissions, triage feedback and disputes, publish the blog, configure platform-wide settings and monitor analytics.
- **Shared foundations:** authentication, active-business selection, a permission system, a single data-access layer, reusable UI helpers, audit events, analytics events and consistent route handling.

The key workflow is not “open a set of separate HTMLs.” It is:

**discover → sign in or continue as guest → onboard if needed → operate a business or use a customer account → carry the same data across pages → send operational problems to support/admin → report all meaningful changes in the same shared stores.**

## 3. Important filename and architecture differences to reconcile

The attached build spec and the delivered ZIP do not use identical naming or architecture. The AI must explicitly reconcile these differences.

| Concept in attached spec | File supplied in ZIP | Required integration decision |
|---|---|---|
| `eatouts-login.html` | `eatouts_login.html` | Choose one canonical route. Preserve the other as a compatibility alias or update every reference. Preserve `?return=` and other query parameters. |
| `eatouts-user-onboarding.html` | `eatouts_user_onboarding.html` | Same: canonical name plus compatibility alias, or exhaustive link update. |
| `eatouts-user-profile.html` | `eatouts_profile.html` | The profile should be reachable from the main app’s “You” area. Keep the old link working. |
| `eatouts-user-orders.html` | `eatouts_orders.html` | Make one complete order-history view. Do not create two divergent order histories. |
| `eatouts-user-favourites.html` | `eatouts_favourites.html` | Make one favourites source and one favourites interaction system. |
| `business-onboarding.html` | `restaurant-onboarding.html` plus `bottle-store-onboarding.html`, `caterer-onboarding.html`, `lodge-onboarding.html`, `supplier-onboarding.html` | The spec wants a single type-aware onboarding shell. Make it canonical and use the current type-specific files as thin wrappers/compatibility entry points, or document a justified alternative. Do not duplicate all form logic. |
| `operator-dashboard.html` | `restaurant-dashboard.html` plus manager pages | The spec wants a single business-type-aware operator workspace. Consolidate dashboard navigation and permissions around one canonical workspace; retain the old restaurant dashboard route for existing links. |
| `eatouts-staff-admin.html` | No exact equivalent | Create the restricted staff dashboard required by the spec, reusing admin tab components rather than cloning the full admin dashboard. |
| `food-truck-schedule.html` | No exact equivalent | Add the food-truck weekly rotation module/page and link it to business onboarding, operator workspace and the public discovery page. |
| `js/eatouts-ui.js` | `js/eatouts-manager.js` | Extract/commonize helpers or retain `EO` as a compatibility facade. Do not leave two unrelated UI helper systems. |
| `js/eatouts-analytics.js` | No exact equivalent | Add analytics event tracking/aggregation or a compatible adapter. Do not invent analytics from static demo numbers. |
| `js/eatouts-audit.js` | No exact equivalent | Add a central audit logger and call it from meaningful writes. |
| `assets/data/business_types.js` | No exact equivalent | Create the type/module/role/permission catalogue as a single source of truth. |
| `eatouts_db_v2` aggregate store | Spec also names `eatouts_users_v1`, `eatouts_order_v1_history`, `eatouts_delivery_orders_v1`, `eatouts_feedback_v2`, `eatouts_blog_posts_v1`, etc. | Do not let individual pages write conflicting duplicate copies. Add a data adapter and a documented, one-time migration strategy; choose one canonical logical record per entity and preserve backward compatibility for existing app code. |
| `eatouts_active_session_v2` in package auth | Spec names `eatouts_auth_session_v1` | Normalize sessions through `EatoutsAuth`. Read/migrate the legacy key once, then have every page use the same API. Never let pages independently create competing sessions. |

### Data compatibility principle

The ZIP’s `js/eatouts-db.js` stores users, businesses, staff, orders, reservations, rooms, reviews, feedback, quotes, bookings, notifications, favourites, addresses, invoices, verification, disputes and settings together in `eatouts_db_v2`. The build spec names a number of separate `localStorage` stores. The main app may also depend on existing keys such as `eatouts_order_v1` and existing methods on `EatoutsDB`/`EatoutsAuth`.

The AI must inspect the current project before changing storage. It should then add a central adapter that:

- reads existing keys without crashing if they are absent or malformed;
- migrates old records only once, with an explicit migration marker and a backup/export option;
- normalizes field names and IDs without discarding information;
- exposes a consistent API to every page;
- prevents stale dual writes and conflicting truth sources;
- keeps compatibility with the methods the existing `index.html` calls, including `EatoutsDB.resolveContent(...)`, `EatoutsDB.KEY`, `EatoutsAuth.login(...)`, `EatoutsAuth.loginDemo(...)` and `EatoutsAuth.secureContextAvailable()` if still referenced by the project.

## 4. Shared foundations — what every page depends on

### `js/eatouts-db.js` — shared data access

This module must be the only route for application records to be read and updated. In the delivered ZIP, `EatoutsDB.get()` returns the aggregate state; `save()`, `reset()`, `collection()`, `find()`, `filter()`, `upsert()`, `remove()` and `resolveContent()` form its current API.

Finished behavior: validate the data shape on load, back up before migrations or destructive imports, preserve related data, provide predictable empty collections and emit a change event after writes so open pages can refresh. A page must not quietly make a private array in a new storage key and call that the official data.

### `js/eatouts-auth.js` — identity and routing

This is the single identity/session API. It should provide current user, role checks, login/logout, active-business selection, route-after-login and compatibility handling. In the delivered ZIP, the canonical session is `eatouts_active_session_v2`; the spec calls for `eatouts_auth_session_v1`. Normalize this in one migration and keep every page using `EatoutsAuth`, not ad hoc `localStorage` reads.

For final routing, use the specification’s intended destinations unless the existing project has a deliberate, documented reason to differ:

- platform super-admin → `eatouts_admin_dashboard.html`;
- restricted EatOuts staff → `eatouts-staff-admin.html`;
- business user → `operator-dashboard.html?biz=<id>`;
- customer → `index.html`, with the account page available from “You”;
- signed-out user → can browse as guest, but needs login/signup when a personal or staff-only action requires it;
- `?return=<url>` → safely return to the requested local app URL after successful sign-in. Reject unsafe external destinations unless explicitly approved.

Keep existing demo accounts working while integrating the spec. The ZIP uses demo PIN `1234`; the spec mentions placeholder password `0`. Do not silently break either data set. Centralize the pilot credential rule in auth and clearly mark it as demo-only; real authentication requires a backend.

### `js/eatouts-roles.js` — roles and permissions

Centralize role and permission checks. The current ZIP includes a simplified permission matrix. Expand it to support the spec’s fine-grained permission keys (`orders.view`, `orders.fulfil`, `staff.edit`, `staff.view_salary`, `feedback.respond`, `finance.edit`, `businesses.approve`, and similar). Page visibility and each write action must both check permission. Client-side permissions improve safe UI behavior but are not real security against a user editing local JavaScript; enforce permissions on a backend when one exists.

### `js/eatouts-manager.js` / intended `js/eatouts-ui.js` — shared interface

The generated pages currently use the `EO` helper surface from `eatouts-manager.js`, including shell rendering, role guards, business/user helpers, metrics, status labels, escaping, currency formatting and toasts. The notes call for `js/eatouts-ui.js` with shared helpers such as `esc`, `uid`, `money`, `fmt`, `toast`, `openSheet`, `openForm` and `renderField`.

Extract or wrap these helpers without breaking current pages. There should be one visual system and one implementation of a helper—not page-by-page lookalikes. Keep forms accessible, keyboard-operable, mobile-friendly and consistent.

### `js/eatouts-users.js` — user CRUD

Resolve a user by ID or normalized WhatsApp number, create/update accounts, detect duplicates, attach multiple roles/business relationships and avoid creating a second user for an existing staff member. Soft-disable accounts instead of erasing relationships needed for history unless a privileged, confirmed hard-delete is deliberately supported.

### `js/eatouts-feedback.js` — feedback records

Use a central helper for creating, listing, updating and assigning tickets. The ZIP’s aggregate model uses `feedback`; the spec also names `eatouts_feedback_v2` and migration from `eatouts_feedback_queue_v1`. Centralize the migration and ticket status logic. The submission page and the admin inbox must be looking at the same tickets.

### `js/eatouts-blog.js` — content records

Use one post model and one rendering contract for the public reader and the editor. The spec expects drafts, published/scheduled/archived states, tags, metadata, ordered blocks and revisions. Do not let the editor create a record that the reader cannot render.

### `assets/data/supplier_catalog.js` — shared supplier taxonomy

This contains the common eight-category event supplier catalogue. Treat it as canonical across supplier listing, event planner and supplier onboarding. Do not duplicate category lists inside pages.

### Add the following modules required by the spec

- `js/eatouts-audit.js`: central `EatoutsAudit.log(action, target, before, after)` helper, with actor/time/target metadata; every meaningful admin or business write should use it.
- `js/eatouts-analytics.js`: event tracking plus aggregation from the real shared records. Label unavailable/backend-dependent reporting honestly.
- `assets/data/business_types.js`: business-type catalogue, module sets, role lists and permission presets for `restaurant`, `bottlestore`, `caterer`, `lodge`, `bakery`, `foodtruck` and `supplier`.
- `js/eatouts-locations.js` and the existing Botswana locations data: one district → town → area selector reused throughout onboarding, profiles, schedules and addresses. Avoid free-text location values when the canonical picker can provide a value.

## 5. Detailed purpose and function of every delivered HTML

# Track A — Authentication and onboarding

## 5.1 `eatouts_user_onboarding.html` — customer account creation

**Primary purpose:** let customers create a personal EatOuts account without requiring an account just to browse or order. An account enables preferences, saved addresses, favourites, order history and notifications on the current device.

**Core flow:** collect identity → contact/WhatsApp → location → optional delivery defaults → optional interests → terms/privacy consent → create user → create session → return to the app or to a supplied `?return=` route.

**Information and logic:** first/surname, date of birth, gender, WhatsApp as login identifier, optional email/additional contact, district/town/area, default address, cuisine/diet/drink interests, notification settings and account status. Duplicate normalized WhatsApp numbers must route the user to login rather than create a second account.

**Data connections:** user record, auth session, audit events, address defaults, favourites and order identity. Customer-facing `index.html`, `customer-delivery.html` and the profile page must use these saved details to prefill relevant forms.

**Age handling:** the attached spec calls for recording `ageYears` and `minor`; any minor flag must cause alcohol-flagged promos and `isAlcohol` items to be hidden from that account. The generated ZIP currently rejects anyone under 18 rather than creating a minor account. The coding agent must implement the behavior agreed in the attached spec consistently across account creation, discovery and beverage checkout, and must not rely on a checkbox alone to verify age.

**Current package gap:** the current page is a simplified one-screen form and blocks under-18s. It does not yet implement all six spec steps, location selectors, address defaults, interests, terms links, duplicate route, or `?return=`.

**Success means:** one user per normalized WhatsApp; valid fields; one canonical session; no accidental duplicate user; customer lands back in the main app; saved fields appear in checkout/profile; age restrictions apply everywhere.

## 5.2 `eatouts_login.html` — universal sign-in

**Primary purpose:** one front door for customers, business owners, staff, suppliers and platform administration. The user enters WhatsApp plus pilot PIN/password; the auth service resolves the account and routes to its authorized workspace.

**Behavior:** normalize country code/number before lookup; show meaningful errors for missing account, disabled account or incorrect credential; support demo account selection; recognize an existing session; provide sign-out and signup/business-listing links; honor safe `?return=` destinations.

**Routing:** use the centralized route table in `EatoutsAuth`. A customer should return to the customer-facing app, a business account to the unified operator workspace, restricted staff to the staff-admin workspace and a super-admin to the full admin console. When a user has multiple business memberships, show a business switcher rather than opening an arbitrary business.

**Current package behavior:** demo login exists and uses PIN `1234`; the auth code stores a user ID under `eatouts_active_session_v2`. The attached spec uses the `eatouts-login.html` spelling, a different session key and notes literal `0` as a pilot credential. Normalize these centrally and preserve existing demo accounts.

**Security note:** client-side localStorage authentication is suitable only for a local prototype/demo. Never represent it as production-secure authentication.

## 5.3 `eatouts_business_signup.html` — business type chooser

**Primary purpose:** make a new business owner choose what they are registering before the correct onboarding modules are shown.

**Choices currently provided:** restaurant, bottle store, caterer, lodge and supplier. The spec’s complete catalogue also includes bakery and food truck. Add these types without duplicating type/module knowledge across pages.

**Behavior:** each choice should route to the canonical `business-onboarding.html?type=<type>` wizard. Existing type-specific URLs should remain compatible through lightweight redirects/wrappers. If the user is not signed in, preserve the chosen type through login/signup and return to onboarding.

**Data:** selected type, draft state, owner identity and eventual business record. The chooser should not create a published business by itself.

**Current package gap:** links directly to separate onboarding files and lacks bakery/food-truck choices and draft/session continuity.

## 5.4 `bottle-store-onboarding.html` — bottle-store-specific entry point

**Primary purpose:** allow a bottle store to create or edit its business profile using fields appropriate to beverage retail, stock and delivery—not restaurant table-service fields.

**Required profile/modules:** identity and public listing; district/town/area and address; WhatsApp and contact list; hours; supported payments; staff/users; product catalog; beverage categories and alcohol flags; promotions; gallery; delivery settings; billing/setup-fee state; review/publish checklist.

**Special behavior:** alcohol products carry explicit `isAlcohol` flags. Public discovery, account age handling and checkout must all use those flags. Product stock, prices and availability must be shared with the customer-facing catalog.

**Current package gap:** the generated page is a separate onboarding form; integrate it as a compatibility entry point to the canonical type-aware onboarding shell rather than maintaining a second, divergent bottle-store form.

## 5.5 `caterer-onboarding.html` — catering business setup

**Primary purpose:** let caterers publish service packages and accept event-based enquiries/quotes without pretending the business has dine-in tables or normal restaurant table service.

**Required profile/modules:** business identity, location, contacts/socials, available hours, capacity, payment methods, staff, service/package catalog, events/promos when applicable, gallery, booking/quote settings and billing/publish checks.

**Core data relationship:** package/service items should be usable by `quote-manager.html` and `booking-manager.html`; accepted quote/booking status should remain visible to the operator workspace.

**Current package gap:** a standalone onboarding page exists. It must write to the same business model that the quote and booking tools read.

## 5.6 `lodge-onboarding.html` — accommodation setup

**Primary purpose:** let a lodge publish its property profile and configure room inventory, nightly rates and housekeeping, with booking requests flowing into the same operational record set.

**Required modules:** property identity/location/contacts/hours; amenities; capacity; rooms and room types; nightly rates; room availability/housekeeping; optional food/beverage menu; reservations/bookings; staff; gallery; billing and publish state.

**Data flow:** onboarding creates/configures the business; `room-manager.html` manages live room states; `booking-manager.html` tracks requests; billing and analytics refer to the same business ID. Avoid a separate room list that the booking page cannot see.

**Current package gap:** separate page exists, but it needs the canonical business ID and `?biz=<id>` context instead of acting as an isolated demo form.

## 5.7 `supplier-onboarding.html` — event supplier setup

**Primary purpose:** register a supplier of event-related services and connect the profile to the shared supplier taxonomy, services, portfolio, quotes and booking requests.

**Required modules:** identity, location, contacts/socials, operating hours, payment methods, service packages, portfolio examples/photos, staff if relevant, gallery, billing and publish checklist. Use the shared eight-category catalogue from `assets/data/supplier_catalog.js`.

**Auth requirement:** supplier login must use the same `EatoutsAuth` identity and role model as every other account—not a standalone PIN universe.

**Current package gap:** `eatouts-suppliers.html` is a directory/listing page and this onboarding page is an editor; both must use the same taxonomy and business record.

# Track B — Business managers

## 5.8 `staff-manager.html` — staff records and staff access

**Primary purpose:** central staff registry for any business type. Owners/admins can manage staff profiles, roles, responsibilities, employment details and optional staff logins from one place.

**Staff form:** first/surname, DOB/age, gender, photo if supported, WhatsApp/mobile/email, emergency contact, multiple role selections, responsibility bullets, chef level where relevant, employment type/start date, salary amount/cadence/currency, status, private notes and optional login access.

**Actions:** list/filter/search, add, edit, deactivate, mark on leave/resigned, link an existing user by normalized WhatsApp, create/disable a staff login, export CSV and (where permitted) contact staff through a WhatsApp link. Deactivation must preserve historical reports. Hard deletion requires confirmation and audit logging.

**Role/data controls:** business type determines which job roles are available. `staff.view_salary` separately gates salary values; a user without this permission can see the staff member but must not see the amount. Driver roles feed the delivery-manager driver list.

**Current package gap:** the ZIP has a useful staff form/list, but its sample store uses a top-level `staff[]` array. The attached spec places staff in `business.modules.staff`. The integration must reconcile/migrate this once so the operator dashboard, onboarding, reports and driver roster do not see different staff records.

## 5.9 `delivery-manager.html` — delivery configuration and dispatch controls

**Primary purpose:** configure where a business delivers, how much delivery costs, when deliveries can be scheduled and who can be assigned as driver.

**Configuration:** delivery zones/areas, fee per zone or rule, slot/window definitions, capacity per slot, operating hours, immediate versus scheduled delivery, driver roster from staff with a driver role and active/available status. Allow edits with clear validation and visibility into disabled/full slots.

**Operational connection:** orders flagged for delivery flow from `order-manager.html` to dispatch. Assignment/reassignment updates the delivery record; the delivery view and order detail must agree on driver, delivery window, fee and status. Customers should only be offered valid zones/windows.

**Permissions:** owner/admin configuration; limited staff can view/dispatch only when permission allows. A driver must not edit platform delivery fees.

**Current package gap:** the page presents demo configuration and drivers. It must persist into shared business settings and delivery records, not just update the visible screen.

## 5.10 `order-manager.html` — business order queue

**Primary purpose:** the live work queue for each business to fulfill incoming customer orders. This is the operational center of restaurant/bottle store/food business fulfillment.

**Order states:** new/pending → accepted → preparing → ready → dispatched/delivered; cancellation must be explicit and preserve history. Normalize equivalent existing terms (`new`, `pending`, `delivered`, `cancelled`) rather than letting different pages treat them as unrelated statuses.

**Each order should show:** order reference; business ID; customer/contact; items, variants/modifiers and quantities; subtotal/discount/delivery fee/total; pickup/delivery/dine-in mode; address/window/driver when relevant; timestamp and status; any notes or special requirements.

**Actions:** accept, reject/cancel with reason, mark preparing, mark ready, dispatch/assign, mark delivered and open the order detail. Sending WhatsApp updates should open a prefilled `wa.me` link; do not pretend a message was sent automatically without an integration.

**Connections:** the customer order history, business analytics, disputes and delivery manager must refer to the same order ID. Every state transition should update the canonical record, create a notification where applicable, and emit an audit/analytics event.

**Current package gap:** sample orders exist in `eatouts_db_v2`; the main customer app also has a per-device/current-order key. The agent needs an explicit bridge/history model so checkout writes orders the manager can see and completion writes a durable order-history record.

## 5.11 `reservation-manager.html` — restaurant table bookings

**Primary purpose:** manage table booking requests and reservations for restaurants and eligible businesses.

**View:** calendar/list, date/time, guest name/contact, party size, table/area if assigned, deposit required/received, status, notes and source (manual/WhatsApp/customer booking when available).

**Actions:** create or edit a reservation; confirm, decline, cancel or mark seated/completed; record deposit status; contact the guest through a prefilled WhatsApp link. Prevent obviously invalid dates/times and show conflicts instead of silently double-booking a slot.

**Relationship:** restaurant onboarding’s reservation configuration defines booking rules/contact details. The manager’s reservation record uses that business ID. The operator workspace shows the same records; future customer booking flow can create requests into this queue.

**Current package gap:** demo reservation records are provided; confirm that the edits affect shared state and appear in all views.

## 5.12 `room-manager.html` — lodge inventory and housekeeping

**Primary purpose:** help lodge operators manage room types, individual rooms, nightly rates, availability and cleaning/maintenance state.

**Room fields:** room name/number, type, capacity, nightly rate, operational occupancy (`available`, `occupied`, `out of service`), housekeeping (`clean`, `needs service`, `cleaning`, `maintenance`) and notes. Availability and housekeeping are related but distinct: a clean room may still be reserved/occupied.

**Actions:** add/edit room, change rate, mark occupied/available, assign cleaning status, mark out of service. Room inventory is used by booking views and lodge analytics; conflicts must be visible before confirming a booking.

**Current package gap:** demo rooms and rates are seeded. The agent should model an availability calendar and avoid treating the room page as a static room list.

## 5.13 `review-manager.html` — business review response

**Primary purpose:** give a business a controlled view of ratings and written reviews so it can respond professionally and track reputation.

**View:** average rating, star-count breakdown, review list, customer, date, rating, written feedback, publish/moderation state and previous business response.

**Actions:** post/edit a public response, report/flag a review for platform moderation and filter by rating/date. A business cannot silently delete a customer’s review; a report/hide workflow should be permissioned and audited.

**Shared model:** customer review submission, profile history, business review manager and platform disputes/moderation must use one review ID and one review store (`eatouts_reviews_v1` in the spec or one documented equivalent).

**Current package gap:** example reviews are seeded, but a complete customer review submission workflow is not in the supplied set. Where it is not implemented, say so in the UI rather than presenting seeded demo reviews as live user reviews.

## 5.14 `billing-manager.html` — plan and invoice view

**Primary purpose:** let a business owner understand their plan, setup fee and invoices, and see which payments have been recorded.

**View:** plan/tier, fee amount, setup-fee state, invoice number/date/due date/amount/status, payment method/instructions, payment receipt notes and history.

**Actions:** review/upgrade/downgrade plan when allowed; open an invoice; request clarification; acknowledge an off-platform payment where appropriate. A business acknowledgement is not the same as platform confirmation—admin/ops must confirm payment before a publish gate is lifted.

**Connections:** the admin invoice list/settings and business billing screen must share one invoice. The setup-fee status used by business onboarding and the admin verification/publish gate must be the same field, not separate booleans.

**Current package gap:** invoices and tiers are demo data. Do not claim payment has been processed automatically; make clear that the current flow records manual/off-platform payment events.

## 5.15 `analytics-manager.html` — single-business analytics

**Primary purpose:** summarize a selected business’s operational performance from actual order, delivery, promotional and booking data.

**Useful metrics:** orders by day, completed/cancelled/open orders, order value logged, average order value, delivery volume, top items/categories, busy periods, promotion interactions and feedback totals. Offer 7/30/90 day filters where data supports it.

**Behavior:** derive metrics from the same source records used by order and delivery managers; distinguish order value/GMV logged from money actually collected. Empty data should display an honest empty state. Export CSV should match the current filters and must not export another business’s private records.

**Current package gap:** the page is a manager shell with aggregate/demo capabilities, not a connected analytics event warehouse. Add `EatoutsAnalytics` and mark unavailable/offline-only measurements clearly.

## 5.16 `quote-manager.html` — custom quotation workflow

**Primary purpose:** build and track quotes for caterers and suppliers whose prices depend on event requirements rather than a fixed retail basket.

**Quote fields:** quote ID, customer/contact, service/package, requested date/location, guest quantity, line items, quantities, unit/line prices, optional discount/tax/transport/deposit, total, expiry, notes, status and linked booking if accepted.

**Actions:** create/edit draft, calculate totals consistently, send/share quote via WhatsApp/email deep link, mark sent, revise, accept/decline/expire and convert accepted quote into a booking request. Preserve versions or at least change history; a changed total should never silently overwrite a previously sent quote.

**Connections:** caterer/supplier onboarding provides the service packages; `booking-manager.html` manages the accepted job; billing/reports refer to the same business and quote IDs.

**Current package gap:** quote management is a scaffold/demo flow; confirm create/edit/status changes persist in the shared store and can be opened from bookings.

## 5.17 `booking-manager.html` — supplier and lodge booking requests

**Primary purpose:** manage enquiries/requested bookings for supplier jobs and lodge stays. This is distinct from restaurant table reservations and from quotes, though records may be linked.

**View:** requester/contact, requested service/room, date(s), location or guests, budget/quote reference, status, outstanding questions, payment/deposit notes and business owner/staff assignment.

**Actions:** acknowledge, request information, accept, decline, propose new dates, link/create a quote, record deposit/payment acknowledgement and mark completed/cancelled. Every transition must be reflected in the customer/partner communication record where present.

**Connections:** supplier packages and lodge rooms; quote manager; room availability; business analytics; dispute handling. Avoid creating duplicate booking records when accepting a quote—link records by ID.

# Track C — Platform administration and operations

## 5.18 `eatouts_admin_dashboard.html` — platform control centre

**Primary purpose:** top-level administrative home for the platform owner/super-admin, not a business owner. It provides a concise status view and launches the other admin workspaces.

**Intended overview:** user and business counts; new signups; businesses pending verification/setup; orders and delivery activity; open feedback; unresolved disputes; outstanding invoices; blog status; headline analytics; “needs attention” tasks; recent audit activity.

**Navigation:** users manager, feedback manager, verification queue, disputes, platform analytics, notifications, blog editor and settings. The attached spec also wants tabs for users, businesses, venues, orders, deliveries, feedback, blog, invoices, analytics, locations, audit log and settings. Reuse the detailed manager pages rather than making a second version of each function in the dashboard.

**Permissions:** only the real super-admin sees the full console. A client-side guard is required for the prototype; backend authorization is required for production.

**Current package:** it displays summary counts and links to detailed managers. It is not yet the complete multi-tab command centre described by the spec. Extend it by composing shared tabs/components and preserve auditability.

## 5.19 `eatouts_users_manager.html` — platform user and role management

**Primary purpose:** platform-level directory for customer, business-owner, supplier, business-staff and platform-staff accounts. This is not the same as the business-level `staff-manager.html`.

**View/filter:** name, normalized WhatsApp (mask where appropriate), account kind, roles, linked businesses, status, created/last seen if tracked. Filter by business type, town, role and account status.

**Actions:** view account, change role through the central permission model, disable/restore, invite/create account for concierge setup, reset pilot credential, export CSV and link to the user’s business. Destructive operations require confirmation and audit events. “Impersonate” must be visibly read-only if offered and must not write to any record.

**Connections:** login resolves these users; business onboarding links owner IDs; staff manager links staff login IDs; role changes alter available navigation/actions immediately.

**Current package gap:** this is a separate platform user page, but the spec also describes a Users tab inside the full admin dashboard. Keep one reusable table/component so both contexts show consistent data.

## 5.20 `feedback_manager.html` — support ticket triage

**Primary purpose:** receive and work through customer feedback and business/internal issues. `eatouts_feedback.html` is the sender; this page is the staff inbox and resolver.

**Inbox:** ref/ticket ID, type (bug/feature/improvement/question/other), summary, full details, source, user/contact, related business/order, submitted date, status, age and assignee. Filters should cover status, type, source, staffer and date range.

**Ticket actions:** open details and screenshots/device snapshot; add internal note to the timeline; assign; change status (`new`, `in_progress`, `waiting_customer`, `resolved`, `closed`); add tags; send a prefilled WhatsApp reply; convert an idea into a blog draft; bulk-update/export when permissions allow.

**Data compatibility:** the spec names `eatouts_feedback_v2` and a migration from `eatouts_feedback_queue_v1`. The ZIP helper uses the aggregate DB’s `feedback` collection. Centralize migration once and then make sender/inbox read the same canonical ticket records. Keep the legacy key intact during migration.

**Privacy:** anonymous tickets cannot offer WhatsApp reply. A business issue should link to the relevant business by ID. Screenshots should be limited/compressed and rendered safely.

**Current package gap:** list, resolution action and WhatsApp deep link exist in starter form; assignment, detailed timeline, advanced filters, duplicates, data migration and role distinctions need completing.

## 5.21 `blog_creator_dashboard.html` — blog CMS

**Primary purpose:** create and maintain EatOuts editorial/news content independently from the public blog reader (`eatouts-blog.html`).

**Post list:** title, author, status, tags, date, search and row actions (edit, duplicate, archive, delete/soft-delete, copy public link). Editor has title, slug, subtitle, cover, author, tags, SEO metadata, body blocks, preview, save/publish/schedule and revision history.

**Block types requested by the spec:** heading, paragraph, image, video, gallery, link card, quote, callout, list, divider and super-admin-only raw embed. Each block requires stable ID and order. Escape/sanitize rendered content; never inject arbitrary raw HTML from ordinary staff.

**Publishing logic:** statuses `draft`, `scheduled`, `published`, `archived`; published reader sees published posts only. Since a static browser has no cron, a scheduled post should publish when the client next checks after its scheduled time, and the UI must describe that limitation. Slug collisions fall back to post ID.

**Current package gap:** the provided file is a lightweight content-management starting point. Complete the editor/API jointly with `js/eatouts-blog.js`; public rendering must share one schema and rendering function, including preview.

## 5.22 `eatouts_verification_queue.html` — business verification

**Primary purpose:** review submitted business records and decide whether they may be approved/published. Verification is different from basic onboarding completion and different from billing payment.

**Queue fields:** business, owner/contact, type, town/area, submitted date, documents/evidence, verification status, setup fee status, callback notes/log, assigned reviewer and decision reason.

**Actions:** open business profile; log a phone callback; approve, reject/request correction, or leave pending; attach a reason and reviewer/time; link to onboarding in admin mode. Do not approve merely because the page was opened or because a setup-fee field is true.

**Integration:** admin decisions update the canonical business status and audit log. Business onboarding’s publish gate must read the same status and setup-paid state. Customer discovery only shows businesses allowed by publish/status policy.

## 5.23 `eatouts_disputes.html` — order/booking issue resolution

**Primary purpose:** track serious order and booking problems, refunds/adjustments, missing items, delivery problems, cancellations and escalations across the platform.

**Record fields:** dispute ID, linked order/booking/business/customer, reason, evidence/notes, amount under review, assignee, status, dates, requested resolution and final decision.

**Actions:** open/assign, request evidence, add internal notes, escalate, resolve/refuse with reason, record a manual refund/credit decision, link to feedback/booking/order. A local prototype can record a decision but must not claim it processed an actual payment/refund.

**Connections:** order manager creates/opens the related order; feedback can be escalated to a dispute; business/customer histories display the outcome where appropriate; all status transitions are audited.

## 5.24 `eatouts_platform_analytics.html` — cross-platform reporting

**Primary purpose:** give super-admin/analyst a platform-wide view rather than one business’s performance.

**Metrics:** user/business growth, orders and delivery counts, total order value recorded, average order value, popular businesses/items/cuisines/towns, feedback/disputes and date trends over 7/30/90 days. Segment by business type, region and status where supported.

**Quality rules:** every number must derive from shared data/events; define how cancellations and test/demo records are treated; make “value recorded” distinct from received revenue; show unavailable/backend-dependent measurements as unavailable rather than fake zeros. CSV export should honor filters.

**Current package gap:** a simple analytics page exists, but the spec’s analytics-event store and deeper segmentation need implementing.

## 5.25 `eatouts_notifications.html` — platform/admin notifications

**Primary purpose:** compose system messages for targeted groups such as customers, business owners, a business type, a town, or staff roles. This is different from the personal notification inbox requested by the spec.

**Admin composer:** audience segment, title/body, type, optional in-app link, preview, publish/confirm and delivery history. Keep a record of who sent it, when, target definition and how many users were eligible. Do not claim push/SMS/WhatsApp delivery unless that integration exists; use “queued,” “created” or “opened WhatsApp” accurately.

**Integration with customer inbox:** the spec’s `eatouts-notifications.html` is also described as a user notification inbox (`eatouts_notifications_v1`). The generated file is platform admin segment messaging. Decide the distinction explicitly: retain this admin composer under its current route, and add a separate personal inbox/route/component for signed-in users if required. Never mix admin broadcast controls into the customer inbox.

## 5.26 `eatouts_settings.html` — platform configuration

**Primary purpose:** central editable source for platform-wide defaults, policies and integration settings.

**Settings expected:** currency and display formats; delivery/setup/service fees; default delivery zones; business types/module availability; role permission presets; WhatsApp/support numbers by purpose; publication/verification gates; feature flags; basic payment/invoice bank details; data export/import/reset controls.

**Dangerous actions:** full data reset, import/replace and destructive changes require explicit confirmation, backup/export first and clear preview. Reset should not happen from an accidental click. Admin changes need an audit event and should affect the relevant pages immediately.

**Connections:** billing, onboarding, delivery-manager, business-type catalogue, login/permissions and invoices should read the shared settings API, not their own hard-coded prices or zones.

# Track D — Customer pages

## 5.27 `eatouts_favourites.html` — customer saved items

**Primary purpose:** a personal saved-items area for businesses, promos, menu items, beverage items and gallery images. Customers can return to content without searching again.

**Behavior:** tabs/categories, item context (which business), thumbnail if available, open/view, remove, share, and “order again” for orderable items. Empty states should take the user back to discovery. A favourite ID must resolve against the current business/menu catalog and degrade gracefully if the target was deleted.

**Data:** one canonical `eatouts_favourites_v1` or equivalent logical collection. The public listing/item cards add/remove favourites through the same helper; this page is not a separate source.

**Current package gap:** the page exists with simple UI; connect all favourite interactions to the main app and scope private saved items to the signed-in user/device policy.

## 5.28 `eatouts_orders.html` — customer order history

**Primary purpose:** the customer’s historical record of orders, distinct from the live queue that businesses work from in `order-manager.html`.

**View:** timeline grouped by date/month; order ID, business, items, total, mode, state and date. Details show line items/variants/extras, delivery/address/recipient/fee and payment acknowledgement for off-platform payments.

**Actions:** open detail, reorder if the business/items still exist, share receipt via WhatsApp and open a support/feedback path for a problem. Do not delete historical order records just because the live business/item was removed.

**Connections:** checkout writes the order; business queue updates its state; history reflects those state changes from the same order ID. If the source app keeps `eatouts_order_v1` as the current checkout draft, preserve it as current-cart state and append completed orders into the canonical history collection.

**Current package gap:** history scaffolding is present; the real checkout-to-history bridge, itemized order snapshot and reliable reorder path need verifying.

## 5.29 `eatouts_profile.html` — customer account home/profile

**Primary purpose:** “my account” home, where customers manage their identity/contact details and navigate to saved addresses, history, favourites, notifications and feedback.

**Profile fields:** name, surname, DOB/age flag, gender, WhatsApp login, alternate contacts/email, saved location/address, preferences, notification settings and sign-out. Personal data must be scoped to the signed-in user, not whichever customer appears first in demo data.

**Navigation:** address book → `eatouts_addresses.html`; favourites → `eatouts_favourites.html`; order history → `eatouts_orders.html`; feedback → `eatouts_feedback.html`; sign-in/out → `eatouts_login.html`/`index.html`. The main app “You” tab or avatar should land here.

**Current package gap:** basic profile editing is available; connect full addresses, consent/settings, account export/deletion and navigation to all customer utilities.

## 5.30 `eatouts_addresses.html` — customer address book

**Primary purpose:** store delivery destinations so checkout can fill recipient/location details reliably.

**Address fields:** label (home/work/custom), district, town, area, street, plot/property type, directions/landmark, optional map link, recipient/contact and default flag. Support multiple addresses, create/edit/delete, mark default and prevent more than one default per account.

**Connections:** `customer-delivery.html` should use the chosen address to prefill its fields; user onboarding can seed a default address; profile shows a manageable list. The order must store a snapshot of the address used at checkout so later edits do not rewrite history.

**Current package gap:** the page exists as a manager scaffold. It must persist with the signed-in user and connect to the real delivery form.

# Track E — Existing HTML pages updated by the package

## 5.31 `restaurant-onboarding.html` — existing restaurant setup entry

**Purpose:** continue supporting the existing app’s restaurant onboarding URL while linking business identity and core setup to staff, beverages, delivery and menu management.

**Required behavior:** save fields into the same canonical business record; maintain compatibility with existing profile fields/sections; link to staff/menu/delivery modules; avoid hardcoded demo business IDs or sample default data becoming production records.

**Current package change:** a basic tabbed restaurant profile and links to staff, menu and delivery were added. The tabs should either work as actual modules or navigate to the canonical module—decorative/nonfunctional tabs are not acceptable in the integrated app.

## 5.32 `restaurant-dashboard.html` — existing restaurant dashboard

**Purpose:** preserve the established restaurant dashboard route while moving toward the unified operator experience.

**Required behavior:** business name and active business ID come from session/business switcher; KPI cards derive from real orders; links to order queue, delivery, staff, menu, reservations, reviews and billing use the same business context; staff see only authorized actions.

**Current package change:** it now calculates basic metrics from `EatoutsDB` and links to onboarding/menu. The integration must prevent it from becoming a separate restaurant-only data island. Prefer forwarding old routes to `operator-dashboard.html?biz=<id>` once the canonical operator workspace exists.

## 5.33 `eatouts_feedback.html` — user-facing feedback form

**Purpose:** let customers—and, where enabled, business staff—submit a report/idea that enters the same queue seen by `feedback_manager.html`.

**Required behavior:** collect type/subject/details, relevant business/order, contact permission/contact details, browser/device snapshot if supported and optional compressed screenshots; generate a durable ticket reference; show success with reference; show the signed-in user’s past tickets; avoid anonymous-only flows when the user is signed in. Submission creates a notification/audit/analytics event where appropriate.

**Migration requirement:** new feedback must use the canonical shared feedback helper/store. Legacy queue contents should migrate once and remain available for backup. The feedback manager’s status changes must be reflected when the user reopens “my past submissions.”

**Current package change:** ticket IDs and history support have been started, but the whole triage workflow and store migration need to be completed as one subsystem.

## 5.34 `menu-onboarding.html` — menu/product catalogue editor

**Purpose:** create/edit categories, items, prices, variants/modifiers, availability and image information for orderable catalog items. For bottle stores/bakeries the same underlying editor may present product catalog fields instead of restaurant dish/modifier fields.

**Required behavior:** create/edit/archive items; validate prices/required fields; manage modifiers/variants and extras where applicable; tie all items to `businessId`; update the public menu and order-manager’s item snapshots; preserve old order snapshots when a menu item changes or is removed.

**Current package change:** a simple category/item/price/modifiers input and local list are present using `eatouts_menu_items`. This separate key must be bridged/migrated to the business’s canonical `modules.menu` or product catalog. The page currently supports add/delete only; complete the modifier editor, item editing and cross-page persistence.

## 5.35 `eatouts-suppliers.html` — supplier directory/catalog

**Purpose:** public/customer or event-planner view of the supplier marketplace. This is not the same page as supplier onboarding: it helps users discover suppliers by category and open/contact a supplier.

**Required behavior:** pull supplier categories from `assets/data/supplier_catalog.js`; list only eligible published suppliers; filter by category/location/availability as appropriate; show the supplier profile/portfolio/services and CTA to request a quote or booking; use the same supplier/business IDs as onboarding and quote manager.

**Current package change:** the common catalog is extracted and this page has been pointed toward the shared taxonomy. Ensure there is no copied category array elsewhere in the event planner. A supplier should be searchable only after it passes the defined publication/verification gate.

## 6. Shared page behavior that makes the app feel seamless

Every page must:

1. Load the shared styles, database, auth and role helpers from the correct relative paths.
2. Identify the active user and active business centrally; never assume the first seeded user/business is the real one.
3. Respect `?biz=`, `?tab=`, `?id=`, `?type=`, `?new=1`, `?return=` and other documented deep-link parameters. Validate supplied IDs and permission before reading/writing.
4. Provide consistent headers, breadcrumbs/back links, loading/empty/error/success states, form validation, keyboard behavior, mobile layout, currency/date formatting and status labels.
5. Use one source of truth for records and a single helper to create/update them.
6. Log meaningful writes through the audit helper and important user actions through analytics.
7. Avoid XSS: escape user-entered values in HTML; do not insert unsanitized raw content into `innerHTML`; restrict raw blog embeds to the super-admin/editor permission.
8. Use a clear, explicit confirmation for destructive actions and export/backup before large migrations, resets or imports.
9. Show “demo/offline” or “not connected” where functionality relies on a backend, payment gateway, push system, real WhatsApp API or server scheduler that does not exist yet.
10. Keep historical order/quote/invoice/dispute records as snapshots. Editing the current business/menu should not rewrite old transactions.

## 7. Non-negotiable cross-page flows

### Customer journey

`index.html` → browse public listing/menu/promo → add to cart → checkout/`customer-delivery.html` → create order → order appears in the business queue and customer history → business changes status → customer history/notification reflects it → customer can reorder, favourite or send feedback.

### Business onboarding and operation

`get-started.html`/business signup → choose type → `business-onboarding.html` → autosave draft → complete required modules → setup fee/verification checks → publish → `operator-dashboard.html` → manage orders, delivery, staff, catalog, reservations/rooms, quotes/bookings → reports and billing reflect the same records.

### Staff journey

Owner/manager opens `staff-manager.html` → creates staff profile and optional login → staff signs in through universal login → auth resolves staff roles and permissions → staff sees only permitted operator tabs/actions → driver role appears in delivery assignment; disable/resignation prevents access but preserves old transactions.

### Platform support journey

Customer/staff submits `eatouts_feedback.html` → ticket appears in `feedback_manager.html` → assigned/updated/replied/resolved → submitter can see current status → issue can be linked to a dispute or turned into a blog/content idea → every status change is audited.

### Platform administration journey

Login → super-admin dashboard or restricted staff-admin → user/business verification, invoices, disputes, content and settings use the same records as the business/customer views. An admin-created/suspended/published business must be reflected everywhere without a manual second update.

## 8. Acceptance checklist for the integration agent

- [ ] All 35 supplied HTML pages and all required canonical pages/aliases load from the actual project root.
- [ ] All internal links and deep-link query parameters are valid; no broken underscore/hyphen route mismatches.
- [ ] The main customer `index.html` keeps working; existing public catalog/location data and current-order behavior are preserved.
- [ ] Existing `EatoutsDB`/`EatoutsAuth` APIs used by the current application remain compatible or are updated everywhere atomically.
- [ ] One normalized user identity and one session mechanism are used across every page.
- [ ] One active-business selection is used; cross-business records cannot leak into another business view.
- [ ] One canonical record per order, staff member, room, reservation, quote, booking, feedback ticket, review, invoice and notification.
- [ ] Legacy storage migration is idempotent, documented and non-destructive; it can be tested with old sample data.
- [ ] Page permissions are role- and action-specific, not just a hidden link.
- [ ] Every important write updates the correct store and audit/notification hooks.
- [ ] Empty data, malformed storage, deleted businesses/items, duplicate WhatsApp, inactive accounts and storage quota failures produce helpful states instead of crashes.
- [ ] No data is overwritten by demo seed data after a user has real local data.
- [ ] Orders completed in the main customer experience reach order-manager, analytics and customer order history with stable IDs and item/address snapshots.
- [ ] Business setup/publish uses one set of conditions for business identity, location, WhatsApp contact, verification and setup-fee status.
- [ ] Alcohol flags/age behavior are consistent in public promos, catalog, item detail and checkout.
- [ ] CSV/JSON exports and imports are tested where specified; destructive settings have confirmation/backup.
- [ ] Functional tests exercise the flows above—not only JavaScript syntax checks.

## 9. Final implementation caution

The ZIP’s JavaScript syntax was checked, but that does not prove every tab, route, data migration, permission, real checkout flow or cross-page workflow has been functionally tested. The VS Code agent should first inventory the live repository, then integrate in small, testable phases without replacing the main app or discarding existing logic.

# Track F — Additional canonical pages required by the attached specification

The following pages are explicitly described in `Pasted text(3).txt` but do not exist as distinct files in the delivered ZIP. They should be created or promoted from the current pages as part of the integration; do not overlook them just because a similarly named page exists.

## 5.36 `business-onboarding.html` — unified business setup wizard

**Purpose:** canonical type-aware onboarding and profile editor for every business type. This is the one business setup experience. It replaces repeated onboarding logic; the existing type-specific pages should call into it with a type parameter rather than each maintaining its own divergent business schema.

**Entry modes:** `business-onboarding.html` (resume a draft or choose a type); `?type=restaurant` (start new type); `?biz=<id>` (edit existing business); `?biz=<id>&admin=1` (authorized staff-assisted setup with admin-only controls).

**Common modules:** Identity; Location; Contacts; Socials; Hours; Amenities; Payments; Staff; Users/Roles; Menu/Product Catalog; Beverage; Promos; Events; Gallery; Billing; Review & Publish. Optional modules include Character/Menu tags/Capacity/Reservations/Reservation services/Rooms/Schedule/Services/Portfolio according to business type.

**Type rules:** restaurant has menu, beverage, promos/events, reservations and dining-related sections; bottle store has Product Catalog and alcohol-flagged Beverages; caterer has service packages/quotes and event handling; lodge has Rooms/housekeeping and bookings; bakery has product catalog; food truck has weekly Schedule; supplier has Services and Portfolio. Use `assets/data/business_types.js` as the only source for these module sets.

**Draft and save behavior:** autosave a draft into the shared store on a safe debounce, recover/offer resume on reopen and persist module slices without rewriting unrelated modules on each keystroke. A type change must not delete hidden data; warn when modules with existing content will become hidden.

**Publish gate:** apply all required checks in one function: business identity/name, location/town, at least one WhatsApp-enabled contact, setup fee confirmed and any verification requirements defined by the platform. For food trucks, additionally require at least one confirmed weekly schedule entry. Owners cannot bypass admin-only changes such as ownership transfer or changing the type of a live business.

**Done when:** every type presents the correct modules; drafts resume; type changes preserve data; the published business record is the same record read by the operator/public listing; the publish checklist explains each unmet condition.

## 5.37 `operator-dashboard.html` — canonical dashboard for every business

**Purpose:** operational counterpart to onboarding. Onboarding creates/configures the business; the operator dashboard runs it day to day. It should replace the restaurant-only dashboard as the canonical business workspace while maintaining compatibility with `restaurant-dashboard.html`.

**Routing and context:** `operator-dashboard.html?biz=<id>&tab=orders`; if no `biz` parameter, resolve the business from the signed-in user's memberships; if there is more than one, show a business switcher. Validate membership and permissions before rendering the business data.

**Role-based tabs:** Overview, Orders, Deliveries, Menu/Catalog, Beverages, Promos, Events, Reservations, Rooms, Schedule, Gallery, Staff, Users & Roles, Reviews, Reports, Billing and Settings. Each business type only sees applicable tabs, and each user's roles further restrict the result. A driver with only delivery access should land on Deliveries; read-only roles show a clear read-only banner and no write controls.

**Overview:** business/type, orders today, order value logged, pending orders, active deliveries, upcoming events, unread feedback, and actionable alerts (old unaccepted orders, unassigned delivery, unpaid setup fee, missing content).

**Operational behavior:** order list links into/uses the same actions as `order-manager.html`; delivery operations share state with `delivery-manager.html`; menu/promos/gallery/staff should reuse their editor modules; lodge rooms and food-truck schedules appear only for relevant businesses. Reports are scoped to the active business; exports respect that scope.

**Settings/danger actions:** profile/settings route back into the canonical onboarding editor; publish/unpublish follows the same gate; ownership transfer/deletion require elevated permission, confirmation and audit record.

**Done when:** a business user cannot see another business’s records by changing the URL; modules reflect business type and role; every action updates shared records; multi-business switching works.

## 5.38 `eatouts-staff-admin.html` — restricted admin workspace

**Purpose:** a thinner administrative portal for staff who are not super-admins. It prevents a support agent or content editor from seeing finance/settings just because they can access one admin tool.

**Tabs by role:**

- `staff_content`: Blog, read-only Feedback, read-only Analytics.
- `staff_ops`: Venues, Invoices, Deliveries, Feedback and Analytics according to assigned permissions.
- `staff_support`: Feedback, read-only Orders and Deliveries.
- `moderator`: Content Flags, read-only Blog and Feedback.

If a staff member has several platform roles, show the union of permitted tabs and actions. If zero tabs are allowed, show “Contact your admin.” If promoted to super-admin, link to the full admin console.

**Implementation approach:** share tab renderers/components with `eatouts_admin_dashboard.html` through a module such as `js/eatouts-admin-tabs.js`. Do not copy/paste the admin dashboard and then try to remove tabs after the fact. Both page access and individual action handlers must check permissions.

**Done when:** forbidden deep-links do not show private content; readonly roles have no write controls; role changes immediately change available navigation/actions.

## 5.39 `food-truck-schedule.html` — weekly rotating location schedule

**Purpose:** represent a food truck’s recurring weekly rotation because the truck does not have one permanent customer-facing address.

**Schedule view:** seven days Monday–Sunday with location (district/town/area/plot/landmark), start/end time, status (`confirmed`, `tentative`, `cancelled`), notes and actions to edit, duplicate to another day, cancel or remove an entry.

**Edit-day form:** reuse the canonical location selector; allow start/end time, backup/alternate location, notes and status. Provide a prominent “Live right now” toggle for the current day. Add one-off date substitutions that override only the matching date and never mutate the weekly recurring template.

**Data:** store under the food truck’s canonical business record, e.g. `modules.schedule.weekly` and `modules.schedule.substitutions`. Keep a stable business ID and audit all edits.

**Public behavior:** `index.html` should show today’s location and hours; a live badge appears only while the active day is live. If no schedule exists, say “Schedule coming soon.” A cancelled day should not appear in the public results. If `liveNow` is older than 12 hours, treat it as false. Use Botswana local `HH:MM` values without UTC conversion for time-of-day comparisons.

**Done when:** weekly entries and one-day exceptions work; the public discovery experience displays the correct location for today; editing the schedule updates that same listing.

## 5.40 Canonical customer profile, order-history and favourites routes

The spec’s `eatouts-user-profile.html`, `eatouts-user-orders.html` and `eatouts-user-favourites.html` should be canonical routes with the supplied `eatouts_profile.html`, `eatouts_orders.html` and `eatouts_favourites.html` preserved as aliases or compatibility entry points.

- **`eatouts-user-profile.html`:** the customer’s “You” home with overview, Orders, Favourites, Reviews (clearly marked future if no review subsystem), Feedback, Addresses and Settings. Only show the current session user’s records; never fetch “the first customer.” Mixed-role users can switch between Customer View and Business View. Signed-out view offers login/signup. Account export and soft-delete/sign-out must be handled carefully.
- **`eatouts-user-orders.html`:** full order timeline grouped by month, order detail sheet with item/variant/extra snapshots, delivery details, off-platform payment acknowledgement, reorder and WhatsApp receipt share. Missing businesses/items remain visible in history; unavailable items are disabled for reorder.
- **`eatouts-user-favourites.html`:** filter All / Businesses / Promos / Menu items / Beverage items / Gallery. Each item links to its current business/item; removal updates the shared favourites store immediately without full-page reload. Deleted targets should be shown as unavailable or safely omitted without corrupting the store.

These canonical pages can share the same underlying renderer and record model. Do not duplicate customer history or favorites between old and new routes.
