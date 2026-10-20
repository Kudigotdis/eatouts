/*
 * Catering services directory.
 *
 * Plain classic script (no ES modules) so it can be loaded with a normal
 * external script tag, exactly like the other EatOuts data files.
 * Exposes window.EATOUTS_CATERING.
 *
 * Source records come from assets/data/catering_services_database.json plus
 * the Mmantlo Goodies listing that used to live in the restaurants directory.
 * Each record is a business with one or more location branches. At load time
 * every location is expanded into its own branch, each business gets a stable
 * slug, and a brand logo is looked up by slug (LOGO_BY_SLUG). Businesses
 * without a logo fall back to the placeholder painted by js/eatouts-brand.js.
 *
 * Shape: { brands:[...], branches:[...], towns:[...] }
 *   brand   = { slug, name, type, isChain, logo, locationCount, towns, branches:[...] }
 *   branch  = { id, slug, name, brand, brandName, type, town, area, address,
 *               phones, emails, established, yearsWithUs, verified, source, isChain, logo }
 */
(function () {
  'use strict';

  /* Brand logos keyed by exact slug. */
  var LOGO_BY_SLUG = {
    'mmantlo-goodies': 'assets/logo/Mmantlo_Goodies_logo.jpg',
    'moghul-catering': 'assets/logo/Moghul_Catering_Logo.jpg',
    'kels-foods-pty-ltd': 'assets/logo/Kels_Caterers_Logo.jpg',
    'boifys-catering-services': 'assets/logo/Boifys_Catering_Services_Logo.jpg',
    'kalanga-private-chefs': 'assets/logo/Kalanga_Private_Chefs_Logo.jpg',
    'shared-affair-catering': 'assets/logo/Shared_Affair_Catering_Logo.jpg',
    'cafe-sunset': 'assets/logo/cafe_Sunset_Logo.jpg',
    'jiki-jiki-pop-up-restaurant': 'assets/logo/Jiki-Jiki_Pop_Up_Restaurant_Logo.jpg',
    'donut-heart': 'assets/logo/Donut_Heart_Logo.jpg',
    'the-enticing-eatery': 'assets/logo/The_Enticing_Eatery_Logo.jpg',
    'ginger-and-vanilla': 'assets/logo/Ginger_&_Vanilla_Logo.jpg',
    'savory-chef': 'assets/logo/Savory_Chef_Logo.jpg',
    'melkayd-catering': 'assets/logo/Melkayd_Catering_Logo.jpg',
    'da-best-best-catering-services': 'assets/logo/Da_Best-Best-Catering_Services_Logo.jpg',
    'melty-bites-daily-delights': 'assets/logo/Melty_Bites_Daily_Delights_Logo.jpg',
    'food-cloud': 'assets/logo/Food_Cloud_Logo.jpg',
    'comforts-foods-catering-services': 'assets/logo/Comforts_Foods_Catering_Services_Logo.jpg',
    'sweetziehs-cakery-and-catering': 'assets/logo/SweetZiehs_Cakery_&_Catering_Logo.jpg',
    'doubles-lounge-and-catering-services': 'assets/logo/Doubles_Lounge_&_Catering_Services_Logo.jpg',
    'dripsins-burger-and-grill': 'assets/logo/Dripsins_Burger_&_Grill_Logo.jpg',
    'lh-cuisine-and-events': 'assets/logo/LH_Cuisine&_Events_Logo.jpg',
    'platter-house': 'assets/logo/Platter_House_Logo.jpg',
    'no-bites-catering': 'assets/logo/No-Bites_Catering_Logo.jpg',
    'the-studio-cafe': 'assets/logo/The_studio_cafe_logo.jpg'
  };

  function slugify(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function logoFor(slug) {
    if (!slug) return null;
    return Object.prototype.hasOwnProperty.call(LOGO_BY_SLUG, slug) ? LOGO_BY_SLUG[slug] : null;
  }

  var RAW = [
    { business_name: "Ae Group (Pty) Ltd", type: "Logistics, Supplies & Cleaning", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 7670 0604", established: 2007, years_with_us: 10, verified: true, source: "List A" }] },
    { business_name: "Qhwigaba Guest Lodge", type: "Guest Lodge", aliases: [], locations: [{ address: "P O Box 26513 Gaborone, Maun, Botswana", town_city: "Maun", country: "Botswana", phone: "+267 7139 3925", established: 2015, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "My Farmhouse Kitchens", type: "Catering / Finger Foods", aliases: [], locations: [{ address: "Plot 21 Mmopane, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 73 961 421", established: 2012, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "Safaris Unravelled (Pty) Ltd t/a Markab Cakes", type: "Cakes & Catering", aliases: [], locations: [{ address: "P.O. Box 10959 Selibe-Phikwe, Botswana Leseding Ward Shopping Complex, Selibe Phikwe", town_city: "Selibe Phikwe", country: "Botswana", phone: "+267 261 0401", established: 2016, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "Divine Concepts", type: "Catering & Event Planning", aliases: [], locations: [{ address: "8442 Tsholofelo Broadhurst, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 71 116 040", established: 2011, years_with_us: 7, verified: true, source: "List A" }] },
    { business_name: "Babes Event Planner", type: "Desserts & Event Planning", aliases: [], locations: [{ address: "PO Box 80903, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "78681480", established: 2012, years_with_us: 13, verified: true, source: "List A" }] },
    { business_name: "Goshen Catering & Event Management", type: "Catering & Event Management", aliases: [], locations: [{ address: "Private Bag 254, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "3182850", established: 2011, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "Jarateng Lounge", type: "BBQ Eatery & Catering", aliases: [], locations: [{ address: "50682, Kaunda Drive, White City, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 71415320", established: 2018, years_with_us: 7, verified: true, source: "List A" }] },
    { business_name: "LayMark Investments (Pty) Ltd", type: "Eco-friendly Packaging", aliases: [], locations: [{ address: "Block 7 Gaborone, Plot 58614, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 75996768", established: 2016, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "Party Express", type: "Party Supplies", aliases: [], locations: [{ address: "Unit 2, Western Filling Station & Garage Mall, Plot 16740 (behind G-West KFC), Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3116786", established: 2017, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "J & M Cuisine Food Catering", type: "Catering", aliases: [], locations: [{ address: "P.O. Box 403514, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "3185662", established: 2012, years_with_us: 14, verified: true, source: "List A" }] },
    { business_name: "Moghul Catering", type: "Industrial Catering", aliases: ["The Moghul"], locations: [{ address: "Unit 130, New Refectory, University of Botswana, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 397 5246", established: 1986, years_with_us: null, verified: true, source: "List A + List B" }] },
    { business_name: "Fresh Corner", type: "Food & Traditional Dishes", aliases: [], locations: [{ address: "Plot 848 Kasane (Chilwero Rd), Botswana", town_city: "Kasane", country: "Botswana", phone: "73755726", established: 2012, years_with_us: 14, verified: true, source: "List A" }] },
    { business_name: "Pizza Hut Riverwalk Mall", type: "Pizza Restaurant", aliases: [], locations: [{ address: "Riverwalk Shopping Centre, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 393 1917", established: 2010, years_with_us: 8, verified: true, source: "List A" }] },
    { business_name: "Als Hiring and Event Services", type: "Catering & Event Services", aliases: [], locations: [{ address: "Box 416, Sebina, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 71776589", established: 2011, years_with_us: 14, verified: true, source: "List A" }] },
    { business_name: "Burgie Bags", type: "Custom Catering", aliases: [], locations: [{ address: "Plot 7145 Ext 27, Broadhurst, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 72 383 657", established: 2015, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "Calvary Guest House", type: "Guest House", aliases: [], locations: [{ address: "P O Box 31 Gantsi, Ghanzi, Botswana", town_city: "Ghanzi", country: "Botswana", phone: "6597411 / 6597431", established: 2010, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "SoSleepy Guest House", type: "Guest House", aliases: [], locations: [{ address: "Boikago Ward, Palapye, Central District, Botswana", town_city: "Palapye", country: "Botswana", phone: "+267 74395050", established: 2018, years_with_us: 7, verified: true, source: "List A" }] },
    { business_name: "Exigency Grills Proprietary Limited", type: "Grills & Catering", aliases: [], locations: [{ address: "P O Box 3862, Block 1, Mmopane, Botswana, Gaborone", town_city: "Gaborone", country: "Botswana", phone: "3931777", established: 2018, years_with_us: 7, verified: true, source: "List A" }] },
    { business_name: "TLK Botswana Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "P.O. Box 40449, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 73414856", established: null, years_with_us: 9, verified: true, source: "List A" }] },
    { business_name: "Kels Foods (Pty) Ltd", type: "Catering", aliases: [], locations: [{ address: "P O Box 883 AAD Poso House, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3188450", established: 2016, years_with_us: 8, verified: true, source: "List A" }] },
    { business_name: "TLK Botswana Tents & Sound", type: "Tents & Sound", aliases: [], locations: [{ address: "P.O. Box 40449, Broadhurst, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3111839", established: 2016, years_with_us: 10, verified: true, source: "List A" }] },
    { business_name: "O'Hagan's Irish Pub n Grill Restaurant", type: "Pub & Grill Restaurant", aliases: [], locations: [{ address: "P.O. Box 21727, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3937893", established: 2013, years_with_us: 13, verified: true, source: "List A" }] },
    { business_name: "Rraseapei Catering", type: "Catering", aliases: [], locations: [{ address: "P O Box 1652, Gaborone, Molepolole, Botswana", town_city: "Molepolole", country: "Botswana", phone: "76376194", established: 2014, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "Afripoul Prime", type: "Poultry Products", aliases: [], locations: [{ address: "P O Box 30644 Francistown, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, established: 2015, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "Intersales Botswana", type: "Commodity Supply", aliases: [], locations: [{ address: "Plot 20601, Block 3 Industrial, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 7299 7100", established: 1995, years_with_us: 8, verified: true, source: "List A" }] },
    { business_name: "Bakeology", type: "Bakery", aliases: [], locations: [{ address: "Plot 194 Extension 11, Opposite Thornhill Primary School, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 77781970", established: 2017, years_with_us: 7, verified: true, source: "List A" }] },
    { business_name: "Leinad Holdings Investment (Pty) Ltd", type: "General Services", aliases: [], locations: [{ address: "P.O. Box 139 ABF Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 76188600", established: 2017, years_with_us: 8, verified: true, source: "List A" }] },
    { business_name: "Kids Lunchbox", type: "School Meal Delivery", aliases: [], locations: [{ address: "PO Box 601040, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 75079630", established: 2015, years_with_us: 11, verified: true, source: "List A" }] },
    { business_name: "Stew Pot Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "Plot 73, Unit 4, Commerce Park, P.O. Box 320130, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3102521", established: null, years_with_us: 13, verified: true, source: "List A" }] },
    { business_name: "Fairground Holdings (Pty) Ltd t/a Botswana Conference and Exhibition Centre", type: "Conference & Exhibition Centre", aliases: [], locations: [{ address: "Private Bag BO3, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 397 5555", established: 1986, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "House of Hope", type: "NGO / Orphan Care", aliases: [], locations: [{ address: "Old Mall, Behind Barclays Bank, Boikago Ward, P.O. Box 15, Palapye, Botswana", town_city: "Palapye", country: "Botswana", phone: "+267 4923830", established: 1999, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Pie Time", type: "Bakery / Pie Producer", aliases: [], locations: [{ address: "Plot 25001, Maakgadigau Road, Gaborone West, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 397 5730", established: 1997, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "City Caterers - Mnanaka", type: "Catering Services", aliases: ["City Caterers – Mnanaka"], locations: [{ address: "Mnanaka Complex Area 7 Mnanaka, P.O. Box 21061, Francistown, Botswana", town_city: "Francistown", country: "Botswana", phone: "+267 2440908", established: null, years_with_us: null, verified: true, source: "List A + List B" }] },
    { business_name: "Ford Foods", type: "Food Services", aliases: [], locations: [{ address: "Opp WLK, Industrial Site, P.O. Box 310, Jwaneng, Botswana", town_city: "Jwaneng", country: "Botswana", phone: "+267 5880181", established: null, years_with_us: null, verified: true, source: "List A + List B" }] },
    { business_name: "Four Seasons Catering Service", type: "Catering Services", aliases: [], locations: [{ address: "Plot 14817, Gaborone West, P.O. Box 746, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3924760", established: null, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Rakis Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "Plot 21734 Haskins Bldg Light Industrial, Francistown, Botswana", town_city: "Francistown", country: "Botswana", phone: "+267 2421850", established: null, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Shonic Catering (Pty) Ltd", type: "Catering Services", aliases: [], locations: [{ address: "Block 6 Bocodol Plot 39772, P.O. Box 201456, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3184184", established: null, years_with_us: null, verified: true, source: "List A + List B" }] },
    { business_name: "Boasa Cater Hire", type: "Catering Hire", aliases: [], locations: [{ address: "Pilane, P.O. Box 201131, Mochudi, Botswana", town_city: "Mochudi", country: "Botswana", phone: "+267 5728199", established: null, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Fedics Food Service", type: "Food Service", aliases: ["Fedics Food Services"], locations: [{ address: "Gaborone West, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3922597", established: null, years_with_us: null, verified: true, source: "List A + List B" }, { address: "Jwaneng, Botswana", town_city: "Jwaneng", country: "Botswana", phone: "+267 5882434", established: null, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Professional Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "P.O. Box 2076, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 3927206", established: null, years_with_us: null, verified: true, source: "List A + List B" }] },
    { business_name: "Runic Verses Caterers & Cleaners (Pty) Ltd", type: "Catering & Cleaning", aliases: ["Runic Verses Caterers"], locations: [{ address: "Maun, Botswana", town_city: "Maun", country: "Botswana", phone: "+267 6860384", established: null, years_with_us: null, verified: true, source: "List A" }, { address: "P.O. Box 82, Maun, Botswana", town_city: "Maun", country: "Botswana", phone: "+267 6800653", established: null, years_with_us: null, verified: true, source: "List A" }] },
    { business_name: "Abiding Investments (Pty) Ltd", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Serowe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Alane Catering & Hiring Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Serowe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Bob City Catering & Hiring Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Boitekanelo Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Sowa Town", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Bontle Investment", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Selebi-Phikwe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Cafe Deliq", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Camp Management Service Botswana (CMSB)", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Sowa Town", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Chobe Catering & Fast Food Delivery", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Kasane", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Curry Pot Airport Arrivals & Depart", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Digrie Investment", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Francistown", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Ditsala Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Food Relieve Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Kanye", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "House of Shades Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Kala-Hari Trading Company (Pty) Ltd", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Khuzi Catering", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Kwegudi Investments", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Shakawe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Lerotse Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Lore Investments (Pty) Ltd t/a Fresh Res", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Ndujo Holdings (Pty) Ltd", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Selebi-Phikwe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Ontime Chef", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Peppercorn Catering", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Pitsakgolo Catering & Conference Fa", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Kanye", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Ran Catering", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Regional Future (Pty) Ltd", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Jwaneng", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Rehoboth Holdings", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Francistown", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Sesame Catering", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Selebi-Phikwe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Simanyana Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Tan Catering", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Ramotswa", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "The Ultimate Investments", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Tuli All in Hire", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Selebi-Phikwe", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Vala-Lisa Catering Company", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Gaborone", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Yebo Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "", town_city: "Maun", country: "Botswana", phone: null, established: null, years_with_us: null, verified: null, source: "List B" }] },
    { business_name: "Mmantlo Goodies", type: "Catering", aliases: [], locations: [{ address: "Maruapula, Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: "+267 76 211 069", area: "Maruapula", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Boifys Catering Services", type: "Catering, Function & Event Catering", aliases: [], locations: [{ address: "Thamaga, Gaborone, Botswana", town_city: "Thamaga", country: "Botswana", phone: "+267 72 822 904", area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Kalanga Private Chefs", type: "Private Chefs, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Shared Affair Catering", type: "Catering, Events", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Cafe Sunset", type: "Cafe, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Jiki-Jiki Pop Up Restaurant", type: "Pop Up Restaurant, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Donut Heart", type: "Desserts, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "The Enticing Eatery", type: "Catering, Events", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Ginger & Vanilla", type: "Bakery, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Savory Chef", type: "Catering, Private Chefs", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Melkayd Catering", type: "Catering, Events", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Da Best-Best Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Melty Bites Daily Delights", type: "Catering, Daily Meals", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Food Cloud", type: "Catering, Cloud Kitchen", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Comforts Foods Catering Services", type: "Catering Services", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "SweetZiehs Cakery & Catering", type: "Cakery, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Doubles Lounge & Catering Services", type: "Lounge, Catering Services", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Dripsins Burger & Grill", type: "Burgers, Grill, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "LH Cuisine & Events", type: "Cuisine, Events, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] },
    { business_name: "Platter House", type: "Platters, Catering", aliases: [], locations: [{ address: "Gaborone, Botswana", town_city: "Gaborone", country: "Botswana", phone: null, area: "", established: null, years_with_us: null, verified: true, source: "EatOuts directory" }] }
  ];

  function unique(used, base) {
    var slug = base || 'caterer';
    if (!used[slug]) { used[slug] = 1; return slug; }
    var n = 2;
    while (used[slug + '-' + n]) n++;
    used[slug + '-' + n] = 1;
    return slug + '-' + n;
  }

  function branchTowns(list) {
    var seen = {};
    var out = [];
    list.forEach(function (b) {
      if (b.town && !seen[b.town.toLowerCase()]) { seen[b.town.toLowerCase()] = 1; out.push(b.town); }
    });
    out.sort(function (a, b) { return a.localeCompare(b); });
    return out;
  }

  function build() {
    var brands = [];
    var branches = [];
    var used = {};
    var towns = {};

    RAW.forEach(function (rec) {
      if (!rec || !rec.business_name) return;
      var brandSlug = slugify(rec.business_name);
      var brandName = String(rec.business_name).trim();
      var logo = logoFor(brandSlug);
      var locs = Array.isArray(rec.locations) ? rec.locations : [];
      var isChain = locs.length > 1;

      var brandBranches = locs.map(function (loc, i) {
        loc = loc || {};
        var town = String(loc.town_city || '').trim();
        var area = String(loc.area || '').trim();
        var label = isChain ? (brandName + ' ' + (area || town || (i + 1))) : brandName;
        var slug = unique(used, slugify(label));
        if (town) towns[town.toLowerCase()] = town;
        var branch = {
          id: slug,
          slug: slug,
          name: label,
          brand: brandSlug,
          brandName: brandName,
          type: String(rec.type || '').trim(),
          town: town,
          area: area,
          address: String(loc.address || '').trim(),
          phones: loc.phone ? [String(loc.phone).trim()] : [],
          emails: [],
          established: (loc.established === undefined ? null : loc.established),
          yearsWithUs: (loc.years_with_us === undefined ? null : loc.years_with_us),
          verified: (loc.verified === undefined ? null : loc.verified),
          source: String(loc.source || '').trim(),
          isChain: isChain,
          logo: logo
        };
        branches.push(branch);
        return branch;
      });

      brands.push({
        slug: brandSlug,
        brandKey: brandSlug,
        name: brandName,
        type: String(rec.type || '').trim(),
        isChain: isChain,
        logo: logo,
        locationCount: brandBranches.length || 1,
        towns: branchTowns(brandBranches),
        branches: brandBranches
      });
    });

    var townList = Object.keys(towns).map(function (k) { return towns[k]; });
    townList.sort(function (a, b) { return a.localeCompare(b); });

    return {
      brands: brands,
      branches: branches,
      towns: townList,
      totals: { brands: brands.length, branches: branches.length },
      logoBySlug: LOGO_BY_SLUG,
      slugify: slugify
    };
  }

  window.EATOUTS_CATERING = build();
})();
