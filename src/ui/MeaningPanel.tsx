/**
 * Exegesis panel — "Catholic meaning of ‹selected text›".
 * Real corpus evidence only: FTS5 concordance + vector-similar passages,
 * grouped by liturgical concept (e.g. Doxology) instead of flat lists.
 * The fine-tuned ecclesiastical LLM slot ships in the next major; until
 * then no generated commentary is fabricated.
 *
 * CL.5 (§H.1): the companion's `[[concordance:<term>]]` write-command
 * (re-dispatched by App/CL.2 as the COMPANION_SEARCH window event, kind
 * 'concordance') runs the existing search for the term and opens the results
 * here — in-place when the panel is mounted, and otherwise as a self-opened
 * overlay fed by the companion surface bridge (live readers register their
 * db/sidecar handles so the panel can open without synthetic routing).
 */

import { useEffect, useMemo, useState } from 'react';
import type { Root } from 'react-dom/client';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { DayInfo } from '../core/data/types.ts';
import { debugEvent } from '../core/diagnostics/store.ts';
import type { SelectionAction } from './ReaderView.tsx';
import type {
  ConcordanceHit,
  InterpretiveNucleus,
  NucleatedSimilarityHit,
  SimilarHit,
} from '../core/data/types.ts';
import { bestClause } from '../core/vector/clause.ts';
import { buildBilingualResult } from '../core/text/bilingualResult.ts';
import { organizeResultsByCanon, type ResultGroupingMode } from '../core/text/resultHierarchy.ts';
import { ResultSnippet } from './ResultSnippet.tsx';
import SimilarityGlyph from './SimilarityGlyph.tsx';

/* ------------------------------------------------------------------ */
/* CL.5 companion surface bridge (§H.1)                                */
/* ------------------------------------------------------------------ */

/**
 * §H.1/CL.5 — App (CL.2) re-dispatches the companion's `[[concordance:…]]` /
 * `[[journal:…]]` commands as this window event with detail
 * `{ kind, value, reply }`. The name follows the `sanctissimissa:*` event
 * convention of core/orientation/guide.ts.
 */
export const COMPANION_SEARCH = 'sanctissimissa:companion-search';

/** Safe read of a COMPANION_* event detail (missing fields read as ''). */
export function readCompanionDetail(e: Event): { kind: string; value: string; reply: string } {
  const d = (e as CustomEvent).detail as Record<string, unknown> | null | undefined;
  if (!d || typeof d !== 'object') return { kind: '', value: '', reply: '' };
  return { kind: String(d.kind ?? ''), value: String(d.value ?? ''), reply: String(d.reply ?? '') };
}

/**
 * A live mounted surface (SectionReader / this panel / JournalSidecar) lends
 * the bridge its handles, so a companion-opened overlay renders against the
 * SAME CorpusDb/SidecarDb instances the app already uses — never second
 * openings of the stores.
 */
export interface CompanionSurfaceProps {
  db: CorpusDb;
  sidecar: SidecarDb | null;
  day?: DayInfo | null;
}

let companionSurfaceProps: CompanionSurfaceProps | null = null;

export function registerCompanionSurfaceProps(props: CompanionSurfaceProps): void {
  companionSurfaceProps = props;
}

export function companionBridgeProps(): CompanionSurfaceProps | null {
  return companionSurfaceProps;
}

/** Mounted MeaningPanel instances; > 0 means the module listener stands down. */
let meaningPanelMounted = 0;

/** The self-opened overlay host (created only while no App instance shows). */
let meaningOverlayHost: HTMLDivElement | null = null;
let meaningOverlayRoot: Root | null = null;

