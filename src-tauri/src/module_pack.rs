//! Play on-demand module pack bridge (§L.9 R3, decision 18/19;
//! DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.5, §3.3 step 3).
//!
//! Android Play builds deliver the paid Catena module as the on-demand asset
//! pack `module_catena_aurea_en`; the Kotlin `ModulePackPlugin` fetches it and
//! answers the pack's assets path. Every other platform (and sideload APKs,
//! where Play delivery is unavailable) answers an error and the frontend falls
//! back to the module host.
//!
//! see DOCS/sdk/tauri-plugins-ipc/plugin-template-mobile-rs.md (register_android_plugin / run_mobile_plugin)
//! see DOCS/sdk/tauri-plugins-ipc/calling-rust.md §Returning Array Buffers (tauri::ipc::Response)

use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Runtime,
};

#[cfg(target_os = "android")]
use tauri::Manager;

#[cfg(target_os = "android")]
struct ModulePackHandle<R: Runtime>(tauri::plugin::PluginHandle<R>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("module-pack")
        .setup(|_app, _api| {
            #[cfg(target_os = "android")]
            {
                let handle =
                    _api.register_android_plugin("mba.robin.sanctissimissa", "ModulePackPlugin")?;
                _app.manage(ModulePackHandle(handle));
            }
            Ok(())
        })
        .build()
}

/// `^[a-z0-9-]+-r\d+\.db$`, hand-written (no regex crate).
fn valid_file(file: &str) -> bool {
    let Some(stem) = file.strip_suffix(".db") else {
        return false;
    };
    let Some(idx) = stem.rfind("-r") else {
        return false;
    };
    let (name, rev) = (&stem[..idx], &stem[idx + 2..]);
    !name.is_empty()
        && name
            .bytes()
            .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-')
        && !rev.is_empty()
        && rev.bytes().all(|b| b.is_ascii_digit())
}

/// `^module_[a-z0-9_]+$`, hand-written.
fn valid_pack(pack: &str) -> bool {
    match pack.strip_prefix("module_") {
        Some(rest) => {
            !rest.is_empty()
                && rest
                    .bytes()
                    .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'_')
        }
        None => false,
    }
}

#[tauri::command]
pub async fn module_pack_fetch(
    app: AppHandle,
    pack: String,
    file: String,
) -> Result<tauri::ipc::Response, String> {
    if !valid_file(&file) || !valid_pack(&pack) {
        return Err("invalid-argument".into());
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app;
        Err("unsupported-platform".into())
    }
    #[cfg(target_os = "android")]
    {
        let handle = app
            .try_state::<ModulePackHandle<tauri::Wry>>()
            .ok_or_else(|| "unsupported-platform".to_string())?
            .0
            .clone();
        // The Kotlin side may wait on a Play download; keep it off the async workers.
        let located: serde_json::Value = tauri::async_runtime::spawn_blocking(move || {
            handle.run_mobile_plugin::<serde_json::Value>("fetch", serde_json::json!({ "pack": pack }))
        })
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())?;
        let path = located
            .get("path")
            .and_then(|p| p.as_str())
            .ok_or_else(|| "failed".to_string())?;
        let full = std::path::Path::new(path).join("modules").join(&file);
        let bytes = std::fs::read(full).map_err(|e| e.to_string())?;
        Ok(tauri::ipc::Response::new(bytes))
    }
}
