/**
 * Bilingual exegetical reader — the day's Mass propers in canonical order,
 * Latin normative on the left, English translation on the right. Text
 * selection (or right-click) opens the exegesis context menu:
 * Catholic meaning · similar passages · cross-references · annotate.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CorpusDb } from '../core/data/corpusDb.ts';
import type { DayInfo, SectionText } from '../core/data/types.ts';
import { MASS_ORDO, READER_ORDER, ORDO_STATION_SECTION, stationActive } from '../core/model/massOrdo.ts';
import type { Season } from '../core/calendar/computus.ts';
import { annotationsFor, addAnnotation, removeAnnotation, type Annotation } from '../core/annotations/store.ts';
import type { SidecarDb } from '../core/accompaniment/store.ts';
import { massTextsForDay } from '../core/data/liturgicalDay.ts';
import { alignSelection, alignPhrase, wordEcho, wordAtPoint, type WordEchoResult, type PhraseSelectionInput } from '../core/text/align.ts';
import BilingualText, { TextLines, useNarrow, type SelectionEcho } from './BilingualText.tsx';
import {
  applyMassSpecialsBilingual,
  massSpecialsContextFromDay,
} from '../core/liturgy/massSpecials.ts';
import {
  placeFloatingCallout,
  reconcileCallout,
  type DOMRectLike,
  type FloatingCalloutPlacement,
} from '../core/ui/calloutPlacement.ts';
import { downloadExport, type ExportEntry } from '../core/export/exportFormats.ts';
import { shareUrl } from '../core/share/shareLink.ts';

export interface SelectionAction {
  kind: 'meaning' | 'similar' | 'crossrefs';
  term: string;
  nodeKey: string | null;
}

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

interface Menu {
  x: number;
  y: number;
  term: string;
  nodeKey: string | null;
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
  const [menu, setMenu] = useState<Menu | null>(null);
  const [noteFor, setNoteFor] = useState<Menu | null>(null);
  const [noteText, setNoteText] = useState('');
  const [annVersion, setAnnVersion] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  /** Until this timestamp the scroll-spy stays quiet — programmatic scrolls must not echo. */
  const spyMuteUntil = useRef(0);
  /** Accordion: anchors whose body is folded away (all open by default). */
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  /** Interleave switch: below 1100px the two-pane grid becomes one column. */
  const narrow = useNarrow(1100);
  /** Live translation echo: the aligned same-index line in the other pane
   *  highlights on hover (desktop), short-tap (touch), or during selection —
   *  the corpus is line-parallel, so the line IS the in-context translation.
   *  The echo is a line RANGE `[from,to]` within one section: hover/tap set a
   *  one-line range; a live selection sets its full line span (BK.2). */
  const [echo, setEcho] = useState<{ nodeKey: string; from: number; to: number } | null>(null);
  /** Live phrase echo: shows the aligned counterpart of the selected text */
  const [livePhraseEcho, setLivePhraseEcho] = useState<SelectionEcho | null>(null);
  const echoFromEvent = (e: React.SyntheticEvent) => {
    const t = e.target as HTMLElement;
    const line = t.closest?.('span[data-line]') as HTMLElement | null;
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    if (line && sec?.dataset.nodekey) {
      const idx = Number(line.dataset.line);
      setEcho({ nodeKey: sec.dataset.nodekey, from: idx, to: idx });
    }
  };
  /** Word callout: hover (desktop) / finger-hold (touch) — placed via placeFloatingCallout (BX.1 parity). */
  const [callout, setCallout] = useState<{
    anchor: DOMRectLike;
    word: string;
    echo: WordEchoResult;
    placement?: FloatingCalloutPlacement;
  } | null>(null);
  const echoCache = useRef(new Map<string, WordEchoResult | null>());
  const lastWord = useRef<string | null>(null);
  const calloutElRef = useRef<HTMLDivElement>(null);
  const anchorElRef = useRef<HTMLElement | null>(null);
  const showCallout = (e: React.PointerEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest?.('.verse-ref, .rubric-text')) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const word = wordAtPoint(e.clientX, e.clientY);
    const sec = t.closest?.('section[data-nodekey]') as HTMLElement | null;
    const nodeKey = sec?.dataset.nodekey ?? null;
    if (!word || !nodeKey) {
      lastWord.current = null;
      setCallout(null);
      return;
    }
    const cacheKey = `${nodeKey}|${word.toLowerCase()}`;
    if (lastWord.current === cacheKey) return;
    lastWord.current = cacheKey;
    const src = entries.find((en) => en.nodeKey === nodeKey);
    if (!src) return setCallout(null);
    let result = echoCache.current.get(cacheKey);
    if (result === undefined) {
      result = wordEcho(db, { latin: src.latin, english: src.english }, word);
      echoCache.current.set(cacheKey, result);
    }
    if (result?.word) {
      const lineEl = t.closest?.('span[data-line]') as HTMLElement | null;
      const anchorEl = lineEl ?? t;
      anchorElRef.current = anchorEl;
      const r = anchorEl.getBoundingClientRect();
      setCallout({
        anchor: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
        word,
        echo: result,
      });
    } else setCallout(null);
  };

  useLayoutEffect(() => {
    if (!callout) return;
    const anchorEl = anchorElRef.current;
    if (!anchorEl || !anchorEl.isConnected) {
      setCallout(null);
      return;
    }
    const r = anchorEl.getBoundingClientRect();
    const anchor = { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    const box = { width: calloutElRef.current?.offsetWidth ?? 0, height: calloutElRef.current?.offsetHeight ?? 0 };
    const viewport = {
      left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight,
      width: window.innerWidth, height: window.innerHeight,
    };
    const placement = placeFloatingCallout(anchor, box, viewport);
    setCallout((prev) => (prev ? reconcileCallout(prev, anchor, placement) : null));
  }, [callout?.echo]);
  const toggleSection = (anchor: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(anchor)) next.delete(anchor);
      else next.add(anchor);
      return next;
    });

  const path = day.winner?.key ?? day.temporaPath;
  const solemn = (sidecar?.getSetting('mass.solemn') ?? '0') === '1';
  const rubricsOn = (sidecar?.getSetting('mass.rubrics') ?? '1') === '1';
  const roleLens = sidecar?.getSetting('mass.roleLens') ?? 'off';
  const entries: ReaderEntry[] = useMemo(() => {
    const propers = new Map(massTextsForDay(db, day).texts.map((s) => [s.section, s]));
    const ordo = db.getOrdoTexts();
    const specialsCtx = massSpecialsContextFromDay(day, { solemn });
    const out: ReaderEntry[] = [];
    for (const slot of READER_ORDER) {
      if (slot.kind === 'proper') {
        // Seasonal chant switch: a feast file may carry all four chant
        // alternatives (Graduale/Alleluia/Tractus/GradualeP for whenever the
        // feast falls) — render only the season's own, per the rubric the
        // subway map already encodes.
        const sw = MASS_ORDO.find((st) => st.branch === 'chant' && st.sectionKey === slot.section);
        if (sw && !stationActive(sw, day.season as Season)) continue;
        const s = propers.get(slot.section);
        if (s) {
          const filtered = applyMassSpecialsBilingual(s.latin, s.english, specialsCtx);
          out.push({ ...s, latin: filtered.latin || null, english: filtered.english || null, ordinary: false, displayTitle: s.section, anchor: s.section });
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
      // Accept a proper section key, an Ordo anchor, or an ordinary station id.
      const anchor = ORDO_STATION_SECTION[focusSection]
        ? `ordo:${ORDO_STATION_SECTION[focusSection]}`
        : focusSection;
      const root = rootRef.current;
      const el =
        root.querySelector(`[data-section="${CSS.escape(anchor)}"]`) ??
        root.querySelector(`[data-section="${CSS.escape(focusSection)}"]`);
      if (el) {
        // Navigating to a folded section unfolds it.
        const target = (el as HTMLElement).dataset.section;
        if (target) setCollapsed((prev) => {
          if (!prev.has(target)) return prev;
          const next = new Set(prev);
          next.delete(target);
          return next;
        });
        spyMuteUntil.current = Date.now() + 900;
        // Scroll the reader container itself, deterministically — never
        // scrollIntoView, whose scroll-chain heuristics land inconsistently.
        const top = el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop - 6;
        root.scrollTo({ top, behavior: 'smooth' });
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
  }, [entries, onVisibleSection]);

  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, []);

  // Drag-selection echoes too: while selecting, every line the selection
  // spans highlights its counterpart(s) ("the cursor selects both languages
  // simultaneously"). Anchor AND focus resolve to data-line spans; within
  // one section the echo covers the full [min,max] line range (BK.2).
  useEffect(() => {
    const lineInfoAt = (node: Node | null): { nodeKey: string; idx: number; lang: 'latin' | 'english' | null; lineText: string; start: number; end: number } | null => {
      let el: Node | null = node;
      while (el && el !== rootRef.current) {
        if (el instanceof HTMLElement && el.dataset.line !== undefined) {
          const sec = el.closest('section[data-nodekey]') as HTMLElement | null;
          if (!sec?.dataset.nodekey) return null;
          const nodeKey = sec.dataset.nodekey;
          const idx = Number(el.dataset.line);
          const lang = (el.dataset.lang ?? null) as 'latin' | 'english' | null;
          
          // Get the full line text by finding the containing text node
          const lineEl = el.closest('span[data-line]') as HTMLElement | null;
          if (!lineEl) return null;
          
          const lineText = lineEl.textContent ?? '';
          
          // Find character offset within the line
          let start = 0;
          let end = lineText.length;
          
          // Walk from node to line element to find position
          let current: Node | null = node;
          let foundLine = false;
          while (current && current !== lineEl) {
            if (current.nodeType === Node.TEXT_NODE) {
              const siblings = Array.from(lineEl.childNodes);
              let pos = 0;
              for (const sibling of siblings) {
                if (sibling === current) {
                  if (!foundLine) {
                    start = pos;
                  }
                  break;
                }
                if (sibling.nodeType === Node.TEXT_NODE) {
                  pos += (sibling.textContent ?? '').length;
                }
              }
              foundLine = true;
            }
            current = current.parentNode;
          }
          
          return { nodeKey, idx, lang, lineText, start, end };
        }
        el = el.parentNode;
      }
      return null;
    };

    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !rootRef.current) {
        setLivePhraseEcho(null);
        return;
      }

      const range = sel.getRangeAt(0);
      
      const anchorInfo = lineInfoAt(range.startContainer);
      const focusInfo = lineInfoAt(range.endContainer);
      
      // Only handle selection within one language/section/line
      if (anchorInfo && focusInfo && 
          anchorInfo.nodeKey === focusInfo.nodeKey && 
          anchorInfo.idx === focusInfo.idx &&
          anchorInfo.lang && focusInfo.lang &&
          anchorInfo.lang === focusInfo.lang) {
        
        setEcho({ nodeKey: anchorInfo.nodeKey, from: anchorInfo.idx, to: anchorInfo.idx });
        
        // Compute exact character endpoints from range
        const rangeStartOffset = range.startOffset;
        const rangeEndOffset = range.endOffset;
        
        // Build absolute character positions
        const start = rangeStartOffset + (anchorInfo.start || 0);
        const end = rangeEndOffset + (focusInfo.start || 0);
        
        // Call alignPhrase with exact selection
        const src = entries.find((en) => en.nodeKey === anchorInfo.nodeKey);
        if (src && anchorInfo.lang) {
          const selection: PhraseSelectionInput = {
            srcLang: anchorInfo.lang,
            idx: anchorInfo.idx,
            start: Math.min(start, end),
            end: Math.max(start, end),
          };
          
          const aligned = alignPhrase(db, { latin: src.latin, english: src.english }, selection);
          if (aligned && aligned.dstLine) {
            const dstLang = aligned.srcLang === 'latin' ? 'english' : 'latin';
            setLivePhraseEcho({
              lang: dstLang,
              line: aligned.idx,
              start: aligned.dstStart,
              end: aligned.dstEnd,
            });
          } else {
            setLivePhraseEcho(null);
          }
        } else {
          setLivePhraseEcho(null);
        }
      } else if (anchorInfo) {
        setEcho({ nodeKey: anchorInfo.nodeKey, from: anchorInfo.idx, to: anchorInfo.idx });
        setLivePhraseEcho(null);
      } else if (focusInfo) {
        setEcho({ nodeKey: focusInfo.nodeKey, from: focusInfo.idx, to: focusInfo.idx });
        setLivePhraseEcho(null);
      } else {
        setLivePhraseEcho(null);
      }
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, [db, entries]);

  function openMenu(e: React.MouseEvent, nodeKey: string | null) {
    const sel = window.getSelection()?.toString().trim() ?? '';
    if (!sel) return;
    e.preventDefault();
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 270), y: Math.min(e.clientY + 6, window.innerHeight - 220), term: sel.slice(0, 300), nodeKey });
  }

  function captureFrom(m: Menu) {
    const src = entries.find((entry) => entry.nodeKey === m.nodeKey);
    const aligned = src ? alignSelection({ latin: src.latin, english: src.english }, m.term) : null;
    return {
      quote: m.term,
      quoteAlt: aligned?.dstLine ?? undefined,
      anchor: m.nodeKey,
    };
  }

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

  return (
    <div
      className="content reader"
      ref={rootRef}
      data-rubrics={rubricsOn ? 'on' : 'off'}
      data-role-lens={roleLens}
      onContextMenu={(e) => {
        const sel = window.getSelection()?.toString().trim();
        if (sel) openMenu(e, menuNodeKeyFromSelection(rootRef.current));
      }}
      onMouseUp={(e) => {
        // Left-release with a selection also offers the menu (touch-friendly).
        if (e.button === 0) {
          const sel = window.getSelection()?.toString().trim();
          if (sel && sel.length > 1) openMenu(e, menuNodeKeyFromSelection(rootRef.current));
        }
      }}
      onPointerOver={(e) => {
        if (window.matchMedia('(hover: hover)').matches) echoFromEvent(e);
      }}
      onPointerMove={(e) => {
        if (e.pointerType === 'mouse' && window.matchMedia('(hover: hover)').matches) showCallout(e);
      }}
      onPointerDown={(e) => {
        // Touch: while the finger holds on a word, peek its correspondence.
        if (e.pointerType !== 'mouse') {
          echoFromEvent(e);
          showCallout(e);
        }
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'mouse') {
          lastWord.current = null;
          setCallout(null);
        }
      }}
      onPointerLeave={() => {
        lastWord.current = null;
        setCallout(null);
      }}
      onClick={echoFromEvent}
    >
      <div className="export-bar">
        <span className="export-label">Export:</span>
        <button onClick={() => downloadExport('html', exportMeta, exportEntries)}>HTML</button>
        <button onClick={() => downloadExport('md', exportMeta, exportEntries)}>Markdown</button>
        <button onClick={() => downloadExport('json', exportMeta, exportEntries)}>JSON</button>
        <span className="export-sep" />
        <button onClick={shareDay}>Share link</button>
      </div>
      {entries.map((s) => {
        const anns = annotationsFor(s.nodeKey);
        const highlights = sidecar?.forAnchor(s.nodeKey) ?? [];
        const quotes = [...new Set(
          [...anns, ...highlights]
            .flatMap((a) => [a.quote, a.quoteAlt])
            .filter((q): q is string => Boolean(q)),
        )];
        const echoRange = echo?.nodeKey === s.nodeKey ? echo : null;
        void annVersion;
        const folded = collapsed.has(s.anchor);
        return (
          <section
            className={`reader-section${s.ordinary ? ' ordinary' : ''}${folded ? ' collapsed' : ''}`}
            key={s.anchor}
            data-section={s.anchor}
            data-nodekey={s.nodeKey}
          >
            <div
              className="head"
              onClick={() => toggleSection(s.anchor)}
              role="button"
              aria-expanded={!folded}
              title={folded ? 'Unfold section' : 'Fold section away'}
            >
              <span className="chev">{folded ? '▸' : '▾'}</span>
              <h3>{s.displayTitle}</h3>
              <span className={`src${s.fromCommune ? ' commune' : ''}`}>
                {s.ordinary ? 'Ordinarium Missæ' : s.fromCommune ? `ex communi — ${s.sourcePath} (vide)` : s.sourcePath}
              </span>
            </div>
            {folded ? null : (<>
            {narrow ? (
              <BilingualText
                layout="interleaved"
                latin={s.latin}
                english={s.english}
                quotes={quotes}
                echoLine={echoRange?.from}
                echoTo={echoRange?.to}
                selectionEcho={echo?.nodeKey === s.nodeKey ? (livePhraseEcho ?? undefined) : undefined}
              />
            ) : (
            <div className="bilingual">
              <div className="latin" lang="la">
                <span className="lang-tag">Latine</span>
                {s.latin ? <TextLines text={s.latin} quotes={quotes} echoLine={echoRange?.from} echoTo={echoRange?.to} selectionEcho={echo?.nodeKey === s.nodeKey && livePhraseEcho?.lang === 'latin' ? (livePhraseEcho ?? undefined) : undefined} /> : <p style={{ opacity: 0.5 }}>—</p>}
              </div>
              <div className="english" lang="en">
                <span className="lang-tag">English</span>
                {s.english ? <TextLines text={s.english} quotes={quotes} echoLine={echoRange?.from} echoTo={echoRange?.to} selectionEcho={echo?.nodeKey === s.nodeKey && livePhraseEcho?.lang === 'english' ? (livePhraseEcho ?? undefined) : undefined} /> : <p style={{ opacity: 0.5 }}>—</p>}
              </div>
            </div>
            )}
            {anns.length > 0 && (
              <div className="ann-list">
                {anns.map((a: Annotation) => (
                  <div className="ann-item" key={a.id}>
                    <button title="Remove annotation" onClick={() => { removeAnnotation(a.id); setAnnVersion((v) => v + 1); }}>×</button>
                    <span className="quote">“{a.quote.slice(0, 90)}”</span>
                    {a.note && <div>{a.note}</div>}
                  </div>
                ))}
              </div>
            )}
            </>)}
          </section>
        );
      })}

      {callout && (
        <div
          ref={calloutElRef}
          className="xlate-callout"
          style={{
            left: callout.placement ? callout.placement.left : callout.anchor.left,
            top: callout.placement ? callout.placement.top : callout.anchor.top,
            visibility: callout.placement ? 'visible' : 'hidden',
          }}
          data-side={callout.placement?.side}
        >
          <b>{callout.echo.word}</b>
          <span className="xlate-callout-line">{(callout.echo.line ?? '').slice(0, 90)}</span>
        </div>
      )}

      {menu && (
        <div className="ctx-menu" style={{ left: menu.x, top: menu.y }} onMouseUp={(e) => e.stopPropagation()}>
          <div className="sel">“{menu.term.slice(0, 80)}{menu.term.length > 80 ? '…' : ''}”</div>
          <button onClick={() => { onAction({ kind: 'meaning', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            ✠ Catholic meaning of “{menu.term.slice(0, 24)}{menu.term.length > 24 ? '…' : ''}”
          </button>
          <button onClick={() => { onAction({ kind: 'similar', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            ≈ Similar passages (vector)
          </button>
          <button onClick={() => { onAction({ kind: 'crossrefs', term: menu.term, nodeKey: menu.nodeKey }); setMenu(null); }}>
            🕸 Cross-references (graph)
          </button>
          <button onClick={() => { setNoteFor(menu); setNoteText(''); setMenu(null); }}>
            ✎ Annotate
          </button>
          {onCapture && (
            <button onClick={() => { onCapture(captureFrom(menu)); setMenu(null); }}>
              ✎ Add to Journal/Homily notes
            </button>
          )}
        </div>
      )}

      {noteFor && (
        <div className="ctx-menu" style={{ left: noteFor.x, top: noteFor.y }}>
          <div className="sel">“{noteFor.term.slice(0, 60)}…”</div>
          <div style={{ padding: '4px 8px' }}>
            <textarea
              autoFocus
              placeholder="Margin note…"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              style={{ width: '100%', minHeight: 56 }}
            />
            <button
              onClick={() => {
                if (noteFor.nodeKey) {
                  const src = entries.find((en) => en.nodeKey === noteFor.nodeKey);
                  const aligned = src ? alignSelection({ latin: src.latin, english: src.english }, noteFor.term) : null;
                  addAnnotation({
                    nodeKey: noteFor.nodeKey, quote: noteFor.term,
                    quoteAlt: aligned?.dstLine ?? undefined,
                    note: noteText, color: 'gold',
                  });
                  setAnnVersion((v) => v + 1);
                }
                setNoteFor(null);
              }}
            >
              Save annotation
            </button>
            <button onClick={() => setNoteFor(null)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Find the section node key that contains the current selection anchor. */
function menuNodeKeyFromSelection(root: HTMLElement | null): string | null {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !root) return null;
  let el: Node | null = sel.getRangeAt(0).startContainer;
  while (el && el !== root) {
    if (el instanceof HTMLElement && el.dataset.nodekey) return el.dataset.nodekey;
    el = el.parentNode;
  }
  return null;
}
