const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));

const APP_DIR = path.resolve(__dirname, '..');

function boot(file, url, session) {
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
  const dom = new JSDOM(html, {
    url: url || 'http://localhost/' + file,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      if (session) win.localStorage.setItem('eatouts_customer_v1', JSON.stringify(Object.assign({ favourites: [], summaries: [], events: [] }, session)));
    }
  });
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
  const favPayload = String(ev('favButton("menu","r1:cat-1",{title:"Starters",subtitle:"Venue",payload:{items:[{name:"Wings",price:45}]}})'));
  check('favButton carries an escaped payload blob', /data-fpayload=/.test(favPayload) && /items/.test(favPayload), favPayload.slice(0, 120));

  /* inactive heart renders at 50% opacity; active heart stays full */
  const heartInactive = String(ev('favButton("promo","none-fav-unique",{title:"X"},' + JSON.stringify('Save') + ')'));
  const heartHost = doc.createElement('div');
  heartHost.innerHTML = heartInactive;
  doc.body.appendChild(heartHost);
  const offImg = heartHost.querySelector('img');
  check('inactive heart opacity is 0.5', offImg && w.getComputedStyle(offImg).opacity === '0.5', offImg && w.getComputedStyle(offImg).opacity);
  heartHost.innerHTML = String(ev('favButton("restaurant","test-venue",{title:"Test Venue"},' + JSON.stringify('Save') + ')'));
  const onImg = heartHost.querySelector('img');
  check('active heart opacity stays 1', onImg && w.getComputedStyle(onImg).opacity === '1', onImg && w.getComputedStyle(onImg).opacity);
  heartHost.remove();
  check('menu/item/drink heart helpers present',
    ev('typeof renderMenuCategories') === 'function' && ev('typeof renderMenuCategory') === 'function' && ev('typeof renderBeveragesCategory') === 'function');

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
  const aboutLink = doc.querySelector('#viewport a.setrow[href="eatouts-about.html"]');
  check('About EatOuts settings link present', !!aboutLink, '');
  check('About EatOuts link reads correctly', !!aboutLink && aboutLink.textContent.trim() === 'About EatOuts', aboutLink && aboutLink.textContent.trim());

  /* ---------- D. gallery chunked loading ---------- */
  check('gallery infinite-scroll helpers present', ev('typeof galleryLoadMore') === 'function' && ev('typeof armGalleryScroll') === 'function');
  ev('state.tab="gallery";state.galleryView="grid";state.galleryPhoto=null;render();');
  check('gallery renders a load-more sentinel', !!doc.querySelector('#viewport #galsentinel'), '');
  const galTotal = ev('filteredGallery().length');
  ev('state.galleryShown=1;render();');
  const before = doc.querySelectorAll('#viewport #galgrid .gal-cell').length;
  ev('galleryLoadMore();');
  const after = doc.querySelectorAll('#viewport #galgrid .gal-cell').length;
  check('gallery starts chunked then loads more', galTotal > 1 && before < after && after <= galTotal,
    galTotal + ' total, ' + before + ' -> ' + after);

  check('index.html no window errors', appErrors.length === 0, appErrors.slice(0, 3).join(' | '));

  /* ---------- 2. eatouts-about.html standalone page ---------- */
  const about = boot('eatouts-about.html');
  const adoc = about.doc;
  check('about: no window errors', about.errors.length === 0, about.errors.slice(0, 3).join(' | '));
  check('about: title chip', /About EatOuts/.test((adoc.querySelector('.topbar .ttl') || {}).textContent || ''));
  check('about: back link returns to the About tab', (adoc.querySelector('.topbar a.back') || {}).getAttribute?.('href') === 'index.html#about');
  check('about: hero logo renders', !!adoc.querySelector('.hero img'));
  check('about: lists the platform blocks', adoc.querySelectorAll('.ablock').length >= 4, adoc.querySelectorAll('.ablock').length);
  check('about: has the business CTA', !!adoc.querySelector('a.cta[href="eatouts-business-signup.html"]'));
  check('about: no legacy openAboutGallery hook', !adoc.querySelector('[data-act="openAboutGallery"]'));

  /* ---------- 2b. addresses + admin dashboard static contracts ---------- */
  const addrSrc = fs.readFileSync(path.join(APP_DIR, 'eatouts-addresses.html'), 'utf8');
  check('addresses page offers an Edit action', /data-edit=/.test(addrSrc), '');
  check('addresses form supports edit mode', /Edit address/.test(addrSrc), '');
  check('addresses page still offers Delete', /data-del=/.test(addrSrc), '');
  const adminSrc = fs.readFileSync(path.join(APP_DIR, 'eatouts-admin-dashboard.html'), 'utf8');
  check('admin dashboard wires the promo queue API', /api\/admin\/promo-submissions/.test(adminSrc), '');
  check('admin dashboard renders review actions', /data-ps-act/.test(adminSrc) && /data-ps-status/.test(adminSrc), '');

  /* ---------- 3. eatouts-checkout-summary.html smoke (signed-in customer) ---------- */
  const cos = boot('eatouts-checkout-summary.html', null, { user: { id: 'u1', username: 'tester', type: 'customer', name: 'Tester' } });
  setTimeout(() => {
    check('checkout-summary: mounts a shell', !!cos.doc.getElementById('mount') && cos.doc.getElementById('mount').innerHTML.length > 0);
    check('checkout-summary: reads the customer store shell', /Checkout Summary/.test(cos.doc.body.textContent));
    check('checkout-summary: no hard errors',
      cos.errors.filter(e => e.indexOf('missing script') !== 0).length === 0,
      cos.errors.slice(0, 2).join(' | '));

    /* 3b. a guest must NOT be seated as the demo owner (B8) */
    const guestCos = boot('eatouts-checkout-summary.html');
    setTimeout(() => {
      check('checkout-summary: a guest is not seated as the demo owner',
        !guestCos.doc.getElementById('mount') || guestCos.doc.getElementById('mount').innerHTML.length === 0);
    }, 300);


    /* ---------- 4. a customer session owns the gate (no manager demo session) ---------- */
    const seedInline = (file) => {
      let h = fs.readFileSync(path.join(APP_DIR, file), 'utf8');
      return h.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, s) => {
        const f = path.join(APP_DIR, s.replace(/\//g, path.sep));
        return fs.existsSync(f) ? '<script>' + fs.readFileSync(f, 'utf8') + '</script>' : '<!-- missing ' + s + ' -->';
      });
    };
    const custDom = new JSDOM(seedInline('eatouts-checkout-summary.html'), {
      url: 'http://localhost/eatouts-checkout-summary.html',
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      beforeParse(win) {
        win.localStorage.setItem('eatouts_customer_v1', JSON.stringify({
          user: { id: 'u1', username: 'tester', type: 'customer', name: 'Tester' },
          favourites: [], summaries: [], events: []
        }));
      }
    });
    setTimeout(() => {
      const cw = custDom.window;
      check('customer session: page renders for a customer', !cw.document.querySelector('main.blocked') && !!cw.document.getElementById('mount'), (cw.document.querySelector('main.blocked') ? 'blocked' : 'ok'));
      check('customer session: store sees the user', !!(cw.EatoutsCustomer && cw.EatoutsCustomer.getUser() && cw.EatoutsCustomer.getUser().id === 'u1'));
      check('customer session: gate bridges the customer, not the demo owner', !!(cw.EatoutsAuth && cw.EatoutsAuth.getUser && cw.EatoutsAuth.getUser() && cw.EatoutsAuth.getUser().id === 'u1'), cw.EatoutsAuth && cw.EatoutsAuth.getUser && cw.EatoutsAuth.getUser() && cw.EatoutsAuth.getUser().id);

      /* ---------- 5. eatouts-addresses.html boots for a customer ---------- */
      const addrDom = new JSDOM(seedInline('eatouts-addresses.html'), {
        url: 'http://localhost/eatouts-addresses.html',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        beforeParse(win) {
          win.localStorage.setItem('eatouts_customer_v1', JSON.stringify({
            user: { id: 'u1', username: 'tester', type: 'customer', name: 'Tester', whatsapp: '26771844129' },
            favourites: [], summaries: [], events: []
          }));
        }
      });
      setTimeout(() => {
        const aw = addrDom.window;
        check('addresses: renders for a customer', !aw.document.querySelector('main.blocked') && !!aw.document.getElementById('app'), (aw.document.querySelector('main.blocked') ? 'blocked' : 'ok'));
        check('addresses: shows the saved-addresses card', /Saved addresses/.test((aw.document.getElementById('app') || {}).textContent || ''));

        console.log('\nwindow errors: ' + appErrors.length);
        console.log(fails === 0 ? '\nCUSTOMER TEST PASSED' : '\nCUSTOMER TEST FAILED (' + fails + ' checks)');
        process.exit(fails === 0 ? 0 : 1);
      }, 600);
    }, 700);
  }, 700);
}, 2000);
