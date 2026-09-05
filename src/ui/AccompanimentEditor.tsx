/**
 * AccompanimentEditor — the one rich-text editor for all four exposures
 * (ARCHITECTURE §7.6; entity row P-S: CKEditor 5, `body_html` is the source
 * of truth; `body_pm` stays as a legacy read-only column — every TipTap-era
 * row already carried the HTML snapshot, so nothing migrates). Saves through
 * `SidecarDb.save`, then persists the byte store — both behind a single
 * 400 ms ref-timer debounce (BC.3 contract).
 *
 * Prop extensions beyond the P-S row (`{ sidecar, acc, day?, onClose }`),
 * required by the §7.7 capture flow and noted per the BC.3 dispatch:
 *  - `capture` — quote/quoteAlt/anchor handed over from a reader context
 *    menu; becomes the accompaniment's quote fields + single anchor;
 *  - `onSaved` — save feedback for the embedding surface (toast, self-hit
 *    exclusion in the connections panel);
 *  - `onReady` — small imperative surface (`AccompanimentEditorApi`) so
 *    JournalSidecar's connection cards ("Add as source" → `insertContent`)
 *    and destinations row (exposure / occurrence selectors / tags focus)
 *    can drive the editor without owning its state.
 *
 * When created fresh from a planner day cell (`acc == null`, `day` given,
 * no `capture`), a `date` occurrence selector is prefilled from `day.date`
 * (HomilyPlanner BD.2 "New note for this day").
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ClassicEditor } from 'ckeditor5';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { Accompaniment, Exposure, OccurrenceSelector } from '../core/accompaniment/types.ts';
import type { DayInfo } from '../core/data/types.ts';

// CKEditor is the heaviest dependency in the app; it loads only when an
// editing surface actually mounts, keeping it out of the bundle every
// reading view ships (React.lazy + Suspense at each mount site).
const RichTextEditor = lazy(() => import('./richtext/index.ts').then((m) => ({ default: m.RichTextEditor })));

export const EXPOSURE_LABELS: Record<Exposure, string> = {
  journal: 'Journal entry',
  homily: 'Homily notes',
  study: 'Study material',
  newsletter: 'Newsletter',
};

/** Imperative surface handed to the embedding workspace via `onReady`. */
export interface AccompanimentEditorApi {
  /** Append HTML (a cited blockquote) at the end of the document. */
  insertSource: (html: string) => void;
  getText: () => string;
  setExposure: (exposure: Exposure) => void;
  addSelector: (sel: Pick<OccurrenceSelector, 'kind' | 'value'>) => void;
  focusTags: () => void;
}

type DraftSelector = Pick<OccurrenceSelector, 'id' | 'kind' | 'value'>;

interface Props {
  sidecar: SidecarDb;
  acc: Accompaniment | null;
  day?: DayInfo | null;
  capture?: { quote: string; quoteAlt?: string | null; anchor: string | null } | null;
  themeSuggestions?: { value: string; label: string; evidence: string }[];
  onSaved?: (a: Accompaniment) => void;
  onReady?: (api: AccompanimentEditorApi) => void;
  onClose: () => void;
}

