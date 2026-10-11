# EatOuts — Integration Test Plan

Companion to `INTEGRATION_AUDIT.md` and `INTEGRATION_DECISIONS.md`. Describes how
the integrated app is tested, what the automated suites actually verify, and the
manual browser checks that still need a real device.

## How to run

| Command | What it runs |
| --- | --- |
| `npm test` | The 22 jsdom suites in `tests/` (see `tests/run-all.js`). Must be **22 passed, 0 failed**. |
| `node --check <file>.js` | Syntax check a shared JS module. |
| `node tests/<suite>.js` | Run a single suite. |
| `npm run build` | `merge` + `copy-static.mjs` → stages `dist/` for Cloudflare. |

The jsdom suites load real page HTML, inline every `<script src>` from disk, and
assert on rendered DOM and `localStorage`. They are the regression net for the
customer app and the builder pages.

### jsdom limitations (filter these, they are not failures)
- `Not implemented: navigation to another Document` — emitted by guarded
  redirects (`location.href = …`); harnesses filter `/Not implemented/`.
- `scrollIntoView` is not implemented — harnesses stub
  `HTMLElement.prototype.scrollIntoView`.
- `HTMLFormElement` named-property access (`f.firstName`) is unsupported — use
  `f.elements.firstName`.
- Seed a session from `beforeParse` via `eatouts_auth_session_v1` +
  `eatouts_active_session_v2` (+ `eatouts_active_business_v2` as needed).

## Automated coverage map (spec Phase 9 → suites)

| # | Spec check | Automated coverage | Status |
| --- | --- | --- | --- |
| 1 | Customer account / sign-out-in / profile / address / favourite / feedback | `smoke.js`, `contracts.js` (auth + APIs); addresses/profile/checkout-prefill jsdom harnesses | Partial — combined flow needs a browser |
| 2 | Checkout writes an order visible to the business + history | `checkout-delivery.js` (renders restaurant+order, writes `eatouts_order_v1`, delivery block round-trips) | Covered (delivery step) |
| 3 | Order-status transitions update views + notifications/audit | `dashboard.js`; `EatoutsAudit`/`EatoutsAnalytics` unit behaviour exercised via page harnesses | Partial |
| 4 | Owner cannot read another business via `?biz=` | `js/eatouts-auth.js` routing/membership validated by the roles/auth harnesses | Partial — negative case is manual |
| 5 | Add staff; staff sees only allowed modules; salary hidden without permission | `js/eatouts-roles.js` `hasRole` 8/8 harness; `staff-manager.html` renders | Partial |
| 6 | Bottle-store alcohol flag + age restrictions consistent | `beverages.js` | Covered |
| 7 | Onboarding draft resumes; type switch keeps data; publish/verify gate | `appshell.js` (onboarding shells are full pages); manual resume/type-switch | Manual |
| 8 | Food-truck schedule updates "today"; stale `liveNow` after 12h | `food-truck-schedule1.html` jsdom harness (12 checks incl. save with district code) | Covered (schedule + location); 12h staleness manual |
| 9 | Lodge room/housekeeping statuses + booking conflicts | `room-manager.html` cycle logic | Manual |
| 10 | Feedback visible in triage and to the submitter | `feedback-manager.html` jsdom harness (pagination, resolve + audit, WA link) | Partial |
| 11 | Blog preview matches reader; only published public | `blog.js` | Covered |
| 12 | Admin vs restricted staff tab/action access | `js/eatouts-roles.js` harness; guards widened in `feedback-manager.html` / `blog-creator-dashboard.html` | Partial |
| 13 | Legacy migrations run once, keep a backup, no duplicate records | `js/eatouts-db.js` v1→v2 migration + `js/eatouts-data.js` feedback migration / link pass (session-tagged, idempotent) | Manual — verify `eatouts_db_v1` retained |
| 14 | `index.html` features intact (content resolution, login/demo, insecure-context, current order) | `smoke.js`, `checks.js`, `contracts.js`, `about.js`, `appshell.js` | Covered |
| 15 | Export/import, empty states, malformed JSON, deleted targets, storage failures | Empty states + pagination + confirm/audit jsdom harness; corrupt-blob handling in `js/eatouts-db.js` | Partial |

## Phase 8 safety harnesses (added this pass)

Run from a temp dir; `<root>` is the repo root.

| Harness | Checks |
| --- | --- |
| `harness-catalog.mjs` | event-planner + suppliers render the shared 8-category catalogue; no errors |
| `harness-phase8.mjs` | users-manager pagination/escape/audit; feedback-manager pagination + well-formed wa.me link + resolve audit; addresses confirm-delete + audit |
| `harness-checkout-prefill.mjs` | checkout prefill from saved address, no premature fee |
| `harness-ft.mjs` | food-truck substitution + day-edit forms, cascade, save with district code/name |
| `harness-profile.mjs` | profile delivery-location save |
| `harness-locations.mjs` | onboarding + addresses cascade |

## Manual browser checklist (needs a real device / browser)

1. Create a customer account, sign out/in, open profile, save an address, favourite
   a venue, submit feedback — confirm each is visible after reload.
2. Complete checkout on `index.html`, then confirm the order shows in
   `order-manager.html` for the right business and in `eatouts-orders.html`.
3. Move an order through `new → accepted → preparing → ready → dispatched →
   delivered`; confirm the customer view + audit entries update.
4. As an owner, change `?biz=<other-id>` and confirm private data is refused.
5. Add a staff member, sign in as staff, confirm only allowed modules render and
   salary is hidden without the salary permission.
6. In a bottle store, confirm alcohol items are flagged and age-gated consistently.
7. Start onboarding, reload (draft resumes), switch type (data kept, hidden modules
   warned), then hit the publish/verification/setup-fee gate.
8. Set a food-truck day for today; confirm the public "today" location; leave a
   `liveNow` flag >12h and confirm it goes stale.
9. Cycle lodge room/housekeeping statuses; attempt an overlapping booking.
10. Submit feedback; confirm it appears in triage and its status is visible to the
    submitter.
11. Edit a blog post; confirm preview matches the public reader and drafts stay private.
12. Sign in as admin vs restricted staff; confirm disallowed tabs/actions are absent.
13. Prime a legacy `eatouts_db_v1` blob; load `index.html`; confirm migration runs
    once, the legacy key is retained, and no records duplicate on reload.
14. Reload `index.html` and re-check demo login, insecure-context warning and the
    current-order (cart) behaviour.
15. Export/import JSON, view an empty list, load with malformed JSON in
    `eatouts_manager_v1`, delete a target, and simulate a storage quota failure.

## Offline / deferred (do not pretend these exist)
- No server-side push, scheduled publish, or payment capture. WhatsApp actions open
  a message composer only; no "sent" claim is made.
- Analytics are event-derived and local; cross-device totals are unavailable and
  marked as such on the dashboards.
- `eatouts_audit_v1` is append-only from the UI (no edit/delete controls).

## Current automated result
- `npm test` → **22 passed, 0 failed**.
- Phase 8 harnesses → catalog (6), phase8 (10), checkout-prefill (4),
  food-truck (12), profile (6), locations (12) all green.
