/* EatoutsBusinessTypes — canonical business-type catalog shared by the
   operator / onboarding / schedule pages.

   Keys are canonical slugs: restaurant, bottlestore, caterer, lodge,
   bakery, foodtruck, supplier. normalize() maps synonyms such as
   bottle_store, bottle-store, food_truck, food-truck, lodge/hotel.

   Each entry exposes:
     label       human-readable name
     icon        emoji used by the type picker
     description one-line blurb shown under the picker
     modules     onboarding section keys available to that type
     roles       business roles selectable for that type
   Plus the same role list on basket.roles[type].

   onboardingPage(type) returns the onboarding form for a business type,
   so links never have to hard-code the file name. */
(function () {
  const TYPES = {
    restaurant: {
      label: 'Restaurant',
      icon: '🍽',
      description: 'Dine-in, takeaway or delivery venue.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'character', 'amenities', 'menuTags', 'capacity', 'payments', 'reservations', 'hostingServices', 'staff', 'users', 'menu', 'beverage', 'promos', 'events', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'chef', 'cashier', 'server', 'bartender', 'delivery_driver']
    },
    bottlestore: {
      label: 'Bottle Store',
      icon: '🍾',
      description: 'Liquor store, no dine-in.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'payments', 'staff', 'users', 'menu', 'beverage', 'promos', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'cashier', 'stock_manager']
    },
    caterer: {
      label: 'Caterer',
      icon: '🥘',
      description: 'Event catering and food service.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'capacity', 'payments', 'reservations', 'hostingServices', 'staff', 'users', 'menu', 'promos', 'events', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'chef', 'event_coordinator', 'server']
    },
    lodge: {
      label: 'Lodge / Hotel',
      icon: '🏨',
      description: 'Rooms plus dining and events.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'character', 'amenities', 'capacity', 'payments', 'reservations', 'hostingServices', 'staff', 'users', 'menu', 'beverage', 'rooms', 'promos', 'events', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'reception', 'housekeeping', 'chef']
    },
    bakery: {
      label: 'Bakery / Pastry',
      icon: '🥐',
      description: 'Baked goods, no events.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'payments', 'staff', 'users', 'menu', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'baker', 'cashier']
    },
    foodtruck: {
      label: 'Food Truck',
      icon: '🚚',
      description: 'Rotating location, not a fixed address.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'payments', 'staff', 'users', 'menu', 'beverage', 'promos', 'schedule', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'cook', 'cashier', 'schedule_manager']
    },
    supplier: {
      label: 'Event Supplier',
      icon: '📦',
      description: 'MC, decor, security, AV, entertainment.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'payments', 'staff', 'users', 'services', 'portfolio', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'event_coordinator']
    }
  };

  const SYNONYMS = {
    restaurant: 'restaurant',
    bottle: 'bottlestore',
    bottlestore: 'bottlestore',
    bottle_store: 'bottlestore',
    'bottle-store': 'bottlestore',
    bottleStore: 'bottlestore',
    liquor_store: 'bottlestore',
    'liquor-store': 'bottlestore',
    liquorStore: 'bottlestore',
    caterer: 'caterer',
    catering: 'caterer',
    lodge: 'lodge',
    hotel: 'lodge',
    'lodge/hotel': 'lodge',
    'lodge_hotel': 'lodge',
    'lodge-hotel': 'lodge',
    bakery: 'bakery',
    pastry: 'bakery',
    bakery_pastry: 'bakery',
    'bakery-pastry': 'bakery',
    foodtruck: 'foodtruck',
    food_truck: 'foodtruck',
    'food-truck': 'foodtruck',
    foodTruck: 'foodtruck',
    truck: 'foodtruck',
    supplier: 'supplier',
    suppliers: 'supplier',
    event_supplier: 'supplier',
    'event-supplier': 'supplier',
    eventSupplier: 'supplier'
  };

  function normalize(raw) {
    const k = String(raw == null ? '' : raw).toLowerCase().trim();
    if (Object.prototype.hasOwnProperty.call(TYPES, k)) return k;
    if (Object.prototype.hasOwnProperty.call(SYNONYMS, k)) return SYNONYMS[k];
    const loose = k.replace(/[^a-z0-9]+/g, '');
    for (const key in SYNONYMS) {
      if (key.replace(/[^a-z0-9]+/g, '') === loose) return SYNONYMS[key];
    }
    return 'restaurant';
  }

  function get(raw) {
    return TYPES[normalize(raw)] || TYPES.restaurant;
  }

  /* Each business type finishes its setup on its own onboarding form.
     Lodge has no onboarding form of its own yet, so it falls back to the
     business signup page. */
  const ONBOARDING_PAGES = {
    restaurant: 'restaurant-onboarding.html',
    bottlestore: 'bottle-store-onboarding.html',
    caterer: 'caterer-onboarding.html',
    bakery: 'bakery-onboarding.html',
    foodtruck: 'mobile-kitchen-onboarding.html',
    supplier: 'supplier-onboarding.html'
  };

  function onboardingPage(raw) {
    return ONBOARDING_PAGES[normalize(raw)] || 'eatouts-business-signup.html';
  }

  /* The dashboard that belongs to a business type. The business hub uses
     this to send an operator to the right workspace, so no page has to
     hard-code the file name.

     `lodge` has no dashboard of its own yet, so it falls back to the
     restaurant shell - the most complete one. */
  const DASHBOARD_FILES = {
    restaurant: 'dashboards/eatouts-restaurant-dashboard.html',
    bakery: 'dashboards/eatouts-bakery-dashboard.html',
    caterer: 'dashboards/eatouts-caterer-dashboard.html',
    foodtruck: 'dashboards/eatouts-mobile-kitchen-dashboard.html',
    bottlestore: 'dashboards/eatouts-bottle-store-dashboard.html',
    supplier: 'dashboards/eatouts-event-supplier-dashboard.html',
    lodge: 'dashboards/eatouts-restaurant-dashboard.html'
  };

  function dashboardFile(raw) {
    return DASHBOARD_FILES[normalize(raw)] || DASHBOARD_FILES.restaurant;
  }

  /* The path is relative to the page that asks for it, so a page inside
     `dashboards/` gets `../dashboards/...` and a root page gets
     `dashboards/...`. */
  function dashboardHref(raw, fromSubfolder) {
    const file = dashboardFile(raw);
    return fromSubfolder ? '../' + file : file;
  }

  window.EatoutsBusinessTypes = {
    all: TYPES,
    keys: Object.keys(TYPES),
    get: get,
    normalize: normalize,
    onboardingPages: ONBOARDING_PAGES,
    onboardingPage: onboardingPage,
    dashboardFiles: DASHBOARD_FILES,
    dashboardFile: dashboardFile,
    dashboardHref: dashboardHref,
    roles: Object.keys(TYPES).reduce(function (m, k) { m[k] = TYPES[k].roles; return m; }, {})
  };
})();