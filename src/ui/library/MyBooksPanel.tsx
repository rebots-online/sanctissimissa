/**
 * MyBooksPanel — Bookstore › My Books (§L.1; DOCS/ARCHITECTURE/
 * L-bookstore-commerce-20261106.md §2.4, §4.3; L-audiobook-20261106.md §4
 * mounting + E20/E21; export Lb `library.html`, concept card from export K).
 * Lists the catalogue works the user can read (free / owned / subscription),
 * with real progress, notes, bookmarks and installed-module sizes. Hosts the
 * LibraryReader in place of its body, so `#edition-drawer`,
 * `#supertonic-tts-dock` and the filter ids each exist once.
 * Unmounted from Lb: nav rail, mobile toggle, Import Text, `.filter-chips`,
 * corpus-index and last-opened specimen lines, footer, specimen flag,
 * Concordance Verification, BibTeX export and the design-specimen notice.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import type { LibraryViewProps } from './viewTypes.ts';
import LibraryReader from './LibraryReader.tsx';
import AudiobookDock from './AudiobookDock.tsx';
import ConceptSurfacing from './ConceptSurfacing.tsx';
import EditionInspector, { CATENA_SYNOPSIS, LIBRARY_WORKS, editionLine, formatMB, isHaydockEdition } from './EditionInspector.tsx';
import { audiobook } from '../../core/audiobook/index.ts';
import { AUDIOBOOK_EDITIONS } from '../../core/audiobook/constants.ts';
import { filterCatalogue } from '../../core/library/catalogue.ts';
import { CATENA_EDITION_ID, chapterLabel } from '../../core/library/moduleKeys.ts';
import { editionChapters } from '../../core/library/editionSections.ts';
import { latestProgress } from '../../core/library/progress.ts';
import { readBookmarks } from '../../core/library/bookmarks.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';
import './mybooks.css';

type Props = LibraryViewProps & { onOpenCatalogue: () => void };

const READABLE = ['free', 'owned', 'subscription'];
const ACCESS_TAG: Record<string, [string, string]> = {
  free: ['tag-free', 'Free Included'],
  owned: ['tag-owned', 'Owned'],
  subscription: ['tag-subscription', 'Subscription Access'],
};
const noSubscribe = () => () => undefined;

function attachRefusal(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const e = error as { refusal?: unknown; message?: unknown };
  return typeof e.refusal === 'string' ? e.refusal : typeof e.message === 'string' ? e.message : null;
}

export default function MyBooksPanel(props: Props) {
  const { db, sidecar, entitlements, installer, editions, onOpenKey, onOpenCatalogue } = props;
  const subscribeEntitlements = useCallback((l: () => void) => entitlements.subscribe(l), [entitlements]);
  useSyncExternalStore(subscribeEntitlements, () => entitlements.version);
  const ab = audiobook();
  const subscribeAudio = useCallback((l: () => void) => (ab ? ab.subscribe(l) : () => undefined), [ab]);
  const abState = useSyncExternalStore(ab ? subscribeAudio : noSubscribe, () => (ab ? ab.getState() : null));

  const [reading, setReading] = useState<string | null>(null);
  const [inspect, setInspect] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('all');
  const [category, setCategory] = useState('all');
  const [manage, setManage] = useState(false);
  const [bytes, setBytes] = useState<Record<string, number | null>>({});
  const [updates, setUpdates] = useState(0);
  const [pkgNonce, setPkgNonce] = useState(0);
  const [updateNonce, setUpdateNonce] = useState(0);
  const [downloading, setDownloading] = useState<Record<string, number>>({});
  const aborts = useRef(new Map<string, AbortController>());

  const readable = LIBRARY_WORKS.filter(
    (w) => w.editionId !== null && READABLE.includes(entitlements.accessFor(w.editionId).state),
  );
  const readableIds = readable.map((w) => w.editionId as string);
  const idsKey = readableIds.join('|');

  // Installed package sizes (Haydock ships in the app and has no package).
  useEffect(() => {
    let live = true;
    const ids = idsKey ? idsKey.split('|').filter((id) => !isHaydockEdition(id)) : [];
    Promise.all(
      ids.map((id) =>
        installer
          .load(id)
          .then((b: Uint8Array | null) => [id, b ? b.byteLength : null] as const)
          .catch(() => [id, null] as const),
      ),
    ).then((pairs) => live && setBytes(Object.fromEntries(pairs)));
    return () => {
      live = false;
    };
  }, [installer, idsKey, pkgNonce]);

  // `Update available`: catalogue revision greater than the attached revision.
  useEffect(() => {
    let live = true;
    installer
      .catalogue()
      .then((entries: { editionId: string; revision: number }[]) => {
        let attached: Record<string, unknown>[] = [];
        try {
          attached = db.sqlRows('SELECT module_id, revision FROM module_attach', []);
        } catch {
          attached = [];
        }
        const rev = new Map(attached.map((r) => [String(r.module_id), Number(r.revision)]));
        const u = entries.filter((e) => rev.has(e.editionId) && e.revision > (rev.get(e.editionId) ?? Infinity)).length;
        if (live) setUpdates(u);
      })
      .catch(() => live && setUpdates(0));
    return () => {
      live = false;
    };
  }, [installer, db, updateNonce, pkgNonce]);

  useEffect(() => {
    const pending = aborts.current;
    return () => pending.forEach((c) => c.abort());
  }, []);

  const attach = async (id: string): Promise<void> => {
    const pkg = await installer.load(id);
    if (!pkg) return;
    try {
      await db.attachModule(id, pkg);
    } catch (error) {
      if (attachRefusal(error) !== 'already-attached') throw error;
    }
  };

  const download = (id: string) => {
    const ctrl = new AbortController();
    aborts.current.set(id, ctrl);
    setDownloading((d) => ({ ...d, [id]: 0 }));
    installer
      .install(id, ctrl.signal, (f: number) => setDownloading((d) => ({ ...d, [id]: f })))
      .then(() => attach(id))
      .catch((error: unknown) => {
        debugEvent('library', 'download.failed', { editionId: id, message: error instanceof Error ? error.message : String(error) }, 'warn');
      })
      .finally(() => {
        aborts.current.delete(id);
        setDownloading((d) => {
          const next = { ...d };
          delete next[id];
          return next;
        });
        setPkgNonce((n) => n + 1);
      });
  };

  const remove = (id: string) => {
    installer
      .remove(id)
      .catch((error: unknown) => debugEvent('library', 'remove.failed', { editionId: id, error }, 'warn'))
      .finally(() => setPkgNonce((n) => n + 1));
  };

  const openEdition = (id: string) => {
    if (isHaydockEdition(id)) {
      onOpenKey('verse:Matt/1/1');
      return;
    }
    if (editionChapters(db, id).length > 0) {
      setReading(id);
      return;
    }
    // Installed but not yet attached in this session: attach lazily on Read.
    attach(id)
      .catch((error: unknown) => debugEvent('library', 'attach.failed', { editionId: id, error }, 'warn'))
      .finally(() => setReading(id));
  };

  const listen = (id: string) => {
    if (!ab) return;
    void (async () => {
      await ab.open(id);
      await ab.play();
      const reduce = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById('supertonic-tts-dock')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    })();
  };

  const closeInspect = useCallback(() => setInspect(null), []);
  // Re-read when returning from the reader, where notes are written.
  const allNotes = useMemo(() => {
    void pkgNonce;
    void reading;
    try {
      return sidecar.list();
    } catch {
      return [];
    }
  }, [sidecar, pkgNonce, reading]);

  if (reading !== null) {
    return (
      <div className="my-books-surface">
        <LibraryReader {...props} editionId={reading} onBack={() => setReading(null)} />
      </div>
    );
  }

  const authors = [...new Set(readable.map((w) => w.author))].sort();
  const categories = [...new Set(readable.map((w) => w.category))].sort();
  const visible = filterCatalogue(readable, {
    query,
    author: author === 'all' ? undefined : author,
    category: category === 'all' ? undefined : category,
  });

  const installedIds = Object.entries(bytes).filter(([, b]) => b !== null);
  const offlineMB = formatMB(installedIds.reduce((sum, [, b]) => sum + (b ?? 0), 0));
  const progress = latestProgress(sidecar, readableIds);
  const progressChapters = progress ? editionChapters(db, progress.editionId) : [];
  const progressIdx = progress ? progressChapters.indexOf(progress.chapterKey) + 1 : 0;
  const progressWork = progress ? readable.find((w) => w.editionId === progress.editionId) : undefined;
  const progressTitle = progress ? editions.get(progress.editionId)?.title ?? progressWork?.title ?? progress.editionId : '';

  return (
    <div className="my-books-surface">
      <div className="main-column">
        <header className="masthead">
          <div className="masthead-left">
            <div>
              <h1 className="page-title">My Library</h1>
              <div className="page-sub">Personal patristic, scriptural, and liturgical theological corpus</div>
            </div>
            <span className="curated-badge" id="library-count-badge">
              {visible.length} Active Works
            </span>
          </div>
          <div className="masthead-right">
            <a href="#" className="button button-primary" onClick={(e) => { e.preventDefault(); onOpenCatalogue(); }}>
              Explore Bookstore &rarr;
            </a>
          </div>
        </header>

        <div className="content-container">
          {progress && (
            <section className="continue-card" aria-label="Continue Reading">
              <div>
                <div className="continue-meta">
                  <span>Currently Reading</span>
                  <span>•</span>
                  <span>{chapterLabel(progress.chapterKey)}</span>
                </div>
                <h2 className="continue-title">{progressTitle}</h2>
                {progressWork && <div className="continue-subtitle">{progressWork.author}</div>}
                <div className="progress-bar-wrap">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progressChapters.length ? (progressIdx / progressChapters.length) * 100 : 0}%` }}
                  />
                </div>
                <div className="progress-labels">
                  <span>{chapterLabel(progress.chapterKey)}</span>
                  {progressChapters.length > 0 && <span>{`${progressIdx} of ${progressChapters.length}`}</span>}
                </div>
              </div>
              <div className="continue-actions">
                <button className="button button-primary" onClick={() => openEdition(progress.editionId)}>Resume Reading &rarr;</button>
              </div>
            </section>
          )}

          {ab && <AudiobookDock controller={ab} />}

          <div id="download-manager" role="region" aria-label="Offline Download Manager">
            <div className="download-stats">
              <span className="stat-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <strong>{installedIds.length} Volumes</strong> ready offline ({offlineMB} MB)
              </span>
              {updates > 0 && <span className="stat-pill update-pill">{updates} Update available</span>}
            </div>
            <div className="download-actions">
              <button className="btn-sm button-secondary" aria-pressed={manage} onClick={() => setManage((m) => !m)}>Manage Storage</button>
              <button className="btn-sm button-secondary" onClick={() => setUpdateNonce((n) => n + 1)}>Check Updates</button>
            </div>
          </div>

          <ConceptSurfacing db={db} sidecar={sidecar} readableIds={readableIds} onOpenKey={onOpenKey} />

          <div className="filter-toolbar">
            <div className="filter-top-row">
              <div className="search-wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  id="library-search"
                  className="search-input"
                  aria-label="Search My Library"
                  placeholder="Search by title, author, Latin incipit, or keyword..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <select className="select-dropdown" id="author-filter" aria-label="Author" value={author} onChange={(e) => setAuthor(e.target.value)}>
                <option value="all">All Authors &amp; Fathers</option>
                {authors.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <select className="select-dropdown" id="category-filter" aria-label="Discipline" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All Disciplines</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div id="library-grid">
            {visible.map((w) => {
              const id = w.editionId as string;
              const state = entitlements.accessFor(id).state;
              const [tagClass, tagText] = ACCESS_TAG[state] ?? ACCESS_TAG.free;
              const haydock = isHaydockEdition(id);
              const size = bytes[id] ?? null;
              const notes = allNotes.filter((a) => a.anchors.some((x) => x.startsWith(`book:${id}#`))).length;
              const marks = readBookmarks(sidecar, id).length;
              const tts = !haydock && (AUDIOBOOK_EDITIONS as readonly string[]).includes(id);
              const mine = abState && abState.editionId === id ? abState : null;
              const pct = downloading[id];
              return (
                <article className="book-card" data-edition-id={id} key={id}>
                  <div className="book-card-header">
                    <div className="book-card-tags">
                      <span className={`access-tag ${tagClass}`}>{tagText}</span>
                      {tts && mine && mine.readyThrough !== null && <span className="tts-badge-offline">⚡ Audio ready offline</span>}
                      {tts && mine && mine.storedCount < mine.sentenceCount && <span className="tts-badge-sync">☁ Preparing audio…</span>}
                    </div>
                    <h3 className="book-title">{w.title}</h3>
                    <div className="book-author">{w.author}</div>
                  </div>
                  <div className="book-card-body">
                    <div className="book-meta-row">
                      <span>English</span>
                      <span>{editionLine(id, editions.get(id))}</span>
                    </div>
                    {id === CATENA_EDITION_ID && <p className="book-description">{CATENA_SYNOPSIS}</p>}
                    {(notes > 0 || marks > 0) && (
                      <div className="book-badges-row">
                        {notes > 0 && <span className="annot-count-badge">📝 {notes} Notes</span>}
                        {marks > 0 && <span className="annot-count-badge">🔖 {marks} Bookmarks</span>}
                      </div>
                    )}
                  </div>
                  <div className="book-card-footer">
                    <div className="storage-status">
                      <span className={`status-dot${!haydock && size === null ? ' cloud' : ''}`} />
                      <span>{haydock ? 'Included in the app' : size !== null ? `Downloaded (${formatMB(size)} MB)` : 'Not downloaded'}</span>
                    </div>
                    <div className="card-actions">
                      {tts && ab && (
                        <button className="btn-sm button-secondary" onClick={() => listen(id)}>{mine?.playing ? '🎧 Playing (TTS)' : '🎧 Listen (TTS)'}</button>
                      )}
                      <button className="btn-sm button-secondary" onClick={() => setInspect(id)}>Inspect</button>
                      {manage && !haydock && size !== null && (
                        <button className="btn-sm button-secondary" onClick={() => remove(id)}>Remove download</button>
                      )}
                      {haydock || state === 'free' || size !== null ? (
                        <button className="btn-sm button-primary" onClick={() => openEdition(id)}>Open</button>
                      ) : (
                        <button className="btn-sm button-secondary" disabled={pct !== undefined} onClick={() => download(id)}>{pct !== undefined ? `Downloading… ${Math.round(pct * 100)}%` : 'Download'}</button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {inspect !== null && (
        <EditionInspector
          edition={editions.get(inspect)}
          editionId={inspect}
          installedBytes={bytes[inspect] ?? null}
          onClose={closeInspect}
        />
      )}
    </div>
  );
}
