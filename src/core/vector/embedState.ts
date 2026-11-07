// Embedding readiness store — L-native-embed-engine §2.1/F4 (BA.13). Exists to break
// the preload.ts ⇄ embedder.ts import cycle: both read/write here, neither imports
// the other's runtime code. Snapshots are immutable (useSyncExternalStore-safe).
import { debugEvent } from '../diagnostics/store.ts';

import type { EmbedRuntime, Reranker, SemanticEmbedder } from './embedder.ts';

export type ModelState = 'absent' | 'waiting-metered' | 'downloading' | 'verifying' | 'loading' | 'ready' | 'error'; // Closed set, Phase L

export interface EmbedSnapshot {
  runtime: EmbedRuntime | null;
  embed: ModelState;
  rerank: ModelState;
  progress: number;
  reason?: string;
}

export interface EmbedPair { embedder: SemanticEmbedder; reranker: Reranker }

let snapshot: Readonly<EmbedSnapshot> = Object.freeze({ runtime: null, embed: 'absent', rerank: 'absent', progress: 0 });
let pair: EmbedPair | null = null;
const listeners = new Set<(s: Readonly<EmbedSnapshot>) => void>();

export function readEmbedState(): Readonly<EmbedSnapshot> {
  return snapshot;
}

export function writeEmbedState(patch: Partial<EmbedSnapshot>): void {
  const next = { ...snapshot, ...patch };
  if (next.runtime === snapshot.runtime && next.embed === snapshot.embed && next.rerank === snapshot.rerank
    && next.progress === snapshot.progress && next.reason === snapshot.reason) return;
  snapshot = Object.freeze(next);
  debugEvent('embed', 'state', snapshot);
  for (const cb of listeners) {
    try { cb(snapshot); } catch { /* a listener cannot break the preloader */ }
  }
}

export function subscribeEmbedState(cb: (s: Readonly<EmbedSnapshot>) => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

export function bindEmbedPair(next: EmbedPair): void {
  pair = next;
}

export function boundEmbedPair(): EmbedPair | null {
  return pair;
}
