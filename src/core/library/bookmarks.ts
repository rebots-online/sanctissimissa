/**
 * Reader bookmarks (§L.5; DOCS/ARCHITECTURE/L-bookstore-ui-20261106.md §2).
 *
 * Sidecar setting `library.bookmarks.<editionId>` (Closed set, Phase L):
 *   {"schemaVersion":1,"items":[{"nodeKey","chapterKey","createdAt"}]}
 * Items are kept in `createdAt` ascending order. A malformed value is copied
 * to `library.bookmarks.<editionId>.recovered` before the list restarts empty
 * (LS recovery rule) — nothing is silently dropped.
 */

import type { SidecarDb } from '../accompaniment/store.ts';

export interface BookmarkItem {
  nodeKey: string;
  chapterKey: string;
  createdAt: string;
}

type BookmarkStore = Pick<SidecarDb, 'getSetting' | 'setSetting' | 'persist'>;

export function bookmarksKey(editionId: string): string {
  return `library.bookmarks.${editionId}`;
}

function isItem(v: unknown): v is BookmarkItem {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.nodeKey === 'string' && typeof o.chapterKey === 'string' && typeof o.createdAt === 'string';
}

/** Parsed items, or null when the stored value is malformed (absent reads as an empty list). */
function parse(raw: string | null): BookmarkItem[] | null {
  if (raw === null) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    if (o.schemaVersion !== 1 || !Array.isArray(o.items) || !o.items.every(isItem)) return null;
    return (o.items as BookmarkItem[]).map((i) => ({ nodeKey: i.nodeKey, chapterKey: i.chapterKey, createdAt: i.createdAt }));
  } catch {
    return null;
  }
}

function ordered(items: BookmarkItem[]): BookmarkItem[] {
  return items.slice().sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
}

/** Read-only: a malformed value reads as empty and stays untouched until the next toggle recovers it. */
export function readBookmarks(sidecar: Pick<SidecarDb, 'getSetting'>, editionId: string): BookmarkItem[] {
  return ordered(parse(sidecar.getSetting(bookmarksKey(editionId))) ?? []);
}

/** Adds or removes the bookmark on `nodeKey`; returns the new state. */
export async function toggleBookmark(
  sidecar: BookmarkStore,
  editionId: string,
  nodeKey: string,
  chapterKey: string,
): Promise<boolean> {
  const key = bookmarksKey(editionId);
  const raw = sidecar.getSetting(key);
  let items = parse(raw);
  if (items === null) {
    sidecar.setSetting(`${key}.recovered`, raw ?? '');
    items = [];
  }
  const on = !items.some((i) => i.nodeKey === nodeKey);
  const next = on
    ? [...items, { nodeKey, chapterKey, createdAt: new Date().toISOString() }]
    : items.filter((i) => i.nodeKey !== nodeKey);
  sidecar.setSetting(key, JSON.stringify({ schemaVersion: 1, items: ordered(next) }));
  await sidecar.persist();
  return on;
}
