# Store listing kit — St. Android's Missal v1.16.34594

## Product identity

- Public title: `St. Android's Missal`
- Android application ID / Google Play package name: `mba.robin.standroidsmissal`
- Recommended Snap Store name: `st-androids-missal` (subject to name availability)
- Version name: `1.16.34594`
- Android version code: `100016`
- Category: Education
- Google Play upload: `dist/standroidsmissal-v1.16.34594-android-universal-release.aab`

The Google Play package name is immutable after the Play app is created. Microsoft
Partner Center assigns a separate package identity when the product name is reserved;
do not substitute the Android application ID for that Partner Center identity.

## Included assets

### Google Play

- `google-play/app-icon-512.png` — required 512 x 512 32-bit PNG with alpha.
- `google-play/feature-graphic-1024x500.png` — required 1024 x 500 opaque PNG.
- `google-play/phone-01-mass-map-1080x1920.png`
- `google-play/phone-02-bilingual-reader-1080x1920.png`
- `google-play/phone-03-scripture-atlas-1080x1920.png`
- `google-play/phone-04-journal-homilies-1080x1920.png`

The four phone images are direct 1080 x 1920 captures from the production-signed APK
on an Android 35 emulator. They satisfy Google's recommended four-phone-screenshot set.

### Microsoft Store

- `microsoft-store/app-tile-icon-300.png` — recommended 300 x 300 app tile icon.
- `microsoft-store/desktop-01-bilingual-reader-1920x1080.png` — required-listing
  desktop screenshot. It is a direct AppImage runtime capture, cropped to 16:9.

Microsoft requires at least one screenshot and recommends four. Do not upload the
optional 16:9 super-hero asset for this release: Microsoft's current promotional-art
guidance disallows religious symbols in that asset class, while the app's authentic
brand and subject necessarily include them.

The current standalone Windows EXE is not yet a Microsoft Store submission package.
Use one of these routes before submitting:

1. Produce an MSIX whose identity and publisher values exactly match Partner Center;
   Microsoft re-signs Store-submitted MSIX packages.
2. Produce an MSI/EXE installer and sign the installer and contained PE files with a
   certificate chaining to the Microsoft Trusted Root Program.

### Snap Store / Ubuntu App Center

- `snap-store/icon-256.png` — recommended 256 x 256 icon, below 256 KB.
- `snap-store/screenshot-01-bilingual-reader-1920x1080.png` — desktop screenshot.

Ubuntu's consumer app store is the Snap Store, surfaced by Ubuntu App Center. A `.deb`
or AppImage cannot be uploaded as a snap. The publication flow is:

1. Add `snap/snapcraft.yaml` with name `st-androids-missal`, title, summary,
   description, icon, desktop entry, confinement, plugs, and the packaged application.
2. Run `snapcraft` to produce the `.snap`.
3. Test with `snap install --dangerous <file.snap>` and run the installed command.
4. Sign in with `snapcraft login` and reserve the unique name with
   `snapcraft register st-androids-missal`.
5. Publish with `snapcraft upload --release=stable <file.snap>`.
6. Verify from a second clean host with `snap install st-androids-missal`.

Store account creation, legal declarations, and name reservation necessarily happen in
the account consoles; the installed app itself must not depend on any manual setup.

## Copy and accessibility

Ready-to-paste descriptions, features, keywords, screenshot captions, and alt text are
in `listing-copy.md`. Exact SHA-256 checksums are in `ASSET_MANIFEST.sha256`.
