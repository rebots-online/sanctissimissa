/**
 * Clause segmentation + best-clause selection for similarity UX.
 *
 * A "clause" is a stretch of text ending at a clause boundary (`.` `:` `;` `·`,
 * delimiter kept with the preceding clause). Fragments shorter than
 * MIN_CLAUSE_LENGTH characters are merged into a neighbour so downstream
 * embedding comparisons operate on meaningful units. Offsets are exact:
 * `text.slice(clause.start, clause.end) === clause.text` always holds.
 *
 * Deterministic, single linear character scan — no regex backtracking risk
 * on long corpus text.
 */

import { cosine, normalizeText } from './embed.ts';

/** Lazy so `splitClauses` stays importable from Node ingest scripts (BA.10). */
const loadActive = () => import('./active.ts');

export interface Clause {
  text: string;
  start: number;
  end: number;
}

const MIN_CLAUSE_LENGTH = 25;

function isDelimiter(ch: string): boolean {
  return ch === '.' || ch === ':' || ch === ';' || ch === '·';
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === '\u00a0';
}

/** Trimmed clause over [rawStart, rawEnd); null when whitespace-only. */
function makeClause(text: string, rawStart: number, rawEnd: number): Clause | null {
  let start = rawStart;
  let end = rawEnd;
  while (start < end && isWhitespace(text[start])) start++;
  while (end > start && isWhitespace(text[end - 1])) end--;
  if (start >= end) return null;
  return { text: text.slice(start, end), start, end };
}

/**
 * Split text into clauses on `.` `:` `;` `·` (delimiter stays with the
 * preceding clause), trim each, and merge fragments shorter than
 * MIN_CLAUSE_LENGTH chars into their neighbour (previous when one exists,
 * otherwise next). Start/end are exact offsets into the original string.
 */
export function splitClauses(text: string): Clause[] {
  const clauses: Clause[] = [];
  let segStart = 0;
  for (let i = 0; i < text.length; i++) {
    if (isDelimiter(text[i])) {
      const c = makeClause(text, segStart, i + 1);
      if (c) clauses.push(c);
      segStart = i + 1;
    }
  }
  const tail = makeClause(text, segStart, text.length);
  if (tail) clauses.push(tail);

  // Merge short fragments into a neighbour until stable (or one clause left).
  let changed = true;
  while (changed && clauses.length > 1) {
    changed = false;
    for (let i = 0; i < clauses.length; i++) {
      if (clauses[i].text.length >= MIN_CLAUSE_LENGTH) continue;
      const j = i > 0 ? i - 1 : i + 1;
      const start = Math.min(clauses[i].start, clauses[j].start);
      const end = Math.max(clauses[i].end, clauses[j].end);
      const merged: Clause = { text: text.slice(start, end), start, end };
      clauses.splice(Math.min(i, j), 2, merged);
      changed = true;
      break;
    }
  }
  return clauses;
}

/** Max clause vectors kept (L-content-modules-search §3.4). */
const CLAUSE_CACHE_SIZE = 8192;

/**
 * LRU of clause vectors keyed by `normalizeText(clause)`. Missing clauses are
 * filled by ONE `embedDocs` call per query (`fill`). Qwen3 documents carry no
 * instruction prefix — see DOCS/sdk/qwen3-embedding/model-card.md §Usage.
 */
export class ClauseVectorCache {
  private map = new Map<string, Int8Array>();
  private readonly max: number;

  constructor(max = CLAUSE_CACHE_SIZE) {
    this.max = max;
  }

  get(clause: string): Int8Array | null {
    const key = normalizeText(clause);
    const v = this.map.get(key);
    if (!v) return null;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }

  private put(key: string, v: Int8Array): void {
    this.map.delete(key);
    this.map.set(key, v);
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }

  /** Embed every not-yet-cached clause in one `embedDocs` call. */
  async fill(clauses: readonly string[]): Promise<void> {
    const embedder = (await loadActive()).activeEmbedder();
    if (!embedder) return;
    const missing = new Map<string, string>();
    for (const c of clauses) {
      const key = normalizeText(c);
      if (!this.map.has(key) && !missing.has(key)) missing.set(key, c);
    }
    if (missing.size === 0) return;
    const keys = [...missing.keys()];
    const vecs = await embedder.embedDocs([...missing.values()]);
    keys.forEach((k, i) => {
      if (vecs[i]) this.put(k, vecs[i]);
    });
  }
}

/** The app-lifetime clause cache shared by every search surface. */
export const clauseVectors = new ClauseVectorCache();

type Scored = Clause & { score: number };

/** Lexical pick: most shared normalized words with the query (ties: first), score 0. */
function lexicalBest(clauses: Clause[], query: string): Scored | null {
  if (clauses.length === 0) return null;
  const q = new Set(normalizeText(query).split(' ').filter(Boolean));
  let best = clauses[0];
  let bestShared = -1;
  for (const c of clauses) {
    const words = new Set(normalizeText(c.text).split(' ').filter(Boolean));
    let shared = 0;
    for (const w of words) if (q.has(w)) shared++;
    if (shared > bestShared) {
      best = c;
      bestShared = shared;
    }
  }
  return { ...best, score: 0 };
}

/**
 * Best clause of each text for one query. Semantic: the query vector from
 * `embedQuery`, clause vectors from `clauseVectors` (one `embedDocs` batch for
 * every missing clause of every text), cosine argmax with the first clause
 * winning ties. No active embedder (or not ready) → the lexical pick.
 */
export async function bestClauses(texts: string[], query: string): Promise<(Scored | null)[]> {
  const split = texts.map((t) => splitClauses(t));
  const { activeEmbedder, isEmbedNotReady } = await loadActive();
  const embedder = activeEmbedder();
  if (embedder) {
    try {
      const all = split.flat().map((c) => c.text);
      const [queryVec] = await Promise.all([embedder.embedQuery(query), clauseVectors.fill(all)]);
      return split.map((clauses) => {
        let best: Scored | null = null;
        for (const c of clauses) {
          const v = clauseVectors.get(c.text);
          const score = v ? cosine(queryVec, v) : 0;
          if (!best || score > best.score) best = { ...c, score };
        }
        return best;
      });
    } catch (e) {
      if (!isEmbedNotReady(e)) throw e;
    }
  }
  return split.map((clauses) => lexicalBest(clauses, query));
}

/** The clause of `text` most similar in meaning to `query` (see `bestClauses`). */
export async function bestClause(text: string, query: string): Promise<Scored | null> {
  return (await bestClauses([text], query))[0];
}
