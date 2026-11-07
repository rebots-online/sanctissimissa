// SemanticEmbedder / Reranker — L-native-embed-engine §2.1, §2.2, F5 (BA.13), plus the
// consumed contract `getEmbedder`/`getReranker`/`EmbedState` of
// L-content-modules-search-20261106.md §2.11 (owned here).
// Engines (native or wllama) are opaque IInferenceEngine handles; this module only
// applies the §2.2 transforms (prefix, caps, Matryoshka/L2/int8) and the readiness gate.
import type { TauriInvoke } from '../../../reusable-chatbot/core/capability-broker.ts';
import type { IInferenceEngine, SessionId } from '../../../reusable-chatbot/core/engine-types.ts';

import { MAX_RERANK_DOC_CHARS, MAX_RERANK_QUERY_CHARS, capText, formatQuery, toStoredVector } from './embedFormat.ts';
import { boundEmbedPair, readEmbedState, subscribeEmbedState, type ModelState } from './embedState.ts';

export type { EmbedRole } from './assets.ts';
export type { ModelState } from './embedState.ts';

export type EmbedRuntime = 'native' | 'wllama'; // Closed set, Phase L

export interface SemanticEmbedder {
  readonly runtime: EmbedRuntime;
  embedQuery(text: string): Promise<Int8Array>;
  embedDocs(texts: readonly string[]): Promise<Int8Array[]>;
}
export interface RerankHit { key: string; text: string }
export interface RerankedHit { key: string; score: number }
export interface Reranker {
  readonly runtime: EmbedRuntime;
  /** Score descending, key-ascending ties. */
  rerank(query: string, hits: readonly RerankHit[]): Promise<RerankedHit[]>;
}
export class EmbedNotReadyError extends Error { name = 'EmbedNotReadyError'; }

/**
 * The only runtime selector (§2.1): no invoke (web/PWA) → wllama; else the shell's
 * `embed_probe` decides. Any rejection (BA.12 not compiled/landed) → wllama.
 */
export async function resolveEmbedRuntime(invoke?: TauriInvoke): Promise<EmbedRuntime> {
  if (!invoke) return 'wllama';
  try {
    const probe = (await invoke('embed_probe')) as { nativeEmbed?: unknown } | null;
    return probe?.nativeEmbed === true ? 'native' : 'wllama';
  } catch {
    return 'wllama';
  }
}

export interface EmbedEngines {
  embed: IInferenceEngine;
  rerank: IInferenceEngine;
  embedSession: SessionId;
  rerankSession: SessionId | null;
}

interface PairSlot { engines: EmbedEngines | null; pair: { embedder: SemanticEmbedder; reranker: Reranker } }
const slots = new Map<EmbedRuntime, PairSlot>();

function ready(role: 'embed' | 'rerank'): boolean {
  return readEmbedState()[role] === 'ready';
}

/**
 * One app-lifetime pair per runtime. Passing `engines` (the preloader does) binds or
 * re-binds the engines behind the same pair (e.g. after `retry()`); calling with the
 * runtime alone returns the existing pair (BA.14's `active.ts` form).
 */
export function embedderFor(runtime: EmbedRuntime, engines?: EmbedEngines): { embedder: SemanticEmbedder; reranker: Reranker } {
  let slot = slots.get(runtime);
  if (!slot) {
    const holder: PairSlot = { engines: null, pair: null as unknown as PairSlot['pair'] };
    const need = (role: 'embed' | 'rerank'): EmbedEngines => {
      const bound = holder.engines;
      if (!bound || !ready(role) || (role === 'rerank' && bound.rerankSession === null)) {
        throw new EmbedNotReadyError(`${role} model not ready`);
      }
      return bound;
    };
    const embedder: SemanticEmbedder = {
      runtime,
      async embedQuery(text) {
        const e = need('embed');
        return toStoredVector((await e.embed.embed!(e.embedSession, [formatQuery(text)]))[0]);
      },
      async embedDocs(texts) {
        if (texts.length === 0) return [];
        const e = need('embed');
        const rows = await e.embed.embed!(e.embedSession, texts.map((t) => capText(t)));
        return rows.map(toStoredVector);
      },
    };
    const reranker: Reranker = {
      runtime,
      async rerank(query, hits) {
        if (hits.length === 0) return [];
        const e = need('rerank');
        const q = capText(query, MAX_RERANK_QUERY_CHARS);
        const scores = await e.rerank.batchScore(e.rerankSession!, {
          items: hits.map((h) => ({ context: [{ role: 'user', content: q }], continuation: capText(h.text, MAX_RERANK_DOC_CHARS) })),
        });
        return hits
          .map((h, i) => ({ key: h.key, score: scores[i] ?? 0 }))
          .sort((a, b) => b.score - a.score || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      },
    };
    holder.pair = { embedder, reranker };
    slot = holder;
    slots.set(runtime, slot);
  }
  if (engines) slot.engines = engines;
  return slot.pair;
}

/* ---------------------------------------------------- consumed contract §2.11 */

export type EmbedState = 'absent' | 'downloading' | 'ready' | 'error';

function mapState(s: ModelState): EmbedState {
  switch (s) {
    case 'absent': case 'waiting-metered': return 'absent';
    case 'downloading': case 'verifying': case 'loading': return 'downloading';
    case 'ready': return 'ready';
    case 'error': return 'error';
  }
}

const notReady = (role: string) => new EmbedNotReadyError(`${role} model not ready`);

const embedFacade = {
  state(): EmbedState { return mapState(readEmbedState().embed); },
  onState(l: (s: EmbedState) => void): () => void {
    let last = mapState(readEmbedState().embed);
    return subscribeEmbedState((snap) => {
      const next = mapState(snap.embed);
      if (next !== last) { last = next; l(next); }
    });
  },
  async embedQuery(t: string): Promise<Int8Array> {
    const pair = boundEmbedPair();
    if (!pair) throw notReady('embed');
    return pair.embedder.embedQuery(t);
  },
  async embedDocs(ts: readonly string[]): Promise<Int8Array[]> {
    const pair = boundEmbedPair();
    if (!pair) throw notReady('embed');
    return pair.embedder.embedDocs(ts);
  },
};

const rerankFacade = {
  state(): EmbedState { return mapState(readEmbedState().rerank); },
  /** Scores in INPUT order (keys are the indices, scattered back). */
  async rerank(query: string, docs: string[]): Promise<number[]> {
    const pair = boundEmbedPair();
    if (!pair) throw notReady('rerank');
    const ranked = await pair.reranker.rerank(query, docs.map((text, i) => ({ key: String(i), text })));
    const out = new Array<number>(docs.length).fill(0);
    for (const hit of ranked) out[Number(hit.key)] = hit.score;
    return out;
  },
};

export function getEmbedder(): typeof embedFacade { return embedFacade; }
export function getReranker(): typeof rerankFacade { return rerankFacade; }
