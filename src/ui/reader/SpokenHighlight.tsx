/**
 * TT.4 — the glow highlight rides the spoken sentence (§K.4/§K.8; amended
 * 2026-11-06, §L.9; L-audiobook-20261106.md S2, S10).
 *
 * Subscribes to the K.4 pipeline's module-level sentence bus
 * (`subscribeSpoken`, TT.3). On `started` for exactly this `text`, the
 * sentence is located inside the container's text nodes (whitespace-
 * insensitive, on `normalizeWs`), a `Range` is built, and a
 * `pointer-events: none`, `aria-hidden` overlay of `.spoken-glow` rects is
 * drawn from `range.getClientRects()` (recomputed on scroll and resize; the
 * layer renders in place, so it stacks with its host surface). It
 * clears on `ended`, or when another text starts. It advances strictly on
 * pipeline sentence events — never on a timer.
 *
 * `container` is the element whose text is searched; `null` means the
 * element this component is mounted in (its parent), which is how
 * SectionReader (per section) and ChatView (per assistant bubble) mount it.
 *
 * S10: the audiobook does not use `.spoken-glow`; nothing is ever drawn for
 * a container inside `#supertonic-tts-dock`.
 */
import { useEffect, useRef, useState } from 'react';
import { subscribeSpoken, type SpokenEvent } from '../../core/voice/pipeline.ts';
import { normalizeWs } from '../../core/voice/sentences.ts';
import './spokenGlow.css';

type GlowRect = { left: number; top: number; width: number; height: number };
type Active = { text: string; range: Range; rects: GlowRect[] };

const AUDIOBOOK_DOCK = '#supertonic-tts-dock';

/**
 * Find `sentence` in `root`'s text nodes, comparing with all whitespace
 * removed (so block boundaries, line breaks and `normalizeWs` differences
 * never prevent a match). The search starts at squeezed offset `from` (the
 * previous sentence's end) and falls back to the start of the text.
 */
export function findSentenceRange(root: HTMLElement, sentence: string, from = 0): { range: Range; end: number } | null {
  const needle = normalizeWs(sentence).replace(/ /g, '');
  if (!needle) return null;
  const nodes: Text[] = [];
  const offsets: number[] = [];
  const nodeIndex: number[] = [];
  let hay = '';
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const node = n as Text;
    const value = node.data;
    for (let i = 0; i < value.length; i++) {
      if (/\s/.test(value[i])) continue;
      hay += value[i];
      offsets.push(i);
      nodeIndex.push(nodes.length);
    }
    nodes.push(node);
  }
  let at = hay.indexOf(needle, from);
  if (at < 0) at = hay.indexOf(needle);
  if (at < 0) return null;
  const last = at + needle.length - 1;
  const range = document.createRange();
  range.setStart(nodes[nodeIndex[at]], offsets[at]);
  range.setEnd(nodes[nodeIndex[last]], offsets[last] + 1);
  return { range, end: last + 1 };
}

/** The visible box the sentence can be seen through: the viewport, narrowed by its scroll parent. */
function visibleBox(el: HTMLElement | null): { top: number; bottom: number; left: number; right: number } {
  const box = { top: 0, bottom: window.innerHeight, left: 0, right: window.innerWidth };
  const sp = el ? scrollParent(el) : null;
  if (sp) {
    const b = sp.getBoundingClientRect();
    box.top = Math.max(box.top, b.top);
    box.bottom = Math.min(box.bottom, b.bottom);
    box.left = Math.max(box.left, b.left);
    box.right = Math.min(box.right, b.right);
  }
  return box;
}

/** Client rects of the range, clipped to what is visible (fixed rects escape overflow clipping). */
function rectsOf(range: Range): GlowRect[] {
  const clip = visibleBox(range.startContainer.parentElement);
  const out: GlowRect[] = [];
  for (const r of Array.from(range.getClientRects())) {
    const left = Math.max(r.left - 1, clip.left);
    const right = Math.min(r.right + 1, clip.right);
    const top = Math.max(r.top, clip.top);
    const bottom = Math.min(r.bottom, clip.bottom);
    if (right > left && bottom > top) out.push({ left, top, width: right - left, height: bottom - top });
  }
  return out;
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const overflow = getComputedStyle(p).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** Auto-scroll only when the sentence is out of view; never yanks the page otherwise. */
function revealIfHidden(range: Range): void {
  const el = range.startContainer.parentElement;
  if (!el) return;
  const r = range.getBoundingClientRect();
  const box = visibleBox(el);
  if (r.top >= box.top && r.bottom <= box.bottom) return;
  el.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export default function SpokenHighlight({ text, container }: { text: string; container: HTMLElement | null }) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const cursorRef = useRef(0);
  const [active, setActive] = useState<Active | null>(null);

  useEffect(() => {
    return subscribeSpoken((e: SpokenEvent) => {
      if (e.text !== text) {
        if (e.phase === 'started') setActive(null); // another text started
        return;
      }
      if (e.phase === 'ended') {
        setActive(null);
        return;
      }
      const root = container ?? anchorRef.current?.parentElement ?? null;
      if (!root || root.closest(AUDIOBOOK_DOCK)) return;
      if (e.sentenceIndex === 0) cursorRef.current = 0;
      const hit = findSentenceRange(root, e.sentence, cursorRef.current);
      if (!hit) {
        setActive(null);
        return;
      }
      cursorRef.current = hit.end;
      setActive({ text, range: hit.range, rects: rectsOf(hit.range) });
      revealIfHidden(hit.range);
    });
  }, [text, container]);

  const range = active?.text === text ? active.range : null;

  useEffect(() => {
    if (!range) return;
    let frame = 0;
    const recompute = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() =>
        setActive((prev) => (prev && prev.range === range ? { ...prev, rects: rectsOf(range) } : prev)),
      );
    };
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
    };
  }, [range]);

  const rects = range && active ? active.rects : [];
  return (
    <>
      <span ref={anchorRef} hidden aria-hidden="true" />
      {rects.length > 0 && (
        <span className="spoken-glow-layer" aria-hidden="true">
          {rects.map((r, i) => (
            <span
              key={i}
              className="spoken-glow"
              style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
            />
          ))}
        </span>
      )}
    </>
  );
}
