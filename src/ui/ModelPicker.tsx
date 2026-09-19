/** Companion choices and verified download lifecycle; ready belongs to the engine. */
import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { RankedModel } from '../../reusable-chatbot/model-registry/rank.ts';
import { buildCompanionCatalog, entryAsset, makeDownloadManager, makeLibrary, readInstalledAssets,
  writeInstalledAsset, type CompanionCatalog } from '../core/chat/models.ts';
import { companionInvoke } from '../core/chat/runtime.ts';
import { selectedModelId, SELECTED_MODEL_KEY } from '../core/chat/resolve.ts';
import { companionFeedback, logCompanionFailure } from '../core/chat/feedback.ts';
import defaults from '../../config/companion-defaults.json' with { type: 'json' };
import { debugEvent } from '../core/diagnostics/store.ts';
import { storageRootName } from '../core/storage/root.ts';
import type { DownloadHandle } from '../core/model-store/download-manager.ts';
import type { ModelAsset } from '../core/model-store/types.ts';
import type { TauriInvoke } from '../../reusable-chatbot/core/capability-broker.ts';

export type ModelState = 'idle' | 'downloaded' | 'downloading' | 'verifying' | 'failed' | 'unsupported';
export interface PickerState {
  catalog: CompanionCatalog | null;
  states: Record<string, ModelState>;
  progress: Record<string, number>;
  selectedId: string | null;
  error: boolean;
}
export interface CompanionModels {
  state: PickerState;
  select(id: string): void;
  download(id: string): void;
  cancel(id: string): void;
  retryCatalog(): void;
  locate(id: string): Promise<string | null>;
}

function useModelState(invoke?: TauriInvoke, scopeDir = storageRootName()): CompanionModels {
  const [state, setState] = useState<PickerState>({ catalog: null, states: {}, progress: {}, selectedId: null, error: false });
  const [revision, setRevision] = useState(0);
  const backend = invoke ?? companionInvoke();
  const libraryRef = useRef<ReturnType<typeof makeLibrary> | null>(null);
  const managerRef = useRef<ReturnType<typeof makeDownloadManager> | null>(null);
  const installedRef = useRef<Record<string, ModelAsset>>({});
  const activeRef = useRef(new Map<string, DownloadHandle>());
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;
    let off = () => {};
    setState((s) => ({ ...s, catalog: null, error: false }));
    void (async () => {
      try {
        debugEvent('model-catalog', 'probe.start', { runtime: backend ? 'native' : 'browser' });
        const catalog = await buildCompanionCatalog(backend);
        debugEvent('model-catalog', 'probe.result', catalog);
        const library = makeLibrary(backend, scopeDir);
        const installed = readInstalledAssets();
        const states: Record<string, ModelState> = {};
        for (const model of catalog.ranked) {
          if (model.unsupported) states[model.id] = 'unsupported';
          else if (backend && installed[model.url]) {
            const found = await library.lookup(installed[model.url]);
            states[model.id] = found.kind === 'ready' ? 'downloaded' : 'idle';
          } else states[model.id] = 'idle';
        }
        if (cancelled) return;
        libraryRef.current = library;
        installedRef.current = installed;
        const manager = makeDownloadManager(library);
        managerRef.current = manager;
        off = manager.onProgress((p) => {
          if (cancelled || !activeRef.current.has(p.sha256)) return;
          setState((s) => ({ ...s,
            states: { ...s.states, [p.sha256]: p.phase === 'verifying' ? 'verifying' : 'downloading' },
            progress: { ...s.progress, [p.sha256]: p.total > 0 ? Math.min(100, Math.round(p.received / p.total * 100)) : 0 },
          }));
        });
        const previous = selectedModelId();
        // The hosted entry (§E) lives outside the ranked local catalogue —
        // keep an explicit hosted choice selected instead of collapsing it
        // back to the local default.
        const selectedId = previous === 'hosted:openrouter'
          ? 'hosted:openrouter'
          : catalog.ranked.find((m) => m.id === previous && !m.unsupported)?.id ?? catalog.defaultPick?.id ?? null;
        setState({ catalog, states, progress: {}, selectedId, error: false });
      } catch (error) {
        logCompanionFailure('choices', error);
        if (!cancelled) setState((s) => ({ ...s, error: true }));
      }
    })();
    const active = activeRef.current;
    return () => {
      mountedRef.current = false;
      cancelled = true;
      off();
      for (const handle of active.values()) handle.abort();
      active.clear();
    };
  }, [backend, scopeDir, revision]);

  const select = useCallback((id: string) => {
    debugEvent('model-selection', 'selected', { id });
    setState((s) => ({ ...s, selectedId: id }));
    try { localStorage.setItem(SELECTED_MODEL_KEY, id); }
    catch (error) { logCompanionFailure('remember-choice', error); }
  }, []);

  const download = useCallback((id: string) => {
    const model = state.catalog?.ranked.find((m) => m.id === id);
    if (!model || model.unsupported || activeRef.current.has(id)) return;
    select(id);
    if (!backend) {
      // Browser initialization owns its compiled assets and cache. Do not download a GGUF.
      setState((s) => ({ ...s, states: { ...s.states, [id]: 'downloaded' } }));
      return;
    }
    const manager = managerRef.current;
    if (!manager) return;
    setState((s) => ({ ...s, states: { ...s.states, [id]: 'downloading' }, progress: { ...s.progress, [id]: 0 } }));
    const asset = installedRef.current[model.url] ?? entryAsset(model);
    const handle = manager.acquire(asset, model.url, asset.sha256 || undefined, id);
    activeRef.current.set(id, handle);
    void (async () => {
      try {
        const result = await handle.promise;
        if (activeRef.current.get(id) !== handle) return;
        if (result.kind !== 'ready' || !result.asset) throw new Error('reason' in result ? result.reason : 'No verified model identity');
        installedRef.current[model.url] = result.asset;
        writeInstalledAsset(model.url, result.asset);
        if (mountedRef.current) setState((s) => ({ ...s, states: { ...s.states, [id]: 'downloaded' } }));
      } catch (error) {
        logCompanionFailure('download', error);
        if (mountedRef.current && activeRef.current.get(id) === handle) setState((s) => ({ ...s, states: { ...s.states, [id]: 'failed' } }));
      } finally {
        if (activeRef.current.get(id) === handle) activeRef.current.delete(id);
      }
    })();
  }, [state.catalog, backend, select]);

  const cancel = useCallback((id: string) => {
    activeRef.current.get(id)?.abort();
    activeRef.current.delete(id);
    setState((s) => ({ ...s, states: { ...s.states, [id]: 'idle' } }));
  }, []);
  const locate = useCallback(async (id: string) => {
    const model = state.catalog?.ranked.find((m) => m.id === id);
    const asset = model && installedRef.current[model.url];
    if (!asset || !libraryRef.current) return null;
    const found = await libraryRef.current.lookup(asset);
    return found.kind === 'ready' ? `${asset.sha256}::${found.locator}` : null;
  }, [state.catalog]);

  return { state, select, download, cancel, locate, retryCatalog: () => setRevision((r) => r + 1) };
}

