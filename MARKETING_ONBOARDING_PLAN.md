# EatOuts — Marketing & Restaurant Onboarding Task List

**Goal:** make it possible to market EatOuts and sign up restaurants so they start using the platform.

**Launch decisions (locked in):**
- **Onboarding model:** concierge — the EatOuts team sets each restaurant up (no self-serve sign-up UI needed at launch).
- **Pricing — paid from day one:** one-time **P300 onboarding/setup fee**, then monthly **Starter P100 · Growth P300 · Pro P500** (reduced from the old P300 / P500 / P800 tiers).
- **Launch link:** the current live site (GitHub Pages) — branded domain is a post-launch follow-up.

**Current blockers a restaurant can't yet do this today:**
1. An owner's dashboard edits live only in their browser's localStorage — there is **no export/publish path** to the live site.
2. All order/booking WhatsApp messages currently route to the **flagship number** (`+267 71 844 129`), not each restaurant's own number.
3. No intake form, no pricing page, no merchant terms, no invoicing, no marketing assets.

---

## A. Restaurant-ready foundation (the blockers)

1. **Build an "Export this restaurant" action in the owner dashboard.** Add a button that downloads the signed-in restaurant's full record as a single JSON file (profile, menu categories/items, promos, events, performers, gallery groups, reservation settings, users).
2. **Make the directory generator ingest exported records.** Update `scripts/build_restaurant_directory.py` so it also merges exported owner JSON from an `owner_submissions/` folder (idempotent, stable IDs — matching the existing "missing-only roster updates" design) alongside the SQLite, CSV and curated inputs it already reads.
3. **Add one-command live deploy.** Wrap rebuild + `git add`/`commit`/`push` into a single batch script (or GitHub Action), so the team can publish a venue to GitHub Pages without manual steps.
4. **Test the full publish flow with a sample venue.** Onboard a test restaurant in the dashboard → export → merge → deploy → confirm on the live site that: it appears in the directory (563 → 564), its Menu/Promos work, checkout works, and the WhatsApp messages target the restaurant's own number.
5. **Build a concierge intake form/template.** A structured questionnaire (Google Form or WhatsApp script) that captures for each restaurant: exact name, description, category/type, town/area, operating hours, logo + cover photo, menu items with photos and prices, promos, events, socials (IG/FB/WA/TikTok/X/YouTube/Website/Call/GPS), contacts, and reservation settings.
6. **Create a new-venue starter template + one-session concierge checklist.** Make it possible for the team to set a restaurant up in a single sitting (Profile → Menu → Photos → Promos → Reserve → Go live) with placeholders that are easy to fill.
7. **Fix per-venue WhatsApp routing.** Today every order, split-bill, venue booking and promo enquiry goes to the flagship number (`CONFIG.whatsapp`). Route each restaurant's messages to its own WhatsApp/contact so the venue actually receives its orders and bookings.
8. **Verify operator sign-in on the live https site from a phone.** Confirm login + secure-context password hashing work on mobile browsers (not just desktop), and that the dashboard is usable on a phone; fix anything that fails.
9. **Run a consumer-app sanity pass with a brand-new venue.** Confirm search, filters, the Promos feed, Menu and Reserve pick up a new listing correctly.

## B. Pricing, payment & legal

10. **Set launch pricing in writing:** non-refundable **P300 onboarding/setup fee (one-time)**; monthly **Starter P100 · Growth P300 · Pro P500**. Document exactly what each tier includes (listing, menu, promos, events, gallery, reservation settings, support level) so sales has one answer to "what do I get?".
11. **Create the invoicing & payment process.** A WhatsApp invoice template + bank/MoMo transfer instructions; a simple tracker (spreadsheet) of restaurant → tier → onboarding fee paid → monthly due date. **Rule: listing is published only after the P300 onboarding fee is confirmed.**
12. **Fix `README.md.md` → `README.md`** and update it with the new tier pricing; remove the unbuilt "interaction analytics dashboard" claim (or clearly mark it as roadmap) so marketing never over-promises.
13. **Draft merchant/partner Terms of Service + a short subscription agreement** covering the P300 onboarding fee, recurring P100–P500 monthly fees, cancellation/downgrade policy, payment terms, and the restaurant's responsibility for its own content.
14. **Add a merchant-data addendum to the Privacy Policy** describing what EatOuts stores about a restaurant (name, contacts, owner details) — consistent with the existing 14-section Privacy Policy.

## C. Marketing & brand build

15. **Log a non-blocking follow-up: branded domain.** Launch on the current GitHub Pages link; add a task to buy a `.bw`/`.co.bw` domain and move the live app later for credibility.
16. **Add a "List your restaurant / Get started" lead-capture CTA** on the live site (reuse the existing About → WhatsApp inquiry path) so restaurant owners can reach the team in one tap.
17. **Write the pitch one-pager.** What EatOuts does (restaurant discovery + WhatsApp ordering for Botswana), the customer win (offline browsing, no account, order in WhatsApp), the restaurant win (no commission, the venue's own number receives the orders, page updated by concierge), the P300 onboarding + tier pricing, and the live link + QR code.
18. **Film a 60–90 second demo video:** Promos feed → search + filters → restaurant Menu → add to cart → checkout → Split the Bill → Operator demo (existing demo login `0 / 0`).
19. **Produce a screenshot kit + social graphics** using the existing brand icon set (promos, split the bill, directory, gallery).
20. **Create social accounts (Instagram, Facebook, TikTok, X)** with a consistent handle and post a launch announcement ("EatOuts is live — get your restaurant listed").
21. **Build the target venue list:** start with the 12 featured venues (The Yellow Giraffe, KFC, Nando's, Mozambik, Spur, etc.) plus 8–10 independent Gaborone spots; capture WhatsApp, email and the right contact persona for each.
22. **Write personalised outreach templates** (WhatsApp + email) — benefit-led, each opening with the venue's own name and something specific about it, pricing included, with the live link.

## D. Launch & outreach

23. **Soft-launch 3–5 paid pilot restaurants** via concierge onboarding; these become the proof — full pages, live promos, working WhatsApp routing.
24. **Set an outreach cadence** (e.g. 5 venues contacted/week, 2–3 demos booked, weekly follow-ups) and start the steady-state pipeline.
25. **Launch a diner-facing hook:** a weekly "venue of the week" promo on the Promos tab + socials, so restaurants can see EatOuts driving them traffic.
26. **Collect feedback and proof:** case-study quotes from the first restaurants and screenshots of real WhatsApp order messages they receive.

## E. Measure & iterate

27. **Define and track success metrics weekly:** venues live, paid subscribers, monthly recurring revenue, WhatsApp order/booking clicks per venue.
28. **Send a monthly restaurant round-up** (WhatsApp/newsletter) — what's new in the app + which venue performed best that month.
29. **Run an 8–12 week review:** renew pricing if needed, maintain a feature-request list from restaurant feedback, and revisit the branded-domain follow-up.