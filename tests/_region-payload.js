/* ================================================================
   Region payload for the jsdom harnesses.

   index.html / search_screen.html / venue-about.html pull the active
   region's directory payload in with document.write() (see
   js/eatouts-region-data.js) so a Botswana visitor never downloads the
   Zimbabwe file and vice versa. jsdom never fetches document.write()
   scripts, so each harness that boots a page inlines the payload itself
   and the page behaves exactly as it does in a browser.
   ================================================================ */
'use strict';

const fs = require('fs');
const path = require('path');

const APP_DIR = path.resolve(__dirname, '..');

const PAYLOADS = {
  BW: 'data/restaurant_listings/directory_runtime_data.js',
  ZW: 'data/restaurant_listings/zimbabwe_runtime_data.js',
  KE: 'data/restaurant_listings/kenya_runtime_data.js',
  MU: 'data/restaurant_listings/mauritius_runtime_data.js',
  ZA: 'data/restaurant_listings/southafrica_runtime_data.js'
};

/**
 * Add the region's payload to a page's HTML, before any app script runs.
 * @param {string} html the page markup, script tags already inlined
 * @param {string} [region] "BW" (the default every suite runs as), "ZW", "KE",
 *   "MU" or "ZA"
 * @returns {string} html with the payload inlined
 */
function withRegionPayload(html, region) {
  const rel = PAYLOADS[String(region || 'BW').toUpperCase()] || PAYLOADS.BW;
  const source = fs.readFileSync(path.join(APP_DIR, rel.split('/').join(path.sep)), 'utf8');
  const tag = '<script>' + source + '</script>';

  if (/<head(\s[^>]*)?>/i.test(html)) {
    return html.replace(/<head(\s[^>]*)?>/i, (m) => m + tag);
  }
  return tag + html;
}

module.exports = withRegionPayload;
module.exports.PAYLOADS = PAYLOADS;
