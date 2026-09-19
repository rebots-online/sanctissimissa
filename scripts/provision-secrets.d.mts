/** Typed declaration companion for scripts/provision-secrets.mjs (the
 * release-state.d.mts pattern): same-basename pairing resolves the .mjs
 * import's types under both bundler and nodenext module resolution. The .mjs
 * remains the single behaviour source. */
export declare const MATERIALIZATIONS: ReadonlyArray<{
  pointer: string;
  target: string;
  requiredFor: string;
  envKey?: string;
}>;
export declare function renderEnvLocal(
  existing: string,
  envKey: string,
  value: string,
): string;
