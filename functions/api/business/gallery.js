/* /api/business/gallery
   GET ?restaurant=rest_x -> { groups: [...], images: [...] }   (marketing_manager+) */
import { json } from './../_shared.js';
import { requireBusiness, galleryGroupOut, galleryImageOut } from './../_business.js';

export async function onRequestGet(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var groups = await c.db.prepare(
    'SELECT * FROM gallery_groups WHERE restaurant_id = ? ORDER BY position, title'
  ).bind(c.restaurantId).all();
  var images = await c.db.prepare(
    'SELECT * FROM gallery_images WHERE restaurant_id = ? ORDER BY position, created_at'
  ).bind(c.restaurantId).all();

  return json({
    groups: (groups.results || []).map(galleryGroupOut),
    images: (images.results || []).map(galleryImageOut)
  });
}
