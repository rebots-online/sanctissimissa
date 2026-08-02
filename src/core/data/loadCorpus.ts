/**
 * Corpus bytes loader — the ONLY platform-divergent code in the data path.
 * Web fetches the static asset; Tauri asks Rust for the embedded copy.
 * Both feed the identical sql.js CorpusDb (collinear debug/production rule).
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function loadCorpusBytes(): Promise<Uint8Array> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    const bytes = await invoke<ArrayBuffer>('load_corpus');
    return new Uint8Array(bytes);
  }
  const res = await fetch('/missal.db');
  if (!res.ok) throw new Error(`missal.db fetch failed: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
