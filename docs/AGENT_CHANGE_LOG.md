# AGENT CHANGE LOG

This file is the source of truth for all agent-initiated changes. Every time an agent makes modifications, it MUST append an entry here. This log is committed to git so memory survives across sessions/agents.

## Format
```
### [YYYY-MM-DD HH:MM:SS] - [Agent: <agent-name>] - [Status: IN_PROGRESS|COMMITTED|FAILED|SKIPPED]
- Task: <short description>
- Files changed: <comma-separated or list>
- Commit: <sha or "PENDING">
- Push: <sha/ref or "PENDING" or "FAILED">
- Notes: <reasoning>
- Errors: <exact error if any>
```

---


### [2026-10-24 23:54:02] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage C - archive the 4 superseded design folders to _archive_local/tier3/
- Files changed:
  - Deleted (50 tracked files): SORT_REDESIGNS_ARCHIVED_20261017/ (31), Onboarding Designs/ (12),
    dashboard htmls/ (6), DO NOT USE THESE/ (1)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: Stage C
- Push: pending
- Notes:
  All 50 files were COPIED byte-for-byte into _archive_local/tier3/<original-folder-name>/ and
  verified by SHA256 BEFORE removal: 31/31, 12/12, 6/6, 1/1 = 50 files, 0 hash mismatches. Only then
  were the originals removed with `git rm -r` (still recoverable from git history). _archive_local/
  is gitignored, so the archive stays local and out of the client-facing repo.
  Superseding evidence confirmed earlier: the menu-selector feature is already integrated into
  index.html (asserted by tests/restloc.js) and supplier_onboarding_catalog.js was merged into
  assets/data/supplier_catalog.js. NOTE: `SORT THIS/Pop-Up States Plan.txt` and
  `code-implement-task.html` are unintegrated FUTURE work - they were archived in Stage B, not
  deleted, so they remain available locally.
  Tier 4 deliberately UNTOUCHED: staging/ (48), reference/ (4), dashboards/ (6).
  Verification: after `npm run build`, `git diff --no-index` between dist/ and the C:\tmp\dist-before
  baseline exited 0 - dist byte-identical (2055 = 2055 files). Also ran a further build after the
  commit: git status CLEAN. Total cleanup across Stages B and C changed ZERO shipped bytes.
  FINAL STATE: 17 + 50 = 67 tracked junk files removed; 20 local junk files archived; working tree clean.
- Errors: None

## Open issues / not addressed
1. `.gitignore` line 24 `fix*.js` is too broad - it also matches legitimate names like
   `fix-layout.js` or `fixtures.js`-adjacent helpers. Suggested future form: `fix_*.js` + `fix-*.js`.
   Deliberately NOT changed during this cleanup (out of scope, and would risk un-ignoring files).
2. `eatouts-designers-demo-seed.json` and `eatouts-designers-demo-agent-prompt.md` exist and are
   tracked at the repo root, but they are NOT in the copy-static.mjs deploy list, so they will not
   ship. If any page links to them the link would 404 in production. Needs a product decision:
   deploy them, or move them to a non-deployed docs location.
3. Build non-determinism: RESOLVED in this session (commit 04ac49f). Three causes removed -
   unsorted Map iteration, `Date.now()` stamped into all 838 business_links rows, and a wall-clock
   `buildStamp`. Two consecutive builds are now byte-identical and leave git status clean.
4. PRE-EXISTING test failures - NOT caused by this cleanup. `npm test` reports 55 suites passing and
   2 failing; both were reproduced unchanged at the pre-session commit 22f67ad in a throwaway
   worktree, so this cleanup introduced ZERO regressions:
   a) `tests/login.js` - 2 of 30 checks fail: "the About page links to operator-businesses.html" and
      "the About page no longer has the inline operator form". The About page markup and this test
      have drifted apart (one still expects the removed inline operator form / the other link).
   b) `tests/inventory.js` - 1 of 19 checks fails: "PAGE_INVENTORY.md lists all SPA screens --
      30 vs 31". PAGE_INVENTORY.md is one SPA screen behind the banner markers in index.html.
      PAGE_INVENTORY.md is hand-maintained (scripts/update-inventory.mjs is read-only and never
      rewrites it), so this needs a human edit to add the missing screen row.
   Both were left untouched: fixing them is outside the scope of this cleanup and requires product
   decisions about which About-page markup and which SPA screen are intended.

### [2026-10-24 23:52:52] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage B - archive Tier 1 local junk, delete Tier 2 tracked junk, harden .gitignore
- Files changed:
  - Deleted (17, git rm - recoverable from history): td_out.txt, build-output.txt, build-output2.txt,
    catalog-output.txt, final-test-output.txt, final2.txt, test-output.txt, integration_file.txt,
    check-page-titles.cjs, check-page-titles2.cjs, check-page-titles3.cjs, cleanup-temp.cjs,
    find-page-titles-end.cjs, td_find.cjs, td_find.js, td_find.mjs, fix_venue_about_v2.py
  - .gitignore (+19 lines)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: Stage B
