import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CorpusDb } from './core/data/corpusDb.ts';
import { loadCorpusBytes } from './core/data/loadCorpus.ts';
import { resolveDay } from './core/data/liturgicalDay.ts';
import { dateForWeekKey } from './core/calendar/computus.ts';
import versionInfo from '../version.json';
import { UPDATE_READY_EVENT, applyPendingUpdate } from './pwa/pwaUpdate.ts';
import type { DayInfo } from './core/data/types.ts';
import { stationForAnchor, type Station } from './core/model/massOrdo.ts';
import SubwayMap from './ui/SubwayMap.tsx';
import MapStrip from './ui/MapStrip.tsx';
import ReaderView, { type SelectionAction } from './ui/ReaderView.tsx';
import MeaningPanel from './ui/MeaningPanel.tsx';
import CalendarView from './ui/CalendarView.tsx';
import OfficeView from './ui/OfficeView.tsx';
import BibleView from './ui/BibleView.tsx';
import AnnotationIndex from './ui/AnnotationIndex.tsx';
import { parseHashRoute, type SharePayload } from './core/share/shareLink.ts';
import ShareLanding from './ui/ShareLanding.tsx';
import { SidecarDb } from './core/accompaniment/store.ts';
import JournalSidecar from './ui/JournalSidecar.tsx';
import JournalView from './ui/JournalView.tsx';
import HomilyPlanner from './ui/HomilyPlanner.tsx';
import SettingsView from './ui/SettingsView.tsx';
import ChatView from './ui/ChatView.tsx';
import OrientationGuide from './ui/OrientationGuide.tsx';
import AboutView from './ui/AboutView.tsx';
import ResizableInspectorLayout from './ui/ResizableInspectorLayout.tsx';
import TrayPanel from './ui/TrayPanel.tsx';
import { useNarrow } from './ui/BilingualText.tsx';
import { applyTheme, readThemePreference, systemMode } from './core/theme/themes.ts';
import {
  COMPANION_ACT,
  COMPANION_LAYOUT,
  GUIDE_STEPS,
  readGuideState,
  setGuideLiveContext,
  type CompanionAct,
} from './core/orientation/guide.ts';
import { debugEvent } from './core/diagnostics/store.ts';

type View = 'map' | 'reader' | 'annotations' | 'calendar' | 'office' | 'bible' | 'journal' | 'homily' | 'settings' | 'about';

const NAV: { id: View; ico: string; label: string }[] = [
  { id: 'map', ico: '✠', label: 'Holy Mass' },
  { id: 'reader', ico: '📖', label: 'Missal Reader' },
  { id: 'calendar', ico: '📅', label: 'Perpetual Calendar' },
  { id: 'office', ico: '🕰', label: 'Divine Office' },
  { id: 'bible', ico: '📜', label: 'Sacred Scripture' },
  { id: 'journal', ico: '✎', label: 'Journal' },
  { id: 'homily', ico: '✍', label: 'Homily Writer' },
  { id: 'annotations', ico: '🔖', label: 'Annotations' },
];

const UTIL_NAV: { id: View; ico: string; label: string }[] = [
  { id: 'settings', ico: '⚙', label: 'Settings' },
  { id: 'about', ico: 'ℹ', label: 'Help · About' },
];

// ── CL.2 (§H.1): COMPANION_ACT routing + live/visibility context ──────
/** Document-plane events App forwards acts onto for CL.5's surfaces (and the
 *  tour engine for OG.10). Values follow the guide.ts event convention
 *  (COMPANION_ACT = 'sanctissimissa:companion-act'); App only forwards — it
 *  never performs the document-plane write itself. */
const COMPANION_DRAFT = 'sanctissimissa:companion-draft';
const COMPANION_ANNOTATE = 'sanctissimissa:companion-annotate';
const COMPANION_SEARCH = 'sanctissimissa:companion-search';
const COMPANION_SHOWPATH = 'sanctissimissa:companion-showpath';

/** The rail's own view set — an `open` act routes through exactly these. */
const RAIL_VIEWS = new Set<string>([...NAV, ...UTIL_NAV].map((n) => n.id));

