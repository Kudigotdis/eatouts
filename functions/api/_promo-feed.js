/* ============================================================
   EATOUTS PUBLIC FEED HELPERS (server)

   Shared by GET /api/promos and GET /api/events.

   * the viewer's adult check (same session + DOB lookup the venue
     bundle uses)
   * the mapping from a D1 row to the shape the customer app renders
   ============================================================ */
import { getSession } from './_shared.js';
import { meetsAge } from './_auth.js';
import { activeWeekdays, isAgeRestrictedPromo } from './_promo-rules.js';

/** True when the signed-in account is old enough for 18+ content. */
export async function viewerIsAdult(env, request) {
  try {
    if (!env || !env.DB) return false;
    var session = await getSession(env, request);
    if (!session || !session.userId) return false;
    var row = await env.DB.prepare('SELECT profile FROM users WHERE id = ?').bind(session.userId).first();
    if (!row) return false;
    var profile = {};
    try { profile = row.profile ? JSON.parse(row.profile) : {}; } catch (e) { profile = {}; }
    return meetsAge(profile.dob, 18);
  } catch (e) {
    return false;
  }
}

function parseJson(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(v) {
  var s = String(v || '').trim();
  var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (!m) return s;
  return (+m[3]) + ' ' + MONTHS[(+m[2]) - 1];
}

/** "1 Oct to 31 Oct", "1 Oct", or "". */
export function validText(startDate, endDate) {
  var a = shortDate(startDate);
  var b = shortDate(endDate);
  if (a && b && a !== b) return a + ' to ' + b;
  return a || b || '';
}

function itemNames(list) {
  return (list || []).map(function (x) {
    if (x == null) return '';
    if (typeof x === 'string') return x;
    return String(x.name || x.title || x.label || '');
  }).filter(Boolean);
}

/** A promo row (+ the joined venue columns) in the Promos-tab shape. */
export function promoFeedRow(r) {
  var days = activeWeekdays({
    startDate: r.start_date,
    endDate: r.end_date,
    recurring: r.recurring,
    days: parseJson(r.days_json) || []
  });

  var price = r.promo_price != null ? Number(r.promo_price) : 0;
  var was = r.original_price != null ? Number(r.original_price) : 0;
  var image = r.image_key || r.image || null;
  var items = itemNames(parseJson(r.linked_menu_items_json));

  var venue = {
    id: r.restaurant_id || null,
    name: r.venue_name || '',
    slug: r.venue_slug || '',
    town: r.venue_town || '',
    area: r.venue_area || '',
    district: r.venue_district || '',
    districtName: r.venue_district_name || '',
    types: parseJson(r.venue_types) || [],
    logo: r.venue_logo || null,
    type: r.venue_type || '',
    location: {
      town: r.venue_town || '',
      area: r.venue_area || '',
      district: r.venue_district || '',
      districtCode: r.venue_district || '',
      districtName: r.venue_district_name || ''
    }
  };

  var adult = !!r.age_restricted || isAgeRestrictedPromo({
    type: r.type,
    subtype: r.subtype,
    category: r.category,
    brand: r.brand,
    title: r.title,
    desc: r.details || r.description,
    description: r.description,
    sponsor: r.sponsor,
    terms: r.terms,
    audience: r.audience
  });

  return {
    id: r.id,
    title: r.title || '',
    desc: r.details || r.description || '',
    description: r.description || r.details || '',
    price: price,
    was: was,
    save: was > price ? was - price : 0,
    valid: validText(r.start_date, r.end_date),
    day: days[0] || null,
    days: days,
    type: r.type || '',
    subtype: r.subtype || '',
    category: r.category || 'Food',
    promoFamily: r.promo_family || '',
    mechanic: r.mechanic || '',
    brand: r.brand || '',
    items: items,
    images: image ? [image] : [],
    image: image,
    sponsor: r.sponsor || '',
    terms: r.terms || '',
    ageRestricted: adult,
    audience: adult ? '18plus' : 'everyone',
    ctaType: r.cta_type || '',
    ctaUrl: r.cta_url || '',
    restaurantId: r.restaurant_id || null,
    venue: venue
  };
}

/** Drop the 18+ rows for anyone who is not a signed-in adult. */
export function applyAgeGate(list, adult) {
  if (adult) return list;
  return list.filter(function (p) { return !p.ageRestricted; });
}
