/* /api/business/promos/:id
   PATCH  { title?, image?, type?, description?, originalPrice?, promoPrice?, locationJson?,
            startDate?, startTime?, endDate?, endTime?, recurring?, daysJson?, linkedMenuItemsJson?,
            actionJson?, sponsor?, terms?, status? } -> update   (marketing_manager+)
   DELETE                                                               -> delete + purge favourites */
import { json, readJson, now } from './../../_shared.js';
import { requireBusiness, promoOut, str, jsonString, numOrNull, purgeFavourites } from './../../_business.js';

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

  await l.c.db.prepare(
    'UPDATE promos SET title = ?, image = ?, type = ?, description = ?, original_price = ?, ' +
    'promo_price = ?, location_json = ?, start_date = ?, start_time = ?, end_date = ?, end_time = ?, ' +
    'recurring = ?, days_json = ?, linked_menu_items_json = ?, action_json = ?, sponsor = ?, ' +
    'terms = ?, status = ?, updated_at = ? WHERE id = ?'
  ).bind(
    title, image, type, description, originalPrice, promoPrice, locationJson,
    startDate, startTime, endDate, endTime, recurring, daysJson, linkedMenuItemsJson,
    actionJson, sponsor, terms, status, now(), row.id
  ).run();

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