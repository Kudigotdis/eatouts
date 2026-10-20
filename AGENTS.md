# AGENTS.md - Golden Rules for EatOuts AI Agents

Read this before touching any file. If unsure, stop and ask the operator.
The operator is a NON-DEVELOPER. Follow Section 1 strictly.

## 1. Operator protocol

- ONE terminal command per message. Wait for paste-back. Confirm. Then next.
- Do NOT chain fix + commit + push in one command.
- The operator uses PowerShell (not bash). Never use head/tail/grep/cat/diff.
  Use: Select-Object -First N, Select-String, Compare-Object, Get-Content.
- Before: say what the command does. After: say what expected output looks like.
- Never use Set-Content / Out-File -Encoding UTF8 to rewrite existing JS/JSON
  data files. It double-encodes non-ASCII bytes. See Section 3.

## 2. Which file is the real source of truth

| Page | LIVE source (edit this) | Dead - do not edit |
|---|---|---|
| Catering (data-page=catering) | assets/data/CateringServicesDatabase.js | assets/data/catering_services_database.json, tests/catering_businesses_database.json, eatouts_restaurants_list.json |
| Bottle/liquor directory | assets/data/BottleLliquorStoresDatabase.js | - |
| Restaurant directory | assets/data/restaurant_listings/directory_runtime_data.json (via scripts/build_restaurant_directory.py) | eatouts_restaurants_list.json |
| Supplier directory | assets/data/event_supplier_demo_catalogue.js | - |
| Slug-to-id registry | assets/data/link_registry.json (GENERATED, do not hand-edit) | - |

If the page change edits a file that is NOT in the LIVE column, it will NOT reach
the browser. Stop, find the LIVE file.

## 3. The encoding trap (broke a real deploy on 2026-10-20)

Files contain the diacritic-stripping regex:  [\\u0300-\\u036f]

If a tool rewrites the file while treating bytes as Latin-1 or double-encoding,
the range becomes U+00CC U+20AC - U+00CD U+00AF (a Latin-1 re-encoding of the
combining-diacritics range). Browsers reject it:
  SyntaxError: Invalid regular expression: Range out of order in character class
The WHOLE FILE stops executing. The page renders nothing. NOT a cache issue.

NEVER use on existing data files:
  - Set-Content -Encoding UTF8
  - Out-File -Encoding UTF8
  - anything that re-encodes the file

SAFE editors:
  - VS Code (default UTF-8, no BOM)
  - node scripts / node -e (Node fs is byte-exact)
  - [System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding $false))

To recover a corrupted file:  git checkout HEAD -- <path>  then re-apply with a safe tool.

## 4. Verify parse BEFORE every commit

For catering (assets/data/CateringServicesDatabase.js):
  node -e "global.window={};require('./assets/data/CateringServicesDatabase.js');console.log('PARSE OK',window.EATOUTS_CATERING.totals.brands)"

Expected:  PARSE OK 115 (or current count).

If it throws SyntaxError, DO NOT COMMIT. Common causes:
  1. Missing trailing comma at the end of a RAW entry ( `}] }` instead of `}] },` )
  2. Mojibake in [\\u0300-\\u036f]   (see Section 3)

## 5. Adding a catering business

1. Edit assets/data/CateringServicesDatabase.js
2. Inside  var RAW = [ ... ]  add a record WITH a trailing comma:
   { business_name: "Name", type: "Type", aliases: [], locations: [{ address: "Town, Botswana", town_city: "Town", country: "Botswana", phone: null, established: null, years_with_us: null, verified: false, source: "Manual" }] },
3. If a logo exists in assets/logo/, add to LOGO_BY_SLUG (slugified name -> path)
4. Run the parse check (Section 4)
5. Bump the version query in index.html:   CateringServicesDatabase.js?v=YYYYMMDD
   -> That is the ONLY way to defeat Cloudflare Pages 4h static-file cache.
6. git add the JS file + logo + index.html,  commit,  git push origin main
7. Wait ~2 min, then verify:
   curl.exe -s https://www.eatouts.site/assets/data/CateringServicesDatabase.js | Select-String "Business Name"

