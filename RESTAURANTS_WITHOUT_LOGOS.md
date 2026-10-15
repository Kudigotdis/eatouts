# Restaurants without logos

Generated `2026-10-15` by `npm run missing-logos` (`scripts/missing-logos.mjs`).
Re-run that command after adding logo art — it rewrites this file, so any
manual checkboxes below are reset to unticked.

A venue counts as logo'd when `EatoutsBrand.logoFor()` resolves to real art
via the manifest (`assets/data/restaurant_listings/eatouts_manifest.js`), a
record `logo` field, or `REAL_LOGOS` in `js/eatouts-brand.js`. Everything
else renders the grey letter tile `assets/logo/logo_placement_image.png`.

## Summary

| | |
|---|---|
| Restaurants in the app | 566 |
| With a real logo | 189 |
| **Without a logo** | **377** |
| Towns affected | 36 |
| Unused logo art files | 10 |

## How to fix a venue

1. Drop the art in `assets/logo/` (square, under ~200KB).
2. Add one key to `logos` in `assets/data/restaurant_listings/eatouts_manifest.js`.
   Use the venue slug exactly, or a brand prefix that also covers its branches
   (`milky-lane` covers `milky-lane-francistown` and friends).
3. Re-run `npm run missing-logos` — the venue should disappear from this list.

## Priority: multi-branch brands with no logo anywhere

- **Milky Lane** (4 branches): `milky-lane`, `milky-lane-francistown`, `milky-lane-maun`, `milky-lane-phakalane`
- **Chutney Restaurant** (2 branches): `chutney-restaurant-francistown`, `chutney-restaurant`
- **Denjebuya Restaurant** (2 branches): `denjebuya-restaurant-branch`, `denjebuya-restaurant`
- **Tandurei** (2 branches): `tandurei`, `tandurei-ghanzi`
- **At Nine Eatery + Cocktail Bar** (2 branches): `at-nine-eatery-cocktail-bar`, `at-nine-eatery-cocktail-bar-tlokweng`
- **Chicken Run** (2 branches): `chicken-run-lobatse`, `chicken-run`

Adding one manifest key for the brand name clears every branch at once.

## Near misses (brand key exists, slug does not match)

- Silver Spur Steakhouse (`silver-spur-steakhouse`) — closest manifest key: `spur`

## Missing by town

### Gaborone (112)

