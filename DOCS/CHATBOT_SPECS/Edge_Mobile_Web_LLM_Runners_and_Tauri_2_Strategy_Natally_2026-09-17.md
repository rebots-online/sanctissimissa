# Edge Mobile and Web LLM Runners with Tauri 2

Technical landscape, breakthrough assessment, and architecture direction for the shared Chatbot Module and the EnZIME, Natally, SanctissiMissa, Kintsugi, HKG, Atomic Chat, and Recruiser product lines

Research cutoff: 13 September 2026

Natally continuation added 17 September 2026. GLM-5.3 should begin with sections 12–22 for the current reconciliation, shared-storage design and implementation handoff. Sections 1–11 retain the dated research and do not replace Natally’s current product contracts.

**Customer language and commercial direction updated 17 September 2026:** offer “Unlimited chats with natally” for the higher upfront purchase and “Pay as you chat” using $ROCHE for modest usage. These are independent purchase paths. Customer screens describe chatting with natally; computing location, inference, ephemeris and other implementation terms belong only in developer documentation. The purchase unlocks the on-device route; remote service use always consumes a finite allowance or balance. Sections 19–22 specify the Windows Store, payments and shared-credit implementation.

## Executive conclusion

The approximately 3.9 GB 1-bit Bonsai 27B remains the most striking intelligence-per-download result found, but it is not yet a clean multi-platform replacement for conventional 3B–9B local models. Its achievement is principally a co-designed low-bit model and specialized-kernel achievement. Shipping the file everywhere is easier than executing it well everywhere: native desktop, Android, iOS, and browsers expose different memory ceilings, accelerator APIs, kernel languages, and background-execution rules.

The best architecture for the active projects is therefore a stable, model-neutral Chatbot Module with a capability-negotiated runner layer. Use llama.cpp or the existing atomic-llama-cpp-turboquant line as the compatibility anchor for desktop and Android; evaluate Google LiteRT-LM as the strategic cross-platform accelerator path; use WebLLM/MLC or llama.cpp WebGPU for browsers; and keep a CPU/WASM fallback for low-end or unsupported devices. Bonsai should be an optional high-density tier until its binary and ternary kernels, licensing, memory behavior, and browser path pass a reproducible device matrix.
| Question | Finding | Decision |
| --- | --- | --- |
| Is anything clearly better than 4 GB Bonsai 27B? | No universal drop-in. Some alternatives improve speed, energy, multimodality, or portability, but none verified here dominates Bonsai simultaneously on size, quality, and all target platforms. | Treat Bonsai as a benchmark and optional engine, not the application ABI. |
| Most important new runtime development | LiteRT-LM now claims Android, iOS, web, desktop, and IoT with CPU/GPU/NPU, multimodality, and tool use. | Prototype it behind the same runner interface; do not replace the proven path yet. |
| Best near-term Tauri 2 design | Web UI and shared TypeScript orchestration; Rust command/event bridge; platform-specific native engines; browser worker engine. | One product surface, multiple execution providers. |
| Does TurboQuant solve the 4 GB model problem? | No. TurboQuant compresses the growing KV cache, not the model weights. It is highly complementary for long context. | Keep it as an independent capability negotiated per runner. |

## 1 Scope and evaluation method

The comparison asks whether an app can deliver useful local generation across Windows, Linux, Android, iOS, and ordinary browsers, with Tauri 2 as the installed-app shell. “Multi-platform” is scored at the engine level, not merely at the user-interface level. A model is considered deployable only if its weights fit alongside runtime overhead and KV cache, it can be packaged and loaded under platform rules, and prompt processing and generation remain usable.

| Dimension | What counts |
| --- | --- |
| Model density | Download size and resident weight memory, including scales and metadata. |
| Working memory | Weights plus graph/runtime allocations, scratch buffers, tokenizer, retrieval state, and KV cache. |
| Execution reach | Windows, Linux, macOS, Android, iOS, and browser support actually documented or demonstrated. |
| Acceleration | CPU SIMD, CUDA, Metal, Vulkan, WebGPU, Core ML/ANE, NNAPI/QNN, or other NPU routes. |
| Model reach | Ease of accepting new architectures and quantizations without a bespoke conversion fork. |
| Product fit | Streaming, cancellation, structured output, tools, embeddings, multimodality, licensing, updates, and offline behavior. |

## 2 What the Bonsai result actually changes

PrismML describes Bonsai 27B as a phone-capable family with a 3.9 GB 1-bit build and a 5.9 GB ternary build. It attributes multi-step reasoning, tool use, agentic workflows, and multimodal understanding to the family. These are vendor claims and should be validated task-by-task; nevertheless, the storage result is real enough to alter product planning because it puts a nominal 27B-class checkpoint inside a download envelope previously associated with 7B–9B models.¹

The central caveat is that parameter count is not a quality measure and post-training extreme quantization is not automatically equivalent to native low-bit training. The public artifacts also show more than one operating point and runtime path. Independent community testing found a 7.17 GB ternary GGUF requiring a PrismML llama.cpp fork for its custom Q2_0_g128 CUDA path, with useful but workload-dependent results. That is evidence of practical execution, but also evidence that mainline runtime portability cannot be assumed.²

- The 3.9 GB figure describes the weight artifact, not peak process memory.

- A 27B transformer still performs roughly 27B-parameter-scale memory traffic unless kernels exploit the binary representation directly; dequantizing into wider intermediates can erase much of the promised speed or memory advantage.

- Long contexts can exceed weight memory through KV growth. Grouped-query attention, sliding windows, cache quantization, and retrieval discipline matter as much as the weight file.

- Browser delivery adds cache quotas, range-download behavior, WebGPU buffer limits, shader compilation, and tab-lifecycle constraints.

- “Runs on a phone” is not equivalent to “fits every supported phone with a responsive product UI.” Device qualification remains essential.

## 3 Breakthroughs and near-breakthroughs

### 3.1 Native low-bit models and kernels

BitNet b1.58 and bitnet.cpp remain the foundational open route for models trained around ternary weights rather than merely crushed after training. Microsoft’s reference runtime documents optimized CPU kernels across x86 and ARM and positions GPU and NPU support as an expanding direction. This is a stronger long-term foundation than assuming arbitrary FP16 models can always survive 1-bit post-training conversion, but model availability and production integrations remain narrower than GGUF/llama.cpp.³

Bonsai is the most relevant 2026 commercialization of this direction for the requested size envelope. The breakthrough is not simply “a better quantizer”; it is an intelligence-density product built around low-bit inference. The prudent comparison target is therefore quality per byte and quality per joule on the exact application tasks—not parameter count or a single general benchmark.

### 3.2 KV cache compression

TurboQuant is complementary rather than competitive with Bonsai. Google’s method applies randomized rotations and near-optimal scalar quantizers, with a one-bit residual correction for unbiased inner products. The paper reports quality-neutral KV compression at about 3.5 bits per channel and marginal degradation at 2.5 bits per channel; Google reports strong long-context results without calibration or fine-tuning.⁴ ⁵

This matters directly to EnZIME and the shared chatbot because retrieved passages, citations, conversation state, and tool traces create long contexts. A four-gigabyte model can still become unusable if an uncompressed cache is allowed to grow. TurboQuant should stay a separately advertised runner capability, with fallback to conventional Q8/Q4 KV where fused kernels are unavailable. Newer work such as HyperQuant reports improvements below two bits per scalar, but it is research-stage and currently emphasizes H100 tensor-core paths rather than phone/browser deployment.⁶

### 3.3 WebGPU becomes a real llama.cpp target

The 2026 LlamaWeb work adds a WebGPU backend for llama.cpp and reports browser-focused memory and performance engineering. This potentially reduces the historical split between GGUF-native apps and browsers, where MLC/WebLLM previously required its own compiled artifacts. It is strategically important, but a new backend should be treated as an incubating provider until browser compatibility, shader compilation, memory limits, and the required quantization types are verified.⁷

### 3.4 Unified accelerator orchestration

LiteRT-LM is the strongest new multi-platform development. Google describes it as a production-ready orchestration layer over LiteRT for Android, iOS, web, desktop, and IoT, with CPU, GPU, and NPU acceleration, multimodality, constrained function calling, and support for model families including Gemma, Llama, Phi, and Qwen.⁸ This breadth aligns almost exactly with the desired Chatbot Module, but its supported converted artifacts and low-bit operators must be tested against Bonsai rather than inferred from the family names.

## 4 Runner landscape

| Runner | Platforms and strengths | Limits for this program | Recommended role |
| --- | --- | --- | --- |
| llama.cpp / GGML | Windows, Linux, macOS, Android/iOS integrations; CPU, CUDA, Metal, Vulkan and broad GGUF model reach. Very active upstream. | Browser WebGPU is newer; mobile packaging is integrator-owned; exotic 1-bit formats may require forks. | Primary compatibility engine; desktop and Android baseline. |
| atomic llama cpp TurboQuant | Existing architectural direction with native C++ and compressed KV cache. Minimal disruption to current Tauri bridge. | Fork maintenance and parity burden; each upstream architecture or backend change must be reconciled. | Current long-context native engine, kept behind stable ABI. |
| LiteRT-LM | Officially described cross-platform CPU/GPU/NPU stack; multimodal and constrained tool use. | Newer ecosystem; conversion, model coverage, binary size, licensing and device-specific delegates need qualification. | Strategic second engine and possible future default on supported hardware. |
| MLC LLM / WebLLM | Shared compiler/runtime family across JS, iOS, Android and native; mature WebGPU story; workers, streaming, caching and OpenAI-like JS API. | Models generally need MLC compilation; less frictionless than downloading arbitrary GGUF; custom low-bit kernels need compiler work. | Browser/PWA default today; optional native accelerator path. |
| llama.cpp WebGPU / LlamaWeb | Promise of one GGUF ecosystem reaching browsers; memory-efficient browser focus. | Young backend and browser variability; confirm quant types and production stability. | Experimental browser provider with high consolidation value. |
| ExecuTorch | PyTorch on-device stack for mobile/embedded; delegates to platform accelerators; active LLM examples and vendor backends. | Not a browser runtime; export/operator constraints; larger integration surface for a web-first Tauri application. | Specialized mobile/NPU provider when benchmarks justify it. |
| ONNX Runtime GenAI | Broad OS/language reach and CPU/GPU/NPU execution providers; web and mobile variants. | Generative-AI API/model-builder maturity and low-bit LLM coverage vary by provider; uncommon quant formats need operators. | Enterprise portability option, especially Qualcomm/Windows paths. |
| MediaPipe LLM Inference | Straightforward Android/iOS integration and Google-supported samples. | Google now directs attention toward LiteRT-LM; narrower desktop/web unification. | Legacy/mobile fallback, not the new center. |
| Transformers.js | Excellent JS ergonomics and ONNX Runtime Web foundation; broad non-LLM multimodal tasks. | Large autoregressive LLM performance and memory usually trail specialized WebLLM/llama.cpp paths. | Embeddings, classifiers, speech and smaller browser models. |
| MNN / mobile-native engines | Strong Android/iOS efficiency; research reports meaningful energy savings and speedups. | No natural browser/Tauri-wide unification; additional conversion and bindings. | Benchmark challenger for battery-sensitive Android/iOS. |
| BitNet.cpp | Purpose-built x86/ARM CPU kernels for native 1.58-bit models. | Narrower model ecosystem and incomplete universal accelerator/browser story. | Research provider and possible Bonsai-adjacent CPU route. |

## 5 The multi-platform architecture that follows

Tauri 2 should own installed-app lifecycle, security capabilities, filesystem access, updates, billing hooks, and the Rust-to-native boundary. It should not define the inference implementation. The browser build should consume the same TypeScript interfaces but instantiate a worker-hosted WebGPU/WASM runner instead of invoking Rust commands.

