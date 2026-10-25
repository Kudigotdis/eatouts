/* Shared helpers for the /api/business/* endpoints. Import-only. */
import { json, getSession, now, uid } from './_shared.js';

export var ROLES = ['owner', 'manager', 'menu_manager', 'marketing_manager'];

var RANK = { owner: 4, manager: 3, marketing_manager: 2, menu_manager: 1 };

export function roleRank(role) {
  return RANK[role] || 0;
}

export function validRole(role) {
  return ROLES.indexOf(String(role || '')) >= 0;
}

/** Signed-in account, or an error Response. */
export async function requireSession(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var session = await getSession(env, context.request);
  if (!session) return { error: json({ ok: false, error: 'not_authenticated' }, 401) };
  return { session: session, userId: session.userId, env: env, db: env.DB };
}

/** Resolve the signed-in member of a restaurant, enforcing a minimum role.
    Admins bypass the membership lookup (role reported as 'owner'). */
export async function requireBusiness(context, restaurantId, minRole) {
  var c = await requireSession(context);
  if (c.error) return c;
  var rid = String(restaurantId || '').trim();
  if (!rid) return { error: json({ ok: false, error: 'restaurant_required' }, 400) };

  if (c.session.isAdmin) {
    return { session: c.session, userId: c.userId, env: c.env, db: c.db, restaurantId: rid, role: 'owner', admin: true };
  }

  var m = await c.db.prepare(
    "SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ? AND status = 'active'"
  ).bind(c.userId, rid).first();
  if (!m) return { error: json({ ok: false, error: 'not_a_member' }, 403) };
  if (minRole && roleRank(m.role) < roleRank(minRole)) {
    return { error: json({ ok: false, error: 'insufficient_role' }, 403) };
  }
  return { session: c.session, userId: c.userId, env: c.env, db: c.db, restaurantId: rid, role: m.role, membership: m };
}

/** Enforce that the signed-in user owns this business_profiles row.
    Mirrors the ownership check the POST/PATCH/DELETE handlers apply: a
    missing id and somebody else's id both read as 404 not_found, so the
    endpoint never confirms that another tenant's business exists. */
export async function requireBusinessOwner(c, businessId) {
  var id = String(businessId || '').trim();
  if (!id) return { error: json({ ok: false, error: 'business_id_required' }, 400) };
  var row = await c.db.prepare(
    'SELECT id FROM business_profiles WHERE id = ? AND user_id = ?'
  ).bind(id, c.userId).first();
  if (!row) return { error: json({ ok: false, error: 'not_found' }, 404) };
  return { businessId: row.id };
}

/** URL-safe slug from a business name. */
export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Trimmed string, or null when empty. */
export function str(v) {
  if (v == null) return null;
  var s = String(v).trim();
  return s ? s : null;
}

/** Coerce a value to an array (for JSON list columns). */
export function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** JSON-encode a value for a TEXT column; pass through existing strings. */
export function jsonString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch (e) { return null; }
}

/** Finite number, or null for empty/NaN input. */
export function numOrNull(v) {
  if (v == null || v === '') return null;
  var n = Number(v);
  return isNaN(n) ? null : n;
}