async function openMeaningOverlay(props: CompanionSurfaceProps, term: string): Promise<void> {
  const { createRoot } = await import('react-dom/client');
  if (!meaningOverlayHost || !meaningOverlayRoot) {
    meaningOverlayHost = document.createElement('div');
    Object.assign(meaningOverlayHost.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      height: '100dvh',
      width: 'min(440px, 100vw)',
      zIndex: '60',
      overflowY: 'auto',
      background: 'var(--bg, #f7f2e7)',
    });
    document.body.appendChild(meaningOverlayHost);
    meaningOverlayRoot = createRoot(meaningOverlayHost);
  }
  const close = () => {
    meaningOverlayRoot?.unmount();
    meaningOverlayHost?.remove();
    meaningOverlayRoot = null;
    meaningOverlayHost = null;
  };
  meaningOverlayRoot.render(
    <MeaningPanel
      db={props.db}
      action={{ kind: 'meaning', term, nodeKey: null }}
      onClose={close}
      onOpenKey={() => {
        /* overlay results are read-only; reader routing stays with the app */
      }}
    />,
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener(COMPANION_SEARCH, (e: Event) => {
    const detail = readCompanionDetail(e);
    if (detail.kind !== 'concordance') return; // 'journal' belongs to JournalSidecar
    const term = detail.value.trim();
    if (!term) {
      debugEvent('companion', 'command.rejected', { surface: 'concordance', reason: 'bad-term' }, 'warn');
      return;
    }
    if (meaningPanelMounted > 0) return; // the live panel instance handles it
    const props = companionBridgeProps();
    if (!props) {
      debugEvent('companion', 'command.rejected', { surface: 'concordance', reason: 'no-corpus' }, 'warn');
      return;
    }
    debugEvent('companion', 'concordance.opened', { term, via: 'overlay' }, 'info');
    void openMeaningOverlay(props, term.slice(0, 300));
  });
}

interface Props {
  db: CorpusDb;
  action: SelectionAction;
  onClose: () => void;
  onOpenKey: (nodeKey: string) => void;
}

