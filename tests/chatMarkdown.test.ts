/**
 * CL.6 (§H.6) — ChatMarkdown safe renderer. The Node strip-types runner
 * cannot load .tsx modules at all (ERR_UNKNOWN_FILE_EXTENSION — the same
 * constraint documented in tests/companionSurfaces.test.ts), so the PURE
 * PARSER section of src/ui/ChatMarkdown.tsx — delimited by explicit marker
 * comments, written as plain JavaScript with JSDoc types and zero imports —
 * is extracted verbatim and imported as a data: URL module: the behavioral
 * assertions below run against the exact shipped source. The React renderer
 * half is contracted against the file text (elements only, never
 * dangerouslySetInnerHTML) together with the ChatView wiring and CSS.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/ui/ChatMarkdown.tsx', import.meta.url), 'utf8');
const chatView = readFileSync(new URL('../src/ui/ChatView.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

const parser = await import('../src/ui/chatMarkdownParser.ts');
assert.ok(source.includes("from './chatMarkdownParser.ts'"), 'the renderer imports the typed parser module directly');

/* ------------------------------------------------------------------ */
/* Inline: bold / italic / code                                        */
/* ------------------------------------------------------------------ */

test('CL.6: inline parse — bold, italic, code; nesting composes', () => {
  const tokens = parser.parseInline('a **bold** and *it* and `x > y` plain');
  assert.deepEqual(tokens, [
    { t: 'text', v: 'a ' },
    { t: 'strong', c: [{ t: 'text', v: 'bold' }] },
    { t: 'text', v: ' and ' },
    { t: 'em', c: [{ t: 'text', v: 'it' }] },
    { t: 'text', v: ' and ' },
    { t: 'code', v: 'x > y' },
    { t: 'text', v: ' plain' },
  ]);
  const nested = parser.parseInline('**b*i*c**');
  assert.deepEqual(nested, [
    { t: 'strong', c: [{ t: 'text', v: 'b' }, { t: 'em', c: [{ t: 'text', v: 'i' }] }, { t: 'text', v: 'c' }] },
  ]);
});

test('CL.6: streaming tolerance — an unclosed trailing delimiter renders literally', () => {
  const partial = parser.parseInline('unclosed **bold and `code');
  assert.ok(!partial.some((token) => token.t === 'strong' || token.t === 'code'), 'no half-open emphasis');
  const joined = partial.filter((token) => token.t === 'text').map((token) => token.v).join('');
  assert.ok(joined.includes('**bold'), 'the asterisks display literally');
  assert.ok(joined.includes('`code'), 'the backtick displays literally');
  // Completing the syntax on a later token flips it into emphasis — the
  // re-parse of the accumulated text is idempotent.
  const completed = parser.parseInline('unclosed **bold** and `code`');
  assert.ok(completed.some((token) => token.t === 'strong'));
  assert.ok(completed.some((token) => token.t === 'code'));
});

/* ------------------------------------------------------------------ */
/* Blocks: headings, lists, quotes, rules, paragraphs, tables          */
/* ------------------------------------------------------------------ */

test('CL.6: heading levels — #/##/### parse; #### is not a reply heading', () => {
  const one = parser.parseBlocks('# The Canon of the Mass')[0] as { t: string; level: number };
  const two = parser.parseBlocks('## Ordinary')[0] as { t: string; level: number };
  const three = parser.parseBlocks('### Kyrie')[0] as { t: string; level: number };
  assert.deepEqual([one.t, one.level], ['heading', 1]);
  assert.deepEqual([two.t, two.level], ['heading', 2]);
  assert.deepEqual([three.t, three.level], ['heading', 3]);
  assert.equal(parser.parseBlocks('#### deep')[0].t, 'paragraph', 'only #–### are headings');
  assert.equal(parser.headingTag(1), 'h3', '# renders as the centred h3');
  assert.equal(parser.headingTag(2), 'h4', '## renders as the centred h4');
  assert.equal(parser.headingTag(3), 'h4', '### renders as the centred h4');
});

test('CL.6: lists, quotes, rules and paragraphs parse to their block kinds', () => {
  const blocks = parser.parseBlocks('- one\n- two\n* three\n\n> quoted line\n\n---\n\njust a paragraph');
  assert.deepEqual(
    blocks.map((block) => block.t),
    ['list', 'quote', 'rule', 'paragraph'],
  );
  assert.equal((blocks[0] as { t: string; items: unknown[] }).items.length, 3, '- and * both mark list items');
  assert.deepEqual((blocks[1] as { t: string; c: unknown[] }).c, [{ t: 'text', v: 'quoted line' }]);
});

