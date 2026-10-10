/* ============================================================
   EatOuts — Gaborone delivery zones
   Two delivery modes × two tiers:
     Deliver Now        → P40 (city core)      / P60 (peripheral)
     Schedule Delivery  → P15 (city core)      / P30 (peripheral)

   Exposes:
     window.EATOUTS_DELIVERY_ZONES          — tiered tree + modes
     window.EATOUTS_DELIVERY_LOOKUP         — flat { foldedName: tierId }
     window.EatoutsDelivery.tierFor(name)   — resolve a text name → tier
     window.EatoutsDelivery.feeFor(name, modeId)
     window.EatoutsDelivery.zonesIn(tierId)
     window.EatoutsDelivery.modes()         — list delivery modes
     window.EatoutsDelivery.allAreas()      — flat area list
   ============================================================ */
(function () {
  'use strict';

  var MODES = [
    {
      id: 'now',
      label: 'Deliver Now',
      blurb: 'Same-day dispatch. Higher priority, higher fuel cost.',
      fees: { core: 40, peripheral: 60 }
    },
    {
      id: 'schedule',
      label: 'Schedule Delivery',
      blurb: 'Pick a delivery window. Lower priority, lower fee.',
      fees: { core: 15, peripheral: 30 }
    }
  ];

  var TIERS = [
    {
      id: 'core',
      label: 'Gaborone Delivery Plan',
      blurb: 'Areas within the official town limits of Gaborone. Dense urban residential and commercial hubs with fast turnaround times.',
      groups: [
        {
          name: 'Gaborone West Zones',
          areas: [
            'Kgale View',
            'Gaborone West Ext 2',
            'Gaborone West Ext 3',
            'Gaborone West Ext 4',
            'Gaborone West Ext 5',
            'Gaborone West Ext 6',
            'Gaborone West Ext 7',
            'Gaborone West Ext 9',
            'Gaborone West Ext 10',
            'Gaborone West Ext 14',
            'Gaborone West Ext 15',
            'Gaborone West Ext 16',
            'Gaborone West Ext 17',
            'Gaborone West Ext 18',
            'Gaborone West Ext 21',
            'Gaborone West Ext 23',
            'Gaborone West Ext 24',
            'Gaborone West Ext 29',
            'Gaborone West Ext 30',
            'Gaborone West Ext 31',
            'Gaborone West Phase 2 Ext 8',
            'Gaborone West Phase 2 Ext 11',
            'Gaborone West Phase 2 Ext 12',
            'Gaborone West Phase 4 Ext 20',
            'Gaborone West Phase 4 Ext 22',
            'Gaborone West Phase 4 Ext 26',
            'Gaborone West Phase 4 Ext 27',
            'Gaborone West Block 9 Ext 25',
            'Gaborone West Block 9 Ext 28'
          ]
        },
        {
          name: 'Central Blocks',
          areas: [
            'Block 3 Ext 32',
            'Block 5 Ext 43',
            'Block 6 Ext 39',
            'Block 6 Ext 40',
            'Block 6 Ext 42',
            'Block 8 Ext 35',
            'Block 8 Ext 36',
            'Block 8 Ext 37'
          ]
        },
        {
          name: 'Central Extensions & Malls',
          areas: [
            'Ext 1 (Mmaraka)',
            'Ext 2 (Borakanelo / Main Mall)',
            'Ext 4 (Dilalelo)',
            'Ext 5 (Botswelelo)',
            'Ext 6 (Madirelo)',
            'Ext 10 (Boitshoko)',
            'Ext 12 (Mephato)'
          ]
        },
        {
          name: 'Broadhurst & Maruapula Hubs',
          areas: [
            'Broadhurst Ext 16',
            'Broadhurst Ext 17',
            'Broadhurst Ext 18',
            'Broadhurst Ext 19',
            'Broadhurst Ext 25',
            'Broadhurst Ext 26',
            'Broadhurst Industrial Ext 20',
            'Maruapula Ext 23',
            'Maruapula Ext 24',
            'Maruapula Ext 39',
            'Segoditshane Ext 90'
          ]
        },
        {
          name: 'North & East Residential',
          areas: [
            'Ginja Ext 21',
            'Ginja Ext 22',
            'Ginja Ext 29',
            'Tsholofelo Ext 31',
            'Tsholofelo Ext 32',
            'Tsholofelo Ext 41',
            'Tawana Ext 33',
            'Phiring Ext 34',
            'Phiring Ext 43',
            'Tshweneng Ext 37',
            'Tshwenyana Ext 38',
            'Tshwenyana Ext 44',
            'Tshwenyana Ext 47',
            'Tshwenyana Ext 51',
            'Tshwenyana Ext 54'
          ]
        },
        {
          name: 'Village & South Zones',
          areas: [
            'Village Ext 3',
            'Village Ext 15',
            'Bontleng Ext 8',
            'Babusi Ext 14',
            'Selemela Ext 1',
            'Madibeng Ext 11',
            'Old Naledi Ext 13',
            'New Naledi Ext 91',
            'Village B.D.F Camp'
          ]
        }
      ]
    },
    {
      id: 'peripheral',
      label: 'Near & Around Gaborone',
      blurb: 'Premium northern suburbs, distinct border towns, or peri-urban localities just outside the city grid. Higher fuel and travel time, justifying the higher tier.',
      groups: [
        {
          name: 'Phakalane',
          note: 'Premium residential estate, far north along the A1.',
          areas: ['Phakalane Ext 97']
        },
        {
          name: 'Gaborone North',
          note: 'Expanding northern plots past the airport turn-off.',
          areas: ['Broadhurst (Gabs North Ext 27)']
        },
        {
          name: 'Tlokweng',
          note: 'Independent sister town, immediately east of Gaborone.',
          areas: [
            'Tlokweng Village',
            'Sefoke',
            'Mabutswe',
            'Mmamogofu',
            'Terateng',
            'Letlapeng',
            'Maratadiba',
            'Radipotsanyane',
            'Mabowana',
            'Ramokwebetwane',
            'Lefatlha',
            'Mathothwana',
            'Majweadikgokong',
            'Mosonngwa',
            'Tlokweng Border Gate'
          ]
        },
        {
          name: 'Mogoditshane',
          note: 'Peri-urban village bridging the western boundary toward Molepolole.',
          areas: [
            'Mogoditshane Village',
            'Diagane',
            'Khudiring',
            'Nko-ya-Phiri',
            'Lesirane',
            'BDF Mogoditshane'
          ]
        },
        {
          name: 'Mmopane',
          note: 'North-west satellite village linked to Mogoditshane and Block 8.',
          areas: [
            'Mmopane Village',
            'Marapo-a-Thutlwa',
            'Dumadumane',
            'Morope',
            'Gaphatshwa',
            'Letlhajwaneng'
          ]
        },
        {
          name: 'Metsimotlhaba',
          note: 'Further out past Mogoditshane along the Molepolole road.',
          areas: [
            'Metsimotlhaba Village',
            'Mosusu',
            'Monageng',
            'Diphiring'
          ]
        },
        {
          name: 'Sebele & Content Farm',
          note: 'Agricultural / institutional zone near BUAN.',
          areas: ['Sebele Ext 95', 'Content Farm']
        },
        {
          name: 'Peripheral Outliers',
          note: 'Sparsely populated zones or remote borders of the city lines.',
          areas: [
            'Glen Valley',
            'Phokoje Ext 45',
            'Taung Ext 46',
            'Ledumang Ext 48',
            'Tapologo Estate Ext 40',
            'Gaborone Dam Area'
          ]
        }
      ]
    }
  ];

  var ZONES = {
    currency: 'BWP',
    feeUnit: 'per delivery',
    area: 'Gaborone',
    modes: MODES,
    tiers: TIERS
  };

  /* ---- flat lookup: normalised area name → tier id ---- */
  function fold(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  var LOOKUP = Object.create(null);
  TIERS.forEach(function (tier) {
    tier.groups.forEach(function (group) {
      group.areas.forEach(function (area) {
        LOOKUP[fold(area)] = tier.id;
      });
    });
  });

  function tierById(id) {
    return TIERS.filter(function (t) { return t.id === id; })[0] || null;
  }
  function modeById(id) {
    return MODES.filter(function (m) { return m.id === id; })[0] || null;
  }

  /* ---- public API ---- */
  var API = {
    zones: ZONES,
    lookup: LOOKUP,
    modes: function () { return MODES.slice(); },
    tierFor: function (areaName) {
      var key = fold(areaName);
      if (!key) return null;
      var id = LOOKUP[key];
      if (!id) {
        /* tolerant match: area name contains a known key, or vice versa */
        Object.keys(LOOKUP).some(function (k) {
          if (k.indexOf(key) > -1 || key.indexOf(k) > -1) {
            id = LOOKUP[k];
            return true;
          }
          return false;
        });
      }
      return id ? tierById(id) : null;
    },
    feeFor: function (areaName, modeId) {
      var tier = API.tierFor(areaName);
      if (!tier) return null;
      var mode = modeById(modeId || 'now') || MODES[0];
      var fee = mode.fees[tier.id];
      return fee == null ? null : fee;
    },
    zonesIn: function (tierId) {
      var t = tierById(tierId);
      return t ? t.groups : [];
    },
    allAreas: function () {
      var out = [];
      TIERS.forEach(function (tier) {
        tier.groups.forEach(function (group) {
          group.areas.forEach(function (area) {
            out.push({
              area: area,
              group: group.name,
              tierId: tier.id,
              fees: MODES.reduce(function (acc, m) {
                acc[m.id] = m.fees[tier.id];
                return acc;
              }, {})
            });
          });
        });
      });
      return out;
    }
  };

  if (typeof window !== 'undefined') {
    window.EATOUTS_DELIVERY_ZONES = ZONES;
    window.EATOUTS_DELIVERY_LOOKUP = LOOKUP;
    window.EatoutsDelivery = API;
  }
  if (typeof module !== 'undefined' && module && module.exports) {
    module.exports = API;
  }
})();