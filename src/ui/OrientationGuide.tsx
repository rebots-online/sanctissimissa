import { useEffect, useRef, useState } from 'react';
import defaults from '../../config/companion-defaults.json';
import { COMPANION_LAYOUT, GUIDE_CHANGED, GUIDE_STEPS, OPEN_COMPANION, START_GUIDE, activateGuide, clampGuidePos,
  clearGuide, guideTarget, highlightGuide, readGuidePos, readGuideState, saveGuidePos, saveGuideState } from '../core/orientation/guide.ts';
import type { GuidePos, PathStep } from '../core/orientation/guide.ts';
import { compactDock, occupiedRects, resolveGuidePlacement } from '../core/orientation/layout.ts';
import { debugEvent } from '../core/diagnostics/store.ts';

const DRAG_THRESHOLD = 4;
/** OG.10 (§H.4): the channel App (CL.2) forwards [[show-path:…]] steps on
 * (detail { steps: PathStep[] }); mirrors App.tsx's private const exactly. */
const COMPANION_SHOWPATH = 'sanctissimissa:companion-showpath';
/** OG.9 (§H.3): the cutout hugs the live .orientation-target rect grown this much. */
const SPOTLIGHT_GROW = 8;
interface SpotlightRect { left: number; top: number; width: number; height: number }
/** One didactic walkthrough in progress (OG.10): the parsed steps plus the
 * step currently being walked. */
interface PathWalk { steps: PathStep[]; index: number }
/** Live-element lookup by attribute compare — App's own pattern (CL.2 focus):
 * the attribute name is a fixed literal, the value never enters a selector. */
function findByAttribute(root: Document, name: string, value: string): HTMLElement | null {
  return [...root.querySelectorAll<HTMLElement>(`[${name}]`)]
    .find((element) => element.getAttribute(name) === value && element.getBoundingClientRect().width > 0 && !element.hasAttribute('disabled')) ?? null;
}
/** Resolve one [[show-path]] step token to its live element — never faked:
 * view:<View> → the rail's own nav button for that view ([data-guide="nav-<view>"]);
 * section:<anchor> → the live [data-section] node; anything else must be a
 * registered guide id (guideTarget). A step with no live element is skipped. */
function pathTargetElement(target: string, root: Document = document): HTMLElement | null {
  const view = /^view:([a-z-]+)$/.exec(target);
  if (view) return findByAttribute(root, 'data-guide', `nav-${view[1]}`);
  const section = /^section:(.+)$/.exec(target);
  if (section) { const anchor = section[1].trim(); return anchor ? findByAttribute(root, 'data-section', anchor) : null; }
  return guideTarget(target, root);
}
/** Human name for a step token, for the card heading when the reply carried
 * no narration line for it. */
const pathTargetLabel = (target: string): string => {
  const view = /^view:([a-z-]+)$/.exec(target);
  if (view) return view[1];
  const section = /^section:(.+)$/.exec(target);
  if (section) return section[1].trim();
  return GUIDE_STEPS.find((item) => item.id === target)?.label ?? target;
};

