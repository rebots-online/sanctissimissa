<!--
SNAPSHOT  DOCS/sdk/purchases-android/restoring-purchases.md
source:   https://www.revenuecat.com/docs/getting-started/restoring-purchases.md
fetched:  2026-11-06 (curl, verbatim)
version:  purchases-android 11.2.0 (Maven Central `release` on 2026-11-06)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/purchases-android/INDEX.md instead.
-->

---
id: "getting-started/restoring-purchases"
title: "Restoring Purchases"
description: "Restoring purchases is a mechanism by which your user can restore their in-app purchases, reactivating any content that had previously been purchased from the same store account (Apple, Google, or Amazon)."
permalink: "/docs/getting-started/restoring-purchases"
slug: "restoring-purchases"
version: "current"
original_source: "docs/getting-started/restoring-purchases.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

Restoring purchases is a mechanism by which your user can restore their in-app purchases, reactivating any content that had previously been purchased **from the same store account** (Apple, Google, or Amazon).

It is recommended that all apps have some way for users to trigger the `restorePurchases` method, even if you require all customers to create accounts.

**Swift**

```swift
// Using Swift Concurrency
let customerInfo = try await Purchases.shared.restorePurchases()
// ... check customerInfo to see if entitlement is now active

// Using Completion Blocks
Purchases.shared.restorePurchases { customerInfo, error in
    // ... check customerInfo to see if entitlement is now active
}
```

**Objective-C**

```objectivec
[[RCPurchases sharedPurchases] restorePurchasesWithCompletion:^(RCCustomerInfo *customerInfo, NSError *error) {
    //... check customerInfo to see if entitlement is now active
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.restorePurchasesWith() { customerInfo ->
	//... check customerInfo to see if entitlement is now active
}
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.restorePurchases(
    onError = { error -> 
        // An error occurred.
    },
    onSuccess = { customerInfo ->
        //... check customerInfo to see if entitlement is now active
    }
)
```

**Java**

```java
Purchases.getSharedInstance().restorePurchases(new ReceiveCustomerInfoCallback() {
	@Override
	public void onError(@NonNull PurchasesError error) {
    
  }

	@Override
	public void onReceived(@NonNull CustomerInfo customerInfo) {
    
  }
});
```

**Flutter**

```dart
try {
  CustomerInfo customerInfo = await Purchases.restorePurchases();
  // ... check restored purchaserInfo to see if entitlement is now active
} on PlatformException catch (e) {
  // Error restoring purchases
}
```

**React Native**

```jsx
try {
  const restore = await Purchases.restorePurchases();
  // ... check restored purchaserInfo to see if entitlement is now active
} catch (e) {

}
```

**Cordova**

```jsx
Purchases.restorePurchases(
  info => {
    //... check customerInfo to see if entitlement is now active
  },
  error => {
    // Error restoring purchases
  }
);
```

**Capacitor**

```jsx
try {
  const customerInfo = await Purchases.restorePurchases();
  //... check customerInfo to see if entitlement is now active
} catch (error) {
  // Error restoring purchases
}
```

**Unity**

```csharp
var purchases = GetComponent<Purchases>();
purchases.RestorePurchases((info, error) =>
{
    //... check purchaserInfo to see if entitlement is now active
});
```

The `restorePurchases` method **should not** be triggered programmatically, since it may cause OS level sign-in prompts to appear, and should only be called from some user interaction (e.g. tapping a "Restore" button.)

:::warning
If you are trying to restore a purchase programmatically, use `syncPurchases` instead. This will not cause OS level sign-in prompts to appear.
:::

## Restore behavior

