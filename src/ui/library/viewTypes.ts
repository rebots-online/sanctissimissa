import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { SidecarDb } from '../../core/accompaniment/store.ts';
import type { EntitlementController } from '../../core/entitlements/index.ts';
import type { PurchaseController } from '../../core/entitlements/purchases.ts';
import type { ModuleInstaller } from '../../core/library/modules.ts';
import type { EditionIndex } from '../../core/library/editions.ts';

export interface LibraryViewProps {
  db: CorpusDb;
  sidecar: SidecarDb;
  entitlements: EntitlementController;
  purchases: PurchaseController;
  installer: ModuleInstaller;
  editions: EditionIndex;
  signedIn: boolean;
  userEmail: string | null;
  onSignIn: () => void;
  onOpenKey: (nodeKey: string) => void;
}
