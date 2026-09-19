// HC.1 focused tests — HostedOpenRouterProvider (SSE streaming, 404 fallback,
// honest errors, abort cleanliness, key non-leakage) and provision-secrets
// renderEnvLocal. Fetch is stubbed per-test via node:test mocks; there is NO
// network access here. Importing provision-secrets.mjs at module scope also
// proves its isMain guard (an unguarded script would process.exit the run).
import test from 'node:test';
import assert from 'node:assert/strict';
import { HostedOpenRouterProvider } from '../reusable-chatbot/engines/hosted-openrouter/index.ts';
import { renderEnvLocal } from '../scripts/provision-secrets.mjs';

const enc = new TextEncoder();
const DEFAULT_URL = 'https://openrouter.ai/api/v1/chat/completions';

function sseResponse(lines: string[], status = 200): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(enc.encode(`${line}\n\n`));
      controller.close();
    },
  });
  return new Response(stream, { status });
}

async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of it) out.push(v);
  return out;
}

test('two-delta SSE body yields tokens in order then ends', async (t) => {
  const calls: Array<{ url: unknown; init: RequestInit }> = [];
  t.mock.method(globalThis, 'fetch', async (url: unknown, init: RequestInit) => {
    calls.push({ url, init });
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      'data: [DONE]',
    ]);
  });
  const p = new HostedOpenRouterProvider('sk-or-test-key', 'qwen/qwen3.8-27b:free', null, 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  const tokens: string[] = [];
  for await (const ev of p.generate('s', { messages: [{ role: 'user', content: 'hi' }] })) {
    tokens.push(ev.text);
  }
  // In-order deltas, then the stream ENDS at data: [DONE].
  assert.deepEqual(tokens, ['Hello', ' world']);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, DEFAULT_URL);
  assert.equal(calls[0].init.method, 'POST');
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer sk-or-test-key');
  assert.equal(headers['Content-Type'], 'application/json');
  assert.equal(headers['HTTP-Referer'], 'https://sanctissimissa.surge.sh');
  assert.equal(headers['X-Title'], 'SanctissiMissa');
  const body = JSON.parse(String(calls[0].init.body)) as Record<string, unknown>;
  assert.equal(body.model, 'qwen/qwen3.8-27b:free');
  assert.deepEqual(body.messages, [{ role: 'user', content: 'hi' }]);
  assert.equal(body.stream, true);
  assert.equal(body.max_tokens, 32768);
  assert.equal(body.temperature, 0.7);
});

test('404 on the primary model retries exactly once on fallback', async (t) => {
  const requestedModels: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as { model: string };
    requestedModels.push(body.model);
    if (body.model === 'qwen/qwen3.8-27b:free') return new Response('model gone', { status: 404 });
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"Falls"}}]}',
      'data: {"choices":[{"delta":{"content":" back"}}]}',
      'data: [DONE]',
    ]);
  });
  const logs: Array<{ op: string; detail: unknown }> = [];
  const p = new HostedOpenRouterProvider(
    'sk-or-test-key',
    'qwen/qwen3.8-27b:free',
    'z-ai/glm-5.2:free',
    'SanctissiMissa',
    'https://sanctissimissa.surge.sh',
    undefined,
    (op, detail) => logs.push({ op, detail }),
  );
  const tokens: string[] = [];
  for await (const ev of p.generate('s', { messages: [{ role: 'user', content: 'hi' }] })) {
    tokens.push(ev.text);
  }
  assert.deepEqual(tokens, ['Falls', ' back']);
  assert.deepEqual(requestedModels, ['qwen/qwen3.8-27b:free', 'z-ai/glm-5.2:free']);
  const fallbackLogs = logs.filter((l) => l.op === 'fallback');
  assert.equal(fallbackLogs.length, 1);
  assert.deepEqual(fallbackLogs[0].detail, { from: 'qwen/qwen3.8-27b:free', to: 'z-ai/glm-5.2:free' });
});

test('a fallback 404 is NOT retried again — exactly one retry, then it throws', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('model gone', { status: 404 }),
  );
  const p = new HostedOpenRouterProvider('sk-or-test-key', 'primary-m', 'fallback-m', 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  await assert.rejects(
    collect(p.generate('s', { messages: [{ role: 'user', content: 'hi' }] })),
    { message: 'hosted http 404' },
  );
  assert.equal(fetchMock.mock.callCount(), 2);
});

test('HTTP 500 throws hosted http 500 (no fallback attempt)', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('boom', { status: 500 }),
  );
  const p = new HostedOpenRouterProvider('sk-or-test-key', 'primary-m', 'fallback-m', 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  await assert.rejects(
    collect(p.generate('s', { messages: [{ role: 'user', content: 'hi' }] })),
    { message: 'hosted http 500' },
  );
  assert.equal(fetchMock.mock.callCount(), 1);
});

