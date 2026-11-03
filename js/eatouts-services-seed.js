/* ============================================================
   EATOUTS SERVICES CATALOGUE — seed data
   Single source of truth for every design service. Loaded before
   eatouts-brand-kit.js. Written to localStorage on first run, so
   later admin edits in the console survive reloads.

   Price: integer BWP. delivery_days: working days. revision_rounds:
   included rounds (not per-tier add-ons). is_recurring: true for
   monthly retainers. bundleable: participates in the 2+/4+ discount.

   version 2 (2026-04) — repriced to the confirmed EatOuts price
   list: 24 offers. eatouts-brand-kit.js swaps a stored catalogue
   only when it still matches the v1 prices, so admin edits survive.
   ============================================================ */
(function(){
  'use strict';

  var VERSION = 2;

  var SERVICES = [
    /* ---------- Identity ---------- */
    { id:'svc_brand_kit', category:'identity', name:'Brand Kit',
      tagline:'A complete brand that works everywhere.',
      description:'Logo, colour palette, cover banner and WhatsApp profile picture — designed for your business.',
      base_price:1500, delivery_days:7, revision_rounds:2,
      deliverables:['Logo (PNG + SVG)','Colour palette','Cover banner 1600×900','WhatsApp profile picture','Typography notes'],
      image:'assets/images/services/brand_kit.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_brand_kit_plus', category:'identity', name:'Brand Kit Plus',
      tagline:'For businesses ready to market themselves.',
      description:'Everything in the Brand Kit plus business cards, social templates and a printed A5 flyer.',
      base_price:3200, delivery_days:12, revision_rounds:3,
      deliverables:['Everything in the Brand Kit','Business cards (print-ready)','Social post templates','A5 printed flyer'],
      image:'assets/images/services/brand_kit_plus.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_brand_guidelines', category:'identity', name:'Brand Guidelines',
      tagline:'A rulebook for your brand.',
      description:'A document that shows anyone how to use your logo, colours and typography correctly.',
      base_price:2500, delivery_days:10, revision_rounds:2,
      deliverables:['Brand guidelines PDF','Do / Don\'t examples','Colour and type reference'],
      image:'assets/images/services/brand_guidelines.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Promo ---------- */
    { id:'svc_promo_single', category:'promo', name:'Simple Promo Card',
      tagline:'One promo, one graphic, ready today.',
      description:'A single promo card for an event flyer — sized for WhatsApp and Instagram.',
      base_price:120, delivery_days:1, revision_rounds:1,
      deliverables:['1080×1080 PNG','1080×1920 story version'],
      image:'assets/images/services/promo_single.jpg',
      is_recurring:false, recurrence:null, bundleable:false, featured:false },

    { id:'svc_print_poster', category:'promo', name:'Promo Print Poster (A5 + A1)',
      tagline:'One design, two print sizes.',
      description:'A promo poster supplied print-ready in A5 and A1.',
      base_price:200, delivery_days:3, revision_rounds:1,
      deliverables:['A5 print-ready PDF','A1 large-format PDF','Screen version for WhatsApp'],
      image:'assets/images/services/print_poster.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_promo_pack5', category:'promo', name:'Promo Pack A (5 promo cards)',
      tagline:'A week of promos, designed together.',
      description:'Five coordinated promo cards for the week — same family, different offers.',
      base_price:500, delivery_days:3, revision_rounds:2,
      deliverables:['5 promo graphics','Square + story sizes','Consistent visual family'],
      image:'assets/images/services/promo_pack5.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_promo_pack10', category:'promo', name:'Promo Pack B (10 promo cards)',
      tagline:'Two weeks of promos in one delivery.',
      description:'Ten coordinated promo cards, ready to schedule.',
      base_price:800, delivery_days:5, revision_rounds:2,
      deliverables:['10 promo graphics','Square + story sizes','Named files ready to schedule'],
      image:'assets/images/services/promo_pack10.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_story_pack_a', category:'promo', name:'Story Pack A (3 posts + 3 stories)',
      tagline:'Feed and stories, designed as one set.',
      description:'Three feed posts and three matching story graphics.',
      base_price:400, delivery_days:3, revision_rounds:2,
      deliverables:['3 posts (1080×1080)','3 stories (1080×1920)','One visual family'],
      image:'assets/images/services/story_pack_a.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_story_pack_b', category:'promo', name:'Story Pack B (7 posts + 3 stories)',
      tagline:'A full week of content.',
      description:'Seven feed posts and three matching story graphics.',
      base_price:600, delivery_days:4, revision_rounds:2,
      deliverables:['7 posts (1080×1080)','3 stories (1080×1920)','Ready to schedule'],
      image:'assets/images/services/story_pack_b.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_story_pack_c', category:'promo', name:'Story Pack C (7 posts + 3 stories + 3 animated)',
      tagline:'A full month of content, with motion.',
      description:'Seven feed posts, three story graphics and three animated promos.',
      base_price:900, delivery_days:6, revision_rounds:2,
      deliverables:['7 posts (1080×1080)','3 stories (1080×1920)','3 animated promos (MP4)'],
      image:'assets/images/services/story_pack_c.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Event ---------- */
    { id:'svc_event_pack', category:'event', name:'Event Pack',
      tagline:'Flyer, social tiles and a status image.',
      description:'Everything you need to announce and run one event.',
      base_price:300, delivery_days:3, revision_rounds:2,
      deliverables:['1 event flyer','3 social tiles','1 WhatsApp status image'],
      image:'assets/images/services/event_pack.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    /* ---------- Menu ---------- */
    { id:'svc_menu_full', category:'menu', name:'Menu Design A (no print PDF)',
      tagline:'Structure, layout and typography.',
      description:'We design your menu from scratch — sections, hierarchy and pricing. Screen-ready files, no print PDF.',
      base_price:700, delivery_days:7, revision_rounds:2,
      deliverables:['Full menu design','Screen-optimised version','Editable master file'],
      image:'assets/images/services/menu_full.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_menu_photo', category:'menu', name:'Menu Design B (with print PDF)',
      tagline:'A printable, photo-forward menu.',
      description:'A designed menu with its layout built around your food photos, delivered print-ready.',
      base_price:1200, delivery_days:10, revision_rounds:3,
      deliverables:['Photo-forward menu','Print-ready PDF','Screen version','Editable master file'],
      image:'assets/images/services/menu_photo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:true },

    { id:'svc_menu_shoot', category:'menu', name:'Menu Design C (print PDF + photoshoot)',
      tagline:'Design and the food photos, in one job.',
      description:'A print-ready menu plus a photo session for the dishes that go on it.',
      base_price:2000, delivery_days:14, revision_rounds:3,
      deliverables:['Print-ready menu PDF','Food photoshoot (half day)','Edited photo set','Editable master file'],
      image:'assets/images/services/menu_shoot.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Print ---------- */
    { id:'svc_print_cards', category:'print', name:'Business Cards',
      tagline:'Print-ready, both sides.',
      description:'A standard business card design with a print-ready export.',
      base_price:350, delivery_days:3, revision_rounds:2,
      deliverables:['Print-ready PDF','Bleed + crop marks','Front and back'],
      image:'assets/images/services/print_cards.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_shopfront', category:'print', name:'Shopfront Sign Design',
      tagline:'Your name, on your building.',
      description:'A sign design sized for your shopfront or awning.',
      base_price:850, delivery_days:7, revision_rounds:2,
      deliverables:['Sign design','Print-ready vector','Installation notes'],
      image:'assets/images/services/print_shopfront.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_print_vehicle', category:'print', name:'Vehicle Wrap',
      tagline:'Take your brand on the road.',
      description:'A wrap design sized for a car, bakkie or van.',
      base_price:1500, delivery_days:10, revision_rounds:3,
      deliverables:['Wrap design (all panels)','Print-ready vector','Installer-friendly files'],
      image:'assets/images/services/print_vehicle.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Social ---------- */
    { id:'svc_social_monthly', category:'social', name:'Monthly Social Media (20 posts + 12 stories)',
      tagline:'A month of content, one designer.',
      description:'20 posts, 12 stories and one reel cover each month.',
      base_price:1600, delivery_days:0, revision_rounds:2,
      deliverables:['20 posts per month','12 stories per month','1 reel cover per month','Same designer all cycle'],
      image:'assets/images/services/social_monthly.jpg',
      is_recurring:true, recurrence:'monthly', bundleable:false, featured:true },

    /* ---------- Packaging ---------- */
    { id:'svc_pack_bag', category:'packaging', name:'Takeaway Bag Design',
      tagline:'Take your brand home.',
      description:'A printed takeaway bag design, sized for your supplier.',
      base_price:450, delivery_days:5, revision_rounds:2,
      deliverables:['Print-ready PDF','Bleed + dielines','Screen mockup'],
      image:'assets/images/services/pack_bag.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_pack_system', category:'packaging', name:'Full Packaging Design',
      tagline:'Bag, box, cup, label — one family.',
      description:'A coordinated packaging family across your whole product range.',
      base_price:1800, delivery_days:14, revision_rounds:3,
      deliverables:['Bag, box, cup and label designs','Print-ready PDFs','Dielines','Screen mockups'],
      image:'assets/images/services/pack_system.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    /* ---------- Motion ---------- */
    { id:'svc_motion_promo', category:'motion', name:'Animated Promo (5–10s)',
      tagline:'A short loop for your feed.',
      description:'A brief animated promo built from your brand assets.',
      base_price:200, delivery_days:4, revision_rounds:1,
      deliverables:['MP4 (1080×1080)','MP4 (1080×1920)','Loopable source'],
      image:'assets/images/services/motion_promo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_pack_a', category:'motion', name:'Animated Promo Pack A (3 animations)',
      tagline:'Three loops, one look.',
      description:'Three short animated promos built from the same brand system.',
      base_price:500, delivery_days:6, revision_rounds:2,
      deliverables:['3 × MP4 (1080×1080)','3 × MP4 (1080×1920)','Loopable sources'],
      image:'assets/images/services/motion_pack_a.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_pack_b', category:'motion', name:'Animated Promo Pack B (7 animations)',
      tagline:'A week of motion, ready to post.',
      description:'Seven short animated promos for a full week of posts.',
      base_price:1000, delivery_days:10, revision_rounds:2,
      deliverables:['7 × MP4 (1080×1080)','7 × MP4 (1080×1920)','Loopable sources'],
      image:'assets/images/services/motion_pack_b.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false },

    { id:'svc_motion_logo', category:'motion', name:'Logo Animation',
      tagline:'Make your mark move.',
      description:'A short animated logo sting for video intros and social.',
      base_price:450, delivery_days:5, revision_rounds:2,
      deliverables:['MP4 loop','Transparent MOV / WebM','Sound design (optional)'],
      image:'assets/images/services/motion_logo.jpg',
      is_recurring:false, recurrence:null, bundleable:true, featured:false }
  ];

  var CATEGORIES = [
    { id:'identity',  name:'Identity',  icon:'◆', blurb:'Logos and brand systems.' },
    { id:'promo',     name:'Promo',     icon:'✦', blurb:'Everyday offers and posts.' },
    { id:'event',     name:'Event',     icon:'◈', blurb:'Flyers and event artwork.' },
    { id:'menu',      name:'Menu',      icon:'▤', blurb:'Menus that sell the food.' },
    { id:'print',     name:'Print',     icon:'▣', blurb:'Cards and signage.' },
    { id:'social',    name:'Social',    icon:'◎', blurb:'Monthly social media.' },
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
    version: VERSION,
    services: SERVICES,
    categories: CATEGORIES,
    bundleRules: BUNDLE_RULES,
    addOns: ADD_ONS
  };
})();