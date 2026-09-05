/**
 * AnnotationIndex — the left-rail 🔖 surface (§11.2 row, operator directive
 * 2026-08-16): one index of BOTH annotation kinds — notes (with their
 * heading/quote) and bare highlights. Every annotation the reader stores,
 * grouped by the corpus node it anchors to, with jump-to-reader, inline
 * note editing (compact CKEditor), the four colors, and remove.
 *
 * Management model (operator direction 2026-09-04): a checkbox column with
 * a bulk actions bar replaces the per-card button rows — select many, then
 * recolor or delete in one pass; right-click a card for single-item actions
 * (edit note / cycle color / remove). Provenance (INC-19): quotes and notes
 * are the user's own authored text; the empty state is an honest absence,
 * never sample prose.
 */

import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import { allAnnotations, removeAnnotation, updateAnnotation, type Annotation } from '../core/annotations/store.ts';
import { placeFloatingCallout, reconcileCallout, type DOMRectLike, type FloatingCalloutPlacement } from '../core/ui/calloutPlacement.ts';
import { sanitizeHtml } from '../core/ui/sanitizeHtml.ts';
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [menu, setMenu] = useState<{ anchor: DOMRectLike; placement?: FloatingCalloutPlacement; id: string } | null>(null);
  const menuElRef = useRef<HTMLDivElement>(null);

  /** Place the card menu a clear distance above/below the card it acts on. */
  useLayoutEffect(() => {
    const el = menuElRef.current;
    if (!menu || !el) return;
    const box = { width: el.offsetWidth, height: el.offsetHeight };
    const viewport = {
      left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
      width: window.innerWidth, height: window.innerHeight,
    };
    const placement = placeFloatingCallout(menu.anchor, box, viewport, 48, 'below');
    setMenu((prev) => (prev ? reconcileCallout(prev, prev.anchor, placement) : null));
  }, [menu]);
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

  function toggle(id: string) {
    setBulkConfirm(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Card click = selection toggle, except on interactive children. */
  function cardClick(e: MouseEvent, id: string) {
    if ((e.target as HTMLElement).closest('input, button, a, .ck')) return;
    toggle(id);
  }

  function cycleColorOf(ids: Iterable<string>) {
    const byId = new Map(groups.flatMap((g) => g.items).map((a) => [a.id, a] as const));
    for (const id of ids) {
      const a = byId.get(id);
      if (a) updateAnnotation(id, { color: COLORS[(COLORS.indexOf(a.color) + 1) % COLORS.length] });
    }
    bump();
  }

  function removeSelected() {
    for (const id of selected) removeAnnotation(id);
    setSelected(new Set());
    setBulkConfirm(false);
    bump();
  }

  return (
    <div className="content">
      <h2>Annotations</h2>
      <p className="jsc-why">
        {total === 0
          ? ''
          : `${total} ${total === 1 ? 'entry' : 'entries'} — click checkboxes to select several, right-click an entry for actions.`}
      </p>

      {groups.length === 0 && (
        <p className="jsc-why">
          No annotations yet — select text in any reading and choose Highlight
          or Annotate; everything you mark appears here.
        </p>
      )}

      {selected.size > 0 && (
        <div className="annx-select-bar" role="toolbar" aria-label="Selected annotation actions">
          <strong>{selected.size} selected</strong>
          <button type="button" onClick={() => cycleColorOf(selected)}>◑ Color</button>
          {bulkConfirm ? (
            <>
              <span className="jsc-why">Delete {selected.size} {selected.size === 1 ? 'entry' : 'entries'}?</span>
              <button type="button" onClick={removeSelected}>Yes, delete</button>
              <button type="button" onClick={() => setBulkConfirm(false)}>Cancel</button>
            </>
          ) : (
            <button type="button" onClick={() => setBulkConfirm(true)}>🗑 Delete selected</button>
          )}
          <button type="button" onClick={() => { setSelected(new Set()); setBulkConfirm(false); }}>Clear</button>
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key}>
          <div className="group-title">
            <button type="button" onClick={() => onOpenKey(g.key)} title="Open in the reader">
              {g.title} ↗
            </button>
          </div>
          {g.items.map((a) => (
            <article
              className={`annx-card c-${a.color}${selected.has(a.id) ? ' annx-selected' : ''}`}
              key={a.id}
              onClick={(e) => cardClick(e, a.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                const r = e.currentTarget.getBoundingClientRect();
                setMenu({
                  anchor: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
                  id: a.id,
                });
              }}
            >
              <label className="annx-check" title="Select for bulk actions">
                <input
                  type="checkbox"
                  checked={selected.has(a.id)}
                  onChange={() => toggle(a.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </label>
              <div className="annx-body">
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
                  a.note && (
                    <div
                      className="annx-note ck-content"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.note) }}
                    />
                  )
                )}
                <div className="annx-meta jsc-why">{anchorShort(a.nodeKey)} · {a.createdAt.slice(0, 10)}</div>
              </div>
            </article>
          ))}
        </section>
      ))}

      {menu && (() => {
        const a = groups.flatMap((g) => g.items).find((x) => x.id === menu.id);
        if (!a) return null;
        return (
          <>
            <div className="annx-menu-scrim" onClick={() => setMenu(null)} onContextMenu={(e) => { e.preventDefault(); setMenu(null); }} />
            <div
              className="ctx-menu annx-menu"
              ref={menuElRef}
              style={{
                left: menu.placement ? menu.placement.left : menu.anchor.left,
                top: menu.placement ? menu.placement.top : menu.anchor.top,
                visibility: menu.placement ? 'visible' : 'hidden',
              }}
              data-side={menu.placement?.side}
              onMouseUp={(e) => e.stopPropagation()}
            >
              <div className="sel">“{a.quote.slice(0, 60)}{a.quote.length > 60 ? '…' : ''}”</div>
              <button
                onClick={() => {
                  setEditingId(a.id);
                  setDraft(a.note);
                  setMenu(null);
                }}
              >
                ✎ {a.note ? 'Edit note' : 'Annotate'}
              </button>
              <button
                onClick={() => {
                  cycleColorOf([a.id]);
                  setMenu(null);
                }}
              >
                ◑ Color
              </button>
              <button
                onClick={() => {
                  removeAnnotation(a.id);
                  setSelected((prev) => {
                    const next = new Set(prev);
                    next.delete(a.id);
                    return next;
                  });
                  setMenu(null);
                  bump();
                }}
              >
                🗑 Remove
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
