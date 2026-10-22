/* /api/business/promos/:id
   PATCH  { title?, image?, type?, description?, originalPrice?, promoPrice?, locationJson?,
            startDate?, startTime?, endDate?, endTime?, recurring?, daysJson?, linkedMenuItemsJson?,
            actionJson?, sponsor?, terms?, status?, ageRestricted? } -> update   (marketing_manager+)
   DELETE                                                               -> delete + purge favourites */
import { json, readJson, now } from './../../_shared.js';
import {
  requireBusiness, promoOut, str, jsonString, numOrNull, purgeFavourites, updateRow
} from './../../_business.js';

/* The columns a promo row is written with, in order. */
var PROMO_COLUMNS = [
  'title', 'image', 'type', 'description', 'original_price', 'promo_price',
  'location_json', 'start_date', 'start_time', 'end_date', 'end_time',
  'recurring', 'days_json', 'linked_menu_items_json', 'action_json', 'sponsor', 'terms',
  'status', 'age_restricted', 'updated_at'
];

/* Dropped one at a time when the table shape cannot be read. */
var PROMO_OPTIONAL = ['age_restricted', 'image'];

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM promos WHERE id = ?').bind(context.params.id).first();
  if (!row) return { error: json({ ok: false, error: 'not_found' }, 404) };
  var c = await requireBusiness(context, row.restaurant_id, 'marketing_manager');
  if (c.error) return c;
  return { row: row, c: c };
}

export async function onRequestPatch(context) {
  var l = await load(context);
  if (l.error) return l.error;
  var row = l.row;
  var b = await readJson(context.request);

  var title = b.title !== undefined ? (str(b.title) || row.title) : row.title;
  var image = b.image !== undefined ? str(b.image) : row.image;
  var type = b.type !== undefined ? str(b.type) : row.type;
  var description = b.description !== undefined ? str(b.description) : row.description;
  var originalPrice = b.originalPrice !== undefined ? numOrNull(b.originalPrice) : row.original_price;
  var promoPrice = b.promoPrice !== undefined ? numOrNull(b.promoPrice) : row.promo_price;
  var locationJson = b.locationJson !== undefined ? jsonString(b.locationJson) : row.location_json;
  var startDate = b.startDate !== undefined ? str(b.startDate) : row.start_date;
  var startTime = b.startTime !== undefined ? str(b.startTime) : row.start_time;
  var endDate = b.endDate !== undefined ? str(b.endDate) : row.end_date;
  var endTime = b.endTime !== undefined ? str(b.endTime) : row.end_time;
  var recurring = b.recurring !== undefined ? (b.recurring ? 1 : 0) : row.recurring;
  var daysJson = b.daysJson !== undefined ? jsonString(b.daysJson) : row.days_json;
  var linkedMenuItemsJson = b.linkedMenuItemsJson !== undefined ? jsonString(b.linkedMenuItemsJson) : row.linked_menu_items_json;
  var actionJson = b.actionJson !== undefined ? jsonString(b.actionJson) : row.action_json;
  var sponsor = b.sponsor !== undefined ? str(b.sponsor) : row.sponsor;
  var terms = b.terms !== undefined ? str(b.terms) : row.terms;
  var status = b.status !== undefined ? (str(b.status) || row.status) : row.status;
  /* The operator's own 18+ switch on the promo. */
  var ageRestricted = (b.ageRestricted !== undefined || b.age_restricted !== undefined)
    ? ((b.ageRestricted || b.age_restricted) ? 1 : 0)
    : (row.age_restricted != null ? row.age_restricted : undefined);

  try {
    await updateRow(l.c.db, 'promos', {
      id: row.id,
      title: title,
      image: image,
      type: type,
      description: description,
      original_price: originalPrice,
      promo_price: promoPrice,
      location_json: locationJson,
      start_date: startDate,
      start_time: startTime,
      end_date: endDate,
      end_time: endTime,
      recurring: recurring,
      days_json: daysJson,
      linked_menu_items_json: linkedMenuItemsJson,
      action_json: actionJson,
      sponsor: sponsor,
      terms: terms,
      status: status,
      age_restricted: ageRestricted,
      updated_at: now()
    }, PROMO_COLUMNS, PROMO_OPTIONAL);
  } catch (e) {
    return json({ ok: false, error: 'could_not_save_promo' }, 500);
  }

  var updated = await l.c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(row.id).first();
  return json({ ok: true, promo: promoOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await purgeFavourites(l.c.db, 'promo', l.row.id);
  await l.c.db.prepare('DELETE FROM promos WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}