/* /api/customer/summaries
   GET  -> { summaries: [...] }
   POST -> { ok, id } */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, summaryOut } from './../_customer.js';

export async function onRequestGet(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT * FROM saved_summaries WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(c.userId).all();
  return json({ summaries: (res.results || []).map(summaryOut) });
}

export async function onRequestPost(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var b = await readJson(context.request);
  var payload = b.payload || b;
  var id = b.id || ('sum_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  await c.db.prepare(
    'INSERT INTO saved_summaries (id, user_id, order_ref, venue_id, venue_name, venue_logo, item_count, total, source, payload, created_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.userId,
    b.orderRef || b.order_ref || null,
    b.venueId || b.venue_id || null,
    b.venueName || b.venue_name || null,
    b.venueLogo || b.venue_logo || null,
    Number(b.itemCount || b.item_count || 0),
    (b.total != null ? Number(b.total) : null),
    b.source || 'app',
    JSON.stringify(payload),
    b.created_at || now()
  ).run();
  return json({ ok: true, id: id }, 201);
}
