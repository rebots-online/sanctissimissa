# §L partial: native-embed-engine (2026-11-06)

Binding partial of ARCHITECTURE §L.4/§L.8 for the embedding and reranking engines. It
defines the device-side half of decisions D1, D2, D3, D10 and D11
(`DOCS/ARCHITECTURE/semantic-embedding-research-20261106.md`), under operator resolutions
R1–R5 (2026-11-06). Code facts were read through CodeGraph or from the files cited. External
facts were read on 2026-11-06 from GitHub, Hugging Face, crates.io and npm; each appears with
its exact identifier.

## 1. Scope

**Resolves:**
- **#3:** runtime model and wasm bytes now have a defined origin, through the
  `EMBED_MODEL_ASSETS` table and `models/manifest.json`. This partial authors the rows for the
  embedder, the reranker and the wllama wasm. The Supertonic and module rows use the same schema
  (§2.4) and are authored by the audiobook and content-modules-search partials.
- **#4** (model half): the models are vendored as `VENDORED/models/sha256/<digest>/<file>` with
  `PROVENANCE.md`. The corpus-pipeline half belongs to content-modules-search.
- **#5:** the Atomic fork is pinned, with the exact Cargo override.
- **#8:** the rows for this domain, in the full column set (§4).
- **#15:** wllama and local inference are reintroduced for embeddings only, with supersessions
  recorded (§5).
- **Partly resolves:**
  - #13: the "Local SDK doc" column is added. The snapshots themselves are being created by
    another agent.
  - #20: the wasm and GGUF files are excluded from the precache.
  - #22: `type EmbedRuntime` is now closed.

**§2 entities resolved:**
- `SemanticEmbedder`/`Reranker`, mapped onto `IInferenceEngine.embed?`/`batchScore`.
- The `batchScore` implementations.
- `type EmbedRuntime`.
- `ModelPreloader`, with metered consent.
- The readiness API that the D7 fallback selector reads.
- `lib.rs` invoke_handler entries `embed_load`/`embed_texts`/`rerank_scores`, plus capability
  ids.
- The `src-tauri/Cargo.toml` fork `[patch]`.
- `EMBED_MODEL_ASSETS` and `models/manifest.json`.
- The wllama wasm vendor path and its copy script.
- The vendored model files.

**Out of scope here; the owning partial is named:**
- `similarToText`, `EmbedMeta.compatible`, `verifyEmbedParity`, `embed-probe.json` and
  `migrateSidecarVectors`: content-modules-search, BA.14.
- `embed-corpus.mjs`: BA.10.
- Supertonic: audiobook.

**Code facts this partial changes:**
- **`reusable-chatbot/core/engine-types.ts`:**
  - `IInferenceEngine.embed?(session, texts): Promise<Float32Array[]>` is at :98 and has no
    implementation today.
  - `batchScore(session, BatchScoreRequest): Promise<Float32Array>` is at :77. `BatchScoreItem`
    `{context: ChatMsg[], continuation}` is at :29-32.
  - The existing stubs return `new Float32Array(0)` (`engines/native/index.ts:151-153`,
    `engines/webllm/index.ts:159-161`).
- **`src-tauri/src/inference.rs`** (365 lines):
  - Each of these 21 lines carries
    `#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]`:
    13, 15, 17, 19, 21, 23, 31, 33, 35, 38, 48, 53, 64, 123, 149, 156, 209, 219, 327, 337, 354.
  - Each of these 7 lines carries
    `#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]`:
    68, 84, 90, 101, 107, 113, 119.
  - Windows wording appears at :80 (the stub `notes`) and :120-121 (`NOT_COMPILED`).
  - `fn backend()` is private at :38-46. `LlamaBackend::init` may run once per process.
- **`src-tauri/Cargo.toml`:**
  - :20-22 holds the features block: `default = ["native-inference"]`,
    `native-inference = ["dep:llama-cpp-2"]`.
  - :24-29 holds the target gate and `llama-cpp-2 = { version = "0.1.156", optional = true }`.
  - `Cargo.lock` resolves `llama-cpp-2`/`llama-cpp-sys-2` 0.1.156.
- **`src-tauri/src/lib.rs`:**
  - :69-70 declares `mod inference; mod model_store;`.
  - :75-93 is the `generate_handler!` list.
- **Capabilities and build:**
  - `capabilities/default.json` grants only `core:default`.
  - `build.rs` is plain `tauri_build::build()`, so no app-command ACL manifest exists, and app
    commands registered in `generate_handler!` are callable without capability entries. The
    existing `inference_*` and `model_*` commands already work this way.
- **`scripts/build-windows.sh`** (48 lines) runs `tauri build --runner cargo-xwin` at :27-28. On
  the build host, `/usr/local/bin/clang-cl` → `clang-cl-18`, `/usr/bin/lld-link` →
  `lld-link-18`, and apt candidate `clang-19`/`lld-19`/`llvm-19` = `1:19.1.1-1ubuntu1~24.04.2`.
- **Model store:**
  - `src/core/model-store/store.ts:20-31`: `STORE_LAYOUT='models/sha256'`, plus `validateAsset`,
    which requires a 64-hex digest and a file name matching `^[A-Za-z0-9._-]{1,128}$`.
  - `DesktopModelLibrary` (:46) and `WebModelLibrary` (:235, OPFS).
  - `DownloadManager.acquire` (`download-manager.ts:73`) does Range resume (:149).
  - `model_finish` verifies sha256 at commit (`model_store.rs:138-170`).
- **CSP and PWA:**
  - `tauri.conf.json` CSP is `script-src 'self' 'wasm-unsafe-eval'` with no `worker-src`.
  - `vite.config.ts:39-46` Workbox precaches `**/*.{…,wasm}` up to 10 MiB.
- **App wiring:** `App.tsx:317-322` is the corpus-open effect. App.tsx has 771 lines, so it
  gets a delegating import only. `SettingsView.tsx:243-249` is the "Sacristan models" block.

## 2. Formats and closed sets

### 2.1 `EmbedRuntime` and selection. Closed set, Phase L.
```ts
export type EmbedRuntime = 'native' | 'wllama';            // Closed set, Phase L
export type EmbedRole = 'embed' | 'rerank';                // Closed set, Phase L
export type ModelState =                                    // Closed set, Phase L
  'absent' | 'waiting-metered' | 'downloading' | 'verifying' | 'loading' | 'ready' | 'error';
```
`resolveEmbedRuntime(invoke?: TauriInvoke): Promise<EmbedRuntime>` is the only selector:
- With no `invoke` (web/PWA), the result is `'wllama'`.
- Otherwise it calls `invoke('embed_probe')` and returns `'native'` iff `nativeEmbed === true`.
  Otherwise it returns `'wllama'`.

