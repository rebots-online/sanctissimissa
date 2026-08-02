# St. Android's Missal

**The Traditional Latin Mass and Divine Office as a navigable subway map.**

St. Android's Missal is the next-major-version rewrite of
[SanctissiMissa / "Hello, Word"](https://helloword.robin.mba). It preserves the skeleton
structure of the Mass — expanded and visualized as a subway-style map to navigate the
whole — and re-realizes László Kiss' Divinum Officium flat-text corpus (whose embedded
`@` / `$` / `&` / `vide` directives construct the prayers) as **graph and vector
databases**, serving a beautiful, exegetical UI:

- 🚇 **Subway map of the Mass** — Catechumens line → Faithful line, Ember-Day loop,
  seasonal Graduale/Alleluia/Tractus tracks, conditional Gloria/Credo, Super populum spur
- 📖 **Bilingual exegetical reader** — Latin normative, English modular; annotations,
  highlights, margin notes
- 🖱️ **Right-click → "Catholic meaning of ‹selected text›"** — corpus concordance +
  vector-similar passages today; fine-tuned ecclesiastical LLM in the next major
- 🕸️ **Graph corpus** — `vide C10`-style cross-references, section membership, and the
  ordo itself as first-class edges
- 🔍 **Vector similarity** — offline, deterministic embeddings over every section
- 📅 **Perpetual universal calendar** — Butcher's Easter computus, computed on demand,
  never pre-generated
- 🕰️ **Divine Office cursus** — the eight hours as a loop line (full Breviary texts:
  Phase 2)

## Platforms and current release outputs

- Web/PWA: versioned offline ZIP, deployed to `https://standroid.robin.mba`
- Linux x64: `.deb` and AppImage
- Windows 11 x64: standalone PE `.exe`
- Android: production-signed release APK and Play-uploadable AAB
- Android diagnostics: native debug-symbol archive; the debug APK is retained
  for diagnostics only and never satisfies release acceptance

NSIS, MSI, MSIX, RPM, and Snap packages are not currently produced. Microsoft
Store packaging requires a separate Windows-host package pass. All builds are
**local** — CI remains dormant until explicitly activated. See
`BUILD_INSTRUCTIONS.md` § CI/CD for the proposed self-hosted runner recipe
(GitHub Actions and Forgejo Actions) pending runner provisioning.

## Prerequisites

- **Node.js ≥ 22.6** (`--experimental-strip-types` for TS test files + ingest)
- **Rust** (stable, via [rustup](https://rustup.rs))
- **Linux native:** `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev build-essential pkg-config libssl-dev`
- **Git LFS** for the tracked release set in `dist/`
- **Android:** SDK platform 36, build-tools 36.1.0, NDK 27.0.12077973,
  `cargo-ndk`, a compatible JDK, and all four Rust Android targets
- **Windows cross-build:** `cargo-xwin`
- **Release utilities:** `zip`, `readelf`/binutils, `sha256sum`, `jarsigner`,
  `apksigner`, and `aapt2`

See `BUILD_INSTRUCTIONS.md` for the authoritative recipe and unusual release
constraints. `DOCS/BUILD.md` is retained as a compatibility pointer.

## Quick start

```bash
npm ci                # install the locked dependency graph
npm run ingest        # rebuild missal.db from VENDORED/ (optional — committed)
npm test              # run the complete current test suite
npm run dev           # web dev server (port 5173)
npm run tauri dev     # desktop shell
```

## Native builds

```bash
# One stamp, then web + Linux + Windows x64 + Android production/debug/symbols
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npm run build:release
```

`build:release` is the only coherent all-platform release command. It stamps
exactly once, builds web first, produces every platform artifact, preserves
Android native symbols, and collects only after every target succeeds. The
Admin-Manual kickstart script is useful for toolchain bootstrap and ad-hoc
target builds; it is not an alternative release driver.

Production Android signing requires the ignored
`src-tauri/gen/android/keystore.properties`, provisioned from Admin-Manual.
Neither credentials nor keystore bytes belong in this repository.

Artifacts are collected in `dist/` with compliant filenames:
```
standroidsmissal-v1.18.35665-linux-amd64.deb
standroidsmissal-v1.18.35665-linux-amd64.AppImage
standroidsmissal-v1.18.35665-windows-x64-standalone.exe
standroidsmissal-v1.18.35665-web-pwa.zip
standroidsmissal-v1.18.35665-android-universal-debug.apk
standroidsmissal-v1.18.35665-android-universal-release.apk
standroidsmissal-v1.18.35665-android-universal-release.aab
standroidsmissal-v1.18.35665-android-native-debug-symbols.zip
```

The release driver collects only after every platform succeeds and emits
slug-first files plus SHA-256 JSON/XML manifests.

Version follows `MAJOR.MINOR.BUILD` (per `BUILD_CONVENTIONS.md`).
Canonical source: `version.txt`; `version.json` is the generated mirror.

## Documentation

- `BUILD_INSTRUCTIONS.md` — authoritative release recipe (all platforms)
- `DOCS/BUILD.md` — compatibility pointer to the root recipe
- `DOCS/ARCHITECTURE.md` — authoritative entity table, data flows, decisions
- `DOCS/CORPUS-SCHEMA.md` — corpus schema, concept taxonomy, text normalization
- `DOCS/ARCHITECTURE/StAndroidsMissal-v1.md` — entity table, data flows, decisions
- `CHECKLIST.md` — execution contract and audit trail

Corpus source only is licenced MIT: [Divinum Officium](https://github.com/DivinumOfficium/divinum-officium)
(MIT), by László Kiss and contributors. Latin is the normative reference language.

The St. Android Missal and Breviary in the Extraordinary Form is proprietary software: unauthorized copying, use, or distribution is prohibited.
Copyright © 2026 Robin L. M. Cheung, MBA. All rights reserved.
