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
