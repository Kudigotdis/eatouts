/* /api/business/staff
   GET  ?restaurant=rest_x -> { staff: [...] }                       (manager+)
   POST ?restaurant=rest_x { email|whatsapp|username, role }
        -> { ok, membership }            when the account exists, or
           { ok, invited:true, invite }  when it doesn't (owner only). */
import { json, readJson, now, uid } from './../_shared.js';
import { requireBusiness, membershipOut, validRole } from './../_business.js';

var INVITE_TTL = 14 * 24 * 60 * 60 * 1000;

function ridOf(context) {
  return new URL(context.request.url).searchParams.get('restaurant');
}

export async function onRequestGet(context) {
  var c = await requireBusiness(context, ridOf(context), 'manager');
  if (c.error) return c.error;
  var res = await c.db.prepare(
    'SELECT m.*, u.username, u.name, u.email, u.whatsapp, u.photo_key ' +
    'FROM memberships m LEFT JOIN users u ON u.id = m.user_id ' +
    'WHERE m.restaurant_id = ? ORDER BY m.created_at'
  ).bind(c.restaurantId).all();
  return json({ staff: (res.results || []).map(membershipOut) });
}

export async function onRequestPost(context) {
  var c = await requireBusiness(context, ridOf(context), 'owner');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var role = String(b.role || 'manager');
  if (!validRole(role)) return json({ ok: false, error: 'invalid_role' }, 400);

  var email = b.email != null ? String(b.email).trim().toLowerCase() : '';
  var whatsapp = b.whatsapp != null ? String(b.whatsapp).trim() : '';
  var username = b.username != null ? String(b.username).trim().toLowerCase() : '';
  if (!email && !whatsapp && !username) return json({ ok: false, error: 'identifier_required' }, 400);

  var user = null;
  if (email) user = await c.db.prepare('SELECT * FROM users WHERE email = ?').bind(email).first();
  if (!user && whatsapp) user = await c.db.prepare('SELECT * FROM users WHERE whatsapp = ?').bind(whatsapp).first();
  if (!user && username) user = await c.db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first();

  var ts = now();

  if (!user) {
    if (!email) return json({ ok: false, error: 'user_not_found' }, 404);
    var token = crypto.randomUUID().replace(/-/g, '');
    var inviteId = uid('inv');
    await c.db.prepare(
      'INSERT INTO invites (id, restaurant_id, email, role, token, invited_by, expires_at, created_at) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(inviteId, c.restaurantId, email, role, token, c.userId, ts + INVITE_TTL, ts).run();
    return json({ ok: true, invited: true, invite: { id: inviteId, email: email, role: role, token: token } }, 201);
  }

  var existing = await c.db.prepare(
    'SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ?'
  ).bind(user.id, c.restaurantId).first();

  if (existing) {
    await c.db.prepare(
      "UPDATE memberships SET role = ?, status = 'active' WHERE id = ?"
    ).bind(role, existing.id).run();
    var m = await c.db.prepare(
      'SELECT m.*, u.username, u.name, u.email, u.whatsapp, u.photo_key ' +
      'FROM memberships m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ?'
    ).bind(existing.id).first();
    return json({ ok: true, membership: membershipOut(m) });
  }

  var mid = uid('mem');
  await c.db.prepare(
    'INSERT INTO memberships (id, user_id, restaurant_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(mid, user.id, c.restaurantId, role, 'active', ts).run();
  var row = await c.db.prepare(
    'SELECT m.*, u.username, u.name, u.email, u.whatsapp, u.photo_key ' +
    'FROM memberships m LEFT JOIN users u ON u.id = m.user_id WHERE m.id = ?'
  ).bind(mid).first();
  return json({ ok: true, membership: membershipOut(row) }, 201);
}
