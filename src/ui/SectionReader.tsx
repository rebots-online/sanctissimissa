/**
 * SectionReader — THE bilingual reading surface. One implementation, mounted
 * by every reader (Missal, Divine Office, Sacred Scripture) rather than each
 * view growing its own.
 *
 * Before this existed, `ReaderView` owned the interaction layer, `BibleView`
 * carried a divergent copy of it, and `OfficeView` had a private `OfficeText`
 * with no interaction layer at all — which is precisely why the synchronized
 * hover highlight, the translation flyout, and the selection context menu
 * worked in the Mass and nowhere else (BUGS #2, #10). A third copy would have
 * been the divergence to avoid; this is the row `DOCS/ARCHITECTURE.md` P-B
 * specified and that was never built.
 *
 * What it owns:
 *  - bilingual rendering (columns, or interleaved below the collapse width)
 *  - the line echo: hovering/tapping/selecting a line lights its counterpart
 *    in the other language, because the corpus is line-parallel
 *  - the phrase echo: an exact character range aligned via `alignPhrase`
 *  - the word flyout, placed by `placeFloatingCallout`
 *  - the selection context menu, its dismissal, and the annotate popover
 *
 * Hosts supply `sections` and optional chrome. They do not re-implement any of
 * the above; a view that does is a defect.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { RichTextEditor } from './richtext/index.ts';
import {
  annotationsFor,
  addAnnotation,
  removeAnnotation,
  type Annotation,
  type AnnotationRange,
} from '../core/annotations/store.ts';
import { shareUrl, shareLandingHash } from '../core/share/shareLink.ts';
import {
  alignSelection,
  alignPhrase,
  wordEcho,
  wordAtPoint,
  caretRectAtPoint,
  type WordEchoResult,
  type PhraseSelectionInput,
} from '../core/text/align.ts';
import BilingualText, { TextLines, useNarrow, type NoteCallout, type SelectionEcho } from './BilingualText.tsx';
import {
  placeFloatingCallout,
  reconcileCallout,
  type DOMRectLike,
  type FloatingCalloutPlacement,
} from '../core/ui/calloutPlacement.ts';

/** Opening distance the menu keeps below/above the text it acts on. */
const MENU_GAP = 48;
/** Force field: pointer proximity the popup retreats to hold while a selection drag approaches. */
const POINTER_CLEARANCE = 72;
/** Horizontal half-width of the force field beyond the popup's own edges. */
const POINTER_BAND = 48;
/** Same viewport inset the placement utility clamps to. */
const VIEWPORT_MARGIN = 8;

/** Exegesis request raised from the context menu; the host routes it. */
export interface SelectionAction {
  kind: 'meaning' | 'similar' | 'crossrefs';
  term: string;
  nodeKey: string | null;
}

/** One rendered section. Latin and English must be line-parallel. */
export interface ReaderSection {
  /** Unique `data-section` anchor and React key. */
  anchor: string;
  /** Annotation/highlight write anchor and alignment source id. */
  nodeKey: string;
  /**
   * Extra node keys whose existing annotations/highlights also render here.
   * Scripture uses this: a chapter renders as one section, but annotations
   * written against individual verses must keep showing.
   */
  quoteKeys?: string[];
  title: ReactNode;
  /** Right-hand provenance label in the section head. */
  meta?: ReactNode;
  latin: string | null;
  english: string | null;
  /** Extra classes on the `<section>` element. */
  sectionClass?: string;
  /** Rendered between the head and the text. */
  beforeText?: ReactNode;
  /** Rendered after the text, before the annotation list. */
  afterText?: ReactNode;
  /** A bare heading (the Office's rubric entries) — no text, no interaction. */
  headingOnly?: boolean;
}

/** Context handed to a host-supplied extra menu item. */
export interface MenuContext {
  term: string;
  nodeKey: string | null;
  /** Line index within the section, when the selection resolved to one. */
  line: number | null;
  close: () => void;
}

