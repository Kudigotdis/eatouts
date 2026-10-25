/* ============================================================
   GET /api/business/users?business_id=   ->  list team members
   POST /api/business/users                ->  create team member
   PATCH /api/business/users?id=           ->  update team member
   DELETE /api/business/users?id=          ->  delete team member
   ============================================================ */
import { json, readJson, now, uid } from './../_shared.js';
import { requireSession, requireBusinessOwner, str } from './../_business.js';

function idOf(context) {
  return new URL(context.request.url).searchParams.get('id');
}

function bidOf(context) {
  return new URL(context.request.url).searchParams.get('business_id');
}

export async function onRequestGet(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var businessId = bidOf(context);
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  /* Verify ownership: the same guard the POST/PATCH/DELETE handlers apply. */
  var owner = await requireBusinessOwner(c, businessId);
  if (owner.error) return owner.error;

  var rows = await c.db.prepare(
    'SELECT * FROM business_users WHERE business_id = ? ORDER BY name'
  ).bind(businessId).all();

  return json({
    ok: true,
    users: (rows.results || []).map(function (x) {
      return { id: x.id, name: x.name, email: x.email, role: x.role, whatsapp: x.whatsapp };
    })
  });
}

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var businessId = bidOf(context) || b.business_id;
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  var row = await c.db.prepare(
    'SELECT id FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(businessId, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var name = str(b.name);
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  var id = uid('bu');
  var ts = now();

  await c.db.prepare(
    'INSERT INTO business_users (id, business_id, name, email, role, whatsapp, password_hash, salt) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, businessId, name, str(b.email), str(b.role) || 'staff', str(b.whatsapp), null, null
  ).run();

  return json({ ok: true, user: { id: id, name: name, email: b.email, role: b.role, whatsapp: b.whatsapp } }, 201);
}

export async function onRequestPatch(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var userId = idOf(context);
  if (!userId) return json({ ok: false, error: 'id_required' }, 400);

  var b = await readJson(context.request);

  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_users bu JOIN business_profiles bp ON bp.id = bu.business_id WHERE bu.id = ?'
  ).bind(userId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare(
    'UPDATE business_users SET name = ?, email = ?, role = ?, whatsapp = ? WHERE id = ?'
  ).bind(
    str(b.name), str(b.email), str(b.role), str(b.whatsapp), userId
  ).run();

  var updated = await c.db.prepare('SELECT * FROM business_users WHERE id = ?').bind(userId).first();
  return json({ ok: true, user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, whatsapp: updated.whatsapp } });
}

export async function onRequestDelete(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var userId = idOf(context);
  if (!userId) return json({ ok: false, error: 'id_required' }, 400);

  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_users bu JOIN business_profiles bp ON bp.id = bu.business_id WHERE bu.id = ?'
  ).bind(userId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare('DELETE FROM business_users WHERE id = ?').bind(userId).run();
  return json({ ok: true });
}
