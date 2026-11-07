/**
 * LibraryReader — the purchased-edition reader (§L.1/§L.5; DOCS/ARCHITECTURE/
 * L-bookstore-ui-20261106.md §1–§4; export `reader.html`, Stitch `0918fcd8`).
 * `#book-reader-host` mounts the existing SectionReader over
 * `editionSections(...)`, so highlights, margin notes and the selection menu
 * are SectionReader's own. Not mounted: the nav rail, specimen notice and
 * sheet content, recording panel, sample comments, “Related Mass References”
 * and the Highlight / Comment / Audio Memo tool buttons.
 * The AudiobookDock mounts above the host (L-audiobook-20261106.md §4).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LibraryViewProps } from './viewTypes.ts';
import SectionReader from '../SectionReader.tsx';
import AudiobookDock from './AudiobookDock.tsx';
import EditionInspector, { LIBRARY_WORKS } from './EditionInspector.tsx';
import ReaderNotebook from './ReaderNotebook.tsx';
import { audiobook } from '../../core/audiobook/index.ts';
import { editionChapters, editionSections } from '../../core/library/editionSections.ts';
import { BOOK_ORDER, DEFAULT_CHAPTER, EVANGELIST, parseChapterKey, type Book } from '../../core/library/moduleKeys.ts';
import { readBookmarks, toggleBookmark } from '../../core/library/bookmarks.ts';
import { readProgress, writeProgress } from '../../core/library/progress.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';
import './reader.css';

type Props = LibraryViewProps & { editionId: string; onBack: () => void };

export default function LibraryReader(props: Props) {
  const { db, sidecar, editions, installer, editionId, onBack, onOpenKey } = props;
  const chapters = useMemo(() => editionChapters(db, editionId), [db, editionId]);
  const [chapterKey, setChapterKey] = useState<string>(() => {
    const stored = readProgress(sidecar, editionId)?.chapterKey ?? DEFAULT_CHAPTER;
    return chapters.includes(stored) ? stored : chapters[0] ?? stored;
  });
  const [currentNodeKey, setCurrentNodeKey] = useState<string | null>(null);
  const [bookmarkVersion, setBookmarkVersion] = useState(0);
  const [inspecting, setInspecting] = useState(false);
  const [installedBytes, setInstalledBytes] = useState<number | null>(null);
  const hostRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const edition = editions.get(editionId);
  const title = edition?.title ?? LIBRARY_WORKS.find((w) => w.editionId === editionId)?.title ?? editionId;
  const parsed = parseChapterKey(chapterKey);
  const ab = audiobook();

  const openChapter = useCallback(
    (ck: string) => {
      setChapterKey(ck);
      setCurrentNodeKey(null);
      if (hostRef.current) hostRef.current.scrollTop = 0;
      writeProgress(sidecar, editionId, ck);
    },
    [sidecar, editionId],
  );

  // The opened chapter is the reading position (commerce §2.4: written on chapter open).
  useEffect(() => {
    if (chapters.includes(chapterKey)) writeProgress(sidecar, editionId, chapterKey);
    // Mount only: later chapter changes write through openChapter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let live = true;
    installer
      .load(editionId)
      .then((bytes: Uint8Array | null) => live && setInstalledBytes(bytes ? bytes.byteLength : null))
      .catch(() => live && setInstalledBytes(null));
    return () => {
      live = false;
    };
  }, [installer, editionId]);

  const sections = useMemo(() => editionSections(db, editionId, chapterKey), [db, editionId, chapterKey]);

  // Current block: the topmost `section[data-nodekey]` intersecting the host's viewport.
  useEffect(() => {
    const host = hostRef.current;
    const root = rootRef.current;
    if (!host || !root || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<Element>();
    const pick = () => {
      const all = Array.from(root.querySelectorAll<HTMLElement>('section[data-nodekey]'));
      const top = all.find((el) => visible.has(el)) ?? null;
      setCurrentNodeKey(top?.dataset.nodekey ?? all[0]?.dataset.nodekey ?? null);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.add(e.target);
          else visible.delete(e.target);
        }
        pick();
      },
      { root: host },
    );
    root.querySelectorAll('section[data-nodekey]').forEach((el) => io.observe(el));
    pick();
    return () => io.disconnect();
  }, [sections]);

  void bookmarkVersion;
  const bookmarked = currentNodeKey !== null && readBookmarks(sidecar, editionId).some((b) => b.nodeKey === currentNodeKey);

  const onBookmark = () => {
    if (!currentNodeKey) return;
    toggleBookmark(sidecar, editionId, currentNodeKey, chapterKey)
      .then(() => setBookmarkVersion((v) => v + 1))
      .catch((error: unknown) => {
        debugEvent('library', 'bookmark.failed', { editionId, error }, 'warn');
        setBookmarkVersion((v) => v + 1);
      });
  };

  const reader = useMemo(
    () => <SectionReader db={db} sections={sections} sidecar={sidecar} rootRef={rootRef} />,
    // Memoized on the open edition and chapter (sections derive from them).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editionId, chapterKey, sections],
  );

  const grouped = BOOK_ORDER.map((book) => ({
    book,
    keys: chapters.filter((ck) => parseChapterKey(ck)?.book === book),
  })).filter((g) => g.keys.length > 0);
  const closeInspector = useCallback(() => setInspecting(false), []);

  return (
    <div className="library-reader">
      <header className="reader-header">
        <div className="reader-header-left">
          <a
            href="#"
            className="back-library-btn"
            onClick={(e) => {
              e.preventDefault();
              onBack();
            }}
          >
            &larr; My Books
          </a>
          <div className="work-breadcrumbs">
            <strong>{title}</strong>
            {parsed && (
              <>
                {' '}
                <span>/</span> {EVANGELIST[parsed.book]} <span>/</span> Chapter {parsed.chapter}
              </>
            )}
          </div>
        </div>
        <div id="reader-tools">
          <button
            className={`tool-btn${bookmarked ? ' active' : ''}`}
            title="Bookmark passage"
            aria-pressed={bookmarked}
            disabled={!currentNodeKey}
            onClick={onBookmark}
          >
            🔖 <span>Bookmark</span>
          </button>
          <button className="tool-btn" title="Inspect source text authority" onClick={() => setInspecting(true)}>
            📜 <span>Source</span>
          </button>
        </div>
      </header>

      <div className="reader-stage">
        <aside id="book-toc" aria-label="Book Table of Contents">
          <div className="toc-title">Table of Contents</div>
          {grouped.map((g) => (
            <div key={g.book}>
              <div className="toc-book-heading">St. {EVANGELIST[g.book as Book]}</div>
              <ul className="toc-tree">
                {g.keys.map((ck) => (
                  <li key={ck}>
                    <button
                      className={`toc-item${ck === chapterKey ? ' active' : ''}`}
                      aria-current={ck === chapterKey ? 'true' : undefined}
                      onClick={() => openChapter(ck)}
                    >
                      <span>Chapter {parseChapterKey(ck)?.chapter}</span>
                      {ck === chapterKey && <span aria-hidden="true">•</span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </aside>

        <div className="reader-center">
          {ab && <AudiobookDock controller={ab} />}
          <main id="book-reader-host" ref={hostRef}>
            {chapters.length === 0 ? (
              <div className="reader-absent">
                <p>This edition is not downloaded on this device.</p>
                <button className="back-library-btn" onClick={onBack}>
                  &larr; My Books
                </button>
              </div>
            ) : (
              <article className="reader-page-sheet">{reader}</article>
            )}
          </main>
        </div>

        <ReaderNotebook
          db={db}
          editionId={editionId}
          chapterKey={chapterKey}
          currentNodeKey={currentNodeKey}
          sections={sections}
          sidecar={sidecar}
          onOpenKey={onOpenKey}
        />
      </div>

      {inspecting && (
        <EditionInspector
          edition={edition}
          editionId={editionId}
          installedBytes={installedBytes}
          onClose={closeInspector}
        />
      )}
    </div>
  );
}
