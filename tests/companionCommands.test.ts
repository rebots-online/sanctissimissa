import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  COMPANION_ACT,
  GUIDE_CHANGED,
  applyGuideCommand,
  parseCompanionCommand,
  stripGuideCommands,
} from '../src/core/orientation/guide.ts';

// guide.ts touches window/document only at call time, so plain stand-ins are
// enough under the Node test runner. The shims record dispatched events.
interface RecordedEvent { type: string; detail: unknown }
const recorded: RecordedEvent[] = [];
const shimWindow = new EventTarget();
shimWindow.addEventListener(COMPANION_ACT, (event) => { recorded.push({ type: event.type, detail: (event as CustomEvent).detail }); });
shimWindow.addEventListener(GUIDE_CHANGED, (event) => { recorded.push({ type: event.type, detail: (event as CustomEvent).detail }); });
(globalThis as unknown as { window: unknown }).window = shimWindow;

// one live guide target so a combined guide+act reply really highlights it
const liveGuideTargets = new Map<string, object>();
function fakeGuideElement(): object {
  return {
    tagName: 'BUTTON',
    textContent: 'Divine Office',
    classList: { add() {}, remove() {}, contains: () => false },
    getBoundingClientRect: () => ({ width: 120, height: 28 }),
    hasAttribute: () => false,
    getAttribute: () => null,
    scrollIntoView() {},
    click() {},
    offsetWidth: 0,
  };
}
(globalThis as unknown as { document: unknown }).document = {
  querySelectorAll(selector: string): object[] {
    const guide = /^\[data-guide="([a-z-]+)"\]$/.exec(selector);
    if (!guide) return [];
    const element = liveGuideTargets.get(guide[1]);
    return element ? [element] : [];
  },
};
liveGuideTargets.set('nav-office', fakeGuideElement());

const companionDispatches = () => recorded.filter((e) => e.type === COMPANION_ACT);
const guideHighlights = () => recorded.filter((e) => e.type === GUIDE_CHANGED);

beforeEach(() => { recorded.length = 0; });

test('COMPANION_ACT carries the §H.1 event name', () => {
  assert.equal(COMPANION_ACT, 'sanctissimissa:companion-act');
});

test('parseCompanionCommand recognizes every command form', () => {
  assert.deepEqual(parseCompanionCommand('The hours of the day live here.\n\n[[open:office]]'), { kind: 'open', value: 'office' });
  assert.deepEqual(parseCompanionCommand('Follow along. [[focus:Ordinary of the Mass]]'), { kind: 'focus', value: 'Ordinary of the Mass' });
  assert.deepEqual(parseCompanionCommand('For that feast. [[date:2028-02-29]]'), { kind: 'date', value: '2028-02-29' });
  assert.deepEqual(parseCompanionCommand('Stage it. [[homily-draft:easter-vigil]]'), { kind: 'homily-draft', value: 'easter-vigil' });
  assert.deepEqual(parseCompanionCommand('Mark it. [[annotate:ord-1]]'), { kind: 'annotate', value: 'ord-1' });
  assert.deepEqual(parseCompanionCommand('Look it up. [[concordance:  Alleluia  ]]'), { kind: 'concordance', value: 'Alleluia' });
  assert.deepEqual(parseCompanionCommand('Note it. [[journal:Canon of the Mass]]'), { kind: 'journal', value: 'Canon of the Mass' });
  assert.deepEqual(parseCompanionCommand('Walk there. [[show-path:view:office > section:canon]]'), { kind: 'show-path', value: 'view:office > section:canon' });
  // tight separators normalize; a registered guide id and section anchors are steps too
  assert.deepEqual(parseCompanionCommand('[[show-path:nav-map>view:reader>section:gloria]]'), { kind: 'show-path', value: 'nav-map > view:reader > section:gloria' });
});

test('parseCompanionCommand finds the act beside a trailing guide command', () => {
  assert.deepEqual(parseCompanionCommand('Answer. [[guide:nav-office]] [[open:office]]'), { kind: 'open', value: 'office' });
  assert.deepEqual(parseCompanionCommand('Answer. [[open:office]] [[guide:nav-office]]'), { kind: 'open', value: 'office' });
});

