/* /api/customer/favourites
   GET    -> { favourites: [...] }          (?type=promo to filter)
   POST   -> { ok, id }                     (idempotent on type+refId)
   DELETE -> { ok }                         (?type=&ref=) */
import { json, readJson, now, uid } from './../_shared.js';
import { requireCustomer, favouriteOut } from './../_customer.js';

export async function onRequestGet(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var type = new URL(context.request.url).searchParams.get('type');
  var sql = 'SELECT * FROM favourites WHERE user_id = ?';
  if (type) sql += ' AND type = ?';
  sql += ' ORDER BY created_at DESC';
  var stmt = type ? c.db.prepare(sql).bind(c.userId, type) : c.db.prepare(sql).bind(c.userId);
  var res = await stmt.all();
  return json({ favourites: (res.results || []).map(favouriteOut) });
}

export async function onRequestPost(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var b = await readJson(context.request);
  var type = String(b.type || '').trim();
  var refId = String(b.refId || b.ref_id || '').trim();
  if (!type || !refId) return json({ ok: false, error: 'type and refId are required' }, 400);

  var existing = await c.db.prepare(
    'SELECT id FROM favourites WHERE user_id = ? AND type = ? AND ref_id = ?'
  ).bind(c.userId, type, refId).first();
  if (existing) return json({ ok: true, id: existing.id, existing: true });

  var id = 'fav_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  var payload = b.payload ? JSON.stringify(b.payload) : null;
  await c.db.prepare(
    'INSERT INTO favourites (id, user_id, type, ref_id, title, subtitle, price, image_ref, venue_id, payload, created_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.userId, type, refId,
    b.title || null, b.subtitle || null,
    (b.price != null ? Number(b.price) : null),
    b.imageRef || b.image_ref || null,
    b.venueId || b.venue_id || null,
    payload, now()
  ).run();
  return json({ ok: true, id: id }, 201);
}

export async function onRequestDelete(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var params = new URL(context.request.url).searchParams;
  var type = params.get('type');
  var ref = params.get('ref') || params.get('refId');
  if (!type || !ref) return json({ ok: false, error: 'type and ref are required' }, 400);
  await c.db.prepare(
    'DELETE FROM favourites WHERE user_id = ? AND type = ? AND ref_id = ?'
  ).bind(c.userId, type, ref).run();
  return json({ ok: true });
}
