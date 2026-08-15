/**
 * Shared marker scrub (D6/D10 of the 2026-08-15 differential probe).
 * The corpus carries Divinum Officium's `!Citation` markers and the engine's
 * `![…]` no-content notes literally; rendering layers pass text through this
 * so both the office engine and the Mass proper path emit the same clean text.
 */

/** Scrub engine markers from rendered text: bare `![…]` no-content notes,
 * stanza-separator `!` lines and bare section-name directives (dropped),
 * `!Citation` markers (rendered parenthetically — including numbered-book
 * `!2 Cor 3:4-9` and comma/semicolon verse forms `!Judith 13, 22-25; 15:10`),
 * and duplicated consecutive citation echoes (collapsed). */
export function scrubMacros(text: string): string {
  const lines: string[] = [];
  for (const raw of text.split('\n')) {
    let l = raw.trim();
    if (/^!+\[(ant|teDeum|rubrica Matutinum)\]$/i.test(l)) continue;
    if (/^!+[A-Za-z]\w*$/.test(l)) continue; // bare directive, e.g. !Tractus
    if (/^!+$/.test(l)) continue; // stanza separator
    l = l.replace(/(^|\s)!((?:\d\s*)?[A-Za-z]\S*\s*\d+(?:\s*[-,;:]\s*\d+)*[a-z]?)/g, '$1($2)');
    // Residual `!` prose is a DO source comment/directive their engine drops
    // (e.g. `!Reliqua omittuntur…`); bracketed engine markers stay visible
    // as honest not-implemented signals.
    if (/^![^\[]/.test(l)) continue;
    if (l !== '' && lines.length > 0 && lines[lines.length - 1] === l) continue;
    lines.push(l);
  }
  return lines.join('\n');
}
