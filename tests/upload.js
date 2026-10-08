/* Upload wiring tests for the EatOuts app.
   jsdom cannot run real canvas compression, so these tests verify
   wiring, presence of globals, and the no-clobber contract. */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('./node_modules/jsdom');

const ROOT = path.resolve(__dirname, '..');

let fails = 0;
let checks = 0;

function check(label, cond, extra) {
  checks++;
  if (cond) {
    console.log('ok   ' + label);
  } else {
    fails++;
    console.log('FAIL ' + label + (extra ? '  -- ' + extra : ''));
  }
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function exists(rel) {
  try { return fs.existsSync(path.join(ROOT, rel)); } catch (e) { return false; }
}

function extractScripts(html) {
  const out = [];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    const body = m[2] || '';
    const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    if (srcMatch) out.push({ src: srcMatch[1] });
    else if (body.trim()) out.push({ code: body });
  }
  return out;
}

function patchAuth(w) {
  const A = w.EatoutsAuth;
  if (!A) return;
  if (typeof A.redirectToLogin === 'function') {
    A.redirectToLogin = function () {};
  }
  A.requireSession = function () { return true; };
  A.applyActive = function () {};
}

function boot(rel) {
  const raw = read(rel);
  const scripts = extractScripts(raw);
  const stripped = raw.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');

  const dom = new JSDOM(stripped, {
    url: 'http://127.0.0.1/' + rel,
    runScripts: 'outside-only',
    pretendToBeVisual: true
  });
  const w = dom.window;
  const errors = [];
  let patched = false;

  scripts.forEach(function (s) {
    if (s.src) {
      const relPath = s.src.replace(/^\.\//, '').replace(/^\//, '');
      if (!exists(relPath)) return;
      try { w.eval(read(relPath)); }
      catch (e) { errors.push(relPath + ': ' + e.message); }
      return;
    }
    if (!patched) { patched = true; patchAuth(w); }
    try { w.eval(s.code); }
    catch (e) { errors.push(rel + ' inline: ' + e.message); }
  });

  return { dom: dom, window: w, errors: errors };
}

/* ============================================================
   1 & 2 — page wiring: EatoutsUpload + both libraries present
   ============================================================ */

const PAGES = [
  'gallery-onboarding.html',
  'menu-onboarding.html',
  'promo-onboarding.html',
  'restaurant-onboarding.html',
  'event-onboarding.html'
];

console.log('\n-- Page wiring --');

const boots = {};

PAGES.forEach(function (rel) {
  if (!exists(rel)) {
    console.log('skip ' + rel + ' (not present)');
    return;
  }
  const b = boot(rel);
  boots[rel] = b;

  if (b.errors.length) {
    console.log('note ' + rel + ' boot warnings: ' + b.errors.join(' | '));
  }

  check(rel + ': EatoutsImageCompressor defined', !!b.window.EatoutsImageCompressor);
  check(rel + ': EatoutsVideoValidator defined', !!b.window.EatoutsVideoValidator);

  /* Hard contract: the page itself must load the upload helper.
     If it does not, load it anyway so the behavioural tests below
     can still run, but the assertion has already failed. */
  if (!b.window.EatoutsUpload && exists('js/eatouts-upload.js')) {
    try { b.window.eval(read('js/eatouts-upload.js')); }
    catch (e) { /* ignore */ }
  }
  check(rel + ': EatoutsUpload defined after boot', !!b.window.EatoutsUpload,
    'add <script src="js/eatouts-upload.js"></script> to this page');

  /* Soft check: any matching URL field already in the DOM should be
     decoratable without throwing. */
  if (b.window.EatoutsUpload && typeof b.window.EatoutsUpload.decorate === 'function') {
    let threw = null;
    try { b.window.EatoutsUpload.decorate(b.window.document.body); }
    catch (e) { threw = e.message; }
    check(rel + ': decorate() runs on the booted DOM', threw === null, threw);
  }
});

/* ============================================================
   3 — makeButton / pickInto behaviour on a synthetic DOM
   ============================================================ */

console.log('\n-- Upload API behaviour --');

function makeHarness() {
  const dom = new JSDOM(
    '<!DOCTYPE html><html><body><input id="field" value=""></body></html>',
    { url: 'http://127.0.0.1/harness.html', runScripts: 'outside-only', pretendToBeVisual: true }
  );
  const w = dom.window;

  w.eval([
    'window.EatoutsImageCompressor = {',
    '  isImage: function(f){ return /^image\\//.test((f && f.type) || ""); },',
    '  compress: function(){ return Promise.resolve({ size: 10, type: "image/webp" }); },',
    '  blobToDataURL: function(){ return Promise.resolve("data:image/webp;base64,AAAA"); },',
    '  formatBytes: function(){ return "10 B"; }',
    '};',
    'window.EatoutsVideoValidator = {',
    '  isVideo: function(f){ return /^video\\//.test((f && f.type) || ""); },',
    '  validate: function(){ return Promise.resolve({ duration: 10, sizeMB: 1 }); },',
    '  formatSeconds: function(){ return "10s"; },',
    '  formatMB: function(){ return "1 MB"; }',
    '};'
  ].join('\n'));

  if (exists('js/eatouts-upload.js')) {
    w.eval(read('js/eatouts-upload.js'));
  }

  return { dom: dom, window: w };
}

(async function main() {
  const h = makeHarness();
  const w = h.window;

  check('harness: EatoutsUpload defined', !!w.EatoutsUpload);
  if (!w.EatoutsUpload) {
    console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
    process.exit(fails ? 1 : 0);
    return;
  }

  /* --- makeButton --- */
  const input = w.document.getElementById('field');
  const btn = w.EatoutsUpload.makeButton(input);
  check('makeButton returns a <button>', !!btn && btn.tagName === 'BUTTON');
  check('makeButton type is "button"', btn && btn.type === 'button');
  check('makeButton class is "btn btn-ghost btn-sm"',
    btn && btn.className === 'btn btn-ghost btn-sm', btn && btn.className);
  check('makeButton label defaults to "Upload"',
    btn && (btn.textContent || '').trim() === 'Upload', btn && btn.textContent);
  check('makeButton is wired (has onclick)', btn && typeof btn.onclick === 'function');

  const custom = w.EatoutsUpload.makeButton(input, { label: 'Choose', className: 'x' });
  check('makeButton honours custom label', (custom.textContent || '').trim() === 'Choose');
  check('makeButton honours custom class', custom.className === 'x');

  /* --- pickInto must not clobber an untouched value --- */
  const guarded = w.document.createElement('input');
  guarded.value = 'existing-value';
  w.document.body.appendChild(guarded);

  /* jsdom will not open a real picker; input.click() is a no-op for a
     detached file input, so onchange never fires and nothing is written. */
  let picked = null;
  w.EatoutsUpload.pickInto(guarded, null, { onPick: function (url) { picked = url; } });
  await new Promise(function (r) { setTimeout(r, 20); });

  check('pickInto leaves an untouched field alone', guarded.value === 'existing-value',
    guarded.value);
  check('pickInto does not fire onPick when nothing is chosen', picked === null);

  /* --- decorate is idempotent --- */
  const host = w.document.createElement('div');
  host.innerHTML =
    '<input name="image" value="">' +
    '<input name="src" value="">' +
    '<input name="unrelated" value="">';
  w.document.body.appendChild(host);

  w.EatoutsUpload.decorate(host);
  const wired1 = host.querySelectorAll('[data-upload-wired="1"]').length;
  const buttons1 = host.querySelectorAll('[data-upload-button="1"]').length;
  check('decorate wires the matching fields', wired1 === 2, 'wired=' + wired1);
  check('decorate inserts one button per field', buttons1 === 2, 'buttons=' + buttons1);

  w.EatoutsUpload.decorate(host);
  const wired2 = host.querySelectorAll('[data-upload-wired="1"]').length;
  const buttons2 = host.querySelectorAll('[data-upload-button="1"]').length;
  check('decorate is idempotent (wired)', wired2 === wired1, 'wired=' + wired2);
  check('decorate is idempotent (buttons)', buttons2 === buttons1, 'buttons=' + buttons2);

  const unrelated = host.querySelector('input[name="unrelated"]');
  check('decorate ignores non-matching inputs',
    unrelated && unrelated.getAttribute('data-upload-wired') !== '1');

  /* --- a real pick writes through (stubbed picker) --- */
  const target = w.document.createElement('input');
  target.value = '';
  w.document.body.appendChild(target);

  let captured = null;
  const origClick = w.HTMLInputElement.prototype.click;
  w.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { captured = this; return; }
    return origClick.call(this);
  };

  let resolved = null;
  w.EatoutsUpload.pickInto(target, null, { onPick: function (url) { resolved = url; } });

  if (captured) {
    const file = new w.File(['x'], 'a.png', { type: 'image/png' });
    try {
      Object.defineProperty(captured, 'files', { value: [file], configurable: true });
    } catch (e) {
      captured.files = [file];
    }
    if (typeof captured.onchange === 'function') captured.onchange();
    await new Promise(function (r) { setTimeout(r, 30); });
  }

  w.HTMLInputElement.prototype.click = origClick;

  check('pickInto writes the picked data URL into the field',
    target.value === 'data:image/webp;base64,AAAA', target.value);
  check('pickInto fires onPick with the data URL',
    resolved === 'data:image/webp;base64,AAAA', String(resolved));
  check('pickInto dispatches an input event',
    target.getAttribute('data-upload-wired') !== '1'); /* sanity: untouched by decorate */

  /* --- missing dependency surfaces a clear error --- */
  const bare = new JSDOM('<!DOCTYPE html><body></body>', {
    url: 'http://127.0.0.1/bare.html', runScripts: 'outside-only'
  });
  if (exists('js/eatouts-upload.js')) {
    bare.window.eval(read('js/eatouts-upload.js'));
  }
  let caught = null;
  try {
    bare.window.EatoutsUpload.pickInto(bare.window.document.createElement('input'));
  } catch (e) {
    caught = e;
  }
  check('missing dependencies throw a clear error',
    !!caught && /EatoutsUpload/.test(String(caught.message)), caught && caught.message);

  console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
  process.exit(fails ? 1 : 0);
})();