/* ============================================================
   /<slug>  public venue slug router (Cloudflare Pages).

   www.eatouts.site/<slug>  ->  the venue's About page (data-page="venue-about")

   The shell is index.html with relative asset paths, so the shell must not
   be served as-is from /<slug> (its `assets/...` would resolve under /<slug>).
   This function fetches index.html and injects:
     <base href="/">                              - fixes asset paths
     <meta name="eatouts-venue" content=...>      - tells the client which
                                                    venue to open.

   Resolution (D1 only):
     1) restaurants table   -> kind: restaurant
     2) business_links      -> kind: bottle_store | catering
   Case-insensitive fallback on business_links.slug.
   ============================================================ */
import { json } from './api/_shared.js';

var RESERVED = {
  api: 1, assets: 1, js: 1, css: 1, img: 1, static: 1, cdn: 1, mail: 1,
  bw: 1, www: 1, app: 1, admin: 1, root: 1, public: 1,
  about: 1, blog: 1, help: 1, support: 1, terms: 1, privacy: 1,
  login: 1, logout: 1, signup: 1, register: 1, account: 1, settings: 1,
  index: 1, home: 1, new: 1, edit: 1, me: 1, my: 1, null: 1, undefined: 1,
  restaurants: 1, restaurant: 1, suppliers: 1, supplier: 1, events: 1,
  event: 1, promos: 1, promo: 1, gallery: 1, reserve: 1, business: 1,
  dashboard: 1, ops: 1, test: 1, demo: 1, health: 1, robots: 1
};

/* Per plan B1: slug regex /^[a-z0-9-]{1,64}$/i — hyphens allowed now (91 hyphenated restaurant slugs). */
var SLUG_RE = /^[a-z0-9-]{1,64}$/i;

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

/* True when the request path resolves to a real static asset. env.ASSETS.fetch
   wants the pretty path (/venue-about, not /venue-about.html) and runs redirect
   + header rules, so a 2xx or 3xx both mean "the asset server owns this path". */
async function assetExists(env, request) {
  if (!env || !env.ASSETS || !env.ASSETS.fetch) return false;
  var url = new URL(request.url);
  var path = url.pathname.replace(/\/+$/, '') || '/';
  try {
    var res = await env.ASSETS.fetch(new Request(url.origin + path, { method: 'GET' }));
    if (res && (res.status < 400)) return true;
  } catch (e) { /* no asset server -> never fall through here */ }
  return false;
}

function kindForType(type) {
  if (type === 'bottle_store') return 'bottle_store';
  if (type === 'supplier') return 'catering';
  return type || 'restaurant';
}

