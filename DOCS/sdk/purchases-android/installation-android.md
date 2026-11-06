<!--
SNAPSHOT  DOCS/sdk/purchases-android/installation-android.md
source:   https://www.revenuecat.com/docs/getting-started/installation/android.md
fetched:  2026-11-06 (curl, verbatim)
version:  purchases-android 11.2.0 (Maven Central `release` on 2026-11-06)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/purchases-android/INDEX.md instead.
-->

---
id: "getting-started/installation/android"
title: "Android"
description: "This tutorial shows you how to install the RevenueCat SDK in your Android app. By the end, you'll have the SDK added to your project with Gradle, verified with a successful build, and be ready to configure the SDK."
permalink: "/docs/getting-started/installation/android"
slug: "android"
version: "current"
original_source: "docs/getting-started/installation/android.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

This tutorial shows you how to install the RevenueCat SDK in your Android app. By the end, you'll have the SDK added to your project with Gradle, verified with a successful build, and be ready to [configure the SDK](https://www.revenuecat.com/docs/getting-started/configuring-sdk).

## Prerequisites

You need the following before you start:

- A [RevenueCat account](https://app.revenuecat.com/).
- A [project](https://www.revenuecat.com/docs/projects/overview) in your RevenueCat account.
- Your app open in Android Studio.
- Kotlin 2.1.0 or newer, a `compileSdk` of 35 or higher, and a `minSdk` of 23 or higher.

## 1. Install the SDK

[![Release](https://img.shields.io/github/v/release/RevenueCat/purchases-android)](https://github.com/RevenueCat/purchases-android/releases)

The SDK is available on Maven Central and installed with Gradle. The `purchases` dependency supports Google Play by default. The Amazon Appstore and Galaxy Store each need an extra module (see [Other stores](#other-stores)).

1. Add the dependencies to your module's `build.gradle.kts` (or `build.gradle`):

**Kotlin**

```kotlin
implementation("com.revenuecat.purchases:purchases:10.15.1")
implementation("com.revenuecat.purchases:purchases-ui:10.15.1")
```

**Groovy**

```groovy
implementation 'com.revenuecat.purchases:purchases:10.15.1'
implementation 'com.revenuecat.purchases:purchases-ui:10.15.1'
```

If your project uses a version catalog (the default for new Android Studio projects), declare the dependencies in `gradle/libs.versions.toml` and reference them from your module's `build.gradle.kts` instead:

**libs.versions.toml**

```text
[versions]
revenuecat = "10.15.1"

[libraries]
revenuecat-purchases = { group = "com.revenuecat.purchases", name = "purchases", version.ref = "revenuecat" }
revenuecat-purchases-ui = { group = "com.revenuecat.purchases", name = "purchases-ui", version.ref = "revenuecat" }
```

**build.gradle.kts**

```kotlin
dependencies {
    implementation(libs.revenuecat.purchases)
    implementation(libs.revenuecat.purchases.ui)
}
```

2. In Android Studio, select **File > Sync Project with Gradle Files**.

## 2. Import the SDK

1. Add the imports you need to any source file that uses the SDK. These are the most common types:

**Kotlin**

```kotlin
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.Offering
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.models.Period
import com.revenuecat.purchases.models.Price
import com.revenuecat.purchases.models.StoreProduct
```

**Java**

```java
import com.revenuecat.purchases.CustomerInfo;
import com.revenuecat.purchases.Offering;
import com.revenuecat.purchases.Purchases;
import com.revenuecat.purchases.models.Period;
import com.revenuecat.purchases.models.Price;
import com.revenuecat.purchases.models.StoreProduct;
```

2. Build your project (**Build > Make Project**). If the build succeeds with the imports in place, the SDK is installed correctly.

## 3. Set your Activity's launchMode

Depending on your user's payment method, Google Play may ask them to verify the purchase in another app, such as their banking app. This means they have to background your app during the purchase. If the `launchMode` of the Activity that triggers purchases is set to anything other than `standard` or `singleTop`, backgrounding your app can cancel the purchase.

1. In your `AndroidManifest.xml`, set the `launchMode` of the Activity that triggers purchases to `standard` or `singleTop`:

**AndroidManifest.xml**

```xml
<activity 
    android:name="com.your.Activity"
    android:launchMode="standard" />  <!-- or singleTop -->
```

For details on the options, see Android's [launchMode documentation](https://developer.android.com/guide/topics/manifest/activity-element#lmode).

## Other stores

The steps above cover Google Play. Building for the Amazon Appstore or the Galaxy Store requires an additional module and configuration.

Amazon Appstore

1. Add the `purchases-store-amazon` module alongside the regular `purchases` dependency. It contains the classes needed to use Amazon In-App Purchasing:

**Kotlin**

```kotlin
implementation("com.revenuecat.purchases:purchases:10.15.1")
implementation("com.revenuecat.purchases:purchases-store-amazon:10.15.1")
```

**Groovy**

```groovy
implementation 'com.revenuecat.purchases:purchases:10.15.1'
implementation 'com.revenuecat.purchases:purchases-store-amazon:10.15.1'
```

2. Add Amazon's `.pem` public key to your project by following [Amazon's Appstore SDK configuration guide](https://developer.amazon.com/docs/in-app-purchasing/integrate-appstore-sdk.html#configure_key).

RevenueCat only validates purchases made in production or in Live App Testing. It won't validate purchases made with the Amazon App Tester.

Galaxy Store

Galaxy Store support is available in Android SDK versions `10.7.0` and above, and React Native SDK versions `10.3.0` and above. Support for other hybrid SDKs is coming soon.

1. Add the `purchases-store-galaxy` module alongside the regular `purchases` dependency:

**Kotlin**

```kotlin
implementation("com.revenuecat.purchases:purchases:10.15.1")
implementation("com.revenuecat.purchases:purchases-store-galaxy:10.15.1")
```

**Groovy**

```groovy
implementation 'com.revenuecat.purchases:purchases:10.15.1'
implementation 'com.revenuecat.purchases:purchases-store-galaxy:10.15.1'
```

2. When you configure the RevenueCat SDK, configure it to use the Galaxy Store with a `GalaxyConfiguration` object:

**Kotlin**

```kotlin
Purchases.configure(
    // This will configure the Galaxy Store to make production purchases.
    GalaxyConfiguration.Builder(applicationContext, "galx_XXXX") // Add your RevenueCat API key here
        .build()
)
```

Once your project is set up, you can use the RevenueCat SDK with the Galaxy Store the same way you would for Google Play, including fetching offerings, displaying paywalls, and making purchases.

**Making test purchases:** Galaxy Store test purchases require a physical Galaxy device signed in with a Samsung account. The Galaxy Store does not support test purchases in emulators.

To make a test purchase, pass in either `GalaxyBillingMode.TEST` or `GalaxyBillingMode.ALWAYS_FAIL` when you call `Purchases.configure()`:

**Kotlin**

```kotlin
Purchases.configure(
    GalaxyConfiguration.Builder(
        applicationContext,
        "galx_XXXX", // Add your RevenueCat API key here
        GalaxyBillingMode.TEST
    )
    .build()
)
```

Use `GalaxyBillingMode.TEST` to make test purchases without creating financial transactions, and `GalaxyBillingMode.ALWAYS_FAIL` to test failure scenarios. For more information on the Galaxy Store's billing modes, see [Samsung's IAP documentation](https://developer.samsung.com/iap/programming-guide/iap-helper-programming.html#Set-the-IAP-operation-mode).

:::warning
Only use `GalaxyBillingMode.PRODUCTION` when submitting your app for beta or production distribution.
:::

To cancel a test subscription, open the Galaxy Store on your phone, go to your Samsung account, and cancel the subscription. Test subscriptions remain active until their current billing period ends.

## Troubleshooting

### Proguard

The SDK ships with its own Proguard rules, so you don't need to do anything. If you have issues finding classes in our SDK, add `-keep class com.revenuecat.purchases.** { *; }` to your Proguard configuration.

### AndroidX App Startup

The SDK uses AndroidX App Startup under the hood, so make sure you have not removed the `androidx.startup.InitializationProvider` completely from your manifest. If you need to remove specific initializers, such as `androidx.work.WorkManagerInitializer`, set `tools:node="merge"` on the provider and `tools:node="remove"` on the meta-data of the initializer you want to remove:

**AndroidManifest.xml**

```xml
 <provider
    android:name="androidx.startup.InitializationProvider"
    android:authorities="${applicationId}.androidx-startup"
    android:exported="false"
    tools:node="merge">
    <meta-data
        android:name="androidx.work.WorkManagerInitializer"
        android:value="androidx.startup"
        tools:node="remove" />
 </provider>
```

## Next steps

You've installed the RevenueCat SDK and verified your project builds.

- [Configure the SDK](https://www.revenuecat.com/docs/getting-started/configuring-sdk) with your project's API key — the next step in the [Quickstart](https://www.revenuecat.com/docs/getting-started/quickstart).
- Testing without a Google Play setup? Purchases work out of the box with the [Test Store](https://www.revenuecat.com/docs/test-and-launch/sandbox/test-store).
