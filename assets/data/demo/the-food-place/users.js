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