interface Props {
  db: CorpusDb;
  sections: ReaderSection[];
  sidecar?: SidecarDb | null;
  onAction?: (a: SelectionAction) => void;
  onCapture?: (capture: { quote: string; quoteAlt?: string; anchor: string | null }) => void;
  /** Host-specific context-menu items, appended after the shared ones. */
  menuExtras?: (ctx: MenuContext) => ReactNode;
  /** Section heads fold their body away. Default true. */
  collapsible?: boolean;
  /** Extra classes on the scroll root (appended to `baseClass`). */
  className?: string;
  /** Root classes replacing the default. The Office nests its reader inside
   *  its own grid, where a second `content` would double the page padding. */
  baseClass?: string;
  /** `data-*` attributes on the scroll root (rubric/role-lens switches). */
  rootData?: Record<string, string>;
  /** Chrome above the sections (export bar, mode switches, back buttons). */
  toolbar?: ReactNode;
  /** The scroll container — hosts need it for focus scrolling and scroll-spy. */
  rootRef?: React.RefObject<HTMLDivElement | null>;
  /** Anchor to unfold before the host scrolls to it; re-applied on nonce change. */
  openAnchor?: string | null;
  openNonce?: number;
}

interface Menu {
  /**
   * What the menu must not cover: the live selection's rectangle, else the
   * caret/word rect under the opening point. Placed above/below this by
   * `placeFloatingCallout`, never on top of it.
   */
  anchor: DOMRectLike;
  /** Assigned after the menu is measured; render hidden until then. */
  placement?: FloatingCalloutPlacement;
  term: string;
  nodeKey: string | null;
  line: number | null;
  /** Resolved exact range of the selection that opened this menu (absent for word-under-cursor). */
  range?: { src: AnnotationRange; alt?: AnnotationRange };
}

/**
 * What the context menu must not cover. With a live selection that is the
 * whole selection rectangle; otherwise the text box under the point — so the
 * menu opens above/below the passage of interest, never on top of it.
 */
function menuAnchorAt(clientX: number, clientY: number): DOMRectLike {
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && sel.toString().trim().length > 0) {
    const r = sel.getRangeAt(0).getBoundingClientRect();
    if (r.right > r.left || r.bottom > r.top) {
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }
  }
  const r = caretRectAtPoint(clientX, clientY);
  if (r) {
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  }
  return { left: clientX, top: clientY, right: clientX, bottom: clientY, width: 0, height: 0 };
}

/** Find the section node key containing the current selection anchor. */
function nodeKeyFromSelection(root: HTMLElement | null): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let el: Node | null = sel.getRangeAt(0).startContainer;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.nodekey) return el.dataset.nodekey;
    el = el.parentNode;
  }
  return null;
}

/**
 * Which language pane a node sits in. The interleaved layout stamps
 * `data-lang`; the column layout does not, so fall back to the pane wrapper —
 * without this the phrase echo could never fire in two-column mode.
 */
function langOf(el: HTMLElement): 'latin' | 'english' | null {
  const stamped = el.dataset.lang;
  if (stamped === 'la') return 'latin';
  if (stamped === 'en') return 'english';
  if (stamped === 'latin' || stamped === 'english') return stamped;
  if (el.closest('.latin')) return 'latin';
  if (el.closest('.english')) return 'english';
  return null;
}

/**
 * Resolve a DOM node to its `{nodeKey, line index, language, char-offset}`
 * within the reader. Shared by the live drag-echo and the selection-range
 * capture for highlights, so a saved highlight and a live echo use identical
 * coordinates. `root` bounds the walk.
 */
/** Non-word characters for selection snapping: anything but Unicode letters,
 *  marks, and the straight/curly apostrophe (Latin elisions keep their word). */
const NON_WORD = /[^\p{L}\p{M}'’]/u;

/**
 * Expand the selection's edges to whole-word boundaries within their own text
 * nodes (the operator's word-at-a-time caret). Returns true when the range
 * was adjusted (the caller lets the resulting selectionchange re-enter).
 */
function snapSelectionToWords(sel: Selection): boolean {
  if (sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const st = range.startContainer;
  const en = range.endContainer;
  if (st.nodeType !== Node.TEXT_NODE || en.nodeType !== Node.TEXT_NODE) return false;
  const stText = st.textContent ?? '';
  const enText = en.textContent ?? '';
  let s = range.startOffset;
  while (s > 0 && !NON_WORD.test(stText[s - 1] ?? '')) s--;
  let e = range.endOffset;
  while (e < enText.length && !NON_WORD.test(enText[e] ?? '')) e++;
  if (s === range.startOffset && e === range.endOffset) return false;
  try {
    range.setStart(st, s);
    range.setEnd(en, e);
  } catch {
    return false;
  }
  return true;
}

function lineInfoAt(
  root: HTMLElement | null,
  node: Node | null,
): { nodeKey: string; idx: number; lang: 'latin' | 'english' | null; start: number } | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.line !== undefined) {
      const sec = el.closest('section[data-nodekey]') as HTMLElement | null;
      if (!sec?.dataset.nodekey) return null;
      const lineEl = el.closest('span[data-line]') as HTMLElement | null;
      if (!lineEl) return null;

      // Character offset of the containing text node within the line.
      let start = 0;
      let current: Node | null = node;
      while (current && current !== lineEl) {
        if (current.nodeType === Node.TEXT_NODE) {
          let pos = 0;
          for (const sibling of Array.from(lineEl.childNodes)) {
            if (sibling === current) break;
            pos += (sibling.textContent ?? '').length;
          }
          start = pos;
          break;
        }
        current = current.parentNode;
      }

      return {
        nodeKey: sec.dataset.nodekey,
        idx: Number(el.dataset.line),
        lang: langOf(lineEl),
        start,
      };
    }
    el = el.parentNode;
  }
  return null;
}

