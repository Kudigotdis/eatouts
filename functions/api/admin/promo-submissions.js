/* /api/admin/promo-submissions  (admin only)
   GET   -> { submissions: [...] }              ?status=pending|approved|published|rejected
   PATCH -> { ok, submission }                  body { id, action, adminNote, override? }
              action: approve | reject | publish | cancel

   The quote is computed when the operator submits (see
   /api/customer/promo-submissions), never here. This endpoint only moves
   the submission through the workflow:

     approve  -> status='approved'  (still not live, invoice due)
     publish  -> promos.active=1    (payment gate unless override)
     reject   -> status='rejected'  (the draft returns to draft, free days released)
     cancel   -> same as reject, for an admin taking a promo down

   Publishing UPDATEs the existing draft row in place. It never INSERTs a
   second row. */
import { json, readJson, now } from './../_shared.js';
import { requireAdmin, promoSubmissionOut, uid } from './../_customer.js';
import { PROMO_COLUMNS, PROMO_OPTIONAL, promoValues, promoMonth, freeDaysUsed } from './../_promo-write.js';
import { INCLUDED_PROMO_DAYS_PER_MONTH } from './../_promo-rules.js';
import { insertRow } from './../_business.js';

var ACTIONS = ['approve', 'reject', 'publish', 'cancel'];

