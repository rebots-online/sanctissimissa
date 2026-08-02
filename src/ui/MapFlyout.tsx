/**
 * Hover/focus flyout shared by the map strip and the full subway map:
 * what this stop is, the first words of the day's own text (dual-language,
 * Latin normative), and a brief description. Media renders here ONLY once a
 * real asset ships (decision 6: no placeholder surfaces in the app — the
 * production inventory lives in DOCS/MEDIA-PLAN.md, not on screen).
 */

import type { Incipit } from '../core/data/stationIncipits.ts';

export interface FlyoutData {
  title: string;
  subtitle: string;
  incipit: Incipit | null;
  about: string | null;
  x: number;
  y: number;
}

const WIDTH = 320;

export default function MapFlyout({ title, subtitle, incipit, about, x, y }: FlyoutData) {
  const left = Math.max(8, Math.min(x, window.innerWidth - WIDTH - 12));
  const top = Math.min(y, window.innerHeight - 260);
  return (
    <div className="map-flyout" role="tooltip" style={{ left, top, width: WIDTH }}>
      <div className="fly-title">{title}</div>
      <div className="fly-sub">{subtitle}</div>
      {incipit && (incipit.la || incipit.en) && (
        <div className="fly-incipit">
          {incipit.la && <div className="la" lang="la">“{incipit.la}”</div>}
          {incipit.en ? (
            <div className="en" lang="en">“{incipit.en}”</div>
          ) : (
            <div className="en missing">English translation not yet in the corpus</div>
          )}
        </div>
      )}
      {about && <div className="fly-about">{about}</div>}
    </div>
  );
}
