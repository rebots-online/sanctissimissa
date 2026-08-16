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
  stationAnchorFor,
  type Station,
} from '../core/model/massOrdo.ts';
import { readerAnchorsForDay, massTextsBySection } from '../core/data/liturgicalDay.ts';
import { STATION_INFO } from '../core/model/stationLore.ts';
import { stationIncipits, type Incipit } from '../core/data/stationIncipits.ts';
import { buildHour } from '../core/office/engine.ts';
import { officePartsOf } from './OfficeHourMap.tsx';
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
  /** Open book when the scripture view is active (chip highlight). */
  bibleBook?: string | null;
  /** Scripture strip navigation: "Book/chapter" ref (e.g. "Gen/3"). */
  onBibleRef?: (ref: string) => void;
  /** Office parts (strip variant): anchor under the reading band. */
  activeOfficePart?: string | null;
  /** Office parts (strip variant): scroll the office reader to a part. */
  onOfficePart?: (anchor: string) => void;
}

const ordoIndex = (id: string) => MASS_ORDO.findIndex((s) => s.id === id);

export default function MapStrip({ db, day, view, activeStation, officeHour, onStation, bibleBook, onBibleRef, activeOfficePart, onOfficePart }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);
  const [flyout, setFlyout] = useState<FlyoutData | null>(null);

  const office = view === 'office';
  /** Scripture view (decision 23): the strip IS the canonical books across,
   *  each opening its chapters — the Books→Chapters projection of the map. */
  const scripture = view === 'bible';
  const [openBook, setOpenBook] = useState<string | null>(null);
  const books = useMemo(() => (db && scripture ? db.getBooks() : []), [db, scripture]);
  const season = (day?.season ?? 'Time after Pentecost') as Season;
  // A strip stop appears exactly when the reader will render its anchor
  // that day (D14: no dead clicks) — the chant switches and Sunday-only
  // stations vary with the day, not just the season.
  const anchors = useMemo(
    () => (db && day ? readerAnchorsForDay(db, day) : new Set<string>()),
    [db, day],
  );
  const textOf = useMemo(
    () => (db && day ? massTextsBySection(db, day) : () => null),
    [db, day],
  );
  const stations = useMemo(
    () =>
      office || scripture
        ? []
        : stripStations(season).filter((s) => stationAnchorFor(s, anchors, textOf) !== null),
    [office, scripture, season, anchors, textOf],
  );

  const incipits = useMemo(
    () => (db && day ? stationIncipits(db, day) : new Map<string, Incipit>()),
    [db, day],
  );
  useEffect(() => {
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
  }, [activeStation, activeOfficePart, officeHour, view]);

  // ── Scripture: the canonical books across, chapters as a dropdown ──
  if (scripture && onBibleRef) {
    const openMeta = books.find((b) => b.key === openBook) ?? null;
    return (
      <nav className="mapstrip scripture" aria-label="The canonical books" onMouseLeave={() => setFlyout(null)}>
        {books.map((b) => (
          <span key={b.key} className="book-stop">
            <button
              ref={b.key === bibleBook ? activeRef : undefined}
              className={`mstation book${b.key === openBook ? ' open' : ''}${b.key === bibleBook ? ' active' : ''}`}
              onClick={() => setOpenBook(openBook === b.key ? null : b.key)}
              aria-expanded={openBook === b.key}
              title={`${b.title} — ${b.chapters} capitula`}
            >
              <span className="mdot" />
              <span className="mlabel">{b.key}</span>
            </button>
          </span>
        ))}
        {openMeta && (
          <div className="book-chapters" role="menu" aria-label={`${openMeta.title} — chapters`}>
            {Array.from({ length: openMeta.chapters }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                role="menuitem"
                onClick={() => {
                  setOpenBook(null);
                  onBibleRef(`${openMeta.key}/${n}`);
                }}
              >
                {n}
              </button>
            ))}
          </div>
        )}
        {flyout && <MapFlyout {...flyout} />}
      </nav>
    );
  }

  if (office) {
    // Decision 23, operator-refined 2026-08-16: the office view's strip is the
    // selected hour's PARTS (the Mass-strip analog) — the eight hours live in
    // the office rail's loop line alone, so the two maps are never identical.
    const entries = (() => {
      if (!db || !day) return [];
      try {
        return buildHour(db, day, officeHour);
      } catch {
        return [];
      }
    })();
    const parts = officePartsOf(entries);
    const activeIdx = parts.findIndex((p) => p.anchor === activeOfficePart);
    return (
      <nav className="mapstrip office" aria-label="Parts of this hour" onMouseLeave={() => setFlyout(null)}>
        {parts.map((p, i) => (
          <button
            key={p.anchor}
            ref={i === activeIdx ? activeRef : undefined}
            className={`mstation seg-office proper${i === activeIdx ? ' active' : ''}`}
            onClick={() => onOfficePart?.(p.anchor)}
            aria-current={i === activeIdx ? 'step' : undefined}
            title={p.label}
          >
            <span className="mdot" />
            <span className="mlabel">{p.label}</span>
          </button>
        ))}
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
