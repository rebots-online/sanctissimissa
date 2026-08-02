/**
 * Tests for export formats (X-1, X-2).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportHTML, exportMarkdown, exportJSON, type ExportEntry, type ExportMeta } from '../src/core/export/exportFormats.ts';

const meta: ExportMeta = {
  day: '2026-07-05',
  feastName: 'Dominica VI Post Pentecosten',
  season: 'Time after Pentecost',
  source: 'Tempora/Pent06-0',
};

const entries: ExportEntry[] = [
  { title: 'Introitus', latin: 'Dóminus fortitúdo plebis suæ', english: 'The Lord is the strength of his people', source: 'section:Tempora/Pent06-0#Introitus' },
  { title: 'Oratio', latin: 'Deus, qui in sanctórum', english: 'O God, who in the saints', source: 'section:Tempora/Pent06-0#Oratio' },
];

test('HTML export contains bilingual sections', () => {
  const html = exportHTML(meta, entries);
  assert.match(html, /<!doctype html>/);
  assert.match(html, /Dominica VI Post Pentecosten/);
  assert.match(html, /Dóminus fortitúdo/);
  assert.match(html, /The Lord is the strength/);
  assert.match(html, /lang="la"/);
  assert.match(html, /lang="en"/);
});

test('Markdown export has headings and bilingual content', () => {
  const md = exportMarkdown(meta, entries);
  assert.match(md, /^# Dominica VI Post Pentecosten/);
  assert.match(md, /\*\*Latine:\*\*/);
  assert.match(md, /\*\*English:\*\*/);
  assert.match(md, /Dóminus fortitúdo/);
  assert.match(md, /The Lord is the strength/);
});

test('JSON export is valid JSON with meta and entries', () => {
  const json = exportJSON(meta, entries);
  const parsed = JSON.parse(json);
  assert.equal(parsed.meta.day, '2026-07-05');
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[0].title, 'Introitus');
  assert.equal(parsed.entries[0].latin, 'Dóminus fortitúdo plebis suæ');
});

test('Bang-line control characters are stripped from export', () => {
  const entriesWithBang: ExportEntry[] = [
    { title: 'Graduale', latin: '!Ps. 117\nLapidem quem reprobérunt\n!*rubric\n!&hook', english: 'The stone which the builders rejected' },
  ];
  const html = exportHTML(meta, entriesWithBang);
  assert.ok(!html.includes('!*rubric'), 'suppress control stripped from HTML');
  assert.ok(!html.includes('!&hook'), 'hook control stripped from HTML');
  assert.ok(html.includes('Lapidem'), 'real text preserved');
  const md = exportMarkdown(meta, entriesWithBang);
  assert.ok(!md.includes('!*rubric'), 'suppress control stripped from MD');
  assert.ok(!md.includes('!&hook'), 'hook control stripped from MD');
});
