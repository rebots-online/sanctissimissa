# PROVENANCE — `VENDORED/llama-cpp-sys-2-0.1.154-atomic/`

Vendored snapshot (decision 8: no `.git`, no submodule) consumed by
`src-tauri/Cargo.toml` `[patch.crates-io] llama-cpp-sys-2 = { path = "../VENDORED/llama-cpp-sys-2-0.1.154-atomic" }`.
Normative source: `DOCS/ARCHITECTURE/L-native-embed-engine-20261106.md` §2.5 / F1; CHECKLIST BA.12.

## 1. Bridge crate (everything outside `llama.cpp/`)

- Crate: `llama-cpp-sys-2` **0.1.154** (utilityai/llama-cpp-rs), licence MIT OR Apache-2.0.
- URL: `https://static.crates.io/crates/llama-cpp-sys-2/llama-cpp-sys-2-0.1.154.crate`
- crates.io cksum (sha256 of the `.crate`): `13a9ea2ce0cdc20bcb1870534022e340b391663f8fe09133951e2fe37fbc29cf` — verified with `sha256sum` on 2026-11-06 before unpacking.
- Companion safe crate (from crates.io, not vendored): `llama-cpp-2` **=0.1.154**, cksum `4397360a0bd81be29929a55ad2f49eba27a744a6578f3271894d6f41d86bd15b` (recorded in `src-tauri/Cargo.lock`).
- Fetch:
  ```bash
  curl -sSL -o llama-cpp-sys-2-0.1.154.crate https://static.crates.io/crates/llama-cpp-sys-2/llama-cpp-sys-2-0.1.154.crate
  sha256sum llama-cpp-sys-2-0.1.154.crate   # must be 13a9ea2c…29cf
  tar xzf llama-cpp-sys-2-0.1.154.crate     # → llama-cpp-sys-2-0.1.154/
  ```
- The crate's own `llama.cpp/` directory (upstream pin `5f55650a78f92aff4d48d671423e888fac0469ff`) was **deleted** and replaced by §2.

## 2. `llama.cpp/` — Atomic fork snapshot

- Repo: `https://github.com/AtomicBot-ai/atomic-llama-cpp-turboquant` (default branch `dev`), licence MIT.
- Upstream of the fork: `TheTom/llama-cpp-turboquant`.
- Commit: **`8d93507810cd89b26bfb47148f2c1708cc3fa316`**, committed 2026-10-27T14:51:26Z, "Merge pull request #96 from AtomicBot-ai/feat/unlimited-ocr2".
- Content = `git archive 8d93507810cd89b26bfb47148f2c1708cc3fa316` of the fork, fetched 2026-11-06 as the GitHub codeload archive (which is `git archive` output):
  ```bash
  curl -sSL -o fork.tar.gz https://codeload.github.com/AtomicBot-ai/atomic-llama-cpp-turboquant/tar.gz/8d93507810cd89b26bfb47148f2c1708cc3fa316
  tar xzf fork.tar.gz   # → atomic-llama-cpp-turboquant-8d93507810cd89b26bfb47148f2c1708cc3fa316/ → renamed llama.cpp/
  ```
  Verify: `diff -r VENDORED/llama-cpp-sys-2-0.1.154-atomic/llama.cpp <fresh archive>` is empty. `llama.cpp/` is never edited.
- Compare fact (GitHub API `compare/5f55650a78f92aff4d48d671423e888fac0469ff...8d93507810cd89b26bfb47148f2c1708cc3fa316`, re-checked 2026-11-06): status `ahead`, `ahead_by 1221`, **`behind_by 0`** — the 0.1.154 bridge pin is an ancestor of the fork HEAD.
- Newer bridges rejected: 0.1.155/156 pin `e79e4bf6…` behind_by 107; 0.1.157–159 behind_by 776; 0.1.160/161 behind_by 1131.

## 3. Local patches (bridge files only; `llama.cpp/` untouched)

The fork is 1221 commits ahead of the bridge pin and changed three C/C++ signatures the
0.1.154 bridge calls. The pin is kept (`=0.1.154`); only these bridge files are adapted:

| File | Patch | Why |
|---|---|---|
| `wrapper_common.cpp` (`llama_rs_fit_params`) | passes `nullptr` for the fork's new `common_moe_cache_params * moe_cache` argument of `common_fit_params` | fork added the parameter; `nullptr` = MoE cache off (`common/fit.cpp` guards every use with `if (moe_cache …)`) |
| `build.rs` (bindgen) | `.blocklist_function("llama_sampler_init_penalties")`, `.blocklist_function("llama_sampler_init_dry")` | fork changed both signatures; the generated bindings would not match `llama-cpp-2` 0.1.154's calls |
| `src/lib.rs` | `pub unsafe fn llama_sampler_init_penalties(last_n, repeat, freq, present)` → fork `(n_vocab = 0, …)`; `pub unsafe fn llama_sampler_init_dry(vocab, n_ctx_train, …)` → fork `(vocab, …)` without `n_ctx_train` | keeps the exact 0.1.154 Rust ABI; `n_vocab` is read only by the fork's backend-sampling path, which the app does not use (CPU greedy decode in `inference.rs`; embeddings use no sampler) |

Recorded 2026-11-06 (BA.12). `cargo check --manifest-path src-tauri/Cargo.toml` exits 0 with these patches.
