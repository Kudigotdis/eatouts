# EatOuts — New & Changed Pages to Reach a Sellable, Onboardable Platform

Companion to `HTML_PAGES.md` (what the existing root pages can/cannot do) and
`MARKETING_ONBOARDING_PLAN.md` (the 29-task launch plan). This document lists
every HTML page that must be **built new** or **changed** so the EatOuts team
can start selling and onboarding restaurants, with full specs and acceptance
checks. Paste-ready AI build instructions live in `AI_BUILD_PROMPTS.md`.

> Run everything through **`run-eatouts.bat`** (`http://127.0.0.1`). `file://`
> isolates `localStorage` per page and breaks operator auth.

---

## 0. Summary

**New pages**

| # | File | Audience | Priority | Plan tasks |
|---|---|---|---|---|
| 1 | `get-started.html` | Public (owners) | P0 | C16, B10 |
| 2 | `pricing.html` | Public + sales | P0 | B10 |
| 3 | `intake.html` | Internal (concierge) | P0 | A5, A6 |
| 4 | `partner-terms.html` | Public (partners) | P0 | B13, B14 |
| 5 | `invoice.html` | Internal (sales) | P1 | B11 |
| 6 | `ops-console.html` | Internal (team) | P1 | B11, E27 |
| 7 | `one-pager.html` | Internal/marketing | P2 | C17 |

**Changed pages**

| File | Change | Plan tasks |
|---|---|---|
| `restaurant-dashboard.html` | Add **Export this restaurant**; fix tiers to P100/P300/P500; add setup-fee status | A1, B10 |
| `index.html` | Per-venue WhatsApp routing; "List your restaurant" CTA link | A7, C16 |

**Non-HTML work (for reference, not built here):** directory-generator ingest
(A2), one-command deploy (A3), README fix (B12), video/screenshots (C18/C19),
socials (C20), venue list + outreach templates (C21/C22), cadence/proof/metrics
process (D24–E29).

---

## 1. Gap map (plan → artifact)

| Plan task | Artifact | Type |
|---|---|---|
| A1 Export this restaurant | button in `restaurant-dashboard.html` | edit |
| A2 ingest `owner_submissions/` | `scripts/build_restaurant_directory.py` | script |
| A3 one-command deploy | `.bat` / GitHub Action | script |
| A4 test full publish flow | process + sample venue | process |
| A5 concierge intake form | `intake.html` | new |
| A6 starter template + checklist | `intake.html` (+ seed placeholders) | new/edit |
| A7 per-venue WhatsApp routing | `index.html` | edit |
| A8 phone/https sign-in QA | QA pass | process |
| A9 new-venue consumer sanity | QA pass | process |
| B10 pricing in writing | `pricing.html` (+ dashboard fix) | new/edit |
| B11 invoicing + payment + tracker | `invoice.html`, `ops-console.html` | new |
| B12 README fix | `README.md` | doc |
| B13 merchant ToS + subscription | `partner-terms.html` | new |
| B14 merchant-data privacy addendum | `partner-terms.html` | new |
| C15 branded domain | ops | process |
| C16 "List your restaurant" CTA | `get-started.html` (+ `index.html` link) | new/edit |
| C17 pitch one-pager | `one-pager.html` | new |
| C18/C19 video + screenshots | assets | non-code |
| C20 social accounts | ops | non-code |
| C21/C22 venue list + templates | docs | non-code |
| D23–D26 launch/outreach/proof | process | non-code |
| E27 weekly metrics | `ops-console.html` | new |
| E28/E29 round-up + review | process | non-code |

---

## 2. Shared technical contract (all new pages)

Every new page MUST follow the existing conventions in the root pages:

- **Single self-contained `.html`** file in the repo root. Vanilla JS + inline
  CSS only. No frameworks, build step, or CDNs.
- **Visual language:** gold `#c9a84c`, black `#151515`, bg `#f7f6f3`, card
  `#fff`, border `#e7e4dd`, radius 16px, system/Inter font. Copy the
  `.topbar` + `.tabs` header, `.btn/.btn-gold/.btn-ghost/.btn-sm`,
  `.section/.section-hdr/.section-body` accordion, `.modal-scrim/.modal`
  dialog, and the shared `const OPEN={}` expand/collapse pattern.
