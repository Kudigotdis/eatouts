/* DEMO DATA — page-scoped supplement for venue-about.html ONLY.
   Adds exactly two clearly-labelled demo businesses (demo-event-supplier,
   demo-food-truck) under window.EATOUTS_DEMO_BUSINESSES so the standalone
   About page can be verified for those business types, which have no rows in
   the generated directory. This file is loaded ONLY by venue-about.html and
   is NOT loaded by index.html — the SPA never sees it.

   Rows are deliberately NOT pushed into window.DIRECTORY_RUNTIME_DATA:
   venue-about's boot calls EatoutsSeed.mergeDirectory(DIRECTORY_RUNTIME_DATA),
   which persists merges into the customer DB in localStorage. Mutating the
   runtime data here would leak demo rows into index.html's browse list.

   TO REMOVE: delete this file, remove its <script> tag from venue-about.html,
   and remove the identity.slug / restaurantId values + biz-truck / u-truck
   seeds that were added to js/eatouts-manager-db.js. */
(function () {
  'use strict';
  window.EATOUTS_DEMO_BUSINESSES = {
    restaurants: [
      {
        id: 'rest_demo-event-supplier',
        name: 'Demo Event Supplier (DEMO)',
        slug: 'demo-event-supplier',
        town: 'Gaborone',
        district: '',
        districtName: 'Gaborone',
        areas: [],
        addresses: [],
        contacts: [],
        socials: [],
        description: '',
        website: '',
        logo: '',
        types: ['Event supplier'],
        category: 'Event supplier',
        sources: ['eatouts_demo_businesses.js'],
        area: '',
        landmark: ''
      },
      {
        id: 'rest_demo-food-truck',
        name: 'Demo Food Truck (DEMO)',
        slug: 'demo-food-truck',
        town: 'Gaborone',
        district: '',
        districtName: 'Gaborone',
        areas: [],
        addresses: [],
        contacts: [],
        socials: [],
        description: '',
        website: '',
        logo: '',
        types: ['Food truck'],
        category: 'Food truck',
        sources: ['eatouts_demo_businesses.js'],
        area: '',
        landmark: ''
      }
    ],
    get(slug) {
      for (var i = 0; i < this.restaurants.length; i++) {
        if (this.restaurants[i].slug === slug) return this.restaurants[i];
      }
      return null;
    }
  };
})();
