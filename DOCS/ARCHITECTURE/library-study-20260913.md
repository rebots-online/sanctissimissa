# Library, Bookstore, Gregorian Chant and Mass Reference

Date: 2026-09-13. Architecture revision LS-1. Target application: SanctissiMissa,
`mba.robin.sanctissimissa`. This is a build contract, not a statement of shipped
functionality. Implementation markers live in CHECKLIST.md, stanza LS.
The operator requested the Stitch extension and then an architecture/checklist
for GLM in this session. That is the authority for this scope.

## Current-state audit and supersessions

Audited application baseline `e3b83e00`; research committed as `aa63ada4`.
Admin-Manual was fetched; its HEAD matched upstream, with concurrent local policy
edits preserved. `/sesh resume` completed in architect role. CodeGraph verified
142 files, 1,749 nodes, 5,333 edges, SQLite quick_check=ok. PROJECT_INDEX.md is
absent. Graph queries supplied the App routes, shared reader and sidecar APIs.
Markdown and package.json are demonstrated graph parser gaps: targeted reads of
the named architecture, checklist, rubric, proposals and package.json were used.

| Area | Observed evidence | Meaning |
|---|---|---|
| Haydock | master decision 19 and section 9.3; graph `parseHaydock`, `COMMENTARY_SOURCES` | Included commentary exists; permanently free remains binding. |
| Purchased reference modules | BQ.1–3 and BU.2 are pending; graph has no EntitlementController or Bookstore symbol | A planned module/purchase system, not a working sale/download path. |
| Sidebar | `src/App.tsx:30` View union has map/reader/annotations/calendar/office/bible/journal/homily/settings/about | No Library, Bookstore, Chant or Reference routes at the audit baseline. |
| Shared reading | `SectionReader:285`; current ReaderSection is at `src/ui/SectionReader.tsx:84` | Reuse real range highlighting, annotation and context menu machinery. |
| User data | `src/core/accompaniment/store.ts` SidecarDb.open(), persist(), list(), save(), getSetting(), setSetting() | This is the current sidecar; the master's older `core/data/sidecarDb.ts` rows are historical. |
| Bookmarks/recording | focused graph queries found no bookmark/MediaRecorder implementation | Do not claim these as already shipped across readers. Add and verify them in LS. |
| Mass lore | station/route lore exists | A foundation, not a practical chant planner or comprehensive Mass Reference section. |

For LS scope this document supersedes the master's decision 19 `study_library`
single gate, section 9.3 outbound copy/paste/export restrictions, and the P-G
missing-key-means-ungated rule. Core text, personal annotations/recordings and
their export remain free. Paid managed editions fail closed when commerce is
unconfigured. Haydock remains free. The stable commercial vocabulary is
`reference_<editionId>` and `study_library_all`. These are not two independent
controllers. Existing unrelated entitlements keep their identifiers.

The old mandatory SQLite split/attach work in BQ is superseded for standalone
books by the portable edition package below. Existing Haydock graph commentary
stays in the working corpus; no corpus rebuild or physical split is required to
start the Library. Global semantic search over unindexed purchased books is excluded from LS;
existing term lookup continues to use the installed corpus.

## Frozen design source

Root: `LIBS/UI/STITCH/sanctissimissa-library-20260913/` (called UI_ROOT below).
Stitch project: https://stitch.withgoogle.com/projects/7192660594233084032 .
Original Bookstore: project `9785949261255837034`, screen
`7a06011f96cf4ae19f44d207cbbc9dbb`, preserved in `original/bookstore.html`.
Original baseline DESIGN.md is preserved verbatim; its obsolete product name
and multiple breakpoints are historical. LS uses the current 1100px breakpoint.

| Export | Screen ID | Actual addressable elements | Target component |
|---|---|---|---|
| `bookstore.html` | `eeb7643f00314991ab7a325c9daa2216` | `#catalogue-search`, `#category-filter`, `#author-filter`, `#catalogue-grid`, `#book-detail`, `#edition-provenance`, `#purchase-options` | BookstoreView |
| `library.html` | `83d9c89c5d0f42d29707648c9a4b1acd` | `#library-search`, `#library-grid`, `#download-manager` | LibraryView |
| `reader.html` | `0918fcd8e0174446b17b14df6611830b` | `#book-toc`, `#book-reader-host`, `#reader-tools`, `#notebook-panel`, `#recording-panel` | LibraryReader |
| `chant.html` | `a8f2b5d39410445b91178636a97824a2` | `#chant-profile`, `#chant-plan-slots .slot-card`, `#ordinary-selector`, `#rehearsal-panel`, `#chant-learning` | ChantView |
| `mass-reference.html` | `f6cc5e4c8df3462f96aa7806aa60624a` | `#mass-reference-search`, `#mass-order`, `#reference-article`, `#rite-profile`, `#reference-sources` | MassReferenceView |

