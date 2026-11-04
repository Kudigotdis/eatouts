/* /zw/<slug> - Zimbabwe's namespace. Same implementation as /bw/<slug>
   (functions/api/_vanity.js); the country comes from the URL, so this file
   needs no logic of its own. It 404s until ZW listings exist, and can never
   fall back to a Botswana link. */
export { onRequest } from '../api/_vanity.js';