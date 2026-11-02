#!/usr/bin/env node
/**
 * Venue About — "About" button + white info card inside the logo overlay.
 *
 * The overlay (#logoOverlay) stacks the enlarged logo, #aboutBtn and the
 * <details id="settingsAcc"> accordion. Tapping About pushes the logo up
 * (logo-overlay.about-open) and reveals #aboutPanel — a white card whose copy
 * comes from assets/data/venue_about_info.js, falling back to the
 * directory/branch record for venues without curated text.
 *
 * The card is copy-only by design: .about-eyebrow, .about-title and .about-p.
 * Contact facts (numbers, website, socials) live in the social row, and hours
 * stay in the Operating Hours accordion, so nothing is duplicated in the card.
 *
 * Covered here:
 *   - button sits above Settings in DOM order and toggles aria-expanded
 *   - the panel really is white and carries only copy blocks
 *   - curated phone / website / socials drive the social-row icons
 *   - Zorz resolves through the overlay entry (?link=zors AND ?link=zorz)
 *   - a venue with no curated entry (KFC) still renders a sane card
 *   - every venue kind (bakery, bottle store, catering) renders without error
 *   - Escape / backdrop / Settings close the card back down
 *
 * CommonJS on purpose — tests/package.json pins this folder to CommonJS.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

let fails = 0;
function check(label, cond, extra) {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
}

function loadPage(slug) {
  let html = fs.readFileSync(path.join(APP_DIR, 'venue-about.html'), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
    const f = path.join(APP_DIR, src.split('?')[0].replace(/\//g, path.sep));
    if (!fs.existsSync(f)) return '<!-- missing ' + src + ' -->';
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const errors = [];
  const navs = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => {
    const m = String((e && e.message) || '');
    if (/Not implemented: navigation/.test(m)) { navs.push(m); return; }
    errors.push('jsdomError: ' + (e.stack || e.message));
  });
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, {
    url: 'http://localhost/venue-about.html?link=' + encodeURIComponent(slug),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  });
  return { dom, doc: dom.window.document, window: dom.window, errors, navs };
}

function click(el) {
  if (!el) return;
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/* Is `b` after `a` in document order? */
function after(a, b) {
  return !!(a && b && (a.compareDocumentPosition(b) & 4));
}

function text(el) { return (el && el.textContent) || ''; }

/* Open the overlay and expand the About card; returns the card body. */
function openAbout(doc) {
  click(doc.getElementById('logoBtn'));
  click(doc.getElementById('aboutBtn'));
  return doc.getElementById('aboutPanelBody');
}

/* Classes of the white card's direct children, in document order. */
function cardClasses(doc) {
  const body = doc.getElementById('aboutPanelBody');
  return Array.prototype.slice.call(body.children).map(el => el.className);
}
/* The only blocks the card is allowed to hold. */
function copyOnly(cls) { return /^about-(eyebrow|title|p)$/.test(cls); }