Exports contain executable prototype interactions. Sample ownership, dates,
prices, progress, prose, melody diagrams and file counts are design specimens,
not production evidence. Implementers mechanically adapt their markup and CSS
to React, retain these selectors and layout, and replace sample data/events with
the contracts below. Do not create a second visual interpretation, an iframe
reader, a runtime CDN dependency, or a parallel annotation editor. The single
app rail supplies navigation; omit each export's duplicate rail. Scope imported
CSS under `.library-surface` and map colours to existing semantic tokens. Preserve
the 1100px responsive behavior and existing sixteen theme combinations.

## Closed product scope

1. My Library: included/acquired editions, search/filter by author/category,
   resume reading, bookmarks, notebook/recordings, downloads and removal of
   downloaded text without removing personal work. No cloud sync claim.
2. Bookstore: all 61 preliminary works, eight collection proposals and seven
   versioned bundle proposals; exact edition/source inspection and previews;
   localized offers only when a publication is ready and its channel configured.
3. Books and prayer collections use SectionReader, including monolingual English
   without a fictitious Latin column. Highlights, comments, bookmarks and local
   voice recordings are usable with the same toolbar in books, Missal, Office,
   Scripture and Mass Reference. Export of one's own work is never paywalled.
4. Gregorian Chant: 1962 general Roman calendar; director plans, sourced optional
   choices, separate rehearsal order, learning, score/text/audio when cleared,
   and quiet during-Mass mode. Local calendars require an explicitly sourced
   manual plan when not covered. No claim of automatic support for every diocese.
5. Mass Reference: complete 31-stage Mass navigation plus six introductory
   articles, with sourced explanations, role distinctions and local custom.
   Current-rite materials are link-only comparison; its selector cannot silently
   change the 1962 planner or offer an unsupported current-rite calendar.
6. Initial checkout: RevenueCat Web Billing for web/direct desktop and sideload;
   RevenueCat with Play Billing for Play distribution. WooCommerce/Gumroad remain
   evaluated alternatives, not launch adapters. Bidlr is unidentified and excluded.
   No publication of merchant products or deployment is performed by this handoff.

## Catalogue and package model

`content/library/catalogue.seed.json` contains exactly C001–C061, eight collections
and seven bundles; all are candidates, with null editionId/price/productId.
Its author strings and source notes are research evidence, not parsed rights
clearances. Haydock is C002; retain its free policy even in a bundle. A bundle
must not charge again for its free component. Primary research and per-work URLs
live in `DOCS/PROPOSALS/library-catalogue-2026-09-13.md`.

Types below live in `src/core/library/types.ts:1` (new files use :1 as their
insertion anchor; it is not a claim that those files exist already).

