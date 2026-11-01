# EatOuts — AI Delegation Pack

**Created:** 2026-11-01
**Source of truth:** `PLATFORM UPDATE TASKS.md` (33 tasks: G1–G5 + T01–T28)
**Purpose:** hand one prompt (P1–P7) to a fresh AI session so it produces the diff; the lead
agent then verifies against §4 and commits.

**State when this pack was written**

| Measure | Value |
|---|---|
| Queue rows done | 25 / 34 (74%) — 5 globals + 20 tasks + T08b |
| Tasks left | 7 — T09, T05, T18, T12, T13, T21, T22 |
| Effort done (S=.5 M=1 L=2 XL=4) | 22.75 / 41.75 = **54.5%**; 19 units (45.5%) remain |
| Tests | `npm test` → 60 suites passed, 0 failed |
| Audit gates (§5 helpers 1–3) | all three print nothing |
| Device passes outstanding | 11 (see Appendix A) |

---

## 0. Read this first (instructions to the receiving AI)

You are contributing to the **EatOuts** static-HTML app: a flat root folder of `*.html` pages plus
`js/`, `assets/`, `tests/`, `scripts/`. No framework, no bundler, no build step for pages.
You will be given exactly **one prompt (P1–P7)**. If you are not given one, stop and ask.

Before writing code:

1. Read `AGENTS.md` (top-level rules) and `PLATFORM UPDATE TASKS.md` §1 (the five global standards).
2. Read the files listed in your prompt's **SCOPE** only. Do not read `index.html` end-to-end
   (10,347 lines) — use `Select-String` to locate the lines you need.
3. Produce a `## PLAN` and `## ASSUMPTIONS` block **before** any code.

Hard rules (violating any = rejected work):

- Windows **PowerShell** only. `Select-String` not `grep`, `Get-Content` not `cat`, `;` not `&&`.
- **Minimal diff.** No drive-by refactors, no reformatting, no renaming outside scope.
- **No new dependencies.** No frameworks, no popup/carousel library. Copy the existing `.fpop` recipe.
- **Never hand-edit** `HTML_CATALOG.md` or `PAGE_INVENTORY.md`; edit `scripts/html_catalog.meta.json`
  then run `npm run catalog` / `npm run inventory`.
- Every new root `*.html` must be added to `copy-static.mjs` `FILES`, or it 404s in production.
- Popups follow **G3**: centred `min(92vw,420px)`, `max-height:80dvh`, scrim / Escape / outside-tap
  closes, plain `X` glyph (`class="fpop-x"`) — **never** `fpop-close`, never `align-items:flex-end`,
  never `border-radius:… 0 0`.
- No accordion glyphs (`▾ ▸ ▲ ▼ ^ +`) as open/close affordances (**G2**).
- List/card thumbnails = **90px**; `sup-profile-avatar`, `prompt-thumb`, recipient hero = **150px** (**G4**).
- Every page hides scrollbars (**G1**). Do not introduce `100vw` widths or negative-margin overflow.
- If a requirement is ambiguous: **ask, don't invent.** Maximum 3 questions.

---

## 1. Work order (smallest → largest)

| # | ID | Task | Size | Depends on | Prompt |
|---|---|---|---|---|---|
| 1 | T09 | `venue-about` promo gallery → Add to Order | M | D10 (cart persistence) | P1 |
| 2 | T05 | `customer-delivery` redesign | L | — | P2 |
| 3 | T18 | `eatouts-suppliers` rework | L | D6 (closed) | P3 |
| 4 | T12 | `eatout_event_builder` overhaul | XL | — | P4 |
| 5 | T13 | `Created_Event.html` | L | **T12** (hard pair) | P5 |
| 6 | T21 | `designer-services` catalogue | XL | D8 (closed) | P6 |
| 7 | T22 | Multi-region + `EatOuts-Region.html` | XL | must land last | P7 |

Do **not** run tasks in parallel: T12/T13 share the builder preview, T09/T22 share the `index.html`
data boot, T21/T22 share the doc registrations.

Decisions already taken (do not re-open): **D6** publish flow is client-side and already works;
**D7** no WhatsApp Channel exists, `WHATSAPP_CHANNELS.BW` stays empty; **D8** §6 prices win,
Full Packaging Design = P550, Menu refresh + Event programme dropped; **D10** persist the cart.

---

## 2. The prompts

### P1 — T09 · `venue-about.html` promo gallery → Add to Order

