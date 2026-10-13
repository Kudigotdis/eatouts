# VS Code AI Agent Prompt — Integrate the EatOuts Designer Demo Seed and Local Portfolio Images

You are working inside my existing EatOuts app project. Do not create a separate demo application. First inspect the actual files, their APIs, storage keys, authentication/roles, routing, stylesheet conventions and UI structure. Then adapt the included `eatouts-designers-demo-seed.json` to the project. **The existing app remains the source of truth; this JSON is demo input, not a replacement architecture.**

## Files and existing modules to inspect

Find and read the current versions of all files that exist, especially:

- `index.html` and the current About > Settings accordion, including its nested **List Your Business** row.
- `eatouts-services-seed.js` or its current filename.
- `eatouts-brand-kit.js` or the current shared marketplace/service module.
- `eatouts-designers-seed.js` or any current designer seed.
- `designer-services.html`.
- `designer-dashboard.html`.
- `brand-kit-admin.html` and any existing operations/admin console.
- The real `EatoutsDB`/database or localStorage state manager, auth/role checks, shared CSS, and existing migration/audit helpers.
- The new file `eatouts-designers-demo-seed.json`.

Do not assume these file names, key names, function signatures, page routes, status strings or data structures are correct until you inspect them. Reuse the existing architecture and the actual functions. If a file exists in a different folder/name, use the real path and update imports accordingly. Do not create duplicate database layers, duplicate admin consoles, duplicate service catalogues or parallel job stores.

## 1. Integrate the demo dataset safely

1. Parse and validate `eatouts-designers-demo-seed.json`.
2. Map its five designer records to the canonical designer schema already used by EatOuts. Keep stable IDs where possible: `designer_kudigotdis`, `designer_neoframe`, `designer_thuto_motion`, `designer_mpho_printworks`, and `designer_dineo_social`.
3. The five profiles are fictional demo records; **KudiGotDis must be present**. Keep every `is_demo_record`, `is_synthetic`, and test-only indicator. Make the demo label obvious in UI where appropriate.
4. Use idempotent upsert/merge by stable ID. Running the seed twice must not create duplicate designers, projects, jobs, retainers, reviews or payouts. Do not clear localStorage, delete customer records, overwrite real designer profiles, or reset the app.
5. Seed only when the app is in its existing development/demo mode or when an explicit admin demo-seed action is used. Never auto-insert demo data into a production deployment. Provide a safe **Load/Refresh Demo Data** admin action if consistent with the current admin system, and a separately labelled **Remove Demo Data** action only if removal can target records marked as demo without touching real records.
6. Use the existing central service catalogue from `eatouts-services-seed.js`. Resolve each `service_reference_key` against the real service IDs by matching the actual catalogue; do not create a second catalogue. If a name/key does not match, log and report the mismatch and fix the mapping consciously.
7. Treat demo job price snapshots as fixed historical test data for demonstrating the UI, but make the actual service submission flow call the same shared price calculator/commission/reservation code as production. Validate all displayed arithmetic. The sample calculation uses platform commission 15% of final total and designer remainder 85%; rush is +40% of the base service price when the agreed deadline is under 48 hours. Do not invent additional fees.
8. Protect user roles through the existing shared auth/authorization logic. Customers/businesses see only their jobs; designers see only their own assigned work; admins can inspect jobs, designer records, image assignments and payout examples. Never make URL parameters the authorization mechanism. Never show internal demo email/contact or payout fields in public cards.
9. Any `example.test` email, mock review, fake metric, fake business, seeded date, demo payout or demo audit event must be clearly test-only and must never trigger a real payment, email, SMS, WhatsApp message or invoice.

## 2. Scan these exact image folders — this is a required part of the task

The project root is expected to be:

`C:\Users\Kudzanai\Documents\2025\App Developments\EatOuts App`

Scan these folders on disk and use the **actual files that exist there**:

1. Beverage promos: `C:\Users\Kudzanai\Documents\2025\App Developments\EatOuts App\assets\images\beverage-promos`
2. Alcohol promos: `C:\Users\Kudzanai\Documents\2025\App Developments\EatOuts App\assets\images\alcohol-promos`
3. Events: `C:\Users\Kudzanai\Documents\2025\App Developments\EatOuts App\assets\images\events`

