//! Android Play commerce bridge (§L.3; L-bookstore-commerce-20261106.md §2.7, §4.1).
//!
//! Five application commands forward to the Kotlin `CommercePlugin`
//! (RevenueCat purchases-android). They are app commands, so they need no
//! capability entry (`capabilities/default.json` stays `["core:default"]`);
//! the `commerce` plugin itself defines no commands and has no permission ids.
//! Every rejection is `"<CODE>: <message>"` with a `CommerceErrorCode`.
//! Desktop (Linux, Windows) and web never reach these: each command rejects
//! `NOT_CONFIGURED: commerce-android-only` there.

/// Managed state holding the registered Kotlin plugin handle (Android only).
#[cfg(target_os = "android")]
pub struct Commerce(pub tauri::plugin::PluginHandle<tauri::Wry>);

/// The `commerce` plugin: registers `mba.robin.sanctissimissa.CommercePlugin` on Android.
pub fn init() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    tauri::plugin::Builder::new("commerce")
        .setup(|app, api| {
            #[cfg(target_os = "android")]
            {
                use tauri::Manager;
                // see DOCS/sdk/tauri-plugins-ipc/plugin-template-mobile-rs.md
                let h = api.register_android_plugin("mba.robin.sanctissimissa", "CommercePlugin")?;
                app.manage(Commerce(h));
            }
            #[cfg(not(target_os = "android"))]
            {
                let _ = (app, api);
            }
            Ok(())
        })
        .build()
}

/// Run one Kotlin command on a blocking thread; map errors to `"<CODE>: <message>"`.
#[cfg(target_os = "android")]
async fn run(
    app: tauri::AppHandle,
    cmd: &'static str,
    payload: serde_json::Value,
) -> Result<serde_json::Value, String> {
    use tauri::plugin::mobile::PluginInvokeError;
    use tauri::Manager;
    let h = app
        .try_state::<Commerce>()
        .ok_or("CONFIGURATION: commerce plugin not registered")?
        .0
        .clone();
    // see DOCS/sdk/tauri-plugins-ipc/plugin-template-mobile-rs.md
    let joined = tauri::async_runtime::spawn_blocking(move || {
        h.run_mobile_plugin::<serde_json::Value>(cmd, payload)
    })
    .await
    .map_err(|e| format!("UNKNOWN: {e}"))?;
    joined.map_err(|err| match err {
        PluginInvokeError::InvokeRejected(e) => format!(
            "{}: {}",
            e.code.unwrap_or_else(|| "UNKNOWN".into()),
            e.message.unwrap_or_default()
        ),
        other => format!("UNKNOWN: {other}"),
    })
}

#[cfg(not(target_os = "android"))]
const ANDROID_ONLY: &str = "NOT_CONFIGURED: commerce-android-only";

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub async fn commerce_configure(
    app: tauri::AppHandle,
    api_key: String,
    app_user_id: String,
) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    return run(app, "configure", serde_json::json!({ "apiKey": api_key, "appUserId": app_user_id })).await;
    #[cfg(not(target_os = "android"))]
    Err(ANDROID_ONLY.into())
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub async fn commerce_offers(
    app: tauri::AppHandle,
    offering_id: String,
) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    return run(app, "offers", serde_json::json!({ "offeringId": offering_id })).await;
    #[cfg(not(target_os = "android"))]
    Err(ANDROID_ONLY.into())
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub async fn commerce_purchase(
    app: tauri::AppHandle,
    offering_id: String,
    package_id: String,
) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    return run(app, "purchase", serde_json::json!({ "offeringId": offering_id, "packageId": package_id })).await;
    #[cfg(not(target_os = "android"))]
    Err(ANDROID_ONLY.into())
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub async fn commerce_restore(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    return run(app, "restore", serde_json::json!({})).await;
    #[cfg(not(target_os = "android"))]
    Err(ANDROID_ONLY.into())
}

#[tauri::command]
#[cfg_attr(not(target_os = "android"), allow(unused_variables))]
pub async fn commerce_customer_info(app: tauri::AppHandle) -> Result<serde_json::Value, String> {
    #[cfg(target_os = "android")]
    return run(app, "customerInfo", serde_json::json!({})).await;
    #[cfg(not(target_os = "android"))]
    Err(ANDROID_ONLY.into())
}