function jsonOrNull(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

function jsonOrEmptyArray(v) {
  return asArray(jsonOrNull(v));
}

/* ---- claim -> membership bridge ---- */

/* When refId resolves to a D1 restaurant, record the claim and hand the
   caller an 'owner' membership if the venue has no active owner yet.
   First claimer wins; later claimers are recorded as pending claims for
   admin review. No-op for refIds that are not restaurants (local-only
   demo venues). `via` is stamped into the claims evidence for auditing. */
export async function grantClaimMembership(c, refId, via) {
  var rest = await c.db.prepare('SELECT id, status, claimed FROM restaurants WHERE id = ?').bind(refId).first();
  if (!rest) return { status: 'no_restaurant' };

  var ts = now();
  var mine = await c.db.prepare(
    'SELECT * FROM memberships WHERE user_id = ? AND restaurant_id = ?'
  ).bind(c.userId, refId).first();
  if (mine && mine.status === 'active') {
    return { status: 'already_member', restaurantId: refId, membership: mine.role };
  }

  var owners = await c.db.prepare(
    "SELECT COUNT(*) AS n FROM memberships WHERE restaurant_id = ? AND role = 'owner' AND status = 'active'"
  ).bind(refId).first();
  var hasOwner = !!(owners && owners.n);

  if (!hasOwner) {
    await c.db.prepare(
      'INSERT INTO memberships (id, user_id, restaurant_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(uid('mem'), c.userId, refId, 'owner', 'active', ts).run();
    if (!rest.claimed || rest.status === 'unclaimed') {
      await c.db.prepare(
        "UPDATE restaurants SET claimed = 1, status = 'claimed', updated_at = ? WHERE id = ?"
      ).bind(ts, refId).run();
    }
    await c.db.prepare(
      "INSERT INTO claims (id, restaurant_id, user_id, status, evidence, created_at) VALUES (?, ?, ?, 'approved', ?, ?)"
    ).bind(uid('clm'), refId, c.userId, JSON.stringify({ via: via || 'business_link' }), ts).run();
    return { status: 'granted', restaurantId: refId, membership: 'owner' };
  }

  await c.db.prepare(
    "INSERT INTO claims (id, restaurant_id, user_id, status, evidence, created_at) VALUES (?, ?, ?, 'pending', ?, ?)"
  ).bind(uid('clm'), refId, c.userId, JSON.stringify({ via: via || 'business_link' }), ts).run();
  return { status: 'pending_review', restaurantId: refId, membership: null };
}

/* ---- row <-> client mappers ---- */

export function restaurantOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    status: r.status,
    plan: r.plan,
    claimed: !!r.claimed,
    verified: !!r.verified,
    town: r.town || null,
    district: r.district || null,
    districtName: r.district_name || null,
    area: r.area || null,
    landmark: r.landmark || null,
    description: r.description || null,
    website: r.website || null,
    logoRef: r.logo_ref || null,
    coverRef: r.cover_ref || null,
    types: jsonOrEmptyArray(r.types),
    category: r.category || null,
    contacts: jsonOrEmptyArray(r.contacts),
    socials: jsonOrEmptyArray(r.socials),
    hours: jsonOrNull(r.hours),
    priceRange: r.price_range || null,
    features: jsonOrEmptyArray(r.features),
    /* 0014 - the business type slug (restaurant, bakery, caterer,
       foodtruck, bottlestore, supplier, lodge). It is the key the hub
       uses to pick a dashboard. */
    type: r.type || null,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export function membershipOut(m) {
  if (!m) return null;
  var hasUser = m.username != null || m.name != null || m.email != null || m.whatsapp != null;
  return {
    id: m.id,
    userId: m.user_id,
    restaurantId: m.restaurant_id,
    role: m.role,
    status: m.status,
    created_at: m.created_at,
    user: hasUser ? {
      id: m.user_id,
      username: m.username || null,
      name: m.name || null,
      email: m.email || null,
      whatsapp: m.whatsapp || null,
      photoKey: m.photo_key || null
    } : null
  };
}

export function categoryOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    name: r.name,
    position: r.position != null ? r.position : 0,
    created_at: r.created_at
  };
}

export function itemOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    categoryId: r.category_id || null,
    name: r.name,
    description: r.description || null,
    price: r.price != null ? r.price : null,
    currency: r.currency || 'BWP',
    imageKey: r.image_key || null,
    visible: !!r.visible,
    position: r.position != null ? r.position : 0,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export function galleryGroupOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    visible: !!r.visible,
    position: r.position != null ? r.position : 0,
    created_at: r.created_at
  };
}

export function galleryImageOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    groupId: r.group_id || null,
    imageKey: r.image_key,
    label: r.label || null,
    visible: !!r.visible,
    position: r.position != null ? r.position : 0,
    created_at: r.created_at
  };
}

export function eventOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    description: r.description || null,
    figure: jsonOrNull(r.figure),
    imageKey: r.image_key || null,
    admission: r.admission || null,
    startsAt: r.starts_at != null ? r.starts_at : null,
    endsAt: r.ends_at != null ? r.ends_at : null,
    published: !!r.published,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export function promoOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    title: r.title,
    image: r.image || null,
    type: r.type || null,
    description: r.description || null,
    originalPrice: r.original_price != null ? r.original_price : null,
    promoPrice: r.promo_price != null ? r.promo_price : null,
    locationJson: jsonOrNull(r.location_json),
    startDate: r.start_date || null,
    startTime: r.start_time || null,
    endDate: r.end_date || null,
    endTime: r.end_time || null,
    recurring: !!r.recurring,
    daysJson: jsonOrEmptyArray(r.days_json),
    linkedMenuItemsJson: jsonOrEmptyArray(r.linked_menu_items_json),
    actionJson: jsonOrNull(r.action_json),
    sponsor: r.sponsor || null,
    terms: r.terms || null,
    status: r.status || 'active',
    /* The operator's own 18+ switch on the promo. */
    ageRestricted: !!r.age_restricted,
    /* 0014 - the listing and pricing shape */
    category: r.category || null,
    subtype: r.subtype || null,
    promoFamily: r.promo_family || null,
    contentFormat: r.content_format || 'offer',
    mechanic: r.mechanic || null,
    audience: r.audience || 'everyone',
    brand: r.brand || null,
    billableDays: r.billable_days != null ? r.billable_days : 1,
    quotaMonth: r.quota_month || null,
    submissionId: r.submission_id || null,
    paymentStatus: r.payment_status || 'not_required',
    invoiceId: r.invoice_id || null,
    feeCharged: r.fee_charged != null ? r.fee_charged : 0,
    currency: r.currency || 'BWP',
    ctaType: r.cta_type || null,
    ctaUrl: r.cta_url || null,
    crossPostEvent: !!r.cross_post_event,
    submittedAt: r.submitted_at != null ? r.submitted_at : null,
    publishedAt: r.published_at != null ? r.published_at : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