### Minimum image requirement

- Link **at least 8 distinct valid image files from `beverage-promos`**, **at least 8 distinct valid image files from `alcohol-promos`**, and **at least 8 distinct valid image files from `events`** to designer portfolio items. That is at least 24 distinct image files in total when all folders contain enough valid files.
- Spread these samples across the five demo designers in a way that fits their declared specialties. The JSON’s `portfolio_items` are intended portfolio slots and give an initial designer assignment; adjust assignments if the actual image content makes a better fit, keeping all five designers represented.
- Search supported image types such as `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` and `.avif`; inspect subfolders if present, but keep the returned app path correct relative to the project root.
- **Do not make up filenames. Do not use broken links. Do not link a non-image file. Do not repeatedly use the same image to make the count look like 8.** Each portfolio image must resolve to a real distinct file. Avoid duplicating an image across unrelated portfolio entries unless the existing app deliberately supports that and the admin UI makes the shared asset relationship clear.
- Visually inspect thumbnails where possible. Base alt text, captions and category assignments on what the picture actually shows. The JSON titles are fictional starting points, not proof of image contents. Change a title/description if it does not match the actual artwork. Do not infer or invent real brands, alcohol prices, event venues, artist names or client endorsements from an image.
- Do not show an absolute Windows path in an HTML `img.src`. Save the app-relative path, for example `assets/images/beverage-promos/actual-file-name.png`, in the canonical manifest/store and use the project’s normal asset URL convention. Do not move, rename, compress or modify source artwork unless the project genuinely requires it and the change is safe.
- Add useful `alt` text; preserve aspect ratio using the existing CSS; provide an image fallback for missing/unreadable files; lazy-load thumbnails where compatible with the app.
- Use relative URLs that continue to work when the app is served from the project root. Test filenames containing spaces, Unicode, `#`, `%` and parentheses; URL-encode the browser URL as appropriate without corrupting the actual filesystem path.

### If fewer than 8 valid files exist in any folder

Do not silently copy/duplicate images, invent asset names, or report success. Record the actual count, list the available/accepted filenames and the exact shortfall for that directory. Leave unresolved slots marked clearly, use a graceful UI placeholder, and tell me which real images need to be added to meet the requirement. The final response must give a separate validated count for each folder and total distinct images successfully linked.

### Build or update an image manifest

Create or update a single manifest using the existing app’s preferred structure. If none exists, add a clear manifest such as `assets/data/eatouts-designer-portfolio-assets.json` or a location consistent with the project. Every entry should include at least:

- stable portfolio item ID;
- canonical designer ID;
- source folder group (`beverage-promos`, `alcohol-promos`, or `events`);
- actual filename;
- app-relative image path;
- alt text/caption based on the inspected artwork;
- validation result (`found`, valid image, dimensions if readily available);
- demo-only flag.

Keep the JSON seed and image manifest in sync. Do not overwrite `eatouts-designers-seed.js` with a different format just because the JSON has a different format; adapt the JSON into the existing schema.

## 3. Connect the demo data to the actual customer/business experience

Test the complete path through the existing interface, not only by inspecting the data in DevTools:

- Under `index.html` > About > Settings > List Your Business, keep the existing List Your Business option and place a **Need Design** option immediately after it, preserving the current accordion, header, bottom navigation, spacing and CSS conventions.
- The Need Design entry should open the existing `designer-services.html` flow through the app’s normal navigation mechanism.
- A business can browse the service catalogue, see all five demo designer profiles/portfolio examples, filter categories if supported, choose a service or supported bundle, complete a brief, see a consistent BWP price breakdown, review required fields, and submit a demo request.
- Show exactly what is included, what is not included, revision allowance, expected turnaround, required assets, deadline, usage/delivery details and retainer quantities/cycle terms where applicable. Do not imply printing/manufacturing, ad spend, posting/community management, licensing or source files are included unless the selected real catalogue item explicitly says so.
- Use the app’s configured admin WhatsApp/contact configuration, if the existing flow requires a handoff. Never use the fake `.example.test` contacts or send a WhatsApp message automatically just because a demo record exists.

