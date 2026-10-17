# EatOuts: Phase 4 Wrap-Up Plan

## Current State
- Phase 4 G1-G3: quota/invoices backend, invoices endpoint, migrations complete.
- UI: fee disclosure in promo-onboarding.html and business-onboarding1.html; invoices card+script in eatouts-admin-dashboard.html.
- Sampled tests green.

## Open Items
- Full test suite pass not captured.
- Invoices UI field mapping: API uses snake_case (created_at, paid_at, restaurant_id, promo_id, submission_id); UI reads camelCase.
- G4: verify other promo surfaces.
- Phase 5 D1 (admin bootstrap) pending.

## Steps to Wrap Up
1. Capture full test summary (node tests/run-all.js). 
2. Fix invoices UI field mapping in eatouts-admin-dashboard.html.
3. Add fee disclosure to eatouts-business-dashboard.html if promo UI present.
4. Validate HTML/script.
5. Update OUTSTANDING_WORK.md, SESSION_NOTES.md; optionally npm run catalog.
6. Commit/push UI/doc tweaks.
7. Implement Phase 5 D1.

## Notes
- Backend correct; UI mapping is main gap.
- Low risk changes, minimal scope.
