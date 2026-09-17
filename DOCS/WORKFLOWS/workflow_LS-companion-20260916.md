# Workflow — Stanza LS (bookstore/library) + Companion chatbot incorporation

**Generated:** 2026-09-16 · `/sc:workflow --strategy systematic --depth deep` (plan only —
no code execution; execute via `/sc:implement` per phase)
**Authority chain (the central dogma):** `DOCS/ARCHITECTURE.md` is the final release
state spec → `CHECKLIST.md` is its operationalized derivation → code implements
checklist tasks. Nothing merges "into" CHECKLIST as a source of truth; every wave
re-baselines ARCHITECTURE first, re-derives CHECKLIST second, lands code third.
**Version at authoring:** read `version.txt` (v1.43.25452 at generation time).

## Inputs (requirement analysis, verified 2026-09-16)

| Input | State | Evidence | Proposed action |
|---|---|---|---|
| `DOCS/ARCHITECTURE.md` §7.6 Companion | **Stale** — still describes superseded `CompanionEngine`/LiteRT-LM Gemma 4 E2B/wllama plan | `DOCS/ARCHITECTURE.md:254`, entity rows `:407`, `:573` | **A1/A2**: rewrite §7.6 + entity rows to the `IInferenceEngine`/TurboQuant/Atomic-catalog release state as one architecture commit; push immediately |
| Liturgibot decision + reusable-chatbot core | Stranded as `dcfca61b` on msi4090 only (ahead 1/behind 33); `IInferenceEngine` contract, TurboQuant policy, `ChatController`, 6/6 tests pass, `VENDORED/turboquant-wasm` reference lock, `turboquant-wasm@0.4.1` | msi4090 `/opt/devProjects/sanctissimissa`; evaluation report 2026-09-16 | **P1/P2**: fetch from msi4090, land *code hunks only* on master as the derived tasks' implementation; policy tests green; push; msi4090 untouched, no force |
| Decision 22 — org namespace & common-storage plane | **Live in master ARCHITECTURE** — `VITE_APP_NAMESPACE`, `VITE_STORAGE_SCOPE` (`common` = org-shared `mba.robin`), `src/core/storage/root.ts` single resolver, `scopeDir` IPC; GGUF sharing rides this plane | `DOCS/ARCHITECTURE.md:92`, entity `:324`, `:384` | **A4/A5**: specify the content-addressed (SHA256) GGUF store on this plane — `common` → org-shared `mba.robin` root, per-platform degradation matrix, Android mechanism as a numbered decision row; keep library packages on the same single resolver, no second path |
| Stanza LS — Library/Bookstore/Chant/Mass reference | Active CHECKLIST request; all 21 LS/BS-S/CH tasks pending, dependency-ordered | `CHECKLIST.md` header; `DOCS/ARCHITECTURE/bookstore-service-20260913.md`, `DOCS/PROPOSALS/bookstore-*-2026-09-13.md` | Execute per its own dependency order in parallel with companion waves; **B4** marks the shared surfaces (storage root, Settings) so the co-active stanzas never collide |
| Stanza AM | Delivered 2026-09-15; About-only files, no overlap | CHECKLIST header | No action — verify-only (non-overlapping file surfaces confirmed) |
| Operator directives 2026-09-16 | Chatbot UI: **fully dockable/resizeable; default = intercom-style badge ("porthole"); avatar animated like kintsugi/natally; occasionally signs with a cross or waves**. GGUF weights shared once across all `mba.robin.*` apps (`enzime`, `natally`, `kintsugi`, `helloword`, …); namespace root `.env`-configured, never hardcoded | operator session 2026-09-16; memory `mba-robin-namespace-shared-gguf-store` | **A3**: encode the ChatView UI verbatim in ARCHITECTURE (badge-porthole default, dock/resize modes, kintsugi/natally animation, cross-sign/wave idles, reduced-motion); **W4** implements; **W1** enforces download-once |
| Global rules | Commit + push after every green checklist task; realtime output on long tasks; Settings-placeholder release blocker (check Settings tabs before every train); never `android-debug` stage; stale lock ⇒ `-- --restart`; surge.sh = production web; SW handover stickiness expected post-cutover | memory index 2026-09-16 | Enforced at every gate, not re-planned: commit+push per green task (Phases 2–4); realtime output + Settings blocker + no `android-debug` + lock-restart + surge/SW-handover rules bound into Phase 5 |

