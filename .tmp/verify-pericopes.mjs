import { readFileSync } from 'node:fs';
import { PERICOPES } from '../src/core/ontology/parallels.ts';
const dr = JSON.parse(readFileSync('VENDORED/douay-rheims/EntireBible-DR.json', 'utf8'));
const NAMES = { Matt: 'Matthew', Marc: 'Mark', Luc: 'Luke', Joann: 'John' };
let fails = 0;
for (const p of PERICOPES) {
  for (const [bk, ref] of Object.entries(p.refs)) {
    const m = ref.match(/^(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) { console.log('BADREF', p.id, bk, ref); fails++; continue; }
    const chn = m[1], vs = Number(m[2]), ve = Number(m[3] ?? m[2]);
    const ch = dr[NAMES[bk]]?.[chn];
    if (!ch) { console.log('NOCHAP', p.id, bk, ref); fails++; continue; }
    const maxV = Math.max(...Object.keys(ch).map(Number));
    if (!ch[String(vs)] || ve > maxV) { console.log('NOVERSE', p.id, bk, ref, 'chapter has', maxV); fails++; continue; }
    const first = ch[String(vs)].replace(/\*/g, '').slice(0, 72);
    const last = ch[String(ve)].replace(/\*/g, '').slice(0, 72);
    console.log(`${p.id.padEnd(24)} ${bk.padEnd(5)} ${ref.padEnd(9)} | ${first}`);
    console.log(`${''.padEnd(24)} ${''.padEnd(5)} ${''.padEnd(9)} L ${last}`);
  }
}
console.log('FAILURES:', fails);
