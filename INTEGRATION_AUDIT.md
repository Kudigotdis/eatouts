# EatOuts Integration Audit

Scope: fold the received EatOuts manager/auth/admin package and the four newer
`*1` spec workspaces into the root app so every page is one app with one store
contract. Companion doc: `INTEGRATION_DECISIONS.md` (locked choices).

Status: **Phases 1–9 complete** — inventory, conflict resolution, API contract, the four
spec pages wired and verified, unified sessions, roles, analytics, locations, workflow
glue, data-safety/UX pass, and the integration test plan. The remaining work is
**page-level gap fixing** (order bridge, Phase-8 hardening sweep, Phase-7 completions) —
tracked per page with repro details in **`HTML_ASSESSMENT.md`**.

---

## 1. The two sides

| Side | Location | Store | Built with |
|------|----------|-------|-----------|
| Root app (customer + operator 8-page back office) | project root | `EatoutsDB` / `eatouts_db_v2` (legacy `eatouts_db_v1`) | root `js/eatouts-db.js`, `js/eatouts-auth.js`, shell pages, run via `run-eatouts.bat` |
| Received package (manager / admin / customer accounts + next-iteration workspaces) | `staging/package/` (kept verbatim) | `EatoutsMgrDB` / `eatouts_manager_v1` | `js/eatouts-manager-db.js`, roles/users/feedback/blog/auth/manager modules |

The package's pages were earlier integrated and normalized to the platform
shell; they load `js/eatouts-manager-db.js`, roles, users, feedback, blog,
auth, manager plus `assets/eatouts-manager.css`.

## 2. The four page-pair conflicts

| Base (root) | Spec (`*1`) | Same original name |
|-------------|-------------|--------------------|
| `business-onboarding.html` | `business-onboarding1.html` | — |
| `operator-dashboard.html` | `operator-dashboard1.html` | — |
| `eatouts-staff-admin.html` | `eatouts-staff-admin1.html` | — |
| `food-truck-schedule.html` | `food-truck-schedule1.html` | — |

**Verdict (user-confirmed): keep all four `*1` spec pages; delete the base
duplicates.** Comparison criteria used: feature completeness, missing-API
surface, canonical naming, integration readiness. The base files were deleted;
only the `*1` files remain.

## 3. Missing API contract (what the spec pages needed)

Grep of the four wins against existing scripts pinned the surface to be
provided:

| API | Pages needing it | Where supplied |
|-----|------------------|----------------|
| `EatoutsDB.collection/find/upsert/remove` | all 4 | patched in `js/eatouts-data.js` |
| `EatoutsBlog.all()` (post list for staff admin blog tab) | staff-admin1 | `js/eatouts-data.js` (union of manager `blog` + legacy `eatouts_blog_posts_v1`) |
| `EatoutsBusinessTypes.all/get/normalize/roles` | onboarding1, operator-dashboard1, food-truck-schedule1 | `assets/data/business_types.js` (new) |
| `EatoutsAudit.log/list/clear` | all 4 | `js/eatouts-audit.js` (new, key `eatouts_audit_v1`) |
| `EatoutsFeedback.all/update` via `EatoutsMgrDB.collection('feedback')` | staff-admin1 | existing `js/eatouts-feedback.js` + manager-db |
| `EatoutsAuth.logout/getActiveBusiness/setActiveBusiness` | all 4 | existing `js/eatouts-auth.js` |
| `EO.esc/guard/metric/money/toast` | all 4 | existing `js/eatouts-manager.js` (`window.EO` at line 91) |

## 4. Script-loader mismatch (fixed)

None of the `*1` pages loaded `js/eatouts-manager-db.js` (the store behind
users/feedback/manager/auth) or `js/eatouts-data.js` (the adapter). Their loader
now is:

```
js/eatouts-db.js → js/eatouts-manager-db.js → js/eatouts-roles.js →
js/eatouts-users.js → js/eatouts-feedback.js → js/eatouts-blog.js →
js/eatouts-data.js → js/eatouts-auth.js → js/eatouts-manager.js →
js/eatouts-audit.js   (+ assets/data/business_types.js, all but staff-admin1)
```

0. Load order: manager-db must follow eatouts-db (patches it early enough is not
   required; it only seeds the manager namespaced store), and data.js needs
   EatoutsDB + EatoutsMgrDB + EatoutsBlog loaded before it (hence after
   eatouts-blog.js).

## 5. Link normalization (done)

Spec links that pointed at legacy underscore filenames now use the canonical
hyphenated pages that exist in the root:

- `eatouts-staff-admin1.html` → `eatouts-login.html`, `eatouts-admin-dashboard.html`,
  `feedback-manager.html`, `blog-creator-dashboard.html` (all occurrences).
