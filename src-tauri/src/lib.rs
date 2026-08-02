//! St. Android's Missal — Tauri shell.
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

/// Persisted sidecar database path: `<app_data_dir>/sidecar.db`.
fn sidecar_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    use tauri::Manager;
    app.path()
        .app_data_dir()
        .map(|dir| dir.join("sidecar.db"))
        .map_err(|e| e.to_string())
}

/// Sidecar bytes for the frontend's sql.js SidecarDb; `None` if none saved yet.
#[tauri::command]
fn load_sidecar(app: tauri::AppHandle) -> Option<Vec<u8>> {
    let path = sidecar_path(&app).ok()?;
    std::fs::read(path).ok()
}

/// Persist the exported sidecar bytes to the app data dir (created if absent).
#[tauri::command]
fn save_sidecar(app: tauri::AppHandle, bytes: Vec<u8>) -> Result<(), String> {
    let path = sidecar_path(&app)?;
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![load_corpus, load_sidecar, save_sidecar])
        .run(tauri::generate_context!())
        .expect("error while running St. Android's Missal");
}
