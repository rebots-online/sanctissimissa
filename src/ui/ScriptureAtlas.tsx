import { useMemo, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import { PERICOPES, SCENARIO_CLUSTERS } from '../core/ontology/parallels.ts';
import { IMAGERY_CONCEPTS } from '../core/ontology/concepts.ts';

export type AtlasMode = 'canonical' | 'imagery' | 'parallels';

export const IMAGERY_CLUSTER: Record<string, string> = {
  light_darkness: 'creation-fall',
  water_baptism: 'exodus-desert',
  desert_exile: 'exodus-desert',
  mountain_of_god: 'exodus-desert',
  bread_from_heaven: 'exodus-desert',
  king_kingdom: 'kingdom-exile',
  vine_vineyard: 'kingdom-exile',
  temple_dwelling: 'kingdom-exile',
  shepherd_flock: 'wisdom-psalter',
  rock_foundation: 'wisdom-psalter',
  bridegroom_bride: 'wisdom-psalter',
  harvest_vintage: 'wisdom-psalter',
  lamb_sacrifice: 'passion',
  fire_spirit: 'resurrection-church',
  way_journey: 'resurrection-church',
};

interface Props {
  db: CorpusDb;
  mode: AtlasMode;
  onOpenKey: (k: string) => void;
}

export default function ScriptureAtlas({ db, mode, onOpenKey }: Props) {
  const [expandedConcept, setExpandedConcept] = useState<string | null>(null);

  const counts = useMemo(() => {
    const m = new Map(db.conceptVerseCounts().map((c) => [c.conceptId, c.count]));
    return IMAGERY_CONCEPTS.filter((c) => IMAGERY_CLUSTER[c.id]).map((c) => ({
      ...c,
      count: m.get(c.id) ?? 0,
    }));
  }, [db]);

  const imageryByCluster = useMemo(() => {
    const groups = new Map<string, typeof counts>();
    for (const c of counts) {
      const clusterId = IMAGERY_CLUSTER[c.id];
      if (!groups.has(clusterId)) {
        groups.set(clusterId, []);
      }
      groups.get(clusterId)!.push(c);
    }
    return groups;
  }, [counts]);

  const citeByBook = useMemo(
    () => new Map(['Matt', 'Marc', 'Luc', 'Joann'].map((b) => [b, db.chapterCiteCounts(b)])),
    [db],
  );

  const parallelsByCluster = useMemo(() => {
    const groups = new Map<string, typeof PERICOPES>();
    for (const p of PERICOPES) {
      if (!groups.has(p.cluster)) {
        groups.set(p.cluster, []);
      }
      groups.get(p.cluster)!.push(p);
    }
    return groups;
  }, []);

  if (mode === 'imagery') {
    return (
      <div className="atlas">
        {SCENARIO_CLUSTERS.slice(0, 4).map((cluster) => {
          const concepts = imageryByCluster.get(cluster.id) ?? [];
          if (concepts.length === 0) return null;
          return (
            <section key={cluster.id}>
              <div className="group-title">{cluster.label}</div>
              <div className="label-cloud">
                {concepts.map((c) => (
                  <button
                    key={c.id}
                    className="concept-label"
                    style={{
                      fontSize: `clamp(0.85rem, ${0.85 + Math.sqrt(c.count) * 0.12}rem, 1.6rem)`,
                    }}
                    onClick={() => setExpandedConcept(expandedConcept === c.id ? null : c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
              {expandedConcept && concepts.find((c) => c.id === expandedConcept) && (
                <div className="verses-list">
                  {db.versesByConcept(expandedConcept).map((v) => (
                    <button
                      key={`${v.book}/${v.chapter}/${v.verse}`}
                      className="verse-chip"
                      onClick={() => onOpenKey(`verse:${v.book}/${v.chapter}/${v.verse}`)}
                    >
                      {v.book} {v.chapter}:{v.verse}
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    );
  }

  if (mode === 'parallels') {
    const parseRef = (ref: string | undefined) => {
      if (!ref) return null;
      const m = ref.match(/^(\d+):(\d+)/);
      if (!m) return null;
      return { ch: Number(m[1]), vStart: Number(m[2]) };
    };

    return (
      <div className="atlas">
        {SCENARIO_CLUSTERS.slice(4).map((cluster) => {
          const pericopes = parallelsByCluster.get(cluster.id) ?? [];
          if (pericopes.length === 0) return null;
          return (
            <section key={cluster.id}>
              <div className="group-title">{cluster.label}</div>
              {pericopes.map((p) => (
                <div key={p.id} className="pericope">
                  <div className="pericope-title">{p.title}</div>
                  <div className="pericope-refs">
                    {(['Matt', 'Marc', 'Luc', 'Joann'] as const).map((book) => {
                      const ref = p.refs[book];
                      const parsed = parseRef(ref);
                      if (!ref || !parsed) return <div key={book} className="pericope-empty" />;
                      const citeCount = citeByBook.get(book)?.get(parsed.ch) ?? 0;
                      const fontWeight = Math.min(600, 300 + citeCount * 40);
                      return (
                        <button
                          key={book}
                          className="pericope-ref"
                          style={{ fontWeight }}
                          onClick={() => onOpenKey(`verse:${book}/${parsed.ch}/${parsed.vStart}`)}
                        >
                          {ref}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    );
  }

  return null;
}
