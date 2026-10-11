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
   Plus the same role list on basket.roles[type]. */
(function () {
  const TYPES = {
    restaurant: {
      label: 'Restaurant',
      icon: '🍽',
      description: 'Dine-in, takeaway or delivery venue.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'character', 'amenities', 'menuTags', 'capacity', 'payments', 'reservations', 'reservationServices', 'staff', 'users', 'menu', 'beverage', 'promos', 'events', 'gallery', 'billing', 'review'],
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
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'capacity', 'payments', 'reservations', 'reservationServices', 'staff', 'users', 'menu', 'promos', 'events', 'gallery', 'billing', 'review'],
      roles: ['biz_owner', 'biz_admin', 'manager', 'chef', 'event_coordinator', 'server']
    },
    lodge: {
      label: 'Lodge / Hotel',
      icon: '🏨',
      description: 'Rooms plus dining and events.',
      modules: ['identity', 'location', 'contacts', 'socials', 'hours', 'character', 'amenities', 'capacity', 'payments', 'reservations', 'reservationServices', 'staff', 'users', 'menu', 'beverage', 'rooms', 'promos', 'events', 'gallery', 'billing', 'review'],
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

  window.EatoutsBusinessTypes = {
    all: TYPES,
    keys: Object.keys(TYPES),
    get: get,
    normalize: normalize,
    roles: Object.keys(TYPES).reduce(function (m, k) { m[k] = TYPES[k].roles; return m; }, {})
  };
})();