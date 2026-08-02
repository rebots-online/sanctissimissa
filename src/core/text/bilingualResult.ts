/**
 * Query-emphasized bilingual result renderer — §BS.2
 *
 * Given a bilingual text block (latin/english) and a search query, builds
 * a display structure that emphasizes the query matches while preserving the
 * original text with diacritics intact. The primary language is chosen by:
 * 1. Language containing the normalized query (best match)
 * 2. Higher clause score if both contain normalized query
 * 3. Latin on deterministic tie
 *
 * Match spans are computed on normalized text then mapped back to original
 * offsets, preserving diacritics/casing. The companion text is the same
 * line index from the other language.
 */

import { normalizeText } from './normalize.ts';

/**
 * Bilingual result with match spans and primary language selection.
 */
export interface BilingualResultText {
  /** Primary display text (chosen by query relevance). */
  primary: string;
  /** Language of primary text. */
  primaryLang: 'latin' | 'english';
  /** Companion text from the other language (same line index), or null. */
  companion: string | null;
  /** Language of companion text. */
  companionLang: 'latin' | 'english';
  /** Start/end offsets (in primary) for each exact query match. */
  matchSpans: { start: number; end: number }[];
}

/**
 * Clause detection pattern — splits on sentence terminators.
 */
const CLAUSE_PATTERN = /[.!?;:]/;

/**
 * Score a text for clause density (more clause terminators = better clause).
 */
function scoreClauses(text: string): number {
  const matches = text.match(CLAUSE_PATTERN);
  return matches ? matches.length : 0;
}

/**
 * Find all occurrences of normalized query within normalized text, returning
 * original (non-normalized) start/end offsets. Scans the original text and
 * uses normalized comparison for case/diacritic insensitivity.
 */
function findQuerySpans(original: string, query: string): { start: number; end: number }[] {
  if (!query || !original) return [];

  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return [];

  const spans: { start: number; end: number }[] = [];

  // Scan through the original text looking for matches
  for (let i = 0; i <= original.length - query.length; i++) {
    const substring = original.slice(i, i + query.length);
    const normalizedSubstring = normalizeText(substring);

    if (normalizedSubstring === normalizedQuery) {
      // Found a match at position i
      spans.push({ start: i, end: i + query.length });
    }
  }

  // Deduplicate overlapping spans (keep the shortest/most precise one)
  const deduped: { start: number; end: number }[] = [];
  for (const span of spans) {
    const overlaps = deduped.filter(s =>
      (span.start >= s.start && span.start < s.end) ||
      (span.end > s.start && span.end <= s.end) ||
      (span.start <= s.start && span.end >= s.end)
    );

    if (overlaps.length === 0) {
      deduped.push(span);
    } else {
      // Replace overlapping spans with the shortest one
      const shortest = overlaps.reduce((min, s) => (s.end - s.start < min.end - min.start ? s : min), span);
      // Remove all overlapping spans and add the shortest
      const filtered = deduped.filter(s =>
        !(s.start >= shortest.start && s.start < shortest.end) &&
        !(s.end > shortest.start && s.end <= shortest.end) &&
        !(s.start <= shortest.start && s.end >= shortest.end)
      );
      filtered.push(shortest);
      deduped.length = 0;
      deduped.push(...filtered);
    }
  }

  // If no direct matches, try finding word-level matches
  if (deduped.length === 0) {
    const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 0);
    const originalWords: { text: string; normalized: string; start: number; end: number }[] = [];
    let wordStart = 0;
    let currentWord = '';

    for (let i = 0; i <= original.length; i++) {
      const char = i < original.length ? original[i] : ' ';
      const normChar = i < original.length ? normalizeText(char) : ' ';

      if (normChar && normChar.match(/[a-z]/)) {
        currentWord += char;
      } else {
        if (currentWord.length > 0) {
          originalWords.push({
            text: currentWord,
            normalized: normalizeText(currentWord),
            start: wordStart,
            end: i,
          });
        }
        currentWord = '';
        wordStart = i + 1;
      }
    }

    // Match individual words
    for (const word of originalWords) {
      for (const queryWord of queryWords) {
        if (word.normalized === queryWord) {
          deduped.push({ start: word.start, end: word.end });
          break;
        }
      }
    }
  }

  return deduped;
}

