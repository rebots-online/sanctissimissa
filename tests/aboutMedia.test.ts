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
  planMediaMounts,
  type AboutMedium,
} from '../src/content/aboutMediaPlan.ts';

function media(names: string[]): AboutMedium[] {
  return names.map((name) => ({ url: `/assets/${name}`, kind: kindFor(name) ?? 'photo', name }));
}

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

describe('AM.02 planMediaMounts', () => {
  test('spaces two media evenly through seven blocks, right first', () => {
    const mounts = planMediaMounts(7, media(['01-a.jpg', '02-b.jpg']));
    assert.deepEqual(
      mounts.map((m) => [m.afterBlock, m.side]),
      [
        [1, 'right'],
        [4, 'left'],
      ],
    );
  });

  test('spreads four media across interior gaps alternating right-first', () => {
    const mounts = planMediaMounts(7, media(['1.jpg', '2.jpg', '3.jpg', '4.jpg']));
    assert.deepEqual(
      mounts.map((m) => [m.afterBlock, m.side]),
      [
        [0, 'right'],
        [2, 'left'],
        [3, 'right'],
        [5, 'left'],
      ],
    );
    assert.ok(mountsStrictlyIncreasingInterior(mounts, 7));
  });

  test('overflow media mounts sequentially after the final block, alternating', () => {
    const mounts = planMediaMounts(2, media(['1.jpg', '2.jpg', '3.jpg', '4.jpg']));
    assert.deepEqual(
      mounts.map((m) => [m.afterBlock, m.side]),
      [
        [0, 'right'],
        [1, 'left'],
        [1, 'right'],
        [1, 'left'],
      ],
    );
  });

  test('shifts collisions right and keeps the interior strictly increasing', () => {
    const mounts = planMediaMounts(5, media(['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg']));
    assert.deepEqual(mounts.map((m) => m.afterBlock), [0, 1, 2, 3, 4, 4]);
    assert.ok(mountsStrictlyIncreasingInterior(mounts, 5));
  });

  test('single block mounts everything after it, alternating', () => {
    const mounts = planMediaMounts(1, media(['1.jpg', '2.jpg']));
    assert.deepEqual(
      mounts.map((m) => [m.afterBlock, m.side]),
      [
        [0, 'right'],
        [0, 'left'],
      ],
    );
  });

  test('degenerate inputs return an empty plan', () => {
    assert.deepEqual(planMediaMounts(7, []), []);
    assert.deepEqual(planMediaMounts(0, media(['1.jpg'])), []);
    assert.deepEqual(planMediaMounts(-3, media(['1.jpg'])), []);
  });

  test('passes media through untouched', () => {
    const items = media(['01-first-day.jpg', '02_Missa_Lecta.mp4']);
    const mounts = planMediaMounts(7, items);
    assert.equal(mounts[0].medium.kind, 'photo');
    assert.equal(mounts[1].medium.kind, 'video');
    assert.equal(mounts[1].medium.url, '/assets/02_Missa_Lecta.mp4');
  });
});

/** Interior (pre-tail) afterBlock values strictly increase; tail repeats the final block. */
function mountsStrictlyIncreasingInterior(mounts: { afterBlock: number }[], blockCount: number): boolean {
  const tailStart = mounts.findIndex((m) => m.afterBlock === blockCount - 1 && blockCount > 1);
  const interior = tailStart === -1 ? mounts : mounts.slice(0, tailStart + 1);
  for (let i = 1; i < interior.length; i++) {
    if (interior[i].afterBlock <= interior[i - 1].afterBlock) return false;
  }
  return true;
}

describe('AM.03/AM.04 figure + lightbox wiring (source-parse)', () => {
  const view = readFileSync('./src/ui/AboutView.tsx', 'utf-8');
  const css = readFileSync('./src/styles.css', 'utf-8');

  test('Origin Story passes ABOUT_MEDIA through planMediaMounts-driven figures', () => {
    assert.match(view, /import ABOUT_MEDIA from '\.\.\/content\/aboutMedia\.ts'/);
    assert.match(view, /import \{[^}]*planMediaMounts[^}]*\} from '\.\.\/content\/aboutMediaPlan\.ts'/);
    assert.match(view, /text=\{ABOUT_CONTENT\.origin\} media=\{ABOUT_MEDIA\}/);
  });

  test('figure anatomy: sides, well, caption, keyboard open, lazy photo, metadata video', () => {
    assert.match(view, /about-media-\$\{side\}/);
    assert.match(view, /role="button"/);
    assert.match(view, /loading="lazy"/);
    assert.match(view, /preload="metadata"/);
    assert.match(view, /<figcaption>\{caption\}<\/figcaption>/);
    assert.match(view, /about-media-play/);
  });

  test('lightbox: dialog semantics, close affordances, arrows, zoom/pan, video controls', () => {
    assert.match(view, /role="dialog"/);
    assert.match(view, /aria-modal="true"/);
    assert.match(view, /e\.key === 'Escape'/);
    assert.match(view, /e\.key === 'ArrowLeft'/);
    assert.match(view, /e\.key === 'ArrowRight'/);
    assert.match(view, /about-lightbox-close/);
    assert.match(view, /onDoubleClick/);
    assert.match(view, /onPointerMove/);
    assert.match(view, /<video src=\{medium\.url\} controls autoPlay loop muted playsInline/);
    assert.match(view, /document\.body\.style\.overflow = 'hidden'/);
  });

  test('floats reflow (no per-block clear), hover is fine-pointer only, mobile keeps floats', () => {
    assert.match(css, /\.about-workspace \.about-media \{[\s\S]{0,120}float: right;/);
    assert.match(css, /\.about-workspace \.about-media-left \{[\s\S]{0,80}float: left;/);
    assert.doesNotMatch(css, /\.about-prose-block::after/);
    assert.match(css, /\.about-workspace \.about-prose::after[\s\S]{0,120}clear: both/);
    assert.match(css, /@media \(pointer: fine\)[\s\S]*?\.about-media:hover[\s\S]*?translateY\(-3px\)/);
    assert.match(css, /@media \(max-width: 720px\)[\s\S]*?\.about-media \{[\s\S]{0,80}width: 44%;/);
    assert.match(css, /prefers-reduced-motion: reduce/);
  });
});

describe('AM.06 derivative-corpus attribution (source-parse)', () => {
  const about = readFileSync('./src/content/about.ts', 'utf-8');
  const view = readFileSync('./src/ui/AboutView.tsx', 'utf-8');
  const corpusLine =
    'Derivative of Divinum Officium (László Kiss, MIT): gap-filled and cross-translated from the Clementine Vulgate and Douay–Rheims, then re-realized as a graph + vector SQLite corpus';

  test('metadata line, Kiss bullet and license paragraph use the contract wording', () => {
    assert.ok(view.includes(corpusLine));
    assert.ok(
      about.includes(
        "**László Kiss** — Divinum Officium (MIT), vendored in VENDORED/divinum-officium/ as the base corpus. Ingest-time gap-fill and cross-translation mean the shipped corpus is a derivative of Kiss's work, not a mirror of it.",
      ),
    );
    assert.ok(
      about.includes(
        'The liturgical corpus is a derivative work built on Divinum Officium (László Kiss, MIT-licensed): extended at ingest from the Clementine Vulgate and Douay–Rheims and re-realized as a graph + vector SQLite database.',
      ),
    );
  });

  test('the old mirror-style attribution is gone', () => {
    assert.ok(!view.includes('vendored, re-realized'));
    assert.ok(!about.includes('is used under the MIT License'));
  });
});
