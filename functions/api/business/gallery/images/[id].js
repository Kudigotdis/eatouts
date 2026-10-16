/* /api/business/gallery/images/:id
   PATCH  { groupId?, imageKey?, label?, visible?, position? } -> update   (marketing_manager+)
   DELETE                                                       -> delete */
import { json, readJson } from './../../../_shared.js';
import { requireBusiness, galleryImageOut, str } from './../../../_business.js';

async function load(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var row = await env.DB.prepare('SELECT * FROM gallery_images WHERE id = ?').bind(context.params.id).first();
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

  var imageKey = str(pick('imageKey', 'image_key')) || str(b.src) || row.image_key;
  var visible = b.visible !== undefined ? (b.visible ? 1 : 0) : row.visible;
  var groupId = b.groupId !== undefined ? (str(b.groupId) || null) : row.group_id;

  await l.c.db.prepare(
    'UPDATE gallery_images SET group_id = ?, image_key = ?, label = ?, visible = ?, position = ? WHERE id = ?'
  ).bind(
    groupId, imageKey, str(pick('label')), visible,
    Number(pick('position')) || 0, row.id
  ).run();

  var updated = await l.c.db.prepare('SELECT * FROM gallery_images WHERE id = ?').bind(row.id).first();
  return json({ ok: true, image: galleryImageOut(updated) });
}

export async function onRequestDelete(context) {
  var l = await load(context);
  if (l.error) return l.error;
  await l.c.db.prepare('DELETE FROM gallery_images WHERE id = ?').bind(l.row.id).run();
  return json({ ok: true });
}
