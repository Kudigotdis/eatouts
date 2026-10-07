# `EATOUTS_IMPLEMENTATION_GUIDE.md`

Save this file at your repo root as `EATOUTS_IMPLEMENTATION_GUIDE.md`. Hand it to your AI agent along with every file listed in §2. The agent works through §4 to §9 in order, running the checklist in §10 between each step.

---

## 1. Purpose of this guide

You are implementing three new user-facing pages and the supporting modules for the **EatOuts** app:

1. **`eatouts-blog.html`** — a public blog for site updates, read and shared by diners.
2. **`eatouts-event-planner.html`** — an operator-only event composer with supplier integration.
3. **`eatouts-suppliers.html`** — a self-service supplier directory where vendors create a profile that venues pick from when planning events.

Plus one supporting module — **`js/eatouts-cloud.js`** — which is a stub until Cloudflare is set up, and one reference file — **`cloudflare-worker.js`** — that will be deployed separately.

Your job is to **place files, edit two existing files, and run tests**. You are not merging code into a large project — you are dropping in self-contained pages and wiring them into the existing `index.html` navigation.

Read §2 first. Do not skip to §4.

---

## 2. File inventory

### 2.1 Files provided to you

| File | Size | Purpose | Drop-in or edit? |
|---|---|---|---|
| `eatouts-blog.html` | ~800 lines | Blog page (self-contained shell, loads external JS) | Drop-in at repo root |
| `eatouts-blog.js` | ~950 lines | Blog engine | Drop-in at `js/` |
| `blog_posts.json` | data | Initial 10 blog posts | Drop-in at `assets/data/` |
| `eatouts-cloud.js` | ~230 lines | Cloud client (stub config) | Drop-in at `js/` |
| `eatouts-event-planner.html` | ~1000 lines | Event composer | Drop-in at repo root |
| `eatouts-suppliers.html` | ~1400 lines | Supplier onboarding + dashboard | Drop-in at repo root |
| `cloudflare-worker.js` | ~85 lines | Cloudflare Worker reference — NOT loaded in the browser | Save for later |
| `eatouts-event-planner.js` | ~1000 lines | Redundant — see §2.2 | Reference only |
| `eatouts-suppliers-catalog.js` | ~150 lines | Redundant — see §2.2 | Reference only |

### 2.2 Files that are redundant

**`eatouts-event-planner.js`** and **`eatouts-suppliers-catalog.js`** duplicate code that already lives inside the self-contained HTML pages (`eatouts-event-planner.html` and `eatouts-suppliers.html`). You do **not** need to load them. Options:

- **Recommended:** delete them from your workspace. The HTML pages do not reference them.
- Alternative: keep them in a `reference/` folder for future refactoring. They have no runtime effect.

Do **not** link them from any HTML. Linking them causes duplicate `const` declarations in some browsers, which breaks the page.

### 2.3 Files that must already exist in your repo

Before you start, verify these files are present. If any are missing, stop and ask the user.

| File | Why it's needed |
|---|---|
| `index.html` | Main customer app — you will edit it in §5 |
| `js/eatouts-db.js` | Database layer — loaded by the blog |
| `js/eatouts-auth.js` | Operator auth — loaded by every page |
| `js/eatouts-brand.js` | Brand helpers (`slugify`, `esc`) — loaded by every page |
| `js/eatouts-image-compressor.js` | Image compression — loaded by the blog page |
| `js/eatouts-video-validator.js` | Video validation — loaded by the blog page |
| `botswana_locations.js` | Location data — used by supplier profiles |

If **any** of these files is missing, produce a report for the user. Do not attempt to fabricate them.

---

## 3. File placement map

After running the drop-in steps, your repo should look like this:

```
your-repo/
├── index.html                              ← EDIT (§5)
├── eatouts-blog.html                       ← NEW (drop-in)
├── eatouts-event-planner.html              ← NEW (drop-in)
├── eatouts-suppliers.html                  ← NEW (drop-in)
├── cloudflare-worker.js                    ← NEW (reference only)
│
├── assets/
│   ├── data/
│   │   └── blog_posts.json                 ← NEW (drop-in)
│   │
│   ├── logo/                                ← existing
│   └── images/                              ← existing
│
└── js/
    ├── eatouts-db.js                        ← existing
    ├── eatouts-auth.js                      ← existing
    ├── eatouts-brand.js                     ← existing
    ├── eatouts-image-compressor.js          ← existing
    ├── eatouts-video-validator.js           ← existing
    ├── eatouts-cloud.js                     ← NEW (drop-in)
    └── eatouts-blog.js                      ← NEW (drop-in)
```

**Note:** `eatouts-event-planner.js` and `eatouts-suppliers-catalog.js` are deliberately absent. That's correct. See §2.2.

---

## 4. Drop-in steps

