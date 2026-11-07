//! §L native embedding engine (L-native-embed-engine-20261106 §2.3, closed set
//! Phase L): Qwen3-Embedding (pooling Last) and Qwen3-Reranker (pooling Rank)
//! over llama-cpp-2 =0.1.154 built against the Atomic llama.cpp fork
//! (`VENDORED/llama-cpp-sys-2-0.1.154-atomic`, fork sha 8d935078…).
//! see DOCS/sdk/atomic-llama-cpp-turboquant/README.md §TurboQuant — KV cache & weight compression
//! (embedding contexts deliberately use F16 KV — D2 "no turbo KV").
//! see DOCS/sdk/llama-cpp-2/example-embeddings.md (the recipe this module follows).
//!
//! One session per role; a fresh context per call (as `inference.rs`), so no
//! context ever outlives the EMBED_SESSIONS lock scope that created it.

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use llama_cpp_2::context::params::{KvCacheType, LlamaContextParams, LlamaPoolingType};
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use llama_cpp_2::llama_batch::LlamaBatch;
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use llama_cpp_2::model::params::LlamaModelParams;
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use llama_cpp_2::model::{AddBos, LlamaModel};
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use std::collections::HashMap;
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use std::num::NonZeroU32;
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
use std::sync::Mutex;

/// Fork pin reported by `embed_probe` (PROVENANCE: VENDORED/llama-cpp-sys-2-0.1.154-atomic/PROVENANCE.md).
const LLAMA_CPP: &str = "atomic-llama-cpp-turboquant@8d93507810cd89b26bfb47148f2c1708cc3fa316";
/// Context window for every embed/rerank context (§2.3).
const MAX_TOKENS: u32 = 2048;

/// `t = min(8, max(1, available_parallelism − 1))` (§2.3).
fn embed_threads() -> u32 {
    let n = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(2) as u32;
    n.saturating_sub(1).max(1).min(8)
}

// ---------------------------------------------------------------------------
// Stubs: 32-bit targets and builds without the native-inference feature.
// ---------------------------------------------------------------------------

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
const NOT_COMPILED: &str = "native embedding is not compiled into this build (32-bit target)";

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
#[tauri::command]
pub fn embed_probe() -> serde_json::Value {
    let _ = embed_threads;
    serde_json::json!({ "nativeEmbed": false, "llamaCpp": LLAMA_CPP, "threads": 0, "maxTokens": MAX_TOKENS })
}

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
#[tauri::command]
pub async fn embed_load(
    _path: String,
    _role: String,
    _expected_bytes: u64,
    _expected_sha256: Option<String>,
) -> Result<String, String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
#[tauri::command]
pub async fn embed_texts(_session_id: String, _texts: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
#[tauri::command]
pub async fn rerank_scores(
    _session_id: String,
    _query: String,
    _documents: Vec<String>,
) -> Result<Vec<f32>, String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_pointer_width = "32"))]
#[tauri::command]
pub fn embed_unload(_session_id: String) -> Result<(), String> {
    Err(NOT_COMPILED.into())
}

