# EatOuts — Platform Update Tasks

> **Status:** PLAN (not yet executed)
> **Created:** 2026-10-29
> **Scope:** 22 major platform tasks + 5 global standards
> **Rule:** One task at a time, easiest → hardest, verified before moving on.

---

## 0. How to use this document

1. Take the next task in the **Execution Queue** (§3) that is not `DONE`.
2. Read **only** the files/line ranges listed in that task's brief.
3. Make the **minimal diff** required. No drive-by refactors.
4. Run the verification block for that task (§5).
5. Update this file: tick the acceptance boxes, set status, add a line to the
   **Progress Log** (§8) with date + files + commit hash.
6. Update the companion docs listed in §4.
7. Commit atomically: `[Agent] T<nn> — <short description>`.

**Status legend:** `TODO` · `IN PROGRESS` · `BLOCKED` · `REVIEW` · `DONE`

**Size legend:** `S` ≤ ~1 hour · `M` ~half day · `L` ~1 day · `XL` multi-session

---

## 1. Global standards (apply to EVERY task, and as a dedicated Phase 0 pass)

These are non-negotiable and override any older styling in the codebase. Every
task's acceptance checklist implicitly includes them.

### G1 — No visible scrollbars anywhere
**Exception:** the vertical A–Z selector rail (`.az-rail`) may keep its scroll affordance.

Two page categories need two different fixes:

| Category | Symptom | Fix |
|---|---|---|
| **A. App-shell pages** (`#shell`/`#app-shell` + `.scroll` container) | The *document* scrolls because the shell uses `min-height:100vh` and `html,body` are not locked → a window scrollbar appears (this is the reported `data-page="eatouts-login"` bug) | `html,body{height:100%;overflow:hidden;overscroll-behavior:none}` and shell `height:100dvh` (not `min-height`) |
| **B. Document-scroll pages** (marketing/legal/ops: `get-started`, `pricing`, `partner-terms`, `one-pager`, `404`, `intake`, `eatouts-about`, admin managers) | Document scroll is intended; only the bar must be invisible | Keep scrolling, hide visuals: `::-webkit-scrollbar{width:0;height:0;display:none}` + `*{scrollbar-width:none;-ms-overflow-style:none}` |

Also required on every page:
- every inner scroll container uses `.scroll` (or equivalent) with
  `scrollbar-width:none` **and** `::-webkit-scrollbar{display:none}`;
- `overflow-x:hidden` on the scroll container to kill accidental horizontal bars;
- no element wider than the viewport (`width:100vw`, negative margins, 100%+gap grids).

**Audit result (root `*.html` missing scrollbar hiding, verified 2026-10-29):**
`404.html`, `analytics-manager.html`, `billing-manager.html`, `booking-manager.html`,
`brand-kit-admin.html`, `eatouts-about.html`, `eatouts-gallery.html`,
`feedback-manager.html`, `food-truck-schedule1.html`, `get-started.html`,
`operator-businesses.html`, `operator-dashboard1.html`, `order-manager.html`,
`partner-terms.html`, `pricing.html`, `quote-manager.html`, `reservation-manager.html`,
`room-manager.html`, `seed-demo.html`, `staff-manager.html`.
Re-run the audit script at the end of the pass (§5) — the list must be empty.

**Root-cause example (keep as reference):** `eatouts-login.html:33-37` —
`#app-shell{min-height:100vh}` with no `html,body{overflow:hidden}`.

### G2 — No accordion indicators
Remove every `^`, `v`, `▲`, `▼`, `▾`, `▴`, `+`, `−`, `+/-`, `›`, `▸` glyph used as an
open/close affordance, plus their CSS (`.chev`, `.cat-chev`, `.acc-arrow`,
`rotate(90deg)` transforms).

**Known occurrences (verified):**
- `eatout_event_builder.html:2818` — `<span class="chev">▾</span>`
- `intake.html:416` — `<span class="chev">▾</span>`
- `eatouts-suppliers.html:255-256, 775` — `.cat-chev` `▸` + rotate
- Sweep for `aria-expanded` buttons that render a caret glyph; keep
  `aria-expanded` itself (accessibility), just remove the visual glyph.
- Note: `blog-creator-dashboard.html:453` and `delivery-manager.html:526` already
  document "no chevrons" — use them as the reference pattern.

### G3 — Floating popups (global modal standard)
Every popup / sheet / picker / prompt:
- **floating**, vertically centred, **equal space on both sides**
  (`inset:auto; left:50%; top:50%; transform:translate(-50%,-50%); width:min(92vw,420px); max-height:80dvh`),
- never attached to top or bottom (no `align-items:flex-end`, no
  `border-radius:20px 20px 0 0`, no `bottom:0` sheets),
- **tap anywhere outside closes** (scrim click + `Escape`),
- **no `class="fpop-close"` element**: the beige circular close button is gone.
  A popup may keep a **plain `X` glyph** (dark grey text, transparent
  background, no circle) — use `class="fpop-x"`, never `fpop-close`.
  *(Resolved 2026-10-29 — D1.)*
- inner content scrolls, not the page; scrollbar hidden (G1).

**Known work:** `eatout_event_builder.html` has 7 `.fpop-close` buttons
(lines 1978, 2000, 2030, 2283, 2518, 3079, 3112). Each must be replaced by a
plain `fpop-x` (X only, no beige circle) or removed where outside-tap is enough.
All `align-items:flex-end` sheets must be converted (audit list produced in
Phase 0).

### G4 — Thumbnails are 90px
Standard thumbnail = **90×90px, square, rounded corners, `object-fit:cover`**.
Specified exceptions: **150px** where a task explicitly says so
(`sup-profile-avatar`, `prompt-thumb`, recipient hero thumb), and brand marks.

Sweep targets (current sizes vary): `.mthumb` (54), `.co-thumb` (52),
`.pit-thumb` (52), `.designer-top` (~56), `.sup-profile-avatar` (96),
`.rthumb`, `.restcard` logo, `.promo-thumb`, gallery/list thumbs.

Rule: in a **list/card row** → 90px; in a **prompt/hero/editor** → 150px if the
task says so, otherwise 90px.

### G5 — Documentation baseline
Before Phase 1: create/refresh the ledger entries and confirm the doc pipeline
works (`npm run catalog`, `npm run inventory`, `npm test`). See §4.

