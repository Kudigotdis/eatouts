/* /api/business/menu/categories/:id
   PATCH  { name?, position? } -> update a category   (menu_manager+)
   DELETE                       -> delete + detach its items (menu_manager+) */
import { json, readJson } from './../../../_shared.js';
import { requireBusiness, categoryOut, str } from './../../../_business.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM menu_categories WHERE id = ?').bind(context.params.id).first();
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
  var name = b.name !== undefined ? str(b.name) : row.name;
  if (!name) return json({ ok: false, error: 'name_required' }, 400);
  var position = b.position !== undefined ? (Number(b.position) || 0) : row.position;
  await l.c.db.prepare('UPDATE menu_categories SET name = ?, position = ? WHERE id = ?')
    .bind(name, position, row.id).run();
  var updated = await l.c.db.prepare('SELECT * FROM menu_categories WHERE id = ?').bind(row.id).first();
  return json({ ok: true, category: categoryOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await l.c.db.prepare('DELETE FROM menu_categories WHERE id = ?').bind(l.row.id).run();
  await l.c.db.prepare('UPDATE menu_items SET category_id = NULL WHERE category_id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
