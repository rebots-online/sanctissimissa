/**
 * Semantic search stack (§L.4 D3–D7, decision 20; L-content-modules-search-20261106.md
 * §2.11, §3.4). Every function takes a `CorpusQuery` (CorpusDb satisfies it) so
 * base corpus and attached modules are searched together.
 *
 * Mode: `'semantic'` iff an embedder is ready AND the corpus `embed_meta` is
 * compatible with `RUNTIME_EMBED_META`; otherwise `'lexical'` (FTS +
 * SIMILAR_TO). Before the models are ready every surface still answers (D7).
 * Query/document asymmetry (instruction prefix on queries only): see
 * DOCS/sdk/qwen3-embedding/model-card.md §Usage; rerank scores:
 * DOCS/sdk/qwen3-reranker/model-card.md §Usage.
 */

import { cosine, normalizeText } from './embed.ts';
import { bestClauses, clauseVectors } from './clause.ts';
import { compatible, readEmbedMeta, RUNTIME_EMBED_META } from './meta.ts';
import { activeEmbedder, activeReranker, isEmbedNotReady } from './active.ts';
import type {
  ConceptHit,
  InterpretiveNucleus,
  NucleatedSimilarityGroup,
  NucleatedSimilarityHit,
  NucleatedSimilaritySet,
  SimilarHit,
} from '../data/types.ts';

export interface CorpusQuery {
  sqlRows(sql: string, params?: unknown[]): Record<string, unknown>[];
  vectorRows(): { key: string; section: string; vec: Int8Array }[];
}

export type SearchMode = 'semantic' | 'lexical';
export type GraphRel = 'SIMILAR_TO' | 'ATTRIBUTED_TO' | 'CITES' | 'COMMENTS_ON';
export interface GraphNeighbour {
  key: string;
  title: string | null;
  rel: GraphRel;
  weight: number;
  direction: 'out' | 'in';
}

/** Hits the reranker reorders (§3.4). */
const RERANK_TOP = 20;

const metaCompat = new WeakMap<CorpusQuery, boolean>();

function safeRows(q: CorpusQuery, sql: string, params: unknown[] = []): Record<string, unknown>[] | null {
  try {
    return q.sqlRows(sql, params);
  } catch {
    return null;
  }
}

function toInt8(raw: unknown): Int8Array {
  const b = raw as Uint8Array;
  return new Int8Array(b.buffer, b.byteOffset, b.byteLength);
}

/** Corpus `embed_meta` compatibility, memoized per query handle. */
function corpusCompatible(q: CorpusQuery): boolean {
  const known = metaCompat.get(q);
  if (known !== undefined) return known;
  const rows = safeRows(q, 'SELECT key, value FROM embed_meta');
  const ok = rows !== null && compatible(readEmbedMeta(rows as { key: unknown; value: unknown }[]), RUNTIME_EMBED_META);
  metaCompat.set(q, ok);
  return ok;
}

export function searchMode(q: CorpusQuery): SearchMode {
  return activeEmbedder() !== null && corpusCompatible(q) ? 'semantic' : 'lexical';
}

/** The embedder only when the mode is semantic. */
function semanticEmbedder(q: CorpusQuery) {
  return searchMode(q) === 'semantic' ? activeEmbedder() : null;
}

/** title/latin/english for a key — exactly the former corpusDb.ts:775-788 lookup. */
function hitFor(q: CorpusQuery, key: string, section: string, score: number): SimilarHit {
  const tb = q.sqlRows(
    `SELECT tb.latin, tb.english, n.title FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?`,
    [key],
  )[0];
  return {
    key,
    section,
    title: (tb?.title as string) ?? null,
    score,
    latin: (tb?.latin as string) ?? null,
    english: (tb?.english as string) ?? null,
  };
}

