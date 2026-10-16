/* /api/customer/promo-submissions
   The single write path into the P50 promo moderation queue.

   GET  -> { submissions: [...] }
           customer:      the caller's own submissions
           ?restaurantId= a business's submissions (marketing_manager+)
   POST -> { ok, id, status }   queue a promo for admin review
           customer:      requireCustomer (event promotion)
           business:      body.restaurantId present -> requireBusiness
                          (marketing_manager+); source='business'.

   Business promos are NEVER published here — they always land as
   status='pending' for the admin dashboard to approve/publish. */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, promoSubmissionOut } from './../_customer.js';
import { requireBusiness } from './../_business.js';

function restaurantParam(context) {
  var url = new URL(context.request.url);
  return String(url.searchParams.get('restaurantId') || url.searchParams.get('restaurant') || '').trim();
}

export async function onRequestGet(context) {
  var rid = restaurantParam(context);

  if (rid) {
    var biz = await requireBusiness(context, rid, 'marketing_manager');
    if (biz.error) return biz.error;
    var brows = await biz.db.prepare(
      'SELECT * FROM promo_submissions WHERE restaurant_id = ? ORDER BY created_at DESC'
    ).bind(rid).all();
    return json({ submissions: (brows.results || []).map(promoSubmissionOut) });
  }

  var c = await requireCustomer(context);
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT * FROM promo_submissions WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(c.userId).all();
  return json({ submissions: (res.results || []).map(promoSubmissionOut) });
}

export async function onRequestPost(context) {
  var b = await readJson(context.request);
  var restaurantId = String(b.restaurantId || b.restaurant_id || '').trim();

  var userId, db, source;
  if (restaurantId) {
    var biz = await requireBusiness(context, restaurantId, 'marketing_manager');
    if (biz.error) return biz.error;
    userId = biz.userId; db = biz.db; source = 'business';
  } else {
    var c = await requireCustomer(context);
    if (c.error) return c.error;
    userId = c.userId; db = c.db; source = 'customer';
  }

  var title = String(b.title || '').trim();
  if (!title) return json({ ok: false, error: 'title is required' }, 400);

  var eventRef = String(b.eventRef || b.event_ref || b.id || '').trim() ||
    ('evtref_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var ts = now();
  var payload = b.payload ? JSON.stringify(b.payload) : null;

  var existing;
  if (source === 'business') {
    existing = await db.prepare(
      'SELECT id FROM promo_submissions WHERE restaurant_id = ? AND event_ref = ? AND status IN (\'pending\',\'approved\',\'published\')'
    ).bind(restaurantId, eventRef).first();
  } else {
    existing = await db.prepare(
      'SELECT id FROM promo_submissions WHERE user_id = ? AND event_ref = ? AND status IN (\'pending\',\'approved\')'
    ).bind(userId, eventRef).first();
  }
  if (existing) {
    return json({ ok: true, id: existing.id, already: true }, 200);
  }

  var id = 'psub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  await db.prepare(
    'INSERT INTO promo_submissions ' +
    '(id, user_id, event_ref, title, venue_id, venue_name, when_text, summary, image_ref, fee, currency, status, payload, created_at, updated_at, restaurant_id, source) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, userId, eventRef, title,
    b.venueId || b.venue_id || restaurantId || null,
    b.venueName || b.venue_name || null,
    b.whenText || b.when_text || null,
    b.summary || null,
    b.imageRef || b.image_ref || null,
    (b.fee != null ? b.fee : 50),
    b.currency || 'BWP',
    'pending',
    payload, ts, ts,
    restaurantId || null, source
  ).run();

  return json({ ok: true, id: id, status: 'pending', source: source }, 201);
}
