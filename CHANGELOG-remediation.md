# Remediation changelog (audit A–G → execution)

Each entry is one atomic commit, verified against the file as it existed at edit time.

## Commit 1 — Security: role-scope the Quotes / Bookings tabs

- **File:** `operator-dashboard1.html`
- **Lines changed:** 16 (added `isCommercialOwner`), 18 (tab predicates for `quotes`, `bookings`)
- **Before:** `['quotes','Quotes',()=>type==='supplier'||type==='caterer']` and `['bookings','Bookings',()=>type==='supplier'||type==='lodge']` — gated by business type only, so any staff role on a supplier/caterer/lodge workspace (e.g. `staff`, `driver`, `cashier`, `host`, `housekeeping`) could open the commercial tabs.
- **After:** both tabs require an owner-level role (`isOwner` → `biz_owner`/`biz_admin`/`owner`/`admin` or `biz.ownerId`/`biz.ownerUserId` match) or the `supplier`/`lodge_owner` roles, **and** the type gate. Platform roles (`platform_admin`, `super_admin`, `platform_ops`, `platform_analyst`) keep their existing full access.
- **Role strings confirmed** against `js/eatouts-roles.js` `MATRIX` (LEGACY + FINE): owner-level = `biz_owner`, `biz_admin`, `owner`, `admin`; commercial = `supplier`, `lodge_owner`. `caterer_owner` / `supplier_owner` do not exist anywhere in the repo, so they are not referenced.
- **Verification:** inline script extracted and `node --check` → SYNTAX OK; `node tests/run-all.js` → same two pre-existing failures as HEAD (`inventory.js`, `login.js`), no new failures.

## Commit 2 — Delete the fabricated analytics on the restaurant dashboard

- **File:** `restaurant-dashboard.html`
- **Removed:** `deriveAnalytics()` (was :108–143) — the `Math.sin()` seeded pseudo-random "engagement" generator, and its `ANALYTICS SIMULATION` header comment.
- **Added:** `localCounts()` — counts of records actually saved on the device (`menuItems`, `promos`, `events`, `galleryImages`).
- **Replaced:** "This month" stat grid with hard-coded `+18% / +24% / +11% / +31% vs last month` → one honest card: "Local records only — not yet connected to customer events…". "Today" stat grid, "Top menu items" fake view bars and the "WhatsApp activity" table → one "Performance" card showing only the real record counts. Billing "Your month at a glance" → "Your records at a glance" with real counts and no "Eatouts helped generate N customer actions" claim.
- **Also removed (same defect, same file):** the `(40+len*7)%260 views` promo counter and `(30+len*11)%220 views` event counter — both fabricated from the title length.
- **Reports:** `reportData/reportHTML/reportCSV/downloadReport/printReport/showReport` now take a `counts` object; report rows are Menu items / Promos / Events / Gallery images plus an explicit note that views, WhatsApp clicks and order volume are not recorded yet. The "Top menu items" and "WhatsApp action types" report tables (derived from the fake data) are gone.
- **Verification:** grep for `deriveAnalytics`, `profileViews`, `menuViews`, `promoInteractions`, `eventInteractions`, `menuBreakdown`, `whatsappTypes`, `vs last month`, `${A.` → zero hits; `node --check` → SYNTAX OK; `node tests/dashboard.js` → "DASHBOARD TEST PASSED" (jsdom boot, no window errors, export + pricing checks green).

## Commit 3 — Stop pretending (analytics manager + type dashboards)

- **`analytics-manager.html`:** subtitle `"Real aggregates from orders, promos and deliveries"` → `"Orders saved in this workspace — stage timings are not recorded yet"`. The three static Performance timeline items (`New → accepted` / `Preparing → ready` / `Ready → delivered` with "Acceptance SLA", "Kitchen preparation time", "Dispatch/delivery time") are **removed** and replaced by one line: "Acceptance, kitchen-preparation and dispatch timings are not recorded yet, so no SLA timings are shown." Chose option (b) — removal — after checking the order schema: orders carry a single `created` string plus `status` (`assets/data/demo/the-food-place/orders.js`), with no accepted/ready/delivered timestamps, so no SLA can be computed.
- **`dashboards/eatouts-{bakery,bottle-store,caterer,event-supplier,mobile-kitchen,restaurant}-dashboard.html`:** the literal `X of 3 free days used this month` is replaced with real promo data — `Math.min(freeDaysUsed,3) + ' of 3 free promo-days used this month · N promo(s)'`, where `freeDaysUsed` sums `activeDays` (falling back to `days`, min 1) over promos with no `feeCharged`. Matches `INCLUDED_PROMO_DAYS_PER_MONTH = 3` in `js/eatouts-promo-rules.js:41`.
- **`dashboards/eatouts-restaurant-dashboard.html`:** fixed the dead render path — `renderPromos()` targeted `#promosSection`, which did not exist in the markup (the other five dashboards already had it). Added `<div id="promosSection"></div>` inside `<main class="scroll">`.
- **Verification:** `Select-String` for `X of 3` across `dashboards/*.html` → 0 hits; `freeDaysUsed` present in all six; `node --check` on all seven files' inline scripts → SYNTAX OK; `analytics-manager.html` grep for `Real aggregates|Acceptance SLA|Kitchen preparation time|Dispatch/delivery time` → 0 hits.

