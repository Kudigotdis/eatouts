/* /api/customer/promo-submissions
   The single write path into the promo moderation queue.

   GET  -> { submissions: [...] }
           customer:      the caller's own submissions
           ?restaurantId= a business's submissions (marketing_manager+)
   POST -> { ok, id, status, quote }   queue a promo for admin review
           customer:      requireCustomer (event promotion)
           business:      body.restaurantId present -> requireBusiness
                          (marketing_manager+); source='business'.

   Customer submissions are event promotions and keep the flat P50 model.
   Business submissions carry the full promo shape and are quoted here:

     days          = activeDays(payload)                (Rule A)
     freeDaysLeft  = 3 - SUM(quoted_days) this month
     fee           = 0                      when days <= freeDaysLeft
                   = 50 + (days - 1) * 10   otherwise

   The quote is locked at submission time, so approval order can never
   change the price. Business promos are NEVER published here: they land
   as status='pending' for the admin to approve and publish. */
import { json, readJson, now } from './../_shared.js';
import { requireCustomer, promoSubmissionOut } from './../_customer.js';
import { requireBusiness, insertRow, updateRow } from './../_business.js';
import {
  activeDays, isRecurring, quotePromoFee, INCLUDED_PROMO_DAYS_PER_MONTH
} from './../_promo-rules.js';
import {
  PROMO_COLUMNS, PROMO_OPTIONAL, promoValues, freeDaysLeft, promoMonth, mergePromo
} from './../_promo-write.js';

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

function whenText(p) {
  var when = [p.startDate, p.startTime].filter(Boolean).join(' ');
  if (p.endDate) when += (when ? ' – ' : '') + p.endDate + (p.endTime ? ' ' + p.endTime : '');
  return when || null;
}

async function nextInvoiceId(db) {
  return 'inv_' + crypto.randomUUID().replace(/-/g, '').slice(0, 18);
}

/** Write the stable draft row that the admin later publishes in place. */
async function writePromoRow(db, rid, promoId, promo, opts) {
  var existing = await db.prepare('SELECT * FROM promos WHERE id = ?').bind(promoId).first();
  if (existing) {
    if (existing.restaurant_id && existing.restaurant_id !== rid) {
      throw new Error('promo_belongs_to_another_venue');
    }
    var upd = promoValues(promo, existing, opts);
    upd.id = promoId;
    upd.restaurant_id = rid;
    upd.created_at = existing.created_at;
    await updateRow(db, 'promos', upd, PROMO_COLUMNS, PROMO_OPTIONAL);
    return existing.id;
  }
  var values = promoValues(promo, null, opts);
  values.id = promoId;
  values.restaurant_id = rid;
  await insertRow(db, 'promos', values, PROMO_COLUMNS, PROMO_OPTIONAL);
  return promoId;
}

