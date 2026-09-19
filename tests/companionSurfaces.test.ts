/**
 * CL.5 — Document-plane surfaces: homily staging, annotation,
 * concordance/journal (§H.1). Source-contract tests over the four surfaces
 * (same convention as orientationGuide.test.ts — the Node strip-types runner
 * cannot load .tsx modules, so the exported helpers are contracted against
 * their exact function bodies).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homily = readFileSync(new URL('../src/ui/HomilyPlanner.tsx', import.meta.url), 'utf8');
const reader = readFileSync(new URL('../src/ui/SectionReader.tsx', import.meta.url), 'utf8');
const meaning = readFileSync(new URL('../src/ui/MeaningPanel.tsx', import.meta.url), 'utf8');
const journal = readFileSync(new URL('../src/ui/JournalSidecar.tsx', import.meta.url), 'utf8');

/** Extract a `function <name>` body (up to its closing brace line). */
function fnBody(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start > 0, `${name} exists`);
  const next = src.indexOf('\n}', start);
  return src.slice(start, next + 2);
}

/* ------------------------------------------------------------------ */
/* Homily staging — exported helper contracts                          */
/* ------------------------------------------------------------------ */

test('CL.5: matchHomilyDraft resolves a draft by exact liturgical-key selector, trimmed', () => {
  const body = fnBody(homily, 'matchHomilyDraft');
  assert.match(body, /const key = litKey\.trim\(\);/, 'the key is trimmed');
  assert.ok(body.includes('if (!key) return null;'), 'an empty/whitespace key matches nothing');
  assert.match(
    body,
    /homilies\.find\(\(a\) => a\.selectors\.some\(\(s\) => s\.value === key\)\) \?\? null/,
    'exact selector-value match, first draft wins, else null',
  );
});

test('CL.5: companionGeneratedBlock carries the generated provenance marker and escapes the reply', () => {
  const block = fnBody(homily, 'companionGeneratedBlock');
  assert.match(block, /replace\(\/\\s\+\/g, ' '\)\.trim\(\)\.slice\(0, 2000\)/, 'the staged reply text is whitespace-normalized and capped');
  assert.match(block, /class="companion-generated" data-provenance="generated"/, 'the block element carries its provenance marker');
  assert.match(block, /escapeHtml\(text\)/, 'the reply text is HTML-escaped');
  assert.match(block, /provenance: generated/, 'the visible provenance marker line');
  const esc = fnBody(homily, 'escapeHtml');
  assert.ok(/&/.test(esc) && /</.test(esc), 'ampersands and angle brackets are escaped');
});

/* ------------------------------------------------------------------ */
/* Homily staging — surface contract                                   */
/* ------------------------------------------------------------------ */

test('CL.5: HomilyPlanner consumes COMPANION_DRAFT and opens the litKey draft', () => {
  assert.match(homily, /const COMPANION_DRAFT = 'sanctissimissa:companion-draft';/);
  const effectStart = homily.indexOf('window.addEventListener(COMPANION_DRAFT, onCompanionDraft)');
  assert.ok(effectStart > 0, 'listener attached');
  assert.ok(homily.includes('window.removeEventListener(COMPANION_DRAFT, onCompanionDraft)'), 'listener detached on cleanup');
  const effect = homily.slice(homily.lastIndexOf('useEffect(', effectStart), homily.indexOf('}, [homilies]);', effectStart) + 1);
  assert.ok(effect.includes('matchHomilyDraft(homilies, litKey)'), 'the draft is resolved by liturgical key');
  assert.ok(effect.includes('setEditId(match.id)'), 'opening the draft reuses the editor-open path');
  assert.ok(effect.includes('setStaged({ litKey, reply, accId: match.id })'), 'the reply is staged');
  assert.ok(!effect.includes('insertSource'), 'the listener never inserts — no silent write');
  assert.ok(effect.includes("'no-draft'"), 'an unknown litKey is recorded, never faked');
});

