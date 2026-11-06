# §L partial — Bookstore commerce, access and the Catalogue / My Books bindings (2026-11-06)

Binding partial of ARCHITECTURE §L (L.1 Catalogue/My Books, L.2, L.3). Architecture
documentation only. Operator resolutions R1–R5 (2026-11-06) govern; where §L prose and
this partial differ, this partial is the more exact statement of the same decisions.
Sibling partials named below: `L-content-modules-search-20261106.md` (BA.1/2/10/11/14/15),
`L-native-embed-engine-20261106.md` (BA.12/13), `L-audiobook-20261106.md` (BA.7/8),
`L-bookstore-ui-20261106.md` (LibraryReader, reader export, TTS dock).

## 1. Scope

**Resolves:** #8 (L.8 rows for this domain, full columns), #9 (closed by R2, recorded in §5),
#14 (rights gate, Catena RightsEvidence, NucleusSourceManifest), #21 (offline entitlement
cache), #22 commerce parts (subscription SKUs enumerated; every `#drawer-…` id; closure
markers on AccessState, PurchaseOffer.kind, channel adapters, error codes), #23 for the
bookstore and library exports (every bound selector, Export-source per row, new ids).

**§2 entities resolved:** sidecar keys `bookstore.tab`, `library.progress.<editionId>`;
`entitlements.cache.v1`; `VITE_REVENUECAT_API_KEY`, `VITE_REVENUECAT_ANDROID_API_KEY` (.env
template, provisioning, CI secret names); `@revenuecat/purchases-js`, `purchases-android`;
commerce ids in `src/core/entitlements/ids.ts` (`reference_<editionId>`, `study_library_all`,
both subscription SKUs, offering `bookstore`, product pattern, `RESERVED_FREE_EDITION_IDS`
location); `useEntitlement`; `LibraryViewProps`; AccessState closure (with `expiresAt`);
Tauri wiring (lib.rs handlers, capabilities, plugin builder, Kotlin `@TauriPlugin`/`@Command`
+ JSON); Catena RightsEvidence + NucleusSourceManifest; Bookstore and Library selectors;
the concept-card id.

**Not here:** module bytes, `attachModule`, `ModuleInstaller`, `modules.json`, `chapterKey`
grammar (content-modules partial); reader/dock selectors (bookstore-ui / audiobook partials).

**Code baseline (CodeGraph, 2026-11-06):** `src/core/entitlements/` and `src/ui/library/` do
not exist. `RESERVED_FREE_EDITION_IDS` = `['haydock-1883-en','haydock-1859-en']`
(`src/core/library/catalogue.ts:28`); `canPublishEdition(edition, territory)`
(`catalogue.ts:242`, rights check `rightsOk` `:224`); `RightsEvidence`/`EditionRecord`
(`src/core/library/types.ts:13`, `:30`). `View` union `src/App.tsx:45`, `NAV` `:47`,
`RAIL_VIEWS` `:79`, account route `:727` (`SignInView` when signed out), `onOpenKey` `:419`.
`useAccount()` `src/core/account/useAccount.ts:173` (`AccountState.user` `:69`).
`SidecarDb.getSetting/setSetting/persist` `src/core/accompaniment/store.ts:435/440/221`.
`isTauri()` `src/core/data/loadCorpus.ts:13`. `lib.rs` `invoke_handler` `:75-93`.
`capabilities/default.json` = `["core:default"]` only, and the existing `inference_*` app
commands run under it. `.env.example` declares `VITE_REVENUECAT_API_KEY` commented "Absent ⇒
everything ungated". `SettingsView.tsx:74,196-221` has a dead "Restore purchases" button and
copy "anonymous appUserId". `SettingsView.tsx:236` labels every commentary source "(included)".

## 2. Formats and closed sets

### 2.1 `src/core/entitlements/ids.ts` (Closed set, Phase L)

```ts
export const COMMERCE_NAMESPACE = 'mba.robin.sanctissimissa';
export const OFFERING_BOOKSTORE = 'bookstore';                 // RC offering ofrngbbf1e4e25b
export const ENTITLEMENT_SUBSCRIPTION = 'study_library_all';  // RC entl49003aa9c5
/** Closed set, Phase L — from content/library/commerce.seed.json products[kind=subscription]. */
export const SUBSCRIPTION_PRODUCT_IDS = [
  'mba.robin.sanctissimissa.sub.study_library_all_monthly',   // P1M, RC prod4508cf8d27
  'mba.robin.sanctissimissa.sub.study_library_all_annual',    // P1Y, RC prod25cabf4437
] as const;
/** Closed set, Phase L — the only edition sold in this release. */
export const SELLABLE_EDITION_IDS = ['catena-aurea-en'] as const;
export const editionEntitlementId = (editionId: string) => `reference_${editionId}`;
export const editionProductId = (editionId: string) => `${COMMERCE_NAMESPACE}.iap.book.${editionId}`;
/** Play subscription ids arrive as `<productId>:<basePlanId>`; compare the part before ':'. */
export const baseProductId = (storeProductId: string) => storeProductId.split(':')[0];
export { RESERVED_FREE_EDITION_IDS, isReservedFreeEdition } from '../library/catalogue.ts';
/** Closed set, Phase L — commentary source id → edition id. */
export const COMMENTARY_SOURCE_EDITION = { haydock: 'haydock-1883-en', 'catena-aurea': 'catena-aurea-en' } as const;
export const WORLDWIDE_TERRITORY = '*';
export const SUBSCRIPTION_OFFLINE_GRACE_MS = 259_200_000;     // 72 h
export const SETTING_BOOKSTORE_TAB = 'bookstore.tab';
export const SETTING_ENTITLEMENT_CACHE = 'entitlements.cache.v1';
export const libraryProgressKey = (editionId: string) => `library.progress.${editionId}`;
```
Excluded in Phase L (recorded, never offered): the 7 `iap.bundle.*` products (incl.
`bundle.scripture-study`, which grants `reference_catena-aurea-en`), the 8 `iap.book.collection-*`
products, `consumable.roche_credits_*`, offering `companion_unlock`.

### 2.2 Types — `src/core/entitlements/types.ts`

