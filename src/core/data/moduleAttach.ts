/**
 * attachModuleRows (§L.4; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §2.3, §3.3 step 4).
 * Opens a schema-1 module DB as a second sql.js Database and copies its rows into the base
 * corpus inside one transaction. Existing base keys are kept; edges resolve key→id.
 */
import initSqlJs, { type Database } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { AttachRefusedError, type AttachResult } from '../modules/core.ts';

export type { AttachResult } from '../modules/core.ts';

const EMBED_META_KEYS = ['model', 'artifact_sha256', 'dim', 'quant', 'prefix_query', 'prefix_doc', 'norm'] as const;

type Row = Record<string, unknown>;

function rows(db: Database, sql: string, params: unknown[] = []): Row[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params as never);
    const out: Row[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as Row);
    return out;
  } finally {
    stmt.free();
  }
}

function hasTable(db: Database, name: string): boolean {
  return rows(db, "SELECT 1 FROM sqlite_master WHERE type IN ('table','view') AND name = ?", [name]).length > 0;
}

function kv(db: Database, table: string): Map<string, string> {
  if (!hasTable(db, table)) return new Map();
  return new Map(rows(db, `SELECT key, value FROM ${table}`).map((r) => [String(r.key), String(r.value)] as const));
}

function nullable(v: unknown): unknown {
  return v === undefined ? null : v;
}

export async function attachModuleRows(base: Database, id: string, bytes: Uint8Array): Promise<AttachResult> {
  const SQL = await initSqlJs({ locateFile: () => wasmUrl });
  const mod = new SQL.Database(bytes);
  try {
    base.run(
      'CREATE TABLE IF NOT EXISTS module_attach(module_id TEXT PRIMARY KEY, revision INTEGER NOT NULL, attached_at TEXT NOT NULL, first_node_id INTEGER, last_node_id INTEGER, nucleus_source TEXT)',
    );
    const meta = kv(mod, 'module_meta');
    if (meta.get('schema_version') !== '1') throw new AttachRefusedError('schema-unsupported');
    const baseEmbed = kv(base, 'embed_meta');
    const modEmbed = kv(mod, 'embed_meta');
    if (baseEmbed.size === 0) throw new AttachRefusedError('embed-meta-incompatible');
    for (const k of EMBED_META_KEYS) {
      const b = baseEmbed.get(k);
      if (b === undefined || modEmbed.get(k) === undefined || b !== modEmbed.get(k)) {
        throw new AttachRefusedError('embed-meta-incompatible');
      }
    }
    if (rows(base, 'SELECT 1 FROM module_attach WHERE module_id = ?', [id]).length > 0) {
      throw new AttachRefusedError('already-attached');
    }

    const result: AttachResult = {
      moduleId: id,
      revision: Number(meta.get('revision') ?? 0) || 0,
      nodes: 0,
      edges: 0,
      embeddings: 0,
      searchRows: 0,
      skippedExistingKeys: 0,
      unresolvedEdges: 0,
    };
    const keyToId = new Map<string, number>();
    const fresh = new Map<string, number>();
    let firstId: number | null = null;
    let lastId: number | null = null;

    base.run('BEGIN');
    try {
      // 1. nodes, in module order; an existing base key is kept and mapped.
      for (const n of rows(mod, 'SELECT key, kind, title, category, rank_class, rank_num, color, meta FROM mnodes ORDER BY ord')) {
        const key = String(n.key);
        const existing = rows(base, 'SELECT id FROM nodes WHERE key = ?', [key]);
        if (existing.length) {
          keyToId.set(key, Number(existing[0].id));
          result.skippedExistingKeys++;
          continue;
        }
        base.run('INSERT INTO nodes(kind,key,title,category,rank_class,rank_num,color,meta) VALUES (?,?,?,?,?,?,?,?)', [
          n.kind, key, nullable(n.title), nullable(n.category), nullable(n.rank_class), nullable(n.rank_num),
          nullable(n.color), nullable(n.meta),
        ] as never);
        const newId = Number(rows(base, 'SELECT last_insert_rowid() AS id')[0].id);
        keyToId.set(key, newId);
        fresh.set(key, newId);
        firstId ??= newId;
        lastId = newId;
        result.nodes++;
      }

      // 2. text, embeddings and FTS rows for newly inserted nodes only.
      for (const t of rows(mod, 'SELECT node_key, section, latin, english FROM mtext')) {
        const nid = fresh.get(String(t.node_key));
        if (nid === undefined) continue;
        base.run('INSERT INTO text_blocks(node_id,section,latin,english) VALUES (?,?,?,?)', [
          nid, t.section, nullable(t.latin), nullable(t.english),
        ] as never);
      }
      for (const e of rows(mod, 'SELECT node_key, dim, vec FROM memb')) {
        const nid = fresh.get(String(e.node_key));
        if (nid === undefined) continue;
        base.run('INSERT INTO embeddings(node_id,dim,vec) VALUES (?,?,?)', [nid, e.dim, e.vec] as never);
        result.embeddings++;
      }
      for (const s of rows(mod, 'SELECT key, section, content FROM msearch')) {
        if (!fresh.has(String(s.key))) continue;
        base.run('INSERT INTO search(key,section,content) VALUES (?,?,?)', [s.key, nullable(s.section), nullable(s.content)] as never);
        result.searchRows++;
      }

      // 3. edges resolved key→id (module map first, then the base corpus).
      const resolve = (key: string): number | null => {
        const hit = keyToId.get(key);
        if (hit !== undefined) return hit;
        const r = rows(base, 'SELECT id FROM nodes WHERE key = ?', [key]);
        if (!r.length) return null;
        const nid = Number(r[0].id);
        keyToId.set(key, nid);
        return nid;
      };
      for (const e of rows(mod, 'SELECT src_key, dst_key, rel, weight, meta FROM medges')) {
        const src = resolve(String(e.src_key));
        const dst = resolve(String(e.dst_key));
        if (src === null || dst === null) {
          result.unresolvedEdges++;
          continue;
        }
        base.run('INSERT INTO edges(src,dst,rel,weight,meta) VALUES (?,?,?,?,?)', [
          src, dst, e.rel, e.weight ?? 1.0, nullable(e.meta),
        ] as never);
        result.edges++;
      }

      // 4. runtime attach record.
      base.run(
        'INSERT INTO module_attach(module_id,revision,attached_at,first_node_id,last_node_id,nucleus_source) VALUES (?,?,?,?,?,?)',
        [id, result.revision, new Date().toISOString(), firstId, lastId, meta.get('nucleus_source') ?? null] as never,
      );
      base.run('COMMIT');
    } catch (err) {
      try { base.run('ROLLBACK'); } catch { /* transaction already closed */ }
      throw err;
    }
    return result;
  } finally {
    mod.close();
  }
}
