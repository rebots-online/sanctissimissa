/**
 * The Divine Office — the daily cursus of the eight canonical hours.
 * The loop line (the day's perpetual round of prayer) is the hour selector;
 * beneath it the selected hour's FULL text, constructed on demand from the
 * corpus by OfficeEngine.buildHour (psalmody, antiphons, hymns, lessons,
 * canticles, orations — all real corpus rows, Latin normative).
 */

import { useEffect, useMemo, useState } from 'react';
import { OFFICE_CURSUS } from '../core/model/officeCursus.ts';
import { buildHour, type OfficeEntry } from '../core/office/engine.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';
import { isScriptureCitationLine, isSpecialsControlLine } from '../core/liturgy/massSpecials.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { downloadExport, type ExportEntry } from '../core/export/exportFormats.ts';
import { shareUrl } from '../core/share/shareLink.ts';

function bangLineClass(line: string): 'suppress' | 'verse-ref' | 'rubric-text' {
  if (isSpecialsControlLine(line)) return 'suppress';
  if (isScriptureCitationLine(line)) return 'verse-ref';
  return 'rubric-text';
}

interface Props {
  db: CorpusDb;
  day: DayInfo | null;
  /** Selected hour id — lifted to App so the map strip stays in sync. */
  hour: string;
  onHour: (id: string) => void;
  sidecar?: SidecarDb | null;
}

/** Corpus text renderer: "!Citation" lines become styled rubric refs. */
function OfficeText({ text }: { text: string }) {
  return (
    <p>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('!')) {
          const kind = bangLineClass(line);
          if (kind === 'suppress') return null;
          return (
            <span className={kind} key={i}>
              {line.slice(1)}
            </span>
          );
        }
        return (
          <span key={i}>
            {line}
            {'\n'}
          </span>
        );
      })}
    </p>
  );
}

export default function OfficeView({ db, day, hour, onHour, sidecar }: Props) {
  const sel = OFFICE_CURSUS.find((h) => h.id === hour) ?? OFFICE_CURSUS[1];
  /** Accordion: folded section indices (per hour; reset on hour change). */
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  const R = 92;
  const CX = 130;
  const CY = 130;

  useEffect(() => setCollapsed(new Set()), [sel.id, day?.date]);

  const entries: OfficeEntry[] = useMemo(() => {
    if (!day) return [];
    try {
      return buildHour(db, day, sel.id);
    } catch {
      return [];
    }
  }, [db, day, sel.id]);

  const rubricsOn = (sidecar?.getSetting('mass.rubrics') ?? '1') === '1';
  const roleLens = sidecar?.getSetting('mass.roleLens') ?? 'off';

  return (
    <div className="content office-full" data-rubrics={rubricsOn ? 'on' : 'off'} data-role-lens={roleLens}>
      <aside className="office-rail">
        <svg className="office-loop" viewBox="0 0 260 260" role="img" aria-label="The eight canonical hours as a loop line">
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="var(--line-office)" strokeWidth={7} />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize={12} fontStyle="italic" fill="var(--ink-soft)" fontFamily="var(--serif)">
            Officium Divinum
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fontSize={9} fill="var(--ink-faint)">
            {day ? `${day.weekKey} · ${day.season}` : ''}
          </text>
          {OFFICE_CURSUS.map((h, i) => {
            const ang = (i / OFFICE_CURSUS.length) * Math.PI * 2 - Math.PI / 2;
            const x = CX + R * Math.cos(ang);
            const y = CY + R * Math.sin(ang);
            const lx = CX + (R + 24) * Math.cos(ang);
            const ly = CY + (R + 24) * Math.sin(ang);
            const active = sel.id === h.id;
            return (
              <g className="hour-node" key={h.id} onClick={() => onHour(h.id)}>
                <circle cx={x} cy={y} r={18} fill="transparent" stroke="none" />
                <circle cx={x} cy={y} r={active ? 10 : 7} fill="#fff" stroke={active ? 'var(--accent)' : 'var(--line-office)'} strokeWidth={active ? 4 : 3} />
                <text x={lx} y={ly + 3} textAnchor="middle" fontSize={10} fontFamily="var(--serif)" fontStyle="italic" fill="var(--ink)">
                  {h.latin}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="hour-meta">
          <h3>{sel.latin}</h3>
          <div className="eng">{sel.english} · circa {sel.clock}</div>
          {day && (
            <div className="eng" style={{ marginTop: 4 }}>
              {day.feastName ?? day.weekKey}
            </div>
          )}
        </div>
      </aside>

      <div className="reader office-reader">
        {!day && <p>Choose a date to construct the office.</p>}
        {day && entries.length === 0 && (
          <p>
            The corpus carries no constructible texts for <b>{sel.latin}</b> on {day.date} — this
            should not happen; please report the date.
          </p>
        )}
        {day && entries.length > 0 && (
          <div className="export-bar">
            <span className="export-label">Export {sel.latin}:</span>
            <button onClick={() => downloadExport('html', { day: day.date, feastName: day.feastName, season: day.season, source: sel.id }, entries.map((e) => ({ title: e.title, latin: e.latin, english: e.english, source: e.source, rubric: e.rubric })) as ExportEntry[])}>HTML</button>
            <button onClick={() => downloadExport('md', { day: day.date, feastName: day.feastName, season: day.season, source: sel.id }, entries.map((e) => ({ title: e.title, latin: e.latin, english: e.english, source: e.source, rubric: e.rubric })) as ExportEntry[])}>Markdown</button>
            <button onClick={() => downloadExport('json', { day: day.date, feastName: day.feastName, season: day.season, source: sel.id }, entries.map((e) => ({ title: e.title, latin: e.latin, english: e.english, source: e.source, rubric: e.rubric })) as ExportEntry[])}>JSON</button>
            <span className="export-sep" />
            <button onClick={() => { const url = shareUrl(`#/day/${day.date}`); if (navigator.share) navigator.share({ title: `${sel.latin} — ${day.feastName ?? day.date}`, text: `${sel.latin} — ${day.feastName ?? day.date}`, url }); else navigator.clipboard.writeText(url); }}>Share link</button>
          </div>
        )}
        {entries.map((e, i) =>
          e.rubric ? (
            <h2 className="office-heading" key={i}>
              {e.title}
            </h2>
          ) : (
            <section className={`reader-section${collapsed.has(i) ? ' collapsed' : ''}`} key={i} data-nodekey={e.source}>
              <div
                className="head"
                onClick={() => toggle(i)}
                role="button"
                aria-expanded={!collapsed.has(i)}
                title={collapsed.has(i) ? 'Unfold section' : 'Fold section away'}
              >
                <span className="chev">{collapsed.has(i) ? '▸' : '▾'}</span>
                <h3>{e.title}</h3>
                <span className="src">{e.source.replace(/^section:/, '')}</span>
              </div>
              {collapsed.has(i) ? null : (
              <div className="bilingual">
                <div className="latin" lang="la">
                  <span className="lang-tag">Latine</span>
                  {e.latin ? <OfficeText text={e.latin} /> : <p style={{ opacity: 0.5 }}>—</p>}
                </div>
                <div className="english" lang="en">
                  <span className="lang-tag">English</span>
                  {e.english ? <OfficeText text={e.english} /> : <p style={{ opacity: 0.5 }}>—</p>}
                </div>
              </div>
              )}
            </section>
          ),
        )}
      </div>
    </div>
  );
}
