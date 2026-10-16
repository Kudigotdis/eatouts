/* ============================================================
   GET /api/venues/:id      -> one venue's canonical public bundle
   GET /api/venues/:slug    -> same, resolved by slug

   Public, unauthenticated read used by the customer app to hydrate
   a venue's published profile + menu + gallery + promos + events
   straight from D1 (the single source of truth) instead of the
   duplicated localStorage stores.

   Only public-safe content is returned: visible menu items and
   gallery images, active promos, published events.
   ============================================================ */
import { json } from './../_shared.js';
import {
  restaurantOut, categoryOut, itemOut, galleryGroupOut,
  galleryImageOut, eventOut
} from './../_business.js';

function promoOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    details: r.details || null,
    imageKey: r.image_key || null,
    active: !!r.active,
    startsAt: r.starts_at != null ? r.starts_at : null,
    endsAt: r.ends_at != null ? r.ends_at : null,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

async function rowsOf(db, sql, id) {
  var res = await db.prepare(sql).bind(id).all();
  return (res && res.results) || [];
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
    rowsOf(env.DB, 'SELECT * FROM promos WHERE restaurant_id = ? AND active = 1 ORDER BY created_at', rid),
    rowsOf(env.DB, 'SELECT * FROM events WHERE restaurant_id = ? AND published = 1 ORDER BY starts_at, created_at', rid)
  ]);

  var venue = restaurantOut(r);
  venue.content = {
    profile: restaurantOut(r),
    menuCategories: parts[0].map(categoryOut),
    menuItems: parts[1].map(itemOut),
    galleryGroups: parts[2].map(galleryGroupOut),
    galleryImages: parts[3].map(galleryImageOut),
    promos: parts[4].map(promoOut),
    events: parts[5].map(eventOut)
  };

  return json({ ok: true, venue: venue });
}
