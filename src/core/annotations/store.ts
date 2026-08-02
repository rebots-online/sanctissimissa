/**
 * Annotations — highlights and margin notes for exegetical work.
 * v1 persists to localStorage; the shape mirrors the future synced table
 * (annotations move server-side/SQLite without a model change).
 */

export interface Annotation {
  id: string;
  /** Section node key the annotation anchors to, e.g. "section:Tempora/Quad1-3#Introitus". */
  nodeKey: string;
  /** Exact quoted text the user selected (anchor by content, not offsets). */
  quote: string;
  /** Aligned counterpart line in the other language (line-level, from align.ts) — highlights both panes. */
  quoteAlt?: string;
  note: string;
  color: 'gold' | 'rose' | 'sky' | 'moss';
  createdAt: string;
}

const KEY = 'standroidsmissal.annotations.v1';

function readAll(): Annotation[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Annotation[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: Annotation[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
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
    id: `ann-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
  writeAll([...readAll(), full]);
  return full;
}

export function removeAnnotation(id: string): void {
  writeAll(readAll().filter((a) => a.id !== id));
}
