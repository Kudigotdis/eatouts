/* ============================================================
   GET /api/promos

   The public Promos-tab feed. One request returns every live promo
   across every venue, in the shape the customer app already renders.

   Live means: active = 1 AND status = 'active'. An event-format promo
   is excluded from the Promos tab unless the operator cross-posted it.

   Filters (all optional, composable):
     ?day=Friday  ?town=Gaborone  ?area=  ?district=  ?venue=rest_x

   18+ promos are removed unless the caller is a signed-in adult.
   ============================================================ */
import { json } from './_shared.js';
import { promoFeedRow, applyAgeGate, viewerIsAdult } from './_promo-feed.js';

var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function same(a, b) {
  return String(a || '').toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') ===
    String(b || '').toLowerCase().normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}

export async function onRequestGet(context) {
  var env = context.env || {};
  if (!env.DB) return json({ ok: false, error: 'backend_not_configured', promos: [] }, 503);

  var url = new URL(context.request.url);
  var q = url.searchParams;
  var day = String(q.get('day') || '').trim();
  var town = String(q.get('town') || '').trim();
  var area = String(q.get('area') || '').trim();
  var district = String(q.get('district') || '').trim();
  var venue = String(q.get('venue') || '').trim();

  var sql =
    'SELECT p.*, ' +
    'r.name AS venue_name, r.slug AS venue_slug, r.town AS venue_town, ' +
    'r.area AS venue_area, r.district AS venue_district, ' +
    'r.district_name AS venue_district_name, r.types AS venue_types, ' +
    'r.logo_ref AS venue_logo, r.type AS venue_type ' +
    'FROM promos p LEFT JOIN restaurants r ON r.id = p.restaurant_id ' +
    "WHERE p.active = 1 AND p.status = 'active' " +
    "AND (p.content_format IS NULL OR p.content_format != 'event' OR p.cross_post_event = 1)";
  var binds = [];
  if (venue) { sql += ' AND p.restaurant_id = ?'; binds.push(venue); }
  sql += ' ORDER BY p.published_at DESC, p.created_at DESC LIMIT 400';

  var stmt = env.DB.prepare(sql);
  if (binds.length) stmt = stmt.bind.apply(stmt, binds);

  var rows = [];
  try {
    var res = await stmt.all();
    rows = (res && res.results) || [];
  } catch (e) {
    return json({ ok: false, error: 'could_not_read_promos', promos: [] }, 500);
  }

  var list = rows.map(promoFeedRow);

  if (day) {
    var want = DAYS.filter(function (d) { return same(d, day); })[0] || day;
    list = list.filter(function (p) {
      return !p.days.length || p.days.indexOf(want) !== -1;
    });
  }
  if (town && town !== 'All') {
    list = list.filter(function (p) { return same(p.venue.town, town); });
  }
  if (area && area !== 'All') {
    list = list.filter(function (p) { return same(p.venue.area, area); });
  }
  if (district && district !== 'All') {
    list = list.filter(function (p) {
      return same(p.venue.district, district) || same(p.venue.districtName, district);
    });
  }

  var adult = await viewerIsAdult(env, context.request);
  list = applyAgeGate(list, adult);

  return json({
    ok: true,
    count: list.length,
    viewerAdult: adult,
    promos: list
  }, 200, { 'cache-control': 'public, max-age=60' });
}
