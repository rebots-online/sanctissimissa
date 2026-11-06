# DOCS/sdk/revenuecat-purchases-js/ — RevenueCat Web SDK (@revenuecat/purchases-js)

**Pinned version:** @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/revenuecat-purchases-js/<file>.md §<heading>`.

## Curator notes

- The Web SDK has **no `logIn`**: identity is set at `Purchases.configure({apiKey, appUserId})` and switched with `changeUser(newAppUserId)` (see `purchases-js-1.74.0.d.ts` §class Purchases and `web-sdk.md` §Identifying Customers). Anonymous IDs come from `Purchases.generateRevenueCatAnonymousAppUserId()`.
- Purchase entry points: `purchase({rcPackage, ...})` (current) and `purchasePackage(...)` (older signature) — both in the typings.
- `customer-info.md`, `identifying-customers.md`, `configuring-sdk.md`, `displaying-products.md`, `making-purchases.md`, `restoring-purchases.md` are the cross-platform RevenueCat guides (tabs for Web, Kotlin, Swift, …); the same snapshot is also in `DOCS/sdk/purchases-android/`.
- `purchases-js-1.74.0.d.ts.md` is the full public TypeScript surface from the published npm tarball — the authoritative signature reference for 1.74.0.
- Architecture context: ARCHITECTURE §K (billing; netlify `/billing/key`, `/billing/access`).

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`web-sdk.md`](web-sdk.md) | Web SDK guide: configure, identify, getCustomerInfo, getOfferings, purchase, paywall | curl, verbatim | <https://www.revenuecat.com/docs/web/web-billing/web-sdk.md> |
| [`installation-web-sdk.md`](installation-web-sdk.md) | Install @revenuecat/purchases-js | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/installation/web-sdk.md> |
| [`README.md`](README.md) | Repository README | curl, verbatim | <https://raw.githubusercontent.com/RevenueCat/purchases-js/main/README.md> |
| [`purchases-js-1.74.0.d.ts.md`](purchases-js-1.74.0.d.ts.md) | Full TypeScript API surface (verbatim) | curl npm tarball, verbatim | <https://registry.npmjs.org/@revenuecat/purchases-js/-/purchases-js-1.74.0.tgz (package/dist/Purchases.es.d.ts)> |
| [`configuring-sdk.md`](configuring-sdk.md) | Purchases.configure — all platforms incl. Web and Kotlin | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/configuring-sdk.md> |
| [`displaying-products.md`](displaying-products.md) | Offerings / getOfferings, packages, current offering | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/displaying-products.md> |
| [`making-purchases.md`](making-purchases.md) | purchase(...) flow, cancellations, errors | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/making-purchases.md> |
| [`restoring-purchases.md`](restoring-purchases.md) | restorePurchases semantics, transfer behavior | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/restoring-purchases.md> |
| [`customer-info.md`](customer-info.md) | CustomerInfo, entitlements.active, listener | curl, verbatim | <https://www.revenuecat.com/docs/customers/customer-info.md> |
| [`identifying-customers.md`](identifying-customers.md) | App User IDs, logIn / logOut (native), changeUser (web), anonymous IDs | curl, verbatim | <https://www.revenuecat.com/docs/customers/identifying-customers.md> |

## Section map (deep-link targets)

### `web-sdk.md`

  - Installation
  - General setup
    - Connect with billing provider
    - Create a web config for your provider
      - For RevenueCat Billing
      - For Paddle Billing
      - For Stripe Billing
  - SDK configuration
  - Identifying Customers
    - Identified Customers
    - Anonymous Customers
  - Getting customer information
  - Building your paywall
    - Getting and displaying products
    - Purchasing a package
    - Presenting a RevenueCat Paywall with purchases-js
    - Customizing the purchase flow
  - Testing

### `installation-web-sdk.md`

  - Installation
  - Next steps

### `README.md`

- Prerequisites
- Installation
- Usage
- Development
  - Install the library in a local project
    - Using a local `@revenuecat/purchases-ui-js`
      - Reverting
  - Running Storybook
    - Environment Setup for Purchase Stories
    - Option 1: Internal Teams
    - Option 2: Setup Manually
  - Running tests
  - Running linters
  - Running E2E tests
  - Update API specs
- Publishing a new version

### `purchases-js-1.74.0.d.ts.md`

- @revenuecat/purchases-js 1.74.0 — public typings

### `configuring-sdk.md`

  - Initialization
  - Enabling Debug Logs
  - Testing with Test Store
    - Switching between Test Store and Real Stores
  - Additional Configuration
    - Proxies & configuration for users in Mainland China, Russia, and Myanmar
    - iOS
      - Listening for CustomerInfo updates
      - Handling Promoted Purchases
    - Android
      - Listening for CustomerInfo updates
  - Next steps

### `displaying-products.md`

  - Fetching Offerings
    - Fetching Offerings by Placement
    - Custom Offering identifiers
  - Displaying Packages
      - Getting the Product from the Package
  - Choosing which Offering to display
  - Best Practices
  - Next Steps

### `making-purchases.md`

  - Next Steps

### `restoring-purchases.md`

  - Restore behavior
  - Syncing purchases without user interaction
    - Considerations
  - Restoring Purchases for Consumables and Non-renewing Subscriptions
  - Issues restoring one-time purchases with Google's Billing Client 8 when using anonymous users
      - Auto Backup
      - Key-Value backups
    - What should you do?
    - How to test backups
  - Next Steps

### `customer-info.md`

  - Getting subscription status via the SDK
    - Checking If A User Is Subscribed
    - Restoring Purchases
    - Cache
    - Listening For CustomerInfo Updates
    - Reference
  - Getting subscription status via the REST API
  - Handling Refunds
  - Offline Entitlements
    - Some things to note:
  - Next Steps

### `identifying-customers.md`

  - Anonymous App User IDs
  - Custom App User IDs
    - Logging in during configuration
    - Logging in after configuration
    - Logging Out
      - Logging back in
      - Switching accounts
  - Supporting your customers
  - Aliases
  - Tips for Setting Custom App User IDs
  - Blocked App User IDs
  - Advanced Topics
      - Only Configure the SDK with a custom App User ID
      - Do not Logout the User
  - Next Steps
