/**
 * ingest-office — the office plane of missal.db (CHECKLIST stanza O-A).
 * Called from ingest-corpus.mjs with the open output DB.
 *
 * Tables (DOCS/ARCHITECTURE.md §7.5; deviations documented there):
 *   office_psalm_schema     Psalterium/Psalmi/Psalmi {major,matutinum,minor}.txt
 *   office_nocturn_versicle nocturn V/R pairs from Psalmi matutinum.txt
 *   office_skeleton         horas/Ordinarium/<Hour>.txt verbatim scripts
 *   kalendar                Tabulae/Kalendaria chain resolved for Rubrics 1960
 *   kalendar_transfer       Tabulae/Transfer letter+Easter-code rows (1960 rows)
 *
 * The invitatories, Marian antiphons, doxologies and benedictions of
 * §7.5's office_seasonal live in the ordinary nodes/text_blocks tables
 * (files Psalterium/Invitatorium, Psalterium/Mariaant, Psalterium/Doxologies,
 * Psalterium/Benedictions, Psalterium/Special/*) — no separate table needed.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseDOFile } from './do-parse.mjs';

export const OFFICE_SCHEMA_SQL = `
  DROP TABLE IF EXISTS office_psalm_schema;
  DROP TABLE IF EXISTS office_nocturn_versicle;
  DROP TABLE IF EXISTS office_skeleton;
  DROP TABLE IF EXISTS kalendar;
  DROP TABLE IF EXISTS kalendar_transfer;
  CREATE TABLE office_psalm_schema (
    day_key TEXT NOT NULL,
    hour TEXT NOT NULL,
    nocturn INTEGER,
    slot_ord INTEGER NOT NULL,
    antiphon_la TEXT, antiphon_en TEXT,
    psalm_ref TEXT NOT NULL,
    festal_bracket INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE office_nocturn_versicle (
    day_key TEXT NOT NULL, nocturn INTEGER NOT NULL,
    versicle_la TEXT, response_la TEXT, versicle_en TEXT, response_en TEXT
  );
  CREATE TABLE office_skeleton (
    hour_file TEXT NOT NULL, ord INTEGER NOT NULL, line TEXT NOT NULL
  );
  CREATE TABLE kalendar (
    mmdd TEXT NOT NULL, ord INTEGER NOT NULL, file TEXT NOT NULL,
    title TEXT, rank INTEGER
  );
  CREATE TABLE kalendar_transfer (
    source TEXT NOT NULL, mmdd TEXT NOT NULL, target TEXT NOT NULL
  );
  CREATE INDEX idx_psalm_schema ON office_psalm_schema(day_key, hour);
  CREATE INDEX idx_kalendar ON kalendar(mmdd);
`;

const read = (p) => readFileSync(p, 'utf8').replace(/^﻿/, '');

// ── Psalm schemas ───────────────────────────────────────────────────

const DAY_LABELS = {
  dominica: 'Day0', 'feria ii': 'Day1', 'feria iii': 'Day2', 'feria iv': 'Day3',
  'feria v': 'Day4', 'feria vi': 'Day5', sabbato: 'Day6',
};

/** "9(2-11)" / "[46]" / "118(33-48)" → { ref, festal } */
function parsePsalmRef(tok) {
  const t = tok.trim();
  const festal = t.startsWith('[') && t.endsWith(']');
  return { ref: festal ? t.slice(1, -1).trim() : t, festal };
}

/** Psalmi major.txt — [DayN Laudes1|Laudes2|Laudes3|Vespera] "ant;;psalm" rows. */
function parseMajor(text) {
  const rows = []; // {day_key, hour, slot_ord, antiphon, psalm_ref, festal}
  for (const sec of parseDOFile(text)) {
    const m = sec.name.match(/^(Day\d\d?) (Laudes\d|Vespera)$/);
    if (!m || sec.qualifier) continue;
    let slot = 0;
    for (const line of sec.content.split('\n')) {
      if (!line.trim()) continue;
      const [ant, ref] = line.split(';;');
      if (ref === undefined) continue;
      const p = parsePsalmRef(ref);
      rows.push({
        day_key: m[1], hour: m[2], nocturn: null, slot_ord: slot++,
        antiphon: ant.trim() || null, psalm_ref: p.ref, festal: p.festal ? 1 : 0,
      });
    }
  }
  return rows;
}