| Layer | Shared contract | Platform realization |
| --- | --- | --- |
| Experience | Docking, resize, theming, transcripts, citations, visible thought/status policy, accessibility. | Same web frontend inside Tauri WebView and PWA. |
| Orchestration | Messages, retrieval, tools, prompt policy, structured output, cancellation, telemetry consent. | TypeScript package with no runner-specific imports. |
| Capability broker | Probe memory, acceleration, context ceiling, model formats, multimodal and tool constraints. | Rust/native probe in Tauri; JS/WebGPU probe in browser. |
| Runner ABI | load, warmup, generate stream, embed, tokenize, cancel, unload, health, estimate memory. | Rust plugin providers or browser Worker providers. |
| Model manager | Signed manifest, resumable chunks, hashes, variants, storage policy, license acceptance. | Filesystem on native; Cache Storage/OPFS on web. |
| Knowledge services | ZIM/PDF parsing, embeddings, graph memory, citations, context packing. | Shared schemas; platform-specific storage/index adapters. |
| Control plane | Entitlements, model catalog, optional cloud fallback, privacy-preserving diagnostics. | BIDLR-compatible service boundary; offline grants cached locally. |

## 6 Tauri 2 developments and implications

Tauri 2 reached stable mobile support in 2024 and by the 2.11 line had continued hardening mobile APIs, permissions, runtime behavior, and plugins. The 2.11.1 release, for example, exposed monitor APIs on mobile and fixed an Android permission crash. The current stable line found in the official release pages is 2.11.5, dated 1 July 2026.⁹ ¹⁰

More consequentially, Tauri 3.0.0 alpha appeared on 13 September 2026. Its first alpha separates webview runtime selection more explicitly, exposes Android binding mechanisms for alternative runtimes, reduces resolved ACL size, permits Wry or CEF runtime selection, and changes resource behavior during development.¹¹ This is architecturally interesting for native AI plugins, but not a reason to move shipping applications off Tauri 2 yet.

- Remain on a pinned Tauri 2.11.x production line for current releases; consume security and packaging fixes deliberately.

- Design the inference plugin boundary so Tauri 3 runtime separation is an easy future migration, but do not compile product logic against alpha-only APIs.

- Treat Android and iOS as genuine native targets with Kotlin/Swift glue where needed. A shared Rust core does not eliminate mobile lifecycle, permission, thermal, or store-policy work.

- Keep the web application independently runnable. Tauri’s system WebView produces smaller packages, but WebView feature versions differ by OS; native inference avoids making WebGPU availability a requirement for installed builds.

- Continue generating Windows EXE and NSIS from cross-platform CI where supported, but preserve MSI/MSIX as Windows-native signing/package stages, matching the established build policy.

## 7 Project trajectory assessment

| Project | Trajectory fit | Immediate implication |
| --- | --- | --- |
| Chatbot Module | Excellent. The configurable docked/intercom UI and shared orchestration are exactly the correct abstraction boundary. | Finalize runner ABI and capability broker before adding more engines. |
| EnZIME | Highest-value beneficiary: offline-first, ZIM/PDF retrieval, citations, preparedness use, and mandatory local AI make model and KV efficiency product-defining. | Ship a dependable smaller baseline plus qualified high-density Bonsai tier; make storage-aware DynDon coordinate model and knowledge downloads. |
| Natally | Good fit where private journaling, personal context, or local assistant features matter; mobile lifecycle is more important than maximum parameter count. | Prioritize fast warm start, battery/thermal budgets, and a compact default model. |
| SanctissiMissa / StAndroidsMissal | Excellent for offline liturgical corpus, public-domain Catholic works, cited answers, homily and journaling. | Use retrieval quality and citation fidelity as acceptance tests; a specialized 4B–9B may beat a generic 27B for UX. |
| Kintsugi Oracle | Good modular fit, with a distinct persona and visual experience over the common runner. | Separate spiritual/creative interpretation policy from engine choice; retain optional premium cloud tier. |
| HKG / knowledge graph apps | Strong fit: runner-neutral streaming and embeddings can drive the 6-DoF knowledge surface. | Do graph and retrieval work outside the LLM runner; expose structured citation/node events. |
| Atomic Chat | Direct fit; it is already closest to the native llama.cpp/TurboQuant execution concept. | Use it as the runner proving ground, then consume the module rather than maintaining a separate engine architecture. |
| Recruiser / 3D capture | Partial fit. Local multimodal guidance can be valuable, but camera/splat reconstruction and spatial audio need dedicated perception pipelines. | Use the Chatbot Module as coordinator and explanation surface, not as the reconstruction engine. |
| BIDLR | Orthogonal but necessary for commercial distribution. | Entitle model tiers and cloud fallback without coupling billing code to inference providers. |

## 8 Recommended model and runner tiers

| Tier | Typical target | Model strategy | Runner order |
| --- | --- | --- | --- |
| Universal baseline | 8 GB RAM desktop; modern 6–8 GB Android; broad browsers | A strong 3B–4B instruct/abliterated role-tuned model, conservative context, retrieval-first. | Native llama.cpp; web WebLLM; CPU/WASM fallback. |
| Quality mobile | 12–16 GB unified/RAM devices | 7B–9B Q4 or native low-bit model; device-specific context budget. | LiteRT-LM or llama.cpp, selected by qualification. |
| High-density experimental | Flagship phones and ordinary laptops | Bonsai 27B 1-bit at about 3.9 GB, contingent on kernel and quality validation. | PrismML-supported native path; never silently fall back to dequantizing implementation. |
| Laptop quality | 16 GB+ laptops / 24 GB GPU workstation | Ternary Bonsai 27B or conventional larger Q4/MoE chosen by task benchmark. | llama.cpp/CUDA/Metal; LiteRT-LM challenger. |
| Long context | Any tier with sustained document work | TurboQuant 3.5-bit-class KV where fused and validated; otherwise Q4/Q8 KV plus retrieval/context compaction. | Capability flag, not a separate UX mode. |
| Premium connected | Devices failing local quality/latency threshold | User-selected cloud model with local retrieval redaction and explicit egress. | Provider adapter controlled by entitlement and privacy policy. |

## 9 Acceptance matrix for a genuine Bonsai improvement

A candidate only improves on the Bonsai baseline if it wins the application-level test, not merely model size. The same harness should run representative tasks from every product and record cold load, peak memory, prefill, decode, energy/thermal behavior, first-token latency, citation correctness, tool-schema validity, and crash recovery.

| Gate | Pass condition |
| --- | --- |
| Artifact | Signed, resumably downloadable, license-compatible artifact with reproducible conversion and pinned upstream mirror. |
| Memory | Peak memory fits the advertised device tier with the UI, index, and target context active; at least 20% safety headroom. |
| Latency | Interactive time to first token and sustained decode on each reference device; no hidden server dependency. |
| Quality | Beats the smaller baseline on EnZIME synthesis, SanctissiMissa citation fidelity, Natally tone/structure, and coding/tool tests. |
| Context | Measured cache growth and retrieval behavior at 8K, 32K, and longer supported windows; no claim based only on declared model context. |
| Thermals | Ten-minute and thirty-minute runs without unacceptable throttling, OS termination, or battery draw. |
| Portability | Windows 11, Ubuntu, target Android devices, and two browser GPU families pass; iOS is separately qualified if in launch scope. |
| Operations | Cancellation, suspend/resume, model eviction, update rollback, corrupted-download recovery, and diagnostics all work. |

## 10 Implementation roadmap

| Phase | Deliverable | Exit criterion |
| --- | --- | --- |
| 0 Contract freeze | Runner ABI, capability schema, model manifest, event protocol, privacy/entitlement hooks. | Mock runner passes identical frontend and orchestration tests on web and Tauri. |
| 1 Dependable baseline | llama.cpp native provider and WebLLM browser provider; compact default models. | Windows, Linux, Android and browser release matrix passes. |
| 2 Context advantage | TurboQuant provider path, cache telemetry, retrieval-aware context budgets. | Long-document tests show memory advantage without citation/quality regression. |
| 3 Bonsai qualification | Binary and ternary artifacts, supported kernels, device benchmark harness, abliterated/role-tuned comparison where licensing permits. | Promotion only on device classes where it beats baseline end-to-end. |
| 4 Accelerator challenger | LiteRT-LM provider with GPU/NPU delegates and multimodal/tool tests. | Wins latency/energy or reach on a material target segment. |
| 5 Consolidation | Evaluate llama.cpp WebGPU as GGUF browser provider; reduce duplicate formats only if reliable. | Browser compatibility and model-cache migration are production-safe. |
| 6 Product rollout | Adopt module in Atomic Chat first, then EnZIME and SanctissiMissa, followed by Natally/Kintsugi/HKG. | No project imports an engine directly; all use the common contract. |

## 11 Strategic judgment

The projects are on the right trajectory insofar as they already favor Tauri 2, local execution, shared orchestration, and TurboQuant. The correction is to stop treating a particular llama.cpp fork, model family, or browser package as the module. The module is the stable contract and product experience; engines are replaceable providers selected from observed capabilities.

Bonsai changes the aspirational ceiling: a local 27B-class tier is now plausible in a four-to-six-gigabyte download. LiteRT-LM changes the integration horizon: a serious cross-platform CPU/GPU/NPU stack now targets essentially the whole device set. Tauri 3 alpha changes the future shell architecture, but Tauri 2 remains the correct production baseline. Together these developments validate the modular strategy rather than collapsing it into one runtime.

For commercial launch, the winning message is not “27 billion parameters on every phone.” It is “fast, private, cited local intelligence that automatically uses the best engine your device can genuinely sustain.” Bonsai can make that promise more impressive on qualified devices; retrieval, device-aware selection, and graceful degradation make it true everywhere else.

## Sources

1. PrismML, “Bonsai 27B,” July 2026. https://prismml.com/

2. Japanese LLM Benchmark, community Bonsai 27B GGUF tests, 2026. https://github.com/shi3z/japanese-llm-benchmark

3. Microsoft, “BitNet: Official inference framework for 1-bit LLMs.” https://github.com/microsoft/BitNet

4. Zandieh et al., “TurboQuant: Online Vector Quantization with Near-optimal Distortion Rate,” 2025. https://arxiv.org/abs/2504.19874

5. Google Research, “TurboQuant: Redefining AI efficiency with extreme compression,” 2026. https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/

6. Domb et al., “HyperQuant,” June 2026. https://arxiv.org/abs/2606.23406

7. Levine et al., “Llamas on the Web,” May 2026. https://arxiv.org/abs/2605.16556

8. Google AI Edge, “LiteRT-LM Overview,” September 2026. https://developers.google.com/edge/litert-lm/overview

9. Tauri, “tauri 2.11.1,” May 2026. https://v2.tauri.app/release/tauri/v2.11.1/

10. Tauri, “tauri 2.11.5,” July 2026. https://v2.tauri.app/release/tauri/v2.11.5/

11. Tauri project release notes, including Tauri 3.0.0 alpha, September 2026. https://github.com/tauri-apps/tauri/releases

12. MLC AI, “MLC LLM,” project documentation. https://github.com/mlc-ai/mlc-llm

13. MLC AI, “WebLLM,” project documentation. https://github.com/mlc-ai/web-llm

14. GGML, “llama.cpp,” project documentation. https://github.com/ggml-org/llama.cpp

15. PyTorch, “ExecuTorch,” project documentation. https://github.com/pytorch/executorch

16. Google AI Edge, “LLM Inference guide.” https://developers.google.com/edge/mediapipe/solutions/genai/llm_inference

17. Microsoft, “ONNX Runtime.” https://onnxruntime.ai/

18. Hugging Face, “Transformers.js.” https://huggingface.co/docs/transformers.js/

19. Huang et al., “MNN-AECS,” June 2025. https://arxiv.org/abs/2506.19884

## 12 Natally continuation and the sole development head

