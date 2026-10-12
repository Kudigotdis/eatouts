/*
 * Bottle & liquor store directory.
 *
 * Plain classic script (no ES modules) so it can be loaded with a normal
 * external script tag, exactly like the other EatOuts data files.
 * Exposes window.EATOUTS_BOTTLE_STORES.
 *
 * Source records are kept verbatim in RAW. Each record is either a single
 * store ({ name, area, town, phones, emails }) or a chain
 * ({ name, isChain:true, branches:[...] }). At load time every chain branch is
 * expanded into its own store, each store gets a stable slug, and a brand logo
 * is looked up by slug prefix (LOGO_BY_PREFIX). Stores without a logo fall
 * back to the placeholder painted by js/eatouts-brand.js.
 *
 * Shape: { brands:[...], stores:[...], towns:[...], logoByPrefix, slugify }
 *   brand  = { slug, brandKey, name, isChain, logo, locationCount, towns, branches:[...] }
 *   store  = { id, slug, name, brand, brandName, town, area, phones, emails, isChain, logo }
 */
(function () {
  'use strict';

  /* Brand logos keyed by slug prefix: "tops-mafenyatlala" and "tops-at-spar"
     both resolve to tops_logo.png, "sefalana-liquor-store" to sefalana_logo.jpg. */
  var LOGO_BY_PREFIX = {
    sefalana: 'assets/logo/sefalana_logo.jpg',
    boxer: 'assets/logo/Boxer_Liqours_Logo.png',
    tops: 'assets/logo/tops_logo.png',
    liquorama: 'assets/logo/liqourama_logo.jpg'
  };

  function slugify(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  var TITLE_KEEP = { '&': '&', 'KBL': 'KBL', 'T/A': 'T/A' };
  var TITLE_WORD = { 'PTY': 'Pty', 'PVT': 'Pvt', 'LTD': 'Ltd' };
  function titleCaseName(s) {
    s = String(s == null ? '' : s);
    return s.split(' ').map(function (token) {
      if (!token) return token;
      if (Object.prototype.hasOwnProperty.call(TITLE_KEEP, token.toUpperCase())) return TITLE_KEEP[token.toUpperCase()];
      var leadM = token.match(/^[^A-Za-z0-9']+/);
      var lead = leadM ? leadM[0] : '';
      var rest = token.slice(lead.length);
      var tailM = rest.match(/[^A-Za-z0-9']+$/);
      var tail = tailM ? tailM[0] : '';
      var core = rest.slice(0, rest.length - tail.length);
      if (!core) return token;
      var coreUpper = core.toUpperCase();
      if (Object.prototype.hasOwnProperty.call(TITLE_KEEP, coreUpper)) core = TITLE_KEEP[coreUpper];
      else if (Object.prototype.hasOwnProperty.call(TITLE_WORD, coreUpper)) core = TITLE_WORD[coreUpper];
      else if (core.length === 1) core = core.toUpperCase();
      else core = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      return lead + core + tail;
    }).join(' ');
  }

  function logoFor(slug) {
    if (!slug) return null;
    if (Object.prototype.hasOwnProperty.call(LOGO_BY_PREFIX, slug)) return LOGO_BY_PREFIX[slug];
    for (var prefix in LOGO_BY_PREFIX) {
      if (Object.prototype.hasOwnProperty.call(LOGO_BY_PREFIX, prefix) &&
          slug.indexOf(prefix + '-') === 0) return LOGO_BY_PREFIX[prefix];
    }
    return null;
  }

  var RAW =   [
    // --------------------------------------------------
    // Non-chain entries
    // --------------------------------------------------
    {
      name: "ALCOOL",
      isChain: false,
      area: null,
      town: "Kasane",
      phones: ["+267 625 1656"],
      emails: ["intertranscommodities@gmail.com"]
    },
    {
      name: "BATEMAN'S FINE WINE & LIQUOR STORE",
      isChain: false,
      area: null,
      town: "Maun",
      phones: ["+267 686 1721", "+267 7167 0316"],
      emails: ["penstonewines@info.bw"]
    },
    {
      name: "BOASA BOAPELE BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Mahalapye",
      phones: ["+267 471 1722"],
      emails: []
    },
    {
      name: "BOITEKO BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Francistown",
      phones: ["+267 240 2471"],
      emails: []
    },
    {
      name: "BOXER LIQUOR",
      isChain: false,
      area: null,
      town: null,
      phones: [],
      emails: []
    },
    {
      name: "BRIDGEWAY BAR & BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Serowe",
      phones: ["+267 463 1348"],
      emails: []
    },
    {
      name: "CANTINA AMIGOS RESTAURANT",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: [],
      emails: []
    },
    {
      name: "CHEDU CHOGA BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Francistown",
      phones: ["+267 241 2343"],
      emails: []
    },
    {
      name: "CHOPPIES LIQUOR",
      isChain: false,
      area: null,
      town: null,
      phones: [],
      emails: []
    },
    {
      name: "DYNAMIC LIQUOR STORE",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 390 8541", "+267 7147 8985"],
      emails: []
    },
    {
      name: "FINE WINES (PTY) LTD",
      isChain: false,
      area: "Broadhurst",
      town: "Gaborone",
      phones: ["+267 310 5304", "+267 7180 1032", "+267 7120 5433"],
      emails: ["lauren@finewines.co.bw"]
    },
    {
      name: "IL SERUMOLA'S",
      isChain: false,
      area: null,
      town: "Palapye",
      phones: ["+267 492 0249"],
      emails: []
    },
    {
      name: "INGWAENG BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Bobonong",
      phones: ["+267 261 9265"],
      emails: []
    },
    {
      name: "JUNCTION TRADING (PTY) LTD",
      isChain: false,
      area: null,
      town: "Kasane",
      phones: ["+267 625 2228", "+267 625 2229"],
      emails: ["admin@chobedistributors.com"]
    },
    {
      name: "LEPOPO FOOD & LIQUOR SERVICES",
      isChain: false,
      area: null,
      town: "Maun",
      phones: ["+267 686 5285"],
      emails: ["admin.lepopo@cbw.co.za"]
    },
    {
      name: "M & S LIQUOR DISTRIBUTORS (PTY) LTD",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 395 9037"],
      emails: []
    },
    {
      name: "MABAKA LIQUOR RESTAURANT",
      isChain: false,
      area: "African Mall",
      town: "Gaborone",
      phones: ["+267 391 3917"],
      emails: []
    },
    {
      name: "MAGIC BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 391 2272"],
      emails: []
    },
    {
      name: "MAINLAND BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Serowe",
      phones: ["+267 463 0367"],
      emails: []
    },
    {
      name: "MAROTHODI BOTTLE STORE (PTY) LTD",
      isChain: false,
      area: "Broadhurst",
      town: "Gaborone",
      phones: ["+267 391 2116"],
      emails: []
    },
    {
      name: "MMANAANA BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Moshupa",
      phones: ["+267 544 9226"],
      emails: []
    },
    {
      name: "MOGODITSHANE CASH AND CARRY",
      isChain: false,
      area: "Mogoditshane",
      town: "Gaborone",
      phones: ["+267 390 2834", "+267 391 5644"],
      emails: []
    },
    {
      name: "MORAKA WHOLESALERS",
      isChain: false,
      area: "Broadhurst",
      town: "Gaborone",
      phones: ["+267 390 2774"],
      emails: []
    },
    {
      name: "MORUKURU BAR AND BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Gabane",
      phones: ["+267 394 7081"],
      emails: []
    },
    {
      name: "MORWAMOSU GENERAL DEALER & B/STORE",
      isChain: false,
      area: null,
      town: "Morwamosu",
      phones: ["+267 588 9008"],
      emails: []
    },
    {
      name: "MOTSWDI BAR",
      isChain: false,
      area: null,
      town: "Omaweneno",
      phones: ["+267 654 2024"],
      emails: []
    },
    {
      name: "OKAVANGO WINERIES",
      isChain: false,
      area: null,
      town: "Palapye",
      phones: ["+267 492 3951", "+267 7421 3038"],
      emails: ["metsi@botsnet.bw"]
    },
    {
      name: "PENSTONE FINE WINE WHOLESALERS",
      isChain: false,
      area: "Broadhurst",
      town: "Gaborone",
      phones: ["+267 393 3989", "+267 7160 9812"],
      emails: []
    },
    {
      name: "PHAKALANE BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 390 2388"],
      emails: []
    },
    {
      name: "RASMATAZZ LIQUOR RESTAURANT & LIQUOR STORE",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 318 7927"],
      emails: []
    },
    {
      name: "SEFALANA",
      isChain: true,
      branches: [
        {
          name: "SEFALANA MAUN",
          area: null,
          town: "Maun",
          phones: ["+267 686 4017"],
          emails: ["maunliquor@sefcash.co.bw"],
          address: ""
        },
        {
          name: "SEFALANA BLOCK 2",
          area: "Block 2",
          town: "Gaborone",
          phones: ["+267 396 0269"],
          emails: [],
          address: "Block 2, Mogoditshane, Gaborone"
        },
        {
          name: "SEFALANA TLOKWENG",
          area: "Tlokweng",
          town: "Gaborone",
          phones: ["+267 77 009 842"],
          emails: [],
          address: "Plot 9X5H+R4J, Tlokweng, Gaborone"
        },
        {
          name: "SEFALANA JWANENG",
          area: "Teemane Ave",
          town: "Jwaneng",
          phones: ["+267 588 0362"],
          emails: [],
          address: "Teemane Ave, Jwaneng"
        },
        {
          name: "SEFALANA GABORONE A1",
          area: "A1 Highway",
          town: "Gaborone",
          phones: ["+267 391 3661"],
          emails: [],
          address: "Plot 9WXQ+54X, A1 Highway, Gaborone"
        },
        {
          name: "SEFALANA LETLHAKANE",
          area: "Letlhakane",
          town: "Letlhakane",
          phones: ["+267 368 1700"],
          emails: [],
          address: "Next to Sefalana Shopper Supermarket, Letlhakane"
        }
      ]
    },
    {
      name: "SEROWE HILLSIDE BAR AND BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Serowe",
      phones: ["+267 463 0510"],
      emails: []
    },
    {
      name: "SEROWE HOTEL",
      isChain: false,
      area: null,
      town: "Serowe",
      phones: ["+267 463 0234"],
      emails: ["vyuyan@serowehotel.com"]
    },
    {
      name: "SESHEKE LIQUOR AND RESTAURANT",
      isChain: false,
      area: null,
      town: "Kasane",
      phones: ["+267 625 0266"],
      emails: []
    },
    {
      name: "SEXANANA HOLDINGS (PTY) LTD",
      isChain: false,
      area: null,
      town: "Ghanzi",
      phones: [
        "+267 659 6165",
        "+267 659 7886",
        "+267 7188 2243",
        "+267 7142 2897",
        "+267 7217 0076"
      ],
      emails: []
    },
    {
      name: "SMART INVESTMENTS",
      isChain: false,
      area: "Mogoditshane",
      town: "Gaborone",
      phones: ["+267 397 5194"],
      emails: []
    },
    {
      name: "SPOT-ON LIQUOR WHOLESALERS",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 391 2014", "+267 391 1187"],
      emails: []
    },
    {
      name: "SUNROSE BAR & BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Selebi-Phikwe",
      phones: ["+267 261 0841"],
      emails: []
    },
    {
      name: "TATI COMPANY LTD",
      isChain: false,
      area: null,
      town: "Francistown",
      phones: ["+267 241 2313"],
      emails: []
    },
    {
      name: "THAMALAKANE HORSE TRAILS T/A PENSTONE FINE WINE",
      isChain: false,
      area: null,
      town: "Maun",
      phones: ["+267 680 1195"],
      emails: []
    },
    {
      name: "THE USUAL CENTRE LIQUOR RESTAURANT",
      isChain: false,
      area: null,
      town: "Ramotswa",
      phones: ["+267 539 0812"],
      emails: []
    },
    {
      name: "THE WINE ROUTE",
      isChain: false,
      area: null,
      town: "Gaborone",
      phones: ["+267 393 3989", "+267 7160 9812"],
      emails: []
    },
    {
      name: "THE WINE SHOP",
      isChain: false,
      area: "Botswelelo Ext 5",
      town: "Gaborone",
      phones: ["+267 391 5007"],
      emails: []
    },
    {
      name: "WELCOME BAR & BOTTLE STORE",
      isChain: false,
      area: null,
      town: "Serowe",
      phones: ["+267 463 0453", "+267 463 1530"],
      emails: []
    },

    // --------------------------------------------------
    // Chain: LIQUORAMA
    // --------------------------------------------------
    {
      name: "LIQUORAMA",
      isChain: true,
      branches: [
        { area: null, town: "Gaborone", phones: ["+267 393 0311"], emails: [] },
        { area: "A TO Z", town: "Maun", phones: ["+267 686 3344"], emails: [] },
        { area: "Block 5", town: "Gaborone", phones: ["+267 391 3581"], emails: [] },
        { area: "Bonnington", town: "Gaborone", phones: ["+267 390 0632"], emails: [] },
        { area: "Boseja", town: "Maun", phones: ["+267 686 3368"], emails: [] },
        { area: "Cumberland", town: "Lobatse", phones: ["+267 533 0902"], emails: [] },
        { area: "Engen", town: "Maun", phones: ["+267 686 3446"], emails: [] },
        { area: "Galo", town: "Francistown", phones: ["+267 241 9393"], emails: [] },
        { area: "Ghanzi", town: "Ghanzi", phones: ["+267 659 6645"], emails: [] },
        { area: "Hollywood", town: "Lobatse", phones: ["+267 530 6049"], emails: [] },
        { area: "Jwaneng", town: "Jwaneng", phones: ["+267 588 1928"], emails: [] },
        { area: "Kanye", town: "Kanye", phones: ["+267 548 0417"], emails: [] },
        { area: "Kasane", town: "Kasane", phones: ["+267 625 2382"], emails: [] },
        { area: "Kgale", town: "Gaborone", phones: ["+267 390 6507"], emails: [] },
        { area: "Kgale West", town: "Gaborone", phones: ["+267 392 5800"], emails: [] },
        { area: "Legae", town: "Gaborone", phones: ["+267 397 1860"], emails: [] },
        { area: "Lemon Mall", town: "Gaborone", phones: ["+267 395 7066"], emails: [] },
        { area: "Letlhakane", town: "Letlhakane", phones: ["+267 297 6251"], emails: [] },
        { area: "Lido", town: "Gaborone", phones: ["+267 390 2774"], emails: [] },
        { area: "Marang", town: "Francistown", phones: ["+267 240 2249"], emails: [] },
        { area: "Maruapula", town: "Gaborone", phones: ["+267 391 8917"], emails: [] },
        { area: "Masunga", town: "Masunga", phones: ["+267 248 9167"], emails: [] },
        { area: "Meriting", town: "Francistown", phones: ["+267 241 0251"], emails: [] },
        { area: "Middlestar", town: "Gaborone", phones: ["+267 391 2272"], emails: [] },
        { area: "Mochudi", town: "Mochudi", phones: ["+267 572 8471"], emails: [] },
        { area: "Molapo", town: "Gaborone", phones: ["+267 371 0034"], emails: [] },
        { area: "Molepolole", town: "Molepolole", phones: ["+267 592 0520"], emails: [] },
        { area: "Monate Mahalapye", town: "Mahalapye", phones: ["+267 471 1693"], emails: [] },
        { area: "Moshupa", town: "Moshupa", phones: ["+267 544 9354"], emails: [] },
        { area: "No Mathata-Palapye", town: "Palapye", phones: ["+267 492 0327"], emails: [] },
        { area: "Phakalane", town: "Gaborone", phones: ["+267 393 2572"], emails: [] },
        { area: "Railpark", town: "Gaborone", phones: ["+267 318 5730"], emails: [] },
        { area: "Ramotswa", town: "Ramotswa", phones: ["+267 539 0466", "+267 539 1484"], emails: [] },
        { area: "Riverwalk", town: "Gaborone", phones: ["+267 370 0218"], emails: [] },
        { area: "Selebi-Phikwe", town: "Selebi-Phikwe", phones: ["+267 261 5664", "+267 261 1592"], emails: [] },
        { area: "Serowe", town: "Serowe", phones: ["+267 463 0930"], emails: [] },
        { area: "Southring", town: "Gaborone", phones: ["+267 318 4316"], emails: [] },
        { area: "Station", town: "Gaborone", phones: ["+267 390 0861"], emails: [] },
        { area: "Tlokweng", town: "Gaborone", phones: ["+267 393 3926"], emails: [] },
        { area: "Tonota", town: "Tonota", phones: ["+267 248 5038"], emails: [] },
        { area: "Village", town: "Francistown", phones: ["+267 241 3585"], emails: [] },
        { area: "Watershed", town: "Mahalapye", phones: ["+267 471 1535"], emails: [] },
        { area: "Westgate", town: "Gaborone", phones: ["+267 350 0622"], emails: [] }
      ]
    },

    // --------------------------------------------------
    // Chain: SEGWANA
    // --------------------------------------------------
    {
      name: "SEGWANA",
      isChain: true,
      branches: [
        {
          name: "SEGWANA (KBL) HEAD OFFICE",
          area: null,
          town: "Gaborone",
          phones: ["+267 395 3619"],
          emails: []
        },
        {
          name: "SEGWANA KANYE",
          area: null,
          town: "Kanye",
          phones: ["+267 544 0099", "+267 540 3166"],
          emails: []
        },
        {
          name: "SEGWANA LIQUOR DISTRIBUTORS",
          area: "Broadhurst Ind Est",
          town: "Gaborone",
          phones: ["+267 390 3010", "+267 391 2721", "+267 395 9468"],
          emails: []
        },
        {
          name: "SEGWANA MAUN (KBL)",
          area: null,
          town: "Maun",
          phones: ["+267 686 0479"],
          emails: []
        }
      ]
    },

    // --------------------------------------------------
    // Chain: TOPS AT SPAR
    // --------------------------------------------------
    {
      name: "TOPS AT SPAR",
      isChain: true,
      branches: [
        { area: null, town: "Francistown", phones: ["+267 241 0335", "+267 241 0393"], emails: [] },
        { area: null, town: "Serowe", phones: ["+267 463 0654"], emails: [] },
        { area: null, town: "Gaborone", phones: ["+267 395 9524", "+267 397 1766", "+267 391 1619"], emails: [] },
        { area: null, town: "Maun", phones: ["+267 686 1585"], emails: [] },
        { area: null, town: "Mochudi", phones: ["+267 316 0911", "+267 573 9883"], emails: [] },
        { area: null, town: "Kasane", phones: ["+267 625 2437"], emails: [] },
        { area: "Mogoditshane", town: "Gaborone", phones: ["+267 391 1483"], emails: [] },
        { area: "Broadhurst", town: "Gaborone", phones: ["+267 390 2784"], emails: [] },
        { area: null, town: "Tutume", phones: ["+267 298 7456"], emails: [] },
        { area: null, town: "Palapye", phones: ["+267 492 0021"], emails: [] },
        { area: "Phakalane", town: "Gaborone", phones: ["+267 397 1766"], emails: [] },
        { area: null, town: "Ghanzi", phones: ["+267 659 6507"], emails: [] },
        { area: null, town: "Molepolole", phones: ["+267 592 1123"], emails: [] },
        { area: "Mafenyatlala", town: "Molepolole", phones: ["+267 592 0930"], emails: [] }
      ]
    }
  ];

  function build() {
    var brands = [];
    var stores = [];
    var used = {};
    var towns = {};

    function unique(base) {
      var slug = base || 'store';
      if (!used[slug]) { used[slug] = 1; return slug; }
      var n = 2;
      while (used[slug + '-' + n]) n++;
      used[slug + '-' + n] = 1;
      return slug + '-' + n;
    }

    RAW.forEach(function (rec) {
      if (!rec || !rec.name) return;
      var brandSlug = slugify(rec.name);
      var brandName = titleCaseName(rec.name);

      if (rec.isChain && Array.isArray(rec.branches) && rec.branches.length) {
        var chainLogo = logoFor(brandSlug);
        var branches = rec.branches.map(function (b) {
          b = b || {};
          var label;
          if (b.name) label = titleCaseName(b.name);
          else if (b.area) label = brandName + ' ' + String(b.area).trim();
          else if (b.town) label = brandName + ' ' + String(b.town).trim();
          else label = brandName;
          var slug = unique(slugify(label));
          var town = String(b.town || '').trim();
          if (town) towns[town.toLowerCase()] = town;
          var store = {
            id: slug,
            slug: slug,
            name: label,
            brand: brandSlug,
            brandName: brandName,
            town: town,
            area: String(b.area || '').trim(),
            address: String(b.address || '').trim(),
            phones: Array.isArray(b.phones) ? b.phones.slice() : [],
            emails: Array.isArray(b.emails) ? b.emails.slice() : [],
            isChain: true,
            logo: chainLogo
          };
          stores.push(store);
          return store;
        });
        brands.push({
          slug: brandSlug,
          brandKey: brandSlug,
          name: brandName,
          isChain: true,
          logo: chainLogo,
          locationCount: branches.length,
          towns: branchTowns(branches),
          branches: branches
        });
      } else {
        var singleLogo = logoFor(brandSlug);
        var singleSlug = unique(brandSlug);
        var singleTown = String(rec.town || '').trim();
        if (singleTown) towns[singleTown.toLowerCase()] = singleTown;
        var only = {
          id: singleSlug,
          slug: singleSlug,
          name: brandName,
          brand: brandSlug,
          brandName: brandName,
          town: singleTown,
          area: String(rec.area || '').trim(),
          address: String(rec.address || '').trim(),
          phones: Array.isArray(rec.phones) ? rec.phones.slice() : [],
          emails: Array.isArray(rec.emails) ? rec.emails.slice() : [],
          isChain: false,
          logo: singleLogo
        };
        stores.push(only);
        brands.push({
          slug: brandSlug,
          brandKey: brandSlug,
          name: brandName,
          isChain: false,
          logo: singleLogo,
          locationCount: 1,
          towns: singleTown ? [singleTown] : [],
          branches: [only]
        });
      }
    });

    function branchTowns(list) {
      var seen = {};
      var out = [];
      list.forEach(function (b) {
        if (b.town && !seen[b.town.toLowerCase()]) { seen[b.town.toLowerCase()] = 1; out.push(b.town); }
      });
      out.sort(function (a, b) { return a.localeCompare(b); });
      return out;
    }

    var townList = Object.keys(towns).map(function (k) { return towns[k]; });
    townList.sort(function (a, b) { return a.localeCompare(b); });

    return {
      brands: brands,
      stores: stores,
      towns: townList,
      totals: { brands: brands.length, stores: stores.length },
      logoByPrefix: LOGO_BY_PREFIX,
      slugify: slugify
    };
  }

  window.EATOUTS_BOTTLE_STORES = build();
})();
