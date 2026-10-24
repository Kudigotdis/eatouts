/* /api/business/promos
   GET  ?restaurant=rest_x -> { ok, promos: [...], freeDays: {...} } (marketing_manager+)
   POST ?restaurant=rest_x { id?, title, image?, type?, description?, originalPrice?, promoPrice?,
                              locationJson?, startDate?, startTime?, endDate?, endTime?, recurring?,
                              daysJson?, linkedMenuItemsJson?, actionJson?, sponsor?, terms?,
                              category?, subtype?, promoFamily?, contentFormat?, mechanic?,
                              audience?, brand?, ctaType?, ctaUrl?, crossPostEvent?, ageRestricted? }
        -> { ok, promo }

   A write here is ALWAYS a draft. The operator cannot publish: only
   `PATCH /api/admin/promo-submissions {action:'publish'}` may set
   `active = 1`. */
import { json, readJson, now, uid } from './../_shared.js';
import {
  requireBusiness, promoOut, str, insertRow, updateRow
} from './../_business.js';
import {
  PROMO_COLUMNS, PROMO_OPTIONAL, promoValues, freeDaysLeft, promoMonth
} from './../_promo-write.js';

export async function onRequestGet(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var rows = await c.db.prepare(
    'SELECT * FROM promos WHERE restaurant_id = ? ORDER BY created_at DESC'
  ).bind(c.restaurantId).all();

  var month = promoMonth(now());
  var left = await freeDaysLeft(c.db, c.restaurantId, month);
  var allowance = 3;

  return json({
    ok: true,
    promos: (rows.results || []).map(promoOut),
    freeDays: {
      month: month,
      allowance: allowance,
      used: allowance - left,
      left: left
    }
  });
}

export async function onRequestPost(context) {
  var rid = new URL(context.request.url).searchParams.get('restaurant');
  var c = await requireBusiness(context, rid, 'marketing_manager');
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var title = str(b.title);
  if (!title) return json({ ok: false, error: 'title_required' }, 400);

  var ts = now();
  var id = str(b.id) || uid('promo');

  /* Saving a draft twice must not create a second row. If the caller
     sends the id of one of its own drafts, update it in place. */
  var existing = await c.db.prepare(
    'SELECT * FROM promos WHERE id = ? AND restaurant_id = ?'
  ).bind(id, c.restaurantId).first();
  if (existing) {
    var status = String(existing.status || '');
    if (['draft', 'paused'].indexOf(status) === -1) {
      return json({ ok: false, error: 'promo_not_editable', status: status }, 409);
    }
    var upd = promoValues(b, existing, {
      id: existing.id,
      restaurantId: c.restaurantId,
      status: 'draft',
      active: 0,
      createdAt: existing.created_at,
      now: ts
    });
    upd.updated_at = ts;
    await updateRow(c.db, 'promos', upd, PROMO_COLUMNS, PROMO_OPTIONAL);
    var updatedRow = await c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(id).first();
    return json({ ok: true, promo: promoOut(updatedRow) });
  }

  var values = promoValues(b, null, {
    id: id,
    restaurantId: c.restaurantId,
    status: 'draft',
    active: 0,
    createdAt: ts,
    now: ts
  });

  try {
    await insertRow(c.db, 'promos', values, PROMO_COLUMNS, PROMO_OPTIONAL);
  } catch (e) {
    return json({ ok: false, error: 'could_not_save_promo' }, 500);
  }

  var row = await c.db.prepare('SELECT * FROM promos WHERE id = ?').bind(id).first();
  return json({ ok: true, promo: promoOut(row) }, 201);
}