- [ ] 25 Degrees East (`25-degrees-east`)
- [ ] Afripoul Prime (`afripoul-prime`)
- [ ] Aquamarine Holdings (pty) (`aquamarine-holdings-pty`)
- [ ] Arirang Guest House and Restaurant (`arirang-guest-house-and-restaurant`)
- [ ] At Nine Eatery + Cocktail Bar (`at-nine-eatery-cocktail-bar`)
- [ ] Badri's Restaurant Takeaways (`badri-s-restaurant-takeaways`)
- [ ] Beijing Red Lantern Chinese Restaurant (`beijing-red-lantern-chinese-restaurant`)
- [ ] Beijing Red Lantern Chinese Resturant (`beijing-red-lantern-chinese-resturant`)
- [ ] Bimbos (`bimbos`)
- [ ] Boitshoko Restaurant (`boitshoko-restaurant`)
- [ ] Brackendene Lodge (`brackendene-lodge`)
- [ ] British Pie Company (`british-pie-company`)
- [ ] Bull Dogs (`bull-dogs`)
- [ ] Cafe Portugalia (`cafe-portugalia`)
- [ ] Cantina Amigos (pty) Ltd (`cantina-amigos-pty-ltd`)
- [ ] Caravela Portuguese Restaurant (`caravela-portuguese-restaurant`)
- [ ] Carlito's Cafe (`carlito-s-cafe`)
- [ ] Casa Portuguesa (`casa-portuguesa`)
- [ ] China Restaurant (`china-restaurant`)
- [ ] Chop 'n Wok (`chop-n-wok`)
- [ ] Chutney Indian Restaurant (`chutney-indian-restaurant`)
- [ ] Chutney Restaurant (`chutney-restaurant`)
- [ ] Coffeenest (`coffeenest`)
- [ ] Conservatory and Pool Terrace (`conservatory-and-pool-terrace`)
- [ ] Crown Restaurant (`crown-restaurant`)
- [ ] Crystal Paradise (`crystal-paradise`)
- [ ] Curry Pot (`curry-pot`)
- [ ] Delis (`delis`)
- [ ] Delta Cafe (`delta-cafe`)
- [ ] Eastern Flavours (`eastern-flavours`)
- [ ] Ed-La's Chisanyama (`ed-la-s-chisanyama`)
- [ ] Embassy (`embassy`)
- [ ] Equatorial Coffee Company (`equatorial-coffee-company`)
- [ ] Fairground Holdings (Pty) Ltd t/a Botswana Conference and Exhibition Centre (`fairground-holdings-pty-ltd-t-a-botswana-conference-and-exhibition-centre`)
- [ ] Fine Thirty-8 (`fine-thirty-8`)
- [ ] Fishmonger The Original (`fishmonger-the-original`)
- [ ] Food Court (pty) Ltd (`food-court-pty-ltd`)
- [ ] Foodtown (pty) Ltd (`foodtown-pty-ltd`)
- [ ] Gaborone Yacht Club (`gaborone-yacht-club`)
- [ ] Gatsby (`gatsby`)
- [ ] General Refrigeration (pty) Ltd (`general-refrigeration-pty-ltd`)
- [ ] Group 4 Services (`group-4-services`)
- [ ] Health Generation (`health-generation`)
- [ ] Hot Pot Takeaway (`hot-pot-takeaway`)
- [ ] House Of Foods (`house-of-foods`)
- [ ] Innisfree Apartments (`innisfree-apartments`)
- [ ] J B's Kitchen (`j-b-s-kitchen`)
- [ ] Jade Palace (`jade-palace`)
- [ ] Jarateng Lounge (`jarateng-lounge`)
- [ ] Jimmy's Killer Express (`jimmy-s-killer-express`)
- [ ] Kalahari Flying Club (`kalahari-flying-club`)
- [ ] KAUAI (`kauai`)
- [ ] King's Takeaway (`king-s-takeaway`)
- [ ] La Sante Restaurant (`la-sante-restaurant`)
- [ ] Lancaster House Liquor Restaurant (`lancaster-house-liquor-restaurant`)
- [ ] leile Alu (`leile-alu`)
- [ ] Mahogany's Restaurant (`mahogany-s-restaurant`)
- [ ] Mapoka And Co (Pty)Ltd (`mapoka-and-co-pty-ltd`)
- [ ] Marakanelo Hotels (pty) Ltd (`marakanelo-hotels-pty-ltd`)
- [ ] Marija's Restaurant & Catering Services (`marija-s-restaurant-and-catering-services`)
- [ ] Max Franco's Chicken (`max-franco-s-chicken`)
- [ ] Max Frango's (`max-frango-s`)
- [ ] Melodi Café (`melodi-cafe`)
- [ ] Mexicanos Chicken & Grills (`mexicanos-chicken-and-grills`)
- [ ] Milano's Chicken & Pizza (`milano-s-chicken-and-pizza`)
- [ ] Milky Lane (`milky-lane`)
- [ ] Milky Lane Restaurant (`milky-lane-restaurant`)
- [ ] Mmammifi (`mmammifi`)
- [ ] Mo's Open-Table (`mo-s-open-table`)
- [ ] Mokolwane Bistro (`mokolwane-bistro`)
- [ ] Molinaro (pty) Ltd (`molinaro-pty-ltd`)
- [ ] Morula (`morula`)
- [ ] Multicuisine Restaurant (`multicuisine-restaurant`)
- [ ] News Cafe (`news-cafe`)
- [ ] News Cafe At Mondior Hotel, Gaborone (`news-cafe-at-mondior-hotel-gaborone`)
- [ ] Nyamakhaya (`nyamakhaya`)
- [ ] O'Hagan's Irish Pub n Grill Restaurant (`o-hagan-s-irish-pub-n-grill-restaurant`)
- [ ] O'hagans Restaurant (`o-hagans-restaurant`)
- [ ] Oceans Restaurant (`oceans-restaurant`)
- [ ] Pavilion Restaurant (`pavilion-restaurant`)
- [ ] Peking Garden (`peking-garden`)
- [ ] Pizza Den (`pizza-den`)
- [ ] Pizzaria & Grill (`pizzaria-and-grill`)
- [ ] Polar Ice Cream Factory Shop (`polar-ice-cream-factory-shop`)
- [ ] Pool Bar (`pool-bar`)
- [ ] Primeyard (`primeyard`)
- [ ] Primi Piatti (`primi-piatti`)
- [ ] Red Lantern (`red-lantern`)
- [ ] Rhapsody's (`rhapsody-s`)
- [ ] Rio Cafe Deli (`rio-cafe-deli`)
- [ ] Rural Industries Promotions Company (botswana) Ripco (`rural-industries-promotions-company-botswana-ripco`)
- [ ] Savuti Grill (`savuti-grill`)
- [ ] Scooters (`scooters`)
- [ ] Serendib Restaurant (`serendib-restaurant`)
- [ ] Sip & Grill (`sip-and-grill`)
- [ ] Spice & Flame (`spice-and-flame`)
- [ ] Succes Investment (pty) Ltd (`succes-investment-pty-ltd`)
- [ ] Swiss Chalet (`swiss-chalet`)
- [ ] Swiss Inn (`swiss-inn`)
- [ ] Tai Pan Fast Food (`tai-pan-fast-food`)
- [ ] The Cafe MFK (`the-cafe-mfk`)
- [ ] The Meatin Joint (`the-meatin-joint`)
- [ ] The Pavilion Restaurant (`the-pavilion-restaurant`)
- [ ] The Pond Restaurant (`the-pond-restaurant`)
- [ ] The Princeton Lounge (`the-princeton-lounge`)
- [ ] The Test Kitchen Cafe (`the-test-kitchen-cafe`)
- [ ] The Wheelbarrow (`the-wheelbarrow`)
- [ ] Tony's Service Apartments (`tony-s-service-apartments`)
- [ ] Triple R Restaurant (`triple-r-restaurant`)
- [ ] Tsholofelo Community Centre (`tsholofelo-community-centre`)
- [ ] U B Convience Store (`u-b-convience-store`)
- [ ] Vala-lisa Catering Company (`vala-lisa-catering-company`)

