# Paste-ready VS Code AI Agent Prompt — Integrate the EatOuts HTML Modules

You are working inside the existing EatOuts application repository. I have added a package containing 35 HTML pages (30 new pages plus five existing pages updated), shared JS files, a shared manager CSS file and supplier catalog data. I have also supplied a build specification (`Pasted text(3).txt`) and a detailed guide (`EatOuts_HTML_Function_Guide.md`).

## Mission

Integrate every supplied module into the **existing EatOuts app as one seamless, coherent, mobile-first application**. Do not merely make pages link to one another. Make them share one identity/session model, one business context, one data-access layer, common permission checks, consistent UI, a reliable navigation system and shared order/business/user records.

The build spec is the target product behavior. The generated package is starter code. Do not assume that a file is complete just because it exists or passed syntax checking.

## Phase 0 — Inspect before editing (mandatory)

1. Inventory the whole repository. Read `index.html`, existing JavaScript modules, CSS files, customer checkout/delivery flows, listing/venue/catalog data, all 35 supplied pages, and `EATOUTS_BUILD_NOTES.md`.
2. Produce a short `INTEGRATION_AUDIT.md` before refactoring. Include: file tree; current page entry points; all direct `localStorage` reads/writes; all `EatoutsDB` and `EatoutsAuth` methods called; all hard-coded demo IDs/credentials; broken/missing links; duplicated stores; and a table mapping old route names to canonical names.
3. Do not overwrite the main app or delete existing logic until you can explain what uses it. Use small commits/change groups and retain working fallbacks.
4. Confirm whether the repository already has implementations of utilities mentioned in the spec (locations, image compression, upload, video validation, owner compatibility, business type data, analytics and audit). Reuse and extend them; do not create duplicate competing helpers.

## Phase 1 — Resolve routes and names

The spec’s preferred names differ from several filenames in the supplied ZIP. Use one canonical route per purpose and preserve old routes as thin compatibility aliases where existing pages may link to them. Keep query parameters and hash fragments when redirecting.

Required target routes from the spec include:

- `eatouts-login.html` (compatible with supplied `eatouts_login.html`)
- `eatouts-user-onboarding.html` (compatible with `eatouts_user_onboarding.html`)
- `eatouts-user-profile.html` (compatible with supplied `eatouts_profile.html`)
- `eatouts-user-orders.html` (compatible with supplied `eatouts_orders.html`)
- `eatouts-user-favourites.html` (compatible with supplied `eatouts_favourites.html`)
- `business-onboarding.html` (canonical unified business type-aware wizard)
- `operator-dashboard.html` (canonical workspace for all business types)
- `eatouts-staff-admin.html` (restricted platform staff workspace; create if missing)
- `food-truck-schedule.html` (weekly food truck rotation; create if missing)

The following supplied pages should remain functional and route into the canonical experience without duplicating entire forms/dashboards: `restaurant-onboarding.html`, `restaurant-dashboard.html`, `bottle-store-onboarding.html`, `caterer-onboarding.html`, `lodge-onboarding.html`, `supplier-onboarding.html`.

Update every internal link systematically. Do not leave a mixture of hyphen/underscore routes that only works from some pages. Support `?biz=`, `?tab=`, `?id=`, `?type=`, `?new=1`, `?day=`, `?since=` and safe `?return=` deep links where documented.

## Phase 2 — One data model; no competing stores

The package’s `js/eatouts-db.js` uses `eatouts_db_v2` as an aggregate store with collections such as users, businesses, staff, orders, reservations, rooms, reviews, feedback, quotes, bookings, notifications, favourites, addresses, invoices, verification, disputes and settings. The notes also name separate versioned keys such as `eatouts_users_v1`, `eatouts_order_v1_history`, `eatouts_delivery_orders_v1`, `eatouts_feedback_v2`, `eatouts_blog_posts_v1`, `eatouts_analytics_events_v1` and `eatouts_audit_log_v1`. The existing `index.html` also uses its own current-order key (`eatouts_order_v1`) and calls shared DB/auth APIs.

Do not let each page decide on its own which key is authoritative. Implement a documented storage compatibility layer:

