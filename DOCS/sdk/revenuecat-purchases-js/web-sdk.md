<!--
SNAPSHOT  DOCS/sdk/revenuecat-purchases-js/web-sdk.md
source:   https://www.revenuecat.com/docs/web/web-billing/web-sdk.md
fetched:  2026-11-06 (curl, verbatim)
version:  @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/revenuecat-purchases-js/INDEX.md instead.
-->

---
id: "web/web-billing/web-sdk"
title: "Web SDK"
description: "RevenueCat's Web SDK is an integration path for selling subscriptions and other purchases in your web app. It works with RevenueCat Billing, Stripe Billing, and Paddle Billing; your billing engine determines where products, taxes, emails, and subscription management are configured."
permalink: "/docs/web/web-billing/web-sdk"
slug: "web-sdk"
version: "current"
original_source: "docs/web/web-billing/web-sdk.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

RevenueCat's Web SDK is an integration path for selling subscriptions and other purchases in your web app. It works with RevenueCat Billing, Stripe Billing, and Paddle Billing; your billing engine determines where products, taxes, emails, and subscription management are configured.

:::warning[Web SDK billing engine support]

- RevenueCat Billing: supported ✅ (requires Stripe account for payment gateway connection)
- Paddle Billing: supported ✅ (requires Paddle account)
- Stripe Billing: supported ✅ (requires Stripe account)

:::

## Installation

Start by installing the `@revenuecat/purchases-js` package using the package manager of your choice:

**npm**

```shell
npm install --save @revenuecat/purchases-js
```

**yarn**

```shell
yarn add @revenuecat/purchases-js
```

