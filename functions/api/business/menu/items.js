/* /api/business/menu/items
   POST ?restaurant=rest_x { name, categoryId?, description?, price?, currency?, imageKey?, visible?, position? }
        -> { ok, item }   (menu_manager+) */
import { json, readJson, now, uid } from './../../_shared.js';
import { requireBusiness, itemOut, str } from './../../_business.js';

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'menu_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var name = str(b.name);
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  var id = b.id || uid('mitem');
  var ts = now();
  await c.db.prepare(
    'INSERT INTO menu_items (id, restaurant_id, category_id, name, description, price, currency, image_key, visible, position, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.restaurantId, str(b.categoryId) || null, name, str(b.description),
    b.price != null && b.price !== '' ? Number(b.price) : null, str(b.currency) || 'BWP',
    str(b.imageKey), b.visible === false ? 0 : 1, Number(b.position) || 0, ts, ts
  ).run();

  var row = await c.db.prepare('SELECT * FROM menu_items WHERE id = ?').bind(id).first();
  return json({ ok: true, item: itemOut(row) }, 201);
}