When a user restores purchases that are already attached to another user, RevenueCat will decide whether to transfer the purchase to the new user based on the [transfer behavior](https://www.revenuecat.com/docs/projects/restore-behavior) setting.

## Syncing purchases without user interaction

`syncPurchases` is a method we provide in our SDK which allows you to programmatically trigger a restore. This method, much like restorePurchases, reactivates any content that had previously been purchased from the same store account (Apple, Google, or Amazon).

### Considerations

- `syncPurchases` is typically used for [migrating subscriptions](https://www.revenuecat.com/docs/migrating-to-revenuecat/migrating-existing-subscriptions)
- Since this method simulates restoring a purchase, there is a risk of transferring or aliasing an anonymous user

## Restoring Purchases for Consumables and Non-renewing Subscriptions

Consumables and non-renewing subscriptions can only be restored by using an account system with custom [App User IDs](https://www.revenuecat.com/docs/customers/user-ids). This is due to these types of in-app purchases not showing up on the underlying store receipt after the transaction is finished.

By logging in your users with a custom App User ID, RevenueCat can continue to provide transaction details in a user's [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info) for their previous consumable and non-renewing subscription purchases.

## Issues restoring one-time purchases with Google's Billing Client 8 when using anonymous users

Starting on Billing Client 8, Google removed the ability to query consumed one-time purchases through Google's Billing Client library. This means that our SDKs using that version of Billing Client won't be able to restore these purchases. This affects the following versions:

| RevenueCat SDK           | Version using Billing Client 8+ |
| :----------------------- | :------------------------------ |
| purchases-android        | 9.0.0 and up                    |
| react-native-purchases   | 9.0.0 and up                    |
| purchases-flutter        | 9.0.0 and up                    |
| cordova-plugin-purchases | 7.0.0 and up                    |
| purchases-unity          | 8.0.0 and up                    |
| purchases-capacitor      | 11.0.0 and up                   |
| purchases-kmp            | 2.0.0 and up                    |

This can be problematic if both:

- Your app DOESN'T offer an account system (so users can't log in to recover their purchases) and you rely on RevenueCat's anonymous users AND
- Your app has or had at any point in time used one-time products that were consumed. RevenueCat automatically consumes purchases for products that are configured as consumables in the RevenueCat dashboard.

In this scenario, these users will have anonymous user ids that won't be easily recoverable and won't be able to recover their purchases through the Billing Client, so those purchases can not be recovered.

One way to reduce the impact of this issue is by making sure RevenueCat's data is safely backed up in the user's Google account, so it is automatically restored when the user reinstalls the app and/or changes devices. RevenueCat stores data in its own SharedPreferences file. The exact name of that file is available as the constant `RevenueCatBackupAgent.REVENUECAT_PREFS_FILE_NAME`, which you can reference when setting up backups. We recommend you also include your app's default SharedPreferences file.

There are 2 recommended approaches Google offers to perform backups:

- [Auto Backup](https://developer.android.com/identity/data/autobackup)
- [Key-value backups](https://developer.android.com/identity/data/keyvaluebackup).

#### Auto Backup

Auto Backup is enabled by default in your app. This backs up most of your app content, including the RevenueCat SharedPreferences file, up to a 25MB limit, at which point, it stops doing backups. You can configure what you want to backup following [the official documentation](https://developer.android.com/identity/data/autobackup#IncludingFiles).

We recommend adjusting the files you want to back up to make sure you don't go over the limit and making sure the RevenueCat SharedPreferences file is included.

#### Key-Value backups

Please note that enabling this will disable Auto backup and will just back up RevenueCat files!

If you prefer to disable auto-backup and just back up the RevenueCat SharedPreferences file, you may optionally use our provided `RevenueCatBackupAgent` to perform a backup of the relevant files. To do this, you need to add to your app's `AndroidManifest.xml` `<application>` node a property like this:

```xml
android:backupAgent="com.revenuecat.purchases.backup.RevenueCatBackupAgent"
```

### What should you do?

For the majority of apps, Auto Backup is enabled by default and should handle backups for you without doing anything. However, there are some situations where it won't:

- If your app has the potential of having more than 25MB of data over the files that Auto Backup automatically backs up (See [docs](https://developer.android.com/identity/data/autobackup#Files))
- If you have modified the files you would like to backup using Auto Backup and have not included RevenueCat's SharedPreferences file.
- If you have disabled backups

If you are in one of those positions, we recommend you make sure your backup configuration includes the RevenueCat SharedPreferences file without going over the 25MB limit, or, in case you have backups disabled, you may enable auto backup only for this file or just add the `RevenueCatBackupAgent` to your AndroidManifest.xml application, as mentioned above.

Both options are powered by similar Google backup mechanisms and either should work pretty similarly, so we recommend using Auto Backup unless there is a reason you prefer to use a Backup Agent.

### How to test backups

Whether you're using Auto Backup or Key-Value backups, Google provides some documentation on how to test backups and restores [in their documentation](https://developer.android.com/identity/data/testingbackup).

One thing to note, however, is that these backups are not guaranteed to work across all devices and might require factory resets in the target device to use the backup.

## Next Steps

- Make sure all purchases are being [linked to the correct App User ID](https://www.revenuecat.com/docs/customers/user-ids)
- If you're ready to test, start with our guides on [sandbox testing](https://www.revenuecat.com/docs/test-and-launch/debugging)
