/**
 * ChatView — Companion surface (CP.5, operator directive 2026-09-16).
 * Default presentation is the ChatBadge intercom porthole; it expands to a
 * fully dockable + resizeable chat panel: dock-left, dock-right, floating
 * (header drag + corner resize), inline, fullscreen, and the mobile bottom
 * sheet. Mode + geometry persist via sidecar settings chat.dock /
 * chat.rect / chat.dockWidth. Turns stream through ChatController over the
 * mock engine (CP.3 WebGPU TurboQuant / CP.4 registry plug in unchanged).
 *
 * CL.4 (§H.2/§H.4): every turn is grounded in persona + guideContext() (live
 * view/date/focus/draft + the `visible` snapshot + the full command grammar)
 * + CompanionMemory lore + top-5 recall; assistant replies carry a Save
 * insight action (generated study accompaniment anchored to the current day
 * + focus section); the panel closing idle-distills the last completed turn
 * (2-minute debounce, never mid-stream); a show-path reply forwards its
 * narration steps on COMPANION_ACT. CL.6 (§H.6): assistant replies render
 * through ChatMarkdown. CL.7 (§H.7): a fresh conversation offers the six
 * authored starter-question chips.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Database } from 'sql.js';
import {
  COMPANION_ACT,
  COMPANION_LAYOUT,
  OPEN_COMPANION,
  applyGuideCommand,
  guideContext,
  parseCompanionCommand,
  stripGuideCommands,
  type PathStep,
} from '../core/orientation/guide.ts';
import ChatBadge from './ChatBadge.tsx';
import ChatMarkdown from './ChatMarkdown.tsx';
import { COMPANION_PROMPTS } from '../content/companionPrompts.ts';
import { CompanionMemory } from '../core/companion/memory.ts';
import { ensureNoteHtml } from '../core/annotations/store.ts';
import ModelPicker, { formatBytes, useCompanionModels } from './ModelPicker.tsx';
import { ChatController } from '../../reusable-chatbot/core/chat-controller.ts';
import { companionInvoke } from '../core/chat/runtime.ts';
import { debugEvent, debugTrace } from '../core/diagnostics/store.ts';
import { companionFeedback, logCompanionFailure } from '../core/chat/feedback.ts';
import { resolveHostedEngine, resolveNativeEngine, resolveWebEngine, selectedModelId, type Resolution } from '../core/chat/resolve.ts';

type DockMode = 'dock-left' | 'dock-right' | 'floating' | 'inline' | 'fullscreen' | 'sheet';

const DOCK_MODES: { id: DockMode; label: string; glyph: string }[] = [
  { id: 'dock-left', label: 'Dock left', glyph: '⇤' },
  { id: 'dock-right', label: 'Dock right', glyph: '⇥' },
  { id: 'floating', label: 'Floating', glyph: '❐' },
  { id: 'inline', label: 'Inline', glyph: '▤' },
  { id: 'fullscreen', label: 'Fullscreen', glyph: '⛶' },
];

interface SettingsStore {
  getSetting(key: string): string | null;
  setSetting(key: string, value: string): void;
  persist(): Promise<void>;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const DEFAULT_RECT: Rect = { x: 120, y: 96, w: 380, h: 520 };
const DOCK_MIN = 280;
const DOCK_MAX = 560;
const FLOAT_MIN_W = 300;
const FLOAT_MIN_H = 320;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function clampRect(r: Rect): Rect {
  const w = clamp(r.w, FLOAT_MIN_W, Math.max(FLOAT_MIN_W, window.innerWidth - 32));
  const h = clamp(r.h, FLOAT_MIN_H, Math.max(FLOAT_MIN_H, window.innerHeight - 32));
  return {
    w,
    h,
    x: clamp(r.x, 0, Math.max(0, window.innerWidth - w)),
    y: clamp(r.y, 0, Math.max(0, window.innerHeight - h)),
  };
}

interface ChatMsgUi {
  role: 'user' | 'assistant';
  text: string;
}

type DragKind = 'move' | 'float-resize' | 'dock-resize' | 'dock-resize-left';
interface DragState {
  kind: DragKind;
  ox: number;
  oy: number;
  rect: Rect;
  width: number;
}

/** CL.4 (§H.2): the store half ChatView needs for Save insight. App passes
 *  the full SidecarDb (structurally compatible); `save` stays optional so a
 *  narrow settings-only store still mounts the panel. */
