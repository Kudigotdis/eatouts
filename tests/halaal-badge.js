#!/usr/bin/env node
/* ============================================================
   Halaal badge.

   The mark is the Botswana Halaal Authority's icon, so:
     - it must point at the .png that actually ships (the .jpg never existed,
       which is why the badge rendered as a broken image)
     - it is printed bare: no circular container, no border, no shadow
     - it is 48x48 on venue-about (.halaal-badge-status)
     - only Botswana venues carry it, even when a ZW/KE/MU/ZA record
       happens to share a certified brand slug (kfc-, nando-, ...)
   ============================================================ */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

function read(file) {
  return fs.readFileSync(path.join(APP_DIR, file), 'utf8');
}

/* A page that only carries the region registry + the brand module. */
function brandPage(region) {
  const warnings = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => warnings.push(String((e && e.message) || '')));
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
    url: 'https://example.test/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  const w = dom.window;
  try { w.localStorage.setItem('eatouts.region.v1', region); } catch (e) {}
  w.eval(read('js/eatouts-regions.js'));
  w.eval(read('js/eatouts-brand.js'));
  const style = w.document.getElementById('eatouts-brand-css');
  return { w, B: w.EatoutsBrand, warnings, css: (style && style.textContent) || '' };
}

/* ---------------- Botswana ---------------- */

const bw = brandPage('BW');
const B = bw.B;

check('brand module loaded', !!B);
check('Botswana is the active region', bw.w.EatoutsRegions.code() === 'BW', bw.w.EatoutsRegions.code());
check('the badge uses the .png that ships',
  B.HALAAL_LOGO === 'assets/halaal-logos/Botswana_Halaal_Logo.png', B.HALAAL_LOGO);
check('the .png exists on disk',
  fs.existsSync(path.join(APP_DIR, 'assets', 'halaal-logos', 'Botswana_Halaal_Logo.png')));

check('BW: kfc-maun is halaal', B.isHalaalVenue('kfc-maun') === true);
check('BW: nando-s-phakalane is halaal', B.isHalaalVenue('nando-s-phakalane') === true);
check('BW: a non-certified business is not', B.isHalaalVenue('boifys-catering-services') === false);
check('BW: a BW record keeps the badge', B.isHalaalVenue({ slug: 'kfc-maun', region: 'BW' }) === true);
check('BW: a ZW record loses the badge', B.isHalaalVenue({ slug: 'kfc-maun', region: 'ZW' }) === false);

const markup = B.halaalBadgeHtml({ className: 'halaal-badge-status' });
check('badge markup points at the .png', markup.indexOf('Botswana_Halaal_Logo.png') !== -1, markup);
check('badge markup keeps the class hook', markup.indexOf('halaal-badge-status') !== -1, markup);

/* ---------------- another region ---------------- */

const zw = brandPage('ZW');
check('Zimbabwe is the active region', zw.w.EatoutsRegions.code() === 'ZW', zw.w.EatoutsRegions.code());
check('ZW: a certified-brand slug gets no Botswana badge', zw.B.isHalaalVenue('kfc-maun') === false);
check('ZW: a BW-branded record still gets none', zw.B.isHalaalVenue({ slug: 'kfc-maun', region: 'BW' }) === false);
check('ZW: badge markup is unchanged (same single source)', zw.B.halaalBadgeHtml({}).indexOf('.png') !== -1);

/* ---------------- the CSS contract ---------------- */

const css = bw.css;
const rule = (selector) => {
  const at = css.indexOf(selector + '{');
  if (at === -1) return '';
  const end = css.indexOf('}', at);
  return css.slice(at, end === -1 ? css.length : end + 1);
};
const badgeRule = rule('.halaal-badge');
const imgRule = rule('.halaal-badge img');
const statusRule = rule('.halaal-badge-status');

check('.halaal-badge rule exists', badgeRule.length > 0);
check('no circular container', badgeRule.indexOf('border-radius:50%') === -1, badgeRule);
check('no white plate behind the icon', badgeRule.indexOf('background:#fff') === -1, badgeRule);
check('no border', /border:0|border:none/.test(badgeRule), badgeRule);
check('no shadow', /box-shadow:none/.test(badgeRule), badgeRule);
check('the img is not rounded', imgRule.indexOf('border-radius:0') !== -1, imgRule);
check('venue-about badge is 48x48',
  /width:48px/.test(statusRule) && /height:48px/.test(statusRule), statusRule);

/* ---------------- the pages that print the badge ---------------- */

const index = read('index.html');
check('index.html popup logo is not a circle',
  /\.card-alert-logo\.halaal\{[^}]*border:0/.test(index) &&
  !/\.card-alert-logo\.halaal\{[^}]*border-radius:50%/.test(index));
check('index.html popup falls back to the .png',
  index.indexOf('Botswana_Halaal_Logo.png') !== -1 &&
  index.indexOf('Botswana_Halaal_Logo.jpg') === -1);

const venueAbout = read('venue-about.html');
const popRule = (venueAbout.match(/\.halaal-pop-logo\{[\s\S]*?\}/) || [''])[0];
check('venue-about popup logo is not a circle',
  popRule.length > 0 && popRule.indexOf('border-radius:50%') === -1 &&
  popRule.indexOf('border:1px') === -1 && popRule.indexOf('padding:0') !== -1,
  popRule);
check('venue-about falls back to the .png',
  venueAbout.indexOf('Botswana_Halaal_Logo.png') !== -1 &&
  venueAbout.indexOf('Botswana_Halaal_Logo.jpg') === -1);

check('no page still references the missing .jpg',
  ['index.html', 'venue-about.html', 'search_screen.html', 'js/eatouts-brand.js']
    .every(f => read(f).indexOf('Botswana_Halaal_Logo.jpg') === -1));

check('no runtime errors', bw.warnings.length === 0 && zw.warnings.length === 0,
  bw.warnings.concat(zw.warnings).join(' | '));

console.log('');
console.log(fails === 0 ? 'HALAAL BADGE TEST PASSED' : 'HALAAL BADGE TEST FAILED (' + fails + ')');
process.exit(fails === 0 ? 0 : 1);