Perform these steps in order. Do not proceed to §5 until every file is in place.

### Step 4.1 — Place `js/eatouts-cloud.js`

Copy the full contents of `eatouts-cloud.js` into a new file at `js/eatouts-cloud.js`. Do **not** edit its contents. The `workerUrl` field is intentionally empty — the client detects this and falls back to local storage for everything.

### Step 4.2 — Place `js/eatouts-blog.js`

Copy the full contents of `eatouts-blog.js` into a new file at `js/eatouts-blog.js`. Do **not** edit its contents.

### Step 4.3 — Place `assets/data/blog_posts.json`

Create the folder `assets/data/` if it doesn't exist. Copy `blog_posts.json` into `assets/data/blog_posts.json`. This is a **data file**, not code — no edits required.

### Step 4.4 — Place `eatouts-blog.html`

Copy the full contents of `eatouts-blog.html` into a new file at the **root** of the repo (same folder as `index.html`). Do not edit.

### Step 4.5 — Place `eatouts-event-planner.html`

Copy the full contents of `eatouts-event-planner.html` into a new file at the **root** of the repo. Do not edit. This page has no external dependencies — it will work standalone.

### Step 4.6 — Place `eatouts-suppliers.html`

Copy the full contents of `eatouts-suppliers.html` into a new file at the **root** of the repo. Do not edit. This page also has no external dependencies.

### Step 4.7 — Save `cloudflare-worker.js`

Copy the contents of `cloudflare-worker.js` to a file at the **root** of the repo. Do **not** load it from any HTML. It is a reference file for the user to paste into Cloudflare's Workers editor later. Leave it in the repo so it doesn't get lost.

### Step 4.8 — Delete redundant files

If the user has `eatouts-event-planner.js` or `eatouts-suppliers-catalog.js` in `js/`, move them to a `reference/` folder, or delete them. Do **not** load them from any HTML. See §2.2.

### Step 4.9 — Verify

Run these checks:

```
ls -la eatouts-blog.html                     # should exist
ls -la eatouts-event-planner.html            # should exist
ls -la eatouts-suppliers.html                # should exist
ls -la cloudflare-worker.js                  # should exist
ls -la js/eatouts-cloud.js                   # should exist
ls -la js/eatouts-blog.js                    # should exist
ls -la assets/data/blog_posts.json           # should exist
ls -la js/eatouts-db.js                      # existing
ls -la js/eatouts-auth.js                    # existing
ls -la js/eatouts-brand.js                   # existing
ls -la js/eatouts-image-compressor.js        # existing
ls -la js/eatouts-video-validator.js         # existing
```

If any file is missing, stop and report.

---

## 5. Edit `index.html` — link the new pages

The blog, event planner, and suppliers pages need to be reachable from the customer app. The user has already confirmed that `index.html` has an About tab with an existing blog button. You will:

1. **Fix the existing blog link** to point at `eatouts-blog.html`.
2. **Add two new links** to the About tab: one for the event planner, one for suppliers.

### Step 5.1 — Locate the About tab render function

Open `index.html`. Search for `function renderAbout()`. It will look roughly like this:

```javascript
function renderAbout(){
  // ... existing content ...
  h+='<button class="btn primary full" data-act="openAboutGallery">Open Restaurant Gallery</button>';
  // ... more content ...
}
```

The exact shape varies. Your job is to find the section that renders the "Restaurant Gallery" button, and add new buttons immediately after it.

### Step 5.2 — Add the three links

Inside `renderAbout()`, immediately after the gallery button, add:

```javascript
h+='<a class="btn primary full" href="eatouts-blog.html" style="margin-top:10px">Read our blog →</a>';
h+='<a class="btn ghost full" href="eatouts-event-planner.html" style="margin-top:8px">Plan an event (operators)</a>';
h+='<a class="btn ghost full" href="eatouts-suppliers.html" style="margin-top:8px">List your services as a supplier</a>';
```

Adjust the surrounding code so these appear in the rendered About view. Use `esc()` for any dynamic strings — but since these are literals, no escaping is needed.

### Step 5.3 — If a blog button already exists

If the user already has a blog button that points somewhere else (e.g. `blog.html` or an external link), **replace** it with the first line from §5.2. Do not add a second blog button.

### Step 5.4 — Verify with a live test

1. Save `index.html`.
2. Serve the repo (`run-eatouts.bat` — user runs this; you do not).
3. In a browser, load `index.html`, tap the **About** tab.
4. Confirm three new buttons appear.
5. Tap each one — the corresponding page should load.

If any page is blank, see §10.

---

## 6. Cross-page integration (deferred)

The user asked for suppliers to appear inside the event planner when a venue picks one. That integration is a **future task** and is out of scope for this pass. Do not attempt it now.

When the user is ready, the integration has two parts:

