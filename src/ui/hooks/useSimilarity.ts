/**
 * UI await wiring for the async search stack (L-content-modules-search-20261106.md
 * §3.4). Each hook re-runs when the embedder state changes (`onEmbedState`)
 * and ignores stale results; while pending the UI renders PENDING_TEXT.
 */

import { useEffect, useState } from 'react';
import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { ConceptHit, NucleatedSimilaritySet } from '../../core/data/types.ts';
import { bestClause, type Clause } from '../../core/vector/clause.ts';
import { onEmbedState } from '../../core/vector/active.ts';
import { searchMode, type SearchMode } from '../../core/vector/search.ts';

/** Exact pending copy (§3.4). */
export const PENDING_TEXT = 'Ranking by meaning…';

type Status = 'pending' | 'ready';

/** Run `compute` now and on every embed-state change; keep only the latest result. */
function useAsyncSearch<T>(compute: (() => Promise<T>) | null, deps: unknown[]): { status: Status; value: T | null } {
  const [state, setState] = useState<{ status: Status; value: T | null }>({ status: 'pending', value: null });
  useEffect(() => {
    if (!compute) {
      setState({ status: 'ready', value: null });
      return;
    }
    let generation = 0;
    const run = () => {
      const mine = ++generation;
      setState((prev) => ({ status: 'pending', value: prev.value }));
      compute().then(
        (value) => { if (mine === generation) setState({ status: 'ready', value }); },
        (error: unknown) => {
          console.warn('[search]', error);
          if (mine === generation) setState({ status: 'ready', value: null });
        },
      );
    };
    run();
    const off = onEmbedState(run);
    return () => {
      generation = -1;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps are the caller's inputs
  }, deps);
  return state;
}

export function useNucleatedSimilarity(
  db: CorpusDb | null,
  term: string,
  opts: { candidateK?: number; nucleusK?: number; excludeKey?: string },
): { status: Status; mode: SearchMode; set: NucleatedSimilaritySet | null } {
  const { candidateK, nucleusK, excludeKey } = opts;
  const r = useAsyncSearch(
    db && term.trim()
      ? async () => ({ mode: searchMode(db), set: await db.nucleatedSimilarToText(term, { candidateK, nucleusK, excludeKey }) })
      : null,
    [db, term, candidateK, nucleusK, excludeKey],
  );
  return { status: r.status, mode: r.value?.mode ?? (db ? searchMode(db) : 'lexical'), set: r.value?.set ?? null };
}

export function useConceptsForText(
  db: CorpusDb | null,
  term: string,
  k: number,
): { status: Status; mode: SearchMode; concepts: ConceptHit[] } {
  const r = useAsyncSearch(
    db && term.trim() ? async () => ({ mode: searchMode(db), concepts: await db.conceptsForText(term, k) }) : null,
    [db, term, k],
  );
  return { status: r.status, mode: r.value?.mode ?? (db ? searchMode(db) : 'lexical'), concepts: r.value?.concepts ?? [] };
}

export function useBestClause(text: string, query: string): { status: Status; clause: (Clause & { score: number }) | null } {
  const r = useAsyncSearch(text ? () => bestClause(text, query) : null, [text, query]);
  return { status: r.status, clause: r.value };
}
