/* /api/business/menu
   GET ?restaurant=rest_x -> { categories: [...], items: [...] }   (menu_manager+) */
import { json } from './../_shared.js';
import { requireBusiness, categoryOut, itemOut } from './../_business.js';

export async function onRequestGet(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'menu_manager');
  if (c.error) return c.error;

  var cats = await c.db.prepare(
    'SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY position, name'
  ).bind(c.restaurantId).all();
  var items = await c.db.prepare(
    'SELECT * FROM menu_items WHERE restaurant_id = ? ORDER BY position, name'
  ).bind(c.restaurantId).all();

  return json({
    categories: (cats.results || []).map(categoryOut),
    items: (items.results || []).map(itemOut)
  });
}
