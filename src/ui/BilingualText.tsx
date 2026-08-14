/**
 * BilingualText — shared bilingual renderer (§7.7, CHECKLIST BK.1/BK.2).
 * Extracted from ReaderView's internal TextBlock and generalized:
 *
 *  - `TextLines` is the low-level single-language block (byte-identical DOM
 *    semantics to the old TextBlock: `span[data-line]`, `.xlate-echo` on
 *    echoed lines, annotation quotes as `mark.ann`, `!`-refs as `.verse-ref`).
 *  - `layout='columns'` renders the classic two-pane `.bilingual` grid.
 *  - `layout='interleaved'` (mobile, `useNarrow`) zips the line-parallel
 *    corpus into `.il-pair` rows: Latin first (`.il-la`), its English
 *    directly beneath (`.il-en`); NULL English → Latin-only pair.
 *
 * Echo accepts a line RANGE (`echoLine`..`echoTo`) so the selection-range
 * echo (BK.2) can light every counterpart line; a single-line echo is a
 * one-line range. Dialogue voice markers (V./R./℣./℟./P./S.) are wrapped in
 * `.dialogue-p` / `.dialogue-s` spans via `dialogueClass` (render-only).
 *
 * Annotation highlights are anchored by exact `{lang,line,start,end}` ranges
 * (`marks`), so a highlight marks the ONE passage the user selected — not
 * every identical word. `quotes` (content-string matching) is retained only
 * for sidecar highlights and rangeless legacy annotations.
 */

import { useEffect, useState, type ReactElement } from 'react';
import { dialogueClass } from '../core/text/dialogue.ts';
import { isScriptureCitationLine, isSpecialsControlLine } from '../core/liturgy/massSpecials.ts';
import type { AnnotationRange } from '../core/annotations/store.ts';

/** Classify a leading-! line for display (controls already stripped by specials). */
function bangLineClass(line: string): 'suppress' | 'verse-ref' | 'rubric-text' {
  if (isSpecialsControlLine(line)) return 'suppress';
  if (isScriptureCitationLine(line)) return 'verse-ref';
  return 'rubric-text';
}

export interface SelectionEcho {
  lang: 'latin' | 'english';
  line: number;
  start: number;
  end: number;
}

/** Leading versicle/response marker (must match dialogue.ts detection). */
const DIALOGUE_MARKER = /^\s*(?:V|℣|P|R|℟|S)\./u;

