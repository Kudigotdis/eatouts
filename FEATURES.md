# EatOuts — Feature Overview

EatOuts is a mobile-first restaurant discovery app for Botswana. It brings together restaurant discovery, daily promotions, local events, venue booking and direct WhatsApp ordering into one place — built for a phone in your hand, served straight from the web.

**Five tabs do all the work:** Promos, Restaurants, Reserve, Gallery and About.

---

## At a Glance

| Capability | What it means |
| --- | --- |
| **563 restaurants & places** | A curated directory of eateries, coffee spots, bars and venues across Botswana |
| **12 featured venues** | A pinned shortlist (including The Yellow Giraffe, KFC, Nando's, Mozambik, Spur and The Game Reserve) always shown first |
| **Daily promos & events** | A constantly refreshed feed of deals and happenings, searchable by town, area and promo type |
| **Weekday featured events** | One headline event leads each day of the Promos feed — Simply Piano, Social Link, Kumnandi Ekhaya, Mas MusiQ, Motse Wa Setso, Kofifi Nights, AmaPiano Fest and Masa Poetry Nights |
| **Order & Split the Bill** | Browse menus, build an order and send it to a restaurant on WhatsApp — or split it across friends |
| **118 event types** | Venue booking inquiries across 9 categories, from weddings and conferences to esports and film festivals |
| **Event Planner** | A working organiser for an event — lineup, schedule, tickets, budget, vendors, guests and seating in one place |
| **EatOuts Blog** | A feed of stories, guides and local happenings across Botswana's food and events scene |
| **Photo gallery** | Scoped to a viewed restaurant, town or area, filterable by Promos / Events / Food / Timeline, hashtag-searchable and fullscreen |
| **WhatsApp-first** | Every enquiry, order and booking is a single WhatsApp message — no accounts, no card details, nothing to install |

---

## Discover Restaurants

- **Search the full directory** by name or keyword across **563 curated venues**.
- **Filter by town, district and area** with live venue counts shown inside every filter.
- **Filter by cuisine or type** (multi-select) — combo filters, like "Gaborone + steakhouse", work instantly.
- **Curated ordering**: the 12 featured venues lead, followed by venues with real logos, then the rest — so the best-known places surface first.
- **Tap any venue** to expand quick actions without leaving the list.

## Beverages & Liquors

A second page inside the Restaurants tab — swipe the list sideways (or use the **Restaurants · Beverages** strip at the top) to open it.

- **Drinks** (230 products): Fizzy Drinks, Fruit Juices, Iced Tea, Water, Energy and Cordials as six tappable tiles in two columns. Categories with no stock stay visible but greyed out as "Coming soon".
- **Liqours** (389 products): Beers & AFBs, Ciders, Brandy, Rum, Vodka, Wines, Gin, Champagne & MCC, Spirits, Tequila and Liqueurs — eleven rounded-square thumbnails in a two-column grid, no chevrons.
- **Item rows** show the photo, name, size and price, with an **Add** button that turns into a −/+ stepper.
- **Prices are shown in Pula (BWP)** — normalised from the source catalogues, no markup.
- **Order & send**: the checkout summarises the cart and offers two buttons — send it to EatOuts on **+267 718 29765**, or share it as text to WhatsApp and pick the contact yourself.
- **Split the Bill** works here too: add names, hand each drink to whoever is paying, and send each person their share — or send the whole split in one message.
- Product photos are pre-generated into `assets/images/beverages/` and `assets/images/alcohol/`; items without a photo are hidden from the lists.
- Data lives in `assets/data/beverages.json` and `assets/data/alcohols.json`, rebuilt by `scripts/build_beverage_data.py` from the merged `assets/data/source/Beverages.*` and `Alcohols.*` catalogues.

## Every Restaurant Has Its Own Page

From the directory, tap **Menu**, **Book Venue**, **Promos** or **About**:

- **Menu** — browse a venue's full menu by category, with photos, size variants and extras, grouped the way the restaurant serves it.
- **Book Venue** — a one-form booking inquiry: event type, preferred date, estimated guests and notes, sent straight to the venue on WhatsApp.
- **Promos** — every live deal the venue is running, with savings shown, plus a one-tap WhatsApp enquiry per promo.
- **About** — logo, description, hours, location, contact details and the venue's full set of social links.

**The social grid** is consistent everywhere: each venue can show Instagram, Facebook, WhatsApp, TikTok, X, YouTube, Website, Call and GPS — with unavailable channels clearly dimmed, so you always know what's live.

## Daily Promos & Events

- A **promo feed organised by day**, every entry showing the deal, what's included, the price, the "was" price and your saving.
- **Bar & bottle promos** (`assets/data/beverage-and-bar-promotions.json`, 23 brand-led offers with their own artwork) run in the same feed. They are not tied to one venue, so they follow you whichever town is selected. The source module (`assets/data/source/beverage_and_bar_promotions.js`) is rewritten by the build with the same artwork and drink styles, so the two can never drift apart.
- **Type filter in four segments — All · Combos · Food · Beverages** — tap a segment, or **swipe the popup left/right** (arrow keys work too). Tapping **All** closes the popup and clears every tick.
- **Tick lists depend on the segment**: Combos and Food list the restaurant **cuisines**, Beverages lists one fixed drink list — Beverages, Spirits, Beers, Brandy, Champagne, Ciders, Cold Drinks, Red Wines, Fizzy Drinks, Fruit Juices, Gin, Tequila, Rum, Vodka — and All shows cuisines plus drinks together. Promos that mix food and drink are filed under **Combos**, and a platter served "without beer" still counts as food.
- **Town, district and area filters** keep their live counts and work together with the type filter.
- **Every promo carries a category** — restaurant promos derive it from their own copy, bar promos declare it, and the drink ticks come from a fixed vocabulary that matches the copy (a gin promo answers to both *Gin* and *Spirits*).
- Promos with no listed price skip the price and the booking block — you get the style, the brand and an **Ask on WhatsApp** button instead.
- **Featured event of the day** leads the feed — flyer, date, venue, lineup, ticket prices, outlets, sponsors and tags, expanding in place with a one-tap WhatsApp enquiry.
- **Masa Poetry Nights** (Sundays, stacked with Kofifi Nights) keeps its full detail: ticket info, the complete artist roster with a *Show all* toggle, and a WhatsApp reservation request.
- **Events by day** highlight local happenings — name, description, time, highlights and sponsor.

## Order & Split the Bill

- Build an order from a venue's menu — each restaurant keeps its **own basket**, so switching venues never mixes orders.
- Add quantities, sizes and extras as you go; a floating cart badge keeps track.
- At checkout: your **name, contact number and notes**, a live order total, then **Send via WhatsApp** straight to the restaurant.
- **Split the Bill** turns one order into a group checkout:
  - **Add everyone's name**, then assign each item's servings per person with +/− steppers.
  - Live **per-person totals** update as you assign, with any unassigned items clearly separated.
  - **Send the Full Bill to the restaurant** on WhatsApp, or send **each person's share** separately — the app opens your phone's WhatsApp contacts so every friend gets their exact portion, with the restaurant's number at the bottom of the message for the transfer.
  - Splits reset cleanly whenever you switch venues.

## Reserve a Space

A full venue-booking enquiry flow for **9 categories** and **118 event types**:

- **Corporate Events** — conferences, launches, galas, AGMs, retreats and more.
- **Social & Celebrations** — weddings, birthdays, showers, grad parties and more.
- **Arts & Performances** — concerts, exhibitions, theatre, comedy, talent shows and poetry slams.
- **Film & Media** — festivals, premieres, screenings, livestreams and digital summits.
- **Food & Drink** — festivals, tastings, craft beer expos and culinary pop-ups.
- **Community & Causes** — charity galas, fundraisers, markets and block parties.
- **Sports & Fitness** — tournaments, marathons, bootcamps, retreats and wellness workshops.
- **Tech & Learning** — hackathons, esports, lectures, webinars and conferences.
- **Mega Events** — carnivals, world expos and large-scale themed events.

Pick a category, choose the event type, give a date, guest count and notes, and the inquiry is sent to the venue on WhatsApp — no paperwork, no phone queues.

## Gallery

- Every photo from the venue's **events, food and gallery** collections in one place, on a Gallery page that keeps the top header in view.
- **Viewed Restaurant** picker (floating): a *Town/City | Area* row, live search and an alphabetical venue list — pick a venue and the grid switches to that venue's own promos, events and a venue-specific slice of the photo pool. Picking a town or area alone re-scopes the grid too.
- **Gallery View Filter** between All / Promos / Events / Food / Timeline and **search live** by name or `#hashtag`. Promo and event images carry the real hashtags of the events they belong to.
- **Tap any photo** for a fullscreen, finger-swipeable viewer with page dots.

## Event Planner

A dedicated organiser (`eatouts-event-planner.html`) that turns a booking inquiry into a plan you can actually run:

- **Lineup & Schedule** — lay out the acts/performers and a running order for the day.
- **Ticketing** — ticket tiers and pricing, with sponsor slots alongside them.
- **Budget** — track planned vs. estimated spend across the whole event.
- **Vendors** — attach suppliers and services (catering, sound, décor and more) to the plan.
- **Guests & Seating** — capture guest counts and seating arrangements in one place.
- Once the plan is set, it flows into the same WhatsApp-first enquiry/booking path as the rest of EatOuts.

## Blog

- **EatOuts Blog** (`eatouts-blog.html`) — an editorial feed of stories, guides and local happenings from around Botswana's food and events scene.
- Every post carries a **cover image, title, author and publish date**, and is tagged so related stories group together.
- Posts render **in-app** in the site's phone-shell styling, so reading a story never leaves the app.

- **About EatOuts** — the brand story, focus areas, featured city and "Why It Works" highlights, plus **Install EatOuts** (APK installer) and shortcuts to the **Blog** and **Event Planner**.
- **Terms of Service** (19 sections) and **Privacy Policy** — full, in-app legal documents with version numbers and last-updated dates. The app collects **no personal data**: as a diner you need no account, and no payment or contact details are ever stored.
- **Operator access** — restaurant owners can sign in to manage their profile, menu, promotions, events, gallery and booking settings, with a one-tap Demo letting anyone preview ownership of The Yellow Giraffe.

---

## Design & Experience Notes

- **Mobile-first, portrait-first** phone shell with a clean 5-button navigation bar.
- **Local-first and offline-friendly**: the entire directory, menus, promos and gallery ship with the app — fast load, works on file servers, no account needed.
- **Keyboard-friendly conveniences**: Escape closes filters, Enter adds a split-the-bill name, and live-search keeps your cursor where you typed.