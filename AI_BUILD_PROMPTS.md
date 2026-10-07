# EatOuts — AI Build Prompts for the New HTML Pages

How to use this file:

1. Give the other AI the **master prompt** (Section 1) plus **one page prompt**
   (Section 2) per page, and the **file list** (Section 3) so it can match the
   existing style and data shapes.
2. The other AI writes each page as a single self-contained `.html` in the repo
   root. No frameworks, no build step, no external libraries.
3. When the AI returns the files, hand them back for implementation/review.

The specs each page must satisfy are in **`NEW_PAGES.md`** — paste the relevant
section into the prompt where marked.

---

## 1. Master prompt (paste first, always)

> You are building front-end-only HTML pages for **EatOuts**, a Botswana
> restaurant-discovery + WhatsApp-ordering app. There is **no backend**: all
> state is browser `localStorage`, and the app is served over
> `http://127.0.0.1` via `run-eatouts.bat` (opening via `file://` breaks
> auth and isolates storage — never rely on it).
>
> **Read these files first (do not modify them):**
> - `NEW_PAGES.md` — the spec for the page(s) you are building.
> - `HTML_PAGES.md` — what the existing pages do and their limits.
> - `MARKETING_ONBOARDING_PLAN.md` — business context.
> - `restaurant-onboarding.html` — copy the visual language, `.topbar/.tabs`,
>   `.section` accordion, `.modal-scrim/.modal` dialogs, chips, records, and the
>   helper functions `esc()`, `uid()`, `toast()`, `openForm()`, `money()`.
> - `restaurant-dashboard.html` — card/stat/hero patterns and the billing block.
> - `promo-onboarding.html`, `event-onboarding.html` — accordion + list layouts.
> - `index.html` — customer conventions, `CONFIG.whatsapp`, About/legal
>   sections, operator sign-in.
> - `js/eatouts-db.js` — data API (`load/save/resolveContent/forkContent`,
>   `settings`, restaurant + content shapes).
> - `js/eatouts-auth.js` — sessions + password hashing (`requireSession`,
>   `normaliseWhatsapp`).
> - `js/eatouts-owner-compat.js` — load/save the profile (legacy shape) used by
>   the onboarding pages.
> - `js/eatouts-brand.js` — `esc()`, `thumbHtml()`.
> - `js/eatouts-locations.js` + `botswana_locations.js` — town/area data.
> - `assets/data/restaurant_listings/directory_runtime_data.json` — directory
>   record shape.
>
> **Hard constraints:**
> - Each page is a **single self-contained `.html`** file in the repo root. No
>   frameworks, no build step, no CDNs, no JS libraries — vanilla JS + inline
>   `<style>` only.
> - Match the existing design system exactly: gold `#c9a84c`, black `#151515`,
>   bg `#f7f6f3`, card `#fff`, border `#e7e4dd`, radius 16px, Inter/system
>   font, and the existing `.topbar`, `.tabs`, `.card`, `.btn`/`.btn-gold`/
>   `.btn-ghost`, `.section` compound classes. Reuse the `const OPEN={}` +
>   re-render toggle pattern.
> - Reuse the shared modules — **do not reimplement the DB or auth**. Load
>   `js/eatouts-db.js`, `js/eatouts-auth.js`, `js/eatouts-owner-compat.js` (and
>   `js/eatouts-brand.js` / locations where relevant) with `<script src>`.
> - **Internal pages** (`intake.html`, `invoice.html`, `ops-console.html`) must
>   run, before any content paints:
>   `if(!EatoutsAuth.requireSession()){EatoutsAuth.redirectToLogin();}else{EatoutsAuth.applyActive();}`
>   and must **not** be linked from the public tab bar.
> - **Public pages** (`get-started.html`, `pricing.html`,
>   `partner-terms.html`) must not require a session.
> - Escape every dynamic string with `esc()`. Never store secrets or plaintext
>   passwords.
> - Mobile-first: 44px minimum tap targets, `env(safe-area-inset-bottom)` on
>   fixed bars, works at 360px wide and on desktop.
> - Keep new internal state under the dedicated key **`eatouts_ops_v1`**;
>   never write to `eatouts_db_v2` except through `EatoutsDB` /
>   `EatoutsOwnerCompat`.
> - No analytics, no network calls, no external fonts or images beyond local
>   `assets/`.
>
> **Deliverable for each page:** the complete `.html` file, plus a short note
> listing (a) which existing functions/keys you reused, and (b) placeholder
> values the team must fill in later (e.g. bank account, phone number,
> effective date).

---

## 2. Per-page prompts (paste one)

### 2.1 `get-started.html`
> Build the public partner landing + lead-capture page described in
> `NEW_PAGES.md` §3. Public — no auth. Sections: hero with primary WhatsApp
> CTA; 3-step "how it works"; "why EatOuts" benefit grid (no commission, your
> own WhatsApp receives orders, concierge setup, live promos/events); pricing
> summary card linking to `pricing.html`; proof/testimonial placeholder; FAQ;
> sticky footer CTA (WhatsApp + Call). Read the number from
> `EatoutsDB.load().settings.whatsapp`. The CTA is a prefilled
> `https://wa.me/<number>?text=...` link (no form backend). Ensure it renders
> cleanly at 360px.

