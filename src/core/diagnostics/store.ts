/** Receipt order is authoritative; payloads are raw observations, not diagnoses. */
export type DebugLevel = 'debug' | 'info' | 'warn' | 'error';
export interface DebugEvent {
  seq: number;
  time: string;
  elapsedMs: number;
  source: string;
  level: DebugLevel;
  operation: string;
  traceId: string | null;
  detail: string;
}

export function serializeDebug(value: unknown): string {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(value, (_key, item: unknown) => {
      if (typeof item === 'bigint') return String(item);
      if (typeof item === 'function') return `[Function ${item.name}]`;
      if (item && typeof item === 'object') {
        if (seen.has(item)) return '[Circular]';
        seen.add(item);
        if (item instanceof Error) return { name: item.name, message: item.message, stack: item.stack, cause: item.cause };
        if (item instanceof ArrayBuffer) return { type: 'ArrayBuffer', byteLength: item.byteLength };
        if (ArrayBuffer.isView(item)) return { type: item.constructor.name, byteLength: item.byteLength };
        if (Array.isArray(item) && item.length > 256) return { type: 'Array', length: item.length, contents: 'omitted (large payload)' };
      }
      return item;
    }) ?? String(value);
  } catch { return '[Unserializable payload]'; }
}

export class DiagnosticStore {
  #events: DebugEvent[] = [];
  #seq = 0;
  #listeners = new Set<() => void>();
  #started = performance.now();
  dropped = 0;
  readonly limit: number;
  constructor(limit = 4000) { this.limit = limit; }
  record(source: string, operation: string, detail?: unknown, level: DebugLevel = 'info', traceId: string | null = null): void {
    try {
      const event: DebugEvent = Object.freeze({ seq: ++this.#seq, time: new Date().toISOString(),
        elapsedMs: Math.round((performance.now() - this.#started) * 10) / 10,
        source, operation, level, traceId, detail: serializeDebug(detail) });
      this.#events.push(event);
      if (this.#events.length > this.limit) { this.#events.shift(); this.dropped++; }
      for (const listener of this.#listeners) { try { listener(); } catch { /* diagnostics cannot break product work */ } }
    } catch { /* diagnostics must be inert on failure */ }
  }
  snapshot(): readonly DebugEvent[] { return this.#events.slice(); }
  subscribe(listener: () => void): () => void { this.#listeners.add(listener); return () => { this.#listeners.delete(listener); }; }
  clear(): void { this.#events = []; this.dropped = 0; this.record('diagnostics', 'buffer.cleared'); }
  export(): string { return this.#events.map((event) => JSON.stringify(event)).join('\n'); }
}

export const diagnostics = new DiagnosticStore();
let traceSequence = 0;
export function debugTrace(prefix: string): string { return `${prefix}-${++traceSequence}`; }
export function debugEvent(source: string, operation: string, detail?: unknown, level: DebugLevel = 'info', traceId: string | null = null): void {
  diagnostics.record(source, operation, detail, level, traceId);
}

export async function traceOperation<T>(source: string, operation: string, args: unknown, run: () => Promise<T>): Promise<T> {
  const traceId = debugTrace(source);
  const start = performance.now();
  debugEvent(source, `${operation}.start`, args, 'debug', traceId);
  try {
    const result = await run();
    debugEvent(source, `${operation}.end`, { durationMs: performance.now() - start, result }, 'debug', traceId);
    return result;
  } catch (error) {
    debugEvent(source, `${operation}.error`, { durationMs: performance.now() - start, error }, 'error', traceId);
    throw error;
  }
}
