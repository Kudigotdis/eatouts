/* /api/business/promos
   GET  ?restaurant=rest_x -> { ok, promos: [...] }   (marketing_manager+)
   POST ?restaurant=rest_x { id?, title, image?, type?, description?, originalPrice?, promoPrice?,
                              locationJson?, startDate?, startTime?, endDate?, endTime?, recurring?,
                              daysJson?, linkedMenuItemsJson?, actionJson?, sponsor?, terms?, status?,
                              ageRestricted? }
        -> { ok, promo } */
import { json, readJson, now, uid } from './../_shared.js';
import {
  requireBusiness, promoOut, str, jsonString, numOrNull, insertRow
} from './../_business.js';

/* The columns a promo row is written with, in order. */
var PROMO_COLUMNS = [
  'id', 'restaurant_id', 'title', 'image', 'type', 'description', 'original_price',
  'promo_price', 'location_json', 'start_date', 'start_time', 'end_date', 'end_time',
  'recurring', 'days_json', 'linked_menu_items_json', 'action_json', 'sponsor', 'terms',
  'status', 'active', 'age_restricted', 'created_at', 'updated_at'
];

/* Dropped one at a time when the table shape cannot be read. */
var PROMO_OPTIONAL = ['age_restricted', 'image', 'active'];

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
  /* `status` is the operator-facing switch; `active` is the legacy flag
     the public venue bundle filters on. They are kept in step. */
  var status = str(b.status) || 'active';
  var values = {
    id: id,
    restaurant_id: c.restaurantId,
    title: title,
    image: str(b.image),
    type: str(b.type),
    description: str(b.description),
    original_price: numOrNull(b.originalPrice),
    promo_price: numOrNull(b.promoPrice),
    location_json: jsonString(b.locationJson),
    start_date: str(b.startDate),
    start_time: str(b.startTime),
    end_date: str(b.endDate),
    end_time: str(b.endTime),
    recurring: b.recurring ? 1 : 0,
    days_json: jsonString(b.daysJson),
    linked_menu_items_json: jsonString(b.linkedMenuItemsJson),
    action_json: jsonString(b.actionJson),
    sponsor: str(b.sponsor),
    terms: str(b.terms),
    status: status,
    active: status === 'active' ? 1 : 0,
    /* The operator's own 18+ switch on the promo. */
    age_restricted: (b.ageRestricted || b.age_restricted) ? 1 : 0,
    created_at: ts,
    updated_at: ts
  };

  try {
    await insertRow(c.db, 'promos', values, PROMO_COLUMNS, PROMO_OPTIONAL);
  } catch (e) {
    return json({ ok: false, error: 'could_not_save_promo' }, 500);
  }

  var row = await c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(id).first();
  return json({ ok: true, promo: promoOut(row) }, 201);
}