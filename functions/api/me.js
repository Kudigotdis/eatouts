/* GET  /api/me     -> the signed-in user, or { user: null }
   POST /api/me     -> alias of logout is NOT here; use /api/auth/logout */
import { json, getSession } from './_shared.js';

export async function onRequestGet(context) {
  var session = await getSession(context.env, context.request);
  if (!session) return json({ user: null });
  return json({
    user: {
      id: session.userId,
      email: session.email,
      name: session.name,
      isAdmin: !!session.isAdmin
    }
  });
}