/** Plain-text projection of the document (the old editor's getText()). */
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function AccompanimentEditor({
  sidecar,
  acc,
  day,
  capture,
  themeSuggestions = [],
  onSaved,
  onReady,
  onClose,
}: Props) {
  const [title, setTitle] = useState(acc?.title ?? '');
  const [exposure, setExposure] = useState<Exposure>(acc?.exposure ?? 'journal');
  const [tags, setTags] = useState<string[]>(acc?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [selectors, setSelectors] = useState<DraftSelector[]>(() =>
    acc
      ? acc.selectors.filter((s) => s.kind !== 'theme').map(({ id, kind, value }) => ({ id, kind, value }))
      : !capture && day
        ? [{ id: '', kind: 'date', value: day.date }]
        : [],
  );
  const [saveState, setSaveState] = useState('');

  const editorRef = useRef<ClassicEditor | null>(null);
  const idRef = useRef<string | undefined>(acc?.id);
  const saveTimer = useRef<number | null>(null);
  const saveRef = useRef<() => void>(() => {});
  const tagsInputRef = useRef<HTMLInputElement>(null);

  /** The single 400 ms ref-timer debounce for save + persist (BC.3). */
  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveRef.current(), 400);
  }

  function doSave() {
    const editor = editorRef.current;
    if (!editor || editor.state !== 'ready') return;
    // Don't mint sidecar rows for untouched editors (a capture counts as content).
    const untouched =
      editor.getData({ trim: 'empty' }) === '' && !title.trim() && tags.length === 0 && !capture;
    if (!idRef.current && untouched) return;
    const saved = sidecar.save({
      id: idRef.current,
      title,
      bodyPm: '', // legacy ProseMirror column — read-only since the CKEditor swap
      bodyHtml: editor.getData(),
      anchors: capture?.anchor ? [capture.anchor] : acc?.anchors ?? [],
      exposure,
      provenance: acc?.provenance,
      quote: capture?.quote ?? acc?.quote ?? null,
      quoteAlt: capture?.quoteAlt ?? acc?.quoteAlt ?? null,
      color: acc?.color ?? null,
      createdAt: acc?.createdAt,
      selectors: [
        ...tags.map((t) => ({ id: '', accompanimentId: '', kind: 'theme' as const, value: t })),
        ...selectors.map((s) => ({ id: s.id, accompanimentId: '', kind: s.kind, value: s.value })),
      ],
    });
    idRef.current = saved.id;
    setSaveState('Saving…');
    void sidecar.persist().then(() => setSaveState('Draft saved locally'));
    onSaved?.(saved);
  }
  saveRef.current = doSave;

  // Flush a pending debounced save on unmount (the editor may already be torn
  // down; doSave guards on editor state).
  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveRef.current();
      }
    },
    [],
  );

  function handleReady(editor: ClassicEditor) {
    editorRef.current = editor;
    if (!onReady) return;
    onReady({
      insertSource: async (html) => {
        // Canonical v48 HTML insert (docs: getting-and-setting-data). The
        // processor import resolves from the already-loaded editor chunk.
        const { HtmlDataProcessor } = await import('ckeditor5');
        const viewFragment = new HtmlDataProcessor(editor.data.viewDocument).toView(html);
        const modelFragment = editor.data.toModel(viewFragment);
        editor.model.change((writer) => {
          const root = editor.model.document.getRoot();
          if (root) writer.setSelection(root, 'end');
        });
        editor.model.insertContent(modelFragment);
        scheduleSave();
      },
      getText: () => htmlToText(editor.getData()),
      setExposure: (e) => {
        setExposure(e);
        scheduleSave();
      },
      addSelector: (sel) => {
        setSelectors((prev) => [...prev, { id: '', ...sel }]);
        scheduleSave();
      },
      focusTags: () => tagsInputRef.current?.focus(),
    });
  }

  function commitTag() {
    const t = tagInput.replace(/,/g, ' ').trim();
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
    setTagInput('');
    scheduleSave();
  }

  return (
    <div className="jsc-editor-wrap">
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          scheduleSave();
        }}
        placeholder="Working title"
        aria-label="Title"
        style={{ width: '100%', boxSizing: 'border-box', margin: '6px 0' }}
      />
      <Suspense fallback={<div aria-busy="true" style={{ minHeight: 200 }} />}>
        <RichTextEditor
          preset="main"
          data={acc?.bodyHtml ?? ''}
          onReady={handleReady}
          onChange={() => scheduleSave()}
        />
      </Suspense>
      {themeSuggestions.length > 0 && (
        <div className="jsc-evidence" aria-label="Suggested themes" style={{ margin: '8px 0 0' }}>
          {themeSuggestions.map((suggestion) => {
            const adopted = tags.includes(suggestion.value);
            return (
              <button
                type="button"
                className="chip"
                key={suggestion.value}
                disabled={adopted}
                title={suggestion.evidence}
                onClick={() => {
                  if (adopted) return;
                  setTags((prev) => [...prev, suggestion.value]);
                  scheduleSave();
                }}
              >
                {adopted ? '✓ ' : '+ '}{suggestion.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="jsc-evidence" style={{ margin: '8px 0', alignItems: 'center' }}>
        {tags.map((t) => (
          <span className="chip" key={t}>
            {t}{' '}
            <button
              type="button"
              onClick={() => {
                setTags((prev) => prev.filter((x) => x !== t));
                scheduleSave();
              }}
              aria-label={`Remove tag ${t}`}
            >
              ✕
            </button>
          </span>
        ))}
        <input
          ref={tagsInputRef}
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commitTag();
            }
          }}
          onBlur={() => {
            if (tagInput.trim()) commitTag();
          }}
          placeholder="Add theme tags (comma)"
          aria-label="Theme tags"
        />
      </div>
      <div className="jsc-evidence" style={{ margin: '4px 0', alignItems: 'center' }}>
        <label>
          Save as{' '}
          <select
            value={exposure}
            onChange={(e) => {
              setExposure(e.target.value as Exposure);
              scheduleSave();
            }}
            aria-label="Exposure"
          >
            {(Object.keys(EXPOSURE_LABELS) as Exposure[]).map((x) => (
              <option key={x} value={x}>
                {EXPOSURE_LABELS[x]}
              </option>
            ))}
          </select>
        </label>
        {selectors.map((s, i) => (
          <span className="chip" key={`${s.kind}:${s.value}:${i}`}>
            {s.kind === 'date' ? (
              <>
                on{' '}
                <input
                  type="date"
                  value={s.value}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectors((prev) => prev.map((p, j) => (j === i ? { ...p, value: v } : p)));
                    scheduleSave();
                  }}
                  aria-label="Occurrence date"
                />
              </>
            ) : (
              `${s.kind}: ${s.value}`
            )}{' '}
            <button
              type="button"
              onClick={() => {
                setSelectors((prev) => prev.filter((_, j) => j !== i));
                scheduleSave();
              }}
              aria-label={`Remove ${s.kind} selector`}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="jsc-why" aria-live="polite">
        {saveState}
      </div>
      <div className="jsc-toolbar">
        <button
          type="button"
          className="primary"
          onClick={() => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
            doSave();
          }}
        >
          Save draft
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
