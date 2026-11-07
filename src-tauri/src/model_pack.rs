//! L-native-embed-engine F3: Play Asset Delivery bridge for the on-demand GGUF
//! packs (`embed_model_pack`, `rerank_model_pack`). The Kotlin side is
//! `gen/android/app/src/main/java/mba/robin/sanctissimissa/ModelPackPlugin.kt`;
//! off Android every command answers `{"status":"unsupported"}` and the caller
//! falls back to the pinned `mirror_url` (DownloadManager).
//!
//! see DOCS/sdk/tauri-plugins-ipc/plugin-template-mobile-rs.md (register_android_plugin / run_mobile_plugin)
//! see DOCS/sdk/tauri-plugins-ipc/plugin-development.md (plugin Builder + setup)
//! see DOCS/sdk/play-asset-delivery/integrate-java.md §Fast-follow and on-demand delivery
//!
//! The pack commands are app commands (in `generate_handler!`), so no ACL entry
//! is needed: `build.rs` is plain `tauri_build::build()` and
//! `capabilities/default.json` is unchanged.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::Runtime;

/// Handle to the registered Kotlin `ModelPackPlugin` (Android only).
#[cfg(target_os = "android")]
pub struct ModelPack<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("model-pack")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                let handle = api.register_android_plugin("mba.robin.sanctissimissa", "ModelPackPlugin")?;
                app.manage(ModelPack(handle));
            }
            #[cfg(not(target_os = "android"))]
            let _ = (app, api);
            Ok(())
        })
        .build()
}

/// Forward one pack command to Kotlin; off Android → `{"status":"unsupported"}`.
#[cfg(target_os = "android")]
fn run(app: &tauri::AppHandle, method: &str, pack: String) -> Result<serde_json::Value, String> {
    use tauri::Manager;
    let plugin = app
        .try_state::<ModelPack<tauri::Wry>>()
        .ok_or("model-pack: plugin not registered")?;
    plugin
        .0
        .run_mobile_plugin::<serde_json::Value>(method, serde_json::json!({ "pack": pack }))
        .map_err(|e| e.to_string())
}

#[cfg(not(target_os = "android"))]
fn run(_app: &tauri::AppHandle, _method: &str, _pack: String) -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({ "status": "unsupported" }))
}

/// `{status, path?}` — `path` = `<assetsPath>/models/<fileName>` once the pack is ready.
#[tauri::command]
pub async fn model_pack_location(app: tauri::AppHandle, pack: String) -> Result<serde_json::Value, String> {
    run(&app, "location", pack)
}

/// Starts (or resumes) the Play download → `{status}`.
#[tauri::command]
pub async fn model_pack_fetch(app: tauri::AppHandle, pack: String) -> Result<serde_json::Value, String> {
    run(&app, "fetch", pack)
}

/// `{status, bytesDownloaded, totalBytes}`.
#[tauri::command]
pub async fn model_pack_state(app: tauri::AppHandle, pack: String) -> Result<serde_json::Value, String> {
    run(&app, "state", pack)
}

/// Shows Play's mobile-data consent dialog (packs > 200 MB on cellular) → `{status}`.
#[tauri::command]
pub async fn model_pack_confirm_cellular(app: tauri::AppHandle, pack: String) -> Result<serde_json::Value, String> {
    run(&app, "confirmCellular", pack)
}
