/**
 * L.6 §2.5 — ChunkStore: IndexedDB `sanctissimissa.audiobook.v1`, version 1.
 * A regenerable cache of synthesized sentences (PCM stored as Int16), never a
 * source of truth.
 *
 *   chunks    key "<editionId>/<revision>/<voiceKey>/<chapterKey>/<sentenceIndex>", index byChapter on chapterRef
 *   chapters  key chapterRef = "<editionId>/<revision>/<voiceKey>/<chapterKey>"
 *
 * see DOCS/sdk/indexeddb/mdn-using-indexeddb.md (stores, indexes, key ranges, getAllKeys)
 * see DOCS/sdk/indexeddb/mdn-idbobjectstore-put.md
 */

import type { SynthesizedAudio } from '../voice/voice.ts';
import { CHUNK_STORE_BUDGET_BYTES } from './constants.ts';

export const AUDIOBOOK_DB = 'sanctissimissa.audiobook.v1';
const CHUNKS = 'chunks';
const CHAPTERS = 'chapters';

export interface ChunkRow {
  pcm: Int16Array;
  sampleRate: number;
  durationSec: number;
  text: string;
  bytes: number;
  chapterRef: string;
  createdAt: number;
}

export interface ChapterRow {
  editionId: string;
  revision: number;
  voiceKey: string;
  chapterKey: string;
  sentenceCount: number;
  storedCount: number;
  totalSec: number | null;
  bytes: number;
  lastAccess: number;
}

export function chapterRefOf(editionId: string, revision: number, voiceKey: string, chapterKey: string): string {
  return `${editionId}/${revision}/${voiceKey}/${chapterKey}`;
}

export function chunkKeyOf(chapterRef: string, sentenceIndex: number): string {
  return `${chapterRef}/${sentenceIndex}`;
}

