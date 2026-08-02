/**
 * verify-calendar — 1:1 calendar reckoning check against divinumofficium.com.
 *
 *   node --experimental-strip-types scripts/verify-calendar.mjs [--offline] [dates...]
 *
 * For each date the harness resolves the day with OUR engine (the same
 * resolveDay/resolveWinner code path the app runs, over assets/missal.db) and
 * fetches Divinum Officium's missa.pl, extracting its "<Title> ~ <rank>"
 * header. A date PASSES when DO's title matches our winner's title (accent-
 * and-case-insensitive containment either way).
 *
 * --offline skips the network fetch and just prints our resolution (useful in
 * CI); any explicit dates (YYYY-MM-DD) replace the built-in battery.
 */

import { DatabaseSync } from 'node:sqlite';
import { resolveDay } from '../src/core/data/liturgicalDay.ts';

const BATTERY = [
  // movable-cycle anchors, 2026 (Easter = April 5)
  '2026-01-01', '2026-01-06', '2026-01-11', '2026-02-01', '2026-02-18',
  '2026-03-19', '2026-03-25', '2026-03-29', '2026-04-05', '2026-04-12',
  '2026-05-14', '2026-05-24', '2026-05-31', '2026-06-04', '2026-06-12',
  '2026-06-24', '2026-06-29',
  // the reported July 1 case + neighbours
  '2026-07-01', '2026-07-02', '2026-07-05', '2026-07-08',
  // sanctoral vs Sunday collisions, ember days, Advent
  '2026-08-15', '2026-09-16', '2026-10-11', '2026-11-01', '2026-11-02',
  '2026-11-29', '2026-12-08', '2026-12-25',
  // a second year's July 1 (different weekday)
  '2025-07-01',
  // Christmas–Epiphany stretch, Holy Name, ferias after Epiphany
  '2026-01-02', '2026-01-04', '2026-01-08', '2026-12-27', '2026-12-28',
  // resumed Sundays after Epiphany before Advent + last Sunday
  '2026-11-08', '2026-11-15', '2026-11-22',
  // transfers: St Matthias in leap year, feast of the Lord on Sunday
  '2027-08-06', '2027-03-25',
];

const offline = process.argv.includes('--offline');
const dates = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const list = dates.length ? dates : BATTERY;

// ── our side: node:sqlite adapter satisfying the CorpusDb surface resolveDay uses ──
const raw = new DatabaseSync('assets/missal.db', { readOnly: true });
function rowToNode(r) {
  let meta = {};
  try { meta = r.meta ? JSON.parse(String(r.meta)) : {}; } catch { meta = {}; }
  return {
    id: Number(r.id), kind: String(r.kind), key: String(r.key),
    title: r.title ?? null, category: r.category ?? null,
    rankClass: r.rank_class ?? null, rankNum: Number(r.rank_num ?? 0),
    color: r.color ?? null, meta,
  };
}
const db = {
  getFileNode(path) {
    const r = raw.prepare('SELECT * FROM nodes WHERE key = ?').get(`file:${path}`);
    return r ? rowToNode(r) : null;
  },
  getKalendar(mmdd) {
    return raw
      .prepare('SELECT file, title, rank FROM kalendar WHERE mmdd = ? ORDER BY ord')
      .all(mmdd)
      .map((r) => ({ file: String(r.file), title: r.title ?? null, rank: Number(r.rank ?? 0) }));
  },
  getTransfers(source) {
    return raw
      .prepare('SELECT mmdd, target FROM kalendar_transfer WHERE source = ?')
      .all(source)
      .map((r) => ({ mmdd: String(r.mmdd), target: String(r.target) }));
  },
  asDayMeta(n) {
    if (!n) return null;
    return {
      key: n.key.replace(/^file:/, ''), title: n.title ?? n.meta.office_name ?? null,
      rankClass: n.rankClass, rankNum: n.rankNum, color: n.color,
      festumDomini: n.meta.festum_domini === true,
    };
  },
};

// ── DO side ──
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
async function fetchDO(iso) {
  const [y, m, d] = iso.split('-');
  const url = `https://www.divinumofficium.com/cgi-bin/missa/missa.pl?date1=${m}-${d}-${y}&command=pray&lang2=English`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' } });
  if (!res.ok) return { error: `HTTP ${res.status}` };
  const html = await res.text();
  // Day header: first "<Title> ~ <rank>" text run in the generated page.
  const m1 = html.match(/([^<>~\n][^<>~]*?)\s*~\s*([^<>~]+?)\s*</);
  if (!m1) return { error: 'no "~" header found' };
  return { title: m1[1].trim(), rank: m1[2].trim() };
}

const norm = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/æ/gi, 'ae').replace(/œ/gi, 'oe')
    .toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

function titlesAgree(ours, theirs) {
  const a = norm(ours), b = norm(theirs);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

let pass = 0, fail = 0;
for (const iso of list) {
  const info = resolveDay(db, iso);
  const ours = info.feastName ?? info.weekKey;
  let line = `${iso}  ours: ${ours} [${info.winner?.rankClass ?? 'feria'} r${info.rank}]`;
  if (!offline) {
    const theirs = await fetchDO(iso);
    if (theirs.error) {
      line += `  DO: ERROR ${theirs.error}`;
      fail++;
    } else {
      const ok = titlesAgree(ours, theirs.title);
      line += `  DO: ${theirs.title} ~ ${theirs.rank}  ${ok ? 'MATCH' : '*** MISMATCH ***'}`;
      ok ? pass++ : fail++;
    }
    await new Promise((r) => setTimeout(r, 800)); // be polite to DO
  }
  console.log(line);
}
if (!offline) {
  console.log(`\n${pass} match, ${fail} mismatch of ${list.length}`);
  process.exitCode = fail ? 1 : 0;
}
