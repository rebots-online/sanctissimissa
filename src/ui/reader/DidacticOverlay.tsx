/**
 * HD.2 (§K.8) — the didactic overlay: the Sacristan teaches ON the page.
 *
 * A fixed full-viewport SVG layer (pointer-events: none, aria-hidden,
 * z-order BELOW the Sacristan panel) that draws:
 *  - `circle`: an animated stroke ellipse hugging the target rect (+8 px —
 *    the retired OG.9 spotlight geometry);
 *  - `arrow`: a curved gold path between two anchors with an arrowhead,
 *    600 ms stroke-dash reveal (reduced-motion: static);
 *  - `highlight`: the shared `.orientation-target` halo on the live element;
 *  - `focus-swap`: the Sacristan panel recedes (`.receded`) while the held
 *    target keeps the §H halo;
 *  - `[[show-path]]` walkthrough: one user-paced step at a time with a
 *    narration caption (successor to the removed OG.10 card walkthrough).
 *
 * Marks fade after 6 s unless annotated; everything clears on view change.
 * The overlay never fakes: an anchor with no live element records a
 * diagnostics skip and renders nothing.
 */

import { useEffect, useRef, useState } from 'react';
import {
  COMPANION_SHOWPATH_EVENT,
  DIDACTIC_ACT,
  GUIDE_CHANGED,
  SACRISTAN_LAYOUT,
  pathTargetElement,
  type DidacticActDetail,
  type PathStep,
} from '../../core/orientation/guide.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';
import { DIDACTIC_FADE_MS, ellipseGeometry, arrowGeometry, rectOf } from './didacticGeometry.ts';

interface CircleMark { id: number; kind: 'circle'; anchor: string; note: string | null }
interface ArrowMark { id: number; kind: 'arrow'; anchor: string; anchorB: string }
type Mark = CircleMark | ArrowMark;

let markSeq = 1;

/** The live element for a section anchor — attribute compare, never faked. */
function sectionElement(anchor: string): HTMLElement | null {
  return pathTargetElement(`section:${anchor}`);
}