---

## 2. Global document-update protocol

Every completed task updates **all** of the following that apply:

| Doc | How | Owner |
|---|---|---|
| `PLATFORM UPDATE TASKS.md` | tick boxes, status, progress log | agent |
| `SESSION_NOTES.md` | append "what changed / what's next" (gitignored, local) | agent |
| `docs/AGENT_CHANGE_LOG.md` | append task, files, status, timestamps, commit hash | agent |
| `HTML_CATALOG.md` | edit `scripts/html_catalog.meta.json` → `npm run catalog` → `npm test` (**never hand-edit**) | agent |
| `PAGE_INVENTORY.md` | hand-edit rows/line refs; validate with `npm run inventory` | agent |
| `HTML_PAGES.md` | update the capability narrative for changed pages | agent |
| `HTML_ASSESSMENT.md` | update per-page status/gaps | agent |
| `FEATURES.md` | update feature list when behaviour changes | agent |
| `OUTSTANDING_WORK.md` | remove completed items, add newly discovered ones | agent |
| `copy-static.mjs` | add any **new** root HTML to the `FILES` array (else it never deploys) | agent |
| `scripts/html_catalog.meta.json` | new page entry + dated changelog entry | agent |

**New pages that will need all of the above:**
`Orders-List.html` (T06), `Created_Event.html` (T13), `EatOuts-Region.html` (T22).

**New-page checklist** (enforced by `npm run inventory` + `tests/html-catalog.js`):
`<title>`, `<!-- PAGE: <title> -->` banner, `<body data-page="<slug>">`,
entry in `scripts/html_catalog.meta.json`, entry in `copy-static.mjs` FILES,
row in `PAGE_INVENTORY.md`, no visible scrollbar (G1), standard header (G3/T08),
bottom nav where the page is part of the app shell.

---

## 3. Execution queue (easiest → hardest)

> Ordered by **effort/risk**, with two hard dependency pairs kept in order:
> **T04 → T06** (Order Summary Card → Orders list) and **T12 → T13**
> (event builder → view-only event page).

### Phase 0 — Foundation (do first; prevents rework)
| # | ID | Task | Size | Files |
|---|---|---|---|---|
| 0.1 | G1 | Kill visible scrollbars (all pages) — ✅ **DONE 2026-10-29** | M | all root `*.html`, `index.html`, `assets/eatouts-manager.css` |
| 0.2 | G2 | Remove accordion indicators — ✅ **DONE 2026-10-30** | S | `eatout_event_builder.html`, `intake.html`, `eatouts-suppliers.html`, `get-started.html` |
| 0.3 | G3 | Floating-popup standard (plain `X`, no beige circle) | M | `index.html`, `eatout_event_builder.html`, `customer-delivery.html`, all sheet pages |
| 0.4 | G4 | 90px thumbnail standard | M | `index.html`, `venue-about.html`, `eatouts-suppliers.html`, `designer-services.html`, `reserve-*` |
| 0.5 | G5 | Doc/ledger baseline + verification pipeline green | S | docs + `scripts/` |

### Phase 1 — Quick wins
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 1 | T01 | 1 | Promo text → 16px | S |
| 2 | T10 | 10 | `reserve-cats` white gap above `.phead` | S |
| 3 | T19 | 19 | `about-legal` text → 16px | S |
| 4 | T02 | 2 | `bev-toggle` white highlighter + 15% inactive | S |
| 5 | T14 | 14 | `eatouts-business-signup` appbar → standard header | S |
| 6 | T20 | 20 | `operator-businesses` topbar → standard header | S |

### Phase 2 — Mechanical / multi-file
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 7 | T11 | 11 | `reserve-events/providers/groups` phead + 90px `rthumb` | S/M |
| 8 | T17 | 17 | Blog cleanup (10 removals + move search box) | M |
| 9 | T15 | 15 | 7 onboarding pages → standard header (drop `draft-pill`) | M |
| 10 | T16 | 16 | `about-main` WhatsApp Channel per region | M |

### Phase 3 — Interaction
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 11 | T08 | 8 | Activate `brand-mark` + Back History popup (all headers) | M |
| 12 | T03 | 3 | `ritem` focus, scroll lock, 25% dim others | M |
| 13 | T09 | 9 | `venue-about` promo thumb → gallery + "Add to Order" | M |
| 14 | T07 | 7 | Standardised Filter Bar on 4 screens | M |

### Phase 4 — Structural redesigns
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 15 | T04 | 4 | `venue-checkout` redesign | L |
| 16 | T06 | 6 | Orders badge + `Orders-List.html` (needs T04) | L |
| 17 | T05 | 5 | `customer-delivery` redesign | L |
| 18 | T18 | 18 | `eatouts-suppliers` rework (steps 1–7) | L |

### Phase 5 — Large builds
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 19 | T12 | 12 | `eatout_event_builder` overhaul (9 sub-areas) | XL |
| 20 | T13 | 13 | `Created_Event.html` view-only page (needs T12) | L |
| 21 | T21 | 21 | `designer-services` catalogue + galleries + requests | XL |
| 22 | T22 | 22 | Multi-region architecture + `EatOuts-Region.html` | XL |

---

## 4. Task briefs

### Phase 0 — Foundation

#### G1 — No visible scrollbars
**Files:** every root `*.html`; `index.html` first (it is the SPA shell).
**Steps**
1. Classify each page A (app shell) vs B (document scroll) — the audit list in §G1 is the starting point.
2. Category A: add `html,body{height:100%;overflow:hidden;overscroll-behavior:none}`; change shell to `height:100dvh`; keep `.scroll` as the only scroller.
3. Category B: add the scrollbar-hiding pair (`::-webkit-scrollbar` + `scrollbar-width`), keep document scroll.
4. Add `overflow-x:hidden` to every scroll container; remove `100vw` widths and negative-margin overflow.
5. Re-run the audit; the "missing scrollbar hiding" list must be empty.
**Done when**
- [ ] No window scrollbar on any page at 360/390/430px width.
- [ ] `eatouts-login` shows no scrollbar.
- [ ] A–Z rail (`.az-rail`) still scrolls and is the only visible affordance.
- [ ] `npm test` green.

