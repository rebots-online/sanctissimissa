/**
 * ShareLanding — what a shared passage opens (operator directive 2026-08-16):
 * a standalone souvenir-plaque page, NOT the raw app. The excerpt renders in
 * large stylized letters on an engraved plaque; beneath it an attribution, a
 * lead-in inviting the reader into the app, the CTA that opens the app at the
 * shared position, and the store badges (honestly inert until the listings
 * exist — no fabricated links).
 *
 * Provenance (INC-19): plaque text + attribution = computed-fact (the shared
 * corpus text and its real source); the lead-in and badges = authored-static.
 * No generation-claiming copy.
 */

import type { SharePayload } from '../core/share/shareLink.ts';

/**
 * Store listing URLs. Null until the listings are live (TC14: local builds
 * until public release) — the badges then render inert with an honest
 * tooltip, never a fabricated link. Fill on publish.
 */
export const STORE_LINKS: { play: string | null; microsoft: string | null } = {
  play: null,
  microsoft: null,
};

interface Props {
  payload: SharePayload;
  /** Open the app at the shared position (App swaps the view + routes). */
  onOpenApp: () => void;
}

export default function ShareLanding({ payload, onOpenApp }: Props) {
  return (
    <div className="share-landing">
      <div className="share-rose" aria-hidden="true">✠</div>
      <figure className="share-plaque">
        <blockquote>{payload.quote}</blockquote>
        {payload.quoteAlt && <blockquote className="alt" lang="en">{payload.quoteAlt}</blockquote>}
        {(payload.title || payload.source) && (
          <figcaption>
            {payload.title && <span className="plaque-title">{payload.title}</span>}
            {payload.source && <span className="plaque-source">{payload.source}</span>}
          </figcaption>
        )}
      </figure>
      <p className="share-lead">
        This passage lives inside St. Android&apos;s Missal — the Traditional
        Latin Mass and Divine Office as a navigable map, with the full
        liturgical corpus in Latin and English.
      </p>
      <button className="share-cta" onClick={onOpenApp}>
        Open St. Android&apos;s Missal
      </button>
      <div className="store-badges" aria-label="Get the app">
        {STORE_LINKS.play
          ? <a className="store-badge play" href={STORE_LINKS.play} target="_blank" rel="noreferrer">▶ Get it on Google Play</a>
          : <span className="store-badge play pending" title="Play Store listing pending public release">▶ Get it on Google Play</span>}
        {STORE_LINKS.microsoft
          ? <a className="store-badge ms" href={STORE_LINKS.microsoft} target="_blank" rel="noreferrer">▦ Get it from Microsoft Store</a>
          : <span className="store-badge ms pending" title="Microsoft Store listing pending public release">▦ Get it from Microsoft Store</span>}
      </div>
      <p className="share-foot">St. Android&apos;s Missal · standroid.robin.mba</p>
    </div>
  );
}
