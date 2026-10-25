/* ============================================================
   GET /api/business/services?business_id=   ->  list services
   POST /api/business/services                ->  create service
   PATCH /api/business/services?id=           ->  update service
   DELETE /api/business/services?id=          ->  delete service
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
    'SELECT * FROM business_services WHERE business_id = ? ORDER BY order_index'
  ).bind(businessId).all();

  return json({
    ok: true,
    services: (rows.results || []).map(function (x) {
      return { id: x.id, name: x.name, description: x.description, price: x.price, pricingType: x.pricing_type, whatsappContactId: x.whatsapp_contact_id, active: !!x.active, orderIndex: x.order_index };
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

  var id = uid('svc');
  var ts = now();

  var max = await c.db.prepare(
    'SELECT COALESCE(MAX(order_index), -1) AS mx FROM business_services WHERE business_id = ?'
  ).bind(businessId).first();
  var orderIndex = (max && max.mx != null ? max.mx : -1) + 1;

  await c.db.prepare(
    'INSERT INTO business_services (id, business_id, name, description, price, pricing_type, whatsapp_contact_id, active, order_index) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, businessId, str(b.name), str(b.description), numOrNull(b.price), str(b.pricingType), str(b.whatsappContactId),
    pick(b, 'active', 1) ? 1 : 0, orderIndex
  ).run();

  return json({ ok: true, service: { id: id, name: b.name, description: b.description, price: b.price, pricingType: b.pricingType, whatsappContactId: b.whatsappContactId, active: !!b.active, orderIndex: orderIndex } }, 201);
}

export async function onRequestPatch(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var serviceId = idOf(context);
  if (!serviceId) return json({ ok: false, error: 'id_required' }, 400);

  var b = await readJson(context.request);

  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_services bs JOIN business_profiles bp ON bp.id = bs.business_id WHERE bs.id = ?'
  ).bind(serviceId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare(
    'UPDATE business_services SET name = ?, description = ?, price = ?, pricing_type = ?, whatsapp_contact_id = ?, active = ? WHERE id = ?'
  ).bind(
    str(b.name), str(b.description), numOrNull(b.price), str(b.pricingType), str(b.whatsappContactId),
    pick(b, 'active', 1) ? 1 : 0, serviceId
  ).run();

  var updated = await c.db.prepare('SELECT * FROM business_services WHERE id = ?').bind(serviceId).first();
  return json({ ok: true, service: { id: updated.id, name: updated.name, description: updated.description, price: updated.price, pricingType: updated.pricing_type, whatsappContactId: updated.whatsapp_contact_id, active: !!updated.active, orderIndex: updated.order_index } });
}

export async function onRequestDelete(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var serviceId = idOf(context);
  if (!serviceId) return json({ ok: false, error: 'id_required' }, 400);

  var owner = await c.db.prepare(
    'SELECT bp.user_id FROM business_services bs JOIN business_profiles bp ON bp.id = bs.business_id WHERE bs.id = ?'
  ).bind(serviceId).first();
  if (!owner || owner.user_id !== c.userId) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare('DELETE FROM business_services WHERE id = ?').bind(serviceId).run();
  return json({ ok: true });
}

function pick(b, k, def) {
  return b[k] !== undefined ? b[k] : def;
}
