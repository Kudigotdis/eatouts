/* POST /api/auth/logout -> clears the session cookie + KV entry. */
import { destroySession, jsonWithCookie } from '../_shared.js';

export async function onRequestPost(context) {
  var cookie = await destroySession(context.env, context.request);
  return jsonWithCookie({ ok: true }, cookie);
}