/**
 * About media montage tests (Stanza AM). AM.01 covers the pure helpers and
 * the build-time enumeration contract; AM.02 adds planMediaMounts; later tasks
 * append source-parse assertions for the figure, lightbox and attribution
 * wiring. aboutMedia.ts itself is never imported here — import.meta.glob is
 * build-time only — its contract is asserted by source-parse.
 */

import { strict as assert } from 'node:assert';
import { test, describe } from 'node:test';
import { readFileSync } from 'node:fs';

import {
  MEDIA_GLOB_EXTENSIONS,
  kindFor,
  naturalNameCompare,
  captionFor,
} from '../src/content/aboutMediaPlan.ts';

describe('AM.01 kindFor', () => {
  test('maps every mounted extension', () => {
    for (const ext of MEDIA_GLOB_EXTENSIONS) {
      const kind = kindFor(`sample.${ext}`);
      assert.ok(kind === 'photo' || kind === 'video', `${ext} must map to a kind`);
    }
  });

  test('classifies photos and videos case-insensitively', () => {
    assert.equal(kindFor('a.JPG'), 'photo');
    assert.equal(kindFor('a.WebM'), 'video');
    assert.equal(kindFor(' altar-card.png '), null);
  });

  test('returns null for unknown or missing extensions', () => {
    assert.equal(kindFor('notes.txt'), null);
    assert.equal(kindFor('seed'), null);
    assert.equal(kindFor('.jpg'), null); // dotfile without stem: not a montage file
    assert.equal(kindFor('catalogue.seed.json'), null);
  });
});

describe('AM.01 naturalNameCompare', () => {
  test('numbers compare numerically (2 before 10)', () => {
    const names = ['10-x.jpg', '2-x.jpg', '1-x.jpg'].sort(naturalNameCompare);
    assert.deepEqual(names, ['1-x.jpg', '2-x.jpg', '10-x.jpg']);
  });

  test('letters compare case-insensitively after numbers', () => {
    const names = ['img-b.jpg', 'img-a.jpg', 'img-2.jpg'].sort(naturalNameCompare);
    assert.deepEqual(names, ['img-2.jpg', 'img-a.jpg', 'img-b.jpg']);
  });
});

describe('AM.01 captionFor', () => {
  test('humanizes stems and strips a sequencing prefix', () => {
    assert.equal(captionFor('01-first-day.jpg'), 'First day');
    assert.equal(captionFor('02_Missa_Lecta.mp4'), 'Missa Lecta');
    assert.equal(captionFor('subway-map-sketch.png'), 'Subway map sketch');
  });

  test('keeps stems that are only a prefix or have no extension', () => {
    assert.equal(captionFor('007.jpg'), '007.jpg'); // prefix-only stem: keep the original
    assert.equal(captionFor('altar'), 'Altar');
  });
});

describe('AM.01 enumeration contract (source-parse)', () => {
  const source = readFileSync('./src/content/aboutMedia.ts', 'utf-8');

  test('globs content/ root over exactly the mounted extensions', () => {
    assert.match(
      source,
      /import\.meta\.glob\('\.\.\/\.\.\/content\/\*\.\{jpg,jpeg,png,gif,webp,avif,mp4,webm,mov,m4v\}'/,
    );
  });

  test('documents the drop-in rule and stays out of subfolders', () => {
    assert.match(source, /Drop-in rule/);
    assert.match(source, /NO code changes/);
    assert.match(source, /Subfolders are ignored/);
  });

  test('keeps pure logic in aboutMediaPlan.ts, not here', () => {
    assert.doesNotMatch(source, /function planMediaMounts/);
    assert.doesNotMatch(source, /function captionFor/);
  });
});
