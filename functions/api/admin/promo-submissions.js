/* /api/admin/promo-submissions  (admin only)
   GET   -> { submissions: [...] }              ?status=pending|approved|published|rejected
   PATCH -> { ok, submission }                  body { id, action, adminNote }
             action: approve | reject | publish */
import { json, readJson, now } from './../_shared.js';
import { requireAdmin, promoSubmissionOut } from './../_customer.js';

var ACTIONS = { approve: 'approved', reject: 'rejected', publish: 'published' };

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

  await c.db.prepare(
    'UPDATE promo_submissions SET status = ?, admin_note = ?, updated_at = ? WHERE id = ?'
  ).bind(next, note || null, now(), id).run();

  row.status = next;
  row.admin_note = note;
  row.updated_at = now();
  return json({ ok: true, submission: promoSubmissionOut(row) });
}
