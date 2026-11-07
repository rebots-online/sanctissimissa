/**
 * Embedding parity probe (§L.4 D6; L-content-modules-search-20261106.md §2.8).
 * Re-embeds the 40 ingest-time probe items on device and compares each with
 * its stored vector; `pass` iff every cosine ≥ 0.99 (rubric L.7-10). Queries
 * go through `embedQuery` (prefixed), docs through `embedDocs` (no prefix) —
 * DOCS/sdk/qwen3-embedding/model-card.md §Usage.
 */

import { isTauri } from '../data/loadCorpus.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { cosine } from './embed.ts';
import { compatible, readEmbedMeta, RUNTIME_EMBED_META } from './meta.ts';
import { activeEmbedder, onEmbedState } from './active.ts';

interface ProbeItem {
  id: string;
  role: 'doc' | 'query';
  key: string;
  text: string;
  vec: string;
}
interface ProbeFile {
  schema: number;
  embedMeta: Record<string, string>;
  items: ProbeItem[];
}

export interface ParityResult {
  platform: string;
  minCosine: number;
  items: { id: string; cosine: number }[];
  pass: boolean;
  reason?: 'probe-absent' | 'embed-meta-mismatch' | 'embedder-not-ready';
}

/** Vite glob: an empty record when BA.10's probe file has not been committed. */
const probes = import.meta.glob('../../../content/library/embed-probe.json', { eager: true, import: 'default' });

function platform(): string {
  if (!isTauri()) return 'web';
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent;
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  return 'linux';
}

function decode(b64: string): Int8Array {
  const bin = atob(b64);
  const out = new Int8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = (bin.charCodeAt(i) << 24) >> 24;
  return out;
}

export async function verifyEmbedParity(): Promise<ParityResult> {
  const p = platform();
  const fail = (reason: ParityResult['reason']): ParityResult => ({ platform: p, minCosine: 0, items: [], pass: false, reason });
  const probe = Object.values(probes)[0] as ProbeFile | undefined;
  if (!probe || !Array.isArray(probe.items)) return fail('probe-absent');
  const meta = readEmbedMeta(Object.entries(probe.embedMeta ?? {}).map(([key, value]) => ({ key, value })));
  if (!compatible(meta, RUNTIME_EMBED_META)) return fail('embed-meta-mismatch');
  const embedder = activeEmbedder();
  if (!embedder) return fail('embedder-not-ready');
  const docs = probe.items.filter((i) => i.role === 'doc');
  const queries = probe.items.filter((i) => i.role === 'query');
  const docVecs: Int8Array[] = await embedder.embedDocs(docs.map((d) => d.text));
  const queryVecs: Int8Array[] = [];
  for (const q of queries) queryVecs.push(await embedder.embedQuery(q.text));
  const items = [
    ...docs.map((d, i) => ({ id: d.id, cosine: docVecs[i] ? cosine(docVecs[i], decode(d.vec)) : 0 })),
    ...queries.map((q, i) => ({ id: q.id, cosine: cosine(queryVecs[i], decode(q.vec)) })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const minCosine = items.length ? Math.min(...items.map((i) => i.cosine)) : 0;
  return { platform: p, minCosine, items, pass: items.length > 0 && minCosine >= 0.99 };
}

/** Once per launch, on the first embedder `ready`, log `embed/parity` to Diagnostics. */
export function startParityProbe(): () => void {
  let started = false;
  const tryRun = () => {
    if (started || !activeEmbedder()) return;
    started = true;
    verifyEmbedParity().then(
      (result) => debugEvent('embed', 'parity', result, result.pass ? 'info' : 'warn'),
      (error: unknown) => debugEvent('embed', 'parity', { platform: platform(), pass: false, error: String(error) }, 'warn'),
    );
  };
  const off = onEmbedState(tryRun);
  tryRun();
  return off;
}
