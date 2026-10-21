/* /api/business/events/:id
   PATCH  { title?, description?, figure?, imageKey?, admission?, startsAt?, endsAt?, published? } -> update   (marketing_manager+)
   DELETE                                                                                                      -> delete */
import { json, readJson, now } from './../../_shared.js';
import { requireBusiness, eventOut, str, jsonString, numOrNull, purgeFavourites } from './../../_business.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(context.params.id).first();
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
  var description = b.description !== undefined ? str(b.description) : row.description;
  var figure = b.figure !== undefined ? jsonString(b.figure) : row.figure;
  var imageKey = b.imageKey !== undefined ? str(b.imageKey) : row.image_key;
  var admission = b.admission !== undefined ? str(b.admission) : row.admission;
  var startsAt = b.startsAt !== undefined ? numOrNull(b.startsAt) : row.starts_at;
  var endsAt = b.endsAt !== undefined ? numOrNull(b.endsAt) : row.ends_at;
  var published = b.published !== undefined ? (b.published ? 1 : 0) : row.published;

  await l.c.db.prepare(
    'UPDATE events SET title = ?, description = ?, figure = ?, image_key = ?, admission = ?, ' +
    'starts_at = ?, ends_at = ?, published = ?, updated_at = ? WHERE id = ?'
  ).bind(title, description, figure, imageKey, admission, startsAt, endsAt, published, now(), row.id).run();

  var updated = await l.c.db.prepare('SELECT * FROM events WHERE id = ?').bind(row.id).first();
  return json({ ok: true, event: eventOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await purgeFavourites(l.c.db, 'event', l.row.id);
  await l.c.db.prepare('DELETE FROM events WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
