/**
 * Org namespace + storage-scope resolution (decision 22, DOCS/STORAGE-NAMESPACE.md).
 *
 * Every mba.robin app names its namespace in `.env` and toggles where LARGE
 * shared resources — LLM model weights, corpus and module caches — live:
 * org-common (`mba.robin`, one copy for all sibling apps) or app-private
 * (`<app namespace>`). Platforms that cannot share (web: origin-scoped
 * storage; mobile: sandboxed app dirs) degrade to app-private by capability;
 * the desktop shell enforces the same cap, so callers just request the root
 * name and pass it through.
 */

export type StorageScope = 'common' | 'app';

/** The org parent namespace — the first two labels of the app namespace. */
export function orgNamespace(app: string = appNamespace()): string {
  return app.split('.').slice(0, 2).join('.');
}

/** The app's own namespace (identifier family). Default: this app's identifier. */
export function appNamespace(): string {
  return env('VITE_APP_NAMESPACE') ?? 'mba.robin.sanctissimissa';
}

/** The scope the deployment asked for. Default `common`. */
export function configuredScope(): StorageScope {
  return env('VITE_STORAGE_SCOPE') === 'app' ? 'app' : 'common';
}

/**
 * The storage root directory name to use: the org-common namespace when the
 * scope is common, else the app namespace. Desktop passes this to the shell
 * (`scopeDir` on the sidecar commands); web/mobile callers use it to name
 * origin-scoped stores. The shell caps it back to app-private wherever the
 * platform cannot share.
 */
export function storageRootName(): string {
  return configuredScope() === 'common' ? orgNamespace() : appNamespace();
}

/** Read a Vite env var, falling back to process.env for headless tests. */
function env(key: string): string | undefined {
  const fromVite = (import.meta as { env?: Record<string, string | undefined> }).env;
  const value = fromVite?.[key] ?? process.env?.[key];
  return value === '' ? undefined : value;
}
