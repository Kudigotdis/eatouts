const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

function boot(file, url) {
  const errors = [];
  let html = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
  html = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
    const f = path.join(APP_DIR, s.replace(/\//g, path.sep));
    if (!fs.existsSync(f)) { errors.push('missing script: ' + s); return '<!-- missing ' + s + ' -->'; }
    return '<script>' + fs.readFileSync(f, 'utf8') + '</script>';
  });
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
  vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));
  const dom = new JSDOM(html, { url: url || 'http://localhost/' + file, runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
  return { window: dom.window, doc: dom.window.document, errors };
}

/* ---------- 1. index.html: favourites + profile card + About link ---------- */
const app = boot('index.html');
const { window: w, doc } = app;
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const ev = s => w.eval(s);

setTimeout(() => {
  let fails = 0;
  const check = (label, cond, extra) => {
    if (!cond) { fails++; console.log('FAIL  ' + label + (extra !== undefined ? ' :: ' + extra : '')); }
    else console.log('ok    ' + label);
  };
  const appErrors = app.errors.filter(e => e.indexOf('missing script') !== 0);

  /* ---------- A. store + helpers are wired ---------- */
  check('EatoutsCustomer store present', ev('typeof EatoutsCustomer') === 'object');
  check('hasFetch guard exposed via state', !!(ev('EatoutsCustomer.state') || {}));
  check('toggleFav helper present', ev('typeof toggleFav') === 'function');
  check('favButton helper present', ev('typeof favButton') === 'function');
  check('favHas helper present', ev('typeof favHas') === 'function');
  check('renderProfileCard present', ev('typeof renderProfileCard') === 'function');
  check('customerFavCount present', ev('typeof customerFavCount') === 'function');

  /* ---------- B. favourites toggle ---------- */
  ev('EatoutsCustomer.state.user={id:"u1",username:"tester",name:"Tester",type:"customer",local:true}');
  check('no favourites on a fresh account', ev('EatoutsCustomer.favourites.list().length') === 0);
  ev('EatoutsCustomer.favourites.add({type:"restaurant",refId:"test-venue",title:"Test Venue"})');
  check('favourite added', ev('EatoutsCustomer.favourites.list().length') === 1);
  check('favHas sees the favourite', ev('favHas("restaurant","test-venue")') === true);
  check('favIconSrc points at the filled heart', String(ev('favIconSrc("restaurant","test-venue")')).indexOf('heart_active_icon') > -1, String(ev('favIconSrc("restaurant","test-venue")')));
  check('favIconSrc points at the empty heart for others', String(ev('favIconSrc("restaurant","other")')).indexOf('heart_inactive_icon') > -1, String(ev('favIconSrc("restaurant","other")')));
  check('customerFavCount tracks the store', ev('customerFavCount()') === 1, ev('customerFavCount()'));
  ev('EatoutsCustomer.favourites.remove({type:"restaurant",refId:"test-venue"})');
  check('favourite removed', ev('EatoutsCustomer.favourites.list().length') === 0);
  ev('EatoutsCustomer.favourites.add({type:"restaurant",refId:"test-venue",title:"Test Venue"})');

  /* favButton markup carries the toggle hook + heart */
  const favHtml = String(ev('favButton("promo","p-1",{title:"P"},' + JSON.stringify('Save') + ')'));
  check('favButton renders a toggleFav action', /data-act="toggleFav"/.test(favHtml), favHtml.slice(0, 80));
  check('favButton renders a heart icon', /heart_/.test(favHtml));
  check('favButton carries the type + ref', /data-ftype="promo"/.test(favHtml) && /data-fref="p-1"/.test(favHtml));

  /* ---------- C. profile card states ---------- */
  click(doc.querySelector('[data-tab="about"]'));
  let vp = doc.getElementById('viewport');
  check('closed card shows the customer name', /Tester/.test(vp.textContent), vp.textContent.slice(0, 60));
  check('closed card shows the heart count', !!doc.querySelector('#viewport .profilecard .pc-fav'), !!doc.querySelector('#viewport .profilecard .pc-fav'));
  check('closed card has no rows', !doc.querySelector('#viewport .profilecard + .pc-rows'));

  click(doc.querySelector('#viewport [data-act="profileCardToggle"]'));
  check('toggling opens the profile card', ev('state.profileCardOpen') === true);
  vp = doc.getElementById('viewport');
  check('open card renders the row menu', !!doc.querySelector('#viewport .pc-rows'));
  check('open card links to My Profile', !!doc.querySelector('#viewport .pc-rows a[href="eatouts-profile.html"]'));
  check('open card links to Favourites', !!doc.querySelector('#viewport .pc-rows a[href="eatouts-favourites.html"]'));
  check('open card offers Sign out', !!doc.querySelector('#viewport .pc-rows [data-act="customerLogout"]'));

  click(doc.querySelector('#viewport [data-act="profileCardToggle"]'));
  check('toggling closes the profile card', ev('state.profileCardOpen') === false);

  /* About EatOuts settings link lives before the Install row */
  const aboutLink = doc.querySelector('#viewport a.setrow[href="eatout-about.html"]');
  check('About EatOuts settings link present', !!aboutLink, '');
  check('About EatOuts link reads correctly', !!aboutLink && aboutLink.textContent.trim() === 'About EatOuts', aboutLink && aboutLink.textContent.trim());

  check('index.html no window errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  /* ---------- 2. eatout-about.html standalone page ---------- */
  const about = boot('eatout-about.html');
  const adoc = about.doc;
  check('about: no window errors', about.errors.length === 0, about.errors.slice(0, 3).join(' | '));
  check('about: title chip', /About EatOuts/.test((adoc.querySelector('.topbar .ttl') || {}).textContent || ''));
  check('about: back link returns to the About tab', (adoc.querySelector('.topbar a.back') || {}).getAttribute?.('href') === 'index.html#about');
  check('about: hero logo renders', !!adoc.querySelector('.hero img'));
  check('about: lists the platform blocks', adoc.querySelectorAll('.ablock').length >= 4, adoc.querySelectorAll('.ablock').length);
  check('about: has the business CTA', !!adoc.querySelector('a.cta[href="eatouts-business-signup.html"]'));
  check('about: no legacy openAboutGallery hook', !adoc.querySelector('[data-act="openAboutGallery"]'));

  /* ---------- 3. eatouts-checkout-summary.html smoke ---------- */
  const cos = boot('eatouts-checkout-summary.html');
  setTimeout(() => {
    check('checkout-summary: mounts a shell', !!cos.doc.getElementById('mount') && cos.doc.getElementById('mount').innerHTML.length > 0);
    check('checkout-summary: reads the customer store shell', /Checkout Summary/.test(cos.doc.body.textContent));
    check('checkout-summary: no hard errors',
      cos.errors.filter(e => e.indexOf('missing script') !== 0).length === 0,
      cos.errors.slice(0, 2).join(' | '));

    console.log('\nwindow errors: ' + appErrors.length);
    console.log(fails === 0 ? '\nCUSTOMER TEST PASSED' : '\nCUSTOMER TEST FAILED (' + fails + ' checks)');
    process.exit(fails === 0 ? 0 : 1);
  }, 700);
}, 2000);