```
GOAL
Tapping a promo thumbnail on venue-about.html opens a floating gallery with dots + swipe, and an
"Add to Order" button writes exactly one line into the EatOuts cart.

SUCCESS CRITERIA (each must be demonstrable)
[ ] Tap .promo-thumb -> lightbox: feint black backdrop, image centred, dots for the gallery,
    swipe left/right moves the image, dots track the index.
[ ] "Add to Order" sits centred horizontally BENEATH the image.
[ ] Tap outside the image (backdrop) closes; Escape closes.
[ ] "Add to Order" adds exactly ONE cart line {promoId, title, price, qty:1}; tapping again
    increments qty and never duplicates the row.
[ ] Cart badge + total update without a reload.
[ ] Cart survives a reload (D10: localStorage key eatouts_cart_v1).

DECISION D10 (already made - implement option A)
- index.html persists state.cart to localStorage 'eatouts_cart_v1' on every mutation, hydrates it
  on boot, and exposes window.EO_cart = { addPromo(line), total(), keys() }.
- venue-about.html has NO cart code today (verified: it does not load js/eatouts-customer.js), so it
  writes the line into the SAME store and then navigates back to the venue.

CONTRACT (define before coding; paste into your PLAN)
eatouts_cart_v1 = {
  v: 1,
  cart: { "<key>": { itemId, sizeIdx, qty, extras, kind:"menu"|"promo", title?, price? } },
  updated: "<ISO8601>"
}
promo key  = "promo:" + venueSlug + ":" + promoId   // namespaced so cartKeys() ignores it
menu key   = "i<restId>:<itemId>_<sizeIdx>"          // index.html:3914 - DO NOT change this format

SCOPE - files you may touch
- index.html                    (cart hydrate/persist + addPromo(); see :3914-3940 and :9749)
- venue-about.html              (.promo-thumb CSS :352-365; markup :663-672 and venue photos :721-728;
                                 gallery/lightbox JS)
- tests/venue-about-options.js  (extend)
- tests/customer.js             (add cart-persistence checks)
- PLATFORM UPDATE TASKS.md, docs/AGENT_CHANGE_LOG.md   (after verification)

DO NOT
- Rename state.cart keys or move cart logic out of index.html.
- Add a carousel library.
- Change the venue-photos block beyond reusing the same gallery component.

RETURN
1. PLAN + ASSUMPTIONS
2. Diffs with full paths
3. Output of: npm run inventory ; npm run catalog ; npm test
```

### P2 — T05 · `customer-delivery.html` redesign

```
GOAL
Redesign customer-delivery.html per the 11 bullets. Popups float, the method gate works, and the
review step becomes a full screen with Edit + Delete.

SUCCESS CRITERIA (11 bullets, all checkable)
[ ] 1. No .hdr-chip on the page.
[ ] 2. .osum: .osum-back deleted; .osum-tot and .osum-items on ONE line reading "P0.00 for # item(s)".
[ ] 3. Every .acc sits on a 3% grey panel (the container, not the accordion itself).
[ ] 4. .acc-title background is 5% grey when open.
[ ] 5. Method gate: until a method is chosen every lower accordion is inactive; tapping one raises a
        floating popup "Choose a delivery method first".
[ ] 6. dest accordion: data-drp-open="area" and "propType" open floating .drp-list.open popups (not
        inline); .hint centred with exactly "Help the delivery driver find you. Gate colour, road name,
        nearby landmark etc."; GPS button light grey / dark grey text / centred, opens the Google Maps
        location picker and attaches the current location.
[ ] 7. recip accordion: real me / someone-else toggle; history becomes Recipient Cards (90px square
        thumb left, line 1 name, line 2 "# orders received"); tapping the thumb opens the enlarged image
        with Add image (device) / Edit details (first name, surname, mobile) / Delete beneath; the new
        recipient form = mandatory photo, first name, surname, gender, mobile (code + number); 150px
        square hero thumb above .row2; .acc-val shows the selected recipient's name.
[ ] 8. pay accordion: pickPay -> "Choose a bank" opens a floating .drp-list.open popup; the .hint and
        the "Payment preference recorded..." copy are removed; .acc-val shows the chosen bank.
[ ] 9. review accordion -> full screen listing everything prepared, Edit + Delete at the bottom, no
        accordion.
[ ] 10. The "WhatsApp Request" .acc-lbl is gone.
[ ] 11. barPrimary reads "Add P#.## to P#.## for # items" and tapping returns to the order summary.
[ ] The WhatsApp message includes recipient + delivery + payment + bank.

SCOPE - files you may touch
- customer-delivery.html   (1,017 lines; CSS :25-26, :42-60, :68-82; markup :149-151;
                            renderMethod :549, renderDestination :616, renderRecipient :681,
                            renderPayment :690, renderReview ~:751, renderWhatsApp :827,
                            barPrimary ~:116)
- tests/customer-delivery.js  (NEW - no suite covers this page today; tests/back-history.js only boots it)
- tests/run-all.js            (register the new suite)
- docs                        (after verification)

DO NOT
- Change the WhatsApp message format that js/wa.js produces for other pages.
- Convert the page into an SPA screen; it stays standalone.

RETURN
PLAN + diffs + the three verification commands.
```

### P3 — T18 · `eatouts-suppliers.html` rework

