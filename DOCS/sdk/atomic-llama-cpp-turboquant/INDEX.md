# DOCS/sdk/atomic-llama-cpp-turboquant/ — Atomic Chat llama.cpp fork (AtomicBot-ai/atomic-llama-cpp-turboquant)

**Pinned version:** release tag b10298-2.1.0 (2026-10-27); README at master commit 8d93507810cd89b26bfb47148f2c1708cc3fa316
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/atomic-llama-cpp-turboquant/<file>.md §<heading>`.

## Curator notes

- TurboQuant formats: KV cache types `turbo3` (and siblings) via `-ctk turbo3 -ctv turbo3` (~4.3x KV compression); weight quants `TQ4_1S` / `TQ3_1S`. See README §TurboQuant — KV cache & weight compression.
- ARCHITECTURE §L.4: embedding/rerank contexts on this fork use pooling Last/Rank and **no turbo KV** (keep default f16 KV types for embedding contexts).
- The README is long and mostly about generation/speculative decoding; the embedding-relevant parts are the build section and TurboQuant section.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`README.md`](README.md) | Fork README incl. TurboQuant KV/weight formats | curl, verbatim | <https://raw.githubusercontent.com/AtomicBot-ai/atomic-llama-cpp-turboquant/8d93507810cd89b26bfb47148f2c1708cc3fa316/README.md (fetched from master at that commit)> |

## Section map (deep-link targets)

### `README.md`

- Atomic llama.cpp
  - Recent API changes
  - Hot topics
  - Quick start
  - Description
  - Gemma 4 MTP — speculative decoding
    - Pre-built assistant GGUFs
    - Quick start
    - Bench snapshot (MacBook Pro M4 Max, 40-core GPU, 48 GB, Metal, single slot)
    - Knobs
  - Qwen 3.6 NextN — speculative decoding
    - Pre-built model GGUFs
    - Quick start
    - Bench snapshot (MacBook Pro M4 Max, 40-core GPU, 48 GB, Metal, single slot)
    - Knobs
  - TurboQuant — KV cache & weight compression
    - KV cache types (`-ctk` / `-ctv`)
    - Weight quantization types (`llama-quantize`)
    - Backend support
    - Pre-built binaries
      - Text-only
      - Multimodal
  - Supported backends
  - Obtaining and quantizing models
  - [`llama-cli`](tools/cli)
      - A CLI tool for accessing and experimenting with most of `llama.cpp`'s functionality.
  - [`llama-server`](tools/server)
      - A lightweight, [OpenAI API](https://github.com/openai/openai-openapi) compatible, HTTP server for serving LLMs.
  - [`llama-perplexity`](tools/perplexity)
      - A tool for measuring the [perplexity](tools/perplexity/README.md) [^1] (and other quality metrics) of a model over a given text.
  - [`llama-bench`](tools/llama-bench)
      - Benchmark the performance of the inference for various parameters.
  - [`llama-simple`](examples/simple)
      - A minimal example for implementing apps with `llama.cpp`. Useful for developers.
  - Contributing
  - Other documentation
      - Development documentation
      - Seminal papers and background on the models
  - XCFramework
  - Completions
      - Bash Completion
  - Dependencies
