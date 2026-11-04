/* /bw/<slug> - the implementation lives in functions/api/_vanity.js.
   Cloudflare Pages routes on the filesystem, so each live region is a
   directory with this one-line re-export. Add functions/<cc>/[[path]].js when
   that region's listings exist; until then the URL simply 404s. */
export { onRequest } from '../api/_vanity.js';