```
GOAL
Rework the supplier onboarding page: standard header, no export, per-service pricing steps, a
mandatory Y/M/D age picker, the Botswana town picker, and no portfolio step.

DECISIONS (already made - do not re-litigate)
- D6: the publish flow already works client-side (data-act="publish" :526, publishReady() gate,
  status='published', #hdrStatus pill :506, draft store eatouts_supplier_draft_v1 :308).
  "Activate" = confirm and document this. Do NOT build a backend.
- Age is MANDATORY. The export / profile-JSON feature is removed entirely.

SUCCESS CRITERIA
[ ] 1. .title#hdrTitle (:272) gone; the page uses the standard #hdr header.
[ ] 2. Publish/activate flow verified and noted in the doc (no new server code).
[ ] 3. Step 1 (i1): 150px centred square rounded profile-image picker + a SEPARATE business-logo
        picker (both device upload); owner.headshot URL field (:746) removed; age = mandatory
        3-column Year/Month/Day picker, each column opening a floating scroll-list popup, day list
        honouring month length + leap years; account-only listing; Step 1 auto-fills the account
        holder's personal details.
[ ] 4. Step 2 (i2): toggleService -> floating .sheet; per-service image gallery (add/remove/swipe, tap
        to enlarge); the single i3 removed; ONE pricing step per selected service with unique data-step
        keys (pricing:<cat>:<type>), each with its own pricing + discount scheme; .cat-chev removed.
[ ] 5. Step 4 (i4): addImage URL button removed; device-only gallery with add/remove/swipe.
[ ] 6. Step 5 (i5, portfolio) removed entirely - i4 covers it.
[ ] 7. Step 6 (i6): location.town opens a floating town picker sourced from botswana_locations.js;
        "Neighbourhood / area" removed; all .chip equal width; availability.peakSeason (:443) removed.
[ ] 8. Step 7 (i7): .foot removed; the whole export/JSON feature and every code path removed.
[ ] 9. Steps renumbered 1-5 while keeping data-step keys stable.
[ ] grep -ri "export profile|profile JSON" returns 0.

SCOPE - files you may touch
- eatouts-suppliers.html (1,779 lines - VERIFIED anchors, do not trust ":~" guesses):
    header        .title#hdrTitle :270, #hdrStatus :271
    publish       data-act="publish" :526, publishReady() :1031, gate call :1366,
                  DRAFT_KEY :308, publish contract documented :298
    step scaffold :713-730  (data-act="toggleStep", 5 keys: services/pricing/gallery/contact/review)
    identity      NO renderIdentityStep() EXISTS - rendered inline :713-756;
                  owner.headshot :744
    services      renderServicesStep() :757, toggleService() :778 / :1429
    pricing       renderPricingStep() :813
    gallery       renderGalleryStep() :874, addImage :892 / editImage :1330
    contact       renderContactStep() :941, "Neighbourhood / area" :953,
                  availability.peakSeason :441 + :966
    review        renderReviewStep() :978, .foot :1164
    export        :995 (button), :1074 (dash action), :1397 (handler), exportProfile() :1701
    step tints    .acc-item.i1-i7 :130-136
- botswana_locations.js  (read-only data source - do not modify)
- js/supplier_onboarding_catalog.js (inspect first: may hold the service list to repeat per service)
- tests/eatouts-suppliers.js (NEW - no suite covers this page today) + tests/run-all.js
- docs (after verification)

DO NOT
- Touch eatout_event_builder.html (that is T12) or the public catalogue behaviour.
- Invent a server endpoint.

RETURN
PLAN + diffs + verification commands.
```

### P4 — T12 · `eatout_event_builder.html` overhaul (9 sub-areas, 9 atomic commits)

```
GOAL
Nine verifiable sub-areas, each shipped as its own commit (12.1 -> 12.9) with tests green after each.
This is the highest-regression page in the repo: one sub-area per commit, stop and hand back after 12.9.

12.1 VENUE BAR - .venue-bar-expand.open (:63-66 CSS, expanded markup :1894)
     All text 16px. Remove "Venue Provider", "Name, from P0.00", "Spaces", "Selected".
     .title-edit-panel (:694-697) -> floating popup (G3): it already floats at >=520px but is a
     bottom sheet below that, so apply the full recipe (min(92vw,420px), max-height:80dvh,
     no align-items:flex-end, no "border-radius ... 0 0").

12.2 SCHEDULE - [data-sec="schedule"]
     setScheduleMode chips (one-day / multi-day) equal width + centred. .schedule-day becomes a
     collapsible accordion. Date fields -> 3-column Year / Month / Day buttons on one centred row,
     each opening a floating scroll-list popup, day count correct per month + leap year. Time fields
     -> 2-column Hour / Minute buttons on one row, same popup pattern.

12.3 AUDIENCE - [data-sec="audience"]        anchors: .field-hint :139, .rm :2156/:2169,
     Thin light separator above the field hint. addAudience (btn :2161, handler :3558) ->
     floating .prompt-panel. Thin light separator above "Event Rules". addRule (btn :2173) ->
     floating .prompt-panel. .rm (removeAudience / removeRule) -> light grey "X", no white circle.
     >>> .prompt-panel is ONE rule (:704-706) reused by 12.6 / 12.7 / 12.8 - convert it HERE and
     >>> those three become residual checks. Do not re-diff the same rule four times.

12.4 SUPPLIERS - [data-sec="suppliers"]      anchors: openSupplierTypeMenu :2356/:2389/:3618,
     .fpop-scrim :536-539, .fpop-body :551, .fpop-search :548/:2517, .sup-profile-scroll :600/:2567,
     .sup-profile-name :608/:2570, .sup-profile-loc :609, .qty-stepper.sm :652/:2446/:2550
     ALREADY SATISFIED - verify with Select-String, DO NOT rewrite:
       .fpop-close = 0 hits; .fpop-x :545 is already background:transparent (plain glyph)
       .sup-profile-avatar :604 is already 150px ; .pit-thumb :621 is already 90px
     Remaining work:
     openSupplierTypeMenu -> floating .fpop-scrim (not a bottom sheet). .fpop-search pinned to the
     bottom of that popup with .fpop-body above it. .sup-profile-loc -> 16px. .sup-profile-scroll ->
     floating popup. .sup-profile-name -> "Service Provider Info" floating popup (90px thumb left;
     right = name + services; description below). .pit-thumb tap -> full-image gallery (feint black
     backdrop, dots above the image, white caption below, outside-tap closes). .qty-stepper.sm ->
     centred -/+ moved to a row BELOW .pit-info, right-aligned, added cost left-aligned under
     .pit-info. .pit-info = 90px thumb left, .pit-title + .pit-price right.

12.5 DETAILS - [data-sec="details"]
     Centre .chip-row. setEventMode chips equal width. Centre .field-hint. Dress code ->
     Dress-Code-Cards: 90px square thumb, tap = gallery (add/remove/swipe), add/edit/remove cards.

12.6 GUESTS - [data-sec="guests"]              anchors: renderPrompt() :3025, prompt-panel :3072
     .prompt-panel floating (inherited from 12.3 - verify only). ALREADY SATISFIED, do not redo:
     .prompt-thumb :709 / :3032 is already 150px; .fpop-x :3075 is already a plain X; .fpop-close = 0.
     Remaining: "Add photo" text removed; .qty-stepper :3036 -/+ centred (it lives inside
     renderPrompt(), so this is a prompt-popup change, not a guests-section change).

12.7 RSVP - [data-sec="rsvp"]: .prompt-panel floating (from 12.3); close glyph already plain
     (renderPrompt() :3025, .fpop-x :3075). Expect a VERIFY-ONLY commit - say so if nothing changes.
12.8 LINKS - [data-sec="links"]: .prompt-panel from 12.3; renderLinkPicker() :3097, .fpop-x :3108
     already plain. VERIFY-ONLY commit expected.

12.9 SHARE + SAVE                          anchors: shareWhatsApp :2997/:3197/:3919,
     saveEvent :2996, prompt-panel :3072/:3105, draft :1290 (key) / :1318 (save) / :1328 (load)
     shareWhatsApp -> floating popup with 2 options: "Share with Venue Provider" / "Share with
     WhatsApp Contacts" (account-only; browser -> sign-up popup). saveEvent account-only. Leaving an
     in-progress event (account user) -> "Save draft?" floating prompt; the draft persists in
     STATE.draftKey="eatouts.event.draft.v2" (:1290, save :1318, load :1328) and restores everything;
     nav-btn[data-tab="reserve"] offers "Create New Event". On save: choose the event-card thumbnail
     (event images or device) + rename the title; the card shows created + edited dates.
     >>> Land 12.9 AFTER T13 (P5): it owns the payload Created_Event.html reads.

GLOBAL (applies to all nine)
[ ] No glyph indicators (G2). All popups floating (G3). No .fpop-close anywhere.
[ ] Draft survives navigation. Browser gates work.

SCOPE - files you may touch
- eatout_event_builder.html (4,204 lines) - ONLY this file for UI
- tests/builder-suppliers.js, tests/builder-preview.js, tests/builder-guests.js,
  tests/builder-schedule.js, tests/builder-audience.js   (update assertions per sub-area)
- docs (after each commit)

DO NOT
- Rename data-sec / data-step keys (T13 and the builder tests depend on them).
- Change the draft key or the preview markup contract (T13 reuses it read-only).
- Do more than one sub-area per commit.

RETURN
Per sub-area: PLAN, diff, and the `npm test` tail. Stop after 12.9.
```

