# St. Android's Missal v1.25.59353

Stabilization release after INC-17 (supplemental Windows artifacts built at stale version). Stamped to 1.25.59353 after codebase modifications to add MSI/MSIX build support. Built on the platform each target runs on (CC17 §4a): Linux artifacts in WSL, Windows artifacts natively on Windows.

## Artifacts

- Web PWA (`standroidsmissal-v1.25.59353-web-pwa.zip`)
- Linux deb (`standroidsmissal-v1.25.59353-linux-amd64.deb`)
- Linux AppImage (`standroidsmissal-v1.25.59353-linux-amd64.AppImage`)
- Windows standalone PE (`standroidsmissal-v1.25.59353-windows-x64-standalone.exe`)
- Windows MSI (`standroidsmissal-v1.25.59353-windows-x64.msi`)
- Windows MSIX (`standroidsmissal-v1.25.59353-windows-x64.msix`)

## Missing from this release

- Android debug APK, release APK, release AAB — blocked: Java/Android SDK not installed in WSL
- Native debug symbols — blocked: requires Android build

## Conventions applied

- CC17: stamped on modification, not just on build
- CC17 §4a: built on the platform each target runs on
- CC12: slug-first artifact names, dist/ monotonic floor
- CC13: pushed to Forgejo (origin, LFS store) then GitHub (mirror, pointers only)
- CC18: checklist-driven build and push
