/* GET /api/links/check?country=bw&slug=name[&refId=rest_x]
   Public availability probe for the custom-link picker.
   -> { ok, country, normalized, available, reason } */
import { json, rateLimit, clientIp } from './../_shared.js';
import { normalizeSlug, slugReason, countryOf, getRegistry } from './../_links.js';

export async function onRequestGet(context) {
  var env = context.env;
  var request = context.request;

  var ip = clientIp(request);
  var rl = await rateLimit(env, 'linkcheck:' + ip, 120, 60);
  if (!rl.ok) return json({ ok: false, error: 'rate_limited' }, 429);

  var url = new URL(request.url);
  var cc = countryOf(url.searchParams.get('country'));
  var raw = url.searchParams.get('slug') || '';
  var refId = String(url.searchParams.get('refId') || '').trim();
  var s = normalizeSlug(raw);

  var out = { ok: true, country: cc, normalized: s, available: false, reason: '' };
  var reason = slugReason(raw);
  if (reason) { out.reason = reason; return json(out); }

  /* A link already in use cannot be taken, unless it is this same listing. */
  if (env.DB) {
    try {
      var taken = await env.DB.prepare(
        'SELECT type, ref_id, status FROM business_links WHERE country_code = ? AND slug = ?'
      ).bind(cc, s).first();
      if (taken) {
        if (taken.status === 'active' && refId && taken.ref_id === refId) {
          out.available = true; out.reason = 'This is your current link.';
          return json(out);
        }
        out.reason = 'That link is already taken.';
        return json(out);
      }
    } catch (e) { /* fall through to the registry */ }
  }

  var reg = await getRegistry(env, request);
  if (reg[s]) {
    if (refId && reg[s].refId === refId) {
      out.available = true; out.reason = 'That is your listing.';
      return json(out);
    }
    out.reason = 'That link is already taken.';
    return json(out);
  }

  out.available = true;
  return json(out);
}
