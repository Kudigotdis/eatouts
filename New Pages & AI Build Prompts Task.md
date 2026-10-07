Delete the files AI_BUILD_PROMPTS.md and NEW_PAGES.md if they aren't needed because I've completed the task with of building the pages (intake.html, invoice.html, partner-terms.html, get-started.html, one-pages.html and ops-consol.html) with another a.i then make sure to attend: Changes to existing pages

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

----------------------------------------------

For user experience, ALWAYS open the app on promos on the current day then restaurant profile users login via the Operator button no the about tab page (once they are logged in from their device they stay logged in. For all the dashboard services and stats for restaurant owners those features are accessed by going to 'Operator'.)



----------------------------------

Summary of what was delivered
Seven self-contained HTML files, each ready to drop into the repo root and serve over http://127.0.0.1:

File	Auth	Purpose
pricing.html	Public	Pricing tiers, feature matrix, rules box, WhatsApp CTA. Writes {setup:300,starter:100,growth:300,pro:500} into DB.settings.pricing so the dashboard reads the same numbers.
get-started.html	Public	Partner landing: hero, 3 steps, benefits grid, pricing summary, proof placeholder, 6-question FAQ, sticky WhatsApp + Call footer. Reads EatoutsDB.load().settings.whatsapp.
partner-terms.html	Public	Merchant ToS, Subscription Agreement (setup fee, tiers, billing cycle, publish gate, cancellation, suspension), merchant-data privacy addendum, version constant, template disclaimer. Anchored headings for direct linking.
intake.html	Internal	Full concierge questionnaire (identity, location via botswana_locations.js, contacts, socials, hours, character/amenities/menu tags, capacity, payments, reservations, services, staff, menu, promos, events, gallery) plus Review & Export. Drafts persist under eatouts_intake_draft_v1. Exports venue_<slug>_<YYYYMMDD>.json shaped for owner_submissions/, logs submissions to eatouts_ops_v1, and includes a WhatsApp summary + printable checklist.
invoice.html	Internal	Invoice generator reading the shared pricing object. Auto EO-<YYYYMM>-<seq> numbering, printable output with @media print, bank + MoMo + reference instructions stored in eatouts_ops_v1, WhatsApp send, and an invoice log with paid/unpaid toggle.
ops-console.html	Internal	Venues table, add/edit form, publish gate (blocks ready/live until setup fee is ticked paid), weekly metric cards with auto MRR, submissions queue, invoice status from invoice.html, and a visible prototype-only notice. Everything under eatouts_ops_v1.
one-pager.html	Public/print	Branded pitch sheet with hero, two-win block, price line, QR placeholder, and @media print layout.
Reuse notes (matching the master prompt):

All internal pages gate with if(!EatoutsAuth.requireSession()){EatoutsAuth.redirectToLogin();}else{EatoutsAuth.applyActive();} as the very first script before anything paints.

Every page loads js/eatouts-db.js, js/eatouts-auth.js, and js/eatouts-brand.js via <script src>. intake.html also loads js/eatouts-owner-compat.js, js/eatouts-locations.js and botswana_locations.js.

All state under eatouts_ops_v1 (and a dedicated eatouts_intake_draft_v1 for the intake draft). No writes to eatouts_db_v2 except through EatoutsDB.save().

Every dynamic string goes through esc().

44px minimum tap targets, env(safe-area-inset-bottom) on fixed bars, works at 360px and on desktop.

Placeholders flagged for the team:

Bank account, MoMo number, company registration / VAT → entered once in invoice.html and stored under eatouts_ops_v1.bank.

Live URL + QR image → one-pager.html has a static placeholder <div class="qr">.

Effective date + version on partner-terms.html (currently v1.0 · 1 October 2026).

Proof testimonial in get-started.html — marked as "Founding partner venue, Gaborone".