interface SidecarStore extends SettingsStore {
  save?: (acc: {
    exposure: 'study';
    provenance: 'generated';
    title?: string;
    bodyHtml?: string;
    anchors?: string[];
    selectors?: { id: string; accompanimentId: string; kind: 'date'; value: string }[];
  }) => { id: string };
}

/** CL.4 (§H.2): the raw sql.js handle SidecarDb wraps — CompanionMemory
 *  writes lore/embedding rows directly over the SAME database the store
 *  owns (one sidecar, never a forked copy). Feature-detected; a store
 *  without the handle simply runs with memory features idle. */
function sidecarHandle(store: SettingsStore | null): Database | null {
  const handle = (store as { db?: unknown } | null)?.db;
  return handle && typeof (handle as Database).prepare === 'function' ? (handle as Database) : null;
}

/** CL.4 (§H.2/§H.7): the live facts App registered in guideContext()'s
 *  documented context JSON (the CL.2 contract: currentView, currentDate,
 *  focusSection, openDraftKey, visible). Read back out of the documented
 *  block — this is the day anchor + focus section for Save insight and the
 *  date suffix of the §H.7 feast chip, without any new coupling surface. */
function liveFacts(): { view: string; date: string; focus: string | null } {
  const today = new Date().toISOString().slice(0, 10);
  const match = /actual visible DOM controls: ([\s\S]*?)\. Current orientation target/.exec(guideContext());
  if (!match) return { view: '', date: today, focus: null };
  try {
    const parsed = JSON.parse(match[1]) as { currentView?: unknown; currentDate?: unknown; focusSection?: unknown };
    return {
      view: typeof parsed.currentView === 'string' ? parsed.currentView : '',
      date:
        typeof parsed.currentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.currentDate)
          ? parsed.currentDate
          : today,
      focus: typeof parsed.focusSection === 'string' && parsed.focusSection ? parsed.focusSection : null,
    };
  } catch {
    return { view: '', date: today, focus: null };
  }
}

/** CL.4 (§H.4): the reply's narration paragraphs — one blank-line-separated
 *  paragraph per `>`-step, taken from the end of the reply body so prose
 *  before the walkthrough never leaks into a step. */
function pathNarrations(reply: string, count: number): string[] {
  const paragraphs = stripGuideCommands(reply)
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const tail = paragraphs.slice(-count);
  return Array.from({ length: count }, (_, index) => tail[index] ?? '');
}

/** Remove ONLY the trailing [[show-path:…]] token, so applyGuideCommand
 *  (which dispatches acts un-narrated) cannot double-fire the walkthrough:
 *  ChatView dispatches show-path itself with the narration steps attached
 *  (§H.4), while any [[guide:<id>]] half of a combined reply still applies. */
function withoutShowPathToken(text: string): string {
  const at = text.lastIndexOf('[[show-path:');
  if (at < 0) return text;
  const close = text.indexOf(']]', at);
  return close >= 0 ? `${text.slice(0, at)}${text.slice(close + 2)}`.trimEnd() : text;
}