function pathOf(key: string): string {
  return key.replace(/^section:/, '').replace(/#.*$/, '');
}
function sectionOf(key: string): string {
  const m = key.match(/#(.*)$/);
  return m ? m[1] : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Human reference for a section node key: feast/day title + readable source. */
function humanRef(db: CorpusDb, key: string): { headline: string; where: string } {
  const path = pathOf(key);
  const section = sectionOf(key);
  const title = db.getFileNode(path)?.title ?? null;
  const office = path.startsWith('Horas/');
  const p = office ? path.slice(6) : path;
  let when = p;
  const sm = p.match(/^Sancti\/(\d\d)-(\d\d)/);
  if (sm) when = `${MONTHS[Number(sm[1]) - 1]} ${Number(sm[2])}`;
  else if (p.startsWith('Tempora/')) when = p.slice(8);
  else if (p.startsWith('Commune/')) when = `Commune ${p.slice(8)}`;
  else if (p.startsWith('Ordo/')) when = 'Ordinary of the Mass';
  else if (p.startsWith('Psalterium/')) when = 'Psalter';
  if (p.startsWith('Ordo/Missae')) {
    const ordoTitle =
      section === 'Incipit'
        ? 'Prayers at the Foot of the Altar'
        : section || 'Ordinary';
    return {
      headline: `${ordoTitle} — Ordinary of the Mass`,
      where: 'Ordinary of the Mass',
    };
  }
  return {
    headline: title ? `${section} — ${title}` : `${section} — ${p}`,
    where: office ? `Office · ${when}` : when,
  };
}

/** Pin Ordinary of the Mass concordance hits ahead of Office / sanctoral. */
function pinOrdinaryMassHits<T extends { key: string }>(hits: T[]): T[] {
  const ordo: T[] = [];
  const rest: T[] = [];
  for (const h of hits) {
    if (/^section:Ordo\/Missae/i.test(h.key) || /Ordo\/Missae/i.test(h.key)) ordo.push(h);
    else rest.push(h);
  }
  return ordo.length ? [...ordo, ...rest] : hits;
}

function ConcordanceHitRow({ db, hit, query, onOpenKey }: { db: CorpusDb; hit: ConcordanceHit; query: string; onOpenKey: (k: string) => void }) {
  const ref = humanRef(db, hit.key);
  const result = buildBilingualResult({ latin: hit.latin, english: hit.english }, query);
  return (
    <div className="hit clickable" onClick={() => onOpenKey(hit.key)} title="Open in the reader, in context">
      <div className="where">
        <span className="ref-headline">{ref.headline}</span>
        <span className="open-hint">{ref.where} ↗</span>
      </div>
      <ResultSnippet result={result} />
    </div>
  );
}

function SimilarHitRow({
  db, hit, query, siblings, onOpenKey,
}: {
  db: CorpusDb; hit: SimilarHit; query: string; siblings: number[]; onOpenKey: (k: string) => void;
}) {
  const ref = humanRef(db, hit.key);
  const [expanded, setExpanded] = useState(false);
  const result = buildBilingualResult({ latin: hit.latin, english: hit.english }, query);
  const full = hit.latin ?? hit.english ?? '';
  const clause = useMemo(() => bestClause(full, query), [full, query]);
  const hasContext = clause && (clause.start > 0 || clause.end < full.length);
  return (
    <div className="hit clickable" onClick={() => onOpenKey(hit.key)} title="Open in the reader, in context">
      <div className="where">
        <span className="ref-headline">
          <SimilarityGlyph score={hit.score} siblings={siblings} />{' '}
          {ref.headline}
        </span>
        <span className="open-hint">{ref.where} ↗</span>
      </div>
      {expanded ? (
        <>
          <ResultSnippet result={buildBilingualResult({ latin: hit.latin, english: hit.english }, query)} />
          {hasContext && (
            <button
              className="clause-toggle"
              onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
              title="Collapse to the closest clause"
            >
              less
            </button>
          )}
        </>
      ) : (
        <>
          <ResultSnippet result={result} />
          {hasContext && (
            <button
              className="clause-toggle"
              onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
              title="Show the full passage around this clause"
            >
              … more
            </button>
          )}
        </>
      )}
    </div>
  );
}

function NucleatedHitRow({
  db,
  item,
  siblings,
  nucleus,
  query,
  onOpenKey,
}: {
  db: CorpusDb;
  item: NucleatedSimilarityHit;
  siblings: number[];
  nucleus: InterpretiveNucleus | null;
  query: string;
  onOpenKey: (k: string) => void;
}) {
  const ref = humanRef(db, item.hit.key);
  const result = buildBilingualResult({ latin: item.hit.latin, english: item.hit.english }, query);
  return (
    <div className="hit clickable" onClick={() => onOpenKey(item.hit.key)} title="Open in the reader, in context">
      <div className="where">
        <span className="ref-headline">
          <SimilarityGlyph score={item.contextScore} siblings={siblings} />{' '}
          {ref.headline}
        </span>
        <span className="open-hint">{ref.where} ↗</span>
      </div>
      <ResultSnippet result={result} />
      <div className="jsc-why">
        Bridge: corpus vector {item.hit.score.toFixed(3)} →{' '}
        {nucleus ? `${nucleus.source} nucleus affinity ${item.nucleusAffinity.toFixed(3)}` : 'stable concept grouping'}
      </div>
      <div className="jsc-evidence">
        <span className="chip">atomic clause</span>
        <span className="chip">
          {nucleus ? `${nucleus.source} · ${nucleus.authorityKind}` : 'corpus concept'}
        </span>
      </div>
    </div>
  );
}

function NucleatedResults({
  db,
  term,
  excludeKey,
  onOpenKey,
}: {
  db: CorpusDb;
  term: string;
  excludeKey?: string;
  onOpenKey: (k: string) => void;
}) {
  const set = db.nucleatedSimilarToText(term, { candidateK: 64, nucleusK: 5, excludeKey });
  if (set.candidateCount === 0) return <div className="hit">No similar passages found.</div>;
  const nuclei = new Map(
    set.groups
      .filter((group) => group.nucleus !== null)
      .map((group) => [group.nucleus!.key, group.nucleus!] as const),
  );
  return (
    <>
      {set.groups.map((group) => {
        const siblings = group.representatives.map((item) => item.contextScore);
        return (
          <div className="concept-group" key={group.nucleus?.key ?? group.label}>
            <div className="concept-header">
              <span className="concept-label">{group.label}</span>
              <span className="concept-count">{group.representatives.length}</span>
            </div>
            {group.nucleus && (
              <div className="concept-desc">
                <b>{group.nucleus.source}:</b> {group.nucleus.clause}
              </div>
            )}
            <div className="concept-hits">
              {group.representatives.map((item) => (
                <NucleatedHitRow
                  key={item.hit.key}
                  db={db}
                  item={item}
                  siblings={siblings}
                  nucleus={group.nucleus}
                  query={term}
                  onOpenKey={onOpenKey}
                />
              ))}
            </div>
          </div>
        );
      })}
      {set.tail.length > 0 && (
        <details className="concept-group">
          <summary className="concept-header">
            <span className="concept-label">Further associations</span>
            <span className="concept-count">{set.tail.length}</span>
          </summary>
          <div className="concept-hits">
            {set.tail.map((item) => (
              <NucleatedHitRow
                key={item.hit.key}
                db={db}
                item={item}
                siblings={set.tail.map((tailItem) => tailItem.contextScore)}
                nucleus={item.nucleusKey ? nuclei.get(item.nucleusKey) ?? null : null}
                query={term}
                onOpenKey={onOpenKey}
              />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

function ConceptGroup<T extends ConcordanceHit | SimilarHit>({
  label,
  description,
  count,
  hits,
  query,
  renderHit,
  onOpenKey,
}: {
  label: string;
  description: string | null;
  count: number;
  hits: T[];
  query: string;
  renderHit: (hit: T, query: string, onOpenKey: (k: string) => void) => React.ReactNode;
  onOpenKey: (k: string) => void;
}) {
  const [expanded, setExpanded] = useState(count <= 3);
  return (
    <div className="concept-group">
      <div
        className="concept-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer' }}
      >
        <span className="concept-label">{label}</span>
        <span className="concept-count">{count}</span>
        {count > 3 && <span className="concept-toggle">{expanded ? '▾' : '▸'}</span>}
      </div>
      {description && <div className="concept-desc">{description}</div>}
      {expanded && (
        <div className="concept-hits">
          {hits.map((hit, i) => (
            <div key={i}>{renderHit(hit, query, onOpenKey)}</div>
          ))}
        </div>
      )}
      {!expanded && count > 3 && (
        <div className="concept-preview">
          {renderHit(hits[0], query, onOpenKey)}
        </div>
      )}
    </div>
  );
}

/**
 * One "relates to" concept — an accordion whose body is the actual linked
 * instances (never a bare count: every claim expands to its evidence).
 */
function ConceptTag({
  db, conceptId, label, description, sectionCount, query, onOpenKey,
}: {
  db: CorpusDb; conceptId: string; label: string; description: string | null;
  sectionCount: number; query: string; onOpenKey: (k: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const auto = label.startsWith('Auto: ');
  const cleanLabel = auto ? label.slice(6).replace(/_+$/, '').trim() : label;
  const instances = useMemo(
    () => (open ? db.sectionsByConcept(conceptId).sort((a, b) => b.score - a.score) : []),
    [db, conceptId, open],
  );
  return (
    <div className="concept-tag">
      <button className="concept-tag-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="chev">{open ? '▾' : '▸'}</span>
        <b>{cleanLabel}</b>
        {auto && <span className="auto-badge" title="Auto-derived cluster from embedding similarity">auto</span>}
        {sectionCount > 0 && <span className="concept-tag-count"> · {sectionCount} instances</span>}
      </button>
      {description && <div className="concept-tag-desc">{description}</div>}
      {open && (
        <div className="concept-tag-instances">
          {instances.slice(0, 20).map((hit, i, shown) => (
            <SimilarHitRow key={i} db={db} hit={hit} query={query} siblings={shown.map((h) => h.score)} onOpenKey={onOpenKey} />
          ))}
          {instances.length > 20 && (
            <div className="concept-tag-more">…and {instances.length - 20} more (see concordance below)</div>
          )}
          {instances.length === 0 && <div className="concept-tag-more">No stored instances for this cluster.</div>}
        </div>
      )}
    </div>
  );
}

/**
 * Two-button toolbar for switching result grouping modes.
 */
function ResultGroupingToolbar({ mode, onChange }: { mode: ResultGroupingMode; onChange: (mode: ResultGroupingMode) => void }) {
  return (
    <div className="result-grouping-toolbar">
      <button
        className={mode === 'themes' ? 'active' : ''}
        onClick={() => onChange('themes')}
      >
        Themes
      </button>
      <button
        className={mode === 'biblical-order' ? 'active' : ''}
        onClick={() => onChange('biblical-order')}
      >
        Biblical order
      </button>
    </div>
  );
}

/**
 * Render a canonical Bible book group with nested details for chapters/verses.
 */
function CanonicalResultTree({
  db,
  tree,
  query,
  onOpenKey,
}: {
  db: CorpusDb;
  tree: ReturnType<typeof organizeResultsByCanon>;
  query: string;
  onOpenKey: (k: string) => void;
}) {
  return (
    <>
      {/* Bible groups */}
      {tree.bible.map((book) => {
        const chapterEntries = Array.from(book.chapters.entries()).sort(
          ([chA], [chB]) => chA - chB,
        );
        return (
          <details key={book.book} className="canonical-book-group" open>
            <summary className="canonical-book-header">
              <span className="canonical-book-title">{book.title}</span>
              <span className="canonical-book-count">
                {chapterEntries.reduce((sum, [, verses]) => sum + verses.size, 0)} chapters
              </span>
            </summary>
            <div className="canonical-book-chapters">
              {chapterEntries.map(([chapter, verses]) => {
                const verseEntries = Array.from(verses.entries()).sort(
                  ([vA], [vB]) => vA - vB,
                );
                return (
                  <details key={chapter} className="canonical-chapter-group" open>
                    <summary className="canonical-chapter-header">
                      Chapter {chapter}
                      <span className="canonical-chapter-count">
                        {verseEntries.reduce((sum, [, hits]) => sum + hits.length, 0)} verses
                      </span>
                    </summary>
                    <div className="canonical-chapter-verses">
                      {verseEntries.map(([verse, hits]) => (
                        <div key={verse} className="canonical-verse-hits">
                          <div className="canonical-verse-header">v{verse}</div>
                          {hits.map((item) => (
                            <NucleatedHitRow
                              key={item.hit.key}
                              db={db}
                              item={item}
                              siblings={[]}
                              nucleus={null}
                              query={query}
                              onOpenKey={onOpenKey}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}

      {/* Other liturgical sources */}
      {tree.other.length > 0 && (
        <details className="canonical-book-group other-group" open>
          <summary className="canonical-book-header">
            <span className="canonical-book-title">Other liturgical and commentary sources</span>
            <span className="canonical-book-count">{tree.other.length} hits</span>
          </summary>
          <div className="canonical-other-hits">
            {tree.other.map((item) => (
              <NucleatedHitRow
                key={item.hit.key}
                db={db}
                item={item}
                siblings={[]}
                nucleus={null}
                query={query}
                onOpenKey={onOpenKey}
              />
            ))}
          </div>
        </details>
      )}
    </>
  );
}

export default function MeaningPanel({ db, action, onClose, onOpenKey }: Props) {
  const [groupingMode, setGroupingMode] = useState<ResultGroupingMode>('themes');
  /**
   * CL.5 — a companion `[[concordance:<term>]]` overrides the action the
   * panel was opened with, so the mounted panel repopulates with the term's
   * existing search (concepts + concordance + nucleated similarity below).
   */
  const [companionAction, setCompanionAction] = useState<SelectionAction | null>(null);

  useEffect(() => {
    meaningPanelMounted++;
    const onCompanionSearch = (e: Event) => {
      const detail = readCompanionDetail(e);
      if (detail.kind !== 'concordance') return;
      const term = detail.value.trim();
      if (!term) {
        debugEvent('companion', 'command.rejected', { surface: 'concordance', reason: 'bad-term' }, 'warn');
        return;
      }
      setCompanionAction({ kind: 'meaning', term: term.slice(0, 300), nodeKey: null });
      debugEvent('companion', 'concordance.opened', { term, via: 'panel' }, 'info');
    };
    window.addEventListener(COMPANION_SEARCH, onCompanionSearch);
    return () => {
      meaningPanelMounted--;
      window.removeEventListener(COMPANION_SEARCH, onCompanionSearch);
    };
  }, []);

  const active = companionAction ?? action;
  const { kind, term, nodeKey } = active;

  return (
    <aside className="exegesis">
      <button
        className="close"
        onClick={() => {
          setCompanionAction(null);
          onClose();
        }}
        title="Close panel"
      >
        ✕
      </button>

      {kind === 'meaning' && (
        <>
          <h2>Catholic meaning</h2>
          <div className="term">“{term}”</div>

          {(() => {
            const concepts = db.conceptsForText(term, 4);
            if (concepts.length === 0) return null;
            return (
              <div className="concept-summary">
                <div className="group-title">This text relates to</div>
                {concepts.map((c) => (
                  <ConceptTag key={c.conceptId} db={db} conceptId={c.conceptId} label={c.label} description={c.description} sectionCount={c.sectionCount} query={term} onOpenKey={onOpenKey} />
                ))}
              </div>
            );
          })()}

          <div className="group-title">Concordance — where the corpus prays these words</div>
          {(() => {
            const groups = db.groupedConcordance(term, 30);
            if (groups.length === 0) {
              return <div className="hit">No literal occurrences elsewhere in the corpus — see the similar passages below.</div>;
            }
            const flat = groups.flatMap((g) => g.hits);
            const pinned = pinOrdinaryMassHits(flat);
            const ordoHits = pinned.filter((h) => /Ordo\/Missae/i.test(h.key));
            return (
              <>
                {ordoHits.length > 0 && (
                  <ConceptGroup
                    label="In the Ordinary of the Mass"
                    description="Pinned — same words in the Mass Ordinary"
                    count={ordoHits.length}
                    hits={ordoHits}
                    query={term}
                    renderHit={(hit, q, ok) => <ConcordanceHitRow db={db} hit={hit} query={q} onOpenKey={ok} />}
                    onOpenKey={onOpenKey}
                  />
                )}
                {groups.map((g, i) => (
                  <ConceptGroup
                    key={i}
                    label={g.label}
                    description={g.description}
                    count={g.count}
                    hits={g.hits}
                    query={term}
                    renderHit={(hit, q, ok) => <ConcordanceHitRow db={db} hit={hit} query={q} onOpenKey={ok} />}
                    onOpenKey={onOpenKey}
                  />
                ))}
              </>
            );
          })()}

          <div className="group-title">Nearest by meaning (vector)</div>
          {(() => {
            const set = db.nucleatedSimilarToText(term, { candidateK: 64, nucleusK: 5, excludeKey: nodeKey ?? undefined });
            if (set.candidateCount === 0) return <div className="hit">No similar passages found.</div>;

            // Flatten representatives + tail for canonical organization
            const allItems: NucleatedSimilarityHit[] = [];
            for (const group of set.groups) {
              allItems.push(...group.representatives);
            }
            allItems.push(...set.tail);

            return (
              <>
                <ResultGroupingToolbar mode={groupingMode} onChange={setGroupingMode} />

                {groupingMode === 'themes' ? (
                  <NucleatedResults db={db} term={term} excludeKey={nodeKey ?? undefined} onOpenKey={onOpenKey} />
                ) : (
                  <>
                    <div className="result-total-count">Total: {set.candidateCount} hits</div>
                    <CanonicalResultTree
                      db={db}
                      tree={organizeResultsByCanon(allItems, db.getBooks())}
                      query={term}
                      onOpenKey={onOpenKey}
                    />
                  </>
                )}
              </>
            );
          })()}

          <div className="llm-slot">
            ✠ <b>Next major:</b> a fine-tuned model on ecclesiastical Latin and Catholic
            doctrine will expound this selection here — word-by-word Latin morphology and
            the theological sense — grounded in the passages above.
          </div>
        </>
      )}

      {kind === 'similar' && (
        <>
          <h2>Similar passages</h2>
          <div className="term">“{term.slice(0, 120)}”</div>
          {(() => {
            const set = db.nucleatedSimilarToText(term, { candidateK: 64, nucleusK: 5, excludeKey: nodeKey ?? undefined });
            if (set.candidateCount === 0) return <div className="hit">No similar passages found.</div>;

            // Flatten representatives + tail for canonical organization
            const allItems: NucleatedSimilarityHit[] = [];
            for (const group of set.groups) {
              allItems.push(...group.representatives);
            }
            allItems.push(...set.tail);

            return (
              <>
                <ResultGroupingToolbar mode={groupingMode} onChange={setGroupingMode} />

                {groupingMode === 'themes' ? (
                  <NucleatedResults db={db} term={term} excludeKey={nodeKey ?? undefined} onOpenKey={onOpenKey} />
                ) : (
                  <>
                    <div className="result-total-count">Total: {set.candidateCount} hits</div>
                    <CanonicalResultTree
                      db={db}
                      tree={organizeResultsByCanon(allItems, db.getBooks())}
                      query={term}
                      onOpenKey={onOpenKey}
                    />
                  </>
                )}
              </>
            );
          })()}
        </>
      )}

      {kind === 'crossrefs' && nodeKey && (
        <>
          <h2>Cross-references</h2>
          <div className="term">{pathOf(nodeKey)}</div>
          {db.crossRefs(pathOf(nodeKey)).map((x, i) => (
            <div className="hit" key={i}>
              <div className="where"><span>{x.rel}</span></div>
              <div className="text">
                {x.fromKey.replace('file:', '')} → <b>{x.toKey.replace('file:', '')}</b>
                {x.toTitle ? ` — ${x.toTitle}` : ''}
                {x.directive ? <><br /><i>directive: “{x.directive}”</i></> : null}
              </div>
            </div>
          ))}
          {db.crossRefs(pathOf(nodeKey)).length === 0 && (
            <div className="hit">This office carries no <i>vide/ex</i> commune directive — its propers are entirely its own.</div>
          )}
        </>
      )}
      {kind === 'crossrefs' && !nodeKey && <div className="hit">Select text inside a section to trace its cross-references.</div>}
    </aside>
  );
}
