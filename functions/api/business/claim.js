/* /api/business/claim
   POST { refId } -> { ok, claim, restaurantId, membership }
        Claim a D1 restaurant listing for the signed-in user: first
        claimer becomes 'owner' (memberships row) and the listing is
        marked claimed; later claimers land in the claims queue as
        'pending' for admin review. refIds that are not restaurants
        return claim:'no_restaurant' (local-only demo venues). */
import { json, readJson } from './../_shared.js';
import { requireSession, grantClaimMembership } from './../_business.js';

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var refId = String(b.refId || b.ref_id || '').trim();
  if (!refId) return json({ ok: false, error: 'refId_required' }, 400);

  var claim = await grantClaimMembership(c, refId, 'direct_claim');
  if (claim.status === 'no_restaurant') {
    return json({ ok: false, claim: 'no_restaurant', error: 'not_found' }, 404);
  }
  return json({
    ok: true,
    claim: claim.status,
    restaurantId: claim.restaurantId || null,
    membership: claim.membership || null
  });
}