/** Every chunk key of one chapter (keys are `<chapterRef>/<n>`). */
const chapterRange = (ref: string) => IDBKeyRange.bound(`${ref}/`, `${ref}/￿`);

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error('IndexedDB request failed'));
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'));
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export class ChunkStore {
  #db: Promise<IDBDatabase> | null = null;

  #open(): Promise<IDBDatabase> {
    this.#db ??= new Promise((resolve, reject) => {
      const r = indexedDB.open(AUDIOBOOK_DB, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        if (!db.objectStoreNames.contains(CHUNKS)) {
          db.createObjectStore(CHUNKS).createIndex('byChapter', 'chapterRef');
        }
        if (!db.objectStoreNames.contains(CHAPTERS)) db.createObjectStore(CHAPTERS);
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error ?? new Error('Could not open the audiobook chunk store'));
    });
    return this.#db;
  }

  /** A miss when absent or when the stored text differs from the sentence derived now. */
  async get(key: string, expectedText: string): Promise<SynthesizedAudio | null> {
    const db = await this.#open();
    const row = (await req(db.transaction(CHUNKS, 'readonly').objectStore(CHUNKS).get(key))) as ChunkRow | undefined;
    if (!row || row.text !== expectedText) return null;
    const pcm = new Float32Array(row.pcm.length);
    for (let i = 0; i < pcm.length; i++) pcm[i] = row.pcm[i] / 32767;
    return { pcm, sampleRate: row.sampleRate, durationSec: row.durationSec };
  }

  async put(key: string, audio: SynthesizedAudio, text: string, chapterRef: string): Promise<number> {
    const pcm = new Int16Array(audio.pcm.length);
    for (let i = 0; i < pcm.length; i++) pcm[i] = Math.round(Math.max(-1, Math.min(1, audio.pcm[i])) * 32767);
    const row: ChunkRow = {
      pcm,
      sampleRate: audio.sampleRate,
      durationSec: audio.durationSec,
      text,
      bytes: pcm.byteLength,
      chapterRef,
      createdAt: Date.now(),
    };
    const db = await this.#open();
    const tx = db.transaction(CHUNKS, 'readwrite');
    tx.objectStore(CHUNKS).put(row, key);
    await done(tx);
    return row.bytes;
  }

  async chapter(ref: string): Promise<ChapterRow | null> {
    const db = await this.#open();
    return ((await req(db.transaction(CHAPTERS, 'readonly').objectStore(CHAPTERS).get(ref))) as ChapterRow | undefined) ?? null;
  }

  async putChapter(row: ChapterRow): Promise<void> {
    const db = await this.#open();
    const tx = db.transaction(CHAPTERS, 'readwrite');
    tx.objectStore(CHAPTERS).put(row, chapterRefOf(row.editionId, row.revision, row.voiceKey, row.chapterKey));
    await done(tx);
  }

  /** Stored sentence indices of a chapter (primary keys only — no PCM is read). */
  async storedIndices(ref: string): Promise<Set<number>> {
    const db = await this.#open();
    const keys = await req(db.transaction(CHUNKS, 'readonly').objectStore(CHUNKS).getAllKeys(chapterRange(ref)));
    const out = new Set<number>();
    for (const k of keys) {
      const n = Number(String(k).slice(ref.length + 1));
      if (Number.isInteger(n)) out.add(n);
    }
    return out;
  }

  /** Per-sentence durations of a chapter's stored chunks (cursor over byChapter, one value at a time). */
  async durations(ref: string): Promise<Map<number, number>> {
    const db = await this.#open();
    const out = new Map<number, number>();
    await new Promise<void>((resolve, reject) => {
      const r = db.transaction(CHUNKS, 'readonly').objectStore(CHUNKS).index('byChapter').openCursor(IDBKeyRange.only(ref));
      r.onsuccess = () => {
        const cur = r.result;
        if (!cur) return resolve();
        out.set(Number(String(cur.primaryKey).slice(ref.length + 1)), (cur.value as ChunkRow).durationSec);
        cur.continue();
      };
      r.onerror = () => reject(r.error ?? new Error('IndexedDB cursor failed'));
    });
    return out;
  }

  async #deleteChapters(refs: readonly string[]): Promise<void> {
    if (refs.length === 0) return;
    const db = await this.#open();
    const tx = db.transaction([CHUNKS, CHAPTERS], 'readwrite');
    for (const ref of refs) {
      tx.objectStore(CHUNKS).delete(chapterRange(ref));
      tx.objectStore(CHAPTERS).delete(ref);
    }
    await done(tx);
  }

  async #allChapters(): Promise<ChapterRow[]> {
    const db = await this.#open();
    return (await req(db.transaction(CHAPTERS, 'readonly').objectStore(CHAPTERS).getAll())) as ChapterRow[];
  }

  /** Deletes the edition's chunks and chapters whose revision or voiceKey differ from the current ones. */
  async purgeStale(editionId: string, revision: number, voiceKey: string): Promise<void> {
    const stale = (await this.#allChapters())
      .filter((c) => c.editionId === editionId && (c.revision !== revision || c.voiceKey !== voiceKey))
      .map((c) => chapterRefOf(c.editionId, c.revision, c.voiceKey, c.chapterKey));
    await this.#deleteChapters(stale);
    // Orphan chunks (no chapter row) of the edition under another revision/voice.
    const db = await this.#open();
    const current = `${editionId}/${revision}/${voiceKey}/`;
    const keys = await req(db.transaction(CHUNKS, 'readonly').objectStore(CHUNKS)
      .getAllKeys(IDBKeyRange.bound(`${editionId}/`, `${editionId}/￿`)));
    const orphans = keys.map(String).filter((k) => !k.startsWith(current));
    if (orphans.length === 0) return;
    const tx = db.transaction(CHUNKS, 'readwrite');
    for (const k of orphans) tx.objectStore(CHUNKS).delete(k);
    await done(tx);
  }

  /**
   * While Σ chapters.bytes > CHUNK_STORE_BUDGET_BYTES, delete whole chapters by
   * ascending lastAccess, never a `keep` ref. Returns the evicted refs.
   */
  async evict(keep: readonly string[]): Promise<string[]> {
    const rows = await this.#allChapters();
    let total = rows.reduce((a, c) => a + c.bytes, 0);
    if (total <= CHUNK_STORE_BUDGET_BYTES) return [];
    const evicted: string[] = [];
    for (const c of rows.slice().sort((a, b) => a.lastAccess - b.lastAccess)) {
      if (total <= CHUNK_STORE_BUDGET_BYTES) break;
      const ref = chapterRefOf(c.editionId, c.revision, c.voiceKey, c.chapterKey);
      if (keep.includes(ref)) continue;
      evicted.push(ref);
      total -= c.bytes;
    }
    await this.#deleteChapters(evicted);
    return evicted;
  }

  /** Σ bytes of every chapter row (the budget's measure). */
  async totalBytes(): Promise<number> {
    return (await this.#allChapters()).reduce((a, c) => a + c.bytes, 0);
  }

  /**
   * The greatest chapter `c` such that every chapter from `fromChapterKey`
   * through `c` (in `order`) is fully stored; null if the current one is not.
   * Rows are those of the edition's current revision/voice (purgeStale runs at open).
   */
  async summary(editionId: string, fromChapterKey: string, order: readonly string[]): Promise<{ readyThrough: string | null }> {
    const rows = new Map<string, ChapterRow>();
    for (const c of await this.#allChapters()) if (c.editionId === editionId) rows.set(c.chapterKey, c);
    let readyThrough: string | null = null;
    for (let i = Math.max(0, order.indexOf(fromChapterKey)); i < order.length; i++) {
      const row = rows.get(order[i]);
      if (!row || row.sentenceCount === 0 || row.storedCount !== row.sentenceCount) break;
      readyThrough = order[i];
    }
    return { readyThrough };
  }
}
