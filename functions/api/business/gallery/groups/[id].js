/* /api/business/gallery/groups/:id
   PATCH  { title?, visible?, position? } -> update a group   (marketing_manager+)
   DELETE                                  -> delete a group and its images */
import { json, readJson } from './../../../_shared.js';
import { requireBusiness, galleryGroupOut, str } from './../../../_business.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM gallery_groups WHERE id = ?').bind(context.params.id).first();
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
  function pick(k, col) { return b[k] !== undefined ? b[k] : row[col || k]; }

  var title = str(pick('title')) || row.title;
  var visible = b.visible !== undefined ? (b.visible ? 1 : 0) : row.visible;
  var position = b.position !== undefined ? (Number(b.position) || 0) : row.position;

  await l.c.db.prepare(
    'UPDATE gallery_groups SET title = ?, visible = ?, position = ? WHERE id = ?'
  ).bind(title, visible, position, row.id).run();

  var updated = await l.c.db.prepare('SELECT * FROM gallery_groups WHERE id = ?').bind(row.id).first();
  return json({ ok: true, group: galleryGroupOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await l.c.db.prepare('DELETE FROM gallery_images WHERE group_id = ?').bind(l.row.id).run();
  await l.c.db.prepare('DELETE FROM gallery_groups WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
