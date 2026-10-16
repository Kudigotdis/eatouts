/* /api/business/gallery/images
   POST ?restaurant=rest_x { id?, groupId?, imageKey, label?, visible?, position? }
        -> { ok, image }   (marketing_manager+) */
import { json, readJson, now, uid } from './../../_shared.js';
import { requireBusiness, galleryImageOut, str } from './../../_business.js';

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var imageKey = str(b.imageKey) || str(b.src);
  if (!imageKey) return json({ ok: false, error: 'image_key_required' }, 400);

  var id = b.id || uid('gimg');
  await c.db.prepare(
    'INSERT INTO gallery_images (id, restaurant_id, group_id, image_key, label, visible, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.restaurantId, str(b.groupId) || null, imageKey, str(b.label),
    b.visible === false ? 0 : 1, Number(b.position) || 0, now()
  ).run();

  var row = await c.db.prepare('SELECT * FROM gallery_images WHERE id = ?').bind(id).first();
  return json({ ok: true, image: galleryImageOut(row) }, 201);
}
