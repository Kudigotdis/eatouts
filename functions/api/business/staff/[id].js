/* /api/business/staff/:id
   PATCH  { role?, status? }  -> update a membership    (owner)
   DELETE                      -> remove a membership    (owner)
   The last remaining owner can never be demoted or removed. */
import { json, readJson } from './../../_shared.js';
import { requireBusiness, membershipOut, validRole } from './../../_business.js';

async function loadRow(context) {
  var id = context.params.id;
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM memberships WHERE id = ?').bind(id).first();
  if (!row) return { error: json({ ok: false, error: 'not_found' }, 404) };
  var c = await requireBusiness(context, row.restaurant_id, 'owner');
  if (c.error) return c;
  return { id: id, row: row, c: c };
}

async function ownerCount(db, restaurantId) {
  var res = await db.prepare(
    "SELECT COUNT(*) AS n FROM memberships WHERE restaurant_id = ? AND role = 'owner' AND status = 'active'"
  ).bind(restaurantId).first();
  return (res && res.n) || 0;
}

export async function onRequestPatch(context) {
  var loaded = await loadRow(context);
  if (loaded.error) return loaded.error;
  var c = loaded.c;
  var row = loaded.row;

  var b = await readJson(context.request);
  var role = b.role !== undefined ? String(b.role) : row.role;
  var status = b.status !== undefined ? String(b.status) : row.status;
  if (!validRole(role)) return json({ ok: false, error: 'invalid_role' }, 400);
  if (status !== 'active' && status !== 'disabled') return json({ ok: false, error: 'invalid_status' }, 400);

  var losingOwner = row.role === 'owner' && (role !== 'owner' || status !== 'active');
  if (losingOwner && (await ownerCount(c.db, row.restaurant_id)) <= 1) {
    return json({ ok: false, error: 'last_owner' }, 400);
  }

  await c.db.prepare('UPDATE memberships SET role = ?, status = ? WHERE id = ?')
    .bind(role, status, row.id).run();
  var m = await c.db.prepare(
    'SELECT m.*, u.username, u.name, u.email, u.whatsapp, u.photo_key ' +
    'FROM memberships m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ?'
  ).bind(row.id).first();
  return json({ ok: true, membership: membershipOut(m) });
}

export async function onRequestDelete(context) {
  var loaded = await loadRow(context);
  if (loaded.error) return loaded.error;
  var c = loaded.c;
  var row = loaded.row;

  if (row.role === 'owner' && (await ownerCount(c.db, row.restaurant_id)) <= 1) {
    return json({ ok: false, error: 'last_owner' }, 400);
  }
  await c.db.prepare('DELETE FROM memberships WHERE id = ?').bind(row.id).run();
  return json({ ok: true });
}
