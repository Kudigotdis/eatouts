/* Compatibility adapter for the existing owner pages.
   The v2 database remains canonical; forms edit a legacy-shaped view. */
(function () {
  'use strict';

  var DB = window.EatoutsDB;
  if (!DB) throw new Error('EatoutsDB must load before the owner compatibility adapter');

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function merge(base, value) {
    var out = Object.assign({}, base, value || {});
    Object.keys(base).forEach(function (key) {
      if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        out[key] = merge(base[key], value && value[key]);
      }
    });
    return out;
  }

  function emptyProfile(restaurant) {
    var r = restaurant;
    return {
      id: r.id,
      identity: { name: r.name || '', description: '', logo: r.logo || '', coverImage: '', types: clone(r.types || []), status: r.status || 'draft' },
      location: { city: r.location.town || '', area: r.location.area || '', plotNumber: '', streetName: '', streetNumber: '', building: '', landmark: r.landmark || '', latitude: null, longitude: null },
      contacts: clone(r.contacts || []), socials: clone(r.socials || []),
      operatingHours: { title: 'Operating Hours', weekly: [], customSchedules: [] },
      character: { title: 'Restaurant Character', options: [] },
      amenities: { title: 'Amenities', options: [] },
      menuTags: { title: 'Menu Tags', options: [] },
      capacity: [], payments: [],
      reservations: { enabled: true, whatsappContactId: null, callContactId: null, minimumGuests: 2, maximumGuests: 12, sameDay: true, advanceBooking: true, cancellationNotes: '', notes: '' },
      reservationServices: [], serviceStaff: [], users: []
    };
  }

  function imagesToGroups(content) {
    if (Array.isArray(content.galleryGroups) && content.galleryGroups.length) return clone(content.galleryGroups);
    var groups = {};
    (content.galleryImages || []).forEach(function (image) {
      var id = image.groupId || image.cat || 'gallery';
      if (!groups[id]) groups[id] = {
        id: id,
        title: image.groupTitle || image.cat || 'Gallery',
        coverImageId: image.coverImageId || null,
        visible: image.groupVisible !== false,
        order: image.groupOrder || Object.keys(groups).length + 1,
        images: []
      };
      groups[id].images.push({ id: image.id, src: image.src, label: image.label || '', file: image.file || '', visible: image.visible !== false, order: image.order || groups[id].images.length + 1 });
    });
    return Object.keys(groups).map(function (id) { return groups[id]; });
  }

  function groupsToImages(groups) {
    var images = [];
    (groups || []).forEach(function (group, groupIndex) {
      (group.images || []).forEach(function (image, imageIndex) {
        images.push({
          id: image.id,
          cat: group.title,
          src: image.src,
          label: image.label || group.title,
          file: image.file || '',
          visible: image.visible !== false && group.visible !== false,
          order: imageIndex + 1,
          groupId: group.id,
          groupTitle: group.title,
          groupVisible: group.visible !== false,
          groupOrder: group.order || groupIndex + 1,
          coverImageId: group.coverImageId || null
        });
      });
    });
    return images;
  }

  function load() {
    var db = DB.load();
    if (!db.restaurants.length) {
      var restaurant = DB.addRestaurant('Untitled restaurant', db);
      DB.setActive(restaurant.id, db);
      DB.save(db);
      db = DB.load();
    }
    var restaurant = DB.active(db) || db.restaurants[0];
    DB.setActive(restaurant.id, db);
    var content = DB.resolveContent(restaurant.id, db) || DB.emptyContent();
    var profile = merge(emptyProfile(restaurant), content.profile || {});
    profile.id = restaurant.id;
    profile.identity = merge(profile.identity, {
      name: restaurant.name,
      logo: restaurant.logo || profile.identity.logo,
      status: restaurant.status,
      types: clone(restaurant.types || profile.identity.types || [])
    });
    profile.location = merge(profile.location, {
      city: restaurant.location.town || profile.location.city,
      area: restaurant.location.area || profile.location.area,
      landmark: restaurant.landmark || profile.location.landmark
    });
    profile.contacts = clone(restaurant.contacts || profile.contacts || []);
    profile.socials = clone(restaurant.socials || profile.socials || []);

    var legacy = {
      version: 1,
      restaurant: profile,
      menuCategories: clone(content.menuCategories || []),
      menuItems: clone(content.menuItems || []),
      promos: clone(content.promos || []),
      events: clone(content.events || []),
      performers: clone(content.performers || []),
      performances: clone(content.performances || []),
      galleryGroups: imagesToGroups(content),
      galleryImages: clone(content.galleryImages || []),
      settings: clone(db.settings)
    };
    mountRestaurantSelector(db, restaurant.id);
    return legacy;
  }

  function save(legacy) {
    var db = DB.load();
    var restaurant = DB.getRestaurant(legacy.restaurant.id, db) || DB.active(db) || db.restaurants[0];
    if (!restaurant) restaurant = DB.addRestaurant((legacy.restaurant.identity || {}).name || 'Untitled restaurant', db);
    DB.setActive(restaurant.id, db);
    var profile = legacy.restaurant || {};
    var identity = profile.identity || {};
    var location = profile.location || {};
    restaurant.name = identity.name || 'Untitled restaurant';
    restaurant.logo = identity.logo || null;
    restaurant.landmark = location.landmark || '';
    restaurant.location = Object.assign({}, restaurant.location || {}, {
      town: location.city || '', area: location.area || ''
    });
    restaurant.types = clone(identity.types || []);
    restaurant.status = identity.status || 'draft';
    restaurant.contacts = clone(profile.contacts || []);
    restaurant.socials = clone(profile.socials || []);

    var content = DB.forkContent(restaurant.id, db);
    content.profile = clone(profile);
    ['menuCategories', 'menuItems', 'promos', 'events', 'performers', 'performances'].forEach(function (key) {
      content[key] = clone(legacy[key] || []);
    });
    content.galleryGroups = clone(legacy.galleryGroups || []);
    content.galleryImages = groupsToImages(legacy.galleryGroups || []);
    db.settings = Object.assign({}, db.settings || {}, legacy.settings || {});
    DB.save(db);
  }

  function mountRestaurantSelector(db, activeId) {
    var topbar = document.querySelector('.topbar');
    if (!topbar || document.getElementById('ownerRestaurantSelect')) return;

    /* Locked to the signed-in restaurant: show a plain label instead of
       a <select>, so one owner cannot switch to another venue. Demo
       mode keeps the switcher so every restaurant stays reachable. */
    var session = (window.EatoutsAuth && typeof EatoutsAuth.currentSession === 'function')
      ? EatoutsAuth.currentSession()
      : null;
    if (session && !session.demo) {
      if (document.getElementById('ownerRestaurantLock')) return;
      var current = DB.getRestaurant(activeId, db);
      var lock = document.createElement('div');
      lock.id = 'ownerRestaurantLock';
      lock.setAttribute('aria-label', 'Signed-in restaurant');
      lock.style.cssText = 'max-width:240px;min-width:130px;height:38px;display:flex;align-items:center;padding:0 12px;border:1px solid #e7e4dd;border-radius:8px;background:#faf9f6;font-size:12px;font-weight:700;color:#1b1b1b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
      lock.textContent = (current && current.name) || session.restaurantName || 'Your restaurant';
      topbar.appendChild(lock);
      return;
    }

    var select = document.createElement('select');
    select.id = 'ownerRestaurantSelect';
    select.setAttribute('aria-label', 'Active restaurant');
    select.style.cssText = 'max-width:240px;min-width:130px;height:38px;padding:0 30px 0 10px;border:1px solid #e7e4dd;border-radius:8px;background:#fff;font:inherit;font-size:12px';
    select.innerHTML = DB.byLastActive(db).map(function (restaurant) {
      var label = String(restaurant.name || 'Untitled restaurant').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      return '<option value="' + restaurant.id + '"' + (restaurant.id === activeId ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
    select.onchange = function () {
      var latest = DB.load();
      DB.setActive(select.value, latest);
      DB.save(latest);
      window.location.reload();
    };
    topbar.appendChild(select);
  }

  window.EatoutsOwnerCompat = { load: load, save: save };
})();
