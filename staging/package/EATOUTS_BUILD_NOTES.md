# EatOuts manager/auth build

This package adds the requested EatOuts authentication, onboarding, business-manager, platform-admin, customer and shared utility layer.

## Important integration choice

The existing EatOuts app already loads `js/eatouts-db.js` and `js/eatouts-auth.js` from its main page. This package provides compatible offline implementations for those modules and extends the auth surface with:

- `getUser()`
- `hasRole()`
- `can()`
- `setActiveBusiness()`
- `getActiveBusiness()`
- `login()`
- `loginDemo()`
- `logout()`
- `routeFor()`

If your production versions of these files already contain more data/logic, merge the new APIs into those existing files instead of blindly replacing them.

## Demo credentials

All demo accounts use PIN `1234`.

| Type | WhatsApp | Main route |
|---|---|---|
| Customer | 26770000001 | `eatouts_profile.html` |
| Restaurant owner | 26770000002 | `restaurant-dashboard.html` |
| Bottle store | 26770000003 | `restaurant-dashboard.html` |
| Caterer | 26770000004 | `restaurant-dashboard.html` |
| Lodge | 26770000005 | `room-manager.html` |
| Supplier | 26770000006 | `quote-manager.html` |
| Platform admin | 26770000099 | `eatouts_admin_dashboard.html` |

## Included HTMLs

### Authentication & onboarding
- `eatouts_user_onboarding.html`
- `eatouts_login.html`
- `eatouts_business_signup.html`
- `bottle-store-onboarding.html`
- `caterer-onboarding.html`
- `lodge-onboarding.html`
- `supplier-onboarding.html`

### Business manager
- `staff-manager.html`
- `delivery-manager.html`
- `order-manager.html`
- `reservation-manager.html`
- `room-manager.html`
- `review-manager.html`
- `billing-manager.html`
- `analytics-manager.html`
- `quote-manager.html`
- `booking-manager.html`

### Platform admin
- `eatouts_admin_dashboard.html`
- `eatouts_users_manager.html`
- `feedback_manager.html`
- `blog_creator_dashboard.html`
- `eatouts_verification_queue.html`
- `eatouts_disputes.html`
- `eatouts_platform_analytics.html`
- `eatouts_notifications.html`
- `eatouts_settings.html`

### Customer
- `eatouts_favourites.html`
- `eatouts_orders.html`
- `eatouts_profile.html`
- `eatouts_addresses.html`

### Existing pages updated
- `restaurant-onboarding.html`
- `restaurant-dashboard.html`
- `eatouts_feedback.html`
- `menu-onboarding.html`
- `eatouts-suppliers.html`

## Shared utilities

- `assets/data/supplier_catalog.js`
- `js/eatouts-db.js`
- `js/eatouts-roles.js`
- `js/eatouts-users.js`
- `js/eatouts-feedback.js`
- `js/eatouts-blog.js`
- `js/eatouts-auth.js`
- `js/eatouts-manager.js`
- `assets/eatouts-manager.css`

## Data model

The demo DB is stored in localStorage under:

`eatouts_db_v2`

It includes users, businesses, staff, orders, reservations, rooms, reviews, feedback, quotes, bookings, invoices, verification records, disputes, notifications and platform settings.

The page layer is deliberately offline-first. Production integrations can replace the CRUD methods behind `EatoutsDB` without requiring every HTML page to be rewritten.

## Existing app integration

Your existing `index.html`/customer-facing application can continue using its existing directory, menu, bridge and venue data. The new manager pages read shared business/order/user state through `EatoutsDB`.

The package does not overwrite your uploaded main app.

## Verification

- All shared JavaScript files passed Node syntax validation.
- All inline JavaScript blocks in the generated HTML files passed Node syntax validation.
- The pages use the existing EatOuts mobile/portrait direction and the existing localStorage/offline approach.
