/** DEMO (ephemeral): normalize DO office tables → proposed office-plane schema. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
const P = 'VENDORED/divinum-officium/web/www/horas/Latin/Psalterium/';
const read = (f) => readFileSync(P + f, 'utf8');
const sections = (txt) => {
  const out = new Map(); let cur = null;
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\[(.*)\]\s*$/);
    if (m) { cur = m[1]; out.set(cur, []); continue; }
    if (cur !== null) out.get(cur).push(line);
  }
  return out;
};
const db = new DatabaseSync(':memory:');
const DDL = `
CREATE TABLE office_psalm_schema (
  day_key TEXT NOT NULL, hour TEXT NOT NULL, nocturn INTEGER,
  slot_ord INTEGER NOT NULL, antiphon TEXT, psalm_ref TEXT NOT NULL,
  festal_bracket INTEGER NOT NULL DEFAULT 0);
CREATE TABLE office_nocturn_versicle (day_key TEXT, nocturn INTEGER, versicle TEXT, response TEXT);
CREATE TABLE office_skeleton (hour_file TEXT, section TEXT, ord INTEGER, line TEXT, is_directive INTEGER, is_condition INTEGER);
CREATE TABLE office_seasonal (kind TEXT, key TEXT, body TEXT);`;
db.exec(DDL);
const insP = db.prepare('INSERT INTO office_psalm_schema VALUES (?,?,?,?,?,?,?)');
const insV = db.prepare('INSERT INTO office_nocturn_versicle VALUES (?,?,?,?)');
const insK = db.prepare('INSERT INTO office_skeleton VALUES (?,?,?,?,?,?)');
const insS = db.prepare('INSERT INTO office_seasonal VALUES (?,?,?)');

// 1. Psalmi major: [DayN Hour] → "ant;;refs"
for (const [sec, lines] of sections(read('Psalmi/Psalmi major.txt'))) {
  const m = sec.match(/^Day(\d)\s+(\S.*)$/); if (!m) continue;
  let ord = 0;
  for (const l of lines) {
    if (!l.includes(';;')) continue;
    const [ant, refs] = l.split(';;');
    for (const ref of refs.split(',').map(s => s.trim()).filter(Boolean))
      insP.run('Day' + m[1], m[2].trim(), null, ord++, ant.trim() || null, ref.replace(/^\[|\]$/g, ''), /^\[.*\]$/.test(ref) ? 1 : 0);
  }
}
// 2. Psalmi matutinum: [DayN] → nocturn groups split by V./R. pairs
for (const [sec, lines] of sections(read('Psalmi/Psalmi matutinum.txt'))) {
  const m = sec.match(/^Day(\d)/); if (!m) continue;
  let noct = 1, ord = 0, lastV = null;
  for (const l of lines) {
    if (l.startsWith('V. ')) { lastV = l.slice(3); continue; }
    if (l.startsWith('R. ')) { insV.run('Day' + m[1], noct, lastV, l.slice(3)); noct++; ord = 0; continue; }
    if (!l.includes(';;')) continue;
    const [ant, refs] = l.split(';;');
    for (const ref of refs.split(',').map(s => s.trim()).filter(Boolean))
      insP.run('Day' + m[1], 'Matutinum', Math.min(noct, 3), ord++, ant.trim() || null, ref, 0);
  }
}
// 3. Psalmi minor: [Hour] → "Weekday = ant" + next-line psalm list
const DAYMAP = { Dominica: 'Day0', 'Feria II': 'Day1', 'Feria III': 'Day2', 'Feria IV': 'Day3', 'Feria V': 'Day4', 'Feria VI': 'Day5', Sabbato: 'Day6' };
for (const [sec, lines] of sections(read('Psalmi/Psalmi minor.txt'))) {
  let pendingDay = null, pendingAnt = null;
  for (const l of lines) {
    const dm = l.match(/^(Dominica|Feria I{1,3}V?|Sabbato)\s*=\s*(.*)$/);
    if (dm) { pendingDay = DAYMAP[dm[1]] ?? dm[1]; pendingAnt = dm[2]; continue; }
    if (pendingDay && /^\s*\[?\d/.test(l)) {
      let ord = 0;
      for (const ref of l.split(',').map(s => s.trim()).filter(Boolean))
        insP.run(pendingDay, sec, null, ord++, ord === 1 ? pendingAnt : null, ref.replace(/^\[|\]$/g, ''), /^\[.*\]$/.test(ref) ? 1 : 0);
      pendingDay = null;
    }
  }
}
// 4. Hour skeletons: Special/*.txt sections, directives (@,&,$) + rubric conditions "(sed …)"
for (const f of ['Special/Matutinum Special.txt', 'Special/Major Special.txt', 'Special/Minor Special.txt', 'Special/Prima Special.txt', 'Special/Preces.txt']) {
  for (const [sec, lines] of sections(read(f))) {
    lines.forEach((l, i) => { if (l.trim()) insK.run(f.replace('Special/', '').replace('.txt', ''), sec, i, l, /^[@&$]/.test(l.trim()) ? 1 : 0, /^\((sed|si|rubrica|dominica|feria|tempore)/i.test(l.trim()) ? 1 : 0); });
  }
}
// 5. Seasonal sets
for (const [sec, lines] of sections(read('Mariaant.txt'))) if (sec.trim()) insS.run('marian_ant', sec, lines.join('\n').trim());
for (const [sec, lines] of sections(read('Doxologies.txt'))) if (sec.trim()) insS.run('doxology', sec, lines.join('\n').trim());
for (const [sec, lines] of sections(read('Special/Major Special.txt'))) if (/^Invit/.test(sec)) insS.run('invitatory', sec, lines.join('\n').trim());

const q = (sql) => db.prepare(sql).all();
console.log('=== PROPOSED OFFICE-PLANE DDL ===' + DDL);
console.log('\n=== ROW COUNTS ===');
for (const t of ['office_psalm_schema', 'office_nocturn_versicle', 'office_skeleton', 'office_seasonal'])
  console.log(t, '→', q(`SELECT COUNT(*) c FROM ${t}`)[0].c);
console.log('\npsalm slots per hour:', JSON.stringify(q(`SELECT hour, COUNT(*) c FROM office_psalm_schema GROUP BY hour ORDER BY c DESC`)));
console.log('\n=== Sunday (Day0) LAUDES I — must match rubric row O-2 ===');
console.table(q(`SELECT slot_ord, substr(antiphon,1,44) antiphon, psalm_ref FROM office_psalm_schema WHERE day_key='Day0' AND hour='Laudes1' ORDER BY slot_ord`));
console.log('=== Monday (Day1) VESPERS — rubric O-3 ===');
console.table(q(`SELECT slot_ord, substr(antiphon,1,44) antiphon, psalm_ref FROM office_psalm_schema WHERE day_key='Day1' AND hour='Vespera' ORDER BY slot_ord`));
console.log('=== Monday PRIMA (festal-bracket variable psalm) ===');
console.table(q(`SELECT slot_ord, substr(antiphon,1,40) antiphon, psalm_ref, festal_bracket FROM office_psalm_schema WHERE day_key='Day1' AND hour='Prima' ORDER BY slot_ord`));
console.log('=== Sunday MATINS nocturn 2 psalms + the nocturn versicles ===');
console.table(q(`SELECT nocturn, slot_ord, psalm_ref FROM office_psalm_schema WHERE day_key='Day0' AND hour='Matutinum' AND nocturn=2 ORDER BY slot_ord`));
console.table(q(`SELECT nocturn, substr(versicle,1,50) versicle FROM office_nocturn_versicle WHERE day_key='Day0'`));
console.log('=== Skeleton coverage (sections per Special file) + conditional/directive density ===');
console.table(q(`SELECT hour_file, COUNT(DISTINCT section) sections, SUM(is_directive) directives, SUM(is_condition) conditions FROM office_skeleton GROUP BY hour_file`));
console.log('=== Seasonal sets ===');
console.table(q(`SELECT kind, COUNT(*) n, GROUP_CONCAT(key, ' | ') keys FROM office_seasonal GROUP BY kind`));
