/**
 * B2 — a locally-created customer account (the offline onboarding fallback)
 * must be able to sign in. The fallback stores a local password hash; the
 * customer login must fall back to verifying it when the backend is absent.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

function inline(file) {
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  return html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
    const f = path.join(APP_DIR, s.split('?')[0].replace(/\//g, path.sep));
    return fs.existsSync(f) ? '<script>' + fs.readFileSync(f, 'utf8') + '</script>' : '<!-- missing ' + s + ' -->';
  });
}

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => {
  const m = String((e && e.message) || e);
  if (m.indexOf('Not implemented: navigation') === -1) errors.push(m);
});
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(inline('eatouts-login.html'), {
  url: 'http://localhost/eatouts-login.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(win) {
    Object.defineProperty(win, 'crypto', { value: require('crypto').webcrypto, configurable: true });
  }
});
const w = dom.window;

let fails = 0;
const check = (label, cond, extra) => {
  if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
  else console.log('ok    ' + label);
};

setTimeout(() => {
  check('local login: crypto.subtle available in window', !!(w.crypto && w.crypto.subtle));
  check('local login: EatoutsAuth.hashPassword exposed', !!(w.EatoutsAuth && typeof w.EatoutsAuth.hashPassword === 'function'));

  const salt = w.EatoutsAuth.randomSalt();
  w.EatoutsAuth.hashPassword('secret123', salt).then(hash => {
    const u = w.EatoutsUsers.create({
      id: 'uc1', firstName: 'Local', surname: 'Tester', username: 'localtester',
      whatsapp: '71234567', type: 'customer', roles: ['customer'], salt: salt, passwordHash: hash
    });
    check('local login: fallback account carries a password hash', !!(u.passwordHash && u.salt));
    /* clear any session the page may have bridged so we test a fresh sign-in */
    w.EatoutsCustomer.logout();
    return w.EatoutsCustomer.login({ username: 'localtester', whatsapp: '71234567', password: 'secret123' });
  }).then(r => {
    check('local login: succeeds with the right password', !!(r && r.ok && r.user && r.user.id === 'uc1'), JSON.stringify(r));
    check('local login: returns a route', !!(r && r.route), r && r.route);
    check('local login: customer store sees the user', !!(w.EatoutsCustomer.getUser() && w.EatoutsCustomer.getUser().id === 'uc1'));
    check('local login: marked local, not backend', w.EatoutsCustomer.state.backend === false);
    return w.EatoutsCustomer.login({ username: 'localtester', whatsapp: '71234567', password: 'wrongpass' });
  }).then(r => {
    check('local login: rejects a wrong password', !!(r && !r.ok), JSON.stringify(r));
    return w.EatoutsCustomer.login({ username: 'nobody', whatsapp: '111', password: 'x' });
  }).then(r => {
    check('local login: unknown account is notfound', !!(r && !r.ok && r.error === 'notfound'), JSON.stringify(r));
    check('local login: no unexpected window errors', errors.length === 0, errors.slice(0, 2).join(' | '));
    console.log(fails === 0 ? '\nCUSTOMER LOCAL LOGIN TEST PASSED' : '\nCUSTOMER LOCAL LOGIN TEST FAILED (' + fails + ')');
    process.exit(fails ? 1 : 0);
  }).catch(e => {
    console.log('FAIL  local login threw :: ' + ((e && e.stack) || e));
    process.exit(1);
  });
}, 800);
