/**
 * OfficeHourMap — the Office's own map (ARCHITECTURE.md §11.2/§11.3 decision
 * 23): the hour's actual shape, not an SVG loop. The constructed hour's rubric
 * headings (Invitatorium, Psalmi, Lectiones, Capitulum, Hymnus, Canticum,
 * Oratio…) as a vertical station line in the office rail; click scrolls the
 * office reader to the entry's anchor; the active part tracks the reading
 * position (OfficeView's scroll-spy feeds `activeAnchor`).
 */

import type { OfficeEntry } from '../core/office/engine.ts';

interface Props {
  entries: OfficeEntry[];
  /** Anchor of the part under the reading band (scroll-spy); null = none yet. */
  activeAnchor?: string | null;
  onJump: (anchor: string) => void;
}

export default function OfficeHourMap({ entries, activeAnchor, onJump }: Props) {
  // Parts are the hour's rubric headings; anchors match OfficeView's sections
  // (`{source}#{index}` over the same entries array).
  const parts = entries
    .map((e, i) => ({ label: e.title, anchor: `${e.source}#${i}` }))
    .filter((p, i, arr) => p.label && !(i > 0 && p.label === arr[i - 1].label));

  return (
    <nav className="hour-parts" aria-label="Parts of this hour">
      {parts.map((p, i) => (
        <button
          key={p.anchor}
          className={p.anchor === activeAnchor ? 'active' : i === 0 && !activeAnchor ? 'lead' : ''}
          onClick={() => onJump(p.anchor)}
        >
          <span className="hp-dot" />
          <span className="hp-label">{p.label}</span>
        </button>
      ))}
    </nav>
  );
}
