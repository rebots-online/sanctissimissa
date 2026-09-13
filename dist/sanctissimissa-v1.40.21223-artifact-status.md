# SanctissiMissa artifact status at v1.40.21223

This tracked directory is the permanent home for all SanctissiMissa release
artifacts. Binary files use Forgejo LFS; GitHub contains their pointer files.
Disposable web output is built separately in `dist-web/` and archived here.

The interrupted v1.40.21223 build carried the predecessor's incorrect identity.
Those generated files were deleted at the operator's explicit instruction.
There are no valid SanctissiMissa release binaries for that attempt here.

The next coordinated release will stamp once, build the available platforms,
and collect every available artifact here with its exact version and hashes.
Missing native-host artifacts will be listed explicitly in the partial manifest.
The complete set requires web/PWA ZIP, Linux AppImage/DEB, Windows cross EXE/NSIS,
native Windows EXE/MSI/MSIX, and Android debug APK, signed release APK/AAB and
four-ABI native symbols ZIP. This status document is not a substitute for them.
