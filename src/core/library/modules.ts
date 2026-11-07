/**
 * ModuleInstaller (§L.4, §L.9; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.4, §2.5, §3.3).
 * Catalogue = bundled content/library/modules.json floor, replaced per entry by a strictly newer
 * remote revision. Bytes come from the Android Play on-demand pack (module_pack_fetch) or the
 * module host; sha256 must match the entry; installed bytes live in IndexedDB.
 */
import { companionInvoke } from '../chat/runtime.ts';
import { AttachRefusedError } from '../modules/core.ts';
import { MODULE_BASE_URL } from './moduleHost.ts';

export type ModuleEntry = {
  moduleId: string;
  editionId: string;
  title: string;
  file: string;
  revision: number;
  appVersion: string;
  corpusVersion: string;
  sizeBytes: number;
  sha256: string;
  contentDigest: string;
  entitlementId: string;
  nucleusSource: string;
  authorityKind: string;
  androidPack: string;
  embedMeta: Record<string, string>;
};

export interface InstalledModule {
  editionId: string;
  revision: number;
  sha256: string;
  sizeBytes: number;
  storedAt: string;
}

interface StoredPackage extends InstalledModule {
  bytes: Uint8Array;
}

interface ModulesFile {
  schema?: number;
  modules?: ModuleEntry[];
}

const PACKAGES_DB = 'sanctissimissa.library.packages.v1';
const PACKAGES_STORE = 'packages';

const bundled = import.meta.glob('../../../content/library/modules.json', { eager: true, import: 'default' }) as Record<
  string,
  ModulesFile
>;

function floorEntries(): ModuleEntry[] {
  const file = Object.values(bundled)[0];
  return Array.isArray(file?.modules) ? file.modules.slice() : [];
}

export function isAndroidTauri(): boolean {
  return companionInvoke() !== undefined && typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
}

// see DOCS/sdk/indexeddb/mdn-using-indexeddb.md §Connecting to a database (open + onupgradeneeded store creation)
function openPackages(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(PACKAGES_DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(PACKAGES_STORE)) {
        req.result.createObjectStore(PACKAGES_STORE, { keyPath: 'editionId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('indexeddb-open-failed'));
  });
}

// see DOCS/sdk/indexeddb/mdn-idbobjectstore-put.md §Syntax (put/get/delete inside one readwrite/readonly transaction)
async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openPackages();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(PACKAGES_STORE, mode);
      const req = run(tx.objectStore(PACKAGES_STORE));
      let value: T;
      req.onsuccess = () => { value = req.result as T; };
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error ?? req.error ?? new Error('indexeddb-transaction-failed'));
      tx.onabort = () => reject(tx.error ?? new Error('indexeddb-transaction-aborted'));
    });
  } finally {
    db.close();
  }
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fetchNetwork(entry: ModuleEntry, signal: AbortSignal, onProgress: (f: number) => void): Promise<Uint8Array> {
  const res = await fetch(`${MODULE_BASE_URL}/${entry.file}`, { signal });
  if (!res.ok) throw new Error(`module-fetch-failed:${res.status}`);
  const total = Number(res.headers.get('Content-Length')) || entry.sizeBytes || 0;
  if (!res.body) {
    const whole = new Uint8Array(await res.arrayBuffer());
    onProgress(1);
    return whole;
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    if (total > 0) onProgress(Math.min(1, received / total));
  }
  const out = new Uint8Array(received);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  onProgress(1);
  return out;
}

export class ModuleInstaller {
  async catalogue(): Promise<ModuleEntry[]> {
    const byId = new Map(floorEntries().map((e) => [e.editionId, e] as const));
    try {
      const res = await fetch(`${MODULE_BASE_URL}/modules.json`, { cache: 'no-store' });
      if (res.ok) {
        const remote = (await res.json()) as ModulesFile;
        for (const e of Array.isArray(remote.modules) ? remote.modules : []) {
          if (!e || typeof e.editionId !== 'string' || !Number.isInteger(e.revision)) continue;
          const floor = byId.get(e.editionId);
          if (!floor || e.revision > floor.revision) byId.set(e.editionId, e);
        }
      }
    } catch {
      /* network failure leaves the bundled floor */
    }
    return [...byId.values()];
  }

  async install(editionId: string, signal: AbortSignal, onProgress: (f: number) => void): Promise<InstalledModule> {
    const entry = (await this.catalogue()).find((e) => e.editionId === editionId);
    if (!entry) throw new Error('unknown-module');
    let bytes: Uint8Array | null = null;
    const invoke = companionInvoke();
    if (invoke && isAndroidTauri()) {
      try {
        const buf = await invoke('module_pack_fetch', { pack: entry.androidPack, file: entry.file });
        if (buf instanceof ArrayBuffer) bytes = new Uint8Array(buf);
        else if (ArrayBuffer.isView(buf)) bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
        if (bytes) onProgress(1);
      } catch {
        bytes = null; // any rejection (sideload, unsupported, failed) falls back to the network
      }
    }
    if (!bytes) bytes = await fetchNetwork(entry, signal, onProgress);
    const digest = toHex(await crypto.subtle.digest('SHA-256', bytes as Uint8Array<ArrayBuffer>));
    if (digest !== entry.sha256.toLowerCase()) throw new AttachRefusedError('sha256-mismatch');
    const record: StoredPackage = {
      editionId,
      revision: entry.revision,
      sha256: digest,
      sizeBytes: bytes.byteLength,
      storedAt: new Date().toISOString(),
      bytes,
    };
    await withStore<IDBValidKey>('readwrite', (s) => s.put(record));
    return { editionId, revision: record.revision, sha256: digest, sizeBytes: record.sizeBytes, storedAt: record.storedAt };
  }

  async load(editionId: string): Promise<Uint8Array | null> {
    if (typeof indexedDB === 'undefined') return null;
    const rec = await withStore<StoredPackage | undefined>('readonly', (s) => s.get(editionId));
    return rec?.bytes ? new Uint8Array(rec.bytes) : null;
  }

  async remove(editionId: string): Promise<void> {
    if (typeof indexedDB === 'undefined') return;
    await withStore<undefined>('readwrite', (s) => s.delete(editionId));
  }

  async installed(editionId: string): Promise<InstalledModule | null> {
    if (typeof indexedDB === 'undefined') return null;
    const rec = await withStore<StoredPackage | undefined>('readonly', (s) => s.get(editionId));
    if (!rec) return null;
    return { editionId: rec.editionId, revision: rec.revision, sha256: rec.sha256, sizeBytes: rec.sizeBytes, storedAt: rec.storedAt };
  }
}

export const moduleInstaller = new ModuleInstaller();