/** Lexical (D7): SIMILAR_TO edges of `excludeKey`, else FTS over normalized words. */
function lexicalSimilar(q: CorpusQuery, text: string, k: number, excludeKey?: string): SimilarHit[] {
  if (k <= 0) return [];
  if (excludeKey) {
    const edges = safeRows(
      q,
      `SELECT d.key, d.title, e.weight FROM edges e
       JOIN nodes s ON s.id = e.src JOIN nodes d ON d.id = e.dst
       WHERE e.rel = 'SIMILAR_TO' AND s.key = ? ORDER BY e.weight DESC, d.key ASC LIMIT ?`,
      [excludeKey, k],
    );
    if (edges && edges.length > 0) {
      return edges.map((r) => hitFor(q, String(r.key), String(r.title ?? ''), Number(r.weight ?? 0)));
    }
  }
  const words: string[] = [];
  for (const w of normalizeText(text).split(' ')) {
    if (w.length >= 4 && !words.includes(w)) words.push(w);
    if (words.length === 12) break;
  }
  if (words.length === 0) return [];
  const match = words.map((w) => `"${w}"`).join(' OR ');
  const rows = safeRows(q, 'SELECT key, section FROM search WHERE search MATCH ? ORDER BY rank LIMIT ?', [
    match,
    k + (excludeKey ? 1 : 0),
  ]);
  if (!rows) return [];
  return rows
    .filter((r) => String(r.key) !== excludeKey)
    .slice(0, k)
    .map((r, i) => hitFor(q, String(r.key), String(r.section ?? ''), (k - i) / k));
}

/** Vector-similar passages for free text (§3.4). */
export async function similarToText(q: CorpusQuery, text: string, k: number, excludeKey?: string): Promise<SimilarHit[]> {
  const embedder = semanticEmbedder(q);
  if (embedder && k > 0) {
    try {
      const qv: Int8Array = await embedder.embedQuery(text);
      const top = q
        .vectorRows()
        .filter((v) => v.key !== excludeKey)
        .map((v) => ({ key: v.key, section: v.section, score: cosine(qv, v.vec) }))
        .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
        .slice(0, Math.max(k, RERANK_TOP))
        .map((s) => hitFor(q, s.key, s.section, s.score));
      const reranker = activeReranker();
      if (reranker && top.length > 0) {
        const head = top.slice(0, RERANK_TOP);
        try {
          const ranked: { key: string; score: number }[] = await reranker.rerank(
            text,
            head.map((h) => ({ key: h.key, text: h.english ?? h.latin ?? '' })),
          );
          const byKey = new Map(head.map((h) => [h.key, h]));
          const reordered: SimilarHit[] = [];
          for (const r of ranked) {
            const h = byKey.get(r.key);
            if (!h) continue;
            byKey.delete(r.key);
            reordered.push({ ...h, rerank: r.score });
          }
          reordered.push(...byKey.values());
          return [...reordered, ...top.slice(RERANK_TOP)].slice(0, k);
        } catch (e) {
          if (!isEmbedNotReady(e)) throw e;
        }
      }
      return top.slice(0, k);
    } catch (e) {
      if (!isEmbedNotReady(e)) throw e;
    }
  }
  return lexicalSimilar(q, text, k, excludeKey);
}