## Phases

### Phase 0 — Preflight gates (read-only; checkpoint C0)
1. Re-verify `version.txt`, CHECKLIST active-stanza header, and that no release train is
   mid-flight (`release.lock` absent; no rustc/gradle processes).
2. Confirm the Settings-placeholder blocker status — it gates Phase 5, not Phases 1–4.
3. Confirm `dcfca61b` still intact on msi4090 (`git -C /opt/devProjects/sanctissimissa log --oneline -1`).
**C0 pass:** all inputs verified current; else stop and re-baseline this workflow.

### Phase 1 — Architecture re-baseline (the dogma; checkpoint C1 = operator sign-off)
Files: `DOCS/ARCHITECTURE.md` only.
- **A1.** Rewrite §7.6 Companion to the release state: `IInferenceEngine`
  (probe/init/generate/batchScore/kvStats/reset/close; opaque handles; KV owned by
  engine; no tensors across postMessage; no per-token IPC) implemented by
  `reusable-chatbot/` engines — WebGPU TurboQuant (TQ-compressed-KV attention in
  WGSL) + WASM-SIMD `turboquant-wasm` fallback on web/PWA; native
  `atomic-llama-cpp-turboquant` via Tauri/Rust/C-ABI on desktop; Android NDK where
  probed viable. KV policy turbo3/turbo3 (turbo4 fallback, turbo2 constrained);
  weights independent of KV format. Model selection from Atomic Chat catalogs
  (`rebots-online/atomic-chat-conf` + `models/inference-profiles.json` +
  `atomic-chat-model-catalog`) fused with live `probe()` — never hardcoded.
  Supersedes LiteRT-LM/wllama rows.
- **A2.** Update entity rows `:407` (CompanionEngine→IInferenceEngine module map) and
  `:573` (InferenceBackend family: atomic-llama-cpp-turboquant native, WebGPU TQ,
  turboquant-wasm WASM-SIMD, hosted later; honest unsupported fallback).
- **A3.** New ChatView UI architecture (operator directive 2026-09-16): default
  presentation = **intercom-style badge porthole** (persistent, low chrome); fully
  **dockable and resizeable** (dock-left/right, floating, inline, fullscreen, mobile
  sheet); avatar **animated in the kintsugi/natally style** with occasional
  gesture idles — **signing with a cross, waving** — honoring `prefers-reduced-motion`.
- **A4.** GGUF model-store architecture on the decision-22 plane: content-addressed
  (SHA256) entries under the resolved org-common root (`VITE_STORAGE_SCOPE=common` →
  `mba.robin` store; desktop shares as `<parent(app_data_dir)>/<root>`; web degrades
  per-origin; mobile app-private pending the Android shared-store decision). Record
  the Android mechanism decision (public media dir vs `android:sharedUserId` vs
  signature-permission provider) as a numbered decision row — **required before the
  Android engine task may run**.
- **A5.** Reconcile LS/bookstore storage wording so library packages and model
  weights share ONE resolver contract (`src/core/storage/root.ts`), no second path.
Commit + push after A1–A5 are green as one architecture task.

