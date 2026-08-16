/**
 * BibleView — "Sacred Scripture": the vendored Vulgate + Douay-Rheims as a
 * first-class reading surface (§7.6, CHECKLIST BB.2). Book grid → chapter
 * grid → bilingual chapter reader. Selection offers the same exegesis menu
 * as the missal reader (Catholic meaning · similar · cross-refs · annotate);
 * the CITES graph drives the "appears in the liturgy" panel, whose entries
 * open the citing section on its own source day via onOpenKey.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SectionText } from '../core/data/types.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { verseHash } from '../core/share/shareLink.ts';
import SectionReader, { type ReaderSection, type SelectionAction } from './SectionReader.tsx';
import ScriptureAtlas, { type AtlasMode } from './ScriptureAtlas.tsx';
import ScriptureMap from './ScriptureMap.tsx';

interface Props {
  db: CorpusDb;
  /** Deep-link focus: "Gen/1" or "Gen/1/5". */
  focusRef: string | null;
  focusNonce: number;
  onAction: (a: SelectionAction) => void;
  sidecar?: SidecarDb | null;
  onCapture?: (capture: { quote: string; quoteAlt?: string; anchor: string | null }) => void;
  /** Open a citing liturgical section on its source day (App.onOpenKey). */
  onOpenKey: (nodeKey: string) => void;
}