#### G2 — No accordion indicators
**Files:** `eatout_event_builder.html`, `intake.html`, `eatouts-suppliers.html`.
**Steps:** remove the glyph spans + their CSS; keep `aria-expanded`; verify the open/close still works by tap.
**Done when** no `▾ ▸ ▲ ▼ ^ +/−` glyph renders on any accordion header; grep for the glyphs returns only comments.

#### G3 — Floating popups
**Files:** `index.html` (`.fpop`, `.fpop-scrim`), `eatout_event_builder.html`, `customer-delivery.html`, all pages using bottom sheets.
**Steps**
1. Create one shared popup recipe (copy-paste per page, no new dependency):
   centred `min(92vw,420px)`, `max-height:80dvh`, equal insets, inner `.fpop-body` scrolls.
2. Scrim click + `Escape` close; replace all `.fpop-close` buttons with a plain
   `X` glyph (`.fpop-x`, no beige circle) — see D1 resolution.
3. Convert `align-items:flex-end` sheets (audit with the PowerShell scan in §5).
4. Ensure focus moves into the popup and returns to the trigger.
**Done when** every popup is centred with equal side gaps, closes on outside tap, and no `.fpop-close` exists in the repo (a plain `X` glyph is allowed).

#### G4 — 90px thumbnails
**Steps:** normalise the classes listed in §G4; keep 150px only where specified; add `aspect-ratio:1/1;object-fit:cover;border-radius:10-14px`.
**Done when** every list/card thumbnail computes to 90×90.

#### G5 — Doc baseline
**Steps:** verify `npm run catalog`, `npm run inventory`, `npm test` all pass on a clean tree; ensure `docs/AGENT_CHANGE_LOG.md` exists; add the "how to update" matrix (§2) to `SESSION_NOTES.md`.
**Done when** all three commands exit 0 and the ledger exists.

---

### Phase 1 — Quick wins

#### T01 — Promo text 16px (user task 1) · S
**Files:** `index.html` (CSS only).
**Current:** promo cards are `.pcard`/`.ecard` with `.pbody`; body copy sits at 11–13.5px (`index.html:171-200`, `.phead-btn h3` 17px, `.pprice`, `.phl`, meta line 11px).
**Steps**
1. Add a scoped block after the `.ecard` rules:
   `#shell.promos-tab.promo-focus .pcard .pbody, #shell.promos-tab.promo-focus .ecard .pbody, #shell.promos-tab.promo-focus .promo-venue-card{font-size:16px}`
   plus explicit 16px on `.pbody p`, `.pbody li`, `.phl li`, `.pprice`, the meta line, and the CTA.
2. Do **not** shrink headings; let them stay ≥17px.
**Done when**
- [ ] In the focused promo view every body line computes to 16px.
- [ ] No layout overflow at 360px; text wraps, no horizontal scroll (G1).
- [ ] Unfocused feed unchanged.

#### T10 — `reserve-cats` gap above `.phead` (user task 10) · S
**Files:** `index.html` (`renderReserveCats`, ~8070; `.crumb`/`.phead` CSS ~553-562).
**Steps:** remove the margin/padding that creates the white strip between `.crumb` and `.phead` on `data-page="reserve-cats"` (scope the fix to that renderer, not globally).
**Done when** no white gap below the crumb; other pages' `.phead` unchanged.

#### T19 — `about-legal` text 16px (user task 19) · S
**Files:** `index.html` CSS `:469-470`, renderer `:8646-8665`.
**Steps:** `.legal-sec{font-size:16px}` and `.legal-para{font-size:16px;line-height:1.6}`; check headings scale proportionally.
**Done when** every legal paragraph and section heading computes to ≥16px; long docs still scroll inside `.scroll` with no visible bar.

#### T02 — `bev-toggle` white highlighter + 15% inactive (user task 2) · S
**Files:** `index.html` CSS `:290-299` (`renderRestaurantsPager` ~5244).
**Steps**
1. Remove the white "thumb" highlight on `.bev-toggle-btn.on` — either delete `.bev-toggle-thumb` rendering or set it transparent when the `food` variant is active. The `on` state must be communicated by text weight/colour only.
2. Inactive buttons → `opacity:.15`.
3. Keep the active one at full opacity and readable.
**Done when** no white pill/highlighter behind the active button; inactive pages are 15% opacity; `aria-selected` still correct.

#### T14 — `eatouts-business-signup` header (user task 14) · S
**Files:** `eatouts-business-signup.html:557-562` (`.appbar` with `.dot` "E").
**Steps:** replace `.appbar` block with the standard header markup:
```html
<header id="hdr" data-act="closePickers">
  <button class="brand-mark" type="button" aria-label="EatOuts home"><img src="assets/logo/EatOuts_Logo.png" alt="EatOuts"></button>
  <div class="hdr-right"><span class="hdr-chip" style="display: none;">Offline</span></div>
</header>
```
Keep the page's existing CSS variables; add the header rules from `venue-about.html` (already standard).
**Done when** header matches the standard block exactly, logo loads, no `hdr-chip` visible, page content starts below it without gap.

#### T20 — `operator-businesses` header (user task 20) · S
**Files:** `operator-businesses.html:69-74`.
**Steps:** replace `.topbar` + `.brand-info`/`brand-name` with the standard header. Move "My businesses" into the page body (`page-head`) — it already has a `.page-title`, so delete the duplicate.
**Done when** standard header present, no duplicated title, list still loads.

---

### Phase 2 — Mechanical / multi-file

#### T11 — Reserve pages (user task 11) · S/M
**Files:** `index.html` (`renderReserveEvents`, `renderReserveProviders`, `renderReserveGroups`, ~8070-8300; `.phead` ~553-562; `.rthumb` CSS).
**Steps**
1. `reserve-events`, `reserve-providers`, `reserve-groups`: `.phead` background `rgba(0,0,0,.02)`; remove the gap between `.crumb` and `.phead` (same technique as T10, scoped).
2. `reserve-providers`: every `.rrow .rthumb` → 90×90, square, rounded, `object-fit:cover` (G4).
**Done when** all three pheads are 2% grey with no gap; provider thumbs compute to 90px; no other page affected.

