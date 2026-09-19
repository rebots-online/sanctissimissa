import { debugEvent } from '../diagnostics/store.ts';
export const GUIDE_CHANGED = 'sanctissimissa:guide-changed';
export const START_GUIDE = 'sanctissimissa:start-guide';
export const OPEN_COMPANION = 'sanctissimissa:open-companion';
/** Pure panel-layout announcement (§D): dispatched AFTER a panel open/close
 * commits, so orientation placement validation can query the live DOM. Never
 * a command — listeners must not toggle panel state. */
export const COMPANION_LAYOUT = 'sanctissimissa:companion-layout';
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
export const GUIDE_POS_KEY = 'sanctissimissa.orientation.pos.v1';
export interface GuidePos { left: number; top: number }
export function clampGuidePos(pos: GuidePos, width: number, height: number, viewport: { innerWidth: number; innerHeight: number } = window): GuidePos {
  const maxX = Math.max(8, viewport.innerWidth - width - 8);
  const maxY = Math.max(8, viewport.innerHeight - height - 8);
  return { left: Math.round(Math.min(Math.max(8, pos.left), maxX)), top: Math.round(Math.min(Math.max(8, pos.top), maxY)) };
}
export function readGuidePos(storage: Pick<Storage, 'getItem'> = localStorage): GuidePos | null {
  try {
    const value = JSON.parse(storage.getItem(GUIDE_POS_KEY) ?? 'null') as Partial<GuidePos> | null;
    return value && Number.isFinite(value.left) && Number.isFinite(value.top) ? { left: value.left!, top: value.top! } : null;
  } catch { return null; }
}
export function saveGuidePos(pos: GuidePos, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(GUIDE_POS_KEY, JSON.stringify(pos)); }
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
  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  debugEvent('orientation', 'target.highlight', { id, tag: element.tagName, label: element.getAttribute('aria-label') ?? element.textContent });
  window.dispatchEvent(new CustomEvent(GUIDE_CHANGED, { detail: { id } }));
  return true;
}
export function activateGuide(): boolean {
  const element = activeId && guideTarget(activeId);
  if (!element) return false;
  // "Show me" must SHOW something: bring the target prominently into view
  // and pulse it, then activate — a click alone can be a no-op from the
  // current state (e.g. the already-active view's rail button).
  element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
  element.classList.remove('orientation-showing');
  // void reflow so the animation restarts on repeated clicks
  void (element as HTMLElement).offsetWidth;
  element.classList.add('orientation-showing');
  setTimeout(() => element.classList.remove('orientation-showing'), 1400);
  debugEvent('orientation', 'target.click', { id: activeId });
  element.click();
  return true;
}
export function clearGuide(): void {
  activeId = null;
  for (const previous of document.querySelectorAll('.orientation-target')) previous.classList.remove('orientation-target');
}
/** CL.2 (§H.1): live, allowlisted app facts merged into guideContext()'s
 *  context JSON. Structural values only — never page text. Surfaces merge
 *  partials (last write wins per field), so App and the document-plane
 *  surfaces each contribute what they own without coupling. */
export interface GuideLiveContext {
  currentView?: string;
  currentDate?: string;
  focusSection?: string | null;
  openDraftKey?: string | null;
  visible?: Record<string, unknown>;
}
let guideLiveContext: GuideLiveContext = {};
/** CL.2: merge a partial live-context patch; present fields appear in the
 *  next guideContext() call. */
export function setGuideLiveContext(patch: GuideLiveContext): void {
  guideLiveContext = { ...guideLiveContext, ...patch };
}

export function guideContext(): string {
  const targets = GUIDE_STEPS.flatMap((step) => {
    const element = guideTarget(step.id);
    return element ? [{ id: step.id, label: step.label, tag: element.tagName, active: element.classList.contains('active') }] : [];
  });
  // CL.2: the documented context JSON gains the live facts registered through
  // setGuideLiveContext (currentView/currentDate/focusSection/openDraftKey +
  // the structural `visible` snapshot).
  const context = { controls: targets, ...guideLiveContext };
  return `You are SanctissiMissa's Companion. Explain the app patiently in plain language, one small step at a time. The following are actual visible DOM controls: ${JSON.stringify(context)}. Current orientation target: ${activeId ?? 'none'}. To point to a control, append exactly [[guide:<id>]] using one listed id. You may append exactly one of [[guide:<id>]], [[open:<view>]], [[focus:<section>]], [[date:<iso>]], [[homily-draft:<litKey>]], [[annotate:<nodeKey>]], [[concordance:<term>]], [[journal:<term>]], [[show-path:a > b > c]] at the very end. This highlights the real control; the user can press Show me to activate it. Do not claim to have clicked anything. Do not invent unavailable controls or hide uncertainty. If the Companion needs setup, the user presses Prepare Companion; the preferred native model is Qwen 3.5 2B. Keep explanations short.`;
}
// §H.1 — Companion command grammar (CL.1). A reply may end with exactly one
// trailing command. [[guide:<id>]] keeps its pre-existing meaning; the
// CompanionAct forms below drive navigation and the document-plane surfaces
// through one COMPANION_ACT window event (consumed by App, §H.1 CL.2).
export const COMPANION_ACT = 'sanctissimissa:companion-act';
export type CompanionActKind = 'open' | 'focus' | 'date' | 'homily-draft' | 'annotate' | 'concordance' | 'journal' | 'show-path';
export interface CompanionAct { kind: CompanionActKind; value: string }
/** One [[show-path:…]] step: the target token as parsed (view:<View> /
 * section:<anchor> / a registered guide id) plus the narration line the reply
 * carries for it (attached by the chat sender, §H.4). */
