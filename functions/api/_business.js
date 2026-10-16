/* Shared helpers for the /api/business/* endpoints. Import-only. */
import { json, getSession } from './_shared.js';

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

function jsonOrNull(v) {
  try { return v ? JSON.parse(v) : null; } catch (e) { return null; }
}

function jsonOrEmptyArray(v) {
  return asArray(jsonOrNull(v));
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
