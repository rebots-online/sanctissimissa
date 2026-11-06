# §L partial — Book reader UI (`LibraryReader`) (2026-11-06)

Scope: the reader export (`LIBS/UI/STITCH/sanctissimissa-library-20260913/reader.html`,
Stitch `0918fcd8`) bound for the purchased work. Siblings referenced:
- Catalogue and My Books selectors, access, `library.progress.<editionId>`:
  `L-bookstore-commerce-20261106.md`.
- `chapterKey` grammar, pericope key grammar, module attach:
  `L-content-modules-search-20261106.md`.
- TTS dock above the reader host: `L-audiobook-20261106.md`.

Authorized by: §L.1/L.5; FREEZE 1 (W1, W8); operator value principle (R2).

## 1. Bindings (export → entity)

| Export selector | Binding |
|---|---|
| `#book-toc` | Chapter list for the open edition, ordered by the content partial's `chapterKey` order. Grouped under Evangelist headings (`St. Matthew` / `St. Mark` / `St. Luke` / `St. John`). The active chapter gets class `active`. Click calls `openChapter(chapterKey)`. |
| `#book-reader-host` | Mounts the existing `SectionReader` (`src/ui/SectionReader.tsx:307`), with `db` = app `CorpusDb` (module attached), `sections` = `editionSections(db, editionId, chapterKey)`, and `sidecar` = app `SidecarDb`. Each `ReaderSection.nodeKey` is the module pericope key `commentary:catena-aurea/<Book>/<ch>/<verseStart>`. Highlights, margin notes and selection menus therefore use the **existing** pipeline unchanged: `addAnnotation` / `annotationsFor` / `removeAnnotation` in `src/core/annotations/store.ts:79-100`, called from `SectionReader`. |
| `#reader-tools` → "Bookmark" button | `toggleBookmark(editionId, nodeKey)` over sidecar setting `library.bookmarks.<editionId>` (§2). `active` class while the current block is bookmarked. |
| `#reader-tools` → "Source" button | Opens the edition provenance drawer bound to the edition's `RightsEvidence` (commerce partial). |
| `#reader-tools` → "Highlight", "Comment" | **Not mounted.** Highlight and comment already exist, with identical behaviour across every reader, through `SectionReader`'s selection menu. Duplicate buttons would add a second, divergent path. |
| `#reader-tools` → "Audio Memo", `#recording-panel` | **Not mounted.** Recording is outside this release. |
| `#notebook-panel` tab "Study & Citation" | `.citation-card` for the block at the reader's scroll position. The heading is the block's Gospel verse (from its `COMMENTS_ON` edge). One `.cross-ref-item` "Open in Sacred Scripture" calls App's existing `onOpenKey('verse:<Book>/<ch>/<vs>')` (`src/App.tsx:419-427`), which sets `bibleFocus` and switches to `bible`. The export's specimen "Related Mass References" rows are **not mounted**, because the corpus has no pericope→Mass-day relation and invented rows are prohibited. |
| `#notebook-panel` tab "Notes" | Lists `annotationsFor(nodeKey)` for the open chapter's blocks. Label `Notes (<n>)` with the real count. |
| Reader header back link / breadcrumbs | `← My Books` returns to Bookstore › My Books. The breadcrumb is `<edition title> / <Evangelist> / Chapter <ch>`. |

Every specimen string in the export renders nowhere, including the Imitation-of-Christ
text, the specimen notice, and the sample notes and recordings.

## 2. Formats (Closed set, Phase L)

- `library.bookmarks.<editionId>` (sidecar setting):
  `{"schemaVersion":1,"items":[{"nodeKey":string,"chapterKey":string,"createdAt":ISO-8601}]}`.
  - Toggle adds the item or removes it.
  - Order is `createdAt` ascending.
  - Malformed JSON is preserved under `library.bookmarks.<editionId>.recovered` and the
    setting restarts empty (LS recovery rule).
- `ReaderTab = 'study' | 'notes'` (Closed set, Phase L). Persisted in sidecar
  `library.readerTab`.

## 3. Flow

1. Read action (either tab) → `LibraryReader` opens `library.progress.<editionId>`
   (commerce partial), or Matthew 1.
2. TOC click / scroll → `progress` updated (debounced 1 s).
3. Listen → the audiobook dock mounts above `#book-reader-host` with the same edition and
   chapter.

## 4. Entity table

| Entity | Type | File:line (target) | Signature / fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance (observable) | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| `LibraryReader` | component | `src/ui/library/LibraryReader.tsx` (new, <300 lines) | `(props: LibraryViewProps & {editionId: string})` | — | §L.1/L.5 | BA.6 | The owned Catena opens at the stored progress or at Matthew 1, and the TOC shows 89 chapters under 4 Evangelists | — |
| `editionSections` | function | `src/core/library/editionSections.ts` (new) | `(db: CorpusDb, editionId: string, chapterKey: string): ReaderSection[]` — blocks in `verseStart` order, title at chapter start, English only | — | §L.5 | BA.6 | Matthew 5 renders its commentary blocks in verse order | — |
| `openChapter` | function | `LibraryReader.tsx` | `(chapterKey) => void`; updates the reader and `library.progress.<editionId>` | — | §L.5 | BA.6 | Reopening the app returns to the last chapter | — |
| `toggleBookmark` | function | `src/core/library/bookmarks.ts` (new) | `(sidecar: SidecarDb, editionId: string, nodeKey: string, chapterKey: string): Promise<boolean>` (returns the new state) | — | §L.5 | BA.6 | Bookmark on → `active`; survives reload; off removes it | — |
| `library.bookmarks.<editionId>` | sidecar key | `SidecarDb` settings | §2 | Closed, Phase L | §L.5 | BA.6 | Setting JSON matches §2 after a toggle | — |
| `library.readerTab`, `ReaderTab` | sidecar key / type | `LibraryReader.tsx` | `'study' \| 'notes'` | Closed, Phase L | §L.5 | BA.6 | The tab choice persists across reloads | — |
| `#book-toc`, `#book-reader-host`, `#reader-tools`, `#notebook-panel`, `.citation-card`, `.cross-ref-item` | DOM anchors | export `reader.html` → `LibraryReader.tsx` | §1 | — | FREEZE 1 | BA.6 | The rendered reader matches the export layout at desktop and narrow widths; no specimen strings (L.7-14) | — |
| "Open in Sacred Scripture" | action | `LibraryReader.tsx` → `App.onOpenKey` (`src/App.tsx:419`) | `onOpenKey('verse:<Book>/<ch>/<vs>')` | — | §L.1 | BA.6 | Click opens Sacred Scripture at that verse | — |
