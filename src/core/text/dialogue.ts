/**
 * Liturgical dialogue voice detection (§7.7) — RENDER-LEVEL ONLY.
 * Classifies a display line by its leading versicle/response marker so the
 * bilingual renderer can wrap it in a .dialogue-p / .dialogue-s span.
 * Stored corpus text is never modified: this inspects, it does not rewrite.
 *
 * `V.` / `℣.` / `P.` (priest / versicle voice)  → 'dialogue-p'
 * `R.` / `℟.` / `S.` (server / response voice)  → 'dialogue-s'
 * The marker must lead the line (optionally after whitespace); the single
 * letter + period is its own word boundary — "Verbum…" never matches.
 */

const PRIEST = /^\s*(?:V|℣|P)\./u;
const SERVER = /^\s*(?:R|℟|S)\./u;

export function dialogueClass(line: string): 'dialogue-p' | 'dialogue-s' | null {
  if (PRIEST.test(line)) return 'dialogue-p';
  if (SERVER.test(line)) return 'dialogue-s';
  return null;
}
