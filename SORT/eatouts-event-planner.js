/* ============================================================
   EATOUTS EVENT PLANNER
   Composer for venue events with full supplier integration.

   Depends on: EatoutsDB, EatoutsAuth, EatoutsBrand,
               EATOUTS_SUPPLIER_CATALOG
   Exposes:    window.EatoutsEventPlanner
   ============================================================ */
(function(){
  'use strict';

  /* ---------- constants ---------- */
  var DRAFT_KEY = 'eatouts_event_planner_draft_v2';

  var EVENT_TYPES = [
    'Live Music / DJ Night','Match Day Screening','Ladies Night','Lads Night',
    'Poetry / Spoken Word','Comedy Night','Karaoke Night','Quiz / Trivia Night',
    'Chisanyama / Braai','Tasting Menu','Guest Chef Evening','Wine / Beer Tasting',
    'Coffee Cupping','Cocktail Masterclass','Pop-Up / Collab','Product Launch',
    'Brand Activation','Holiday Special','Family Funday','Sunday Roast',
    'Birthday / Private Party','Corporate Dinner','Kids Party',
    'Wedding Reception','Conference','Other'
  ];

  var THEMES = [
    'Heritage','Independence','Christmas','New Year',"Valentine's",
    "Women's Day","Men's Day",'Youth','Football','Rugby','Africa Day',
    'Oktoberfest','Diwali','Eid','Easter'
  ];

  var DIETARY = ['Vegetarian','Vegan','Halal','Gluten-free','Dairy-free','Nut-free'];

  var MENU_MODES = [
    { v:'full',    label:'Full menu available' },
    { v:'event',   label:'Event-only menu' },
    { v:'set',     label:'Set menu / set price' },
    { v:'limited', label:'Limited selections' }
  ];

  var BOOKING_METHODS = [
    { v:'whatsapp', label:'WhatsApp (preferred)' },
    { v:'call',     label:'Phone call' },
    { v:'inapp',    label:'In-app RSVP' },
    { v:'walkin',   label:'Walk-in only' }
  ];

  var AGE_BRACKETS = ['All ages','18+','21+','Family-friendly'];

  var SUPPLIER_STATUSES = [
    { v:'needed',    label:'Needed',    colour:'#c9c2b3' },
    { v:'contacted', label:'Contacted', colour:'#8a6a1a' },
    { v:'quoted',    label:'Quoted',    colour:'#24476e' },
    { v:'confirmed', label:'Confirmed', colour:'#4a6b2a' },
    { v:'paid',      label:'Paid',      colour:'#17834b' }
  ];

  /* ============================================================
     TEN TEMPLATES
     Each pre-fills: basics, food, booking, supplier types to
     engage, and how many performers to plan for.
     ============================================================ */
  var TEMPLATES = {
    live: {
      icon: '🎤',
      name: 'Live Music / DJ Night',
      blurb: 'Band or DJ, drink specials, late kitchen.',
      fill: {
        type:'Live Music / DJ Night',
        themes:['Heritage','Africa Day'],
        shortDesc:'Live music, cold drinks and a late-night menu.',
        longDesc:'Join us for an evening of live music, drinks specials and a late-night menu. Doors 18:00, music from 19:00. Table reservations recommended for groups of 4+.',
        menuMode:'event',
        coverCharge:'Free entry',
        bookingMethod:'whatsapp',
        ageBracket:'18+',
        suppliers:['pa','lighting','dj','staticsecurity','photographer']
      }
    },
    match: {
      icon: '⚽',
      name: 'Match Day Screening',
      blurb: 'Wide-screen football, wings, beer buckets.',
      fill: {
        type:'Match Day Screening',
        themes:['Football','Rugby'],
        shortDesc:'Every kick, live on the big screen.',
        longDesc:'Catch every match live on the wide screen. Wing platters and beer buckets available all game. Kick-off 20:00, doors 18:30. Family seating at the back.',
        menuMode:'event',
        coverCharge:'Free entry',
        bookingMethod:'whatsapp',
        ageBracket:'Family-friendly',
        suppliers:['visual','pa','food','bar','staticsecurity']
      }
    },
    ladies: {
      icon: '💃',
      name: 'Ladies Night',
      blurb: '2-for-1 cocktails, DJ, welcome drink.',
      fill: {
        type:'Ladies Night',
        themes:["Women's Day"],
        shortDesc:'Cocktails, music and a welcome drink for the ladies.',
        longDesc:'2-for-1 cocktails, a live DJ and a complimentary welcome drink for ladies before 21:00.',
        menuMode:'event',
        coverCharge:'Free entry',
        bookingMethod:'whatsapp',
        ageBracket:'18+',
        suppliers:['dj','bartender','lighting','photographer']
      }
    },
    tasting: {
      icon: '🍽',
      name: 'Tasting Menu',
      blurb: 'Five-course set menu with wine pairing.',
      fill: {
        type:'Tasting Menu',
        themes:[],
        shortDesc:'A five-course journey through our kitchen.',
        longDesc:'Chef presents five courses paired with wines. Limited to 20 guests per sitting. Two sittings: 18:30 and 20:30.',
        menuMode:'set',
        coverCharge:'P450 per person',
        bookingMethod:'whatsapp',
        ageBracket:'18+',
        suppliers:['food','equipment','waitron','florist','photographer']
      }
    },
    corporate: {
      icon: '💼',
      name: 'Corporate Dinner',
      blurb: 'Private room, set menu, presentation setup.',
      fill: {
        type:'Corporate Dinner',
        themes:[],
        shortDesc:'Private dining for teams and clients.',
        longDesc:'Fully private room with projector, screen and PA. Set three-course menu. Minimum 12 guests, maximum 40. Booking required two weeks in advance.',
        menuMode:'set',
        coverCharge:'P350 per person',
        bookingMethod:'whatsapp',
        ageBracket:'All ages',
        suppliers:['food','equipment','waitron','visual','mics','photographer']
      }
    },
    family: {
      icon: '👨‍👩‍👧',
      name: 'Family Funday',
      blurb: 'Kids menu, family platters, entertainment.',
      fill: {
        type:'Family Funday',
        themes:[],
        shortDesc:'A relaxed family lunch with something for the kids.',
        longDesc:'Sunday family lunch with a dedicated kids menu, family sharing platters and live entertainment for the little ones.',
        menuMode:'full',
        coverCharge:'Free entry',
        bookingMethod:'whatsapp',
        ageBracket:'Family-friendly',
        suppliers:['food','waitron','mc','contemporary','photographer']
      }
    },
    wedding: {
      icon: '💒',
      name: 'Wedding Reception',
      blurb: 'Large garden venue, full styling, MC, band.',
      fill: {
        type:'Wedding Reception',
        themes:['Heritage'],
        shortDesc:'A reception to remember — food, music, dancing.',
        longDesc:'Garden reception with plated dinner service, live band and DJ, MC, and full floral styling. Capacity: 120 seated, 200 standing.',
        menuMode:'set',
        coverCharge:'By invitation',
        bookingMethod:'whatsapp',
        ageBracket:'All ages',
        suppliers:['tent','ablution','power','flooring','staging','food','equipment','bar','waitron','stylist','florist','furniture','draping','printing','pa','mics','lighting','mc','band','dj','cultural','staticsecurity','parking','photographer','videographer','planner','onday']
      }
    },
    poetry: {
      icon: '🎙',
      name: 'Poetry & Arts Night',
      blurb: 'Spoken word, live music, café drinks.',
      fill: {
        type:'Poetry / Spoken Word',
        themes:['Heritage','Africa Day'],
        shortDesc:'One stage. Countless voices.',
        longDesc:'Open-mic poetry, spoken word and live music. Doors 18:00, performances 19:00–23:00. Café menu and light refreshments.',
        menuMode:'limited',
        coverCharge:'P100 early bird / P150 at the door',
        bookingMethod:'whatsapp',
        ageBracket:'All ages',
        suppliers:['mics','pa','lighting','mc','cultural','photographer','videographer']
      }
    },
    birthday: {
      icon: '🎂',
      name: 'Birthday Party',
      blurb: 'Themed decor, braai station, DJ, photo booth.',
      fill: {
        type:'Birthday / Private Party',
        themes:[],
        shortDesc:'Food, music, cake — the works.',
        longDesc:'Private birthday celebration with braai station, DJ, themed decor and photo booth. Capacity depends on venue.',
        menuMode:'event',
        coverCharge:'By invitation',
        bookingMethod:'whatsapp',
        ageBracket:'All ages',
        suppliers:['food','equipment','bar','stylist','printing','dj','photobooth','parking']
      }
    },
    launch: {
      icon: '🚀',
      name: 'Product Launch',
      blurb: 'Brand activation, keynote, LED wall, canapés.',
      fill: {
        type:'Product Launch',
        themes:[],
        shortDesc:'A launch that lands.',
        longDesc:'Brand activation with keynote speaker, product reveal on LED wall, canapé service and cocktail bar. Standing reception: 80–150.',
        menuMode:'limited',
        coverCharge:'By invitation',
        bookingMethod:'whatsapp',
        ageBracket:'18+',
        suppliers:['food','bar','equipment','visual','lighting','pa','mics','keynote','mc','photographer','videographer','streaming','staticsecurity','parking']
      }
    }
  };

  /* ---------- state ---------- */
  var state = {
    draft: null,
    openStep: 'basics',
    openSupplierCat: null,   /* which supplier category is expanded */
    restaurant: null,
    content: null,
    menuIndex: null,
    catalog: null,
    dirty: false
  };

  var els = {};
  var autosaveTimer = null;

  /* ---------- utils ---------- */
  function esc(s){
    return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function uid(p){ return (p||'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
  function toast(m){
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = m; t.classList.add('on');
    clearTimeout(toast._t);
    toast._t = setTimeout(function(){ t.classList.remove('on'); }, 2000);
  }
  function money(n){ return 'P' + (Number(n)||0).toFixed(2); }
  function dateLabel(iso){
    if(!iso) return '';
    try { return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }
    catch(e){ return iso; }
  }
  function timeLabel(hhmm){
    if(!hhmm) return '';
    var p = String(hhmm).split(':');
    if (p.length < 2) return hhmm;
    var h = parseInt(p[0],10), m = p[1], ap = h>=12?'pm':'am', h12 = h%12 || 12;
    return h12 + ':' + m + ap;
  }

  /* ============================================================
     DRAFT SHAPE
     ============================================================ */
  function blankDraft(){
    return {
      id: uid('evt'),
      status: 'draft',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      publishedAt: null,

      /* basics */
      name: '', type: EVENT_TYPES[0], themes: [],
      shortDesc: '', longDesc: '',
      coverImage: '', sponsor: '', templateUsed: '',

      /* schedule */
      startDate: '', startTime: '', endDate: '', endTime: '',
      recurring: false, recurrence: [],
      roomArea: '', expectedGuests: null, maxCapacity: null,

      /* food & drink */
      menuMode: 'full',
      featuredDishes: [],
      featuredNote: '',
      drinkSpecials: '',
      dietaryOptions: [],
      coverCharge: '',
      minimumSpend: null,
      depositRequired: false,
      depositAmount: null,
      preorderEnabled: false,

      /* suppliers — array of
         { id, categoryId, typeId, name, contact, status, cost, notes, savedId } */
      suppliers: [],

      /* booking */
      bookingMethod: 'whatsapp',
      bookingContactId: null,
      bookingOpenDate: '', bookingCloseDate: '',
      minGuests: 2, maxGuests: 12,
      sameDayBooking: true, tableRequired: false,
      ageBracket: 'All ages',
      cancellationPolicy: '',

      /* performers */
      performances: [],
      soundCheckTime: '', greenRoomNotes: ''
    };
  }

  /* ============================================================
     PERSISTENCE
     ============================================================ */
  function saveDraft(){
    try {
      state.draft.updatedAt = Date.now();
      localStorage.setItem(DRAFT_KEY, JSON.stringify(state.draft));
      state.dirty = false;
      paintHeaderStatus();
    } catch(e){ console.warn('[planner] save failed', e); }
  }
  function loadDraft(){
    try {
      var raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return blankDraft();
      return Object.assign(blankDraft(), JSON.parse(raw));
    } catch(e){ return blankDraft(); }
  }

  /* ============================================================
     RESTAURANT CONTEXT
     ============================================================ */
  function loadRestaurantContext(){
    try {
      var db = EatoutsDB.load();
      var r = EatoutsDB.active(db);
      if (!r) return;
      state.restaurant = r;
      state.content = EatoutsDB.resolveContent(r.id, db) || {};
      state.menuIndex = buildMenuIndex(state.content);
    } catch(e){ console.warn('[planner] context failed', e); }
  }
  function buildMenuIndex(content){
    var cats  = (content && content.menuCategories) || [];
    var items = (content && content.menuItems) || [];
    var byId = {};
    items.forEach(function(it){ byId[it.id] = it; });
    return {
      categories: cats.slice().sort(function(a,b){ return (a.order||0)-(b.order||0); }),
      items: items,
      itemsById: byId
    };
  }
  function happyHourOverlap(){
    var d = state.draft;
    if (!d.startTime || !d.endTime) return null;
    var profile = (state.content && state.content.profile) || {};
    var hh = profile.operating_hours && profile.operating_hours.weekday_late && profile.operating_hours.weekday_late.happy_hour;
    if (!hh || !hh.start || !hh.end) return null;
    function mins(s){ var p = String(s).split(':'); return (+p[0])*60 + (+p[1]||0); }
    var evs=mins(d.startTime), eve=mins(d.endTime), hs=mins(hh.start), he=mins(hh.end);
    if (evs < he && eve > hs) return { start:hh.start, end:hh.end };
    return null;
  }

  /* ============================================================
     SUPPLIER HELPERS
     ============================================================ */
  function catalog(){ return state.catalog || { categories: [] }; }
  function findCategory(cid){
    var cats = catalog().categories;
    for (var i=0;i<cats.length;i++) if (cats[i].id === cid) return cats[i];
    return null;
  }
  function findType(cid, tid){
    var cat = findCategory(cid);
    if (!cat) return null;
    for (var i=0;i<cat.types.length;i++) if (cat.types[i].id === tid) return cat.types[i];
    return null;
  }
  function supplierFor(cid, tid){
    return state.draft.suppliers.find(function(s){
      return s.categoryId === cid && s.typeId === tid;
    }) || null;
  }
  function addSupplier(cid, tid){
    if (supplierFor(cid, tid)) return;
    state.draft.suppliers.push({
      id: uid('sup'),
      categoryId: cid,
      typeId: tid,
      name: '',
      contact: '',
      status: 'needed',
      cost: null,
      notes: ''
    });
    state.dirty = true;
  }
  function removeSupplierByType(cid, tid){
    state.draft.suppliers = state.draft.suppliers.filter(function(s){
      return !(s.categoryId === cid && s.typeId === tid);
    });
    state.dirty = true;
  }
  function supplierBudget(){
    return state.draft.suppliers.reduce(function(sum, s){
      return sum + (Number(s.cost) || 0);
    }, 0);
  }
  function suppliersConfirmed(){
    return state.draft.suppliers.filter(function(s){
      return s.status === 'confirmed' || s.status === 'paid';
    }).length;
  }

  /* ============================================================
     RENDER
     ============================================================ */
  function paintHeaderStatus(){
    var s = els.hdr; if (!s || !state.draft) return;
    if (state.draft.status === 'published') { s.classList.add('on'); s.textContent = 'Published'; }
    else { s.classList.remove('on'); s.textContent = state.dirty ? 'Editing…' : 'Draft saved'; }
  }

  function render(){
    if (!state.draft) state.draft = loadDraft();
    paintHeaderStatus();

    var html = '';
    html += renderHero();
    html += renderCover();
    html += '<div class="acc">';
    html += renderStep('basics',    'i1', 'STEP 1', 'The Event',         'Name, type, theme, templates');
    html += renderStep('schedule',  'i2', 'STEP 2', 'When & Where',      'Dates, times, venue, capacity');
    html += renderStep('food',      'i3', 'STEP 3', 'Food & Drink',      'Your menu, featured dishes, specials');
    html += renderStep('suppliers', 'i4', 'STEP 4', 'Suppliers & Vendors','Eight categories — track status and cost');
    html += renderStep('booking',   'i5', 'STEP 5', 'Booking & Guests',  'How customers book, age, deposit');
    html += renderStep('lineup',    'i6', 'STEP 6', 'Lineup & Performers','DJ, band, MC, poets');
    html += renderStep('publish',   'i7', 'STEP 7', 'Review & Publish',  'Budget, conflict check, preview');
    html += '</div>';

    els.scroll.innerHTML = html;
    renderBar();
    bindInputs();
  }

  function renderHero(){
    var d = state.draft;
    var r = state.restaurant;
    return '' +
      '<div class="hero">' +
        '<div class="tag">EatOuts Event Planner</div>' +
        '<h1>' + esc(d.name || 'Untitled event') + '</h1>' +
        '<p>' + (d.type ? esc(d.type) : 'Pick a type in step 1') +
          (d.shortDesc ? ' · ' + esc(d.shortDesc.slice(0,80)) : '') +
        '</p>' +
        (r ? '<div class="who">📍 <b>' + esc(r.name || 'Active venue') + '</b>' +
             (r.location && r.location.town ? ' · ' + esc(r.location.town) : '') + '</div>' : '') +
      '</div>';
  }

  function renderCover(){
    var d = state.draft;
    var pill = '<span class="status-pill ' + (d.status === 'published' ? 'published' : 'draft') + '">' +
               (d.status === 'published' ? 'Published' : 'Draft') + '</span>';
    return '' +
      '<div class="cover" data-act="pickCover">' +
        (d.coverImage
          ? '<img src="' + esc(d.coverImage) + '" alt="">'
          : '<div class="placeholder"><span class="ico">🖼</span>Tap to add a cover image</div>') +
        '<span class="badge">Cover image</span>' + pill +
      '</div>';
  }

  function renderStep(key, cls, num, title, subtitle){
    var open = state.openStep === key;
    return '' +
      '<section class="acc-item ' + cls + (open ? ' open' : '') + '" data-step="' + key + '">' +
        '<button class="acc-hdr" data-act="toggleStep" data-step="' + key + '">' +
          '<span class="pill">' + esc(num) + '</span>' +
          '<span class="t">' + esc(title) + '</span>' +
          '<span class="s">' + esc(subtitle) + '</span>' +
        '</button>' +
        '<div class="acc-body"><div class="acc-in">' + renderStepBody(key) + '</div></div>' +
      '</section>';
  }

  function renderStepBody(key){
    switch(key){
      case 'basics':    return renderBasics();
      case 'schedule':  return renderSchedule();
      case 'food':      return renderFood();
      case 'suppliers': return renderSuppliers();
      case 'booking':   return renderBooking();
      case 'lineup':    return renderLineup();
      case 'publish':   return renderPublish();
      default:          return '';
    }
  }

  /* ---------- STEP 1: BASICS ---------- */
  function renderBasics(){
    var d = state.draft;
    var titleLen = (d.name || '').length;
    var h = '';
    h += '<div class="tpls">';
    h += '<div class="tpls-head">Start from a template</div>';
    Object.keys(TEMPLATES).forEach(function(k){
      var t = TEMPLATES[k];
      var used = d.templateUsed === k ? ' on' : '';
      h += '<button class="tpl' + used + '" data-act="applyTpl" data-tpl="' + k + '">' +
        '<span class="ico">' + t.icon + '</span>' +
        '<span class="info"><b>' + esc(t.name) + '</b><span>' + esc(t.blurb) + '</span></span>' +
      '</button>';
    });
    h += '</div>';

    h += '<div class="field"><label>Event name <span class="counter">' + titleLen + '/80</span></label>' +
      '<input id="f_name" type="text" maxlength="80" value="' + esc(d.name) + '" placeholder="e.g. Friday Live Music & Wing Night">' +
    '</div>';

    h += '<div class="field"><label>Event type</label><select id="f_type">' +
      EVENT_TYPES.map(function(t){ return '<option' + (t===d.type?' selected':'') + '>' + esc(t) + '</option>'; }).join('') +
    '</select></div>';

    h += '<div class="field"><label>Theme / occasion</label>' +
      '<div class="chips">' +
        THEMES.map(function(t){
          var on = d.themes.indexOf(t) > -1;
          return '<span class="chip' + (on?' on':'') + '" data-act="toggleTheme" data-val="' + esc(t) + '">' + esc(t) + '</span>';
        }).join('') +
      '</div>' +
    '</div>';

    h += '<div class="field"><label>Short description (shown on the card)</label>' +
      '<input id="f_short" type="text" maxlength="140" value="' + esc(d.shortDesc) + '" placeholder="One line — 140 chars max">' +
    '</div>';

    h += '<div class="field"><label>Full description</label>' +
      '<textarea id="f_long" rows="4" placeholder="What happens, when, what to order, anything a guest should know.">' + esc(d.longDesc) + '</textarea>' +
    '</div>';

    h += '<div class="field"><label>Sponsor (optional)</label>' +
      '<input id="f_sponsor" type="text" value="' + esc(d.sponsor) + '" placeholder="e.g. Castle Lite">' +
    '</div>';
    return h;
  }

  /* ---------- STEP 2: SCHEDULE ---------- */
  function renderSchedule(){
    var d = state.draft;
    var h = '';
    h += '<div class="field"><label>Start</label><div class="row">' +
      '<input id="f_startDate" type="date" value="' + esc(d.startDate) + '">' +
      '<input id="f_startTime" type="time" value="' + esc(d.startTime) + '">' +
    '</div></div>';
    h += '<div class="field"><label>End</label><div class="row">' +
      '<input id="f_endDate" type="date" value="' + esc(d.endDate) + '">' +
      '<input id="f_endTime" type="time" value="' + esc(d.endTime) + '">' +
    '</div></div>';

    var overlap = happyHourOverlap();
    if (overlap) {
      h += '<div class="hh-hint"><span>🍸</span><span>Overlaps happy hour (<b>' +
           timeLabel(overlap.start) + ' – ' + timeLabel(overlap.end) + '</b>). Consider featuring it.</span></div>';
    }

    h += '<label class="sw" style="margin-top:12px"><input type="checkbox" id="f_recurring"' +
      (d.recurring?' checked':'') + '><span class="track"></span>' +
      '<span class="lbl">Repeats<em>Weekly or monthly nights</em></span></label>';

    if (d.recurring) {
      var days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
      h += '<div class="field"><label>Repeats on</label><div class="chips">' +
        days.map(function(day){
          var on = d.recurrence.indexOf(day) > -1;
          return '<span class="chip' + (on?' on':'') + '" data-act="toggleRecur" data-val="' + day + '">' + day + '</span>';
        }).join('') +
      '</div></div>';
    }

    h += '<div class="field"><label>Room / area of venue</label>' +
      '<input id="f_roomArea" type="text" value="' + esc(d.roomArea) + '" placeholder="Main room, Patio, Private room">' +
    '</div>';

    h += '<div class="field"><label>Capacity</label><div class="row">' +
      '<input id="f_expected" type="number" min="0" value="' + (d.expectedGuests==null?'':d.expectedGuests) + '" placeholder="Expected">' +
      '<input id="f_maxcap" type="number" min="0" value="' + (d.maxCapacity==null?'':d.maxCapacity) + '" placeholder="Max">' +
    '</div></div>';
    return h;
  }

  /* ---------- STEP 3: FOOD ---------- */
  function renderFood(){
    var d = state.draft;
    var h = '';
    h += '<div class="field"><label>Menu mode</label><select id="f_menuMode">' +
      MENU_MODES.map(function(m){
        return '<option value="' + m.v + '"' + (m.v===d.menuMode?' selected':'') + '>' + esc(m.label) + '</option>';
      }).join('') +
    '</select></div>';

    h += '<div class="menu-bar">' +
      '<span class="lbl">Feature dishes from your menu</span>' +
      '<span class="cnt">' + d.featuredDishes.length + ' picked</span>' +
    '</div>';

    if (!state.restaurant) {
      h += '<div class="menu-empty">Choose a restaurant first — the planner reads your live menu.</div>';
    } else if (!state.menuIndex || !state.menuIndex.items.length) {
      h += '<div class="menu-empty">Your menu is empty. Build it in <b>menu-onboarding.html</b> first.</div>';
    } else if (!state.menuIndex.categories.length) {
      h += '<div class="menu-empty">No menu categories yet.</div>';
    } else {
      state.menuIndex.categories.forEach(function(cat){
        var items = state.menuIndex.items.filter(function(it){ return it.categoryId === cat.id; });
        if (!items.length) return;
        var picked = items.filter(function(it){ return d.featuredDishes.indexOf(it.id) > -1; }).length;
        h += '<div class="menu-cat">' +
          '<div class="menu-cat-hdr"><span>' + esc(cat.name) + '</span>' +
            '<span class="badge">' + picked + ' / ' + items.length + '</span>' +
          '</div>';
        items.forEach(function(it){
          var on = d.featuredDishes.indexOf(it.id) > -1;
          var price = it.basePrice ? money(it.basePrice) : (it.price || '');
          h += '<label class="menu-item' + (on?' on':'') + '" data-act="toggleDish" data-id="' + esc(it.id) + '">' +
            '<span class="tick">✓</span>' +
            '<span class="info"><span class="n">' + esc(it.name) + '</span><span class="p">' + esc(price) + '</span></span>' +
          '</label>';
        });
        h += '</div>';
      });
    }

    if (d.featuredDishes.length && state.menuIndex) {
      var picked = d.featuredDishes.map(function(id){ return state.menuIndex.itemsById[id]; }).filter(Boolean);
      h += '<div class="featured-strip">' + picked.map(function(it){
        return '<span class="fd">' + esc(it.name) + '</span>';
      }).join('') + '</div>';
    }

    h += '<div class="field" style="margin-top:14px"><label>Featured-dish note</label>' +
      '<input id="f_featuredNote" type="text" value="' + esc(d.featuredNote) + '" placeholder="Tonight\'s specials are chalked on the board">' +
    '</div>';

    h += '<div class="field"><label>Drink specials</label>' +
      '<textarea id="f_drinks" rows="3" placeholder="2-for-1 cocktails 6–8pm. Beer buckets P150.">' + esc(d.drinkSpecials) + '</textarea>' +
    '</div>';

    h += '<div class="field"><label>Dietary options available</label><div class="chips">' +
      DIETARY.map(function(t){
        var on = d.dietaryOptions.indexOf(t) > -1;
        return '<span class="chip' + (on?' on':'') + '" data-act="toggleDietary" data-val="' + esc(t) + '">' + esc(t) + '</span>';
      }).join('') +
    '</div></div>';

    h += '<div class="field"><label>Cover charge / entry price</label>' +
      '<input id="f_cover" type="text" value="' + esc(d.coverCharge) + '" placeholder="Free entry / P100 / P450 per person">' +
    '</div>';

    h += '<div class="field"><label>Minimum spend per table</label>' +
      '<input id="f_minspend" type="number" min="0" value="' + (d.minimumSpend==null?'':d.minimumSpend) + '" placeholder="e.g. 250">' +
    '</div>';

    h += '<label class="sw"><input type="checkbox" id="f_deposit"' + (d.depositRequired?' checked':'') +
      '><span class="track"></span><span class="lbl">Deposit required<em>Customer pays to hold the table</em></span></label>';
    if (d.depositRequired) {
      h += '<div class="field"><label>Deposit amount</label>' +
        '<input id="f_depositAmount" type="number" min="0" value="' + (d.depositAmount==null?'':d.depositAmount) + '" placeholder="e.g. 100">' +
      '</div>';
    }

    h += '<label class="sw"><input type="checkbox" id="f_preorder"' + (d.preorderEnabled?' checked':'') +
      '><span class="track"></span><span class="lbl">Pre-order available<em>Guests pick dishes before the event</em></span></label>';
    return h;
  }

  /* ---------- STEP 4: SUPPLIERS ---------- */
  function renderSuppliers(){
    var d = state.draft;
    var h = '';

    /* Summary bar */
    var total = supplierBudget();
    var confirmed = suppliersConfirmed();
    h += '<div class="sup-summary">' +
      '<div class="sup-stat"><span class="l">Suppliers engaged</span><b>' + d.suppliers.length + '</b></div>' +
      '<div class="sup-stat"><span class="l">Confirmed</span><b>' + confirmed + '</b></div>' +
      '<div class="sup-stat"><span class="l">Budget</span><b>' + money(total) + '</b></div>' +
    '</div>';

    h += '<div class="field" style="margin-top:14px">' +
      '<div class="hint" style="margin:0">Tap a supplier type to add it to this event. Set status, cost and notes once added.</div>' +
    '</div>';

    /* 8 categories as expandable sections */
    catalog().categories.forEach(function(cat){
      var catSuppliers = d.suppliers.filter(function(s){ return s.categoryId === cat.id; });
      var open = state.openSupplierCat === cat.id;
      h += '<div class="sup-cat' + (open?' open':'') + '">' +
        '<button class="sup-cat-hdr" data-act="toggleSupplierCat" data-cat="' + cat.id + '">' +
          '<span class="sup-cat-ico">' + cat.icon + '</span>' +
          '<span class="sup-cat-info">' +
            '<b>' + esc(cat.name) + '</b>' +
            '<span>' + catSuppliers.length + ' of ' + cat.types.length + ' engaged</span>' +
          '</span>' +
          '<span class="sup-cat-chev">' + (open?'▾':'▸') + '</span>' +
        '</button>';

      if (open) {
        h += '<div class="sup-cat-body">' +
          '<p class="sup-cat-blurb">' + esc(cat.blurb) + '</p>';
        cat.types.forEach(function(type){
          var sup = supplierFor(cat.id, type.id);
          var on = !!sup;
          h += '<div class="sup-type' + (on?' on':'') + '">' +
            '<label class="sup-type-row" data-act="toggleSupplier" data-cat="' + cat.id + '" data-type="' + type.id + '">' +
              '<span class="sup-tick">' + (on?'✓':'+') + '</span>' +
              '<span class="sup-type-info">' +
                '<b>' + esc(type.name) + '</b>' +
                (type.note ? '<span>' + esc(type.note) + '</span>' : '') +
              '</span>' +
            '</label>';
          if (on && sup) {
            h += '<div class="sup-detail">';
            h += '<div class="field"><label>Supplier / vendor name</label>' +
              '<input data-sup="' + sup.id + '" data-key="name" type="text" value="' + esc(sup.name) + '" placeholder="e.g. Pula Catering Co.">' +
            '</div>';
            h += '<div class="field"><label>Contact (phone / WhatsApp)</label>' +
              '<input data-sup="' + sup.id + '" data-key="contact" type="text" value="' + esc(sup.contact) + '" placeholder="+267 …">' +
            '</div>';
            h += '<div class="field"><label>Status</label><select data-sup="' + sup.id + '" data-key="status">' +
              SUPPLIER_STATUSES.map(function(st){
                return '<option value="' + st.v + '"' + (st.v === sup.status ? ' selected' : '') + '>' + esc(st.label) + '</option>';
              }).join('') +
            '</select></div>';
            h += '<div class="field"><label>Cost (BWP)</label>' +
              '<input data-sup="' + sup.id + '" data-key="cost" type="number" min="0" value="' + (sup.cost == null ? '' : sup.cost) + '" placeholder="0">' +
            '</div>';
            h += '<div class="field"><label>Notes</label>' +
              '<input data-sup="' + sup.id + '" data-key="notes" type="text" value="' + esc(sup.notes) + '" placeholder="Delivery time, contact person, terms">' +
            '</div>';
            h += '</div>';
          }
          h += '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
    });

    /* Add custom supplier */
    h += '<button class="btn ghost" style="width:100%;margin-top:12px" data-act="addCustomSupplier">+ Add custom supplier</button>';

    return h;
  }

  /* ---------- STEP 5: BOOKING ---------- */
  function renderBooking(){
    var d = state.draft;
    var h = '';
    h += '<div class="field"><label>Booking method</label><select id="f_bkMethod">' +
      BOOKING_METHODS.map(function(m){
        return '<option value="' + m.v + '"' + (m.v===d.bookingMethod?' selected':'') + '>' + esc(m.label) + '</option>';
      }).join('') +
    '</select></div>';

    var cs = (state.restaurant && state.restaurant.contacts) || [];
    if (cs.length) {
      h += '<div class="field"><label>Booking contact</label><select id="f_bkContact">' +
        '<option value="">— Use restaurant default —</option>' +
        cs.map(function(c){
          var val = c.id || '';
          var lbl = (c.title || 'Contact') + ' · ' + (c.countryCode || '+267') + ' ' + (c.number || '');
          return '<option value="' + esc(val) + '"' + (d.bookingContactId === val?' selected':'') + '>' + esc(lbl) + '</option>';
        }).join('') +
      '</select></div>';
    }

    h += '<div class="field"><label>Booking window</label><div class="row">' +
      '<input id="f_bkOpen" type="date" value="' + esc(d.bookingOpenDate) + '">' +
      '<input id="f_bkClose" type="date" value="' + esc(d.bookingCloseDate) + '">' +
    '</div></div>';

    h += '<div class="field"><label>Guests per booking</label><div class="row">' +
      '<input id="f_minGuests" type="number" min="1" value="' + (d.minGuests==null?'':d.minGuests) + '" placeholder="Min">' +
      '<input id="f_maxGuests" type="number" min="1" value="' + (d.maxGuests==null?'':d.maxGuests) + '" placeholder="Max">' +
    '</div></div>';

    h += '<div class="field"><label>Age bracket</label><div class="chips">' +
      AGE_BRACKETS.map(function(a){
        var on = a === d.ageBracket;
        return '<span class="chip' + (on?' on':'') + '" data-act="pickAge" data-val="' + esc(a) + '">' + esc(a) + '</span>';
      }).join('') +
    '</div></div>';

    h += '<label class="sw"><input type="checkbox" id="f_sameDay"' + (d.sameDayBooking?' checked':'') +
      '><span class="track"></span><span class="lbl">Same-day bookings allowed</span></label>';

    h += '<label class="sw"><input type="checkbox" id="f_tableReq"' + (d.tableRequired?' checked':'') +
      '><span class="track"></span><span class="lbl">Table reservation required<em>No walk-ins</em></span></label>';

    h += '<div class="field"><label>Cancellation policy</label>' +
      '<textarea id="f_cancel" rows="3" placeholder="Free cancellation up to 24 hours before.">' + esc(d.cancellationPolicy) + '</textarea>' +
    '</div>';
    return h;
  }

  /* ---------- STEP 6: LINEUP ---------- */
  function renderLineup(){
    var d = state.draft;
    var h = '';
    if (!d.performances.length) {
      h += '<div class="menu-empty" style="margin-bottom:12px">No performers yet. Add a DJ, band, MC, or poet — all optional.</div>';
    } else {
      d.performances.forEach(function(p, i){
        h += '<div class="perf-row">' +
          '<div class="perf-info">' +
            '<b>' + esc(p.stageName || 'Untitled') + '</b>' +
            '<span>' + esc(p.setTitle || p.role || '') + ' · ' +
              (timeLabel(p.startTime) || '—') + (p.endTime ? ' → ' + timeLabel(p.endTime) : '') +
            '</span>' +
          '</div>' +
          '<button class="btn ghost" style="padding:6px 10px;min-height:30px;font-size:11px" data-act="removePerf" data-i="' + i + '">Remove</button>' +
        '</div>';
      });
    }
    h += '<button class="btn ghost" style="width:100%" data-act="addPerf">+ Add performer</button>';
    h += '<div class="field" style="margin-top:14px"><label>Sound check time</label>' +
      '<input id="f_sound" type="time" value="' + esc(d.soundCheckTime) + '"></div>';
    h += '<div class="field"><label>Green room / hospitality notes</label>' +
      '<textarea id="f_green" rows="3" placeholder="Still water, 2 towels, mirror.">' + esc(d.greenRoomNotes) + '</textarea></div>';
    return h;
  }

  /* ---------- STEP 7: PUBLISH ---------- */
  function renderPublish(){
    var d = state.draft;
    var h = '';
    h += '<div id="conflictChecks">' + renderConflictChecks() + '</div>';

    /* Budget summary */
    h += '<div class="budget-box">' +
      '<div class="budget-row"><span>Suppliers engaged</span><b>' + d.suppliers.length + '</b></div>' +
      '<div class="budget-row"><span>Confirmed / paid</span><b>' + suppliersConfirmed() + '</b></div>' +
      '<div class="budget-row total"><span>Estimated budget</span><b>' + money(supplierBudget()) + '</b></div>' +
    '</div>';

    if (d.suppliers.length) {
      h += '<div class="sup-list">';
      d.suppliers.forEach(function(s){
        var cat = findCategory(s.categoryId);
        var type = findType(s.categoryId, s.typeId);
        var st = SUPPLIER_STATUSES.filter(function(x){ return x.v === s.status; })[0] || SUPPLIER_STATUSES[0];
        h += '<div class="sup-list-row">' +
          '<span class="sup-dot" style="background:' + st.colour + '"></span>' +
          '<span class="sup-list-name">' + esc(s.name || (type ? type.name : 'Supplier')) + '</span>' +
          '<span class="sup-list-cat">' + esc(cat ? cat.name : '') + '</span>' +
          '<span class="sup-list-cost">' + (s.cost ? money(s.cost) : '—') + '</span>' +
        '</div>';
      });
      h += '</div>';
    }

    /* Event card preview */
    h += '<div class="preview-wrap" style="margin-top:16px">' +
      '<div class="preview-head">How it looks on Promos</div>' +
      renderEventCard() +
    '</div>';

    /* WhatsApp preview */
    h += '<div class="preview-wrap">' +
      '<div class="preview-head">Share message</div>' +
      '<div class="wa">' +
        '<div class="wa-bubble"><div class="b">' + esc(buildShareMessage()) + '</div>' +
          '<div class="wa-meta"><span class="t">' + timeLabel(new Date().toTimeString().slice(0,5)) + '</span></div>' +
        '</div>' +
      '</div>' +
    '</div>';
    return h;
  }

  function renderConflictChecks(){
    var d = state.draft;
    var checks = [];

    if (!d.startDate) {
      checks.push({ k:'warn', ic:'!', txt:'Pick a start date — no conflict check possible.' });
    } else {
      var events = (state.content && state.content.events) || [];
      var clashing = events.filter(function(ev){
        return ev && ev.startDate === d.startDate && ev.id !== d.id;
      });
      if (clashing.length) checks.push({ k:'warn', ic:'!', txt:'Heads up: ' + clashing.length + ' other event(s) already on ' + dateLabel(d.startDate) + '.' });
      else checks.push({ k:'ok', ic:'✓', txt:'No conflicting events on ' + dateLabel(d.startDate) + '.' });
    }

    if (!d.name) checks.push({ k:'warn', ic:'!', txt:'Give the event a name before publishing.' });
    if (!d.shortDesc) checks.push({ k:'info', ic:'ℹ', txt:'A short description boosts tap-through.' });
    if (!d.startTime) checks.push({ k:'info', ic:'ℹ', txt:'No start time — event shows as "Time TBC".' });
    if (d.suppliers.length && suppliersConfirmed() === 0) {
      checks.push({ k:'info', ic:'ℹ', txt:'You have suppliers marked as needed — none confirmed yet.' });
    }
    return checks.map(function(c){
      return '<div class="check ' + c.k + '"><span class="ic">' + c.ic + '</span><span>' + esc(c.txt) + '</span></div>';
    }).join('');
  }

  function renderEventCard(){
    var d = state.draft;
    var r = state.restaurant;
    var venue = r ? (r.name || 'Venue') : 'Venue';
    var when = d.startDate ? dateLabel(d.startDate) + (d.startTime ? ' · ' + timeLabel(d.startTime) : '') : 'Date TBC';
    var featured = d.featuredDishes.map(function(id){
      return state.menuIndex && state.menuIndex.itemsById[id];
    }).filter(Boolean).slice(0, 3);

    var h = '';
    h += '<div class="pcard">';
    h += '<div class="pcard-img">';
    h += d.coverImage ? '<img src="' + esc(d.coverImage) + '" alt="">' : '🖼';
    h += '<span class="when">' + esc(when) + '</span>';
    if (d.sponsor) h += '<span class="sponsor">' + esc(d.sponsor) + '</span>';
    h += '</div>';
    h += '<div class="pcard-body">';
    h += '<h3 class="title">' + esc(d.name || 'Untitled event') + '</h3>';
    h += '<div class="venue">' + esc(venue) + (d.roomArea ? ' · ' + esc(d.roomArea) : '') + '</div>';
    if (d.shortDesc) h += '<p class="desc">' + esc(d.shortDesc) + '</p>';
    if (featured.length) {
      h += '<div class="featured-strip">' + featured.map(function(it){
        return '<span class="fd">' + esc(it.name) + '</span>';
      }).join('') + (d.featuredDishes.length > 3 ? '<span class="fd">+' + (d.featuredDishes.length - 3) + ' more</span>' : '') + '</div>';
    }
    h += '<div class="pcard-foot">';
    h += '<span class="price">' + esc(d.coverCharge || 'Free entry') + '</span>';
    h += '<span class="cta">Reserve on WhatsApp →</span>';
    h += '</div>';
    h += '</div></div>';
    return h;
  }

  function buildShareMessage(){
    var d = state.draft;
    var r = state.restaurant;
    var venue = r ? (r.name || 'Venue') : 'Venue';
    var lines = [];
    lines.push('*' + (d.name || 'EatOuts Event') + '*');
    if (d.startDate) {
      var when = dateLabel(d.startDate);
      if (d.startTime) when += ' · ' + timeLabel(d.startTime);
      lines.push(when);
    }
    lines.push(venue);
    if (d.shortDesc) { lines.push(''); lines.push(d.shortDesc); }
    if (d.coverCharge) { lines.push(''); lines.push('Entry: ' + d.coverCharge); }
    lines.push('');
    lines.push('Reserve on WhatsApp: +267 71 844 129');
    return lines.join('\n');
  }

  /* ---------- ACTION BAR ---------- */
  function renderBar(){
    var d = state.draft;
    var published = d.status === 'published';
    els.bar.innerHTML =
      '<button class="btn ghost" data-act="resetDraft">Reset</button>' +
      '<button class="btn primary" data-act="saveDraft">' + (published?'Save':'Save draft') + '</button>' +
      '<button class="btn ' + (published?'ghost':'gold') + '" data-act="togglePublish">' +
        (published?'Unpublish':'Publish') + '</button>';
  }

  /* ============================================================
     BIND LIVE INPUTS
     ============================================================ */
  function bindInputs(){
    var d = state.draft;

    var simpleMap = {
      'f_name':         function(v){ d.name = v; },
      'f_short':        function(v){ d.shortDesc = v; },
      'f_long':         function(v){ d.longDesc = v; },
      'f_sponsor':      function(v){ d.sponsor = v; },
      'f_startDate':    function(v){ d.startDate = v; },
      'f_startTime':    function(v){ d.startTime = v; },
      'f_endDate':      function(v){ d.endDate = v; },
      'f_endTime':      function(v){ d.endTime = v; },
      'f_roomArea':     function(v){ d.roomArea = v; },
      'f_expected':     function(v){ d.expectedGuests = v === '' ? null : Number(v); },
      'f_maxcap':       function(v){ d.maxCapacity = v === '' ? null : Number(v); },
      'f_featuredNote': function(v){ d.featuredNote = v; },
      'f_drinks':       function(v){ d.drinkSpecials = v; },
      'f_cover':        function(v){ d.coverCharge = v; },
      'f_minspend':     function(v){ d.minimumSpend = v === '' ? null : Number(v); },
      'f_depositAmount':function(v){ d.depositAmount = v === '' ? null : Number(v); },
      'f_bkOpen':       function(v){ d.bookingOpenDate = v; },
      'f_bkClose':      function(v){ d.bookingCloseDate = v; },
      'f_minGuests':    function(v){ d.minGuests = v === '' ? null : Number(v); },
      'f_maxGuests':    function(v){ d.maxGuests = v === '' ? null : Number(v); },
      'f_cancel':       function(v){ d.cancellationPolicy = v; },
      'f_sound':        function(v){ d.soundCheckTime = v; },
      'f_green':        function(v){ d.greenRoomNotes = v; }
    };
    Object.keys(simpleMap).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function(){
        simpleMap[id](el.value);
        state.dirty = true;
        paintHeaderStatus();
        if (id === 'f_name' || id === 'f_short') renderHeroUpdate();
      });
    });

    var selMap = {
      'f_type':     function(v){ d.type = v; },
      'f_menuMode': function(v){ d.menuMode = v; },
      'f_bkMethod': function(v){ d.bookingMethod = v; },
      'f_bkContact':function(v){ d.bookingContactId = v || null; }
    };
    Object.keys(selMap).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function(){ selMap[id](el.value); state.dirty = true; paintHeaderStatus(); });
    });

    var toggles = {
      'f_recurring': function(el){ d.recurring = el.checked; render(); },
      'f_deposit':   function(el){ d.depositRequired = el.checked; render(); },
      'f_preorder':  function(el){ d.preorderEnabled = el.checked; state.dirty = true; },
      'f_sameDay':   function(el){ d.sameDayBooking = el.checked; state.dirty = true; },
      'f_tableReq':  function(el){ d.tableRequired = el.checked; state.dirty = true; }
    };
    Object.keys(toggles).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', function(){ toggles[id](el); });
    });

    /* Supplier detail inputs */
    document.querySelectorAll('[data-sup]').forEach(function(el){
      var sid = el.getAttribute('data-sup');
      var key = el.getAttribute('data-key');
      var sup = d.suppliers.find(function(s){ return s.id === sid; });
      if (!sup) return;
      el.addEventListener('input', function(){
        if (key === 'cost') sup.cost = el.value === '' ? null : Number(el.value);
        else sup[key] = el.value;
        state.dirty = true;
        paintHeaderStatus();
        if (key === 'cost') {
          /* Update summary bar live without full re-render */
          var sum = els.scroll.querySelector('.sup-summary .sup-stat:last-child b');
          if (sum) sum.textContent = money(supplierBudget());
        }
      });
      el.addEventListener('change', function(){
        if (key === 'status') sup.status = el.value;
        state.dirty = true;
      });
    });

    /* Autosave */
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(function(){ if (state.dirty) saveDraft(); }, 2500);
  }

  function renderHeroUpdate(){
    var hero = els.scroll.querySelector('.hero');
    if (!hero) return;
    var fresh = document.createElement('div');
    fresh.innerHTML = renderHero();
    hero.replaceWith(fresh.firstElementChild);
  }

  /* ============================================================
     ACTIONS
     ============================================================ */
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-act]');
    if (!t) return;
    var act = t.getAttribute('data-act');
    var d = state.draft;

    if (act === 'toggleStep') {
      var step = t.getAttribute('data-step');
      state.openStep = (state.openStep === step) ? null : step;
      render();
      setTimeout(function(){
        var open = els.scroll.querySelector('.acc-item.open');
        if (open && open.scrollIntoView) open.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 40);
      return;
    }

    if (act === 'toggleSupplierCat') {
      var cid = t.getAttribute('data-cat');
      state.openSupplierCat = (state.openSupplierCat === cid) ? null : cid;
      render();
      setTimeout(function(){
        var open = els.scroll.querySelector('.sup-cat.open');
        if (open && open.scrollIntoView) open.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 40);
      return;
    }

    if (act === 'toggleSupplier') {
      var catId = t.getAttribute('data-cat');
      var typeId = t.getAttribute('data-type');
      var existing = supplierFor(catId, typeId);
      if (existing) removeSupplierByType(catId, typeId);
      else addSupplier(catId, typeId);
      render();
      return;
    }

    if (act === 'addCustomSupplier') {
      openCustomSupplierForm(function(){
        state.dirty = true;
        render();
      });
      return;
    }

    if (act === 'pickCover') {
      openImagePicker(function(url){ d.coverImage = url; state.dirty = true; render(); });
      return;
    }

    if (act === 'toggleTheme') {
      var v = t.getAttribute('data-val');
      var i = d.themes.indexOf(v);
      if (i > -1) d.themes.splice(i,1); else d.themes.push(v);
      state.dirty = true;
      t.classList.toggle('on');
      return;
    }
    if (act === 'toggleRecur') {
      var rv = t.getAttribute('data-val');
      var ri = d.recurrence.indexOf(rv);
      if (ri > -1) d.recurrence.splice(ri,1); else d.recurrence.push(rv);
      state.dirty = true;
      t.classList.toggle('on');
      return;
    }
    if (act === 'toggleDietary') {
      var dv = t.getAttribute('data-val');
      var di = d.dietaryOptions.indexOf(dv);
      if (di > -1) d.dietaryOptions.splice(di,1); else d.dietaryOptions.push(dv);
      state.dirty = true;
      t.classList.toggle('on');
      return;
    }
    if (act === 'pickAge') {
      d.ageBracket = t.getAttribute('data-val');
      state.dirty = true;
      render();
      return;
    }
    if (act === 'toggleDish') {
      var id = t.getAttribute('data-id');
      var idx = d.featuredDishes.indexOf(id);
      if (idx > -1) d.featuredDishes.splice(idx,1); else d.featuredDishes.push(id);
      state.dirty = true;
      render();
      return;
    }

    if (act === 'applyTpl') {
      var key = t.getAttribute('data-tpl');
      var tpl = TEMPLATES[key];
      if (!tpl) return;
      var before = d.suppliers.length;
      Object.assign(d, tpl.fill);
      /* Materialise supplier types into real supplier records */
      var types = tpl.fill.suppliers || [];
      types.forEach(function(typeId){
        for (var i=0;i<catalog().categories.length;i++){
          var cat = catalog().categories[i];
          var found = cat.types.some(function(tt){ return tt.id === typeId; });
          if (found) { addSupplier(cat.id, typeId); break; }
        }
      });
      d.templateUsed = key;
      state.dirty = true;
      state.openStep = 'schedule';
      render();
      toast(tpl.name + ' template loaded — ' + (d.suppliers.length - before) + ' supplier slots');
      return;
    }

    if (act === 'addPerf') {
      openPerfForm(function(p){ d.performances.push(p); state.dirty = true; render(); });
      return;
    }
    if (act === 'removePerf') {
      d.performances.splice(parseInt(t.getAttribute('data-i'),10), 1);
      state.dirty = true;
      render();
      return;
    }

    if (act === 'saveDraft') { saveDraft(); toast('Draft saved'); return; }

    if (act === 'resetDraft') {
      if (!confirm('Discard current draft and start fresh?')) return;
      state.draft = blankDraft();
      state.openStep = 'basics';
      state.openSupplierCat = null;
      saveDraft();
      render();
      toast('Starting fresh');
      return;
    }

    if (act === 'togglePublish') {
      if (d.status === 'published') {
        d.status = 'draft'; d.publishedAt = null;
        saveDraft(); render(); toast('Unpublished'); return;
      }
      if (!d.name) { toast('Give the event a name first'); return; }
      if (!d.startDate) { toast('Pick a start date'); return; }
      d.status = 'published';
      d.publishedAt = Date.now();
      if (saveToContent()) { saveDraft(); render(); toast('Event published'); }
      else { toast('Could not publish — no active restaurant'); }
      return;
    }
  });

  /* ============================================================
     SAVE TO RESTAURANT CONTENT
     ============================================================ */
  function saveToContent(){
    if (!state.restaurant) return false;
    try {
      var db = EatoutsDB.load();
      var content = EatoutsDB.forkContent(state.restaurant.id, db);
      content.events = content.events || [];
      var idx = content.events.findIndex(function(x){ return x.id === state.draft.id; });

      var d = state.draft;
      var record = {
        id: d.id, name: d.name, type: d.type,
        shortDesc: d.shortDesc, description: d.longDesc,
        coverImage: d.coverImage, sponsor: d.sponsor,
        startDate: d.startDate, startTime: d.startTime,
        endDate: d.endDate, endTime: d.endTime,
        recurring: d.recurring, recurrence: d.recurrence,
        location: state.restaurant.location || {},
        expectedGuests: d.expectedGuests, maxCapacity: d.maxCapacity,
        roomArea: d.roomArea,
        menuMode: d.menuMode,
        featuredDishes: d.featuredDishes.slice(),
        featuredNote: d.featuredNote,
        drinkSpecials: d.drinkSpecials,
        dietaryOptions: d.dietaryOptions.slice(),
        coverCharge: d.coverCharge,
        minimumSpend: d.minimumSpend,
        depositRequired: d.depositRequired,
        depositAmount: d.depositAmount,
        preorderEnabled: d.preorderEnabled,
        suppliers: d.suppliers.slice(),
        supplierBudget: supplierBudget(),
        bookingMethod: d.bookingMethod,
        bookingContactId: d.bookingContactId,
        bookingOpenDate: d.bookingOpenDate,
        bookingCloseDate: d.bookingCloseDate,
        minGuests: d.minGuests, maxGuests: d.maxGuests,
        sameDayBooking: d.sameDayBooking, tableRequired: d.tableRequired,
        ageBracket: d.ageBracket,
        cancellationPolicy: d.cancellationPolicy,
        performances: d.performances.slice(),
        soundCheckTime: d.soundCheckTime,
        greenRoomNotes: d.greenRoomNotes,
        status: d.status, publishedAt: d.publishedAt,
        createdAt: d.createdAt, updatedAt: d.updatedAt,
        restaurantId: state.restaurant.id
      };

      if (idx > -1) content.events[idx] = record;
      else content.events.push(record);

      EatoutsDB.save(db);
      return true;
    } catch(e){
      console.warn('[planner] saveToContent failed', e);
      return false;
    }
  }

  /* ============================================================
     MODALS
     ============================================================ */
  function openImagePicker(onDone){
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="sheet">' +
        '<div class="sheet-hdr"><h3>Cover image</h3><button class="btn ghost" data-cancel style="min-height:auto;padding:6px 10px;font-size:11px">Close</button></div>' +
        '<div class="sheet-body">' +
          '<div class="field"><label>Image URL</label><input id="__imgUrl" type="text" placeholder="https://… or assets/…"></div>' +
          '<div style="font-size:11.5px;line-height:1.5;color:#a89a7e">Uploads to R2 are coming in a later version. For now paste the image URL.</div>' +
        '</div>' +
        '<div class="sheet-foot">' +
          '<button class="btn ghost" data-cancel>Cancel</button>' +
          '<button class="btn gold" data-save>Use this image</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    var close = function(){ scrim.remove(); };
    scrim.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick = close; });
    scrim.querySelector('[data-save]').onclick = function(){
      var v = (document.getElementById('__imgUrl').value || '').trim();
      if (v) onDone(v);
      close();
    };
    scrim.addEventListener('click', function(ev){ if (ev.target === scrim) close(); });
  }

  function openPerfForm(onDone){
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="sheet">' +
        '<div class="sheet-hdr"><h3>Add a performer</h3><button class="btn ghost" data-cancel style="min-height:auto;padding:6px 10px;font-size:11px">Close</button></div>' +
        '<div class="sheet-body">' +
          '<div class="field"><label>Stage name</label><input id="__pName" type="text" placeholder="DJ Kellz, Thato Band"></div>' +
          '<div class="field"><label>Set title / role</label><input id="__pRole" type="text" placeholder="Main set, Opening act, MC"></div>' +
          '<div class="field"><label>Start / end</label><div class="row">' +
            '<input id="__pStart" type="time"><input id="__pEnd" type="time">' +
          '</div></div>' +
        '</div>' +
        '<div class="sheet-foot">' +
          '<button class="btn ghost" data-cancel>Cancel</button>' +
          '<button class="btn gold" data-save>Add performer</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    var close = function(){ scrim.remove(); };
    scrim.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick = close; });
    scrim.querySelector('[data-save]').onclick = function(){
      var n = (document.getElementById('__pName').value || '').trim();
      if (!n) { toast('Give the performer a stage name'); return; }
      onDone({
        id: uid('perf'),
        stageName: n,
        role: (document.getElementById('__pRole').value || '').trim(),
        setTitle: (document.getElementById('__pRole').value || '').trim(),
        startTime: document.getElementById('__pStart').value || '',
        endTime: document.getElementById('__pEnd').value || ''
      });
      close();
    };
    scrim.addEventListener('click', function(ev){ if (ev.target === scrim) close(); });
  }

  function openCustomSupplierForm(onDone){
    var scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.innerHTML =
      '<div class="sheet">' +
        '<div class="sheet-hdr"><h3>Add a custom supplier</h3><button class="btn ghost" data-cancel style="min-height:auto;padding:6px 10px;font-size:11px">Close</button></div>' +
        '<div class="sheet-body">' +
          '<div class="field"><label>Category</label><select id="__csCat">' +
            catalog().categories.map(function(c){
              return '<option value="' + c.id + '">' + esc(c.name) + '</option>';
            }).join('') +
          '</select></div>' +
          '<div class="field"><label>Supplier / vendor name</label><input id="__csName" type="text" placeholder="e.g. Pula Catering Co."></div>' +
          '<div class="field"><label>Contact</label><input id="__csContact" type="text" placeholder="+267 …"></div>' +
          '<div class="field"><label>Cost (BWP)</label><input id="__csCost" type="number" min="0" placeholder="0"></div>' +
        '</div>' +
        '<div class="sheet-foot">' +
          '<button class="btn ghost" data-cancel>Cancel</button>' +
          '<button class="btn gold" data-save>Add supplier</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    var close = function(){ scrim.remove(); };
    scrim.querySelectorAll('[data-cancel]').forEach(function(b){ b.onclick = close; });
    scrim.querySelector('[data-save]').onclick = function(){
      var catId = document.getElementById('__csCat').value;
      var name = (document.getElementById('__csName').value || '').trim();
      if (!name) { toast('Give the supplier a name'); return; }
      state.draft.suppliers.push({
        id: uid('sup'),
        categoryId: catId,
        typeId: 'custom',
        name: name,
        contact: (document.getElementById('__csContact').value || '').trim(),
        status: 'needed',
        cost: document.getElementById('__csCost').value === '' ? null : Number(document.getElementById('__csCost').value),
        notes: ''
      });
      close();
      onDone();
    };
    scrim.addEventListener('click', function(ev){ if (ev.target === scrim) close(); });
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  function init(opts){
    try {
      els.scroll = opts.mountScroll;
      els.bar = opts.mountBar;
      els.hdr = opts.mountHdr;

      state.catalog = window.EATOUTS_SUPPLIER_CATALOG || { categories: [] };
      loadRestaurantContext();
      state.draft = loadDraft();
      render();

      /* Kill any leftover autosave timers when the page unloads */
      window.addEventListener('beforeunload', function(){
        clearInterval(autosaveTimer);
      });
    } catch(err){
      console.error('[planner] init failed', err);
      if (els.scroll) {
        els.scroll.innerHTML =
          '<div style="padding:40px 20px;text-align:center;color:#c43c3c;font-size:13px;line-height:1.6">' +
            '<b>Planner failed to start.</b><br><br>' +
            esc(err && err.message || String(err)) + '<br><br>' +
            'Press F12 to see the console.' +
          '</div>';
      }
    }
  }

  window.EatoutsEventPlanner = {
    init: init,
    _state: function(){ return state; }
  };
})();