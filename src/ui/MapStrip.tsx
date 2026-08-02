/**
 * The ever-present map strip — HelloWord's defining affordance, restored.
 * A compact horizontal subway line pinned under the masthead on every view,
 * so the user always knows where in the Mass (or the Office) they are and can
 * jump anywhere with one tap. Mechanism follows HelloWord's sticky-header map
 * (ordered stations, index-based past/active/future, auto-centering on the
 * active stop); theming is ours — gold Catechumens segment, deep-red Faithful
 * segment, interchange rings in the day's liturgical color, and the blue
 * Office line for the breviary variant (novel: HelloWord had no Office map).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  MASS_ORDO,
  stripStations,
  type Station,
} from '../core/model/massOrdo.ts';
import { OFFICE_CURSUS, type Hour } from '../core/model/officeCursus.ts';
import { STATION_INFO, HOUR_INFO } from '../core/model/stationLore.ts';
import { stationIncipits, firstWords, type Incipit } from '../core/data/stationIncipits.ts';
import { buildHour } from '../core/office/engine.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';
import type { Season } from '../core/calendar/computus.ts';
import MapFlyout, { type FlyoutData } from './MapFlyout.tsx';

interface Props {
  db: CorpusDb | null;
  day: DayInfo | null;
  view: string;
  /** Station id of the reader's current position (null = no journey yet). */
  activeStation: string | null;
  /** Selected canonical hour when the office view is active. */
  officeHour: string;
  onStation: (s: Station) => void;
  onHour: (id: string) => void;
}

const ordoIndex = (id: string) => MASS_ORDO.findIndex((s) => s.id === id);

export default function MapStrip({ db, day, view, activeStation, officeHour, onStation, onHour }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [flyout, setFlyout] = useState<FlyoutData | null>(null);
  /** Office incipits are built on first hover (buildHour is heavier). */
  const hourIncipits = useRef(new Map<string, Incipit | null>());

  const office = view === 'office';
  const season = (day?.season ?? 'Time after Pentecost') as Season;
  const stations = office ? [] : stripStations(season);

  const incipits = useMemo(
    () => (db && day ? stationIncipits(db, day) : new Map<string, Incipit>()),
    [db, day],
  );
  useEffect(() => {
    hourIncipits.current.clear();
    setFlyout(null);
  }, [day?.date]);

  const flyoutAt = (el: HTMLElement): { x: number; y: number } => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - 160, y: r.bottom + 8 };
  };

  const showStation = (s: Station, el: HTMLElement) =>
    setFlyout({
      title: s.latin,
      subtitle: s.english + (s.note ? ` — ${s.note}` : ''),
      incipit: incipits.get(s.id) ?? null,
      about: STATION_INFO[s.id]?.about ?? null,
      ...flyoutAt(el),
    });

  const showHour = (h: Hour, el: HTMLElement) => {
    if (!hourIncipits.current.has(h.id) && db && day) {
      try {
        const first = buildHour(db, day, h.id).find((e) => !e.rubric && e.latin);
        hourIncipits.current.set(h.id, first ? { la: firstWords(first.latin), en: firstWords(first.english) } : null);
      } catch {
        hourIncipits.current.set(h.id, null);
      }
    }
    setFlyout({
      title: h.latin,
      subtitle: `${h.english} · circa ${h.clock}`,
      incipit: hourIncipits.current.get(h.id) ?? null,
      about: HOUR_INFO[h.id]?.about ?? null,
      ...flyoutAt(el),
    });
  };

  // Index-based journey state. When the active station isn't on the strip
  // (a fold-out branch or detail stop), light the nearest preceding stop.
  let activeIdx = stations.findIndex((s) => s.id === activeStation);
  if (!office && activeIdx < 0 && activeStation) {
    const target = ordoIndex(activeStation);
    if (target >= 0) {
      stations.forEach((s, i) => {
        if (ordoIndex(s.id) <= target) activeIdx = i;
      });
    }
  }

  // Keep the you-are-here marker in view as it travels. Scroll ONLY the strip
  // itself — scrollIntoView would climb the scroll chain and cancel the
  // reader's own smooth scroll mid-flight.
  useEffect(() => {
    const el = activeRef.current;
    const strip = el?.parentElement;
    if (!el || !strip) return;
    strip.scrollTo({
      left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2,
      behavior: 'smooth',
    });
  }, [activeStation, officeHour, view]);

  if (office) {
    return (
      <nav className="mapstrip office" aria-label="The eight canonical hours" onMouseLeave={() => setFlyout(null)}>
        {OFFICE_CURSUS.map((h) => {
          const active = h.id === officeHour;
          return (
            <button
              key={h.id}
              ref={active ? activeRef : undefined}
              className={`mstation seg-office proper${active ? ' active' : ''}`}
              onClick={() => onHour(h.id)}
              onMouseEnter={(e) => showHour(h, e.currentTarget)}
              onFocus={(e) => showHour(h, e.currentTarget)}
              onBlur={() => setFlyout(null)}
              aria-current={active ? 'step' : undefined}
            >
              <span className="mdot" />
              <span className="mlabel">{h.latin}</span>
            </button>
          );
        })}
        {flyout && <MapFlyout {...flyout} />}
      </nav>
    );
  }

  return (
    <nav className="mapstrip" aria-label="The Mass, one line — you are here" onMouseLeave={() => setFlyout(null)}>
      {stations.map((s, i) => {
        const isProper = s.kind === 'proper' || s.kind === 'switch';
        const state =
          activeIdx < 0 ? '' : i < activeIdx ? ' past' : i === activeIdx ? ' active' : ' future';
        return (
          <button
            key={s.id}
            ref={i === activeIdx ? activeRef : undefined}
            className={`mstation seg-${s.line}${isProper ? ' proper' : ''}${s.kind === 'conditional' ? ' conditional' : ''}${state}`}
            onClick={() => onStation(s)}
            onMouseEnter={(e) => showStation(s, e.currentTarget)}
            onFocus={(e) => showStation(s, e.currentTarget)}
            onBlur={() => setFlyout(null)}
            aria-label={`${s.latin} — ${s.english}`}
            aria-current={i === activeIdx ? 'step' : undefined}
          >
            <span className="mdot" />
            <span className="mlabel">{s.latin}</span>
          </button>
        );
      })}
      {flyout && <MapFlyout {...flyout} />}
    </nav>
  );
}