Results by target:

| Target | Runtime |
|---|---|
| Linux x86_64 | native |
| Windows x86_64 | native |
| Android aarch64 | native |
| Android x86_64 | native (it compiles; see §5 S5) |
| Android armeabi-v7a/x86 | wllama |
| web/PWA | wllama |

`embedderFor(runtime): {embedder: SemanticEmbedder; reranker: Reranker}` returns one
app-lifetime pair per runtime.

### 2.2 Interfaces and where each transform happens
```ts
export interface SemanticEmbedder { readonly runtime: EmbedRuntime;
  embedQuery(text: string): Promise<Int8Array>;        // length 256
  embedDocs(texts: readonly string[]): Promise<Int8Array[]>; }
export interface RerankHit { key: string; text: string }
export interface RerankedHit { key: string; score: number }
export interface Reranker { readonly runtime: EmbedRuntime;
  rerank(query: string, hits: readonly RerankHit[]): Promise<RerankedHit[]>; } // score desc, key-asc ties
export class EmbedNotReadyError extends Error { name = 'EmbedNotReadyError' }
```

| Step | Where | Exact rule |
|---|---|---|
| Length cap | `embedFormat.ts` `capText` | Code points (`Array.from`). `MAX_EMBED_CHARS=4000`, `MAX_RERANK_QUERY_CHARS=500`, `MAX_RERANK_DOC_CHARS=1200`. |
| Query prefix | `SemanticEmbedder.embedQuery` (`formatQuery`) | `PREFIX_QUERY + capText(text)`, where `PREFIX_QUERY = 'Instruct: Given a passage of Catholic liturgy, Scripture or commentary, retrieve passages relevant to this query\nQuery:'`. Documents get no prefix. |
| EOS append | Engine tokenizer | The GGUF carries `tokenizer.ggml.add_eos_token=true`, `add_bos_token=false` and eos id 151643 (read from the blob). Native passes `AddBos::Always`, which maps to `add_special=true` (`llama-cpp-2 model.rs str_to_token`). wllama tokenizes through llama.cpp's server path with `add_special`. Native asserts that the last token equals `model.token_eos()` and otherwise returns `Err("embed: EOS not appended")`. |
| Token cap | Native `embed_texts` | If the token count exceeds 2048, keep the first 2047 and push EOS. |
| Pooling | Engine | `LlamaPoolingType::Last` (embed) or `Rank` (rerank). wllama uses `pooling_type: 'last'` or `'rank'`. |
| Matryoshka, L2, int8 | `embedFormat.ts` `toStoredVector(v: Float32Array): Int8Array` | Take `v.subarray(0,256)`, then `mag = sqrt(Σx²) \|\| 1`, then `out[i] = max(-127, min(127, round(x/mag·127)))`. This is the rounding in `embed.ts:43`. It is invariant to any normalization an engine or Ollama applied first. |
| Rerank prompt | Native: from GGUF key `tokenizer.chat_template.rerank`, `{query}`/`{document}` replaced, `AddBos::Never`. wllama: `createRerank` does the same internally. | The template is the one stored in the pinned GGUF. No custom instruct is added, which keeps native/wllama parity. |
| Rerank score | Engine | `score = rank_output[0]`. That is P(yes) after the model's classifier with `qwen3.classifier.output_labels` len 2. wllama returns the same `relevance_score`. |

`CURRENT_EMBED_META` (`embedFormat.ts`) is the single source of truth for D5. It holds:
- `model`: `'qwen3-embedding-0.6b-q8_0'`
- `artifact_sha256`: the embedder digest
- `dim`: `'256'`
- `quant`: `'int8'`
- `prefix_query`: `PREFIX_QUERY`
- `prefix_doc`: `''`
- `norm`: `'l2'`

BA.10 and BA.14 import it, and they also import `MAX_EMBED_CHARS`. The `.mjs` scripts import it
under `--experimental-strip-types`, as `ingest-corpus.mjs:30` already does with `embed.ts`.

### 2.3 Tauri commands (`src-tauri/src/embedding.rs`). Closed set, Phase L.
```rust
#[tauri::command] pub fn embed_probe() -> serde_json::Value;
// {"nativeEmbed":bool,"llamaCpp":"atomic-llama-cpp-turboquant@8d93507810cd89b26bfb47148f2c1708cc3fa316","threads":u32,"maxTokens":2048}
#[tauri::command] pub async fn embed_load(path: String, role: String, expected_bytes: u64,
    expected_sha256: Option<String>) -> Result<String, String>;   // → "embed:<role>:<unix_ms>"
#[tauri::command] pub async fn embed_texts(session_id: String, texts: Vec<String>) -> Result<Vec<Vec<f32>>, String>; // each len 1024
#[tauri::command] pub async fn rerank_scores(session_id: String, query: String, documents: Vec<String>) -> Result<Vec<f32>, String>;
#[tauri::command] pub fn embed_unload(session_id: String) -> Result<(), String>;
```
- **JS argument names.** Tauri camelCases them: `expectedBytes`, `expectedSha256`, `sessionId`.
- **`embed_probe` and `embed_unload`** go beyond the three commands named in §L.8. `close()`
  needs `embed_unload`, and `resolveEmbedRuntime` needs `embed_probe`.
- **`embed_load`** runs in `spawn_blocking`. In order:
  1. It checks the file length against `expected_bytes`, else returns `Err("embed: artifact size mismatch")`.
  2. If `expected_sha256` is `Some`, it streams the sha256 (crate `sha2`, already a dependency),
     else returns `Err("embed: artifact digest mismatch")`.
  3. It loads with `LlamaModelParams::default()`. The build is CPU-only and no GPU feature is enabled.
  4. It checks the role against the GGUF metadata:
     - `embed` requires `meta_val_str("qwen3.pooling_type")=="3"`;
     - `rerank` requires `=="4"` and a present `tokenizer.chat_template.rerank`.
  5. It replaces any existing session of the same role.
