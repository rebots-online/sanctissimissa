// Runtime asset pins — L-native-embed-engine §2.4; equal to VENDORED/models/manifest.json (mirror-model-assets.mjs --check).
import type { ModelAsset } from '../model-store/types.ts';
export type EmbedRole = 'embed' | 'rerank';                                         // Closed set, Phase L
export type EmbedAssetId = 'qwen3-embedding-0.6b-q8_0' | 'qwen3-reranker-0.6b-q8_0'; // Closed set, Phase L
export type AndroidModelPack = 'embed_model_pack' | 'rerank_model_pack';           // Closed set, Phase L
export interface EmbedAssetPin { role: EmbedRole; asset: ModelAsset; mirrorUrl: string; androidPack: AndroidModelPack }
export const EMBED_MODEL_ASSETS: Readonly<Record<EmbedAssetId, EmbedAssetPin>> = {
  'qwen3-embedding-0.6b-q8_0': { role: 'embed', asset: { sha256: '06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439', bytes: 639150592, fileName: 'Qwen3-Embedding-0.6B-Q8_0.gguf' }, mirrorUrl: 'https://sanctissimissa.robin.mba/runtime/models/sha256/06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439/Qwen3-Embedding-0.6B-Q8_0.gguf', androidPack: 'embed_model_pack' },
  'qwen3-reranker-0.6b-q8_0': { role: 'rerank', asset: { sha256: '22c9979ce4fbcdc5acdc310c6641c32797eff1aa980b8f7a2db8a8ea23429a48', bytes: 639153184, fileName: 'qwen3-reranker-0.6b-q8_0.gguf' }, mirrorUrl: 'https://sanctissimissa.robin.mba/runtime/models/sha256/22c9979ce4fbcdc5acdc310c6641c32797eff1aa980b8f7a2db8a8ea23429a48/qwen3-reranker-0.6b-q8_0.gguf', androidPack: 'rerank_model_pack' },
};