```ts
type Publication = 'candidate' | 'reviewed' | 'ready' | 'withdrawn';
type AssetKind = 'text' | 'score' | 'audio' | 'cover';
interface RightsEvidence {
  assetId: string; kind: AssetKind; sourceUrl: string; sourceEdition: string;
  translator: string | null; publicationYear: number | null;
  basis: string; territories: string[]; commercial: boolean;
  redistribution: boolean; attribution: string; reviewedBy: string | null;
  reviewedAt: string | null; sha256: string;
}
interface EditionRecord {
  id: string; workId: string; title: string; author: string; category: string;
  revision: number; publication: Publication; languages: string[];
  rights: RightsEvidence[]; territories: string[]; free: boolean;
  entitlementId: string | null; previewBlockIds: string[];
  packagePath: string | null; packageSha256: string | null;
}
interface EditionBlock {
  id: string; sectionId: string; sectionTitle: string; sourceLocator: string;
  latin: string | null; english: string | null;
}
interface EditionContent {
  schemaVersion: 1; editionId: string; revision: number;
  blocks: EditionBlock[]; sourceUrls: string[];
  redirects: Record<string, string[]>;
}
interface EditionBundle {
  id: string; revision: number; title: string; editionIds: string[];
  publication: Publication; territories: string[];
}
interface ReadingAnchor {
  documentId: string; revision: number; blockId: string;
  language: 'la' | 'en'; line: number; start: number; end: number;
  quote: string; prefix: string; suffix: string;
}
type RecordKind = 'bookmark' | 'progress' | 'recording' | 'chant-plan' | 'practice';
interface UserRecord {
  id: string; deviceId: string; createdAt: string; updatedAt: string;
  deletedAt: string | null;
}
interface BookmarkRecord extends UserRecord { anchor: ReadingAnchor; label: string }
interface ProgressRecord extends UserRecord { documentId: string; anchor: ReadingAnchor }
interface RecordingRecord extends UserRecord {
  anchor: ReadingAnchor; blobId: string; mimeType: string; bytes: number;
  durationMs: number; title: string; visibility: 'private';
}
type LibraryDestination =
  | {view:'library'|'bookstore'}
  | {view:'chant';planId?:string}
  | {view:'mass-reference';articleId?:string;blockId?:string}
  | {view:'book-reader'; editionId:string; blockId?:string};
```

Edition IDs are ASCII kebab-case, immutable and independent of title spelling;
edition revisions are positive integers. Ready bundles use EditionBundle and
`content/library/bundles.json` (`{schemaVersion:1,bundles:EditionBundle[]}`);
all edition IDs must resolve to ready editions in the intersection of allowed
territories. Keep candidate work-level bundle proposals separate. IDs `haydock-1883-en` and
`imitation-benham-1886-en` are reserved; the latter is only published if the exact
edition review establishes that lineage. Haydock 1883 must be independently
substantiated by the existing VENDORED/haydock provenance/source; C002’s 1859
research lead is not that evidence. A verified 1859 source uses a separate
`haydock-1859-en` ID. Both Haydock editions are free. No ingest silently substitutes a modern
translation. Work IDs stay `work-c001` etc. Bundle composition is an explicit
ordered edition-ID snapshot, never an implicit promise of all future titles.
Paid offers grant edition-specific entitlements; all-library subscription access
is a separate reason for access, with expiry. Lifetime ownership must survive
expiration of another access reason. Currency/price is never inferred from locale.

Package text is plain Unicode, never executable HTML. EditionContent is UTF-8
JSON; paragraph/block IDs are assigned in a committed ingest map, not generated
from page position or paragraph text. Corrections retain IDs; merged/split blocks
use redirects plus quote/prefix/suffix matching. Ambiguous relocations remain
visible as unresolved annotations; they are never silently attached elsewhere.
Catalogues/signed package envelopes must conform to the service contract annex.
Its cryptographic wire types supersede local transport field shorthand here.
ReadingAnchor line/start/end use zero-based UTF-16 offsets in the rendered raw
language text, matching AnnotationRange; ingest-map source ranges alone use
Unicode code points. Resolve a split only across its explicit ordered successor
IDs; exactly one quote/prefix/suffix match relocates, zero or multiple remains
unresolved. With no text selection, bookmark/record attaches to the visible block
with line/start/end=0, empty quote/prefix/suffix. No fabricated quotation.

Before `ready`, every distributed asset needs source hash, exact edition,
commercial/redistribution determination, named reviewer and allowed territories;
both publication readiness and a real offer are required for Buy. US public domain
does not establish Canadian or worldwide eligibility. Historical indulgence
claims in The Raccolta are explicitly historical, not current promises. Modern
translations, engravings and recordings require independent rights evidence.
All candidate rows remain browsable with source links and a non-purchase state.

## Entities and boundaries

