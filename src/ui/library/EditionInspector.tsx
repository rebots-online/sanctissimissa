/**
 * `#edition-drawer` — edition source inspector shared by My Books “Inspect”
 * and the reader “Source” button (§L.1; DOCS/ARCHITECTURE/
 * L-bookstore-commerce-20261106.md §4.3 `#edition-drawer` + `#drawer-*` rows;
 * export Lb `library.html:1162-1192`). Values come from the edition's
 * `RightsEvidence`; when no `EditionRecord` exists (Haydock today, any edition
 * before BA.1) the recension shows the card's edition line and the licence row
 * is not mounted. No specimen value renders.
 */

import { useEffect, useRef } from 'react';
import seed from '../../../content/library/catalogue.seed.json';
import { isReservedFreeEdition, validateCatalogue } from '../../core/library/catalogue.ts';
import type { CatalogueWork, EditionRecord } from '../../core/library/types.ts';
import { CATENA_EDITION_ID } from '../../core/library/moduleKeys.ts';
import { debugEvent } from '../../core/diagnostics/store.ts';

/** The committed catalogue works (C001–C061); an invalid seed yields none. */
export const LIBRARY_WORKS: readonly CatalogueWork[] = (() => {
  try {
    return validateCatalogue(seed).works;
  } catch (error) {
    debugEvent('library', 'catalogue.invalid', { error }, 'error');
    return [];
  }
})();

/** Edition copy synopsis (commerce partial §4.2, Closed set, Phase L: `catena-aurea-en` only). */
export const CATENA_SYNOPSIS =
  "St. Thomas Aquinas's verse-by-verse chain of the Church Fathers on the four Gospels, in the Oxford translation edited by John Henry Newman (1841–1845).";

export function isHaydockEdition(editionId: string): boolean {
  return isReservedFreeEdition(editionId);
}

/** The card's `.book-meta-row` edition line; other editions fall back to their recorded source edition. */
export function editionLine(editionId: string, edition: EditionRecord | null): string {
  if (editionId === CATENA_EDITION_ID) return 'Oxford 1841–1845, ed. J. H. Newman';
  if (editionId === 'haydock-1883-en') return 'New York: Dunigan, 1883';
  return edition?.rights[0]?.sourceEdition ?? '';
}

export function formatMB(bytes: number): string {
  return (bytes / 1048576).toFixed(1);
}

interface Props {
  edition: EditionRecord | null;
  editionId: string;
  installedBytes: number | null;
  onClose: () => void;
}

export default function EditionInspector({ edition, editionId, installedBytes, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const work = LIBRARY_WORKS.find((w) => w.editionId === editionId) ?? null;
  const haydock = isHaydockEdition(editionId);
  const rights = edition?.rights[0] ?? null;

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [onClose]);

  const size = haydock
    ? 'Included in the app'
    : installedBytes !== null
      ? `${formatMB(installedBytes)} MB`
      : 'Not downloaded';

  return (
    <aside className="inspect-drawer open" id="edition-drawer" aria-label="Edition Source Inspector">
      <div className="drawer-header">
        <div className="drawer-title" id="drawer-volume-title">
          {edition?.title ?? work?.title ?? editionId}
        </div>
        <button className="drawer-close" ref={closeRef} aria-label="Close" onClick={onClose}>
          &times;
        </button>
      </div>
      <div className="drawer-content">
        <table className="spec-table">
          <tbody>
            <tr>
              <td>Author</td>
              <td id="drawer-author">{edition?.author ?? work?.author ?? ''}</td>
            </tr>
            <tr>
              <td>Critical Recension</td>
              <td id="drawer-recension">{rights ? rights.sourceEdition : editionLine(editionId, null)}</td>
            </tr>
            {rights && (
              <tr>
                <td>Licence / Status</td>
                <td id="drawer-licence">{rights.basis}</td>
              </tr>
            )}
            <tr>
              <td>Mass Integration</td>
              <td id="drawer-missal">
                {haydock
                  ? 'Commentary shown in Sacred Scripture'
                  : 'Linked to Gospel verses in Sacred Scripture; searchable with the Mass and Office'}
              </td>
            </tr>
            <tr>
              <td>Local Size</td>
              <td id="drawer-size">{size}</td>
            </tr>
          </tbody>
        </table>
        <div className="drawer-actions">
          <button className="button button-secondary" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </aside>
  );
}
