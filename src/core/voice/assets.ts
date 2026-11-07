// Supertonic voice asset rows (§K.4 TT.2, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md
// S8). Voice bytes are fetched sha256-pinned from the R3 runtime host (or a Play asset pack) — never
// from a CDN, never from a same-origin `/voice/` path. The upstream URL is provenance only.
// The block between the markers is generated from `VENDORED/models/manifest.json` (kind
// 'supertonic') by `node scripts/voice-assets.mjs --sync`; edit the manifest, never the block.
// Until OP.6 has vendored the voice it is empty and the runtime reports voice `error` (BA.7).

export interface VoiceAssetRow { id: string; fileName: string; sha256: string; sizeBytes: number; mirrorUrl: string }

// <voice-assets:generated>
export const VOICE_ASSETS: readonly VoiceAssetRow[] = [];
// </voice-assets:generated>

/** First 16 hex chars of sha256 over the sorted row hashes; changes whenever any voice file changes (S4). */
export async function voiceKey(rows: readonly VoiceAssetRow[] = VOICE_ASSETS): Promise<string> {
  const joined = rows.map((row) => row.sha256).sort().join('\n');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(joined));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** Total voice download, rounded to the nearest 10 MB, for `English voice not downloaded (≈… MB)`. */
export function voiceDownloadMB(rows: readonly VoiceAssetRow[] = VOICE_ASSETS): number {
  const bytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  return Math.round(bytes / 1048576 / 10) * 10;
}