#### T17 — Blog cleanup (user task 17) · M
**Files:** `eatouts-blog.html`.
**Steps (exact removals)**
1. `.hdr-chip` (markup + CSS `:57-59`).
2. All `::before` pseudo-content (`.hdr-back::before :61`, `.tag-pill.hash::before :121`, `.timeline::before :125`, and any others).
3. `.tl-card-foot`, `.tl-card-tags`, `.post-tags` (markup + CSS).
4. `[data-act="copyLink"]` button.
5. `.hdr-back#hdrBack`.
6. `.blk-heading` blocks inside `.post-body`.
7. `.page#hdrPage`.
8. `.tag-strip`.
9. Move `.search-box` to the bottom of the page, directly above the `bottom` nav; keep it sticky-free.
**Done when** grep for each removed class returns zero in the file; page still renders, search still filters; no `::before` content in CSS; no visible scrollbar.

#### T15 — Onboarding headers (user task 15) · M
**Files:** `restaurant-onboarding.html`, `caterer-onboarding.html`, `bakery-onboarding.html`,
`bottle-store-onboarding.html`, `mobile-kitchen-onboarding.html`,
`supplier-onboarding.html`, `eatouts-login.html`.
**Steps**
1. Replace each `<header class="topbar"><div class="topbar-row">…</div></header>` with the standard `<header id="hdr" …>` block.
2. Delete `.draft-pill` markup (keep the CSS only if still used elsewhere; otherwise remove).
3. Because these topbars are dark, re-map the header colours to the light standard and re-check contrast for the page's step indicator.
4. `eatouts-login`: apply the G1 fix here specifically (document scrollbar bug).
**Done when** all 7 pages use the identical header, no `draft-pill`, no scrollbar on login, forms still submit.

#### T16 — About → WhatsApp Channel (user task 16) · M
**Files:** `index.html` (`EATOUTS_WHATSAPP_CHANNEL_URL=''` at `:8521`, setrow at `:8597`, `renderAbout` `:8563`).
**Current:** the URL constant is empty, so the row is a dead link.
**Steps**
1. Replace the single constant with a region map:
   `const WHATSAPP_CHANNELS={BW:'https://whatsapp.com/channel/<id>', ZA:'', ZW:'', MW:'', KE:''}` keyed off the active region (see T22).
2. Row opens the channel for the active region in a new tab; if the region has no channel yet, show the standard floating "coming soon" popup.
3. Needs the Botswana channel URL/number from you (D7).
**Done when** tapping the row opens the correct channel for Botswana; unknown region shows the popup.

---

### Phase 3 — Interaction

#### T08 — `brand-mark` + Back History (user task 8) · M
**Files:** every page with `id="hdr"`; new shared component in `index.html` + a small `js/eatouts-back-history.js` (or inline per page — prefer one JS file added to `copy-static.mjs`).
**Steps**
1. Standardise every header to the exact block (see T14). Sweep: `grep -l '<header id="hdr"'` must equal the set of app pages; convert `topbar`, `appbar`, `topbar-row` variants (T14/T15/T20 do the first ones).
2. `brand-mark` becomes `<button type="button">` on every page and calls `openBackHistory()`.
3. Back History = floating popup (G3) listing the **last 5 pages/screens** the user visited:
   - store in `sessionStorage` (`eatouts.history.v1`) on every navigation (SPA `render()` + standalone `pagehide`);
   - each row: page title + relative time; tap → navigate;
   - empty state: "No recent pages yet."
4. On the SPA, history entries are `data-page` slugs; on standalone pages, `location.pathname`.
**Done when**
- [ ] Every app page has the identical header.
- [ ] Tapping the logo opens the centred Back History popup with ≤5 entries.
- [ ] Tapping an entry navigates there; outside tap closes.
- [ ] No `.fpop-close` inside it.

#### T03 — `ritem` focus + scroll lock + dim (user task 3) · M
**Files:** `index.html` — `syncRestAccordions` `:4476-4486`, `renderRestaurantRow` `:5630-5640`, `toggleRestaurant` handler `:9146`, `state.restaurantOpen` `:3621`, CSS `.ritem` ~`:640-658`.
**Steps**
1. On open: `scrollIntoView({block:'center',behavior:'smooth'})` on the `.ritem.open`.
2. Lock scrolling while open: add `body.ritem-locked .scroll{overflow:hidden}` (and `touch-action:none`), remove on close/navigate.
3. Dim all sibling `.ritem` to `opacity:.25` via a container class `.list.has-open .ritem:not(.open){opacity:.25;pointer-events:none}`; restore on close.
4. Cleanup on tab change / page navigation (`state.restaurantOpen=null` paths at `:5617`, `:8802`, `:8947`).
**Done when** tapping a row centres it, page cannot scroll until closed, others are 25% and non-tappable; closing restores everything; no stuck lock after navigating away.

#### T09 — Promo thumb → Add to Order (user task 9) · M
**Files:** `venue-about.html` (`.promo-thumb` CSS `:352-363`, markup `:663-673`, carousel JS), `index.html` cart API (`state.cart`, `cartKeys`, `cartTotal`).
**Steps**
1. Tapping `.promo-thumb` opens a full-screen lightbox (feint black backdrop, image centred, dots for the gallery, swipe left/right).
2. A centred "Add to Order" button sits horizontally beneath the image.
3. Tap outside the image closes.
4. "Add to Order" writes the promo as a cart line (promo id, title, price) and returns to the venue/checkout with a toast.
**Done when** the gallery opens with dots + swipe, outside-tap closes, Add to Order adds exactly one line and the cart badge/total update.

#### T07 — Standardised Filter Bar (user task 7) · M
**Files:** `index.html` — `#cbar` `:855`, `renderRestaurants` `:5195`, `renderRestaurantsPager` `:5244`, `renderCatering`/`renderBakeries`/`renderBeverages`, `#cbar` builder `:6289-6328`, `restFilterOpen` toggle `:8782`, `.rest-filter-controls`/`.cbtn` CSS, `.town-pop`/`.town-scroll`/`.az-rail`/`.loc-count` CSS ~`:608-635`.
**Steps**
1. Build one reusable `renderFilterBar({searchId, placeholder, townAct, areaAct, typeLabel})` producing `id="cbar" class="rest-filter-controls"` with the two rows from the brief.
2. Default hidden; tapping the already-active `nav-btn[data-tab="restaurants"]` toggles it (existing `restFilterOpen` logic), tapping again hides.
3. Wire real search per screen: `restaurants-pager` (restaurants), `catering`, `bakeries`, `beverages` — filter the rendered list on `input`, debounce ~120ms, keep empty-state.
4. Right button label: `Cuisine` (restaurants-pager), `Cuisine` (catering), `Type` (bakeries), `Type` (beverages — existing).
5. `.cbtn`, `.cbtn.align-center`, `.cbtn.align-right` → `font-size:16px;text-align:center`.
6. `.loc-all .loc-count` removed everywhere.
7. `.town-scroll` gets even top/bottom padding inside `.fpop.town-pop.rest-town-pop` (fix cropped last row).
8. `.az-rail` background `rgba(0,0,0,.03)`.
**Done when** all 4 screens show the same bar, search actually filters, labels correct, 16px centred buttons, no `loc-count`, no cropped town list, rail tinted, no visible scrollbars.

