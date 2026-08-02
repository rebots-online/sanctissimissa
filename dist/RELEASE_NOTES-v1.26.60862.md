# St. Android's Missal v1.26.60862

The bilingual reader is now one implementation shared by every book, and the
English of the Ordinary is no longer missing.

- Following along in the Divine Office and Sacred Scripture now works as it does in the Mass: hovering a line highlights the same line in the other language, and the translation flyout appears.
- The selection menu is available in every reader, can be dismissed with Escape or a click outside, and opens on the word under the cursor when you right-click without selecting anything.
- Added **Copy** and **Highlight** to the selection menu; a highlight marks the passage in both Latin and English and stays marked when you come back to it.
- The English text of the Ordinary of the Mass is now present throughout — fourteen of its twenty-one sections previously rendered blank.
- The navigation rail has a hamburger toggle, collapses cleanly to icons without stray text, and its date picker becomes a calendar button that opens over the page.
- The About page now carries the real origin story of the project instead of placeholder text.
- The Windows installers (.msi and .msix) are built by the release pipeline for the first time; previously neither was produced by a release run.
- Fixed an offline-cache fault that would have kept returning web users on the previous corpus indefinitely — they would have received the new app with the old, partly-blank text.

### Known limitations

- The subway map still shows the parts of the Mass in every view; making it follow what you are reading is designed but not yet built.
- The origin story's photograph and video preview are not yet included.

### For maintainers

- `SectionReader` (`src/ui/SectionReader.tsx`) is now the single bilingual reading surface; `ReaderView`, `OfficeView` and `BibleView` all mount it. A view that re-implements echo, flyout, menu or annotations is a defect.
- The corpus ingest pairs the Ordo by ordinal position rather than by heading name, because the headings are themselves translated.
- `windows-msi` and `windows-msix` are release stages, skipped on non-Windows hosts.
- MSIX `Identity/@Version` is `MAJOR.MINOR.0.0`; Appx parts must be ≤ 65535 and the Store requires revision 0, so the display BUILD number cannot appear there.
- The service worker's corpus cache used `CacheFirst` under a cache name hardcoded to `v1.24.37311`. CacheFirst never revalidates and the name never changed, so `cleanupOutdatedCaches` could not evict it. Now `StaleWhileRevalidate` under a version-free name, revalidating against the ETag nginx already sets for `/missal.db`.
- `tsconfig.tsbuildinfo` is untracked and `src-tauri/Cargo.lock` records the built version — both previously dirtied the tree mid-build and failed the gate for the following stage.

---

Built from commit d14b9d78d6d6e363963e97cf0b00c5a262947740. See the adjacent release manifest for exact artifact hashes and verification state.