// ---------------------------------------------------------------------------
// Native engine: every 64-bit target (Linux, Windows, macOS, Android arm64).
// ---------------------------------------------------------------------------

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[derive(Copy, Clone, PartialEq, Eq, Debug)]
enum EmbedRole {
    Embed,
    Rerank,
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
impl EmbedRole {
    fn parse(role: &str) -> Result<Self, String> {
        match role {
            "embed" => Ok(Self::Embed),
            "rerank" => Ok(Self::Rerank),
            _ => Err("embed: unknown role".into()),
        }
    }
    fn as_str(self) -> &'static str {
        match self {
            Self::Embed => "embed",
            Self::Rerank => "rerank",
        }
    }
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
struct EmbedSession {
    model: LlamaModel,
    role: EmbedRole,
    rerank_template: Option<String>,
}

// SAFETY: the llama.cpp model handle is a plain pointer to heap state that we
// guard behind the process-wide EMBED_SESSIONS mutex — every access happens
// while that lock is held, one thread at a time. Contexts are created per
// embed/rerank call, so no context ever outlives the lock scope that created it.
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
unsafe impl Send for EmbedSession {}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
static EMBED_SESSIONS: Mutex<Option<HashMap<String, EmbedSession>>> = Mutex::new(None);

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[tauri::command]
pub fn embed_probe() -> serde_json::Value {
    serde_json::json!({
        "nativeEmbed": true,
        "llamaCpp": LLAMA_CPP,
        "threads": embed_threads(),
        "maxTokens": MAX_TOKENS,
    })
}

/// Streamed sha256 of the artifact (crate `sha2`), lowercase hex.
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
fn file_sha256(path: &str) -> Result<String, String> {
    use sha2::{Digest, Sha256};
    use std::io::Read;
    let mut file = std::fs::File::open(path).map_err(|e| format!("embed: open failed: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 1 << 20];
    loop {
        let n = file.read(&mut buf).map_err(|e| format!("embed: read failed: {e}"))?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher.finalize().iter().map(|b| format!("{b:02x}")).collect())
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[tauri::command]
pub async fn embed_load(
    path: String,
    role: String,
    expected_bytes: u64,
    expected_sha256: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || load_session(path, role, expected_bytes, expected_sha256))
        .await
        .map_err(|e| e.to_string())?
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
fn load_session(
    path: String,
    role: String,
    expected_bytes: u64,
    expected_sha256: Option<String>,
) -> Result<String, String> {
    // (1) size pin.
    let len = std::fs::metadata(&path).map_err(|e| format!("embed: artifact not found: {e}"))?.len();
    if len != expected_bytes {
        return Err("embed: artifact size mismatch".into());
    }
    // (2) digest pin (Play-pack paths; DownloadManager paths are already verified).
    if let Some(expected) = expected_sha256.as_deref().filter(|s| !s.is_empty()) {
        if file_sha256(&path)? != expected.to_ascii_lowercase() {
            return Err("embed: artifact digest mismatch".into());
        }
    }
    // (3) CPU-only load; backend is process-global (shared with inference.rs).
    let be = crate::inference::backend()?;
    let model = {
        let guard = be.lock().map_err(|_| "backend poisoned")?;
        LlamaModel::load_from_file(&guard, &path, &LlamaModelParams::default())
            .map_err(|e| format!("embed: model load failed: {e}"))?
    };
    // (4) role ↔ GGUF metadata (qwen3.pooling_type 3 = Last, 4 = Rank).
    let role = EmbedRole::parse(&role)?;
    let pooling = model.meta_val_str("qwen3.pooling_type").unwrap_or_default();
    let rerank_template = match role {
        EmbedRole::Embed if pooling == "3" => None,
        EmbedRole::Rerank if pooling == "4" => Some(
            model
                .meta_val_str("tokenizer.chat_template.rerank")
                .map_err(|_| "embed: artifact role mismatch".to_string())?,
        ),
        _ => return Err("embed: artifact role mismatch".into()),
    };
    // (5) replace any existing session of the same role.
    let id = format!(
        "embed:{}:{}",
        role.as_str(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    let mut guard = EMBED_SESSIONS.lock().map_err(|_| "embed sessions poisoned")?;
    let map = guard.get_or_insert_with(HashMap::new);
    map.retain(|_, s| s.role != role);
    map.insert(id.clone(), EmbedSession { model, role, rerank_template });
    Ok(id)
}

/// Per-call context parameters (§2.3).
/// see DOCS/sdk/llama-cpp-2/context-params-get-set.md (with_n_ctx, with_n_batch, with_n_ubatch,
/// with_n_threads, with_n_threads_batch, with_pooling_type, with_type_k, with_type_v, with_embeddings)
/// see DOCS/sdk/llama-cpp-2/context-params.md (LlamaPoolingType::{Last=3, Rank=4}, KvCacheType)
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
fn context_params(role: EmbedRole) -> LlamaContextParams {
    let t = embed_threads() as i32;
    LlamaContextParams::default()
        .with_n_ctx(NonZeroU32::new(MAX_TOKENS))
        .with_n_batch(MAX_TOKENS)
        .with_n_ubatch(MAX_TOKENS)
        .with_n_threads(t)
        .with_n_threads_batch(t)
        .with_embeddings(true)
        .with_pooling_type(match role {
            EmbedRole::Embed => LlamaPoolingType::Last,
            EmbedRole::Rerank => LlamaPoolingType::Rank,
        })
        .with_type_k(KvCacheType::F16)
        .with_type_v(KvCacheType::F16)
}

/// Run `f` with the session's model + a fresh context, under the sessions lock.
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
fn with_session<T>(
    session_id: &str,
    role: EmbedRole,
    f: impl FnOnce(&EmbedSession, &mut llama_cpp_2::context::LlamaContext<'_>) -> Result<T, String>,
) -> Result<T, String> {
    let guard = EMBED_SESSIONS.lock().map_err(|_| "embed sessions poisoned")?;
    let session = guard
        .as_ref()
        .and_then(|m| m.get(session_id))
        .ok_or("embed: unknown session")?;
    if session.role != role {
        return Err("embed: session role mismatch".into());
    }
    let be = crate::inference::backend()?;
    let mut ctx = {
        let backend = be.lock().map_err(|_| "backend poisoned")?;
        session
            .model
            .new_context(&backend, context_params(role))
            .map_err(|e| format!("embed: context init failed: {e}"))?
    };
    f(session, &mut ctx)
}

/// One sequence → its pooled output (1024 floats for Last; n_cls_out for Rank).
/// see DOCS/sdk/llama-cpp-2/context-embeddings.md (embeddings_seq_ith)
/// see DOCS/sdk/llama-cpp-2/llama-h-embeddings.md (RANK → n_cls_out)
#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
fn pooled(
    ctx: &mut llama_cpp_2::context::LlamaContext<'_>,
    tokens: &[llama_cpp_2::token::LlamaToken],
) -> Result<Vec<f32>, String> {
    let mut batch = LlamaBatch::new(MAX_TOKENS as usize, 1);
    ctx.clear_kv_cache();
    batch.add_sequence(tokens, 0, false).map_err(|e| e.to_string())?;
    ctx.decode(&mut batch).map_err(|e| e.to_string())?;
    Ok(ctx.embeddings_seq_ith(0).map_err(|e| e.to_string())?.to_vec())
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[tauri::command]
pub async fn embed_texts(session_id: String, texts: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        with_session(&session_id, EmbedRole::Embed, |session, ctx| {
            let model = &session.model;
            let eos = model.token_eos();
            let mut out = Vec::with_capacity(texts.len());
            for text in &texts {
                let mut tokens = model
                    .str_to_token(text, AddBos::Always)
                    .map_err(|e| format!("embed: tokenization failed: {e}"))?;
                if tokens.len() > MAX_TOKENS as usize {
                    tokens.truncate(MAX_TOKENS as usize - 1);
                    tokens.push(eos);
                }
                // Qwen3-Embedding pools the last token, which must be EOS.
                if tokens.last() != Some(&eos) {
                    return Err("embed: EOS not appended".into());
                }
                out.push(pooled(ctx, &tokens)?);
            }
            Ok(out)
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[tauri::command]
pub async fn rerank_scores(session_id: String, query: String, documents: Vec<String>) -> Result<Vec<f32>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        with_session(&session_id, EmbedRole::Rerank, |session, ctx| {
            let model = &session.model;
            let template = session.rerank_template.as_deref().ok_or("embed: artifact role mismatch")?;
            let mut scores = Vec::with_capacity(documents.len());
            for document in &documents {
                let prompt = template.replace("{query}", &query).replace("{document}", document);
                let tokens = model
                    .str_to_token(&prompt, AddBos::Never)
                    .map_err(|e| format!("embed: tokenization failed: {e}"))?;
                if tokens.len() > MAX_TOKENS as usize {
                    return Err("embed: rerank prompt exceeds context".into());
                }
                let out = pooled(ctx, &tokens)?;
                // Rank pooling: element 0 is P(yes).
                scores.push(*out.first().ok_or("embed: empty rank output")?);
            }
            Ok(scores)
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(all(feature = "native-inference", target_pointer_width = "64"))]
#[tauri::command]
pub fn embed_unload(session_id: String) -> Result<(), String> {
    EMBED_SESSIONS
        .lock()
        .map_err(|_| "embed sessions poisoned")?
        .get_or_insert_with(HashMap::new)
        .remove(&session_id);
    Ok(())
}