| Exact entity | Target file:line | Interface and responsibility |
|---|---|---|
| CatalogueSeed, CatalogueWork, CatalogueCollection, CatalogueBundle | `src/core/library/types.ts:1` | Mirror the committed seed JSON fields without dropping evidence/source notes; do not confuse work IDs with edition IDs. |
| validateCatalogue, filterCatalogue, canPublishEdition | `src/core/library/catalogue.ts:1` | `(input:unknown):CatalogueSeed` throws structured validation errors; `(works, {query,author,category}):CatalogueWork[]`; `(edition:EditionRecord,territory:string):boolean`. Accent-insensitive search, stable title/id ordering. |
| LibraryStore | `src/core/library/store.ts:1` | `constructor(sidecar:SidecarDb)`; `getRecord<T>(kind:RecordKind,id:string):T|null`, `listRecords<T>(kind):T[]`, `putRecord(kind,id,value):Promise<void>`, `removeRecord(kind,id):Promise<void>`. |
| LibraryMediaStore | `src/core/library/media.ts:1` | `put(blob:Blob):Promise<{blobId,bytes,mimeType}>`, `get(blobId):Promise<Blob|null>`, `remove(blobId):Promise<void>`. Per-app persistent binary store, never public corpus cache. |
| validateEditionContent, editionSections, resolveReadingAnchor | `src/core/library/content.ts:1` | `(unknown):EditionContent`; `(content):ReaderSection[]`; `(anchor,oldContent,newContent):{state:'exact'|'relocated'|'unresolved',anchor:ReadingAnchor}`. |
| EditionInstaller | `src/core/library/download.ts:1` | `install(editionId,signal,onProgress):Promise<EditionContent>`, `load(editionId):Promise<EditionContent|null>`, `remove(editionId):Promise<void>`. Uses verified Bearer-authenticated service manifest/content routes and signed envelope and atomic active-revision switch. |
| RecordingController | `src/core/library/recording.ts:1` | `constructor({store,media,adapter?:RecordingMediaAdapter})`; `subscribe(listener:()=>void):()=>void`; `start(anchor:ReadingAnchor):Promise<void>`, `stop():Promise<RecordingRecord>`, `cancel():Promise<void>`, `state:'idle'|'requesting'|'recording'|'saving'|'error'`; dependencies LibraryStore/LibraryMediaStore and an injectable media-device adapter. |
| RecordingMediaAdapter | `src/core/library/recording.ts:1` | `{supports(mimeType:string):boolean,requestStream():Promise<MediaStream>,createRecorder(stream:MediaStream,mimeType:string):MediaRecorder,now():number}`; browser implementation uses isTypeSupported/getUserMedia/audio-only/MediaRecorder/performance.now; tests inject controlled event-capable objects. |
| StudyTools, RecordingPanel | `src/ui/library/StudyTools.tsx:1`, `src/ui/library/RecordingPanel.tsx:1` | Shared controls `{store,media,controller,anchor}`. Bookmark, notes link, record/stop/play/download/delete, busy/error state, keyboard and permission handling. |
| EntitlementController, useEntitlement | `src/core/entitlements/index.ts:1` | `has(entitlementId):boolean`, `refresh():Promise<void>`, `subscribe(listener):()=>void`, `accessFor(editionId):{state:'free'|'owned'|'subscription'|'locked'|'unavailable',expiresAt:string|null}`; exactly one authority. |
| PurchaseController | `src/core/entitlements/purchases.ts:1` | `offers(editionId):Promise<PurchaseOffer[]>`, `purchase(offerId):Promise<void>`, `restore():Promise<void>`; normalized channel-specific SDK adapter. PurchaseOffer fields id/title/priceText/currency/kind('lifetime'|'subscription')/terms. |
| LibraryView, BookstoreView, LibraryReader | `src/ui/library/{LibraryView,BookstoreView,LibraryReader}.tsx:1` | Shared `LibraryViewProps` below; exact frozen selectors above. No processor/receipt reads in components. |
| LibraryViewProps | `src/ui/library/viewTypes.ts:1` | `{db:CorpusDb,sidecar:SidecarDb,store:LibraryStore,media:LibraryMediaStore,installer:EditionInstaller,entitlements:EntitlementController,purchases:PurchaseController,recording:RecordingController,onNavigate:(d:LibraryDestination)=>void,editionId?:string,blockId?:string}`. |
| Library route state and rail entries | `src/App.tsx:30` | Extend View with library/bookstore/book-reader/chant/mass-reference; add destinations after Scripture, retain all current entries. One shared service lifetime per app session. |
| Library deep links | `src/core/share/shareLink.ts:1` | `#/library/<encodedEditionId>/<encodedBlockId>`; malformed encoding returns a visible invalid-link state, never throws. Books use view-true TOC/progress in MapStrip rather than an unrelated Mass strip. |
| IdentityController | `src/core/entitlements/identity.ts:1` | `signIn(),finishSignIn(),signOut():Promise<void>`, `token():Promise<string|null>`, state anonymous/loading/authenticated/error; OIDC PKCE + mapped RC identity. |
| AccessTokenProvider | `src/core/entitlements/api.ts:1` | `{token():Promise<string\|null>,refreshToken():Promise<string\|null>}` injected interface; LS.04 uses fixtures, LS.08 binds IdentityController. |
| BookstoreApi | `src/core/entitlements/api.ts:1` | `identity(),entitlements(),reconcile(),license(),manifest(editionId,revision),content(editionId,revision,range?,etag?,signal?)`; exact wire types and routes in service annex. |
| PlayPurchaseAdapter, CommercePlugin | `src/core/entitlements/play.ts:1`, `src-tauri/gen/android/app/src/main/java/mba/robin/sanctissimissa/CommercePlugin.kt:1` | PurchaseController adapter; configure(accountId,apiKey), offers(offeringId), purchase(packageId), restore() through RC Android SDK. |
| commerce_configure / commerce_offers / commerce_purchase / commerce_restore | `src-tauri/src/commerce.rs:1` | Tauri Android IPC matching Kotlin operations; no web adapter compiled into Play distribution. |
| ingest-edition / validate-editions | `scripts/library/ingest-edition.mjs:1`, `scripts/library/validate-editions.mjs:1` | Exact range-map CLI and readiness validation in LS.03; output edition.json, never ZIP. |
| Public offer mapping | `content/library/offers.json:1` | Actual RC internal IDs mapped to stable lookup keys and SDK offering/package/store-product IDs; exact schema in LS.08. |
| included editions | `content/library/included.json:1` | `{schemaVersion:1,editions:{record:EditionRecord,content:EditionContent}[]}`; validated free, ready content statically imported, no OIDC dependency. |
| libraryActionState, parseLibraryDestination | `src/core/library/viewState.ts:1` | `(edition,access,installed:boolean,online:boolean):{canRead:boolean,canBuy:boolean,canDownload:boolean,reason:string\|null}`; `(hash:string):LibraryDestination\|null`; pure selectors/parser used by UI and LS tests. |
| compareVersionTriples | `src/core/library/versions.ts:1` | `(left:string,right:string):number`; same numeric MAJOR.MINOR.BUILD contract as the backend, tested across numeric digit boundaries. |
| LS tests | `tests/{libraryCatalogue,libraryContent,libraryStore,libraryDownloads,libraryRecording,libraryEntitlements,libraryRoutes}.test.ts:1` | Behavioral fixture assertions described in CHECKLIST LS, no live provider calls or microphone. |