---

### Phase 4 — Structural redesigns

#### T04 — `venue-checkout` redesign (user task 4) · L
**Files:** `index.html` — `renderCheckout` `:7776-7970`, `.crumb`/`.phead` CSS `:553-562`, `.co-*` CSS `:333-353`, `renderCheckoutSplit` `:7971`.
**Steps (map 1:1 to the brief)**
1. Replace `.crumb` with the single text "Order Summary".
2. Replace `.phead` with an **Order Summary Card**: 90px square rounded logo (restaurant/catering/bakery/bottle store) on the left; right = line 1 place name, line 2 "# items for P#.##".
3. Remove `.co-edit` from `.co-main`.
4. `.pad` → 3% grey background.
5. `.co-step` on its own row under `.co-main`.
6. `openSplit` button: account-only. Browser → visually inactive; tap → floating popup "Create a free account to split the bill" with a Sign Up CTA.
7. Live `.tv` totals: recompute on qty add/remove, extras, delivery details (single `recalc()` called from every mutator).
8. New row under the WhatsApp button: **Save Order** (left) + **Delete Summary** (right).
   - Save Order: account-only, inactive for browser, same sign-up popup.
   - Delete Summary: confirm popup ("Delete this summary? This cannot be undone.") → clears cart/summary.
9. `goDelivery` interactive; once delivery details exist show a compact summary line (type + cost) above/below the button.
10. Same row as `btn wa full`: **WhatsApp Review** → screen/page preview of exactly what will be sent.
11. `btn wa full` tap → **WhatsApp Recipient Options** floating popup, two stacked buttons:
    - "Send to <Place name>" → uses the venue's provided WhatsApp number;
    - "Send to Contact" → device contacts; account-only, browser → sign-up popup.
**Done when** every bullet above is visibly true, totals are live, popups are floating, and the sent message matches the review screen.

#### T06 — Orders badge + `Orders-List.html` (user task 6) · L
**Depends on:** T04 (Order Summary Card), T08 (uniform header).
**Files:** every `id="hdr"` page; new `Orders-List.html`; `js/eatouts-customer.js` (summaries store `:321-400`); `copy-static.mjs`; catalog/inventory docs.
**Steps**
1. Remove every `.hdr-chip` (markup + CSS) from `id="hdr"` blocks.
2. Header right slot becomes an **orders counter**: hidden for browsers; light-grey number for logged-in users; tap → `Orders-List.html`.
3. Counter source = `EO.summaries.length` (existing store in `js/eatouts-customer.js`); update on `storage` + on page show.
4. Create `Orders-List.html`:
   - standard header (T08) + bottom nav + `data-page="orders-list"` + `<!-- PAGE: Orders List -->`;
   - body = list of **Order Summary Cards** grouped into **Order Groups**;
   - card: 90px square rounded thumb on the **right**, left = line 1 title, line 2 "# from # places";
   - tap card → opens the existing summary/checkout (`eatouts-checkout-summary.html?id=…`);
   - empty state for no summaries.
5. Register in `copy-static.mjs`, `scripts/html_catalog.meta.json`, `PAGE_INVENTORY.md`, `HTML_PAGES.md`.
**Done when** browsers see nothing, logged-in users see the count, the count matches the store, the list groups and opens summaries, docs/tests green.
**Open:** the brief's last sentence ("When user opens …") is truncated — see D5.

#### T05 — `customer-delivery` redesign (user task 5) · L
**Files:** `customer-delivery.html` — CSS `:25-26, :42-60, :68-82`, markup `:149-151`, renderers `renderMethod :549`, `renderDestination :616`, `renderRecipient :681`, `renderPayment :690`, `renderReview :~751`, `renderWhatsApp :827`, `barPrimary` ~`:116`.
**Steps**
1. Remove `.hdr-chip` (`:151`).
2. `.osum`: delete `.osum-back`; put `.osum-tot` + `.osum-items` on one line → "P0.00 for # item(s)".
3. Every `.acc` sits on a 3% grey panel (the container, not the accordion).
4. `.acc-title` background 5% grey when open.
5. Gate: delivery method must be chosen first; until then all lower accordions inactive; tapping one shows a floating popup "Choose a delivery method first".
6. `dest` accordion:
   - `data-drp-open="area"` and `"propType"` open floating `.drp-list.open` popups (not inline);
   - `.hint` centred, text exactly: "Help the delivery driver find you. Gate colour, road name, nearby landmark etc.";
   - GPS button: light grey, dark grey text, centred; opens Google Maps location picker and attaches current location.
7. `recip` accordion:
   - the recipient toggle becomes a real toggle (me / someone else);
   - recipient history → **Recipient Cards** (90px square thumb left; line 1 name, line 2 "# orders received");
   - tapping the thumb opens the enlarged image with 3 actions beneath: Add image (device), Edit details (first name, surname, mobile), Delete;
   - new recipient form: photo (mandatory), first name, surname, gender, mobile (code + number);
   - 150px square hero thumb above `.row2`;
   - `.acc-val` shows the selected recipient's name.
8. `pay` accordion:
   - `pickPay` → when "Choose a bank" is tapped, floating `.drp-list.open` popup;
   - remove the `.hint` and the "Payment preference recorded…" copy;
   - `.acc-val` shows the chosen bank.
9. `review` accordion → full screen/page listing everything prepared, with Edit and Delete buttons at the bottom (no accordion).
10. Remove the "WhatsApp Request" `.acc-lbl`.
11. `barPrimary` label: "Add P#.## to P#.## for # items" → tapping returns to the order summary.
**Done when** each bullet is true, gating works, popups float, and the WhatsApp message includes recipient + delivery + payment + bank.

