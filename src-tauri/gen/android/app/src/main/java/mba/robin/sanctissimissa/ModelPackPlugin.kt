package mba.robin.sanctissimissa

// L-native-embed-engine F3: Play Asset Delivery bridge for the two on-demand GGUF packs.
// see DOCS/sdk/play-asset-delivery/integrate-java.md §Fast-follow and on-demand delivery
// see DOCS/sdk/tauri-plugins-ipc/plugin-template-ExamplePlugin-kt.md (plugin shape)
// see DOCS/sdk/tauri-plugins-ipc/develop-mobile.md (Kotlin @Command / Invoke)

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
import com.google.android.play.core.assetpacks.model.AssetPackErrorCode
import com.google.android.play.core.assetpacks.model.AssetPackStatus
import com.google.android.play.core.ktx.requestFetch
import com.google.android.play.core.ktx.requestPackStates
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

@InvokeArg
class PackArgs {
    lateinit var pack: String
}

@TauriPlugin
class ModelPackPlugin(private val activity: Activity) : Plugin(activity) {
    /** Pack name → the single GGUF it carries under assets/models/ (closed set, Phase L). */
    private val packFiles = mapOf(
        "embed_model_pack" to "Qwen3-Embedding-0.6B-Q8_0.gguf",
        "rerank_model_pack" to "qwen3-reranker-0.6b-q8_0.gguf",
    )

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    /** Null when Play services / Play Store are absent (sideload, AOSP) → 'unsupported'. */
    private val manager: AssetPackManager? by lazy {
        try {
            AssetPackManagerFactory.getInstance(activity.applicationContext)
        } catch (_: Throwable) {
            null
        }
    }

    private fun statusName(status: Int): String = when (status) {
        AssetPackStatus.COMPLETED -> "ready"
        AssetPackStatus.PENDING -> "pending"
        AssetPackStatus.DOWNLOADING -> "downloading"
        AssetPackStatus.TRANSFERRING -> "transferring"
        AssetPackStatus.WAITING_FOR_WIFI -> "waiting-wifi"
        AssetPackStatus.REQUIRES_USER_CONFIRMATION -> "requires-confirmation"
        AssetPackStatus.NOT_INSTALLED -> "not-installed"
        AssetPackStatus.FAILED -> "failed"
        AssetPackStatus.CANCELED -> "canceled"
        else -> "unknown"
    }

    private fun errorStatus(error: Throwable): String {
        if (error is AssetPackException) {
            return when (error.errorCode) {
                AssetPackErrorCode.API_NOT_AVAILABLE,
                AssetPackErrorCode.APP_UNAVAILABLE -> "unsupported"
                else -> "failed"
            }
        }
        return "failed"
    }

    private fun result(status: String): JSObject = JSObject().apply { put("status", status) }

    /** Parse + validate the pack argument; rejects and returns null on a pack outside the closed set. */
    private fun packOf(invoke: Invoke): String? {
        val pack = try {
            invoke.parseArgs(PackArgs::class.java).pack
        } catch (_: Throwable) {
            null
        }
        if (pack == null || !packFiles.containsKey(pack)) {
            invoke.reject("model-pack: unknown pack")
            return null
        }
        return pack
    }

    private fun stateJson(state: AssetPackState?): JSObject {
        val out = result(if (state == null) "unknown" else statusName(state.status()))
        out.put("bytesDownloaded", state?.bytesDownloaded() ?: 0L)
        out.put("totalBytes", state?.totalBytesToDownload() ?: 0L)
        return out
    }

    @Command
    fun location(invoke: Invoke) {
        val pack = packOf(invoke) ?: return
        val mgr = manager ?: return invoke.resolve(result("unsupported"))
        try {
            // Never cache locations across launches (integrate-java.md §Check status).
            val loc = mgr.getPackLocation(pack)
            if (loc?.assetsPath() != null) {
                val out = result("ready")
                out.put("path", loc.assetsPath() + "/models/" + packFiles.getValue(pack))
                return invoke.resolve(out)
            }
        } catch (error: Throwable) {
            return invoke.resolve(result(errorStatus(error)))
        }
        scope.launch {
            try {
                val states = mgr.requestPackStates(listOf(pack))
                val status = states.packStates()[pack]?.let { statusName(it.status()) } ?: "unknown"
                // COMPLETED without a location means the pack is not usable yet.
                invoke.resolve(result(if (status == "ready") "unknown" else status))
            } catch (error: Throwable) {
                invoke.resolve(result(errorStatus(error)))
            }
        }
    }

    @Command
    fun fetch(invoke: Invoke) {
        val pack = packOf(invoke) ?: return
        val mgr = manager ?: return invoke.resolve(result("unsupported"))
        scope.launch {
            try {
                val states = mgr.requestFetch(listOf(pack))
                val status = states.packStates()[pack]?.let { statusName(it.status()) } ?: "unknown"
                invoke.resolve(result(status))
            } catch (error: Throwable) {
                invoke.resolve(result(errorStatus(error)))
            }
        }
    }

    @Command
    fun state(invoke: Invoke) {
        val pack = packOf(invoke) ?: return
        val mgr = manager ?: return invoke.resolve(stateJson(null).apply { put("status", "unsupported") })
        scope.launch {
            try {
                val states = mgr.requestPackStates(listOf(pack))
                invoke.resolve(stateJson(states.packStates()[pack]))
            } catch (error: Throwable) {
                invoke.resolve(stateJson(null).apply { put("status", errorStatus(error)) })
            }
        }
    }

    /** Cellular consent for > 200 MB packs (integrate-java.md §Monitor download states). */
    @Command
    fun confirmCellular(invoke: Invoke) {
        packOf(invoke) ?: return
        val mgr = manager ?: return invoke.resolve(result("unsupported"))
        try {
            @Suppress("DEPRECATION")
            mgr.showConfirmationDialog(activity)
                .addOnSuccessListener { code ->
                    // RESULT_OK: the user accepted mobile data, the download resumes.
                    invoke.resolve(result(if (code == Activity.RESULT_OK) "pending" else "waiting-wifi"))
                }
                .addOnFailureListener { error -> invoke.resolve(result(errorStatus(error))) }
        } catch (error: Throwable) {
            invoke.resolve(result(errorStatus(error)))
        }
    }
}
