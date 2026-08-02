/**
 * JournalView — date-timeline of accompaniments across all four exposures
 * (BD.1; entity row P-S `{ db, sidecar, day? }` + `onOpenKey` for anchor
 * deep-links). Newest first, grouped by month; exposure filter chips plus a
 * free-text tag filter; inline edit via AccompanimentEditor; tombstone
 * delete (SidecarDb.remove + persist) behind an inline confirm — never
 * window.confirm. A "today" chip lists the accompaniments whose occurrence
 * selectors project onto the provided day (accompanimentsForDay).
 */

import { useEffect, useMemo, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { Accompaniment, Exposure } from '../core/accompaniment/types.ts';
import type { DayInfo } from '../core/data/types.ts';
import { accompanimentsForDay } from '../core/accompaniment/resolve.ts';
import AccompanimentEditor, { EXPOSURE_LABELS } from './AccompanimentEditor.tsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Compact human form of an anchor node key for the deep-link buttons. */
function anchorShort(k: string): string {
  const v = k.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) return `${v[1]} ${v[2]}:${v[3]}`;
  const s = k.match(/^section:([^#]+)#(.+)$/);
  if (s) return `${s[2]} — ${s[1].split('/').pop() ?? s[1]}`;
  return k;
}

interface Props {
  db: CorpusDb;
  sidecar: SidecarDb;
  day?: DayInfo | null;
  onOpenKey: (k: string) => void;
  focusAccId?: string | null;
  onFocusConsumed?: () => void;
}

export default function JournalView({ db, sidecar, day, onOpenKey, focusAccId, onFocusConsumed }: Props) {
  const [tick, setTick] = useState(0);
  const [expFilter, setExpFilter] = useState<Exposure | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const bump = () => setTick((t) => t + 1);

  function exportHtml(a: Accompaniment) {
    const blob = new Blob(
      [`<!doctype html><meta charset="utf-8"><title>${a.title || 'Note'}</title>${a.bodyHtml || ''}`],
      { type: 'text/html' },
    );
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url;
    el.download = `${(a.title || a.exposure || 'note').replace(/\s+/g, '-')}.html`;
    el.click();
    URL.revokeObjectURL(url);
  }

  async function shareNote(a: Accompaniment) {
    const path = `#/acc/${a.id}`;
    const url = `${location.origin}${location.pathname}${path}`;
    const text = a.title || stripHtml(a.bodyHtml || '').slice(0, 120);
    try {
      if (navigator.share) await navigator.share({ title: a.title || 'Note', text, url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* user cancelled share */
    }
  }

  function printNote(a: Accompaniment) {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!doctype html><title>${a.title || 'Note'}</title><body>${a.bodyHtml || ''}</body>`);
    w.document.close();
    w.focus();
    w.print();
  }

  const mode = sidecar.getSetting('mode') ?? 'priest';
  const label = (x: Exposure) => (x === 'homily' && mode === 'laity' ? 'Reflection' : EXPOSURE_LABELS[x]);

  const entries = useMemo(() => {
    void tick; // re-list after save/remove
    let out = sidecar.list(expFilter === 'all' ? undefined : expFilter);
    const t = tagFilter.trim().toLowerCase();
    if (t) out = out.filter((a) => a.tags.some((tag) => tag.toLowerCase().includes(t)));
    return out;
  }, [sidecar, expFilter, tagFilter, tick]);

  /** list() is already newest-first; fold into contiguous month groups. */
  const months = useMemo(() => {
    const out: { key: string; label: string; items: Accompaniment[] }[] = [];
    for (const a of entries) {
      const key = a.createdAt.slice(0, 7);
      let g = out[out.length - 1];
      if (!g || g.key !== key) {
        const [y, m] = key.split('-').map(Number);
        g = { key, label: `${MONTHS[(m || 1) - 1]} ${y}`, items: [] };
        out.push(g);
      }
      g.items.push(a);
    }
    return out;
  }, [entries]);

  const today = useMemo(() => {
    void tick;
    return day ? accompanimentsForDay(db, sidecar, day.date) : [];
  }, [db, sidecar, day, tick]);

  useEffect(() => {
    if (!focusAccId) return;
    if (!entries.some((a) => a.id === focusAccId)) return;
    setExpFilter('all');
    setTagFilter('');
    setEditingId(focusAccId);
    const el = document.getElementById(`acc-card-${focusAccId}`);
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    onFocusConsumed?.();
  }, [focusAccId, entries, onFocusConsumed]);

  return (
    <div className="content">
      <h2>{mode === 'laity' ? 'Journal' : 'Journal & Homilies'}</h2>

      {day && (
        <div className="jsc-source">
          <b style={{ fontStyle: 'normal' }}>
            Today · {day.date}
            {day.feastName ? ` · ${day.feastName}` : ''}
          </b>
          {today.length === 0 ? (
            <div className="jsc-why">No accompaniments project onto this day.</div>
          ) : (
            <div className="jsc-evidence" style={{ marginTop: 4 }}>
              {today.map((a) => (
                <span className="chip" key={a.id}>
                  {a.title || label(a.exposure)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="jsc-toolbar" style={{ marginBottom: 8 }}>
        <button
          type="button"
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
        >
          New note
        </button>
      </div>

      {(creating || editingId === '__new__') && (
        <AccompanimentEditor
          sidecar={sidecar}
          acc={null}
          day={day}
          onClose={() => {
            setCreating(false);
            bump();
          }}
          onSaved={() => {
            setCreating(false);
            bump();
          }}
        />
      )}

      <div className="jsc-dest" role="group" aria-label="Filter by exposure">
        <button
          type="button"
          className={expFilter === 'all' ? 'is-selected' : ''}
          onClick={() => setExpFilter('all')}
        >
          All
        </button>
        {(['journal', 'homily', 'study', 'newsletter'] as Exposure[]).map((x) => (
          <button
            type="button"
            key={x}
            className={expFilter === x ? 'is-selected' : ''}
            onClick={() => setExpFilter(x)}
          >
            {label(x)}
          </button>
        ))}
        <input
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          placeholder="Filter by tag"
          aria-label="Tag filter"
        />
      </div>

      {months.length === 0 && !creating && (
        <p className="jsc-why">No entries yet — use New note, or capture a passage from the reader.</p>
      )}

      {months.map((m) => (
        <section key={m.key}>
          <div className="group-title">{m.label}</div>
          {m.items.map((a) => {
            const firstLine = stripHtml(a.bodyHtml).slice(0, 160);
            return (
              <div key={a.id} id={`acc-card-${a.id}`}>
                <article className="jsc-card">
                  <span className="jsc-evidence">
                    <span className="chip">{label(a.exposure)}</span>
                  </span>
                  <div>
                    <b>{a.title || '(untitled)'}</b> <span className="jsc-why">{a.createdAt.slice(0, 10)}</span>
                    {a.quote && (
                      <div className="jsc-why" style={{ fontStyle: 'italic' }}>
                        “{a.quote.slice(0, 140)}”
                      </div>
                    )}
                    {firstLine && <div>{firstLine}</div>}
                    {a.tags.length > 0 && (
                      <div className="jsc-evidence">
                        {a.tags.map((t) => (
                          <span className="chip" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                    {a.anchors.length > 0 && (
                      <div className="jsc-toolbar">
                        {a.anchors.map((k) => (
                          <button key={k} type="button" onClick={() => onOpenKey(k)} title="Open in the reader">
                            {anchorShort(k)} ↗
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="jsc-toolbar">
                      <button type="button" onClick={() => setEditingId(editingId === a.id ? null : a.id)}>
                        {editingId === a.id ? 'Close editor' : 'Edit'}
                      </button>
                      <button type="button" onClick={() => exportHtml(a)}>Export</button>
                      <button type="button" onClick={() => printNote(a)}>Print</button>
                      <button type="button" onClick={() => void shareNote(a)}>Share</button>
                      {confirmId === a.id ? (
                        <>
                          <span className="jsc-why">Delete this entry?</span>
                          <button
                            type="button"
                            onClick={() => {
                              sidecar.remove(a.id);
                              void sidecar.persist();
                              setConfirmId(null);
                              if (editingId === a.id) setEditingId(null);
                              bump();
                            }}
                          >
                            Delete
                          </button>
                          <button type="button" onClick={() => setConfirmId(null)}>
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setConfirmId(a.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </article>
                {editingId === a.id && (
                  <AccompanimentEditor sidecar={sidecar} acc={a} onSaved={bump} onClose={() => setEditingId(null)} />
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
