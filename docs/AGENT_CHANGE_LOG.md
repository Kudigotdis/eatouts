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