const ModelsContext = createContext<CompanionModels | null>(null);
export function CompanionModelsProvider({ children }: { children: ReactNode }) {
  const models = useModelState();
  return <ModelsContext.Provider value={models}>{children}</ModelsContext.Provider>;
}
export function useCompanionModels(): CompanionModels {
  const models = useContext(ModelsContext);
  if (!models) throw new Error('CompanionModelsProvider is missing');
  return models;
}

export function formatBytes(bytes: number): string {
  if (!bytes) return 'size to be checked';
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

export interface ModelPickerProps { hook: CompanionModels; compact?: boolean; disabled?: boolean }
export default function ModelPicker({ hook, compact = false, disabled = false }: ModelPickerProps) {
  const { state, select, download } = hook;
  const [open, setOpen] = useState(false);
  const ranked = state.catalog?.ranked ?? [];
  const selected = ranked.find((m) => m.id === state.selectedId);
  const hostedLabel = `${defaults.hostedProvider.modelLabel} · hosted (free)`;
  const content = <>
    {state.error && <p role="status">{companionFeedback.catalogue} <button onClick={hook.retryCatalog}>Try again</button></p>}
    {!state.catalog && !state.error && <p role="status">{companionFeedback.checking}</p>}
    {state.catalog && !state.catalog.defaultPick && <p>{companionFeedback.unavailable}</p>}
    <ul className="model-picker-menu" aria-label="Companion choices">
      <li className="model-row hosted" key="hosted:openrouter">
        <button type="button" className="model-row-main" disabled={disabled}
          aria-pressed={state.selectedId === 'hosted:openrouter'} onClick={() => { select('hosted:openrouter'); setOpen(false); }}>
          <span className="model-name">{hostedLabel}</span>
          <span className="model-meta">Free hosted preview — needs internet. On-device choices below.</span>
        </button>
      </li>
      {ranked.map((model: RankedModel) => {
        const status = state.states[model.id] ?? 'idle';
        const busy = status === 'downloading' || status === 'verifying';
        return <li className={`model-row ${status}`} key={model.id}>
          <button type="button" className="model-row-main" disabled={disabled || model.unsupported || busy}
            aria-pressed={model.id === state.selectedId} onClick={() => { select(model.id); setOpen(false); }}>
            <span className="model-name">{model.displayName}</span>
            <span className="model-meta">{model.id === state.catalog?.defaultPick?.id ? 'Recommended · ' : ''}About {formatBytes(model.bytes)}{model.unsupported ? ' · Not available on this device' : ''}</span>
          </button>
          {!model.unsupported && <button type="button" className="model-download" disabled={disabled || busy}
            onClick={() => { download(model.id); setOpen(false); }}>
            {status === 'failed' ? 'Try again' : status === 'downloaded' ? 'Use this' : status === 'verifying' ? 'Checking…' : status === 'downloading' ? `${state.progress[model.id] ?? 0}%` : 'Prepare'}
          </button>}
        </li>;
      })}
    </ul>
  </>;
  return <div className={`model-picker ${compact ? 'compact' : 'full'}`}>
    {compact && <button type="button" className="model-picker-chip" aria-expanded={open} disabled={disabled}
      onClick={() => setOpen((value) => !value)} title={selected?.displayName}>Companion choices ⌄</button>}
    {(!compact || open) && <div className="model-picker-content">{content}</div>}
  </div>;
}