```ts
/** Closed set, Phase L. */ export type AccessKind = 'free' | 'owned' | 'subscription' | 'locked' | 'unavailable';
export interface AccessState { state: AccessKind; expiresAt: string | null; source: 'live' | 'cache' | 'none' }
/** Closed set, Phase L. */ export type CommerceChannel = 'web' | 'play';
/** Closed set, Phase L. */ export type OfferKind = 'lifetime' | 'subscription';
export interface PurchaseOffer { id: string; title: string; priceText: string; currency: string; kind: OfferKind; terms: string; productId: string }
export interface StorePackage { offeringId: string; packageId: string; productId: string; title: string;
  priceText: string; currency: string; amountMicros: number; productType: 'non_subscription' | 'subscription'; period: string | null }
export interface EntitlementGrant { entitlementId: string; isActive: boolean; grantedAt: string; expiresAt: string | null; productId: string; store: string }
/** Closed set, Phase L. */ export type PurchaseOutcome = 'purchased' | 'cancelled' | 'pending';
/** Closed set, Phase L. */ export type CommerceErrorCode = 'NOT_CONFIGURED' | 'NETWORK' | 'STORE_PROBLEM'
  | 'PURCHASE_NOT_ALLOWED' | 'PRODUCT_UNAVAILABLE' | 'ALREADY_OWNED' | 'PAYMENT_PENDING' | 'CONFIGURATION' | 'UNKNOWN';
export class CommerceError extends Error { code: CommerceErrorCode }   // message = SDK message, never shown raw
export interface CommerceAdapter {                // Closed set of implementations, Phase L: Web, Play
  readonly channel: CommerceChannel;
  configure(appUserId: string): Promise<void>;   // idempotent; switches user when already configured
  packages(offeringId: string): Promise<StorePackage[]>;   // [] when the offering is absent
  purchase(pkg: StorePackage): Promise<{ outcome: PurchaseOutcome; grants: EntitlementGrant[] | null }>;
  customerInfo(): Promise<EntitlementGrant[]>;   // authoritative full set (active and inactive)
  restore(): Promise<EntitlementGrant[]>;
}
```
`PurchaseOffer.id` = `<offeringId>/<packageId>`. Offer titles/terms (Closed set, Phase L):

| productId (base) | kind | title (`.tier-title`) | terms (`.tier-desc`) |
|---|---|---|---|
| `editionProductId(id)` | lifetime | `Own this edition` | `One-time purchase · yours to keep` |
| `…sub.study_library_all_monthly` | subscription | `All-Library Access — Monthly` | `Renews monthly · cancel anytime in your store account` |
| `…sub.study_library_all_annual` | subscription | `All-Library Access — Annual` | `Renews yearly · cancel anytime in your store account` |

`offers(editionId)` = rows present in offering `bookstore`, matched by `baseProductId`, in table
order; subscription rows only when the edition passes the rights gate (§2.5). `priceText`
is always the store's localized string; nothing in the repo is ever rendered as a price.

SDK error → `CommerceErrorCode` (purchases-js `ErrorCode` / purchases-android
`PurchasesErrorCode`, same names): `NetworkError`→NETWORK; `StoreProblemError`→STORE_PROBLEM;
`PurchaseNotAllowedError`→PURCHASE_NOT_ALLOWED; `ProductNotAvailableForPurchaseError`→
PRODUCT_UNAVAILABLE; `ProductAlreadyPurchasedError`→ALREADY_OWNED; `PaymentPendingError`→
outcome `pending` (purchase) or PAYMENT_PENDING (elsewhere); `InvalidCredentialsError`,
`ConfigurationError`→CONFIGURATION; `UserCancelledError` / `PurchaseCancelledError`→ outcome
`cancelled`; anything else → UNKNOWN. No key → NOT_CONFIGURED (adapter never constructed).

User-facing messages in `#purchase-status` (Closed set, Phase L): NETWORK `No connection — try
again when you're online.` · STORE_PROBLEM `The store had a problem completing this. Nothing was
charged; try again.` · PURCHASE_NOT_ALLOWED `Purchases are not allowed on this device or
account.` · PRODUCT_UNAVAILABLE `This edition isn't available in your store right now.` ·
ALREADY_OWNED `You already own this — restoring your purchase.` (then `restore()`) · pending
`Payment pending — access unlocks when the store confirms it.` · CONFIGURATION/NOT_CONFIGURED
`Purchases are unavailable in this build.` · UNKNOWN `Something went wrong; nothing was
unlocked. Try again.` · cancelled: no message.

### 2.3 `entitlements.cache.v1` (sidecar setting, JSON; finding #21)

```json
{ "schemaVersion": 1,
  "users": { "<firebase uid>": { "verifiedAt": "2026-11-06T12:00:00.000Z",
    "grants": [ { "entitlementId": "reference_catena-aurea-en", "grantedAt": "<ISO>",
                  "expiresAt": null, "verifiedAt": "<ISO>", "source": "web" } ] } } }
```
`source` Closed set, Phase L: `'web' | 'play'`. Rules: (1) written after every successful
`customerInfo`/`restore`/`purchase` for the current uid: active grants upserted, grants absent
or `isActive:false` in that response removed **for that uid only** (the only revocation path);
(2) a network, SDK, configuration or missing-key failure never changes the cache; (3) a cached
grant is honoured when `expiresAt === null` or `now < Date.parse(expiresAt) + SUBSCRIPTION_OFFLINE_GRACE_MS`;
(4) other users' entries are never removed; (5) malformed JSON is preserved under
`entitlements.cache.v1.corrupt.<ISO>` and an empty cache starts (nothing silently dropped).

### 2.4 Other sidecar keys

| Key | Value | Writer / reader |
|---|---|---|
| `bookstore.tab` | `'catalogue'` \| `'my-books'` (Closed set, Phase L); default `catalogue` | `BookstoreView` |
| `library.progress.<editionId>` | `{"schemaVersion":1,"chapterKey":"<L-content-modules chapterKey>","updatedAt":"<ISO>"}` | `LibraryReader` writes on chapter open; `MyBooksPanel` `.continue-card` and Read action read |

### 2.5 Rights gate (R4, decision 21)

`accessFor` is the pure function `computeAccess` in `src/core/entitlements/access.ts`:
1. `isReservedFreeEdition(id)` → `free` (expiresAt null).
2. honoured grant `reference_<id>` → `owned` (lifetime ownership survives every rights change).
3. `edition = editions.get(id)`; if `edition && canPublishEdition(edition, currentTerritory())`:
   honoured `study_library_all` → `subscription` (expiresAt = grant.expiresAt);
   else if `configured && (!signedIn || offers === null || offers.length > 0)` → `locked`.
4. otherwise `unavailable`.

`currentTerritory()` (`src/core/entitlements/territory.ts`): region subtag of
`Intl.DateTimeFormat().resolvedOptions().locale`, upper-cased if `/^[A-Z]{2}$/`, else `'ZZ'`.
`canPublishEdition` gains one rule (≤4 added lines, `catalogue.ts:230` and `:251`): a
`territories` array containing `WORLDWIDE_TERRITORY` (`'*'`) matches every territory; `'*'` is
the only wildcard token (Closed set, Phase L).