test('parseCompanionCommand rejects invalid commands', () => {
  // invalid view
  assert.equal(parseCompanionCommand('Bad. [[open:nonsense]]'), null);
  // invalid dates: wrong pattern, impossible day, impossible month
  assert.equal(parseCompanionCommand('Bad. [[date:09/19/2026]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[date:2026-02-30]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[date:2026-13-01]]'), null);
  // invalid paths: one step, seven steps, empty step, unknown view, unknown bare target
  assert.equal(parseCompanionCommand('Bad. [[show-path:view:office]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[show-path:view:map > view:reader > view:bible > view:office > view:calendar > view:journal > view:settings]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[show-path:view:office >> section:canon]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[show-path:view:nonsense > section:canon]]'), null);
  assert.equal(parseCompanionCommand('Bad. [[show-path:view:office > nonsense]]'), null);
  // value bounds: empty and 81-char terms
  assert.equal(parseCompanionCommand('Bad. [[concordance:   ]]'), null);
  assert.equal(parseCompanionCommand(`Bad. [[journal:${'x'.repeat(81)}]]`), null);
  assert.equal(parseCompanionCommand('Bad. [[focus:]]'), null);
  // only a TRAILING command counts; guide alone is not a companion act
  assert.equal(parseCompanionCommand('[[open:office]] is not at the end here.'), null);
  assert.equal(parseCompanionCommand('Only a guide. [[guide:nav-office]]'), null);
});

test('applyGuideCommand dispatches a valid act and returns true', () => {
  assert.equal(applyGuideCommand('The hours live here. [[open:office]]'), true);
  assert.equal(companionDispatches().length, 1);
  assert.deepEqual(companionDispatches()[0].detail, { kind: 'open', value: 'office' });
  assert.equal(guideHighlights().length, 0);
});

test('applyGuideCommand rejects invalid view/date/steps without dispatching', () => {
  for (const reply of ['Bad. [[open:nonsense]]', 'Bad. [[date:2026-02-30]]', 'Bad. [[show-path:view:office]]']) {
    recorded.length = 0;
    assert.equal(applyGuideCommand(reply), false, reply);
    assert.equal(companionDispatches().length, 0, reply);
  }
});

test('applyGuideCommand applies a combined guide + act reply, in either order', () => {
  assert.equal(applyGuideCommand('Look here first. [[guide:nav-office]] [[open:office]]'), true);
  assert.equal(companionDispatches().length, 1);
  assert.deepEqual(companionDispatches()[0].detail, { kind: 'open', value: 'office' });
  assert.equal(guideHighlights().length, 1);

  recorded.length = 0;
  assert.equal(applyGuideCommand('Look here first. [[open:office]] [[guide:nav-office]]'), true);
  assert.equal(companionDispatches().length, 1);
  assert.deepEqual(companionDispatches()[0].detail, { kind: 'open', value: 'office' });
  assert.equal(guideHighlights().length, 1);
});

test('applyGuideCommand aborts the batch when the act is invalid', () => {
  assert.equal(applyGuideCommand('Mixed. [[guide:nav-office]] [[open:nonsense]]'), false);
  assert.equal(companionDispatches().length, 0);
  assert.equal(guideHighlights().length, 0);
});

test('plain replies carry no command', () => {
  assert.equal(parseCompanionCommand('Just an ordinary answer.'), null);
  assert.equal(applyGuideCommand('Just an ordinary answer.'), false);
  assert.equal(recorded.length, 0);
});

test('stripGuideCommands removes every command form', () => {
  assert.equal(stripGuideCommands('Answer [[guide:nav-map]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[open:office]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[focus:Ordinary of the Mass]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[date:2026-09-19]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[homily-draft:easter-vigil]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[annotate:ord-1]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[concordance:Alleluia]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[journal:Canon]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[show-path:view:office > section:canon]]'), 'Answer');
  // combined suffixes disappear whole, trailing whitespace included
  assert.equal(stripGuideCommands('Answer [[guide:nav-map]] [[open:office]]'), 'Answer');
  assert.equal(stripGuideCommands('Answer [[open:office]]\n\n'), 'Answer');
  // invalid commands never display either
  assert.equal(stripGuideCommands('Answer [[open:nonsense]]'), 'Answer');
  assert.equal(stripGuideCommands('No commands here.'), 'No commands here.');
});

test('diagnostics contract — dispatch and rejection are recorded (§H.1)', () => {
  const source = readFileSync(new URL('../src/core/orientation/guide.ts', import.meta.url), 'utf8');
  assert.ok(source.includes("debugEvent('companion', 'command.dispatch', act, 'info')"), 'dispatch event present');
  assert.ok(source.includes("debugEvent('companion', 'command.rejected', { raw: text }, 'warn')"), 'rejection event present');
});