:::info
When testing RevenueCat Billing with [unpkg](https://www.unpkg.com/), add `Purchases` before all method names to access them.
For example, use `Purchases.Purchases.configure()` instead of `Purchases.configure()`.
:::

## General setup

### Connect with billing provider

To get started, you first need to connect a supported billing provider.

### Create a web config for your provider

#### For RevenueCat Billing

1. Go to **Web** in the lower section of the project dashboard and create a RevenueCat Billing config. Use an existing Stripe account, or create a claimable sandbox. See [Stripe account](https://www.revenuecat.com/docs/web/web-billing/configuring-overview#stripe-account).
2. Finish [configuring RevenueCat Billing](https://www.revenuecat.com/docs/web/web-billing/configuring-overview), including setup of products, offerings and entitlements.
3. Follow the SDK integration steps below.

#### For Paddle Billing

[Follow the steps on this page](https://www.revenuecat.com/docs/web/integrations/paddle) to connect and configure Paddle Billing, which also includes Web SDK integration steps.

#### For Stripe Billing

1. [Follow the steps on this page](https://www.revenuecat.com/docs/web/integrations/stripe) to connect and configure Stripe Billing.
2. Follow the SDK integration steps below.

## SDK configuration

Configure the RevenueCat Web SDK by calling the static `configure()` method of the `Purchases` class:

**Web (JS/TS)**

```tsx
    const appUserId = authentication.getAppUserId(); // Replace with your own authentication system
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });
```

:::warning[Only configure once]
You should configure the SDK only once in your code.
:::

You can use the object returned from the `configure()` method to call any of the SDK methods, or use the static method `getSharedInstance()` of the `Purchases` class to return the initialized `Purchases` object.

The method will throw an exception if the SDK has not yet been configured.

You can use both anonymous and identified app user ids when configuring the SDK, check out the next section to understand the differences.

## Identifying Customers

The RevenueCat Web SDK supports both [identified](https://www.revenuecat.com/docs/customers/user-ids) and [anonymous](https://www.revenuecat.com/docs/customers/identifying-customers#anonymous-app-user-ids) customers, offering flexibility in how you manage user accounts and subscriptions.
Both anonymous and identified customers are supported by the SDK and by the [Web Purchase Links](https://www.revenuecat.com/docs/web/web-billing/web-purchase-links).
Here’s how these options work:

### Identified Customers

For identified customers, you provide a unique App User ID linked to the customer’s account. This is ideal for apps with authentication mechanisms or shared subscription access between platforms (e.g., web and mobile). To implement this approach:

- Use a third-party authentication provider like [Firebase](https://firebase.google.com/docs/auth) / [Supabase](https://supabase.com/docs/guides/auth) or a library like [auth.js](https://authjs.dev/).
- By sharing authentication across your web app and mobile apps, customers can seamlessly access subscriptions they purchased on any platform without additional configuration—just map products to the correct entitlements.

Here’s how you can configure `purchases-js` to use identified customers:

**Web (JS/TS)**

```tsx
    const appUserId = authentication.getAppUserId(); // Replace with your own authentication system
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });
```

### Anonymous Customers

With [Redemption Links](https://www.revenuecat.com/docs/web/redemption-links), anonymous customers can now purchase subscriptions on the web without being logged into an account. These customers can later redeem their purchases on mobile apps or other platforms.
Redemption Links enable you to:

- Share subscription access without requiring user authentication.
- Ensure purchases remain accessible, even for anonymous users.

Here’s how you can configure `purchases-js` to use anonymous customers:

**Web (JS/TS)**

```tsx
    // This function will generate a unique anonymous ID for the user.
    // Make sure to enable the Redemption Links feature in the RevenueCat dashboard and use the
    // redemption link to redeem the purchase in your mobile app.
    const appUserId = Purchases.generateRevenueCatAnonymousAppUserId();
    const purchases = Purchases.configure({
        apiKey: WEB_BILLING_PUBLIC_API_KEY,
        appUserId: appUserId,
    });
```

:::info[Web SDK redemption behavior]
Anonymous purchases made with the Web SDK still support [Redemption Links](https://www.revenuecat.com/docs/web/redemption-links), but RevenueCat does not automatically present a hosted redemption page after the purchase completes. Instead, inspect [`PurchaseResult.redemptionInfo`](https://revenuecat.github.io/purchases-js-docs/1.13.2/interfaces/PurchaseResult.html#redemptioninfo) from the returned purchase result and decide how to present the redemption step in your own UI.
:::

Find out more about Redemption Links and how to set them up [here](https://www.revenuecat.com/docs/web/redemption-links) .

## Getting customer information

You can access the customer information using the `getCustomerInfo()` method of the `Purchases` object:

**Web (JS/TS)**

```tsx
    try {
        customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
        // access latest customerInfo
    } catch (e) {
        // Handle errors fetching customer info
    }
```

You can then use the `entitlements` property of the `CustomerInfo` object to check whether the customer has access to a specific entitlement:

**Web (JS/TS)**

```tsx
    if ("gold_entitlement" in customerInfo.entitlements.active) {
        // Grant user access to the entitlement "gold_entitlement"
        grantEntitlementAccess();
    }
```

If your app has multiple entitlements, you might also want to check if the customer has any active entitlements:

**Web (JS/TS)**

```tsx
    if (Object.keys(customerInfo.entitlements.active).length > 0) {
        // User has access to some entitlement, grant entitlement access
        grantEntitlementAccess();
    }
```

## Building your paywall

### Getting and displaying products

We recommend using [Offerings](https://www.revenuecat.com/docs/offerings/overview) to configure which products get presented to the customer. You can access the offerings for a given app user ID with the (asynchronous) method `purchases.getOfferings()`. The current offering for the customer is contained in the `current` property of the return value.

**Web (JS/TS)**

```tsx
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings();
        if (
            offerings.current !== null &&
            offerings.current.availablePackages.length !== 0
        ) {
            // Display packages for sale
            displayPackages(offerings.current.availablePackages);
        }
    } catch (e) {
        // Handle errors
    }
```

If you want to [support multiple currencies](https://www.revenuecat.com/docs/web/web-billing/multi-currency-support) and manually specify the currency, you can pass the currency code to the `getOfferings()` method. If you do not specify the currency, RevenueCat will attempt to geolocate the customer and use the currency of the customer's country if it's available, or fall back to the default currency of the app.

**Web (JS/TS)**

```tsx
    try {
        // Specify the currency to get offerings for
        const offerings = await Purchases.getSharedInstance().getOfferings({
            currency: "EUR",
        });
        if (
            offerings.current !== null &&
            offerings.current.availablePackages.length !== 0
        ) {
            // Display packages for sale
            displayPackages(offerings.current.availablePackages);
        }
    } catch (e) {
        // Handle errors
    }
```

It's also possible to access other Offerings besides the Current Offering directly by its identifier.

**Web (JS/TS)**

```tsx
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings();
        if (offerings.all["experiment_group"].availablePackages.length !== 0) {
            // Display packages for sale
            displayPackages(offerings.all["experiment_group"].availablePackages);
        }
    } catch (e) {
        // Handle errors
    }
```

Each Offering contains a list of Packages. Packages can be accessed in a few different ways:

1. via the `.availablePackages` property on an Offering.
2. via the duration convenience property on an Offering
3. via the `.packagesById` property of an Offering, keyed by the package identifier

**Web (JS/TS)**

```tsx
    const allPackages = offerings.all["experiment_group"].availablePackages;
    // --
    const monthlyPackage = offerings.all["experiment_group"].monthly;
    // --
    const customPackage =
        offerings.all["experiment_group"].packagesById["<package_id>"];
```

Each Package contains information about the product in the `product` property:

**Web (JS/TS)**

```tsx
    // Accessing / displaying the monthly product
    try {
        const offerings = await Purchases.getSharedInstance().getOfferings({
            currency: "USD",
        });
        if (offerings.current && offerings.current.monthly) {
            const product = offerings.current.monthly.product;
            // Display the price and currency of the Web Billing Product
            displayProduct(product);
        }
    } catch (e) {
        // Handle errors
    }
```

### Purchasing a package

To purchase a package, use the `purchase()` method of the `Purchases` object. It returns a [`Promise<PurchaseResult>`](https://revenuecat.github.io/purchases-js-docs/1.13.2/interfaces/PurchaseResult.html). The result includes `customerInfo`, and when you're using anonymous purchases with [Redemption Links](https://www.revenuecat.com/docs/web/redemption-links), you should also inspect `redemptionInfo` to decide how to present the redemption step after checkout. To handle errors, catch any exceptions that occur.

**Web (JS/TS)**

```tsx
    try {
        const purchaseResult = await Purchases.getSharedInstance().purchase({
            rcPackage: pkg,
        });
        const {customerInfo, redemptionInfo} = purchaseResult;
        if (Object.keys(customerInfo.entitlements.active).includes("pro")) {
            // Unlock that great "pro" content
        }
        if (redemptionInfo) {
            // Present the redemption step in your own UI for anonymous web-to-app purchases.
        }
    } catch (e) {
        if (
            e instanceof PurchasesError &&
            e.errorCode == ErrorCode.UserCancelledError
        ) {
            // User cancelled the purchase process, don't do anything
        } else {
            // Handle errors
        }
    }
```

When building an anonymous web-to-app flow with the Web SDK, use `purchaseResult.redemptionInfo` rather than expecting RevenueCat to show a hosted redemption page for you.

### Presenting a RevenueCat Paywall with purchases-js

To render a paywall that RevenueCat manages for you, call `presentPaywall()`. This method displays the configured paywall, guides the customer through checkout, and resolves once the flow is complete. Provide the HTML element where the paywall should be injected. Optionally, pass an offering object retrieved from `purchases.getOfferings()` to select a specific paywall; otherwise the customer's current offering will be used.

```ts title="Presenting a paywall"
async function showPaywall() {
  const paywallContainer = document.getElementById("paywall-container");

  try {
    const purchaseResult = await purchases.presentPaywall({
      htmlTarget: paywallContainer,
      // no offering specified, the current offering will be used.
    });

    console.log("Paywall completed", purchaseResult);
    console.log("Redemption info", purchaseResult.redemptionInfo);
  } catch (error) {
    console.error("Error presenting paywall", error);
  }
}
```

You can also specify the offering to use by passing it to `presentPaywall()`.

```ts title="Presenting a paywall"
async function showPaywall() {
  const paywallContainer = document.getElementById("paywall-container");
  const offerings = await purchases.getOfferings();
  const offeringToUse = offerings.all["offering-id-to-use"];
  try {
    const purchaseResult = await purchases.presentPaywall({
      htmlTarget: paywallContainer,
      offering: offeringToUse,
    });

    console.log("Paywall completed", purchaseResult);
    console.log("Redemption info", purchaseResult.redemptionInfo);
  } catch (error) {
    console.error("Error presenting paywall", error);
  }
}
```

Like `purchase()`, `presentPaywall()` resolves with a [`PurchaseResult`](https://revenuecat.github.io/purchases-js-docs/1.13.2/interfaces/PurchaseResult.html). If the customer purchased anonymously with [Redemption Links](https://www.revenuecat.com/docs/web/redemption-links), use `purchaseResult.redemptionInfo` to render your own redemption CTA or handoff.

### Customizing the purchase flow

The `purchase()` method accepts a `PurchaseParams` object to set custom purchase options, including the following:

- Send the customer's billing email address, skipping the email collection step (`customerEmail`)
- Setting the selected and default locales (`defaultLocale`, `selectedLocale`) — see [Localization](https://www.revenuecat.com/docs/web/web-billing/localization)
- Setting the HTML target element for the purchase flow to be rendered in (`htmlTarget`)
- Passing purchase metadata to be sent to the backend (`metadata`) — see [Custom Metadata](https://www.revenuecat.com/docs/web/custom-metadata)

## Testing

See [Testing Web Purchases](https://www.revenuecat.com/docs/web/web-billing/testing)
