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

export default function AboutView() {
  return (
    <div className="content about-workspace">
      <h2>✠ St. Android&apos;s Missal</h2>
      <p className="tagline">The Traditional Latin Mass and Divine Office as a navigable subway map.</p>

      <section className="about-section">
        <h3>Origin Story</h3>
        <div className="about-prose">{ABOUT_CONTENT.origin.split('\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}</div>
      </section>

      <section className="about-section">
        <h3>Purpose</h3>
        <div className="about-prose">{ABOUT_CONTENT.purpose.split('\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}</div>
      </section>

      <section className="about-section">
        <h3>Acknowledgements</h3>
        <div className="about-prose">{ABOUT_CONTENT.acknowledgements.split('\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}</div>
      </section>

      <section className="about-section">
        <h3>Privacy</h3>
        <div className="about-prose">{ABOUT_CONTENT.privacy.split('\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}</div>
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
        <div className="about-prose">{ABOUT_CONTENT.license.split('\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}</div>
      </section>

      <footer className="about-copyright">
        © 2026 Robin L. M. Cheung, MBA. All rights reserved.
      </footer>
    </div>
  );
}