function parseJson(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

function promoIdOf(row) {
  return row.promo_id || row.promo_draft_id || row.event_ref || null;
}

/** The invoice this submission is (or should be) billed against. */
async function ensureInvoice(db, row, ts) {
  var fee = Number(row.fee_charged || 0);
  if (!(fee > 0)) return null;

  if (row.invoice_id) {
    var inv = await db.prepare('SELECT * FROM invoices WHERE id = ?').bind(row.invoice_id).first();
    if (inv) {
      if (inv.status === 'draft') {
        await db.prepare("UPDATE invoices SET status = 'due' WHERE id = ?").bind(inv.id).run();
        inv.status = 'due';
      }
      return inv;
    }
  }

  var pid = promoIdOf(row);
  var id = 'inv_' + uid('i').replace(/^i_/, '').slice(0, 18);
  await db.prepare(
    'INSERT INTO invoices ' +
    '(id, restaurant_id, type, amount, currency, status, reference, note, created_at, promo_id, submission_id, due_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, row.restaurant_id, 'promo', fee, row.currency || 'BWP', 'due', pid,
    'Promo: ' + (row.title || ''), ts, pid, row.id, ts + 7 * 86400000
  ).run();

  await db.prepare(
    'UPDATE promo_submissions SET invoice_id = ?, payment_status = ? WHERE id = ?'
  ).bind(id, 'pending', row.id).run();

  return { id: id, status: 'due', amount: fee, currency: row.currency || 'BWP' };
}

/** Point the existing draft promo row at the admin's decision. */
async function writePromoState(db, row, ts, changes) {
  var pid = promoIdOf(row);
  if (!pid) return null;

  var existing = await db.prepare('SELECT * FROM promos WHERE id = ?').bind(pid).first();
  if (existing) {
    await db.prepare(
      'UPDATE promos SET status = ?, active = ?, updated_at = ?' +
      (changes.publishedAt ? ', published_at = ?' : '') +
      (changes.paymentStatus ? ', payment_status = ?' : '') +
      (changes.feeCharged != null ? ', fee_charged = ?' : '') +
      (changes.quotaMonth ? ', quota_month = ?' : '') +
      (changes.submissionId ? ', submission_id = ?' : '') +
      ' WHERE id = ?'
    ).bind.apply(null, (function () {
      var args = [changes.status, changes.active, ts];
      if (changes.publishedAt) args.push(changes.publishedAt);
      if (changes.paymentStatus) args.push(changes.paymentStatus);
      if (changes.feeCharged != null) args.push(changes.feeCharged);
      if (changes.quotaMonth) args.push(changes.quotaMonth);
      if (changes.submissionId) args.push(changes.submissionId);
      args.push(pid);
      return args;
    })()).run();
    return pid;
  }

  /* A legacy submission with no draft row: build the full row from the
     payload rather than the old thin INSERT. */
  var payload = parseJson(row.payload);
  if (!payload) return null;
  var values = promoValues(payload, null, {
    id: pid,
    restaurantId: row.restaurant_id,
    status: changes.status,
    active: changes.active,
    now: ts,
    quotaMonth: changes.quotaMonth || promoMonth(ts),
    submissionId: row.id,
    paymentStatus: changes.paymentStatus || 'not_required',
    feeCharged: changes.feeCharged != null ? changes.feeCharged : Number(row.fee_charged || 0),
    publishedAt: changes.publishedAt || null
  });
  values.id = pid;
  values.created_at = row.created_at || ts;
  await insertRow(db, 'promos', values, PROMO_COLUMNS, PROMO_OPTIONAL);
  return pid;
}

export async function onRequestGet(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var url = new URL(context.request.url);
  var status = String(url.searchParams.get('status') || '').trim();
  var sql = 'SELECT * FROM promo_submissions';
  var binds = [];
  if (status) { sql += ' WHERE status = ?'; binds.push(status); }
  sql += ' ORDER BY created_at DESC LIMIT 200';

  var stmt = c.db.prepare(sql);
  if (binds.length) stmt = stmt.bind.apply(stmt, binds);
  var res = await stmt.all();
  var rows = res.results || [];

  /* The free-day meter for every venue in the queue, so the admin can
     see at a glance how many free days each one has left this month. */
  var month = promoMonth(Date.now());
  var seen = {};
  var freeDays = {};
  for (var i = 0; i < rows.length; i++) {
    var rid = rows[i].restaurant_id;
    if (!rid || seen[rid]) continue;
    seen[rid] = true;
    var used = await freeDaysUsed(c.db, rid, month);
    freeDays[rid] = {
      used: used,
      total: INCLUDED_PROMO_DAYS_PER_MONTH,
      left: Math.max(0, INCLUDED_PROMO_DAYS_PER_MONTH - used),
      month: month
    };
  }

  return json({
    submissions: rows.map(promoSubmissionOut),
    freeDays: freeDays,
    month: month
  });
}

export async function onRequestPatch(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var id = String(b.id || '').trim();
  var action = String(b.action || '').trim().toLowerCase();
  if (!id || ACTIONS.indexOf(action) === -1) {
    return json({
      ok: false,
      error: 'id and a valid action (approve|reject|publish|cancel) are required'
    }, 400);
  }

  var row = await c.db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var note = (b.adminNote !== undefined) ? b.adminNote : row.admin_note;
  var t = now();
  var isBusiness = row.source === 'business' && row.restaurant_id;

  if (action === 'approve') {
    if (isBusiness) await ensureInvoice(c.db, row, t);
    await c.db.prepare(
      'UPDATE promo_submissions SET status = ?, admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?'
    ).bind('approved', note || null, t, t, id).run();

  } else if (action === 'publish') {
    var invoice = isBusiness ? await ensureInvoice(c.db, row, t) : null;

    /* Re-read the invoice: mark_paid is what unlocks the gate. */
    var paid = ['received', 'waived'].indexOf(String(row.payment_status || '')) !== -1;
    if (invoice && invoice.id) {
      var invNow = await c.db.prepare('SELECT * FROM invoices WHERE id = ?').bind(invoice.id).first();
      if (invNow && invNow.status === 'paid') paid = true;
    }
    if (row.billed) paid = true;

    var fee = Number(row.fee_charged || 0);
    var override = b.override === true || b.override === 1 || b.override === '1';
    if (isBusiness && fee > 0 && !paid && !override) {
      return json({
        ok: false,
        error: 'payment_required',
        invoiceId: (invoice && invoice.id) || row.invoice_id || null,
        amount: fee,
        currency: row.currency || 'BWP',
        message: 'Payment not received. Mark the invoice paid first, or publish anyway.'
      }, 409);
    }

    var payStatus = fee > 0 ? (paid ? 'received' : 'waived') : 'not_required';
    var patchNote = note || null;
    if (isBusiness && fee > 0 && !paid && override) {
      patchNote = [note, 'Published without payment (admin override)'].filter(Boolean).join(' — ');
    }

    if (isBusiness) {
      await writePromoState(c.db, row, t, {
        status: 'active',
        active: 1,
        publishedAt: t,
        paymentStatus: payStatus,
        feeCharged: fee,
        quotaMonth: row.month_key || promoMonth(t),
        submissionId: row.id
      });
    }

    await c.db.prepare(
      'UPDATE promo_submissions SET status = ?, admin_note = ?, payment_status = ?, ' +
      'admin_override = ?, reviewed_at = ?, updated_at = ?, billed = ? WHERE id = ?'
    ).bind(
      'published', patchNote, payStatus,
      (override && fee > 0 && !paid) ? 1 : (row.admin_override ? 1 : 0),
      t, t, paid ? 1 : (row.billed ? 1 : 0), id
    ).run();

  } else {
    /* reject / cancel */
    if (isBusiness) {
      await writePromoState(c.db, row, t, {
        status: 'draft',
        active: 0,
        paymentStatus: 'not_required'
      });
      if (row.invoice_id) {
        try {
          await c.db.prepare(
            "UPDATE invoices SET status = 'void' WHERE id = ? AND status != 'paid'"
          ).bind(row.invoice_id).run();
        } catch (e) { /* no void status on an older shape */ }
      }
    }
    await c.db.prepare(
      'UPDATE promo_submissions SET status = ?, admin_note = ?, reviewed_at = ?, updated_at = ? WHERE id = ?'
    ).bind('rejected', note || null, t, t, id).run();
  }

  var updated = await c.db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(id).first();
  if (updated) updated.admin_note = note;
  return json({ ok: true, submission: promoSubmissionOut(updated || row) });
}
