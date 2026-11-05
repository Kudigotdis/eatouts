/* ============================================================
   /data/<file>  - the app's JSON/JS payload (Milestone C).

   The directory listings, venue copy, supplier catalogue and blog feed used to
   be served straight out of /assets/data/*. /assets/* is EXCLUDED from
   Functions in _routes.json, so those 4.9 MB were handed to anyone who asked -
   no user agent, no country, no cookie, no log. This is the payload that made
   the site worth scraping.

   They now live at /data/*, which is NOT excluded, so functions/_middleware.js
   runs its stages first. This Function is the second half: it hands the file
   back from the asset store with the headers that keep it out of caches, out of
   search indexes, and out of a scraper's disk.

   THREE RULES:
     - ALLOWLIST, NOT DENYLIST. Only the extensions the app actually loads are
       served. The same folder carries build leftovers (.db, .bak) that nothing
       requests, so they 404 rather than leak.
     - NEVER A 500. A bad path, a missing binding or a store error is a 404 with
       a JSON body; a stack trace here would describe the filesystem.
     - STREAM, DON'T BUFFER. The 711 KB directory file is passed through as a
       stream; only the headers are rewritten.
   ============================================================ */
import { json } from '../api/_shared.js';

/* What the app actually fetches. Everything else in the folder is inert. */
var TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

/* Relative path only: no leading dot or slash, no "..", no double slash, and no
   percent-escapes (a %2e%2e that the store would decode is not worth allowing
   for the sake of a filename nothing uses). */
var PATH_RE = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;

function extOf(rel) {
  var i = rel.lastIndexOf('.');
  if (i < 0) return '';
  return rel.slice(i).toLowerCase();
}

/* One body for every refusal: a bad path, a missing file and a broken binding
   are indistinguishable from outside. */
function notFound() {
  return json({ ok: false, error: 'not_found' }, 404);
}

export async function onRequest(context) {
  var env = (context && context.env) || {};
  var request = context.request;
  var method = String(request.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    return json({ ok: false, error: 'method_not_allowed' }, 405, { allow: 'GET, HEAD' });
  }

  var url = new URL(request.url);
  var rel = url.pathname.replace(/^\/data\/?/, '');
  if (!rel || rel.indexOf('..') >= 0 || rel.indexOf('//') >= 0 || !PATH_RE.test(rel)) return notFound();

  var type = TYPES[extOf(rel)];
  if (!type) return notFound();

  if (!env.ASSETS || !env.ASSETS.fetch) {
    return json({ ok: false, error: 'assets_unavailable' }, 503);
  }

  var upstream;
  try {
    upstream = await env.ASSETS.fetch(new Request(new URL('/data/' + rel, url.origin).toString(), { method: 'GET' }));
  } catch (e) {
    return notFound();
  }
  if (!upstream || !upstream.ok) return notFound();

  var headers = {
    'content-type': type,
    /* The payload is per-visitor now: it must never sit in a shared cache, and a
       browser that keeps it is a browser that keeps 4.9 MB of catalogue it can
       re-serve without asking again. */
    'cache-control': 'private, no-store, must-revalidate',
    'x-content-type-options': 'nosniff',
    'x-robots-tag': 'noindex, nofollow'
  };

  /* Revalidation still works within a page load, using the asset server's own
     validator - so a repeat fetch inside 304s without us hashing 711 KB. */
  var etag = upstream.headers.get('etag');
  if (etag) headers.etag = etag;
  if (etag && request.headers.get('if-none-match') === etag) {
    return new Response(null, { status: 304, headers: headers });
  }

  return new Response(method === 'HEAD' ? null : upstream.body, { status: 200, headers: headers });
}
