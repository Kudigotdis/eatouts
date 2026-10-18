/* ============================================================
   GET /api/business/profiles?business_id=   ->  full profile (contacts, services, users)
   POST /api/business/profiles                ->  create business profile (from onboarding)
   PATCH /api/business/profiles?business_id=  ->  update profile fields
   DELETE /api/business/profiles?business_id=  ->  soft-delete (status = 'archived')
   ============================================================ */
import { json, readJson, now, uid } from './../_shared.js';
import { requireSession, str, asArray, jsonString } from './../_business.js';

function bidOf(context) {
  return new URL(context.request.url).searchParams.get('business_id');
}

function pick(b, k, def) {
  return b[k] !== undefined ? b[k] : def;
}

function profileOut(row, contacts, services, users) {
  return {
    id: row.id,
    businessId: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    logo: row.logo,
    coverImage: row.cover_image,
    status: row.status,
    types: JSON.parse(row.types_json || '[]'),
    category: row.category,
    location: JSON.parse(row.location_json || '{}'),
    socials: JSON.parse(row.socials_json || '{}'),
    operatingHours: JSON.parse(row.operating_hours_json || '{}'),
    character: JSON.parse(row.character_json || '[]'),
    amenities: JSON.parse(row.amenities_json || '[]'),
    menuTags: JSON.parse(row.menu_tags_json || '[]'),
    capacity: JSON.parse(row.capacity_json || '[]'),
    payments: JSON.parse(row.payments_json || '[]'),
    reservations: JSON.parse(row.reservations_json || '{}'),
    setupFeePaid: !!row.setup_fee_paid,
    plan: row.plan,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contacts: contacts || [],
    services: services || [],
    users: users || []
  };
}

export async function onRequestGet(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var businessId = bidOf(context);
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  var row = await c.db.prepare(
    'SELECT * FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(businessId, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var contacts = await c.db.prepare(
    'SELECT * FROM business_contacts WHERE business_id = ? ORDER BY order_index'
  ).bind(businessId).all();
  var services = await c.db.prepare(
    'SELECT * FROM business_services WHERE business_id = ? ORDER BY order_index'
  ).bind(businessId).all();
  var users = await c.db.prepare(
    'SELECT * FROM business_users WHERE business_id = ? ORDER BY name'
  ).bind(businessId).all();

  return json({
    ok: true,
    business: profileOut(
      row,
      (contacts.results || []).map(function (x) {
        return { id: x.id, title: x.title, countryCode: x.country_code, number: x.number, purpose: x.purpose, primary: !!x.primary, whatsapp: !!x.whatsapp, active: !!x.active, orderIndex: x.order_index };
      }),
      (services.results || []).map(function (x) {
        return { id: x.id, name: x.name, description: x.description, price: x.price, pricingType: x.pricing_type, whatsappContactId: x.whatsapp_contact_id, active: !!x.active, orderIndex: x.order_index };
      }),
      (users.results || []).map(function (x) {
        return { id: x.id, name: x.name, email: x.email, role: x.role, whatsapp: x.whatsapp };
      })
    )
  });
}

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var name = str(b.name);
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  var baseSlug = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'business';
  var slug = baseSlug;
  var n = 1;
  while (await c.db.prepare('SELECT id FROM business_profiles WHERE slug = ?').bind(slug).first()) {
    n++;
    slug = baseSlug + '-' + n;
  }

  var id = uid('biz');
  var ts = now();

  await c.db.prepare(
    'INSERT INTO business_profiles (id, user_id, slug, name, description, logo, cover_image, status, types_json, category, ' +
    'location_json, socials_json, operating_hours_json, character_json, amenities_json, menu_tags_json, capacity_json, ' +
    'payments_json, reservations_json, setup_fee_paid, plan, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.userId, slug, name, str(b.description), str(b.logo), str(b.coverImage),
    pick(b, 'status', 'draft'),
    jsonString(pick(b, 'types', [])), str(b.category),
    jsonString(pick(b, 'location', {})), jsonString(pick(b, 'socials', {})),
    jsonString(pick(b, 'operatingHours', {})), jsonString(pick(b, 'character', [])),
    jsonString(pick(b, 'amenities', [])), jsonString(pick(b, 'menuTags', [])),
    jsonString(pick(b, 'capacity', [])), jsonString(pick(b, 'payments', [])),
    jsonString(pick(b, 'reservations', {})), pick(b, 'setupFeePaid', 0) ? 1 : 0,
    str(b.plan) || 'starter', ts, ts
  ).run();

  /* Create the owner as the first business user. */
  await c.db.prepare(
    'INSERT INTO business_users (id, business_id, name, email, role, whatsapp, password_hash, salt) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(uid('bu'), id, c.userId, c.session.email || null, 'owner', c.session.whatsapp || null, null, null).run();

  var row = await c.db.prepare('SELECT * FROM business_profiles WHERE id = ?').bind(id).first();
  return json({ ok: true, business: { id: row.id, businessId: row.id, slug: row.slug, name: row.name, status: row.status, userId: row.user_id } }, 201);
}