- **Contexts** are created per call, as in `inference.rs:241`. The parameters are
  `with_n_ctx(NonZeroU32::new(2048))`, `with_n_batch(2048)`, `with_n_ubatch(2048)`,
  `with_n_threads(t)` and `with_n_threads_batch(t)` where `t = min(8, max(1, available_parallelism-1))`,
  `with_embeddings(true)`, `with_pooling_type(Last|Rank)`, and
  `with_type_k(KvCacheType::F16)`/`with_type_v(KvCacheType::F16)`.
  - "No turbo KV" (D2) means these F16 KV types.
  - All of these setters exist in llama-cpp-2 0.1.154 (`context/params/get_set.rs` :21, 53, 83,
    172, 202, 262, 523, 552, 582).
- **Per text or document:** `ctx.clear_kv_cache()`, then `batch.add_sequence(&tokens, 0, false)`,
  then `ctx.decode`, then `ctx.embeddings_seq_ith(0)?.to_vec()`.
  - A rerank prompt over 2048 tokens returns `Err("embed: rerank prompt exceeds context")`. The
    §2.2 character caps make this unreachable in practice.
- **Shared backend.** `inference::backend()` becomes `pub(crate)` and is reused, because the
  llama backend is process-global.
- **Sessions** live in `static EMBED_SESSIONS: Mutex<Option<HashMap<String, EmbedSession>>>`.
  `EmbedSession {model: LlamaModel, role: EmbedRole, rerank_template: Option<String>}` carries
  the same `unsafe impl Send` justification as `inference.rs:58-64`.
- **Stubs** compile under `cfg(any(not(feature="native-inference"), target_pointer_width="32"))`:
  - `embed_probe` returns `nativeEmbed:false`;
  - the other commands return `Err("native embedding is not compiled into this build (32-bit target)")`.

### 2.4 `models/manifest.json` and `EMBED_MODEL_ASSETS`. Closed set, Phase L.
The committed source is `VENDORED/models/manifest.json`. It is published unchanged at
`https://sanctissimissa.robin.mba/models/manifest.json`.
```json
{ "schema": "sam.runtime-assets.v1", "host": "https://sanctissimissa.robin.mba",
  "assets": [ { "id": "…", "kind": "…", "fileName": "…", "mirror_url": "…", "sha256": "…",
    "size_bytes": 0, "upstream_url_of_record": "…", "upstream_revision": "…", "license": "…",
    "mirrored_at": null, "android_pack": null, "runtime_path": null } ] }
```
- `kind` is one of `'embedder-gguf' | 'reranker-gguf' | 'wllama-wasm' | 'wllama-compat-wasm' | 'wllama-compat-js' | 'supertonic' | 'module-db'`.
  Closed set, Phase L. The last two are authored by their own partials.
- `mirrored_at` is an ISO date that `mirror-model-assets.mjs --verify-remote` writes.
- The upstream URL is **provenance only, never fetched at runtime**.
- **No `signature` field.** The sha256 is compiled into the binary through `EMBED_MODEL_ASSETS`,
  which is a stronger pin for fixed artifacts than a detached signature.

| id | kind | fileName | sha256 | size_bytes | mirror_url (robin.mba) | upstream_url_of_record @ revision | android_pack |
|---|---|---|---|---|---|---|---|
| `qwen3-embedding-0.6b-q8_0` | embedder-gguf | `Qwen3-Embedding-0.6B-Q8_0.gguf` | `06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439` | 639150592 | `/models/sha256/06507c7b…e439/Qwen3-Embedding-0.6B-Q8_0.gguf` | `https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/resolve/370f27d7550e0def9b39c1f16d3fbaa13aa67728/Qwen3-Embedding-0.6B-Q8_0.gguf`. The bytes are identical to Ollama blob `qwen3-embedding:0.6b`: the local manifest layer digest equals the HF LFS oid. | `embed_model_pack` |
| `qwen3-reranker-0.6b-q8_0` | reranker-gguf | `qwen3-reranker-0.6b-q8_0.gguf` | `22c9979ce4fbcdc5acdc310c6641c32797eff1aa980b8f7a2db8a8ea23429a48` | 639153184 | `/models/sha256/22c9979c…9a48/qwen3-reranker-0.6b-q8_0.gguf` | `https://huggingface.co/ggml-org/Qwen3-Reranker-0.6B-Q8_0-GGUF/resolve/a02f48bb4f057028298c21fa033da2b30d7742d5/qwen3-reranker-0.6b-q8_0.gguf`. Apache-2.0; `qwen3.pooling_type=4`. | `rerank_model_pack` |
| `wllama-3.8.1-wasm` | wllama-wasm | `wllama.wasm` | `551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c` | 8763949 | `/vendor/wllama/3.8.1/wllama.wasm` | npm `@wllama/wllama@3.8.1` `esm/wasm/wllama.wasm`, integrity `sha512-Pl7BEJhPU8OHnV/yhn3DFZYhLLOdSHh+4TND79WCftHnlUAdQPAsyc/CfIOY+4mVxvf5VW3Xw3Uf7BBfotS1gw==`, MIT | — |
| `wllama-compat-3.8.1-wasm` | wllama-compat-wasm | `wllama.wasm` | `2db3f67d0bcc19cdf8f14f129e46cab691bff898954808f8a2dc4c586eb5bb68` | 16005007 | `/vendor/wllama/3.8.1/compat/wllama.wasm` | npm `@wllama/wllama-compat@3.8.1` `wasm/wllama.wasm`, integrity `sha512-IvmjrJ+JzDbt3w1FQq1yAmnFEiLGCceowK2Q80zW+k9ChFkPBM1ByX/9xm2xVxyd8MHC50VpuDo6SDE83k9kIQ==`, MIT | — |
| `wllama-compat-3.8.1-js` | wllama-compat-js | `wllama.js` | `2649eeb408988841c372e54805adfa25aed5d02f850c09add78c2f3ac0f3fce1` | 171615 | `/vendor/wllama/3.8.1/compat/wllama.js` | same package, `wasm/wllama.js` | — |

- **`runtime_path`** is `/vendor/wllama/3.8.1/<…>` for the three wllama rows and `null` for the
  GGUFs. wllama bytes are served from the app's own origin: they are bundled from `public/`, and
  the robin.mba copy is the byte-identical mirror (§5 S7). GGUFs are fetched from `mirror_url`
  or read from a Play asset pack.
