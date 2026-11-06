<!--
SNAPSHOT  DOCS/sdk/purchases-android/customer-info.md
source:   https://www.revenuecat.com/docs/customers/customer-info.md
fetched:  2026-11-06 (curl, verbatim)
version:  purchases-android 11.2.0 (Maven Central `release` on 2026-11-06)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/purchases-android/INDEX.md instead.
-->

---
id: "customers/customer-info"
title: "Getting Subscription Status"
description: "RevenueCat makes it easy to determine subscription status and more with the RevenueCat SDK and REST API."
permalink: "/docs/customers/customer-info"
slug: "customer-info"
version: "current"
original_source: "docs/customers/customer-info.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

RevenueCat makes it easy to determine subscription status and more with the RevenueCat SDK and [REST API](https://www.revenuecat.com/api-v2).

## Getting subscription status via the SDK

The CustomerInfo object contains all of the purchase and subscription data available about a customer.

This object is updated whenever a purchase or restore occurs and periodically throughout the lifecycle of your app. The latest information can always be retrieved by calling `getCustomerInfo()`:

**Swift**

```swift
// Using Swift Concurrency
do {
    let customerInfo = try await Purchases.shared.customerInfo()
} catch {
    // handle error
}
// Using Completion Blocks
Purchases.shared.getCustomerInfo { (customerInfo, error) in
    // access latest customerInfo
}
```

**Obj-C**

```objectivec
[[RCPurchases sharedPurchases] customerInfoWithCompletion:^(RCCustomerInfo * customerInfo, NSError * error) {
     // access latest customerInfo
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.getCustomerInfoWith(
    onError = { error -> /* Optional error handling */ },
    onSuccess = { customerInfo -> /* Access latest customerInfo */ },
)
```

**Java**

```java
Purchases.getSharedInstance().getCustomerInfo(new ReceiveCustomerInfoCallback() {
  @Override
  public void onReceived(@NonNull CustomerInfo customerInfo) {
    // access latest customerInfo
  }
  
  @Override
  public void onError(@NonNull PurchasesError error) {

  }
});
```

**Flutter**

```dart
try {
  CustomerInfo customerInfo = await Purchases.getCustomerInfo();
  // access latest customerInfo
} on PlatformException catch (e) {
  // Error fetching customer info
}
```

**React Native**

```jsx
try {
  const customerInfo = await Purchases.getCustomerInfo();
  // access latest customerInfo
} catch (e) {
 // Error fetching customer info
}
```

**Cordova**

```jsx
Purchases.getCustomerInfo(
  customerInfo => {
     // access latest customerInfo
  },
  error => {
    // Error fetching customer info
  }
);
```

**Capacitor**

```jsx
await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
  // handle any changes to customerInfo
});
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.GetCustomerInfo((customerInfo, error) =>
{
  // access latest customerInfo
});
```

**Web (JS/TS)**

```tsx
    try {
        customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
        // access latest customerInfo
    } catch (e) {
        // Handle errors fetching customer info
    }
```

**Vega**

```tsx
try {
    customerInfo = await Purchases.getSharedInstance().getCustomerInfo();
    // access latest customerInfo
} catch (e) {
    // Handle errors fetching customer info
}
```

It's safe to call `getCustomerInfo()` frequently throughout your app. Since the SDK updates and caches the latest CustomerInfo when the app becomes active, the completion block won't need to make a network request in most cases.

### Checking If A User Is Subscribed

The subscription status for a user can easily be determined with the `CustomerInfo` and `EntitlementInfo` objects.

For most apps that only have one entitlement, the `isActive` status can be quickly checked for your entitlement ID.

**Swift**

```swift
if customerInfo.entitlements[<your_entitlement_id>]?.isActive == true {
  // user has access to "your_entitlement_id"                
}
```

**Obj-C**

```objectivec
if (customerInfo.entitlements[@<your_entitlement_id>].isActive) {
  // user has access to "your_entitlement_id"
}
```

**Kotlin**

```kotlin
if (customerInfo.entitlements[<your_entitlement_id>]?.isActive == true) {
	// user has access to "your_entitlement_id"                
}
```

**Java**

```java
if (customerInfo.getEntitlements().get(<your_entitlement_id>) != null
    && customerInfo.getEntitlements().get(<your_entitlement_id>).isActive()) {
	// user has access to "your_entitlement_id"
}
```

**Flutter**

```dart
if (customerInfo.entitlements.all[<my_entitlement_identifier>].isActive) {
  // Grant user "pro" access
}
```

**React Native**

```jsx
if(typeof customerInfo.entitlements.active[<my_entitlement_identifier>] !== "undefined") {
  // Grant user "pro" access
}
```

**Cordova**

```jsx
if(typeof customerInfo.entitlements.active[<my_entitlement_identifier>] !== "undefined") {
  // Grant user "pro" access
}
```

**Unity**

```csharp
if (customerInfo.Entitlements.Active.ContainsKey(<my_entitlement_identifier>)) {
  // Unlock that great "pro" content
}
```

**Web (JS/TS)**

```tsx
    if ("gold_entitlement" in customerInfo.entitlements.active) {
        // Grant user access to the entitlement "gold_entitlement"
        grantEntitlementAccess();
    }
```

**Vega**

```tsx
if ("gold_entitlement" in customerInfo.entitlements.active) {
    // Grant user access to the entitlement "gold_entitlement"
    grantEntitlementAccess();
}
```

If your app has multiple entitlements, you might also want to check if the customer has any active entitlements:

**Swift**

```swift
if !customerInfo.entitlements.active.isEmpty {
    // user has access to some entitlement
}
```

**Obj-C**

```objectivec
if ([customerInfo.entitlements.active count] > 0) {
    //user has access to some entitlement
}
```

**Kotlin**

```kotlin
if (customerInfo.entitlements.active.isNotEmpty()) {
  //user has access to some entitlement
}
```

**Java**

```java
if (!customerInfo.getEntitlements().getActive().isEmpty()) {
	//user has access to some entitlement
}
```

**Flutter**

```dart
if (customerInfo.entitlements.active.isNotEmpty) {
  //user has access to some entitlement
}
```

**React Native**

```jsx
if (Object.entries(customerInfo.entitlements.active).length) {
  //user has access to some entitlement
}
```

**Cordova**

```jsx
if (Object.entries(customerInfo.entitlements.active).length) {
  //user has access to some entitlement
}
```

**Unity**

```csharp
if (customerInfo.Entitlements.Active.Count != 0) {
    //user has access to some entitlement
}
```

**Web (JS/TS)**

```tsx
    if (Object.keys(customerInfo.entitlements.active).length > 0) {
        // User has access to some entitlement, grant entitlement access
        grantEntitlementAccess();
    }
```

**Vega**

```tsx
if (Object.keys(customerInfo.entitlements.active).length > 0) {
    // User has access to some entitlement, grant entitlement access
    grantEntitlementAccess();
}
```

It's important to note that CustomerInfo will be empty if no purchases have been made and no transactions have been synced. This means that entitlements may not exist in CustomerInfo even if they have been set up in the RevenueCat dashboard.

On Google Play, entitlements can briefly go empty around renewal before Google applies grace or a deferred charge, even for customers who are still set to renew. See [Google Play renewal extensions and entitlements](https://www.revenuecat.com/docs/customers/google-play-renewal-extensions) for that state and an optional soft-gate.

### Restoring Purchases

Restoring purchases is a mechanism by which your user can restore their in-app purchases, reactivating any content that had previously been purchased from the same store account (Apple, Google, or Amazon).

It is recommended that all apps have some way for users to trigger the restorePurchases method, even if you require all customers to create accounts.

See our [Restoring Purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases) guide for more information.

### Cache

The SDK caches the user's subscription information to reduce your app's reliance on the network.

Users who unlock entitlements will be able to access them even without an internet connection. The SDK will update the cache if it's older than 5 minutes, but only if you call `getCustomerInfo()`, make a purchase, or restore purchases, so it's a good idea to call `getCustomerInfo()` any time a user accesses premium content.

### Listening For CustomerInfo Updates

Since *Purchases* SDK works seamlessly on any platform, a user's CustomerInfo may change from a variety of sources. You can respond to any changes in CustomerInfo by conforming to an optional delegate method, `purchases:receivedUpdated:`. This will fire whenever we receive a *change* in CustomerInfo *on the current device* and you should expect it to be called at launch and throughout the life of the app.

CustomerInfo updates are not pushed to your app from the RevenueCat backend, updates can only happen from an outbound network request to RevenueCat.

Depending on your app, it may be sufficient to ignore the delegate and simply handle changes to customer information the next time your app is launched. Or throughout your app as you request new `CustomerInfo` objects.

**Swift**

```swift
// Option 1: using PurchasesDelegate:
Purchases.logLevel = .debug
Purchases.configure(withAPIKey: <public_sdk_key>)
Purchases.shared.delegate = self // make sure to set this after calling configure

extension AppDelegate: PurchasesDelegate {
    func purchases(_ purchases: Purchases, receivedUpdated customerInfo: Purchases.CustomerInfo) {
        // handle any changes to customerInfo
    }
}

// Option 2: using Swift Concurrency:
for try await customerInfo in Purchases.shared.customerInfoStream {
    // handle any changes to customerInfo
}
```

**Obj-C**

```objectivec
- (void)purchases:(nonnull RCPurchases *)purchases receivedUpdatedCustomerInfo:(nonnull RCCustomerInfo *)customerInfo {
    // handle any changes to customerInfo
}
```

**Kotlin**

```kotlin
class UpsellActivity : AppCompatActivity(), UpdatedCustomerInfoListener {
  override fun onReceived(customerInfo: CustomerInfo) {
    // handle any changes to customerInfo
  }
  
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    Purchases.sharedInstance.updatedCustomerInfoListener = this
  }   
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.delegate = object : PurchasesDelegate {
    override fun onCustomerInfoUpdated(customerInfo: CustomerInfo) {
        // handle any changes to customerInfo
    }
}
```

**Java**

```java
public class UpsellActivity extends AppCompatActivity implements UpdatedCustomerInfoListener {
  @Override public void onReceived(CustomerInfo customerInfo) {
    // handle any changes to customerInfo
  } 
  
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
		Purchases.getSharedInstance().setUpdatedCustomerInfoListener(this);
  }   
}
```

**Flutter**

```dart
Purchases.addCustomerInfoUpdateListener((info) {
	// handle any changes to customerInfo
});
```

**React Native**

```jsx
Purchases.addCustomerInfoUpdateListener((info) => {
	// handle any changes to customerInfo
});
```

**Cordova**

```jsx
window.addEventListener("onCustomerInfoUpdated", (info) => {
	// handle any changes to customerInfo
});
```

**Capacitor**

```jsx
await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
  // handle any changes to customerInfo
});
```

**Unity**

```csharp
public class PurchasesListener : Purchases.UpdatedCustomerInfoListener
{
    public override void CustomerInfoReceived(Purchases.CustomerInfo customerInfo)
    {
        // handle any changes to CustomerInfo
    }
}
```

### Reference

CustomerInfo Reference

The `CustomerInfo` object gives you access to the following information about a user:

| Name                              | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Request Date                      | The server date when the current CustomerInfo object was fetched. This is affected by the cache on device so you should not use it when you need the current time to calculate info such as time elapsed since purchase date. For that you should use device time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Original App User ID              | The original App User ID recorded for this user. May be the same as their current App User ID. See our [Identifying Users](https://www.revenuecat.com/docs/customers/user-ids) guide for more information.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| First Seen                        | The date this user was first seen in RevenueCat. This is the install date in most cases                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Original Application Version      | iOS only. The version number for the first version of the app this user downloaded. Will be `nil` unless a receipt has been recorded for the user through a purchase, restore, or import. <br> <br>Note in sandbox this will always be "1.0" <br> <br>Useful for [migrating existing apps to subscriptions](https://www.revenuecat.com/docs/migrating-to-revenuecat/migrating-existing-subscriptions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Original Purchase Date            | iOS only. The date that the app was first purchased/downloaded by the user. Will be `nil` if no receipt is recorded for the user. Useful for [migrating existing apps to subscriptions](https://www.revenuecat.com/docs/migrating-to-revenuecat/migrating-existing-subscriptions).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Management URL                    | URL to manage the active subscription of the user. If the user has an active iOS subscription, this will point to the App Store. If the user has an active Play Store subscription, it will point there. Amazon subscriptions point to the Amazon subscription management page, Paddle subscriptions point to the Paddle Customer Portal, and RevenueCat Web Billing subscriptions point to the RevenueCat Web Billing Customer Portal. For Stripe Billing subscriptions, this returns your configured [Stripe Customer Portal URL](https://www.revenuecat.com/docs/web/integrations/stripe#subscription-management) or a custom URL. If no Stripe Customer Portal URL is configured, `managementURL` will be null. <br> <br>If there are no active subscriptions it will be null. <br> <br>If the user has multiple active subscriptions for different platforms, this will take the value of the OS in the X-Platform header into consideration: <br>﻿- If the request was made on an OS for which there are active subscriptions, this will return the URL for the store that matches the header. <br>﻿- If the request was made on a different OS or the OS was not included in the X-Platform header, this will return the URL for the store of the subscription with the farthest future expiration date. |
| All Purchased Product Identifiers | An array of product identifiers purchased by the user regardless of expiration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| All Expiration Dates By Product   | A map of product identifiers to expiration dates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| All Purchase Dates By Product     | A map of product identifiers to purchase dates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Non Subscription Transactions     | A list of all the non-subscription transactions purchased by the user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Latest Expiration Date            | The latest expiration date of all purchased products.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Active Subscriptions              | An array of subscription product identifiers that are active. You should be using [entitlement](https://www.revenuecat.com/docs/getting-started/entitlements) though.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Entitlements                      | `EntitlementInfo` objects that contain information about the user's entitlements, such as subscription state. [See more below](https://www.revenuecat.com/docs/customers/customer-info#checking-if-a-user-is-subscribed).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

EntitlementInfo Reference

The `EntitlementInfo` object gives you access to all of the information about the status of a user's entitlements.

| Name                      | Description                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identifier                | The entitlement identifier configured in the RevenueCat dashboard.                                                                                                                                                                                                                                                                                                                                         |
| Product Identifier        | The product identifier that unlocked this entitlement.                                                                                                                                                                                                                                                                                                                                                     |
| Is Active                 | Whether or not the user has access to this entitlement.                                                                                                                                                                                                                                                                                                                                                    |
| Will Renew                | Whether or not the entitlement is set to renew at the end of the current period. Note there may be a multiple hour delay between the value of this property and the actual state in the App Store / Play Store.                                                                                                                                                                                            |
| Period Type               | The period type this entitlement is in, can be one of: - Trial: In a free trial period - Promotional: In a promotional period - Intro: In an introductory price period - Normal: In the default period                                                                                                                                                                                                     |
| Latest Purchase Date      | The latest purchase or renewal date for this entitlement.                                                                                                                                                                                                                                                                                                                                                  |
| Original Purchase Date    | The first date this entitlement was purchased. May be the same as the latest purchase date.                                                                                                                                                                                                                                                                                                                |
| Expiration Date           | The expiration date for the entitlement, can be null for lifetime access. If the period type is trial then this is the trial expiration date.                                                                                                                                                                                                                                                              |
| Store                     | The store that unlocked this entitlement, can be one of: - App Store - Mac App Store - Play Store - Amazon Appstore - Stripe - Promotional (RevenueCat)                                                                                                                                                                                                                                                    |
| Is Sandbox                | Whether this entitlement was unlocked from a sandbox or production purchase.                                                                                                                                                                                                                                                                                                                               |
| Unsubscribe Detected At   | The date an unsubscribe was detected. An unsubscribe **does not** mean that the entitlement is inactive. Note there may be a multiple hour delay between the value of this property and the actual state in the App Store / Play Store. This delay can be reduced by enabling [Platform Server Notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications).                                                   |
| Billing Issue Detected At | The date a billing issue was detected, will be null again once billing issue resolved. A billing issue **does not** mean that the entitlement is inactive. Note there may be a multiple hour delay between the value of this property and the actual state in the App Store / Play Store. This delay can be reduced by enabling [Platform Server Notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications). |
| Ownership Type            | Whether this purchase was made by this user or shared to them by a family member (iOS only).                                                                                                                                                                                                                                                                                                               |
| Product Plan Identifier   | The base plan identifier that unlocked this entitlement (Google only).                                                                                                                                                                                                                                                                                                                                     |

## Getting subscription status via the REST API

If you need to get a user's subscription status from outside of the *Purchases SDK*, for example, from your own backend, you should use the REST API. You can read the full API reference [here](https://www.revenuecat.com/api-v2).

```curl
curl --request GET \
  --url https://api.revenuecat.com/v1/subscribers/app_user_id \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer PUBLIC_API_KEY'
```

## Handling Refunds

RevenueCat can handle refunds across all platforms for both subscription and non-subscription products. As soon as RevenueCat detects a refund, the CustomerInfo will be updated to reflect the correct Entitlement status — no action required on your part. For one-time purchases on most stores, configure [Platform Server Notifications](https://www.revenuecat.com/docs/platform-resources/server-notifications) so refunds are detected promptly. Stripe is the exception: RevenueCat keeps checking Stripe one-time purchase receipts for refunds even without server notifications.

If you have questions about refunds, take a look at our [community article](https://community.revenuecat.com/general-questions-7/how-do-i-issue-a-refund-115) covering the topic.

## Offline Entitlements

In the very uncommon case that RevenueCat servers don't respond as expected, the SDK is prepared to verify Apple/Google/Amazon's purchases on the device itself and grant entitlements temporarily. This allows your customers to have an almost seamless experience in this unlikely scenario, improving even more on our reliability. This happens automatically, so you don't need to do anything, the entitlements will appear in the `CustomerInfo`.

Offline Entitlements is automatically enabled when our SDK attempts to reach our servers and they can't respond. It automatically is disabled when our servers respond successful http responses again.

In order to do this, the SDK caches the relationships between products and entitlements you have setup in your RevenueCat dashboard. Then, when it tries to post a purchase to RevenueCat's servers, and these respond with an error, we will use the purchases from the stores and these relationships to grant entitlements.

### Some things to note:

- No information is lost when Offline Entitlements are active. All purchases are recorded and will be processed by our servers automatically once they are back online, with no action needed from you or your users.
- The data for these purchases won't appear in our RevenueCat graphs and webhooks until it's successfully pushed.
- Purchases won't be recognized cross-platform while using Offline Entitlements.
- Offline Entitlements only gets enabled if the user makes a purchases while RevenueCat's servers are down. Otherwise, it will use any existing cached information, which does consider cross-platform purchases.
- Offline Entitlements don't currently work for one-time purchases (consumables and non-consumables). If our SDK detects that the user has made one of these purchases, Offline Entitlements will not be enabled and an error will be returned instead.
- Offline Entitlements are disabled when [your app is completing transactions](https://www.revenuecat.com/docs/migrating-to-revenuecat/sdk-or-not/finishing-transactions).

You can check more of this feature in our blogpost: https://www.revenuecat.com/blog/engineering/introducing-offline-entitlements

## Next Steps

- If you gate access on entitlements and support Google Play, read [Google Play renewal extensions and entitlements](https://www.revenuecat.com/docs/customers/google-play-renewal-extensions)
- Once you're ready to test your integration, you can follow our guides on [testing and debugging ](https://www.revenuecat.com/docs/test-and-launch/debugging)
