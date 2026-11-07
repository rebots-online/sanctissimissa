/**
 * JournalSidecar + ConnectionsPanel — the capture → develop → connect →
 * promote workspace (ARCHITECTURE §7.7, entity rows P-T; UX per the sjp-*
 * prototype in DOCS/standroids-journal-sidecar-standalone.html and the PRD).
 * Right split pane on the MeaningPanel visual idiom (`.exegesis .jsidecar`).
 *
 * Every rendered text is a corpus row, a sidecar row, or UI chrome. The
 * why-bridge lines name only corpus facts — the concept grouping, the
 * source, the COMMENTS_ON edge — never fabricated theological claims.
 *
 * CL.5 (§H.1): the companion's `[[journal:<term>]]` write-command
 * (re-dispatched by App/CL.2 as the COMPANION_SEARCH window event, kind
 * 'journal') routes the same concordance/nucleated search for the term into
 * this sidecar as capture-ready sources — each connection card keeps its
 * "Add as source" insert into the entry through the existing capture
 * machinery. When no sidecar is mounted, the companion surface bridge
 * (MeaningPanel.tsx) lets one self-open as an overlay.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Root } from 'react-dom/client';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { DayInfo } from '../core/data/types.ts';
import { debugEvent } from '../core/diagnostics/store.ts';
import { onEmbedState } from '../core/vector/active.ts';
import { buildConnectionCards, type ConnectionCard } from './journal/connectionCards.tsx';
import { useNucleatedSimilarity } from './hooks/useSimilarity.ts';
import AccompanimentEditor from './AccompanimentEditor.tsx';
import type { AccompanimentEditorApi } from './AccompanimentEditor.tsx';
import {
  COMPANION_SEARCH,
  companionBridgeProps,
  readCompanionDetail,
  type CompanionSurfaceProps,
} from './MeaningPanel.tsx';

/* ------------------------------------------------------------------ */
/* CL.5 companion journal surface (§H.1)                               */
/* ------------------------------------------------------------------ */

/** Mounted JournalSidecar instances; > 0 means the module listener stands down. */
let journalSidecarMounted = 0;

/** The self-opened overlay host (created only while no App instance shows). */
let journalOverlayHost: HTMLDivElement | null = null;
let journalOverlayRoot: Root | null = null;

async function openJournalOverlay(props: CompanionSurfaceProps, term: string, reply: string): Promise<void> {
  const { createRoot } = await import('react-dom/client');
  if (!journalOverlayHost || !journalOverlayRoot) {
    journalOverlayHost = document.createElement('div');
    Object.assign(journalOverlayHost.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      height: '100dvh',
      width: 'min(440px, 100vw)',
      zIndex: '60',
      overflowY: 'auto',
      background: 'var(--bg, #f7f2e7)',
    });
    document.body.appendChild(journalOverlayHost);
    journalOverlayRoot = createRoot(journalOverlayHost);
  }
  const close = () => {
    journalOverlayRoot?.unmount();
    journalOverlayHost?.remove();
    journalOverlayRoot = null;
    journalOverlayHost = null;
  };
  journalOverlayRoot.render(
    <JournalSidecar
      db={props.db}
      sidecar={props.sidecar!}
      capture={{ quote: term, quoteAlt: null, anchor: null }}
      day={props.day ?? null}
      companionSearch={{ term, reply }}
      onClose={close}
      onOpenKey={() => {
        /* overlay sources are capture-ready in place; routing stays with the app */
      }}
    />,
  );
}

if (typeof window !== 'undefined') {
  window.addEventListener(COMPANION_SEARCH, (e: Event) => {
    const detail = readCompanionDetail(e);
    if (detail.kind !== 'journal') return; // 'concordance' belongs to MeaningPanel
    const term = detail.value.trim();
    if (!term) {
      debugEvent('sacristan', 'command.rejected', { surface: 'journal', reason: 'bad-term' }, 'warn');
      return;
    }
    if (journalSidecarMounted > 0) return; // the mounted sidecar instance handles it
    const props = companionBridgeProps();
    if (!props?.db || !props.sidecar) {
      debugEvent('sacristan', 'command.rejected', { surface: 'journal', reason: 'no-store' }, 'warn');
      return;
    }
    debugEvent('sacristan', 'journal.opened', { term, via: 'overlay' }, 'info');
    void openJournalOverlay(props, term.slice(0, 300), detail.reply);
  });
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* ConnectionsPanel (exported per the P-T entity row)                  */
/* ------------------------------------------------------------------ */

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

  const [cards, setCards] = useState<ConnectionCard[]>([]);
  useEffect(() => {
    let generation = 0;
    const run = () => {
      const mine = ++generation;
      buildConnectionCards({ db, sidecar, query, anchor, excludeId }).then(
        (next) => { if (mine === generation) setCards(next); },
        (error: unknown) => console.warn('[connections]', error),
      );
    };
    run();
    const off = onEmbedState(run);
    return () => { generation = -1; off(); };
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
  companionSearch = null,
  onClose,
  onOpenKey,
}: {
  db: CorpusDb;
  sidecar: SidecarDb;
  capture: { quote: string; quoteAlt?: string | null; anchor: string | null };
  day: DayInfo | null;
  /** CL.5 — seed the companion source list (the overlay path passes this). */
  companionSearch?: { term: string; reply: string } | null;
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
  /**
   * CL.5 — the companion's `[[journal:<term>]]` term routed here by the
   * module listener; its search results render as capture-ready sources.
   */
  const [companionSource, setCompanionSource] = useState<{ term: string; reply: string } | null>(companionSearch);

  useEffect(() => {
    journalSidecarMounted++;
    const onCompanionSearch = (e: Event) => {
      const detail = readCompanionDetail(e);
      if (detail.kind !== 'journal') return;
      const term = detail.value.trim();
      if (!term) {
        debugEvent('sacristan', 'command.rejected', { surface: 'journal', reason: 'bad-term' }, 'warn');
        return;
      }
      setCompanionSource({ term: term.slice(0, 300), reply: detail.reply });
      debugEvent('sacristan', 'journal.opened', { term, via: 'sidecar' }, 'info');
    };
    window.addEventListener(COMPANION_SEARCH, onCompanionSearch);
    return () => {
      journalSidecarMounted--;
      window.removeEventListener(COMPANION_SEARCH, onCompanionSearch);
    };
  }, []);

  const mode = sidecar.getSetting('mode') ?? 'priest';
  const seedLabel = mode === 'laity' ? 'Promote to reflection seed' : 'Promote to homily seed';
  const { set: themeSet } = useNucleatedSimilarity(db, capture.quote, {
    candidateK: 64,
    nucleusK: 5,
    excludeKey: capture.anchor ?? undefined,
  });
  const themeSuggestions = useMemo(() => {
    const unique = new Map<string, { value: string; label: string; evidence: string }>();
    for (const group of themeSet?.groups ?? []) {
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
  }, [themeSet]);

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

      {companionSource && (
        <div className="jsc-source" data-companion-journal={companionSource.term}>
          <div style={{ fontStyle: 'normal', fontSize: 11, letterSpacing: '0.04em' }}>
            SACRISTAN SOURCES · “{companionSource.term}”
          </div>
          <div className="jsc-why" style={{ margin: '4px 0 0' }}>
            The search results below are capture-ready: “Add as source” inserts each one into this entry with its citation.
          </div>
        </div>
      )}

      <ConnectionsPanel
        db={db}
        sidecar={sidecar}
        text={companionSource?.term ?? capture.quote}
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