/** Psalmi matutinum.txt — [DayN] rows + V./R. nocturn versicles. */
function parseMatutinum(text) {
  const rows = [];
  const versicles = []; // {day_key, nocturn, versicle, response}
  for (const sec of parseDOFile(text)) {
    if (!/^Day\d\d?$/.test(sec.name) || sec.qualifier) continue;
    let nocturn = 1;
    let slot = 0;
    let pendingV = null;
    for (const line of sec.content.split('\n')) {
      const t = line.trim();
      if (!t) continue;
      if (t.startsWith('V.')) {
        pendingV = t.replace(/^V\.\s*/, '');
        continue;
      }
      if (t.startsWith('R.')) {
        versicles.push({ day_key: sec.name, nocturn, versicle: pendingV, response: t.replace(/^R\.\s*/, '') });
        pendingV = null;
        nocturn++;
        continue;
      }
      const [ant, ref] = t.split(';;');
      if (ref === undefined) continue;
      const p = parsePsalmRef(ref);
      rows.push({
        day_key: sec.name, hour: 'Matutinum', nocturn, slot_ord: slot++,
        antiphon: ant.trim() || null, psalm_ref: p.ref, festal: p.festal ? 1 : 0,
      });
    }
  }
  return { rows, versicles };
}

/** Psalmi minor.txt — [Hour] sections with "Label = ant" + psalm-list lines. */
function parseMinor(text) {
  const rows = [];
  for (const sec of parseDOFile(text)) {
    if (!['Prima', 'Tertia', 'Sexta', 'Nona', 'Completorium'].includes(sec.name) || sec.qualifier) continue;
    const lines = sec.content.split('\n').map((l) => l.trim()).filter(Boolean);
    let dayKey = null;
    let antiphon = null;
    for (const line of lines) {
      const lab = line.match(/^([A-Za-z ]+?)\s*=\s*(.*)$/);
      if (lab) {
        dayKey = DAY_LABELS[lab[1].trim().toLowerCase()] ?? null;
        antiphon = lab[2].trim() || null;
        continue;
      }
      if (!dayKey) continue;
      line.split(',').forEach((tok, slot) => {
        if (!tok.trim()) return;
        const p = parsePsalmRef(tok);
        rows.push({
          day_key: dayKey, hour: sec.name, nocturn: null, slot_ord: slot,
          antiphon: slot === 0 ? antiphon : null, psalm_ref: p.ref, festal: p.festal ? 1 : 0,
        });
      });
      dayKey = null; // one psalm line per label
    }
  }
  return rows;
}

// ── Kalendaria chain (Rubrics 1960) ─────────────────────────────────

/** Base-to-leaf layer order for "Rubrics 1960 - 1960" (Tabulae/data.txt). */
const KALENDAR_CHAIN = ['1570', '1888', '1906', '1939', '1954', '1955', '1960'];

/**
 * "MM-DD=f1~f2=title1=rank1=title2=rank2=" → { files:[{file,title,rank}] }.
 * "MM-DD=XXXXX" deletes the date's entry.
 */
function parseKalendarLine(line) {
  const parts = line.split('=');
  if (parts.length < 2) return null;
  const mmdd = parts[0].trim();
  if (!/^\d\d-\d\d$/.test(mmdd)) return null;
  if (/^X+$/i.test(parts[1].trim())) return { mmdd, files: [] };
  const fileToks = parts[1].split('~').map((f) => f.trim()).filter(Boolean);
  const files = fileToks.map((f, i) => ({
    file: f,
    title: parts[2 + i * 2]?.trim() || null,
    rank: Number.parseInt(parts[3 + i * 2] ?? '', 10) || 0,
  }));
  return { mmdd, files };
}

function loadKalendarChain(wwwRoot) {
  const map = new Map(); // mmdd → files[]
  for (const layer of KALENDAR_CHAIN) {
    const p = join(wwwRoot, 'Tabulae', 'Kalendaria', `${layer}.txt`);
    if (!existsSync(p)) continue;
    for (const line of read(p).split(/\r?\n/)) {
      const e = parseKalendarLine(line.trim());
      if (!e) continue;
      if (e.files.length === 0) map.delete(e.mmdd);
      else map.set(e.mmdd, e.files);
    }
  }
  return map;
}

// ── Transfer tables ─────────────────────────────────────────────────

/**
 * Keep the letter (a–g) and Easter-code (322…426) general-calendar files;
 * rows filtered to version tag 1960 (or untagged). Hymn/dirge/scriptura
 * rows are dropped — this app consumes celebration transfers only.
 */
function loadTransferLines(wwwRoot) {
  const dir = join(wwwRoot, 'Tabulae', 'Transfer');
  if (!existsSync(dir)) return [];
  const rows = [];
  for (const name of readdirSync(dir)) {
    if (!/^([a-g]|\d{3})\.txt$/.test(name)) continue;
    const source = name.replace(/\.txt$/, '');
    for (const raw of read(join(dir, name)).split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [body, ver] = line.split(/\s*;;\s*/);
      if (ver && !/(?:^|\s)1960(?:\s|$)/.test(ver)) continue;
      const eq = body.indexOf('=');
      if (eq < 0) continue;
      const mmdd = body.slice(0, eq).trim();
      const target = body.slice(eq + 1).trim();
      if (/^(Hy|seant|dirge)/i.test(mmdd)) continue;
      if (!/^\d\d-\d\d$/.test(mmdd)) continue;
      rows.push({ source, mmdd, target });
    }
  }
  return rows;
}

