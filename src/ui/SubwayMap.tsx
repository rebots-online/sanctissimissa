/**
 * The whole Mass as a vertical metro line (Montreal-style single-column
 * representation — nothing is ever cut off; the page scrolls, the line
 * doesn't snake). Two trunk segments — ① Catechumens (gold) and
 * ② Faithful (deep red) — one below the other; the Ember-Day lessons, the
 * seasonal chant alternatives and the Lenten Super populum are indented
 * fold-out branches, and detail stations (Asperges, Orate fratres, Pater
 * noster…) fold away behind the skeleton/full toggle so the simple spine
 * of the Mass always stays legible. Proper stations render as interchange
 * rings in the day's liturgical color; clicking any station opens the
 * reader at that section.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { MASS_ORDO, trunkOf, branchOf, stationActive, stationAnchorFor, type Station } from '../core/model/massOrdo.ts';
import { readerAnchorsForDay, massTextsBySection } from '../core/data/liturgicalDay.ts';
import { STATION_INFO } from '../core/model/stationLore.ts';
import { stationIncipits, type Incipit } from '../core/data/stationIncipits.ts';
import { OFFICE_CURSUS } from '../core/model/officeCursus.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';
import MapFlyout, { type FlyoutData } from './MapFlyout.tsx';

/** Y.3 — the map view is content-type aware: Missa (the Mass line),
 *  Scriptura (the canon as two lines, chapter menus ON the book stops),
 *  Horæ (the day's hours as one line). The mode lives in App state so the
 *  map remembers its content type across view switches (operator report
 *  2026-08-17: returning to the map kept landing on the wrong type). */
export type MapMode = 'missa' | 'scriptura' | 'horae';

interface Props {
  db: CorpusDb | null;
  day: DayInfo | null;
  onStation: (station: Station) => void;
  /** Scripture mode: open Sacred Scripture at "Book" or "Book/chapter". */
  onOpenBibleRef?: (ref: string) => void;
  /** Breviary mode: open the Divine Office at an hour id. */
  onOpenHour?: (hour: string) => void;
  /** Currently selected hour (breviary stop highlight). */
  activeHour?: string;
  /** Persisted content type (App-owned so it survives view switches). */
  mode?: MapMode;
  onMode?: (m: MapMode) => void;
}

const ACCENTS: Record<string, string> = {
  purple: '#5d3a80', red: '#9c2733', green: '#3f7a52',
  white: '#c9a227', black: '#2c2925', rose: '#d193a3',
};

function Dot({ s, accent }: { s: Station; accent: string }) {
  const isProper = s.kind === 'proper' || s.kind === 'switch';
  return (
    <svg className="vdot" viewBox="0 0 34 34" aria-hidden="true">
      {s.kind === 'conditional' && (
        <circle cx={17} cy={17} r={14.5} fill="none" stroke="#4a4034" strokeWidth={1.2} strokeDasharray="3 3" />
      )}
      {isProper ? (
        <>
          {/* Y.1 — the day's stations breathe: layered low-opacity halo + */}
          {/* expanding ring behind the dot (subtle is the contract). */}
          <circle className="vdot-pulse-halo" cx={17} cy={17} r={13} fill={accent} />
          <circle className="vdot-pulse-ring" cx={17} cy={17} r={12} fill="none" stroke={accent} strokeWidth={2} />
          <circle cx={17} cy={17} r={10.5} fill="#fff" stroke={accent} strokeWidth={4} />
          <circle cx={17} cy={17} r={4.5} fill={accent} />
        </>
      ) : (
        <circle cx={17} cy={17} r={8.5} fill="#fff" stroke="#4a4034" strokeWidth={3} />
      )}
    </svg>
  );
}

