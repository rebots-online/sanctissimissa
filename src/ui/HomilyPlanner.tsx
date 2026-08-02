/**
 * HomilyPlanner — selector-projected planning calendar for exposure 'homily'
 * (BD.2; entity row P-S `{ db, sidecar, day? }`; supersedes the PlannerView/
 * HomilyEditor rows). Month-grid math is self-contained — it mirrors
 * CalendarView's approach without importing it (BD.2 contract). Each cell
 * projects the homily accompaniments' occurrence selectors onto that cell's
 * resolved liturgical day via `matchesSelector`; resolveDay runs once per
 * visible cell, memoized per month. Priest/laity vocabulary from settings
 * `mode` ('priest' default → "Homily", laity → "Reflection").
 */

import { useMemo, useState } from 'react';
import { resolveDay } from '../core/data/liturgicalDay.ts';
import { matchesSelector } from '../core/accompaniment/resolve.ts';
import type { DayProjection } from '../core/accompaniment/resolve.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import type { Accompaniment } from '../core/accompaniment/types.ts';
import type { DayInfo } from '../core/data/types.ts';
import AccompanimentEditor from './AccompanimentEditor.tsx';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function projectionOf(info: DayInfo): DayProjection {
  return { date: info.date, weekKey: info.weekKey, season: info.season, winner: info.winner };
}

interface Cell {
  iso: string;
  info: DayInfo;
  matches: Accompaniment[];
}

interface Props {
  db: CorpusDb;
  sidecar: SidecarDb;
  day?: DayInfo | null;
}

