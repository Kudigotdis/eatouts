/* GET /api/links/resolve?country=bw&slug=name
   Public resolver used by the client router when the edge function's
   <meta> hint is unavailable (e.g. the Cloudflare Pages static fallback, or ?link=).
   -> { ok, found, link:{ type, refId, name } } | { ok, found, redirect, to } */
import { json } from './../_shared.js';
import { countryOf, resolveLink } from './../_links.js';

export async function onRequestGet(context) {
  var url = new URL(context.request.url);
  var cc = countryOf(url.searchParams.get('country'));
  var slug = url.searchParams.get('slug') || '';

  var hit = await resolveLink(context, cc, slug);
  if (!hit.found) return json({ ok: true, found: false }, 200);
  if (hit.redirect) return json({ ok: true, found: true, redirect: true, country: cc, to: hit.redirect });

  return json({
    ok: true,
    found: true,
    link: { country: cc, slug: hit.slug, type: hit.type, refId: hit.refId, name: hit.name || null, source: hit.source || 'registry' }
  });
}
