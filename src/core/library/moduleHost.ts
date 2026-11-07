/**
 * Module host (§L.9 R3, decision 19; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.5).
 * One URL on web, PWA, Linux, Windows and sideload APK. No Surge or upstream fallback, ever.
 */
export const MODULE_BASE_URL: string =
  import.meta.env.VITE_MODULE_BASE_URL ?? 'https://sanctissimissa.robin.mba/runtime/modules';
