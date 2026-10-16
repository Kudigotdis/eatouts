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
