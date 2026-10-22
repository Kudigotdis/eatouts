/* Age gate.
 *
 * 10+ may hold an EatOuts account. 18+ is needed to see the promos that
 * are for alcohol.
 *
 * The rule that decides "is this promo for alcohol?" lives twice: once in
 * js/eatouts-age.js for the browser and once in
 * functions/api/_promo-rules.js for the server. This suite proves the two
 * never drift apart, and that the account and promo rules are wired in.
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
const clientSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-age.js'), 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(clientSrc, sandbox);
const Age = sandbox.window.EatoutsAge;

(async () => {
  const rules = await import(pathToFileURL(path.join(APP_DIR, 'functions', 'api', '_promo-rules.js')).href);

  /* ---------- the two lists must match ---------- */
  check('the browser rule is exposed', !!Age && typeof Age.isAgeRestrictedPromo === 'function');
  check('the server rule is exposed', typeof rules.isAgeRestrictedPromo === 'function');
  check('the word lists match',
    JSON.stringify(Age.ALCOHOL_WORDS) === JSON.stringify(rules.ALCOHOL_WORDS),
    JSON.stringify(Age.ALCOHOL_WORDS) + ' vs ' + JSON.stringify(rules.ALCOHOL_WORDS));
  check('the non-alcohol subtypes match',
    JSON.stringify(Age.NON_ALCOHOL_SUBTYPES) === JSON.stringify(rules.NON_ALCOHOL_SUBTYPES));
  check('the word list is not empty', Age.ALCOHOL_WORDS.length > 10);
  check('beer, cider and spirits are on the list',
    ['beer', 'cider', 'spirits'].every((w) => Age.ALCOHOL_WORDS.indexOf(w) !== -1));

  /* ---------- the rule itself ---------- */
  const cases = [
    { label: 'a beer promo', promo: { type: 'Beers', title: 'Castle Light' }, flagged: true },
    { label: 'a cider promo', promo: { type: 'Ciders', title: 'Apple Cider' }, flagged: true },
    { label: 'a spirits promo', promo: { type: 'Spirits', title: 'Whisky' }, flagged: true },
    { label: 'a fizzy drink promo', promo: { type: 'Fizzy Drinks', title: 'Cola' }, flagged: false },
    { label: 'an iced tea promo', promo: { type: 'Iced Tea', title: 'Iced Tea' }, flagged: false },
    { label: 'a food promo', promo: { type: 'Food Special', title: 'Beef Stew' }, flagged: false },
    { label: 'a food promo that excludes beer',
      promo: { type: 'Combo', title: 'Platter Special Without Beer' }, flagged: false },
    { label: 'a promo whose copy sells beer',
      promo: { type: 'Deal', title: 'Two for one Beer' }, flagged: true },
    { label: 'a mocktail promo', promo: { type: 'Combo', title: 'Mocktail Friday' }, flagged: false },
    { label: 'a wine promo', promo: { type: 'Wines', title: 'Red Wine' }, flagged: true },
    { label: 'a soft drink promo', promo: { type: 'Fizzy Drinks', title: 'Soft Drink' }, flagged: false },
    { label: 'an operator flagged promo',
      promo: { type: 'Food Special', title: 'Chef Tasting', ageRestricted: true }, flagged: true }
  ];
  for (const c of cases) {
    const client = !!Age.isAgeRestrictedPromo(c.promo);
    const server = !!rules.isAgeRestrictedPromo(c.promo);
    check('the client rule: ' + c.label, client === c.flagged, 'got ' + client);
    check('the server rule: ' + c.label, server === c.flagged, 'got ' + server);
  }

  /* ---------- the viewer ---------- */
  const year = new Date().getFullYear();
  check('an age of 17 is not enough',
    Age.ageFromDob((year - 17) + '-06-01') < 18);
  check('an age of 20 is enough',
    Age.ageFromDob((year - 20) + '-06-01') >= 18);
  check('a missing date of birth means no age', Age.ageFromDob(null) === null);
  check('a broken date of birth means no age', Age.ageFromDob('not-a-date') === null);

  /* a signed-in 20-year-old may see the flagged promos */
  sandbox.window.EatoutsCustomer = { getUser: () => ({ id: 'u1', dob: (year - 20) + '-01-01' }) };
  check('a signed-in adult may see the flagged promos', Age.canViewFlaggedPromos() === true);
  sandbox.window.EatoutsCustomer = { getUser: () => ({ id: 'u2', dob: (year - 15) + '-01-01' }) };
  check('a signed-in 15-year-old may not', Age.canViewFlaggedPromos() === false);
  sandbox.window.EatoutsCustomer = { getUser: () => null };
  check('a guest may not', Age.canViewFlaggedPromos() === false);

  /* ---------- the account age gate ---------- */
  const authSrc = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', '_auth.js'), 'utf8');
  const signupSrc = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', 'auth', 'signup.js'), 'utf8');
  check('the account gate is 10', /meetsAge\(body\.dob,\s*10\)/.test(signupSrc));
  check('the age helper is named meetsAge', /export function meetsAge/.test(authSrc));
  check('the old 18+ account gate is gone', !/meetsAge\(body\.dob,\s*18\)/.test(signupSrc));

  const signupPage = fs.readFileSync(path.join(APP_DIR, 'eatouts-customer-signup.html'), 'utf8');
  check('the sign-up page allows 10-year-olds', /const MIN_AGE = 10/.test(signupPage));

  /* ---------- the server strips the flagged promos ---------- */
  const venueSrc = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', 'venues', '[id].js'), 'utf8');
  check('the venue bundle knows about the age rule',
    /isAgeRestrictedPromo/.test(venueSrc));
  check('the venue bundle checks the viewer is 18+',
    /meetsAge\(profile\.dob,\s*18\)/.test(venueSrc));
  check('the venue bundle removes the flagged promos',
    /promos\s*=\s*promos\.filter\(function \(p\) \{ return !p\.ageRestricted; \}\)/.test(venueSrc));

  /* ---------- the operator can flag a promo ---------- */
  const promoPage = fs.readFileSync(path.join(APP_DIR, 'promo-onboarding.html'), 'utf8');
  check('the promo editor has an age-restricted tick box',
    /fldChk\('Age-restricted \(18\+\)','ageRestricted'/.test(promoPage));
  const businessApi = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-business-api.js'), 'utf8');
  check('the promo is sent to the server with the flag',
    /ageRestricted:\s*!!p\.ageRestricted/.test(businessApi));
  check('the promo comes back from the server with the flag',
    /ageRestricted:\s*!!s\.ageRestricted/.test(businessApi));

  /* ---------- the migration ---------- */
  const migration = path.join(APP_DIR, 'migrations', '0012_promo_age_restriction.sql');
  check('the age_restricted migration exists', fs.existsSync(migration));
  if (fs.existsSync(migration)) {
    const sql = fs.readFileSync(migration, 'utf8');
    check('the migration adds the age_restricted column',
      /ALTER TABLE promos ADD COLUMN age_restricted/i.test(sql));
  }

  /* ---------- the wording ---------- */
  const tos = fs.readFileSync(path.join(APP_DIR, 'assets', 'data', 'eatouts_terms_of_service.js'), 'utf8');
  const privacy = fs.readFileSync(path.join(APP_DIR, 'assets', 'data', 'eatouts_privacy_policy.js'), 'utf8');
  check('the terms explain the age rules', /10 or older/.test(tos) && /18 or older/.test(tos));
  check('the privacy policy explains the age rules', /10 and over/.test(privacy));

  console.log('\n' + checks + ' checks, ' + fails + ' failures');
  if (fails) process.exit(1);
})().catch((e) => { console.error(e); process.exit(1); });
