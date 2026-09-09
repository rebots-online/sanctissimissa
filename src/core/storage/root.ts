/**
 * Org namespace + storage-scope resolution (decision 22, DOCS/STORAGE-NAMESPACE.md).
 *
 * BUILD-TIME choice, not a runtime one: vite.config.ts reads `.env` when the
 * bundle is built and injects `__SAM_BUILD_STORAGE__` via `define` — the
 * shipped bundle carries the namespace and scope as literals. There is no
 * runtime discretion to flip; the only runtime input left is the platform's
 * structural capability (web origins and mobile sandboxes cannot share, so
 * the shell caps `common` down to app-private there — compile-time facts in
 * the desktop shell, structural facts on web/mobile).
 */

export type StorageScope = 'common' | 'app';

/** The `.env`-derived pair, frozen into the bundle at build time. */
export interface BuildStorage {
  namespace: string;
  scope: StorageScope;
}

declare const __SAM_BUILD_STORAGE__: BuildStorage | undefined;

const BUILD: BuildStorage =
  typeof __SAM_BUILD_STORAGE__ !== 'undefined'
    ? __SAM_BUILD_STORAGE__
    : // Headless (node/test) fallback — identical to the documented defaults.
      { namespace: 'mba.robin.sanctissimissa', scope: 'common' };

/** The org parent namespace — the first two labels of the app namespace. */
export function orgNamespace(app: string = appNamespace()): string {
  return app.split('.').slice(0, 2).join('.');
}

/** Pure derivation the tests exercise directly with injected build shapes. */
export function resolveStorage(build: BuildStorage = BUILD): {
  namespace: string;
  scope: StorageScope;
  org: string;
  root: string;
} {
  const namespace = build.namespace || 'mba.robin.sanctissimissa';
  const scope: StorageScope = build.scope === 'app' ? 'app' : 'common';
  const org = orgNamespace(namespace);
  return { namespace, scope, org, root: scope === 'common' ? org : namespace };
}

/** The app's own namespace (identifier family), as frozen at build time. */
export function appNamespace(): string {
  return resolveStorage().namespace;
}

/** The scope the build asked for. Default `common`. */
export function configuredScope(): StorageScope {
  return resolveStorage().scope;
}

/**
 * The storage root directory name to use: the org-common namespace when the
 * build scope is common, else the app namespace. Desktop passes this to the
 * shell (`scopeDir` on the sidecar commands); the shell caps it back to
 * app-private wherever the platform cannot share. Web/mobile callers use it
 * to name origin-scoped stores.
 */
export function storageRootName(): string {
  return resolveStorage().root;
}
