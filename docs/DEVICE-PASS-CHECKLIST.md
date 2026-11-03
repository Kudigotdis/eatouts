# Device-Pass Checklist (visual QA)

**Why this file exists.** Every test in `tests/` runs under `jsdom`, which does
no layout: it cannot tell you that a row overflows at 360px, that a sheet is
cropped, or that a sticky bar sits over the home indicator. So any done-when box
that says *no horizontal scroll*, *centres*, *does not clip* or *looks right* is
left unticked in `PLATFORM UPDATE TASKS.md`. This document is the single
walkthrough that closes those boxes.

**Status:** created 2026-11-03, **not yet run** (no row in the sign-off table).

---

## How to run it

1. `npm run preview` — builds `dist/` then serves it with `wrangler pages dev dist`.
   Use this, not `file://`, so `js/` and `assets/` resolve exactly as deployed.
2. Chrome DevTools → **Toggle device toolbar** → pick the width, then **reload**.
   Do not trust a live resize: `100dvh`, `overflow:hidden` and sticky bars settle
   differently after a reload.
3. Widths this project cares about: **360** (small Android), **390** (iPhone
   13/14), **430** (iPhone 15 Pro Max).
4. Then once on real hardware — iOS Safari + Android Chrome, portrait, with the
   browser chrome visible (that is what makes `dvh` interesting).
5. **Pass rule for every screen:** no horizontal scrollbar, no clipped or
   overlapping text, nothing hidden under the bottom nav or the notch, tap
   targets ≥ 44px. Console probe for the first one:

   ```js
   [document.documentElement.scrollWidth, innerWidth]   // scrollWidth <= innerWidth
   ```

6. A failure is **not** a tick: write it under *Failures* at the bottom and fix
   it first.

---

## 1. Promos feed — `index.html` → **Promos** (also tap a promo card for the detail view)

*Box: T01 (line 267)* · widths 360 / 390

- The focused promo view (`.promo-focus`) is 16px body copy and **wraps** — no
  clipped words, no sideways scroll on the chip rows.
- Price / meta / CTA lines sit on the same 16px rhythm; nothing looks like a
  caption any more.
- Leave the Promos tab and confirm the unfocused feed is unchanged (12–15px).
- Scroll the whole feed: the bottom nav never rides up over the last card.

## 2. Restaurant directory + filter bar — `index.html` → **Restaurants**, tap the tab a 2nd time

*Boxes: T07 (line 506) and T03 (line 470)* · widths 360 / 390

- The bar appears on **all four** screens (Restaurants, Catering, Bakeries,
  Beverages) and hides on a 3rd tap.
- Buttons are 16px and centred: `Town | Area | All Cuisines` (or `Type`).
- Type in the search box → the list filters, the empty state appears for a
  nonsense word, and the caret stays in the box across the re-render.
- The A–Z rail is the tinted strip (`rgba(0,0,0,.03)`) with **no visible
  scrollbar**; letters are tappable without wobble.
- Tap a restaurant row on a **long** list: it glides to the centre of the
  screen, every other row dims to 25% and stops responding to taps, the page
  will not scroll while it is open, and closing restores everything.
- Open a row, then switch tabs: no stuck scroll lock.

## 3. Gallery — `index.html` → **Gallery**

*Box: T28 (line 881)* · width 360

- Three cells across; **nothing is a forced square** — a tall photo shows its
  full height up to the 40vh cap instead of being cropped.
- A very tall image does not stretch its row or push the grid sideways.
- Scroll to the bottom: the next chunk of 30 loads by itself, repeatedly.
- The restaurant / town / area filter popups open as floating cards, not sheets.

## 4. Order Summary (checkout) — `index.html` → add an item → **Order Summary**

*Box: T04 (line 542)* · widths 360 / 390 / 430

- The 90px logo card shows the place name and a live "N items for P#.##"; the
  totals move when a quantity changes.
- The Split / Save gating popup and the Delete-Summary confirm are floating
  cards, fully on screen, closable by tapping outside.
- Delivery details line appears once chosen; **WhatsApp Review** opens the
  preview screen and the message reads exactly as sent.
- The sticky action rows never cover the last total.

## 5. Back History popup — tap the **logo** on any SPA tab

*Box: T08 (line 421)* · width 360

- Floating card (not a sheet, not full-screen), soft shadow, blur scrim.
- Up to five rows, even rhythm, relative time right-aligned, no clipped label.
- Outside tap and the `×` both close it; the `×` is plain (no red circle).
- Empty state reads "No recent pages yet."

## 6. Reservations — `index.html` → **Reservations** → Events / Providers / Groups

*Box: T11 (line 338)* · width 390

- Each page head sits directly under the crumb with no gap, on the **2%** grey;
  the crumb above is 4% — you should *just* be able to see the difference.
- Provider rows: every thumbnail is a 90×90 square with rounded corners.
- No other page changed (spot-check Promos + a menu).