## Commit 4 — Track every WhatsApp hand-off

- **`index.html:3726`** — `waLink(text,venue)` → `waLink(text,venue,template,context,venueId)`; logs `EatoutsAnalytics.track("wa.click",{template,venueId,context})` **before** returning the `wa.me` URL. Wrapped in `try{}catch{}` so a missing analytics module can never block navigation. `venueId` prefers the explicit override (needed where the venue argument is only a phone string), then `venue.id || venue.slug`.
- **`index.html:885`** — added `<script src="js/eatouts-analytics.js"></script>` (the module was **not** loaded on the customer site before this commit; only one page — `js/eatouts-manager.js:135` — ever called `track`).
- **All 15 call sites now pass a template id:** `site_enquiry` (footer social slot), `promo_booking` (`act=waPromo`), `bottle_store_enquiry`, `poetry_reservation`, `featured_event_enquiry`, `event_enquiry`, `venue_booking`, `promo_enquiry`, `venue_about`, `catering_enquiry`, `bakery_enquiry`, `beverage_order`, `order_split_bill`, `order_checkout`, `about_enquiry`.
- **Verification:** `Select-String` for `waLink(` → 16 refs = 1 definition + 15 call sites, every call now carries a template argument (no 2-arg calls remain); inline script extracted → `node --check` SYNTAX OK; `node tests/run-all.js` → same 2 pre-existing failures, no new ones.



## Commit 5 — Send WhatsApp orders into the store the operator reads

- **Problem:** `eatouts_order_v1` was only a hand-off draft for `customer-delivery.html`. The operator workspaces read `eatouts_manager_v1.orders` (canonical) and merge `eatouts_order_v1_history` on top (`operator-dashboard1.html:26`), so a WhatsApp order left the customer site as a draft and never reached the business.
- **`index.html:3973`** — `bridgeBusinessId(rid)` maps the customer-side venue (`restaurant.id`/slug) to the manager business id via `businessId = b.restaurantId || b.slug` match; falls back to the first `type:"restaurant"` business, then to the raw id.
- **`index.html:3993`** — `bridgeDraftOrder(source)` builds one order (`id:"EO-"+draft.savedAt`, `businessId`, `customer` from the checkout name, item lines with size/qty, `total` = subtotal + delivery fee, `status:"new"`, `created` in local wall-clock `YYYY-MM-DD HH:MM`, `delivery`, `source:"whatsapp"`, `restaurantId`, `restaurant{...}`, `meta{subtotal,deliveryFee,notes}`), unshifts it into `eatouts_manager_v1.orders` **and** `eatouts_order_v1_history`, deduped by id in both, then refreshes an already-loaded `EatoutsMgrDB` instance (it caches its state at boot and would otherwise overwrite the order on its next `save()`). `clearOrder()` runs only after both writes land; the whole body is wrapped in `try{}catch{}` so a bad store can never block the WhatsApp hand-off.
- **Wired at both hand-offs:** split bill `index.html:9552`, checkout `index.html:9574` — both call `bridgeDraftOrder("menu")` before `notifyFieldOrder()`/`waLink()`.
- **Verification:** jsdom boot of `index.html` with every local `<script src>` inlined, a restaurant business in `eatouts_manager_v1`, and a saved draft → 12/12 checks pass: bridge returns `true`; exactly one canonical order with `businessId:"biz-restaurant"`; total `115` (100 + 15 delivery); same id in both stores; draft cleared; duplicate send does not duplicate the order; a fresh boot of `js/eatouts-manager-db.js` over the resulting store lists the order (what the operator page sees); no window errors.
- **Not covered:** the runtime browser click-through (place a real order in the UI). The bridge itself is verified; WhatsApp navigation is unchanged.

