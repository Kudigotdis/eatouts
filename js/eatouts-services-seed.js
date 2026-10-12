/* ============================================================
   EATOUTS SERVICES CATALOGUE — seed data
   Single source of truth for every design service. Loaded before
   eatouts-brand-kit.js. Written to localStorage on first run, so
   later admin edits in the console survive reloads.

   Price: integer BWP. delivery_days: working days. revision_rounds:
   included rounds (not per-tier add-ons). is_recurring: true for
   monthly retainers. bundleable: participates in the 2+/4+ discount.
   ============================================================ */
(function(){
  'use strict';

  var SERVICES = [
    /* ---------- Identity ---------- */
    { id:'svc_logo_cleanup', category:'identity', name:'Logo clean-up',
      tagline:'Keep your logo. Make it sharp.',
      description:'Your existing logo cleaned up, redrawn and exported in every size you need.',
      base_price:250, delivery_days:2, revision_rounds:1,
      deliverables:['PNG (transparent)','SVG vector','Square + horizontal versions'],
      image:'assets/images/services/logo_cleanup.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_brand_kit', category:'identity', name:'Brand Kit',
      tagline:'A complete brand that works everywhere.',
      description:'Logo, colour palette, cover banner and WhatsApp profile picture — designed for your business.',
      base_price:350, delivery_days:5, revision_rounds:2,
      deliverables:['Logo (PNG + SVG)','Colour palette','Cover banner 1600×900','WhatsApp profile picture','Typography notes'],
      image:'assets/images/services/brand_kit.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_brand_kit_plus', category:'identity', name:'Brand Kit Plus',
      tagline:'For businesses ready to market themselves.',
      description:'Everything in the Brand Kit plus business card design, social templates and a printed A5 flyer.',
      base_price:500, delivery_days:10, revision_rounds:3,
      deliverables:['Everything in the Brand Kit','Business card (print-ready)','6 social post templates','A5 printed flyer'],
      image:'assets/images/services/brand_kit_plus.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_brand_guidelines', category:'identity', name:'Brand Guidelines',
      tagline:'A rulebook for your brand.',
      description:'A document that shows anyone how to use your logo, colours and typography correctly.',
      base_price:900, delivery_days:7, revision_rounds:2,
      deliverables:['Brand guidelines PDF','Do / Don\'t examples','Colour and type reference'],
      image:'assets/images/services/brand_guidelines.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Promo ---------- */
    { id:'svc_promo_single', category:'promo', name:'Single promo card',
      tagline:'One promo, one graphic, ready today.',
      description:'A single promotional graphic sized for WhatsApp and Instagram.',
      base_price:80, delivery_days:1, revision_rounds:1,
      deliverables:['1080×1080 PNG','1080×1920 story version'],
      image:'assets/images/services/promo_single.jpg',
      is_recurring:false, recurrence:null, bundleable:false, featured:false },

    { id:'svc_promo_pack5', category:'promo', name:'Pack of 5 promo cards',
      tagline:'A week of promos, designed together.',
      description:'Five coordinated promo graphics for the week — same family, different offers.',
      base_price:300, delivery_days:3, revision_rounds:2,
      deliverables:['5 promo graphics','Square + story sizes','Consistent visual family'],
      image:'assets/images/services/promo_pack5.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_promo_pack10', category:'promo', name:'Pack of 10 promo cards',
      tagline:'Two weeks of promos in one delivery.',
      description:'Ten coordinated promo graphics, ready to schedule.',
      base_price:550, delivery_days:5, revision_rounds:2,
      deliverables:['10 promo graphics','Square + story sizes','Named files ready to schedule'],
      image:'assets/images/services/promo_pack10.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_promo_retainer', category:'promo', name:'Monthly promo retainer',
      tagline:'Keep your promotions moving.',
      description:'A designer on standby — up to 8 designs per month, delivered as you need them.',
      base_price:500, delivery_days:0, revision_rounds:2,
      deliverables:['Up to 8 designs per month','Same designer all cycle','Priority queue'],
      image:'assets/images/services/promo_retainer.jpg',
      is_recurring:true, recurrence:'monthly', bundleable:false, featured:true },

    { id:'svc_story_pack10', category:'promo', name:'Story pack (10 stories)',
      tagline:'Vertical content, ready to post.',
      description:'Ten 1080×1920 story graphics — for daily specials, polls, or behind-the-scenes.',
      base_price:450, delivery_days:4, revision_rounds:2,
      deliverables:['10 story graphics','1080×1920 PNG','Ready to post'],
      image:'assets/images/services/story_pack10.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Event ---------- */
    { id:'svc_event_flyer', category:'event', name:'Single event flyer',
      tagline:'Your event, on paper and on screen.',
      description:'A single event flyer for print and screen.',
      base_price:120, delivery_days:2, revision_rounds:1,
      deliverables:['A5 print-ready PDF','1080×1080 screen version','1080×1920 story version'],
      image:'assets/images/services/event_flyer.jpg',
      is_recurring:false, recurrence:null, bundleable:false, featured:false },

    { id:'svc_event_pack', category:'event', name:'Event pack',
      tagline:'Flyer, social tiles and a status image.',
      description:'Everything you need to announce and run one event.',
      base_price:280, delivery_days:3, revision_rounds:2,
      deliverables:['1 event flyer','3 social tiles','1 WhatsApp status image'],
      image:'assets/images/services/event_pack.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_event_programme', category:'event', name:'Event programme / brochure',
      tagline:'A multi-page programme for longer events.',
      description:'A designed programme for festivals, conferences or multi-day events.',
      base_price:350, delivery_days:5, revision_rounds:2,
      deliverables:['4-page programme PDF','Print-ready','Screen-optimised version'],
      image:'assets/images/services/event_programme.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Menu ---------- */
    { id:'svc_menu_refresh', category:'menu', name:'Menu refresh',
      tagline:'Your menu, redesigned.',
      description:'We take your existing menu and redesign it — new layout, same dishes.',
      base_price:400, delivery_days:5, revision_rounds:2,
      deliverables:['Print-ready PDF','Screen-optimised version','Update-ready file'],
      image:'assets/images/services/menu_refresh.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_menu_full', category:'menu', name:'Full menu design',
      tagline:'Structure, layout and typography.',
      description:'We design your menu from scratch — sections, hierarchy and pricing.',
      base_price:700, delivery_days:8, revision_rounds:3,
      deliverables:['Full menu design','Print-ready PDF','Screen-optimised version','Editable master file'],
      image:'assets/images/services/menu_full.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_menu_photo', category:'menu', name:'Menu + photo layout',
      tagline:'A photo-forward menu.',
      description:'You supply the food photos; we design a menu built around them.',
      base_price:1200, delivery_days:12, revision_rounds:3,
      deliverables:['Photo-forward menu','Print-ready PDF','Screen version','Editable master file'],
      image:'assets/images/services/menu_photo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Print ---------- */
    { id:'svc_print_cards', category:'print', name:'Business cards',
      tagline:'Print-ready, both sides.',
      description:'A standard business card design with a print-ready export.',
      base_price:200, delivery_days:3, revision_rounds:2,
      deliverables:['Print-ready PDF','Bleed + crop marks','Front and back'],
      image:'assets/images/services/print_cards.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_flyer_a5', category:'print', name:'A5 flyer',
      tagline:'One sheet, print-ready.',
      description:'A single-page A5 flyer for print.',
      base_price:180, delivery_days:2, revision_rounds:1,
      deliverables:['A5 print-ready PDF','Screen version for WhatsApp'],
      image:'assets/images/services/print_flyer_a5.jpg',
      is_recurring:false, recurrence:null, bundleable:false, featured:false },

    { id:'svc_print_table_tent', category:'print', name:'Table tent / menu stand',
      tagline:'On every table.',
      description:'A folded table tent or menu stand for your venue.',
      base_price:220, delivery_days:3, revision_rounds:2,
      deliverables:['Print-ready PDF (fold)','Screen preview'],
      image:'assets/images/services/print_table_tent.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_poster', category:'print', name:'Poster (A2 / A1)',
      tagline:'Big on the wall.',
      description:'A large-format poster designed for your business or event.',
      base_price:240, delivery_days:3, revision_rounds:2,
      deliverables:['A2 or A1 print-ready PDF','Screen version'],
      image:'assets/images/services/print_poster.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_shopfront', category:'print', name:'Shopfront sign design',
      tagline:'Your name, on your building.',
      description:'A sign design sized for your shopfront or awning.',
      base_price:800, delivery_days:7, revision_rounds:2,
      deliverables:['Sign design','Print-ready vector','Installation notes'],
      image:'assets/images/services/print_shopfront.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_vehicle', category:'print', name:'Vehicle wrap',
      tagline:'Take your brand on the road.',
      description:'A wrap design sized for a car, bakkie or van.',
      base_price:1500, delivery_days:10, revision_rounds:3,
      deliverables:['Wrap design (all panels)','Print-ready vector','Installer-friendly files'],
      image:'assets/images/services/print_vehicle.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Social ---------- */
    { id:'svc_social_weekly', category:'social', name:'Weekly social pack',
      tagline:'5 posts, 3 stories, one delivery.',
      description:'A week of social content, designed and coordinated.',
      base_price:350, delivery_days:4, revision_rounds:2,
      deliverables:['5 posts (1080×1080)','3 stories (1080×1920)','Caption suggestions'],
      image:'assets/images/services/social_weekly.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_social_monthly', category:'social', name:'Monthly social pack',
      tagline:'A month of content, one designer.',
      description:'20 posts, 12 stories and one reel cover each month.',
      base_price:1200, delivery_days:0, revision_rounds:2,
      deliverables:['20 posts per month','12 stories per month','1 reel cover per month','Same designer all cycle'],
      image:'assets/images/services/social_monthly.jpg',
      is_recurring:true, recurrence:'monthly', bundleable:false, featured:true },

    { id:'svc_social_banners', category:'social', name:'Profile banner set',
      tagline:'Consistent across every platform.',
      description:'Cover banners for Facebook, Twitter, LinkedIn and YouTube.',
      base_price:280, delivery_days:3, revision_rounds:2,
      deliverables:['Facebook cover','Twitter banner','LinkedIn banner','YouTube banner'],
      image:'assets/images/services/social_banners.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Packaging ---------- */
    { id:'svc_pack_bag', category:'packaging', name:'Takeaway bag design',
      tagline:'Take your brand home.',
      description:'A printed takeaway bag design, sized for your supplier.',
      base_price:500, delivery_days:5, revision_rounds:2,
      deliverables:['Print-ready PDF','Bleed + dielines','Screen mockup'],
      image:'assets/images/services/pack_bag.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_pack_system', category:'packaging', name:'Full packaging system',
      tagline:'Bag, box, cup, label — one family.',
      description:'A coordinated packaging family across your whole product range.',
      base_price:1800, delivery_days:14, revision_rounds:3,
      deliverables:['Bag, box, cup and label designs','Print-ready PDFs','Dielines','Screen mockups'],
      image:'assets/images/services/pack_system.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Motion ---------- */
    { id:'svc_motion_promo', category:'motion', name:'Animated promo (5–10s)',
      tagline:'A short loop for your feed.',
      description:'A brief animated promo built from your brand assets.',
      base_price:400, delivery_days:4, revision_rounds:1,
      deliverables:['MP4 (1080×1080)','MP4 (1080×1920)','Loopable source'],
      image:'assets/images/services/motion_promo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_teaser', category:'motion', name:'Event teaser reel (15–30s)',
      tagline:'Build the anticipation.',
      description:'A short teaser video to announce your next event.',
      base_price:800, delivery_days:7, revision_rounds:2,
      deliverables:['MP4 (1080p)','Captions burned in','Source project file'],
      image:'assets/images/services/motion_teaser.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_social', category:'motion', name:'Full social video (30–60s)',
      tagline:'Edit your footage into something polished.',
      description:'You supply the raw footage; we cut, colour and caption.',
      base_price:1200, delivery_days:10, revision_rounds:2,
      deliverables:['MP4 (1080p)','Captions','Source project file'],
      image:'assets/images/services/motion_social.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_logo', category:'motion', name:'Logo animation',
      tagline:'Make your mark move.',
      description:'A short animated logo sting for video intros and social.',
      base_price:500, delivery_days:5, revision_rounds:2,
      deliverables:['MP4 loop','Transparent MOV / WebM','Sound design (optional)'],
      image:'assets/images/services/motion_logo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false }
  ];

  var CATEGORIES = [
    { id:'identity',  name:'Identity',  icon:'◆', blurb:'Logos and brand systems.' },
    { id:'promo',     name:'Promo',     icon:'✦', blurb:'Everyday offers and posts.' },
    { id:'event',     name:'Event',     icon:'◈', blurb:'Flyers and programme artwork.' },
    { id:'menu',      name:'Menu',      icon:'▤', blurb:'Menus that sell the food.' },
    { id:'print',     name:'Print',     icon:'▣', blurb:'Cards, flyers, signage.' },
    { id:'social',    name:'Social',    icon:'◎', blurb:'Post packs and banners.' },
    { id:'packaging', name:'Packaging', icon:'▢', blurb:'Bags, boxes, labels.' },
    { id:'motion',    name:'Motion',    icon:'▶', blurb:'Short video and animation.' }
  ];

  var BUNDLE_RULES = [
    { min_items:2, discount:100, label:'2+ services bundle' },
    { min_items:4, discount:250, label:'4+ services bundle' }
  ];

  var ADD_ONS = [
    { code:'rush_48h',      label:'Rush — delivered in under 48 hours', price_pct:40, applies_to:'one_time' },
    { code:'extra_rev_2',   label:'2 extra revision rounds',             price_flat:80, applies_to:'one_time' }
  ];

  window.EATOUTS_SERVICES_SEED = {
    services: SERVICES,
    categories: CATEGORIES,
    bundleRules: BUNDLE_RULES,
    addOns: ADD_ONS
  };
})();