### 2.2 `pricing.html`
> Build the partner pricing page in `NEW_PAGES.md` §4. Public — no auth. Include
> the P300 one-time setup fee, monthly Starter P100 / Growth P300 / Pro P500,
> and the tier feature matrix. Define the prices once as a JS object
> (`{setup:300,starter:100,growth:300,pro:500}`) and write them to
> `DB.settings` so the dashboard reads the same source. Add a rules box ("listing
> published only after the setup fee is confirmed") linking to
> `partner-terms.html`, and a WhatsApp CTA. Must be readable at 360px.

### 2.3 `intake.html`
> Build the internal concierge onboarding questionnaire in `NEW_PAGES.md` §5.
> Gate with `EatoutsAuth.requireSession()`; not in the public tab bar. Reproduce
> the `restaurant-onboarding.html` sections (Identity, Location using
> `botswana_locations.js`, Contacts, Socials, Hours, Character/Amenities/Menu
> tags, Capacity, Payments, Reservations, Services, Staff) plus Menu, Promos,
> Events, Gallery, then a Review & Export step. Export a single
> `venue_<slug>_<YYYYMMDD>.json` shaped for `owner_submissions/` and consistent
> with `directory_runtime_data.json` + owner content. Persist an in-progress
> draft to `eatouts_ops_v1` so a session can resume. Also render a
> WhatsApp-shareable summary and a printable checklist (Profile → Menu → Photos
> → Promos → Reserve → Go live). No image uploads — URLs only.

### 2.4 `partner-terms.html`
> Build the merchant legal page in `NEW_PAGES.md` §6. Public — no auth.
> Sections: Merchant Terms of Service; Subscription Agreement (P300
> non-refundable setup; recurring P100/P300/P500; billing cycle; cancellation
> and downgrade; suspension for non-payment; the "published only after setup fee
> confirmed" rule); Merchant-data Privacy addendum consistent with the existing
> 14-section customer Privacy Policy in `index.html`; and a version + effective
> date constant. Add a footer note that this is a template pending legal review.
> Anchor headings for direct linking.

### 2.5 `invoice.html`
> Build the internal invoice generator in `NEW_PAGES.md` §7. Gate with
> `EatoutsAuth.requireSession()`; not in the public tab bar. Form fields: venue
> name, contact, tier, setup fee (default P300), first month, invoice number
> (auto `EO-<YYYYMM>-<seq>`), issue date, due date. Render a printable invoice
> with bank + MoMo payment instructions (placeholders stored in
> `eatouts_ops_v1`), a "Send on WhatsApp" prefilled `wa.me` button, and
> `window.print()` with a print stylesheet that hides bars/buttons. Append each
> invoice to the `eatouts_ops_v1` log with an unpaid/paid status toggle.

### 2.6 `ops-console.html`
> Build the internal ops tracker + publish gate in `NEW_PAGES.md` §8. Gate with
> `EatoutsAuth.requireSession()`; not in the public tab bar. Show a venues table
> (name, tier, setup-fee-paid toggle, next billing date, status
> draft/ready/live, WhatsApp, actions); an add/edit venue form; a submissions
> queue of exported JSON filenames ready to merge; a **publish gate** that only
> allows "ready to deploy" when the setup fee is marked paid; weekly metric
> cards (venues live, paid subs, MRR, clicks); and invoice status from
> `invoice.html`. Persist everything to `eatouts_ops_v1`. Recompute MRR from
> active tiers using the shared pricing object. Add a visible note that this is
> a single-device prototype, not security.

### 2.7 `one-pager.html` (optional)
> Build the branded printable pitch sheet in `NEW_PAGES.md` §9: what EatOuts is,
> the customer win, the restaurant win (no commission, own number, concierge),
> a pricing line, and the live link + QR code (client-side encoder or a static
> placeholder image). `@media print` friendly.

---

## 3. Files to provide the AI (checklist)

**Read for style + patterns**
- [ ] `restaurant-onboarding.html`
- `promo-onboarding.html`
- `event-onboarding.html`
- `restaurant-dashboard.html`
- `index.html`

**Runtime modules (include, do not edit):**
- `js/eatouts-db.js`
- `js/eatouts-auth.js`
- `js/eatouts-owner-compat.js`
- `js/eatouts-brand.js`
- `js/eatouts-locations.js`
- `botswana_locations.js`

**Data shape reference**
- `assets/data/restaurant_listings/directory_runtime_data.json`
- `js/eatouts-seed-data.js` (roster/overlay shape)

**Context docs**
- `NEW_PAGES.md` (specs)
- `HTML_PAGES.md` (existing capabilities/limits)
- `MARKETING_ONBOARDING_PLAN.md` (business goals)
- `FEATURES.md`

**Run note**
- `run-eatouts.bat` — the app must be served on `http://127.0.0.1`.

---

## 3b. Suggested delivery order

1. `pricing.html` (defines the shared price object).
2. `get-started.html` (depends on pricing).
3. `partner-terms.html`.
4. `intake.html` (largest; depends on data shapes).
5. `invoice.html`.
6. `ops-console.html` (depends on invoice log + pricing).
7. `one-pager.html`.
8. Edits to `restaurant-dashboard.html` and `index.html`.

---

## 4. Output checklist to request back from the AI

Ask the other AI to confirm, for each page:

- [ ] Single self-contained `.html`, no external libraries.
- [ ] Uses the existing `.topbar/.tabs/.section/.btn/.modal` classes and the
      `OPEN` toggle pattern.
- [ ] Internal pages call `EatoutsAuth.requireSession()` first; public pages do
      not.
- [ ] All dynamic text passed through `esc()`.
- [ ] No writes to `eatouts_db_v2` except via `EatoutsDB` /
      `EatoutsOwnerCompat`.
- [ ] New internal state stored under `eatouts_ops_v1`.
- [ ] Renders at 360px; tap targets ≥ 44px.
- [ ] Loads with no console errors over `http://127.0.0.1`.
- [ ] Placeholders flagged: bank account, MoMo, phone, effective date, live URL.