### Phase 2 — CHECKLIST derivation (checkpoint C2)
Files: `CHECKLIST.md` only. Derive — do not text-merge `dcfca61b`'s old hunks.
- **B1.** Rewrite the companion stanza from the new §7.6 as TC13 self-contained tasks
  (BI.1 contract line already scoped in spirit by the stranded commit; re-derive
  against master's evolved CHECKLIST).
- **B2.** New derived tasks, dependency-ordered: model store → WebGPU engine
  extraction (the vendored demo sampler is argmax-only — a real sampler is in scope) →
  model-registry (catalog clients + deployability ranking) → ChatView badge/dock UI +
  avatar animation → CompanionMemory/BI.2–BI.4 reconciliation → Tauri native adapter →
  Android NDK (gated on A4's decision).
- **B3.** Finalize W.2 contract wording (namespace + share base) to match the ARCH
  entity, keeping the FI identity and the superseded three-fork rollout excluded.
- **B4.** Mark LS∩companion shared-file surfaces (storage root, Settings) so the two
  co-active stanzas never collide.
Commit + push. **C2 pass:** every new task traces 1:1 to an ARCHITECTURE entity/section.

### Phase 3 — Stranded-code preservation (checkpoint C3)
- **P1.** On .57: `git fetch robin@192.168.0.173:/opt/devProjects/sanctissimissa master`
  and land ONLY the code hunks of `dcfca61b` — `reusable-chatbot/`,
  `VENDORED/turboquant-wasm/`, `tests/turboquant-policy.test.ts`, `package.json` dep —
  as the implementation of the derived contract tasks. Its ARCHITECTURE/CHECKLIST hunks
  are superseded by Phases 1–2 and are not merged. No force anywhere; msi4090 untouched.
- **P2.** Run the policy test file on master; then **commit + push immediately**
  (global rule: no machine keeps unique commits).
**C3 pass:** 6/6 policy tests green on master; GitHub holds the complete tree;
msi4090 no longer the sole holder of any object.

### Phase 4 — Implementation waves (via `/sc:implement`; order fixed)
1. **W1 Model store** — decision-22 resolver + content-addressed layout + desktop
   shared dir + download-once/dedupe semantics.
2. **W2 WebGPU engine** — extract from `VENDORED/turboquant-wasm` reference; real
   sampler; GGUF loader reading W1 store (OPFS only where store degrades per-origin).
3. **W3 Model registry** — atomic-chat-conf + atomic-chat-model-catalog +
   inference-profiles fusion; `probe()` truth overrides catalog claims.
4. **W4 ChatView UI** — badge porthole first (the default), then dock/resize modes,
   then kintsugi/natally-style avatar animation with cross-sign/wave idles;
   reduced-motion respected; works against `ChatController` with a mock engine so it
   does not block on W2/W3.
5. **W5 Companion semantics** — BI.2 memory, BI.3 rail chat + citations, BI.4 RC gates.
6. **W6 Tauri native adapter** — persistent session, streaming Channel.
7. **W7 Android NDK + shared-store mechanism** — gated on the A4 decision.
   Stanza LS proceeds in parallel per its own dependency order (co-active; only
   storage-root/Settings surfaces shared, per B4).

### Phase 5 — Validation & release gates
- Per task: `npm test` (+ targeted `node --experimental-strip-types --test`), `npx tsc -b`;
  commit + push on green — every task, no batching.
- Release train only when: **Settings placeholder blocker lifted** (check Settings tabs),
  TEST_RUBRIC pass, all-platform build (never `android-debug`; stale lock ⇒ `-- --restart`),
  surge cutover with expected SW-handover stickiness documented, realtime output displayed
  throughout every long stage.

## Task dependencies (edges)

```
C0 → A1..A5 (one commit) → C1(operator) → B1..B4 → C2 → P1 → P2 → C3
C3 → W1 → W2 → W5 ; W1 → W3 ; C3 → W4(mock engine) ; W2+W3 → W4(full)
W2 → W6 ; A4-decision → W7 ; LS-parallel throughout
W* complete + Settings gate → Phase 5 train
```

## Checkpoints & validation summary
- **C0** inputs/gates verified · **C1** operator signs ARCHITECTURE release state ·
  **C2** CHECKLIST tasks trace 1:1 to ARCHITECTURE · **C3** stranded code on master +
  pushed, tests green · **per-W** green-test commit+push · **Phase 5** rubric +
  Settings + all-platform train.

## Risks & open decisions

| # | Risk / open decision | Proposed action |
|---|---|---|
| 1 | Android shared-GGUF mechanism undecided | Decide inside **A4** — public media dir vs `android:sharedUserId` vs signature-permission provider; record as a numbered ARCHITECTURE decision row; **W7 stays gated** on it |
| 2 | Vendored demo engine hardcodes Gemma-3-arch constants; sampler is argmax-only | Generalize the architecture constants and ship a real sampler within the **W2** extraction scope |
| 3 | WebGPU `subgroups` gate; relaxed-SIMD-only WASM floor | Per-device `probe()` is the authority; honest "unsupported" states only — registry marks unsupported-runtime rather than a silent degraded mode (**W2/W3**) |
| 4 | Post-cutover SW stickiness reads as "old version" reports | Phase 5 release notes document the handover; diagnose with cache-busted curl + fresh browser; hard-reload guidance — never redeploy on a false alarm |
| 5 | Temptation to text-merge old ARCH/CHECKLIST hunks | Conflicts are void by construction — re-derive per the dogma (Phase 2); these hunks are never resolved as text merges |

**STOP — plan ends here. Next step: operator C1 sign-off, then `/sc:implement` Phase 0.**
