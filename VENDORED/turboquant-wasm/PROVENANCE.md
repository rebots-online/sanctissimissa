# VENDORED/turboquant-wasm — TurboQuant browser inference reference (provenance lock)

Written BEFORE assimilation per INC-15 (vendor-clone-at-home; provenance lock
before assimilation; additive — nothing deleted). This is a **reference subset**,
not the full upstream repo: only the files the Liturgibot web engine
(`reusable-chatbot/engines/webgpu|wasm`) is generalizing from.

## Source

- **Work:** `teamchong/turboquant-wasm` — TurboQuant (polar + QJL) WASM-SIMD
  codec and the WebGPU in-browser LLM demo ("Gemma 4 E2B in-browser LLM whose
  KV cache is TurboQuant-compressed"; attention consumes the TQ-compressed KV
  directly in WGSL — no decompression).
- **License:** MIT (© Steven Chong), `reference/LICENSE`.
- **npm package:** `turboquant-wasm@0.4.1` (the runtime dependency we install;
  this vendored subset is for the engine *extraction* the npm package does not
  ship — the demo's WebGPU LLM engine and its 33 WGSL shaders).

## Retrieval

- **Method:** `git clone --depth 1 https://github.com/teamchong/turboquant-wasm`
  cloned once, at home, into `/tmp`; selected files copied here; `.git/` removed.
- **Remote:** `https://github.com/teamchong/turboquant-wasm`
- **Branch / commit:** `main` @ `1301ecade39a48c7f44b2db8ef22ed26261cf30f`
  (committed 2026-04-19T11:00:41-04:00)
- **Retrieved:** 2026-09-07
- **Subset (45 files, ~540 KB):**
  - `reference/js/index.ts`, `reference/js/gpu-index.ts`, `reference/js/shaders/tq-dot-batch.wgsl`
    — the npm package's TS layer (`TurboQuant`, `TQStream` over the 16 `tq_*`
    WASM exports; `TQGpuIndex` WebGPU compressed-vector scan).
  - `reference/engine.ts` — demo `InferenceEngine` (2,998 lines): pre-allocated
    GPU buffers, uniform ring, per-layer TQ cache (kPolar/kQjl/kMaxR/kGamma),
    pipelined GPU-argmax streaming, KV dump/load/branch (magic "TQKV").
    Hardcoded Gemma-3-arch constants at lines 43–63 → generalization target.
  - `reference/engine-worker.ts`, `reference/main.ts` — orchestration + the
    GGUF/tokenizer wiring (weights: HF `unsloth/gemma-4-E2B-it-GGUF` Q4_K_M →
    OPFS; tokenizer: transformers.js `onnx-community/gemma-4-E2B-it-ONNX`).
  - `reference/model-loader.ts` — GGUF stream → OPFS (`.complete` sidecar) →
    `gguf-parser.wasm` header parse → per-tensor GPU upload.
  - `reference/polar-config.ts` — `injectPolarConfig()` WGSL codegen.
  - `reference/system-cache-container.ts` — precomputed TQ system-prompt KV
    cache loading (the "instant first token" mechanism).
  - `reference/shaders/*.wgsl` — all 33 demo compute shaders (tq-encode /
    tq-attention / tq-decode / tq-rotate / tq-inverse-rotate /
    tq-weighted-sum-p1/p2 + matmul/rms-norm/rope/softmax/argmax/...).
  - `reference/gguf-parser.wasm` — Zig-built GGUF header parser.

## Assimilation plan

Extraction (not import) into `reusable-chatbot/engines/webgpu/`: generalize the
hardcoded Gemma constants into a GGUF-metadata-driven model graph, add a real
sampler after `projectLogits` (demo is argmax-only), keep KV ownership inside
the worker/GPU. Known runtime gates recorded in
`reusable-chatbot/README.md` (WebGPU `subgroups` requirement; relaxed-SIMD-only
WASM). Upstream changes are pulled by re-cloning and re-locking this file.
