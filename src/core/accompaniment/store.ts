/**
 * Sidecar v2 — user-authored data as SQLite via the already-loaded sql.js
 * (the collinear rule extended to user data, ARCHITECTURE §7.6). Platforms
 * differ only in byte persistence: web IndexedDB, Tauri app-data file,
 * mirroring `loadCorpus.ts`. Every write sets `updated_at` + `device_id`;
 * deletes are tombstones; lists filter `deleted_at IS NULL`.
 */

import type { Database } from 'sql.js';
import { isTauri } from '../data/loadCorpus.ts';
import { embedText, cosine, EMBED_DIM } from '../vector/embed.ts';
import type { Accompaniment, Exposure, OccurrenceSelector } from './types.ts';

/**
 * §7.6 DDL verbatim, plus:
 *  - `quote_alt` on accompaniments — §7.7 dual-pane highlight (quote + quoteAlt);
 *  - the §7 `settings` table, carried over unchanged.
 */
export const SIDECAR_SCHEMA_SQL_V2 = `
CREATE TABLE IF NOT EXISTS accompaniments (
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT,
  title TEXT NOT NULL DEFAULT '', body_pm TEXT NOT NULL DEFAULT '',   -- ProseMirror JSON
  body_html TEXT NOT NULL DEFAULT '',                                 -- rendered snapshot (share/print/export)
  anchors TEXT NOT NULL DEFAULT '[]',                                 -- JSON array of node keys ('verse:Gen/1/1','section:...') or []
  exposure TEXT NOT NULL,                    -- 'journal'|'homily'|'study'|'newsletter'
  provenance TEXT NOT NULL DEFAULT 'authored',  -- 'authored'|'generated'|'vendored'
  quote TEXT,                                -- lightweight highlight fields (annotation migration)
  quote_alt TEXT,                            -- §7.7 dual-pane highlight
  color TEXT,
  created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS occurrences (     -- occurrence selectors, N per accompaniment
  id TEXT PRIMARY KEY, accompaniment_id TEXT NOT NULL, kind TEXT NOT NULL,
  -- kind IN date(iso) | temporal(weekKey) | sancti(mmdd) | season(name) | theme(free-form tag) | recurrence(rule)
  value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS lore (            -- CompanionMemory layer 1: SOUL.md-style, user-visible AND user-editable
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL,
  kind TEXT NOT NULL,                        -- 'journey'|'parish'|'persona'
  body_md TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS sidecar_embeddings (  -- CompanionMemory layer 2: embedText (Decision 4, model-agnostic)
  ref_id TEXT PRIMARY KEY, dim INTEGER NOT NULL, vec BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS parish_profile (  -- institutional edition: header space / masthead
  key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- name, logo(dataURI), letterhead, colors, address
CREATE TABLE IF NOT EXISTS reading_progress (plan_id TEXT NOT NULL, ord INTEGER NOT NULL, completed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, device_id TEXT NOT NULL, updated_at TEXT NOT NULL, value TEXT NOT NULL);
`;

/* ------------------------------------------------------------------ */
/* Platform byte persistence (web IndexedDB; Tauri load/save_sidecar) */
/* ------------------------------------------------------------------ */

