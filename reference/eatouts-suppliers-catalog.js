/* ============================================================
   EATOUTS SUPPLIER CATALOG
   Eight categories, matching the EatOuts event-planner taxonomy.
   Pure data — no logic. Loaded via <script src> before the planner.

   Each category has:
     id, name, icon, blurb
     types[] — the specific supplier kinds to track
     Each type: { id, name, note }
   ============================================================ */
(function(){
  'use strict';

  var CATEGORIES = [
    {
      id: 'infrastructure',
      name: 'Infrastructure & Rentals',
      icon: '⛺',
      blurb: 'The foundation — tent, power, floor, stage.',
      types: [
        { id: 'tent',       name: 'Tent & marquee',        note: 'Stretch / peg-and-pole / clear-span' },
        { id: 'ablution',   name: 'Mobile toilets',        note: 'VIP trailers or portaloos' },
        { id: 'power',      name: 'Power & generators',    note: 'Silent backups, cabling' },
        { id: 'climate',    name: 'Climate control',       note: 'Heaters, fans, mobile AC' },
        { id: 'flooring',   name: 'Flooring & carpeting',  note: 'Turf, wooden deck, VIP carpet' },
        { id: 'staging',    name: 'Staging & rigging',     note: 'Stage, catwalks, trussing' }
      ]
    },
    {
      id: 'catering',
      name: 'Catering, Bar & Hospitality',
      icon: '🍽',
      blurb: 'Everything guests consume, plus the staff serving it.',
      types: [
        { id: 'food',       name: 'Food caterers',         note: 'Buffet, plated, spit braai' },
        { id: 'equipment',  name: 'Catering equipment',    note: 'Tables, chairs, glassware, chafing dishes' },
        { id: 'bar',        name: 'Mobile bar service',    note: 'Bar setup, ice, mixers' },
        { id: 'wholesale',  name: 'Alcohol & beverage',    note: 'Bulk beer, wine, spirits' },
        { id: 'specialty',  name: 'Specialty stations',    note: 'Coffee, cocktail, ice cream carts' },
        { id: 'waitron',    name: 'Waitron agency',        note: 'Uniformed waiters' },
        { id: 'bartender',  name: 'Bartender / mixology',  note: 'Skilled cocktail staff' },
        { id: 'scullery',   name: 'Scullery & cleaning',   note: 'Dishwash, trash, tidy-up' }
      ]
    },
    {
      id: 'decor',
      name: 'Decor, Styling & Florals',
      icon: '🎨',
      blurb: 'The visual identity of the event.',
      types: [
        { id: 'stylist',    name: 'Event stylist / designer', note: 'Mood board + concept' },
        { id: 'florist',    name: 'Florist',                  note: 'Centerpieces, arches, bouquets' },
        { id: 'furniture',  name: 'Furniture hire',           note: 'Lounges, cocktail tables, bar stools' },
        { id: 'draping',    name: 'Draping & fabric',         note: 'Ceiling, wall, fairy lights' },
        { id: 'printing',   name: 'Signage & stationery',     note: 'Menus, seating charts, name cards' }
      ]
    },
    {
      id: 'technical',
      name: 'Technical Production (AV)',
      icon: '🔊',
      blurb: 'Sound, lighting, screens, effects.',
      types: [
        { id: 'pa',         name: 'PA & sound engineer',   note: 'Speakers, mixer, monitors' },
        { id: 'mics',       name: 'Microphone specialist', note: 'Lapel, roaming, instrument mics' },
        { id: 'lighting',   name: 'Lighting design',       note: 'Uplighting, stage lights, spotlights' },
        { id: 'visual',     name: 'LED wall & projectors', note: 'Big screens, live feeds' },
        { id: 'sfx',        name: 'Special effects',       note: 'Sparklers, smoke, confetti' }
      ]
    },
    {
      id: 'entertainment',
      name: 'Entertainment & Talent',
      icon: '🎤',
      blurb: 'The people who keep the crowd engaged.',
      types: [
        { id: 'mc',         name: 'MC / host' },
        { id: 'dj',         name: 'DJ' },
        { id: 'band',       name: 'Live band / musician' },
        { id: 'cultural',   name: 'Cultural / traditional dancers' },
        { id: 'contemporary', name: 'Contemporary dancers' },
        { id: 'hype',       name: 'Hype man / announcer' },
        { id: 'keynote',    name: 'Keynote / celebrity speaker' }
      ]
    },
    {
      id: 'security',
      name: 'Safety, Security & Logistics',
      icon: '🛡',
      blurb: 'Keep the event lawful, safe, orderly.',
      types: [
        { id: 'vipsecurity', name: 'VIP / close protection' },
        { id: 'staticsecurity', name: 'Venue static security' },
        { id: 'access',      name: 'Access control & ticketing' },
        { id: 'parking',     name: 'Parking marshals' },
        { id: 'armed',       name: 'Armed response / K9' },
        { id: 'healthsafety',name: 'Health & safety officer' },
        { id: 'medical',     name: 'Medical emergency services' }
      ]
    },
    {
      id: 'media',
      name: 'Media, Memories & Marketing',
      icon: '📸',
      blurb: 'Capture it, broadcast it, remember it.',
      types: [
        { id: 'photographer', name: 'Event photographer' },
        { id: 'videographer', name: 'Videographer / cinematographer' },
        { id: 'drone',        name: 'Drone operator' },
        { id: 'streaming',    name: 'Live-streaming technician' },
        { id: 'photobooth',   name: 'Photo booth vendor' }
      ]
    },
    {
      id: 'management',
      name: 'Management & Coordination',
      icon: '📋',
      blurb: 'The glue that keeps everything together.',
      types: [
        { id: 'planner',    name: 'Event planner / coordinator' },
        { id: 'onday',      name: 'On-the-day coordinator' },
        { id: 'rsvp',       name: 'RSVP & guest manager' }
      ]
    }
  ];

  window.EATOUTS_SUPPLIER_CATALOG = { categories: CATEGORIES };
})();