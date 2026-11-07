package mba.robin.sanctissimissa

// Android Play commerce (§L.3; L-bookstore-commerce-20261106.md §2.7, §4.1).
// Registered by src-tauri/src/commerce.rs (`register_android_plugin`); the five
// `commerce_*` app commands forward here. Rejections carry a §2.2 CommerceErrorCode
// as the `code` (`invoke.reject(message, code)`).
// see DOCS/sdk/tauri-plugins-ipc/plugin-template-ExamplePlugin-kt.md
// Play Billing supplies the one-tap purchase sheet and Play balance / gift-card
// redemption natively — no app code (see DOCS/sdk/play-billing/play-balance-gift-cards.md).

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.revenuecat.purchases.CustomerInfo
import com.revenuecat.purchases.ProductType
import com.revenuecat.purchases.PurchaseParams
import com.revenuecat.purchases.Purchases
import com.revenuecat.purchases.PurchasesConfiguration
import com.revenuecat.purchases.PurchasesError
import com.revenuecat.purchases.PurchasesErrorCode
import com.revenuecat.purchases.getCustomerInfoWith
import com.revenuecat.purchases.getOfferingsWith
import com.revenuecat.purchases.logInWith
import com.revenuecat.purchases.purchaseWith
import com.revenuecat.purchases.restorePurchasesWith
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import org.json.JSONObject

@InvokeArg
class CommerceConfigureArgs {
  lateinit var apiKey: String
  lateinit var appUserId: String
}

@InvokeArg
class CommerceOffersArgs {
  lateinit var offeringId: String
}

@InvokeArg
class CommercePurchaseArgs {
  lateinit var offeringId: String
  lateinit var packageId: String
}

@TauriPlugin
class CommercePlugin(private val activity: Activity) : Plugin(activity) {

  /** ISO-8601 UTC (minSdk 24 has no java.time). */
  private fun iso(date: Date?): Any {
    if (date == null) return JSONObject.NULL
    val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
    fmt.timeZone = TimeZone.getTimeZone("UTC")
    return fmt.format(date)
  }

  /** PurchasesErrorCode → §2.2 CommerceErrorCode (same names as purchases-js ErrorCode). */
  private fun codeOf(error: PurchasesError): String = when (error.code) {
    PurchasesErrorCode.NetworkError -> "NETWORK"
    PurchasesErrorCode.StoreProblemError -> "STORE_PROBLEM"
    PurchasesErrorCode.PurchaseNotAllowedError -> "PURCHASE_NOT_ALLOWED"
    PurchasesErrorCode.ProductNotAvailableForPurchaseError -> "PRODUCT_UNAVAILABLE"
    PurchasesErrorCode.ProductAlreadyPurchasedError -> "ALREADY_OWNED"
    PurchasesErrorCode.PaymentPendingError -> "PAYMENT_PENDING"
    PurchasesErrorCode.InvalidCredentialsError, PurchasesErrorCode.ConfigurationError -> "CONFIGURATION"
    else -> "UNKNOWN"
  }

  private fun reject(invoke: Invoke, error: PurchasesError) {
    invoke.reject(error.message, codeOf(error))
  }

  /** CI = {appUserId, requestDate, entitlements:[…]} from entitlements.all.
   *  see DOCS/sdk/purchases-android/customer-info.md */
  private fun ci(info: CustomerInfo): JSObject {
    val ents = JSArray()
    for (e in info.entitlements.all.values) {
      val row = JSObject()
      row.put("entitlementId", e.identifier)
      row.put("isActive", e.isActive)
      row.put("grantedAt", iso(e.latestPurchaseDate))
      row.put("expiresAt", iso(e.expirationDate))
      row.put("productId", e.productIdentifier)
      row.put("store", e.store.name)
      ents.put(row)
    }
    val out = JSObject()
    out.put("appUserId", Purchases.sharedInstance.appUserID)
    out.put("requestDate", iso(info.requestDate))
    out.put("entitlements", ents)
    return out
  }