#### T18 — `eatouts-suppliers` rework (user task 18) · L
**Files:** `eatouts-suppliers.html` — header `:269-275`, step scaffold `:700-720`, `renderIdentityStep` `:~730-770`, `renderServicesStep` `:~770-800`, `renderPricingStep` `:~810-874`, `renderGalleryStep` `:876-…`, portfolio, contact `:~950-1010`, review, export `:~1077`.
**Steps**
1. Remove `.title#hdrTitle` (`:272`); standard header (T08).
2. "Activate" the page — see D6 (ambiguous).
3. Step 1 (`i1`):
   - 150px centred square rounded **profile image** picker + separate **business logo** picker (device upload);
   - remove `owner.headshot` URL field (`:746`);
   - age → mandatory 3-column Year / Month / Day picker, day list respects month + leap years; each column opens a floating scroll-list popup;
   - account-only listing; Step 1 auto-fills the account holder's personal details.
4. Step 2 (`i2`):
   - `toggleService` → floating `.sheet` (G3);
   - per-service image gallery (add/remove/swipe, tap to enlarge);
   - remove the single `i3`; generate **one pricing step per selected service** (unique `data-step` keys, e.g. `pricing:<cat>:<type>`), each with its own pricing + discount scheme;
   - remove `.cat-chev ▸` (G2).
5. Step 4 (`i4`): remove `addImage` URL button; device-only gallery with add/remove/swipe.
6. Remove Step 5 (`i5`, portfolio) entirely — `i4` covers it.
7. Step 6 (`i6`):
   - `location.town` opens a floating town picker sourced from `botswana_locations.js`;
   - remove "Neighbourhood / area";
   - all `.chip` equal width;
   - remove `availability.peakSeason` (`:443`).
8. Step 7 (`i7`): remove `.foot`; remove the entire export/JSON feature + all code paths and any docs mentioning it.
9. Renumber steps after removals (1–5) while keeping `data-step` keys stable.
**Done when** no dead steps, no export code anywhere (`grep -ri "export profile\|profile JSON"` → 0), pricing repeats per service, galleries work, age picker is mandatory and correct, town picker uses Botswana data.

---

### Phase 5 — Large builds

#### T12 — `eatout_event_builder` overhaul (user task 12) · XL
**Files:** `eatout_event_builder.html` (single file, ~4.2k lines), `js/eatouts-events*` if present.
**Sub-tasks (do in this order, verify each)**

**12.1 Venue bar** — `.venue-bar-expand.open` (`:63-66`)
- all text 16px;
- remove: "Venue Provider", "Name, from P0.00", "Spaces", "Selected";
- `.title-edit-panel` → floating popup (G3).

**12.2 Schedule** — `[data-sec="schedule"]`
- `setScheduleMode` chips (`one-day`, `multi-day`) equal width + centred;
- `.schedule-day` becomes a collapsible accordion;
- date fields → 3-column Year / Month / Day buttons on one row, centred, each opening a floating scroll-list popup; day count correct per month/leap year;
- time fields → 2-column Hour / Minute buttons on one row, each opening a floating scroll-list popup.

**12.3 Audience** — `[data-sec="audience"]`
- thin light separator above the field hint;
- `addAudience` → floating `.prompt-panel`;
- thin light separator above "Event Rules";
- `addRule` → floating `.prompt-panel`;
- `.rm` (removeAudience / removeRule) → light grey "X", no white circle.

**12.4 Suppliers** — `[data-sec="suppliers"]`
- `openSupplierTypeMenu` → floating `.fpop-scrim` (not bottom sheet);
- `.fpop-search` pinned to the bottom of that popup, `.fpop-body` above it;
- remove the beige circle behind `.fpop-close` → replace with a plain `X` glyph (`.fpop-x`, no circle);
- `.sup-profile-avatar` → 150px; tap → gallery with swipe + dots;
- `.sup-profile-loc` → 16px;
- `.sup-profile-scroll` → floating popup;
- `.sup-profile-name` → "Service Provider Info" floating popup: 90px thumb left, right = name + services, description below;
- `.pit-thumb` → 90px; tap → full-image gallery with feint black backdrop, dots above the image, white caption below; outside tap closes;
- `.qty-stepper.sm`: centre `−`/`+`; move stepper to a row **below** `.pit-info`, right-aligned, with the added cost left-aligned under `.pit-info`;
- `.pit-info`: 90px thumb left, `.pit-title` + `.pit-price` right.

**12.5 Details** — `[data-sec="details"]`
- centre `.chip-row`; `setEventMode` chips equal width; centre `.field-hint`;
- Dress code → **Dress-Code-Cards**: 90px square thumb, tap = gallery (add/remove/swipe), add/edit/remove cards.

**12.6 Guests** — `[data-sec="guests"]`
- `.prompt-panel` floating;
- `.prompt-thumb` → 150px, remove "Add photo" text;
- remove beige `fpop-close` circle, keep a plain `X` glyph (D1);
- `.qty-stepper` `−`/`+` centred.

**12.7 RSVP** — `[data-sec="rsvp"]`: `.prompt-panel` floating; remove beige close circle, keep a plain `X` glyph.

**12.8 Links** — `[data-sec="links"]`: `.prompt-panel` floating; remove beige close circle, keep a plain `X` glyph.

**12.9 Share + save**
- `shareWhatsApp` → floating popup, 2 options: "Share with Venue Provider" / "Share with WhatsApp Contacts" (account-only; browser → sign-up popup);
- `saveEvent` account-only;
- leaving an in-progress event (account user) → "Save draft?" floating prompt; draft persists (`STATE.draftKey="eatouts.event.draft.v2"`, `:1293`, save `:1321`, load `:1331`); returning restores everything; `nav-btn[data-tab="reserve"]` offers "Create New Event";
- on save: choose the event-card thumbnail (event images or device) and rename the title; card shows created + edited dates.

**Done when** every sub-item is verifiable in the UI; no glyph indicators; all popups floating; no `.fpop-close` (plain `X` only); draft survives navigation; browser gates work.

