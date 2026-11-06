<!--
SNAPSHOT  DOCS/sdk/revenuecat-purchases-js/making-purchases.md
source:   https://www.revenuecat.com/docs/getting-started/making-purchases.md
fetched:  2026-11-06 (curl, verbatim)
version:  @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json)
license:  RevenueCat documentation (published as agent-readable Markdown via the `.md` suffix, per https://www.revenuecat.com/docs/llms.txt)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/revenuecat-purchases-js/INDEX.md instead.
-->

---
id: "getting-started/making-purchases"
title: "Making Purchases"
description: "The SDK has a simple method, purchase(package:), that takes a package from the fetched Offering and purchases the underlying product with Apple, Google, or Amazon."
permalink: "/docs/getting-started/making-purchases"
slug: "making-purchases"
version: "current"
original_source: "docs/getting-started/making-purchases.mdx"
---

> **AI agents:** This is the Markdown version of a RevenueCat documentation page. For the complete documentation index, see [llms.txt](https://www.revenuecat.com/docs/llms.txt).

The SDK has a simple method, `purchase(package:)`, that takes a package from the fetched Offering and purchases the underlying product with Apple, Google, or Amazon.

**Swift**

```swift
Purchases.shared.purchase(package: package) { (transaction, customerInfo, error, userCancelled) in
  if customerInfo.entitlements["your_entitlement_id"]?.isActive == true {
    // Unlock that great "pro" content              
  }
}
```

**Obj-C**

```objectivec
[[RCPurchases sharedPurchases] purchasePackage:package withCompletion:^(RCStoreTransaction *transaction, RCCustomerInfo *customerInfo, NSError *error, BOOL cancelled) {
  if (customerInfo.entitlements[@"your_entitlement_id"].isActive) {
    // Unlock that great "pro" content
  }
}];
```

**Kotlin**

```kotlin
Purchases.sharedInstance.purchaseWith(
  PurchaseParams.Builder(this, aPackage).build(),
  onError = { error, userCancelled -> /* No purchase */ },
  onSuccess = { storeTransaction, customerInfo ->
    if (customerInfo.entitlements["my_entitlement_identifier"]?.isActive == true) {
      // Unlock that great "pro" content
    }
  }
)
```

**Kotlin MP**

```kotlin
Purchases.sharedInstance.purchase(
    packageToPurchase = aPackage,
    onError = { error, userCancelled ->
        // No purchase
    },
    onSuccess = { storeTransaction, customerInfo ->
        if (customerInfo.entitlements["my_entitlement_identifier"]?.isActive == true) {
            // Unlock that great "pro" content
        }
    }
)
```

**Java**

```java
Purchases.getSharedInstance().purchase(
	new PurchaseParams.Builder(this, aPackage).build(), 
	new PurchaseCallback() {
    @Override
    public void onCompleted(@NonNull StoreTransaction storeTransaction, @NonNull CustomerInfo customerInfo) {
			if (customerInfo.getEntitlements().get(<my_entitlement_identifier>).isActive()) {
				// Unlock that great "pro" content
			}
		}

		@Override
		public void onError(@NonNull PurchasesError purchasesError, boolean b) {
			// No purchase
		}
	}
);
```

**Flutter**

```dart
// Using Offerings/Packages
try {
  final purchaseParams = PurchaseParams.package(package);
  PurchaseResult result = await Purchases.purchase(purchaseParams);
  if (result.customerInfo.entitlements.all["my_entitlement_identifier"]?.isActive ?? false) {
    // Unlock that great "pro" content
  }
} on PlatformException catch (e) {
  var errorCode = PurchasesErrorHelper.getErrorCode(e);
  if (errorCode != PurchasesErrorCode.purchaseCancelledError) {
    showError(e);
  }
}

// Note: if you are not using offerings/packages to purchase in-app products, you can use products directly.
// For Android in-app products like consumables or non-consumables, fetch them with ProductCategory.nonSubscription.

try {
  final purchaseParams = PurchaseParams.storeProduct(productToBuy);
  PurchaseResult result = await Purchases.purchase(purchaseParams);
  if (result.customerInfo.entitlements.all["my_entitlement_identifier"]?.isActive ?? false) {
    // Unlock that great "pro" content
  }
} on PlatformException catch (e) {
  var errorCode = PurchasesErrorHelper.getErrorCode(e);
  if (errorCode != PurchasesErrorCode.purchaseCancelledError) {
    showError(e);
  }
}
```

**React Native**

```jsx
// Using Offerings/Packages
try {
  const { customerInfo } = await Purchases.purchasePackage(package);
  if (
    typeof customerInfo.entitlements.active["my_entitlement_identifier"] !==
    "undefined"
  ) {
    // Unlock that great "pro" content
  }
} catch (e) {
  if (!e.userCancelled) {
    showError(e);
  }
}

// Note: if you are not using offerings/packages to purchase in-app products, you can use purchaseStoreProduct and getProducts.
// For Android in-app products like consumables or non-consumables, fetch them with Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION.

try {
  const { customerInfo } = await Purchases.purchaseStoreProduct(productToBuy);
  if (
    typeof customerInfo.entitlements.active["my_entitlement_identifier"] !==
    "undefined"
  ) {
    // Unlock that great "pro" content
  }
} catch (e) {
  if (!e.userCancelled) {
    showError(e);
  }
}
```

**Cordova**

```jsx
Purchases.purchasePackage(package, ({ productIdentifier, customerInfo }) => {
    if (typeof customerInfo.entitlements.active.my_entitlement_identifier !== "undefined") {
      // Unlock that great "pro" content
    }
  },
  ({error, userCancelled}) => {
    // Error making purchase
  }
);

// Note: if you are using purchaseProduct to purchase Android in-app products like consumables or non-consumables,
// pass Purchases.PURCHASE_TYPE.INAPP. You can use the package system to avoid this.

Purchases.purchaseProduct("product_id", ({ productIdentifier, customerInfo }) => {
}, ({error, userCancelled}) => {
    // Error making purchase
}, null, Purchases.PURCHASE_TYPE.INAPP);
```

**Capacitor**

```jsx
try {
  const purchaseResult = await Purchases.purchasePackage({ aPackage: packageToBuy });
  if (typeof purchaseResult.customerInfo.entitlements.active['my_entitlement_identifier'] !== "undefined") {
    // Unlock that great "pro" content
  }
} catch (error: any) {
  if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    // Purchase cancelled
  } else {
    // Error making purchase
  }
}

// Note: if you are not using offerings/packages to purchase in-app products, you can use purchaseStoreProduct and getProducts.
// For Android in-app products like consumables or non-consumables, fetch them with PRODUCT_CATEGORY.NON_SUBSCRIPTION.

try {
  const purchaseResult = await Purchases.purchaseStoreProduct({
    product: productToBuy
  });
  if (typeof purchaseResult.customerInfo.entitlements.active['my_entitlement_identifier'] !== "undefined") {
    // Unlock that great "pro" content
  }
} catch (error: any) {
  if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    // Purchase cancelled
  } else {
    // Error making purchase
  }
}
```

**Unity**

```csharp
Purchases purchases = GetComponent<Purchases>();
purchases.PurchasePackage(package, (purchaseResult) =>
{
  if (purchaseResult.CustomerInfo.Entitlements.Active.ContainsKey("my_entitlement_identifier")) {
    // Unlock that great "pro" content
  }
});
```

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

**Vega**

```tsx
try {
    const {customerInfo} = await Purchases.getSharedInstance().purchase({
        rcPackage: pkg,
    });
    if (Object.keys(customerInfo.entitlements.active).includes("pro")) {
        // Unlock that great "pro" content
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

The `purchase(package:)` completion block will contain an updated [CustomerInfo](https://www.revenuecat.com/docs/customers/customer-info) object if successful, along with some details about the transaction.

If the `error` object is present, then the purchase failed. See our guide on [Error Handling](https://www.revenuecat.com/docs/test-and-launch/errors) for the specific error types.

The `userCancelled` boolean is a helper for handling user cancellation errors. There will still be an error object if the user cancels, but you can optionally check the boolean instead of unwrapping the error completely.

:::info[RevenueCat automatically finishes/acknowledges/consumes transactions]
Transactions (new and previous transactions that are synced) will be automatically completed (finished on iOS, acknowledged and consumed in Android), and will be made available through the RevenueCat SDK / Dashboard / ETL Exports.

If you are migrating an existing app to RevenueCat and want to continue using your own in-app purchase logic, you can tell the SDK that [your app is completing transactions](https://www.revenuecat.com/docs/migrating-to-revenuecat/sdk-or-not/finishing-transactions) if you don't wish to have transactions completed automatically, but you will have to make sure that you complete them yourself.
:::

## Next Steps

- Don't forget to provide some way for customers to [restore their purchases](https://www.revenuecat.com/docs/getting-started/restoring-purchases)
- With purchases coming through, make sure they're [linked to the correct app user ID](https://www.revenuecat.com/docs/customers/user-ids)
- If you're ready to test, start with our guides on [sandbox testing](https://www.revenuecat.com/docs/test-and-launch/sandbox)