1. Inventory the existing keys and their schemas first.
2. Choose one canonical logical record per entity and one central API for CRUD.
3. Add an idempotent migration for legacy keys, with a migration marker. Do not delete old keys during the first migration. Offer/export a backup before destructive transformations.
4. Normalize legacy fields, business IDs, user IDs, timestamps and status names while preserving original transaction snapshots.
5. Do not re-seed demo data over existing user data. Seed demo records only when the relevant store is genuinely empty or in explicit demo mode.
6. Emit a shared `eatouts:db-saved`/equivalent event so views refresh when data changes.
7. Keep the main app’s current checkout/cart behavior intact. Treat `eatouts_order_v1` as the current/in-progress order if that is what the existing app uses; completed orders must be appended to durable order history and linked to the live business queue.

Do not perform partial dual-writes to two unrelated schemas unless a central adapter guarantees consistency and documents why. No page may write a private array that other pages cannot read.

## Phase 3 — One auth/session and compatible shared APIs

Centralize identity in `js/eatouts-auth.js`. Preserve all APIs already used by the app. Check the live repository carefully: `index.html` calls `EatoutsAuth.login`, `EatoutsAuth.loginDemo` and uses `EatoutsAuth.secureContextAvailable()`; it also uses `EatoutsDB.KEY` and `EatoutsDB.resolveContent(...)`. Do not remove or change those APIs without updating every caller atomically.

Support a one-time migration from legacy `eatouts_active_session_v2` to the specification’s preferred `eatouts_auth_session_v1` or document the selected canonical session key. From then on, every page reads/writes session only through `EatoutsAuth`.

Required account routing:

- super-admin → `eatouts_admin_dashboard.html`
- restricted platform staff/moderator → `eatouts-staff-admin.html`
- business user → `operator-dashboard.html?biz=<authorized-business-id>`
- customer → `index.html`; expose the profile through the “You”/account entry point
- new customer → customer onboarding, then return to `index.html` or safe `?return=` destination
- new business owner → preserve chosen type through signup/login and open `business-onboarding.html?type=<type>`

A multi-business user needs an active-business selector. Validate every `biz` ID against that user’s memberships before showing data or allowing a write.

The ZIP demo accounts use PIN `1234`; the written spec mentions placeholder password `0`. Keep existing demos working while centralizing credential handling and making it clear that local PIN logic is demo-only. Never pretend client-side localStorage auth is production-grade security.

## Phase 4 — Permissions and role-aware navigation

Build/extend `js/eatouts-roles.js` and `assets/data/business_types.js` as the single source of truth for business type, visible modules, role options and permission presets. Include all spec business types: restaurant, bottlestore, caterer, lodge, bakery, foodtruck and supplier.

At minimum, support platform roles (`super_admin`, `staff_content`, `staff_ops`, `staff_support`, `moderator`, `platform_analyst`/author where needed), business roles (`owner`, `admin`, `manager`, staff/driver and type-specific jobs), supplier/lodge owner behavior and customer self-service permissions.

Check permissions at two levels:

- page/tab level: do not render unauthorized private views;
- action level: re-check permission inside each event handler before writing.

Examples of fine-grained permissions include `users.view/edit/delete`, `businesses.view/approve/suspend`, `orders.view/fulfil`, `deliveries.view/dispatch`, `staff.view/edit/create_login/delete/view_salary`, `feedback.view/respond/delete`, `blog.view/edit/publish/delete`, `finance.view/edit`, `analytics.view`, and `settings.view/edit`.

Restricted staff admin must reuse the same components/data as the super-admin dashboard, but show only allowed tabs and actions. Read-only tabs should hide write controls, not just disable them. Read-only impersonation must carry a visible banner and block all writes.

## Phase 5 — Common UI, audit, analytics and locations

1. Extract common helpers to `js/eatouts-ui.js` or make the existing `js/eatouts-manager.js` a compatibility facade that delegates to one set of helpers. Avoid two definitions of `esc`, `money`, `fmt`, `toast`, modal/sheet or form rendering logic.
2. Add `js/eatouts-audit.js` with a central helper. Every high-impact business/admin write should log actor, action, target, timestamp and useful before/after snapshots. Do not allow the UI to edit/delete the audit log.
3. Add `js/eatouts-analytics.js` to track meaningful events and build dashboards from real records. Do not hard-code sample counts as if they were live analytics. Clearly mark offline-only/unavailable backend metrics.
4. Add or reuse `js/eatouts-locations.js` and Botswana’s canonical district → town → area data. Use the same picker for onboarding, profiles, delivery addresses, food truck schedules and filtering.
5. Use the shared supplier taxonomy from `assets/data/supplier_catalog.js`; remove duplicated category arrays from the event planner or suppliers page.
6. Preserve the existing EatOuts branding and mobile/portrait layout. Maintain accessible labels, focus states, sensible keyboard behavior and responsive desktop layouts where useful.

