/* ============================================================
   /<country>/<slug>  public business link router (Cloudflare Pages).

   www.eatouts.online/bw/<businessname>  ->  the business's profile.

   The whole app is a hash-routed SPA with RELATIVE asset paths, so the
   shell must not be served as-is from /bw/<slug> (its `assets/...` would
   resolve under /bw/). This function fetches index.html and injects:
     <base href="/">                              - fixes asset paths
     <meta name="eatouts-vanity" content=...>     - tells the client which
                                                    business to open.

   Resolution (claims in D1 first, then the generated registry) lives in
   functions/api/_links.js. A 'redirect' row 301s to the new slug.
   ============================================================ */
import { resolveLink, countryOf } from '../api/_links.js';

function escAttr(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function html(body, status) {
  return new Response(body, {
    status: status || 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

async function assetText(env, request, file) {
  if (!env || !env.ASSETS || !env.ASSETS.fetch) return null;
  try {
    var res = await env.ASSETS.fetch(new URL(file, request.url).toString());
    if (!res || !res.ok) return null;
    return await res.text();
  } catch (e) {
    return null;
  }
}

export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
  var parts = url.pathname.split('/').filter(Boolean); /* ['bw', '<slug>'] */
  var country = countryOf(parts[0]);
  var slug = parts[1] || '';

  if (!slug) {
    return html(await assetText(context.env, request, '/404.html') || 'Not found', 404);
  }

  var hit = await resolveLink(context, country, slug);

  if (hit.found && hit.redirect) {
    return new Response(null, {
      status: 301,
      headers: { location: '/' + country + '/' + hit.redirect, 'cache-control': 'no-store' }
    });
  }

  if (!hit.found) {
    var notFound = await assetText(context.env, request, '/404.html');
    return html(notFound || '<!doctype html><meta charset="utf-8"><title>Not found</title><h1>Link not found</h1>', 404);
  }

  var shell = await assetText(context.env, request, '/index.html');
  if (!shell) return html('<!doctype html><meta charset="utf-8"><title>EatOuts</title>', 503);

  var meta = '<meta name="eatouts-vanity" content="' +
    escAttr(hit.type) + '|' + escAttr(hit.refId) + '|' + escAttr(hit.slug) + '">';

  if (/<head[^>]*>/i.test(shell)) {
    shell = shell.replace(/<head([^>]*)>/i, '<head$1><base href="/">' + meta);
  } else {
    shell = '<base href="/">' + meta + shell;
  }

  return html(shell, 200);
}
