/* Promo pricing + free-day quota.
 *
 * The money rule lives in exactly two places:
 *   js/eatouts-promo-rules.js          (browser)
 *   functions/api/_promo-rules.js       (server)
 *
 * The rule itself:
 *   - every venue gets 3 free promo-DAYS per calendar month
 *   - a promo's LENGTH counts (Rule A decides how many days that is)
 *   - all-or-nothing: free only when it fits entirely in the free days
 *     that remain, otherwise the WHOLE promo is charged and it consumes
 *     no free days
 *   - P50.00 for day one + P10.00 for every additional day (BWP)
 *
 * This suite proves the two copies never drift, pins the worked example,
 * and checks the operator page uses the shared rule instead of a local one.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

const APP_DIR = path.resolve(__dirname, '..');

/* ---------- load the browser rule in a sandbox ---------- */
const clientSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-promo-rules.js'), 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(clientSrc, sandbox);
const Rules = sandbox.window.EatoutsPromoRules;

(async () => {
  const server = await import(pathToFileURL(path.join(APP_DIR, 'functions', 'api', '_promo-rules.js')).href);

  /* ---------- both copies exist ---------- */
  check('the browser rule is exposed', !!Rules && typeof Rules.quotePromoFee === 'function');
  check('the server rule is exposed', typeof server.quotePromoFee === 'function');

  /* ---------- the constants match ---------- */
  check('the free days per month match',
    Rules.INCLUDED_PROMO_DAYS_PER_MONTH === server.INCLUDED_PROMO_DAYS_PER_MONTH,
    Rules.INCLUDED_PROMO_DAYS_PER_MONTH + ' vs ' + server.INCLUDED_PROMO_DAYS_PER_MONTH);
  check('the free days are 3',
    Rules.INCLUDED_PROMO_DAYS_PER_MONTH === 3, String(Rules.INCLUDED_PROMO_DAYS_PER_MONTH));
  check('the first-day fee matches',
    Rules.FIRST_DAY_FEE === server.FIRST_DAY_FEE, Rules.FIRST_DAY_FEE + ' vs ' + server.FIRST_DAY_FEE);
  check('the first-day fee is P50',
    Rules.FIRST_DAY_FEE === 50, String(Rules.FIRST_DAY_FEE));
  check('the additional-day fee matches',
    Rules.ADDITIONAL_DAY_FEE === server.ADDITIONAL_DAY_FEE, Rules.ADDITIONAL_DAY_FEE + ' vs ' + server.ADDITIONAL_DAY_FEE);
  check('the additional-day fee is P10',
    Rules.ADDITIONAL_DAY_FEE === 10, String(Rules.ADDITIONAL_DAY_FEE));
  check('the currency matches',
    Rules.PROMO_CURRENCY === server.PROMO_CURRENCY, Rules.PROMO_CURRENCY + ' vs ' + server.PROMO_CURRENCY);
  check('the currency is BWP', Rules.PROMO_CURRENCY === 'BWP', Rules.PROMO_CURRENCY);
  check('the family map matches',
    JSON.stringify(Rules.FAMILY_SEGMENT) === JSON.stringify(server.FAMILY_SEGMENT),
    JSON.stringify(Rules.FAMILY_SEGMENT) + ' vs ' + JSON.stringify(server.FAMILY_SEGMENT));
  check('the segment list matches',
    JSON.stringify(Rules.PROMO_SEGMENTS) === JSON.stringify(server.PROMO_SEGMENTS),
    JSON.stringify(Rules.PROMO_SEGMENTS) + ' vs ' + JSON.stringify(server.PROMO_SEGMENTS));

  /* ---------- the money rule, pinned ---------- */
  const quoteCases = [
    { days: 1, left: 3, included: true, fee: 0 },
    { days: 2, left: 3, included: true, fee: 0 },
    { days: 3, left: 3, included: true, fee: 0 },
    /* all-or-nothing: 4 days do not fit in 3, so the WHOLE promo is charged */
    { days: 4, left: 3, included: false, fee: 80 },
    { days: 6, left: 3, included: false, fee: 100 },
    { days: 2, left: 1, included: false, fee: 60 },
    { days: 1, left: 0, included: false, fee: 50 },
    { days: 3, left: 0, included: false, fee: 70 }
  ];
  for (const c of quoteCases) {
    const b = Rules.quotePromoFee({ days: c.days, freeDaysLeft: c.left });
    const s = server.quotePromoFee({ days: c.days, freeDaysLeft: c.left });
    check('the browser quotes ' + c.days + 'd/' + c.left + ' free as ' + (c.included ? 'free' : 'P' + c.fee),
      b.included === c.included && b.fee === c.fee, JSON.stringify(b));
    check('the server quotes ' + c.days + 'd/' + c.left + ' free as ' + (c.included ? 'free' : 'P' + c.fee),
      s.included === c.included && s.fee === c.fee, JSON.stringify(s));
  }

  /* ---------- a charged promo consumes no free days ---------- */
  const charged = Rules.quotePromoFee({ days: 3, freeDaysLeft: 1 });
  check('a charged promo uses no free days', charged.freeDaysUsed === 0, String(charged.freeDaysUsed));
  const free = Rules.quotePromoFee({ days: 3, freeDaysLeft: 3 });
  check('a free promo uses exactly its days', free.freeDaysUsed === 3, String(free.freeDaysUsed));

  /* ---------- the worked example from the spec ---------- */
  /* 2-day promo -> free, 1 free day left
     3-day promo -> charged P70, still 1 free day left
     1-day promo -> free, 0 free days left
     6-day promo -> charged P100                                    */
  const rows = [
    { days: 2, left: 3, fee: 0, leftAfter: 1 },
    { days: 3, left: 1, fee: 70, leftAfter: 1 },
    { days: 1, left: 1, fee: 0, leftAfter: 0 },
    { days: 6, left: 0, fee: 100, leftAfter: 0 }
  ];
  for (const r of rows) {
    const q = Rules.quotePromoFee({ days: r.days, freeDaysLeft: r.left });
    check(r.days + '-day promo with ' + r.left + ' free left costs P' + r.fee,
      q.fee === r.fee, JSON.stringify(q));
    const after = r.left - q.freeDaysUsed;
    check(r.days + '-day promo leaves ' + r.leftAfter + ' free day(s)',
      after === r.leftAfter, 'got ' + after);
  }

  /* ---------- Rule A - how many days a promo counts for ---------- */
  const dayCases = [
    { label: 'a promo with no dates', promo: {}, days: 1 },
    { label: 'a single day', promo: { startDate: '2026-03-04', endDate: '2026-03-04' }, days: 1 },
    { label: 'a three calendar day span', promo: { startDate: '2026-03-04', endDate: '2026-03-06' }, days: 3 },
    { label: 'an inclusive calendar span', promo: { startDate: '2026-03-04', endDate: '2026-03-08' }, days: 5 }
  ];
  for (const c of dayCases) {
    const b = Rules.activeDays(c.promo);
    const s = server.activeDays(c.promo);
    check('the browser counts ' + c.label + ' as ' + c.days + ' day(s)', b === c.days, String(b));
    check('the server counts ' + c.label + ' as ' + c.days + ' day(s)', s === c.days, String(s));
  }

  /* a recurring promo counts only the weekdays it repeats on */
  const recurring = { recurring: true, startDate: '2026-03-02', endDate: '2026-03-08', days: ['Monday', 'Wednesday'] };
  const recB = Rules.activeDays(recurring);
  const recS = server.activeDays(recurring);
  check('a twice-weekly promo counts 2 days', recB === 2, String(recB));
  check('the server counts a twice-weekly promo as 2 days', recS === 2, String(recS));

  /* the weekday names must survive the round trip */
  check('the weekday names match',
    JSON.stringify(Rules.weekdayNames(['Monday', 'Friday'])) ===
    JSON.stringify(server.weekdayNames(['Monday', 'Friday'])),
    JSON.stringify(Rules.weekdayNames(['Monday', 'Friday'])));

  /* ---------- the free-day meter ---------- */
  const meterRows = [
    { label: 'nothing used', rows: [], left: 3 },
    { label: 'a 1-day free promo', rows: [{ quotedFree: true, quotedDays: 1, status: 'pending' }], left: 2 },
    { label: 'a 2-day free promo', rows: [{ quotedFree: true, quotedDays: 2, status: 'pending' }], left: 1 },
    { label: 'two free promos', rows: [
      { quotedFree: true, quotedDays: 2, status: 'pending' },
      { quotedFree: true, quotedDays: 1, status: 'approved' }
    ], left: 0 },
    { label: 'a charged promo uses nothing', rows: [{ quotedFree: false, quotedDays: 3, status: 'pending' }], left: 3 },
    { label: 'a draft uses nothing', rows: [{ quotedFree: true, quotedDays: 3, status: 'draft' }], left: 3 },
    { label: 'last month uses nothing', rows: [{ quotedFree: true, quotedDays: 3, status: 'pending', quotaMonth: '2020-01' }], left: 3 }
  ];
  const month = Rules.monthKey(Date.now());
  for (const c of meterRows) {
    const left = Rules.freeDaysLeft(c.rows, month);
    check('the meter leaves ' + c.left + ' free day(s) with ' + c.label, left === c.left, String(left));
  }

  /* ---------- the segment map ---------- */
  const segmentCases = [
    { label: 'a food promo', promo: { promoFamily: 'Food', type: 'Food Special' }, seg: 'Food' },
    { label: 'a platter promo', promo: { promoFamily: 'Platter', type: 'Platter' }, seg: 'Food' },
    { label: 'a seasonal promo', promo: { promoFamily: 'Seasonal', type: 'Seasonal' }, seg: 'Food' },
    { label: 'a beverage promo', promo: { promoFamily: 'Beverage', type: 'Beers' }, seg: 'Beverage' },
    { label: 'a combo promo', promo: { promoFamily: 'Combo', type: 'Combo' }, seg: 'Combo' },
    { label: 'a loyalty promo', promo: { promoFamily: 'Loyalty', type: 'Loyalty' }, seg: 'Combo' },
    { label: 'an event + offer', promo: { contentFormat: 'offer_event' }, seg: 'Combo' }
  ];
  for (const c of segmentCases) {
    const b = Rules.segmentForPromo(c.promo);
    const s = server.segmentForPromo(c.promo);
    check('the browser files ' + c.label + ' under ' + c.seg, b === c.seg, String(b));
    check('the server files ' + c.label + ' under ' + c.seg, s === c.seg, String(s));
  }
  check('an event-only promo is not on the Promos tab',
    server.segmentForPromo({ contentFormat: 'event' }) === null,
    String(server.segmentForPromo({ contentFormat: 'event' })));

  /* ---------- the operator page uses the shared rule ---------- */
  const promoPage = fs.readFileSync(path.join(APP_DIR, 'promo-onboarding.html'), 'utf8');
  check('the operator page loads the shared pricing rule',
    /<script src="js\/eatouts-promo-rules\.js"><\/script>/.test(promoPage));
  check('the operator page loads the shared age rule',
    /<script src="js\/eatouts-age\.js"><\/script>/.test(promoPage));
  check('the operator page quotes through the shared rule',
    /PROMO_RULES\.quotePromoFee/.test(promoPage));
  check('the operator page counts days through the shared rule',
    /PROMO_RULES\.activeDays/.test(promoPage));
  check('the operator page detects alcohol through the shared rule',
    /AGE_RULES\.mentionsAlcohol/.test(promoPage));
  check('the operator page has no local alcohol regex',
    !/const ALCOHOL_RE\s*=/.test(promoPage));
  check('the operator page has no local alcohol negation regex',
    !/const ALCOHOL_NEGATIONS\s*=/.test(promoPage));
  check('the operator page does not hardcode the fee on submit',
    !/fee:\s*50\b/.test(promoPage));
  check('the operator page says free days, not free slots',
    /free days used/.test(promoPage) && !/free slots used/.test(promoPage));
  check('the operator page explains the all-or-nothing rule',
    /whole promo is charged/.test(promoPage));

  /* the server is the one that locks the price */
  const submissions = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', 'customer', 'promo-submissions.js'), 'utf8');
  check('the submission path quotes on the server',
    /quotePromoFee/.test(submissions));
  check('the submission path counts free days on the server',
    /freeDaysLeft/.test(submissions));

  /* ---------- the admin queue ---------- */
  const adminPage = fs.readFileSync(path.join(APP_DIR, 'eatouts-admin-dashboard.html'), 'utf8');
  check('the admin queue shows the quoted days',
    /quotedDays/.test(adminPage));
  check('the admin queue shows whether the promo was free',
    /quotedFree/.test(adminPage));
  check('the admin queue shows the locked fee',
    /feeCharged/.test(adminPage));
  check('the admin queue shows the free-day meter',
    /psFreeDays/.test(adminPage) && /free days left/.test(adminPage));
  check('the admin queue shows the payment state',
    /paymentStatus/.test(adminPage) && /Payment due/.test(adminPage));
  check('the admin queue handles the payment gate',
    /payment_required/.test(adminPage));
  check('the admin queue offers a publish-anywhere override',
    /data-ps-override/.test(adminPage) && /Publish anyway/.test(adminPage));
  check('the admin queue sends the override flag',
    /body\.override = true/.test(adminPage));
  check('the admin queue does not guess the fee',
    !/x\.fee != null \? x\.fee : 50/.test(adminPage));

  const adminApi = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', 'admin', 'promo-submissions.js'), 'utf8');
  check('the admin endpoint returns the free-day meter',
    /freeDays/.test(adminApi) && /freeDaysUsed/.test(adminApi));
  check('the admin endpoint returns the month it measured',
    /month:\s*month/.test(adminApi));
  check('the admin endpoint blocks a publish that is unpaid',
    /error:\s*'payment_required'/.test(adminApi) && /409/.test(adminApi));
  check('the admin endpoint accepts the override',
    /b\.override === true/.test(adminApi));
  check('the admin endpoint records the override',
    /admin_override/.test(adminApi) && /without payment \(admin override\)/i.test(adminApi));

  console.log('');
  console.log(checks + ' checks, ' + fails + ' failures');
  process.exit(fails ? 1 : 0);
})().catch(function (err) {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
