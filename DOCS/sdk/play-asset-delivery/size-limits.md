<!--
SNAPSHOT  DOCS/sdk/play-asset-delivery/size-limits.md
source:   https://support.google.com/googleplay/android-developer/answer/9859372#size_limits
          https://developer.android.com/guide/playcore/asset-delivery
fetched:  2026-11-06 (WebFetch extraction; quoted values)
license:  Google Play Console Help / Android developer docs (CC BY 4.0 prose)
-->

# Google Play size limits for Android App Bundles (compressed download size)

| Scope | Limit |
|---|---|
| Base module | 500 MB |
| Each feature module | 500 MB |
| Each asset pack | 1.5 GB |
| Base + feature modules + **install-time** asset packs, cumulative | 4 GB |
| **fast-follow + on-demand** asset packs, cumulative | 30 GB |
| Whole app on Google Play | 34 GB |

- **200 MB** is not a limit. Above it, users on a mobile data connection see a non-blocking dialog. For a fast-follow pack over 200 MB not on Wi-Fi, the download pauses (`WAITING_FOR_WIFI`) until the user consents (`showConfirmationDialog`) or Wi-Fi returns (see integrate-java.md).
- Disk space: install-time packs need the same free space as the base APK, which is **at least 2× the size of all the asset packs**. Fast-follow and on-demand packs need "only a few hundred extra MBs".
