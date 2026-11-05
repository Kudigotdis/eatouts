# AGENT CHANGE LOG

This file is the source of truth for all agent-initiated changes. Every time an agent makes modifications, it MUST append an entry here. This log is committed to git so memory survives across sessions/agents.

## Format
```
### [YYYY-MM-DD HH:MM:SS] - [Agent: <agent-name>] - [Status: IN_PROGRESS|COMMITTED|FAILED|SKIPPED]
- Task: <short description>
- Files changed: <comma-separated or list>
- Commit: <sha or "PENDING">
- Push: <sha/ref or "PENDING" or "FAILED">
- Notes: <reasoning>
- Errors: <exact error if any>
```

---

---
### [2026-11-05 15:05:47] - [Agent: opencode] - [Status: COMMITTED]
- Task: Add the Botswana Halaal certification badge, tap-through explanation popup, and Halaal search filter for the certified venue list.
- Files changed:
  - `js/eatouts-brand.js`: shared `isHalaalVenue()` / `halaalBadgeHtml()` helpers, static certification prefixes, URL-safe `HALAAL_LOGO`, badge CSS, and public exports.
  - `index.html`: venue-menu `.restcard` badge, restaurants-pager open-row badge, `venue-about`-independent Halaal popup via the card-alert system, and close/dismiss support.
  - `venue-about.html`: status-line badge immediately before the open/closed text, Halaal popup with logo/message/CTA/Dismiss, and a scoped top-right X for that popup.
  - `search_screen.html`: `Halaal` filter chip, `halaalOnly` state, brand-row certification flag, filtered results, and `?halaal=1` deep-link handling.
  - `tests/halaal.js` (NEW, 40 checks): shared helper, all three badge placements, popup contents/close paths, open-row visibility, and the runtime `?halaal=1` deep link.
  - `tests/search-screen.js`: Halaal helper/filter coverage.
  - `tests/run-all.js`: registers `halaal.js`.
  - `assets/halaal-logos/Botswana_Halaal_Logo.jpg` (NEW): URL-safe copy of the supplied logo.
  - `assets/halaal logos/Botswana_Halaal_Logo.jpg` (NEW): original supplied asset retained at its exact path.
- Commit: `575427b`
- Push: `origin/main @ 575427b`
- Deployment: `https://9545966a.eatouts.pages.dev`
- Verified:
  - `node tests/halaal.js` -> **HALAAL TEST PASSED** (40 checks).
  - `node tests/search-screen.js` -> **SEARCH SCREEN TEST PASSED**.
  - `npm test` -> **77 passed, 0 failed**.
  - `npm run build` -> succeeded; `dist/assets/halaal-logos/Botswana_Halaal_Logo.jpg` is present at 53,365 bytes.
  - `npx wrangler pages deploy dist` -> succeeded, uploaded 3 changed files, deployment `9545966a`.
  - Production asset `https://www.eatouts.site/assets/halaal-logos/Botswana_Halaal_Logo.jpg` -> **200**, `image/jpeg`, 53,365 bytes.
  - Production `index.html` -> 200 and contains `openHalaalPopup` + the Halaal logo path.
  - Production `search_screen.html` -> 200 and contains `data-halaal-toggle` + the `?halaal=1` reader.
  - Production `venue-about.html?link=kfc` -> 200 and contains `halaal-pop-cta` + `id="halaalBadge"`.
- Notes:
  - Certification is a static list keyed by brand/name/slug prefixes; branch slugs such as `kfc-maun`, `chicken-licken-station`, and `nando-s-phakalane` match.
  - **Assumption to confirm:** directory records `Ashoka Palace` / `Ashoka Palace Restaurant` are treated as `DF 50 Ashoka Restaurant`, and `The Downstairs` as `Downstairs BW`. Remove those aliases if the names refer to different businesses.
  - Badge scope follows the request exactly: venue-menu card only (not venue-menu-item), restaurants-pager only while the accordion row is open, and venue-about immediately before the status text.
  - No D1, admin, or dependency changes.
- Errors: none.

---
### [2026-11-05 14:13:55] - [Agent: opencode] - [Status: COMMITTED]
- Task: Production rollout for the venue-interest feature: apply the pending remote D1 migrations and deploy the pushed build to Cloudflare Pages.
- Files changed:
  - `docs/AGENT_CHANGE_LOG.md`: this entry.
- Commit: `c168e61` (deployed HEAD)
- Push: `origin/main @ c168e61`
- Verified:
  - `npm run db:migrate` → applied four pending remote migrations: `0015_canonical_business_types.sql`, `0016_region.sql`, `0017_venue_interest.sql`, `0018_admin_access.sql`.
  - Remote `PRAGMA table_info(restaurants)` confirms `participating`, `claimed`, `status`, `region`; remote `PRAGMA table_info(venue_interest)` confirms `venue_id`, `venue_status`, `person_key`, `user_type`, `browser_json`, `at`.
  - First deploy attempt (`npm run deploy`) compiled and uploaded to 2786/2864 files, then failed with `Failed to upload files. Please try again. Error: {})`; the Wrangler log shows `fetch failed` / `ECONNRESET`.
  - Retry with `npx wrangler pages deploy dist` succeeded: **Uploaded 78 files (2786 already uploaded)**, deployment `https://5795499e.eatouts.pages.dev`.
  - Production smoke checks: `https://www.eatouts.site/` → 200; `/eatouts-platform-analytics.html` → 200 and contains `Venue interest` + `/api/venue-interest`; home page contains `showInterestNotice`.
  - `POST https://www.eatouts.site/api/venue-interest` with a non-existent venue → 404 `{"ok":false,"error":"venue_not_found"}` (no row inserted); unauthenticated `GET` → 401.
- Notes:
  - Remote migration applied three additional pending migrations (`0015`, `0016`, `0018`) alongside `0017`; this also validates the Milestone A `0018_admin_access.sql` remote apply.
  - `copy-static.mjs` copies the whole `assets/` folder, so the untracked `assets/halaal logos/` folder was included in `dist/` and the Pages deployment. It remains untracked in git.
  - The deployed code includes the venue-interest checkout popups and the admin report; the production endpoint and page checks passed.
  - A real-browser click-through of the checkout/admin UI was not performed; the earlier jsdom flow/admin checks remain the UI verification.
- Errors: first deploy attempt failed with `Failed to upload files ... ECONNRESET`; retried successfully.

---
### [2026-11-05 13:40:45] - [Agent: cline] - [Status: COMMITTED]
- Task: Milestone A of the locked A→B→C→D access-control roadmap — the revocable admin exception for the Zimbabwe-based operator (Phase 3), built on a shared `_security.js` that Stages 4–7 will import in Milestone B.
- Files changed:
  - `migrations/0018_admin_access.sql` (NEW): `admin_devices`, `admin_audit`, `denial_log`, `canary_tokens` — every statement `CREATE … IF NOT EXISTS` so the file is re-runnable; indexes on device hash, audit time/action, denial time/rule/country, canary kind.
  - `functions/api/_security.js` (NEW): `signToken` / `verifyToken` (`v1.<b64url payload>.<b64url HMAC-SHA256>`), `readCookie` / `cookie` / `jsonWithCookies`, `deny()`, `geo`, `uaFamily`, `deviceId`, `sha256Hex`, `adminGate`, `adminConfigured`, `verifyAdminCredentials`, `readEpoch` / `bumpEpoch`, `rememberDevice`, `audit`, `logDenial`, `DATACENTER_ASNS`. Reuses `hashPassword`/`safeEqual`/`toHex`/`PBKDF2_ITER` from `_auth.js` and `isProduction`/`clientIp`/`uid` from `_shared.js` — no new crypto, no new dependency.
  - `functions/api/admin/login.js` (NEW): `POST /api/admin/login` — 503 when unconfigured, KV rate limit 6/15 min per IP, PBKDF2 verify, mints the 30-day bypass cookie + the 365-day device cookie, records the device row and an `admin_login` audit row, returns `route: eatouts-admin-dashboard.html`.
  - `functions/api/admin/session.js` (NEW): `GET /api/admin/session` → `{ user, expires, epoch, device }`; 403 through the same generic denial for every failure; 405 on POST.
  - `functions/api/admin/revoke-all.js` (NEW): `POST /api/admin/revoke-all` — admin-gated, bumps `admin:epoch`, stamps `admin_devices.revoked_at`, clears both cookies, writes `admin_revoke_all`.
  - `functions/api/admin/logout.js` (NEW): `POST /api/admin/logout` — always 200, clears both cookies, audits as anonymous when the cookie no longer verifies.
  - `scripts/hash-admin-password.mjs` (NEW): PBKDF2-SHA256 600k (OWASP 2023), 16-byte salt, prints only `600000:<saltHex>:<hashHex>` on stdout (hint text on stderr), rejects passphrases under 12 characters, never echoes the password.
  - `tests/security-admin.js` (NEW, 89 checks): token crypto, cookie parsing/attributes, device binding, `adminGate`, credentials, all four endpoints, rate limiting, `denial_log` privacy, migration + script contracts.
  - `tests/run-all.js`: registers `security-admin.js`.
  - `_headers`: `X-Robots-Tag: noindex, nofollow` + `Cache-Control: no-store` on `/api/admin/*`.
  - `docs/ACCESS-CONTROL-PLAN.md` (NEW): Phase 0 findings, the 7-stage pipeline, Milestone A detail, Milestones B/C/D, fail-closed matrix, privacy stance, verification, DoD, rollback.
- Commit: `0f345a2`
- Push: `9e4272d..8fcf7c2  main -> main`
- Verified:
  - `node tests/security-admin.js` → **SECURITY-ADMIN PASSED (89 checks)**
  - `npm test` (`node tests/run-all.js`) → **76 passed, 0 failed** (75 before + this suite)
  - `node scripts/hash-admin-password.mjs 'test-passphrase-123'` → 104-char `600000:<32 hex>:<64 hex>`; that exact line verified through the runtime `verifyAdminCredentials` → `roundtrip-good=true wrong-password=false`
  - `npx wrangler pages functions build --outdir=.tmp-functions-build` → **Compiled Worker successfully** (build dir deleted afterwards)
- Not verified:
  - `npx wrangler d1 migrations apply eatouts --remote` — needs D1 credentials; the local apply was **not** run either because it rewrites the local D1 state used by other suites
  - The three Pages secrets and the `curl.exe` smoke tests in `docs/ACCESS-CONTROL-PLAN.md` §7 — need a deployed build
  - The Stage 0 edge WAF rule — a dashboard action, scheduled for Milestone B
- Notes:
  - The bypass is a signed cookie, not an IP allow-list: the operator's ZW ISP uses dynamic CGNAT and the client IP is not stable behind the edge. `dev` binds the token to `sha256("adm-dev:" + browser|platform)`, so a browser version bump does not lock the operator out.
  - Global revocation is one KV counter (`admin:epoch`) compared inside `adminGate`, so it needs no DB read on the hot path and works on any Pages plan — which is why the plan-tier check (D1) is deferred to Milestone D.
  - Every failure path returns the same `Forbidden` 403 with no country, ASN, rule or reason, and `denial_log` stores only salted SHA-256 hashes of IP/UA (same stance as `0017_venue_interest.sql`).
  - Nothing is gated yet: this milestone only builds the exception. The actual gate (`functions/_middleware.js` + dropping `/*.html` from the `_routes.json` excludes) is Milestone B, and the 728 KB `assets/data/*` payload stays scrapeable until Milestone C.
  - Deliberately did **not** add a new admin HTML page: every root page needs a `scripts/html_catalog.meta.json` entry, a `<!-- PAGE: -->` banner, `data-page` and a `copy-static.mjs` line, so the login UI ships with the dashboard wiring in Milestone B.
- Errors: none

---


### [2026-11-05 12:27:58] - [Agent: opencode] - [Status: COMMITTED]
- Task: Redesign venue checkout WhatsApp hand-off for non-participating venues and add the admin venue-interest report.
- Files changed:
  - `index.html`: removed the checkout contact field and contact validation/message line; added the 20-message notice bank and 19-message nudge bank (emoji-free, shuffle-bag random, no immediate repeat); added `isParticipatingVenue()`, `logVenueInterest()`, `showInterestNotice()`, `showInterestNudge()`, coarse browser metadata and a stable hashed visitor id; `waSendVenue` now checks participation, logs interest and shows the two sequential popups for non-participating venues, while participating venues keep the direct venue-number send; the final non-participating send uses `waShareLink()` (WhatsApp contact picker); `renderCardAlert()` gained `noDismiss` and `dismissAct`.
  - `migrations/0017_venue_interest.sql` (NEW): adds `restaurants.participating`, creates `venue_interest`, and adds venue/person/time indexes.
  - `functions/api/venue-interest.js` (NEW): public `POST` (hashed person key, server-derived signed-in demographics, coarse browser metadata, rate limit), admin `GET` aggregate (distinct people, taps, repeats, users/browsers, gender/age/town/area, browser buckets, first/last, today/7-day), and admin `PATCH` participation toggle.
  - `functions/api/_business.js`: `restaurantOut()` exposes `participating`.
  - `js/eatouts-content.js`: `profileFrom()` carries `claimed`/`participating`; `applyVenue()` syncs `claimed`, `participating` and `status` before its empty-content and operator-fork early returns.
  - `eatouts-platform-analytics.html`: new "Venue interest" accordion section with totals, per-venue people/taps/repeats/demographics/browser signals/first-last, a participation toggle, a copyable outreach pitch, server-report fallback to local analytics labelled "This device only", and progress-count update.
  - `tests/venue-interest.js` (NEW, 55 checks): copy/wiring, privacy, aggregate math, POST/GET/PATCH, `restaurantOut`, and jsdom flag-sync coverage.
  - `tests/run-all.js`: registers `venue-interest.js`.
  - `docs/AGENT_CHANGE_LOG.md`: this entry.
- Commit: `5f72342`
- Push: `origin/main` (`ca39dcf..5f72342`)
- Verified: `node tests/venue-interest.js` -> 55 checks passed; `npm test` -> 75 suites passed, 0 failed; `npm run db:migrate:local` -> `0017_venue_interest.sql` applied (7 commands); `PRAGMA table_info(restaurants)` and `PRAGMA table_info(venue_interest)` confirm the new column/table; inline-script syntax checks for `index.html` and `eatouts-platform-analytics.html` -> 0 errors.
- Notes:
  - Participation = `claimed` OR admin `participating` OR `status = 'claimed'`; `published` alone does not suppress the popups.
  - Server stores no IP, raw UA, name, phone, email or raw DOB. The IP is used only for the KV rate limit.
  - Remote D1 migration is not applied yet: `npm run db:migrate` is the human step after this commit/push.
  - The admin report falls back to this device's local events when no server admin session is present; participation writes are disabled in that mode.
- Errors: none

---
### [2026-11-05 02:34:44] - [Agent: cline] - [Status: COMMITTED]
- Task: search_screen.html - stop a chain filling the results with one row per branch (KFC showed 13 "KFC" rows); a result row is now one BRAND, and the card's Town / Area rows became real branch pickers (same contract as the Restaurants tab card)
- Files changed:
  - `search_screen.html`:
    - `buildIndex()`: the directory's branch records are folded with `EatoutsBridge.brandKeyOf()` into one row per brand before `pushRestaurantBrand()` builds it, so KFC 13 -> 1, Nando's 14 -> 1, Chicken Licken 11 -> 1, Steers 8 -> 1; 568 directory records -> 477 brand rows; index 827 -> 735 rows
    - `pushRestaurantBrand(out, key, branches)`: reuses `pushRestaurant()` for the row shape, then adds `brandKey` / `branches` / `branch` / `towns` / `areas`, a "Fast Food · 13 places" subtitle for chains (single-branch rows keep the old "town · area" line), a WhatsApp number (display branch first, else any branch) and aggregated search text (every branch's name, type, town and area, so "maun" and "kfc francistown" still find the brand)
    - `brandKeyOfRecord()`, `branchTown()`, `branchArea()`, `defaultBranch()`, `activeBranch()`: display branch = the record owning the brand slug, else `EatoutsBridge.primaryBranch()` (Gaborone-first) - the same default the Restaurants tab card uses
    - `passesLocation()` / `townOptions()` / `areaOptions()`: match ANY branch, so the town filter still lists Maun and the area filter still lists a single branch's neighbourhood
    - the panel's Town / Area rows (`pickLine()`, `areaLineLabel()`): `aria-haspopup="listbox"` + `data-act="openLocPicker"`, town = active branch's town, area = its neighbourhood or "N locations" when that town holds several (mirrors index.html's `restaurantOptions()`)
    - `openLocPicker()` / `branchOptions()` / `pickBranch()`: reuse the filter-popup shell (`#popup` + `#popup-scrim` + `.popup-scroll`); the town axis lists every town the chain trades in with a branch count pill (`.opt-count`, new CSS), the area axis lists the branches inside the active town with the town as `.opt-sub`; the pick is stored in `state.branchOf[data-id]`, so it is per-row and survives re-render
    - `activeSlug()`: menu / promos / about / WhatsApp now resolve through `activeBranch()`, so picking Maun opens `index.html#kfc-maun/menu`; `favRef()` keys a brand row on `brandKey`; Escape closes the picker; a town / area filter change clears the picks
    - `pushCatering()` id is now `catering-<slug>` and `buildIndex()` drops any row whose id is already taken (a few catering businesses are listed twice under one slug - LLwapa Gaborone/Bobonong), so a row id is unique again
  - `tests/search-screen.js`: KFC assertions moved to the brand contract (one row, "13 places", `maun` / `kfc francistown` still find it), new section C2 (chain collapse + no duplicate ids), new section D3 (town / area pickers: option lists, counts, `.on` marker, Maun pick -> `#kfc-maun/menu`, Escape, Nando's area pick -> `#<riverwalk-slug>/menu|promos`), `optLabel()` helper, "one card open" test now uses a multi-brand query, town filter asserts Maun. 90 checks.
- Commit: `27ee58c`
- Push: `a671169..b5c30f1  main -> main`
- Verified: `npm test` -> `74 passed, 0 failed` (every suite, including `=== search-screen.js ===` ... `SEARCH SCREEN TEST PASSED`, 90 checks); jsdom reports no runtime errors on the page
- Notes:
  - Promo / event rows are now indexed from the brand's display branch only (they used to be one row per branch, which multiplied the same promos); the card's Promos action still targets the picked branch.
  - The picker keeps the "disabled stays tappable" behaviour of the directory card (an area row with no listing is still clickable, it just has nothing to offer yet).
  - Not verified: how the 13-town list scrolls inside the popup on a real phone (jsdom does not lay out); the CSS reuses `.popup-scroll`, the same list the town filter uses.
- Errors: none

---
### [2026-11-04 23:33:50] - [Agent: cline] - [Status: COMMITTED]
- Task: commit the previously-untracked flag asset sets so the header region button renders on a fresh clone (user approved with "push them")
- Files changed:
  - `assets/flags-square-rounded/` (NEW, 262 SVGs, ≈382.8 KB): every flag file, all `-text`-free plain SVG, LF endings
  - `assets/flags-circlular/` (NEW, 262 SVGs, ≈394.3 KB): the typo'd circular set, tracked as-is — no rename, no deletion, since the folder name is not referenced by any code path
- Commit: `2a4a9a6`
- Push: `dab7b55..542ea0f  main -> main`
- Verified: `git status --short` showed exactly 524 additions and nothing else before commit · `Test-Path` confirmed all 8 registry flags (`botswana-bw`, `south-africa-za`, `zimbabwe-zw`, `malawi-mw`, `kenya-ke`, `nigeria-ng`, `ghana-gh`, `mauritius-mu`) resolve inside `assets/flags-square-rounded/` · `git check-ignore` returned "NOT ignored" for both folders · sample SVG inspected: 636 bytes, 0 CRLF pairs, so `core.autocrlf=true` normalizes to an identical blob
- Notes:
  - Closes the open item flagged in the `21:24:56` entry — `search_screen.html:626` builds `assets/flags-square-rounded/<flag>.svg` for `#regionBtn`, and `tests/region-selector.js` asserts the file exists, so the folder had to be tracked.
  - No code, test, HTML or CSS file was touched; this is an assets-only diff.
  - Not verified: rendering of the 262 flags in a browser (jsdom-based tests do not decode SVG) — spot-checked only that the 8 registry files exist.
- Errors: none

---
### [2026-11-04 21:24:56] - [Agent: cline] - [Status: IN_PROGRESS]
- Task: T22 follow-up + search UX — region flag button, result-row accordion cards, photo-preview lightbox on search_screen.html; house dark nav bar + correctly sized brand mark on EatOuts-Region.html; registry grown to 8 regions
- Files changed:
  - `js/eatouts-regions.js`: added NG (NGN ₦), GH (GHS ₵), MU (MUR ₨) as inactive regions and a `flag` base name on all 8 (the square-flag file in `assets/flags-square-rounded/<flag>.svg`); `SYMBOLS` gained the three currencies
  - `EatOuts-Region.html`: `.brand-mark` is now `height:34px;width:auto;aspect-ratio:1172/504` (≈79.06×34, no more stretched logo); the old `.appnav`/`.nav-x` bar was replaced with the house `#nav` (background `#0a0a0a`, 23px / 1.9-stroke icons, `.nav-btn.on` glow) and 5 `data-tab` buttons that route to `index.html#<tab>`, with `about` lit
  - `search_screen.html`: new `.region-btn` (40px) in `#hdr` → renders the active region's square flag (`#regionBtn`, `renderRegionButton()`) and opens `EatOuts-Region.html`; each result is now a `.ritem` card = `.result` row + `.acc-wrap`/`.acc-in` panel (panel lives OUTSIDE the `<button>` to avoid invalid interactive nesting) holding two `.ropt` actions; row tap toggles the panel (`toggleResult()` / `syncResultAccordions()`, one open at a time, `aria-expanded`, `#results.has-open` dims the rest, `scroll-margin-top:36px` keeps the sticky count bar off the pinned card); primary action is type-aware (`primaryLabel()`: View menu / View promos / View venue) and routed through the existing `openResult()`, second action is "About this venue" → `openAbout()` → `venue-about.html?link=<slug>`; thumbnails are 90px and carry `data-src`, so tapping one opens the `.preview-layer` lightbox (X, outside tap, Escape) via `openPreview()`/`closePreview()` in `#previewHost`; Escape now unwinds preview → filter popup → open card
  - `tests/region-selector.js` (51 checks): expects eight regions in registry order, `#nav .nav-btn` `data-tab` list, computed 34px brand mark + dark `#nav` bar, and a guard that every region's `flag` resolves to a real `assets/flags-square-rounded/*.svg`
  - `tests/search-screen.js` (45 checks): row is a card that toggles instead of navigating, `aria-expanded`, list dimming, one-open-at-a-time, tap-again/Escape close, both panel actions, type-aware label, 90px thumb computed size, preview open/close (X / outside tap / Escape) and "every preview thumb wraps a real image", header region button flag + route
  - `PAGE_INVENTORY.md`: refreshed the `search_screen.html` (691→861) and `EatOuts-Region.html` (204→216) row counts and the "five regions" description
- Commit: `e2a3aa4`
- Push: `74064bd..6a7973b  main -> main`
- Verified: `node tests/search-screen.js` PASSED (45 checks) · `node tests/region-selector.js` PASSED (51 checks) · `npm test` PASSED (74 suites, 0 failed) · `npm run inventory` PASSED (10 checks, 91 warnings)
- Notes:
  - `assets/flags-square-rounded/` (262 SVGs) is still UNTRACKED. The header button and the new registry guard depend on it, so it must be committed for the flag to render on a fresh clone — left out here because adding 262 files is a separate, much larger diff than this task. Ask before committing it.
  - The accordion does not use `position:sticky`, so the open card is scrolled to the top but may scroll away again; the directory pages' pin behaviour was not copied to keep the diff small.
  - Preview only applies to rows with a real logo (`data-src`); letter tiles stay inert by design.
- Errors: none

---
---
### [2026-11-03 16:10:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 steps 5 + 7 — device-only gallery (swipe strip, tap to enlarge) and the step-6 contact rework (Botswana town picker, area/peak-season removed, equal-width chips)
- Files changed:
  - `eatouts-suppliers.html`: `+ Add image URL` button and `editImage()` sheet deleted; new `pickGalleryImage()` → `EatoutsUpload.pickImage()`; gallery renders as `.gal-strip` (scroll-snap, 46% cells) with `viewGalleryPhoto` → `viewPhoto()`; town input → `.field-btn` + `pickTown()` using `EatoutsLocations.allTowns()`; `openPickList()` gained optional `opts.search`; `location.area` + `availability.peakSeason` removed from renderer and defaults; `.chips` → 3-col grid with centred `.chip`
  - `tests/supplier-gallery-contact.js` (NEW, 36 checks): no URL input left, picker-driven add, strip + snap CSS, tap-to-enlarge, remove, town popup fed by `botswana_locations.js` (486 towns) with working search, town+district write-back, area/peak-season gone, chips grid, draft round-trip
  - `tests/run-all.js`: registers the new suite after `supplier-pricing.js`
  - `PLATFORM UPDATE TASKS.md`: T18 marked COMPLETE; steps 5 and 7 closed with their evidence; stale file pointers fixed
- Commit: `de10518`
- Push: `b41a920..de10518  main -> main`
- Verified: `node tests/supplier-gallery-contact.js` PASSED (36 checks) · `node tests/run-all.js` PASSED (73 suites, 0 failed) · `npm run inventory` PASSED (10 checks, 92 warnings = baseline)
- Notes:
  - Search is opt-in (`{search:true}`) rather than automatic, so the Y/M/D popups on step 1 that share `openPickList()` are untouched — a 486-item list needs a filter, a 31-item day list does not.
  - `location.area` and `availability.peakSeason` are dropped from the defaults, not migrated: nothing else in the repo reads either key, and no saved profile is rewritten.
  - Gallery captions still render but are no longer editable — the brief asked for add/remove/swipe only, and the caption input only existed inside the deleted URL sheet.
  - Not verified on hardware: popup height on short phones and the swipe feel need a real-device pass (jsdom has no layout engine).
- Errors: none

### [2026-11-03 21:55:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 3 (final half) — account-only listing + Step 1 prefill, plus a permanent identity test
- Files changed:
  - `eatouts-suppliers.html`: new `prefillFromAccount()` (signed-in profile, else most recent profile on device → first/last name, photo, `dob`/`birth`/`age`) called from the `newProfile` branch; `publishChecks()` gained a second warn requiring the account holder's first + last name
  - `tests/supplier-identity.js` (NEW, 33 checks): device photo/logo pickers, Y/M/D popups incl. leap years + day clamping, derived age + draft autosave, account prefill, both publish gates
  - `tests/run-all.js`: registers the new suite after `supplier-activate.js`
  - `PLATFORM UPDATE TASKS.md`: step 3 closed with the interpretation stated
- Commit: `10221d2`
- Push: `71a71e7..10221d2  main -> main`
- Notes:
  - "Account-only" was the one ambiguous line in the brief, so it was interpreted against what the page actually has: there is no auth backend (D6 already recorded that decision), only a local profile store + session + PIN. Hence "account-only" = the listing carries the account holder's identity (enforced at publish) and Step 1 opens prefilled from the account on this device. Recorded in the task doc rather than silently assumed.
  - Prefill copies only personal fields — never the business, services, pricing or gallery — so a second listing cannot inherit a previous business by accident.
  - No new dependency: the test uses the `jsdom` copy already vendored at `tests/node_modules`.
- Verified: `node tests/supplier-identity.js` PASSED (33 checks) · `node tests/supplier-activate.js` PASSED (22 checks) · `node tests/smoke.js` PASSED · `npm run inventory` PASSED (10 checks, 92 warnings = baseline).

---

### [2026-11-03 21:15:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 3 (age picker) — mandatory 3-column Year / Month / Day picker with floating scroll-list popups
- Files changed:
  - `eatouts-suppliers.html`: removed the `owner.age` number input; added `MONTHS`, `pad2`, `dobParts`, `daysInMonth`, `ageFromDob`, `birthParts`, `setDobPart`, `ageCol`, `pickAgePart`, `openPickList`; new `.age-row` / `.age-col` / `.pick-list` / `.pick-item` CSS; `owner` default gained `dob` + `birth {y,m,d}`; `pickAge` act branch; `publishChecks()` now warns when no date of birth is on file
  - `PLATFORM UPDATE TASKS.md`: step 3 age-picker half ticked with the verified behaviour
- Commit: `0bceed5`
- Push: `362c320..0bceed5  main -> main`
- Notes:
  - Built the popup on the page's existing `.scrim`/`.sheet` (`openSheet`) instead of porting the event builder's `.fpop` — one modal system, no new CSS layer, still floats above the form and scrolls inside `.sheet-body` (`overflow-y:auto`, `max-height:80dvh`).
  - First cut stored the partial date inside `owner.dob` and reset it whenever the three parts were incomplete, which silently discarded every pick (the harness caught it: columns stayed `—`, `dob` empty). Fixed by keeping partials in `owner.birth` and only writing `owner.dob` + `owner.age` once all three are set — no sentinel strings like `0000-00-00` in saved records.
  - Age is derived, never typed: `ageFromDob` adjusts for the month/day not yet reached this year, so a 1992-04-30 birth is 33 on 2026-11-03 and 34 after 30 April 2027.
  - Legacy tolerance: a profile saved with only `owner.age` still renders its age in the hint; the columns simply show `—` until the user picks, at which point `dob` becomes authoritative.
- Verified: `node tests/supplier-activate.js` PASSED · `node tests/smoke.js` PASSED · `node tests/appshell.js` PASSED · `npm run inventory` PASSED (10 checks, 92 warnings = baseline) · jsdom harness 22/22 checks: year popup = 73 entries (18..90), month = 12, Feb 1990 = 28 days, Feb 1992 = 29 days, Jan = 31 days, 31 Jan → Apr clamps to 30, `owner.dob = '1992-04-30'` + derived age persisted to the draft.

---

### [2026-11-03 20:40:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 3 (pickers half) — device upload for the profile photo and business logo, headshot URL field removed
- Files changed:
  - `eatouts-suppliers.html`: added `js/eatouts-image-compressor.js` + `js/eatouts-upload.js`; new `.photo-pick` / `.logo-pick` CSS; `renderIdentity()` now opens on a 150×150 rounded square photo picker and a 56px logo row instead of two URL inputs; `owner.headshot` → `owner.photo` with an `o.headshot` read fallback; new `pickDeviceImage(path,label)` helper + `pickPhoto` / `pickLogo` branches in the click router
  - `tests/supplier-activate.js`: fixture key `headshot` → `photo` (record shape moved)
  - `PLATFORM UPDATE TASKS.md`: step 3 annotated (pickers done, age picker + prefill still open)
- Commit: `200982c`
- Push: `5b01157..200982c  main -> main`
- Notes:
  - Reused the existing app-wide upload layer instead of a bespoke `<input type=file>`: `EatoutsUpload.pickImage()` already compresses, tries `/api/upload`, and falls back to a data URL offline, so the supplier page behaves like the five onboarding pages. No new dependency, no new abstraction.
  - Kept the legacy `o.headshot` fallback rather than migrating: a supplier who typed a URL under the old field keeps their picture, and the dead key is ignored forever if unused.
  - Autosave is on the page's existing 2s timer, so a freshly picked image reaches `eatouts_supplier_draft_v1` two seconds later — confirmed, not assumed.
  - Not touched: the review/preview/public card still show `business.logo` only; the owner photo has no consumer on those screens (it did not before either).
- Verified: `node tests/supplier-activate.js` PASSED · `node tests/smoke.js` PASSED · `node tests/appshell.js` PASSED · jsdom harness (temp) 15/15 checks — pickers rendered, `pickImage` invoked once per tap, re-render swaps the emoji for the picked image, caption flips to `Change photo`, `owner.photo` + `business.logo` land in the draft.

---

### [2026-11-03 20:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 8 — remove `.foot` and the whole export/JSON feature from `eatouts-suppliers.html`
- Files changed:
  - `eatouts-suppliers.html` (+1/-40): deleted the `.supplier-card .foot` markup block and its two CSS rules, the review-step `Export profile JSON` section (title + hint + button + trailing divider), the dashboard `Export profile JSON` manage action, the `act === 'exportProfile'` branch, `exportProfile()`, `downloadPayload()` and the "Profiles export as JSON for the directory" header comment (rewritten to say profiles sync on publish). `slugify()` was kept — `publish` still mints the public slug with it.
  - `PLATFORM UPDATE TASKS.md`: step 8 ticked with the scan result, T18 header status line updated
  - `HTML_PAGES.md`: page line count corrected 1737 → 1652
- Commit: `4c8d7b5`
- Push: `d3f5838..4c8d7b5  main -> main`
- Notes:
  - `downloadPayload()` looked reusable but had exactly one caller (`exportProfile`), so it went with it rather than being left as dead code.
  - The review step now ends on the Summary supplier card. The publish control lives in the bottom bar (`setBar('review')`), not in this HTML — checked before deleting the trailing divider, no orphan section left.
  - Docs audited, not assumed: `HTML_PAGES.md` / `PAGE_INVENTORY.md` never mentioned the export; the `AI-DELEGATION-PACK.md` hits are the task's own "grep must return 0" acceptance criteria and were kept as the checklist. `HTML_PAGES.md:141/331` mention an "Export this restaurant" JSON action — that belongs to the owner dashboard, a different page, so it stays.
- Verified: `node tests/supplier-activate.js` PASSED (22 checks) · `node tests/smoke.js` PASSED · `node tests/appshell.js` PASSED · scan `exportProfile|downloadPayload|class="foot"|\.foot|profile JSON|exportedAt|eatouts.supplier.v1` → **0 hits**.

---

### [2026-11-03 19:15:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 steps 6 + 9 — remove the portfolio step from `eatouts-suppliers.html` and renumber
- Files changed:
  - `eatouts-suppliers.html` (+10/-86): deleted Step 5 `portfolio` end-to-end — the `step('portfolio', 5, …)` row, the `stepBody` case, `renderPortfolioStep()` (`:892-920`), the preview card block, `addPortfolio`/`editPortfolio`/`removePortfolio` act branches, the `editPortfolio()` sheet, the `portfolio: []` default and the `.pf-card`/`.pf-thumb`/`.pf-info`/`.pf-actions` CSS block (11 rules). Renumbered the remaining flow to 1 identity · 2 services · 3 pricing · 4 gallery · 5 contact · 6 review, moved the `.acc-item.i<n>` colour classes with it and deleted the now-unused `.acc-item.i7` rule + the `--s7-*` tokens (the s1-s6 ramp has no gap). `data-step` keys are untouched.
  - `PLATFORM UPDATE TASKS.md`: step 6 ticked, step 9 marked 🟡 PARTIAL with the numbering map and the note that the per-service `pricing:<cat>:<type>` fan-out (step 4) will re-run the numbering, T18 header status line updated
- Commit: `a0c5046`
- Push: `fb1ca1e..a0c5046  main -> main`
- Notes:
  - Scan after the edit: `portfolio|\.pf-|s7-` in the page → **0** hits, so no dead act handler, CSS rule or state key is left behind.
  - No migration for saved profiles: an old record still carrying `portfolio: []` just keeps an ignored key. Nothing reads it, so nothing breaks — cheaper and safer than rewriting every stored profile.
  - `tests/supplier-activate.js:71` still seeds `portfolio: []` on purpose (legacy-record tolerance) and passed unchanged.
  - `renderReviewStep` needed no edit — its publish checklist never referenced the portfolio step.
- Verified: `node tests/supplier-activate.js` PASSED (22 checks) · `node tests/smoke.js` PASSED · `npm run inventory` PASSED (10 checks, 92 warnings) · `git diff --stat` = 1 code file.

---

### [2026-11-03 18:40:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 1 — standard header on `eatouts-suppliers.html` (remove `.title#hdrTitle`)
- Files changed:
  - `eatouts-suppliers.html` (+6/-10): deleted the `<span class="title" id="hdrTitle">Suppliers</span>` mark and its `#hdr .title{…}` CSS rule, leaving the T08 header (brand-mark + `.status` chip). `paintHdr(title, profile)` → `paintHdr(profile)`: the label was the only consumer of `title`, so the param and the `getElementById('hdrTitle')` lookup went with it, and the five render-router calls (`:475-499`) dropped the dead first argument.
  - `PLATFORM UPDATE TASKS.md`: T18 step 1 ticked with the verification line, T18 header marked 🚧 IN PROGRESS (steps 3-9 open)
- Commit: `c538a60`
- Push: `97b3863..c538a60  main -> main`
- Notes:
  - The page already had the standard `#hdr` + `.brand-mark`; step 1 was only the leftover title label, so this is a 4-line-behaviour-preserving diff, not a header rewrite.
  - The `Draft`/`Published` `.status` chip was deliberately kept — it is state, not a page title, and step 1 only names `.title#hdrTitle`.
  - No `HTML_CATALOG.md` regeneration needed: the catalog is structural (no line counts) and the page inventory still passes at the baseline 92 warnings.
- Verified: `node tests/appshell.js` PASSED · `node tests/smoke.js` PASSED · `node tests/supplier-activate.js` PASSED (22 checks) · `npm run inventory` PASSED (10 checks, 92 warnings) · `git diff --stat` = 1 code file.

---

### [2026-11-03 18:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: D6 — close the T18 "activate" question ("activate = make it work")
- Files changed:
  - `PLATFORM UPDATE TASKS.md` (+3/-5): §7 **D6** moved to Resolved and recorded as *closed by execution*, citing `saveDraft` `:1355`, `publish` `:1368`, `publishChecks`/`publishReady` `:1003`/`:1035`, `EatoutsSupplierDirectory.sync()` `:614` and the `?link=<slug>` router `:1739`; §7 now ends with **"Still open: none."**; T18 step 2 marked ✅ DONE by execution so the remaining work is steps 1 and 3–9 only
- Commit: `dfe7880`
- Push: `fa2fdc3..dfe7880  main -> main`
- Notes:
  - No code was needed: the flow was already live. `node tests/supplier-activate.js` was run **before** touching the doc and passed, which is what established "no build required" rather than an assumption.
  - Recorded as "closed by execution" in the same style as D5 / D9 rather than "closed by decision", because the answer is evidenced by the shipped code + a passing suite.
- Verified: `node tests/supplier-activate.js` → SUPPLIER-ACTIVATE TEST PASSED (22 checks) · `git diff --stat` = 1 file, docs only.

---

### [2026-11-03 17:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: D8 — close the T21 price conflict (option **A**: the shipped seed wins, doc-only)
- Files changed:
  - `PLATFORM UPDATE TASKS.md` (+33/-31): §6 rows 1/2/15–20/24 now carry the shipped prices (Brand Kit P1,500 · Brand Kit Plus P3,200 · Business Cards P350 · Shopfront P850 · Vehicle Wrap P1,500 · Monthly Social Media P1,600 · Takeaway Bag P450 · **Full Packaging Design P1,800** · Logo Animation P450) with the stale v1 figure kept as history; new "**Closed 2026-11-03 (D8)**" paragraph naming `js/eatouts-services-seed.js` as the single source of truth; §6a mapping rows updated to the shipped `before → after` and the two "⚠️ no §6 home — confirm" rows (`svc_event_programme`, `svc_menu_refresh`) resolved to "removed by the T21 build"; §7 D8 moved from **Still open** to **Resolved**; §3 row 21 (T21) ticked ✅ DONE; T21 header's stale "29 services" corrected to 24
- Commit: `7acbb92`
- Push: `4c85712..7acbb92  main -> main`
- Notes:
  - No seed edit and no test edit: the seed already shipped 24 offers whose prices match §6 line-for-line (verified by dumping `id/category/name/base_price` out of the seed and reading the table back), so **no `tests/designer-services.js` update was needed** — it already asserts `cards.length === 24` and migrates the v1 fixtures.
  - The one place A differs from its literal wording: Menu refresh (P400) and Event programme (P350) are **not re-added** to the designer catalogue — they are absent from the shipped seed and from the authoritative 24 (D2 says do not re-add legacy services). They stay live as event-supplier services in `masterSupplierCatalogue.js` / `event_supplier_demo_catalogue.js`.
  - D6 (T18 "activate") remains the only open decision.
- Verified: `node tests/designer-services.js` → DESIGNER-SERVICES TEST PASSED · `node tests/profile-design-requests.js` → PROFILE-DESIGN-REQUESTS TEST PASSED · grep for `P550` / `— confirm)` / `⚠️ no §6` in the doc → 0 hits · `git diff --stat` = 1 file, docs only (no app code touched, so the full suite was not re-run).

---

### [2026-11-03 16:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.9 — builder share + save (2-option share popup, account gate, save sheet, draft guard, Create New Event)
- Files changed:
  - eatout_event_builder.html (+170/-16): `STATE.sharePicker/saveSheet/signupGate/leaveGuard` + `STATE.eventThumb` (persisted in the draft); CSS `.gate-copy/.opt-card/.thumb-strip/.save-thumb`; `fpopShell()`, `signedIn()`, `shareLink()`, `exitToVenueList()`, `eventInProgress()`, `renderSharePicker()`, `renderSaveSheet()`, `renderSignupGate()`, `renderLeaveGuard()` wired into `render()`; acts `shareVenue`/`shareContacts`/`closeSharePicker`/`closeSignupGate`/`saveSheetSave`/`closeSaveSheet`/`pickSaveThumb`/`saveThumbDevice`/`leaveSaveDraft`/`leaveDiscardDraft`/`closeLeaveGuard`; `shareWhatsApp`/`saveEvent`/`favEvent` now gate through the floating sign-up card instead of `confirm()`; `backToVenueList` asks "Save draft?"; `buildShareMessage()` ends with the real `Created_Event.html?id=` link; payload carries `image`/`thumb`; the four new popups were added to the scrim's backdrop-close list
  - eatouts-events.html (+26/-6): `eventThumb()` reads `image`/`thumb`/`snapshot.flyerImages[0]`, `dayLine()` prints "Saved … · Edited …", `.ev-row` gains a View button and `[data-view]` opens `Created_Event.html?id=`
  - index.html (+4): Plan Event screen opens with a `Create New Event` row (`data-act="createEvent"` → `eatout_event_builder.html`)
  - tests/builder-save-share.js (new, 54 checks), tests/run-all.js (registered)
  - scripts/html_catalog.meta.json (+ changelog) → HTML_CATALOG.md, PLATFORM UPDATE TASKS.md (12.9 ticked + Result, T12 COMPLETE, §3 row 19)
- Commit: `dba29b6`
- Push: `9960193..dba29b6  main -> main`
- Notes:
  - One helper (`fpopShell`) for all four panels so the G3 overlay standard (centred scrim, 420px, 16px, plain `×`, no `.fpop-close`) is asserted once per popup by the test.
  - `eventThumb` on the events list still tolerates older records (`cover`/`payload.image`), so pre-T13 saves keep their thumb.
  - `beforeunload` still just autosaves the draft (browsers block floating prompts there); the "Save draft?" question is attached to the in-app exit (`Back to Venues`).
- Verified: `node tests/builder-save-share.js` → BUILDER SAVE-SHARE TEST PASSED (54 checks); `builder-guests` / `builder-details` / `builder-suppliers` / `builder-schedule` / `builder-audience` / `created-event` PASSED; `node tests/run-all.js` → **70 passed, 0 failed**; `npm run catalog` → 73 pages; `npm run inventory` → PASSED (92 warnings = baseline).
- Not verified: the device photo picker for the event card (jsdom cannot open one); the native share sheet.

---

### [2026-11-03 14:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T13 — `Created_Event.html`, the read-only saved-event page (+ the payload contract it reads)
- Files changed:
  - Created_Event.html (new, 422 lines): standard shell (`#hdr` + brand-mark `data-act="backHistory"`, `.scroll`, `.appnav` × 5, G1 scrollbar hide); renders `.preview-page` exactly like the builder — flyer hero track with swipe dots, `metaLine` (title + "Saved … · Edited …"), then Venue / Date & Time / Dress Code / Menu / Suppliers / Contact / Tickets / RSVP / Guest List / Estimated Budget cards; zero edit affordances (`[data-act]` is only `backHistory` + `share`); `share()` uses `navigator.share` and falls back to `https://wa.me/?text=` with the page URL; three empty states (unknown id, no id, record without a snapshot). Loads only `js/eatouts-customer.js` + `js/eatouts-back-history.js`
  - eatout_event_builder.html (+72/-8): `STATE.eventId` / `STATE.eventCreatedAt` (`:1311`), both persisted by `saveDraft()`/`loadDraft()`; `eventSnapshot()` (`:4596`) writes the render-relevant state with pre-resolved costs; `eventSavePayload()` (`:4657`) now sends `id`, `created_at:STATE.eventCreatedAt||Date.now()`, `updated_at` and `snapshot`; the `saveEvent` handler (`:4425`) writes the returned `item.id`/`created_at` back into STATE and re-saves the draft
  - js/eatouts-customer.js (+4/-1): `saveEvent()` matches on the saved `id` as well as the ref, so a rename updates the record instead of writing a second copy
  - copy-static.mjs (+1), scripts/html_catalog.meta.json (page id 73 + changelog) → `npm run catalog` → HTML_CATALOG.md, PAGE_INVENTORY.md (§L, page 73), HTML_PAGES.md (row)
  - tests/created-event.js (new, 49 checks), tests/run-all.js (registered), tests/back-history.js (brand-mark count 56 → 57)
  - PLATFORM UPDATE TASKS.md (T13 ticked + Result block, §3 row 20)
- Commit: `200432f`
- Push: `0913854..200432f  main -> main`
- Notes:
  - Interface first: T13 needs the saved record to carry everything the preview shows, so `snapshot` is the contract; costs/venue/supplier text are resolved in the builder and the page stays a dumb renderer (no venue, menu or supplier engines loaded).
  - `data-page="Created_Event"` rather than the brief's `created-event`: `tests/inventory.js` requires a Part-1 row's slug to equal the filename minus `.html`, and every existing page follows that.
  - Stable `id` + kept `created_at` land here (not in T12.9) because a share link that changes when the event is renamed is not a link; the T12.9 save flow builds on the same fields.
  - Known limitation: saved events live in the phone's localStorage, so a link opened on another device shows the "not on this device" state until the record syncs through the backend.
- Verified: `node tests/created-event.js` → CREATED-EVENT TEST PASSED (49 checks); `node tests/back-history.js` → PASSED (29 checks); `node tests/run-all.js` → **69 passed, 0 failed**; `npm run inventory` → INVENTORY PASSED (10 checks, 92 warnings = baseline).
- Not verified: real-device look of the hero swipe + `.ev-meta` line (jsdom has no layout engine); the native Web Share sheet (only the `navigator.share` call shape is asserted).

---

### [2026-11-03 09:10:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.5 — builder "Event Details": centred chips/hints + Dress-Code-Cards
- Files changed:
  - eatout_event_builder.html (+110/-8): `[data-sec="details"] .chip-row{justify-content:center}` + `.field-hint{text-align:center;font-size:14px}`; new `.dc-row/.dc-card/.dc-thumb(90px)/.dc-name/.dc-x` and `.img-gal-acts`; `eventDetails.dress:[{id,name,photos}]` (state `:1343`) with `dresscode` kept as a name mirror; `renderDetailsSection()` emits the card row + "＋ Add dress code" instead of the old textarea; helpers `dressCards()`/`syncDresscode()`/`saveDress()`/`removeDressAt()`; acts `addDress`, `editDress` (floating prompt with Delete), `removeDress`, `openDressGallery`, `galAddPhoto`, `galRemovePhoto`; `renderImageGallery()` accepts an optional `edit` footer (add/remove photo; suppliers path unchanged); `STATE.gallery.edit` reset on close; `renderPrompt()`'s thumb branch now emits a hidden `[data-prompt-field]` and `pickPromptThumb` writes it — `savePromptFromForm()` only reads `[data-prompt-field]` inputs, so picked photos never reached `onSave` before (guest thumbs were silently dropped too)
  - tests/builder-details.js (new, 32 checks), tests/run-all.js (registered)
  - PLATFORM UPDATE TASKS.md (12.5 ticked, T12 header)
- Commit: `393072e`
- Push: `bc3ca4a..393072e  main -> main` (12.5 and 12.6 landed together — both are small changes to the same file in the same pass)
- Notes:
  - One request store, one gallery: the dress-code gallery reuses `STATE.gallery` + `renderImageGallery()` rather than a second lightbox, and the `edit` footer is opt-in so `builder-suppliers`' gallery assertions are untouched.
  - `dresscode` stays a comma-joined mirror of the card names so the Preview card (`:3094`) and pre-12.5 drafts (`eventDetails.dresscode` only) keep rendering; a legacy draft simply shows the empty card state.
  - A2/A3 from the plan held: one card = one dress code, first photo = the 90px thumb, and "add photo" is device-only (no URL field), matching 12.4's galleries.
- Verified: `node tests/builder-details.js` → BUILDER-DETAILS TEST PASSED; `builder-audience` / `builder-schedule` / `builder-guests` / `builder-suppliers` PASSED; `node tests/run-all.js` → **68 passed, 0 failed**.
- Not verified: real-device look of the 90px card row and the gallery footer (jsdom has no layout engine); the real file picker (only the hidden-input value path is exercised).
- Errors: none.

---
### [2026-11-03 09:25:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.6 — builder Guests: bare 150px photo picker (the rest was verify-only)
- Files changed:
  - eatout_event_builder.html (+0/-1): `renderPrompt()`'s thumb branch drops the `<span>Add photo</span>` copy, leaving the `＋` glyph (the `aria-label="Add photo"` stays)
  - tests/builder-guests.js (+17, 4 new checks), PLATFORM UPDATE TASKS.md (12.6 ticked)
- Commit: `393072e`
- Push: `bc3ca4a..393072e  main -> main`
- Notes:
  - Verify-only items confirmed by the new checks rather than by assumption: the prompt already floats in `.fpop-scrim` (12.3), `.prompt-thumb` was already 150px, `.fpop-close` is absent, and `.qty-stepper button` already centres its glyphs (`display:flex` + `align-items/justify-content:center`, `:709-711`).
  - Only guests pass a `thumb` field through `openPrompt()`, so the visible change is scoped to that prompt (RSVP/links/audience prompts are unchanged).
- Verified: `node tests/builder-guests.js` → BUILDER-GUESTS TEST PASSED (12.6 checks green); full suite re-run before the T12.5 push → 68 passed, 0 failed.
- Not verified: real-device look of the empty 150px picker.
- Errors: none.

---
### [2026-11-03 06:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: Close the push notes on the two T21 entries below and record the full-suite result
- Files changed:
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Push: `34d3b7e..b15682e  main -> main` (confirmed in terminal output — both T21 commits landed together)
  - `3305148` — T21 steps 5 + 9 (account gate, step 3 business prefill)
  - `b15682e` — T21 step 8 (designer WhatsApp handoff, "My design requests" on the profile)
- Notes:
  - `node tests/run-all.js` on the final tree: **67 passed, 0 failed** (66 suites + the new `profile-design-requests.js`). The only stderr noise is `tests/venue-slug.js`'s intentional stack trace; that suite reports ok.
  - T21 is complete (steps 1–10); `PLATFORM UPDATE TASKS.md` header flipped to ✅.
  - Still untracked on purpose: `assets/logo/*.jpg` (9 files) — not part of this work.
- Verified: suite summary `67 passed, 0 failed` seen in `runall.txt`; `git push` output seen.
- Errors: none.

---
### [2026-11-03 06:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T21 step 8 — designer handoff on the done step + "My design requests" on `eatouts-profile.html`
- Files changed:
  - designer-services.html (`designerWhatsapp()` / `designerMessage()`; the done step adds "Message your designer on WhatsApp" once the roster carries `private.phone`, plus a "View my design requests" link)
  - eatouts-profile.html (new `.dreq` / `.dreq-st` styles; `designJobs()` / `designDay()` / `supportWhatsapp()` / `designsSub()` / `designsModule()`; a 4th accordion `section('designs', 'D', 'My design requests', …)` in `render()`)
  - tests/designer-services.js (85 checks: designer chat href + reference in the message, profile link on the done step)
  - tests/profile-design-requests.js (new, 18 checks: section title/subtitle, only-this-customer filtering by `customer_id` and by WhatsApp for pre-account jobs, newest-first order, status labels/tones, ref + amount, WhatsApp follow-up, empty state + catalogue link)
  - tests/run-all.js (registers `profile-design-requests.js`)
  - PLATFORM UPDATE TASKS.md (T21 → ✅ COMPLETE; steps 5 / 8 / 9 annotated)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Push: PENDING (recorded in the follow-up entry)
- Notes:
  - The profile module is read-only over `eatouts_jobs_v1` — the same store `js/eatouts-brand-kit.js` writes, so there is still exactly one request store (A3).
  - Matching is `customer_id === user.id` first, then the WhatsApp number, so requests sent before the account gate existed still show up.
  - Every designer in `js/eatouts-designers-seed.js` still has `private.phone: ""`, so in the shipped seed the done step shows only the EatOuts handoff; the designer chat appears as soon as a number is added (the test patches one in).
  - Not verified: real-device look of the new accordion rows (jsdom has no layout engine).
- Verified: `node tests/designer-services.js` 85 ok / PASSED (0 window errors); `node tests/profile-design-requests.js` 18 ok / PASSED; `tests/brand-kit-admin.js`, `tests/designer-dashboard.js`, `tests/customer.js` PASSED; `node tests/run-all.js` → see follow-up entry.
- Errors: none.

---
### [2026-11-03 05:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T21 steps 5 + 9 — account gate on the design request flow + step 3 business prefill
- Files changed:
  - designer-services.html (loads `js/eatouts-manager-db.js` / `js/eatouts-users.js` / `js/eatouts-auth.js`; new `gate` step + `renderGate()`; `pickService` is account-only and parks the service in `sessionStorage` (`eatouts_design_resume_v1`) for a post-signup resume; `submitRequest()` re-checks the account; step 3 prefills name/whatsapp/industry from the account's listed business and adds a `.seg` toggle listed business <-> "For Unlisted Business"; job payload carries `business_id` + `customer_id`)
  - js/eatouts-brand-kit.js (`createJob()` records `customer_id`, additive)
  - tests/designer-services.js (63 -> 82 checks: gate copy/links/action-bar/resume/back-out, signed-in recognition, step-3 prefill + listed/unlisted toggle, `customer_id`/`business_id` on the stored job)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Push: PENDING (recorded in the follow-up entry)
- Notes:
  - Business prefill reads `EatoutsMgrDB.find('businesses', user.businessId)` — the store that `eatouts-customer-signup.html` already writes to. No new store, no seed edits.
  - Signed-out users can still browse the whole 24-offer catalogue; only "Choose this service" is gated, per T21 step 5.
  - Remaining for T21: step 8 (designer WhatsApp handoff + "My Design Requests" on `eatouts-profile.html`).
- Verified: `node tests/designer-services.js` 82 ok / PASSED (0 window errors); `tests/brand-kit-admin.js`, `tests/designer-dashboard.js`, `tests/supplier-activate.js` all PASSED.
- Errors: none.

---
### [2026-11-03 02:48:00] - [Agent: cline] - [Status: COMMITTED]
- Task: Close the push note on the T21 commit-1 entry below
- Files changed:
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Push: `673278b..8d5cfc4  main -> main` (confirmed in terminal output)
- Notes:
  - T21 commit 1 landed as `8d5cfc4` — 3 files, +68/-23 — and the suite was re-run green before the commit.
  - Next up is T21 commit 2, which needs answers on A1 (Previous Designers source), A2 (may `status`/`available_from` be added to `js/eatouts-designers-seed.js`?) and A3 (reuse `eatouts_jobs_v1` for "My Design Requests").
- Verified: `git push` output seen.
- Errors: none.

---
### [2026-11-03 02:42:14] - [Agent: cline] - [Status: COMMITTED]
- Task: T21 commit 1 — `designer-services.html` onto the standard shell (steps 1–6: shared bottom nav, no pill badges, no chip icons, no plus glyph, 16px type, centred chip row, hero copy)
- Files changed:
  - designer-services.html (removed `.hero .badges`/`.hero .badge`/`.hero .badge.gold` CSS + markup -> single `.hero-note` line keeping "From P120 · 15% platform fee · Founding: N of 20 left"; added `.appnav` + `.appnav a` CSS copied verbatim from `EatOuts-Region.html:69-72` and a 5-link `<nav class="appnav">` after `#actionBar`; `.scroll` padding-bottom `120px` -> `calc(78px + env(safe-area-inset-bottom))`; hero copy "Botswana designers" -> "local designers"; `.cat-chips` + `justify-content:center`; deleted `.cat-chip .ico` rule + `<span class="ico">` markup; `.card-img` `height:118px` -> `aspect-ratio:16/10`; `.service-sub` 11.5px -> 16px; deleted `.plus`/`.card.open .plus` rules + `<span class="plus">+</span>`; `.footnote` 10.5px -> 16px + `text-align:center`)
  - tests/designer-services.js (17 -> 34 checks: nav renders with 5 links in the shared order, nav follows `#view`/`#actionBar` in `#shell`, hero says "local designers" and keeps the P120/fee line, no `.badges`/`.badge`/`.ico`/`.plus` nodes in `#view`, no retired `.badges`/`.cat-chip .ico`/`.plus{` rules left, `.cat-chips` centred + computed `justify-content:center`, `.card-img` aspect-ratio (no `height:118px`), `.service-sub` 16px, `.footnote` computed 16px centred)
- Commit: this commit
- Push: PENDING (recorded in the follow-up entry)
- Notes:
  - Scope held to the two files above; no seed/designer/brief JS touched. `.ico` data (`c.icon` in the seed) is left in place — the markup no longer consumes it.
  - `.action-bar` is `position:fixed;bottom:0`, so on the service/brief/summary/done steps it sits over the nav and the user only ever sees one bar; the nav is visible on the catalogue where the action bar is `hidden`. No JS change needed.
  - Nav CSS is byte-for-byte the `EatOuts-Region.html`/`Orders-List.html` rule set, so `#shell`'s `display:flex;flex-direction:column` + `.scroll{flex:1 1 auto}` needs no layout change.
- Verified: `node tests/designer-services.js` -> 34 checks, `DESIGNER-SERVICES TEST PASSED`; `node tests/brand-kit-admin.js` and `node tests/designer-dashboard.js` PASSED; `node tests/run-all.js` -> **66 passed, 0 failed**.
- Not verified: real-device visual check of the nav/spacing (jsdom has no layout engine).
- Errors: none.

---
### [2026-11-03 02:22:00] - [Agent: cline] - [Status: COMMITTED]
- Task: Close the verification note on the v2-catalogue entry below (full suite had not finished when that entry was written)
- Files changed:
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Notes:
  - `node tests/run-all.js` (= `npm test`) completed with **66 passed, 0 failed** (exit 0) after commit a0ad3ad, including the new `supplier-activate.js` suite (21 checks).
  - Seed re-verified by loading `js/eatouts-services-seed.js` in Node: `EATOUTS_SERVICES_SEED` holds 24 services, 24 unique ids, price floor P120, ceiling P3,200, `VERSION = 2`, no `P80` string left in the file.
  - `git push` confirmed: `061387f..a0ad3ad  main -> main`.
  - Temp scripts (tmp-cats.cjs, tmp-seed-check.cjs, tmp-public.cjs) deleted; the only untracked items left are pre-existing `assets/logo/*.jpg` files unrelated to this task.
- Verified: `node tests/run-all.js` 66/66; seed load check as above; `git push` output seen.
- Not verified: nothing outstanding.
- Errors: none.

---

### [2026-11-03 02:10:00] - [Agent: cline] - [Status: COMMITTED]
- Task: Design-service catalogue v2 (24 offers, re-priced), safe v1->v2 migration of stored catalogues, and a published-supplier -> planner-directory bridge so a real supplier profile shows up in the event builder and at `?link=<slug>`
- Files changed:
  - js/eatouts-services-seed.js (rewritten to 24 offers, `VERSION = 2`, categories/blurbs updated, Hero badge floor P120)
  - js/eatouts-brand-kit.js (`V1_PRICES` map, `catalogueIsV1()`, `migrateServicesSeed()`, `seedIfEmpty()` migrates, `FOUNDING_DISCOUNT` comment corrected to P200)
  - brand-kit-admin.html (`services()`/`saveServices()` tolerate `{services:[...]}` and bare-array store shapes; notice copy -> v2)
  - designer-services.html (hero badge "From P80" -> "From P120")
  - js/eatouts-supplier-directory.js (NEW: maps published `eatouts_suppliers_v1` profiles into planner directory records, appends to `window.EATOUTS_SUPPLIERS`, replaces prior `source:'supplier-profile'` rows on re-sync, exposes `EatoutsSupplierDirectory { records, find, sync, toRecord, CAT_MAP }`)
  - eatouts-suppliers.html (loads the bridge; `openSupplierLink()` calls `EatoutsSupplierDirectory.sync()` so a same-session publish links without a reload)
  - eatout_event_builder.html (loads the bridge + `js/eatouts-slug.js`)
  - tests/designer-services.js (30 -> 24 cards, "Logo clean-up" -> "Brand Kit", seeds a v1 store in `beforeParse`, new migration assertions)
  - tests/brand-kit-admin.js ("Logo clean-up" -> "Brand Kit")
  - tests/supplier-activate.js (NEW: 21 checks - published-only filtering, record shape/price/unit/addons/serviceArea, `rating: null`, non-duplicating re-sync, `findSupplier`/`supplierProfileItems` costing, `?link=<slug>` public render)
  - tests/run-all.js (registers `supplier-activate.js`)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Notes:
  - Migration is deliberately conservative: the stored catalogue is only replaced when it still matches `V1_PRICES` AND carries 30 services; otherwise only `version` is bumped, so real admin edits are never overwritten.
  - Two service-store shapes exist in the wild (`{services:[...]}` and a bare array). Both readers and the writer now handle both, which is why `brand-kit-admin.html` had to change alongside the seed.
  - Category mapping is an explicit 8 onboarding categories -> 40 planner categories table with a `event_planning` fallback; `rating` stays `null` rather than inventing stars, so the directory never shows a fabricated score.
  - `find()`/`sync()` are idempotent: bridged rows are keyed by `source:'supplier-profile'` and replaced, never duplicated (asserted in the new suite).
  - Public page still prints the "Rates shown are illustrative demo figures" footnote for real suppliers - pre-existing shared copy, left untouched to keep the diff minimal.
- Verified: `node tests/designer-services.js` PASSED; `node tests/brand-kit-admin.js` PASSED; `node tests/designer-dashboard.js` PASSED; `node tests/builder-suppliers.js` PASSED; `node tests/html-catalog.js` 9/9 (72 pages); `node tests/smoke.js` PASSED; `node tests/supplier-activate.js` 21/21 PASSED; `git status --short` clean of temp scripts (tmp-cats.cjs / tmp-seed-check.cjs / tmp-public.cjs deleted).
- Not verified: visual check of the event-builder picker with a real published profile on a device (jsdom has no layout); `npm test` full-suite result is in the terminal log of this session.
- Errors: none.

---

### [2026-11-02 17:40:21] - [Agent: cline] - [Status: COMMITTED]
- Task: Remove the street-address line from the expanded card of every directory row (catering, bakeries, beverages; restaurants never had one)
- Files changed:
  - index.html (dropped the three `const addr=...'<div class="baddr">'...` declarations and their `+addr` concatenations in `cateringOptions`, `bakeryOptions`, `bottleStoreOptions`; deleted the now-dead `.ropts .baddr{...}` CSS rule)
  - tests/ritem-focus.js (+2 regression guards, 66 -> 68 checks)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit
- Notes:
  - Repo-wide grep (all *.js/*.html/*.css/*.mjs, excluding node_modules and dist) proved `baddr` existed in exactly 4 places, all in index.html, so the removal is exhaustive. Restaurants were already address-free - `restaurantItem` only renders `category - places` in `.rmeta`.
  - Not inside `.rrow`: the address was a sibling of `.ropts`, appended after the options block inside the card's `.acc-in`, so the `.rrow` header markup is untouched.
  - Guard choice: one DOM check plus one source scan. `class="baddr"` can only be emitted from a hard-coded literal (no data-driven path), so the source scan is a complete superset; the DOM check alone would stay green if the line were re-added only in the `locationReady===false` / no-address branches, which jsdom fixtures never render. Both follow the existing "no longer ..." tripwire idiom (gallery.js:235, login.js:99, about.js:124).
  - No CSS follow-up needed: `.ropts.brows` already carries `padding:2px 14px 16px`, so the card keeps its own bottom breathing room once the address line is gone (cards get ~24px shorter).
  - `locationReady` and `active` remain used elsewhere in all three option builders, so no variables were orphaned.
  - The address is still reachable via the Town/Area selectors, the Store details / About pages, and the favourites `subtitle` (JS data, not a row element).
- Verified: `Select-String 'baddr' index.html` 0 hits and `+addr` 0 hits; `node tests/ritem-focus.js` 68/68; `node tests/bakery-directory.js` 32/32; `node tests/catering-directory.js` PASSED; `node tests/bottle-stores.js` PASSED; `node tests/beverages.js` PASSED; `npm test` 64 passed, 0 failed (exit 0).
- Not verified: card spacing/height change on a real device (jsdom has no layout) - cards are ~24px shorter, worth a glance at 360x740.
- Errors: none.

---


### [2026-11-02 17:11:34] - [Agent: cline] - [Status: COMMITTED]
- Task: T03 - tapping a directory row must bring the opened card into view at the top of its list, on all four pager panels
- Files changed:
  - index.html (`focusRitem(openEl,scroll)` helper next to `syncRestAccordions`; the four sync functions all use it; `block:"nearest"` -> `block:"start"`; new `.scroll.has-open::after` trailing room; bakery/bottle `[data-bacc]` queries scoped to their own `.bevpage`; `closeAllRitemAccordions()` now clears and re-syncs `state.bottleOpen`)
  - tests/ritem-focus.js (new, 66 checks: pin-to-top, dim, clear-on-close, bottom row, no bakery/bottle cross-talk, closeAll)
  - tests/run-all.js (registers the new suite after bottle-stores.js)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: ec31d4b
- Push: origin/main (this ledger commit follows)
- Notes:
  - Root cause: the earlier patch scrolled with `block:"nearest"` synchronously while `.acc-wrap` was still collapsed, so the tapped row already counted as visible and nothing moved - `.ritem.open` stayed below the fold. `block:"start"` targets the card's top edge, which does not move while the card expands, so no second scroll or transition listener is needed.
  - `.scroll.has-open::after{height:calc(100% - 120px)}` adds scroll room below the last card only while a row is open (`100%` resolves against `.scroll`'s own height, so there is no `dvh` dependency). Without it the bottom rows can only be bottom-aligned.
  - Bakery and bottle-store rows share `data-bacc` and both panels sit in the DOM at once, so each sync now queries only its own column. Before this, opening a bakery row stripped `.open` off an open bottle store and vice versa.
  - `closeAllRitemAccordions()` now also clears `state.bottleOpen` and calls `syncBottleAccordions()`, so the beverages column collapses on panel/tab/history switches like the other three.
  - `dist/` was not touched: it is untracked build output and Pages rebuilds from Git.
  - Known debt (not changed): the shared `data-bacc` attribute itself; scoping the queries works around it but a `data-btacc` rename would remove the trap.
- Verified: `node tests/ritem-focus.js` 66/66; `node tests/bakery-directory.js` 32/32; `node tests/catering-directory.js` PASSED; `node tests/bottle-stores.js` PASSED; `npm test` 64 passed, 0 failed (63 before this change plus the new suite).
- Not verified: real-browser feel (smooth scroll vs the 0.32s expansion, iOS `scroll-snap-type:x` on the pager) - needs a device pass.
- Errors: none.

---



### [2026-11-02 00:40:00] - [Agent: opencode] - [Status: COMMITTED]
- Task: Commit the pending social-row / scroll-into-view work, recompress the logo set, and audit the untracked logos
- Files changed:
  - index.html (social row 370px/70px -> 300px/56px with 43.2px art, matching comment updated; bakery/catering/bottle accordions call `scrollIntoView` on the row just opened)
  - 83 files under assets/logo/ (recompressed in place, same names and formats)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: bd78337 (index.html), 9040758 (logos), this ledger commit
- Push: origin/main
- Notes:
  - These were working-tree changes that already existed when the 404 fix was committed; they were deliberately left out of d9c121c and are committed now on request.
  - Logo recompression is byte-only: 12,198,325 -> 3,551,596 bytes (-71%), every file still has a valid JPEG header and none grew, so no data or markup references change.
  - Audited the 10 untracked `assets/logo/*.jpg` files: none is referenced by any data file. They are source/duplicate images whose committed siblings are what the app loads (`tops_logo.png`, `Boxer_Liqours_Logo.png`, `Nandos-Logo.png`, `the_beef_baron.png`, `cresta-hotel-logo.png`, `zen_cafe_logo.jpg`, `*.webp` for butter chicken / chicken licken / pub_20_two, plus an unreferenced `EatOuts_Logo.jpg`). They were left untracked; they are not a live issue. An earlier note claiming live 404 logos was wrong - the referenced `.png`/`.webp` files are committed and served.
  - Removed a stray untracked `UsersKudzanaiAppDataLocalTempopencodeidx.diff` from the repo root (agent artifact from a mis-parsed shell redirect, never tracked).
- Verified: `npm test` 63 passed, 0 failed, run against the committed tree.
- Errors: none.

---

### [2026-11-02 00:00:00] - [Agent: opencode] - [Status: COMMITTED]
- Task: Fix live routing/404s for search and chain About pages; add deploy-manifest guard
- Files changed:
  - copy-static.mjs (add `search_screen.html` to FILES)
  - index.html (`bottleStoreInfo` and `openCateringAbout` now pass `brand.slug` to venue-about.html instead of the active branch slug)
  - venue-about.html (`resolve()` also resolves bottle-store/catering brands from branch slugs, so a `?link=<branch>` deep link no longer bounces to index.html#restaurants)
  - tests/bottle-stores.js (About link assertion now expects the exact brand slug `venue-about.html?link=liquorama`)
  - tests/beverages.js (catering About assertion now exact: `venue-about.html?link=fedics-food-service`)
  - tests/venue-about-about.js (new branch-slug resolution cases: Liquorama Gaborone, Fedics Gaborone)
  - tests/inventory.js (new guard: every root *.html must appear in copy-static.mjs FILES)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: d9c121c (feature commit; this ledger entry is the follow-up commit)
- Push: origin/main — feature d9c121c + this ledger commit
- Notes:
  - Live check: `https://www.eatouts.site/search_screen.html` returned 404. `copy-static.mjs` is the Cloudflare Pages manifest and listed 70 of the repo's 71 root HTML files; `search_screen.html` (page 71) was never staged into `dist/`. Same failure class as `ac99a83` (venue-about.html). `npm run stage` now emits 71 HTML files including search_screen.html.
  - Chain About taps passed the active branch slug (`liquorama-gaborone`, `tops-at-spar-gaborone`), but `EatoutsBottleStores.get()` / `EatoutsCatering.get()` are brand-keyed (branch ids resolve only via `.store()` / `.branch()`), so `venue-about.html` resolved nothing and redirected to index.html#restaurants. Taps now pass `brand.slug`; venue-about resolves branch slugs too, for shared links.
  - `tests/beverages.js` missed the catering case only because its assertion used `indexOf()` (a branch slug is a prefix superset); both assertions are now exact.
- Verified: node tests/inventory.js (21 checks, 71 pages) / tests/bottle-stores.js / tests/beverages.js / tests/venue-about-about.js all PASSED; `npm test` 63 passed, 0 failed; `npm run stage` -> dist/ has 71 .html files + search_screen.html.
- Live check (after push): Cloudflare Pages' Git integration built and deployed main; https://www.eatouts.site/search_screen.html -> 200 (<title>Search - EatOuts</title>), live index.html carries `gotoVenueAbout(brand.slug)`, live venue-about.html carries the branch-slug fallback. A manual `wrangler pages deploy` of a HEAD-built dist failed twice with UND_ERR_CONNECT_TIMEOUT mid asset-upload, so the Git build is what shipped it.
- Errors: none (the two aborted manual uploads were network connect timeouts, not code).

---

### [2026-11-02 00:10:00] - [Agent: opencode] - [Status: COMMITTED]
- Task: Add the EatOuts directory subscription agreement documents
- Files changed: docs/Directory_Subscription_Agreement_Update.txt, docs/EatOuts_Directory_Subscription_Agreement.docx (both were untracked user paperwork; committed on request), docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: be5c52f (docs) + this ledger commit
- Push: origin/main
- Notes: No code change; files were sitting untracked in docs/.
- Errors: none.

---

### [2026-11-01 21:00:00] - [Agent: TierMux] - [Status: COMMITTED]
- Task: venue-about - dynamic hero-logo background color extracted from the loaded logo via canvas
- Files changed: venue-about.html
- Commit: ad5cff2
- Push: origin/main
- Notes: Added updateHeroLogoBackground() that samples the top-left pixel of #logoImg via a 50x50 canvas and applies it to #heroLogo + --hero-logo-bg. Wired into logo load (onload), onerror (fallback white), and the change-logo FileReader. Fallback is white when extraction fails or image is missing. Only the hero strip is affected; logo overlay backdrop unchanged. Tests: venue-about-about.js PASSED.
- Errors: none

### [2026-11-01 23:32:58] - [Agent: opencode] - [COMMITTED]
- Task: venue-about — the About button and the Settings accordion header used different type; give the button the same font as the Settings summary
- Files changed:
  - venue-about.html (.about-btn: `padding:15px 20px;font:800 15px/1 inherit` was an INVALID font shorthand - `inherit` cannot be a component of the shorthand, so the whole declaration was dropped and the button fell back to the browser's default control font (font-size `medium`, weight 400, line-height `normal`) while .settings-acc > summary was 15px/800 at the body line-height. Replaced with explicit longhands: `padding:15px 20px;font-size:15px;font-weight:800;line-height:inherit;` - family already comes from the global `button{font-family:inherit}`. Both rows now compute identically; nothing else in the overlay changed.)
  - tests/venue-about-about.js (new check "About button and Settings summary share the same font": compares the computed fontFamily/fontSize/fontWeight/lineHeight of #aboutBtn and #settingsAcc > summary; verified it fails on the old CSS - computed `medium / normal / normal` vs `15px / 800 / 1.55` - and passes now)
  - docs/AGENT_CHANGE_LOG.md (this entry)
  - HTML_CATALOG.md (changelog line)
- Commit: 0650860 (feature commit; this ledger entry is the follow-up commit)
- Push: origin/main — feature 0650860 + this ledger commit
- Notes:
  The Settings summary was used as the reference look (15px/800, inherited family, body line-height 1.55) because the About button was the broken one.
  `font:inherit` was tried first and rejected: jsdom/cssstyle mangles that shorthand (it drops the following font-weight / font-size longhands), and real browsers also need explicit longhands to keep the line box in step with the Settings row.
- Verified: node tests/venue-about-about.js -> VENUE ABOUT PANEL TEST PASSED (79 checks incl. the new font check). A pre-fix reproduction script confirmed the mismatch on the old declaration.
- Errors: none.

---

### [2026-11-01 23:36:00] - [Agent: cline] - [Status: COMMITTED]
- Task: three venues had no menu (Ocean Basket, Bukhara, Zorz Luxury Chisanyama) + Zorz was missing from the Restaurants list/search + the open restaurant card (`.ritem.open`) could scroll-lock the page
- Files changed:
  - assets/data/menus_data/Ocean Basket.json, Bukhara.json, Zorz Luxury Chisanyama.json (new; transcribed from the venue menu documents into the directory schema `{restaurant,currency,currencySymbol,menu:[{category,note,items:[{name,description,price|variants,extras}]}]}` — Ocean Basket 2 categories/3 items, Bukhara 14/104, Zorz 8/32; variants keep both prices ("Half/Full"), sauces become `extras`)
  - assets/data/restaurant_listings/eatouts_manifest.json (+ the generated eatouts_manifest.js): new `extras` entry `Zorz Luxury Chisanyama` (town Gaborone, district 01, area + address Remmogo Crossing, category Restaurant, logo assets/logo/ZORZ_logo.webp, phone +267 77 853 309) so the venue is a real directory row instead of overlay-only
  - assets/data/restaurant_listings/directory_runtime_data.json/.js (regenerated: menuFiles 14→17, menusRaw now carries the three menus, restaurants gains `rest_zorz-luxury-chisanyama`)
  - js/eatouts-brand.js: `canonicalKey()` maps `zors`/`zorz` → `zorz-luxury-chisanyama` (the curated overlay key is `zors`, the directory slug is the full name, so both spellings must resolve to one brand)
  - search_screen.html: `pushOverlayVenue()` no longer skips when the curated slug/aliases are already indexed — it folds them into that row's `searchText` instead (so "zors" still finds the directory row and no duplicate `venue-zors` row is created); `have[slug]` now stores the row rather than `1`
  - index.html: removed the T03 scroll lock — `body.ritem-locked .scroll{overflow:hidden;touch-action:none}` and `pointer-events:none` on dimmed rows are gone, `syncRestAccordions()` no longer toggles `ritem-locked`, and `scrollIntoView` uses `block:"nearest"`; the dim (`.scroll.has-open .ritem:not(.open){opacity:.25}`) stays
  - tests/search-screen.js: Zorz is a directory row now, so the suite asserts `data-id === rest_zorz-luxury-chisanyama`, that "zors" and "zorz" resolve to that same single row, and that tapping it opens `index.html#zorz-luxury-chisanyama/menu` (the old `venue-zors` / `venue-about.html?link=zors` expectations are gone)
  - assets/data/link_registry.json (regenerated: 838 → 839 with zorz-luxury-chisanyama)
- Commit: d6f60ed
- Push: origin/main (ad7a26c..d6f60ed)
- Notes:
  - Menu JSON is the only source now; the older `*-Menu.js` menu files are no longer in assets (stale copies in dist are gone after `npm run build`).
  - `scripts/seeds/business_links.sql` was regenerated too but NOT committed: `build_link_registry.mjs` rewrites `created_at/updated_at` for all 839 rows (1634662431786 → 4332980179919), a pre-existing generator drift unrelated to this task. Restored to HEAD.
  - `index.html` also carries another agent's uncommitted header-search icon + masonry gallery work, so only the T03 hunks were staged for this commit.
- Verified: `npm run build` (merge + link-registry + copy-static) clean; `node tests/search-screen.js` PASSED; `node tests/venue-about-about.js`, `venue-about-menu.js`, `venue-about-options.js`, `menuview.js` PASSED; ad-hoc jsdom harness (not committed) confirmed menuFiles/menusRaw for the three venues (2/3, 14/104, 8/32 items), `menuFor('zors')` → Zorz menu, Zorz card in the rendered Restaurants list, `.ritem.open` opens without `ritem-locked` while `.scroll` keeps `overflow-y:auto`, and `venue-about.html?link=ocean-basket|bukhara|zors|zorz|zorz-luxury-chisanyama` navigate from the Menu line-action with no "not yet loaded" toast.
- Errors: none.


### [2026-11-01 23:23:55] - [Agent: opencode] - [COMMITTED]

- Task: venue-about — the About card holds copy only (eyebrow / title / paragraphs), curated contact facts moved to the social row, Settings hidden while the card is open and the About↔Settings gap tightened
- Files changed:
  - venue-about.html (CSS: .about-scroll content rules reduced to .about-eyebrow/.about-title/.about-p - .about-tagline, .about-facts, .about-fact, .about-k, .about-v removed; .logo-overlay.about-open gap 16px→10px; new .logo-overlay:not(.about-open) .about-panel{margin:-20px 0} so the collapsed 0-height card no longer contributes two 28px flex gaps (About→Settings ~56px→16px) while the grid-template-rows transition still animates; new .logo-overlay.about-open .settings-acc{display:none}. JS: renderAbout() emits only eyebrow + title + .about-p and reads the shared `curated` entry; aboutFacts() deleted; new `curated = aboutEntry(biz.slug)` feeds the contact pools (whatsapp/phone/phone2 merged into C.wa + C.call, deduped by digits), the social row (curated socials ahead of record socials) and the Website icon (curated.website before record.website)).
  - tests/venue-about-about.js (tagline/negative-rows assertions replaced by card-shape checks - cardClasses()/copyOnly() assert the card's direct children are only about-eyebrow/about-title/about-p; added "Settings is hidden while the card is open" + "Settings returns once the card folds away"; Bukhara's curated website now asserted on the social-row Website icon href, curated phones on the Call icon, curated IG/FB on their icons; Operating Hours accordion asserted to still exist; fallback venues assert copy-only).
  - docs/AGENT_CHANGE_LOG.md (this entry)
  - HTML_CATALOG.md (changelog line)
- Commit: 4b3e07f (feature commit; this ledger entry is the follow-up commit)
- Push: origin/main — feature 4b3e07f + this ledger commit
- Notes:
  User decisions: no email home needed (curated email is now display-unused); Operating Hours accordion deliberately left as the static placeholder because real hours will be supplied later, so curated hours (Ocean Basket, Bukhara) are display-unused for now; curated priceRange/services/established/highlights were already unused by any entry and stay untouched.
  Consequence to remember: venue-about.html no longer shows phone numbers, website, hours or email inside the white About card - phone/WhatsApp/website/socials live in the social row icons, hours stay in the Operating Hours accordion.
  The About card can now legitimately be shorter for venues with no curated entry (one generated paragraph).
- Verified: node tests/venue-about-about.js -> VENUE ABOUT PANEL TEST PASSED (incl. new card-shape + Settings-hidden checks). Also green: venue-about-menu.js, venue-about-options.js, beverages.js, bottle-stores.js, bakery-directory.js (32/0), venue-slug-integration.js, search-screen.js.
- Errors: none.

---

### [2026-11-01 21:52:10] - [Agent: Cline] - [COMMITTED]
- Task: venue-about — trim the About card / About button: drop Location, Address, Phone and Email rows, the highlights chips, the "Updated" footer, the "Business info" sub-label and the ▼ caret
- Files changed:
  - venue-about.html (markup: the About button is now a single "About" label - no .about-btn-main wrapper, no <small>, no .about-caret; CSS: removed the now-dead .about-btn small, .about-btn .about-caret, .logo-overlay.about-open .about-btn .about-caret, .about-chips, .about-chip and .about-foot rules; aboutFacts() lost add('Location')/add('Address')/add('Phone')/add('Email') plus the dead loc variable, the phones gather block and the unused br branch; renderAbout() lost the chips block and the about-foot line)
  - tests/venue-about-about.js (the suite asserted the four removed rows and the chips, so those assertions are now negatives: button label is exactly "About", no caret/sub-label, no Location/Address/Phone/Email labels, no curated address/phone values, zero about-chip, zero about-foot; the hours and website rows keep their positive assertions)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: 38d13b9
- Push: origin/main (feature commit + this ledger commit, fast-forward)
- Notes:
  Still rendered in the card: eyebrow, title, tagline, paragraphs, then the surviving .about-facts rows - opening hours per day, WhatsApp, Website (external link), Price range, Services, Established. The .about-facts/.about-fact/.about-k/.about-v CSS is all still in use.
  No longer rendered: Location (town · area), Address, Phone (both numbers), Email, the highlight chips, the "Updated <date>" footer, and the button's "Business info" sub-label + chevron.
  Data left untouched by explicit user decision: assets/data/venue_about_info.js keeps highlights[], updated, address, phone and email. address/highlights/updated are now display-unused; phone/email MUST stay because venue-about.html's overlay branch of resolve() maps oe.phone into record.contacts + branch.phones (:1085-1092), which is what keeps the Call/WhatsApp icons in the social row live.
  Known visual consequence: town/area and the street address no longer appear anywhere on venue-about.html (the hero is .hero h1 #venueName + #statusLine only). Flagged during planning and deliberately not addressed here.
- Verified: node tests/venue-about-about.js -> VENUE ABOUT PANEL TEST PASSED. node tests/search-screen.js -> SEARCH SCREEN TEST PASSED. npm test -> 61 passed, 2 failed - html-catalog.js and inventory.js only, both pre-existing and unrelated (they flag search_screen.html, untouched here).
- Errors: none from this change. The only failing suites are the pre-existing html-catalog.js / inventory.js pair (search_screen.html has no catalog entry / PAGE / data-page / PAGE_INVENTORY row - true at HEAD 6543c82 too, untouched here).



### [2026-11-01 21:23:15] - [Agent: Cline] - [COMMITTED]
- Task: Search screen — make the curated overlay-only venue Zors findable (typing "zors" returned nothing)
- Files changed:
  - search_screen.html (+~50): loads assets/data/venue_about_info.js in the data-script block; new pushOverlayVenue() helper; buildIndex() gains a 4th source that walks window.EATOUTS_VENUE_ABOUT last, deduped by canonical slug (and alias) against every row already indexed; openResult() sends overlay rows to venue-about.html?link=<slug>; new go() helper dispatches eatouts:about-nav before navigating (same convention as index.html gotoVenueAbout)
  - tests/search-screen.js (new suite, 20 checks) + tests/run-all.js (1 line in SUITES)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: f2a7ef4 (feature commit; the sha + push are recorded in the follow-up ledger commit)
- Push: origin/main — feature commit f2a7ef4 + this ledger commit (fast-forward from 6543c82)
- Notes:
  Why: "Zors" (ZORZ Luxury Chisanyama) is an overlay-only venue - it has no row in directory_runtime_data.js and its identity lives only in
  assets/data/venue_about_info.js, so buildIndex() (which read only EatoutsBridge.all / EatoutsCatering / BAKERY_BUSINESSES_DATA /
  EatoutsBottleStores) never saw it. The page did not even load the overlay file.
  Indexing: pushOverlayVenue() pushes { type:'restaurant', id:'venue-<slug>', name, subtitle:['Restaurant', cuisine, town, area],
  searchText:[name, slug, aliases, cuisine, tagline, 'restaurant food', town, area], logo, town, area, badge:'Restaurant', slug,
  navKind:'restaurant', overlay:true }. The slug and aliases are inside searchText on purpose: the name is "Zorz" (z-o-r-z), so the query the
  user actually typed - "zors" - would still miss it without them.
  Dedupe: the overlay file also curates Ocean Basket and Bukhara, which DO have directory rows (directory slugs ocean-basket [2 branches:
  Gaborone + Francistown] and bukhara). Overlay rows are pushed last and skipped when their slug or any alias is already indexed, so no venue
  is duplicated. Verified by data-id: every "ocean basket"/"bukhara" row stays a rest_* directory row, never venue-*.
  Routing: overlay rows deliberately do NOT go to index.html#<slug>/menu. index.html's boot deep-link resolves #<slug>/menu only against
  EatoutsBridge.all() (:10798-10811) and renderRestaurantSubView() falls back to the list when EatoutsBridge.byId() is null (:6400-6405), so an
  unknown slug bounces straight back; and with no menus_data/zors.json the menu view would render the flagship template under Zors' name
  (invented content). They go to venue-about.html?link=zors instead - the standalone page already resolves Zors from the same overlay file
  (venue-about.html:1070-1095) and toasts "has not yet loaded their menu" rather than dead-ending (:1774-1776).
  Deliberately NOT done: a Zors row on index.html's Restaurants tab. allRestaurants() -> EatoutsBridge.groupedListing() rows are consumed by
  restaurantItem/restaurantOptions, whose Menu/Promos/About actions require EatoutsBridge.byId(); an overlay row there needs overlay-awareness
  in the listing, the boot deep-link and renderRestaurantSubView, plus a real Zors menu. Separate task, after Zors publishes a menu.
- Verified: node tests/search-screen.js -> SEARCH SCREEN TEST PASSED (20/20 ok, window errors: 0). Full npm test -> 61 passed, 2 failed.
- Errors: none from this change. The 2 failing suites (html-catalog.js, inventory.js) are PRE-EXISTING: both only complain that
  search_screen.html has no scripts/html_catalog.meta.json entry, no <!-- PAGE: --> banner, no <body data-page> and is missing from
  PAGE_INVENTORY.md - all true of HEAD 6543c82 as well (verified with git show). Unrelated to this task and left untouched.



### [2026-11-01 20:28:42] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - add an "About" button above Settings in the logo overlay that pushes the logo up and reveals a white business-info card
- Files changed:
  - venue-about.html (CSS +62, markup +7, JS +150: #aboutBtn, #aboutPanel, aboutEntry/aboutFacts/aboutParagraphs/renderAbout/setAbout/closeLogoOverlay, resolve() overlay-only identity, close paths wired)
  - assets/data/venue_about_info.js (new: curated copy for Ocean Basket / Bukhara / Zorz)
  - tests/venue-about-about.js (new suite) + tests/run-all.js (1 line in SUITES)
  - assets/logo/ZORZ_logo.webp (new asset, referenced by the Zorz entry)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: cc3b1db (feature commit; this entry rides in the follow-up ledger commit)
- Push: single push cc3b1db + ledger commit -> origin/main (fast-forward). index.html hunks and the two untracked
  docs/Directory_Subscription_Agreement* files were deliberately left out of scope.
- Notes:
  Why: the logo overlay stack was logo -> Settings only; the user wanted business details reachable from there for every venue kind.
  Design: .about-btn sits above <details id="settingsAcc">; .about-panel is a white card animated with the page's existing
  grid-template-rows 0fr->1fr trick (.settings-body pattern). .logo-overlay.about-open switches the flex column to flex-start and
  shrinks .logo-large 280px -> min(120px,32vw) (logo still visible) so the card drops in below it. Card body scrolls
  (max-height:min(46dvh,380px)). Settings and About are mutually exclusive (toggle handler) so only one panel is open on a 360px phone.
  Data: content lives in a NEW overlay file (window.EATOUTS_VENUE_ABOUT) keyed by canonical slug with aliases - deliberately NOT in
  directory_runtime_data.js, which is generated by npm run merge and would wipe hand edits. Fields are all optional; the card renders
  only what exists and falls back to directory/branch data (description -> types/category/town, addresses[], contacts[], website,
  branch phones/emails/address) so KFC, bakeries, bottle stores and caterers all show something instead of an empty panel.
  Zorz: has no directory record, so resolve() now checks the overlay file after the restaurant/bottle/catering/bakery chain and builds a
  minimal identity from it (assets/logo/ZORZ_logo.webp). ?link=zors AND ?link=zorz both resolve; no generated-file churn.
  Not invented: Zorz opening hours are absent because the brief says "we close at 1PM" (13:00 or 01:00?) - the card simply omits the
  hours rows. Ocean Basket website/socials and Bukhara's X/TikTok/LinkedIn URLs were not published to us, so they are blank.
  Copy: supplied verbatim by the owner (Ocean Basket 5 paragraphs + 7 pillars as chips, Bukhara 5 paragraphs, Zorz 4 paragraphs).
  The three new menu JSONs (Ocean Basket / Bukhara / Zors) are still NOT in assets/data/menus_data - unrelated to this card, still open.
  Verified: node tests/venue-about-about.js -> VENUE ABOUT PANEL TEST PASSED (77 checks: placement above Settings, aria-expanded,
  computed #aboutPanel background rgb(255,255,255), curated copy for all three venues, Zorz aliases, KFC/bakery-3/alcool/
  boifyscateringservices fallbacks, Escape/backdrop/Settings close paths).
  Regression: venue-about-options PASSED, venue-about-menu PASSED, bakery-directory 32/0, catering-directory PASSED,
  bottle-stores PASSED, beverages PASSED, back-history PASSED (29), npm test 60 passed / 2 failed (both pre-existing:
  inventory.js + html-catalog.js, search_screen.html gaps - unchanged by this task).
  Scope: venue-about.html is +240/-4 lines, above the 200-LOC budget; approved in plan mode as a single commit.
  dist/ is gitignored - `node copy-static.mjs` (npm run stage) still needs to run before a deploy to pick this up.
- Errors: none


### [2026-10-25 02:05:00] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - lock the two visible labels (header "Menu Options", #optMenu button "Menu") so they cannot drift
- Files changed:
  - tests/venue-about-options.js (header comments L3/L5 + 3 new assertions after L72)
  - docs/AGENT_CHANGE_LOG.md (this entry)
  - venue-about.html: DELIBERATELY UNTOUCHED (git diff -- venue-about.html is empty)
- Commit: e3949f0 (entry folded into the same commit)
- Push: single push, fa26579..e3949f0 -> origin/main (fast-forward), PUSH_EXIT=0
- Notes:
  Why: the user asked to "make sure" the labels stay as swapped in fa26579 - <summary>Menu Options</summary>
  for the group header (it also holds the Town/Area pickers) and <span class="val">Menu</span> for the
  #optMenu button. A promise is not a guard, so the requirement is now enforced by the suite instead of by
  memory: if either string changes, tests/venue-about-options.js fails.
  Change: 3 assertions added to the KFC block, anchored on DOM structure not on copy order -
    q('#optList').closest('details.acc').querySelector('summary').textContent === 'Menu Options'
    q('#optMenu .val').textContent === 'Menu'
    header !== 'Menu' (explicit anti-regression on the pre-fa26579 wiring)
  The two stale header comments (L3/L5 said "Menu" accordion while the header reads "Menu Options") were
  de-labelled to "options accordion" - the file is already named venue-about-options.js and the id is
  #optList, so those comments can no longer go stale on the next copy tweak. The lock is now the single
  place that names the copy, and it says to update it in the same commit as any intentional rename.
  Verified:
    - node tests/venue-about-options.js -> EXIT=0, 36 checks, 0 FAIL (was 33 checks before the 3 locks)
    - node tests/venue-about-menu.js    -> EXIT=0, 7 checks, 0 FAIL
    - git diff --quiet -- venue-about.html -> exit 0 (no drift; the file is byte-identical to fa26579)
    - tests/venue-about-options.js: 0 bare LF (CRLF preserved on the inserted lines)
    - node tests/run-all.js -> 55 passed, 2 failed. Both failures are PRE-EXISTING and unrelated:
      inventory.js (PAGE_INVENTORY.md lists 30 SPA screens vs 31 expected) and login.js (About page
      operator-businesses.html link + inline operator form). Neither suite references anything this
      commit touched (Select-String for venue-about-options / AGENT_CHANGE_LOG / "Menu Options" across
      both files: no hits), and PAGE_INVENTORY.md was last changed 2026-10-24 (c94c144) - before this
      work started. Left untouched on purpose: repairing them is a separate task.
  Not done (proposed and deliberately skipped, see the prior session's notes):
    - No CSS change for the wider header: .acc > summary has no nowrap/ellipsis/fixed height, and
      "Operating Hours" (15 chars) already ships in the same rule, so 12-char "Menu Options" can only wrap.
    - HTML_CATALOG.md / scripts/html_catalog.meta.json still describe the section as "Options" (they omit
      Hosting + Settings too). Fixing them means editing meta.json and running `npm run catalog`; left out of
      this commit to keep it a reviewable one-file diff.
    - Older ledger entries still describe the pre-swap label states. They are dated records of what was true
      at those commits, so they were NOT rewritten.
  Errors: none.


### [2026-10-25 01:28:49] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - swap the two "Menu" labels (accordion header <-> #optMenu button)
- Files changed:
  - venue-about.html (L679 and L1232 only)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: single push, 7cf166e..origin/main on 2026-10-25
- Notes:
  Why: after 1fa1d24 the accordion header read "Menu" while the #optMenu button inside it read "Menu
  Options", and the header also contained the Town/Area pickers. User asked to SWAP the two labels, so the
  header now describes the group ("Menu Options") and the button is the plain action ("Menu").
  Change:
    L679  <summary>Menu</summary>                                  -> <summary>Menu Options</summary>
    L1232 <span class="val">Menu Options</span></button>           -> <span class="val">Menu</span></button>
  Copy only. id="optMenu", class="opt", data-opt="menu", type="button", the delegated click handler and all
  CSS are byte-identical - the handler dispatches on data-opt, never on label text.
  How the swap was done safely: a sequential Menu->Menu Options then Menu Options->Menu would have
  collapsed both labels into one, so each line was replaced in place using a unique anchor
  (<summary>...</summary> for the header, the <span class="val"> prefix for the button) instead of a
  global find/replace.
  Verification:
    - git diff -> exactly 1 file, +2/-2, two hunks, nothing else.
    - <summary>Menu Options</summary> count=1 (L679); <summary>Menu</summary> count=0 (ABSENT).
    - <span class="val">Menu</span> count=1 (L1232); <span class="val">Menu Options</span> count=0.
    - <summary>Menu Tags</summary> untouched at L773 (a different accordion - excluded by the anchor).
    - <summary>Promos</summary> L660 and "Promos Gallery" L1234 untouched.
    - Structure guards intact: id="optMenu" data-opt="menu" type="button" (L1231), data-opt="promos"
      (L1233), id="optList" (L682).
    - Line endings: 1459 lines, CRLF pairs 1459, bare LF 0 (no line-ending damage).
    - node tests/venue-about-options.js -> PASSED, 33 checks, 0 failures, exit 0.
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, 0 failures, exit 0.
    - Full 55-suite run deliberately skipped: grepping tests/*.js found NO assertion on "Menu Options" or
      on the summary labels, so no other suite can observe this copy change. Last full run on this tree
      was 55 passed / 2 failed (pre-existing inventory.js + login.js only).
  Not verified: actual rendering. "Menu Options" is longer than "Menu" in the same <summary>, which is a
  flex row with no nowrap/ellipsis/fixed width, so clipping is not expected - still worth an eyeball.
  Deliberately UNCHANGED: all CSS, ids, data-opt values, handlers, HTML_CATALOG.md and
  scripts/html_catalog.meta.json.
- Errors: None


### [2026-10-25 01:21:47] - [Agent: Cline] - [COMMITTED]
- Task: tests - sync the venue-about-options.js L3 header comment to the "Menu" accordion
- Files changed:
  - tests/venue-about-options.js (L3 comment only)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: single push, c78a7bb..origin/main on 2026-10-25
- Notes:
  Why: 1fa1d24 updated L5 to describe a grey "Menu" accordion but left L3 reading 'Venue About "Options"
  accordion', so two comments in the same header block contradicted each other. L3 now reads
  'Venue About "Menu" accordion - town/area pickers, Menu & Promos.' Only the quoted label reference
  changed; the surrounding prose ("town/area pickers, Menu & Promos") was left exactly as-is.
  Comment-only. Zero assertion logic touched: no test, no fixture, no helper, no rename.
  Verification (targeted suites only - a comment cannot affect any other suite, so the full 55-suite run
  was deliberately NOT re-executed for this change):
    - git diff tests/venue-about-options.js -> EXACTLY one line changed (1 insertion, 1 deletion; the two
      +/- content lines are one removed + one added). Files changed = 1.
    - node tests/venue-about-options.js -> PASSED, 33 checks, 0 failures, exit 0 (count unchanged).
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, 0 failures, exit 0.
    - Full-suite context from the run on this same tree: 55 passed / 2 failed, the failures being only the
      pre-existing tests/inventory.js + tests/login.js. Unchanged and out of scope.
  Deliberately UNCHANGED: L5 (already correct since 1fa1d24), venue-about.html, all CSS, every other test
  file, .gitignore (including the fix*.ps.js line), HTML_CATALOG.md and scripts/html_catalog.meta.json.
- Errors: None


### [2026-10-25 01:11:07] - [Agent: Cline] - [COMMITTED]
- Task: chore - narrow .gitignore `fix*.js` to `fix_*.js` + `fix-*.js`
- Files changed:
  - .gitignore (L24 `fix*.js` replaced by L24 `fix_*.js` + L25 `fix-*.js`; every other line untouched)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: same single push as the venue-about commit above, 1d8a895..origin/main on 2026-10-25
- Notes:
  Why: `fix*.js` was over-broad. It ignored ANY .js whose name starts with "fix", so a legitimate app
  file such as fixed-header.js (or fixlayout.js) would have been silently untracked with no warning.
  Narrowed to the prefix convention the one-off repair scripts actually use: "fix_" or "fix-".
  The replacement is STRICTLY NARROWER than the pattern it replaces, so it cannot newly ignore anything;
  it can only un-ignore. Line endings preserved (CRLF 76 -> 77, pre-existing bare LFs unchanged at 4).
  Pre-check (read-only, before editing): `git ls-files` matched ZERO files against (^|/)fix[-_].*\.js$,
  and `git ls-files -ci --exclude-standard` showed NO tracked file is currently ignored - so nothing
  could have been silently untracked under the old pattern either.
  check-ignore -v proofs (all five as requested):
    fix_payment.js        -> matched .gitignore:24:fix_*.js   (intended)
    fix-layout.js         -> matched .gitignore:25:fix-*.js   (intended)
    fixlayout.js          -> NOT matched (exit 1)             (intended - no dash/underscore)
    fixed-header.js       -> NOT matched (exit 1)             (intended - this is the point of narrowing)
    fix_venue_about_v2.py -> NOT matched by any .js pattern. It IS ignored, but by the PRE-EXISTING
                             unrelated rule now at .gitignore:78 `fix_venue_about*.py` (HEAD line 77).
                             Verified against HEAD that this rule predates the change and was not
                             touched. A .js pattern cannot match a .py, so there is no unintended
                             cross-extension match. Not treated as a stop condition.
  Deliberately UNCHANGED (as instructed): .gitignore L26 `fix*.ps.js`. Note this line is NOT redundant
  with the new patterns - it still matches dash-less/underscore-less .ps.js names (e.g. fixabc.ps.js)
  that neither `fix_*.js` nor `fix-*.js` covers, so it keeps its current scope. `gen*.js`, `genseed.js`,
  `testfix.js` and all other lines were left alone.
- Errors: None


### [2026-10-25 01:10:13] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - differentiate the #optMenu button label as "Menu Options"
- Files changed:
  - venue-about.html (L1232 only: the #optMenu <span class="val"> text)
  - tests/venue-about-options.js (L5 comment only - it still described a grey "Options" accordion)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit as instructed; a commit cannot contain its own
  final SHA, so resolve with `git log -1 --format=%h`)
- Push: same single push as the .gitignore commit below, 1d8a895..origin/main on 2026-10-25
- Notes:
  Why: bb60ed4 renamed the accordion header to "Menu" and flagged (in that entry) that the accordion then
  read "Menu" while ALSO containing a button labelled "Menu". User asked to differentiate the button.
  Scope: copy only. Only the <span class="val"> text changed. id="optMenu", class="opt", data-opt="menu",
  type="button", the delegated click handler and the CSS are all untouched. The handler dispatches on
  data-opt, never on label text, so behaviour is identical.
  Deliberately UNCHANGED: <summary>Menu</summary> (L679), <summary>Promos</summary> (L660), the #optPromos
  "Promos Gallery" label (L1234), all CSS, ids, data-opt values and handlers. HTML_CATALOG.md and
  scripts/html_catalog.meta.json were NOT regenerated (dated artifacts stay as-is).
  Verification:
    - grep '<span class="val">Menu Options</span>' -> PRESENT, L1232.
    - grep '<span class="val">Menu</span>'         -> ABSENT (the guard is exact: "Menu Options</span>"
      does not satisfy the "Menu</span>" match).
    - node tests/venue-about-options.js -> PASSED, 33 checks, exit 0. Count unchanged - the only edit in
      that file is one comment line, so no assertion was added or lost.
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, exit 0.
    - npm test -> 55 passed, 2 failed. The failures are exactly tests/inventory.js + tests/login.js
      ("PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31", "the About page links to
      operator-businesses.html", "the About page no longer has the inline operator form") - identical to
      the baseline already proven pre-existing in the bb60ed4 entry. No new failure.
  CORRECTION ON RECORD: the bb60ed4 entry quoted "34 checks" for venue-about-options.js. The true count is
  33. That was a reporting miscount by the agent, not a lost assertion (that suite's content is unchanged
  apart from the comment line below).
  tests/venue-about-options.js L3 (file header summary) still reads 'Venue About "Options" accordion'.
  Only L5 was in scope for this task, so L3 was left alone - flagged to the user rather than widened.
- Errors: None


### [2026-10-25 00:42:19] - [Agent: Cline] - [COMMITTED]
- Task: venue-about.html copy change - accordion header "Options" -> "Menu"; "Promos" button -> "Promos Gallery"
- Files changed:
  - venue-about.html (2 lines: L679 <summary> text, L1234 #optPromos label)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: bb60ed4
- Push: bb60ed4 + this changelog commit -> origin/main on 2026-10-25 (UTC)
- Notes:
  User request: on data-page="venue-about" rename the class="acc" accordion header "Options" to "Menu",
  then change "Promos" to "Promos Gallery" within that collapsed accordion.
  AMBIGUITY RESOLVED BY USER: the page contains the word "Promos" twice - the Promos accordion header
  (<summary>Promos</summary>, L660, wraps #promoCarousel) and the #optPromos button rendered inside the
  Options accordion (#optList, L1234). User chose the BUTTON only. L660 is therefore deliberately
  UNTOUCHED - it still reads "Promos".
  Scope: copy only. data-opt values (town,area,menu,promos), element ids (#optList/#optMenu/#optPromos),
  the click handler and the CSS are all unchanged, so behaviour is identical. The change ships as-is:
  venue-about.html is already in the deploy list (copy-static.mjs L49) and dist/ is gitignored (.gitignore L36).
  No CSS change needed: .acc > summary (L211-219) is a flex row with no white-space:nowrap, no ellipsis,
  no fixed width and no ::after chevron, so the longer "Promos Gallery" cannot clip.
  Verification:
    - git diff: 1 file, +2/-2 - only the two intended lines.
    - CRLF preserved: 0 bare LF, 1459 lines, no EOF change (diff = exactly 2 hunks).
    - node tests/venue-about-options.js -> PASSED (34 checks, exit 0).
    - node tests/venue-about-menu.js    -> PASSED (7 checks, exit 0).
    - npm test -> 55 passed, 2 failed (inventory.js, login.js).
  PRE-EXISTING FAILURES RE-PROVEN (not regressions): `git stash push -- venue-about.html` returned the
  tree to clean HEAD, and re-running just those two suites reproduced the SAME 3 failing checks -
  "PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31", "the About page links to operator-businesses.html",
  "the About page no longer has the inline operator form". Restored with `git stash pop`; venue-about.html
  SHA256 back to C79DB0998BBD2EC552296291AF1E86CF18DF2F99848D659EDACA012BDED6FFFD, stash list empty.
  KNOWN STALE ARTIFACTS (left on purpose, no code impact): tests/venue-about-options.js L5 comment still
  says 'renders a grey "Options" accordion'; HTML_CATALOG.md L1052 and scripts/html_catalog.meta.json keep
  the historical "Options accordion" wording. All are comments/dated records - no assertion reads the
  label text, so no suite can break. Not rewritten (minimal diff).
  REVIEW NOTE (flagged to user, proceeding as asked): the accordion now reads "Menu" as a header while
  also containing a #optMenu button labelled "Menu", and it still holds the Town/Area pickers.
- Errors: None


### [2026-10-24 23:54:02] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage C - archive the 4 superseded design folders to _archive_local/tier3/
- Files changed:
  - Deleted (50 tracked files): SORT_REDESIGNS_ARCHIVED_20261017/ (31), Onboarding Designs/ (12),
    dashboard htmls/ (6), DO NOT USE THESE/ (1)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: 4d138ef
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
- Notes:
  All 50 files were COPIED byte-for-byte into _archive_local/tier3/<original-folder-name>/ and
  verified by SHA256 BEFORE removal: 31/31, 12/12, 6/6, 1/1 = 50 files, 0 hash mismatches. Only then
  were the originals removed with `git rm -r` (still recoverable from git history). _archive_local/
  is gitignored, so the archive stays local and out of the client-facing repo.
  Superseding evidence confirmed earlier: the menu-selector feature is already integrated into
  index.html (asserted by tests/restloc.js) and supplier_onboarding_catalog.js was merged into
  assets/data/supplier_catalog.js. NOTE: `SORT THIS/Pop-Up States Plan.txt` and
  `code-implement-task.html` are unintegrated FUTURE work - they were archived in Stage B, not
  deleted, so they remain available locally.
  Tier 4 deliberately UNTOUCHED: staging/ (48), reference/ (4), dashboards/ (6).
  Verification: after `npm run build`, `git diff --no-index` between dist/ and the C:\tmp\dist-before
  baseline exited 0 - dist byte-identical (2055 = 2055 files). Also ran a further build after the
  commit: git status CLEAN. Total cleanup across Stages B and C changed ZERO shipped bytes.
  FINAL STATE: 17 + 50 = 67 tracked junk files removed; 20 local junk files archived; working tree clean.
- Errors: None

## Open issues / not addressed
1. `.gitignore` line 24 `fix*.js` is too broad - it also matches legitimate names like
   `fix-layout.js` or `fixtures.js`-adjacent helpers. Suggested future form: `fix_*.js` + `fix-*.js`.
   Deliberately NOT changed during this cleanup (out of scope, and would risk un-ignoring files).
2. `eatouts-designers-demo-seed.json` and `eatouts-designers-demo-agent-prompt.md` exist and are
   tracked at the repo root, but they are NOT in the copy-static.mjs deploy list, so they will not
   ship. If any page links to them the link would 404 in production. Needs a product decision:
   deploy them, or move them to a non-deployed docs location.
3. Build non-determinism: RESOLVED in this session (commit 04ac49f). Three causes removed -
   unsorted Map iteration, `Date.now()` stamped into all 838 business_links rows, and a wall-clock
   `buildStamp`. Two consecutive builds are now byte-identical and leave git status clean.
4. PRE-EXISTING test failures - NOT caused by this cleanup. `npm test` reports 55 suites passing and
   2 failing; both were reproduced unchanged at the pre-session commit 22f67ad in a throwaway
   worktree, so this cleanup introduced ZERO regressions:
   a) `tests/login.js` - 2 of 30 checks fail: "the About page links to operator-businesses.html" and
      "the About page no longer has the inline operator form". The About page markup and this test
      have drifted apart (one still expects the removed inline operator form / the other link).
   b) `tests/inventory.js` - 1 of 19 checks fails: "PAGE_INVENTORY.md lists all SPA screens --
      30 vs 31". PAGE_INVENTORY.md is one SPA screen behind the banner markers in index.html.
      PAGE_INVENTORY.md is hand-maintained (scripts/update-inventory.mjs is read-only and never
      rewrites it), so this needs a human edit to add the missing screen row.
   Both were left untouched: fixing them is outside the scope of this cleanup and requires product
   decisions about which About-page markup and which SPA screen are intended.
5. `business_links.sql` epoch `8655508347967` is CONTENT-DERIVED (~2244 AD), not wall-clock. Do NOT
   "fix" it to a human date -- determinism requires it. V3-verified: no UI renders
   `business_links.created_at`/`updated_at` as human dates (only raw via `linkOut()`; client callers
   of `/api/links/*` don't surface these fields).
6. `_archive_local/tier1/` (20 files) is the ONLY archive without git-history recovery (Tier 1 was
   untracked when moved). Tier 2 recoverable at `a3f17aa^`; Tier 3 recoverable at `4d138ef^`. Back up
   `_archive_local/tier1/` separately before any future `_archive_local/` cleanup.

### [2026-10-24 23:52:52] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage B - archive Tier 1 local junk, delete Tier 2 tracked junk, harden .gitignore
- Files changed:
  - Deleted (17, git rm - recoverable from history): td_out.txt, build-output.txt, build-output2.txt,
    catalog-output.txt, final-test-output.txt, final2.txt, test-output.txt, integration_file.txt,
    check-page-titles.cjs, check-page-titles2.cjs, check-page-titles3.cjs, cleanup-temp.cjs,
    find-page-titles-end.cjs, td_find.cjs, td_find.js, td_find.mjs, fix_venue_about_v2.py
  - .gitignore (+19 lines)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: a3f17aa
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
- Notes:
  Tier 1 (20 files, 473.5 KB) moved byte-for-byte to _archive_local/tier1/ preserving structure:
    _trash/ (13), SORT THIS/ (3), _headers.bak (1), venue-about.html.bak.20261020-* (3).
    Nothing deleted; the source folders are now empty. _archive_local/ is gitignored.
  Tier 2 (17 files, 1775.6 KB = 1.73 MB) removed with `git rm`. Pre-deletion checks:
    - All 17 absent from copy-static.mjs => never deployed.
    - Zero code references for 16 of them. `integration_file.txt` has 11 hits, but every one is a
      PROSE CITATION in a comment ("See integration_file.txt 12"), never a file read - it is a spec
      doc, not a data input. Because 11 comments still cite it, a copy was preserved to
      _archive_local/tier2/integration_file.txt before removal.
  .gitignore gained 12 patterns: _archive_local/, td_out.txt, td_find.*, build-output*.txt,
  *-output.txt, final*.txt, integration_file.txt, check-page-titles*.cjs, find-page-titles-end.cjs,
  cleanup-temp.cjs, fix_venue_about*.py, *.bak.*. Line 24 (`fix*.js`) deliberately LEFT UNCHANGED.
  Verification (the payoff of the determinism fix): after `npm run build`, `git diff --no-index`
  between dist/ and the C:\tmp\dist-before baseline exited 0 - dist is byte-identical (2055 = 2055
  files). Cleanup changed zero shipped bytes. Build produced NO churn.
- Errors: None

### [2026-10-24 23:48:56] - [Agent: Cline] - [COMMITTED]
- Task: Make the build deterministic (stop pre-existing generated-file churn at source)
- Files changed:
  - scripts/build_link_registry.mjs (sorted Map iteration; content-derived epoch replacing `Date.now()`)
  - scripts/build_restaurant_directory.py (content-derived `buildStamp` replacing `time.time()`; `time` import dropped, `hashlib` added)
  - scripts/seeds/business_links.sql (regenerated)
  - assets/data/restaurant_listings/eatouts_manifest.js (regenerated)
  - assets/data/link_registry.json (regenerated - key order follows the now-sorted candidates; key set unchanged)
  - docs/AGENT_CHANGE_LOG.md (this entry, amended into the same commit)
- Commit: 04ac49f
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
- Notes:
  Three independent non-determinism sources were removed:
    1. `scripts/build_link_registry.mjs` iterated a `Map` without sorting -> candidates/rows followed
       insertion order. Now sorted by brand key (defence-in-depth).
    2. `scripts/build_link_registry.mjs` stamped EVERY row's `created_at`/`updated_at` with
       `Date.now()` -> all 838 lines churned on every build. Now a sha256 over the sorted candidate
       set, folded into a 13-digit integer (same magnitude as a Date.now() value).
    3. `scripts/build_restaurant_directory.py` set `buildStamp = int(time.time() * 1000)` -> new value
       every build, shipped in `eatouts_manifest.js`. Now a sha256 over the canonically-serialised
       manifest inputs (sorted keys), folded into a 13-digit int. Field name and type (int) unchanged.
  Audit justification (STAGE A-PRE):
    - A0.1 `buildStamp` is a genuine READ for cache invalidation: js/eatouts-brand.js `logoRev()` ->
      `bustPath()` appends `?v=<buildStamp>` to `assets/logo/*` URLs. Decision (user-approved) was to
      keep the field and make it content-derived: the documented intent ("edited logo art is fetched
      with a new URL") still holds - it now busts iff content changes instead of on every no-op build.
    - A0.2 `business_links.sql` row order is NOT load-bearing: every statement is `INSERT OR IGNORE`
      keyed on unique `id`; no test parses the file (tests use in-memory stubs); no FK constraints.
    - Slug-collision check: the dataset has exactly ONE numeric-suffixed slug
      (`fairgroundholdingsptyltdtabotswanaconfer2`, supplier). Its collision partner is a restaurant,
      and all restaurants are pushed before suppliers, so sorting CANNOT reassign that suffix.
      Verified post-build: id set is identical (838 = 838), no slug reassignment.
  CONSCIOUS DATA-CONTENT CHANGE (user-approved): `business_links.sql` row timestamps change ONCE,
  from wall-clock to content-derived (currently 8655508347967). `INSERT OR IGNORE` means existing D1
  rows are untouched; fresh loads see the derived epoch. All future builds are stable.
  Determinism proof (A-FIX.4): two back-to-back `npm run build` runs produced byte-identical
  `business_links.sql` (1BB092BB...) and `eatouts_manifest.js` (12EDA7FB...).
- Errors: None

### [2026-10-24 19:47:00] - [Agent: Big Pickle] - [COMMITTED]
- Task: Sync generated artifacts for live deploy (eatouts.site)
- Files changed: 759 files (see git status)
- Commit: c94c144
- Push: 3266ecc..c94c144 main -> main
- Notes: Ran npm run build, git add -A, committed with "chore: sync generated artifacts for live deploy", pushed to origin/main
- Errors: None

### [2026-10-24 08:06:28] - [Agent: Big Pickle] - [IN_PROGRESS]
- Task: Deploy fix - mirror live site to local build state
- Files changed: assets/data/restaurant_listings/eatouts_manifest.js, scripts/seeds/business_links.sql (plus build artifacts in dist/ - will be staged)
- Commit: PENDING
- Push: PENDING
- Notes: Ran npm run build. These appear to be generated files; will stage all as instructed.
- Errors: None



### [2026-10-25 03:12:31] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 1 - role-scope Quotes/Bookings tabs (audit finding: gated by business type only)
- Files changed: operator-dashboard1.html
- Commit: PENDING
- Push: PENDING
- Notes: Added isCommercialOwner (isOwner + supplier/lodge_owner roles); quotes now requires supplier|caterer type AND commercial owner, bookings requires supplier|lodge type AND commercial owner. Platform roles unchanged. Role strings verified against js/eatouts-roles.js MATRIX.
- Errors: None

### [2026-10-25 03:16:02] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 2 - delete fabricated analytics (Math.sin engagement generator + hard-coded deltas)
- Files changed: restaurant-dashboard.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: deriveAnalytics() removed; localCounts() added; This month/Today/Top menu items/WhatsApp activity/billing summary now show only local record counts with honest copy; report JS takes counts instead of A; promo/event fake view counters removed. Verified node --check + node tests/dashboard.js PASSED.
- Errors: None

### [2026-10-25 03:26:40] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 3 - remove 'Real aggregates' claim + static SLA items; replace 'X of 3 free days' with real promo counts; fix dead promosSection render path
- Files changed: analytics-manager.html, CHANGELOG-remediation.md, dashboards/eatouts-bakery-dashboard.html, dashboards/eatouts-bottle-store-dashboard.html, dashboards/eatouts-caterer-dashboard.html, dashboards/eatouts-event-supplier-dashboard.html, dashboards/eatouts-mobile-kitchen-dashboard.html, dashboards/eatouts-restaurant-dashboard.html
- Commit: PENDING
- Push: PENDING
- Notes: Order schema has no stage timestamps so SLA timings were removed rather than computed. freeDaysUsed derived from activeDays of promos without feeCharged, capped at 3 (INCLUDED_PROMO_DAYS_PER_MONTH). node --check passed on all 7 files; X of 3 grep = 0.
- Errors: None

### [2026-10-25 04:05:11] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 4 - instrument every WhatsApp hand-off (wa.click) on the customer site
- Files changed: index.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: waLink(text,venue,template,context,venueId) now calls EatoutsAnalytics.track("wa.click",{template,venueId,context}) inside try/catch before returning the wa.me URL; js/eatouts-analytics.js added to the page (it was never loaded here); all 15 call sites pass a template id. Verified: 16 waLink refs = 1 definition + 15 tagged calls, inline script node --check OK, tests/run-all.js unchanged (2 pre-existing failures).
- Errors: None


### [2026-10-25 04:38:20] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 5 - bridge customer WhatsApp orders into eatouts_manager_v1.orders (+ legacy history)
- Files changed: index.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: Added bridgeBusinessId() (slug/restaurantId -> manager business id, fallback first restaurant business) and bridgeDraftOrder(source) writing one deduped order into eatouts_manager_v1.orders and eatouts_order_v1_history, syncing an already-loaded EatoutsMgrDB instance, clearing the draft only after both writes; wired before notifyFieldOrder at split-bill (:9552) and checkout (:9574). Verified with a jsdom boot of index.html: 12/12 checks incl. fresh operator boot listing the order; no window errors.
- Errors: None


### [2026-10-25 04:47:36] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 6 - re-anchor demo order timestamps to the seed moment so "Orders today" is non-zero
- Files changed: js/eatouts-manager-seed.js, tests/demo-seed.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: anchorDemoOrders() shifts DEMO.orders[].created so the newest is 5 minutes ago, formatted in Africa/Gaborone (same zone as operator-dashboard1.html:46); reanchorStored() migrates copies already in eatouts_manager_v1.orders only when created still equals the frozen dataset value; VERSION 2 -> 3.Verified with jsdom (3 stores): Orders today = 6 on 2026-10-25, no future stamps, spacing kept, legacy store migrated, hand-edited date preserved. tests/demo-seed.js version marker expectation updated 2 -> 3 (suite green).
- Errors: None


### [2026-10-25 05:05:12] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 7 - label the delivery-page demo fallback as sample data; align business_types module id with the reviews collection
- Files changed: assets/data/business_types.js, restaurant-delivery.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: module id 'review' -> 'reviews' in all seven business types (matches EatoutsDB.collection('reviews'); type.modules has no consumer). restaurant-delivery.html gains DEMO_SNAPSHOT (set only in the bdOrders() fallback branch) and renderDemoBanner() explaining that the 50-order snapshot is sample data with fixed dates; fallback kept. Verified with jsdom (scripts inlined): 6/6 checks incl. banner hidden when stored orders exist; node --check business_types.js OK; tests/delivery.js, tests/business-profiles.js, tests/demo-seed.js pass.
- Errors: None


### [2026-10-25 05:21:44] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 8 - confirm before ?demo=reset wipes the device store
- Files changed: js/eatouts-manager-seed.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: DB.reset() now runs only after window.confirm() returns true; the check fails closed when confirm is unavailable and declining falls through to the idempotent merge (no data loss). Verified with jsdom: 11/11 checks incl. Cancel keeps a real order + 40 demo rows, OK wipes and re-seeds, no prompt without the parameter.
- Errors: None



### [2026-10-25 05:55:02] - [Agent: Cline] - [COMMITTED]
- Task: Full-suite verification of the remediation work (commits 1-9)
- Files changed: none (verification only)
- Commit: n/a (record only)
- Push: PENDING (9 commits ahead of origin/main)
- Notes: `node tests/run-all.js` -> 55 passed, 2 failed. The two failures are pre-existing and unrelated to this work: (1) inventory.js "PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31" (doc drift; no SPA screen was added/removed and PAGE_INVENTORY.md was not touched by any of the 9 commits); (2) login.js "About page links to operator-businesses.html" + "no inline operator form" (index.html still contains id="opWhats" and no operator-businesses.html href — verified both conditions also fail at origin/main 372f6b9, i.e. pre-existing). My index.html edits only shifted line numbers (8707 vs 8618). Untracked backup-pre-0014-20261025-030848.sql left untracked (D1 migration backup, out of scope).
- Errors: None

### [2026-10-25 05:31:10] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 9 - align tests/wa.js with the templated waLink signature
- Files changed: tests/wa.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: the venue-aware rule assumed the venue was the last argument, so commit 4's new template/context args made 11 venue-aware calls look unvenueed. Rule now matches the venue as the 2nd argument, plus a new check that every call passes a template id (15 sites). node tests/wa.js PASSED.
- Errors: None


### [2026-10-25 06:15:00] - [Agent: Cline] - [COMMITTED]
- Task: Ship remediation - close the two pre-existing test failures and push
- Files changed: .gitignore, index.html, CHANGELOG-remediation.md
- Commits: 4126329 (.gitignore: ignore backup-pre-*.sql), 6e80117 (index.html: About Operator -> operator-businesses.html link + remove inline operator sign-in screen)
- Push: PENDING (push follows)
- Notes: One root cause closed both failures - index.html still had the inline operator sign-in (renderOperatorLogin / about-operator-login / id="opWhats") that plan .kilo/plans/eatouts-promo-listing-p9-p13.md Phase P9 had slated for removal in favour of operator-businesses.html. Removed the screen end-to-end (PAGE_TITLES entry, pageRef case, renderScreen dispatch, renderOperatorLogin + banner, 5 handlers, onLogin flag); button -> link. inventory.js now 30 vs 30 (no PAGE_INVENTORY.md edit needed); login.js link present + opWhats gone. backup-pre-0014-20261025-030848.sql ignored via new .gitignore rule (left on disk). scripts/seeds/restaurants.sql (regen timestamp churn) reverted to HEAD. Full suite: 57 passed, 0 failed (was 55/2).
- Errors: None


### [2026-10-25 05:53:48] - [Agent: Cline] - [COMMITTED]
- Task: Close the cross-tenant read in GET /api/business/contacts and GET /api/business/users
- Files changed:
  - functions/api/_business.js (new requireBusinessOwner helper, +14)
  - functions/api/business/contacts.js (+5/-1: import + guard in onRequestGet)
  - functions/api/business/users.js (+5/-1: import + guard in onRequestGet)
  - tests/api-business.js (+66/-1: 9 regression checks + 3 fake-D1 tables + 3 SELECT shapes)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commits: 9894be8 (helper), 5065b5e (contacts GET), 8088509 (users GET), b404a9b (tests)
- Push: PENDING (push follows)
- Notes:
  Vulnerability: both GET handlers called requireSession only, then trusted the business_id query
  param, so any signed-in user could list another tenant's rows - contacts (phone numbers, titles) and
  team users (names, emails, whatsapp). The POST/PATCH/DELETE handlers in the same files already
  required ownership, so this was a read-only hole in an otherwise guarded route.
  Fix: extracted requireBusinessOwner(c, businessId) into _business.js - one SELECT id FROM
  business_profiles WHERE id = ? AND user_id = ? - and called it right after requireSession in both
  GETs. Response contract: blank id 400 business_id_required (unchanged), foreign id 404 not_found,
  unknown id 404 not_found. 404 for both cases on purpose: a 403 would confirm that another tenant's
  business id exists. Shape is { businessId } | { error: Response } to match requireSession/requireBusiness.
  Not done on purpose: business/services.js GET and business/profiles.js GET have the same shape (session
  only + business_id from the query) and return a foreign tenant's services / full profile. Out of scope
  for this task and left untouched - recorded as the follow-up list instead of being silently widened.
  Verified: node tests/api-business.js - 102 checks passed, including the 9 new ones (own 200, other
  tenant 404 not_found, signed-in non-owner 404, no session 401, no business_id 400, for both endpoints).
  node tests/run-all.js - 57 passed, 0 failed. Note: an earlier full run reported intake8.js failing;
  it passed standalone and on the re-run, so it is an intermittent jsdom boot flake, not a regression
  (no API handler is involved in that test).
- Errors: the first commit attempt ran the four git commands in parallel and hit .git/index.lock,
  which folded contacts.js into the helper commit. Recovered with git reset 81e61ab (mixed, nothing
  pushed yet) and re-ran the four commits sequentially - history is now one file per commit.


### [2026-10-25 07:11:45] - [Agent: Cline] - [COMMITTED]
- Task: Close the cross-tenant read in GET /api/business/services, and correct the earlier entry that also named GET /api/business/profiles as a leak
- Files changed:
  - functions/api/business/services.js (+5/-1: requireBusinessOwner import + guard in onRequestGet)
  - tests/api-business.js (+25/-1: business_services fake-D1 table, two seed rows, 4 regression checks)
  - docs/AGENT_CHANGE_LOG.md (this entry; the earlier entry's claim at :496 is DELIBERATELY left untouched)
- Commits: 663a45f (services GET guard), fde7f61 (regression checks), this entry (docs)
- Push: fc769fa..origin/main (fast-forward), PUSH_EXIT=0 - this docs record rides the same push
- Notes:
  RETRACTION FIRST. The contacts/users entry says business/services.js GET and business/profiles.js GET
  "have the same shape (session only + business_id from the query)". Half of that is false.
  business/profiles.js was read end to end: onRequestGet resolves membership inline at :58-61
  (SELECT ... FROM business_profiles WHERE id = ? AND user_id = ?; 404 when no row) before it fetches
  anything, so it is guarded exactly like requireBusinessOwner. It is not a hole and never was.
  How the wrong claim happened: the route files were swept with a regex for requireBusinessOwner /
  requireMembership calls. An inline owner SELECT does not match that pattern, so a guarded handler and an
  unguarded one score the same under grep. A pattern match is not a read; the correction was made by
  opening the files, not by re-running a better regex.
  Corrections are appended, never edited into the old entry: the wrong claim stays visible with the
  retraction underneath it, so the log keeps its history instead of quietly rewriting it. :496 is
  untouched on purpose.
  THE OTHER HALF WAS RIGHT. services.js GET called requireSession only, then ran
  SELECT * FROM business_services WHERE business_id = ? on whatever id the caller passed, so any signed-in
  user could list another venue's service names, descriptions and prices. Fix is the guard the
  POST/PATCH/DELETE handlers in the same file already used: requireBusinessOwner(c, businessId) right after
  the blank-id check. Contract unchanged: no session 401, blank business_id 400 business_id_required,
  foreign or unknown id 404 not_found (404 rather than 403 so the route never confirms another tenant's id).
  RE-AUDIT, BY READING. All 12 route files that export onRequestGet were opened and read in full -
  contacts, events, gallery, link, menu, mine, profile, profiles, promos, services, staff, users - plus the
  [id]-suffixed sub-routes that only carry PATCH/DELETE. Every GET resolves membership (requireMembership,
  requireBusinessOwner, requireMenuManager, or an inline owner SELECT) before its own SELECT. services.js
  was the only unguarded read in the route; no other handler needed a change.
  Verified: node tests/api-business.js -> 106 checks passed (102 + 4 new: own business 200 with the row,
  other tenant 404 not_found, signed-in non-owner 404, no session 401). node tests/run-all.js ->
  57 passed, 0 failed.
- Errors: None


### [2026-10-25 05:31:12] - [Agent: Cline] - [VERIFIED] [COMMITTED]
- Task: Close the one open claim from the services GET entry - "no live wrangler dev request was made" - by exercising the guard on a running route. No product code changed.
- Files changed:
  - docs/AGENT_CHANGE_LOG.md (this entry only)
- Verified:
  Environment: wrangler 4.148.0 on PATH (project pins ^4.151.0 in devDependencies; no node_modules/.bin, so npx resolved the global
  binary). wrangler.toml binds DB -> D1 eatouts and OPS_KV, and [vars] sets ENV = "development", so /api/auth/dev-login is live.
  Documented dev command is `npx wrangler pages dev dist` (package.json: preview / pages:dev); dist/ already built (2055 files), and
  Pages reads ./functions from the source tree, so the route under test is the working copy, not a stale bundle.
  Local state before the run: .wrangler/state/v3 D1 already had the full schema (business_profiles, business_services, users, ...)
  but 0 rows in each of the three tables used here - a clean slate, nothing of the user's to overwrite.
  Seeded for the run, via a temp .sql in %TEMP% (never inside the repo): users usr_rt_a / usr_rt_b, business_profiles biz_own
  (usr_rt_a) and biz_other (usr_rt_b), business_services svc_own (biz_own) and svc_other (biz_other, price 99.9).
  Server: npx wrangler pages dev dist --port 8788 --ip 127.0.0.1; GET /api/health -> 200
  {"ok":true,"env":"development","bindings":{"db":true,"kv":true,...}} after 3s.
  Session: POST /api/auth/dev-login {"email":"ambitious450@gmail.com"} -> 200 {"ok":true,"user":{"id":"usr_rt_a",...}}.
  Requests, run twice - once through Invoke-WebRequest with a cookie session, once through curl.exe with a cookie jar; identical results:
    GET /api/business/services?business_id=biz_own    -> 200 {"ok":true,"services":[{svc_own...}]}      (harness: 200)
    GET /api/business/services?business_id=biz_other  -> 404 {"ok":false,"error":"not_found"}          (harness: 404)
    GET /api/business/services?business_id=           -> 400 {"ok":false,"error":"business_id_required"} (harness: 400)
    GET /api/business/services (no session)           -> 401 {"ok":false,"error":"not_authenticated"}   (harness: 401)
    GET /api/business/services?business_id=biz_nope   -> 404 {"ok":false,"error":"not_found"}          (unknown id, same as foreign)
  svc_other / price 99.9 appears in no response body. The live route behaves identically to the fake-D1 harness on all four cases.
  ADMIN FLAG DOES NOT BYPASS THIS GUARD - worth recording. The single email in DEV_LOGIN_EMAILS is also the single email in
  ADMIN_EMAILS, so the session in this run was an admin session (isAdmin:true), and it still got 404 on biz_other.
  That is correct, not a bug: requireBusinessOwner (_business.js:51-59) is a plain
  SELECT id FROM business_profiles WHERE id = ? AND user_id = ? with no admin branch, unlike requireBusiness, which
  deliberately reports admins as 'owner'. So the observed 404 holds for admin and non-admin sessions alike, since the isAdmin
  flag is never consulted on this path. Nothing changed here - noted so a future reader does not "fix" the missing bypass.
  Teardown: taskkill /PID <cmd> /T /F, port 8788 no longer listening, no workerd/wrangler processes left. Seeded rows deleted and
  counts confirmed back to profiles 0 / services 0 / users 0, so local D1 is as it was found. One local KV session row remains in
  the gitignored .wrangler/state/v3 - harmless, expires like any session.
- Not done, on purpose:
  Phase 2 wrote the one-page decision brief for D1 (canonical business-type slug), D2 (normaliseType() silent 'restaurant'
  default) and D3 (one definition of money) and delivered it in-session. Zero files touched for D1/D2/D3, nothing committed for
  them: all three are waiting on a human pick, not on an agent. This entry is the only commit from the session.
- Errors: two `wrangler d1 execute --local` calls issued in parallel collided with
  "Failed to get session commit token: internal error"; local D1 commands must be run one at a time.


### [2026-10-25 05:33:40] - [Agent: Cline] - [COMMITTED]
- Task: Record the push of the live-route verification entry
- Files changed: docs/AGENT_CHANGE_LOG.md (this record only)
- Commit: 195e339 (live-route verification entry)
- Push: 80be862..195e339 origin/main (fast-forward), PUSH_EXIT=0; HEAD == origin/main == 195e339
- Notes: Docs only. No product code was touched in this session; D1 (canonical type slug), D2 (normaliseType silent
  default) and D3 (one definition of money) remain undecided and unedited.
- Errors: None



### [2026-10-25 07:56:43] - [Agent: Cline] - [D1 COMMIT 2/7: data] - [COMMITTED]
- Task: D1 step 2 - rewrite stored spellings to the canonical slugs and re-emit the generated link artifacts.
- Files changed:
  - migrations/0015_canonical_business_types.sql (new, 72 lines) - 4 scoped UPDATEs (business_links + favourites, x bottlestore +
    foodtruck), all `WHERE type IN (<old>, <new>)` so re-running is a no-op; header records the WHY, the supplier deferral, the
    "ship code before --remote apply" ordering, and the rollback-as-comment decision.
  - scripts/build_link_registry.mjs:193 ('bottle_store' -> 'bottlestore') - MOVED HERE from the original commit-3 list. Reason: the
    seed SQL and link_registry.json are generated, so commit 2 cannot emit new-spelling data while its own generator still says
    `bottle_store`. Leaving it for commit 3 would have made commit 2 verify nothing.
  - scripts/seeds/business_links.sql (regenerated) - 47 rows changed type; 838 rows before and after.
  - assets/data/link_registry.json (regenerated) - 47 entries changed type; 838 slugs, identical slug set, 0 added, 0 removed.
- Verified (probe rows, local D1, then cleaned up):
  BEFORE  business_links: bottle_store=1, food_truck=1, liquor_store=1, supplier=1
  BEFORE  favourites    : bottle_store=1, food_truck=1, promo=1
  AFTER   business_links: bottlestore=2,      foodtruck=1,         supplier=1   <- 4 rows in, 4 rows out, supplier untouched
  AFTER   favourites    : bottlestore=1,      foodtruck=1,         promo=1      <- ?type=promo survived, as the WHERE clause intends
  Row-level: bottle_store:rt-bottle -> bottlestore:rt-bottle, liquor_store:rt-liquor -> bottlestore:rt-liquor,
  food_truck:rt-truck -> foodtruck:rt-truck, supplier:rt-supp untouched.
  Idempotency: replayed `wrangler d1 execute --file migrations/0015...` after the tracked apply -> "5 commands executed", counts
  identical (bottlestore=2, foodtruck=1, supplier=1). No double-mapping, no drift.
  Cleanup: DELETE favourites (fav_rt%), users (usr_rt_probe), business_links (blk_rt%) - probe user needed because
  favourites.user_id is FK-constrained, which is why the first INSERT attempt failed with FOREIGN KEY constraint failed.
  Artifacts: `npm run link-registry` -> "wrote 838 links ({restaurant:476, bottlestore:47, supplier:315})". HEAD-vs-worktree
  line diff for business_links.sql: onlyOld=47 onlyNew=47, every pair differing exactly at `bottle_store` -> `bottlestore`
  (codepoints e,_,s,t -> e,s,t,o). link_registry.json: 47 type-only changes, 0 other fields, sameSlugSet=true.
- Note on diff size: business_links.sql shows 838 lines changed, not 47. That is by design - the generator derives created_at from a
  content hash ("content-derived epoch (was Date.now()) - deterministic; changes iff inputs change", build_link_registry.mjs:226-231),
  so editing any input re-stamps every row. Verified the timestamps are the only other change by stripping the trailing
  `, <ts>, <ts>);` from both revisions and diffing again.
- Errors: first favourites probe INSERT failed (FOREIGN KEY constraint failed) because no such user existed; added users row
  usr_rt_probe and retried. Rolled back with the probe cleanup above.

### [2026-10-25 07:50:20] - [Agent: Cline] - [D1 COMMIT 1/7: catalog] - [COMMITTED]
- Task: D1 step 1 - make the field enum use the canonical slugs bottlestore and foodtruck. Supplier DEFERRED by human decision
  (option A): business_links holds 315 `supplier` rows and 0 `event_supplier`, and `supplier` is canonical in
  business_types.js (which drives onboarding/dashboard routing), link.js:14, [slug].js:77 and _business.js:178. Only this enum
  says `event_supplier`, so flipping it would be a 315-row guess. Not touched in commits 1-4; recorded, not fixed.
- Files changed:
  - js/eatouts-field.js (header "locked rules" line 18-19; FIELD_TYPES keys liquor_store->bottlestore, food_truck->foodtruck;
    a 4-line comment above FIELD_TYPES naming the supplier split; normaliseType alias branches expanded)
  - migrations/0004_business_links.sql:27 (column comment bottle_store -> bottlestore)
  - tests/field.js (4 assertion clusters moved to the new canonical values; 3 new alias assertions)
- Verified:
  FIELD_TYPES = { restaurant, bottlestore, event_supplier, foodtruck, caterer } (5 keys, unchanged count).
  Alias branches must sit ABOVE the FIELD_TYPES[t] lookup or legacy venues would now fall through to the unknown-type path, so
  the branches were EXPANDED, not just re-pointed: liquor_store / liquor-store / liquorStore were added (they used to resolve via
  the FIELD_TYPES key that no longer exists), and food_truck / foodTruck likewise. Every old spelling still resolves:
    normaliseType('bottle_store') -> 'bottlestore'   normaliseType('liquor_store') -> 'bottlestore'
    normaliseType('food_truck')   -> 'foodtruck'     normaliseType('food-truck')  -> 'foodtruck'
    normaliseType('supplier')     -> 'event_supplier' (unchanged)
  Tests: node --check clean on both files; node tests/field.js -> 142/142 checks passed (was 137/139 before the alias additions).
  FIELD_SEED still emits 5 per type because it normalises through normaliseVenue (eatouts-field.js:767-769).
- Correction found while editing (C1 was incomplete, now closed): tests/field.js had FOUR clusters tied to the old canonical
  values, not three. The missed one was :94, the `FIELD_TYPES has <type>` loop, which surfaced as
  "FAIL FIELD_TYPES has liquor_store / has food_truck" on the first run. Fixed in this commit; noted here so the record shows
  the test was red before it was green, not that it never broke.
- Errors: None (git LF->CRLF warnings only, pre-existing repo behaviour).


### [2026-10-25 08:20:00] - [Agent: Cline] - [D1 COMMIT 3/7: consumers] - [COMMITTED]
- Task: D1 step 3 - teach every runtime consumer that reads or writes a business type to accept the canonical slugs
  (bottlestore / foodtruck) while still resolving every legacy spelling. Five files, 35 insertions / 8 deletions.
- Files changed:
  - functions/[slug].js (kindForType: +bottlestore/bottle_store/bottle-store/liquor_store -> 'bottle_store',
    +foodtruck/food_truck/food-truck -> 'foodtruck'; header comment at :80 says the client vocabulary is unchanged)
  - functions/api/me.js:16-23 (onboardingState: bottlestore counted with bottle_store/bottle-store/liquor_store,
    accumulator is `+=` because one user can hold rows under several spellings and the GROUP BY splits them)
  - functions/api/business/link.js:14-24 (TYPES map now an accept-alias -> canonical-slug map) + :49-51
    (`TYPES[type]` lookup and `if (!type) return invalid_type`, so an unknown spelling still 400s)
  - js/eatouts-business-signup.js:107-113 (linkTypeOf: same alias set, returns canonical)
  - eatouts-customer-signup.html:1364 (onboarding favourite writes type:'bottlestore' instead of 'bottle_store')
- Verified:
  node --check clean on me.js, link.js, eatouts-business-signup.js and - because [slug].js is ESM -
  `Get-Content -LiteralPath 'functions/[slug].js' -Raw | node --check --input-type=module` (a plain `node --check` on a
  .js ESM file fails on its own `import` statement and would have "passed" a file it never parsed; the bracket in the
  filename also needs -LiteralPath, PowerShell treats [slug] as a wildcard and silently checks nothing otherwise).
  Targeted suites: node tests/venue-slug.js -> 31 checks passed; node tests/router.js -> 72 checks passed;
  node tests/venue-slug-integration.js -> all integration checks passed. The last two matter most because their
  fixtures still carry type:'bottle_store' (tests/router.js:62, tests/venue-slug.js:35) and tests/venue-slug.js:138
  still asserts meta.kind === 'bottle_store' - they are the regression proof that the alias path, not just the new
  spelling, is live.
  Full suite: node tests/run-all.js -> 57 passed, 0 failed.
- Grep sweep of what is DELIBERATELY left as legacy spelling (recorded so a future reader does not "fix" them):
  - functions/[slug].js:83 and venue-about.html:882 still EMIT kind 'bottle_store'. Only the accepted input widened;
    the client renders 'bottle_store' | 'catering' | 'restaurant' today, and changing what the page receives is a
    different change with its own blast radius (index.html card renderers).
  - tests/router.js:62, tests/venue-slug.js:35, tests/field.js:336 keep legacy fixtures on purpose - they are the
    "old rows still resolve" assertions.
  - bottle-store-onboarding.html:1544 posts type:'liquor_store'; that is a shipped alias and link.js maps it, so it
    stays until that page is rewritten for other reasons.
  - js/eatouts-field.js:741-742 seeds by 'liquor_store'/'food_truck' prefixes; aliases resolve them.
  - assets/data/business_types.js:76-95 keeps its own alias map (bottle-store, liquorStore, foodTruck, ...); it is the
    client-side normaliser that runs before any API call, so it is upstream of everything here.
- Not changed, on purpose: link.js/me.js do not accept the camelCase spellings (liquorStore, foodTruck) that
  business_types.js and eatouts-field.js do. Grep proves nothing POSTs camelCase - those two files are the only
  occurrences outside the data file - and business_types.js normalises before the request is built, so adding them to
  the server maps would be two aliases with no producer. Supplier stays split exactly as commit 1 recorded it.
- Errors: None. `git diff --stat` prints LF->CRLF warnings for all five files (pre-existing repo behaviour, Windows
  autocrlf), not a content change.


### [2026-10-25 08:36:00] - [Agent: Cline] - [D1 COMMIT 4/7: regression tests] - [COMMITTED]
- Task: D1 step 4 - lock the commit-3 behaviour in the suites, tests only (no product code in this commit).
- Files changed:
  - tests/api-business.js (+41/-1: `favourites: []` on the fake-D1 store, two fake SQL handlers -
    `SELECT * FROM users WHERE id = ?` and the onboarding `SELECT type, COUNT(*) AS n FROM favourites ... GROUP BY type`
    mirroring D1 semantics - an `me.js` import, and 5 checks)
  - tests/field.js (+14: a legacy-spelling write block before the summary, 3 checks)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Verified:
  node tests/api-business.js -> 111 checks passed (106 + 5).
  node tests/field.js -> 145/145 checks passed (142 + 3).
  What the new checks actually pin down:
    me: 'bottlestore' (migrated) counts as the bottle-store pick, 5 restaurants + 1 bottlestore => complete
    me: 'bottle_store' (pre-0015) AND 'liquor_store' (older) on the SAME user => bottleStore 2, still complete
        - this is the assertion that keeps the `+=` accumulator honest; with `=` it reads 1 and fails
    me: 5 restaurants + 2 'promo' favourites => bottleStore 0, complete false (the type allowlist is closed)
    field: a venue written with type 'bottle_store' / 'liquor_store' / 'food_truck' is stored and read back as
        bottlestore / bottlestore / foodtruck - the field module never persists a legacy spelling
  Why the fake SQL handlers were added rather than mocked: fakeDB throws 'unhandled SQL' on anything it does not
  model, so the moment me.js changes its query this suite fails loudly instead of silently returning an empty result.
- Notes: the field block writes its three venues with ids ve-t-d1-* and M.remove()s them before the summary, so the
  25-venue seed assertions and the directory-mirror counts above it are unaffected.
- Errors: None.


### [2026-10-25 09:02:00] - [Agent: Cline] - [D2 COMMIT 5/7: normaliseType] - [COMMITTED]
- Task: D2 - remove the silent 'restaurant' default from normaliseType() and stop guessing at the rows it used to swallow.
- Files changed:
  - js/eatouts-field.js:130-139 (normaliseType returns null for an unknown type, comment explains why)
  - js/eatouts-field.js:143-147 (venueDefaults keeps an untracked type verbatim: `normaliseType(type) || String(type || '')`)
  - js/eatouts-field.js:203-209 (normaliseVenue does the same for raw.business_type || raw.type || fallback)
  - js/eatouts-field.js:240-262 (allVenues() filters on the presence of `b.type || b.business_type` instead of on
    normaliseType()'s old always-truthy result, and pushes the unclassifiable rows into `_skipped`; new exported
    `skippedVenues()` returns a copy)
  - tests/field.js:114-115 (banana -> null, '' / undefined -> null), :139-142 (an untracked type is kept verbatim),
    :168-186 (bakery survives allVenues, is not a restaurant, is not in fieldVenues; a typeless row is skipped and
    reported; skippedVenues resets)
- Verified:
  node --check clean on both files. node tests/field.js -> 152/152 checks passed (145 + 7).
  Full suite: node tests/run-all.js -> 57 passed, 0 failed.
  What actually changes in behaviour:
    F.normaliseType('bakery')        'restaurant' -> null      (callers decide, the module no longer lies)
    F.venueDefaults('bakery')        business_type 'restaurant' -> 'bakery'
    F.normaliseVenue({type:'bakery'}) business_type 'restaurant' -> 'bakery'
    allVenues() row with no type     silently 'restaurant' -> left out, returned by skippedVenues()
  Why this is the fix and not a rename: normaliseType's old fallthrough meant a bakery or an event supplier row
  read through the field stack came back as a restaurant, so it was counted in the restaurant buckets and rendered
  with the restaurant label. Four call sites read the return value - venueTypeLabel (:123), venueDefaults (:146),
  normaliseVenue (:207) and the old allVenues filter (:253) - and every one of them was updated in this commit;
  there is no fifth caller (git grep normaliseType, 2026-10-25).
- Not touched, on purpose: functions/api/upload.js:34 has its own unrelated normaliseType() for content types.
  venueTypeLabel stays null-safe (FIELD_TYPES[null] is undefined -> falls back to the raw string).
- Errors: None.


### [2026-10-25 09:25:00] - [Agent: Cline] - [D3 COMMIT 6/7: one definition of money] - [COMMITTED]
- Task: D3 - give the dashboards one money coercion + one money sum, and delete the four hand-rolled reduce()s that
  could produce NaN or string concatenation.
- Files changed:
  - js/eatouts-analytics.js:117-134 (`money(v)`: null/'' -> 0, isFinite guard -> never NaN/Infinity; `sumMoney(list,
    field, alt)`: non-array -> 0, skips falsy rows, uses `alt` only when the primary field is missing/blank) and
    :190-191 (both exported). `sum()` at :113 DELIBERATELY untouched.
  - analytics-manager.html:3 (`g=o.reduce((s,x)=>s+x.total,0)` -> `EatoutsAnalytics.sumMoney(o,"total")`)
  - operator-dashboard1.html:47 (today's takings -> `sumMoney(todayOrders,"total","grandTotal")`)
  - eatouts-staff-admin1.html:889 (totalValue -> `sumMoney(orders, 'total', 'grandTotal')`)
  - eatouts-platform-analytics.html:554 (gmv -> `sumMoney(orders, 'total')`)
  - tests/money.js (new, 33 checks) + tests/run-all.js:77-78 (registered after promo-pricing.js)
- Verified:
  node --check js/eatouts-analytics.js -> clean. node tests/money.js -> 33 checks passed.
  Full suite: node tests/run-all.js -> 58 passed, 0 failed (57 + money.js).
  What each replacement fixes, measured not assumed:
    analytics-manager.html: `s + x.total` with a numeric-string total CONCATENATED ('1050'), and the first non-numeric
      total made the whole GMV 'NaN'. EO.money() then rendered 'BWP NaN'. sumMoney + money() -> 0 for garbage.
    operator-dashboard1 / staff-admin1 / platform-analytics: `Number(x.total || x.grandTotal || 0)` was already guarded
      against undefined, but not against a non-numeric string ('n/a' -> NaN -> the whole total NaN). `||` also treated a
      legitimate 0 total as missing. money() fixes both.
  The alt-column rule is the interesting one and it is pinned by two tests: `total` wins whenever it is present (even a
  legitimate 0), `grandTotal` is used only when `total` is null/''; a garbage `total` does NOT fall through to
  `grandTotal` - falling through would silently pick a different number instead of surfacing bad data as 0.
- Naming, recorded because it is confusing on purpose: `EatoutsAnalytics.money()` COERCES (returns a Number) and
  `EO.money()` (js/eatouts-manager.js:7) FORMATS (returns 'BWP 12.00'). They are different jobs with the same word, so
  analytics-manager.html uses both on the same line: sumMoney() to add, EO.money() to print. js/eatouts-brand-kit.js:351
  has a third money() that formats; out of D3 scope, untouched.
- Not touched, on purpose: `sum()` (js/eatouts-analytics.js:113) is used for non-price fields (review stars) and keeps
  `Number(x[field] || 0)`; tests/money.js asserts it still sums plain fields so a later "unify everything" pass cannot
  quietly reroute star averages through money().
- Follow-up noted, not fixed: operator-dashboard1.html:94 (`renderReports`) still reduce()s `total || grandTotal` for its
  own report total. It is the same pattern but a different widget; D3 named four sites and this was not one of them.
  Left for a decision rather than folded in silently.
- Errors: the first `node tests/money.js` run failed 1/33 - my own assertion expected 22 where the implementation
  correctly returns 20 (a garbage `total` does not fall through to `grandTotal`). The assertion was wrong, not the code;
  it is now split into the two cases it was conflating.


### [2026-10-25 09:33:00] - [Agent: Cline] - [D1/D2/D3 COMMIT 7/7: push + verify] - [COMMITTED]
- Task: close the D1/D2/D3 run - one full-suite pass, one push, and a head-to-head of local and remote.
- Files changed: docs/AGENT_CHANGE_LOG.md (this record only)
- Commits in this run (all on main, in order):
  6ebc948 feat(field): canonical bottlestore/foodtruck slugs; supplier deferred          (D1 1/7, catalog)
  a74076f feat(db): migrate bottle_store/food_truck rows to bottlestore/foodtruck        (D1 2/7, data)
  88fe549 feat(types): consumers accept bottlestore/foodtruck plus every legacy alias    (D1 3/7, consumers)
  a099aa4 test(types): pin the D1 canonical slugs at /api/me and in field writes         (D1 4/7, tests)
  3b604f3 fix(field): normaliseType returns null, no silent restaurant default           (D2 5/7)
  7517b9b feat(analytics): one money() and sumMoney(), four inline reduces retired       (D3 6/7)
  this commit                                                                            (7/7, record)
- Verified:
  node tests/run-all.js -> 58 passed, 0 failed (the 57 that existed before this run plus the new tests/money.js).
  every commit above was tested before it was made; each ledger entry records the suite output as it was seen, not
  after the fact.
  Push: 65f32fb..7517b9b main -> main, PUSH_EXIT=0. git rev-parse HEAD and git rev-parse origin/main both return
  7517b9b7f1a64fab91a29df8a50fc8ae0538e95c. git status --short empty immediately before and after the push.
- NOT run, on purpose: no `wrangler d1 migrations apply` against any remote. migrations/0015_canonical_business_types.sql
  is committed and was probed against local D1 only (commit 2 entry). Applying it to production is a separate,
  human-triggered step - the file is idempotent (UPDATE ... WHERE type = 'bottle_store'), but a live migration is not
  something this run gets to do unattended.
- Open, on purpose (recorded, not fixed):
  1. supplier vs event_supplier stays split (human option A). 315 `supplier` rows in business_links, 0 `event_supplier`;
     js/eatouts-field.js still maps supplier -> event_supplier on read. Unifying it is a data decision.
  2. operator-dashboard1.html:94 (renderReports) still reduce()s `total || grandTotal`. Same shape as the four sites D3
     retired, but it was not one of the four named sites.
  3. functions/[slug].js and venue-about.html still EMIT kind 'bottle_store' to the client. D1 widened the accepted
     input only; changing what the page receives is its own change with its own consumers.
- Errors: None in this commit. The only failure in the whole run was self-inflicted and is already recorded under
  commit 6 (a wrong test expectation, fixed in the test not in the code).


### [2026-10-27 01:47:40] - [Agent: TierMux] - [Status: COMMITTED]
- Task: Update EatOuts_Directory_Subscription_Agreement.docx per Directory_Subscription_Agreement_Update.txt (onboarding fees by category, monthly subscription from 1 Jan 2027, P50/promo, remove Direct Customer Relationship & Zero Commission, email in 3.3, subscriber categories, schedule A fees).
- Files changed: docs/EatOuts_Directory_Subscription_Agreement.docx
- Commit: PENDING
- Push: PENDING
- Notes: Rewrote clause 2 (onboarding + monthly + promo), added 1.4 categories, removed old 2.2, renumbered operational boundaries to 2.4, updated 1.1/1.2, schedule A fees row + business category row, 3.3 email. Verified docx opens with python-docx.
- Errors: None

### [2026-10-29 23:57:51] - [Agent: Big Pickle] - [G1: no visible scrollbars] - [COMMITTED]
- Task: Phase 0 / G1 of `PLATFORM UPDATE TASKS.md` - remove every visible scrollbar in the project.
- Files changed: 48 root `*.html` (global `::-webkit-scrollbar` + `*{scrollbar-width:none}`), `assets/eatouts-manager.css` (same rules; covers manager pages that have no inline `<style>`), `eatouts-login.html` (body lock + `height:100dvh`), `operator-businesses.html` (body lock + `height:100dvh`), `PLATFORM UPDATE TASKS.md` (new plan).
- Verified: `node tests/html-catalog.js` -> 9 checks, 69 pages, PASSED; `node tests/appshell.js` -> PASSED; `node tests/smoke.js` -> PASSED; `npm run inventory` -> PASSED (10 checks, 82 warnings, all pre-existing stale line numbers); audit script -> 0 root pages without a scrollbar rule.
- NOT verified: no visual browser pass (CSS-level change). The full `npm test` run exceeded a 5-minute window and was not completed for this commit; the three suites above were run individually.
- Errors: one transient `pwsh.dll` launch error from the shell tool; retried successfully.
- Note: this commit also carries a pre-existing uncommitted ledger entry dated 2026-10-27 (TierMux, docx task) that was already in the working tree. The docx it references remains untracked and was not touched.

### [2026-10-30 00:01:43] - [Agent: Big Pickle] - [G2: remove accordion indicators] - [COMMITTED]
- Task: Phase 0 / G2 of `PLATFORM UPDATE TASKS.md` - no `^`, `v`, up/down arrows, `+`, `-` accordion indicators anywhere.
- Files changed: `eatout_event_builder.html` (Preview Visibility chevron + its rotate CSS), `intake.html` (section chevron + its rotate CSS), `eatouts-suppliers.html` (`.cat-chev` + its rotate CSS), `get-started.html` (FAQ `::after` plus/minus marker).
- Verified: `node tests/builder-preview.js` -> PASSED; `node tests/intake8.js` -> PASSED; grep for the chevron glyphs and class="chev"|cat-chev|\.chev|content:"+"` -> 0 hits in root `*.html` and `js/*.js`.
- NOT verified: no visual browser pass. `tests/_inline2.js` is a test fixture that still contains a chevron; it is not shipped and was left untouched.
- Scope: qty steppers (`&minus;` buttons in index.html) were intentionally kept - they are quantity controls, not accordion indicators.

### [2026-10-30 00:18:09] - [Agent: Big Pickle] - [G3: floating popups] - [COMMITTED]
- Task: Phase 0 / G3 of PLATFORM UPDATE TASKS.md - every sheet/modal floats centred with equal side gaps, closes on outside tap and Escape, and no beige circular close button remains.
- Files changed (17 pages + 1 test):
  - eatout_event_builder.html - scrim centred + 16px padding, .fpop 420px/80dvh/16px, .fpop-close -> .fpop-x (plain X), Escape handler.
  - customer-delivery, driver-delivery, restaurant-delivery, eatouts_feedback - .sheet-scrim centred, .sheet 420px/80dvh/16px.
  - intake, gallery-onboarding, menu-onboarding, event-onboarding, promo-onboarding, caterer-onboarding, eatouts-blog - .modal-scrim centred + padding, .modal 420px/80dvh/16px.
  - eatouts-suppliers - .scrim centred, .sheet 420px/80dvh/16px.
  - eatouts-favourites - #fdbs centred, .fdbsheet 420px/80dvh/16px, Escape handler.
  - operator-dashboard1, restaurant-dashboard - inline order/report sheets centred.
  - Escape handlers added to intake, gallery-onboarding, menu-onboarding, promo-onboarding, event-onboarding, eatouts-suppliers, eatouts_feedback, driver-delivery, restaurant-delivery, eatouts-blog, eatouts-favourites.
  - tests/builder-suppliers.js - closes the popup via .fpop-x.
- Deliberate exception: index.html .fpop is an anchored popover (header menu / month picker), not a modal sheet. It already floats with equal 16px side insets and was left unchanged. Flagged for user review.
- Verified: popups, builder-suppliers, builder-preview, intake8, delivery, checkout-delivery, about, venue-about-options, html-catalog, appshell, smoke -> all PASSED; grep -> 0 .fpop-close outside dist/.
- NOT verified: no visual browser pass. staging/package/*.html are tracked copies and were not regenerated (they are not build output).
### [2026-10-30 00:34:24] - [Agent: Big Pickle] - [G4: 90px thumbnails] - [COMMITTED]
- Task: Phase 0 / G4 of PLATFORM UPDATE TASKS.md - standard content thumbnail is 90x90 square with rounded corners; 150px only where a task specifies.
- Files changed (18 pages):
  - index.html - .mthumb 54->90, .bev-item .mthumb 54->90, .co-thumb 52->90, .rthumb 54->90, .rthumb .eo-thumb 54->90.
  - eatout_event_builder.html - .venue-card-thumb 56->90, .sup-slot-thumb 44->90, .menu-item-thumb 44->90, .pit-thumb 52->90; .sup-profile-avatar 96->150, .prompt-thumb 96->150 (specified 150px).
  - eatouts-suppliers.html - .pf-thumb 64->90.
  - designer-services.html - designerAvatarHtml(d, 56) -> 90.
  - menu-onboarding.html - .item-row .thumb 44->90.
  - eatouts-blog.html - .admin-post-thumb 54->90.
  - eatouts-checkout-summary, eatouts-addresses, blog-creator-dashboard, delivery-manager, eatouts-admin-dashboard, eatouts-events - .sec-thumb 48->90.
  - caterer / bakery / bottle-store / mobile-kitchen / restaurant / supplier-onboarding - .branch-editor-head .thumb 62->90, .image-preview 84->90 and 66->90, .gallery-record grid 66px->90px.
- Deliberately unchanged (D3): venue-about .promo-thumb (carousel keeps layout size), designer-services .mosaic cells (decorative), brand marks, caterer .branch-card .thumb (compact branch-selector chip, not a content thumb), and the _archive_local / staging copies.
- Verified: 38 suites PASSED (html-catalog, inventory, smoke, appshell, all builder-*, beverages, blog, designer-services, venue-about-menu/options, business-*, onboarding-bridge, router, contracts, and more); no sub-90 content thumb remains outside _archive_local/dist/staging.
- NOT verified: no visual browser pass at 360/390/430px widths.

### [2026-10-30 08:05:00] - [Agent: Cline] - [G5: doc/ledger baseline + verification pipeline green] - [COMMITTED]
- Task: Phase 0 / G5 of PLATFORM UPDATE TASKS.md - refresh the generated docs, prove the doc pipeline is green, and close the G4 commit-hash placeholder.
- Files changed: HTML_CATALOG.md (regenerated by `npm run catalog`, never hand-edited), PLATFORM UPDATE TASKS.md (0.5 G5 ticked, G4 commit cell -> 7b90571, G5 progress row added, stray blank lines removed from the progress table).
- Pipeline: `npm run catalog` -> "Wrote HTML_CATALOG.md (69 pages, 1093 lines)"; diff is generated-date plus size/line-count churn only (no structural drift, meta JSON untouched).
- Verified: html-catalog PASSED (9 checks, 69 pages); `npm run inventory` PASSED (10 checks, 87 warnings - 86 pre-existing stale line refs in PAGE_INVENTORY.md, recorded as the accepted baseline for G5); all 58 suites in tests/run-all.js PASSED when run in 4 batches (15 + 16 + 15 + 12, every exit=0). A single `npm test` run still exceeds the shell window, so batched runs remain the verification method.
- Not changed: PAGE_INVENTORY.md line refs (baseline recorded, not fixed - the refs shift again in T11/T17), copy-static.mjs, scripts/html_catalog.meta.json (no new pages yet).
- NOT verified: no visual browser pass (unchanged from G1-G4).


### [2026-10-30 08:40:00] - [Agent: Cline] - [T01: promo body text 16px] - [COMMITTED]
- Task: user task 1 - the promo card body copy reads at 16px instead of 10-15px.
- Files changed: index.html (new `.pmeta` base class replacing three inline micro-sizes; scoped `#shell.promos-tab` block after the `.ecard` rules; `renderFeaturedCard` tagline, `renderPromoCard` meta line and `renderPromoDetail` meta line now use `.pmeta`), HTML_CATALOG.md (regenerated by `npm run catalog`, index.html 10000 -> 10025 lines).
- Scope: scoping is `#shell.promos-tab`, so the promo feed, the promo detail page and the locked 18+ card are affected; restaurant menus, favourites and every other tab keep their existing sizes. Headings (`.phead-btn h3` 17px, card `h3` 19px) and the uppercase section label `.subh` (10px) are deliberately untouched.
- Verified: ad-hoc jsdom probe (temp file, not committed) - 18/18 - promos-tab `.pbody` / `p` / `.mdesc` / `li` / `.phl li` / `.pprice` / `.pwas` / `.pmeta` / `.chip` / `.ctr .lbl` / `.pl-copy` / `.pl-btn` / `.promo-venue-name` all compute 16px; with the class removed the same nodes compute 12px / 15px / 11px, proving the scope; 14 suites PASSED with 0 failures (smoke, checks, promocats, popups, appshell, customer, gallery, restloc, money, contracts, router, content, age-gate, beverages); html-catalog PASSED (9 checks, 69 pages); inventory PASSED (10 checks, 87 warnings).
- NOT verified: no 360px/390px/430px device or browser pass - jsdom does not lay out, so text wrapping/overflow on the expanded promo card still needs an eyeball.


### [2026-10-30 09:05:00] - [Agent: Cline] - [T10: reserve-cats .phead gap] - [COMMITTED]
- Task: user task 10 - remove the white strip above the "Plan Event" band on the reserve category page.
- Files changed: index.html (`renderReserveCats` - inline `margin-top:12px` on `.phead` removed, comment added explaining why), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Cause: `.scroll` (index.html:68) is `background:#fff` with no padding, so a top margin on the first child paints as a white band above the grey `.phead`.
- Scope: one renderer only - `reserve-groups`, `reserve-events` and `reserve-venue` still carry `padding-top:20px;margin-top:12px` (they sit under a `.crumb`), and the `.phead` rule itself was not touched.
- Verified: ad-hoc jsdom probe (temp, not committed) 6/6 - `.phead` computed `margin-top:0`, `padding-top:20px`, first element of `.scroll`, category rows still render; 12 suites PASSED 0 failures (customer, checks, smoke, appshell, popups, contracts, money, promocats, gallery, restloc, router, field); html-catalog PASSED; inventory PASSED (87 warnings).
- NOT verified: no visual/browser pass at 360px.


### [2026-10-30 09:20:00] - [Agent: Cline] - [T19: about-legal 16px] - [COMMITTED]
- Task: user task 19 - legal document reader text must be 16px.
- Files changed: index.html (`.legal-sec` 13px -> 16px/1.45, `.legal-para` 13px -> 16px/1.6; section margins 4->6px and 8->10px for breathing room), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Scope: `.legal-sec` / `.legal-para` are used only by `renderLegalDoc` (index.html:8686-8688), so no other page is affected. `.phead h2` title size untouched.
- Verified: ad-hoc jsdom probe (temp, not committed) 7/7 - both classes compute 16px with the new line heights, renderer still emits both classes, no `font-size:13px` legal rule remains, global `::-webkit-scrollbar` hide still present; 6 suites PASSED 0 failures (customer, checks, smoke, content, about, appshell); html-catalog PASSED; inventory PASSED (87 warnings).
- NOT verified: no visual/browser pass at 360px.


### [2026-10-30 09:40:00] - [Agent: Cline] - [T02: bev-toggle thumb + inactive opacity] - [COMMITTED]
- Task: user task 2 - drop the white highlighter behind the active Restaurants/Catering/Bakery/Beverages tab, wash the inactive tabs down to 15%.
- Files changed: index.html (`.bev-toggle-thumb` background `#fff` -> `transparent`; `.bev-toggle-btn` `font-weight:700` -> `500` and `opacity:.15`; `:active` now resets `opacity:1`; transitions gained `opacity`), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Decision: the plan allowed deleting the thumb or making it transparent. Chose transparent because `tests/beverages.js:57` asserts `.bev-toggle-thumb` exists and `tests/bakery-directory.js:96,123` assert `setBevToggleThumb()`; deleting the element would have required edits to 3 files for no visual gain.
- Active state is now weight + opacity only (500 vs 700, .15 vs 1); colour is unchanged for both, so the strip keeps its blue palette.
- Verified: ad-hoc jsdom probe (temp, not committed) 8/8 - thumb transparent, inactive .15/500, active 1/700, no white thumb rule left, renderer still emits the thumb, `.on` still set; 6 suites PASSED 0 failures (beverages, bakery-directory, customer, checks, smoke, appshell); html-catalog PASSED; inventory PASSED (87 warnings).
- NOT verified: no visual/browser pass - 15% may read too faint on a real panel, worth a device look at 360px.


### [2026-10-30 09:55:00] - [Agent: Cline] - [T14: business-signup standard header] - [COMMITTED]
- Task: user task 14 - the business signup landing page still used the old `.appbar` with an "E" dot badge.
- Files changed: eatouts-business-signup.html (`.appbar` + `.brand-mark` + `.brand-mark .dot` CSS replaced by the `venue-about.html:63-67` header block; markup replaced by the standard `<header id="hdr" data-act="closePickers">`), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Deletions proved safe by grep: no remaining `.appbar` selector, no `class="dot"`, no JS hooking either.
- Behaviour change logged in the plan doc: the brand mark used to be an `<a href="index.html#promos">`; it is now the standard `<button>`, so this page loses that home link, matching the rest of the app.
- Verified: ad-hoc jsdom probe (temp, not committed) 12/12 - single header, id/data-act/type/aria-label/img src+alt correct, logo file present, `.hdr-chip` computes `display:none`, no appbar/dot leftovers, 58px header rule intact; 8 suites PASSED 0 failures (business-auth, business-profiles, api-auth-flow, onboarding-bridge, customer, about, smoke, appshell); html-catalog PASSED; inventory PASSED (87 warnings).
- NOT verified: no visual/browser pass - vertical rhythm between the new white header and the `.content-sheet` card should be eyeballed at 360px.


### [2026-10-30 10:10:00] - [Agent: Cline] - [T20: operator-businesses standard header] - [COMMITTED]
- Task: user task 20 - the operator businesses hub still opened with the dark `.topbar` and duplicated its title in the header.
- Files changed: operator-businesses.html (`theme-color` `#171719` -> `#ffffff`; `.topbar`/`.brand-info`/`.brand-name` CSS replaced by the standard `#hdr` block; header markup replaced; body `.page-title` renamed "Businesses" -> "My businesses" and promoted from `h2` to `h1` since the header no longer owns the page heading), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Deletions proved safe by grep: no `.topbar`, `.brand-info` or `.brand-name` selector, attribute or JS reference remains.
- Verified: ad-hoc jsdom probe (temp, not committed) 15/15 - single `#hdr`, logo src/alt + file present, chip `display:none`, exactly one `h1` reading "My businesses" inside `.page-head`, header carries no heading, no old rules, 58px header rule intact, white theme-color; 8 suites PASSED 0 failures (login, business-auth, business-profiles, customer, smoke, appshell, checks, api-business - the last covers the businesses list API); html-catalog PASSED; inventory PASSED (87 warnings).
- NOT verified: no visual/browser pass - the white header on the `#E7E9ED` body shell should be eyeballed at 360px.


### [2026-10-30 10:45:00] - [Agent: Cline] - [T11: reserve drill-down pheads] - [COMMITTED]
- Task: user task 11 - the three reserve drill-down bands should be 2% black and sit flush under the breadcrumb; provider thumbs 90x90.
- Files changed: index.html (new scoped rule `#shell .screen[data-page="reserve-groups"|"reserve-events"|"reserve-providers"] .phead{background-color:rgba(0,0,0,.02)}` after the base `.phead` rules; `margin-top:12px` removed from the inline `style` in `renderReserveGroups`, `renderReserveEvents` and `renderReserveProviders`, `padding-top:20px` kept), HTML_CATALOG.md (regenerated), PLATFORM UPDATE TASKS.md.
- Scoping: the screen id arrives on `.screen[data-page]` via `renderViewport` (index.html:6518), so promos / menu / venue-about pheads keep the base `rgba(211,211,211,.2)` tint. `reserve-cats` deliberately keeps that base tint - task 10 only covered its gap. Flagged as a look-alike inconsistency (4% crumb above a 2% band on the drill-downs vs ~2.9% grey on cats) rather than silently widening scope.
- Step 2 needed no code change: the G4 pass already made `.rthumb` 90x90 / radius 15 / `overflow:hidden`, and `.rthumb .eo-thumb` 90x90, so the provider rows already compute 90px. Verified rather than re-declared.
- Verified: ad-hoc jsdom probe (temp, not committed) 16/16 - all three pheads compute `rgba(0,0,0,0.02)`, all three `margin-top` `0px`, each `.phead` is immediately after `.crumb`, `reserve-cats` still `rgba(211,211,211,0.2)`, provider rows render with every `.rthumb` exactly 90x90 (radius 15px, overflow hidden, inner `.eo-thumb` 90px), no `phead` inline `margin-top` left anywhere; 7 suites PASSED 0 failures (appshell, promocats, venue-slug, business-client, business-profiles, business-promos, onboarding-bridge); html-catalog PASSED.
- NOT verified: no visual/browser pass - the 2% band vs the 4% crumb above it is a very small step, worth one look at 390px.


### [2026-10-31 09:20:00] - [Agent: Big Pickle] - [T17: blog cleanup] - [COMMITTED]
- Task: user task 17 - strip the blog's chip/tag/decoration layer and move the search box down above the bottom nav.
- Files changed: eatouts-blog.html (removed `.hdr-chip`/`.hdr-back`/`.page` CSS + markup, `.tag-strip`/`.tag-pill`, `.tl-card-foot`/`.tl-card-tags`/`.tl-card-tag`, `.post-tags`/`.post-tag`, `.blk-heading`, both timeline `::before` rules; deleted the `copyLink` button and the stale header comment; `.search-wrap` moved out of `#viewport` to sit above `#bottomNav` as `flex:0 0 auto`, not sticky), js/eatouts-blog.js (removed `paintHeader`, the `heading` block type + renderer, the tag-strip builder, card tags/foot, post tags, `copyLink` handling), tests/blog.js (the tag-pill test became `timeline renders no tag strip`).
- Behaviour kept: `#tag-` hash deep links still boot the tag filter and `?post=` OG tags are untouched; the search input lives outside the viewport now, so the page-shell listeners keep it in sync across re-renders.
- Verified: `node tests/blog.js` 23/23 PASSED; `npm run catalog`; `npm run inventory`; full `npm test`.
- NOT verified: no visual/browser pass - the new bottom search bar should be eyeballed at 360px against the bottom nav safe area.


### [2026-10-31 10:05:00] - [Agent: Big Pickle] - [T23-T28: Phase 6 UI polish] - [COMMITTED]
- Task: the six Phase 6 quick wins from `PLATFORM UPDATE TASKS.md`.
- Files changed: index.html (only), assets/icons/search_icon.webp (new), PLATFORM UPDATE TASKS.md, FEATURES.md, HTML_ASSESSMENT.md, scripts/html_catalog.meta.json, HTML_CATALOG.md.
- T23: `.cal` background `#ffffff` -> `rgba(0,0,0,.03)`.
- T24: new `#shell .screen[data-page="reserve-cats"] .cat-name{font-size:20px}` after the `.evcat` 30px rule.
- T25: `.bev-toggle-btn` base `opacity:.15` -> `.4`; deleted the `:first-of-type`/`:last-of-type` justify overrides so the four tabs are evenly spaced.
- T26: the gallery search button now renders `<img class="cbtn-ico-img" src="assets/icons/search_icon.webp" alt="Search">`; new `.cbtn.ic .cbtn-ico-img{18x18, contain}` rule; icon is a warm-grey glyph (avg rgb 178,169,152) on the black button, visible without a filter.
- T27: removed the four inline chip-row divs (restaurant promo detail, promos-feed detail, event lineup detail). **Deviation:** `featChipRow` now returns plain `.ctr`/`.lbl` rows instead of `""`, because blanking it dropped the featured-event ticketing/sponsor/hashtag content and broke 5 `tests/smoke.js` assertions. Chip rows are gone; the information is not.
- T28: `.gal-cell` loses `aspect-ratio:1`, gains `max-height:40vh` + `overflow:hidden`; `.gal-cell>img` is `width:100%;height:auto;max-height:40vh;object-fit:cover`; `.gal-grid` gains `align-items:start` so short images do not stretch their cell. Infinite scroll untouched.
- Verified: ad-hoc jsdom probe 25/25 (temp, not committed); `npm test` 58 passed / 0 failed; `npm run catalog` (69 pages, 1095 lines); `npm run inventory` PASSED (86 warnings); `node tests/smoke.js` PASSED; `node tests/customer.js` PASSED.
- NOT verified: no device/browser pass. T23's 3% band and T28's natural-height grid should be eyeballed at 360/390px; the 40vh cap may leave ragged row bottoms by design.


### [2026-10-31 11:40:00] - [Agent: Big Pickle] - [T15: onboarding headers] - [COMMITTED]
- Task: standardise the header on the 7 onboarding pages (`PLATFORM UPDATE TASKS.md` T15).
- Files changed: restaurant-onboarding.html, caterer-onboarding.html, bakery-onboarding.html, bottle-store-onboarding.html, mobile-kitchen-onboarding.html, supplier-onboarding.html, eatouts-login.html, PLATFORM UPDATE TASKS.md, HTML_ASSESSMENT.md, PAGE_INVENTORY.md, scripts/html_catalog.meta.json, HTML_CATALOG.md.
- Each page: dark `<header class="topbar">` replaced by the standard `<header id="hdr" data-act="closePickers">` (logo anchor to `index.html#promos`, `.hdr-right`, hidden `.hdr-chip`); `.topbar`/`.topbar-row`/`.brand`/`.brand-title`/`.brand-subtitle` (login keeps it)/`.draft-pill` CSS deleted; old orange `.brand-mark` square replaced by the 34px logo mark.
- Setup completeness: kept the same IDs, moved into a new light `.progress-strip` under the header; `.progress-row`/`strong`/`.progress-track` re-coloured from the dark palette to #8a7d64 / #c84513 / #e8e2d4.
- Draft mode pill: markup and CSS gone. `#saveIndicator` survives as a hidden sink because the autosave JS writes to it unconditionally — removing the element outright would throw. Autosave is now silent (no visible "Saved locally" feedback).
- login: keeps `#brandSub` (hidden; JS still swaps its text per view) and the `Secure` pill, re-coloured light; `18+` pill on bottle-store kept and re-coloured.
- G1: `html,body{height:100%;margin:0;overflow:hidden;overscroll-behavior:none}` on all 7; every `#shell`/`#app-shell` already used `height:100dvh`.
- Deviation: the standard block uses an `<a class="brand-mark" href="index.html#promos">` rather than the `<button>` used by T14, because `tests/appshell.js` requires a logo anchor with that href on merchant pages (`restaurant-onboarding.html`).
- Verified: static probe (15 checks × 6 pages + login, incl. no `.topbar`, one `#hdr`, theme-color white, document lock); jsdom runtime probe 62/62 with 0 window errors (all 7 pages boot, `#hdr` 58px white, progress text updates, no `.topbar` in the DOM); `npm test` 58 passed / 0 failed; `npm run catalog` (69 pages, 1096 lines); `npm run inventory` PASSED (79 warnings).
- NOT verified: no device/browser pass. The white header now sits directly above the still-dark `.intro` hero and the dark merchant `.tabs` strip on the five onboarding pages — that contrast needs a look at 360px. Forms were not submitted end-to-end (jsdom only proves the scripts run without errors).


### [2026-10-31 12:35:00] - [Agent: Big Pickle] - [T03: restaurant row focus + scroll lock + dim] - [COMMITTED]
- Task: `ritem` focus, scroll lock and 25% dim (`PLATFORM UPDATE TASKS.md` T03).
- Files changed: index.html, PLATFORM UPDATE TASKS.md, FEATURES.md, HTML_ASSESSMENT.md, scripts/html_catalog.meta.json, HTML_CATALOG.md.
- CSS: `.ritem` transition gains `opacity .18s ease`; new `.scroll.has-open .ritem:not(.open){opacity:.25;pointer-events:none}` and `body.ritem-locked .scroll{overflow:hidden;touch-action:none}`.
- JS: `syncRestAccordions()` now tracks the open element, clears `.has-open` from every list, toggles `body.ritem-locked`, adds `.has-open` to the open row's own `.scroll`, and calls `scrollIntoView({block:"center",behavior:"smooth"})` only when the open id changes (new module-level `restAccFocused`). Guarded with `if(openEl.scrollIntoView)` because jsdom has no implementation.
- Cleanup: `render()` now calls `syncRestAccordions()` after `renderViewport()`, so every navigation re-derives the lock from the DOM and clears it when no row is open. `closeAllRitemAccordions()` already routes through the same function.
- Scope note: the dim class goes on the open restaurant's own `.scroll`, so the catering / bakery / beverages panels that sit in sibling `.bevpage` containers are untouched.
- Verified: `%TEMP%\opencode\probe-t03.js` 23/23 (open sets `.open`/`has-open`/`ritem-locked` and calls `scrollIntoView` once; sibling computes opacity 0.25 + pointer-events none; close restores; reopen scrolls again; Promos tab leaves no lock or `.has-open`); `npm test` 58 passed / 0 failed; `npm run inventory` PASSED (79 warnings); `npm run catalog` (69 pages, 1097 lines).
- NOT verified: no phone pass. The smooth centring, the 0.25 dim and the "list cannot scroll while open" feel should be checked on a real long list at 360px.


### [2026-10-31 13:05:00] - [Agent: Big Pickle] - [T07: standardised filter bar] - [COMMITTED]
- Task: one filter bar across the directory screens (`PLATFORM UPDATE TASKS.md` T07).
- Files changed: index.html, tests/beverages.js, PLATFORM UPDATE TASKS.md, FEATURES.md, HTML_ASSESSMENT.md, scripts/html_catalog.meta.json, HTML_CATALOG.md.
- New `renderFilterBar(cfg)` emits `<div class="rest-filter-controls">` with a search row and a `Town | Area | Cuisine/Type` row; the food branch and the bottle-store branch both call it (previously two hand-written blocks with different layouts).
- Food directory gained a real live search: new `state.restQuery`, `#restSearch` handler mirrors the `#bottleSearch` pattern (capture caret, `render()`, restore focus + caret), `filteredRestaurants()` filters through the existing `restaurantNameMatches()`, and `_restList.sig` + `cbarKey()` include the query.
- CSS: `.rest-filter-row .cbtn` and `.align-right` are centred, `.rest-filter-controls .rest-filter-row .cbtn` is 16px, `.town-scroll` hides its scrollbar, `.az-rail` background is `rgba(0,0,0,.03)`.
- Removed `<span class="loc-count">` from all six `.loc-all` "All" rows (promo town, restaurant town, bottle town, gallery restaurant/town/area). Town/area row badges are untouched.
- Scope deviation: catering and bakery panels keep their bar hidden. Neither has town/area/type filter data (`cateringBrands()` exposes no type, `bakeryBrands()` only name/town/area), so enabling the standard bar there would show buttons that do nothing. `state.cateringQuery` remains reserved for when that data lands. This is a data decision, not a CSS one.
- Tests updated: `tests/beverages.js` asserted the old design (18px labels, All Towns left, Type right). Those four checks now assert 16px + centred, matching T07 step 5. No other assertions changed.
- Verified: `%TEMP%\opencode\probe-t07.js` 30/30 (shared builder; bar hidden then 2nd-tap open; 12px padding; three 16px centred buttons; search narrows 1..n, nonsense shows `.empty`, clearing restores; All row badge-free with town badges intact; even 8px town-scroll padding; bottle bar + labels; gallery All row; zero window errors); `npm test` 58 passed / 0 failed; `npm run inventory` PASSED (79 warnings); `npm run catalog` (69 pages, 1098 lines).
- NOT verified: no device pass. The 16px centred labels, the tinted A-Z rail and the longer "All Cuisines" label at 360px should be eyeballed. Food search is synchronous (like the existing bottle search) rather than the brief's ~120ms debounce — the list re-render is cheap and debouncing would fight caret restoration.


### [2026-10-31 22:01:00] - [Agent: Big Pickle] - [T08: Back History popup (SPA)] - [COMMITTED]
- Task: activate the header logo + Back History popup (`PLATFORM UPDATE TASKS.md` T08), SPA half only.
- Files changed: index.html, PLATFORM UPDATE TASKS.md, FEATURES.md, HTML_ASSESSMENT.md, SESSION_NOTES.md, scripts/html_catalog.meta.json, HTML_CATALOG.md.
- State: new `historyOpen:false` flag.
- History store: `sessionStorage` key `eatouts.history.v1`; `histRead()` / `histWrite()`, newest first, deduped by `histKey()`, capped at `HIST_MAX=5`. `recordHistory()` runs from `render()` and writes `{key,label,snap,t}`.
- Snapshot: `histSnap()` captures tab, `restPanel`, open venue, `restaurantView` (id/brand/view), promo id/view/gallery/expanded, gallery view, reserve breadcrumb and operator view. `restoreHistory()` re-applies it, clears transient popups/pickers/menu/checkout flags, re-sets the bridge active venue and renders. The SPA has no hash router, so a snapshot is the only reliable restore path.
- UI: `openBackHistory()` / `renderBackHistory()` build `#hist-pop` on demand in `body` - `.hist-wrap` flex-centred, blurred `.hist-scrim`, white `.hist-pop` dialog, uppercase "Recent pages" heading, rows with `.lab` + `.ago` (`now` / `Nm` / `Nh` / `Nd`), empty state "No recent pages yet.". No `.fpop-close`; scrim tap, Escape and a tap on an entry all close it.
- Behaviour change: the SPA logo now opens Back History instead of resetting to the Promos home (the Promos tab keeps that role). `homeTap` keeps its name because `tests/appshell.js` greps for it.
- Deferred (T08b): the 48 pages still on `.topbar` / `.appbar` / `.topbar-row`, converting `brand-mark` anchors to buttons on standalone pages, and `tests/appshell.js:80`'s logo-anchor assertion. Standalone `pagehide` recording is not wired; `restoreHistory()` already navigates entries that carry `href`.
- Verified: `%TEMP%\opencode\probe-t08.js` 26/26 (boot records Promos with a snapshot; no popup until the logo is tapped; tab switch records the new screen; venue Menu records "<name> · Menu"; popup centred, 3 rows, relative times, no `.fpop-close`, newest first; entry tap restores the screen and closes; Escape and scrim close; 5-entry cap; no duplicate keys; empty state; zero window errors); `npm test` 58 passed / 0 failed; `npm run inventory` PASSED (79 warnings); `npm run catalog` (69 pages, 1,098 lines).
- NOT verified: no device pass - popup shadow, row rhythm and the blur scrim at 360px.


### [2026-10-31 23:45:00] - [Agent: Cline] - [T04: venue-checkout redesign] - [COMMITTED]
- Task: close out `PLATFORM UPDATE TASKS.md` T04 (all 11 bullets) - the last two were the WhatsApp Review screen (bullet 10) and the recipient popup (bullet 11).
- Files changed: `index.html`, `tests/checkout-delivery.js`, `PLATFORM UPDATE TASKS.md`, `PAGE_INVENTORY.md`, `FEATURES.md`, `SESSION_NOTES.md` (gitignored working notes), `scripts/html_catalog.meta.json`, `HTML_CATALOG.md` (regenerated), `docs/AGENT_CHANGE_LOG.md`.
- Prep fix: the `/* PAGE: venue-checkout - Checkout */` banner used a hyphen, but `tests/inventory.js:80` and `scripts/update-inventory.mjs` both require an em dash - restored `—`, which un-reds `inventory.js` (it was the only failing suite).
- Bullet 10 - new SPA screen `venue-checkout-review` (`PAGE: venue-checkout-review — WhatsApp Review`, `renderCheckoutReview()`): read-only preview of `esc(buildFullBillMessage())` inside `.wa-review-body{white-space:pre-wrap}`, so the preview is byte-identical to what `waLink()` sends. Wired in four places - `page("venue-checkout-review", …)` gate in `renderRestaurantSubView`, `PAGE_TITLES["venue-checkout-review"]="WhatsApp Review"`, `case "venue-checkout-review"` in `pageRef()` (returns the venue id), and the banner comment. Entry point is a new `.co-wa-row` flex row next to **Send via WhatsApp** (`openWaReview`), which captures the name/contact/notes inputs and reuses the same validation as `waOrder`.
- Gate shape: `if(state.checkoutView) return state.checkoutReview ? page("venue-checkout-review",renderCheckoutReview()) : page("venue-checkout",renderCheckout());` - chaining on `checkoutView` means every existing reset of that flag also hides the review; `checkoutReview:false` added to `state`, cleared in `openCheckout`, `backFromCheckout`, `backFromWaReview` and `deleteSummaryConfirm`.
- Bullet 11 - `waOrder` no longer navigates. After the existing validation it still calls `bridgeDraftOrder("menu")` + `notifyFieldOrder(curRestaurant())` (unchanged draft/analytics contract), then opens `state.cardAlert` with two stacked actions: `waSendVenue` (primary) → `waLink(buildFullBillMessage(),curRestaurant(),"order_checkout","act=waOrder")`, and `waSendContact` → `summarySignup()` when `!aboutUser()`, else `waShareLink(buildFullBillMessage())` (the same `wa.me/?text=` OS chat picker `waSplitPerson` uses - no contacts API, no new dependency). `.card-alert-actions` is already `flex-direction:column`, so the buttons stack as the brief asks.
- CSS: `.co-wa-row{display:flex;gap:9px}` + `.co-wa-row .btn{flex:1}`, `.wa-review*` card, and the review page joins the 3% grey page background (`#shell .screen[data-page="venue-checkout-review"] .scroll/.pad`).
- Docs: T04 ticked in both tables + full 11-bullet completion block; progress-log row; `PAGE_INVENTORY.md` Part 2 row (`renderCheckoutReview()`, 31 screens); `FEATURES.md` checkout bullets rewritten (Order Summary card, live totals, recipient choice, WhatsApp Review, Save/Delete); catalog changelog entry in the meta JSON, `HTML_CATALOG.md` regenerated (69 pages, 1,100 lines).
- Tests: `tests/checkout-delivery.js` +5 checks (review button present, `renderCheckoutReview()` emits `.wa-review-body` + `backFromWaReview`, the gate expression, `waSendVenue`/`waSendContact`/`order_checkout` wiring). Note: the suite cannot drive the route end-to-end - after `restoreOrder()` the SPA still renders `restaurants-pager` (no `restaurantView`), so the checkout gate never runs.
- Verified: `npm test` 58 passed / 0 failed; `node tests/inventory.js` INVENTORY PASSED (19 checks, 69 pages, 31 screens); `npm run catalog` 69 pages / 1,100 lines; `node tests/checkout-delivery.js` PASSED with 0 window errors.
- NOT verified: no device pass at 360/390/430px - jsdom does not lay out, so the two-up `.co-wa-row` buttons and the `.wa-review` card are unchecked visually.
- Left untouched (pre-existing working tree, not this task): `assets/images/services/logo_cleanup.png` deleted + untracked `logo_cleanup.jpg`, `SYNC REGION TASK/`, `docs/Directory_Subscription_Agreement*`.



### [2026-10-31 23:58:00] - [Agent: Cline] - [T06a: Orders-List.html] - [COMMITTED]
- Task: `PLATFORM UPDATE TASKS.md` T06 steps 4-5 - the orders list page itself (header counter + `.hdr-chip` sweep follow in T06b/T06c).
- Files: `Orders-List.html` (new), `js/eatouts-customer.js` (new public `refresh()`), `tests/orders-list.js` (new), `tests/run-all.js` (suite registered), `copy-static.mjs` (FILES), `scripts/html_catalog.meta.json` (page 70), `PAGE_INVENTORY.md`, `HTML_PAGES.md`, `HTML_CATALOG.md` (regenerated), `docs/AGENT_CHANGE_LOG.md`.
- Page: standard `#hdr` (`.brand-mark` button + `.hdr-right` orders counter) and `.appnav`; 3% grey `.pad`; **Order Groups** keyed by `orderRef || venueName`; **Order Summary Cards** with the 90px thumb on the RIGHT and title + item count/total on the left; tap -> `eatouts-checkout-summary.html?id=...`; empty state (Sign in when logged out, else the Save Order hint) + Browse promos.
- Store: added `reloadLocal()` to the `EatoutsCustomer` API (re-runs the existing `applyLocal()` + `emit()`), so the counter and the list reload when another tab or page writes `eatouts_customer_v1`. The page calls it on `storage` and on `visibilitychange` before repainting. (First attempt reused the name `refresh`, which already exists as the async server pull - the duplicate key clobbered it and broke `index.html`'s boot; renamed and fixed in T06b.)
- Deviation 1: the brief's card line 2 is "# from # places". Our saved summaries are single-venue snapshots, so the group header carries the order count ("2 orders") and the card line reads "<n> items - P#.##". There is no multi-place order group in the store yet.
- Deviation 2: `tests/inventory.js` requires `data-page` to equal the filename (`Orders-List`), so the slug is `data-page="Orders-List"` rather than the brief's `orders-list`. The filename stays `Orders-List.html`.
- Verified: `node tests/orders-list.js` 15 checks / 0 failed / 0 window errors; `node tests/inventory.js` PASSED (19 checks, 70 pages, 31 screens); `node tests/html-catalog.js` PASSED (9 checks, 70 pages); `node tests/appshell.js` PASSED; `npm run catalog` 70 pages / 1,114 lines. Full `npm test` runs in the T06 close-out commit.
- NOT verified: no device pass (jsdom does not lay out) - the 90px right thumb and the group rhythm at 360px.

### [2026-11-01 00:12:00] - [Agent: Cline] - [T06b: orders counter in the #hdr right slot] - [COMMITTED]
- Task: `PLATFORM UPDATE TASKS.md` T06 steps 2-3 - the header orders counter.
- Files: `js/eatouts-orders-badge.js` (new), `index.html`, `eatout_event_builder.html`, `eatouts-login.html`, `operator-businesses.html`, `Orders-List.html`, `js/eatouts-customer.js`, `tests/orders-list.js`, `HTML_CATALOG.md` (regenerated), `docs/AGENT_CHANGE_LOG.md`.
- Widget: `js/eatouts-orders-badge.js` fills `#ordCount` from `EatoutsCustomer.summaries.list()`, `hidden` when `getUser()` is null (browsers), a light-grey number otherwise, tap -> `Orders-List.html`. Repaints on `eatouts:customer-changed`, on `storage` (after `reloadLocal()`), and on `visibilitychange`. Exposes `window.EatoutsOrdersBadge = { paint, reload }` for tests.
- Scope: wired onto the four `#hdr` pages that also load `js/eatouts-customer.js` (`index.html`, `eatout_event_builder.html`, `eatouts-login.html`, `operator-businesses.html`). The other 17 `#hdr` pages have no customer store, so the counter has no session to read there; they get the empty right slot in T06c.
- Bug caught by `tests/checkout-delivery.js`: the first cut added `refresh` to the `EatoutsCustomer` API, but `refresh` already exists as the async server pull - the duplicate key shadowed it and `index.html` boot threw `EatoutsCustomer.refresh(...).then is not a function`. Renamed to `reloadLocal()`; `Orders-List.html` and the badge both use it.
- Verified: `node tests/orders-list.js` 25 checks / 0 failed (page + 4 pages wired + badge hidden/count runtime); `node tests/checkout-delivery.js` PASSED 0 window errors; `node tests/smoke.js` PASSED; `node tests/customer.js` PASSED; `node tests/login.js` 30 checks / 0 failures; `node tests/appshell.js` PASSED; `node tests/inventory.js` PASSED (19 checks, 70 pages, 31 screens); `node tests/html-catalog.js` PASSED; `npm run catalog` 70 pages / 1,114 lines.
- NOT verified: no device pass (the light-grey 13px number next to the Secure pill on eatouts-login.html is unchecked visually).

### [2026-11-01 00:48:00] - [Agent: Cline] - [T06c batch 1: .hdr-chip removed from the four counter pages] - [COMMITTED]
- Task: `PLATFORM UPDATE TASKS.md` T06 step 1 - `.hdr-chip` (markup + CSS) out of every `id="hdr"` block, batch 1 of 3.
- Files: `index.html`, `eatout_event_builder.html`, `eatouts-login.html`, `operator-businesses.html`, `tests/appshell.js`, `tests/orders-list.js`.
- Change: dropped the `.hdr-chip` CSS rule and the `Offline` span from the four `#hdr` pages that carry the orders counter, so the right slot holds only `#ordCount`. Deleted the now-dead `netChip` / `refreshNetChip` connectivity block in `index.html` and `eatout_event_builder.html` (its only target was the removed chip).
- Tests: `tests/appshell.js` merchant assertion was `has a hdr-chip page label` - now `has a header right slot` (`class="hdr-right"` or `class="hdr-chip"`), because the merchant pages still use the shared `.topbar` until T08b. `tests/orders-list.js` gained a sweep check: every page containing `id="hdr"` must be free of `hdr-chip` (26 checks).
- Verified: `node tests/orders-list.js` 26 checks / 0 failed; `node tests/appshell.js` PASSED; `node tests/checkout-delivery.js` PASSED; `node tests/login.js` 30 checks / 0 failures; `node tests/delivery.js` PASSED; `node tests/smoke.js` PASSED.

### [2026-11-01 00:52:00] - [Agent: Cline] - [T06c batch 2: .hdr-chip removed from the six onboarding headers] - [COMMITTED]
- Task: T06 step 1, batch 2 of 3 - the `#hdr` onboarding pages.
- Files: `bakery-onboarding.html`, `bottle-store-onboarding.html`, `caterer-onboarding.html`, `mobile-kitchen-onboarding.html`, `supplier-onboarding.html`, `restaurant-onboarding.html`.
- Change: each `#hdr` right slot kept its working content (`#saveIndicator`, and the `18+` pill on bottle stores); only the hidden `Offline` chip and the `restaurant-onboarding` `.hdr-chip` CSS rule went. No JS read these chips.
- Verified: `node tests/appshell.js` PASSED; `node tests/inventory.js` PASSED (19 checks, 70 pages, 31 screens); `node tests/smoke.js` PASSED; `node tests/orders-list.js` sweep check green.

### [2026-11-01 00:56:00] - [Agent: Cline] - [T06c batch 3: .hdr-chip removed from the delivery, venue and sign-up headers] - [COMMITTED]
- Task: T06 step 1, batch 3 of 3 - the last five `#hdr` pages. Every `id="hdr"` block in the app is now chip-free.
- Files: `customer-delivery.html`, `driver-delivery.html`, `restaurant-delivery.html`, `venue-about.html`, `eatouts-business-signup.html`, `HTML_CATALOG.md` (regenerated).
- Change: `customer-delivery`, `restaurant-delivery`, `venue-about` and `eatouts-business-signup` lost the label chip plus the `.hdr-right` wrapper (nothing else lived in it). `driver-delivery` kept its working duty indicator - the static `Driver` label went and `#dutyChip` was re-classed `.hdr-chip ok` -> `.duty-chip ok` (same declarations under the new name) so `:440`'s `chip.textContent=STATE.duty` still drives it. `.hdr-chip` CSS rules removed from all five.
- Deviation to flag: `driver-delivery` is the one page where a chip carried state, so it survives under a non-`hdr-` class rather than being deleted.
- Still chip-bearing (out of T06 scope - shared `.topbar` from `js/eatouts-manager.js:110`, not `id="hdr"`): 32 admin/merchant pages. That is T08b territory.
- Verified: full `node tests/run-all.js` -> **59 passed, 0 failed**; `node tests/delivery.js` PASSED; `node tests/venue-about-menu.js` / `venue-about-options.js` PASSED; `node tests/inventory.js` PASSED; `npm run catalog` 70 pages / 1,114 lines.

### [2026-11-01 01:05:00] - [Agent: Cline] - [T06 close-out: docs, task tick, catalog] - [COMMITTED]
- Task: final T06 bookkeeping after T06a/T06b/T06c.
- Files: `PLATFORM UPDATE TASKS.md` (queue row 16 ticked + T06 checklist/verification block), `docs/AGENT_CHANGE_LOG.md`.
- Tick wording: T06 marked DONE 2026-11-01 with the caveat that the `.hdr-chip` sweep covered the 15 `id="hdr"` pages and the 32 `.topbar` pages wait on T08b. Device pass left unticked (jsdom cannot lay out).
- Verified: `node tests/run-all.js` -> 59 suites passed, 0 failed (log captured to %TEMP%\eo-runall.txt); `npm run catalog` 70 pages / 1,114 lines; `node tests/orders-list.js` 26 checks / 0 failed.

### [2026-11-01 09:12:00] - [Agent: Cline] - [Step 0 docs prep: T08b brief, decision close-out, seed -> offer map] - [COMMITTED]
- Task: unblock the remaining queue (T08b, T16, T09, T05, T18, T12, T13, T21, T22) with documentation only; no app code touched.
- Files: `PLATFORM UPDATE TASKS.md`, `docs/AGENT_CHANGE_LOG.md`.
- Change 1: new `#### T08b - Header sweep` brief inserted after T08 (36 `.topbar` pages + 22 `id="hdr"` variants + the 32 `hdr-chip` pages injected by `js/eatouts-manager.js:110`; new `js/eatouts-back-history.js`; `brand-mark` -> `<button data-act="backHistory">`; sweep test asserting no `topbar`/`hdr-chip`). Queue row 11b added; the T08 checklist bullet now points at the brief instead of the old "(48 pages)" note.
- Change 2: decisions - D5 closed against the shipped T06 build (an Order Group is the venue section on `Orders-List.html`; tapping a summary opens `eatouts-checkout-summary.html?id=<id>`), D9 closed (T15 converted all 7 onboarding headers), D8 rewritten with the P550-vs-P1800 conflict and the Menu refresh / Event programme orphans, and new D10 opened for T09 (default A: persist `eatouts_cart_v1`).
- Change 3: new `### 6a` seed -> §6 mapping table (29 seed services -> 24 offers, with renames, merges, removals, and the two `tests/designer-services.js` assertions that move: `:57` count 30 -> 24, `:66` first service).
- Verified: `node tests/html-catalog.js` -> 9 checks, 70 pages, PASSED (docs-only change, page count unchanged).
- Not verified: nothing runtime - this commit is documentation only. D6/D7/D8/D10 still need the user's answers before T18/T16/T21/T09 can be closed.

### [2026-11-01 10:05:00] - [Agent: Cline] - [T08b batch 1: back-history + logo button on the 19 standard-header pages] - [COMMITTED]
- Task: T08b, the half that has no design decision attached. The 36 `.topbar` pages are untouched (see the open question at the end).
- New file: `js/eatouts-back-history.js` - the standalone half of the T08 popup. Records `{href, label, t}` into `sessionStorage` key `eatouts.history.v1` (same key/shape family as the SPA, deduped by href, capped at 5) on load and on `pagehide`; renders the identical `.hist-wrap` / `.hist-scrim` / `.hist-pop` dialog (uppercase "Recent pages" heading, `.hist-row` with `.lab` + `.ago`, empty state "No recent pages yet."); scrim tap and `Escape` close it; `target()` navigates standalone entries to their own URL and SPA snapshot entries to `index.html#<tab>`. Exposes `window.EatoutsBackHistory`.
- Pages (19): anchor -> `<button type="button" data-act="backHistory">` on `bakery-onboarding`, `bottle-store-onboarding`, `caterer-onboarding`, `customer-delivery`, `driver-delivery`, `eatout_event_builder`, `eatouts_feedback`, `eatouts-login`, `eatouts-suppliers`, `mobile-kitchen-onboarding`, `restaurant-delivery`, `restaurant-onboarding`, `supplier-onboarding`; `data-act` added to the existing brand-mark buttons on `eatouts-business-signup`, `operator-businesses`, `venue-about`; decorative `<div class="brand-mark">` promoted to the same button on `about-guest-popup`, `about-profile-options`; `Orders-List` logo switched from `data-act="home"` to `backHistory`. Each page gained one `<script src="js/eatouts-back-history.js">` before `</body>` (net +2/-1 lines per page).
- CSS: the seven popup rules are injected once per page by the script (`#eo-hist-css`), plus `.brand-mark[data-act="backHistory"]{border:0;background:none;padding:0;...}` so a button looks exactly like the old anchor. No page CSS was edited.
- Tests: new `tests/back-history.js` (27 checks - button wiring, load-time recording, label from `<title>`, popup open/heading/CSS-once, row label + relative time, scrim close, Escape close, target() rules, empty state, 5-entry cap, revisit dedupe, 19-page parity sweep, index.html keeps its own copy, zero window errors); `tests/appshell.js` logo assertion now accepts the T08b button and the `tool` mode check accepts the button as the route home; `tests/run-all.js` registers the new suite.
- Verified: `node tests/back-history.js` BACK-HISTORY PASSED (27 checks); `node tests/appshell.js` APPSHELL PASSED; `node tests/orders-list.js` 26 checks / 0 failed; full `node tests/run-all.js` -> **60 passed, 0 failed**; `npm run inventory` PASSED (10 checks, 89 warnings - the stale ones are `PAGE_INVENTORY.md` line numbers, unchanged by this work); `npm run catalog` 70 pages / 1,114 lines.
- Not verified: device pass (popup shadow, blur scrim, row rhythm at 360px) - jsdom cannot lay out. Back History on the 36 `.topbar` pages is not wired yet.
- Note: no `X` close button was added; the dialog closes on scrim tap and Escape, exactly like the SPA popup, so both halves behave the same.

### [2026-11-01 02:26:00] - [Agent: Cline] - [T08b batch 2: the 36 .topbar pages move to #hdr - full sweep] - [COMMITTED]
- Task: T08b, option A (full sweep). Every page that still carried the dark `.topbar` / `.topbar-row` / `.hdr-chip` header now uses the light `#hdr` shell shipped in batch 1. `class="topbar"`, `topbar-row` and `hdr-chip` no longer exist anywhere in the repo.
- Shell: `js/eatouts-manager.js` + `assets/eatouts-manager.css` rewritten - manager pages render `#hdr` (brand-mark button + `.hdr-right`) instead of the bespoke `.topbar`; the progress strip keeps its own row under the header instead of living inside it; `.hdr-chip` is gone (the plan label is a `.brand-subtitle` inside `.hdr-right`); dead `.topbar` / `.topbar-row` / `.hdr-chip` rules deleted; the print block now hides `#hdr`.
- Pages: the `.topbar` markup was replaced with the standard `#hdr` on every page that had it (12 were brand+chip only, 19 brand+chip+progress, 1 brand+chip+progress+`.tabs`, 3 with neither chip nor progress); each loads `js/eatouts-back-history.js` before `</body>` and its brand mark is `<button type="button" aria-label="EatOuts home" data-act="backHistory">`, so the logo opens Back History everywhere (same behaviour as batch 1).
- Labels restored as `.brand-subtitle` inside `.hdr-right` on `gallery-onboarding`, `invoice`, `menu-onboarding`, `ops-console`, `eatouts-checkout-summary` so no page lost its title.
- `eatouts-customer-signup.html`: header trimmed - duplicate brand block removed, dead "Draft mode" pill dropped, progress track restyled to the new rule set.
- Current state: 58 root pages render `<header id="hdr">`, 55 wire `data-act="backHistory"`; out of scope (unchanged) `food-truck-schedule1.html` and `operator-dashboard1.html`, which keep their bespoke `.top` bar (they never used `.topbar`).
- Tests: `tests/back-history.js` sweep rewritten - asserts zero legacy `.topbar` / `topbar-row` / `hdr-chip` markup, 55 brand-mark pages, every standard-header page wiring both `data-act="backHistory"` and the script tag, and that only the two `.top` pages keep a bespoke header; `tests/customer.js` about-tab selectors `.topbar` -> `#hdr`; `tests/appshell.js` header assertion relaxed to `<header id="hdr"`.
- Docs: `PLATFORM UPDATE TASKS.md` - T08b checked, header-parity line closed, behaviour notes + progress block; `HTML_CATALOG.md` regenerated.
- Verified: `node tests/back-history.js` BACK-HISTORY PASSED (29 checks); `node tests/appshell.js` PASSED; `node tests/customer.js` PASSED; `node tests/orders-list.js` 26 checks; full `node tests/run-all.js` -> **60 passed, 0 failed**; `npm run inventory` PASSED (10 checks, 90 warnings - 89 are stale `PAGE_INVENTORY.md` line numbers); `npm run catalog` 70 pages / 1,114 lines; `Select-String -Path *.html -Pattern 'class="topbar"|topbar-row|hdr-chip'` -> 0 hits.
- Not verified: device pass - header height, `.hdr-right` rhythm, progress-strip spacing at 360px and the print preview (jsdom neither lays out nor paginates).
- Note: `assets/images/services/logo_cleanup.png` had been deleted from the worktree by an earlier asset task and was restored here (`git restore`) because nothing in T08b needs it gone. `assets/images/services/logo_cleanup.jpg`, `SYNC REGION TASK/` and `docs/Directory_Subscription_Agreement*` stay untracked and out of this commit.

### [2026-11-01 02:37:00] - [Agent: Cline] - [T16: About -> WhatsApp Channel per region] - [COMMITTED]
- Task: `PLATFORM UPDATE TASKS.md` T16 - the About tab's "WhatsApp Channel" row stops being a dead link and becomes region-aware.
- Files changed:
  - `index.html` (TAB 5 comment block ~`:8660` + the Settings list in `renderAbout` ~`:8736`)
  - `tests/about.js` (+33 lines, 8 new checks)
  - `PLATFORM UPDATE TASKS.md` (T16 block: status, steps, progress list)
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Change: the single empty `const EATOUTS_WHATSAPP_CHANNEL_URL=''` is gone. In its place:
    const WHATSAPP_CHANNELS={BW:'',ZA:'',ZW:'',MW:'',KE:''};
    const ACTIVE_REGION='BW';
    function whatsappChannelUrl(){return WHATSAPP_CHANNELS[ACTIVE_REGION]||'';}
  `renderAbout` reads `const waUrl=whatsappChannelUrl();` and branches:
    - channel configured -> `<a class="setrow" href="..." target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>`
    - no channel yet   -> `<button class="setrow" data-act="showRestNotice" data-notice="The EatOuts WhatsApp Channel is coming soon.">` which raises the
      already-shipped floating `.rest-notice` popup (same mechanism the "Install EatOuts" row uses). No dead `href=""` ships in either state.
  All five region codes are present but empty, so today's build shows the coming-soon notice - deliberate, per D7.
- Tests: `tests/about.js` gained 8 checks - row is present, row never carries an empty href, the map keys equal `BW,ZA,ZW,MW,KE` in order,
  `ACTIVE_REGION==='BW'`, `whatsappChannelUrl()` is `''` while unset, tapping the row raises `.rest-notice` with the coming-soon copy, setting
  `WHATSAPP_CHANNELS.BW` flips the same row into an `<a>` with `_blank` + `noopener noreferrer`, and the shipped state is restored to unset (a `<button>`, empty url).
  `node tests/about.js` -> ABOUT TEST PASSED.
- Verified: full `node tests/run-all.js` -> **60 passed, 0 failed** (run to completion, no `FAIL ` suite lines; the only "fail" strings in the log are words
  inside passing check labels, e.g. "server upload falls back to the data URL on failure").
- Not verified: no device pass - the link vs. button row renders identically in jsdom, so the outbound-tab behaviour itself is untested (and untestable until
  D7 supplies a real URL).
- Open: 🔴 **D7 - the Botswana channel URL is still missing.** Drop it into `WHATSAPP_CHANNELS.BW` and the row goes live with no other edit.
  `ACTIVE_REGION` stays hard-coded `'BW'` until T22 (region picker) makes it dynamic; the other four regions stay on the coming-soon popup until they get channels.
- Note: untracked `assets/images/services/logo_cleanup.jpg`, `SYNC REGION TASK/` and `docs/Directory_Subscription_Agreement*` stayed out of this commit.

### [2026-11-01] - [Agent: Big Pickle] - [T16 close-out + B1/B2 global-standard remediation] - [COMMITTED]
- Task: close the two honest gaps found in the 100%-completion audit. (1) **T16** was sitting at "WIRED, waiting on D7"; (2) **G3/G1** were marked DONE but their §5 audit gates could never pass as written.
- **T16 (docs only, no code):** D7 is resolved as *no WhatsApp channel exists yet* — the coming-soon popup is therefore the intended shipped state, not a placeholder bug. `WHATSAPP_CHANNELS.BW` stays empty until the channel is created; dropping the URL in later turns the row into a live `_blank` link with no other edit (`tests/about.js` already asserts both branches). `ACTIVE_REGION` hard-coding is handed to T22.
- **B1 (5 files):** `bakery-onboarding.html`, `bottle-store-onboarding.html`, `mobile-kitchen-onboarding.html`, `restaurant-onboarding.html`, `supplier-onboarding.html` were still shipping a bottom-attached `.modal-backdrop` (`align-items:flex-end`, `padding-top:22px`) with `.modal{border-radius:9px 9px 0 0}` and a `@media(min-width:520px)` override that re-centred it only on wide screens. Converted to the G3 recipe: backdrop `align-items:center` + `padding:20px`, modal `max-width:420px`, `max-height:80dvh`, `border-radius:9px`. Outside-tap and `Escape` close were already wired (`#modalBackdrop` click + `keydown` listener, ~`:1528`/`:1534`), so this is a pure CSS diff — no JS touched.
- **B2 (doc):** §5's "pages missing scrollbar hiding" helper matched only an *inline* `scrollbar-width:none`, so it permanently reported 9 admin manager pages (`analytics/billing/booking/feedback/order/quote/reservation/room/staff-manager.html`) that hide the bar via `assets/eatouts-manager.css:34-35`. The helper now resolves linked `assets/*.css` and prints nothing. The `align-items:flex-end` helper was matched by badge/checkbox flex columns, so it is now scoped to `(modal-backdrop|fpop)` selectors and prints nothing. Added audit 4 (`border-radius … 0 0`) as *advisory only* with a documented false-positive baseline.
- **Residual risk recorded, not hidden:** audit 4 still matches ~30 rules. Triaged them — most are toasts, `.action-bar` and page `.sheet` backgrounds (`eatouts-orders.html:164` is `.sheet`, `one-pager.html:192` is a toast). Two are real and are owned by their own tasks: `customer-delivery.html:74` `.drp-search` (**T05**) and `eatout_event_builder.html:448` `.menu-page-panel` (**T12**). No new work invented outside those briefs.
- Verified: full `node tests/run-all.js` → **60 passed, 0 failed**; audit 1 prints nothing; audit 2 prints nothing; audit 3 prints nothing.
- Not verified: device pass — the centred onboarding modals at 360px (jsdom does not lay out).
- Note: untracked `assets/images/services/logo_cleanup.jpg`, `SYNC REGION TASK/` and `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 10:24:19] - [Agent: Cline] - [Delegation pack for the 7 remaining tasks (T09/T05/T18/T12/T13/T21/T22)] - [COMMITTED]
- Task: the 100%-completion audit left 7 tasks (19 of 41.75 effort units = 45.5%) plus 11 device passes. Building them serially in one session is slow, so this commit adds a hand-off pack so a fresh AI session can produce any single piece and the lead agent only has to verify + commit.
- **New file:** `docs/AI-DELEGATION-PACK.md` (626 lines). §0 read-first rules (PowerShell-only, minimal diff, no new deps, G1–G4 popup/thumbnail/scrollbar standards, generated-doc rule); §1 work order smallest→largest with the locked decisions D6/D7/D8/D10; §2 seven self-contained prompts **P1–P7**, one per remaining task, each carrying GOAL + a tappable SUCCESS CRITERIA checklist + explicit SCOPE/DO-NOT file lists + the evidence the receiver must return; §3 a numbered 56-file manifest (what each task must create or edit); §4 the verification protocol the lead agent runs (inventory → catalog → `npm test`, the three §5 audit helpers, per-task extra checks, one commit per task); §5 established facts so nobody re-derives them (memory-only `state.cart` at `index.html:3916`, the fixed menu cart key format, `tests/back-history.js:147` hard-coded 55, `SYNC REGION TASK/` = 261 untracked files, 60/60 baseline); Appendix A the 11 device passes; Appendix B how to hand the pack over.
- Deliberate omission: **no code changes.** The pack is instructions only — nothing in `*.html` was touched, so the 60/60 suite result is unchanged.
- Verified: `npm test` → **60 passed, 0 failed** (log: `$env:TEMP\eatouts-test.log`). Heading structure re-read after writing (15 sections, all present); `git status` shows only the 8 files of the B1/B2 commit (`1df5506`) plus this doc.
- Not verified: the prompts themselves — they are briefs, not executed work. P1's D10 contract and P7's page-count arithmetic only become real in their own commits.
- Note: untracked `assets/images/services/logo_cleanup.jpg`, `SYNC REGION TASK/`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 12:49:37] - [Agent: Cline] - [Delegation pack: verified anchors + residual-work map (Appendix C)] - [COMMITTED]
- Task: the pack was complete as prose but several anchors in it were stale (task-doc line refs carried over verbatim), and a handful of T12 sub-area criteria describe work that is **already done** in the builder. Either fault would cost the receiving AI a wrong-location hunt or a destructive "fix" of compliant code.
- **Revised `docs/AI-DELEGATION-PACK.md`** (626 → 727 lines). §5 facts: corrected the T18 export paths (`~:1077` → `:995 / :1074 / :1397 / :1701`), `owner.headshot` `:746`→`:744`, `peakSeason` `:443`→`:441 + :966`; corrected the builder draft refs `:1293/:1321/:1331` → `:1290/:1318/:1328`; added three rows recording what is already compliant. P3 SCOPE: replaced the invented `renderIdentityStep ~:730-770` with the verified function map (`renderServicesStep :757`, `renderPricingStep :813`, `renderGalleryStep :874`, `renderContactStep :941`, `renderReviewStep :978`, `exportProfile() :1701`, tints `:130-136`) and the publish contract (`publish :526`, `publishReady() :1031`, gate `:1366`, `DRAFT_KEY :308`). P4: anchors for 12.1/12.3/12.4/12.6/12.9; `ALREADY SATISFIED` blocks on 12.4 and 12.6; the sequencing note that `.prompt-panel` is one rule (`:704-706`) shared by 12.3/12.6/12.7/12.8 so it must be converted once, not four times; 12.7/12.8 flagged as verify-only. P6 SCOPE: full verified CSS/markup/renderer map for `designer-services.html` and the exact test deltas (`:57` 30→24, `:66` 'Logo clean-up'→'Brand Kit'). P7: the settings row anchor was wrong — `~:8590-8600` is the A–Z rail; the correct insert point is immediately before `index.html:8740`, with `.setrow` CSS at `:586-597`.
- **New: Appendix C** — C1 the 11-phase execution order (A regions file → B T09a → C T09b → D 12.1 → E T05 → F T13 → G 12.2–12.8 → H T18 → I T21 → J 12.9 → K T22 rest) with the test-suite count per phase (60 → 63) and `back-history.js:147` 55→56→57; C2 the residual-work map; C3 the three defects found during the audit (D1 dead `EatoutsBridge` branch in `venue-about.html`, D2 dead `#promoCarousel`/`#promoDots`, D3 `.venue-bar-expand` lives in the builder not `venue-about`); C4 test-integrity notes.
- Deliberate omission: **no code changes.** Documentation only — no `*.html`, `js/` or `tests/` file was touched, so the suite result cannot move.
- Verified: `npm test` → **60 passed, 0 failed** after the edit; every anchor in C2/C3 re-checked with `Select-String` before writing (e.g. `.fpop-close` in `eatout_event_builder.html` returns 0 hits; `.sup-profile-avatar :604` is 150px; `.pit-thumb :621` is 90px; `.prompt-thumb :709` is 150px; `venue-bar-expand` exists at `:63-66` + `:1894` in the builder and nowhere in `venue-about.html`).
- Corrected mid-audit: my earlier note that 12.1's venue bar sat at `:78-83` was a misreading of a `@@ -78,13 +78,10` diff hunk header — `:63-66` in the task doc was right. Recorded rather than silently dropped.
- Not verified: the receiving AI's execution of the prompts (they remain briefs); no device pass was run (jsdom does not lay out).
- Note: untracked `EATOUTS TASKS/`, `SYNC REGION TASK/`, `assets/images/services/logo_cleanup.jpg`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 12:54:34] - [Agent: Cline] - [T22 step 2 (additive) — js/eatouts-regions.js] - [COMMITTED]
- Task: land the region registry in isolation, before the phases that consume it (Appendix C phase A). The file is inert — no page loads it yet — so it cannot regress anything while T09 / T12 / T13 / T21 are still open.
- **New file:** `js/eatouts-regions.js` (78 lines), emitted verbatim from `EATOUTS TASKS\BATCH 7.txt` and checked line-by-line against `PLATFORM UPDATE TASKS.md` §T22 step 2 — `window.EATOUTS_REGIONS` holds BW (active, `BWP`, `en-BW`, `locations:'botswana_locations.js'`) plus ZA/ZW/MW/KE inactive; `window.EatoutsRegions` exposes `all` / `get` / `isActive` / `getActiveRegion` / `setActiveRegion` / `DEFAULT_CODE` / `STORE_KEY`; persisted under `localStorage 'eatouts.region.v1'`.
- Safety property by construction: `setActiveRegion()` returns `false` for any region not flagged active, and `getActiveRegion()` falls back to BW when the stored value is missing, unknown **or inactive** — so a stale/hand-edited localStorage value can never activate a region with no data.
- Not done on purpose: no `index.html` script tag, no `.setrow`, no `EatOuts-Region.html`, no data gating, no `copy-static.mjs` / catalog / inventory row, no `tests/eatouts-regions.js`, `SYNC REGION TASK/` untouched. All of that is Appendix C phase K.
- Verified: `node --check js/eatouts-regions.js` → exit **0**. Behavioural smoke test under a stubbed `window`/`localStorage` → `count=5 active=BW setZA=false setBW=true isActiveKE=false` (exactly the specified contract). `npm test` → **60 passed, 0 failed**, unchanged from baseline.
- Not verified: real-browser load (nothing loads the file yet) and the registry's behaviour once `index.html` wires it — that arrives in phase K.
- Note: untracked `EATOUTS TASKS/`, `SYNC REGION TASK/`, `assets/images/services/logo_cleanup.jpg`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 13:03:35] - [Agent: Cline] - [T09a — D10 cart persistence in index.html] - [COMMITTED]
- Task: T09 part 1 of 2 (Appendix C phase B). `state.cart` was memory-only, so a promo added on `venue-about.html` would have died on navigation. D10 option A: persist the cart under `localStorage 'eatouts_cart_v1'`, hydrate on boot, and expose a public write path for other pages.
- **`index.html`** (+66): `CART_KEY` / `cartPersist()` / `cartHydrate()` / `cartPromoTotal()` / `cartPromoCount()` / `window.EO_cart{addPromo,total,keys}` inserted directly after `cartKeys()` (:3919); `cartPersist()` added to the `syncCart()` tail (:4675) and to `deleteSummaryConfirm` (:9816); the menu badge now reads `cartTotal()+cartPromoTotal()` (:7744-7753); `cartHydrate()` runs once before the boot `openVenueFromSlug(readVenueMeta())` (:10393).
- Design constraints honoured: `cartKey()` / `cartKeys()` / `cartTotal()` / `cartLine()` untouched (DO-NOT), so promo rows use the namespaced key `promo:<slug>:<promoId>` and `cartKeys()` — which filters on `"i<restId>:"` — can never return them. Menu totals and checkout therefore stay menu-only. The badge's **enable** rule deliberately stays `cartTotal()>0`, so a promo-only cart can never tap through to an empty checkout view.
- **`tests/customer.js`** (+47): new block E, 22 checks — `EO_cart` shape, one-row-per-promo, retap increments qty instead of duplicating, `eatouts_cart_v1` envelope (`v:1` + `cart` + `updated`), and `cartHydrate()` restoring the cart from localStorage. Inserted after the index.html section so it runs with `w` / `ev` / `check` in scope and before the other pages boot; it cleans the store up afterwards.
- Verified: `node tests/customer.js` → **CUSTOMER TEST PASSED**, `window errors: 0`, all 22 new checks `ok`. Full `npm test` → **60 passed, 0 failed** (unchanged — no new suite, per D-deliberate).
- Corrected anchor: BATCH 1 said the boot call belonged at ~`:9749`; the real boot sequence is `openVenueFromSlug(readVenueMeta())` at **:10321** (:9749 is `deleteSummaryConfirm`'s clear, and `:10347` is `</html>`). Also re-verified the badge at `:7681` and `syncCart` tail at `:4674-4676` rather than trusting the batch's approximate refs.
- Not verified: the cross-page round trip (promo added on `venue-about.html` → reload `index.html` → badge shows it) — that needs T09b to write the same key. Checkout rendering of promo lines is explicitly out of scope (A4); the badge is the visible contract.
- Note: untracked `EATOUTS TASKS/`, `SYNC REGION TASK/`, `assets/images/services/logo_cleanup.jpg`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 13:21:44] - [Agent: Cline] - [T09 complete — venue-about promo gallery + Add to Order] - [COMMITTED]
- Task: T09 part 2 of 2 (Appendix C phase C). The Promos accordion on `venue-about.html` held 8 empty `.promo-thumb` buttons wired to nothing; tapping any of them did nothing and no script ever filled them. Now a tap opens a floating gallery and "Add to Order" writes one line into the shared cart store.
- **`venue-about.html`** (+~250): `.promo-thumb.is-branded` / `.promo-brand` tile styles and a `.plb-*` gallery (scrim `rgba(15,10,5,.42)` + blur, centred `max-width:420px` / `max-height:80dvh` stage, dots, centred CTA) — matches G3 (centred, no `align-items:flex-end`, no `border-radius … 0 0`, no glyph affordance: outside-tap + Escape only). Markup adds `#plbScrim` / `#plb` / `#plbStage` / `#plbImg` / `#plbCap` / `#plbDots` / `#plbAdd`. JS adds a promo source resolver (`EATOUTS_VENUE_PROMOS` → `EatoutsBridge.feedPromos()` → `rec.promos`), `renderPromoCarousel()`, `openPromoLightbox` / `closePromoLightbox` / `plbRender` / `promoStep` (pointer swipe, 40px threshold, wraps both ways), `cartAddPromo` (read-modify-write of `eatouts_cart_v1`, one row per promo, re-tap increments) and `cartPromoQty`. The Escape handler now closes the gallery as well as the town/area popup.
- **`tests/venue-about-options.js`** (+26 checks): `loadPage(slug, seed)` gained a `beforeParse` injection point; new sections cover tile rendering from the feed, gallery open, caption title+price, dot tracking, swipe both directions with wrap, dot jump, CTA DOM position beneath the stage, exactly one cart line with `kind/title/price/qty`, `promo:<slug>:P1` key shape, D10 envelope, re-tap increments (no duplicate row), toast, outside-tap close, Escape close, and the no-data fallback (3 branded tiles, gallery still opens, CTA disabled).
- **Key constraint found during the audit (recorded in the task doc):** promo content is API-owned — `index.html` ships `const PROMOS = {}` at `:3250`, `directory_runtime_data.js` has **no** `promos` field, and there is no demo promo anywhere in the repo. So the page never fabricates a price: with no feed it renders branded venue tiles and the CTA reads "Price not published yet" and is disabled. The Add to Order path is verified by injecting the feed exactly as the promo API would.
- Verified: `node tests/venue-about-options.js` → **VENUE ABOUT OPTIONS TEST PASSED** (all 26 new checks `ok`, `no runtime errors` in both sections); full `npm test` → **60 passed, 0 failed**; `npm run inventory` → **INVENTORY PASSED** (90 warnings, +3 baseline stale markers from the page growing); `npm run catalog` → 70 pages / 1114 lines; audits 1, 2 and 3 all print nothing.
- Not verified: real-device swipe feel and the visual weight of the scrim at 360px (jsdom does not lay out); the live `/api/promos` path (no server in this environment — the bridge branch is exercised only through the injected feed shape).
- Note: untracked `EATOUTS TASKS/`, `SYNC REGION TASK/`, `assets/images/services/logo_cleanup.jpg`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 13:32:08] - [Agent: Cline] - [T12.1 — venue bar 16px, rows trimmed, title edit floats] - [COMMITTED]
- Task: T12 sub-area 1 of 9 (Appendix C phase D), on `eatout_event_builder.html` only.
- **CSS:** `.venue-bar-name` 18px → **16px**, `.venue-bar-sub` 14px → **16px**, `.venue-kv` 12px → **16px**; deleted the now-unused `.venue-bar-expand h4` rule (uppercase 11px heading). `.title-edit-panel` moved to the full G3 recipe: `max-width:420px` (was 460), `max-height:80dvh` (was 88vh), `border-radius:16px` (was `20px 20px 0 0`), `animation:fadeIn` (was `slideUp`) — and the `@media(min-width:520px)` radius override removed because the radius is now unconditional. It already sat inside the centred `.fpop-scrim`, so only the sheet styling had to go.
- **Markup (`renderVenueBar`):** removed the `<h4>Venue Provider</h4>` heading and the `Name`, `From` (the "…P0.00" row), `Spaces` and `Selected` key/value rows. What remains: **Location, Capacity, For Event Type** — each now 16px.
- Deliberate omission: the collapsed bar's own text (`venue-bar-name` / `venue-bar-sub`) was already correct in wording, so nothing there was touched beyond the font size.
- **`tests/builder-suppliers.js`** (+11 checks, suite count unchanged at 60): expands the bar in the seeded draft and asserts the heading is gone, the row set is exactly `Location,Capacity,For Event Type`, the four removed labels are absent, and `.venue-bar-name` / `.venue-bar-sub` / `.venue-kv` all compute to `16px`; plus three source checks pinning `.title-edit-panel` to 420px / 80dvh / no squared bottom corners.
- Verified: `node tests/builder-suppliers.js` → **BUILDER-SUPPLIERS TEST PASSED** (all 11 new checks `ok`); `builder-preview`, `builder-schedule`, `builder-guests`, `builder-audience`, `popups` all still PASSED; full `npm test` → **60 passed, 0 failed**.
- Not verified: visual weight of the bar at 360px (jsdom does not lay out) — the expanded bar is 3 rows instead of 7, so it is strictly shorter.
- Note: untracked `EATOUTS TASKS/`, `SYNC REGION TASK/`, `assets/images/services/logo_cleanup.jpg`, `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 13:33:10] - [Agent: Cline] - [T22 pre-requisite — track SYNC REGION TASK/ before the move] - [COMMITTED]
- Task: clear the blocking pre-requisite the delegation pack calls out for T22 ("SYNC REGION TASK/ is UNTRACKED — commit it before moving anything; if it is wiped mid-move the region inputs are gone permanently"). Nothing was moved or edited in this commit — this is purely getting the source material under version control.
- **Added (268 files, no modifications to any tracked file):**
  - `SYNC REGION TASK/` — 261 files: `countries-data.js`, `territories.js`, `territory-registry.js`, `countries_mobile_networks.js`, `eatouts-region-selector.html`, and 256 flag PNGs under `Country-Flag-Icons/`. Inventory matches the pack's verified count exactly.
  - `EATOUTS TASKS/` — the 6 `BATCH *.txt` hand-off specs (BATCH 1/2/3/4/5/7) that `docs/AI-DELEGATION-PACK.md` and Appendix C reference. Tracking them means a future session can read the original briefs instead of trusting a summary.
  - `assets/images/services/logo_cleanup.jpg` — the only existing service image; T21 builds the rest of the placeholder set beside it.
- Deliberately left untracked: `docs/Directory_Subscription_Agreement_Update.txt` and `docs/EatOuts_Directory_Subscription_Agreement.docx` — commercial documents unrelated to any of the seven tasks, so they stay out of the engineering history.
- No code, test or doc logic changed; no line of `*.html`, `js/` or `tests/` was touched. `npm test` is unaffected (still **60 passed, 0 failed** at HEAD `beb282a`).
- Not verified: nothing to verify — additive assets only. The T22 move itself (files → `js/` and `assets/flags/`, folder deleted) remains part of Appendix C phase K.

### [2026-11-01 15:20:00] - [Agent: Cline] - [T05 — `customer-delivery` redesign] - [COMMITTED]
- Task: T05 (Appendix C, phase 4). All eleven bullets of the task doc, on `customer-delivery.html` only plus two test files.
- **CSS:** `.osum-back` rule + markup deleted; new `.osum-line` (centred flex, 7px gap) carries `.osum-tot` + `.osum-items`. `.acc` itself is now the 3% grey panel (`background:rgba(0,0,0,.03)`), `.acc.open .acc-title` paints 5%, `.acc.locked{opacity:.55}`, `.acc-hdr`/`.acc-title` centred. Added `.fpop` / `.fpop-scrim` / `.fpop-msg` (fixed, `max-width:400px`, `82dvh`, blur scrim), `.drp-list.float` (fixed, centred, `70dvh`), `.gps-btn` (5% grey, `#4a463c`), `.hint.centre`, `.seg` / `.seg-btn`, `.rcpt-*` (90px `.rcpt-thumb`, 150px `.rcpt-hero`, `.rcpt-pick`, `.rcpt-view-*`, `.rcpt-actions`) and `.review-page` / `.review-hdr`.
- **Markup:** `#fpopScrim` + `#fpop` added beside `#toast`.
- **JS:** `accClass(id)` drives `.acc` / `.acc.open` / `.acc.locked` from `STATE.deliveryMode`; `renderDropdown()` gained `FLOAT_DRP={area:1,propType:1,bank:1}` so those three render a floating list + scrim instead of an inline one (outside-tap/scrim closes via `closeDropdowns()` + `render()`). `renderRecipient()` rewritten (`.seg` toggle, `.rcpt-card` history, new-recipient form, `renderRecipientForm()`), with `renderRecipientViewer()`, `fpopAlert()` / `renderPopup()`, `pickRecipient()` / `saveNewRecipient()` / `saveRcEdit()` / `deleteRecipient()`, `loadRecipients()` / `saveRecipients()` (`eatouts_recipients_v1`), `fullName()` / `initials()` / `recipientById()`, `pickGps()` / `openMapsPick()`, `attachPhoto()` + a document `change` listener for `[data-rcphoto]` / `[data-newphoto]`. `renderPayment()` drops the hint + "recorded" copy and shows `bank || method` in `.acc-val`. `renderReview()` is now `#reviewPage` with Edit/Delete. `renderBar()` label is `Add P… to P… for # items`. `render()` calls `renderPopup()`; `[data-acc]` gates every non-method accordion; `persistDelivery()` writes `delivery:null` when nothing is chosen (so Review → Delete really clears the shared order).
- **`tests/checkout-delivery.js`** (3 assertions re-pointed, not weakened): the bar is checked against `Add P40.00 to P100.00 for 2 items` / `Add P15.00 …` instead of the old "Review & send" copy.
- **`tests/customer-delivery.js`** (new, 52 checks, registered in `tests/run-all.js` as suite 61): gating + popup, float dropdowns + scrim, hint copy, GPS button, me/someone-else toggle, cards + "# orders received", thumb viewer, edit/delete persistence, photo-mandatory form, `.acc-val` bank, `#reviewPage`, bar format, and Review → Delete re-locking the flow and nulling `ORDER.delivery`.
- Verified: `node tests/customer-delivery.js` → **CUSTOMER-DELIVERY TEST PASSED** (52 checks, `window errors: 0`); `node tests/checkout-delivery.js` → PASSED; `node tests/back-history.js` → 29 checks PASSED; `tests/contracts.js` → 27/27; `npm test` → **61 passed, 0 failed**; `npm run inventory` → 10 checks, 90 warnings; `npm run catalog` → 70 pages.
- Not verified: real-device layout at 360/390/430px and the live browser geolocation prompt (headless runs take the `openMapsPick()` fallback).
- Note: untracked `docs/Directory_Subscription_Agreement*` stayed out of this commit.


### [2026-11-01 17:27:38] - [Agent: Cline] - [search_screen bottom nav matched to the 5-tab shell nav] - [COMMITTED]
- Task: make the bottom nav on `search_screen.html` look like, and use the exact same icons as, the 5-tab nav supplied by the user (Promos / Restaurants / Reserve / Gallery / About).
- **`search_screen.html`** (nav region only, 7 lines -> 1): the 4-button nav (truncated tag icon, fork+knife "restaurants", a duplicate `data-tab="promos"` Home button, gallery, gear "about") is replaced by the supplied 5-button markup verbatim — full tag path (`...V2h10l8.59 8.59a2 2 0 0 1 0 2.82z`), storefront icon for restaurants, calendar icon on the new `data-tab="reserve"` button, image icon for gallery, info circle (`r="10"`) for about. `class="nav-btn on"` sits on `restaurants`; the snippet's lower-case `aria-label`s are kept.
- No CSS change: `.nav-btn` / `.nav-btn svg` / `.nav-btn.on` (lines 47-51) are already the same stroke recipe (`fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap/linejoin:round`) these icons need.
- No JS change: `init()`'s `#nav .nav-btn` listener routes `data-tab` -> `index.html#<tab>`, so `reserve` works out of the box; `data-act="nav"` was dropped from the buttons because no `act === "nav"` handler exists on this page (verified across the loaded `js/*.js`).
- Verified: byte-exact comparison of the shipped nav line against the requested snippet -> **NAV MARKUP EXACT MATCH (1302 chars, `-ceq`)**; structure counts on the saved file -> `navOpen=1 navClose=1 navBtn=5 onBtns=1`, `data-tab` hits = 5, `#results` = 1, `<script>` = 25, file ends `</html>`, 631 -> 625 lines (7-line block -> 1 line).
- Not verified: visual parity on a real device/viewport (jsdom is not installed in this checkout, so no DOM harness was run; `tests/` has no reference to `search_screen.html` and `npm test` is unaffected).
- Note: pre-existing modified `index.html` and untracked `docs/Directory_Subscription_Agreement_Update.txt` / `docs/EatOuts_Directory_Subscription_Agreement.docx` stayed out of this commit.


### [2026-11-01 17:36:12] - [Agent: Cline] - [search_screen results: badge + arrow removed] - [COMMITTED]
- Task: on `search_screen.html`, remove `class="result-arrow"` and `class="result-badge"`.
- **CSS (-2 lines, after `.result-meta`):** deleted `.result-badge` (uppercase 9.5px pill) and `.result-arrow` (22px `›` glyph) rules. `.result` / `.result-thumb` / `.result-info` / `.result-name` / `.result-meta` untouched, so rows are now thumb + name + meta only (`gap:12px` still spaces the two children).
- **JS (`renderResults()` row template, -2 lines):** dropped the `'<span class="result-badge">…'` line and the `'<span class="result-arrow">›</span>'` line; the concatenation now runs `…result-meta…` -> `</div>` -> `</button>` with no dangling `+`.
- No other code referenced either class (`TYPE_LABEL` is still used by the mobile-kitchen branch at `:251`, and `item.badge` still feeds the mobile/truck test at `:377`, so nothing became dead).
- Verified: `Select-String 'result-arrow|result-badge'` -> **0 hits**; inline `<script>` syntax check (`new Function(src)`, 18637 chars) -> **JS SYNTAX PASSED**; re-read of `:53-63` and `:417-436` confirms the edited regions.
- Not verified: on-screen row rendering (no jsdom in this checkout; `tests/` has no `search_screen.html` coverage, `npm test` unaffected).
- Note: pre-existing modified `index.html` and untracked `docs/Directory_Subscription_Agreement*` / `js/bakery-types.js` stayed out of this commit.


### [2026-11-01 18:34:00] - [Agent: Cline] - [Catering + Bakery directory filter bars enabled] - [COMMITTED]
- Task: execute `.tiermux/plans/2026-11-01-1734-enable-filter-bar-on-catering-bakery-dir.md` (13 steps). A 2nd tap of the Restaurants nav button while on the Catering or Bakery swipe panel now toggles `#cbar` open with search + Town | Area | Type, instead of the panel keeping the bar permanently hidden (`:6485-6491` before this change).
- **`index.html`** (+~466/-11):
  - state (`:3796`): `cateringFilterOpen/cateringTown/cateringArea/cateringTypes/cateringTownPicker/cateringAreaPicker/cateringTypePicker/cateringTypeDraft/cateringTypeSearch` + bakery twins + `bakeryQuery`. `cateringQuery` (previously declared and never read) is now the catering search query.
  - `cbarKey()` (`:6703-6709`) carries every new flag/value so `renderControlBarInner()` cannot serve a cached bar.
  - `renderControlBarInner()` (`:6515-6565`): the catering and bakery branches replace the old "no filter bar yet" early return. Both hide the bar when `state.restaurantView` is set (catering Menu opens a venue view) or when their `*FilterOpen` flag is off.
  - nav tap (`:9486-9495`): `catering` / `bakery` branches toggle their own flag and close their pickers on close — previously any non-beverage panel toggled `state.restFilterOpen` (the food flag), so the 2nd tap on these panels flipped the wrong switch.
  - `renderCatering()` / `renderBakeries()` now iterate `filteredCateringBrands()` / `filteredBakeries()` and show "No … match these filters." when the filter empties them (vs "No … found." when the data is empty).
  - helpers + pickers: catering `:5654-5772`, bakery `:5912-6017` (town popup reuses `.fpop.town-pop` + `.az-rail` so `armTownRails()` builds the A-Z rail; area popup mirrors the bottle-store one; type popups mirror `renderBevTypePicker` — search, "N selected", Clear, Cancel/Apply).
  - click actions `:10005-10071` (20: open/close/pick town, open/close/pick area, open/close type, clear draft, apply), checkbox drafts `:10583-10600`, live search + type-ahead inputs `:10652-10691` (caret preserved), picker reset on panel switch `:5618-5622` and on `restoreHistory()` `:9406-9410`.
- **Cuisines** (catering Type) = the distinct `brand.type` values in `CateringServicesDatabase.js` — 69 of them across 115 brands — each option showing its own count, exactly like the restaurant cuisine picker. The closed label reads `All Cuisines` / `<name>` / `N Cuisines`.
- **Bakery Type** = the 27 categories from `js/bakery-types.js`, labelled `Type` (as requested). That file was unusable as delivered: `export default` (an ES module) with no `<script>` tag anywhere, so it could never publish anything to a page that loads classic scripts. Converted to the repo's data-file convention — `window.BAKERY_TYPES = [...]` + `<script src="js/bakery-types.js?v=20261101">` at `:979`.
- **Bakery Type filtering honest-by-design:** `bakery_services_database.js` records carry no product categories, so a strict filter would empty the list for every pick. `bakeryBrands()` now passes `r.categories` through and `bakeryHasType()` treats "this bakery declares no categories" as a match: the filter only hides a bakery whose *own* category list excludes the picked type. While `bakeryDeclaredTypeCount()` is 0 the popup says so via `.rest-type-note` ("No bakery has listed its products yet — every bakery stays listed until they do."). When categories land in the data the filter starts working with no code change.
- **`js/bakery-types.js`** (new to git, 5 lines): header comment + the same 27-entry list, verbatim, as `window.BAKERY_TYPES`.
- Verified:
  - headless jsdom probe (`%TEMP%\eatouts_filter_probe.js`, out of repo) → **38 passed, 0 failed**: no missing scripts, page boots clean, `BAKERY_TYPES` length 27, bar hidden by default on both panels, nav tap opens it, labels `Towns|Areas|Cuisines` and `Towns|Areas|Type`, town popup has an `.az-rail`, picking Gaborone narrows catering **115 → 71** rows and updates the button label, areas scoped to the town (Gaborone → Maruapula), cuisine tick + Apply stores the value and relabels the button, live search hits the "match these filters" empty state and restores on clear, panel switch closes and resets the other panel's pickers, 27 Type options + the note, undeclared bakeries stay visible after a Type pick, bakery search narrows (Gaborone = **45** of 97), type-ahead narrows to "cake" and keeps the input value, and the food panel still toggles only `restFilterOpen`.
  - `node tests/bakery-directory.js` → 32/32; `catering-directory.js` → PASSED; `beverages.js` / `popups.js` / `gallery.js` / `bottle-stores.js` → PASSED (0 window errors).
  - `npm test` → **59 passed, 2 failed**. Both failures are PRE-EXISTING and unrelated: `inventory.js` and `html-catalog.js` fail only because `search_screen.html` (added in the previous session) has no `<!-- PAGE: -->` banner, no `<body data-page="...">` and no `scripts/html_catalog.meta.json` entry. Neither suite reads anything this commit touched; left unfixed on purpose — repairing them means touching `search_screen.html` + `PAGE_INVENTORY.md` + `npm run catalog`, i.e. a separate task.
- Deviation from the plan: steps 8/9 said to append the six pickers in the viewport chain (`renderViewport`, `:6702`). They are appended inside `#cbar` instead, where every other directory filter popup lives (food + bottle store) — same visual result, one render path, no extra `render()` call.
- Not verified: real-device layout/scroll feel of the bar at 360-390px, and caret restoration in a real browser (jsdom only).
- Note: the pre-existing unrelated `index.html` hunks (header search-icon CSS/markup at `:55/:58/:956` and `openSearchScreen`, gallery masonry CSS at `:423/:447`) and the untracked `docs/Directory_Subscription_Agreement*` files stayed out of this commit.
- Commit: `e2b47c4` — `[Agent] catering + bakery directories - enable the filter bar` (3 files, +494/-11).
- Push: `15b76d7..e2b47c4 -> origin/main` (fast-forward), `PUSH_EXIT=0`.
- Staging note: the commit was built from a byte-exact blob (`git hash-object -w --path index.html` of the working file with only the six unrelated hunks reverted), because `git apply --cached` on the sliced zero-context patch re-seated the big insertions on the wrong lines (the first attempt staged a shifted file and was `git reset` out). Verified after staging: `git diff --cached --stat` = 466+/11-, the residual unstaged `index.html` diff = exactly the 43+/5- header/masonry delta, and a jsdom boot of the **staged** blob passed 11/11 (bar opens on the nav tap, Gaborone filters catering to 71, bakery Type lists 27, Cancel closes, bakery list still 97).


### [2026-11-01 19:35:37] - [Agent: Cline] - [Status: COMMITTED]
- Task: Shrink the filter-row button type on the four directory pages — `.cbar2.rest-filter-row .cbtn` 16px -> 13px for `data-page="restaurants-pager"`, `"catering"`, `"bakeries"`, `"beverages"`.
- Files changed:
  - `index.html` — `.rest-filter-controls .rest-filter-row .cbtn{font-size:16px}` -> `13px` (`:476`), plus the comment above it (`:473`, which promised "16px centred button labels").
  - `tests/beverages.js` — the assertion that pinned the old value (`:306-308`) now expects `13px` and says so in its label.
  - `docs/AGENT_CHANGE_LOG.md` — this entry.
- Commit: `2c33534` — `[Agent] filter row buttons - 16px to 13px on the four directory pages` (3 files, +24/-4).
- Push: `923761e..2c33534 -> origin/main`, `PUSH_EXIT=0`.
- Notes:

### [2026-11-02 23:35:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12 — float the last two bottom sheets (`menu-page` + `flyer-menu`) and close out the task-doc debt (T08/T08b/T06 status, G1 triage, D3/D10)
- Files changed:
  - eatout_event_builder.html (+6/-8): `.menu-page-panel` (`:463-466`) and `.flyer-menu-panel` (`:727-730`) dropped `max-width:460px` / `height:94vh` / `height:88vh` / `border-radius:20px 20px 0 0` and now use the `.fpop` recipe — `max-width:420px`, `max-height:80dvh`, `border-radius:16px` — with the two stale `@media(min-width:520px)` overrides deleted. No markup, state or JS change: both panels already rendered inside the centred `.fpop-scrim`, and `Escape` already reset `STATE.menuPage` (`:3573`/`:3576`)
  - tests/builder-preview.js (+40 lines, 56 ok checks, +24 new): per-panel stylesheet assertions (`.menu-page-panel`, `.flyer-menu-panel` → rule found, `max-width:420px`, `max-height:80dvh`, `border-radius:16px`, not a bottom sheet: no fixed viewport height and no `0 0` corners) plus runtime proof (flyer menu trigger → `.fpop-scrim > .flyer-menu-panel`, 16px computed radius, a plain `.fpop-x` and no `.fpop-close`, outside tap closes it; provider menu → `.fpop-scrim > .menu-page-panel`, 16px radius)
  - PLATFORM UPDATE TASKS.md: T12 "Global overlays (G3)" block added and the T12 header now reads "12.1-12.4 + the overlay standard done"; T08 (`:400`), T08b (`:427`) and T06 (`:543`) headings plus queue row 11b marked DONE with their shipped commit refs; G1's four done-when boxes triaged; §5 audit #4 baseline rewritten (triage now returns zero live hits); D3 and D10 moved from "Still open" to **Resolved**; the ten blank §8 rows replaced by the two real coverage rows for `1eacec8` / `386021f`, then two rows for this commit
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - `audit #4` had been flagging `.menu-page-panel` as the last live T12 hit; while fixing it, `.flyer-menu-panel` turned out to be the identical defect (same `460px` / `88vh` / `20px 20px 0 0` recipe, also inside `.fpop-scrim`), so both were converted in the same commit — that is what took the repo-wide triage to zero.
  - Clicking `.fpop-scrim` closes the flyer menu because the delegated handler ignores clicks inside `[data-stop="1"]`; the panel keeps `data-stop`, so the outside-tap contract is unchanged.
  - The flyer menu no longer has a fixed height, so it now hugs its 120px image track instead of stretching to 88vh — that is the intended G3 behaviour (`.fpop` also has no height, only `max-height`).
  - G1's "A–Z rail still scrolls and is the only visible affordance" box was **not** ticked: `index.html:717` hides the rail's scrollbar on purpose and the letters are a `flex:1 1 0` tap strip that does not scroll, so the box as written describes behaviour the app does not have. It needs a decision, not a tick.
  - Doc-only: no `.fpop-close`, no new state, no new dependency, and no other page touched.
- Verified:
  - §5 audit #2 (`align-items:flex-end` in popup selectors) → prints nothing; audit #3 (`fpop-close` / chevrons / `▾ ▸`) → prints nothing; audit #4 triage (`border-radius … 0 0` filtered to `.modal` / `.fpop` / `*-panel`) → **prints nothing repo-wide** (was 2 live hits before this commit)
  - `node tests/builder-preview.js` → **PASSED** (56 ok, 0 failed), including the two new runtime panel checks
  - full `npm test` → **64 passed, 0 failed** (exit 0)
  - `npm run inventory` → **PASSED** (10 checks, 90 warnings — the pre-existing stale-marker class)
- Errors: none

  - **No `[data-page]` scoping added, and none would work:** `#cbar` is a sibling of `#viewport` (`:963-966`), not a descendant of any `.screen[data-page]`, so a page-ancestor selector could never match these buttons. The existing `.rest-filter-controls` scope is already page-exact: `renderFilterBar()` is the only emitter of `.rest-filter-controls` + `.cbar2.rest-filter-row` (`:6717-6727`) and it has exactly four callers — catering (`:6769`), bakery (`:6795`), beverages (`:6820`) and the restaurants-pager list (`:6846`). One declaration therefore covers exactly the four requested pages and nothing else, which keeps the diff to a single CSS value.
  - Only the three Town / Area / Cuisine-Type buttons change size. The search input (`.csearch input`, already 13px) and every `.fpop` popup row keep their own sizes; `.cbtn.gal-val` (gallery cbar) and `.rest-filter-row.town-row` (reserve venue / gallery town rows) stay on the 12px `.cbtn` base because they are outside `.rest-filter-controls`.
  - Verified:
    - headless jsdom probe (`%TEMP%\eatouts_fontsize_probe.js`, out of repo) -> **13 passed, 0 failed**: computed `font-size` is `13px` for all three row buttons *and* their label `<span>`s on restaurants-pager, catering, bakeries and beverages; catering labels still read `All Towns | All Areas | All Cuisines`, bakery still `All Towns | All Areas | Type`; the bottle-store town popup rows are not 13px; `.cbtn.gal-val` is still 12px; the 16px rule is gone from the stylesheet.
    - `node tests/beverages.js` -> BEVERAGES TEST PASSED (0 window errors); `popups.js`, `gallery.js`, `restloc.js`, `catering-directory.js`, `bakery-directory.js` (32/32) and `bottle-stores.js` -> all PASSED.
    - `npm test` -> **59 passed, 2 failed** — unchanged from the pre-existing baseline, same two unrelated suites (`inventory.js`, `html-catalog.js`, both only about `search_screen.html`'s missing page banner / `data-page` / catalog entry).
  - Staging note: `index.html` still carries the six pre-existing unrelated hunks in the working tree, so the staged blob was built from the HEAD blob with just this rule + comment rewritten (`git hash-object -w --path index.html` + `git update-index --cacheinfo`). `git diff --cached --stat` = `index.html | 4 ++--`, `tests/beverages.js | 4 ++--`; the unrelated hunks stay unstaged.
  - Not verified: real-device render at 360-390px (jsdom resolves the cascade but not pixels or text wrapping). 13px now matches the search input's own 13px, so the row should read calmer — worth an eyeball on a phone.
- Errors: none


### [2026-11-02 00:04:00] - [Agent: cline] - [Status: COMMITTED]
- Task: Ocean Basket rendered an empty menu - the owner's full 4-menu dataset had been saved into `dist/` as an ESM file; transcribe it into the canonical directory schema
- Files changed:
  - assets/data/menus_data/Ocean Basket.json (2 categories / 3 items -> **42 categories / 200 items**: Main Menu 16 sections with Combos split into its 3 subsections, Sushi Menu 9, Kids Menu 3, Drinks Menu 12. `portions[]` -> `variants[]` labelled from label/size/weight/pieces/quantity, `additions[]` -> `extras[]`, `flavours` folded into the description, `badge` rendered as "(New)", `note` carries the source menu name for non-Main sections. Drinks Menu "Shakes" skipped - same products and prices as Main Menu "Shakes".)
  - assets/data/restaurant_listings/directory_runtime_data.json/.js (regenerated by `npm run build`: `menusRaw["ocean-basket"]` now carries all 42 sections)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (data + ledger together)
- Push: origin/main
- Notes:
  - The edited file was `dist/assets/data/menus_data/Ocean Basket.js` -- an ESM module (`export const oceanBasketMenu = {menus:[{menuName,categories:[{items}]}]}`). `dist/` is a build artifact, so `npm run build` would have overwritten it; the source of truth is `assets/data/menus_data/<Brand>.json`.
  - That ESM shape would not have rendered even if the build had kept it: `catRowsOf()` only reads `payload.menu[]` / `menus{<key>.sections|items}` / `food_menu` / `bar_menu`, and `menus` as an ARRAY yields zero categories. `Combos` also needed lifting out of `subsections[]` (the loader reads `items[]` / `subcategories[]` only).
  - No app code changed - the loader, the `venue-menu` renderer and the About-button CSS were already correct (About font fixed in 0650860).
  - This commit also carries the two pending ledger entries written by TierMux (hero-logo background) and opencode (About button); their own file changes stay uncommitted in the working tree.
- Verified:
  - converter probe: 42 categories, 200 items, 154 priced + 46 variant-based, 18 extras rows, 0 items without a price, 0 duplicate section names
  - jsdom probe (out of repo, `%TEMP%\ob_probe2.js`) -> **18 passed, 0 failed**: `EATOUTS_MENUS["ocean-basket"]` = 42 sections / 200 items, the Menu view renders 42 `.cat-row`, Salads lists 5 rows, Famous Village Salad carries P22/P65/P125, B.Y.O.B.S Rustic Mix keeps its 9 add-ons (Avo/Halloumi render), 0 runtime errors
  - `node tests/menuview.js`, `venue-about-menu.js`, `venue-about-about.js` -> all PASSED
  - `npm test` -> **61 passed, 2 failed** (same pre-existing `html-catalog.js` + `inventory.js` baseline)
- Errors: none


### [2026-11-02 00:52:00] - [Agent: cline] - [Status: COMMITTED]
- Task: commit the working-tree app changes (header search icon, gallery masonry, hero-logo colour, recompressed zen logo) and register `search_screen.html` so the page inventory is honest and the suite is green
- Files changed:
  - index.html (+43/-5): `.hdr-right` is now a flex row holding the orders counter plus a 22px search button (`.hdr-search` over assets/icons/search_icon.webp) that navigates to search_screen.html through a new `openSearchScreen` action; the gallery swapped its fixed 3-column grid + `max-height:40vh` crops for CSS multi-column masonry (2 columns under 520px, then 3/4/5 at 520/720/960px) so every image keeps its natural aspect ratio
  - venue-about.html (+39/-2): `updateHeroLogoBackground()` samples the loaded logo's top-left pixel through a 50x50 canvas and applies it to `#heroLogo` + `--hero-logo-bg`, falling back to white for transparent/black corners, load errors or a missing logo; re-runs when a new logo is chosen in Settings
  - assets/logo/zen_cafe_logo.jpg: recompressed 234,487 -> 26,273 bytes, still a valid 1024x1024 JPEG
  - search_screen.html: added the missing `<!-- PAGE: Search -->` banner and `<body data-page="search_screen">`
  - scripts/html_catalog.meta.json: new page entry id 71 (public-customer) plus four changelog notes, including the 2026-11-01 About-button typography line that had only ever been typed into the generated HTML_CATALOG.md
  - PAGE_INVENTORY.md: new section J with row 71
  - HTML_CATALOG.md: regenerated by `npm run catalog` (71 pages, 1132 lines)
  - scripts/seeds/business_links.sql: regenerated by `npm run build` - the committed copy was stale (838 entries) while the already-tracked assets/data/link_registry.json carried the Zors Luxury Chisanyama link, so the seed now has 839 entries; the 1,679-line diff is line-ending churn (committed blob was CRLF, the generator writes LF), and committing the LF copy stops the file showing up dirty after every build
- Commit: 7878ed8 (index), ad5cff2 (venue-about), 541b825 (zen logo), 9af87b3 (page registration + catalog + inventory), 3cb871a (business_links seed)
- Push: origin/main
- Notes:
  - Audit result: all 71 root .html files were already tracked (71 on disk = 71 in git) and no tracked file was missing, so the only "new page not in git" gap was search_screen.html shipping without a PAGE banner, a data-page slug, a catalog entry or an inventory row - which was the entire cause of the two failing suites.
  - The two untracked business documents (docs/Directory_Subscription_Agreement_Update.txt, docs/EatOuts_Directory_Subscription_Agreement.docx) were deliberately left untracked at the user's request.
  - HTML_CATALOG.md is generated, so hand-written lines are lost on the next `npm run catalog`; the typography note from 0650860 was re-added to scripts/html_catalog.meta.json instead of being re-typed into the .md.
- Verified:
  - node tests/gallery.js, appshell.js, search-screen.js, venue-about-about.js, venue-about-menu.js, venue-about-options.js -> all PASSED
  - node tests/html-catalog.js -> HTML-CATALOG PASSED (9 checks, 71 pages); node tests/inventory.js -> INVENTORY PASSED (19 checks, 71 pages, 31 screens) - both were failing before this change
  - npm run inventory -> INVENTORY PASSED (10 checks, 90 warnings; every warning is pre-existing stale ~Lines drift)
  - npm run build -> "Done. 82 items copied into ./dist/"; dist/index.html carries `.hdr-search` (4 hits), `column-count` (4) and `openSearchScreen` (2), and the regenerated business_links.sql matches HEAD afterwards (no repeat dirty state)
  - npm test -> **63 passed, 0 failed** (was 61 passed, 2 failed: html-catalog.js + inventory.js)
- Errors: none



### [2026-11-02 19:48:21] - [Agent: cline] - [Status: COMMITTED]
- Task: close T07 — prove the standardised filter bar works on all four directory screens and retract the stale "catering/bakery blocked on data" note
- Files changed:
  - PLATFORM UPDATE TASKS.md: T07 header + summary-table row marked DONE 2026-11-02 (all four directories); the `[ ] Deviation — catering + bakery bars stay hidden` note replaced with a ticked retraction (catering brands do carry a `type`; bakeries get Type from `window.BAKERY_TYPES`); new §8 progress-log row
  - tests/catering-directory.js: +12 checks — boots index.html in jsdom, asserts the catering bar is hidden by default, opens on the 2nd Restaurants tap (`#cbar.on`), uses the shared `renderFilterBar()`, renders `#cateringSearch` + centred Town | Area | Cuisines buttons, draws its cuisine list from the database, filters live on search, and hides again on the 3rd tap; suite now exits deterministically (`process.exit(0)`) so the page's notice timer cannot fire against a torn-down DOM
  - tests/bakery-directory.js: +10 checks — the same contract for the bakery panel (`#bakerySearch`, `openBakery*Picker` acts, `bakeryTypeNames()` from `js/bakery-types.js`, live search + restore)
- Commit: 6e41887 (docs + task file) and this commit (the two test files, which were still unstaged when 6e41887 landed)
- Notes:
  - No source change was required. `renderFilterBar()` had already been wired into the catering panel (index.html:6785-6809) and the bakery panel (index.html:6811-6835) in the 2026-10-31 T07 commit, behind `state.cateringFilterOpen` (:3803) and `state.bakeryFilterOpen` (:3812) with nav-tap branches at :9515-9524. The partial status came from a note written before that wiring existed.
  - Catering types are real data: `assets/data/catering_services_database.json` carries a per-brand `"type"`, exposed through `cateringTypeNames()` (:5701) and already used by `cateringMatchesFilters()`. Bakery types come from `js/bakery-types.js`, and `bakeryHasType()` (:5966) intentionally keeps bakeries with no declared product categories visible under every Type.
  - The behaviour is now covered permanently in the repo instead of by an ad-hoc temp probe, so a future edit to `renderCbar()` cannot silently unhook either panel.
- Verified:
  - `node tests/catering-directory.js` -> CATERING DIRECTORY PASSED (12 new bar checks, 0 window errors on boot)
  - `node tests/bakery-directory.js` -> **42 passed, 0 failed** (was 32; +10 bar checks)
  - `npm test` -> **64 passed, 0 failed**
- Errors: none



### [2026-11-02 20:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T22 step 1 — land the region registry files inside the app tree (`js/`) and the 256 country flags inside `assets/flags/`, and verify nothing referenced the old `SYNC REGION TASK/` paths
- Files changed:
  - js/countries-data.js, js/territories.js, js/territory-registry.js, js/countries_mobile_networks.js — moved out of `SYNC REGION TASK/` (renames, no content change)
  - assets/flags/*.png — 256 ISO-3166 alpha-2 flag icons moved out of `SYNC REGION TASK/Country-Flag-Icons/` (renames, no content change; `bw.png za.png zw.png mw.png ke.png` all present for the registry)
  - PLATFORM UPDATE TASKS.md — T22 header marked IN PROGRESS, step 1 sub-boxes ticked with the landed sizes/file counts, note that `copy-static.mjs` needs no edit, §8 progress row
- Commit: (this commit)
- Notes:
  - The moves were already staged in the working tree when this session picked the task up (they match T22 step 1 exactly), so this commit verifies and records them rather than re-running `git mv`.
  - `copy-static.mjs` copies `js/` and `assets/` wholesale (`FOLDERS` at :11-15), so `dist/js/*` and `dist/assets/flags/*` follow automatically - that is the whole reason the move was safe.
  - `SYNC REGION TASK/eatouts-region-selector.html` is deliberately left where it is: it is reskinned/renamed to `EatOuts-Region.html` in the page step, which is also when the folder disappears.
  - Flag filenames are already lower-case ISO-3166 alpha-2, so the selector can build `assets/flags/<code>.png` directly from `window.EATOUTS_REGIONS` without a lookup table.
- Verified:
  - `git status --short` -> 260 rename entries (`R`), 0 deletions of the moved files
  - `Select-String` across `*.html`, `*.mjs`, `*.js`, `js/*.js` for `SYNC REGION TASK` -> no hits (no broken path left behind)
  - `node tests/catering-directory.js` -> CATERING DIRECTORY PASSED
  - `npm test` -> **64 passed, 0 failed**
- Errors: none



### [2026-11-02 20:32:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.3 - audience section (thin separators, floating add prompts, plain-grey remove buttons)
- Files changed:
  - eatout_event_builder.html (+8/-8): `.prompt-panel` converted from a bottom sheet (`max-width:460px`, `border-radius:20px 20px 0 0`, `slideUp`) to the G3 floating recipe (`max-width:420px`, `border-radius:16px`, `max-height:80dvh`, flex column, `fadeIn`, `.prompt-body{flex:1 1 auto;overflow-y:auto}`) - it was already rendered inside `.fpop-scrim` by `renderPrompt()`, so the CSS was the only blocker; new `.sec-sep` (1px `--border-soft` divider); `.rm` for `.audience-card`, `.note-item` and `.tier` lost their white circle (`background:transparent`, `border:0`, `border-radius:50%` removed) and are now a light grey glyph (`var(--muted-2)`) that only fades on `:active`; `renderAudienceSection()` emits a `.sec-sep` after the optional guest-count field and another above "Event Rules" (inline `margin-top:24px` dropped)
- Commit: (this commit)
- Notes:
  - One shared CSS change floats every `.prompt-panel` user: add/edit audience, add rule, add/edit guest, add RSVP contact, add ticket tier, add link. The remaining 12.6-12.8 items (150px thumb, "Add photo" label, centred steppers) are content changes and stay open.
  - `.rm` in `.tier` and `.note-item` were changed alongside `.audience-card` because they are the same component copied three times; leaving two red circled X's next to one grey one would be an inconsistency, not scope creep.
  - `.sec-sep` is deliberately generic (no section prefix) so 12.5/12.8 can reuse it instead of adding inline margins.
- Verified:
  - ad-hoc jsdom probe 18/18: two `.sec-sep` in `[data-sec="audience"]`, first above the "Describe who this event is for" hint, second directly above the "Event Rules" label; `addAudience` opens `.fpop-scrim .prompt-panel` with computed `max-width:420px`, `border-radius:16px`, `max-height:80dvh`, `.prompt-body{overflow-y:auto}`, `.fpop-x` background transparent; seeded rule card renders `.rm` with transparent background, no border, `border-radius` not 50% and a non-red colour; 0 window errors
  - `node tests/builder-audience.js` -> PASSED · `builder-guests.js` -> PASSED · `builder-preview.js` -> PASSED · `builder-schedule.js` -> PASSED · `builder-suppliers.js` -> PASSED
- Errors: none



### [2026-11-02 21:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.2 - schedule section (equal chips, collapsible day accordion, Year/Month/Day + Hour/Minute button pickers)
- Files changed:
  - eatout_event_builder.html (+112/-22): `.chip-row.eq` (2-column grid, centred labels); `.schedule-day` is now a collapsible accordion keyed by day id in `STATE.dayCollapsed` (`.schedule-day.collapsed .schedule-day-in{display:none}`, body kept in the DOM); native `<input type="date">`/`<input type="time">` replaced by `.dt-row.dt-3` / `.dt-row.dt-2` button rows (`scheduleDateRow()`, `scheduleTimeRow()`) that open a floating scroll-list popup (`renderSchedulePicker()` + `STATE.schedulePicker`, `.fpop-scrim` > `.fpop` > scrolling `.fpop-body`, selected row scrolled to centre); `dateParts/timeParts/todayParts/daysInMonth/clampDate/applySchedulePart` helpers keep the stored `YYYY-MM-DD` / `HH:MM` strings valid; new actions `toggleDayOpen`, `openSchedulePart`, `pickSchedulePart`, `closeSchedulePicker` (incl. scrim-tap close)
  - PLATFORM UPDATE TASKS.md: 12.2 ticked, T12 header progress, §8 row
- Commit: (this commit)
- Notes:
  - Storage format is unchanged on purpose (`startDate`/`endDate` stay `YYYY-MM-DD`, `startTime`/`endTime` stay `HH:MM`), so `eventDuration()`, the calc bar, the preview renderer and every saved draft keep working without a migration.
  - Picking a single part writes a complete date/time immediately (defaults: today for dates, 12:00 for times) - that is what keeps a partially-picked field from ever being invalid, and `clampDate()` drops a 31st down to 28/29 when the month/year changes.
  - The accordion ships expanded by default, so the existing schedule tests (which query inside `.schedule-day-in`) keep passing; only an explicit header tap collapses a day.
  - `tests/builder-audience.js` shows an uncommitted modification in the working tree (12.3 checks added by another session, with mojibake em dashes). It was left untouched and uncommitted - it is not this task's file - but it does pass against the 12.3 implementation.
- Verified:
  - ad-hoc jsdom probe 44/44: chips = `.chip-row.eq` + `grid-template-columns:1fr 1fr` + `text-align:center`; header tap toggles `.collapsed` and computes `display:none`, second tap re-expands; 3-button date row / 2-button time row with the right labels; year popup 13 options, month popup 12, February 2028 = 29 options, February 2027 = 28, day clamps 31 -> 29 -> 28; hour popup 24, minute popup 60; `startTime` ends as `09:30`; scrim tap closes; day 2 picker leaves day 1 alone; no native date/time input remains; 0 window errors
  - `node tests/builder-schedule.js` -> PASSED · `builder-preview.js` -> PASSED · `builder-audience.js` -> PASSED (including the foreign 12.3 checks) · `builder-guests.js` -> PASSED · `builder-suppliers.js` -> PASSED
- Errors: none



### [2026-11-02 21:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.2 + T12.3 — replace the ad-hoc jsdom probes with permanent assertions, and verify both sub-tasks against the committed implementation
- Files changed:
  - tests/builder-schedule.js (25 -> 64 checks): 12.2 proof — `.chip-row.eq` is a real 2-column grid with `text-align:center` chips; the day header carries `data-act="toggleDayOpen"` and a tap flips `.schedule-day.collapsed` (computed `display:none` on `.schedule-day-in`) while a second tap re-expands; 3-button Year|Month|Day and 2-button Hour|Minute rows on one grid line each, wired to the right `data-idx`/`data-dfield`, with no native date/time input left; and a seeded 2028-02-10 boot exercising the pickers end-to-end (Feb 2028 = 29 options, stored day preselected, pick writes back, 2027 clamps 29 -> 28, minute pick keeps the hour, 24/60 option lists, `.fpop-x` and a pick both close it, result lands in the debounced draft)
  - tests/builder-audience.js (24 -> 31 checks): 12.3 proof — the rule prompt is a `.fpop-scrim` centred `flex` container holding a 420px/16px `.prompt-panel`, the close is a bare `×` glyph with a transparent background and no `border-radius`, the section carries exactly two `.sec-sep` (one above the audience hint, one above Event Rules), and `.rm` has lost its white circle
  - PLATFORM UPDATE TASKS.md: "permanent coverage" line under 12.2 and 12.3 pointing at the two test files
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - Both sub-tasks were already implemented and committed by the session that owns the builder (`61be967` = 12.3, `e77f434` = 12.2); this commit is the verification half, so the behaviour is guarded in the repo instead of in a throwaway probe.
  - One real bug surfaced while adding the accordion checks: `tests/builder-schedule.js` cached the `[data-sec="schedule"]` node before any interaction, so every later `sec.querySelector(...)` read a detached tree. The day/note block now re-queries `document`, which is why 3 previously passing checks ("tapping reveals the note box" and the two seeded-note checks) would have broken the moment the page re-rendered.
  - The draft assertion waits 500ms on purpose: `scheduleSave()` is `setTimeout(saveDraft,400)`, so reading `localStorage` straight after a pick sees the previous value.
- Verified:
  - `node tests/builder-schedule.js` -> **64 passed, 0 failed**
  - `node tests/builder-audience.js` -> **31 passed, 0 failed**
  - `npm test` -> **64 passed, 0 failed** (exit 0)
- Errors: none



### [2026-11-02 21:52:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.4 - suppliers (bottom-pinned search, floating profile, Service Provider Info popup, item cards, full-image gallery)
- Files changed:
  - eatout_event_builder.html (+120/-28): `.fpop-search.is-foot` (rule on top) with the directory markup reordered to hdr > `.fpop-body` > search; `.sup-profile-panel` aligned to the G3 card (420px / 80dvh / 16px / `fadeIn`); `.sup-profile-loc` 12.5px -> 16px; `.sup-profile-name` is now a tap target; `.pit-card` is a `90px 1fr` grid and gained a `.pit-foot` row (`.pit-cost` left, `.qty-stepper.sm` right with centred glyphs); new `renderSupInfo()` ("Service Provider Info": 90px thumb, name + services, description) and `renderImageGallery()` (feint `rgba(0,0,0,.55)` backdrop, dots above the track, white caption below, outside tap closes, swipe via scroll-snap with a dot-sync scroll listener); new STATE `supInfoOpen`/`supInfoId`/`gallery` and actions `openSupInfo`, `closeSupInfo`, `openSupGallery`, `openItemGallery`, `closeImgGallery`, `imgGalDot`
  - PLATFORM UPDATE TASKS.md: 12.4 ticked, T12 header progress, §8 row
- Commit: (this commit)
- Notes:
  - The directory popup already floated (`.fpop-scrim`), so the only real work there was moving the search under the list and swapping the divider side - no markup rebuild.
  - The gallery is one reusable popup, used by both the 150px provider avatar and the 90px item thumb; suppliers only carry a single `photo` today, so the dots stay hidden for one image, but `s.photos[]` is honoured as soon as the data has more than one.
  - The item thumb keeps its emoji glyph (`.pit-thumb`), so the gallery shows the provider photo captioned with the service name rather than inventing per-item images.
  - `.pit-check` (the on-quote tick) now sits in the foot row instead of the top row so every card has the same two-row rhythm.
- Verified:
  - ad-hoc jsdom probe 40/40: popup child order `fpop-hdr | fpop-body | fpop-search`, `.is-foot` rule present, `.fpop-x` transparent, panel 420px/80dvh/16px, avatar 150px, loc 16px, card `90px 1fr`, thumb 90px, `.pit-foot` holds the stepper with `margin-left:auto` and a left-aligned `.pit-cost`, stepper buttons `display:flex`/centred, info popup anatomy (90px thumb first, name + services right, description under a label), gallery backdrop `rgba(0, 0, 0, 0.55)` with dots above the track and the caption below, avatar + item galleries both open and close on an outside tap, profile survives behind the gallery, 0 window errors
  - `node tests/builder-suppliers.js` -> PASSED · `builder-preview.js` -> PASSED · `builder-guests.js` -> PASSED
- Errors: none


### [2026-11-02 22:00:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.4 — verify the supplier directory / profile / gallery work against the spec and give it permanent coverage
- Files changed:
  - tests/builder-suppliers.js (49 -> 87 checks, +38 T12.4): directory popup child order `fpop-hdr > fpop-body > fpop-search.is-foot`; the `.is-foot` rule sits on the top edge; the close is a transparent `×` with no circle; profile card computes `420px / 80dvh / 16px`; avatar `150px`; `.sup-profile-loc` `16px`; `.pit-card` is a `grid` with a `90px 1fr` template and `.pit-foot` as its third child (`.pit-cost` left, `.qty-stepper.sm` pushed right by `margin-left:auto`, glyphs flex-centred); avatar tap opens `.img-gal` over `rgba(0, 0, 0, 0.55)` with the caption last and the profile still open behind it; two photos put `.img-gal-dots` above the track with the first dot `.on`, a dot tap moves `.on`, and an outside tap closes the gallery; an item-thumb tap opens the gallery captioned with that item's title; a name tap opens the 420px `Service Provider Info` card whose top row is the 90px thumb + name/services meta, description below it, closed by its `×` while the profile survives
  - PLATFORM UPDATE TASKS.md: "permanent coverage" line under 12.4
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - 12.4 was implemented and committed by the session that owns the builder (`d14d4f2`); this commit is the proof half, and every new check passed on the first run — no implementation change was needed.
  - Dots only exist when a supplier has more than one image, and `getSuppliers()` gives each supplier exactly one `photo` (rotating through `SUPPLIER_PHOTOS`), so the dots block temporarily sets `s.photos = [photo, photo]`, re-renders, then restores the original — the same shape `openSupGallery` will read once real suppliers carry `photos[]`.
  - Everything is driven through shipped code, not stubs: the profile is opened by clicking a real `.stm-sup` row whose supplier has a numeric `price` and a `photo`, so `.pit-card`, `.pit-foot` and both galleries are the markup users actually get.
- Verified:
  - `node tests/builder-suppliers.js` -> **85 ok, 0 failed** (87 `check()` calls; two sit in an `if/else` branch)
  - `npm test` -> **64 passed, 0 failed** (exit 0)
- Errors: none


### [2026-11-02 23:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T12.7 (RSVP) + T12.8 (Event Links) - verify both prompts against the G3 overlay standard and give them permanent coverage
- Files changed:
  - tests/builder-guests.js (33 -> 55 checks, +22): new `floatingCard(label, w, panel)` helper that asserts the card contract once per prompt - the panel sits inside a `.fpop-scrim` that computes `display:flex` / `align-items:center` / `justify-content:center`, the panel computes `max-width:420px` + `border-radius:16px`, `.fpop-hdr .fpop-x` is the literal `x` glyph with a transparent background and no radius, and the document contains zero `.fpop-close`. The RSVP block opens `[data-sec="rsvp"] [data-act="addRsvp"]` -> titled "Add RSVP Contact", keeps its own `contactType` / `contactValue` fields, and closes via the `X`, an outside tap on the scrim, and `Escape`. The Links block opens `[data-sec="links"] [data-act="openLinkPicker"]` -> titled "Add Link", keeps its `.link-icon-grid`, and closes by the same three routes; its close is `data-act="closeLinkPicker"` on both the scrim and the `X`.
  - PLATFORM UPDATE TASKS.md: T12 header now reads "12.1-12.4, 12.7, 12.8 + the overlay standard done; 12.5, 12.6, 12.9 open"; 12.7 and 12.8 marked DONE with their coverage lines; new §8 row
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - Verify-only, per the delegation pack: `renderPrompt()` (`:3301-3316`) and `renderLinkPicker()` (`:3334-3340`) already shipped inside `.fpop-scrim` with a plain `.fpop-x` from 12.3, so no builder change was needed and every new assertion passed on the first run.
  - The two prompts share the `.prompt-panel` class but not the close action (RSVP `closePrompt` vs links `closeLinkPicker`), so both close paths are exercised rather than assuming one covers the other.
  - Each re-open re-queries its trigger: `render()` replaces the tree, so a cached `[data-sec="rsvp"]` button is detached and clicking it would silently pass a false negative.
  - Deliberately not ticked: 12.6 still has the "Add photo" text at `:3263` and the CTA label swap is the builder session's half of the guests work.
- Verified:
  - `node tests/builder-guests.js` -> PASSED, 22 new checks, 0 failed
  - `npm test` -> 64 passed, 0 failed (exit 0)
- Errors: none


### [2026-11-02 23:55:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T22 steps 1 (tail), 2, 5 and 6 - ship `EatOuts-Region.html` on the standard EatOuts shell, retire `SYNC REGION TASK/`, and register the page everywhere
- Files changed:
  - EatOuts-Region.html (new, 204 lines): the TrackHype selector rebuilt on the house shell - `<!-- PAGE: Select Region -->`, `<body data-page="EatOuts-Region">`, standard `#hdr` (button `.brand-mark` on `data-act="backHistory"`, `js/eatouts-back-history.js` loaded), five-link `.appnav`, 3% grey `.pad`, hero `.phead`. Demo momentum/track-hype assets dropped, `Country-Flag-Icons/` rewritten to `assets/flags/<code>.png`, manifest pointed at EatOuts. Rows, search and flags are generated from `window.EatoutsRegions` (`all` / `get` / `getActiveRegion` / `setActiveRegion`) - BW is `aria-pressed="true"` and tagged "Selected", the other four read "Coming soon". `#regionSearch` filters by name **and** by ISO code and shows a no-match line; tapping BW persists `eatouts.region.v1`; tapping anything else opens `#soonScrim` -> `.fpop` ("This region is coming soon.", G3: 420px / 80dvh / 16px, plain transparent `×`, no `.fpop-close`), closed by the X, an outside tap, `Escape` or "Got it".
  - SYNC REGION TASK/eatouts-region-selector.html: deleted (the mockup copy sits in gitignored `_trash/eatouts-region-selector.html`, spelling out the tracked deletion), and the folder is gone.
  - tests/region-selector.js (new, 45 checks): page markers + `data-page` slug, the standard header (button, not a link) and the house nav, five rows in registry order, BW selected, every rendered flag path resolving to a real file on disk, search by name / by code / no-match / cleared, the full card contract and all four close routes, the BW tap writing `eatouts.region.v1`, the registry API (`setActiveRegion('ZA')` refuses) and the two fallbacks for a stale stored code.
  - tests/run-all.js: `region-selector.js` registered (65 suites).
  - tests/back-history.js: brand-mark parity count 55 -> 56.
  - copy-static.mjs: `EatOuts-Region.html` added under "Standalone customer surfaces reached from index.html" (`js/` + `assets/` were already copied wholesale, so `js/eatouts-regions.js` and `assets/flags/*` follow automatically).
  - scripts/html_catalog.meta.json: page 72 entry + a 2026-11-02 changelog note; PAGE_INVENTORY.md: new §K "Regions (2026-11)" with the `PAGE: Select Region` marker; HTML_PAGES.md: summary row; HTML_CATALOG.md regenerated.
  - PLATFORM UPDATE TASKS.md: T22 header re-worded, step 1 fully ticked, step 2 ticked with its `fadcf15` provenance and coverage, step 3 flagged open (after T13) with the reason, steps 5 and 6 ticked with coverage lines, new §8 row.
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - `js/eatouts-regions.js` had already shipped in `fadcf15`, so step 2 needed a tick plus coverage, not code. Step 3 (data gating) stays open: `money.js` owns currency formatting today, so doing it before T13 would mean writing the same code twice.
  - The first cut of the page made the brand mark an `<a href="index.html">`. `tests/back-history.js` refused it: the parity sweep requires every branded page to carry `data-act="backHistory"` **and** load `js/eatouts-back-history.js`. Switched to the real house pattern (`<button class="brand-mark">`) and bumped the sweep's expected count to 56 - that count is the single place a new standard-header page must be declared.
  - `tests/inventory.js` and `tests/html-catalog.js` both failed on purpose before registration (71 vs 72 pages; no catalog entry), which is the guard working: a page that ships without markers is invisible to the docs.
  - The click delegation on the scrim checks `closest('.fpop')` first, so tapping the card body does nothing while the X, "Got it" and the backdrop all still close - the same shape the builder's G3 cards use.
  - Method note: the editor caps a single write near 6,000 characters, and an insert at a stale line number silently lands mid-block (the first attempt dropped the `type('')` reset and the search stayed filtered, turning `item('ZA')` into a null dereference). Re-read the region before inserting.
- Verified:
  - `node tests/region-selector.js` -> **REGION-SELECTOR TEST PASSED**, 45 ok, 0 failed
  - `node tests/back-history.js` -> **BACK-HISTORY PASSED**, 29 checks
  - `node tests/inventory.js` -> INVENTORY PASSED (21 checks, 72 pages, 31 screens)
  - `node tests/html-catalog.js` -> HTML-CATALOG PASSED (9 checks, 72 pages)
  - `npm run catalog` -> 72 pages, 1,147 lines; `npm run inventory` -> 72 standalone files
  - `npm test` -> **65 passed, 0 failed** (exit 0)
- Errors: none


### [2026-11-03 00:20:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T22 step 4 - the region row above "About EatOuts"
- Files changed:
  - index.html: `renderAbout()` now derives `regionName` from `window.EatoutsRegions.getActiveRegion()` (falling back to "Botswana" when the module is absent) and emits `<a class="setrow" href="EatOuts-Region.html">` as the first child of the Settings `.acc-in`, directly above `About EatOuts`; `js/eatouts-regions.js` is loaded right after `js/eatouts-analytics.js`.
  - tests/about.js (+5 checks): region row present, labelled "Botswana", its next sibling is the `About EatOuts` anchor, it sits in the Settings panel rather than the nested List Business `<details>`, and index.html loads the registry script.
  - PLATFORM UPDATE TASKS.md: T22 header now names only data gating as outstanding, step 4 ticked with its coverage lines, new §8 row.
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - The row is a plain anchor, not a `data-act` button: the selector is its own page, so a real href keeps middle-click, back-button and no-JS behaviour for free. Nothing else in the Settings list needs to know it exists.
  - The label is read at render time, so once `setActiveRegion()` is allowed to move off BW the row renames itself on the next `renderAbout()` with no further edit.
  - `tests/about.js` inlines every `<script src>` and records a missing file in its `errors` list, so adding the tag also proves `js/eatouts-regions.js` resolves on disk.
  - Sequencing: step 3 (data gating) stays open on purpose - `money.js` (T13) owns currency formatting, and gating before it would duplicate that code.
  - Harness note: three `node tests/run-all.js` runs overlapped in this session and interleaved into one redirect file, which is how a bogus "68 passed" appeared - two suites print their own "N passed, 0 failed" line. The trustworthy number is the one framed by the `--------------------------------------------` divider: **65 passed, 0 failed**.
- Verified:
  - `node tests/about.js` -> ABOUT TEST PASSED (5 new checks, 0 failed)
  - `node tests/run-all.js` -> **65 passed, 0 failed** (exit 0)
- Errors: none


### [2026-11-03 00:30:00] - [Agent: cline] - [Status: COMMITTED]
- Task: housekeeping - drop the two stray blank lines above `### Per-task completion template`
- Files changed: PLATFORM UPDATE TASKS.md (2 blank lines removed between the §8 log table and the template heading; nothing else), docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - First attempt used a regex with `[^\\r\\n]*` against a CRLF file and the `\\r?\\n` boundary ate the whole T12.7/T12.8 row plus the heading. Reverted with `git checkout --` and redone by splitting on the file's own newline (`\\r\\n`, detected, not assumed), removing only the extra empty strings directly before the heading. Line endings stay uniform - writing `\\n` into a CRLF file is what made the diff unreadable the first time.
- Verified: `git diff --stat` -> `1 file changed, 2 deletions(-)`; row 1062 (T12.7 + T12.8) still intact, heading now 1064 with one blank line above it.
- Errors: none


### [2026-11-03 03:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T21 step 7 (commit 2 of 3) — designer step rework: Available/Previous toggle, 90px square avatars, 3-image snap carousel, portfolio lightbox + 3-across grid, `.pill.ok` retired
- Files changed:
  - designer-services.html:
    - step 2 rebuilt as **Available Designers**: `<h1>` "Pick a style" → "Available Designers", body copy 16px, `.seg` toggle (`data-act="desTab"`, `available`/`previous`) under the hero.
    - previous = designers already named on a job in `eatouts_jobs_v1` (`previousDesigners()`, most recent first) → no new seed fields, no new store.
    - `.designer-top` is now a centred row holding a `.av-btn` wrapper; `.av-wrap`/`.av-ini`/`img` go from `border-radius:50%` to **16px on a 90px square**, and tapping the avatar opens the lightbox. Card reads avatar → `<h4>` (16px) → `<p>` → work strip → dots → action, all centred.
    - `.mosaic` is a 3-image `scroll-snap-type:x mandatory` carousel (`.cell{flex:0 0 100%;aspect-ratio:1/1}`), with `.mos-dots` under it that track the scroll position (`wireMosaics()`).
    - new `#lb` lightbox: pager (one photo + live dots, swipe via `touchstart`/`touchend`, wired once) → tapping the dots flips to the 3-across `columns:3` grid on `rgba(10,10,10,.94)` → tapping a grid photo enlarges it back in the pager. Designers with no photos fall back to an initials tile (`.lb-ini`).
    - engaged designers stay on the page, inactive (`.designer-card.locked{opacity:.62}`, no `pointer-events:none` so the new button is tappable) with "Available from <date>" (`availableFrom()` = start + delivery days over their open jobs, `fmtDate()` → "6 Nov") or "There is work waiting — join the queue", plus a **Notify me when free** button that opens a pre-filled `wa.me` to the admin number.
    - `.pill.ok` retired: rule deleted, "Available" badge on the card and in the review summary dropped, and the catalogue's founding-discount pill became a plain `.micro` line ("Founding-20 discount available"). `.pill` / `.pill.warn` untouched.
  - tests/designer-services.js (+29 checks, 34 → 63): heading, 16px copy, both toggle buttons + default active, `.pill.ok` gone from DOM and CSS, 90px square avatar + tappable, card child order, centred 16px title, 3-cell snap carousel + 3 dots, engaged cards (4) offer notify-me and never a pick, the "Available from <date>" and "work waiting" variants, carousel → lightbox → dots index → swipe both ways → 3-across grid (9 photos) → enlarge → close, avatar enlarge, Previous tab from a seeded closed + open job, toggle round-trip. The two seeded jobs make the persisted-job assertion `mine.length === 1 && stored.length === 3`.
  - PLATFORM UPDATE TASKS.md: T21 heading marked 🟡 in progress (steps 1–7 + 10 landed, 5/8/9 open), same convention as T22.
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: (this commit)
- Notes:
  - Answers used for the three open questions (the user said "proceed"): **A1** previous designers = designers on past `eatouts_jobs_v1` jobs — yes; **A2** no `status`/`available_from` fields were added to `js/eatouts-designers-seed.js` — availability stays derived from `slot_types`/`max_projects`/`max_retainers`/`isDesignerReserved` plus `availableFrom()`, so the seed and the designer workspace are untouched; **A3** `eatouts_jobs_v1` remains the single request store, which step 8 will read for "My Design Requests".
  - `openLightbox`/`portfolioItems` reuse the seed's 8–9 portfolio images, so the lightbox grid is richer than the 3 shown in the carousel while the carousel stays a clean 3-up snap strip.
  - Availability is still counter-driven: an `in_progress` job does **not** make a designer unavailable, it only supplies the "available from" date. Keeping that split means the designer workspace remains the only place that flips a slot.
  - Not verified: real-device visual pass (jsdom has no layout engine, so snap scrolling, swipe feel and the 90px avatar crop need eyes).
- Verified:
  - `node tests/designer-services.js` -> **DESIGNER-SERVICES TEST PASSED**, 63 ok, 0 failed, 0 window errors
  - `node tests/brand-kit-admin.js` -> BRAND-KIT-ADMIN TEST PASSED
  - `node tests/designer-dashboard.js` -> DESIGNER-DASHBOARD TEST PASSED
  - `node tests/run-all.js` -> **66 passed, 0 failed** (read from the divider-framed summary line)
- Errors: none


### [2026-11-03 23:55:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T18 step 4 — per-service pricing steps, floating service popup, per-service photos/packages/discounts
- Files changed:
  - `eatouts-suppliers.html` (service popup fields, `pricing:<cat>:<type>` fan-out, `renderServicePricingStep()`, per-service galleries, checklist + card)
  - `tests/supplier-pricing.js` (new, 44 checks)
  - `tests/run-all.js` (registers the new suite)
  - `PLATFORM UPDATE TASKS.md` (T18 header, step 4 and step 9 marked done)
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Commit: `0e7c840` — code+docs commit, pushed `c1277dd..0e7c840  main -> main`; this ledger entry follows in its own commit.
- Notes:
  - **The single `i3` is gone.** `renderOnboarding()` now emits one `step(pricingKey(s), 3, s.title, …)` per selected service and `stepBody()` routes `pricing:*` to `renderServicePricingStep(svc)`. `renderPricingStep()`, the `pricing.hourlyRate/halfDayRate/fullDayRate/depositPercent` inputs and the dead `togglePayTerm` act were deleted (it had no trigger left).
  - `pricingKey()` / `svcByPricingKey()` keep keys stable across add/remove — the key never encodes the position, and every pricing item keeps the literal `STEP 3` badge so the checklist's "Step 3" strings stay true.
  - The service popup is the same G3 `openSheet()` card (centred `.scrim`, 420px / 80dvh `.sheet`, plain `×`, tap-outside + `Escape`), extended to title, description, base rate, rate type, half-day, full-day, deposit % and minimum notice. `svcSheetHTML()` / `readSvcSheet()` are shared by add and edit, so the `#__svc*` ids the harnesses drive did not move.
  - **No data migration:** `profile.pricing` and `profile.discounts` are now written by nothing and read only as fallbacks (`allPackages()`, `allDiscounts()`, card + checklist), so profiles saved before the fan-out keep their packages, codes and price instead of silently losing them.
  - Per-service photos live on `service.images[]` (`addSvcPhoto` → `EatoutsUpload.pickImage()`, `removeSvcPhoto`, `viewSvcPhoto` tap-to-enlarge) — the same device-only path as the gallery step, no URL input.
  - Not verified: real-device visual pass. jsdom has no layout engine, so the popup height on a short phone, the swipe feel and the photo crop need eyes. The `\.scrim{align-items:center}` / `\.sheet{max-width:420px;max-height:80dvh}` CSS is asserted from source, not measured.
  - Untracked `assets/logo/*.jpg` (10 files) and `runall.txt` were left alone — unrelated to T18 and not requested.
- Verified:
  - `node tests/supplier-pricing.js` → **SUPPLIER-PRICING TEST PASSED**, 44 ok, 0 failed, 0 window errors
  - `node tests/supplier-identity.js` → SUPPLIER-IDENTITY TEST PASSED (33 ok)
  - `node tests/supplier-activate.js` → SUPPLIER-ACTIVATE TEST PASSED (22 ok; the jsdom "navigation to another Document" notice is pre-existing in that harness)
  - `node tests/run-all.js` → **72 passed, 0 failed** (divider-framed summary line, read from the log)
- Errors: none

### [2026-11-03 03:15:00] - [Agent: cline] - [Status: COMMITTED]
- Task: log the T21 step-7 (commit 2) push
- Files changed: docs/AGENT_CHANGE_LOG.md (this entry only)
- Commit: (this commit)
- Notes:
  - `802c9f3` pushed to `origin/main` (`4707fa5..802c9f3`), 4 files, +360/−52.
  - Ledger correction: `node tests/designer-services.js` reports **63** checks (34 → 63, +29), not the 56 first written — the entry above was fixed before committing.
  - Untracked `assets/logo/*.jpg` (9 files) were left alone: unrelated to T21 and not requested.
- Verified: `git --no-pager log --oneline -1` -> `802c9f3`; `git push` -> `4707fa5..802c9f3  main -> main`
- Errors: none

### [2026-11-03 23:58:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T22 step 3 — region data gating (client slice; D1 + currency split out to the new T22b)
- Files changed:
  - `js/eatouts-regions.js` (62 lines changed): `code()` / `currency()` / `locale()` / `locationsFile()` and the gating helpers `recordRegion()` / `inActiveRegion()` / `filterByRegion()`; stale "no existing page loads this file yet" header note replaced with the gating contract.
  - `js/eatouts-bridge.js` (`all()` gates through `EatoutsRegions.filterByRegion`)
  - `js/eatouts-db.js` (`emptyRestaurant()` stamps `region`, `BW` fallback)
  - `js/eatouts-locations.js` (dataset resolved through `locationsFile()`)
  - `tests/region-gating.js` (new, 37 checks)
  - `tests/run-all.js` (registers the new suite)
  - `PLATFORM UPDATE TASKS.md` (T22 → COMPLETE, step 3 evidence, new T22b task + "Done when" status line)
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Commit: `bec6689` — code+docs commit (7 files, +272/−9); this ledger entry follows in its own commit.
- Notes:
  - **One gate, not twenty.** `EatoutsBridge.all()` (`js/eatouts-bridge.js:207-215`) is the single read path every directory, menu and promo surface in `index.html` uses, so gating there covers all of them — no per-page filter was added and no renderer changed.
  - **Nothing disappears.** `recordRegion()` reads a missing field *and* an unknown code as `BW`, so every venue saved before gating still loads. The new suite asserts both cases plus ordering.
  - `EatoutsDB.emptyRestaurant()` cannot read the registry unconditionally: `index.html` loads `js/eatouts-db.js` at `:988` and `js/eatouts-regions.js` at `:999`, so it guards with `window.EatoutsRegions && typeof … === 'function'` and falls back to `'BW'`. Load order was left alone.
  - `EatoutsLocations` keeps working with no registry present (standalone pages), and for an active region whose `locations` file is not `botswana_locations.js` it sets `DATA = null` — indexes empty, `stats().loaded === false`, selectors fall back to "Other / not listed" instead of offering Botswana towns for another country.
  - Scope decision (user chose option A): the D1 half (migration `0016_region.sql` + `functions/api/venues.js` filter) and region-driven currency are **not** done — `migrations/` has no local test harness and every page's `money()` helper would change in one diff. Both are written up as **T22b** in `PLATFORM UPDATE TASKS.md`.
  - Not verified: the browser. jsdom proves the gate logic, not that any visual surface changed — it does not, since all data is BW today.
  - Untracked `assets/logo/*.jpg` (10 files) and `runall.txt` were left alone — unrelated to T22 and not requested.
- Verified:
  - `node tests/region-gating.js` → **REGION-GATING TEST PASSED**, 37 ok, 0 failed, 0 window errors
  - `node tests/run-all.js` → **74 passed, 0 failed** (73 → 74)
  - `npm run inventory` → INVENTORY PASSED (10 checks, 92 warnings = baseline; 31 screens, 73 standalone files)
- Errors: none

### [2026-11-03 18:06:31] - [Agent: cline] - [Status: COMMITTED]
- Task: QA debt made visible — new `docs/DEVICE-PASS-CHECKLIST.md`, plus the two open non-QA leftovers (T16's hand-off box, T05's missing DONE header)
- Files changed:
  - `docs/DEVICE-PASS-CHECKLIST.md` (new, 207 lines): the 11 open "device pass" boxes grouped into 12 screens (page, widths, pass rule per screen, console probe, sign-off table, failure log), with new rows for T18 and T22 which had no QA box at all.
  - `index.html` (`:9117-9127`): `const ACTIVE_REGION='BW'` deleted; new `activeRegionCode()` reads `EatoutsRegions.code()` with a `'BW'` fallback, and `whatsappChannelUrl()` keys off it.
  - `tests/about.js` (+2 checks, and one assertion swapped): "the live region comes from the registry, not a constant", "no hard-coded ACTIVE_REGION constant remains", "the channel follows the live region" (activates ZA for the check, then restores BW) and "switching back to Botswana restores the shipped unset state".
  - `PLATFORM UPDATE TASKS.md`: T05 header → ✅ DONE 2026-11-01; T16's "handed to T22" box ticked with evidence (`:391`/`:393` wording updated to match the code); device-pass boxes added to T18 (`:637`) and T22 (`:801`); progress-log row.
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Notes:
  - This closes the last **non-QA** open box in the roadmap. What is left is now exactly 1 open build task (**T22b**: D1 `region` column + `functions/api/venues.js` filter + region currency), 13 device-pass boxes, and 1 decision (the A–Z rail, G1).
  - The WhatsApp row's behaviour is **unchanged today** — BW is the only active region, so `activeRegionCode()` returns `'BW'` in production. The point is that the row now follows the selector instead of a constant, which is what T16's hand-off box was waiting for.
  - The ZA round-trip in `tests/about.js` flags ZA active on `window.EATOUTS_REGIONS` for the duration of one check (same technique as `tests/region-gating.js`), then restores the flag and the stored region, so no later assertion in the file sees ZA.
  - The checklist's width set (360/390/430) and page names were taken from the task bodies themselves, not invented; each entry cites the box it closes. Nothing in it was "verified" — it is a to-do for a human with a phone.
  - Not verified: the checklist itself (that is the whole point). Everything it asks for requires layout jsdom does not compute.
  - Untracked `assets/logo/*.jpg` (10) and `runall.txt` left alone — still unrelated and unrequested.
- Verified:
  - `node tests/about.js` → **ABOUT TEST PASSED** (65 ok, 0 failed, no window errors; was 63)
  - `node tests/run-all.js` → **74 passed, 0 failed**
  - `npm run inventory` → INVENTORY PASSED (10 checks, 92 warnings = baseline; 31 screens, 73 standalone files)
- Errors: none




### [2026-11-03 19:35:00] - [Agent: cline] - [Status: COMMITTED]
- Task: T22b — region gating part 2: the D1 `region` column, the `/api/venues` region filter, and region-driven currency
- Files changed:
  - `migrations/0016_region.sql` (new, 55 lines): `ALTER TABLE restaurants ADD COLUMN region TEXT NOT NULL DEFAULT 'BW'` + `idx_restaurants_region`. The default is the backfill (BW is the only active region), the seed keeps working because `scripts/build_d1_seed.py` names its columns and simply omits `region`, and the header records why there is no down migration (repo convention, see 0015) and why the column must ship with the filter, not before/after it.
  - `functions/api/venues.js`: new `REGION_CODES` + `regionParam()` (uppercases `?region=`, unknown/absent -> `BW`); all three branches (`mine`, `q=`, bare list) now filter on `region`, each SELECT returns the column, and the payload echoes `region`.
  - `js/eatouts-regions.js`: `symbol(code)` (BWP->P, ZAR->R, USD->$, MWK->MK, KES->KSh; unmapped -> its own code) and `money(v) = symbol() + n.toFixed(2)`, both exported next to `currency()`.
  - `js/eatouts-brand-kit.js` (`money()` delegates to the registry, old literal kept as the fallback) and `js/eatouts-manager.js` (`EO.money` falls back to `EatoutsRegions.currency()` instead of a literal `BWP`).
  - `tests/api-venues.js` (18 -> 34 checks): the LIST endpoint gets its own fake D1 + fake KV (same shape as `tests/api-business.js`) covering default BW, `?region=ZA`, lowercase, unknown -> BW, `q` x region in both directions, `limit`, `mine` 401 / BW / ZA, and no-backend 503.
  - `tests/region-gating.js` (37 -> 43 checks): `symbol()`/`money()` for BW, the ZA switch, explicit codes, and an unmapped currency printing its own code. `tests/money.js` (33 -> 38): the registry formatter plus source assertions that the brand kit and manager delegate.
  - `PLATFORM UPDATE TASKS.md`: roadmap row, T22's hand-off box, the T22b body (files, steps, evidence, one stated boundary), a progress-log row. `README.md`: `GET /api/venues` documented as region-scoped.
- Notes:
  - BW output is byte-identical to what the pages already print (`P12.50`), so the currency change is invisible until a second region is active. That is deliberate: it makes the diff safe to ship on a live Botswana app.
  - Boundary, stated in the task and here: the 16 root pages that still carry their own `money()` helper keep printing `P` — they do not load `js/eatouts-regions.js`, so delegating them would change nothing today and cost a 16-page sweep. It should ride with the first non-BW region.
  - Local D1 rehearsal is now real evidence, not a claim: 0016 applied on top of 0001-0015, `PRAGMA table_info` shows `region TEXT NOT NULL DEFAULT 'BW'`, the index exists, 567/567 seeded venues read BW, and a throwaway `region='ZA'` row was invisible to the BW filter (deleted afterwards, count back to 567).
  - Errors: two `SQLITE_BUSY` failures came from running three `wrangler d1 execute --local` calls **in parallel** against one local file. Re-ran sequentially — that was my mistake, not a repo problem.
  - Not verified: the `--remote` apply (`npm run db:migrate`). It needs the user and should run after this push.
- Verified:
  - `npm run db:migrate:local` → 0016 applied; `npx wrangler d1 execute ... --local` → column, index, 567 BW rows, ZA row filtered out
  - `node tests/api-venues.js` → **34 checks passed** · `node tests/region-gating.js` → PASSED (43) · `node tests/region-selector.js` → PASSED · `node tests/money.js` → **38 checks passed**
  - The three `functions/api/venues.js` statements run verbatim against the local D1 (real schema, not the fake): bare → 3 rows, `q` + region → 3 rows, `mine` join for a non-member → 0 rows.
  - `node tests/run-all.js` → **74 passed, 0 failed**
  - `npm run inventory` → INVENTORY PASSED (10 checks, 92 warnings = baseline)
- Errors: none


### [2026-11-03 19:52:00] - [Agent: cline] - [Status: COMMITTED]
- Task: G1 — the A–Z rail decision, closed as "keep what shipped"
- Files changed:
  - `PLATFORM UPDATE TASKS.md` `:226`: box ticked. The decision plus the evidence — `index.html:717` is the intended behaviour (hides its own scrollbar, `touch-action:none`), `:718` kills the WebKit scrollbar, `:719` makes every letter a `flex:1 1 0` tap target so the whole A–Z set fits at 360px without scrolling. The §G1 audit line it came from predates that redesign and is now recorded as stale, not as a defect.
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Notes:
  - No code changed. This was a documentation/decision tick, which is why there is no test run in Verified: nothing executable moved.
  - The roadmap is now **13 open boxes, all of them device passes**, and zero open build or decision work. The remaining 13 are for a human with a phone (`docs/DEVICE-PASS-CHECKLIST.md`, 12 screens).
  - Untracked `assets/logo/*.jpg` (10) and `runall.txt` are still untouched — they are unrelated to every task in this session and were never requested.
- Verified:
  - Rail CSS read directly at `index.html:717-719` (scrollbar hidden, `touch-action:none`, `flex:1 1 0` letters) before the tick was written.
  - No test suite run: no code changed.
- Errors: none


### [2026-11-03 20:05:00] - [Agent: cline] - [Status: COMMITTED]
- Task: housekeeping — the 10 untracked duplicate logo jpgs and the stray `runall.txt` are now ignored, so `git status` is clean without deleting anything
- Files changed:
  - `.gitignore`: one labelled block naming the ten exact paths (`assets/logo/{Boxer_Liqours_Logo,EatOuts_Logo,Nandos-Logo,butter_chicken_indian_restaurant,chicken_licken_logo,cresta-hotel-logo,pub_20_two,the_beef_baron,tops_logo}.jpg` + `assets/logo/zen_cafe_logo (1).jpg`) and `runall.txt`. Deliberately **exact paths, not `assets/logo/*.jpg`** — 100+ real venue logos in that folder are `.jpg` and tracked, so a blanket pattern would have hidden live assets.
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Notes:
  - Re-audited before ignoring (the earlier audit is at this file's `:414`): every live logo reference resolves to a committed sibling — `Boxer_Liqours_Logo.png`, `tops_logo.png`, `Nandos-Logo.png`, `zen_cafe_logo.jpg`, `*.webp` for butter chicken / chicken licken / pub_20_two — and `assets/data/BottleLliquorStoresDatabase.js:26-27` + `tests/bottle-stores.js:84-86` assert the `.png` spellings. `EatOuts_Logo.png` (72 KB, tracked) is the brand mark; `EatOuts_Logo.jpg` (7.8 KB) is not referenced by anything.
  - Nothing was deleted: the files stay on disk as source art, they just stop appearing as untracked noise.
  - `git ls-files -ci --exclude-standard` prints nothing, i.e. no tracked file became ignored — the check that matters when editing `.gitignore`.
- Verified:
  - `git check-ignore -v` → all ten jpgs and `runall.txt` resolve to the new lines; `assets/logo/EatOuts_Logo.png` does **not**.
  - `git ls-files -ci --exclude-standard` → empty. `git status --short` → clean (only this commit's own changes).
  - No test run: no executable code touched.
- Errors: none


### [2026-11-04 13:52:25] - [Agent: cline] - [Status: COMMITTED]
- Task: T22c — make `/bw/<slug>` and `/zw/<slug>` genuinely multi-region: a country-keyed link registry plus a `/zw/` edge route
- Files changed:
  - `scripts/build_link_registry.mjs`: `COUNTRY` → `DEFAULT_COUNTRY` + `countryOf(record)` (reads `region`, lowercases, defaults `bw` — the same rule as `EatoutsRegions.recordRegion()`). `push()` takes a country; the uniqueness `Set` is keyed `cc|slug` and brand `groups` are keyed `cc|brandKey`. Emits `byCountry` **and** keeps `bySlug` as the default country's flat map. The seed writes each row's `country_code`, and a row `id` is country-prefixed only when a bare id would be shared. The content digest input is deliberately unchanged, so the epoch did not move.
  - `assets/data/link_registry.json`, `scripts/seeds/business_links.sql`: regenerated.
  - `functions/api/_links.js`: `getRegistry()` returns the whole artifact; new `slugMapFor(reg, cc)` reads `byCountry[cc]` and falls back to `bySlug` **only when `cc === 'bw'`**. `resolveLink()` uses it — this is the line that stops `/zw/kfc` handing out Botswana's `rest_kfc`.
  - `functions/api/_vanity.js` (new): the `/bw/<slug>` handler moved here verbatim, plus a 4th meta field (`type|refId|slug|country`). `functions/bw/[[path]].js` and new `functions/zw/[[path]].js` are one-line re-exports.
  - `js/eatouts-router.js`: `readMeta()` reads the country from a 4-field meta and defaults a 3-field one to `bw` (replaces the hardcoded `country:'bw'`).
  - `functions/api/business/link.js`, `functions/api/links/check.js`: registry lookups go through `slugMapFor(…, cc)`, so a slug taken in BW no longer blocks the same slug in ZW.
  - `tests/router.js`: 73 → **92 checks**.
  - `PLATFORM UPDATE TASKS.md`: T22c row + brief (Phase 0 casing contract, Phases 3–5 left open), progress-log row.
  - `docs/AGENT_CHANGE_LOG.md` (this entry)
- Notes:
  - Three single-country assumptions were fixed, not just the resolver: global slug uniqueness (Zimbabwe's KFC would have shipped as `/zw/kfc2`), brand grouping with no country dimension (a Harare KFC would have been folded into Gaborone's link, which prefers a `'gaborone'` branch), and the `bw` constant feeding the seed.
  - `functions/[region]/[[path]].js` was rejected on purpose: it also matches `/assets/logo/<file>.jpg` and `/js/<file>.js` (two segments), which would shadow every asset on the site. Regions are explicit directories instead.
  - Casing contract (Phase 0): `business_links.country_code`, URL segments and registry keys are lowercase; `restaurants.region` is uppercase. `countryOf()` is the only converter.
  - Deliberately **not** touched: `tests/catering-directory.js` (it reads `registry.bySlug`, which the artifact still provides) and `functions/api/venues.js` (T22b territory).
- Verified:
  - Regenerated artifact diffed against `HEAD`: 839 → 839 links, identical slug set, 0 mismatches on `slug → type|refId|name`, all 839 entries tagged `country:'bw'`, only `bw` emitted, `bySlug` deep-equals `byCountry.bw`.
  - `scripts/seeds/business_links.sql`: 839 INSERTs, **every row byte-identical** to `HEAD`; only the `-- Public business links:` header line differs, so re-applying it to D1 is a no-op.
  - `node tests/router.js` → **92 checks passed**; `node tests/run-all.js` → **74 passed / 0 failed**; `tests/catering-directory.js` PASSED; `tests/venue-slug.js` 31; `tests/venue-slug-integration.js` PASSED.
  - New tests that would have caught the original bug: `resolveLink('zw','nandos')` → not found, `edge('/zw/kfc')` → 404, `slugMapFor({bySlug:{kfc}}, 'zw')` → `{}`.
- Not verified:
  - Browser paint of `/bw/nandos` and `/zw/kfc` (status codes + injected meta inspected, not rendered).
  - Remote D1 still has no `restaurants.region` column until a human runs `npm run db:migrate` against `--remote` (T22b leftover; unrelated to this change — the link layer reads the client JSON, not D1).
- Errors: none

### [2026-11-04 16:07:39] - [Agent: cline] - [Status: COMMITTED]
- Task: Purge the legacy `.online` host — repo-wide correction to the canonical `www.eatouts.site` (17 occurrences across 9 tracked files). Both open questions resolved by the user as recommended: **Q1 = A** (edit the applied-migration comment) and **Q2 = yes** (add a drift guard).
- Files changed:
  - `js/eatouts-slug.js`: `url()` returns `www.eatouts.site` + path (still host-without-scheme, so `Slug.url('bw','tops')` → `www.eatouts.site/bw/tops`); header comment ×2 and the `url()` docstring updated
  - `js/eatouts-business-signup.js`: the "Your EatOuts link" hint (`sg-hint`, l.471) and the `Link saved — …` toast (l.604) now show the `.site` host
  - `functions/api/_vanity.js`: T22c header comment (l.4–5)
  - `index.html`: vanity-link comment (l.10886)
  - `eatouts-suppliers.html`: PUBLIC PROFILE comments (l.681, l.1979)
  - `scripts/build_link_registry.mjs`: header comment (l.5) + the emitted seed header (l.271)
  - `scripts/seeds/business_links.sql`: regenerated — **line 2 only**
  - `migrations/0004_business_links.sql`: `--` comment (l.2). Q1 = A: an already-applied migration, but the edit is inside a comment, changes no schema, and D1 tracks migrations by filename (no checksum), so a re-apply is unaffected
  - `tests/router.js`: expectation pin (l.219) + edge fixture host (l.401) + **new section M — public host drift guard**
- Commit: `d3a7359` (9 files, +31 −17)
- Push: `a43c04a..d3a7359  main -> main`
- Verified:
  - `node scripts/build_link_registry.mjs` → 839 links (restaurant 477 · bottlestore 47 · supplier 315); `git diff --stat assets/data/link_registry.json` → **empty** (the artifact carries no host string at all)
  - `git diff scripts/seeds/business_links.sql` → **exactly 1 line** (line 2). The 839 INSERTs stay byte-identical because the content digest is `sha256([type,slug,refId,name])` and never includes the header text
  - `git grep -n "eatouts\.online"` → **no matches** (repo-wide zero `.online` state, migration comment included)
  - `node tests/router.js` → **93 checks passed** (92 before + 1 guard)
  - `npm test` → **74 passed / 0 failed** (exit 0)
  - `tests/catering-directory.js` PASSED · `tests/venue-slug.js` 31 checks · `tests/venue-slug-integration.js` PASSED
  - **Guard has teeth (mutation probe, not a vacuous assertion):** appending a probe comment spelling the stale host to `js/eatouts-slug.js` produced `FAIL no stale public host in shipped files  -- js/eatouts-slug.js`; restoring from backup returned 93 passed, with `git diff --stat js/eatouts-slug.js` back to exactly 4 insertions / 4 deletions
- Notes:
  - The guard scans the **7 shipped files** — `migrations/` is deliberately excluded because Pages does not deploy it. It assembles the stale host as `'eatouts' + '.' + 'online'` so the assertion itself never contains (and can never re-introduce) the string it hunts for.
  - `Slug.url()` deliberately keeps returning the host **without** scheme, matching the test pin. Whether to emit `https://` is a separate product decision and was not taken here.
  - The signup hint and toast are asserted by no suite (no signup suite exists), so nothing would have caught their regression; the guard now covers the literal host in that file, but not the surrounding copy.
  - `_archive_local/tier1/_trash/biz-signup-block.txt` (2 hits) is gitignored trash (`.gitignore:66`) and was left untouched.
  - This is a repo-only change: if the legacy `.online` domain is still configured as a Cloudflare Pages custom domain (outside this repo), it keeps serving the site — nothing here breaks it, and nothing here moves traffic.
  - This entry deliberately never spells the stale host, so the documented repo-wide drift grep returns **0 matches** rather than tripping on its own record.
- Errors: none


### [2026-11-05 01:53:26] - [Agent: cline] - [Status: COMMITTED]
- Task: Rebuild the open `.ritem` panel in `search_screen.html` so a result card is the directory card verbatim (`bakeryOptions()` in `index.html`): two read-only location lines + Menu + Promos + the centred heart / WhatsApp / info row — 5 rows, 7 buttons. User picked **exact directory parity** for row 4: type-aware Menu label, Promos deep link, About fallback where no promos route exists (bakery / curated-only / promo / event rows).
- Files changed:
  - `search_screen.html` (+193 −15)
    - CSS: `.result-opts`/`.ropt` (2-up grid) replaced by `.ropts` / `.line` / `.line-select.is-set|.is-disabled` / `.line-action` / `.card-ico-row` / `.ico-btn`, copied from `index.html` l.787–805, plus `.ico-btn.is-disabled` for the inert WhatsApp variant
    - `waDigits(rec)` helper: the WhatsApp-labelled contact (`rec.contacts` **and** `rec.directory.contacts`, where `EatoutsSeed.mergeDirectory` actually stores it), plain `phone` for the curated lists, digits-only with an 8–15 length guard so a concatenated two-number `Phone` value can never be dialled
    - `whatsapp: waDigits(...)` now carried on every index row (restaurant, promo, event, catering, bakery, bottle store, overlay venue) so rendering never re-reads the db
    - `resultOptions(item)` + `hasPromosRoute` / `locationLine` / `favType` / `favRef` / `favIsOn` / `favIco` / `waIco` / `infoIco`
    - `itemById` / `openPromos` / `toggleFavResult` / `platformWhatsapp` / `sendWhatsApp`, wired into the `#results` click delegate (`openPromos`, `toggleFav`, `sendWhatsApp`)
  - `tests/search-screen.js` (+114 −5): `.ropt` selectors replaced by the 5-row / 7-button contract, the Promos route, the sign-in gate, the signed-in save (heart fills, panel stays open, store gains one entry), venue number vs platform number, and the bakery About fallback
- Verified:
  - `node tests/search-screen.js` → **SEARCH SCREEN TEST PASSED**, **60 checks** (45 before)
  - `npm test` (`node tests/run-all.js`) → exit code **0**; `inventory`, `restloc` and `bottle-stores` (which assert the *directory's* `.ropts.brows`) are untouched and still pass
  - Accordion mechanics, thumb preview, region button and filters all still green in the same suite
- Not verified:
  - Real-browser paint/feel of the panel on `search_screen.html` (jsdom asserts structure, computed `.result-thumb`/row geometry and the CSS text only)
  - A signed-in backend round-trip: the store is exercised through `EatoutsCustomer.favourites` in localStorage mode (the test stubs `getUser`, and stubs `window.confirm` because jsdom has no dialog)
- Notes:
  - WhatsApp is never a dead tap: the venue's own line when the record carries one, otherwise `EatoutsDB.load().settings.whatsapp` — the same fallback `resolveVenueWhatsapp()` uses in `index.html`. `wa.click` is tracked through `EatoutsAnalytics` with `context:'search_screen'`.
  - Favourites are keyed `type:refId`; restaurant rows use `EatoutsBrand.canonicalKey(slug)` so a chain saved here and on the Restaurants list collapses to one entry. Branch rows that only `EatoutsBridge.brandKeyOf()` aliases (`BRAND_ALIAS`, not exported) can still key per-branch.
  - Town/Area are display-only lines (`is-disabled` + "Select Town"/"Select Area" when empty) — no re-filtering, matching the single-venue nature of a search row.
- Errors: none

