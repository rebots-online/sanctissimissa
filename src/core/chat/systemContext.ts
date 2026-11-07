/**
 * Sacristan system context (BA.15; §L.4 D9; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md §3.6).
 * Per sent turn: guideContext() (live view/date/focus/draft + the `visible`
 * snapshot + the full command grammar) + the CompanionMemory lore block +
 * `## Recalled memories` (async recall) + `## Retrieved passages` from
 * sacristanContext(). A retrieval failure omits its section; the turn proceeds.
 */

import { guideContext } from '../orientation/guide.ts';
import type { CompanionMemory } from '../companion/memory.ts';
import { debugEvent } from '../diagnostics/store.ts';
import { sacristanContext, type CorpusQuery } from './retrieval.ts';

/** CL.4 (§H.2/§H.7): the live facts App registered in guideContext()'s
 *  documented context JSON (the CL.2 contract: currentView, currentDate,
 *  focusSection, openDraftKey, visible). Read back out of the documented
 *  block — this is the day anchor + focus section for Save insight and the
 *  date suffix of the §H.7 feast chip, without any new coupling surface. */
export function liveFacts(): { view: string; date: string; focus: string | null } {
  const today = new Date().toISOString().slice(0, 10);
  // HD.1: the context JSON's lead-in changed when `visible` became a live
  // DOM read — parse the new documented phrasing.
  const match = /actual visible DOM controls and the live page view: ([\s\S]*?)\. Current orientation target/.exec(guideContext());
  if (!match) return { view: '', date: today, focus: null };
  try {
    const parsed = JSON.parse(match[1]) as { currentView?: unknown; currentDate?: unknown; focusSection?: unknown };
    return {
      view: typeof parsed.currentView === 'string' ? parsed.currentView : '',
      date:
        typeof parsed.currentDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.currentDate)
          ? parsed.currentDate
          : today,
      focus: typeof parsed.focusSection === 'string' && parsed.focusSection ? parsed.focusSection : null,
    };
  } catch {
    return { view: '', date: today, focus: null };
  }
}

export async function buildCompanionSystemContext({
  question,
  memory,
  db,
}: {
  question: string;
  memory: CompanionMemory | null;
  db: CorpusQuery | null;
}): Promise<string> {
  const parts = [guideContext()];
  if (memory) {
    const lore = memory.assemble(liveFacts());
    if (lore) parts.push(lore);
    const hits = await memory.recall(question, 5);
    if (hits.length) {
      parts.push(
        `## Recalled memories\n${hits.map((hit) => `- ${hit.refId} (cosine ${hit.score.toFixed(2)})`).join('\n')}`,
      );
    }
  }
  if (db) {
    try {
      const items = await sacristanContext(db, question);
      if (items.length) {
        parts.push(
          `## Retrieved passages\n${items.map((item) => `- [${item.source}] ${item.title} (${item.key}): ${item.text}`).join('\n')}`,
        );
      }
    } catch (err) {
      debugEvent('sacristan', 'retrieval-failed', String(err), 'warn');
    }
  }
  return parts.join('\n\n');
}
