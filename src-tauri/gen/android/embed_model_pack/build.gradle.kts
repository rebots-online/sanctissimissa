// Play Asset Delivery on-demand pack for Qwen3-Embedding-0.6B-Q8_0.gguf (L-native-embed-engine F3).
// Assets are staged into src/main/assets/models/ by scripts/stage-model-packs.mjs (gitignored).
// see DOCS/sdk/play-asset-delivery/integrate-java.md §Build for Kotlin and Java
plugins {
    id("com.android.asset-pack")
}

assetPack {
    packName.set("embed_model_pack")
    dynamicDelivery {
        deliveryType.set("on-demand")
    }
}
