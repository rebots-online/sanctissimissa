// Play on-demand asset pack for the paid Catena Aurea module (§L.9 R3, decision 18/19;
// DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.5). Assets at src/main/assets/modules/
// are copied by modules-stage (gitignored). see DOCS/sdk/play-asset-delivery/integrate-java.md §Build for Kotlin and Java
plugins {
    id("com.android.asset-pack")
}

assetPack {
    packName.set("module_catena_aurea_en")
    dynamicDelivery {
        deliveryType.set("on-demand")
    }
}
