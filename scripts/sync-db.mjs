/**
 * Copy the committed corpus (assets/missal.db) into public/ so the web dev
 * server and Vite build serve the same bytes the native build embeds.
 * public/missal.db is gitignored — assets/missal.db is the single source.
 */
import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';

const SRC = 'assets/missal.db';
const DST = 'public/missal.db';

if (!existsSync(SRC)) {
  console.error(SRC + ' missing — run: npm run ingest -- /path/to/liturgical.db');
  process.exit(1);
}
mkdirSync('public', { recursive: true });
copyFileSync(SRC, DST);
console.log('synced ' + SRC + ' -> ' + DST + ' (' + statSync(DST).size + ' bytes)');