/** CL.2 act payloads may carry the origin reply (and pre-split path steps)
 *  attached by the sender (CL.4); App reads them defensively only. */
type CompanionActDetail = Partial<CompanionAct> & { reply?: string; steps?: { target: string; narration: string }[] };

/** Real calendar date: pattern + Date round-trip (the grammar already
 *  validated this at parse time; App re-validates before committing state). */
function isRealIsoDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const round = new Date(y, mo - 1, d);
  return round.getFullYear() === y && round.getMonth() === mo - 1 && round.getDate() === d;
}

/** The `visible` snapshot (§H.1): structural, allowlisted facts only, never
 *  page text — rail collapsed/full; the last §D companion-layout announcement
 *  (panel state + dock mode); orientation card + spotlight state; the section
 *  anchors scrolled into view; which registered guide controls intersect the
 *  viewport. */
function visibilitySnapshot(companionPanel: Record<string, unknown> | null): Record<string, unknown> {
  const intersectsViewport = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.bottom > 0 && r.top < window.innerHeight;
  };
  const railMode = document.querySelector('.app')?.getAttribute('data-rail') === 'icons' ? 'collapsed' : 'full';
  const guide = readGuideState();
  const scrolledSections = [...document.querySelectorAll('[data-section]')]
    .filter(intersectsViewport)
    .map((el) => el.getAttribute('data-section'))
    .filter((anchor): anchor is string => Boolean(anchor))
    .slice(0, 8);
  const visibleControls = GUIDE_STEPS
    .filter((step) => [...document.querySelectorAll(`[data-guide="${step.id}"]`)].some(intersectsViewport))
    .map((step) => step.id);
  return {
    rail: railMode,
    companionPanel,
    orientation: {
      completed: guide.completed,
      step: guide.step,
      targetHeld: Boolean(document.querySelector('.orientation-target')),
      spotlight: Boolean(document.querySelector('.tour-spotlight')),
    },
    scrolledSections,
    visibleControls,
  };
}

