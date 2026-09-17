# reusable-chatbot

Reusable chatbot module: one TypeScript orchestration layer, one model
registry, one chatbot semantics layer — TurboQuant inference on **every
viable execution platform** (operator decision 2026-09-07). Liturgibot is a
consumer of this module, not its owner.

## Layout (target)

```
core/            engine contract + policy + orchestration (shipped now)
  engine-types.ts      IInferenceEngine { probe, init, generate, batchScore,
                       kvStats, reset, close } — opaque handles only; no
                       GPUBuffer / native pointer / raw K/V ever crosses it
  turboquant-policy.ts KV turbo3/turbo3 preferred · turbo4 fallback ·
                       turbo2 constrained; weights independent of KV format
  chat-controller.ts   session/turn orchestration, cancellation, recovery
model-registry/  atomic-chat-conf + atomic-chat-model-catalog clients,
                 inference-profiles fusion, deployability ranking (P3)
ui/              ChatView with configurable modes: dock-left/right,
                 floating/intercom, inline, fullscreen, mobile sheet (P5)
engines/
  webgpu/     WebGPU TurboQuant engine — generalized from the demo engine in
              VENDORED/turboquant-wasm (TQ-compressed-KV attention in WGSL,
              GGUF→OPFS loader, pipelined GPU-argmax streaming) (P2)
  wasm/       turboquant-wasm WASM-SIMD fallback (TurboQuant + TQStream) (P2)
  tauri/      Tauri plugin → Rust → C ABI → atomic-llama-cpp-turboquant;
              persistent session, streaming Channel, no per-token IPC (P6)
  android/    NDK build of the same fork, where supported (P7)
```

## Design invariants

- KV cache is owned by the worker/GPU engine (or native session). K/V tensors
  never cross `postMessage()`, are never fully decompressed for attention, and
  no `invoke()` happens per output token (native streams over a Channel).
- Models are **selected** from the Atomic Chat catalogs
  (`rebots-online/atomic-chat-conf` recommended/staff-picks +
  `models/inference-profiles.json`; `rebots-online/atomic-chat-model-catalog`)
  fused with live `probe()` capability truth. Nothing about Gemma/LFM/Bonsai
  is hardcoded; ranking is by deployability (capability + quality + task fit +
  Atomic priority + TQ compat + context − memory pressure − latency −
  unsupported-runtime penalty), not parameter count.
- Manifests describe compatibility and preference; the executable engine's
  `probe()` is authoritative.

## Known platform gates (verified 2026-09-07)

- WebGPU engine needs the `subgroups` extension (`subgroupShuffleXor` in the
  attention kernels) — Chrome/Edge today; probe per device.
- `turboquant-wasm` ships **relaxed-SIMD-only** WASM (Chrome 114+ / FF 128+ /
  Safari 18+); older browsers get "unsupported", not a degraded pretend-mode.
- Native TQ kernels: Metal / CUDA / Vulkan / HIP; CPU is reference-correctness
  only → Android realistically = Vulkan path, gated on device probe. Bonsai is
  not supported by the fork (PrismML kernels) → registry marks it
  unsupported-runtime rather than forcing it.
- The vendored demo engine's sampler is argmax-only; a real sampler is added
  during extraction (P2).

See `VENDORED/turboquant-wasm/PROVENANCE.md` for source lock and the
`DOCS/ARCHITECTURE.md` §7.6 / §9.4 reconciliation for the decision record.
