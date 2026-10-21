/* ============================================================
   EATOUTS ONBOARDING BRIDGE
   Shared runtime for the per-type business onboarding forms:

     restaurant-onboarding.html
     mobile-kitchen-onboarding.html
     bottle-store-onboarding.html
     caterer-onboarding.html
     bakery-onboarding.html
     supplier-onboarding.html

   Every one of those forms is a self-contained editor that keeps its
   draft in localStorage under its own key. The bridge gives them the
   three things they were missing, without touching their markup:

     EOPlaces   live typeahead for city / area / place
                · city  <- botswana_locations.js (towns, 28 districts)
                · area  <- botswana_locations.js (areas, filtered by town)
                · place <- assets/data/botswana_shopping_malls_and_shopping_centres.js

     EOHosting  event-type + capacity helpers shared by the
                "Hosting Services" section (was "Reservation Services")

     EOPublish  pushes the finished profile to
                · D1  business_profiles  (the backend of record)
                · D1  restaurants        (the customer-facing venue row)
                · the local customer directory (eatouts_db_v2) so the
                  listing shows up in index.html / venue-about.html
                · an owner_submissions/venue_*.json export so the next
                  build merges it into the live directory

   Load order (each form adds these before its own inline script):

     botswana_locations.js
     js/eatouts-locations.js
     assets/data/botswana_shopping_malls_and_shopping_centres.js
     assets/data/event_types.js
     js/eatouts-onboarding-bridge.js

   (each one as a separate script tag, in that order)

   The form then hands over its state with:

     window.EOOnboardPage = {
       key, type, typeLabel,
       getState, pathGet, pathSet, save, activeBranch,
       buildProfile: function () { return {...}; }
     };

   and calls EOOnboard.register(window.EOOnboardPage).

   Everything degrades quietly: no gazetteer, no malls, no event
   taxonomy and no backend all leave the forms working exactly as
   they did before.
   ============================================================ */
