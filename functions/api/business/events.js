/* /api/business/events
   GET  ?restaurant=rest_x -> { events: [...] }   (marketing_manager+)
   POST ?restaurant=rest_x { id?, title, description?, figure?, imageKey?, admission?, startsAt?, endsAt?, published? }
        -> { ok, event } */
import { json, readJson, now, uid } from './../_shared.js';
import { requireBusiness, eventOut, str, jsonString, numOrNull } from './../_business.js';

export async function onRequestGet(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var rows = await c.db.prepare(
    'SELECT * FROM events WHERE restaurant_id = ? ORDER BY starts_at, created_at'
  ).bind(c.restaurantId).all();

  return json({ events: (rows.results || []).map(eventOut) });
}

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var title = str(b.title);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);

  var id = b.id || uid('evt');
  var ts = now();
  await c.db.prepare(
    'INSERT INTO events (id, restaurant_id, title, description, figure, image_key, admission, starts_at, ends_at, published, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.restaurantId, title, str(b.description), jsonString(b.figure), str(b.imageKey),
    str(b.admission), numOrNull(b.startsAt), numOrNull(b.endsAt), b.published ? 1 : 0, ts, ts
  ).run();

  var row = await c.db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
  return json({ ok: true, event: eventOut(row) }, 201);
}
