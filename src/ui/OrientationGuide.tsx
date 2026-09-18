import { useEffect, useRef, useState } from 'react';
import defaults from '../../config/companion-defaults.json';
import { GUIDE_CHANGED, GUIDE_STEPS, OPEN_COMPANION, START_GUIDE, activateGuide, clampGuidePos,
  clearGuide, highlightGuide, readGuidePos, readGuideState, saveGuidePos, saveGuideState } from '../core/orientation/guide.ts';
import type { GuidePos } from '../core/orientation/guide.ts';

export default function OrientationGuide() {
  const [saved] = useState(readGuideState);
  const [offered, setOffered] = useState(defaults.offerOrientationUntilCompleted && !saved.completed);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(saved.step);
  const [pointed, setPointed] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [pos, setPos] = useState<GuidePos | null>(() => readGuidePos());
  const cardRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const last = useRef<GuidePos | null>(null);
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
    const reclamp = () => setPos((current) => {
      if (!current) return current;
      const card = cardRef.current;
      const next = clampGuidePos(current, card?.offsetWidth ?? 340, card?.offsetHeight ?? 200);
      saveGuidePos(next);
      return next;
    });
    window.addEventListener('resize', reclamp);
    return () => window.removeEventListener('resize', reclamp);
  }, []);
  const clampWithCard = (raw: GuidePos): GuidePos =>
    clampGuidePos(raw, cardRef.current?.offsetWidth ?? 340, cardRef.current?.offsetHeight ?? 200);
  const onHeadingPointerDown = (event: React.PointerEvent<HTMLSpanElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    drag.current = { dx: event.clientX - rect.left, dy: event.clientY - rect.top };
    last.current = { left: rect.left, top: rect.top };
    card.classList.add('dragging');
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onHeadingPointerMove = (event: React.PointerEvent<HTMLSpanElement>) => {
    const state = drag.current;
    if (!state) return;
    const next = clampWithCard({ left: event.clientX - state.dx, top: event.clientY - state.dy });
    last.current = next;
    setPos(next);
  };
  const onHeadingPointerUp = () => {
    const card = cardRef.current;
    drag.current = null;
    card?.classList.remove('dragging');
    if (last.current) saveGuidePos(last.current);
  };
  const leave = () => { setActive(false); setOffered(false); setPointed(null); clearGuide(); };
  const explain = () => window.dispatchEvent(new CustomEvent(OPEN_COMPANION, {
    detail: { prompt: `Please guide me through ${GUIDE_STEPS[step].label}. Explain what the highlighted control does and point it out.` },
  }));
  if (offered) return <aside className="orientation-offer" aria-label="Welcome to SanctissiMissa">
    <strong>Would you like a short tour?</strong>
    <p>We will point out the controls, one at a time. The Companion can explain more when it is ready.</p>
    <button onClick={() => { setOffered(false); setActive(true); window.dispatchEvent(new CustomEvent(OPEN_COMPANION)); }}>Start orientation</button>
    <button onClick={leave}>Later</button>
  </aside>;
  if (!active && !pointed) return null;
  const label = GUIDE_STEPS.find((item) => item.id === pointed)?.label ?? GUIDE_STEPS[step].label;
  const style = pos ? { left: pos.left, top: pos.top, right: 'auto' as const, bottom: 'auto' as const } : undefined;
  return <aside ref={cardRef} className="orientation-guide" style={style} aria-label="Orientation guide">
    <strong onPointerDown={onHeadingPointerDown} onPointerMove={onHeadingPointerMove} onPointerUp={onHeadingPointerUp}>
      {active ? `Step ${step + 1} of ${GUIDE_STEPS.length}: ${GUIDE_STEPS[step].label}` : label}
    </strong>
    <p>{active ? GUIDE_STEPS[step].text : `The Companion has highlighted ${label}.`}</p>
    {unavailable && <p>This control is not visible just now. You can continue the tour or ask the Companion.</p>}
    <div className="orientation-actions">
      <button onClick={() => setUnavailable(!activateGuide())}>Show me</button>
      {active && <button onClick={explain}>Ask Companion to explain</button>}
      {active && step > 0 && <button onClick={() => setStep((value) => value - 1)}>Back</button>}
      {active && (step < GUIDE_STEPS.length - 1
        ? <button onClick={() => setStep((value) => value + 1)}>Next</button>
        : <button onClick={() => { saveGuideState({ completed: true, step }); leave(); }}>Finish orientation</button>)}
      <button onClick={leave}>{active ? 'Continue later' : 'Close guide'}</button>
    </div>
  </aside>;
}
