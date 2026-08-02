// Standalone BM.3 parser verification (no full ingest — shared re-ingest later).
// Run: node --experimental-strip-types .tmp/commentary-parse-check.mjs
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { COMMENTARY_SOURCES } from '../scripts/ingest-commentary.mjs';

const out = [];
out.push(`commentary parse report — ${new Date().toISOString()}`);
for (const src of COMMENTARY_SOURCES) {
  const { records, skipped } = src.parse(resolve(src.dir));
  const books = new Set(records.map((r) => r.book));
  out.push('');
  out.push(`== ${src.id} (${src.label}) dir=${src.dir}`);
  out.push(`records: ${records.length}, skipped refs: ${skipped}, books covered: ${books.size}`);
  out.push(`book list: ${[...books].join(' ')}`);
  const bad = records.filter(
    (r) => !r.book || !Number.isInteger(r.chapter) || !Number.isInteger(r.verseStart) ||
      r.verseEnd < r.verseStart || !r.text.trim(),
  );
  out.push(`malformed records: ${bad.length}`);
  const keys = new Set();
  let dup = 0;
  for (const r of records) {
    const k = `${r.book}/${r.chapter}/${r.verseStart}`;
    if (keys.has(k)) dup++; else keys.add(k);
  }
  out.push(`duplicate node keys within source: ${dup}`);
  const lens = records.map((r) => r.text.length).sort((a, b) => a - b);
  out.push(`text length min/median/max: ${lens[0]}/${lens[Math.floor(lens.length / 2)]}/${lens[lens.length - 1]}`);
  for (const sample of [records[10], records[Math.floor(records.length / 2)]]) {
    out.push(`--- sample ${sample.book} ${sample.chapter}:${sample.verseStart}-${sample.verseEnd}`);
    out.push(sample.text.slice(0, 600));
  }
}
writeFileSync(resolve('.tmp/commentary-parse-report.txt'), out.join('\n') + '\n');
console.log(out.join('\n').slice(0, 6000));
