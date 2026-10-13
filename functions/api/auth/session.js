/* GET /api/auth/session
   Alias of GET /api/me for clients that expect an explicit session route.
   Returns the active user profile, avatar (photoKey), and onboarding status,
   or { user: null } when there is no session. */
export { onRequestGet } from './../me.js';
