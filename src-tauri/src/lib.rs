//! SanctissiMissa — Tauri shell.
//!
//! The native side is deliberately minimal: it hands the embedded corpus
//! database to the frontend, where the SAME sql.js query layer used by the
//! web build runs (collinear debug/production rule — no divergent adapters).

/// The graph+vector corpus, baked into the binary at compile time.
/// `include_bytes!` keeps resource handling identical across desktop and
/// Android (no platform-specific resource path resolution).
static MISSAL_DB: &[u8] = include_bytes!("../../assets/missal.db");

#[tauri::command]
fn load_corpus() -> tauri::ipc::Response {
    tauri::ipc::Response::new(MISSAL_DB.to_vec())
}

/// Resolve the sidecar storage directory for the org storage namespace
/// (decision 22, `DOCS/STORAGE-NAMESPACE.md`). The caller's `scope_dir`
/// names the root — `mba.robin` (org-common) or the app namespace. Desktop
/// joins it as a sibling of the app data dir; mobile is sandboxed and always
/// stays app-private.
fn sidecar_scope_dir(
    app: &tauri::AppHandle,
    scope_dir: Option<&str>,
) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(match scope_dir {
        Some(dir) if !dir.is_empty() && dir != app.config().identifier && !cfg!(mobile) => {
            app_dir
                .parent()
                .map(|parent| parent.join(dir))
                .unwrap_or(app_dir)
        }
        _ => app_dir,
    })
}

/// Sidecar bytes for the frontend's sql.js SidecarDb; `None` if none saved
/// yet. Reads the namespaced root first, then falls back to the legacy
/// pre-namespace path directly in the app data dir.
#[tauri::command]
fn load_sidecar(app: tauri::AppHandle, scope_dir: Option<String>) -> Option<Vec<u8>> {
    let scoped = sidecar_scope_dir(&app, scope_dir.as_deref())
        .ok()?
        .join("sidecar.db");
    match std::fs::read(scoped) {
        Ok(bytes) => Some(bytes),
        Err(_) => {
            let legacy = sidecar_scope_dir(&app, None).ok()?.join("sidecar.db");
            std::fs::read(legacy).ok()
        }
    }
}

/// Persist the exported sidecar bytes under the resolved storage root
/// (created if absent).
#[tauri::command]
fn save_sidecar(
    app: tauri::AppHandle,
    bytes: Vec<u8>,
    scope_dir: Option<String>,
) -> Result<(), String> {
    let dir = sidecar_scope_dir(&app, scope_dir.as_deref())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(dir.join("sidecar.db"), bytes).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_corpus, load_sidecar, save_sidecar])
        .run(tauri::generate_context!())
        .expect("error while running SanctissiMissa");
}
