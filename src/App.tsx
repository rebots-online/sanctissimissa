import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CorpusDb } from './core/data/corpusDb.ts';
import { loadCorpusBytes } from './core/data/loadCorpus.ts';
import { resolveDay } from './core/data/liturgicalDay.ts';
import { dateForWeekKey } from './core/calendar/computus.ts';
import versionInfo from '../version.json';
import type { DayInfo } from './core/data/types.ts';
import { stationForAnchor, type Station } from './core/model/massOrdo.ts';
import SubwayMap from './ui/SubwayMap.tsx';
import MapStrip from './ui/MapStrip.tsx';
import ReaderView, { type SelectionAction } from './ui/ReaderView.tsx';
import MeaningPanel from './ui/MeaningPanel.tsx';
import CalendarView from './ui/CalendarView.tsx';
import OfficeView from './ui/OfficeView.tsx';
import BibleView from './ui/BibleView.tsx';
import { parseHashRoute } from './core/share/shareLink.ts';
import { SidecarDb } from './core/accompaniment/store.ts';
import JournalSidecar from './ui/JournalSidecar.tsx';
import JournalView from './ui/JournalView.tsx';
import HomilyPlanner from './ui/HomilyPlanner.tsx';
import SettingsView from './ui/SettingsView.tsx';
import AboutView from './ui/AboutView.tsx';
import ResizableInspectorLayout from './ui/ResizableInspectorLayout.tsx';
import TrayPanel from './ui/TrayPanel.tsx';

type View = 'map' | 'reader' | 'calendar' | 'office' | 'bible' | 'journal' | 'homily' | 'settings' | 'about';

const NAV: { id: View; ico: string; label: string }[] = [
  { id: 'map', ico: '🚇', label: 'Subway Map' },
  { id: 'reader', ico: '📖', label: 'Missal Reader' },
  { id: 'calendar', ico: '📅', label: 'Perpetual Calendar' },
  { id: 'office', ico: '🕰', label: 'Divine Office' },
  { id: 'bible', ico: '📜', label: 'Sacred Scripture' },
  { id: 'journal', ico: '✎', label: 'Journal' },
  { id: 'homily', ico: '✍', label: 'Homily Writer' },
];

const UTIL_NAV: { id: View; ico: string; label: string }[] = [
  { id: 'settings', ico: '⚙', label: 'Settings' },
  { id: 'about', ico: 'ℹ', label: 'Help · About' },
];

export default function App() {
  const [db, setDb] = useState<CorpusDb | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('map');
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
  // Bible deep-link focus ("Gen/1/5"); nonce bumps so re-navigating re-scrolls.
  const [bibleFocus, setBibleFocus] = useState<{ ref: string | null; nonce: number }>({ ref: null, nonce: 0 });
  const [sidecar, setSidecar] = useState<SidecarDb | null>(null);
  const [pendingAccId, setPendingAccId] = useState<string | null>(null);
  const [capture, setCapture] = useState<{ quote: string; quoteAlt?: string; anchor: string | null } | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);

  useEffect(() => {
    loadCorpusBytes()
      .then((bytes) => CorpusDb.open(bytes))
      .then(setDb)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(() => {
    let alive = true;
    SidecarDb.open().then((s) => { if (alive) setSidecar(s); }).catch(() => { if (alive) setSidecar(null); });
    return () => { alive = false; };
  }, []);

  // Hash-route deep links (#/verse/…, #/day/…, #/section/… — §7.6 BB.3):
  // resolved once on load; shares/widgets/companion all target this layer.
  useEffect(() => {
    const link = parseHashRoute(location.hash);
    if (!link) return;
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

  if (error) {
    return (
      <div className="loading">
        <div>
          <p>Could not open the liturgical corpus: {error}</p>
          <p>Run <code>npm run ingest</code> to build <code>missal.db</code>.</p>
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
          <h1 className="splash-title">St. Android&apos;s Missal</h1>
          <p>Opening the liturgical corpus…</p>
          <p className="splash-meta">
            v{versionInfo.version} · © Robin L. M. Cheung, MBA
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <nav className="rail">
        <div className="brand">St. Android's Missal</div>
        {NAV.map((n) => (
          <button
            key={n.id}
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
            className={`nav${view === n.id ? ' active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="ico">{n.ico}</span>
            <span className="label">{n.label}</span>
          </button>
        ))}
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
      </nav>

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

        {view !== 'map' && (
          <MapStrip
            db={db}
            day={day}
            view={view}
            activeStation={activeStation}
            officeHour={officeHour}
            onStation={onStation}
            onHour={setOfficeHour}
          />
        )}

        <ResizableInspectorLayout
          sidecar={sidecar}
          main={
            <>
              {view === 'map' && (
                <div className="content map-wrap">
                  <SubwayMap db={db} day={day} onStation={onStation} />
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
              {view === 'office' && <OfficeView db={db} day={day} hour={officeHour} onHour={setOfficeHour} sidecar={sidecar} />}
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
              {view === 'settings' && <SettingsView sidecar={sidecar} />}
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

      {/* Mandatory app chrome: version bottom-right on every surface. */}
      <div className="version-tag" title={`Build ${versionInfo.buildNumber} · ${versionInfo.buildDate}`}>
        v{versionInfo.version}
      </div>


    </div>
  );
}
