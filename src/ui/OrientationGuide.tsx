import { useEffect, useState } from 'react';
import defaults from '../../config/companion-defaults.json';
import { GUIDE_CHANGED, GUIDE_STEPS, OPEN_COMPANION, START_GUIDE, activateGuide, clearGuide,
  highlightGuide, readGuideState, saveGuideState } from '../core/orientation/guide.ts';

export default function OrientationGuide() {
  const [saved] = useState(readGuideState);
  const [offered, setOffered] = useState(defaults.offerOrientationUntilCompleted && !saved.completed);
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(saved.step);
  const [pointed, setPointed] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
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
  return <aside className="orientation-guide" aria-label="Orientation guide">
    <strong>{active ? `Step ${step + 1} of ${GUIDE_STEPS.length}: ${GUIDE_STEPS[step].label}` : label}</strong>
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
