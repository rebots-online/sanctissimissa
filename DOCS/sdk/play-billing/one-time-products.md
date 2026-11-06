<!--
SNAPSHOT  DOCS/sdk/play-billing/one-time-products.md
source:   https://developer.android.com/google/play/billing/one-time-products
fetched:  2026-11-06 (curl, verbatim (.md.txt))
version:  Play Billing Library 9.1.0 (2026-06-18; latest on dl.google.com Maven on 2026-11-06)
license:  Android Developers content; text licensed CC BY 4.0, code samples Apache 2.0 (per developer.android.com site policy)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/play-billing/INDEX.md instead.
-->

A one-time product (previously referred as in-app product) refers to a
digital item or content that a user can purchase with a single charge to
their payment method. Unlike subscriptions, which involve recurring payments,
a one-time product is a single transaction that grants access to the
purchased content permanently or for a specific, non-renewable use.

One-time products are categorized into two main types:

- Consumable products - These are products that a user consumes to receive
  in-app content and can be bought multiple times. Once used, the product
  is "consumed" and can be purchased again. Examples include
  in-game currency (like coins or gems), extra lives, or boosts.

- Non-consumable products - These products are purchased once and
  provide a permanent benefit. Once bought, they are permanently associated
  with the user's account, and cannot be purchased again.
  Examples include premium upgrades, unlocking additional game levels,
  or ad-free versions of an app.

## What's next

- [One-time product purchase lifecycle](https://developer.android.com/google/play/billing/lifecycle/one-time)
- [Multiple purchase options and offers for one-time products](https://developer.android.com/google/play/billing/one-time-product-multi-purchase-options-offers)