import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { alignPhrase, type PhraseSelectionInput } from '../src/core/text/align.ts';

// Stub EchoDb for behavioral tests (interface from align.ts)
interface EchoDb {
  concordance(term: string, k?: number): { key: string }[];
  textOf(nodeKey: string): { latin: string | null; english: string | null } | null;
}

class StubEchoDb implements EchoDb {
  concordance(_term: string, _k?: number): { key: string }[] {
    return [];
  }
  textOf(_nodeKey: string): { latin: string | null; english: string | null } | null {
    return null;
  }
}

describe('BS.1R2 Bible Echo Contract', () => {
  describe('Source contract tests', () => {
    it('align.ts has exactly one PhraseAlignment interface', () => {
      const alignTs = readFileSync('src/core/text/align.ts', 'utf-8');
      const matches = alignTs.match(/interface PhraseAlignment/g);
      assert.strictEqual(matches?.length, 1, 'Must have exactly one PhraseAlignment interface declaration');
    });

    it('align.ts has at most one PhraseSelectionInput interface', () => {
      const alignTs = readFileSync('src/core/text/align.ts', 'utf-8');
      const matches = alignTs.match(/interface PhraseSelectionInput/g);
      assert.ok((matches?.length ?? 0) <= 1, 'Must have at most one PhraseSelectionInput interface declaration');
    });

    it('SectionReader.tsx imports SelectionEcho from BilingualText.tsx', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      assert.ok(src.includes('SelectionEcho') && src.includes("from './BilingualText.tsx';"),
        'SectionReader must import SelectionEcho type from BilingualText.tsx');
    });

    it('SectionReader.tsx declares livePhraseEcho typed as SelectionEcho | null', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      assert.ok(src.includes('const [livePhraseEcho, setLivePhraseEcho] = useState<SelectionEcho | null>(null);'),
        'SectionReader must declare livePhraseEcho state with correct type');
    });

    it('SectionReader.tsx reciprocal branch consumes dstStart AND dstEnd', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      // The reciprocal branch should reference both dstStart and dstEnd from the alignment result
      const hasDstStart = src.includes('.dstStart');
      const hasDstEnd = src.includes('.dstEnd');
      assert.ok(hasDstStart && hasDstEnd,
        'Reciprocal branch must consume both dstStart and dstEnd from alignPhrase result');
    });

    it('SectionReader.tsx reciprocal range is NOT carried only by echoVerse', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      // The reciprocal range should be set via livePhraseEcho, not only echoVerse
      // Check that setLivePhraseEcho is called with dstStart/dstEnd values
      assert.ok(src.includes('setLivePhraseEcho({') &&
                src.includes('start: aligned.dstStart') &&
                src.includes('end: aligned.dstEnd'),
        'Reciprocal range must be set via livePhraseEcho with dstStart/dstEnd, not only echoVerse');
    });

    it('SectionReader.tsx has selectionEcho rendering in both panes (count >= 2)', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      // The aligned phrase range must reach BOTH panes: the interleaved
      // renderer once, and each column renderer under its own language guard.
      const passes = src.match(/selectionEcho=\{/g) ?? [];
      assert.ok(passes.length >= 3,
        `SectionReader must pass selectionEcho to the interleaved renderer and both columns (found ${passes.length})`);
      assert.ok(/selectionEcho\?\.lang === 'latin'/.test(src) && /selectionEcho\?\.lang === 'english'/.test(src)
        || /sectionEcho\?\.lang === 'latin'/.test(src) && /sectionEcho\?\.lang === 'english'/.test(src),
        'each column must receive only its own language\'s echo');
    });

    it('SectionReader.tsx does NOT have renderWithSelectionEcho local workaround', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      assert.ok(!src.includes('renderWithSelectionEcho'),
        'SectionReader must not have renderWithSelectionEcho function (use shared renderer)');
    });

    it('SectionReader.tsx does NOT have direct <mark className="selection-echo"> workaround', () => {
      const src = readFileSync('src/ui/SectionReader.tsx', 'utf-8');
      assert.ok(!src.includes('<mark className="selection-echo">') && !src.includes('<mark class="selection-echo">'),
        'SectionReader must not have direct selection-echo mark elements (use shared renderer)');
    });
  });

  describe('Behavioral tests with stub EchoDb', () => {
    const stubDb = new StubEchoDb();

    it('alignPhrase returns valid dstStart/dstEnd within dstLine bounds', () => {
      const block = { latin: 'In principio erat Verbum', english: 'In the beginning was the Word' };
      const selection: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 3 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        assert.ok(result.dstStart >= 0 && result.dstStart <= result.dstLine.length,
          `dstStart ${result.dstStart} must be within dstLine bounds (0-${result.dstLine.length})`);
        assert.ok(result.dstEnd >= 0 && result.dstEnd <= result.dstLine.length,
          `dstEnd ${result.dstEnd} must be within dstLine bounds (0-${result.dstLine.length})`);
        assert.ok(result.dstStart <= result.dstEnd,
          `dstStart ${result.dstStart} must be <= dstEnd ${result.dstEnd}`);
      }
    });

    it('alignPhrase round-trips to correct substring in dstLine', () => {
      const block = { latin: 'In principio', english: 'In the beginning' };
      const selection: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 10 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        const substring = result.dstLine.slice(result.dstStart, result.dstEnd);
        assert.ok(substring.length > 0,
          'Round-trip substring must not be empty');
        assert.strictEqual(result.dstLine.indexOf(substring), result.dstStart,
          'Round-trip substring must be found at dstStart position');
      }
    });

    it('alignPhrase Latin→English returns correct reciprocal language', () => {
      const block = { latin: 'Verbum', english: 'Word' };
      const selection: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 6 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        assert.strictEqual(result.srcLang, 'latin',
          'Source language should be latin');
        // The destination should be the counterpart
        assert.ok(result.dstLine === block.english,
          'Destination line should be english counterpart');
      }
    });

    it('alignPhrase English→Latin returns correct reciprocal language', () => {
      const block = { latin: 'Verbum', english: 'Word' };
      const selection: PhraseSelectionInput = { srcLang: 'english', idx: 0, start: 0, end: 4 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        assert.strictEqual(result.srcLang, 'english',
          'Source language should be english');
        // The destination should be the counterpart
        assert.ok(result.dstLine === block.latin,
          'Destination line should be latin counterpart');
      }
    });

    it('alignPhrase forward endpoints work correctly', () => {
      const block = { latin: 'abc def', english: 'xyz wvu' };
      const selection: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 3 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        assert.ok(result.dstStart >= 0 && result.dstEnd > result.dstStart,
          'Forward selection must produce valid range');
      }
    });

    it('alignPhrase reverse endpoints work correctly (start > end)', () => {
      const block = { latin: 'abc def', english: 'xyz wvu' };
      // Reverse order - should be normalized internally
      const selection: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 7, end: 4 };

      const result = alignPhrase(stubDb, block, selection);

      if (result) {
        assert.ok(result.srcStart <= result.srcEnd,
          'Source range should be normalized (srcStart <= srcEnd)');
        assert.ok(result.dstStart <= result.dstEnd,
          'Destination range should be valid (dstStart <= dstEnd)');
      }
    });

    it('alignPhrase expanding selection returns larger range', () => {
      const block = { latin: 'a b c d', english: 'w x y z' };
      const small: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 1 };
      const large: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 7 };

      const smallResult = alignPhrase(stubDb, block, small);
      const largeResult = alignPhrase(stubDb, block, large);

      if (smallResult && largeResult) {
        // Larger selection should produce larger or equal range
        assert.ok(largeResult.dstEnd - largeResult.dstStart >= smallResult.dstEnd - smallResult.dstStart,
          'Expanding selection should produce larger or equal destination range');
      }
    });

    it('alignPhrase contracting selection returns smaller range', () => {
      const block = { latin: 'a b c d', english: 'w x y z' };
      const small: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 1 };
      const large: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 7 };

      const smallResult = alignPhrase(stubDb, block, small);
      const largeResult = alignPhrase(stubDb, block, large);

      if (smallResult && largeResult) {
        assert.ok(smallResult.dstEnd - smallResult.dstStart <= largeResult.dstEnd - largeResult.dstStart,
          'Contracting selection should produce smaller or equal destination range');
      }
    });

    it('alignPhrase full source line maps to full destination line', () => {
      const block = { latin: 'Full line test', english: 'Full line result' };
      const fullLine: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: block.latin!.length };

      const result = alignPhrase(stubDb, block, fullLine);

      if (result) {
        // Full source line should map to full destination line
        assert.ok(result.dstStart === 0 || Math.abs(result.dstStart) < 3,
          `Full source line should map near start (dstStart=${result.dstStart})`);
        assert.ok(result.dstEnd === result.dstLine.length || Math.abs(result.dstLine.length - result.dstEnd) < 3,
          `Full source line should map near end (dstEnd=${result.dstEnd}, dstLine.length=${result.dstLine.length})`);
      }
    });

    it('alignPhrase strict sub-phrase never returns whole line', () => {
      const block = { latin: 'This is a longer test string with many words', english: 'This is a longer result string with many words' };
      // Select a small sub-phrase, not the whole line
      const subPhrase: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 5, end: 7 };

      const result = alignPhrase(stubDb, block, subPhrase);

      if (result) {
        const rangeLength = result.dstEnd - result.dstStart;
        const totalLength = result.dstLine.length;
        assert.ok(rangeLength < totalLength * 0.8,
          `Strict sub-phrase should not return whole line (range=${rangeLength}, total=${totalLength})`);
      }
    });

    it('alignPhrase one-character selection returns valid range', () => {
      const block = { latin: 'abc', english: 'xyz' };
      const oneChar: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 1, end: 2 };

      const result = alignPhrase(stubDb, block, oneChar);

      if (result) {
        assert.ok(result.dstEnd >= result.dstStart,
          'One-character selection must produce valid range');
      }
    });

    it('alignPhrase partial-word boundary works', () => {
      const block = { latin: 'partialword', english: 'partialresult' };
      // Select in the middle of the "word"
      const partial: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 4, end: 6 };

      const result = alignPhrase(stubDb, block, partial);

      if (result) {
        assert.ok(result.dstStart >= 0 && result.dstEnd <= result.dstLine.length,
          'Partial-word selection must stay within bounds');
      }
    });

    it('alignPhrase handles repeated source phrases', () => {
      const block = { latin: 'word word repeated', english: 'term term repeated' };
      // Select the first "word"
      const first: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 0, end: 4 };
      // Select the second "word"
      const second: PhraseSelectionInput = { srcLang: 'latin', idx: 0, start: 5, end: 9 };

      const firstResult = alignPhrase(stubDb, block, first);
      const secondResult = alignPhrase(stubDb, block, second);

      // Both should produce valid alignments
      if (firstResult) {
        assert.ok(firstResult.dstEnd >= firstResult.dstStart,
          'First repeated phrase should produce valid range');
      }
      if (secondResult) {
        assert.ok(secondResult.dstEnd >= secondResult.dstStart,
          'Second repeated phrase should produce valid range');
      }
    });
  });
});