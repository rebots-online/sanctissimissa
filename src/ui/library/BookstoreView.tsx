/**
 * Bookstore view (BA.5; L-bookstore-commerce-20261106.md §4.2, §4.4, §2.4).
 *
 * Frozen binding: LIBS/UI/STITCH/sanctissimissa-library-20260913/bookstore.html
 * (= export B, ids preserved). Every specimen value is replaced by real data or
 * not mounted: no #app-rail, journey strip, .public-domain-banner (§5
 * supersession 2) or #design-specimen-notice. Prices are only ever the store's
 * localized strings (DOCS/sdk/revenuecat-purchases-js; offers via BA.3).
 *
 * Masthead tabs Catalogue / My Books persist in sidecar `bookstore.tab`; only the
 * active panel is mounted (B and the library export share #author-filter and
 * #category-filter). My Books and the reader are BA.6 components loaded through
 * import.meta.glob + React.lazy, so their absence renders an empty slot.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ComponentType, type LazyExoticComponent } from 'react';
import seed from '../../../content/library/catalogue.seed.json';
import { filterCatalogue, validateCatalogue } from '../../core/library/catalogue.ts';
import type { CatalogueWork } from '../../core/library/types.ts';
import { SELLABLE_EDITION_IDS, SETTING_BOOKSTORE_TAB } from '../../core/entitlements/ids.ts';
import type { AccessKind, AccessState, PurchaseOffer } from '../../core/entitlements/types.ts';
import { badgeFor, coverClass, fold, matchesStateFilter, type StateFilter } from './bookstoreState.ts';
import { editionCopy } from './editionCopy.ts';
import BookDetailDrawer from './BookDetailDrawer.tsx';
import type { LibraryViewProps } from './viewTypes.ts';
import './library.css';
import './library-drawer.css';

type MyBooksProps = LibraryViewProps & { onOpenCatalogue: () => void };
type ReaderProps = LibraryViewProps & { editionId: string; onBack: () => void };
type Tab = 'catalogue' | 'my-books';

/** Lazy component from a (possibly empty) import.meta.glob — null when the sibling file is absent. */
function lazyFromGlob<P extends object>(loaders: Record<string, () => Promise<Record<string, unknown>>>, name: string): LazyExoticComponent<ComponentType<P>> | null {
  const load = Object.values(loaders)[0];
  if (!load) return null;
  return lazy(async () => {
    const mod = await load();
    return { default: (mod.default ?? mod[name]) as ComponentType<P> };
  });
}

const MyBooksPanel = lazyFromGlob<MyBooksProps>(import.meta.glob<Record<string, unknown>>('./MyBooksPanel.tsx'), 'MyBooksPanel');
const LibraryReader = lazyFromGlob<ReaderProps>(import.meta.glob<Record<string, unknown>>('./LibraryReader.tsx'), 'LibraryReader');

const STAR = 'M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z';
const ORNAMENT = 'M50 0 L55 35 L90 10 L65 45 L100 50 L65 55 L90 90 L55 65 L50 100 L45 65 L10 90 L35 55 L0 50 L35 45 L10 10 L45 35 Z';

