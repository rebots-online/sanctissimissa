/**
 * ABOUT_MEDIA — the operator's backstory media, enumerated at build time
 * (Stanza AM.01, contract DOCS/ARCHITECTURE/about-media-20260915.md).
 *
 * Drop-in rule: photos/videos placed directly in `content/` (beside
 * origin-story.md) mount on the next build with NO code changes. Name files
 * 01-…, 02-… to sequence the montage (natural order). Subfolders are ignored;
 * non-media files never match. MP4 (H.264) / WebM are the recommended capture
 * formats; MOV/M4V depend on the platform WebView codecs.
 *
 * This module is Vite-only (import.meta.glob); every pure helper lives in
 * aboutMediaPlan.ts so Node tests never load this file.
 */

import { kindFor, naturalNameCompare, type AboutMedium } from './aboutMediaPlan.ts';

const files = import.meta.glob('../../content/*.{jpg,jpeg,png,gif,webp,avif,mp4,webm,mov,m4v}', {
  query: '?url',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function basename(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash >= 0 ? path.slice(slash + 1) : path;
}

export const ABOUT_MEDIA: AboutMedium[] = Object.entries(files)
  .flatMap(([path, url]): AboutMedium[] => {
    const name = basename(path);
    const kind = kindFor(name);
    return kind ? [{ url, kind, name }] : [];
  })
  .sort((a, b) => naturalNameCompare(a.name, b.name));

export default ABOUT_MEDIA;
