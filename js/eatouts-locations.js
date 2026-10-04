/* ============================================================
   EATOUTS LOCATIONS
   Adapter over botswana_locations.js (window.BOTSWANA_LOCATIONS_DATA).

   Source shape:
     { districts: [ { name, code, towns: [ { name, areas: [string] } ] } ] }

   Measured: 28 districts · 486 towns · 5,964 areas.

   Known gaps in the source data, guarded against below:
     · Orapa (05) and Sowa (07) have ZERO areas.
     · Six towns have zero areas: Monwane, Kubung, Kgope,
       Mogonono, Losilakgokong, Ditshukudu.
     · Some real towns are absent entirely: Maseru, Tswapong,
       Norton, Rankwe, Modimolle, Sebele.
   So every selector here degrades to "Other / not listed" rather
   than trapping a real restaurant out of the list.

   Loaded via <script src>, no fetch — works from file:// too.
   ============================================================ */
(function () {
  'use strict';

  var DATA = (typeof window !== 'undefined' && window.BOTSWANA_LOCATIONS_DATA) || null;

  var OTHER_LABEL = 'Other / not listed';

  /* ---------- indexes (built once) ---------- */

  var districts = [];
  var districtByCode = {};
  var districtByName = {};
  var townIndex = {};   /* lower town name -> [{district, town}] */
  var areaIndex = {};   /* lower area name -> [{district, town}] */

  if (DATA && Array.isArray(DATA.districts)) {
    DATA.districts.forEach(function (d) {
      var district = {
        name: d.name,
        code: String(d.code),
        towns: []
      };
      (d.towns || []).forEach(function (t) {
        var town = {
          name: t.name,
          districtCode: district.code,
          districtName: district.name,
          areas: Array.isArray(t.areas) ? t.areas.slice() : []
        };
        district.towns.push(town);

        var tk = String(t.name).toLowerCase();
        (townIndex[tk] = townIndex[tk] || []).push(town);

        town.areas.forEach(function (a) {
          var ak = String(a).toLowerCase();
          (areaIndex[ak] = areaIndex[ak] || []).push({
            area: a,
            townName: town.name,
            districtCode: district.code,
            districtName: district.name
          });
        });
      });

      districts.push(district);
      districtByCode[district.code] = district;
      districtByName[String(d.name).toLowerCase()] = district;
    });
  }

  /* ---------- public API ---------- */

  /** All 28 districts, sorted by code. */
  function allDistricts() {
    return districts.slice().sort(function (a, b) {
      return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    });
  }

  /**
   * Districts as {value,label} pairs for a <select>.
   */
  function districtOptions() {
    return allDistricts().map(function (d) {
      return { value: d.code, label: d.name };
    });
  }

  /** Towns within a district (by code). Empty array if unknown. */
  function towns(districtCode) {
    var d = districtByCode[String(districtCode)];
    if (!d) return [];
    return d.towns.slice().sort(function (a, b) {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    });
  }

  /** Town <select> options for a district. */
  function townOptions(districtCode) {
    return towns(districtCode).map(function (t) {
      return { value: t.name, label: t.name };
    });
  }

  /** Areas within a district+town. Empty array when the town has none. */
  function areas(districtCode, townName) {
    var d = districtByCode[String(districtCode)];
    if (!d) return [];
    var t = null;
    for (var i = 0; i < d.towns.length; i++) {
      if (String(d.towns[i].name).toLowerCase() === String(townName).toLowerCase()) {
        t = d.towns[i];
        break;
      }
    }
    return t ? t.areas.slice() : [];
  }

  /** Area <select> options, with the escape hatch appended. */
  function areaOptions(districtCode, townName) {
    var list = areas(districtCode, townName);
    var opts = list
      .slice()
      .sort(function (a, b) {
        return a < b ? -1 : a > b ? 1 : 0;
      })
      .map(function (a) {
        return { value: a, label: a };
      });
    if (!list.length) {
      /* Orapa, Sowa and six zero-area towns land here. */
      opts.push({ value: OTHER_LABEL, label: OTHER_LABEL });
    }
    return opts;
  }

  /** True when the town genuinely has no gazetteer areas. */
  function hasAreas(districtCode, townName) {
    return areas(districtCode, townName).length > 0;
  }

  /** Does this town actually exist in the source? */
  function townExists(districtCode, townName) {
    if (!districtByCode[String(districtCode)]) return false;
    return towns(districtCode).some(function (t) {
      return String(t.name).toLowerCase() === String(townName).toLowerCase();
    });
  }

  /** Does this area exist inside the given district+town? */
  function areaExists(districtCode, townName, area) {
    if (!area) return false;
    return areas(districtCode, townName).some(function (a) {
      return String(a).toLowerCase() === String(area).toLowerCase();
    });
  }

  /**
   * Validate a district/town/area triple.
   * Returns { ok, district, town, area, warnings[] } — never throws,
   * and downgrades rather than rejects when a level is unknown.
   */
  function resolve(districtCode, townName, area) {
    var warnings = [];
    var out = {
      district: '',
      town: '',
      area: '',
      warnings: warnings
    };

    var d = districtByCode[String(districtCode)] || districtByName[String(districtCode || '').toLowerCase()];
    if (!d) {
      if (districtCode) warnings.push('Unknown district: ' + districtCode);
      return out;
    }
    out.district = d.code;
    out.districtName = d.name;

    if (!townName) {
      warnings.push('No town selected');
      return out;
    }
    if (!townExists(d.code, townName)) {
      warnings.push('Town "' + townName + '" is not listed under ' + d.name);
      return out;
    }
    out.town = townName;

    if (!area) return out;                      /* area is optional everywhere */
    if (area === OTHER_LABEL) {
      out.area = '';
      return out;
    }
    if (!areaExists(d.code, townName, area)) {
      warnings.push('Area "' + area + '" is not listed under ' + townName);
      return out;
    }
    out.area = area;
    return out;
  }

  /**
   * Cross-district search across towns AND areas.
   * Used by the customer-app location filter.
   */
  function search(query, limit) {
    var q = String(query || '').trim().toLowerCase();
    var max = limit || 25;
    var out = [];
    var seen = {};
    if (q.length < 2) return out;

    function push(kind, name, district, town) {
      var key = kind + '|' + name + '|' + district + '|' + (town || '');
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ kind: kind, name: name, district: district, town: town || '' });
    }

    Object.keys(townIndex).forEach(function (tk) {
      if (tk.indexOf(q) === -1) return;
      townIndex[tk].forEach(function (t) {
        push('town', t.name, t.districtName, t.name);
      });
    });

    Object.keys(areaIndex).forEach(function (ak) {
      if (ak.indexOf(q) === -1) return;
      areaIndex[ak].forEach(function (a) {
        push('area', a.area, a.districtName, a.townName);
      });
    });

    return out.slice(0, max);
  }

  /**
   * Every town as a flat option list, for the customer-app
   * "Village / Town / City" filter.
   */
  function allTowns() {
    var out = [];
    districts.forEach(function (d) {
      d.towns.forEach(function (t) {
        out.push({
          value: t.name,
          label: t.name,
          districtCode: d.code,
          districtName: d.name,
          areaCount: t.areas.length
        });
      });
    });
    return out.sort(function (a, b) {
      return a.label < b.label ? -1 : a.label > b.label ? 1 : 0;
    });
  }

  /** Distinct town names across all 28 districts. */
  function uniqueTownNames() {
    var seen = {};
    var out = [];
    districts.forEach(function (d) {
      d.towns.forEach(function (t) {
        var k = String(t.name).toLowerCase();
        if (seen[k]) return;
        seen[k] = 1;
        out.push(t.name);
      });
    });
    return out.sort();
  }

  /** Distinct district names. */
  function uniqueDistrictNames() {
    return districts.map(function (d) {
      return d.name;
    });
  }

  /* ---------- stats, for the verification harness ---------- */

  function stats() {
    var towns = 0;
    var areas = 0;
    var districtsNoAreas = [];
    var townsNoAreas = [];
    var seenTown = {};
    var duplicateTowns = [];

    districts.forEach(function (d) {
      var dAreas = 0;
      d.towns.forEach(function (t) {
        towns++;
        areas += t.areas.length;
        dAreas += t.areas.length;
        if (!t.areas.length) townsNoAreas.push(d.name + ' / ' + t.name);
        var key = String(t.name).toLowerCase();
        if (seenTown[key] && seenTown[key] !== d.code) {
          duplicateTowns.push(t.name + ' (' + seenTown[key] + ' & ' + d.code + ')');
        } else {
          seenTown[key] = d.code;
        }
      });
      if (!dAreas) districtsNoAreas.push(d.code + ' ' + d.name);
    });

    return {
      loaded: !!DATA,
      districts: districts.length,
      towns: towns,
      areas: areas,
      uniqueTowns: uniqueTownNames().length,
      duplicateTownNames: duplicateTowns,
      districtsWithNoAreas: districtsNoAreas,
      townsWithNoAreas: townsNoAreas
    };
  }

  window.EatoutsLocations = {
    OTHER_LABEL: OTHER_LABEL,
    allDistricts: allDistricts,
    districtOptions: districtOptions,
    towns: towns,
    townOptions: townOptions,
    areas: areas,
    areaOptions: areaOptions,
    hasAreas: hasAreas,
    townExists: townExists,
    areaExists: areaExists,
    resolve: resolve,
    search: search,
    allTowns: allTowns,
    uniqueTownNames: uniqueTownNames,
    uniqueDistrictNames: uniqueDistrictNames,
    stats: stats
  };
})();