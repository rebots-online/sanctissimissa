/**
 * HD.1 (§K.8) — the Sacristan's live view of the page, read from the real DOM
 * at prompt-build time (guideContext calls this every turn).
 *
 * This replaces §H.1's registered `visible` snapshot: instead of App curating
 * a stale allowlisted summary, the Sacristan reads the live document through
 * this one seam — current view (from App's registered live facts), rail mode,
 * the focus target, every mounted [data-section] anchor with its heading, and
 * scroll depth. The law: she never claims to see anything this does not
 * report, and every didactic anchor must exist here at apply time.
 *
 * Structural facts plus section headings only — never body text.
 */

/** One live section: its anchor, its heading label, and whether it currently
 *  intersects the viewport. */
export interface VisibleSection {
  anchor: string;
  heading: string;
  visible: boolean;
}

/** The Sacristan's whole live view (the `visible` field of guideContext). */
export interface VisibleContext {
  view: string | null;
  rail: 'full' | 'collapsed';
  focusSection: string | null;
  sections: VisibleSection[];
  /** 0–100 — how far down the document the user has scrolled. */
  scrollDepth: number;
}

/** Heading label for one section element: its first heading's text, else the
 *  aria-label, else '' — capped at 80 chars (a label, never body text). */
export function sectionHeading(el: Element): string {
  const heading = el.querySelector('h2,h3,h4')?.textContent?.trim()
    ?? el.getAttribute('aria-label')?.trim()
    ?? '';
  return heading.slice(0, 80);
}

/** Whether a section element intersects the viewport (width>0 and vertically
 *  on-screen) — the same test §H.1's snapshot used. */
export function intersectsViewport(el: Element, viewportHeight: number): boolean {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.bottom > 0 && r.top < viewportHeight;
}

/**
 * Read the live view. `live` carries App's registered facts (currentView,
 * focusSection) — the DOM cannot know the React view id. `doc`/`win` are
 * injectable so unit tests run against fakes (no browser needed).
 */
export function readVisibleContext(
  live: { currentView?: string; focusSection?: string | null } = {},
  deps: { doc?: Document; viewportHeight?: number; scrollY?: number; scrollHeight?: number } = {},
): VisibleContext {
  const doc = deps.doc ?? (typeof document !== 'undefined' ? document : null);
  const viewportHeight = deps.viewportHeight ?? (typeof window !== 'undefined' ? window.innerHeight : 0);
  const scrollY = deps.scrollY ?? (typeof window !== 'undefined' ? window.scrollY : 0);
  const scrollHeight = deps.scrollHeight ?? (typeof document !== 'undefined' ? document.documentElement.scrollHeight : 0);
  if (!doc) {
    return { view: live.currentView ?? null, rail: 'full', focusSection: live.focusSection ?? null, sections: [], scrollDepth: 0 };
  }
  const sections: VisibleSection[] = [...doc.querySelectorAll('[data-section]')]
    .slice(0, 24)
    .map((el) => {
      const anchor = el.getAttribute('data-section') ?? '';
      return { anchor, heading: sectionHeading(el), visible: intersectsViewport(el, viewportHeight) };
    })
    .filter((s) => s.anchor.length > 0);
  const rail = doc.querySelector('.app')?.getAttribute('data-rail') === 'icons' ? 'collapsed' : 'full';
  const span = Math.max(1, scrollHeight - viewportHeight);
  const scrollDepth = Math.max(0, Math.min(100, Math.round((scrollY / span) * 100)));
  return {
    view: typeof live.currentView === 'string' && live.currentView ? live.currentView : null,
    rail,
    focusSection: live.focusSection ?? null,
    sections,
    scrollDepth,
  };
}
