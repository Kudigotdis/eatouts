/* ============================================================
   EATOUTS SUPPLIER CATALOG + DYNAMIC ONBOARDING SCHEMAS
   Version: 2.0.0

   Backwards compatible with the original catalog:
   - window.EATOUTS_SUPPLIER_CATALOG remains an array.
   - category.items remains an array of type names.
   - category.types remains an array of { id, name, note } records,
     now enriched with an `onboarding` schema.

   The catalog defines what the UI should ask. It does not implement
   the forms, calculations, validation, persistence, or booking flow.
   ============================================================ */
(function () {
  'use strict';

  var SCHEMA_VERSION = '2.0.0';

  var ONBOARDING_CONFIG = {
    providerTypeFirst: true,
    flow: [
      'provider_type', 'supplier_type', 'business_profile', 'capabilities',
      'offerings', 'pricing', 'availability', 'logistics_and_compliance', 'review'
    ],
    itemManagement: {
      collectionKey: 'offerings',
      allowMultiple: true,
      allowAdd: true,
      allowRemove: true,
      allowDuplicate: true,
      allowReorder: true,
      allowDrafts: true,
      addLabel: 'Add another offering',
      duplicateLabel: 'Duplicate offering',
      removeLabel: 'Remove offering',
      removeConfirmation: 'Remove this offering? This cannot be undone after saving.',
      minimumItems: 1,
      emptyState: 'Add at least one product, service, package, or rental item to your supplier profile.',
      eachItemHasItsOwnPrice: true,
      eachItemHasItsOwnAvailability: true,
      eachItemHasItsOwnDescription: true,
      eachItemHasItsOwnPhotos: true
    },
    pricingModelOptions: [
      { id: 'fixed_fee', label: 'Fixed fee', help: 'One price for a clearly defined scope.' },
      { id: 'per_hour', label: 'Per hour', help: 'Price multiplied by booked hours.' },
      { id: 'per_day', label: 'Per day', help: 'Daily hire or service rate.' },
      { id: 'half_day', label: 'Half-day rate', help: 'A defined half-day booking block.' },
      { id: 'full_day', label: 'Full-day rate', help: 'A defined full-day booking block.' },
      { id: 'per_event', label: 'Per event', help: 'One rate for the specified event scope.' },
      { id: 'package', label: 'Package price', help: 'A bundle with specified inclusions and limits.' },
      { id: 'per_person', label: 'Per person / guest', help: 'Quantity is based on people served or attending.' },
      { id: 'per_guest', label: 'Per guest', help: 'Price scales by confirmed guest count.' },
      { id: 'per_item', label: 'Per item', help: 'Price for each unit or item selected.' },
      { id: 'per_unit', label: 'Per unit', help: 'Price for a clearly named charge unit.' },
      { id: 'per_platter', label: 'Per platter', help: 'Price per platter, with serving size stated.' },
      { id: 'per_boxed_meal', label: 'Per boxed meal', help: 'Price for each packed meal.' },
      { id: 'per_serving', label: 'Per serving', help: 'Price for each serving dispensed.' },
      { id: 'per_bottle', label: 'Per bottle', help: 'Price for each bottle.' },
      { id: 'per_case', label: 'Per case / carton', help: 'Price per case or carton; state its contents.' },
      { id: 'per_crate', label: 'Per crate', help: 'Price per crate; state bottle / can count.' },
      { id: 'per_set', label: 'Per set', help: 'One price for a defined matching set.' },
      { id: 'per_arrangement', label: 'Per arrangement', help: 'Price for each floral or styled arrangement.' },
      { id: 'per_stem', label: 'Per stem', help: 'Price for each stem.' },
      { id: 'per_metre', label: 'Per linear metre', help: 'Price per measured linear metre.' },
      { id: 'per_square_metre', label: 'Per square metre', help: 'Price per measured square metre.' },
      { id: 'per_area', label: 'Per area / zone', help: 'Price for each defined area or zone.' },
      { id: 'per_station', label: 'Per station', help: 'Price for each staffed or equipped specialty station.' },
      { id: 'design_fee', label: 'Design fee', help: 'Price for design or programming work, separate from equipment hire.' },
      { id: 'contract', label: 'Contract rate', help: 'Rate for a defined service contract or coverage period.' },
      { id: 'per_image', label: 'Per final image', help: 'Price for each selected or edited image.' },
      { id: 'per_room', label: 'Per room', help: 'Price per room or defined space.' },
      { id: 'per_fixture', label: 'Per fixture', help: 'Price for each lighting or technical fixture.' },
      { id: 'per_screen', label: 'Per screen', help: 'Price for each display screen.' },
      { id: 'per_mic', label: 'Per microphone', help: 'Price for each microphone.' },
      { id: 'per_channel', label: 'Per channel', help: 'Price for each available technical channel.' },
      { id: 'per_activation', label: 'Per activation', help: 'Price for each effect activation.' },
      { id: 'per_effect_unit', label: 'Per effect unit', help: 'Price per effect unit or piece of equipment.' },
      { id: 'per_routine', label: 'Per routine', help: 'Price per choreographed routine.' },
      { id: 'per_set', label: 'Per performance set', help: 'Price for each agreed performance set.' },
      { id: 'per_performer', label: 'Per performer', help: 'Price multiplied by performer count.' },
      { id: 'per_talk', label: 'Per talk', help: 'Price for one talk or address.' },
      { id: 'per_rehearsal', label: 'Per rehearsal', help: 'Price for each rehearsal session.' },
      { id: 'per_invitation', label: 'Per invited guest', help: 'Price per invited guest managed.' },
      { id: 'per_print', label: 'Per printed piece', help: 'Price per print; specify size and finish.' },
      { id: 'per_batch', label: 'Per batch', help: 'Price for a defined production batch.' },
      { id: 'per_deliverable', label: 'Per deliverable', help: 'Price per edited asset or agreed deliverable.' },
      { id: 'per_hour', label: 'Per hour', help: 'Price multiplied by booked hours.' },
      { id: 'per_staff_hour', label: 'Per staff-hour', help: 'Price multiplied by each staff member and hour.' },
      { id: 'per_staff_shift', label: 'Per staff shift', help: 'Price per staff member for a defined shift.' },
      { id: 'per_guard_hour', label: 'Per guard-hour', help: 'Price for each guard per hour.' },
      { id: 'per_guard_shift', label: 'Per guard shift', help: 'Price per guard for a defined shift.' },
      { id: 'per_marshal_hour', label: 'Per marshal-hour', help: 'Price for each marshal per hour.' },
      { id: 'per_crew_hour', label: 'Per crew-hour', help: 'Price for each crew member per hour.' },
      { id: 'per_team_hour', label: 'Per team-hour', help: 'Price for a defined team per hour.' },
      { id: 'per_team_day', label: 'Per team-day', help: 'Price for a defined team per day.' },
      { id: 'per_crew_hour', label: 'Per crew-hour', help: 'Price for each crew member per hour.' },
      { id: 'per_flight_session', label: 'Per flight session', help: 'Price for a planned and permitted flight session.' },
      { id: 'per_site_visit', label: 'Per site visit', help: 'Price per inspection or visit.' },
      { id: 'per_entry_point', label: 'Per entry point', help: 'Price per managed entry point.' },
      { id: 'per_ticket', label: 'Per ticket', help: 'Price per ticket processed.' },
      { id: 'per_lot', label: 'Per parking lot / zone', help: 'Price per defined parking area.' },
      { id: 'per_staff_shift', label: 'Per staff shift', help: 'Price per staff member for a defined shift.' },
      { id: 'per_shift', label: 'Per shift', help: 'Price for a defined work shift.' },
      { id: 'per_day', label: 'Per day', help: 'Daily hire or service rate.' },
      { id: 'per_month', label: 'Per month', help: 'Monthly service or retainer rate.' },
      { id: 'monthly_retainer', label: 'Monthly retainer', help: 'Recurring fee for an agreed monthly scope.' },
      { id: 'percentage_of_budget', label: 'Percentage of event budget', help: 'Percentage calculated from an explicitly defined approved budget.' },
      { id: 'minimum_spend', label: 'Minimum spend', help: 'Booking proceeds only if the agreed minimum spend is met.' },
      { id: 'tiered', label: 'Tiered / quantity pricing', help: 'Different rates by quantity band; define every band.' },
      { id: 'per_staff_hour', label: 'Per staff-hour', help: 'Price multiplied by each staff member and hour.' },
      { id: 'per_guard_hour', label: 'Per guard-hour', help: 'Price for each guard per hour.' },
      { id: 'per_guard_shift', label: 'Per guard shift', help: 'Price per guard for a defined shift.' },
      { id: 'per_team_hour', label: 'Per team-hour', help: 'Price for a defined team per hour.' },
      { id: 'per_team_shift', label: 'Per team shift', help: 'Price for a defined team for one shift.' },
      { id: 'per_staff_hour', label: 'Per staff-hour', help: 'Price multiplied by each staff member and hour.' },
      { id: 'per_staff_shift', label: 'Per staff shift', help: 'Price per staff member for a defined shift.' },
      { id: 'per_person', label: 'Per person / guest', help: 'Quantity is based on people served or attending.' },
      { id: 'per_performer', label: 'Per performer', help: 'Price multiplied by performer count.' },
      { id: 'per_unit', label: 'Per unit', help: 'Price for a clearly named charge unit.' },
      { id: 'per_bottle', label: 'Per bottle', help: 'Price for each bottle.' },
      { id: 'per_case', label: 'Per case / carton', help: 'Price per case or carton; state its contents.' },
      { id: 'per_crate', label: 'Per crate', help: 'Price per crate; state bottle / can count.' },
      { id: 'per_staff_shift', label: 'Per staff shift', help: 'Price per staff member for a defined shift.' },
      { id: 'quote', label: 'Custom quote', help: 'Supplier reviews the requested scope and returns a quote.' }
    ],
    commonOfferingFields: [
      { id: 'name', label: 'Offering name', type: 'text', required: true, maxLength: 90, help: 'Use a name customers can understand at a glance.' },
      { id: 'shortDescription', label: 'Short description', type: 'textarea', required: true, maxLength: 180, help: 'This appears on supplier search and listing cards.' },
      { id: 'description', label: 'Full description', type: 'textarea', required: true, maxLength: 2500, help: 'Explain exactly what is included, excluded, and who this option suits.' },
      { id: 'photos', label: 'Photos / portfolio images', type: 'image-list', required: false, minItems: 0, maxItems: 12 },
      { id: 'included', label: 'What is included', type: 'repeatable-text', required: false, addLabel: 'Add included item' },
      { id: 'excluded', label: 'What is not included', type: 'repeatable-text', required: false, addLabel: 'Add exclusion' },
      { id: 'addOns', label: 'Optional extras', type: 'repeatable-priced-item', required: false, addLabel: 'Add an extra', help: 'Each extra can have its own description and price.' },
      { id: 'leadTime', label: 'Minimum notice required', type: 'number', required: false, min: 0, unit: 'days' },
      { id: 'capacityMin', label: 'Minimum booking / guest count', type: 'number', required: false, min: 1 },
      { id: 'capacityMax', label: 'Maximum capacity', type: 'number', required: false, min: 1 },
      { id: 'serviceArea', label: 'Areas served', type: 'location-multi-select', required: false },
      { id: 'travelAvailable', label: 'Can you travel to the event?', type: 'boolean', required: true, defaultValue: true },
      { id: 'active', label: 'Publish this offering', type: 'boolean', required: true, defaultValue: true }
    ],
    sharedPricingFields: [
      { id: 'pricingModel', label: 'How should this be priced?', type: 'select', required: true, optionsSource: 'selectedType.onboarding.pricing.models' },
      { id: 'currency', label: 'Currency', type: 'select', required: true, options: ['USD', 'ZWG', 'BWP', 'ZAR', 'Other'], help: 'Allow each supplier to choose a supported currency. Do not silently convert currencies.' },
      { id: 'basePrice', label: 'Base price', type: 'money', requiredWhen: 'pricingModel != quote', min: 0 },
      { id: 'unitLabel', label: 'Charge unit', type: 'select-or-text', requiredWhen: 'pricingModel = per_unit', optionsSource: 'selectedType.onboarding.pricing.units' },
      { id: 'minimumQuantity', label: 'Minimum quantity', type: 'number', required: false, min: 1 },
      { id: 'minimumSpend', label: 'Minimum spend', type: 'money', required: false, min: 0 },
      { id: 'depositType', label: 'Deposit type', type: 'select', required: false, options: ['none', 'percentage', 'fixed_amount'], defaultValue: 'none' },
      { id: 'depositValue', label: 'Deposit amount / percentage', type: 'number', requiredWhen: 'depositType != none', min: 0 },
      { id: 'travelFee', label: 'Travel / call-out fee', type: 'money', required: false, min: 0 },
      { id: 'deliveryFee', label: 'Delivery fee', type: 'money', required: false, min: 0 },
      { id: 'setupFee', label: 'Setup / installation fee', type: 'money', required: false, min: 0 },
      { id: 'overtimeRate', label: 'Overtime rate', type: 'money', required: false, min: 0 },
      { id: 'discounts', label: 'Discount rules', type: 'repeatable-discount', required: false, addLabel: 'Add discount' },
      { id: 'tieredRates', label: 'Quantity / tiered rates', type: 'repeatable-price-tier', requiredWhen: 'pricingModel = tiered', addLabel: 'Add price tier', fields: ['minimumQuantity', 'maximumQuantity', 'unitPrice'] },
      { id: 'taxTreatment', label: 'Tax treatment', type: 'select', required: false, options: ['Tax included', 'Tax added separately', 'Not applicable / confirm with supplier'] },
      { id: 'priceValidity', label: 'Price valid until', type: 'date', required: false },
      { id: 'weekendSurcharge', label: 'Weekend / public holiday surcharge', type: 'money', required: false, min: 0 },
      { id: 'rushFee', label: 'Rush / short-notice fee', type: 'money', required: false, min: 0 },
      { id: 'customCurrency', label: 'Other currency code', type: 'text', requiredWhen: 'currency = OTHER', maxLength: 8 },
      { id: 'quoteNotes', label: 'Pricing notes and exclusions', type: 'textarea', required: false, maxLength: 1200 }
    ],
    commonAvailabilityFields: [
      { id: 'bookingLeadTime', label: 'Booking lead time', type: 'number', unit: 'days', min: 0 },
      { id: 'blackoutDates', label: 'Unavailable dates', type: 'date-list', required: false },
      { id: 'bookingHours', label: 'Usual operating hours', type: 'weekly-hours', required: false },
      { id: 'sameDayBookings', label: 'Accept same-day bookings?', type: 'boolean', defaultValue: false },
      { id: 'quoteResponseTime', label: 'Typical quote response time', type: 'select', options: ['Within 2 hours', 'Same day', 'Within 24 hours', 'Within 2 business days', 'Other'] }
    ],
    globalPricingRules: [
      'Never use one price field for every offering. Every offering must retain its own pricing model and values.',
      'Show only the pricing fields relevant to the selected pricing model.',
      'For quote-only pricing, hide the base-price requirement and collect quote notes and the information needed to prepare a quote.',
      'For per-person, per-hour, per-day, per-item, per-distance, or per-area pricing, show the unit and quantity assumptions beside the price.',
      'Display optional add-ons as separate line items. Do not silently include them in the base price.',
      'Show deposit, travel, delivery, setup, overtime, minimum quantity, and minimum spend only when relevant or populated.',
      'Store currency on every offering, not just on the supplier profile.',
      'Keep draft offerings private until the supplier explicitly publishes them.'
    ]
  };

  var CATEGORIES = [
    {
      id: 'infrastructure', name: 'Infrastructure & Rentals', icon: '⛺',
      blurb: 'The foundation — tent, power, floor, stage.',
      onboarding: {
        intro: 'Tell customers which event structures, facilities, and rental equipment you provide. They need to compare size, capacity, hire duration, delivery, setup, and collection.',
        experienceLabel: 'Equipment, dimensions and hire logistics',
        sectionOrder: ['rental_inventory', 'specifications', 'site_and_access', 'delivery_setup', 'pricing', 'availability', 'safety_documents'],
        sharedFields: [
          { id: 'inventoryOwnership', label: 'Equipment ownership', type: 'select', options: ['Owned by us', 'Managed on behalf of partners', 'Mixed inventory'], required: true },
          { id: 'deliveryMethod', label: 'Delivery method', type: 'multi-select', options: ['Supplier delivery', 'Customer collection', 'Third-party transport'], required: true },
          { id: 'setupService', label: 'Do you provide setup?', type: 'boolean', required: true },
          { id: 'collectionService', label: 'Do you dismantle / collect after the event?', type: 'boolean', required: true },
          { id: 'siteInspection', label: 'Is a site visit required before confirming?', type: 'boolean', required: false }
        ],
        operationalQuestions: ['What vehicle can access the site?', 'What ground or surface conditions matter?', 'Who is responsible for permits and site access?', 'What is the delivery, setup, dismantle and collection window?']
      },
      types: [
        { id: 'tent', name: 'Tent & marquee', note: 'Stretch / peg-and-pole / clear-span' },
        { id: 'ablution', name: 'Mobile toilets', note: 'VIP trailers or portaloos' },
        { id: 'power', name: 'Power & generators', note: 'Silent backups, cabling' },
        { id: 'climate', name: 'Climate control', note: 'Heaters, fans, mobile AC' },
        { id: 'flooring', name: 'Flooring & carpeting', note: 'Turf, wooden deck, VIP carpet' },
        { id: 'staging', name: 'Staging & rigging', note: 'Stage, catwalks, trussing' }
      ]
    },
    {
      id: 'catering', name: 'Catering, Bar & Hospitality', icon: '🍽',
      blurb: 'Everything guests consume, plus the staff serving it.',
      onboarding: {
        intro: 'Your questions change depending on whether you cook food, rent equipment, supply drinks, run a bar, or supply hospitality staff. Do not show every catering field to every supplier.',
        experienceLabel: 'Food, beverage, equipment or hospitality workforce',
        sectionOrder: ['service_style', 'menu_or_inventory', 'guest_volume', 'dietary_or_product_details', 'staff_and_setup', 'food_safety_or_licensing', 'pricing'],
        sharedFields: [
          { id: 'serviceArea', label: 'Delivery / service areas', type: 'location-multi-select', required: true },
          { id: 'guestCapacity', label: 'Typical guest capacity', type: 'number', min: 1, required: false },
          { id: 'setupAndCleanup', label: 'Can you handle setup and cleanup?', type: 'select', options: ['Both', 'Setup only', 'Cleanup only', 'Neither', 'Depends on package'], required: false }
        ],
        operationalQuestions: ['What is included in the price per guest, item, or package?', 'What is your minimum order or guest count?', 'What access, water, power, refrigeration, or service space do you need?', 'Which permits and food-safety documents apply to your business?']
      },
      types: [
        { id: 'food', name: 'Food caterers', note: 'Buffet, plated, spit braai' },
        { id: 'equipment', name: 'Catering equipment', note: 'Tables, chairs, glassware, chafing dishes' },
        { id: 'bar', name: 'Mobile bar service', note: 'Bar setup, ice, mixers' },
        { id: 'wholesale', name: 'Alcohol & beverage', note: 'Bulk beer, wine, spirits' },
        { id: 'specialty', name: 'Specialty stations', note: 'Coffee, cocktail, ice cream carts' },
        { id: 'waitron', name: 'Waitron agency', note: 'Uniformed waiters' },
        { id: 'bartender', name: 'Bartender / mixology', note: 'Skilled cocktail staff' },
        { id: 'scullery', name: 'Scullery & cleaning', note: 'Dishwash, trash, tidy-up' }
      ]
    },
    {
      id: 'decor', name: 'Decor, Styling & Florals', icon: '🎨',
      blurb: 'The visual identity of the event.',
      onboarding: {
        intro: 'Build a visual catalogue of styles, packages, hire inventory, floral work, fabric installation, and printed pieces. Customers should see examples, dimensions, customisation limits, and setup requirements.',
        experienceLabel: 'Visual portfolio, style choices and installation details',
        sectionOrder: ['style_and_portfolio', 'offering_or_hire_inventory', 'customisation', 'venue_measurements', 'installation_and_collection', 'pricing'],
        sharedFields: [
          { id: 'styleTags', label: 'Signature styles', type: 'multi-select', options: ['Modern', 'Minimalist', 'Luxury', 'Rustic', 'Traditional', 'Cultural', 'Romantic', 'Corporate', 'Playful', 'Custom'], required: false },
          { id: 'customWork', label: 'Do you accept custom commissions?', type: 'boolean', required: true },
          { id: 'portfolioImages', label: 'Portfolio images', type: 'image-list', maxItems: 20, required: true }
        ],
        operationalQuestions: ['What is hired and must be returned?', 'What is custom-made and retained by the customer?', 'What venue measurements or site access do you need?', 'When do design approval, setup, and breakdown happen?']
      },
      types: [
        { id: 'stylist', name: 'Event stylist / designer', note: 'Mood board + concept' },
        { id: 'florist', name: 'Florist', note: 'Centerpieces, arches, bouquets' },
        { id: 'furniture', name: 'Furniture hire', note: 'Lounges, cocktail tables, bar stools' },
        { id: 'draping', name: 'Draping & fabric', note: 'Ceiling, wall, fairy lights' },
        { id: 'printing', name: 'Signage & stationery', note: 'Menus, seating charts, name cards' }
      ]
    },
    {
      id: 'technical', name: 'Technical Production (AV)', icon: '🔊',
      blurb: 'Sound, lighting, screens, effects.',
      onboarding: {
        intro: 'Capture technical inventory, coverage, rigging and power needs, operator availability, event timings, and safety limits. Technical suppliers need a clear distinction between equipment-only hire and operated production.',
        experienceLabel: 'Technical inventory, coverage and production rider',
        sectionOrder: ['production_services', 'equipment_specifications', 'venue_and_power', 'crew_and_operator', 'technical_rider', 'safety_and_permissions', 'pricing'],
        sharedFields: [
          { id: 'supplyMode', label: 'What do you provide?', type: 'multi-select', options: ['Equipment hire only', 'Equipment plus operator', 'Full production crew', 'Design and pre-production'], required: true },
          { id: 'venueType', label: 'Suitable venue types', type: 'multi-select', options: ['Indoor', 'Outdoor', 'Small room', 'Large hall', 'Open field', 'Stadium / large-scale'], required: false },
          { id: 'powerRequirements', label: 'Power requirements known?', type: 'boolean', required: true }
        ],
        operationalQuestions: ['Who operates the equipment?', 'What stage plot, input list, rigging points, and power details are required?', 'What setup, soundcheck, strike, and curfew windows are needed?', 'Which effects need venue approval or specialist safety controls?']
      },
      types: [
        { id: 'pa', name: 'PA & sound engineer', note: 'Speakers, mixer, monitors' },
        { id: 'mics', name: 'Microphone specialist', note: 'Lapel, roaming, instrument mics' },
        { id: 'lighting', name: 'Lighting design', note: 'Uplighting, stage lights, spotlights' },
        { id: 'visual', name: 'LED wall & projectors', note: 'Big screens, live feeds' },
        { id: 'sfx', name: 'Special effects', note: 'Sparklers, smoke, confetti' }
      ]
    },
    {
      id: 'entertainment', name: 'Entertainment & Talent', icon: '🎤',
      blurb: 'The people who keep the crowd engaged.',
      onboarding: {
        intro: 'Create a talent profile around performance style, repertoire, audience fit, languages, duration, rider, and booking terms. The form should not ask performers about catering inventory or rental dimensions.',
        experienceLabel: 'Talent profile, performance styles and rider',
        sectionOrder: ['act_type', 'genres_and_styles', 'repertoire_and_language', 'performance_format', 'technical_rider', 'travel_and_hospitality', 'pricing'],
        sharedFields: [
          { id: 'eventTypes', label: 'Events you perform at', type: 'multi-select', options: ['Weddings', 'Corporate', 'Private parties', 'Festivals', 'Clubs', 'Community events', 'Cultural ceremonies', 'Conferences', 'School / family events'], required: true },
          { id: 'languages', label: 'Performance languages', type: 'multi-select', options: ['English', 'Shona', 'Ndebele', 'Setswana', 'Zulu', 'Other'], required: false },
          { id: 'performanceVideos', label: 'Performance videos / demo links', type: 'url-list', required: false },
          { id: 'performanceLength', label: 'Usual performance length', type: 'select', options: ['15–30 minutes', '30–45 minutes', '45–60 minutes', '1–2 hours', '3–4 hours', 'Full event / flexible'], required: true }
        ],
        operationalQuestions: ['What is the minimum performance fee and duration?', 'What rider do you require from the venue or client?', 'How much setup and soundcheck time do you need?', 'Are travel, accommodation, meals, and extra set time included?']
      },
      types: [
        { id: 'mc', name: 'MC / host' },
        { id: 'dj', name: 'DJ' },
        { id: 'band', name: 'Live band / musician' },
        { id: 'cultural', name: 'Cultural / traditional dancers' },
        { id: 'contemporary', name: 'Contemporary dancers' },
        { id: 'hype', name: 'Hype man / announcer' },
        { id: 'keynote', name: 'Keynote / celebrity speaker' }
      ]
    },
    {
      id: 'security', name: 'Safety, Security & Logistics', icon: '🛡',
      blurb: 'Keep the event lawful, safe, orderly.',
      onboarding: {
        intro: 'Collect the kind of safety service provided, deployment levels, staff credentials, risk and incident procedures, coverage area, and escalation contacts. Sensitive operational details should be visible only to authorised users.',
        experienceLabel: 'Deployment planning, qualifications and risk controls',
        sectionOrder: ['service_scope', 'risk_and_site', 'team_and_supervision', 'credentials', 'deployment_plan', 'emergency_escalation', 'pricing'],
        sharedFields: [
          { id: 'coverageArea', label: 'Coverage area', type: 'location-multi-select', required: true },
          { id: 'supervisorIncluded', label: 'Is a supervisor included?', type: 'boolean', required: true },
          { id: 'incidentReporting', label: 'Do you provide an incident report?', type: 'boolean', required: true },
          { id: 'confidentialOperations', label: 'Contains sensitive deployment information', type: 'notice', text: 'Keep exact security positions, protection plans, response routes, and personal details restricted to authorised booking participants.' }
        ],
        operationalQuestions: ['What event risk information is required before confirming?', 'What permits, licences, training, insurance, and first-aid credentials apply?', 'How is the supervisor contacted during an incident?', 'What are cancellation, escalation, and handover procedures?']
      },
      types: [
        { id: 'vipsecurity', name: 'VIP / close protection' },
        { id: 'staticsecurity', name: 'Venue static security' },
        { id: 'access', name: 'Access control & ticketing' },
        { id: 'parking', name: 'Parking marshals' },
        { id: 'armed', name: 'Armed response / K9' },
        { id: 'healthsafety', name: 'Health & safety officer' },
        { id: 'medical', name: 'Medical emergency services' }
      ]
    },
    {
      id: 'media', name: 'Media, Memories & Marketing', icon: '📸',
      blurb: 'Capture it, broadcast it, remember it.',
      onboarding: {
        intro: 'Show portfolio work, deliverables, coverage hours, crew size, turnaround time, editing, usage rights, and the technical requirements for the venue or event.',
        experienceLabel: 'Portfolio, deliverables and content usage rights',
        sectionOrder: ['portfolio', 'coverage_and_deliverables', 'crew_and_equipment', 'editing_and_delivery', 'rights_and_privacy', 'pricing'],
        sharedFields: [
          { id: 'portfolio', label: 'Portfolio samples', type: 'image-or-url-list', required: true },
          { id: 'deliveryFormat', label: 'Final delivery formats', type: 'multi-select', options: ['Online gallery', 'Digital download', 'USB / drive', 'Edited video', 'Raw files by agreement', 'Printed deliverables', 'Live broadcast link'], required: false },
          { id: 'usageRights', label: 'Default usage rights', type: 'select', options: ['Personal use', 'Commercial use', 'Social media use', 'Full buyout by agreement', 'Rights agreed per booking'], required: true }
        ],
        operationalQuestions: ['How many final photos, edited minutes, prints, or delivery files are included?', 'What is the turnaround time?', 'Are travel, storage, editing, and extra hours included?', 'How is consent, privacy, and publication approval handled?']
      },
      types: [
        { id: 'photographer', name: 'Event photographer' },
        { id: 'videographer', name: 'Videographer / cinematographer' },
        { id: 'drone', name: 'Drone operator' },
        { id: 'streaming', name: 'Live-streaming technician' },
        { id: 'photobooth', name: 'Photo booth vendor' }
      ]
    },
    {
      id: 'management', name: 'Management & Coordination', icon: '📋',
      blurb: 'The glue that keeps everything together.',
      onboarding: {
        intro: 'Describe the planning or coordination scope, milestones, guest-management workload, communication channels, deliverables, and what you need from the client.',
        experienceLabel: 'Scope of work, milestones and coordination plan',
        sectionOrder: ['service_scope', 'planning_deliverables', 'guest_and_vendor_volume', 'communications', 'milestones_and_deadlines', 'pricing'],
        sharedFields: [
          { id: 'planningStage', label: 'When can clients engage you?', type: 'multi-select', options: ['Early planning', 'Mid-planning', 'Final month', 'Event week', 'Event day only'], required: true },
          { id: 'communicationChannels', label: 'Client communication channels', type: 'multi-select', options: ['Phone', 'Email', 'WhatsApp', 'Video call', 'In-person meetings', 'Shared planning document'], required: false },
          { id: 'vendorManagement', label: 'Do you coordinate other suppliers?', type: 'boolean', required: true }
        ],
        operationalQuestions: ['What deliverables does the package include?', 'How many meetings and revisions are included?', 'What guest count, vendor count, and planning duration are supported?', 'What client decisions and deadlines are required?']
      },
      types: [
        { id: 'planner', name: 'Event planner / coordinator' },
        { id: 'onday', name: 'On-the-day coordinator' },
        { id: 'rsvp', name: 'RSVP & guest manager' }
      ]
    }
  ];

  /* Per-supplier-type profile. These are the branch-specific form fields.
     `fields` are shown for that type only; `conditionalSections` are shown
     only when their `when` condition matches the selected values. */
  var TYPE_PROFILES = {
    tent: {
      summary: 'Hire tents and marquees with explicit structure style, dimensions, weather suitability, occupancy, flooring, anchoring and installation scope.',
      serviceOptions: ['Stretch tent', 'Peg-and-pole marquee', 'Clear-span structure', 'Pagoda tent', 'Bedouin / sailcloth tent', 'Pagoda walkway', 'Sidewalls and doors', 'Transparent roof / wall'],
      fields: [
        { id: 'structureStyle', label: 'Structure style', type: 'multi-select', options: ['Stretch', 'Peg-and-pole', 'Clear-span', 'Pagoda', 'Sailcloth', 'Walkway'], required: true },
        { id: 'dimensions', label: 'Dimensions per structure', type: 'text', required: true, placeholder: 'e.g. 10 m × 20 m' },
        { id: 'seatedCapacity', label: 'Seated capacity', type: 'number', min: 1, required: true },
        { id: 'standingCapacity', label: 'Standing capacity', type: 'number', min: 1, required: false },
        { id: 'surfaceTypes', label: 'Supported surfaces', type: 'multi-select', options: ['Grass / soil', 'Concrete', 'Paving', 'Sand', 'Decking', 'Other'], required: true },
        { id: 'windRating', label: 'Wind / weather rating or limits', type: 'text', required: false },
        { id: 'anchoringMethod', label: 'Anchoring options', type: 'multi-select', options: ['Ground stakes', 'Water weights', 'Concrete weights', 'Surface-specific solution', 'Site assessment required'], required: true }
      ],
      conditionalSections: [{ when: { field: 'structureStyle', includes: 'Clear-span' }, title: 'Clear-span rigging details', fields: [{ id: 'clearSpanHeight', label: 'Clear internal height', type: 'text', required: true }, { id: 'riggingPlan', label: 'Rigging / structural plan available?', type: 'boolean', required: true }] }],
      documents: ['Public liability insurance (where applicable)', 'Structural / fire certificates where required', 'Relevant local trading or installation permits'],
      logistics: ['Vehicle access and unloading space', 'Ground condition and underground services', 'Setup and dismantle hours', 'Weather contingency and cancellation policy'],
      pricing: { models: ['per_day', 'per_event', 'package', 'per_square_metre', 'quote'], defaultModel: 'per_day', units: ['per tent', 'per square metre', 'per day', 'per event', 'per package'], quoteFields: ['dimensions', 'surface', 'location', 'setup window'] }
    },
    ablution: {
      summary: 'List mobile toilets by unit type, accessibility, capacity, servicing schedule, water and power requirements, and waste handling.',
      serviceOptions: ['Standard portable toilet', 'VIP portable toilet', 'Accessible / wheelchair unit', 'Luxury toilet trailer', 'Urinal bank', 'Handwashing station', 'Shower trailer'],
      fields: [
        { id: 'unitType', label: 'Unit type', type: 'multi-select', options: ['Standard', 'VIP', 'Accessible', 'Trailer', 'Urinal bank', 'Handwash', 'Shower'], required: true },
        { id: 'unitsIncluded', label: 'Number of units in this offering', type: 'number', min: 1, required: true },
        { id: 'guestRatio', label: 'Recommended guests per unit', type: 'number', min: 1, required: false },
        { id: 'servicing', label: 'Servicing plan', type: 'select', options: ['Delivery only', 'Daily service', 'Multiple services per day', 'Scheduled on request'], required: true },
        { id: 'waterPower', label: 'Utilities needed', type: 'multi-select', options: ['None', 'Water', 'Power', 'Water and power'], required: true },
        { id: 'accessibleFeatures', label: 'Accessible features', type: 'textarea', required: false }
      ],
      conditionalSections: [{ when: { field: 'unitType', includes: 'Trailer' }, title: 'Trailer access', fields: [{ id: 'trailerLength', label: 'Trailer length / turning space', type: 'text', required: true }, { id: 'hookupDetails', label: 'Required water / power hookup', type: 'text', required: false }] }],
      documents: ['Waste disposal authorisation / service provider details where required', 'Vehicle and operating permits where required'],
      logistics: ['Access road and turning radius', 'Placement distance from guests / food areas', 'Servicing access', 'Waste collection responsibility'],
      pricing: { models: ['per_unit', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_unit', units: ['per toilet unit', 'per trailer', 'per day', 'per event', 'per service visit'], quoteFields: ['units', 'guest estimate', 'duration', 'servicing frequency'] }
    },
    power: {
      summary: 'Describe generators, batteries, distribution boards, cabling, load capacity, fuel, operators and backup arrangements.',
      serviceOptions: ['Silent diesel generator', 'Open-frame generator', 'Portable inverter', 'Battery power station', 'Distribution board', 'Power cabling', 'Backup generator', 'Electrician / power technician'],
      fields: [
        { id: 'equipmentType', label: 'Equipment supplied', type: 'multi-select', options: ['Generator', 'Inverter', 'Battery storage', 'Distribution board', 'Cables', 'Power technician'], required: true },
        { id: 'capacityKva', label: 'Generator capacity (kVA)', type: 'number', min: 0, required: false },
        { id: 'outputType', label: 'Output', type: 'multi-select', options: ['Single phase', 'Three phase', 'USB / DC', 'Other'], required: true },
        { id: 'fuelPolicy', label: 'Fuel arrangement', type: 'select', options: ['Fuel included', 'Customer supplies fuel', 'Fuel charged by consumption', 'Battery / no fuel'], required: true },
        { id: 'operatorIncluded', label: 'Operator / electrician included?', type: 'boolean', required: true },
        { id: 'cableLength', label: 'Cable lengths / distribution details', type: 'text', required: false }
      ],
      conditionalSections: [{ when: { field: 'equipmentType', includes: 'Generator' }, title: 'Generator safety and operation', fields: [{ id: 'noiseLevel', label: 'Noise level or silent enclosure details', type: 'text', required: false }, { id: 'refuelPlan', label: 'Refuelling plan', type: 'textarea', required: true }] }],
      documents: ['Electrical inspection / compliance records where required', 'Operator qualifications where applicable', 'Equipment maintenance records'],
      logistics: ['Total and peak load estimate', 'Safe generator location and ventilation', 'Fuel storage and refuelling access', 'Cable routes and weather protection'],
      pricing: { models: ['per_day', 'per_event', 'per_unit', 'package', 'quote'], defaultModel: 'per_day', units: ['per generator', 'per kVA package', 'per day', 'per event', 'per technician-hour'], quoteFields: ['load estimate', 'runtime', 'fuel', 'cable run', 'operator requirement'] }
    },
    climate: {
      summary: 'Offer heaters, fans, evaporative coolers or mobile air conditioning based on area, power, ventilation and operating duration.',
      serviceOptions: ['Industrial fan', 'Pedestal fan', 'Outdoor misting fan', 'Patio heater', 'Gas heater', 'Electric heater', 'Portable air conditioner', 'Evaporative cooler'],
      fields: [
        { id: 'climateType', label: 'Climate equipment type', type: 'multi-select', options: ['Fan', 'Misting fan', 'Heater', 'Air conditioner', 'Evaporative cooler'], required: true },
        { id: 'coverageArea', label: 'Recommended coverage area', type: 'text', required: true },
        { id: 'powerOrFuel', label: 'Power / fuel needs', type: 'text', required: true },
        { id: 'indoorOutdoor', label: 'Use location', type: 'multi-select', options: ['Indoor', 'Outdoor', 'Covered outdoor', 'Well-ventilated only'], required: true },
        { id: 'operatorRequired', label: 'Operator required?', type: 'boolean', required: true }
      ],
      conditionalSections: [{ when: { field: 'climateType', includes: 'Heater' }, title: 'Heater safety', fields: [{ id: 'heaterFuel', label: 'Heater fuel type', type: 'select', options: ['Electric', 'Gas', 'Other'], required: true }, { id: 'clearanceRequirements', label: 'Required clearances / ventilation', type: 'textarea', required: true }] }],
      documents: ['Equipment inspection / servicing records', 'Relevant gas or electrical compliance records where applicable'],
      logistics: ['Room or tent dimensions', 'Available power circuits', 'Ventilation and fire clearance', 'Noise / exhaust restrictions'],
      pricing: { models: ['per_unit', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_day', units: ['per unit', 'per day', 'per event', 'per covered area'], quoteFields: ['area', 'target temperature', 'power / fuel', 'duration'] }
    },
    flooring: {
      summary: 'Specify flooring and carpeting by material, area, finish, subfloor, load, indoor/outdoor suitability and installation.',
      serviceOptions: ['Wooden event floor', 'Raised deck', 'Dance floor', 'Artificial turf', 'Carpet runner', 'VIP carpet', 'Protective floor covering', 'Interlocking floor panels'],
      fields: [
        { id: 'floorMaterial', label: 'Material / finish', type: 'multi-select', options: ['Wood', 'Composite deck', 'Artificial turf', 'Carpet', 'Vinyl', 'Interlocking panels', 'Other'], required: true },
        { id: 'areaAvailable', label: 'Minimum / maximum area', type: 'text', required: true },
        { id: 'surface', label: 'Subfloor requirements', type: 'multi-select', options: ['Flat concrete', 'Grass / soil', 'Paving', 'Existing deck', 'Uneven surface assessment', 'Indoor floor protection'], required: true },
        { id: 'loadRating', label: 'Load rating / restrictions', type: 'text', required: false },
        { id: 'finishOptions', label: 'Colour / finish options', type: 'text', required: false }
      ],
      conditionalSections: [{ when: { field: 'floorMaterial', includes: 'Wood' }, title: 'Raised floor details', fields: [{ id: 'floorHeight', label: 'Available floor height', type: 'text', required: false }, { id: 'rampAccess', label: 'Ramp / accessible transition available?', type: 'boolean', required: true }] }],
      documents: ['Load / installation specifications where relevant', 'Venue floor protection requirements where applicable'],
      logistics: ['Measured floor area and site plan', 'Moisture / drainage conditions', 'Furniture or vehicle loading', 'Install and removal windows'],
      pricing: { models: ['per_square_metre', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_square_metre', units: ['per square metre', 'per linear metre', 'per panel', 'per day', 'per event'], quoteFields: ['area', 'material', 'surface preparation', 'finishing'] }
    },
    staging: {
      summary: 'List stages, platforms, catwalks, roofs, truss and rigging as distinct systems with dimensions, height, load and crew requirements.',
      serviceOptions: ['Modular stage deck', 'Raised stage', 'Catwalk / runway', 'Stage roof', 'Truss system', 'Ground support', 'Backdrop frame', 'Steps and ramps', 'Rigging crew'],
      fields: [
        { id: 'stageSystem', label: 'System type', type: 'multi-select', options: ['Stage deck', 'Catwalk', 'Roof', 'Truss', 'Ground support', 'Backdrop', 'Steps / ramp'], required: true },
        { id: 'stageDimensions', label: 'Available dimensions', type: 'text', required: true },
        { id: 'stageHeight', label: 'Stage height range', type: 'text', required: false },
        { id: 'loadCapacity', label: 'Rated load capacity', type: 'text', required: true },
        { id: 'roofing', label: 'Weather cover options', type: 'multi-select', options: ['None', 'Stage roof', 'Side cover', 'Rain cover by quote'], required: false },
        { id: 'crewIncluded', label: 'Qualified build / rigging crew included?', type: 'boolean', required: true }
      ],
      conditionalSections: [{ when: { field: 'stageSystem', includes: 'Roof' }, title: 'Roof and rigging', fields: [{ id: 'windLimits', label: 'Wind limits / stop-work policy', type: 'textarea', required: true }, { id: 'riggingCertificate', label: 'Structural / rigging documentation', type: 'file-list', required: false }] }],
      documents: ['Structural / load documentation where required', 'Rigging crew qualifications where applicable', 'Insurance and venue approvals where required'],
      logistics: ['Ground bearing and access', 'Truck access / unloading equipment', 'Build and strike windows', 'Stage plot and attached equipment loads'],
      pricing: { models: ['per_day', 'per_event', 'package', 'per_square_metre', 'quote'], defaultModel: 'package', units: ['per stage package', 'per square metre', 'per day', 'per event', 'per rigging crew'], quoteFields: ['dimensions', 'height', 'roof', 'load', 'site access'] }
    },
    food: {
      summary: 'Build food packages around service style, menus, portions, guest count, dietary accommodation, kitchen needs, staffing and delivery method.',
      serviceOptions: ['Plated multi-course meal', 'Buffet', 'Family-style sharing', 'Spit braai / barbecue', 'Live cooking station', 'Food truck', 'Drop-off catering', 'Finger-food platters', 'Boxed corporate lunches', 'Dessert / pastry platters'],
      fields: [
        { id: 'serviceStyle', label: 'Catering service style', type: 'multi-select', options: ['Full-service plated', 'Buffet', 'Family style', 'Live cooking', 'Food truck', 'Drop-off / platter delivery'], required: true },
        { id: 'cuisines', label: 'Cuisines / menu styles', type: 'multi-select', options: ['Zimbabwean / Southern African', 'Pan-African', 'Braai / barbecue', 'Continental', 'Asian', 'Mediterranean', 'Middle Eastern', 'Desserts and pastries', 'Custom menu'], required: true },
        { id: 'menuItems', label: 'Menu items / packages', type: 'repeatable-menu', required: true, addLabel: 'Add menu item or package' },
        { id: 'portionSize', label: 'Portion / serving information', type: 'textarea', required: false },
        { id: 'minimumGuests', label: 'Minimum guest count', type: 'number', min: 1, required: true },
        { id: 'maximumGuests', label: 'Maximum guest count', type: 'number', min: 1, required: false },
        { id: 'dietaryAccommodations', label: 'Dietary accommodations', type: 'multi-select', options: ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-aware', 'Halal', 'Kosher', 'Low-sodium', 'Child-friendly', 'Other by request'], required: false, showWhen: { field: 'serviceStyle', includesAny: ['Full-service plated', 'Buffet', 'Family style', 'Live cooking'] } },
        { id: 'kitchenSetup', label: 'Kitchen / prep facilities needed', type: 'multi-select', options: ['No onsite prep', 'Prep table', 'Water access', 'Handwashing station', 'Refrigeration', 'Cooking fuel', 'Power supply', 'Waste area'], required: false },
        { id: 'staffingIncluded', label: 'Chefs / serving staff included?', type: 'select', options: ['Chefs and servers', 'Chefs only', 'Servers only', 'No staff', 'Depends on package'], required: true }
      ],
      conditionalSections: [
        { when: { field: 'serviceStyle', includes: 'Food truck' }, title: 'Food truck setup', fields: [{ id: 'vehicleDimensions', label: 'Vehicle dimensions', type: 'text', required: true }, { id: 'parkingFootprint', label: 'Parking footprint and access', type: 'text', required: true }, { id: 'powerHookup', label: 'Power hookup', type: 'select', options: ['None', 'Standard outlet', '16A', '32A', 'Generator', 'Specify in notes'], required: true }, { id: 'fireClearance', label: 'Fire safety clearance / extinguishers', type: 'textarea', required: true }] },
        { when: { field: 'serviceStyle', includes: 'Drop-off / platter delivery' }, title: 'Delivery order rules', fields: [{ id: 'deliveryRadius', label: 'Delivery radius', type: 'number', unit: 'km', min: 0, required: true }, { id: 'minimumOrderValue', label: 'Minimum order value', type: 'money', required: false }, { id: 'packagingIncluded', label: 'Packaging included?', type: 'boolean', required: true }] },
        { when: { field: 'serviceStyle', includesAny: ['Full-service plated', 'Buffet', 'Family style'] }, title: 'Full-service logistics', fields: [{ id: 'minimumServiceHours', label: 'Minimum service hours', type: 'number', min: 1, required: true }, { id: 'tablewareIncluded', label: 'Plates, cutlery and glassware included?', type: 'boolean', required: true }, { id: 'serviceStaffRatio', label: 'Typical service staff to guest ratio', type: 'text', required: false }] }
      ],
      documents: ['Food handling / food premises documents as applicable', 'Business licence where required', 'Liability insurance where held or required', 'Special dietary handling policy'],
      logistics: ['Minimum guest count and order lead time', 'Onsite kitchen, handwashing, water and power needs', 'Allergen disclosure and cross-contact procedure', 'Delivery, serving, clearing and waste arrangements'],
      pricing: { models: ['per_person', 'per_item', 'per_platter', 'package', 'per_event', 'minimum_spend', 'quote'], defaultModel: 'per_person', units: ['per guest', 'per menu item', 'per platter', 'per boxed meal', 'per event', 'per service hour'], quoteFields: ['guest count', 'menu choices', 'service style', 'staffing', 'venue logistics'] }
    },
    equipment: {
      summary: 'Offer each catering rental family separately with item quantities, set composition, condition, delivery, washing, breakage and return rules.',
      serviceOptions: ['Dining tables', 'Banquet chairs', 'Cocktail tables', 'Cutlery', 'Crockery', 'Glassware', 'Chafing dishes', 'Serving platters', 'Buffet equipment', 'Coolers / beverage dispensers', 'Table linen'],
      fields: [
        { id: 'equipmentFamilies', label: 'Equipment types stocked', type: 'multi-select', options: ['Tables', 'Chairs', 'Cutlery', 'Crockery', 'Glassware', 'Chafing dishes', 'Serving ware', 'Linen', 'Cooling / dispensing'], required: true },
        { id: 'availableQuantity', label: 'Available quantity', type: 'number', min: 1, required: true },
        { id: 'unitCondition', label: 'Condition', type: 'select', options: ['New', 'Excellent', 'Good', 'Mixed; disclose per item'], required: true },
        { id: 'setsAvailable', label: 'Can customers hire matching sets?', type: 'boolean', required: true },
        { id: 'breakagePolicy', label: 'Loss / breakage policy', type: 'textarea', required: true },
        { id: 'washingReturn', label: 'Cleaning and return requirements', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'equipmentFamilies', includesAny: ['Chafing dishes', 'Cooling / dispensing'] }, title: 'Powered / heat equipment', fields: [{ id: 'powerFuelDetails', label: 'Power, fuel or heating requirements', type: 'text', required: true }] }],
      documents: ['Equipment safety instructions where relevant', 'Electrical inspection records for powered equipment where applicable'],
      logistics: ['Count verification at delivery and collection', 'Cleaning standard on return', 'Breakage / loss charges', 'Delivery and collection access'],
      pricing: { models: ['per_item', 'per_day', 'per_event', 'per_set', 'package', 'quote'], defaultModel: 'per_item', units: ['per item', 'per set', 'per dozen', 'per crate', 'per day', 'per event'], quoteFields: ['quantities', 'set composition', 'delivery', 'washing'] }
    },
    bar: {
      summary: 'Configure a mobile bar as a staffed service, bar infrastructure rental, beverage package, or combination. Separate open-bar and cash-bar arrangements.',
      serviceOptions: ['Cash bar', 'Open bar / hosted tab', 'Consumption-based bar', 'Mocktail bar', 'Cocktail bar', 'Beer and wine bar', 'Premium bar', 'Dry bar setup'],
      fields: [
        { id: 'barFormat', label: 'Bar format', type: 'multi-select', options: ['Cash bar', 'Hosted / open bar', 'Consumption-based', 'Mocktail-only', 'Dry hire / equipment only'], required: true },
        { id: 'barSetup', label: 'Bar setup', type: 'multi-select', options: ['Portable counter', 'Back bar', 'Refrigeration', 'Ice station', 'Glassware', 'Cocktail station', 'Menu / signage'], required: true },
        { id: 'beverageInclusions', label: 'Beverages included', type: 'multi-select', options: ['Beer', 'Wine', 'Spirits', 'Cocktails', 'Mocktails', 'Soft drinks', 'Water', 'Customer supplies drinks'], required: true },
        { id: 'barStaff', label: 'Staff included', type: 'select', options: ['Bartenders and barbacks', 'Bartenders only', 'No staff', 'Optional add-on'], required: true },
        { id: 'guestEstimate', label: 'Guests served per bar point', type: 'number', min: 1, required: false }
      ],
      conditionalSections: [{ when: { field: 'barFormat', includes: 'Hosted / open bar' }, title: 'Hosted bar controls', fields: [{ id: 'spendCap', label: 'Host spend cap / replenishment rule', type: 'text', required: true }, { id: 'approvedMenu', label: 'Approved beverage list', type: 'repeatable-text', required: true }] }],
      documents: ['Relevant liquor licence / event authorisation where applicable', 'Responsible service and age-check procedure', 'Liability insurance where required'],
      logistics: ['Water, ice, power and refrigeration', 'Bar footprint and queue space', 'Glassware and waste handling', 'Alcohol service cut-off and ID checking'],
      pricing: { models: ['package', 'per_person', 'per_hour', 'minimum_spend', 'per_event', 'quote'], defaultModel: 'package', units: ['per guest', 'per bar station', 'per bartender-hour', 'per event', 'hosted spend limit'], quoteFields: ['guest count', 'service duration', 'drink menu', 'bar format', 'staffing'] }
    },
    wholesale: {
      summary: 'Sell beverage inventory by SKU, brand, pack size, case, crate or bottle, with stock status, delivery minimums and lawful sales controls.',
      serviceOptions: ['Beer', 'Cider', 'Wine', 'Spirits', 'Soft drinks', 'Bottled water', 'Juices / mixers', 'Non-alcoholic alternatives', 'Bulk ice'],
      fields: [
        { id: 'productType', label: 'Beverage category', type: 'multi-select', options: ['Beer', 'Cider', 'Wine', 'Spirits', 'Soft drinks', 'Water', 'Juice / mixer', 'Non-alcoholic', 'Ice'], required: true },
        { id: 'brandAndVariant', label: 'Brand / product variant', type: 'text', required: true },
        { id: 'packSize', label: 'Pack size / volume', type: 'text', required: true },
        { id: 'stockQuantity', label: 'Available stock', type: 'number', min: 0, required: true },
        { id: 'minimumWholesaleOrder', label: 'Minimum wholesale order', type: 'text', required: true },
        { id: 'deliveryOrCollection', label: 'Fulfilment', type: 'multi-select', options: ['Delivery', 'Collection', 'Both'], required: true }
      ],
      conditionalSections: [{ when: { field: 'productType', includesAny: ['Beer', 'Cider', 'Wine', 'Spirits'] }, title: 'Alcohol sale controls', fields: [{ id: 'licensedSupply', label: 'Appropriate licence / authorisation held?', type: 'boolean', required: true }, { id: 'ageVerification', label: 'Age verification process', type: 'textarea', required: true }] }],
      documents: ['Business / trade licence as applicable', 'Alcohol wholesale / distribution authorisation where required', 'Tax invoices / product traceability records where applicable'],
      logistics: ['Order cutoff time', 'Delivery area and transport conditions', 'Returns for sealed cases only or no returns', 'Stock substitution policy'],
      pricing: { models: ['per_item', 'per_bottle', 'per_case', 'per_crate', 'tiered', 'minimum_spend', 'quote'], defaultModel: 'per_case', units: ['per bottle', 'per can', 'per case', 'per crate', 'per carton', 'per litre', 'bulk order'], quoteFields: ['brands', 'case count', 'delivery', 'deposit'] }
    },
    specialty: {
      summary: 'List individual food or drink stations and carts with service menu, throughput, footprint, utilities, staffing and consumables.',
      serviceOptions: ['Coffee / espresso cart', 'Tea station', 'Cocktail / mocktail station', 'Ice cream cart', 'Popcorn station', 'Candy floss station', 'Dessert bar', 'Juice bar', 'Smoothie station'],
      fields: [
        { id: 'stationType', label: 'Station type', type: 'multi-select', options: ['Coffee', 'Tea', 'Cocktail / mocktail', 'Ice cream', 'Popcorn', 'Candy floss', 'Dessert', 'Juice', 'Smoothie'], required: true },
        { id: 'menuOptions', label: 'Menu / flavour options', type: 'repeatable-text', required: true },
        { id: 'serviceStyle', label: 'Service style', type: 'select', options: ['Unlimited station', 'Fixed servings per guest', 'Pay per serving', 'Hosted tab', 'Dry hire'], required: true },
        { id: 'stationFootprint', label: 'Space / footprint required', type: 'text', required: true },
        { id: 'throughput', label: 'Approximate servings per hour', type: 'number', min: 1, required: false },
        { id: 'consumables', label: 'Consumables included', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'stationType', includesAny: ['Coffee', 'Smoothie', 'Juice', 'Ice cream'] }, title: 'Cold storage / power needs', fields: [{ id: 'utilityNeeds', label: 'Power / refrigeration / water needs', type: 'multi-select', options: ['None', 'Power', 'Water', 'Refrigeration', 'Drainage'], required: true }] }],
      documents: ['Food safety documents where applicable', 'Electrical / gas safety records for relevant equipment'],
      logistics: ['Power, water, handwashing and refrigeration', 'Setup footprint and queue space', 'Servings included and overage price', 'Weather protection for carts'],
      pricing: { models: ['per_person', 'per_serving', 'per_hour', 'per_station', 'package', 'per_event', 'quote'], defaultModel: 'per_station', units: ['per guest', 'per serving', 'per station-hour', 'per event', 'per cart'], quoteFields: ['guest count', 'menu', 'serving cap', 'utilities', 'duration'] }
    },
    waitron: {
      summary: 'Offer hospitality staffing by role, skill level, shift length, uniform standard, supervision and guest-to-staff expectations.',
      serviceOptions: ['Waiter / waitron', 'Banqueting server', 'Food runner', 'Host / hostess', 'Buffet attendant', 'Cloakroom attendant', 'Service captain', 'Event supervisor'],
      fields: [
        { id: 'staffRoles', label: 'Roles supplied', type: 'multi-select', options: ['Waitron', 'Food runner', 'Host / hostess', 'Buffet attendant', 'Service captain', 'Supervisor'], required: true },
        { id: 'staffCount', label: 'Minimum / available staff count', type: 'number-range', min: 1, required: true },
        { id: 'minimumShift', label: 'Minimum shift', type: 'number', min: 1, unit: 'hours', required: true },
        { id: 'uniformOptions', label: 'Uniform options', type: 'multi-select', options: ['Black and white', 'Formal black', 'Brand uniform', 'Traditional attire', 'Client-provided', 'Other'], required: true },
        { id: 'supervision', label: 'Supervisor included?', type: 'boolean', required: true },
        { id: 'training', label: 'Training / experience level', type: 'select', options: ['Entry level', 'Experienced', 'Fine dining', 'Banqueting specialist', 'Mixed teams'], required: true }
      ],
      conditionalSections: [{ when: { field: 'staffRoles', includes: 'Service captain' }, title: 'Team leadership', fields: [{ id: 'teamSizePerCaptain', label: 'Typical team size per captain', type: 'number', min: 1, required: true }] }],
      documents: ['Staff identity / right-to-work checks as applicable', 'Food-safety or service training evidence where relevant'],
      logistics: ['Call time and finish time', 'Meals, breaks and transport arrangements', 'Uniform and grooming standards', 'Late finish / overtime policy'],
      pricing: { models: ['per_staff_hour', 'per_staff_shift', 'per_day', 'package', 'quote'], defaultModel: 'per_staff_shift', units: ['per staff member per hour', 'per staff shift', 'per supervisor shift', 'per event'], quoteFields: ['staff count', 'roles', 'hours', 'location', 'uniform'] }
    },
    bartender: {
      summary: 'Describe bartending, cocktail creation, flair work, bar prep and staffing separately from the bar structure or alcohol supply.',
      serviceOptions: ['Bartender', 'Mixologist', 'Flair bartender', 'Cocktail menu design', 'Bar prep / batching', 'Barback', 'Head bartender'],
      fields: [
        { id: 'bartenderStyle', label: 'Specialty', type: 'multi-select', options: ['Classic cocktails', 'Craft mixology', 'Mocktails', 'Flair bartending', 'High-volume bar', 'Wine service', 'Beer service'], required: true },
        { id: 'menuDesign', label: 'Can you design a custom drink menu?', type: 'boolean', required: true },
        { id: 'ingredientsSource', label: 'Who supplies alcohol and ingredients?', type: 'select', options: ['Client supplies everything', 'Supplier sources ingredients', 'Supplier sources all beverages', 'Depends on package'], required: true },
        { id: 'barTools', label: 'Tools / equipment brought', type: 'multi-select', options: ['Shakers and tools', 'Portable bar tools only', 'Glassware', 'Ice tools', 'No equipment', 'Full station by request'], required: true },
        { id: 'bartenderCount', label: 'Team size available', type: 'number-range', min: 1, required: true }
      ],
      conditionalSections: [{ when: { field: 'bartenderStyle', includes: 'Flair bartending' }, title: 'Flair performance safety', fields: [{ id: 'flairSpace', label: 'Minimum clear performance area', type: 'text', required: true }, { id: 'venueRestrictions', label: 'Open flame / breakable bottle restrictions', type: 'textarea', required: true }] }],
      documents: ['Responsible alcohol service training where applicable', 'Food / beverage handling records where applicable'],
      logistics: ['Bar access and prep time', 'Ice, refrigeration, water and glassware', 'Ingredient purchasing approvals', 'Overtime and cancellation terms'],
      pricing: { models: ['per_hour', 'per_staff_hour', 'per_event', 'package', 'quote'], defaultModel: 'per_staff_hour', units: ['per bartender-hour', 'per bartender shift', 'per menu design', 'per event'], quoteFields: ['bartender count', 'duration', 'cocktail menu', 'equipment', 'ingredients'] }
    },
    scullery: {
      summary: 'Offer dishwashing, kitchen resets, waste collection and event cleanup by scope, staffing, equipment, chemicals and shift duration.',
      serviceOptions: ['Dishwashing team', 'Kitchen porter', 'Glass collection', 'Waste sorting and removal', 'Post-event cleanup', 'Kitchen reset', 'Toilet attendant / cleaning', 'Full venue cleaning'],
      fields: [
        { id: 'cleaningScope', label: 'Service scope', type: 'multi-select', options: ['Dishwashing', 'Kitchen cleaning', 'Guest-area cleanup', 'Waste collection', 'Restroom cleaning', 'Full venue cleanup'], required: true },
        { id: 'teamSize', label: 'Team size available', type: 'number-range', min: 1, required: true },
        { id: 'equipmentAndChemicals', label: 'Equipment / chemicals provided', type: 'select', options: ['All supplied', 'Equipment only', 'Chemicals only', 'Client supplies', 'Agreed per booking'], required: true },
        { id: 'wasteHandling', label: 'Waste removal included?', type: 'boolean', required: true },
        { id: 'waterDrainage', label: 'Water / drainage requirements', type: 'textarea', required: false }
      ],
      conditionalSections: [{ when: { field: 'cleaningScope', includes: 'Restroom cleaning' }, title: 'Restroom cleaning plan', fields: [{ id: 'restroomFrequency', label: 'Inspection / cleaning frequency', type: 'select', options: ['Once before event', 'Hourly', 'Every 2 hours', 'On call', 'Post-event only'], required: true }] }],
      documents: ['Chemical safety data sheets where relevant', 'Waste disposal records or permits where applicable'],
      logistics: ['Cleaning access and water supply', 'Waste type and collection point', 'Shift handover and replenishment schedule', 'Protective clothing requirements'],
      pricing: { models: ['per_staff_hour', 'per_shift', 'per_area', 'per_event', 'package', 'quote'], defaultModel: 'per_shift', units: ['per cleaner-hour', 'per shift', 'per area', 'per event'], quoteFields: ['venue size', 'waste volume', 'team size', 'hours', 'chemicals'] }
    },
    stylist: {
      summary: 'Sell design concepts, styling coordination, mood boards, full event looks and installation supervision as clearly scoped services.',
      serviceOptions: ['Concept and mood board', 'Full event styling', 'Table styling', 'Ceremony styling', 'Corporate brand styling', 'Design consultation', 'Onsite styling supervision'],
      fields: [
        { id: 'designDeliverables', label: 'Deliverables', type: 'multi-select', options: ['Mood board', 'Colour palette', 'Layout / floor plan', 'Decor sourcing list', '3D mock-up', 'Vendor coordination', 'Setup supervision'], required: true },
        { id: 'styleSpecialties', label: 'Specialties', type: 'multi-select', options: ['Weddings', 'Corporate events', 'Birthdays', 'Cultural ceremonies', 'Luxury events', 'Intimate events', 'Brand activations'], required: true },
        { id: 'revisionCount', label: 'Included concept revisions', type: 'number', min: 0, required: true },
        { id: 'designOnlyOrBuild', label: 'Service level', type: 'select', options: ['Design only', 'Design and source', 'Design and install', 'Full styling and management'], required: true },
        { id: 'clientBudget', label: 'Typical decor budget range', type: 'text', required: false }
      ],
      conditionalSections: [{ when: { field: 'designOnlyOrBuild', equals: 'Design and install' }, title: 'Installation scope', fields: [{ id: 'installationCrew', label: 'Installation crew included?', type: 'boolean', required: true }, { id: 'strikeIncluded', label: 'Breakdown included?', type: 'boolean', required: true }] }],
      documents: ['Portfolio / case studies', 'Supplier or venue insurance documents where applicable'],
      logistics: ['Client approval milestones', 'Budget ownership and purchasing approvals', 'Venue walk-through and access', 'Revision and cancellation terms'],
      pricing: { models: ['fixed_fee', 'per_event', 'package', 'percentage_of_budget', 'per_hour', 'quote'], defaultModel: 'fixed_fee', units: ['per concept', 'per consultation-hour', 'per event', 'percentage of approved decor budget'], quoteFields: ['guest count', 'event style', 'venue', 'budget', 'deliverables'] }
    },
    florist: {
      summary: 'Create floral listings with arrangement format, flower choices, size, seasonality, colour palette and delivery / setup.',
      serviceOptions: ['Bridal bouquet', 'Table centrepiece', 'Ceremony arch', 'Aisle flowers', 'Buttonholes / corsages', 'Entrance installation', 'Flower wall', 'Bulk floral stems', 'Memorial / tribute flowers'],
      fields: [
        { id: 'arrangementType', label: 'Arrangement type', type: 'multi-select', options: ['Bouquet', 'Centre piece', 'Arch', 'Aisle', 'Corsage', 'Flower wall', 'Installations', 'Bulk stems'], required: true },
        { id: 'flowerPreference', label: 'Flower sourcing', type: 'select', options: ['Seasonal flowers', 'Named flowers requested', 'Imported flowers by quote', 'Fresh and artificial options'], required: true },
        { id: 'colourPalette', label: 'Colour palette options', type: 'text', required: true },
        { id: 'arrangementSize', label: 'Size / dimensions', type: 'text', required: true },
        { id: 'vaseHire', label: 'Vases / stands included or hired?', type: 'select', options: ['Included', 'Hire deposit applies', 'Customer supplies', 'Optional add-on'], required: true }
      ],
      conditionalSections: [{ when: { field: 'flowerPreference', equals: 'Imported flowers by quote' }, title: 'Imported flower lead time', fields: [{ id: 'importLeadTime', label: 'Minimum notice in days', type: 'number', min: 1, required: true }, { id: 'substitutionPolicy', label: 'Substitution policy if unavailable', type: 'textarea', required: true }] }],
      documents: ['Supplier sourcing details where requested', 'Portfolio images'],
      logistics: ['Seasonal availability and substitution rules', 'Cooling / handling requirements', 'Venue delivery time and setup access', 'Return of hired vases / stands'],
      pricing: { models: ['per_arrangement', 'per_stem', 'package', 'per_event', 'quote'], defaultModel: 'per_arrangement', units: ['per bouquet', 'per centrepiece', 'per stem', 'per table', 'per installation', 'per event'], quoteFields: ['quantity', 'flower selection', 'size', 'season', 'delivery / setup'] }
    },
    furniture: {
      summary: 'List each rentable furniture model with dimensions, capacity, finish, stock quantity, cleaning, delivery and damage deposit.',
      serviceOptions: ['Lounge sofa', 'Lounge chair', 'Cocktail table', 'Bar stool', 'Dining chair', 'Banquet table', 'Throne chair', 'Outdoor furniture', 'VIP lounge set', 'Bar counter'],
      fields: [
        { id: 'furnitureType', label: 'Furniture type', type: 'select', options: ['Chair', 'Table', 'Sofa / lounge', 'Bar stool', 'Throne', 'Counter', 'Set / bundle', 'Outdoor furniture'], required: true },
        { id: 'dimensions', label: 'Dimensions', type: 'text', required: true },
        { id: 'materialFinish', label: 'Material / finish / colours', type: 'text', required: true },
        { id: 'stockQuantity', label: 'Quantity available', type: 'number', min: 1, required: true },
        { id: 'stackable', label: 'Stackable for transport?', type: 'boolean', required: false },
        { id: 'damageDeposit', label: 'Damage / loss deposit policy', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'furnitureType', equals: 'Set / bundle' }, title: 'Set contents', fields: [{ id: 'setContents', label: 'Items and quantities in set', type: 'repeatable-text', required: true }] }],
      documents: ['Care / handling instructions for special finishes'],
      logistics: ['Stock reservation and substitution', 'Delivery floors / stairs / lift access', 'Cleaning and return condition', 'Damage and missing-item process'],
      pricing: { models: ['per_item', 'per_day', 'per_event', 'per_set', 'package', 'quote'], defaultModel: 'per_day', units: ['per item', 'per set', 'per day', 'per event'], quoteFields: ['quantities', 'location', 'duration', 'delivery', 'setup'] }
    },
    draping: {
      summary: 'Specify fabric, coverage dimensions, ceiling height, fixing method, lighting add-ons, installation crew and fire-safety requirements.',
      serviceOptions: ['Ceiling drape', 'Wall draping', 'Backdrop drape', 'Stage skirt', 'Fairy-light curtain', 'Entrance canopy', 'Pipe-and-drape partition', 'Fabric ceiling canopy'],
      fields: [
        { id: 'drapeUse', label: 'Draping application', type: 'multi-select', options: ['Ceiling', 'Wall', 'Stage', 'Backdrop', 'Entrance', 'Room divider'], required: true },
        { id: 'fabricOptions', label: 'Fabric / colour options', type: 'text', required: true },
        { id: 'coverageDimensions', label: 'Maximum coverage / dimensions', type: 'text', required: true },
        { id: 'ceilingHeight', label: 'Maximum ceiling height', type: 'text', required: false },
        { id: 'lightingAddon', label: 'Integrated lighting available?', type: 'boolean', required: true }
      ],
      conditionalSections: [{ when: { field: 'drapeUse', includes: 'Ceiling' }, title: 'Ceiling installation', fields: [{ id: 'approvedFixingPoints', label: 'Venue-approved fixing points required?', type: 'boolean', required: true }, { id: 'fireRatedFabric', label: 'Fire-rated fabric documentation available?', type: 'boolean', required: true }] }],
      documents: ['Fabric fire-rating records where required', 'Rigging / installation credentials where applicable'],
      logistics: ['Ceiling and wall measurements', 'Venue fixing restrictions', 'Ladder / lift access', 'Strike deadline and fabric cleaning'],
      pricing: { models: ['per_metre', 'per_square_metre', 'per_room', 'package', 'per_event', 'quote'], defaultModel: 'per_room', units: ['per linear metre', 'per square metre', 'per room', 'per backdrop', 'per event'], quoteFields: ['measurements', 'fabric', 'height', 'lighting', 'fixing points'] }
    },
    printing: {
      summary: 'Collect print product, dimensions, material, finish, quantities, design service, proof approval, production time and delivery.',
      serviceOptions: ['Invitation cards', 'Menus', 'Name cards', 'Seating charts', 'Welcome signs', 'Directional signage', 'Table numbers', 'Programmes', 'Banners', 'Branded backdrops'],
      fields: [
        { id: 'printProduct', label: 'Product type', type: 'multi-select', options: ['Invitation', 'Menu', 'Name card', 'Seating chart', 'Welcome sign', 'Directional sign', 'Banner', 'Table number', 'Programme', 'Backdrop'], required: true },
        { id: 'sizeMaterial', label: 'Size and material', type: 'text', required: true },
        { id: 'finishOptions', label: 'Finishes', type: 'multi-select', options: ['Matte', 'Gloss', 'Foil', 'Embossed', 'Laminated', 'Cut-out', 'Weatherproof'], required: false },
        { id: 'designIncluded', label: 'Design included?', type: 'select', options: ['Customer supplies print-ready artwork', 'Basic design included', 'Custom design quoted separately'], required: true },
        { id: 'proofApproval', label: 'Proof approval before print?', type: 'boolean', required: true },
        { id: 'turnaroundDays', label: 'Typical production time', type: 'number', min: 0, unit: 'days', required: true }
      ],
      conditionalSections: [{ when: { field: 'printProduct', includes: 'Directional sign' }, title: 'Outdoor sign details', fields: [{ id: 'weatherproofing', label: 'Weatherproofing / mounting', type: 'text', required: true }] }],
      documents: ['Print-ready artwork specifications', 'Portfolio samples'],
      logistics: ['Artwork deadline and revision limit', 'Spelling / guest name approval', 'Rush job availability', 'Delivery / installation details'],
      pricing: { models: ['per_item', 'per_batch', 'tiered', 'fixed_fee', 'package', 'quote'], defaultModel: 'tiered', units: ['per printed piece', 'per 10', 'per 100', 'per design', 'per sign', 'per batch'], quoteFields: ['quantity', 'dimensions', 'material', 'finish', 'artwork readiness'] }
    },
    pa: {
      summary: 'Offer sound systems by venue capacity, coverage, channel count, monitor requirements, technical operator and soundcheck.',
      serviceOptions: ['Small-room PA', 'Wedding / corporate PA', 'Outdoor PA', 'Festival PA', 'Subwoofer package', 'Stage monitors', 'Mixer and engineer', 'Speech-only system'],
      fields: [
        { id: 'audienceSize', label: 'Recommended audience size', type: 'number-range', min: 1, required: true },
        { id: 'venueCoverage', label: 'Venue coverage', type: 'multi-select', options: ['Indoor', 'Outdoor', 'Speech', 'Live band', 'DJ', 'Large audience'], required: true },
        { id: 'inputChannels', label: 'Mixer input channels', type: 'number', min: 1, required: false },
        { id: 'monitorCount', label: 'Stage monitor count', type: 'number', min: 0, required: false },
        { id: 'engineerIncluded', label: 'Sound engineer included?', type: 'boolean', required: true },
        { id: 'soundcheckTime', label: 'Soundcheck time required', type: 'number', min: 0, unit: 'minutes', required: true }
      ],
      conditionalSections: [{ when: { field: 'venueCoverage', includes: 'Live band' }, title: 'Band technical input', fields: [{ id: 'inputList', label: 'Input list / stage plot required?', type: 'boolean', required: true }, { id: 'micAndDiCount', label: 'Mics / DI boxes included', type: 'text', required: true }] }],
      documents: ['Equipment inspection records', 'Technician credentials where required'],
      logistics: ['Audience size and coverage map', 'Stage plot and input list', 'Power circuits and cable routes', 'Sound limits and curfew'],
      pricing: { models: ['per_hour', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'package', units: ['per PA package', 'per engineer-hour', 'per day', 'per event'], quoteFields: ['audience', 'venue', 'performers', 'channels', 'duration'] }
    },
    mics: {
      summary: 'List microphone models and quantities by purpose, frequency / compatibility, receiver channels, batteries, technician and handover.',
      serviceOptions: ['Wireless handheld', 'Lapel / lavalier', 'Headset microphone', 'Podium microphone', 'Instrument microphone', 'Boundary microphone', 'Microphone kit', 'RF coordination'],
      fields: [
        { id: 'micTypes', label: 'Microphone types', type: 'multi-select', options: ['Wireless handheld', 'Lapel', 'Headset', 'Podium', 'Instrument', 'Boundary', 'Wired handheld'], required: true },
        { id: 'quantityChannels', label: 'Quantity / simultaneous channels', type: 'number', min: 1, required: true },
        { id: 'receiverRange', label: 'Wireless range / frequency information', type: 'text', required: false },
        { id: 'sparesIncluded', label: 'Spare batteries / backup mic included?', type: 'boolean', required: true },
        { id: 'technicianIncluded', label: 'RF / microphone technician included?', type: 'boolean', required: true }
      ],
      conditionalSections: [{ when: { field: 'micTypes', includes: 'Wireless handheld' }, title: 'Wireless coordination', fields: [{ id: 'rfScan', label: 'RF scan before event?', type: 'boolean', required: true }, { id: 'receiverOutputs', label: 'Receiver output / mixer compatibility', type: 'text', required: true }] }],
      documents: ['Equipment compliance / inspection records where relevant'],
      logistics: ['Frequency coordination', 'Batteries and charging', 'Microphone handover / sanitation', 'Backup and interference plan'],
      pricing: { models: ['per_mic', 'per_channel', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_mic', units: ['per microphone', 'per channel', 'per kit', 'per technician-hour', 'per event'], quoteFields: ['mic count', 'wireless channels', 'operator', 'duration'] }
    },
    lighting: {
      summary: 'Build lighting packages by fixture type, venue use, control protocol, rigging, operator, programming and power.',
      serviceOptions: ['Uplighting', 'Stage wash', 'Moving heads', 'Spotlights', 'Pinspots', 'Gobos', 'Architectural lighting', 'Dance-floor effects', 'Lighting design and programming'],
      fields: [
        { id: 'lightingTypes', label: 'Lighting services', type: 'multi-select', options: ['Uplighting', 'Stage wash', 'Moving heads', 'Spotlight', 'Pinspot', 'Gobo', 'Architectural', 'Dance effects'], required: true },
        { id: 'fixtureCount', label: 'Available fixture count', type: 'number', min: 1, required: true },
        { id: 'controlSystem', label: 'Control / protocol', type: 'text', required: false },
        { id: 'designIncluded', label: 'Lighting design / programming included?', type: 'boolean', required: true },
        { id: 'operatorHours', label: 'Operator hours included', type: 'number', min: 0, required: false }
      ],
      conditionalSections: [{ when: { field: 'lightingTypes', includes: 'Moving heads' }, title: 'Rigging and movement fixtures', fields: [{ id: 'mountingMethod', label: 'Mounting / rigging method', type: 'text', required: true }, { id: 'riggingApproval', label: 'Venue rigging approval required?', type: 'boolean', required: true }] }],
      documents: ['Electrical / rigging documentation where applicable', 'Equipment inspection records'],
      logistics: ['Lighting plot and fixture positions', 'Rigging points / truss capacity', 'Control booth and cable runs', 'Programming and strike time'],
      pricing: { models: ['per_fixture', 'per_day', 'per_event', 'package', 'design_fee', 'quote'], defaultModel: 'package', units: ['per fixture', 'per lighting package', 'per design', 'per operator-hour', 'per event'], quoteFields: ['venue size', 'fixture count', 'rigging', 'design', 'operator hours'] }
    },
    visual: {
      summary: 'Offer LED walls, projectors and display systems with pixel pitch / resolution, dimensions, viewing distance, content and playback support.',
      serviceOptions: ['LED wall', 'Indoor LED screen', 'Outdoor LED screen', 'Projector and screen', 'Confidence monitor', 'Presentation screen', 'Live-feed display', 'Playback technician'],
      fields: [
        { id: 'displayType', label: 'Display type', type: 'multi-select', options: ['LED wall', 'Projector / screen', 'Confidence monitor', 'Presentation display', 'Live feed'], required: true },
        { id: 'displayDimensions', label: 'Display dimensions', type: 'text', required: true },
        { id: 'resolutionPitch', label: 'Resolution / pixel pitch / brightness', type: 'text', required: false },
        { id: 'contentFormats', label: 'Accepted content formats', type: 'multi-select', options: ['PowerPoint', 'PDF', 'MP4', 'Live camera feed', 'HDMI laptop', 'Custom playback'], required: true },
        { id: 'playbackOperator', label: 'Playback / screen technician included?', type: 'boolean', required: true }
      ],
      conditionalSections: [{ when: { field: 'displayType', includes: 'Outdoor LED screen' }, title: 'Outdoor display requirements', fields: [{ id: 'weatherRating', label: 'Outdoor / weather rating', type: 'text', required: true }, { id: 'viewingDistance', label: 'Recommended viewing distance', type: 'text', required: true }] }],
      documents: ['Rigging / power documentation where relevant', 'Equipment specifications'],
      logistics: ['Viewing distance and daylight conditions', 'Content delivery deadline and test', 'Signal path / camera feed', 'Power and secure equipment location'],
      pricing: { models: ['per_square_metre', 'per_screen', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_screen', units: ['per screen', 'per square metre', 'per projector', 'per technician-hour', 'per event'], quoteFields: ['display size', 'indoor/outdoor', 'content', 'operators', 'duration'] }
    },
    sfx: {
      summary: 'List effect type, consumable quantity, safety perimeter, venue approval, operator, weather rules and the exact activation count.',
      serviceOptions: ['Confetti blast', 'Cold-spark effect', 'Low fog', 'Haze', 'CO₂ jet', 'Bubble effect', 'Streamer cannon', 'Approved flame effect', 'Stage reveal effect'],
      fields: [
        { id: 'effectTypes', label: 'Effect type', type: 'multi-select', options: ['Confetti', 'Cold spark', 'Low fog', 'Haze', 'CO₂ jet', 'Bubbles', 'Streamers', 'Flame effect'], required: true },
        { id: 'activationCount', label: 'Included activations', type: 'number', min: 1, required: true },
        { id: 'operatorProvided', label: 'Trained operator included?', type: 'boolean', required: true },
        { id: 'venueRestrictions', label: 'Venue restrictions / safety zone', type: 'textarea', required: true },
        { id: 'outdoorOnly', label: 'Indoor / outdoor limitations', type: 'select', options: ['Indoor only', 'Outdoor only', 'Indoor and outdoor subject to approval'], required: true }
      ],
      conditionalSections: [{ when: { field: 'effectTypes', includesAny: ['Cold spark', 'Flame effect'] }, title: 'Higher-control effects', fields: [{ id: 'fireOfficerApproval', label: 'Venue / fire officer approval required?', type: 'boolean', required: true }, { id: 'exclusionZone', label: 'Minimum exclusion zone', type: 'text', required: true }] }],
      documents: ['Product safety sheets', 'Operator training records', 'Venue / authority permissions where required', 'Public liability insurance where applicable'],
      logistics: ['Venue rules and alarm sensitivity', 'Audience separation and exclusion zone', 'Weather / wind limits', 'Cleanup and residue restrictions'],
      pricing: { models: ['per_activation', 'per_effect_unit', 'package', 'per_event', 'quote'], defaultModel: 'package', units: ['per activation', 'per effect unit', 'per effect operator', 'per event'], quoteFields: ['effect count', 'venue restrictions', 'operator', 'consumables'] }
    },
    mc: {
      summary: 'Profile an MC by event format, language, audience style, run-of-show capability, script support and additional hours.',
      serviceOptions: ['Formal wedding emcee', 'Corporate gala host', 'Conference moderator', 'Bilingual host', 'Hype / festival host', 'Traditional ceremony host', 'Auction / awards host'],
      fields: [
        { id: 'hostingStyles', label: 'Hosting styles', type: 'multi-select', options: ['Formal', 'Warm / conversational', 'Comedic', 'High-energy', 'Corporate', 'Cultural / traditional', 'Conference moderator'], required: true },
        { id: 'languages', label: 'Languages spoken on stage', type: 'multi-select', options: ['English', 'Shona', 'Ndebele', 'Setswana', 'Zulu', 'Other'], required: true },
        { id: 'scriptSupport', label: 'Script / speech support', type: 'select', options: ['Client provides final script', 'Review and polish supplied script', 'Create script from brief', 'No script required'], required: true },
        { id: 'coHost', label: 'Can you work with a co-host?', type: 'boolean', required: true },
        { id: 'runOfShow', label: 'Run-of-show review lead time', type: 'number', min: 0, unit: 'days', required: false }
      ],
      conditionalSections: [{ when: { field: 'hostingStyles', includes: 'Conference moderator' }, title: 'Panel moderation', fields: [{ id: 'panelFormat', label: 'Panels / Q&A formats supported', type: 'text', required: true }, { id: 'briefingMeeting', label: 'Pre-event speaker briefing included?', type: 'boolean', required: true }] }],
      documents: ['Showreel / references where available', 'Contract and event conduct terms'],
      logistics: ['Arrival and rehearsal time', 'Run sheet deadline', 'Microphone / stage monitor supplied by whom', 'Overtime and meal / travel terms'],
      pricing: { models: ['per_hour', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'per_event', units: ['per hour', 'half-day', 'full-day', 'per event', 'per rehearsal'], quoteFields: ['event duration', 'script support', 'languages', 'travel', 'co-host'] }
    },
    dj: {
      summary: 'Profile DJ style, genres, crowd and event fit, equipment supplied, set length, setup time, music requests and rider.',
      serviceOptions: ['Wedding / open-format DJ', 'Club / electronic DJ', 'Corporate ambient DJ', 'Afrobeats / Amapiano DJ', 'Hip-hop / R&B DJ', 'House / dance DJ', 'Traditional / throwback DJ', 'Silent disco DJ'],
      fields: [
        { id: 'djStyles', label: 'DJ styles', type: 'multi-select', options: ['Wedding / open-format', 'Club / electronic', 'Corporate ambient', 'Afrobeats / Amapiano', 'Hip-hop / R&B', 'House', 'Traditional / throwback', 'Family-friendly'], required: true },
        { id: 'genres', label: 'Genres played', type: 'multi-select', options: ['Amapiano', 'Afrobeats', 'House', 'Hip-hop', 'R&B', 'Pop', 'Dancehall', 'Gospel', 'Jazz / lounge', 'Old-school', 'Local / traditional', 'Other'], required: true },
        { id: 'equipmentSupplied', label: 'Equipment supplied', type: 'multi-select', options: ['DJ controller', 'Turntables', 'Mixer', 'PA speakers', 'Subwoofers', 'Booth monitor', 'Lighting', 'None / venue supplies'], required: true },
        { id: 'setupMinutes', label: 'Setup time required', type: 'number', min: 0, unit: 'minutes', required: true },
        { id: 'boothSize', label: 'Minimum booth / stage footprint', type: 'text', required: false },
        { id: 'requestsPolicy', label: 'Guest requests / playlist policy', type: 'textarea', required: false }
      ],
      conditionalSections: [{ when: { field: 'equipmentSupplied', includes: 'PA speakers' }, title: 'Sound and power', fields: [{ id: 'audienceSize', label: 'Recommended audience size', type: 'number-range', min: 1, required: true }, { id: 'powerBackup', label: 'Power backup required?', type: 'boolean', required: true }] }],
      documents: ['Performance links / mixes', 'Equipment insurance or licence where applicable'],
      logistics: ['Set times and changeovers', 'Power and booth dimensions', 'Music restrictions / family-friendly requests', 'Travel, accommodation and overtime'],
      pricing: { models: ['per_hour', 'per_set', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'per_event', units: ['per hour', 'per set', 'per DJ', 'per event', 'per equipment package'], quoteFields: ['duration', 'event type', 'equipment', 'travel', 'special requests'] }
    },
    band: {
      summary: 'Describe lineup, instrumentation, genres, set format, song requests, stage plot, inputs, soundcheck and travel needs.',
      serviceOptions: ['Acoustic solo', 'Acoustic duo', 'Jazz trio', '5-piece rock band', 'Cover band', 'Brass band', 'Choir / vocal group', 'Traditional ensemble', 'Session musician'],
      fields: [
        { id: 'lineup', label: 'Lineup / formation', type: 'select', options: ['Solo', 'Duo', 'Trio', '4-piece', '5-piece', '6+ piece', 'Flexible lineup'], required: true },
        { id: 'genres', label: 'Genres / repertoire', type: 'multi-select', options: ['Acoustic', 'Jazz', 'Rock', 'Pop covers', 'Soul / R&B', 'Gospel', 'Afro-fusion', 'Traditional', 'Brass', 'Original music'], required: true },
        { id: 'instruments', label: 'Instruments and backline', type: 'repeatable-text', required: true },
        { id: 'songRequests', label: 'Song requests / custom songs', type: 'select', options: ['Included within limits', 'Available at extra cost', 'Set list only', 'Discuss per booking'], required: true },
        { id: 'setStructure', label: 'Set structure', type: 'text', required: true },
        { id: 'soundcheckMinutes', label: 'Soundcheck duration', type: 'number', min: 0, unit: 'minutes', required: true }
      ],
      conditionalSections: [{ when: { field: 'lineup', equals: '5-piece' }, title: 'Band rider', fields: [{ id: 'micCount', label: 'Microphone count', type: 'number', min: 0, required: true }, { id: 'diBoxes', label: 'DI box count', type: 'number', min: 0, required: true }, { id: 'drumKit', label: 'Drum kit supplied by', type: 'select', options: ['Band', 'Client / venue', 'Hire add-on'], required: true }] }],
      documents: ['Live performance demo / references', 'Song list or repertoire sample'],
      logistics: ['Stage plot and input list', 'Green room / changing space', 'Meals and water for performers', 'Transport, accommodation and curfew'],
      pricing: { models: ['per_set', 'per_hour', 'per_performer', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'per_set', units: ['per set', 'per band', 'per performer', 'per event', 'per rehearsal'], quoteFields: ['lineup', 'sets', 'backline', 'travel', 'special requests'] }
    },
    cultural: {
      summary: 'Show the cultural dance tradition, troupe size, costume, live accompaniment, ceremony protocol and performance duration.',
      serviceOptions: ['Traditional dance troupe', 'Dendera / Mbira performance', 'Amabhiza / Ngoma performance', 'Cultural welcome procession', 'Ceremonial dance', 'Drum and dance ensemble', 'Cultural storytelling with dance'],
      fields: [
        { id: 'tradition', label: 'Tradition / performance style', type: 'text', required: true },
        { id: 'groupSize', label: 'Number of performers', type: 'number-range', min: 1, required: true },
        { id: 'costumes', label: 'Costumes included?', type: 'boolean', required: true },
        { id: 'accompaniment', label: 'Music / instruments', type: 'multi-select', options: ['Live drums', 'Live instruments', 'Recorded track', 'Vocals', 'Mixed'], required: true },
        { id: 'protocolNeeds', label: 'Cultural protocol / ceremony requirements', type: 'textarea', required: false }
      ],
      conditionalSections: [{ when: { field: 'accompaniment', includes: 'Live drums' }, title: 'Live accompaniment', fields: [{ id: 'drumSpace', label: 'Space needed for instruments', type: 'text', required: true }, { id: 'soundSupport', label: 'Sound reinforcement required?', type: 'boolean', required: true }] }],
      documents: ['Group profile / performance references where available'],
      logistics: ['Minimum stage / floor area', 'Changing space and costume handling', 'Cultural protocol agreed with client', 'Transport and weather needs'],
      pricing: { models: ['per_performer', 'per_set', 'per_hour', 'per_event', 'package', 'quote'], defaultModel: 'per_set', units: ['per set', 'per troupe', 'per performer', 'per event'], quoteFields: ['group size', 'duration', 'costume', 'travel', 'protocol'] }
    },
    contemporary: {
      summary: 'Profile dance style, choreographed routines, troupe size, costume, floor needs, music and rehearsal options.',
      serviceOptions: ['Contemporary dance', 'Hip-hop crew', 'Afro-fusion', 'Commercial choreography', 'Wedding first dance', 'Brand activation routine', 'Dance workshop', 'Roaming dancers'],
      fields: [
        { id: 'danceStyles', label: 'Dance styles', type: 'multi-select', options: ['Contemporary', 'Hip-hop', 'Afro-fusion', 'Commercial', 'Ballroom', 'Street dance', 'Choreographed theme routine'], required: true },
        { id: 'performerCount', label: 'Performer count', type: 'number-range', min: 1, required: true },
        { id: 'routineDuration', label: 'Routine / set duration', type: 'number', min: 1, unit: 'minutes', required: true },
        { id: 'customChoreo', label: 'Custom choreography available?', type: 'boolean', required: true },
        { id: 'floorNeeds', label: 'Floor and stage requirements', type: 'text', required: true },
        { id: 'rehearsalIncluded', label: 'Rehearsals included', type: 'number', min: 0, required: false }
      ],
      conditionalSections: [{ when: { field: 'customChoreo', equals: true }, title: 'Custom choreography', fields: [{ id: 'rehearsalCount', label: 'Rehearsals / revisions included', type: 'number', min: 0, required: true }, { id: 'musicEdit', label: 'Music edit included?', type: 'boolean', required: true }] }],
      documents: ['Performance reel / choreography portfolio'],
      logistics: ['Non-slip floor and clear performance zone', 'Changing space', 'Music file deadline', 'Rehearsal and costume approvals'],
      pricing: { models: ['per_routine', 'per_performer', 'per_rehearsal', 'per_hour', 'per_event', 'package', 'quote'], defaultModel: 'per_routine', units: ['per routine', 'per performer', 'per rehearsal', 'per event'], quoteFields: ['performer count', 'routine length', 'custom choreo', 'rehearsals', 'travel'] }
    },
    hype: {
      summary: 'List hype, crowd warm-up, stage announcements and brand activation support separately from a full MC service.',
      serviceOptions: ['Crowd hype', 'Festival hype man', 'Club hype', 'Sports / fan engagement', 'Brand activation announcer', 'Product launch hype', 'Stage announcements'],
      fields: [
        { id: 'hypeStyle', label: 'Hype style', type: 'multi-select', options: ['Festival', 'Club', 'Sports', 'Brand activation', 'Family-friendly', 'Corporate', 'Street / community'], required: true },
        { id: 'audienceInteraction', label: 'Audience interaction activities', type: 'multi-select', options: ['Call-and-response', 'Competitions', 'Sponsor mentions', 'Crowd warm-up', 'Announcements', 'Dance prompts'], required: true },
        { id: 'brandMentions', label: 'Sponsor / brand script support', type: 'boolean', required: true },
        { id: 'languageAndRestrictions', label: 'Languages and content boundaries', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'hypeStyle', includes: 'Brand activation' }, title: 'Brand activation deliverables', fields: [{ id: 'mentionCount', label: 'Number of included brand mentions', type: 'number', min: 0, required: true }, { id: 'scriptApproval', label: 'Script requires client approval?', type: 'boolean', required: true }] }],
      documents: ['Demo clips / references', 'Brand conduct requirements where relevant'],
      logistics: ['Stage microphone and monitor', 'Script and sponsor pronunciation approval', 'Noise limits and event pacing', 'Travel and overtime'],
      pricing: { models: ['per_hour', 'per_set', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'per_event', units: ['per hour', 'per set', 'per appearance', 'per event'], quoteFields: ['hours', 'audience', 'brand deliverables', 'travel'] }
    },
    keynote: {
      summary: 'Describe speaker topic, audience, talk length, language, customisation, Q&A, travel and permitted recordings.',
      serviceOptions: ['Keynote speaker', 'Celebrity appearance', 'Motivational talk', 'Industry expert', 'Panel speaker', 'Fireside chat', 'Workshop / masterclass'],
      fields: [
        { id: 'speakerTopics', label: 'Topics / expertise', type: 'multi-select-or-text', options: ['Leadership', 'Entrepreneurship', 'Technology', 'Health and wellbeing', 'Culture', 'Sport', 'Finance', 'Motivation', 'Industry-specific', 'Other'], required: true },
        { id: 'talkLength', label: 'Talk duration', type: 'select', options: ['10–20 minutes', '20–30 minutes', '30–45 minutes', '45–60 minutes', 'Half-day workshop', 'Full-day workshop'], required: true },
        { id: 'customisation', label: 'Customise talk to event?', type: 'boolean', required: true },
        { id: 'qaFormat', label: 'Q&A / panel formats', type: 'multi-select', options: ['No Q&A', 'Audience Q&A', 'Moderated panel', 'Fireside chat', 'Workshop interaction'], required: true },
        { id: 'recordingPolicy', label: 'Recording / rebroadcast policy', type: 'select', options: ['No recording', 'Recording by agreement', 'Recording included', 'Usage rights quoted separately'], required: true }
      ],
      conditionalSections: [{ when: { field: 'customisation', equals: true }, title: 'Briefing requirements', fields: [{ id: 'briefingLeadTime', label: 'Minimum briefing lead time', type: 'number', min: 1, unit: 'days', required: true }, { id: 'preEventMeeting', label: 'Pre-event meeting included?', type: 'boolean', required: true }] }],
      documents: ['Biography and topic outline', 'Talk sample / references where available'],
      logistics: ['Audience profile and event objective', 'AV and presentation format', 'Travel and accommodation', 'Recording permissions and timing'],
      pricing: { models: ['per_talk', 'per_hour', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'per_talk', units: ['per talk', 'per workshop', 'half-day', 'full-day', 'per appearance'], quoteFields: ['topic', 'duration', 'customisation', 'travel', 'recording rights'] }
    },
    vipsecurity: {
      summary: 'Configure close protection by risk briefing, number of protectors, coverage hours, movement plan and credentials. Restrict sensitive operational details.',
      serviceOptions: ['Executive close protection', 'Celebrity / artist protection', 'VIP escort', 'Secure arrival and departure', 'Advance risk assessment', 'Protective driver coordination'],
      fields: [
        { id: 'protectionScope', label: 'Service scope', type: 'multi-select', options: ['Close protection', 'VIP escort', 'Advance assessment', 'Arrival / departure', 'Protective transport coordination'], required: true },
        { id: 'teamSize', label: 'Protective team size', type: 'number-range', min: 1, required: true },
        { id: 'coverageHours', label: 'Coverage hours', type: 'number', min: 1, required: true },
        { id: 'riskBriefingRequired', label: 'Pre-deployment risk briefing required?', type: 'boolean', required: true },
        { id: 'transportMode', label: 'Transport arrangement', type: 'select', options: ['Client vehicle', 'Supplier vehicle', 'Third-party vehicle', 'Not included'], required: true }
      ],
      conditionalSections: [{ when: { field: 'transportMode', equals: 'Supplier vehicle' }, title: 'Protective transport', fields: [{ id: 'vehicleClass', label: 'Vehicle class / capacity', type: 'text', required: true }, { id: 'driverIncluded', label: 'Trained driver included?', type: 'boolean', required: true }] }],
      documents: ['Relevant security licences / authorisations', 'Training and insurance evidence as required'],
      logistics: ['Formal risk assessment and authorised contact', 'Coverage schedule and handover', 'Confidentiality / privacy protocol', 'Travel and accommodation scope'],
      pricing: { models: ['per_guard_hour', 'per_guard_shift', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_guard_shift', units: ['per protector-hour', 'per protector shift', 'per team-day', 'per event'], quoteFields: ['team size', 'risk profile', 'hours', 'travel', 'transport'] }
    },
    staticsecurity: {
      summary: 'Set deployment posts, coverage hours, guard numbers, supervisor, screening duties, uniform and reporting.',
      serviceOptions: ['Entrance guard', 'Static post', 'Perimeter patrol', 'Crowd control team', 'Backstage security', 'Asset / equipment guard', 'Overnight site guard'],
      fields: [
        { id: 'postTypes', label: 'Post types', type: 'multi-select', options: ['Entrance', 'Perimeter', 'Backstage', 'Parking edge', 'Asset protection', 'Overnight', 'Crowd control'], required: true },
        { id: 'guardsPerPost', label: 'Guards needed per post', type: 'number-range', min: 1, required: true },
        { id: 'shiftLength', label: 'Minimum shift length', type: 'number', min: 1, unit: 'hours', required: true },
        { id: 'supervisorRatio', label: 'Supervisor ratio / arrangement', type: 'text', required: true },
        { id: 'reportFrequency', label: 'Reporting frequency', type: 'select', options: ['At shift end', 'Every 2 hours', 'Hourly', 'Incident-based', 'Custom'], required: true }
      ],
      conditionalSections: [{ when: { field: 'postTypes', includes: 'Crowd control' }, title: 'Crowd control planning', fields: [{ id: 'crowdEstimate', label: 'Expected crowd size', type: 'number', min: 1, required: true }, { id: 'barrierPlan', label: 'Barrier / exit plan supplied by', type: 'select', options: ['Client / venue', 'Supplier', 'Joint planning'], required: true }] }],
      documents: ['Required security business / guard credentials', 'Training and insurance evidence where applicable'],
      logistics: ['Post map and shift changeover', 'Emergency contacts and radio arrangements', 'Uniform and access badge requirements', 'Incident report format'],
      pricing: { models: ['per_guard_hour', 'per_guard_shift', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_guard_shift', units: ['per guard-hour', 'per guard shift', 'per supervisor shift', 'per event'], quoteFields: ['posts', 'guard count', 'hours', 'supervisor', 'risk level'] }
    },
    access: {
      summary: 'Provide entrance staffing, guest-list checks, ticket scanning, wristbands, accreditation and entry reporting.',
      serviceOptions: ['Ticket scanning team', 'Guest-list check-in', 'Wristband distribution', 'VIP accreditation', 'Backstage credentials', 'Box office support', 'Queue management'],
      fields: [
        { id: 'accessServices', label: 'Services offered', type: 'multi-select', options: ['Scanning', 'Guest list', 'Wristbands', 'VIP / backstage passes', 'Box office', 'Queue management'], required: true },
        { id: 'entryPoints', label: 'Entry points covered', type: 'number', min: 1, required: true },
        { id: 'throughput', label: 'Estimated guests per hour per point', type: 'number', min: 1, required: false },
        { id: 'ticketPlatform', label: 'Ticketing systems supported', type: 'text', required: false },
        { id: 'devicesIncluded', label: 'Scanning devices supplied?', type: 'boolean', required: true },
        { id: 'offlineMode', label: 'Can your system operate offline?', type: 'boolean', required: false }
      ],
      conditionalSections: [{ when: { field: 'accessServices', includes: 'Box office' }, title: 'Box office reconciliation', fields: [{ id: 'paymentModes', label: 'Payment methods supported', type: 'multi-select', options: ['Cash', 'Card', 'Mobile money', 'Prepaid / voucher', 'No payments handled'], required: true }, { id: 'cashReconciliation', label: 'Cash reconciliation report provided?', type: 'boolean', required: true }] }],
      documents: ['Data protection / privacy process where relevant', 'Ticketing platform credentials / integration details'],
      logistics: ['Expected arrival pattern and guest count', 'Network connectivity and backup plan', 'Cash custody if box office is included', 'Access categories and escalation rules'],
      pricing: { models: ['per_staff_hour', 'per_entry_point', 'per_ticket', 'per_event', 'package', 'quote'], defaultModel: 'per_entry_point', units: ['per entrance point', 'per staff-hour', 'per ticket scanned', 'per event'], quoteFields: ['guest count', 'entry points', 'devices', 'ticket platform', 'payment handling'] }
    },
    parking: {
      summary: 'List parking marshals and traffic stewards by vehicle volume, access route, shift length, signage, lighting and escalation.',
      serviceOptions: ['Parking marshal', 'VIP parking coordinator', 'Drop-off / pickup marshal', 'Traffic steward', 'Valet coordination', 'Shuttle queue marshal'],
      fields: [
        { id: 'marshalRoles', label: 'Roles', type: 'multi-select', options: ['Parking', 'VIP parking', 'Drop-off / pickup', 'Traffic steward', 'Valet coordination', 'Shuttle queue'], required: true },
        { id: 'vehicleVolume', label: 'Estimated vehicles', type: 'number', min: 0, required: false },
        { id: 'parkingCapacity', label: 'Parking capacity / lots covered', type: 'text', required: true },
        { id: 'signageSupplied', label: 'Cones / signage / radios supplied?', type: 'boolean', required: true },
        { id: 'nightLighting', label: 'Night-time visibility plan', type: 'textarea', required: false }
      ],
      conditionalSections: [{ when: { field: 'marshalRoles', includes: 'Traffic steward' }, title: 'Roadside control', fields: [{ id: 'authorityApproval', label: 'Road / council / authority approval needed?', type: 'boolean', required: true }, { id: 'highVisibilityGear', label: 'High-visibility PPE supplied?', type: 'boolean', required: true }] }],
      documents: ['Relevant traffic / steward credentials where required'],
      logistics: ['Vehicle entry and exit routes', 'Parking map and reserved bays', 'Lighting, radios and weather gear', 'Coordination with local authorities if needed'],
      pricing: { models: ['per_marshal_hour', 'per_shift', 'per_lot', 'per_event', 'package', 'quote'], defaultModel: 'per_shift', units: ['per marshal-hour', 'per shift', 'per parking lot', 'per event'], quoteFields: ['vehicle volume', 'lots', 'hours', 'signage', 'traffic approvals'] }
    },
    armed: {
      summary: 'Register only appropriately licensed services. Describe lawful coverage scope and handler / canine qualifications without publishing sensitive response tactics.',
      serviceOptions: ['Licensed armed response', 'K9 detection support', 'K9 perimeter support', 'Alarm / emergency response coordination', 'Specialist risk service'],
      fields: [
        { id: 'serviceScope', label: 'Service scope', type: 'multi-select', options: ['Licensed armed response', 'K9 detection', 'K9 perimeter support', 'Alarm response coordination'], required: true },
        { id: 'teamCount', label: 'Team / handler count', type: 'number-range', min: 1, required: true },
        { id: 'k9Specialty', label: 'K9 specialty (if applicable)', type: 'select', options: ['Not applicable', 'Detection', 'Perimeter support', 'Search support', 'Other licensed purpose'], required: true },
        { id: 'dispatchCoverage', label: 'Coverage hours', type: 'select', options: ['Event hours', '24-hour service area', 'Scheduled windows', 'By contract'], required: true }
      ],
      conditionalSections: [{ when: { field: 'serviceScope', includes: 'K9 detection' }, title: 'K9 credentials', fields: [{ id: 'handlerQualifications', label: 'Handler / canine qualification details', type: 'textarea', required: true }, { id: 'welfarePlan', label: 'Canine welfare and rest plan', type: 'textarea', required: true }] }],
      documents: ['Current relevant licences / authorisations', 'Handler and canine credentials where applicable', 'Insurance and operating procedures required by law'],
      logistics: ['Scope of deployment and authorised contacts', 'Welfare and rest arrangements for animals', 'Restricted operational details kept private', 'Emergency escalation and incident reporting'],
      pricing: { models: ['per_team_hour', 'per_shift', 'per_day', 'per_event', 'contract', 'quote'], defaultModel: 'per_shift', units: ['per team-hour', 'per shift', 'per team-day', 'per event'], quoteFields: ['service scope', 'duration', 'staffing', 'travel', 'compliance'] }
    },
    healthsafety: {
      summary: 'Offer event risk assessments, safety plans, site inspections, crowd / capacity review and onsite safety officer shifts.',
      serviceOptions: ['Event risk assessment', 'Health and safety officer', 'Emergency action plan', 'Crowd safety review', 'Fire safety coordination', 'Site inspection', 'Safety briefing'],
      fields: [
        { id: 'safetyDeliverables', label: 'Deliverables', type: 'multi-select', options: ['Risk assessment', 'Safety plan', 'Emergency action plan', 'Site inspection', 'Safety officer onsite', 'Staff briefing', 'Incident reporting'], required: true },
        { id: 'eventSize', label: 'Event capacity / risk class', type: 'text', required: true },
        { id: 'siteVisit', label: 'Site inspection needed?', type: 'select', options: ['Required', 'Recommended', 'Not usually required'], required: true },
        { id: 'onsiteHours', label: 'Onsite coverage hours', type: 'number', min: 0, required: false },
        { id: 'reportFormat', label: 'Report / plan formats', type: 'multi-select', options: ['PDF report', 'Site map annotations', 'Emergency contact matrix', 'Briefing session', 'Onsite log'], required: true }
      ],
      conditionalSections: [{ when: { field: 'safetyDeliverables', includes: 'Emergency action plan' }, title: 'Emergency planning', fields: [{ id: 'emergencyServicesLiaison', label: 'Liaise with venue / emergency services?', type: 'boolean', required: true }, { id: 'evacuationPlanning', label: 'Evacuation and assembly point plan included?', type: 'boolean', required: true }] }],
      documents: ['Relevant health and safety qualifications', 'Professional indemnity / liability cover where applicable'],
      logistics: ['Event programme and attendance estimate', 'Venue plan / exits / assembly points', 'Supplier risk assessments', 'Document submission deadlines'],
      pricing: { models: ['fixed_fee', 'per_site_visit', 'per_hour', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'fixed_fee', units: ['per risk assessment', 'per site visit', 'per officer-hour', 'per event'], quoteFields: ['event size', 'risk complexity', 'site visits', 'onsite coverage', 'deliverables'] }
    },
    medical: {
      summary: 'Describe event medical cover by care level, qualified crew, ambulance / response vehicle, coverage period and escalation pathway.',
      serviceOptions: ['First-aid station', 'Event first-aid team', 'Paramedic crew', 'Ambulance standby', 'Mobile medical unit', 'Medical room staffing', 'Medical risk plan'],
      fields: [
        { id: 'medicalLevel', label: 'Level of medical cover', type: 'multi-select', options: ['First aid', 'Advanced first aid', 'Paramedic', 'Ambulance', 'Medical station', 'Medical planning'], required: true },
        { id: 'crewQualifications', label: 'Crew qualifications / staffing', type: 'textarea', required: true },
        { id: 'vehicleAndEquipment', label: 'Vehicles / equipment supplied', type: 'multi-select', options: ['First-aid kit', 'AED', 'Treatment station', 'Response vehicle', 'Ambulance', 'Oxygen / clinical equipment as authorised'], required: true },
        { id: 'coverageHours', label: 'Coverage hours', type: 'number', min: 1, required: true },
        { id: 'hospitalTransfer', label: 'Referral / transfer arrangements', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'medicalLevel', includes: 'Ambulance' }, title: 'Ambulance service details', fields: [{ id: 'ambulanceCategory', label: 'Ambulance / response category', type: 'text', required: true }, { id: 'dispatchContact', label: 'Authorised dispatch contact process', type: 'textarea', required: true }] }],
      documents: ['Current clinical / professional registrations as applicable', 'Vehicle permits and medical service licences where required', 'Equipment checks and insurance'],
      logistics: ['Attendance, venue access and crowd profile', 'Location of medical station', 'Communication channel and escalation', 'Privacy and secure handling of patient information'],
      pricing: { models: ['per_crew_hour', 'per_shift', 'per_day', 'per_event', 'package', 'quote'], defaultModel: 'per_shift', units: ['per clinician-hour', 'per crew shift', 'per ambulance-hour', 'per event'], quoteFields: ['attendance', 'risk profile', 'coverage hours', 'crew / vehicle level', 'travel'] }
    },
    photographer: {
      summary: 'Define coverage hours, photography style, team size, final image volume, editing, delivery and print / album add-ons.',
      serviceOptions: ['Wedding photography', 'Corporate event photography', 'Portrait / family sessions', 'Concert photography', 'Product / brand photography', 'Conference coverage', 'Photojournalistic coverage'],
      fields: [
        { id: 'photoStyles', label: 'Photography styles', type: 'multi-select', options: ['Documentary', 'Editorial', 'Portrait', 'Fine art', 'Corporate', 'Concert / low-light', 'Product / brand'], required: true },
        { id: 'coverageHours', label: 'Coverage hours', type: 'number-range', min: 1, required: true },
        { id: 'photographerCount', label: 'Photographer count', type: 'number', min: 1, required: true },
        { id: 'editedImages', label: 'Typical edited image count', type: 'number-range', min: 1, required: false },
        { id: 'deliveryDays', label: 'Delivery turnaround', type: 'number', min: 0, unit: 'days', required: true },
        { id: 'rawFiles', label: 'Raw files available?', type: 'select', options: ['Not supplied', 'Available by agreement', 'Included in package'], required: true }
      ],
      conditionalSections: [{ when: { field: 'photoStyles', includes: 'Corporate' }, title: 'Corporate deliverables', fields: [{ id: 'sameDaySelection', label: 'Same-day selects available?', type: 'boolean', required: true }, { id: 'brandUsage', label: 'Commercial / brand usage included?', type: 'boolean', required: true }] }],
      documents: ['Portfolio gallery', 'Usage rights and privacy terms'],
      logistics: ['Shot list and VIP list', 'Lighting / access restrictions', 'Meal and break requirements for long shifts', 'Delivery and backup policy'],
      pricing: { models: ['per_hour', 'half_day', 'full_day', 'per_event', 'package', 'per_image', 'quote'], defaultModel: 'package', units: ['per hour', 'half-day', 'full-day', 'per photographer', 'per event', 'per edited image'], quoteFields: ['hours', 'team size', 'deliverable count', 'editing', 'travel / prints'] }
    },
    videographer: {
      summary: 'Show video format and style, crew, camera coverage, sound, edited deliverables, revisions, delivery times and usage rights.',
      serviceOptions: ['Event highlight film', 'Full ceremony recording', 'Corporate recap', 'Documentary film', 'Interviews', 'Social media reels', 'Multi-camera stage recording'],
      fields: [
        { id: 'videoDeliverables', label: 'Video deliverables', type: 'multi-select', options: ['Highlight film', 'Full event edit', 'Ceremony / speeches', 'Interviews', 'Vertical reels', 'Raw footage by agreement', 'Same-day edit'], required: true },
        { id: 'crewSize', label: 'Crew size', type: 'number', min: 1, required: true },
        { id: 'cameraCount', label: 'Camera count', type: 'number', min: 1, required: true },
        { id: 'audioCapture', label: 'Audio capture', type: 'multi-select', options: ['Camera audio', 'Wireless lavalier', 'Board feed', 'Dedicated audio recorder', 'Client supplies audio feed'], required: true },
        { id: 'revisionRounds', label: 'Editing revisions included', type: 'number', min: 0, required: true },
        { id: 'deliveryWeeks', label: 'Final delivery timeframe', type: 'number', min: 0, unit: 'weeks', required: true }
      ],
      conditionalSections: [{ when: { field: 'videoDeliverables', includes: 'Same-day edit' }, title: 'Same-day editing', fields: [{ id: 'editingStationPower', label: 'Dedicated editing space / power required?', type: 'boolean', required: true }, { id: 'screeningTime', label: 'Required screening time', type: 'text', required: true }] }],
      documents: ['Showreel / portfolio', 'Usage rights, music licensing and privacy terms'],
      logistics: ['Run sheet and access', 'Audio feed and camera positions', 'Power / editing station', 'Publication consent and music rights'],
      pricing: { models: ['per_hour', 'half_day', 'full_day', 'per_event', 'package', 'per_deliverable', 'quote'], defaultModel: 'package', units: ['per hour', 'per crew', 'per event', 'per edited film', 'per reel'], quoteFields: ['crew', 'camera count', 'deliverables', 'editing revisions', 'travel'] }
    },
    drone: {
      summary: 'Describe aerial photo/video services, aircraft class, legal operating permissions, weather restrictions, flight area and deliverables.',
      serviceOptions: ['Aerial event photography', 'Aerial highlight video', 'Venue establishing shots', 'Real-estate / venue content', 'Mapping / site overview where permitted'],
      fields: [
        { id: 'droneDeliverables', label: 'Deliverables', type: 'multi-select', options: ['Aerial photos', 'Aerial video', 'Short highlight clip', 'Venue overview', 'Edited social reels'], required: true },
        { id: 'aircraftCapability', label: 'Aircraft / camera capability', type: 'text', required: true },
        { id: 'flightPermissions', label: 'Required flight permissions available?', type: 'boolean', required: true },
        { id: 'flightArea', label: 'Flight area / height limitations', type: 'textarea', required: true },
        { id: 'weatherPolicy', label: 'Weather cancellation / reschedule policy', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'droneDeliverables', includes: 'Aerial video' }, title: 'Video deliverables', fields: [{ id: 'videoResolution', label: 'Resolution / frame rate options', type: 'text', required: true }, { id: 'editingIncluded', label: 'Editing included?', type: 'boolean', required: true }] }],
      documents: ['Required aviation / drone operator permissions', 'Insurance where required', 'Privacy / filming consent policy'],
      logistics: ['No-fly zones and nearby airports', 'Crowd separation and launch zone', 'Weather and wind limits', 'Venue / authority approval before flight'],
      pricing: { models: ['per_flight_session', 'per_hour', 'per_event', 'package', 'quote'], defaultModel: 'per_flight_session', units: ['per flight session', 'per coverage hour', 'per event', 'per edited deliverable'], quoteFields: ['flight permission', 'location', 'weather risk', 'deliverables', 'editing'] }
    },
    streaming: {
      summary: 'List livestream production by platform, camera count, audio feed, internet requirements, recording, graphics and redundancy.',
      serviceOptions: ['Single-camera stream', 'Multi-camera stream', 'Conference stream', 'Hybrid event', 'Private stream', 'Recording / replay', 'Remote speaker integration'],
      fields: [
        { id: 'streamType', label: 'Streaming format', type: 'multi-select', options: ['Single camera', 'Multi-camera', 'Hybrid', 'Private / invitation-only', 'Remote speaker', 'Recording-only'], required: true },
        { id: 'platforms', label: 'Supported platforms', type: 'multi-select-or-text', options: ['YouTube', 'Facebook', 'Zoom', 'Teams', 'Private RTMP', 'Other'], required: true },
        { id: 'cameraCount', label: 'Camera count', type: 'number', min: 1, required: true },
        { id: 'internetUpload', label: 'Minimum upload bandwidth required', type: 'text', required: true },
        { id: 'recordingIncluded', label: 'Clean recording included?', type: 'boolean', required: true },
        { id: 'graphicsOptions', label: 'Graphics / overlays', type: 'multi-select', options: ['Lower thirds', 'Sponsor logo', 'Slides', 'Live captions', 'Picture-in-picture', 'Custom graphics'], required: false }
      ],
      conditionalSections: [{ when: { field: 'streamType', includes: 'Hybrid' }, title: 'Hybrid event interactions', fields: [{ id: 'remoteParticipants', label: 'Remote speakers / audience supported?', type: 'boolean', required: true }, { id: 'moderatorIncluded', label: 'Remote moderator included?', type: 'boolean', required: true }] }],
      documents: ['Platform / privacy setup notes', 'Music / broadcast rights confirmation where applicable'],
      logistics: ['Dedicated upload speed test', 'Backup internet and power', 'Camera / audio routing', 'Stream test and private rehearsal'],
      pricing: { models: ['per_hour', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'package', units: ['per stream-hour', 'per camera', 'per event', 'per recorded deliverable'], quoteFields: ['platform', 'camera count', 'crew', 'internet / redundancy', 'graphics'] }
    },
    photobooth: {
      summary: 'Set booth format, print allowance, backdrop, props, digital delivery, footprint, attendants and extra-print pricing.',
      serviceOptions: ['Enclosed photo booth', 'Open-air booth', '360 video booth', 'GIF / boomerang booth', 'Roaming photo booth', 'Green-screen booth', 'Guestbook photo booth'],
      fields: [
        { id: 'boothFormat', label: 'Booth format', type: 'multi-select', options: ['Enclosed', 'Open-air', '360 video', 'GIF / boomerang', 'Roaming', 'Green screen'], required: true },
        { id: 'printsIncluded', label: 'Prints included', type: 'number', min: 0, required: true },
        { id: 'digitalDelivery', label: 'Digital delivery', type: 'multi-select', options: ['QR download', 'Email', 'WhatsApp / link', 'Online gallery', 'USB'], required: true },
        { id: 'backdropOptions', label: 'Backdrops', type: 'multi-select-or-text', options: ['Plain', 'Sequin', 'Custom branded', 'Green screen', 'Flower wall', 'Customer supplied'], required: true },
        { id: 'attendant', label: 'Attendant included?', type: 'boolean', required: true },
        { id: 'footprint', label: 'Space and power needed', type: 'text', required: true }
      ],
      conditionalSections: [{ when: { field: 'boothFormat', includes: '360 video' }, title: '360 booth safety and space', fields: [{ id: 'platformDiameter', label: 'Platform / clear space dimensions', type: 'text', required: true }, { id: 'queueControl', label: 'Queue management plan', type: 'textarea', required: true }] }],
      documents: ['Portfolio / sample booth output', 'Data privacy / digital delivery terms'],
      logistics: ['Setup and test window', 'Power and space', 'Print refill rules', 'Digital sharing consent and event Wi-Fi'],
      pricing: { models: ['per_hour', 'per_event', 'package', 'per_print', 'quote'], defaultModel: 'per_event', units: ['per hour', 'per booth', 'per event', 'per extra print'], quoteFields: ['format', 'duration', 'prints', 'backdrop', 'attendant'] }
    },
    planner: {
      summary: 'Offer planning packages by planning stage, event complexity, vendor management, guest count, meetings, milestones and budget scope.',
      serviceOptions: ['Full-service planning', 'Partial planning', 'Wedding planning', 'Corporate event planning', 'Festival / public event planning', 'Destination event planning', 'Vendor sourcing only'],
      fields: [
        { id: 'planningScope', label: 'Planning scope', type: 'multi-select', options: ['Full service', 'Partial planning', 'Venue / supplier sourcing', 'Budget management', 'Run-of-show', 'Design coordination', 'Vendor management'], required: true },
        { id: 'planningStart', label: 'When planning begins', type: 'select', options: ['12+ months before', '6–12 months', '3–6 months', '1–3 months', 'Final month', 'Flexible'], required: true },
        { id: 'guestRange', label: 'Typical guest count range', type: 'text', required: true },
        { id: 'meetingsIncluded', label: 'Meetings included', type: 'number', min: 0, required: true },
        { id: 'vendorCount', label: 'Typical vendor count managed', type: 'number-range', min: 0, required: false },
        { id: 'budgetHandling', label: 'Budget handling', type: 'select', options: ['Advice / tracking only', 'Purchasing with client approval', 'Full vendor payment management by contract', 'Not included'], required: true }
      ],
      conditionalSections: [{ when: { field: 'planningScope', includes: 'Budget management' }, title: 'Budget controls', fields: [{ id: 'budgetReporting', label: 'Budget report frequency', type: 'select', options: ['Weekly', 'Monthly', 'At each milestone', 'Custom'], required: true }, { id: 'approvalThreshold', label: 'Spend approval threshold', type: 'money', required: false }] }],
      documents: ['Portfolio / event case studies', 'Service agreement and cancellation terms'],
      logistics: ['Planning timeline and milestone owners', 'Client approvals and decision deadlines', 'Vendor communications', 'Rehearsal / event-day presence'],
      pricing: { models: ['fixed_fee', 'percentage_of_budget', 'per_hour', 'monthly_retainer', 'package', 'quote'], defaultModel: 'package', units: ['per event', 'per planning month', 'per consultation-hour', 'percentage of approved event budget'], quoteFields: ['planning stage', 'guest count', 'vendor count', 'deliverables', 'budget'] }
    },
    onday: {
      summary: 'Define event-day coordination windows, number of coordinators, run-sheet ownership, vendor check-in, rehearsal, and overtime.',
      serviceOptions: ['Event-day coordination', 'Wedding-day coordination', 'Vendor check-in and cueing', 'Ceremony coordination', 'Stage / programme coordination', 'Rehearsal coordination'],
      fields: [
        { id: 'coverageWindow', label: 'Coverage window', type: 'select', options: ['Setup through event end', 'Ceremony only', 'Main programme only', 'Setup and handover', 'Custom hours'], required: true },
        { id: 'coordinatorCount', label: 'Coordinators supplied', type: 'number', min: 1, required: true },
        { id: 'vendorCheckIn', label: 'Vendor arrival / check-in management?', type: 'boolean', required: true },
        { id: 'runSheetOwnership', label: 'Run sheet prepared by', type: 'select', options: ['Supplier', 'Client / planner', 'Joint preparation'], required: true },
        { id: 'rehearsal', label: 'Rehearsal included?', type: 'boolean', required: true },
        { id: 'overtimePolicy', label: 'Overtime policy', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'coverageWindow', equals: 'Setup through event end' }, title: 'Extended event-day coverage', fields: [{ id: 'breakPlan', label: 'Break / meal arrangements', type: 'textarea', required: true }, { id: 'lateFinish', label: 'Latest standard finish time', type: 'text', required: true }] }],
      documents: ['Service agreement and run-sheet template / sample'],
      logistics: ['Final schedule and key contacts', 'Supplier arrival / departure list', 'Decision-maker and escalation chain', 'Venue handover and closing responsibilities'],
      pricing: { models: ['per_hour', 'half_day', 'full_day', 'per_event', 'package', 'quote'], defaultModel: 'full_day', units: ['per coordinator-hour', 'half-day', 'full-day', 'per event', 'per rehearsal'], quoteFields: ['coverage hours', 'coordinator count', 'guest count', 'vendor count', 'rehearsal'] }
    },
    rsvp: {
      summary: 'Describe guest-list collection, RSVP channels, reminders, seating data, dietary collection, reporting and day-of check-in.',
      serviceOptions: ['RSVP setup', 'WhatsApp RSVP management', 'Guest confirmations', 'Reminder campaign', 'Seating list preparation', 'Guest helpdesk', 'Check-in desk staffing'],
      fields: [
        { id: 'guestServices', label: 'Guest management services', type: 'multi-select', options: ['RSVP setup', 'RSVP follow-up', 'WhatsApp reminders', 'Phone follow-up', 'Seating list', 'Dietary collection', 'Guest helpdesk', 'Event check-in'], required: true },
        { id: 'guestCount', label: 'Guest list size supported', type: 'number-range', min: 1, required: true },
        { id: 'rsvpChannels', label: 'RSVP channels', type: 'multi-select', options: ['WhatsApp', 'SMS', 'Phone', 'Email', 'Online form', 'Client platform'], required: true },
        { id: 'reporting', label: 'Reports provided', type: 'multi-select', options: ['Confirmed / declined', 'Pending responses', 'Plus-ones', 'Dietary requirements', 'Seating list', 'Check-in list'], required: true },
        { id: 'dataDeletion', label: 'Guest data retention / deletion policy', type: 'textarea', required: true }
      ],
      conditionalSections: [{ when: { field: 'guestServices', includes: 'Event check-in' }, title: 'Event check-in staffing', fields: [{ id: 'checkInStaff', label: 'Check-in staff count', type: 'number', min: 1, required: true }, { id: 'offlineList', label: 'Offline guest-list backup available?', type: 'boolean', required: true }] }],
      documents: ['Privacy notice / data handling policy', 'Sample reporting template'],
      logistics: ['Guest list import format and deadline', 'Approved message templates', 'Client sign-off on reminders', 'Data minimisation and deletion timeline'],
      pricing: { models: ['per_guest', 'per_invitation', 'fixed_fee', 'per_hour', 'package', 'quote'], defaultModel: 'package', units: ['per invited guest', 'per RSVP', 'per reminder campaign', 'per event', 'per staff-hour'], quoteFields: ['guest count', 'channels', 'reminder volume', 'check-in', 'reporting'] }
    }
  };

  var CATEGORY_DEFAULTS = {
    infrastructure: { pricingHint: 'Price by rental period, unit, area, bundle or event; show delivery, setup, strike and deposit separately.' },
    catering: { pricingHint: 'Price by guest, serving, platter, product unit, staff-hour or package; show minimum orders and dietary / menu-specific differences.' },
    decor: { pricingHint: 'Price by item, arrangement, measured area, design fee, package or custom quote; separate hire deposits and installation.' },
    technical: { pricingHint: 'Price equipment, operator, production crew, programming, setup and overtime transparently.' },
    entertainment: { pricingHint: 'Price per set, hour, performer, appearance or event; clarify duration, overtime, travel and the technical rider.' },
    security: { pricingHint: 'Price by qualified staff-hour, shift, team or event; clarify minimum shifts, supervisor coverage, transport and approved scope.' },
    media: { pricingHint: 'Price coverage time and deliverables; separate editing, prints, rush delivery, raw files, travel and usage rights.' },
    management: { pricingHint: 'Price by package, fixed scope, hour, planning month or agreed percentage; list included meetings, deliverables and scope boundaries.' }
  };

  var CURRENCY_OPTIONS = [
    { value: 'USD', label: 'USD — US Dollar' },
    { value: 'ZWG', label: 'ZWG — Zimbabwe Gold' },
    { value: 'BWP', label: 'BWP — Botswana Pula' },
    { value: 'ZAR', label: 'ZAR — South African Rand' },
    { value: 'OTHER', label: 'Other / specify' }
  ];

  function enrichCatalog() {
    // Keep one display label per pricing-model ID for renderer lookups.
    ONBOARDING_CONFIG.pricingModelOptions = ONBOARDING_CONFIG.pricingModelOptions.filter(function (option, index, all) {
      return all.findIndex(function (candidate) { return candidate.id === option.id; }) === index;
    });
    CATEGORIES.forEach(function (category) {
      category.items = (category.types || []).map(function (type) { return type.name; });
      category.types = (category.types || []).map(function (type) {
        var profile = TYPE_PROFILES[type.id] || {};
        type.onboarding = {
          summary: profile.summary || ('Configure the specific services, requirements, inventory and pricing for ' + type.name + '.'),
          serviceOptions: profile.serviceOptions || [],
          fields: profile.fields || [],
          conditionalSections: profile.conditionalSections || [],
          documents: profile.documents || [],
          logistics: profile.logistics || [],
          pricing: profile.pricing || { models: ['per_event', 'package', 'quote'], defaultModel: 'quote', units: ['per event', 'per package'], quoteFields: ['scope', 'quantity', 'duration', 'location'] },
          commonOfferingFields: ONBOARDING_CONFIG.commonOfferingFields,
          sharedPricingFields: ONBOARDING_CONFIG.sharedPricingFields,
          availabilityFields: ONBOARDING_CONFIG.commonAvailabilityFields,
          categoryPricingHint: (CATEGORY_DEFAULTS[category.id] || {}).pricingHint || '',
          requiredBeforePublish: ['offering name', 'description', 'pricing or quote terms', 'availability', 'service area', 'supplier contact / booking method']
        };
        return type;
      });
      category.onboarding.itemManagement = ONBOARDING_CONFIG.itemManagement;
      category.onboarding.currencyOptions = CURRENCY_OPTIONS;
    });
  }

  enrichCatalog();

  window.EATOUTS_SUPPLIER_SCHEMA_VERSION = SCHEMA_VERSION;
  window.EATOUTS_SUPPLIER_ONBOARDING_CONFIG = ONBOARDING_CONFIG;
  window.EATOUTS_SUPPLIER_CATALOG = CATEGORIES;
})();