- **Full mirror_url** is `https://sanctissimissa.robin.mba` + the path. Paths follow the
  model-store layout (`store.ts:20`), so each object URL is immutable.
- **`EMBED_MODEL_ASSETS`** (`src/core/vector/assets.ts`) is a `const` record keyed by
  `EmbedAssetId = 'qwen3-embedding-0.6b-q8_0' | 'qwen3-reranker-0.6b-q8_0'` (Closed set,
  Phase L). Each value is
  `{role: EmbedRole, asset: ModelAsset /* {sha256, bytes, fileName} */, mirrorUrl: string, androidPack: 'embed_model_pack'|'rerank_model_pack'}`.
  `scripts/mirror-model-assets.mjs --check` fails if it differs from the manifest rows.
- **Mirror host headers** (an operator act on the robin.mba host):
  - `Access-Control-Allow-Origin: *`
  - `Access-Control-Allow-Headers: Range`
  - `Access-Control-Expose-Headers: Content-Length, Content-Range, Accept-Ranges, ETag`
  - `Accept-Ranges: bytes`
  - `Cache-Control: public, max-age=31536000, immutable` on `/models/sha256/**` and
    `/vendor/**`; `no-cache` on `manifest.json`

  The web PWA is served from `sanctissimissa.surge.sh` (`scripts/deploy-web.mjs:23`), so model
  fetches are cross-origin. The Tauri CSP already allows `connect-src https:`.

### 2.5 Vendored layout (#4) and fork pin (#5)
- **Model files.** `VENDORED/models/sha256/<digest>/<fileName>` holds the two GGUFs above.
  Add `.gitattributes` rule `VENDORED/models/**/*.gguf filter=lfs diff=lfs merge=lfs -text`; the
  repo already uses Forgejo LFS (.gitattributes:1).
- **`VENDORED/models/PROVENANCE.md`** has one section per row: upstream URL@revision, licence,
  the date fetched, the fetch command (`curl -L -o`), and the verified sha256 and size.
- **Fork pin.** `AtomicBot-ai/atomic-llama-cpp-turboquant`, default branch `dev`, HEAD
  **`8d93507810cd89b26bfb47148f2c1708cc3fa316`** (2026-10-27, "Merge pull request #96"), MIT.
  It is a fork of `TheTom/llama-cpp-turboquant`.
- **Bridge pin: `llama-cpp-2 = "=0.1.154"` and `llama-cpp-sys-2 = "=0.1.154"`**, crates.io
  cksums `4397360a0bd81be29929a55ad2f49eba27a744a6578f3271894d6f41d86bd15b` and
  `13a9ea2ce0cdc20bcb1870534022e340b391663f8fe09133951e2fe37fbc29cf`.
  - **Reason.** 0.1.154's upstream llama.cpp pin `5f55650a78f92aff4d48d671423e888fac0469ff` is
    an **ancestor** of the fork HEAD. GitHub compare returns status `ahead`, `behind_by 0`.
  - **Why not newer bridges.** Every newer bridge's pin is *not* in the fork:
    - 0.1.155/156 pin `e79e4bf6…`: behind_by 107.
    - 0.1.157–159: behind_by 776.
    - 0.1.160/161: behind_by 1131.
  - **What 0.1.154 provides.** It has every API used here: `LlamaPoolingType::{Last=3, Rank=4}`,
    `embeddings_seq_ith`, `n_cls_out`, `meta_val_str`, `str_to_token`, `token_eos`.
- **Vendored sys crate.** `VENDORED/llama-cpp-sys-2-0.1.154-atomic/` holds the published crate
  `llama-cpp-sys-2-0.1.154.crate`, unpacked, with its `llama.cpp/` directory **replaced** by
  `git archive 8d93507810cd89b26bfb47148f2c1708cc3fa316` of the fork.
  - It uses no `.git` and no submodule; this follows decision 8's vendored-snapshot rule.
  - `build.rs` reads the source from `CARGO_MANIFEST_DIR/llama.cpp` (llama-cpp-sys-2 `build.rs:400`).
  - `PROVENANCE.md` in that directory records the crate cksum, the fork sha and date, and the
    compare result above.

## 3. Flows

**F1: Cargo and Windows (D10/D11).**
- **`src-tauri/Cargo.toml` :20-29** becomes:
  ```toml
  [features]
  default = ["native-inference"]
  native-inference = ["dep:llama-cpp-2", "dep:llama-cpp-sys-2"]

  # CP.7 + §L native engine (D10/D11): every 64-bit target incl. Windows (cargo-xwin, clang ≥ 19).
  # 32-bit Android (armv7, x86) stays outside llama.cpp's reliable support and uses wllama.
  [target.'cfg(target_pointer_width = "64")'.dependencies]
  llama-cpp-2 = { version = "=0.1.154", optional = true, default-features = false, features = ["android-shared-stdcxx"] }
  llama-cpp-sys-2 = { version = "=0.1.154", optional = true }

  [patch.crates-io]
  llama-cpp-sys-2 = { path = "../VENDORED/llama-cpp-sys-2-0.1.154-atomic" }
  ```
- **Why `default-features = false`.** It drops `openmp` and `common`:
  - The xwin MSVC sysroot has no OpenMP runtime.
  - Nothing in this repo uses llama.cpp `common/`.
  - The resulting feature set is identical on every target.
  - `android-shared-stdcxx` keeps today's Android stdc++ linkage. It is the default feature, and
    it is a no-op off Android.
- **`inference.rs`.** The 21 `all(...)` lines become
  `#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]`. The 7 `any(...)`
  lines become `#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]`.
  The text at :80 and :121 changes to "native engine not compiled into this build (32-bit
  target)", and `fn backend` (:38) becomes `pub(crate) fn backend`.
- **`scripts/build-windows.sh`.** Insert after :10:
  ```bash
  export PATH="/usr/lib/llvm-19/bin:$PATH"   # D11: clang-cl/lld-link/llvm-lib ≥ 19 for llama.cpp
  CLANG_MAJOR="$(clang-cl --version | sed -n 's/.*clang version \([0-9]*\).*/\1/p' | head -1)"
  [ "${CLANG_MAJOR:-0}" -ge 19 ] || { echo "clang-cl ≥ 19 required (apt install clang-19 lld-19 llvm-19)" >&2; exit 1; }
  ```
  - The packages `clang-19 lld-19 llvm-19` (`1:19.1.1-1ubuntu1~24.04.2`) are an Ubuntu build-host
    prerequisite, recorded in BA.12.
  - `/usr/local/bin/clang-cl` is not edited; the PATH is script-local.
  - The Windows build environment builds natively with MSVC and is unaffected.

