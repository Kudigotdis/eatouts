/* The Food Place — generated demo-data bundle. DO NOT EDIT DIRECTLY.
   Source: assets/data/demo/the-food-place/*.js
   Rebuild: npm run demo-data
   Generated: 2026-10-12 */
window.EATOUTS_DEMO = window.EATOUTS_DEMO || {};

/* ---- business.js ---- */
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

/* ---- users.js ---- */
/* The Food Place — demo users (manager store "users" collection).

   One login per staff member (WhatsApp number + demo PIN 1234), the two
   owners, and the three investor/board accounts (read-only finance).
   Customer demo accounts are kept from the original seed. Only inserted
   when the id is absent, so existing records are never overwritten. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).users = [

  /* Owners (login-capable) */
  { id: "u-owner-2", firstName: "Tebogo", surname: "Molefe", whatsapp: "26772345678", email: "tebogo@thefoodplace.co.bw", type: "biz_owner", status: "active", roles: ["biz_owner", "owner"], accessLevel: "owner", employeeId: "TFP-OWN-02", businessId: "biz-restaurant" },

  /* Investors / board (read-only finance) */
  { id: "u-inv-1", firstName: "Lesedi", surname: "Seboko", whatsapp: "26773456789", email: "l.seboko@investments.co.bw", type: "investor", status: "active", roles: ["investor"], accessLevel: "read_only", systemAccess: "Financial Dashboard Admin (Read-Only + Reports)", employeeId: "TFP-INV-01", businessId: "biz-restaurant" },
  { id: "u-inv-2", firstName: "Mpho", surname: "Kgosi", whatsapp: "26774567890", email: "mpho.kgosi@capital.co.bw", type: "investor", status: "active", roles: ["investor"], accessLevel: "read_only", systemAccess: "Financial Dashboard Admin (Read-Only + Reports)", employeeId: "TFP-INV-02", businessId: "biz-restaurant" },
  { id: "u-inv-3", firstName: "Thabo", surname: "Nkomo", whatsapp: "26775678901", email: "tnkomo@group.co.bw", type: "investor", status: "active", roles: ["investor"], accessLevel: "read_only", systemAccess: "Financial Dashboard Admin (Read-Only + Reports)", employeeId: "TFP-INV-03", businessId: "biz-restaurant" },

  /* Staff logins (all 21 staff records) */
  { id: "u-st-102", firstName: "Tebogo", surname: "Molefe", whatsapp: "26772345678", email: "tebogo@thefoodplace.co.bw", type: "staff", status: "active", roles: ["chef", "manager"], accessLevel: "owner", employeeId: "TFP-OWN-02", businessId: "biz-restaurant" },
  { id: "u-st-103", firstName: "Kabelo", surname: "Tau", whatsapp: "26776789012", email: "kabelo.tau@thefoodplace.co.bw", type: "staff", status: "active", roles: ["chef"], accessLevel: "manager", employeeId: "TFP-CHF-01", businessId: "biz-restaurant" },
  { id: "u-st-104", firstName: "Neo", surname: "Mogorosi", whatsapp: "26771890123", email: "neo.mogorosi@thefoodplace.co.bw", type: "staff", status: "active", roles: ["chef"], accessLevel: "pos", employeeId: "TFP-CHF-02", businessId: "biz-restaurant" },
  { id: "u-st-105", firstName: "Thato", surname: "Dambe", whatsapp: "26772901234", email: "thato.dambe@thefoodplace.co.bw", type: "staff", status: "active", roles: ["chef"], accessLevel: "pos", employeeId: "TFP-CHF-03", businessId: "biz-restaurant" },
  { id: "u-st-106", firstName: "Tshepo", surname: "Setswalo", whatsapp: "26773012345", email: "tshepo.setswalo@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server"], accessLevel: "pos", employeeId: "TFP-WAT-01", businessId: "biz-restaurant" },
  { id: "u-st-107", firstName: "Bame", surname: "Gaolathe", whatsapp: "26774123456", email: "bame.gaolathe@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server"], accessLevel: "pos", employeeId: "TFP-WAT-02", businessId: "biz-restaurant" },
  { id: "u-st-108", firstName: "Boitumelo", surname: "Moremi", whatsapp: "26775234567", email: "boitu.moremi@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server"], accessLevel: "pos", employeeId: "TFP-WAT-03", businessId: "biz-restaurant" },
  { id: "u-st-109", firstName: "Katlo", surname: "Makgosi", whatsapp: "26776345678", email: "katlo.makgosi@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server"], accessLevel: "pos", employeeId: "TFP-WAT-04", businessId: "biz-restaurant" },
  { id: "u-st-110", firstName: "Lorato", surname: "Khama", whatsapp: "26771456789", email: "lorato.khama@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server", "housekeeping"], accessLevel: "pos", employeeId: "TFP-WAT-05", businessId: "biz-restaurant" },
  { id: "u-st-111", firstName: "Oneilwe", surname: "Modise", whatsapp: "26772567890", email: "oneilwe.modise@thefoodplace.co.bw", type: "staff", status: "active", roles: ["server"], accessLevel: "pos", employeeId: "TFP-WAT-06", businessId: "biz-restaurant" },
  { id: "u-st-112", firstName: "Bakang", surname: "Letsholo", whatsapp: "26773678901", email: "bakang.letsholo@thefoodplace.co.bw", type: "staff", status: "active", roles: ["bartender", "cashier"], accessLevel: "manager", employeeId: "TFP-BAR-01", businessId: "biz-restaurant" },
  { id: "u-st-113", firstName: "Kealeboga", surname: "Banda", whatsapp: "26774789012", email: "kiki.banda@thefoodplace.co.bw", type: "staff", status: "active", roles: ["bartender", "cashier"], accessLevel: "pos", employeeId: "TFP-BAR-02", businessId: "biz-restaurant" },
  { id: "u-st-114", firstName: "Tumelo", surname: "Pitso", whatsapp: "26775890123", email: "tumelo.pitso@thefoodplace.co.bw", type: "staff", status: "active", roles: ["driver"], accessLevel: "driver", employeeId: "TFP-DRV-01", businessId: "biz-restaurant" },
  { id: "u-st-115", firstName: "Gofaone", surname: "Masilo", whatsapp: "26776901234", email: "gofaone.masilo@thefoodplace.co.bw", type: "staff", status: "active", roles: ["driver"], accessLevel: "driver", employeeId: "TFP-DRV-02", businessId: "biz-restaurant" },
  { id: "u-st-116", firstName: "Oteng", surname: "Baloyi", whatsapp: "26771012345", email: "oteng.baloyi@thefoodplace.co.bw", type: "staff", status: "active", roles: ["security", "housekeeping"], accessLevel: "pos", employeeId: "TFP-SEC-01", businessId: "biz-restaurant" },
  { id: "u-st-117", firstName: "Phenyo", surname: "Ntwane", whatsapp: "26772123456", email: "phenyo.ntwane@thefoodplace.co.bw", type: "staff", status: "active", roles: ["security"], accessLevel: "pos", employeeId: "TFP-SEC-02", businessId: "biz-restaurant" },
  { id: "u-st-118", firstName: "Naledi", surname: "Motswagole", whatsapp: "26773234567", email: "naledi.motswagole@thefoodplace.co.bw", type: "staff", status: "active", roles: ["floor_manager", "manager"], accessLevel: "manager", employeeId: "TFP-FLR-01", businessId: "biz-restaurant" },
  { id: "u-st-119", firstName: "Mpho", surname: "Kgosidintsi", whatsapp: "26774345678", email: "mpho.kgosidintsi@thefoodplace.co.bw", type: "staff", status: "active", roles: ["housekeeping"], accessLevel: "pos", employeeId: "TFP-CLN-01", businessId: "biz-restaurant" },
  { id: "u-st-120", firstName: "Goitseone", surname: "Rantsho", whatsapp: "26775456789", email: "goitseone.rantsho@thefoodplace.co.bw", type: "staff", status: "active", roles: ["housekeeping"], accessLevel: "pos", employeeId: "TFP-CLN-02", businessId: "biz-restaurant" },
  { id: "u-st-121", firstName: "Boineelo", surname: "Kgari", whatsapp: "26776567890", email: "boineelo.kgari@thefoodplace.co.bw", type: "staff", status: "active", roles: ["accountant", "admin"], accessLevel: "admin", employeeId: "TFP-ACC-01", businessId: "biz-restaurant" },

  /* Customer demo accounts */
  { id: "u-c-1", firstName: "Kagiso", surname: "Sithole", whatsapp: "26772000301", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-2", firstName: "Naledi", surname: "Phiri", whatsapp: "26772000302", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-3", firstName: "Boitumelo", surname: "Nkosi", whatsapp: "26772000303", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-4", firstName: "Onalenna", surname: "Radebe", whatsapp: "26772000304", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-5", firstName: "Lesego", surname: "Nyathi", whatsapp: "26772000305", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-6", firstName: "Tumelo", surname: "Ncube", whatsapp: "26772000306", type: "customer", status: "active", roles: ["customer"] },
  { id: "u-c-7", firstName: "Dineo", surname: "Tshiamo", whatsapp: "26772000307", type: "customer", status: "active", roles: ["customer"] }
];