export default function BookstoreView(props: LibraryViewProps) {
  const { sidecar, entitlements, installer, editions } = props;
  const [tab, setTabState] = useState<Tab>(() => (sidecar.getSetting(SETTING_BOOKSTORE_TAB) === 'my-books' ? 'my-books' : 'catalogue'));
  const [readingEditionId, setReadingEditionId] = useState<string | null>(null);
  const selectTab = useCallback((next: Tab) => {
    setTabState(next);
    sidecar.setSetting(SETTING_BOOKSTORE_TAB, next);
    void sidecar.persist();
  }, [sidecar]);

  const subscribe = useCallback((listener: () => void) => entitlements.subscribe(listener), [entitlements]);
  const version: unknown = useSyncExternalStore(subscribe, () => entitlements.version);

  const works = useMemo(() => validateCatalogue(seed).works, []);
  const authors = useMemo(() => [...new Set(works.map((w) => w.author))].sort((a, b) => (fold(a) < fold(b) ? -1 : fold(a) > fold(b) ? 1 : 0)), [works]);
  const categories = useMemo(() => [...new Set(works.map((w) => w.category))], [works]);

  const [installed, setInstalled] = useState<ReadonlySet<string>>(() => new Set());
  const refreshInstalled = useCallback(async () => {
    const next = new Set<string>();
    for (const id of SELLABLE_EDITION_IDS as readonly string[]) {
      try {
        if (await installer.load(id)) next.add(id);
      } catch {
        /* an unreadable package store reads as not installed */
      }
    }
    setInstalled(next);
  }, [installer]);
  useEffect(() => { void refreshInstalled(); }, [refreshInstalled]);

  const accessOf = useMemo(() => {
    void version;
    const cache = new Map<string, AccessKind>();
    return (work: CatalogueWork): AccessKind => {
      if (work.editionId === null) return 'unavailable';
      let s = cache.get(work.editionId);
      if (!s) {
        s = (entitlements.accessFor(work.editionId) as AccessState).state;
        cache.set(work.editionId, s);
      }
      return s;
    };
  }, [entitlements, version]);
  const offersOf = (editionId: string | null): PurchaseOffer[] | null =>
    editionId ? (entitlements.offersFor(editionId) as PurchaseOffer[] | null) : null;

  const [query, setQuery] = useState('');
  const [author, setAuthor] = useState('all');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');
  const [offline, setOffline] = useState(false);
  const [category, setCategory] = useState('all');
  const filterActive = query.length > 0 || author !== 'all' || stateFilter !== 'all' || offline || category !== 'all';
  const resetFilters = () => { setQuery(''); setAuthor('all'); setStateFilter('all'); setOffline(false); setCategory('all'); };

  const shown = filterCatalogue(works, {
    query,
    author: author === 'all' ? undefined : author,
    category: category === 'all' ? undefined : category,
  }).filter((w) => {
    const s = accessOf(w);
    if (!matchesStateFilter(s, stateFilter)) return false;
    return !offline || s === 'free' || (w.editionId !== null && installed.has(w.editionId));
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const selected = selectedId ? works.find((w) => w.id === selectedId) ?? null : null;
  const openDrawer = (work: CatalogueWork, origin: HTMLElement) => { originRef.current = origin; setSelectedId(work.id); };
  const closeDrawer = () => {
    setSelectedId(null);
    const origin = originRef.current;
    if (origin) requestAnimationFrame(() => origin.focus());
  };

  if (readingEditionId) {
    return (
      <div className="content library-surface">
        {LibraryReader && (
          <Suspense fallback={null}>
            <LibraryReader {...props} editionId={readingEditionId} onBack={() => setReadingEditionId(null)} />
          </Suspense>
        )}
      </div>
    );
  }

  return (
    <div className="content library-surface">
      <div className="content-container">
        <div className="bookstore-tabs" role="tablist" aria-label="Bookstore">
          <button type="button" role="tab" id="tab-catalogue" aria-selected={tab === 'catalogue'} onClick={() => selectTab('catalogue')}>Catalogue</button>
          <button type="button" role="tab" id="tab-my-books" aria-selected={tab === 'my-books'} onClick={() => selectTab('my-books')}>My Books</button>
        </div>

        {tab === 'my-books' && MyBooksPanel && (
          <Suspense fallback={null}>
            <MyBooksPanel {...props} onOpenCatalogue={() => selectTab('catalogue')} />
          </Suspense>
        )}

        {tab === 'catalogue' && (
          <div role="tabpanel" aria-labelledby="tab-catalogue">
            <header className="editorial-masthead">
              <div className="masthead-context">
                <span className="kicker">
                  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={STAR} /></svg>
                  Curated Ecclesial Studies
                </span>
                <span className="section-rule"></span>
                <span className="library-scope-chip">{`${works.length} Curated Volumes`}</span>
              </div>
              <h1 className="masthead-title">A Catholic library, ready for study.</h1>
              <p className="masthead-lead">
                Explore authoritative theological, patristic, and devotional texts digitally illuminated for daily missal integration. Cross-reference scriptures directly into Latin Mass propers and the Divine Office.
              </p>
            </header>

            <section className="filter-toolbar">
              <div className="toolbar-upper">
                <div className="search-input-wrapper">
                  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input type="text" id="catalogue-search" aria-label="Search the catalogue" placeholder="Search by title, author, scripture reference, or latin term..." value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
                <div className="select-filter-group">
                  <select id="author-filter" className="filter-select" aria-label="Author" value={author} onChange={(e) => setAuthor(e.target.value)}>
                    <option value="all">All Authors & Editors</option>
                    {authors.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select id="state-filter" className="filter-select" aria-label="Edition state" value={stateFilter} onChange={(e) => setStateFilter(e.target.value as StateFilter)}>
                    <option value="all">All Editions & States</option>
                    <option value="free">FREE INCLUDED</option>
                    <option value="owned">OWNED</option>
                    <option value="review">EDITION REVIEW</option>
                  </select>
                  <label className="filter-toggle-pill">
                    <input type="checkbox" id="offline-toggle" checked={offline} onChange={(e) => setOffline(e.target.checked)} />
                    <span>Offline available</span>
                  </label>
                </div>
              </div>
              <div className="chip-row-wrapper" id="category-filter">
                <span className="chip-label">Categories:</span>
                <button type="button" className={`filter-chip${category === 'all' ? ' active' : ''}`} data-category="all" onClick={() => setCategory('all')}>All Disciplines</button>
                {categories.map((c) => (
                  <button key={c} type="button" className={`filter-chip${category === c ? ' active' : ''}`} data-category={c} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
            </section>

            <div className="catalogue-results-meta">
              <span id="results-count-text">{`Showing ${shown.length} of ${works.length} curated works`}</span>
              {filterActive && (
                <button type="button" id="reset-filters" className="reset-filters-btn" style={{ display: 'block' }} onClick={resetFilters}>Clear search & filters</button>
              )}
            </div>

            {shown.length > 0 && (
              <section id="catalogue-grid">
                {shown.map((work) => {
                  const state = accessOf(work);
                  const badge = badgeFor(state);
                  const edition = work.editionId ? editions.get(work.editionId) : null;
                  const copy = editionCopy(work.editionId);
                  const year: number | null = edition?.rights?.[0]?.publicationYear ?? null;
                  const offlineReady = state === 'free' || (work.editionId !== null && installed.has(work.editionId));
                  const offers = state === 'locked' ? offersOf(work.editionId) : null;
                  const lifetime = offers?.find((o: PurchaseOffer) => o.kind === 'lifetime') ?? null;
                  return (
                    <article key={work.id} className="book-card" data-id={work.id}>
                      <div className={`book-cover ${coverClass(work)}`}>
                        <svg className="cover-ornament" viewBox="0 0 100 100" fill="currentColor" aria-hidden="true"><path d={ORNAMENT} /></svg>
                        <div className="cover-top-row">
                          <span className="cover-category-tag">{work.category}</span>
                          <span className={`state-badge ${badge.className}`}>{badge.text}</span>
                        </div>
                        <div className="cover-title-block">
                          <h3 className="cover-book-title">{work.title}</h3>
                          <div className="cover-book-author">{work.author}</div>
                        </div>
                      </div>
                      <div className="book-body">
                        {(year !== null || offlineReady) && (
                          <div className="book-metadata-row">
                            {year !== null && (
                              <span className="meta-tag">
                                <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 14 14" /></svg>
                                {year}
                              </span>
                            )}
                            {year !== null && offlineReady && <span>·</span>}
                            {offlineReady && (
                              <span className="meta-tag">
                                <svg style={{ width: 13, height: 13, color: '#2f6844' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Offline ready
                              </span>
                            )}
                          </div>
                        )}
                        {copy && <p className="book-synopsis">{copy.synopsis}</p>}
                        {copy && (
                          <div className="integration-bullet">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                            <span>{copy.integrationBullet}</span>
                          </div>
                        )}
                        <div className="card-footer">
                          {lifetime && (
                            <div className="price-block">
                              <span className="price-label">Own it</span>
                              <span className="price-val">{lifetime.priceText}</span>
                            </div>
                          )}
                          <button type="button" className="btn-inspect" onClick={(e) => openDrawer(work, e.currentTarget)}>
                            <span>Inspect Volume</span>
                            <svg style={{ width: 13, height: 13 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            )}

            {shown.length === 0 && (
              <div id="empty-state" className="empty-state-container" style={{ display: 'block' }}>
                <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
                <div className="empty-title">No matching ecclesial texts located</div>
                <div className="empty-desc">We could not find any titles matching your query and category filter. Try clearing filters or searching for author names like Aquinas or Liguori.</div>
                <button type="button" className="btn-inspect" onClick={resetFilters}>Reset All Filters</button>
              </div>
            )}
          </div>
        )}
      </div>

      {tab === 'catalogue' && selected && (
        <BookDetailDrawer
          {...props}
          key={selected.id}
          work={selected}
          state={accessOf(selected)}
          offers={offersOf(selected.editionId)}
          onClose={closeDrawer}
          onInstalled={() => void refreshInstalled()}
          onRead={(editionId) => { setSelectedId(null); setReadingEditionId(editionId); }}
        />
      )}
    </div>
  );
}
