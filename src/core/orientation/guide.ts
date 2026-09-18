import { debugEvent } from '../diagnostics/store.ts';
export const GUIDE_CHANGED = 'sanctissimissa:guide-changed';
export const START_GUIDE = 'sanctissimissa:start-guide';
export const OPEN_COMPANION = 'sanctissimissa:open-companion';
export const GUIDE_KEY = 'sanctissimissa.orientation.v1';
export const GUIDE_STEPS = [
  { id: 'nav-map', label: 'Holy Mass', text: 'This opens the map of the Mass. Choose a stop on the line to read that part.' },
  { id: 'nav-reader', label: 'Missal Reader', text: 'Here you can follow the prayers and readings of the Mass.' },
  { id: 'nav-bible', label: 'Sacred Scripture', text: 'Open Scripture here. Holy Mass in the sidebar always takes you back to the Mass.' },
  { id: 'nav-office', label: 'Divine Office', text: 'The prayers for the hours of the day have their own place here.' },
  { id: 'nav-settings', label: 'Settings', text: 'Adjust the appearance and reading preferences here. You can also restart this tour.' },
  { id: 'companion', label: 'Companion', text: 'Ask about the Mass or how to use the app. Prepare the Companion once to receive answers on this device.' },
] as const;
export type GuideId = typeof GUIDE_STEPS[number]['id'];
export interface GuideState { completed: boolean; step: number }
export function readGuideState(storage: Pick<Storage, 'getItem'> = localStorage): GuideState {
  try {
    const value = JSON.parse(storage.getItem(GUIDE_KEY) ?? '{}') as Partial<GuideState>;
    return { completed: value.completed === true, step: Number.isInteger(value.step) ? Math.max(0, Math.min(GUIDE_STEPS.length - 1, value.step!)) : 0 };
  } catch { return { completed: false, step: 0 }; }
}
export function saveGuideState(value: GuideState, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(GUIDE_KEY, JSON.stringify(value)); }
  catch (error) { debugEvent('orientation', 'persist.error', error, 'error'); }
}
let activeId: GuideId | null = null;
export function guideTarget(id: string, root: Document = document): HTMLElement | null {
  if (!GUIDE_STEPS.some((step) => step.id === id)) return null;
  return [...root.querySelectorAll<HTMLElement>(`[data-guide="${id}"]`)]
    .find((element) => element.getBoundingClientRect().width > 0 && !element.hasAttribute('disabled')) ?? null;
}
export function highlightGuide(id: string): boolean {
  const element = guideTarget(id);
  if (!element) { debugEvent('orientation', 'target.unavailable', { id }, 'warn'); return false; }
  for (const previous of document.querySelectorAll('.orientation-target')) previous.classList.remove('orientation-target');
  activeId = id as GuideId;
  element.classList.add('orientation-target');
  element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  debugEvent('orientation', 'target.highlight', { id, tag: element.tagName, label: element.getAttribute('aria-label') ?? element.textContent });
  window.dispatchEvent(new CustomEvent(GUIDE_CHANGED, { detail: { id } }));
  return true;
}
export function activateGuide(): boolean {
  const element = activeId && guideTarget(activeId);
  if (!element) return false;
  debugEvent('orientation', 'target.click', { id: activeId });
  element.click();
  return true;
}
export function clearGuide(): void {
  activeId = null;
  for (const previous of document.querySelectorAll('.orientation-target')) previous.classList.remove('orientation-target');
}
export function guideContext(): string {
  const targets = GUIDE_STEPS.flatMap((step) => {
    const element = guideTarget(step.id);
    return element ? [{ id: step.id, label: step.label, tag: element.tagName, active: element.classList.contains('active') }] : [];
  });
  return `You are SanctissiMissa's Companion. Explain the app patiently in plain language, one small step at a time. The following are actual visible DOM controls: ${JSON.stringify(targets)}. Current orientation target: ${activeId ?? 'none'}. To point to a control, append exactly [[guide:<id>]] using one listed id. This highlights the real control; the user can press Show me to activate it. Do not claim to have clicked anything. Do not invent unavailable controls or hide uncertainty. If the Companion needs setup, the user presses Prepare Companion; the preferred native model is Qwen 3.5 2B. Keep explanations short.`;
}
export function stripGuideCommands(text: string): string { return text.replace(/\[\[guide:[\s\S]*$/, '').trimEnd(); }
export function applyGuideCommand(text: string): boolean {
  const match = /\[\[guide:([a-z-]+)\]\]\s*$/.exec(text);
  return Boolean(match && highlightGuide(match[1]));
}
