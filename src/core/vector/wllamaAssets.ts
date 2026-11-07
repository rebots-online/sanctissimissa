// wllama runtime assets — BA.13 architect reconciliation: the wasm/js are runtime
// assets (VENDORED/models/sha256/<d>/<fileName>, mirrored under /runtime/), acquired
// into OPFS by the preloader, never bundled into public/ or dist-web/.
// Pins equal VENDORED/models/manifest.json rows (mirror-model-assets.mjs --check).
// see DOCS/sdk/wllama-3.8.1/wllama.d.ts.md (WllamaCompat, AssetsPathConfig)
import type { ModelAsset } from '../model-store/types.ts';

export type WllamaAssetId = 'wllama-3.8.1-wasm' | 'wllama-compat-3.8.1-wasm' | 'wllama-compat-3.8.1-js'; // Closed set, Phase L

export const WLLAMA_ASSETS: Readonly<Record<WllamaAssetId, { asset: ModelAsset; mirrorUrl: string }>> = {
  'wllama-3.8.1-wasm': {
    asset: { sha256: '551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c', bytes: 8763949, fileName: 'wllama.wasm' },
    mirrorUrl: 'https://sanctissimissa.robin.mba/runtime/models/sha256/551f13439366eff11e057b1b91fe46a7fdac29d56d67372d4c5f19a549dfe70c/wllama.wasm',
  },
  'wllama-compat-3.8.1-wasm': {
    asset: { sha256: '2db3f67d0bcc19cdf8f14f129e46cab691bff898954808f8a2dc4c586eb5bb68', bytes: 16005007, fileName: 'wllama.wasm' },
    mirrorUrl: 'https://sanctissimissa.robin.mba/runtime/models/sha256/2db3f67d0bcc19cdf8f14f129e46cab691bff898954808f8a2dc4c586eb5bb68/wllama.wasm',
  },
  'wllama-compat-3.8.1-js': {
    asset: { sha256: '2649eeb408988841c372e54805adfa25aed5d02f850c09add78c2f3ac0f3fce1', bytes: 171615, fileName: 'wllama.js' },
    mirrorUrl: 'https://sanctissimissa.robin.mba/runtime/models/sha256/2649eeb408988841c372e54805adfa25aed5d02f850c09add78c2f3ac0f3fce1/wllama.js',
  },
};