**F2: Asset pipeline, from repository to device.**
1. `VENDORED/models/**` (LFS) is the offline source.
2. `scripts/mirror-model-assets.mjs --stage` writes `dist-runtime-assets/`, which `dist-*/` in
   `.gitignore` already ignores. Its contents:
   - `models/sha256/<d>/<file>`
   - `models/manifest.json`
   - `vendor/wllama/3.8.1/{wllama.wasm, compat/wllama.wasm, compat/wllama.js}`, taken from
     `node_modules`

   Every sha256 and size is verified against the manifest.
3. **Operator act:** upload that tree to the robin.mba document root, with the §2.4 headers.
4. `--verify-remote` makes a HEAD request plus a full streamed GET of every `mirror_url`, checks
   the sha256 and size, and writes `mirrored_at`.
5. `--check` is side-effect free. It compares the manifest, `EMBED_MODEL_ASSETS` and the
   vendored files.

Mirrored objects are never deleted or overwritten. A new model means a new digest directory (I3).

**F3: Android Play asset packs (decision 18, R3).**
- **Pack modules:** `src-tauri/gen/android/embed_model_pack/build.gradle.kts` and
  `…/rerank_model_pack/build.gradle.kts`:
  ```kotlin
  plugins { id("com.android.asset-pack") }
  assetPack { packName.set("embed_model_pack"); dynamicDelivery { deliveryType.set("on-demand") } }
  ```
- **Wiring:**
  - `settings.gradle` gains `include ':embed_model_pack', ':rerank_model_pack'`.
  - `app/build.gradle.kts` `android {}` gains
    `assetPacks += listOf(":embed_model_pack", ":rerank_model_pack")`.
  - Dependencies gain `implementation("com.google.android.play:asset-delivery-ktx:2.3.0")`, the
    latest release on Google Maven.
- **Staging.** `scripts/stage-model-packs.mjs` copies each GGUF from `VENDORED` to
  `<pack>/src/main/assets/models/<fileName>`. It verifies sha256 and size and skips the copy if
  the destination is already identical. `.gitignore` adds
  `src-tauri/gen/android/*_model_pack/src/main/assets/`.
- **When staging runs.** It runs before every Android build:
  - `package.json` `build:android`:
    `node scripts/pre-build-gate.mjs && node scripts/stage-model-packs.mjs && tauri android build --apk --aab`;
  - `scripts/release-state.mjs` `android-release`: insert
    `execSync('node scripts/stage-model-packs.mjs', inherited)` before :535.
- **Where the packs go.** The AAB carries both packs. Gradle's APK has none, so sideload devices
  download from `mirror_url`.
- **`ModelPackPlugin.kt`** (`…/java/mba/robin/sanctissimissa/`, `@TauriPlugin`):
  - **Argument and pack names.** `@InvokeArg class PackArgs { lateinit var pack: String }`. The
    pack must be `embed_model_pack` or `rerank_model_pack`, else reject.
  - **`@Command location`** returns `{status, path?}`. `path` is
    `getPackLocation(pack).assetsPath()+"/models/"+fileName` when the pack status is COMPLETED.
  - **`@Command fetch`** calls `requestFetch(listOf(pack))` and returns `{status}`.
  - **`@Command state`** returns `{status, bytesDownloaded, totalBytes}`.
  - **`@Command confirmCellular`** calls `showConfirmationDialog(activity)`.
  - **`status`** is one of
    `'ready'|'pending'|'downloading'|'transferring'|'waiting-wifi'|'requires-confirmation'|'not-installed'|'failed'|'canceled'|'unknown'|'unsupported'`.
    Closed set, Phase L. `'unsupported'` covers both a thrown `AssetPackException` with
    `API_NOT_AVAILABLE`/`APP_UNAVAILABLE` and the case where Play services are absent.
- **`src-tauri/src/model_pack.rs`:**
  - `pub fn init() -> TauriPlugin<R>` (`plugin::Builder::new("model-pack")`). Its setup calls
    `api.register_android_plugin("mba.robin.sanctissimissa", "ModelPackPlugin")` under
    `#[cfg(target_os="android")]` and manages the handle.
  - App commands `model_pack_location|model_pack_fetch|model_pack_state|model_pack_confirm_cellular(pack: String) -> Result<serde_json::Value,String>`
    call `run_mobile_plugin`. Off Android they return `{"status":"unsupported"}`.
  - These are app commands, so they need no ACL.

**F4: `ModelPreloader` (`src/core/vector/preload.ts`).**
`startModelPreload(after: Promise<unknown>)` is idempotent.
1. **Order.** It awaits `after`, which is the K.4 Supertonic background-init promise (TT.1). This
   gives L.4's "after Supertonic". It then runs the embedder first and the reranker second,
   sequentially.
2. It calls `runtime = await resolveEmbedRuntime(companionInvoke())`.
3. **Picking the source per model:**
   - **native on Android:** if `model_pack_location` returns `ready`, use that path with
     `verify: true`. If it returns `unsupported`, use the DownloadManager. Otherwise call
     `model_pack_fetch`, poll `model_pack_state` every 2 s, and treat `waiting-wifi` or
     `requires-confirmation` as `waiting-metered`.
   - **native on desktop:** `makeLibrary(invoke, storageRootName())` (as `ModelPicker.tsx` does),
     then `lookup(asset)`. If missing, `DownloadManager.acquire(asset, mirrorUrl, asset.sha256, id)`.
     The locator path is used with `verify: false`, because `model_finish` already proved the
     digest.
   - **wllama:** always `WebModelLibrary` (OPFS), even inside Tauri. The webview cannot read
     native paths. Download the same way, then call `WebModelLibrary.readFile(asset): Promise<File>`.
     `readFile` is new in `store.ts`, returning the `File` of `models/sha256/<d>/<fileName>`.
4. **Metered rule.** One rule is shared with L.6: `isMetered()` in `src/core/net/metered.ts`
   returns `connection.saveData === true || connection.type === 'cellular' || ['slow-2g','2g','3g'].includes(connection.effectiveType)`.
   An absent `navigator.connection` counts as unmetered.
   - **Before any download on a metered connection:** the state becomes `waiting-metered` until
     `consentMetered()` is called.
   - **Scope of consent:** consent lasts for the session and is not persisted.
   - **On Android packs:** `consentMetered()` also calls `model_pack_confirm_cellular`.