### P5 — T13 · `Created_Event.html` (only after P4 is merged)

```
GOAL
A read-only page that renders a saved event exactly like the builder's preview, plus a WhatsApp share.

SUCCESS CRITERIA
[ ] New root page Created_Event.html: data-page="created-event", <!-- PAGE: Created Event -->,
    standard #hdr header + bottom nav, same visual result as the builder preview screen.
[ ] Loads a saved event by ?id= from the draft/published store and renders the preview markup
    READ-ONLY: no inputs, no edit affordances, no save button.
[ ] Share button -> Web Share API, falling back to wa.me with the page URL.
[ ] Empty / not-found state ("This event could not be found." + a way home).
[ ] Registered in copy-static.mjs FILES, scripts/html_catalog.meta.json, PAGE_INVENTORY.md,
    HTML_PAGES.md, and a new suite registered in tests/run-all.js.

SCOPE - files you may touch
- Created_Event.html        (NEW)
- eatout_event_builder.html (ONLY to expose the saved-event read function and/or the preview
                             renderer for reuse; no visual changes)
- copy-static.mjs           (FILES array)
- scripts/html_catalog.meta.json  (new entry modelled on the Orders-List.html entry)
- PAGE_INVENTORY.md, HTML_PAGES.md, FEATURES.md
- tests/run-all.js, tests/created-event.js (NEW)
- tests/back-history.js     (:147 asserts branded.length === 55 -> becomes 56; :153 asserts the
                              bespoke-header count stays 2)
- docs

DO NOT
- Duplicate the preview renderer. Extract or reuse it; do not fork it.
- Add editing, saving, or auth.

RETURN
PLAN + diffs + `npm run inventory ; npm run catalog ; npm test`.
```

### P6 — T21 · `designer-services` catalogue + galleries + requests