/* ------------------------------------------------------------------
   Schema-tolerant writes

   The promos table grew over time: some deployments have the `image`
   column and some do not, and `age_restricted` only arrives with
   migration 0012. These helpers write whatever columns the table
   actually has, so an endpoint never breaks because a migration has
   not been applied yet.
   ------------------------------------------------------------------ */

/** The columns a table really has. Empty when PRAGMA is unavailable. */
export async function tableColumns(db, table) {
  if (!db || !table) return [];
  try {
    var res = await db.prepare('PRAGMA table_info(' + table + ')').all();
    var rows = (res && res.results) || [];
    if (!rows.length) return [];
    return rows.map(function (r) { return String(r.name); });
  } catch (e) {
    return [];
  }
}

async function runInsert(db, table, keys, values) {
  var marks = keys.map(function () { return '?'; }).join(', ');
  var sql = 'INSERT INTO ' + table + ' (' + keys.join(', ') + ') VALUES (' + marks + ')';
  var binds = keys.map(function (k) { return values[k]; });
  await db.prepare(sql).bind.apply(null, binds).run();
}

/**
 * Insert a row, skipping any column the table does not have.
 *
 * @param db      the D1 binding
 * @param table   table name
 * @param values  { column: value } - undefined values are left out
 * @param order   the columns to write, in order
 * @param optional columns that may be dropped one at a time when the
 *                table shape cannot be read
 */
export async function insertRow(db, table, values, order, optional) {
  var keys = order.filter(function (k) { return values[k] !== undefined; });
  var cols = await tableColumns(db, table);
  if (cols.length) {
    return runInsert(db, table, keys.filter(function (k) { return cols.indexOf(k) !== -1; }), values);
  }
  /* The table shape is unknown: try the full set, then drop the optional
     columns one by one until the insert goes through. */
  var drop = [];
  var opt = optional || [];
  for (var i = 0; i <= opt.length; i++) {
    var use = keys.filter(function (k) { return drop.indexOf(k) === -1; });
    try {
      return await runInsert(db, table, use, values);
    } catch (e) {
      if (i >= opt.length) throw e;
      drop.push(opt[i]);
    }
  }
}

/**
 * Update a row, skipping any column the table does not have.
 */
export async function updateRow(db, table, values, keys, optional) {
  var cols = await tableColumns(db, table);
  var use = keys.filter(function (k) { return values[k] !== undefined; });
  if (cols.length) {
    use = use.filter(function (k) { return cols.indexOf(k) !== -1; });
  }
  if (!use.length) return;
  var sets = use.map(function (k) { return k + ' = ?'; }).join(', ');
  var sql = 'UPDATE ' + table + ' SET ' + sets + ' WHERE id = ?';
  var binds = use.map(function (k) { return values[k]; });
  try {
    await db.prepare(sql).bind.apply(null, binds.concat([values.id])).run();
  } catch (e) {
    if (!cols.length && optional && optional.length) {
      /* unknown table shape: retry without the optional columns */
      var drop = [];
      var opt = optional;
      for (var i = 0; i < opt.length; i++) {
        var keep = use.filter(function (k) { return drop.indexOf(k) === -1; });
        try {
          var sets2 = keep.map(function (k) { return k + ' = ?'; }).join(', ');
          var sql2 = 'UPDATE ' + table + ' SET ' + sets2 + ' WHERE id = ?';
          var binds2 = keep.map(function (k) { return values[k]; });
          await db.prepare(sql2).bind.apply(null, binds2.concat([values.id])).run();
          return;
        } catch (e2) {
          drop.push(opt[i]);
        }
      }
    }
    throw e;
  }
}

/** Remove every customer favourite that points at a deleted business asset. */
export async function purgeFavourites(db, type, refId) {
  if (!db || !type || !refId) return;
  await db.prepare('DELETE FROM favourites WHERE type = ? AND ref_id = ?').bind(String(type), String(refId)).run();
}
