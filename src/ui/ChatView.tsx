/**
 * ChatView — Companion surface (CP.5, operator directive 2026-09-16).
 * Default presentation is the ChatBadge intercom porthole; it expands to a
 * fully dockable + resizeable chat panel: dock-left, dock-right, floating
 * (header drag + corner resize), inline, fullscreen, and the mobile bottom
 * sheet. Mode + geometry persist via sidecar settings chat.dock /
 * chat.rect / chat.dockWidth. Turns stream through ChatController over the
 * mock engine (CP.3 WebGPU TurboQuant / CP.4 registry plug in unchanged).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { OPEN_COMPANION, guideContext, stripGuideCommands, applyGuideCommand } from '../core/orientation/guide.ts';
import ChatBadge from './ChatBadge.tsx';
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

export default function ChatView({ sidecar = null }: { sidecar?: SettingsStore | null }) {
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
  useEffect(() => {
    if (orientationPrompt && engineState === 'ready' && !streaming) {
      setOrientationPrompt(null);
      void sendRef.current(orientationPrompt);
    }
  }, [orientationPrompt, engineState, streaming]);

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
      for await (const ev of controller.generate(text, abort.signal, guideContext())) {
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
      else applyGuideCommand(response);
    } catch (error) {
      logCompanionFailure('reply', error);
      setInput((draft) => draft || text);
      // Hosted network/auth failures get the authored hosted line — an
      // authored notice, never an assistant token (the empty assistant
      // bubble is filtered out below).
      setReplyNotice(hostedActive ? companionFeedback.hostedNetwork : companionFeedback.reply);
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
                {m.role === 'assistant' ? stripGuideCommands(m.text) : m.text}
              </div>
            ))}
          </div>
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
