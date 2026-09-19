/**
 * chatMarkdownParser (§H.6, CL.6) — the pure parser half of the Companion
 * reply formatting plane. Plain typed TS, zero imports, no JSX: block parse
 * (#–### headings, -/* lists, > quotes, --- rules, GFM pipe tables,
 * paragraphs) plus inline parse (**bold**, *italic*, `code`). Streaming-safe:
 * unclosed delimiters and unfinished table shapes render literally until
 * their syntax completes, so re-parsing the accumulated text per token never
 * flickers. Emitted cell/prose text stays raw — the React renderer emits it
 * as text children (React escapes), so raw model HTML can never enter the
 * tree (the ResultSnippet security precedent).
 */

export type MarkdownToken =
  | { t: 'text'; v: string }
  | { t: 'strong'; c: MarkdownToken[] }
  | { t: 'em'; c: MarkdownToken[] }
  | { t: 'code'; v: string };

export type MarkdownBlock =
  | { t: 'heading'; level: 1 | 2 | 3; c: MarkdownToken[] }
  | { t: 'paragraph'; c: MarkdownToken[] }
  | { t: 'list'; items: MarkdownToken[][] }
  | { t: 'quote'; c: MarkdownToken[] }
  | { t: 'rule' }
  | { t: 'table'; head: string[]; rows: string[][] };

export function parseInline(text: string): MarkdownToken[] {
  const out: MarkdownToken[] = [];
  let plain = '';
  const flush = (): void => {
    if (plain) {
      out.push({ t: 'text', v: plain });
      plain = '';
    }
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '*' && text[i + 1] === '*') {
      const close = text.indexOf('**', i + 2);
      if (close !== -1) {
        flush();
        out.push({ t: 'strong', c: parseInline(text.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    } else if (ch === '*') {
      const close = text.indexOf('*', i + 1);
      if (close !== -1) {
        flush();
        out.push({ t: 'em', c: parseInline(text.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    } else if (ch === '`') {
      const close = text.indexOf('`', i + 1);
      if (close !== -1) {
        flush();
        out.push({ t: 'code', v: text.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }
    plain += ch;
    i += 1;
  }
  flush();
  return out;
}

/**
 * The panel renders section headings centred (§H.6): `#` is the strongest
 * heading the bubble carries (h3 — the panel header owns h3+ context above
 * it), `##` and `###` map to h4. `####` and deeper are not headings in the
 * reply grammar and fall through to paragraphs.
 */
export function headingTag(level: 1 | 2 | 3): 'h3' | 'h4' {
  return level === 1 ? 'h3' : 'h4';
}

/** A GFM delimiter row: pipes, dashes, optional alignment colons, nothing
 * else (and at least one dash + one pipe so a plain prose line can never
 * read as a table skeleton). */
function isTableDelimiter(line: string): boolean {
  const t = line.trim();
  return t.includes('|') && t.includes('-') && /^[:|\-\s]+$/.test(t);
}

/** Split one table row into trimmed cells, dropping the optional leading and
 * trailing pipe. Cell text is kept raw (never HTML-interpreted). */
function splitRow(line: string): string[] {
  let t = line.trim();
  if (t.startsWith('|')) t = t.slice(1);
  if (t.endsWith('|')) t = t.slice(0, -1);
  return t.split('|').map((cell) => cell.trim());
}

/** Block markdown. A pipe row only becomes a table when its NEXT line is a
 * delimiter row — while a table streams, the unfinished rows render as an
 * ordinary paragraph until the shape completes. */
export function parseBlocks(text: string): MarkdownBlock[] {
  const lines = text.split('\n');
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = (): void => {
    if (paragraph.length) {
      blocks.push({ t: 'paragraph', c: parseInline(paragraph.join('\n')) });
      paragraph = [];
    }
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ t: 'heading', level: heading[1].length as 1 | 2 | 3, c: parseInline(heading[2].trim()) });
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flushParagraph();
      blocks.push({ t: 'rule' });
      continue;
    }
    if (isTableDelimiter(line) && paragraph.length === 1 && paragraph[0].includes('|')) {
      const head = splitRow(paragraph[0]);
      paragraph = [];
      const rows: string[][] = [];
      while (i + 1 < lines.length && lines[i + 1].trim() && lines[i + 1].includes('|')) {
        i += 1;
        rows.push(splitRow(lines[i]));
      }
      blocks.push({ t: 'table', head, rows });
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      const items: MarkdownToken[][] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(parseInline(lines[i].replace(/^[-*]\s+/, '')));
        i += 1;
      }
      i -= 1;
      blocks.push({ t: 'list', items });
      continue;
    }
    if (/^>\s?/.test(line)) {
      flushParagraph();
      const quoted: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoted.push(lines[i].replace(/^>\s?/, ''));
        i += 1;
      }
      i -= 1;
      blocks.push({ t: 'quote', c: parseInline(quoted.join('\n')) });
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  return blocks;
}
