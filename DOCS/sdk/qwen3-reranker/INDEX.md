# DOCS/sdk/qwen3-reranker/ — Qwen3-Reranker-0.6B model card

**Pinned version:** HF Qwen/Qwen3-Reranker-0.6B @ e61197ed45024b0ed8a2d74b80b4d909f1255473 (lastModified 2026-04-16)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/qwen3-reranker/<file>.md §<heading>`.

## Curator notes

- **yes/no scoring:** the reranker is a causal LM; the score is `softmax([logit("no"), logit("yes")])[yes]` at the final position after the templated prompt (system: judge whether the Document meets the requirements based on the Query and the Instruct, answer only "yes" or "no"; user: `<Instruct>: … <Query>: … <Document>: …`; assistant prefix `<think>\n\n</think>\n\n`). See §Using Transformers.
- In llama.cpp-family runtimes this maps to `pooling = rank` (classification head = yes/no logits) — see `DOCS/sdk/llama-cpp-2/` and `DOCS/sdk/wllama-3.8.1/` (`createRerank`).

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`model-card.md`](model-card.md) | Model card: prompt template, yes/no logit scoring | curl, verbatim | <https://huggingface.co/Qwen/Qwen3-Reranker-0.6B/raw/e61197ed45024b0ed8a2d74b80b4d909f1255473/README.md (fetched from main at that revision)> |

## Section map (deep-link targets)

### `model-card.md`

- Qwen3-Reranker-0.6B
  - Highlights
  - Model Overview
  - Qwen3 Embedding Series Model list
  - Usage
    - Using Sentence Transformers
    - Using Transformers
    - vLLM Usage
  - Evaluation
  - Citation
