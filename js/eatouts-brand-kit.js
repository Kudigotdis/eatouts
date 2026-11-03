/* ============================================================
   EATOUTS BRAND KIT — shared logic
   Services catalogue, designers, job lifecycle and pricing.
   Used by designer-services.html, designer-dashboard.html and
   brand-kit-admin.html. No external dependencies; reads config
   from EatoutsDB.settings.whatsapp when available.

   Stores:
     eatouts_services_v1   — catalogue (seeded once)
     eatouts_designers_v1  — roster (seeded once)
     eatouts_jobs_v1       — every job + retainer cycle
   ============================================================ */
(function(){
  'use strict';

  var SERVICES_KEY  = 'eatouts_services_v1';
  var DESIGNERS_KEY = 'eatouts_designers_v1';
  var JOBS_KEY      = 'eatouts_jobs_v1';
  var SETTINGS_KEY  = 'eatouts_db_v2';   // just read for whatsapp number

  var COMMISSION = 0.15;
  var FOUNDING_DISCOUNT = 200; /* P200 off the Brand Kit for the Founding-20 */

  /* ---------- storage helpers ---------- */
  function readJSON(key, fallback){
    try{
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(e){
      console.warn('[brand-kit] read failed for', key, e);
      return fallback;
    }
  }
  function writeJSON(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ console.warn('[brand-kit] write failed for', key, e); return false; }
  }

  /* ---------- seeding ---------- */
  /* Prices shipped by catalogue v1. Used only to tell a catalogue nobody has
     edited (safe to replace) from one an admin has already changed (left alone). */
  var V1_PRICES = {
    svc_logo_cleanup:250, svc_brand_kit:350, svc_brand_kit_plus:500, svc_brand_guidelines:900,
    svc_promo_single:80, svc_promo_pack5:300, svc_promo_pack10:550, svc_promo_retainer:500,
    svc_story_pack10:450, svc_event_flyer:120, svc_event_pack:280, svc_event_programme:350,
    svc_menu_refresh:400, svc_menu_full:700, svc_menu_photo:1200,
    svc_print_cards:200, svc_print_flyer_a5:180, svc_print_table_tent:220, svc_print_poster:240,
    svc_print_shopfront:800, svc_print_vehicle:1500,
    svc_social_weekly:350, svc_social_monthly:1200, svc_social_banners:280,
    svc_pack_bag:500, svc_pack_system:1800,
    svc_motion_promo:400, svc_motion_teaser:800, svc_motion_social:1200, svc_motion_logo:500
  };

  function catalogueIsV1(list){
    if(!Array.isArray(list) || list.length !== 30) return false;
    return list.every(function(s){ return !!s && V1_PRICES[s.id] === Number(s.base_price); });
  }

  /* Replace a cached catalogue that is still the v1 copy with the current seed.
     Catalogues an admin has edited keep their prices — we only record that the
     version was checked, so we do not fight the admin on every page load. */
  function migrateServicesSeed(){
    var seed = window.EATOUTS_SERVICES_SEED;
    if(!seed || !Array.isArray(seed.services) || !seed.services.length) return;
    var target = Number(seed.version) || 1;
    var stored = readJSON(SERVICES_KEY, null);
    if(!stored || !Array.isArray(stored.services)) return;
    if((Number(stored.version) || 1) >= target) return;
    if(!catalogueIsV1(stored.services)){
      stored.version = target;
      writeJSON(SERVICES_KEY, stored);
      return;
    }
    writeJSON(SERVICES_KEY, seed);
  }

  function seedIfEmpty(){
    if(!localStorage.getItem(SERVICES_KEY)){
      var svc = (window.EATOUTS_SERVICES_SEED) || { services:[], categories:[], bundleRules:[], addOns:[] };
      writeJSON(SERVICES_KEY, svc);
    } else {
      migrateServicesSeed();
    }
    if(!localStorage.getItem(DESIGNERS_KEY)){
      var des = (window.EATOUTS_DESIGNERS_SEED) || { designers:[] };
      writeJSON(DESIGNERS_KEY, des);
    } else {
      /* backfill new fields (e.g. photo) into rosters stored before the seed gained them */
      var stored = designers();
      var fresh = (window.EATOUTS_DESIGNERS_SEED) || { designers:[] };
      var byId = {};
      fresh.designers.forEach(function(d){ byId[d.id] = d; });
      var changed = false;
      stored.forEach(function(d){
        var src = byId[d.id];
        if(!src) return;
        ['photo'].forEach(function(k){
          if(d[k] == null && src[k] != null){ d[k] = src[k]; changed = true; }
        });
      });
      if(changed) writeJSON(DESIGNERS_KEY, { designers: stored });
    }
    if(!localStorage.getItem(JOBS_KEY)){
      writeJSON(JOBS_KEY, { jobs: [] });
    }
  }

  /* ---------- read accessors ---------- */
  function allServices(){
    return (readJSON(SERVICES_KEY, {services:[]}).services) || [];
  }
  function allCategories(){
    return (readJSON(SERVICES_KEY, {categories:[]}).categories) || [];
  }
  function bundleRules(){
    return (readJSON(SERVICES_KEY, {bundleRules:[]}).bundleRules) || [];
  }
  function addOns(){
    return (readJSON(SERVICES_KEY, {addOns:[]}).addOns) || [];
  }
  function serviceById(id){
    return allServices().filter(function(s){ return s.id === id; })[0] || null;
  }
  function designers(){
    /* tolerate both shapes: {designers:[...]} (this module) and a bare [...] (admin workspace) */
    var raw = readJSON(DESIGNERS_KEY, null);
    if(Array.isArray(raw)) return raw;
    if(raw && Array.isArray(raw.designers)) return raw.designers;
    return [];
  }
  function designerById(id){
    return designers().filter(function(d){ return d.id === id; })[0] || null;
  }
  function jobs(){
    return (readJSON(JOBS_KEY, {jobs:[]}).jobs) || [];
  }
  function jobById(id){
    return jobs().filter(function(j){ return j.id === id; })[0] || null;
  }

  /* ---------- pricing ---------- */
  function applyAddOns(base, addOnCodes){
    var total = Number(base) || 0;
    var applied = [];
    var available = addOns();
    (addOnCodes || []).forEach(function(code){
      var a = available.filter(function(x){ return x.code === code; })[0];
      if(!a) return;
      var price = a.price_flat != null ? a.price_flat
                : Math.round(base * (Number(a.price_pct)||0) / 100);
      total += price;
      applied.push({ code:a.code, label:a.label, price:price });
    });
    return { total: total, applied: applied };
  }
  function applyBundleDiscount(subtotal, itemCount){
    var rules = bundleRules();
    if(!rules.length) return { discount:0, label:null };
    var best = null;
    rules.forEach(function(r){
      if(itemCount >= r.min_items){
        if(!best || r.discount > best.discount) best = r;
      }
    });
    return best ? { discount: best.discount, label: best.label } : { discount:0, label:null };
  }
  function calculatePrice(serviceId, opts){
    opts = opts || {};
    var svc = serviceById(serviceId);
    if(!svc) return null;
    var addon = applyAddOns(svc.base_price, opts.addOnCodes || []);
    var bundle = applyBundleDiscount(addon.total, opts.itemCount || 1);
    var founding = !!opts.foundingGift;
    var gross = Math.max(0, addon.total - bundle.discount);
    if(founding && svc.id === 'svc_brand_kit'){
      gross = Math.max(0, gross - FOUNDING_DISCOUNT);
    }
    var platformCut = Math.round(gross * COMMISSION * 100) / 100;
    var designerPayout = Math.round((gross - platformCut) * 100) / 100;
    return {
      service: svc,
      base: svc.base_price,
      addOns: addon.applied,
      bundleDiscount: bundle.discount,
      bundleLabel: bundle.label,
      foundingDiscount: (founding && svc.id === 'svc_brand_kit') ? FOUNDING_DISCOUNT : 0,
      gross: gross,
      platformCut: platformCut,
      designerPayout: designerPayout,
      commissionRate: COMMISSION
    };
  }

  /* ---------- founding-20 ---------- */
  function foundingJobsUsed(){
    return jobs().filter(function(j){ return j.founding_gift === true; }).length;
  }
  function foundingRemaining(){
    return Math.max(0, 20 - foundingJobsUsed());
  }

  /* ---------- designer availability ---------- */
  function designerCanTakeProject(d){
    if(!d || d.locked_by_admin) return false;
    if(d.slot_types && d.slot_types.indexOf('project') === -1) return false;
    return (d.active_projects || 0) < (d.max_projects || 1);
  }
  function designerCanTakeRetainer(d){
    if(!d || d.locked_by_admin) return false;
    if(d.slot_types && d.slot_types.indexOf('retainer') === -1) return false;
    return (d.active_retainers || 0) < (d.max_retainers || 3);
  }
  function designersForCategory(category, isRecurring){
    return designers().filter(function(d){
      var hasSpec = (d.specialties || []).indexOf(category) !== -1;
      if(!hasSpec) return false;
      return isRecurring ? designerCanTakeRetainer(d) : designerCanTakeProject(d);
    });
  }
  function isDesignerReserved(dId){
    /* any job with this designer at status awaiting_admin blocks new picks */
    return jobs().some(function(j){
      return j.designer_id === dId && j.status === 'awaiting_admin';
    });
  }

  /* ---------- job lifecycle ---------- */
  function makeJobId(){
    return 'JOB-' + Date.now().toString(36).toUpperCase().slice(-6);
  }
  function createJob(payload){
    var jobsAll = readJSON(JOBS_KEY, {jobs:[]});
    var now = Date.now();
    var job = {
      id: makeJobId(),
      service_id: payload.service_id,
      service_category: payload.service_category,
      service_name: payload.service_name,
      is_recurring: !!payload.is_recurring,
      business_id: payload.business_id || null,
      business_name: payload.business_name || '',
      business_whatsapp: payload.business_whatsapp || '',
      base_price: payload.base_price,
      add_ons: payload.add_ons || [],
      bundle_discount: payload.bundle_discount || 0,
      founding_discount: payload.founding_discount || 0,
      total: payload.total,
      price_breakdown: {
        gross: payload.total,
        platform_cut: payload.platform_cut,
        designer_payout: payload.designer_payout
      },
      designer_id: payload.designer_id,
      slot_type: payload.is_recurring ? 'retainer' : 'project',
      status: 'awaiting_admin',
      brief: payload.brief || { industry:'', likes:'', dislikes:'', references:[] },
      delivery: {
        draft_submitted_at: null,
        client_reviewed_at: null,
        final_submitted_at: null,
        revisions_used: 0,
        revisions_included: payload.revision_rounds || 2
      },
      deadlines: {
        admin_response_due_by: now + 24*3600*1000,
        first_draft_due_by: null,
        client_review_due_by: null
      },
      payout_status: 'pending',
      reveal_opt_in: !!payload.reveal_opt_in,
      founding_gift: !!payload.founding_gift,
      onboard_upsell_checked: !!payload.onboard_upsell_checked,
      created_at: now,
      updated_at: now,
      stalled_at: null
    };
    jobsAll.jobs.push(job);
    writeJSON(JOBS_KEY, jobsAll);
    return job;
  }
  function updateJob(id, patch){
    var jobsAll = readJSON(JOBS_KEY, {jobs:[]});
    var i = jobsAll.jobs.findIndex(function(j){ return j.id === id; });
    if(i < 0) return null;
    jobsAll.jobs[i] = Object.assign({}, jobsAll.jobs[i], patch, { updated_at: Date.now() });
    writeJSON(JOBS_KEY, jobsAll);
    return jobsAll.jobs[i];
  }
  function approveJob(id){
    var job = jobById(id);
    if(!job || job.status !== 'awaiting_admin') return null;
    var des = designerById(job.designer_id);
    if(!des) return null;
    /* bump the matching counter */
    var designersAll = readJSON(DESIGNERS_KEY, {designers:[]});
    var di = designersAll.designers.findIndex(function(d){ return d.id === des.id; });
    if(di >= 0){
      if(job.slot_type === 'project') designersAll.designers[di].active_projects = (designersAll.designers[di].active_projects || 0) + 1;
      else designersAll.designers[di].active_retainers = (designersAll.designers[di].active_retainers || 0) + 1;
      writeJSON(DESIGNERS_KEY, designersAll);
    }
    var now = Date.now();
    var svc = serviceById(job.service_id);
    var deliveryDays = svc ? svc.delivery_days : 5;
    return updateJob(id, {
      status: 'assigned',
      deadlines: Object.assign({}, job.deadlines, {
        first_draft_due_by: now + deliveryDays * 24*3600*1000
      })
    });
  }
  function rejectJob(id, reason){
    var job = jobById(id);
    if(!job) return null;
    return updateJob(id, { status:'cancelled', rejection_reason: reason || '' });
  }
  function closeJob(id){
    var job = jobById(id);
    if(!job) return null;
    if(job.status !== 'client_approved') return null;
    var designersAll = readJSON(DESIGNERS_KEY, {designers:[]});
    var di = designersAll.designers.findIndex(function(d){ return d.id === job.designer_id; });
    if(di >= 0){
      if(job.slot_type === 'project'){
        designersAll.designers[di].active_projects = Math.max(0, (designersAll.designers[di].active_projects || 0) - 1);
        designersAll.designers[di].jobs_completed = (designersAll.designers[di].jobs_completed || 0) + 1;
      } else {
        designersAll.designers[di].active_retainers = Math.max(0, (designersAll.designers[di].active_retainers || 0) - 1);
      }
      writeJSON(DESIGNERS_KEY, designersAll);
    }
    return updateJob(id, { status:'closed' });
  }
  function markClientApproved(id){
    var job = jobById(id);
    if(!job) return null;
    return updateJob(id, { status:'client_approved', 'delivery.client_reviewed_at': Date.now() });
  }

  /* ---------- WhatsApp handoff ---------- */
  function adminWhatsapp(){
    try{
      var raw = localStorage.getItem(SETTINGS_KEY);
      if(raw){
        var db = JSON.parse(raw);
        if(db && db.settings && db.settings.whatsapp){
          return String(db.settings.whatsapp).replace(/[^\d]/g,'');
        }
      }
    }catch(e){}
    return '26771844129';
  }
  function jobWhatsappMessage(job){
    var des = designerById(job.designer_id) || {};
    var lines = [];
    lines.push('*NEW DESIGN JOB*');
    lines.push('');
    lines.push('Ref: ' + job.id);
    lines.push('Business: ' + (job.business_name || '—'));
    lines.push('WhatsApp: ' + (job.business_whatsapp || '—'));
    lines.push('Service: ' + job.service_name);
    lines.push('Type: ' + (job.is_recurring ? 'Monthly retainer' : 'One-time project'));
    lines.push('');
    lines.push('Style chosen: ' + job.designer_id + ' — ' + (des.portfolio_style || ''));
    lines.push('');
    lines.push('Brief:');
    lines.push('• Industry: ' + (job.brief.industry || '—'));
    lines.push('• Likes: ' + (job.brief.likes || '—'));
    lines.push('• Don\'t want: ' + (job.brief.dislikes || '—'));
    if(job.brief.references && job.brief.references.length){
      lines.push('• References: ' + job.brief.references.join(' | '));
    }
    lines.push('');
    lines.push('Total: P' + job.total.toFixed(2));
    if(job.founding_gift) lines.push('Founding-20 discount applied.');
    lines.push('EatOuts 15%: P' + job.price_breakdown.platform_cut.toFixed(2));
    lines.push('Designer payout: P' + job.price_breakdown.designer_payout.toFixed(2));
    if(job.onboard_upsell_checked){
      lines.push('');
      lines.push('⚠ Client also wants an EatOuts listing (P300 + P100/mo).');
    }
    return lines.join('\n');
  }
  function whatsappLink(job){
    var n = adminWhatsapp();
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(jobWhatsappMessage(job));
  }

  /* ---------- money formatting ---------- */
  function money(n){
    return 'P' + (Number(n)||0).toFixed(2);
  }

  /* ---------- exports ---------- */
  window.EatoutsBrandKit = {
    seedIfEmpty: seedIfEmpty,
    allServices: allServices,
    allCategories: allCategories,
    serviceById: serviceById,
    bundleRules: bundleRules,
    addOns: addOns,
    designers: designers,
    designerById: designerById,
    designerCanTakeProject: designerCanTakeProject,
    designerCanTakeRetainer: designerCanTakeRetainer,
    designersForCategory: designersForCategory,
    isDesignerReserved: isDesignerReserved,
    calculatePrice: calculatePrice,
    foundingJobsUsed: foundingJobsUsed,
    foundingRemaining: foundingRemaining,
    createJob: createJob,
    updateJob: updateJob,
    approveJob: approveJob,
    rejectJob: rejectJob,
    closeJob: closeJob,
    markClientApproved: markClientApproved,
    jobs: jobs,
    jobById: jobById,
    adminWhatsapp: adminWhatsapp,
    jobWhatsappMessage: jobWhatsappMessage,
    whatsappLink: whatsappLink,
    money: money,
    COMMISSION: COMMISSION
  };
})();