export default function HomilyPlanner({ db, sidecar, day }: Props) {
  const start = day?.date ?? new Date().toISOString().slice(0, 10);
  const [ym, setYm] = useState<[number, number]>([Number(start.slice(0, 4)), Number(start.slice(5, 7))]);
  const [year, month] = ym;
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [tick, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);

  const mode = sidecar.getSetting('mode') ?? 'priest';
  const noun = mode === 'laity' ? 'Reflection' : 'Homily';

  const homilies = useMemo(() => {
    void tick; // re-list after saves
    return sidecar.list('homily');
  }, [sidecar, tick]);

  /** One resolveDay + selector projection per visible cell, per month. */
  const cells = useMemo<(Cell | null)[]>(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lead = first.getUTCDay();
    const out: (Cell | null)[] = Array.from({ length: lead }, () => null);
    for (let i = 1; i <= daysInMonth; i++) {
      const iso = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const info = resolveDay(db, iso);
      const proj = projectionOf(info);
      out.push({ iso, info, matches: homilies.filter((a) => a.selectors.some((s) => matchesSelector(s, proj))) });
    }
    return out;
  }, [db, homilies, year, month]);

  /** The coming Sunday (today when today is Sunday) and its matching drafts. */
  const sunday = useMemo(() => {
    const now = new Date();
    const add = (7 - now.getUTCDay()) % 7;
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + add));
    const iso = d.toISOString().slice(0, 10);
    const info = resolveDay(db, iso);
    const proj = projectionOf(info);
    return { iso, info, matches: homilies.filter((a) => a.selectors.some((s) => matchesSelector(s, proj))) };
  }, [db, homilies]);

  function shift(delta: number) {
    let [yy, mm] = ym;
    mm += delta;
    while (mm < 1) { mm += 12; yy--; }
    while (mm > 12) { mm -= 12; yy++; }
    setYm([yy, mm]);
    setSelectedIso(null);
    setNewOpen(false);
    setEditId(null);
  }

  const selected = selectedIso ? (cells.find((c) => c?.iso === selectedIso) ?? null) : null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const editing = editId ? (homilies.find((a) => a.id === editId) ?? null) : null;

  return (
    <div className="content">
      <div className="cal-head">
        <button onClick={() => shift(-12)} title="Previous year">«</button>
        <button onClick={() => shift(-1)} title="Previous month">‹</button>
        <h2>
          {noun} planner — {MONTHS[month - 1]} {year}
        </h2>
        <button onClick={() => shift(1)} title="Next month">›</button>
        <button onClick={() => shift(12)} title="Next year">»</button>
      </div>

      <div className="jsc-source">
        <b style={{ fontStyle: 'normal' }}>
          This Sunday's drafts — {sunday.iso} · {sunday.info.feastName ?? sunday.info.weekKey}
        </b>
        {sunday.matches.length === 0 ? (
          <div className="jsc-why">No {noun.toLowerCase()} notes are scheduled for this Sunday yet.</div>
        ) : (
          sunday.matches.map((a) => (
            <div key={a.id} className="jsc-toolbar">
              <span>{a.title || '(untitled)'}</span>
              <button type="button" onClick={() => setEditId(editId === a.id ? null : a.id)}>
                {editId === a.id ? 'Close editor' : 'Edit'}
              </button>
            </div>
          ))
        )}
      </div>

      <div className="cal-grid">
        {DOW.map((d) => (
          <div className="dow" key={d}>
            {d}
          </div>
        ))}
        {cells.map((c, i) =>
          c === null ? (
            <div className="cal-cell empty" key={`e${i}`} />
          ) : (
            <div
              className={`cal-cell${c.iso === todayIso ? ' today' : ''}${c.iso === selectedIso ? ' selected' : ''}`}
              key={c.iso}
              onClick={() => {
                setSelectedIso(c.iso);
                setNewOpen(false);
                setEditId(null);
              }}
              title={`${c.info.weekKey} — ${c.info.season}`}
            >
              <span className="n">{Number(c.iso.slice(8))}</span>
              {c.matches.slice(0, 3).map((a) => (
                <span
                  key={a.id}
                  className="dot"
                  style={{ background: 'var(--accent)' }}
                  title={a.title || noun}
                />
              ))}
              {c.matches.length > 3 && <span className="jsc-why">+{c.matches.length - 3}</span>}
              <div className="feast">{c.info.feastName ?? c.info.weekKey}</div>
            </div>
          ),
        )}
      </div>

      {selected && (
        <section className="jsc-related">
          <div className="group-title">
            {noun} notes · {selected.iso} · {selected.info.feastName ?? selected.info.weekKey}
          </div>
          {selected.matches.length === 0 && (
            <div className="jsc-why">No {noun.toLowerCase()} notes match this day.</div>
          )}
          {selected.matches.map((a) => (
            <article className="jsc-card" key={a.id}>
              <span className="jsc-evidence">
                <span className="chip">{noun}</span>
              </span>
              <div>
                <b>{a.title || '(untitled)'}</b>
                {a.quote && (
                  <div className="jsc-why" style={{ fontStyle: 'italic' }}>
                    “{a.quote.slice(0, 120)}”
                  </div>
                )}
                <div className="jsc-evidence">
                  {a.selectors
                    .filter((s) => s.kind !== 'theme')
                    .map((s) => (
                      <span className="chip" key={s.id}>
                        {s.kind}: {s.value}
                      </span>
                    ))}
                </div>
                <div className="jsc-toolbar">
                  <button type="button" onClick={() => setEditId(editId === a.id ? null : a.id)}>
                    {editId === a.id ? 'Close editor' : 'Edit'}
                  </button>
                </div>
              </div>
            </article>
          ))}
          <div className="jsc-toolbar">
            <button
              type="button"
              onClick={() => {
                setNewOpen(true);
                setEditId(null);
              }}
            >
              New {noun.toLowerCase()} note for this day
            </button>
          </div>
          {newOpen && (
            <AccompanimentEditor
              key={selected.iso}
              sidecar={sidecar}
              acc={null}
              day={selected.info}
              onReady={(api) => api.setExposure('homily')}
              onSaved={bump}
              onClose={() => setNewOpen(false)}
            />
          )}
        </section>
      )}

      {editing && (
        <AccompanimentEditor
          key={editing.id}
          sidecar={sidecar}
          acc={editing}
          onSaved={bump}
          onClose={() => setEditId(null)}
        />
      )}
    </div>
  );
}
