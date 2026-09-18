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
import ChatBadge from './ChatBadge.tsx';
import ModelPicker, { useCompanionModels } from './ModelPicker.tsx';
import { ChatController } from '../../reusable-chatbot/core/chat-controller.ts';
import { isTauri } from '../core/chat/models.ts';
import { resolveNativeEngine, resolveWebEngine, type Resolution } from '../core/chat/resolve.ts';

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
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const controllerRef = useRef<ChatController | null>(null);

  // Re-resolve when the picker's readiness landscape changes. Deps are
  // PRIMITIVES/STABLE REFERENCES only: the `models` hook object has a fresh
  // identity every render, and depending on it re-runs this effect on every
  // render — an IPC flood that freezes the webview (found in the AppImage
  // acceptance run). Live values ride refs instead.
  const readyKey = Object.entries(models.state.states)
    .map(([id, st]) => (st === 'ready' ? id : ''))
    .join('|');
  const modelsRef = useRef(models);
  modelsRef.current = models;
  const catalog = models.state.catalog;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const current = modelsRef.current;
      const report = current.state.catalog?.report;
      if (!report) return; // still probing — chip shows the probing state
      let resolved: Resolution;
      const invoke = isTauri()
        ? (window as unknown as { invoke: (c: string, a?: Record<string, unknown>) => Promise<unknown> }).invoke
        : undefined;
      if (invoke) {
        const candidates = (current.state.catalog?.ranked ?? [])
          .filter((m) => current.state.states[m.id] === 'ready')
          .map((m) => ({ id: m.id, displayName: m.displayName }));
        resolved = await resolveNativeEngine(invoke, report, current.locate, candidates);
      } else {
        resolved = await resolveWebEngine(report);
      }
      if (!cancelled) setResolution(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [readyKey, catalog]);

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

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text }]);
    setMessages((m) => [...m, { role: 'assistant', text: '' }]);
    setStreaming(true);
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      const resolved = resolution;
      if (!resolved || resolved.kind !== 'ready') {
        throw new Error(
          resolved && resolved.kind === 'needs-model'
            ? 'No model is downloaded yet — pick one in the picker above; the download is verified and stored once.'
            : (resolved?.reason ?? 'The engine is still probing — try again in a moment.'),
        );
      }
      const controller = controllerRef.current ?? new ChatController();
      if (controllerRef.current === null) {
        await controller.useEngine(resolved.engine, resolved.config);
        controllerRef.current = controller;
      }
      for await (const ev of controller.generate(text, abort.signal)) {
        setMessages((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { role: 'assistant', text: last.text + ev.text };
          return copy;
        });
      }
    } catch (error) {
      setMessages((m) => {
        const copy = m.slice();
        const last = copy[copy.length - 1];
        if (!last.text) {
          copy[copy.length - 1] = {
            role: 'assistant',
            text: `⚠ ${error instanceof Error ? error.message : String(error)}`,
          };
        }
        return copy;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => abortRef.current?.abort();

  const onPointerDown = (kind: DragKind) => (e: ReactPointerEvent<HTMLElement>) => {
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
              <EngineChip resolution={resolution} />
              <ModelPicker hook={models} compact />
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
            {messages.length === 0 && (
              <p className="chat-hello">
                ℣. Pax et gaudium. Ask about the propers, a feast, or a passage — answers stream from the model
                running on this device; pick one with the Models menu above if none is downloaded yet.
              </p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.text}
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
              <button type="button" onClick={() => void send()} disabled={!input.trim()}>
                Send
              </button>
            )}
          </footer>
        </section>
      )}
    </>
  );
}

function EngineChip({ resolution }: { resolution: Resolution | null }) {
  if (!resolution) {
    return (
      <span className="chat-engine-chip warn" title="Probing device capabilities">
        ...
      </span>
    );
  }
  if (resolution.kind === 'ready') {
    return (
      <span className="chat-engine-chip" title={'Running locally (' + resolution.label + ')'}>
        On-device
      </span>
    );
  }
  if (resolution.kind === 'needs-model') {
    return (
      <span className="chat-engine-chip warn" title={resolution.reason}>
        Needs model
      </span>
    );
  }
  return (
    <span className="chat-engine-chip warn" title={resolution.reason}>
      Unavailable
    </span>
  );
}