### Maun (40)

- [ ] Bantu Restobar by Parkview Hotel (`bantu-restobar-by-parkview-hotel`)
- [ ] Bon Arrivée Restaurant (`bon-arrivee-restaurant`)
- [ ] Boseja Butchery And Restaurant (`boseja-butchery-and-restaurant`)
- [ ] Buck & Hunter Bar & Restaurant (`buck-and-hunter-bar-and-restaurant`)
- [ ] By The Bridge (`by-the-bridge`)
- [ ] Dusty Donkey Café (`dusty-donkey-cafe`)
- [ ] Ema Re Je (`ema-re-je`)
- [ ] French Connection (`french-connection`)
- [ ] Hilary's (`hilary-s`)
- [ ] Hilary's Coffee Shop (`hilary-s-coffee-shop`)
- [ ] Il pomodoro (`il-pomodoro`)
- [ ] Island Safari Lodge (`island-safari-lodge`)
- [ ] Kana Jang? (`kana-jang`)
- [ ] Kwa Ga Ncinci Restaurant (`kwa-ga-ncinci-restaurant`)
- [ ] Magic Lantern Restaurant And Take Away (`magic-lantern-restaurant-and-take-away`)
- [ ] Marc's Eatery (`marc-s-eatery`)
- [ ] Maun Lodge (`maun-lodge`)
- [ ] Maun Restaurant (`maun-restaurant`)
- [ ] Miguel's Taco Shack (`miguel-s-taco-shack`)
- [ ] Milky Lane (`milky-lane-maun`)
- [ ] Mochaba Crossing Lodge (`mochaba-crossing-lodge`)
- [ ] Motsana restaurant (`motsana-restaurant`)
- [ ] Nokanyana (`nokanyana`)
- [ ] Okavango Craft Brewery (`okavango-craft-brewery`)
- [ ] Panda Rest Camp (`panda-rest-camp`)
- [ ] Parkview Hotel (`parkview-hotel`)
- [ ] Pizza Plus (`pizza-plus`)
- [ ] Planet Culture Café (`planet-culture-cafe`)
- [ ] Rendezurs Restuarant (`rendezurs-restuarant`)
- [ ] Runway 08 (`runway-08`)
- [ ] S M Associates (`s-m-associates`)
- [ ] Tandurei Indian Restaurant (`tandurei-indian-restaurant`)
- [ ] Tandurei Indian Restaurant Maun (`tandurei-indian-restaurant-maun`)
- [ ] The Duck Cafe Bar (`the-duck-cafe-bar`)
- [ ] The Eden Kitchen (`the-eden-kitchen`)
- [ ] The Smoothie Bar (`the-smoothie-bar`)
- [ ] The Trailhead - Bushkitchen at sSitatunga (`the-trailhead-bushkitchen-at-ssitatunga`)
- [ ] Three Tree Hotel (`three-tree-hotel`)
- [ ] Tshipidi Restaurant (`tshipidi-restaurant`)
- [ ] Welcome Group (pty) Ltd (`welcome-group-pty-ltd`)

