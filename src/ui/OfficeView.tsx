/**
 * The Divine Office — the daily cursus of the eight canonical hours.
 * The loop line (the day's perpetual round of prayer) is the hour selector;
 * beneath it the selected hour's FULL text, constructed on demand from the
 * corpus by OfficeEngine.buildHour (psalmody, antiphons, hymns, lessons,
 * canticles, orations — all real corpus rows, Latin normative).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { OFFICE_CURSUS } from '../core/model/officeCursus.ts';
import { buildHour, type OfficeEntry } from '../core/office/engine.ts';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo } from '../core/data/types.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import SectionReader, { type ReaderSection, type SelectionAction } from './SectionReader.tsx';
import OfficeHourMap from './OfficeHourMap.tsx';
import { downloadExport, type ExportEntry } from '../core/export/exportFormats.ts';
import { shareUrl } from '../core/share/shareLink.ts';

interface Props {
  db: CorpusDb;
  day: DayInfo | null;
  /** Selected hour id — lifted to App so the map strip stays in sync. */
  hour: string;
  onHour: (id: string) => void;
  sidecar?: SidecarDb | null;
  onAction?: (a: SelectionAction) => void;
  onCapture?: (capture: { quote: string; quoteAlt?: string; anchor: string | null }) => void;
}

export default function OfficeView({ db, day, hour, onHour, sidecar, onAction, onCapture }: Props) {
  const sel = OFFICE_CURSUS.find((h) => h.id === hour) ?? OFFICE_CURSUS[1];
  const R = 92;
  const CX = 130;
  const CY = 130;
  const rootRef = useRef<HTMLDivElement>(null);
  /** Until this timestamp the scroll-spy stays quiet — programmatic part-jumps
   *  must not fight their own scroll (same guard as the Mass reader's). */
  const spyMuteUntil = useRef(0);
  const [activeAnchor, setActiveAnchor] = useState<string | null>(null);

  const entries: OfficeEntry[] = useMemo(() => {
    if (!day) return [];
    try {
      return buildHour(db, day, sel.id);
    } catch {
      return [];
    }
  }, [db, day, sel.id]);

  // Scroll-spy over the hour's sections → the OfficeHourMap's you-are-here
  // (the Mass strip's mechanism, decision 23's part-stations).
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !entries.length) return;
    const observer = new IntersectionObserver(
      (hits) => {
        for (const hit of hits) {
          if (hit.isIntersecting && Date.now() > spyMuteUntil.current) {
            const anchor = (hit.target as HTMLElement).dataset.section;
            if (anchor) setActiveAnchor(anchor);
          }
        }
      },
      { root, rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    );
    root.querySelectorAll('section[data-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries]);

  /** OfficeHourMap part-jump: scroll the reader to that entry's section. */
  const jumpTo = (anchor: string) => {
    const root = rootRef.current;
    if (!root) return;
    const el = root.querySelector(`[data-section="${CSS.escape(anchor)}"]`) as HTMLElement | null;
    if (!el) return;
    spyMuteUntil.current = Date.now() + 900;
    const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 6;
    root.scrollTo({ top, behavior: 'smooth' });
    setActiveAnchor(anchor);
  };

  const rubricsOn = (sidecar?.getSetting('mass.rubrics') ?? '1') === '1';
  const roleLens = sidecar?.getSetting('mass.roleLens') ?? 'off';

  /**
   * The hour's constructed entries as reader sections. Rubric entries are bare
   * headings; everything else gets the full reading surface — which is what
   * gives the Breviary the synchronized highlight, the flyout and the context
   * menu it never had (BUGS #2, #10).
   */
  const sections: ReaderSection[] = entries.map((e, i) => ({
    anchor: `${e.source}#${i}`,
    nodeKey: e.source,
    title: e.title,
    latin: e.latin,
    english: e.english,
    headingOnly: e.rubric,
    meta: <span className="src">{e.source.replace(/^section:/, '')}</span>,
  }));

  const exportEntries = entries.map((e) => ({
    title: e.title,
    latin: e.latin,
    english: e.english,
    source: e.source,
    rubric: e.rubric,
  })) as ExportEntry[];
  const exportMeta = {
    day: day?.date ?? '',
    feastName: day?.feastName ?? null,
    season: day?.season ?? 'Tempus per Annum',
    source: sel.id,
  };

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
        <OfficeHourMap entries={entries} activeAnchor={activeAnchor} onJump={jumpTo} />
      </aside>

      <SectionReader
        db={db}
        baseClass="reader office-reader"
        sections={sections}
        sidecar={sidecar}
        onAction={onAction}
        onCapture={onCapture}
        rootRef={rootRef}
        toolbar={
          <>
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
                <button onClick={() => downloadExport('html', exportMeta, exportEntries)}>HTML</button>
                <button onClick={() => downloadExport('md', exportMeta, exportEntries)}>Markdown</button>
                <button onClick={() => downloadExport('json', exportMeta, exportEntries)}>JSON</button>
                <span className="export-sep" />
                <button
                  onClick={() => {
                    const url = shareUrl(`#/day/${day.date}`);
                    const title = `${sel.latin} — ${day.feastName ?? day.date}`;
                    if (navigator.share) navigator.share({ title, text: title, url });
                    else navigator.clipboard.writeText(url);
                  }}
                >
                  Share link
                </button>
              </div>
            )}
          </>
        }
      />
    </div>
  );
}
