# DOCS/sdk/ — local SDK documentation snapshots

Per Admin-Manual **TC7** (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`):
production code cites these local, version-pinned snapshots instead of web URLs, e.g.

```rust
// see DOCS/sdk/llama-cpp-2/context-embeddings.md §embeddings_seq_ith — RANK pooling returns n_cls_out floats
```

## Download convention

- One folder per SDK/API: `DOCS/sdk/<sdk>/`, each with its own `INDEX.md` (pinned version, curator notes, file table, section map of deep-link targets).
- Every snapshot file starts with an HTML comment header: `source`, `fetched` date, fetch `method`, pinned `version`, `license`.
- Prefer verbatim sources (vendor Markdown endpoints, raw repo files, the published package tarball at the pinned version) over rendered pages. Where only a summary was obtainable (Google Help Center), the header says **WebFetch summary — NOT verbatim**.
- Snapshots are never hand-edited. On an SDK version bump: re-snapshot, update the folder `INDEX.md`, and audit every `DOCS/sdk/<sdk>/` citation comment (TC7 adoption step 7).
- Snapshot date for the initial set: **2026-11-06**.

## Inventory

| Folder | SDK / API | Pinned version | Files |
|---|---|---|---|
| [`revenuecat-purchases-js/`](revenuecat-purchases-js/INDEX.md) | RevenueCat Web SDK (@revenuecat/purchases-js) | @revenuecat/purchases-js 1.74.0 (npm `latest` on 2026-11-06; repo does not yet pin it in package.json) | 10 |
| [`purchases-android/`](purchases-android/INDEX.md) | RevenueCat Android SDK (com.revenuecat.purchases:purchases) | purchases-android 11.2.0 (Maven Central `release` on 2026-11-06) | 8 |
| [`play-billing/`](play-billing/INDEX.md) | Google Play Billing Library (one-time products, Play balance / gift cards) | Play Billing Library 9.1.0 (2026-06-18; latest on dl.google.com Maven on 2026-11-06) | 7 |
| [`llama-cpp-2/`](llama-cpp-2/INDEX.md) | llama-cpp-2 Rust crate (utilityai/llama-cpp-rs) | llama-cpp-2 0.1.156 (matches src-tauri/Cargo.toml pin) / llama-cpp-sys-2 0.1.156; git tag 0.1.156 = 63e549708237b16b39018288582655539e0a9d5b | 6 |
| [`atomic-llama-cpp-turboquant/`](atomic-llama-cpp-turboquant/INDEX.md) | Atomic Chat llama.cpp fork (AtomicBot-ai/atomic-llama-cpp-turboquant) | release tag b10298-2.1.0 (2026-10-27); README at master commit 8d93507810cd89b26bfb47148f2c1708cc3fa316 | 1 |
| [`wllama-3.8.1/`](wllama-3.8.1/INDEX.md) | wllama (@wllama/wllama) — llama.cpp in WebAssembly | @wllama/wllama 3.8.1 (npm tarball) | 6 |
| [`ollama-embed/`](ollama-embed/INDEX.md) | Ollama /api/embed | Ollama docs at main branch on 2026-11-06 (latest release v0.40.15) | 2 |
| [`media-session/`](media-session/INDEX.md) | Media Session API (W3C + MDN) | W3C Media Session Editor's Draft dated 5 June 2026; MDN content main branch on 2026-11-06 | 6 |
| [`tauri-plugins-ipc/`](tauri-plugins-ipc/INDEX.md) | Tauri 2 — mobile plugins (Kotlin), commands/IPC, capabilities | Tauri 2.x docs (tauri-docs `v2` branch on 2026-11-06); repo pins tauri = "2" | 7 |
| [`network-information/`](network-information/INDEX.md) | Network Information API (navigator.connection: saveData, type, effectiveType) | MDN content main branch on 2026-11-06 | 5 |
| [`html-media-element/`](html-media-element/INDEX.md) | HTMLMediaElement (playbackRate, preservesPitch) | MDN content main branch on 2026-11-06 | 3 |
| [`indexeddb/`](indexeddb/INDEX.md) | IndexedDB API + StorageManager.estimate | MDN content main branch on 2026-11-06 | 4 |
| [`onnxruntime-web-1.31/`](onnxruntime-web-1.31/INDEX.md) | onnxruntime-web (JS/Web) | onnxruntime-web 1.31.1 (repo package.json); README at git tag v1.31.1 | 2 |
| [`play-asset-delivery/`](play-asset-delivery/INDEX.md) | Google Play Asset Delivery (asset packs, AssetPackManager) | com.google.android.play:asset-delivery(-ktx) 2.3.0 per page on 2026-11-06 | 2 |
| [`qwen3-embedding/`](qwen3-embedding/INDEX.md) | Qwen3-Embedding-0.6B model card | HF Qwen/Qwen3-Embedding-0.6B @ 97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3 (lastModified 2026-04-20); GGUF card Qwen/Qwen3-Embedding-0.6B-GGUF @ 370f27d7550e0def9b39c1f16d3fbaa13aa67728 | 2 |
| [`qwen3-reranker/`](qwen3-reranker/INDEX.md) | Qwen3-Reranker-0.6B model card | HF Qwen/Qwen3-Reranker-0.6B @ e61197ed45024b0ed8a2d74b80b4d909f1255473 (lastModified 2026-04-16) | 1 |

## Notes

- RevenueCat cross-platform guides (configuring-sdk, displaying-products, making-purchases, restoring-purchases, customer-info, identifying-customers) are snapshotted identically in both `revenuecat-purchases-js/` and `purchases-android/` so each folder is self-contained.
- `llama-cpp-2/` is taken from the crate source at the exact version pinned in `src-tauri/Cargo.toml` (0.1.156), not docs.rs `latest`.
- `wllama-3.8.1/` and `revenuecat-purchases-js/` typings come from the published npm tarballs at the pinned versions.