**Authored seed** `content/library/rights.seed.json` (committed, hand-written):
```json
{ "schemaVersion": 1, "editions": [ {
  "edition": { "id": "catena-aurea-en", "workId": "work-c003",
    "title": "Catena Aurea, commentary on the four Gospels", "author": "Thomas Aquinas",
    "category": "Scripture and commentary", "revision": 1, "publication": "ready", "languages": ["en"],
    "rights": [ { "assetId": "catena-aurea-en/text", "kind": "text",
      "sourceUrl": "https://github.com/tj06man/catena-aurea-project/tree/d3829bbb8b31b72796073d8e8218d36179b62720",
      "sourceEdition": "Catena Aurea: Commentary on the Four Gospels, collected out of the works of the Fathers, by S. Thomas Aquinas. Oxford: John Henry Parker, 1841–1845; ed. John Henry Newman",
      "translator": "Oxford translators (Library of the Fathers), ed. John Henry Newman", "publicationYear": 1841,
      "basis": "Public domain: English translation published 1841–1845 (pre-1900); Aquinas d. 1274, Newman d. 1890",
      "territories": ["*"], "commercial": true, "redistribution": true,
      "attribution": "St. Thomas Aquinas, Catena Aurea, Oxford translation ed. J. H. Newman (J. H. Parker, 1841–1845)",
      "reviewedBy": "Robin L. M. Cheung, MBA", "reviewedAt": "2026-11-06" } ],
    "territories": ["*"], "free": false, "entitlementId": "reference_catena-aurea-en", "previewBlockIds": [] },
  "nucleus": { "sourceId": "catena-aurea", "editionId": "catena-aurea-en", "work": "Catena Aurea",
    "workDate": "c. 1262–1264", "editionTitle": "Catena Aurea (Oxford translation)", "editionDate": "1841–1845",
    "translationDate": "1841–1845", "languages": ["en"], "translatorEditor": "ed. John Henry Newman",
    "publicationPlace": "Oxford", "publisher": "John Henry Parker",
    "rightsBasis": "Public domain (pre-1900 publication)", "authorityKind": "patristics",
    "provenanceUrl": "https://github.com/tj06man/catena-aurea-project/tree/d3829bbb8b31b72796073d8e8218d36179b62720",
    "vendoredPath": "VENDORED/catena-aurea/PROVENANCE.md" } } ] }
```
**Generated** by `scripts/build-modules.mjs` (BA.1) from the seed and the emitted module, both
committed, never hand-edited: `content/library/editions.json` `{schemaVersion:1, editions:
EditionRecord[]}` = `edition` + `packagePath` (module file name) + `packageSha256` + every
`rights[].sha256` = sha256 of the distributed module file; `content/library/nucleus-sources.json`
`{schemaVersion:1, sources: NucleusSourceManifest[]}` = `nucleus` + `checksumSha256` (same digest).
Until BA.1 has run, `editions.json` is absent, `loadEditions()` returns an empty index and Catena
is `unavailable` — an honest state, no placeholder value exists anywhere.
`NucleusSourceManifest` type: `src/core/library/nucleus.ts` (fields exactly the `nucleus` keys +
`checksumSha256`; `authorityKind` uses decision 21's closed set). The content-modules partial's
attach step adds a module id to the nucleus source list only when a manifest with
`checksumSha256` equal to the installed module digest exists.

Seed edits in `content/library/catalogue.seed.json` (validator-legal): C002 `editionId:
"haydock-1883-en"` (VENDORED/haydock/PROVENANCE.md substantiates the 1883 edition); C003
`publication:"ready"`, `editionId:"catena-aurea-en"`, `productId:
"mba.robin.sanctissimissa.iap.book.catena-aurea-en"`; `price` stays null everywhere.

### 2.6 Environment, dependencies, CI

`.env.example` — replace the line pair `# Entitlements (RevenueCat public key). Absent ⇒
everything ungated.` / `# VITE_REVENUECAT_API_KEY=` with:
```
# Commerce (§L.3). RevenueCat PUBLIC SDK keys — designed to ship in client bundles.
# Operator hosts export SAM_REVENUECAT_* (.bashrc / CI secrets); provision-secrets.mjs
# writes them into gitignored .env.local. A clone may set the VITE_ names directly.
# Absent ⇒ paid editions show "Purchases unavailable"; owned editions stay readable
# from entitlements.cache.v1; free editions are unaffected.
# SAM_REVENUECAT_WEB_API_KEY=rcb_...       → VITE_REVENUECAT_API_KEY (web, PWA, Linux, Windows)
# SAM_REVENUECAT_ANDROID_API_KEY=goog_...  → VITE_REVENUECAT_ANDROID_API_KEY (Android / Play)
```
`scripts/provision-secrets.mjs` `MATERIALIZATIONS` gains two entries, new `mode:'public-key'`:
`{pointer:'SAM_REVENUECAT_WEB_API_KEY', target:.env.local, envKey:'VITE_REVENUECAT_API_KEY',
pattern:/^(rcb_|test_)[A-Za-z0-9_]{8,}$/}` and `{pointer:'SAM_REVENUECAT_ANDROID_API_KEY',
envKey:'VITE_REVENUECAT_ANDROID_API_KEY', pattern:/^(goog_|test_)[A-Za-z0-9_]{8,}$/}`. Value form
only; set → validated and written (value never logged); unset → existing line kept, warning
`commerce unconfigured`; pattern mismatch → FATAL. Reached by `release-state.mjs:464/529/534`.
CI (`.github/workflows/build-all-platforms.yml`): repository secrets **`SAM_REVENUECAT_WEB_API_KEY`**
and **`SAM_REVENUECAT_ANDROID_API_KEY`**; every build job runs `node scripts/provision-secrets.mjs`
with both as `env:` before its build step. Config truth: `isCommerceConfigured(key)` = non-empty
and not starting with `$` (same rule as `buildIdentity`, `src/core/chat/resolve.ts:137`).

Dependencies: `package.json` `"@revenuecat/purchases-js": "1.74.0"` (exact; MIT; imported only by
dynamic `import()` inside `web.ts`). `src-tauri/gen/android/app/build.gradle.kts` dependencies
(`:87`) add `implementation("com.revenuecat.purchases:purchases:11.2.0")` (brings Play Billing and
the BILLING permission by manifest merge). `proguard-rules.pro` adds
`-keep class mba.robin.sanctissimissa.CommercePlugin { *; }` and
`-keep class mba.robin.sanctissimissa.Commerce*Args { *; }` (release is minified, build.gradle.kts:61).

### 2.7 Tauri wiring (BA.4)

`src-tauri/src/commerce.rs` (new, <150 lines):
```rust
pub struct Commerce(pub tauri::plugin::PluginHandle<tauri::Wry>);   // managed state, Android only
pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
  tauri::plugin::Builder::new("commerce").setup(|app, api| {
    #[cfg(target_os = "android")]
    { let h = api.register_android_plugin("mba.robin.sanctissimissa", "CommercePlugin")?; app.manage(Commerce(h)); }
    Ok(()) }).build()
}
#[tauri::command] pub async fn commerce_configure(app: tauri::AppHandle, api_key: String, app_user_id: String) -> Result<serde_json::Value, String>
#[tauri::command] pub async fn commerce_offers(app: tauri::AppHandle, offering_id: String) -> Result<serde_json::Value, String>
#[tauri::command] pub async fn commerce_purchase(app: tauri::AppHandle, offering_id: String, package_id: String) -> Result<serde_json::Value, String>
#[tauri::command] pub async fn commerce_restore(app: tauri::AppHandle) -> Result<serde_json::Value, String>
#[tauri::command] pub async fn commerce_customer_info(app: tauri::AppHandle) -> Result<serde_json::Value, String>
```
Android body: clone the handle, `tauri::async_runtime::spawn_blocking(move || h.run_mobile_plugin::<serde_json::Value>("<cmd>", json!({...camelCase args})))`;
`PluginInvokeError::InvokeRejected(e)` → `Err(format!("{}: {}", e.code.unwrap_or("UNKNOWN"), e.message))`.
Non-Android body: `Err("NOT_CONFIGURED: commerce-android-only".into())`. Kotlin command names:
`configure`, `offers`, `purchase`, `restore`, `customerInfo`. `lib.rs`: `mod commerce;`,
`.plugin(commerce::init())` before `.invoke_handler`, and five handler entries
`commerce::commerce_configure, commerce::commerce_offers, commerce::commerce_purchase,
commerce::commerce_restore, commerce::commerce_customer_info` (≤8 added lines).
**Capabilities: unchanged** (`["core:default"]`). These are application commands, allowed
without capability entries (build.rs is plain `tauri_build::build()`, no app manifest; the
`inference_*`/`model_*` commands already run this way); the `commerce` plugin defines no
commands of its own, so it has no permission ids.

`CommercePlugin.kt` (`src-tauri/gen/android/app/src/main/java/mba/robin/sanctissimissa/`):
```kotlin
@InvokeArg class CommerceConfigureArgs { lateinit var apiKey: String; lateinit var appUserId: String }
@InvokeArg class CommerceOffersArgs { lateinit var offeringId: String }
@InvokeArg class CommercePurchaseArgs { lateinit var offeringId: String; lateinit var packageId: String }
@TauriPlugin class CommercePlugin(private val activity: Activity) : Plugin(activity) {
  @Command fun configure(invoke: Invoke)     // isConfigured ? logIn(appUserId) : configure(PurchasesConfiguration.Builder(appCtx, apiKey).appUserID(appUserId).build())
  @Command fun offers(invoke: Invoke)        // getOfferingsWith; offerings[offeringId]?.availablePackages
  @Command fun purchase(invoke: Invoke)      // re-fetch offerings, find package, purchaseWith(PurchaseParams.Builder(activity, pkg).build())
  @Command fun restore(invoke: Invoke)       // restorePurchasesWith
  @Command fun customerInfo(invoke: Invoke)  // getCustomerInfoWith
}
```
Resolve JSON (exact keys): configure `{"configured":true,"appUserId":"…"}`; offers
`{"offeringId":"…","packages":[{"packageId","productId","title","priceText","currency","amountMicros","productType":"subscription"|"non_subscription","period":"P1M"|null}]}`
(`product.id`, `title`, `price.formatted`, `price.currencyCode`, `price.amountMicros`,
`type==SUBS`, `period?.iso8601`); purchase `{"outcome":"purchased"|"cancelled"|"pending","customerInfo":CI|null}`;
restore and customerInfo `CI` = `{"appUserId","requestDate","entitlements":[{"entitlementId","isActive","grantedAt","expiresAt"|null,"productId","store"}]}`
from `entitlements.all` (ISO-8601 UTC). Rejections: `invoke.reject(message, code)` with a §2.2
`CommerceErrorCode`; a missing package → `PRODUCT_UNAVAILABLE`.

## 3. Flows

**F1 Boot and identity.** `getCommerce(sidecar)` (`service.ts`, app-lifetime singleton):
`commerceChannel()` = `isTauri() && /Android/i.test(navigator.userAgent) ? 'play' : 'web'`; key
for that channel; adapter = `WebPurchaseAdapter`/`PlayPurchaseAdapter` or `null` when
unconfigured. `AppShell` effect on `account.user?.uid` → `entitlements.setUser(uid|null)`.
`setUser(uid)`: `adapter.configure(uid)` (web: `Purchases.configure({apiKey, appUserId: uid})`
first time, `changeUser(uid)` after), then `refresh()`. `setUser(null)`: no SDK call; live
grants cleared; cache untouched; paid editions read as signed-out.

**F2 Refresh** (sign-in, app start signed in, after purchase/restore): `customerInfo()` and
`packages('bookstore')` in parallel. Success → cache rule 1, offer index rebuilt, `source:'live'`.
Failure → keep previous live state if any, else cache (`source:'cache'`), offers stay `null`.
Listeners notified once.

**F3 Purchase** (drawer, locked, signed in): select `.tier-card` → `#primary-action-btn`
`Buy · <priceText>` → `#proposal-modal` (confirmation) → `Continue to payment` →
`purchases.purchase(offerId)`: web `purchases.purchase({rcPackage, customerEmail: user.email ?? undefined})`
(RevenueCat Web Billing / Stripe sheet); play `commerce_purchase` (Play Billing sheet, gift-card
balance native). `purchased` → `entitlements.refresh()` → content-modules
`ModuleInstaller.install(editionId)` → `CorpusDb.attachModule(editionId, bytes)` → drawer badge
`Owned`, button `Read`, no reload. `pending` / error → §2.2 message; nothing unlocked.

**F4 Restore.** Settings › Account/Billing "Restore purchases": web `customerInfo()` (RC state is
server-side per uid); play `restorePurchasesWith`. Then F2 cache write and attach of any newly
entitled installed module.

**F5 Offline / RC down / key missing (#21).** `accessFor` reads honoured cached grants;
installed entitled modules attach at startup; only an explicit verified "not entitled" revokes.

## 4. Entity table

Abbrev: **B** = `LIBS/UI/STITCH/sanctissimissa-library-20260913/bookstore.html`; **Lb** =
`…/library.html`; **K** = `LIBS/UI/STITCH/sanctissimissa-bookstore-20261106/original/library-tts-karaoke-studio.html`.
SDK = `DOCS/sdk/` (TC7). "Gauntlet" = DOCS/TEST_RUBRIC.md on stamped artifacts (web, Linux,
Windows, Android). Acceptance greps run at repo root and change nothing.

### 4.1 Core and wiring

| Entity | Type | File:line (target) | Signature/fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| commerce ids | const module | `src/core/entitlements/ids.ts:1` (new, <60 lines) | §2.1 | Closed set, Phase L (SKUs, sellable ids, source map, tab values) | L.2/L.3, R2 | BA.3 | `grep -c 'sub.study_library_all_' src/core/entitlements/ids.ts` = 2; no other file under `src/` contains `iap.book.` or `sub.study_library` literals | revenuecat-purchases-js |
| `AccessKind`, `AccessState` | types | `src/core/entitlements/types.ts:1` (new) | §2.2 (`expiresAt` included) | Closed set, Phase L | L.2, LS accessFor | BA.3 | type union has exactly 5 literals (`grep`) | — |
| `PurchaseOffer`, `OfferKind`, `StorePackage`, `EntitlementGrant`, `PurchaseOutcome`, `CommerceErrorCode`, `CommerceError`, `CommerceAdapter` | types | `src/core/entitlements/types.ts` | §2.2 | Closed set, Phase L | L.3 | BA.3 | each name defined once under `src/` | revenuecat-purchases-js; purchases-android |
| `computeAccess` | pure fn | `src/core/entitlements/access.ts:1` (new) | `(i:{editionId,edition:EditionRecord\|null,grants:EntitlementGrant[],source,signedIn,configured,offers:PurchaseOffer[]\|null,territory,now:number}):AccessState` | rules §2.5 | L.2, R4, I3 | BA.3 | Gauntlet L.7-2, L.7-8, L.7-13 | — |
| `currentTerritory` | fn | `src/core/entitlements/territory.ts:1` (new) | `():string` | `'ZZ'` fallback | R4 | BA.3 | DevTools `Intl` locale `en-CA` → drawer still `Available` (worldwide) | — |
| `canPublishEdition` `'*'` rule | edit | `src/core/library/catalogue.ts:230,251` | `includes(t) \|\| includes('*')` | only wildcard token | R4 | BA.3 | `grep -c "'\*'" src/core/library/catalogue.ts` ≥ 2 | — |
| `loadEditions`, `EditionIndex` | fn/iface | `src/core/library/editions.ts:1` (new) | `():EditionIndex`; `{get(id):EditionRecord\|null; all():EditionRecord[]}`; static JSON import of `content/library/editions.json`, empty when absent | — | R4 | BA.3 | before BA.1, Catena drawer shows `Edition review` | — |
| rights seed | data | `content/library/rights.seed.json` (new) | §2.5 | Closed set, Phase L: `catena-aurea-en` | R4, decision 21 | BA.3 | `node -e` prints `reviewedBy` = `Robin L. M. Cheung, MBA`, `territories` = `["*"]` | — |
| `editions.json`, `nucleus-sources.json` | generated data | `content/library/` | §2.5 | Phase L: one entry each | R4, R5, decision 21 | BA.1 (writer) | each `sha256` equals `sha256sum` of the staged module | — |
| `NucleusSourceManifest` | type | `src/core/library/nucleus.ts:1` (new) | §2.5 `nucleus` keys + `checksumSha256` | `authorityKind` per decision 21 | decision 21, #14 | BA.3 (type), BA.2 (consumer) | Catena joins nucleus groups only when attached (Gauntlet L.7-4) | — |
| catalogue seed edits | data | `content/library/catalogue.seed.json` C002, C003 | §2.5 | — | L.2 | BA.3 | `validateCatalogue` accepts the seed at app start (catalogue renders 61 cards) | — |
| `EntitlementCache` | class | `src/core/entitlements/cache.ts:1` (new) | `constructor(store:{getSetting,setSetting,persist})`; `read(uid):EntitlementGrant[]`; `writeVerified(uid,grants,source):Promise<void>` | rules §2.3 | #21 | BA.3 | Gauntlet L.7-12 | — |
| `EntitlementController` | class | `src/core/entitlements/index.ts:1` (new) | `constructor({adapter:CommerceAdapter\|null, cache, editions, territory:()=>string})`; `setUser(uid:string\|null):Promise<void>`; `refresh():Promise<'verified'\|'cached'\|'signed-out'\|'unconfigured'>`; `has(entitlementId):boolean`; `accessFor(editionId):AccessState` (memoized per version); `offersFor(editionId):PurchaseOffer[]\|null`; `subscribe(l:()=>void):()=>void`; `readonly signedIn, configured, version` | F1/F2 | L.3, #21 | BA.3 | Gauntlet L.7-3 (flip to `Owned` without reload) | revenuecat-purchases-js |
| `useEntitlement` | hook | `src/core/entitlements/useEntitlement.ts:1` (new) | `(editionId:string):AccessState` via `useSyncExternalStore(c.subscribe, () => c.accessFor(editionId))` | — | §2 list | BA.3 | drawer and card badge change together after refresh | — |
| `PurchaseController` | class | `src/core/entitlements/purchases.ts:1` (new) | `offers(editionId):Promise<PurchaseOffer[]>`; `purchase(offerId):Promise<PurchaseOutcome>`; `restore():Promise<void>`; throws `CommerceError` | — | L.3 | BA.3 | Gauntlet L.7-3, L.7-7 | revenuecat-purchases-js; purchases-android |
| `commerceChannel`, `isCommerceConfigured` | fn | `src/core/entitlements/channel.ts:1` (new) | `():CommerceChannel`; `(key:unknown):boolean` | channel closed set | L.3 | BA.3 | Android build shows Play sheet; Linux build shows Web Billing | — |
| `getCommerce` | fn | `src/core/entitlements/service.ts:1` (new) | `(sidecar:SidecarDb):{entitlements,purchases,channel}` singleton | — | L.3 | BA.3 | one RC configure per uid in diagnostics | — |
| `WebPurchaseAdapter` | class | `src/core/entitlements/web.ts:1` (new) | `CommerceAdapter`; `@revenuecat/purchases-js` 1.74.0 `configure/changeUser/getOfferings({offeringIdentifier:'bookstore'})/purchase/getCustomerInfo`; `restore()` = `customerInfo()` | adapter set | L.3 | BA.3 | Gauntlet L.7-3, L.7-9 | revenuecat-purchases-js |
| `PlayPurchaseAdapter` | class | `src/core/entitlements/play.ts:1` (new) | `CommerceAdapter` over `invoke('commerce_*')`; parses `"<CODE>: msg"` rejections | adapter set | L.3 | BA.4 | Gauntlet L.7-7 | tauri-plugins-ipc; purchases-android; play-billing |
| `commerce_configure/offers/purchase/restore/customer_info`, `Commerce`, `init` | Rust | `src-tauri/src/commerce.rs:1` (new) | §2.7 | 5 commands, Phase L | L.3 | BA.4 | `grep -c 'commerce::commerce_' src-tauri/src/lib.rs` = 5 | tauri-plugins-ipc |
| lib.rs wiring | edit | `src-tauri/src/lib.rs:69-93` | `mod commerce;` `.plugin(commerce::init())` + 5 handlers | — | L.3 | BA.4 | desktop invoke of `commerce_offers` rejects `NOT_CONFIGURED: commerce-android-only` | tauri-plugins-ipc |
| capabilities | none | `src-tauri/capabilities/default.json` (unchanged) | `["core:default"]` | — | §2.7 | BA.4 | `git diff` of the file is empty | tauri-plugins-ipc |
| `CommercePlugin`, `Commerce*Args` | Kotlin | `src-tauri/gen/android/app/src/main/java/mba/robin/sanctissimissa/CommercePlugin.kt:1` (new) | §2.7 | 5 `@Command`s | L.3 | BA.4 | Gauntlet L.7-7 | purchases-android; play-billing; tauri-plugins-ipc |
| Android deps + keep rules | edit | `src-tauri/gen/android/app/build.gradle.kts:87`, `proguard-rules.pro` | §2.6 | — | L.3 | BA.4 | release AAB contains `com/revenuecat/purchases` classes (`unzip -l` of base.apk) | purchases-android |
| `@revenuecat/purchases-js` | dep | `package.json` | `"1.74.0"` exact | — | L.3 | BA.3 | `npm ls @revenuecat/purchases-js` = 1.74.0 | revenuecat-purchases-js |
| env template, provisioning, CI secrets | config | `.env.example`, `scripts/provision-secrets.mjs:105`, `.github/workflows/build-all-platforms.yml` | §2.6 | 2 keys, 2 secrets | L.3 | BA.3 (web), BA.4 (android), BA.9 (CI) | `node scripts/provision-secrets.mjs` log shows both `-> .env.local` lines without values | — |
| SettingsView Account/Billing | edit | `src/ui/SettingsView.tsx:196-221, 236` (≤12 net lines) | copy below; Restore → `purchases.restore()`, enabled iff configured && signed in; library tab label from `accessFor(COMMENTARY_SOURCE_EDITION[source])`: free `(included)`, owned `(owned)`, subscription `(subscription)` | — | L.3, R2 | BA.3 | Catena never listed "(included)" | — |

SettingsView copy (exact): desc `Purchases belong to your signed-in SanctissiMissa account and are
verified by RevenueCat. Your notes and journal never upload to the billing plane.`; state
configured+signed in `Purchases verified through RevenueCat for this account.`; configured
signed out `Sign in to buy or restore editions.`; unconfigured `Purchases are unavailable in this
build; editions you already own stay readable on this device.`

### 4.2 Navigation, Catalogue tab (export **B**)

Every specimen value in **B** is replaced or not mounted. Unmounted: `#app-rail`, the journey
strip, `.public-domain-banner` (R2), the "Proposed price structure" note in `#purchase-options`,
the `#tab-provenance` trailing "proofed against original printed impressions" paragraph, the
`#tab-preview` trailing "side-by-side Latin Vulgate alignment" note, `#design-specimen-notice`.

| Entity | Type | File:line (target) | Binding | Closed set + phase | Authorized-by | Engaged-by | Acceptance | Export |
|---|---|---|---|---|---|---|---|---|
| `View` `'bookstore'`, `NAV` entry | edit | `src/App.tsx:45,47` (≤6 lines incl. mount `{view==='bookstore' && <BookstoreRoute …/>}`) | `{id:'bookstore',ico:'📚',label:'Bookstore'}` after `bible`; `RAIL_VIEWS` derives | View literals closed, Phase L | L.1, W1 | BA.5 | Gauntlet L.7-1 | — |
| `BookstoreRoute` | component | `src/ui/library/BookstoreRoute.tsx:1` (new) | `({db,sidecar,onOpenKey,onSignIn})`; builds `LibraryViewProps` from `getCommerce` | — | rule 11 | BA.5 | App.tsx grows ≤ 6 lines | — |
| `LibraryViewProps` | type | `src/ui/library/viewTypes.ts:1` (new) | `{db:CorpusDb; sidecar:SidecarDb; entitlements:EntitlementController; purchases:PurchaseController; installer:ModuleInstaller; editions:EditionIndex; signedIn:boolean; userEmail:string\|null; onSignIn:()=>void; onOpenKey:(nodeKey:string)=>void}` (`onSignIn` = `setView('account')`, `onOpenKey` = `App.tsx:419`) | — | §2 list | BA.6 | type has these 10 fields only | — |
| `.bookstore-tabs`, `#tab-catalogue`, `#tab-my-books` | DOM | `BookstoreView.tsx` | `role=tab`, `aria-selected`; persists `bookstore.tab`; only the active panel is mounted (B and Lb share `#author-filter`/`#category-filter`) | 2 tabs | L.1 | BA.5 | one `#author-filter` in the DOM at any time | new |
| `.editorial-masthead` | DOM | `BookstoreView.tsx` | export copy; `.library-scope-chip` = `${works.length} Curated Volumes` | — | §J.2 | BA.5 | chip reads `61 Curated Volumes` | B:1588 |
| `#catalogue-search` | input | | `filterCatalogue(works,{query})` | — | §J.2 | BA.5 | typing `catena` leaves 1 card | B:1621 |
| `#author-filter` (select) | select | | first `all` "All Authors & Editors", then distinct seed authors in fold order | — | §J.2 | BA.5 | option count = distinct authors + 1 | B:1625 |
| `#state-filter` | select | | `all`; `free`→free; `owned`→owned\|subscription; `review`→unavailable (export's 4 options only) | 4 options, Phase L | §J.2 | BA.5 | `review` hides Catena once it is ready | B:1637 |
| `#offline-toggle` | checkbox | | free editions + installed modules | — | §J.2 | BA.5 | checked before purchase → Haydock only | B:1645 |
| `#category-filter` (chips) | div | | chip `data-category="all"` "All Disciplines" + distinct seed categories | — | §J.2 | BA.5 | chips equal distinct categories + 1 | B:1652 |
| `#results-count-text` | span | | `Showing ${n} of ${total} curated works` | — | §J.2 | BA.5 | `Showing 61 of 61 curated works` unfiltered | B:1668 |
| `#reset-filters`, `#empty-state` | button/div | | reset visible iff a filter is active; empty-state iff n = 0, its button resets | — | §J.2 | BA.5 | nonsense query → empty-state | B:1669, B:1678 |
| `#catalogue-grid` `article.book-card[data-id=<work.id>]` | grid | | `.book-cover.<coverClass>` (rule below); `.cover-category-tag`; `.state-badge` class/text per §4.4; `.cover-book-title`; `.cover-book-author`; year `.meta-tag` = `rights[0].publicationYear` when an edition exists, else omitted; second `.meta-tag` `Offline ready` iff free or installed, else omitted; `.book-synopsis`/`.integration-bullet` only with edition copy; `.price-block` only when locked + offers loaded: `.price-label` `Own it`, `.price-val` lifetime `priceText`; `.btn-inspect` opens drawer | — | §J.2, L.2 | BA.5 | no CAD price, no `Cloud indexed` anywhere | B:2134 |
| `#drawer-overlay`, `#book-detail`, `#drawer-close` | DOM | | click overlay / close / Escape closes; focus returns to the card | — | §J.3 | BA.5 | Escape closes | B:1691, B:1694, B:1700 |
| `#drawer-state-badge` | span | | §4.4 | 5 states | L.2 | BA.5 | Gauntlet L.7-2 | B:1698 |
| `#drawer-cover-box`, `#drawer-cover-title`, `#drawer-cover-author` | DOM | | `drawer-cover-preview <coverClass>`; title; author | — | §J.2 | BA.5 | matches card | B:1709-1712 |
| `#drawer-book-title`, `#drawer-book-author`, `#drawer-book-synopsis` | DOM | | title; author; edition-copy synopsis, else `This work is in edition review and is not yet available.` | — | §J.2 | BA.5 | candidate works show the review sentence | B:1715-1717 |
| `.drawer-tab[data-tab]`, `#tab-overview`, `#tab-provenance`, `#tab-preview` | DOM | | opening resets to overview | 3 tabs | §J.2 | BA.5 | tabs switch | B:1724-1760 |
| `#drawer-benefits-list` | ul | | one `li` per edition-copy benefit; box omitted when none | — | R2 | BA.5 | Catena shows 5 benefits | B:1737 |
| `#edition-provenance`, `#drawer-provenance-grid` | DOM | | labels from export; values: `Historical Date:` publicationYear range `1841–1845`; `Author / Doctor:` author; `Editor / Translator:` translator; `Languages:` `English`; `Rights Territory:` `Worldwide (public domain)` for `'*'`; `Apparatus:` `Verse links, Father attributions, meaning search and audiobook by SanctissiMissa`. Candidate works: author + `Status:` `Edition review` + source links | — | R4 | BA.5 | Gauntlet L.7-13 | B:1749-1750 |
| `#drawer-preview-citation`, `#drawer-preview-text` | DOM | | edition copy preview; tab omitted when none | — | L.1 | BA.5 | Catena shows Jerome excerpt | B:1762-1763 |
| `#purchase-options`, `#drawer-tiers-list` | DOM | | heading kept; one `label.tier-card` per `PurchaseOffer` (`.tier-radio[name=access-tier-radio]`, `.tier-title`, `.tier-desc`, `.tier-price-val`); first selected; hidden unless `locked` and signed in | — | L.3 | BA.5 | 3 tiers when both subs are in the offering | B:1774, B:1777 |
| `#primary-action-btn` | button | | §4.4 | Closed set, Phase L | L.2 | BA.5 | Gauntlet L.7-2/3 | B:1790 |
| `#purchase-status` | p (new id) | under `#primary-action-btn`; `role=status` (`alert` for errors) | §2.2 messages | — | #23 | BA.5 | pending purchase shows pending sentence | new |
| `#proposal-modal`, `#modal-book-title`, `#modal-plan-name`, `#modal-plan-price` | DOM | | purchase confirmation. Title `${title} — Confirm purchase`; first paragraph `You are buying the SanctissiMissa edition of this work: its text together with verse links, Father attributions, meaning search, the audiobook and Sacristan synthesis.`; plan = `offer.title`; price = `${priceText} · one-time` / `· per month` / `· per year`; status line `Payment is processed by Google Play.` (play) or `Payment is processed by RevenueCat (Stripe).` (web); the "Clicking below logs your interest" paragraph not mounted; buttons `Cancel`, `Continue to payment` | — | L.1, R2 | BA.5 | modal shows the store price string | B:1798-1806 |

Edition copy `src/ui/library/editionCopy.ts` (Closed set, Phase L: `catena-aurea-en` only):
synopsis `St. Thomas Aquinas's verse-by-verse chain of the Church Fathers on the four Gospels, in
the Oxford translation edited by John Henry Newman (1841–1845).`; benefits `Every pericope
linked to its Gospel verses in Sacred Scripture` · `Each Father's quotation a searchable,
attributed entry` · `Found by meaning search beside the Mass, the Office and Haydock` · `Read
aloud as an audiobook with line and word highlighting` · `Drawn on by the Sacristan when you ask
about the day's Gospel`; integration bullet `Linked with Sacred Scripture, the Mass and the
Office`; preview citation `St. Matthew 16:13–19 · Jerome`, text `I suppose the gates of hell to
mean vice and sin, or at least the doctrines of heretics by which men are ensnared and drawn
into hell.` (verbatim, `VENDORED/…/matthew_chapter_16.md:374-375`).
`coverClass` rule (Closed set, Phase L): fold(author) contains `haydock`→`cover-haydock`,
`aquinas`→`cover-aquinas`, `francis de sales`→`cover-sales`, `kempis`→`cover-kempis`,
`liguori`→`cover-alphonsus`, `cochem`→`cover-cochem`; fold(title) contains `raccolta`→
`cover-raccolta`, `baltimore`→`cover-baltimore`; else the 8 classes in that order indexed by
`Number(catalogueId.slice(1)) % 8`.

### 4.3 My Books tab (export **Lb**, plus concept card from **K**)

Unmounted: `#main-nav-rail`, `#mobile-toggle`, `#import-book-btn` (W8), `.filter-chips`
(fabricated tier counts), "Local SQLite corpus index: Optimal", "Last opened today at Sext",
`.footer-bar`, `.specimen-flag`, the "Concordance Verification" block, "Export Citation
(BibTeX)", `#design-specimen-notice`; `#main-content` is rendered as `.main-column` without the id.

| Entity | Type | File:line (target) | Binding | Closed set + phase | Authorized-by | Engaged-by | Acceptance | Export |
|---|---|---|---|---|---|---|---|---|
| `MyBooksPanel` | component | `src/ui/library/MyBooksPanel.tsx:1` (new, <400 lines) | `(props:LibraryViewProps & {onOpenCatalogue:()=>void})` | — | L.1 | BA.6 | Gauntlet L.7-1 | Lb |
| `#library-count-badge` | span | | `${visibleCards} Active Works` | — | L.1 | BA.6 | signed out → `1 Active Works` (Haydock) | Lb:860 |
| "Explore Bookstore →" | a | `.masthead-right .button-primary` | `onOpenCatalogue` | — | L.1 | BA.6 | switches tab | Lb:869 |
| `.continue-card` | section | | latest `library.progress.*` by `updatedAt`; omitted when none; title, chapter label, progress fill = chapter index / chapter count; `Resume Reading →` opens the reader | — | L.5 | BA.6 | after reading Matthew 3, shows Matthew 3 | Lb:876 |
| `#download-manager` | region | | `.stat-pill` `${k} Volumes ready offline (${MB} MB)` from installed modules; `${u} Update available` iff modules.json revision > installed; `Check Updates` re-reads modules.json; `Manage Storage` toggles per-card `Remove download` (package bytes only; notes kept) | — | W12 | BA.6 | real MB equals installed byte length | Lb:904 |
| `#library-search`, `#author-filter`, `#category-filter` (selects) | inputs | | `filterCatalogue` over the readable set; options from that set (`all` first, export labels `All Authors & Fathers`, `All Disciplines`) | — | L.1 | BA.6 | filters narrow the grid | Lb:926-939 |
| `#library-grid` `article.book-card[data-edition-id]` | grid | | editions with access free/owned/subscription; `.access-tag` `tag-free`/`tag-owned`/`tag-subscription` text `Free Included`/`Owned`/`Subscription Access`; `.book-title`; `.book-author`; `.book-meta-row` two spans: `English` and the edition line (Catena `Oxford 1841–1845, ed. J. H. Newman`; Haydock `New York: Dunigan, 1883`); `.book-description` synopsis; `.book-badges-row` `📝 N Notes`, `🔖 N Bookmarks` (sidecar accompaniments anchored `book:<editionId>#…`; 0 omitted; voice logs never); `.storage-status` `Downloaded (X MB)` / `Not downloaded` (`.status-dot.cloud`) / Haydock `Included in the app`; `.card-actions` `Inspect` + `Open` (installed/free) or `Download` (entitled, not installed). Haydock `Open` → `onOpenKey('verse:Matt/1/1')` (Sacred Scripture at Matthew 1:1, where Haydock commentary renders; `Matt` per `scripts/ingest-bible.mjs:93`) | — | L.1 | BA.6 | after purchase Catena card appears with `Owned` | Lb:958 |
| `#edition-drawer` | aside | | `Inspect` opens; `.drawer-close` × / `Close Inspector` / Escape close | — | L.1 | BA.6 | Escape closes | Lb:1162 |
| `#drawer-volume-title`, `#drawer-author`, `#drawer-recension`, `#drawer-licence`, `#drawer-missal`, `#drawer-size` | td | | title; author; `rights[0].sourceEdition`; `rights[0].basis`; `Linked to Gospel verses in Sacred Scripture; searchable with the Mass and Office` (Catena) / `Commentary shown in Sacred Scripture` (Haydock); installed size or `Not downloaded` / `Included in the app` | — | R4 | BA.6 | Catena licence reads the §2.5 `basis` | Lb:1164-1192 |
| `#concept-surfacing` (new id on `.concept-graph-card`) | section | after `#download-manager`, before the filter toolbar (export order **K**:964→981→1040) | shown iff a progress record exists; up to 2 `.graph-insight-item` from content-modules `nucleatedSimilarToText` for that chapter's first block: pill `🎯 Surfaced for <chapter label>`, score `${Math.round(contextScore*100)}% match`, title = nucleus clause title, detail `Matched in <source titles>`, one button `Open` → `onOpenKey(hit.key)`. Not mounted: `⚡ … Graph Clusters Indexed`, `Refresh Graph`, `Insert in Homily`, `Preview TTS`, `View Linkage`, `Play TTS` | ≤2 items, Phase L | W7, #23 | BA.6 | percentages equal the MeaningPanel scores for the same text | K:982 |

### 4.4 State table (badge class and `#primary-action-btn`, Closed set, Phase L)

| AccessState / condition | badge text / class | `#primary-action-btn` |
|---|---|---|
| `free` | `Free included` / `badge-free-included` | `Read` |
| `owned` | `Owned` / `badge-owned` | `Read` (installs first when absent, label `Downloading…` disabled meanwhile) |
| `subscription` | `Subscription access` / `badge-owned` | same as owned |
| `locked`, signed out | `Available` / `badge-available` (new; `color: var(--burgundy); background: var(--badge-review-bg)` in `library.css`) | `Sign in to buy` → `onSignIn` |
| `locked`, offers `null` | same | disabled `Loading price…` |
| `locked`, offers loaded | same | `Buy · <selected priceText>` → `#proposal-modal` |
| purchase in flight | unchanged | disabled `Opening checkout…` |
| `unavailable` | `Edition review` / `badge-edition-review` | disabled `Purchases unavailable` |

## 5. Value principle (R2) and supersessions

Value-added editions are sold whole: text, verse graph, per-Father quotations, vectors, reader,
audiobook and Sacristan synthesis (operator, 2026-11-06). Catena Aurea is entirely the paid
module `catena-aurea-en`; the new base corpus has no Catena rows (content-modules partial, R5);
Haydock stays the free sample. The catalogue states the value in `#drawer-benefits-list`, the
confirmation modal and the integration bullet; nothing claims public-domain text is free.

Supersessions recorded:
1. Finding #9 is closed by R2: the free-Catena withdrawal is an operator decision; decision 19's
   "never for the public-domain texts" sentence is superseded (commit `4cde88fe`).
2. FREEZE 1 W11 judgement ("no copy change") is superseded: `.public-domain-banner` is not
   mounted; §J.1's "use that export's … public-domain banner" and §J.2's `.public-domain-banner`
   binding are superseded. The `#proposal-modal` "remain strictly public domain … no financial
   charge" copy is replaced (§4.2).
3. LS `LibraryViewProps` (store/media/EditionInstaller/recording/`LibraryDestination`) is replaced
   for Phase L by §4.2's ten fields; LS `included.json` and `offers.json` are not used (offers
   derive from `ids.ts` + the live offering).
4. LS `accessFor` → `{state, expiresAt}` gains `source`; LS `purchase():Promise<void>` returns
   `PurchaseOutcome`; LS Play adapter `configure(accountId, apiKey)/offers(offeringId)/
   purchase(packageId)/restore()` becomes §2.7 (`purchase(offeringId, packageId)`, plus
   `customerInfo`).
5. Decision 15 / `.env.example` "absent ⇒ everything ungated" and SettingsView "anonymous
   appUserId": paid editions fail closed when unconfigured (already LS-1 for paid editions);
   the app user id is the Firebase uid; owned editions survive via the cache (#21).
6. L.2's `locked` rule is refined: signed out, or offers still loading, counts as offers present.
7. `canPublishEdition` gains the `'*'` worldwide token (additive).
8. Bundles, collections and Roche consumables are not offered in Phase L.

New gauntlet rows proposed to BA.9 (TEST_RUBRIC re-form): **L.7-12** Airplane mode after
purchase: relaunch offline, Catena still `Owned`, readable and in search. **L.7-13** Catena
drawer `Edition Provenance` shows the Oxford 1841–1845 / Newman / `Worldwide (public domain)`
values. **L.7-14** No `.public-domain-banner`, specimen price, `Cloud indexed`, `v2.4.8` or
`DESIGN SPECIMEN` text in either tab (DOM text search).

**Open items (not blockers):** Haydock has no NucleusSourceManifest yet (pre-existing decision-21
gap; data from `VENDORED/haydock/PROVENANCE.md`); RevenueCat Web Billing products must carry the
same identifiers as §2.1 and sit in offering `bookstore` (operator dashboard; verified by L.7-9);
the `DOCS/sdk/` snapshots named in §4 are being created by another agent.
