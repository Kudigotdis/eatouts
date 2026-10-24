/* /api/admin/invoices  (admin only)
   GET   -> { invoices: [...] }                ?status=draft|due|paid&restaurantId=
   PATCH -> { ok, invoice }                     body { id, action }
             action: mark_paid | mark_due

   Tracking-only invoice management (G3). No gateway integration. */
import { json, readJson, now } from './../_shared.js';
import { requireAdmin, invoiceOut } from './../_customer.js';

var ACTIONS = { mark_paid: { status: 'paid', setPaidAt: true }, mark_due: { status: 'due', setPaidAt: false } };

export async function onRequestGet(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var url = new URL(context.request.url);
  var status = String(url.searchParams.get('status') || '').trim();
  var rid = String(url.searchParams.get('restaurantId') || url.searchParams.get('restaurant') || '').trim();
  var sql = 'SELECT * FROM invoices';
  var binds = [];
  var clauses = [];
  if (status) { clauses.push('status = ?'); binds.push(status); }
  if (rid) { clauses.push('restaurant_id = ?'); binds.push(rid); }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND');
  sql += ' ORDER BY created_at DESC LIMIT 200';

  var stmt = c.db.prepare(sql);
  if (binds.length) stmt = stmt.bind.apply(stmt, binds);
  var res = await stmt.all();
  return json({ invoices: (res.results || []).map(invoiceOut) });
}

export async function onRequestPatch(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var id = String(b.id || '').trim();
  var action = String(b.action || '').trim();
  var cfg = ACTIONS[action];
  if (!id || !cfg) {
    return json({ ok: false, error: 'id and a valid action (mark_paid|mark_due) are required' }, 400);
  }

  var row = await c.db.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var t = now();
  var paidAt = row.paid_at;
  if (cfg.setPaidAt) {
    if (!paidAt) paidAt = t;
  } else {
    paidAt = null;
  }

  await c.db.prepare(
    'UPDATE invoices SET status = ?, paid_at = ? WHERE id = ?'
  ).bind(cfg.status, paidAt, id).run();

  /* Keep the promo side of the ledger in step: marking an invoice paid is
     what unlocks the admin publish gate, so the submission and the promo
     row must observe it immediately. */
  if (row.promo_id || row.submission_id) {
    var payStatus = cfg.setPaidAt ? 'received' : 'pending';
    try {
      if (row.submission_id) {
        await c.db.prepare(
          'UPDATE promo_submissions SET payment_status = ?, billed = ?, updated_at = ? WHERE id = ?'
        ).bind(payStatus, cfg.setPaidAt ? 1 : 0, t, row.submission_id).run();
      }
      if (row.promo_id) {
        await c.db.prepare(
          'UPDATE promos SET payment_status = ?, updated_at = ? WHERE id = ?'
        ).bind(payStatus, t, row.promo_id).run();
      }
    } catch (e) { /* pre-0014 shape: the invoice is still the record */ }
  }

  var updated = await c.db.prepare('SELECT * FROM invoices WHERE id = ?').bind(id).first();
  return json({ ok: true, invoice: invoiceOut(updated || row) });
}
