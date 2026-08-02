// End-to-end BM.3/BM.3b check against a SCRATCH copy — committed db untouched.
import { DatabaseSync } from 'node:sqlite';
import { ingestCommentary } from '../scripts/ingest-commentary.mjs';
import { openAdapter } from '../scripts/db-adapter.mjs';

const db = new DatabaseSync('.tmp/missal-commentary-test.db');
const t0 = Date.now();
const counts = ingestCommentary(db, console);
console.log('ingest counts:', JSON.stringify(counts), `${Date.now() - t0}ms`);
db.close();

const a = openAdapter('.tmp/missal-commentary-test.db');
const one = a.commentaryFor('Matt', 3, 2);
console.log('commentaryFor(Matt,3,2):', one.length, 'hits');
for (const h of one) console.log(' -', h.nodeKey, '|', h.section, '|', (h.english ?? '').slice(0, 90));
const chap = a.commentaryFor('Luc', 15);
console.log('commentaryFor(Luc,15):', chap.length, 'hits; sources:', [...new Set(chap.map((h) => h.sourcePath))].join(', '));
console.log('ordering sample:', chap.slice(0, 6).map((h) => h.nodeKey).join(' '));
const cvc = a.conceptVerseCounts();
console.log('conceptVerseCounts:', cvc.length, '(expected 0 until BL.3 imagery pass)');
const ccc = a.chapterCiteCounts('Ps');
console.log('chapterCiteCounts(Ps): chapters with cites =', ccc.size, 'e.g. ch max =', Math.max(...[...ccc.values()], 0));