function StationRow({
  s, accent, active, onStation, small,
}: {
  s: Station; accent: string; active: boolean; onStation: (s: Station) => void; small?: boolean;
}) {
  return (
    <button
      className={`vstation${active ? '' : ' inactive'}${small ? ' small' : ''}`}
      onClick={() => active && onStation(s)}
      data-sid={s.id}
      disabled={!active}
    >
      <Dot s={s} accent={accent} />
      <span className="vlabels">
        <span className="vlatin">{s.latin}</span>
        <span className="veng">{s.english}</span>
      </span>
      {s.note && <span className="vnote">{s.note}</span>}
    </button>
  );
}

/** Indented fold-out branch (Ember insert, chant alternatives, spur). */
function Branch({
  title, color, stations, accent, season, tappable, onStation, defaultOpen,
}: {
  title: string; color: string; stations: Station[]; accent: string;
  season: string; tappable: (s: Station) => boolean; onStation: (s: Station) => void; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const anyActive = stations.some((s) => tappable(s));
  return (
    <div className={`vbranch${anyActive ? '' : ' inactive'}`} style={{ ['--branch-color' as never]: color }}>
      <button className="vbranch-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="chev">{open ? '▾' : '▸'}</span> {title}
        {!anyActive && <span className="vnote">not travelled in {season}</span>}
      </button>
      {open && (
        <div className="vbranch-body">
          {stations.map((s) => (
            <StationRow key={s.id} s={s} accent={accent} active={tappable(s)} onStation={onStation} small />
          ))}
          <div className="vreturn">└─ return</div>
        </div>
      )}
    </div>
  );
}

export default function SubwayMap({ db, day, onStation, onOpenBibleRef, onOpenHour, activeHour, mode, onMode }: Props) {
  const accent = ACCENTS[String(day?.color ?? 'green')] ?? '#3f7a52';
  const season = day?.season ?? 'Time after Pentecost';
  const [full, setFull] = useState(false);
  const [flyout, setFlyout] = useState<FlyoutData | null>(null);
  const [localMode, setLocalMode] = useState<MapMode>('missa');
  const mapMode = mode ?? localMode;
  const setMapMode = onMode ?? setLocalMode;
  const hoverSid = useRef<string | null>(null);

  // A stop is tappable exactly when the reader will render its anchor that
  // day (D14: no dead clicks) — same set the reader builds its entries by.
  const anchors = useMemo(
    () => (db && day ? readerAnchorsForDay(db, day) : new Set<string>()),
    [db, day],
  );
  const textOf = useMemo(
    () => (db && day ? massTextsBySection(db, day) : () => null),
    [db, day],
  );
  const tappable = useCallback(
    (s: Station) => stationActive(s, season as never) && stationAnchorFor(s, anchors, textOf) !== null,
    [season, anchors, textOf],
  );

  const incipits = useMemo(
    () => (db && day ? stationIncipits(db, day) : new Map<string, Incipit>()),
    [db, day],
  );

  // Event delegation: one hover handler for every station row, trunk or branch.
  function onOver(e: React.MouseEvent) {
    const btn = (e.target as HTMLElement).closest('button.vstation') as HTMLElement | null;
    const sid = btn?.dataset.sid ?? null;
    if (sid === hoverSid.current) return;
    hoverSid.current = sid;
    if (!sid || !btn) {
      setFlyout(null);
      return;
    }
    const s = MASS_ORDO.find((x) => x.id === sid);
    if (!s) return;
    const r = btn.getBoundingClientRect();
    setFlyout({
      title: s.latin,
      subtitle: s.english + (s.note ? ` — ${s.note}` : ''),
      incipit: incipits.get(sid) ?? null,
      about: STATION_INFO[sid]?.about ?? null,
      x: Math.min(r.left + 64, window.innerWidth - 340),
      y: r.bottom + 6,
    });
  }

  const filterDetail = (s: Station) => full || !s.detail;
  const cat = trunkOf('catechumens').filter(filterDetail);
  const asperges = branchOf('spur').find((s) => s.id === 'asperges');
  const fai = trunkOf('faithful').filter(filterDetail);
  const ember = branchOf('ember');
  const chants = branchOf('chant');
  const superPopulum = branchOf('spur').find((s) => s.id === 'super-populum');

  const emberActive = ['Advent', 'Lent', 'Time after Pentecost'].includes(season);

  const renderTrunk = (stations: Station[], lineColor: string, injectAfter: Record<string, React.ReactNode>) => (
    <div className="vtrunk" style={{ ['--line-color' as never]: lineColor }}>
      {stations.map((s) => (
        <div key={s.id}>
          <StationRow s={s} accent={accent} active={tappable(s)} onStation={onStation} />
          {injectAfter[s.id]}
        </div>
      ))}
    </div>
  );

  const hints: Record<MapMode, string> = {
    missa: 'the whole Mass, one line, top to bottom',
    scriptura: 'the canon, two lines — hover a book stop for its chapters',
    horae: 'the day’s hours, one line — hover a stop for its parts',
  };
  const toolbar = (
    <div className="vmap-toolbar">
      <span className="vmap-hint">{hints[mapMode]}</span>
      <div className="vmap-modes" role="tablist" aria-label="Map content type">
        <button className={mapMode === 'missa' ? 'active' : ''} onClick={() => setMapMode('missa')}>✠ Missa</button>
        <button className={mapMode === 'scriptura' ? 'active' : ''} onClick={() => setMapMode('scriptura')}>📜 Scriptura</button>
        <button className={mapMode === 'horae' ? 'active' : ''} onClick={() => setMapMode('horae')}>🕤 Horæ</button>
      </div>
      {mapMode === 'missa' && (
        <button className="vmap-toggle" onClick={() => setFull(!full)}>
          {full ? '⊖ fold to skeleton' : '⊕ unfold full detail'}
        </button>
      )}
    </div>
  );

  if (mapMode === 'scriptura' && db && onOpenBibleRef) {
    return (
      <div className="vmap">
        {toolbar}
        <ScriptureSubway db={db} onOpen={onOpenBibleRef} />
      </div>
    );
  }
  if (mapMode === 'horae' && onOpenHour) {
    return (
      <div className="vmap">
        {toolbar}
        <OfficeSubway onOpen={onOpenHour} activeHour={activeHour} />
      </div>
    );
  }

  return (
    <div className="vmap" onMouseOver={onOver} onMouseLeave={() => { hoverSid.current = null; setFlyout(null); }}>
      {flyout && <MapFlyout {...flyout} />}
      {toolbar}

      <div className="vline-header" style={{ color: 'var(--line-catechumens)' }}>
        ① Missa Catechumenorum <span>Mass of the Catechumens</span>
      </div>

      {full && asperges && (
        <div className="vtrunk" style={{ ['--line-color' as never]: 'var(--line-catechumens)' }}>
          <StationRow s={asperges} accent={accent} active={tappable(asperges)} onStation={onStation} />
        </div>
      )}

      {renderTrunk(cat, 'var(--line-catechumens)', {
        oratio: (
          <Branch
            key={`ember-${season}-${full}`}
            title="Quatuor Tempora — the Ember-Day lessons"
            color="var(--line-catechumens)"
            stations={ember}
            accent={accent}
            season={season}
            tappable={tappable}
            onStation={onStation}
            defaultOpen={emberActive && full}
          />
        ),
        lectio: (
          <Branch
            key={`chant-${season}`}
            title="Seasonal chant — Gradual · Alleluia · Tract · Paschal Alleluia"
            color="var(--line-catechumens)"
            stations={chants}
            accent={accent}
            season={season}
            tappable={tappable}
            onStation={onStation}
            defaultOpen
          />
        ),
      })}

      <div className="vline-header" style={{ color: 'var(--line-faithful)' }}>
        ② Missa Fidelium <span>Mass of the Faithful</span>
      </div>

      {renderTrunk(fai, 'var(--line-faithful)', {
        postcommunio: superPopulum ? (
          <Branch
            key={`sp-${season}`}
            title="Oratio super populum — Lenten ferias"
            color="var(--line-faithful)"
            stations={[superPopulum]}
            accent={accent}
            season={season}
            tappable={tappable}
            onStation={onStation}
            defaultOpen={season === 'Lent'}
          />
        ) : null,
      })}

      <div className="vlegend">
        <span><svg viewBox="0 0 34 34" className="vdot"><circle cx={17} cy={17} r={10.5} fill="#fff" stroke={accent} strokeWidth={4} /><circle cx={17} cy={17} r={4.5} fill={accent} /></svg> Proper of the day — in the day's color ({String(day?.color ?? '')})</span>
        <span><svg viewBox="0 0 34 34" className="vdot"><circle cx={17} cy={17} r={8.5} fill="#fff" stroke="#4a4034" strokeWidth={3} /></svg> Ordinary (invariable)</span>
        <span><svg viewBox="0 0 34 34" className="vdot"><circle cx={17} cy={17} r={14.5} fill="none" stroke="#4a4034" strokeWidth={1.2} strokeDasharray="3 3" /><circle cx={17} cy={17} r={8.5} fill="#fff" stroke="#4a4034" strokeWidth={3} /></svg> Conditional by rubric</span>
        <span className="faded">Faded = not travelled in {season}</span>
      </div>
    </div>
  );
}

/**
 * Y.3 — the canon as two subway lines (Vetus / Novum Testamentum). Book stops
 * carry their chapter menu ON the stop: hovering reveals the chapters right
 * there (operator directive 2026-08-16 — "dropdowns for books are on the
 * subway map stops themselves on mouseover", never a native <select>).
 */
function ScriptureSubway({ db, onOpen }: { db: CorpusDb; onOpen: (ref: string) => void }) {
  const books = useMemo(() => db.getBooks(), [db]);
  const ot = books.filter((b) => b.testament === 'OT');
  const nt = books.filter((b) => b.testament === 'NT');
  const [hover, setHover] = useState<{ key: string; title: string; chapters: number; x: number; y: number } | null>(null);
  const hoverKey = useRef<string | null>(null);

  function onOver(e: React.MouseEvent) {
    const btn = (e.target as HTMLElement).closest('button.sbook') as HTMLElement | null;
    const key = btn?.dataset.bkey ?? null;
    if (key === hoverKey.current) return;
    hoverKey.current = key;
    if (!key || !btn) {
      setHover(null);
      return;
    }
    const b = books.find((x) => x.key === key);
    if (!b) return;
    const r = btn.getBoundingClientRect();
    setHover({ key: b.key, title: b.title, chapters: b.chapters, x: Math.min(r.left + 60, window.innerWidth - 330), y: r.bottom + 6 });
  }

  const trunk = (label: string, sub: string, line: string, list: typeof ot) => (
    <>
      <div className="vline-header" style={{ color: line }}>{label} <span>{sub}</span></div>
      <div className="vtrunk" style={{ ['--line-color' as never]: line }}>
        {list.map((b) => (
          <button key={b.key} className="vstation sbook" data-bkey={b.key} onClick={() => onOpen(b.key)}>
            <svg className="vdot" viewBox="0 0 34 34" aria-hidden="true">
              <circle className="vdot-pulse-halo" cx={17} cy={17} r={13} fill="currentColor" />
              <circle className="vdot-pulse-ring" cx={17} cy={17} r={12} fill="none" stroke="currentColor" strokeWidth={2} />
              <circle cx={17} cy={17} r={10.5} fill="#fff" stroke="currentColor" strokeWidth={4} />
              <circle cx={17} cy={17} r={4.5} fill="currentColor" />
            </svg>
            <span className="vlabels">
              <span className="vlatin">{b.title}</span>
              <span className="veng">{b.key}{!b.hasLatin ? ' · English only' : ''}</span>
            </span>
            <span className="vnote">{b.chapters} chapters</span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="vmap scripture-subway" onMouseOver={onOver} onMouseLeave={() => { hoverKey.current = null; setHover(null); }}>
      {hover && (
        <div className="chapter-flyout" style={{ left: hover.x, top: hover.y }}>
          <div className="cf-head">{hover.title}</div>
          <div className="cf-grid" role="menu" aria-label={`${hover.title} — chapters`}>
            <button onClick={() => { setHover(null); onOpen(hover.key); }}>〈whole book〉</button>
            {Array.from({ length: hover.chapters }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => { setHover(null); onOpen(`${hover.key}/${n}`); }}>{n}</button>
            ))}
          </div>
        </div>
      )}
      {trunk('① Vetus Testamentum', 'the Law, the Prophets, the Writings', 'var(--line-catechumens)', ot)}
      {trunk('② Novum Testamentum', 'the Gospel and the Apostles', 'var(--line-faithful)', nt)}
      <div className="vlegend"><span className="faded">Hover a book stop to open its chapters on the stop; click to read the book.</span></div>
    </div>
  );
}

/**
 * Y.3 — the breviary subway line: the eight hours as stops on the office
 * line. Hover previews the hour's parts (via the shared MapFlyout); click
 * opens the Divine Office at that hour.
 */
function OfficeSubway({ onOpen, activeHour }: { onOpen: (hour: string) => void; activeHour?: string }) {
  const [fly, setFly] = useState<{ title: string; subtitle: string; about: string; x: number; y: number } | null>(null);
  return (
    <div className="vmap office-subway" onMouseLeave={() => setFly(null)}>
      {fly && <MapFlyout title={fly.title} subtitle={fly.subtitle} incipit={null} about={fly.about} x={fly.x} y={fly.y} />}
      <div className="vline-header" style={{ color: 'var(--line-office)' }}>① Horæ Diurnæ <span>the day’s hours, from Matins to Compline</span></div>
      <div className="vtrunk" style={{ ['--line-color' as never]: 'var(--line-office)' }}>
        {OFFICE_CURSUS.map((h) => (
          <button
            key={h.id}
            className={`vstation shour${h.id === activeHour ? ' active-hour' : ''}`}
            onClick={() => onOpen(h.id)}
            onMouseEnter={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFly({
                title: h.latin,
                subtitle: `${h.english} · ${h.clock}`,
                about: h.parts.join(' · '),
                x: Math.min(r.left + 60, window.innerWidth - 340),
                y: r.bottom + 6,
              });
            }}
            onFocus={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setFly({ title: h.latin, subtitle: `${h.english} · ${h.clock}`, about: h.parts.join(' · '), x: Math.min(r.left + 60, window.innerWidth - 340), y: r.bottom + 6 });
            }}
            onBlur={() => setFly(null)}
          >
            <svg className="vdot" viewBox="0 0 34 34" aria-hidden="true">
              <circle className="vdot-pulse-halo" cx={17} cy={17} r={13} fill="currentColor" />
              <circle className="vdot-pulse-ring" cx={17} cy={17} r={12} fill="none" stroke="currentColor" strokeWidth={2} />
              <circle cx={17} cy={17} r={10.5} fill="#fff" stroke="currentColor" strokeWidth={4} />
              <circle cx={17} cy={17} r={4.5} fill="currentColor" />
            </svg>
            <span className="vlabels">
              <span className="vlatin">{h.latin}</span>
              <span className="veng">{h.english} — {h.parts.length} parts</span>
            </span>
            <span className="vnote">{h.clock}</span>
          </button>
        ))}
      </div>
      <div className="vlegend"><span className="faded">Click an hour to open the Divine Office there. The office line carries the breviary.</span></div>
    </div>
  );
}
