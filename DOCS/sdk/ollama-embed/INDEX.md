# DOCS/sdk/ollama-embed/ — Ollama /api/embed

**Pinned version:** Ollama docs at main branch on 2026-11-06 (latest release v0.40.15)
**Snapshot date:** 2026-11-06
**Convention:** Admin-Manual TC7 (`/home/robin/Admin-Manual/DOCS/TOOLING_CONVENTIONS/inline-deeplink-comments-to-local-sdk-docs.md`).
Cite as `// see DOCS/sdk/ollama-embed/<file>.md §<heading>`.

## Curator notes

- `POST /api/embed` with `model`, `input` (string or array), optional `truncate`, `options`, `keep_alive`, and **`dimensions`** (number of output dimensions — MRL truncation for models that support it, e.g. qwen3-embedding). See `api.md` §Generate Embeddings (parameter list near the `dimensions` line).
- `/api/embeddings` is the legacy endpoint (single prompt) — prefer `/api/embed`.
- ARCHITECTURE §L.4: the embedder artifact is the Ollama blob `qwen3-embedding:0.6b` (GGUF Q8_0) pinned by sha256.

## Files

| File | Covers | Fetch method | Source URL |
|---|---|---|---|
| [`api.md`](api.md) | Full REST API incl. /api/embed and dimensions | curl, verbatim | <https://raw.githubusercontent.com/ollama/ollama/main/docs/api.md> |
| [`capabilities-embeddings.md`](capabilities-embeddings.md) | Embeddings capability guide | curl, verbatim | <https://raw.githubusercontent.com/ollama/ollama/main/docs/capabilities/embeddings.mdx> |

## Section map (deep-link targets)

### `api.md`

- API
  - Endpoints
  - Conventions
    - Model names
    - Durations
    - Streaming responses
  - Generate a completion
    - Parameters
      - Structured outputs
      - JSON mode
    - Examples
      - Generate request (Streaming)
      - Request (No streaming)
      - Request (with suffix)
      - Request (Structured outputs)
      - Request (JSON mode)
      - Request (with images)
      - Request
      - Response
      - Request (Raw Mode)
      - Request (Reproducible outputs)
      - Generate request (With options)
      - Load a model
      - Unload a model
  - Generate a chat completion
    - Parameters
    - Tool calling
    - Structured outputs
    - Examples
      - Chat request (Streaming)
      - Chat request (Streaming with tools)
      - Chat request (No streaming)
      - Chat request (No streaming, with tools)
      - Chat request (Structured outputs)
      - Chat request (With History)
      - Chat request (With history, with tools)
      - Chat request (with images)
      - Chat request (Reproducible outputs)
      - Chat request (with tools)
      - Load a model
      - Unload a model
  - Create a Model
    - Parameters
      - Quantization types
    - Examples
      - Create a new model
      - Create a model from GGUF
      - Create a model from a Safetensors directory
  - Check if a Blob Exists
    - Query Parameters
    - Examples
      - Request
      - Response
  - Push a Blob
    - Query Parameters
    - Examples
      - Request
      - Response
  - List Local Models
    - Examples
      - Request
      - Response
  - Show Model Information
    - Parameters
    - Examples
      - Request
      - Response
  - Copy a Model
    - Examples
      - Request
      - Response
  - Delete a Model
    - Parameters
    - Examples
      - Request
      - Response
  - Pull a Model
    - Parameters
    - Examples
      - Request
- … (28 more headings)

### `capabilities-embeddings.md`

  - Generate embeddings
  - Generate a batch of embeddings
  - Tips
