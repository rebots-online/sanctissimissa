/**
 * Reading progress (§L.5; DOCS/ARCHITECTURE/L-bookstore-commerce-20261106.md
 * §2.4). Sidecar setting `library.progress.<editionId>`:
 *   {"schemaVersion":1,"chapterKey":"<chapterKey>","updatedAt":"<ISO>"}
 * `LibraryReader` writes on chapter open; `MyBooksPanel`'s `.continue-card`
 * and Read action read it. A malformed value or an unparseable chapterKey
 * reads as null. The persist is debounced 1 s per edition.
 */

import type { SidecarDb } from '../accompaniment/store.ts';
import { parseChapterKey } from './moduleKeys.ts';

export interface ProgressRecord {
  chapterKey: string;
  updatedAt: string;
}

const DEBOUNCE_MS = 1000;
const pending = new Map<string, ReturnType<typeof setTimeout>>();

export function progressKey(editionId: string): string {
  return `library.progress.${editionId}`;
}

export function readProgress(sidecar: Pick<SidecarDb, 'getSetting'>, editionId: string): ProgressRecord | null {
  const raw = sidecar.getSetting(progressKey(editionId));
  if (raw === null) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    if (o.schemaVersion !== 1 || typeof o.chapterKey !== 'string' || typeof o.updatedAt !== 'string') return null;
    if (!parseChapterKey(o.chapterKey) || Number.isNaN(Date.parse(o.updatedAt))) return null;
    return { chapterKey: o.chapterKey, updatedAt: o.updatedAt };
  } catch {
    return null;
  }
}

export function writeProgress(
  sidecar: Pick<SidecarDb, 'setSetting' | 'persist'>,
  editionId: string,
  chapterKey: string,
): void {
  sidecar.setSetting(
    progressKey(editionId),
    JSON.stringify({ schemaVersion: 1, chapterKey, updatedAt: new Date().toISOString() }),
  );
  const prior = pending.get(editionId);
  if (prior !== undefined) clearTimeout(prior);
  pending.set(
    editionId,
    setTimeout(() => {
      pending.delete(editionId);
      void sidecar.persist().catch(() => undefined);
    }, DEBOUNCE_MS),
  );
}

/** The most recently updated progress record among `editionIds`, or null. */
export function latestProgress(
  sidecar: Pick<SidecarDb, 'getSetting'>,
  editionIds: string[],
): { editionId: string; chapterKey: string; updatedAt: string } | null {
  let best: { editionId: string; chapterKey: string; updatedAt: string } | null = null;
  for (const editionId of editionIds) {
    const p = readProgress(sidecar, editionId);
    if (p && (!best || Date.parse(p.updatedAt) > Date.parse(best.updatedAt))) best = { editionId, ...p };
  }
  return best;
}
