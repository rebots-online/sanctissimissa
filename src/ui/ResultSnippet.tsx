/**
 * Query-emphasized bilingual result snippet component — §BS.2
 *
 * Renders a bilingual search result with the query matches emphasized
 * using <mark><strong><em>...</em></strong></mark>. The primary text
 * (chosen by relevance) is displayed first; the companion text (if present)
 * appears immediately beneath in a de-emphasized italic style.
 */

import type { BilingualResultText } from '../core/text/bilingualResult.js';

interface Props {
  result: BilingualResultText;
}

/**
 * Render text with match spans emphasized.
 *
 * @param text - Full text to render.
 * @param spans - Array of {start, end} offsets to emphasize.
 * @returns Array of React nodes (strings and mark-wrapped spans).
 */
function renderMatchedText(text: string, spans: { start: number; end: number }[]): React.ReactNode[] {
  if (!text || spans.length === 0) {
    return [text];
  }

  // Sort spans by start position
  const sorted = [...spans].sort((a, b) => a.start - b.start);

  const nodes: React.ReactNode[] = [];
  let lastEnd = 0;

  for (const span of sorted) {
    // Text before this match
    if (span.start > lastEnd) {
      nodes.push(text.slice(lastEnd, span.start));
    }

    // Matched span emphasized
    nodes.push(
      <mark key={`mark-${span.start}`} className="result-query">
        <strong>
          <em>{text.slice(span.start, span.end)}</em>
        </strong>
      </mark>
    );

    lastEnd = span.end;
  }

  // Text after last match
  if (lastEnd < text.length) {
    nodes.push(text.slice(lastEnd));
  }

  return nodes;
}

/**
 * Bilingual result snippet component.
 */
export function ResultSnippet({ result }: Props): React.ReactNode {
  return (
    <div className="result-snippet">
      {/* Primary text with emphasized matches */}
      <div className="result-primary" lang={result.primaryLang}>
        {renderMatchedText(result.primary, result.matchSpans)}
      </div>

      {/* Companion text (if present) */}
      {result.companion != null && (
        <div className="result-companion" lang={result.companionLang}>
          <em>{result.companion}</em>
        </div>
      )}
    </div>
  );
}