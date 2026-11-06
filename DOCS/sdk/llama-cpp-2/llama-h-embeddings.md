<!--
SNAPSHOT  DOCS/sdk/llama-cpp-2/llama-h-embeddings.md
source:   https://static.crates.io/crates/llama-cpp-sys-2/llama-cpp-sys-2-0.1.156.crate (llama.cpp/include/llama.h)
fetched:  2026-11-06 (crate tarball, verbatim excerpts)
version:  llama-cpp-2 0.1.156 (matches src-tauri/Cargo.toml pin) / llama-cpp-sys-2 0.1.156; git tag 0.1.156 = 63e549708237b16b39018288582655539e0a9d5b
license:  MIT (llama.cpp)

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/llama-cpp-2/INDEX.md instead.
-->

# llama.h excerpts bundled in llama-cpp-sys-2 0.1.156

## llama_pooling_type (L170-185)

```c
        LLAMA_ROPE_SCALING_TYPE_YARN        = 2,
        LLAMA_ROPE_SCALING_TYPE_LONGROPE    = 3,
        LLAMA_ROPE_SCALING_TYPE_MAX_VALUE   = LLAMA_ROPE_SCALING_TYPE_LONGROPE,
    };

    enum llama_pooling_type {
        LLAMA_POOLING_TYPE_UNSPECIFIED = -1,
        LLAMA_POOLING_TYPE_NONE = 0,
        LLAMA_POOLING_TYPE_MEAN = 1,
        LLAMA_POOLING_TYPE_CLS  = 2,
        LLAMA_POOLING_TYPE_LAST = 3,
        LLAMA_POOLING_TYPE_RANK = 4, // used by reranking models to attach the classification head to the graph
    };

    enum llama_attention_type {
        LLAMA_ATTENTION_TYPE_UNSPECIFIED = -1,
```

## context params pooling field (L355-370)

```c
        uint32_t n_seq_max;             // max number of sequences (i.e. distinct states for recurrent models)
        uint32_t n_rs_seq;              // number of recurrent-state snapshots per seq for rollback (0 = no rollback) [EXPERIMENTAL]
        uint32_t n_outputs_max;         // max outputs in a ubatch (0 = n_batch)
        uint32_t n_outputs_max_per_seq; // max outputs per sequence (0 = n_outputs_max)
        int32_t  n_threads;             // number of threads to use for generation
        int32_t  n_threads_batch;       // number of threads to use for batch processing

        enum llama_context_type      ctx_type;          // set the context type (e.g. MTP)
        enum llama_rope_scaling_type rope_scaling_type; // RoPE scaling type, from `enum llama_rope_scaling_type`
        enum llama_pooling_type      pooling_type;      // whether to pool (sum) embedding results by sequence id
        enum llama_attention_type    attention_type;    // attention type to use for embeddings
        enum llama_flash_attn_type   flash_attn_type;   // when to enable Flash Attention

        // ref: https://github.com/ggml-org/llama.cpp/pull/2054
        float    rope_freq_base;   // RoPE base frequency, 0 = from model
        float    rope_freq_scale;  // RoPE frequency scaling factor, 0 = from model
```

## pooling / n_cls_out getters (L570-600)

```c
    DEPRECATED(LLAMA_API int32_t llama_n_vocab    (const struct llama_vocab * vocab), "use llama_vocab_n_tokens instead");

    LLAMA_API const struct llama_model * llama_get_model   (const struct llama_context * ctx);
    LLAMA_API           llama_memory_t   llama_get_memory  (const struct llama_context * ctx);
    LLAMA_API  enum llama_pooling_type   llama_pooling_type(const struct llama_context * ctx); // TODO: rename to llama_get_pooling_type

    LLAMA_API const struct llama_vocab * llama_model_get_vocab(const struct llama_model * model);
    LLAMA_API enum llama_rope_type       llama_model_rope_type(const struct llama_model * model);

    LLAMA_API int32_t llama_model_n_ctx_train  (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_embd       (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_embd_inp   (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_embd_out   (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_layer      (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_layer_nextn(const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_head       (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_head_kv    (const struct llama_model * model);
    LLAMA_API int32_t llama_model_n_swa        (const struct llama_model * model);

    // Get the model's RoPE frequency scaling factor
    LLAMA_API float llama_model_rope_freq_scale_train(const struct llama_model * model);

    // Returns the number of classifier outputs (only valid for classifier models)
    // Undefined behavior for non-classifier models
    LLAMA_API uint32_t llama_model_n_cls_out(const struct llama_model * model);

    // Returns label of classifier output by index (<n_cls_out). Returns nullptr if no label provided
    LLAMA_API const char * llama_model_cls_label(const struct llama_model * model, uint32_t i);

    LLAMA_API enum llama_vocab_type llama_vocab_type(const struct llama_vocab * vocab);

```

## embeddings getters (L1030-1060)

```c
    // Negative indices can be used to access logits in reverse order, -1 is the last logit.
    // returns NULL for invalid ids.
    LLAMA_API float * llama_get_logits_ith(struct llama_context * ctx, int32_t i);

    // Get all output token embeddings.
    // when pooling_type == LLAMA_POOLING_TYPE_NONE or when using a generative model,
    // the embeddings for which llama_batch.logits[i] != 0 are stored contiguously
    // in the order they have appeared in the batch.
    // shape: [n_outputs*n_embd]
    // Otherwise, returns NULL.
    // TODO: deprecate in favor of llama_get_embeddings_ith() (ref: https://github.com/ggml-org/llama.cpp/pull/14853#issuecomment-3113143522)
    LLAMA_API float * llama_get_embeddings(struct llama_context * ctx);

    // Get the embeddings for the ith token. For positive indices, Equivalent to:
    // llama_get_embeddings(ctx) + ctx->output_ids[i]*n_embd
    // Negative indices can be used to access embeddings in reverse order, -1 is the last embedding.
    // shape: [n_embd] (1-dimensional)
    // returns NULL for invalid ids.
    LLAMA_API float * llama_get_embeddings_ith(struct llama_context * ctx, int32_t i);

    // Get the embeddings for a sequence id
    // Returns NULL if pooling_type is LLAMA_POOLING_TYPE_NONE
    // when pooling_type == LLAMA_POOLING_TYPE_RANK, returns float[n_cls_out] with the rank(s) of the sequence
    // otherwise: float[n_embd] (1-dimensional)
    LLAMA_API float * llama_get_embeddings_seq(struct llama_context * ctx, llama_seq_id seq_id);

    //
    // backend sampling API [EXPERIMENTAL]
    // note: use only if the llama_context was created with at least one llama_sampler_seq_config
    //

```