export default function BibleView({ db, focusRef, focusNonce, onAction, sidecar, onCapture, onOpenKey }: Props) {
  const books = useMemo(() => db.getBooks(), [db]);
  const [book, setBook] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [focusVerse, setFocusVerse] = useState<number | null>(null);
  const [liturgyOpen, setLiturgyOpen] = useState(false);
  const [atlasMode, setAtlasMode] = useState<AtlasMode>('canonical');
  const rootRef = useRef<HTMLDivElement>(null);

  // Deep-link navigation ("Gen/1" or "Gen/1/5").
  useEffect(() => {
    if (!focusRef) return;
    const m = focusRef.match(/^([A-Za-z0-9]+)\/(\d+)(?:\/(\d+))?$/);
    if (!m) return;
    setBook(m[1]);
    setChapter(Number(m[2]));
    setFocusVerse(m[3] ? Number(m[3]) : null);
  }, [focusRef, focusNonce]);

  const bookMeta = useMemo(() => books.find((b) => b.key === book) ?? null, [books, book]);
  const verses: SectionText[] = useMemo(
    () => (book && chapter ? db.getChapter(book, chapter) : []),
    [db, book, chapter],
  );
  const commentary = useMemo(
    () => (book && chapter ? db.commentaryFor(book, chapter) : []),
    [db, book, chapter],
  );
  const citing = useMemo(() => {
    if (!book || !chapter) return [];
    // Group CITES rows by citing section; keep verse coverage + best quality.
    const bySection = new Map<string, { title: string | null; sourcePath: string; verses: Set<string>; exact: boolean }>();
    for (const c of db.liturgyCitingChapter(book, chapter)) {
      const g = bySection.get(c.sectionKey) ?? {
        title: c.sectionTitle,
        sourcePath: c.sourcePath,
        verses: new Set<string>(),
        exact: false,
      };
      g.verses.add(c.verseKey.split('/').pop() ?? '');
      if (c.quality === 'exact') g.exact = true;
      bySection.set(c.sectionKey, g);
    }
    return [...bySection.entries()].map(([key, g]) => ({ key, ...g }));
  }, [db, book, chapter]);

  // Scroll a deep-linked verse into view once the chapter renders.
  useEffect(() => {
    if (!focusVerse || !rootRef.current) return;
    const root = rootRef.current;
    // Verses render as the chapter block's parallel lines; verse n is line n-1.
    const el = root.querySelector(`span[data-line="${focusVerse - 1}"]`);
    if (el) {
      const top = (el as HTMLElement).getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 8;
      root.scrollTo({ top, behavior: 'smooth' });
    }
  }, [focusVerse, verses]);

  // ── Book grid ────────────────────────────────────────────────────
  if (!book) {
    const isCanonical = atlasMode === 'canonical';
    const isImagery = atlasMode === 'imagery';
    const isParallels = atlasMode === 'parallels';
    
    if (!isCanonical) {
      const mode: AtlasMode = isImagery ? 'imagery' : 'parallels';
      return (
        <div className="content reader">
          <div className="atlas-mode-switch">
            <button className={isCanonical ? 'active' : ''} onClick={() => setAtlasMode('canonical')}>Canonical 📖</button>
            <button className={isImagery ? 'active' : ''} onClick={() => setAtlasMode('imagery')}>Imagery ✦</button>
            <button className={isParallels ? 'active' : ''} onClick={() => setAtlasMode('parallels')}>Parallels ⑃</button>
          </div>
          <ScriptureAtlas db={db} mode={mode} onOpenKey={onOpenKey} />
        </div>
      );
    }
    return (
      <div className="content reader">
        <div className="atlas-mode-switch">
          <button className={isCanonical ? 'active' : ''} onClick={() => setAtlasMode('canonical')}>Canonical 📖</button>
          <button className={isImagery ? 'active' : ''} onClick={() => setAtlasMode('imagery')}>Imagery ✦</button>
          <button className={isParallels ? 'active' : ''} onClick={() => setAtlasMode('parallels')}>Parallels ⑃</button>
        </div>
        {(['OT', 'NT'] as const).map((t) => (
          <section className="reader-section" key={t}>
            <div className="head">
              <h3>{t === 'OT' ? 'Vetus Testamentum' : 'Novum Testamentum'}</h3>
            </div>
            <div className="bible-book-grid">
              {books.filter((b) => b.testament === t).map((b) => (
                <button
                  key={b.key}
                  className="bible-book"
                  onClick={() => { setBook(b.key); setChapter(null); setFocusVerse(null); }}
                  title={b.hasLatin ? `${b.title} — ${b.chapters} capitula` : `${b.title} — English only (Latin source pending)`}
                >
                  {b.title}
                  {!b.hasLatin && <span className="bible-en-only"> EN</span>}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  // ── Chapter stack (ScriptureMap, decision 23) ────────────────────
  // The book's chapters as one continuous alternating-shade reading surface;
  // per-chapter verse dropdowns jump within it. Deep links still open the
  // single-chapter reader below (focusRef sets `chapter`).
  if (!chapter) {
    return (
      <ScriptureMap
        db={db}
        book={book}
        psalms={book === 'Psa'}
        sidecar={sidecar}
        onAction={onAction}
        onCapture={onCapture}
        toolbar={
          <div className="export-bar">
            <button className="bible-back" onClick={() => setBook(null)}>‹ Libri</button>
            <span className="export-sep" />
            <span className="export-label">{bookMeta?.title}</span>
          </div>
        }
      />
    );
  }

  // ── Chapter reader ───────────────────────────────────────────────
  // The chapter renders as ONE section whose Latin and English are the verses
  // joined line-parallel — so verse n is line n-1 and every alignment the
  // shared reader performs (line echo, phrase echo, word flyout) works on
  // scripture exactly as it does on the Mass. Annotations written against
  // individual verses keep rendering via `quoteKeys`.
  const chapterKey = `bible:${book}/${chapter}`;
  /** `{chapter}:{verse} ` prefixes → `renderLine` superscripts the verse and
   *  the chapter number appears once, in the title (B3 remainder, §11.2). */
  const vno = (v: SectionText) => v.nodeKey.split('/').pop() ?? '';
  const sections: ReaderSection[] = [
    {
      anchor: chapterKey,
      nodeKey: chapterKey,
      quoteKeys: verses.map((v) => v.nodeKey),
      title: `${bookMeta?.title ?? book} ${chapter}`,
      // Parity-shaded chapter container (decision 23): navigating chapter →
      // chapter alternates the shade.
      sectionClass: chapter % 2 ? 'chapter-lite' : 'chapter-shade',
      latin: verses.map((v) => `${chapter}:${vno(v)} ${v.latin ?? ''}`.trimEnd()).join('\n') || null,
      english: verses.map((v) => `${chapter}:${vno(v)} ${v.english ?? ''}`.trimEnd()).join('\n') || null,
      meta: (
        <span className="src">
          Vulgata Clementina · Douay-Rheims{bookMeta?.hasLatin ? '' : ' (English only)'}
        </span>
      ),
      beforeText: citing.length > 0 ? (
        <div className="bible-liturgy">
          <button className="bible-liturgy-toggle" onClick={() => setLiturgyOpen((o) => !o)}>
            {liturgyOpen ? '▾' : '▸'} In liturgia — cited by {citing.length} liturgical section{citing.length === 1 ? '' : 's'}
          </button>
          {liturgyOpen && (
            <ul>
              {citing.slice(0, 40).map((c) => (
                <li key={c.key}>
                  <button onClick={() => onOpenKey(c.key)} title={`Open on its source day (${c.sourcePath})`}>
                    {c.title ?? c.key.replace(/^section:/, '')}
                  </button>
                  <span className="bible-cite-meta">
                    {c.sourcePath} · vv. {[...c.verses].join(', ')}{c.exact ? ' · verbatim' : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : undefined,
      afterText: commentary.length > 0 ? (
        <div className="atlas-commentary">
          <div className="group-title">Commentary</div>
          {commentary.map((cm) => {
            const src = cm.sourcePath.replace(/^Commentary\//, '');
            const vv = cm.nodeKey.match(/\/(\d+)$/)?.[1];
            return (
              <div className="atlas-comm" key={cm.nodeKey}>
                <div className="jsc-evidence">
                  <span className="chip">{src}</span>
                  {vv && <span className="chip">{book} {chapter}:{vv}</span>}
                </div>
                <div>{cm.english}</div>
              </div>
            );
          })}
        </div>
      ) : undefined,
    },
  ];

  return (
    <SectionReader
      db={db}
      sections={sections}
      sidecar={sidecar}
      onAction={onAction}
      onCapture={onCapture}
      rootRef={rootRef}
      collapsible={false}
      toolbar={
        <div className="export-bar">
          <button className="bible-back" onClick={() => { setChapter(null); setFocusVerse(null); }}>
            ‹ {bookMeta?.title}
          </button>
          <span className="export-sep" />
          <button disabled={chapter <= 1} onClick={() => { setChapter(chapter - 1); setFocusVerse(null); }}>‹ Prev</button>
          <button
            disabled={chapter >= (bookMeta?.chapters ?? 1)}
            onClick={() => { setChapter(chapter + 1); setFocusVerse(null); }}
          >
            Next ›
          </button>
        </div>
      }
      menuExtras={({ line, close }) => (
        <button
          onClick={() => {
            const hash = line === null ? verseHash(book, chapter) : verseHash(book, chapter, line + 1);
            navigator.clipboard?.writeText(`${location.origin}${location.pathname}${hash}`);
            close();
          }}
        >
          ⛓ Copy verse link
        </button>
      )}
    />
  );
}