### Francistown (34)

- [ ] Adansonia Hotel & Conference Centre (`adansonia-hotel-and-conference-centre`)
- [ ] Baobab T/a A Enterprises (`baobab-t-a-a-enterprises`)
- [ ] Barbara's Bistro (`barbara-s-bistro`)
- [ ] Burgers Tarven (`burgers-tarven`)
- [ ] Calabash Chinese Restaurant (`calabash-chinese-restaurant`)
- [ ] Chicken Run (`chicken-run`)
- [ ] Chutney Restaurant (`chutney-restaurant-francistown`)
- [ ] Coconut (`coconut`)
- [ ] Cullyden Restaurant (`cullyden-restaurant`)
- [ ] Diggers Inn (`diggers-inn`)
- [ ] Donna Cafe (`donna-cafe`)
- [ ] Hotel Adansonia (`hotel-adansonia`)
- [ ] Kondwane Boutique Guest House (`kondwane-boutique-guest-house`)
- [ ] M & I Restaurant (`m-and-i-restaurant`)
- [ ] M N I Take Away Private Limited (`m-n-i-take-away-private-limited`)
- [ ] Merilicious (`merilicious`)
- [ ] Metco Investments T/a Bus Stop Cafe (`metco-investments-t-a-bus-stop-cafe`)
- [ ] Milano Restaurant (`milano-restaurant`)
- [ ] Milky Bar & Snack (`milky-bar-and-snack`)
- [ ] Milky Lane (`milky-lane-francistown`)
- [ ] Mimoso Liquor Restaurant (`mimoso-liquor-restaurant`)
- [ ] Mr Chang Chinese Restaurant (`mr-chang-chinese-restaurant`)
- [ ] Pizza House (pty) Ltd (`pizza-house-pty-ltd`)
- [ ] Revive Pitstop Café (`revive-pitstop-cafe`)
- [ ] Roots of Africa (`roots-of-africa`)
- [ ] Silver Spur Steakhouse (`silver-spur-steakhouse`)
- [ ] Tandurei The Indian Restaurant (`tandurei-the-indian-restaurant`)
- [ ] Tandurie (`tandurie`)
- [ ] The Marang (`the-marang`)
- [ ] Thorn Tree (`thorn-tree`)
- [ ] Tose Restaurant (`tose-restaurant`)
- [ ] Upstairs Grillhouse (`upstairs-grillhouse`)
- [ ] Waterhole Bar And Restaurant The (`waterhole-bar-and-restaurant-the`)
- [ ] White City Liquor Rest (`white-city-liquor-rest`)

### Kasane (20)

- [ ] Chobe Marina Lodge (`chobe-marina-lodge`)
- [ ] Chobe River Lodge (`chobe-river-lodge`)
- [ ] Chobe Safari Lodge Restaurant (`chobe-safari-lodge-restaurant`)
- [ ] Commissioner's Restaurant (`commissioner-s-restaurant`)
- [ ] Destination Coffee Spot (`destination-coffee-spot`)
- [ ] Di Kubu Bar & Kitchen (`di-kubu-bar-and-kitchen`)
- [ ] Elephant Valley Lodge (`elephant-valley-lodge`)
- [ ] Fresh Corner (`fresh-corner`)
- [ ] Hunters Pub&Grill (`hunters-pub-and-grill`)
- [ ] K And I Enterprise (pty) Ltd (`k-and-i-enterprise-pty-ltd`)
- [ ] Kubu Lodge Restaurant (`kubu-lodge-restaurant`)
- [ ] Pepe Nero Ristorante Italiano (`pepe-nero-ristorante-italiano`)
- [ ] Pizza Plus Coffee & Curry (`pizza-plus-coffee-and-curry`)
- [ ] Tandurei (`tandurei`)
- [ ] The Coffee Buzz (`the-coffee-buzz`)
- [ ] The Old House (`the-old-house`)
- [ ] Thebe restaurant and bar (`thebe-restaurant-and-bar`)
- [ ] Thebe River Safaris (`thebe-river-safaris`)
- [ ] Tlou Safari Lodge (`tlou-safari-lodge`)
- [ ] Two Rivers Hotel (`two-rivers-hotel`)

