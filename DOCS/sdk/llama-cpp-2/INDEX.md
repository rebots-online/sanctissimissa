# DOCS/sdk/llama-cpp-2/ — llama-cpp-2 Rust crate (utilityai/llama-cpp-rs)

**Pinned version:** llama-cpp-2 0.1.156 (matches src-tauri/Cargo.toml pin) / llama-cpp-sys-2 0.1.156; git tag 0.1.156 = 63e549708237b16b39018288582655539e0a9d5b
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/llama-cpp-2/<file>.md §<heading>`.

## Curator notes

- Source of truth is the **crate source** at the pinned version (rustdoc is generated from these `///` comments; docs.rs `latest` had already moved to 0.1.161 on the fetch date, so it was not used).
- Embeddings recipe: `LlamaContextParams::default().with_embeddings(true).with_pooling_type(LlamaPoolingType::Last)` (Qwen3-Embedding) or `LlamaPoolingType::Rank` (Qwen3-Reranker) → decode batch with one seq id per input → `ctx.embeddings_seq_ith(seq)`.
- With `Rank` pooling, `embeddings_seq_ith` returns `n_cls_out` floats (the rank score[s]), not `n_embd` — see `context-embeddings.md` and `llama-h-embeddings.md` (`llama_get_embeddings_seq`).
- `embeddings_seq_ith` errors if embeddings were not enabled or pooling is `None`.
- In this repo the crate is built against the Atomic fork (see `DOCS/sdk/atomic-llama-cpp-turboquant/`); ARCHITECTURE §L.4 says embeddings use pooling Last/Rank and **no turbo KV**.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`README.md`](README.md) | Crate README | crate tarball (static.crates.io), verbatim | <https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/llama-cpp-2/README.md> |
| [`context-params.md`](context-params.md) | LlamaPoolingType enum, LlamaContextParams struct | crate tarball, verbatim source | <https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/llama-cpp-2/src/context/params.rs> |
| [`context-params-get-set.md`](context-params-get-set.md) | with_embeddings, with_pooling_type, n_batch/n_ubatch/threads | crate tarball, verbatim source | <https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/llama-cpp-2/src/context/params/get_set.rs> |
| [`context-embeddings.md`](context-embeddings.md) | embeddings_seq_ith / embeddings_ith and output width | crate tarball, verbatim source | <https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/llama-cpp-2/src/context.rs> |
| [`example-embeddings.md`](example-embeddings.md) | End-to-end embedding example | curl raw.githubusercontent.com at tag 0.1.156, verbatim | <https://github.com/utilityai/llama-cpp-rs/blob/0.1.156/examples/embeddings/src/main.rs> |
| [`llama-h-embeddings.md`](llama-h-embeddings.md) | C API semantics behind pooling / embeddings_seq (RANK → n_cls_out) | crate tarball, verbatim excerpts | <https://static.crates.io/crates/llama-cpp-sys-2/llama-cpp-sys-2-0.1.156.crate (llama.cpp/include/llama.h)> |

## Section map (deep-link targets)

### `README.md`

- llama-cpp-rs-2
- Info
- Dependencies
- Disclaimer
- Contributing

### `context-params.md`

- llama_cpp_2::context::params (src/context/params.rs)

### `context-params-get-set.md`

- LlamaContextParams builders (src/context/params/get_set.rs)

### `context-embeddings.md`

- LlamaContext (src/context.rs)

### `example-embeddings.md`

- Upstream embeddings example (examples/embeddings/src/main.rs @ 0.1.156)

### `llama-h-embeddings.md`

- llama.h excerpts bundled in llama-cpp-sys-2 0.1.156
  - llama_pooling_type (L170-185)
  - context params pooling field (L355-370)
  - pooling / n_cls_out getters (L570-600)
  - embeddings getters (L1030-1060)
