<!--
SNAPSHOT  DOCS/sdk/play-billing/play-balance-gift-cards.md
source:   https://support.google.com/googleplay/answer/3422659 ; /answer/2651410 ; /android-developer/answer/10281818
fetched:  2026-11-06 (WebFetch summary — NOT verbatim)
version:  Play Billing Library 9.1.0 (2026-06-18; latest on dl.google.com Maven on 2026-11-06)
license:  Google Help Center (all rights reserved; summarized)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/play-billing/INDEX.md instead.
-->

# Google Play balance and gift cards — WebFetch summaries (NOT verbatim)

Google Help Center articles are not openly licensed; WebFetch declined verbatim reproduction. The
following are faithful summaries produced on 2026-11-06. Treat them as pointers, re-read the source
URL before relying on exact wording.

## 1. Redeem a Google Play gift card or gift code
Source: https://support.google.com/googleplay/answer/3422659

**On a computer:** go to `play.google.com/redeem` → enter the code (typically 16 characters of numbers
and letters; some digital codes are shorter or longer) → Redeem → check which account receives the
balance → Confirm.

**During a Google Play purchase:** proceed through checkout to the payment methods → open the
dropdown next to the payment method → choose **Redeem code** → enter the code and follow the prompts.

The article links onward to Offers, Play Books gifts, and redeeming codes for subscriptions.

## 2. Accepted payment methods on Google Play (Canada locale served)
Source: https://support.google.com/googleplay/answer/2651410

- **Credit/debit cards:** American Express, Mastercard, Visa (temporary authorizations may appear).
- **Carrier billing:** Telus on eligible devices/plans; Play Store app only; not on rooted devices.
- **Google Play balance and gift cards:** usable to "Buy apps and digital content on Google Play" and
  to "Pay for subscriptions on Google Play".
- **PayPal:** apps and digital content.
- **Funding Play balance:** Google Play gift cards, some promotional codes, or cash top-up at
  convenience stores.
- **Not accepted:** wire transfer, Western Union, MoneyGram, virtual credit cards, HSAs, transit
  cards, escrow-type payment.

## 3. Understanding Google Play's Payments policy (developer policy)
Source: https://support.google.com/googleplay/android-developer/answer/10281818

- Digital goods/services sold in-app (features, virtual currency, subscriptions) must use Google
  Play's billing system unless a regional alternative-billing program applies (India, South Korea,
  EEA, US); service fee is 4% lower for alternative billing.
- Physical goods/services and bill payments are out of scope.
- "Play's billing system is not required for the sale of in-app gift cards" (eGift or physical).
- The policy article does not mention Google Play balance.

## Developer implication (curator note, not upstream text)
Play balance / gift-card value is a **user-side payment method inside the Play purchase sheet**:
an app that sells a one-time product through Play Billing (and therefore through RevenueCat's
`purchases-android`) accepts Play balance automatically — no app-side code path exists or is needed.
