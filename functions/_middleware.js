/* ============================================================
   Access-control middleware - Stages 1-4 (Milestone B).

   Runs before every Function in this project (Pages root scope). The stage
   order is cheapest-first and matches docs/ACCESS-CONTROL-PLAN.md section 3:

     Stage 1  UA sanity      known-bad crawler / empty UA        -> deny
     Stage 2  ASN sanity     DATACENTER_ASNS                     -> deny
     Stage 3  Admin bypass   eatouts_admin_bypass HMAC + epoch   -> allow
     Stage 4  Geo            country must be BW                  -> deny

   Stages 5-7 (/data/*, /media/*, denial rollups) belong to Milestones C/D.

   THREE MODES, chosen by env.ACCESS_GATE:
     off      (default)  the gate does nothing at all. Nothing is logged,
                         nothing is blocked. This is what is deployed.
     monitor             every stage runs and every would-be denial lands in
                         denial_log, but the request is served. Use this to
                         prove no real Botswana visitor is caught (and to see
                         exactly which crawlers the gate would cost you)
                         before switching on enforcement.
     enforce             a denial is a 403.

   Set ACCESS_GATE in wrangler.toml / the dashboard; see the plan's
   "Deploy order" - monitor first, then enforce.

   DESIGN RULES (same as functions/api/_security.js):
     - FAIL CLOSED. A missing secret, binding, country or an unexpected
       exception is a denial, never an allow.
     - ONE DENIAL BODY. deny() is the bare _security.js 403; nothing here ever
       names the stage, the rule, the country or the ASN in the response.
     - NO RAW IDENTIFIERS. logDenial hashes the IP and the user agent.
     ============================================================ */
import { adminGate, logDenial, geo, isDatacenterAsn, deny } from './api/_security.js';

export var OFF = 'off';
export var MONITOR = 'monitor';
export var ENFORCE = 'enforce';

/* Confidence is a triage hint for denial_log: how sure the stage is that this
   is not a Botswana human on their own browser. */
var CONF = {
  ua_missing: 60,
  ua_known_bad: 90,
  datacenter_asn: 80,
  country_missing: 95,
  country_not_bw: 90
};

/** Resolve env.ACCESS_GATE. Anything unrecognised - including unset - is off. */
export function gateMode(env) {
  var raw = String((env && env.ACCESS_GATE) || '').trim().toLowerCase();
  if (raw === 'enforce' || raw === 'on' || raw === 'true') return ENFORCE;
  if (raw === 'monitor' || raw === 'log' || raw === 'dry-run') return MONITOR;
  return OFF;
}

/* Paths that must stay reachable from anywhere. The first group is what makes
   the gate survivable: /admin/login is the only page a Zimbabwe IP can load,
   and /api/admin/* is what mints the cookie that gets them anywhere else.
   /api/auth/* stays open so an existing customer can always sign in. */
var SKIP_EXACT = {
  '/api/health': 1,
  '/api/auth': 1,
  '/admin/login': 1,
  '/_headers': 1,
  '/_redirects': 1,
  '/_routes.json': 1,
  '/robots.txt': 1,
  '/manifest.json': 1,
  '/favicon.ico': 1
};
var SKIP_PREFIX = ['/api/admin/', '/api/auth/', '/admin/'];

/** True for the handful of paths that must never be geo-gated. */
export function isSkipPath(pathname) {
  var p = String(pathname || '/').toLowerCase();
  if (SKIP_EXACT[p]) return true;
  for (var i = 0; i < SKIP_PREFIX.length; i++) {
    if (p.indexOf(SKIP_PREFIX[i]) === 0) return true;
  }
  return false;
}

/* Stage 1. Scripted clients, headless browsers and SEO/AI crawlers. Matching is
   substring-based on the lowercased UA so a version bump cannot slip past.
   Deliberately absent: whatsapp, facebookexternalhit, twitterbot, telegrambot,
   slackbot and discordbot - those render link previews for real customers - and
   googlebot/bingbot, which Stages 2 and 4 stop like any other crawler. */
var BAD_UA = [
  'bytespider', 'scrapy', 'python-requests', 'python-urllib', 'aiohttp', 'httpx',
  'curl/', 'wget/', 'libwww-perl', 'go-http-client', 'apache-httpclient',
  'httpclient', 'java/', 'node-fetch', 'axios/', 'undici', 'got (',
  'headlesschrome', 'phantomjs', 'puppeteer', 'playwright', 'selenium',
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'petalbot', 'dataforseo',
  'serpstatbot', 'gptbot', 'ccbot', 'claudebot', 'anthropic-ai',
  'perplexitybot', 'amazonbot', 'youbot', 'imagesiftbot', 'omgilibot'
];

/** '' when the UA is acceptable, otherwise the denial rule it tripped. */
export function badUa(ua) {
  var s = String(ua || '').trim().toLowerCase();
  if (!s) return 'ua_missing';
  for (var i = 0; i < BAD_UA.length; i++) {
    if (s.indexOf(BAD_UA[i]) >= 0) return 'ua_known_bad';
  }
  return '';
}

async function gate(context) {
  var env = context.env || {};
  var request = context.request;
  var mode = gateMode(env);
  if (mode === OFF) return context.next();

  var url = new URL(request.url);
  if (isSkipPath(url.pathname)) return context.next();

  /* One place that decides what a denial means in this mode. In monitor mode
     the record is still written and the request goes through anyway. */
  async function blocked(stageNo, rule) {
    await logDenial(env, request, {
      stage: stageNo,
      rule: rule,
      path: url.pathname,
      confidence: CONF[rule] || 0
    });
    if (mode === MONITOR) return context.next();
    return deny();
  }

  var ua = request.headers.get('User-Agent') || '';
  var bad = badUa(ua);
  if (bad) return blocked(1, bad);

  var g = geo(request);
  if (g.asn && isDatacenterAsn(g.asn)) return blocked(2, 'datacenter_asn');

  /* Stage 3 - the operator exception. It skips Stage 4 only: a client that
     looks like curl, or a hosting-network ASN, is still refused above. */
  var admin = await adminGate(env, request);
  if (admin && admin.ok) return context.next();

  if (!g.country) return blocked(4, 'country_missing');
  if (g.country !== 'BW') return blocked(4, 'country_not_bw');

  return context.next();
}

/* Never a 500 with a stack in it: any surprise above is a denial. */
export async function onRequest(context) {
  try {
    return await gate(context);
  } catch (e) {
    try { console.log('access-gate-error ' + (e && e.message ? e.message : e)); } catch (x) { /* noop */ }
    return deny();
  }
}
