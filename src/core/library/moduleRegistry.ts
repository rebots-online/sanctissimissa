/**
 * Host module registry (§L.4; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §3.3, §4).
 * Haydock stays builtin and free; Catena is the paid content module.
 */
import { createModuleRegistry, type Module, type ModuleGates, type ModuleRegistry } from '../modules/core.ts';
import type { ModuleEntry } from './modules.ts';

export const MODULE_GATES: ModuleGates = { haydock: null, 'catena-aurea-en': 'reference_catena-aurea-en' };

const ENTITLED_STATES = ['free', 'owned', 'subscription'];

export function hostModules(catalogue: ModuleEntry[], androidTauri: boolean): Module[] {
  const catena = catalogue.find((e) => e.moduleId === 'catena-aurea-en' || e.editionId === 'catena-aurea-en');
  return [
    { id: 'haydock', kind: 'content', title: 'Haydock Commentary', entitlement: null, delivery: 'builtin', version: 1 },
    {
      id: 'catena-aurea-en',
      kind: 'content',
      title: 'Catena Aurea',
      entitlement: 'reference_catena-aurea-en',
      delivery: androidTauri ? 'asset-pack' : 'download',
      version: catena ? catena.revision : 0,
    },
  ];
}

export function hostModuleRegistry(
  access: { accessFor(editionId: string): { state: string } },
  catalogue: ModuleEntry[],
  androidTauri: boolean,
): ModuleRegistry {
  return createModuleRegistry(hostModules(catalogue, androidTauri), MODULE_GATES, (m) =>
    ENTITLED_STATES.includes(access.accessFor(m.id).state),
  );
}
