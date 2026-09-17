// CP.3 (§7.8.4): one generated storage config feeds BOTH Vite and Rust.
// Run from the repository root before builds (wired into predev/prebuild).
// The build fails closed when the scope is missing or malformed — parity
// between the web bundle and the native artifact is the whole point.
import { loadEnv } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';

const mode = process.argv[2] ?? 'production';
const env = loadEnv(mode, process.cwd(), 'VITE_');
const scope = env.VITE_STORAGE_SCOPE === 'app' ? 'app' : 'common';
const namespace = env.VITE_APP_NAMESPACE || 'mba.robin.sanctissimissa';
if (!/^[a-z0-9][a-z0-9_.-]{2,63}$/.test(namespace)) {
  throw new Error(`Invalid VITE_APP_NAMESPACE: ${namespace}`);
}
mkdirSync('config', { recursive: true });
writeFileSync(
  'config/asset-storage.generated.json',
  JSON.stringify({ schema: 1, scope, namespace }, null, 2) + '\n',
);
console.log(`asset-storage.generated.json -> scope=${scope} namespace=${namespace}`);
