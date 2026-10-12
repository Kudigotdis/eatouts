/* The Food Place — demo disputes (manager store "disputes" collection). */
(window.EATOUTS_DEMO = window.EATOUTS_DEMO || {}).disputes = [
  { id: "DSP-11", orderId: "EO-2016", businessId: "biz-restaurant", customer: "Keneilwe Motswana", reason: "Order cancelled after payment", status: "open", amount: 150 },
  { id: "DSP-12", orderId: "EO-2010", businessId: "biz-restaurant", customer: "Tshepo Masuku", reason: "Item missing from bag", status: "resolved", amount: 45 },
  { id: "DSP-13", orderId: "EO-2005", businessId: "biz-restaurant", customer: "Boitumelo Nkosi", reason: "Charged twice for delivery fee", status: "refund_pending", amount: 30 },
  { id: "DSP-14", orderId: "EO-2040", businessId: "biz-restaurant", customer: "Mpho Tshiamo", reason: "Late delivery — cold food", status: "open", amount: 120 }
];
