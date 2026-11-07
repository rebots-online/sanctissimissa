// §K.4 sentence segmentation (TT.1, amended 2026-11-06; DOCS/ARCHITECTURE/L-audiobook-20261106.md §2.4).
// Anti-drop invariant (K.4): normalizeWs(segmentSentences(t).join(' ')) === normalizeWs(t) for every t.
// Cuts happen only at whitespace (or end of text), and every piece is trimmed, so no character but
// whitespace is ever lost. Erasable-only TypeScript so Node can strip-load this file.

/** Abbreviations whose trailing `.` never ends a sentence. Closed set, Phase K. */
export const ABBREVIATIONS: readonly string[] = [
  'Mr.', 'Mrs.', 'Dr.', 'St.', 'Sts.', 'Ss.', 'Bl.', 'Fr.', 'Rev.', 'Ven.', 'vs.', 'etc.', 'cf.',
  'ch.', 'v.', 'vv.', 'i.e.', 'e.g.', 'A.D.', 'B.C.', 'viz.', 'Lib.',
];

const ABBREVIATION_SET: ReadonlySet<string> = new Set(ABBREVIATIONS);

/** A terminator run, optional closing quotes/brackets, then whitespace or end of text. */
const BOUNDARY_RE = /[.!?…]+[”’"')\]»]*(?=\s|$)/g;
const OPENERS_RE = /^[“‘"'([«]+/;
const DIGIT_RE = /[0-9]/;

export function normalizeWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** True when the match at [start, end) must not split the text. */
function isNonBoundary(text: string, start: number, match: string): boolean {
  const punct = match.replace(/[”’"')\]»]+$/, '');
  // Never between two digits (3.5). The lookahead already requires whitespace after the run,
  // so this guards a closer-free single `.` flanked by digits.
  if (punct === '.' && start > 0 && DIGIT_RE.test(text[start - 1] ?? '') && DIGIT_RE.test(text[start + 1] ?? '')) {
    return true;
  }
  if (punct !== '.') return false;
  let tokenStart = start;
  while (tokenStart > 0 && !/\s/.test(text[tokenStart - 1] ?? '')) tokenStart--;
  const token = text.slice(tokenStart, start + 1).replace(OPENERS_RE, '');
  return ABBREVIATION_SET.has(token);
}

export function segmentSentences(text: string): string[] {
  const out: string[] = [];
  let pieceStart = 0;
  BOUNDARY_RE.lastIndex = 0;
  for (let m = BOUNDARY_RE.exec(text); m !== null; m = BOUNDARY_RE.exec(text)) {
    if (isNonBoundary(text, m.index, m[0])) continue;
    const end = m.index + m[0].length;
    const piece = text.slice(pieceStart, end).trim();
    if (piece) out.push(piece);
    pieceStart = end;
  }
  const rest = text.slice(pieceStart).trim();
  if (rest) out.push(rest);
  return out;
}
