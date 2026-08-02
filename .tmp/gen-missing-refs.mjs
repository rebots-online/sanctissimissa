/** Generate DOCS/MISSING-REFERENCES.md from the fill log + missal.db (ephemeral generator). */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, writeFileSync } from 'node:fs';
const db = new DatabaseSync('assets/missal.db', { readOnly: true });
const has = db.prepare("SELECT SUM(tb.latin IS NOT NULL) la, SUM(tb.english IS NOT NULL) en FROM text_blocks tb JOIN nodes n ON n.id=tb.node_id WHERE n.key = ? OR n.key = ?");
const rows = readFileSync('DOCS/CORPUS-FILL-LOG.md', 'utf8').split(/\r?\n/)
  .filter(l => l.includes('| placeholder |')).map(l => l.split('|').map(c => c.trim()));
const CORP = /^(Tempora|Sancti|Commune|Horas|Ordo|Psalterium)\//;
const seen = new Map();
for (const c of rows) {
  const cells = c.filter(Boolean);
  const file = cells.find(x => CORP.test(x)) ?? '?';
  const dir = cells.find(x => x.startsWith('`')) ?? '?';
  const section = cells.find(x => x !== file && !x.startsWith('`') && x !== 'placeholder' && x !== '—') ?? '?';
  const key = file + '#' + section + ' ' + dir;
  if (seen.has(key)) { seen.get(key).n++; continue; }
  const m = dir.replace(/`/g, '').match(/^@([^:]*)(?::([^:]*))?/);
  const tPath = m && m[1] ? m[1] : file;
  const tSec = (m && m[2]) ? m[2] : section;
  const r = has.get(`section:${tPath}#${tSec}`, `section:Horas/${tPath}#${tSec}`);
  const la = Number(r?.la ?? 0) > 0, en = Number(r?.en ?? 0) > 0;
  const cite = cells.find(x => /^!?[1-4]?\s?[A-Z][a-z]+\.?\s\d+[:.]/.test(x)) ?? null;
  const route = (la || en) ? 'A' : cite ? 'B' : 'C';
  seen.set(key, { file, section, dir, tPath, tSec, la, en, cite, route, n: 1 });
}
const list = [...seen.values()].sort((a, b) => a.route.localeCompare(b.route) || a.file.localeCompare(b.file));
const counts = { A: 0, B: 0, C: 0 };
list.forEach(e => counts[e.route] += 1);
const censusEn = db.prepare("SELECT substr(n.key,9,instr(substr(n.key,9),'/')-1) area, COUNT(*) c, SUM(tb.english IS NULL) noEn, SUM(tb.latin IS NULL) noLa FROM text_blocks tb JOIN nodes n ON n.id=tb.node_id WHERE n.key LIKE 'section:%' GROUP BY area ORDER BY noEn DESC").all();
const noLa = db.prepare("SELECT n.key FROM text_blocks tb JOIN nodes n ON n.id=tb.node_id WHERE tb.latin IS NULL AND tb.english IS NOT NULL LIMIT 12").all();

let md = `# Missing-Reference Register & Resolution Policy

**Generated:** 2026-07-06 from \`DOCS/CORPUS-FILL-LOG.md\` (ingest v2 run) + \`assets/missal.db\`. Regenerate with the ingest v3 audit stage.
**Policy (operator-directed, 2026-07-06):** production release is NOT held up by missing primary material. Every gap resolves through the first applicable route, always flagged in-UI (lighter-weight ink on tinted background — \`meta.translationSupplied\` / \`meta.filled\`) and logged with source:

- **Route A — DO-internal substitution.** The target text exists elsewhere in the vendored DO tree in ≥1 language → substitute it; where the counterpart language is missing, supply an **in-style ecclesiastical-Latin / hieratic-English cross-translation** of DO's own text (metre and constructions matched for hymnodic material).
- **Route B — Vendored scripture by citation.** No DO text, but a parseable scriptural citation → Latin from Clementine Vulgate, English from Douay-Rheims (both vendored, both public domain — no licensing impediment found; see licensing note).
- **Route C — Two-step our-licensed generation.** Neither DO text nor usable citation (or a licensing impediment on a source): (1) generate an original **interpretation** of the reference under our own license, in ecclesiastical register; (2) generate **our translation of our interpretation** for the counterpart language. Both steps logged; both texts carry the supplied-content flag.

**Licensing note:** Clementine Vulgate text — public domain. Douay-Rheims (1899 American ed.) — public domain. Divinum Officium corpus — upstream license recorded in \`VENDORED/divinum-officium/PROVENANCE.md\`. Route C therefore triggers today **only** for entries with no text and no citation.

## 1. Unresolvable-directive register (${list.length} distinct; ${rows.length} occurrences)

Route counts: **A = ${counts.A}** (DO text exists — substitution/cross-translation) · **B = ${counts.B}** (citation → Vulgate/DR) · **C = ${counts.C}** (two-step generation).

| # | Source file | Section | Broken directive | Target | DO Latin? | DO English? | Citation | Route | Occ. |
|---|---|---|---|---|---|---|---|---|---|
`;
list.forEach((e, i) => {
  md += `| ${i + 1} | ${e.file} | ${e.section} | ${e.dir} | ${e.tPath}#${e.tSec} | ${e.la ? '✓' : '—'} | ${e.en ? '✓' : '—'} | ${e.cite ?? '—'} | **${e.route}** | ${e.n} |\n`;
});
md += `
## 2. Missing-translation census (Route A cross-translation, en masse)

| Area | Sections | Latin-only (no English) | English-only (no Latin) |
|---|---|---|---|
`;
let tc = 0, te = 0, tl = 0;
for (const r of censusEn) { tc += r.c; te += r.noEn; tl += r.noLa; md += `| ${r.area} | ${r.c} | ${r.noEn} | ${r.noLa} |\n`; }
md += `| **Total** | **${tc}** | **${te}** (${(100 * te / tc).toFixed(1)}%) | **${tl}** |

- **Latin-only → Route A English cross-translation** (hieratic register, DR-consistent vocabulary), flagged \`meta.translationSupplied = 'en'\`.
- **English-only → Route A ecclesiastical-Latin transcription** (metre/constructions matched), flagged \`meta.translationSupplied = 'la'\`. Samples: ${noLa.slice(0, 6).map(r => '`' + r.key.replace('section:', '') + '`').join(', ')} …

## 3. Rendering contract

Supplied content renders in every theme via the token pair \`--supplied-ink\` / \`--supplied-bg\` (lighter-weight ink, tinted background), with a per-section provenance affordance (hover/tap shows route + source + fill-log row). Gauntlet row O-16 admits a \`textus deest\` placeholder ONLY if this register lists it — after Routes A–C run at ingest v3, the expected shipped-placeholder count is **0**.
`;
writeFileSync('DOCS/MISSING-REFERENCES.md', md);
console.log('wrote DOCS/MISSING-REFERENCES.md —', list.length, 'register rows; routes', JSON.stringify(counts));
