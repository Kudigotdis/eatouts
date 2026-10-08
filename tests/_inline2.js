
(function(){
  'use strict';

  /* ============================================================
     INTAKE DRAFT
     Lives under a dedicated key so it never collides with the
     operator DB blob. Structured to round-trip into the
     directory_runtime_data.json + owner content shapes.
     ============================================================ */
  const OPS_KEY = 'eatouts_ops_v1';
  const DRAFT_KEY = 'eatouts_intake_draft_v1';

  const uid = function(p){ return p + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); };
  const esc = function(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); };
  const toast = (function(){ var t; return function(m){ t = document.getElementById('toast'); t.textContent = m; t.classList.add('on'); setTimeout(function(){ t.classList.remove('on'); }, 1900); };})();

  /* ---- file upload helper (integration_file.txt step 11) ----
     Picks an image, compresses it to a webp data URL and writes it into
     the target URL input - the URL field stays editable as the fallback. */
  function pickImageInto(targetId){
    var inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.onchange = function(){
      var f = inp.files && inp.files[0];
      if(!f) return;
      if(/video\//.test(f.type || '')){ checkVideo(f); return; }
      if(!window.EatoutsImageCompressor){ toast('Image compressor unavailable'); return; }
      EatoutsImageCompressor.compress(f, 1600, 1600, 0.82).then(function(blob){
        var rd = new FileReader();
        rd.onload = function(){
          var el = document.getElementById(targetId);
          if(!el){ toast('Target field not found'); return; }
          el.value = String(rd.result);
          el.dispatchEvent(new Event('input', {bubbles:true}));
          toast('Image compressed and inserted');
        };
        rd.onerror = function(){ toast('Could not read the image'); };
        rd.readAsDataURL(blob);
      }).catch(function(e){ toast('Compression failed: ' + (e && e.message || e)); });
    };
    inp.click();
  }
  function checkVideo(file){
    if(!window.EatoutsVideoValidator){ toast('Video validator unavailable'); return; }
    EatoutsVideoValidator.validate(file, 50, 300).then(function(info){
      toast('Video OK (' + EatoutsVideoValidator.formatSeconds(info.duration) + ', ' + EatoutsVideoValidator.formatMB(info.sizeMB) + ') - too big for browser storage. Host it and paste the URL.');
    }).catch(function(e){ toast('Video rejected: ' + (e && e.message || e)); });
  }
  function handleFilePick(fi, scrim){
    var f = fi.files && fi.files[0];
    if(!f) return;
    var target = scrim ? scrim.querySelector('[name="' + fi.getAttribute('data-file-for') + '"]') : null;
    if(/video\//.test(f.type || '')){ checkVideo(f); return; }
    if(!window.EatoutsImageCompressor){ toast('Image compressor unavailable'); return; }
    EatoutsImageCompressor.compress(f, 1600, 1600, 0.82).then(function(blob){
      var rd = new FileReader();
      rd.onload = function(){
        if(!target){ toast('Field not found'); return; }
        target.value = String(rd.result);
        toast('Image compressed and inserted');
      };
      rd.onerror = function(){ toast('Could not read the image'); };
      rd.readAsDataURL(blob);
    }).catch(function(e){ toast('Compression failed: ' + (e && e.message || e)); });
  }

  function opsLoad(){
    try { var raw = localStorage.getItem(OPS_KEY); return raw ? JSON.parse(raw) : { venues:[], invoices:[], metrics:[] }; }
    catch(e){ return { venues:[], invoices:[], metrics:[] }; }
  }
  function opsSave(o){
    try { localStorage.setItem(OPS_KEY, JSON.stringify(o)); } catch(e){ console.warn('[intake] ops save failed', e); }
  }
  function draftLoad(){
    try { var raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) : null; }
    catch(e){ return null; }
  }
  function draftSave(d){
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch(e){ console.warn('[intake] draft save failed', e); }
  }

  /* ---------- default draft ---------- */
  function emptyDraft(){
    return {
      id: uid('intake'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      identity: { name:'', slug:'', description:'', logo:'', coverImage:'', types:[] },
      location: { district:'', districtName:'', town:'', area:'', plotNumber:'', street:'', building:'', landmark:'', lat:null, lng:null },
      contacts: [],
      socials: { instagram:'', facebook:'', whatsapp:'', tiktok:'', twitter:'', youtube:'', website:'', call:'' },
      hours: { weekly: {}, custom: [] },
      character: [],
      amenities: [],
      menuTags: [],
      capacity: [],
      payments: [],
      reservations: { enabled:true, whatsappContactId:null, callContactId:null, minGuests:2, maxGuests:12, sameDay:true, advanceBooking:true, notes:'' },
      reservationServices: [],
      serviceStaff: [],
      menu: { categories: [] },
      promos: [],
      events: [],
      gallery: { groups: [] },
      export: { lastExportedAt:null, filename:null }
    };
  }

  let draft = draftLoad() || emptyDraft();

  /* ---------- which sections are open ---------- */
  const OPEN = {
    identity:true, location:true, contacts:true,
    socials:false, hours:false, character:false,
    amenities:false, menuTags:false, capacity:false,
    payments:false, reservations:false, services:false,
    staff:false, menu:false, promos:false, events:false,
    gallery:false, review:true, checklist:true
  };
  function toggle(k){ OPEN[k] = !OPEN[k]; render(); }

  /* ---------- modal system ---------- */
  function openForm(opts){
    opts = opts || {};
    var values = opts.values || {};
    var scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML =
      '<div class="modal">' +
        '<div class="modal-hdr"><h3>' + esc(opts.title||'Edit') + '</h3>' +
        '<button class="btn btn-ghost btn-sm" data-close>Close</button></div>' +
        '<div class="modal-body">' + (opts.fields||[]).map(function(f){ return renderField(f, values[f.key]); }).join('') + '</div>' +
        '<div class="modal-foot">' +
          '<button class="btn btn-ghost" data-close>Cancel</button>' +
          '<button class="btn btn-gold" data-save>' + esc(opts.saveLabel||'Save') + '</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    scrim.querySelectorAll('[data-file-for]').forEach(function(fi){ fi.onchange = function(){ handleFilePick(fi, scrim); }; });
    scrim.querySelectorAll('[data-close]').forEach(function(b){ b.onclick = function(){ scrim.remove(); }; });
    scrim.querySelector('[data-save]').onclick = function(){
      var out = {};
      (opts.fields||[]).forEach(function(f){
        var el = scrim.querySelector('[name="'+f.key+'"]');
        if(!el) return;
        if(f.type==='checkbox') out[f.key] = el.checked;
        else if(f.type==='number') out[f.key] = el.value===''?null:Number(el.value);
        else out[f.key] = el.value;
      });
      opts.onSave(out);
      scrim.remove();
    };
  }
  function renderField(f, v){
    if(f.type==='file') return '<div class="field"><label>'+esc(f.label)+'</label><input type="file" data-file-for="'+f.key+'"'+(f.accept?' accept="'+esc(f.accept)+'"':'')+'><input type="text" name="'+f.key+'" value="'+esc(v||'')+'" placeholder="'+esc(f.placeholder||'Image URL or upload')+'">'+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'<div class="hint">Upload compresses to an embedded data URL, or paste any image URL.</div>')+'</div>';
    if(f.type==='textarea') return '<div class="field"><label>'+esc(f.label)+'</label><textarea name="'+f.key+'" placeholder="'+esc(f.placeholder||'')+'">'+esc(v||'')+'</textarea>'+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'')+'</div>';
    if(f.type==='select') return '<div class="field"><label>'+esc(f.label)+'</label><select name="'+f.key+'">'+(f.options||[]).map(function(o){
      var val = typeof o==='string'?o:o.value;
      var lbl = typeof o==='string'?o:o.label;
      return '<option value="'+esc(val)+'"'+(val===v?' selected':'')+'>'+esc(lbl)+'</option>';
    }).join('')+'</select></div>';
    if(f.type==='checkbox') return '<label class="switch"><input type="checkbox" name="'+f.key+'"'+(v?' checked':'')+'><span class="track"></span><span class="lbl">'+esc(f.label)+'</span></label>';
    return '<div class="field"><label>'+esc(f.label)+'</label><input type="'+(f.type||'text')+'" name="'+f.key+'" value="'+esc(v||'')+'" placeholder="'+esc(f.placeholder||'')+'">'+(f.hint?'<div class="hint">'+esc(f.hint)+'</div>':'')+'</div>';
  }

  /* ---------- selectors/catalogues ---------- */
  const TYPES = ['Restaurant','Café','Fast Food','Takeaway','Bakery','Bar & Grill','Pub','Lounge','Bistro','Food Court','Coffee Shop','Steakhouse','Pizzeria','Family Restaurant','Fine Dining','Food Truck','Other'];
  const CHAR_DEFAULTS = ['Cozy','Trendy','Romantic','Family-friendly','Traditional','Modern','Rustic','Lively','Quiet'];
  const AMEN_DEFAULTS = ['Free Wi-Fi','Table service','Dedicated parking','Kids area','Outdoor seating','Indoor seating','Air conditioning','Charging points','Wheelchair accessible','Restrooms','Baby changing','Power backup','Smoking area','Non-smoking area','Pet friendly','Takeaway','Delivery','Catering','Private dining','Event space'];
  const TAG_GROUPS = {
    'Cuisine':['Setswana','Zimbabwean','African','South African','Indian','Chinese','Italian','American','Mexican','Mediterranean','Portuguese','Fusion'],
    'Meal':['Breakfast','Brunch','Lunch','Dinner','Late Night','Dessert'],
    'Dietary':['Vegetarian options','Vegan options','Halal','Gluten-free options','Dairy-free options']
  };
  const PAY_METHODS = ['Cash','Visa','Mastercard','Orange Money','MyZaka','Bank Transfer','MoMo'];

  /* ---------- render ---------- */
  function sectionsComplete(){
    var d = draft;
    var checks = [
      { k:'identity',   ok: !!d.identity.name,        lbl:'Identity',              hint:'Name at minimum' },
      { k:'location',   ok: !!d.location.town,       lbl:'Location',              hint:'Town at minimum' },
      { k:'contacts',   ok: d.contacts.length>0,      lbl:'Contacts',              hint:'At least one number' },
      { k:'socials',    ok: Object.values(d.socials).some(Boolean), lbl:'Social links', hint:'Optional but recommended' },
      { k:'hours',      ok: Object.keys(d.hours.weekly||{}).length>0, lbl:'Operating hours' },
      { k:'character',  ok: d.character.length>0,     lbl:'Character tags' },
      { k:'amenities',  ok: d.amenities.length>0,     lbl:'Amenities' },
      { k:'menuTags',   ok: d.menuTags.length>0,      lbl:'Menu tags' },
      { k:'capacity',   ok: d.capacity.length>0,      lbl:'Capacity' },
      { k:'payments',   ok: d.payments.length>0,      lbl:'Payment methods' },
      { k:'reservations', ok: !!d.reservations,       lbl:'Reservations settings' },
      { k:'services',   ok: d.reservationServices.length>0, lbl:'Reservation services' },
      { k:'staff',      ok: d.serviceStaff.length>0,  lbl:'Service staff' },
      { k:'menu',       ok: d.menu.categories.length>0, lbl:'Menu' },
      { k:'promos',     ok: d.promos.length>0,        lbl:'Promotions' },
      { k:'events',     ok: d.events.length>0,        lbl:'Events' },
      { k:'gallery',    ok: d.gallery.groups.length>0, lbl:'Gallery' }
    ];
    var done = checks.filter(function(c){ return c.ok; }).length;
    return { checks:checks, done:done, total:checks.length, pct: Math.round(done/checks.length*100) };
  }

  function slugify(s){
    if(window.EatoutsBrand && EatoutsBrand.slugify) return EatoutsBrand.slugify(s);
    return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
  }

  function render(){
    var c = sectionsComplete();
    document.getElementById('statusBadge').textContent = draft.identity.name ? (c.pct===100?'Ready':'In progress') : 'Draft';
    document.getElementById('statusBadge').className = 'badge ' + (c.pct===100 ? 'published' : 'draft');

    var h = '';
    h += completenessBlock(c);
    h += sec('identity','01 · Identity', renderIdentity());
    h += sec('location','02 · Location', renderLocation());
    h += sec('contacts','03 · Contacts', renderContacts());
    h += sec('socials','04 · Socials', renderSocials());
    h += sec('hours','05 · Operating Hours', renderHours());
    h += sec('character','06 · Character', renderCharacter());
    h += sec('amenities','07 · Amenities', renderAmenities());
    h += sec('menuTags','08 · Menu Tags', renderMenuTags());
    h += sec('capacity','09 · Capacity', renderCapacity());
    h += sec('payments','10 · Payments', renderPayments());
    h += sec('reservations','11 · Reservations', renderReservations());
    h += sec('services','12 · Reservation Services', renderServices());
    h += sec('staff','13 · Service Staff', renderStaff());
    h += sec('menu','14 · Menu', renderMenuEditor());
    h += sec('promos','15 · Promotions', renderPromoEditor());
    h += sec('events','16 · Events', renderEventEditor());
    h += sec('gallery','17 · Gallery', renderGalleryEditor());
    h += sec('review','18 · Review & Export', renderReview());
    h += sec('checklist','19 · Go-Live Checklist', renderChecklist(c));

    document.getElementById('app').innerHTML = h;
    bindLive();
  }

  function completenessBlock(c){
    return '<div class="completeness">' +
      '<div class="pct">' + c.pct + '%</div>' +
      '<div style="flex:1">' +
        '<div class="lbl">Intake completeness</div>' +
        '<div class="bar"><i style="width:' + c.pct + '%"></i></div>' +
      '</div>' +
      '<div class="mini">' + c.done + ' / ' + c.total + ' sections</div>' +
    '</div>';
  }

  function sec(k, title, body){
    var open = OPEN[k] !== false;
    return '<div class="section ' + (open ? 'open' : '') + '" data-sec="' + k + '">' +
      '<div class="section-hdr" data-toggle="' + k + '"><div class="section-title">' + title + '</div><span class="chev">▾</span></div>' +
      '<div class="section-body">' + body + '</div>' +
    '</div>';
  }

  function renderIdentity(){
    var id = draft.identity;
    return '' +
      '<div class="field"><label>Restaurant Name *</label><input id="f_name" value="'+esc(id.name)+'" placeholder="e.g. The Yellow Giraffe Coffee Club"></div>' +
      '<div class="field"><label>Slug (auto)</label><input id="f_slug" value="'+esc(id.slug)+'" placeholder="the-yellow-giraffe"><div class="hint">Used for the URL and image folder. Filled automatically from the name.</div></div>' +
      '<div class="field"><label>Description</label><textarea id="f_desc" placeholder="A short description diners will read first.">'+esc(id.description)+'</textarea></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Logo URL</label><input id="f_logo" value="'+esc(id.logo)+'" placeholder="assets/logo/…"><button type="button" class="btn btn-ghost btn-sm" data-act="uploadImage" data-target="f_logo">Upload image</button></div>' +
        '<div class="field"><label>Cover Image URL</label><input id="f_cover" value="'+esc(id.coverImage)+'" placeholder="assets/images/…"><button type="button" class="btn btn-ghost btn-sm" data-act="uploadImage" data-target="f_cover">Upload image</button></div>' +
      '</div>' +
      '<div class="field"><label>Restaurant Type</label><div class="chips">' +
        TYPES.map(function(t){ return '<span class="chip ' + (id.types.indexOf(t)>-1?'active':'') + '" data-act="toggleType" data-val="'+esc(t)+'">'+esc(t)+'</span>'; }).join('') +
        '<span class="chip add" data-act="addType">+ Custom</span>' +
      '</div></div>' +
      (id.types.filter(function(t){ return TYPES.indexOf(t)===-1; }).length ?
        '<div class="field"><label>Custom Types</label><div class="chips">' + id.types.filter(function(t){ return TYPES.indexOf(t)===-1; }).map(function(t){ return '<span class="chip active" data-act="toggleType" data-val="'+esc(t)+'">'+esc(t)+' ✕</span>'; }).join('') + '</div></div>' : '');
  }

  function renderLocation(){
    var l = draft.location;
    var districts = window.EatoutsLocations ? EatoutsLocations.allDistricts() : [];
    var towns = l.district ? EatoutsLocations.towns(l.district) : [];
    var areas = (l.district && l.town) ? EatoutsLocations.areas(l.district, l.town) : [];
    return '' +
      '<div class="grid2">' +
        '<div class="field"><label>District</label><select id="f_district"><option value="">— choose —</option>' +
          districts.map(function(d){ return '<option value="'+esc(d.code)+'"'+(l.district===d.code?' selected':'')+'>'+esc(d.name)+'</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Village / Town / City *</label><select id="f_town"'+(l.district?'':' disabled')+'><option value="">— choose district first —</option>' +
          towns.map(function(t){ return '<option value="'+esc(t.name)+'"'+(l.town===t.name?' selected':'')+'>'+esc(t.name)+'</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="field"><label>Area / Neighbourhood</label><select id="f_area"'+(l.town?'':' disabled')+'><option value="">—</option>' +
        areas.map(function(a){ return '<option value="'+esc(a)+'"'+(l.area===a?' selected':'')+'>'+esc(a)+'</option>'; }).join('') +
        (l.town && !areas.length ? '<option value="Other / not listed"'+(l.area==='Other / not listed'?' selected':'')+'>Other / not listed</option>' : '') +
      '</select></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Plot Number</label><input id="f_plot" value="'+esc(l.plotNumber)+'"></div>' +
        '<div class="field"><label>Street Name</label><input id="f_street" value="'+esc(l.street)+'"></div>' +
      '</div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Building / Complex</label><input id="f_building" value="'+esc(l.building)+'"></div>' +
        '<div class="field"><label>Landmark</label><input id="f_landmark" value="'+esc(l.landmark)+'" placeholder="e.g. Opposite Airport Junction"></div>' +
      '</div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Latitude</label><input id="f_lat" value="'+(l.lat==null?'':l.lat)+'"></div>' +
        '<div class="field"><label>Longitude</label><input id="f_lng" value="'+(l.lng==null?'':l.lng)+'"></div>' +
      '</div>' +
      '<div class="row"><button class="btn btn-ghost btn-sm" data-act="useCurrent">Use Current Location</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="previewMap">Preview Map</button></div>';
  }

  function renderContacts(){
    var cs = draft.contacts;
    return (cs.length ? cs.map(function(c){
      return '<div class="record">' +
        '<div class="record-title">'+esc(c.title||'Number')+
          (c.primary?' <span class="badge primary">Primary</span>':'') +
          (c.whatsapp?' <span class="badge published">WhatsApp</span>':'') +
          (c.active===false?' <span class="badge draft">Inactive</span>':'') +
        '</div>' +
        '<div class="record-meta">'+esc(c.countryCode||'+267')+' '+esc(c.number||'')+'<br>'+esc(c.purpose||'—')+'</div>' +
        '<div class="record-actions">' +
          '<button class="btn btn-ghost btn-sm" data-act="editContact" data-id="'+c.id+'">Edit</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="dupContact" data-id="'+c.id+'">Duplicate</button>' +
          '<button class="btn btn-danger btn-sm" data-act="delContact" data-id="'+c.id+'">Remove</button>' +
        '</div></div>';
    }).join('') : '<div class="empty">No contact numbers yet. Add at least one.</div>') +
      '<button class="btn btn-ghost btn-full" style="margin-top:10px" data-act="addContact">+ Add Contact Number</button>';
  }

  function renderSocials(){
    var s = draft.socials;
    var P = [['instagram','Instagram'],['facebook','Facebook'],['whatsapp','WhatsApp'],['tiktok','TikTok'],['twitter','X (Twitter)'],['youtube','YouTube'],['website','Website'],['call','Call']];
    return P.map(function(p){ return '<div class="field"><label>'+p[1]+'</label><input data-social="'+p[0]+'" value="'+esc(s[p[0]]||'')+'" placeholder="handle or URL"></div>'; }).join('');
  }

  function renderHours(){
    var DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    var w = draft.hours.weekly || {};
    return DAYS.map(function(d){
      var row = w[d] || { open:'', close:'' };
      return '<div class="grid2" style="grid-template-columns:90px 1fr 1fr;margin-bottom:8px;align-items:center">' +
        '<label class="mini" style="align-self:center"><b>'+d.slice(0,3)+'</b></label>' +
        '<input type="time" data-hr="'+d+'" data-k="open" value="'+esc(row.open||'')+'">' +
        '<input type="time" data-hr="'+d+'" data-k="close" value="'+esc(row.close||'')+'">' +
      '</div>';
    }).join('') +
      '<div class="mini" style="margin-top:6px">Leave both empty to mark a day closed.</div>' +
      '<div class="subsection"><div class="sub-h">Custom Schedules</div>' +
        (draft.hours.custom.length ? draft.hours.custom.map(function(s){
          return '<div class="record"><div class="record-title">'+esc(s.title||'Schedule')+'</div>' +
            '<div class="record-meta">'+esc(s.days||'')+' · '+esc(s.start||'')+'–'+esc(s.end||'')+'</div>' +
            '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editSched" data-id="'+s.id+'">Edit</button>' +
            '<button class="btn btn-danger btn-sm" data-act="delSched" data-id="'+s.id+'">Remove</button></div></div>';
        }).join('') : '<div class="empty">No custom schedules yet.</div>') +
        '<button class="btn btn-ghost btn-full" data-act="addSched">+ Add Schedule (Happy Hour, Brunch…)</button>' +
      '</div>';
  }

  function renderCharacter(){
    var list = draft.character;
    return '<div class="chips">' +
      CHAR_DEFAULTS.concat(list.filter(function(n){ return CHAR_DEFAULTS.indexOf(n)===-1; })).map(function(n){
        var on = list.indexOf(n)>-1;
        return '<span class="chip '+(on?'active':'')+'" data-act="toggleChar" data-val="'+esc(n)+'">'+esc(n)+(on?' ✕':'')+'</span>';
      }).join('') +
      '<span class="chip add" data-act="addChar">+ Custom</span>' +
    '</div>';
  }

  function renderAmenities(){
    var list = draft.amenities;
    return '<div class="chips">' +
      AMEN_DEFAULTS.concat(list.filter(function(n){ return AMEN_DEFAULTS.indexOf(n)===-1; })).map(function(n){
        var on = list.indexOf(n)>-1;
        return '<span class="chip '+(on?'active':'')+'" data-act="toggleAmen" data-val="'+esc(n)+'">'+esc(n)+(on?' ✕':'')+'</span>';
      }).join('') +
      '<span class="chip add" data-act="addAmen">+ Custom</span>' +
    '</div>';
  }

  function renderMenuTags(){
    var list = draft.menuTags;
    return Object.keys(TAG_GROUPS).map(function(g){
      return '<div class="subsection"><div class="sub-h">'+g+'</div><div class="chips">' +
        TAG_GROUPS[g].map(function(n){
          var on = list.indexOf(n)>-1;
          return '<span class="chip '+(on?'active':'')+'" data-act="toggleMT" data-val="'+esc(n)+'">'+esc(n)+'</span>';
        }).join('') +
      '</div></div>';
    }).join('') +
      '<div class="row" style="margin-top:10px"><button class="btn btn-ghost btn-sm" data-act="addMT">+ Add Custom Tag</button></div>';
  }

  function renderCapacity(){
    var c = draft.capacity;
    return (c.length ? c.map(function(x){
      return '<div class="record"><div class="record-title">'+esc(x.title)+' — '+esc(x.value)+'</div>' +
        (x.description?'<div class="record-meta">'+esc(x.description)+'</div>':'') +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editCap" data-id="'+x.id+'">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delCap" data-id="'+x.id+'">Remove</button></div></div>';
    }).join('') : '<div class="empty">No capacity entries yet.</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addCap">+ Add Capacity</button>';
  }

  function renderPayments(){
    var list = draft.payments;
    return '<div class="chips">' + PAY_METHODS.map(function(m){
      var on = list.indexOf(m)>-1;
      return '<span class="chip '+(on?'active':'')+'" data-act="togglePay" data-val="'+esc(m)+'">'+esc(m)+'</span>';
    }).join('') + '</div>';
  }

  function renderReservations(){
    var r = draft.reservations;
    var cs = draft.contacts;
    return '' +
      '<label class="switch"><input type="checkbox" id="f_res_on" '+(r.enabled?'checked':'')+'><span class="track"></span><span class="lbl">Reservations available</span></label>' +
      '<div class="grid2">' +
        '<div class="field"><label>WhatsApp Number</label><select id="f_res_wa"><option value="">— choose contact —</option>' +
          cs.map(function(c){ return '<option value="'+c.id+'"'+(r.whatsappContactId===c.id?' selected':'')+'>'+esc(c.title||c.number)+'</option>'; }).join('') +
        '</select></div>' +
        '<div class="field"><label>Call Number</label><select id="f_res_call"><option value="">— choose contact —</option>' +
          cs.map(function(c){ return '<option value="'+c.id+'"'+(r.callContactId===c.id?' selected':'')+'>'+esc(c.title||c.number)+'</option>'; }).join('') +
        '</select></div>' +
      '</div>' +
      '<div class="grid2">' +
        '<div class="field"><label>Minimum Guests</label><input type="number" id="f_res_min" value="'+r.minGuests+'"></div>' +
        '<div class="field"><label>Maximum Guests</label><input type="number" id="f_res_max" value="'+r.maxGuests+'"></div>' +
      '</div>' +
      '<label class="switch"><input type="checkbox" id="f_res_same" '+(r.sameDay?'checked':'')+'><span class="track"></span><span class="lbl">Same-day reservations</span></label>' +
      '<label class="switch"><input type="checkbox" id="f_res_adv" '+(r.advanceBooking?'checked':'')+'><span class="track"></span><span class="lbl">Advance booking required</span></label>' +
      '<div class="field"><label>Cancellation / Notes</label><textarea id="f_res_notes">'+esc(r.notes)+'</textarea></div>';
  }

  function renderServices(){
    var list = draft.reservationServices;
    return (list.length ? list.map(function(s){
      return '<div class="record"><div class="record-title">'+esc(s.name)+'</div>' +
        '<div class="record-meta">'+(s.price?'P'+Number(s.price).toFixed(2)+' · '+esc(s.pricingType||''):'Custom quote')+
        (s.description?'<br>'+esc(s.description):'')+'</div>' +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editSvc" data-id="'+s.id+'">Edit</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="dupSvc" data-id="'+s.id+'">Duplicate</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delSvc" data-id="'+s.id+'">Remove</button></div></div>';
    }).join('') : '<div class="empty">No reservation services yet. Add waiter service, VIP booth, birthday setup…</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addSvc">+ Add Service</button>';
  }

  function renderStaff(){
    var list = draft.serviceStaff;
    return (list.length ? list.map(function(s){
      return '<div class="record" style="display:flex;gap:12px;align-items:flex-start">' +
        '<div style="width:44px;height:44px;border-radius:50%;background:#f0eee8;display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--gold);font-size:16px">'+esc((s.firstName||'?')[0])+'</div>' +
        '<div style="flex:1;min-width:0"><div class="record-title">'+esc((s.firstName||'')+' '+(s.surname||''))+'</div>' +
        '<div class="record-meta">'+esc(s.role||'')+(s.price?' · P'+Number(s.price).toFixed(2)+' '+esc(s.pricingType||''):'')+'</div>' +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editStaff" data-id="'+s.id+'">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delStaff" data-id="'+s.id+'">Remove</button></div></div></div>';
    }).join('') : '<div class="empty">No staff yet.</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addStaff">+ Add Staff</button>';
  }

  /* ---------- MENU EDITOR (compact) ---------- */
  function renderMenuEditor(){
    var cats = draft.menu.categories;
    var h = '';
    if(cats.length){
      h += cats.map(function(c, ci){
        return '<div class="record">' +
          '<div class="record-title">'+esc(c.name)+' <span class="badge draft">'+c.items.length+' items</span></div>' +
          '<div class="record-actions">' +
            '<button class="btn btn-ghost btn-sm" data-act="editMenuCat" data-ci="'+ci+'">Edit</button>' +
            '<button class="btn btn-ghost btn-sm" data-act="addMenuItem" data-ci="'+ci+'">+ Item</button>' +
            '<button class="btn btn-danger btn-sm" data-act="delMenuCat" data-ci="'+ci+'">Remove</button>' +
          '</div>' +
          (c.items.length ? '<div style="margin-top:10px">'+c.items.map(function(it, ii){
            return '<div class="record" style="background:#fafaf7;padding:9px 11px;margin-bottom:6px">' +
              '<div class="record-title" style="font-size:12.5px">'+esc(it.name)+'</div>' +
              '<div class="record-meta">'+(it.price?'P'+Number(it.price).toFixed(2):'no price')+(it.description?' · '+esc(it.description.slice(0,60)):'')+'</div>' +
              '<div class="record-actions">' +
                '<button class="btn btn-ghost btn-sm" data-act="editMenuItem" data-ci="'+ci+'" data-ii="'+ii+'">Edit</button>' +
                '<button class="btn btn-danger btn-sm" data-act="delMenuItem" data-ci="'+ci+'" data-ii="'+ii+'">Remove</button>' +
              '</div></div>';
          }).join('')+'</div>' : '<div class="mini" style="margin-top:8px">No items yet</div>') +
        '</div>';
      }).join('');
    } else {
      h += '<div class="empty">No menu categories yet.</div>';
    }
    h += '<div class="row" style="margin-top:10px"><button class="btn btn-ghost btn-full" data-act="addMenuCat">+ Add Menu Category</button></div>';
    return h;
  }

  function renderPromoEditor(){
    var list = draft.promos;
    return (list.length ? list.map(function(p, i){
      return '<div class="record"><div class="record-title">'+esc(p.title||'Untitled')+'</div>' +
        '<div class="record-meta">'+(p.promoPrice?'P'+Number(p.promoPrice).toFixed(2):'')+
        (p.startDate?' · from '+esc(p.startDate):'')+(p.endDate?' to '+esc(p.endDate):'')+'</div>' +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editPromo" data-i="'+i+'">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delPromo" data-i="'+i+'">Remove</button></div></div>';
    }).join('') : '<div class="empty">No promos yet.</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addPromo">+ Add Promo</button>';
  }

  function renderEventEditor(){
    var list = draft.events;
    return (list.length ? list.map(function(e, i){
      return '<div class="record"><div class="record-title">'+esc(e.name||'Untitled')+'</div>' +
        '<div class="record-meta">'+esc(e.startDate||'')+(e.startTime?' · '+esc(e.startTime):'')+'</div>' +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editEvent" data-i="'+i+'">Edit</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delEvent" data-i="'+i+'">Remove</button></div></div>';
    }).join('') : '<div class="empty">No events yet.</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addEvent">+ Add Event</button>';
  }

  function renderGalleryEditor(){
    var groups = draft.gallery.groups;
    return (groups.length ? groups.map(function(g, i){
      return '<div class="record"><div class="record-title">'+esc(g.title)+' <span class="badge draft">'+((g.images||[]).length)+' images</span></div>' +
        '<div class="record-actions"><button class="btn btn-ghost btn-sm" data-act="editGalGroup" data-i="'+i+'">Edit</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="addGalImage" data-i="'+i+'">+ Image</button>' +
        '<button class="btn btn-danger btn-sm" data-act="delGalGroup" data-i="'+i+'">Remove</button></div>' +
        (g.images && g.images.length ? '<div style="margin-top:8px">'+g.images.map(function(im, ii){
          return '<div class="record" style="background:#fafaf7;padding:8px 10px;margin-bottom:5px;font-size:11.5px">' +
            esc(im.src.slice(0,60)) + '… <button class="btn btn-danger btn-sm" style="float:right;padding:2px 7px;min-height:22px;font-size:10px" data-act="delGalImage" data-i="'+i+'" data-ii="'+ii+'">×</button>' +
          '</div>';
        }).join('')+'</div>' : '') +
      '</div>';
    }).join('') : '<div class="empty">No gallery groups yet.</div>') +
      '<button class="btn btn-ghost btn-full" data-act="addGalGroup">+ Add Gallery Group</button>';
  }

  function renderReview(){
    var d = draft;
    var filename = 'venue_' + (slugify(d.identity.name)||'untitled') + '_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '.json';
    var json = JSON.stringify(buildExportObject(), null, 2);
    return '' +
      '<div class="subsection"><div class="sub-h">Venue</div>' +
        '<div class="mini"><b>' + esc(d.identity.name || '—') + '</b></div>' +
        '<div class="mini">' + esc(d.location.town || '—') + (d.location.area ? ' · ' + esc(d.location.area) : '') + '</div>' +
      '</div>' +
      '<div class="subsection"><div class="sub-h">Totals</div>' +
        '<div class="mini">Contacts: <b>'+d.contacts.length+'</b> · Menu categories: <b>'+d.menu.categories.length+'</b> · Promos: <b>'+d.promos.length+'</b> · Events: <b>'+d.events.length+'</b> · Gallery groups: <b>'+d.gallery.groups.length+'</b></div>' +
      '</div>' +
      '<div class="subsection"><div class="sub-h">Export filename</div>' +
        '<div class="export-box">'+esc(filename)+'</div>' +
      '</div>' +
      '<div class="subsection"><div class="sub-h">JSON preview</div>' +
        '<div class="export-box">'+esc(json)+'</div>' +
      '</div>';
  }

  function renderChecklist(c){
    var order = ['identity','location','contacts','menu','gallery','promos','reservations'];
    var byKey = {}; c.checks.forEach(function(x){ byKey[x.k] = x; });
    var labels = { identity:'Profile identity set', location:'Location set', contacts:'Contact numbers added', menu:'Menu built', gallery:'Gallery photos added', promos:'At least one promo', reservations:'Reservation settings' };
    var h = '<div class="checklist">';
    order.forEach(function(k, i){
      var ok = byKey[k] && byKey[k].ok;
      h += '<div class="check-item '+(ok?'done':'')+'">' +
        '<div class="n">'+(ok?'✓':(i+1))+'</div>' +
        '<div class="lbl">'+esc(labels[k])+'</div>' +
        '<div class="st">'+(ok?'Done':'Pending')+'</div>' +
      '</div>';
    });
    h += '</div>';
    h += '<div class="row" style="margin-top:12px"><button class="btn btn-ghost" data-act="printChecklist">🖨 Print Checklist</button></div>';
    return h;
  }

  /* ---------- export object ---------- */
  function buildExportObject(){
    var d = draft;
    var slug = slugify(d.identity.name) || 'untitled';
    return {
      $schema: 'eatouts.venue.v1',
      generatedAt: new Date().toISOString(),
      slug: slug,
      name: d.identity.name,
      description: d.identity.description,
      logo: d.identity.logo || null,
      coverImage: d.identity.coverImage || null,
      types: d.identity.types,
      category: d.identity.types[0] || '',
      location: {
        district: d.location.district,
        districtName: d.location.districtName,
        town: d.location.town,
        area: d.location.area,
        plotNumber: d.location.plotNumber,
        street: d.location.street,
        building: d.location.building,
        landmark: d.location.landmark,
        lat: d.location.lat,
        lng: d.location.lng
      },
      landmark: d.location.landmark,
      contacts: d.contacts.map(function(c){ return { id:c.id, title:c.title, countryCode:c.countryCode, number:c.number, purpose:c.purpose, primary:!!c.primary, whatsapp:!!c.whatsapp, active:c.active!==false }; }),
      socials: Object.keys(d.socials).filter(function(k){ return d.socials[k]; }).map(function(k){ var o = {}; o[k] = d.socials[k]; return o; }),
      profile: {
        name: d.identity.name,
        identity: { name:d.identity.name, description:d.identity.description, logo:d.identity.logo, coverImage:d.identity.coverImage, types:d.identity.types, status:'draft' },
        location: { city:d.location.town, area:d.location.area, plotNumber:d.location.plotNumber, streetName:d.location.street, building:d.location.building, landmark:d.location.landmark, latitude:d.location.lat, longitude:d.location.lng },
        contacts: d.contacts,
        socials: [d.socials],
        operatingHours: {
          title:'Operating Hours',
          weekly: Object.keys(d.hours.weekly||{}).map(function(day){ return { day:day, open:(d.hours.weekly[day]||{}).open||'', close:(d.hours.weekly[day]||{}).close||'' }; }),
          customSchedules: d.hours.custom
        },
        character: { title:'Restaurant Character', options: d.character.map(function(n,i){ return { id:uid('char'), name:n, order:i+1 }; }) },
        amenities: { title:'Amenities', options: d.amenities.map(function(n,i){ return { id:uid('amen'), name:n, order:i+1 }; }) },
        menuTags: { title:'Menu Tags', options: d.menuTags.map(function(n,i){ return { id:uid('tag'), name:n, order:i+1 }; }) },
        capacity: d.capacity,
        payments: d.payments,
        reservations: d.reservations,
        reservationServices: d.reservationServices,
        serviceStaff: d.serviceStaff,
        users: []
      },
      content: {
        menuCategories: d.menu.categories.map(function(c, ci){ return { id:c.id, name:c.name, icon:c.icon||'', description:c.description||'', visible:true, order:ci+1 }; }),
        menuItems: d.menu.categories.reduce(function(acc, c){
          c.items.forEach(function(it, ii){
            acc.push({ id:it.id, categoryId:c.id, name:it.name, type:it.type||'', description:it.description||'', image_url:it.image||'', basePrice:it.price, prepTime:it.prepTime||null, status:'available', tags:it.tags||[], variants:it.variants||[], order:ii+1 });
          });
          return acc;
        }, []),
        promos: d.promos,
        events: d.events,
        performers: [],
        performances: [],
        galleryGroups: d.gallery.groups,
        galleryImages: d.gallery.groups.reduce(function(acc, g){
          (g.images||[]).forEach(function(im, i){
            acc.push({ id:im.id, cat:g.title, src:im.src, label:im.label||'', visible:true, order:i+1, groupId:g.id, groupTitle:g.title, groupVisible:true, groupOrder:1, coverImageId:null });
          });
          return acc;
        }, [])
      }
    };
  }

  /* ---------- live binding for plain inputs ---------- */
  function bindLive(){
    var d = draft;
    function on(id, fn){
      var el = document.getElementById(id);
      if(el) el.oninput = el.onchange = function(){ fn(el); draft.updatedAt = Date.now(); draftSave(draft); };
    }
    on('f_name', function(el){ d.identity.name = el.value; var sl = document.getElementById('f_slug'); if(sl && !sl.dataset.touched) sl.value = slugify(el.value); });
    on('f_slug', function(el){ el.dataset.touched = 1; d.identity.slug = el.value; });
    on('f_desc', function(el){ d.identity.description = el.value; });
    on('f_logo', function(el){ d.identity.logo = el.value; });
    on('f_cover', function(el){ d.identity.coverImage = el.value; });

    on('f_district', function(el){
      var opt = el.options[el.selectedIndex];
      d.location.district = el.value;
      d.location.districtName = opt ? opt.textContent : '';
      d.location.town = ''; d.location.area = '';
      render();
    });
    on('f_town', function(el){ d.location.town = el.value; d.location.area=''; render(); });
    on('f_area', function(el){ d.location.area = el.value; });
    on('f_plot', function(el){ d.location.plotNumber = el.value; });
    on('f_street', function(el){ d.location.street = el.value; });
    on('f_building', function(el){ d.location.building = el.value; });
    on('f_landmark', function(el){ d.location.landmark = el.value; });
    on('f_lat', function(el){ d.location.lat = el.value===''?null:Number(el.value); });
    on('f_lng', function(el){ d.location.lng = el.value===''?null:Number(el.value); });

    document.querySelectorAll('[data-social]').forEach(function(el){
      el.oninput = function(){ d.socials[el.getAttribute('data-social')] = el.value; draft.updatedAt = Date.now(); draftSave(draft); };
    });
    document.querySelectorAll('[data-hr]').forEach(function(el){
      el.onchange = function(){
        var day = el.getAttribute('data-hr');
        var k = el.getAttribute('data-k');
        d.hours.weekly[day] = d.hours.weekly[day] || { open:'', close:'' };
        d.hours.weekly[day][k] = el.value;
        draft.updatedAt = Date.now(); draftSave(draft);
      };
    });
    on('f_res_on', function(el){ d.reservations.enabled = el.checked; });
    on('f_res_wa', function(el){ d.reservations.whatsappContactId = el.value || null; });
    on('f_res_call', function(el){ d.reservations.callContactId = el.value || null; });
    on('f_res_min', function(el){ d.reservations.minGuests = Number(el.value)||0; });
    on('f_res_max', function(el){ d.reservations.maxGuests = Number(el.value)||0; });
    on('f_res_same', function(el){ d.reservations.sameDay = el.checked; });
    on('f_res_adv', function(el){ d.reservations.advanceBooking = el.checked; });
    on('f_res_notes', function(el){ d.reservations.notes = el.value; });
  }

  /* ---------- event handling ---------- */
  document.addEventListener('click', function(e){
    var t = e.target.closest('[data-toggle],[data-act]');
    if(!t) return;

    if(t.hasAttribute('data-toggle')){ toggle(t.getAttribute('data-toggle')); return; }
    var act = t.getAttribute('data-act');
    var id = t.getAttribute('data-id');

    /* identity */
    if(act==='toggleType'){
      var v = t.getAttribute('data-val');
      var i = draft.identity.types.indexOf(v);
      if(i>=0) draft.identity.types.splice(i,1); else draft.identity.types.push(v);
      draftSave(draft); render(); return;
    }
    if(act==='addType'){ openForm({title:'Add custom type', fields:[{key:'value',label:'Type'}], onSave:function(o){ if(o.value && o.value.trim()){ draft.identity.types.push(o.value.trim()); draftSave(draft); render(); } }}); return; }

    /* location */
    if(act==='useCurrent'){
      if(!navigator.geolocation){ toast('Geolocation unavailable'); return; }
      navigator.geolocation.getCurrentPosition(function(p){
        draft.location.lat = +p.coords.latitude.toFixed(6);
        draft.location.lng = +p.coords.longitude.toFixed(6);
        draftSave(draft); render();
      }, function(){ toast('Permission denied'); });
      return;
    }
    if(act==='previewMap'){
      var l = draft.location;
      if(l.lat==null){ toast('Set GPS first'); return; }
      window.open('https://maps.google.com/?q='+l.lat+','+l.lng, '_blank');
      return;
    }

    /* contacts */
    if(act==='addContact' || act==='editContact'){
      var c = act==='editContact' ? draft.contacts.find(function(x){ return x.id===id; }) : {};
      openForm({ title: act==='editContact'?'Edit contact':'Add contact', values:c, fields:[
        { key:'title', label:'Title', placeholder:'Reservations / Orders' },
        { key:'countryCode', label:'Country code', placeholder:'+267' },
        { key:'number', label:'Number', placeholder:'71 234 567' },
        { key:'purpose', label:'Purpose', type:'select', options:['General enquiries','Orders','Reservations','Delivery','Catering','Events','Functions','Manager','Customer support','Other'] },
        { key:'primary', label:'Primary', type:'checkbox' },
        { key:'whatsapp', label:'WhatsApp', type:'checkbox' },
        { key:'active', label:'Active', type:'checkbox' }
      ], onSave:function(v){
        if(act==='editContact'){ Object.assign(c, v); }
        else { draft.contacts.push(Object.assign({ id:uid('contact'), active:true }, v)); }
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='dupContact'){
      var src = draft.contacts.find(function(x){ return x.id===id; });
      if(src){ var copy = JSON.parse(JSON.stringify(src)); copy.id = uid('contact'); copy.primary = false; draft.contacts.push(copy); draftSave(draft); render(); }
      return;
    }
    if(act==='delContact'){ draft.contacts = draft.contacts.filter(function(x){ return x.id!==id; }); draftSave(draft); render(); return; }

    /* schedules */
    if(act==='addSched' || act==='editSched'){
      var s = act==='editSched' ? draft.hours.custom.find(function(x){ return x.id===id; }) : {};
      openForm({ title: act==='editSched'?'Edit schedule':'Add schedule', values:s, fields:[
        { key:'title', label:'Title', placeholder:'Happy Hour Thursdays' },
        { key:'days', label:'Days', placeholder:'Thursday, Friday' },
        { key:'start', label:'Start', type:'time' },
        { key:'end', label:'End', type:'time' }
      ], onSave:function(v){
        if(act==='editSched') Object.assign(s, v);
        else draft.hours.custom.push(Object.assign({ id:uid('sched') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delSched'){ draft.hours.custom = draft.hours.custom.filter(function(x){ return x.id!==id; }); draftSave(draft); render(); return; }

    /* character / amenities / tags */
    if(act==='toggleChar'){ var vc = t.getAttribute('data-val'); var ic = draft.character.indexOf(vc); if(ic>=0) draft.character.splice(ic,1); else draft.character.push(vc); draftSave(draft); render(); return; }
    if(act==='addChar'){ openForm({title:'Add character', fields:[{key:'value',label:'Value'}], onSave:function(o){ if(o.value){ draft.character.push(o.value.trim()); draftSave(draft); render(); } }}); return; }
    if(act==='toggleAmen'){ var va = t.getAttribute('data-val'); var ia = draft.amenities.indexOf(va); if(ia>=0) draft.amenities.splice(ia,1); else draft.amenities.push(va); draftSave(draft); render(); return; }
    if(act==='addAmen'){ openForm({title:'Add amenity', fields:[{key:'value',label:'Value'}], onSave:function(o){ if(o.value){ draft.amenities.push(o.value.trim()); draftSave(draft); render(); } }}); return; }
    if(act==='toggleMT'){ var vm = t.getAttribute('data-val'); var im = draft.menuTags.indexOf(vm); if(im>=0) draft.menuTags.splice(im,1); else draft.menuTags.push(vm); draftSave(draft); render(); return; }
    if(act==='addMT'){ openForm({title:'Add menu tag', fields:[{key:'value',label:'Value'}], onSave:function(o){ if(o.value){ draft.menuTags.push(o.value.trim()); draftSave(draft); render(); } }}); return; }

    /* capacity */
    if(act==='addCap' || act==='editCap'){
      var cp = act==='editCap' ? draft.capacity.find(function(x){ return x.id===id; }) : {};
      openForm({ title: act==='editCap'?'Edit capacity':'Add capacity', values:cp, fields:[
        { key:'title', label:'Title', placeholder:'Indoor seating' },
        { key:'value', label:'Number', type:'number' },
        { key:'description', label:'Description', type:'textarea' }
      ], onSave:function(v){
        if(act==='editCap') Object.assign(cp, v);
        else draft.capacity.push(Object.assign({ id:uid('cap') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delCap'){ draft.capacity = draft.capacity.filter(function(x){ return x.id!==id; }); draftSave(draft); render(); return; }

    /* payments */
    if(act==='togglePay'){ var vp = t.getAttribute('data-val'); var ip = draft.payments.indexOf(vp); if(ip>=0) draft.payments.splice(ip,1); else draft.payments.push(vp); draftSave(draft); render(); return; }

    /* services */
    if(act==='addSvc' || act==='editSvc'){
      var sv = act==='editSvc' ? draft.reservationServices.find(function(x){ return x.id===id; }) : {};
      openForm({ title: act==='editSvc'?'Edit service':'Add service', values:sv, fields:[
        { key:'name', label:'Service name' },
        { key:'description', label:'Description', type:'textarea' },
        { key:'price', label:'Price', type:'number' },
        { key:'pricingType', label:'Pricing type', type:'select', options:['Per person','Per table','Per hour','Per booking','Per item','Fixed price','Custom quote'] }
      ], onSave:function(v){
        if(act==='editSvc') Object.assign(sv, v);
        else draft.reservationServices.push(Object.assign({ id:uid('svc') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='dupSvc'){ var ss = draft.reservationServices.find(function(x){ return x.id===id; }); if(ss){ var cc = JSON.parse(JSON.stringify(ss)); cc.id = uid('svc'); draft.reservationServices.push(cc); draftSave(draft); render(); } return; }
    if(act==='delSvc'){ draft.reservationServices = draft.reservationServices.filter(function(x){ return x.id!==id; }); draftSave(draft); render(); return; }

    /* staff */
    if(act==='addStaff' || act==='editStaff'){
      var st = act==='editStaff' ? draft.serviceStaff.find(function(x){ return x.id===id; }) : {};
      openForm({ title: act==='editStaff'?'Edit staff':'Add staff', values:st, fields:[
        { key:'firstName', label:'First name' },
        { key:'surname', label:'Surname' },
        { key:'role', label:'Role', type:'select', options:['Waiter','Waitress','Host','Bartender','Chef','Private chef','Sommelier','Event staff','Security','Photographer','Decorator','MC','Other'] },
        { key:'description', label:'Description', type:'textarea' },
        { key:'price', label:'Price', type:'number' },
        { key:'pricingType', label:'Pricing type', type:'select', options:['No additional charge','Per booking','Per hour','Per person','Per item'] }
      ], onSave:function(v){
        if(act==='editStaff') Object.assign(st, v);
        else draft.serviceStaff.push(Object.assign({ id:uid('staff') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delStaff'){ draft.serviceStaff = draft.serviceStaff.filter(function(x){ return x.id!==id; }); draftSave(draft); render(); return; }

    /* menu */
    if(act==='addMenuCat' || act==='editMenuCat'){
      var ci = parseInt(t.getAttribute('data-ci'),10);
      var mc = act==='editMenuCat' ? draft.menu.categories[ci] : {};
      openForm({ title: act==='editMenuCat'?'Edit category':'Add category', values:mc, fields:[
        { key:'name', label:'Category name' },
        { key:'icon', label:'Emoji icon', placeholder:'🍽️' },
        { key:'description', label:'Description' }
      ], onSave:function(v){
        if(act==='editMenuCat') Object.assign(mc, v);
        else draft.menu.categories.push(Object.assign({ id:uid('cat'), items:[] }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delMenuCat'){ var ci2 = parseInt(t.getAttribute('data-ci'),10); if(confirm('Remove category?')){ draft.menu.categories.splice(ci2,1); draftSave(draft); render(); } return; }
    if(act==='addMenuItem' || act==='editMenuItem'){
      var cix = parseInt(t.getAttribute('data-ci'),10);
      var iix = t.hasAttribute('data-ii') ? parseInt(t.getAttribute('data-ii'),10) : -1;
      var mi = iix>=0 ? draft.menu.categories[cix].items[iix] : {};
      openForm({ title: iix>=0?'Edit item':'Add menu item', values:mi, fields:[
        { key:'name', label:'Item name' },
        { key:'description', label:'Description', type:'textarea' },
        { key:'type', label:'Type', type:'select', options:['Main','Starter','Side','Dessert','Drink','Coffee','Beer','Wine','Cocktail','Other'] },
        { key:'price', label:'Price', type:'number' },
        { key:'image', label:'Image', type:'file' },
        { key:'prepTime', label:'Prep time (min)', type:'number' },
        { key:'tags', label:'Tags (comma sep)' }
      ], onSave:function(v){
        if(v.tags) v.tags = String(v.tags).split(',').map(function(s){ return s.trim(); }).filter(Boolean);
        if(iix>=0){ Object.assign(mi, v); }
        else { draft.menu.categories[cix].items.push(Object.assign({ id:uid('item') }, v)); }
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delMenuItem'){ var cx=parseInt(t.getAttribute('data-ci'),10); var ix=parseInt(t.getAttribute('data-ii'),10); if(confirm('Remove item?')){ draft.menu.categories[cx].items.splice(ix,1); draftSave(draft); render(); } return; }

    /* promos */
    if(act==='addPromo' || act==='editPromo'){
      var pi = t.hasAttribute('data-i') ? parseInt(t.getAttribute('data-i'),10) : -1;
      var p = pi>=0 ? draft.promos[pi] : {};
      openForm({ title: pi>=0?'Edit promo':'Add promo', values:p, fields:[
        { key:'title', label:'Title' },
        { key:'description', label:'Description', type:'textarea' },
        { key:'promoPrice', label:'Promo price', type:'number' },
        { key:'originalPrice', label:'Original price', type:'number' },
        { key:'startDate', label:'Start date', type:'date' },
        { key:'endDate', label:'End date', type:'date' },
        { key:'valid', label:'Valid (text)', placeholder:'Mon–Fri 17:00–19:00' }
      ], onSave:function(v){
        if(pi>=0) Object.assign(p, v);
        else draft.promos.push(Object.assign({ id:uid('promo') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delPromo'){ var pi2 = parseInt(t.getAttribute('data-i'),10); if(confirm('Remove promo?')){ draft.promos.splice(pi2,1); draftSave(draft); render(); } return; }

    /* events */
    if(act==='addEvent' || act==='editEvent'){
      var ei = t.hasAttribute('data-i') ? parseInt(t.getAttribute('data-i'),10) : -1;
      var ev = ei>=0 ? draft.events[ei] : {};
      openForm({ title: ei>=0?'Edit event':'Add event', values:ev, fields:[
        { key:'name', label:'Event name' },
        { key:'description', label:'Description', type:'textarea' },
        { key:'startDate', label:'Start date', type:'date' },
        { key:'startTime', label:'Start time', type:'time' },
        { key:'endTime', label:'End time', type:'time' },
        { key:'admission', label:'Admission', type:'select', options:['Free','RSVP','Reservation','Paid','Invite'] },
        { key:'ticketPrice', label:'Ticket price', type:'number' }
      ], onSave:function(v){
        if(ei>=0) Object.assign(ev, v);
        else draft.events.push(Object.assign({ id:uid('event') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delEvent'){ var ei2 = parseInt(t.getAttribute('data-i'),10); if(confirm('Remove event?')){ draft.events.splice(ei2,1); draftSave(draft); render(); } return; }

    if(act==='uploadImage'){ pickImageInto(t.getAttribute('data-target')); return; }
    /* gallery */
    if(act==='addGalGroup' || act==='editGalGroup'){
      var gi = t.hasAttribute('data-i') ? parseInt(t.getAttribute('data-i'),10) : -1;
      var g = gi>=0 ? draft.gallery.groups[gi] : {};
      openForm({ title: gi>=0?'Edit group':'Add gallery group', values:g, fields:[
        { key:'title', label:'Group title', placeholder:'Food / Interior / Events' }
      ], onSave:function(v){
        if(gi>=0) Object.assign(g, v);
        else draft.gallery.groups.push(Object.assign({ id:uid('gal'), images:[] }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='addGalImage'){
      var gi2 = parseInt(t.getAttribute('data-i'),10);
      openForm({ title:'Add image', fields:[
        { key:'src', label:'Image', type:'file' },
        { key:'label', label:'Label' }
      ], onSave:function(v){
        if(!v.src) return;
        draft.gallery.groups[gi2].images.push(Object.assign({ id:uid('img') }, v));
        draftSave(draft); render();
      }});
      return;
    }
    if(act==='delGalImage'){ var gi3=parseInt(t.getAttribute('data-i'),10); var ii3=parseInt(t.getAttribute('data-ii'),10); draft.gallery.groups[gi3].images.splice(ii3,1); draftSave(draft); render(); return; }
    if(act==='delGalGroup'){ var gi4=parseInt(t.getAttribute('data-i'),10); if(confirm('Remove group?')){ draft.gallery.groups.splice(gi4,1); draftSave(draft); render(); } return; }

    /* actions */
    if(act==='printChecklist'){ window.print(); return; }
  });

  /* ---------- action bar ---------- */
  document.getElementById('btnSave').onclick = function(){
    draft.updatedAt = Date.now(); draftSave(draft); toast('Draft saved');
  };
  document.getElementById('btnExport').onclick = function(){
    var slug = slugify(draft.identity.name) || 'untitled';
    var filename = 'venue_' + slug + '_' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '.json';
    var obj = buildExportObject();
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    draft.export.lastExportedAt = Date.now();
    draft.export.filename = filename;
    draftSave(draft);
    /* also log a submission in the ops store */
    var ops = opsLoad();
    ops.submissions = ops.submissions || [];
    ops.submissions.push({ slug:slug, filename:filename, at:Date.now(), by: (EatoutsAuth.currentSession()||{}).userName || 'operator' });
    opsSave(ops);
    toast('Exported ' + filename);
  };
  document.getElementById('btnSummary').onclick = function(){
    var d = draft;
    var lines = [];
    lines.push('*EatOuts concierge intake summary*');
    lines.push('Venue: ' + (d.identity.name || '—'));
    lines.push('Town: ' + (d.location.town || '—') + (d.location.area ? ' · ' + d.location.area : ''));
    if(d.identity.types.length) lines.push('Type: ' + d.identity.types.join(', '));
    if(d.contacts.length) lines.push('Contacts: ' + d.contacts.map(function(c){ return (c.title||'') + ' ' + (c.countryCode||'+267') + ' ' + (c.number||''); }).join(' | '));
    lines.push('Menu: ' + d.menu.categories.length + ' categories, ' + d.menu.categories.reduce(function(s,c){ return s + c.items.length; },0) + ' items');
    lines.push('Promos: ' + d.promos.length);
    lines.push('Events: ' + d.events.length);
    lines.push('Gallery: ' + d.gallery.groups.length + ' groups');
    var number = '26771844129';
    try { var s = EatoutsDB.load().settings || {}; if(s.whatsapp) number = String(s.whatsapp).replace(/[^\d]/g,''); } catch(e){}
    window.location.href = 'https://wa.me/' + number + '?text=' + encodeURIComponent(lines.join('\n'));
  };

  /* ---------- boot ---------- */
  render();
})();
