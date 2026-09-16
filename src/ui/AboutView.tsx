/**
 * AboutView — full routed nonmodal workspace (BD.1). Renders ABOUT_CONTENT
 * sections plus existing version/build/corpus/identifier/links/copyright.
 * Accepts long origin-story prose without modal height/width caps. Entity row
 * P-S: no sidecar dependency; all content comes from version.json and
 * ABOUT_CONTENT.
 *
 * Stanza AM (2026-09-15): the Origin Story interleaves the operator's
 * backstory media — ABOUT_MEDIA, enumerated at build time from content/ — as
 * floating figures, right first then alternating, prose reflowed around them
 * (planMediaMounts; contract DOCS/ARCHITECTURE/about-media-20260915.md).
 * Fine-pointer hover lifts a figure in place; click/tap/Enter/Space opens
 * AboutLightbox (‹ › navigation with wrap, ✕/Esc/scrim close, double-tap
 * 1×/2× zoom with drag pan, video plays with controls). Design source:
 * LIBS/UI/STITCH/sanctissimissa-about-20260915/about.html (screen
 * dd4c40efd3ee4d2ab5079ceea8fbdc09).
 */

import { useEffect, useRef, useState } from 'react';
import versionInfo from '../../version.json';
import { APP_LINKS } from '../core/model/appLinks.ts';
import ABOUT_CONTENT from '../content/about.ts';
import ABOUT_MEDIA from '../content/aboutMedia.ts';
import {
  captionFor,
  planMediaMounts,
  type AboutMedium,
  type Mount,
} from '../content/aboutMediaPlan.ts';

/** `**bold**` runs, rendered inline. Everything else is literal text. */
function inline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((run, i) =>
    run.startsWith('**') && run.endsWith('**') && run.length > 4
      ? <strong key={i}>{run.slice(2, -2)}</strong>
      : <span key={i}>{run}</span>,
  );
}

const BULLET = /^\s*[*-]\s+/;

/**
 * AboutProse — paragraphs are separated by BLANK lines, not by every newline.
 * A run of bullet lines becomes a real list; indented bullets nest one level.
 * With media present, planMediaMounts figures mount BETWEEN blocks (right
 * first, alternating) so prose reflows around the floats — never inside a <p>.
 */
