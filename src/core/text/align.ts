/**
 * align — line-level Latin⇄English alignment inside one bilingual block.
 *
 * DO section texts are typically line-parallel between languages, and Bible
 * verses are aligned by construction — so the honest unit of "the direct
 * translation in context" is the LINE: find the line whose normalized form
 * (diacritics/ligatures/punctuation/case stripped) contains the normalized
 * selection, and pair it with the same-index line of the counterpart.
 * Word-level alignment does not exist in the corpus and is never faked.
 */

import { normalizeText } from './normalize.ts';

export interface PhraseSelectionInput {
  srcLang: 'latin' | 'english';
  idx: number;
  start: number;
  end: number;
}

export interface PhraseAlignment {
  srcLang: 'latin' | 'english';
  idx: number;
  srcLine: string;
  srcStart: number;
  srcEnd: number;
  dstLine: string;
  dstStart: number;
  dstEnd: number;
  countsMatch: boolean;
  method: 'attested-anchors' | 'positional-fallback';
}

export interface AlignedLine {
  srcLang: 'latin' | 'english';
  /** Line index within the source-language block. */
  idx: number;
  srcLine: string;
  /** Same-index counterpart line, or null when the counterpart is missing. */
  dstLine: string | null;
  /** False when line counts differ — the pairing is positional best-effort. */
  countsMatch: boolean;
}

export function alignSelection(
  block: { latin: string | null; english: string | null },
  term: string,
): AlignedLine | null {
  const norm = normalizeText(term);
  if (!norm) return null;
  for (const srcLang of ['latin', 'english'] as const) {
    const src = block[srcLang];
    if (!src) continue;
    const lines = src.split('\n');
    const idx = lines.findIndex((l) => normalizeText(l).includes(norm));
    if (idx < 0) continue;
    const dst = block[srcLang === 'latin' ? 'english' : 'latin'];
    const dstLines = dst ? dst.split('\n') : null;
    return {
      srcLang,
      idx,
      srcLine: lines[idx],
      dstLine: dstLines && idx < dstLines.length ? dstLines[idx] : null,
      countsMatch: dstLines !== null && dstLines.length === lines.length,
    };
  }
  return null;
}

// ── Word-level echo (corpus-attested correspondence) ─────────────────
// No word alignments exist in the corpus; the corresponding word is
// DERIVED: across all aligned line pairs containing the source word
// (FTS concordance), count counterpart-line tokens — the most frequent
// non-stopword co-occurring token that also appears in the local aligned
// line is the best-attested correspondence. Positional ratio breaks ties.

const STOP_EN = new Set(('the and of a an to in is was be for with on by at it he she they them his her their that this not but as are were have has had from or who whom which what all my your our us we you i me him shall will may let o unto thee thou thy ye hath do did no nor so if then when there out up upon over also more than hast dost didst art wilt shalt canst mayest hadst wert').split(' '));
const STOP_LA = new Set(('et in ad de cum ex ut non est sunt esse qui quae quod quia sed si a ab per pro sub super me te se nos vos tu ego mihi tibi sibi nobis vobis meus tuus suus noster vester hic ille ipse is ea id o ne nec atque aut vel iam tam tunc ergo autem enim etiam quoque omnis omnes omnia').split(' '));

/** Minimal query surface wordEcho needs (CorpusDb and the node adapter both satisfy it). */
interface EchoDb {
  concordance(term: string, k?: number): { key: string }[];
  textOf(nodeKey: string): { latin: string | null; english: string | null } | null;
}

export interface WordEchoResult {
  /** Best-attested corresponding word (original casing/diacritics), or null. */
  word: string | null;
  /** The aligned counterpart line — always shown as context. */
  line: string | null;
  srcLang: 'latin' | 'english';
}

const tokens = (s: string) => normalizeText(s).split(/\s+/).filter(Boolean);

