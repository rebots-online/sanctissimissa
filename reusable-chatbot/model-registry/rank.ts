// CP.4 ranking (§7.8.5): fuse catalog entries with live capability truth.
// Deployability = capability fit + Atomic priority + quant quality + task fit
// − memory pressure − unsupported penalty. The ranked pick must change
// correctly when probe truth changes (that is the whole point of the broker).

import type { ModelCatalogEntry } from './catalog.ts';
import type { CapabilityReport } from '../core/capability-broker.ts';

export interface RankedModel extends ModelCatalogEntry {
  score: number;
  /** True when this runtime cannot honestly run the model. */
  unsupported: boolean;
  unsupportedReason?: string;
}

const PRIORITY_SCORE: Record<ModelCatalogEntry['priority'], number> = {
  recommended: 40,
  'low-spec': 30,
  catalog: 10,
};

export function rankModels(entries: ModelCatalogEntry[], report: CapabilityReport): RankedModel[] {
  const ranked = entries.map((entry) => {
    let score = PRIORITY_SCORE[entry.priority];
    let unsupported = false;
    let unsupportedReason: string | undefined;
    if (entry.bytes > 0 && entry.bytes > report.memoryBudgetBytes) {
      unsupported = true;
      unsupportedReason = `needs ~${Math.ceil(entry.bytes / 1024 ** 3)} GB — over this device's budget`;
      score -= 1000; // sink below everything deployable
    } else {
      // Prefer smaller weights within the budget (memory pressure), and the
      // universal baseline quant family (Q4_K_M-class) ranks first (§7.8.3).
      score += entry.bytes > 0 ? Math.max(0, 20 - Math.floor(entry.bytes / 1024 ** 3) * 4) : 0;
      score += /Q4/.test(entry.quant) ? 12 : /Q5|Q6/.test(entry.quant) ? 8 : /Q8/.test(entry.quant) ? 4 : 0;
    }
    return { ...entry, score, unsupported, unsupportedReason };
  });
  return ranked.sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));
}

/** The automatic qualified default: top-ranked deployable (§7.8.5a). */
export function pickDefault(ranked: RankedModel[]): RankedModel | null {
  return ranked.find((m) => !m.unsupported) ?? null;
}