```
GOAL
Ship the 24-offer catalogue from PLATFORM UPDATE TASKS.md §6, working galleries, and persisted
design requests.

DECISIONS (already made - D8)
- §6 prices win. Full Packaging Design = P550 (the seed currently has svc_pack_system at P1800).
- Menu refresh (P400) and Event programme (P350) are REMOVED (no §6 home).
- §6a in the task doc is the authoritative seed -> target mapping. Use it as a lookup table.
- Offers marked "image to get" ship with a placeholder in assets/images/services/ and are listed as
  "images to get" in the docs.
- D2: 24 offers is authoritative - do NOT re-add legacy services to reach 30.

SUCCESS CRITERIA
[ ] Catalogue = exactly 24 offers at §6 prices (Brand Kit P350, Brand Kit Plus P500, Brand Guidelines
    P2,500, Simple Promo Card P120, Promo Print Poster P200, Promo Pack A P500, Promo Pack B P800,
    Story Pack A P400 / B P600 / C P900, Event Pack P300, Menu Design A P700 / B P1,200 / C P2,000,
    Business Cards P200, Shopfront Sign Design P800, Vehicle Wrap P1,500, Monthly Social Pack P1,200,
    Takeaway Bag Design P500, Full Packaging Design P550, Animated Promo P200,
    Animated Promo Pack A P500 / B P1,000, Logo Animation P500).
[ ] js/eatouts-services-seed.js holds 24 services; tests/designer-services.js:57 asserts 24 and :66
    asserts the new #1 (Brand Kit).
[ ] Header -> standard (T08) + the bottom nav exactly as briefed; .badges removed.
[ ] Copy reads "...from local designers...".
[ ] .cat-chips centred; every .ico span (:255) removed.
[ ] .card-img shows the full image (no fixed 118px crop) via aspect-ratio + object-fit:cover;
    .service-sub -> 16px; .plus removed.
[ ] pickService is account-only (browser -> sign-up popup).
[ ] .footnote centred, 16px.
[ ] Step 2: heading "Pick a style" -> "Available Designers"; body copy 16px; .designer-top / .av-ini
    -> 90px square rounded, tap enlarges; .min -> 16px; .pill.ok removed; hero toggle
    "Available Designers / Previous Designers" (previous = worked with before; unavailable ones
    inactive with "available from <date>" and a "notify me / there is work waiting" action);
    .designer-card <h4>+<p> centred between the avatar and .mosaic; .mosaic = 3-image snap carousel,
    tap a cell -> lightbox with dots + swipe, tap dots -> 3-across Pinterest grid on feint black,
    tap a grid image -> enlarge + swipe.
[ ] "Send my request" -> the designer's WhatsApp AND records the request on the user's profile;
    "My Design Requests" list added to eatouts-profile.html.
[ ] Step 3: account-only; choose from the user's listed businesses (prefilled) or "For Unlisted
    Business" (empty form).

SCOPE - files you may touch
- js/eatouts-services-seed.js   (291 lines; 30 svc_* -> 24)
- designer-services.html        (746 lines - VERIFIED anchors)
    CSS      .badges :31, .cat-chips :36, .cat-chip .ico :39, .card-img height:118px :42,
             .service-sub 11.5px :48, .designer-card :71-87, .mosaic 2-col grid :73-78,
             .designer-top :80, .av-ini :86, .footnote 10.5px :130
    markup   .badges :241, .cat-chips incl. .ico span :251/:255, .footnote :266,
             .card-img render :279, .service-sub render :282, .pill.ok :295
    render   renderCatalogue :229, renderServiceCard :273, renderServiceDetail :302,
             renderDesignerPicker :364, renderDesignerCard :413, renderBrief :442,
             renderSummary :490, renderDone :540, goto :596, submitRequest :618
    NOTE: .mosaic is currently a fixed 2-column grid, not a carousel - this is a rebuild, not a tweak.
- tests/designer-services.js    (:57 asserts 30 -> 24; :66 asserts 'Logo clean-up' -> 'Brand Kit')
- eatouts-profile.html          ("My Design Requests" section)
- js/eatouts-brand-kit.js, brand-kit-admin.html   (only if they reference removed/renamed services)
- assets/images/services/*      (placeholders; the folder currently holds only logo_cleanup.*)
- tests/designer-dashboard.js, tests/brand-kit-admin.js  (only if they assert seed contents)
- docs

DO NOT
- Repoint prices from anywhere other than §6.
- Change the request store shape: requests must land in eatouts_jobs_v1 as awaiting_admin
  (tests/designer-services.js asserts this).

RETURN
PLAN + diffs + verification commands + the "images to get" list.
```

### P7 — T22 · Multi-region + `EatOuts-Region.html` (must land last)

```
GOAL
Move the region inputs out of the scratch folder into the app, add a region registry, and ship a
region selector page. Botswana stays the only active region; all BW data must still load.

PRE-REQUISITE (do not skip)
SYNC REGION TASK/ is UNTRACKED. Commit it before moving anything - if it is wiped mid-move the
region inputs are gone permanently. Verified inventory (2026-11-01): 4 .js + 1 .html +
256 .png (Country-Flag-Icons/) + that folder. Nothing else.

SUCCESS CRITERIA
[ ] SYNC REGION TASK/ is empty and deleted. Moved: countries-data.js, territories.js,
    territory-registry.js, countries_mobile_networks.js -> js/ ; Country-Flag-Icons/* (256 files) ->
    assets/flags/ (the folder does not exist yet - create it) ; eatouts-region-selector.html ->
    reskinned + renamed EatOuts-Region.html.
[ ] New js/eatouts-regions.js exactly as specified in PLATFORM UPDATE TASKS.md §T22 step 2
    (window.EATOUTS_REGIONS with BW active + ZA/ZW/MW/KE inactive; getActiveRegion,
    setActiveRegion, isActive; persisted in localStorage 'eatouts.region.v1').
[ ] Data gating: every place/venue/menu/directory load filters by region (default 'BW' where the
    field is missing); location data resolved through the registry; currency formatting driven by
    the region.
[ ] Settings: a .setrow labelled with the active region ("Botswana") sits ABOVE "About EatOuts"
    and opens EatOuts-Region.html. INSERT IMMEDIATELY BEFORE index.html:8740
    (<a class="setrow" href="eatouts-about.html">About EatOuts</a>); .setrow CSS is :586-597,
    the settings accordion markup runs :8738-8746. Do NOT look near :8590 - that is the A-Z rail.
[ ] EatOuts-Region.html: reskinned selector (EatOuts header/nav/colours, flags from assets/flags/,
    search), Botswana selected; tapping any other region raises the floating popup
    "This region is coming soon."
[ ] index.html ACTIVE_REGION is no longer hard-coded 'BW' (the T16 hand-off): whatsappChannelUrl()
    follows the active region; an empty region keeps the coming-soon popup (no dead link).
[ ] Registered in copy-static.mjs, scripts/html_catalog.meta.json, PAGE_INVENTORY.md, HTML_PAGES.md;
    js/eatouts-regions.js is copied (js/ is copied wholesale - verify in dist/).
[ ] tests/back-history.js: branded page count 55 -> 57 (:147) after Created_Event.html +
    EatOuts-Region.html; :153 bespoke-header count stays 2. New tests/eatouts-regions.js registered
    in tests/run-all.js.
[ ] All Botswana data still loads: directory, venue pages, gallery, promos.

SCOPE - files you may touch
- SYNC REGION TASK/** (move/delete only)
- js/eatouts-regions.js (NEW), js/countries-data.js, js/territories.js, js/territory-registry.js,
  js/countries_mobile_networks.js, assets/flags/** (NEW)
- EatOuts-Region.html (NEW); eatouts-region-selector.html (source, deleted after the reskin)
- index.html (data boot + renderAbout settings row + ACTIVE_REGION wiring)
- botswana_locations.js (loader/wiring only, not the data)
- copy-static.mjs, scripts/html_catalog.meta.json, PAGE_INVENTORY.md, HTML_PAGES.md, FEATURES.md
- tests/run-all.js, tests/eatouts-regions.js (NEW), tests/back-history.js
- docs

DO NOT
- Activate any region other than BW.
- Rewrite the data schemas; add region:'BW' where missing and default to BW.
- Do this before T09 and T21 land.

RETURN
PLAN + diffs + verification commands + confirmation that SYNC REGION TASK/ no longer exists.
```

