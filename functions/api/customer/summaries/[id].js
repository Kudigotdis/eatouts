/* DELETE /api/customer/summaries/:id */
import { json } from './../../_shared.js';
import { requireCustomer } from './../../_customer.js';

export async function onRequestDelete(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var id = context.params.id;
  await c.db.prepare('DELETE FROM saved_summaries WHERE id = ? AND user_id = ?')
    .bind(id, c.userId).run();
  return json({ ok: true });
}
