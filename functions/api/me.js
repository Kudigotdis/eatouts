/* GET   /api/me  -> the signed-in user, or { user: null }
   PATCH /api/me  -> update the customer profile (name, town, photo, notify)
   POST  /api/me  -> alias of PATCH */
import { json, getSession, now, readJson } from './_shared.js';
import { publicUser } from './_auth.js';

export async function onRequestGet(context) {
  var session = await getSession(context.env, context.request);
  if (!session) return json({ user: null });

  var env = context.env;
  if (env && env.DB && session.type === 'customer') {
    try {
      var row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
      if (row) return json({ user: publicUser(row) });
    } catch (e) { /* fall through to session payload */ }
  }

  return json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      isAdmin: !!session.isAdmin,
      username: session.username || null,
      whatsapp: session.whatsapp || null,
      type: session.type || 'user',
      verified: !!session.verified
    }
  });
}

var PROFILE_FIELDS = ['firstName', 'surname', 'dob', 'gender', 'town', 'area',
  'contacts', 'favRestaurants', 'favBottleStore', 'notify', 'bio'];

async function updateProfile(context) {
  var session = await getSession(context.env, context.request);
  if (!session) return json({ ok: false, error: 'not_authenticated' }, 401);

  var env = context.env;
  if (!env.DB) return json({ ok: false, error: 'backend_not_configured' }, 503);

  var body = await readJson(context.request);
  var row = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(session.userId).first();
  if (!row) return json({ ok: false, error: 'not_found' }, 404);

  var profile = {};
  try { profile = row.profile ? JSON.parse(row.profile) : {}; } catch (e) { profile = {}; }

  var patch = body.profile || body;
  PROFILE_FIELDS.forEach(function (f) {
    if (patch[f] !== undefined) profile[f] = patch[f];
  });

  var name = row.name;
  if (patch.firstName !== undefined || patch.surname !== undefined) {
    var fn = patch.firstName !== undefined ? patch.firstName : (profile.firstName || '');
    var sn = patch.surname !== undefined ? patch.surname : (profile.surname || '');
    profile.firstName = fn; profile.surname = sn;
    name = String(fn + ' ' + sn).trim() || row.name;
  }

  var photo = (body.photoKey !== undefined) ? body.photoKey : row.photo_key;

  try {
    await env.DB.prepare(
      'UPDATE users SET profile = ?, name = ?, photo_key = ?, updated_at = ? WHERE id = ?'
    ).bind(JSON.stringify(profile), name, photo, now(), row.id).run();
  } catch (e) {
    return json({ ok: false, error: 'update_failed' }, 500);
  }

  row.profile = JSON.stringify(profile);
  row.name = name;
  row.photo_key = photo;
  return json({ ok: true, user: publicUser(row) });
}

export { updateProfile as onRequestPatch };
export { updateProfile as onRequestPost };
