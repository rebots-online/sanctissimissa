# DOCS/sdk/play-billing/ — Google Play Billing Library (one-time products, Play balance / gift cards)

**Pinned version:** Play Billing Library 9.1.0 (2026-06-18; latest on dl.google.com Maven on 2026-11-06)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/play-billing/<file>.md §<heading>`.

## Curator notes

- One-time products: `one-time-products.md` (consumable vs non-consumable), `lifecycle-one-time.md` (purchase → acknowledge/consume within 3 days or auto-refund), `one-time-product-multi-purchase-options-offers.md` (purchase options/offers model, PBL 8+).
- `integrate.md` is the canonical BillingClient walkthrough (connect, queryProductDetailsAsync, launchBillingFlow, processPurchases, acknowledge/consume).
- RevenueCat performs acknowledgement automatically for purchases made through `purchases-android`; consult these docs for store semantics, not to re-implement.
- Gift cards / Play balance are a Play-side payment method — see `play-balance-gift-cards.md` (summaries; Help Center is not verbatim-licensed).

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`integrate.md`](integrate.md) | Integrate the Play Billing Library into your app | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/integrate> |
| [`one-time-products.md`](one-time-products.md) | One-time products: consumable vs non-consumable | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/one-time-products> |
| [`lifecycle-one-time.md`](lifecycle-one-time.md) | One-time purchase lifecycle | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/lifecycle/one-time> |
| [`one-time-product-multi-purchase-options-offers.md`](one-time-product-multi-purchase-options-offers.md) | Purchase options & offers for one-time products | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers> |
| [`getting-ready.md`](getting-ready.md) | Play Console setup, license testers | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/getting-ready> |
| [`release-notes.md`](release-notes.md) | PBL release notes (version pin evidence) | curl, verbatim (.md.txt) | <https://developer.android.com/google/play/billing/release-notes> |
| [`play-balance-gift-cards.md`](play-balance-gift-cards.md) | Gift cards, Play balance, payments policy | WebFetch summary — NOT verbatim | <https://support.google.com/googleplay/answer/3422659 ; /answer/2651410 ; /android-developer/answer/10281818> |

## Section map (deep-link targets)

### `integrate.md`

  - Life of a purchase
  - Initialize a connection to Google Play
    - Add the Google Play Billing Library dependency
    - Groovy
    - Kotlin
    - Groovy
    - Kotlin
    - Initialize a BillingClient
    - Kotlin
    - Java
    - Connect to Google Play
    - Kotlin
    - Java
    - Automatically Re-establish a Connection
      - How to enable automatic reconnection
    - Kotlin
    - Java
  - Show products available to buy
    - Kotlin
    - Java
    - Query with Kotlin extensions
    - Process the result
  - Launch the purchase flow
    - Kotlin
    - Java
    - Kotlin
    - Java
    - Indicate a personalized price
    - Attach user identifiers
  - Detect and process purchases
    - Verify the purchase
    - Grant entitlement to the user
    - Notify the User
    - Notify Google the purchase was processed
      - Consumable products
    - Kotlin
    - Java
      - Non-consumable products
    - Kotlin
    - Java
      - Subscriptions
    - Handle rejected or unfulfilled purchases
    - Recap
  - Handle pending transactions
  - Handle multi-quantity purchases
  - Query user's billing configuration
    - Kotlin
    - Java

### `one-time-products.md`

  - What's next

### `lifecycle-one-time.md`

  - New one-time product purchases
    - Real-time developer notifications
    - Handle completed transactions
    - Handle canceled transactions
  - Process one-time product purchases in your backend

### `one-time-product-multi-purchase-options-offers.md`

  - Prerequisites
  - Query the product details
  - Launch the billing flow
      - Java
  - Purchase options and offers
    - Buy purchase option
    - Rent purchase option
      - Integrate rent purchase option with PBL
      - Launch a purchase flow for the rent option
    - Pre-order offer
      - Integrate pre-order offer with PBL
      - Launch a purchase flow for a pre-order offer
    - Discount offer
      - Retrieve discounted offer price information
      - Java
      - Java
  - Get the valid time window of an offer
      - Java
  - Limited quantity at the discount offer level
      - Java
    - Calculate redemption limit
  - Country and region eligibility
  - Offer tags
      - Java
    - Inheritance of offer tags

### `getting-ready.md`

  - Set up a Google Play developer account
  - Enable billing-related features in the Google Play Console
    - Add library dependency
    - Groovy
    - Kotlin
    - Groovy
    - Kotlin
    - Upload your app
  - Create and configure your products
  - Configure the Google Play Developer API
  - Configure Real-time developer notifications
    - Determine pricing and quotas
      - Estimate data usage
    - Setup Cloud Pub/Sub
    - Create a topic
    - Create a Pub/Sub subscription
    - Grant publish rights on your topic
    - Enable Real-time developer notifications for your app
    - Verifying your configuration
  - Next steps

### `release-notes.md`

  - Android skills
    - Upgrade Play Billing Library
  - Google Play Billing Library 9.1.0 Release (2026-06-18)
    - Summary of changes
  - Google Play Billing Library 9.0.0 Release (2026-05-19)
    - Summary of changes
  - Google Play Billing Library 8.3.0 Release (2025-12-23)
    - Summary of changes
  - Google Play Billing Library 8.2.1 Release (2025-12-15)
    - Bug fixes
  - Google Play Billing Library 8.2.0 Release (2025-12-09)
    - Summary of changes
  - Google Play Billing Library 8.1.0 Release (2025-11-06)
    - Summary of changes
  - Google Play Billing Library 8.0.0 Release (2025-06-30)
    - Summary of changes
  - Google Play Billing Library 7.1.1 Release (2024-10-03)
    - Bug fixes
  - Google Play Billing Library 7.1.0 Release (2024-09-19)
    - Summary of changes
  - Google Play Billing Library 7.0.0 Release (2024-05-14)
    - Summary of changes
  - Google Play Billing Library 6.2.1 Release (2024-04-16)
    - Summary of changes
  - Google Play Billing Library 6.2.0 Release (2024-03-06)
    - Summary of changes
  - Google Play Billing Library 6.1.0 Release (2023-11-14)
    - Summary of changes
  - Google Play Billing Library 6.0.1 Release (2023-06-22)
    - Summary of changes
  - Google Play Billing Library 6.0 Release (2023-05-10)
    - Summary of changes
  - Google Play Billing Library 5.2.1 Release (2023-06-22)
    - Summary of changes
  - Google Play Billing Library 5.2 Release (2023-04-06)
    - Summary of changes
  - Google Play Billing Library 5.1 Release (2022-10-31)
    - Summary of changes
  - Google Play Billing Library 5.0 Release (2022-05-11)
    - Summary of changes
  - Google Play Billing Library 4.1 release (2022-02-23)
    - Summary of changes
  - Google Play Billing Library 4.0 Release (2021-05-18)
    - Summary of changes
  - Google Play Billing Library 3.0.3 Release (2021-03-12)
    - Java and Kotlin Bug fixes
    - Unity Bug fixes
  - Google Play Billing Library 3.0.2 Release (2020-11-24)
    - Bug fixes
  - Google Play Billing Library 3.0.1 Release (2020-09-30)
    - Bug fixes
  - Google Play Billing Library 3.0 Release (2020-06-08)
    - Summary of changes
    - Bug fixes
  - Google Play Billing Library 2.2.1 Release (2020-05-20)
    - Bug fixes
  - Google Play Billing Library 2.2.0 release and Unity support (2020-03-23)
    - Google Play Billing Billing Library 2 for Unity
    - Summary of changes
  - Google Play Billing Library 2.1.0 Release and Kotlin Extension 2.1.0 Release (2019-12-10)
    - Summary of changes
  - Google Play Billing Library 2.0.3 Release (2019-08-05)
    - Bug fixes
  - Google Play Billing Library 2.0.2 Release (2019-07-08)
  - Google Play Billing Library 2.0.1 Release (2019-06-06)
    - Bug fixes
  - Google Play Billing Library 2.0 Release (2019-05-07)
    - Purchases must be acknowledged within three days
    - BillingFlowParams.setSku() has been removed
    - Developer payload is supported
    - Consistent offers
    - Pending transactions
    - API changes
      - consumeAsync
      - queryPurchaseHistoryAsync
      - BillingResult return values
    - Bug fixes
  - Google Play Billing Library 1.2.2 Release (2019-03-07)
    - Bug fixes
    - Other changes
- … (44 more headings)

### `play-balance-gift-cards.md`

- Google Play balance and gift cards — WebFetch summaries (NOT verbatim)
  - 1. Redeem a Google Play gift card or gift code
  - 2. Accepted payment methods on Google Play (Canada locale served)
  - 3. Understanding Google Play's Payments policy (developer policy)
  - Developer implication (curator note, not upstream text)
