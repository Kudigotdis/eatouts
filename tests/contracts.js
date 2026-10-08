/* Cross-page contract tests for the EatOuts app.
   Contract #1 (pricing object), #2 (ops store), #4 (auth gate). */
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

function patchAuth(w, opts, state) {
  const A = w.EatoutsAuth;
  if (!A) return;
  if (typeof A.redirectToLogin === 'function') {
    A.redirectToLogin = function () { state.redirected = true; };
  }
  if ((opts.auth || 'none') === 'session') {
    A.requireSession = function () { return true; };
    A.applyActive = function () {};
  }
}

function boot(rel, opts) {
  opts = opts || {};
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
  const state = { redirected: false };

  if (opts.seed) {
    Object.keys(opts.seed).forEach(function (k) {
      try { w.localStorage.setItem(k, opts.seed[k]); } catch (e) { /* ignore */ }
    });
  }

  let patched = false;

  scripts.forEach(function (s) {
    if (s.src) {
      const relPath = s.src.replace(/^\.\//, '').replace(/^\//, '');
      if (!exists(relPath)) return;
      try { w.eval(read(relPath)); }
      catch (e) { errors.push(relPath + ': ' + e.message); }
      return;
    }
    if (!patched) { patched = true; patchAuth(w, opts, state); }
    try { w.eval(s.code); }
    catch (e) { errors.push(rel + ' inline: ' + e.message); }
  });

  return { dom: dom, window: w, errors: errors, state: state };
}

function bootIfPresent(rel, opts) {
  if (!exists(rel)) {
    console.log('skip ' + rel + ' (not present)');
    return null;
  }
  return boot(rel, opts);
}

/* ============================================================
   Contract #4 — the auth gate
   ============================================================ */

console.log('\n-- Contract #4: auth gate --');

['intake.html', 'invoice.html', 'ops-console.html'].forEach(function (rel) {
  const b = bootIfPresent(rel, { auth: 'none' });
  if (!b) return;
  check('auth: ' + rel + ' boots without throwing', b.errors.length === 0, b.errors.join(' | '));
  check('auth: ' + rel + ' exposes EatoutsAuth', !!b.window.EatoutsAuth);
  if (b.window.EatoutsAuth) {
    check('auth: ' + rel + ' requireSession() is false without a session',
      b.window.EatoutsAuth.requireSession() === false);
  }
  check('auth: ' + rel + ' redirectToLogin ran', b.state.redirected === true);
});

['pricing.html', 'get-started.html', 'partner-terms.html'].forEach(function (rel) {
  const b = bootIfPresent(rel, { auth: 'none' });
  if (!b) return;
  check('auth: ' + rel + ' loads without redirect', b.state.redirected === false);
});

/* ============================================================
   Contract #2 — the eatouts_ops_v1 store
   ============================================================ */

console.log('\n-- Contract #2: ops store --');

const OPS_BLOB = JSON.stringify({
  venues: [],
  invoices: [
    { id: 'inv_test_1', number: 'EO-202610-001', venue: 'Test Venue',
      amount: 400, total: 400, status: 'unpaid' }
  ],
  submissions: [
    { slug: 'test-venue', filename: 'venue_test-venue_20261007.json' }
  ],
  metrics: []
});

(function () {
  const b = bootIfPresent('ops-console.html', {
    auth: 'session',
    seed: { eatouts_ops_v1: OPS_BLOB }
  });
  if (!b) return;
  check('ops: ops-console.html boots cleanly', b.errors.length === 0, b.errors.join(' | '));
  const body = b.window.document.body.textContent || '';
  check('ops: invoice number EO-202610-001 rendered', body.indexOf('EO-202610-001') !== -1);
  check('ops: submission slug test-venue rendered', body.indexOf('test-venue') !== -1);
  check('ops: submission filename rendered',
    body.indexOf('venue_test-venue_20261007.json') !== -1);
})();

/* ============================================================
   Contract #1 — the pricing object
   ============================================================ */

console.log('\n-- Contract #1: pricing object --');

const EXPECTED = { setup: 'P300', starter: 'P100', growth: 'P300', pro: 'P500' };

(function () {
  const b = bootIfPresent('pricing.html', { auth: 'none' });
  if (!b) return;
  const w = b.window;
  const P = w.EATOUTS_PRICING;
  check('pricing: window.EATOUTS_PRICING defined', !!P);
  if (!P) return;
  check('pricing: setup === 300', P.setup === 300, String(P.setup));
  check('pricing: starter 100', P.tiers && P.tiers.starter && P.tiers.starter.price === 100);
  check('pricing: growth 300', P.tiers && P.tiers.growth && P.tiers.growth.price === 300);
  check('pricing: pro 500', P.tiers && P.tiers.pro && P.tiers.pro.price === 500);
})();

['get-started.html', 'partner-terms.html'].forEach(function (rel) {
  const b = bootIfPresent(rel, { auth: 'none' });
  if (!b) return;
  const w = b.window;

  if (w.EatoutsPricing && typeof w.EatoutsPricing.fill === 'function') {
    w.EatoutsPricing.fill();
  }

  const nodes = w.document.querySelectorAll('[data-price]');
  if (!nodes.length) {
    console.log('skip ' + rel + ' (no [data-price] elements)');
    return;
  }
  let ok = true;
  let detail = '';
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    const key = el.getAttribute('data-price');
    const want = EXPECTED[key];
    if (!want) continue;
    const got = (el.textContent || '').trim();
    if (got !== want) {
      ok = false;
      detail = key + ': want ' + want + ' got ' + got;
      break;
    }
  }
  check('pricing: ' + rel + ' [data-price] resolved', ok, detail);
});

/* ============================================================
   Summary
   ============================================================ */

console.log('\n' + (checks - fails) + '/' + checks + ' checks passed');
process.exit(fails ? 1 : 0);