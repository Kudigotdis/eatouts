/* Event Types Directory & Taxonomy.
   Authored source for the Events tab. Loaded via <script> so file:// works
   (mirrors assets/data/eatouts_terms_of_service.js). Exposes:
     window.EATOUTS_EVENT_TAXONOMY  - the raw category -> subCategories -> events tree
     window.EATOUTS_EVENT_TYPES     - { taxonomy, getCategories, getAllEventTypes, getEventById } */
(function () {
  var EVENT_TAXONOMY = {
    weddings_cultural: {
      id: "weddings_cultural",
      name: "Weddings & Cultural Traditions",
      icon: "💍",
      subCategories: [
        {
          name: "Pre-Wedding Socials",
          events: [
            { id: "engagement_party", name: "Engagement Party" },
            { id: "bridal_shower", name: "Bridal Shower" },
            { id: "kitchen_tea", name: "Kitchen Tea" },
            { id: "bachelor_party", name: "Bachelor Party" },
            { id: "bachelorette_party", name: "Bachelorette Party" },
            { id: "jack_and_jill", name: "Jack and Jill / Stag & Doe" }
          ]
        },
        {
          name: "Ceremony & Weekend",
          events: [
            { id: "rehearsal_dinner", name: "Rehearsal Dinner" },
            { id: "wedding_ceremony", name: "Wedding Ceremony" },
            { id: "wedding_reception", name: "Wedding Reception" },
            { id: "post_wedding_brunch", name: "Post-Wedding Brunch / Day-After Lunch" },
            { id: "destination_wedding", name: "Destination Wedding" },
            { id: "vow_renewal", name: "Vow Renewal" }
          ]
        },
        {
          name: "Setswana Cultural Events (Batswana)",
          events: [
            {
              id: "setswana_patlo",
              name: "Patlo / Go Tshwarwa",
              description: "The Seeking: Official initial gathering asking for the bride's hand"
            },
            {
              id: "setswana_bogadi",
              name: "Bogadi / Magadi",
              description: "Bride Wealth Negotiations: Assembly establishing bride price"
            },
            {
              id: "setswana_go_lefa",
              name: "Go Lefa",
              description: "Delivery of Magadi: Formal delivery of agreed bride price and gifts"
            },
            {
              id: "setswana_go_laa",
              name: "Go Laa",
              description: "Traditional Counseling: Elder advice on marriage protocols"
            },
            {
              id: "setswana_kgoroso",
              name: "Kgoroso / Go Isiwa ga Ngwetsi",
              description: "Welcoming the Bride: Multi-day celebration escorting bride to groom's homestead"
            }
          ]
        },
        {
          name: "Shona Cultural Events (Mashona)",
          events: [
            {
              id: "shona_kuvhura_muromo",
              name: "Kuvhura Muromo",
              description: "Opening of the Mouth: Preliminary introductory payment"
            },
            {
              id: "shona_zvigadzirwa",
              name: "Zvigadzirwa / Groceries Presentation",
              description: "Delivery of bulk household goods and hampers"
            },
            {
              id: "shona_roora_lobola",
              name: "Roora / Lobola Day",
              description: "Main negotiations for cash and cattle"
            },
            {
              id: "shona_rutsambo_danga",
              name: "Rutsambo & Danga",
              description: "Exclusive companionship payment and long-term asset negotiation"
            },
            {
              id: "shona_mombe_yeumai",
              name: "Mombe yeUmai",
              description: "Presentation of live cow dedicated to mother-in-law"
            },
            {
              id: "shona_majasi",
              name: "Majasi Presentation",
              description: "Formal clothing gifts presented to the bride's parents"
            },
            {
              id: "shona_kupindisa_muroora",
              name: "Kupindisa Muroora",
              description: "Bride Welcome Ceremony feast at groom's home"
            },
            {
              id: "shona_masungiro",
              name: "Masungiro",
              description: "First pregnancy thank-offering honoring bride's parents"
            }
          ]
        }
      ]
    },

    corporate: {
      id: "corporate",
      name: "Corporate Events",
      icon: "💼",
      subCategories: [
        {
          name: "Business & Strategy",
          events: [
            { id: "agm", name: "Annual General Meeting (AGM)" },
            { id: "board_meeting", name: "Board Meeting" },
            { id: "shareholder_meeting", name: "Shareholder Meeting" },
            { id: "executive_retreat", name: "Executive Retreat" }
          ]
        },
        {
          name: "Knowledge & Industry",
          events: [
            { id: "conference", name: "Conference" },
            { id: "seminar", name: "Seminar" },
            { id: "workshop", name: "Workshop" },
            { id: "press_conference", name: "Press Conference" }
          ]
        },
        {
          name: "Expositions & Sales",
          events: [
            { id: "trade_show", name: "Trade Show" },
            { id: "expo", name: "Expo" },
            { id: "product_launch", name: "Product Launch" },
            { id: "sales_kickoff", name: "Sales Kick-Off (SKO)" },
            { id: "popup_retail", name: "Pop-Up Retail / Showroom" }
          ]
        },
        {
          name: "Team & Culture",
          events: [
            { id: "team_building", name: "Team-Building Event" },
            { id: "company_milestone", name: "Company Milestone" },
            { id: "incentive_trip", name: "Incentive Trip" },
            { id: "company_retreat", name: "Company Offsite / Retreat" }
          ]
        },
        {
          name: "Networking & Talent",
          events: [
            { id: "networking_event", name: "Networking Event" },
            { id: "recruiting_event", name: "Recruiting Event" },
            { id: "job_fair", name: "Job Fair" }
          ]
        },
        {
          name: "Galas & VIP",
          events: [
            { id: "corporate_gala", name: "Corporate Gala" },
            { id: "award_ceremony", name: "Award Ceremony" },
            { id: "corporate_dinner", name: "Corporate Dinner" },
            { id: "vip_event", name: "VIP Event" }
          ]
        },
        {
          name: "Internal & Operations",
          events: [
            { id: "town_hall", name: "Town Hall / All-Hands" },
            { id: "investor_day", name: "Investor Relations Day" }
          ]
        }
      ]
    },

    social: {
      id: "social",
      name: "Social & Celebrations",
      icon: "🎉",
      subCategories: [
        {
          name: "Milestones & Life Steps",
          events: [
            { id: "baby_shower", name: "Baby Shower" },
            { id: "gender_reveal", name: "Gender Reveal Party" },
            { id: "birthday_party", name: "Birthday Party" },
            { id: "quinceanera", name: "Quinceañera" },
            { id: "sweet_sixteen", name: "Sweet Sixteen" },
            { id: "anniversary", name: "Anniversary" },
            { id: "retirement_party", name: "Retirement Party" }
          ]
        },
        {
          name: "Academic & Youth",
          events: [
            { id: "graduation_party", name: "Graduation Party" },
            { id: "prom", name: "Prom" },
            { id: "formal", name: "Formal" }
          ]
        },
        {
          name: "Gatherings & Socials",
          events: [
            { id: "family_reunion", name: "Family Reunion" },
            { id: "housewarming", name: "Housewarming Party" },
            { id: "dinner_party", name: "Dinner Party" },
            { id: "cocktail_party", name: "Cocktail Party" },
            { id: "holiday_party", name: "Holiday Party" }
          ]
        },
        {
          name: "Rites of Passage",
          events: [
            { id: "coming_of_age", name: "Coming of Age / Debutante" },
            { id: "christening", name: "Naming Ceremony / Christening" }
          ]
        }
      ]
    },

    arts_performance: {
      id: "arts_performance",
      name: "Arts & Performances",
      icon: "🎭",
      subCategories: [
        {
          name: "Music & Live Acts",
          events: [
            { id: "music_festival", name: "Music Festival" },
            { id: "concert", name: "Concert" },
            { id: "gig", name: "Gig" },
            { id: "busking", name: "Busking / Street Performance" }
          ]
        },
        {
          name: "Visual Arts & Fashion",
          events: [
            { id: "art_exhibition", name: "Art Exhibition" },
            { id: "gallery_opening", name: "Gallery Opening" },
            { id: "fashion_show", name: "Fashion Show" },
            { id: "runway_event", name: "Runway Event" }
          ]
        },
        {
          name: "Stage & Theater",
          events: [
            { id: "theatre_performance", name: "Theatre Performance" },
            { id: "stage_play", name: "Stage Play" },
            { id: "comedy_show", name: "Stand-Up Comedy Show" },
            { id: "talent_show", name: "Talent Show" },
            { id: "poetry_slam", name: "Poetry Slam" },
            { id: "open_mic", name: "Open Mic Night" }
          ]
        }
      ]
    },

    film_media: {
      id: "film_media",
      name: "Film & Media",
      icon: "🎬",
      subCategories: [
        {
          name: "Cinema & Screenings",
          events: [
            { id: "film_festival", name: "Film Festival" },
            { id: "movie_premiere", name: "Movie Premiere" },
            { id: "film_screening", name: "Film Screening" },
            { id: "drive_in_cinema", name: "Drive-In / Outdoor Screening" }
          ]
        },
        {
          name: "Digital & Broadcast",
          events: [
            { id: "livestream", name: "Livestream" },
            { id: "digital_summit", name: "Digital Summit" },
            { id: "press_junket", name: "Press Junket" },
            { id: "listening_party", name: "Watch / Listening Party" }
          ]
        }
      ]
    },

    food_drink: {
      id: "food_drink",
      name: "Food & Drink",
      icon: "🍽️",
      subCategories: [
        {
          name: "Tastings & Pop-ups",
          events: [
            { id: "wine_tasting", name: "Wine Tasting" },
            { id: "beer_expo", name: "Craft Beer Expo" },
            { id: "culinary_popup", name: "Culinary Pop-up" },
            { id: "mixology_class", name: "Mixology / Cooking Masterclass" }
          ]
        },
        {
          name: "Festivals & Heritage",
          events: [
            { id: "food_festival", name: "Food Festival" },
            { id: "drink_festival", name: "Drink Festival" },
            { id: "food_truck_rally", name: "Food Truck Rally" },
            { id: "chef_table", name: "Chef's Table Experience" },
            { id: "cultural_festival", name: "Cultural Festival" },
            { id: "historic_reenactment", name: "Historic Reenactment" }
          ]
        }
      ]
    },

    community_causes: {
      id: "community_causes",
      name: "Community & Causes",
      icon: "🤝",
      subCategories: [
        {
          name: "Fundraising & Charity",
          events: [
            { id: "charity_gala", name: "Charity Gala" },
            { id: "fundraising_auction", name: "Fundraising Auction" },
            { id: "benefit_concert", name: "Benefit Concert" },
            { id: "food_drive", name: "Food Drive" },
            { id: "awareness_walk", name: "Awareness Walk / Run" },
            { id: "volunteering_day", name: "Charity Build / Volunteering Day" }
          ]
        },
        {
          name: "Neighborhood & Civic",
          events: [
            { id: "community_market", name: "Community Market" },
            { id: "farmers_market", name: "Farmers Market" },
            { id: "block_party", name: "Block Party" },
            { id: "cleanup_day", name: "Neighborhood Cleanup" },
            { id: "town_hall", name: "Town Hall" },
            { id: "civic_rally", name: "Civic Rally" },
            { id: "parade", name: "Parade" }
          ]
        },
        {
          name: "Culture & Religion",
          events: [
            { id: "holiday_festival", name: "Holiday Festival" },
            { id: "religious_ceremony", name: "Religious Ceremony" },
            { id: "baptism", name: "Baptism" },
            { id: "bar_bat_mitzvah", name: "Bar / Bat Mitzvah" },
            { id: "memorial_service", name: "Memorial Service / Wake" }
          ]
        }
      ]
    },

    sports_fitness: {
      id: "sports_fitness",
      name: "Sports & Fitness",
      icon: "🏆",
      subCategories: [
        {
          name: "Competitive Sports",
          events: [
            { id: "tournament", name: "Tournament" },
            { id: "sports_meet", name: "Sports Meet" },
            { id: "match_game", name: "Match / Game" }
          ]
        },
        {
          name: "Races & Endurance",
          events: [
            { id: "marathon", name: "Marathon / Half-Marathon" },
            { id: "triathlon", name: "Triathlon" },
            { id: "fun_run", name: "Fun Run" },
            { id: "obstacle_race", name: "Obstacle Course Race" }
          ]
        },
        {
          name: "Wellness & Mind-Body",
          events: [
            { id: "fitness_bootcamp", name: "Fitness Bootcamp" },
            { id: "wellness_retreat", name: "Wellness Retreat" },
            { id: "yoga_workshop", name: "Yoga Workshop" },
            { id: "meditation_seminar", name: "Meditation Seminar" }
          ]
        }
      ]
    },

    tech_learning: {
      id: "tech_learning",
      name: "Tech & Learning",
      icon: "💡",
      subCategories: [
        {
          name: "Gaming & Tech",
          events: [
            { id: "esports_tournament", name: "Esports Tournament" },
            { id: "gaming_convention", name: "Gaming Convention" },
            { id: "hackathon", name: "Hackathon / Codefest" },
            { id: "demo_day", name: "Pitch Competition / Demo Day" }
          ]
        },
        {
          name: "Academic & Institutional",
          events: [
            { id: "academic_lecture", name: "Academic Lecture" },
            { id: "debate_panel", name: "Debate / Panel" },
            { id: "science_fair", name: "Science Fair" },
            { id: "graduation", name: "School Graduation / Commencement" },
            { id: "alumni_reunion", name: "Alumni Reunion" },
            { id: "orientation_day", name: "Orientation Day" }
          ]
        },
        {
          name: "Digital & Continuous Learning",
          events: [
            { id: "continuing_education", name: "Continuing Education Class" },
            { id: "webinar", name: "Webinar" },
            { id: "virtual_conference", name: "Virtual / Hybrid Conference" },
            { id: "online_workshop", name: "Online Workshop" }
          ]
        }
      ]
    },

    mega_events: {
      id: "mega_events",
      name: "Mega Events",
      icon: "🌍",
      subCategories: [
        {
          name: "Large-Scale Public Events",
          events: [
            { id: "world_expo", name: "World Expo" },
            { id: "hallmark_event", name: "Hallmark Event" },
            { id: "carnival", name: "Carnival" },
            { id: "themed_convention", name: "Themed Convention" },
            { id: "global_sports", name: "Global Sports Tournament (e.g., World Cup)" }
          ]
        }
      ]
    }
  };

  /* Helper utilities for other surfaces (dropdowns, lookups). */
  function getCategories() {
    return Object.keys(EVENT_TAXONOMY).map(function (k) {
      var cat = EVENT_TAXONOMY[k];
      return { id: cat.id, name: cat.name, icon: cat.icon };
    });
  }
  function getAllEventTypes() {
    var all = [];
    Object.keys(EVENT_TAXONOMY).forEach(function (k) {
      var category = EVENT_TAXONOMY[k];
      (category.subCategories || []).forEach(function (sub) {
        (sub.events || []).forEach(function (event) {
          all.push(Object.assign({}, event, {
            categoryId: category.id,
            categoryName: category.name,
            subCategoryName: sub.name
          }));
        });
      });
    });
    return all;
  }
  function getEventById(eventId) {
    return getAllEventTypes().filter(function (e) { return e.id === eventId; })[0] || null;
  }

  window.EATOUTS_EVENT_TAXONOMY = EVENT_TAXONOMY;
  window.EATOUTS_EVENT_TYPES = {
    taxonomy: EVENT_TAXONOMY,
    getCategories: getCategories,
    getAllEventTypes: getAllEventTypes,
    getEventById: getEventById
  };
})();