const IDB_NAME = 'standroidsmissal';
const IDB_STORE = 'blobs';
const IDB_KEY = 'sidecar.db';

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Uint8Array | null> {
  const db = await idbOpen();
  try {
    return await new Promise((resolve, reject) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve(req.result instanceof Uint8Array ? req.result : null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbPut(bytes: Uint8Array): Promise<void> {
  const db = await idbOpen();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/**
 * sql.js init — dynamic imports so this module stays importable under plain
 * Node (tests import SIDECAR_SCHEMA_SQL_V2 without touching sql.js). Under
 * Vite the `?url` wasm asset resolves; under Node the catch path lets sql.js
 * locate its own wasm next to its dist bundle.
 */
async function initSql() {
  const initSqlJs = (await import('sql.js')).default;
  let locateFile: ((file: string) => string) | undefined;
  try {
    const wasm = await import('sql.js/dist/sql-wasm.wasm?url');
    locateFile = () => wasm.default;
  } catch {
    locateFile = undefined;
  }
  return initSqlJs(locateFile ? { locateFile } : {});
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Tiny HTML → text strip for embedding input (no DOM dependency). */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseAnchors(raw: unknown): string[] {
  try {
    const parsed = raw ? JSON.parse(String(raw)) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* SidecarDb                                                           */
/* ------------------------------------------------------------------ */

export class SidecarDb {
  private db: Database;
  private deviceId = '';

  private constructor(db: Database) {
    this.db = db;
  }

  /** Load persisted bytes (Tauri `load_sidecar` / web IndexedDB), open, ensure schema + device id. */
  static async open(): Promise<SidecarDb> {
    let bytes: Uint8Array | null = null;
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      const b = await invoke<number[] | null>('load_sidecar');
      if (b && b.length > 0) bytes = Uint8Array.from(b);
    } else if (typeof indexedDB !== 'undefined') {
      bytes = await idbGet();
    }
    const SQL = await initSql();
    const db = new SQL.Database(bytes ?? undefined);
    db.exec(SIDECAR_SCHEMA_SQL_V2);
    const sdb = new SidecarDb(db);
    sdb.ensureColumn('accompaniments', 'quote_alt', 'TEXT'); // §7.7 upgrade of a pre-quote_alt byte store
    sdb.deviceId = sdb.ensureDeviceId();
    return sdb;
  }

  /** Export bytes to the platform store. Callers debounce, not this method. */
  async persist(): Promise<void> {
    const bytes = this.db.export();
    if (isTauri()) {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_sidecar', { bytes: Array.from(bytes) });
    } else if (typeof indexedDB !== 'undefined') {
      await idbPut(bytes);
    }
  }

  private all(sql: string, params: unknown[] = []): Record<string, unknown>[] {
    const stmt = this.db.prepare(sql);
    try {
      stmt.bind(params as never);
      const rows: Record<string, unknown>[] = [];
      while (stmt.step()) rows.push(stmt.getAsObject() as Record<string, unknown>);
      return rows;
    } finally {
      stmt.free();
    }
  }

  private run(sql: string, params: unknown[] = []): void {
    this.db.run(sql, params as never);
  }

  private ensureColumn(table: string, column: string, type: string): void {
    const cols = this.all(`PRAGMA table_info(${table})`).map((r) => String(r.name));
    if (!cols.includes(column)) this.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }

  private ensureDeviceId(): string {
    const rows = this.all('SELECT value FROM settings WHERE key = ?', ['device.id']);
    if (rows.length) return String(rows[0].value);
    const id = crypto.randomUUID();
    this.run('INSERT INTO settings (key, device_id, updated_at, value) VALUES (?, ?, ?, ?)', [
      'device.id',
      id,
      new Date().toISOString(),
      id,
    ]);
    return id;
  }

  private selectorsOf(accompanimentId: string): OccurrenceSelector[] {
    return this.all('SELECT id, accompaniment_id, kind, value FROM occurrences WHERE accompaniment_id = ?', [
      accompanimentId,
    ]).map((r) => ({
      id: String(r.id),
      accompanimentId: String(r.accompaniment_id),
      kind: String(r.kind) as OccurrenceSelector['kind'],
      value: String(r.value),
    }));
  }

  private rowToAccompaniment(r: Record<string, unknown>): Accompaniment {
    const selectors = this.selectorsOf(String(r.id));
    return {
      id: String(r.id),
      deviceId: String(r.device_id),
      updatedAt: String(r.updated_at),
      deletedAt: (r.deleted_at as string) ?? null,
      title: String(r.title ?? ''),
      bodyPm: String(r.body_pm ?? ''),
      bodyHtml: String(r.body_html ?? ''),
      anchors: parseAnchors(r.anchors),
      exposure: String(r.exposure) as Exposure,
      provenance: String(r.provenance ?? 'authored') as Accompaniment['provenance'],
      quote: (r.quote as string) ?? null,
      quoteAlt: (r.quote_alt as string) ?? null,
      color: (r.color as string) ?? null,
      createdAt: String(r.created_at),
      tags: selectors.filter((s) => s.kind === 'theme').map((s) => s.value),
      selectors,
    };
  }

  /** Live accompaniments (deleted_at IS NULL), optionally by exposure / anchor / theme tag. */
  list(exposure?: Exposure, filter?: { anchor?: string; tag?: string }): Accompaniment[] {
    const where = ['deleted_at IS NULL'];
    const params: unknown[] = [];
    if (exposure) {
      where.push('exposure = ?');
      params.push(exposure);
    }
    let out = this.all(
      `SELECT * FROM accompaniments WHERE ${where.join(' AND ')} ORDER BY created_at DESC`,
      params,
    ).map((r) => this.rowToAccompaniment(r));
    if (filter?.anchor !== undefined) out = out.filter((a) => a.anchors.includes(filter.anchor!));
    if (filter?.tag !== undefined) out = out.filter((a) => a.tags.includes(filter.tag!));
    return out;
  }

  /** Upsert; replaces occurrence rows from `acc.selectors`; refreshes the sidecar embedding. */
  save(acc: Partial<Accompaniment> & { exposure: Exposure }): Accompaniment {
    const now = new Date().toISOString();
    const id = acc.id ?? crypto.randomUUID();
    const selectors: OccurrenceSelector[] = (acc.selectors ?? []).map((s) => ({
      id: s.id || crypto.randomUUID(),
      accompanimentId: id,
      kind: s.kind,
      value: s.value,
    }));
    const full: Accompaniment = {
      id,
      deviceId: this.deviceId,
      updatedAt: now,
      deletedAt: acc.deletedAt ?? null,
      title: acc.title ?? '',
      bodyPm: acc.bodyPm ?? '',
      bodyHtml: acc.bodyHtml ?? '',
      anchors: acc.anchors ?? [],
      exposure: acc.exposure,
      provenance: acc.provenance ?? 'authored',
      quote: acc.quote ?? null,
      quoteAlt: acc.quoteAlt ?? null,
      color: acc.color ?? null,
      createdAt: acc.createdAt ?? now,
      tags: selectors.filter((s) => s.kind === 'theme').map((s) => s.value),
      selectors,
    };
    this.run(
      `INSERT OR REPLACE INTO accompaniments
         (id, device_id, updated_at, deleted_at, title, body_pm, body_html, anchors,
          exposure, provenance, quote, quote_alt, color, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        full.id,
        full.deviceId,
        full.updatedAt,
        full.deletedAt,
        full.title,
        full.bodyPm,
        full.bodyHtml,
        JSON.stringify(full.anchors),
        full.exposure,
        full.provenance,
        full.quote,
        full.quoteAlt ?? null,
        full.color,
        full.createdAt,
      ],
    );
    this.run('DELETE FROM occurrences WHERE accompaniment_id = ?', [id]);
    for (const s of selectors) {
      this.run('INSERT INTO occurrences (id, accompaniment_id, kind, value) VALUES (?, ?, ?, ?)', [
        s.id,
        s.accompanimentId,
        s.kind,
        s.value,
      ]);
    }
    const vec = embedText(`${full.title} ${plainText(full.bodyHtml)} ${full.quote ?? ''}`);
    this.run('INSERT OR REPLACE INTO sidecar_embeddings (ref_id, dim, vec) VALUES (?, ?, ?)', [
      id,
      EMBED_DIM,
      new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength),
    ]);
    return full;
  }

  /** Tombstone delete — the row stays, `deleted_at` set, lists exclude it. */
  remove(id: string): void {
    this.run('UPDATE accompaniments SET deleted_at = ?, updated_at = ?, device_id = ? WHERE id = ?', [
      new Date().toISOString(),
      new Date().toISOString(),
      this.deviceId,
      id,
    ]);
  }

  /** Live accompaniments anchored to a node key. */
  forAnchor(nodeKey: string): Accompaniment[] {
    return this.list(undefined, { anchor: nodeKey });
  }

  /** Cosine top-k over sidecar_embeddings. */
  similar(queryVec: Int8Array, k: number): { id: string; score: number }[] {
    return this.all('SELECT ref_id, vec FROM sidecar_embeddings')
      .map((r) => ({ id: String(r.ref_id), score: cosine(queryVec, r.vec as Uint8Array) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  getSetting(key: string): string | null {
    const rows = this.all('SELECT value FROM settings WHERE key = ?', [key]);
    return rows.length ? String(rows[0].value) : null;
  }

  setSetting(key: string, value: string): void {
    this.run('INSERT OR REPLACE INTO settings (key, device_id, updated_at, value) VALUES (?, ?, ?, ?)', [
      key,
      this.deviceId,
      new Date().toISOString(),
      value,
    ]);
  }

  export(): Uint8Array {
    return this.db.export();
  }
}

/* ------------------------------------------------------------------ */
/* Annotation migration                                                */
/* ------------------------------------------------------------------ */

interface LegacyAnnotation {
  id?: string;
  nodeKey?: string;
  quote?: string;
  quoteAlt?: string;
  note?: string;
  color?: string;
  createdAt?: string;
}

/**
 * One-shot import of v1 localStorage annotations as lightweight journal
 * accompaniments. Idempotent via settings flag `migrated.localStorage.v2`;
 * the old localStorage keys are preserved read-only (never deleted).
 * Reads both `sam.annotations.v1` (spec key) and
 * `standroidsmissal.annotations.v1` (the key `src/core/annotations/store.ts`
 * actually writes). Returns the number of annotations migrated.
 */
export async function migrateLocalStorageAnnotations(sdb: SidecarDb): Promise<number> {
  const FLAG = 'migrated.localStorage.v2';
  if (sdb.getSetting(FLAG) === '1') return 0;
  if (typeof localStorage === 'undefined') return 0;
  let count = 0;
  for (const key of ['sam.annotations.v1', 'standroidsmissal.annotations.v1']) {
    let list: unknown = null;
    try {
      const raw = localStorage.getItem(key);
      list = raw ? JSON.parse(raw) : null;
    } catch {
      list = null;
    }
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || typeof item !== 'object') continue;
      const ann = item as LegacyAnnotation;
      if (!ann.nodeKey) continue;
      sdb.save({
        id: ann.id,
        exposure: 'journal',
        provenance: 'authored',
        title: '',
        bodyHtml: ann.note ? `<p>${escapeHtml(ann.note)}</p>` : '',
        anchors: [ann.nodeKey],
        quote: ann.quote ?? null,
        quoteAlt: ann.quoteAlt ?? null,
        color: ann.color ?? null,
        createdAt: ann.createdAt,
      });
      count++;
    }
  }
  sdb.setSetting(FLAG, '1');
  await sdb.persist();
  return count;
}