function AboutProse({
  text,
  media = [],
  onOpenMedia,
}: {
  text: string;
  media?: AboutMedium[];
  onOpenMedia?: (index: number, figure: HTMLElement) => void;
}) {
  const blocks = text.trim().split(/\n\s*\n/);
  const mounts = planMediaMounts(blocks.length, media);
  const byGap = new Map<number, Mount[]>();
  for (const mount of mounts) {
    const list = byGap.get(mount.afterBlock) ?? [];
    list.push(mount);
    byGap.set(mount.afterBlock, list);
  }
  return (
    <div className="about-prose">
      {blocks.map((block, bi) => (
        <div key={bi} className="about-prose-block">
          {(() => {
            const lines = block.split('\n').filter((l) => l.trim().length > 0);
            if (lines.length > 0 && lines.every((l) => BULLET.test(l))) {
              return (
                <ul>
                  {lines.map((l, li) => (
                    <li key={li} className={/^\s{2,}/.test(l) ? 'about-bullet-sub' : undefined}>
                      {inline(l.replace(BULLET, ''))}
                    </li>
                  ))}
                </ul>
              );
            }
            return <p>{inline(lines.join(' '))}</p>;
          })()}
          {(byGap.get(bi) ?? []).map((mount) => (
            <AboutMediaFigure
              key={mount.medium.name}
              medium={mount.medium}
              side={mount.side}
              onOpen={(figure) => onOpenMedia?.(media.indexOf(mount.medium), figure)}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** One floated montage figure: photo or video well + muted filename caption. */
function AboutMediaFigure({
  medium,
  side,
  onOpen,
}: {
  medium: AboutMedium;
  side: Mount['side'];
  onOpen: (figure: HTMLElement) => void;
}) {
  const caption = captionFor(medium.name);
  return (
    <figure
      className={`about-media about-media-${side}`}
      tabIndex={0}
      role="button"
      aria-label={`${caption} — open enlarged view`}
      onClick={(e) => onOpen(e.currentTarget)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(e.currentTarget);
        }
      }}
    >
      <span className="about-media-well">
        {medium.kind === 'photo' ? (
          <img src={medium.url} alt={caption} loading="lazy" />
        ) : (
          <video src={medium.url} preload="metadata" muted loop playsInline />
        )}
        {medium.kind === 'video' && <span className="about-media-play" aria-hidden="true">▶</span>}
      </span>
      <figcaption>{caption}</figcaption>
    </figure>
  );
}

/** Full-screen media viewer: scrim, counter/caption bar, arrows, zoom + pan. */
function AboutLightbox({
  media,
  index,
  onClose,
  onIndex,
}: {
  media: AboutMedium[];
  index: number;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const medium = media[index];
  const caption = captionFor(medium.name);
  const prev = () => onIndex((index - 1 + media.length) % media.length);
  const next = () => onIndex((index + 1) % media.length);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    setZoomed(false);
    setPan({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="about-lightbox" role="dialog" aria-modal="true" aria-label={`Media ${index + 1} of ${media.length}: ${caption}`}>
      <div className="about-lightbox-scrim" onClick={onClose} aria-hidden="true" />
      <div className="about-lightbox-bar">
        <span className="about-lightbox-count">{index + 1} of {media.length}</span>
        <span className="about-lightbox-caption">{caption}</span>
        <button ref={closeRef} className="about-lightbox-close" onClick={onClose} aria-label="Close (Escape)">✕</button>
      </div>
      <div className="about-lightbox-stage">
        {media.length > 1 && (
          <button className="about-lightbox-nav about-lightbox-prev" onClick={prev} aria-label="Previous (left arrow)">‹</button>
        )}
        <div
          className={`about-lightbox-frame${zoomed ? ' zoomed' : ''}`}
          onDoubleClick={() => setZoomed((z) => {
            if (z) setPan({ x: 0, y: 0 });
            return !z;
          })}
          onPointerDown={(e) => {
            if (!zoomed) return;
            drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!drag.current) return;
            setPan({
              x: drag.current.px + (e.clientX - drag.current.x),
              y: drag.current.py + (e.clientY - drag.current.y),
            });
          }}
          onPointerUp={() => { drag.current = null; }}
          onPointerCancel={() => { drag.current = null; }}
        >
          {medium.kind === 'photo' ? (
            <img
              src={medium.url}
              alt={caption}
              style={zoomed ? { transform: `translate(${pan.x}px, ${pan.y}px) scale(2)` } : undefined}
            />
          ) : (
            <video src={medium.url} controls autoPlay loop muted playsInline />
          )}
        </div>
        {media.length > 1 && (
          <button className="about-lightbox-nav about-lightbox-next" onClick={next} aria-label="Next (right arrow)">›</button>
        )}
      </div>
      <div className="about-lightbox-hint">double-tap to zoom · drag to pan · Esc closes</div>
    </div>
  );
}

export default function AboutView() {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  const openMedia = (index: number, figure: HTMLElement) => {
    returnFocus.current = figure;
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
    returnFocus.current?.focus();
    returnFocus.current = null;
  };

  return (
    <div className="content about-workspace">
      <h2>✠ SanctissiMissa</h2>
      <p className="tagline">The Traditional Latin Mass and Divine Office as a navigable map.</p>

      <section className="about-section">
        <h3>Origin Story</h3>
        <AboutProse text={ABOUT_CONTENT.origin} media={ABOUT_MEDIA} onOpenMedia={openMedia} />
      </section>

      <section className="about-section">
        <h3>Purpose</h3>
        <AboutProse text={ABOUT_CONTENT.purpose} />
      </section>

      <section className="about-section">
        <h3>Acknowledgements</h3>
        <AboutProse text={ABOUT_CONTENT.acknowledgements} />
      </section>

      <section className="about-section">
        <h3>Privacy</h3>
        <AboutProse text={ABOUT_CONTENT.privacy} />
      </section>

      <section className="about-section">
        <h3>Version & Build</h3>
        <dl className="about-meta">
          <dt>Version</dt><dd>{versionInfo.version} (code {versionInfo.versionCode})</dd>
          <dt>Built</dt><dd>{new Date(versionInfo.buildDate).toLocaleString()}</dd>
          <dt>Corpus</dt><dd>Derivative of Divinum Officium (László Kiss, MIT): gap-filled and cross-translated from the Clementine Vulgate and Douay–Rheims, then re-realized as a graph + vector SQLite corpus</dd>
          <dt>Identifier</dt><dd>{versionInfo.packageName}</dd>
        </dl>
      </section>

      <section className="about-section">
        <h3>Links</h3>
        <div className="about-links">
          <a href={APP_LINKS.appSite} target="_blank" rel="noreferrer">✠ {APP_LINKS.appSiteLabel}</a>
          {APP_LINKS.blog && (
            <a href={APP_LINKS.blog} target="_blank" rel="noreferrer">✎ {APP_LINKS.blogLabel}</a>
          )}
        </div>
      </section>

      <section className="about-section">
        <h3>License</h3>
        <AboutProse text={ABOUT_CONTENT.license} />
      </section>

      <footer className="about-copyright">
        © 2026 Robin L. M. Cheung, MBA. All rights reserved.
      </footer>

      {lightboxIndex !== null && ABOUT_MEDIA[lightboxIndex] && (
        <AboutLightbox media={ABOUT_MEDIA} index={lightboxIndex} onClose={closeLightbox} onIndex={setLightboxIndex} />
      )}
    </div>
  );
}