export default function SectionReader({
  db,
  sections,
  sidecar,
  onAction,
  onCapture,
  menuExtras,
  collapsible = true,
  className,
  baseClass = 'content reader',
  rootData,
  toolbar,
  rootRef,
  openAnchor,
  openNonce,
}: Props) {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteFor, setNoteFor] = useState<Menu | null>(null);
  const [noteText, setNoteText] = useState('');
  const [annVersion, setAnnVersion] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const ownRef = useRef<HTMLDivElement>(null);
  const root = rootRef ?? ownRef;
  const menuElRef = useRef<HTMLDivElement>(null);

  /** Below the collapse width the two panes become one interleaved column. */
  const narrow = useNarrow(1100);

  /** Line echo: a `[from,to]` line range within one section lights up. */
  const [echo, setEcho] = useState<{ nodeKey: string; from: number; to: number } | null>(null);
  /** Phrase echo: the aligned character range of the live selection. */
  const [livePhraseEcho, setLivePhraseEcho] = useState<SelectionEcho | null>(null);

  const [callout, setCallout] = useState<{
    anchor: DOMRectLike;
    word: string;
    echo: WordEchoResult;
    placement?: FloatingCalloutPlacement;
  } | null>(null);
  const echoCache = useRef(new Map<string, WordEchoResult | null>());
  const lastWord = useRef<string | null>(null);
  /**
   * Pointer type of the gesture in flight, read by the mouseup menu path:
   * touch taps fire compatibility mouse events, so without this a scroll
   * bounce or dismissal tap carrying a stale selection would pop the menu.
   * On touch the menu is long-press (contextmenu) only.
   */
  const lastPointerType = useRef<string>('');
  const calloutElRef = useRef<HTMLDivElement>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);

  const sectionFor = useCallback(
    (nodeKey: string | null) => sections.find((s) => s.nodeKey === nodeKey) ?? null,
    [sections],
  );

  const echoFromEvent = (e: React.SyntheticEvent) => {
    const t = e.target as HTMLElement;
    const line = t.closest?.('span[data-line]') as HTMLElement | null;
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    if (line && sec?.dataset.nodekey) {
      const idx = Number(line.dataset.line);
      setEcho({ nodeKey: sec.dataset.nodekey, from: idx, to: idx });
    }
  };

  const showCallout = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest?.('.verse-ref, .rubric-text')) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const word = wordAtPoint(e.clientX, e.clientY);
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    const nodeKey = sec?.dataset.nodekey ?? null;
    if (!word || !nodeKey) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const cacheKey = `${nodeKey}|${word.toLowerCase()}`;
    if (lastWord.current === cacheKey) return;
    lastWord.current = cacheKey;
    const src = sectionFor(nodeKey);
    if (!src) return setCallout(null);
    let result = echoCache.current.get(cacheKey);
    if (result === undefined) {
      result = wordEcho(db, { latin: src.latin, english: src.english }, word);
      echoCache.current.set(cacheKey, result);
    }
    if (result?.word) {
      const lineEl = t.closest?.('span[data-line]') as HTMLElement | null;
      const anchorEl = lineEl ?? t;
      anchorElRef.current = anchorEl;
      const r = anchorEl.getBoundingClientRect();
      setCallout({
        anchor: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
        word,
        echo: result,
      });
    } else setCallout(null);
  };

  /** Measure, then place. Keyed on the echo identity so it terminates. */
  useLayoutEffect(() => {
    if (!callout) return;
    const anchorEl = anchorElRef.current;
    if (!anchorEl || !anchorEl.isConnected) {
      setCallout(null);
      return;
    }
    const r = anchorEl.getBoundingClientRect();
    const anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    const box = { width: calloutElRef.current?.offsetWidth ?? 0, height: calloutElRef.current?.offsetHeight ?? 0 };
    const viewport = {
      left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
      width: window.innerWidth, height: window.innerHeight,
    };
    const placement = placeFloatingCallout(anchor, box, viewport);
    setCallout((prev) => (prev ? reconcileCallout(prev, anchor, placement) : null));
  }, [callout?.echo]);

  /** Re-place on resize against the live anchor, never a stored rectangle. */
  useEffect(() => {
    if (!callout?.echo) return;
    const onResize = () => {
      const anchorEl = anchorElRef.current;
      if (!anchorEl || !anchorEl.isConnected) return setCallout(null);
      const r = anchorEl.getBoundingClientRect();
      const anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
      const box = { width: calloutElRef.current?.offsetWidth ?? 0, height: calloutElRef.current?.offsetHeight ?? 0 };
      const viewport = {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight,
      };
      setCallout((prev) => (prev ? reconcileCallout(prev, anchor, placeFloatingCallout(anchor, box, viewport)) : null));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [callout?.echo]);

  /**
   * Measure the open menu (or annotate popover), then place it a generous
   * distance above/below its anchor — never covering the passage it acts on.
   * Re-placed through a ResizeObserver because the popover grows as its
   * editor mounts. Keyed on WHICH surface is open (not on the menu object),
   * so force-field nudges below don't re-trigger placement.
   */
  const openMenuKey = menu ? 'menu' : noteFor ? 'note' : 'none';
  useLayoutEffect(() => {
    const open = menu ?? noteFor;
    const el = menuElRef.current;
    if (!open || !el) return;
    const place = () => {
      const box = { width: el.offsetWidth, height: el.offsetHeight };
      const viewport = {
        left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
        width: window.innerWidth, height: window.innerHeight,
      };
      const placement = placeFloatingCallout(open.anchor, box, viewport, MENU_GAP, 'below');
      const settle = (prev: Menu | null) => (prev ? reconcileCallout(prev, open.anchor, placement) : null);
      if (menu) setMenu(settle);
      else setNoteFor(settle);
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(el);
    return () => ro.disconnect();
  }, [openMenuKey]);

  /**
   * Force field: while a selection drag (any pressed pointer) approaches the
   * open popup, it retreats vertically so the text under the drag stays
   * readable. Idle cursor movement never repels — the menu must be easy to
   * reach and click — and a pointer over the popup itself is exempt. The
   * retreat is clamped so the popup never slides back onto its anchor.
   * All popup state is read inside the updaters: this effect runs once per
   * open/close, so closure copies would go stale after the first placement.
   */
  useEffect(() => {
    if (!menu && !noteFor) return;
    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0) return;
      const el = menuElRef.current;
      if (!el) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.('.ctx-menu')) return;
      const box = el.getBoundingClientRect();
      if (e.clientX < box.left - POINTER_BAND || e.clientX > box.right + POINTER_BAND) return;
      const push = (prev: Menu | null): Menu | null => {
        if (!prev || !prev.placement) return prev;
        let top: number | null = null;
        if (e.clientY < box.top) {
          if (box.top - e.clientY < POINTER_CLEARANCE) top = e.clientY + POINTER_CLEARANCE;
        } else if (e.clientY > box.bottom) {
          if (e.clientY - box.bottom < POINTER_CLEARANCE) top = e.clientY - POINTER_CLEARANCE - box.height;
        } else {
          return prev;
        }
        if (top === null) return prev;
        // Never retreat onto the anchor text, nor off the viewport.
        const floor = prev.placement.side === 'below' ? prev.anchor.bottom + MENU_GAP : VIEWPORT_MARGIN;
        const ceiling = prev.placement.side === 'below'
          ? window.innerHeight - VIEWPORT_MARGIN - box.height
          : prev.anchor.top - MENU_GAP - box.height;
        top = Math.max(floor, Math.min(ceiling, top));
        if (Math.abs(top - box.top) < 1) return prev;
        return { ...prev, placement: { ...prev.placement, top } };
      };
      setMenu(push);
      setNoteFor(push);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, [menu !== null, noteFor !== null]);

  const toggleSection = (anchor: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });

  /** Navigating to a folded section unfolds it before the host scrolls. */
  useEffect(() => {
    if (!openAnchor) return;
    setCollapsed((prev) => {
      if (!prev.has(openAnchor)) return prev;
      const next = new Set(prev);
      next.delete(openAnchor);
      return next;
    });
  }, [openAnchor, openNonce]);

  const closeMenu = useCallback(() => setMenu(null), []);

  // Scrolling closes the menu — its coordinates are viewport-fixed.
  useEffect(() => {
    window.addEventListener('scroll', closeMenu, true);
    return () => window.removeEventListener('scroll', closeMenu, true);
  }, [closeMenu]);

  /**
   * SR.4 — the menu must be cancellable. It previously had no dismissal at
   * all, so opening one forced the user to pick something disruptive. ESC and
   * a click outside now both cancel, matching every other context menu.
   */
  useEffect(() => {
    if (!menu && !noteFor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setMenu(null);
        setNoteFor(null);
      }
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuElRef.current?.contains(t)) return;
      if ((t as HTMLElement)?.closest?.('.ctx-menu')) return;
      setMenu(null);
      setNoteFor(null);
    };
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [menu, noteFor]);

  /**
   * Whole-word selection (operator directive 2026-08-16): while click-dragging,
   * the caret proceeds word-at-a-time — each edge of the live selection
   * expands to the nearest word boundary within its text node. The synthetic
   * selectionchange the snap provokes passes through via the guard.
   */
  const snapGuard = useRef(false);
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root.current) {
        snapGuard.current = false;
        setLivePhraseEcho(null);
        return;
      }
      if (snapGuard.current) {
        snapGuard.current = false;
      } else if (snapSelectionToWords(sel)) {
        snapGuard.current = true;
        return; // re-enter on the snapped selection
      }
      const range = sel.getRangeAt(0);
      const a = lineInfoAt(root.current, range.startContainer);
      const f = lineInfoAt(root.current, range.endContainer);

      if (a && f && a.nodeKey === f.nodeKey && a.idx === f.idx && a.lang && a.lang === f.lang) {
        setEcho({ nodeKey: a.nodeKey, from: a.idx, to: a.idx });
        const start = range.startOffset + a.start;
        const end = range.endOffset + f.start;
        const src = sectionFor(a.nodeKey);
        if (src) {
          const selection: PhraseSelectionInput = {
            srcLang: a.lang,
            idx: a.idx,
            start: Math.min(start, end),
            end: Math.max(start, end),
          };
          const aligned = alignPhrase(db, { latin: src.latin, english: src.english }, selection);
          if (aligned?.dstLine) {
            setLivePhraseEcho({
              lang: aligned.srcLang === 'latin' ? 'english' : 'latin',
              line: aligned.idx,
              start: aligned.dstStart,
              end: aligned.dstEnd,
            });
            return;
          }
        }
        setLivePhraseEcho(null);
        return;
      }

      // Cross-line or cross-language: line echo only.
      const either = a ?? f;
      if (either) setEcho({ nodeKey: either.nodeKey, from: either.idx, to: either.idx });
      setLivePhraseEcho(null);
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [db, sectionFor, root]);

  /** Line index of the current selection within its section, if resolvable. */
  const selectedLine = (): number | null => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    let el: Node | null = sel.getRangeAt(0).startContainer;
    while (el && el !== root.current) {
      if (el instanceof HTMLElement && el.dataset.line !== undefined) return Number(el.dataset.line);
      el = el.parentNode;
    }
    return null;
  };

  /**
   * Resolve the current selection to an exact source range plus its aligned
   * counterpart, so a saved highlight anchors the one passage the user picked
   * (not every identical word). Returns null for cross-line/cross-language or
   * word-under-cursor selections, which fall back to content-string matching.
   */
  const resolveSelectionRange = useCallback((): { src: AnnotationRange; alt?: AnnotationRange } | null => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !root.current) return null;
    const range = sel.getRangeAt(0);
    const a = lineInfoAt(root.current, range.startContainer);
    const f = lineInfoAt(root.current, range.endContainer);
    if (!a || !f || !a.lang || a.lang !== f.lang || a.nodeKey !== f.nodeKey || a.idx !== f.idx) return null;
    const rawStart = range.startOffset + a.start;
    const rawEnd = range.endOffset + f.start;
    const src: AnnotationRange = {
      lang: a.lang,
      line: a.idx,
      start: Math.min(rawStart, rawEnd),
      end: Math.max(rawStart, rawEnd),
    };
    const sec = sectionFor(a.nodeKey);
    if (sec) {
      const aligned = alignPhrase(db, { latin: sec.latin, english: sec.english }, { srcLang: a.lang, idx: a.idx, start: src.start, end: src.end });
      if (aligned?.dstLine) {
        return {
          src,
          alt: {
            lang: aligned.srcLang === 'latin' ? 'english' : 'latin',
            line: aligned.idx,
            start: aligned.dstStart,
            end: aligned.dstEnd,
          },
        };
      }
    }
    return { src };
  }, [db, sectionFor]);

  const openMenuAt = (
    clientX: number,
    clientY: number,
    term: string,
    nodeKey: string | null,
    line: number | null,
    range?: { src: AnnotationRange; alt?: AnnotationRange },
  ) => {
    setMenu({
      anchor: menuAnchorAt(clientX, clientY),
      term: term.slice(0, 300),
      nodeKey,
      line,
      range,
    });
  };

  /**
   * SR.5 — right-click with no drag selection targets the word under the
   * cursor (the one the flyout is already reading), instead of doing nothing.
   */
  const onContextMenu = (e: React.MouseEvent) => {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (sel.length > 0) {
      e.preventDefault();
      openMenuAt(e.clientX, e.clientY, sel, nodeKeyFromSelection(root.current), selectedLine(), resolveSelectionRange() ?? undefined);
      return;
    }
    const word = wordAtPoint(e.clientX, e.clientY);
    if (!word) return;
    const t = e.target as HTMLElement;
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    const lineEl = t.closest?.('span[data-line]') as HTMLElement | null;
    e.preventDefault();
    openMenuAt(
      e.clientX,
      e.clientY,
      word,
      sec?.dataset.nodekey ?? null,
      lineEl ? Number(lineEl.dataset.line) : null,
    );
  };

  function alignedAlt(m: Menu): string | undefined {
    const src = sectionFor(m.nodeKey);
    if (!src) return undefined;
    return alignSelection({ latin: src.latin, english: src.english }, m.term)?.dstLine ?? undefined;
  }

  /** SR.6 — clipboard with a non-secure-context fallback. */
  async function copyText(text: string) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      /* fall through to the legacy path */
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  }

  /**
   * SR.7 — a highlight is an annotation with no note. It stores the aligned
   * counterpart line as `quoteAlt`, so the passage renders marked in BOTH
   * languages on every return, through the same `mark.ann` pipeline.
   */
  function highlight(m: Menu) {
    if (!m.nodeKey) return;
    addAnnotation({
      nodeKey: m.nodeKey,
      quote: m.term,
      quoteAlt: alignedAlt(m),
      range: m.range?.src,
      rangeAlt: m.range?.alt,
      note: '',
      color: 'gold',
    });
    setAnnVersion((v) => v + 1);
  }

  return (
    <div
      className={`${baseClass}${className ? ` ${className}` : ''}`}
      ref={root as React.RefObject<HTMLDivElement>}
      {...rootData}
      onContextMenu={onContextMenu}
      onMouseUp={(e) => {
        // Left-release with a selection also offers the menu — real mouse
        // only. Touch taps fire compatibility mouse events, and on touch the
        // menu belongs to long-press (contextmenu): whole-word selection via
        // the platform, then drag the handles. Touch selection never runs
        // through here, so scrolling bounces and dismissal taps can't pop it.
        if (e.button === 0 && (lastPointerType.current === '' || lastPointerType.current === 'mouse')) {
          const sel = window.getSelection()?.toString().trim();
          if (sel && sel.length > 1) {
            e.preventDefault();
            openMenuAt(e.clientX, e.clientY, sel, nodeKeyFromSelection(root.current), selectedLine(), resolveSelectionRange() ?? undefined);
          }
        }
      }}
      onPointerOver={(e) => {
        if (window.matchMedia('(hover: hover)').matches) echoFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) showCallout(e);
      }}
      onPointerDown={(e) => {
        lastPointerType.current = e.pointerType;
        if (e.pointerType !== 'mouse') {
          echoFromEvent(e);
          showCallout(e);
        }
      }}
      onPointerUp={(e) => {
        lastPointerType.current = e.pointerType;
        if (e.pointerType !== 'mouse') {
          lastWord.current = null;
          setCallout(null);
        }
      }}
      onPointerLeave={() => {
        lastWord.current = null;
        setCallout(null);
      }}
      onClick={echoFromEvent}
    >
      {toolbar}

      {sections.map((s) => {
        if (s.headingOnly) {
          return (
            <h2 className={`office-heading${s.sectionClass ? ` ${s.sectionClass}` : ''}`} key={s.anchor}>
              {s.title}
            </h2>
          );
        }
        const keys = [s.nodeKey, ...(s.quoteKeys ?? [])];
        const anns = keys.flatMap((k) => annotationsFor(k));
        const highlights = keys.flatMap((k) => sidecar?.forAnchor(k) ?? []);
        // Exact ranges anchor ranged annotations to the one selected passage.
        const annMarks: AnnotationRange[] = anns.flatMap((a) =>
          [a.range, a.rangeAlt].filter((r): r is AnnotationRange => Boolean(r)),
        );
        // Noted annotations render as margin-callouts just below their line
        // (both layouts); rangeless legacy notes stay in the section list.
        const noteCallouts: NoteCallout[] = anns.flatMap((a) => {
          if (!a.note) return [];
          const out: NoteCallout[] = [];
          if (a.range) out.push({ key: a.id, lang: 'latin', line: a.range.line, html: a.note, color: a.color });
          if (a.rangeAlt) out.push({ key: a.id, lang: 'english', line: a.rangeAlt.line, html: a.note, color: a.color });
          return out;
        });
        // Content-string matching only for sidecar highlights and rangeless
        // annotations (legacy/fallback) — keeps ranged highlights from
        // re-lighting every identical word.
        const quotes = [...new Set(
          [...anns.filter((a) => !a.range), ...highlights]
            .flatMap((a) => [a.quote, a.quoteAlt])
            .filter((q): q is string => Boolean(q)),
        )];
        const echoRange = echo?.nodeKey === s.nodeKey ? echo : null;
        const sectionEcho = echo?.nodeKey === s.nodeKey ? livePhraseEcho : null;
        void annVersion;
        const folded = collapsible && collapsed.has(s.anchor);
        return (
          <section
            className={`reader-section${s.sectionClass ? ` ${s.sectionClass}` : ''}${folded ? ' collapsed' : ''}`}
            key={s.anchor}
            data-section={s.anchor}
            data-nodekey={s.nodeKey}
          >
            <div
              className="head"
              onClick={collapsible ? () => toggleSection(s.anchor) : undefined}
              role={collapsible ? 'button' : undefined}
              aria-expanded={collapsible ? !folded : undefined}
              title={collapsible ? (folded ? 'Unfold section' : 'Fold section away') : undefined}
            >
              {collapsible && <span className="chev">{folded ? '▸' : '▾'}</span>}
              <h3>{s.title}</h3>
              {s.meta}
            </div>
            {folded ? null : (
              <>
                {s.beforeText}
                {narrow ? (
                  <BilingualText
                    layout="interleaved"
                    latin={s.latin}
                    english={s.english}
                    quotes={quotes}
                    echoLine={echoRange?.from}
                    echoTo={echoRange?.to}
                    selectionEcho={sectionEcho ?? undefined}
                    marks={annMarks}
                    notes={noteCallouts}
                  />
                ) : (
                  <div className="bilingual">
                    <div className="latin" lang="la">
                      <span className="lang-tag">Latine</span>
                      {s.latin ? (
                        <TextLines
                          text={s.latin}
                          quotes={quotes}
                          echoLine={echoRange?.from}
                          echoTo={echoRange?.to}
                          selectionEcho={sectionEcho?.lang === 'latin' ? sectionEcho : undefined}
                          lang="latin"
                          marks={annMarks}
                          notes={noteCallouts}
                        />
                      ) : (
                        <p style={{ opacity: 0.5 }}>—</p>
                      )}
                    </div>
                    <div className="english" lang="en">
                      <span className="lang-tag">English</span>
                      {s.english ? (
                        <TextLines
                          text={s.english}
                          quotes={quotes}
                          echoLine={echoRange?.from}
                          echoTo={echoRange?.to}
                          selectionEcho={sectionEcho?.lang === 'english' ? sectionEcho : undefined}
                          lang="english"
                          marks={annMarks}
                          notes={noteCallouts}
                        />
                      ) : (
                        <p style={{ opacity: 0.5 }}>—</p>
                      )}
                    </div>
                  </div>
                )}
                {s.afterText}
                {anns.length > 0 && (
                  <div className="ann-list">
                    <div className="ann-heading">ANNOTATIONS</div>
                    {anns.map((a: Annotation) => (
                      <div className={`ann-item${a.note ? '' : ' ann-highlight'}`} key={a.id}>
                        <button
                          title={a.note ? 'Remove annotation' : 'Remove highlight'}
                          onClick={() => { removeAnnotation(a.id); setAnnVersion((v) => v + 1); }}
                        >
                          ×
                        </button>
                        <span className="quote">“{a.quote.slice(0, 90)}”</span>
                        {a.note && <div className="ck-content" dangerouslySetInnerHTML={{ __html: a.note }} />}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        );
      })}

      {callout && (
        <div
          ref={calloutElRef}
          className="xlate-callout"
          style={{
            left: callout.placement ? callout.placement.left : callout.anchor.left,
            top: callout.placement ? callout.placement.top : callout.anchor.top,
            visibility: callout.placement ? 'visible' : 'hidden',
          }}
          data-side={callout.placement?.side}
        >
          <b>{callout.echo.word}</b>
          <span className="xlate-callout-line">{(callout.echo.line ?? '').slice(0, 90)}</span>
        </div>
      )}

      {menu && (
        <div
          className="ctx-menu"
          ref={menuElRef}
          style={{
            left: menu.placement ? menu.placement.left : menu.anchor.left,
            top: menu.placement ? menu.placement.top : menu.anchor.top,
            visibility: menu.placement ? 'visible' : 'hidden',
          }}
          data-side={menu.placement?.side}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div className="sel">“{menu.term.slice(0, 80)}{menu.term.length > 80 ? '…' : ''}”</div>
          {onAction && (
            <>
              <button onClick={() => { onAction({ kind: 'meaning', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
                ✠ Catholic meaning of “{menu.term.slice(0, 24)}{menu.term.length > 24 ? '…' : ''}”
              </button>
              <button onClick={() => { onAction({ kind: 'similar', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
                ≈ Similar passages (vector)
              </button>
              <button onClick={() => { onAction({ kind: 'crossrefs', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
                🕸 Cross-references (graph)
              </button>
            </>
          )}
          <button onClick={() => { void copyText(menu.term); setMenu(null); }}>
            ⧉ Copy
          </button>
          <button
            onClick={() => {
              // Share-passage landing (operator directive 2026-08-16): the
              // copied link opens the plaque page, whose CTA opens the app
              // here. Destination = the current app position (its hash when
              // one exists, else today's reader).
              const today = new Date();
              const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const dest = /^#\/(day|verse|section|acc)\//.test(location.hash) ? location.hash : `#/day/${iso}`;
              const section = menu.nodeKey ? sectionFor(menu.nodeKey) : null;
              const url = shareUrl(shareLandingHash({
                quote: menu.term,
                quoteAlt: alignedAlt(menu) ?? undefined,
                title: typeof section?.title === 'string' ? section.title : undefined,
                source: section ? section.nodeKey.replace(/^section:/, '') : (menu.nodeKey ?? undefined),
                dest,
              }));
              void copyText(url);
              setMenu(null);
            }}
          >
            ⛓ Share passage
          </button>
          <button onClick={() => { highlight(menu); setMenu(null); }}>
            ▮ Highlight
          </button>
          <button onClick={() => { setNoteFor(menu); setNoteText(''); setMenu(null); }}>
            ✎ Annotate
          </button>
          {onCapture && (
            <button
              onClick={() => {
                onCapture({ quote: menu.term, quoteAlt: alignedAlt(menu), anchor: menu.nodeKey });
                setMenu(null);
              }}
            >
              ✎ Add to Journal/Homily notes
            </button>
          )}
          {menuExtras?.({ term: menu.term, nodeKey: menu.nodeKey, line: menu.line, close: () => setMenu(null) })}
        </div>
      )}

      {noteFor && (
        <div
          className="ctx-menu"
          ref={menuElRef}
          style={{
            left: noteFor.placement ? noteFor.placement.left : noteFor.anchor.left,
            top: noteFor.placement ? noteFor.placement.top : noteFor.anchor.top,
            visibility: noteFor.placement ? 'visible' : 'hidden',
          }}
          data-side={noteFor.placement?.side}
        >
          <div className="sel">“{noteFor.term.slice(0, 60)}…”</div>
          <div style={{ padding: '4px 8px', width: 320 }}>
            <RichTextEditor
              preset="compact"
              placeholder="Margin note…"
              onReady={(editor) => editor.editing.view.focus()}
              onChange={setNoteText}
            />
            <div className="jsc-toolbar">
              <button
                className="primary"
                onClick={() => {
                  if (noteFor.nodeKey) {
                    addAnnotation({
                      nodeKey: noteFor.nodeKey,
                      quote: noteFor.term,
                      quoteAlt: alignedAlt(noteFor),
                      range: noteFor.range?.src,
                      rangeAlt: noteFor.range?.alt,
                      note: noteText,
                      color: 'gold',
                    });
                    setAnnVersion((v) => v + 1);
                  }
                  setNoteFor(null);
                }}
              >
                Save annotation
              </button>
              <button onClick={() => setNoteFor(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
