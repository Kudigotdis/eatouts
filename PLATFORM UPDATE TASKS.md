# EatOuts — Platform Update Tasks

> **Status:** PLAN (not yet executed)
> **Created:** 2026-10-29
> **Scope:** 28 major platform tasks + 5 global standards
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
| 0.3 | G3 | Floating-popup standard (plain `X`, no beige circle) — ✅ **DONE 2026-10-30**; residual bottom sheets cleared 2026-11-01 (B1) | M | 17 pages + `tests/builder-suppliers.js` + 5 onboarding pages |
| 0.4 | G4 | 90px thumbnail standard — ✅ **DONE 2026-10-30** | M | 19 pages |
| 0.5 | G5 | Doc/ledger baseline + verification pipeline green — ✅ **DONE 2026-10-30** | S | docs + `scripts/` |

### Phase 1 — Quick wins
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 1 | T01 | 1 | Promo text → 16px — ✅ **DONE 2026-10-30** | S |
| 2 | T10 | 10 | `reserve-cats` white gap above `.phead` — ✅ **DONE 2026-10-30** | S |
| 3 | T19 | 19 | `about-legal` text → 16px — ✅ **DONE 2026-10-30** | S |
| 4 | T02 | 2 | `bev-toggle` white highlighter + 15% inactive — ✅ **DONE 2026-10-30** | S |
| 5 | T14 | 14 | `eatouts-business-signup` appbar → standard header — ✅ **DONE 2026-10-30** | S |
| 6 | T20 | 20 | `operator-businesses` topbar → standard header — ✅ **DONE 2026-10-30** | S |

### Phase 2 — Mechanical / multi-file
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 7 | T11 | 11 | `reserve-events/providers/groups` phead + 90px `rthumb` — ✅ **DONE 2026-10-30** | S/M |
| 8 | T17 | 17 | Blog cleanup (10 removals + move search box) — ✅ **DONE 2026-10-31** | M |
| 9 | T15 | 15 | 7 onboarding pages → standard header (drop `draft-pill`) — ✅ **DONE 2026-10-31** | M |
| 10 | T16 | 16 | `about-main` WhatsApp Channel per region — ✅ **DONE 2026-11-01** (D7 closed: no channel exists yet) | M |

### Phase 3 — Interaction
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 11 | T08 | 8 | Activate `brand-mark` + Back History popup — ✅ **DONE 2026-11-01** (SPA popup + the header sweep in T08b) | M |
| 11b | T08b | 8 | Header sweep — standard `#hdr` on the 36 `.topbar` pages + `js/eatouts-back-history.js` for standalone pages — ✅ **DONE 2026-11-01** | L |
| 12 | T03 | 3 | `ritem` focus, scroll lock, 25% dim others — ✅ **DONE 2026-10-31** | M |
| 13 | T09 | 9 | `venue-about` promo thumb → gallery + "Add to Order" — ✅ **DONE 2026-11-01** | M |
| 14 | T07 | 7 | Standardised Filter Bar on 4 screens — ✅ **DONE 2026-11-02** (food, catering, bakery, bottle store) | M |

### Phase 4 — Structural redesigns
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 15 | T04 | 4 | `venue-checkout` redesign — ✅ **DONE 2026-10-31** | L |
| 16 | T06 | 6 | Orders badge + `Orders-List.html` (needs T04) — ✅ **DONE 2026-11-01** (`.hdr-chip` swept from all 15 `#hdr` pages; 32 `.topbar` pages wait on T08b) | L |
| 17 | T05 | 5 | `customer-delivery` redesign — ✅ **DONE 2026-11-01** (method gate + floating popups, recipient cards, full-page review) | L |
| 18 | T18 | 18 | `eatouts-suppliers` rework (steps 1–7) | L |

### Phase 5 — Large builds
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 19 | T12 | 12 | `eatout_event_builder` overhaul (9 sub-areas) | XL |
| 20 | T13 | 13 | `Created_Event.html` view-only page (needs T12) | L |
| 21 | T21 | 21 | `designer-services` catalogue + galleries + requests | XL |
| 22 | T22 | 22 | Multi-region architecture + `EatOuts-Region.html` | XL |

### Phase 6 — UI polish (new, 2026-10-30)
| # | ID | User task | Task | Size |
|---|---|---|---|---|
| 23 | T23 | — | `promos-feed` `.cal` → light grey 3% background — ✅ **DONE 2026-10-31** | S |
| 24 | T24 | — | `reserve-cats` `.cat-name` → 20px — ✅ **DONE 2026-10-31** | S |
| 25 | T25 | — | `restaurants-pager` `bev-toggle` equal spacing + 40% inactive opacity — ✅ **DONE 2026-10-31** | S |
| 26 | T26 | — | `gallery-grid` search button → `search_icon` image — ✅ **DONE 2026-10-31** | S |
| 27 | T27 | — | Remove promo tag/chip rows (all promos) — ✅ **DONE 2026-10-31** | S |
| 28 | T28 | — | `gallery-grid` `gal-cell` full-height (not square), 3 across, infinite scroll — ✅ **DONE 2026-10-31** | S/M |

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
- [x] No window scrollbar on any page at 360/390/430px width — §5 audit #1 prints nothing (re-run 2026-11-02; it resolves linked `assets/*.css`, so the manager pages count too).
- [x] `eatouts-login` shows no scrollbar — in that same sweep.
- [ ] A–Z rail (`.az-rail`) "still scrolls and is the only visible affordance" — **no longer matches the shipped rail**: `index.html:717` deliberately hides the rail's scrollbar and the letters are a tap strip (`flex:1 1 0`, no scrolling). Needs a decision on the intended behaviour, not a tick.
- [x] `npm test` green.

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

#### T01 — Promo text 16px (user task 1) · S — ✅ **DONE 2026-10-30**
**Files:** `index.html` (CSS only).
**Current:** promo cards are `.pcard`/`.ecard` with `.pbody`; body copy sits at 11–13.5px (`index.html:171-200`, `.phead-btn h3` 17px, `.pprice`, `.phl`, meta line 11px).
**Steps**
1. Add a scoped block after the `.ecard` rules:
   `#shell.promos-tab.promo-focus .pcard .pbody, #shell.promos-tab.promo-focus .ecard .pbody, #shell.promos-tab.promo-focus .promo-venue-card{font-size:16px}`
   plus explicit 16px on `.pbody p`, `.pbody li`, `.phl li`, `.pprice`, the meta line, and the CTA.
2. Do **not** shrink headings; let them stay ≥17px.
**Done when**
- [x] In the focused promo view every body line computes to 16px. *(probe: `feed .pbody`, `.phl li`, `.pprice`, `.pwas`, `.pmeta`, `.mdesc`, `.chip`, `.ctr .lbl`, `.pl-copy`, `.pl-btn`, detail `.pbody`/`.promo-venue-name` — all 16px)*
- [ ] No layout overflow at 360px; text wraps, no horizontal scroll (G1). *(structural: chip rows are `flex-wrap:wrap`, body copy wraps; **needs a device pass** — jsdom does not lay out)*
- [x] Unfocused feed unchanged. *(off-tab computed: `.phl li` 12px, `.pprice` 15px, `.pmeta` 11px; scoping is `#shell.promos-tab` only)*

#### T10 — `reserve-cats` gap above `.phead` (user task 10) · S — ✅ **DONE 2026-10-30**
**Files:** `index.html` (`renderReserveCats`, ~8095; `.crumb`/`.phead` CSS 578–585).
**Cause:** `.scroll` has no padding, so the inline `margin-top:12px` on that one `.phead` rendered as a white strip between the app bar and the grey band.
**Fix:** dropped the inline `margin-top` in `renderReserveCats` only.
**Done when** no white gap below the crumb; other pages' `.phead` unchanged.
- [x] `reserve-cats` `.phead` computed `margin-top:0`, `padding-top:20px`, and it is the first element in `.scroll`.
- [x] `reserve-groups` / `reserve-events` / `reserve-venue` kept their `padding-top:20px;margin-top:12px` at the time of T10 (source check). *(superseded by T11, which removed that inline `margin-top` from groups/events/providers)*

#### T19 — `about-legal` text 16px (user task 19) · S — ✅ **DONE 2026-10-30**
**Files:** `index.html` CSS `:494-495`, renderer `renderLegalDoc` `:8673-8693`.
**Steps:** `.legal-sec{font-size:16px;line-height:1.45}` and `.legal-para{font-size:16px;line-height:1.6}` (section margins nudged 4→6px / 8→10px so the bigger type does not look cramped); no other page uses those two classes, so the change is effectively local to the legal reader.
**Done when** every legal paragraph and section heading computes to ≥16px; long docs still scroll inside `.scroll` with no visible bar.
- [x] `.legal-sec` → `16px/1.45`, `.legal-para` → `16px/1.6` (computed, jsdom).
- [x] renderer still emits `.legal-sec` + `.legal-para`; no `font-size:13px` legal rule remains.
- [x] global `::-webkit-scrollbar{width:0;height:0;display:none}` (index.html:24) still hides the bar.

#### T02 — `bev-toggle` white highlighter + 15% inactive (user task 2) · S — ✅ **DONE 2026-10-30**
**Files:** `index.html` CSS `:315-324` (`renderRestaurantsPager` `:5269-5283`).
**Steps**
1. Remove the white "thumb" highlight on `.bev-toggle-btn.on` — took the "set it transparent" branch (`.bev-toggle-thumb{background:transparent}`) because `tests/beverages.js:57` and `tests/bakery-directory.js:96,123` assert the element and `setBevToggleThumb()` still exist; deleting the span would have meant touching 3 files. The `on` state is now carried by weight (`500` → `700`) plus opacity alone.
2. Inactive buttons → `opacity:.15` (base rule), `transition:color .2s,opacity .2s`.
3. Active stays `opacity:1`; `:active` press also goes to `opacity:1` so a tap on a 15% tab is not invisible.
**Done when** no white pill/highlighter behind the active button; inactive pages are 15% opacity; `aria-selected` still correct.
- [x] thumb computes `background: transparent` (no white rule left in the file).
- [x] inactive tabs compute `opacity .15` / `font-weight 500`; active tab `opacity 1` / `font-weight 700`.
- [x] `beverages` + `bakery-directory` suites still pass (thumb element, `setBevToggleThumb`, `aria-selected` intact).

#### T14 — `eatouts-business-signup` header (user task 14) · S — ✅ **DONE 2026-10-30**
**Files:** `eatouts-business-signup.html` CSS `:58-79`, markup `:545-549`.
**Steps:** replaced the `.appbar` block with the standard header markup:
```html
<header id="hdr" data-act="closePickers">
  <button class="brand-mark" type="button" aria-label="EatOuts home"><img src="assets/logo/EatOuts_Logo.png" alt="EatOuts"></button>
  <div class="hdr-right"><span class="hdr-chip" style="display: none;">Offline</span></div>
</header>
```
CSS swapped for the `venue-about.html:63-67` block (`#hdr` 58px sticky, `.brand-mark` 34px logo box, `.hdr-right`, `.hdr-chip`). Old `.appbar` and `.brand-mark .dot` rules deleted outright — nothing else referenced them.
**Done when** header matches the standard block exactly, logo loads, no `hdr-chip` visible, page content starts below it without gap.
- [x] one `<header>`, `id="hdr"`, `data-act="closePickers"`, brand `<button type="button">` + `assets/logo/EatOuts_Logo.png` (file present).
- [x] `.hdr-chip` computes `display:none`.
- [x] no `.appbar` rule or `.dot` badge left in the file.
- ⚠️ Behaviour change: the old brand mark linked to `index.html#promos`; the standard block is a button, so the page no longer has that home link (matches the other pages).
- ⚠️ `data-act="closePickers"` is inert on this page (no `data-act` dispatcher) — kept for markup parity.

