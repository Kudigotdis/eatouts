(function () {
  var F = window.EatoutsField;
  var A = window.EatoutsAuth;
  var app = document.getElementById('sg-app');

  var TYPES = {
    restaurant: { label: 'Restaurant', blurb: 'Menus, orders, tables and delivery.' },
    caterer: { label: 'Caterer', blurb: 'Per-head menus, quotes and event orders.' },
    bakery: { label: 'Bakery', blurb: 'Cakes, breads, pastries and custom orders.' },
    liquor_store: { label: 'Liquor Store', blurb: 'Beverages, age-gated sales and delivery.' },
    food_truck: { label: 'Mobile Kitchen', blurb: 'Weekly route, live status and mobile ordering.' },
    event_supplier: { label: 'Event Supplier', blurb: 'MC, decor, security, AV and entertainment.' }
  };

  /* Each business type finishes its setup on its own onboarding form. */
  var ONBOARDING = {
    restaurant: 'restaurant-onboarding.html',
    caterer: 'caterer-onboarding.html',
    bakery: 'bakery-onboarding.html',
    liquor_store: 'bottle-store-onboarding.html',
    food_truck: 'mobile-kitchen-onboarding.html',
    event_supplier: 'supplier-onboarding.html'
  };

  function onboardingHref(v) {
    var page = ONBOARDING[v && v.business_type] || 'eatouts-business-signup.html';
    return page + '?biz=' + encodeURIComponent((v && v.id) || '');
  }

  /* Feature copy shown inside the floating popup for each type. */
  var FEATURES = {
    restaurant: [
      { label: 'Menus', title: 'Showcase Your Full Culinary Lineup', desc: 'Publish digital menus with live updates, high-res photos, allergen tags, and daily specials so diners always know what is hot.' },
      { label: 'Orders', title: 'Seamless In-App Ordering', desc: 'Accept takeaway, dine-in, and advance orders directly through the app with real-time status updates for kitchen and customer.' },
      { label: 'Tables', title: 'Effortless Table Management & Reservations', desc: 'Let customers reserve seating, check live table availability, or scan QR codes at their table for direct ordering.' },
      { label: 'Delivery', title: 'Fast Doorstep Delivery', desc: 'Reach customers wherever they are with integrated dispatching, live driver tracking, and doorstep fulfillment.' }
    ],
    liquor_store: [
      { label: 'Beverages', title: 'Curated Drinks Catalog', desc: 'Display your full selection of wines, craft beers, spirits, and mixers with tasting notes and stock levels.' },
      { label: 'Age-Gated Sales', title: 'Automated Verification & Compliance', desc: 'Built-in ID checks ensure all alcohol orders comply with legal drinking age requirements before checkout.' },
      { label: 'Delivery', title: 'Chilled Drinks to the Door', desc: 'Offer fast, temperature-controlled delivery for casual evenings, home gatherings, or last-minute celebrations.' }
    ],
    event_supplier: [
      { label: 'MC', title: 'Professional Event Hosts & Anchors', desc: 'Connect clients with experienced Master of Ceremonies to keep receptions, corporate events, and parties flowing smoothly.' },
      { label: 'Decor', title: 'Theme Setup & Event Styling', desc: 'Showcase full decor packages, lighting setups, floral designs, and table arrangements for every scale of event.' },
      { label: 'Security', title: 'Professional Event Safety Personnel', desc: 'Provide trained security teams, access control, and crowd management solutions for worry-free gatherings.' },
      { label: 'AV and Entertainment', title: 'Sound, Lights & Live Acts', desc: 'Offer full audio-visual rigs, stage lighting, live bands, and local DJs to power memorable event experiences.' }
    ],
    food_truck: [
      { label: 'Weekly Route', title: 'Map Out Your Stops', desc: 'Publish your weekly schedule, pop-up locations, and operating hours so loyal followers always know where to find you.' },
      { label: 'Live Status', title: 'Real-Time Location & Queue Updates', desc: 'Broadcast your exact live pin, current wait times, and real-time open/closed status as you move.' },
      { label: 'Mobile Ordering', title: 'Skip the Line & Pick Up Fast', desc: 'Allow customers to order ahead on their phones, pay in-app, and collect their food fresh as soon as they arrive.' }
    ],
    caterer: [
      { label: 'Per-Head Menus', title: 'Transparent Guest Pricing', desc: 'Build customizable set menus with automated cost-per-guest calculations for weddings, corporate lunches, and private dinners.' },
      { label: 'Quotes', title: 'Instant Custom Proposals', desc: 'Send tailored quotes directly to clients based on guest count, diet requests, and service staff requirements.' },
      { label: 'Event Orders', title: 'Large-Scale Catering Logistics', desc: 'Manage bulk food prep, delivery timelines, on-site setup options, and multi-course event itineraries in one place.' }
    ],
    bakery: [
      { label: 'Catalogue', title: 'Cakes, Breads, Pastries and Platters', desc: 'Build a catalogue with photos, sizes, flavours and prices — from loaves and vetkoek to tiered celebration cakes and party platters. Mark items sold out when the day\u2019s batch is gone.' },
      { label: 'Custom Orders', title: 'Take Cake Orders with a Deposit', desc: 'Customers request a date, size, flavour and message on the cake. You set the lead time and take a deposit to confirm, with the balance settled on collection or delivery.' },
      { label: 'Lead Times', title: 'Same-Day Bread, Booked-Ahead Cakes', desc: 'Set a different cut-off per item, so walk-in bread and same-day cupcakes stay orderable while large or decorated orders require notice.' }
    ]
  };

  var S = {
    type: null,
    stage: 'type',
    town: '',
    area: '',
    mode: 'claim',
    targetId: null,
    newCat: null,
    claimedId: null,
    demoLoaded: false
  };

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function user() { return A && A.isLoggedIn() ? A.getUser() : null; }
  function uid() { var u = user(); return u ? u.id : null; }
  function isAgent() {
    var u = user();
    return !!u && !!window.EatoutsRoles && ['rep','admin','platform_admin'].some(function (r) { return EatoutsRoles.hasRole(u, r); });
  }
  function toast(m) {
    try { if (window.EO && EO.toast) { EO.toast(m); return; } } catch (e) {}
    window.alert(m);
  }
  function href(p) { return location.pathname.split('/').pop() + p; }

  function normWa(raw) {
    var d = String(raw || '').replace(/\D/g, '');
    if (d.indexOf('267') === 0 && d.length > 8) d = d.slice(3);
    if (d.charAt(0) === '0') d = d.slice(1);
    if (!/^[67]\d{7}$/.test(d)) return null;
    return '267' + d;
  }
  function waLink(num) { return 'https://wa.me/' + String(num || '').replace(/\D/g, ''); }

  var SL = window.EatoutsSlug;
  function slugOf(v) { return SL ? SL.normalize((v && (v.custom_slug || v.name)) || '') : ''; }
  function linkTypeOf(t) {
    if (t === 'liquor_store') return 'bottle_store';
    if (t === 'event_supplier') return 'supplier';
    return 'restaurant';
  }
  var checkTimer = null;
  function checkLink(raw, refId, statusEl) {
    if (!statusEl) return;
    if (!SL) { statusEl.textContent = ''; return; }
    var reason = SL.reason(raw);
    if (reason) { statusEl.textContent = reason; return; }
    var s = SL.normalize(raw);
    if (typeof fetch !== 'function') { statusEl.textContent = '\u2713 ' + SL.url('bw', s); return; }
    statusEl.textContent = 'Checking \u2026';
    fetch('/api/links/check?country=bw&slug=' + encodeURIComponent(s) + '&refId=' + encodeURIComponent(refId || ''))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.available) statusEl.textContent = '\u2713 ' + (d.reason || 'Available') + ' \u2014 ' + SL.url('bw', s);
        else statusEl.textContent = '\u2717 ' + ((d && d.reason) || 'That link is not available.');
      })
      .catch(function () { statusEl.textContent = SL.url('bw', s); });
  }
  function statusChip(v) {
    if (v.closed_outcome === 'closed_lost') return '<span class="chip closed_lost">Lost</span>';
    if (v.status === 'live') return '<span class="chip live">On EatOuts</span>';
    if (v.status === 'archived') return '<span class="chip archived">Archived</span>';
    if (v.status === 'rejected') return '<span class="chip rejected">Rejected</span>';
    if (v.status === 'pending_payment') return '<span class="chip pending_payment">Payment pending</span>';
    if (v.status === 'onboarding') return '<span class="chip pending_payment">Onboarding</span>';
    if (v.status === 'pending_verification') return '<span class="chip">Verifying</span>';
    return '<span class="chip">Unclaimed</span>';
  }
  function mine(v) {
    var u = uid();
    return !!u && String(v.claimed_by_user_id || v.ownerUserId || v.ownerId || '') === String(u);
  }
  function claimable(v) { return v.status === 'unclaimed'; }

  function venuesOfType(t) {
    return F.fieldVenues().filter(function (v) { return v.business_type === t; });
  }
  function townsOf(t) {
    var seen = [];
    venuesOfType(t).forEach(function (v) { if (v.town && seen.indexOf(v.town) < 0) seen.push(v.town); });
    return seen.sort();
  }
  function areasOf(t, town) {
    var seen = [];
    venuesOfType(t).forEach(function (v) { if (v.town === town && v.area && seen.indexOf(v.area) < 0) seen.push(v.area); });
    return seen.sort();
  }
  function resultsOf(t, town, area) {
    return venuesOfType(t).filter(function (v) {
      if (town && v.town !== town) return false;
      if (area && v.area !== area) return false;
      return true;
    }).sort(function (a, b) { return String(a.name).localeCompare(String(b.name)); });
  }

  function createLocalAccount(name, whatsapp, username, password) {
    var norm = normWa(whatsapp);
    if (!norm) return Promise.resolve({ ok: false, error: 'Enter a valid Botswana phone like 71 234 567.' });
    if (String(password || '').length < 8) return Promise.resolve({ ok: false, error: 'Password must be at least 8 characters.' });
    var uname = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(uname)) return Promise.resolve({ ok: false, error: 'Username must be 3-30 characters (letters, numbers, . _ -).' });
    if (window.EatoutsUsers.byWhatsapp(norm)) return Promise.resolve({ ok: false, error: 'That WhatsApp number already has an account.' });
    var parts = String(name || '').trim().split(/\s+/);
    var salt = A.randomSalt ? A.randomSalt() : String(Date.now());
    return A.hashPassword(password, salt).then(function (hash) {
      var u = window.EatoutsUsers.create({
        firstName: parts.shift() || 'New',
        surname: parts.join(' ') || '',
        name: String(name || '').trim(),
        username: uname,
        whatsapp: norm,
        salt: salt,
        passwordHash: hash,
        type: 'business_owner',
        status: 'active',
        roles: []
      });
      if (!u) return { ok: false, error: 'Could not create the account.' };
      window.EatoutsMgrDB.upsert('users', Object.assign({}, u, { last_login_at: Date.now() }));
      A.startSession(u);
      return { ok: true, user: u };
    });
  }

  function createAccount(name, whatsapp, username, password) {
    var BA = window.EatoutsBusinessAuth;
    if (!BA || !BA.available()) return createLocalAccount(name, whatsapp, username, password);
    return BA.signup({ name: name, whatsapp: whatsapp, username: username, password: password })
      .then(function (r) {
        if (r.ok) return r;
        if (r.backend) return r;
        return createLocalAccount(name, whatsapp, username, password);
      })
      .catch(function () { return createLocalAccount(name, whatsapp, username, password); });
  }

  function doClaim(id) {
    var v = F.venueById(id);
    var u = user();
    if (!v) return { ok: false, error: 'Venue not found.' };
    if (!u) return { ok: false, error: 'Sign in first.' };
    var r = F.claim(v, u.id);
    if (!r.ok) return r;
    var b = F.bindOwner(r.venue, u.id, u.id);
    if (!b.ok) return b;
    S.claimedId = r.venue.id;
    if (window.EatoutsBusinessApi && /^rest_/.test(String(v.id))) {
      window.EatoutsBusinessApi.claim(v.id).then(function (cr) {
        if (!cr.ok || !cr.data) return;
        var venue = F.venueById(b.venue.id);
        if (!venue) return;
        if (cr.data.restaurantId) venue.serverRestaurantId = cr.data.restaurantId;
        if (cr.data.membership) venue.serverMembershipId = cr.data.membership.id;
        venue.serverClaimStatus = (cr.data.claim && cr.data.claim.status) || 'approved';
        window.EatoutsMgrDB.upsert('businesses', venue);
        if (cr.data.claim && cr.data.claim.status === 'pending') toast('Claim submitted for admin review.');
      }).catch(function () {});
    }
    return { ok: true, venue: b.venue };
  }
  function doRegister(cat, name) {
    var u = user();
    if (!u) return { ok: false, error: 'Sign in first.' };
    var v = F.normaliseVenue({ name: String(name || '').trim(), business_type: cat });
    v.status = 'unclaimed';
    v.branch_count = 1;
    v.fee_amount = F.feeFor(v, false);
    if (isAgent()) { v.pre_registered_by_rep_id = u.id; v.assigned_rep_id = u.id; }
    v.first_contacted_at = F.now();
    v.audit_log = [];
    if (!v.whatsapp) v.whatsapp = '';
    window.EatoutsMgrDB.upsert('businesses', v);
    var r = F.claim(v, u.id, isAgent() ? u.id : null);
    if (!r.ok) return r;
    var b = F.bindOwner(r.venue, u.id, u.id);
    S.claimedId = r.venue.id;

    (async function(){
      try{
        var slug = String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'business';
        await EatoutsBusinessApi.businessProfilesCreate({
          userId: u.id, slug: slug, name: String(name || '').trim(),
          status: 'draft', types: [cat], category: null, location: {},
          socials: {}, operatingHours: {}, character: [], amenities: [],
          menuTags: [], capacity: [], payments: [], reservations: {},
          setupFeePaid: 0, plan: 'starter'
        });
      }catch(e){}
    })();

    return { ok: true, venue: b.venue };
  }
  function doSaveProfile(id, vals) {
    var v = F.venueById(id);
    if (!v) return { ok: false, error: 'Venue not found.' };
    return F.updateProfile(v, vals, uid());
  }

  function loadDemo(cb) {
    if (window.EATOUTS_DEMO && window.EATOUTS_DEMO.businesses && window.EATOUTS_DEMO.menu) { S.demoLoaded = true; cb(); return; }
    var left = 2;
    function done() { if (--left === 0) { S.demoLoaded = true; cb(); } }
    ['business.js', 'menu.js'].forEach(function (f) {
      var s = document.createElement('script');
      s.src = 'assets/data/demo/the-food-place/' + f;
      s.onload = done;
      s.onerror = done;
      document.body.appendChild(s);
    });
  }

  /* ── FLOATING TYPE-INFO POPUP ── */
  var popupEl    = document.getElementById('typePopup');
  var popupScrim = document.getElementById('typePopupScrim');
  var popupTitle = document.getElementById('typePopupTitle');
  var popupBody  = document.getElementById('typePopupBody');
  var popupCta   = document.getElementById('typePopupCta');
  var popupClose = document.getElementById('typePopupClose');

  function openTypePopup(typeKey) {
    var t = TYPES[typeKey];
    var list = FEATURES[typeKey] || [];
    if (!t) return;

    popupTitle.textContent = t.label;

    var html = '';
    list.forEach(function (f) {
      html +=
        '<div class="feature">' +
          '<div class="feature-label">' + esc(f.label) + '</div>' +
          '<div class="feature-title">' + esc(f.title) + '</div>' +
          '<p class="feature-desc">' + esc(f.desc) + '</p>' +
        '</div>';
    });
    popupBody.innerHTML = html;

    popupCta.textContent = 'Get Started';
    popupCta.setAttribute('data-type', typeKey);

    popupScrim.classList.add('open');
    popupEl.classList.add('open');
    document.body.classList.add('popup-open');

    /* focus the close button for keyboard users */
    setTimeout(function(){ try { popupClose.focus(); } catch(e){} }, 60);
  }
  function closeTypePopup() {
    popupScrim.classList.remove('open');
    popupEl.classList.remove('open');
    document.body.classList.remove('popup-open');
  }

  document.addEventListener('click', function (e) {
    /* Open the popup from any element with data-type-info (static fallback
       or JS-rendered card). Prevent default so we don't navigate away. */
    var card = e.target.closest('[data-type-info]');
    if (card) {
      e.preventDefault();
      openTypePopup(card.getAttribute('data-type-info'));
      return;
    }
    /* Close handlers */
    if (e.target === popupScrim || e.target === popupClose) {
      closeTypePopup();
      return;
    }
    /* CTA — proceed to that type's flow */
    if (e.target === popupCta) {
      var typeKey = popupCta.getAttribute('data-type');
      if (typeKey && TYPES[typeKey]) {
        S.type = typeKey;
        S.stage = 'search';
        closeTypePopup();
        location.href = href('?type=' + typeKey);
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeTypePopup();
  });

  /* ── STAGE RENDERERS ── */
  function renderTypes() {
    app.innerHTML =
      '<h1 class="sg-hero">Get your business on EatOuts.</h1>' +
      '<p class="sg-sub">List and manage your business so customers across Botswana can <strong>find you, browse what you offer and order from you</strong> in the EatOuts app.</p>' +
      '<div class="choice-grid">' +
      Object.keys(TYPES).map(function (k) {
        return '<a class="choice" href="' + href('?type=' + k) + '" data-type-info="' + k + '">' +
          '<strong>' + TYPES[k].label + '</strong>' +
          '<small>' + TYPES[k].blurb + '</small>' +
        '</a>';
      }).join('') +
      '</div>' +
      '<div class="fixed">Curious what a finished listing looks like? <a href="#" data-a="demo">See a sample.</a></div>' +
      '<div class="sg-links">' +
        '<a class="btn" href="eatouts-login.html">Already registered? Sign in</a>' +
        '<a class="btn" href="ops-console.html#field">I am a field agent</a>' +
      '</div>';
    bind();
  }

  function renderSearch() {
    var t = S.type, T = TYPES[t];
    var towns = townsOf(t);
    var areas = towns && S.town ? areasOf(t, S.town) : [];
    var list = resultsOf(t, S.town, S.area);

    var sel = '<option value=""' + (S.town === '' ? ' selected' : '') + '>' + (towns.length ? 'All towns' : 'No towns yet') + '</option>' +
      towns.map(function (x) { return '<option value="' + esc(x) + '"' + (x === S.town ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');
    var area = '<option value=""' + (S.area === '' ? ' selected' : '') + '>All areas</option>' +
      areas.map(function (x) { return '<option value="' + esc(x) + '"' + (x === S.area ? ' selected' : '') + '>' + esc(x) + '</option>'; }).join('');

    var rows;
    if (!list.length) {
      rows = '<div class="sg-note">Nothing matches yet for this area. Your business can be the first — register it below.</div>';
    } else {
      rows = '<div class="sg-results">' + list.map(function (v) {
        var chips = statusChip(v);
        var btn = '';
        if (mine(v)) {
          btn = '<a class="btn btn-sm primary" href="' + esc(onboardingHref(v)) + '">Continue editing</a>';
        } else if (claimable(v)) {
          btn = '<a class="btn btn-sm primary" data-a="claim" data-id="' + esc(v.id) + '">Claim it</a>';
        } else if (v.whatsapp) {
          btn = '<a class="btn btn-sm" target="_blank" rel="noopener" href="' + waLink(v.whatsapp) + '">Talk to EatOuts</a>';
        } else {
          btn = '<span class="chip">' + esc(v.status) + '</span>';
        }
        return '<div class="res"><div class="t">' + esc(v.name) + '</div>' +
          '<div class="m">' + esc([v.area, v.town].filter(Boolean).join(', ') || T.label) + (v.whatsapp ? ' \u00b7 +' + esc(v.whatsapp).replace(/^267/, '') : '') + '</div>' +
          '<div class="row"><span>' + chips + '</span>' + btn + '</div></div>';
      }).join('') + '</div>';
    }

    app.innerHTML =
      '<a class="btn btn-sm" data-a="back">All types</a>' +
      '<div class="sg-type">' + T.label + '</div>' +
      '<p class="sg-hint">Find your business to <strong>claim it</strong>, or register a brand-new one.</p>' +
      '<label class="field"><span>Town</span><select data-c="town">' + sel + '</select></label>' +
      '<label class="field"><span>Area</span><select data-c="area"' + (S.town ? '' : ' disabled') + '>' + area + '</select></label>' +
      rows +
      '<div class="sg-links">' +
        '<a class="btn primary" data-a="register">Register a new ' + T.label + '</a>' +
        '<a href="#" data-a="demo" class="btn">See a sample listing</a>' +
        '<a class="btn" href="ops-console.html#field">I am a field agent</a>' +
      '</div>' +
      '<div class="fixed">Claiming a listed business? A EatOuts field agent may already have started it. Claiming hands it to you; your listing stays hidden until it goes live.</div>';
    bind();
  }

  function renderAccount() {
    app.innerHTML =
      '<a class="btn btn-sm" data-a="back">Back</a>' +
      '<div class="sg-type">' + (S.mode === 'register' ? 'Register your ' + TYPES[S.newCat].label : 'Claim your business') + '</div>' +
      '<p class="sg-hint">Create your free EatOuts business account to continue.</p>' +
      '<label class="field"><span>Your name</span><input id="acc-name" autocomplete="name" placeholder="e.g. Boitumelo Phiri"></label>' +
      '<label class="field"><span>WhatsApp number</span><input id="acc-wa" inputmode="tel" autocomplete="tel" placeholder="e.g. 71 829 765"></label>' +
      '<label class="field"><span>Username</span><input id="acc-username" autocapitalize="none" autocomplete="username" placeholder="e.g. kgalekitchen"></label>' +
      '<label class="field"><span>Password</span><input id="acc-pass" type="password" autocomplete="new-password" placeholder="At least 8 characters"></label>' +
      '<div class="sg-actions"><a class="btn" data-a="back">Back</a><a class="btn primary" data-a="acc-ok">Create account &amp; continue</a></div>' +
      '<div class="sg-note">Signing in as an existing EatOuts member? <a href="eatouts-login.html">Sign in instead</a>.</div>';
    bind();
  }

  function renderRegister() {
    app.innerHTML =
      '<a class="btn btn-sm" data-a="back">Back</a>' +
      '<div class="sg-type">Register a ' + TYPES[S.newCat].label + '</div>' +
      '<p class="sg-hint">Tell us the business name to get started.</p>' +
      '<label class="field"><span>Business name</span><input id="reg-name" placeholder="e.g. Kgale Kitchen"></label>' +
      '<div class="sg-actions"><a class="btn" data-a="back">Back</a><a class="btn primary" data-a="reg-ok">Create listing</a></div>';
    bind();
  }

  function renderProfile() {
    var v = F.venueById(S.claimedId);
    if (!v) { renderSearch(); return; }
    var n = function (k, vv) { var s = vv == null ? '' : String(vv); return ' value="' + esc(s) + '"'; };
    app.innerHTML =
      '<div class="sg-type">Your business</div>' +
      '<p class="sg-hint">Add the essentials people see before they order. You can keep editing later.</p>' +
      '<div class="fixed">Your listing stays hidden to customers and only goes live after your EatOuts field agent records your setup fee.</div>' +
      '<label class="field"><span>Country</span><input value="Botswana" disabled></label>' +
      '<label class="field"><span>Business name</span><input id="p-name"' + n('name', v.name) + '></label>' +
      '<label class="field"><span>Contact WhatsApp</span><input id="p-wa" inputmode="tel"' + n('wa', v.whatsapp) + '></label>' +
      '<label class="field"><span>Order WhatsApp</span><input id="p-owa" inputmode="tel"' + n('owa', v.order_whatsapp || v.whatsapp) + '></label>' +
      '<div class="sg-actions">' +
        '<label class="field" style="flex:1"><span>Town</span><input id="p-town"' + n('town', v.town) + '></label>' +
        '<label class="field" style="flex:1"><span>Area</span><input id="p-area"' + n('area', v.area) + '></label>' +
      '</div>' +
      '<label class="field"><span>Address (optional)</span><input id="p-addr"' + n('addr', v.address) + '></label>' +
      '<label class="field"><span>Description</span><textarea id="p-desc" placeholder="What do you serve? What makes you special?">' + esc(v.description) + '</textarea></label>' +
      '<label class="field"><span>Your EatOuts link</span>' +
        '<span class="sg-hint" style="margin:0 0 6px">www.eatouts.online/bw/<strong id="p-link-slug">' + esc(slugOf(v)) + '</strong></span>' +
        '<input id="p-link" value="' + esc(slugOf(v)) + '" placeholder="e.g. kgalekitchen" autocapitalize="none" autocomplete="off" spellcheck="false">' +
        '<span class="sg-hint" id="p-link-status" style="margin:6px 0 0">Letters and numbers only \u2014 no spaces. This is the address you can share.</span>' +
      '</label>' +
      '<div class="sg-actions">' +
        '<label class="field" style="flex:1"><span>Opening hours</span><input id="p-hours" placeholder="e.g. Mon\u2013Sat 8:00\u201322:00"' + n('hours', v.working_hours) + '></label>' +
        '<label class="field" style="flex:1"><span>Years in business</span><input id="p-years" inputmode="numeric"' + n('years', v.years_in_business) + '></label>' +
      '</div>' +
      '<div class="sg-actions"><a class="btn primary" data-a="profile-save">Save profile</a>' +
        '<a class="btn" href="' + esc(onboardingHref(v)) + '">Menus &amp; photos</a></div>' +
      '<div class="sg-links">' +
        (isAgent() ? '<a class="btn" href="ops-console.html#field">Open my workspace</a>' : '') +
        '<a class="btn" data-a="done">Done \u2014 I\u2019ll keep going later</a>' +
      '</div>';
    bind();
  }

  function renderDemo() {
    app.innerHTML = '<div class="fixed">Sample only \u2014 this is a preview of a fully built listing. Your listing starts at the search step and grows with you.</div>';
    var open = function () {
      var biz = (window.EATOUTS_DEMO.businesses || [])[0] || {};
      var menu = window.EATOUTS_DEMO.menu || { categories: [], items: [] };
      var cats = menu.categories || [];
      var items = (menu.items || []).slice(0, 8);
      var catName = function (c) { for (var i = 0; i < cats.length; i++) if (cats[i].id === c) return cats[i].name; return ''; };
      var rows = items.map(function (it) {
        return '<tr><td><strong>' + esc(it.name) + '</strong><br><span style="font-size:10.5px;color:#6f685d">' + esc(catName(it.category)) + '</span></td>' +
          '<td class="p">P' + (isFinite(it.price) ? Number(it.price).toFixed(2).replace(/\.00$/, '') : esc(it.price)) + '</td></tr>';
      }).join('');
      app.innerHTML =
        '<a href="#" data-a="back" class="btn btn-sm">Back</a>' +
        '<div class="sg-type">Sample listing</div>' +
        '<div class="demo-card">' +
          '<div class="demo-head">' +
            '<img class="demo-logo" src="' + esc(biz.logo || '') + '" alt="">' +
            '<div><div class="demo-name">' + esc(biz.name || 'The Food Place') + '</div>' +
            '<div class="demo-meta">' + esc([biz.area, biz.town, biz.address].filter(Boolean).join(' \u00b7 ') || 'Gaborone') + '</div></div>' +
          '</div>' +
          '<div style="padding:0 14px 12px;font-size:12.5px;color:#4a443a;line-height:1.55">' + esc((biz.about || '').slice(0, 170)) + (biz.about && biz.about.length > 170 ? '\u2026' : '') + '</div>' +
          '<div class="demo-cat">From the menu</div>' +
          '<table class="demo-menu">' + rows + '</table>' +
        '</div>' +
        '<div class="fixed">This is <strong>the same profile, menu and photos flow</strong> your listing gets \u2014 built step by step as you go.</div>' +
        '<div class="sg-links"><a href="#" class="btn primary" data-a="back">Back to signing up</a></div>';
      bind();
    };
    loadDemo(open);
  }

  function bind() {
    app.querySelectorAll('[data-a]').forEach(function (el) {
      el.addEventListener('click', function (ev) {
        ev.preventDefault();
        var a = el.getAttribute('data-a');
        if (a === 'back') {
          if (S.stage === 'demo') { S.stage = S.type ? 'search' : 'type'; render(); }
          else if (S.stage === 'account') { S.stage = S.type ? 'search' : 'type'; render(); }
          else if (S.stage === 'register') { S.stage = S.type ? 'search' : 'type'; render(); }
          else if (S.stage === 'profile') { S.stage = 'search'; render(); }
          else { S.stage = 'type'; S.type = null; render(); }
          return;
        }
        if (a === 'demo') { S.stage = 'demo'; renderDemo(); return; }
        if (a === 'claim') {
          S.mode = 'claim'; S.targetId = el.getAttribute('data-id');
          if (!user()) { S.stage = 'account'; renderAccount(); }
          else proceedClaim();
          return;
        }
        if (a === 'register') {
          S.mode = 'register'; S.newCat = S.type;
          if (!user()) { S.stage = 'account'; renderAccount(); }
          else { S.stage = 'register'; renderRegister(); }
          return;
        }
        if (a === 'acc-ok') {
          var name = document.getElementById('acc-name').value;
          var wa = document.getElementById('acc-wa').value;
          var username = document.getElementById('acc-username').value;
          var pass = document.getElementById('acc-pass').value;
          el.textContent = 'Creating\u2026';
          createAccount(name, wa, username, pass).then(function (r) {
            if (!r || !r.ok) {
              el.textContent = 'Create account & continue';
              toast((r && r.error) || 'Could not create the account.');
              return;
            }
            if (S.mode === 'register') { S.stage = 'register'; renderRegister(); }
            else proceedClaim();
          }).catch(function () {
            el.textContent = 'Create account & continue';
            toast('Network error. Try again.');
          });
          return;
        }
        if (a === 'reg-ok') {
          var nm = document.getElementById('reg-name').value.trim();
          if (!nm) { toast('Enter the business name.'); return; }
          var r = doRegister(S.newCat, nm);
          if (!r.ok) { toast(r.error); return; }
          S.stage = 'profile'; renderProfile();
          return;
        }
        if (a === 'profile-save') {
          var id = S.claimedId;
          var wa2 = document.getElementById('p-wa').value;
          var owa = document.getElementById('p-owa').value;
          var w1 = normWa(wa2), w2 = normWa(owa);
          if (wa2.trim() && !w1) { toast('Contact WhatsApp must be a valid Botswana number.'); return; }
          if (owa.trim() && !w2) { toast('Order WhatsApp must be a valid Botswana number.'); return; }
          var linkInput = document.getElementById('p-link');
          var slug = SL ? SL.normalize(linkInput ? linkInput.value : '') : '';
          if (slug && (!SL || !SL.isValid(slug))) { toast(SL ? SL.reason(linkInput.value) : 'Choose a valid link name.'); return; }
          var vv0 = F.venueById(id);
          var r2 = doSaveProfile(id, {
            name: document.getElementById('p-name').value.trim(),
            whatsapp: w1 || document.getElementById('p-wa').value.trim(),
            order_whatsapp: w2 || (owa.trim() ? owa.trim() : (w1 || '')),
            town: document.getElementById('p-town').value.trim(),
            area: document.getElementById('p-area').value.trim(),
            address: document.getElementById('p-addr').value.trim(),
            description: document.getElementById('p-desc').value.trim(),
            working_hours: document.getElementById('p-hours').value.trim(),
            years_in_business: document.getElementById('p-years').value.trim(),
            custom_slug: slug || undefined
          });
          if (!r2.ok) { toast(r2.error); return; }
          if (slug && typeof fetch === 'function') {
            fetch('/api/business/link', {
              method: 'POST', credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ country: 'bw', type: linkTypeOf(S.type), refId: id, slug: slug, name: (vv0 && vv0.name) || '' })
            }).then(function (r) { return r.json(); }).then(function (d) {
              if (d && d.ok && d.link) toast('Link saved \u2014 www.eatouts.online/bw/' + d.link.slug);
              if (d && d.ok) {
                var venue = F.venueById(id);
                if (venue) {
                  if (d.restaurantId) venue.serverRestaurantId = d.restaurantId;
                  if (d.membership) venue.serverMembershipId = d.membership.id;
                  if (d.claim) venue.serverClaimStatus = d.claim.status;
                  window.EatoutsMgrDB.upsert('businesses', venue);
                }
              }
            }).catch(function () {});
          }
          toast('Saved');
          renderProfile();
          return;
        }
        if (a === 'done') { location.href = 'index.html#promos'; return; }
      });
    });
    app.querySelectorAll('[data-c]').forEach(function (el) {
      el.addEventListener('change', function () {
        var c = el.getAttribute('data-c');
        if (c === 'town') { S.town = el.value; S.area = ''; }
        if (c === 'area') S.area = el.value;
        renderSearch();
      });
    });
    var accName = document.getElementById('acc-name');
    var accUser = document.getElementById('acc-username');
    if (accName && accUser && window.EatoutsBusinessAuth) {
      var userTouched = false;
      accUser.addEventListener('input', function () { userTouched = true; });
      accName.addEventListener('input', function () {
        if (!userTouched) accUser.value = window.EatoutsBusinessAuth.usernameFor(accName.value);
      });
    }
    var linkEl = document.getElementById('p-link');
    if (linkEl) {
      var slugDisplay = document.getElementById('p-link-slug');
      var status = document.getElementById('p-link-status');
      var paint = function () {
        var s = SL ? SL.normalize(linkEl.value) : linkEl.value;
        if (slugDisplay) slugDisplay.textContent = s;
      };
      linkEl.addEventListener('input', function () {
        paint();
        clearTimeout(checkTimer);
        checkTimer = setTimeout(function () { checkLink(linkEl.value, S.claimedId, status); }, 450);
      });
      paint();
    }
  }

  function proceedClaim() {
    var r = doClaim(S.targetId);
    if (!r.ok) { toast(r.error); S.stage = S.type ? 'search' : 'type'; render(); return; }
    toast('Claimed \u2014 welcome!');
    S.stage = 'profile'; renderProfile();
  }

  function render() {
    if (S.stage === 'type') renderTypes();
    else if (S.stage === 'search') renderSearch();
    else if (S.stage === 'account') renderAccount();
    else if (S.stage === 'register') renderRegister();
    else if (S.stage === 'profile') renderProfile();
    else renderTypes();
  }

  /* boot */
  var params = new URLSearchParams(location.search);
  var t = params.get('type');
  var claim = params.get('claim');
  if (t && TYPES[t]) { S.type = t; S.stage = 'search'; }
  else if (claim) {
    S.mode = 'claim'; S.targetId = claim; S.stage = 'search';
    if (S.type === null) {
      var cv = F.venueById(claim);
      if (cv && TYPES[cv.business_type]) S.type = cv.business_type;
    }
    if (S.type === null) { S.stage = 'type'; S.targetId = null; }
  }
  render();
})();
