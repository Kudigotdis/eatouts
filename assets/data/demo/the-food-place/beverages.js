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
