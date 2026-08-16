/**
 * Bilingual exegetical reader — the day's Mass propers in canonical order,
 * Latin normative on the left, English translation on the right.
 *
 * This view now owns only what is proper to the Mass: assembling the day's
 * propers and Ordinary in `READER_ORDER`, applying the seasonal chant switch
 * and the Mass specials filter, focus scrolling, and the scroll-spy that
 * drives the map strip. Everything about *reading* — the synchronized line
 * echo, the translation flyout, the selection menu, highlights and
 * annotations — belongs to `SectionReader`, which the Office and Scripture
 * readers mount identically.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo, SectionText } from '../core/data/types.ts';
import { MASS_ORDO, READER_ORDER, ORDO_STATION_ANCHOR_AT, stationAnchorCandidates, chantRenders } from '../core/model/massOrdo.ts';
import type { Season } from '../core/calendar/computus.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { massTextsForDay } from '../core/data/liturgicalDay.ts';
import SectionReader, { type ReaderSection, type SelectionAction } from './SectionReader.tsx';
import {
  applyMassSpecialsBilingual,
  massSpecialsContextFromDay,
} from '../core/liturgy/massSpecials.ts';
import { downloadExport, type ExportEntry } from '../core/export/exportFormats.ts';
import { shareUrl } from '../core/share/shareLink.ts';

/** Re-exported: the exegesis request shape is owned by SectionReader now. */
export type { SelectionAction };

interface Props {
  db: CorpusDb;
  day: DayInfo;
  focusSection: string | null;
  /** Bumped on every navigation request so re-clicking the same station re-scrolls. */
  focusNonce: number;
  onAction: (a: SelectionAction) => void;
  sidecar?: SidecarDb | null;
  onCapture?: (capture: { quote: string; quoteAlt?: string; anchor: string | null }) => void;
  /** Scroll-spy: reports the section anchor under the reading band (for the map strip). */
  onVisibleSection?: (anchor: string) => void;
}

/** One renderable entry of the interleaved full-Mass reader. */
interface ReaderEntry extends SectionText {
  ordinary: boolean;
  displayTitle: string;
  /** Unique data-section anchor ("Introitus" or "ordo:Canon"). */
  anchor: string;
}