/* ---------- Ocean Basket: placement, toggle, curated copy ---------- */
(function () {
  const { dom, doc, window: w, errors, navs } = loadPage('ocean-basket');
  const q = s => doc.querySelector(s);

  check('OB: page resolved, no redirect', navs.length === 0 && /Ocean Basket/i.test(text(q('.hero h1'))), text(q('.hero h1')));

  const btn = q('#aboutBtn');
  const acc = q('#settingsAcc');
  check('OB: About button exists', !!btn);
  check('OB: About sits ABOVE Settings in DOM order', after(btn, acc));
  check('OB: About button starts collapsed', btn.getAttribute('aria-expanded') === 'false' && !q('#logoOverlay.about-open'));
  check('OB: button is wired to the panel', btn.getAttribute('aria-controls') === 'aboutPanel' && !!q('#aboutPanel'));
  check('OB: button label is just "About"', text(btn).trim() === 'About', text(btn));
  check('OB: button has no caret and no sub-label',
    !q('#aboutBtn .about-caret') && !q('#aboutBtn small'));

  /* The About button and the Settings summary are stacked look-alikes, so they
     must compute to the same type: family, size, weight and line-height. */
  const aboutFont = w.getComputedStyle(btn);
  const setFont = w.getComputedStyle(acc.querySelector('summary'));
  const fontOf = s => [s.fontFamily, s.fontSize, s.fontWeight, s.lineHeight].join(' ');
  check('OB: About button and Settings summary share the same font',
    fontOf(aboutFont) === fontOf(setFont),
    'about[' + fontOf(aboutFont) + '] vs settings[' + fontOf(setFont) + ']');

  click(q('#logoBtn'));
  check('OB: tapping the logo opens the overlay', !!q('#logoOverlay.open'));

  const body = openAbout(doc);
  check('OB: About expands the overlay (logo pushed up)', !!q('#logoOverlay.about-open'));
  check('OB: aria-expanded flips to true', btn.getAttribute('aria-expanded') === 'true');
  check('OB: panel background is white',
    String(w.getComputedStyle(q('#aboutPanel')).backgroundColor).replace(/\s/g, '') === 'rgb(255,255,255)',
    w.getComputedStyle(q('#aboutPanel')).backgroundColor);
  check('OB: panel is inside the logo overlay', !!(q('#logoOverlay') && q('#logoOverlay').contains(q('#aboutPanel'))));

  check('OB: title renders', /Ocean Basket/.test(text(q('#aboutPanelBody .about-title'))), text(q('#aboutPanelBody .about-title')));
  check('OB: curated paragraphs render',
    doc.querySelectorAll('#aboutPanelBody .about-p').length >= 4,
    doc.querySelectorAll('#aboutPanelBody .about-p').length);
  const classes = cardClasses(doc);
  check('OB: card holds only eyebrow / title / paragraph blocks',
    classes.length >= 3 && classes.every(copyOnly), classes.join(' | '));
  check('OB: Settings is hidden while the card is open',
    w.getComputedStyle(acc).display === 'none', w.getComputedStyle(acc).display);
  check('OB: tagline and fact rows are gone from the card',
    !q('#aboutPanelBody .about-tagline') && !q('#aboutPanelBody .about-facts') &&
    !q('#aboutPanelBody .about-k') && !q('#aboutPanelBody .about-v'),
    text(body));
  check('OB: curated phone lights the Call icon',
    !!q('.social-row a[aria-label="Call"]'));
  check('OB: Operating Hours accordion is still on the page',
    doc.querySelectorAll('.acc-hours .hours__row').length > 0,
    doc.querySelectorAll('.acc-hours .hours__row').length);
  check('OB: nothing renders as "undefined"', !/undefined|null/.test(text(body)));

  click(btn);
  check('OB: second tap folds the card away', !q('#logoOverlay.about-open') && btn.getAttribute('aria-expanded') === 'false');
  check('OB: Settings returns once the card folds away',
    w.getComputedStyle(acc).display !== 'none', w.getComputedStyle(acc).display);
  check('OB: overlay itself stays open', !!q('#logoOverlay.open'));

  openAbout(doc);
  click(q('#logoOverlayClose'));
  check('OB: close button closes the overlay and the card',
    !q('#logoOverlay.open') && !q('#logoOverlay.about-open') && btn.getAttribute('aria-expanded') === 'false');

  openAbout(doc);
  doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('OB: Escape closes the overlay and the card',
    !q('#logoOverlay.open') && !q('#logoOverlay.about-open') && btn.getAttribute('aria-expanded') === 'false');

  openAbout(doc);
  click(q('#logoOverlay'));
  check('OB: backdrop tap closes both', !q('#logoOverlay.open') && !q('#logoOverlay.about-open'));

  openAbout(doc);
  acc.open = true;
  acc.dispatchEvent(new w.Event('toggle', { bubbles: false }));
  check('OB: opening Settings folds the About card away',
    !q('#logoOverlay.about-open') && btn.getAttribute('aria-expanded') === 'false' && !!q('#logoOverlay.open'));

  check('OB: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
})();

/* ---------- Bukhara: two phones, email, website, hours ---------- */
(function () {
  const { dom, doc, errors, navs } = loadPage('bukhara');
  const q = s => doc.querySelector(s);

  check('BK: page resolved, no redirect', navs.length === 0 && /Bukhara/i.test(text(q('.hero h1'))), text(q('.hero h1')));

  openAbout(doc);
  check('BK: title renders', /Bukhara/.test(text(q('#aboutPanelBody .about-title'))), text(q('#aboutPanelBody .about-title')));
  check('BK: cuisine eyebrow renders',
    /Grills/.test(text(q('#aboutPanelBody .about-eyebrow'))), text(q('#aboutPanelBody .about-eyebrow')));
  check('BK: card holds only eyebrow / title / paragraph blocks',
    cardClasses(doc).every(copyOnly), cardClasses(doc).join(' | '));
  check('BK: address and phone no longer sit in the card',
    !/Shop No\. 44|\+267 396 0630/.test(text(q('#aboutPanelBody'))), text(q('#aboutPanelBody')));
  const web = q('.social-row a[aria-label="Website"]');
  check('BK: curated website drives the Website icon',
    !!web && /^https:\/\/bukharacafe\.com/.test(web.getAttribute('href')) && web.getAttribute('rel') === 'noopener',
    web && web.getAttribute('href'));
  const callIco = q('.social-row a[aria-label="Call"]');
  check('BK: curated phones light the Call icon',
    !!callIco && /^tel:/.test(callIco.getAttribute('href')), callIco && callIco.getAttribute('href'));
  check('BK: curated instagram / facebook light their icons',
    !!q('.social-row a[aria-label="Instagram"]') && !!q('.social-row a[aria-label="Facebook"]'));
  check('BK: no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
})();

/* ---------- Zorz: overlay-only identity (no directory record) ---------- */
function checkZorz(slug, label) {
  const { dom, doc, errors, navs } = loadPage(slug);
  const q = s => doc.querySelector(s);

  check(label + ': resolves without a directory record', navs.length === 0, navs[0]);
  check(label + ': hero shows the venue name',
    /Zorz Luxury Chisanyama/i.test(text(q('.hero h1'))), text(q('.hero h1')));
  check(label + ': logo art is the ZORZ asset',
    /ZORZ_logo\.webp/i.test(String(q('#logoImg') && q('#logoImg').src)), q('#logoImg') && q('#logoImg').src);

  openAbout(doc);
  check(label + ': card title renders',
    /Zorz Luxury Chisanyama/i.test(text(q('#aboutPanelBody .about-title'))), text(q('#aboutPanelBody .about-title')));
  check(label + ': curated about copy renders',
    doc.querySelectorAll('#aboutPanelBody .about-p').length >= 3,
    doc.querySelectorAll('#aboutPanelBody .about-p').length);
  check(label + ': card holds only eyebrow / title / paragraph blocks',
    cardClasses(doc).every(copyOnly), cardClasses(doc).join(' | '));
  check(label + ': phone and email are not in the card',
    !/\+267 77 853 309|info@zorz\.co\.bw/.test(text(q('#aboutPanelBody'))));
  check(label + ': no hours row is invented in the card',
    !doc.querySelector('#aboutPanelBody .about-k'));
  check(label + ': no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
}
checkZorz('zors', 'ZORZ(?link=zors)');
checkZorz('zorz', 'ZORZ(?link=zorz alias)');

/* ---------- Venues with no curated entry: the card still has to work ---------- */
function checkFallback(slug, label, expectedName) {
  const { dom, doc, errors, navs } = loadPage(slug);
  const q = s => doc.querySelector(s);

  check(label + ': page resolved, no redirect', navs.length === 0, navs[0]);
  openAbout(doc);
  const title = text(q('#aboutPanelBody .about-title'));
  check(label + ': card renders a title', !!title && (expectedName ? new RegExp(expectedName, 'i').test(title) : true), title);
  check(label + ': at least one paragraph renders',
    doc.querySelectorAll('#aboutPanelBody .about-p').length >= 1,
    doc.querySelectorAll('#aboutPanelBody .about-p').length);
  check(label + ': kind eyebrow falls back to the venue type',
    !!text(q('#aboutPanelBody .about-eyebrow')), text(q('#aboutPanelBody .about-eyebrow')));
  check(label + ': card is copy-only',
    cardClasses(doc).every(copyOnly), cardClasses(doc).join(' | '));
  check(label + ': never prints "undefined"',
    !/undefined|null/.test(text(q('#aboutPanelBody'))));
  check(label + ': no runtime errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  dom.window.close();
}
checkFallback('kfc', 'KFC (no curated entry)', 'KFC');
checkFallback('bakery-3', 'Bakery (Bakeology)', 'Bakeology');
checkFallback('alcool', 'Bottle store (Alcool)');
checkFallback('boifyscateringservices', 'Catering (Boifys)');
/* Branch slugs are store/branch ids, not brand keys. They must still resolve
   so a shared venue-about.html?link=<branch> deep link does not bounce home. */
checkFallback('liquorama-gaborone', 'Bottle store branch (Liquorama Gaborone)', 'Liquorama');
checkFallback('fedics-food-service-gaborone', 'Catering branch (Fedics Gaborone)', 'Fedics');

console.log('');
if (fails) {
  console.log('VENUE ABOUT PANEL TEST FAILED (' + fails + ' checks)');
  process.exit(1);
}
console.log('VENUE ABOUT PANEL TEST PASSED');
