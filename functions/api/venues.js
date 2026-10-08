/* ============================================================
   GET /api/venues            -> list claimable / public venues
   GET /api/venues?q=gaborone -> filter by name or town
   GET /api/venues?mine=1     -> venues the signed-in user belongs to
   ============================================================ */
import { json, getSession } from './_shared.js';

function parseTypes(raw) {
  try { return JSON.parse(raw || '[]'); } catch (e) { return []; }
}

export async function onRequestGet(context) {
  var env = context.env;
  var request = context.request;
  if (!env.DB) return json({ error: 'backend_not_configured' }, 503);

  var url = new URL(request.url);
  var q = (url.searchParams.get('q') || '').trim();
  var mine = url.searchParams.get('mine') === '1';
  var limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 200);

  var rows;
  if (mine) {
    var session = await getSession(env, request);
    if (!session) return json({ error: 'unauthorized' }, 401);
    var res = await env.DB.prepare(
      'SELECT r.id, r.slug, r.name, r.status, r.plan, r.town, r.district_name, r.area, ' +
      'r.logo_ref, r.types FROM restaurants r ' +
      'JOIN memberships m ON m.restaurant_id = r.id ' +
      'WHERE m.user_id = ? ORDER BY r.name LIMIT ?'
    ).bind(session.userId, limit).all();
    rows = res.results || [];
  } else if (q) {
    var like = '%' + q + '%';
    var r2 = await env.DB.prepare(
      'SELECT id, slug, name, status, plan, town, district_name, area, logo_ref, types ' +
      'FROM restaurants WHERE name LIKE ? OR town LIKE ? ORDER BY name LIMIT ?'
    ).bind(like, like, limit).all();
    rows = r2.results || [];
  } else {
    var r3 = await env.DB.prepare(
      'SELECT id, slug, name, status, plan, town, district_name, area, logo_ref, types ' +
      'FROM restaurants ORDER BY name LIMIT ?'
    ).bind(limit).all();
    rows = r3.results || [];
  }

  rows.forEach(function (r) { r.types = parseTypes(r.types); });
  return json({ venues: rows });
}