/**
 * Module core (§L.4, §L.9; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §3.3, §4).
 * Pure contracts shared by the host registry, the installer and the corpus attach path.
 * This file imports nothing outside src/core/modules/ — the host (src/core/library/)
 * supplies gates, delivery and entitlement; the data layer implements ModuleAttachTarget.
 */

export interface Module {
  id: string;
  kind: 'content' | 'feature';
  title: string;
  railIcon?: string;
  entitlement: string | null;
  delivery: 'builtin' | 'asset-pack' | 'download';
  version: number;
}

export type ModuleGates = Readonly<Record<string, string | null>>;

export interface AttachResult {
  moduleId: string;
  revision: number;
  nodes: number;
  edges: number;
  embeddings: number;
  searchRows: number;
  skippedExistingKeys: number;
  unresolvedEdges: number;
}

export type AttachRefusal =
  | 'schema-unsupported'
  | 'embed-meta-incompatible'
  | 'already-attached'
  | 'sha256-mismatch'
  | 'not-entitled';

export class AttachRefusedError extends Error {
  readonly refusal: AttachRefusal;
  constructor(refusal: AttachRefusal) {
    super(refusal);
    this.refusal = refusal;
    this.name = 'AttachRefusedError';
  }
}

export interface ModuleAttachTarget {
  attachModule(id: string, bytes: Uint8Array): Promise<AttachResult>;
}

export interface ModuleRegistry {
  list(): readonly Module[];
  get(id: string): Module | undefined;
  gate(id: string): string | null;
  canAttach(id: string): boolean;
}

export function createModuleRegistry(
  modules: readonly Module[],
  gates: ModuleGates,
  isEntitled: (m: Module) => boolean,
): ModuleRegistry {
  const byId = new Map(modules.map((m) => [m.id, m] as const));
  const frozen: readonly Module[] = Object.freeze(modules.slice());
  return {
    list: () => frozen,
    get: (id) => byId.get(id),
    gate: (id) => (Object.prototype.hasOwnProperty.call(gates, id) ? gates[id] : (byId.get(id)?.entitlement ?? null)),
    canAttach: (id) => {
      const m = byId.get(id);
      return !!m && m.kind === 'content' && m.delivery !== 'builtin' && isEntitled(m);
    },
  };
}
