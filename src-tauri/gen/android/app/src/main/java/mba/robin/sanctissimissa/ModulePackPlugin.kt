package mba.robin.sanctissimissa

// Play on-demand module pack fetch (§L.9 R3, decision 18/19;
// DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.5, §3.3 step 3).
// Rust `module_pack_fetch` calls `fetch {pack}` and reads `<path>/modules/<file>`.
// see DOCS/sdk/tauri-plugins-ipc/plugin-template-ExamplePlugin-kt.md (@TauriPlugin / @Command / @InvokeArg)
// see DOCS/sdk/play-asset-delivery/integrate-java.md §Fast-follow and on-demand delivery

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import com.google.android.play.core.assetpacks.AssetPackException
import com.google.android.play.core.assetpacks.AssetPackManager
import com.google.android.play.core.assetpacks.AssetPackManagerFactory
import com.google.android.play.core.assetpacks.AssetPackState
import com.google.android.play.core.assetpacks.AssetPackStateUpdateListener
import com.google.android.play.core.assetpacks.model.AssetPackStatus

@InvokeArg
class ModulePackArgs {
    lateinit var pack: String
}

@TauriPlugin
class ModulePackPlugin(private val activity: Activity) : Plugin(activity) {

    @Command
    fun fetch(invoke: Invoke) {
        val args = invoke.parseArgs(ModulePackArgs::class.java)
        val pack = args.pack
        if (!pack.startsWith("module_")) {
            invoke.reject("invalid-argument")
            return
        }
        val m: AssetPackManager = try {
            AssetPackManagerFactory.getInstance(activity)
        } catch (e: Exception) {
            invoke.reject("unsupported")
            return
        }
        // see DOCS/sdk/play-asset-delivery/integrate-java.md §Check status — never cache locations between launches.
        val ready = try {
            m.getPackLocation(pack)
        } catch (e: Exception) {
            invoke.reject("unsupported")
            return
        }
        if (ready != null) {
            // assetsPath() is null for STORAGE_METHOD_APK packs; module packs are asset-storage, so null is a failure.
            val readyPath = ready.assetsPath()
            if (readyPath != null) resolvePath(invoke, readyPath) else invoke.reject("failed")
            return
        }

        var settled = false
        var confirmationShown = false
        lateinit var listener: AssetPackStateUpdateListener
        fun settle(block: () -> Unit) {
            if (settled) return
            settled = true
            m.unregisterListener(listener) // always unregister
            block()
        }
        // see DOCS/sdk/play-asset-delivery/integrate-java.md §Monitor download states (all AssetPackStatus values)
        listener = AssetPackStateUpdateListener { state: AssetPackState ->
            if (state.name() != pack) return@AssetPackStateUpdateListener
            when (state.status()) {
                AssetPackStatus.COMPLETED -> settle {
                    val loc = m.getPackLocation(pack)
                    loc?.assetsPath()?.let { resolvePath(invoke, it) } ?: invoke.reject("failed")
                }
                AssetPackStatus.REQUIRES_USER_CONFIRMATION, AssetPackStatus.WAITING_FOR_WIFI -> {
                    // see DOCS/sdk/play-asset-delivery/integrate-java.md §Monitor download states (Large downloads)
                    if (!confirmationShown) {
                        confirmationShown = true
                        @Suppress("DEPRECATION")
                        m.showConfirmationDialog(activity)
                    }
                }
                AssetPackStatus.FAILED, AssetPackStatus.CANCELED, AssetPackStatus.NOT_INSTALLED ->
                    settle { invoke.reject("failed") }
                else -> Unit
            }
        }
        m.registerListener(listener)
        // see DOCS/sdk/play-asset-delivery/integrate-java.md §Install (fetch)
        m.fetch(listOf(pack)).addOnFailureListener { e ->
            settle {
                // API_NOT_AVAILABLE / APP_UNAVAILABLE / pack unavailable on sideload
                if (e is AssetPackException) invoke.reject("unsupported") else invoke.reject("failed")
            }
        }
    }

    private fun resolvePath(invoke: Invoke, path: String) {
        val ret = JSObject()
        ret.put("path", path)
        invoke.resolve(ret)
    }
}