## 4. Connect the designer workspace

Make `designer-dashboard.html` use the same canonical data and shared state logic as the public services page and admin. It should show the authenticated demo designer’s own records only, including:

- profile details and availability;
- assigned jobs and due dates;
- brief/assets and approved price snapshot;
- submitted drafts/delivery and revision history;
- client-review state and required next action;
- one-time active capacity and retainer slot counts;
- retainer cycle deliverables, due dates, revision limits and payment warning states;
- payout history appropriate to that designer, without letting the designer mark a real payment as sent/received or close their own job.

Do not allow a designer to self-approve a reservation, increase their own capacity, change a frozen price, close a project to release capacity or change admin-only payout fields.

## 5. Connect admin and audit workflows

Use the current admin console if it exists. Do not add a parallel admin centre. The admin UI should support or visibly demonstrate:

- list/search/filter all five demo designers and their portfolios;
- inspect each image assignment and whether the actual source file validates;
- view demo jobs across awaiting admin approval, in progress, revision requested, awaiting client review, stalled-client-response, completed awaiting admin close and payout states;
- approve/hold/reject a new request using existing capacity guards;
- flag projects with no client activity for 14 days;
- inspect active retainers and their cycle scopes;
- flag a retainer after two missed payment cycles for admin-managed pause/review—**do not silently cancel it or release capacity**;
- close accepted jobs as an admin and release the active one-time slot exactly once;
- view payouts and expected platform/designers’ amounts, using existing authorized status transitions;
- inspect audit/timeline history for actions that affect assignments, pricing, capacity, project status and payout status.

For current real workflows, enforce the established rules: one active one-time project per designer, up to three active retainers; pending admin approval should not count as an approved active slot; active retainer-cycle completion does not free the continuing retainer slot; admin closes a satisfactory one-time project to release its slot. If the app’s existing rules differ, explain the mismatch before changing the business rules rather than silently rewriting them.

## 6. Visual/UI expectations

- Preserve the EatOuts app’s existing mobile-first design language, header/footer navigation, card geometry, CSS tokens, route mechanism and shared components.
- Check the page at phone widths around 360px and at the current app’s normal desktop development viewport.
- Images must not stretch, overflow, cover text or cause horizontal scroll. Cards should remain readable and portfolio images should have sensible object-fit/cropping behavior.
- Provide empty/loading/error states and a graceful missing-image placeholder.
- Put a clear **DEMO DATA** label on seeded profiles, demo jobs, demo reviews, synthetic metrics and demo payout events where users could mistake them for real records.

## 7. Verify before finishing

Run the available checks in this project. At minimum:

1. JSON parse/validation and duplicate-ID checks.
2. Seed run twice (prove idempotence).
3. Verify every seeded job, retainer, review and payout references an existing designer/business/job as appropriate.
4. Verify each job’s commission and payout arithmetic to two decimal places.
5. Verify no demo record can trigger a real payment or outbound communication.
6. Verify roles using the real auth layer; do not rely on UI hiding alone.
7. Validate all actual image files and show separate counts for the three folders. Confirm at least eight distinct images per directory if the source folders have them.
8. Exercise Need Design from About > Settings > List Your Business.
9. Run representative business submission, admin approval, designer revision, client acceptance/admin close, retainer payment warning and stalled job tests.
10. Check browser console for errors, missing modules and broken images; test on a narrow mobile viewport.

## 8. Final response from you (the coding agent)

When implementation is complete, report:

- exactly which existing files were changed and which new files were added;
- how the JSON seed is adapted to the real data model and how to enable/load demo data;
- the number of distinct validated images linked from `beverage-promos`, `alcohol-promos`, and `events`, plus total;
- the exact list of missing assets if any folder is below eight;
- which automated/manual tests passed or failed;
- any service ID, schema or workflow mismatches you found;
- what is still a prototype limitation (especially localStorage cross-device coordination).

Do not claim the implementation is complete if image validation, role tests or end-to-end flow tests were not performed. Start by inspecting the real files, then implement the integration in small steps.
