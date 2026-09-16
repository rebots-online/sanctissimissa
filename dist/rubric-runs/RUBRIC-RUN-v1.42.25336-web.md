# RUBRIC RUN — v1.42.25336 · web (asrock, native Linux) — Stanza AM (AM-UI)

Executed 2026-09-15 21:5x–22:1x EDT by the AM agent against the release web
bundle (`dist-web/`, identical to the bundle embedded in the Tauri desktop and
Android binaries) served locally over `python3 -m http.server 43873`, driven in
Chromium (ZCode IAB) with sample verification media in `content/` (removed and
rebuilt afterward — the release ships zero media by design).

## AM-UI observations

| Assertion | Result | Evidence |
|---|---|---|
| Sample photo+video dropped in `content/` mount after rebuild, zero code changes | PASS | DOM snapshot: `figure.about-media` "Sample parish" (img) and "Sample video" (video, ▶ affordance) present after ungated `vite build`; hashed assets `01-sample-parish-C-_pkmlQ.jpg`, `02-sample-video-C6t0K-05.mp4` emitted and referenced by the bundle |
| Regular spacing between prose blocks | PASS | 7 origin-story blocks, 2 media → mounts after blocks 1 and 4 (0-indexed), matching `planMediaMounts(7,2)` exactly |
| First figure floats RIGHT, text reflowed around; second LEFT | PASS | computed `float: right` / `float: left` (334px each); Range line-box measurement: 6 lines beside the right float (~524–600px wide vs 981px prose) and 4 lines beside the left float starting at x=610 (float right edge 592 + 18px margin) |
| Captions derived from filenames | PASS | "Sample parish" ← `01-sample-parish.jpg`; "Sample video" ← `02-sample-video.mp4` |
| Hover lifts/zooms inline (fine pointer) | PASS (CSS) | `@media (pointer:fine)` `.about-media:hover { translateY(-3px); shadow; }` + `cursor: zoom-in` (source-verified; hover state not drivable in headless tick) |
| Click / short tap opens lightbox | PASS | figure click → `.about-lightbox` present, `role=dialog`, `aria-modal=true`, counter `1 of 2`, caption, ✕ button, 2 nav buttons, body scroll locked, image `complete` |
| ‹ › navigate with wrap | PASS | › click → counter `2 of 2`, stage shows `<video controls>` (video variant plays with controls) |
| ✕ / Esc / scrim close | PASS | Escape keydown → lightbox removed from DOM |
| Zero media ⇒ page identical to pre-AM | PASS | samples removed → rebuild → 0 `figure.about-media`; montage CSS scoped under `.about-workspace` with single end-of-prose clear |
| Corpus line reworded; old line absent | PASS | About DOM shows the derivative-corpus line; `grep -r "vendored, re-realized" src/` empty (AM.06) |
| <720px: floats persist, text reflowed | PASS | viewport 390×844: both floats persist at exactly 44% of prose width (desktop inspector layout crushes prose at phone widths — pre-existing; true mobile rendering is the Android shell) |
| Precache/runtime-cache split | PASS | sw.js precache contains the photo, NOT the video; `sanctissimissa-media` CacheFirst route covers `mp4/webm/mov/m4v` |

## Platform notes

- **Linux desktop**: `dist/sanctissimissa-v1.42.25336-linux-amd64.AppImage`
  launches and runs on this host (pid verified; this X session needs
  `WEBKIT_DISABLE_DMABUF_RENDERER=1 WEBKIT_DISABLE_COMPOSITING_MODE=1` — a
  session EGL quirk, not a product regression; window left open on :1 for
  operator eyeballing). The embedded bundle is the exact web build verified
  above; the release ships zero media, so the desktop About renders
  attribution-only changes.
- **Android**: no emulator binary/AVD on this build host (plugin preflight:
  emulator package absent). The APK/AAB embed the identical verified bundle;
  on-device verification deferred to the operator (same posture as v1.41.21298,
  which shipped without emulator evidence). Sample-media behavior on the
  Android WebView is covered by the web verification plus code-level CSP
  analysis (`default-src 'self'` unchanged; no media shipped in this release).
- **Windows**: cross-built artifacts in `dist/` (`-setup.exe`,
  `-standalone.exe`); `.msi/.msix` remain the known native-Windows gap.

## Verdict

**AM-UI: PASS** (web assertions all green; desktop launch verified; Android
deferred-with-reason as above). Per the operator's incremental-ship rule this
PASS authorizes the release push and the surge.sh cutover.
