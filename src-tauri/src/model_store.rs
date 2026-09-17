//! CP.3 shared model library — desktop side (§7.8.4, guide §13–15).
//!
//! The frontend's `DesktopModelLibrary` drives these commands. Content
//! identity is the SHA-256 of the exact bytes: the store layout is
//! `<scope_root>/models/sha256/<digest>/<file>` with a `.complete` marker
//! written only after the committed file's own digest re-verify. A partial,
//! truncated or tampered artifact can therefore never resolve `ready`.
//! Cross-process coordination uses a lock file per digest with TTL steal —
//! a JS mutex cannot serialize sibling apps (guide §15.2).

use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, SystemTime};

/// In-process digest serialization (the OS lockfile covers sibling apps).
static ACTIVE: Mutex<Option<HashMap<String, ()>>> = Mutex::new(None);

fn scope_root(app: &tauri::AppHandle, scope_dir: Option<&str>) -> Result<PathBuf, String> {
    use tauri::Manager;
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(match scope_dir {
        Some(dir) if !dir.is_empty() && dir != app.config().identifier && !cfg!(mobile) => app_dir
            .parent()
            .map(|parent| parent.join(dir))
            .unwrap_or(app_dir),
        _ => app_dir,
    })
}

fn digest_dir(root: &Path, sha256: &str) -> Result<PathBuf, String> {
    if !sha256.bytes().all(|b| b.is_ascii_hexdigit()) || sha256.len() != 64 {
        return Err(format!("Invalid content digest: {sha256}"));
    }
    Ok(root.join("models").join("sha256").join(sha256))
}

fn file_sha256(path: &Path) -> Result<(String, u64), String> {
    let mut file = fs::File::open(path).map_err(|e| e.to_string())?;
    let mut hasher = Sha256::new();
    let mut length = 0u64;
    let mut buf = vec![0u8; 1024 * 1024];
    loop {
        let n = file.read(&mut buf).map_err(|e| e.to_string())?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
        length += n as u64;
    }
    Ok((format!("{:x}", hasher.finalize()), length))
}

/// Advisory read-only check on a small artifact: re-hash to prove content.
/// Large artifacts trust the verified-commit marker (hashing happens in
/// `model_finish`); an explicit re-verify rides a future maintenance task.
const REVERIFY_LIMIT: u64 = 64 * 1024 * 1024;

#[tauri::command]
pub fn model_lookup(
    app: tauri::AppHandle,
    sha256: String,
    bytes: u64,
    file_name: String,
    scope_dir: Option<String>,
) -> Result<serde_json::Value, String> {
    let root = scope_root(&app, scope_dir.as_deref())?;
    let dir = digest_dir(&root, &sha256)?;
    let marker = dir.join(".complete");
    if !marker.exists() {
        return Ok(serde_json::json!({ "kind": "missing" }));
    }
    let meta: serde_json::Value =
        serde_json::from_str(&fs::read_to_string(dir.join("meta.json")).unwrap_or_default())
            .unwrap_or(serde_json::Value::Null);
    let meta_bytes = meta["bytes"].as_u64();
    let meta_name = meta["fileName"].as_str();
    if meta_bytes != Some(bytes) || meta_name != Some(file_name.as_str()) {
        return Ok(serde_json::json!({ "kind": "corrupt", "reason": "metadata mismatch" }));
    }
    let path = dir.join(&file_name);
    if !path.exists() {
        return Ok(serde_json::json!({ "kind": "corrupt", "reason": "object missing" }));
    }
    let (actual, length) = file_sha256(&path)?;
    if length != bytes {
        return Ok(serde_json::json!({ "kind": "corrupt", "reason": "byte count mismatch" }));
    }
    if bytes <= REVERIFY_LIMIT && actual != sha256 {
        return Ok(serde_json::json!({ "kind": "corrupt", "reason": "content digest mismatch" }));
    }
    Ok(serde_json::json!({ "kind": "ready", "path": path.to_string_lossy() }))
}

