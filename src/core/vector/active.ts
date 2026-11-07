/**
 * The active on-device embedder / reranker (§L.4 D7; author resolution 3:
 * BA.14 codes against BA.13's actual exports through this one file). Before
 * BA.13 lands the only permitted `tsc` errors are TS2307 here.
 *
 * Any `EmbedNotReadyError` thrown downstream is treated as lexical mode by
 * the callers (see `isEmbedNotReady`).
 */

import { embedReadiness, subscribeEmbedReadiness, isEmbedReady, isRerankReady } from './preload.ts';
import { embedderFor, EmbedNotReadyError, type SemanticEmbedder, type Reranker } from './embedder.ts';

export type { SemanticEmbedder, Reranker };

export function activeEmbedder(): SemanticEmbedder | null {
  const r = embedReadiness();
  return r.runtime && isEmbedReady() ? embedderFor(r.runtime).embedder : null;
}

export function activeReranker(): Reranker | null {
  const r = embedReadiness();
  return r.runtime && isRerankReady() ? embedderFor(r.runtime).reranker : null;
}

export function onEmbedState(l: () => void): () => void {
  return subscribeEmbedReadiness(l);
}

/** True for BA.13's not-ready rejection — callers fall back to lexical mode. */
export function isEmbedNotReady(e: unknown): boolean {
  return e instanceof EmbedNotReadyError || (e instanceof Error && e.name === 'EmbedNotReadyError');
}
