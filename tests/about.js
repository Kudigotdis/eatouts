const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');
const errors = [];
let html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
  const f = path.join(APP_DIR, src.replace(/\//g, path.sep));
  if (!fs.existsSync(f)) { errors.push('missing script file: ' + src); return '<!-- missing ' + src + ' -->'; }
  return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
});

const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const dom = new JSDOM(html, {
  url: 'http://localhost/index.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;
const click = el => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };

  click(doc.querySelector('[data-tab="about"]'));
  const vp = doc.getElementById('viewport');
  check('about rendered', !!vp && vp.innerHTML.length > 500);

  const blog = vp.querySelector('a[href="eatouts-blog.html"]');
  check('blog link present', !!blog, blog ? 'text=' + blog.textContent.trim() : 'missing');
  check('blog link labelled Blog', !!blog && blog.textContent.trim() === 'Blog');
  check('blog stub button gone', !vp.querySelector('button[data-notice*="blog is coming soon"]'));

  const planner = vp.querySelector('a[href="eatouts-event-planner.html"]');
  check('event planner link gone', !planner, planner ? 'text=' + planner.textContent.trim() : 'ok');

  const suppliers = vp.querySelector('a[href="eatouts-suppliers.html"]');
  check('suppliers link present', !!suppliers, suppliers ? 'text=' + suppliers.textContent.trim() : 'missing');

  const typeLinks = vp.querySelectorAll('a[href^="eatouts-business-signup.html?type="]');
  check('list-business CTA present', typeLinks.length > 0, 'count=' + typeLinks.length);
  check('five business-type links present', typeLinks.length === 5, 'count=' + typeLinks.length);
  const typeSlugs = Array.from(typeLinks).map(a => (a.getAttribute('href') || '').split('type=')[1]).sort();
  check('type links are the five canonical slugs',
    JSON.stringify(typeSlugs) === JSON.stringify(['caterer', 'event_supplier', 'food_truck', 'liquor_store', 'restaurant']),
    typeSlugs.join(','));
  check('CTA offers List As "Restaurant"',
    Array.from(typeLinks).some(a => /list as .*restaurant/i.test(a.textContent)));

  const settings = vp.querySelector('button[data-act="toggleAboutSettings"]');
  check('Settings accordion toggle present', !!settings && settings.textContent.trim() === 'Settings');
  const listBiz = vp.querySelector('details.setacc summary.setrow');
  check('List Business accordion toggle present', !!listBiz && /list business/i.test(listBiz.textContent));

  const needDesign = vp.querySelector('a[href="designer-services.html"]');
  check('Need Design link present', !!needDesign, needDesign ? 'text=' + needDesign.textContent.trim() : 'missing');
  check('Need Design labelled correctly', !!needDesign && /need design/i.test(needDesign.textContent.trim()));
  const listBizDetails = listBiz && listBiz.parentElement;
  const needDesignRow = needDesign && needDesign.closest('.acc-in');
  check('Need Design is a Settings-level row (not inside List Business)',
    !!needDesignRow && !needDesign.closest('details.setacc'), needDesignRow ? 'inside settings panel' : 'missing');
  check('Need Design sits directly after the List Business panel',
    !!needDesign && !!listBizDetails && needDesign.previousElementSibling === listBizDetails,
    'expected the Need Design anchor to immediately follow <details.setacc>');
  const bizPanel = listBizDetails && listBizDetails.querySelector('.acc-in');
  const bizLinks = bizPanel ? Array.from(bizPanel.querySelectorAll('a[href^="eatouts-business-signup.html?type="]')) : [];
  check('List Business panel holds only the 5 List As links',
    !!bizPanel && bizLinks.length === 5 && !bizPanel.querySelector('a[href="designer-services.html"]'),
    'count=' + bizLinks.length);

  const oldShare = vp.querySelector('a.btn.share');
  check('old Share EatOuts button removed', !oldShare, oldShare ? 'text=' + oldShare.textContent.trim() : 'ok');
  const shareIco = vp.querySelector('.social-row a[aria-label="Share EatOuts"]');
  check('Share EatOuts icon present in the social row', !!shareIco, shareIco ? 'ok' : 'missing');
  check('Share EatOuts icon opens the WhatsApp share sheet',
    !!shareIco && /wa\.me\/\?text=/.test(shareIco.getAttribute('href') || ''));
  const shareImg = shareIco && shareIco.querySelector('img');
  check('Share EatOuts icon uses the Share_On art',
    !!shareImg && /Share_On\.png/.test(shareImg.getAttribute('src') || ''),
    shareImg ? shareImg.getAttribute('src') : 'missing');
  check('website slot no longer renders as unavailable',
    !vp.querySelector('.social-row .social-ico.off[aria-label*="Website"]'));

  /* guest profile card opens a centred sign-in popup (no accordion) */
  const guestCard = vp.querySelector('.profilecard.guest');
  check('guest profile card present', !!guestCard);
  check('guest card has no secondary text', !!guestCard && !guestCard.querySelector('small'));
  check('guest card advertises a dialog', !!guestCard && guestCard.getAttribute('aria-haspopup') === 'dialog');
  click(guestCard);
  check('guest card does not open an accordion',
    dom.window.eval('state.profileCardOpen') !== true && !vp.querySelector('.pc-rows'));
  const guestAlert = vp.querySelector('.card-alert');
  check('guest popup opens on tap', !!guestAlert);
  check('guest popup text is centred',
    !!guestAlert && dom.window.getComputedStyle(guestAlert).textAlign === 'center');
  check('guest popup leads with the EatOuts logo',
    !!guestAlert && !!guestAlert.querySelector('img.card-alert-logo[src*="EatOuts"]'));
  const opts = guestAlert ? Array.from(guestAlert.querySelectorAll('.card-alert-options .card-opt')) : [];
  check('guest popup lists six options', opts.length === 6, 'count=' + opts.length);
  check('guest options are the account features in order',
    JSON.stringify(opts.map(o => o.textContent.trim())) ===
    JSON.stringify(['Favourites', 'Orders', 'Events', 'Saved Summaries', 'Profile', 'Gallery']),
    opts.map(o => o.textContent.trim()).join(','));
  check('guest options all route to the login page',
    opts.length === 6 && opts.every(o => o.getAttribute('href') === 'eatouts-login.html'));
  const guestCtas = guestAlert ? Array.from(guestAlert.querySelectorAll('.card-alert-actions .dlg-btn')) : [];
  const createCta = guestCtas.filter(a => a.textContent.trim() === 'Create an account')[0];
  const signinCta = guestCtas.filter(a => a.textContent.trim() === 'Sign in')[0];
  check('guest popup offers Create an account (primary, onboarding)',
    !!createCta && createCta.classList.contains('primary') &&
    createCta.getAttribute('href') === 'eatouts-user-onboarding.html');
  check('guest popup offers Sign in (login)',
    !!signinCta && signinCta.getAttribute('href') === 'eatouts-login.html');
  click(guestAlert.querySelector('.card-alert-actions [data-act="dismissCardAlert"]'));
  check('guest popup dismisses', !vp.querySelector('.card-alert'));

  check('no window errors', errors.length === 0, errors.join(' | '));

  console.log('');
  if (fails) { console.log('ABOUT TEST FAILED: ' + fails + ' failure(s)'); process.exit(1); }
  console.log('ABOUT TEST PASSED');
}, 400);
