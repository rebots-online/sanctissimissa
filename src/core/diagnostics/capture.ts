import { debugEvent, debugTrace, traceOperation } from './store.ts';
let installed = false;

/**
 * Wrap a global for tracing without ever breaking boot. JSC (WebKitGTK)
 * exposes injected globals — `__TAURI_INTERNALS__.invoke` among them — as
 * read-only properties, and the strict-mode assignment throws during bundle
 * evaluation, leaving `#root` empty: the v1.56/v1.57 desktop blank-window
 * regression. Tracing is optional; mounting the app is not, so a property
 * that cannot be wrapped is recorded and skipped.
 */
function softWrap(target: object, key: string, wrap: (original: (...args: never[]) => unknown) => (...args: never[]) => unknown): void {
  const holder = target as Record<string, unknown>;
  const original = holder[key];
  if (typeof original !== 'function') return;
  try {
    holder[key] = wrap(original as (...args: never[]) => unknown);
  } catch {
    debugEvent('diagnostics', 'wrap.readonly', { key, note: 'read-only on this engine — tracing unavailable, boot unaffected' }, 'warn');
  }
}

/** Install once before React: capture continues while the viewer is hidden. */
export function installDiagnosticCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
    softWrap(console, level, (original) => (...args: never[]) => {
      debugEvent('console', level, args, level === 'log' ? 'info' : level);
      original(...args);
    });
  }
  window.addEventListener('error', (event: Event) => {
    if (event instanceof ErrorEvent) debugEvent('javascript', 'uncaught', { error: event.error, message: event.message, file: event.filename, line: event.lineno, column: event.colno }, 'error');
    else {
      const element = event.target as HTMLElement | null;
      debugEvent('resource', 'load.error', { tag: element?.tagName, url: element?.getAttribute?.('src') ?? element?.getAttribute?.('href') }, 'error');
    }
  }, true);
  window.addEventListener('unhandledrejection', (event) => debugEvent('javascript', 'unhandledrejection', event.reason, 'error'));
  softWrap(window, 'fetch', (originalFetch) => async (input: unknown, init?: unknown) => {
    const id = debugTrace('fetch');
    const start = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    debugEvent('network', 'fetch.start', { url, method: (init as RequestInit | undefined)?.method ?? (input instanceof Request ? input.method : 'GET') }, 'debug', id);
    try {
      const response = await (originalFetch as typeof fetch)(input as Parameters<typeof fetch>[0], init as Parameters<typeof fetch>[1]);
      debugEvent('network', 'fetch.headers', { url: response.url, status: response.status, statusText: response.statusText,
        contentLength: response.headers.get('content-length'), contentRange: response.headers.get('content-range'), durationMs: performance.now() - start }, response.ok ? 'info' : 'error', id);
      // Do not clone/consume response streams: the model downloader owns bytes and reports their progress.
      return response;
    } catch (error) {
      debugEvent('network', 'fetch.error', { url, durationMs: performance.now() - start, error }, 'error', id);
      throw error;
    }
  });
  const internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (command: string, args?: unknown, options?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
  if (internals?.invoke) {
    softWrap(internals, 'invoke', (originalInvoke) => (command: string, args?: unknown, options?: unknown) =>
      traceOperation('native-ipc', command, args, () => (originalInvoke as (cmd: string, a?: unknown, o?: unknown) => Promise<unknown>)(command, args, options)));
  }
  debugEvent('app', 'capture.started', { runtime: internals ? 'tauri' : 'browser', userAgent: navigator.userAgent,
    nativeStderr: 'not captured; native load stage and progress channel are recorded separately' });
}
