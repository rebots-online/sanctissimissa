import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  classifyBangLine,
  shouldRenderPairedBangLine,
} from '../src/core/liturgy/massSpecials.ts';

describe('bilingual bang-line presentation', () => {
  it('preserves the two reported English Ordo rubric translations', () => {
    assert.equal(
      shouldRenderPairedBangLine(
        '!The priest, bowing down at the foot of the altar, makes the Sign of the Cross, from his forehead to his breast, and says:',
        '!Sacerdos paratus cum ingreditur ad Altare, facta illi debita reverentia, signat se signo crucis a fronte ad pectus, et clara voce dicit:',
      ),
      true,
    );
    assert.equal(
      shouldRenderPairedBangLine(
        '!Then joining his hands before his breast, he begins the Anthem:',
        '!Deinde, junctis manibus ante pectus, incipit Antiphonam:',
      ),
      true,
    );
  });

  it('deduplicates only genuinely equal visible bang-line bodies', () => {
    assert.equal(shouldRenderPairedBangLine('!Ps. 42, 1-5', '!Ps. 42, 1-5'), false);
    assert.equal(shouldRenderPairedBangLine('!Ps. 42, 1-5.', '!Ps. 42, 1-5'), true);
    assert.equal(shouldRenderPairedBangLine('!  PS. 42,   1-5  ', '!Ps. 42, 1-5'), false);
  });

  it('never renders specials controls through the display branch', () => {
    for (const control of ['!*D', '!*&Introibo', '!&Credo']) {
      assert.equal(classifyBangLine(control), 'suppress');
      assert.equal(shouldRenderPairedBangLine(control, '!translated'), false);
    }
  });

  it('classifies ordinary lines outside the bang-line branch', () => {
    assert.equal(classifyBangLine('P. In the Name of the Father.'), null);
    assert.equal(shouldRenderPairedBangLine('P. In the Name of the Father.'), false);
  });

  it('wires the semantic policy into the interleaved renderer', () => {
    const source = readFileSync('src/ui/BilingualText.tsx', 'utf8');
    assert.match(source, /shouldRenderPairedBangLine\(en, la\)/);
    assert.doesNotMatch(source, /laKind\s*\?\s*null\s*:/);
  });
});