## 7. Blog — `eatouts-blog.html`

*Box: T17 (line 358)* · widths 360 / 390 / 430

- Timeline cards render with no tag strip, no footer tags, no `#` glyphs, no
  copy-link button.
- The search box sits at the bottom, directly above the nav, and is **not**
  sticky.
- Search filters the post list; `#tag-…` deep links still land.

## 8. Onboarding pages (7) — `restaurant-`, `caterer-`, `bakery-`,
`bottle-store-`, `mobile-kitchen-`, `supplier-onboarding.html`, `eatouts-login.html`

*Box: T15 (line 378)* · width 360 (+ one real phone)

- White header over the dark `.intro` — contrast is comfortable, no white-on-
  white label.
- The progress strip sits under the header and its text updates as you fill
  steps.
- The merchant `.tabs` strip is dark and its labels are readable on white.
- Login: the page itself never scrolls (no stray document scrollbar).
- Forms still submit / autosave; the 18+ (bottle store) and Secure (login)
  pills are readable on white.

## 9. Header sweep on the densest pages — `Orders-List.html`,
`restaurant-dashboard.html`, `event-onboarding.html`

*Box: T08b (line 453)* · width 360

- Identical `#hdr` on all three: logo left, status chip right, 58px tall.
- No `.topbar` remnant, no double header, no `.hdr-chip`.
- The moved progress strip does not overlap the first card underneath.

## 10. Orders badge + delivery — `Orders-List.html`, `customer-delivery.html`,
`index.html`, `eatouts-login.html`, `operator-businesses.html`

*Box: T06 (line 565)* · widths 360 / 390 / 430

- The counter's number is 13px, light grey, and unclipped next to the icon.
- Hidden for a signed-out (browser) user; reappears after signing in.
- `Orders-List.html`: group headers, 90px thumb on the right, tap opens
  `eatouts-checkout-summary.html?id=…`.
- `customer-delivery.html`: the right-hand slot of the top bar is not colliding
  with the title on the longest step name; the bottom bar label wraps to two
  lines at 360 without clipping.

## 11. Suppliers page — `eatouts-suppliers.html`

*Box: T18 (added 2026-11-03 — was never written down)* · width 360 + real phone

- Step 1: the 150px photo picker and the logo picker both open the **device**
  picker (real phone); the Year/Month/Day popups scroll, and 29 Feb only
  appears on leap years.
- Step 6: the town picker opens the searchable sheet and returns a town; all
  `.chip` rows are equal width on a 3-column grid.
- Gallery step: cells are 3-across, tapping one opens the full-image viewer,
  the `×` still removes.
- No dead step and no export button anywhere; pricing items still read `STEP 3`.

## 12. Region selector + settings row — `EatOuts-Region.html`, then
`index.html` → **About** → Settings

*Box: T22 (added 2026-11-03 — was never written down)* · widths 360 / 390

- Five rows in registry order with flags: Botswana / South Africa / Zimbabwe /
  Malawi / Kenya; Botswana is the selected one.
- The search row filters by name **and** by code (`ZA`), and clears back to all
  five.
- Tapping any other region raises the floating "This region is coming soon."
  card — on screen, closable by `×`, outside tap, Escape and "Got it".
- The Settings row under About reads **Botswana** and sits directly above
  "About EatOuts"; tapping it opens the selector.
- The WhatsApp Channel row still shows the coming-soon notice (no dead link),
  and it reads the same live region the settings row shows.

---

## Sign-off

Tick the matching box in `PLATFORM UPDATE TASKS.md` in the **same commit** as
the row you fill in here.

| # | Screen | Widths | Task box | Result | Date | Device |
|---|---|---|---|---|---|---|
| 1 | Promos feed | 360/390 | T01 :267 | — | — | — |
| 2 | Filter bar + ritem | 360/390 | T07 :506 · T03 :470 | — | — | — |
| 3 | Gallery | 360 | T28 :881 | — | — | — |
| 4 | Order Summary | 360/390/430 | T04 :542 | — | — | — |
| 5 | Back History popup | 360 | T08 :421 | — | — | — |
| 6 | Reservations | 390 | T11 :338 | — | — | — |
| 7 | Blog | 360/390/430 | T17 :358 | — | — | — |
| 8 | Onboarding ×7 | 360 + phone | T15 :378 | — | — | — |
| 9 | Densest-page headers | 360 | T08b :453 | — | — | — |
| 10 | Orders badge + delivery | 360/390/430 | T06 :565 | — | — | — |
| 11 | Suppliers | 360 + phone | T18 :637 | — | — | — |
| 12 | Region selector | 360/390 | T22 :801 | — | — | — |

## Failures

Anything that fails goes here as `- [ ] <screen> @ <width> — <what you saw>`
and blocks the tick until it is fixed and re-checked.

