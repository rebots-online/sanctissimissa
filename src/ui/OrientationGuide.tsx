import { useEffect, useRef, useState } from 'react';
import defaults from '../../config/companion-defaults.json';
import { COMPANION_LAYOUT, GUIDE_CHANGED, GUIDE_STEPS, OPEN_COMPANION, START_GUIDE, activateGuide, clampGuidePos,
  clearGuide, highlightGuide, readGuidePos, readGuideState, saveGuidePos, saveGuideState } from '../core/orientation/guide.ts';
import type { GuidePos } from '../core/orientation/guide.ts';
import { compactDock, occupiedRects, resolveGuidePlacement } from '../core/orientation/layout.ts';

const DRAG_THRESHOLD = 4;

export default function OrientationGuide() {
  const [saved] = useState(readGuideState);
  const [offered, setOffered] = useState(defaults.offerOrientationUntilCompleted && !saved.completed);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(saved.step);
  const [pointed, setPointed] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
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
  if (!active && !pointed) return null;
  const label = GUIDE_STEPS.find((item) => item.id === pointed)?.label ?? GUIDE_STEPS[step].label;
  const stepBody = <>
    <p>{active ? GUIDE_STEPS[step].text : `The Companion has highlighted ${label}.`}</p>
    {unavailable && <p>This control is not visible just now. You can continue the tour or ask the Companion.</p>}
  </>;
  return <aside ref={cardRef} tabIndex={0} style={style}
    className={compact ? 'orientation-guide orientation-compact' : 'orientation-guide'}
    aria-label="Orientation guide"
    onPointerDown={onCardPointerDown} onPointerMove={onCardPointerMove} onPointerUp={endCardDrag}
    onPointerCancel={endCardDrag} onKeyDown={onCardKeyDown}>
    <strong>
      <span className="orientation-grip" aria-hidden="true">⠿</span>
      {active ? `Step ${step + 1} of ${GUIDE_STEPS.length}: ${GUIDE_STEPS[step].label}` : label}
    </strong>
    <span className="orientation-drag-hint">Drag to move</span>
    {compact ? <details><summary>Details</summary>{stepBody}</details> : stepBody}
    <div className="orientation-actions">
      <button onClick={() => setUnavailable(!activateGuide())}>Show me</button>
      {active && <button onClick={explain}>Ask Companion to explain</button>}
      {active && step > 0 && <button onClick={() => setStep((value) => value - 1)}>Back</button>}
      {active && (step < GUIDE_STEPS.length - 1
        ? <button onClick={() => setStep((value) => value + 1)}>Next</button>
        : <button onClick={() => { saveGuideState({ completed: true, step }); leave(); }}>Finish orientation</button>)}
      <button onClick={leave}>{active ? 'Continue later' : 'Close guide'}</button>
      <button onClick={resetPlacement}>Reset position</button>
    </div>
  </aside>;
}
