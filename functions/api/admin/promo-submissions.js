/* /api/admin/promo-submissions  (admin only)
   GET   -> { submissions: [...] }              ?status=pending|approved|published|rejected
   PATCH -> { ok, submission }                  body { id, action, adminNote }
             action: approve | reject | publish

   Phase 4 (G1–G2): When an admin approves or publishes a business
   submission, it is written to the customer-facing `promos` table
   and the monthly quota (3 free/venue/calendar-month) is enforced;
   any overage (4th+) creates a draft invoice line. This publishes
   approved business promos to the customer surface (approval→publish). */
import { json, readJson, now } from './../_shared.js';
import { requireAdmin, promoSubmissionOut, uid } from './../_customer.js';

var ACTIONS = { approve: 'approved', reject: 'rejected', publish: 'published' };
var FREE_PROMOS_PER_MONTH = 3;

function monthKey(ts) {
  var d = new Date(ts || now());
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2);
}

function parseJson(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

async function ensureBusinessPromoPublished(db, row, ts) {
  if (!row) return row;
  if (row.promo_id) return row;
  var rid = row.restaurant_id;
  if (!rid) return row;
  var t = ts || now();
  var mkey = monthKey(t);

  var payload = parseJson(row.payload);
  var title = row.title || (payload && payload.title) || '';
  var details = (payload && (payload.desc || payload.description)) || row.summary || null;
  var imageKey = row.image_ref || (payload && (payload.image || payload.imageKey)) || null;
  var startsAt = null;
  var endsAt = null;
  if (payload && payload.startDate) {
    var s = Date.parse(payload.startDate);
    if (!isNaN(s)) startsAt = s;
  }
  if (payload && payload.endsAt) {
    var e = Date.parse(payload.endsAt);
    if (!isNaN(e)) endsAt = e;
  } else if (payload && payload.endDate) {
    var ee = Date.parse(payload.endDate);
    if (!isNaN(ee)) endsAt = ee;
  }

  var promoId = 'prom_' + uid('p').replace(/^p_/, '').slice(0, 18);
  await db.prepare(
    'INSERT INTO promos (id, restaurant_id, title, details, image_key, active, starts_at, ends_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(promoId, rid, title, details, imageKey, 1, startsAt, endsAt, t, t).run();

  var cntRes = await db.prepare(
    'SELECT COUNT(*) AS c FROM promo_submissions WHERE restaurant_id = ? AND month_key = ? AND promo_id IS NOT NULL AND id != ?'
  ).bind(rid, mkey, row.id).first();
  var priorCount = (cntRes && cntRes.c) ? cntRes.c : 0;
  var position = priorCount + 1;
  var feeCharged = position > FREE_PROMOS_PER_MONTH ? 50 : 0;
  var billed = feeCharged > 0 ? 0 : 0;

  await db.prepare(
    'UPDATE promo_submissions SET promo_id = ?, month_key = ?, fee_charged = ?, billed = ? WHERE id = ?'
  ).bind(promoId, mkey, feeCharged, billed, row.id).run();

  if (feeCharged > 0) {
    await db.prepare(
      'INSERT INTO invoices (id, restaurant_id, type, amount, currency, status, reference, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      'inv_' + uid('i').replace(/^i_/, '').slice(0, 18),
      rid, 'promo', feeCharged, 'BWP', 'draft', promoId,
      'Promo: ' + title, t
    ).run();
  }

  var updated = await db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(row.id).first();
  return updated || row;
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
  return json({ submissions: (res.results || []).map(promoSubmissionOut) });
}

export async function onRequestPatch(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var id = String(b.id || '').trim();
  var action = String(b.action || '').trim().toLowerCase();
  if (!id || !ACTIONS[action]) {
    return json({ ok: false, error: 'id and a valid action (approve|reject|publish) are required' }, 400);
  }

  var row = await c.db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var next = ACTIONS[action];
  var note = (b.adminNote !== undefined) ? b.adminNote : row.admin_note;
  var t = now();

  if (action === 'approve' || action === 'publish') {
    if (row.source === 'business' && row.restaurant_id) {
      row = await ensureBusinessPromoPublished(c.db, row, t);
    }
    await c.db.prepare(
      'UPDATE promo_submissions SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
    ).bind(next, note || null, t, id).run();
  } else {
    await c.db.prepare(
      'UPDATE promo_submissions SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
    ).bind(next, note || null, t, id).run();
  }

  var updated = await c.db.prepare('SELECT * FROM promo_submissions WHERE id = ?').bind(id).first();
  if (updated) updated.admin_note = note;
  return json({ ok: true, submission: promoSubmissionOut(updated || row) });
}
