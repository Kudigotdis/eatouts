/* ============================================================
   GET /api/venues/:id      -> one venue's canonical public bundle
   GET /api/venues/:slug    -> same, resolved by slug

   Public, unauthenticated read used by the customer app to hydrate
   a venue's published profile + menu + gallery + promos + events
   straight from D1 (the single source of truth) instead of the
   duplicated localStorage stores.

   Only public-safe content is returned: visible menu items and
   gallery images, active promos, published events.

   Age-restricted promos (alcohol) are removed unless the caller is
   signed in as an account that is 18 or older.
   ============================================================ */
import { json, getSession } from './../_shared.js';
import { meetsAge } from './../_auth.js';
import { isAgeRestrictedPromo } from './../_promo-rules.js';
import {
  restaurantOut, categoryOut, itemOut, galleryGroupOut,
  galleryImageOut, eventOut
} from './../_business.js';

/* "2026-11-07" + "18:00" -> epoch ms. Null when the date part is missing. */
function stamp(date, time) {
  if (!date) return null;
  var t = Date.parse(String(date) + (time ? 'T' + String(time) : ''));
  return isNaN(t) ? null : t;
}

function promoOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    details: r.details || null,
    description: r.description || r.details || null,
    imageKey: r.image_key || r.image || null,
    active: !!r.active,
    /* The operator flag, when the column is there, plus the shared rule. */
    ageRestricted: !!r.age_restricted || isAgeRestrictedPromo({
      type: r.type || null,
      title: r.title || '',
      description: r.description || r.details || '',
      sponsor: r.sponsor || '',
      terms: r.terms || ''
    }),
    startsAt: r.starts_at != null ? r.starts_at : stamp(r.start_date, r.start_time),
    endsAt: r.ends_at != null ? r.ends_at : stamp(r.end_date, r.end_time),
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

async function rowsOf(db, sql, id) {
  /* One missing column or table must not take the whole bundle down:
     the caller still gets the venue profile it came for. */
  try {
    var res = await db.prepare(sql).bind(id).all();
    return (res && res.results) || [];
  } catch (e) {
    return [];
  }
}

/** True when the signed-in account is old enough for age-restricted promos. */
async function viewerIsAdult(env, request) {
  try {
    var session = await getSession(env, request);
    if (!session || !session.userId) return false;
    var row = await env.DB.prepare('SELECT profile FROM users WHERE id = ?').bind(session.userId).first();
    if (!row) return false;
    var profile = {};
    try { profile = row.profile ? JSON.parse(row.profile) : {}; } catch (e) { profile = {}; }
    return meetsAge(profile.dob, 18);
  } catch (e) {
    return false;
  }
}

export async function onRequestGet(context) {
  var env = context.env;
  if (!env || !env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var raw = context.params && context.params.id;
  var id = String(raw == null ? '' : raw).trim();
  if (!id) return json({ ok: false, error: 'not_found' }, 404);

  var r = await env.DB.prepare(
    'SELECT * FROM restaurants WHERE id = ? OR slug = ? LIMIT 1'
  ).bind(id, id).first();
  if (!r && id !== id.toLowerCase()) {
    r = await env.DB.prepare(
      'SELECT * FROM restaurants WHERE lower(slug) = ? LIMIT 1'
    ).bind(id.toLowerCase()).first();
  }
  if (!r) return json({ ok: false, error: 'not_found' }, 404);

  var rid = r.id;
  var parts = await Promise.all([
    rowsOf(env.DB, 'SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY position, created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM menu_items WHERE restaurant_id = ? AND visible = 1 ORDER BY position, created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM gallery_groups WHERE restaurant_id = ? AND visible = 1 ORDER BY position, created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM gallery_images WHERE restaurant_id = ? AND visible = 1 ORDER BY position, created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM promos WHERE restaurant_id = ? AND (active = 1 OR status = \'active\') ORDER BY created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM events WHERE restaurant_id = ? AND published = 1 ORDER BY starts_at, created_at', rid)
  ]);

  var venue = restaurantOut(r);
  var promos = parts[4].map(promoOut);

  /* Age-restricted promos only go to an account that is 18 or older. */
  var adult = await viewerIsAdult(env, context.request);
  if (!adult) {
    promos = promos.filter(function (p) { return !p.ageRestricted; });
  }

  venue.content = {
    profile: restaurantOut(r),
    menuCategories: parts[0].map(categoryOut),
    menuItems: parts[1].map(itemOut),
    galleryGroups: parts[2].map(galleryGroupOut),
    galleryImages: parts[3].map(galleryImageOut),
    promos: promos,
    events: parts[5].map(eventOut)
  };

  return json({ ok: true, venue: venue });
}
