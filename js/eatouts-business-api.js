/* ============================================================
   EATOUTS BUSINESS API
   Client for the /api/business/* endpoints (mine, profile,
   staff, menu, claim). Loaded by the operator/onboarding pages.

   Dual-mode by design, like EatoutsCustomer:
     * Backend reachable + signed in -> server is the source of
       truth; results are mirrored into the local stores so the
       existing EO.guard()/EatoutsMgrDB pages keep working.
     * Backend unreachable / not signed in -> every call resolves
       with { ok:false, backend:false } and pages fall back to
       their localStorage behaviour untouched.
   ============================================================ */
(function () {
  'use strict';

  var API_BASE = '/api';
  var state = { backend: null, restaurants: [], loaded: false };

  /* ---------- fetch wrapper ---------- */

  function hasFetch() { return typeof fetch === 'function'; }

  function api(path, opts) {
    if (!hasFetch()) {
      return Promise.resolve({ status: 0, ok: false, backend: false, data: {} });
    }
    var options = Object.assign({ credentials: 'include', headers: {} }, opts || {});
    if (options.body && typeof options.body !== 'string') {
      options.headers['content-type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    try {
      return fetch(API_BASE + path, options).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, ok: res.ok, backend: true, data: data || {} };
        });
      }).catch(function () {
        return { status: 0, ok: false, backend: false, data: {} };
      });
    } catch (e) {
      return Promise.resolve({ status: 0, ok: false, backend: false, data: {} });
    }
  }

  /* ---------- restaurants / resolve ---------- */

  function mine() {
    return api('/business/mine').then(function (r) {
      if (r.ok && r.data && Array.isArray(r.data.businesses)) {
        state.backend = true;
        state.restaurants = r.data.businesses;
        state.loaded = true;
      } else if (r.backend === false) {
        state.backend = false;
      }
      return r;
    });
  }

  /* Resolve the D1 restaurant id for a local business record.
     Order: cached serverRestaurantId -> membership list match
     (id or slug) -> optional create via POST /business/mine.
     Returns { rid, backend, created }. */
  function resolve(business, opts) {
    opts = opts || {};
    var b = business || {};
    var cached = b.serverRestaurantId || '';
    if (cached) return Promise.resolve({ rid: cached, backend: true, created: false });

    return mine().then(function (r) {
      if (!r.ok) return { rid: null, backend: r.backend !== false, created: false };
      var list = state.restaurants;
      var slug = b.slug || (b.identity && b.identity.slug) || '';
      var match = null, i;
      for (i = 0; i < list.length && !match; i++) {
        if (b.restaurantId && list[i].id === b.restaurantId) match = list[i];
      }
      for (i = 0; i < list.length && !match; i++) {
        if (b.id && list[i].id === b.id) match = list[i];
      }
      for (i = 0; i < list.length && !match; i++) {
        if (slug && list[i].slug === slug) match = list[i];
      }
      var name = b.name || (b.identity && b.identity.name) || '';
      if (!match && name) {
        var want = String(name).trim().toLowerCase();
        var named = list.filter(function (x) { return String(x.name || '').trim().toLowerCase() === want; });
        if (named.length === 1) match = named[0];
      }
      if (match) return { rid: match.id, backend: true, created: false, role: match.role };
      if (!opts.create) return { rid: null, backend: true, created: false };
      return create(b).then(function (cr) {
        if (cr.ok && cr.data && cr.data.business) {
          return { rid: cr.data.business.id, backend: true, created: true, role: 'owner' };
        }
        return { rid: null, backend: true, created: false, error: cr.data && cr.data.error };
      });
    });
  }

  function create(business) {
    var b = business || {};
    var name = b.name || (b.identity && b.identity.name) || '';
    return api('/business/mine', { method: 'POST', body: { name: name } });
  }

  /* ---------- claim ---------- */

  function claim(refId) {
    return api('/business/claim', { method: 'POST', body: { refId: refId } });
  }

  /* ---------- profile ---------- */

  function profileGet(rid) {
    return api('/business/profile?restaurant=' + encodeURIComponent(rid));
  }

  function profilePatch(rid, fields) {
    return api('/business/profile?restaurant=' + encodeURIComponent(rid), {
      method: 'PATCH', body: fields
    });
  }

  /* Map the onboarding model (business-onboarding1) to the
     server profile fields. Only defined values are sent. */
  function profileFromModel(model) {
    var m = model || {};
    var loc = m.location || {};
    var id = m.identity || {};
    var out = {};
    function set(k, v) { if (v !== undefined && v !== null && v !== '') out[k] = v; }
    set('name', id.name);
    set('town', loc.town);
    set('district', loc.district);
    set('districtName', loc.districtName);
    set('area', loc.area);
    set('landmark', loc.landmark);
    set('description', id.description);
    if (Array.isArray(m.contacts) && m.contacts.length) {
      out.contacts = m.contacts.filter(function (c) { return c && (c.number || c.value); }).map(function (c) {
        return { label: c.title || c.purpose || 'Contact', value: String(c.cc || '+267') + String(c.number || c.value || ''), whatsapp: !!c.whatsapp };
      });
    }
    if (m.socialsFields && typeof m.socialsFields === 'object') {
      var socials = Object.keys(m.socialsFields).map(function (p) {
        var url = m.socialsFields[p];
        return url ? { platform: p, url: url } : null;
      }).filter(Boolean);
      if (socials.length) out.socials = socials;
    }
    if (m.hours && (m.hours.open || m.hours.close || (m.hours.days || []).length)) {
      out.hours = { open: m.hours.open || '', close: m.hours.close || '', days: m.hours.days || [], notes: m.hours.notes || '' };
    }
    if (Array.isArray(m.amenities) && m.amenities.length) out.features = m.amenities;
    if (Array.isArray(m.menuTags) || (m.menuTags && (m.menuTags.cuisine || m.menuTags.meals))) {
      var tags = []
        .concat(m.menuTags && m.menuTags.cuisine || [])
        .concat(m.menuTags && m.menuTags.meals || [])
        .concat(m.menuTags && m.menuTags.dietary || []);
      if (tags.length) out.types = tags;
    }
    set('category', m.type);
    return out;
  }

  /* ---------- staff ---------- */

  function staffList(rid) {
    return api('/business/staff?restaurant=' + encodeURIComponent(rid));
  }

  function staffAdd(rid, payload) {
    return api('/business/staff?restaurant=' + encodeURIComponent(rid), {
      method: 'POST', body: payload
    });
  }

  function staffUpdate(rid, membershipId, payload) {
    return api('/business/staff/' + encodeURIComponent(membershipId) +
      '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: payload });
  }

  function staffRemove(rid, membershipId) {
    return api('/business/staff/' + encodeURIComponent(membershipId) +
      '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }

  /* ---------- menu ---------- */

  function menuRead(rid) {
    return api('/business/menu?restaurant=' + encodeURIComponent(rid));
  }

  function menuAddCategory(rid, body) {
    return api('/business/menu/categories?restaurant=' + encodeURIComponent(rid), { method: 'POST', body: body });
  }
  function menuUpdateCategory(rid, id, body) {
    return api('/business/menu/categories/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: body });
  }
  function menuDeleteCategory(rid, id) {
    return api('/business/menu/categories/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }
  function menuAddItem(rid, body) {
    return api('/business/menu/items?restaurant=' + encodeURIComponent(rid), { method: 'POST', body: body });
  }
  function menuUpdateItem(rid, id, body) {
    return api('/business/menu/items/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: body });
  }
  function menuDeleteItem(rid, id) {
    return api('/business/menu/items/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }

  /* ---------- gallery ---------- */

  function galleryRead(rid) {
    return api('/business/gallery?restaurant=' + encodeURIComponent(rid));
  }

  function galleryAddGroup(rid, body) {
    return api('/business/gallery/groups?restaurant=' + encodeURIComponent(rid), { method: 'POST', body: body });
  }
  function galleryUpdateGroup(rid, id, body) {
    return api('/business/gallery/groups/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: body });
  }
  function galleryDeleteGroup(rid, id) {
    return api('/business/gallery/groups/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }
  function galleryAddImage(rid, body) {
    return api('/business/gallery/images?restaurant=' + encodeURIComponent(rid), { method: 'POST', body: body });
  }
  function galleryUpdateImage(rid, id, body) {
    return api('/business/gallery/images/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: body });
  }
  function galleryDeleteImage(rid, id) {
    return api('/business/gallery/images/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }

  /* local gallery shape (gallery-onboarding) <-> server rows */
  function groupToServer(g) {
    g = g || {};
    return { title: g.title || 'Gallery', visible: g.visible !== false, position: Number(g.order) || 0 };
  }
  function groupFromServer(s) {
    s = s || {};
    return { id: s.id, serverId: s.id, title: s.title || '', coverImageId: null, images: [], visible: s.visible === undefined ? true : !!s.visible, order: s.position || 0 };
  }
  function imageToServer(im, groupId) {
    im = im || {};
    return {
      groupId: groupId || im.groupId || null,
      imageKey: im.src || im.imageKey || '',
      label: im.label || null,
      visible: im.visible !== false,
      position: Number(im.order) || 0
    };
  }
  function imageFromServer(s) {
    s = s || {};
    return { id: s.id, serverId: s.id, src: s.imageKey || '', label: s.label || '', file: '', visible: s.visible === undefined ? true : !!s.visible, order: s.position || 0, groupId: s.groupId || null };
  }

  /* ---------- events ---------- */

  function eventsRead(rid) {
    return api('/business/events?restaurant=' + encodeURIComponent(rid));
  }
  function eventAdd(rid, body) {
    return api('/business/events?restaurant=' + encodeURIComponent(rid), { method: 'POST', body: body });
  }
  function eventUpdate(rid, id, body) {
    return api('/business/events/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'PATCH', body: body });
  }
  function eventDelete(rid, id) {
    return api('/business/events/' + encodeURIComponent(id) + '?restaurant=' + encodeURIComponent(rid), { method: 'DELETE' });
  }

  /* local event shape (event-onboarding) <-> server row.
     Extended fields ride in the server `figure` JSON blob. */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function toEpoch(date, time) {
    if (!date) return null;
    var d = new Date(String(date) + 'T' + (time || '00:00'));
    var t = d.getTime();
    return isNaN(t) ? null : t;
  }
  function fromEpoch(ms) {
    if (ms == null) return { date: '', time: '' };
    var d = new Date(Number(ms));
    if (isNaN(d.getTime())) return { date: '', time: '' };
    return {
      date: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()),
      time: pad2(d.getHours()) + ':' + pad2(d.getMinutes())
    };
  }

  function eventToServer(ev) {
    ev = ev || {};
    var figure = {
      type: ev.type || null,
      organizer: ev.organizer || null,
      sponsor: ev.sponsor || null,
      location: ev.location || null,
      recurring: !!ev.recurring,
      recurrence: ev.recurrence || [],
      expectedGuests: ev.expectedGuests != null ? ev.expectedGuests : null,
      maxCapacity: ev.maxCapacity != null ? ev.maxCapacity : null,
      ticketPrice: ev.ticketPrice != null ? ev.ticketPrice : null,
      bookingContactId: ev.bookingContactId || null,
      performances: ev.performances || [],
      serviceIds: ev.serviceIds || [],
      rsvpEnabled: !!ev.rsvpEnabled,
      rsvpContactId: ev.rsvpContactId || null,
      rsvpMax: ev.rsvpMax != null ? ev.rsvpMax : null
    };
    return {
      title: ev.name || 'Untitled event',
      description: ev.description || null,
      imageKey: ev.coverImage || null,
      admission: ev.admission || null,
      startsAt: toEpoch(ev.startDate, ev.startTime),
      endsAt: toEpoch(ev.endDate, ev.endTime),
      published: ev.status === 'published',
      figure: figure
    };
  }

  function eventFromServer(s) {
    s = s || {};
    var f = s.figure || {};
    var st = fromEpoch(s.startsAt), en = fromEpoch(s.endsAt);
    return {
      id: s.id, serverId: s.id,
      name: s.title || '', type: f.type || 'Live Music',
      coverImage: s.imageKey || '', description: s.description || '',
      organizer: f.organizer || '', sponsor: f.sponsor || '',
      location: f.location || null,
      startDate: st.date, startTime: st.time, endDate: en.date, endTime: en.time,
      recurring: !!f.recurring, recurrence: f.recurrence || [],
      expectedGuests: f.expectedGuests != null ? f.expectedGuests : null,
      maxCapacity: f.maxCapacity != null ? f.maxCapacity : null,
      admission: s.admission || 'Free',
      ticketPrice: f.ticketPrice != null ? f.ticketPrice : null,
      bookingContactId: f.bookingContactId || null,
      performances: f.performances || [], serviceIds: f.serviceIds || [],
      rsvpEnabled: f.rsvpEnabled !== false,
      rsvpContactId: f.rsvpContactId || null,
      rsvpMax: f.rsvpMax != null ? f.rsvpMax : null,
      status: s.published ? 'published' : 'draft',
      createdAt: s.created_at || Date.now()
    };
  }

  /* ---------- promos (moderation queue) ---------- */

  /* Promos are never published directly: submitting queues them for admin
     review in the same promo_submissions queue as customer event promos. */
  function promosRead(rid) {
    return api('/customer/promo-submissions?restaurantId=' + encodeURIComponent(rid));
  }
  function promoSubmit(rid, body) {
    return api('/customer/promo-submissions', {
      method: 'POST', body: Object.assign({ restaurantId: rid }, body || {})
    });
  }

  /* local promo shape (promo-onboarding) -> queue submission body. */
  function promoToSubmission(p, restaurant) {
    p = p || {}; restaurant = restaurant || {};
    var loc = p.location || {};
    var name = (restaurant.identity && restaurant.identity.name) || restaurant.name || '';
    var when = [p.startDate, p.startTime].filter(Boolean).join(' ');
    if (p.endDate) when += (when ? ' – ' : '') + p.endDate + (p.endTime ? ' ' + p.endTime : '');
    return {
      eventRef: p.id,
      title: p.title || 'Promo',
      venueName: name || null,
      whenText: when || null,
      summary: p.description || null,
      imageRef: p.image || null,
      fee: 50,
      currency: 'BWP',
      payload: p
    };
  }

  /* local menu shape (menu-onboarding) <-> server item/category */
  function itemToServer(it, categoryId) {
    var status = it && it.status;
    return {
      name: it.name,
      description: it.description || null,
      price: Number(it.basePrice) || 0,
      categoryId: categoryId || null,
      visible: status !== 'hidden',
      position: Number(it.order) || 0
    };
  }

  function itemFromServer(s) {
    var visible = s.visible !== false;
    return {
      id: s.id,
      serverId: s.id,
      categoryId: s.categoryId || null,
      name: s.name || '',
      description: s.description || '',
      basePrice: s.price != null ? s.price : 0,
      status: visible ? 'available' : 'hidden',
      order: s.position || 0,
      image: s.imageKey || '',
      currency: s.currency || 'BWP'
    };
  }

  function categoryFromServer(s) {
    return { id: s.id, serverId: s.id, name: s.name || '', order: s.position || 0, visible: true };
  }

  window.EatoutsBusinessApi = {
    state: state,
    api: api,
    mine: mine,
    resolve: resolve,
    create: create,
    claim: claim,
    profileGet: profileGet,
    profilePatch: profilePatch,
    profileFromModel: profileFromModel,
    staffList: staffList,
    staffAdd: staffAdd,
    staffUpdate: staffUpdate,
    staffRemove: staffRemove,
    menuRead: menuRead,
    menuAddCategory: menuAddCategory,
    menuUpdateCategory: menuUpdateCategory,
    menuDeleteCategory: menuDeleteCategory,
    menuAddItem: menuAddItem,
    menuUpdateItem: menuUpdateItem,
    menuDeleteItem: menuDeleteItem,
    itemToServer: itemToServer,
    itemFromServer: itemFromServer,
    categoryFromServer: categoryFromServer,
    galleryRead: galleryRead,
    galleryAddGroup: galleryAddGroup,
    galleryUpdateGroup: galleryUpdateGroup,
    galleryDeleteGroup: galleryDeleteGroup,
    galleryAddImage: galleryAddImage,
    galleryUpdateImage: galleryUpdateImage,
    galleryDeleteImage: galleryDeleteImage,
    groupToServer: groupToServer,
    groupFromServer: groupFromServer,
    imageToServer: imageToServer,
    imageFromServer: imageFromServer,
    eventsRead: eventsRead,
    eventAdd: eventAdd,
    eventUpdate: eventUpdate,
    eventDelete: eventDelete,
    eventToServer: eventToServer,
    eventFromServer: eventFromServer,
    promosRead: promosRead,
    promoSubmit: promoSubmit,
    promoToSubmission: promoToSubmission
  };
})();
