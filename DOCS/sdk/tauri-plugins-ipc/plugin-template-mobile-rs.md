<!--
SNAPSHOT  DOCS/sdk/tauri-plugins-ipc/plugin-template-mobile-rs.md
source:   https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/templates/plugin/src/mobile.rs (dev @ 2e23492ab9bcec06bab041e0e47447aaa0da298c)
fetched:  2026-11-06 (curl, verbatim)
version:  Tauri 2.x docs (tauri-docs `v2` branch on 2026-11-06); repo pins tauri = "2"
license:  MIT/Apache-2.0

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/tauri-plugins-ipc/INDEX.md instead.
-->

# tauri plugin template — src/mobile.rs (handlebars template)

```rust
{{#if license_header}}
{{ license_header }}
{{/if}}
use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_{{ plugin_name_snake_case }});

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<{{ plugin_name_pascal_case }}<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("{{ android_package_id }}", "ExamplePlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_{{ plugin_name_snake_case }})?;
  Ok({{ plugin_name_pascal_case }}(handle))
}

/// Access to the {{ plugin_name }} APIs.
pub struct {{ plugin_name_pascal_case }}<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> {{ plugin_name_pascal_case }}<R> {
  pub fn ping(&self, payload: PingRequest) -> crate::Result<PingResponse> {
    self
      .0
      .run_mobile_plugin("ping", payload)
      .map_err(Into::into)
  }
}

```
