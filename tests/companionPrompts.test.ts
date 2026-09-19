// CL.7 content half — asserts COMPANION_PROMPTS matches §H.7 verbatim.
// §H.7 (DOCS/ARCHITECTURE.md): the initial closed set, exact strings:
//   "How do I pray the Breviary?"
//   "How do I follow along at my first Traditional Latin Mass?"
//   "Walk me through the parts of the Mass"
//   "What is the difference between the Missal and the Liber Usualis?"
//   "How does the Church's liturgical year work?"
//   "Explain today's feast and its propers"
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { COMPANION_PROMPTS } from '../src/content/companionPrompts.ts';

const AUTHORED_H7: { label: string; prompt: string }[] = [
  {
    label: 'How do I pray the Breviary?',
    prompt: 'How do I pray the Breviary?',
  },
  {
    label: 'How do I follow along at my first Traditional Latin Mass?',
    prompt: 'How do I follow along at my first Traditional Latin Mass?',
  },
  {
    label: 'Walk me through the parts of the Mass',
    prompt: 'Walk me through the parts of the Mass',
  },
  {
    label: 'What is the difference between the Missal and the Liber Usualis?',
    prompt: 'What is the difference between the Missal and the Liber Usualis?',
  },
  {
    label: "How does the Church's liturgical year work?",
    prompt: "How does the Church's liturgical year work?",
  },
  {
    label: "Explain today's feast and its propers",
    prompt: "Explain today's feast and its propers",
  },
];

test('COMPANION_PROMPTS is exactly the six authored pairs of §H.7, in order', () => {
  assert.equal(COMPANION_PROMPTS.length, 6, 'closed set of exactly six');
  assert.deepEqual(COMPANION_PROMPTS, AUTHORED_H7);
});

test('first chip is "How do I pray the Breviary?" (§H.7 authored order)', () => {
  assert.equal(COMPANION_PROMPTS[0]?.label, 'How do I pray the Breviary?');
});

test('feast prompt is the authored string only — date appended at send time, never baked in', () => {
  const feast = COMPANION_PROMPTS[5];
  assert.equal(feast?.label, "Explain today's feast and its propers");
  assert.equal(feast?.prompt, "Explain today's feast and its propers");
  assert.ok(
    !/\d{4}-\d{2}-\d{2}/.test(feast?.prompt ?? ''),
    'no baked-in ISO date in the const',
  );
});

/* ------------------------------------------------------------------ */
/* CL.7 — the ChatView chip-rail half (§H.7 source contract)           */
/* ------------------------------------------------------------------ */

const chatView = readFileSync(new URL('../src/ui/ChatView.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');

test('CL.7: ChatView imports COMPANION_PROMPTS and renders the .chat-prompts rail only while the conversation is empty', () => {
  assert.match(chatView, /import \{ COMPANION_PROMPTS \} from '\.\.\/content\/companionPrompts\.ts';/);
  const railStart = chatView.indexOf('{messages.length === 0 && (');
  assert.ok(railStart > 0, 'the rail is gated on messages.length === 0');
  const rail = chatView.slice(railStart, chatView.indexOf('</div>', chatView.indexOf('chat-prompt-chip', railStart)));
  assert.match(rail, /className="chat-prompts"/, 'the .chat-prompts rail element');
  assert.match(rail, /COMPANION_PROMPTS\.map\(\(entry\) =>/, 'the chips come from the authored const');
  assert.match(rail, /className="chat-prompt-chip"/, 'chip elements carry the chip class');
  assert.match(rail, /onClick=\{\(\) => sendPrompt\(entry\)\}/, 'a tap drives the send wiring');
  assert.equal(
    (chatView.match(/\{messages\.length === 0 && \(/g) ?? []).length,
    1,
    'exactly one rail gate — after the first turn the rail never renders again',
  );
});

test('CL.7: a tap fills the composer and sends through the existing send path; the feast chip gains the date at send time', () => {
  const sendStart = chatView.indexOf('const sendPrompt');
  assert.ok(sendStart > 0, 'sendPrompt exists');
  const wiring = chatView.slice(sendStart, chatView.indexOf('\n  };', sendStart) + 4);
  assert.ok(wiring.includes('const full = promptToSend(entry);'), 'the sent text comes from promptToSend');
  assert.ok(wiring.includes('setInput(full);'), 'the tap fills the composer');
  assert.ok(wiring.includes('void send(full);'), 'and sends through the existing send path');
  const feastStart = chatView.indexOf('const promptToSend');
  const feast = chatView.slice(feastStart, chatView.indexOf('const sendPrompt'));
  assert.match(feast, /today's feast\/i\.test\(entry\.prompt\)/, 'the feast entry is detected by its authored text');
  assert.match(feast, /\$\{entry\.prompt\} \(\$\{liveFacts\(\)\.date\}\)/, 'the current liturgical date is appended at send time — never baked into the const');
});

test('CL.7: styles.css carries the parchment chip block — card surface, card border, hover lift, narrow-panel wrap', () => {
  assert.ok(/\.chat-prompts \{[^}]*flex-wrap: wrap/.test(styles), 'chips wrap on narrow panels');
  assert.ok(/\.chat-prompt-chip \{[^}]*background: var\(--card/.test(styles), '--card parchment surface');
  assert.ok(/\.chat-prompt-chip \{[^}]*border: 1px solid var\(--card-border/.test(styles), '--card-border edge');
  assert.ok(/\.chat-prompt-chip:hover:not\(:disabled\) \{[^}]*transform: translateY\(-1px\)/.test(styles), 'hover lift');
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.chat-prompt-chip[\s\S]*?transform: none/, 'reduced motion keeps the chip static');
});