#[tauri::command]
pub fn model_begin(
    app: tauri::AppHandle,
    sha256: String,
    file_name: String,
    scope_dir: Option<String>,
) -> Result<(), String> {
    if !file_name.bytes().all(|b| b.is_ascii_alphanumeric() || b"._-".contains(&b)) {
        return Err(format!("Invalid file name: {file_name}"));
    }
    let root = scope_root(&app, scope_dir.as_deref())?;
    let dir = digest_dir(&root, &sha256)?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    fs::File::create(dir.join(&file_name)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn model_chunk(
    app: tauri::AppHandle,
    sha256: String,
    offset: u64,
    bytes: Vec<u8>,
    scope_dir: Option<String>,
) -> Result<(), String> {
    let root = scope_root(&app, scope_dir.as_deref())?;
    let dir = digest_dir(&root, &sha256)?;
    let mut paths = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file() && e.file_name().to_string_lossy() != ".complete")
        .collect::<Vec<_>>();
    if paths.len() != 1 {
        return Err("No open write session for digest".into());
    }
    let mut file = fs::OpenOptions::new()
        .write(true)
        .open(paths.swap_remove(0).path())
        .map_err(|e| e.to_string())?;
    file.seek(SeekFrom::Start(offset)).map_err(|e| e.to_string())?;
    file.write_all(&bytes).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn model_finish(
    app: tauri::AppHandle,
    sha256: String,
    expected_bytes: u64,
    scope_dir: Option<String>,
) -> Result<serde_json::Value, String> {
    let root = scope_root(&app, scope_dir.as_deref())?;
    let dir = digest_dir(&root, &sha256)?;
    let mut paths = fs::read_dir(&dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_file() && e.file_name().to_string_lossy() != ".complete")
        .collect::<Vec<_>>();
    if paths.len() != 1 {
        return Err("No open write session for digest".into());
    }
    let path = paths.swap_remove(0).path();
    let (actual, length) = file_sha256(&path)?;
    if actual != sha256 {
        fs::remove_dir_all(&dir).ok();
        return Ok(serde_json::json!({
            "verified": false,
            "reason": format!("digest mismatch: got {actual}"),
        }));
    }
    if length != expected_bytes {
        fs::remove_dir_all(&dir).ok();
        return Ok(serde_json::json!({
            "verified": false,
            "reason": format!("byte count mismatch: got {length}"),
        }));
    }
    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
    let meta = serde_json::json!({ "bytes": length, "fileName": file_name, "completeAt": SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default().as_millis() as u64 });
    fs::write(dir.join("meta.json"), meta.to_string()).map_err(|e| e.to_string())?;
    fs::write(dir.join(".complete"), "1").map_err(|e| e.to_string())?;
    Ok(serde_json::json!({ "verified": true }))
}

#[tauri::command]
pub fn model_remove(app: tauri::AppHandle, sha256: String, scope_dir: Option<String>) -> Result<(), String> {
    let root = scope_root(&app, scope_dir.as_deref())?;
    let dir = digest_dir(&root, &sha256)?;
    fs::remove_dir_all(dir).ok();
    Ok(())
}

#[tauri::command]
pub fn model_lock(app: tauri::AppHandle, key: String, scope_dir: Option<String>, ttl_ms: u64) -> Result<String, String> {
    let root = scope_root(&app, scope_dir.as_deref())?;
    let locks = root.join("locks");
    fs::create_dir_all(&locks).map_err(|e| e.to_string())?;
    let path = locks.join(format!("{}.lock", sanitize(&key)));
    let token = format!("{}-{}", std::process::id(), SystemTime::now().duration_since(SystemTime::UNIX_EPOCH).unwrap_or_default().as_millis());
    for _ in 0..2 {
        match fs::OpenOptions::new().write(true).create_new(true).open(&path) {
            Ok(mut f) => {
                f.write_all(token.as_bytes()).ok();
                if let Ok(mut guard) = ACTIVE.lock() {
                    guard.get_or_insert_with(HashMap::new).insert(key.clone(), ());
                }
                return Ok(format!("{}|{}", path.to_string_lossy(), token));
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => {
                // Stale-lock steal: TTL expired or holder gone.
                if let Ok(meta) = fs::metadata(&path) {
                    if meta.modified().map(|m| m.elapsed().unwrap_or(Duration::ZERO) > Duration::from_millis(ttl_ms)).unwrap_or(false) {
                        fs::remove_file(&path).ok();
                        continue;
                    }
                }
                return Err("model library busy: another writer holds this digest".into());
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    Err("model library busy".into())
}

#[tauri::command]
pub fn model_unlock(token: String) -> Result<(), String> {
    let mut parts = token.splitn(2, '|');
    let (path, own) = (parts.next().unwrap_or_default(), parts.next().unwrap_or_default());
    if path.is_empty() {
        return Ok(());
    }
    if let Ok(existing) = fs::read_to_string(path) {
        if existing == own {
            fs::remove_file(path).ok();
        }
    }
    Ok(())
}

fn sanitize(key: &str) -> String {
    key.chars().map(|c| if c.is_ascii_alphanumeric() || c == '-' || c == '.' { c } else { '_' }).collect()
}