export default function OrientationGuide() {
  const [saved] = useState(readGuideState);
  const [offered, setOffered] = useState(defaults.offerOrientationUntilCompleted && !saved.completed);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(saved.step);
  const [pointed, setPointed] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [path, setPath] = useState<PathWalk | null>(null);
  const [spotRect, setSpotRect] = useState<SpotlightRect | null>(null);
  const [compact, setCompact] = useState(false);
  const [pos, setPos] = useState<GuidePos | null>(null);
  const posRef = useRef<GuidePos | null>(null);
  const cardRef = useRef<HTMLElement | null>(null);
  const press = useRef<{ id: number; startX: number; startY: number; dx: number; dy: number; engaged: boolean } | null>(null);
  const applyPos = (next: GuidePos) => { posRef.current = next; setPos(next); };
  const cardSize = () => ({ w: cardRef.current?.offsetWidth ?? 340, h: cardRef.current?.offsetHeight ?? 200 });
  useEffect(() => {
    const restart = () => { setStep(0); setActive(true); setOffered(false); saveGuideState({ completed: false, step: 0 }); };
    const changed = (event: Event) => setPointed((event as CustomEvent<{ id: string }>).detail.id);
    window.addEventListener(START_GUIDE, restart);
    window.addEventListener(GUIDE_CHANGED, changed);
    return () => { window.removeEventListener(START_GUIDE, restart); window.removeEventListener(GUIDE_CHANGED, changed); clearGuide(); };
  }, []);
  useEffect(() => {
    if (!active) return;
    const id = GUIDE_STEPS[step].id;
    if (id === 'companion') window.dispatchEvent(new CustomEvent(OPEN_COMPANION));
    const timer = setTimeout(() => setUnavailable(!highlightGuide(id)), 0);
    saveGuideState({ completed: false, step });
    return () => clearTimeout(timer);
  }, [step, active]);
  // ── OG.10 (§H.4): didactic path walkthrough ────────────────────────────
  // App (CL.2) forwards a [[show-path:…]] reply as COMPANION_SHOWPATH with
  // the narration steps attached; the walkthrough borrows this card, one
  // user-paced step at a time.
  useEffect(() => {
    const onShowPath = (event: Event) => {
      const steps = (event as CustomEvent<{ steps?: PathStep[] }>).detail?.steps;
      if (!Array.isArray(steps) || steps.length === 0) return;
      setOffered(false);
      setPath({ steps, index: 0 });
      debugEvent('orientation', 'path.enter', { steps: steps.length }, 'info');
    };
    window.addEventListener(COMPANION_SHOWPATH, onShowPath);
    return () => window.removeEventListener(COMPANION_SHOWPATH, onShowPath);
  }, []);
  useEffect(() => {
    if (!path) return;
    if (path.index >= path.steps.length) { endPath(); return; }
    const current = path.steps[path.index];
    const element = pathTargetElement(current.target);
    if (!element) {
      // not live-rendered: skipped with a diagnostics record — never faked
      debugEvent('orientation', 'path.skip', { target: current.target, index: path.index }, 'warn');
      setPath((walk) => walk && { ...walk, index: walk.index + 1 });
      return;
    }
    for (const previous of document.querySelectorAll('.orientation-target')) previous.classList.remove('orientation-target');
    element.classList.add('orientation-target');
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    debugEvent('orientation', 'path.step', { target: current.target, index: path.index }, 'info');
    // The spotlight effect below (declared after this one) recomputes on the
    // same commit, so each step's target is haloed the moment it is held.
  }, [path]);
  // ── OG.9 (§H.3): tour spotlight — dim veil + halo cutout ───────────────
  // The veil renders only while the card itself holds a highlighted target
  // (a tour step or a show-path step — the shared .orientation-target
  // grammar); a bare Companion [[guide:]] pointer stays a pointer, no dim,
  // and no target means no spotlight at all.
  useEffect(() => {
    const held = active || path !== null;
    if (!held) { setSpotRect(null); return; }
    const recompute = () => {
      const target = document.querySelector<HTMLElement>('.orientation-target');
      const rect = target?.getBoundingClientRect();
      if (!target || !rect || rect.width <= 0) { setSpotRect(null); return; }
      const next = {
        left: Math.round(rect.left - SPOTLIGHT_GROW),
        top: Math.round(rect.top - SPOTLIGHT_GROW),
        width: Math.round(rect.width + SPOTLIGHT_GROW * 2),
        height: Math.round(rect.height + SPOTLIGHT_GROW * 2),
      };
      setSpotRect((previous) => previous && previous.left === next.left && previous.top === next.top
        && previous.width === next.width && previous.height === next.height ? previous : next);
    };
    recompute();
    window.addEventListener('resize', recompute);
    window.addEventListener('scroll', recompute, { capture: true, passive: true });
    window.addEventListener(COMPANION_LAYOUT, recompute); // a §D validation trigger
    window.addEventListener(GUIDE_CHANGED, recompute); // the held target changed
    const observer = new ResizeObserver(recompute);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', recompute);
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener(COMPANION_LAYOUT, recompute);
      window.removeEventListener(GUIDE_CHANGED, recompute);
      observer.disconnect();
    };
  }, [active, path, step, pointed]);
  useEffect(() => {
    const reclamp = () => {
      const current = posRef.current;
      if (!current) return;
      const size = cardSize();
      const next = clampGuidePos(current, size.w, size.h);
      saveGuidePos(next);
      applyPos(next);
    };
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, []);
  useEffect(() => {
    const validatePlacement = () => {
      const viewport = { w: window.innerWidth, h: window.innerHeight };
      const occupied = occupiedRects(document);
      const size = cardSize();
      const resolved = resolveGuidePlacement(viewport, occupied, size, readGuidePos());
      if (resolved === 'compact') {
        // §D: compact docks at the TOP of the largest free horizontal band —
        // never at the obstructed position it was displaced from.
        const dock = compactDock(viewport, occupied, { w: Math.min(size.w, 300), h: Math.min(size.h, 200) });
        saveGuidePos(dock);
        applyPos(dock);
        setCompact(true);
        return;
      }
      setCompact(false);
      const current = posRef.current;
      if (current && current.left === resolved.left && current.top === resolved.top) return;
      saveGuidePos(resolved);
      applyPos(resolved);
    };
    validatePlacement();
    window.addEventListener('resize', validatePlacement);
    window.addEventListener(START_GUIDE, validatePlacement);
    window.addEventListener(COMPANION_LAYOUT, validatePlacement);
    const observer = new ResizeObserver(validatePlacement);
    observer.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', validatePlacement);
      window.removeEventListener(START_GUIDE, validatePlacement);
      window.removeEventListener(COMPANION_LAYOUT, validatePlacement);
      observer.disconnect();
    };
  }, [step]);
  const onCardPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    press.current = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: event.clientX - rect.left,
      dy: event.clientY - rect.top,
      engaged: false,
    };
  };
  const onCardPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const state = press.current;
    const card = cardRef.current;
    if (!state || !card || event.pointerId !== state.id) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) { press.current = null; return; }
    if (!state.engaged) {
      const traveled = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
      if (traveled <= DRAG_THRESHOLD) return;
      state.engaged = true;
      card.classList.add('dragging');
      card.setPointerCapture(event.pointerId);
    }
    const next = clampGuidePos(
      { left: event.clientX - state.dx, top: event.clientY - state.dy },
      card.offsetWidth,
      card.offsetHeight,
    );
    applyPos(next);
  };
  const endCardDrag = (event: React.PointerEvent<HTMLElement>) => {
    const state = press.current;
    if (!state || event.pointerId !== state.id) return;
    press.current = null;
    if (!state.engaged) return;
    cardRef.current?.classList.remove('dragging');
    if (posRef.current) saveGuidePos(posRef.current);
  };
  const resetPlacement = () => {
    // Reset is a self-heal, not a teleport: a currently-valid position is
    // kept (the resolver honors it as the saved value); only an invalid,
    // off-screen or obstructed position is re-resolved (operator 2026-09-19:
    // "clicking 'reset position' unnecessarily warps the card").
    const size = cardSize();
    const resolved = resolveGuidePlacement(
      { w: window.innerWidth, h: window.innerHeight },
      occupiedRects(document),
      size,
      posRef.current,
    );
    if (resolved === 'compact') { setCompact(true); return; }
    setCompact(false);
    if (posRef.current && posRef.current.left === resolved.left && posRef.current.top === resolved.top) return;
    saveGuidePos(resolved);
    applyPos(resolved);
  };
  const onCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Home') { event.preventDefault(); resetPlacement(); return; }
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    const distance = event.shiftKey ? 96 : 16;
    const left = event.key === 'ArrowLeft' ? -distance : event.key === 'ArrowRight' ? distance : 0;
    const top = event.key === 'ArrowUp' ? -distance : event.key === 'ArrowDown' ? distance : 0;
    const card = cardRef.current;
    const rect = card?.getBoundingClientRect();
    const base = posRef.current ?? (rect ? { left: Math.round(rect.left), top: Math.round(rect.top) } : { left: 16, top: 64 });
    const size = cardSize();
    const next = clampGuidePos({ left: base.left + left, top: base.top + top }, size.w, size.h);
    saveGuidePos(next);
    applyPos(next);
  };
  const leave = () => { setActive(false); setOffered(false); setPointed(null); clearGuide(); };
  // ── OG.10 (§H.4): path-mode controls ───────────────────────────────────
  /** Ending the walkthrough restores the normal card and clears the veil; a
   * tour interrupted by the walkthrough resumes its own highlighted step. */
  const endPath = () => {
    setPath(null);
    setSpotRect(null);
    clearGuide();
    if (active) setUnavailable(!highlightGuide(GUIDE_STEPS[step].id));
  };
  /** Show me on a path step executes the step's own action: reveal the target
   * with the §D showing pulse, then activate the control itself through the
   * app's own click path — never a synthetic navigation around it. Content
   * sections (section:<anchor>) are revealed, not clicked. */
  const activatePathStep = () => {
    if (!path || path.index >= path.steps.length) return;
    const current = path.steps[path.index];
    const element = pathTargetElement(current.target);
    if (!element) return;
    element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
    element.classList.remove('orientation-showing');
    // void reflow so the pulse restarts on repeated clicks
    void element.offsetWidth;
    element.classList.add('orientation-showing');
    setTimeout(() => element.classList.remove('orientation-showing'), 1400);
    debugEvent('orientation', 'path.activate', { target: current.target, index: path.index }, 'info');
    (element.closest('button, a, [role="button"]') as HTMLElement | null)?.click();
  };
  const explain = () => window.dispatchEvent(new CustomEvent(OPEN_COMPANION, {
    detail: { prompt: `Please guide me through ${GUIDE_STEPS[step].label}. Explain what the highlighted control does and point it out.` },
  }));
  const style = pos ? { left: pos.left, top: pos.top, right: 'auto' as const, bottom: 'auto' as const } : undefined;
  if (offered) return <aside ref={cardRef} tabIndex={0} style={style}
    className={compact ? 'orientation-offer orientation-compact' : 'orientation-offer'}
    aria-label="Welcome to SanctissiMissa"
    onPointerDown={onCardPointerDown} onPointerMove={onCardPointerMove} onPointerUp={endCardDrag}
    onPointerCancel={endCardDrag} onKeyDown={onCardKeyDown}>
    <strong><span className="orientation-grip" aria-hidden="true">⠿</span>Would you like a short tour?</strong>
    <span className="orientation-drag-hint">Drag to move</span>
    {compact
      ? <details><summary>Details</summary><p>We will point out the controls, one at a time. The Companion can explain more when it is ready.</p></details>
      : <p>We will point out the controls, one at a time. The Companion can explain more when it is ready.</p>}
    <button onClick={() => { setOffered(false); setActive(true); window.dispatchEvent(new CustomEvent(OPEN_COMPANION)); }}>Start orientation</button>
    <button onClick={leave}>Later</button>
    <button onClick={resetPlacement}>Reset position</button>
  </aside>;
  if (!active && !pointed && !path) return null;
  const label = GUIDE_STEPS.find((item) => item.id === pointed)?.label ?? GUIDE_STEPS[step].label;
  // ── OG.10: in path mode the same card walks the reply's steps ──────────
  const pathStep = path && path.index < path.steps.length ? path.steps[path.index] : null;
  const heading = pathStep && path
    ? `Walkthrough ${path.index + 1} of ${path.steps.length}: ${pathTargetLabel(pathStep.target)}`
    : active ? `Step ${step + 1} of ${GUIDE_STEPS.length}: ${GUIDE_STEPS[step].label}` : label;
  const stepBody = <>
    <p>{active ? GUIDE_STEPS[step].text : `The Companion has highlighted ${label}.`}</p>
    {unavailable && <p>This control is not visible just now. You can continue the tour or ask the Companion.</p>}
  </>;
  const pathBody = path && pathStep && (<>
    <p>{pathStep.narration || `Here: ${pathTargetLabel(pathStep.target)}.`}</p>
    <div className="tour-ribbon" aria-hidden="true">
      {path.steps.map((_step, walkIndex) => (
        <span key={walkIndex} className={walkIndex < (path?.index ?? 0) ? 'visited' : walkIndex === (path?.index ?? 0) ? 'current' : ''} />
      ))}
    </div>
  </>);
  const cardBody = path ? pathBody : stepBody;
  return <>
    <aside ref={cardRef} tabIndex={0} style={style}
      className={compact ? 'orientation-guide orientation-compact' : 'orientation-guide'}
      aria-label="Orientation guide"
      onPointerDown={onCardPointerDown} onPointerMove={onCardPointerMove} onPointerUp={endCardDrag}
      onPointerCancel={endCardDrag} onKeyDown={onCardKeyDown}>
      <strong>
        <span className="orientation-grip" aria-hidden="true">⠿</span>
        {heading}
      </strong>
      <span className="orientation-drag-hint">Drag to move</span>
      {compact ? <details><summary>Details</summary>{cardBody}</details> : cardBody}
      <div className="orientation-actions">
        {path ? <>
          <button onClick={activatePathStep}>Show me</button>
          <button onClick={() => setPath((walk) => walk && { ...walk, index: Math.max(0, walk.index - 1) })} disabled={path.index === 0}>Back</button>
          <button onClick={() => setPath((walk) => walk && { ...walk, index: walk.index + 1 })}>Next</button>
          <button onClick={endPath}>End walkthrough</button>
        </> : <>
          <button onClick={() => setUnavailable(!activateGuide())}>Show me</button>
          {active && <button onClick={explain}>Ask Companion to explain</button>}
          {active && step > 0 && <button onClick={() => setStep((value) => value - 1)}>Back</button>}
          {active && (step < GUIDE_STEPS.length - 1
            ? <button onClick={() => setStep((value) => value + 1)}>Next</button>
            : <button onClick={() => { saveGuideState({ completed: true, step }); leave(); }}>Finish orientation</button>)}
          <button onClick={leave}>{active ? 'Continue later' : 'Close guide'}</button>
          <button onClick={resetPlacement}>Reset position</button>
        </>}
      </div>
    </aside>
    {spotRect && <div className="tour-spotlight" aria-hidden="true">
      <div className="tour-spotlight-cutout" style={{ left: spotRect.left, top: spotRect.top, width: spotRect.width, height: spotRect.height }} />
      <div className="tour-spotlight-halo" style={{ left: spotRect.left, top: spotRect.top, width: spotRect.width, height: spotRect.height }} />
    </div>}
  </>;
}