export function wordEcho(db: EchoDb, block: { latin: string | null; english: string | null }, rawWord: string): WordEchoResult | null {
  const w = normalizeText(rawWord).trim();
  if (!w || w.includes(' ')) return null;
  const aligned = alignSelection(block, rawWord);
  if (!aligned || !aligned.dstLine) return null;
  const dstLang = aligned.srcLang === 'latin' ? 'english' : 'latin';
  const stop = dstLang === 'english' ? STOP_EN : STOP_LA;
  const localDst = tokens(aligned.dstLine).filter((t) => !stop.has(t));

  // Corpus evidence: counterpart tokens co-occurring with w across aligned pairs.
  const freq = new Map<string, number>();
  for (const hit of db.concordance(w, 12)) {
    const t = db.textOf(hit.key);
    if (!t) continue;
    const src = t[aligned.srcLang];
    const dst = t[dstLang];
    if (!src || !dst) continue;
    const srcLines = src.split('\n');
    const dstLines = dst.split('\n');
    srcLines.forEach((line, i) => {
      if (!tokens(line).includes(w) || i >= dstLines.length) return;
      for (const tok of new Set(tokens(dstLines[i]))) {
        if (!stop.has(tok)) freq.set(tok, (freq.get(tok) ?? 0) + 1);
      }
    });
  }

  // Best candidate PRESENT in the local aligned line; positional ratio breaks ties.
  const srcToks = tokens(aligned.srcLine);
  const ratio = Math.max(0, srcToks.indexOf(w)) / Math.max(1, srcToks.length - 1);
  let best: string | null = null;
  let bestScore = -1;
  localDst.forEach((tok, i) => {
    const posCloseness = 1 - Math.abs(i / Math.max(1, localDst.length - 1) - ratio);
    const score = (freq.get(tok) ?? 0) * 10 + posCloseness;
    if (score > bestScore) {
      bestScore = score;
      best = tok;
    }
  });
  // Recover original casing/diacritics from the raw counterpart line.
  let display: string | null = null;
  if (best) {
    display = aligned.dstLine.split(/\s+/).find((orig) => tokens(orig)[0] === best) ?? best;
    display = display.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '');
  }
  return { word: display, line: aligned.dstLine, srcLang: aligned.srcLang };
}

