/**
 * ModelPicker (CP.4, §7.8.5): the Companion's model surface. No
 * preview/mock/placeholder state ever appears here — every entry is a real
 * catalog model with an honest readiness state: ready / download % /
 * needs setup / unsupported on this device. The automatic qualified default
 * is offered on first open; manual selection persists `chat.modelId`.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RankedModel } from '../../reusable-chatbot/model-registry/rank.ts';
import {
  buildCompanionCatalog,
  entryAsset,
  isTauri,
  makeDownloadManager,
  makeLibrary,
  readAliases,
  writeAlias,
  type CompanionCatalog,
} from '../core/chat/models.ts';
import type { DownloadProgress } from '../core/model-store/download-manager.ts';
import type { TauriInvoke } from '../../reusable-chatbot/core/capability-broker.ts';

export type ModelState = 'loading' | 'ready' | 'idle' | 'downloading' | 'failed' | 'unsupported';

export interface PickerState {
  catalog: CompanionCatalog | null;
  states: Record<string, ModelState>;
  progress: Record<string, number>;
  selectedId: string | null;
  error: string | null;
}

interface Hook {
  state: PickerState;
  select(id: string): void;
  download(id: string): void;
  locate(id: string): Promise<string | null>;
}

export function useCompanionModels(invoke?: TauriInvoke, scopeDir?: string | null): Hook {
  const [state, setState] = useState<PickerState>({
    catalog: null,
    states: {},
    progress: {},
    selectedId: null,
    error: null,
  });
  const managerRef = useRef<ReturnType<typeof makeDownloadManager> | null>(null);
  const assetsRef = useRef<Map<string, ReturnType<typeof entryAsset>>>(new Map());
  const keyMapRef = useRef<Map<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const tauriInvoke = invoke ?? (isTauri() ? (window as unknown as { invoke: TauriInvoke }).invoke : undefined);
        const catalog = await buildCompanionCatalog(tauriInvoke);
        if (cancelled) return;
        const library = makeLibrary(tauriInvoke, scopeDir);
        const manager = makeDownloadManager(library);
        managerRef.current = manager;
        const aliases = typeof localStorage === 'undefined' ? {} : readAliases();
        const states: Record<string, ModelState> = {};
        const progress: Record<string, number> = {};
        for (const model of catalog.ranked) {
          assetsRef.current.set(model.id, entryAsset(model));
          if (model.unsupported) {
            states[model.id] = 'unsupported';
            continue;
          }
          const alias = aliases[model.url];
          if (alias) {
            const lookup = await library.lookup({ ...entryAsset(model), sha256: alias });
            states[model.id] = lookup.kind === 'ready' ? 'ready' : 'idle';
          } else {
            states[model.id] = 'idle';
          }
        }
        const keyToModel = new Map<string, string>();
        keyMapRef.current = keyToModel;
        manager.onProgress((p: DownloadProgress) => {
          const modelId = keyToModel.get(p.sha256) ?? (p.phase === 'ready' ? undefined : undefined);
          if (!modelId) return;
          setState((s) => ({
            ...s,
            states: {
              ...s.states,
              ...(p.phase === 'ready' ? { [modelId]: 'ready' as ModelState } : {}),
              ...(p.phase === 'failed' ? { [modelId]: 'failed' as ModelState } : {}),
            },
            progress: {
              ...s.progress,
              [modelId]: p.total > 0 ? Math.min(100, Math.round((p.received / p.total) * 100)) : 0,
            },
          }));
        });
        setState({ catalog, states, progress, selectedId: null, error: null });
      } catch (error) {
        if (!cancelled) {
          setState((s) => ({ ...s, error: error instanceof Error ? error.message : String(error) }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const select = useCallback((id: string) => {
    setState((s) => ({ ...s, selectedId: id }));
    if (typeof localStorage !== 'undefined') localStorage.setItem('chat.modelId', id);
  }, []);

  const download = useCallback((id: string) => {
    const manager = managerRef.current;
    const model = state.catalog?.ranked.find((m) => m.id === id);
    if (!manager || !model) return;
    const asset = entryAsset(model);
    assetsRef.current.set(id, asset);
    keyMapRef.current?.set(`${model.repo}-${model.quant}`, id);
    setState((s) => ({ ...s, states: { ...s.states, [id]: 'downloading' }, progress: { ...s.progress, [id]: 0 } }));
    manager.acquire(asset, model.url, undefined, `${model.repo}-${model.quant}`);
    // Record the catalogue alias when the verified commit lands.
    const off = manager.onProgress((p) => {
      if (p.phase === 'ready' && /^[a-f0-9]{64}$/.test(p.sha256)) {
        writeAlias(model.url, p.sha256);
        off();
      }
    });
  }, [state.catalog]);

  const locate = useCallback(
    async (id: string): Promise<string | null> => {
      const model = state.catalog?.ranked.find((m) => m.id === id);
      const library = makeLibrary(isTauri() ? (window as unknown as { invoke: TauriInvoke }).invoke : undefined);
      if (!model) return null;
      const alias = readAliases()[model.url];
      if (!alias) return null;
      const result = await library.lookup({ ...entryAsset(model), sha256: alias });
      return result.kind === 'ready' ? `${alias}::${result.locator}` : null;
    },
    [state.catalog],
  );

  return { state, select, download, locate };
}

export function formatBytes(bytes: number): string {
  if (!bytes) return 'size unknown';
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

export interface ModelPickerProps {
  hook: Hook;
  compact?: boolean;
}

/** Header chip/menu — used by ChatView; also embedded in Settings' Library tab. */
export default function ModelPicker({ hook, compact = false }: ModelPickerProps) {
  const { state, select, download } = hook;
  const [open, setOpen] = useState(false);
  const ranked: RankedModel[] = state.catalog?.ranked ?? [];
  const selected = useMemo(
    () => ranked.find((m) => m.id === state.selectedId) ?? state.catalog?.defaultPick ?? null,
    [ranked, state.selectedId, state.catalog],
  );
  if (compact) {
    const st = selected ? state.states[selected.id] : 'loading';
    const label =
      st === 'ready'
        ? (selected?.displayName ?? 'Model')
        : st === 'downloading'
          ? `${state.progress[selected?.id ?? ''] ?? 0}%`
          : st === 'unsupported'
            ? 'Unsupported here'
            : st === 'failed'
              ? 'Download failed'
              : st === 'loading'
                ? 'Models…'
                : 'Set up model';
    return (
      <div className="model-picker compact">
        <button
          type="button"
          className={`model-picker-chip${open ? ' open' : ''}`}
          aria-expanded={open}
          aria-haspopup="listbox"
          title={selected ? `${selected.displayName} · ${selected.quant} · ${formatBytes(selected.bytes)}` : 'Choose a model'}
          onClick={() => setOpen((o) => !o)}
        >
          {label} ⌄
        </button>
        {open && (
          <ul className="model-picker-menu" role="listbox" aria-label="Companion models">
            {ranked.map((m) => (
              <li key={m.id}>
                <ModelRow model={m} st={state.states[m.id] ?? 'idle'} pct={state.progress[m.id]} onSelect={select} onDownload={download} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
  return (
    <div className="model-picker full">
      {state.error && <p className="model-error">Catalog unavailable: {state.error}</p>}
      <ul className="model-picker-menu" role="listbox" aria-label="Companion models">
        {ranked.map((m) => (
          <li key={m.id}>
            <ModelRow model={m} st={state.states[m.id] ?? 'idle'} pct={state.progress[m.id]} onSelect={select} onDownload={download} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModelRow({
  model,
  st,
  pct,
  onSelect,
  onDownload,
}: {
  model: RankedModel;
  st: ModelState;
  pct?: number;
  onSelect(id: string): void;
  onDownload(id: string): void;
}) {
  return (
    <div className={`model-row ${st}`}>
      <button
        type="button"
        role="option"
        aria-selected={false}
        disabled={st === 'unsupported'}
        className="model-row-main"
        onClick={() => onSelect(model.id)}
      >
        <span className="model-name">{model.displayName}</span>
        <span className="model-meta">
          {model.quant} · {formatBytes(model.bytes)}
          {model.license ? ` · ${model.license}` : ''}
        </span>
        {st === 'unsupported' && <span className="model-why">{model.unsupportedReason}</span>}
      </button>
      {st === 'idle' && (
        <button type="button" className="model-download" onClick={() => onDownload(model.id)}>
          Download
        </button>
      )}
      {st === 'downloading' && <span className="model-progress">{pct ?? 0}%</span>}
      {st === 'ready' && <span className="model-ready">ready ✓</span>}
      {st === 'failed' && (
        <button type="button" className="model-download retry" onClick={() => onDownload(model.id)}>
          Retry
        </button>
      )}
    </div>
  );
}
