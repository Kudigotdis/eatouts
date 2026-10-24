/* ============================================================
   EATOUTS PROMO ROW WRITER (server)

   One place that turns a promo body - the operator's local shape,
   the submission payload, or an existing row - into the columns of
   the `promos` table.

   Keeping this in one module is what prevents the "thin INSERT"
   bug: the draft row written by the operator, the row updated at
   submission and the row published by the admin all carry the same
   full shape.
   ============================================================ */
import { str, numOrNull, jsonString } from './_business.js';
import {
  segmentForPromo, activeDays, isAgeRestrictedPromo, monthKey
} from './_promo-rules.js';

/* The columns a promo row is written with, in order. */
export var PROMO_COLUMNS = [
  'id', 'restaurant_id', 'title', 'image', 'type', 'description',
  'original_price', 'promo_price', 'location_json', 'start_date', 'start_time',
  'end_date', 'end_time', 'recurring', 'days_json', 'linked_menu_items_json',
  'action_json', 'sponsor', 'terms', 'status', 'active', 'age_restricted',
  'created_at', 'updated_at',
  /* 0014 */
  'category', 'subtype', 'promo_family', 'content_format', 'mechanic',
  'audience', 'brand', 'billable_days', 'quota_month', 'submission_id',
  'payment_status', 'invoice_id', 'fee_charged', 'currency', 'cta_type',
  'cta_url', 'cross_post_event', 'submitted_at', 'published_at'
];

/* Dropped one at a time when the table shape cannot be read. The 0014
   columns come last so an older database still accepts the core row. */
export var PROMO_OPTIONAL = [
  'age_restricted', 'image', 'active',
  'published_at', 'submitted_at', 'cross_post_event', 'cta_url', 'cta_type',
  'currency', 'fee_charged', 'invoice_id', 'payment_status', 'submission_id',
  'quota_month', 'billable_days', 'brand', 'audience', 'mechanic',
  'content_format', 'promo_family', 'subtype', 'category'
];

function parseJson(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

/** An existing row in the operator's camelCase shape. */
export function rowToPromo(row) {
  if (!row) return {};
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    title: row.title,
    image: row.image,
    type: row.type,
    description: row.description,
    originalPrice: row.original_price,
    promoPrice: row.promo_price,
    location: parseJson(row.location_json),
    startDate: row.start_date,
    startTime: row.start_time,
    endDate: row.end_date,
    endTime: row.end_time,
    recurring: !!row.recurring,
    days: parseJson(row.days_json) || [],
    linkedMenuItems: parseJson(row.linked_menu_items_json) || [],
    action: parseJson(row.action_json),
    sponsor: row.sponsor,
    terms: row.terms,
    status: row.status,
    ageRestricted: !!row.age_restricted,
    category: row.category,
    subtype: row.subtype,
    promoFamily: row.promo_family,
    contentFormat: row.content_format || 'offer',
    mechanic: row.mechanic,
    audience: row.audience,
    brand: row.brand,
    ctaType: row.cta_type,
    ctaUrl: row.cta_url,
    crossPostEvent: !!row.cross_post_event
  };
}

function pick(b, row, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (b[keys[i]] !== undefined) return b[keys[i]];
  }
  return undefined;
}

/**
 * Merge a request body over an existing row into one camelCase promo.
 * Both camelCase and snake_case keys are accepted, because the
 * operator page, the tests and the admin tools do not all agree.
 */
export function mergePromo(b, row) {
  b = b || {};
  var base = rowToPromo(row);
  var out = {};
  var map = {
    title: ['title'],
    image: ['image', 'imageKey', 'image_key'],
    type: ['type'],
    description: ['description', 'desc', 'details'],
    originalPrice: ['originalPrice', 'original_price'],
    promoPrice: ['promoPrice', 'promo_price'],
    startDate: ['startDate', 'start_date'],
    startTime: ['startTime', 'start_time'],
    endDate: ['endDate', 'end_date'],
    endTime: ['endTime', 'end_time'],
    sponsor: ['sponsor'],
    terms: ['terms'],
    category: ['category'],
    subtype: ['subtype'],
    promoFamily: ['promoFamily', 'promo_family', 'family'],
    contentFormat: ['contentFormat', 'content_format'],
    mechanic: ['mechanic'],
    audience: ['audience'],
    brand: ['brand'],
    ctaType: ['ctaType', 'cta_type'],
    ctaUrl: ['ctaUrl', 'cta_url'],
    status: ['status']
  };
  for (var k in map) {
    if (!Object.prototype.hasOwnProperty.call(map, k)) continue;
    var v = pick(b, row, map[k]);
    out[k] = v === undefined ? base[k] : v;
  }

  out.location = b.locationJson !== undefined ? b.locationJson
    : (b.location_json !== undefined ? b.location_json
      : (b.location !== undefined ? b.location : base.location));
  out.days = b.daysJson !== undefined ? b.daysJson
    : (b.days_json !== undefined ? b.days_json
      : (b.days !== undefined ? b.days : base.days));
  out.linkedMenuItems = b.linkedMenuItemsJson !== undefined ? b.linkedMenuItemsJson
    : (b.linked_menu_items_json !== undefined ? b.linked_menu_items_json
      : (b.linkedMenuItems !== undefined ? b.linkedMenuItems : base.linkedMenuItems));
  out.action = b.actionJson !== undefined ? b.actionJson
    : (b.action_json !== undefined ? b.action_json
      : (b.action !== undefined ? b.action : base.action));

  var rec = b.recurring;
  if (rec === undefined && b.recurring === undefined) rec = base.recurring;
  out.recurring = !!(rec === true || rec === 1 || rec === '1' || rec === 'true');

  var cross = pick(b, row, ['crossPostEvent', 'cross_post_event']);
  out.crossPostEvent = !!(cross === true || cross === 1 || cross === '1' || cross === 'true' ||
    (cross === undefined && base.crossPostEvent));

  var flag = b.ageRestricted !== undefined ? b.ageRestricted
    : (b.age_restricted !== undefined ? b.age_restricted : base.ageRestricted);
  if (flag === undefined) flag = false;
  out.ageFlag = !!(flag === true || flag === 1 || flag === '1' || flag === 'true');
  return out;
}

