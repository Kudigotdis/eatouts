/* /api/business/gallery/groups
   POST ?restaurant=rest_x { id?, title, visible?, position? } -> { ok, group }   (marketing_manager+) */
import { json, readJson, now, uid } from './../../_shared.js';
import { requireBusiness, galleryGroupOut, str } from './../../_business.js';

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var title = str(b.title);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);

  var id = b.id || uid('ggrp');
  await c.db.prepare(
    'INSERT INTO gallery_groups (id, restaurant_id, title, visible, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, c.restaurantId, title, b.visible === false ? 0 : 1, Number(b.position) || 0, now()).run();

  var row = await c.db.prepare('SELECT * FROM gallery_groups WHERE id = ?').bind(id).first();
  return json({ ok: true, group: galleryGroupOut(row) }, 201);
}