---

## 3. Numbered file manifest

**T09 — promo gallery + cart (P1)**

1. `index.html` — cart hydrate/persist (`eatouts_cart_v1`) + `addPromo()` + badge/total refresh.
2. `venue-about.html` — promo lightbox (dots / swipe / outside-tap) + "Add to Order" write + toast.
3. `tests/venue-about-options.js` — gallery assertions.
4. `tests/customer.js` — cart-persistence assertions.

**T05 — customer-delivery (P2)**

5. `customer-delivery.html` — all 11 bullets.
6. `tests/customer-delivery.js` — NEW suite.
7. `tests/run-all.js` — register the suite.

**T18 — suppliers (P3)**

8. `eatouts-suppliers.html` — the 9 steps.
9. `tests/eatouts-suppliers.js` — NEW suite.
10. `tests/run-all.js` — register it.
11. `js/supplier_onboarding_catalog.js` — inspect; adjust only if it drives the service list.

**T12 — event builder (P4)**

12. `eatout_event_builder.html` — sub-areas 12.1–12.9.
13. `tests/builder-suppliers.js`
14. `tests/builder-preview.js`
15. `tests/builder-guests.js`
16. `tests/builder-schedule.js`
17. `tests/builder-audience.js`

**T13 — created event (P5)**

18. `Created_Event.html` — NEW page.
19. `eatout_event_builder.html` — expose the saved-event read + shared preview renderer.
20. `copy-static.mjs` — add `Created_Event.html`.
21. `scripts/html_catalog.meta.json` — new catalog entry.
22. `HTML_CATALOG.md` — regenerated via `npm run catalog` (never hand-edit).
23. `PAGE_INVENTORY.md`
24. `HTML_PAGES.md`
25. `FEATURES.md`
26. `tests/created-event.js` — NEW suite.
27. `tests/run-all.js`
28. `tests/back-history.js` — branded page count 55 → 56.

**T21 — designer catalogue (P6)**

29. `js/eatouts-services-seed.js` — 30 → 24 offers at §6 prices.
30. `designer-services.html` — header / nav / copy / cards / step 2 / step 3.
31. `tests/designer-services.js` — `:57` 30 → 24, `:66` new first service.
32. `eatouts-profile.html` — "My Design Requests".
33. `assets/images/services/` — placeholders for the "image to get" offers.
34. `js/eatouts-brand-kit.js` — only if it references removed services.
35. `brand-kit-admin.html` — only if it references removed services.

**T22 — multi-region (P7)**

36. `SYNC REGION TASK/countries-data.js` → `js/countries-data.js`
37. `SYNC REGION TASK/territories.js` → `js/territories.js`
38. `SYNC REGION TASK/territory-registry.js` → `js/territory-registry.js`
39. `SYNC REGION TASK/countries_mobile_networks.js` → `js/countries_mobile_networks.js`
40. `SYNC REGION TASK/Country-Flag-Icons/*` (256 files) → `assets/flags/*` (folder must be created)
41. `js/eatouts-regions.js` — NEW registry.
42. `EatOuts-Region.html` — NEW page (reskin of `SYNC REGION TASK/eatouts-region-selector.html`).
43. `index.html` — region gating + Settings row above "About EatOuts" + ACTIVE_REGION wiring.
44. `botswana_locations.js` — loader wiring only.
45. `copy-static.mjs` — register `EatOuts-Region.html`.
46. `scripts/html_catalog.meta.json` + `HTML_CATALOG.md` (regenerated).
47. `PAGE_INVENTORY.md`
48. `HTML_PAGES.md`
49. `FEATURES.md`
50. `tests/eatouts-regions.js` — NEW suite.
51. `tests/run-all.js`
52. `tests/back-history.js` — branded count → 57.
53. `SYNC REGION TASK/` — deleted.

