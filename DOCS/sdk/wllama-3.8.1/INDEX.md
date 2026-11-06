# DOCS/sdk/wllama-3.8.1/ — wllama (@wllama/wllama) — llama.cpp in WebAssembly

**Pinned version:** @wllama/wllama 3.8.1 (npm tarball)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/wllama-3.8.1/<file>.md §<heading>`.

## Curator notes

- `createEmbedding(options: EmbeddingCreateParams)` and `createRerank(options: RerankParams)` — `wllama.d.ts.md` L321/L328; request/response shapes in `oai-compat.d.ts.md`.
- **Rerank requires the model loaded with `embeddings: true` and `pooling_type: 'rank'`** (typings comment at L323-L328).
- Threading: multi-thread build needs `Cross-Origin-Embedder-Policy` + `Cross-Origin-Opener-Policy` (README §Main features). ARCHITECTURE §L.4 deliberately runs **single-threaded, no COOP/COEP** so Firebase popups and RevenueCat checkout keep working.
- Self-hosting wasm: pass the `.wasm` asset paths to `new Wllama({...})` (README §Usage / config paths); `wasm-from-cdn.js` is explicitly "not recommended" — this repo self-hosts.
- All files come from the published 3.8.1 npm tarball, so they match the exact shipped version.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`README.md`](README.md) | README: features, COOP/COEP, wasm paths, CDN option | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/README.md)> |
| [`guide-intro-v3.md`](guide-intro-v3.md) | v3 API introduction | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/guides/intro-v3.md)> |
| [`guide-intro-v3.1.md`](guide-intro-v3.1.md) | v3.1 changes | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/guides/intro-v3.1.md)> |
| [`wllama.d.ts.md`](wllama.d.ts.md) | Wllama class, config, loadModel options | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/esm/wllama.d.ts)> |
| [`oai-compat.d.ts.md`](oai-compat.d.ts.md) | EmbeddingCreateParams, RerankParams, responses | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/esm/types/oai-compat.d.ts)> |
| [`types.d.ts.md`](types.d.ts.md) | Shared types | curl npm tarball, verbatim | <https://registry.npmjs.org/@wllama/wllama/-/wllama-3.8.1.tgz (package/esm/types/types.d.ts)> |

## Section map (deep-link targets)

### `README.md`

- wllama - Wasm binding for llama.cpp
  - Features
  - Code demo and documentation
  - How to use
    - Use Wllama inside React Typescript project
    - WebGPU support
    - Prepare your model
    - Simple usage with ES6 module
    - Split model
    - Custom logger (suppress debug messages)
  - How to compile the binary yourself
  - TODO
  - Acknowledgments

### `guide-intro-v3.md`

- Introducing Wllama V3.0
  - What's new
  - New architecture
  - OAI-compatible API
    - `createChatCompletion`
    - `createCompletion`
    - `createEmbedding`
  - Tool calling
  - Multimodal support
  - Migration from v2.0
    - Removed low-level APIs
    - Sampling params moved to per-request
    - Auto context length removed
    - Multimodal loading: `mmprojUrl` replaces separate file selection
    - Internal changes

### `guide-intro-v3.1.md`

- Release note Wllama V3.1
  - What's new
    - WebGPU support
    - Single WASM build

### `wllama.d.ts.md`

- @wllama/wllama 3.8.1 — esm/wllama.d.ts

### `oai-compat.d.ts.md`

- @wllama/wllama 3.8.1 — esm/types/oai-compat.d.ts

### `types.d.ts.md`

- @wllama/wllama 3.8.1 — esm/types/types.d.ts