5. **Load:**
   - native: `NativeEmbedEngine.init({modelId: id, artifactUrl: path, contextTokens: 2048})`.
   - wllama: `WllamaEmbedEngine.init(...)` with the `File`.

   Then the state becomes `ready`.
6. **Failure.** A failed step sets that model's state to `error` with its `reason`. Nothing is
   retried automatically; `retry()` restarts the failed model.
   - If the embedder fails, the app stays on the D7 fallback.
   - If the reranker fails, search returns vector order without reranking.
7. **Readiness API**, consumed by BA.14's D7 selector and by the Settings row:
   - `embedReadiness(): {runtime: EmbedRuntime|null; embed: ModelState; rerank: ModelState; progress: number; reason?: string}`
   - `subscribeEmbedReadiness(cb): () => void`
   - `isEmbedReady(): boolean`
   - `isRerankReady(): boolean`

**F5: Engines.**
- **`NativeEmbedEngine implements IInferenceEngine`** (`reusable-chatbot/engines/native/embed.ts`):
  - `probe()` calls `embed_probe` and returns
    `{runtime:'tauri'|'android', backend:'turboquant-native', kvFormats:['f16'], weightFormats:['Q8_0'], maxContextTokens:2048}`.
  - `init(config)` calls `embed_load`, deriving `role` and `expected*` from `EMBED_MODEL_ASSETS[config.modelId]`.
  - `embed?(session, texts)` sends chunks of 32 to `embed_texts`, then returns
    `Float32Array.from` each 1024-d row.
  - **`batchScore(session, {items})`:**
    - Every item must be `{context:[{role:'user', content: query}], continuation: doc}` with one
      shared `query`. Otherwise it throws `'embed: batchScore requires one shared query'`.
    - It calls `rerank_scores` and returns a `Float32Array` in item order.
  - **Other methods:**
    - `generate` throws `'embedding engine: generate unsupported'`;
    - `kvStats` returns zeros;
    - `reset` is a no-op;
    - `close` calls `embed_unload`.
  - **Serialization:** calls are serialized by a private promise chain.
  - **Diagnostics:** each call emits
    `debugEvent('embed', 'texts'|'rerank', {n, ms, runtime})` (`diagnostics/store.ts:60`).
- **`WllamaEmbedEngine implements IInferenceEngine`** (`reusable-chatbot/engines/wllama/embed.ts`):
  - **Construction.** It constructs `new Wllama({default: '/vendor/wllama/3.8.1/wllama.wasm'}, {suppressNativeLog: true})`,
    then **immediately** calls
    `setCompat({wasm: '/vendor/wllama/3.8.1/compat/wllama.wasm', worker: '/vendor/wllama/3.8.1/compat/wllama.js'})`.
    The constructor defaults compat to jsDelivr (`wllama.ts:217`, `wasm-from-cdn.ts`).
  - **Load.** `loadModel([file], {n_ctx: 2048, n_batch: 2048, n_ubatch: 2048, n_threads: 1, n_gpu_layers: 0, embeddings: true, pooling_type: 'last'|'rank'})`.
    - `n_threads: 1` is D2's single-thread rule; wllama then uses pthread 0 (`wllama.ts:486-500`).
    - `n_gpu_layers: 0` runs on CPU, like native.
  - **Embed and score.**
    - `embed?` calls `createEmbedding({input: texts})` in chunks of 8.
    - `batchScore` follows the same item rule as native. It calls
      `createRerank({query, documents})`, then maps `results[].index` to
      `results[].relevance_score` in item order.
  - **Other methods.** `close` calls `exit()`. Two instances exist, one per role.
- **`SemanticEmbedder`/`Reranker`** (`src/core/vector/embedder.ts`) wrap the engines:
  - `embedQuery(t)` is
    `toStoredVector((await engine.embed!(sid, [formatQuery(t)]))[0])`. It rejects with
    `EmbedNotReadyError` until the state is `ready`.
  - `embedDocs` maps `capText` without a prefix.
  - `rerank(q, hits)` calls
    `batchScore(sid, {items: hits.map(h => ({context:[{role:'user', content: capText(q,500)}], continuation: capText(h.text,1200)}))})`
    and sorts by score descending, with stable key-ascending ties.

**F6: Web hosting of wasm.**
- **Copy step.** `scripts/vendor-wllama.mjs` copies the three files from
  `node_modules/@wllama/wllama/esm/wasm/` and `node_modules/@wllama/wllama-compat/wasm/` into
  `public/vendor/wllama/3.8.1/`. It verifies each sha256 against the manifest and exits 1 on
  mismatch.
- **Where it runs.** It is chained into `predev`, `prebuild` and `prebuild:vite`, after
  `sync-db.mjs`.
- **Ignored output.** `public/vendor/wllama/` is gitignored.
- **package.json** pins exactly `"@wllama/wllama": "3.8.1"` and `"@wllama/wllama-compat": "3.8.1"`.
- **`vite.config.ts` workbox:**
  - adds `globIgnores: ['vendor/wllama/**']`;
  - adds runtime route
    `{urlPattern: /\/vendor\/wllama\/3\.8\.1\//, handler: 'CacheFirst', options: {cacheName: 'sanctissimissa-wllama-3.8.1', expiration: {maxEntries: 3}}}`.
  - GGUFs are cross-origin and match no route, so they are never in any service-worker cache.
    They live only in OPFS.
- **`tauri.conf.json` CSP.** Append `; worker-src 'self' blob:`, because wllama spawns its
  worker from a blob URL (`utils.ts:345-350`). This only takes effect on 32-bit Android.
- **No COOP/COEP is added anywhere.**

**F7: Settings surface.**
- **Host change.** `src/ui/SearchModelsRow.tsx` is a new file. `SettingsView.tsx` imports it and
  renders `<SearchModelsRow />` directly after `<ModelPicker …/>` (:249), under `<h3>Search models</h3>`.
- **Selectors:**
  - the `#search-models-row` section;
  - the `#search-models-status` span;
  - the `#search-models-download` button. It is visible only in `absent`, `waiting-metered` and
    `error`. It calls `consentMetered()`, or `retry()` when in error.
