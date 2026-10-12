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