#### T13 — `Created_Event.html` (user task 13) · L
**Depends on:** T12.
**Files:** new `Created_Event.html`; reuse `.preview-page` markup/JS from `eatout_event_builder.html`; `copy-static.mjs`; docs.
**Steps**
1. New page `data-page="created-event"`, `<!-- PAGE: Created Event -->`, standard header + bottom nav.
2. Load a saved event by id (`?id=` → draft/published store) and render the preview markup **read-only** (no edit affordances).
3. Share button → WhatsApp share on the user's device (Web Share API fallback to `wa.me` with the page URL).
4. Empty/not-found state.
**Done when** a saved event renders exactly like the builder preview, nothing is editable, share opens WhatsApp with the link, docs/tests green.

#### T21 — `designer-services` catalogue + galleries (user task 21) · XL
**Files:** `designer-services.html` (hero `:240-257`, catalogue `:259-…`, designer list, step 2, step 3), `js/eatouts-services-seed.js` (29 services, `:14-272`), `js/eatouts-brand-kit.js`, `assets/images/services/*`.
**Steps**
1. Header → standard (T08); add the bottom nav exactly as in the brief; remove `.badges`.
2. Copy change: "…from **local** designers…".
3. `.cat-chips` centred; remove every `.ico` span (`:255`).
4. `.card-img` shows the full image (no fixed 118px crop) — use `aspect-ratio` + `object-fit:cover`; `.service-sub` → 16px; remove `.plus`.
5. `pickService` account-only (browser → sign-up popup).
6. `.footnote` centred, 16px.
7. Step 2:
   - heading "Pick a style" → **"Available Designers"**;
   - body copy 16px;
   - `.designer-top` / `.av-ini` → 90px square rounded; tap enlarges;
   - `.min` → 16px;
   - remove `.pill.ok`;
   - add a toggle under the hero: **Available Designers / Previous Designers** (previous = worked with before; unavailable ones appear inactive with "available from <date>"; allow "notify me / there is work waiting");
   - `.designer-card`: `<h4>` + `<p>` centred between the avatar and `.mosaic`;
   - `.mosaic` = 3-image snap carousel; tap a cell → lightbox with dots + swipe; tap dots → 3-across Pinterest-style grid on feint black; tap a grid image → enlarge + swipe.
8. "Send my request" → sends to the designer's WhatsApp **and** records the request on the user's profile (add a "My Design Requests" list to `eatouts-profile.html`).
9. Step 3: account-only; choose from the user's **listed businesses** (prefill) or **For Unlisted Business** (empty form).
10. Catalogue rework — the **24 offers** in §6, new prices. Update `js/eatouts-services-seed.js`, any admin/brand-kit references, and the docs. Missing images → add placeholders to `assets/images/services/` and list them as "images to get".
**Done when** catalogue matches §6, prices correct, galleries behave as specified, gating works, requests persist, docs/tests green.

#### T22 — Multi-region architecture (user task 22) · XL
**Files:** `SYNC REGION TASK/*` (must end up **empty**), new `js/eatouts-regions.js`, new `EatOuts-Region.html`, `index.html` (`renderAbout` settings rows `:8590-8600`), `copy-static.mjs`, `botswana_locations.js`, docs.
**Steps**
1. **Move the files** (folder must be empty afterwards):
   - `countries-data.js`, `territories.js`, `territory-registry.js`, `countries_mobile_networks.js` → `js/`
   - `Country-Flag-Icons/*` → `assets/flags/` (or `assets/icons/flags/`)
   - `eatouts-region-selector.html` → reskin + rename → `EatOuts-Region.html`
   - delete the now-empty `SYNC REGION TASK/` folder.
2. **Region registry** `js/eatouts-regions.js`:
   ```js
   window.EATOUTS_REGIONS = [
     { code:'BW', name:'Botswana', currency:'BWP', active:true,  locale:'en-BW',
       locations:'botswana_locations.js', whatsappChannel:'' },
     { code:'ZA', name:'South Africa', currency:'ZAR', active:false },
     { code:'ZW', name:'Zimbabwe',   currency:'USD', active:false },
     { code:'MW', name:'Malawi',     currency:'MWK', active:false },
     { code:'KE', name:'Kenya',      currency:'KES', active:false }
   ];
   ```
   plus `getActiveRegion()`, `setActiveRegion()`, `isActive(code)`, persisted in `localStorage` (`eatouts.region.v1`).
3. **Data gating:** every place/venue/menu/directory load filters by `region` (add `region:'BW'` where missing, default `BW`); location files resolved through the registry; currency formatting driven by the region.
4. **Settings row:** under Settings, **above** "About EatOuts", add a `.setrow` labelled with the active region ("Botswana"), opening `EatOuts-Region.html`.
5. **`EatOuts-Region.html`:** reskinned TrackHype selector (EatOuts colours/header/nav, flags from `assets/flags/`, search), Botswana selected; tapping any other region → floating popup **"This region is coming soon."**
6. Register the new page in `copy-static.mjs`, catalog meta, `PAGE_INVENTORY.md`, `HTML_PAGES.md`; add `js/eatouts-regions.js` + the moved JS to `copy-static.mjs` (js/ folder is copied wholesale — verify).
**Done when** `SYNC REGION TASK/` is empty/removed, the region row appears above About EatOuts, the selector page works, non-BW regions show the coming-soon popup, and all data still loads for Botswana.

---

## 5. Verification

Run after **every** task:

```powershell
npm run inventory
npm run catalog
npm test
```

Run before closing a Phase:

```powershell
npm run build
```

Manual checks per task: 360px, 390px, 430px widths; no window scrollbar;
no accordion glyphs; every popup floats and closes on outside tap;
no `.fpop-close` in the repo; thumbnails 90px (or the specified 150px).

**Audit helpers (read-only, PowerShell):**

```powershell
# pages missing scrollbar hiding
Get-ChildItem -Filter *.html -File |
  Where-Object { -not ((Get-Content -Raw $_ ) -match 'scrollbar-width:\s*none') } |
  Select-Object -ExpandProperty Name

# bottom-attached sheets
Get-ChildItem -Filter *.html -File |
  Select-String -Pattern 'align-items:\s*flex-end' |
  Select-Object Filename, LineNumber

# leftover close buttons / indicators
Get-ChildItem -Filter *.html -File | Select-String -Pattern 'fpop-close|class="chev"|cat-chev|▾|▸'
```

