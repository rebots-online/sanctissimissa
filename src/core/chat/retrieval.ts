/**
 * Sacristan retrieval (BA.15; §L.4 D9; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.11, §3.6).
 * Every Sacristan turn is grounded in the Mass, the Office, Scripture, Haydock
 * and the owned modules: the question's top-5 similar passages (vector in
 * semantic mode, FTS in lexical mode) plus up to 5 graph neighbours of the
 * first hit. Only owned/attached content is ever in the queried corpus, so an
 * unentitled profile never yields a `catena-aurea-en` item.
 */

import { debugEvent } from '../diagnostics/store.ts';
import { graphNeighbours, searchMode, similarToText, type CorpusQuery } from '../vector/search.ts';

/** Closed set, Phase L. */
export type SacristanSource = 'missal' | 'office' | 'bible' | 'haydock' | 'catena-aurea-en';

export interface SacristanContextItem {
  key: string;
  title: string;
  /** english ?? latin, ≤ 600 chars. */
  text: string;
  source: SacristanSource;
  via: 'vector' | 'lexical' | 'graph';
  score: number;
}

export type { CorpusQuery };

const TEXT_LIMIT = 600;
const SIMILAR_K = 5;
const GRAPH_K = 10;
const GRAPH_KEEP = 5;

/** The source of a corpus key; null keys are skipped. */
export function sacristanSource(key: string): SacristanSource | null {
  if (key.startsWith('section:Horas/')) return 'office';
  if (key.startsWith('section:')) return 'missal';
  if (key.startsWith('verse:')) return 'bible';
  if (key.startsWith('commentary:haydock/')) return 'haydock';
  if (key.startsWith('commentary:catena-aurea/') || key.startsWith('catena:') || key.startsWith('father:')) return 'catena-aurea-en';
  return null;
}

function blockText(db: CorpusQuery, key: string): string {
  const row = db.sqlRows(
    'SELECT tb.latin, tb.english FROM text_blocks tb JOIN nodes n ON n.id = tb.node_id WHERE n.key = ?',
    [key],
  )[0];
  if (!row) return '';
  const english = typeof row.english === 'string' ? row.english : null;
  const latin = typeof row.latin === 'string' ? row.latin : null;
  return (english ?? latin ?? '').slice(0, TEXT_LIMIT);
}

/** §3.6: top-5 similar passages + up to 5 graph neighbours of the first hit. */
export async function sacristanContext(db: CorpusQuery, question: string): Promise<SacristanContextItem[]> {
  const mode = searchMode(db);
  const hits = await similarToText(db, question, SIMILAR_K);
  const items: SacristanContextItem[] = [];
  for (const hit of hits) {
    const source = sacristanSource(hit.key);
    if (!source) continue;
    items.push({
      key: hit.key,
      title: hit.title ?? hit.key,
      text: (hit.english ?? hit.latin ?? '').slice(0, TEXT_LIMIT),
      source,
      via: mode === 'semantic' ? 'vector' : 'lexical',
      score: hit.score,
    });
  }
  if (hits.length) {
    const listed = new Set(items.map((item) => item.key));
    const neighbours = graphNeighbours(db, hits[0].key, GRAPH_K)
      .filter((n: { key: string }) => !listed.has(n.key) && sacristanSource(n.key) !== null)
      .slice(0, GRAPH_KEEP);
    for (const n of neighbours) {
      items.push({
        key: n.key,
        title: n.title ?? n.key,
        text: blockText(db, n.key),
        source: sacristanSource(n.key) as SacristanSource,
        via: 'graph',
        score: n.weight,
      });
    }
  }
  debugEvent('sacristan', 'context', { mode, items: items.map(({ key, source, via }) => ({ key, source, via })) });
  return items;
}
