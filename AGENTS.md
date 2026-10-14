# AGENTS.md

Guidance for AI coding agents working in this repository (EatOuts Botswana).

## Hard rules

### Never kill the user's Chrome
Do **not** run any blanket process kill against Chrome, e.g.:

- `Get-Process chrome | Stop-Process -Force`
- `Stop-Process -Name chrome -Force`
- `taskkill /IM chrome.exe /F`

These close the user's **real** browser windows and any unsaved work. This is
strictly forbidden, regardless of debugging-port conflicts.

If you need a headless browser for UI verification, use the bundled helper:

```powershell
# Start the app (targeted PID — kill only this PID when done)
$srv = Start-Process node -ArgumentList 'serve.js','5199' -PassThru -WindowStyle Hidden

# Probe a page (helper picks a random free port + unique profile dir)
node tests/headless.mjs --url=http://127.0.0.1:5199/index.html `
  --ready="typeof window.EatoutsBridge === 'object'" --expr-file=./probe.js

Stop-Process -Id $srv.Id -Force
```

`tests/headless.mjs` (see the SAFETY CONTRACT at the top of that file) only ever
launches its own Chrome with a unique `--user-data-dir` (`eo-*`) and a random
free debugging port, and on teardown terminates **only its own process tree**
(`taskkill /PID <pid> /T /F` on Windows, its process group on Unix).

If a stale headless instance ever blocks a port, resolve it by killing only the
processes that carry this helper's unique profile marker — never all of Chrome:

```powershell
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" |
  Where-Object { $_.CommandLine -like '*eo-headless*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

The same rule applies to `node serve.js` instances: always terminate the exact
PID you started (`Stop-Process -Id <pid>`), never by image name.

## Project conventions

- **Stack:** static HTML pages + vanilla JS served from the repo root; Cloudflare
  Pages/Functions (`functions/`), D1 migrations (`migrations/`), KV. No bundler
  for the app itself.
- **Main app:** `index.html` (large, single file — customer app). Other pages are
  top-level `*.html` (operator/admin/onboarding surfaces).
- **Shared JS:** `js/eatouts-*.js` (brand, bridge, customer, auth, slug, router).
- **Data:** `assets/data/**` (runtime JSON/JS), `js/botswana_locations.js`.

### Commands
- `npm test` — full suite (`node tests/run-all.js`). Run this before committing.
- `npm run catalog` — regenerate `HTML_CATALOG.md` after HTML/CSS/JS changes to
  catalogued pages; update the changelog in `scripts/html_catalog.meta.json`.
- `npm run build` / `npm run stage` — build/stage for deploy (`dist/` is gitignored).
- Dev server: `node serve.js [port]` (no-store caching) or `run-eatouts.bat`.

### Tests
- Suites live in `tests/*.js` and are registered in `tests/run-all.js`.
- Tests run on **jsdom**; `tests/package.json` pins CommonJS for the harness.
- jsdom caveats: `getComputedStyle` resolves `<style>` rules but layout metrics
  (`offsetWidth`/`getBoundingClientRect`) are 0 — assert on computed styles.
  `document.body.textContent` includes inlined `<script>`, so assert on DOM nodes.
- For real layout/centering checks that jsdom can't do, use `tests/headless.mjs`.

### Style
- Do not add comments to code unless explicitly asked.
- Match the surrounding code style; prefer existing helpers/utilities.
- Never commit secrets; `_headers`/`_redirects` define edge behaviour.

### Git
- Only commit/push when the user explicitly asks. Keep messages in the existing
  concise imperative style (see `git log --oneline`).
