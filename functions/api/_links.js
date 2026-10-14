/* ============================================================
   Shared helpers for public business links. Import-only.

   A link is  /<country>/<slug>  ->  { type, refId, name }.
   Resolution order:
     1) D1 business_links (claims, custom slugs, redirects)
     2) assets/data/link_registry.json (auto-derived for every listing)

   Slug rules mirror js/eatouts-slug.js exactly.
   ============================================================ */
import { json, getSession } from './_shared.js';

export var MIN = 3;
export var MAX = 40;

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

/** Canonical lowercase link name: a-z 0-9 and "." only. */
export function normalizeSlug(input) {
  var s = String(input == null ? '' : input).toLowerCase();
  try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  s = s.replace(/&/g, '');
  s = s.replace(/[^a-z0-9.]+/g, '');
  s = s.replace(/\.{2,}/g, '.');
  s = s.replace(/^\.+/, '').replace(/\.+$/, '');
  if (s.length > MAX) s = s.slice(0, MAX).replace(/\.+$/, '');
  return s;
}

export function isValidSlug(slug) {
  var s = String(slug || '');
  if (s.length < MIN || s.length > MAX) return false;
  if (!/^[a-z0-9]+(\.[a-z0-9]+)*$/.test(s)) return false;
  if (Object.prototype.hasOwnProperty.call(RESERVED, s)) return false;
  return true;
}

export function slugReason(input) {
  var s = normalizeSlug(input);
  if (!s) return 'Enter a link name.';
  if (s.length < MIN) return 'Use at least ' + MIN + ' characters.';
  if (Object.prototype.hasOwnProperty.call(RESERVED, s)) return 'That name is reserved by EatOuts.';
  if (!isValidSlug(s)) return 'Use only letters, numbers and periods.';
  return '';
}

export function countryOf(value) {
  var c = String(value || 'bw').trim().toLowerCase();
  return /^[a-z]{2}$/.test(c) ? c : 'bw';
}

/** row <-> client mapper */
export function linkOut(r) {
  return {
    id: r.id,
    country: r.country_code || 'bw',
    slug: r.slug,
    type: r.type,
    refId: r.ref_id,
    displaySlug: r.display_slug || r.slug,
    name: r.name || null,
    status: r.status || 'active',
    redirectTo: r.redirect_to || null,
    claimedBy: r.claimed_by || null,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

/* Registry JSON is a build artifact; cache it for the isolate's lifetime. */
var _registry = null;

export async function getRegistry(env, request) {
  if (_registry) return _registry;
  try {
    if (!env || !env.ASSETS || !env.ASSETS.fetch) { _registry = {}; return _registry; }
    var url = new URL('/assets/data/link_registry.json', request.url);
    var res = await env.ASSETS.fetch(new Request(url.toString()));
    if (!res || !res.ok) { _registry = {}; return _registry; }
    var data = await res.json();
    _registry = (data && data.bySlug) || {};
  } catch (e) {
    _registry = {};
  }
  return _registry;
}

/**
 * Resolve a slug for a country. Returns one of:
 *   { found: true, redirect: '<slug>' }                 (301)
 *   { found: true, type, refId, name, slug, source }    (200)
 *   { found: false }
 */
export async function resolveLink(context, country, slug) {
  var env = context.env;
  var cc = countryOf(country);
  var s = normalizeSlug(slug);
  if (!isValidSlug(s)) return { found: false };

  if (env && env.DB) {
    try {
      var row = await env.DB.prepare(
        'SELECT * FROM business_links WHERE country_code = ? AND slug = ?'
      ).bind(cc, s).first();
      if (row) {
        if (row.status === 'redirect') {
          return { found: true, redirect: row.redirect_to, source: 'claimed' };
        }
        if (row.status === 'active') {
          return {
            found: true, type: row.type, refId: row.ref_id,
            name: row.name, slug: row.slug, source: 'claimed'
          };
        }
        return { found: false };
      }
    } catch (e) { /* fall through to the static registry */ }
  }

  var reg = await getRegistry(env, context.request);
  var item = reg[s];
  if (item && item.type && item.refId) {
    return { found: true, type: item.type, refId: item.refId, name: item.name || null, slug: s, source: 'registry' };
  }
  return { found: false };
}

/** Any signed-in session (customer or manager). */
export async function requireSession(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var session = await getSession(env, context.request);
  if (!session) return { error: json({ ok: false, error: 'not_authenticated' }, 401) };
  return { session: session, userId: session.userId, env: env, db: env.DB };
}
