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

import { useMemo, useRef, useState } from 'react';
import { MASS_ORDO, trunkOf, branchOf, stationActive, type Station } from '../core/model/massOrdo.ts';
import { STATION_INFO } from '../core/model/stationLore.ts';
import { stationIncipits, type Incipit } from '../core/data/stationIncipits.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';
import MapFlyout, { type FlyoutData } from './MapFlyout.tsx';

interface Props {
  db: CorpusDb | null;
  day: DayInfo | null;
  onStation: (station: Station) => void;
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
  title, color, stations, accent, season, onStation, defaultOpen,
}: {
  title: string; color: string; stations: Station[]; accent: string;
  season: string; onStation: (s: Station) => void; defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const anyActive = stations.some((s) => stationActive(s, season as never));
  return (
    <div className={`vbranch${anyActive ? '' : ' inactive'}`} style={{ ['--branch-color' as never]: color }}>
      <button className="vbranch-head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="chev">{open ? '▾' : '▸'}</span> {title}
        {!anyActive && <span className="vnote">not travelled in {season}</span>}
      </button>
      {open && (
        <div className="vbranch-body">
          {stations.map((s) => (
            <StationRow key={s.id} s={s} accent={accent} active={stationActive(s, season as never)} onStation={onStation} small />
          ))}
          <div className="vreturn">└─ return</div>
        </div>
      )}
    </div>
  );
}

export default function SubwayMap({ db, day, onStation }: Props) {
  const accent = ACCENTS[String(day?.color ?? 'green')] ?? '#3f7a52';
  const season = day?.season ?? 'Time after Pentecost';
  const [full, setFull] = useState(false);
  const [flyout, setFlyout] = useState<FlyoutData | null>(null);
  const hoverSid = useRef<string | null>(null);

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
          <StationRow s={s} accent={accent} active={stationActive(s, season as never)} onStation={onStation} />
          {injectAfter[s.id]}
        </div>
      ))}
    </div>
  );

  return (
    <div className="vmap" onMouseOver={onOver} onMouseLeave={() => { hoverSid.current = null; setFlyout(null); }}>
      {flyout && <MapFlyout {...flyout} />}
      <div className="vmap-toolbar">
        <span className="vmap-hint">the whole Mass, one line, top to bottom</span>
        <button className="vmap-toggle" onClick={() => setFull(!full)}>
          {full ? '⊖ fold to skeleton' : '⊕ unfold full detail'}
        </button>
      </div>

      <div className="vline-header" style={{ color: 'var(--line-catechumens)' }}>
        ① Missa Catechumenorum <span>Mass of the Catechumens</span>
      </div>

      {full && asperges && (
        <div className="vtrunk" style={{ ['--line-color' as never]: 'var(--line-catechumens)' }}>
          <StationRow s={asperges} accent={accent} active onStation={onStation} />
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
