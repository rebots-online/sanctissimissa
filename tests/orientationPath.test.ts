import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// OG.10 — Didactic path walkthrough: the active ribbon (§H.4). Source-contract
// test like its siblings: OrientationGuide is a React/browser component.

const source = readFileSync(new URL('../src/ui/OrientationGuide.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

test('OG.10: OrientationGuide listens on exactly the channel App forwards show-path on', () => {
  assert.match(source, /const COMPANION_SHOWPATH = 'sanctissimissa:companion-showpath';/,
    'mirrors App.tsx\'s private channel const');
  assert.match(source, /window\.addEventListener\(COMPANION_SHOWPATH, onShowPath\)/);
  assert.match(source, /window\.removeEventListener\(COMPANION_SHOWPATH, onShowPath\)/);
  assert.match(appSource, /const COMPANION_SHOWPATH = 'sanctissimissa:companion-showpath';/,
    'App (CL.2) declares the same channel');
  assert.match(appSource, /new CustomEvent\(COMPANION_SHOWPATH, \{ detail: \{ steps \} \}\)/,
    'App forwards the steps detail');
});

test('OG.10: COMPANION_SHOWPATH enters path mode with the reply\'s PathStep[]', () => {
  assert.match(source, /import type \{ GuidePos, PathStep \} from '\.\.\/core\/orientation\/guide\.ts';/,
    'PathStep is the CL.1-authoritative type');
  assert.match(source, /interface PathWalk \{ steps: PathStep\[\]; index: number \}/);
  assert.match(source, /const steps = \(event as CustomEvent<\{ steps\?: PathStep\[\] \}>\)\.detail\?\.steps;/,
    'steps read from the event detail');
  assert.match(source, /if \(!Array\.isArray\(steps\) \|\| steps\.length === 0\) return;/,
    'an empty or malformed payload never enters path mode');
  assert.match(source, /setPath\(\{ steps, index: 0 \}\)/, 'enters at the first step');
  assert.match(source, /debugEvent\('orientation', 'path\.enter', \{ steps: steps\.length \}, 'info'\)/,
    'entry recorded to Diagnostics');
});

test('OG.10: each step spotlights its target through the shared .orientation-target grammar', () => {
  const start = source.indexOf('if (!path) return;');
  const end = source.indexOf('}, [path]);', start);
  assert.ok(start >= 0 && end > start, 'the per-step effect exists');
  const effect = source.slice(start, end);
  assert.match(effect, /const element = pathTargetElement\(current\.target\);/,
    'the step token resolves to a live element');
  assert.match(effect, /for \(const previous of document\.querySelectorAll\('\.orientation-target'\)\) previous\.classList\.remove\('orientation-target'\);/,
    'the previous step\'s target is released');
  assert.match(effect, /element\.classList\.add\('orientation-target'\);/,
    'the step\'s target takes the shared highlight class — OG.9 spotlights and the §H.3 attention flip follow it');
  assert.match(effect, /element\.scrollIntoView\(\{ block: 'center', inline: 'nearest', behavior: 'smooth' \}\);/,
    'the target is brought into view');
});

test('OG.10: steps whose target is not live-rendered are skipped with a record — never faked', () => {
  const start = source.indexOf('if (!path) return;');
  const end = source.indexOf('}, [path]);', start);
  const effect = source.slice(start, end);
  assert.match(effect, /if \(!element\) \{[\s\S]*?debugEvent\('orientation', 'path\.skip', \{ target: current\.target, index: path\.index \}, 'warn'\);[\s\S]*?setPath\(\(walk\) => walk && \{ \.\.\.walk, index: walk\.index \+ 1 \}\);[\s\S]*?return;/,
    'unresolvable target: diagnostics record, advance past it');
  assert.doesNotMatch(effect, /highlightGuide\(/,
    'no fallback highlight is invented for a missing target');
  assert.match(source, /element\.getAttribute\(name\) === value/,
    'resolution is attribute-compare (App\'s own pattern) — values never enter a selector');
  assert.match(source, /findByAttribute\(root, 'data-guide', `nav-\$\{view\[1\]\}`\)/,
    'view:<View> resolves to the rail\'s own nav button for that view');
  assert.match(source, /findByAttribute\(root, 'data-section', anchor\)/,
    'section:<anchor> resolves to the live [data-section] node');
  assert.match(source, /return guideTarget\(target, root\);/,
    'anything else must be a registered guide id');
});

test('OG.10: the narration renders in the guide card with a progress ribbon', () => {
  assert.match(source, /<p>\{pathStep\.narration \|\| `Here: \$\{pathTargetLabel\(pathStep\.target\)\}\.`\}<\/p>/,
    'the reply\'s narration line is the card body (with an un-narrated fallback)');
  assert.match(source, /className="tour-ribbon"/, 'the ribbon renders on the card');
  assert.match(source, /walkIndex < \(path\?\.index \?\? 0\) \? 'visited' : walkIndex === \(path\?\.index \?\? 0\) \? 'current' : ''/,
    'one marker per step: visited / current / upcoming');
  assert.match(css, /\.tour-ribbon span\.visited \{ background: var\(--gold/, 'visited markers are --gold');
  assert.match(css, /\.tour-ribbon span\.current \{ background: var\(--accent/, 'the current marker is --accent');
});

test('OG.10: the card offers Show me / Back / Next / End walkthrough, dismissible at every step', () => {
  const actions = source.slice(source.indexOf('<div className="orientation-actions">'), source.indexOf('</div>', source.indexOf('End walkthrough')));
  assert.ok(actions.length > 0, 'the actions row exists');
  assert.match(actions, /<button onClick=\{activatePathStep\}>Show me<\/button>/, 'Show me');
  assert.match(actions, /<button onClick=\{endPath\}>End walkthrough<\/button>/, 'End walkthrough — offered unconditionally, not gated by step index');
  assert.match(actions, /Math\.max\(0, walk\.index - 1\)/, 'Back never steps before the first step');
  assert.match(actions, /index: walk\.index \+ 1 \}\)\}>Next</, 'Next advances one step');
  assert.match(source, /const heading = pathStep && path[\s\S]*?`Walkthrough \$\{path\.index \+ 1\} of \$\{path\.steps\.length\}: \$\{pathTargetLabel\(pathStep\.target\)\}`/,
    'the card heading walks the steps in order');
});

test('OG.10: Show me executes the step\'s own action — never a synthetic navigation', () => {
  const start = source.indexOf('const activatePathStep = () => {');
  const end = source.indexOf('};', start);
  assert.ok(start >= 0 && end > start, 'activatePathStep exists');
  const body = source.slice(start, end);
  assert.match(body, /scrollIntoView\(\{ block: 'center', inline: 'nearest', behavior: 'smooth' \}\)/, 'reveals the target');
  assert.match(body, /element\.classList\.add\('orientation-showing'\);/,
    'the §D showing pulse plays on the step\'s own target');
  assert.match(body, /\(element\.closest\('button, a, \[role="button"\]'\) as HTMLElement \| null\)\?\.click\(\);/,
    'activation goes through the control\'s own click path — content sections are revealed, not clicked');
  assert.doesNotMatch(body, /setView|dispatchEvent\(new CustomEvent\(COMPANION_ACT/,
    'no synthetic navigation bypassing the app\'s own controls');
});

test('OG.10: ending the walkthrough restores the normal card and clears the veil', () => {
  const start = source.indexOf('const endPath = () => {');
  const end = source.indexOf('};', start);
  assert.ok(start >= 0 && end > start, 'endPath exists');
  const body = source.slice(start, end);
  assert.match(body, /setPath\(null\)/, 'path mode cleared');
  assert.match(body, /setSpotRect\(null\)/, 'the spotlight veil cleared');
  assert.match(body, /clearGuide\(\)/, 'the held target released');
  assert.match(body, /if \(active\) setUnavailable\(!highlightGuide\(GUIDE_STEPS\[step\]\.id\)\)/,
    'a tour interrupted by the walkthrough resumes its own highlighted step');
});

test('OG.10: §D caps hold throughout — the walkthrough reuses the capped card, no third surface', () => {
  const asides = source.match(/<aside[\s\S]*?>/g) ?? [];
  assert.equal(asides.length, 2, 'exactly the two capped card asides (offer + guide); path mode borrows the guide card');
  assert.match(source, /\{compact \? <details><summary>Details<\/summary>\{cardBody\}<\/details> : cardBody\}/,
    'path content flows through the same compact disclosure and its 24dvh internal-scroll cap');
  assert.match(source, /const cardBody = path \? pathBody : stepBody;/, 'one body slot: path or tour');
  assert.match(source, /if \(!active && !pointed && !path\) return null;/, 'the card mounts for path mode');
});

test('OG.10: path steps receive the OG.9 spotlight and their own diagnostics records', () => {
  assert.match(source, /const held = active \|\| path !== null;/,
    'the OG.9 veil is held for show-path steps exactly as for tour steps');
  assert.match(source, /debugEvent\('orientation', 'path\.step', \{ target: current\.target, index: path\.index \}, 'info'\)/,
    'each walked step recorded');
  assert.match(source, /debugEvent\('orientation', 'path\.activate', \{ target: current\.target, index: path\.index \}, 'info'\)/,
    'each Show me recorded');
});