## 6. Cache (Cloudflare Pages does NOT honor _headers Cache-Control for JS)

- Static JS/CSS served with  max-age=14400  regardless of _headers. This is documented.
- Only HTML respects  _headers  Cache-Control.
- _headers supports only ONE wildcard per rule. Multi-level patterns are silently ignored.
- The ONLY reliable cache-bust for JS is a version query on the script tag:
    <script src="assets/data/CateringServicesDatabase.js?v=YYYYMMDD"></script>
- Every catering deploy: bump the v= in index.html.

## 7. Windows git gotchas

- core.ignorecase=true  (git matches filenames case-insensitively)
- git ls-files --others  can HIDE untracked files that look like tracked ones.
  Use  git ls-files <dir>  (without --others) to see what's actually tracked.
- Filenames with & must be quoted in PowerShell:
    git status -- "assets/logo/File_&_Name.jpg"
  Unquoted & throws AmpersandNotAllowed.
- git check-ignore returning nothing = not ignored (that is success, not an error).
  If  git add -f <path>  is silent, the file is probably already tracked - check git ls-files.

## 8. Build pipeline

-  npm run merge  runs python scripts/build_restaurant_directory.py -> RESTAURANTS only, not catering.
-  scripts/build_link_registry.mjs  LOADS CateringServicesDatabase.js in a try/catch.
  A parse error there silently logs  caterers=0  and looks like "no business added".
-  copy-static.mjs  copies js/ and assets/ wholesale into dist/, then wrangler deploys dist/.

If a business isn't showing on the site, the problem is NEVER the build. It is one of:
  - File has a parse error (Section 4)
  - Edit went to a DEAD file (Section 2)
  - Browser or CDN cached the old JS (Section 6)

## 9. Incident 2026-10-20 (context)

Symptom: catering page showed "No catering services found" locally; production showed OLD list.

Root causes:
- Commit 4bfa3c5 added 20 businesses + Desert Flames logo, but the file had a mojibake
  regex (Range out of order) -> SyntaxError -> nothing rendered.
- Commit 990b0d3 repaired the regex to [\\u0300-\\u036f] and fixed a missing comma.
- Commit 63ba695 added the cache-busting ?v= query to index.html.

Lesson: green deploy + working `git push` does NOT mean the file parses.
ALWAYS run Section 4.

## 10. Read before editing catering

- assets/data/CateringServicesDatabase.js  (LIVE)
- js/eatouts-catering.js                   (renderer; reads window.EATOUTS_CATERING)
- js/eatouts-brand.js                      (logo placeholder fallback)
- index.html                               (script tags near line 862, ~865, ~867)

Do NOT read or edit for catering:
- assets/data/catering_services_database.json  (74 legacy entries, unused)
- tests/catering_businesses_database.json      (test fixture, unused)
- eatouts_restaurants_list.json                (restaurant seed, unrelated)
- eatouts-db.js                                (localStorage wrapper, unrelated)

## 11. Do not touch without explicit instruction

- .git/info/exclude   (tool entries - not to be "cleaned up")
- functions/          (Cloudflare Workers routes - a bad deploy can 500 the site)
- _headers            (changing Cache-Control for JS has no effect, per Section 6)
- _redirects          (clean-URL rewrites - a past bug came from here, commit 1201972)
- dist/               (generated)

## 12. bash -> PowerShell

| bash            | PowerShell                                |
|-----------------|-------------------------------------------|
| head -N         | Select-Object -First N                    |
| tail -N         | Select-Object -Last N                     |
| grep PAT f      | Select-String -Path f -Pattern PAT        |
| grep -c PAT f   | (Select-String -Path f -Pattern PAT).Count |
| curl ...        | curl.exe ...  (NOT curl - that's IWR alias) |
| diff a b        | Compare-Object (Get-Content a) (Get-Content b) |
| ~               | $HOME                                     |

---
Last updated: 2026-10-21
