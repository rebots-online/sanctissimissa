<!--
SNAPSHOT  DOCS/sdk/revenuecat-purchases-js/installation-web-sdk.md
source:   https://www.revenuecat.com/docs/getting-started/installation/web-sdk.md
fetched:  2026-11-06 (curl, verbatim)
version:  @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/revenuecat-purchases-js/INDEX.md instead.
-->

---
id: "getting-started/installation/web-sdk"
title: "Web"
description: "RevenueCat provides backend, mobile and web SDKs to to make implementing in-app and web purchases and subscriptions easy. With our SDKs, you can build and manage your app business on any platform without having to maintain your own backend infrastructure. You can read more about how RevenueCat fits into your app or you can sign up for free to start building."
permalink: "/docs/getting-started/installation/web-sdk"
slug: "web-sdk"
version: "current"
original_source: "docs/getting-started/installation/web-sdk.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

RevenueCat provides backend, mobile and web SDKs to to make implementing in-app and web purchases and subscriptions easy. With our SDKs, you can build and manage your app business on any platform without having to maintain your own backend infrastructure. You can read more about [how RevenueCat fits into your app](https://www.revenuecat.com/blog/growth/where-does-revenuecat-fit-in-your-app) or you can [sign up for free](https://app.revenuecat.com/signup) to start building.

The RevenueCat Web SDK supports multiple billing providers; for full compatibility, see the [RevenueCat Web SDK](../../web/web-billing/web-sdk) page.

The SDK allows you to easily implement subscriptions in your web app, or build a web subscription page for your mobile app. You may use an existing supported billing provider, or let RevenueCat's [RevenueCat Billing](https://www.revenuecat.com/docs/web/overview#revenuecat-billing) engine handle the recurring billing logic, manage what entitlements customers have access to, and automatically recover payments in the case of billing issues. RevenueCat Billing uses Stripe as a trusted payment gateway.

## Installation

[![Release](https://img.shields.io/github/v/release/RevenueCat/purchases-js?filter=!*beta*)](https://github.com/RevenueCat/purchases-js/releases)

To install the RevenueCat Web SDK, add the `@revenuecat/purchases-js` package to your project using the package manager of your choice:

**npm**

```shell
npm install --save @revenuecat/purchases-js
```

**yarn**

```shell
yarn add @revenuecat/purchases-js
```

## Next steps

Now that you've installed the RevenueCat Web SDK, follow the instructions to [configure it](../../web/web-billing/web-sdk).