(function () {
  'use strict';

  var doc = document;

  /* ---------- tiny helpers ---------- */

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
  function arr(v) { return Array.isArray(v) ? v : []; }
  function norm(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
  function txt(v) { return String(v == null ? '' : v); }
  function slugify(v) {
    return txt(v).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 64);
  }
  function titleCase(v) { return txt(v).replace(/(^|[\s\-/])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); }); }

  function page() {
    return (window.EOOnboardPage && typeof window.EOOnboardPage === 'object') ? window.EOOnboardPage : null;
  }

  /* ============================================================
     DATASET INDEXES
     ============================================================ */

  var INDEX = { ready: false, towns: [], areas: [], places: [] };

  function buildIndex() {
    if (INDEX.ready) return INDEX;

    var LOC = window.EatoutsLocations;
    if (LOC && typeof LOC.allDistricts === 'function') {
      LOC.allDistricts().forEach(function (d) {
        (d.towns || []).forEach(function (t) {
          INDEX.towns.push({
            name: t.name,
            districtCode: t.districtCode || d.code || '',
            districtName: t.districtName || d.name || '',
            areaCount: (t.areas || []).length
          });
          (t.areas || []).forEach(function (a) {
            INDEX.areas.push({
              area: a,
              townName: t.name,
              districtCode: t.districtCode || d.code || '',
              districtName: t.districtName || d.name || ''
            });
          });
        });
      });
    }

    arr(window.SHOPPING_CENTRES_DATA).forEach(function (p) {
      INDEX.places.push({
        id: p.id,
        name: p.businessName || '',
        address: p.address || '',
        town: p.town || '',
        contacts: p.contacts || ''
      });
    });

    INDEX.ready = true;
    return INDEX;
  }

  /* ============================================================
     EO PLACES - live typeahead
     ============================================================ */

  var STYLE_ID = 'eop-bridge-style';
  var POP_ID = 'eop-bridge-pop';

  function ensureStyles() {
    if (doc.getElementById(STYLE_ID)) return;
    var st = doc.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.eop-list{position:fixed;z-index:120;background:#fff;border:1px solid #DDE1E7;',
      'border-radius:4px;box-shadow:0 8px 22px rgba(20,20,25,.14);max-height:236px;',
      'overflow:auto;padding:4px;margin:0;list-style:none;font-size:13px;}',
      '.eop-opt{display:flex;gap:10px;align-items:baseline;padding:9px 10px;',
      'border-radius:4px;cursor:pointer;line-height:1.35;color:#171719;}',
      '.eop-opt:hover,.eop-opt[aria-selected="true"]{background:#FFF0E9;}',
      '.eop-opt b{font-weight:800;}',
      '.eop-opt small{color:#6E727C;font-size:11px;margin-left:auto;white-space:nowrap;',
      'text-align:right;max-width:48%;overflow:hidden;text-overflow:ellipsis;}',
      '.eop-empty{padding:10px 11px;font-size:12.5px;color:#6E727C;}',
      '.eop-empty b{display:block;color:#35353B;font-weight:800;margin-bottom:2px;}',
      '.footer-actions.eop-has-publish{flex-direction:column;align-items:stretch;gap:8px;}',
      '.footer-actions.eop-has-publish .eop-footer-row{display:flex;gap:8px;}',
      '.footer-actions.eop-has-publish .eop-footer-row .btn{flex:1;}',
      '.footer-actions.eop-has-publish > .eop-publish-btn{flex:0 0 auto;width:100%;}',
      '.footer-actions.eop-has-publish > .eop-publish-btn[disabled]{opacity:.6;cursor:wait;}',
      '.eop-publish-note{font-size:10.5px;color:#6E727C;text-align:center;margin:6px 0 0;}',
      '.eop-publish-note.is-ok{color:#178247;}',
      '.eop-publish-note.is-warn{color:#C84513;}'
    ].join('');
    (doc.head || doc.documentElement).appendChild(st);
  }

  var POP = null;

  function popEl() {
    if (POP) return POP.el;
    var el = doc.createElement('div');
    el.id = POP_ID;
    el.className = 'eop-list';
    el.setAttribute('role', 'listbox');
    el.style.display = 'none';
    doc.body.appendChild(el);
    POP = { el: el, input: null, kind: '', items: [], index: -1 };
    return el;
  }

  function closePop() {
    if (!POP) return;
    POP.el.style.display = 'none';
    POP.el.innerHTML = '';
    POP.input = null;
    POP.kind = '';
    POP.items = [];
    POP.index = -1;
    if (POP.lastInput) {
      POP.lastInput.setAttribute('aria-expanded', 'false');
      POP.lastInput.removeAttribute('aria-activedescendant');
    }
  }

  function positionPop(input) {
    var el = popEl();
    var r = input.getBoundingClientRect();
    var w = Math.min(Math.max(r.width, 250), Math.max(220, window.innerWidth - 24));
    var left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - w - 8));
    el.style.width = w + 'px';
    el.style.left = left + 'px';
    var below = window.innerHeight - r.bottom;
    if (below < 200 && r.top > 220) {
      el.style.top = Math.max(8, r.top - Math.min(240, el.scrollHeight || 240) - 6) + 'px';
    } else {
      el.style.top = Math.max(8, r.bottom + 4) + 'px';
    }
  }

  /* --- suggestion engine --- */

  function kindForPath(path) {
    if (/\.city$/.test(path)) return 'city';
    if (/\.area$/.test(path)) return 'area';
    if (/\.building$/.test(path)) return 'place';
    return null;
  }

  function prefixOf(path) { return path.replace(/\.(city|area|building)$/, ''); }

  function currentTown(prefix) {
    var p = page();
    if (!p || typeof p.pathGet !== 'function') return '';
    return txt(p.pathGet(prefix + '.city'));
  }

  function suggest(kind, query) {
    var idx = buildIndex();
    var q = norm(query);
    if (!q) return [];
    var out = [];

    if (kind === 'city') {
      idx.towns.forEach(function (t) {
        if (norm(t.name).indexOf(q) === -1) return;
        out.push({ value: t.name, label: t.name, meta: t.districtName, record: t });
      });
    } else if (kind === 'area') {
      var prefix = prefixOf(POP.input ? POP.input.getAttribute('data-bind') : '');
      var town = currentTown(prefix);
      idx.areas.forEach(function (a) {
        if (town && norm(a.townName) !== norm(town)) return;
        if (norm(a.area).indexOf(q) === -1) return;
        out.push({
          value: a.area,
          label: a.area,
          meta: town ? a.townName : a.townName + ' · ' + a.districtName,
          record: a
        });
      });
    } else if (kind === 'place') {
      idx.places.forEach(function (p) {
        if (!p.name) return;
        var hay = norm(p.name + ' ' + p.town + ' ' + p.address);
        if (hay.indexOf(q) === -1) return;
        out.push({
          value: p.name,
          label: p.name,
          meta: [p.town, p.address].filter(Boolean).join(' · '),
          record: p
        });
      });
    }

    return out.slice(0, 40);
  }

  /* --- rendering --- */

  function renderItems() {
    if (!POP) return;
    var el = popEl();
    if (!POP.items.length) {
      el.innerHTML = '<div class="eop-empty"><b>No matches</b>Keep typing, or leave the field empty and fill it in later.</div>';
      el.style.display = 'block';
      return;
    }
    var html = '';
    POP.items.forEach(function (item, i) {
      html += '<div class="eop-opt" role="option" id="eop-opt-' + i + '" data-i="' + i + '"' +
        ' aria-selected="' + (i === POP.index ? 'true' : 'false') + '">' +
        '<b>' + escapeHtml(item.label) + '</b>' +
        (item.meta ? '<small>' + escapeHtml(item.meta) + '</small>' : '') +
        '</div>';
    });
    el.innerHTML = html;
    el.style.display = 'block';
    positionPop(POP.input);
  }

  function escapeHtml(v) {
    return txt(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function highlight() {
    if (!POP || !POP.el) return;
    $$('.eop-opt', POP.el).forEach(function (n, i) {
      n.setAttribute('aria-selected', i === POP.index ? 'true' : 'false');
    });
    if (POP.index >= 0 && POP.items[POP.index]) {
      var node = POP.el.querySelector('#eop-opt-' + POP.index);
      if (node && node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
      if (POP.input) POP.input.setAttribute('aria-activedescendant', 'eop-opt-' + POP.index);
    }
  }

  /* --- selection --- */

  function commitInput(input, value) {
    input.value = value;
    /* The form owns its inputs: fire the same event it listens for so
       the value lands in the form's own state. */
    try {
      input.dispatchEvent(new Event('input', { bubbles: true }));
    } catch (e) {
      var ev = doc.createEvent('HTMLEvents');
      ev.initEvent('input', true, false);
      input.dispatchEvent(ev);
    }
  }

  function applySelection(item) {
    if (!POP || !POP.input) return;
    var input = POP.input;
    var kind = POP.kind;
    var path = input.getAttribute('data-bind') || '';
    var prefix = prefixOf(path);
    var p = page();

    if (kind === 'city') {
      commitInput(input, item.value);
      if (p && typeof p.pathSet === 'function') {
        p.pathSet(prefix + '.city', item.value);
        p.pathSet(prefix + '.district', item.record.districtCode || '');
        p.pathSet(prefix + '.districtName', item.record.districtName || '');
        if (typeof p.save === 'function') p.save();
      }
    } else if (kind === 'area') {
      commitInput(input, item.value);
      if (p && typeof p.pathSet === 'function') {
        p.pathSet(prefix + '.area', item.value);
        p.pathSet(prefix + '.district', item.record.districtCode || '');
        p.pathSet(prefix + '.districtName', item.record.districtName || '');
        if (typeof p.save === 'function') p.save();
      }
    } else if (kind === 'place') {
      commitInput(input, item.value);
      if (p && typeof p.pathSet === 'function') {
        var r = item.record || {};
        p.pathSet(prefix + '.building', item.value);
        p.pathSet(prefix + '.place', {
          id: r.id == null ? '' : r.id,
          businessName: r.name || item.value,
          address: r.address || '',
          town: r.town || '',
          contacts: r.contacts || ''
        });
        if (typeof p.save === 'function') p.save();
      }
    }
    closePop();
  }

  /* --- event wiring --- */

  var SUPPRESS = false;

  function onInput(ev) {
    if (SUPPRESS) return;
    var input = ev.currentTarget;
    var kind = input.getAttribute('data-eop');
    if (!kind) return;
    ensureStyles();
    var el = popEl();
    if (!POP || POP.input !== input || POP.kind !== kind) {
      POP = { el: el, input: input, kind: kind, items: [], index: -1 };
    }
    POP.items = suggest(kind, input.value);
    POP.index = POP.items.length ? 0 : -1;
    input.setAttribute('aria-expanded', 'true');
    renderItems();
    highlight();
  }

  function onFocus(ev) {
    var input = ev.currentTarget;
    var kind = input.getAttribute('data-eop');
    if (!kind) return;
    /* Open on focus only when there is already something to narrow down. */
    if (txt(input.value).length < 1) return;
    onInput(ev);
  }

  function onKeyDown(ev) {
    if (!POP || POP.input !== ev.currentTarget) return;
    var key = ev.key;
    if (key === 'ArrowDown') {
      ev.preventDefault();
      POP.index = Math.min(POP.items.length - 1, POP.index + 1);
      highlight();
    } else if (key === 'ArrowUp') {
      ev.preventDefault();
      POP.index = Math.max(0, POP.index - 1);
      highlight();
    } else if (key === 'Enter') {
      if (POP.index >= 0 && POP.items[POP.index]) {
        ev.preventDefault();
        SUPPRESS = true;
        try { applySelection(POP.items[POP.index]); } finally { SUPPRESS = false; }
      }
    } else if (key === 'Escape') {
      if (POP.el.style.display !== 'none') {
        ev.preventDefault();
        ev.stopPropagation();
        closePop();
      }
    }
  }

  function onBlur() {
    /* Let a mousedown on an option land before the list disappears. */
    setTimeout(function () { closePop(); }, 120);
  }

  function attach(input, kind) {
    if (input.getAttribute('data-eop') === kind) return;
    input.setAttribute('data-eop', kind);
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.addEventListener('input', onInput);
    input.addEventListener('focus', onFocus);
    input.addEventListener('keydown', onKeyDown);
    input.addEventListener('blur', onBlur);
  }

  function scan(root) {
    $$('input[data-bind]', root).forEach(function (input) {
      var kind = kindForPath(input.getAttribute('data-bind') || '');
      if (kind) attach(input, kind);
    });
  }

  var OBSERVER = null;

  function watch() {
    if (OBSERVER || typeof MutationObserver === 'undefined') return;
    OBSERVER = new MutationObserver(function (records) {
      records.forEach(function (rec) {
        arr(rec.addedNodes).forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === 'INPUT' && node.hasAttribute('data-bind')) {
            var kind = kindForPath(node.getAttribute('data-bind') || '');
            if (kind) attach(node, kind);
          }
          scan(node);
        });
      });
    });
    OBSERVER.observe(doc.body, { childList: true, subtree: true });
  }

  /* pointer selection */
  doc.addEventListener('mousedown', function (ev) {
    if (!POP) return;
    var opt = ev.target.closest ? ev.target.closest('.eop-opt') : null;
    if (opt && POP.el.contains(opt)) {
      ev.preventDefault();
      var i = Number(opt.getAttribute('data-i'));
      if (POP.items[i]) {
        SUPPRESS = true;
        try { applySelection(POP.items[i]); } finally { SUPPRESS = false; }
      }
      return;
    }
    if (POP.el.style.display !== 'none' && !POP.el.contains(ev.target)) closePop();
  });

  window.addEventListener('resize', function () { closePop(); });
  doc.addEventListener('scroll', function () { closePop(); }, true);

  var EOPlaces = {
    kindForPath: kindForPath,
    prefixOf: prefixOf,
    scan: scan,
    attach: attach,
    suggest: function (kind, query) { return suggest(kind, query); },
    towns: function () { return buildIndex().towns.slice(); },
    places: function () { return buildIndex().places.slice(); },
    index: buildIndex
  };

  /* ============================================================
     EO HOSTING - event types + capacity
     ============================================================ */

  var uidCounter = 0;
  function uid(prefix) {
    uidCounter += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + uidCounter.toString(36);
  }

  var EOHosting = {
    eventTypes: function () {
      var api = window.EATOUTS_EVENT_TYPES;
      return api && typeof api.getAllEventTypes === 'function' ? api.getAllEventTypes() : [];
    },
    categories: function () {
      var api = window.EATOUTS_EVENT_TYPES;
      return api && typeof api.getCategories === 'function' ? api.getCategories() : [];
    },
    byId: function (id) {
      var api = window.EATOUTS_EVENT_TYPES;
      return api && typeof api.getEventById === 'function' ? api.getEventById(id) : null;
    },
    /** [{value, label, group}] for a <select>. */
    options: function () {
      return EOHosting.eventTypes().map(function (e) {
        return {
          value: e.id,
          label: e.name,
          group: [e.categoryName, e.subCategoryName].filter(Boolean).join(' · ')
        };
      });
    },
    /** Grouped options for a <optgroup>-friendly renderer. */
    grouped: function () {
      var groups = {};
      EOHosting.eventTypes().forEach(function (e) {
        var key = [e.categoryName, e.subCategoryName].filter(Boolean).join(' · ');
        (groups[key] = groups[key] || []).push({ value: e.id, label: e.name });
      });
      return Object.keys(groups).map(function (k) { return { group: k, options: groups[k] }; });
    },
    /** Normalise any capacity-ish list into the D1 capacity_json shape. */
    capacityRows: function (rows) {
      return arr(rows).map(function (r, i) {
        var value = r.value;
        if (value == null || value === '') {
          /* Hosting spaces carry seated / standing instead of a ready value. */
          value = [r.seated ? r.seated + ' seated' : '', r.standing ? r.standing + ' standing' : '']
            .filter(Boolean).join(' · ');
        }
        return {
          id: r.id || ('cap_' + i),
          title: r.title || r.name || r.label || '',
          value: value == null ? '' : String(value),
          description: r.description || r.notes || '',
          order: typeof r.order === 'number' ? r.order : i
        };
      }).filter(function (r) { return r.title || r.value; });
    },
    /** Total seated / standing / largest room from a list of spaces. */
    summarize: function (spaces) {
      var seated = 0, standing = 0, maxGuests = 0;
      arr(spaces).forEach(function (s) {
        var se = Number(s.seated || s.capacity || s.maxGuests || 0) || 0;
        var st = Number(s.standing || 0) || 0;
        seated += se;
        standing += st;
        if (se > maxGuests) maxGuests = se;
        if (st > maxGuests) maxGuests = st;
      });
      return { seated: seated, standing: standing, maxGuests: maxGuests };
    },
    /** Event-type ids -> [{id, name, category, subCategory}] */
    eventTypeRecords: function (ids) {
      return arr(ids).map(function (id) {
        var found = EOHosting.byId(id);
        return {
          id: id,
          name: found ? found.name : txt(id),
          category: found ? found.categoryName : '',
          subCategory: found ? found.subCategoryName : ''
        };
      });
    },

    /* ------------------------------------------------------------
       The "Hosting Services" block.
       Rendered with the same markup the forms already use, and every
       input carries a data-bind path, so the form's own handler keeps
       the values in its own state.
       ------------------------------------------------------------ */

    /** A <select> of every event type, grouped by category. */
    eventTypeOptions: function (selected) {
      var out = '<option value="">Select event type</option>';
      EOHosting.grouped().forEach(function (g) {
        var opts = g.options.map(function (o) {
          return '<option value="' + escapeHtml(o.value) + '"' +
            (o.value === selected ? ' selected' : '') + '>' + escapeHtml(o.label) + '</option>';
        }).join('');
        if (opts) out += '<optgroup label="' + escapeHtml(g.group) + '">' + opts + '</optgroup>';
      });
      return out;
    },

    /** The full "Hosting Services" body for the given state path. */
    renderSection: function (path) {
      var p = page();
      if (!p || typeof p.pathGet !== 'function') return '';
      path = path || 'branch.hosting';
      var get = function (sub) {
        try { return p.pathGet(path + (sub ? '.' + sub : '')); } catch (e) { return ''; }
      };
      var spaces = arr(get('spaces'));
      var types = arr(get('eventTypes'));
      var out = '';

      out += '<div class="section-label">Capacity</div>';
      out += '<p class="note">Add every space you can host in — the main hall, a garden, a marquee, a tasting counter — with how many guests each one seats and how many it holds standing.</p>';
      out += spaces.length ? spaces.map(function (s, i) {
        var sub = s.seated || s.standing
          ? [s.seated ? s.seated + ' seated' : '', s.standing ? s.standing + ' standing' : ''].filter(Boolean).join(' · ')
          : 'Capacity not set';
        return '<div class="record">' +
          '<div class="record-top"><div class="record-title">' + escapeHtml(s.name || 'Space') +
          '<div class="record-subtitle">' + escapeHtml(sub) + '</div></div>' +
          '<div class="record-actions"><button type="button" class="remove-btn" data-action="remove-item" data-collection="' +
          escapeHtml(path + '.spaces') + '" data-index="' + i + '">Remove</button></div></div>' +
          fieldMarkup('Space / room name', path + '.spaces.' + i + '.name', 'text', { placeholder: 'e.g. Main hall' }) +
          '<div class="field-row two">' +
          fieldMarkup('Seated capacity', path + '.spaces.' + i + '.seated', 'number', { min: 0, step: 1, number: true }) +
          fieldMarkup('Standing capacity', path + '.spaces.' + i + '.standing', 'number', { min: 0, step: 1, number: true }) +
          '</div>' +
          textareaMarkup('Notes', path + '.spaces.' + i + '.notes', { placeholder: 'Access, setup, air conditioning, own generator...' }) +
          '</div>';
      }).join('') : '<div class="empty"><strong>No spaces added yet</strong>Add the spaces you host in so customers can see how many guests you take.</div>';
      out += '<button type="button" class="btn btn-dashed" data-action="eop-add-space" data-path="' + escapeHtml(path) + '">Add a space</button>';

      out += '<div class="section-label">Event types you can host</div>';
      out += '<p class="note">Pick the events this business genuinely hosts — weddings, corporate functions, workshops, birthdays and more. The list comes from the shared EatOuts event taxonomy.</p>';
      out += types.length ? types.map(function (t, i) {
        return '<div class="record">' +
          '<div class="record-top"><div class="record-title">' + escapeHtml(t.eventName || 'Event type') +
          '<div class="record-subtitle">' + escapeHtml(t.categoryName || 'Choose an event type') + '</div></div>' +
          '<div class="record-actions"><button type="button" class="remove-btn" data-action="remove-item" data-collection="' +
          escapeHtml(path + '.eventTypes') + '" data-index="' + i + '">Remove</button></div></div>' +
          '<label class="field"><span>Event category &amp; type</span><select class="select" data-eop-event-select="' + i +
          '" data-path="' + escapeHtml(path) + '">' + EOHosting.eventTypeOptions(t.eventTypeId) + '</select></label>' +
          fieldMarkup('Note (optional)', path + '.eventTypes.' + i + '.notes', 'text', { placeholder: 'What is included, restrictions, typical headcount' }) +
          '</div>';
      }).join('') : '<div class="empty"><strong>No event types added yet</strong>Add the events you host so customers can find you for the right occasion.</div>';
      out += '<button type="button" class="btn btn-dashed" data-action="eop-add-event-type" data-path="' + escapeHtml(path) + '">Add an event type</button>';

      out += '<div class="section-label">Hosting rules</div>';
      out += '<div class="field-row two">' +
        fieldMarkup('Minimum guests', path + '.rules.minimumGuests', 'number', { min: 0, step: 1, number: true }) +
        fieldMarkup('Maximum guests', path + '.rules.maximumGuests', 'number', { min: 0, step: 1, number: true }) +
        '</div>';
      out += fieldMarkup('Advance notice required', path + '.rules.advanceNotice', 'text', { placeholder: 'e.g. 7 days' });
      out += textareaMarkup('Cancellation / booking notes', path + '.rules.cancellationNotes', { placeholder: 'Deposit, cancellation window, overtime...' });

      return out;
    }
  };

  /* Field markup that mirrors the forms' own .field / .input / .textarea. */
  function fieldMarkup(label, path, type, opts) {
    opts = opts || {};
    var p = page();
    var value = '';
    try { value = p.pathGet(path); } catch (e) { value = ''; }
    var extra = '';
    if (opts.placeholder) extra += ' placeholder="' + escapeHtml(opts.placeholder) + '"';
    if (opts.min !== undefined) extra += ' min="' + escapeHtml(opts.min) + '"';
    if (opts.max !== undefined) extra += ' max="' + escapeHtml(opts.max) + '"';
    if (opts.step !== undefined) extra += ' step="' + escapeHtml(opts.step) + '"';
    if (opts.number) extra += ' data-value-type="number"';
    return '<label class="field"><span>' + escapeHtml(label) + '</span>' +
      '<input class="input" type="' + escapeHtml(type || 'text') + '" data-bind="' + escapeHtml(path) +
      '" value="' + escapeHtml(value) + '"' + extra + '>' +
      (opts.hint ? '<small class="hint">' + escapeHtml(opts.hint) + '</small>' : '') + '</label>';
  }

  function textareaMarkup(label, path, opts) {
    opts = opts || {};
    var p = page();
    var value = '';
    try { value = p.pathGet(path); } catch (e) { value = ''; }
    return '<label class="field"><span>' + escapeHtml(label) + '</span>' +
      '<textarea class="textarea" data-bind="' + escapeHtml(path) + '" placeholder="' +
      escapeHtml(opts.placeholder || '') + '">' + escapeHtml(value) + '</textarea>' +
      (opts.hint ? '<small class="hint">' + escapeHtml(opts.hint) + '</small>' : '') + '</label>';
  }

  /* Add-space / add-event-type / pick-an-event-type, all stored through
     the form's own path helpers so the form stays the source of truth. */
  doc.addEventListener('click', function (ev) {
    if (!ev.target || !ev.target.closest) return;
    var t = ev.target.closest('[data-action="eop-add-space"],[data-action="eop-add-event-type"]');
    if (!t) return;
    ev.preventDefault();
    ev.stopPropagation();
    var p = page();
    if (!p || typeof p.pathSet !== 'function') return;
    var path = t.getAttribute('data-path') || 'branch.hosting';
    if (t.getAttribute('data-action') === 'eop-add-space') {
      var spaces = arr(p.pathGet(path + '.spaces'));
      spaces.push({ id: uid('space'), name: '', seated: '', standing: '', notes: '' });
      p.pathSet(path + '.spaces', spaces);
    } else {
      var types = arr(p.pathGet(path + '.eventTypes'));
      types.push({ id: uid('hevent'), eventTypeId: '', eventName: '', categoryName: '', notes: '' });
      p.pathSet(path + '.eventTypes', types);
    }
    if (typeof p.save === 'function') p.save();
    if (typeof p.render === 'function') p.render(true);
  });

  doc.addEventListener('change', function (ev) {
    if (!ev.target || !ev.target.closest) return;
    var t = ev.target.closest('[data-eop-event-select]');
    if (!t) return;
    var p = page();
    if (!p || typeof p.pathSet !== 'function') return;
    var path = t.getAttribute('data-path') || 'branch.hosting';
    var i = Number(t.getAttribute('data-eop-event-select'));
    var types = arr(p.pathGet(path + '.eventTypes'));
    if (!types[i]) return;
    var found = EOHosting.byId(t.value);
    types[i].eventTypeId = t.value;
    types[i].eventName = found ? found.name : '';
    types[i].categoryName = found ? found.categoryName : '';
    p.pathSet(path + '.eventTypes', types);
    if (typeof p.save === 'function') p.save();
    if (typeof p.render === 'function') p.render(true);
  });


  /* ============================================================
     EO PUBLISH
     ============================================================ */

  function apiClient() { return window.EatoutsBusinessApi || null; }

  function businessIdKey(key) { return 'eatouts.onboarding.' + key + '.businessId'; }
  function restaurantIdKey(key) { return 'eatouts.onboarding.' + key + '.restaurantId'; }

  function readId(key) {
    try { return localStorage.getItem(key) || ''; } catch (e) { return ''; }
  }
  function writeId(key, value) {
    try { localStorage.setItem(key, value || ''); } catch (e) { /* private mode */ }
  }

  /** Build the customer-directory row (same shape index.html reads). */
  function toDirectoryRow(profile, opts) {
    opts = opts || {};
    var loc = profile.location || {};
    var place = loc.place || {};
    var contacts = arr(profile.contacts).map(function (c) {
      return { label: c.label || c.title || 'Phone', value: c.value || c.number || '' };
    }).filter(function (c) { return c.value; });
    var socials = arr(profile.socials).map(function (s) {
      if (typeof s === 'string') return { platform: 'Website', url: s };
      return { platform: titleCase(s.platform || s.name || 'Web'), url: s.url || s.handle || '' };
    }).filter(function (s) { return s.url; });
    var now = Date.now();
    return {
      id: opts.id || ('own-' + (profile.slug || slugify(profile.name) || 'business')),
      slug: profile.slug || slugify(profile.name) || 'business',
      name: profile.name || '',
      logo: profile.logo || 'assets/logo/logo_placement_image.png',
      landmark: loc.landmark || '',
      location: {
        district: loc.district || '',
        districtName: loc.districtName || '',
        town: loc.town || '',
        area: loc.area || ''
      },
      types: arr(profile.types).length ? arr(profile.types) : [profile.category || ''].filter(Boolean),
      place: place.businessName || loc.building || '',
      capacity: arr(profile.capacity),
      hosting: profile.hosting || {},
      directory: {
        areas: loc.area ? [loc.area] : [],
        addresses: place.address ? [place.address] : (loc.plotNumber || loc.streetName ? [loc.plotNumber, loc.streetName].filter(Boolean).join(', ') : []),
        contacts: contacts,
        socials: socials,
        description: profile.description || '',
        website: (profile.socials && profile.socials.website) || '',
        sources: ['onboarding']
      },
      status: 'published',
      templateId: (window.EatoutsDB && window.EatoutsDB.SHARED_TEMPLATE) || 'tpl_shared',
      ownContent: null,
      lastActive: now,
      contacts: [],
      socials: [],
      createdAt: now
    };
  }

  /** Write the row into the local customer directory (eatouts_db_v2). */
  function pushLocalDirectory(row) {
    var DB = window.EatoutsDB;
    if (!DB || !row) return false;
    try {
      var db = DB.load();
      var list = Array.isArray(db.restaurants) ? db.restaurants : [];
      var idx = -1;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].id) === String(row.id)) { idx = i; break; }
      }
      if (idx < 0) list.push(row); else list[idx] = Object.assign({}, list[idx], row);
      db.restaurants = list;
      DB.save(db);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** The eatouts.venue.v1 record the build-time merge understands. */
  function toSubmission(profile) {
    var loc = profile.location || {};
    var place = loc.place || {};
    var slug = profile.slug || slugify(profile.name) || 'business';
    return {
      $schema: 'eatouts.venue.v1',
      generatedAt: new Date().toISOString(),
      slug: slug,
      name: profile.name || '',
      description: profile.description || '',
      logo: profile.logo || '',
      types: arr(profile.types),
      category: profile.category || (arr(profile.types)[0] || ''),
      location: {
        town: loc.town || '',
        district: loc.district || '',
        districtName: loc.districtName || '',
        area: loc.area || '',
        landmark: loc.landmark || '',
        place: place.businessName || loc.building || '',
        placeAddress: place.address || '',
        plotNumber: loc.plotNumber || '',
        streetName: loc.streetName || '',
        streetNumber: loc.streetNumber || '',
        unitNumber: loc.unitNumber || '',
        latitude: loc.lat || loc.latitude || '',
        longitude: loc.lng || loc.longitude || ''
      },
      capacity: arr(profile.capacity),
      hosting: profile.hosting || {},
      contacts: arr(profile.contacts).map(function (c) {
        return {
          title: c.label || c.title || 'Phone',
          countryCode: c.countryCode || '+267',
          number: c.number || (c.value || '').replace(/^\+\d+\s*/, ''),
          purpose: c.purpose || c.label || '',
          primary: !!c.primary,
          whatsapp: !!c.whatsapp,
          active: true
        };
      }),
      socials: profile.socials && !Array.isArray(profile.socials) ? profile.socials : {},
      menuCategories: [],
      menuItems: []
    };
  }

  /** Offer the submission as a file the build step can pick up. */
  function downloadSubmission(profile) {
    try {
      var record = toSubmission(profile);
      var stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      var name = 'venue_' + (record.slug || 'business') + '_' + stamp + '.json';
      var blob = new Blob([JSON.stringify(record, null, 2)], { type: 'application/json' });
      var url = URL.createObjectURL(blob);
      var a = doc.createElement('a');
      a.href = url;
      a.download = name;
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      return name;
    } catch (e) {
      return null;
    }
  }

  /**
   * Publish the form to the backend and the customer directory.
   * Resolves to { ok, businessId, restaurantId, directory, submission, error }.
   */
  function publish(opts) {
    opts = opts || {};
    var p = opts.page || page();
    if (!p) return Promise.resolve({ ok: false, error: 'no_page' });
    if (typeof p.buildProfile !== 'function') {
      return Promise.resolve({ ok: false, error: 'no_builder' });
    }

    var profile;
    try { profile = p.buildProfile(); } catch (e) {
      return Promise.resolve({ ok: false, error: 'build_failed' });
    }
    if (!profile || !txt(profile.name)) {
      return Promise.resolve({ ok: false, error: 'name_required' });
    }

    var client = apiClient();
    if (!client || typeof client.businessProfilesCreate !== 'function') {
      return Promise.resolve({ ok: false, error: 'backend_not_configured' });
    }

    var key = p.key || 'onboarding';
    var businessId = opts.businessId || readId(businessIdKey(key));
    var restaurantId = readId(restaurantIdKey(key));

    var step = businessId
      ? client.businessProfilesPatch(businessId, profile)
      : client.businessProfilesCreate(profile);

    return step.then(function (res) {
      if (!res || !res.ok) {
        var status = res ? res.status : 0;
        if (status === 401 || (res && res.data && res.data.error === 'not_authenticated')) {
          return { ok: false, error: 'not_authenticated', status: status };
        }
        if (status === 0 || (res && res.backend === false)) {
          return { ok: false, error: 'offline', status: status };
        }
        return { ok: false, error: (res && res.data && res.data.error) || 'save_failed', status: status };
      }
      var body = res.data || {};
      var business = body.business || {};
      var newId = business.id || business.businessId || businessId;
      if (newId) writeId(businessIdKey(key), newId);

      /* Customer-facing venue row (restaurants table). */
      return ensureRestaurantRow(p, profile, restaurantId).then(function (venue) {
        var row = toDirectoryRow(profile, { id: venue.restaurantId ? 'own-' + venue.restaurantId : undefined });
        pushLocalDirectory(row);
        return {
          ok: true,
          businessId: newId,
          restaurantId: venue.restaurantId || '',
          directory: row,
          submission: toSubmission(profile)
        };
      });
    }).catch(function () {
      return { ok: false, error: 'save_failed' };
    });
  }

  /** Create the customer-facing restaurants row if we do not have one yet. */
  function ensureRestaurantRow(p, profile, restaurantId) {
    var client = apiClient();
    if (!client) return Promise.resolve({ restaurantId: restaurantId || '' });
    if (restaurantId) {
      return client.profilePatch(restaurantId, {
        name: profile.name,
        description: profile.description,
        town: (profile.location || {}).town || '',
        district: (profile.location || {}).district || '',
        districtName: (profile.location || {}).districtName || '',
        area: (profile.location || {}).area || '',
        landmark: (profile.location || {}).landmark || '',
        types: arr(profile.types),
        category: profile.category || '',
        contacts: arr(profile.contacts),
        socials: arr(profile.socials),
        hours: profile.operatingHours && arr(profile.operatingHours.weekly).length ? profile.operatingHours.weekly : undefined
      }).then(function (res) {
        return { restaurantId: res && res.ok ? restaurantId : '' };
      }).catch(function () { return { restaurantId: '' }; });
    }
    if (typeof client.mine !== 'function' || typeof client.create !== 'function') {
      return Promise.resolve({ restaurantId: '' });
    }
    return client.mine().then(function (res) {
      if (!res || !res.ok) return { restaurantId: '' };
      var list = arr(res.data && res.data.businesses);
      var match = null;
      list.forEach(function (b) {
        if (!match && norm(b.name) === norm(profile.name)) match = b;
      });
      if (match) {
        writeId(restaurantIdKey(p.key || 'onboarding'), match.id || match.restaurantId || '');
        return { restaurantId: match.id || match.restaurantId || '' };
      }
      return client.create({ name: profile.name }).then(function (cr) {
        if (!cr || !cr.ok) return { restaurantId: '' };
        var b = (cr.data && cr.data.business) || {};
        var rid = b.id || b.restaurantId || '';
        if (rid) writeId(restaurantIdKey(p.key || 'onboarding'), rid);
        return { restaurantId: rid };
      });
    }).catch(function () { return { restaurantId: '' }; });
  }

  var EOPublish = {
    publish: publish,
    toDirectoryRow: toDirectoryRow,
    toSubmission: toSubmission,
    pushLocalDirectory: pushLocalDirectory,
    downloadSubmission: downloadSubmission,
    businessIdKey: businessIdKey,
    restaurantIdKey: restaurantIdKey
  };

  /* ============================================================
     PUBLISH BAR - injected so no form has to change its markup
     ============================================================ */

  var TOAST_TIMER = null;

  function showToast(msg) {
    var t = doc.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(TOAST_TIMER);
    TOAST_TIMER = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }

  function publishNote(msg, tone) {
    var n = doc.querySelector('.eop-publish-note');
    if (!n) return;
    n.textContent = msg || '';
    n.classList.remove('is-ok', 'is-warn');
    if (tone) n.classList.add(tone === 'ok' ? 'is-ok' : 'is-warn');
  }

  function setPublishState(busy, label) {
    var btn = doc.querySelector('.eop-publish-btn');
    if (!btn) return;
    btn.disabled = !!busy;
    btn.textContent = label || btn.getAttribute('data-label') || 'Save & publish to EatOuts';
  }

  function onPublishClick() {
    var p = page();
    if (!p) return;
    if (typeof p.validateForPublish === 'function') {
      var problem = p.validateForPublish();
      if (problem) { showToast(problem); publishNote(problem, 'warn'); return; }
    }
    setPublishState(true, 'Publishing…');
    publishNote('Saving to your EatOuts account…');
    publish({ page: p }).then(function (res) {
      if (!res || !res.ok) {
        var msg = 'Could not publish yet.';
        if (res && res.error === 'not_authenticated') {
          msg = 'Sign in to publish your setup.';
          publishNote('Sign in first — your draft is safe on this device.', 'warn');
          showToast(msg);
          setPublishState(false);
          if (typeof p.onSignInRequired === 'function') p.onSignInRequired();
          return;
        }
        if (res && res.error === 'offline') {
          publishNote('No connection — your draft is saved on this device.', 'warn');
        } else if (res && res.error === 'name_required') {
          publishNote('Add your business name before publishing.', 'warn');
        } else {
          publishNote(msg, 'warn');
        }
        showToast(msg);
        setPublishState(false);
        return;
      }
      setPublishState(false);
      publishNote('Published. Your listing is live on this device.', 'ok');
      showToast('Your setup has been published.');
      if (typeof p.onPublished === 'function') p.onPublished(res);
    });
  }

  /**
   * Fee disclosure shown under the publish button. The retired unified
   * onboarding form carried this in its "Billing and plan" module; keeping it
   * here means every per-type form discloses the same numbers from the single
   * pricing source (js/eatouts-pricing-source.js) without changing its layout.
   */
  function publishFeeNote() {
    var out = 'Your draft is saved on this device until you publish.';
    var pricing = window.EatoutsPricing;
    if (!pricing || typeof pricing.resolve !== 'function') return out;
    var resolved;
    try { resolved = pricing.resolve(); } catch (e) { return out; }
    if (!resolved) return out;
    if (resolved.setup != null) {
      out += ' A one-time setup fee of P' + resolved.setup + ' applies before your listing goes live.';
    }
    var tiers = resolved.tiers || {};
    var plans = Object.keys(tiers).map(function (k) {
      if (!tiers[k] || tiers[k].price == null) return '';
      return k.charAt(0).toUpperCase() + k.slice(1) + ' P' + tiers[k].price + '/mo';
    }).filter(Boolean);
    if (plans.length) out += ' Plans: ' + plans.join(' · ') + '.';
    return out;
  }

  function installPublishBar() {
    var footer = doc.querySelector('.footer-actions');
    if (!footer) return;
    if (footer.querySelector('.eop-publish-btn')) return;

    var row = doc.createElement('div');
    row.className = 'eop-footer-row';
    while (footer.firstChild) row.appendChild(footer.firstChild);
    footer.appendChild(row);

    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-light btn-wide eop-publish-btn';
    btn.setAttribute('data-action', 'eop-publish');
    btn.setAttribute('data-label', 'Save & publish to EatOuts');
    btn.textContent = 'Save & publish to EatOuts';
    btn.addEventListener('click', onPublishClick);
    footer.appendChild(btn);

    var note = doc.createElement('p');
    note.className = 'eop-publish-note';
    note.textContent = publishFeeNote();
    footer.appendChild(note);

    footer.classList.add('eop-has-publish');
  }

  /* ============================================================
     EO ONBOARD - registry
     ============================================================ */

  var current = null;

  function register(p) {
    if (!p) return null;
    current = p;
    window.EOOnboardPage = p;
    ensureStyles();
    scan(doc);
    watch();
    installPublishBar();
    applyTypeFromQuery(p);
    /* The hosting block is rendered by the form, so ask it to paint again
       now that the bridge can read the form's state. */
    if (typeof p.render === 'function') {
      try { p.render(true); } catch (e) { /* the form paints again on its own */ }
    }
    return p;
  }

  /** ?type=restaurant preselects the business type on arrival. */
  function applyTypeFromQuery(p) {
    try {
      var params = new URLSearchParams(window.location.search);
      var type = params.get('type');
      if (!type || !p || typeof p.applyType !== 'function') return;
      p.applyType(type);
    } catch (e) { /* no search params support */ }
  }

  var EOOnboard = {
    register: register,
    page: function () { return current || page(); },
    places: EOPlaces,
    hosting: EOHosting,
    publish: EOPublish,
    toast: showToast,
    escapeHtml: escapeHtml,
    slugify: slugify
  };

  window.EOPlaces = EOPlaces;
  window.EOHosting = EOHosting;
  window.EOPublish = EOPublish;
  window.EOOnboard = EOOnboard;
})();