- **Reuse JS modules** (do not reimplement): `js/eatouts-db.js`,
  `js/eatouts-auth.js`, `js/eatouts-owner-compat.js`, `js/eatouts-brand.js`
  (`esc`), `js/eatouts-locations.js` + `botswana_locations.js` (town/area).
- **Helpers** to copy from existing pages: `esc()`, `uid()`, `toast()`,
  `openForm()`, `money()`, `dbLoad()/dbSave()`.
- **Internal pages** (`intake.html`, `invoice.html`, `ops-console.html`) MUST
  call `EatoutsAuth.requireSession()` and redirect to `index.html#about` when
  there is no session, and MUST NOT be linked from the public tab bar.
- **Public pages** (`get-started.html`, `pricing.html`, `partner-terms.html`)
  must not require a session.
- **Security:** never store secrets or plaintext passwords. Escape all dynamic
  strings with `esc()`.
- **Mobile-first:** min 44px tap targets, `env(safe-area-inset-bottom)` padding
  on fixed bars.
- **No backend:** state is `localStorage`. New internal data lives under a
  dedicated key `eatouts_ops_v1` (kept separate from `eatouts_db_v2`).

---

## 3. `get-started.html` — public partner landing + lead capture

- **Audience:** restaurant owners (public, no login).
- **Plan tasks:** C16, B10 (summary only).
- **Purpose:** one-tap path from an owner to the EatOuts team.

