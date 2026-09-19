# Report & Recommendation — Browser Webapp Local Inference (GLM-5.3, post-workflow LS-companion 2026-09-16)

**Author:** GLM-5.3 (Claude Code session, operator-directed analysis) · **Date:** 2026-09-19
**Companion document:** `DOCS/REPORT-and-REC-ANDROID-LOCAL-INFERENCE-GLM53-POSTworkflow_LS-companion-20260916.md` (the Android twin; shared evidence is cross-referenced, not duplicated at length).
**Scope:** why **on-device inference in the browser webapp/PWA** has been difficult (1) as architected in `DOCS/ARCHITECTURE.md` §7.8/decision 23 and (2) as instructed in `CHECKLIST.md` Stanza CP — when the Kintsugi (Capacitor) implementation works; (3) whether a webapp-specific path is recommended; (4a) an ARCHITECTURE-grade spec for the recommendation and (4b) a multicriteria decision matrix over the top three options.
**Status:** analysis and recommendation only. Per the amendment-sequence gate (CLAUDE.md), nothing here executes before an ARCHITECTURE.md amendment and operator signoff.

---

## 0. Where browser-local inference stands today (evidence baseline)

| Surface | Status | Evidence |
|---|---|---|
| **WebLLM provider (WebGPU)** | **Implemented, honest, and dead-on-arrival on this fleet** | `WebLlmRunnerProvider` exists, tests green; on the operator's Chrome and the test Chrome, `navigator.gpu` **is present** but adapter enumeration returns **zero adapters** ("No available adapters." ×2 — Chrome's own native warning, captured this session). The capability gate correctly refuses; the picker marks every compiled model "Not available on this device" |
| **CPU/WASM floor (`turboquant-wasm`)** | **Specced, never built** | §7.8.2 row 3, verbatim: "Dependency/vendored material only; no connected fallback provider. … A browser without WebGPU cannot generate through the current app." |
| **Shipped web default** | **Hosted OpenRouter debug default** (§E, executed; v1.66.30030 live) | Real replies verified end-to-end on surge; the operator's own framing: "openrouter is for debug only because it is not scalable" |

So the honest one-line answer to "why is the webapp difficult": **the architecture bet the browser tier on WebGPU hardware the primary user does not have, never built its own specced CPU floor, and the resulting vacuum is currently filled by a debug-only hosted engine.** The sections below unpack that.

---

## 1. Why it has been difficult AS ARCHITECTED (§7.8 / decision 23)

### 1.1 The browser tier has exactly one engine, and that engine has exactly one acceleration prerequisite

