/**
 * CompanionMemory (§H.2) — the Companion's persistent memory over the sidecar
 * handle (the sql.js `Database` that `SidecarDb` wraps; its raw handle, since
 * lore rows and embeddings are written directly, store.ts access pattern).
 *
 * Layer 1 `lore`: SOUL.md-style rows, user-visible and user-editable.
 * `assemble` renders them into the per-turn system context as one
 * `## Companion lore` block — each row body capped at 400 chars, rows ordered
 * oldest-first so the newest reads last, and the whole block (heading
 * included) capped at 4000 chars; when the budget overflows it is the oldest
 * rows that are dropped. The block itself is context-independent — `ctx`
 * (live view / date / focus) is accepted so call sites pass their context
 * unchanged.
 *
 * Layer 2 `sidecar_embeddings`: model-agnostic `embedText` vectors.
 * `recall` embeds the query and ranks every embedding row by cosine, top-k.
 *
 * `distill` records one completed turn as a `lore` row of kind 'journey'
 * (body `Q: …\nA: …`, answer capped at 600 chars) plus its embedding row,
 * keeping at most 64 distilled rows — the oldest (and their embeddings) are
 * pruned. No scheduling lives here; callers decide when a turn is distilled.
 */

import type { Database } from 'sql.js';
import { embedText, cosine, EMBED_DIM } from '../vector/embed.ts';

export interface MemoryHit {
  refId: string;
  score: number;
}

/** Section heading of the assembled lore block. */
const LORE_HEADING = '## Companion lore';
/** Per-row body rendering cap inside `assemble`. */
const ROW_CHAR_CAP = 400;
/** Whole-block cap inside `assemble`, heading included. */
const BLOCK_CHAR_CAP = 4000;
/** Answer cap inside `distill`. */
const ANSWER_CHAR_CAP = 600;
/** Maximum distilled ('journey') lore rows; oldest are pruned beyond it. */
const MAX_DISTILLED_ROWS = 64;

export class CompanionMemory {
  private db: Database;
  private deviceId = '';

  constructor(db: Database) {
    this.db = db;
  }

  /**
   * Render the lore rows as a `## Companion lore` block: every kind, each row
   * body capped at 400 chars, oldest-first so the newest row reads last, and
   * the whole block capped at 4000 chars — on overflow the newest rows are
   * the ones kept. Returns '' when there is no lore to show.
   */
  assemble(ctx: { view: string; date: string; focus: string | null }): string {
    void ctx; // The lore block is context-independent (§H.2); ctx is accepted for call-site stability.
    const rows = this.all('SELECT kind, body_md FROM lore ORDER BY updated_at ASC, rowid ASC');
    const lines = rows.map(
      (r) => `- [${String(r.kind)}] ${String(r.body_md ?? '').slice(0, ROW_CHAR_CAP)}`,
    );
    // Walk newest-first so overflow drops the oldest rows first, then unshift
    // back into oldest-first (newest-last) order.
    const kept: string[] = [];
    let blockLength = LORE_HEADING.length;
    for (let i = lines.length - 1; i >= 0; i--) {
      const cost = 1 + lines[i].length; // newline + line
      if (blockLength + cost > BLOCK_CHAR_CAP) break;
      kept.unshift(lines[i]);
      blockLength += cost;
    }
    return kept.length ? `${LORE_HEADING}\n${kept.join('\n')}` : '';
  }

  /**
   * Embed `query` via `embedText` and rank every `sidecar_embeddings` row by
   * cosine similarity, returning the top-k hits (ties broken by refId so the
   * order is deterministic).
   */
  recall(query: string, k = 5): MemoryHit[] {
    if (k <= 0) return [];
    const queryVec = embedText(query);
    return this.all('SELECT ref_id, vec FROM sidecar_embeddings')
      .map((r) => ({ refId: String(r.ref_id), score: cosine(queryVec, r.vec as Uint8Array) }))
      .sort(
        (a, b) => b.score - a.score || (a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0),
      )
      .slice(0, k);
  }

  /**
   * Record one completed Companion turn as memory: a `lore` row of kind
   * 'journey' whose body is `Q: <question>\nA: <answer>` (answer capped at
   * 600 chars) plus its `sidecar_embeddings` row. At most 64 distilled rows
   * are kept — the oldest, and their embeddings with them, are pruned.
   * No scheduling: callers decide when a turn is distilled.
   */
  async distill(turn: { question: string; answer: string }): Promise<void> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const body = `Q: ${turn.question}\nA: ${turn.answer.slice(0, ANSWER_CHAR_CAP)}`;
    this.run(
      'INSERT INTO lore (id, device_id, updated_at, kind, body_md) VALUES (?, ?, ?, ?, ?)',
      [id, this.ensureDeviceId(), now, 'journey', body],
    );
    const vec = embedText(body);
    this.run('INSERT OR REPLACE INTO sidecar_embeddings (ref_id, dim, vec) VALUES (?, ?, ?)', [
      id,
      EMBED_DIM,
      new Uint8Array(vec.buffer, vec.byteOffset, vec.byteLength),
    ]);
    const distilled = this.all(
      "SELECT id FROM lore WHERE kind = 'journey' ORDER BY updated_at ASC, rowid ASC",
    );
    const excess = distilled.length - MAX_DISTILLED_ROWS;
    for (let i = 0; i < excess; i++) {
      this.run('DELETE FROM lore WHERE id = ?', [distilled[i].id]);
      this.run('DELETE FROM sidecar_embeddings WHERE ref_id = ?', [distilled[i].id]);
    }
  }

  /* ------------------ sidecar access (store.ts exact pattern) ------------------ */

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

  /** Read (or create, exactly as SidecarDb.ensureDeviceId does) the device id. */
  private ensureDeviceId(): string {
    if (this.deviceId) return this.deviceId;
    const rows = this.all('SELECT value FROM settings WHERE key = ?', ['device.id']);
    if (rows.length) {
      this.deviceId = String(rows[0].value);
      return this.deviceId;
    }
    const id = crypto.randomUUID();
    this.run('INSERT INTO settings (key, device_id, updated_at, value) VALUES (?, ?, ?, ?)', [
      'device.id',
      id,
      new Date().toISOString(),
      id,
    ]);
    this.deviceId = id;
    return id;
  }
}
