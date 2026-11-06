# Semantic embeddings: research, findings and decisions (2026-11-06)

Status: **decided (D1–D9, §4); no open decisions.** This record is the evidence base for
ARCHITECTURE §L.4/L.8. FREEZE 2 (`f4736254`) was reopened by the operator on 2026-11-06 ("how is that
modular and contain vector embedding, and graph representation? you didn't ask
what embedding model").

## 1. Finding: the stipulated semantic embedding functionality does not exist

The product contract and architecture require **real vector similarity search
for synthesis**:
- homily, journaling, exegesis, scriptural and concept exploration;
- a Sacristan that combines the Mass, the Breviary and purchased works.

The codebase does not implement it.

| Stipulation | Where | What exists instead (evidence) |
|---|---|---|
| "Embeddings are deterministic and offline … the `embeddings` table is model-agnostic so a real sentence-transformer can replace it" | ARCHITECTURE decision 4 (`DOCS/ARCHITECTURE.md:92`) | No sentence-transformer was ever wired. The only embedder is `embedText` (`src/core/vector/embed.ts:13-46`). It hashes character trigrams with FNV-1a into **128 buckets**, L2-normalizes them and quantizes to int8. It is lexical and not semantic, so it matches spelling, not meaning, and cannot relate Latin to English. |
| Real sentence-transformer embeddings | deferred: `DOCS/ARCHITECTURE.md:688`, `CHECKLIST.md:114,529` | Never scheduled into a stanza. |
| Content modules: "additional SQLite databases in the same graph schema … `CorpusDb.attachModule`"; charged for "graph + vector surfacing" | decision 19 (`DOCS/ARCHITECTURE.md:107`) | `attachModule` does not exist. Catena Aurea sits inside `missal.db`. |
| Sacristan synthesis across corpus and owned works | operator goal; CHECKLIST BV.1 | The Sacristan does **no corpus retrieval**. It sees only the live view plus the user's own trigram memories (`src/ui/ChatView.tsx:358-372`). |
| On-device embedding through the engine contract | `IInferenceEngine.embed?()` (`reusable-chatbot/core/engine-types.ts:98`) | No engine implements `embed`. Native llama.cpp generates only (`src-tauri/src/inference.rs:241`) and is not compiled on Windows (`inference.rs:120` NOT_COMPILED). `onnxruntime-web` is a dependency (`package.json:45`) but is imported nowhere. |

**Every vector producer and consumer uses the trigram hash:**
- ingest `scripts/ingest-corpus.mjs:480`, `ingest-bible.mjs:197`, `ingest-commentary.mjs:228`;
- queries `src/core/data/corpusDb.ts:479,769,830`, `src/core/vector/clause.ts:87`;
- user data `src/core/accompaniment/store.ts:403`, `src/core/companion/memory.ts:81`.

**Corpus scale** (`public/missal.db`): 85,381 vectors (dim 128) and 91,927 text
blocks. Search is a linear JS scan (`corpusDb.ts:751`) with no index.

**Catena Aurea today:**
- 815 pericope nodes, each a whole chain of Fathers;
- no per-Father nodes;
- 3,784 `COMMENTS_ON` edges, 0 `INSTANCE_OF` edges;
- never used as an interpretive nucleus, because the sources default to
  `['haydock']` (`corpusDb.ts:476,555`).

**FREEZE 2 §L.4 as committed** would have shipped these same trigram vectors in a
"module". That is why it was reopened, and why this intervention is required.

## 2. Operator decisions recorded

| Decision | Operator wording (2026-11-06) | Outcome |
|---|---|---|
| Real vector similarity search for synthesis | "we're supposed to be using actual vector similarity search for synthesis" | Replace `embedText` with a real embedding model. Re-embed the whole base corpus (Mass, Breviary, Bible, commentaries) and every module with the same model, or they cannot be searched together. |
| Scope | "not talking inference for chatbot — just for vector similarity" | Embedding and rerank only. Chatbot generation is out of scope. |
| Dimensions | "performance over precision; 256 if there is performance gain, else 512" | **256 dims**, int8, via Matryoshka truncation then renormalize. Measured on 85,381 vectors: about 21.9 MB versus 43.7 MB at 512 (download and RAM), with half the multiply-adds per query. |
| Reranker | "if it is complex and risks agentic coding breaking the codebase, add it now" | A reranker is designed into the search path **now** and reranks the top ~20 hits, so the search path is not reopened later. |
| Target backends | "atomic-chat's llama.cpp with turboquant turbo3/4 and/or litert-llm for android … and wllama for web" | Prefer the model that runs on **all three** backends, filling the existing `IInferenceEngine.embed?()` slot, with no new runtime. |
| Initial model family | "ingest using ollama, for example qwen3-embedding" | Researched; see §3. Not final. |

## 3. Research (multi-agent workflows with adversarial verification)

The research ran as three workflows:
- `wf_a881563c-744`: repo infrastructure, prior decisions, model candidates, Catena graph feasibility.
- `wf_bd7b7e55-810`: Qwen3 on each platform.
- `wf_cf33992d-7ab`: fit against the operator's three backends. Its results are recorded if they arrive later; they do not reopen D1–D9.

### 3.1 Candidates (verified on Hugging Face unless marked)

| Model | Licence | Quantized size | Dims | Notes |
|---|---|---|---|---|
| **EmbeddingGemma-2** (`google/embeddinggemma-2`, text part 270M) | **Apache-2.0** | ONNX `onnx-community/embeddinggemma-2-ONNX`: q4f16 157 MB (WebGPU), q4 174 MB, 8-bit 314 MB; GGUF `ggml-org/embeddinggemma-2-GGUF`, `AtomicChat/embeddinggemma-2-GGUF` | 768 → 512/256/128 (Matryoshka) | 8K tokens. **LiteRT-LM officially supports it** on Android (GPU backend). llama.cpp supports it since PR #30054. **Ollama currently fails** to load the architecture. |
| EmbeddingGemma-300m (v1) | Gemma Terms of Use (gated; not MIT/Apache) | ONNX 8-bit 309 MB, q4 197 MB | 768 → 512/256/128 | No fp16. |
| Qwen3-Embedding-0.6B | Apache-2.0 | ONNX int8 **614 MB**; Ollama `qwen3-embedding:0.6b` 639 MB | up to 1024 (Matryoshka) | **Not supported by LiteRT-LM.** `litert-community/Qwen3-Embedding-0.6B-LiteRT` is a plain fp16 `.tflite` (~882 MB plus a 310 MB table), fixed at 128 tokens, Android only, and did not run in the browser. |
| Qwen3-Reranker-0.6B | Apache-2.0 | ONNX ~600 MB (q8) / 995 MB (q4) | — | Ollama has **no rerank endpoint** (`/api/rerank` 404). |
| multilingual-e5-small | MIT | 118 MB 8-bit | 384 (no Matryoshka) | Latin explicitly tagged. Fallback. |

Excluded: jina v3/v5 (non-commercial licence), nomic-v2 (no ONNX), bge-m3 (too large for phones), MiniLM and nomic-v1.5 (English only).

### 3.2 Platform findings
- **Single webview path.** onnxruntime-web/transformers.js runs in all four webviews: browser, WebView2, WebKitGTK and Android System WebView.
  - WebGPU: expected in WebView2; **unconfirmed** in WebKitGTK and Android WebView; WASM everywhere.
- **TurboQuant turbo3/turbo4** compress the KV cache, which matters for long generation. An embedding is a single short forward pass, so KV compression is expected to be immaterial; weight quantization still matters. 
- **wllama multithreading** needs `SharedArrayBuffer`, which requires cross-origin isolation (COOP/COEP). That can break Firebase sign-in popups and RevenueCat/Stripe checkout. Resolved by D2: wllama runs single-threaded.
- **Native llama.cpp** (`llama-cpp-2 0.1.156`) already exposes `with_embeddings`, `with_pooling_type` (Last, Rank) and `embeddings_seq_ith`. A native embed command is a small addition on Linux and Android arm64.

### 3.3 Compatibility rules (any model)

Corpus vectors (ingest) and query vectors (device) must come from the **same
weights, quantization, prefixes, pooling, truncation and normalization**:
- record `embed_model`, `revision`, `dim`, `prefix` and `norm` in `missal.db` and every module;
- refuse to compare across models;
- gate every platform on a probe-set parity check (cosine ≥ 0.99 against ingest);
- ingest with the same artifact the device runs. Ollama cannot load EmbeddingGemma-2, so that model would be ingested with the identical ONNX or GGUF file in Node or llama.cpp.

Decision 4's "byte-stable across platforms" cannot hold for model-computed query
vectors. The operator must waive it for query vectors; the parity gate replaces it.

## 4. Decisions (final, 2026-11-06)

The operator said "I don't think we need to wait for anything further". The
remaining choices are therefore made here as documented judgements. Any later
research finding that contradicts them is recorded, not treated as a blocker.

| # | Decision | Rationale |
|---|---|---|
| D1 | **Embedder: EmbeddingGemma-2, text encoder** (`google/embeddinggemma-2`, Apache-2.0). Canonical artifact is **GGUF Q8_0** from `ggml-org/embeddinggemma-2-GGUF`, pinned by sha256. **256 dims** (Matryoshka truncation, then L2 renormalize), stored as int8. Prefixes: query `task: search result \| query: `, document `title: none \| text: `. | It is the only candidate that runs on all three operator backends: llama.cpp GGUF (including `AtomicChat/embeddinggemma-2-GGUF`), wllama, and LiteRT-LM (officially documented). It is permissive and small. Qwen3-Embedding has no LiteRT-LM support and is about 2× the size. |
| D2 | **Runtime: the llama.cpp family on every platform, one GGUF.** Ingest runs llama.cpp with the identical GGUF. Ollama cannot load this architecture, so ingest uses llama.cpp rather than Ollama, while keeping the operator's "ingest locally" intent. **Linux and Android arm64:** a native `llama-cpp-2` embed command. **Web/PWA, Windows** (native engine not compiled) **and other Android ABIs:** wllama, **single-threaded**. | One artifact gives exact ingest/query parity. Single-threaded wllama needs no COOP/COEP, so Firebase popups and RevenueCat/Stripe checkout are not broken. LiteRT-LM stays an optional Android accelerator, admitted only after it passes the parity gate (not in this release). |
| D3 | **Reranker: Qwen3-Reranker-0.6B GGUF** (Apache-2.0, llama.cpp rank pooling) on the same llama.cpp/wllama runtimes. It reranks the top 20 vector hits. | The operator chose to design it in now, so the search path is never reopened. No Gemma-family reranker is known. |
| D4 | Decision 4's **byte-stability is waived for model-computed query vectors**. It is replaced by a **parity gate**: a fixed probe set must reach cosine ≥ 0.99 against the ingest vectors on every platform before release. | Byte-stability is impossible across WASM, native and GPU kernels. The gate keeps the intent, which is comparable vectors. |
| D5 | **Model metadata is mandatory.** `missal.db` and every module carry `embed_meta` (`model`, `artifact_sha256`, `dim`, `quant`, `prefix_query`, `prefix_doc`, `norm`). A module whose `embed_meta` differs from the base corpus is never attached. | Prevents silently comparing vectors from different models. |
| D6 | **Re-embed everything** with D1: Mass, Breviary, Bible, commentaries, and every module. User sidecar vectors (companion memory, accompaniments) are re-embedded on first launch after upgrade. `embedText` (trigram) is retired. | Vectors from different models are not comparable. |
| D7 | **Before the models finish downloading:** free-text search falls back to FTS concordance, and "more like this passage" uses precomputed `SIMILAR_TO` edges. No trigram fallback is kept. | Avoids storing two vector sets. The graph edges carry similarity offline from first launch. |
| D8 | **Catena graph granularity: per-Father `quotation` nodes** wherever the attribution is parseable, otherwise the pericope node stands alone. Edges: `PART_OF` pericope, `ATTRIBUTED_TO` father, `CITES` verse (explicit references), `COMMENTS_ON` verse (pericope), `INSTANCE_OF` concept (semantic, computed at ingest against concept centroids), `SIMILAR_TO` (top-8 neighbours, within the module and to base-corpus keys, with cosine weight). | This is the graph representation the operator asked for. The Fathers become first-class, traversable entities. |
| D9 | **Sacristan retrieval:** each turn injects the top 5 reranked vector hits plus the top 5 graph neighbours, drawn from the base corpus and every owned module. | This was the operator's synthesis goal. The Sacristan has no corpus retrieval today. |

ARCHITECTURE §L.4 and §L.8 are rewritten from D1–D9, and FREEZE 2 is re-committed.