/** `['haydock', ...module_attach.nucleus_source]` (absent table → `['haydock']`). */
export function nucleusSources(q: CorpusQuery): string[] {
  const rows = safeRows(q, 'SELECT nucleus_source FROM module_attach') ?? [];
  const out = ['haydock'];
  for (const r of rows) {
    const s = String(r.nucleus_source ?? '');
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

/**
 * Short, query-matching clauses from authoritative interpretive sources
 * (former corpusDb.ts:471-542). Lexical → `[]`.
 */
export async function interpretiveNucleiForText(
  q: CorpusQuery,
  text: string,
  opts: { k?: number; sources?: string[] } = {},
): Promise<InterpretiveNucleus[]> {
  const k = Math.max(0, opts.k ?? 5);
  const sources = new Set(opts.sources ?? nucleusSources(q));
  if (!text.trim() || k === 0 || sources.size === 0) return [];
  const embedder = semanticEmbedder(q);
  if (!embedder) return [];
  let queryVec: Int8Array;
  try {
    queryVec = await embedder.embedQuery(text);
  } catch (e) {
    if (isEmbedNotReady(e)) return [];
    throw e;
  }
  const coarse = q
    .sqlRows(
      `SELECT n.id, n.key, n.title, tb.english, e.vec
       FROM nodes n
       JOIN text_blocks tb ON tb.node_id = n.id
       JOIN embeddings e ON e.node_id = n.id
       WHERE n.kind = 'commentary' AND tb.english IS NOT NULL AND e.dim = 256`,
    )
    .map((row) => {
      const key = String(row.key);
      const source = key.match(/^commentary:([^/]+)\//)?.[1] ?? '';
      if (!sources.has(source)) return null;
      return {
        id: Number(row.id),
        key,
        title: (row.title as string) ?? key,
        english: String(row.english ?? ''),
        source,
        score: cosine(queryVec, toInt8(row.vec)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.score - a.score || a.key.localeCompare(b.key))
    .slice(0, Math.max(k * 4, k));

  const clauses = await bestClauses(coarse.map((row) => row.english), text);
  return coarse
    .flatMap((row, i): InterpretiveNucleus[] => {
      const clause = clauses[i];
      if (!clause || clause.text.length >= row.english.length) return [];
      const anchors = q
        .sqlRows(
          `SELECT DISTINCT v.key
           FROM edges e JOIN nodes v ON v.id = e.dst
           WHERE e.rel = 'COMMENTS_ON' AND e.src = ?
           ORDER BY v.key`,
          [row.id],
        )
        .map((anchor) => String(anchor.key));
      const concepts = q
        .sqlRows(
          `SELECT DISTINCT c.key, c.title
           FROM edges comments
           JOIN edges instances ON instances.src = comments.dst AND instances.rel = 'INSTANCE_OF'
           JOIN nodes c ON c.id = instances.dst
           WHERE comments.rel = 'COMMENTS_ON' AND comments.src = ? AND c.kind = 'concept'
           ORDER BY c.key`,
          [row.id],
        )
        .map((concept) => ({
          conceptId: String(concept.key).replace(/^concept:/, ''),
          label: (concept.title as string) ?? String(concept.key).replace(/^concept:/, ''),
        }));
      return [{
        key: row.key,
        title: row.title,
        clause: clause.text,
        queryScore: clause.score,
        anchors,
        concepts,
        source: row.source,
        authorityKind: 'scriptural-commentary',
      }];
    })
    .sort((a, b) => b.queryScore - a.queryScore || a.key.localeCompare(b.key))
    .slice(0, k);
}

/** Copy of CorpusDb.conceptsForSectionKey's SQL (corpusDb.ts:895), labels only. */
function primaryConcept(q: CorpusQuery, key: string): { conceptId: string; label: string } | null {
  const rows = q.sqlRows(
    `SELECT n2.key conceptKey, n2.title label, n2.meta
     FROM edges e
     JOIN nodes n1 ON n1.id = e.src
     JOIN nodes n2 ON n2.id = e.dst
     WHERE e.rel = 'INSTANCE_OF' AND n1.key = ?`,
    [key],
  );
  return (
    rows
      .map((r) => ({
        conceptId: String(r.conceptKey).replace(/^concept:/, ''),
        label: (r.label as string) ?? String(r.conceptKey),
      }))
      .sort((a, b) => a.conceptId.localeCompare(b.conceptId))[0] ?? null
  );
}

/**
 * Losslessly organise the vector horizon around interpretive nuclei — grouping,
 * completeness and `contextScore = 0.7·score + 0.3·affinity` identical to the
 * former corpusDb.ts:549-635. Affinity = cosine of cached clause vectors from
 * one `bestClauses` batch over every candidate and nucleus; lexical → 0.
 */
export async function nucleatedSimilarToText(
  q: CorpusQuery,
  text: string,
  opts: { candidateK?: number; nucleusK?: number; excludeKey?: string } = {},
): Promise<NucleatedSimilaritySet> {
  const candidateK = Math.max(0, opts.candidateK ?? 64);
  const nucleusK = Math.max(0, opts.nucleusK ?? 5);
  const [candidates, nuclei] = await Promise.all([
    similarToText(q, text, candidateK, opts.excludeKey),
    interpretiveNucleiForText(q, text, { k: nucleusK }),
  ]);
  const fulls = candidates.map((hit) => hit.english ?? hit.latin ?? '');
  const picked = await bestClauses([...fulls, ...nuclei.map((n) => n.clause)], text);
  const clauses = candidates.map((_, i) => picked[i]?.text ?? fulls[i]);
  if (nuclei.length > 0 && semanticEmbedder(q)) {
    try {
      await clauseVectors.fill([...clauses, ...nuclei.map((n) => n.clause)]);
    } catch (e) {
      if (!isEmbedNotReady(e)) throw e;
    }
  }
  const affinity = (a: string, b: string): number => {
    const va = clauseVectors.get(a);
    const vb = clauseVectors.get(b);
    return va && vb ? cosine(va, vb) : 0;
  };

  type DraftGroup = { key: string; nucleus: InterpretiveNucleus | null; label: string; hits: NucleatedSimilarityHit[] };
  const drafts = new Map<string, DraftGroup>();
  candidates.forEach((hit, i) => {
    const clause = clauses[i];
    let nucleus: InterpretiveNucleus | null = null;
    let nucleusKey: string | null = null;
    let nucleusAffinity = 0;
    let groupKey = 'related';
    let label = 'Related passages';
    if (nuclei.length > 0) {
      const ranked = nuclei
        .map((candidate) => ({ nucleus: candidate, affinity: affinity(clause, candidate.clause) }))
        .sort((a, b) => b.affinity - a.affinity || a.nucleus.key.localeCompare(b.nucleus.key));
      nucleus = ranked[0].nucleus;
      nucleusKey = nucleus.key;
      nucleusAffinity = ranked[0].affinity;
      groupKey = nucleus.key;
      label = nucleus.title;
    } else {
      const primary = primaryConcept(q, hit.key);
      if (primary) {
        nucleusKey = `concept:${primary.conceptId}`;
        groupKey = nucleusKey;
        label = primary.label;
      }
    }
    const atomic: NucleatedSimilarityHit = {
      hit,
      clause,
      nucleusKey,
      nucleusAffinity,
      contextScore: 0.7 * hit.score + 0.3 * nucleusAffinity,
    };
    const draft = drafts.get(groupKey) ?? { key: groupKey, nucleus, label, hits: [] };
    draft.hits.push(atomic);
    drafts.set(groupKey, draft);
  });

  const ordered = [...drafts.values()]
    .map((group) => ({
      ...group,
      hits: group.hits.sort((a, b) => b.contextScore - a.contextScore || a.hit.key.localeCompare(b.hit.key)),
    }))
    .sort(
      (a, b) =>
        (b.hits[0]?.contextScore ?? -Infinity) - (a.hits[0]?.contextScore ?? -Infinity) || a.key.localeCompare(b.key),
    );
  const representativeKeys = new Set<string>();
  const groups: NucleatedSimilarityGroup[] = ordered.slice(0, 5).map((group) => {
    const representatives = group.hits.slice(0, 3);
    representatives.forEach((hit) => representativeKeys.add(hit.hit.key));
    return { nucleus: group.nucleus, label: group.label, representatives };
  });
  const tail = ordered
    .flatMap((group) => group.hits)
    .filter((hit) => !representativeKeys.has(hit.hit.key))
    .sort((a, b) => b.contextScore - a.contextScore || a.hit.key.localeCompare(b.hit.key));
  return { candidateCount: candidates.length, groups, tail };
}

/** Concepts closest to the text: semantic → cosine to concept vectors (dim 256); lexical → `[]`. */
export async function conceptsForText(q: CorpusQuery, text: string, k: number): Promise<ConceptHit[]> {
  const embedder = semanticEmbedder(q);
  if (!embedder || k <= 0) return [];
  let qv: Int8Array;
  try {
    qv = await embedder.embedQuery(text);
  } catch (e) {
    if (isEmbedNotReady(e)) return [];
    throw e;
  }
  const scored = q
    .sqlRows(
      `SELECT n.id, n.key, n.title, n.meta, e.vec FROM nodes n
       JOIN embeddings e ON e.node_id = n.id WHERE n.kind = 'concept' AND e.dim = 256`,
    )
    .map((r) => ({ r, score: cosine(qv, toInt8(r.vec)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return scored.map(({ r, score }) => {
    let description = '';
    try {
      const meta = r.meta ? JSON.parse(String(r.meta)) : {};
      description = (meta.description as string) ?? '';
    } catch {
      description = '';
    }
    const conceptId = String(r.key).replace(/^concept:/, '');
    const count = q.sqlRows(`SELECT COUNT(*) c FROM edges WHERE rel = 'INSTANCE_OF' AND dst = ?`, [Number(r.id)])[0];
    return {
      conceptId,
      label: (r.title as string) ?? conceptId,
      description,
      score,
      sectionCount: Number(count?.c ?? 0),
    };
  });
}

const GRAPH_RELS: readonly GraphRel[] = ['SIMILAR_TO', 'ATTRIBUTED_TO', 'CITES', 'COMMENTS_ON'];
const GRAPH_IN_RELS: readonly GraphRel[] = ['COMMENTS_ON', 'CITES', 'ATTRIBUTED_TO'];

/** Graph neighbours of a node (both modes): out rels ∈ GraphRel + in COMMENTS_ON/CITES/ATTRIBUTED_TO. */
export function graphNeighbours(q: CorpusQuery, key: string, k: number): GraphNeighbour[] {
  const marks = (rels: readonly string[]) => rels.map(() => '?').join(',');
  const out = (safeRows(
    q,
    `SELECT d.key, d.title, e.rel, e.weight FROM edges e
     JOIN nodes s ON s.id = e.src JOIN nodes d ON d.id = e.dst
     WHERE s.key = ? AND e.rel IN (${marks(GRAPH_RELS)})`,
    [key, ...GRAPH_RELS],
  ) ?? []).map((r) => ({ r, direction: 'out' as const }));
  const inc = (safeRows(
    q,
    `SELECT s.key, s.title, e.rel, e.weight FROM edges e
     JOIN nodes s ON s.id = e.src JOIN nodes d ON d.id = e.dst
     WHERE d.key = ? AND e.rel IN (${marks(GRAPH_IN_RELS)})`,
    [key, ...GRAPH_IN_RELS],
  ) ?? []).map((r) => ({ r, direction: 'in' as const }));
  const best = new Map<string, GraphNeighbour>();
  for (const { r, direction } of [...out, ...inc]) {
    const nk = String(r.key);
    if (nk === key) continue;
    const n: GraphNeighbour = {
      key: nk,
      title: (r.title as string) ?? null,
      rel: String(r.rel) as GraphRel,
      weight: Number(r.weight ?? 0),
      direction,
    };
    const prev = best.get(nk);
    if (!prev || n.weight > prev.weight) best.set(nk, n);
  }
  return [...best.values()]
    .sort((a, b) => b.weight - a.weight || a.key.localeCompare(b.key))
    .slice(0, Math.max(0, k));
}
