/* /api/customer/events
   GET  -> { events: [...] }
   POST -> { ok, id }  (upsert on user_id + event_ref) */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, eventOut } from './../_customer.js';

export async function onRequestGet(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT * FROM saved_events WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(c.userId).all();
  return json({ events: (res.results || []).map(eventOut) });
}

export async function onRequestPost(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var b = await readJson(context.request);
  var eventRef = String(b.eventRef || b.event_ref || b.id || '').trim();
  if (!eventRef) return json({ ok: false, error: 'eventRef is required' }, 400);

  var existing = await c.db.prepare(
    'SELECT id FROM saved_events WHERE user_id = ? AND event_ref = ?'
  ).bind(c.userId, eventRef).first();

  var id = existing ? existing.id : ('evt_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var payload = b.payload ? JSON.stringify(b.payload) : null;

  if (existing) {
    await c.db.prepare(
      'UPDATE saved_events SET title = ?, venue_id = ?, venue_name = ?, image_ref = ?, payload = ? WHERE id = ?'
    ).bind(
      b.title || null, b.venueId || b.venue_id || null, b.venueName || b.venue_name || null,
      b.imageRef || b.image_ref || null, payload, id
    ).run();
  } else {
    await c.db.prepare(
      'INSERT INTO saved_events (id, user_id, event_ref, title, venue_id, venue_name, image_ref, payload, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id, c.userId, eventRef, b.title || null,
      b.venueId || b.venue_id || null, b.venueName || b.venue_name || null,
      b.imageRef || b.image_ref || null, payload, b.created_at || now()
    ).run();
  }
  return json({ ok: true, id: id }, existing ? 200 : 201);
}