export default function ReaderView({
  db,
  day,
  focusSection,
  focusNonce,
  onAction,
  sidecar,
  onCapture,
  onVisibleSection,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  /** Until this timestamp the scroll-spy stays quiet — programmatic scrolls must not echo. */
  const spyMuteUntil = useRef(0);
  /** Anchor SectionReader must unfold before we scroll to it. */
  const [openAnchor, setOpenAnchor] = useState<string | null>(null);

  const path = day.winner?.key ?? day.temporaPath;
  const solemn = (sidecar?.getSetting('mass.solemn') ?? '0') === '1';
  const rubricsOn = (sidecar?.getSetting('mass.rubrics') ?? '1') === '1';
  const roleLens = sidecar?.getSetting('mass.roleLens') ?? 'off';

  const entries: ReaderEntry[] = useMemo(() => {
    const propers = new Map(massTextsForDay(db, day).texts.map((s) => [s.section, s]));
    const ordo = db.getOrdoTexts();
    const prayers = db.getPrayersTexts();
    const specialsCtx = massSpecialsContextFromDay(day, { solemn });
    const out: ReaderEntry[] = [];
    for (const slot of READER_ORDER) {
      if (slot.kind === 'prayers') {
        // The sprinkling rite is a Sunday station (Vidi aquam in
        // Paschaltide — same slot, seasonal text, DO `Vidiaquam`).
        if (day.weekday !== 'Sunday') continue;
        const s = prayers.get(slot.section)
          ?? prayers.get(day.season === 'Paschaltide' ? 'Vidi aquam' : slot.section);
        if (s && (s.latin || s.english)) {
          out.push({ ...s, ordinary: true, displayTitle: slot.title ?? s.section, anchor: `prayers:${slot.section}` });
        }
      } else if (slot.kind === 'proper') {
        // Seasonal chant switch: a feast file may carry all four chant
        // alternatives (Graduale/Alleluia/Tractus/GradualeP for whenever the
        // feast falls) — render the season's own per chantRenders (the
        // GradualeP text is the per-annum Alleluia too).
        if (!chantRenders(slot.section, day.season as Season, new Set(propers.keys()))) continue;
        const s = propers.get(slot.section);
        if (s) {
          const filtered = applyMassSpecialsBilingual(s.latin, s.english, specialsCtx);
          const title = slot.section === 'GradualeP' && day.season !== 'Paschaltide' ? 'Alleluia' : s.section;
          out.push({ ...s, latin: filtered.latin || null, english: filtered.english || null, ordinary: false, displayTitle: title, anchor: s.section });
        }
      } else {
        const s = ordo.get(slot.section);
        if (s && (s.latin || s.english)) {
          const filtered = applyMassSpecialsBilingual(s.latin, s.english, specialsCtx);
          out.push({
            ...s,
            latin: filtered.latin || null,
            english: filtered.english || null,
            ordinary: true,
            displayTitle: slot.title ?? s.section,
            anchor: `ordo:${slot.section}`,
          });
        }
      }
    }
    return out;
  }, [db, path, day.season, day.weekKey, day.weekday, day.rank, day.feastName, day.winner, day.temporaPath, solemn]);

  useEffect(() => {
    if (focusSection && rootRef.current) {
      // Station → anchor candidates in the same order the map resolves them:
      // Ordo/Prayers home, Ordo/Missae home, proper section, chant fallbacks.
      // Focus arrives as a station id OR a proper sectionKey (and deep links
      // pass raw keys) — resolve to the station first so the candidate and
      // line-anchor tables apply.
      const st = MASS_ORDO.find((x) => x.id === focusSection || x.sectionKey === focusSection);
      const stationId = st?.id ?? focusSection;
      const cands = stationAnchorCandidates(stationId);
      const root = rootRef.current;
      let el: HTMLElement | null = null;
      for (const c of cands) {
        el = root.querySelector(`[data-section="${CSS.escape(c)}"]`);
        if (el) break;
      }
      if (el) {
        // Deterministic container scroll — never scrollIntoView, whose
        // scroll-chain heuristics land inconsistently.
        const scrollToEl = (target: HTMLElement) => {
          const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 6;
          root.scrollTo({ top, behavior: 'smooth' });
        };
        // Line-level refinement: a station inside a multi-part section (the
        // Confiteor within the foot-of-altar Incipit; the Alleluia verse
        // inside a Sunday Graduale) scrolls to its own line, not the section
        // top — in either reader layout (interleaved pairs / Latin column
        // spans). A folded section renders no body, so the first pass runs
        // before the unfold paints; retry once after the unfold renders.
        const at = ORDO_STATION_ANCHOR_AT[stationId];
        const tryLine = () => {
          if (!at) return false;
          const line = Array.from(el!.querySelectorAll('.il-pair, .latin p > span')).find((c) => at.test(c.textContent ?? ''));
          if (!line) return false;
          scrollToEl(line as HTMLElement);
          return true;
        };
        // Navigating to a folded section unfolds it.
        setOpenAnchor((el as HTMLElement).dataset.section ?? null);
        spyMuteUntil.current = Date.now() + 900;
        if (!tryLine()) {
          scrollToEl(el);
          requestAnimationFrame(() => requestAnimationFrame(tryLine));
        }
      }
    }
  }, [focusSection, focusNonce, day.date]);

  // Scroll-spy (the HelloWord mechanism): an asymmetric band in the upper part
  // of the viewport is the "reading position"; whichever section crosses it
  // becomes the map strip's you-are-here.
  useEffect(() => {
    if (!onVisibleSection || !rootRef.current) return;
    const observer = new IntersectionObserver(
      (hits) => {
        for (const hit of hits) {
          if (hit.isIntersecting && Date.now() > spyMuteUntil.current) {
            const anchor = (hit.target as HTMLElement).dataset.section;
            if (anchor) onVisibleSection(anchor);
          }
        }
      },
      { root: rootRef.current, rootMargin: '-20% 0px -65% 0px', threshold: 0 },
    );
    rootRef.current.querySelectorAll('section[data-section]').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [entries, onVisibleSection, openAnchor, focusNonce]);

  const exportEntries: ExportEntry[] = entries.map((s) => ({
    title: s.displayTitle,
    latin: s.latin,
    english: s.english,
    source: s.sourcePath,
  }));
  const exportMeta = { day: day.date, feastName: day.feastName, season: day.season, source: path };
  const shareDay = () => {
    const url = shareUrl(`#/day/${day.date}`);
    if (navigator.share) navigator.share({ title: day.feastName ?? day.date, text: day.feastName ?? day.date, url });
    else navigator.clipboard.writeText(url);
  };

  if (entries.length === 0) {
    return (
      <div className="content reader" ref={rootRef}>
        <p>
          No Mass propers stored for <b>{path}</b> — this office delegates to the ferial or
          commune texts. Choose another date, or open the tempora office{' '}
          <b>{day.temporaPath}</b> from the calendar.
        </p>
      </div>
    );
  }

  const sections: ReaderSection[] = entries.map((s) => ({
    anchor: s.anchor,
    nodeKey: s.nodeKey,
    title: s.displayTitle,
    sectionClass: s.ordinary ? 'ordinary' : undefined,
    latin: s.latin,
    english: s.english,
    meta: (
      <span className={`src${s.fromCommune ? ' commune' : ''}`}>
        {s.ordinary ? 'Ordinarium Missæ' : s.fromCommune ? `ex communi — ${s.sourcePath} (vide)` : s.sourcePath}
      </span>
    ),
  }));

  return (
    <SectionReader
      db={db}
      sections={sections}
      sidecar={sidecar}
      onAction={onAction}
      onCapture={onCapture}
      rootRef={rootRef}
      openAnchor={openAnchor}
      openNonce={focusNonce}
      rootData={{ 'data-rubrics': rubricsOn ? 'on' : 'off', 'data-role-lens': roleLens }}
      toolbar={
        <div className="export-bar">
          <span className="export-label">Export:</span>
          <button onClick={() => downloadExport('html', exportMeta, exportEntries)}>HTML</button>
          <button onClick={() => downloadExport('md', exportMeta, exportEntries)}>Markdown</button>
          <button onClick={() => downloadExport('json', exportMeta, exportEntries)}>JSON</button>
          <span className="export-sep" />
          <button onClick={shareDay}>Share link</button>
        </div>
      }
    />
  );
}
