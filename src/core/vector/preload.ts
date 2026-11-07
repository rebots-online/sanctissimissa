// ModelPreloader — L-native-embed-engine F4 (BA.13). Background, after the voice
// runtime settles (L.4 order): acquire + load the embedder, then the reranker,
// sequentially, on the runtime `resolveEmbedRuntime` picks. Sources:
//   native/Android → Play asset pack (model_pack_*), DownloadManager fallback;
//   native/desktop → shared model library (DesktopModelLibrary) + DownloadManager;
//   wllama         → OPFS (WebModelLibrary) for the three wllama files and the GGUF,
//                    handed to wllama as blob: URLs / {code} (never jsDelivr).
// Metered rule: no network bytes on a metered connection without session consent.
// see DOCS/sdk/play-asset-delivery/integrate-java.md (pack status set, requestFetch, cellular confirmation)
// see DOCS/sdk/network-information/mdn-networkinformation.md §Events
import type { TauriInvoke } from '../../../reusable-chatbot/core/capability-broker.ts';
import type { IInferenceEngine, SessionId } from '../../../reusable-chatbot/core/engine-types.ts';
import { NativeEmbedEngine } from '../../../reusable-chatbot/engines/native/embed.ts';
import { companionInvoke } from '../chat/runtime.ts';
import { makeDownloadManager, makeLibrary } from '../chat/models.ts';
import { debugEvent } from '../diagnostics/store.ts';
import type { DownloadManager } from '../model-store/download-manager.ts';
import { WebModelLibrary } from '../model-store/store.ts';
import type { ModelAsset, ModelLibrary } from '../model-store/types.ts';
import { isMetered, onNetworkCostChange } from '../net/metered.ts';
import { storageRootName } from '../storage/root.ts';

import { EMBED_MODEL_ASSETS, type AndroidModelPack, type EmbedAssetId, type EmbedAssetPin, type EmbedRole } from './assets.ts';
import { embedderFor, resolveEmbedRuntime, type EmbedRuntime } from './embedder.ts';
import { bindEmbedPair, readEmbedState, subscribeEmbedState, writeEmbedState, type EmbedSnapshot, type ModelState } from './embedState.ts';
import { WLLAMA_ASSETS, type WllamaAssetId } from './wllamaAssets.ts';

const ROLE_IDS: Record<EmbedRole, EmbedAssetId> = { embed: 'qwen3-embedding-0.6b-q8_0', rerank: 'qwen3-reranker-0.6b-q8_0' };
const WLLAMA_IDS: WllamaAssetId[] = ['wllama-3.8.1-wasm', 'wllama-compat-3.8.1-wasm', 'wllama-compat-3.8.1-js'];
const PACK_FALLBACK = new Set(['failed', 'canceled', 'not-installed', 'unknown', 'unsupported']);
const PACK_POLL_MS = 2000;

interface PackAnswer { status: string; path?: string; bytesDownloaded?: number; totalBytes?: number }
interface Store { lib: ModelLibrary; dm: DownloadManager }
interface WllamaUrls { wasmUrl: string; compatWasm: string; workerCode: string }
interface Ctx {
  runtime: EmbedRuntime;
  invoke?: TauriInvoke;
  android: boolean;
  native?: Store;
  web?: Store & { lib: WebModelLibrary; urls?: WllamaUrls };
}

let started: Promise<void> | null = null;
let ctx: Ctx | null = null;
let queue: Promise<void> = Promise.resolve();
let consent = false; // session-only (F4) — never persisted
const consentWaiters = new Set<() => void>();
const pendingPacks = new Set<AndroidModelPack>();
const confirmedPacks = new Set<AndroidModelPack>();
const accounted = new Map<string, { received: number; total: number }>();
const engines: Partial<Record<EmbedRole, { engine: IInferenceEngine; session: SessionId }>> = {};

function setRole(role: EmbedRole, state: ModelState, reason?: string): void {
  const patch: Partial<EmbedSnapshot> = role === 'embed' ? { embed: state } : { rerank: state };
  if (reason !== undefined) patch.reason = reason;
  writeEmbedState(patch);
}

/** progress = Σreceived / Σtotal over every asset this run acquires (quantized to 0.1 %). */
function account(key: string, received: number, total: number): void {
  accounted.set(key, { received, total });
  let r = 0, t = 0;
  for (const v of accounted.values()) { r += v.received; t += v.total; }
  writeEmbedState({ progress: t > 0 ? Math.floor((r / t) * 1000) / 1000 : 0 });
}

