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

