/* PATCH  /api/customer/addresses/:id  -> update fields
   DELETE /api/customer/addresses/:id  -> remove */
import { json, readJson, now } from './../../_shared.js';
import { requireCustomer } from './../../_customer.js';

export async function onRequestPatch(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var id = context.params.id;
  var b = await readJson(context.request);
  var row = await c.db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?')
    .bind(id, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  function pick(k) { return b[k] !== undefined ? b[k] : row[k]; }
  await c.db.prepare(
    'UPDATE addresses SET label = ?, district = ?, town = ?, area = ?, street = ?, address = ?, contact = ?, is_default = ?, updated_at = ? WHERE id = ?'
  ).bind(
    pick('label'), pick('district'), pick('town'), pick('area'), pick('street'),
    pick('address'), pick('contact'),
    (b.isDefault !== undefined ? (b.isDefault ? 1 : 0) : row.is_default),
    now(), id
  ).run();
  return json({ ok: true });
}

export async function onRequestDelete(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  await c.db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?')
    .bind(context.params.id, c.userId).run();
  return json({ ok: true });
}
