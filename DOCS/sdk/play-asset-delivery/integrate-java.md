<!--
SNAPSHOT  DOCS/sdk/play-asset-delivery/integrate-java.md
source:   https://developer.android.com/guide/playcore/asset-delivery/integrate-java
fetched:  2026-11-06 (WebFetch markdown extraction; near-verbatim, flow-diagram image omitted)
version:  com.google.android.play:asset-delivery(-ktx):2.3.0 (as documented on the page)
license:  Android developer docs: CC BY 4.0 (prose), Apache-2.0 (code samples)
-->

# Integrate asset delivery (Kotlin & Java)

## Build for Kotlin and Java

1. Android Gradle plugin `4.0.0` or later.
2. Create a top-level directory for the asset pack. Its name is the pack name, which must start with a letter and contain only letters, numbers and underscores.
3. In the asset pack directory, `build.gradle.kts`:

```kotlin
plugins {
  id("com.android.asset-pack")
}

assetPack {
  packName.set("asset-pack-name") // Directory name for the asset pack
  dynamicDelivery {
    deliveryType.set("[ install-time | fast-follow | on-demand ]")
  }
}
```

4. App module `build.gradle.kts`:

```kotlin
android {
    ...
    assetPacks += listOf(":asset-pack-name", ":asset-pack2-name")
}
```

5. `settings.gradle.kts`:

```kotlin
include(":app")
include(":asset-pack-name")
include(":asset-pack2-name")
```

6. Create `src/main/assets` in the pack directory and place the assets there.
7. Build the AAB. The bundle root then contains `asset-pack-name/manifest/AndroidManifest.xml` and `asset-pack-name/assets/...`.
8. (fast-follow / on-demand) Add the Play Asset Delivery Library:

```kotlin
implementation("com.google.android.play:asset-delivery:2.3.0")
implementation("com.google.android.play:asset-delivery-ktx:2.3.0")
```

> You must run your app as an app bundle rather than as a standalone APK to access the bundled assets.

## Install-time delivery

Use `AssetManager`:

```kotlin
val context: Context = createPackageContext("com.example.app", 0)
val assetManager: AssetManager = context.assets
val stream: InputStream = assetManager.open("asset-name")
```

## Fast-follow and on-demand delivery

### Check status

`getPackLocation()` returns a valid `AssetPackLocation` (pack root ready; assets at `assetsPath()`), or `null` (unknown pack or assets not available).
**Do not rely on cached asset pack locations between app launches.** Check at every launch.

### Get download information

Apps are **required to disclose the size of the download** before fetching.

```kotlin
suspend fun requestPackStates(packNames: List<String>): AssetPackStates
```
```java
Task<AssetPackStates> getPackStates(List<String> packNames)
```

`AssetPackStates#packStates(): Map<String, AssetPackState>`. `AssetPackState` provides
`totalBytesToDownload()`, `bytesDownloaded()`, `transferProgressPercentage()`, `status()`
(an `AssetPackStatus` constant; not installed = `AssetPackStatus.NOT_INSTALLED`) and
`errorCode()` (an `AssetPackErrorCode` constant).

### Install

```kotlin
suspend fun AssetPackManager.requestFetch(packs: List<String>): AssetPackStates
```
```java
Task<AssetPackStates> fetch(List<String> packNames)
```

If the pack is already downloading, the status is returned and no additional download starts.

### Monitor download states

```kotlin
fun registerListener(listener: AssetPackStateUpdatedListener)
fun unregisterListener(listener: AssetPackStateUpdatedListener)
```

Play triggers fast-follow downloads automatically after install or update, but you must check their status at every launch and resume with `fetch()` if they were cancelled or paused.

**Large downloads:** if the download is larger than **200 MB** and the user is not on Wi-Fi, it does not start until the user explicitly consents to mobile data. A paused pack has state `WAITING_FOR_WIFI`. Trigger the consent UI with `showConfirmationDialog(ActivityResultLauncher<IntentSenderRequest>)`. Without that call, the download resumes only when the user is back on Wi-Fi.

**`REQUIRES_USER_CONFIRMATION`:** for example a side-loaded app. `showConfirmationDialog()` causes the app to be updated, after which the assets must be requested again.

Status handling, all `AssetPackStatus` values: `PENDING`, `DOWNLOADING`
(percent = `bytesDownloaded()/totalBytesToDownload()`), `TRANSFERRING`, `COMPLETED`
(ready), `FAILED` (`errorCode()`), `CANCELED`, `WAITING_FOR_WIFI`,
`REQUIRES_USER_CONFIRMATION` (call `showConfirmationDialog` once), `NOT_INSTALLED`,
`UNKNOWN`.

### Access asset packs

After `COMPLETED`:

```kotlin
private fun getAbsoluteAssetPath(assetPack: String, relativeAssetPath: String): String? {
    val assetPackPath: AssetPackLocation =
      assetPackManager.getPackLocation(assetPack)
      ?: return null // asset pack is not ready
    val assetsFolderPath = assetPackPath.assetsPath()
    return FilenameUtils.concat(assetsFolderPath, relativeAssetPath)
}
```

## Other API methods

- `cancel()`: best-effort cancel of an active request.
- `requestRemovePack()` / `removePack()`: schedule removal of a pack.
- `getPackLocations()`: map of every currently downloaded, up-to-date pack and its location.
