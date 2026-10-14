/* ============================================================
   EATOUTS ROUTER - public business links on the client.

   The edge function (functions/bw/[[path]].js) already resolved the slug
   and left a hint in the served HTML:
       <meta name="eatouts-vanity" content="type|refId|slug">
   This module reads that hint (or, as a fallback for the GitHub Pages
   mirror / shared links, ?link=<slug> and the /bw/<slug> path) and hands
   the calling page a plain target to open:

       { type, refId, slug, country }     - ready to open
       { slug, country, needsResolve:1 }  - resolve() first
       { redirect, country, slug }        - send the browser to the new slug

   It deliberately holds no app state; index.html decides what "open"
   means. Loaded as a classic script before the app boot.
   ============================================================ */
(function () {
  'use strict';

  function readMeta(doc) {
    try {
      var m = (doc || document).querySelector('meta[name="eatouts-vanity"]');
      if (!m) return null;
      var parts = String(m.getAttribute('content') || '').split('|');
      if (parts.length < 3) return null;
      return { type: parts[0], refId: parts[1], slug: parts[2], country: 'bw' };
    } catch (e) { return null; }
  }

  /* /bw/<slug>  ->  { country:'bw', slug:'<slug>' } */
  function fromPath(pathname) {
    var p = String(pathname || '').replace(/\/+$/, '');
    var m = p.match(/^\/([a-zA-Z]{2})\/([^\/?#]+)$/);
    if (!m) return null;
    var slug;
    try { slug = decodeURIComponent(m[2]); } catch (e) { slug = m[2]; }
    return { country: m[1].toLowerCase(), slug: slug };
  }

  /* ?link=<slug>[&country=bw] */
  function fromQuery(search) {
    try {
      var u = new URLSearchParams(String(search || '').replace(/^\?/, ''));
      var slug = u.get('link');
      if (!slug) return null;
      return { country: (u.get('country') || 'bw').toLowerCase(), slug: slug };
    } catch (e) { return null; }
  }

  /**
   * Work out what this page load is asking for, or null for a normal visit.
   * Priority: edge meta hint > ?link= > /bw/<slug> path.
   */
  function detect(loc, doc) {
    loc = loc || (typeof window !== 'undefined' ? window.location : null);
    doc = doc || (typeof document !== 'undefined' ? document : null);

    var meta = readMeta(doc);
    if (meta && meta.refId) return meta;

    var q = fromQuery(loc && loc.search);
    if (q) { q.needsResolve = 1; return q; }

    var p = fromPath(loc && loc.pathname);
    if (p) { p.needsResolve = 1; return p; }

    return null;
  }

  /** Fill in type/refId for a target that only carries a slug. */
  function resolve(target) {
    if (!target) return Promise.resolve(null);
    if (!target.needsResolve) return Promise.resolve(target);
    if (typeof fetch !== 'function') return Promise.resolve(null);

    var url = '/api/links/resolve?country=' + encodeURIComponent(target.country || 'bw') +
      '&slug=' + encodeURIComponent(target.slug || '');
    return fetch(url).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok || !d.found) return null;
      if (d.redirect) return { redirect: true, country: d.country || target.country, slug: d.to };
      return {
        type: d.link.type,
        refId: d.link.refId,
        slug: d.link.slug,
        country: d.link.country,
        name: d.link.name
      };
    }).catch(function () { return null; });
  }

  var API = { detect: detect, resolve: resolve, readMeta: readMeta, fromPath: fromPath, fromQuery: fromQuery };
  if (typeof window !== 'undefined') window.EatoutsRouter = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
