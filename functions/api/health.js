/* GET /api/health — quick status of the API and its bindings. */
import { json } from './_shared.js';

export function onRequestGet(context) {
  var env = context.env || {};
  return json({
    ok: true,
    env: env.ENV || 'unknown',
    bindings: {
      db: !!env.DB,
      kv: !!env.OPS_KV,
      storage: !!(env.SUPABASE_URL && env.SUPABASE_KEY)
    },
    storage: {
      provider: 'supabase',
      bucket: env.SUPABASE_BUCKET || 'eatouts-media'
    },
    time: new Date().toISOString()
  });
}