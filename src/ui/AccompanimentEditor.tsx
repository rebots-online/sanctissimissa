/**
 * AccompanimentEditor — the one rich-text editor for all four exposures
 * (ARCHITECTURE §7.6; entity row P-S: TipTap/ProseMirror, stores body_pm +
 * body_html). Saves through `SidecarDb.save`, then persists the byte store —
 * both behind a single 400 ms ref-timer debounce (BC.3 contract).
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

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { Accompaniment, Exposure, OccurrenceSelector } from '../core/accompaniment/types.ts';
import type { DayInfo } from '../core/data/types.ts';

function isAllowedHref(href: string): boolean {
  const h = href.trim();
  if (/^https:\/\//i.test(h)) return true;
  if (/^#\/(verse|section|day|acc)\//i.test(h)) return true;
  return false;
}

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

function initialContent(acc: Accompaniment | null): JSONContent | string {
  if (acc?.bodyPm) {
    try {
      return JSON.parse(acc.bodyPm) as JSONContent;
    } catch {
      /* fall through to the rendered HTML snapshot */
    }
  }
  return acc?.bodyHtml ?? '';
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

  const idRef = useRef<string | undefined>(acc?.id);
  const saveTimer = useRef<number | null>(null);
  const saveRef = useRef<() => void>(() => {});
  const tagsInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Highlight,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        validate: isAllowedHref,
        HTMLAttributes: { rel: 'noopener noreferrer' },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: initialContent(acc),
    shouldRerenderOnTransaction: true,
    editorProps: { attributes: { class: 'jsc-editor' } },
    onUpdate: () => scheduleSave(),
  });

  function promptLink() {
    if (!editor) return;
    const prev = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt(
      'Link URL (https://... or internal #/verse/ #/section/ #/day/ #/acc/)',
      prev ?? 'https://',
    );
    if (next === null) return;
    const href = next.trim();
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    if (!isAllowedHref(href)) {
      window.alert('Only https:// or internal #/verse|section|day|acc links allowed.');
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
  }

  function promptImage() {
    if (!editor) return;
    const src = window.prompt('Image URL (https://...) or cancel');
    if (!src?.trim()) return;
    if (!/^https:\/\//i.test(src.trim()) && !src.trim().startsWith('data:image/')) {
      window.alert('Image must be https:// or data:image URI.');
      return;
    }
    editor.chain().focus().setImage({ src: src.trim() }).run();
  }

  /** The single 400 ms ref-timer debounce for save + persist (BC.3). */
  function scheduleSave() {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveRef.current(), 400);
  }

  function doSave() {
    if (!editor || editor.isDestroyed) return;
    // Don't mint sidecar rows for untouched editors (a capture counts as content).
    const untouched = editor.isEmpty && !title.trim() && tags.length === 0 && !capture;
    if (!idRef.current && untouched) return;
    const saved = sidecar.save({
      id: idRef.current,
      title,
      bodyPm: JSON.stringify(editor.getJSON()),
      bodyHtml: editor.getHTML(),
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

  // Flush a pending debounced save on unmount (editor may already be torn down;
  // doSave guards on isDestroyed).
  useEffect(
    () => () => {
      if (saveTimer.current) {
        window.clearTimeout(saveTimer.current);
        saveRef.current();
      }
    },
    [],
  );

  useEffect(() => {
    if (!editor || !onReady) return;
    onReady({
      insertSource: (html) => {
        editor.chain().focus('end').insertContent(html).run();
        scheduleSave();
      },
      getText: () => editor.getText(),
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
    // scheduleSave/setters are stable; re-run only when the editor instance changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

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
      <div className="jsc-toolbar" role="toolbar" aria-label="Rich text tools">
        <button type="button" aria-pressed={editor?.isActive('bold') ?? false} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold"><b>B</b></button>
        <button type="button" aria-pressed={editor?.isActive('italic') ?? false} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic"><i>I</i></button>
        <button type="button" aria-pressed={editor?.isActive('underline') ?? false} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline"><u>U</u></button>
        <button type="button" aria-pressed={editor?.isActive('strike') ?? false} onClick={() => editor?.chain().focus().toggleStrike().run()} title="Strike"><s>S</s></button>
        <button type="button" aria-pressed={editor?.isActive('highlight') ?? false} onClick={() => editor?.chain().focus().toggleHighlight().run()} title="Highlight">HL</button>
        <button type="button" aria-pressed={editor?.isActive('heading', { level: 1 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} title="Heading 1">H1</button>
        <button type="button" aria-pressed={editor?.isActive('heading', { level: 2 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">H2</button>
        <button type="button" aria-pressed={editor?.isActive('heading', { level: 3 }) ?? false} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">H3</button>
        <button type="button" aria-pressed={editor?.isActive('bulletList') ?? false} onClick={() => editor?.chain().focus().toggleBulletList().run()} title="Bullet list">List</button>
        <button type="button" aria-pressed={editor?.isActive('orderedList') ?? false} onClick={() => editor?.chain().focus().toggleOrderedList().run()} title="Ordered list">1.</button>
        <button type="button" aria-pressed={editor?.isActive('blockquote') ?? false} onClick={() => editor?.chain().focus().toggleBlockquote().run()} title="Quote">Quote</button>
        <button type="button" onClick={() => editor?.chain().focus().setHorizontalRule().run()} title="Horizontal rule">HR</button>
        <button type="button" aria-pressed={editor?.isActive('code') ?? false} onClick={() => editor?.chain().focus().toggleCode().run()} title="Code">Code</button>
        <button type="button" aria-pressed={editor?.isActive({ textAlign: 'left' }) ?? false} onClick={() => editor?.chain().focus().setTextAlign('left').run()} title="Align left">Left</button>
        <button type="button" aria-pressed={editor?.isActive({ textAlign: 'center' }) ?? false} onClick={() => editor?.chain().focus().setTextAlign('center').run()} title="Align center">Center</button>
        <button type="button" aria-pressed={editor?.isActive({ textAlign: 'right' }) ?? false} onClick={() => editor?.chain().focus().setTextAlign('right').run()} title="Align right">Right</button>
        <button type="button" aria-pressed={editor?.isActive('link') ?? false} onClick={promptLink} title="Link">Link</button>
        <button type="button" onClick={() => editor?.chain().focus().unsetLink().run()} title="Remove link">Unlink</button>
        <button type="button" onClick={promptImage} title="Image">Img</button>
        <button type="button" onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert table">Table</button>
        <button type="button" onClick={() => editor?.chain().focus().undo().run()} title="Undo">Undo</button>
        <button type="button" onClick={() => editor?.chain().focus().redo().run()} title="Redo">Redo</button>
        <button type="button" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()} title="Clear formatting">Clear</button>
      </div>
      <EditorContent editor={editor} />
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
                  if (!adopted) setTags((prev) => [...prev, suggestion.value]);
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
          onClick={() => {
            if (saveTimer.current) window.clearTimeout(saveTimer.current);
            doSave();
          }}
        >
          Save
        </button>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
