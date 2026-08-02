import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
// @ts-expect-error plain .mjs modules
import { parseDOFile, parseRank, CorpusTree, loadPrayers, resolveContent, FillLog } from '../scripts/do-parse.mjs';
// @ts-expect-error plain .mjs modules
import { parseCitation, Scripture } from '../scripts/scripture.mjs';

const WWW = 'VENDORED/divinum-officium/web/www';
const vendored = existsSync(WWW);

test('parseDOFile splits sections and keeps qualifiers', () => {
  const secs = parseDOFile('[Officium]\nTitle\n\n[Introitus] (communi X)\n!Ps 1:1\nBeatus vir\n');
  assert.equal(secs.length, 2);
  assert.equal(secs[0].name, 'Officium');
  assert.equal(secs[1].name, 'Introitus');
  assert.equal(secs[1].qualifier, 'communi X');
  assert.match(secs[1].content, /Beatus vir/);
});

test('parseRank extracts class, number and vide cross-ref', () => {
  const r = parseRank(';;Duplex;;3;;vide C4b');
  assert.equal(r.rankClass, 'Duplex');
  assert.equal(r.rankNum, 3);
  assert.equal(r.vide, 'Commune/C4b');
});

test('parseCitation understands DO notation in both languages', () => {
  const a = parseCitation('Ps 27:8-9');
  assert.equal(a?.vulBook, 'Psa');
  assert.equal(a?.chapter, 27);
  assert.equal(a?.from, 8);
  assert.equal(a?.to, 9);
  const b = parseCitation('!Marc 8:1-9');
  assert.equal(b?.drBook, 'Mark');
  const c = parseCitation('1 Cor. 10:1-5');
  assert.equal(c?.vulBook, '1Cor');
});

test('scripture lookup serves Vulgate Latin and Douay-Rheims English', { skip: !vendored }, () => {
  const s = new Scripture('VENDORED/vulgate-clementina/vul.tsv', 'VENDORED/douay-rheims/EntireBible-DR.json');
  const la = s.lookup('Gen 1:1', 'Latin');
  assert.match(la!.text, /In principio creavit Deus/);
  const en = s.lookup('Gen 1:1', 'English');
  assert.match(en!.text, /In the beginning God created/);
});

test('&Gloria macro expands language-correctly from vendored Prayers.txt', { skip: !vendored }, () => {
  for (const [lang, expect] of [['Latin', /Glória Patri/], ['English', /Glory be to the Father/]] as const) {
    const ctx = {
      tree: new CorpusTree(WWW, lang),
      prayers: loadPrayers(WWW, lang),
      fillLog: new FillLog(),
      scripture: null,
      filePath: 'Tempora/Test',
      sectionName: 'Introitus',
      videPath: null,
      edges: null,
    };
    const res = resolveContent('&Gloria', ctx);
    assert.match(res.text, expect, `${lang} Gloria`);
  }
});

test('broken include falls back and never throws', { skip: !vendored }, () => {
  const fillLog = new FillLog();
  const ctx = {
    tree: new CorpusTree(WWW, 'Latin'),
    prayers: loadPrayers(WWW, 'Latin'),
    fillLog,
    scripture: null,
    filePath: 'Tempora/Test',
    sectionName: 'Lectio',
    videPath: null,
    edges: null,
  };
  const res = resolveContent('@NoSuch/File:NoSuchSection', ctx);
  assert.equal(res.filled, true);
  assert.match(res.text, /textus deest/);
  assert.equal(fillLog.entries.length, 1);
  assert.equal(fillLog.entries[0].resolution, 'placeholder');
});
