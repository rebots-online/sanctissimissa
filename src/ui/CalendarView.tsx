/**
 * Perpetual universal calendar — any month of any year, computed on demand
 * from Butcher's computus + the corpus graph. Nothing is pre-generated.
 */

import { useState } from 'react';
import { resolveDay } from '../core/data/liturgicalDay.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';

interface Props {
  db: CorpusDb;
  selected: string;
  onPick: (iso: string) => void;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ db, selected, onPick }: Props) {
  const [y0, m0] = selected.split('-').map(Number);
  const [ym, setYm] = useState<[number, number]>([y0, m0]);
  const [year, month] = ym;

  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = first.getUTCDay();
  const todayIso = new Date().toISOString().slice(0, 10);

  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) =>
      `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ];

  function shift(delta: number) {
    let [yy, mm] = ym;
    mm += delta;
    if (mm < 1) { mm = 12; yy--; }
    if (mm > 12) { mm = 1; yy++; }
    setYm([yy, mm]);
  }

  return (
    <div className="content">
      <div className="cal-head">
        <button onClick={() => shift(-12)} title="Previous year">«</button>
        <button onClick={() => shift(-1)} title="Previous month">‹</button>
        <h2>{MONTHS[month - 1]} {year}</h2>
        <button onClick={() => shift(1)} title="Next month">›</button>
        <button onClick={() => shift(12)} title="Next year">»</button>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          Perpetual — computed on demand by Butcher's Easter computus (any year, past or future)
        </span>
      </div>
      <div className="cal-grid">
        {DOW.map((d) => <div className="dow" key={d}>{d}</div>)}
        {cells.map((iso, i) => {
          if (!iso) return <div className="cal-cell empty" key={`e${i}`} />;
          const day = resolveDay(db, iso);
          return (
            <div
              className={`cal-cell${iso === todayIso ? ' today' : ''}${iso === selected ? ' selected' : ''}`}
              key={iso}
              onClick={() => onPick(iso)}
              title={`${day.weekKey} — ${day.season}`}
            >
              <span className="n">{Number(iso.slice(8))}</span>
              <span className={`dot lc-${day.color}`} />
              <div className="feast">{day.feastName ?? day.weekKey}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