- Push: pending
- Notes:
  Tier 1 (20 files, 473.5 KB) moved byte-for-byte to _archive_local/tier1/ preserving structure:
    _trash/ (13), SORT THIS/ (3), _headers.bak (1), venue-about.html.bak.20261020-* (3).
    Nothing deleted; the source folders are now empty. _archive_local/ is gitignored.
  Tier 2 (17 files, 1775.6 KB = 1.73 MB) removed with `git rm`. Pre-deletion checks:
    - All 17 absent from copy-static.mjs => never deployed.
    - Zero code references for 16 of them. `integration_file.txt` has 11 hits, but every one is a
      PROSE CITATION in a comment ("See integration_file.txt 12"), never a file read - it is a spec
      doc, not a data input. Because 11 comments still cite it, a copy was preserved to
      _archive_local/tier2/integration_file.txt before removal.
  .gitignore gained 12 patterns: _archive_local/, td_out.txt, td_find.*, build-output*.txt,
  *-output.txt, final*.txt, integration_file.txt, check-page-titles*.cjs, find-page-titles-end.cjs,
  cleanup-temp.cjs, fix_venue_about*.py, *.bak.*. Line 24 (`fix*.js`) deliberately LEFT UNCHANGED.
  Verification (the payoff of the determinism fix): after `npm run build`, `git diff --no-index`
  between dist/ and the C:\tmp\dist-before baseline exited 0 - dist is byte-identical (2055 = 2055
  files). Cleanup changed zero shipped bytes. Build produced NO churn.
- Errors: None

### [2026-10-24 23:48:56] - [Agent: Cline] - [COMMITTED]
- Task: Make the build deterministic (stop pre-existing generated-file churn at source)
- Files changed:
  - scripts/build_link_registry.mjs (sorted Map iteration; content-derived epoch replacing `Date.now()`)
  - scripts/build_restaurant_directory.py (content-derived `buildStamp` replacing `time.time()`; `time` import dropped, `hashlib` added)
  - scripts/seeds/business_links.sql (regenerated)
  - assets/data/restaurant_listings/eatouts_manifest.js (regenerated)
  - assets/data/link_registry.json (regenerated - key order follows the now-sorted candidates; key set unchanged)
  - docs/AGENT_CHANGE_LOG.md (this entry, amended into the same commit)
- Commit: A-FIX.5
- Push: pending
- Notes:
  Three independent non-determinism sources were removed:
    1. `scripts/build_link_registry.mjs` iterated a `Map` without sorting -> candidates/rows followed
       insertion order. Now sorted by brand key (defence-in-depth).
    2. `scripts/build_link_registry.mjs` stamped EVERY row's `created_at`/`updated_at` with
       `Date.now()` -> all 838 lines churned on every build. Now a sha256 over the sorted candidate
       set, folded into a 13-digit integer (same magnitude as a Date.now() value).
    3. `scripts/build_restaurant_directory.py` set `buildStamp = int(time.time() * 1000)` -> new value
       every build, shipped in `eatouts_manifest.js`. Now a sha256 over the canonically-serialised
       manifest inputs (sorted keys), folded into a 13-digit int. Field name and type (int) unchanged.
  Audit justification (STAGE A-PRE):
    - A0.1 `buildStamp` is a genuine READ for cache invalidation: js/eatouts-brand.js `logoRev()` ->
      `bustPath()` appends `?v=<buildStamp>` to `assets/logo/*` URLs. Decision (user-approved) was to
      keep the field and make it content-derived: the documented intent ("edited logo art is fetched
      with a new URL") still holds - it now busts iff content changes instead of on every no-op build.
    - A0.2 `business_links.sql` row order is NOT load-bearing: every statement is `INSERT OR IGNORE`
      keyed on unique `id`; no test parses the file (tests use in-memory stubs); no FK constraints.
    - Slug-collision check: the dataset has exactly ONE numeric-suffixed slug
      (`fairgroundholdingsptyltdtabotswanaconfer2`, supplier). Its collision partner is a restaurant,
      and all restaurants are pushed before suppliers, so sorting CANNOT reassign that suffix.
      Verified post-build: id set is identical (838 = 838), no slug reassignment.
  CONSCIOUS DATA-CONTENT CHANGE (user-approved): `business_links.sql` row timestamps change ONCE,
  from wall-clock to content-derived (currently 8655508347967). `INSERT OR IGNORE` means existing D1
  rows are untouched; fresh loads see the derived epoch. All future builds are stable.
  Determinism proof (A-FIX.4): two back-to-back `npm run build` runs produced byte-identical
  `business_links.sql` (1BB092BB...) and `eatouts_manifest.js` (12EDA7FB...).
- Errors: None

### [2026-10-24 19:47:00] - [Agent: Big Pickle] - [COMMITTED]
- Task: Sync generated artifacts for live deploy (eatouts.site)
- Files changed: 759 files (see git status)
- Commit: c94c144
- Push: 3266ecc..c94c144 main -> main
- Notes: Ran npm run build, git add -A, committed with "chore: sync generated artifacts for live deploy", pushed to origin/main
- Errors: None

### [2026-10-24 08:06:28] - [Agent: Big Pickle] - [IN_PROGRESS]
- Task: Deploy fix - mirror live site to local build state
- Files changed: assets/data/restaurant_listings/eatouts_manifest.js, scripts/seeds/business_links.sql (plus build artifacts in dist/ - will be staged)
- Commit: PENDING
- Push: PENDING
- Notes: Ran npm run build. These appear to be generated files; will stage all as instructed.
- Errors: None