§7.8.2's Phase-1 browser baseline is **WebLLM** — MLC-compiled models executing on **WebGPU**. Unlike the native tier (CPU llama.cpp works everywhere; GPU is an upgrade), the browser tier's *floor and ceiling are the same technology*. When WebGPU is absent — headless Chrome, corporate/locked-down laptops, older Chromium, Linux without graphics-driver WebGPU enablement (precisely the operator's fleet, verified twice this session) — there is **no second rung**. The architecture knew this and specced the rung (`turboquant-wasm`, relaxed-SIMD floor) — and then never poured it. §7.8.7 confirms the browser store exists (OPFS library) but WebLLM's compiled assets use WebLLM's own cache, so even the storage plane diverges from the decision-22 content-addressed contract on the one tier that could not run anyway.

### 1.2 The WebLLM provider is integrated at its minimum viable depth

§7.8.2/§7.8.5 record the limits honestly: `CreateMLCEngine` runs **in the page, not a worker** (worker hosting is a target); model choices come from the installed package's `prebuiltAppConfig.model_list` (self-hosted model/runtime assets remain targets — meaning the app is coupled to WebLLM's CDN-hosted compiled artifacts, in tension with the org's sovereignty doctrine); "About … MB" derives from **manifest VRAM requirements, not transfer size** (misleading on constrained machines); `downloaded` means "preparation requested," not bytes-verified. None of these are bugs — they are the recorded cost of shipping the provider before qualification — but together they mean that even on a WebGPU machine, the webapp's engine integration is the shallowest in the product.

### 1.3 Model-identity discontinuity on the browser tier

§7.8.3's own row admits it: the browser default is "the first budget-compatible executable entry from WebLLM's size-ordered manifest. It is **not represented as Qwen 3.5 2B** unless that exact executable entry exists." The operator's universal-default directive (§C: Qwen 3.5 2B, heavier only by express choice) is therefore **structurally unsatisfiable in the browser today** — the tier picks whatever MLC compiled, not the operator's chosen model. A webapp path that cannot honor the product's fixed default model is not a completed tier; it is a placeholder that truthfully labels itself.

### 1.4 The verification target moves under the architecture

WebGPU availability varies by Chrome version, flags, GPU driver, sandbox, and headless mode. The capability-broker design (probe truth, honest unsupported) is the *right* response — this session proved it working — but it converts an environment shortage into a permanent product state: an architecture whose browser answer is "come back with better hardware" was always going to read as "difficult" on the machines that matter most (the operator's own).

---

## 2. Why it has been difficult AS INSTRUCTED (CHECKLIST.md Stanza CP, browser rows)

### 2.1 CP.9's acceptance assumes the prerequisite hardware

CP.9 (browser/PWA runners: WebLLM default + `turboquant-wasm` CPU fallback) carries acceptance that presupposes a WebGPU-capable development/verification browser. The verification browsers available to this project **enumerate zero adapters** (evidence §0), so every WebLLM acceptance step that begins "in a WebGPU browser…" is unexecutable in the loop that lands code. The tasks therefore complete their *source-side* clauses and stall at their *runtime* clauses — the same proxy-green/runtime-red pattern documented three times over in the Android report §2.1, except here the blocking instrument is not a missing phone but a missing GPU path in every Chrome on the host.

### 2.2 The WASM fallback row never became a task with an owner

Stanza CP expanded CP.2→CP.4, CP.7, CP.9 into executable tasks; the `turboquant-wasm` floor stayed a roster row ("Phase 1 target, currently unimplemented") without a derived self-contained task, a vendoring pin, or an acceptance harness. Parallel dispatch cannot build what no task owns — the architecture-law machinery worked exactly as designed, and the floor fell through the seam between roster and checklist.

### 2.3 The no-mock directive left no interim demonstrable state

As on Android (twin report §2.2): with previews prohibited, the browser tier's honest states were only "WebGPU absent → unsupported" or "hosted" — nothing in between could demonstrate progress, so the tier's real condition (one engine, no floor) stayed invisible until an operator sat down in a WebGPU-less Chrome and asked why the Companion could not run. The 2026-09-18 pivot to the hosted debug default was the product-level response to exactly that discovery.

---

## 3. Why Kintsugi (Capacitor) works — and what the webapp can and cannot borrow

Kintsugi's local inference works **because Capacitor is a native wrapper**: the JS shell is a webapp, but the engine is a Kotlin plugin running native llama.cpp/ONNX on the device, with the bridge carrying only tokens (twin report §3). Three consequences for the browser webapp question:

1. **The browser cannot borrow the trick itself.** A pure browser/PWA surface has no plugin process to hide an engine in; its only compute substrates are WebGPU (absent on the target fleet), WASM+SIMD (the unbuilt floor), or the network (the current debug default). "Do what Kintsugi does" translates, for the webapp, to **"build the WASM rung"** — that is the Kintsugi lesson in browser terms.
2. **What Kintsugi CAN lend is the model layer.** Its engine consumes plain GGUF weights. A llama.cpp-derived WASM runtime consumes **the same GGUF artifacts** — meaning the webapp floor, the Android plugin (twin report R1), and the desktop Rust path can all converge on the identical Qwen 3.5 2B bytes in the decision-22 content-addressed store. One model, three tiers.
3. **Kintsugi's webview is Chromium with native escape; ours-on-Linux was WebKitGTK with none.** The desktop incidents (CP.12, CP.3 — twin report §1.1) came from the webview vendor; the webapp runs in whatever Chromium the user brings, so the equivalent risk class is engine *absence* (WebGPU), addressed by the same recommendation below.

---

## 4. Recommendation — yes, a webapp-specific path

**Recommendation (W1):** build the browser CPU floor as a **llama.cpp-WASM worker engine** — a `WasmRunnerProvider` consuming the same GGUF weights as the native tier (Qwen 3.5 2B first-class), hosted in a **Web Worker** with relaxed-SIMD, streaming tokens over `postMessage` (KV worker-owned per decision 23), storing weights in the existing OPFS library under the decision-22 content-addressed layout, and resolved **after** the hosted debug default and **before** WebLLM (WebGPU machines may still prefer WebLLM's GPU speed once the capability probe admits it). WebLLM is retained and upgraded opportunistically (worker hosting, self-hosted assets); the hosted debug default remains the network tier until W1 qualifies. In plain terms: **every browser gets a local engine; WebGPU becomes an accelerator, not a prerequisite.**

**Honest disclosure the operator must see:** the org **dropped wllama** (the maintained llama.cpp-WASM runtime) by operator decision 2026-09-07, in the era whose roster wanted WebGPU-first (§9.4 note; superseded 2026-09-17 by decision 23, which itself restored a "CPU/WASM fallback" row). This report recommends re-adoption **under different assumptions** — not as the WebGPU-era roster's consolation, but as the *dependable floor* the current guide already names and the fleet's measured WebGPU absence demands. Re-admitting a previously dropped dependency is an operator decision; the matrix and spec below are written so that decision can be made with eyes open (pin-by-digest, vendored provenance, and the alternative of hand-building llama.cpp→WASM retained as the rejected option).

**What W1 explicitly does not do:** no silent heavier-model selection (§C unchanged — the floor runs Qwen 3.5 2B or presents honest choice); no removal of WebLLM; no change to the hosted debug default's status as debug-only; no new entitlement.

---

## 4a. ARCHITECTURE-grade specification for W1 (amendment-ready text)

The following is the spec the operator would sign into `DOCS/ARCHITECTURE.md` (§7.10, browser local-inference amendment). House standard: stub-free, exact names, entity rows; lands only through the amendment gate.

### §7.10 Browser local inference — llama.cpp-WASM worker floor (proposed)

**Engine worker.** `reusable-chatbot/engines/wasm/worker.ts` — a Web Worker hosting the pinned llama.cpp-WASM runtime (wllama, vendored under `VENDORED/wllama/` with `PROVENANCE.md` + digest pin per the vendoring regime; build flag `SAM_WASM_ENGINE=1` gates nothing at runtime — the worker is always shipped, the capability broker decides use). The worker owns the WASM heap and the KV cache; the main thread never touches either (decision 23's opaque-handles rule, now enforced by thread boundary). Protocol over `postMessage`:

```
{ type: 'probe' }                                    → { runtime: 'web', backend: 'wasm-simd', memoryBudgetBytes: performance.memory-derived|navigator.deviceMemory heuristic, contextCeiling, threads: hardwareConcurrency-capped }
{ type: 'init', modelUrl, sha256, contextTokens }    → streaming { type: 'progress', fraction } … { type: 'ready', sessionId }
{ type: 'generate', sessionId, messages, maxTokens, temperature, token: cancelToken } → streaming { type: 'token', text } … { type: 'done' } | { type: 'error', message }
{ type: 'close', sessionId }
```

Weights stream from the OPFS library when present; otherwise the existing `DownloadManager` acquires them once into OPFS under `models/sha256/<digest>/<file>` (the browser realization of the decision-22 store — closing the §7.8.7 divergence where WebLLM's cache sat outside the org contract).

**Runner provider.** `reusable-chatbot/engines/wasm/index.ts` — `export class WasmRunnerProvider implements IInferenceEngine` (constructor `(workerFactory: () => Worker, onProgress?, log?)`), exposing `probe/init/generate/batchScore(throws unsupported)/kvStats/reset/close` over the worker protocol; `generate` honors `AbortSignal` by posting the cancel token. **Resolution order in `resolveWebEngine`** (`src/core/chat/resolve.ts`, amended): hosted debug default (unchanged, §E) → **`WasmRunnerProvider` when SIMD is available** (`WebAssembly.validate` of a relaxed-SIMD probe module; the guide's relaxed-SIMD floor) → `WebLlmRunnerProvider` when a **live adapter enumeration** succeeds (strengthened from `navigator.gpu` presence — this session proved presence ≠ availability) → honest unsupported. The picker shows the local WASM entry with the true model identity (Qwen 3.5 2B GGUF) and honest size.

**Model tier.** The GGUF catalog entry for `unsloth/Qwen3.5-2B-GGUF` (Q4_K_M) becomes the browser floor's first-class default — the same bytes as desktop/Android(Capacitor R1) — satisfying §C's universal-default rule on the web tier for the first time. The WebLLM tier's manifest entries remain selectable on WebGPU machines, labeled by their true identities (§7.8.3 honesty rule).

**Qualification gate (binding).** Browser promotion requires, on a **WebGPU-less Chromium** (the fleet reality): cold-load time from OPFS, first-token latency, sustained decode tokens/s at Qwen 3.5 2B, peak heap, cancellation mid-stream, and the §7.8.3 liturgical retrieval/citation battery — driven through the diagnostics channel by `scripts/qualify-web.mjs` (Playwright against the built PWA; consumes the same harness shape as the Android `qualify-android`). UI-jank guard: generation must not block the Mass view's interaction (worker-bound by construction; verified by the harness). WebGPU machines repeat the same battery on the WebLLM tier before its chip reads anything but honest state.

**Entity rows (added to §7.8.6 by the amendment):**

| Entity | Contract |
|---|---|
| `wasm worker` | `reusable-chatbot/engines/wasm/worker.ts` — pinned llama.cpp-WASM runtime in a Worker; owns heap + KV; `probe/init/generate/close` over postMessage; relaxed-SIMD floor |
| `WasmRunnerProvider` | `reusable-chatbot/engines/wasm/index.ts` — `IInferenceEngine` over the worker protocol; AbortSignal-honoring; `batchScore` throws unsupported |
| `resolveWebEngine` (amended) | `src/core/chat/resolve.ts` — order: hosted debug default → WASM (SIMD gate) → WebLLM (live-adapter gate, strengthened from API presence) → honest unsupported |
| `VENDORED/wllama/` | vendored runtime + `PROVENANCE.md` + digest pin; re-admission of the 2026-09-07-dropped dependency under decision-23's floor row, by this amendment |
| `qualify-web` | `scripts/qualify-web.mjs` — Playwright §7.8.3 battery on a WebGPU-less Chromium and (for the WebLLM tier) a WebGPU Chromium; emits the qualification record `collect` requires |

---

## 4b. Multicriteria decision matrix — top 3 options for browser local inference

Criteria and weights (operator-doctrine-derived; mirroring the Android twin for comparability): **Model continuity** (Qwen 3.5 2B, §C) ×3; **Runs on the measured fleet** (zero-WebGPU Chromium) ×3; **Time-to-qualified-reply** ×3; **Store/sovereignty fit** (decision-22 content-addressed bytes, no CDN dependence) ×2; **Org portability** (decision 19/22; lifts to siblings) ×2; **Maintenance surface** ×1; **Mobile-browser reality** (iOS/Android webviews: no WebGPU, WASM allowed) ×1. Scores 1–5; weighted totals out of 80; short/medium/long horizons per the net-of-all rule.

| Criterion (weight) | **A. llama.cpp-WASM worker (wllama)** (W1) | **B. Finish/keep WebLLM (WebGPU)** | **C. MediaPipe LLM Web Tasks (WebGPU/WASM dual)** |
|---|---|---|---|
| Model continuity (×3) | **5** — plain GGUF; the exact Qwen 3.5 2B bytes; one catalog across three tiers | **2** — MLC-compiled manifest entries only; identity ≠ the operator's default (§7.8.3 admits it) | **2** — `.task`-converted Gemma-family; default forks |
| Runs on measured fleet (×3) | **5** — CPU+SIMD; works in the verified zero-adapter Chromes and in mobile webviews | **1** — measured zero adapters on every Chrome in this project's loop | **3** — WASM backend exists but large-model CPU perf is weak; WebGPU path hits the same wall as B |
| Time-to-qualified reply (×3) | **4** — runtime is maintained upstream; worker + store wiring is our work; days-to-weeks | **3** — provider exists; qualification blocked until a WebGPU loop exists at all | **3** — integration easy; qualification on fleet still CPU-bound |
| Store/sovereignty fit (×2) | **5** — GGUF into OPFS `models/sha256/…`; closes the §7.8.7 WebLLM-cache divergence; no CDN dependence | **2** — WebLLM's own cache; self-hosted assets remain unbuilt targets | **3** — model files self-hostable; runtime Google-hosted by default |
| Org portability (×2) | **5** — same engine family as desktop Rust and Android R1; the portability mandate's ideal shape | **3** — browser-only tier; no native sibling reuse | **3** — API shape parallels the Android MediaPipe option; engine not shared with native tiers |
| Maintenance (×1) | **3** — vendored pin; re-admission of a dropped dependency (disclosed §4) | **4** — package-maintained | **5** — Google-maintained |
| Mobile-browser reality (×1) | **5** — WASM is the only substrate iOS/Android webviews guarantee | **1** — WebGPU absent in shipping mobile webviews | **3** — falls back to the same weak WASM |
| **Weighted total (max 80)** | **(15+15+12+10+10+3+5) = 70** | **(6+3+9+4+6+4+1) = 33** | **(6+9+9+6+6+5+3) = 44** |

**Horizon reasoning (SC3):** *Short* — A is the only option that produces a local reply on the machines that actually exist in this project's loop; B cannot be qualified at all until a WebGPU browser joins the loop; C's fleet story collapses to A's substrate with worse model continuity. *Medium* — A's OPFS store unifies the weight plane across tiers; B's worker/self-hosting upgrades remain worth doing for WebGPU machines as the accelerator tier. *Long* — Phase-5 (llama.cpp-WebGPU/LlamaWeb consolidation) converges A and B into one llama.cpp lineage browser-side, exactly as the Android twin converges its two bindings; C strands the org on Google's model pipeline.

**Recommendation stands: Option A** — the llama.cpp-WASM worker floor — with B retained as the WebGPU accelerator tier (never the prerequisite), and C recorded as the rejected alternative (model discontinuity + fleet-weak WASM). The one decision only the operator can make inside A: **re-admitting the wllama dependency dropped on 2026-09-07**, now justified by decision 23's own floor row and the measured fleet — this report is the recorded basis for that reversal.

---

## 5. Immediate consequences if the operator signs W1

1. Amendment §7.10 enters `DOCS/ARCHITECTURE.md` → signoff ledger → CHECKLIST stanza (WC.1 vendored runtime + worker, WC.2 provider + amended resolution order, WC.3 OPFS store path in `DownloadManager`/`WebModelLibrary`, WC.4 `qualify-web` harness + WebGPU-less acceptance).
2. The hosted OpenRouter debug default remains the automatic web default **until** the WASM floor passes `qualify-web` on a WebGPU-less Chromium; then resolution prefers local, hosted becomes the fallback, and the debug-only exposure clock starts winding down.
3. §7.8.2's "CPU/WASM fallback — currently unimplemented" row closes; §7.8.7's browser-store divergence closes; §C's universal Qwen 3.5 2B default becomes satisfiable on the web tier for the first time.

— End of report. No code, checklist, or vendoring has moved under this document; it awaits the amendment gate.
