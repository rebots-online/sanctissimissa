/**
 * The installed module revision of an edition, read READ-ONLY from the
 * ModuleInstaller's IndexedDB record (`sanctissimissa.library.packages.v1` /
 * `packages`, key = editionId, field `revision`). The database is opened
 * without a version and `onupgradeneeded` is aborted, so a missing database is
 * never created (the `idbOpen(name, false)` pattern of accompaniment/store.ts).
 * No record → 0: the Catena rows are then those present in the opened corpus;
 * an installed module has revision ≥ 1, so stale chunks are purged.
 * see DOCS/sdk/indexeddb/mdn-using-indexeddb.md
 */

const PACKAGES_DB = 'sanctissimissa.library.packages.v1';
const PACKAGES_STORE = 'packages';

function openExisting(name: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let absent = false;
    const req = indexedDB.open(name);
    req.onupgradeneeded = () => {
      absent = true;
      req.transaction!.abort();
      req.result.close();
    };
    req.onsuccess = () => resolve(absent ? null : req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
}

export async function installedRevision(editionId: string): Promise<number> {
  if (typeof indexedDB === 'undefined') return 0;
  const db = await openExisting(PACKAGES_DB);
  if (!db) return 0;
  try {
    if (!db.objectStoreNames.contains(PACKAGES_STORE)) return 0;
    const record = await new Promise<unknown>((resolve) => {
      const req = db.transaction(PACKAGES_STORE, 'readonly').objectStore(PACKAGES_STORE).get(editionId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    const revision = (record as { revision?: unknown } | null | undefined)?.revision;
    return typeof revision === 'number' && Number.isInteger(revision) && revision >= 0 ? revision : 0;
  } catch {
    return 0;
  } finally {
    db.close();
  }
}