`LibraryStore` stores schemaVersion=1 and typed per-kind records in the existing
sidecar setting `library.state.v1` using getSetting/setSetting/persist. JSON parsing
is caught and validated; malformed state is preserved as a recovery value before
starting an empty state, with a visible recovery notice. Writes serialize,
rollback the in-memory setting on persist failure, and propagate errors. Existing
sidecar namespace/migration semantics stay intact. Tombstones include timestamps;
no user-data rows are erased by uninstall, refund, logout or expired entitlement.

Binary storage uses IndexedDB `sanctissimissa.library.media.v1` store `blobs` on
web and on native WebViews for this wave; user backups include actual audio bytes
and an index. The native WebView durability/permissions must be verified on each
release platform. Quota failure is reported before creating dangling metadata.
Package storage is a separate IndexedDB `sanctissimissa.library.packages.v1` with
stores `staging`, `packages`, `active`, scoped to the app origin. A portable JSON
package avoids assuming external filesystem access or SQL ATTACH from bytes.
This app-private user-data policy never follows the optional org-shared corpus
cache toggle. Downloads verify signature, compatibility, size/hash and content
schema before atomic activation; failed/resumed downloads retain the previous
active revision. Remove download affects package bytes only. Startup recovers
or discards incomplete staging entries without treating them as installed.

