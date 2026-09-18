//! CP.7 native runner provider (§7.8.2 Phase 1 desktop): llama.cpp over
//! llama-cpp-2 behind the Tauri command/event bridge. One persistent session
//! per loaded model; generation streams text deltas over a Tauri Channel (no
//! per-token IPC round-trips); the KV cache stays engine-owned on this side
//! of the ABI and nothing but text crosses it. Sampling v1 is deterministic
//! greedy — honest and reproducible, upgradeable behind the same contract.
//!
//! Cancellation: `inference_cancel` flips a flag that the decode loop checks
//! between tokens; the session stays usable afterwards. Generation holds the
//! session map lock for its duration, so cancel must never need that lock —
//! the flags live in their own registry.

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::context::params::LlamaContextParams;
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::llama_backend::LlamaBackend;
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::llama_batch::LlamaBatch;
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::model::params::LlamaModelParams;
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::model::{AddBos, LlamaModel, Special};
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
use llama_cpp_2::token::LlamaToken;
use std::collections::HashMap;
use std::num::NonZeroU32;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};

/// One process-wide backend; llama.cpp is global-state anyway.
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
static BACKEND: Mutex<Option<Arc<Mutex<LlamaBackend>>>> = Mutex::new(None);
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
static SESSIONS: Mutex<Option<HashMap<String, NativeSession>>> = Mutex::new(None);
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
static CANCELS: Mutex<Option<HashMap<String, Arc<AtomicBool>>>> = Mutex::new(None);

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
fn backend() -> Result<Arc<Mutex<LlamaBackend>>, String> {
    let mut guard = BACKEND.lock().map_err(|_| "backend poisoned")?;
    if guard.is_none() {
        let be = LlamaBackend::init().map_err(|e| format!("llama.cpp backend init failed: {e}"))?;
        *guard = Some(Arc::new(Mutex::new(be)));
    }
    Ok(guard.clone().expect("just initialized"))
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
fn sessions() -> &'static Mutex<Option<HashMap<String, NativeSession>>> {
    &SESSIONS
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
struct NativeSession {
    model: LlamaModel,
    n_ctx: u32,
}

// SAFETY: the llama.cpp model handle is a plain pointer to heap state that we
// guard behind the process-wide SESSIONS mutex — every access happens while
// that lock is held, one thread at a time. Contexts are created per generation
// call (the controller always re-prefills canonical history), so no context
// ever outlives the lock scope that created it.
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
unsafe impl Send for NativeSession {}

/// Capability truth from the executable engine (the broker frames it).
#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_probe() -> serde_json::Value {
    serde_json::json!({
        "runtime": if cfg!(mobile) { "android" } else { "tauri" },
        "nativeInference": false,
        "memoryBudgetBytes": 0,
        "accelerations": [],
        "contextCeiling": 0,
        "weightFormats": [],
        "kvFormats": [],
        "threads": 1,
        "notes": ["native engine not compiled into this build (Windows cross) — deferred to the Windows-native host"],
    })
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_load(_path: String, _context_tokens: Option<u32>) -> Result<String, String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_generate(
    _session_id: String,
    _messages: Vec<(String, String)>,
    _max_tokens: Option<u32>,
    _on_token: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_cancel(_session_id: String) -> Result<(), String> {
    Ok(())
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_unload(_session_id: String) -> Result<(), String> {
    Ok(())
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
#[tauri::command]
pub fn inference_tokenize(_session_id: String, _text: String) -> Result<Vec<i32>, String> {
    Err(NOT_COMPILED.into())
}

#[cfg(any(not(feature = "native-inference"), target_os = "windows", target_pointer_width = "32"))]
const NOT_COMPILED: &str =
    "native inference is not compiled into this build — deferred to the Windows-native host";

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub fn inference_probe() -> serde_json::Value {
    let threads = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    let simd = if cfg!(target_feature = "avx2") {
        "cpu-avx2"
    } else if cfg!(target_feature = "neon") {
        "cpu-neon"
    } else {
        "cpu-simd3"
    };
    serde_json::json!({
        "runtime": if cfg!(mobile) { "android" } else { "tauri" },
        "memoryBudgetBytes": 3 * 1024u64 * 1024 * 1024,
        "accelerations": [simd],
        "contextCeiling": 8192,
        "weightFormats": ["Q4_K_M", "Q6_K", "Q8_0"],
        "kvFormats": ["f16"],
        "threads": threads,
        "nativeInference": true,
        "notes": ["llama.cpp native provider — greedy sampling v1"],
    })
}

/// Load a model object from the CP.3 shared library. `path` arrives from
/// `model_lookup`'s locator — desktop-absolute, inside the org library.
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub async fn inference_load(path: String, context_tokens: Option<u32>, on_progress: tauri::ipc::Channel<String>) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || load_model(path, context_tokens, on_progress))
        .await.map_err(|error| error.to_string())?
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
fn load_model(path: String, context_tokens: Option<u32>, on_progress: tauri::ipc::Channel<String>) -> Result<String, String> {
    let report = |stage: &str, progress: Option<f32>| {
        let _ = on_progress.send(serde_json::json!({ "stage": stage, "progress": progress,
            "nativeTimeMs": std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_millis() }).to_string());
    };
    report("file.check", None);
    if !std::path::Path::new(&path).exists() {
        return Err(format!("model object not found: {path}"));
    }
    report("backend.init", None);
    let be = backend()?;
    report("model.load", Some(0.0));
    let progress_channel = on_progress.clone();
    let mut last_percent = -1i32;
    let params = LlamaModelParams::default().with_progress_callback(move |progress| {
        let percent = (progress * 100.0) as i32;
        if percent != last_percent {
            last_percent = percent;
            let _ = progress_channel.send(serde_json::json!({ "stage": "model.load", "progress": progress }).to_string());
        }
        true
    });
    let model = {
        let guard = be.lock().map_err(|_| "backend poisoned")?;
        LlamaModel::load_from_file(&guard, &path, &params)
            .map_err(|e| format!("model load failed: {e}"))?
    };
    report("session.create", Some(1.0));
    let n_ctx = context_tokens.unwrap_or(4096).min(8192).max(512);
    let id = format!(
        "native-{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis()
    );
    sessions()
        .lock()
        .map_err(|_| "sessions poisoned")?
        .get_or_insert_with(HashMap::new)
        .insert(id.clone(), NativeSession { model, n_ctx });
    CANCELS
        .lock()
        .map_err(|_| "cancels poisoned")?
        .get_or_insert_with(HashMap::new)
        .insert(id.clone(), Arc::new(AtomicBool::new(false)));
    report("session.ready", Some(1.0));
    Ok(id)
}

/// ChatML for ChatML-family models (Qwen/LFM2.5 catalog default); the
/// template stays config, never model-name detection.
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
fn chatml(messages: &[(String, String)]) -> String {
    let mut out = String::new();
    for (role, content) in messages {
        out.push_str(&format!("<|im_start|>{role}\n{content}<|im_end|>\n"));
    }
    out.push_str("<|im_start|>assistant\n");
    out
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub fn inference_generate(
    session_id: String,
    messages: Vec<(String, String)>,
    max_tokens: Option<u32>,
    on_token: tauri::ipc::Channel<String>,
) -> Result<(), String> {
    let cancel = CANCELS
        .lock()
        .map_err(|_| "cancels poisoned")?
        .as_ref()
        .and_then(|m| m.get(&session_id))
        .cloned()
        .ok_or("no such native session")?;
    cancel.store(false, Ordering::SeqCst);

    // Hold the session lock for the generation; cancel never takes this lock.
    let mut guard = sessions().lock().map_err(|_| "sessions poisoned")?;
    let map = guard.get_or_insert_with(HashMap::new);
    let session = map.get_mut(&session_id).ok_or("no such native session")?;
    let NativeSession { model, n_ctx } = session;
    let ctx_params = LlamaContextParams::default().with_n_ctx(NonZeroU32::new(*n_ctx));
    let mut ctx = {
        let be = backend()?;
        let backend = be.lock().map_err(|_| "backend poisoned")?;
        model
            .new_context(&backend, ctx_params)
            .map_err(|e| format!("context init failed: {e}"))?
    };

    let prompt = chatml(&messages);
    let tokens = model
        .str_to_token(&prompt, AddBos::Always)
        .map_err(|e| format!("tokenization failed: {e}"))?;
    if tokens.len() as u32 >= *n_ctx {
        return Err(format!("prompt of {} tokens exceeds context {n_ctx}", tokens.len()));
    }

    let max = max_tokens.unwrap_or(512).min(1024);
    let eos = model.token_eos();
    let mut batch = LlamaBatch::new(usize::try_from(*n_ctx).unwrap_or(2048), 0);

    let mut pos: i32 = 0;

    // Prefill: all prompt tokens in one batch, logits only on the last.
    // Recurrent hybrids (Qwen3.5's qwen35 SSM blocks, Mamba lineage) build
    // their state token-by-token — a batched prefill leaves logits
    // initialized only at [0], and the -1 read below panics the process
    // (non-unwinding inside spawn_blocking; observed on the v1.57 desktop
    // drive). Attention models keep the fast batched path.
    if model.is_recurrent() {
        for (i, token) in tokens.iter().enumerate() {
            let last = i + 1 == tokens.len();
            batch.clear();
            batch.add(*token, pos, &[0], last).map_err(|e| e.to_string())?;
            pos += 1;
            ctx.decode(&mut batch).map_err(|e| e.to_string())?;
        }
    } else {
        for (i, token) in tokens.iter().enumerate() {
            let last = i + 1 == tokens.len();
            batch.add(*token, pos, &[0], last).map_err(|e| e.to_string())?;
            pos += 1;
        }
        ctx.decode(&mut batch).map_err(|e| e.to_string())?;
    }

    let mut generated = 0u32;
    let mut next = tokens.last().copied();
    loop {
        if cancel.load(Ordering::SeqCst) {
            break;
        }
        if let Some(token) = next {
            if token == eos {
                break;
            }
            batch.clear();
            batch.add(token, pos, &[0], true).map_err(|e| e.to_string())?;
            pos += 1;
            ctx.decode(&mut batch).map_err(|e| e.to_string())?;
        }
        // Greedy argmax over the vocab logits at the last position.
        let logits = ctx.get_logits_ith(-1);
        let mut best = 0usize;
        for (i, v) in logits.iter().enumerate() {
            if *v > logits[best] {
                best = i;
            }
        }
        let token = LlamaToken(best as i32);
        if token == eos {
            break;
        }
        let piece = model.token_to_str(token, Special::Tokenize).unwrap_or_default();
        if !piece.is_empty() {
            on_token.send(piece).map_err(|e| e.to_string())?;
        }
        generated += 1;
        if generated >= max {
            break;
        }
        next = Some(token);
    }
    // Empty delta signals completion to the frontend reader.
    on_token.send(String::new()).map_err(|e| e.to_string())
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub fn inference_cancel(session_id: String) -> Result<(), String> {
    let guard = CANCELS.lock().map_err(|_| "cancels poisoned")?;
    if let Some(flag) = guard.as_ref().and_then(|m| m.get(&session_id)) {
        flag.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub fn inference_unload(session_id: String) -> Result<(), String> {
    sessions()
        .lock()
        .map_err(|_| "sessions poisoned")?
        .get_or_insert_with(HashMap::new)
        .remove(&session_id);
    CANCELS
        .lock()
        .map_err(|_| "cancels poisoned")?
        .get_or_insert_with(HashMap::new)
        .remove(&session_id);
    Ok(())
}

/// Prompt-only tokenization for context budgeting (ABI `tokenize`).
#[cfg(all(feature = "native-inference", not(target_os = "windows"), target_pointer_width = "64"))]
#[tauri::command]
pub fn inference_tokenize(session_id: String, text: String) -> Result<Vec<i32>, String> {
    let guard = sessions().lock().map_err(|_| "sessions poisoned")?;
    let map = guard.as_ref().ok_or("no sessions")?;
    let s = map.get(&session_id).ok_or("no such native session")?;
    let tokens = s
        .model
        .str_to_token(&text, AddBos::Never)
        .map_err(|e| e.to_string())?;
    Ok(tokens.into_iter().map(|LlamaToken(id)| id).collect())
}