/** Metered rule (F4.4): wait for an unmetered connection or `consentMetered()`. */
async function gate(role: EmbedRole): Promise<void> {
  if (consent || !isMetered()) return;
  setRole(role, 'waiting-metered');
  await new Promise<void>((resolve) => {
    let off = () => {};
    const done = () => { off(); consentWaiters.delete(done); resolve(); };
    off = onNetworkCostChange((cost) => { if (cost === 'unmetered') done(); });
    consentWaiters.add(done);
  });
}

async function acquire(store: Store, role: EmbedRole, asset: ModelAsset, url: string, key: string): Promise<string> {
  const found = await store.lib.lookup(asset);
  if (found.kind === 'ready') { account(key, asset.bytes, asset.bytes); return found.locator; }
  await gate(role);
  setRole(role, 'downloading');
  account(key, 0, asset.bytes);
  const off = store.dm.onProgress((p) => {
    if (p.sha256 !== key) return;
    if (p.phase === 'looking-up' || p.phase === 'downloading') setRole(role, 'downloading');
    else if (p.phase === 'verifying') setRole(role, 'verifying');
    if (p.total > 0) account(key, p.received, p.total);
  });
  try {
    const result = await store.dm.acquire(asset, url, asset.sha256, key).promise;
    if (result.kind !== 'ready') throw new Error('reason' in result ? result.reason : result.kind);
    return result.locator;
  } finally {
    off();
  }
}

function nativeStore(c: Ctx): Store {
  if (!c.native) {
    const lib = makeLibrary(c.invoke, storageRootName());
    c.native = { lib, dm: makeDownloadManager(lib) };
  }
  return c.native;
}

/** Desktop (and Android fallback): DownloadManager-verified path → expectedSha256 null. */
async function nativeLibraryPath(c: Ctx, role: EmbedRole, id: EmbedAssetId, pin: EmbedAssetPin): Promise<{ path: string; packed: boolean }> {
  return { path: await acquire(nativeStore(c), role, pin.asset, pin.mirrorUrl, id), packed: false };
}

async function androidPackPath(c: Ctx, role: EmbedRole, id: EmbedAssetId, pin: EmbedAssetPin): Promise<{ path: string; packed: boolean }> {
  const pack = pin.androidPack;
  const ask = async (command: string) => (await c.invoke!(command, { pack })) as PackAnswer;
  try {
    const located = await ask('model_pack_location');
    if (located.status === 'ready' && located.path) {
      account(id, pin.asset.bytes, pin.asset.bytes);
      return { path: located.path, packed: true };
    }
    if (located.status !== 'unsupported') {
      await gate(role);
      let state = await ask('model_pack_fetch');
      for (;;) {
        if (state.status === 'ready') {
          const again = await ask('model_pack_location');
          if (again.status === 'ready' && again.path) {
            account(id, pin.asset.bytes, pin.asset.bytes);
            return { path: again.path, packed: true };
          }
          break;
        }
        if (PACK_FALLBACK.has(state.status)) break;
        if (state.status === 'waiting-wifi' || state.status === 'requires-confirmation') {
          pendingPacks.add(pack);
          setRole(role, 'waiting-metered');
          if (consent && !confirmedPacks.has(pack)) {
            confirmedPacks.add(pack);
            void ask('model_pack_confirm_cellular').catch(() => undefined);
          }
        } else {
          pendingPacks.delete(pack);
          setRole(role, 'downloading');
          if (state.totalBytes) account(id, state.bytesDownloaded ?? 0, state.totalBytes);
        }
        await new Promise((resolve) => setTimeout(resolve, PACK_POLL_MS));
        state = await ask('model_pack_state');
      }
    }
  } catch (error) {
    debugEvent('embed', 'pack.fallback', { pack, error }, 'warn');
  } finally {
    pendingPacks.delete(pack);
  }
  return nativeLibraryPath(c, role, id, pin); // mirror_url via DownloadManager
}

async function wllamaStore(c: Ctx, role: EmbedRole): Promise<Store & { lib: WebModelLibrary; urls: WllamaUrls }> {
  if (!c.web) {
    const lib = new WebModelLibrary(); // OPFS, even inside Tauri: the webview cannot read native paths
    c.web = { lib, dm: makeDownloadManager(lib) };
  }
  const web = c.web;
  for (const wid of WLLAMA_IDS) await acquire(web, role, WLLAMA_ASSETS[wid].asset, WLLAMA_ASSETS[wid].mirrorUrl, wid);
  if (!web.urls) {
    const wasmUrl = URL.createObjectURL(await web.lib.readFile(WLLAMA_ASSETS['wllama-3.8.1-wasm'].asset));
    const compatWasm = URL.createObjectURL(await web.lib.readFile(WLLAMA_ASSETS['wllama-compat-3.8.1-wasm'].asset));
    const workerCode = await (await web.lib.readFile(WLLAMA_ASSETS['wllama-compat-3.8.1-js'].asset)).text();
    web.urls = { wasmUrl, compatWasm, workerCode };
  }
  return web as Store & { lib: WebModelLibrary; urls: WllamaUrls };
}