/** True when a promo must only be shown to 18+ viewers. */
export function isAdultPromo(p) {
  if (!p) return false;
  if (p.ageFlag) return true;
  if (String(p.audience || '').toLowerCase() === '18plus') return true;
  return !!isAgeRestrictedPromo(p);
}

/**
 * The column values for a promo.
 *
 * `opts.status` / `opts.active` are supplied by the caller so the
 * operator endpoints can force `draft` and `active=0` and only the
 * admin publish can set `active=1`.
 */
export function promoValues(b, row, opts) {
  opts = opts || {};
  var p = mergePromo(b, row);
  var adult = isAdultPromo(p);
  var ts = opts.now != null ? opts.now : Date.now();
  var segment = segmentForPromo(p);
  var days = activeDays(p);

  return {
    id: opts.id || (row && row.id) || b.id,
    restaurant_id: opts.restaurantId || (row && row.restaurant_id) || b.restaurantId || null,
    title: str(p.title) || 'Untitled promo',
    image: str(p.image),
    type: str(p.type),
    description: str(p.description),
    original_price: numOrNull(p.originalPrice),
    promo_price: numOrNull(p.promoPrice),
    location_json: jsonString(p.location),
    start_date: str(p.startDate),
    start_time: str(p.startTime),
    end_date: str(p.endDate),
    end_time: str(p.endTime),
    recurring: p.recurring ? 1 : 0,
    days_json: jsonString(p.days),
    linked_menu_items_json: jsonString(p.linkedMenuItems),
    action_json: jsonString(p.action),
    sponsor: str(p.sponsor),
    terms: str(p.terms),
    status: opts.status !== undefined ? opts.status : str(p.status) || 'draft',
    active: opts.active !== undefined ? opts.active : 0,
    age_restricted: adult ? 1 : 0,
    created_at: opts.createdAt != null ? opts.createdAt : ts,
    updated_at: ts,
    /* 0014 */
    category: segment,
    subtype: str(p.subtype),
    promo_family: str(p.promoFamily),
    content_format: str(p.contentFormat) || 'offer',
    mechanic: str(p.mechanic),
    audience: adult ? '18plus' : 'everyone',
    brand: str(p.brand),
    billable_days: days,
    quota_month: opts.quotaMonth != null ? opts.quotaMonth : null,
    submission_id: opts.submissionId != null ? opts.submissionId : null,
    payment_status: opts.paymentStatus != null ? opts.paymentStatus : 'not_required',
    invoice_id: opts.invoiceId != null ? opts.invoiceId : null,
    fee_charged: opts.feeCharged != null ? opts.feeCharged : 0,
    currency: opts.currency || 'BWP',
    cta_type: str(p.ctaType) || (p.action && str(p.action.type)) || null,
    cta_url: str(p.ctaUrl) || (p.action && str(p.action.url)) || null,
    cross_post_event: p.crossPostEvent ? 1 : 0,
    submitted_at: opts.submittedAt != null ? opts.submittedAt : null,
    published_at: opts.publishedAt != null ? opts.publishedAt : null
  };
}

/** The free promo-days a venue has used in a month. */
export async function freeDaysUsed(db, restaurantId, month, excludeId) {
  var sql = "SELECT COALESCE(SUM(quoted_days), 0) AS used FROM promo_submissions " +
    "WHERE restaurant_id = ? AND month_key = ? AND quoted_free = 1 " +
    "AND status IN ('pending','approved','published')";
  var stmt;
  if (excludeId) {
    sql += ' AND id != ?';
    stmt = db.prepare(sql).bind(restaurantId, month, excludeId);
  } else {
    stmt = db.prepare(sql).bind(restaurantId, month);
  }
  var res = await stmt.first();
  var used = res && res.used != null ? Number(res.used) : 0;
  return isFinite(used) ? used : 0;
}

/** Free promo-days a venue has left in a month. */
export async function freeDaysLeft(db, restaurantId, month, allowance, excludeId) {
  var cap = allowance != null ? allowance : 3;
  var used = await freeDaysUsed(db, restaurantId, month, excludeId);
  return Math.max(0, cap - used);
}

/** The month key a promo is counted against. */
export function promoMonth(ts) {
  return monthKey(ts == null ? Date.now() : ts);
}