export default function DidacticOverlay({ view }: { view: string }) {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [receded, setReceded] = useState(false);
  const [path, setPath] = useState<{ steps: PathStep[]; index: number } | null>(null);
  /** Bumped on any layout change so marks re-read live rects at render. */
  const [, setTick] = useState(0);
  const recededRef = useRef(false);
  recededRef.current = receded;

  const clearHeldTarget = () => {
    for (const previous of document.querySelectorAll('.orientation-target')) previous.classList.remove('orientation-target');
  };

  // HD.2: App's forwarded didactic acts + the re-absorbed show-path channel.
  useEffect(() => {
    const onDidactic = (e: Event) => {
      const detail = (e as CustomEvent).detail as DidacticActDetail | null;
      if (!detail || typeof detail.kind !== 'string') return;
      if (detail.kind === 'circle') {
        const anchor = String(detail.anchor ?? '');
        if (!anchor || !sectionElement(anchor)) {
          debugEvent('didactic', 'mark.skip', { kind: detail.kind, anchor, reason: 'anchor-not-live' }, 'warn');
          return;
        }
        const mark: CircleMark = { id: markSeq++, kind: 'circle', anchor, note: detail.note ?? null };
        setMarks((prev) => [...prev, mark]);
        if (!mark.note) setTimeout(() => setMarks((prev) => prev.filter((m) => m.id !== mark.id)), DIDACTIC_FADE_MS);
        debugEvent('didactic', 'mark.circle', { anchor, noted: Boolean(mark.note) }, 'info');
        return;
      }
      if (detail.kind === 'arrow') {
        const anchor = String(detail.anchor ?? '');
        const anchorB = String(detail.anchorB ?? '');
        if (!anchor || !anchorB || !sectionElement(anchor) || !sectionElement(anchorB)) {
          debugEvent('didactic', 'mark.skip', { kind: detail.kind, anchor, anchorB, reason: 'anchor-not-live' }, 'warn');
          return;
        }
        const mark: ArrowMark = { id: markSeq++, kind: 'arrow', anchor, anchorB };
        setMarks((prev) => [...prev, mark]);
        setTimeout(() => setMarks((prev) => prev.filter((m) => m.id !== mark.id)), DIDACTIC_FADE_MS);
        debugEvent('didactic', 'mark.arrow', { anchor, anchorB }, 'info');
        return;
      }
      if (detail.kind === 'highlight') {
        const anchor = String(detail.anchor ?? '');
        const el = anchor ? sectionElement(anchor) : null;
        if (!el) {
          debugEvent('didactic', 'mark.skip', { kind: detail.kind, anchor, reason: 'anchor-not-live' }, 'warn');
          return;
        }
        clearHeldTarget();
        el.classList.add('orientation-target');
        window.dispatchEvent(new CustomEvent(GUIDE_CHANGED, { detail: { id: anchor } }));
        debugEvent('didactic', 'mark.highlight', { anchor }, 'info');
        return;
      }
      // focus-swap: recede the panel (class only, never React state); the
      // held §H halo stays with the target. A second swap restores.
      const panel = document.querySelector<HTMLElement>('.chat-panel');
      const next = !recededRef.current;
      setReceded(next);
      panel?.classList.toggle('receded', next);
      window.dispatchEvent(new CustomEvent(SACRISTAN_LAYOUT));
      debugEvent('didactic', 'focus-swap', { receded: next }, 'info');
    };
    const onShowPath = (e: Event) => {
      const steps = (e as CustomEvent<{ steps?: PathStep[] }>).detail?.steps;
      if (!Array.isArray(steps) || steps.length === 0) return;
      setMarks([]);
      setPath({ steps, index: 0 });
      debugEvent('didactic', 'path.enter', { steps: steps.length }, 'info');
    };
    window.addEventListener(DIDACTIC_ACT, onDidactic);
    window.addEventListener(COMPANION_SHOWPATH_EVENT, onShowPath);
    return () => {
      window.removeEventListener(DIDACTIC_ACT, onDidactic);
      window.removeEventListener(COMPANION_SHOWPATH_EVENT, onShowPath);
    };
  }, []);

  // Everything clears on view change/navigation — never a stale mark.
  useEffect(() => {
    setMarks([]);
    setPath(null);
    clearHeldTarget();
    setReceded(false);
    document.querySelector('.chat-panel')?.classList.remove('receded');
  }, [view]);

  // Marks re-read live rects on every layout change (scroll/resize/panel
  // announcements/guide-target changes) — a mark hugs its element, never a
  // stored rectangle.
  useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    window.addEventListener('resize', bump);
    window.addEventListener('scroll', bump, { capture: true, passive: true });
    window.addEventListener(GUIDE_CHANGED, bump);
    window.addEventListener(SACRISTAN_LAYOUT, bump);
    return () => {
      window.removeEventListener('resize', bump);
      window.removeEventListener('scroll', bump, true);
      window.removeEventListener(GUIDE_CHANGED, bump);
      window.removeEventListener(SACRISTAN_LAYOUT, bump);
    };
  }, []);

  // The show-path walk: each step holds its target (halo + center scroll);
  // a step with no live element is skipped with a record, never faked.
  useEffect(() => {
    if (!path) return;
    if (path.index >= path.steps.length) {
      clearHeldTarget();
      setPath(null);
      return;
    }
    const current = path.steps[path.index];
    if (!current || !current.target) { setPath((p) => (p ? { ...p, index: p.index + 1 } : p)); return; }
    const el = pathTargetElement(current.target);
    if (!el) {
      debugEvent('didactic', 'path.skip', { target: current.target, index: path.index }, 'warn');
      setPath((p) => (p ? { ...p, index: p.index + 1 } : p));
      return;
    }
    clearHeldTarget();
    el.classList.add('orientation-target');
    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  }, [path]);

  const step = path && path.index < path.steps.length ? path.steps[path.index] : null;

  return (
    <>
      {marks.length > 0 && (
        <svg className="didactic-overlay" aria-hidden="true" data-count={marks.length}>
          {marks.map((mark) => {
            if (mark.kind === 'circle') {
              const el = sectionElement(mark.anchor);
              if (!el) return null;
              const g = ellipseGeometry(rectOf(el));
              return <ellipse key={mark.id} className={`didactic-circle${mark.note ? ' annotated' : ''}`} cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} pathLength={100} />;
            }
            const from = sectionElement(mark.anchor);
            const to = sectionElement(mark.anchorB);
            if (!from || !to) return null;
            const g = arrowGeometry(rectOf(from), rectOf(to));
            return (
              <g key={mark.id} className="didactic-arrow-g">
                <path className="didactic-arrow" d={g.path} pathLength={100} />
                <path className="didactic-arrow-head" d={g.head} />
              </g>
            );
          })}
        </svg>
      )}
      {step && (
        <div className="didactic-caption" role="status">
          <p>{step.narration || step.target}</p>
          <div className="didactic-caption-actions">
            <span className="didactic-caption-step">{path ? path.index + 1 : 0} / {path ? path.steps.length : 0}</span>
            <button type="button" onClick={() => setPath((p) => (p ? { ...p, index: p.index + 1 } : p))}>
              {path && path.index + 1 >= path.steps.length ? 'Finish' : 'Next'}
            </button>
            <button type="button" onClick={() => { clearHeldTarget(); setPath(null); }}>End</button>
          </div>
        </div>
      )}
    </>
  );
}