/** matchMedia width probe driving the interleave switch. SSR-safe. */
export function useNarrow(px = 1100): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState<boolean>(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const onChange = () => setNarrow(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return narrow;
}

/**
 * Render one display line: optional leading dialogue-voice span, then the
 * body with annotation ranges marked exactly, then content-quote matching.
 *
 * `ranges` are character offsets relative to the FULL raw line (the voice
 * marker, if any, is still part of that coordinate space); `shift` maps them
 * into the voice-stripped `body`. Ranges are applied non-overlapping, sorted.
 */
function renderLine(
  line: string,
  quotes: string[],
  lineKey: number,
  ranges?: { start: number; end: number }[],
): (string | ReactElement)[] {
  const out: (string | ReactElement)[] = [];
  let body = line;
  let shift = 0;
  // Verse numbering: a leading "Chapter:Verse " (e.g. psalm "98:1 "). The
  // chapter/psalm number is shown ONCE in the section title, so here only the
  // verse number is rendered — as a superscript — and the chapter prefix is
  // dropped (fixes the "98:1 / 98:2 / 98:3 …" repetition). `shift` keeps
  // annotation ranges aligned to the new, shorter body.
  const verseM = line.match(/^(\d+):(\d+)(?=\s)/);
  if (verseM) {
    out.push(<sup className="vnum" key={`vn-${lineKey}`}>{verseM[2]}</sup>);
    out.push(' ');
    const consumed = verseM[0].length;
    body = line.slice(consumed).replace(/^\s/, '');
    shift += consumed + 1;
  }
  const voice = dialogueClass(body);
  if (voice) {
    const m = body.match(DIALOGUE_MARKER);
    if (m) {
      out.push(
        <span className={voice} key={`v-${lineKey}`}>
          {m[0]}
        </span>,
      );
      body = body.slice(m[0].length);
      shift += m[0].length;
    }
  }
  let rendered: (string | ReactElement)[] = [body];
  if (ranges && ranges.length) {
    const adj = ranges
      .map((r) => ({ start: r.start - shift, end: r.end - shift }))
      .filter((r) => r.start >= 0 && r.end <= body.length && r.end > r.start)
      .sort((a, b) => a.start - b.start);
    const marked: (string | ReactElement)[] = [];
    let cursor = 0;
    for (const r of adj) {
      if (r.start < cursor) continue; // overlap or duplicate; skip
      if (r.start > cursor) marked.push(body.slice(cursor, r.start));
      marked.push(<mark className="ann" key={`r-${lineKey}-${r.start}-${r.end}`}>{body.slice(r.start, r.end)}</mark>);
      cursor = r.end;
    }
    if (cursor < body.length) marked.push(body.slice(cursor));
    if (marked.length) rendered = marked;
  }
  for (const q of quotes) {
    rendered = rendered.flatMap((part) => {
      if (typeof part !== 'string' || !q || !part.includes(q)) return [part];
      const bits = part.split(q);
      const o: (string | ReactElement)[] = [];
      bits.forEach((b, j) => {
        o.push(b);
        if (j < bits.length - 1) o.push(<mark className="ann" key={`${lineKey}-${j}-${q.slice(0, 8)}`}>{q}</mark>);
      });
      return o;
    });
  }
  return out.concat(rendered);
}

const inRange = (i: number, from?: number, to?: number) =>
  from !== undefined && i >= from && i <= (to ?? from);

/** Ranges for one line of one language (body-relative `start/end` only). */
function rangesForLine(marks: AnnotationRange[] | undefined, lang: 'latin' | 'english', line: number): { start: number; end: number }[] | undefined {
  if (!marks || !marks.length) return undefined;
  const rs = marks.filter((m) => m.lang === lang && m.line === line).map(({ start, end }) => ({ start, end }));
  return rs.length ? rs : undefined;
}

/**
 * Low-level single-language block — the old ReaderView TextBlock, verbatim
 * DOM semantics, with echo generalized to a line range (`echoLine`..`echoTo`;
 * omitting `echoTo` keeps the historic single-line behavior).
 */
export function TextLines({
  text,
  quotes,
  echoLine,
  echoTo,
  selectionEcho,
  lang,
  marks,
}: {
  text: string;
  quotes: string[];
  echoLine?: number;
  echoTo?: number;
  selectionEcho?: SelectionEcho;
  /** Language of this block, used to filter `marks`. Required when `marks` is set. */
  lang?: 'latin' | 'english';
  /** Exact-range annotation marks to render (authoritative highlight anchor). */
  marks?: AnnotationRange[];
}) {
  const lines = text.split('\n');
  return (
    <p>
      {lines.map((line, i) => {
        if (line.startsWith('!')) {
          const kind = bangLineClass(line);
          if (kind === 'suppress') return null;
          return (
            <span className={kind} key={i}>
              {line.slice(1)}
            </span>
          );
        }
        const echoed = inRange(i, echoLine, echoTo);
        const hasSelectionEcho = selectionEcho?.line === i;

        // If there's a selection echo, split the line and wrap the selected portion
        let content: (string | ReactElement)[];
        if (hasSelectionEcho && selectionEcho) {
          const { start, end } = selectionEcho;
          const before = line.slice(0, start);
          const selected = line.slice(start, end);
          const after = line.slice(end);

          // Ranges are full-line-relative; skip them on the sliced substrings
          // (the live echo owns this line transiently).
          const beforeRendered = renderLine(before, quotes, i);
          const selectedRendered = <mark key="selection-echo" className="selection-echo">{renderLine(selected, quotes, i)}</mark>;
          const afterRendered = renderLine(after, quotes, i);

          content = [...beforeRendered, selectedRendered, ...afterRendered];
        } else {
          content = renderLine(line, quotes, i, lang ? rangesForLine(marks, lang, i) : undefined);
        }

        return (
          <span key={i} data-line={i} className={echoed ? 'xlate-echo' : undefined}>
            {content}
            {i < lines.length - 1 ? '\n' : ''}
          </span>
        );
      })}
    </p>
  );
}

export default function BilingualText({
  latin,
  english,
  quotes,
  echoLine,
  echoTo,
  layout,
  selectionEcho,
  marks,
}: {
  latin: string | null;
  english: string | null;
  quotes?: string[];
  echoLine?: number;
  /** End of the echoed line range (inclusive); defaults to `echoLine`. */
  echoTo?: number;
  layout: 'columns' | 'interleaved';
  selectionEcho?: SelectionEcho;
  /** Exact-range annotation marks, rendered in whichever language/line they fall on. */
  marks?: AnnotationRange[];
}) {
  const q = quotes ?? [];

  if (layout === 'columns') {
    return (
      <div className="bilingual">
        <div className="latin" lang="la">
          <span className="lang-tag">Latine</span>
          {latin ? <TextLines text={latin} quotes={q} echoLine={echoLine} echoTo={echoTo} selectionEcho={selectionEcho?.lang === 'latin' ? selectionEcho : undefined} lang="latin" marks={marks} /> : <p style={{ opacity: 0.5 }}>—</p>}
        </div>
        <div className="english" lang="en">
          <span className="lang-tag">English</span>
          {english ? <TextLines text={english} quotes={q} echoLine={echoLine} echoTo={echoTo} selectionEcho={selectionEcho?.lang === 'english' ? selectionEcho : undefined} lang="english" marks={marks} /> : <p style={{ opacity: 0.5 }}>—</p>}
        </div>
      </div>
    );
  }

  // ── Interleaved: zip the line-parallel corpus into Latin-first pairs ──
  const laLines = latin ? latin.split('\n') : [];
  const enLines = english ? english.split('\n') : [];
  const count = Math.max(laLines.length, enLines.length);
  return (
    <div className="bilingual interleaved">
      {Array.from({ length: count }, (_, i) => {
        const la = laLines[i];
        const en = enLines[i];
        const laKind = la !== undefined && la.startsWith('!') ? bangLineClass(la) : null;
        const enKind = en !== undefined && en.startsWith('!') ? bangLineClass(en) : null;
        if (laKind === 'suppress' && (enKind === 'suppress' || enKind === null) && (en === undefined || en.startsWith('!'))) {
          return null;
        }
        const echoed = inRange(i, echoLine, echoTo);
        const laSelectionEcho = selectionEcho?.lang === 'latin' && selectionEcho.line === i ? selectionEcho : undefined;
        const enSelectionEcho = selectionEcho?.lang === 'english' && selectionEcho.line === i ? selectionEcho : undefined;
        const laMarks = rangesForLine(marks, 'latin', i);
        const enMarks = rangesForLine(marks, 'english', i);

        return (
          <p className="il-pair" key={i}>
            {la !== undefined && laKind !== 'suppress' &&
              (laKind ? (
                <span className={laKind}>{la.slice(1)}</span>
              ) : (
                <span
                  className={`il-la${echoed ? ' xlate-echo' : ''}`}
                  data-line={i}
                  data-lang="la"
                  lang="la"
                >
                  {laSelectionEcho ? (
                    <>
                      {la.slice(0, laSelectionEcho.start)}
                      <mark className="selection-echo">{la.slice(laSelectionEcho.start, laSelectionEcho.end)}</mark>
                      {la.slice(laSelectionEcho.end)}
                    </>
                  ) : (
                    renderLine(la, q, i, laMarks)
                  )}
                </span>
              ))}
            {en !== undefined && enKind !== 'suppress' &&
              // A bang-line paired with the same Latin bang renders once when both are refs/rubrics.
              (enKind ? (
                laKind ? null : <span className={enKind}>{en.slice(1)}</span>
              ) : (
                <span
                  className={`il-en${echoed ? ' xlate-echo' : ''}`}
                  data-line={i}
                  data-lang="en"
                  lang="en"
                >
                  {enSelectionEcho ? (
                    <>
                      {en.slice(0, enSelectionEcho.start)}
                      <mark className="selection-echo">{en.slice(enSelectionEcho.start, enSelectionEcho.end)}</mark>
                      {en.slice(enSelectionEcho.end)}
                    </>
                  ) : (
                    renderLine(en, q, i, enMarks)
                  )}
                </span>
              ))}
          </p>
        );
      })}
    </div>
  );
}
