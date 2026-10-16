/* /api/business/menu/items/:id
   PATCH  { ...fields } -> update a menu item   (menu_manager+)
   DELETE                -> delete a menu item   (menu_manager+) */
import { json, readJson, now } from './../../../_shared.js';
import { requireBusiness, itemOut, str } from './../../../_business.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM menu_items WHERE id = ?').bind(context.params.id).first();
  if (!row) return { error: json({ ok: false, error: 'not_found' }, 404) };
  var c = await requireBusiness(context, row.restaurant_id, 'menu_manager');
  if (c.error) return c;
  return { row: row, c: c };
}

export async function onRequestPatch(context) {
  var l = await load(context);
  if (l.error) return l.error;
  var row = l.row;
  var b = await readJson(context.request);
  function pick(k, col) { return b[k] !== undefined ? b[k] : row[col || k]; }

  var name = str(pick('name')) || row.name;
  var price = b.price !== undefined
    ? (b.price === '' || b.price == null ? null : Number(b.price))
    : row.price;
  var visible = b.visible !== undefined ? (b.visible ? 1 : 0) : row.visible;

  await l.c.db.prepare(
    'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, currency = ?, ' +
    'image_key = ?, visible = ?, position = ?, updated_at = ? WHERE id = ?'
  ).bind(
    str(pick('categoryId', 'category_id')), name, str(pick('description')),
    price, str(pick('currency')) || 'BWP', str(pick('imageKey', 'image_key')),
    visible, Number(pick('position')) || 0, now(), row.id
  ).run();

  var updated = await l.c.db.prepare('SELECT * FROM menu_items WHERE id = ?').bind(row.id).first();
  return json({ ok: true, item: itemOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await l.c.db.prepare('DELETE FROM menu_items WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
