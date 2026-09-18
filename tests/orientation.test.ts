import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDE_KEY, GUIDE_STEPS, readGuideState, saveGuideState, guideTarget } from '../src/core/orientation/guide.ts';

test('orientation remains incomplete until explicitly finished and resumes the saved step', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.deepEqual(readGuideState(storage), { completed: false, step: 0 });
  saveGuideState({ completed: false, step: 3 }, storage);
  assert.deepEqual(readGuideState(storage), { completed: false, step: 3 });
  saveGuideState({ completed: true, step: 5 }, storage);
  assert.equal(readGuideState(storage).completed, true);
  values.set(GUIDE_KEY, '{invalid');
  assert.deepEqual(readGuideState(storage), { completed: false, step: 0 });
  values.set(GUIDE_KEY, JSON.stringify({ completed: 'true', step: 1000 }));
  assert.deepEqual(readGuideState(storage), { completed: false, step: GUIDE_STEPS.length - 1 });
});

test('Companion cannot turn arbitrary selectors into DOM actions', () => {
  let queries = 0;
  const root = { querySelectorAll() { queries++; return []; } } as unknown as Document;
  assert.equal(guideTarget('nav-settings"] button', root), null);
  assert.equal(queries, 0);
  assert.equal(guideTarget('nav-settings', root), null);
  assert.equal(queries, 1);
});

test('Mass map has no sticky Scripture or Office mode', () => {
  const map = readFileSync(new URL('../src/ui/SubwayMap.tsx', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(map, /ScriptureSubway|OfficeSubway|MapMode|onModeChange/);
  assert.doesNotMatch(app, /mapMode|setMapMode/);
});
