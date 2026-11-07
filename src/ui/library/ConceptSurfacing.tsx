/**
 * `#concept-surfacing-card` (§L.1; DOCS/ARCHITECTURE/L-bookstore-commerce-
 * 20261106.md §4.3 concept card row; L-audiobook-20261106.md §4 E19; export K
 * `library-tts-karaoke-studio.html:982`). Up to two nucleated groups for the
 * first block of the latest-read chapter, ranked with the same options as
 * MeaningPanel (`src/ui/MeaningPanel.tsx:313`) so the percentages match.
 * Specimen metrics, `Refresh Graph`, `Insert in Homily` and `View Linkage`
 * are not mounted; the TTS buttons mount only for attached audiobook editions.
 */

import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { SidecarDb } from '../../core/accompaniment/store.ts';
import type { NucleatedSimilarityGroup, NucleatedSimilarityHit } from '../../core/data/types.ts';
import { useNucleatedSimilarity } from '../hooks/useSimilarity.ts';
import { audiobook } from '../../core/audiobook/index.ts';
import { AUDIOBOOK_EDITIONS } from '../../core/audiobook/constants.ts';
import { chapterKeyOf, chapterSentences } from '../../core/audiobook/text.ts';
import { editionChapters, editionSections } from '../../core/library/editionSections.ts';
import { chapterLabel, moduleKeyTarget } from '../../core/library/moduleKeys.ts';
import { latestProgress } from '../../core/library/progress.ts';

interface Props {
  db: CorpusDb;
  sidecar: SidecarDb;
  readableIds: string[];
  onOpenKey: (nodeKey: string) => void;
}

export default function ConceptSurfacing({ db, sidecar, readableIds, onOpenKey }: Props) {
  const progress = latestProgress(sidecar, readableIds);
  const first = progress ? editionSections(db, progress.editionId, progress.chapterKey)[0] ?? null : null;
  const term = first?.english ?? '';
  const result = useNucleatedSimilarity(db, term, { candidateK: 64, nucleusK: 5, excludeKey: first?.nodeKey });
  const ab = audiobook();

  if (!progress || !first || !term) return null;

  const listen = (hitKey: string) => {
    const target = moduleKeyTarget(hitKey);
    if (!ab || !target) return;
    const edition = target.editionId;
    const ck = chapterKeyOf(hitKey);
    if (!ck) return;
    const pericope = `commentary:catena-aurea/${target.anchor.split('#')[1]}`;
    const blockIdx = editionSections(db, edition, ck).findIndex((s) => s.nodeKey === pericope);
    const i = chapterSentences(db, edition, ck).findIndex((s: { blockIndex: number }) => s.blockIndex === blockIdx);
    void (async () => {
      await ab.open(edition, ck, i >= 0 ? i : undefined);
      await ab.play();
    })();
  };

  const canListen = (hitKey: string): boolean => {
    const edition = moduleKeyTarget(hitKey)?.editionId;
    return Boolean(
      ab && edition && (AUDIOBOOK_EDITIONS as readonly string[]).includes(edition) && editionChapters(db, edition).length > 0,
    );
  };

  const groups = result.status === 'ready' && result.set ? result.set.groups.slice(0, 2) : [];

  return (
    <section
      id="concept-surfacing-card"
      className="concept-graph-card"
      aria-label="Proactive Liturgical Homily & Journal Embeddings"
    >
      <div className="concept-graph-head">
        <svg fill="none" height="18" stroke="#274b69" strokeWidth="2.2" viewBox="0 0 24 24" width="18" aria-hidden="true">
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="6" r="3" />
          <circle cx="18" cy="18" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="6" x2="6" y1="9" y2="15" />
          <line x1="9" x2="15" y1="6" y2="6" />
          <line x1="18" x2="18" y1="9" y2="15" />
          <line x1="8.5" x2="15.5" y1="8.5" y2="15.5" />
        </svg>
        <div>
          <h2 className="concept-graph-title">Proactive Concept Surfacing (Vector &amp; Knowledge Graph Embeddings)</h2>
          <span className="concept-graph-sub">
            Semantic linkages connecting your active texts to upcoming liturgical feasts, journals, &amp; homily drafts
          </span>
        </div>
      </div>
      {result.status === 'pending' ? (
        <div className="concept-graph-pending">Ranking by meaning…</div>
      ) : (
        <div className="concept-graph-grid">
          {groups.map((group: NucleatedSimilarityGroup, n: number) => {
            const rep = group.representatives[0];
            if (!rep) return null;
            const titles = [...new Set(group.representatives.map((r: NucleatedSimilarityHit) => r.hit.title).filter(Boolean))];
            return (
              <div className="graph-insight-item" key={group.nucleus?.key ?? group.label}>
                <div className="graph-insight-body">
                  <div className="graph-insight-row">
                    <span className="graph-vector-pill">🎯 Surfaced for {chapterLabel(progress.chapterKey)}</span>
                    <span className="graph-insight-score">{Math.round(rep.contextScore * 100)}% match</span>
                  </div>
                  <div className="graph-insight-title">{group.nucleus?.title ?? group.label}</div>
                  <div className="graph-insight-detail">Matched in {titles.join(', ')}</div>
                </div>
                <div className="graph-insight-actions">
                  <button className="btn-sm button-primary" onClick={() => onOpenKey(rep.hit.key)}>
                    Open
                  </button>
                  {canListen(rep.hit.key) && (
                    <button className="btn-sm button-secondary" onClick={() => listen(rep.hit.key)}>
                      {n === 0 ? '🎧 Preview TTS' : '🎧 Play TTS'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