**Every task (no exceptions)**

54. `PLATFORM UPDATE TASKS.md` — tick boxes, set status, add a §8 progress-log row with the commit hash.
55. `docs/AGENT_CHANGE_LOG.md` — task, files, verification, commit hash.
56. `SESSION_NOTES.md` — what changed / what's next.

---

## 4. Verification protocol (the lead agent runs this — not the receiving AI)

```powershell
npm run inventory
npm run catalog
npm test
```

Then the §5 audit helpers from `PLATFORM UPDATE TASKS.md` (all three must print **nothing**):

```powershell
# 1. scrollbar hiding (resolves linked assets/*.css)
# 2. align-items:flex-end outside modals  (advisory audit 4 = `border-radius … 0 0`)
# 3. accordion glyphs outside allowlist
```

Per-task extras:

| Task | Extra check |
|---|---|
| T09 | Reload after Add to Order → line + total survive; second tap increments, no duplicate row |
| T05 | New `tests/customer-delivery.js` in `tests/run-all.js`; total suites 60 → 61 |
| T18 | `Select-String -Pattern "export profile|profile JSON" -Path eatouts-suppliers.html` → 0 hits |
| T12 | One commit per sub-area; report the delta in `back-history` page counts after T13/T22 only |
| T13 | `tests/back-history.js` branded count **56**; page appears in `dist/` after `node copy-static.mjs` |
| T21 | `node tests/designer-services.js` → asserts 24; nothing references `svc_pack_system` at P1800 |
| T22 | branded count **57**; `SYNC REGION TASK` gone; `dist/assets/flags` populated; `dist/js/eatouts-regions.js` exists |

Commit discipline: one `[Agent] <task> — <summary>` commit per task, ledger row in the same commit.
Never claim done without pasting the `npm test` tail.

---

## 5. Facts already established — do not re-derive or contradict

| Fact | Where |
|---|---|
| `state.cart` is **memory-only**; `cartKeys()` at `index.html:3916`; no persistence exists | index.html |
| Menu cart key format `i<restId>:<itemId>_<sizeIdx>` must not change | index.html:3914 |
| `venue-about.html` loads **no** cart code — writing to `localStorage` then navigating is the only option | venue-about.html |
| `tests/back-history.js:147` hard-codes **55** branded pages → two new pages break it | tests |
| `tests/back-history.js:153` asserts exactly **2** bespoke-header pages | tests |
| `SYNC REGION TASK/` is **261 untracked files** — commit BEFORE T22 moves them | repo root |
| `npm test` baseline at HEAD `6fb0e52` = **60 passed, 0 failed** | — |
| `tests/designer-services.js:57` asserts **30** services, `:66` asserts the current first service | tests |
| `venue-about.html` promo markup `.promo-thumb` exists at `:663-672`, CSS `:352-365` | venue-about.html |
| `designer-services.html` `.ico` spans at `:255`; `.card-img` fixed 118px crop | designer-services.html |
| `customer-delivery.html` render fns: method `:549`, destination `:616`, recipient `:681`, payment `:690`, review `~:751`, WhatsApp `:827` | customer-delivery.html |
| `eatouts-suppliers.html` export paths `:995` (button) / `:1074` (dash action) / `:1397` (handler) / `:1701` (`exportProfile()`); `owner.headshot` `:744`; `availability.peakSeason` `:441` + `:966`; `.foot` `:1164` | eatouts-suppliers.html |
| `eatout_event_builder.html` draft key `eatouts.event.draft.v2` — `:1290` / save `:1318` / load `:1328` | event builder |
| 5 onboarding pages (`bakery/bottle-store/mobile-kitchen/restaurant/supplier-onboarding.html`) already use the G3 floating recipe — copy it | done (B1) |
| **Already compliant — verify, do not "fix"**: `.fpop-close` = **0 hits** in the builder; `.fpop-x` is already `background:transparent` (`:545`); `.sup-profile-avatar` already 150px (`:604`); `.pit-thumb` already 90px (`:621`); `.prompt-thumb` already 150px (`:709`) | event builder |
| `.prompt-panel` is **one** CSS rule (`:704-706`) shared by 12.3 / 12.6 / 12.7 / 12.8 — convert it once in 12.3, then the other three are residual checks only | event builder |
| `title-edit-panel` `:694-697` already floats ≥520px but is a bottom sheet below it; needs the full G3 recipe (`min(92vw,420px)`, `max-height:80dvh`, no `align-items:flex-end`) | event builder |

Traps:

- `index.html` is **10,347 lines** — never paste it whole; locate with `Select-String`, then read a range.
- `HTML_CATALOG.md` / `PAGE_INVENTORY.md` are **generated**; hand edits are overwritten.
- New root `*.html` must be added to `copy-static.mjs` `FILES` or it 404s in production.
- `dist/` is build output — never edit it by hand.

---

## Appendix A — 11 device passes still owed (click-through only, no code)

Each of these is marked DONE in code but was only jsdom-verified. A human must confirm on a phone
(360×640) and a desktop (≥1280px) before the queue hits 100%.

