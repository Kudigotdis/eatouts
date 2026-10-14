/* /api/admin/links  (admin only)
   GET   -> { links: [...] }   ?q=<slug|name>&status=&country=&limit=
   PATCH -> { ok, link }        body { id, action }  action: revoke | activate */
import { json, readJson, now } from './../_shared.js';
import { requireAdmin } from './../_customer.js';
import { linkOut, countryOf } from './../_links.js';

export async function onRequestGet(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var url = new URL(context.request.url);
  var q = String(url.searchParams.get('q') || '').trim();
  var status = String(url.searchParams.get('status') || '').trim();
  var country = url.searchParams.get('country');
  var limit = Math.min(parseInt(url.searchParams.get('limit') || '200', 10) || 200, 500);

  var sql = 'SELECT * FROM business_links';
  var where = [];
  var binds = [];
  if (country) { where.push('country_code = ?'); binds.push(countryOf(country)); }
  if (status) { where.push('status = ?'); binds.push(status); }
  if (q) { where.push('(slug LIKE ? OR name LIKE ?)'); binds.push('%' + q + '%', '%' + q + '%'); }
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY updated_at DESC LIMIT ?';
  binds.push(limit);

  var stmt = c.db.prepare(sql);
  if (binds.length) stmt = stmt.bind.apply(stmt, binds);
  var res = await stmt.all();
  return json({ links: (res.results || []).map(linkOut) });
}

export async function onRequestPatch(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var b = await readJson(context.request);
  var id = String(b.id || '').trim();
  var action = String(b.action || '').trim().toLowerCase();
  if (!id || (action !== 'revoke' && action !== 'activate')) {
    return json({ ok: false, error: 'id and action (revoke|activate) are required' }, 400);
  }

  var row = await c.db.prepare('SELECT * FROM business_links WHERE id = ?').bind(id).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var next = action === 'revoke' ? 'revoked' : 'active';
  await c.db.prepare(
    'UPDATE business_links SET status = ?, updated_at = ? WHERE id = ?'
  ).bind(next, now(), id).run();

  row.status = next;
  row.updated_at = now();
  return json({ ok: true, link: linkOut(row) });
}
