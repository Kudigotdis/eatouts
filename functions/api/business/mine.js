/* /api/business/mine
   GET  -> { businesses: [ ...restaurantOut, role, membershipId ] }   (signed in)
   POST { name, ...profile } -> { ok, business }                      (creates a
        draft restaurant owned by the caller + an owner membership.) */
import { json, readJson, now, uid } from './../_shared.js';
import { requireSession, restaurantOut, slugify, str, asArray } from './../_business.js';

export async function onRequestGet(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var res = await c.db.prepare(
    'SELECT r.*, m.role AS role, m.id AS membership_id FROM memberships m ' +
    'JOIN restaurants r ON r.id = m.restaurant_id ' +
    "WHERE m.user_id = ? AND m.status = 'active' ORDER BY r.name"
  ).bind(c.userId).all();

  var businesses = (res.results || []).map(function (r) {
    var o = restaurantOut(r);
    o.role = r.role || null;
    o.membershipId = r.membership_id || null;
    return o;
  });
  return json({ businesses: businesses });
}

export async function onRequestPost(context) {
  var c = await requireSession(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var name = str(b.name);
  if (!name) return json({ ok: false, error: 'name_required' }, 400);

  var base = slugify(name) || 'business';
  var slug = base;
  var n = 1;
  while (await c.db.prepare('SELECT id FROM restaurants WHERE slug = ?').bind(slug).first()) {
    n++;
    slug = base + '-' + n;
  }

  var id = uid('rest');
  var ts = now();
  await c.db.prepare(
    'INSERT INTO restaurants (id, slug, name, status, plan, claimed, town, district, district_name, area, ' +
    'landmark, description, website, logo_ref, cover_ref, types, category, contacts, socials, hours, ' +
    'price_range, features, type, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, slug, name, 'draft', 'starter', 1,
    str(b.town), str(b.district), str(b.districtName), str(b.area), str(b.landmark),
    str(b.description), str(b.website),
    str(b.logoRef) || str(b.logo_ref) || null,
    str(b.coverRef) || str(b.cover_ref) || null,
    JSON.stringify(asArray(b.types)), str(b.category),
    JSON.stringify(asArray(b.contacts)), JSON.stringify(asArray(b.socials)),
    b.hours ? JSON.stringify(b.hours) : null, str(b.priceRange), JSON.stringify(asArray(b.features)),
    str(b.type) || null,
    ts, ts
  ).run();

  await c.db.prepare(
    'INSERT INTO memberships (id, user_id, restaurant_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(uid('mem'), c.userId, id, 'owner', 'active', ts).run();

  var row = await c.db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(id).first();
  var out = restaurantOut(row);
  out.role = 'owner';
  return json({ ok: true, business: out }, 201);
}
