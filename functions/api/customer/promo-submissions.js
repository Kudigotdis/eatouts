/* /api/customer/promo-submissions
   GET  -> { submissions: [...] }   (the caller's own promo submissions)
   POST -> { ok, id }               (queue an event for the P50 promo listing) */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, promoSubmissionOut } from './../_customer.js';

export async function onRequestGet(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT * FROM promo_submissions WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(c.userId).all();
  return json({ submissions: (res.results || []).map(promoSubmissionOut) });
}

export async function onRequestPost(context) {
  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var b = await readJson(context.request);

  var title = String(b.title || '').trim();
  if (!title) return json({ ok: false, error: 'title is required' }, 400);

  var eventRef = String(b.eventRef || b.event_ref || b.id || '').trim() ||
    ('evtref_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var ts = now();
  var payload = b.payload ? JSON.stringify(b.payload) : null;

  var existing = await c.db.prepare(
    'SELECT id FROM promo_submissions WHERE user_id = ? AND event_ref = ? AND status IN (\'pending\',\'approved\')'
  ).bind(c.userId, eventRef).first();
  if (existing) {
    return json({ ok: true, id: existing.id, already: true }, 200);
  }

  var id = 'psub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await c.db.prepare(
    'INSERT INTO promo_submissions ' +
    '(id, user_id, event_ref, title, venue_id, venue_name, when_text, summary, image_ref, fee, currency, status, payload, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.userId, eventRef, title,
    b.venueId || b.venue_id || null,
    b.venueName || b.venue_name || null,
    b.whenText || b.when_text || null,
    b.summary || null,
    b.imageRef || b.image_ref || null,
    (b.fee != null ? b.fee : 50),
    b.currency || 'BWP',
    'pending',
    payload, ts, ts
  ).run();

  return json({ ok: true, id: id, status: 'pending' }, 201);
}