async function submitBusinessPromo(context, biz, b) {
  var rid = biz.restaurantId;
  var db = biz.db;
  var ts = now();

  var promo = mergePromo(Object.assign({}, b, b.payload || {}), null);
  var title = String(b.title || promo.title || '').trim();
  if (!title) return json({ ok: false, error: 'title is required' }, 400);

  /* Rule A needs a bounded, non-empty run when the promo recurs. */
  var days = activeDays(promo);
  if (isRecurring(promo)) {
    if (!promo.endDate) {
      return json({ ok: false, error: 'recurring_requires_end_date' }, 400);
    }
    if (days < 1) {
      return json({ ok: false, error: 'no_matching_days' }, 400);
    }
  }
  if (days < 1) days = 1;

  var eventRef = String(b.eventRef || b.event_ref || b.id || promo.id || '').trim() ||
    ('promo_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var promoId = eventRef;

  var month = promoMonth(ts);

  /* Resubmitting the same promo updates it in place, so the old quote
     must not be counted against the allowance twice. */
  var existing = await db.prepare(
    "SELECT * FROM promo_submissions WHERE restaurant_id = ? AND event_ref = ? " +
    "AND status IN ('pending','approved','published')"
  ).bind(rid, eventRef).first();

  var left = await freeDaysLeft(db, rid, month, INCLUDED_PROMO_DAYS_PER_MONTH,
    existing ? existing.id : null);
  var quote = quotePromoFee({ days: days, freeDaysLeft: left });

  var paymentStatus = quote.included ? 'not_required' : 'pending';
  var submissionId = existing ? existing.id : ('psub_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));

  var invoiceId = existing && existing.invoice_id ? existing.invoice_id : null;
  if (!quote.included) {
    if (invoiceId) {
      try {
        await db.prepare(
          "UPDATE invoices SET amount = ?, status = 'due', note = ?, due_at = ? WHERE id = ?"
        ).bind(quote.fee, 'Promo: ' + title, ts + 7 * 86400000, invoiceId).run();
      } catch (e) { /* the invoice row may predate 0014; it is still linked */ }
    } else {
      invoiceId = await nextInvoiceId(db);
      await db.prepare(
        'INSERT INTO invoices ' +
        '(id, restaurant_id, type, amount, currency, status, reference, note, created_at, promo_id, submission_id, due_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(
        invoiceId, rid, 'promo', quote.fee, 'BWP', 'due', promoId,
        'Promo: ' + title, ts, promoId, submissionId, ts + 7 * 86400000
      ).run();
    }
  } else {
    paymentStatus = 'not_required';
  }

  await writePromoRow(db, rid, promoId, promo, {
    id: promoId,
    restaurantId: rid,
    status: 'submitted',
    active: 0,
    now: ts,
    quotaMonth: month,
    submissionId: submissionId,
    paymentStatus: paymentStatus,
    invoiceId: invoiceId,
    feeCharged: quote.fee,
    submittedAt: ts
  });

  var payload = JSON.stringify(promo);
  var summary = b.summary || promo.description || null;
  var imageRef = b.imageRef || b.image_ref || promo.image || null;
  var when = b.whenText || b.when_text || whenText(promo);

  if (existing) {
    await db.prepare(
      'UPDATE promo_submissions SET title = ?, venue_name = ?, when_text = ?, summary = ?, ' +
      'image_ref = ?, fee = ?, payload = ?, status = ?, month_key = ?, promo_id = ?, ' +
      'fee_charged = ?, quoted_days = ?, quoted_free = ?, payment_status = ?, invoice_id = ?, ' +
      'promo_draft_id = ?, updated_at = ? WHERE id = ?'
    ).bind(
      title,
      b.venueName || b.venue_name || existing.venue_name || null,
      when, summary, imageRef, quote.fee, payload, 'pending', month, promoId,
      quote.fee, days, quote.included ? 1 : 0, paymentStatus, invoiceId,
      promoId, ts, existing.id
    ).run();
  } else {
    await db.prepare(
      'INSERT INTO promo_submissions ' +
      '(id, user_id, event_ref, title, venue_id, venue_name, when_text, summary, image_ref, ' +
      'fee, currency, status, payload, created_at, updated_at, restaurant_id, source, ' +
      'month_key, promo_id, fee_charged, billed, quoted_days, quoted_free, payment_status, ' +
      'invoice_id, promo_draft_id) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      submissionId, biz.userId, eventRef, title,
      b.venueId || b.venue_id || rid,
      b.venueName || b.venue_name || null,
      when, summary, imageRef,
      quote.fee, 'BWP', 'pending', payload, ts, ts, rid, 'business',
      month, promoId, quote.fee, 0, days, quote.included ? 1 : 0, paymentStatus,
      invoiceId, promoId
    ).run();
  }

  return json({
    ok: true,
    id: submissionId,
    promoId: promoId,
    status: 'pending',
    source: 'business',
    updated: !!existing,
    quote: {
      days: days,
      fee: quote.fee,
      included: quote.included,
      freeDaysLeft: left,
      month: month,
      invoiceId: invoiceId
    }
  }, existing ? 200 : 201);
}

/* Cancel a pending submission. The draft promo goes back to `draft` and
   the free days it held are released (the allowance only sums pending /
   approved / published rows). */
export async function onRequestPatch(context) {
  var b = await readJson(context.request);
  var id = String(b.id || '').trim();
  var action = String(b.action || 'cancel').trim().toLowerCase();
  if (!id) return json({ ok: false, error: 'id is required' }, 400);
  if (action !== 'cancel') {
    return json({ ok: false, error: 'unsupported_action' }, 400);
  }

  var db = context.env && context.env.DB;
  if (!db) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var row = await db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);
  if (!row.restaurant_id) return json({ ok: false, error: 'not_a_business_promo' }, 400);

  var biz = await requireBusiness(context, row.restaurant_id, 'marketing_manager');
  if (biz.error) return biz.error;

  if (['pending', 'approved'].indexOf(String(row.status || '')) === -1) {
    return json({ ok: false, error: 'not_cancellable', status: row.status }, 409);
  }

  var t = now();
  var note = b.note || b.adminNote || 'Cancelled by the business';

  var pid = row.promo_id || row.promo_draft_id || row.event_ref;
  if (pid) {
    try {
      await db.prepare(
        "UPDATE promos SET status = ?, active = ?, submitted_at = NULL, updated_at = ? WHERE id = ?"
      ).bind('draft', 0, t, pid).run();
    } catch (e) { /* pre-0014 shape */ }
  }
  if (row.invoice_id) {
    try {
      await db.prepare("UPDATE invoices SET status = ? WHERE id = ? AND status != 'paid'")
        .bind('void', row.invoice_id).run();
    } catch (e) { /* no void status */ }
  }

  await db.prepare(
    'UPDATE promo_submissions SET status = ?, admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?'
  ).bind('rejected', note, t, t, id).run();

  return json({ ok: true, id: id, status: 'rejected' });
}

export async function onRequestPost(context) {
  var b = await readJson(context.request);
  var restaurantId = String(b.restaurantId || b.restaurant_id || '').trim();

  if (restaurantId) {
    var biz = await requireBusiness(context, restaurantId, 'marketing_manager');
    if (biz.error) return biz.error;
    try {
      return await submitBusinessPromo(context, biz, b);
    } catch (e) {
      return json({ ok: false, error: 'could_not_submit_promo' }, 500);
    }
  }

  var c = await requireCustomer(context);
  if (c.error) return c.error;

  var title = String(b.title || '').trim();
  if (!title) return json({ ok: false, error: 'title is required' }, 400);

  var userId = c.userId;
  var db = c.db;
  var source = 'customer';

  var eventRef = String(b.eventRef || b.event_ref || b.id || '').trim() ||
    ('evtref_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12));
  var ts = now();
  var payload = b.payload ? JSON.stringify(b.payload) : null;

  var existing = await db.prepare(
    'SELECT id FROM promo_submissions WHERE user_id = ? AND event_ref = ? AND status IN (\'pending\',\'approved\')'
  ).bind(userId, eventRef).first();
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
    b.venueId || b.venue_id || null,
    b.venueName || b.venue_name || null,
    b.whenText || b.when_text || null,
    b.summary || null,
    b.imageRef || b.image_ref || null,
    (b.fee != null ? b.fee : 50),
    b.currency || 'BWP',
    'pending',
    payload, ts, ts,
    null, source
  ).run();

  return json({ ok: true, id: id, status: 'pending', source: source }, 201);
}
