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
