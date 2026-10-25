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


### [2026-10-25 02:05:00] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - lock the two visible labels (header "Menu Options", #optMenu button "Menu") so they cannot drift
- Files changed:
  - tests/venue-about-options.js (header comments L3/L5 + 3 new assertions after L72)
  - docs/AGENT_CHANGE_LOG.md (this entry)
  - venue-about.html: DELIBERATELY UNTOUCHED (git diff -- venue-about.html is empty)
- Commit: e3949f0 (entry folded into the same commit)
- Push: single push, fa26579..e3949f0 -> origin/main (fast-forward), PUSH_EXIT=0
- Notes:
  Why: the user asked to "make sure" the labels stay as swapped in fa26579 - <summary>Menu Options</summary>
  for the group header (it also holds the Town/Area pickers) and <span class="val">Menu</span> for the
  #optMenu button. A promise is not a guard, so the requirement is now enforced by the suite instead of by
  memory: if either string changes, tests/venue-about-options.js fails.
  Change: 3 assertions added to the KFC block, anchored on DOM structure not on copy order -
    q('#optList').closest('details.acc').querySelector('summary').textContent === 'Menu Options'
    q('#optMenu .val').textContent === 'Menu'
    header !== 'Menu' (explicit anti-regression on the pre-fa26579 wiring)
  The two stale header comments (L3/L5 said "Menu" accordion while the header reads "Menu Options") were
  de-labelled to "options accordion" - the file is already named venue-about-options.js and the id is
  #optList, so those comments can no longer go stale on the next copy tweak. The lock is now the single
  place that names the copy, and it says to update it in the same commit as any intentional rename.
  Verified:
    - node tests/venue-about-options.js -> EXIT=0, 36 checks, 0 FAIL (was 33 checks before the 3 locks)
    - node tests/venue-about-menu.js    -> EXIT=0, 7 checks, 0 FAIL
    - git diff --quiet -- venue-about.html -> exit 0 (no drift; the file is byte-identical to fa26579)
    - tests/venue-about-options.js: 0 bare LF (CRLF preserved on the inserted lines)
    - node tests/run-all.js -> 55 passed, 2 failed. Both failures are PRE-EXISTING and unrelated:
      inventory.js (PAGE_INVENTORY.md lists 30 SPA screens vs 31 expected) and login.js (About page
      operator-businesses.html link + inline operator form). Neither suite references anything this
      commit touched (Select-String for venue-about-options / AGENT_CHANGE_LOG / "Menu Options" across
      both files: no hits), and PAGE_INVENTORY.md was last changed 2026-10-24 (c94c144) - before this
      work started. Left untouched on purpose: repairing them is a separate task.
  Not done (proposed and deliberately skipped, see the prior session's notes):
    - No CSS change for the wider header: .acc > summary has no nowrap/ellipsis/fixed height, and
      "Operating Hours" (15 chars) already ships in the same rule, so 12-char "Menu Options" can only wrap.
    - HTML_CATALOG.md / scripts/html_catalog.meta.json still describe the section as "Options" (they omit
      Hosting + Settings too). Fixing them means editing meta.json and running `npm run catalog`; left out of
      this commit to keep it a reviewable one-file diff.
    - Older ledger entries still describe the pre-swap label states. They are dated records of what was true
      at those commits, so they were NOT rewritten.
  Errors: none.


### [2026-10-25 01:28:49] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - swap the two "Menu" labels (accordion header <-> #optMenu button)
- Files changed:
  - venue-about.html (L679 and L1232 only)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: single push, 7cf166e..origin/main on 2026-10-25
- Notes:
  Why: after 1fa1d24 the accordion header read "Menu" while the #optMenu button inside it read "Menu
  Options", and the header also contained the Town/Area pickers. User asked to SWAP the two labels, so the
  header now describes the group ("Menu Options") and the button is the plain action ("Menu").
  Change:
    L679  <summary>Menu</summary>                                  -> <summary>Menu Options</summary>
    L1232 <span class="val">Menu Options</span></button>           -> <span class="val">Menu</span></button>
  Copy only. id="optMenu", class="opt", data-opt="menu", type="button", the delegated click handler and all
  CSS are byte-identical - the handler dispatches on data-opt, never on label text.
  How the swap was done safely: a sequential Menu->Menu Options then Menu Options->Menu would have
  collapsed both labels into one, so each line was replaced in place using a unique anchor
  (<summary>...</summary> for the header, the <span class="val"> prefix for the button) instead of a
  global find/replace.
  Verification:
    - git diff -> exactly 1 file, +2/-2, two hunks, nothing else.
    - <summary>Menu Options</summary> count=1 (L679); <summary>Menu</summary> count=0 (ABSENT).
    - <span class="val">Menu</span> count=1 (L1232); <span class="val">Menu Options</span> count=0.
    - <summary>Menu Tags</summary> untouched at L773 (a different accordion - excluded by the anchor).
    - <summary>Promos</summary> L660 and "Promos Gallery" L1234 untouched.
    - Structure guards intact: id="optMenu" data-opt="menu" type="button" (L1231), data-opt="promos"
      (L1233), id="optList" (L682).
    - Line endings: 1459 lines, CRLF pairs 1459, bare LF 0 (no line-ending damage).
    - node tests/venue-about-options.js -> PASSED, 33 checks, 0 failures, exit 0.
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, 0 failures, exit 0.
    - Full 55-suite run deliberately skipped: grepping tests/*.js found NO assertion on "Menu Options" or
      on the summary labels, so no other suite can observe this copy change. Last full run on this tree
      was 55 passed / 2 failed (pre-existing inventory.js + login.js only).
  Not verified: actual rendering. "Menu Options" is longer than "Menu" in the same <summary>, which is a
  flex row with no nowrap/ellipsis/fixed width, so clipping is not expected - still worth an eyeball.
  Deliberately UNCHANGED: all CSS, ids, data-opt values, handlers, HTML_CATALOG.md and
  scripts/html_catalog.meta.json.
- Errors: None


### [2026-10-25 01:21:47] - [Agent: Cline] - [COMMITTED]
- Task: tests - sync the venue-about-options.js L3 header comment to the "Menu" accordion
- Files changed:
  - tests/venue-about-options.js (L3 comment only)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: single push, c78a7bb..origin/main on 2026-10-25
- Notes:
  Why: 1fa1d24 updated L5 to describe a grey "Menu" accordion but left L3 reading 'Venue About "Options"
  accordion', so two comments in the same header block contradicted each other. L3 now reads
  'Venue About "Menu" accordion - town/area pickers, Menu & Promos.' Only the quoted label reference
  changed; the surrounding prose ("town/area pickers, Menu & Promos") was left exactly as-is.
  Comment-only. Zero assertion logic touched: no test, no fixture, no helper, no rename.
  Verification (targeted suites only - a comment cannot affect any other suite, so the full 55-suite run
  was deliberately NOT re-executed for this change):
    - git diff tests/venue-about-options.js -> EXACTLY one line changed (1 insertion, 1 deletion; the two
      +/- content lines are one removed + one added). Files changed = 1.
    - node tests/venue-about-options.js -> PASSED, 33 checks, 0 failures, exit 0 (count unchanged).
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, 0 failures, exit 0.
    - Full-suite context from the run on this same tree: 55 passed / 2 failed, the failures being only the
      pre-existing tests/inventory.js + tests/login.js. Unchanged and out of scope.
  Deliberately UNCHANGED: L5 (already correct since 1fa1d24), venue-about.html, all CSS, every other test
  file, .gitignore (including the fix*.ps.js line), HTML_CATALOG.md and scripts/html_catalog.meta.json.
- Errors: None


### [2026-10-25 01:11:07] - [Agent: Cline] - [COMMITTED]
- Task: chore - narrow .gitignore `fix*.js` to `fix_*.js` + `fix-*.js`
- Files changed:
  - .gitignore (L24 `fix*.js` replaced by L24 `fix_*.js` + L25 `fix-*.js`; every other line untouched)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit; resolve with `git log -1 --format=%h`)
- Push: same single push as the venue-about commit above, 1d8a895..origin/main on 2026-10-25
- Notes:
  Why: `fix*.js` was over-broad. It ignored ANY .js whose name starts with "fix", so a legitimate app
  file such as fixed-header.js (or fixlayout.js) would have been silently untracked with no warning.
  Narrowed to the prefix convention the one-off repair scripts actually use: "fix_" or "fix-".
  The replacement is STRICTLY NARROWER than the pattern it replaces, so it cannot newly ignore anything;
  it can only un-ignore. Line endings preserved (CRLF 76 -> 77, pre-existing bare LFs unchanged at 4).
  Pre-check (read-only, before editing): `git ls-files` matched ZERO files against (^|/)fix[-_].*\.js$,
  and `git ls-files -ci --exclude-standard` showed NO tracked file is currently ignored - so nothing
  could have been silently untracked under the old pattern either.
  check-ignore -v proofs (all five as requested):
    fix_payment.js        -> matched .gitignore:24:fix_*.js   (intended)
    fix-layout.js         -> matched .gitignore:25:fix-*.js   (intended)
    fixlayout.js          -> NOT matched (exit 1)             (intended - no dash/underscore)
    fixed-header.js       -> NOT matched (exit 1)             (intended - this is the point of narrowing)
    fix_venue_about_v2.py -> NOT matched by any .js pattern. It IS ignored, but by the PRE-EXISTING
                             unrelated rule now at .gitignore:78 `fix_venue_about*.py` (HEAD line 77).
                             Verified against HEAD that this rule predates the change and was not
                             touched. A .js pattern cannot match a .py, so there is no unintended
                             cross-extension match. Not treated as a stop condition.
  Deliberately UNCHANGED (as instructed): .gitignore L26 `fix*.ps.js`. Note this line is NOT redundant
  with the new patterns - it still matches dash-less/underscore-less .ps.js names (e.g. fixabc.ps.js)
  that neither `fix_*.js` nor `fix-*.js` covers, so it keeps its current scope. `gen*.js`, `genseed.js`,
  `testfix.js` and all other lines were left alone.
- Errors: None


### [2026-10-25 01:10:13] - [Agent: Cline] - [COMMITTED]
- Task: venue-about - differentiate the #optMenu button label as "Menu Options"
- Files changed:
  - venue-about.html (L1232 only: the #optMenu <span class="val"> text)
  - tests/venue-about-options.js (L5 comment only - it still described a grey "Options" accordion)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: this commit (entry folded into the stage commit as instructed; a commit cannot contain its own
  final SHA, so resolve with `git log -1 --format=%h`)
- Push: same single push as the .gitignore commit below, 1d8a895..origin/main on 2026-10-25
- Notes:
  Why: bb60ed4 renamed the accordion header to "Menu" and flagged (in that entry) that the accordion then
  read "Menu" while ALSO containing a button labelled "Menu". User asked to differentiate the button.
  Scope: copy only. Only the <span class="val"> text changed. id="optMenu", class="opt", data-opt="menu",
  type="button", the delegated click handler and the CSS are all untouched. The handler dispatches on
  data-opt, never on label text, so behaviour is identical.
  Deliberately UNCHANGED: <summary>Menu</summary> (L679), <summary>Promos</summary> (L660), the #optPromos
  "Promos Gallery" label (L1234), all CSS, ids, data-opt values and handlers. HTML_CATALOG.md and
  scripts/html_catalog.meta.json were NOT regenerated (dated artifacts stay as-is).
  Verification:
    - grep '<span class="val">Menu Options</span>' -> PRESENT, L1232.
    - grep '<span class="val">Menu</span>'         -> ABSENT (the guard is exact: "Menu Options</span>"
      does not satisfy the "Menu</span>" match).
    - node tests/venue-about-options.js -> PASSED, 33 checks, exit 0. Count unchanged - the only edit in
      that file is one comment line, so no assertion was added or lost.
    - node tests/venue-about-menu.js    -> PASSED, 7 checks, exit 0.
    - npm test -> 55 passed, 2 failed. The failures are exactly tests/inventory.js + tests/login.js
      ("PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31", "the About page links to
      operator-businesses.html", "the About page no longer has the inline operator form") - identical to
      the baseline already proven pre-existing in the bb60ed4 entry. No new failure.
  CORRECTION ON RECORD: the bb60ed4 entry quoted "34 checks" for venue-about-options.js. The true count is
  33. That was a reporting miscount by the agent, not a lost assertion (that suite's content is unchanged
  apart from the comment line below).
  tests/venue-about-options.js L3 (file header summary) still reads 'Venue About "Options" accordion'.
  Only L5 was in scope for this task, so L3 was left alone - flagged to the user rather than widened.
- Errors: None


### [2026-10-25 00:42:19] - [Agent: Cline] - [COMMITTED]
- Task: venue-about.html copy change - accordion header "Options" -> "Menu"; "Promos" button -> "Promos Gallery"
- Files changed:
  - venue-about.html (2 lines: L679 <summary> text, L1234 #optPromos label)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: bb60ed4
- Push: bb60ed4 + this changelog commit -> origin/main on 2026-10-25 (UTC)
- Notes:
  User request: on data-page="venue-about" rename the class="acc" accordion header "Options" to "Menu",
  then change "Promos" to "Promos Gallery" within that collapsed accordion.
  AMBIGUITY RESOLVED BY USER: the page contains the word "Promos" twice - the Promos accordion header
  (<summary>Promos</summary>, L660, wraps #promoCarousel) and the #optPromos button rendered inside the
  Options accordion (#optList, L1234). User chose the BUTTON only. L660 is therefore deliberately
  UNTOUCHED - it still reads "Promos".
  Scope: copy only. data-opt values (town,area,menu,promos), element ids (#optList/#optMenu/#optPromos),
  the click handler and the CSS are all unchanged, so behaviour is identical. The change ships as-is:
  venue-about.html is already in the deploy list (copy-static.mjs L49) and dist/ is gitignored (.gitignore L36).
  No CSS change needed: .acc > summary (L211-219) is a flex row with no white-space:nowrap, no ellipsis,
  no fixed width and no ::after chevron, so the longer "Promos Gallery" cannot clip.
  Verification:
    - git diff: 1 file, +2/-2 - only the two intended lines.
    - CRLF preserved: 0 bare LF, 1459 lines, no EOF change (diff = exactly 2 hunks).
    - node tests/venue-about-options.js -> PASSED (34 checks, exit 0).
    - node tests/venue-about-menu.js    -> PASSED (7 checks, exit 0).
    - npm test -> 55 passed, 2 failed (inventory.js, login.js).
  PRE-EXISTING FAILURES RE-PROVEN (not regressions): `git stash push -- venue-about.html` returned the
  tree to clean HEAD, and re-running just those two suites reproduced the SAME 3 failing checks -
  "PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31", "the About page links to operator-businesses.html",
  "the About page no longer has the inline operator form". Restored with `git stash pop`; venue-about.html
  SHA256 back to C79DB0998BBD2EC552296291AF1E86CF18DF2F99848D659EDACA012BDED6FFFD, stash list empty.
  KNOWN STALE ARTIFACTS (left on purpose, no code impact): tests/venue-about-options.js L5 comment still
  says 'renders a grey "Options" accordion'; HTML_CATALOG.md L1052 and scripts/html_catalog.meta.json keep
  the historical "Options accordion" wording. All are comments/dated records - no assertion reads the
  label text, so no suite can break. Not rewritten (minimal diff).
  REVIEW NOTE (flagged to user, proceeding as asked): the accordion now reads "Menu" as a header while
  also containing a #optMenu button labelled "Menu", and it still holds the Town/Area pickers.
- Errors: None


### [2026-10-24 23:54:02] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage C - archive the 4 superseded design folders to _archive_local/tier3/
- Files changed:
  - Deleted (50 tracked files): SORT_REDESIGNS_ARCHIVED_20261017/ (31), Onboarding Designs/ (12),
    dashboard htmls/ (6), DO NOT USE THESE/ (1)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: 4d138ef
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
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
5. `business_links.sql` epoch `8655508347967` is CONTENT-DERIVED (~2244 AD), not wall-clock. Do NOT
   "fix" it to a human date -- determinism requires it. V3-verified: no UI renders
   `business_links.created_at`/`updated_at` as human dates (only raw via `linkOut()`; client callers
   of `/api/links/*` don't surface these fields).
6. `_archive_local/tier1/` (20 files) is the ONLY archive without git-history recovery (Tier 1 was
   untracked when moved). Tier 2 recoverable at `a3f17aa^`; Tier 3 recoverable at `4d138ef^`. Back up
   `_archive_local/tier1/` separately before any future `_archive_local/` cleanup.

### [2026-10-24 23:52:52] - [Agent: Cline] - [COMMITTED]
- Task: Cleanup Stage B - archive Tier 1 local junk, delete Tier 2 tracked junk, harden .gitignore
- Files changed:
  - Deleted (17, git rm - recoverable from history): td_out.txt, build-output.txt, build-output2.txt,
    catalog-output.txt, final-test-output.txt, final2.txt, test-output.txt, integration_file.txt,
    check-page-titles.cjs, check-page-titles2.cjs, check-page-titles3.cjs, cleanup-temp.cjs,
    find-page-titles-end.cjs, td_find.cjs, td_find.js, td_find.mjs, fix_venue_about_v2.py
  - .gitignore (+19 lines)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commit: a3f17aa
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
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
- Commit: 04ac49f
- Push: 4d138ef + this changelog commit -> origin/main on 2026-10-24 (UTC)
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



### [2026-10-25 03:12:31] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 1 - role-scope Quotes/Bookings tabs (audit finding: gated by business type only)
- Files changed: operator-dashboard1.html
- Commit: PENDING
- Push: PENDING
- Notes: Added isCommercialOwner (isOwner + supplier/lodge_owner roles); quotes now requires supplier|caterer type AND commercial owner, bookings requires supplier|lodge type AND commercial owner. Platform roles unchanged. Role strings verified against js/eatouts-roles.js MATRIX.
- Errors: None

### [2026-10-25 03:16:02] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 2 - delete fabricated analytics (Math.sin engagement generator + hard-coded deltas)
- Files changed: restaurant-dashboard.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: deriveAnalytics() removed; localCounts() added; This month/Today/Top menu items/WhatsApp activity/billing summary now show only local record counts with honest copy; report JS takes counts instead of A; promo/event fake view counters removed. Verified node --check + node tests/dashboard.js PASSED.
- Errors: None

### [2026-10-25 03:26:40] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 3 - remove 'Real aggregates' claim + static SLA items; replace 'X of 3 free days' with real promo counts; fix dead promosSection render path
- Files changed: analytics-manager.html, CHANGELOG-remediation.md, dashboards/eatouts-bakery-dashboard.html, dashboards/eatouts-bottle-store-dashboard.html, dashboards/eatouts-caterer-dashboard.html, dashboards/eatouts-event-supplier-dashboard.html, dashboards/eatouts-mobile-kitchen-dashboard.html, dashboards/eatouts-restaurant-dashboard.html
- Commit: PENDING
- Push: PENDING
- Notes: Order schema has no stage timestamps so SLA timings were removed rather than computed. freeDaysUsed derived from activeDays of promos without feeCharged, capped at 3 (INCLUDED_PROMO_DAYS_PER_MONTH). node --check passed on all 7 files; X of 3 grep = 0.
- Errors: None

### [2026-10-25 04:05:11] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 4 - instrument every WhatsApp hand-off (wa.click) on the customer site
- Files changed: index.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: waLink(text,venue,template,context,venueId) now calls EatoutsAnalytics.track("wa.click",{template,venueId,context}) inside try/catch before returning the wa.me URL; js/eatouts-analytics.js added to the page (it was never loaded here); all 15 call sites pass a template id. Verified: 16 waLink refs = 1 definition + 15 tagged calls, inline script node --check OK, tests/run-all.js unchanged (2 pre-existing failures).
- Errors: None


### [2026-10-25 04:38:20] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 5 - bridge customer WhatsApp orders into eatouts_manager_v1.orders (+ legacy history)
- Files changed: index.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: Added bridgeBusinessId() (slug/restaurantId -> manager business id, fallback first restaurant business) and bridgeDraftOrder(source) writing one deduped order into eatouts_manager_v1.orders and eatouts_order_v1_history, syncing an already-loaded EatoutsMgrDB instance, clearing the draft only after both writes; wired before notifyFieldOrder at split-bill (:9552) and checkout (:9574). Verified with a jsdom boot of index.html: 12/12 checks incl. fresh operator boot listing the order; no window errors.
- Errors: None


### [2026-10-25 04:47:36] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 6 - re-anchor demo order timestamps to the seed moment so "Orders today" is non-zero
- Files changed: js/eatouts-manager-seed.js, tests/demo-seed.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: anchorDemoOrders() shifts DEMO.orders[].created so the newest is 5 minutes ago, formatted in Africa/Gaborone (same zone as operator-dashboard1.html:46); reanchorStored() migrates copies already in eatouts_manager_v1.orders only when created still equals the frozen dataset value; VERSION 2 -> 3.Verified with jsdom (3 stores): Orders today = 6 on 2026-10-25, no future stamps, spacing kept, legacy store migrated, hand-edited date preserved. tests/demo-seed.js version marker expectation updated 2 -> 3 (suite green).
- Errors: None


### [2026-10-25 05:05:12] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 7 - label the delivery-page demo fallback as sample data; align business_types module id with the reviews collection
- Files changed: assets/data/business_types.js, restaurant-delivery.html, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: module id 'review' -> 'reviews' in all seven business types (matches EatoutsDB.collection('reviews'); type.modules has no consumer). restaurant-delivery.html gains DEMO_SNAPSHOT (set only in the bdOrders() fallback branch) and renderDemoBanner() explaining that the 50-order snapshot is sample data with fixed dates; fallback kept. Verified with jsdom (scripts inlined): 6/6 checks incl. banner hidden when stored orders exist; node --check business_types.js OK; tests/delivery.js, tests/business-profiles.js, tests/demo-seed.js pass.
- Errors: None


### [2026-10-25 05:21:44] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 8 - confirm before ?demo=reset wipes the device store
- Files changed: js/eatouts-manager-seed.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: DB.reset() now runs only after window.confirm() returns true; the check fails closed when confirm is unavailable and declining falls through to the idempotent merge (no data loss). Verified with jsdom: 11/11 checks incl. Cancel keeps a real order + 40 demo rows, OK wipes and re-seeds, no prompt without the parameter.
- Errors: None



### [2026-10-25 05:55:02] - [Agent: Cline] - [COMMITTED]
- Task: Full-suite verification of the remediation work (commits 1-9)
- Files changed: none (verification only)
- Commit: n/a (record only)
- Push: PENDING (9 commits ahead of origin/main)
- Notes: `node tests/run-all.js` -> 55 passed, 2 failed. The two failures are pre-existing and unrelated to this work: (1) inventory.js "PAGE_INVENTORY.md lists all SPA screens -- 30 vs 31" (doc drift; no SPA screen was added/removed and PAGE_INVENTORY.md was not touched by any of the 9 commits); (2) login.js "About page links to operator-businesses.html" + "no inline operator form" (index.html still contains id="opWhats" and no operator-businesses.html href — verified both conditions also fail at origin/main 372f6b9, i.e. pre-existing). My index.html edits only shifted line numbers (8707 vs 8618). Untracked backup-pre-0014-20261025-030848.sql left untracked (D1 migration backup, out of scope).
- Errors: None

### [2026-10-25 05:31:10] - [Agent: Cline] - [COMMITTED]
- Task: Remediation commit 9 - align tests/wa.js with the templated waLink signature
- Files changed: tests/wa.js, CHANGELOG-remediation.md
- Commit: PENDING
- Push: PENDING
- Notes: the venue-aware rule assumed the venue was the last argument, so commit 4's new template/context args made 11 venue-aware calls look unvenueed. Rule now matches the venue as the 2nd argument, plus a new check that every call passes a template id (15 sites). node tests/wa.js PASSED.
- Errors: None


### [2026-10-25 06:15:00] - [Agent: Cline] - [COMMITTED]
- Task: Ship remediation - close the two pre-existing test failures and push
- Files changed: .gitignore, index.html, CHANGELOG-remediation.md
- Commits: 4126329 (.gitignore: ignore backup-pre-*.sql), 6e80117 (index.html: About Operator -> operator-businesses.html link + remove inline operator sign-in screen)
- Push: PENDING (push follows)
- Notes: One root cause closed both failures - index.html still had the inline operator sign-in (renderOperatorLogin / about-operator-login / id="opWhats") that plan .kilo/plans/eatouts-promo-listing-p9-p13.md Phase P9 had slated for removal in favour of operator-businesses.html. Removed the screen end-to-end (PAGE_TITLES entry, pageRef case, renderScreen dispatch, renderOperatorLogin + banner, 5 handlers, onLogin flag); button -> link. inventory.js now 30 vs 30 (no PAGE_INVENTORY.md edit needed); login.js link present + opWhats gone. backup-pre-0014-20261025-030848.sql ignored via new .gitignore rule (left on disk). scripts/seeds/restaurants.sql (regen timestamp churn) reverted to HEAD. Full suite: 57 passed, 0 failed (was 55/2).
- Errors: None


### [2026-10-25 05:53:48] - [Agent: Cline] - [COMMITTED]
- Task: Close the cross-tenant read in GET /api/business/contacts and GET /api/business/users
- Files changed:
  - functions/api/_business.js (new requireBusinessOwner helper, +14)
  - functions/api/business/contacts.js (+5/-1: import + guard in onRequestGet)
  - functions/api/business/users.js (+5/-1: import + guard in onRequestGet)
  - tests/api-business.js (+66/-1: 9 regression checks + 3 fake-D1 tables + 3 SELECT shapes)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Commits: 9894be8 (helper), 5065b5e (contacts GET), 8088509 (users GET), b404a9b (tests)
- Push: PENDING (push follows)
- Notes:
  Vulnerability: both GET handlers called requireSession only, then trusted the business_id query
  param, so any signed-in user could list another tenant's rows - contacts (phone numbers, titles) and
  team users (names, emails, whatsapp). The POST/PATCH/DELETE handlers in the same files already
  required ownership, so this was a read-only hole in an otherwise guarded route.
  Fix: extracted requireBusinessOwner(c, businessId) into _business.js - one SELECT id FROM
  business_profiles WHERE id = ? AND user_id = ? - and called it right after requireSession in both
  GETs. Response contract: blank id 400 business_id_required (unchanged), foreign id 404 not_found,
  unknown id 404 not_found. 404 for both cases on purpose: a 403 would confirm that another tenant's
  business id exists. Shape is { businessId } | { error: Response } to match requireSession/requireBusiness.
  Not done on purpose: business/services.js GET and business/profiles.js GET have the same shape (session
  only + business_id from the query) and return a foreign tenant's services / full profile. Out of scope
  for this task and left untouched - recorded as the follow-up list instead of being silently widened.
  Verified: node tests/api-business.js - 102 checks passed, including the 9 new ones (own 200, other
  tenant 404 not_found, signed-in non-owner 404, no session 401, no business_id 400, for both endpoints).
  node tests/run-all.js - 57 passed, 0 failed. Note: an earlier full run reported intake8.js failing;
  it passed standalone and on the re-run, so it is an intermittent jsdom boot flake, not a regression
  (no API handler is involved in that test).
- Errors: the first commit attempt ran the four git commands in parallel and hit .git/index.lock,
  which folded contacts.js into the helper commit. Recovered with git reset 81e61ab (mixed, nothing
  pushed yet) and re-ran the four commits sequentially - history is now one file per commit.


### [2026-10-25 07:11:45] - [Agent: Cline] - [COMMITTED]
- Task: Close the cross-tenant read in GET /api/business/services, and correct the earlier entry that also named GET /api/business/profiles as a leak
- Files changed:
  - functions/api/business/services.js (+5/-1: requireBusinessOwner import + guard in onRequestGet)
  - tests/api-business.js (+25/-1: business_services fake-D1 table, two seed rows, 4 regression checks)
  - docs/AGENT_CHANGE_LOG.md (this entry; the earlier entry's claim at :496 is DELIBERATELY left untouched)
- Commits: 663a45f (services GET guard), fde7f61 (regression checks), this entry (docs)
- Push: fc769fa..origin/main (fast-forward), PUSH_EXIT=0 - this docs record rides the same push
- Notes:
  RETRACTION FIRST. The contacts/users entry says business/services.js GET and business/profiles.js GET
  "have the same shape (session only + business_id from the query)". Half of that is false.
  business/profiles.js was read end to end: onRequestGet resolves membership inline at :58-61
  (SELECT ... FROM business_profiles WHERE id = ? AND user_id = ?; 404 when no row) before it fetches
  anything, so it is guarded exactly like requireBusinessOwner. It is not a hole and never was.
  How the wrong claim happened: the route files were swept with a regex for requireBusinessOwner /
  requireMembership calls. An inline owner SELECT does not match that pattern, so a guarded handler and an
  unguarded one score the same under grep. A pattern match is not a read; the correction was made by
  opening the files, not by re-running a better regex.
  Corrections are appended, never edited into the old entry: the wrong claim stays visible with the
  retraction underneath it, so the log keeps its history instead of quietly rewriting it. :496 is
  untouched on purpose.
  THE OTHER HALF WAS RIGHT. services.js GET called requireSession only, then ran
  SELECT * FROM business_services WHERE business_id = ? on whatever id the caller passed, so any signed-in
  user could list another venue's service names, descriptions and prices. Fix is the guard the
  POST/PATCH/DELETE handlers in the same file already used: requireBusinessOwner(c, businessId) right after
  the blank-id check. Contract unchanged: no session 401, blank business_id 400 business_id_required,
  foreign or unknown id 404 not_found (404 rather than 403 so the route never confirms another tenant's id).
  RE-AUDIT, BY READING. All 12 route files that export onRequestGet were opened and read in full -
  contacts, events, gallery, link, menu, mine, profile, profiles, promos, services, staff, users - plus the
  [id]-suffixed sub-routes that only carry PATCH/DELETE. Every GET resolves membership (requireMembership,
  requireBusinessOwner, requireMenuManager, or an inline owner SELECT) before its own SELECT. services.js
  was the only unguarded read in the route; no other handler needed a change.
  Verified: node tests/api-business.js -> 106 checks passed (102 + 4 new: own business 200 with the row,
  other tenant 404 not_found, signed-in non-owner 404, no session 401). node tests/run-all.js ->
  57 passed, 0 failed.
- Errors: None


### [2026-10-25 05:31:12] - [Agent: Cline] - [VERIFIED] [COMMITTED]
- Task: Close the one open claim from the services GET entry - "no live wrangler dev request was made" - by exercising the guard on a running route. No product code changed.
- Files changed:
  - docs/AGENT_CHANGE_LOG.md (this entry only)
- Verified:
  Environment: wrangler 4.148.0 on PATH (project pins ^4.151.0 in devDependencies; no node_modules/.bin, so npx resolved the global
  binary). wrangler.toml binds DB -> D1 eatouts and OPS_KV, and [vars] sets ENV = "development", so /api/auth/dev-login is live.
  Documented dev command is `npx wrangler pages dev dist` (package.json: preview / pages:dev); dist/ already built (2055 files), and
  Pages reads ./functions from the source tree, so the route under test is the working copy, not a stale bundle.
  Local state before the run: .wrangler/state/v3 D1 already had the full schema (business_profiles, business_services, users, ...)
  but 0 rows in each of the three tables used here - a clean slate, nothing of the user's to overwrite.
  Seeded for the run, via a temp .sql in %TEMP% (never inside the repo): users usr_rt_a / usr_rt_b, business_profiles biz_own
  (usr_rt_a) and biz_other (usr_rt_b), business_services svc_own (biz_own) and svc_other (biz_other, price 99.9).
  Server: npx wrangler pages dev dist --port 8788 --ip 127.0.0.1; GET /api/health -> 200
  {"ok":true,"env":"development","bindings":{"db":true,"kv":true,...}} after 3s.
  Session: POST /api/auth/dev-login {"email":"ambitious450@gmail.com"} -> 200 {"ok":true,"user":{"id":"usr_rt_a",...}}.
  Requests, run twice - once through Invoke-WebRequest with a cookie session, once through curl.exe with a cookie jar; identical results:
    GET /api/business/services?business_id=biz_own    -> 200 {"ok":true,"services":[{svc_own...}]}      (harness: 200)
    GET /api/business/services?business_id=biz_other  -> 404 {"ok":false,"error":"not_found"}          (harness: 404)
    GET /api/business/services?business_id=           -> 400 {"ok":false,"error":"business_id_required"} (harness: 400)
    GET /api/business/services (no session)           -> 401 {"ok":false,"error":"not_authenticated"}   (harness: 401)
    GET /api/business/services?business_id=biz_nope   -> 404 {"ok":false,"error":"not_found"}          (unknown id, same as foreign)
  svc_other / price 99.9 appears in no response body. The live route behaves identically to the fake-D1 harness on all four cases.
  ADMIN FLAG DOES NOT BYPASS THIS GUARD - worth recording. The single email in DEV_LOGIN_EMAILS is also the single email in
  ADMIN_EMAILS, so the session in this run was an admin session (isAdmin:true), and it still got 404 on biz_other.
  That is correct, not a bug: requireBusinessOwner (_business.js:51-59) is a plain
  SELECT id FROM business_profiles WHERE id = ? AND user_id = ? with no admin branch, unlike requireBusiness, which
  deliberately reports admins as 'owner'. So the observed 404 holds for admin and non-admin sessions alike, since the isAdmin
  flag is never consulted on this path. Nothing changed here - noted so a future reader does not "fix" the missing bypass.
  Teardown: taskkill /PID <cmd> /T /F, port 8788 no longer listening, no workerd/wrangler processes left. Seeded rows deleted and
  counts confirmed back to profiles 0 / services 0 / users 0, so local D1 is as it was found. One local KV session row remains in
  the gitignored .wrangler/state/v3 - harmless, expires like any session.
- Not done, on purpose:
  Phase 2 wrote the one-page decision brief for D1 (canonical business-type slug), D2 (normaliseType() silent 'restaurant'
  default) and D3 (one definition of money) and delivered it in-session. Zero files touched for D1/D2/D3, nothing committed for
  them: all three are waiting on a human pick, not on an agent. This entry is the only commit from the session.
- Errors: two `wrangler d1 execute --local` calls issued in parallel collided with
  "Failed to get session commit token: internal error"; local D1 commands must be run one at a time.


### [2026-10-25 05:33:40] - [Agent: Cline] - [COMMITTED]
- Task: Record the push of the live-route verification entry
- Files changed: docs/AGENT_CHANGE_LOG.md (this record only)
- Commit: 195e339 (live-route verification entry)
- Push: 80be862..195e339 origin/main (fast-forward), PUSH_EXIT=0; HEAD == origin/main == 195e339
- Notes: Docs only. No product code was touched in this session; D1 (canonical type slug), D2 (normaliseType silent
  default) and D3 (one definition of money) remain undecided and unedited.
- Errors: None



### [2026-10-25 07:56:43] - [Agent: Cline] - [D1 COMMIT 2/7: data] - [COMMITTED]
- Task: D1 step 2 - rewrite stored spellings to the canonical slugs and re-emit the generated link artifacts.
- Files changed:
  - migrations/0015_canonical_business_types.sql (new, 72 lines) - 4 scoped UPDATEs (business_links + favourites, x bottlestore +
    foodtruck), all `WHERE type IN (<old>, <new>)` so re-running is a no-op; header records the WHY, the supplier deferral, the
    "ship code before --remote apply" ordering, and the rollback-as-comment decision.
  - scripts/build_link_registry.mjs:193 ('bottle_store' -> 'bottlestore') - MOVED HERE from the original commit-3 list. Reason: the
    seed SQL and link_registry.json are generated, so commit 2 cannot emit new-spelling data while its own generator still says
    `bottle_store`. Leaving it for commit 3 would have made commit 2 verify nothing.
  - scripts/seeds/business_links.sql (regenerated) - 47 rows changed type; 838 rows before and after.
  - assets/data/link_registry.json (regenerated) - 47 entries changed type; 838 slugs, identical slug set, 0 added, 0 removed.
- Verified (probe rows, local D1, then cleaned up):
  BEFORE  business_links: bottle_store=1, food_truck=1, liquor_store=1, supplier=1
  BEFORE  favourites    : bottle_store=1, food_truck=1, promo=1
  AFTER   business_links: bottlestore=2,      foodtruck=1,         supplier=1   <- 4 rows in, 4 rows out, supplier untouched
  AFTER   favourites    : bottlestore=1,      foodtruck=1,         promo=1      <- ?type=promo survived, as the WHERE clause intends
  Row-level: bottle_store:rt-bottle -> bottlestore:rt-bottle, liquor_store:rt-liquor -> bottlestore:rt-liquor,
  food_truck:rt-truck -> foodtruck:rt-truck, supplier:rt-supp untouched.
  Idempotency: replayed `wrangler d1 execute --file migrations/0015...` after the tracked apply -> "5 commands executed", counts
  identical (bottlestore=2, foodtruck=1, supplier=1). No double-mapping, no drift.
  Cleanup: DELETE favourites (fav_rt%), users (usr_rt_probe), business_links (blk_rt%) - probe user needed because
  favourites.user_id is FK-constrained, which is why the first INSERT attempt failed with FOREIGN KEY constraint failed.
  Artifacts: `npm run link-registry` -> "wrote 838 links ({restaurant:476, bottlestore:47, supplier:315})". HEAD-vs-worktree
  line diff for business_links.sql: onlyOld=47 onlyNew=47, every pair differing exactly at `bottle_store` -> `bottlestore`
  (codepoints e,_,s,t -> e,s,t,o). link_registry.json: 47 type-only changes, 0 other fields, sameSlugSet=true.
- Note on diff size: business_links.sql shows 838 lines changed, not 47. That is by design - the generator derives created_at from a
  content hash ("content-derived epoch (was Date.now()) - deterministic; changes iff inputs change", build_link_registry.mjs:226-231),
  so editing any input re-stamps every row. Verified the timestamps are the only other change by stripping the trailing
  `, <ts>, <ts>);` from both revisions and diffing again.
- Errors: first favourites probe INSERT failed (FOREIGN KEY constraint failed) because no such user existed; added users row
  usr_rt_probe and retried. Rolled back with the probe cleanup above.

### [2026-10-25 07:50:20] - [Agent: Cline] - [D1 COMMIT 1/7: catalog] - [COMMITTED]
- Task: D1 step 1 - make the field enum use the canonical slugs bottlestore and foodtruck. Supplier DEFERRED by human decision
  (option A): business_links holds 315 `supplier` rows and 0 `event_supplier`, and `supplier` is canonical in
  business_types.js (which drives onboarding/dashboard routing), link.js:14, [slug].js:77 and _business.js:178. Only this enum
  says `event_supplier`, so flipping it would be a 315-row guess. Not touched in commits 1-4; recorded, not fixed.
- Files changed:
  - js/eatouts-field.js (header "locked rules" line 18-19; FIELD_TYPES keys liquor_store->bottlestore, food_truck->foodtruck;
    a 4-line comment above FIELD_TYPES naming the supplier split; normaliseType alias branches expanded)
  - migrations/0004_business_links.sql:27 (column comment bottle_store -> bottlestore)
  - tests/field.js (4 assertion clusters moved to the new canonical values; 3 new alias assertions)
- Verified:
  FIELD_TYPES = { restaurant, bottlestore, event_supplier, foodtruck, caterer } (5 keys, unchanged count).
  Alias branches must sit ABOVE the FIELD_TYPES[t] lookup or legacy venues would now fall through to the unknown-type path, so
  the branches were EXPANDED, not just re-pointed: liquor_store / liquor-store / liquorStore were added (they used to resolve via
  the FIELD_TYPES key that no longer exists), and food_truck / foodTruck likewise. Every old spelling still resolves:
    normaliseType('bottle_store') -> 'bottlestore'   normaliseType('liquor_store') -> 'bottlestore'
    normaliseType('food_truck')   -> 'foodtruck'     normaliseType('food-truck')  -> 'foodtruck'
    normaliseType('supplier')     -> 'event_supplier' (unchanged)
  Tests: node --check clean on both files; node tests/field.js -> 142/142 checks passed (was 137/139 before the alias additions).
  FIELD_SEED still emits 5 per type because it normalises through normaliseVenue (eatouts-field.js:767-769).
- Correction found while editing (C1 was incomplete, now closed): tests/field.js had FOUR clusters tied to the old canonical
  values, not three. The missed one was :94, the `FIELD_TYPES has <type>` loop, which surfaced as
  "FAIL FIELD_TYPES has liquor_store / has food_truck" on the first run. Fixed in this commit; noted here so the record shows
  the test was red before it was green, not that it never broke.
- Errors: None (git LF->CRLF warnings only, pre-existing repo behaviour).


### [2026-10-25 08:20:00] - [Agent: Cline] - [D1 COMMIT 3/7: consumers] - [COMMITTED]
- Task: D1 step 3 - teach every runtime consumer that reads or writes a business type to accept the canonical slugs
  (bottlestore / foodtruck) while still resolving every legacy spelling. Five files, 35 insertions / 8 deletions.
- Files changed:
  - functions/[slug].js (kindForType: +bottlestore/bottle_store/bottle-store/liquor_store -> 'bottle_store',
    +foodtruck/food_truck/food-truck -> 'foodtruck'; header comment at :80 says the client vocabulary is unchanged)
  - functions/api/me.js:16-23 (onboardingState: bottlestore counted with bottle_store/bottle-store/liquor_store,
    accumulator is `+=` because one user can hold rows under several spellings and the GROUP BY splits them)
  - functions/api/business/link.js:14-24 (TYPES map now an accept-alias -> canonical-slug map) + :49-51
    (`TYPES[type]` lookup and `if (!type) return invalid_type`, so an unknown spelling still 400s)
  - js/eatouts-business-signup.js:107-113 (linkTypeOf: same alias set, returns canonical)
  - eatouts-customer-signup.html:1364 (onboarding favourite writes type:'bottlestore' instead of 'bottle_store')
- Verified:
  node --check clean on me.js, link.js, eatouts-business-signup.js and - because [slug].js is ESM -
  `Get-Content -LiteralPath 'functions/[slug].js' -Raw | node --check --input-type=module` (a plain `node --check` on a
  .js ESM file fails on its own `import` statement and would have "passed" a file it never parsed; the bracket in the
  filename also needs -LiteralPath, PowerShell treats [slug] as a wildcard and silently checks nothing otherwise).
  Targeted suites: node tests/venue-slug.js -> 31 checks passed; node tests/router.js -> 72 checks passed;
  node tests/venue-slug-integration.js -> all integration checks passed. The last two matter most because their
  fixtures still carry type:'bottle_store' (tests/router.js:62, tests/venue-slug.js:35) and tests/venue-slug.js:138
  still asserts meta.kind === 'bottle_store' - they are the regression proof that the alias path, not just the new
  spelling, is live.
  Full suite: node tests/run-all.js -> 57 passed, 0 failed.
- Grep sweep of what is DELIBERATELY left as legacy spelling (recorded so a future reader does not "fix" them):
  - functions/[slug].js:83 and venue-about.html:882 still EMIT kind 'bottle_store'. Only the accepted input widened;
    the client renders 'bottle_store' | 'catering' | 'restaurant' today, and changing what the page receives is a
    different change with its own blast radius (index.html card renderers).
  - tests/router.js:62, tests/venue-slug.js:35, tests/field.js:336 keep legacy fixtures on purpose - they are the
    "old rows still resolve" assertions.
  - bottle-store-onboarding.html:1544 posts type:'liquor_store'; that is a shipped alias and link.js maps it, so it
    stays until that page is rewritten for other reasons.
  - js/eatouts-field.js:741-742 seeds by 'liquor_store'/'food_truck' prefixes; aliases resolve them.
  - assets/data/business_types.js:76-95 keeps its own alias map (bottle-store, liquorStore, foodTruck, ...); it is the
    client-side normaliser that runs before any API call, so it is upstream of everything here.
- Not changed, on purpose: link.js/me.js do not accept the camelCase spellings (liquorStore, foodTruck) that
  business_types.js and eatouts-field.js do. Grep proves nothing POSTs camelCase - those two files are the only
  occurrences outside the data file - and business_types.js normalises before the request is built, so adding them to
  the server maps would be two aliases with no producer. Supplier stays split exactly as commit 1 recorded it.
- Errors: None. `git diff --stat` prints LF->CRLF warnings for all five files (pre-existing repo behaviour, Windows
  autocrlf), not a content change.


### [2026-10-25 08:36:00] - [Agent: Cline] - [D1 COMMIT 4/7: regression tests] - [COMMITTED]
- Task: D1 step 4 - lock the commit-3 behaviour in the suites, tests only (no product code in this commit).
- Files changed:
  - tests/api-business.js (+41/-1: `favourites: []` on the fake-D1 store, two fake SQL handlers -
    `SELECT * FROM users WHERE id = ?` and the onboarding `SELECT type, COUNT(*) AS n FROM favourites ... GROUP BY type`
    mirroring D1 semantics - an `me.js` import, and 5 checks)
  - tests/field.js (+14: a legacy-spelling write block before the summary, 3 checks)
  - docs/AGENT_CHANGE_LOG.md (this entry)
- Verified:
  node tests/api-business.js -> 111 checks passed (106 + 5).
  node tests/field.js -> 145/145 checks passed (142 + 3).
  What the new checks actually pin down:
    me: 'bottlestore' (migrated) counts as the bottle-store pick, 5 restaurants + 1 bottlestore => complete
    me: 'bottle_store' (pre-0015) AND 'liquor_store' (older) on the SAME user => bottleStore 2, still complete
        - this is the assertion that keeps the `+=` accumulator honest; with `=` it reads 1 and fails
    me: 5 restaurants + 2 'promo' favourites => bottleStore 0, complete false (the type allowlist is closed)
    field: a venue written with type 'bottle_store' / 'liquor_store' / 'food_truck' is stored and read back as
        bottlestore / bottlestore / foodtruck - the field module never persists a legacy spelling
  Why the fake SQL handlers were added rather than mocked: fakeDB throws 'unhandled SQL' on anything it does not
  model, so the moment me.js changes its query this suite fails loudly instead of silently returning an empty result.
- Notes: the field block writes its three venues with ids ve-t-d1-* and M.remove()s them before the summary, so the
  25-venue seed assertions and the directory-mirror counts above it are unaffected.
- Errors: None.


### [2026-10-25 09:02:00] - [Agent: Cline] - [D2 COMMIT 5/7: normaliseType] - [COMMITTED]
- Task: D2 - remove the silent 'restaurant' default from normaliseType() and stop guessing at the rows it used to swallow.
- Files changed:
  - js/eatouts-field.js:130-139 (normaliseType returns null for an unknown type, comment explains why)
  - js/eatouts-field.js:143-147 (venueDefaults keeps an untracked type verbatim: `normaliseType(type) || String(type || '')`)
  - js/eatouts-field.js:203-209 (normaliseVenue does the same for raw.business_type || raw.type || fallback)
  - js/eatouts-field.js:240-262 (allVenues() filters on the presence of `b.type || b.business_type` instead of on
    normaliseType()'s old always-truthy result, and pushes the unclassifiable rows into `_skipped`; new exported
    `skippedVenues()` returns a copy)
  - tests/field.js:114-115 (banana -> null, '' / undefined -> null), :139-142 (an untracked type is kept verbatim),
    :168-186 (bakery survives allVenues, is not a restaurant, is not in fieldVenues; a typeless row is skipped and
    reported; skippedVenues resets)
- Verified:
  node --check clean on both files. node tests/field.js -> 152/152 checks passed (145 + 7).
  Full suite: node tests/run-all.js -> 57 passed, 0 failed.
  What actually changes in behaviour:
    F.normaliseType('bakery')        'restaurant' -> null      (callers decide, the module no longer lies)
    F.venueDefaults('bakery')        business_type 'restaurant' -> 'bakery'
    F.normaliseVenue({type:'bakery'}) business_type 'restaurant' -> 'bakery'
    allVenues() row with no type     silently 'restaurant' -> left out, returned by skippedVenues()
  Why this is the fix and not a rename: normaliseType's old fallthrough meant a bakery or an event supplier row
  read through the field stack came back as a restaurant, so it was counted in the restaurant buckets and rendered
  with the restaurant label. Four call sites read the return value - venueTypeLabel (:123), venueDefaults (:146),
  normaliseVenue (:207) and the old allVenues filter (:253) - and every one of them was updated in this commit;
  there is no fifth caller (git grep normaliseType, 2026-10-25).
- Not touched, on purpose: functions/api/upload.js:34 has its own unrelated normaliseType() for content types.
  venueTypeLabel stays null-safe (FIELD_TYPES[null] is undefined -> falls back to the raw string).
- Errors: None.