/** Bind as soon as the embedder is ready; re-bind when the reranker settles. */
function bind(c: Ctx): void {
  const embed = engines.embed;
  if (!embed) return;
  const rerank = engines.rerank;
  bindEmbedPair(embedderFor(c.runtime, {
    embed: embed.engine,
    rerank: rerank?.engine ?? embed.engine,
    embedSession: embed.session,
    rerankSession: rerank?.session ?? null,
  }));
}

async function loadRole(c: Ctx, role: EmbedRole): Promise<void> {
  const id = ROLE_IDS[role];
  const pin = EMBED_MODEL_ASSETS[id];
  const t0 = performance.now();
  const onEvent = (op: 'texts' | 'rerank', detail: unknown) => debugEvent('embed', op, detail);
  try {
    let engine: IInferenceEngine;
    let artifactUrl: string;
    if (c.runtime === 'native') {
      const source = c.android ? await androidPackPath(c, role, id, pin) : await nativeLibraryPath(c, role, id, pin);
      // Play-pack paths carry the sha (embed_load verifies); library paths pass '' → null.
      engine = new NativeEmbedEngine(c.invoke!, { [id]: { role, bytes: pin.asset.bytes, sha256: source.packed ? pin.asset.sha256 : '' } }, onEvent);
      artifactUrl = source.path;
    } else {
      const web = await wllamaStore(c, role);
      artifactUrl = await acquire(web, role, pin.asset, pin.mirrorUrl, id);
      const { WllamaEmbedEngine } = await import('../../../reusable-chatbot/engines/wllama/embed.ts');
      engine = new WllamaEmbedEngine({
        role,
        wasmUrl: web.urls.wasmUrl,
        compat: { wasm: web.urls.compatWasm, workerCode: web.urls.workerCode },
        loadBlob: () => web.lib.readFile(pin.asset),
        onEvent,
      });
    }
    setRole(role, 'loading');
    const session = await engine.init({ modelId: id, artifactUrl, contextTokens: 2048 });
    engines[role] = { engine, session };
    bind(c); // before `ready`, so a ready-listener can call straight in
    setRole(role, 'ready');
    debugEvent('embed', 'load', { role, runtime: c.runtime, ms: Math.round(performance.now() - t0) });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    setRole(role, 'error', reason);
    debugEvent('embed', 'load.error', { role, runtime: c.runtime, reason }, 'error');
  }
}

/** Idempotent: a second call returns the first promise. */
export function startModelPreload(after: Promise<unknown>): Promise<void> {
  started ??= (async () => {
    await after.then(() => undefined, () => undefined); // L.4: after the voice runtime
    const invoke = companionInvoke();
    const runtime = await resolveEmbedRuntime(invoke);
    const c: Ctx = { runtime, invoke, android: typeof navigator !== 'undefined' && navigator.userAgent.includes('Android') };
    ctx = c;
    writeEmbedState({ runtime });
    queue = queue.then(async () => { await loadRole(c, 'embed'); await loadRole(c, 'rerank'); });
    await queue;
  })();
  return started;
}

/** Session-only metered consent; on Android packs also confirms cellular. */
export function consentMetered(): void {
  consent = true;
  for (const done of [...consentWaiters]) done();
  const invoke = ctx?.invoke;
  if (!invoke) return;
  for (const pack of pendingPacks) {
    if (confirmedPacks.has(pack)) continue;
    confirmedPacks.add(pack);
    void invoke('model_pack_confirm_cellular', { pack }).catch(() => undefined);
  }
}

/** Restarts only the models in `error`; never automatic. */
export function retry(): void {
  const c = ctx;
  if (!c) return;
  queue = queue.then(async () => {
    for (const role of ['embed', 'rerank'] as const) {
      if (readEmbedState()[role] !== 'error') continue;
      writeEmbedState({ reason: undefined });
      setRole(role, 'absent');
      await loadRole(c, role);
    }
  });
}

export function embedReadiness(): { runtime: EmbedRuntime | null; embed: ModelState; rerank: ModelState; progress: number; reason?: string } {
  return readEmbedState();
}

export function subscribeEmbedReadiness(cb: () => void): () => void {
  return subscribeEmbedState(() => cb());
}

export function isEmbedReady(): boolean { return readEmbedState().embed === 'ready'; }
export function isRerankReady(): boolean { return readEmbedState().rerank === 'ready'; }
