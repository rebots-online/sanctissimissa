/**
 * AnnotationIndex — the left-rail 🔖 surface (§11.2 row, operator directive
 * 2026-08-16): one index of BOTH annotation kinds — notes (with their
 * heading/quote) and bare highlights. Every annotation the reader stores,
 * grouped by the corpus node it anchors to, with jump-to-reader, inline
 * note editing, the four colors, and remove. Provenance (INC-19): quotes
 * and notes are the user's own authored text; the empty state is an honest
 * absence, never sample prose.
 */

import { useMemo, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import { allAnnotations, removeAnnotation, updateAnnotation, type Annotation } from '../core/annotations/store.ts';
import { RichTextEditor } from './richtext/index.ts';

/** Compact human form of an anchor node key (same scheme as JournalView's deep-link buttons). */
function anchorShort(k: string): string {
  const v = k.match(/^verse:([^/]+)\/(\d+)\/(\d+)$/);
  if (v) return `${v[1]} ${v[2]}:${v[3]}`;
  const s = k.match(/^section:([^#]+)#(.+)$/);
  if (s) return `${s[2]} — ${s[1].split('/').pop() ?? s[1]}`;
  return k;
}

const COLORS: Annotation['color'][] = ['gold', 'rose', 'sky', 'moss'];

interface Props {
  db: CorpusDb;
  /** Deep-link into the reader at the annotation's anchor (App's onOpenKey). */
  onOpenKey: (key: string) => void;
}

export default function AnnotationIndex({ db, onOpenKey }: Props) {
  const [tick, setTick] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const bump = () => setTick((t) => t + 1);

  /** Newest first, grouped by anchor node (store order = append order, reversed). */
  const groups = useMemo(() => {
    void tick; // re-list after edit/remove
    const byKey = new Map<string, Annotation[]>();
    for (const a of allAnnotations().reverse()) {
      const list = byKey.get(a.nodeKey);
      if (list) list.push(a);
      else byKey.set(a.nodeKey, [a]);
    }
    return [...byKey.entries()].map(([key, items]) => ({
      key,
      title: db.getNode(key)?.title ?? anchorShort(key),
      items,
    }));
  }, [db, tick]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="content">
      <h2>Annotations</h2>
      <p className="jsc-why">
        {total === 0
          ? ''
          : `${total} ${total === 1 ? 'entry' : 'entries'} — highlights and margin notes from your readings.`}
      </p>

      {groups.length === 0 && (
        <p className="jsc-why">
          No annotations yet — select text in any reading and choose Highlight
          or Annotate; everything you mark appears here.
        </p>
      )}

      {groups.map((g) => (
        <section key={g.key}>
          <div className="group-title">
            <button type="button" onClick={() => onOpenKey(g.key)} title="Open in the reader">
              {g.title} ↗
            </button>
          </div>
          {g.items.map((a) => (
            <article className={`annx-card c-${a.color}`} key={a.id}>
              <span className="annx-swatch" title={`Color: ${a.color}`} />
              <div className="annx-quote">“{a.quote.slice(0, 200)}{a.quote.length > 200 ? '…' : ''}”</div>
              {editingId === a.id ? (
                <div className="annx-edit">
                  <RichTextEditor
                    preset="compact"
                    data={a.note}
                    placeholder="Margin note"
                    onReady={(editor) => editor.editing.view.focus()}
                    onChange={setDraft}
                  />
                  <div className="jsc-toolbar">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        updateAnnotation(a.id, { note: draft });
                        setEditingId(null);
                        bump();
                      }}
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  {a.note && (
                    <div
                      className="annx-note ck-content"
                      dangerouslySetInnerHTML={{ __html: a.note }}
                    />
                  )}
                  <div className="jsc-toolbar">
                    <button
                      type="button"
                      onClick={() => { setEditingId(a.id); setDraft(a.note); }}
                    >
                      {a.note ? 'Edit note' : 'Annotate'}
                    </button>
                    <button
                      type="button"
                      title="Cycle color"
                      onClick={() => {
                        updateAnnotation(a.id, { color: COLORS[(COLORS.indexOf(a.color) + 1) % COLORS.length] });
                        bump();
                      }}
                    >
                      ◑ Color
                    </button>
                    {confirmId === a.id ? (
                      <>
                        <span className="jsc-why">Remove this {a.note ? 'annotation' : 'highlight'}?</span>
                        <button
                          type="button"
                          onClick={() => {
                            removeAnnotation(a.id);
                            setConfirmId(null);
                            bump();
                          }}
                        >
                          Remove
                        </button>
                        <button type="button" onClick={() => setConfirmId(null)}>Cancel</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setConfirmId(a.id)}>Remove</button>
                    )}
                  </div>
                </>
              )}
              <div className="annx-meta jsc-why">{anchorShort(a.nodeKey)} · {a.createdAt.slice(0, 10)}</div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
