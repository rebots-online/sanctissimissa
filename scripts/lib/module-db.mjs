/**
 * Module database format — schema 1 (BA.1 writes, BA.2 reads).
 *
 * Normative source: DOCS/ARCHITECTURE/L-content-modules-search-20261106.md
 * §2.2 (embed_meta, Closed set, Phase L) and §2.3 (module DDL, module node
 * set, module edge rels, content_digest). Nothing here may drift from that
 * partial; the DDL text is verbatim.
 */
import { createHash } from 'node:crypto';

/** §2.3 DDL verbatim. msearch carries no tokenize= option (default unicode61
 *  remove_diacritics 1, identical to the base corpus `search` table). */
export const MODULE_DDL = `
CREATE TABLE module_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE embed_meta  (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE mnodes (key TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, category TEXT, rank_class TEXT,
                     rank_num REAL, color TEXT, meta TEXT, ord INTEGER NOT NULL);
CREATE TABLE mtext  (node_key TEXT PRIMARY KEY REFERENCES mnodes(key), section TEXT NOT NULL, latin TEXT, english TEXT);
CREATE TABLE medges (src_key TEXT NOT NULL, dst_key TEXT NOT NULL, rel TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1.0,
                     meta TEXT, PRIMARY KEY (src_key, dst_key, rel));
CREATE TABLE memb   (node_key TEXT PRIMARY KEY REFERENCES mnodes(key), dim INTEGER NOT NULL, vec BLOB NOT NULL);
CREATE VIRTUAL TABLE msearch USING fts5(key, section, content);
`;

/** Module node set (Catena): §2.3. */
export const MODULE_KEY_RE = /^(commentary:catena-aurea\/|catena:|father:)/;

/** Edge rels allowed in modules (Closed set, Phase L): §2.3. */
export const MODULE_EDGE_RELS = ['PART_OF', 'ATTRIBUTED_TO', 'CITES', 'COMMENTS_ON', 'INSTANCE_OF', 'SIMILAR_TO'];

/** The seven embed_meta keys (Closed set, Phase L): §2.2. */
export const EMBED_META_KEYS = ['model', 'artifact_sha256', 'dim', 'quant', 'prefix_query', 'prefix_doc', 'norm'];

/** Canonical dump order: table → ORDER BY primary key (msearch by key). */
const DIGEST_TABLES = [
  ['embed_meta', 'key, value', 'key'],
  ['mnodes', 'key, kind, title, category, rank_class, rank_num, color, meta, ord', 'key'],
  ['mtext', 'node_key, section, latin, english', 'node_key'],
  ['medges', 'src_key, dst_key, rel, weight, meta', 'src_key, dst_key, rel'],
  ['memb', 'node_key, dim, vec', 'node_key'],
  // fts5 has no primary key; ordered by key, ties broken by the row's own
  // fields so the dump never depends on rowid assignment.
  ['msearch', 'key, section, content', 'key, section, content'],
];

function field(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Uint8Array) return Buffer.from(v.buffer, v.byteOffset, v.byteLength).toString('hex');
  return String(v);
}

/**
 * content_digest (§2.3): sha256 over the canonical dump — tables in order
 * embed_meta, mnodes, mtext, medges, memb, msearch; rows ORDER BY primary key;
 * fields tab-joined; BLOBs lowercase hex; NULL as ''; rows '\n'-joined;
 * module_meta excluded.
 * @param {import('node:sqlite').DatabaseSync} db
 * @returns {string} lowercase hex sha256
 */
export function contentDigest(db) {
  const h = createHash('sha256');
  let first = true;
  for (const [table, cols, order] of DIGEST_TABLES) {
    const names = cols.split(',').map((c) => c.trim());
    const stmt = db.prepare(`SELECT ${cols} FROM ${table} ORDER BY ${order}`);
    for (const row of stmt.iterate()) {
      if (!first) h.update('\n');
      first = false;
      h.update(names.map((n) => field(row[n])).join('\t'));
    }
  }
  return h.digest('hex');
}
