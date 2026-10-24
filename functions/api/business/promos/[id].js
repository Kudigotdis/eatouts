/* /api/business/promos/:id
   PATCH  { ...fields, action?: 'pause'|'resume' }  -> update  (marketing_manager+)
   DELETE                                          -> delete + purge favourites

   The operator may edit a draft, and may pause / resume a promo that an
   admin has already published. They may never publish: `active = 1` is
   only ever set by `PATCH /api/admin/promo-submissions {action:'publish'}`.
   `resume` is safe because it only restores a row that already carries a
   `published_at` (an admin published it before it was paused). */
import { json, readJson, now } from './../../_shared.js';
import {
  requireBusiness, promoOut, purgeFavourites, updateRow
} from './../../_business.js';
import { PROMO_COLUMNS, PROMO_OPTIONAL, promoValues } from './../../_promo-write.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM promos WHERE id = ?').bind(context.params.id).first();
  if (!row) return { error: json({ ok: false, error: 'not_found' }, 404) };
  var c = await requireBusiness(context, row.restaurant_id, 'marketing_manager');
  if (c.error) return { error: c.error };
  return { row: row, c: c };
}

export async function onRequestPatch(context) {
  var l = await load(context);
  if (l.error) return l.error;
  var row = l.row;
  var b = await readJson(context.request);
  var ts = now();

  var status = String(row.status || 'draft');
  var action = String(b.action || '').trim().toLowerCase();
  var nextStatus;
  var nextActive;

  if (action === 'pause') {
    if (['active', 'paused'].indexOf(status) === -1) {
      return json({ ok: false, error: 'not_published', status: status }, 409);
    }
    nextStatus = 'paused';
    nextActive = 0;
  } else if (action === 'resume') {
    if (status !== 'paused') {
      return json({ ok: false, error: 'not_paused', status: status }, 409);
    }
    if (!row.published_at) {
      return json({ ok: false, error: 'not_published_by_admin', status: status }, 409);
    }
    nextStatus = 'active';
    nextActive = 1;
  } else {
    /* A plain edit. Only a draft or a paused promo may be rewritten;
       a submitted / approved promo is edited through its submission. */
    if (['draft', 'paused'].indexOf(status) === -1) {
      return json({ ok: false, error: 'promo_not_editable', status: status }, 409);
    }
    nextStatus = status;
    nextActive = status === 'paused' ? 0 : 0;
  }

  var values = promoValues(b, row, {
    id: row.id,
    restaurantId: row.restaurant_id,
    status: nextStatus,
    active: nextActive,
    createdAt: row.created_at,
    publishedAt: row.published_at,
    submittedAt: row.submitted_at,
    paymentStatus: row.payment_status,
    invoiceId: row.invoice_id,
    feeCharged: row.fee_charged,
    quotaMonth: row.quota_month,
    submissionId: row.submission_id,
    now: ts
  });
  values.updated_at = ts;

  try {
    await updateRow(l.c.db, 'promos', values, PROMO_COLUMNS, PROMO_OPTIONAL);
  } catch (e) {
    return json({ ok: false, error: 'could_not_save_promo' }, 500);
  }

  var updated = await l.c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(row.id).first();
  return json({ ok: true, promo: promoOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await purgeFavourites(l.c.db, 'promo', l.row.id);
  await l.c.db.prepare('DELETE FROM promos WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
