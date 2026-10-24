/* /api/business/profile
   GET   ?restaurant=rest_x -> { business }            (any active member)
   PATCH ?restaurant=rest_x { ...fields } -> { ok, business }   (manager+) */
import { json, readJson, now } from './../_shared.js';
import { requireBusiness, restaurantOut, str, asArray } from './../_business.js';

function ridOf(context) {
  return new URL(context.request.url).searchParams.get('restaurant');
}

export async function onRequestGet(context) {
  var c = await requireBusiness(context, ridOf(context));
  if (c.error) return c.error;
  var row = await c.db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(c.restaurantId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);
  var out = restaurantOut(row);
  out.role = c.role;
  return json({ business: out });
}

export async function onRequestPatch(context) {
  var c = await requireBusiness(context, ridOf(context), 'manager');
  if (c.error) return c.error;

  var row = await c.db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(c.restaurantId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var b = await readJson(context.request);
  function pick(k, col) { return b[k] !== undefined ? b[k] : row[col || k]; }
  function pickList(k, col) {
    return b[k] !== undefined ? JSON.stringify(asArray(b[k])) : row[col || k];
  }
  function pickJson(k, col) {
    return b[k] !== undefined ? (b[k] == null ? null : JSON.stringify(b[k])) : row[col || k];
  }

  await c.db.prepare(
    'UPDATE restaurants SET name = ?, town = ?, district = ?, district_name = ?, area = ?, landmark = ?, ' +
    'description = ?, website = ?, logo_ref = ?, cover_ref = ?, types = ?, category = ?, contacts = ?, ' +
    'socials = ?, hours = ?, price_range = ?, features = ?, type = ?, updated_at = ? WHERE id = ?'
  ).bind(
    str(pick('name')) || row.name,
    str(pick('town')), str(pick('district')), str(pick('districtName', 'district_name')),
    str(pick('area')), str(pick('landmark')), str(pick('description')), str(pick('website')),
    str(pick('logoRef', 'logo_ref')), str(pick('coverRef', 'cover_ref')),
    pickList('types'), str(pick('category')), pickList('contacts'), pickList('socials'),
    pickJson('hours'), str(pick('priceRange', 'price_range')), pickList('features'),
    str(pick('type')),
    now(), c.restaurantId
  ).run();

  var updated = await c.db.prepare('SELECT * FROM restaurants WHERE id = ?').bind(c.restaurantId).first();
  var out = restaurantOut(updated);
  out.role = c.role;
  return json({ ok: true, business: out });
}