### Serowe (18)

- [ ] Bosa Bosele Restaurant (`bosa-bosele-restaurant`)
- [ ] Central Supermarket And Restaurant (`central-supermarket-and-restaurant`)
- [ ] Cycad Palm Hotel Serowe (`cycad-palm-hotel-serowe`)
- [ ] Hillview Inn Hotel (`hillview-inn-hotel`)
- [ ] Lakshmi Continental Restaurant (`lakshmi-continental-restaurant`)
- [ ] Mainland Shopping Centre (`mainland-shopping-centre`)
- [ ] Mantlentle Events Garden (`mantlentle-events-garden`)
- [ ] Mokala Restaurant (`mokala-restaurant`)
- [ ] Mom's Kitchen & Restaurant (`mom-s-kitchen-and-restaurant`)
- [ ] Nelgo Liquor Restaurant (`nelgo-liquor-restaurant`)
- [ ] P K Liquor Restaurant (`p-k-liquor-restaurant`)
- [ ] Phokoje Bush Lodge (`phokoje-bush-lodge`)
- [ ] Refreshing Moments Butchery (`refreshing-moments-butchery`)
- [ ] Serowe Hotel (`serowe-hotel`)
- [ ] The Chicken Inn Restaurant (`the-chicken-inn-restaurant`)
- [ ] The Garden Cafe (`the-garden-cafe`)
- [ ] Upper Height (`upper-height`)
- [ ] Western Point Serowe (`western-point-serowe`)

### Lobatse (14)

- [ ] Abeah Investments (pty) Ltd (`abeah-investments-pty-ltd`)
- [ ] Arabella Cafe (`arabella-cafe`)
- [ ] Cafe Deo (`cafe-deo`)
- [ ] Chicken Run (`chicken-run-lobatse`)
- [ ] Cumberland Hotel (`cumberland-hotel`)
- [ ] Dana Restaurant (pty) Ltd (`dana-restaurant-pty-ltd`)
- [ ] Danna Restaurant (`danna-restaurant`)
- [ ] J & R Restaurant (`j-and-r-restaurant`)
- [ ] Lola Restaurant (`lola-restaurant`)
- [ ] Nikis Restaurant And Take Aways (`nikis-restaurant-and-take-aways`)
- [ ] Plantation Beer Garden (`plantation-beer-garden`)
- [ ] Rainbow Store And Restaurant (`rainbow-store-and-restaurant`)
- [ ] Southern Liquor Restaurant (`southern-liquor-restaurant`)
- [ ] The Kalahari Kofi Co (`the-kalahari-kofi-co`)

### Molepolole (12)

- [ ] Cafe Latte Coffee Shop-Restaurant (`cafe-latte-coffee-shop-restaurant`)
- [ ] Crowd Restaurant The (`crowd-restaurant-the`)
- [ ] Ipeleng Restaurant & Small General Dealers (`ipeleng-restaurant-and-small-general-dealers`)
- [ ] Kubu Liquor Restaurant And Take Away (`kubu-liquor-restaurant-and-take-away`)
- [ ] Lemepe Lodge (`lemepe-lodge`)
- [ ] Lubah's Moleps Shisanyama (`lubah-s-moleps-shisanyama`)
- [ ] Masa Restaurant (`masa-restaurant`)
- [ ] Motse Bar (`motse-bar`)
- [ ] Perekisi Enterprises (`perekisi-enterprises`)
- [ ] Salt And Pepper Liquor Restaurant (`salt-and-pepper-liquor-restaurant`)
- [ ] Sea Bright (`sea-bright`)
- [ ] Vision Restaurant (`vision-restaurant`)