/* ---- settings.js ---- */
/* The Food Place — demo platform settings (manager store "settings" object).
   Deep-filled on top of any stored values; user edits always win. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).settings = {
  currency: "BWP",
  setupFee: 300,
  defaultDeliveryFee: 35,
  zones: ["Gaborone CBD", "Broadhurst", "Block 8", "Gaborone West", "Phakalane", "Tlokweng", "Mogoditshane"],
  pricing: { setup: 300, starter: 100, growth: 300, pro: 500 },
  featureFlags: { reviews: true, delivery: true, quotes: true, promotions: true, events: true }
};

/* ---- staff.js ---- */
/* The Food Place — demo staff roster (manager store "staff" collection).

   Rich operational profiles: identity, employment, pay/bank, shift, and
   role-specific nested sections (attendance, tips, kitchen, delivery,
   security, performance, payroll). All fictional demo data; Omang numbers
   follow the Botswana 9-digit [1|2|4|5]+8 system and the two non-citizens
   carry Zem-Zimbabwe LL###### passport numbers. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).staff = [

  /* ---------------------------- Owners ---------------------------- */
  {
    id: "st-101", businessId: "biz-restaurant", employeeId: "TFP-OWN-01",
    firstName: "Kagiso", surname: "Phiri", preferredName: "",
    dob: "1985-03-14", age: 41, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "145678901",
    email: "kagiso@thefoodplace.co.bw", contact: "26770000002", photo: "",
    emergencyContact: "26772345678", emergencyContactName: "Tebogo Molefe", emergencyContactRelation: "Spouse",
    jobTitle: "Co-Owner & General Manager", department: "Executive Management", roles: ["manager", "admin"],
    accessLevel: "owner", systemAccess: "Super Admin / Owner",
    shift: "off", employmentType: "full_time", startDate: "2021-06-01", status: "active",
    salaryAmount: 18500, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 0,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "First National Bank Botswana", branch: "282267", account: "62014837721", payoutMethod: "Bank transfer" },
    responsibilities: ["Business strategy", "Investor relations", "Licensing & compliance", "Final escalations"],
    attendance: { lastClockIn: "2026-10-11T07:05", lastClockOut: "2026-10-11T18:30", hours: { regular: 11.4, overtime: 0 }, breaks: [{ label: "Lunch", start: "13:00", end: "13:30" }], lateness: { late: 0, absent: 0 } },
    performance: { revenueToday: 26840, staffOnShift: 9, labourPct: 27.5, foodCostPct: 31.2, netMarginPct: 14.8 },
    payroll: { gross: 18500, paye: 4125, bpopf: 925, net: 13450, period: "2026-10" }
  },
  {
    id: "st-102", businessId: "biz-restaurant", employeeId: "TFP-OWN-02",
    firstName: "Tebogo", surname: "Molefe", preferredName: "Tebs",
    dob: "1988-07-22", age: 38, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "245678901",
    email: "tebogo@thefoodplace.co.bw", contact: "26772345678", photo: "",
    emergencyContact: "26771234567", emergencyContactName: "Kagiso Phiri", emergencyContactRelation: "Spouse",
    jobTitle: "Co-Owner & Executive Head Chef", department: "Kitchen / Executive Management", roles: ["chef", "manager"],
    accessLevel: "owner", systemAccess: "Super Admin / Owner",
    shift: "off", employmentType: "full_time", startDate: "2021-06-01", status: "active",
    salaryAmount: 18500, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 0,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "First National Bank Botswana", branch: "282267", account: "62014837733", payoutMethod: "Bank transfer" },
    responsibilities: ["Menu engineering", "Kitchen standards", "Food cost control", "Chef training"],
    attendance: { lastClockIn: "2026-10-11T06:45", lastClockOut: "2026-10-11T17:10", hours: { regular: 10.4, overtime: 0 }, breaks: [{ label: "Lunch", start: "12:30", end: "13:00" }], lateness: { late: 0, absent: 0 } },
    kitchen: { pending: 2, preparing: 5, completedToday: 118, avgPrepMins: 11.2, efficiencyPct: 94, wasteCost: 185, hygiene: { fridgeTempC: 3.1, freezerTempC: -18.4, openingLogged: true, closingLogged: false } },
    performance: { foodCostPct: 31, wastePct: 1.4, menuItems: 32, topDish: "Flame-grilled Beef Ribs" },
    payroll: { gross: 18500, paye: 4125, bpopf: 925, net: 13450, period: "2026-10" }
  },

  /* ------------------------ Kitchen / Back of house ------------------------ */
  {
    id: "st-103", businessId: "biz-restaurant", employeeId: "TFP-CHF-01",
    firstName: "Kabelo", surname: "Tau", preferredName: "",
    dob: "1990-11-09", age: 35, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "156789012",
    email: "kabelo.tau@thefoodplace.co.bw", contact: "26776789012", photo: "",
    emergencyContact: "26772789012", emergencyContactName: "Lerato Tau", emergencyContactRelation: "Sister",
    jobTitle: "Co-Head Chef (Sauté & Grill)", department: "Kitchen (Back of House)", roles: ["chef"],
    accessLevel: "manager", systemAccess: "Kitchen Display System (KDS) Lead",
    shift: "evening", employmentType: "full_time", startDate: "2022-09-01", status: "active",
    salaryAmount: 9500, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "Absa Bank Botswana", branch: "290267", account: "10542233987", payoutMethod: "Bank transfer" },
    responsibilities: ["Hot line", "Grill section", "Stock take", "Junior chef coaching"],
    attendance: { lastClockIn: "2026-10-11T14:55", lastClockOut: "2026-10-11T23:10", hours: { regular: 8, overtime: 0.3 }, breaks: [{ label: "Meal", start: "18:00", end: "18:30" }], lateness: { late: 1, absent: 0 } },
    kitchen: { pending: 3, preparing: 6, completedToday: 96, avgPrepMins: 13.4, efficiencyPct: 91, wasteCost: 140, hygiene: { fridgeTempC: 3.4, freezerTempC: -18.0, openingLogged: true, closingLogged: false } },
    performance: { platesPerHour: 14, topDish: "Peri-peri Chicken", foodCostPct: 32 },
    payroll: { gross: 9500, paye: 1650, bpopf: 475, net: 7375, period: "2026-10" }
  },
  {
    id: "st-104", businessId: "biz-restaurant", employeeId: "TFP-CHF-02",
    firstName: "Neo", surname: "Mogorosi", preferredName: "",
    dob: "1996-02-18", age: 30, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "256789012",
    email: "neo.mogorosi@thefoodplace.co.bw", contact: "26771890123", photo: "",
    emergencyContact: "26772890123", emergencyContactName: "Keneilwe Mogorosi", emergencyContactRelation: "Mother",
    jobTitle: "Sous Chef", department: "Kitchen (Back of House)", roles: ["chef"],
    accessLevel: "pos", systemAccess: "KDS Operator",
    shift: "morning", employmentType: "full_time", startDate: "2023-04-10", status: "active",
    salaryAmount: 7200, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "Stanbic Bank Botswana", branch: "064267", account: "9041233986", payoutMethod: "Bank transfer" },
    responsibilities: ["Prep", "Cold kitchen", "Sauce section", "Opening checklist"],
    attendance: { lastClockIn: "2026-10-11T06:52", lastClockOut: "2026-10-11T15:05", hours: { regular: 8, overtime: 0 }, breaks: [{ label: "Meal", start: "11:00", end: "11:30" }], lateness: { late: 0, absent: 0 } },
    kitchen: { pending: 1, preparing: 4, completedToday: 88, avgPrepMins: 12.8, efficiencyPct: 92, wasteCost: 95, hygiene: { fridgeTempC: 3.0, freezerTempC: -18.6, openingLogged: true, closingLogged: true } },
    performance: { platesPerHour: 12, topDish: "Breakfast Platter", foodCostPct: 30 },
    payroll: { gross: 7200, paye: 980, bpopf: 360, net: 5860, period: "2026-10" }
  },
  {
    id: "st-105", businessId: "biz-restaurant", employeeId: "TFP-CHF-03",
    firstName: "Thato", surname: "Dambe", preferredName: "",
    dob: "1999-05-30", age: 27, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "167890123",
    email: "thato.dambe@thefoodplace.co.bw", contact: "26772901234", photo: "",
    emergencyContact: "26773901234", emergencyContactName: "Masego Dambe", emergencyContactRelation: "Mother",
    jobTitle: "Line Cook / Pastry Chef", department: "Kitchen (Back of House)", roles: ["chef"],
    accessLevel: "pos", systemAccess: "KDS Operator",
    shift: "evening", employmentType: "full_time", startDate: "2024-02-15", status: "active",
    salaryAmount: 5800, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "Bank of Baroda Botswana", branch: "330267", account: "0887123456", payoutMethod: "Bank transfer" },
    responsibilities: ["Pizza station", "Desserts", "Prep lists", "Closing clean-down"],
    attendance: { lastClockIn: "2026-10-11T15:02", lastClockOut: "2026-10-11T23:05", hours: { regular: 8, overtime: 0 }, breaks: [{ label: "Meal", start: "19:00", end: "19:30" }], lateness: { late: 0, absent: 0 } },
    kitchen: { pending: 0, preparing: 3, completedToday: 74, avgPrepMins: 10.6, efficiencyPct: 95, wasteCost: 70, hygiene: { fridgeTempC: 3.2, freezerTempC: -18.2, openingLogged: true, closingLogged: false } },
    performance: { platesPerHour: 11, topDish: "Margherita Pizza", foodCostPct: 29 },
    payroll: { gross: 5800, paye: 640, bpopf: 290, net: 4870, period: "2026-10" }
  },

  /* ------------------------ Front of house — waiters ------------------------ */
  {
    id: "st-106", businessId: "biz-restaurant", employeeId: "TFP-WAT-01",
    firstName: "Tshepo", surname: "Setswalo", preferredName: "",
    dob: "1995-08-11", age: 31, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "178901234",
    email: "tshepo.setswalo@thefoodplace.co.bw", contact: "26773012345", photo: "",
    emergencyContact: "26774012345", emergencyContactName: "Boitumelo Setswalo", emergencyContactRelation: "Wife",
    jobTitle: "Senior Waiter", department: "Front of House", roles: ["server"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "morning", employmentType: "full_time", startDate: "2023-06-01", status: "active",
    salaryAmount: 1000, salaryPeriod: "week", hourlyRate: 48, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "73012345", payoutMethod: "Mobile money" },
    responsibilities: ["Table service", "Order taking", "Cash-ups", "Wine recommendations"],
    attendance: { lastClockIn: "2026-10-11T06:58", lastClockOut: "2026-10-11T15:10", hours: { regular: 8, overtime: 0.2 }, breaks: [{ label: "Break", start: "11:30", end: "12:00" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 320, card: 610, poolToKitchen: 93, net: 837, tipPctOfSales: 8.4, perShift: [{ date: "2026-10-10", cash: 150, card: 300 }, { date: "2026-10-11", cash: 170, card: 310 }] },
    performance: { salesDaily: 3900, avgOrderValue: 215, tablesTurned: 18, upsellRate: 16, voids: 1 },
    payroll: { gross: 1000, tips: 837, paye: 60, bpopf: 50, net: 1727, period: "2026-W41" }
  },
  {
    id: "st-107", businessId: "biz-restaurant", employeeId: "TFP-WAT-02",
    firstName: "Bame", surname: "Gaolathe", preferredName: "",
    dob: "1997-01-27", age: 29, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "267890123",
    email: "bame.gaolathe@thefoodplace.co.bw", contact: "26774123456", photo: "",
    emergencyContact: "26775123456", emergencyContactName: "Phenyo Gaolathe", emergencyContactRelation: "Brother",
    jobTitle: "Senior Waitress", department: "Front of House", roles: ["server"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "evening", employmentType: "full_time", startDate: "2023-02-20", status: "active",
    salaryAmount: 1050, salaryPeriod: "week", hourlyRate: 50, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "74123456", payoutMethod: "Mobile money" },
    responsibilities: ["Table service", "Reservations desk", "Upselling desserts", "Closing clean-down"],
    attendance: { lastClockIn: "2026-10-11T14:50", lastClockOut: "2026-10-11T23:15", hours: { regular: 8, overtime: 0.4 }, breaks: [{ label: "Break", start: "18:30", end: "19:00" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 280, card: 720, poolToKitchen: 100, net: 900, tipPctOfSales: 9.1, perShift: [{ date: "2026-10-10", cash: 130, card: 360 }, { date: "2026-10-11", cash: 150, card: 360 }] },
    performance: { salesDaily: 4200, avgOrderValue: 230, tablesTurned: 19, upsellRate: 21, voids: 0 },
    payroll: { gross: 1050, tips: 900, paye: 65, bpopf: 52, net: 1833, period: "2026-W41" }
  },
  {
    id: "st-108", businessId: "biz-restaurant", employeeId: "TFP-WAT-03",
    firstName: "Boitumelo", surname: "Moremi", preferredName: "Boitu",
    dob: "2002-03-05", age: 24, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "278901234",
    email: "boitu.moremi@thefoodplace.co.bw", contact: "26775234567", photo: "",
    emergencyContact: "26776234567", emergencyContactName: "Kefilwe Moremi", emergencyContactRelation: "Mother",
    jobTitle: "Senior Waitress", department: "Front of House", roles: ["server"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "evening", employmentType: "full_time", startDate: "2024-05-02", status: "active",
    salaryAmount: 900, salaryPeriod: "week", hourlyRate: 45, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "75234567", payoutMethod: "Mobile money" },
    responsibilities: ["Table service", "Dessert upsell", "Barista support", "Table resets"],
    attendance: { lastClockIn: "2026-10-11T14:48", lastClockOut: "2026-10-11T23:02", hours: { regular: 8, overtime: 0.2 }, breaks: [{ label: "Break", start: "18:00", end: "18:30" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 420, card: 850, poolToKitchen: 127, net: 1143, tipPctOfSales: 9.6, perShift: [{ date: "2026-10-10", cash: 200, card: 400 }, { date: "2026-10-11", cash: 220, card: 450 }] },
    performance: { salesDaily: 3400, avgOrderValue: 198, tablesTurned: 17, upsellRate: 18, voids: 0 },
    payroll: { gross: 900, tips: 1143, paye: 55, bpopf: 45, net: 1943, period: "2026-W41" }
  },
  {
    id: "st-109", businessId: "biz-restaurant", employeeId: "TFP-WAT-04",
    firstName: "Katlo", surname: "Makgosi", preferredName: "",
    dob: "2001-09-14", age: 25, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "289012345",
    email: "katlo.makgosi@thefoodplace.co.bw", contact: "26776345678", photo: "",
    emergencyContact: "26777345678", emergencyContactName: "Tumisang Makgosi", emergencyContactRelation: "Father",
    jobTitle: "Waitress", department: "Front of House", roles: ["server"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "evening", employmentType: "part_time", startDate: "2025-03-12", status: "active",
    salaryAmount: 780, salaryPeriod: "week", hourlyRate: 42, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "76345678", payoutMethod: "Mobile money" },
    responsibilities: ["Table service", "Takeaway orders", "Menu guidance"],
    attendance: { lastClockIn: "2026-10-11T15:05", lastClockOut: "2026-10-11T22:55", hours: { regular: 7.8, overtime: 0 }, breaks: [{ label: "Break", start: "18:30", end: "19:00" }], lateness: { late: 1, absent: 0 } },
    tips: { cash: 210, card: 480, poolToKitchen: 69, net: 621, tipPctOfSales: 8.8, perShift: [{ date: "2026-10-10", cash: 90, card: 220 }, { date: "2026-10-11", cash: 120, card: 260 }] },
    performance: { salesDaily: 2600, avgOrderValue: 175, tablesTurned: 14, upsellRate: 12, voids: 2 },
    payroll: { gross: 780, tips: 621, paye: 45, bpopf: 40, net: 1316, period: "2026-W41" }
  },
  {
    id: "st-110", businessId: "biz-restaurant", employeeId: "TFP-WAT-05",
    firstName: "Lorato", surname: "Khama", preferredName: "",
    dob: "2000-12-02", age: 25, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "290123456",
    email: "lorato.khama@thefoodplace.co.bw", contact: "26771456789", photo: "",
    emergencyContact: "26772456789", emergencyContactName: "Mpho Khama", emergencyContactRelation: "Aunt",
    jobTitle: "Waitress", department: "Front of House", roles: ["server", "housekeeping"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "split", employmentType: "part_time", startDate: "2025-08-01", status: "active",
    salaryAmount: 820, salaryPeriod: "week", hourlyRate: 43, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "71456789", payoutMethod: "Mobile money" },
    responsibilities: ["Weekend table service", "Reservation support", "Table resets"],
    attendance: { lastClockIn: "2026-10-11T10:00", lastClockOut: "2026-10-11T20:30", hours: { regular: 9, overtime: 1 }, breaks: [{ label: "Break", start: "14:00", end: "14:30" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 260, card: 540, poolToKitchen: 80, net: 720, tipPctOfSales: 8.2, perShift: [{ date: "2026-10-10", cash: 110, card: 260 }, { date: "2026-10-11", cash: 150, card: 280 }] },
    performance: { salesDaily: 3100, avgOrderValue: 190, tablesTurned: 16, upsellRate: 15, voids: 1 },
    payroll: { gross: 820, tips: 720, paye: 48, bpopf: 41, net: 1451, period: "2026-W41" }
  },
  {
    id: "st-111", businessId: "biz-restaurant", employeeId: "TFP-WAT-06",
    firstName: "Oneilwe", surname: "Modise", preferredName: "",
    dob: "1994-04-19", age: 32, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "189012345",
    email: "oneilwe.modise@thefoodplace.co.bw", contact: "26772567890", photo: "",
    emergencyContact: "26773567890", emergencyContactName: "Gorata Modise", emergencyContactRelation: "Wife",
    jobTitle: "Waiter", department: "Front of House", roles: ["server"],
    accessLevel: "pos", systemAccess: "POS Staff",
    shift: "evening", employmentType: "full_time", startDate: "2024-10-05", status: "active",
    salaryAmount: 880, salaryPeriod: "week", hourlyRate: 44, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "72567890", payoutMethod: "Mobile money" },
    responsibilities: ["Table service", "Stock of service ware", "Bar runner"],
    attendance: { lastClockIn: "2026-10-11T14:58", lastClockOut: "2026-10-11T23:00", hours: { regular: 8, overtime: 0 }, breaks: [{ label: "Break", start: "18:30", end: "19:00" }], lateness: { late: 0, absent: 1 } },
    tips: { cash: 240, card: 560, poolToKitchen: 80, net: 720, tipPctOfSales: 8.5, perShift: [{ date: "2026-10-10", cash: 100, card: 280 }, { date: "2026-10-11", cash: 140, card: 280 }] },
    performance: { salesDaily: 3000, avgOrderValue: 185, tablesTurned: 15, upsellRate: 14, voids: 0 },
    payroll: { gross: 880, tips: 720, paye: 52, bpopf: 44, net: 1504, period: "2026-W41" }
  },

  /* ------------------------------- Bar ------------------------------- */
  {
    id: "st-112", businessId: "biz-restaurant", employeeId: "TFP-BAR-01",
    firstName: "Bakang", surname: "Letsholo", preferredName: "",
    dob: "1992-06-08", age: 34, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "190123456",
    email: "bakang.letsholo@thefoodplace.co.bw", contact: "26773678901", photo: "",
    emergencyContact: "26774678901", emergencyContactName: "Keneilwe Letsholo", emergencyContactRelation: "Wife",
    jobTitle: "Lead Mixologist & Bar Manager", department: "Bar", roles: ["bartender", "cashier"],
    accessLevel: "manager", systemAccess: "Bar KDS & POS Staff",
    shift: "evening", employmentType: "full_time", startDate: "2022-11-15", status: "active",
    salaryAmount: 1100, salaryPeriod: "week", hourlyRate: 55, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "First National Bank Botswana", branch: "282267", account: "62015588210", payoutMethod: "Bank transfer" },
    responsibilities: ["Bar inventory", "Cocktail menu", "Stock control", "Barista training"],
    attendance: { lastClockIn: "2026-10-11T15:00", lastClockOut: "2026-10-11T23:20", hours: { regular: 8, overtime: 0.3 }, breaks: [{ label: "Break", start: "19:00", end: "19:30" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 500, card: 900, poolToKitchen: 140, net: 1260, tipPctOfSales: 10.2, perShift: [{ date: "2026-10-10", cash: 250, card: 450 }, { date: "2026-10-11", cash: 250, card: 450 }] },
    performance: { salesDaily: 5200, avgOrderValue: 320, cocktailsSold: 68, upsellRate: 24, voids: 0 },
    payroll: { gross: 1100, tips: 1260, paye: 70, bpopf: 55, net: 2235, period: "2026-W41" }
  },
  {
    id: "st-113", businessId: "biz-restaurant", employeeId: "TFP-BAR-02",
    firstName: "Kealeboga", surname: "Banda", preferredName: "Kiki",
    dob: "1998-10-23", age: 27, gender: "Female", nationality: "Zimbabwean", idType: "passport", idNumber: "ZW726154",
    email: "kiki.banda@thefoodplace.co.bw", contact: "26774789012", photo: "",
    emergencyContact: "263771234567", emergencyContactName: "Tendai Banda", emergencyContactRelation: "Brother",
    jobTitle: "Bartender", department: "Bar", roles: ["bartender", "cashier"],
    accessLevel: "pos", systemAccess: "Bar KDS & POS Staff",
    shift: "split", employmentType: "part_time", startDate: "2025-01-20", status: "active",
    salaryAmount: 850, salaryPeriod: "week", hourlyRate: 46, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "Work permit / non-citizen", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "74890123", payoutMethod: "Mobile money" },
    responsibilities: ["Bar service", "Cocktail prep", "Garnish prep", "Bar clean-down"],
    attendance: { lastClockIn: "2026-10-11T15:10", lastClockOut: "2026-10-11T23:05", hours: { regular: 7.9, overtime: 0 }, breaks: [{ label: "Break", start: "19:30", end: "20:00" }], lateness: { late: 0, absent: 0 } },
    tips: { cash: 300, card: 640, poolToKitchen: 94, net: 846, tipPctOfSales: 9.4, perShift: [{ date: "2026-10-10", cash: 140, card: 300 }, { date: "2026-10-11", cash: 160, card: 340 }] },
    performance: { salesDaily: 3400, avgOrderValue: 260, cocktailsSold: 41, upsellRate: 19, voids: 1 },
    payroll: { gross: 850, tips: 846, paye: 50, bpopf: 42, net: 1604, period: "2026-W41" }
  },

  /* ---------------------------- Logistics ---------------------------- */
  {
    id: "st-114", businessId: "biz-restaurant", employeeId: "TFP-DRV-01",
    firstName: "Tumelo", surname: "Pitso", preferredName: "",
    dob: "1997-03-17", age: 29, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "101234567",
    email: "tumelo.pitso@thefoodplace.co.bw", contact: "26775890123", photo: "",
    emergencyContact: "26776890123", emergencyContactName: "Dineo Pitso", emergencyContactRelation: "Sister",
    jobTitle: "Senior Delivery Driver", department: "Logistics", roles: ["driver"],
    accessLevel: "driver", systemAccess: "Driver Mobile App",
    shift: "evening", employmentType: "full_time", startDate: "2024-01-08", status: "active",
    salaryAmount: 3200, salaryPeriod: "month", perDelivery: 15, payFrequency: "monthly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "75890123", payoutMethod: "Mobile money" },
    vehicle: { type: "Motorbike", plate: "B 123 ABC" },
    responsibilities: ["Scheduled deliveries", "Vehicle checks", "Cash on delivery reconciliation"],
    attendance: { lastClockIn: "2026-10-11T14:55", lastClockOut: "2026-10-11T23:00", hours: { regular: 8, overtime: 0.1 }, breaks: [{ label: "Break", start: "18:00", end: "18:20" }], lateness: { late: 0, absent: 0 } },
    delivery: { active: 2, completedToday: 14, avgMins: 22, kmWeek: 186, rating: 4.9, fuelAllowance: 350 },
    performance: { deliveriesWeek: 76, onTimePct: 96, failedDeliveries: 1, tipsWeek: 210 },
    payroll: { gross: 3410, paye: 300, bpopf: 0, net: 3110, period: "2026-10" }
  },
  {
    id: "st-115", businessId: "biz-restaurant", employeeId: "TFP-DRV-02",
    firstName: "Gofaone", surname: "Masilo", preferredName: "",
    dob: "1999-07-28", age: 27, gender: "Male", nationality: "Zimbabwean", idType: "passport", idNumber: "ZN483920",
    email: "gofaone.masilo@thefoodplace.co.bw", contact: "26776901234", photo: "",
    emergencyContact: "263772345678", emergencyContactName: "Chipo Masilo", emergencyContactRelation: "Mother",
    jobTitle: "Delivery Driver", department: "Logistics", roles: ["driver"],
    accessLevel: "driver", systemAccess: "Driver Mobile App",
    shift: "evening", employmentType: "full_time", startDate: "2025-05-19", status: "active",
    salaryAmount: 2900, salaryPeriod: "month", perDelivery: 15, payFrequency: "monthly", overtimeRate: 1.5,
    payeStatus: "Work permit / non-citizen", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "76901234", payoutMethod: "Mobile money" },
    vehicle: { type: "Light Hatchback", plate: "B 456 DEF" },
    responsibilities: ["Scheduled deliveries", "Fuel logs", "Vehicle cleanliness"],
    attendance: { lastClockIn: "2026-10-11T15:00", lastClockOut: "2026-10-11T23:05", hours: { regular: 8, overtime: 0.1 }, breaks: [{ label: "Break", start: "18:30", end: "18:50" }], lateness: { late: 1, absent: 0 } },
    delivery: { active: 1, completedToday: 11, avgMins: 25, kmWeek: 152, rating: 4.7, fuelAllowance: 300 },
    performance: { deliveriesWeek: 61, onTimePct: 93, failedDeliveries: 2, tipsWeek: 150 },
    payroll: { gross: 3065, paye: 250, bpopf: 0, net: 2815, period: "2026-10" }
  },

  /* ---------------------------- Security ---------------------------- */
  {
    id: "st-116", businessId: "biz-restaurant", employeeId: "TFP-SEC-01",
    firstName: "Oteng", surname: "Baloyi", preferredName: "",
    dob: "1989-02-11", age: 37, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "112345678",
    email: "oteng.baloyi@thefoodplace.co.bw", contact: "26771012345", photo: "",
    emergencyContact: "26772012345", emergencyContactName: "Neo Baloyi", emergencyContactRelation: "Wife",
    jobTitle: "Head of Security / Entrance Guard", department: "Security & Safety", roles: ["security", "housekeeping"],
    accessLevel: "pos", systemAccess: "Attendance & Incident Log Access",
    shift: "evening", employmentType: "full_time", startDate: "2023-01-10", status: "active",
    salaryAmount: 1200, salaryPeriod: "week", hourlyRate: 52, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Stanbic Bank Botswana", branch: "064267", account: "9042001122", payoutMethod: "Bank transfer" },
    responsibilities: ["Access control", "Incident logging", "Contractor escorts", "Closing lock-up"],
    attendance: { lastClockIn: "2026-10-11T15:00", lastClockOut: "2026-10-11T23:30", hours: { regular: 8.5, overtime: 0 }, breaks: [{ label: "Break", start: "19:00", end: "19:30" }], lateness: { late: 0, absent: 0 } },
    security: { incidents: 2, visitorLog: [{ name: "Coca-Cola delivery", time: "16:20", purpose: "Restock" }, { name: "BOC gas", time: "18:05", purpose: "Cylinder exchange" }] },
    performance: { patrolRounds: 8, incidentsWeek: 3, contractorChecks: 11 },
    payroll: { gross: 1200, paye: 75, bpopf: 0, net: 1125, period: "2026-W41" }
  },
  {
    id: "st-117", businessId: "biz-restaurant", employeeId: "TFP-SEC-02",
    firstName: "Phenyo", surname: "Ntwane", preferredName: "",
    dob: "1993-09-06", age: 33, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "123456789",
    email: "phenyo.ntwane@thefoodplace.co.bw", contact: "26772123456", photo: "",
    emergencyContact: "26773123456", emergencyContactName: "Kago Ntwane", emergencyContactRelation: "Brother",
    jobTitle: "Night Security Guard", department: "Security & Safety", roles: ["security"],
    accessLevel: "pos", systemAccess: "Incident Log Access",
    shift: "night", employmentType: "full_time", startDate: "2024-07-01", status: "active",
    salaryAmount: 950, salaryPeriod: "week", hourlyRate: 45, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "72123456", payoutMethod: "Mobile money" },
    responsibilities: ["Night patrols", "Alarm checks", "Incident logging"],
    attendance: { lastClockIn: "2026-10-11T23:00", lastClockOut: "2026-10-11T07:00", hours: { regular: 8, overtime: 0 }, breaks: [{ label: "Break", start: "02:00", end: "02:30" }], lateness: { late: 0, absent: 0 } },
    security: { incidents: 0, visitorLog: [] },
    performance: { patrolRounds: 6, incidentsWeek: 0, contractorChecks: 0 },
    payroll: { gross: 950, paye: 60, bpopf: 0, net: 890, period: "2026-W41" }
  },

  /* ---------------------- Added operational roles ---------------------- */
  {
    id: "st-118", businessId: "biz-restaurant", employeeId: "TFP-FLR-01",
    firstName: "Naledi", surname: "Motswagole", preferredName: "Nal",
    dob: "1994-08-30", age: 31, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "201234567",
    email: "naledi.motswagole@thefoodplace.co.bw", contact: "26773234567", photo: "",
    emergencyContact: "26774234567", emergencyContactName: "Tebogo Motswagole", emergencyContactRelation: "Father",
    jobTitle: "Floor Manager / Maître D'", department: "Front of House", roles: ["floor_manager", "manager"],
    accessLevel: "manager", systemAccess: "Manager",
    shift: "split", employmentType: "full_time", startDate: "2023-09-11", status: "active",
    salaryAmount: 6500, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 0,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "Absa Bank Botswana", branch: "290267", account: "10543321098", payoutMethod: "Bank transfer" },
    responsibilities: ["Table assignments", "Waiter rota", "Guest complaints", "Front-of-house standards"],
    attendance: { lastClockIn: "2026-10-11T11:00", lastClockOut: "2026-10-11T22:30", hours: { regular: 10, overtime: 1 }, breaks: [{ label: "Lunch", start: "14:00", end: "14:45" }], lateness: { late: 0, absent: 0 } },
    performance: { coversToday: 142, avgTableMins: 52, complaints: 1, waitersOnShift: 6 },
    payroll: { gross: 6500, paye: 820, bpopf: 325, net: 5355, period: "2026-10" }
  },
  {
    id: "st-119", businessId: "biz-restaurant", employeeId: "TFP-CLN-01",
    firstName: "Mpho", surname: "Kgosidintsi", preferredName: "",
    dob: "1996-12-21", age: 29, gender: "Male", nationality: "Motswana", idType: "omang", idNumber: "134567890",
    email: "mpho.kgosidintsi@thefoodplace.co.bw", contact: "26774345678", photo: "",
    emergencyContact: "26775345678", emergencyContactName: "Lesego Kgosidintsi", emergencyContactRelation: "Wife",
    jobTitle: "Kitchen Porter", department: "Back of House", roles: ["housekeeping"],
    accessLevel: "pos", systemAccess: "Attendance Only",
    shift: "evening", employmentType: "full_time", startDate: "2024-11-04", status: "active",
    salaryAmount: 650, salaryPeriod: "week", hourlyRate: 40, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "MyZaka", branch: "", account: "74345678", payoutMethod: "Mobile money" },
    responsibilities: ["Dishwashing", "Kitchen turnover", "Cleaning supplies stock"],
    attendance: { lastClockIn: "2026-10-11T15:00", lastClockOut: "2026-10-11T23:15", hours: { regular: 8, overtime: 0.2 }, breaks: [{ label: "Break", start: "19:00", end: "19:30" }], lateness: { late: 0, absent: 0 } },
    performance: { kitchensCleaned: 2, supplyTurns: 3 },
    payroll: { gross: 650, paye: 40, bpopf: 0, net: 610, period: "2026-W41" }
  },
  {
    id: "st-120", businessId: "biz-restaurant", employeeId: "TFP-CLN-02",
    firstName: "Goitseone", surname: "Rantsho", preferredName: "Goitse",
    dob: "1998-05-16", age: 28, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "212345678",
    email: "goitseone.rantsho@thefoodplace.co.bw", contact: "26775456789", photo: "",
    emergencyContact: "26776456789", emergencyContactName: "Tshepo Rantsho", emergencyContactRelation: "Brother",
    jobTitle: "Cleaner", department: "Back of House", roles: ["housekeeping"],
    accessLevel: "pos", systemAccess: "Attendance Only",
    shift: "morning", employmentType: "part_time", startDate: "2025-06-09", status: "active",
    salaryAmount: 600, salaryPeriod: "week", hourlyRate: 38, payFrequency: "weekly", overtimeRate: 1.5,
    payeStatus: "PAYE registered", pension: "None",
    bank: { name: "Orange Money", branch: "", account: "75456789", payoutMethod: "Mobile money" },
    responsibilities: ["Front-of-house cleaning", "Restroom checks", "Deep clean rotation"],
    attendance: { lastClockIn: "2026-10-11T07:00", lastClockOut: "2026-10-11T13:30", hours: { regular: 6.5, overtime: 0 }, breaks: [{ label: "Break", start: "10:00", end: "10:20" }], lateness: { late: 0, absent: 0 } },
    performance: { areasCleaned: 5, checksLogged: 4 },
    payroll: { gross: 600, paye: 36, bpopf: 0, net: 564, period: "2026-W41" }
  },
  {
    id: "st-121", businessId: "biz-restaurant", employeeId: "TFP-ACC-01",
    firstName: "Boineelo", surname: "Kgari", preferredName: "Boi",
    dob: "1991-01-25", age: 35, gender: "Female", nationality: "Motswana", idType: "omang", idNumber: "223456789",
    email: "boineelo.kgari@thefoodplace.co.bw", contact: "26776567890", photo: "",
    emergencyContact: "26777567890", emergencyContactName: "Kabelo Kgari", emergencyContactRelation: "Husband",
    jobTitle: "Accountant / Bookkeeper", department: "Management", roles: ["accountant", "admin"],
    accessLevel: "admin", systemAccess: "Finance Admin",
    shift: "morning", employmentType: "full_time", startDate: "2023-03-01", status: "active",
    salaryAmount: 8000, salaryPeriod: "month", payFrequency: "monthly", overtimeRate: 0,
    payeStatus: "PAYE registered", pension: "BPOPF",
    bank: { name: "First National Bank Botswana", branch: "282267", account: "62016677432", payoutMethod: "Bank transfer" },
    responsibilities: ["Payroll", "Vendor invoices", "BURS tax filings", "Reconciliations"],
    attendance: { lastClockIn: "2026-10-11T08:00", lastClockOut: "2026-10-11T16:30", hours: { regular: 8, overtime: 0 }, breaks: [{ label: "Lunch", start: "13:00", end: "13:45" }], lateness: { late: 0, absent: 0 } },
    performance: { invoicesProcessed: 24, payeFiled: true, bpopfFiled: true, payrollRun: "2026-10-25" },
    payroll: { gross: 8000, paye: 1150, bpopf: 400, net: 6450, period: "2026-10" }
  }
];

/* ---- orders.js ---- */
/* The Food Place — demo order ledger (manager store "orders" collection). */
window.EATOUTS_DEMO = window.EATOUTS_DEMO || {};
window.EATOUTS_DEMO.orders = [
  { id: "EO-2001", businessId: "biz-restaurant", customer: "Kagiso Sithole", items: ["The Big G Burger", "Cappuccino Double"], total: 160, status: "delivered", created: "2026-10-10 07:12", delivery: "Delivery" },
  { id: "EO-2002", businessId: "biz-restaurant", customer: "Naledi Phiri", items: ["Smashed Avo on Toast x2", "Peanut Butter Tower"], total: 170, status: "delivered", created: "2026-10-10 07:40", delivery: "Delivery" },
  { id: "EO-2003", businessId: "biz-restaurant", customer: "Thabo Mokoena", items: ["TYG Club", "Chips"], total: 130, status: "delivered", created: "2026-10-10 08:05", delivery: "Pickup" },
  { id: "EO-2004", businessId: "biz-restaurant", customer: "Masego Dlamini", items: ["Mediterranean Chicken Melt", "Americano Double"], total: 170, status: "delivered", created: "2026-10-10 08:31", delivery: "Delivery" },
  { id: "EO-2005", businessId: "biz-restaurant", customer: "Boitumelo Nkosi", items: ["TYG Taco Bowl Chicken", "Berry Tall"], total: 160, status: "delivered", created: "2026-10-10 09:02", delivery: "Delivery" },
  { id: "EO-2006", businessId: "biz-restaurant", customer: "Onalenna Radebe", items: ["Rump 200g", "Side Salad Bowl"], total: 190, status: "delivered", created: "2026-10-10 09:47", delivery: "Delivery" },
  { id: "EO-2007", businessId: "biz-restaurant", customer: "Neo Dube", items: ["Chicken Salad", "Mazoe Juice"], total: 113, status: "delivered", created: "2026-10-10 10:15", delivery: "Pickup" },
  { id: "EO-2008", businessId: "biz-restaurant", customer: "Keitumetse Motsumi", items: ["The Giraffe Tower DBL Cheese", "Hot Honey Lemon"], total: 114, status: "delivered", created: "2026-10-10 10:38", delivery: "Delivery" },
  { id: "EO-2009", businessId: "biz-restaurant", customer: "Lorato Mthembu", items: ["Fluffy Pancake Stack x2", "Latte Double"], total: 136, status: "delivered", created: "2026-10-10 11:05", delivery: "Pickup" },
  { id: "EO-2010", businessId: "biz-restaurant", customer: "Tshepo Masuku", items: ["TYG Noodles Beef", "Kimchi"], total: 120, status: "delivered", created: "2026-10-10 11:29", delivery: "Delivery" },
  { id: "EO-2011", businessId: "biz-restaurant", customer: "Amantle Sechele", items: ["Grilled Ribeye", "Chips"], total: 270, status: "delivered", created: "2026-10-10 12:01", delivery: "Delivery" },
  { id: "EO-2012", businessId: "biz-restaurant", customer: "Olebogeng Sibanda", items: ["Beef Fillet & Caramelised Onion", "Hot Chocolate Double"], total: 150, status: "delivered", created: "2026-10-10 12:33", delivery: "Delivery" },
  { id: "EO-2013", businessId: "biz-restaurant", customer: "Lesego Nyathi", items: ["Tuna Mayo Mozzarella", "Mint & Lemon Frozen Crusher"], total: 135, status: "delivered", created: "2026-10-10 13:10", delivery: "Pickup" },
  { id: "EO-2014", businessId: "biz-restaurant", customer: "Tumelo Ncube", items: ["DBL Breakfast Tower Burger", "Cappuccino Grande"], total: 152, status: "delivered", created: "2026-10-10 13:44", delivery: "Delivery" },
  { id: "EO-2015", businessId: "biz-restaurant", customer: "Dineo Tshiamo", items: ["TYG Tacos Beef Seswaa", "Loaded Nachos Plain"], total: 190, status: "delivered", created: "2026-10-10 14:02", delivery: "Delivery" },
  { id: "EO-2016", businessId: "biz-restaurant", customer: "Keneilwe Motswana", items: ["Tuscan Fettuccine Chicken Pasta", "Water"], total: 150, status: "cancelled", created: "2026-10-10 14:26", delivery: "Delivery" },
  { id: "EO-2017", businessId: "biz-restaurant", customer: "Phenyo Mokoena", items: ["TYG SGL Cheese Tower", "Kiddies Milkshake"], total: 110, status: "delivered", created: "2026-10-10 15:03", delivery: "Pickup" },
  { id: "EO-2018", businessId: "biz-restaurant", customer: "Bontle Phiri", items: ["Classic Steak & Eggs", "Americano Grande"], total: 142, status: "delivered", created: "2026-10-10 15:41", delivery: "Delivery" },
  { id: "EO-2019", businessId: "biz-restaurant", customer: "Kefilwe Mahlangu", items: ["Shroom Melt", "Rock Shandy"], total: 125, status: "delivered", created: "2026-10-11 07:22", delivery: "Delivery" },
  { id: "EO-2020", businessId: "biz-restaurant", customer: "Tapiwa Shumba", items: ["Bacon & Cheese Omelette", "Hot Honey Lemon"], total: 109, status: "delivered", created: "2026-10-11 07:58", delivery: "Pickup" },
  { id: "EO-2021", businessId: "biz-restaurant", customer: "Tendai Molefe", items: ["The Big G Burger", "Loaded Nachos Beef"], total: 245, status: "delivered", created: "2026-10-11 08:34", delivery: "Delivery" },
  { id: "EO-2022", businessId: "biz-restaurant", customer: "Rudo Kgosi", items: ["Chicken Mayo", "Pesto & Avo Mozzarella", "Chai Latte"], total: 175, status: "delivered", created: "2026-10-11 09:11", delivery: "Delivery" },
  { id: "EO-2023", businessId: "biz-restaurant", customer: "Tinashe Molebatsi", items: ["TYG Taco Bowl Beef Sirloin", "Kimchi"], total: 135, status: "delivered", created: "2026-10-11 09:49", delivery: "Pickup" },
  { id: "EO-2024", businessId: "biz-restaurant", customer: "Nyasha Ndlovu", items: ["Chicken Burger", "Bacon & Avocado"], total: 165, status: "delivered", created: "2026-10-11 10:27", delivery: "Delivery" },
  { id: "EO-2025", businessId: "biz-restaurant", customer: "Farai Moyo", items: ["Rump 300g", "Berry Tall"], total: 260, status: "delivered", created: "2026-10-11 11:14", delivery: "Delivery" },
  { id: "EO-2026", businessId: "biz-restaurant", customer: "Tatenda Chitate", items: ["Eggcellent Avocado", "Iced Latte Double"], total: 100, status: "delivered", created: "2026-10-11 11:52", delivery: "Pickup" },
  { id: "EO-2027", businessId: "biz-restaurant", customer: "Chipo Mabena", items: ["TYG Breakfast", "Cappuccino Double"], total: 115, status: "delivered", created: "2026-10-11 12:20", delivery: "Delivery" },
  { id: "EO-2028", businessId: "biz-restaurant", customer: "Rutendo Dlamini", items: ["TYG Taco Bowl Lean Beef Mince", "Peanut Butter Tower"], total: 160, status: "delivered", created: "2026-10-11 12:55", delivery: "Delivery" },
  { id: "EO-2029", businessId: "biz-restaurant", customer: "Blessing Mosweu", items: ["Salami Pesto & Mozzarella", "Malawi Shandy"], total: 145, status: "delivered", created: "2026-10-11 13:31", delivery: "Pickup" },
  { id: "EO-2030", businessId: "biz-restaurant", customer: "Lerato Nkosi", items: ["Plain Jane", "Chicken Salad"], total: 135, status: "dispatched", created: "2026-10-12 12:12", delivery: "Delivery" },
  { id: "EO-2031", businessId: "biz-restaurant", customer: "Lindelwa Radebe", items: ["Beef Salad", "Hot Chocolate Grande"], total: 155, status: "ready", created: "2026-10-12 12:25", delivery: "Delivery" },
  { id: "EO-2032", businessId: "biz-restaurant", customer: "Sipho Dube", items: ["TYG Tacos Chicken", "Chips x2"], total: 125, status: "preparing", created: "2026-10-12 12:38", delivery: "Delivery" },
  { id: "EO-2033", businessId: "biz-restaurant", customer: "Zanele Motsumi", items: ["Chicken Burger", "Strawberry Matcha Iced Latte"], total: 135, status: "accepted", created: "2026-10-12 12:47", delivery: "Delivery" },
  { id: "EO-2034", businessId: "biz-restaurant", customer: "Sibusiso Mthembu", items: ["Classic Breakfast", "Breakfast Sandwich", "Mazoe Juice"], total: 133, status: "new", created: "2026-10-12 12:58", delivery: "Delivery" },
  { id: "EO-2035", businessId: "biz-restaurant", customer: "Nomsa Masuku", items: ["TYG Taco Bowl Chicken", "Grilled Cheese"], total: 145, status: "new", created: "2026-10-12 13:04", delivery: "Pickup" },
  { id: "EO-2036", businessId: "biz-restaurant", customer: "Ayanda Sechele", items: ["The Morning Moo", "Dirty Chai Latte"], total: 120, status: "delivered", created: "2026-10-09 13:18", delivery: "Delivery" },
  { id: "EO-2037", businessId: "biz-restaurant", customer: "Lunga Sibanda", items: ["Bacon Egg & Cheese Sandwich", "Red Cappuccino Double"], total: 120, status: "delivered", created: "2026-10-09 13:52", delivery: "Pickup" },
  { id: "EO-2038", businessId: "biz-restaurant", customer: "Thandiwe Nyathi", items: ["TYG Noodles Chicken", "Loaded Nachos Plain"], total: 180, status: "delivered", created: "2026-10-09 14:35", delivery: "Delivery" },
  { id: "EO-2039", businessId: "biz-restaurant", customer: "Nokuthula Ncube", items: ["Fluffy Pancake Stack", "Bacon & Avocado"], total: 135, status: "delivered", created: "2026-10-09 15:08", delivery: "Delivery" },
  { id: "EO-2040", businessId: "biz-restaurant", customer: "Mpho Tshiamo", items: ["TYG SGL Cheese Tower", "Mocha Double"], total: 120, status: "cancelled", created: "2026-10-09 15:46", delivery: "Delivery" }
];

/* ---- deliveries.js ---- */
/* The Food Place — demo delivery dispatch records (manager store "deliveries" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).deliveries = [
  { id: "DL-2001", businessId: "biz-restaurant", orderId: "EO-2001", recipient: "Kagiso Sithole", town: "Gaborone", area: "Kgale View", window: "07:00–08:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2002", businessId: "biz-restaurant", orderId: "EO-2002", recipient: "Naledi Phiri", town: "Gaborone", area: "Gaborone West Ext 2", window: "07:00–08:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2003", businessId: "biz-restaurant", orderId: "EO-2004", recipient: "Masego Dlamini", town: "Gaborone", area: "Gaborone West Ext 4", window: "08:00–09:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2004", businessId: "biz-restaurant", orderId: "EO-2005", recipient: "Boitumelo Nkosi", town: "Phakalane", area: "Phakalane Ext 97", window: "08:00–09:00", driver: "Dumisani Ncube", fee: 30, mode: "scheduled", status: "delivered" },
  { id: "DL-2005", businessId: "biz-restaurant", orderId: "EO-2006", recipient: "Onalenna Radebe", town: "Tlokweng", area: "Tlokweng Village", window: "08:00–09:00", driver: "Dumisani Ncube", fee: 30, mode: "scheduled", status: "delivered" },
  { id: "DL-2006", businessId: "biz-restaurant", orderId: "EO-2008", recipient: "Keitumetse Motsumi", town: "Gaborone", area: "Block 3 Ext 32", window: "09:00–10:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2007", businessId: "biz-restaurant", orderId: "EO-2010", recipient: "Tshepo Masuku", town: "Gaborone", area: "Block 6 Ext 39", window: "10:00–11:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2008", businessId: "biz-restaurant", orderId: "EO-2011", recipient: "Amantle Sechele", town: "Mmopane", area: "Mmopane Village", window: "10:00–11:00", driver: "Dumisani Ncube", fee: 30, mode: "scheduled", status: "delivered" },
  { id: "DL-2009", businessId: "biz-restaurant", orderId: "EO-2012", recipient: "Olebogeng Sibanda", town: "Gaborone", area: "Ext 1 (Mmaraka)", window: "12:00–13:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2010", businessId: "biz-restaurant", orderId: "EO-2014", recipient: "Tumelo Ncube", town: "Gaborone", area: "Ext 4 (Dilalelo)", window: "12:00–13:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2011", businessId: "biz-restaurant", orderId: "EO-2015", recipient: "Dineo Tshiamo", town: "Gaborone", area: "Broadhurst Ext 16", window: "14:00–15:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2012", businessId: "biz-restaurant", orderId: "EO-2018", recipient: "Bontle Phiri", town: "Gaborone", area: "Broadhurst Ext 17", window: "15:00–16:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2013", businessId: "biz-restaurant", orderId: "EO-2019", recipient: "Kefilwe Mahlangu", town: "Gaborone", area: "Broadhurst Ext 18", window: "07:00–08:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2014", businessId: "biz-restaurant", orderId: "EO-2021", recipient: "Tendai Molefe", town: "Gaborone", area: "Ginja Ext 21", window: "08:00–09:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2015", businessId: "biz-restaurant", orderId: "EO-2023", recipient: "Tinashe Molebatsi", town: "Gaborone", area: "Ginja Ext 29", window: "09:00–10:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2016", businessId: "biz-restaurant", orderId: "EO-2024", recipient: "Nyasha Ndlovu", town: "Mogoditshane", area: "Diagane", window: "10:00–11:00", driver: "Dumisani Ncube", fee: 30, mode: "scheduled", status: "delivered" },
  { id: "DL-2017", businessId: "biz-restaurant", orderId: "EO-2025", recipient: "Farai Moyo", town: "Mmopane", area: "Marapo-a-Thutlwa", window: "11:00–12:00", driver: "Dumisani Ncube", fee: 30, mode: "scheduled", status: "delivered" },
  { id: "DL-2018", businessId: "biz-restaurant", orderId: "EO-2027", recipient: "Chipo Mabena", town: "Gaborone", area: "Village Ext 15", window: "12:00–13:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "delivered" },
  { id: "DL-2019", businessId: "biz-restaurant", orderId: "EO-2030", recipient: "Lerato Nkosi", town: "Gaborone", area: "Bontleng Ext 8", window: "12:00–13:00", driver: "Thabo Molefe", fee: 15, mode: "scheduled", status: "dispatched" },
  { id: "DL-2020", businessId: "biz-restaurant", orderId: "EO-2031", recipient: "Lindelwa Radebe", town: "Gaborone", area: "Gaborone West Ext 5", window: "12:00–13:00", driver: "", fee: 15, mode: "scheduled", status: "new" }
];

/* ---- reservations.js ---- */
/* The Food Place — demo reservations (manager store "reservations" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).reservations = [
  { id: "RS-101", businessId: "biz-restaurant", guest: "Kago & 3", date: "2026-10-12", time: "19:00", guests: 4, deposit: 200, status: "confirmed" },
  { id: "RS-102", businessId: "biz-restaurant", guest: "Mpho", date: "2026-10-12", time: "18:30", guests: 2, deposit: 0, status: "pending" },
  { id: "RS-103", businessId: "biz-restaurant", guest: "Lorato (birthday)", date: "2026-10-13", time: "20:00", guests: 10, deposit: 500, status: "confirmed" },
  { id: "RS-104", businessId: "biz-restaurant", guest: "Rudo Kgosi", date: "2026-10-14", time: "13:00", guests: 6, deposit: 150, status: "confirmed" },
  { id: "RS-105", businessId: "biz-restaurant", guest: "Team dinner — Tinashe", date: "2026-10-15", time: "19:30", guests: 8, deposit: 300, status: "pending" },
  { id: "RS-106", businessId: "biz-restaurant", guest: "Naledi & family", date: "2026-10-17", time: "12:30", guests: 5, deposit: 0, status: "pending" },
  { id: "RS-107", businessId: "biz-restaurant", guest: "Stakeholders lunch", date: "2026-10-18", time: "12:00", guests: 12, deposit: 600, status: "confirmed" },
  { id: "RS-108", businessId: "biz-restaurant", guest: "Boitumelo", date: "2026-10-11", time: "19:00", guests: 3, deposit: 0, status: "cancelled" }
];

/* ---- reviews.js ---- */
/* The Food Place — demo reviews (manager store "reviews" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).reviews = [
  { id: "RV-101", businessId: "biz-restaurant", customer: "Lebo", stars: 5, text: "Great service and the best cappuccino in the CBD.", date: "2026-10-10", reply: "Thank you, Lebo!" },
  { id: "RV-102", businessId: "biz-restaurant", customer: "Tumisang", stars: 4, text: "Food was good; delivery was a little late.", date: "2026-10-09", reply: "We are improving delivery times." },
  { id: "RV-103", businessId: "biz-restaurant", customer: "Kagiso", stars: 5, text: "The Big G Burger is unbeatable. Portions are generous.", date: "2026-10-08", reply: "" },
  { id: "RV-104", businessId: "biz-restaurant", customer: "Naledi", stars: 5, text: "Breakfast is served quickly and the staff are friendly.", date: "2026-10-07", reply: "See you again soon!" },
  { id: "RV-105", businessId: "biz-restaurant", customer: "Onalenna", stars: 3, text: "Nice vibe but the terrace was full on Saturday.", date: "2026-10-06", reply: "" },
  { id: "RV-106", businessId: "biz-restaurant", customer: "Thabo M.", stars: 4, text: "Good grills. Rump was cooked exactly medium-rare.", date: "2026-10-05", reply: "" },
  { id: "RV-107", businessId: "biz-restaurant", customer: "Amantle", stars: 5, text: "The ribeye and chips hit the spot. Will order again.", date: "2026-10-04", reply: "Much appreciated!" },
  { id: "RV-108", businessId: "biz-restaurant", customer: "Neo", stars: 5, text: "Vegetarian options are thoughtful, not an afterthought.", date: "2026-10-03", reply: "" },
  { id: "RV-109", businessId: "biz-restaurant", customer: "Masego", stars: 4, text: "Reliable weekday lunch spot. Coffee is consistent.", date: "2026-10-02", reply: "" },
  { id: "RV-110", businessId: "biz-restaurant", customer: "Boitumelo", stars: 2, text: "Order arrived cold during the evening rush.", date: "2026-10-01", reply: "Apologies — we have added a warmer to the delivery bags." },
  { id: "RV-111", businessId: "biz-restaurant", customer: "Lesego", stars: 5, text: "Booked a table for ten and everything ran on time.", date: "2026-09-30", reply: "Thank you, Lesego." },
  { id: "RV-112", businessId: "biz-restaurant", customer: "Dineo", stars: 5, text: "Cocktails and mocktails are both worth it.", date: "2026-09-29", reply: "" },
  { id: "RV-113", businessId: "biz-restaurant", customer: "Tumelo", stars: 4, text: "Pizza is great value on Wednesdays.", date: "2026-09-28", reply: "" },
  { id: "RV-114", businessId: "biz-restaurant", customer: "Bontle", stars: 5, text: "Lovely Sunday jazz and the kids were entertained.", date: "2026-09-27", reply: "Glad the family enjoyed it!" },
  { id: "RV-115", businessId: "biz-restaurant", customer: "Kefilwe", stars: 3, text: "Food good, but parking was hard to find at noon.", date: "2026-09-26", reply: "" }
];

/* ---- invoices.js ---- */
/* The Food Place — demo invoices (manager store "invoices" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).invoices = [
  { id: "INV-201", number: "EO-2026-0201", businessId: "biz-restaurant", date: "2026-09-01", amount: 300, status: "paid", plan: "growth" },
  { id: "INV-202", number: "EO-2026-0202", businessId: "biz-restaurant", date: "2026-08-01", amount: 300, status: "paid", plan: "growth" },
  { id: "INV-203", number: "EO-2026-0203", businessId: "biz-restaurant", date: "2026-07-01", amount: 300, status: "paid", plan: "growth" },
  { id: "INV-204", number: "EO-2026-0204", businessId: "biz-restaurant", date: "2026-06-01", amount: 300, status: "paid", plan: "growth" },
  { id: "INV-205", number: "EO-2026-0205", businessId: "biz-restaurant", date: "2026-10-01", amount: 300, status: "unpaid", plan: "growth" },
  { id: "INV-206", number: "EO-2026-0001", businessId: "biz-restaurant", date: "2025-03-01", amount: 300, status: "paid", plan: "setup" }
];

/* ---- feedback.js ---- */
/* The Food Place — demo feedback tickets (manager store "feedback" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).feedback = [
  { id: "FB-101", userId: "u-c-1", whatsapp: "26772000301", subject: "Delivery question", message: "Can I schedule tomorrow's breakfast delivery for 07:30?", status: "open", created: "2026-10-12T09:10:00+02:00", assignedTo: "Kabelo Motsamai" },
  { id: "FB-102", userId: "u-c-3", whatsapp: "26772000303", subject: "Wrong item", message: "I ordered a beef taco bowl but received chicken.", status: "open", created: "2026-10-11T18:42:00+02:00", assignedTo: "" },
  { id: "FB-103", userId: "u-c-5", whatsapp: "26772000305", subject: "Great service", message: "Just wanted to say the terrace staff were excellent last Friday.", status: "resolved", created: "2026-10-10T14:05:00+02:00", assignedTo: "Lesego Nyathi" },
  { id: "FB-104", userId: "u-c-2", whatsapp: "26772000302", subject: "Menu update", message: "Please add a gluten-free bun option for the burgers.", status: "open", created: "2026-10-09T11:20:00+02:00", assignedTo: "" },
  { id: "FB-105", userId: "u-c-6", whatsapp: "26772000306", subject: "Invoice query", message: "Could you email a copy of the September invoice?", status: "resolved", created: "2026-10-08T08:55:00+02:00", assignedTo: "Kabelo Motsamai" },
  { id: "FB-106", userId: "u-c-4", whatsapp: "26772000304", subject: "Reservation change", message: "Please move Saturday's booking to 19:30 for 6 guests.", status: "open", created: "2026-10-07T16:30:00+02:00", assignedTo: "" }
];

/* ---- menu.js ---- */
/* The Food Place — demo menu (merged into biz-restaurant.modules.menu). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).menu = {
  categories: [
    { id: "cat-breakfast", name: "Breakfast" },
    { id: "cat-burgers", name: "Burgers" },
    { id: "cat-grills", name: "Grills" },
    { id: "cat-pizza", name: "Pizza" },
    { id: "cat-pasta", name: "Pasta" },
    { id: "cat-salads", name: "Salads" },
    { id: "cat-tacos", name: "Tacos & Bowls" },
    { id: "cat-sandwiches", name: "Sandwiches" },
    { id: "cat-sides", name: "Sides" },
    { id: "cat-desserts", name: "Desserts" }
  ],
  items: [
    { id: "m-01", name: "Classic Breakfast", category: "Breakfast", price: 50, description: "Two eggs, bacon, grilled tomato, toast and chips.", isAlcohol: false },
    { id: "m-02", name: "Full Vegetarian Breakfast", category: "Breakfast", price: 55, description: "Eggs, grilled halloumi, roasted tomatoes, beans, spinach and toast.", isAlcohol: false },
    { id: "m-03", name: "Smashed Avo on Toast", category: "Breakfast", price: 55, description: "Sourdough, smashed avocado, feta, chilli and poached egg.", isAlcohol: false },
    { id: "m-04", name: "Bacon & Cheese Omelette", category: "Breakfast", price: 95, description: "Three-egg omelette with bacon, cheddar and herbs.", isAlcohol: false },
    { id: "m-05", name: "Fluffy Pancake Stack", category: "Breakfast", price: 50, description: "Buttermilk pancakes with syrup and berries.", isAlcohol: false },
    { id: "m-06", name: "The Big G Burger", category: "Burgers", price: 125, description: "Double smashed beef, cheddar, pickles, house sauce and chips.", isAlcohol: false },
    { id: "m-07", name: "The Giraffe Tower DBL Cheese", category: "Burgers", price: 100, description: "Two patties, double cheese, caramelised onion and chips.", isAlcohol: false },
    { id: "m-08", name: "TYG SGL Cheese Tower", category: "Burgers", price: 80, description: "Single smashed patty with melted cheddar and chips.", isAlcohol: false },
    { id: "m-09", name: "Chicken Burger", category: "Burgers", price: 80, description: "Crumbed chicken breast, slaw, mayo and chips.", isAlcohol: false },
    { id: "m-10", name: "Bacon & Avocado Burger", category: "Burgers", price: 85, description: "Beef patty, bacon, avocado, tomato and chips.", isAlcohol: false },
    { id: "m-11", name: "Rump 200g", category: "Grills", price: 155, description: "Grilled rump with chips or pap and a side salad.", isAlcohol: false },
    { id: "m-12", name: "Rump 300g", category: "Grills", price: 195, description: "Grilled rump with savoury rice and chakalaka.", isAlcohol: false },
    { id: "m-13", name: "Grilled Ribeye", category: "Grills", price: 250, description: "Ribeye cooked to order with chips and garlic butter.", isAlcohol: false },
    { id: "m-14", name: "Classic Steak & Eggs", category: "Grills", price: 110, description: "Rump, two eggs, chips and toast.", isAlcohol: false },
    { id: "m-15", name: "Beef Fillet & Caramelised Onion", category: "Grills", price: 115, description: "Fillet with caramelised onion, mash and gravy.", isAlcohol: false },
    { id: "m-16", name: "Meat Lovers Pizza Medium", category: "Pizza", price: 135, description: "Ground beef, bacon, pepperoni, ham and BBQ drizzle.", isAlcohol: false },
    { id: "m-17", name: "Meat Lovers Pizza Large", category: "Pizza", price: 185, description: "Large 30cm meat lovers with extra cheese.", isAlcohol: false },
    { id: "m-18", name: "Salami Pesto & Mozzarella", category: "Pizza", price: 105, description: "Salami, pesto and mozzarella on a tomato base.", isAlcohol: false },
    { id: "m-19", name: "Tuscan Fettuccine Chicken Pasta", category: "Pasta", price: 130, description: "Fettuccine, grilled chicken and a creamy Tuscan sauce.", isAlcohol: false },
    { id: "m-20", name: "Chicken Salad", category: "Salads", price: 105, description: "Grilled chicken, greens, cherry tomato and honey mustard.", isAlcohol: false },
    { id: "m-21", name: "Beef Salad", category: "Salads", price: 115, description: "Seared beef strips, mixed leaves, feta and balsamic.", isAlcohol: false },
    { id: "m-22", name: "Side Salad Bowl", category: "Salads", price: 35, description: "Mixed leaves, cucumber, tomato and house dressing.", isAlcohol: false },
    { id: "m-23", name: "TYG Taco Bowl Chicken", category: "Tacos & Bowls", price: 95, description: "Chicken taco bowl with rice, beans, salsa and guacamole.", isAlcohol: false },
    { id: "m-24", name: "TYG Taco Bowl Beef Sirloin", category: "Tacos & Bowls", price: 120, description: "Sirloin taco bowl with rice, beans and jalapenos.", isAlcohol: false },
    { id: "m-25", name: "TYG Tacos Beef Seswaa", category: "Tacos & Bowls", price: 95, description: "Three soft tacos with shredded seswaa and salsa.", isAlcohol: false },
    { id: "m-26", name: "TYG Club", category: "Sandwiches", price: 110, description: "Triple-decker chicken, bacon, egg and chips.", isAlcohol: false },
    { id: "m-27", name: "Mediterranean Chicken Melt", category: "Sandwiches", price: 140, description: "Grilled chicken, mozzarella, tomato and basil on ciabatta.", isAlcohol: false },
    { id: "m-28", name: "Shroom Melt", category: "Sandwiches", price: 85, description: "Garlic mushrooms and mozzarella on toasted sourdough.", isAlcohol: false },
    { id: "m-29", name: "Fresh Chips", category: "Sides", price: 20, description: "Hand-cut chips with seasoning.", isAlcohol: false },
    { id: "m-30", name: "Onion Rings", category: "Sides", price: 30, description: "Golden crumbed onion rings.", isAlcohol: false },
    { id: "m-31", name: "Sweet Berry Waffle", category: "Desserts", price: 55, description: "Waffle with berries, ice cream and chocolate sauce.", isAlcohol: false },
    { id: "m-32", name: "Kiddies Milkshake", category: "Desserts", price: 30, description: "Strawberry, chocolate or vanilla.", isAlcohol: false }
  ]
};

/* ---- beverages.js ---- */
/* The Food Place — demo beverages (merged into biz-restaurant.modules.beverage). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).beverage = {
  categories: [
    { id: "bv-coffee", name: "Coffee & Tea" },
    { id: "bv-cold", name: "Cold Drinks" },
    { id: "bv-mocktails", name: "Mocktails" },
    { id: "bv-beer", name: "Beers & Ciders" }
  ],
  items: [
    { id: "b-01", name: "Cappuccino Double", category: "Coffee & Tea", price: 35, description: "Double espresso with steamed milk.", isAlcohol: false },
    { id: "b-02", name: "Cappuccino Grande", category: "Coffee & Tea", price: 42, description: "Large cappuccino.", isAlcohol: false },
    { id: "b-03", name: "Latte Double", category: "Coffee & Tea", price: 36, description: "Smooth double latte.", isAlcohol: false },
    { id: "b-04", name: "Americano Double", category: "Coffee & Tea", price: 30, description: "Double espresso with hot water.", isAlcohol: false },
    { id: "b-05", name: "Dirty Chai Latte", category: "Coffee & Tea", price: 50, description: "Spiced chai with a shot of espresso.", isAlcohol: false },
    { id: "b-06", name: "Hot Chocolate Double", category: "Coffee & Tea", price: 35, description: "Rich drinking chocolate.", isAlcohol: false },
    { id: "b-07", name: "Hot Honey Lemon", category: "Coffee & Tea", price: 14, description: "Honey, lemon and hot water.", isAlcohol: false },
    { id: "b-08", name: "Iced Latte Double", category: "Cold Drinks", price: 40, description: "Chilled double latte over ice.", isAlcohol: false },
    { id: "b-09", name: "Strawberry Matcha Iced Latte", category: "Cold Drinks", price: 55, description: "Matcha, strawberry and milk over ice.", isAlcohol: false },
    { id: "b-10", name: "Mint & Lemon Frozen Crusher", category: "Cold Drinks", price: 50, description: "Blended mint, lemon and ice.", isAlcohol: false },
    { id: "b-11", name: "Berry Tall", category: "Cold Drinks", price: 65, description: "Mixed berry smoothie.", isAlcohol: false },
    { id: "b-12", name: "Malawi Shandy", category: "Cold Drinks", price: 40, description: "Chilled shandy.", isAlcohol: true },
    { id: "b-13", name: "Virgin Strawberry Mojito", category: "Mocktails", price: 55, description: "Strawberry, mint and soda.", isAlcohol: false },
    { id: "b-14", name: "Virgin Pina Colada", category: "Mocktails", price: 60, description: "Pineapple and coconut cream.", isAlcohol: false },
    { id: "b-15", name: "St Louis Lager 340ml", category: "Beers & Ciders", price: 30, description: "Ice-cold lager. 18+ only.", isAlcohol: true },
    { id: "b-16", name: "Savanna Dry Cider 330ml", category: "Beers & Ciders", price: 35, description: "Dry apple cider. 18+ only.", isAlcohol: true },
    { id: "b-17", name: "Corona Extra 355ml", category: "Beers & Ciders", price: 45, description: "Mexican lager with lime. 18+ only.", isAlcohol: true }
  ]
};

/* ---- promos.js ---- */
/* The Food Place — demo promotions (merged into biz-restaurant.modules.promos). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).promos = [
  { id: "p-01", title: "Monday Comfort Beef Stew", description: "Classic beef stew with carrots and gravy, served with rice or mash.", category: "Monday 11:00–22:00", originalPrice: 85, promoPrice: 75, day: "Monday" },
  { id: "p-02", title: "Taco Tuesday Fiesta Platter", description: "Crispy fish tacos, beef quesadilla, guacamole and chips.", category: "Tuesday 12:00–22:00", originalPrice: 303, promoPrice: 255, day: "Tuesday" },
  { id: "p-03", title: "Honey Glazed Pork Ribs + Chips", description: "300g ribs basted in honey-garlic glaze with fresh chips.", category: "Wednesday 11:00–22:00", originalPrice: 145, promoPrice: 125, day: "Wednesday" },
  { id: "p-04", title: "Slow-Braised Beef Oxtail", description: "Oxtail braised with butter beans, served with rice or mash.", category: "Thursday 11:00–22:00", originalPrice: 140, promoPrice: 125, day: "Thursday" },
  { id: "p-05", title: "Friday Seafood Combo + Chips", description: "Fried hake fillet and calamari strips with tartar sauce and chips.", category: "Friday 11:00–22:00", originalPrice: 175, promoPrice: 150, day: "Friday" },
  { id: "p-06", title: "Saturday Mixed Grill Platter", description: "Steak, lamb chop, sausage and quarter chicken with chips.", category: "Saturday 11:00–22:00", originalPrice: 195, promoPrice: 175, day: "Saturday" }
];

/* ---- events.js ---- */
/* The Food Place — demo events (merged into biz-restaurant.modules.events). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).events = [
  { id: "ev-01", title: "Monday Night Football", name: "Monday Night Football", description: "Premier League, La Liga and Serie A live on the wide screen.", category: "Sport", startDate: "2026-10-12", startTime: "18:00", endTime: "00:00", sponsoredBy: "St Louis Lager" },
  { id: "ev-02", title: "Ladies Night", name: "Ladies Night", description: "2-for-1 sparkling drinks, half-price cocktails and a live DJ.", category: "Party", startDate: "2026-10-14", startTime: "19:00", endTime: "02:00", sponsoredBy: "Bernini" },
  { id: "ev-03", title: "Friday Night Live: Seafood & Salsa", name: "Friday Night Live: Seafood & Salsa", description: "Live band from 20:00, seafood platters and cocktail specials.", category: "Music", startDate: "2026-10-16", startTime: "18:00", endTime: "02:00", sponsoredBy: "Corona Extra" },
  { id: "ev-04", title: "Sunday Family Funday", name: "Sunday Family Funday", description: "Live jazz from 13:00 with family roast platters and kids entertainment.", category: "Family", startDate: "2026-10-18", startTime: "12:00", endTime: "20:00", sponsoredBy: "Windhoek Lager" }
];

/* ---- gallery.js ---- */
/* The Food Place — demo gallery (merged into biz-restaurant.modules.gallery). */
(function () {
  var g = (window.EATOUTS_DEMO = window.EATOUTS_DEMO || {});
  var images = [
    { id: "gi-01", src: "assets/images/demo/food-place/interior-1.jpg", url: "assets/images/demo/food-place/interior-1.jpg", caption: "Main dining room", alt: "Main dining room at The Food Place", label: "Interior" },
    { id: "gi-02", src: "assets/images/demo/food-place/terrace-1.jpg", url: "assets/images/demo/food-place/terrace-1.jpg", caption: "Outdoor terrace", alt: "Outdoor terrace seating", label: "Terrace" },
    { id: "gi-03", src: "assets/images/demo/food-place/bar-1.jpg", url: "assets/images/demo/food-place/bar-1.jpg", caption: "Coffee and cocktail bar", alt: "Coffee and cocktail bar", label: "Bar" },
    { id: "gi-04", src: "assets/images/demo/food-place/burger-1.jpg", url: "assets/images/demo/food-place/burger-1.jpg", caption: "The Big G Burger", alt: "Double smashed burger with chips", label: "Food" },
    { id: "gi-05", src: "assets/images/demo/food-place/grill-1.jpg", url: "assets/images/demo/food-place/grill-1.jpg", caption: "Rump and chips", alt: "Grilled rump with chips", label: "Food" },
    { id: "gi-06", src: "assets/images/demo/food-place/pizza-1.jpg", url: "assets/images/demo/food-place/pizza-1.jpg", caption: "Meat Lovers pizza", alt: "Meat lovers pizza", label: "Food" },
    { id: "gi-07", src: "assets/images/demo/food-place/breakfast-1.jpg", url: "assets/images/demo/food-place/breakfast-1.jpg", caption: "Weekend breakfast", alt: "Full breakfast plate", label: "Food" },
    { id: "gi-08", src: "assets/images/demo/food-place/coffee-1.jpg", url: "assets/images/demo/food-place/coffee-1.jpg", caption: "Cappuccino", alt: "Cappuccino on a table", label: "Drinks" },
    { id: "gi-09", src: "assets/images/demo/food-place/cocktails-1.jpg", url: "assets/images/demo/food-place/cocktails-1.jpg", caption: "Cocktails and mocktails", alt: "Cocktails on the bar", label: "Drinks" },
    { id: "gi-10", src: "assets/images/demo/food-place/event-1.jpg", url: "assets/images/demo/food-place/event-1.jpg", caption: "Live jazz Sunday", alt: "Live band playing", label: "Events" },
    { id: "gi-11", src: "assets/images/demo/food-place/event-2.jpg", url: "assets/images/demo/food-place/event-2.jpg", caption: "Match night", alt: "Big screen match night", label: "Events" },
    { id: "gi-12", src: "assets/images/demo/food-place/exterior-1.jpg", url: "assets/images/demo/food-place/exterior-1.jpg", caption: "Entrance", alt: "Restaurant entrance", label: "Exterior" }
  ];
  g.gallery = {
    groups: [
      { id: "gg-interior", title: "Interior", name: "Interior", images: [images[0], images[1], images[2], images[11]] },
      { id: "gg-food", title: "Food", name: "Food", images: [images[3], images[4], images[5], images[6]] },
      { id: "gg-drinks", title: "Drinks", name: "Drinks", images: [images[7], images[8]] },
      { id: "gg-events", title: "Events", name: "Events", images: [images[9], images[10]] }
    ],
    images: images
  };
})();

/* ---- verification.js ---- */
/* The Food Place — demo verification queue (manager store "verification" collection).
   Includes the demo restaurant plus sibling demo businesses so the platform
   verification page has realistic volume. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).verification = [
  { id: "VER-11", businessId: "biz-restaurant", submitted: "2025-03-02", documents: ["ID", "Trading licence", "Liquor licence"], callback: "Called 2025-03-03", status: "approved" },
  { id: "VER-12", businessId: "biz-bottle", submitted: "2026-10-09", documents: ["ID", "Trading licence"], callback: "Not yet called", status: "pending" },
  { id: "VER-13", businessId: "biz-caterer", submitted: "2025-11-14", documents: ["ID", "Trading licence", "Health certificate"], callback: "Called 2025-11-15", status: "approved" },
  { id: "VER-14", businessId: "biz-lodge", submitted: "2025-12-01", documents: ["ID", "Trading licence", "Tourism registration"], callback: "Called 2025-12-02", status: "approved" }
];

/* ---- disputes.js ---- */
/* The Food Place — demo disputes (manager store "disputes" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).disputes = [
  { id: "DSP-11", orderId: "EO-2016", businessId: "biz-restaurant", customer: "Keneilwe Motswana", reason: "Order cancelled after payment", status: "open", amount: 150 },
  { id: "DSP-12", orderId: "EO-2010", businessId: "biz-restaurant", customer: "Tshepo Masuku", reason: "Item missing from bag", status: "resolved", amount: 45 },
  { id: "DSP-13", orderId: "EO-2005", businessId: "biz-restaurant", customer: "Boitumelo Nkosi", reason: "Charged twice for delivery fee", status: "refund_pending", amount: 30 },
  { id: "DSP-14", orderId: "EO-2040", businessId: "biz-restaurant", customer: "Mpho Tshiamo", reason: "Late delivery — cold food", status: "open", amount: 120 }
];

/* ---- notifications.js ---- */
/* The Food Place — demo notifications / broadcasts (manager store "notifications" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).notifications = [
  { id: "NT-101", segment: "all_customers", title: "Weekend brunch is live", message: "Join us Saturday and Sunday for the full brunch menu, 08:00–12:00.", created: "2026-10-11T08:00:00+02:00" },
  { id: "NT-102", segment: "lapsed_30d", title: "We miss you — 15% off", message: "Show this message on your next order for 15% off any main.", created: "2026-10-09T10:30:00+02:00" },
  { id: "NT-103", segment: "delivery_customers", title: "New scheduled windows", message: "You can now book deliveries in 60-minute windows from 06:00.", created: "2026-10-07T09:15:00+02:00" },
  { id: "NT-104", segment: "reservation_guests", title: "Live jazz this Sunday", message: "Live jazz from 13:00 with family roast platters. Book your table.", created: "2026-10-05T12:00:00+02:00" },
  { id: "NT-105", segment: "all_customers", title: "Now on Orange Money", message: "Pay with Orange Money or MyZaka at checkout.", created: "2026-10-02T15:45:00+02:00" }
];

/* ---- customer-orders.js ---- */
/* The Food Place — demo customer order history (shows on the customer "Orders"
   page). No businessId, so these do not appear in the venue manager boards. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).customerOrders = [
  { id: "EO-C-3001", userId: "u-customer", created: "2026-10-11 08:14", total: 160, status: "delivered", items: ["The Big G Burger", "Cappuccino Double"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3002", userId: "u-customer", created: "2026-10-09 12:40", total: 245, status: "delivered", items: ["The Big G Burger", "Loaded Nachos Beef"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3003", userId: "u-customer", created: "2026-10-06 19:05", total: 270, status: "delivered", items: ["Grilled Ribeye", "Chips"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3004", userId: "u-customer", created: "2026-10-04 13:22", total: 130, status: "delivered", items: ["Tuscan Fettuccine Chicken Pasta"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3005", userId: "u-customer", created: "2026-10-01 09:47", total: 185, status: "delivered", items: ["Smashed Avo on Toast x2", "Latte Double"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3006", userId: "u-customer", created: "2026-09-28 20:31", total: 220, status: "delivered", items: ["Meat Lovers Pizza Medium", "Savanna Dry Cider 330ml"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3007", userId: "u-customer", created: "2026-09-25 12:58", total: 120, status: "delivered", items: ["TYG Taco Bowl Beef Sirloin"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3008", userId: "u-customer", created: "2026-09-21 07:36", total: 95, status: "delivered", items: ["Bacon & Cheese Omelette"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3009", userId: "u-customer", created: "2026-09-18 18:12", total: 140, status: "cancelled", items: ["Mediterranean Chicken Melt"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } },
  { id: "EO-C-3010", userId: "u-customer", created: "2026-09-14 11:20", total: 110, status: "delivered", items: ["TYG Club"], restaurant: { id: "the-food-place", name: "The Food Place", whatsapp: "26771844129" } }
];

/* ---- favourites.js ---- */
/* The Food Place — demo customer favourites (manager store "favourites" collection).
   User id matches the demo customer (u-customer). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).favourites = [
  { id: "FAV-101", userId: "u-customer", type: "restaurant", title: "The Food Place", subtitle: "Gaborone CBD · Restaurant", refId: "biz-restaurant" },
  { id: "FAV-102", userId: "u-customer", type: "menu", title: "The Big G Burger", subtitle: "Burgers", price: 125, refId: "m-06" },
  { id: "FAV-103", userId: "u-customer", type: "menu", title: "Grilled Ribeye", subtitle: "Grills", price: 250, refId: "m-13" },
  { id: "FAV-104", userId: "u-customer", type: "menu", title: "TYG Taco Bowl Chicken", subtitle: "Tacos & Bowls", price: 95, refId: "m-23" },
  { id: "FAV-105", userId: "u-customer", type: "beverage", title: "Cappuccino Double", subtitle: "Coffee & Tea", price: 35, refId: "b-01" },
  { id: "FAV-106", userId: "u-customer", type: "beverage", title: "Berry Tall", subtitle: "Cold Drinks", price: 65, refId: "b-11" },
  { id: "FAV-107", userId: "u-customer", type: "promo", title: "Taco Tuesday Fiesta Platter", subtitle: "Tuesday 12:00–22:00", price: 255, refId: "p-02" },
  { id: "FAV-108", userId: "u-customer", type: "gallery", title: "Outdoor terrace", subtitle: "Terrace", refId: "gi-02" }
];

/* ---- addresses.js ---- */
/* The Food Place — demo customer addresses (manager store "addresses" collection).
   User id matches the demo customer (u-customer). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).addresses = [
  { id: "AD-101", userId: "u-customer", label: "Home", district: "South-East", town: "Gaborone", area: "Extension 12", street: "Plot 4512", address: "Plot 4512, Extension 12, Gaborone", contact: "26770000001" },
  { id: "AD-102", userId: "u-customer", label: "Work", district: "South-East", town: "Gaborone", area: "CBD", street: "Plot 54358", address: "Plot 54358, CBD, Gaborone", contact: "26770000001" },
  { id: "AD-103", userId: "u-customer", label: "Family", district: "Kweneng", town: "Mogoditshane", area: "Mogoditshane Village", street: "Plot 88", address: "Plot 88, Mogoditshane Village", contact: "26770000001" }
];
