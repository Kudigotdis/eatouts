/* ============================================================
   GET /api/business/contacts?business_id=   ->  list contacts
   POST /api/business/contacts                ->  create contact
   PATCH /api/business/contacts?id=           ->  update contact
   DELETE /api/business/contacts?id=          ->  delete contact
   ============================================================ */
import { json, readJson, now, uid } from './../_shared.js';
import { requireSession, requireBusinessOwner, str, numOrNull } from './../_business.js';

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
    'SELECT * FROM business_contacts WHERE business_id = ? ORDER BY order_index'
  ).bind(businessId).all();

  return json({
    ok: true,
    contacts: (rows.results || []).map(function (x) {
      return { id: x.id, title: x.title, countryCode: x.country_code, number: x.number, purpose: x.purpose, primary: !!x.primary, whatsapp: !!x.whatsapp, active: !!x.active, orderIndex: x.order_index };
    })
  });
}

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var businessId = bidOf(context) || b.business_id;
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  /* Verify ownership. */
  var row = await c.db.prepare(
    'SELECT id FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(businessId, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var id = uid('cnt');
  var ts = now();

  /* Get next order index. */
  var max = await c.db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) AS mx FROM business_contacts WHERE business_id = ?'
  ).bind(businessId).first();
  var orderIndex = (max && max.mx != null ? max.mx : -1) + 1;

  await c.db.prepare(
    'INSERT INTO business_contacts (id, business_id, title, country_code, number, purpose, "primary", whatsapp, active, order_index) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, businessId, str(b.title), str(b.countryCode), str(b.number), str(b.purpose),
    pick(b, 'primary', 0) ? 1 : 0, pick(b, 'whatsapp', 0) ? 1 : 0, pick(b, 'active', 1) ? 1 : 0, orderIndex
  ).run();

  return json({ ok: true, contact: { id: id, title: b.title, countryCode: b.countryCode, number: b.number, purpose: b.purpose, primary: !!b.primary, whatsapp: !!b.whatsapp, active: !!b.active, orderIndex: orderIndex } }, 201);
}

export async function onRequestPatch(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var contactId = idOf(context);
  if (!contactId) return json({ ok: false, error: 'id_required' }, 400);

  var b = await readJson(context.request);

  /* Verify ownership via business_id. */
  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_contacts bc JOIN business_profiles bp ON bp.id = bc.business_id WHERE bc.id = ?'
  ).bind(contactId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare(
    'UPDATE business_contacts SET title = ?, country_code = ?, number = ?, purpose = ?, "primary" = ?, whatsapp = ?, active = ? WHERE id = ?'
  ).bind(
    str(b.title), str(b.countryCode), str(b.number), str(b.purpose),
    pick(b, 'primary', 0) ? 1 : 0, pick(b, 'whatsapp', 0) ? 1 : 0, pick(b, 'active', 1) ? 1 : 0, contactId
  ).run();

  var updated = await c.db.prepare('SELECT * FROM business_contacts WHERE id = ?').bind(contactId).first();
  return json({ ok: true, contact: { id: updated.id, title: updated.title, countryCode: updated.country_code, number: updated.number, purpose: updated.purpose, primary: !!updated.primary, whatsapp: !!updated.whatsapp, active: !!updated.active, orderIndex: updated.order_index } });
}

export async function onRequestDelete(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var contactId = idOf(context);
  if (!contactId) return json({ ok: false, error: 'id_required' }, 400);

  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_contacts bc JOIN business_profiles bp ON bp.id = bc.business_id WHERE bc.id = ?'
  ).bind(contactId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare('DELETE FROM business_contacts WHERE id = ?').bind(contactId).run();
  return json({ ok: true });
}

function pick(b, k, def) {
  return b[k] !== undefined ? b[k] : def;
}
