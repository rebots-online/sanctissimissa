/**
 * ScriptureMap — the scripture surface's own map (ARCHITECTURE.md §11.2/§11.3
 * decision 23): scripture chapters are *ordered content*, so the map is an
 * alternating-box chapter stack, not SVG. One SectionReader for the whole
 * book; each chapter a parity-shaded container (`chapter-lite`/`chapter-shade`
 * on `--surface`/`--surface-2`), verses superscripted through the shared
 * `renderLine` rule (the join prefixes `{chapter}:{verse} `), a per-chapter
 * verse dropdown that jumps to the verse's line. Every reading interaction —
 * echo, flyout, selection menu, annotations — carries through because the
 * boxes are SectionReader sections.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SectionText } from '../core/data/types.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import SectionReader, { type ReaderSection, type SelectionAction } from './SectionReader.tsx';

interface Props {
  db: CorpusDb;
  /** Book key, e.g. 'Gen', 'Psa'. */
  book: string;
  /** The Psalter titles its chapters 'Psalmus N' rather than 'Caput N'. */
  psalms?: boolean;
  sidecar?: SidecarDb | null;
  onAction: (a: SelectionAction) => void;
  onCapture?: (capture: { quote: string; quoteAlt?: string; anchor: string | null }) => void;
  /** Rendered in the reader's toolbar — the host's back/title row. ScriptureMap
   *  must be the view's ROOT so its scroll container is the real one. */
  toolbar?: ReactNode;
}

/** Verse number of a verse row — the trailing segment of its `verse:…` key. */
const verseNo = (v: SectionText) => v.nodeKey.split('/').pop() ?? '';

/** Line-parallel join with `{chapter}:{verse} ` prefixes so `renderLine`
 *  superscripts the verse and drops the chapter (shown once, in the title). */
const chapterLines = (verses: SectionText[], chapter: number, lang: 'latin' | 'english'): string | null => {
  const joined = verses.map((v) => `${chapter}:${verseNo(v)} ${(lang === 'latin' ? v.latin : v.english) ?? ''}`.trimEnd()).join('\n');
  return joined.trim() || null;
};

export default function ScriptureMap({ db, book, psalms, sidecar, onAction, onCapture, toolbar }: Props) {
  const meta = useMemo(() => db.getBooks().find((b) => b.key === book) ?? null, [db, book]);
  const rootRef = useRef<HTMLDivElement>(null);
  /** "bible:Book/ch/verse" jump target; nonce re-triggers the same target. */
  const [jump, setJump] = useState<{ to: string; nonce: number } | null>(null);

  const sections: ReaderSection[] = useMemo(() => {
    const out: ReaderSection[] = [];
    for (let n = 1; n <= (meta?.chapters ?? 0); n++) {
      const verses = db.getChapter(book, n);
      if (!verses.length) continue;
      out.push({
        anchor: `bible:${book}/${n}`,
        nodeKey: `bible:${book}/${n}`,
        quoteKeys: verses.map((v) => v.nodeKey),
        title: psalms ? `Psalmus ${n}` : `Caput ${n}`,
        sectionClass: n % 2 ? 'chapter-lite' : 'chapter-shade',
        latin: chapterLines(verses, n, 'latin'),
        english: chapterLines(verses, n, 'english'),
        meta: (
          <select
            className="verse-jump"
            aria-label={`Jump to verse in ${psalms ? 'Psalm' : 'chapter'} ${n}`}
            value=""
            onChange={(e) => e.target.value && setJump({ to: `bible:${book}/${n}/${e.target.value}`, nonce: Date.now() })}
          >
            <option value="">v.</option>
            {verses.map((v) => (
              <option key={v.nodeKey} value={verseNo(v)}>{verseNo(v)}</option>
            ))}
          </select>
        ),
      });
    }
    return out;
  }, [db, book, meta, psalms]);

  // Jump: scroll the stack's own container to the chapter box, refined to the
  // verse line (verse n is line n-1 of the line-parallel join).
  useEffect(() => {
    if (!jump || !rootRef.current) return;
    const root = rootRef.current;
    const m = jump.to.match(/^bible:([A-Za-z0-9]+)\/(\d+)(?:\/(\d+))?$/);
    if (!m) return;
    const box = root.querySelector(`[data-section="bible:${CSS.escape(`${m[1]}/${m[2]}`)}"]`);
    if (!box) return;
    let el: HTMLElement = box as HTMLElement;
    if (m[3]) {
      const line = box.querySelector(`span[data-line="${Number(m[3]) - 1}"]`);
      if (line) el = line as HTMLElement;
    }
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 6;
    root.scrollTo({ top, behavior: 'smooth' });
  }, [jump]);

  return (
    <SectionReader
      db={db}
      sections={sections}
      sidecar={sidecar}
      onAction={onAction}
      onCapture={onCapture}
      rootRef={rootRef}
      collapsible={false}
      toolbar={toolbar}
    />
  );
}
