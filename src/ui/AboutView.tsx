/**
 * AboutView — full routed nonmodal workspace (BD.1). Renders ABOUT_CONTENT
 * sections plus existing version/build/corpus/identifier/links/copyright.
 * Accepts long origin-story prose without modal height/width caps. Entity row
 * P-S: no sidecar dependency; all content comes from version.json and
 * ABOUT_CONTENT.
 */

import versionInfo from '../../version.json';
import { APP_LINKS } from '../core/model/appLinks.ts';
import ABOUT_CONTENT from '../content/about.ts';

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
 * Splitting on '\n' emitted an empty <p> for every blank line, which is what
 * made the About page render as ragged gaps. A run of bullet lines becomes a
 * real list; indented bullets nest one level.
 */
function AboutProse({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <div className="about-prose">
      {blocks.map((block, bi) => {
        const lines = block.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length > 0 && lines.every((l) => BULLET.test(l))) {
          return (
            <ul key={bi}>
              {lines.map((l, li) => (
                <li key={li} className={/^\s{2,}/.test(l) ? 'about-bullet-sub' : undefined}>
                  {inline(l.replace(BULLET, ''))}
                </li>
              ))}
            </ul>
          );
        }
        return <p key={bi}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}

export default function AboutView() {
  return (
    <div className="content about-workspace">
      <h2>✠ St. Android&apos;s Missal</h2>
      <p className="tagline">The Traditional Latin Mass and Divine Office as a navigable map.</p>

      <section className="about-section">
        <h3>Origin Story</h3>
        <AboutProse text={ABOUT_CONTENT.origin} />
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
          <dt>Corpus</dt><dd>Divinum Officium (László Kiss, MIT) — vendored, re-realized as graph + vector SQLite</dd>
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
    </div>
  );
}