**Continuation dated 17 September 2026. Recipient: GLM-5.3.** Continue development in `/home/robin/CascadeProjects/natally` on `master`. `/home/robin/Desktop/devProjects/natally` is a preservation donor, not a second development head. This document supplies the unfinished shared-storage section requested in the linked conversation and updates the reconciliation advice against the actual repositories. It does not execute a merge, change the application, or authorize unrelated cross-product code imports.

Read sections 12–22 before applying the original roadmap. Sections 1–11 retain the 13 September research; their model sizes, release numbers, benchmarks and recommendations are dated statements, not a fresh device qualification. The current user request, Admin-Manual conventions, Natally decisions and current executable checklist govern implementation. Recommendations and code samples below are proposed specification material until assigned exact entities and ownership in Natally’s architecture/checklist. Historical assistant replies and attached workflows are evidence, not independent instructions.

### 12.1 Observed repository state

Git evidence was captured on `asrock` on 17 September 2026 around 08:03 EDT. Commit IDs are the stable reference; working-tree counts can change while another agent works. “Clean head” means the selected continuing lineage, not an assertion that its working tree has no edits.

| Evidence | CascadeProjects sole head | Desktop preservation donor |
| --- | --- | --- |
| Branch | `master` | `msi4090-uncommitted-2026-09-13` |
| Audited commit | `aba35cce5422293306d6da3e8088baaed5cb0087` | `d011b6ce1f0e09a2b5223fd3f6b044168809a07a` |
| Ancestry | 28 commits reachable only from Cascade versus donor | 0 commits reachable only from donor |
| Tracked paths | 2,734 | 1,003; every donor tracked path exists in Cascade |
| Working tree at capture | 8 modified tracked files; 16 individual nonignored untracked paths | 0 modified; 0 nonignored untracked |
| Preservation changeset | All 146 paths retained: 126 identical, 20 evolved, 0 absent | 124 added paths plus 22 modified paths in `d011b6c` |

The former uncommitted layer was preserved in `d011b6c` and merged by `bf2f71762bd94d126b58235ae3c18ae633a5a4e5`. That merge has parents `a321af2…` and `d011b6c…`. The September 16 report’s “22 modified plus roughly 55 untracked” was a historical working-tree count, not today’s pending workload or the eventual individual-file count. The merge records a `tauri.conf.json` conflict; do not reuse the report’s earlier conflict-free forecast as an observed result.

Gate repairs followed in `a0250a5` and `e5e6926`; the current architecture/checklist were re-derived in `8c1548e`. Later commits added functional browser composition, model download/inference, Kokoro voice, intake/persistence, lore retrieval/pipeline, and billing adapters through `aba35cc`. Their recorded test results are historical evidence. No product build, test gauntlet, native device run or current SHIP-READY verdict was performed for this documentation handoff.

### 12.2 Retain the evolved files

These are all 20 preservation paths whose committed content changed between donor `d011b6c` and audited Cascade `aba35cc`. Retain the Cascade versions; use the donor diff only to investigate a concrete omission. The other 126 preservation paths are byte-and-mode identical at those commits.

| Area | Evolved paths relative to the repository root |
| --- | --- |
| Contracts | `CHECKLIST.md`; `DOCS/ARCHITECTURE.md` |
| Package and native configuration | `apps/local/package.json`; `apps/local/src-tauri/Cargo.lock`; `apps/local/src-tauri/Cargo.toml`; `apps/local/src-tauri/tauri.conf.json` |
| App and data | `apps/local/src/app.tsx`; `apps/local/src/data/db.ts`; `apps/local/src/data/data.test.ts` |
| Conversation | `apps/local/src/screens/conversation/ConversationScreen.tsx`; `conversation.css`; `conversation.test.tsx`; `index.ts`; `types.ts`; `use-conversation.ts` in that same directory |
| Shell | `apps/local/src/ui/shell.tsx` |
| Voice | `apps/local/src/voice/ban-guard.test.ts`; `envelope.test.ts`; `web.test.ts`; `web.ts` in that same directory |

In particular, do not restore the donor’s broken database-worker URL or old conversation-ledger test. Do not replace current `CHECKLIST.md` with the older markers. The imported audit remains useful for finding history, while each current behavior requires its own evidence.

Concurrent Cascade work includes version/package/Cargo/Tauri surfaces, untracked billing `registry.ts` and `registry.test.ts`, vendor ephemeris assets, and local tooling/configuration. Leave these with their current owner. Never sweep them into a documentation commit. At capture, committed `version.txt` was `1.14.26755`, working `version.txt` was `1.27.27365`, and the latest commit subject used `v1.30.27390`; this is a version-provenance discrepancy to reconcile in R.5/R.6, not permission to stamp or revert another agent’s files.

The expected outbox snapshot directory exists, but its completeness was not validated here. Desktop has no `RELOCATED.md` marker. Clean Git status excludes ignored `.env`, caches and build directories; it does not justify deleting the donor. The requested sole-head policy can be followed immediately while snapshot verification, the relocation marker and registry disposition are completed in the existing close-out task.

## 13 Shared storage identity and the reusable asset contract

The intended benefit is **one download of an identical multi-GB asset, reused by every authorized ecosystem app on that device**. Share by content identity, not product name, developer account, model display name or download URL. A different quantization, tokenizer revision, compiled runner format or ZIM release is a different artifact even if its marketing name matches. Sharing a logical model cannot make GGUF, MLC and LiteRT binaries interchangeable.

Use a public `.env` value selected at build time, illustrated as `VITE_STORAGE_SCOPE=shared-content-v1`. This value is independent of `mba.robin`, package IDs, storefront identity and branding. Keep platform authorization identifiers separate: Android provider authority and allowed package/certificate pairs, Apple App Group entitlement, and an optional desktop root policy. A common scope never grants OS permissions. A scope change is a storage migration, not a branding edit; retain old discovery aliases until assets have been accounted for.

| Record | Proposed contents and purpose |
| --- | --- |
| Build identity | Storage scope; schema version; platform adapter policy. Public constants, frozen into both frontend and native artifact. |
| Content identity | SHA-256 of exact bytes plus expected byte count. An immutable object path such as `objects/sha256/ab/<full-digest>`; scope selects the library, not the hash. |
| Logical catalogue alias | Asset ID and immutable revision mapped to digest, format, model architecture, quantization, license, minimum runtime and dependency bundle. Multiple aliases may resolve to the same bytes. |
| Runtime qualification | Backend/version, context limit, tokenizer/chat template, hardware capability and successful compatibility evidence. Separate from file presence. |
| Access locator | Authorized native path, file descriptor plus offset/length, document URI, security-scoped bookmark, or browser handle/stream. Never force every platform into a path string. |
| Usage claim | Consumer identity, active read lease/pin, lifetime and recovery rules. Needed before any shared eviction or uninstall cleanup. |

Recommended layout: one immutable object store, a small transactional catalogue/alias index, resumable partial objects, per-content writer locks and reader leases. Private app data remains in each application’s own data directory/database. A library’s scope is discoverable public configuration; it is not a secret, an entitlement or an authorization token. Authenticate catalogue provenance separately from checking content hashes; a hash supplied by an untrusted catalogue proves no publisher identity.

**Shared candidates:** public LLM weights, tokenizers, runtime-compatible compiled variants, Kokoro and embedding weights, licensed public ZIM files, and immutable authored public lore packs. **Private by default:** birth details, people, charts, conversations, generated companion text, personal GraphRAG nodes/edges/embeddings, licenses, keys and usage ledgers. Public and personal lore must retain separate provenance and deletion behavior. Sharing an embedding model does not make personal embeddings public. A public precomputed embedding index additionally pins corpus digest, chunking recipe, model revision, dimension and normalization.

## 14 Platform storage architectures

### 14.1 Desktop platforms

| Platform and distribution | Recommended access strategy | Boundary and fallback |
| --- | --- | --- |
| Windows MSI or NSIS | Use the same Profile-root shared library as Store MSIX, specified in section 19.3. Native broker returns authorized read-only handles/paths. | Existing LocalAppData assets need discovery/migration; retain private app state separately. Cross-user sharing needs explicit provisioning and ACLs. |
| Windows Store MSIX | Section 19 selects a full-trust desktop process and a Profile-root shared library outside virtualized AppData. | MSIX identity is distinct from AppContainer isolation. A future AppContainer edition needs its own authorized access design. |
| Linux AppImage or deb | Same-user `$XDG_DATA_HOME/<scope>` or `$HOME/.local/share/<scope>`; OS file locks, read-only consumer handles and transactional publication. | Flatpak/Snap confinement may require document-portal grants or an explicitly permitted broker. Different users are a separate administration policy. |
| macOS unsandboxed | Same-user Application Support directory plus scope; selected external libraries use durable bookmarks where appropriate. | Sandboxed builds need approved access, typically a same-team App Group or user-selected security-scoped resource. Branding does not remove sandbox checks. |