- **Status text.** A closed set, Phase L, driven by the embedder state:

  | State | Status text |
  |---|---|
  | `absent`/`waiting-metered` | `Search models not downloaded (≈1.28 GB)` |
  | `downloading` | `Downloading search models — <pct>%` |
  | `verifying` | `Verifying search models…` |
  | `loading` | `Loading search models…` |
  | `ready` | `Semantic search ready`. Append ` (reranking unavailable)` if the reranker is in `error`. |
  | `error` | `Search models unavailable — <reason>` |

- **Button text** is `⬇ Download search models`, or `Retry` in `error`.
- **App wiring.** App.tsx gains `import { startModelPreload } from './core/vector/preload.ts'`
  and, after the effect at :317-322, `useEffect(() => { startModelPreload(<K.4 init promise>); }, []);`.

## 4. Entity table

The local SDK doc paths are under `DOCS/sdk/`. **(gap)** marks a snapshot that is not on the list
being created.

| Entity | Type | File:line (target) | Signature/fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance (observable; no unit tests) | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| Cargo features/deps/patch | config | `src-tauri/Cargo.toml:20-29` | F1 block | — | D2, D10, #5, R1 | BA.12 | `cargo tree -i llama-cpp-sys-2 --target x86_64-pc-windows-msvc` and `--target aarch64-linux-android` both print `v0.1.154 (…/VENDORED/llama-cpp-sys-2-0.1.154-atomic)`. `grep -c 'target_os = "windows"' src-tauri/Cargo.toml src-tauri/src/inference.rs` gives 0. | llama-cpp-2, atomic-llama-cpp-turboquant |
| Vendored sys crate + fork snapshot | vendored source | `VENDORED/llama-cpp-sys-2-0.1.154-atomic/` + `PROVENANCE.md` | §2.5 | — | decision 8, #5 | BA.12 | `PROVENANCE.md` records the fork sha `8d935078…`. `diff -r` against a fresh `git archive` of that sha is empty. | atomic-llama-cpp-turboquant |
| Gate removal + `pub(crate) backend` | Rust edit | `src-tauri/src/inference.rs:13-354`, :38, :80, :121 | F1 | — | D10 | BA.12 | The Windows exe Diagnostics shows `inference_probe` with `nativeInference:true`. | tauri-plugins-ipc |
| `embedding.rs` commands | Rust module (<500 lines) | `src-tauri/src/embedding.rs` (new) | §2.3 | `EmbedRole` closed, Phase L | D1–D3, D10 | BA.12 | Linux, Windows and Android-arm64 artifacts show these in Diagnostics: `embed_probe.nativeEmbed=true`; an `embed/texts` event with `dim:1024`; `rerank` scores in [0,1]. Rubric L.7-10 parity ≥ 0.99. | llama-cpp-2, qwen3-embedding, qwen3-reranker |
| `lib.rs` wiring | Rust edit | `src-tauri/src/lib.rs:69-70`, :75-93 | Adds `mod embedding; mod model_pack;`, `.plugin(model_pack::init())`, and handler entries `embedding::{embed_probe, embed_load, embed_texts, rerank_scores, embed_unload}` and `model_pack::{model_pack_location, model_pack_fetch, model_pack_state, model_pack_confirm_cellular}`. | handler list closed, Phase L | D2, R3 | BA.12 | Each command answers from the devtools console, `__TAURI_INTERNALS__.invoke('embed_probe')`. | tauri-plugins-ipc |
| Capability ids | config (unchanged) | `src-tauri/capabilities/default.json` | No entries. App commands need none, because `build.rs` has no app manifest. | — | §1 fact | BA.12 | The same console calls succeed with `default.json` unchanged. | tauri-plugins-ipc |
| Windows cross toolchain | script edit | `scripts/build-windows.sh` after :10 | F1 | — | D11, CC11 | BA.12 | The build log prints clang 19.x. The `sanctissimissa.exe` from the cross-build passes rubric row L.7-10. | — |
| `ModelPackPlugin` + `model_pack.rs` + pack modules + `stage-model-packs.mjs` | Kotlin/Rust/Gradle/script | F3 paths | F3 | pack status closed, Phase L; pack names closed | decision 18, R3 | BA.12 | `bundletool dump manifest --module embed_model_pack` on the AAB shows `on-demand`. On an internal-track install the Settings row goes through `downloading` to `ready` with no robin.mba request. The sideload APK falls back to `mirror_url`. | play-asset-delivery **(gap)**, tauri-plugins-ipc |
| `VENDORED/models/**` + `PROVENANCE.md` + LFS rule | vendored artifacts | `VENDORED/models/`, `.gitattributes` | §2.5 | — | #4, decision 8 | BA.12 | `mirror-model-assets.mjs --check` exits 0 on a clean clone after `git lfs pull`. | qwen3-embedding, qwen3-reranker |
| `models/manifest.json` | data | `VENDORED/models/manifest.json` | §2.4 | `kind` closed, Phase L | R3, #3 | BA.12 (rows here); audiobook and modules partials (their rows) | `--verify-remote` reports every row matching, with `mirrored_at` set. | — |
| `mirror-model-assets.mjs` | script | `scripts/mirror-model-assets.mjs` | `--stage \| --verify-remote \| --check` | modes closed | R3 | BA.12 | `--check` is side-effect free and re-runnable. | — |
| `EMBED_MODEL_ASSETS`, `EmbedAssetId` | TS const | `src/core/vector/assets.ts` (new) | §2.4 | closed, Phase L | D1, D3, R3 | BA.12 | `--check` asserts equality with the manifest. | — |
| `NativeEmbedEngine` | TS class | `reusable-chatbot/engines/native/embed.ts` (new) | F5 | — | D2 | BA.12 | Same evidence as `embedding.rs`. | llama-cpp-2, tauri-plugins-ipc |
| `WllamaEmbedEngine` | TS class | `reusable-chatbot/engines/wllama/embed.ts` (new) | F5 | — | D2, R1 (wllama for embeddings only) | BA.13 | On the web build, the DevTools network log shows wasm only from `/vendor/wllama/3.8.1/` and no `cdn.jsdelivr.net` or `huggingface.co`. `crossOriginIsolated===false`. The Firebase sign-in popup still works. Rubric L.7-10 web parity ≥ 0.99. | wllama-3.8.1 |
| wllama deps + `vendor-wllama.mjs` + gitignore | package/script | `package.json`, `scripts/vendor-wllama.mjs`, `.gitignore` | F6 | — | D2, R3, #3 | BA.13 | `dist-web/vendor/wllama/3.8.1/` hashes equal the manifest. | wllama-3.8.1 |
| Workbox exclusion + route | config | `vite.config.ts:39-46` | F6 | — | #20 | BA.13 | The built `sw.js` precache list contains no `vendor/wllama` entry. A returning visitor gets cache `sanctissimissa-wllama-3.8.1` only after search first runs. | — |
| CSP `worker-src` | config | `src-tauri/tauri.conf.json` `app.security.csp` | F6 | — | D2 | BA.13 | On a 32-bit Android build, search reaches `ready` with no CSP violation in the console. | tauri-plugins-ipc |
| `EmbedRuntime`, `resolveEmbedRuntime`, `embedderFor`, `SemanticEmbedder`, `Reranker`, `RerankHit`, `RerankedHit`, `EmbedNotReadyError` | TS types/functions | `src/core/vector/embedder.ts` (new) | §2.1, §2.2, F5 | `EmbedRuntime` closed, Phase L | D1–D3, #22 | BA.13 | The Diagnostics `embed` events carry the `runtime` that the §2.1 table gives for each artifact. | — |
| `toStoredVector`, `formatQuery`, `capText`, `PREFIX_QUERY`, `MAX_*`, `CURRENT_EMBED_META` | TS module | `src/core/vector/embedFormat.ts` (new) | §2.2 | constants closed, Phase L | D1, D5 | BA.13 (consumed by BA.10, BA.14) | `embed_meta` in the new corpus equals `CURRENT_EMBED_META`, shown by BA.14's attach check. Parity row L.7-10. | qwen3-embedding |
| `ModelPreloader` (`startModelPreload`, `consentMetered`, `retry`, `embedReadiness`, `subscribeEmbedReadiness`, `isEmbedReady`, `isRerankReady`) | TS module | `src/core/vector/preload.ts` (new) | F4 | `ModelState` closed, Phase L | L.4, R3, D7 | BA.13 | DevTools throttling set to "3G" puts the status at the absent text plus the download button. Tapping the button moves it through `downloading`, then `ready`. Before `ready`, Meaning search still answers through FTS (D7). | media-session (n/a), play-asset-delivery **(gap)** |
| `isMetered` | TS function | `src/core/net/metered.ts` (new) | F4 step 4 | — | L.6 rule | BA.13 (L.6 consumes it) | It gives the same verdict as the audiobook dock under the same throttling. | — |
| `WebModelLibrary.readFile` | TS method | `src/core/model-store/store.ts` (after :290; file stays < 500 lines) | `(asset: ModelAsset) => Promise<File>` | — | F4 | BA.13 | The web search reaches `ready` from OPFS after a reload while offline. | — |
| `SearchModelsRow` + host import | TSX | `src/ui/SearchModelsRow.tsx` (new); `SettingsView.tsx:249` | F7 | status text closed, Phase L | L.4 consent | BA.13 | The selectors in F7 render with live state, and specimen text never appears. | — |
| App wiring | TSX edit | `src/App.tsx` after :322 | F7 | — | L.4 | BA.13 | The Diagnostics timeline shows `embed` loads after the voice-init event. | — |

