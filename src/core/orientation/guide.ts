import { debugEvent } from '../diagnostics/store.ts';
import { readVisibleContext } from '../chat/visibleContext.ts';
export const GUIDE_CHANGED = 'sanctissimissa:guide-changed';
export const START_GUIDE = 'sanctissimissa:start-guide';
export const OPEN_SACRISTAN = 'sanctissimissa:open-sacristan';
/** Pure panel-layout announcement (§D): dispatched AFTER a panel open/close
 * commits, so orientation placement validation can query the live DOM. Never
 * a command — listeners must not toggle panel state. */
export const SACRISTAN_LAYOUT = 'sanctissimissa:sacristan-layout';
export const GUIDE_KEY = 'sanctissimissa.orientation.v1';
export const GUIDE_STEPS = [
  { id: 'nav-map', label: 'Holy Mass', text: 'This opens the map of the Mass. Choose a stop on the line to read that part.' },
  { id: 'nav-reader', label: 'Missal Reader', text: 'Here you can follow the prayers and readings of the Mass.' },
  { id: 'nav-bible', label: 'Sacred Scripture', text: 'Open Scripture here. Holy Mass in the sidebar always takes you back to the Mass.' },
  { id: 'nav-office', label: 'Divine Office', text: 'The prayers for the hours of the day have their own place here.' },
  { id: 'nav-settings', label: 'Settings', text: 'Adjust the appearance and reading preferences here. You can also restart this tour.' },
  { id: 'sacristan', label: 'Sacristan', text: 'Ask the Sacristan about the Mass or how to use the app. Prepare the Sacristan once to receive answers on this device.' },
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
// §K.6: placement key gained a fresh name at the Sacristan rename — the old
// v1 key is ignored, never read (reset-not-migrate; users re-place the card).
export const GUIDE_POS_KEY = 'sanctissimissa.orientation.pos.v2';
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
 *  surfaces each contribute what they own without coupling.
 *  HD.1 (§K.8): the `visible` field is no longer registered — guideContext
 *  itself reads the live DOM through readVisibleContext() each turn. */
export interface GuideLiveContext {
  currentView?: string;
  currentDate?: string;
  focusSection?: string | null;
  openDraftKey?: string | null;
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
  // HD.1 (§K.8): `visible` is a REAL DOM read at prompt-build time — the live
  // section anchors (with headings), viewport visibility, rail mode, focus
  // target, and scroll depth — replacing §H.1's registered snapshot.
  const context = { controls: targets, ...guideLiveContext, visible: readVisibleContext(guideLiveContext) };
  return `You are SanctissiMissa's Sacristan. Explain the app patiently in plain language, one small step at a time. The following are actual visible DOM controls and the live page view: ${JSON.stringify(context)}. Current orientation target: ${activeId ?? 'none'}. You teach ON the page: scroll to the passage ([[scroll:<anchor>]]), highlight it ([[highlight:<anchor>]]), circle it ([[circle:<anchor>]]), connect two passages with an arrow ([[arrow:<a>-><b>]]), annotate it with a note ([[annotate:<anchor>|<1-300 char note>]]), or recede so the page takes attention ([[focus-swap]]). Use only anchors listed in visible.sections. You may append exactly one of [[guide:<id>]], [[open:<view>]], [[focus:<section>]], [[date:<iso>]], [[homily-draft:<litKey>]], [[annotate:<anchor>|<note>]], [[concordance:<term>]], [[journal:<term>]], [[show-path:a > b > c]], [[scroll:<anchor>]], [[highlight:<anchor>]], [[circle:<anchor>]], [[arrow:<a>-><b>]], [[focus-swap]] at the very end. This highlights the real control; the user can press Show me to activate it. Do not claim to have clicked anything. Do not claim to see anything not in the live view. Do not invent unavailable controls or anchors, and never hide uncertainty. If the Sacristan needs setup, the user presses Prepare Sacristan; the preferred native model is Qwen 3.5 2B. Keep explanations short.`;
}
// §H.1 — Sacristan command grammar (CL.1). A reply may end with exactly one
// trailing command. [[guide:<id>]] keeps its pre-existing meaning; the
// CompanionAct forms below (internal grammar names retained per §K.6) drive
// navigation and the document-plane surfaces through one SACRISTAN_ACT
// window event (consumed by App, §H.1 CL.2).
export const SACRISTAN_ACT = 'sanctissimissa:sacristan-act';
/** HD.2 (§K.8): the didactic overlay's channel — App forwards circle/arrow/
 * highlight/focus-swap acts here after live-anchor validation; the overlay is
 * the sole listener (successor to the removed OG card's surfaces). */
export const DIDACTIC_ACT = 'sanctissimissa:didactic-act';
/** CL.2 (§H.1)→HD.2: the show-path channel App forwards [[show-path:…]] steps
 *  on (detail { steps: PathStep[] }). Single authority since the OG card (the
 *  former second, mirrored declaration) was removed. */
export const COMPANION_SHOWPATH_EVENT = 'sanctissimissa:companion-showpath';
export type CompanionActKind = 'open' | 'focus' | 'date' | 'homily-draft' | 'annotate' | 'concordance' | 'journal' | 'show-path'
  | 'scroll' | 'highlight' | 'circle' | 'arrow' | 'focus-swap';
export interface CompanionAct { kind: CompanionActKind; value: string; /** HD.1: the annotate note ([[annotate:<anchor>|<note>]]). */
  note?: string }
/** One [[show-path:…]] step: the target token as parsed (view:<View> /
 * section:<anchor> / a registered guide id) plus the narration line the reply
 * carries for it (attached by the chat sender, §H.4). */
export interface PathStep { target: string; narration: string }
/** HD.2 (§K.8): the didactic overlay event detail App forwards. */
export interface DidacticActDetail {
  kind: 'circle' | 'arrow' | 'highlight' | 'focus-swap';
  anchor?: string;
  anchorB?: string;
  note?: string | null;
  reply?: string;
}
/** The App `View` union (src/App.tsx), mirrored here for validation. */
const COMPANION_VIEWS = ['map', 'reader', 'annotations', 'calendar', 'office', 'bible', 'journal', 'homily', 'settings', 'about'] as const;
const GUIDE_COMMAND_ID = /^[a-z-]+$/;
/** Trailing [[<kind>:<value>]] token. The value can never contain brackets,
 * so an earlier bracketed token in prose can never swallow the real trailing
 * command. */
const TRAILING_COMMAND = /\[\[(guide|open|focus|date|homily-draft|annotate|concordance|journal|show-path|scroll|highlight|circle|arrow):([^[\]]*)\]\]\s*$/;
/** HD.1: the valueless trailing token — [[focus-swap]]. */
const BARE_TRAILING_COMMAND = /\[\[(focus-swap)\]\]\s*$/;
/** First command-shaped token through end-of-text — what display strips. */
const ANY_COMMAND_PREFIX = /\[\[(?:guide|open|focus|date|homily-draft|annotate|concordance|journal|show-path|scroll|highlight|circle|arrow|focus-swap)(?::[\s\S]*|\]\][\s\S]*)$/;
/** HD.1: a section anchor value — 1–80 chars, no grammar metacharacters
 *  (brackets, pipe, arrow, '>' path separator). */
const ANCHOR_VALUE = /^[^<>[\]|]{1,80}$/;

/** Resolve one didactic/show-path target token to its live element — never
 *  faked: view:<View> → the rail's nav button ([data-guide="nav-<view>"]);
 *  section:<anchor> → the live [data-section] node; a registered guide id →
 *  guideTarget. Attribute-compare only (App's own pattern), and a target with
 *  no live element resolves null. (Re-homed from the removed OG card.) */
export function pathTargetElement(target: string, root: Document = document): HTMLElement | null {
  const findByAttribute = (name: string, value: string): HTMLElement | null =>
    [...root.querySelectorAll<HTMLElement>(`[${name}]`)]
      .find((element) => element.getAttribute(name) === value && element.getBoundingClientRect().width > 0 && !element.hasAttribute('disabled')) ?? null;
  const view = /^view:([a-z-]+)$/.exec(target);
  if (view) return findByAttribute('data-guide', `nav-${view[1]}`);
  const section = /^section:(.+)$/.exec(target);
  if (section) { const anchor = section[1].trim(); return anchor ? findByAttribute('data-section', anchor) : null; }
  return guideTarget(target, root);
}

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
    // HD.1 (§K.8): the didactic tokens. Anchors are 1–80 chars without
    // grammar metacharacters; the anchor forms are validated against the
    // LIVE document at apply time (App), never faked here.
    case 'scroll':
    case 'highlight':
    case 'circle':
      return ANCHOR_VALUE.test(value) ? { kind, value } : null;
    case 'annotate': {
      // New HD.1 form [[annotate:<anchor>|<1-300 chars>]]; the bare
      // [[annotate:<nodeKey>]] form keeps its §H meaning.
      const pipe = value.indexOf('|');
      if (pipe < 0) return value.length >= 1 && value.length <= 80 ? { kind, value } : null;
      const anchor = value.slice(0, pipe).trim();
      const note = value.slice(pipe + 1).trim();
      if (!ANCHOR_VALUE.test(anchor) || note.length < 1 || note.length > 300) return null;
      return { kind, value: anchor, note };
    }
    case 'arrow': {
      const parts = value.split('->');
      if (parts.length !== 2) return null;
      const a = parts[0].trim();
      const b = parts[1].trim();
      return ANCHOR_VALUE.test(a) && ANCHOR_VALUE.test(b) ? { kind, value: `${a}->${b}` } : null;
    }
    case 'focus-swap':
      return value === '' ? { kind, value: '' } : null;
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
    const match = TRAILING_COMMAND.exec(rest) ?? BARE_TRAILING_COMMAND.exec(rest);
    if (!match) return null;
    if (match[1] !== 'guide') return buildCompanionAct(match[1] as CompanionActKind, match[2] ?? '');
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
  // (HD.1: the valueless [[focus-swap]] token matches the bare form.)
  for (let consumed = 0; consumed < 2; consumed++) {
    const match = TRAILING_COMMAND.exec(rest) ?? BARE_TRAILING_COMMAND.exec(rest);
    if (!match) break;
    if (match[1] === 'guide') {
      if (guideId !== null || !GUIDE_COMMAND_ID.test(match[2])) break;
      guideId = match[2];
    } else {
      const built = buildCompanionAct(match[1] as CompanionActKind, match[2] ?? '');
      // Invalid command: recorded, never executed — and it aborts the batch,
      // so a malformed suffix cannot half-apply a reply.
      if (!built) { debugEvent('sacristan', 'command.rejected', { raw: text }, 'warn'); return false; }
      if (act !== null) break;
      act = built;
    }
    rest = rest.slice(0, match.index);
  }
  let applied = false;
  if (guideId !== null) applied = highlightGuide(guideId);
  if (act) {
    window.dispatchEvent(new CustomEvent(SACRISTAN_ACT, { detail: act }));
    debugEvent('sacristan', 'command.dispatch', act, 'info');
    applied = true;
  }
  return applied;
}