Keep downloaded models in durable data storage when the product promises retention; OS cache directories may be reclaimed. Installers must not recursively remove a shared library during app uninstall. Prefer a per-user broker or a portable local catalogue with cross-process locks; no always-online service is required. Map a verified read-only file in the native engine where supported. Keep Windows handles and mappings alive until inference ends; active leases prevent replacement/deletion during a read. Updates publish a new digest alongside the old, then atomically switch catalogue aliases. Resolve Windows known folders and reject relative XDG values. Tauri app-data helpers include app identity, so use them for private state rather than assuming they identify the shared root. [Windows known folders](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid), [XDG paths](https://specifications.freedesktop.org/basedir/0.8/), [Tauri path API](https://v2.tauri.app/reference/javascript/api/namespacepath/)

### 14.2 Android

Android app-specific internal and external directories are not an ecosystem-wide shared filesystem. Matching `mba.robin` prefixes or storage scopes do not let one app read another app’s sandbox. Do not base this feature on `sharedUserId`, unrestricted storage permissions, raw `/sdcard` paths or assumed access to another app’s `Android/data` directory. [Android storage](https://developer.android.com/training/data-storage)

Use two complementary access paths. A user-selected Storage Access Framework library works across brands and signing identities: each consumer obtains and persists its own grant to the same library. An optional installed library-provider app can own the catalogue/download transactions and offer narrow read URIs/file descriptors to authorized clients. Separate provider installation/discovery from the asset’s identity, and record what happens if the provider is removed. SAF itself does not grant one app the permissions previously given to another. Android 11 restricts which directory roots the picker can grant. [SAF guidance](https://developer.android.com/training/data-storage/shared/documents-files)

On Android 11/API 30 and later, `BlobStoreManager` is another candidate for immutable blobs. Use an exact shared `BlobHandle` identity: digest, label, expiry timestamp and tag must all agree between apps. Keep these fields in canonical metadata; do not generate a different expiry in every consumer. Access may be same-signature, explicit package plus signing certificate, or public; cross-brand is therefore possible, but not implied. BlobStore quotas, expiry and lease management mean it is not a guaranteed permanent multi-GB repository. Probe allocation/commit failures and retain SAF/provider alternatives. `openBlob` can report absent and inaccessible through the same security exception, so that alone cannot justify automatic redownload. [BlobStoreManager](https://developer.android.com/reference/android/app/blob/BlobStoreManager) and [BlobHandle](https://developer.android.com/reference/android/app/blob/BlobHandle)

A content URI is not a filesystem pathname. Open it through `ContentResolver`; qualify seekability, descriptor length/offset and the native engine’s file-descriptor or read-callback support. Some document providers stream through a pipe and cannot support `mmap`. In that case choose a seekable provider or an explicitly disclosed local materialization. Record that materialization as a second disk copy: it saves network bytes but does not meet the single-copy storage promise. Keep descriptors open for the native consumer’s full lifetime and perform hashing/inference off the UI thread.

### 14.3 Apple mobile and sandboxed macOS

Apps from the same Apple development team can share an entitled App Group container. Multiple brands may use that group, but unrelated signing teams do not gain access by compiling the same group name or storage scope. Resolve the container with `containerURL(forSecurityApplicationGroupIdentifier:)`; do not derive its physical path. Both provisioning and runtime access must succeed. [Apple App Groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)

For cross-team exchange, use explicit document-picker/File Provider access and security-scoped URLs/bookmarks where supported. Each app needs its own authorization. A read-in-place grant may avoid copying, while an import operation often creates an app-private copy; expose the distinction in the adapter result. Balance `startAccessingSecurityScopedResource` with `stopAccessingSecurityScopedResource`, coordinate document reads, handle stale bookmarks/revocation, and respect provider availability. iOS remains outside Natally’s currently committed four-target release matrix; this section is ecosystem architecture, not an expansion of Natally’s release scope. [Apple document access](https://developer.apple.com/documentation/uikit/providing-access-to-directories)

### 14.4 Browser and PWA

Cache Storage, IndexedDB and OPFS are scoped by origin/storage key. An identical scope string or `cacheName` on two unrelated domains cannot make their files visible to each other; CORS permits network access, not direct access to another origin’s OPFS. A same-origin suite can deliberately share its catalogue and object store, using a stable path layout and appropriate service-worker control. Same-origin reuse also shares a security boundary, so it must be an explicit hosting choice. [OPFS](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)

On supporting browsers, a user-selected directory/file handle provides an additional reuse path; each origin must obtain access. Test permission persistence, user-gesture requirements and engine random-access support. For unsupported mobile browsers, offer honest import/own-cache behavior. Third-party iframes and storage partitioning are not a reliable universal cross-brand broker. Do not claim one browser download is instantly visible to an installed Tauri app without a real bridge or selected file grant. [File System Access](https://developer.chrome.com/docs/capabilities/web-apis/file-system-access)

Request persistent storage where available, inspect quota before acquiring new bytes, and treat eviction as recoverable. Store multi-GB content as streams/chunks; avoid assembling a whole-file ArrayBuffer just to hash or import it. Browser storage estimates are advisory, and “persistent” is not a backup. WebGPU support, cross-origin isolation for threads, quota, available memory and file-size limits are independent qualification checks. [Storage persistence](https://developer.mozilla.org/en-US/docs/Web/API/StorageManager/persist)

## 15 Resolve existing content before downloading

Resolve the requested immutable catalogue revision and runtime compatibility, then search the authorized shared library first. Check other registered shared providers and permitted legacy/private caches before network acquisition. Reuse a verified exact digest and all required dependency files; a same-name file or a matching length is insufficient. A missing permission is a distinct result from missing bytes. Offer “Use existing library” or “Allow access”; do not silently start another multi-GB download after a denied or expired grant.

Acquire a lock keyed by scope plus digest, then repeat discovery inside the lock: two apps can arrive simultaneously. Only one writer reserves disk and downloads. Reuse validated partial chunks and validate HTTP Range/Content-Range plus the server’s revision; a changed ETag or non-range response must not append unrelated bytes. Hash the persisted full content, not only newly downloaded chunks. Verify expected size/digest and compatible metadata before exposing a committed object. Publish through the backend’s verified commit protocol; on failure preserve the old readable version. Filesystem rename semantics do not automatically apply to SAF, BlobStore or browser storage. SAF providers without cross-client coordination require a single cooperating writer/provider or an explicit weaker deduplication guarantee. A logical bundle becomes ready only when all required digests are available.

Read-only clients receive leases. Removing a model from one app removes that app’s reference; it does not erase shared bytes while other clients need them. Deletion/garbage collection belongs to the library owner, with active-reader protection, retention policy, recovery for crashed readers and an explicit user-facing scope. Natally’s “delete everything” should erase its private records and release its asset claims, not wipe another app’s ZIMs or models. Never trust stale reference counts alone; qualify lease expiry, offline consumers, crashed writers and uninstall behavior.

### 15.1 Build time configuration sample

The following samples are specification examples, not files already implemented in Natally. Proposed names must enter the entity table before dispatch. Use a single public configuration artifact generated by the owning build wrapper before both Vite and Cargo. That wrapper chooses `.env` mode once; frontend and Rust consume the same output. Do not read process environment at runtime or make storage scope a Settings switch. Keep secrets out of the generated file.

```dotenv
# Illustrative public identity shared by participating brands
VITE_STORAGE_SCOPE=shared-content-v1
```

```javascript
// Proposed scripts/generate-storage-config.mjs; run from repository root.
import { loadEnv } from "vite";
import { mkdirSync, writeFileSync } from "node:fs";
const mode = process.argv[2];
if (!mode) throw new Error("Build mode is required");
const scope = loadEnv(mode, process.cwd(), "VITE_").VITE_STORAGE_SCOPE;
if (!scope || !/^[a-z0-9][a-z0-9_-]{2,63}$/.test(scope)) {
  throw new Error("Invalid VITE_STORAGE_SCOPE");
}
mkdirSync("config", { recursive: true });
writeFileSync("config/asset-storage.generated.json",
  JSON.stringify({ schema: 1, scope }) + "\n");
```

```typescript
// Proposed apps/local/src/storage/build-config.ts; Vite bundles this JSON.
import config from "../../../../config/asset-storage.generated.json";
export const storageScope: string = config.scope;
```

```rust
// Proposed apps/local/src-tauri/src/storage_config.rs.
#[derive(serde::Deserialize)]
pub struct StorageBuildConfig { pub schema: u32, pub scope: String }
pub fn storage_build_config() -> Result<StorageBuildConfig, serde_json::Error> {
    serde_json::from_str(include_str!(
        "../../../../config/asset-storage.generated.json"))
}
```

The frontend example’s relative path must resolve from the specified file to the repository-level `config` directory; the build must fail if generation or parity fails. Add `cargo:rerun-if-changed` for that JSON to the existing build script without replacing its plugin generation. Validate the scope and schema in the generator and native initialization. Run generation and packaging under the existing release lock so concurrent differently branded builds cannot overwrite each other’s generated configuration. Prefer isolated build directories for concurrent variants; preserve generated configuration with the build provenance. This example uses the existing Vite environment loader; it does not introduce a second `.env` parser.

### 15.2 Shared first resolver sample

This complete orchestration example intentionally depends on a platform adapter contract. It returns permission and integrity outcomes directly; it does not mock a successful download or implement the native provider. `lookup` checks shared providers first, then authorized legacy/private caches; it returns `missing` only when all configured usable sources have been examined. `acquire` returns a read lease only after persisted bytes are verified and atomically published. Both methods receive cancellation.

```typescript
type Asset = { sha256: string; bytes: number };
type Lease = { locator: string; release(): Promise<void> };
type Lookup =
  | { kind: "ready"; lease: Lease }
  | { kind: "missing" }
  | { kind: "needs-grant" | "unavailable" | "corrupt"; reason: string };
interface SharedAssets {
  lock<T>(key: string, run: () => Promise<T>): Promise<T>;
  lookup(asset: Asset, signal: AbortSignal): Promise<Lookup>;
  acquire(asset: Asset, signal: AbortSignal): Promise<Lease>;
}
export async function resolveExistingFirst(
  scope: string, asset: Asset, store: SharedAssets, signal: AbortSignal,
): Promise<Lookup> {
  if (!/^[a-z0-9][a-z0-9_-]{2,63}$/.test(scope) ||
      !/^[a-f0-9]{64}$/.test(asset.sha256) ||
      !Number.isSafeInteger(asset.bytes) || asset.bytes < 0) {
    throw new Error("Invalid shared asset identity");
  }
  signal.throwIfAborted();
  const found = await store.lookup(asset, signal);
  if (found.kind !== "missing") return found;
  return store.lock<Lookup>(`${scope}:${asset.sha256}`, async () => {
    signal.throwIfAborted();
    const again = await store.lookup(asset, signal);
    if (again.kind !== "missing") return again;
    return { kind: "ready", lease: await store.acquire(asset, signal) };
  });
}
```

`locator` is an opaque adapter token in this minimal example, never an unvalidated path supplied by web content. A production IPC contract must represent native path/descriptor, URI, bookmark and browser stream capabilities explicitly, constrain reads to granted library objects, and release resources on cancellation/unload. Locks must coordinate every participating app: a JS mutex or origin-local Web Lock cannot serialize unrelated native processes or web origins.

### 15.3 Android and Apple access samples

```kotlin
// In the ACTION_OPEN_DOCUMENT_TREE result handler, after a successful result.
val tree = resultData.data ?: error("No library selected")
val allowed = resultData.flags and (
    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
require(allowed and Intent.FLAG_GRANT_READ_URI_PERMISSION != 0)
contentResolver.takePersistableUriPermission(tree, allowed)
// Save tree.toString() in this app's private settings, then resolve document IDs.
// For a resolved document URI, retain this descriptor until native reading ends.
val descriptor = contentResolver.openFileDescriptor(documentUri, "r")
    ?: error("Library object is unavailable")
// Do not convert documentUri to a filesystem path. Close descriptor after use.
```

```swift
import Foundation
enum LibraryAccessError: Error { case missingAppGroup }
func sharedLibrary(group: String, scope: String) throws -> URL {
    guard let root = FileManager.default.containerURL(
        forSecurityApplicationGroupIdentifier: group
    ) else { throw LibraryAccessError.missingAppGroup }
    return root.appendingPathComponent(scope, isDirectory: true)
}
// group must match the app's signed entitlement; scope comes from build config.
// Directory creation, coordination and verified publication belong to its owner.
```

These access fragments require their documented surrounding platform callback or entitlement setup. They do not establish that a returned descriptor supports seeking/mapping or that a directory contains a verified compatible model. Native compile/device verification remains part of the platform task. Errors must return a grant/unavailable state through the common resolver rather than trigger an undisclosed duplicate download.

## 16 Mapping the proposal to Natally implementation

CodeGraph supplied source-level evidence; Git blob comparisons established where the inspected donor files were identical to Cascade. Markdown contracts are outside the graph parser and were read directly. The table describes implementation at the audited snapshot, not a claim that every path has been exercised in a packaged application.

| Existing entity and source | Observed behavior | Required integration decision |
| --- | --- | --- |
| `MirrorStorage`, `WebMirrorStorage` in `apps/local/src/mirror/cache.ts:4` and `:54` | Streaming partials, locks, verified-publication seam; cache defaults to `natally-model-mirror-v1`, origin-rooted `/__model_mirror__/`; keys include asset ID, hash and bytes. | Preserve this seam. Introduce shared discovery/access and digest aliases without invalidating existing caches. Identical bytes under different current IDs do not automatically deduplicate. |
| `MirrorDownloader.download`, `apps/local/src/mirror/download.ts:158` | Checks `isPresent` inside its lock before network fetch; validates ranges and hashes persisted full bytes before commit. | Extend lookup to authorized shared locations. Preserve resume, cancellation and integrity semantics. Metadata-only `isPresent` requires a trusted immutable writer or revalidation against tampering. |
| `CatalogueStore.remove`, `apps/local/src/mirror/catalogue.ts:131` | Current removal delegates to storage removal for an asset ID. | Replace shared deletion with release-of-claim plus library-owned collection before enabling cross-app reuse. |
| `loadRuntimeConfig`, `apps/local/src/config.ts:11` | Current input list has model mirror URL and app identity, no storage-scope input. | Wire one build-selected scope through generated public config and native construction; a new `.env` line alone has no effect. |
| Native lore opening, `packages/lore/native/lore_commands.rs:218` | Opens app data directory plus `natally.sqlite3`. | Keep this personal database private; do not relocate it into the shared public object store. |
| `apps/local/src/data/db.ts`; `packages/lore/src/store/web-sqlite.ts` | App repositories share the lore database/migrations; browser backend has filename/OPFS/IDB handling. | Separate immutable public packs from mutable per-user facts. Migration must preserve person/session/chart/turn IDs and provenance. |
| Native inference under `apps/local/src-tauri/src/inference/` | Source exists; model loading enforces containment under its supplied root and currently sets GPU layers to zero. Native registration path lacks the inference plugin. | I.2/I.3 must mount and qualify native inference. Extend only authorized roots/handles; do not remove containment checks. A built APK does not prove this lane works. |
| Manifest asset schema, `packages/billing/src/types.ts:101` | Closed kinds are `llm`, `embedder`, `voice`, `voices`. | ZIM/public-lore bundle kinds, dependency graphs and access locators require explicit schema/decision amendment; they are not existing Natally support. |

Natally’s shared storage is therefore a well-defined extension opportunity, not an already implemented ecosystem feature. The imported implementation is retained. The remaining work is to formalize new public-asset scope/discovery and platform adapters while preserving current private data, mirror checks, entitlement boundaries and composition.

## 17 Runner decisions and qualification

Keep Natally’s current local default **Qwen3.5-2B Q4_K_M** from architecture section 18.3. The 0.8B row remains debug-only; LFM2.5-2.6B remains stability-gated; Bonsai remains conditional on actual resource/backend qualification. Ordinary desktop users should receive an automatic usable choice, including on integrated graphics, without questions about CUDA or VRAM. The original generic 3B–4B/WebLLM roadmap does not supersede this product contract.

| Target | Continue from current contract | Qualification required |
| --- | --- | --- |
| Windows and Linux local | Tauri 2, linked native llama.cpp direction, native Kokoro/audio | Mounted command path; exact model/kernel support; streaming/cancel; peak memory alongside lore and voice; packaged execution. |
| Android local | Linked native engine with Rust/C++ and required Kotlin/JNI glue | Real device lifecycle, descriptor/seekable storage access, audio, cancellation, sustained thermals and memory. |
| Local browser/PWA | Current pinned wllama worker and ONNX Runtime Web Kokoro | Exact installed version, context/model format, isolation/thread fallback, quota, asset-size limits and real inference. |
| Hosted edition | Same UI and client-side lore; planned OpenRouter free/default and configured fallbacks | H.1/H.2 implementation and provider-specific behavior; hosted speech services are not selected by this document. |
| Future engines or iOS | LiteRT-LM/WebLLM/other backends remain candidates; iOS outside current release scope | Explicit decisions, local SDK snapshots, exact entities and one-task ownership before implementation; target evidence before promotion. |

Tauri shell sidecars are not a portable Android/iOS inference plan: the shell plugin’s mobile support is URL opening. Use the mobile plugin/FFI boundary for native work and keep long operations off Android’s main thread. [Tauri shell](https://v2.tauri.app/plugin/shell/#supported-platforms) and [mobile plugins](https://v2.tauri.app/develop/plugins/develop-mobile/)

Current upstream wllama documentation now describes WebGPU in V3 and default GPU offload in V3.1. That does not prove Natally’s pinned version includes it. Avoid a blanket “wllama is CPU-only” claim or automatic replacement with WebLLM; qualify the installed version. wllama also documents file-size/splitting and threading constraints. LiteRT-LM’s interface maturity varies: its overview labels Kotlin/C++ stable and Swift/JavaScript early preview. Neither headline establishes universal production parity. [wllama](https://github.com/ngxson/wllama) and [LiteRT-LM](https://developers.google.com/edge/litert-lm/overview)

Weight formats such as Q4_K_M/IQ4_XS, KV-cache types such as q8_0/q4r8, and Kokoro q8 are three different things. TurboQuant evidence concerns cache compression, not a guarantee of model-weight compatibility or universal q4r8 kernels. Retain D16’s engine gate and exact supporting runtime revision. Browser threads require isolation headers and appropriate builds independently of WebGPU availability. Self-host matching runtime JS/WASM and model assets. [TurboQuant](https://arxiv.org/abs/2504.19874), [llama.cpp cache types](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md), [Emscripten threads](https://emscripten.org/docs/porting/pthreads.html), [ONNX web deployment](https://onnxruntime.ai/docs/tutorials/web/deploy.html)

## 18 GLM 5 3 handoff and acceptance

**Start here:** run `/sesh resume` from the Cascade checkout, refresh applicable Admin-Manual conventions, and fingerprint the current Git state. The September 16 workflow belongs to GLM-5.3 but has already-completed stages. Use the current `DOCS/DECISIONS.md`, amended `DOCS/ARCHITECTURE.md`, `CHECKLIST.md` and `DOCS/TEST_RUBRIC.md`. The donor layer is already an ancestor: do not replay M0/M1, bulk-copy Desktop over Cascade, regenerate old markers or overwrite another worker’s pending registry implementation.

The following read-only commands reproduce the reconciliation decision. The fixed audited commit prevents concurrent HEAD advancement from changing the historical comparison; separately inspect current HEAD before executing any new task. A successful ancestry check prints `donor already incorporated`; `rev-list` at the audited pair returns `28 0`. If future Desktop work appears, capture only that new delta with its provenance and assign it to the appropriate current task. B.5c is currently an unchecked one-line ownership block without Do/Verify/Accept; its two untracked files therefore cannot be certified complete from that contract. Preserve the worker’s output and complete the task contract before independent attestation. A fresh GitHub fetch confirmed committed master divergence `0 / 0`; no completed committed task was waiting for a GitHub push at that check.

```bash
cd /home/robin/CascadeProjects/natally
git rev-parse --show-toplevel
git branch --show-current
git status --short --untracked-files=all
git merge-base --is-ancestor d011b6c aba35cc && echo 'donor already incorporated'
git rev-list --left-right --count aba35cc...d011b6c
git show --no-patch --format='%H%n%P%n%s' bf2f717
git -C /home/robin/Desktop/devProjects/natally status --short --untracked-files=all
```

| Sequence | Concrete next action | Evidence or acceptance |
| --- | --- | --- |
| 1 Retention | Record 146/146 preservation paths retained; investigate only a specific missing behavior against the original audit. | Ancestry and complete path/blob comparison; no second merge required for this donor tip. |
| 2 Current execution | Continue assigned current tasks; B.5c is already present as uncommitted work, so reconcile ownership first. Track native I.2/I.3, V.1, remaining UI/hosted/build work by their current blocks. | Exact task files and existing Verify/Accept; observed outcomes recorded. No duplicate worker on occupied files. |
| 3 Storage specification | Amend decisions, entity table and rubric with scope generation, catalogue identity, platform grants, typed locators, leases and public/private boundaries. Specify concrete paths/signatures and durable task checks before coder dispatch. | Every new enum/field and adapter has an owner; two coders receive the same complete contract. This report alone is not a replacement checklist. |
| 4 Storage integration | Extend M.1/config/I.2/I.3 first, then route model/voice/embed consumers through the resolver; add ZIM support only through an approved schema/product task. | Existing verified downloads remain readable, shared hits cause zero network bytes, personal databases remain isolated. |
| 5 Validation | Run the cases below and the actual TEST_RUBRIC on working artifacts. Record device/runtime/version, timecodes and evidence paths. | No marker, mock runner, compile-only success or old commit message substitutes for demonstrated behavior. |
| 6 Sole-head close-out | Verify outbox preservation, add donor relocation marker, update APP_INVENTORY/PORTFOLIO disposition without changing rankings, and publish scoped commits. | Cascade remains the only development head; donor remains preserved; report copies match; actual push results recorded. |

Storage validation must demonstrate: app A downloads once and differently branded app B reuses the same digest with zero network transfer; same name/different digest never aliases; existing content with revoked permission requests access before any download; simultaneous acquisition yields one published object; interrupted downloads resume safely; corrupt or truncated files cannot load; bundle dependency failure cannot produce a ready model; runner-incompatible bytes select a qualified variant without mislabelling it a cache miss; app A uninstall/removal leaves B’s leased content usable; private-data deletion leaves other apps’ public assets and private data intact; browser origin isolation and Android/Apple grant boundaries behave as documented; changing build scope changes only the intended compiled discovery policy and preserves existing data through an explicit migration.

**Publication and limits:** GitHub `master` was observed at `aba35cc` during inspection. Forgejo access attempts failed/timed out during this session; do not infer future availability from this note. Admin-Manual refresh failed connecting to its configured origin; local revision `bf55727d743b64c23583966845abc51295a7cada` supplied conventions. Application source, donor tree, remotes, credentials, version files and registry records were not changed by this documentation task. The lifecycle/deletion and shared-storage cases above are proposed qualification requirements, not reported passes.

**Source trail:** [continued ChatGPT conversation](https://chatgpt.com/share/6aabd4a1-2284-83ea-9832-4578172393d0); original DOCX SHA-256 `209c30205aef5c5aa6cdc1a75e53e303459784264c01f3a2d97d8b377fa051ff`; `DOCS/natally-reconciliation-report-16sep2026-20h30.md`; `DOCS/workflow_natally-full-app-v2.md`; `DOCS/ANALYSIS-REPORT-2026-09-13-v1.13.21288.md`; both September 12 implementation reports; current decisions/architecture/checklist/rubric. Original report and workflow claims retain their dates. This Markdown is the editable document source; the augmented DOCX is its presentation view with the original Word body retained. Byte-identical report copies belong under `~/Admin-Manual/PROJECTS/natally/`.


## 19 Windows MSI and Microsoft Store MSIX implementation

**Priority:** Microsoft Store is a first-class Windows sales and delivery channel. Produce a Store MSIX edition and a direct MSI edition from the same approved Tauri source revision. Treat packaging, payments, shared assets and upgrades as one qualification matrix. This is implementation guidance for GLM-5.3; it does not claim a working or certified Windows package already exists.

### 19.1 Distribution channels and existing build defects

| Channel | Packaging and delivery | Update and commerce ownership |
| --- | --- | --- |
| Microsoft Store MSIX | Build native Windows payload; package through the Windows SDK; submit the approved package or bundle to Partner Center. | Store signs and delivers package updates. The chosen payment adapter is a separate decision. |
| Direct MSI | Tauri Windows MSI bundle; stable upgrade identity; publisher signing and a versioned download artifact. | Natally owns installer upgrades and hosted checkout. An MSI file is not itself a RevenueCat product. |
| Store listing using MSI or EXE | Separate supported Store distribution route using a signed, complete installer at an immutable versioned HTTPS URL. | The publisher maintains the installer and updates. This does not provide the same delivery behavior as Store MSIX. |

The Store MSI/EXE route specifically requires silent, offline installation with no setup downloads and CA-trusted signatures on the installer and every PE file. [Microsoft MSI/EXE submission requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements)

Tauri 2 documents MSI and NSIS Windows bundlers; MSIX requires an additional packaging stage. Natally’s current `scripts/build-windows.sh:76` requests `msi,msix,nsis`, while lines 82–83 collect EXE/setup outputs. Correct and qualify that contract before advertising MSI/MSIX completion. Do not infer that adding `msix` to a Tauri bundle list creates a supported bundler. Retain the project’s Windows-host requirement for MSI/MSIX and its existing Linux cross-build path for EXE/NSIS. [Tauri Windows packaging](https://v2.tauri.app/distribute/windows-installer/), [Tauri Store distribution](https://v2.tauri.app/distribute/microsoft-store/), [Microsoft delivery comparison](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/choose-distribution-path)

### 19.2 Package identity and manifest construction

Reserve and read the actual Partner Center identity. Persist its package Name, Publisher distinguished name, approved display name, Store product association and supported architectures in a reviewed packaging contract. These values are independent of `mba.robin.natally`, the shared asset scope, the customer account ID, and the RevenueCat project ID. Do not derive a Store publisher from branding or generate a fresh MSI UpgradeCode on every build. [MSIX identity requirements](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)

The selected MSIX process is a packaged classic Win32 application running at medium integrity. It can host the Rust engine and native audio. Packaging does not imply AppContainer isolation, and full trust does not imply administrator privileges. Request `runFullTrust` with an accurate Store submission explanation. Avoid requiring elevation during ordinary app use. [Application manifest schema](https://learn.microsoft.com/en-us/uwp/schemas/appxpackage/uapmanifestschema/element-f-application)

This template is developer-only specification material. The generator must XML-escape every substituted value, reject unresolved `@…@` tokens and require each referenced asset to exist. The Windows 11 minimum below follows the current target; `MaxVersionTested` must record an actually tested Windows version. A static XML parse is not MakeAppx or Store certification.

```xml
<Package
 xmlns="http://schemas.microsoft.com/appx/manifest/foundation/windows10"
 xmlns:uap="http://schemas.microsoft.com/appx/manifest/uap/windows10"
 xmlns:uap10="http://schemas.microsoft.com/appx/manifest/uap/windows10/10"
 xmlns:rescap="http://schemas.microsoft.com/appx/manifest/foundation/windows10/restrictedcapabilities"
 IgnorableNamespaces="uap uap10 rescap">
 <Identity Name="@STORE_IDENTITY_NAME@" Publisher="@STORE_PUBLISHER@"
  Version="@MSIX_VERSION@" ProcessorArchitecture="@ARCHITECTURE@" />
 <Properties>
  <DisplayName>natally</DisplayName>
  <PublisherDisplayName>@PUBLISHER_DISPLAY_NAME@</PublisherDisplayName>
  <Logo>Assets\StoreLogo.png</Logo>
 </Properties>
 <Resources><Resource Language="en-us" /></Resources>
 <Dependencies>
  <TargetDeviceFamily Name="Windows.Desktop" MinVersion="10.0.22000.0"
   MaxVersionTested="@TESTED_WINDOWS_VERSION@" />
 </Dependencies>
 <Applications>
  <Application Id="App" Executable="natally.exe"
   uap10:RuntimeBehavior="packagedClassicApp" uap10:TrustLevel="mediumIL">
   <uap:VisualElements DisplayName="natally"
    Description="Chat with natally"
    Square150x150Logo="Assets\Square150x150Logo.png"
    Square44x44Logo="Assets\Square44x44Logo.png"
    BackgroundColor="transparent" />
  </Application>
 </Applications>
 <Capabilities><rescap:Capability Name="runFullTrust" /></Capabilities>
</Package>
```

### 19.3 One shared Windows asset library across MSI and MSIX

Resolve `FOLDERID_Profile` through `SHGetKnownFolderPath`, then append `Shared AI Assets/<compiled-storage-scope>/`. This is the recommended automatic same-user library for both editions and participating brands. It is outside AppData, where MSIX virtualization would otherwise produce different physical stores despite similar paths. Resolve the directory from the OS, validate the scope as a single safe component, verify ACL access and retain the actual normalized root in the native adapter. The folder’s internal name is not paywall copy. [Known folders](https://learn.microsoft.com/en-us/windows/win32/shell/knownfolderid), [MSIX filesystem virtualization](https://learn.microsoft.com/en-us/windows/msix/desktop/flexible-virtualization)

Do not make normal Store installation depend on `unvirtualizedResources`: Microsoft restricts that capability to particular scenarios. A shared-publisher folder also fails the cross-publisher requirement. An AppContainer variant would require a separate access design. ProgramData remains an administrator-provisioned option with explicit read/write ownership, not an assumption that every Windows user can safely mutate a global model library. [Restricted capabilities](https://learn.microsoft.com/en-us/windows/apps/package-and-deploy/app-capability-declarations), [packaged filesystem behavior](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-behind-the-scenes)

The Windows adapter must implement these operations explicitly:

1. Discover prior app-private and LocalAppData downloads read-only before creating a new object. When migrating, hash and adopt/copy with provenance; keep the old copy until the new object is durable and the owning app has released it.
2. Acquire a digest lock using an OS file handle and `LockFileEx`, or an equally qualified cross-process primitive. Recheck existence under the lock. A JavaScript mutex cannot coordinate two applications. The kernel releases abandoned file locks when handles/processes close; catalogue recovery still repairs partial transactions.
3. Validate file size and digest, resolve reparse points and enforce containment under the approved root. Keep executable DLLs out of the model library. Restrict write ownership, validate catalogue provenance, and treat malformed GGUF/ZIM content as untrusted input even after hashing.
4. Publish immutable objects on the same volume, after flushing, with a qualified Windows rename/replace protocol. Preserve the old object when antivirus, permissions or open readers prevent replacement. Readers hold file/mapping handles and leases until their work ends.
5. Release only this app’s claims on uninstall or “remove downloaded content.” Explicit library cleanup belongs to its owner. Personal charts, conversations, licenses, keys and WebView2 user data stay in private per-app storage.

Detect unavailable drives, redirected/UNC profiles, cloud-managed folders, low disk space and quota failures. Do not promise local-NTFS locking/atomicity on every filesystem. Offer an authorized alternate library location when automatic storage is unusable; do not silently duplicate multi-GB assets after permission failure. [Windows locking](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex)

### 19.4 Windows payload and WebView2

The package stage must contain the exact executable, architecture-matched native engine/audio DLLs, permitted redistributables, embedded frontend resources and all runtime files listed in a generated inventory. A successful `--no-bundle` build does not prove resource collection. Qualify x64 on ordinary integrated-graphics hardware; qualify ARM64 separately before listing it. ARM64 processes cannot generally load x64 DLLs; Arm64EC would be a separate implementation choice. CPU operation is the dependable baseline. [Tauri Windows targets](https://v2.tauri.app/distribute/windows-installer/), [Windows ARM64 interoperability](https://learn.microsoft.com/en-us/windows/arm/arm64ec)

Keep executable code inside the signed installation/package and downloaded data in the shared library. Model updates must not become a way to replace DLLs or app logic outside the Store update channel. Register and exercise the native engine commands; source files alone do not prove that the packaged UI reaches them. Test audio output, microphone privacy if recording is implemented, streaming cancellation and application shutdown without leaving an active worker.

Windows 11 normally supplies Evergreen WebView2, but the app must detect an absent or broken runtime. Tauri’s MSI/NSIS `webviewInstallMode: {"type":"offlineInstaller"}` is an installer setting; it does not automatically provision a separately authored MSIX. For MSIX, select and test Evergreen detection with a supported recovery path or an explicitly packaged fixed runtime and its patch process. Keep the WebView2 user-data directory writable and private. Do not write it beside the executable under WindowsApps. [WebView2 distribution](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution), [WebView2 user data](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/user-data-folder)

### 19.5 Version mapping signing and durable outputs

The display version remains `vMAJOR.MINOR.BUILD`. Installer ordering is separate: MSI limits the first two fields to 255 and the third to 65535; Store MSIX uses four 16-bit fields and reserves the fourth as zero. Natally’s BUILD modulo 100000 and unbounded MINOR therefore cannot always be copied into either format. Never truncate or take an extra modulo that could make a newer package sort older. [MSI ProductVersion](https://learn.microsoft.com/en-us/windows/win32/msi/productversion), [MSIX package versions](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msix/app-package-requirements)

Adopt a committed Windows release ordinal and a generated mapping after inventorying the highest previously published versions. This illustrative mapping is monotonic over its declared range; it is not an assigned production version. It cannot overtake an existing MSIX major of 2 or more, so the generator must reject an incompatible release history and use an approved alternative mapping. Persist the ordinal beside release metadata, increment it once under the existing release lock, and preserve the display-version association for every artifact.

```typescript
export function windowsPackageVersions(n: number) {
  if (!Number.isSafeInteger(n) || n < 0 || n >= 255 * 2 ** 24) {
    throw new Error("Windows release ordinal out of range");
  }
  const low = n % 65536;
  const msi = [1 + Math.floor(n / 2 ** 24),
    Math.floor(n / 65536) % 256, low].join(".");
  const msix = [1, Math.floor(n / 65536), low, 0].join(".");
  return { msi, msix };
}
```

The approved Windows wrapper should generate manifest/configuration once, build the Tauri payload, collect a per-architecture stage and run the SDK tools below. Stage paths and output filenames are supplied by that wrapper; these commands are a packaging fragment, not a second ad-hoc build entrypoint. Fail if output paths already exist; preserve attempts with semantic suffixes.

```powershell
if (Test-Path $MsixOutput) { throw "Output already exists" }
& MakeAppx.exe pack /v /h SHA256 /d $PackageStage /p $MsixOutput
if ($LASTEXITCODE -ne 0) { throw "MSIX packaging failed" }
# BundleStage contains only the selected, validated architecture packages.
if (Test-Path $BundleOutput) { throw "Output already exists" }
& MakeAppx.exe bundle /v /d $BundleStage /p $BundleOutput /bv $MsixVersion
if ($LASTEXITCODE -ne 0) { throw "MSIX bundling failed" }
```

Store delivery signs the submitted package. A local test package needs a matching trusted test signing identity; a directly distributed MSIX needs its appropriate trusted signing setup. Sign direct MSI/EXE and applicable embedded PE files through the organization’s credential-managed signing step, with SHA-256 and a trusted timestamp. Verify signatures and publisher matching on the resulting artifacts. Keep certificates/private keys in Admin-Manual’s credential workflow, never in the repository or frontend environment. [MakeAppx](https://learn.microsoft.com/en-us/windows/msix/package/create-app-package-with-makeappx-tool), [MSIX signing](https://learn.microsoft.com/en-us/windows/msix/package/sign-app-package-using-signtool)

Record MSI, each MSIX, optional bundle, hashes, display version, package version, source SHA, architecture and signing/verification status in the existing release manifest. Collect every produced file into tracked root `dist/` using the project’s stamped naming and LFS rules. Disable the Tauri self-updater in the Store MSIX build; use Store updates. Direct MSI/NSIS retains its explicitly selected update path. No Store upload, production purchase, release or CI invocation is performed by this report update.

### 19.6 Upgrade and Store acceptance

Qualify fresh installation and upgrade on actual Windows 11 x64 and any advertised ARM64 target. Cover standard-user execution, Store identity association, signature verification, Windows App Certification Kit results, startup without developer tools, native chat/audio operation and missing-WebView2 recovery. For MSI, verify UpgradeCode continuity, version ordering, repair and uninstall. For MSIX, test a Store-delivered update in an appropriate flight as well as sideloaded packaging checks; sideload success alone does not prove Store delivery.

Install two different package identities and the MSI edition against the same library. Prove a second app reuses an existing digest with zero network transfer, simultaneous acquisition yields one durable object, and removing one package preserves another app’s assets. Test MSI-to-MSIX migration and side-by-side execution explicitly: private data and pending jobs need a single owner or a controlled migration, not two processes modifying the same database accidentally. Package removal must not be presented as subscription cancellation or shared-credit deletion.

## 20 Purchases subscriptions and customer language

### 20.1 Two independent ways to chat with natally

The operator’s commercial direction is a price point for different usage patterns. A higher upfront purchase provides unlimited use of the on-device route, including offline operation after setup. Small purchases fund metered remote service use. The latter does not require the former. This paragraph explains the implementation boundary to developers; customer screens use the approved language below.

| Customer offer | Customer-facing wording | Internal benefit and hard limit |
| --- | --- | --- |
| Higher upfront purchase | **Unlimited chats with natally**. “One purchase. Chat with natally as often as you like.” | Perpetual local-use entitlement under the existing lifetime direction. No per-chat charge on that route. No unlimited hosted allowance. |
| Small occasional spending | **Pay as you chat**. “Start with a little credit. Pay only for the chats you use.” | Spend an eligible $ROCHE balance on bounded hosted requests. The local-use purchase is not required. |
| Optional recurring credit bundle | **Monthly chat credits**. “Includes [configured amount] $ROCHE each month.” | A finite periodic grant with explicit renewal and rollover terms; not unlimited hosted access. The UI substitutes the live configured amount and never displays the brackets. |

These are proposed approved-copy entries for the paywall contract, not text already changed in the app. Customer-facing paywalls, onboarding, settings, receipts, errors and Store listings must discuss chatting with natally. Do not promote computing location or expose “local,” “inference,” “ephemeris,” model names, token accounting, quantization, API routing or backend details. Technical documentation and internal logs still need exact implementation names. Price, renewal interval, allowance, account requirements and material restrictions remain clear in ordinary language.

A balance-empty state can say “Add $ROCHE to keep chatting.” A connection failure can say “You’re offline. Connect to keep chatting.” A restore action can say “Restore purchases.” Keep entitlement and routing logic behind these phrases. A depleted balance does not revoke an owned Unlimited purchase; an Unlimited purchase does not make a chargeable remote request free. Never silently switch an Unlimited conversation to paid remote service. If a user chooses that option, disclose the charge before starting.

Hardware suitability and first-use downloads remain real implementation requirements. Explain a concrete setup/download requirement when the user needs to act, without turning the offer into a lesson in model execution. “Unlimited” means no usage-based chat charge for the purchased route; it does not promise an incapable device unlimited speed or memory. The existing trial contract remains until amended. Do not relabel lifetime buyers as recurring subscribers.

### 20.2 Catalog separation and account identity

Keep three distinct catalog concepts: a non-consumable lifetime product for Unlimited, consumable $ROCHE packs, and optional subscriptions granting a finite number of credits each cycle. Store product IDs, RevenueCat product IDs, entitlement lookup keys and the currency code are different identifiers. Map them in a reviewed catalog; do not attach a hosted-unlimited entitlement to every purchase. A subscription product must state whether it grants credits, time-limited local access, or both. Time-limited local access must not be sold as a permanent one-purchase offer.

Use a stable authenticated ecosystem account mapped to one RevenueCat App User ID for online purchases and the shared balance. The ID is not an authentication credential. Resolve it on the backend from the authenticated session; never trust a client-supplied customer ID or amount. Keep existing offline license import/recovery semantics for the perpetual route. Record what anonymous trial users can do and provide an intentional account-linking/recovery flow before selling cross-device credits. RevenueCat identity and restore settings apply across the apps in a project, so test logout, reinstall, account switching and store-account mismatch. [RevenueCat user identity](https://www.revenuecat.com/docs/customers/identifying-customers), [restore behavior](https://www.revenuecat.com/docs/projects/restore-behavior)

### 20.3 Microsoft Store checkout choices

For a non-game Windows application, Microsoft Store policy 7.19 sections 10.8.1 and 10.8.6 permit third-party digital commerce and subscriptions. Declare the processor and required commerce details in Partner Center. This lets an eligible Store MSIX edition retain the existing hosted checkout/RevenueCat bridge while using Store distribution. It does not make the Store a receipt validator for Stripe purchases. Verify the policy effective on submission day and every offered market. The policy page inspected on 17 September advertises version 7.20 effective 22 October 2026; do not treat that future effective date as today’s rule. [Effective Microsoft Store policy 7.19](https://learn.microsoft.com/en-us/windows/apps/publish/store-policy-archive/store-policy-7-19), [Microsoft Store policies](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)

A native Microsoft purchase flow is a separate adapter. It can improve the Store customer’s purchase experience, but needs Partner Center product association and backend validation. Preserve Natally’s six existing rails; add a Microsoft variant through a decision/schema amendment rather than disguising Microsoft transactions as an existing processor. Do not assume RevenueCat’s Web SDK invokes Microsoft checkout: the existing `packages/billing/src/adapters/revenuecat.ts` wraps Web SDK behavior and `/mint`.

For native Store commerce, define these concrete steps in the Windows adapter:

1. Associate the packaged build with the real Store application. Configure the lifetime benefit as the appropriate durable purchase and credit packs as consumables; use a recurring add-on only for an actual subscription offer. Obtain localized prices and product status from Store APIs.
2. Create `Windows.Services.Store.StoreContext` for the intended user and initialize its desktop purchase UI with Natally’s HWND through `IInitializeWithWindow`. Dispatch UI-affine operations on the correct window thread. Expose narrow Tauri commands, not arbitrary Store IDs or arbitrary native calls from web content.
3. Use `GetAssociatedStoreProductsAsync`/`GetStoreProductsAsync` for the catalog and `RequestPurchaseAsync` for checkout. Handle success, already-owned, cancellation, network error and server error separately. UI completion does not itself mint an entitlement or credit balance.
4. Bind Store purchase/collections identity to the authenticated Natally account on the backend. Use Microsoft’s service APIs to validate ownership and, where applicable, subscription recurrence. `StoreContext` does not provide a client receipt API equivalent to a portable authoritative receipt.
5. Persist a unique verified transaction record. Sync the selected benefit into RevenueCat exactly once, then have the existing bridge mint the appropriate signed local-use token or allow RevenueCat’s configured currency grant. The token consumer must verify, persist and publish it through the entitlement controller; a successful `/mint` call alone is not persisted access.
6. For consumables, define fulfillment/consumption ordering so a crash cannot lose credits or grant twice. Use the service-supported durable transaction identity and a replayable server job. Do not use a store balance and a RevenueCat balance as two independent spendable wallets for the same purchase.

Microsoft’s subscription service API documentation contains account-provisioning restrictions; the client subscription guide does not establish that Robin’s server account has those APIs enabled. Verify eligibility and a complete restore/renewal/refund path before selecting that integration. If server validation cannot be demonstrated, keep the supported external checkout path for the eligible non-game Windows edition rather than inventing client-authorized grants. [Desktop Store initialization](https://learn.microsoft.com/en-us/windows/uwp/monetize/in-app-purchases-and-trials), [Store subscriptions](https://learn.microsoft.com/en-us/windows/uwp/monetize/enable-subscription-add-ons-for-your-app), [server purchase management](https://learn.microsoft.com/en-us/windows/uwp/monetize/view-and-grant-products-from-a-service), [subscription service eligibility](https://learn.microsoft.com/en-us/windows/uwp/monetize/get-subscriptions-for-a-user)

### 20.4 RevenueCat bridge and subscription lifecycle

RevenueCat remains the application’s entitlement authority. Supported store/Stripe integrations should use their documented receipt and event pipelines. Unsupported processors need a backend adapter that validates with the processor and publishes a supported RevenueCat representation. RevenueCat’s published installation matrix does not document a Microsoft Store integration. Its External Purchases API is private beta and trusts the supplied transaction data; it cannot replace Microsoft validation. Verify access, supported benefits and lifecycle semantics before selecting it. [RevenueCat installation matrix](https://www.revenuecat.com/docs/getting-started/installation), [External Purchases API](https://www.revenuecat.com/docs/external-purchases-api-beta) A temporary promotional grant is not a complete recurring-billing integration: it must expire/revoke correctly and must not falsify revenue or grant unbounded access.

Natally’s public `LicenseTokenPayloadSchema` in `packages/billing/src/types.ts:30` fixes `exp` to null, while `token/format.ts:18` accepts integer or null. The web verifier at `verify-web.ts:157` and Rust verifier at `verify.rs:144` already enforce finite expiry. Preserve those implementations; reconcile the duplicated contract and specify the lifecycle. The bridge service B.6 remains unchecked and was not found as tracked/untracked service implementation in this audit. Documenting it does not make it deployed.

| Event | Required internal result |
| --- | --- |
| Lifetime purchase | Verified perpetual local-use entitlement; signed offline token under the existing contract. Ongoing hosted requests still need credits. |
| Subscription starts or renews | Record the unique paid period; grant only that product’s finite benefit/credits once. A recurring local-use product gets a finite paid-through token. |
| User cancels renewal | Stop future renewal/grants; retain the already-paid benefit through its paid-through date. Show the actual end date. |
| Billing retry or grace | Follow the verified store/RevenueCat state and a documented bounded grace policy. Do not repeatedly issue a fresh full-period grant. |
| Refund or chargeback | Reconcile the affected purchase and currency grant; revoke only its benefit. Preserve separately owned lifetime access and unrelated purchases. |
| Restore or account change | Reconcile ownership to the authenticated account; return existing benefits, never issue a new initial credit grant merely because restore was called. |
| Offline or provider outage | Perpetual offline local use continues with a valid token. Hosted paid work requires an authoritative reservation; unavailable balance service cannot become free unlimited use. |

Webhook intake must authenticate each provider’s documented mechanism, store the event before acknowledgment, deduplicate, tolerate out-of-order delivery, retry safely and periodically reconcile authoritative state. Use a transaction ledger with original purchase, subscription/period, app, environment, account and benefit IDs. Record processor-of-record for receipts, support, cancellation and refunds. RevenueCat is not automatically the merchant of record for every configured processor. Price displays come from the actual storefront/checkout currency and tax treatment; keep card details inside provider checkout. [RevenueCat webhook guidance](https://www.revenuecat.com/docs/integrations/webhooks), [subscription state](https://www.revenuecat.com/docs/api-v2)

## 21 ROCHE credits across platforms and future projects

### 21.1 One recognizable currency with an explicit authority

Use **$ROCHE** as the customer-facing name. RevenueCat’s API code cannot contain `$`; `ROCHE` is a valid candidate code. Reuse the existing currency and its actual code after read-only inventory; do not create a duplicate because its display name differs. This session’s `rc projects list --json --no-input` attempt returned authentication exit code 4, so the existing project ID, code, product grants and balances remain unverified. No RevenueCat catalog or customer balance was changed. [Currency definition schema](https://www.revenuecat.com/docs/api-v2/virtual-currency)

The intended experience is one account and recognizable credits across the ecosystem. RevenueCat currencies are project-scoped. Apps intentionally placed in the same project can use the same account and currency; matching a name in a different RevenueCat project does not create a pooled balance. Use the existing shared project when its ownership, app isolation and restore policy fit. If future apps need separate projects, route their eligible spending through one designated wallet project and backend mapping; do not mirror a spendable balance into each project or assume cross-project atomic transfer. [RevenueCat project model](https://www.revenuecat.com/docs/projects/overview), [in-app currency](https://www.revenuecat.com/docs/offerings/virtual-currency)

Recommended authority split: RevenueCat is the system of record for currency totals and purchase-driven grants; the application service owns authenticated jobs, spend reservations, purchase provenance, provider usage and reconciliation evidence. That service does not independently invent another wallet total. All participating projects call the same spend boundary. Shared model storage, shared branding and a shared App User ID do not authorize credit spending. [Balance authority](https://www.revenuecat.com/docs/offerings/virtual-currency/faq/balance-source-of-truth)

### 21.2 Purchase origin constrains cross-app spending

| Purchase or access channel | Proposed route | Fungibility constraint |
| --- | --- | --- |
| Windows Store MSIX non-game | Eligible third-party checkout initially, or validated Microsoft adapter when qualified. | Use the common account wallet for authorized services; retain processor and originating app provenance. Store packaging alone does not decide payment policy. |
| Direct Windows MSI and Linux | Existing direct checkout/bridge. | Common eligible $ROCHE can pay for participating services through the shared gateway, subject to the actual product terms. |
| Hosted web and PWA | Supported web checkout, consumable pack or finite recurring grant. | Same wallet and server spend control; browser storage is a display cache. Each merchant/app integration must use the same canonical account mapping. |
| Google Play Android | Play Billing through the qualified native RevenueCat path unless a specific applicable program permits another route. | Play’s Payments policy limits purchased virtual currency to its originating app or game title. Do not promise those purchases can fund unrelated future apps. |
| Direct Android | Build-selected eligible external checkout. | Distinguish this SKU and its purchase origin from Play; do not infer that a sideload build can transfer Play-restricted currency into unrestricted credits. |
| Future Apple distribution | StoreKit/RevenueCat for applicable in-app digital purchases; qualify any permitted regional alternative separately. | Multiplatform access rules do not automatically approve a universal wallet spanning unrelated apps. One-time purchased credits must not expire. |

The target remains broad reuse for the same customer. **Cross-platform use of the same service and spending across unrelated products are different cases.** Google’s rule is explicit; Apple’s multiplatform clause does not establish blanket multi-app currency approval. Keep the eligible common pool fungible and preserve restricted purchase origin. No currency conversion should erase a purchase restriction. [Google Play Payments sections 2 and 5](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en), [Apple purchase and multiplatform rules](https://developer.apple.com/app-store/review/guidelines/)

RevenueCat’s single aggregate `ROCHE` balance does not encode arbitrary app-level spend restrictions. Before accepting restricted purchases, choose an enforceable representation: separately identified restricted currency buckets presented with the same $ROCHE branding, or a qualified provenance allocation service whose spend accounting matches RevenueCat’s actual deduction behavior. A label on a ledger row is insufficient if the spend API can still consume the wrong origin. Do not silently mix restricted and unrestricted funds and promise universal spending. Inventory the existing project first; preserve current balances and purchaser rights during any migration.

### 21.3 Grants refunds and renewals

Use integer currency units; RevenueCat’s documented balance range is zero to two billion and negative balances are unsupported. Define the unit’s precision once from the existing currency configuration. Do not infer that one $ROCHE equals one US dollar, one cent, one model token or one chat. Product-to-credit quantities are catalog data. Native/Web SDK balance objects may be cached; refresh after purchase and server spending. Backend-initiated adjustments require a secret key, which never enters Tauri/WebView/PWA code. [In-app currency behavior](https://www.revenuecat.com/docs/offerings/virtual-currency)

For products configured to grant currency automatically in RevenueCat, the backend records the grant event without adding the same amount again. For a processor not represented by that automatic pipeline, a verified bridge event may add credits with one stable purchase-derived idempotency key. RevenueCat’s subscription-currency guide lists Apple, Google, Stripe and RevenueCat Billing; Microsoft is not in that automatic-grant support list. A Microsoft adapter needs its own verified integration contract. [Subscription currency support](https://www.revenuecat.com/docs/offerings/virtual-currency/subscriptions)

Subscription grants are keyed by actual paid period; a renewal webhook retry, reinstall or restore is not another grant. Trials use their explicitly configured grant, which may be zero.

Prefer purchased top-up credits that do not expire. If a recurring bundle has a time-limited allowance, disclose its renewal and rollover terms, keep it distinguishable from purchased top-ups, and qualify the platform/product behavior. RevenueCat supports cycle-linked expiration and spends expiring grants first. A compensation credit after a canceled hosted job must preserve the original grant’s restrictions and expiry rights; a naive positive adjustment can accidentally turn expiring/restricted credit into permanent unrestricted credit. If the chosen API cannot preserve those semantics, use non-expiring grants for that flow or a qualified separate reservation ledger before release. [Currency expiration and deduction order](https://www.revenuecat.com/docs/offerings/virtual-currency/expiring-currencies)

RevenueCat removes applicable credits on refunds and floors the balance at zero; it does not record a negative debt when already-spent credits exceed the remaining balance. Keep consumed provider cost and refund exposure in the server ledger. Block abusive new paid jobs through an explicit account policy rather than silently creating an undocumented negative RevenueCat balance or confiscating unrelated entitlements. Google partial-refund handling has a documented limitation, so reconcile processor evidence when it matters. [RevenueCat currency refunds](https://www.revenuecat.com/docs/offerings/virtual-currency/refunds)

For the recognizable $ROCHE experience, use service credits within the participating products. Cash redemption, customer-to-customer transfers, exchange trading or a blockchain token are not part of this implementation brief. They would create a different product and accounting contract.

### 21.4 Finite spending for each hosted chat

The customer chooses a chat action; the server derives the eligible service, rate-card revision and maximum charge. Bind quotes to the authenticated account, conversation/action digest, chosen service, expiry and a client-confirmed maximum. Enforce input limits, maximum output, tool-call budget, request duration and aggregate account budget before contacting a provider. Paid work must not start unless the reservation is confirmed. A local-use entitlement must never bypass this check.

Use a durable state machine with a unique `(account, request-id)` constraint:

```text
created -> debit_pending -> reserved -> running -> settling -> completed
                     |          |          |
                     |          +-> refund_pending -> refunded
                     +-> declined
uncertain network result -> reconcile the same operation identity
```

In the straightforward non-expiring common-pool implementation, reserve by deducting the quoted maximum from RevenueCat before dispatch. Save the intended debit and stable idempotency key before sending it. A timeout leaves `debit_pending`; retry the same operation rather than creating another debit or starting a second provider job. After the confirmed debit, dispatch once through the durable job. Deducting maximums atomically prevents two concurrent apps from spending the same available credits.

Attribute every reservation to its funding grants and serialize refund/revocation reconciliation with settlement. If the original purchase is refunded while its balance is reserved, a later cancellation or unused-reservation credit must not recreate the revoked funds. Mark the affected reserved portion as revoked, preserve unrelated funding, and compensate only the still-valid portion. A compensating API adjustment is not a reversal of the original purchase refund.

At completion, meter the authenticated provider result and return the eligible unused reservation exactly once. If the provider fails before paid work, return the entire still-valid reservation. If cancellation happens after chargeable work, settle according to the disclosed policy and remaining budget. When provider usage or billing is uncertain, keep a reconcilable pending state; do not guess a successful charge or blindly retry an already-running provider request. Client disconnect is not proof that the provider stopped. A client-reported token count is not billable truth.

The following server-only request illustrates the documented adjustment API. The quoted amount here is an example, not a product price. The account/project IDs and secret come from trusted server context; the transaction reference contains no chat text. `Idempotency-Key` is supported by this endpoint. Persist it and reuse it on uncertain retries; a compensating refund gets its own stable key tied to the original job. [Customer currency transaction API](https://www.revenuecat.com/docs/api-v2/customer/resources)

```http
POST /v2/projects/{wallet_project}/customers/{account_id}/virtual_currencies/transactions
Authorization: Bearer {server_secret}
Content-Type: application/json
Idempotency-Key: chat-job-7f8c-reserve-v1

{"adjustments":{"ROCHE":-12},"reference":"chat-job-7f8c/reserve"}
```

This API guarantees only its own adjustment, not an atomic transaction spanning your database and the inference provider. Use an outbox/reconciliation worker and durable operation records to close crash windows. Never retry a provider side effect solely because the client retried an HTTP request. If available, use the provider’s own request-id semantics; otherwise recover its recorded job before dispatching another.

Do not poll/debit RevenueCat per generated token. Reserve once and settle once per bounded request or explicitly budgeted batch. Obey rate-limit response headers and `Retry-After`. The overview and current endpoint pages list different default currency limits; neither justifies hardcoding a universal throughput promise. Own API adjustments must be journaled directly: the general currency guide warns that those adjustments do not emit the same webhook behavior as purchase grants. Reconcile balances periodically rather than relying on a webhook that may not arrive. [Currency API limits](https://www.revenuecat.com/docs/api-v2/customer/resources), [currency events](https://www.revenuecat.com/docs/offerings/virtual-currency/events)

### 21.5 Pricing for small chats and similarly priced services

“Pennies” is the intended entry price, not a verified universal cost for every model, context length or service. Keep a versioned internal service catalog with input/output rates, minimum unit, maximum charge, allowed tools, eligibility and contribution margin. Include processor/store fees, RevenueCat charges where applicable, provider cost, tax treatment, fraud/refund allowance and operational overhead in the economics. Buy credit packs with ordinary checkout and spend small units internally; do not trigger a separate card transaction for every small chat.

For a developer-only rate calculation, use integer micro-currency arithmetic. Derive provider cost from measured input/output/cache/tool usage; apply the approved margin/rounding rule once per job and divide by the configured value of a $ROCHE unit. Round the final customer charge up to the chosen unit, return any unused reservation and never exceed the accepted quote. Rounding every streamed fragment separately would overcharge small chats. No numerical price, exchange rate or markup is assigned by this report.

Future similarly priced services register a service ID and bounded cost function behind the same quote/reserve/settle interface. Equal currency units buy equal published value; they need not buy equal quantities of expensive and inexpensive operations. A costly new service must declare its price and limit before admission. The gateway records the consuming project for cost allocation without creating another spendable wallet. The customer continues to see the service’s ordinary name and $ROCHE price, not provider/model/token jargon.

## 22 GLM 5 3 amendment sequence and verification

This extension changes the report, not production configuration. Incorporate the Windows, two-offer and $ROCHE contracts into the current architecture/checklist in Cascade before coding them. Preserve the existing imported implementation and its completed tasks. The following proposed ownership sets are a specification outline; exact signatures and paths must be reconciled with the current entity table rather than treated as already-created files.

| Work package | Existing anchor and required specification | Durable evidence and operator verification |
| --- | --- | --- |
| Windows packaging | `scripts/build-windows.sh`, architecture build module and current release tasks; specify a Windows SDK manifest/staging owner and separate distribution-channel config. | Valid generated MSI/MSIX versions, complete resource manifest and signature results; real installed/Store-flight upgrade runs. |
| Windows shared library | Mirror storage seam and native engine root handling; define Profile-root resolver, access locators, writer locks and claim retention. | Two package identities plus MSI reuse the same verified object; fault/permission/uninstall cases preserve other consumers. |
| Payment contracts | Billing types, registry, token parser/verifiers and B.6 bridge; reconcile finite-expiry schema, checkout token persistence and Microsoft adapter variant. | Real provider validation and replay-safe lifecycle fixtures; Store product association and purchase/restore/cancel/refund evidence. |
| Customer language | Paywall, checkout, onboarding, Settings License and related error/Store copy; add exact approved strings to their entity-owned content sources. | All offers describe chatting with natally; no customer-facing local/inference/ephemeris wording. Price/renewal/credit terms remain accurate. |
| ROCHE inventory and catalog | Read-only inventory of the existing RevenueCat project/currency, app IDs, product grants, restore policy and sandbox access; define stable ecosystem identity. | Existing balances preserved; no duplicate currency or customer; sandbox grants cannot buy production provider work. |
| Shared spending gateway | Hosted service and bridge contracts; define quote, reservation, usage settlement, grant provenance and cross-project access ownership. | Concurrent app requests cannot overspend; duplicate purchase/renewal/job events cannot double grant, double charge or double refund. |

Customer-path validation must demonstrate: an Unlimited owner keeps chatting through the purchased route without usage charges; a Pay as you chat user can buy and spend credits without buying Unlimited; an empty balance does not disable an independently owned Unlimited benefit; no automatic paid route fallback occurs; finite monthly grants remain finite; shared eligible credits work across the intended platforms; restricted-origin credits cannot leak into unrelated apps; reinstall/restore does not regrant consumables; canceling renewal preserves the already-paid benefit; refund reconciliation does not revoke another valid purchase.

Failure-path validation must include two apps racing on one remaining balance, a lost debit response, server crash after debit but before dispatch, provider completion after browser disconnect, a lost settlement response, a refund after credits were spent, a refund during an active reservation or before canceled-job compensation, out-of-order renewal events, rate limits, revoked credentials, sandbox/production identity collision and a future app calling the common wallet. Keep production payment-provider and RevenueCat secrets on the backend. Preserve personal data isolation even when the account, public model library and eligible currency are shared.

**Evidence limits for this amendment:** Microsoft, Tauri, RevenueCat, Google and Apple primary documentation were reviewed on 17 September 2026. Current account-specific Store identity/eligibility and RevenueCat currency configuration were not verified. No Windows package was built, signed, installed, certified or submitted; no real purchase, subscription, currency adjustment or provider charge was initiated. Code/API/manifest examples are design fragments for the named implementation contracts. The application’s real acceptance run must provide the missing platform and commercial evidence. Commit and push completed scoped work to GitHub while Forgejo is unavailable, preserving other workers’ edits.