export default function ChatView({ sidecar = null }: { sidecar?: SidecarStore | null }) {
  const models = useCompanionModels();
  const [open, setOpen] = useState(false);
  const [dock, setDock] = useState<DockMode>(
    () => (sidecar?.getSetting('chat.dock') as DockMode | null) ?? 'dock-right',
  );
  const [rect, setRect] = useState<Rect>(() => {
    try {
      return { ...DEFAULT_RECT, ...(JSON.parse(sidecar?.getSetting('chat.rect') ?? '{}') as Partial<Rect>) };
    } catch {
      return DEFAULT_RECT;
    }
  });
  const [dockWidth, setDockWidth] = useState(() =>
    clamp(Number(sidecar?.getSetting('chat.dockWidth')) || 360, DOCK_MIN, DOCK_MAX),
  );
  const [messages, setMessages] = useState<ChatMsgUi[]>([]);
  const [input, setInput] = useState('');
  const [orientationPrompt, setOrientationPrompt] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [genSeconds, setGenSeconds] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  useEffect(() => {
    if (!streaming) { setGenSeconds(null); return; }
    const started = Date.now();
    setGenSeconds(0);
    const timer = setInterval(() => setGenSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [streaming]);
  const [engineState, setEngineState] = useState<'idle' | 'starting' | 'ready' | 'failed'>('idle');
  const [engineProgress, setEngineProgress] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [replyNotice, setReplyNotice] = useState<string | null>(null);
  const [hostedActive, setHostedActive] = useState(false);
  const [hostedStatus, setHostedStatus] = useState<string | null>(null);
  const controllerRef = useRef<ChatController | null>(null);

  const modelsRef = useRef(models);
  modelsRef.current = models;
  const catalog = models.state.catalog;
  const selectedId = models.state.selectedId;
  const selected = catalog?.ranked.find((model) => model.id === selectedId);
  const selectedState = selectedId ? models.state.states[selectedId] : undefined;

  // Progress updates never restart initialization. Only a changed selection,
  // verified download or explicit retry creates a new engine attempt.
  // Hosted-first (§E, amendment 2026-09-18): when no local choice is
  // persisted — or the picker's hosted entry is the persisted choice — the
  // debug hosted engine resolves BEFORE the local paths; a persisted local
  // id keeps the existing local path unchanged, and a non-ready hosted
  // result falls through to that same local resolution.
  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let slowTimer: ReturnType<typeof setTimeout> | undefined;
    const controller = new ChatController();
    let initialized = false;
    controllerRef.current = null;
    setEngineState('idle');
    setEngineProgress(null);
    setSlow(false);
    setHostedActive(false);
    setHostedStatus(null);
    const persistedChoice = selectedModelId();
    const hostedPreferred = persistedChoice === null || persistedChoice === 'hosted:openrouter';
    if (!hostedPreferred && (!catalog || !selectedId || selectedState !== 'downloaded')) return;
    setEngineState('starting');
    const heartbeat = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        cancelled = true;
        controllerRef.current = null;
        setEngineState('failed');
        logCompanionFailure('startup-timeout', new Error('No startup progress for two minutes'));
        if (initialized) void controller.close();
      }, 120_000);
    };
    heartbeat();
    slowTimer = setTimeout(() => { if (!cancelled) setSlow(true); }, 30_000);
    void (async () => {
      try {
        const invoke = companionInvoke();
        const traceId = debugTrace('companion-start');
        const progress = (fraction: number) => {
          if (cancelled) return;
          heartbeat();
          setEngineProgress(Math.max(0, Math.min(100, Math.round(fraction * 100))));
        };
        let hostedReason: string | null = null;
        if (hostedPreferred) {
          debugEvent('companion', 'resolve.start', { selectedId: persistedChoice, hosted: true }, 'info', traceId);
          const hosted = await resolveHostedEngine(import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined, progress);
          debugEvent('companion', 'resolve.result', hosted.kind === 'ready' ? { kind: hosted.kind, config: hosted.config } : hosted, 'info', traceId);
          if (cancelled) return;
          if (hosted.kind === 'ready') {
            await controller.useEngine(hosted.engine, hosted.config);
            initialized = true;
            debugEvent('companion', 'engine.ready', { selectedId: 'hosted:openrouter' }, 'info', traceId);
            if (cancelled) { await controller.close(); return; }
            controllerRef.current = controller;
            setHostedActive(true);
            setEngineState('ready');
            return;
          }
          // Non-ready hosted (unconfigured key) falls through to the local
          // paths below.
          hostedReason = hosted.reason;
        }
        if (!catalog || !selectedId || selectedState !== 'downloaded') {
          // Hosted preferred but unconfigured, and nothing local prepared
          // either — the authored hosted line is the honest status while the
          // Missal keeps working.
          setHostedStatus(hostedReason);
          setEngineState('idle');
          return;
        }
        const current = modelsRef.current;
        const candidates = catalog.ranked.filter((model) => current.state.states[model.id] === 'downloaded');
        debugEvent('companion', 'resolve.start', { selectedId, native: Boolean(invoke) }, 'info', traceId);
        const resolved: Resolution = invoke
          ? await resolveNativeEngine(invoke, catalog.report, current.locate, candidates, selectedId, progress)
          : await resolveWebEngine(catalog.report, selectedId, progress);
        debugEvent('companion', 'resolve.result', resolved.kind === 'ready' ? { kind: resolved.kind, config: resolved.config } : resolved, 'info', traceId);
        if (cancelled) return;
        if (resolved.kind !== 'ready') throw new Error(resolved.reason);
        await controller.useEngine(resolved.engine, resolved.config);
        initialized = true;
        debugEvent('companion', 'engine.ready', { selectedId }, 'info', traceId);
        if (cancelled) { await controller.close(); return; }
        controllerRef.current = controller;
        setEngineState('ready');
      } catch (error) {
        logCompanionFailure('startup', error);
        if (!cancelled) setEngineState('failed');
      } finally {
        clearTimeout(timeout);
        clearTimeout(slowTimer);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(slowTimer);
      abortRef.current?.abort();
      if (controllerRef.current === controller) controllerRef.current = null;
      if (initialized) void controller.close().catch((error) => logCompanionFailure('close', error));
      // A pending init disposes its own engine when it settles.
    };
  }, [catalog, selectedId, selectedState, attempt]);

  const sendRef = useRef<(text?: string) => Promise<void>>(async () => {});
  useEffect(() => {
    const show = (event: Event) => {
      setOpen(true);
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) setOrientationPrompt(prompt);
    };
    window.addEventListener(OPEN_COMPANION, show);
    return () => window.removeEventListener(OPEN_COMPANION, show);
  }, []);
  // Announce panel-layout changes AFTER the render commits: a fixed-position
  // panel never resizes the document root (observers cannot see it), and
  // announcing inside the click handler races React's commit — the
  // orientation cards' placement validation queries .chat-panel on this
  // event (§D). Fires on open AND close; `show` re-running on the echo is an
  // idempotent setOpen(true).
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(COMPANION_LAYOUT));
  }, [open]);
  useEffect(() => {
    if (orientationPrompt && engineState === 'ready' && !streaming) {
      setOrientationPrompt(null);
      void sendRef.current(orientationPrompt);
    }
  }, [orientationPrompt, engineState, streaming]);

  // CL.4 (§H.2): CompanionMemory over the sidecar's own sql.js handle — one
  // database, shared with the accompaniment store; null (memory idle) when
  // no handle is available.
  const memory = useMemo(() => {
    const handle = sidecarHandle(sidecar);
    return handle ? new CompanionMemory(handle) : null;
  }, [sidecar]);
  /** The last completed turn, distilled once the panel sits closed (below). */
  const lastTurnRef = useRef<{ question: string; answer: string } | null>(null);
  const [savedInsights, setSavedInsights] = useState<ReadonlySet<number>>(() => new Set());
  const saveAvailable = typeof sidecar?.save === 'function';

  /** CL.4 (§H.2): per sent turn the system context = persona + guideContext()
   *  (live view/date/focus/draft + the `visible` snapshot + the full command
   *  grammar) + the lore block + the top-5 recall hits as `## Recalled
   *  memories`. */
  const companionSystemContext = (question: string): string => {
    const facts = liveFacts();
    const parts = [guideContext()];
    if (memory) {
      const lore = memory.assemble({ view: facts.view, date: facts.date, focus: facts.focus });
      if (lore) parts.push(lore);
      const hits = memory.recall(question, 5);
      if (hits.length) {
        parts.push(
          `## Recalled memories\n${hits.map((hit) => `- ${hit.refId} (cosine ${hit.score.toFixed(2)})`).join('\n')}`,
        );
      }
    }
    return parts.join('\n\n');
  };

  /** CL.4 (§H.1/§H.4): the reply's trailing [[…]] suffix parses, executes and
   *  strips per the grammar. show-path is dispatched HERE — not left to
   *  applyGuideCommand — so the COMPANION_ACT detail carries the reply's
   *  narration steps [{target, narration}]; the token is removed first so
   *  the act dispatches exactly once (any [[guide:<id>]] half of a combined
   *  reply still applies). */
  const executeReplyCommands = (response: string) => {
    const act = parseCompanionCommand(response);
    if (act?.kind === 'show-path') {
      applyGuideCommand(withoutShowPathToken(response));
      const targets = act.value.split('>').map((step) => step.trim()).filter(Boolean);
      const narrations = pathNarrations(response, targets.length);
      const steps: PathStep[] = targets.map((target, index) => ({ target, narration: narrations[index] ?? '' }));
      window.dispatchEvent(new CustomEvent(COMPANION_ACT, { detail: { ...act, steps } }));
      debugEvent('companion', 'command.dispatch', { kind: act.kind, steps: steps.length }, 'info');
      return;
    }
    applyGuideCommand(response);
  };

  /** CL.4 (§H.2): Save insight — an assistant reply becomes a study
   *  accompaniment through the existing store (provenance 'generated',
   *  exposure 'study'), anchored to the current day (date selector) and the
   *  focus section. */
  const saveInsight = (index: number) => {
    if (!sidecar?.save) return;
    const reply = messages[index];
    if (!reply || reply.role !== 'assistant' || !reply.text.trim()) return;
    const question = index > 0 && messages[index - 1].role === 'user' ? messages[index - 1].text : '';
    const facts = liveFacts();
    const body = stripGuideCommands(reply.text);
    const saved = sidecar.save({
      exposure: 'study',
      provenance: 'generated',
      title: (question || body.split('\n')[0] || 'Companion insight').slice(0, 80),
      bodyHtml: ensureNoteHtml(body),
      anchors: facts.focus ? [`section:${facts.focus}`] : [],
      selectors: [{ id: '', accompanimentId: '', kind: 'date', value: facts.date }],
    });
    void sidecar.persist();
    setSavedInsights((previous) => new Set(previous).add(index));
    debugEvent('companion', 'insight.saved', { id: saved.id, day: facts.date, focus: facts.focus }, 'info');
  };

  // CL.4 (§H.2): distill-on-idle — after the panel closes with no active
  // generation, the last completed turn is distilled into memory after a
  // two-minute debounce. Reopening or a new generation clears the pending
  // timer (the effect re-runs); a turn is never distilled mid-stream, and
  // each completed turn is distilled at most once.
  const DISTILL_IDLE_MS = 120_000;
  useEffect(() => {
    if (open || streaming || !memory || !lastTurnRef.current) return;
    const turn = lastTurnRef.current;
    const timer = setTimeout(() => {
      lastTurnRef.current = null;
      memory
        .distill(turn)
        .then(() => {
          void sidecar?.persist();
        })
        .catch((error) => logCompanionFailure('distill', error));
    }, DISTILL_IDLE_MS);
    return () => clearTimeout(timer);
  }, [open, streaming, memory, sidecar]);

  /** CL.7 (§H.7): the feast chip appends the app's current liturgical date at
   *  send time — never baked into the authored const. */
  const promptToSend = (entry: { label: string; prompt: string }): string =>
    /today's feast/i.test(entry.prompt) ? `${entry.prompt} (${liveFacts().date})` : entry.prompt;

  /** CL.7 (§H.7): a tap fills the composer with the prompt and sends through
   *  the existing send path; after the first turn the rail never renders
   *  again for that conversation. */
  const sendPrompt = (entry: { label: string; prompt: string }) => {
    const full = promptToSend(entry);
    setInput(full);
    void send(full);
    setInput('');
  };

  // Small screens open the panel as a bottom sheet by default.
  useEffect(() => {
    if (open && typeof matchMedia === 'function' && matchMedia('(max-width: 720px)').matches) {
      setDock((d) => (d === 'fullscreen' ? d : 'sheet'));
    }
  }, [open]);

  const persist = useCallback(
    (key: string, value: string) => {
      sidecar?.setSetting(key, value);
      void sidecar?.persist();
    },
    [sidecar],
  );

  const changeDock = (mode: DockMode) => {
    setDock(mode);
    persist('chat.dock', mode);
  };

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async (requestedText?: string) => {
    const text = requestedText ?? input.trim();
    const controller = controllerRef.current;
    if (!text || streaming || engineState !== 'ready' || !controller) return;
    setReplyNotice(null);
    if (!requestedText) setInput('');
    setMessages((m) => [...m, { role: 'user', text }, { role: 'assistant', text: '' }]);
    setStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;
    let received = false;
    let response = '';
    try {
      for await (const ev of controller.generate(text, abort.signal, companionSystemContext(text))) {
        if (abort.signal.aborted) break;
        received ||= Boolean(ev.text);
        response += ev.text;
        setMessages((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { role: 'assistant', text: last.text + ev.text };
          return copy;
        });
      }
      if (abort.signal.aborted) {
        setInput((draft) => draft || text);
        setReplyNotice(companionFeedback.stopped);
      } else if (!received) throw new Error('Engine returned an empty reply');
      else {
        // CL.4: the completed turn is the distill-on-idle candidate; the
        // command suffix parses/executes per the grammar (show-path carries
        // its narration steps) and the display strip happens at render.
        lastTurnRef.current = { question: text, answer: stripGuideCommands(response) };
        executeReplyCommands(response);
      }
    } catch (error) {
      logCompanionFailure('reply', error);
      setInput((draft) => draft || text);
      // Hosted failures get the authored hosted line matching what actually
      // happened — 429/402/5xx are provider limits (the service was reached
      // and refused), anything else is a connection problem. Authored
      // notices only, never assistant tokens.
      const hostedStatus = /hosted http (\d+)/.exec(String((error as Error | undefined)?.message ?? ''))?.[1];
      const limited = hostedStatus === '429' || hostedStatus === '402' || (hostedStatus !== undefined && Number(hostedStatus) >= 500);
      setReplyNotice(
        hostedActive
          ? limited
            ? companionFeedback.hostedLimited
            : companionFeedback.hostedNetwork
          : companionFeedback.reply,
      );
      setEngineState('failed');
    } finally {
      setMessages((m) => m.filter((message) => message.text.length > 0));
      setStreaming(false);
      abortRef.current = null;
    }
  };

  sendRef.current = send;

  const stop = () => abortRef.current?.abort();

  const onPointerDown = (kind: DragKind) => (e: ReactPointerEvent<HTMLElement>) => {
    if (kind === 'move' && (e.target as HTMLElement).closest('button, input, textarea, a')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragRef.current = { kind, ox: e.clientX, oy: e.clientY, rect, width: dockWidth };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const st = dragRef.current;
    if (!st) return;
    const dx = e.clientX - st.ox;
    const dy = e.clientY - st.oy;
    if (st.kind === 'move') {
      setRect(clampRect({ ...st.rect, x: st.rect.x + dx, y: st.rect.y + dy }));
    } else if (st.kind === 'float-resize') {
      setRect(clampRect({ ...st.rect, w: st.rect.w + dx, h: st.rect.h + dy }));
    } else {
      const delta = st.kind === 'dock-resize' ? -dx : dx;
      setDockWidth(clamp(st.width + delta, DOCK_MIN, DOCK_MAX));
    }
  };

  const onPointerUp = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    persist('chat.rect', JSON.stringify(rect));
    persist('chat.dockWidth', String(dockWidth));
  };

  const panelStyle =
    dock === 'floating'
      ? { left: rect.x, top: rect.y, width: rect.w, height: rect.h }
      : dock === 'dock-left' || dock === 'dock-right'
        ? { width: dockWidth }
        : undefined;

  return (
    <>
      {/* Badge gets out of the way whenever the panel is open — the header ×
          closes and brings it back; fullscreen no longer needs a special case. */}
      {!open && <ChatBadge open={open} onToggle={() => setOpen((o) => !o)} />}
      {open && (
        <section
          className={`chat-panel ${dock}`}
          role="complementary"
          aria-label="Companion chat"
          data-guide="companion"
          style={panelStyle}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          <header
            className="chat-header"
            onPointerDown={dock === 'floating' ? onPointerDown('move') : undefined}
          >
            <div className="chat-header-left">
              <h3>Companion</h3>
              <EngineChip state={engineState} hosted={hostedActive} />
              <ModelPicker hook={models} compact disabled={streaming || engineState === 'starting'} />
            </div>
            <div className="chat-modes" role="group" aria-label="Panel placement">
              {DOCK_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  title={m.label}
                  aria-label={m.label}
                  aria-pressed={dock === m.id}
                  className={dock === m.id ? 'active' : undefined}
                  onClick={() => changeDock(m.id)}
                >
                  {m.glyph}
                </button>
              ))}
              <button type="button" className="chat-close" aria-label="Close chat" onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
          </header>
          {(dock === 'dock-left' || dock === 'dock-right') && (
            <div
              className={`chat-resize-edge ${dock}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panel"
              onPointerDown={onPointerDown(dock === 'dock-left' ? 'dock-resize-left' : 'dock-resize')}
            />
          )}
          {dock === 'floating' && (
            <div
              className="chat-resize-corner"
              role="separator"
              aria-orientation="horizontal"
              aria-label="Resize panel"
              onPointerDown={onPointerDown('float-resize')}
            />
          )}
          <div className="chat-log" ref={listRef}>
            <div className="companion-guidance">
              <p className="companion-choice">{selected ? `Selected: ${selected.displayName}${selected.id === catalog?.defaultPick?.id ? " · recommended" : ""}. Change it with Companion choices above.` : ""}</p>
              <p role="status" aria-live="polite" aria-atomic="true">
                {models.state.error ? companionFeedback.catalogue
                  : !catalog ? companionFeedback.checking
                  : selectedState === 'failed' || engineState === 'failed' ? companionFeedback.failed
                  : hostedStatus ? hostedStatus
                  : !hostedActive && engineState !== 'starting' && (!selected || selected.unsupported) ? companionFeedback.unavailable
                  : selectedState === 'downloading' ? `${companionFeedback.downloading} ${models.state.progress[selectedId ?? ''] ?? 0}%`
                  : selectedState === 'verifying' ? companionFeedback.verifying
                  : engineState === 'starting' ? `${slow ? companionFeedback.slow : companionFeedback.starting}${engineProgress === null ? '' : ` ${engineProgress}%`}`
                  : engineState === 'ready' ? companionFeedback.ready
                  : companionFeedback.setup}
              </p>
              {selectedState === 'downloading' && <progress aria-label="Companion download" max={100} value={models.state.progress[selectedId ?? ''] ?? 0} />}
              {engineState === 'starting' && <progress aria-label="Preparing Companion" max={100} value={engineProgress ?? undefined} />}
              <div className="companion-actions">
                {models.state.error && <button type="button" onClick={models.retryCatalog}>Try again</button>}
                {selected && !selected.unsupported && !streaming && (selectedState === 'idle' || selectedState === 'failed') &&
                  <button type="button" onClick={() => models.download(selected.id)}>
                    {selectedState === 'failed' ? 'Try again' : `Prepare Companion · about ${formatBytes(selected.bytes)}`}
                  </button>}
                {engineState === 'failed' && selectedState === 'downloaded' && <button type="button" onClick={() => setAttempt((value) => value + 1)}>Try again</button>}
                {(selectedState === 'downloading' || engineState === 'starting') && selected && <button type="button" onClick={() => models.cancel(selected.id)}>Cancel preparation</button>}
                {engineState !== 'ready' && <button type="button" onClick={() => setOpen(false)}>Return to Missal</button>}
              </div>
            </div>
            {orientationPrompt && <p role="status">Your orientation question is waiting. Prepare the Companion to hear its explanation; you can keep using the on-screen guide now.</p>}
            {replyNotice && <p className="companion-notice" role="status">{replyNotice}</p>}
            {streaming && genSeconds !== null && (
              <p className="chat-generating" role="status" aria-live="polite">
                <span className="chat-generating-dot" aria-hidden="true" /> Generating … {genSeconds}s
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {/* CL.6 (§H.6): assistant replies render through the safe
                    markdown renderer with the command suffix stripped; user
                    turns and authored strings stay plain text. */}
                {m.role === 'assistant' ? <ChatMarkdown text={stripGuideCommands(m.text)} /> : m.text}
                {/* CL.4 (§H.2): Save insight on each completed assistant
                    reply (never on the still-streaming tail). */}
                {m.role === 'assistant' && m.text.length > 0 && !(streaming && i === messages.length - 1) && (
                  <div className="companion-actions">
                    <button type="button" onClick={() => saveInsight(i)} disabled={!saveAvailable || savedInsights.has(i)}>
                      {savedInsights.has(i) ? 'Saved' : 'Save insight'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* CL.7 (§H.7): the starter-question chip rail — only while the
              conversation has no turns; after the first turn it never renders
              again for that conversation. */}
          {messages.length === 0 && (
            <div className="chat-prompts" role="group" aria-label="Starter questions">
              {COMPANION_PROMPTS.map((entry) => (
                <button key={entry.label} type="button" className="chat-prompt-chip" onClick={() => sendPrompt(entry)}>
                  {entry.label}
                </button>
              ))}
            </div>
          )}
          <footer className="chat-input">
            <textarea
              rows={2}
              value={input}
              placeholder="Ask the companion…"
              aria-label="Message the companion"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            {streaming ? (
              <button type="button" className="chat-stop" onClick={stop}>
                Stop
              </button>
            ) : (
              <button type="button" onClick={() => void send()} disabled={!input.trim() || engineState !== 'ready'}>
                Send
              </button>
            )}
          </footer>
        </section>
      )}
    </>
  );
}

function EngineChip({ state, hosted }: { state: 'idle' | 'starting' | 'ready' | 'failed'; hosted: boolean }) {
  return <span className="chat-engine-chip">
    {hosted ? 'HOSTED' : state === 'ready' ? 'Ready' : state === 'starting' ? 'Preparing…' : state === 'failed' ? 'Needs attention' : 'Setup'}
  </span>;
}