export async function onRequest(context) {
  var request = context.request;
  var url = new URL(request.url);
  var pathParts = url.pathname.split('/').filter(Boolean);
  var slug = pathParts[pathParts.length - 1] || '';

  /* Only single-segment paths reach [slug].js; defend anyway. */
  if (pathParts.length !== 1) return context.next();

  /* Empty slug. */
  if (!slug) return context.next();

  /* Reserved platform words — fall through to normal handling. */
  if (Object.prototype.hasOwnProperty.call(RESERVED, slug.toLowerCase())) return context.next();

  /* Invalid slug format: a-z 0-9 only, 1-64 chars, no dots. */
  if (!SLUG_RE.test(slug)) return context.next();

  var env = context.env;
  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  /* ---- Lookup order: restaurants first, then business_links ---- */
  var row = null;
  var kind = 'restaurant';
  var metaId = null;
  var metaSlug = slug;
  var d1Error = null;
  try {
    row = await env.DB.prepare(
      'SELECT * FROM restaurants WHERE slug = ? LIMIT 1'
    ).bind(slug).first();
    metaId = row && row.id;
    if (row && row.slug) metaSlug = row.slug;

    if (!row && slug !== slug.toLowerCase()) {
      row = await env.DB.prepare(
        'SELECT * FROM restaurants WHERE lower(slug) = ? LIMIT 1'
      ).bind(slug.toLowerCase()).first();
      metaId = row && row.id;
      if (row && row.slug) metaSlug = row.slug;
    }

    if (!row) {
      row = await env.DB.prepare(
        'SELECT * FROM business_links WHERE country_code = ? AND slug = ? LIMIT 1'
      ).bind('bw', slug).first();
      kind = kindForType(row && row.type);
      /* If business_links type=restaurant, resolve ref_id to the actual
         restaurant id so the client bridge lookup (EatoutsBridge.byId) finds it. */
      var metaId = row && row.id;
      if (row && row.type === 'restaurant' && row.ref_id) {
        var restRow = await env.DB.prepare(
          'SELECT * FROM restaurants WHERE id = ? LIMIT 1'
        ).bind(row.ref_id).first();
        if (restRow) {
          metaId = restRow.id;
          if (restRow.slug) metaSlug = restRow.slug;
          if (!row.name && restRow.name) row.name = restRow.name;
        } else {
          metaId = row.ref_id;
          if (row.ref_id && String(row.ref_id).indexOf('rest_') === 0) {
            metaSlug = String(row.ref_id).slice(5);
          }
        }
      }
      if (!row && slug !== slug.toLowerCase()) {
        row = await env.DB.prepare(
          'SELECT * FROM business_links WHERE country_code = ? AND lower(slug) = ? LIMIT 1'
        ).bind('bw', slug.toLowerCase()).first();
        kind = kindForType(row && row.type);
        metaId = row && row.id;
        if (row && row.type === 'restaurant' && row.ref_id) {
          restRow = await env.DB.prepare(
            'SELECT * FROM restaurants WHERE id = ? LIMIT 1'
          ).bind(row.ref_id).first();
          if (restRow) {
            metaId = restRow.id;
            if (restRow.slug) metaSlug = restRow.slug;
            if (!row.name && restRow.name) row.name = restRow.name;
          } else {
            metaId = row.ref_id;
            if (row.ref_id && String(row.ref_id).indexOf('rest_') === 0) {
              metaSlug = String(row.ref_id).slice(5);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[slug] D1 lookup failed for slug=' + slug, err);
    row = null;
    kind = null;
    d1Error = err;
  }

  /* D1 error -> serve index.html without venue meta so client boots to home (200, not 500). */
  if (d1Error) {
    var shell = await assetText(env, request, '/index.html');
    if (!shell) return html('<!doctype html><meta charset="utf-8"><title>EatOuts</title>', 503);
    if (/<head[^>]*>/i.test(shell)) {
      shell = shell.replace(/<head([^>]*)>/i, '<head$1><base href="/">');
    } else {
      shell = '<base href="/">' + shell;
    }
    return html(shell, 200);
  }

  if (!row) {
    /* This catch-all matches every single-segment path, so it would shadow
       real static pages (/venue-about, /eatouts-blog, ...) and the _redirects
       rules, which only run when no Function matches. Before answering 404,
       hand the request back to Pages so a static asset or redirect can serve
       it; only fall through to the custom 404 when there is nothing there. */
    var assetHit = await assetExists(env, request);
    if (assetHit) return context.next();

    var notFound = await assetText(env, request, '/404.html');
    if (notFound && /<head[^>]*>/i.test(notFound)) {
      notFound = notFound.replace(/<head([^>]*)>/i, '<head$1><base href="/">');
    } else if (notFound) {
      notFound = '<base href="/">' + notFound;
    }
    return html(notFound || '<!doctype html><meta charset="utf-8"><title>Not found</title><h1>Not found</h1>', 404);
  }

  var shell = await assetText(env, request, '/index.html');
  if (!shell) return html('<!doctype html><meta charset="utf-8"><title>EatOuts</title>', 503);

  var metaObj = {
    id: metaId,
    slug: metaSlug,
    kind: kind,
    name: row.name || row.slug || slug
  };
  var meta = '<meta name="eatouts-venue" content="' + escAttr(JSON.stringify(metaObj)) + '">';

  if (/<head[^>]*>/i.test(shell)) {
    shell = shell.replace(/<head([^>]*)>/i, '<head$1><base href="/">' + meta);
  } else {
    shell = '<base href="/">' + meta + shell;
  }

  return html(shell, 200);
}