export function alignPhrase(
  db: EchoDb,
  block: { latin: string | null; english: string | null },
  selection: PhraseSelectionInput,
): PhraseAlignment | null {
  // Normalize reversed endpoints
  const { srcLang, idx, start: rawStart, end: rawEnd } = selection;
  const start = Math.min(rawStart, rawEnd);
  const end = Math.max(rawStart, rawEnd);

  // Reject collapsed selection
  if (start === end) return null;

  // Get source and destination text
  const src = block[srcLang];
  if (!src) return null;

  const srcLines = src.split('\n');
  const dst = block[srcLang === 'latin' ? 'english' : 'latin'];
  const dstLines = dst ? dst.split('\n') : null;

  // Reject out-of-range line index
  if (idx < 0 || idx >= srcLines.length) return null;

  // Get source line
  const srcLine = srcLines[idx];

  // Reject out-of-range character positions
  if (start < 0 || end > srcLine.length) return null;

  // Reject missing counterpart
  const dstLine = dstLines && idx < dstLines.length ? dstLines[idx] : null;
  if (!dstLine) return null;

  // Split source line into tokens (preserving original form)
  const srcTokens = srcLine.split(/\s+/).filter(Boolean);
  const srcNormTokens = srcTokens.map(t => normalizeText(t));

  // Build cumulative normalized character positions for source line
  const srcNormPositions: Array<{ normStart: number; normEnd: number; originalStart: number; originalEnd: number; token: string; normToken: string }> = [];
  let normPos = 0;
  let origPos = 0;
  for (let i = 0; i < srcTokens.length; i++) {
    const token = srcTokens[i];
    const normToken = srcNormTokens[i];
    srcNormPositions.push({
      normStart: normPos,
      normEnd: normPos + normToken.length,
      originalStart: origPos,
      originalEnd: origPos + token.length,
      token,
      normToken,
    });
    normPos += normToken.length + 1; // +1 for space
    origPos += token.length + 1;
  }

  // Find which tokens intersect with the selection range
  const selectedTokenIndices: number[] = [];
  for (let i = 0; i < srcNormPositions.length; i++) {
    const tokenInfo = srcNormPositions[i];
    if (start < tokenInfo.originalEnd && end > tokenInfo.originalStart) {
      selectedTokenIndices.push(i);
    }
  }

  if (selectedTokenIndices.length === 0) return null;

  // Get destination line tokens and their normalized forms
  const dstTokens = dstLine.split(/\s+/).filter(Boolean);
  const dstNormTokens = dstTokens.map(t => normalizeText(t));

  // Build cumulative normalized character positions for destination line
  const dstNormPositions: Array<{ normStart: number; normEnd: number; originalStart: number; originalEnd: number; token: string; normToken: string }> = [];
  normPos = 0;
  origPos = 0;
  for (let i = 0; i < dstTokens.length; i++) {
    const token = dstTokens[i];
    const normToken = dstNormTokens[i];
    dstNormPositions.push({
      normStart: normPos,
      normEnd: normPos + normToken.length,
      originalStart: origPos,
      originalEnd: origPos + token.length,
      token,
      normToken,
    });
    normPos += normToken.length + 1;
    origPos += token.length + 1;
  }

  // Use wordEcho to find attested anchors for all selected tokens
  const anchors: Array<{ dstTokenIdx: number; confidence: number }> = [];
  for (const srcTokenIdx of selectedTokenIndices) {
    const srcToken = srcTokens[srcTokenIdx];
    const echo = wordEcho(db, block, srcToken);
    if (echo?.word) {
      const echoNorm = normalizeText(echo.word);
      // Find matching destination token by normalized form
      for (let i = 0; i < dstNormTokens.length; i++) {
        if (dstNormTokens[i] === echoNorm) {
          anchors.push({ dstTokenIdx: i, confidence: 1.0 });
          break;
        }
      }
    }
  }

  const countsMatch = dstLines !== null && dstLines.length === srcLines.length;

  // If we have >=2 anchors, use attested-anchors method with partial boundary support
  if (anchors.length >= 2) {
    const firstAnchor = anchors[0];
    const lastAnchor = anchors[anchors.length - 1];

    // For the first token: map partial selection into destination
    const firstSrcTokenIdx = selectedTokenIndices[0];
    const firstSrcTokenInfo = srcNormPositions[firstSrcTokenIdx];
    const firstDstTokenInfo = dstNormPositions[firstAnchor.dstTokenIdx];

    let dstStart: number;
    if (firstSrcTokenIdx === firstAnchor.dstTokenIdx && anchors[0].confidence === 1.0) {
      // Selection starts at same token position: use character ratio
      const ratioStart = (start - firstSrcTokenInfo.originalStart) / Math.max(1, firstSrcTokenInfo.originalEnd - firstSrcTokenInfo.originalStart);
      dstStart = firstDstTokenInfo.originalStart + Math.floor(ratioStart * (firstDstTokenInfo.originalEnd - firstDstTokenInfo.originalStart));
    } else {
      // Different token: use full destination token
      dstStart = firstDstTokenInfo.originalStart;
    }

    // For the last token: map partial selection into destination
    const lastSrcTokenIdx = selectedTokenIndices[selectedTokenIndices.length - 1];
    const lastSrcTokenInfo = srcNormPositions[lastSrcTokenIdx];
    const lastDstTokenInfo = dstNormPositions[lastAnchor.dstTokenIdx];

    let dstEnd: number;
    if (lastSrcTokenIdx === lastAnchor.dstTokenIdx && anchors[anchors.length - 1].confidence === 1.0) {
      // Selection ends at same token position: use character ratio
      const ratioEnd = (end - lastSrcTokenInfo.originalStart) / Math.max(1, lastSrcTokenInfo.originalEnd - lastSrcTokenInfo.originalStart);
      dstEnd = lastDstTokenInfo.originalStart + Math.ceil(ratioEnd * (lastDstTokenInfo.originalEnd - lastDstTokenInfo.originalStart));
    } else {
      // Different token: use full destination token
      dstEnd = lastDstTokenInfo.originalEnd;
    }

    return {
      srcLang,
      idx,
      srcLine,
      srcStart: start,
      srcEnd: end,
      dstLine,
      dstStart: Math.max(0, dstStart),
      dstEnd: Math.min(dstLine.length, dstEnd),
      countsMatch,
      method: 'attested-anchors',
    };
  }

  // Fallback: project exact source character ratios into destination grapheme boundaries
  const dstTotal = dstLine.length;

  // Calculate normalized character positions
  const srcNorm = normalizeText(srcLine);
  const dstNorm = normalizeText(dstLine);

  // Find character-level grapheme boundaries in destination
  const dstGraphemeBounds: number[] = [0];
  for (let i = 0; i < dstNorm.length; i++) {
    dstGraphemeBounds.push(i + 1);
  }

  // Calculate source ratios in normalized space
  const srcNormStartChar = normalizeText(srcLine.slice(0, start)).length;
  const srcNormEndChar = normalizeText(srcLine.slice(0, end)).length;
  const srcNormTotal = srcNorm.length;

  const srcRatioStart = srcNormStartChar / Math.max(1, srcNormTotal);
  const srcRatioEnd = srcNormEndChar / Math.max(1, srcNormTotal);

  // Map ratios to destination grapheme positions
  const dstNormStart = Math.floor(srcRatioStart * dstNorm.length);
  const dstNormEnd = Math.ceil(srcRatioEnd * dstNorm.length);

  // Find closest grapheme boundaries
  const dstStart = Math.max(0, Math.min(dstTotal, dstNormStart));
  const dstEnd = Math.max(0, Math.min(dstTotal, dstNormEnd));

  return {
    srcLang,
    idx,
    srcLine,
    srcStart: start,
    srcEnd: end,
    dstLine,
    dstStart,
    dstEnd,
    countsMatch,
    method: 'positional-fallback',
  };
}

export function wordAtPoint(x: number, y: number): string | null {
  type CaretPos = { offsetNode: Node; offset: number };
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => CaretPos | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | null = null;
  let offset = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) {
      node = p.offsetNode;
      offset = p.offset;
    }
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) {
      node = r.startContainer;
      offset = r.startOffset;
    }
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null;
  const text = node.textContent ?? '';
  const isWord = (ch: string) => /[\p{L}\p{M}]/u.test(ch);
  if (!isWord(text[offset] ?? '') && !isWord(text[offset - 1] ?? '')) return null;
  let a = offset;
  let b = offset;
  while (a > 0 && isWord(text[a - 1])) a--;
  while (b < text.length && isWord(text[b])) b++;
  const word = text.slice(a, b);
  return word.length >= 2 ? word : null;
}
