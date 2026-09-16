/**
 * aboutMediaPlan — pure helpers for the About backstory media montage
 * (Stanza AM.01/AM.02, contract DOCS/ARCHITECTURE/about-media-20260915.md).
 *
 * Node-importable by design: no Vite constructs live here (the build-time
 * glob stays in aboutMedia.ts) so `node --test` can exercise placement and
 * naming without a bundler — same pure-module rule the LS chant backend used.
 */

export type AboutMediaKind = 'photo' | 'video';

export interface AboutMedium {
  url: string;
  kind: AboutMediaKind;
  name: string;
}

export interface Mount {
  medium: AboutMedium;
  afterBlock: number;
  side: 'right' | 'left';
}

/** Extensions the montage mounts, in the exact order used by the content glob. */
export const MEDIA_GLOB_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', // photos
  'mp4', 'webm', 'mov', 'm4v', // videos (MOV/M4V depend on WebView codecs)
] as const;

const KIND_BY_EXT: Record<string, AboutMediaKind> = {
  jpg: 'photo',
  jpeg: 'photo',
  png: 'photo',
  gif: 'photo',
  webp: 'photo',
  avif: 'photo',
  mp4: 'video',
  webm: 'video',
  mov: 'video',
  m4v: 'video',
};

/** 'photo' | 'video' for a mounted extension, null otherwise (case-insensitive). */
export function kindFor(filename: string): AboutMediaKind | null {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return null;
  return KIND_BY_EXT[filename.slice(dot + 1).toLowerCase()] ?? null;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Natural filename order — the operator sequences the montage by filename (01-…, 02-…). */
export function naturalNameCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

/**
 * Filename stem humanized into alt text / caption. A leading sequencing
 * prefix (`01-`, `002_`, `3 `) is dropped: "01-first-day.jpg" → "First day".
 */
export function captionFor(filename: string): string {
  const dot = filename.lastIndexOf('.');
  const stem = (dot > 0 ? filename.slice(0, dot) : filename)
    .replace(/^\d{1,3}[-_ ]+/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (stem.length === 0 || /^\d+$/.test(stem)) return filename; // prefix-only stem: keep the original
  return stem.charAt(0).toUpperCase() + stem.slice(1);
}

/**
 * Even-spacing placement for the montage (AM.02): the i-th of n media mounts
 * after prose block round((i+1)·blockCount/(n+1)) − 1 (clamped inside the
 * story, collisions shifted right so positions strictly increase), alternating
 * sides RIGHT first. Media beyond blockCount mounts sequentially after the
 * final block, continuing the alternation. Figures mount between blocks —
 * never inside a paragraph — so text reflows around the float.
 */
export function planMediaMounts(blockCount: number, media: AboutMedium[]): Mount[] {
  if (blockCount <= 0 || media.length === 0) return [];
  const mounts: Mount[] = [];
  const interior = Math.max(blockCount - 1, 1);
  let prev = -1;
  for (let i = 0; i < media.length; i++) {
    let afterBlock: number;
    if (i < blockCount - 1 || blockCount === 1) {
      afterBlock = Math.min(
        interior - 1,
        Math.max(0, Math.round(((i + 1) * blockCount) / (media.length + 1)) - 1),
      );
      if (afterBlock <= prev) afterBlock = Math.min(prev + 1, interior - 1);
    } else {
      afterBlock = blockCount - 1; // overflow tail after the final block
    }
    prev = afterBlock;
    mounts.push({ medium: media[i], afterBlock, side: i % 2 === 0 ? 'right' : 'left' });
  }
  return mounts;
}
