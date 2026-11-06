<!--
SNAPSHOT  DOCS/sdk/tauri-plugins-ipc/plugin-template-ExamplePlugin-kt.md
source:   https://raw.githubusercontent.com/tauri-apps/tauri/dev/crates/tauri-cli/templates/plugin/android/src/main/java/ExamplePlugin.kt (dev @ 2e23492ab9bcec06bab041e0e47447aaa0da298c)
fetched:  2026-11-06 (curl, verbatim)
version:  Tauri 2.x docs (tauri-docs `v2` branch on 2026-11-06); repo pins tauri = "2"
license:  MIT/Apache-2.0

Everything below this header is the upstream text unchanged (unless the method says "summary").
Do not edit by hand: re-snapshot and bump DOCS/sdk/tauri-plugins-ipc/INDEX.md instead.
-->

# tauri plugin template — android ExamplePlugin.kt

```kotlin
package {{android_package_id}}

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
class PingArgs {
  var value: String? = null
}

@TauriPlugin
class ExamplePlugin(private val activity: Activity): Plugin(activity) {
    private val implementation = Example()

    @Command
    fun ping(invoke: Invoke) {
        val args = invoke.parseArgs(PingArgs::class.java)

        val ret = JSObject()
        ret.put("value", implementation.pong(args.value ?: "default value :("))
        invoke.resolve(ret)
    }
}

```