  /** Idempotent: configure once, then logIn to switch user.
   *  see DOCS/sdk/purchases-android/configuring-sdk.md, identifying-customers.md */
  @Command
  fun configure(invoke: Invoke) {
    val args = invoke.parseArgs(CommerceConfigureArgs::class.java)
    val ok = JSObject()
    ok.put("configured", true)
    ok.put("appUserId", args.appUserId)
    if (Purchases.isConfigured) {
      Purchases.sharedInstance.logInWith(
        args.appUserId,
        onError = { error -> reject(invoke, error) },
        onSuccess = { _, _ -> invoke.resolve(ok) },
      )
    } else {
      Purchases.configure(
        PurchasesConfiguration.Builder(activity.applicationContext, args.apiKey)
          .appUserID(args.appUserId)
          .build(),
      )
      invoke.resolve(ok)
    }
  }

  /** Packages of one offering; [] when absent.
   *  see DOCS/sdk/purchases-android/displaying-products.md */
  @Command
  fun offers(invoke: Invoke) {
    val args = invoke.parseArgs(CommerceOffersArgs::class.java)
    Purchases.sharedInstance.getOfferingsWith(
      onError = { error -> reject(invoke, error) },
      onSuccess = { offerings ->
        val pkgs = JSArray()
        for (pkg in offerings[args.offeringId]?.availablePackages ?: emptyList()) {
          val product = pkg.product
          val row = JSObject()
          row.put("packageId", pkg.identifier)
          row.put("productId", product.id)
          row.put("title", product.title)
          row.put("priceText", product.price.formatted)
          row.put("currency", product.price.currencyCode)
          row.put("amountMicros", product.price.amountMicros)
          row.put("productType", if (product.type == ProductType.SUBS) "subscription" else "non_subscription")
          row.put("period", product.period?.iso8601 ?: JSONObject.NULL)
          pkgs.put(row)
        }
        val out = JSObject()
        out.put("offeringId", args.offeringId)
        out.put("packages", pkgs)
        invoke.resolve(out)
      },
    )
  }

  /** Re-fetch offerings, find the package, run the Play Billing sheet.
   *  see DOCS/sdk/purchases-android/making-purchases.md */
  @Command
  fun purchase(invoke: Invoke) {
    val args = invoke.parseArgs(CommercePurchaseArgs::class.java)
    Purchases.sharedInstance.getOfferingsWith(
      onError = { error -> reject(invoke, error) },
      onSuccess = { offerings ->
        val pkg = offerings[args.offeringId]?.availablePackages?.firstOrNull { it.identifier == args.packageId }
        if (pkg == null) {
          invoke.reject("package not found", "PRODUCT_UNAVAILABLE")
        } else {
          Purchases.sharedInstance.purchaseWith(
            PurchaseParams.Builder(activity, pkg).build(),
            onError = { error, userCancelled ->
              val out = JSObject()
              out.put("customerInfo", JSONObject.NULL)
              if (userCancelled || error.code == PurchasesErrorCode.PurchaseCancelledError) {
                out.put("outcome", "cancelled")
                invoke.resolve(out)
              } else if (error.code == PurchasesErrorCode.PaymentPendingError) {
                out.put("outcome", "pending")
                invoke.resolve(out)
              } else {
                reject(invoke, error)
              }
            },
            onSuccess = { _, info ->
              val out = JSObject()
              out.put("outcome", "purchased")
              out.put("customerInfo", ci(info))
              invoke.resolve(out)
            },
          )
        }
      },
    )
  }

  /** see DOCS/sdk/purchases-android/restoring-purchases.md */
  @Command
  fun restore(invoke: Invoke) {
    Purchases.sharedInstance.restorePurchasesWith(
      onError = { error -> reject(invoke, error) },
      onSuccess = { info -> invoke.resolve(ci(info)) },
    )
  }

  /** see DOCS/sdk/purchases-android/customer-info.md */
  @Command
  fun customerInfo(invoke: Invoke) {
    Purchases.sharedInstance.getCustomerInfoWith(
      onError = { error -> reject(invoke, error) },
      onSuccess = { info -> invoke.resolve(ci(info)) },
    )
  }
}
