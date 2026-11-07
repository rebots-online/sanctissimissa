/**
 * `#notebook-panel` — the reader's Study & Citation / Notes panel (§L.5;
 * DOCS/ARCHITECTURE/L-bookstore-ui-20261106.md §1 `#notebook-panel` rows, §2
 * `ReaderTab`; export `reader.html` notebook column). The Notes tab lists the
 * existing annotations (`annotationsFor`) of the open chapter's blocks — the
 * same store SectionReader writes — so there is no second annotation path.
 * The specimen “Related Mass References”, recording panel and sample comments
 * are not mounted.
 */

import { useEffect, useState } from 'react';
import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { SidecarDb } from '../../core/accompaniment/store.ts';
import type { ReaderSection } from '../SectionReader.tsx';
import { annotationsFor, type Annotation } from '../../core/annotations/store.ts';
import { sanitizeHtml } from '../../core/ui/sanitizeHtml.ts';
import { blockVerse } from '../../core/library/editionSections.ts';
import { EVANGELIST, isBook } from '../../core/library/moduleKeys.ts';

/** Closed set, Phase L. Persisted in sidecar `library.readerTab`. */
export type ReaderTab = 'study' | 'notes';
const READER_TAB_KEY = 'library.readerTab';

function readTab(sidecar: SidecarDb): ReaderTab {
  return sidecar.getSetting(READER_TAB_KEY) === 'notes' ? 'notes' : 'study';
}

/** `verse:Matt/5/3` → `St. Matthew 5:3`. */
function verseLabel(verseKey: string): string | null {
  const m = /^verse:([A-Za-z0-9]+)\/(\d+)\/(\d+)$/.exec(verseKey);
  if (!m) return null;
  return `St. ${isBook(m[1]) ? EVANGELIST[m[1]] : m[1]} ${m[2]}:${m[3]}`;
}

function clip(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

interface Props {
  db: CorpusDb;
  editionId: string;
  chapterKey: string;
  currentNodeKey: string | null;
  sections: ReaderSection[];
  sidecar: SidecarDb;
  onOpenKey: (nodeKey: string) => void;
}

export default function ReaderNotebook({ db, editionId, chapterKey, currentNodeKey, sections, sidecar, onOpenKey }: Props) {
  const [tab, setTab] = useState<ReaderTab>(() => readTab(sidecar));
  const [notesVersion, setNotesVersion] = useState(0);

  // Re-read after any selection/menu interaction inside the reader host.
  useEffect(() => {
    const bump = (e: Event) => {
      const host = document.getElementById('book-reader-host');
      if (host && e.target instanceof Node && host.contains(e.target)) setNotesVersion((v) => v + 1);
    };
    document.addEventListener('pointerup', bump);
    document.addEventListener('keyup', bump);
    return () => {
      document.removeEventListener('pointerup', bump);
      document.removeEventListener('keyup', bump);
    };
  }, []);

  const choose = (next: ReaderTab) => {
    setTab(next);
    setNotesVersion((v) => v + 1);
    sidecar.setSetting(READER_TAB_KEY, next);
    void sidecar.persist().catch(() => undefined);
  };

  void notesVersion;
  void editionId;
  void chapterKey;
  const notes: { section: ReaderSection; ann: Annotation }[] = sections.flatMap((section) =>
    annotationsFor(section.nodeKey).map((ann) => ({ section, ann })),
  );

  const verseKey = currentNodeKey ? blockVerse(db, currentNodeKey) : null;
  const heading = verseKey ? verseLabel(verseKey) : null;

  return (
    <aside id="notebook-panel" aria-label="Study Notebook and Annotations">
      <div className="panel-tabs" role="tablist">
        <button
          className={`panel-tab${tab === 'study' ? ' active' : ''}`}
          id="tab-study"
          role="tab"
          aria-selected={tab === 'study'}
          onClick={() => choose('study')}
        >
          Study &amp; Citation
        </button>
        <button
          className={`panel-tab${tab === 'notes' ? ' active' : ''}`}
          id="tab-notes"
          role="tab"
          aria-selected={tab === 'notes'}
          onClick={() => choose('notes')}
        >
          Notes ({notes.length})
        </button>
      </div>

      <div className="panel-body">
        {tab === 'study' && verseKey && heading && (
          <div className="citation-card">
            <div className="citation-header">
              <span>Passage Citation</span>
              <span>{heading}</span>
            </div>
            <div className="mass-cross-ref">
              <button className="cross-ref-item" onClick={() => onOpenKey(verseKey)}>
                📖 <span>Open in Sacred Scripture</span>
              </button>
            </div>
          </div>
        )}

        {tab === 'notes' &&
          notes.map(({ section, ann }) => (
            <div className="comment-card" key={ann.id}>
              <div className="comment-meta">
                <span>{typeof section.title === 'string' ? section.title : section.anchor}</span>
                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
              {ann.quote && <p className="comment-quote">“{clip(ann.quote, 90)}”</p>}
              {ann.note && <div className="comment-note ck-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(ann.note) }} />}
            </div>
          ))}
      </div>
    </aside>
  );
}