test('an aborted AbortSignal stops iteration without throwing', async (t) => {
  let respond: () => Response = () => sseResponse(['data: [DONE]']);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => respond());

  // (a) signal already aborted before generation: no fetch, empty iteration.
  const pre = new HostedOpenRouterProvider('sk-or-test-key', 'm', null, 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  const ac = new AbortController();
  ac.abort();
  const before = await collect(pre.generate('s', { messages: [] }, ac.signal));
  assert.deepEqual(before, []);
  assert.equal(fetchMock.mock.callCount(), 0);

  // (b) abort mid-stream after the first delta: ends cleanly, keeps what streamed.
  // Plain response stub so the pull-driven stream is read exactly on demand.
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      pulls += 1;
      if (pulls === 1) controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"A"}}]}\n\n'));
      else if (pulls === 2) controller.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"B"}}]}\n\n'));
      else controller.close();
    },
  });
  respond = () => ({ ok: true, status: 200, body: stream }) as unknown as Response;
  const mid = new HostedOpenRouterProvider('sk-or-test-key', 'm', null, 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  const ac2 = new AbortController();
  const it = mid.generate('s', { messages: [] }, ac2.signal) as AsyncGenerator<{ text: string }>;
  const first = await it.next();
  assert.equal(first.done, false);
  assert.deepEqual(first.value, { text: 'A' });
  ac2.abort();
  const second = await it.next();
  assert.equal(second.done, true);
  assert.equal(second.value, undefined);
});

test('init throws without key or model and makes no network call', async (t) => {
  const fetchMock = t.mock.method(
    globalThis,
    'fetch',
    async () => new Response('unused', { status: 500 }),
  );
  const noKey = new HostedOpenRouterProvider('', 'some-model', null, 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  await assert.rejects(noKey.init({ modelId: 'some-model', artifactUrl: '' }), {
    message: 'hosted key missing',
  });
  const noModel = new HostedOpenRouterProvider('sk-or-test-key', '', null, 'SanctissiMissa', 'https://sanctissimissa.surge.sh');
  await assert.rejects(noModel.init({ modelId: '', artifactUrl: '' }), {
    message: 'hosted model missing',
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('no log/onProgress payload ever contains the key', async (t) => {
  const KEY = 'sk-or-SECRET-never-appears-in-logs';
  const seen: string[] = [];
  const seenHeaderRefs: string[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init: RequestInit) => {
    seenHeaderRefs.push(String((init.headers as Record<string, string>).Authorization));
    const body = JSON.parse(String(init.body)) as { model: string };
    if (body.model === 'primary-m') return new Response('gone', { status: 404 });
    if (body.model === 'boom-m') return new Response('boom', { status: 500 });
    return sseResponse([
      'data: {"choices":[{"delta":{"content":"ok"}}]}',
      'data: [DONE]',
    ]);
  });
  const record = (op: string, detail: unknown) => seen.push(JSON.stringify({ op, detail }));
  // Fallback path (emits a log) and error path (500 on the fallback try).
  const p = new HostedOpenRouterProvider(KEY, 'primary-m', 'fallback-m', 'SanctissiMissa', 'https://sanctissimissa.surge.sh', (f, txt) => {
    seen.push(JSON.stringify({ f, txt }));
  }, record);
  const tokens = (await collect(p.generate('s', { messages: [] }))).map((e) => e.text);
  assert.deepEqual(tokens, ['ok']);
  const pErr = new HostedOpenRouterProvider(KEY, 'boom-m', 'primary-m', 'SanctissiMissa', 'https://sanctissimissa.surge.sh', undefined, record);
  await assert.rejects(collect(pErr.generate('s', { messages: [] })), {
    message: 'hosted http 500',
  });
  // The key rides ONLY in the Authorization header (proving it was used) ...
  assert.deepEqual(seenHeaderRefs, [`Bearer ${KEY}`, `Bearer ${KEY}`, `Bearer ${KEY}`]);
  // ... and never in any log/onProgress payload or error message.
  for (const entry of seen) assert.equal(entry.includes(KEY), false, entry);
});

test('renderEnvLocal appends, replaces, and preserves other lines and newline state', () => {
  assert.equal(typeof renderEnvLocal, 'function');
  // Append to an empty file (absent target): single line, no trailing newline.
  assert.equal(renderEnvLocal('', 'VITE_OPENROUTER_API_KEY', 'sk-or-v1'), 'VITE_OPENROUTER_API_KEY=sk-or-v1');
  // Append preserves an existing trailing newline.
  assert.equal(renderEnvLocal('A=1\n', 'B', '2'), 'A=1\nB=2\n');
  // Append to a body without trailing newline keeps it absent.
  assert.equal(renderEnvLocal('A=1', 'B', '2'), 'A=1\nB=2');
  // Replace in place, other lines (comments, blanks) preserved verbatim in order.
  assert.equal(renderEnvLocal('A=1\nB=old\nC=3\n', 'B', 'new'), 'A=1\nB=new\nC=3\n');
  assert.equal(renderEnvLocal('# comment\n\nA=1\n', 'A', '9'), '# comment\n\nA=9\n');
  // Exactly ONE line for the key: duplicates collapse at the first position.
  const collapsed = renderEnvLocal('B=1\nX=9\nB=2\n', 'B', 'z');
  assert.equal(collapsed, 'B=z\nX=9\n');
  assert.equal((collapsed.match(/^B=/gm) ?? []).length, 1);
  // Idempotent round-trip: re-rendering changes nothing.
  const once = renderEnvLocal('A=1\nB=old\nC=3\n', 'B', 'new');
  assert.equal(renderEnvLocal(once, 'B', 'new'), once);
});