`editionSections` emits one ReaderSection per stable block, anchor/nodeKey
`book:<editionId>#<blockId>`, title only at section boundaries, sourceLocator in
meta; preserve source line breaks. Missing language stays null. The shared reader
receives the real app CorpusDb for existing term lookup; book anchors do not get
misinterpreted as Bible refs or Mass dates. New optional `documentContext:{documentId:string,revision:number,blockIdForSection:(anchor:string)=>string}` and `studyTools:{store:LibraryStore,media:LibraryMediaStore,controller:RecordingController}` props in
SectionReader map selection ranges to ReadingAnchor and expose StudyTools;
existing annotation APIs remain backward-compatible. Personal annotations remain
in the existing annotation/accompaniment pipeline, never duplicated in LibraryStore.
Annotation gains optional `documentAnchor:ReadingAnchor`; its current localStorage
store preserves that object alongside range/rangeAlt. This audit does not claim
that live highlights already use SQLite. Accompaniment gains optional
`documentAnchor:ReadingAnchor|null`; add nullable `document_anchor TEXT` to
accompaniments after PRAGMA table_info inspection, and map guarded JSON in
rowToAccompaniment/save. Legacy rows are null. These exact fields and redirects
make edition correction auditable; never create a second annotation table. Notebook entries use SidecarDb.save({exposure:'study',anchors,...}).

Recording starts only on an explicit user gesture. Feature-detect MediaRecorder
and the first supported MIME of audio/webm;codecs=opus, audio/webm, audio/mp4;
denial/unsupported hardware gives an actionable error, never a fabricated file.
Stop releases every track, saves a nonempty Blob before metadata, and records
elapsed monotonic duration. Cancel and route-unmount release tracks; no automatic
upload or transcription. User can export/delete their own recording independently
of book access. Delete is an explicit user action with a recoverable metadata
tombstone; retain the blob until an explicit permanent cleanup.

## Service and chant annexes

[Bookstore service contract](bookstore-service-20260913.md) and
[chant and reference contract](chant-reference-20260913.md) are adopted annexes. Their schemas, exact file/entity tables and test cases are
binding for LS. CHECKLIST LS reproduces execution instructions so a GLM coder
does not need to read architecture documents. Research proposals remain evidence;
they do not override the selected architecture. No placeholder provider adapters
or unsupported calendar claims are accepted.

## Verification and handoff

Automated task acceptance uses deterministic fixtures and controlled clocks,
existing node:test conventions, fake-indexeddb, and real state transitions; no
grep count can establish payment, liturgical or annotation correctness. Run only
the assigned task's tests during a module handoff; run `npm test` and `npx tsc -b`
once after integration. Production build/version/packaging follow the existing
release contract, not this architecture task. Merchant/device tests belong to
the LS operator verification protocol in TEST_RUBRIC.md. Missing merchant config
does not authorize a success claim or fabricate saleable catalogue entries.

For included free editions, LS.03 writes `content/library/included.json` with
`{schemaVersion:1,editions:[{record:EditionRecord,content:EditionContent}]}`; start
with an empty editions array when no complete edition has passed rights review.
`EditionInstaller.load` reads this statically imported included content first,
verifies its deterministic serialized SHA256 against record.packageSha256, and
requires matching free/ready edition and revision. This path never contacts OIDC
or RevenueCat. The existing Haydock corpus commentary stays available regardless
of whether a complete standalone Haydock edition has been ingested. Paid packages
are never embedded in this public file. Remote free downloads through the private
service still require identity, so the UI labels their sign-in requirement.

LibraryViewProps includes the one shared `recording:RecordingController`.
IdentityController also exports `refreshToken():Promise<string|null>` and
implements AccessTokenProvider; LS.04 depends on that interface alone, eliminating
a construction cycle with LS.08. The App composition injects a fixture-free token
provider after identity initialization.

Existing Mass/Office/Scripture readers use documentId `corpus:<readerKind>`
(readerKind is `mass`, `office`, or `bible`), revision 1 and the complete existing
section anchor as blockId. This is the explicit initial corpus anchor revision;
corpus text changes must preserve IDs or adopt a documented revision/relocation
map. Book documentIds are `book:<editionId>`, reference IDs `reference:<articleId>`.
Do not derive revisions from the current date or silently relabel old annotations.

The authoring handoff verifies source availability and contract closure only.
All LS implementation tasks start pending. It does not certify a new working
application, merchant setup, liturgical editorial approval or purchasable books.