#### T20 — `operator-businesses` header (user task 20) · S — ✅ **DONE 2026-10-30**
**Files:** `operator-businesses.html` CSS `:21-25`, markup `:72-79`, `theme-color` `:7`.
**Steps:** replaced the dark `.topbar` + `.brand-info`/`.brand-name` with the standard `#hdr` block; the page title now lives only in the body `page-head`.
**Done when** standard header present, no duplicated title, list still loads.
- [x] one `<header id="hdr" data-act="closePickers">` with the logo `<button>` + hidden `.hdr-chip`; `.topbar` / `.brand-info` / `.brand-name` rules deleted (grep: zero hits).
- [x] exactly one `<h1>` on the page, text "My businesses", inside `.page-head`; the header carries no heading.
- [x] `theme-color` moved `#171719` → `#ffffff` so the browser chrome matches the now-white header.
- [x] body title renamed "Businesses" → "My businesses" (the header's title had to land somewhere; keeps the page name identical to `<title>`).
- [x] `.scroll` keeps its own `padding:14px 12px 22px`, so the list starts right under the header with no dead band.
- ⚠️ The old brand mark linked to `index.html#promos`; the standard block is a button, so that shortcut is gone (same as T14).

---

### Phase 2 — Mechanical / multi-file

#### T11 — Reserve pages (user task 11) · S/M — ✅ **DONE 2026-10-30**
**Files:** `index.html` (`renderReserveEvents`, `renderReserveProviders`, `renderReserveGroups`, ~8070-8300; `.phead` ~553-562; `.rthumb` CSS).
**Steps**
1. `reserve-events`, `reserve-providers`, `reserve-groups`: `.phead` background `rgba(0,0,0,.02)`; remove the gap between `.crumb` and `.phead` (same technique as T10, scoped).
2. `reserve-providers`: every `.rrow .rthumb` → 90×90, square, rounded, `object-fit:cover` (G4).
**Done when** all three pheads are 2% grey with no gap; provider thumbs compute to 90px; no other page affected.
- [x] `reserve-groups`, `reserve-events`, `reserve-providers` `.phead` compute `background-color:rgba(0,0,0,0.02)` and `margin-top:0px`, each sitting directly after `.crumb`. *(probe)*
- [x] Scoped by `#shell .screen[data-page="…"]`; `reserve-cats` still computes `rgba(211,211,211,0.2)`, promos/menu untouched. *(probe)*
- [x] Every `.rrow .rthumb` on the provider page computes 90×90 (radius 15px, `overflow:hidden`, inner `.eo-thumb` 90px) — already delivered by G4, verified here rather than re-declared.
- [ ] Visual check of the 2% band against the 4% crumb at 390px — **needs a device pass**.

#### T17 — Blog cleanup (user task 17) · M — ✅ **DONE 2026-10-31**
**Files:** `eatouts-blog.html`, `js/eatouts-blog.js`, `tests/blog.js`.
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
- [x] zero hits for `hdr-chip`, `hdr-back`/`hdrBack`, `hdrPage`, `tl-card-foot`, `tl-card-tags`, `post-tags`/`post-tag`, `copyLink`, `blk-heading`, `tag-strip`, `tag-pill` in `eatouts-blog.html` + `js/eatouts-blog.js`; no `::before` content left.
- [x] `heading` block type + its renderer removed from `js/eatouts-blog.js` (only `subheading` remains).
- [x] `.search-wrap` is now `flex:0 0 auto` above `#bottomNav`, not sticky, and lives outside `#viewport` so it survives re-renders.
- [x] `tests/blog.js` asserts `timeline renders no tag strip`; `#tag-` hash deep-link boot still passes.
- [x] `node tests/blog.js` → 23/23 PASSED.
- [ ] Device pass at 360/390/430px — **needs a device pass** (jsdom does not lay out).

#### T15 — Onboarding headers (user task 15) · M — ✅ **DONE 2026-10-31**
**Files:** `restaurant-onboarding.html`, `caterer-onboarding.html`, `bakery-onboarding.html`,
`bottle-store-onboarding.html`, `mobile-kitchen-onboarding.html`,
`supplier-onboarding.html`, `eatouts-login.html`.
**Steps**
1. Replace each `<header class="topbar"><div class="topbar-row">…</div></header>` with the standard `<header id="hdr" …>` block.
2. Delete `.draft-pill` markup (keep the CSS only if still used elsewhere; otherwise remove).
3. Because these topbars are dark, re-map the header colours to the light standard and re-check contrast for the page's step indicator.
4. `eatouts-login`: apply the G1 fix here specifically (document scrollbar bug).
**Done when** all 7 pages use the identical header, no `draft-pill`, no scrollbar on login, forms still submit.
- [x] All 7 pages use the same `#hdr` block: logo link to `index.html#promos`, `hdr-right` with the hidden `.hdr-chip`; `.topbar`/`.topbar-row`/`.brand`/`.brand-title` CSS deleted.
- [x] `.draft-pill` markup + CSS gone; `#saveIndicator` survives as a hidden sink so the autosave JS keeps writing to it (autosave stays silent).
- [x] Setup-completeness bar kept, moved into a light `.progress-strip` under the header (same `#progressText`/`#progressFill` IDs).
- [x] `theme-color` → `#ffffff`; the bottle-store `18+` and login `Secure` pills re-coloured for white.
- [x] G1: `html,body{…overflow:hidden;overscroll-behavior:none}` on all 7 (login already had `overflow:hidden`); every shell already uses `height:100dvh`.
- [x] `login` keeps `#brandSub` (hidden; JS still sets it per view) and its `Secure` pill.
- [x] Runtime probe 62/62: jsdom boots all 7 pages with 0 window errors, `#hdr` 58px white, progress text updates, no `.topbar` in the DOM.
- [x] `tests/appshell.js` merchant assertions still pass (`class="hdr-chip"`, own `.tabs`, logo anchor); full `npm test` 58/58.
- [ ] Device pass — **needs a device/browser look** at the new white header over the dark `.intro` and the dark merchant `.tabs` strip on the five onboarding pages.

#### T16 — About → WhatsApp Channel (user task 16) · M — ✅ **DONE 2026-11-01** (D7 closed: no channel exists yet)
**Files:** `index.html` (`EATOUTS_WHATSAPP_CHANNEL_URL=''` at `:8521`, setrow at `:8597`, `renderAbout` `:8563`).
**Current:** the URL constant is empty, so the row is a dead link.
**Steps**
1. Replace the single constant with a region map:
   `const WHATSAPP_CHANNELS={BW:'https://whatsapp.com/channel/<id>', ZA:'', ZW:'', MW:'', KE:''}` keyed off the active region (see T22).
2. Row opens the channel for the active region in a new tab; if the region has no channel yet, show the standard floating "coming soon" popup.
3. ~~Needs the Botswana channel URL/number from you (D7).~~ **D7 resolved
   2026-11-01: no channel exists yet**, so the coming-soon popup is the correct
   shipped behaviour rather than a placeholder. Nothing to add until it exists.
**Done when** tapping the row opens the correct channel for Botswana; unknown region shows the popup.
- [x] **Region map:** the single `EATOUTS_WHATSAPP_CHANNEL_URL` constant is gone; `index.html` now holds `const WHATSAPP_CHANNELS={BW:'',ZA:'',ZW:'',MW:'',KE:''}`, `const ACTIVE_REGION='BW'` and `whatsappChannelUrl()` (= `WHATSAPP_CHANNELS[ACTIVE_REGION]||''`).
- [x] **Row:** renders `<a class="setrow" href="…" target="_blank" rel="noopener noreferrer">WhatsApp Channel</a>` when the active region has a channel, and otherwise a `<button class="setrow" data-act="showRestNotice" data-notice="The EatOuts WhatsApp Channel is coming soon.">` that raises the standard floating `.rest-notice` popup. No dead link ships.
- [x] `tests/about.js` — 8 new checks: row present, never an empty href, the five regions in order, `ACTIVE_REGION==='BW'`, empty URL while unset, the coming-soon notice text on tap, a configured BW URL turning the row into a `_blank` / `noopener noreferrer` link, and the shipped state staying unset. `node tests/about.js` → ABOUT TEST PASSED.
- [x] **D7 closed 2026-11-01** — no channel exists yet, so the coming-soon popup is the correct shipped state, not a placeholder bug. When the channel is created, drop the URL into `WHATSAPP_CHANNELS.BW` and the row becomes the outbound link with no other edit (`tests/about.js` already asserts both branches).
- [ ] → **handed to T22:** `ACTIVE_REGION` is hard-coded `'BW'`; the region picker makes it dynamic. Tracked there, not here.

---

### Phase 3 — Interaction

#### T08 — `brand-mark` + Back History (user task 8) · M — ✅ **DONE 2026-11-01** (popup on the SPA + full 36-page header sweep via T08b; only the device pass is outstanding)
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
- [x] Every app page has the identical header — **closed by T08b (2026-11-01)**: all 36 `.topbar` pages plus the manager shell now render `#hdr` + `.brand-mark` + `.hdr-right`, and `class="topbar"` / `topbar-row` / `hdr-chip` no longer appear in any root `*.html`. Only `food-truck-schedule1.html` and `operator-dashboard1.html` keep their bespoke `.top` bar (they never used `.topbar` — out of scope).
- [x] Tapping the logo opens the centred Back History popup with ≤5 entries — on the SPA (`index.html`); the logo there was already a `<button>`.
- [x] Tapping an entry navigates there; outside tap closes.
- [x] No `.fpop-close` inside it.
- [x] `sessionStorage` key `eatouts.history.v1`, newest first, deduped by screen key, capped at 5.
- [x] Entries carry a whitelisted state snapshot (`tab`, `restPanel`, open venue + its view, promo ids, gallery view, reserve breadcrumb, operator view) so a tap restores the actual SPA screen — the app has no hash router to replay one.
- [x] Labels: `Promos` / `Promo details`, `Restaurants` / `Catering` / `Bakeries` / `Beverages`, `"<venue> · Menu|Promos|About"`, `Reservations`, `Gallery`, `About Us`; relative time `now / Nm / Nh / Nd`.
- [x] Empty state: "No recent pages yet."
- [x] **T08b — header sweep** — done 2026-11-01 (36 `.topbar` pages + `js/eatouts-back-history.js`); see the block below.
- [ ] Device pass — popup shadow, row rhythm and the blur scrim at 360px.

**Notes**
- **Behaviour change:** on the SPA the logo no longer resets to the Promos home (that stays on the Promos nav tab). Standalone pages used to keep `<a class="brand-mark" href="index.html#promos">`; since T08b they are `<button data-act="backHistory">` too, so the logo opens history everywhere.
- No new file on the SPA: the feature is one self-contained block in `index.html`; the standalone half lives in `js/eatouts-back-history.js` (T08b).
- Standalone-page recording is now wired (`pagehide` + `location.pathname`), so `eatouts.history.v1` mixes SPA snapshots and standalone URLs and `restoreHistory()` handles both.

#### T08b — Header sweep (user task 8, part 2) · L — ✅ **DONE 2026-11-01**
**Why this is separate:** T08 shipped the popup on the SPA only. **36** root pages still build their own `class="topbar"` / `.topbar-row` header, **22** carry an `id="hdr"` variant, and `js/eatouts-manager.js:110` still injects a `.hdr-chip` into **32** of them. This is step 1 of T08 and step 1 of both **T18** and **T21** ("standard header (T08)"), so it lands before them.
**Files:** `js/eatouts-manager.js` (`:110` topbar builder), the 36 `.topbar` pages, new **`js/eatouts-back-history.js`**, `copy-static.mjs`, `tests/appshell.js`, `tests/orders-list.js`.
**Steps**
1. Replace the `.topbar` builder in `js/eatouts-manager.js:110` with the standard light header block (`#hdr` + `.brand-mark` + `.hdr-right`) so the 32 admin/merchant pages inherit it. No `.hdr-chip` anywhere.
2. On every standalone page `brand-mark` becomes `<button type="button" aria-label="EatOuts home" data-act="backHistory">` — no more `<a href="index.html#promos">`.
3. New `js/eatouts-back-history.js` (the standalone half of T08):
   - on `pagehide`, record `{href:location.pathname, title, ts}` into `sessionStorage` key `eatouts.history.v1` (same key and shape the SPA already writes, newest first, deduped, capped at 5);
   - render the same centred `.hist-wrap` / `.hist-pop` dialog (blur scrim, plain `X`, outside-tap + `Escape` close, empty state "No recent pages yet.");
   - an entry carrying an `href` navigates; an entry carrying an SPA snapshot sends the user to `index.html`, where `restoreHistory()` replays it.
4. Load the script on every swept page. `copy-static.mjs` copies `js/` wholesale, so only the `src` tags need adding.
5. Tests: `tests/appshell.js` merchant logo assertion becomes the `data-act="backHistory"` button; add a sweep check (in `tests/appshell.js` or `tests/orders-list.js`) asserting no `class="topbar"`, no `topbar-row` and no `hdr-chip` in any root `*.html`.
**Progress 2026-11-01 (standard-header half)** — 19 pages converted, `js/eatouts-back-history.js` shipped:
- [x] `brand-mark` is a `<button type="button" data-act="backHistory">` on all 19 standard-header pages (13 anchors swapped, 4 existing buttons tagged, 2 decorative divs promoted).
- [x] `js/eatouts-back-history.js`: records `{href,label,t}` on load and on `pagehide` into `eatouts.history.v1` (deduped by href, capped at 5), renders the same `.hist-wrap` / `.hist-pop` dialog (scrim + `Escape` close, empty state "No recent pages yet."), and sends SPA snapshot entries to `index.html#<tab>`.
- [x] `copy-static.mjs` copies `js/` wholesale, so the new file ships without a config change; the tag goes before `</body>`.
- [x] `tests/back-history.js` (29 checks) + the `tests/appshell.js` logo assertion retargeted + registered in `tests/run-all.js`.

**Progress 2026-11-01 (full sweep — user decision A, all 36 `.topbar` pages)** — T08b closed:
- [x] **Manager shell first:** `js/eatouts-manager.js` builds `<header id="hdr">` (logo button + `.hdr-right`) instead of `.topbar`; the `.hdr-chip` label is gone and the page title now lives in `.hdr-right`. `homeFor()` deleted. `assets/eatouts-manager.css`: `.topbar` → `#hdr`, `.brand` → `.brand-mark`, `.hdr-chip` rule dropped. `js/eatouts-back-history.js` is loaded by the 10 `EO.shell` pages that get their header from JS.
- [x] **36 pages converted:** the 12 brand+chip pages, 19 brand+chip+progress pages, the one brand+chip+progress+`.tabs` page and the 3 no-chip/no-progress pages now carry the identical light block. The progress strip moved out of the dark bar to its own row directly under `#hdr` (`#hdr + .progress-row` styling), `.hdr-chip` deleted, dead `.topbar` / `.topbar-row` / `.hdr-chip` CSS stripped.
- [x] **Page labels kept where the chip was the only title:** `gallery-onboarding` ("Gallery"), `invoice` ("Invoice"), `menu-onboarding` ("Menu Management"), `ops-console` ("Ops Console"), `eatouts-checkout-summary` ("Checkout Summary") and `eatouts-customer-signup` show it as `.hdr-right > .brand-subtitle`; the signup page also lost its duplicated brand block and the dead "Draft mode" pill.
- [x] **Print rules** that used to hide `.topbar` now hide `#hdr` (blog, intake, invoice, lodge-onboarding, one-pager, promo-onboarding).
- [x] `tests/back-history.js` sweep asserts: no `class="topbar"` / `topbar-row` / `hdr-chip` in any root page, 55 pages carry the brand mark, all 55 wire the button + load the script, and only `food-truck-schedule1.html` / `operator-dashboard1.html` keep a bespoke header.
- [x] Verified: `npm test` ✔ (60 suites, 0 failed) · `npm run inventory` ✔ (70 pages) · `npm run catalog` ✔ (70 pages).
- [ ] Device pass — the light header + moved progress strip at 360px on the three densest pages (`eatouts-orders`, `restaurant-dashboard`, `event-onboarding`).

**Done when** every app page has the identical header, the logo opens Back History on every page (≤5 entries, mixing SPA screens and standalone pages), and `Select-String -Pattern 'topbar|hdr-chip' *.html` returns nothing.

#### T03 — `ritem` focus + scroll lock + dim (user task 3) · M — ✅ **DONE 2026-10-31**
**Files:** `index.html` — `syncRestAccordions` `:4476-4486`, `renderRestaurantRow` `:5630-5640`, `toggleRestaurant` handler `:9146`, `state.restaurantOpen` `:3621`, CSS `.ritem` ~`:640-658`.
**Steps**
1. On open: `scrollIntoView({block:'center',behavior:'smooth'})` on the `.ritem.open`.
2. Lock scrolling while open: add `body.ritem-locked .scroll{overflow:hidden}` (and `touch-action:none`), remove on close/navigate.
3. Dim all sibling `.ritem` to `opacity:.25` via a container class `.list.has-open .ritem:not(.open){opacity:.25;pointer-events:none}`; restore on close.
4. Cleanup on tab change / page navigation (`state.restaurantOpen=null` paths at `:5617`, `:8802`, `:8947`).
**Done when** tapping a row centres it, page cannot scroll until closed, others are 25% and non-tappable; closing restores everything; no stuck lock after navigating away.
- [x] Open: `scrollIntoView({block:"center",behavior:"smooth"})` on the opened `.ritem`, only when the open id changes (no re-scroll on unrelated renders).
- [x] `body.ritem-locked .scroll{overflow:hidden;touch-action:none}` added next to `.ritem`; removed on close.
- [x] `.scroll.has-open .ritem:not(.open){opacity:.25;pointer-events:none}`, `.has-open` set on the open row's own `.scroll` (the restaurant list only — catering/bakery/beverage panels are untouched).
- [x] Cleanup is centralised: all three paths run `closeAllRitemAccordions()`/`render()`, and `render()` now calls `syncRestAccordions()`, so a navigation always re-derives the lock (and clears it when no `.ritem` is open).
- [x] Probe: 23/23 — open sets `.open`/`has-open`/`ritem-locked` + one `scrollIntoView`, sibling computes `opacity .25` / `pointer-events none`; close restores; reopening scrolls again; Promos tab leaves no lock.
- [ ] Device pass — **needs a phone look** at the smooth centring and the 0.25 dim on a long list.

#### T09 — Promo thumb → Add to Order (user task 9) · M — ✅ **DONE 2026-11-01**
**Files:** `venue-about.html` (`.promo-thumb` CSS `:352-365`, markup `:663-673`, carousel JS), `index.html` cart API (`state.cart`, `cartKeys`, `cartTotal`).
**Steps**
- [x] 1. Tapping `.promo-thumb` opens a floating gallery (feint black scrim over the page, image centred in a rounded stage, dots for the gallery, swipe left/right, dot tap jumps).
- [x] 2. A centred "Add to Order" button sits horizontally beneath the image (`#plbAdd`, last child of `#plb`).
- [x] 3. Tap outside the image (the scrim) closes; Escape closes.
- [x] 4. "Add to Order" writes the promo as one cart line (promo id, title, price, qty:1) into `localStorage 'eatouts_cart_v1'` and toasts; a re-tap increments qty on the same row.
**Done when** the gallery opens with dots + swipe, outside-tap closes, Add to Order adds exactly one line and the cart badge/total update. ✅ all four covered by 26 checks in `tests/venue-about-options.js`.

**Data note (why the fallback exists):** promo content is API-owned — `index.html` ships `const PROMOS = {}` (`:3250`), `assets/data/restaurant_listings/directory_runtime_data.js` has no `promos` field at all, and no demo promo exists in the repo. `venue-about.html` therefore reads, in order: `window.EATOUTS_VENUE_PROMOS[slug]` (promo API / owner tool), `EatoutsBridge.feedPromos()` (GET `/api/promos`, when that library is on the page), `rec.promos`. With none present the Promos accordion shows **branded venue tiles** (the locked T09 decision) and the CTA reads "Price not published yet" and stays disabled — the page never invents a price. The full Add to Order path is exercised in the suite by injecting the feed the same way the API would.


#### T07 — Standardised Filter Bar (user task 7) · M — ✅ **DONE 2026-11-02** (all four directories; the 10-31 "blocked on data" note was wrong — see notes)
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
- [x] One `renderFilterBar(cfg)` builder (`searchId`, `placeholder`, `query`, `townAct`/`townLabel`/`townOpen`, `areaAct`…, `typeAct`…), used by the food directory and the bottle-store directory. Emits the search row + Town | Area | Cuisine/Type row.
- [x] Toggle unchanged: 2nd tap on the active Restaurants nav opens/hides (`state.restFilterOpen` for food, `state.bevFilterOpen` for beverages).
- [x] Live search wired for the food directory (`#restSearch` → `state.restQuery` → `filteredRestaurants()` via the existing `restaurantNameMatches()`); bottle stores already had `#bottleSearch`. Empty state kept, search text + caret survive the re-render.
- [x] Labels: food `All Cuisines` / one cuisine / `N Cuisines`, beverages `Type` / one type / `N Types`.
- [x] `.rest-filter-row .cbtn` and `.align-right` are now `text-align:center`; `.rest-filter-controls .rest-filter-row .cbtn` is `16px`.
- [x] `.loc-all .loc-count` removed from all six "All" rows (promo town, restaurant town, bottle town, gallery restaurant/town/area). Per-row badges untouched.
- [x] `.town-scroll` already had even `8px` top/bottom padding; it now also hides its scrollbar (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`).
- [x] `.az-rail` background `rgba(0,0,0,.03)`.
- [x] `tests/beverages.js` updated to the new spec (was asserting 18px / left / right-aligned).
- [x] **Deviation retracted 2026-11-02 — catering + bakery were never blocked on data.** `cateringBrands()` does carry a per-brand `type` (`assets/data/catering_services_database.json` → `CateringServicesDatabase.js`), surfaced by `cateringTypeNames()` `:5701` and already consumed by `cateringMatchesFilters()`; bakeries get their Type list from `js/bakery-types.js` (`window.BAKERY_TYPES`) via `bakeryTypeNames()` `:5960`, with `bakeryHasType()` `:5966` deliberately showing undeclared-product bakeries under every type. Both screens therefore reuse the same `renderFilterBar()` — catering `:6785-6809` (toggle `state.cateringFilterOpen` `:3803`), bakery `:6811-6835` (toggle `state.bakeryFilterOpen` `:3812`), plus the nav-tap branches at `:9515-9524`. Probe 26/26 across all four panels (hidden → 2nd tap open → 3rd tap close, `#restSearch`/`#cateringSearch`/`#bakerySearch`/`#bottleSearch`, `Town | Area | All Cuisines|Type`), 0 window errors.
- [ ] Device pass — 16px centred labels and the tinted rail at 360px (all four panels).

---

### Phase 4 — Structural redesigns

#### T04 — `venue-checkout` redesign (user task 4) · L — ✅ **DONE 2026-10-31**
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

**Done 2026-10-31 — all 11 bullets shipped in `index.html`:**
- [x] 1–3: single crumb `Order Summary`, `.osum-card` (90px logo, name, live "N items for P#"), `.co-edit` gone from `.co-main`.
- [x] 4–5: `.pad`/`.scroll` at `rgba(0,0,0,.03)`; `.co-steprow` right-aligned on its own row under `.co-main`.
- [x] 6: `openSplit` gated on `aboutUser()` → `summarySignup()` floating popup for browsers.
- [x] 7: live totals — `syncCart()` patches every `[data-cototal]` (items/fee/grand) plus line totals and `[data-osumcount]`.
- [x] 8: `saveSummary` (account-gated) + `deleteSummary` confirm popup → `deleteSummaryConfirm` clears cart/split/delivery.
- [x] 9: `goDelivery` interactive + `.co-dl` compact summary line (type · area · fee) when details exist.
- [x] 10: **WhatsApp Review** — new SPA screen `venue-checkout-review` (`PAGE: venue-checkout-review — WhatsApp Review`, `renderCheckoutReview()`) previews `buildFullBillMessage()` verbatim; button sits in `.co-wa-row` beside **Send via WhatsApp**.
- [x] 11: `waOrder` opens the floating **recipient choice** — `waSendVenue` (venue WhatsApp number, `waLink(...,"order_checkout","act=waOrder")`) and `waSendContact` (sign-up popup for browsers, else `waShareLink()` contact picker). `bridgeDraftOrder()` + `notifyFieldOrder()` still fire before the popup.
- [x] Verified: `npm run inventory` ✔ (31 screens) · `npm run catalog` ✔ · `npm test` ✔ — `tests/checkout-delivery.js` grew 5 checks for the review screen + recipient choice.
- [ ] Device pass at 360/390/430px (jsdom does not lay out).

#### T06 — Orders badge + `Orders-List.html` (user task 6) · L — ✅ **DONE 2026-11-01** (T06a `05930ea`, T06b `9b07f11`, T06c chip removal; device pass outstanding)
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

- [x] `Orders-List.html` created (T06a, `05930ea`) — group headers by `orderRef||venueName`, Order Summary Cards with a 90px thumb on the right, tap → `eatouts-checkout-summary.html?id=…`, empty state, `data-page="Orders-List"`.
- [x] Counter widget (T06b, `9b07f11`) — `js/eatouts-orders-badge.js` paints `#ordCount` on the four `#hdr` pages that load `js/eatouts-customer.js`; hidden for browsers; repaints on `eatouts:customer-changed`, `storage` and `visibilitychange` via `EatoutsCustomer.reloadLocal()`.
- [x] `.hdr-chip` gone from every `id="hdr"` block (T06c, `46e4573` / `76dd282` / `8e4f28a`).
- [x] Verified: `npm test` ✔ (**59 suites passed, 0 failed**) · `npm run inventory` ✔ (19 checks, 70 pages) · `npm run catalog` ✔ (70 pages) · `tests/orders-list.js` 26 checks.
- [ ] Device pass at 360/390/430px — the counter's 13px light-grey number and the delivery pages' right slot are unchecked visually.
- Note: the 32 admin/merchant pages that rendered `.hdr-chip` from the shared `.topbar` were converted in **T08b** (`js/eatouts-manager.js` no longer builds a topbar) — no `.hdr-chip` remains in the repo.

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

**Result — ✅ DONE 2026-11-01** (`tests/customer-delivery.js`, 52 checks)
- 1–4: `.hdr-chip` gone; `.osum-back` + its CSS deleted, `.osum-tot` + `.osum-items` now `.osum-line` ("P140.00 · for 2 items"); `.acc` is the 3% grey panel (`background:rgba(0,0,0,.03)`); `.acc.open .acc-title` paints 5%.
- 5: `accClass(id)` adds `.locked` to every accordion except `method` while `!STATE.deliveryMode`; the `[data-acc]` handler refuses with `fpopAlert('Choose a delivery method first')` inside `#fpop` / `#fpopScrim` (new markup beside `#toast`).
- 6: `FLOAT_DRP={area,propType,bank}` → `renderDropdown()` emits a second `.drp-list.open.float` node plus a `.fpop-scrim` (fixed, centred, 70dvh); the hint is `.hint.centre` with the exact copy; `.gps-btn` (5% grey, `#4a463c`) calls `pickGps()` → geolocation attaches lat/lng + a maps link, otherwise opens the Maps picker.
- 7: `.seg` me / someone-else toggle; `.rcpt-card` history (90px `.rcpt-thumb`, name + "# orders received"); thumb → `#fpop` viewer with Add image (`[data-rcphoto]`, FileReader), Edit details (`[data-rcedit]` first/surname/mobile) and Delete; new-recipient form demands a photo before saving, 150px `.rcpt-hero` above the `.row2` name row; `.acc-val` shows `Me · Name` or the picked card's name. Recipients persist in `eatouts_recipients_v1`.
- 8: bank picker floats, `.hint` and "Payment preference recorded…" removed, `.acc-val` = bank (or the method when no bank is chosen).
- 9: `#reviewPage` — full page block (no `.acc`, no `[data-acc="review"]`), Edit jumps to the method step, Delete clears mode/area/recipient/payment, drops `ORDER.delivery` and re-locks the flow.
- 10–11: "WhatsApp Request" `.acc-lbl` deleted; `barPrimary` reads `Add P40.00 to P100.00 for 2 items` and navigates to `index.html?resume=1#restaurants`. `persistDelivery()` now writes `delivery:null` when nothing is chosen.
- Verified: `node tests/customer-delivery.js` → **CUSTOMER-DELIVERY TEST PASSED** (52 checks, 0 window errors); `tests/checkout-delivery.js` bar assertions updated to the new label → PASSED; `npm test` → **61 passed, 0 failed**; `npm run inventory` → 10 checks / 90 warnings; `npm run catalog` → 70 pages.
- Not verified: real-device look at 360/390/430px (jsdom does not lay out) and the live geolocation prompt (only the fallback path is exercised headlessly).

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

#### T12 — `eatout_event_builder` overhaul (user task 12) · XL — 🟡 **IN PROGRESS** (12.1-12.4, 12.7, 12.8 + the overlay standard done; 12.5, 12.6, 12.9 open)
**Files:** `eatout_event_builder.html` (single file, ~4.2k lines), `js/eatouts-events*` if present.
**Sub-tasks (do in this order, verify each)**

**Global overlays (G3)** — ✅ **DONE 2026-11-02**
- `.menu-page-panel` (`:463-466`) and `.flyer-menu-panel` (`:727-730`) were the last two bottom-sheet panels in this file (up to 460px wide, `94vh`/`88vh` tall, `border-radius:20px 20px 0 0`). Both now use the `.fpop` recipe — `max-width:420px`, `max-height:80dvh`, `border-radius:16px` — and both already rendered inside the centred `.fpop-scrim`, so the CSS geometry was the only thing standing in the way;
- `Escape` already closed `.menu-page-panel` (`:3573`/`:3576`); outside-tap closes both through the scrim's `data-act`;
- §5 audit #4 triage (`.modal` / `.fpop` / `*-panel` hits only) now returns **zero** live hits repo-wide.

**12.1 Venue bar** — `.venue-bar-expand.open` (`:63-66`) — ✅ **DONE 2026-11-01**
- all text 16px;
- remove: "Venue Provider", "Name, from P0.00", "Spaces", "Selected";
- `.title-edit-panel` → floating popup (G3).

**12.2 Schedule** — `[data-sec="schedule"]` — ✅ **DONE 2026-11-02**
- [x] `setScheduleMode` chips (`one-day`, `multi-day`) equal width + centred — `.chip-row.eq` (`:159-161`, `grid-template-columns:1fr 1fr`, centred labels), applied at `:2115`;
- [x] `.schedule-day` is a collapsible accordion — header is `data-act="toggleDayOpen"` (`:2123`), state in `STATE.dayCollapsed` keyed by day id, `.schedule-day.collapsed .schedule-day-in{display:none}` (`:329-330`); the body stays in the DOM so the per-day note and tests keep working;
- [x] date fields → **Year / Month / Day** buttons on one row (`.dt-row.dt-3`, `scheduleDateRow()` `:2178`), each opening a floating scroll-list popup (`renderSchedulePicker()` `:2216`, `.fpop-scrim` + `.fpop` + scrolling `.fpop-body`, selected option centred on open); the stored value stays `YYYY-MM-DD`, and `daysInMonth()`/`clampDate()` keep the day count correct per month and leap year (Feb 2028 → 29 options, Feb 2027 → 28, a 31st clamps down);
- [x] time fields → **Hour / Minute** buttons on one row (`.dt-row.dt-2`, `scheduleTimeRow()` `:2186`), same floating scroll-list (24 hours / 60 minutes), stored as `HH:MM`;
- [x] no native `<input type="date">`/`type="time">` left in the section.
- [x] permanent coverage: `tests/builder-schedule.js` (25 → 64 checks) proves the chip grid, the accordion toggle, the three/two-button rows, the 29-vs-28 February day count, the 29 Feb → 28 clamp, the 24/60 option lists and the draft write-back.

**12.3 Audience** — `[data-sec="audience"]` — ✅ **DONE 2026-11-02**
- [x] thin light separator above the field hint (new `.sec-sep` `:338-339`, emitted after the guest-count field at `:2147`);
- [x] `addAudience` → floating `.prompt-panel` — the shared `.prompt-panel` is now the G3 floating recipe (`max-width:420px`, `border-radius:16px`, `max-height:80dvh`, flex column, scrollable `.prompt-body`); it already rendered inside `.fpop-scrim` via `renderPrompt()` `:3063`, so the bottom-sheet CSS was the only thing standing in the way. This also floats the guests / RSVP / links prompts (12.6-12.8);
- [x] thin light separator above "Event Rules" (`:2160`, inline `margin-top:24px` dropped in favour of the divider);
- [x] `.rm` (removeAudience / removeRule, plus `.tier` and `.note-item` for consistency) → light grey `X`, no white circle (`background:transparent`, `border:0`, `color:var(--muted-2)`, `:active{opacity:.55}`; `border-radius:50%` removed).
- [x] permanent coverage: `tests/builder-audience.js` (24 → 31 checks) proves the prompt floats in a centred scrim as a 420px/16px card, the close is a bare `×` with no circle, the two `.sec-sep` sit above the hint and above Event Rules, and `.rm` dropped its white circle.

**12.4 Suppliers** — `[data-sec="suppliers"]` — ✅ **DONE 2026-11-02**
- [x] `openSupplierTypeMenu` → floating `.fpop-scrim` (already was; the panel is `.fpop`, 420px / 80dvh);
- [x] `.fpop-search` pinned to the **bottom** of that popup — new `.fpop-search.is-foot` (`:566-567`, rule on top instead of bottom) and the markup order is now hdr → `.fpop-body` → search;
- [x] no beige circle behind the close button — `.fpop-x` is a plain glyph (`background:transparent`, no border, `×` only);
- [x] `.sup-profile-avatar` 150px, tap → full-image gallery with swipe + dots;
- [x] `.sup-profile-loc` → 16px;
- [x] `.sup-profile-scroll` → inside the floating 420px / 80dvh / 16px-radius panel (`:618-623`);
- [x] `.sup-profile-name` → opens the **Service Provider Info** floating popup (`renderSupInfo()` `:2766`): 90px thumb left, name + services right, description below;
- [x] `.pit-thumb` 90px, tap → full-image gallery with a feint black backdrop (`rgba(0,0,0,.55)`), dots **above** the image, white caption below, outside tap closes (`renderImageGallery()` `:2793`);
- [x] `.qty-stepper.sm`: `−`/`+` centred, stepper moved to a row **below** `.pit-info`, right-aligned, with the added cost left-aligned under `.pit-info` (`.pit-foot` / `.pit-cost` `:652-656`);
- [x] `.pit-info`: 90px thumb left, `.pit-title` + `.pit-price` right (`.pit-card` is now a `90px 1fr` grid).
- [x] permanent coverage: `tests/builder-suppliers.js` (49 → 87 checks) proves the popup child order `fpop-hdr > fpop-body > fpop-search.is-foot`, the plain transparent `×`, the 420px / 80dvh / 16px profile and info cards, the 150px avatar, the 16px location line, the `90px 1fr` card with its `.pit-foot` (cost left, 118px right-pushed stepper, centred glyphs), and both galleries end-to-end (feint backdrop, dots above the track, caption below, dot highlight, avatar + item-thumb opens, outside tap closes, profile surviving behind).

**12.5 Details** — `[data-sec="details"]`
- centre `.chip-row`; `setEventMode` chips equal width; centre `.field-hint`;
- Dress code → **Dress-Code-Cards**: 90px square thumb, tap = gallery (add/remove/swipe), add/edit/remove cards.

**12.6 Guests** — `[data-sec="guests"]`
- `.prompt-panel` floating;
- `.prompt-thumb` → 150px, remove "Add photo" text;
- remove beige `fpop-close` circle, keep a plain `X` glyph (D1);
- `.qty-stepper` `−`/`+` centred.

**12.7 RSVP** — `[data-sec="rsvp"]`: `.prompt-panel` floating; remove beige close circle, keep a plain `X` glyph. — ✅ **DONE 2026-11-02** (`renderPrompt` `:3301-3316`, inherited from 12.3)
- permanent coverage: `tests/builder-guests.js` +11 checks — `addRsvp` → `.prompt-panel` inside a centred `.fpop-scrim`, computed 420px / 16px, a plain transparent `×` in `.fpop-hdr`, zero `.fpop-close` in the document; the `X`, an outside tap and `Escape` each close it; the RSVP-specific `contactType` / `contactValue` fields survive.

**12.8 Links** — `[data-sec="links"]`: `.prompt-panel` floating; remove beige close circle, keep a plain `X` glyph. — ✅ **DONE 2026-11-02** (`renderLinkPicker` `:3334-3340`)
- permanent coverage: `tests/builder-guests.js` +11 checks — `openLinkPicker` → the same `.fpop-scrim > .prompt-panel` card (420px / 16px) titled "Add Link" with its `.link-icon-grid` intact, a plain transparent `×` (`data-act="closeLinkPicker"`), zero `.fpop-close`; the `X`, an outside tap and `Escape` each close it.

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

#### T22 — Multi-region architecture (user task 22) · XL — 🟡 **IN PROGRESS 2026-11-02** (file moves, registry, selector page and the settings row landed; data gating still pending)
**Files:** `SYNC REGION TASK/*` (**removed** 2026-11-02 — the last file moved to `_trash/`), new `js/eatouts-regions.js`, new `EatOuts-Region.html`, `index.html` (`renderAbout` settings rows `:8590-8600`), `copy-static.mjs`, `botswana_locations.js`, docs.
**Steps**
1. **Move the files** (folder must be empty afterwards):
   - [x] `countries-data.js`, `territories.js`, `territory-registry.js`, `countries_mobile_networks.js` → `js/` (all four landed, 9,752 / 14,850 / 38,884 / 43,548 bytes; nothing referenced the old paths)
   - [x] `Country-Flag-Icons/*` → `assets/flags/` — 256 ISO-3166 alpha-2 `.png` flags (`bw.png`, `za.png`, `zw.png`, `mw.png`, `ke.png` all present), so the selector can build `assets/flags/<code>.png` straight from the registry
   - [x] `eatouts-region-selector.html` → reskin + rename → `EatOuts-Region.html` (2026-11-02; the mockup went to `_trash/eatouts-region-selector.html`, which is gitignored, so history keeps the tracked deletion)
   - [x] delete the now-empty `SYNC REGION TASK/` folder (2026-11-02 — the folder is gone; `git status` shows the one tracked file as deleted)
   - Note: no `copy-static.mjs` change is needed for the moves — `FOLDERS` already copies `js` and `assets` wholesale, which is why `dist/js/countries-data.js` and `dist/assets/flags/*` follow automatically.

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
   - [x] Landed in `fadcf15` as `window.EatoutsRegions` (`all` / `get` / `getActiveRegion` / `setActiveRegion` / `isActive` over `window.EATOUTS_REGIONS`), key `eatouts.region.v1`; a stored code that is unknown or still `active:false` falls back to `BW`.
   - [x] Covered by `tests/region-selector.js` (registry API block): `all()` returns five, the default is `BW`, `setActiveRegion('ZA')` returns `false` and leaves `BW` active, and both a stored `ZA` and a stored `XX` fall back to `BW`.
3. **Data gating:** every place/venue/menu/directory load filters by `region` (add `region:'BW'` where missing, default `BW`); location files resolved through the registry; currency formatting driven by the region.
   - [ ] Open — deliberately sequenced after T13 (`money.js` owns currency formatting today; gating first would double-write the same code).
4. **Settings row:** under Settings, **above** "About EatOuts", add a `.setrow` labelled with the active region ("Botswana"), opening `EatOuts-Region.html`.
   - [x] `index.html` `renderAbout()` `:9191-9196`: `regionName` reads `EatoutsRegions.getActiveRegion().name` (falling back to "Botswana" if the module is absent) and the row is the first child of the Settings `.acc-in`, directly above `About EatOuts`.
   - [x] `index.html` loads `js/eatouts-regions.js` right after `js/eatouts-analytics.js` (`:999`), so the label follows the persisted region.
   - [x] Covered by `tests/about.js` (+5 checks): row present, labelled "Botswana", next sibling is `About EatOuts`, sits in the Settings panel rather than the nested List Business `<details>`, and the registry script is loaded.
5. **`EatOuts-Region.html`:** reskinned TrackHype selector (EatOuts colours/header/nav, flags from `assets/flags/`, search), Botswana selected; tapping any other region → floating popup **"This region is coming soon."**
   - [x] Shipped 2026-11-02 (204 lines): standard `#hdr` (button `.brand-mark` on `data-act="backHistory"` + `js/eatouts-back-history.js`), the five-link `.appnav`, 3% grey `.pad`, `<!-- PAGE: Select Region -->` + `<body data-page="EatOuts-Region">`. Demo momentum/track-hype assets dropped; `Country-Flag-Icons/` rewritten to `assets/flags/<code>.png`; the region list, its search row (`#regionSearch`, filters by name **and** code) and the rows themselves are built from `EatoutsRegions.all()`.
   - [x] Non-BW tap opens the G3 card (`#soonScrim` → `.fpop`): 420px / 80dvh / 16px, plain transparent `×` in `.fpop-hdr`, no `.fpop-close`, closes on the X, an outside tap, `Escape` and the "Got it" button.
   - [x] Covered by `tests/region-selector.js` (45 checks): page markers + `data-page` slug, standard header/nav, five rows in registry order with `aria-pressed` on BW, every rendered flag file present on disk, search by name / by code / no-match / cleared, the full card contract and all four close routes, and `eatouts.region.v1` written on the BW tap.
6. Register the new page in `copy-static.mjs`, catalog meta, `PAGE_INVENTORY.md`, `HTML_PAGES.md`; add `js/eatouts-regions.js` + the moved JS to `copy-static.mjs` (js/ folder is copied wholesale — verify).
   - [x] `copy-static.mjs` FILES gained `EatOuts-Region.html` under "Standalone customer surfaces reached from index.html"; `js/` and `assets/` were already copied wholesale.
   - [x] Registered as page **72**: `scripts/html_catalog.meta.json` entry + changelog note, `PAGE_INVENTORY.md` §K "Regions (2026-11)" (`PAGE: Select Region` marker), `HTML_PAGES.md` summary row; `npm run catalog` → 72 pages / 1,147 lines, `npm run inventory` → 72 files.
   - [x] `tests/back-history.js` brand-mark count 55 → **56** (the parity sweep counts every standard-header page, so a new page bumps it).
**Done when** `SYNC REGION TASK/` is empty/removed, the region row appears above About EatOuts, the selector page works, non-BW regions show the coming-soon popup, and all data still loads for Botswana.



---

### Phase 6 — UI polish

#### T23 — `promos-feed` `.cal` light grey 3% background (user task) · S — ✅ **DONE 2026-10-31**
**Files:** `index.html` CSS `.cal` rule `:132` (and `#shell.promos-tab.promo-focus .cal` at `:43`).
**Current:** `.cal{...;background:#ffffff;...}` renders a solid white band behind the week calendar.
**Steps**
1. Change the `.cal` background to a 3% light grey: `background:rgba(0,0,0,.03)` (or `rgba(128,128,128,.03)`). Keep the border/shadow/padding.
2. Confirm the focused-promo mode (`#shell.promos-tab.promo-focus .cal{display:none}`) is unaffected.
**Done when** `.cal` computes a 3%-opacity light-grey background on `promos-feed`; no other page's calendar/strip changes.
- [x] `.cal` background is `rgba(0,0,0,.03)`; border/shadow/padding untouched.
- [x] `#shell.promos-tab.promo-focus .cal{display:none}` still hides it in focused-promo mode.
- [x] Probe: `.cal` computes `rgba(0, 0, 0, 0.03)` at boot on the Promos tab.

#### T24 — `reserve-cats` `.cat-name` 20px (user task) · S — ✅ **DONE 2026-10-31**
**Files:** `index.html` CSS `.cat-name` `:251`, `.cat-row.evcat .cat-name` `:258`; renderer `renderReserveCats` `:8100-8112`.
**Current:** base `.cat-name` is 24px and the `.evcat` variant overrides to 30px, so reserve-cats category names render at 30px.
**Steps**
1. Scope a 20px rule to the reserve-cats screen: `#shell .screen[data-page="reserve-cats"] .cat-name{font-size:20px}` (override the `.evcat` 30px).
2. Do not change the base `.cat-name` (used elsewhere) or other reserve pages.
**Done when** every `.cat-name` on `reserve-cats` computes to 20px; `reserve-groups`/`reserve-events` unaffected.
- [x] `#shell .screen[data-page="reserve-cats"] .cat-name{font-size:20px}` added after the `.evcat` 30px rule.
- [x] Probe: `reserve-cats` computes 20px, `reserve-groups` still computes 30px; base `.cat-name` untouched.

#### T25 — `restaurants-pager` `bev-toggle` equal spacing + 40% inactive opacity (user task) · S — ✅ **DONE 2026-10-31**
**Files:** `index.html` CSS `.bev-toggle*` `:315-324`; renderer `renderRestaurantsPager` `:5275-5288`.
**Current:** inactive buttons sit at `opacity:.15` (T02) and the first/last buttons are pushed to the edges via `:first-of-type`/`:last-of-type` `justify-content:flex-start/end`, so the four tabs are not evenly spaced.
**Steps**
1. Make all four `.bev-toggle-btn` evenly distributed: remove/neutralise the `:first-of-type`/`:last-of-type` justify overrides so every button uses `justify-content:center` (or set them all to `center`), keeping `flex:1 1 0`.
2. Raise inactive opacity from `.15` to `.4` on this toggle (`opacity:.4` for `.bev-toggle-btn` base; active/`:active` stay `opacity:1`). *(Supersedes T02's 15% requirement for this toggle.)*
3. Keep `aria-selected`, the sliding thumb, and `setBevToggleThumb()` intact (tests `beverages.js`, `bakery-directory.js`).
**Done when** the four tabs have equal gaps/widths and inactive tabs compute `opacity:.4`; active tab `opacity:1`; thumb still tracks.
- [x] `:first-of-type`/`:last-of-type` justify overrides deleted; all four use `justify-content:center`.
- [x] Base `opacity:.4`; `.on`/`:active` stay `opacity:1`.
- [x] Probe: first and last compute `justify-content:center`, inactive `0.4`, active `1`; `setBevToggleThumb()` and `aria-selected` untouched.

#### T26 — `gallery-grid` search button → `search_icon` image (user task) · S — ✅ **DONE 2026-10-31**
**Files:** `index.html` control-bar builder `:6379-6385` (the `openSearch` button); `assets/icons/search_icon.webp`.
**Current:** the search affordance is `<button class="cbtn ic" data-act="openSearch" ...>` rendering the inline `ICON.search` SVG.
**Steps**
1. Replace that button's inner content with an `<img src="assets/icons/search_icon.webp" alt="Search">` (keep `data-act="openSearch"`, `aria-label="Search"`, and the `.cbtn ic` classes so the dispatcher still fires).
2. Size the image to ~18-20px (CSS or inline) and keep it vertically centred in the 40px bar.
3. Verify `openSearch` still opens the search input and `closeSearch` still works.
**Done when** the gallery control bar shows the `search_icon` image instead of the SVG glyph and search open/close still functions.
- [x] Button inner HTML is `<img class="cbtn-ico-img" src="assets/icons/search_icon.webp" alt="Search">`; `data-act`/`aria-label`/`.cbtn ic` kept.
- [x] `.cbtn.ic .cbtn-ico-img{width:18px;height:18px;object-fit:contain;display:block}`.
- [x] Probe: img renders at 18×18, `openSearch` opens `#gsearch`, `closeSearch` closes it; `assets/icons/search_icon.webp` committed.

#### T27 — Remove promo tag/chip rows (all promos) (user task) · S — ✅ **DONE 2026-10-31**
**Files:** `index.html` — five inline chip-row divs at `:6055`, `:6637` (`featChipRow`), `:6996`, `:7001`, `:7058` (all `style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px"`).
**Current:** every promo/event card renders a row of `.chip` tags (price/was/save, category/subtype, venue/time/sponsor, featured-event chips) inside that div.
**Steps**
1. Remove the chip-row `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">...</div>` (and its `.chip` children) from all five sites, including the `featChipRow` helper (delete the helper or make it return `""`).
2. Keep the rest of each card (title, meta, description, includes, gallery/links, CTA) intact; tidy any now-orphaned spacing.
3. Confirm no other `.chip` usage breaks (chips may still be used elsewhere).
**Done when** grep for `display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px` returns 0 in `index.html`; promo/event cards still render with title + body; no JS errors.
- [x] All four inline chip rows removed (restaurant promo detail, promos-feed detail, event lineup detail) — 0 hits for the flex/gap signature.
- [x] `featChipRow` no longer emits `.chip` spans: the featured-event **Ticketing & Outlets / Sponsors & Partners / Tags** lists render as plain `.ctr` rows, so the content and `smoke.js` assertions survive (deviation from the brief's "return `\"\"`" — deleting them would drop real event info).
- [x] Probe: featured card + promo detail contain no `<span class="chip`; `node tests/smoke.js` PASSED.

#### T28 — `gallery-grid` `gal-cell` full-height (not square) (user task) · S/M — ✅ **DONE 2026-10-31**
**Files:** `index.html` CSS `.gal-grid`/`.gal-cell` `:395-398`; renderer `renderGalleryGrid` `:8335-8351` and `galleryLoadMore` `:8352-8368`.
**Current:** `.gal-cell{aspect-ratio:1;...}` forces every thumbnail to a square, cropping tall images.
**Steps**
1. Drop the square constraint: remove `aspect-ratio:1` from `.gal-cell` (and the matching `height:100%` crop on `.gal-cell>img`), so each cell sizes to the image's natural aspect ratio (full height visible). Keep `object-fit:cover` only if a max-height is desired; otherwise use `object-fit:contain`/natural height.
2. Keep the grid at 3 columns: `.gal-grid{grid-template-columns:repeat(3,1fr)}` unchanged.
3. Keep infinite scroll working: `IntersectionObserver` sentinel + `galleryLoadMore` (30 per chunk) unchanged; verify `armGalleryScroll` still arms after the layout change.
4. Add a reasonable `max-height` (e.g. 40vh) and `overflow:hidden` so a single very tall image cannot blow up the grid, while still showing full height up to that cap.
**Done when** thumbnails are no longer squares, images show full height, grid stays 3-across, infinite scroll still loads more chunks, no layout overflow at 360px.
- [x] `aspect-ratio:1` removed; `.gal-cell` gets `max-height:40vh` + `overflow:hidden`; `img` is `height:auto;max-height:40vh`.
- [x] `.gal-grid` stays `repeat(3,1fr)` and gets `align-items:start` so a shorter image does not stretch its cell.
- [x] Probe: no square ratio, 40vh cap on cell and img, img `height:auto`, grid rule unchanged; `tests/customer.js` (gallery load-more/infinite scroll) PASSED.
- [ ] Device pass at 360px — **needs a device pass** (jsdom does not lay out).


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

> **Corrected 2026-11-01 (B2).** The original helper only looked for the rule
> **inline in the page**, so it reported the 9 admin manager pages as failures
> even though they hide the bar through `assets/eatouts-manager.css:34-35`.
> A gate that can never be green is worse than no gate — the helper now resolves
> linked `assets/*.css` too. Likewise the old `align-items:flex-end` scan caught
> badge/checkbox flex columns; it is now scoped to popup selectors.

```powershell
# 1. pages where neither the page NOR its linked CSS hides the scrollbar
Get-ChildItem -Filter *.html -File | Where-Object {
  $h    = Get-Content -Raw $_
  $css  = @([regex]::Matches($h,'href="(assets/[^"]+\.css)"') | ForEach-Object { $_.Groups[1].Value })
  $hides = ($h -match 'scrollbar-width:\s*none') -or
           (@($css | Where-Object { (Get-Content -Raw $_) -match 'scrollbar-width:\s*none' }).Count -gt 0)
  -not $hides
} | Select-Object -ExpandProperty Name          # must print nothing

# 2. bottom-attached popups (scrim/panel anchored to the bottom edge)
Get-ChildItem -Filter *.html -File |
  Select-String -Pattern '(modal-backdrop|fpop)[^}]*align-items:\s*flex-end' |
  Select-Object Filename, LineNumber            # must print nothing

# 3. leftover close buttons / indicators
Get-ChildItem -Filter *.html -File | Select-String -Pattern 'fpop-close|class="chev"|cat-chev|▾|▸'
                                                # must print nothing

# 4. ADVISORY ONLY — squared top corners = possible bottom sheet.
#    Expected to be noisy: toasts, `.action-bar` and page `.sheet` backgrounds
#    also match. Triage only `.modal` / `.fpop` / `*-panel` hits. After T12
#    (2026-11-02) that triage returns ZERO live hits repo-wide: `.menu-page-panel`
#    and `.flyer-menu-panel` were the last two (both now 420px / 80dvh / 16px).
#    `customer-delivery.html .drp-search` is a search input, not a popup — keep.
Get-ChildItem -Filter *.html -File | Select-String -Pattern 'border-radius:[^;}]{1,24}\s0\s0[;}]' |
  Select-Object Filename, LineNumber
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

### 6a. T21 — current seed → §6 mapping (prepared 2026-11-01)

`js/eatouts-services-seed.js` holds **29** services in 8 categories; §6 wants **24**. The renames/merges/removals are listed here so the seed edit is a lookup, not a judgement call.

| Seed id | Now | §6 # | Becomes | Action |
|---|---|---|---|---|
| `svc_brand_kit` | Brand Kit P350 | 1 | Brand Kit P350 | keep |
| `svc_brand_kit_plus` | Brand Kit Plus P500 | 2 | Brand Kit Plus P500 | keep |
| `svc_brand_guidelines` | Brand Guidelines P900 | 3 | Brand Guidelines **P2,500** | price |
| `svc_promo_single` | Single promo card P80 | 4 | Simple Promo Card (Single Event Flyer) **P120** | rename + price |
| `svc_event_flyer` | Single event flyer P120 | 4 | — | merge into #4 |
| `svc_print_poster` | Poster (A2/A1) P240 | 5 | Promo Print Poster (A5 + A1) **P200** | rename + price |
| `svc_promo_pack5` | Pack of 5 promo cards P300 | 6 | Promo Pack A (5 Promo Cards) **P500** | rename + price |
| `svc_promo_pack10` | Pack of 10 promo cards P550 | 7 | Promo Pack B (10 Promo Cards) **P800** | rename + price |
| `svc_story_pack10` | Story pack (10 stories) P450 | 8-10 | Story Pack A P400 · B P600 · C P900 | 1 → 3 new |
| `svc_event_pack` | Event pack P280 | 11 | Event Pack **P300** | rename + price |
| `svc_menu_full` | Full menu design P700 | 12 | Menu Design A (no print PDF) P700 | rename |
| `svc_menu_photo` | Menu + photo layout P1200 | 13 | Menu Design B (with print PDF) P1,200 | rename |
| — | — | 14 | Menu Design C (print PDF + photoshoot) **P2,000** | new |
| `svc_print_cards` | Business cards P200 | 15 | Business Cards P200 | keep |
| `svc_print_shopfront` | Shopfront sign design P800 | 16 | Shopfront Sign Design P800 | keep |
| `svc_print_vehicle` | Vehicle wrap P1500 | 17 | Vehicle Wrap P1,500 | keep |
| `svc_social_monthly` | Monthly social pack P1200 | 18 | Monthly Social Pack P1,200 | keep |
| `svc_pack_bag` | Takeaway bag design P500 | 19 | Takeaway Bag Design P500 | keep |
| `svc_pack_system` | Full packaging system **P1800** | 20 | Full Packaging Design **P550** | ⚠️ **D8 conflict — confirm** |
| `svc_motion_promo` | Animated promo (5-10s) P400 | 21 | Animated Promo (5-10s) **P200** | price |
| — | — | 22-23 | Animated Promo Pack A P500 · Pack B P1,000 | 2 new |
| `svc_motion_logo` | Logo animation P500 | 24 | Logo Animation (5-10s) P500 | keep |
| `svc_logo_cleanup` | Logo clean-up P250 | — | — | **remove** (not in §6) |
| `svc_promo_retainer` | Monthly promo retainer P500 | — | — | **remove** (not in §6) |
| `svc_event_programme` | Event programme / brochure P350 | — | — | ⚠️ no §6 home — confirm |
| `svc_menu_refresh` | Menu refresh P400 | — | — | ⚠️ no §6 home — confirm |
| `svc_print_flyer_a5` | A5 flyer P180 | — | — | **remove** (§6 "Removed") |
| `svc_print_table_tent` | Table tent / menu stand P220 | — | — | **remove** (§6 "Removed") |
| `svc_social_weekly` | Weekly social pack P350 | — | — | **remove** (§6 "Removed") |
| `svc_social_banners` | Profile banner set P280 | — | — | **remove** (§6 "Removed") |
| `svc_motion_teaser` | Event teaser reel P800 | — | — | **remove** (§6 "Removed") |
| `svc_motion_social` | Full social video P1200 | — | — | **remove** (not in §6) |

**Tests that move with the seed:** `tests/designer-services.js:57` asserts `cards.length === 30` (the page renders one more card than the seed's 29 — confirm during the build) and `:66` asserts the first service is `Logo clean-up`. Both must become 24 and the new #1.

---

## 7. Open decisions (need your answer before the affected task)

**Resolved**
- **D3 — 90px thumbs:** closed 2026-10-30 (G4). Applies to list/card thumbs; galleries keep their layout sizes; `sup-profile-avatar` / `prompt-thumb` are 150px; carousels and mosaics untouched.
- **D10 — T09 cart:** closed 2026-11-01 by option **A** — the cart persists under `eatouts_cart_v1`, mirrored on every mutation and hydrated on boot (`index.html:3983-3989`; also read by `venue-about.html:1605`).
- **D1 — popup close:** the beige circular `.fpop-close` is removed; a **plain `X` glyph** (`.fpop-x`, transparent, no circle) may remain, and outside-tap / `Escape` always closes.
- **D2 — catalogue count:** the **24 listed offers** are authoritative (see §6).
- **D4 — orders page:** create a **new `Orders-List.html`**, reusing the existing summaries store in `js/eatouts-customer.js`.
- **D5 — orders group detail:** closed 2026-11-01 by the T06 build. An Order Group is the venue section on `Orders-List.html` that lists its summaries, and tapping a summary opens `eatouts-checkout-summary.html?id=<summary id>`. No separate group screen was added.
- **D9 — T15 headers:** closed by execution 2026-10-31 — all 7 onboarding pages were converted to the light standard header (see T15).
- **D7 — Botswana WhatsApp Channel:** closed 2026-11-01 — **no channel exists yet.** The coming-soon popup is the intended shipped state; `WHATSAPP_CHANNELS.BW` stays empty until the channel is created, then a one-line edit turns the row into a live link.

**Still open**

| ID | Task | Question | Recommended default |
|---|---|---|---|
| **D6** | T18 | The brief says only "activate" under `eatouts-suppliers` — activate what? | The page's save/publish flow (currently gated). |
| **D8** | T21 | Prices missing for 8 offers (see §6 "confirm"). One conflict: §6 says keep **P550** for Full Packaging Design but the seed has **P1800**; §6 also has no home for Menu refresh (P400) and Event programme (P350). | Keep current prices, set Packaging to **P550**, drop Menu refresh + Event programme. |

---

## 8. Progress log

| Date | ID | Status | Files touched | Verification | Commit |
|---|---|---|---|---|---|
| 2026-10-29 | — | PLAN | `PLATFORM UPDATE TASKS.md` | n/a | (this commit) |
| 2026-10-29 | G1 | DONE | 48 root `*.html`, `assets/eatouts-manager.css`, `eatouts-login.html`, `operator-businesses.html` | `html-catalog` ✔ · `appshell` ✔ · `smoke` ✔ · `inventory` ✔ (81 pre-existing warnings) · 0 pages without a scrollbar rule | `9f040e4` |
| 2026-10-30 | G2 | DONE | `eatout_event_builder.html`, `eatouts-suppliers.html`, `intake.html`, `get-started.html` | `builder-preview` PASSED, `intake8` PASSED, grep for chevrons and content:"+" returns 0 in app files | `8d4f1a3` |
| 2026-10-30 | G3 | DONE | 17 pages (sheets/modals centred, `.fpop-x`), `tests/builder-suppliers.js` | `popups` PASSED, `builder-suppliers` PASSED, `builder-preview` PASSED, `intake8` PASSED, `delivery` PASSED, `checkout-delivery` PASSED, `about` PASSED, `venue-about-options` PASSED, `html-catalog` PASSED, `appshell` PASSED, `smoke` PASSED; 0 `.fpop-close` outside `dist/` | `1352a26` |
| 2026-10-30 | G4 | DONE | 19 pages (list/card thumbs 90px, `sup-profile-avatar` + `prompt-thumb` 150px) | 38 suites PASSED (incl. `html-catalog`, `inventory`, `smoke`, `appshell`, all `builder-*`, `beverages`, `blog`, `designer-services`, `venue-about-*`, `business-*`, `onboarding-bridge`); no sub-90 thumb left outside `_archive_local`/`dist`/`staging` | `7b90571` |
| 2026-10-30 | G5 | DONE | `HTML_CATALOG.md` (regenerated), `PLATFORM UPDATE TASKS.md` (G4 hash filled in) | `npm run catalog` → 69 pages / 1093 lines; `html-catalog` PASSED (9 checks, 69 pages); `npm run inventory` PASSED (10 checks, 87 warnings — 86 pre-existing stale line refs, accepted as baseline); all 58 suites PASSED in 4 batches | (this commit) |
| 2026-10-30 | T01 | DONE | `index.html` (new `.pmeta` class + scoped 16px block after `.ecard`), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 18/18 (`#shell.promos-tab` body copy = 16px, off-tab 12/15/11px unchanged, `h3` 17px); 14 suites PASSED, 0 failures (`smoke`, `checks`, `promocats`, `popups`, `appshell`, `customer`, `gallery`, `restloc`, `money`, `contracts`, `router`, `content`, `age-gate`, `beverages`); `html-catalog` PASSED · `inventory` PASSED (87 warnings). Not verified: 360px device pass | (this commit) |
| 2026-10-30 | T10 | DONE | `index.html` (`renderReserveCats` — inline `margin-top` removed), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 6/6 (`.phead` margin-top 0, padding-top 20px, first child of `.scroll`); 12 suites PASSED, 0 failures (`customer`, `checks`, `smoke`, `appshell`, `popups`, `contracts`, `money`, `promocats`, `gallery`, `restloc`, `router`, `field`); `html-catalog` PASSED · `inventory` PASSED (87 warnings) | (this commit) |

| 2026-10-30 | T19 | DONE | `index.html` (`.legal-sec`/`.legal-para` → 16px), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 7/7 (`.legal-sec` 16px/1.45, `.legal-para` 16px/1.6, renderer still emits both classes, no 13px legal rule, global scrollbar still hidden); 6 suites PASSED, 0 failures (`customer`, `checks`, `smoke`, `content`, `about`, `appshell`); `html-catalog` PASSED · `inventory` PASSED (87 warnings) | (this commit) |

| 2026-10-30 | T02 | DONE | `index.html` (`.bev-toggle-thumb` transparent, `.bev-toggle-btn` 500 weight + `.15` opacity), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 8/8 (thumb transparent, inactive `.15`/`500`, active `1`/`700`, `.on` + `aria-selected` intact); 6 suites PASSED, 0 failures (`beverages`, `bakery-directory`, `customer`, `checks`, `smoke`, `appshell`); `html-catalog` PASSED · `inventory` PASSED (87 warnings) | (this commit) |

| 2026-10-30 | T14 | DONE | `eatouts-business-signup.html` (standard `#hdr` + logo button, old `.appbar`/`.dot` rules removed), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 12/12 (single `#hdr`, `data-act`, `type=button`, `aria-label`, logo src/alt + file present, `.hdr-chip` `display:none`, no `.appbar`/`.dot` left); 8 suites PASSED, 0 failures (`business-auth`, `business-profiles`, `api-auth-flow`, `onboarding-bridge`, `customer`, `about`, `smoke`, `appshell`); `html-catalog` PASSED · `inventory` PASSED (87 warnings) | (this commit) |

| 2026-10-30 | T20 | DONE | `operator-businesses.html` (standard `#hdr`, body `h1` "My businesses", white `theme-color`, old `.topbar` rules removed), `HTML_CATALOG.md` (regenerated) | ad-hoc jsdom probe 15/15 (single `#hdr`, logo + hidden chip, one `h1` in `.page-head`, header has no heading, no `.topbar`/`.brand-*` rules); 8 suites PASSED, 0 failures (`login`, `business-auth`, `business-profiles`, `customer`, `smoke`, `appshell`, `checks`, `api-business`); `html-catalog` PASSED · `inventory` PASSED (87 warnings) | (this commit) |
| 2026-10-31 | T17 | DONE | `eatouts-blog.html`, `js/eatouts-blog.js`, `tests/blog.js` (tag-strip test → absence check), `HTML_PAGES.md`, `HTML_ASSESSMENT.md`, `PAGE_INVENTORY.md`, `scripts/html_catalog.meta.json`, `HTML_CATALOG.md` | `tests/blog.js` 23/23 PASSED; `npm run catalog` ✔ · `npm run inventory` ✔ · full `npm test` ✔; grep for `hdr-chip`/`hdr-back`/`tl-card-*`/`post-tags`/`copyLink`/`blk-heading`/`tag-strip` = 0 | (this commit) |
| 2026-10-31 | T23 | DONE | `index.html` `.cal` background `rgba(0,0,0,.03)` | ad-hoc jsdom probe (25 checks, phase 6 batch) — `.cal` computes `rgba(0, 0, 0, 0.03)`; promo-focus hide rule intact; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T24 | DONE | `index.html` `#shell .screen[data-page="reserve-cats"] .cat-name{font-size:20px}` | probe — reserve-cats 20px, reserve-groups 30px; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T25 | DONE | `index.html` `.bev-toggle-btn` `opacity:.4`, `:first-of-type`/`:last-of-type` justify overrides deleted | probe — four buttons, first/last `justify-content:center`, inactive `0.4`, active `1`; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T26 | DONE | `index.html` search button → `<img class="cbtn-ico-img" src="assets/icons/search_icon.webp">` + `.cbtn.ic .cbtn-ico-img` rule, `assets/icons/search_icon.webp` (new) | probe — img 18×18, `openSearch`/`closeSearch` still work; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T27 | DONE | `index.html` four chip rows removed; `featChipRow` now emits plain `.ctr` rows (content kept) | probe — 0 hits for the flex/gap signature, no `.chip` in featured card or promo detail; `tests/smoke.js` PASSED; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T28 | DONE | `index.html` `.gal-cell` no `aspect-ratio`, `max-height:40vh`, `img height:auto`, `.gal-grid{align-items:start}` | probe — cell/img capped at 40vh, img height auto, grid `repeat(3,1fr)`; `tests/customer.js` infinite scroll PASSED; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T15 | DONE | 7 pages — `restaurant-onboarding.html`, `caterer-onboarding.html`, `bakery-onboarding.html`, `bottle-store-onboarding.html`, `mobile-kitchen-onboarding.html`, `supplier-onboarding.html`, `eatouts-login.html` (standard `#hdr`, no `.topbar`/`.draft-pill`, light `.progress-strip`, document lock) | static probe 15/15 × 6 + login; jsdom runtime probe 62/62 (0 window errors); `tests/appshell.js` merchant asserts PASSED; full `npm test` 58/58 | (this commit) |
| 2026-10-31 | T03 | DONE | `index.html` — `syncRestAccordions` now sets `.scroll.has-open` + `body.ritem-locked` and centres the opened row; CSS `.scroll.has-open .ritem:not(.open){opacity:.25;pointer-events:none}` and `body.ritem-locked .scroll{overflow:hidden;touch-action:none}`; `render()` re-derives the state | probe 23/23 (open/close/restore/reopen/navigate-away); full `npm test` 58/58; `npm run inventory` PASSED (79 warnings) | (this commit) |
| 2026-10-31 | T07 | DONE (partial) | `index.html` — shared `renderFilterBar()` (search row + Town \| Area \| Cuisine/Type) for food + bottle stores; `state.restQuery` + `#restSearch` live filtering; 16px centred `.cbtn`; `.loc-all .loc-count` removed (6 rows); `.town-scroll` scrollbar hidden; `.az-rail` `rgba(0,0,0,.03)`; `tests/beverages.js` updated to the new spec | probe 30/30 (builder, labels, search narrow/empty/clear, town badges, bottle + gallery All rows, no window errors); full `npm test` 58/58; `npm run inventory` PASSED (79 warnings) | (this commit) |
| 2026-10-31 | T04 | DONE | `index.html` — `.osum-card` Order Summary Card (90px logo, live "N items for P#"), single `Order Summary` crumb, `.co-steprow`, 3% grey `.pad`/`.scroll`, live `[data-cototal]` patched by `syncCart()`, `.co-dl` delivery line, `saveSummary` / `deleteSummary`, `openSplit` + Save gated on `aboutUser()` via `summarySignup()`, **new screen** `venue-checkout-review` (`renderCheckoutReview()`, banner + `PAGE_TITLES` + `pageRef`), `.co-wa-row` with **WhatsApp Review**, `waOrder` → floating recipient popup (`waSendVenue` / `waSendContact`); `tests/checkout-delivery.js` (+5 checks); `PAGE_INVENTORY.md`, `FEATURES.md` | full `npm test` 58/58 (`checkout-delivery` 5 new checks PASSED); `npm run inventory` PASSED (19 checks, 31 screens); `npm run catalog` ✔ | (this commit) |

| 2026-10-31 | T08 | DONE (SPA half) | `index.html` — Back History: `eatouts.history.v1` in `sessionStorage` (newest first, deduped by screen key, capped at 5), `recordHistory()` called from `render()`, whitelisted state snapshot per entry, centred `.hist-wrap`/`.hist-pop` dialog (scrim, no `.fpop-close`, empty state), logo tap now `openBackHistory()` instead of the old home reset, `data-act="gotoHistory"` restores the SPA screen | probe 25/25 (boot entry, tab + venue-view recording, labels, relative time, open/restore/scrim-close, 5-entry cap, dedupe, empty state, no window errors); full `npm test` 58/58; `npm run inventory` PASSED (79 warnings); `npm run catalog` 69 pages/1,098 lines | (this commit) |

| 2026-11-01 | T16 | DONE (closed by D7) | `PLATFORM UPDATE TASKS.md` only — code shipped in `6fb0e52` | D7 resolved: **no WhatsApp channel exists yet**, so the coming-soon popup is the intended shipped state. `tests/about.js` already asserts both branches | (this commit) |
| 2026-11-01 | B1 | DONE | `bakery-`, `bottle-store-`, `mobile-kitchen-`, `restaurant-`, `supplier-onboarding.html` — `.modal-backdrop` `align-items:flex-end` → `center` + `padding:20px`, `.modal` `max-width:420px`, `max-height:80dvh`, `border-radius:9px` (no more `9px 9px 0 0`), desktop `90dvh` override aligned to `80dvh` | audit 2 (`(modal-backdrop\|fpop)…flex-end`) prints nothing; full `npm test` **60 passed, 0 failed** | (this commit) |
| 2026-11-01 | B2 | DONE | `PLATFORM UPDATE TASKS.md` §5 — audit 1 now resolves linked `assets/*.css` (was reporting 9 false positives on the manager pages, which hide the bar via `eatouts-manager.css:34-35`); audit 2 scoped to popup selectors; audit 4 added as advisory | audit 1 prints nothing (verified); audits 2 + 3 print nothing; audit 4 → ~30 advisory hits, live ones owned by T05/T12 | (this commit) |
| 2026-11-01 | T05 | DONE | `customer-delivery.html` — `.hdr-chip` gone; `.osum-back` deleted and `.osum-tot`/`.osum-items` joined in one centred `.osum-line`; `.acc` = 3% grey panel with a 5% `.acc-title` when open; method gate (`accClass()` `.locked` + `#fpop`/`#fpopScrim` "Choose a delivery method first"); `area`/`propType`/`bank` open a fixed `.drp-list.open.float` over a scrim; centred `.hint.centre`; `.gps-btn` attaches the current location; real `.seg` me/someone-else toggle + `.rcpt-card` history + `#fpop` recipient viewer (Add image / Edit details / Delete) + photo-mandatory new-recipient form with a 150px `.rcpt-hero`; `.acc-val` shows the chosen bank; `#reviewPage` full-page review with Edit + Delete; "WhatsApp Request" label removed; `barPrimary` = "Add P#.## to P#.## for # items" → `index.html?resume=1#restaurants`; `tests/customer-delivery.js` (new, 52 checks); `tests/checkout-delivery.js` bar assertions re-pointed | `node tests/customer-delivery.js` PASSED (52 checks) · `node tests/checkout-delivery.js` PASSED · `npm test` **61 passed, 0 failed** · `npm run inventory` 10 checks / 90 warnings · `npm run catalog` 70 pages | `eface0b` |
| 2026-11-01 | T09 | DONE | `index.html` (D10 cart persist/hydrate, `window.EO_cart`, badge), `venue-about.html` (`.promo-thumb.is-branded` + `.plb-*` gallery CSS, lightbox markup, promo feed → tiles → Add to Order JS), `tests/customer.js` (+22 D10 checks), `tests/venue-about-options.js` (+26 T09 checks) | `customer` PASSED (`window errors: 0`); `venue-about-options` PASSED (26 new T09 checks: tiles, dots, swipe both ways, dot jump, CTA beneath image, one-line cart write, re-tap increments, envelope, toast, outside-tap + Escape, branded fallback); full `npm test` **60 passed, 0 failed**; audits 1/2/3 print nothing | `c1e6286` + this commit |
| 2026-11-02 | T07 | DONE (closed) | `PLATFORM UPDATE TASKS.md` + the missing coverage — **no source change needed**: the shared `renderFilterBar()` was already wired for catering `:6785-6809` and bakery `:6811-6835` in the 10-31 commit (stale "blocked on data" note retracted; catering types come from `cateringTypeNames()`, bakery types from `window.BAKERY_TYPES`). Added the permanent assertions the 10-31 note wrongly assumed were impossible: `tests/catering-directory.js` (+12, new index.html jsdom probe) and `tests/bakery-directory.js` (+10) | `node tests/catering-directory.js` PASSED (bar hidden → 2nd nav tap opens → 3rd closes, `#cateringSearch`, centred Town\|Area\|Cuisines, cuisine list non-empty, live search) · `node tests/bakery-directory.js` **42/42** (same for `#bakerySearch` + `window.BAKERY_TYPES`) · full `npm test` **64 passed, 0 failed** | 6e41887 + this commit |
| 2026-11-02 | T22 (step 1) | IN PROGRESS | `SYNC REGION TASK/countries-data.js`, `territories.js`, `territory-registry.js`, `countries_mobile_networks.js` → `js/`; `SYNC REGION TASK/Country-Flag-Icons/*.png` (256) → `assets/flags/`; `PLATFORM UPDATE TASKS.md` | `git status` shows 260 renames with no deletions; 0 hits for `SYNC REGION TASK/` in `*.html`/`*.mjs`/`*.js`; `copy-static.mjs` already copies `js` + `assets` wholesale (no edit needed); `npm test` **64 passed, 0 failed** | (this commit) |
| 2026-11-02 | T22 (steps 1, 2, 5, 6) | IN PROGRESS | `EatOuts-Region.html` (new, 204 lines); `SYNC REGION TASK/eatouts-region-selector.html` deleted (copy kept in gitignored `_trash/`); `tests/region-selector.js` (new); `tests/run-all.js`; `tests/back-history.js` (55 → 56 brand-mark pages); `copy-static.mjs`; `scripts/html_catalog.meta.json` (page 72 + changelog); `PAGE_INVENTORY.md` (§K Regions); `HTML_PAGES.md`; `HTML_CATALOG.md` (regenerated) | `node tests/region-selector.js` **45/45** (markers + `data-page`, standard header/nav, five rows in registry order, BW `aria-pressed`, every flag file on disk, search by name/code/no-match/cleared, card 420px/16px/80dvh with plain `×` and no `.fpop-close`, four close routes, `eatouts.region.v1` written, registry API + stale-code fallbacks, 0 window errors) · `node tests/back-history.js` **29/29** · `node tests/inventory.js` PASSED (21 checks, 72 pages) · `node tests/html-catalog.js` PASSED (9 checks, 72 pages) · `npm run catalog` 72 pages / 1,147 lines · `npm run inventory` 72 files · full `npm test` **65 passed, 0 failed** | (this commit) |
| 2026-11-02 | T22 (step 4) | IN PROGRESS | `index.html` — `regionName` in `renderAbout()` + `<a class="setrow" href="EatOuts-Region.html">` as the first Settings row, above "About EatOuts"; `js/eatouts-regions.js` script tag after `js/eatouts-analytics.js`; `tests/about.js` (+5 checks); `PLATFORM UPDATE TASKS.md` | `node tests/about.js` PASSED (region row present / labelled "Botswana" / directly above About EatOuts / Settings-level not inside List Business / registry script loaded) · full `npm test` **65 passed, 0 failed** | (this commit) |
| 2026-11-02 | T12.3 | DONE | `eatout_event_builder.html` — `.prompt-panel` → G3 floating (420px / 16px / 80dvh / scrollable body), new `.sec-sep`, `.rm` de-circled (audience, tier, note), Event Rules inline margin replaced by the divider | probe 18/18 (2 separators in place, prompt inside `.fpop-scrim` with 420px/16px/80dvh/`overflow-y:auto`, `.fpop-x` transparent, `.rm` transparent + borderless + non-circular + non-red, 0 window errors); `builder-audience` · `builder-guests` · `builder-preview` · `builder-schedule` · `builder-suppliers` all PASSED; full `npm test` pending in the same push | (this commit) |
| 2026-11-02 | T12.2 | DONE | `eatout_event_builder.html` — `.chip-row.eq`, `.schedule-day` accordion (`STATE.dayCollapsed`, `toggleDayOpen`), Year/Month/Day + Hour/Minute `.dt-btn` rows replacing the native date/time inputs, new floating scroll-list picker (`renderSchedulePicker`, `STATE.schedulePicker`, `.sp-opt`), `daysInMonth`/`clampDate` maths | probe 44/44 (chips grid + centred, collapse/expand + `display:none`, 3+2 button rows, 13 years / 12 months / 29 vs 28 February days, 31→29→28 clamping, 24 hours / 60 minutes, `09:30` stored, scrim close, per-day independence, no native date/time inputs left, 0 window errors); `builder-schedule` · `builder-preview` · `builder-audience` · `builder-guests` · `builder-suppliers` all PASSED; full `npm test` in the same push | (this commit) |
| 2026-11-02 | T12.4 | DONE | `eatout_event_builder.html` — search pinned under the supplier list (`.fpop-search.is-foot`), profile panel 420px/80dvh/16px, `.sup-profile-loc` 16px, name → new `Service Provider Info` popup (`renderSupInfo`), avatar + `.pit-thumb` → new full-image gallery (`renderImageGallery`, feint black backdrop, dots above, caption below, outside tap closes), `.pit-card` `90px 1fr` grid with a new `.pit-foot` row (cost left, stepper right), centred `−`/`+` | probe 40/40 (popup child order, is-foot rule, plain X, panel 420/80dvh/16px, 150px avatar, 16px loc, 90px thumbs, grid columns, foot row + left cost + right stepper + centred buttons, info popup anatomy, gallery backdrop `rgba(0,0,0,.55)` with dots above / caption below, both galleries open + close, profile stays open behind the gallery, 0 window errors); `builder-suppliers` · `builder-preview` · `builder-guests` PASSED | (this commit) |
| 2026-11-02 | T12.2 + T12.3 | DONE (coverage) | `tests/builder-schedule.js` 25 → 64 checks, `tests/builder-audience.js` 24 → 31 — permanent jsdom coverage for the Year/Month/Day + Hour/Minute pickers, the `.schedule-day` accordion, month-length clamping, `.chip-row.eq`, the `.sec-sep` dividers and `.rm` de-circling. **No implementation change was needed** — every new assertion passed on the first run | `builder-schedule` 64/64 PASSED · `builder-audience` 31/31 PASSED · full `npm test` **64 passed, 0 failed** | `1eacec8` |
| 2026-11-02 | T12.4 | DONE (coverage) | `tests/builder-suppliers.js` 49 → 87 checks — `.fpop-search.is-foot` pinning, profile panel 420px/80dvh/16px, 150px avatar, 16px location, 90px `.pit-thumb`, `.pit-card` 90px/1fr grid + `.pit-foot` (cost left, stepper right, centred buttons), Service Provider Info popup, full-image gallery (feint backdrop, dots above, caption below, outside tap) and "profile stays open behind the gallery". **No implementation change was needed** | `builder-suppliers` 87/87 PASSED · `builder-preview` + `builder-guests` PASSED · full `npm test` **64 passed, 0 failed** | `386021f` |
| 2026-11-02 | T12 (overlays) | DONE | `eatout_event_builder.html` — `:463-466` `.menu-page-panel` and `:727-730` `.flyer-menu-panel` were the last two bottom sheets in the file (up to 460px wide, `94vh`/`88vh` tall, `border-radius:20px 20px 0 0`). Both now use the `.fpop` recipe — `max-width:420px`, `max-height:80dvh`, `border-radius:16px` — and their stale `@media(min-width:520px)` overrides are gone. Both already rendered inside the centred `.fpop-scrim`, so the geometry was the only thing standing in the way. `tests/builder-preview.js` +24 checks; `PLATFORM UPDATE TASKS.md` (T12 "Global overlays" block, §5 audit #4 baseline) | rule assertions for both panels (420px / 80dvh / 16px / no fixed viewport height / no `0 0` corners); flyer menu opens inside `.fpop-scrim`, keeps 16px corners + a plain `X`, closes on an outside tap; provider menu opens inside the same scrim; §5 audit #2 and #3 print nothing and audit #4 triage (`.modal` / `.fpop` / `*-panel`) now prints **nothing** repo-wide; `builder-preview` PASSED; full `npm test` **64 passed, 0 failed**; `npm run inventory` PASSED (10 checks, 90 warnings) | (this commit) |
| 2026-11-02 | docs | DONE | `PLATFORM UPDATE TASKS.md` — T08 / T08b / T06 headings and queue row 11b marked DONE; G1's four done-when boxes triaged (3 ticked on evidence, the A–Z rail box reworded because the shipped rail hides its scrollbar and does not scroll); D3 + D10 moved to **Resolved**; the ten blank log rows replaced by the two real coverage rows above; §5 audit #4 baseline updated | G1 box 1 + 2 re-verified by running §5 audit #1 (prints nothing); D10 confirmed implemented at `index.html:3983-3989`; no code touched | (this commit) |
| 2026-11-02 | T12.7 + T12.8 | DONE (coverage) | `tests/builder-guests.js` 33 → 55 checks — a new `floatingCard()` helper asserts the G3 contract once per prompt, then proves the **RSVP prompt** (`addRsvp` → `renderPrompt` `:3301-3316`) and the **Event Links icon picker** (`openLinkPicker` → `renderLinkPicker` `:3334-3340`) are that same card: inside a centred `.fpop-scrim`, computed 420px / 16px, a plain transparent `×` in `.fpop-hdr`, **zero** `.fpop-close` in the document, and each closing via the `X`, an outside tap and `Escape`. **No implementation change was needed** — 12.3 already floated both, so these are verify-only commits per the delegation pack | `node tests/builder-guests.js` PASSED — 22 new checks green on the first run (4 shared-contract + 7 prompt-specific checks, run once per prompt) | (this commit) |



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
