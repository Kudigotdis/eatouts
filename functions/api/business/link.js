/* /api/business/link
   GET  ?country=bw&refId=rest_x            -> { link, history }   (public read)
   POST { country, type, refId, slug, name } -> { ok, link, claim, restaurantId, membership }
        Claim or change a business's custom link. Changing a slug keeps
        the previous one as a 'redirect' row so old shared links 301 on.
        When refId is a real D1 restaurant, claiming also grants the caller
        an 'owner' membership (first claimer wins) and records a claims row;
        a later claimer on an already-owned venue gets a pending claim for
        admin review instead. */
import { json, readJson, now } from './../_shared.js';
import { requireSession, normalizeSlug, slugReason, countryOf, getRegistry, linkOut } from './../_links.js';
import { grantClaimMembership } from './../_business.js';

var TYPES = { restaurant: 1, bottle_store: 1, supplier: 1 };

export async function onRequestGet(context) {
  var env = context.env;
  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var url = new URL(context.request.url);
  var cc = countryOf(url.searchParams.get('country'));
  var refId = String(url.searchParams.get('refId') || '').trim();
  if (!refId) return json({ ok: false, error: 'refId required' }, 400);

  var res = await env.DB.prepare(
    'SELECT * FROM business_links WHERE country_code = ? AND ref_id = ? ORDER BY updated_at DESC LIMIT 20'
  ).bind(cc, refId).all();
  var list = res.results || [];
  var active = list.find(function (r) { return r.status === 'active'; }) || null;
  return json({ ok: true, link: active ? linkOut(active) : null, history: list.map(linkOut) });
}

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var cc = countryOf(b.country);
  var type = String(b.type || '').trim();
  var refId = String(b.refId || b.ref_id || '').trim();
  if (!TYPES[type]) return json({ ok: false, error: 'invalid_type' }, 400);
  if (!refId) return json({ ok: false, error: 'refId is required' }, 400);

  var raw = b.slug;
  var s = normalizeSlug(raw);
  var reason = slugReason(raw);
  if (reason) return json({ ok: false, error: reason }, 400);

  /* Availability: a link may only be taken by this listing. */
  var existing = await c.db.prepare(
    'SELECT * FROM business_links WHERE country_code = ? AND slug = ?'
  ).bind(cc, s).first();
  if (existing) {
    if (existing.ref_id !== refId || existing.status === 'revoked') {
      return json({ ok: false, error: 'That link is already taken.' }, 409);
    }
    if (existing.status === 'active') {
      var alreadyClaim = await grantClaimMembership(c, refId, 'business_link');
      return json({
        ok: true, link: linkOut(existing), already: true,
        claim: alreadyClaim.status,
        restaurantId: alreadyClaim.restaurantId || null,
        membership: alreadyClaim.membership || null
      });
    }
  } else {
    var reg = await getRegistry(c.env, c.request);
    if (reg[s] && reg[s].refId !== refId) {
      return json({ ok: false, error: 'That link is already taken.' }, 409);
    }
  }

  var ts = now();

  /* Retire the listing's current custom link so it 301s to the new one. */
  var current = await c.db.prepare(
    'SELECT * FROM business_links WHERE country_code = ? AND type = ? AND ref_id = ? ' +
    "AND status = 'active' AND claimed_by IS NOT NULL"
  ).bind(cc, type, refId).first();
  if (current && current.slug !== s) {
    await c.db.prepare(
      "UPDATE business_links SET status = 'redirect', redirect_to = ?, updated_at = ? WHERE id = ?"
    ).bind(s, ts, current.id).run();
  }

  var display = String(b.displaySlug || b.display_slug || s).trim() || s;
  var id = 'blk_' + cc + '_' + s;

  await c.db.prepare(
    'INSERT INTO business_links ' +
    '(id, country_code, slug, type, ref_id, display_slug, name, status, redirect_to, claimed_by, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
    'ON CONFLICT(country_code, slug) DO UPDATE SET ' +
    'type = excluded.type, ref_id = excluded.ref_id, display_slug = excluded.display_slug, ' +
    "name = excluded.name, status = 'active', redirect_to = NULL, " +
    'claimed_by = excluded.claimed_by, updated_at = excluded.updated_at'
  ).bind(id, cc, s, type, refId, display, b.name || null, 'active', null, c.userId, ts, ts).run();

  var row = await c.db.prepare(
    'SELECT * FROM business_links WHERE country_code = ? AND slug = ?'
  ).bind(cc, s).first();

  var claim = await grantClaimMembership(c, refId, 'business_link');
  return json({
    ok: true,
    link: linkOut(row),
    claim: claim.status,
    restaurantId: claim.restaurantId || null,
    membership: claim.membership || null
  });
}
