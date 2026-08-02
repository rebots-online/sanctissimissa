import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMassSpecials,
  applyMassSpecialsBilingual,
  isSpecialsControlLine,
  isScriptureCitationLine,
  type MassSpecialsContext,
} from '../src/core/liturgy/massSpecials.ts';

const base = (over: Partial<MassSpecialsContext> = {}): MassSpecialsContext => ({
  solemn: false,
  requiem: false,
  passiontide: false,
  sunday: true,
  winnerPath: 'Tempora/Pent01-0',
  rank: 5,
  rule: '',
  season: 'Time after Pentecost',
  weekKey: 'Pent01',
  ...over,
});

/** Fragment shaped like real Ordo.txt Incipit (blank-line skip scopes). */
const INCIPIT = `# Incipit
!Sacerdos paratus cum ingreditur ad Altare.
v. In nómine Patris, + et Fílii, et Spíritus Sancti. Amen.

!*D
!In Missis Defunctorum rubric only for dead Masses.

!Deinde, junctis manibus ante pectus, incipit Antiphonam:
S. Introíbo ad altáre Dei.
M. Ad Deum, qui lætíficat juventútem meam.
!*&Introibo
!Postea alternatim cum Ministris dicit sequentem:
!Ps. 42, 1-5
S. Júdica me, Deus, et discérne causam meam de gente non sancta.
M. Quia tu es, Deus, fortitúdo mea.
S. Introíbo ad altáre Dei.
M. Ad Deum, qui lætíficat juventútem meam.

!Signat se, dicens:
V. Adjutórium nostrum + in nómine Dómini.
R. Qui fecit cælum et terram.

!*S
# Incensatio
!In Missa sollemni, Celebrans incensat altare.
Ab illo bene + dicáris, in cujus honóre cremáberis. Amen.

# Introitus
&introitus
`;

describe('massSpecials', () => {
  it('never emits !* or bare !& control lines', () => {
    const out = applyMassSpecials(INCIPIT, base());
    assert.ok(!out.includes('!*'));
    assert.ok(!/^\s*!&/m.test(out));
    assert.ok(!out.includes('*&Introibo'));
    assert.ok(!out.includes('*D'));
    assert.ok(!out.includes('*S'));
  });

  it('keeps Judica block on ordinary Sunday (Introibo hook false)', () => {
    const out = applyMassSpecials(INCIPIT, base({ sunday: true, passiontide: false, requiem: false }));
    assert.match(out, /Júdica me/);
    assert.match(out, /Introíbo ad altáre/);
    assert.match(out, /!Ps\. 42/);
  });

  it('omits Judica block in Passiontide', () => {
    const out = applyMassSpecials(INCIPIT, base({ passiontide: true, sunday: false, weekKey: 'Quad5' }));
    assert.ok(!/Júdica me/.test(out), out);
    assert.match(out, /Introíbo ad altáre/);
    assert.match(out, /Adjutórium nostrum/);
  });

  it('omits Judica block in Requiem', () => {
    const out = applyMassSpecials(INCIPIT, base({ requiem: true }));
    assert.ok(!/Júdica me/.test(out));
  });

  it('omits !*S incense block when Low Mass (solemn=false)', () => {
    const out = applyMassSpecials(INCIPIT, base({ solemn: false }));
    assert.ok(!/cremáberis/.test(out));
    assert.ok(!/# Incensatio/.test(out));
  });

  it('keeps !*S incense block when Solemn', () => {
    const out = applyMassSpecials(INCIPIT, base({ solemn: true }));
    assert.match(out, /cremáberis/);
    assert.match(out, /# Incensatio/);
  });

  it('shows !*D defunct-only rubric only in Requiem', () => {
    const normal = applyMassSpecials(INCIPIT, base({ requiem: false }));
    const dead = applyMassSpecials(INCIPIT, base({ requiem: true }));
    assert.ok(!/Missis Defunctorum rubric/.test(normal));
    assert.match(dead, /Missis Defunctorum rubric/);
  });

  it('bilingual lockstep drops English with Latin skips', () => {
    const la = '!*&Introibo\nA\nB\n\nC\n';
    const en = '!*&Introibo\nA-en\nB-en\n\nC-en\n';
    const { latin, english } = applyMassSpecialsBilingual(la, en, base({ passiontide: true }));
    assert.equal(latin.trim(), 'C');
    assert.equal(english.trim(), 'C-en');
  });
});

describe('line classifiers', () => {
  it('detects specials controls', () => {
    assert.equal(isSpecialsControlLine('!*&Introibo'), true);
    assert.equal(isSpecialsControlLine('!*S'), true);
    assert.equal(isSpecialsControlLine('!&Credo'), true);
    assert.equal(isSpecialsControlLine('!Ps. 42, 1-5'), false);
  });

  it('detects scripture citations', () => {
    assert.equal(isScriptureCitationLine('!Ps. 42, 1-5'), true);
    assert.equal(isScriptureCitationLine('!The priest approaches'), false);
    assert.equal(isScriptureCitationLine('!*&Introibo'), false);
  });
});