// ── Ordinarium skeletons ────────────────────────────────────────────

const HOUR_FILES = ['Matutinum', 'Laudes', 'Prima', 'Minor', 'Vespera', 'Completorium'];

// ── Entry point ─────────────────────────────────────────────────────

/**
 * Populate the office-plane tables. `out` is the node:sqlite DB;
 * `wwwRoot` the vendored …/web/www directory.
 * Returns row-count summary for the ingest log.
 */
export function ingestOfficePlane(out, wwwRoot) {
  out.exec(OFFICE_SCHEMA_SQL);
  const insSchema = out.prepare(
    'INSERT INTO office_psalm_schema (day_key, hour, nocturn, slot_ord, antiphon_la, antiphon_en, psalm_ref, festal_bracket) VALUES (?,?,?,?,?,?,?,?)',
  );
  const insVersicle = out.prepare(
    'INSERT INTO office_nocturn_versicle (day_key, nocturn, versicle_la, response_la, versicle_en, response_en) VALUES (?,?,?,?,?,?)',
  );
  const insSkeleton = out.prepare('INSERT INTO office_skeleton (hour_file, ord, line) VALUES (?,?,?)');
  const insKal = out.prepare('INSERT INTO kalendar (mmdd, ord, file, title, rank) VALUES (?,?,?,?,?)');
  const insTrans = out.prepare('INSERT INTO kalendar_transfer (source, mmdd, target) VALUES (?,?,?)');

  // psalm schemas, Latin + English merged on (day_key, hour, slot_ord)
  const psalmi = (lang) => join(wwwRoot, 'horas', lang, 'Psalterium', 'Psalmi');
  const collect = (lang) => {
    const dir = psalmi(lang);
    const majorP = join(dir, 'Psalmi major.txt');
    const matP = join(dir, 'Psalmi matutinum.txt');
    const minorP = join(dir, 'Psalmi minor.txt');
    const rows = [];
    let versicles = [];
    if (existsSync(majorP)) rows.push(...parseMajor(read(majorP)));
    if (existsSync(matP)) {
      const m = parseMatutinum(read(matP));
      rows.push(...m.rows);
      versicles = m.versicles;
    }
    if (existsSync(minorP)) rows.push(...parseMinor(read(minorP)));
    return { rows, versicles };
  };
  const la = collect('Latin');
  const en = collect('English');
  const enByKey = new Map(en.rows.map((r) => [`${r.day_key}|${r.hour}|${r.slot_ord}`, r]));
  for (const r of la.rows) {
    const e = enByKey.get(`${r.day_key}|${r.hour}|${r.slot_ord}`);
    insSchema.run(r.day_key, r.hour, r.nocturn, r.slot_ord, r.antiphon, e?.antiphon ?? null, r.psalm_ref, r.festal);
  }
  const enV = new Map(en.versicles.map((v) => [`${v.day_key}|${v.nocturn}`, v]));
  for (const v of la.versicles) {
    const e = enV.get(`${v.day_key}|${v.nocturn}`);
    insVersicle.run(v.day_key, v.nocturn, v.versicle, v.response, e?.versicle ?? null, e?.response ?? null);
  }

  // hour skeletons (language-independent scripts)
  let skeletonLines = 0;
  for (const hour of HOUR_FILES) {
    const p = join(wwwRoot, 'horas', 'Ordinarium', `${hour}.txt`);
    if (!existsSync(p)) continue;
    read(p)
      .split(/\r?\n/)
      .forEach((line, i) => {
        insSkeleton.run(hour, i, line);
        skeletonLines++;
      });
  }

  // kalendar + transfers
  const kal = loadKalendarChain(wwwRoot);
  let kalRows = 0;
  for (const [mmdd, files] of kal) {
    files.forEach((f, ord) => {
      insKal.run(mmdd, ord, f.file, f.title, f.rank);
      kalRows++;
    });
  }
  const transfers = loadTransferLines(wwwRoot);
  for (const t of transfers) insTrans.run(t.source, t.mmdd, t.target);

  return {
    psalmSchemaRows: la.rows.length,
    nocturnVersicles: la.versicles.length,
    skeletonLines,
    kalendarRows: kalRows,
    transferRows: transfers.length,
  };
}