## Phase 6 — Integrate each workflow end to end

### Customer

`index.html` discovery → menu/product/beverage item → checkout/delivery → canonical order record → business `order-manager.html` → business status update → customer order history + notification → reorder/share/feedback. Favourite actions on public cards must update the same store displayed on the favourites page. Address book defaults must prefill checkout. Never replace historical line items or the address snapshot when catalog/profile information changes.

### Business onboarding

`eatouts_business_signup.html` → choose business type → canonical `business-onboarding.html` → modular type-specific sections → autosaved draft → review/publish checklist → verification/setup-fee gate → publish → `operator-dashboard.html?biz=<id>`. Draft autosave must not rewrite the entire business record on every keypress. A type change must hide/show modules without deleting hidden data and should warn if modules with data will become hidden.

Business modules by type must follow the supplied spec: restaurants have menu/beverages/promos/events/reservations; bottle stores have product catalog and alcohol-flagged beverages; caterers have service packages/quotes/events; lodges have rooms/housekeeping/bookings; food trucks have schedules/live-now status; suppliers have service packages and portfolio; bakeries have product catalog.

### Business operations

The unified operator dashboard should offer role-gated tabs for Overview, Orders, Deliveries, Menu/Catalog, Beverages, Promos, Events, Reservations, Rooms, Schedule, Gallery, Staff, Users & Roles, Reviews, Reports, Billing and Settings, but only show applicable modules for a business type. Reuse manager components instead of implementing a separate copy of each subsystem. Existing manager pages can remain direct deep links.

### Platform operations

Admin dashboard → users/businesses/verification/orders/deliveries/feedback/blog/invoices/analytics/locations/audit/settings. The restricted staff dashboard reuses these shared components with tighter permission sets. Feedback submitted on the customer page must be visible in the feedback manager and customer profile. Business verification/setup fee status must control public publication in one consistent place. Disputes must link to the canonical order/booking.

## Phase 7 — Complete the supplied pages

Treat the following as required module responsibilities. Do not skip one because a similar page exists under a different filename.

### Auth/customer onboarding

- `eatouts_user_onboarding.html`: customer identity, DOB/age flag, WhatsApp login, contacts, location, delivery defaults, optional preferences, terms, duplicate number guard, return URL.
- `eatouts_login.html`: universal WhatsApp/PIN login, demo accounts, session detection, role-based redirect and return URL.
- `eatouts_business_signup.html`: all business types, preserves selected type across login, routes to unified onboarding.
- `bottle-store-onboarding.html`, `caterer-onboarding.html`, `lodge-onboarding.html`, `supplier-onboarding.html`: type-specific wrappers into the canonical business onboarding modules.

### Business management

- `staff-manager.html`: central staff CRUD, roles by type, optional login creation/linking, salary privacy permission, historical statuses, driver roster integration.
- `delivery-manager.html`: zones/fees/windows/slot capacity/driver roster and dispatch data shared with order manager.
- `order-manager.html`: canonical live state queue with explicit valid status transitions, order details, assignment/dispatch and notifications/audit.
- `reservation-manager.html`: guests/date/time/party/deposit/status linked to same business.
- `room-manager.html`: room inventory, price, availability and housekeeping; distinct statuses.
- `review-manager.html`: review list and replies/flags using one shared review schema.
- `billing-manager.html`: plan/setup fee/invoices/manual payment acknowledgement; admin confirmation remains separate.
- `analytics-manager.html`: real business-scoped metrics and filtered exports.
- `quote-manager.html`: quote drafts/versions/status transitions and conversion to linked booking.
- `booking-manager.html`: lodge/supplier booking requests linked to rooms/services/quotes and disputes.

### Platform admin

- `eatouts_admin_dashboard.html`: overview and navigation into the complete platform control centre.
- `eatouts_users_manager.html`: platform-level users/roles/status/membership; must not be confused with business staff management.
- `feedback_manager.html`: ticket triage, internal notes, assignment, statuses, duplicate hints, WhatsApp reply and feedback-store migration.
- `blog_creator_dashboard.html`: post CRUD, blocks, metadata, preview, publish/schedule, revisions, and shared renderer with the public blog.
- `eatouts_verification_queue.html`: review evidence/callback log/approve or request changes; controls canonical verification state.
- `eatouts_disputes.html`: order/booking dispute assignment, evidence, decisions and audit history.
- `eatouts_platform_analytics.html`: cross-platform metrics based on shared records/events.
- `eatouts_notifications.html`: implement/administer targeted broadcasts separately from any user personal inbox; record queued/created state honestly.
- `eatouts_settings.html`: platform settings, business catalogue/permission presets, fees, zones, contacts, flags, backup/export/import/reset confirmations.

