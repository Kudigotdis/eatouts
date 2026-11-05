/* The Food Place — demo verification queue (manager store "verification" collection).
   Includes the demo restaurant plus sibling demo businesses so the platform
   verification page has realistic volume. */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).verification = [
  { id: "VER-11", businessId: "biz-restaurant", submitted: "2025-03-02", documents: ["ID", "Trading licence", "Liquor licence"], callback: "Called 2025-03-03", status: "approved" },
  { id: "VER-12", businessId: "biz-bottle", submitted: "2026-10-09", documents: ["ID", "Trading licence"], callback: "Not yet called", status: "pending" },
  { id: "VER-13", businessId: "biz-caterer", submitted: "2025-11-14", documents: ["ID", "Trading licence", "Health certificate"], callback: "Called 2025-11-15", status: "approved" },
  { id: "VER-14", businessId: "biz-lodge", submitted: "2025-12-01", documents: ["ID", "Trading licence", "Tourism registration"], callback: "Called 2025-12-02", status: "approved" }
];
