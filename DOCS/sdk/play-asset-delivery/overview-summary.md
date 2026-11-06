<!--
SNAPSHOT  DOCS/sdk/play-asset-delivery/overview-summary.md
source:   https://developer.android.com/guide/playcore/asset-delivery
fetched:  2026-11-06 (WebFetch summary — NOT verbatim)
version:  Play Asset Delivery library com.google.android.play:asset-delivery(-ktx):2.3.0 (as documented on the page)
license:  Android developer docs: CC BY 4.0 (prose), Apache-2.0 (code samples)
-->

# Play Asset Delivery — overview (summary)

Delivery modes:
| Mode | Downloaded | Counts toward app size | Storage |
|---|---|---|---|
| install-time | at install, as split APKs | yes | part of the APK set; read with AssetManager |
| fast-follow | automatically after install | no | archives expanded into internal storage |
| on-demand | at runtime, when requested | no | archives expanded into internal storage |

- fast-follow / on-demand files: do not assume location or persistence; the user may delete them and the library may move them; treat them as read-only; always resolve the location through the library.
- Disk: install-time packs need about 2× the total pack size free; fast-follow / on-demand need only a few hundred MB.
- Update: fast-follow / on-demand packs are invalidated on app update and then patched locally; handle the brief "update in progress" window.
- Size limits are not stated on this page. See https://support.google.com/googleplay/android-developer/answer/9859372#size_limits.
- Assets only, never executable code.
