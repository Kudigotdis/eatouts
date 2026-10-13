/* DELETE /api/customer/events/:ref */
import { json } from './../../_shared.js';
import { requireCustomer } from './../../_customer.js';

export async function onRequestDelete(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var ref = decodeURIComponent(context.params.ref || '');
  await c.db.prepare('DELETE FROM saved_events WHERE user_id = ? AND event_ref = ?')
    .bind(c.userId, ref).run();
  return json({ ok: true });
}