test('CL.5: the staged block is inserted only behind the explicit Insert button', () => {
  const insertIndex = homily.indexOf('function insertStaged()');
  assert.ok(insertIndex > 0, 'the insert handler exists');
  const insertEnd = homily.indexOf('\n  }', insertIndex);
  const insert = homily.slice(insertIndex, insertEnd);
  assert.ok(insert.includes('api.insertSource(companionGeneratedBlock(staged.reply))'), 'Insert appends the marked block into body_html via the editor API');
  assert.ok(insert.includes("'homily.inserted'"), 'insert records a companion diagnostics event');
  assert.ok(insert.includes("'editor-not-ready'"), 'a missing editor is recorded, not crashed');
  assert.equal((homily.match(/insertSource\(/g) ?? []).length, 1, 'insertSource is reachable only from insertStaged');
  const button = /<button[^>]*onClick=\{insertStaged\}[^>]*>\s*Insert\s*<\/button>/.exec(homily);
  assert.ok(button, 'an explicit Insert button renders inside the staging block');
  assert.ok(homily.includes('Dismiss'), 'the staging block can be dismissed without writing');
  assert.match(homily, /staged\.accId === editing\.id/, 'the staging block only shows on the draft it targets');
});

/* ------------------------------------------------------------------ */
/* Annotation — surface contract (SectionReader, smallest edit)        */
/* ------------------------------------------------------------------ */

test('CL.5: SectionReader consumes COMPANION_ANNOTATE only against a live rendered anchor', () => {
  assert.match(reader, /const COMPANION_ANNOTATE = 'sanctissimissa:companion-annotate';/);
  const effectStart = reader.indexOf('window.addEventListener(COMPANION_ANNOTATE, onCompanionAnnotate)');
  assert.ok(effectStart > 0, 'listener attached');
  assert.ok(reader.includes('window.removeEventListener(COMPANION_ANNOTATE, onCompanionAnnotate)'), 'listener detached on cleanup');
  const effect = reader.slice(reader.lastIndexOf('useEffect(', effectStart), reader.indexOf('});', effectStart));
  assert.ok(effect.includes('section[data-nodekey='), 'liveness is checked against the live rendered DOM');
  assert.ok(effect.includes("'anchor-not-live'"), 'a dead anchor is recorded and never executed');
});

test('CL.5: the companion annotation is range-anchored with a ≤300-char note and cited-phrase quote', () => {
  const effectStart = reader.indexOf('window.addEventListener(COMPANION_ANNOTATE, onCompanionAnnotate)');
  const effect = reader.slice(reader.lastIndexOf('useEffect(', effectStart), reader.indexOf('});', effectStart));
  assert.ok(effect.includes('resolveSelectionRange()'), 'the live selection resolves to the exact render anchor');
  assert.ok(effect.includes('addAnnotation({'), 'creation goes through the existing annotation store');
  assert.ok(effect.includes('range: range?.src') && effect.includes('rangeAlt: range?.alt'), 'exact ranges anchor the highlight');
  assert.ok(effect.includes('companionCitedPhrase(reply)'), 'the quote prefers the reply’s cited phrase');
  assert.ok(effect.includes('window.getSelection()?.toString().trim()'), 'falling back to the live selection');
  assert.match(
    reader,
    /function companionNoteExcerpt\(reply: string\): string \{\s*\n\s*return reply\.replace\(\/\\s\+\/g, ' '\)\.trim\(\)\.slice\(0, 300\);/,
    'the note is the reply excerpt capped at 300 chars',
  );
  assert.match(reader, /function companionCitedPhrase\(reply: string\): string \{/, 'the cited-phrase extractor exists');
  assert.ok(effect.includes("'annotate.created'"), 'success records a companion diagnostics event');
  assert.ok(effect.includes('registerCompanionSurfaceProps({ db, sidecar: sidecar ?? null })'), 'the reader lends its handles to the companion surface bridge');
});

/* ------------------------------------------------------------------ */
/* Concordance — MeaningPanel contract                                 */
/* ------------------------------------------------------------------ */

test('CL.5: MeaningPanel consumes COMPANION_SEARCH kind concordance and repopulates in place', () => {
  assert.match(meaning, /export const COMPANION_SEARCH = 'sanctissimissa:companion-search';/);
  const effectStart = meaning.indexOf('window.addEventListener(COMPANION_SEARCH, onCompanionSearch)');
  assert.ok(effectStart > 0, 'mounted panel listens');
  assert.ok(meaning.includes('window.removeEventListener(COMPANION_SEARCH, onCompanionSearch)'), 'listener detached on cleanup');
  const effect = meaning.slice(meaning.lastIndexOf('useEffect(', effectStart), meaning.indexOf('});', effectStart));
  assert.ok(effect.includes("detail.kind !== 'concordance'"), 'only the concordance kind is consumed here');
  assert.ok(effect.includes("setCompanionAction({ kind: 'meaning',"), 'the term adopts the existing meaning pane');
  assert.ok(effect.includes("'concordance.opened'"), 'success records a companion diagnostics event');
  assert.match(meaning, /const active = companionAction \?\? action;/, 'the companion term overrides the panel action');
  assert.match(meaning, /db\.groupedConcordance\(term, 30\)/, 'the existing concordance search renders the results');
});

test('CL.5: a closed MeaningPanel self-opens through the companion surface bridge', () => {
  assert.match(meaning, /export function registerCompanionSurfaceProps\(/, 'the bridge registry is exported');
  assert.match(meaning, /export function companionBridgeProps\(/);
  const moduleListener = meaning.slice(meaning.indexOf("if (typeof window !== 'undefined')"));
  assert.ok(moduleListener.includes('companionBridgeProps()'), 'the overlay resolves live-registered props');
  assert.ok(moduleListener.includes("reason: 'no-corpus'"), 'no registered corpus is recorded, never faked');
  assert.ok(meaning.includes('async function openMeaningOverlay'), 'the overlay self-opens');
  assert.ok(meaning.includes("await import('react-dom/client')"), 'the React root is created lazily');
  assert.match(meaning, /typeof window !== 'undefined'/, 'module scope is Node-safe');
});

/* ------------------------------------------------------------------ */
/* Journal — JournalSidecar contract                                   */
/* ------------------------------------------------------------------ */

test('CL.5: JournalSidecar routes COMPANION_SEARCH kind journal as capture-ready sources', () => {
  assert.match(journal, /import \{[\s\S]*?COMPANION_SEARCH,/, 'the shared event name is imported, not re-declared');
  const effectStart = journal.indexOf('window.addEventListener(COMPANION_SEARCH, onCompanionSearch)');
  assert.ok(effectStart > 0, 'a mounted sidecar listens for the term itself');
  assert.ok(journal.includes('window.removeEventListener(COMPANION_SEARCH, onCompanionSearch)'), 'listener detached on cleanup');
  const effect = journal.slice(journal.lastIndexOf('useEffect(', effectStart), journal.indexOf('});', effectStart));
  assert.ok(effect.includes("detail.kind !== 'journal'"), 'only the journal kind is consumed here');
  assert.ok(effect.includes('setCompanionSource({'), 'the term is routed into the source list');
  const moduleListener = journal.slice(journal.indexOf("if (typeof window !== 'undefined')"));
  assert.ok(moduleListener.includes("detail.kind !== 'journal'"), 'the overlay listener also filters its kind');
  assert.ok(moduleListener.includes("'journal.opened'"), 'success records a companion diagnostics event');
  assert.ok(moduleListener.includes("reason: 'no-store'"), 'a missing store is recorded, never faked');
  assert.ok(journal.includes('async function openJournalOverlay'), 'a closed sidecar self-opens through the bridge');
  assert.match(journal, /text=\{companionSource\?\.term \?\? capture\.quote\}/, 'the connections search runs for the companion term');
  assert.ok(journal.includes('data-companion-journal='), 'the companion source list is labelled');
  assert.ok(journal.includes('companionSearch?: { term: string; reply: string } | null'), 'the overlay seeds the source list via prop');
  assert.match(journal, /“Add as source”/, 'the sources stay capture-ready through the existing machinery');
});

/* ------------------------------------------------------------------ */
/* Cross-cutting                                                       */
/* ------------------------------------------------------------------ */

test('CL.5: every path records companion diagnostics on success and rejection', () => {
  for (const [name, src] of [['HomilyPlanner', homily], ['SectionReader', reader], ['MeaningPanel', meaning], ['JournalSidecar', journal]] as const) {
    assert.match(src, /debugEvent\('companion',/, `${name} records companion events`);
    assert.match(src, /'command\.rejected'/, `${name} records rejections`);
  }
  assert.match(homily, /'homily\.staged'/);
  assert.match(reader, /'annotate\.created'/);
  assert.match(meaning, /'concordance\.opened'/);
  assert.match(journal, /'journal\.opened'/);
});