/**
 * Split text into lines and find the line with the most query matches.
 */
function findBestLine(text: string, normalizedQuery: string): { lineIndex: number; line: string; matchCount: number } {
  if (!text) return { lineIndex: 0, line: '', matchCount: 0 };

  const lines = text.split('\n');
  let bestIndex = 0;
  let bestCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const normalizedLine = normalizeText(line);
    let count = 0;
    let searchFrom = 0;

    while (searchFrom < normalizedLine.length) {
      const idx = normalizedLine.indexOf(normalizedQuery, searchFrom);
      if (idx === -1) break;
      count++;
      searchFrom = idx + 1;
    }

    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  }

  return { lineIndex: bestIndex, line: lines[bestIndex] || '', matchCount: bestCount };
}

/**
 * Build a bilingual result emphasizing query matches.
 *
 * @param block - Text block with latin and/or english fields.
 * @param query - Search query to emphasize.
 * @returns BilingualResultText with primary text, match spans, and companion.
 */
export function buildBilingualResult(
  block: { latin: string | null; english: string | null },
  query: string
): BilingualResultText {
  const hasLatin = block.latin != null && block.latin.length > 0;
  const hasEnglish = block.english != null && block.english.length > 0;
  const normalizedQuery = normalizeText(query);

  // Both missing → return empty result
  if (!hasLatin && !hasEnglish) {
    return {
      primary: '',
      primaryLang: 'latin',
      companion: null,
      companionLang: 'english',
      matchSpans: [],
    };
  }

  // Score both languages for clause density
  const latinScore = hasLatin && block.latin ? scoreClauses(block.latin) : 0;
  const englishScore = hasEnglish && block.english ? scoreClauses(block.english) : 0;

  // Check which language contains the normalized query
  const normalizedLatin = hasLatin && block.latin ? normalizeText(block.latin) : '';
  const normalizedEnglish = hasEnglish && block.english ? normalizeText(block.english) : '';

  const latinHasQuery = hasLatin && normalizedLatin.includes(normalizedQuery);
  const englishHasQuery = hasEnglish && normalizedEnglish.includes(normalizedQuery);

  // Determine primary language by task rules:
  // 1. Language containing normalized query
  // 2. Higher clause score if both contain query
  // 3. Latin on deterministic tie
  let primaryLang: 'latin' | 'english';
  if (latinHasQuery && !englishHasQuery) {
    primaryLang = 'latin';
  } else if (englishHasQuery && !latinHasQuery) {
    primaryLang = 'english';
  } else if (latinHasQuery && englishHasQuery) {
    // Both have query → higher clause score wins
    primaryLang = latinScore >= englishScore ? 'latin' : 'english';
  } else {
    // Neither has query → higher clause score wins, Latin on tie
    primaryLang = latinScore >= englishScore ? 'latin' : 'english';
  }

  const primaryText = primaryLang === 'latin' ? (block.latin ?? '') : (block.english ?? '');
  const companionText = primaryLang === 'latin' ? block.english : block.latin;
  const companionLang: 'latin' | 'english' = primaryLang === 'latin' ? 'english' : 'latin';

  // Find the best line in primary text (most query matches)
  const { line: bestPrimaryLine, lineIndex } = findBestLine(primaryText, normalizedQuery);

  // Get companion line at same index
  const companionLines = companionText ? companionText.split('\n') : [];
  const companionLine = companionLines[lineIndex] || null;

  // Find all query spans in the best primary line
  const matchSpans = findQuerySpans(bestPrimaryLine, query);

  return {
    primary: bestPrimaryLine,
    primaryLang,
    companion: companionLine,
    companionLang,
    matchSpans,
  };
}