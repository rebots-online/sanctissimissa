# DOCS/sdk/purchases-android/ — RevenueCat Android SDK (com.revenuecat.purchases:purchases)

**Pinned version:** purchases-android 11.2.0 (Maven Central `release` on 2026-11-06)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/purchases-android/<file>.md §<heading>`.

## Curator notes

- Kotlin calls covered: `Purchases.configure(PurchasesConfiguration.Builder(context, apiKey).appUserID(...).build())` → `configuring-sdk.md`; `Purchases.sharedInstance.getOfferingsWith(...)` → `displaying-products.md`; `purchaseWith(PurchaseParams.Builder(activity, pkg).build(), onError, onSuccess)` → `making-purchases.md`; `restorePurchasesWith` → `restoring-purchases.md`; `logIn` / `logOut` → `identifying-customers.md`; `CustomerInfo.entitlements` → `customer-info.md`.
- These guides are cross-platform (tabbed); read the **Kotlin** blocks. Identical snapshot lives in `DOCS/sdk/revenuecat-purchases-js/`.
- Underlying store: Google Play Billing Library — see `DOCS/sdk/play-billing/`.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`README.md`](README.md) | Repository README | curl, verbatim | <https://raw.githubusercontent.com/RevenueCat/purchases-android/main/README.md> |
| [`installation-android.md`](installation-android.md) | Gradle install, BILLING permission, launchMode | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/installation/android.md> |
| [`configuring-sdk.md`](configuring-sdk.md) | Purchases.configure — all platforms incl. Web and Kotlin | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/configuring-sdk.md> |
| [`displaying-products.md`](displaying-products.md) | Offerings / getOfferings, packages, current offering | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/displaying-products.md> |
| [`making-purchases.md`](making-purchases.md) | purchase(...) flow, cancellations, errors | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/making-purchases.md> |
| [`restoring-purchases.md`](restoring-purchases.md) | restorePurchases semantics, transfer behavior | curl, verbatim | <https://www.revenuecat.com/docs/getting-started/restoring-purchases.md> |
| [`customer-info.md`](customer-info.md) | CustomerInfo, entitlements.active, listener | curl, verbatim | <https://www.revenuecat.com/docs/customers/customer-info.md> |
| [`identifying-customers.md`](identifying-customers.md) | App User IDs, logIn / logOut (native), changeUser (web), anonymous IDs | curl, verbatim | <https://www.revenuecat.com/docs/customers/identifying-customers.md> |

## Section map (deep-link targets)

### `README.md`

  - Purchases
  - Migration Guides
  - RevenueCat SDK Features
  - Getting Started
  - Codelab
  - Requirements
  - SDK Reference
  - Contributing

### `installation-android.md`

  - Prerequisites
  - 1. Install the SDK
  - 2. Import the SDK
  - 3. Set your Activity's launchMode
  - Other stores
  - Troubleshooting
    - Proguard
    - AndroidX App Startup
  - Next steps

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