export interface PathStep { target: string; narration: string }
/** The App `View` union (src/App.tsx), mirrored here for validation. */
const COMPANION_VIEWS = ['map', 'reader', 'annotations', 'calendar', 'office', 'bible', 'journal', 'homily', 'settings', 'about'] as const;
const GUIDE_COMMAND_ID = /^[a-z-]+$/;
/** Trailing [[<kind>:<value>]] token. The value can never contain brackets,
 * so an earlier bracketed token in prose can never swallow the real trailing
 * command. */
const TRAILING_COMMAND = /\[\[(guide|open|focus|date|homily-draft|annotate|concordance|journal|show-path):([^[\]]*)\]\]\s*$/;
/** First command-shaped token through end-of-text — what display strips. */
const ANY_COMMAND_PREFIX = /\[\[(?:guide|open|focus|date|homily-draft|annotate|concordance|journal|show-path):[\s\S]*$/;

function isRealIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return parsed.getUTCFullYear() === Number(value.slice(0, 4))
    && parsed.getUTCMonth() === Number(value.slice(5, 7)) - 1
    && parsed.getUTCDate() === Number(value.slice(8, 10));
}
function isPathStepTarget(step: string): boolean {
  const view = /^view:([a-z-]+)$/.exec(step);
  if (view) return (COMPANION_VIEWS as readonly string[]).includes(view[1]);
  const section = /^section:(.+)$/.exec(step);
  if (section) { const anchor = section[1].trim(); return anchor.length >= 1 && anchor.length <= 80; }
  return GUIDE_STEPS.some((registered) => registered.id === step);
}
function buildCompanionAct(kind: CompanionActKind, raw: string): CompanionAct | null {
  const value = raw.trim();
  switch (kind) {
    case 'open':
      return (COMPANION_VIEWS as readonly string[]).includes(value) ? { kind, value } : null;
    case 'date':
      // a real calendar date: strict pattern plus a Date round-trip, so
      // 2026-02-30 (which rolls over into March) is rejected
      return isRealIsoDate(value) ? { kind, value } : null;
    case 'show-path': {
      const steps = value ? value.split('>').map((step) => step.trim()) : [];
      if (steps.length < 2 || steps.length > 6 || steps.some((step) => !isPathStepTarget(step))) return null;
      return { kind, value: steps.join(' > ') };
    }
    default:
      // focus / homily-draft / annotate / concordance / journal: a trimmed 1–80 char value
      return value.length >= 1 && value.length <= 80 ? { kind, value } : null;
  }
}
export function parseCompanionCommand(text: string): CompanionAct | null {
  let rest = text;
  // The trailing token may be the pre-existing [[guide:<id>]]; look one token
  // further back so a combined "guide + act" reply still yields its act.
  for (let scanned = 0; scanned < 2; scanned++) {
    const match = TRAILING_COMMAND.exec(rest);
    if (!match) return null;
    if (match[1] !== 'guide') return buildCompanionAct(match[1] as CompanionActKind, match[2]);
    rest = rest.slice(0, match.index);
  }
  return null;
}
export function stripGuideCommands(text: string): string { return text.replace(ANY_COMMAND_PREFIX, '').trimEnd(); }
export function applyGuideCommand(text: string): boolean {
  let rest = text;
  let guideId: string | null = null;
  let act: CompanionAct | null = null;
  // Consume the trailing [[guide:<id>]] plus at most one CompanionAct, in
  // either order; anything earlier in the reply is prose, never a command.
  for (let consumed = 0; consumed < 2; consumed++) {
    const match = TRAILING_COMMAND.exec(rest);
    if (!match) break;
    if (match[1] === 'guide') {
      if (guideId !== null || !GUIDE_COMMAND_ID.test(match[2])) break;
      guideId = match[2];
    } else {
      const built = buildCompanionAct(match[1] as CompanionActKind, match[2]);
      // Invalid command: recorded, never executed — and it aborts the batch,
      // so a malformed suffix cannot half-apply a reply.
      if (!built) { debugEvent('companion', 'command.rejected', { raw: text }, 'warn'); return false; }
      if (act !== null) break;
      act = built;
    }
    rest = rest.slice(0, match.index);
  }
  let applied = false;
  if (guideId !== null) applied = highlightGuide(guideId);
  if (act) {
    window.dispatchEvent(new CustomEvent(COMPANION_ACT, { detail: act }));
    debugEvent('companion', 'command.dispatch', act, 'info');
    applied = true;
  }
  return applied;
}
