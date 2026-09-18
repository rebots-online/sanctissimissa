import { debugEvent, debugTrace, traceOperation } from './store.ts';
let installed = false;

/** Install once before React: capture continues while the viewer is hidden. */
export function installDiagnosticCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  for (const level of ['debug', 'info', 'log', 'warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      debugEvent('console', level, args, level === 'log' ? 'info' : level);
      original(...args);
    };
  }
  window.addEventListener('error', (event: Event) => {
    if (event instanceof ErrorEvent) debugEvent('javascript', 'uncaught', { error: event.error, message: event.message, file: event.filename, line: event.lineno, column: event.colno }, 'error');
    else {
      const element = event.target as HTMLElement | null;
      debugEvent('resource', 'load.error', { tag: element?.tagName, url: element?.getAttribute?.('src') ?? element?.getAttribute?.('href') }, 'error');
    }
  }, true);
  window.addEventListener('unhandledrejection', (event) => debugEvent('javascript', 'unhandledrejection', event.reason, 'error'));
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const id = debugTrace('fetch');
    const start = performance.now();
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    debugEvent('network', 'fetch.start', { url, method: init?.method ?? (input instanceof Request ? input.method : 'GET') }, 'debug', id);
    try {
      const response = await originalFetch(input, init);
      debugEvent('network', 'fetch.headers', { url: response.url, status: response.status, statusText: response.statusText,
        contentLength: response.headers.get('content-length'), contentRange: response.headers.get('content-range'), durationMs: performance.now() - start }, response.ok ? 'info' : 'error', id);
      // Do not clone/consume response streams: the model downloader owns bytes and reports their progress.
      return response;
    } catch (error) {
      debugEvent('network', 'fetch.error', { url, durationMs: performance.now() - start, error }, 'error', id);
      throw error;
    }
  };
  const internals = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (command: string, args?: unknown, options?: unknown) => Promise<unknown> } }).__TAURI_INTERNALS__;
  if (internals?.invoke) {
    const originalInvoke = internals.invoke.bind(internals);
    internals.invoke = (command, args, options) => traceOperation('native-ipc', command, args, () => originalInvoke(command, args, options));
  }
  debugEvent('app', 'capture.started', { runtime: internals ? 'tauri' : 'browser', userAgent: navigator.userAgent,
    nativeStderr: 'not captured; native load stage and progress channel are recorded separately' });
}
