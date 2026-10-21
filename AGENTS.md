# Golden Rules — EatOuts App

## ⚠️ DEPLOYMENT WORKFLOW (never violate)
1. Make changes
2. `git add` + `git commit`
3. `git push` to GitHub (origin: Kudigotdis/eatouts)
4. Cloudflare Pages auto-deploys FROM GITHUB — it never deploys from your local machine

Cloudflare ONLY sees what is committed and pushed to GitHub.
Uncommitted local changes DO NOT deploy. Never use `wrangler deploy` /
`wrangler pages deploy` to bypass GitHub — GitHub is the single source of truth.

## 📄 GITIGNORE RULE
ONE root `.gitignore` is all this project needs. Git rules cascade into every
subfolder. Do NOT create nested `.gitignore` files (e.g. in tests/, assets/,
functions/). If a new ignore rule is needed, add it to the ROOT `.gitignore` only.
(`.kilo/` and `.agent-cache/` internal files are tool-generated — leave them alone.)
