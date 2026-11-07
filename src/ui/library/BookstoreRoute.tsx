/**
 * BookstoreRoute (BA.5; L-bookstore-commerce-20261106.md §4.2): builds the ten
 * LibraryViewProps from the commerce singleton, the module installer, the
 * edition index and the account, then renders the Bookstore view. Keeps
 * App.tsx to a single mount line (rule 11).
 */
import { useMemo } from 'react';
import type { CorpusDb } from '../../core/data/corpusDb.ts';
import type { SidecarDb } from '../../core/accompaniment/store.ts';
import { getCommerce } from '../../core/entitlements/service.ts';
import { ModuleInstaller } from '../../core/library/modules.ts';
import { loadEditions } from '../../core/library/editions.ts';
import { useAccount } from '../../core/account/useAccount.ts';
import BookstoreView from './BookstoreView.tsx';
import type { LibraryViewProps } from './viewTypes.ts';

export default function BookstoreRoute({ db, sidecar, onOpenKey, onSignIn }: {
  db: CorpusDb;
  sidecar: SidecarDb;
  onOpenKey: (nodeKey: string) => void;
  onSignIn: () => void;
}) {
  const { entitlements, purchases } = useMemo(() => getCommerce(sidecar), [sidecar]);
  const installer = useMemo(() => new ModuleInstaller(), []);
  const editions = useMemo(loadEditions, []);
  const account = useAccount();
  const props: LibraryViewProps = {
    db,
    sidecar,
    entitlements,
    purchases,
    installer,
    editions,
    signedIn: account.user !== null,
    userEmail: account.user?.email ?? null,
    onSignIn,
    onOpenKey,
  };
  return <BookstoreView {...props} />;
}