1. **Supplier-side save** — the suppliers page already writes to `localStorage.eatouts_suppliers_v1`. Nothing new needed.
2. **Venue-side read** — modify `eatouts-event-planner.html` so that when a supplier type is opened (Step 4 of the planner), a small "Pick registered supplier" button appears. It reads `localStorage.eatouts_suppliers_v1`, filters for suppliers whose `services[]` includes the current `categoryId` and `typeId`, and auto-fills the supplier name, contact, cost, and any active EatOuts discount code.

Do not start this work until the user asks.

---

## 7. Cloudflare setup (deferred)

The `js/eatouts-cloud.js` client is a **stub**. Its `workerUrl` is empty, so `isConfigured()` returns false. Every cloud method returns `{ ok:false, reason:'not-configured' }` and every page falls back to local behaviour.

The user will set up Cloudflare later. When they do:

1. Deploy `cloudflare-worker.js` to Cloudflare Workers.
2. Set the Worker environment variables `BUCKET`, `SECRET`, `PUBLIC_BASE`.
3. Edit `js/eatouts-cloud.js` — replace:
   ```javascript
   workerUrl: '',
   secret: '',
   ```
   with the Worker URL and the same secret string.
4. Commit and push.

No other code changes are needed. The blog, event planner, and suppliers pages automatically switch to cloud-backed behaviour once `workerUrl` is populated.

Do not do this work in this pass. Just note it in your final report.

---

## 8. Testing checklist

Run every check in order. Stop on the first failure and report it before continuing.

### 8.1 Blog page (`eatouts-blog.html`)

Load in a browser. Confirm:

- [ ] Page loads (no blank screen).
- [ ] Timeline shows 10 seed posts from `assets/data/blog_posts.json`.
- [ ] Search box filters as you type. Try `patio` — should reduce the list.
- [ ] Typing `#gaborone` filters to Gaborone-tagged posts.
- [ ] Tap a tag chip → filters to that tag.
- [ ] Tap a post → opens full post view.
- [ ] Back button (top-left) returns to the timeline.
- [ ] Share on WhatsApp button opens WhatsApp with a pre-filled message.
- [ ] Copy link button copies a URL to the clipboard.
- [ ] Console (F12) has no red errors.

### 8.2 Blog admin mode

Sign in as operator first (`index.html` → About → Operator → Demo). Then reload `eatouts-blog.html`.

- [ ] Header chip shows "Admin" in green.
- [ ] Bottom nav shows a second "Admin" button.
- [ ] Tap Admin → list of 10 posts.
- [ ] Tap "+ New post" → editor appears.
- [ ] Type a title. Slug auto-fills.
- [ ] Add a Heading block, a Text block, an Image block. Each saves on blur.
- [ ] Reorder blocks with ↑/↓. Duplicate with ⎘. Delete with ×.
- [ ] Tap Publish. Status changes to Published.
- [ ] Tap "Export all" — a `blog_posts.json` downloads.
- [ ] Reload the page — the new post is still there.

### 8.3 Event planner (`eatouts-event-planner.html`)

