/* EatOuts role/permission matrix — single source of truth for platform and
   business permissions.

   Two layers are supported:
     1. Coarse page/workspace tokens kept for backwards compatibility with the
        package pages (e.g. "orders", "blog", "business:*", "customer:*").
     2. Fine-grained action permissions from the build spec, using the
        "<domain>.<action>" form: users.view/edit/delete, businesses.view/
        approve/suspend, orders.view/fulfil, deliveries.view/dispatch,
        staff.view/edit/create_login/delete/view_salary, feedback.view/respond/
        delete, blog.view/edit/publish/delete, finance.view/edit,
        analytics.view, settings.view/edit.

   can(user, perm) matches a required permission against every grant held by
   the user's roles. A grant matches when it is "*", equal, a "<domain>.*"
   wildcard, a bare coarse domain (e.g. "blog" grants "blog.view"), or one of
   the coarse group tokens ("business:*", "customer:*"). */
(function () {
  var ALL = '*';

  /* Fine-grained permission catalog (documentation + validation aid). */
  var PERMISSIONS = {
    platform: [
      'users.view', 'users.edit', 'users.delete',
      'businesses.view', 'businesses.approve', 'businesses.suspend',
      'orders.view', 'orders.fulfil',
      'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'staff.create_login', 'staff.delete', 'staff.view_salary',
      'feedback.view', 'feedback.respond', 'feedback.delete',
      'blog.view', 'blog.edit', 'blog.publish', 'blog.delete',
      'finance.view', 'finance.edit',
      'analytics.view',
      'settings.view', 'settings.edit',
      'verification.review', 'disputes.manage', 'notifications.send',
      'content.moderate', 'locations.manage', 'audit.view'
    ],
    business: [
      'orders.view', 'orders.fulfil',
      'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'staff.create_login', 'staff.delete', 'staff.view_salary',
      'menu.edit', 'beverage.edit', 'promotions.edit', 'events.manage',
      'reservations.manage', 'rooms.manage', 'schedule.manage', 'gallery.edit',
      'reviews.view', 'reviews.respond',
      'billing.view', 'billing.edit',
      'quotes.manage', 'bookings.manage',
      'users.view', 'users.edit',
      'analytics.view', 'settings.view', 'settings.edit', 'feedback.respond'
    ],
    customer: [
      'customer.profile.edit', 'customer.addresses.manage', 'customer.favourites.manage',
      'customer.orders.view', 'customer.orders.reorder', 'customer.feedback.create'
    ]
  };

  /* Coarse tokens preserved verbatim from the delivered package so existing
     page gating keeps working. */
  var LEGACY = {
    platform_admin: [ALL],
    platform_ops: ['admin_dashboard', 'users_manager', 'feedback', 'verification', 'disputes', 'platform_analytics', 'notifications', 'settings'],
    platform_support: ['feedback', 'users_manager'],
    platform_author: ['blog'],
    platform_author_editor: ['blog'],
    platform_analyst: ['platform_analytics'],
    biz_owner: ['business:*', 'staff', 'delivery', 'orders', 'reservations', 'rooms', 'reviews', 'billing', 'analytics', 'quotes', 'bookings'],
    biz_admin: ['business:*', 'staff', 'delivery', 'orders', 'reservations', 'rooms', 'reviews', 'analytics'],
    biz_manager: ['orders', 'staff'],
    staff: ['orders'],
    customer: ['customer:*'],
    supplier: ['quotes', 'bookings', 'business:supplier'],
    lodge_owner: ['business:lodge', 'rooms', 'bookings', 'orders', 'reviews', 'billing', 'analytics']
  };

  /* Fine-grained presets per role (spec platform + business roles). */
  var FINE = {
    /* canonical platform roles */
    super_admin: [ALL],
    staff_content: ['blog.view', 'blog.edit', 'blog.delete', 'feedback.view', 'feedback.respond', 'analytics.view'],
    staff_ops: ['businesses.view', 'businesses.approve', 'businesses.suspend', 'orders.view',
      'deliveries.view', 'deliveries.dispatch', 'feedback.view', 'feedback.respond',
      'finance.view', 'finance.edit', 'analytics.view', 'verification.review', 'invoices.manage'],
    staff_support: ['feedback.view', 'feedback.respond', 'users.view', 'orders.view', 'deliveries.view'],
    moderator: ['feedback.view', 'feedback.respond', 'blog.view', 'content.moderate', 'analytics.view'],
    /* legacy platform aliases */
    platform_author: ['blog.view', 'blog.edit'],
    platform_author_editor: ['blog.view', 'blog.edit', 'blog.publish', 'blog.delete'],
    platform_ops: ['users.view', 'users.edit', 'businesses.view', 'businesses.approve', 'businesses.suspend',
      'orders.view', 'deliveries.view', 'deliveries.dispatch', 'feedback.view', 'feedback.respond',
      'finance.view', 'finance.edit', 'analytics.view', 'verification.review', 'disputes.manage', 'settings.view'],
    platform_support: ['feedback.view', 'feedback.respond', 'users.view', 'orders.view', 'deliveries.view'],
    platform_analyst: ['analytics.view'],
    /* business roles */
    biz_owner: ['business:*', 'staff.view_salary', 'staff.delete', 'billing.edit', 'settings.edit', 'quotes.manage', 'bookings.manage'],
    biz_admin: ['orders.view', 'orders.fulfil', 'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'staff.create_login', 'staff.delete',
      'menu.edit', 'beverage.edit', 'promotions.edit', 'events.manage', 'reservations.manage',
      'rooms.manage', 'schedule.manage', 'gallery.edit', 'reviews.view', 'reviews.respond',
      'billing.view', 'quotes.manage', 'bookings.manage', 'users.view', 'users.edit',
      'analytics.view', 'settings.view', 'feedback.respond'],
    biz_manager: ['orders.view', 'orders.fulfil', 'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'menu.edit', 'beverage.edit', 'promotions.edit',
      'events.manage', 'reservations.manage', 'rooms.manage', 'schedule.manage', 'gallery.edit',
      'reviews.view', 'reviews.respond', 'analytics.view', 'feedback.respond'],
    /* aliases used by some type pickers */
    owner: ['business:*', 'staff.view_salary', 'staff.delete', 'billing.edit', 'settings.edit', 'quotes.manage', 'bookings.manage'],
    admin: ['orders.view', 'orders.fulfil', 'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'staff.create_login', 'staff.delete',
      'menu.edit', 'beverage.edit', 'promotions.edit', 'events.manage', 'reservations.manage',
      'rooms.manage', 'schedule.manage', 'gallery.edit', 'reviews.view', 'reviews.respond',
      'billing.view', 'quotes.manage', 'bookings.manage', 'users.view', 'users.edit',
      'analytics.view', 'settings.view', 'feedback.respond'],
    manager: ['orders.view', 'orders.fulfil', 'deliveries.view', 'deliveries.dispatch',
      'staff.view', 'staff.edit', 'menu.edit', 'beverage.edit', 'promotions.edit',
      'events.manage', 'reservations.manage', 'rooms.manage', 'schedule.manage', 'gallery.edit',
      'reviews.view', 'reviews.respond', 'analytics.view', 'feedback.respond'],
    /* job/type-specific business roles */
    chef: ['orders.view', 'orders.fulfil', 'menu.edit', 'beverage.edit'],
    cook: ['orders.view', 'orders.fulfil', 'menu.edit'],
    cashier: ['orders.view', 'orders.fulfil', 'billing.view'],
    server: ['orders.view', 'orders.fulfil', 'reservations.manage'],
    bartender: ['orders.view', 'orders.fulfil', 'beverage.edit'],
    baker: ['orders.view', 'orders.fulfil', 'menu.edit'],
    stock_manager: ['menu.edit', 'beverage.edit', 'analytics.view'],
    reception: ['reservations.manage', 'rooms.manage', 'bookings.manage'],
    housekeeping: ['rooms.manage'],
    event_coordinator: ['events.manage', 'reservations.manage', 'quotes.manage', 'bookings.manage'],
    schedule_manager: ['schedule.manage', 'analytics.view'],
    delivery_driver: ['deliveries.view', 'orders.view'],
    /* supplier / lodge */
    supplier: ['quotes.manage', 'bookings.manage', 'business:supplier'],
    lodge_owner: ['business:lodge', 'rooms.manage', 'bookings.manage', 'orders.view', 'reviews.respond', 'billing.view', 'analytics.view']
  };

  /* Merge coarse + fine so MATRIX keeps its original role -> array shape. */
  var MATRIX = {};
  Object.keys(LEGACY).concat(Object.keys(FINE)).forEach(function (role) {
    if (MATRIX[role]) return;
    MATRIX[role] = (LEGACY[role] || []).concat(FINE[role] || []);
  });

  var CUSTOMER_PERMS = PERMISSIONS.customer;

  /* Broadly-applicable business capabilities any business member/type token
     grants. Deliberately excludes sensitive actions (salary, billing edit,
     settings edit, staff delete) and supplier-only quote/booking rights. */
  var CORE_BUSINESS = [
    'orders.view', 'orders.fulfil', 'deliveries.view', 'deliveries.dispatch',
    'staff.view', 'staff.edit', 'staff.create_login',
    'menu.edit', 'beverage.edit', 'promotions.edit', 'events.manage',
    'reservations.manage', 'rooms.manage', 'schedule.manage', 'gallery.edit',
    'reviews.view', 'reviews.respond', 'billing.view',
    'users.view', 'users.edit', 'analytics.view', 'settings.view', 'feedback.respond'
  ];

  /* Explicit expansion for the package's coarse page/workspace tokens. */
  var COARSE = {
    orders: ['orders.view', 'orders.fulfil'],
    staff: ['staff.view', 'staff.edit', 'staff.create_login'],
    delivery: ['deliveries.view', 'deliveries.dispatch'],
    deliveries: ['deliveries.view', 'deliveries.dispatch'],
    reservations: ['reservations.manage'],
    rooms: ['rooms.manage'],
    reviews: ['reviews.view', 'reviews.respond'],
    billing: ['billing.view', 'billing.edit'],
    analytics: ['analytics.view'],
    quotes: ['quotes.manage'],
    bookings: ['bookings.manage'],
    blog: ['blog.view', 'blog.edit'],
    feedback: ['feedback.view', 'feedback.respond'],
    verification: ['verification.review'],
    disputes: ['disputes.manage'],
    notifications: ['notifications.send'],
    settings: ['settings.view', 'settings.edit'],
    users_manager: ['users.view', 'users.edit'],
    platform_analytics: ['analytics.view'],
    admin_dashboard: ['admin_dashboard']
  };

  function roles(user) {
    return (user && Array.isArray(user.roles) ? user.roles : [user && user.type].filter(Boolean));
  }

  /* Grants held by a user = union of every role's granted tokens. A user may
     also carry an explicit platformRole (used by the staff workspace). */
  function grants(user) {
    var list = roles(user).slice();
    if (user && user.platformRole) list.push(user.platformRole);
    var out = [];
    list.forEach(function (r) {
      (MATRIX[r] || []).forEach(function (p) { if (out.indexOf(p) < 0) out.push(p); });
    });
    return out;
  }

  function match(grant, perm) {
    if (!grant || !perm) return false;
    if (grant === ALL || grant === perm) return true;
    if (grant.slice(-2) === '.*') return perm.indexOf(grant.slice(0, -1)) === 0;
    if (grant === 'business:*' || grant.indexOf('business:') === 0) {
      return CORE_BUSINESS.indexOf(perm) >= 0;
    }
    if (grant === 'customer:*') {
      return perm.indexOf('customer.') === 0 || CUSTOMER_PERMS.indexOf(perm) >= 0;
    }
    if (COARSE[grant]) return COARSE[grant].indexOf(perm) >= 0;
    return false;
  }

  function can(user, perm) {
    if (perm == null) return false;
    var g = grants(user);
    for (var i = 0; i < g.length; i++) if (match(g[i], perm)) return true;
    return false;
  }

  function hasAny(user, perms) {
    return (perms || []).some(function (p) { return can(user, p); });
  }

  function describe(r) { return (r || '').replace(/_/g, ' '); }

  /* Groups of equivalent role names so a page can guard on either the
     canonical or the legacy alias (platform_ops ≡ staff_ops, etc.). */
  var ROLE_GROUPS = [
    ['platform_admin', 'super_admin'],
    ['platform_ops', 'staff_ops'],
    ['platform_support', 'staff_support'],
    ['platform_author', 'platform_author_editor', 'staff_content'],
    ['platform_analyst', 'staff_analyst'],
    ['biz_owner', 'owner'],
    ['biz_admin', 'admin'],
    ['biz_manager', 'manager']
  ];

  function sameGroup(a, b) {
    if (a === b) return true;
    for (var i = 0; i < ROLE_GROUPS.length; i++) {
      var g = ROLE_GROUPS[i];
      if (g.indexOf(a) >= 0 && g.indexOf(b) >= 0) return true;
    }
    return false;
  }

  /* Effective role names carried by a session user: roles + platformRole + type. */
  function effectiveRoles(user) {
    var out = [];
    if (!user) return out;
    var add = function (r) { if (r && out.indexOf(r) < 0) out.push(r); };
    (Array.isArray(user.roles) ? user.roles : []).forEach(add);
    add(user.platformRole);
    add(user.type);
    return out;
  }

  /* True when the user holds the role or any alias in its group. */
  function hasRole(user, role) {
    if (!role) return false;
    var eff = effectiveRoles(user);
    for (var i = 0; i < eff.length; i++) if (sameGroup(eff[i], role)) return true;
    return false;
  }

  window.EatoutsRoles = {
    MATRIX: MATRIX,
    PERMISSIONS: PERMISSIONS,
    roles: roles,
    grants: grants,
    can: can,
    hasAny: hasAny,
    describe: describe,
    effectiveRoles: effectiveRoles,
    hasRole: hasRole
  };
})();
