/**
 * ChatMarkdown (§H.6, CL.6) — the Companion reply formatting plane.
 * "responses need to at least format better" / "bold, centre, tables".
 *
 * A safe markdown renderer: block parse (#–### headings, -/* lists, >
 * quotes, --- rules, GFM pipe tables, paragraphs) plus inline parse
 * (**bold**, *italic*, `code`) emitting React elements only — never raw
 * HTML injection of any kind, never raw model HTML (the ResultSnippet
 * security precedent). Streaming-safe: partial syntax at the tail renders
 * literally until its closing delimiter arrives.
 *
 * Structure note: the parser half below is deliberately plain JavaScript
 * with JSDoc types and zero imports, delimited by marker comments — the
 * strip-types test runner cannot load .tsx modules at all, so
 * tests/chatMarkdown.test.ts extracts this section verbatim and imports it
 * as a data: URL module to assert the shipped parse behaviour directly.
 * The React renderer half follows behind the second marker.
 */

import type { ReactNode } from 'react';

import { headingTag, parseBlocks, parseInline, type MarkdownBlock, type MarkdownToken } from './chatMarkdownParser.ts';

export { parseInline, parseBlocks, headingTag };
export type { MarkdownToken, MarkdownBlock };

/* ==================== react renderer (§H.6 presentation) ==================== */

/** Inline tokens → React nodes; text children are escaped by React itself. */
function renderInlineTokens(tokens: MarkdownToken[], keyBase: string): ReactNode[] {
  return tokens.map((token, index): ReactNode => {
    const key = `${keyBase}-${index}`;
    if (token.t === 'strong') return <strong key={key}>{renderInlineTokens(token.c, key)}</strong>;
    if (token.t === 'em') return <em key={key}>{renderInlineTokens(token.c, key)}</em>;
    if (token.t === 'code') return <code key={key}>{token.v}</code>;
    return token.v; // plain text — React escapes it; no HTML injection surface exists
  });
}

/** One block → its React element. Tables sit in an overflow-x wrapper so a
 *  wide parchment table scrolls horizontally instead of stretching the
 *  bubble (§H.6). */
function renderBlock(block: MarkdownBlock, key: string): ReactNode {
  switch (block.t) {
    case 'heading': {
      const Tag = headingTag(block.level);
      return <Tag key={key}>{renderInlineTokens(block.c, key)}</Tag>;
    }
    case 'paragraph':
      return <p key={key}>{renderInlineTokens(block.c, key)}</p>;
    case 'list':
      return (
        <ul key={key}>
          {block.items.map((item, index) => (
            <li key={`${key}-${index}`}>{renderInlineTokens(item, `${key}-${index}`)}</li>
          ))}
        </ul>
      );
    case 'quote':
      return <blockquote key={key}>{renderInlineTokens(block.c, key)}</blockquote>;
    case 'rule':
      return <hr key={key} />;
    case 'table':
      return (
        <div className="chat-md-table-wrap" key={key}>
          <table>
            <thead>
              <tr>
                {block.head.map((cell, index) => (
                  <th key={index}>{renderInlineTokens(parseInline(cell), `${key}-h${index}`)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) => (
                    <td key={index}>{renderInlineTokens(parseInline(cell), `${key}-r${rowIndex}c${index}`)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    default:
      return null; // unreachable: the parser emits only the six block kinds
  }
}

/** §H.6: assistant replies render through this component (CL.6 wires it in
 *  ChatView); user turns and authored strings stay plain. Re-parsing the
 *  accumulated text on every streamed token is idempotent. */
export default function ChatMarkdown({ text }: { text: string }) {
  return <div className="chat-md">{parseBlocks(text).map((block, index) => renderBlock(block, `b${index}`))}</div>;
}