**Task ordering.** BA.12 comes before BA.13, and BA.13 comes before BA.14.
- BA.13 depends on TT.1, the K.4 init promise.
- BA.10 imports `embedFormat.ts` from BA.13.
- No BA.16 is needed: every row fits BA.12 or BA.13.

## 5. Supersessions recorded

All of the following were ratified by R1, except the clarifications marked as such.

**S1. wllama.**
- **Old (AR:783):** "wllama dropped (operator decision 2026-09-07)".
- **New:** this is superseded **for embedding and reranking only**. wllama 3.8.1 runs
  single-threaded on web/PWA and on 32-bit Android. wllama generation stays dropped.

**S2. Local inference.**
- **Old (§K.3, AR:2540):** "Local inference: Not in this release".
- **New:** this is clarified to mean chatbot generation only. On-device embedding and reranking
  ship (D2).
- **Side effect:** native *generation* code now compiles on Windows (S3). Its UI gate (K.3,
  hosted-only picker) is unchanged.

**S3. Windows.**
- **Old:** the Windows exclusion in `Cargo.toml:24-27` and `inference.rs:80, :120-121`.
- **New:** superseded by D10/D11 (Windows is never excluded; cross toolchain clang ≥ 19).

**S4. llama-cpp-2 version.**
- **Old:** 0.1.156 (`Cargo.lock`).
- **New:** `=0.1.154`. Its llama.cpp pin is an ancestor of the pinned fork, and no newer bridge's
  pin is (§2.5).
- **Submodule versus vendored copy:** the audit's submodule suggestion (#5) is replaced by a
  vendored snapshot, per decision 8.

**S5. Android ABIs (clarification of D2).**
- **Old D2 wording:** wllama runs on "Android ABIs other than arm64".
- **New reading:** wllama runs on ABIs where the native engine is not compiled (32-bit:
  armeabi-v7a, x86). Android x86_64 compiles the native engine (`target_pointer_width = "64"`)
  and uses it.
- **Reason:** this follows D2's own rationale, "one artifact everywhere gives exact parity".

**S6. L.4 "pinned … in the existing content-addressed model store".**
- **Old:** both models live in the content-addressed model store on every target.
- **New:** this holds for desktop and wllama. Play-installed Android reads the GGUFs from
  on-demand asset packs (decision 18, R3), each verified by `embed_load` with `expected_sha256`.

**S7. Where the wllama wasm is served (reading of R3).**
- **Old L.4 wording:** "wasm self-hosted (not jsDelivr)".
- **New:** this is made concrete as follows:
  - the runtime bytes come from the app's own origin, bundled through `public/vendor/wllama/3.8.1/`;
  - they are byte-identical to the robin.mba mirror rows;
  - the compat assets are self-hosted the same way, overriding wllama's jsDelivr default.
- **Reason:** the worker and the wasm must be same-origin for the worker spawn, and the app must
  work offline.

**S8. Decision 4, byte-stability.**
- **Old:** decision 4 required byte-stable vectors across platforms.
- **New:** byte-stability is waived for model-computed query vectors (D4, R1), and the parity
  gate replaces it. `embed.ts:1-8`'s claim of byte-stability becomes historical once BA.14
  retires `embedText`.
