/* /api/business/promos
   GET  ?restaurant=rest_x -> { ok, promos: [...] }   (marketing_manager+)
   POST ?restaurant=rest_x { id?, title, image?, type?, description?, originalPrice?, promoPrice?,
                              locationJson?, startDate?, startTime?, endDate?, endTime?, recurring?,
                              daysJson?, linkedMenuItemsJson?, actionJson?, sponsor?, terms?, status? }
        -> { ok, promo } */
import { json, readJson, now, uid } from './../_shared.js';
import { requireBusiness, promoOut, str, jsonString, numOrNull } from './../_business.js';

export async function onRequestGet(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var rows = await c.db.prepare(
    'SELECT * FROM promos WHERE restaurant_id = ? ORDER BY created_at DESC'
  ).bind(c.restaurantId).all();

  return json({ ok: true, promos: (rows.results || []).map(promoOut) });
}

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var title = str(b.title);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);

  var id = b.id || uid('promo');
  var ts = now();
  await c.db.prepare(
    'INSERT INTO promos (id, restaurant_id, title, image, type, description, original_price, ' +
    'promo_price, location_json, start_date, start_time, end_date, end_time, recurring, ' +
    'days_json, linked_menu_items_json, action_json, sponsor, terms, status, created_at, updated_at) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(
    id, c.restaurantId, title, str(b.image), str(b.type), str(b.description),
    numOrNull(b.originalPrice), numOrNull(b.promoPrice), jsonString(b.locationJson),
    str(b.startDate), str(b.startTime), str(b.endDate), str(b.endTime),
    b.recurring ? 1 : 0, jsonString(b.daysJson), jsonString(b.linkedMenuItemsJson),
    jsonString(b.actionJson), str(b.sponsor), str(b.terms),
    str(b.status) || 'active', ts, ts
  ).run();

  var row = await c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(id).first();
  return json({ ok: true, promo: promoOut(row) }, 201);
}