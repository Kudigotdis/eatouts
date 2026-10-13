/* /api/customer/addresses
   GET  -> { addresses: [...] }
   POST -> { ok, id } */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, addressOut } from './../_customer.js';

export async function onRequestGet(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC'
  ).bind(c.userId).all();
  return json({ addresses: (res.results || []).map(addressOut) });
}

export async function onRequestPost(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var b = await readJson(context.request);
  var id = b.id || ('addr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var ts = now();
  await c.db.prepare(
    'INSERT INTO addresses (id, user_id, label, district, town, area, street, address, contact, is_default, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.userId, b.label || null, b.district || null, b.town || null, b.area || null,
    b.street || null, b.address || null, b.contact || null, b.isDefault ? 1 : 0, ts, ts
  ).run();
  return json({ ok: true, id: id }, 201);
}
