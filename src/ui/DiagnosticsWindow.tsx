import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { diagnostics, debugEvent, type DebugEvent } from '../core/diagnostics/store.ts';

export const OPEN_DIAGNOSTICS = 'sanctissimissa:open-diagnostics';
export function openDiagnostics(): void { window.dispatchEvent(new Event(OPEN_DIAGNOSTICS)); }

export default function DiagnosticsWindow() {
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [paused, setPaused] = useState(false);
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('all');
  const [level, setLevel] = useState('all');
  const [events, setEvents] = useState<readonly DebugEvent[]>([]);
  const [position, setPosition] = useState({ x: 16, y: 72 });
  const [popup, setPopup] = useState<Window | null>(null);
  const [copyText, setCopyText] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  useEffect(() => {
    const show = () => { setOpen(true); setEvents(diagnostics.snapshot()); };
    window.addEventListener(OPEN_DIAGNOSTICS, show);
    return () => window.removeEventListener(OPEN_DIAGNOSTICS, show);
  }, []);
  useEffect(() => {
    if (!open || paused) return;
    setEvents(diagnostics.snapshot());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = diagnostics.subscribe(() => {
      timer ??= setTimeout(() => { timer = undefined; setEvents(diagnostics.snapshot()); }, 100);
    });
    return () => { off(); clearTimeout(timer); };
  }, [open, paused]);
  useEffect(() => {
    if (follow && !paused) list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [events, follow, paused, query, source, level]);
  useEffect(() => {
    if (!popup) return;
    const closed = () => setPopup(null);
    popup.addEventListener('beforeunload', closed);
    const close = () => popup.close();
    window.addEventListener('beforeunload', close);
    return () => { popup.removeEventListener('beforeunload', closed); window.removeEventListener('beforeunload', close); popup.close(); };
  }, [popup]);

  const popOut = () => {
    const child = window.open('', 'sanctissimissa-diagnostics', 'width=850,height=540');
    if (!child) { debugEvent('diagnostics', 'popout.unavailable'); return; }
    child.document.title = 'SanctissiMissa — Diagnostics';
    // Clone authored styles; event text is rendered by React, never injected as HTML.
    for (const element of document.querySelectorAll('style, link[rel="stylesheet"]')) child.document.head.appendChild(element.cloneNode(true));
    child.document.body.className = document.body.className;
    child.document.documentElement.setAttribute('style', document.documentElement.getAttribute('style') ?? '');
    setPopup(child);
  };
  const copy = async () => {
    const text = diagnostics.export();
    try { await navigator.clipboard.writeText(text); }
    catch { setCopyText(text); }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([diagnostics.export()], { type: 'application/x-ndjson' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sanctissimissa-diagnostics-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const beginDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (docked || popup || (event.target as HTMLElement).closest('button')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, left: position.x, top: position.y };
  };
  if (!open) return null;
  const filtered = events.filter((event) => (source === 'all' || event.source === source) && (level === 'all' || event.level === level)
    && `${event.operation} ${event.traceId ?? ''} ${event.detail}`.toLowerCase().includes(query.toLowerCase()));
  const panel = <section className={`diagnostics-window ${docked ? 'docked' : 'floating'}${popup ? ' popped-out' : ''}`}
    aria-label="Live diagnostics" style={!docked && !popup ? { left: position.x, top: position.y } : undefined}>
    <header className="diagnostics-title" onPointerDown={beginDrag} onPointerUp={() => { drag.current = null; }} onPointerMove={(event) => {
      const start = drag.current;
      if (start) setPosition({ x: Math.max(0, Math.min(window.innerWidth - 120, start.left + event.clientX - start.x)),
        y: Math.max(0, Math.min(window.innerHeight - 60, start.top + event.clientY - start.y)) });
    }}>
      <strong>Diagnostics</strong><span>{paused ? 'Display paused · capture continues' : 'Live'}</span>
      {!popup && <button onClick={() => setDocked((value) => !value)}>{docked ? 'Undock' : 'Dock'}</button>}
      <button onClick={() => popup ? setPopup(null) : popOut()}>{popup ? 'Return to app' : 'Pop out'}</button>
      <button aria-label="Close diagnostics" onClick={() => { setPopup(null); setOpen(false); }}>×</button>
    </header>
    <div className="diagnostics-tools">
      <button onClick={() => setPaused((value) => !value)}>{paused ? 'Resume display' : 'Pause display'}</button>
      <label><input type="checkbox" checked={follow} onChange={(event) => setFollow(event.target.checked)} /> Follow latest</label>
      <input aria-label="Filter diagnostics" placeholder="Filter events or operation ID" value={query} onChange={(event) => setQuery(event.target.value)} />
      <select aria-label="Diagnostic source" value={source} onChange={(event) => setSource(event.target.value)}><option value="all">All sources</option>
        {[...new Set(events.map((event) => event.source))].sort().map((name) => <option key={name}>{name}</option>)}
      </select>
      <select aria-label="Diagnostic severity" value={level} onChange={(event) => setLevel(event.target.value)}>
        {['all', 'debug', 'info', 'warn', 'error'].map((name) => <option key={name} value={name}>{name === 'all' ? 'All levels' : name}</option>)}
      </select>
      <button onClick={() => { diagnostics.clear(); setEvents(diagnostics.snapshot()); }}>Clear</button>
      <button onClick={() => void copy()}>Copy all</button><button onClick={download}>Save log</button>
    </div>
    <div className="diagnostics-events" ref={list} tabIndex={0}>
      {filtered.map((event) => <pre key={event.seq} className={`diagnostics-event ${event.level}`}>
        {`#${event.seq} ${event.time} +${event.elapsedMs}ms [${event.level}] ${event.source} / ${event.operation}${event.traceId ? ` (${event.traceId})` : ''}\n${event.detail}`}
      </pre>)}
      {!filtered.length && <p>No matching events.</p>}
    </div>
    <footer>{filtered.length} shown · {events.length} retained · {diagnostics.dropped} older events dropped. Copy/Save includes the full retained log. Native stderr is not captured.</footer>
    {copyText !== null && <label className="diagnostics-copy">Select and copy the log<textarea readOnly value={copyText} onFocus={(event) => event.target.select()} /><button onClick={() => setCopyText(null)}>Done</button></label>}
  </section>;
  return createPortal(panel, popup?.document.body ?? document.body);
}
