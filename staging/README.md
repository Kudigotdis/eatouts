# staging/ — safe drop zone (TRACKED)

This folder exists so work that is staged for the EatOuts app can **never be lost**.
The old workflow used a local `SORT/` folder that was untracked/gitignored, so the
files silently disappeared. Everything staged here is committed to git.

## Flow

1. **Drop** a received package into `staging/package/` (verbatim, unzipped).
2. **Normalize** — adjust pages to the platform shell (top header + bottom nav)
   and merge shared JS into the real root modules (never overwrite).
3. **Merge** — copy the finished pages to the repo root and wire them up
   (`copy-static.mjs`, `HTML_PAGES.md`).
4. **Delete** the package from `staging/package/` once it is placed.

## package/ — the recovered "manager/auth" package

Recovered from a WinRAR extraction temp folder on 2026-10-11. Contains 35 HTML
pages plus shared modules (`js/eatouts-*.js`, `assets/eatouts-manager.css`,
`assets/data/supplier_catalog.js`) and its own spec (`build-manifest.json`,
`EATOUTS_BUILD_NOTES.md`). Kept verbatim as the source of truth / rollback point.

Do not edit files here; normalize copies in the repo root instead.
