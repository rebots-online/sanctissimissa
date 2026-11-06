<!--
SNAPSHOT  DOCS/sdk/revenuecat-purchases-js/identifying-customers.md
source:   https://www.revenuecat.com/docs/customers/identifying-customers.md
fetched:  2026-11-06 (curl, verbatim)
version:  @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/revenuecat-purchases-js/INDEX.md instead.
-->

---
id: "customers/user-ids"
title: "Identifying Customers"
description: "RevenueCat provides a source of truth for a customer's subscription status across different platforms. User identity is one of the most important components of many mobile applications, and it's crucial to make sure the subscription status that RevenueCat is tracking is associated with the correct user."
permalink: "/docs/customers/identifying-customers"
slug: "identifying-customers"
version: "current"
original_source: "docs/customers/user-ids.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

RevenueCat provides a source of truth for a customer's [subscription status](https://www.revenuecat.com/docs/customers/customer-info) across different platforms. User identity is one of the most important components of many mobile applications, and it's crucial to make sure the subscription status that RevenueCat is tracking is associated with the correct user.

For an overview of what a customer is in RevenueCat, see [What is a Customer?](https://www.revenuecat.com/docs/customers/user-ids).

## Anonymous App User IDs

By default, if you don't provide an App User ID when configuring the Purchases SDK, RevenueCat will generate a new random App User ID (prefixed with `$RCAnonymousID:`) for you, and will cache it on the device.

In the event that the user deletes and reinstalls the app, the cache will be cleared and a new random anonymous App User ID will be generated.

Anonymous App User IDs are **not** able to share subscription status across apps and platforms, but are suitable for many apps that don't require authentication and only support a single platform.

**Swift**

```swift
Purchases.configure(withAPIKey: <my_api_key>)
```

**Obj-C**

```objectivec
[RCPurchases configureWithAPIKey:@<my_api_key>];
```

**Kotlin**

```kotlin
Purchases.configure(PurchasesConfiguration.Builder(this, <api_key>).build())
```

**Kotlin MP**

```kotlin
Purchases.configure(apiKey = "<api_key>")
```

**Java**

```java
Purchases.configure(new PurchasesConfiguration.Builder(context, <api_key>).build());
```

**Flutter**

```dart
await Purchases.configure(PurchasesConfiguration(<public_sdk_key>));
```

**React Native**

```jsx
Purchases.configure({apiKey: <public_sdk_key>});
```

**Cordova**

```jsx
Purchases.configureWith({ apiKey: <public_sdk_key> });
```

**Capacitor**

```jsx
Purchases.configure({ apiKey: <public_sdk_key> });
```

**Unity**

```csharp
// The SDK can be configured through the Unity Editor. 
// See Unity installation instructions https://www.revenuecat.com/docs/getting-started/installation/unity

// If you'd like to do it programmatically instead, 
// make sure to check "Use runtime setup" in the Editor and then: 

Purchases.PurchasesConfiguration.Builder builder = Purchases.PurchasesConfiguration.Builder.Init("api_key");
Purchases.PurchasesConfiguration purchasesConfiguration = builder.Build();
purchases.Configure(purchasesConfiguration);
```

## Custom App User IDs

Setting your own App User ID will allow you to reference users in the RevenueCat dashboard, via the API, as well as in the [webhooks](https://www.revenuecat.com/docs/integrations/webhooks) and other integrations.

Using an externally managed App User ID also provides a mechanism by which to restore purchases in a few scenarios:

- When a user deletes and reinstalls your app - using the same App User ID will ensure they still have access to subscriptions previously started without requiring a [restore](https://www.revenuecat.com/docs/getting-started/restoring-purchases) .
- When the user logs in on multiple devices - you can honor a subscription that was purchased on one device across any other platform.

App User IDs are case-sensitive and are scoped to a whole Project. A user logged into the same App User ID on different platforms will be considered the same user and can access the entitlements they have purchased on any platform.

:::info[Managing Subscriptions]

A user can only [manage their subscription](https://www.revenuecat.com/docs/subscription-guidance/managing-subscriptions) on the platform it was purchased from.
:::

### Logging in during configuration

If you have your own App User IDs at app launch, you can pass those on instantiation to *Purchases*. Make sure to not hard-code this identifier, if you do all users will be considered the same one and will share purchases.

**Swift**

```swift
Purchases.configure(withAPIKey: <my_api_key>, appUserID: <my_app_user_id>)
```

**Obj-C**

```objectivec
[RCPurchases configureWithAPIKey:@<my_api_key> appUserID:@<my_app_user_id>];
```

**Kotlin**

```kotlin
Purchases.configure(PurchasesConfiguration.Builder(this, <api_key>).appUserID(<my_app_user_id>).build())
```

**Kotlin MP**

```kotlin
Purchases.configure(apiKey = "<api_key>") {
    appUserId = "<app_user_id>"
}
```

**Java**

```java
Purchases.configure(new PurchasesConfiguration.Builder(context, <api_key>).appUserID(<my_app_user_id>).build());
```

**Flutter**

```dart
await Purchases.configure(
    PurchasesConfiguration(<public_sdk_key>)
      ..appUserID = <my_app_user_id>
);
```

**React Native**

```jsx
Purchases.configure({apiKey: <public_sdk_key>, appUserID: <my_app_user_id>});
```

**Cordova**

```jsx
Purchases.configureWith({ apiKey: <public_sdk_key>, appUserID: <my_app_user_id> });
```

**Capacitor**

```jsx
await Purchases.configure({ apiKey: <public_sdk_key>, appUserID: <my_app_user_id> });
```

**Unity**

```csharp
// The appUserID can be set through the Unity Editor. 
// See Unity installation instructions https://www.revenuecat.com/docs/getting-started/installation/unity

// If you'd like to do it programmatically instead, 
// make sure to check "Use runtime setup" in the Editor and then: 

Purchases.PurchasesConfiguration.Builder builder = Purchases.PurchasesConfiguration.Builder.Init("api_key");
Purchases.PurchasesConfiguration purchasesConfiguration =
    builder.SetUserDefaultsSuiteName("user_default")
    .SetDangerousSettings(new Purchases.DangerousSettings(false))
    .SetUseAmazon(false)
    .SetAppUserId(appUserId)
    .Build();
purchases.Configure(purchasesConfiguration);
```

Often times, you may not have your own App User IDs until later in the application lifecycle. In these cases, you can pass the App User ID later through the `.logIn()` method.

### Logging in after configuration

If your app doesn't receive its own App User ID until later in its lifecycle, you can set (or change) the App User ID at any time by calling `.logIn()`. If the logged in identity does not already exist in RevenueCat, it will be created automatically.

This flow will generate an anonymous App User ID for the user first, then may (*see below*) alias the anonymous App User ID to the provided custom App User ID. In this case if you integrated webhooks, `original_app_user_id` will be the anonymous id and `app_user_id` will be the provided id.

**Swift**

```swift
// Configure Purchases on app launch
Purchases.configure(withAPIKey: <my_api_key>)

// ...

// Later log in provided user Id
Purchases.shared.logIn(<my_app_user_id>) { (customerInfo, created, error) in
    // customerInfo updated for my_app_user_id
}
```

**Obj-C**

```objectivec
// Configure Purchases on app launch
[RCPurchases configureWithAPIKey:@<my_api_key>];

//...

// Later log in provided user Id
[[RCPurchases sharedPurchases] logIn:@<my_app_user_id> completion:^(RCCustomerInfo *customerInfo, BOOL created, NSError *error) {
    // customerInfo updated for my_app_user_id
}];
```

**Kotlin**

```kotlin
// Configure Purchases on app launch
Purchases.configure(PurchasesConfiguration.Builder(this, <api_key>).build())
  
//...

// Later log in provided user Id
Purchases.sharedInstance.logInWith(<my_app_user_id>, ::showError) { customerInfo, created ->
  // customerInfo updated for my_app_user_id
}
```

**Kotlin MP**

```kotlin
// Configure Purchases on app launch
Purchases.configure(apiKey = "<api_key>")

// Later log in with the provided user Id
Purchases.sharedInstance.logIn("<my_app_user_id>", ::showError) { customerInfo, created ->
  // customerInfo updated for my_app_user_id
}
```

**Java**

```java
// Configure Purchases on app launch
Purchases.configure(new PurchasesConfiguration.Builder(context, <api_key>).build());

//...

// Later log in provided user Id
Purchases.getSharedInstance().logIn(<my_app_user_id>, new LogInCallback() {
	@Override
	public void onReceived(@NotNull CustomerInfo customerInfo, boolean created) {
		// customerInfo updated for my_app_user_id
	}
  
  @Override
  public void onError(@NotNull PurchasesError error) {

  }
});
```

**Flutter**

```dart
// Configure Purchases on app launch
await Purchases.configure(PurchasesConfiguration(<public_sdk_key>));

//...

// Later log in provided user Id
LogInResult result = await Purchases.logIn(<my_app_user_id>);
```

**React Native**

```jsx
// Configure Purchases on app launch
Purchases.configure({apiKey: <public_sdk_key>});

//...

// Later log in provided user Id
const { customerInfo, created } = await Purchases.logIn(<my_app_user_id>);
// customerInfo updated for my_app_user_id
```

**Cordova**

```jsx
// Configure Purchases on app launch
Purchases.configureWith({ apiKey: <public_sdk_key> });

//...

// Later log in provided user Id

Purchases.logIn(
  <my_app_user_id>, 
  ({ customerInfo, created }) => {
    // customerInfo updated for my_app_user_id
  },
  error => {
  }
);
```

**Capacitor**

```jsx
// Configure Purchases on app launch
await Purchases.configure({ apiKey: <public_sdk_key> });

//...

// Later log in providing user Id
try {
  const logInResult = await Purchases.logIn({ appUserID: <my_app_user_id>});
} catch (error) {
  // Handle error logging in
}
```

**Unity**

```csharp
// configure the SDK either through the Editor or through 
// programmatic setup (see section above), then:


var purchases = GetComponent<Purchases>();
purchases.LogIn(<myAppUserUD>, (customerInfo, created, error) =>
{
    if (error != null)
    {
        // show error
    }
    else
    {
        // show customerInfo
    }
});
```

`logIn()` method alias behavior

When logging in from an Anonymous ID to a provided custom App User ID, RevenueCat will decide whether the identities should be merged (aliased) into the same CustomerInfo object or not. This is decided depending on whether the provided custom App User ID already exists, and if it does exist whether it has an anonymous alias already.

| Current App User ID | Provided Custom App User ID already exists? | Provided Custom App User ID already has an anonymous alias? | Result                                                                                              |
| :------------------ | :------------------------------------------ | :---------------------------------------------------------- | :-------------------------------------------------------------------------------------------------- |
| Anonymous           | No                                          | N/A                                                         | Anonymous ID and Provided ID have CustomerInfo merged.                                              |
| Anonymous           | Yes                                         | No                                                          | Anonymous ID and Provided ID have CustomerInfo merged.                                              |
| Anonymous           | Yes                                         | Yes                                                         | Current User ID is logged out, Provided User ID is logged in. No merge or purchase transfer occurs. |
| Non-anonymous       | Any                                         | Any                                                         | Current User ID is logged out, Provided User ID is logged in. No merge or purchase transfer occurs. |

### Logging Out

When an identified user logs out of your application you should call the `logOut()` method within the SDK. This will generate a new anonymous App User ID for the logged out state. However, if you plan to use only custom App User ID's, you can follow the instructions from the "How to force only using Custom App User IDs" section in the [Advanced Topics](https://www.revenuecat.com/docs/customers/identifying-customers#advanced-topics).

#### Logging back in

To log in a new user, the provided App User ID should be set again with `.logIn()`.

#### Switching accounts

If you need to switch from one provided App User ID to another, it's okay to call the `.logIn()` method directly - you do not need to call `logOut()` first.

## Supporting your customers

We strongly recommend revealing the App User ID to your customers somewhere within your app. Typically, developers choose to display the App User ID in a settings screen.

Allowing your customers to view and copy their App User ID can help with troubleshooting and support if they need to contact you or your support team.

You can retrieve the currently identified App User ID via the `Purchases.shared.appUserID` property.

## Aliases

If you use a combination of anonymous and custom App User IDs, it’s expected that Customers may be merged over time due to various actions they perform within the app, like [logins](https://www.revenuecat.com/docs/customers/identifying-customers#logging-in-after-configuration) or [restores](https://www.revenuecat.com/docs/getting-started/restoring-purchases). Scenarios explaining when merges occur are covered in more detail below, and will depend on the [restore behavior](https://www.revenuecat.com/docs/getting-started/restoring-purchases#restore-behavior) you select for your project.

When a merge of customers occurs, there will be only one App User ID within the `original_app_user_id` field. If you’re listening to [Webhooks](https://www.revenuecat.com/docs/integrations/webhooks), the other App User IDs associated with the customer will be within an array in the `aliases` field.

When referenced via the [SDK](https://www.revenuecat.com/docs/getting-started/configuring-sdk) or [API](https://www.revenuecat.com/api-v1), any merged App User IDs will all be treated as the same “customer”. Looking up any of the merged App User IDs in RevenueCat will return the same `CustomerInfo`, customer history, customer attributes, subscription status, etc.

## Tips for Setting Custom App User IDs

**ℹ️ Every app user ID must be unique per user.**

If you don't have your own user IDs for some of your users, you should not pass any value for the App User ID on configuration, which will then rely on the anonymous IDs created by RevenueCat.

**ℹ️ App User IDs should not be guessable**

RevenueCat provides subscription status via the public API; it is not good to have App User IDs that are easily guessed. A non-guessable pseudo-random ID, like a UUID (RFC 4122 version 4), is recommended.

**ℹ️ Length limitations**

App User IDs should not be longer than 100 characters.

**⚠️ Don't set emails as App User IDs**

For the above reasons about guessability, and GDPR compliance, we don't recommend using email addresses as App User IDs.

**⚠️ Don't set IDFA as App User IDs**

Advertising identifiers should not be used as App User IDs since they can be easily rotated and are not unique across users if limit ad tracking is enabled.

**🚨 Don't hardcode strings as App User IDs**

You should never hardcode a string as an App User ID, since every install will be treated as the same user in RevenueCat. **This will create problems and could unlock entitlements for users that haven't actually purchased.**

## Blocked App User IDs

Certain App User IDs are blocked in RevenueCat. This is by design to help developers that may be unintentionally passing non-unique strings as user identifiers.

The current block-list is: `'no_user'`, `'null'`, `'none'`, `'nil'`, `'(null)'`, `'NaN`, `'\\x00'`(`NULL` character), `''`(empty string), `'unidentified'`, `'undefined'`, `'unknown'`, `'anonymous'`, `'guest'`, `'-1'`, `'0'`, `'[]'`, `'{}'`, `'[object Object]'` and any App User IDs containing the character `/`.

## Advanced Topics

How to force only using Custom App User IDs

To only use custom App User IDs, you must take care not to generate any anonymous App User IDs in the SDK.

Anonymous App User IDs are generated when the SDK is configured without a provided custom App User ID, and are also created on `logOut()` as mentioned above. Many apps use a combination of anonymous App User IDs and their own custom App User IDs via an authentication system to provide flexibility in their user purchase flows. However, some applications are intended only to be used while using a known App User ID, without anonymous users at all.

Some limits of anonymous IDs include added difficulty in personalization of user experiences, optimization of monetization strategies, and not being able to share subscriptions across platforms. Depending on the application's [transfer behavior](https://www.revenuecat.com/docs/getting-started/restoring-purchases), a provided user's subscription may be transferred to an anonymous ID - which can only be brought back through a [restore](https://www.revenuecat.com/docs/getting-started/restoring-purchases) on the original purchase platform.

In any case, to never see Anonymous IDs, you only need to make sure to do the following: Only configure the SDK with a custom App User ID, and never call `.logout()`.

#### Only Configure the SDK with a custom App User ID

The most frequent place that anonymous App User IDs are created is when the SDK is first [configured](https://www.revenuecat.com/docs/getting-started/configuring-sdk). Calling `.configure` on the SDK without providing a known user ID will cause the SDK to generate an anonymous ID for the current user. To avoid anonymous IDs, you will need to identify the user’s ID before configuring the SDK. Many applications use their own authentication system, often shared on multiple platforms, to identify users and provide their unique App User IDs.

#### Do not Logout the User

After the user is logged in with a known App User ID, they may want to logout or switch accounts on your application (e.g., logout and then login with a different known ID). However, calling logout in the SDK will result in an anonymous App User ID being created. To resolve this, simply **do not logout the SDK**. In the case of switching accounts, you can call login when the user logs in to the different account with their new App User ID.

iOS 15 Prewarming

In certain cases on iOS 15 devices, iOS may [prewarm](https://developer.apple.com/documentation/uikit/about-the-app-launch-sequence?language=objc) your app - this essentially means your app will be launched silently in the background to improve app launch times for your users.

If you are **not** using RevenueCat's anonymous IDs as described above, and are instead providing your own app user ID on configuration, **do not** call `configure` in `application:didFinishLaunchingWithOptions:`. Instead, call the `configure` method in your root view controller's initialization method.

## Next Steps

- Enrich your app by [reacting to the user's current subscription status ](https://www.revenuecat.com/docs/customers/customer-info)
- If you're moving to RevenueCat from another system, see our guide on [migrating your existing subscriptions ](https://www.revenuecat.com/docs/migrating-to-revenuecat/migrating-existing-subscriptions)
- Once you're ready to test your integration, you can follow our guides on [testing and debugging ](https://www.revenuecat.com/docs/test-and-launch/debugging)
