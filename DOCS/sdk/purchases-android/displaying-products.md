<!--
SNAPSHOT  DOCS/sdk/purchases-android/displaying-products.md
source:   https://www.revenuecat.com/docs/getting-started/displaying-products.md
fetched:  2026-11-06 (curl, verbatim)
version:  purchases-android 11.2.0 (Maven Central `release` on 2026-11-06)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/purchases-android/INDEX.md instead.
-->

---
id: "getting-started/displaying-products"
title: "Displaying Products"
description: "If you've configured Offerings in RevenueCat, you can control which products are shown to users without requiring an app update. Building paywalls that are dynamic and can react to different product configurations gives you maximum flexibility to make remote updates."
permalink: "/docs/getting-started/displaying-products"
slug: "displaying-products"
version: "current"
original_source: "docs/getting-started/displaying-products.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

If you've [configured Offerings](https://www.revenuecat.com/docs/offerings/overview) in RevenueCat, you can control which products are shown to users without requiring an app update. Building paywalls that are dynamic and can react to different product configurations gives you maximum flexibility to make remote updates.

:::info
Before products and offerings can be fetched from RevenueCat, be sure to initialize the Purchases SDK by following our [Quickstart](https://www.revenuecat.com/docs/getting-started/quickstart) guide.
:::

## Fetching Offerings

Offerings are fetched through the SDK based on their [configuration](https://www.revenuecat.com/docs/offerings/overview) in the RevenueCat dashboard.

The `getOfferings` method will fetch the Offerings from RevenueCat. These are pre-fetched in most cases on app launch, so the completion block to get offerings won't need to make a network request in most cases.

**Swift**

```swift
        Purchases.shared.getOfferings { (offerings, error) in
            if let packages = offerings?.current?.availablePackages {
                self.display(packages)
            }
        }
```

**Objective-C**

```objectivec
[[RCPurchases sharedPurchases] getOfferingsWithCompletion:^(RCOfferings *offerings, NSError *error) {
  if (offerings.current && offerings.current.availablePackages.count != 0) {
    // Display packages for sale
  } else if (error) {
    // optional error handling
  }
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.getOfferingsWith({ error ->
  // An error occurred
}) { offerings ->
  offerings.current?.availablePackages?.takeUnless { it.isNullOrEmpty() }?.let {
    // Display packages for sale
  }
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.getOfferings(
    onError = { error ->
        // An error occurred
    },
    onSuccess = { offerings ->
        offerings.current?.availablePackages?.takeUnless { it.isEmpty() }?.let {
            // Display packages for sale
        }
    }
)
```

**Java**

```java
Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
  @Override
  public void onReceived(@NonNull Offerings offerings) {
    if (offerings.getCurrent() != null) {
      List<Package> availablePackages = offerings.getCurrent().getAvailablePackages();
      // Display packages for sale
    }
  }
  
  @Override
  public void onError(@NonNull PurchasesError error) {
    // An error occurred
  }
});
```

**Flutter**

```dart
try {
  Offerings offerings = await Purchases.getOfferings();
  if (offerings.current != null && offerings.current.availablePackages.isNotEmpty) {
    // Display packages for sale
  }
} on PlatformException catch (e) {
	// optional error handling
}
```

**React Native**

```jsx
try {
  const offerings = await Purchases.getOfferings();
  if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
    // Display packages for sale
  }
} catch (e) {
 
}
```

**Cordova**

```jsx
func displayUpsellScreen() {
  Purchases.getOfferings(
      offerings => {
        if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {  
			    // Display packages for sale
        }
      },
      error => {

      }
  );
}
```

**Capacitor**

```jsx
const displayUpsellScreen = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {  
      // Display packages for sale
    }
  } catch (error) {
    // Handle error
  }
}
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.GetOfferings((offerings, error) =>
{
  if (offerings.Current != null && offerings.Current.AvailablePackages.Count != 0){
    // Display packages for sale
  }
});
```

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

**Vega**

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

:::warning[Avoid pre-warming offerings cache in your Android's Application]
Don't call `getOfferings` in your Android app's `Application.onCreate`.

This might trigger additional network requests in some situations (like push notifications) without need, using your customer's data. The offerings cache should be pre-fetched automatically by the SDK.
:::

:::info[Offerings, products or available packages empty]
If your offerings, products, or available packages are empty, it's due to some configuration issue in App Store Connect or the Play Console.

You can find more information about troubleshooting this issue in our [Troubleshooting Guide](https://www.revenuecat.com/docs/offerings/troubleshooting-offerings).
:::

You must choose one Offering that is the "Default Offering" - which can easily be accessed via the `current` property of the returned offerings for a given customer.

:::info[What's the difference between a current Offering and a default Offering?]
The current Offering for a given customer may change based on the experiment they're enrolled in, any targeting rules they match, or the default Offering of your Project. Your Project's default Offering is the Offering that will be served as "current" when no other conditions apply for that customer.
:::

To change the default Offering of your Project, navigate to the Offerings tab for that Project in the RevenueCat dashboard, and find the Offering you'd like to make default. Then, click on the icon in the Actions column of that Offering to reveal the available options, and click **Make Default** to make the change.

![Make default offering](https://www.revenuecat.com/docs_images/offerings/make-default.png)

If you'd like to customize the Offering that's served based on an audience, or their location in your app, check out [Targeting](https://www.revenuecat.com/docs/tools/targeting).

Offerings can be updated at any time, and the changes will go into effect for all users right away.

### Fetching Offerings by Placement

Alternatively, if your app has multiple paywall locations and you want to control each location uniquely, you can do that with Placements and the `getCurrentOffering(forPlacement: "string")` method.

**Swift**

```swift
Purchases.shared.getOfferings { offerings, error in
    if let offering = offerings?.currentOffering(forPlacement: "your-placement-identifier") {
        // TODO: Show paywall
    } else {
        // TODO: Do nothing or continue on to next view
    }
}
```

**Kotlin**

```kotlin
Purchases.sharedInstance.getOfferingsWith({ error ->
    // An error occurred
}) { offerings ->
    offerings.getCurrentOfferingForPlacement("your-placement-identifier")?.let {
        // TODO: Show paywall
    } ?: run {
        // TODO: Do nothing or continue on to next view
    }
}
```

**Java**

```java
Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
    @Override
    public void onReceived(@NonNull Offerings offerings) {
        Offering offering = offerings.getCurrentOfferingForPlacement("your-placement-identifier");
        if (offering != null) {
            // TODO: Show paywall
        } else {
            // TODO: Do nothing or continue on to next view
        }
    }

    @Override
    public void onError(@NonNull PurchasesError error) {
        // An error occurred
    }
});
```

**Flutter**

```dart
Offering offering = await Purchases.getCurrentOfferingForPlacement(placementIdentifier: "your-placement-identifier");
  if (offering != null) {
    // TODO: Show paywall
  } else {
    // TODO: Do nothing or continue on to next view
  }
```

**React Native**

```jsx
const offering = await Purchases.getCurrentOfferingForPlacement(inputValue);
if (offering) {
    // TODO: Show paywall
} else {
    // TODO: Do nothing or continue on to next view
}
```

**Web**

```tsx
const offering = await Purchases.getSharedInstance().getCurrentOfferingForPlacement("your-placement-identifier");
if (offering !== null) {
  // TODO: Show paywall
} else {
  // TODO: Do nothing or continue on to next view
}
```

**Capacitor**

```jsx
const offering = await Purchases.getCurrentOfferingForPlacement({placementIdentifier: "your-placement-identifier"});
  if (offering !== null) {
    // TODO: Show paywall
  } else {
    // TODO: Do nothing or continue on to next view
  }
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.GetCurrentOfferingForPlacement("your-placement-identifier", (offering, error) =>
{
  if (offering != null){
    // TODO: Show paywall
  } else {
    // TODO: Do nothing or continue on to next view
  }
}
});
```

To learn more about creating Placements and serving unique Offerings through them, [click here](https://www.revenuecat.com/docs/tools/targeting/placements).

### Custom Offering identifiers

It's also possible to access other Offerings besides the Current Offering directly by its identifier.

**Swift**

```swift
        Purchases.shared.getOfferings { (offerings, error) in
            if let packages = offerings?.offering(identifier: "experiment_group")?.availablePackages {
                self.display(packages)
            }
        }
```

**Objective-C**

```objectivec
[[RCPurchases sharedPurchases] offeringsWithCompletionBlock:^(RCOfferings *offerings, NSError *error) {
	NSArray<RCPackage *> *availablePackages = [offerings offeringWithIdentifier:"experiment_group"].availablePackages;
  if (availablePackages) {
    // Display packages for sale
  }
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.getOfferingsWith({ error ->
  // An error occurred
}) { offerings ->
  offerings["experiment_group"]?.availablePackages?.takeUnless { it.isNullOrEmpty() }?.let {
    // Display packages for sale
  }
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.getOfferings(
    onError = { error ->
        // An error occurred
    },
    onSuccess = { offerings ->
        offerings["experiment_group"]?.availablePackages?.takeUnless { it.isEmpty() }?.let {
            // Display packages for sale
        }
    }
)
```

**Java**

```java
Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
  @Override
  public void onReceived(@NonNull Offerings offerings) {
    if (offerings.get("experiment_group") != null) {
      List<Package> availablePackages = offerings.get("experiment_group").getAvailablePackages();
      // Display packages for sale
    }
  }
  
  @Override
  public void onError(@NonNull PurchasesError error) {
    // An error occurred
  }
});
```

**Flutter**

```dart
try {
  Offerings offerings = await Purchases.getOfferings();
  if (offerings.getOffering("experiment_group").availablePackages.isNotEmpty) {
    // Display packages for sale
  }
} on PlatformException catch (e) {
	// optional error handling
}
```

**React Native**

```jsx
try {
  const offerings = await Purchases.getOfferings();
  if (offerings.all["experiment_group"].availablePackages.length !== 0) {
    // Display packages for sale
  }
} catch (e) {
 
}
```

**Cordova**

```jsx
Purchases.getOfferings(
      offerings => {
        if (offerings.all["experiment_group"].availablePackages.length !== 0) {
			    // Display packages for sale
        }
      },
      error => {

      }
  );
```

**Capacitor**

```jsx
try {
  const offerings = await Purchases.getOfferings();
  if (offerings.all["experiment_group"].availablePackages.length !== 0) {  
    // Display packages for sale
  }
} catch (error) {
  // Handle error
}
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.GetOfferings((offerings, error) =>
{
  if (offerings.All.ContainsKey("experiment_group") && offerings.All["experiment_group"].AvailablePackages.Count != 0) {
  	// Display packages for sale
  }
});
```

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

**Vega**

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

## Displaying Packages

Packages help abstract platform-specific products by grouping equivalent products across iOS, Android, and web. A package is made up of three parts: identifier, type, and underlying store product.

| Name       | Description                                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identifier | The package identifier (e.g. `com.revenuecat.app.monthly`)                                                                                                                                       |
| Type       | The type of the package: <br> - `UNKNOWN` <br> - `CUSTOM` <br> - `LIFETIME` <br> - `ANNUAL` <br> - `SIX_MONTH` <br> - `THREE_MONTH` <br> - `TWO_MONTH` <br> - `MONTHLY` <br> - `WEEKLY` |
| Product    | The underlying product that is mapped to this package which includes details about the price and duration.                                                                                       |

Packages can be access in a few different ways:

1. via the `.availablePackages` property on an Offering.
2. via the duration convenience property on an Offering
3. via the package identifier directly

**Swift**

```swift
        let packages = offerings.offering(identifier: "experiment_group")?.availablePackages
        // --
        let monthlyPackage = offerings.offering(identifier: "experiment_group")?.monthly
        // --
        let packageById = offerings.offering(identifier: "experiment_group")?.package(identifier: "<package_id>")
```

**Obj-C**

```objectivec
[offerings offeringWithIdentifier:"experiment_group"].availablePackages
// --
[offerings offeringWithIdentifier:"experiment_group"].monthly
// --
[[offerings offeringWithIdentifier:"experiment_group"] packageWithIdentifier:@"<package_id>"]
```

**Kotlin**

```kotlin
offerings["experiment_group"]?.availablePackages
// --
offerings["experiment_group"]?.monthly
// --
offerings["experiment_group"]?.getPackage("<package_id>")
```

**Flutter**

```dart
offerings.getOffering("experiment_group").availablePackages
// --
offerings.getOffering("experiment_group").monthly
// --
offerings.getOffering("experiment_group").getPackage("<package_id>")
```

**React Native**

```jsx
offerings.all["experiment_group"].availablePackages
// --
offerings.all["experiment_group"].monthly
// --
offerings.all["experiment_group"].availablePackages.find(pkg => pkg.identifier === "<package_id>")
```

**Capacitor/Cordova**

```jsx
offerings.all["experiment_group"].availablePackages
// --
offerings.all["experiment_group"].monthly
// --
offerings.all["experiment_group"].availablePackages.find(pkg => pkg.identifier === "<package_id>")
```

**Unity**

```csharp
offerings.All["experiment_group"].AvailablePackages
// --
offerings.All["experiment_group"].Monthly
// --
// Manually filter AvailablePackages by the custom package identifier
```

**Web (JS/TS)**

```tsx
    const allPackages = offerings.all["experiment_group"].availablePackages;
    // --
    const monthlyPackage = offerings.all["experiment_group"].monthly;
    // --
    const customPackage =
        offerings.all["experiment_group"].packagesById["<package_id>"];
```

**Vega**

```tsx
const allPackages = offerings.all["experiment_group"].availablePackages;
// --
const monthlyPackage = offerings.all["experiment_group"].monthly;
// --
const customPackage =
    offerings.all["experiment_group"].packagesById["<package_id>"];
```

#### Getting the Product from the Package

Each Package includes an underlying product that includes more information about the price, duration, and other metadata. You can access the product via the `storeProduct` property (or `product` property for [RevenueCat Billing](https://www.revenuecat.com/docs/web/web-billing/web-sdk)):

**Swift**

```swift
        Purchases.shared.getOfferings { (offerings, error) in
            // Accessing the monthly product
            if let product = offerings?.current?.monthly?.storeProduct {
                // Display the product information (like price and introductory period)
                self.display(product)
            }
        }
```

**Objective-C**

```objectivec
// Accessing the monthly product

[[RCPurchases sharedPurchases] offeringsWithCompletionBlock:^(RCOfferings *offerings, NSError *error) {
  if (offerings.current && offerings.current.monthly) {
    SKProduct *product = offerings.current.monthly.storeProduct;
    // Get the price and introductory period from the StoreProduct
  } else if (error) {
    // optional error handling
  }
}];
```

**Kotlin**

```kotlin
// Accessing the monthly product

Purchases.sharedInstance.getOfferingsWith({ error ->
  // An error occurred
}) { offerings ->
  val product = offerings.current?.monthly?.product?.also {
    // Get the price and introductory period from the SkuDetails
  }
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.getOfferings(
    onError = { error ->
        // An error occurred
    },
    onSuccess = { offerings ->
        val product = offerings.current?.monthly?.storeProduct?.also {
            // Get the price and introductory period from the StoreProduct
        }
    }
)
```

**Java**

```java
// Accessing the monthly product

Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
  @Override
  public void onReceived(@NonNull Offerings offerings) {
    if (offerings.getCurrent() != null && offerings.getCurrent().getMonthly() != null) {
      StoreProduct product = offerings.getCurrent().getMonthly().getProduct();
      // Get the price and introductory period from the StoreProduct
    }
  }
  
  @Override
  public void onError(@NonNull PurchasesError error) {
    // An error occurred
  }
});
```

**Flutter**

```dart
// Accessing the monthly product// Displaying the monthly product

try {
  Offerings offerings = await Purchases.getOfferings();
  if (offerings.current != null && offerings.current.monthly != null) {
    StoreProduct product = offerings.current.monthly.storeProduct;
    // Get the price and introductory period from the Product
  }
} on PlatformException catch (e) {
	// optional error handling
}
```

**React Native**

```jsx
// Accessing the monthly product// Displaying the monthly product

try {
  const offerings = await Purchases.getOfferings();
  if (offerings.current && offerings.current.monthly) {
    const product = offerings.current.monthly.product;
    // Get the price and introductory period from the PurchasesProduct
  }
} catch (e) {}
```

**Cordova**

```jsx
// Accessing the monthly product

func displayUpsellScreen() {
  Purchases.getOfferings(
      offerings => {
        if (offerings.current && offerings.current.monthly) {  
          const product = offerings.current.monthly;
			    // Get the price and introductory period from the PurchasesProduct
        }
      },
      error => {

      }
  );
}
```

**Capacitor**

```jsx
// Accessing the monthly product

const displayUpsellScreen = async () => {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current && offerings.current.monthly) {
      const product = offerings.current.monthly;  
      // Get the price and introductory period from the PurchasesProduct
    }
  } catch (error) {
    // Handle error
  }
}
```

**Unity**

```csharp
// Accessing the monthly product

var purchases = GetComponent<Purchases>();
purchases.GetOfferings((offerings, error) =>
{
  if (offerings.Current != null && offerings.Current.Monthly != null){
    var product = offerings.Current.Monthly.Product;
    // Get the price and introductory period from the Product
  }
});
```

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

**Vega**

```tsx
// Accessing / displaying the monthly product
try {
    const offerings = await Purchases.getSharedInstance().getOfferings();
    if (offerings.current && offerings.current.monthly) {
        const product = offerings.current.monthly.product;
        // Display the price and currency of the Amazon product
        displayProduct(product);
    }
} catch (e) {
    // Handle errors
}
```

## Choosing which Offering to display

In practice, you may not want to display the default current Offering to every user and instead have a specific cohort that see a different Offering.

For example, displaying a higher priced Offering to users that came from [paid acquisition](https://www.revenuecat.com/docs/integrations/attribution) to help recover ad costs, or a specific Offering designed to show [iOS Subscription Offers](https://www.revenuecat.com/docs/subscription-guidance/subscription-offers/ios-subscription-offers) when a user has [cancelled their subscription](https://www.revenuecat.com/docs/customers/customer-info#checking-if-a-user-is-subscribed).

This can be accomplished through Targeting, which supports the same filters as [Audiences](https://www.revenuecat.com/docs/dashboard-and-metrics/audiences), including subscription status, purchase history, attribution data, and **any** custom attribute you set for your customers. [Learn more here.](https://www.revenuecat.com/docs/tools/targeting)

Or, alternatively, you could write your own logic locally in your app to serve custom Offering identifiers for each cohort you have in mind.

**Swift**

```swift
        Purchases.shared.getOfferings { (offerings, error) in
            var packages: [Package]?

            if user.isPaidDownload {
                packages = offerings?.offering(identifier: "paid_download_offer")?.availablePackages
            } else if user.signedUpOver30DaysAgo {
                packages = offerings?.offering(identifier: "long_term_offer")?.availablePackages
            } else if user.recentlyChurned {
                packages = offerings?.offering(identifier: "ios_subscription_offer")?.availablePackages
            }

            // Present your paywall
            self.display(packages)
        }
```

**Objective-C**

```objectivec
[[RCPurchases sharedPurchases] offeringsWithCompletionBlock:^(RCOfferings *offerings, NSError *error) {
  NSArray<RCPackage *> *packages;
  
  if (user.isPaidDownload) {
    packages = [offerings offeringWithIdentifier:"paid_download_offer"].availablePackages;
  } else if (user.signedUpOver30DaysAgo) {
    packages = [offerings offeringWithIdentifier:"long_term_offer"].availablePackages;
  } else if (user.recentlyChurned) {
    packages = [offerings offeringWithIdentifier:"ios_subscription_offer"].availablePackages;
  }
  
  [self presentPaywallWithPackages:packages];
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.getOfferingsWith({ error ->
  // An error occurred
}) { offerings ->
  val packages: Package? = when {
    user.isPaidDownload -> offerings["paid_download_offer"]?.availablePackages
    user.signedUpOver30DaysAgo -> offerings["long_term_offer"]?.availablePackages
    user.recentlyChurned -> offerings["ios_subscription_offer"].availablePackages
    else -> null
  }
	presentPaywall(packages)
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.getOfferings(
    onError = { error ->
        // An error occurred
    },
    onSuccess = { offerings ->
        val packages: List<Package> = when {
            user.isPaidDownload -> offerings["paid_download_offer"]?.availablePackages
            user.signedUpOver30DaysAgo -> offerings["long_term_offer"]?.availablePackages
            user.recentlyChurned -> offerings["ios_subscription_offer"]?.availablePackages
            else -> null
        }.orEmpty()
        presentPaywall(packages)
    }
)
```

**Java**

```java
Purchases.getSharedInstance().getOfferings(new ReceiveOfferingsCallback() {
  @Override
  public void onReceived(@NonNull Offerings offerings) {
    List<Package> packages = null;
    if (user.isPaidDownload) {
      if (offerings.get("paid_download_offer") != null) {
        packages = offerings.get("paid_download_offer").getAvailablePackages();
      }
    } else if (user.signedUpOver30DaysAgo) {
      if (offerings.get("long_term_offer") != null) {
        packages = offerings.get("long_term_offer").getAvailablePackages();
      }
    }
    presentPaywall(packages);
  }
  
  @Override
  public void onError(@NonNull PurchasesError error) {
    // An error occurred
  }
});
```

**Flutter**

```dart
try {
  Offerings offerings = await Purchases.getOfferings();
  var packages;
  if (user.isPaidDownload) {
    packages = offerings?.getOffering("paid_download_offer")?.availablePackages;
  } else if (user.signedUpOver30DaysAgo) {
    packages = offerings?.getOffering("long_term_offer")?.availablePackages;
  } else if (user.recentlyChurned) {
    packages = offerings?.getOffering("ios_subscription_offer")?.availablePackages;
  }
  presentPaywall(packages);
} on PlatformException catch (e) {
	// optional error handling
}
```

**React Native**

```jsx
try {
  const offerings = await Purchases.getOfferings();
  let packages;
  if (user.isPaidDownload) {
    packages = offerings.all["paid_download_offer"].availablePackages;
  } else if (user.signedUpOver30DaysAgo) {
    packages = offerings.all["long_term_offer"].availablePackages;
  } else if (user.recentlyChurned) {
    packages = offerings.all["ios_subscription_offer"].availablePackages;
  }
  presentPaywall(packages);
} catch (e) {
 
}
```

**Cordova**

```jsx
Purchases.getOfferings(
      offerings => {
        let packages;
        if (user.isPaidDownload) {
          packages = offerings.all["paid_download_offer"].availablePackages;
        } else if (user.signedUpOver30DaysAgo) {
          packages = offerings.all["long_term_offer"].availablePackages;
        } else if (user.recentlyChurned) {
          packages = offerings.all["ios_subscription_offer"].availablePackages;
        }
        presentPaywall(packages);
      },
      error => {

      }
  );
```

**Capacitor**

```jsx
try {
  const offerings = await Purchases.getOfferings();
  let packages;
  if (user.isPaidDownload) {
    packages = offerings.all["paid_download_offer"].availablePackages;
  } else if (user.signedUpOver30DaysAgo) {
    packages = offerings.all["long_term_offer"].availablePackages;
  } else if (user.recentlyChurned) {
    packages = offerings.all["ios_subscription_offer"].availablePackages;
  }
  if (packages) {
    presentPaywall(packages);
  }
} catch (error) {
  // Handle errors fetching offerings
}
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.GetOfferings((offerings, error) =>
{
  List<Purchases.Package> packages;
  if (user.isPaidDownload) {
    packages = offerings.All["paid_download_offer"].AvailablePackages;
  } else if (user.signedUpOver30DaysAgo) {
    packages = offerings.All["long_term_offer"].AvailablePackages;
  } else if (user.recentlyChurned) {
    packages = offerings.All["ios_subscription_offer"].AvailablePackages;
  }
  presentPaywall(packages);
});
```

## Best Practices

| Do                                                                          | Don't                                                          |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------- |
| ✅ Make paywalls dynamic by minimizing or eliminating any hardcoded strings | ❌ Make static paywalls hardcoded with specific product IDs    |
| ✅ Use default package types                                                | ❌ Use custom package identifiers in place of a default option |
| ✅ Allow for any number of product choices                                  | ❌ Support only a fixed number of products                     |
| ✅ Support for different free trial durations, or no free trial             | ❌ Hardcode free trial text                                    |

## Next Steps

- Now that you've shown the correct products to users, time to [make a purchase ](https://www.revenuecat.com/docs/getting-started/making-purchases)
- Check out our [sample apps ](https://www.revenuecat.com/docs/platform-resources/sample-apps) for examples of how to display products.