| # | Task | What to click | Pass condition |
|---|---|---|---|
| 1 | T01 | Home → venue card → back | Hero + cards 90px, no horizontal scroll, back returns to the same scroll position |
| 2 | T11 | Venue → gallery → lightbox → swipe → outside-tap | Dots track, backdrop closes, no layout jump |
| 3 | T17 | Profile → recipient card → thumb → gallery | 150px hero, add/edit/delete all reachable |
| 4 | T15 | Orders → order card → detail | Status pill + timestamps render, nothing clipped at 360px |
| 5 | T08b | Any page → header → back arrow | Standard header everywhere, no doubled title |
| 6 | T03 | Cart → qty stepper → ± | Centred stepper, totals recompute with no reload |
| 7 | T07 | Checkout → pay → bank picker | Floating list opens, selection persists on reopen |
| 8 | T28 | Directory → filter chip row | Chips centred, equal width, no glyph arrows |
| 9 | T04 | Search → results → empty state | Empty state copy + no dead buttons |
| 10 | T06 | Notifications → list → mark read | Row heights stable, no badge overflow |
| 11 | T10 | Settings → every `.setrow` | Modals centre at 360px, Escape/outside-tap closes; re-check the 5 onboarding modals from B1 at 360px |

---

## Appendix B — how to hand this pack to another AI

1. Paste **§0** + **exactly one prompt** (P1–P7) from §2. Never paste two prompts at once.
2. The receiving AI returns a PLAN, diffs, and verification output — nothing else is accepted.
3. The lead agent applies the diff and runs §4. If a criterion in the prompt's checklist fails,
   return the failing line only; do not re-prompt the whole task.
4. Check the task off in `PLATFORM UPDATE TASKS.md`, add a §8 progress row, commit, and move to the
   next prompt in the §1 order.

---

## Appendix C — verified execution order + residual-work map (audited 2026-11-01)

Prompts in §2 are correct as written **except** for the anchors and residual notes below, which were
re-verified line-by-line against the working tree. Trust this appendix over any `:~` guess elsewhere.

### C1. Order (one commit per phase, `npm test` green after each)

| Phase | Work | Prompt | Test suites |
|---|---|---|---|
| A | `js/eatouts-regions.js` verbatim from PLATFORM UPDATE TASKS.md §T22 step 2 | P7 (part) | 60 |
| B | T09a — promo cart bridge on `venue-about.html` (boot hydrate call goes at **:10347**, not :9749) | P1 | 60 |
| C | T09b — branded promo tiles + `.plb-*` lightbox (BATCH 3 is superseded: it assumes non-existent `data-promo-*` attributes) | P1 | 60 |
| D | 12.1 venue bar | P4 | 60 |
| E | T05 `customer-delivery.html` | P2 | 60 → **61** |
| F | T13 `Created_Event.html` | P5 | 61 → **62**, `back-history.js:147` **55 → 56** |
| G | 12.2 → 12.8, one commit each (12.3 before 12.6/12.7/12.8 — see §5 row 588) | P4 | 62 |
| H | T18 `eatouts-suppliers.html` | P3 | 62 |
| I | T21 `designer-services.html` | P6 | 62 |
| J | 12.9 share + save (after F, because it owns the payload T13 reads) | P4 | 62 |
| K | T22 steps 1, 3, 4, 5, 6 (step 2 = phase A) | P7 | 62 → **63**, `back-history.js:147` **56 → 57**, `:153` stays **2** |

Do **not** run A/K out of order: A writes the registry file that K's gating imports.

### C2. Residual-work map — what is already true in the code

| Item | Status | Evidence |
|---|---|---|
| No beige `.fpop-close` circle anywhere in the builder | **already done** | `Select-String .fpop-close` in `eatout_event_builder.html` → 0 hits |
| Plain `X` glyph on every builder popup | **already done** | `.fpop-x` `:545` `background:transparent`; used `:2515 / :3075 / :3108` |
| `.sup-profile-avatar` 150px (G4) | **already done** | `:604` |
| `.pit-thumb` 90px (G4) | **already done** | `:621` |
| `.prompt-thumb` 150px (G4) | **already done** | `:709` |
| T18 publish flow exists client-side | **already done** | `publish` :526, `publishReady()` :1031, gate :1366, `DRAFT_KEY` :308 |
| `.cat-chips` `.ico` span present in T21 | to remove | `:255` markup, `:39` CSS |
| T21 `.mosaic` | to rebuild | `:73-78` is a fixed 2-col grid, not a carousel |
| 12.7 / 12.8 | **expect verify-only commits** | both inherit `.prompt-panel` from 12.3; close glyphs already plain |

If a "fix" in §2 targets something in this table, **report it as already satisfied instead of
editing it** — a rewrite of a compliant rule is a rejected diff.

### C3. Known defects found during the audit (fold into the owning phase)

| # | Defect | Owned by |
|---|---|---|
| D1 | `venue-about.html` calls `EatoutsBridge.bundleOf()` at `:1284` / `:1297` but **never loads `js/eatouts-bridge.js`** — the whole branch is dead | Phase B |
| D2 | `#promoCarousel` / `#promoDots` in `venue-about.html` are dead placeholders (8 empty buttons, no JS fills them) | Phase C |
| D3 | T12.1's `.venue-bar-expand` lives in `eatout_event_builder.html` `:63-66` (CSS) + `:1894` (expanded markup) — **not** in `venue-about.html` | Phase D |

### C4. Test-integrity notes

- `tests/designer-services.js:57` asserts **30** cards while the seed holds **29** services — the page
  renders one extra card today. Going to 24 changes **both** numbers; confirm which card disappears.
- `tests/back-history.js:147` hard-codes the branded-page count. Update it in the **same** commit that
  adds the page, or the suite goes red for an unrelated reason.
- `tests/venue-about-options.js` already boots with `runScripts:'dangerously'` and inlines the page
  scripts at `:36` — extend it for T09; do **not** add a fourth test file.

