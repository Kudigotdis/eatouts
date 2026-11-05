/* ── CURATED "ABOUT" COPY ────────────────────────────────────────────────
   Source of the white About card in the logo overlay on venue-about.html.

   Keys are canonical slugs (lowercase, a-z0-9 only — matches canon() in the
   page). `aliases` let alternative spellings resolve to the same entry.
   Every field is optional: the card renders only what exists and falls back
   to the directory record for anything missing. Nothing here is invented —
   blank means "not published yet", and no `hours` is stored unless the venue
   published its opening times.

   Contract per entry (all optional):
     name, slug, aliases[], tagline, about (string | string[]),
     cuisine, established, priceRange, services[], hours[{day,time}],
     phone, phone2, whatsapp, email, website, socials[{platform,url}],
     address, town, area, highlights[], logo, updated (ISO date)

   Loaded before the page's inline script (see venue-about.html <head>).
   ──────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  window.EATOUTS_VENUE_ABOUT = {

    /* ── OCEAN BASKET — Airport Junction, Gaborone ── */
    'ocean-basket': {
      name: 'Ocean Basket',
      tagline: 'Seafood and sushi, served from ocean to pan.',
      cuisine: 'Seafood · Sushi',
      town: 'Gaborone',
      area: 'Airport Junction',
      address: 'Shop 45A, Airport Junction Shopping Centre, Gaborone',
      phone: '+267 390 9933',
      hours: [
        { day: 'Mon – Thu', time: '11:00 – 21:00' },
        { day: 'Fri – Sat', time: '11:00 – 22:00' },
        { day: 'Sun', time: '11:00 – 20:00' }
      ],
      about: [
        'Ocean Basket Gaborone Botswana is the world\u2019s most loved seafood and sushi restaurant. Ocean Basket Gaborone is located in Airport Junction shopping centre, and offers abundant portions of seafood including fish, prawns, mussels and calamari.',
        'It began with an ingenious dream to make seafood available to everyone. You see, this was once a delicacy accessible only to the upmarket and lavish. Well, that was before two brothers followed this dream and our home was built.',
        'Now, this is a place where you\u2019ll find plentiful portions of delicious seafood drizzled with irresistible creamy lemon sauce, big-hearted hospitality, and of course a little Mediterranean madness.',
        'Our passion for food comes from the Mediterranean lifestyle where a meal means sitting down with family and friends and sharing laughter, stories and bountiful food. Everyone is welcome into our home where we offer a distinctive relaxed guest experience, serving expertly prepared seafood from ocean to pan.',
        'As we source a variety of quality seafood that is responsibly wild caught or farmed all over the world, we are able to offer real value for money seafood meals.'
      ],
      highlights: [
        'The pan',
        'Fresh lemon',
        'Complimentary bread & 3 sauces',
        'Meze & sharing platters',
        'Secret Ocean Basket spices',
        'Liquid gold creamy lemon sauce',
        'Seafood specialists'
      ],
      updated: '2026-11-01'
    },

    /* ── BUKHARA — Airport Junction Mall, Gaborone ── */
    bukhara: {
      name: 'Bukhara',
      tagline: 'At Bukhara, we\u2019re not just about meals; we\u2019re about crafting memories.',
      cuisine: 'Grills · Indian · Thai · Chinese',
      town: 'Gaborone',
      area: 'Airport Junction',
      address: 'Shop No. 44, Airport Junction Mall, Gaborone (Entrance No. 3)',
      phone: '+267 396 0630',
      phone2: '+267 74 340 800',
      email: 'info@bukharacafe.com',
      website: 'https://bukharacafe.com/3d-flip-book/bukhara-menu/',
      socials: [
        { platform: 'facebook', url: 'https://web.facebook.com/BukharaGaborone' },
        { platform: 'instagram', url: 'https://www.instagram.com/bukhara_gaborone' }
      ],
      hours: [
        { day: 'Mon – Fri', time: '07:30 – 22:00' },
        { day: 'Sat – Sun', time: '07:00 – 22:30' }
      ],
      about: [
        'Step into the all-new Bukhara, where a gastronomic journey unfolds, promising an unforgettable dining experience that transcends borders and tantalizes taste buds. Once renowned for its Italian flair, Bukhara has now metamorphosed into a global dining destination that beckons connoisseurs and adventurers alike.',
        'Grills Beyond Borders: our essence lies in the mastery of grills, a celebration of sizzling flavours that take you on a voyage around the world. From the traditional wood-fired pizza ovens to the aromatic steak grills and succulent lamb chops, every bite at Bukhara is an embrace of grilled perfection.',
        'Worldly Culinary Fusion: embark on a culinary expedition as we introduce a diverse range of cuisines. Delight in the vibrant spices of India, the delicate artistry of Thai cuisine, and the symphony of flavours from the heart of China. Our menu is a tapestry woven with the best from many corners of the globe.',
        'Aesthetic Oasis: immerse yourself in an ambiance that echoes the richness and diversity of our menu, ensuring an exquisite feast for your senses.',
        'Exquisite Dining, Exceptional Experience: join us as we redefine gourmet excellence, one grill and one dish at a time. Welcome to Bukhara, where the world is served on a platter, and every bite tells a story.'
      ],
      highlights: ['Wood-fired pizza', 'Steak grills', 'Lamb chops', 'Grills from around the world'],
      updated: '2026-11-01'
    },

    /* ── ZORZ LUXURY CHISANYAMA — Remmogo Crossing, Gaborone ──
       No directory record yet, so this entry also supplies the venue
       identity (see resolve() in venue-about.html). Opening hours are
       intentionally absent: the brief says "we close at 1PM", which is
       ambiguous (13:00 or 01:00), so nothing is published until confirmed. */
    zors: {
      name: 'Zorz Luxury Chisanyama',
      slug: 'zors',
      aliases: ['zorz', 'zorz-luxury-chisanyama'],
      tagline: 'Luxury shisanyama — great food, good music, unmatched vibe.',
      cuisine: 'Shisanyama · Grills · Cocktails',
      town: 'Gaborone',
      area: 'Remmogo Crossing',
      address: 'Remmogo Crossing, Gaborone, Botswana',
      phone: '+267 77 853 309',
      email: 'info@zorz.co.bw',
      logo: 'assets/logo/ZORZ_logo.webp',
      about: [
        'Welcome to ZORZ, a unique shisanyama experience where great food, good music, and an unmatched vibe come together. Whether you\u2019re here to chill, grab a bite, or enjoy a perfectly crafted drink, ZORZ is the ultimate destination for those who appreciate day vibes that flow seamlessly into the evening.',
        'At ZORZ, we bring you a premium yet authentic shisanyama experience, infused with style, energy, and a laid-back atmosphere. Our menu features flavour-packed grills, mouthwatering sides, and signature cocktails that set the tone for an unforgettable time.',
        'From relaxed afternoons to vibrant sunsets, ZORZ is the go-to spot for those who love a social, upbeat, and stylish setting. Expect the best curated playlists, live DJs, and a crowd that knows how to enjoy the moment.',
        'Come for the flavour, stay for the ambience. Whether it\u2019s a casual hangout, a special occasion, or just a reason to unwind, ZORZ delivers the ultimate shisanyama experience.'
      ],
      highlights: ['Flame-grilled meat', 'Signature cocktails', 'Live DJs', 'Day-to-evening vibes'],
      updated: '2026-11-01'
    }
  };
})();