export async function onRequestPatch(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var businessId = bidOf(context);
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  var row = await c.db.prepare(
    'SELECT * FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(businessId, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var b = await readJson(context.request);
  var ts = now();

  await c.db.prepare(
    'UPDATE business_profiles SET name = ?, description = ?, logo = ?, cover_image = ?, status = ?, ' +
    'types_json = ?, category = ?, location_json = ?, socials_json = ?, operating_hours_json = ?, ' +
    'character_json = ?, amenities_json = ?, menu_tags_json = ?, capacity_json = ?, payments_json = ?, ' +
    'reservations_json = ?, setup_fee_paid = ?, plan = ?, updated_at = ? WHERE id = ?'
  ).bind(
    str(pick(b, 'name', row.name)) || row.name,
    str(pick(b, 'description', row.description)), str(pick(b, 'logo', row.logo)),
    str(pick(b, 'coverImage', row.cover_image)), str(pick(b, 'status', row.status)),
    jsonString(pick(b, 'types', JSON.parse(row.types_json || '[]'))), str(pick(b, 'category', row.category)),
    jsonString(pick(b, 'location', JSON.parse(row.location_json || '{}'))),
    jsonString(pick(b, 'socials', JSON.parse(row.socials_json || '{}'))),
    jsonString(pick(b, 'operatingHours', JSON.parse(row.operating_hours_json || '{}'))),
    jsonString(pick(b, 'character', JSON.parse(row.character_json || '[]'))),
    jsonString(pick(b, 'amenities', JSON.parse(row.amenities_json || '[]'))),
    jsonString(pick(b, 'menuTags', JSON.parse(row.menu_tags_json || '[]'))),
    jsonString(pick(b, 'capacity', JSON.parse(row.capacity_json || '[]'))),
    jsonString(pick(b, 'payments', JSON.parse(row.payments_json || '[]'))),
    jsonString(pick(b, 'reservations', JSON.parse(row.reservations_json || '{}'))),
    pick(b, 'setupFeePaid', row.setup_fee_paid) ? 1 : 0,
    str(pick(b, 'plan', row.plan)), ts, businessId
  ).run();

  var updated = await c.db.prepare('SELECT * FROM business_profiles WHERE id = ?').bind(businessId).first();
  return json({ ok: true, business: { id: updated.id, businessId: updated.id, slug: updated.slug, name: updated.name, status: updated.status, userId: updated.user_id } });
}

export async function onRequestDelete(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var businessId = bidOf(context);
  if (!businessId) return json({ ok: false, error: 'business_id_required' }, 400);

  var row = await c.db.prepare(
    'SELECT * FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(businessId, c.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  await c.db.prepare(
    'UPDATE business_profiles SET status = ?, updated_at = ? WHERE id = ?'
  ).bind('archived', now(), businessId).run();

  return json({ ok: true, business: { id: businessId, status: 'archived' } });
}
