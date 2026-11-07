/**
 * ConnectionsPanel card builder (moved out of JournalSidecar.tsx for the async
 * search stack; L-content-modules-search-20261106.md §3.4/§3.5). Every card is
 * a corpus row, a sidecar row or UI chrome; the bridge lines name only corpus
 * facts (concept grouping, source, COMMENTS_ON edge).
 */

import type { ReactNode } from 'react';
import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { SidecarDb } from '../../core/accompaniment/store.ts';
import type { SimilarHit } from '../../core/data/types.ts';
import { bestClause } from '../../core/vector/clause.ts';
import { sidecarRawHandle, sidecarSimilar } from '../../core/accompaniment/sidecarVectors.ts';

export interface ConnectionCard {
  id: string; // dismissal key
  heading: string;
  body: ReactNode;
  chips: string[];
  bridge: string;
  openKey: string | null;
  addKey: string;
  sourceHtml: string;
  tier?: 'further';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Cited blockquote payload for "Add as source" → editor `insertContent`. */
function blockquoteHtml(excerpt: string, citation: string): string {
  return `<blockquote><p>${escapeHtml(excerpt)}</p><p>— ${escapeHtml(citation)}</p></blockquote>`;
}

/** Human source title for a corpus similar-hit (verse ref or section — title). */
function corpusSourceTitle(hit: SimilarHit): string {
  const v = hit.key.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) return `${v[1]} ${v[2]}:${v[3]}`;
  const s = hit.key.match(/^section:([^#]+)#(.+)$/);
  if (s) return hit.title ? `${s[2]} — ${hit.title}` : `${s[2]} — ${s[1]}`;
  return hit.title ?? hit.key;
}

export async function buildConnectionCards(args: {
  db: CorpusDb;
  sidecar: SidecarDb;
  query: string;
  anchor: string | null;
  excludeId?: string | null;
}): Promise<ConnectionCard[]> {
  const { db, sidecar, query, anchor, excludeId } = args;
  if (!query) return [];
  const out: ConnectionCard[] = [];
  const further: ConnectionCard[] = [];

  // (a) Losslessly nucleated corpus vectors. High-context representatives
  // lead; the complete remainder is retained for the expandable tail.
  const set = await db.nucleatedSimilarToText(query, {
    candidateK: 64,
    nucleusK: 5,
    excludeKey: anchor ?? undefined,
  });
  const nuclei = new Map(
    set.groups
      .filter((group) => group.nucleus !== null)
      .map((group) => [group.nucleus!.key, group.nucleus!] as const),
  );
  for (const group of set.groups) {
    for (const item of group.representatives) {
      const sourceTitle = corpusSourceTitle(item.hit);
      out.push({
        id: `c:${item.hit.key}`,
        heading: sourceTitle,
        body: <><b className="clause-hit">{item.clause}</b></>,
        chips: [
          group.nucleus ? `${group.nucleus.source} · ${group.nucleus.authorityKind}` : `concept · ${group.label}`,
          'atomic corpus clause',
        ],
        bridge: `Bridge: corpus vector ${item.hit.score.toFixed(3)} → ${group.label} → context ${item.contextScore.toFixed(3)}`,
        openKey: item.hit.key,
        addKey: item.hit.key,
        sourceHtml: blockquoteHtml(item.clause, sourceTitle),
      });
    }
  }
  for (const item of set.tail) {
    const sourceTitle = corpusSourceTitle(item.hit);
    const nucleus = item.nucleusKey ? nuclei.get(item.nucleusKey) ?? null : null;
    further.push({
      id: `c:${item.hit.key}`,
      heading: sourceTitle,
      body: <><b className="clause-hit">{item.clause}</b></>,
      chips: [
        nucleus ? `${nucleus.source} · ${nucleus.authorityKind}` : 'stable concept grouping',
        'further association',
      ],
      bridge: `Bridge: corpus vector ${item.hit.score.toFixed(3)} → ${nucleus?.title ?? 'related passage'} → context ${item.contextScore.toFixed(3)}`,
      openKey: item.hit.key,
      addKey: item.hit.key,
      sourceHtml: blockquoteHtml(item.clause, sourceTitle),
      tier: 'further',
    });
  }

  // (c) Vendored commentary on the captured verse (CorpusDb.commentaryFor,
  // §7.7 interpretive layer).
  const v = anchor?.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) {
    const verseRef = `${v[1]} ${v[2]}:${v[3]}`;
    for (const cm of db.commentaryFor(v[1], Number(v[2]), Number(v[3])).slice(0, 2)) {
      const source = cm.sourcePath.replace(/^Commentary\//, '') || 'commentary';
      const full = cm.english ?? '';
      const excerpt = (await bestClause(full, query))?.text ?? full;
      if (!excerpt) continue;
      out.push({
        id: `m:${cm.nodeKey}`,
        heading: `${source} on ${verseRef}`,
        body: <><b className="clause-hit">{excerpt}</b></>,
        chips: [`vendored · ${source}`, 'COMMENTS_ON'],
        bridge: `Bridge: ${verseRef} → COMMENTS_ON edge → ${source} (vendored commentary)`,
        openKey: null,
        addKey: cm.nodeKey,
        sourceHtml: blockquoteHtml(excerpt, `${source} on ${verseRef}`),
      });
    }
  }

  // (b) The user's own past accompaniments (sidecar_embeddings, dim 256).
  const own = new Map(sidecar.list().map((a) => [a.id, a]));
  const handle = sidecarRawHandle(sidecar);
  let personal = 0;
  for (const hit of handle ? await sidecarSimilar(handle, query, 4) : []) {
    if (personal >= 2) break;
    const a = own.get(hit.id);
    if (!a || a.id === excludeId) continue;
    const label = a.title || a.createdAt.slice(0, 10);
    const excerpt = a.quote ?? stripHtml(a.bodyHtml).slice(0, 200);
    if (!excerpt) continue;
    personal++;
    out.push({
      id: `p:${a.id}`,
      heading: `Your journal · ${label}`,
      body: <>{excerpt}</>,
      chips: ['personal', 'sidecar vector'],
      bridge: `Bridge: selected passage → nearest of your own notes (vector similarity) → “${label}”`,
      openKey: a.anchors[0] ?? null,
      addKey: a.id,
      sourceHtml: blockquoteHtml(excerpt, `Your journal, ${a.createdAt.slice(0, 10)}`),
    });
  }

  return [...out, ...further];
}