---

## 6. Task 21 — target catalogue (authoritative list from the brief)

| # | Offer | Price | Notes |
|---|---|---|---|
| 1 | Brand Kit | *(keep current P350 — confirm)* | image to get |
| 2 | Brand Kit Plus | *(keep current P500 — confirm)* | image to get |
| 3 | Brand Guidelines | **P2,500** (was P900) | |
| 4 | Simple Promo Card (Single Event Flyer) | **P120** (was P80) | replaces "Single promo card" |
| 5 | Promo Print Poster (A5 + A1) | **P200** | replaces removed "Poster (A2/A1)" |
| 6 | Promo Pack A (5 Promo Cards) | **P500** (was P300) | rename of "Pack of 5" |
| 7 | Promo Pack B (10 Promo Cards) | **P800** (was P550) | rename of "Pack of 10" |
| 8 | Story Pack A (3 Promo + 3 Story) | **P400** | |
| 9 | Story Pack B (7 Promo + 3 Story) | **P600** | |
| 10 | Story Pack C (7 Promo + 3 Story + 3 Animated 5–10s) | **P900** | replaces "Story pack (10 stories)" |
| 11 | Event Pack | **P300** | includes Promo Print Poster (A5 + A1) |
| 12 | Menu Design A (no print PDF) | **P700** (was P400) | |
| 13 | Menu Design B (with print PDF) | **P1,200** | |
| 14 | Menu Design C (with print PDF + photoshoot) | **P2,000** | |
| 15 | Business Cards | *(keep current P200 — confirm)* | image to get |
| 16 | Shopfront Sign Design | *(keep current P800 — confirm)* | image to get |
| 17 | Vehicle Wrap | *(keep current P1,500 — confirm)* | image to get |
| 18 | Monthly Social Pack | *(keep current P1,200 — confirm)* | image to get |
| 19 | Takeaway Bag Design | *(keep current P500 — confirm)* | image to get |
| 20 | Full Packaging Design | *(keep current P550 — confirm)* | renamed from "Full packaging system" |
| 21 | Animated Promo (5–10s) | **P200** | single |
| 22 | Animated Promo Pack A (3 × 5–10s) | **P500** | |
| 23 | Animated Promo Pack B (7 × 5–10s) | **P1,000** | |
| 24 | Logo Animation (5–10s) | *(keep current P500 — confirm)* | image to get |

**Removed:** standalone A5 flyer · Table Tent / Menu Stand · Poster (A2/A1) · Weekly Social Pack · Profile Banner Set · Event Teaser.

**Resolved 2026-10-29 (D2):** the 24 offers above are authoritative — the "30" figure is dropped. Do **not** re-add legacy services to reach 30.

---

## 7. Open decisions (need your answer before the affected task)

**Resolved 2026-10-29**
- **D1 — popup close:** the beige circular `.fpop-close` is removed; a **plain `X` glyph** (`.fpop-x`, transparent, no circle) may remain, and outside-tap / `Escape` always closes.
- **D2 — catalogue count:** the **24 listed offers** are authoritative (see §6).
- **D4 — orders page:** create a **new `Orders-List.html`**, reusing the existing summaries store in `js/eatouts-customer.js`.

**Still open**

| ID | Task | Question | Recommended default |
|---|---|---|---|
| **D3** | G4 | "All thumbnails 90px" — does that include **menu item thumbs** (currently 54px) and gallery grid cells? | Yes for list/card thumbs; galleries keep their layout sizes. |
| **D5** | T06 | The brief ends mid-sentence: *"When user opens"* — what should happen when a user opens an Order Group? | Open a group detail listing its summaries. |
| **D6** | T18 | The brief says only "activate" under `eatouts-suppliers` — activate what? | The page's save/publish flow (currently gated). |
| **D7** | T16 | Need the **Botswana WhatsApp Channel URL/number**. | Placeholder until provided. |
| **D8** | T21 | Prices missing for 8 offers (see §6 "confirm"). Keep current prices? | Keep current prices. |
| **D9** | T15 | Onboarding topbars are dark; standard header is light. Confirm the visual change is intended. | Convert to the light standard header. |

---

## 8. Progress log

| Date | ID | Status | Files touched | Verification | Commit |
|---|---|---|---|---|---|
| 2026-10-29 | — | PLAN | `PLATFORM UPDATE TASKS.md` | n/a | (this commit) |
| 2026-10-29 | G1 | DONE | 48 root `*.html`, `assets/eatouts-manager.css`, `eatouts-login.html`, `operator-businesses.html` | `html-catalog` ✔ · `appshell` ✔ · `smoke` ✔ · `inventory` ✔ (81 pre-existing warnings) · 0 pages without a scrollbar rule | `9f040e4` |
| 2026-10-30 | G2 | DONE | `eatout_event_builder.html`, `eatouts-suppliers.html`, `intake.html`, `get-started.html` | `builder-preview` ✔ · `intake8` ✔ · grep for `▾ ▸ ▲ ▼ .chev cat-chev content:"+"` → 0 in app files | (this commit) |

### Per-task completion template

```
### <ID> — <title> — DONE <date>
- Files: <list>
- Diff: +<n> / −<n>
- Verified: npm run inventory ✔ · npm run catalog ✔ · npm test ✔
- Manual: <what was checked at 360/390/430px>
- Docs: PLATFORM UPDATE TASKS ✔ · SESSION_NOTES ✔ · AGENT_CHANGE_LOG ✔ · catalog/inventory ✔
- Commit: <hash>
- Follow-ups: <none | list>
```

---

## 9. Risks & guardrails

- **`index.html` is ~9.9k lines** — every edit must be scoped by exact selector/line; never reformat.
- **Header sweeps (T08/T15/T14/T20/T06) touch many files** — do them one page per commit; verify each page renders.
- **`HTML_CATALOG.md` is generated** — hand edits are overwritten; always edit the meta JSON.
- **New pages must be added to `copy-static.mjs`** or they 404 in production.
- **No new dependencies.** No frameworks, no popup library — copy the existing `.fpop` recipe.
- **Popup conversion is the highest regression risk** (T12 especially) — verify open/close/save on every panel.
- **Region work (T22) changes data loading** — land it last, behind a registry with `BW` as the only active region, so a regression is contained.
