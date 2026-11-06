# DOCS/sdk/qwen3-embedding/ — Qwen3-Embedding-0.6B model card

**Pinned version:** HF Qwen/Qwen3-Embedding-0.6B @ 97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3 (lastModified 2026-04-20); GGUF card Qwen/Qwen3-Embedding-0.6B-GGUF @ 370f27d7550e0def9b39c1f16d3fbaa13aa67728
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/qwen3-embedding/<file>.md §<heading>`.

## Curator notes

- **Instruct prefix (queries only):** `Instruct: {task_description}\nQuery:{query}`; documents get no prefix. Repo-specific task string is in ARCHITECTURE §L.4.
- **Last-token pooling** with left padding (`last_token_pool` in the Transformers example); llama.cpp: `--pooling last` (`model-card-gguf.md` §llama.cpp). ARCHITECTURE §L.4 additionally requires EOS to be appended (repo decision, not a model-card quote).
- **MRL dims:** 0.6B outputs 1024 dims and supports user-defined output dimensions 32–1024 (Model Overview table); truncate then re-normalize.
- Normalize embeddings (L2) before cosine/dot similarity.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`model-card.md`](model-card.md) | Model card: overview (MRL dims), instruct format, last-token pooling | curl, verbatim | <https://huggingface.co/Qwen/Qwen3-Embedding-0.6B/raw/97b0c614be4d77ee51c0cef4e5f07c00f9eb65b3/README.md (fetched from main at that revision)> |
| [`model-card-gguf.md`](model-card-gguf.md) | GGUF card: llama.cpp --pooling last usage | curl, verbatim | <https://huggingface.co/Qwen/Qwen3-Embedding-0.6B-GGUF/raw/370f27d7550e0def9b39c1f16d3fbaa13aa67728/README.md (fetched from main at that revision)> |

## Section map (deep-link targets)

### `model-card.md`

- Qwen3-Embedding-0.6B
  - Highlights
  - Model Overview
  - Qwen3 Embedding Series Model list
  - Usage
    - Sentence Transformers Usage
    - Transformers Usage
    - vLLM Usage
    - Text Embeddings Inference (TEI) Usage
  - Evaluation
    - MTEB (Multilingual)
    - MTEB (Eng v2)
    - C-MTEB (MTEB Chinese)
  - Citation

### `model-card-gguf.md`

- Qwen3-Embedding-0.6B-GGUF
  - Highlights
  - Model Overview
  - Qwen3 Embedding Series Model list
  - Usage
    - llama.cpp
  - Evaluation
    - MTEB (Multilingual)
    - MTEB (Eng v2)
    - C-MTEB (MTEB Chinese)
  - Citation
