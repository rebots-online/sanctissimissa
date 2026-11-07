/**
 * Module boot and purchase attach (§L.4, §L.9; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §3.3 steps 1, 2, 4).
 * Startup: first entitlement refresh → catalogue → host registry → attach every entitled, installed
 * content module. Revocation (explicit RevenueCat "not entitled", source 'live') reloads the app,
 * after which boot skips the module.
 */
import type { CorpusDb } from '../data/corpusDb.ts';
import type { SidecarDb } from '../accompaniment/store.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { getCommerce } from '../entitlements/service.ts';
import { AttachRefusedError, type AttachResult, type ModuleAttachTarget, type ModuleRegistry } from '../modules/core.ts';
import { hostModuleRegistry } from './moduleRegistry.ts';
import { isAndroidTauri, moduleInstaller, type ModuleInstaller } from './modules.ts';

const ENTITLED_STATES = ['free', 'owned', 'subscription'];

/** Module ids attached to the live corpus in this page lifetime. */
const attachedModules = new Set<string>();

function noteRefusal(id: string, err: unknown): boolean {
  if (!(err instanceof AttachRefusedError)) return false;
  if (err.refusal === 'already-attached') attachedModules.add(id);
  else debugEvent('modules', 'attach-refused', { id, refusal: err.refusal }, 'warn');
  return true;
}

export async function attachInstalledModules(
  db: ModuleAttachTarget,
  installer: ModuleInstaller,
  registry: ModuleRegistry,
): Promise<AttachResult[]> {
  const results: AttachResult[] = [];
  for (const m of registry.list()) {
    if (!registry.canAttach(m.id)) continue;
    try {
      const bytes = await installer.load(m.id);
      if (!bytes) continue;
      const result = await db.attachModule(m.id, bytes);
      attachedModules.add(m.id);
      debugEvent('modules', 'attach', result);
      results.push(result);
    } catch (err) {
      if (!noteRefusal(m.id, err)) debugEvent('modules', 'attach-failed', { id: m.id, error: err }, 'warn');
    }
  }
  return results;
}

export async function installAndAttach(
  db: ModuleAttachTarget,
  installer: ModuleInstaller,
  editionId: string,
  signal?: AbortSignal,
  onProgress?: (f: number) => void,
): Promise<AttachResult> {
  await installer.install(editionId, signal ?? new AbortController().signal, onProgress ?? (() => {}));
  const bytes = await installer.load(editionId);
  if (!bytes) throw new Error('module-not-installed');
  try {
    const result = await db.attachModule(editionId, bytes);
    attachedModules.add(editionId);
    debugEvent('modules', 'attach', result);
    return result;
  } catch (err) {
    noteRefusal(editionId, err);
    throw err;
  }
}

export function bootModules(db: CorpusDb, sidecar: SidecarDb): () => void {
  let cancelled = false;
  let unsubscribe: (() => void) | null = null;
  void (async () => {
    const { entitlements } = getCommerce(sidecar);
    try {
      await entitlements.refresh();
    } catch {
      /* any outcome: accessFor answers from cache or 'none' */
    }
    if (cancelled) return;
    const catalogue = await moduleInstaller.catalogue();
    const registry = hostModuleRegistry(entitlements, catalogue, isAndroidTauri());
    await attachInstalledModules(db, moduleInstaller, registry);
    if (cancelled) return;
    unsubscribe = entitlements.subscribe(() => {
      for (const id of attachedModules) {
        const access = entitlements.accessFor(id);
        if (!ENTITLED_STATES.includes(access.state) && access.source === 'live') {
          window.location.reload();
          return;
        }
      }
    });
  })().catch((err: unknown) => debugEvent('modules', 'boot-failed', { error: err }, 'warn'));
  return () => {
    cancelled = true;
    unsubscribe?.();
  };
}