### Sections
1. **Topbar** (brand only) + hero: headline ("Get your restaurant in front of
   Botswana diners"), subhead, primary WhatsApp CTA.
2. **How it works** — 3 steps: Share your details → We set you up (concierge)
   → Go live with your own WhatsApp receiving orders.
3. **Why EatOuts** — benefit grid: no commission; your own WhatsApp receives
   orders/bookings; concierge setup (no self-serve work); live promos/events
   feed.
4. **Pricing summary** — card linking to `pricing.html`: "P300 one-time setup +
   from P100/month".
5. **Proof** — placeholder testimonial / "featured on EatOuts" strip.
6. **FAQ** — 5–6 short Q&As (cost, time to go live, who updates it, do I need
   an app, how orders reach me).
7. **Sticky footer CTA** — WhatsApp button + "Call" fallback.

### Data
- Read `EatoutsDB.load().settings.whatsapp` (default `26771844129`).
- No writes. Lead capture is a prefilled `wa.me` link:
  `https://wa.me/<number>?text=<encodeURIComponent("Hi EatOuts, I'd like to list my restaurant: <name>")>`.
  Optional `mailto:` fallback.

### Limits
- No form backend, no signup/account creation (concierge model).
- Static marketing copy only.

### Acceptance checks
- Page loads with no console errors over `http://127.0.0.1`.
- CTA opens WhatsApp with the prefilled message and correct number.
- Renders cleanly at 360px width and on desktop.

---

## 4. `pricing.html` — partner pricing & tiers

- **Audience:** public + sales (single copy-of-truth).
- **Plan tasks:** B10.
- **Purpose:** the one place that states what each tier costs and includes.

### Content
- **Onboarding:** non-refundable **P300 one-time** setup/onboarding fee.
- **Monthly:** **Starter P100 · Growth P300 · Pro P500**.
- **Feature matrix** (rows × tiers):

  | Feature | Starter | Growth | Pro |
  |---|---|---|---|
  | Directory listing | ✓ | ✓ | ✓ |
  | Menu (categories/items/variants) | ✓ | ✓ | ✓ |
  | Promos | 1 active | 3 active | Unlimited |
  | Events + performers | — | ✓ | ✓ |
  | Gallery groups | 1 | 3 | Unlimited |
  | Reservation settings + services | — | ✓ | ✓ |
  | Featured placement | — | — | ✓ |
  | Support | WhatsApp | Priority WhatsApp | Priority + monthly review |

- **Rules box:** "Listing is published only after the P300 setup fee is
  confirmed."; cancellation/downgrade note; link to `partner-terms.html`.
- **CTA** to WhatsApp (same mechanism as `get-started.html`).

### Data
- Tiers defined as a JS object and also written to `DB.settings` in one place
  so `restaurant-dashboard.html` reads the same numbers. Recommended:
  `{ setup: 300, starter: 100, growth: 300, pro: 500 }`.

### Limits
- No payment gateway; prices are informational.

### Acceptance checks
- Matrix is readable at 360px (horizontal scroll or stacked cards).
- Numbers match the dashboard exactly.

---

## 5. `intake.html` — concierge onboarding questionnaire

- **Audience:** EatOuts team (internal; not in the public tab bar).
- **Plan tasks:** A5, A6.
- **Purpose:** capture everything needed to set up one venue, then export a
  record the directory generator can ingest.

### Sections (mirror `restaurant-onboarding.html`)
1. **Identity** — name, description, types, logo URL, cover URL.
2. **Location** — town/area from `botswana_locations.js`; plot/street/building/
  landmark; lat/lng.
- **Contacts** — title, number, purpose, primary/whatsapp/active (repeatable).
- **Socials** — IG/FB/WA/TikTok/X/YouTube/Website/Call.
- **Hours** — weekly open/close + custom schedules.
- **Character / Amenities / Menu tags** — chips (same defaults as
  `restaurant-onboarding.html`).
- **Capacity**, **Payments**, **Reservations**, **Reservation services**,
  **Service staff**.
- **Menu** — categories + items (name, type, price, image URL, status).
- **Promos** — title, price, dates, linked items, action.
- **Events** — name, date/time, admission, booking contact.
- **Gallery** — group + image URLs.
- **Review & Export** — summary + **Export JSON** button.

### Output
- Serialise to `venue_<slug>_<YYYYMMDD>.json` shaped for
  `owner_submissions/` and consistent with `directory_runtime_data.json` +
  owner content (restaurant record, location, contacts, socials, and a
  content block with menuCategories/menuItems/promos/events/performers/
  galleryGroups). Use `EatoutsDB` shapes so `EatoutsOwnerCompat`/the directory
  generator can ingest it.
- Also render a **WhatsApp-shareable text summary** and a **printable checklist**
  (Profile → Menu → Photos → Promos → Reserve → Go live) for A6.

### Limits
- No image uploads (URLs only).
- Does not publish; export + manual merge only.
- Draft state persists in `localStorage` (use `eatouts_ops_v1` or a dedicated
  draft key), so the team can resume a session.

### Acceptance checks
- Can complete all sections, export valid JSON, and re-open the page to
  continue a saved draft.
- Exported JSON re-imports into the page without data loss.

---

## 6. `partner-terms.html` — merchant legal

- **Audience:** partners (public/linkable).
- **Plan tasks:** B13, B14.
- **Purpose:** the merchant agreement set the owner agrees to.

### Sections
1. **Merchant Terms of Service** — service description, listing accuracy,
   restaurant's responsibility for its own content/prices, acceptable use,
  liability limits.
2. **Subscription Agreement** — P300 non-refundable setup; recurring
  P100/P300/P500 monthly; billing cycle + due dates; cancellation and
  downgrade policy; suspension for non-payment; the "published only after setup
  fee confirmed" rule.
- **Merchant-data privacy addendum** — what EatOuts stores about a restaurant
  (name, description, location, contacts, owner login details, content),
  why, retention, and how deletion is requested. Consistent with the existing
  14-section customer Privacy Policy in `index.html`.
- **Version + effective date** and a "changes will be posted here" note.

### Data
- Static text. Version constant at top (e.g. `v1.0 — <date>`) so the team can
  bump it.

### Limits
- Not legal advice; template only — flag for review before launch.
- No e-signature; acceptance is implied by the setup fee / onboarding.

### Acceptance checks
- Linked from `pricing.html` and `get-started.html`.
- Readable on mobile; headings anchored for direct linking.

---

## 7. `invoice.html` — invoice generator

- **Audience:** internal sales (not in the public tab bar).
- **Plan tasks:** B11.
- **Purpose:** produce a consistent invoice + payment instructions fast.

### Behavior
- Form: venue name, contact name, tier (Starter/Growth/Pro), setup fee
  (default P300), first month, invoice number (auto `EO-<YYYYMM>-<seq>`), issue
  date, due date.
- Renders a printable invoice (line items, totals, footer) plus **bank and
  MoMo transfer instructions** (placeholder fields the team fills in once).
- **"Send on WhatsApp"** button → prefilled `wa.me` message with the invoice
  summary and payment details.
- **Print / Save as PDF** via `window.print()` with a print stylesheet.

### Data
- Business/payment details stored in `eatouts_ops_v1` so they are entered once.
- Invoice log appended to `eatouts_ops_v1` (number, venue, amount, status:
  unpaid/paid, date).

### Limits
- No payment gateway, no email sending; manual confirmation marks "paid".

### Acceptance checks
- Print preview shows only the invoice (bars/buttons hidden).
- Marking paid updates the log and is reflected in `ops-console.html`.

---

## 8. `ops-console.html` — internal tracker + publish gate

- **Audience:** internal team (not linked publicly).
- **Plan tasks:** B11 (tracker), E27 (metrics).
- **Purpose:** run the business from one screen.

### Content
1. **Venues table:** name · tier · **setup fee paid ✓** · next billing date ·
   live status (draft/ready/live) · WhatsApp number · actions.
2. **Add/edit venue** form (name, slug, tier, setup-fee-paid toggle, dates,
   contact).
3. **Submissions queue:** lists exported JSON filenames flagged ready to merge
   (from `intake.html`/dashboard export) with a "copy to
   `owner_submissions/`" reminder.
4. **Publish gate:** a venue can be marked **ready to deploy** only when
   **setup fee paid = true** (enforces the plan's rule). Show a blocking
   notice otherwise.
5. **Weekly metrics cards:** venues live, paid subscribers, MRR (sum of active
   tiers), WhatsApp clicks/venue (manual entry at launch; later from
   `EatoutsDB.summary()`).
6. **Revenue summary:** setup fees collected to date + monthly recurring.

### Data
- New key **`eatouts_ops_v1`**:
  `{ venues:[{id,name,slug,tier,setupPaid,setupDate,nextBilling,status,whatsapp}],
     invoices:[...], metrics:[{weekOf,venuesLive,paidSubs,mrr,clicks}] }`.
- Reads tier prices from the same object as `pricing.html`.

### Limits
- Local-only; not security, not multi-user. Do **not** link from public pages.
- No automated deploy (deploy stays a script, A3).

### Acceptance checks
- Adding a venue with `setupPaid=false` cannot be marked "ready to deploy".
- MRR recomputes from active tiers; invoice "paid" entries appear.
- Data survives reload (persisted to `eatouts_ops_v1`).

---

## 9. `one-pager.html` — pitch sheet (optional)

- **Audience:** team / print / social.
- **Plan tasks:** C17.
- Single branded page: what EatOuts is; the customer win; the restaurant win
  (no commission, own number, concierge); pricing line; live link + QR code
  (generate QR client-side with a tiny inline encoder or a static image
  placeholder). `@media print` friendly.

---

## 10. Changes to existing pages

### `restaurant-dashboard.html`
- **Add "Export this restaurant"** button: serialise the signed-in restaurant
  record + its forked content (`EatoutsDB.resolveContent`) to a downloadable
  `venue_<slug>.json`. (A1)
- **Fix tiers:** replace `{starter:300,growth:500,pro:800}` with
  `{starter:100,growth:300,pro:500}` and read from the shared pricing object.
  (B10)
- **Add setup-fee status:** show "P300 setup paid / owing" sourced from
  `eatouts_ops_v1` when available.

### `index.html`
- **Per-venue WhatsApp routing:** route order/split-bill/booking/promo enquiry
  messages to the restaurant's own contact (falling back to
  `CONFIG.whatsapp`) instead of always the flagship. (A7)
- **"List your restaurant" CTA:** add a link to `get-started.html` on the
  About page / home surface. (C16)

---

## 11. Dependencies & notes for the builder

- **Pricing object is the single source of truth** — define once, reuse in
  `pricing.html`, `invoice.html`, `ops-console.html`, and
  `restaurant-dashboard.html`.
- **Data shapes:** follow `js/eatouts-db.js` (`restaurant`, `content` with
  `menuCategories/menuItems/promos/events/performers/galleryGroups`) and
  `directory_runtime_data.json` so exports merge cleanly.
- **Auth:** internal pages gate on `EatoutsAuth.requireSession()`; public pages
  do not. All pages degrade gracefully over `http://127.0.0.1`.
- **Placeholders to fill after build:** business bank account, MoMo number,
  company registration details, effective date of terms, live URL + QR.