export default function App() {
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
  /**
   * One breakpoint, not two: the rail collapses to icons at the same width the
   * bilingual reader collapses to a single column, so the whole shell changes
   * register once (#3). `railPinned` is the hold-open, which wins while set.
   */
  const narrowShell = useNarrow(1100);
  /** null = follow the viewport; otherwise the user's explicit choice, which
   *  wins until they toggle again (hold-open, and hold-collapsed). */
  const [railOverride, setRailOverride] = useState<'open' | 'icons' | null>(null);
  const railCollapsed = railOverride ? railOverride === 'icons' : narrowShell;
  const railPinned = railOverride === 'open';
  const toggleRail = () => setRailOverride(railCollapsed ? 'open' : 'icons');
  const [dayFlyout, setDayFlyout] = useState(false);
  // The user's LOCAL calendar date — never UTC: an evening user in Canada must
  // see today's feast, not tomorrow's (toISOString would skip ahead at 20:00 EDT).
  const [date, setDate] = useState(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [focus, setFocus] = useState<{ section: string | null; nonce: number }>({ section: null, nonce: 0 });
  const [action, setAction] = useState<SelectionAction | null>(null);
  // The map strip's you-are-here (station id) and the office strip's hour.
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [officeHour, setOfficeHour] = useState('laudes');
  // The office strip's part-station (scroll-spy) and its jump command.
  const [activeOfficePart, setActiveOfficePart] = useState<string | null>(null);
  const [officeFocus, setOfficeFocus] = useState<{ anchor: string; nonce: number } | null>(null);
  // Bible deep-link focus ("Gen/1/5"); nonce bumps so re-navigating re-scrolls.
  const [bibleFocus, setBibleFocus] = useState<{ ref: string | null; nonce: number }>({ ref: null, nonce: 0 });
  // Map view content type (App-owned so it survives view switches).
  const [sidecar, setSidecar] = useState<SidecarDb | null>(null);
  const [pendingAccId, setPendingAccId] = useState<string | null>(null);
  const [capture, setCapture] = useState<{ quote: string; quoteAlt?: string; anchor: string | null } | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  // CL.2 (§H.1): the companion-commanded homily draft key, registered into
  // guideContext's live context (the draft surface owns the ground truth and
  // may re-register through the same merge).
  const [openDraftKey, setOpenDraftKey] = useState<string | null>(null);
  // CL.2: the last §D panel-layout announcement (companion panel state + dock
  // mode), captured structurally for the `visible` snapshot.
  const companionLayoutRef = useRef<Record<string, unknown> | null>(null);

  useEffect(() => {
    const onUpdateReady = () => setUpdateReady(true);
    window.addEventListener(UPDATE_READY_EVENT, onUpdateReady);
    return () => window.removeEventListener(UPDATE_READY_EVENT, onUpdateReady);
  }, []);

  // CL.2: capture §D companion layout announcements (panel state + dock mode)
  // so the `visible` snapshot can report them structurally.
  useEffect(() => {
    const onLayout = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      companionLayoutRef.current = detail && typeof detail === 'object'
        ? { ...(detail as Record<string, unknown>) }
        : null;
    };
    window.addEventListener(COMPANION_LAYOUT, onLayout);
    return () => window.removeEventListener(COMPANION_LAYOUT, onLayout);
  }, []);

  // CL.2 (§H.1): route COMPANION_ACT. `open` takes the rail's own state-set
  // path; `focus` fires only when the section is live-rendered; `date`
  // re-validates the ISO before committing; document-plane acts are forwarded
  // as dedicated events for CL.5's surfaces (App never writes them itself).
  // Invalid acts change nothing visible and land in Diagnostics.
  useEffect(() => {
    const reject = (detail: unknown) => debugEvent('companion', 'act.rejected', detail, 'warn');
    const forward = (name: string, kind: string, value: string, reply: string) => {
      window.dispatchEvent(new CustomEvent(name, { detail: { kind, value, reply } }));
      debugEvent('companion', 'act.forward', { event: name, kind, value }, 'info');
    };
    const onAct = (event: Event) => {
      const act = (event as CustomEvent).detail as CompanionActDetail | null;
      if (!act || typeof act !== 'object' || typeof act.kind !== 'string' || typeof act.value !== 'string' || !act.value.trim()) {
        reject({ raw: act ?? null });
        return;
      }
      const value = act.value.trim();
      const reply = typeof act.reply === 'string' ? act.reply : '';
      switch (act.kind) {
        case 'open':
          // The same state-set path the rail buttons use — setView; the
          // history effect records the layer for system-back.
          if (!RAIL_VIEWS.has(value)) { reject({ kind: act.kind, value }); return; }
          setView(value as View);
          debugEvent('companion', 'act.open', { view: value }, 'info');
          return;
        case 'focus':
          // Only when the section exists in the live DOM (attribute compare —
          // no CSS-injection surface); nonce n+1 so the reader re-scrolls.
          if (!value || ![...document.querySelectorAll('[data-section]')].some((el) => el.getAttribute('data-section') === value)) {
            reject({ kind: act.kind, value });
            return;
          }
          setFocus((f) => ({ section: value, nonce: f.nonce + 1 }));
          debugEvent('companion', 'act.focus', { section: value }, 'info');
          return;
        case 'date':
          if (!isRealIsoDate(value)) { reject({ kind: act.kind, value }); return; }
          setDate(value);
          debugEvent('companion', 'act.date', { date: value }, 'info');
          return;
        case 'homily-draft':
          setOpenDraftKey(value);
          forward(COMPANION_DRAFT, act.kind, value, reply);
          return;
        case 'annotate':
          forward(COMPANION_ANNOTATE, act.kind, value, reply);
          return;
        case 'concordance':
        case 'journal':
          forward(COMPANION_SEARCH, act.kind, value, reply);
          return;
        case 'show-path': {
          // Narration lines are split per step by the sender (CL.4); without
          // them the targets still arrive, un-narrated.
          const steps = Array.isArray(act.steps)
            ? act.steps
            : value.split('>').map((part) => ({ target: part.trim(), narration: '' })).filter((s) => s.target);
          window.dispatchEvent(new CustomEvent(COMPANION_SHOWPATH, { detail: { steps } }));
          debugEvent('companion', 'act.forward', { event: COMPANION_SHOWPATH, steps: steps.length }, 'info');
          return;
        }
        default:
          reject({ kind: act.kind, value });
      }
    };
    window.addEventListener(COMPANION_ACT, onAct as EventListener);
    return () => window.removeEventListener(COMPANION_ACT, onAct as EventListener);
  }, []);

  // CL.2 (§H.1): merge the app's live, allowlisted facts into guideContext()'s
  // context JSON. No dependency array on purpose: re-registered on every
  // commit, and the reader's scroll-spy re-renders App as sections cross the
  // viewport, keeping the `visible` snapshot current.
  useEffect(() => {
    setGuideLiveContext({
      currentView: view,
      currentDate: date,
      focusSection: focus.section,
      openDraftKey,
      visible: visibilitySnapshot(companionLayoutRef.current),
    });
  });

  useEffect(() => {
    const restoreTheme = () => {
      const preference = readThemePreference(sidecar);
      applyTheme(preference.family, preference.mode === 'system' ? systemMode() : preference.mode, preference.glass);
    };
    restoreTheme();
    const systemPreference = typeof matchMedia === 'undefined'
      ? null : matchMedia('(prefers-color-scheme: dark)');
    systemPreference?.addEventListener('change', restoreTheme);
    return () => systemPreference?.removeEventListener('change', restoreTheme);
  }, [sidecar]);

  useEffect(() => {
    loadCorpusBytes()
      .then((bytes) => CorpusDb.open(bytes))
      .then(setDb)
      .catch((e) => { console.error('[Missal:open]', e); setError('unavailable'); });
  }, []);

  useEffect(() => {
    let alive = true;
    SidecarDb.open().then((s) => { if (alive) setSidecar(s); }).catch(() => { if (alive) setSidecar(null); });
    return () => { alive = false; };
  }, []);

  // Hash-route deep links (#/verse/…, #/day/…, #/section/…, #/s/… — §7.6 BB.3):
  // resolved once on load; shares/widgets/companion all target this layer.
  // #/s/… is the share LANDING (plaque page), which renders instead of the
  // shell until its CTA opens the app at the shared position.
  const [shareLanding, setShareLanding] = useState<SharePayload | null>(null);
  useEffect(() => {
    const link = parseHashRoute(location.hash);
    if (!link) return;
    if (link.view === 'share' && link.share) {
      setShareLanding(link.share);
      return;
    }
    if (link.view === 'bible' && link.verseRef) {
      setBibleFocus({ ref: link.verseRef, nonce: Date.now() });
      setView('bible');
    } else if (link.date) {
      setDate(link.date);
      setView('reader');
    } else if (link.sectionKey) {
      // Route through the same source-day navigation search hits use.
      onOpenKey(link.sectionKey);
    } else if (link.view === 'journal' && link.accId) {
      setPendingAccId(link.accId);
      setView('journal');
      history.replaceState(null, '', location.pathname + location.search);
    }
  }, []);

  // ── Layered back navigation ─────────────────────────────────────────
  // Every UI layer (view change, meaning panel) becomes a history entry, so
  // the browser/Android system back button unwinds panel → view → map and
  // only exits the app from the root layer — never a surprise termination.
  const fromPop = useRef(false);
  const navReady = useRef(false);
  useEffect(() => {
    history.replaceState({ view: 'map', panel: false }, '');
    const onPop = (e: PopStateEvent) => {
      const st = (e.state as { view?: View; panel?: boolean } | null) ?? { view: 'map', panel: false };
      fromPop.current = true;
      setView((st.view as View) ?? 'map');
      if (!st.panel) {
        setAction(null);
        setCapture(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const panelOpen = action !== null || capture !== null;
  useEffect(() => {
    if (!navReady.current) {
      navReady.current = true;
      return;
    }
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    history.pushState({ view, panel: panelOpen }, '');
  }, [view, panelOpen]);

  const openAction = (a: SelectionAction) => {
    setCapture(null);
    setAction(a);
  };
  const openCapture = (c: { quote: string; quoteAlt?: string; anchor: string | null }) => {
    setAction(null);
    setCapture(c);
  };

  const day: DayInfo | null = useMemo(() => (db ? resolveDay(db, date) : null), [db, date]);

  useEffect(() => {
    document.documentElement.dataset.color = String(day?.color ?? 'green');
  }, [day?.color]);

  function onStation(s: Station) {
    setActiveStation(s.id);
    setFocus({ section: s.sectionKey ?? s.id, nonce: Date.now() });
    setView('reader');
  }

  // Reader scroll-spy → strip marker. Stable identity so the reader's
  // IntersectionObserver isn't torn down every render.
  const onVisibleSection = useCallback((anchor: string) => {
    const id = stationForAnchor(anchor);
    if (id) setActiveStation(id);
  }, []);

  function onOpenKey(nodeKey: string) {
    // Bible verse hit (concordance/vector results now span scripture):
    // open Sacred Scripture at that verse.
    const verse = nodeKey.match(/^verse:([A-Za-z0-9]+\/\d+\/\d+)$/);
    if (verse) {
      setBibleFocus({ ref: verse[1], nonce: Date.now() });
      setView('bible');
      return;
    }
    // "section:Sancti/02-25#Introitus" — open the reader ON THAT SOURCE DAY,
    // not merely at the same-named section of the day already displayed.
    const m = nodeKey.match(/^section:(.+)#(.+)$/);
    if (!m) return;
    const [, path, section] = m;
    const office = path.startsWith('Horas/');
    const p = office ? path.slice(6) : path;
    const sancti = p.match(/^Sancti\/(\d\d)-(\d\d)/);
    const tempora = p.match(/^Tempora\/(.+)$/);
    if (sancti) {
      setDate(`${date.slice(0, 4)}-${sancti[1]}-${sancti[2]}`);
    } else if (tempora) {
      const iso = dateForWeekKey(tempora[1], date);
      if (iso) setDate(iso);
    }
    if (office) {
      // Office reference: open the office view at the hour the section names.
      const hourOf: [RegExp, string][] = [
        [/matutinum|nocturn|invit|lectio\d/i, 'matutinum'],
        [/laudes/i, 'laudes'],
        [/prima/i, 'prima'],
        [/tertia/i, 'tertia'],
        [/sexta/i, 'sexta'],
        [/nona/i, 'nona'],
        [/vesper/i, 'vesperae'],
        [/completorium/i, 'completorium'],
      ];
      setOfficeHour(hourOf.find(([re]) => re.test(section))?.[1] ?? 'laudes');
      setView('office');
      return;
    }
    // Commune/Ordo/psalm references stay on the current day (full corpus
    // browser is the Phase-2 surface). If a feast outranks the referenced
    // tempora on that date, the reader shows the winner — rubrical reality.
    setFocus({ section, nonce: Date.now() });
    const sid = stationForAnchor(section);
    if (sid) setActiveStation(sid);
    setView('reader');
  }

  // The share landing renders INSTEAD of the shell (no corpus needed — the
  // plaque carries its own text). The CTA routes to the shared position and
  // boots the app properly (reload resolves the destination deep link).
  if (shareLanding) {
    return (
      <ShareLanding
        payload={shareLanding}
        onOpenApp={() => {
          const dest = shareLanding.dest || '#/';
          setShareLanding(null);
          if (location.hash === dest) {
            location.reload();
          } else {
            location.hash = dest;
            location.reload();
          }
        }}
      />
    );
  }

  if (error) {
    return (
      <div className="loading">
        <div>
          <p>The Missal could not open just now. Please try opening it again.</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </div>
    );
  }
  if (!db) {
    // Loading doubles as the splash screen (mandatory app chrome SOP).
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <span className="rose">✠</span>
          <h1 className="splash-title">SanctissiMissa</h1>
          <p>Opening the liturgical corpus…</p>
          <p className="splash-meta">
            v{versionInfo.version} · © 2026 Robin L. M. Cheung, MBA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app" data-rail={railCollapsed ? 'icons' : 'full'}>
      <nav className="rail">
        {/*
          The rail collapses to icons at the same width the bilingual reader
          collapses — one transformation, not two. Collapsed, it may show no
          text that cannot fit an icon column: the brand words and the feast
          name move to tooltips, and the day chip becomes a calendar button
          that flies its picker out over the main area (#3).
        */}
        <div className="rail-head">
          <img className="rail-mark" src="/icon.png" alt="" aria-hidden="true" />
          <button
            className="rail-toggle"
            onClick={toggleRail}
            aria-expanded={!railCollapsed}
            aria-label={railCollapsed ? 'Open navigation' : 'Hold navigation open'}
            title={railCollapsed ? 'Open navigation' : 'Collapse to icons'}
          >
            {railCollapsed ? '☰' : railPinned ? '📌' : '☰'}
          </button>
          <div className="brand">SanctissiMissa</div>
        </div>
        {NAV.map((n) => (
          <button
            key={n.id}
            data-guide={`nav-${n.id}`}
            aria-label={n.label}
            className={`nav${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="ico">{n.ico}</span>
            <span className="label">{n.label}</span>
          </button>
        ))}
        <div className="spacer" />
        {UTIL_NAV.map((n) => (
          <button
            key={n.id}
            data-guide={`nav-${n.id}`}
            aria-label={n.label}
            className={`nav${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="ico">{n.ico}</span>
            <span className="label">{n.label}</span>
          </button>
        ))}
        {railCollapsed ? (
          <button
            className={`day-chip-icon${dayFlyout ? ' open' : ''}`}
            onClick={() => setDayFlyout((o) => !o)}
            title={day ? `${day.feastName ?? day.weekKey} — ${day.date}` : 'Choose a date'}
            aria-label="Choose a date"
            aria-expanded={dayFlyout}
          >
            <span className="swatch" title={`Liturgical color: ${day?.color}`} />
            <span aria-hidden="true">📅</span>
          </button>
        ) : (
          <div className="day-chip">
            <div className="date-row">
              <span className="swatch" title={`Liturgical color: ${day?.color}`} />
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </div>
            {day && (
              <>
                <div className="feast">{day.feastName ?? day.weekKey}</div>
                <div className="season">{day.season} · {day.weekday} · {day.weekKey}</div>
              </>
            )}
          </div>
        )}
      </nav>

      {railCollapsed && dayFlyout && (
        <div className="day-flyout" role="dialog" aria-label="Choose a date">
          <div className="date-row">
            <span className="swatch" title={`Liturgical color: ${day?.color}`} />
            <input
              type="date"
              autoFocus
              value={date}
              onChange={(e) => { if (e.target.value) { setDate(e.target.value); setDayFlyout(false); } }}
            />
            <button className="day-flyout-close" onClick={() => setDayFlyout(false)} aria-label="Close">×</button>
          </div>
          {day && (
            <>
              <div className="feast">{day.feastName ?? day.weekKey}</div>
              <div className="season">{day.season} · {day.weekday} · {day.weekKey}</div>
            </>
          )}
        </div>
      )}

      <div className="main">
        <header className="masthead">
          <h1>{day?.feastName ?? day?.weekKey ?? '—'}</h1>
          {day?.winner?.rankClass && <span className="rank-badge">{day.winner.rankClass}</span>}
          <span className="sub">
            {day?.date} · {day?.season} · {day?.temporaPath}
            {day && day.commemorations.length > 0 &&
              ` · Comm.: ${day.commemorations.slice(0, 2).map((c) => c.title ?? c.key).join('; ')}`}
          </span>
        </header>

        {view !== 'map' && view !== 'annotations' && (
          <MapStrip
            db={db}
            day={day}
            view={view}
            activeStation={activeStation}
            officeHour={officeHour}
            onStation={onStation}
            onHour={setOfficeHour}
            bibleBook={bibleFocus.ref?.split('/')[0] ?? null}
            onBibleRef={(ref) => {
              setBibleFocus({ ref, nonce: Date.now() });
              setView('bible');
            }}
            activeOfficePart={activeOfficePart}
            onOfficePart={(anchor) => setOfficeFocus({ anchor, nonce: Date.now() })}
          />
        )}

        <ResizableInspectorLayout
          sidecar={sidecar}
          main={
            <>
              {view === 'map' && (
                <div className="content map-wrap">
                  <SubwayMap
                    db={db}
                    day={day}
                    onStation={onStation}

                  />
                </div>
              )}
              {view === 'reader' && day && (
                <ReaderView
                  db={db}
                  day={day}
                  focusSection={focus.section}
                  focusNonce={focus.nonce}
                  sidecar={sidecar}
                  onAction={openAction}
                  onCapture={openCapture}
                  onVisibleSection={onVisibleSection}
                />
              )}
              {view === 'calendar' && (
                <CalendarView db={db} selected={date} onPick={(iso) => { setDate(iso); setView('reader'); setFocus({ section: null, nonce: 0 }); }} />
              )}
              {view === 'annotations' && (
                <AnnotationIndex db={db} onOpenKey={onOpenKey} />
              )}
              {view === 'office' && (
                <OfficeView
                  db={db}
                  day={day}
                  hour={officeHour}
                  onHour={setOfficeHour}
                  sidecar={sidecar}
                  onAction={openAction}
                  onCapture={openCapture}
                  focusPart={officeFocus ?? undefined}
                  onActivePart={setActiveOfficePart}
                />
              )}
              {view === 'bible' && (
                <BibleView
                  db={db}
                  focusRef={bibleFocus.ref}
                  focusNonce={bibleFocus.nonce}
                  sidecar={sidecar}
                  onAction={openAction}
                  onCapture={openCapture}
                  onOpenKey={onOpenKey}
                />
              )}
              {view === 'journal' && sidecar && (
                <JournalView
                  db={db}
                  sidecar={sidecar}
                  day={day}
                  onOpenKey={onOpenKey}
                  focusAccId={pendingAccId}
                  onFocusConsumed={() => setPendingAccId(null)}
                />
              )}
              {view === 'journal' && !sidecar && (
                <div className="content"><p>Opening your journal…</p></div>
              )}
              {view === 'homily' && sidecar && (
                <HomilyPlanner db={db} sidecar={sidecar} day={day} />
              )}
              {view === 'homily' && !sidecar && (
                <div className="content"><p>Opening your homily planner…</p></div>
              )}
              {view === 'settings' && (
                <SettingsView sidecar={sidecar} corpus={db} onOpenJournal={() => setView('journal')} />
              )}
              {view === 'about' && <AboutView />}
            </>
          }
          inspector={
            action ? (
              <MeaningPanel db={db} action={action} onClose={() => history.back()} onOpenKey={onOpenKey} />
            ) : capture && sidecar ? (
              <JournalSidecar db={db} sidecar={sidecar} capture={capture} day={day} onClose={() => setCapture(null)} onOpenKey={onOpenKey} />
            ) : null
          }
        />
      </div>

      {(view === 'reader' || view === 'office') && (
        <TrayPanel sidecar={sidecar} open={trayOpen} onToggle={() => setTrayOpen((o) => !o)} />
      )}

      {/* CP.5: Companion intercom badge — present on every workspace. */}
      <ChatView sidecar={sidecar} />
      <OrientationGuide />

      {/* Mandatory app chrome: version bottom-right on every surface. */}
      <div className="version-tag" title={`Build ${versionInfo.buildNumber} · ${versionInfo.buildDate}`}>
        v{versionInfo.version}
      </div>

      {/* CC16: deferred self-update chip — shown only when a new worker took
          over while unsaved editor work was on screen. */}
      {updateReady && (
        <button className="sam-update-chip" onClick={() => { setUpdateReady(false); applyPendingUpdate(); }}>
          ↻ Update ready — reload
        </button>
      )}

    </div>
  );
}
