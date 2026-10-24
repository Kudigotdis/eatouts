/* One sign-in surface.
 *
 * eatouts-login.html is the only way into an account: WhatsApp number,
 * username and password, all three. This suite checks that the page
 * really asks for the three, that the forgot-password flow is on it, and
 * that no other sign-in entry point in the app sends people anywhere else.
 */
'use strict';

const fs = require('fs');
const path = require('path');

let fails = 0;
let checks = 0;
function check(label, cond, extra) {
  checks++;
  if (cond) console.log('ok   ' + label);
  else { fails++; console.log('FAIL ' + label + (extra ? '  -- ' + extra : '')); }
}

const APP_DIR = path.resolve(__dirname, '..');

/* the pages that ship with the app */
const SKIP_DIR = /[\\/](node_modules|dist|staging|reference|\.wrangler|SORT THIS)[\\/]/i;
const SKIP_FILE = /^(HTML_CATALOG|SORT_REDESIGNS|UPLOAD)/i;

function shippedFiles(extensions) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(dir, entry.name);
      const rel = path.relative(APP_DIR, full);
      if (SKIP_DIR.test('\\' + rel + '\\')) continue;
      if (entry.isDirectory()) { walk(full); continue; }
      if (SKIP_FILE.test(entry.name)) continue;
      if (extensions.some((e) => entry.name.toLowerCase().endsWith(e))) out.push(full);
    }
  }
  walk(APP_DIR);
  return out;
}

const htmlFiles = shippedFiles(['.html']);
const jsFiles = shippedFiles(['.js']);

const loginPage = fs.readFileSync(path.join(APP_DIR, 'eatouts-login.html'), 'utf8');

/* ---------- the page itself ---------- */
check('the sign-in page exists', fs.existsSync(path.join(APP_DIR, 'eatouts-login.html')));
check('the old underscore sign-in page is gone',
  !fs.existsSync(path.join(APP_DIR, 'eatouts_login.html')));
check('the page asks for a WhatsApp number', /id="wa"/.test(loginPage));
check('the page asks for a username', /id="username"/.test(loginPage));
check('the page asks for a password', /id="password"/.test(loginPage));
check('the page spells out all three',
  /Enter your WhatsApp number, username and password/i.test(loginPage));
check('the page has a forgot-password option',
  /Forgot password\?/i.test(loginPage) && /data-goto="forgot"/.test(loginPage));
check('the forgot panel asks for an email address', /id="resetEmail"/.test(loginPage));
check('the page can take a reset token', /reset_token/.test(loginPage));
check('the page can take a next page', /params\.get\('next'\)/.test(loginPage));

/* the reset link must stay on this site */
check('the next page is checked against the origin',
  /u\.origin\s*!==\s*location\.origin/.test(loginPage));

/* ---------- the client sign-in ---------- */
const customerSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-customer.js'), 'utf8');
const localLogin = customerSrc.slice(customerSrc.indexOf('function loginLocal'));
check('the local sign-in needs the username',
  /!username/.test(localLogin.slice(0, 1200)));
check('the local sign-in needs the WhatsApp number', /!wa\b/.test(localLogin.slice(0, 1200)));
check('the local sign-in needs the password', /!password/.test(localLogin.slice(0, 1200)));
check('the local sign-in matches all three', /nameMatch\s*&&\s*waMatch/.test(localLogin));

const authSrc = fs.readFileSync(path.join(APP_DIR, 'js', 'eatouts-auth.js'), 'utf8');
check('the operator sign-in needs a username', /if \(!uname\)/.test(authSrc));
check('the operator sign-in matches the username',
  /c\.user\.username[\s\S]{0,120}===\s*uname/.test(authSrc));
check('redirectToLogin goes to the sign-in page',
  /function redirectToLogin[\s\S]{0,400}eatouts-login\.html/.test(authSrc));
check('redirectToLogin passes the page it came from',
  /redirectToLogin[\s\S]{0,600}\?next=/.test(authSrc));

/* ---------- the server sign-in ---------- */
const loginApi = fs.readFileSync(path.join(APP_DIR, 'functions', 'api', 'auth', 'login.js'), 'utf8');
check('the server refuses a sign-in without a username',
  /!password\s*\|\|\s*!username\s*\|\|\s*!whatsapp/.test(loginApi));
check('the server looks the account up by username',
  /SELECT \* FROM users WHERE username = \?/.test(loginApi));
check('the server checks the WhatsApp number matches',
  /normalisePhone\(row\.whatsapp\)\s*!==\s*whatsapp/.test(loginApi));

/* ---------- the About operator link ---------- */
const indexSrc = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
check('the About page links to operator-businesses.html',
  /href="operator-businesses\.html"/.test(indexSrc));
check('the About page no longer has the inline operator form',
  !/id="opWhats"/.test(indexSrc));

/* ---------- no other sign-in door ---------- */
const SIGN_IN_WORDS = /(sign in|signin|log in|login|sign-in)/i;
const badLinks = [];
for (const file of htmlFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(APP_DIR, file);
  /* every anchor whose visible text asks to sign in */
  const re = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]{0,80}?)<\/a>/gi;
  let m;
  while ((m = re.exec(src))) {
    const href = m[1];
    const text = m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (!SIGN_IN_WORDS.test(text)) continue;
    if (href.indexOf('eatouts-login.html') === -1) {
      badLinks.push(rel + ': "' + text + '" -> ' + href);
    }
  }
}
check('every sign-in link goes to eatouts-login.html', badLinks.length === 0, badLinks.join(' | '));

/* the same for the redirects in the scripts */
const badRedirects = [];
for (const file of jsFiles) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(APP_DIR, file);
  const re = /location\.(?:href|replace)\s*\(?\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(src))) {
    const target = m[1];
    if (/login/i.test(target) && target.indexOf('eatouts-login.html') === -1) {
      badRedirects.push(rel + ' -> ' + target);
    }
  }
}
check('every script redirect goes to eatouts-login.html', badRedirects.length === 0,
  badRedirects.join(' | '));

/* ---------- the pages that may be signed in ---------- */
const guarded = [
  'promo-onboarding.html', 'menu-onboarding.html', 'gallery-onboarding.html',
  'event-onboarding.html', 'invoice.html', 'intake.html',
  'restaurant-dashboard.html', 'restaurant-dashboard-redesign.html'
];
const notGuarded = guarded.filter((f) => {
  const p = path.join(APP_DIR, f);
  if (!fs.existsSync(p)) return false;
  const src = fs.readFileSync(p, 'utf8');
  return !/redirectToLogin/.test(src);
});
check('every guarded page sends people to the sign-in page', notGuarded.length === 0,
  notGuarded.join(', '));

/* ---------- the customer sign-up page ---------- */
const signupPage = fs.readFileSync(path.join(APP_DIR, 'eatouts-customer-signup.html'), 'utf8');
check('the customer sign-up page asks for an email address',
  /field\('Email','contact\.email','email',\{[^}]*required:true/.test(signupPage));
check('the customer sign-up page checks the email before moving on',
  /isContactDone[\s\S]{0,400}mailOk/.test(signupPage));
check('the customer sign-up page is the renamed one',
  fs.existsSync(path.join(APP_DIR, 'eatouts-customer-signup.html')) &&
  !fs.existsSync(path.join(APP_DIR, 'eatouts_user_onboarding.html')));

console.log('\n' + checks + ' checks, ' + fails + ' failures');
if (fails) process.exit(1);
