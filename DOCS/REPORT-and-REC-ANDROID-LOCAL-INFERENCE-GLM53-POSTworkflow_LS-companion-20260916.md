# Report & Recommendation — Android Local Inference (GLM-5.3, post-workflow LS-companion 2026-09-16)

**Author:** GLM-5.3 (Claude Code session, operator-directed analysis) · **Date:** 2026-09-19
**Scope:** why on-device inference has been difficult (1) as architected in `DOCS/ARCHITECTURE.md` §7.8/decision 23 and (2) as instructed in `CHECKLIST.md` Stanza CP — when the Kintsugi (Capacitor) implementation works; (3) whether an Android-specific path is recommended; (4a) an ARCHITECTURE-grade spec for that recommendation and (4b) a multicriteria decision matrix over the top three options.
**Status:** analysis and recommendation only. Per the amendment-sequence gate (CLAUDE.md), no code, CHECKLIST stanza, or vendoring moves under this document until the operator amends `DOCS/ARCHITECTURE.md` and signs off. Nothing here is executed; it is the input to that amendment.

---

## 0. Where local inference actually stands today (evidence baseline)

| Surface | Status | Evidence |
|---|---|---|
| **Desktop native (Tauri 2 + Rust llama.cpp)** | **WORKING, end-to-end proven** | v1.58.28951 release train: real 1.28 GB Qwen 3.5 2B verified download → digest publish → native load → streamed on-device reply, driven live under Xvfb; artifacts in `dist/sanctissimissa-v1.58.28951-*`; commits `2c1d163f` (CSP), `0d21865a` (stall-resume), `5b2be43f` (logits fix) |
| **Browser/PWA local (WebLLM)** | **Blocked by environment, not code** | This session (2026-09-18/19): operator Chrome and test Chrome expose `navigator.gpu` but enumerate **zero adapters** ("No available adapters." ×2, native Chrome warning). WebLLM therefore honestly reports unsupported. The specced `turboquant-wasm` CPU fallback (§7.8.2 row 3) was never implemented — so no browser-local path exists on these machines |
| **Web/PWA shipped default** | **Hosted OpenRouter debug default** (§E amendment, executed) | v1.66.30030 live at sanctissimissa.surge.sh: chip `HOSTED`, real replies, 32 768-token ceiling; operator directive verbatim: "openrouter is for debug only because it is not scalable" |
| **Android local** | **Built but never qualified** | APK/AAB/symbols build in every train; §7.8.7 states it plainly: "No Rust toolchain/device/browser acceptance run establishes that this revision loads Qwen or generates a reply on the Z Fold. … The native probe reports a fixed 3 GiB budget and 8,192-token ceiling; these are configured ceilings, not Z Fold measurements." SAF/BlobStore model-store grants (decision 23 / guide §14.2) are **not implemented** |

This baseline matters: the difficulty is **not** "on-device inference never worked." Desktop local inference worked months of iterations ago. The difficulty concentrates in (a) the browser tier's environmental WebGPU absence, (b) the Android tier's qualification and storage grants, and (c) a verification-loop mismatch in how CHECKLIST tasks prove themselves. All three are examined below.

---

## 1. Why it has been difficult AS ARCHITECTED (§7.8 / decision 23)

### 1.1 The architecture chose the hardest integration surface as its Phase-1 baseline

Decision 23's dependable baseline is a **Rust llama.cpp provider behind the Tauri 2 invoke/Channel bridge**. That is the maximal-fidelity choice — one engine ABI across desktop and Android, KV ownership native, no JS in the hot path — but it places the entire product on the *least mature* edge of the Tauri 2 ecosystem:

- **`llama-cpp-2` wrapper defects are process-fatal.** CP.7 (twice): `get_logits_ith` asserts raw batch-local membership and panics **non-unwinding inside `spawn_blocking`** — the whole app aborts on first reply. The C API's negative-index convention is simply not implemented in the wrapper (context.rs:314). We fixed it twice (81931831's recurrent-model theory, then the correct batch-local-index fix 5b2be43f) before generation survived. Nothing in the architecture anticipated wrapper-level ABI bugs; the guide's §9 qualification harness exists precisely because of this class, but the harness itself was never run on a device.
- **The webview vendor multiplies failure modes.** Tauri on Linux = WebKitGTK: CP.12 (readonly `internals.invoke` threw during bundle eval — every desktop build since 047374b4 booted to a blank cream window) and CP.3 (WebKitGTK `fetch` legitimately pauses a 1.2 GB CDN body for minutes; the download manager's 60 s stall heuristic killed healthy transfers at 2%). On Android the System WebView is Chromium (a different engine again), so every "works on web" result transfers only partially, and every "works on Linux desktop" result transfers not at all. The architecture's collinear rule protects *data* bytes, not *platform behavior*.
- **CSP/connect-src is per-shell config.** CP.4/CP.9: the tauri CSP blocked the HF CDN redirect chain until `https:` was admitted. Trivial in hindsight; fatal out of the box.

These four incidents consumed the majority of the Companion calendar between 2026-09-16 and 09-18 — and note carefully: **all of them were solvable because a desktop drive loop existed** (Xvfb + real artifacts). Android has no equivalent loop in this repo, which is §2's subject.

### 1.2 The browser tier's honest-unsupported is architecturally correct but practically empty

§7.8.2 row 3 specced `turboquant-wasm` as the CPU/WASM floor so "a browser without WebGPU can still generate." It remains **dependency/vendored material only; no connected fallback provider** (§7.8.2's own words). In the operator's actual fleet, *no* Chrome enumerates a WebGPU adapter (verified twice this session), so the entire PWA surface — the one surface that deploys in seconds to surge.sh — had **no on-device path at all**. The architecture was right to refuse a fake engine (no-mock directive); the gap is that its honest floor was never built, which made the web tier existentially dependent on WebGPU hardware that the primary user does not have. That vacuum is what forced the 2026-09-18 hosted-debug-default pivot.

### 1.3 Android carries unresolved storage-plane prerequisites that gate the engine task

The org guide itself flagged this: workflow `DOCS/WORKFLOWS/workflow_LS-companion-20260916.md` risks row 1 gated **"the Android engine task"** on the cross-app storage decision. Decision 23 resolved the *policy* (SAF library + provider app + BlobStoreManager; never `sharedUserId`) but §7.8.7 records that none of the Android grants are implemented: the native store is app-private with TTL lock files, unknown-digest lock keys, and hash-verification only under 64 MiB. Meanwhile the Play-side constraints (decision 18's PAD corpus pack already at the AAB ceiling; a 1.4 GB APK with the model *in* it is not shippable; Play refuses expansion-file-style tricks for new apps) mean model bytes must arrive by the SAF/`BlobStoreManager` path that does not exist yet. The engine cannot be qualified ahead of its fuel line.

### 1.4 32-bit and Windows stubs narrow the "one ABI" promise

`NativeRunnerProvider` compiles only with `native-inference`, 64-bit, non-Windows; "Windows and 32-bit Android are compiled as unsupported stubs" (§7.8.2). The universal-ABI story is real on paper but materially desktop-Linux-first today.

### 1.5 Summary judgment on the architecture

The architecture is **not wrong** — model-neutral runner ABI, capability-truth probes, content-addressed org-common store, retrieval-quality acceptance are the right contracts, and the desktop proof demonstrates them. Its difficulty is a **sequencing property**: it selected the integration surface with the least tooling maturity (Tauri-Rust-llama.cpp across four webview/OS matrices) and coupled Phase-1 Android qualification to an unbuilt storage plane, while deferring the one floor (WASM) that would have kept the fastest-deploying tier (web) alive on WebGPU-less machines.

---

## 2. Why it has been difficult AS INSTRUCTED (CHECKLIST.md Stanza CP)

### 2.1 The verification loop is structurally mismatched to engine work

Stanza CP tasks are self-contained for parallel dispatch, and their Verify/Accept clauses are — of necessity for parallel coders — **source-contract or fixture-shaped**: grep assertions, hermetic runners, "tests exercise real SDK surface shapes." The operator's binding quality bar is the opposite pole: **rendered screens, real drives, actual replies** (QUALITATIVE-SUCCESS; §7.8.3's retrieval/citation harness on the device). This session demonstrated the gap three times in twenty-four hours on the *web* tier alone:

1. HC.2's hosted-first resolution passed its source-contract tests ("ChatView references resolveHostedEngine before local call sites") while the deployed panel initially showed the old "cannot run on this device" line — the wiring truth only surfaced under a live browser drive.
2. OG.7's placement module passed focused tests while the deployed guide sat fully inside the docked panel — the `COMPANION_LAYOUT` trigger had to be discovered by measuring rendered rectangles.
3. The ChatMarkdown integration passed focused tests with eight tsc-level seams only visible at full-tree compile.

Each was found **because a browser drive loop existed**. Stanza CP's Android tasks (CP.8 runner + shared-store mechanism) have no such loop: there is no device harness, no adb-drive task, no on-phone acceptance step in the train — so they sit permanently at "built, unqualified," which reads as "difficult." The checklist cannot close, on Android, a loop it has no instrument for.

### 2.2 The no-mock directive (correct) removed all intermediate milestones

With previews/mocks prohibited (§7.8 authority note), every CP increment had to be a **real provider doing real work** — so partial states (catalog fused but engine absent; store built but grants missing; APK assembled but generation unqualified) could never demonstrate themselves. The stanza's own residual notes say it: acceptance items "not all completed," "native-device model load and reply remain a separately reported qualification; fixture execution alone does not prove that an APK works on the operator's phone."

### 2.3 Device acceptance was assigned to a host that cannot perform it

CP's acceptance names the **Z Fold** by name. The build host (asrock Linux) produces APKs but cannot execute a phone-session qualification; no task, script, or workflow owns "install on device, drive, capture diagnostics." Architecture-law discipline then correctly forbids marking those items done — the honest result is a stanza that asymptotically approaches its own unverifiable tail.

### 2.4 The pivot evidence

The 2026-09-18 operator pivot — "we are losing too much time to the chatbot problems and making no progress; for now make the default hosted openrouter/free" — is the direct behavioral evidence for §2.1–2.3: the *product* needed a working Companion loop immediately; the local tiers' verification loops could not provide one at web speed. The pivot was correct (and its scaffolding — hosted engine behind the same `IInferenceEngine` — is what made this §H DOM/lore wave verifiable at all), but it validates the diagnosis, not abandonment of local inference.

---

## 3. Why Kintsugi (Capacitor) works where this has struggled

Kintsugi runs the same org web-tech product shell on **Capacitor**, and its local inference ships. The differences are structural, not talent:

| Factor | Capacitor (Kintsugi) | Tauri 2 + Rust (SanctissiMissa) |
|---|---|---|
| Native engine integration | **Plain Kotlin/Java plugin** over the Capacitor bridge; engine arrives as a gradle-managed AAR (prebuilt llama.cpp JNI bindings, ONNX Runtime, MediaPipe) — the Android toolchain's own first-class artifact type | Rust crate (`llama-cpp-2`) cross-compiled through the NDK via the tauri android pipeline; every wrapper-level ABI bug (CP.7) is ours to discover and fix |
| Webview matrix | One webview: Android System WebView (Chromium) everywhere mobile | WebKitGTK (desktop Linux), Chromium (web/Android), WebView2 (Windows) — three engines, three behavior sets (CP.12, CP.3 were WebKitGTK-only) |
| Storage for model bytes | Plugin writes directly to app storage; no SAF/BlobStore ceremony for app-private models | Decision-22/23 org-common store requires the unimplemented SAF/provider/BlobStore tier before it can be honest |
| Iteration speed on device | `npm run build && npx cap sync` + gradle — minutes | Full tauri android gen + Rust cross-compile + bundle — materially longer per iteration |
| Build-train maturity for the path | gradle consumes AARs natively | Our train *does* build APKs (proven), but the inference feature's cfg-gates and qualification never ran on hardware |

In short: **Kintsugi's architecture pre-fits the Android engine into the toolchain that owns Android.** Ours routes it through a cross-language bridge on the least-mature edge of a newer framework, with an unbuilt storage tier beneath it. The portability mandate (decision 19/22: layers must lift into sibling apps unchanged) is exactly what a Capacitor plugin gives the org for free on Android — Kintsugi already proved the pattern.

---

## 4. Recommendation — yes, an Android-specific path

**Recommendation (R1):** adopt a **parallel Capacitor Android build target** of the existing React/PWA shell, with local inference delivered by a **Capacitor plugin wrapping llama.cpp's official Android JNI bindings** (`AndroidLlamaPlugin`), consumed by a new `AndroidCapacitorRunnerProvider` behind the unchanged `IInferenceEngine` ABI. Keep the Tauri 2 Rust path as the **desktop** baseline (it is proven there) and as the Phase-5 consolidation target. This is not a rewrite: the web shell is already a PWA (Capacitor's input), the runner ABI is model-neutral by design, and the model catalog/store/contracts carry over unchanged.

**Why this shape:**

1. **Model continuity** — Qwen 3.5 2B GGUF (the operator-fixed universal default, §C) runs on llama.cpp today; no re-quantization, no catalog fork.
2. **The Kintsugi precedent** — the org's own working Android inference lives on exactly this pattern; the portability mandate says lift it.
3. **It attacks the actual failure modes** — no Rust-in-the-loop wrapper bugs (prebuilt JNI AAR), one webview engine (Chromium System WebView), gradle-owned ABIs, app-private store without SAF ceremony for v1.
4. **The qualification loop becomes buildable** — a Capacitor APK + `adb` + the §7.8.3 retrieval/citation harness gives Stanza CP the on-device acceptance instrument it never had.
5. **Reversible and additive** — Tauri desktop keeps its proven path; the `reusable-chatbot` contract means the provider is a leaf, not a fork; the hosted debug default stays as the web tier's floor until WASM lands.

**What R1 explicitly does NOT do:** no hosted fallback on Android beyond the existing debug default; no WebGPU requirement (installed builds must not require it — decision 23, unchanged); no new entitlement; no change to the Qwen 3.5 2B default; the desktop Rust path is retained, not reverted.

---

## 4a. ARCHITECTURE-grade specification for R1 (amendment-ready text)

The following is the spec the operator would sign into `DOCS/ARCHITECTURE.md` (§7.9, Android local-inference amendment). It is written to the house standard — stub-free, exact names, entity rows — and lands **only** through the amendment-sequence gate.

### §7.9 Android local inference — Capacitor target and llama.cpp JNI plugin (proposed)

**Build target.** The Android product builds from the same React shell as the PWA through **Capacitor** (`android` platform added to the repo; `npm run build:cap:android` = web build + `npx cap sync android` + gradle `assembleRelease`/`bundleRelease`, wired into the release train as stages `android-cap-debug` / `android-cap-release`, sharing the one version stamp). The Tauri android target remains for the desktop-consolidation line and is not deleted. The Play-shipped artifact becomes the Capacitor AAB; the corpus continues to ride decision 18's PAD fast-follow pack, unchanged.

**Engine plugin.** `android/app/src/main/java/mba/robin/sanctissimissa/inference/AndroidLlamaPlugin.kt` — a Capacitor plugin (`@CapacitorPlugin(name = "AndroidLlama")`) binding llama.cpp's official Android JNI library (prebuilt AAR pinned by digest in `gradle/libs.versions.toml`; provenance note in the release manifest):

```
@PluginMethod init(modelPath: String, contextTokens: Int, Channel progress) -> sessionId
@PluginMethod generate(sessionId: String, messages: Array, maxTokens: Int, temperature: Double, Channel tokens) — streams TokenEvent-shaped maps; supports cancel via generate.cancel(sessionId)
@PluginMethod probe() -> { runtime: 'android', memoryBudgetBytes, accelerations: ['llama-cpu' | 'llama-gpu'], contextCeiling, threads }
@PluginMethod close(sessionId)
```

Generation runs on a dedicated executor; tokens stream over the standard Capacitor `Channel`; failures throw to the caller as the existing native provider does (never as tokens). The KV cache is plugin-owned and never crosses the bridge (decision 23's opaque-handles rule).

**Runner provider.** `reusable-chatbot/engines/android-capacitor/index.ts` — `export class AndroidCapacitorRunnerProvider implements IInferenceEngine` (constructor `(invoke: CapacitorInvoke, onProgress?, log?)`), resolved by a new `resolveAndroidCapacitorEngine(...)` in `src/core/chat/resolve.ts` **after** the hosted debug default and only when `window.Capacitor?.isPluginAvailable('AndroidLlama')`. `probe()` reads the plugin's live report (real `ActivityManager.memoryInfo`, real llama.cpp max-context — replacing the configured 3 GiB / 8 192 placeholder ceilings §7.8.7 disclaims). The engine chip reads `ON-DEVICE`.

**Model store.** v1 app-private: `context.filesDir/models/sha256/<digest>/<file>` — the same content-addressed layout as decision 22, administered by the existing `DownloadManager` through the plugin (`AndroidLlama.storePath()`); the org-common SAF/provider/BlobStore tier remains the specified future sharing plane, unimplemented and honestly so. The model catalog, picker, Qwen 3.5 2B default, heavier-by-express-choice rule (§C), and all authored feedback carry over unchanged.

**Qualification gate (binding).** No Android promotion without the §7.8.3 acceptance executed on the operator's Z Fold via `adb`: cold-load, first-token latency, sustained decode, peak memory with the Missal + index active, cancellation, and the liturgical retrieval/citation battery. The harness is `scripts/qualify-android.mjs` (drives the installed APK through the diagnostics channel; emits the qualification record consumed by `collect`). Browser visual checks and unit greenness remain insufficient, per QUALITATIVE-SUCCESS.

**Entity rows (added to §7.8.6 by the amendment):**

| Entity | Contract |
|---|---|
| `AndroidLlamaPlugin` | `android/.../inference/AndroidLlamaPlugin.kt` — Capacitor plugin over the pinned llama.cpp JNI AAR; `init/generate/probe/close`; KV plugin-owned; failures throw |
| `AndroidCapacitorRunnerProvider` | `reusable-chatbot/engines/android-capacitor/index.ts` — `IInferenceEngine` over the plugin bridge; live probe truth; resolved after the hosted debug default when the plugin is available |
| `resolveAndroidCapacitorEngine` | `src/core/chat/resolve.ts` — `(invoke, report, onProgress?) => Promise<Resolution>`; honest `needs-model` when the store lacks the selection |
| `cap:android` stages | `scripts/release-state.mjs` STAGE_ORDER gains `android-cap-debug`, `android-cap-release` (gradle over the Capacitor project; one stamp; artifacts slug-first per CC12) |
| `qualify-android` | `scripts/qualify-android.mjs` — adb-driven §7.8.3 harness on the installed build; emits the device qualification record; `collect` requires it for Android promotion |

---

## 4b. Multicriteria decision matrix — top 3 options for Android local inference

Criteria and weights (operator-doctrine-derived): **Model continuity** (Qwen 3.5 2B GGUF; §C heavier-only-by-choice) ×3; **Time-to-qualified-reply on the Z Fold** ×3 (the operator's dominant pain); **Qualification-loop buildability** (can acceptance actually be executed here) ×2; **Build-train integration risk** (release-driver/CI fit; version discipline) ×2; **Portability across org apps** (decision 19/22 mandate) ×2; **Maintenance surface** (upgrade risk, wrapper depth) ×1; **Play constraints fit** (AAB size, PAD interplay) ×1. Scores 1–5 (5 best), with short/medium/long-horizon reasoning per the net-of-all rule.

| Criterion (weight) | **A. Capacitor + llama.cpp JNI plugin** (R1) | **B. Finish Tauri-Android Rust path** | **C. Capacitor + MediaPipe LLM Inference** |
|---|---|---|---|
| Model continuity (×3) | **5** — any GGUF incl. Qwen 3.5 2B; catalog unchanged | **5** — same crate as desktop; identical bytes | **2** — `.task`-converted Gemma-family models; Qwen 3.5 2B not first-class; catalog forks or default changes |
| Time-to-qualified reply (×3) | **4** — Kintsugi-proven pattern; prebuilt AAR; no Rust-in-loop bugs; days-to-weeks | **2** — CP.7-class wrapper risks remain on an unproven-on-device path; SAF store still unbuilt beneath it | **4** — Google-supported, GPU delegate, fast integration |
| Qualification loop (×2) | **5** — adb + Capacitor APK + `qualify-android`; the missing instrument arrives | **3** — same harness possible but each iteration pays the full tauri-android build cycle | **5** — same adb loop |
| Train integration (×2) | **4** — two new gradle stages; one stamp; PAD corpus pack unchanged | **5** — already inside STAGE_ORDER today | **4** — as A |
| Org portability (×2) | **5** — the Kintsugi pattern; plugin lifts into every sibling app | **3** — shares `reusable-chatbot` ABI but the bridge is Tauri-specific | **4** — plugin shape portable; engine itself Android/Google-bound |
| Maintenance (×1) | **4** — upstream llama.cpp AAR pin; no own FFI surface | **2** — `llama-cpp-2` wrapper is our FFI; process-fatal bug class | **5** — Google-maintained runtime |
| Play constraints (×1) | **4** — model downloaded post-install to filesDir; APK stays lean | **4** — same | **4** — same |
| **Weighted total (max 80)** | **(15+12+10+8+10+4+4) = 63** | **(15+6+6+10+6+2+4) = 49** | **(6+12+10+8+8+5+4) = 53** |

**Horizon reasoning (SC3):** *Short* — A and C both reach a live reply fastest; A keeps the model. *Medium* — A's qualification harness becomes the org's Android acceptance instrument; B's costs compound if another CP.7-class wrapper bug surfaces on-device. *Long* — Phase-5 (llama.cpp-WebGPU / LlamaWeb consolidation) can eventually retire the dual-target split; until then A and the proven desktop Rust path are the same engine (llama.cpp) on two bindings, which is consolidation-friendly, not fragmentation. C's model discontinuity conflicts with the operator-fixed §C default — disqualifying despite strong integration scores.

**Recommendation stands: Option A**, with B retained as the desktop baseline and Phase-5 consolidation target, and C recorded as the rejected alternative (model discontinuity). Runner-up hedge: if the pinned JNI AAR proves unstable on the Z Fold, C becomes the fallback *only* with an explicit operator decision to change the default model tier — never silently.

---

## 5. Immediate consequences if the operator signs R1

1. Amendment §7.9 enters `DOCS/ARCHITECTURE.md` → signoff ledger → CHECKLIST stanza (AC.1 plugin, AC.2 provider+resolution, AC.3 cap-stages, AC.4 qualify-android harness + Z-Fold acceptance task assigned to the operator's device session).
2. The hosted OpenRouter debug default remains the automatic default on web and until the Android qualification record exists; `companion_ondevice` entitlement continues to gate nothing new.
3. Stanza CP's Android rows (CP.8 shared-store SAF tier) re-scope to the v1 app-private store above, with the org-common tier unchanged as the specified future plane.

— End of report. No code, checklist, or vendoring has moved under this document; it awaits the amendment gate.