### Palapye (12)

- [ ] Bonita Gardens (`bonita-gardens`)
- [ ] CNS Gardenex (`cns-gardenex`)
- [ ] Desert Sands Motel (`desert-sands-motel`)
- [ ] Desert Sands Motel & Conferencing (`desert-sands-motel-and-conferencing`)
- [ ] Las Vegas Small General Dealer And Restaurant (`las-vegas-small-general-dealer-and-restaurant`)
- [ ] Majestic Five Hotel (`majestic-five-hotel`)
- [ ] Palapye Hotel (`palapye-hotel`)
- [ ] Shazzy Deli Restaurant (`shazzy-deli-restaurant`)
- [ ] Tadka Indian Restaurant & Bar (`tadka-indian-restaurant-and-bar`)
- [ ] Thatos Steak House (`thatos-steak-house`)
- [ ] Voyager Inn Hotel (`voyager-inn-hotel`)
- [ ] Water Affairs Palapye (`water-affairs-palapye`)

### Kanye (11)

- [ ] Cross Roads Butchery & Restaurant (`cross-roads-butchery-and-restaurant`)
- [ ] Gaamangwe Restaurant And Bottle Store (`gaamangwe-restaurant-and-bottle-store`)
- [ ] Highland Restaurant And Store (`highland-restaurant-and-store`)
- [ ] Ko Gae Cafe (`ko-gae-cafe`)
- [ ] Mareledi Holdings (pty) Ltd (`mareledi-holdings-pty-ltd`)
- [ ] Mmaseapei Rest & Take Away (`mmaseapei-rest-and-take-away`)
- [ ] Mmopakhukhu Restaurant (`mmopakhukhu-restaurant`)
- [ ] Mopa Khukhu Restaurant (`mopa-khukhu-restaurant`)
- [ ] Motse Lodge (`motse-lodge`)
- [ ] Oclin (pty() Ltd (`oclin-pty-ltd`)
- [ ] The Savanna Lodge (`the-savanna-lodge`)

### Ghanzi (10)

- [ ] Ghanzi Town Bar (`ghanzi-town-bar`)
- [ ] Hollandia Restaurant (`hollandia-restaurant`)
- [ ] Kalahari Arms Hotel (`kalahari-arms-hotel`)
- [ ] Kamps Investment (pty) Ltd (`kamps-investment-pty-ltd`)
- [ ] Kontrei Kombuis (`kontrei-kombuis`)
- [ ] Palm Afrique Lodge (`palm-afrique-lodge`)
- [ ] Ratang Restaurant (`ratang-restaurant`)
- [ ] Tandurei (`tandurei-ghanzi`)
- [ ] Tautona Lodge (`tautona-lodge`)
- [ ] Thakadu Camp (`thakadu-camp`)

### Selebi-Phikwe (9)

- [ ] At The Usual Place Liquor Store (`at-the-usual-place-liquor-store`)
- [ ] Botshabelo Central Restaurant (`botshabelo-central-restaurant`)
- [ ] Giavano's Restaurant T/a Pioneer Stationery Bookshop (`giavano-s-restaurant-t-a-pioneer-stationery-bookshop`)
- [ ] Giavanos Pizzeria & Restaurant (`giavanos-pizzeria-and-restaurant`)
- [ ] Grill Master (`grill-master`)
- [ ] International Restaurant & Butchery (`international-restaurant-and-butchery`)
- [ ] Menate Take Away (`menate-take-away`)
- [ ] Travel Inn (`travel-inn`)
- [ ] Visagie Enterprises (pty) Ltd (`visagie-enterprises-pty-ltd`)

### Bobonong (8)

- [ ] Auntie Dorah Liquor Restaurant Take Away (`auntie-dorah-liquor-restaurant-take-away`)
- [ ] Boikhutso Complex (`boikhutso-complex`)
- [ ] Chicken Plus (`chicken-plus`)
- [ ] Just Tswana (`just-tswana`)
- [ ] Lemala Bobonong Restaurant & Bar (`lemala-bobonong-restaurant-and-bar`)
- [ ] Lwapa Restaurant & Catering Services (`lwapa-restaurant-and-catering-services`)
- [ ] Nkoyaphiri Lodge Restaurant (`nkoyaphiri-lodge-restaurant`)
- [ ] Tuli Safari Camp Dining Area (`tuli-safari-camp-dining-area`)

### Mahalapye (7)

- [ ] Green Pastures General Dealer, Bar & Butchery (`green-pastures-general-dealer-bar-and-butchery`)
- [ ] Kaytees Restaurant (`kaytees-restaurant`)
- [ ] Metlhala Restaurant (`metlhala-restaurant`)
- [ ] Morojwa Bar & Liquor Restaurant (`morojwa-bar-and-liquor-restaurant`)
- [ ] Morojwa Liquor Restaurant & General Dealer (`morojwa-liquor-restaurant-and-general-dealer`)
- [ ] Theo's Fried Chicken (`theo-s-fried-chicken`)
- [ ] Thyrsus (`thyrsus`)

### Letlhakane (6)

- [ ] B L Moalosi's Enterprises (pty) Ltd T/a Boteti Hotel (`b-l-moalosi-s-enterprises-pty-ltd-t-a-boteti-hotel`)
- [ ] Granny's Kitchen (`granny-s-kitchen`)
- [ ] Highway Filling Station And Restaurant (`highway-filling-station-and-restaurant`)
- [ ] Kgalagadi Restaurant (`kgalagadi-restaurant`)
- [ ] Stop For A Bite (`stop-for-a-bite`)
- [ ] Welcome Restaurant (`welcome-restaurant`)

### Mochudi (6)

- [ ] Day Liquor Restaurant (`day-liquor-restaurant`)
- [ ] Dijeng Restaurant (`dijeng-restaurant`)
- [ ] Kgolagano Restaurant (`kgolagano-restaurant`)
- [ ] Nna Restaurant (`nna-restaurant`)
- [ ] Road And Rail Restaurant (`road-and-rail-restaurant`)
- [ ] Thamang Enterprises T/a Borakanelo Restaurant & Bar (`thamang-enterprises-t-a-borakanelo-restaurant-and-bar`)

### Nata (6)

- [ ] Bontleng Liquor Restaurants (`bontleng-liquor-restaurants`)
- [ ] Elephant Sands Restaurant (`elephant-sands-restaurant`)
- [ ] Makgadikgadi Bar And Restaurant (`makgadikgadi-bar-and-restaurant`)
- [ ] Nata Lodge Restaurant (`nata-lodge-restaurant`)
- [ ] Pelican Lodge (`pelican-lodge`)
- [ ] Wild Beast Butchery And Restaurant (`wild-beast-butchery-and-restaurant`)

### Phakalane (6)

- [ ] Art Cosmopolitan (`art-cosmopolitan`)
- [ ] Casa Del Sol (`casa-del-sol`)
- [ ] Habanos (`habanos`)
- [ ] Iberia Georgian Restaurant (`iberia-georgian-restaurant`)
- [ ] Milky Lane (`milky-lane-phakalane`)
- [ ] Pat Thai (`pat-thai`)

### Ramotswa (6)

- [ ] Krust Kulcha Pizza (`krust-kulcha-pizza`)
- [ ] Mthanjeni 4 Way Liquor Restaurant (`mthanjeni-4-way-liquor-restaurant`)
- [ ] Pitse e Sule (`pitse-e-sule`)
- [ ] Plateau Restaurant (`plateau-restaurant`)
- [ ] Ramoems Cafe/Restaurant (`ramoems-cafe-restaurant`)
- [ ] The Sahara Café and Bar (`the-sahara-cafe-and-bar`)

### Gumare (5)

- [ ] Best Food Restaurant (`best-food-restaurant`)
- [ ] Gumare Executive Lodge (`gumare-executive-lodge`)
- [ ] Kamore Guest Inn (`kamore-guest-inn`)
- [ ] Mopiri Camp (`mopiri-camp`)
- [ ] The Grill (`the-grill`)

### Rakops (5)

- [ ] GOBE Restaurant (`gobe-restaurant`)
- [ ] Kwa Ga Xhubus Bar And Grill Rakops (`kwa-ga-xhubus-bar-and-grill-rakops`)
- [ ] Nengu Restaurant (`nengu-restaurant`)
- [ ] Rakops River Lodge (`rakops-river-lodge`)
- [ ] Xere Motel (`xere-motel`)

### Unknown (5)

- [ ] Delicious Bite Pizzeria Takeaway (`delicious-bite-pizzeria-takeaway`)
- [ ] Denjebuya Restaurant (`denjebuya-restaurant-branch`)
- [ ] George's Pub & Grill (`george-s-pub-and-grill`)
- [ ] Lido Liquor Restaurant (`lido-liquor-restaurant`)
- [ ] Something Fishy (`something-fishy`)

### Shakawe (4)

- [ ] Bonmagkem Restaurant (`bonmagkem-restaurant`)
- [ ] Drotsky's Cabins (`drotsky-s-cabins`)
- [ ] Jasmine's Restaurant (`jasmine-s-restaurant`)
- [ ] The Eatery Joint (`the-eatery-joint`)

### Tlokweng (4)

- [ ] At Nine Eatery + Cocktail Bar (`at-nine-eatery-cocktail-bar-tlokweng`)
- [ ] Founders Restaurant (`founders-restaurant`)
- [ ] RasmaRose Garden (`rasmarose-garden`)
- [ ] The Brassiere (`the-brassiere`)

### Orapa (2)

- [ ] Golf Club House (`golf-club-house`)
- [ ] Makumutu Safari Lodge & Camp Restaurant (`makumutu-safari-lodge-and-camp-restaurant`)

### Sebina (2)

- [ ] Botshelo Bar Restaurant And Butchery (`botshelo-bar-restaurant-and-butchery`)
- [ ] Welcome Bar Restaurant (`welcome-bar-restaurant`)

### Selebi Phikwe (2)

- [ ] Giavano's (`giavano-s`)
- [ ] Syringa Lodge (`syringa-lodge`)

### Tutume (2)

- [ ] Big House Bar Restaurant And General Dealer The (`big-house-bar-restaurant-and-general-dealer-the`)
- [ ] Kodwamunthu Liquor Restaurant (`kodwamunthu-liquor-restaurant`)

### Dukwi (1)

- [ ] Dukwi Restaurant And Butchery (`dukwi-restaurant-and-butchery`)

### Gweta (1)

- [ ] Maano Restaurant (`maano-restaurant`)

### Jwaneng (1)

- [ ] The Diamond Café (`the-diamond-cafe`)

### Maitengwe (1)

- [ ] Denjebuya Restaurant (`denjebuya-restaurant`)

### Mathangwane (1)

- [ ] Kutlo Restaurant (`kutlo-restaurant`)

### Nkange (1)

- [ ] Maja Restaurant (`maja-restaurant`)

### P.O.Box 99 (1)

- [ ] Dublin Arms Restaurant (`dublin-arms-restaurant`)

### Selibe Phikwe (1)

- [ ] Safaris Unravelled (Pty) Ltd t/a Markab Cakes (`safaris-unravelled-pty-ltd-t-a-markab-cakes`)

### Shoshong (1)

- [ ] Shoshong Supermarket (`shoshong-supermarket`)

## Unused logo art

Files in `assets/logo/` that no manifest key and no record `logo` field points at:

- `assets/logo/Boxer_Liqours_Logo.png`
- `assets/logo/cresta_lodge.jpg`
- `assets/logo/liqourama_logo.jpg`
- `assets/logo/pie_city_logo_badge_thumbnail.jpg`
- `assets/logo/roco_mamas_logo_letter.png`
- `assets/logo/sefalana_logo.jpg`
- `assets/logo/the_food_place_logo.jpg`
- `assets/logo/tops_logo.png`
- `assets/logo/wimpy-main-logo.svg`
- `assets/logo/zorz_logo.jpg`

## Related data bugs

- Seed rows carry a default district code `01` / town `Gaborone`
  (`js/eatouts-seed-data.js`), and `mergeDirectory()` only fills empty location
  fields (`js/eatouts-seed.js`), so venues outside Gaborone display Gaborone in
  the app. Towns in this document come from the directory data instead.
- `logoFor()` is declared twice in `js/eatouts-brand.js` (lines 96 and 210);
  hoisting makes line 210 win, so the earlier `isUsableLogo`-validated version
  is dead code.