test('CL.6: GFM table — header/delimiter/body into head + rows; cells stay raw text', () => {
  const table = parser.parseBlocks('| Missal | Liber Usualis |\n| --- | --- |\n| altar book | choir book |\n| Latin + vernacular | Latin + notation |')[0];
  assert.equal(table.t, 'table');
  assert.deepEqual((table as { head: string[] }).head, ['Missal', 'Liber Usualis']);
  assert.equal((table as { rows: string[][] }).rows.length, 2);
  assert.deepEqual((table as { rows: string[][] }).rows[0], ['altar book', 'choir book']);
});

test('CL.6: cell escaping — raw model HTML in a cell stays literal text, never interpreted', () => {
  const table = parser.parseBlocks('| <b>bold?</b> & co |\n| --- |\n| <img src=x onerror=alert(1)> |')[0];
  assert.equal((table as { head: string[] }).head[0], '<b>bold?</b> & co', 'the parser never strips or interprets HTML');
  assert.equal((table as { rows: string[][] }).rows[0][0], '<img src=x onerror=alert(1)>', 'markup survives as plain text for React to escape');
  const inline = parser.parseInline('<script>alert(1)</script>');
  assert.deepEqual(inline, [{ t: 'text', v: '<script>alert(1)</script>' }], 'inline too — a text token, not an element');
});

test('CL.6: partial table tolerance — pipe rows without a delimiter stay a paragraph', () => {
  const noDelim = parser.parseBlocks('| Missal | Liber')[0];
  assert.equal(noDelim.t, 'paragraph', 'a half-streamed table renders as prose until the delimiter arrives');
  const thenComplete = parser.parseBlocks('| Missal | Liber |\n| --- | --- |')[0];
  assert.equal(thenComplete.t, 'table');
});

test('CL.6: empty text parses to no blocks', () => {
  assert.deepEqual(parser.parseBlocks(''), []);
  assert.deepEqual(parser.parseInline(''), []);
});

/* ------------------------------------------------------------------ */
/* Renderer source contract — React elements only                      */
/* ------------------------------------------------------------------ */

test('CL.6: the renderer emits React elements only — no dangerouslySetInnerHTML anywhere in the file', () => {
  assert.ok(!source.includes('dangerouslySetInnerHTML'), 'never dangerouslySetInnerHTML');
  const renderer = source.slice(source.indexOf('/* ==================== react renderer'));
  assert.ok(renderer.includes('<table>'), 'tables render as a real table element');
  assert.ok(renderer.includes('<thead>'), 'with a thead');
  assert.ok(renderer.includes('<tbody>'), 'and a tbody');
  assert.ok(renderer.includes('chat-md-table-wrap'), 'inside the overflow-x wrapper');
  assert.ok(renderer.includes('className="chat-md"'), 'the root carries the .chat-md class');
  assert.ok(renderer.includes('{renderInlineTokens(token.c, key)}'), 'inline tokens render as React children');
});

test('CL.6: ChatView passes assistant turns through ChatMarkdown; user turns and authored strings stay plain', () => {
  assert.match(chatView, /import ChatMarkdown from '\.\/ChatMarkdown\.tsx';/);
  assert.match(chatView, /<ChatMarkdown text=\{stripGuideCommands\(m\.text\)\} \/>/);
  assert.match(chatView, /: m\.text}/);
});

test('CL.6: styles.css carries the centred-heading, parchment-table and code-chip rules', () => {
  assert.ok(styles.includes('.chat-md h3, .chat-md h4 { text-align: center; font-family: inherit; }'), 'centred headings');
  assert.ok(styles.includes('.chat-md table { border-collapse: collapse; width: 100%;'), 'parchment table base');
  assert.ok(/\.chat-md th \{[^}]*--gold/.test(styles), 'the gold header rule');
  assert.ok(/\.chat-md td \{[^}]*--card-border/.test(styles), 'card-border cell rules');
  assert.ok(/\.chat-md \.chat-md-table-wrap \{ overflow-x: auto;/.test(styles), 'the overflow-x wrapper');
  assert.ok(/\.chat-md code \{[^}]*border-radius/.test(styles), 'the code chip styling');
});
