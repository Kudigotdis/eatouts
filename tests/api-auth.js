/* Pure-helper tests for the customer auth module (functions/api/_auth.js).
   Exercises validation, phone normalisation, the age gate and a real
   PBKDF2 hash/verify round-trip. Does not touch D1/KV. */
'use strict';

const path = require('path');
const { pathToFileURL } = require('url');

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

(async () => {
  const modUrl = pathToFileURL(path.resolve(__dirname, '..', 'functions', 'api', '_auth.js')).href;
  const A = await import(modUrl);

  /* ---- phone normalisation ---- */
  check('normalisePhone keeps digits', A.normalisePhone('+267 71 844 129') === '26771844129');
  check('normalisePhone strips 00 prefix', A.normalisePhone('00267 71844129') === '26771844129');
  check('normalisePhone handles empty', A.normalisePhone(null) === '');
  check('phoneIntl pads local numbers', A.phoneIntl('71844129') === '26771844129');
  check('phoneIntl leaves intl numbers', A.phoneIntl('+267 71 844 129') === '26771844129');

  /* ---- username rules ---- */
  check('validateUsername accepts good', A.validateUsername('Kudz_01').ok === true);
  check('validateUsername lowercases', A.validateUsername('Kudz_01').username === 'kudz_01');
  check('validateUsername rejects short', A.validateUsername('ab').ok === false);
  check('validateUsername rejects spaces', A.validateUsername('bad name').ok === false);
  check('validateUsername rejects symbols', A.validateUsername('bad!name').ok === false);

  /* ---- password rules ---- */
  check('validatePassword accepts 8+', A.validatePassword('password1').ok === true);
  check('validatePassword rejects short', A.validatePassword('short').ok === false);

  /* ---- email ---- */
  check('validEmail accepts', A.validEmail('A@B.CO') === 'a@b.co');
  check('validEmail rejects junk', A.validEmail('not-an-email') === null);

  /* ---- synthetic email ---- */
  check('syntheticEmail uses normalised number',
    A.syntheticEmail('+267 71 844 129') === '26771844129@whatsapp.eatouts');

  /* ---- age gate ---- */
  const adultDob = new Date();
  adultDob.setFullYear(adultDob.getFullYear() - 25);
  const minorDob = new Date();
  minorDob.setFullYear(minorDob.getFullYear() - 15);
  const iso = (d) => d.toISOString().slice(0, 10);
  check('isAdult true at 25', A.isAdult(iso(adultDob), 18) === true);
  check('isAdult false at 15', A.isAdult(iso(minorDob), 18) === false);
  check('ageFromDob null on junk', A.ageFromDob('not-a-date') === null);

  /* ---- safeEqual ---- */
  check('safeEqual true on match', A.safeEqual('abc', 'abc') === true);
  check('safeEqual false on mismatch', A.safeEqual('abc', 'abd') === false);
  check('safeEqual false on length', A.safeEqual('abc', 'abcd') === false);

  /* ---- hashing round-trip ---- */
  const salt = A.randomSalt(16);
  check('randomSalt 16 bytes -> 32 hex', /^[0-9a-f]{32}$/.test(salt));
  const hash = await A.hashPassword('s3cret-pass', salt, 10000);
  check('hashPassword returns 64 hex', /^[0-9a-f]{64}$/.test(hash));
  const again = await A.hashPassword('s3cret-pass', salt, 10000);
  check('hash is deterministic', hash === again);
  check('verifyPassword accepts correct',
    (await A.verifyPassword('s3cret-pass', salt, 10000, hash)) === true);
  check('verifyPassword rejects wrong',
    (await A.verifyPassword('wrong-pass', salt, 10000, hash)) === false);
  const salt2 = A.randomSalt(16);
  const hash2 = await A.hashPassword('s3cret-pass', salt2, 10000);
  check('different salt -> different hash', hash !== hash2);

  /* ---- publicUser shape ---- */
  const pu = A.publicUser({
    id: 'usr_1', username: 'kudz', whatsapp: '26771844129', email: 'a@b.co',
    name: 'Kudz M', type: 'customer', verified: 1, photo_key: 'k1',
    profile: '{"firstName":"Kudz"}'
  });
  check('publicUser maps fields', pu.username === 'kudz' && pu.verified === true && pu.profile.firstName === 'Kudz');
  check('publicUser tolerates bad profile JSON', A.publicUser({ id: 'x', profile: 'not json' }).profile.firstName === undefined);
  check('publicUser null-safe', A.publicUser(null) === null);

  console.log('');
  console.log(fails ? (fails + ' FAILED') : (checks + ' checks passed'));
  process.exit(fails ? 1 : 0);
})().catch((err) => {
  console.log('FAIL suite threw: ' + (err && err.message));
  process.exit(1);
});
