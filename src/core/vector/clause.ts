/**
 * Clause segmentation + best-clause selection for similarity UX.
 *
 * A "clause" is a stretch of text ending at a clause boundary (`.` `:` `;` `·`,
 * delimiter kept with the preceding clause). Fragments shorter than
 * MIN_CLAUSE_LENGTH characters are merged into a neighbour so downstream
 * embedding comparisons operate on meaningful units. Offsets are exact:
 * `text.slice(clause.start, clause.end) === clause.text` always holds.
 *
 * Deterministic, single linear character scan — no regex backtracking risk
 * on long corpus text.
 */

import { embedText, cosine } from './embed.ts';

export interface Clause {
  text: string;
  start: number;
  end: number;
}

const MIN_CLAUSE_LENGTH = 25;

function isDelimiter(ch: string): boolean {
  return ch === '.' || ch === ':' || ch === ';' || ch === '·';
}

function isWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f' || ch === '\v' || ch === '\u00a0';
}

/** Trimmed clause over [rawStart, rawEnd); null when whitespace-only. */
function makeClause(text: string, rawStart: number, rawEnd: number): Clause | null {
  let start = rawStart;
  let end = rawEnd;
  while (start < end && isWhitespace(text[start])) start++;
  while (end > start && isWhitespace(text[end - 1])) end--;
  if (start >= end) return null;
  return { text: text.slice(start, end), start, end };
}

/**
 * Split text into clauses on `.` `:` `;` `·` (delimiter stays with the
 * preceding clause), trim each, and merge fragments shorter than
 * MIN_CLAUSE_LENGTH chars into their neighbour (previous when one exists,
 * otherwise next). Start/end are exact offsets into the original string.
 */
export function splitClauses(text: string): Clause[] {
  const clauses: Clause[] = [];
  let segStart = 0;
  for (let i = 0; i < text.length; i++) {
    if (isDelimiter(text[i])) {
      const c = makeClause(text, segStart, i + 1);
      if (c) clauses.push(c);
      segStart = i + 1;
    }
  }
  const tail = makeClause(text, segStart, text.length);
  if (tail) clauses.push(tail);

  // Merge short fragments into a neighbour until stable (or one clause left).
  let changed = true;
  while (changed && clauses.length > 1) {
    changed = false;
    for (let i = 0; i < clauses.length; i++) {
      if (clauses[i].text.length >= MIN_CLAUSE_LENGTH) continue;
      const j = i > 0 ? i - 1 : i + 1;
      const start = Math.min(clauses[i].start, clauses[j].start);
      const end = Math.max(clauses[i].end, clauses[j].end);
      const merged: Clause = { text: text.slice(start, end), start, end };
      clauses.splice(Math.min(i, j), 2, merged);
      changed = true;
      break;
    }
  }
  return clauses;
}

/**
 * The clause of `text` most similar in meaning to `query` — embeds the query
 * once, embeds each clause, and returns the cosine argmax (first clause wins
 * ties, so results are deterministic). Null when the text yields no clauses.
 */
export function bestClause(text: string, query: string): (Clause & { score: number }) | null {
  const clauses = splitClauses(text);
  if (clauses.length === 0) return null;
  const queryVec = embedText(query);
  if (clauses.length === 1) {
    return { ...clauses[0], score: cosine(queryVec, embedText(clauses[0].text)) };
  }
  let best = clauses[0];
  let bestScore = cosine(queryVec, embedText(clauses[0].text));
  for (let i = 1; i < clauses.length; i++) {
    const score = cosine(queryVec, embedText(clauses[i].text));
    if (score > bestScore) {
      best = clauses[i];
      bestScore = score;
    }
  }
  return { ...best, score: bestScore };
}
