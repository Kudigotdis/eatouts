/* The Food Place — demo business record (owner console + operator workspace).
   Loaded into window.EATOUTS_DEMO.businesses by js/eatouts-manager-seed.js.
   Fictional demo data only. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).businesses = [
  {
    id: "biz-restaurant",
    name: "The Food Place",
    type: "restaurant",
    status: "live",
    logo: "assets/logo/the_food_place_logo.jpg",
    town: "Gaborone",
    area: "CBD",
    address: "Plot 54358, Kgale View, Gaborone",
    about: "All-day café, kitchen and bar serving breakfast, burgers, grills, pizza and coffee in the heart of Gaborone CBD.",
    ownerId: "u-owner",
    ownerUserId: "u-owner",
    whatsapp: "26771844129",
    subscription: "Growth",
    plan: "growth",
    setupPaid: true,
    verified: true,
    createdAt: "2025-03-01",
    identity: {
      name: "The Food Place",
      slug: "the-food-place",
      type: "restaurant",
      status: "live",
      logo: "assets/logo/the_food_place_logo.jpg",
      about: "All-day café, kitchen and bar in Gaborone CBD."
    },
    location: { city: "Gaborone", town: "Gaborone", area: "CBD", address: "Plot 54358, Kgale View, Gaborone" },
    contacts: [
      { id: "c-1", label: "Phone / WhatsApp", value: "26771844129" },
      { id: "c-2", label: "Email", value: "hello@thefoodplace.co.bw" },
      { id: "c-3", label: "Website", value: "https://thefoodplace.co.bw" }
    ],
    socials: [
      { facebook: "https://facebook.com/thefoodplacebw", instagram: "https://instagram.com/thefoodplacebw", tiktok: "" }
    ],
    operatingHours: {
      weekly: [
        { day: "Monday", open: "07:30", close: "21:00" },
        { day: "Tuesday", open: "07:30", close: "21:00" },
        { day: "Wednesday", open: "07:30", close: "22:00" },
        { day: "Thursday", open: "07:30", close: "22:00" },
        { day: "Friday", open: "07:30", close: "23:00" },
        { day: "Saturday", open: "08:00", close: "23:00" },
        { day: "Sunday", open: "08:00", close: "20:00" }
      ],
      customSchedules: []
    },
    amenities: {
      options: [
        { name: "Outdoor seating" },
        { name: "Free WiFi" },
        { name: "Wheelchair access" },
        { name: "Secure parking" },
        { name: "Card payments" }
      ]
    },
    payments: [{ name: "Cash" }, { name: "Card" }, { name: "Orange Money" }, { name: "MyZaka" }],
    capacity: [{ id: "cap-1", name: "Main floor", seats: 60 }, { id: "cap-2", name: "Outdoor terrace", seats: 24 }],
    characters: [],
    menuTags: { options: [{ name: "Vegetarian" }, { name: "Contains nuts" }, { name: "Spicy" }] },
    users: []
  }
];