### Customer utilities

- `eatouts_favourites.html`: all saved businesses/promos/menu/beverage/gallery items and remove/open/share actions.
- `eatouts_orders.html`: historical order timeline/detail/reorder/WhatsApp receipt; records remain visible even if items/businesses were removed.
- `eatouts_profile.html`: self profile, preferences, notifications, sign-out, links to addresses/favourites/orders/feedback.
- `eatouts_addresses.html`: address book; one default per user; checkout prefill; order snapshots.

### Existing pages to preserve and integrate

- `restaurant-onboarding.html`: keep compatible with existing entry links while forwarding/reusing canonical onboarding sections.
- `restaurant-dashboard.html`: preserve existing URLs but use or redirect to the canonical operator dashboard.
- `eatouts_feedback.html`: write tickets to the same canonical store read by `feedback_manager.html` and show status history.
- `menu-onboarding.html`: complete item/modifier CRUD and connect to business catalog/public catalog/order snapshots; avoid isolated `eatouts_menu_items` as a second source.
- `eatouts-suppliers.html`: shared catalog, published supplier discovery, service/portfolio details, quote/booking CTA.

## Phase 8 — Error handling, safety of data and user experience

- Empty/malformed storage must show empty states, never crash the page.
- Do not wipe data when storage is missing; do not seed over non-empty user data.
- Normalize phone numbers for matching but preserve a readable formatted value for display.
- Every write should validate IDs, types, required fields and permissions.
- Escape text inserted into HTML. Avoid inline handlers with user data and unsafe raw HTML. Restrict raw blog embeds.
- Paginate large admin tables (50 records per page is a reasonable first step). Do not render thousands of rows at once.
- Use explicit confirmation plus audit logging for delete, disable, transfer ownership, reset, import and publish/unpublish decisions.
- When external integrations are not configured, use honest local fallback behavior: WhatsApp deep links open a message composer; no claim of message sent; no fake payment, push notification or server-side scheduled publish.
- All money must use the configured currency and all business data must use a verified business context.

## Phase 9 — Test the system, not just syntax

Create an `INTEGRATION_TEST_PLAN.md` and execute tests in the browser. At minimum, verify:

1. Customer can create account, sign out/in, navigate to profile, save address/favourite and submit feedback.
2. Customer checkout writes an order that appears for the correct business and in customer order history.
3. Business order-status transitions update all views and create the appropriate notifications/audit events.
4. Restaurant owner cannot view another business’s private data by changing `?biz=`.
5. Owner can add a staff member; staff account can sign in and sees only allowed modules; salary is hidden if no salary permission.
6. Bottle-store alcohol items are flagged and age restrictions are consistent in discovery and checkout.
7. Onboarding draft resumes; type switch does not delete data; publish/verification/setup-fee gate matches spec.
8. Food-truck recurring schedule updates public “today” location and stale `liveNow` becomes false after 12 hours.
9. Lodge room/housekeeping statuses and booking conflicts are represented correctly.
10. Feedback submission appears in triage and changes are visible to the submitter.
11. Blog editor preview matches public reader, and only published posts are public.
12. Admin role can access platform controls; staff roles cannot open disallowed tabs/actions.
13. Legacy key migrations run exactly once and preserve a backup; reload does not duplicate records.
14. Current main `index.html` features still work, especially existing DB content resolution, login/demo login, insecure-context checks and current-order behavior.
15. CSV/JSON export/import, empty states, malformed JSON, deleted targets and storage failures are handled.

Run available HTML/JS syntax checks after changes, but do not use syntax success as the final test. Report which browser tests passed, failed or could not be exercised.

## Working method and final response

- Work in phases; do not rewrite all 35 pages in a single blind pass.
- Preserve existing visual design and actual project conventions wherever they work.
- Keep the original `index.html` and valuable current features intact.
- Create a short `INTEGRATION_DECISIONS.md` documenting canonical routes, storage choice/migrations, role/permission strategy, demo credentials and intentionally deferred backend-only functions.
- If a requirement cannot be finished with the local/offline architecture, implement a clear, graceful local placeholder and document the limitation rather than pretending the integration exists.
- When finished, list changed/created files, canonical route map, data migration behavior, completed workflows, functional test results and remaining work.

Begin with Phase 0 and inspect the repository before modifying source files.
