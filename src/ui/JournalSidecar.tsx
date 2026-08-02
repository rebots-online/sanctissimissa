/**
 * JournalSidecar + ConnectionsPanel — the capture → develop → connect →
 * promote workspace (ARCHITECTURE §7.7, entity rows P-T; UX per the sjp-*
 * prototype in DOCS/standroids-journal-sidecar-standalone.html and the PRD).
 * Right split pane on the MeaningPanel visual idiom (`.exegesis .jsidecar`).
 *
 * Every rendered text is a corpus row, a sidecar row, or UI chrome. The
 * why-bridge lines name only corpus facts — the concept grouping, the
 * source, the COMMENTS_ON edge — never fabricated theological claims.
 */

import { useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { DayInfo, SimilarHit } from '../core/data/types.ts';
import { embedText } from '../core/vector/embed.ts';
import { bestClause } from '../core/vector/clause.ts';
import AccompanimentEditor from './AccompanimentEditor.tsx';
import type { AccompanimentEditorApi } from './AccompanimentEditor.tsx';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

/** Human form of an anchor node key for the SOURCE line. */
function anchorHuman(db: CorpusDb, anchor: string | null): string {
  if (!anchor) return 'unanchored selection';
  const v = anchor.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) return `${v[1]} ${v[2]}:${v[3]}`;
  const s = anchor.match(/^section:([^#]+)#(.+)$/);
  if (s) {
    const title = db.getFileNode(s[1])?.title;
    return title ? `${s[2]} — ${title}` : `${s[2]} — ${s[1]}`;
  }
  return anchor;
}

/** Human source title for a corpus similar-hit (verse ref or section — title). */
function corpusSourceTitle(hit: SimilarHit): string {
  const v = hit.key.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) return `${v[1]} ${v[2]}:${v[3]}`;
  const s = hit.key.match(/^section:([^#]+)#(.+)$/);
  if (s) return hit.title ? `${s[2]} — ${hit.title}` : `${s[2]} — ${s[1]}`;
  return hit.title ?? hit.key;
}

/* ------------------------------------------------------------------ */
/* ConnectionsPanel (exported per the P-T entity row)                  */
/* ------------------------------------------------------------------ */

interface ConnectionCard {
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

export function ConnectionsPanel({
  db,
  sidecar,
  text,
  anchor,
  excludeId,
  getText,
  onAddSource,
  onOpenKey,
}: {
  db: CorpusDb;
  sidecar: SidecarDb;
  text: string;
  anchor: string | null;
  /** Extensions beyond the P-T row: `excludeId` suppresses the note being
   *  written (self-hit); `getText` threads the live editor text for the
   *  "Refresh connections" re-query; `onAddSource` carries the prepared
   *  cited-blockquote HTML alongside the row's key. */
  excludeId?: string | null;
  getText?: () => string;
  onAddSource: (key: string, sourceHtml: string) => void;
  onOpenKey: (k: string) => void;
}) {
  const [override, setOverride] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const query = (override && override.trim() ? override : text).trim();

  const cards = useMemo<ConnectionCard[]>(() => {
    if (!query) return [];
    const out: ConnectionCard[] = [];
    const further: ConnectionCard[] = [];

    // (a) Losslessly nucleated corpus vectors. High-context representatives
    // lead; the complete remainder is retained for the expandable tail.
    const set = db.nucleatedSimilarToText(query, {
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
    // §7.7 interpretive layer — landed by the parallel BN wave, called directly).
    const v = anchor?.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
    if (v) {
      const verseRef = `${v[1]} ${v[2]}:${v[3]}`;
      for (const cm of db.commentaryFor(v[1], Number(v[2]), Number(v[3])).slice(0, 2)) {
        const source = cm.sourcePath.replace(/^Commentary\//, '') || 'commentary';
        const full = cm.english ?? '';
        const excerpt = bestClause(full, query)?.text ?? full;
        if (!excerpt) continue;
        out.push({
          id: `m:${cm.nodeKey}`,
          heading: `${source} on ${verseRef}`,
          body: (
            <><b className="clause-hit">{excerpt}</b></>
          ),
          chips: [`vendored · ${source}`, 'COMMENTS_ON'],
          bridge: `Bridge: ${verseRef} → COMMENTS_ON edge → ${source} (vendored commentary)`,
          openKey: null,
          addKey: cm.nodeKey,
          sourceHtml: blockquoteHtml(excerpt, `${source} on ${verseRef}`),
        });
      }
    }

    // (b) The user's own past accompaniments (sidecar_embeddings vector).
    const own = new Map(sidecar.list().map((a) => [a.id, a]));
    let personal = 0;
    for (const hit of sidecar.similar(embedText(query), 4)) {
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
  }, [db, sidecar, query, anchor, excludeId]);

  const visible = cards.filter((c) => !dismissed.has(c.id));
  const primary = visible.filter((card) => card.tier !== 'further');
  const further = visible.filter((card) => card.tier === 'further');

  const renderCard = (c: ConnectionCard) => (
    <article className="jsc-card" key={c.id}>
      <span aria-hidden="true">›</span>
      <div>
        {c.openKey ? (
          <b className="clickable" onClick={() => onOpenKey(c.openKey!)} title="Open in the reader, in context">
            {c.heading} ↗
          </b>
        ) : (
          <b>{c.heading}</b>
        )}
        <div className="jsc-evidence">
          {c.chips.map((chip) => (
            <span className="chip" key={chip}>{chip}</span>
          ))}
        </div>
        <div>{c.body}</div>
        <div className="jsc-why">{c.bridge}</div>
        <div className="jsc-toolbar">
          <button type="button" onClick={() => onAddSource(c.addKey, c.sourceHtml)}>Add as source</button>
          <button type="button" onClick={() => setDismissed((prev) => new Set(prev).add(c.id))}>Not useful</button>
        </div>
      </div>
    </article>
  );

  return (
    <section className="jsc-related" aria-label="Connections">
      <div className="group-title">Connections worth considering</div>
      <div className="jsc-why">Routes, not similarity scores — every card shows its bridge and evidence.</div>
      {getText && (
        <div className="jsc-toolbar">
          <button
            type="button"
            onClick={() => {
              setOverride(getText());
              setDismissed(new Set());
            }}
            title="Re-query using the note's current text"
          >
            Refresh connections
          </button>
        </div>
      )}
      {visible.length === 0 && <div className="jsc-why">No connections found for this text yet.</div>}
      {primary.map(renderCard)}
      {further.length > 0 && (
        <details className="concept-group">
          <summary className="concept-header">
            <span className="concept-label">Further associations</span>
            <span className="concept-count">{further.length}</span>
          </summary>
          {further.map(renderCard)}
        </details>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* JournalSidecar                                                      */
/* ------------------------------------------------------------------ */

type Dest = 'journal' | 'seed' | 'theme' | 'schedule';

/** Copy adapted from the prototype's destination notes object. */
const DEST_NOTES: Record<Dest, string> = {
  journal: 'A private reflection with its original passage and later connections preserved.',
  seed: 'A developing claim or through-line — not yet assigned to a date.',
  theme: 'Place this inside a reusable series such as Easter, the Seven Last Words, or First Fridays.',
  schedule: 'Assign it to one or more liturgical occasions while keeping the reusable source object intact.',
};

export default function JournalSidecar({
  db,
  sidecar,
  capture,
  day,
  onClose,
  onOpenKey,
}: {
  db: CorpusDb;
  sidecar: SidecarDb;
  capture: { quote: string; quoteAlt?: string | null; anchor: string | null };
  day: DayInfo | null;
  onClose: () => void;
  onOpenKey: (k: string) => void;
}) {
  const apiRef = useRef<AccompanimentEditorApi | null>(null);
  const capturedAt = useRef(new Date());
  const [savedId, setSavedId] = useState<string | null>(null);
  const [dest, setDest] = useState<Dest>('journal');
  const [schedKind, setSchedKind] = useState<'date' | 'temporal' | 'sancti'>('date');
  const [schedValue, setSchedValue] = useState('');
  const [toast, setToast] = useState<{ msg: string; key: number } | null>(null);
  const toastTimer = useRef<number | null>(null);

  const mode = sidecar.getSetting('mode') ?? 'priest';
  const seedLabel = mode === 'laity' ? 'Promote to reflection seed' : 'Promote to homily seed';
  const themeSuggestions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string; evidence: string }>();
    const set = db.nucleatedSimilarToText(capture.quote, {
      candidateK: 64,
      nucleusK: 5,
      excludeKey: capture.anchor ?? undefined,
    });
    for (const group of set.groups) {
      if (!group.nucleus) continue;
      for (const concept of group.nucleus.concepts) {
        if (!unique.has(concept.conceptId)) {
          unique.set(concept.conceptId, {
            value: concept.conceptId,
            label: concept.label,
            evidence: `${group.nucleus.source}: ${group.nucleus.clause}`,
          });
        }
      }
    }
    return [...unique.values()];
  }, [db, capture.quote, capture.anchor]);

  function showToast(msg: string) {
    setToast({ msg, key: Date.now() });
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  function pickDest(d: Dest) {
    setDest(d);
    if (d === 'journal') {
      apiRef.current?.setExposure('journal');
      showToast('Kept as a journal entry.');
    } else if (d === 'seed') {
      apiRef.current?.setExposure('homily');
      showToast(mode === 'laity' ? 'Promoted to a reflection seed.' : 'Promoted to a homily seed.');
    } else if (d === 'theme') {
      apiRef.current?.focusTags();
    }
  }

  function addSchedule(kind: 'date' | 'temporal' | 'sancti', value: string) {
    if (!value) return;
    apiRef.current?.addSelector({ kind, value });
    setSchedValue('');
    showToast('Scheduled — occurrence selector added.');
  }

  const capturedTime = capturedAt.current.toTimeString().slice(0, 5);

  return (
    <aside className="exegesis jsidecar">
      <button className="close" onClick={onClose} title="Close workspace">
        ✕
      </button>
      <h2>{mode === 'laity' ? 'Journal reflection' : 'Journal & homily notes'}</h2>

      <div className="jsc-source">
        <div style={{ fontStyle: 'normal', fontSize: 11, letterSpacing: '0.04em' }}>
          SOURCE · {anchorHuman(db, capture.anchor)} · captured {capturedTime}
        </div>
        <blockquote style={{ margin: '6px 0 0' }}>“{capture.quote}”</blockquote>
        {capture.quoteAlt && (
          <blockquote style={{ margin: '4px 0 0', fontStyle: 'italic', opacity: 0.8 }}>“{capture.quoteAlt}”</blockquote>
        )}
      </div>

      <AccompanimentEditor
        sidecar={sidecar}
        acc={null}
        day={day}
        capture={capture}
        themeSuggestions={themeSuggestions}
        onSaved={(a) => setSavedId(a.id)}
        onReady={(api) => {
          apiRef.current = api;
        }}
        onClose={onClose}
      />

      <ConnectionsPanel
        db={db}
        sidecar={sidecar}
        text={capture.quote}
        anchor={capture.anchor}
        excludeId={savedId}
        getText={() => apiRef.current?.getText() ?? ''}
        onAddSource={(_key, html) => {
          apiRef.current?.insertSource(html);
          showToast('Source added — its citation stays attached.');
        }}
        onOpenKey={onOpenKey}
      />

      <div className="group-title">When the note becomes more than a note</div>
      <div className="jsc-dest" role="group" aria-label="Destinations">
        <button
          type="button"
          className={dest === 'journal' ? 'is-selected' : ''}
          aria-pressed={dest === 'journal'}
          onClick={() => pickDest('journal')}
        >
          Keep as journal entry
        </button>
        <button
          type="button"
          className={dest === 'seed' ? 'is-selected' : ''}
          aria-pressed={dest === 'seed'}
          onClick={() => pickDest('seed')}
        >
          {seedLabel}
        </button>
        <button
          type="button"
          className={dest === 'theme' ? 'is-selected' : ''}
          aria-pressed={dest === 'theme'}
          onClick={() => pickDest('theme')}
        >
          Attach to a theme or series
        </button>
        <button
          type="button"
          className={dest === 'schedule' ? 'is-selected' : ''}
          aria-pressed={dest === 'schedule'}
          onClick={() => setDest('schedule')}
        >
          Schedule for a liturgical occasion
        </button>
      </div>
      <div className="jsc-why">{DEST_NOTES[dest]}</div>

      {dest === 'schedule' && (
        <div className="jsc-toolbar" aria-label="Schedule occurrence">
          <select
            value={schedKind}
            onChange={(e) => {
              setSchedKind(e.target.value as 'date' | 'temporal' | 'sancti');
              setSchedValue('');
            }}
            aria-label="Occurrence kind"
          >
            <option value="date">Fixed date</option>
            <option value="temporal">Moveable (this week)</option>
            <option value="sancti">Feast day (MM-DD)</option>
          </select>
          {schedKind === 'date' && (
            <input type="date" value={schedValue} onChange={(e) => setSchedValue(e.target.value)} aria-label="Date" />
          )}
          {schedKind === 'temporal' &&
            (day ? (
              <button type="button" onClick={() => addSchedule('temporal', day.weekKey)}>
                This week: {day.weekKey}
              </button>
            ) : (
              <span className="jsc-why">Open from a resolved day to schedule by week key.</span>
            ))}
          {schedKind === 'sancti' && (
            <input
              value={schedValue}
              onChange={(e) => setSchedValue(e.target.value)}
              placeholder="MM-DD"
              aria-label="Feast MM-DD"
              style={{ width: 70 }}
            />
          )}
          {schedKind !== 'temporal' && (
            <button
              type="button"
              onClick={() => {
                if (schedKind === 'sancti' && !/^\d\d-\d\d$/.test(schedValue)) return;
                addSchedule(schedKind, schedValue);
              }}
            >
              Add
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className="jsc-toast" key={toast.key} role="status" aria-live="polite">
          {toast.msg}
        </div>
      )}
    </aside>
  );
}
