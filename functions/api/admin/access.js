/* ============================================================
   GET /api/admin/access        (Milestone B2 - the management screen)

   One read that powers the "Access & security" panel in the dashboard: the
   state of this browser's bypass, the browsers that have ever been let in, and
   what the gate has been refusing lately.

   READ-ONLY BY DESIGN. Minting lives in POST /api/admin/login and revocation in
   POST /api/admin/revoke-all; this endpoint can look but not change anything, so
   a mistake here can never widen access.

   AUTH: requireAdmin (platform_admin session), exactly like /api/admin/links, so
   a Botswana admin with no bypass cookie can still open the panel, see "no
   bypass active" and revoke a lost device. The bypass cookie is reported, not
   required.

   PRIVACY: ip_hash, ua_hash and fp_hash are never selected, so this panel cannot
   become a second copy of the identifiers denial_log deliberately only stores as
   hashes. The device hash is returned because it is already inside the
   operator's own cookie and is how they recognise "this browser".
   ============================================================ */
import { json, now } from './../_shared.js';
import { requireAdmin } from './../_customer.js';
import { adminGate, readEpoch, deviceId } from './../_security.js';
import { gateMode } from './../../_middleware.js';

var MAX_DAYS = 90;
var DEFAULT_DAYS = 7;
var DEVICE_LIMIT = 50;
var RECENT_LIMIT = 50;

/** ?days= is clamped, not trusted: 1..90, anything unusable is a week. */
export function clampDays(raw) {
  var n = parseInt(raw, 10);
  if (!n || n < 1) n = DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}

export function deviceOut(r, currentDevice) {
  var dev = String(r.device_hash || '');
  return {
    id: String(r.id || ''),
    user: String(r.user_ref || ''),
    device: dev,
    current: !!dev && dev === currentDevice,
    label: r.label || null,
    createdAt: Number(r.created_at || 0),
    lastSeenAt: r.last_seen_at ? Number(r.last_seen_at) : null,
    country: r.last_country || null,
    asn: r.last_asn ? Number(r.last_asn) : null,
    revokedAt: r.revoked_at ? Number(r.revoked_at) : null
  };
}

export function denialOut(r) {
  return {
    at: Number(r.at || 0),
    stage: Number(r.stage || 0),
    rule: String(r.rule || ''),
    country: r.country || null,
    asn: r.asn ? Number(r.asn) : null,
    path: String(r.path || '').slice(0, 300),
    confidence: Number(r.confidence || 0)
  };
}

function warn(list, name) {
  if (list.indexOf(name) < 0) list.push(name);
}

/**
 * Everything the panel shows. Exported so the suite can call it directly with a
 * fake DB instead of standing up a signed-in session.
 *
 * A missing table is a warning, never a 500: before migration 0018 is applied
 * the panel still has to render (it is the screen the operator uses to check
 * whether the migration landed).
 */
export async function accessOverview(env, request, opts) {
  var days = clampDays(opts && opts.days);
  var since = now() - days * 86400000;

  var gate = await adminGate(env, request);
  var admin = (gate && gate.ok && gate.admin) || {};
  var current = await deviceId((request && request.headers.get('User-Agent')) || '');

  var out = {
    ok: true,
    gate: gateMode(env),
    epoch: await readEpoch(env),
    windowDays: days,
    bypass: {
      active: !!(gate && gate.ok),
      user: String(admin.usr || (env && env.ADMIN_USERNAME) || ''),
      expires: Number(admin.exp || 0) * 1000,
      device: String(admin.dev || ''),
      current: current
    },
    devices: [],
    denied: { total: 0, byRule: [], recent: [] },
    warnings: []
  };

  var db = env && env.DB;
  if (!db) { warn(out.warnings, 'backend_not_configured'); return out; }

  try {
    var devRes = await db.prepare(
      'SELECT id, user_ref, device_hash, label, created_at, last_seen_at, last_country, last_asn, revoked_at ' +
      'FROM admin_devices ORDER BY COALESCE(last_seen_at, created_at) DESC LIMIT ?'
    ).bind(DEVICE_LIMIT).all();
    out.devices = (devRes.results || []).map(function (r) { return deviceOut(r, current); });
  } catch (e) { warn(out.warnings, 'admin_devices_unavailable'); }

  try {
    var ruleRes = await db.prepare(
      'SELECT rule, stage, country, COUNT(*) AS n, MAX(at) AS last FROM denial_log ' +
      'WHERE at >= ? GROUP BY rule, stage, country ORDER BY n DESC LIMIT ?'
    ).bind(since, RECENT_LIMIT).all();
    out.denied.byRule = (ruleRes.results || []).map(function (r) {
      return {
        rule: String(r.rule || ''),
        stage: Number(r.stage || 0),
        country: r.country || null,
        count: Number(r.n || 0),
        last: Number(r.last || 0)
      };
    });
  } catch (e) { warn(out.warnings, 'denial_log_unavailable'); }

  try {
    var recentRes = await db.prepare(
      'SELECT at, stage, rule, country, asn, path, confidence FROM denial_log ' +
      'WHERE at >= ? ORDER BY at DESC LIMIT ?'
    ).bind(since, RECENT_LIMIT).all();
    out.denied.recent = (recentRes.results || []).map(denialOut);
  } catch (e) { warn(out.warnings, 'denial_log_unavailable'); }

  out.denied.total = out.denied.byRule.reduce(function (n, r) { return n + r.count; }, 0);
  return out;
}

export async function onRequestGet(context) {
  var c = await requireAdmin(context);
  if (c.error) return c.error;

  var url = new URL(context.request.url);
  return json(await accessOverview(context.env, context.request, {
    days: url.searchParams.get('days')
  }));
}

export async function onRequestPost() {
  return json({ ok: false, error: 'Method not allowed.' }, 405);
}