Load in a browser. The page should work even without an operator session (it's standalone).

- [ ] Page loads.
- [ ] Hero shows "EatOuts Event Planner".
- [ ] Step 1 shows 10 template cards.
- [ ] Tap "Live Music / DJ Night" template → fields fill.
- [ ] Step 4 (Suppliers) — expand a category. Tap a supplier type → detail sheet appears.
- [ ] Fill in name, contact, cost → they save on blur.
- [ ] Step 7 (Review) → shows budget summary and event card preview.
- [ ] Publish button works.

### 8.4 Suppliers page (`eatouts-suppliers.html`)

Load in a browser.

- [ ] Landing page shows "List your services on EatOuts".
- [ ] Tap "Create my profile" → onboarding step 1.
- [ ] Fill in First name, Business name, Tagline.
- [ ] Step 2 — expand "Entertainment & Talent". Tap "DJ" → detail sheet.
- [ ] Add a title, base rate, rate type. Save.
- [ ] Step 3 — add an hourly rate.
- [ ] Step 4 — add an image URL (use any working URL, e.g. `assets/logo/EatOuts_Badge.png`).
- [ ] Step 6 — add a WhatsApp number, town.
- [ ] Step 7 — checklist should show mostly green now.
- [ ] Tap Publish → dashboard appears.
- [ ] Dashboard shows the summary card.
- [ ] Tap "Preview as a venue sees it" → supplier card preview.
- [ ] Tap "Export profile JSON" → a `supplier_<slug>.json` downloads.
- [ ] Sign out → back to landing.
- [ ] Landing now shows the profile in "Profiles on this device".
- [ ] Tap it → dashboard (or onboarding if status is draft).

### 8.5 Index integration

Load `index.html`.

- [ ] About tab shows "Read our blog →", "Plan an event (operators)", "List your services as a supplier".
- [ ] Each button loads the correct page.

### 8.6 Console check (all pages)

Open DevTools (F12) → Console on each page. There should be **no red text**. Warnings are acceptable if they are:

- `[blog] optional dependency not loaded: EatoutsImageCompressor` — only if the compressor file is genuinely missing.
- `[planner] ...` — only informational logs.

Any other red text is a bug. Report it.

---

## 9. Common pitfalls — avoid these

**Do not** load `eatouts-event-planner.js` or `eatouts-suppliers-catalog.js` from any HTML. They are redundant. Loading them causes duplicate `const` declarations in modern browsers and breaks the page.

**Do not** edit `cloudflare-worker.js` into a browser script tag. It uses `export default`, which is Worker-only syntax. In a browser it fails immediately.

**Do not** rename `blog_posts.json` to `blog-posts.json`, `posts.json`, or anything else. The blog engine reads it from `assets/data/blog_posts.json` by an exact path.

**Do not** move `eatouts-cloud.js` out of `js/`. The blog page loads it as `js/eatouts-cloud.js` by exact path.

**Do not** add a 6th bottom-nav tab to `index.html`. The user explicitly asked to keep the current 5-tab layout and expose these pages from the About tab instead.

**Do not** modify `js/eatouts-db.js`, `js/eatouts-auth.js`, or `js/eatouts-brand.js`. They are shared modules used by every page. Any change risks breaking the app.

**Do not** attempt to merge the self-contained event planner and suppliers pages into external `.js` files. They are designed to work as standalone HTML files. Leave them alone.

---

## 10. Troubleshooting

### Blank page

Cause is usually one of:

1. **A required script failed to load.** Open DevTools → Console. Look for 404s or syntax errors.
2. **The wrong script path.** Confirm the file exists at the exact path shown in the HTML.
3. **A JS error.** Look for red text in the console — the first error usually explains everything.

### Blog timeline is empty

- Check that `assets/data/blog_posts.json` exists.
- Open the browser console. There should be a fetch to `blog_posts.json`.
- If a 404, the file is in the wrong place.
- If a parse error, the JSON is corrupt — re-copy it.

### Suppliers page shows a "failed to start" red box

The boot function caught an error. The error message is printed on screen. It usually means a missing `<div id="scroll">` or similar. Do not modify the HTML — just report the error.

### Event planner looks unstyled

The page has inline styles only. If it looks broken, the HTML file was mangled during copy-paste. Re-copy it exactly.

### Console says "EatoutsBlog is not defined"

The blog engine (`js/eatouts-blog.js`) didn't load. Check that:
- The file exists at `js/eatouts-blog.js`.
- The `<script src="js/eatouts-blog.js"></script>` tag appears **after** the other dependency scripts, in the exact order shown in `eatouts-blog.html`.
- The file was not accidentally saved as `.js.txt`.

### Console says "EatoutsCloud is not defined"

Same as above for `js/eatouts-cloud.js`. This is optional — if the file is missing, the blog engine will fall back to `fetch()` for the feed. But if a 404 is logged, the page will still work.

---

## 11. Final report format

When all checks in §8 pass, produce a report in this exact shape for the user:

```
IMPLEMENTATION REPORT
=====================

FILES PLACED
- eatouts-blog.html ................ ✓
- eatouts-event-planner.html ....... ✓
- eatouts-suppliers.html ........... ✓
- cloudflare-worker.js ............. ✓ (reference only)
- js/eatouts-cloud.js .............. ✓
- js/eatouts-blog.js ............... ✓
- assets/data/blog_posts.json ...... ✓

FILES EDITED
- index.html ....................... ✓ (3 links added to About tab)

FILES DELETED/MOVED
- js/eatouts-event-planner.js ...... (removed, redundant)
- js/eatouts-suppliers-catalog.js .. (removed, redundant)

TEST RESULTS
- Blog timeline .................... ✓ (10 posts, search works)
- Blog admin ....................... ✓ (create, publish, export)
- Event planner .................... ✓ (10 templates, all 7 steps)
- Suppliers onboarding ............. ✓ (7 steps, publish gate)
- Suppliers dashboard .............. ✓ (preview, export)
- Index integration ................ ✓ (3 links work)
- Console clean .................... ✓

DEFERRED (user to do)
- Cloudflare Worker deployment
- Set workerUrl in js/eatouts-cloud.js
- Cross-page supplier picking (venue side)

NOTES
[any anomalies, questions, or follow-up items]
```

---

## 12. What NOT to do

- Do not add analytics, telemetry, or external CDN resources.
- Do not modify the schema of `js/eatouts-db.js`.
- Do not change `localStorage` key names.
- Do not add new tabs to `index.html`.
- Do not create accounts, Firebase configs, or payment integrations.
- Do not attempt to make the pages "better" — reproduce them exactly as provided.

End of guide.