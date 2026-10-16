/* /api/business/menu/categories
   POST ?restaurant=rest_x { name, position? } -> { ok, category }   (menu_manager+) */
import { json, readJson, now, uid } from './../../_shared.js';
import { requireBusiness, categoryOut, str } from './../../_business.js';

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'menu_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var name = str(b.name);
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  var id = b.id || uid('mcat');
  await c.db.prepare(
    'INSERT INTO menu_categories (id, restaurant_id, name, position, created_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, c.restaurantId, name, Number(b.position) || 0, now()).run();

  var row = await c.db.prepare('SELECT * FROM menu_categories WHERE id = ?').bind(id).first();
  return json({ ok: true, category: categoryOut(row) }, 201);
}
