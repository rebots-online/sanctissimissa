/**
 * L.6 F6 — approximate per-word timings for a synthesized sentence (pure).
 * Weights are letter counts plus a pause bonus for sentence/clause punctuation;
 * there is no forced alignment (W6).
 */

export interface WordTime { start: number; end: number; charStart: number; charEnd: number }

const CLOSERS = /[”’"')\]»]+$/;
const LETTER = /[\p{L}\p{N}]/gu;

function weightOf(w: string): number {
  const letters = Math.max(1, w.match(LETTER)?.length ?? 0);
  const tail = w.replace(CLOSERS, '');
  const bonus = /[.!?…]$/.test(tail) ? 4 : /[,;:—]$/.test(tail) ? 2 : 0;
  return letters + bonus;
}

export function approxWordTimes(sentence: string, durationSec: number): WordTime[] {
  const tokens: { w: string; charStart: number; charEnd: number }[] = [];
  for (const m of sentence.matchAll(/\S+/g)) {
    const charStart = m.index ?? 0;
    tokens.push({ w: m[0], charStart, charEnd: charStart + m[0].length });
  }
  if (tokens.length === 0) return [];
  const weights = tokens.map((t) => weightOf(t.w));
  const total = weights.reduce((a, b) => a + b, 0);
  const out: WordTime[] = [];
  let acc = 0;
  for (let i = 0; i < tokens.length; i++) {
    out.push({ start: (durationSec * acc) / total, end: 0, charStart: tokens[i].charStart, charEnd: tokens[i].charEnd });
    acc += weights[i];
  }
  for (let i = 0; i < out.length; i++) out[i].end = i + 1 < out.length ? out[i + 1].start : durationSec;
  return out;
}
