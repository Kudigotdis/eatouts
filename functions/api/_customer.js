/* Shared helpers for the /api/customer/* endpoints. Import-only. */
import { json, getSession, now, uid } from './_shared.js';

/** Resolve the signed-in customer, or return an error Response. */
export async function requireCustomer(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var session = await getSession(env, context.request);
  if (!session) return { error: json({ ok: false, error: 'not_authenticated' }, 401) };
  if (session.type && session.type !== 'customer' && !session.isAdmin) {
    return { error: json({ ok: false, error: 'not_a_customer' }, 403) };
  }
  return { session: session, userId: session.userId, env: env, db: env.DB };
}

export { now, uid };

/** Resolve the signed-in admin, or return an error Response. */
export async function requireAdmin(context) {
  var env = context.env;
  if (!env || !env.DB) return { error: json({ ok: false, error: 'backend_not_configured' }, 503) };
  var session = await getSession(env, context.request);
  if (!session) return { error: json({ ok: false, error: 'not_authenticated' }, 401) };
  if (!session.isAdmin) return { error: json({ ok: false, error: 'not_admin' }, 403) };
  return { session: session, userId: session.userId, env: env, db: env.DB };
}

/* ---- row <-> client mappers ---- */

export function favouriteOut(r) {
  var payload = null;
  try { payload = r.payload ? JSON.parse(r.payload) : null; } catch (e) { payload = null; }
  return {
    id: r.id,
    type: r.type,
    refId: r.ref_id,
    title: r.title || null,
    subtitle: r.subtitle || null,
    price: r.price != null ? r.price : null,
    imageRef: r.image_ref || null,
    venueId: r.venue_id || null,
    payload: payload,
    created_at: r.created_at
  };
}

export function summaryOut(r) {
  var payload = null;
  try { payload = r.payload ? JSON.parse(r.payload) : null; } catch (e) { payload = null; }
  return {
    id: r.id,
    orderRef: r.order_ref || null,
    venueId: r.venue_id || null,
    venueName: r.venue_name || null,
    venueLogo: r.venue_logo || null,
    itemCount: r.item_count != null ? r.item_count : 0,
    total: r.total != null ? r.total : null,
    source: r.source || null,
    payload: payload,
    created_at: r.created_at
  };
}

export function eventOut(r) {
  var payload = null;
  try { payload = r.payload ? JSON.parse(r.payload) : null; } catch (e) { payload = null; }
  return {
    id: r.id,
    eventRef: r.event_ref || null,
    title: r.title || null,
    venueId: r.venue_id || null,
    venueName: r.venue_name || null,
    imageRef: r.image_ref || null,
    payload: payload,
    created_at: r.created_at
  };
}

export function addressOut(r) {
  return {
    id: r.id,
    label: r.label || null,
    district: r.district || null,
    town: r.town || null,
    area: r.area || null,
    street: r.street || null,
    address: r.address || null,
    contact: r.contact || null,
    isDefault: !!r.is_default,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
}

export function promoSubmissionOut(r) {
  var payload = null;
  try { payload = r.payload ? JSON.parse(r.payload) : null; } catch (e) { payload = null; }
  return {
    id: r.id,
    userId: r.user_id,
    eventRef: r.event_ref || null,
    title: r.title || null,
    venueId: r.venue_id || null,
    venueName: r.venue_name || null,
    whenText: r.when_text || null,
    summary: r.summary || null,
    imageRef: r.image_ref || null,
    fee: r.fee != null ? r.fee : 50,
    currency: r.currency || 'BWP',
    status: r.status || 'pending',
    adminNote: r.admin_note || null,
    restaurantId: r.restaurant_id || null,
    source: r.source || 'customer',
    payload: payload,
    created_at: r.created_at,
    updated_at: r.updated_at,
    monthKey: r.month_key || null,
    promoId: r.promo_id || null,
    feeCharged: r.fee_charged != null ? r.fee_charged : null,
    billed: !!r.billed,
    /* 0014 - the locked quote */
    quotedDays: r.quoted_days != null ? r.quoted_days : 0,
    quotedFree: !!r.quoted_free,
    paymentStatus: r.payment_status || 'not_required',
    invoiceId: r.invoice_id || null,
    promoDraftId: r.promo_draft_id || null,
    adminOverride: !!r.admin_override,
    reviewedAt: r.reviewed_at != null ? r.reviewed_at : null
  };
}

export function invoiceOut(r) {
  if (!r) return null;
  return {
    id: r.id,
    restaurantId: r.restaurant_id,
    type: r.type || 'promo',
    amount: r.amount != null ? r.amount : 0,
    currency: r.currency || 'BWP',
    status: r.status || 'draft',
    reference: r.reference || null,
    note: r.note || null,
    created_at: r.created_at,
    paid_at: r.paid_at != null ? r.paid_at : null
  };
}
