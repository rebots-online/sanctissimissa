/**
 * Annotations — highlights and margin notes for exegetical work.
 * v1 persists to localStorage; the shape mirrors the future synced table
 * (annotations move server-side/SQLite without a model change).
 */

/**
 * Exact character range anchoring a highlight to ONE passage (not every
 * identical word). Offsets are relative to the raw line text of the section
 * (the same coordinate space the live drag-echo uses). Mirrors `SelectionEcho`
 * but lives in core so the store owns it.
 */
export interface AnnotationRange {
  lang: 'latin' | 'english';
  /** Line index within the section (0-based, matches `data-line`). */
  line: number;
  /** Character offsets within that line's raw text (`end` exclusive). */
  start: number;
  end: number;
}

export interface Annotation {
  id: string;
  /** Section node key the annotation anchors to, e.g. "section:Tempora/Quad1-3#Introitus". */
  nodeKey: string;
  /** Selected text — kept for the annotation index and as a fallback display, no longer the render anchor. */
  quote: string;
  /** Aligned counterpart line in the other language (line-level, from align.ts) — fallback when no `rangeAlt`. */
  quoteAlt?: string;
  /** Exact source-language range — the authoritative render anchor (replaces content-string matching). */
  range?: AnnotationRange;
  /** Aligned counterpart range, so the highlight renders in both languages at the right span. */
  rangeAlt?: AnnotationRange;
  note: string;
  color: 'gold' | 'rose' | 'sky' | 'moss';
  createdAt: string;
}

const KEY = 'standroidsmissal.annotations.v1';

/**
 * Notes are HTML (CKEditor 5 compact-preset output) since the 2026-09 editor
 * swap. Every path through the store normalizes: notes that don't start with
 * a block tag are legacy plain text and get escaped + wrapped, so the UI can
 * always render `.ck-content` HTML. Whitespace-only markup (an empty editor
 * serializes to `<p>&nbsp;</p>`) normalizes to ''.
 */
const BLOCK_HTML_RE = /^\s*<(p|div|ul|ol|h[1-6]|blockquote|pre|figure|table)\b/i;

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function ensureNoteHtml(note: string): string {
  const visible = note.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').trim();
  if (!visible) return '';
  const t = note.trim();
  return BLOCK_HTML_RE.test(t) ? t : `<p>${escapeHtml(t)}</p>`;
}

function readAll(): Annotation[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Annotation[]) : [];
    return list.map((a) => ({ ...a, note: ensureNoteHtml(a.note ?? '') }));
  } catch {
    return [];
  }
}

function writeAll(list: Annotation[]): void {
  localStorage.setItem(KEY, JSON.stringify(list.map((a) => ({ ...a, note: ensureNoteHtml(a.note ?? '') }))));
}

export function annotationsFor(nodeKey: string): Annotation[] {
  return readAll().filter((a) => a.nodeKey === nodeKey);
}

export function allAnnotations(): Annotation[] {
  return readAll();
}

export function addAnnotation(a: Omit<Annotation, 'id' | 'createdAt'>): Annotation {
  const full: Annotation = {
    ...a,
    note: ensureNoteHtml(a.note ?? ''),
    id: `ann-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), full]);
  return full;
}

export function removeAnnotation(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}

/** Edit an existing annotation's note/color in place (B5 — the index and the mark popover patch, never re-add). */
export function updateAnnotation(id: string, patch: Partial<Pick<Annotation, 'note' | 'color'>>): void {
  writeAll(readAll().map((a) => (a.id === id ? { ...a, ...patch, note: patch.note !== undefined ? ensureNoteHtml(patch.note) : a.note } : a)));
}