- `operator-dashboard1.html` → `eatouts-login.html`.
- `business-onboarding1.html` → `eatouts-business-signup.html`.
- `food-truck-schedule1.html` → none needed.

## 6. Storage / key map (current reality)

| Key | Owner | Purpose |
|-----|-------|---------|
| `eatouts_db_v2` (legacy `eatouts_db_v1`) | `js/eatouts-db.js` | Root venue DB; adapter maps `restaurants` here |
| `eatouts_manager_v1` | `js/eatouts-manager-db.js` | Users, feedback, blog, businesses, ops records |
| `eatouts_session_v1` | `js/eatouts-auth.js:26` | Root auth session (object) |
| `eatouts_active_session_v2` | `js/eatouts-auth.js:325` | Manager session (user id string) |
| `eatouts_active_business_v2` | `js/eatouts-auth.js:326` | Active business id |
| `eatouts_blog_v1` / `eatouts_blog_cache_v1` | `js/eatouts-blog.js` | Existing blog store/cache |
| `eatouts_blog_posts_v1` | package spec | Legacy blog posts; read by `EatoutsBlog.all()` union |
| `eatouts_audit_v1` | `js/eatouts-audit.js` (new) | Audit trail (newest first, capped 500) |

Two session keys exist today — unifying them is Phase 3 (see decisions).

## 7. New / changed files in this phase

- New: `assets/data/business_types.js`, `js/eatouts-audit.js`, `js/eatouts-data.js`.
- Edited: `business-onboarding1.html`, `operator-dashboard1.html`,
  `eatouts-staff-admin1.html`, `food-truck-schedule1.html` (loaders + links).
- Deleted: `business-onboarding.html`, `operator-dashboard.html`,
  `eatouts-staff-admin.html`, `food-truck-schedule.html`.
- Edited: `copy-static.mjs` (adds the 4 pages to `FILES`), `HTML_PAGES.md`
  (spec-workspaces section).

## 8. Verification evidence

- `npm test` → **22 suites, 0 failed** (regression clean).
- `node copy-static.mjs` → 67 items staged incl. `js/eatouts-data.js`,
  `js/eatouts-audit.js`, `assets/data/business_types.js`, and the 4 pages.
- `node --check` on all module JS: clean.
- Inline `<script>` blocks of all 4 pages compile (vm, no execution): clean.

## 9. Progress + remaining gaps

Progress is recorded decision-by-decision in `INTEGRATION_DECISIONS.md` (D1–D16 cover
Phases 1–9; D17+ track post-integration cleanup and gap work). This audit's earlier
per-phase roadmap is superseded by the decisions doc plus `HTML_PAGES.md` (capabilities
per page) and `HTML_ASSESSMENT.md` (status + missing per page + prioritized checklist).

Remaining known gaps (from the 2026-10-11 assessment, so they are documented, not lost):

1. **Order bridge (Phase 6 critical).** Checkout (`index.html` + `customer-delivery.html`)
   round-trips a draft key `eatouts_order_v1`; nothing appends a completed order to
   `EatoutsMgrDB.orders` or a shared history store, so `order-manager.html`
   (`EatoutsMgrDB.orders`) and `eatouts-orders.html` (customer order list) only ever show
   seed rows. Desired fix: on checkout completion, persist a real order row to the shared
   store that both surfaces read; keep `tests/checkout-delivery.js` green.
2. **Missing spec routes.** No `eatouts-user-profile.html` / `eatouts-user-orders.html` /
   `eatouts-user-favourites.html` routes exist; Phase 1 aliases were never added.
   Desired fix: `_redirects` 301 aliases to the existing hyphenated pages.
3. **Phase-8 hardening gaps.** Pagination, delete confirmation, output escaping and audit
   calls are still missing on ~10 list/write pages (staff/order/room/billing/settings/
   quote/reservation/orders/favourites/analytics).
4. **Phase-7 completion gaps.** Menu modifiers/variants editor and event service linker are
   stubs; `eatouts-orders.html` Reorder/Replay and `eatouts-favourites.html` are static;
   operator order detail and onboarding preview are `alert()` placeholders.
5. **Pricing seed consistency (fixed 2026-10-11).** `js/eatouts-manager-db.js` seeded
   `settings.setupFee:450`; normalized to the canonical **P300** (`README.md` /
   `MARKETING_ONBOARDING_PLAN.md`). Note: `billing-manager.html` still hardcodes its own
   tier prices (BWP 250/450/850 + setup BWP 450) instead of reading the shared settings —
   flagged in the assessment.
6. **Deferred subsystems.** Customer review flow + `review-manager.html` (dropped by
   decision D-dropped), real APK install, push/SMS notifications, Cloudflare/Supabase media
   uploads for supplier/blog/event pages, legal review of partner terms, and a live
   one-pager QR/URL. These need external systems or product decisions and are
   intentionally out of scope for the cleanup-and-document pass.