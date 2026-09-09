# Changelog

User-facing change notes, one section per released version, newest first.

**This file is a build input, not just documentation.** `scripts/collect-artifacts.mjs`
reads the section whose heading matches the version being collected and embeds
it in the release manifests (`change_notes` in the JSON, `<change_notes>` in the
XML) and in `RELEASE_NOTES-v<version>.md`. A version with no section here
collects with empty notes and says so — it does not fall back to boilerplate.

Bullet lines directly under a version heading become the manifest's
`change_notes.highlights` array, which is what the download page renders. Keep
them one sentence each and written for a reader of the app, not of the diff.

---

## v1.38.03717 — 2026-09-01

English stage directions return to the narrow bilingual reader.

- Red rubrics in the interleaved phone/tablet layout now show their English translation directly beneath the Latin instead of mistaking both marked language lines for one duplicate.
- Genuine identical reference lines still render once, and Divinum Officium control markers remain hidden.

## v1.37.82443 — 2026-08-17

The map becomes three maps — Mass, Scripture, and the Hours — and the lost Latin of the deuterocanonical books returns.

- The Mass Map is now ✠ **Holy Mass** in the rail, and the map view carries its own content types: **Scriptura** lays the whole canon out as two subway lines — hover a book stop and its chapters open right there on the stop; click a chapter to read. **Horæ** runs the day's eight hours as an office line — hover for the hour's parts, click to pray it.
- The loud pill that the global button skin painted behind active strip stops is gone; the subtle pulsating you-are-here ring breathes alone again.
- The map remembers its content type when you leave and come back through the sidebar.
- Book chips on the scripture strip open their chapter menu on hover, right on the stop.
- 🔖 Annotations moves to the end of the rail, with your other writing surfaces.
- The deuterocanonical books regain their Latin (Tobias, Wisdom, Baruch now fully bilingual from the Clementine tradition; Judith and Ecclesiasticus carry it across their aligned chapters).

## v1.36.82292 — 2026-08-16

The Mass Map breathes again.

- The day's proper stations on the Mass Map carry their subtle pulsating glow once more — a soft breathing halo and expanding ring in the day's liturgical color (still, calm, and off entirely under reduced-motion).

## v1.35.81558 — 2026-08-16

The reading experience matures: cleaner text, shorter map labels, and your annotations gain an index.

- Corrupt `#` heading lines no longer leak into the displayed text of 85 sections (the sprinkling rites now open directly with their antiphon).
- Rubrics (the red stage directions) always break onto their own line instead of running into the spoken text.
- Map station labels are the short liturgical names — Kyrie, Gloria, Oratio, Lectio — not essay-length titles.
- The map is now the Mass Map on every user surface, and a new 🔖 Annotations view indexes every highlight and margin note with jump-back-to-text, note editing, and colors.
- Sections carrying your annotations end with a titled ANNOTATIONS list instead of anonymous boxes.
- Selecting text moves a whole word at a time; shared passages open as a souvenir-plaque landing page with store badges.

## v1.34.81270 — 2026-08-16

Completes the stop-landing fix of v1.33.

- A stop inside a multi-part section (the Confiteor within the prayers at the foot of the altar; the Alleluia verse within a Sunday Gradual) now lands on its own line even when that section started folded — the first release's landing worked only when the section was already open.

### For maintainers

- Root cause: a folded section renders no body, so the focus effect's line query ran before the unfold painted. Fix: retry the refinement after the unfold renders (double `requestAnimationFrame`) — `ReaderView` focus effect.

## v1.33.81185 — 2026-08-16

The subway map's stops now lead somewhere, and the corpus names itself.

- Every station on the Mass map now opens its own text: the Confiteor stop lands on the Confiteor itself (not the top of the foot-of-the-altar block), the Alleluia stop finds the Alleluia verse wherever the day keeps it — its own section on some feasts, the paschal-gradual text on others, inside the Gradual on Sundays — and stops whose text the day genuinely lacks (the Alleluia on ember days and vigils, the sprinkling rite on weekdays) are greyed out instead of doing nothing when tapped.
- The sprinkling rite (Asperges me / Vidi aquam) and the other prayers of the Mass Ordinary that were missing from the corpus entirely are now present, Latin and English.
- The Alleluia verse is displayed again at feasts outside Paschaltide — a regression where it silently vanished from the reader.
- The liturgical corpus file now carries its own version identity inside it (build stamp, exact source-snapshot commit, and a one-line description of what changed), and a descriptive version history of the corpus begins in `DOCS/MISSAL-DB-VERSIONS.md`. Every future corpus rebuild states what changed in it.

### For maintainers

- **Web mounting is now flag-only:** the release push itself is the flag, and `.forgejo/workflows/mount-web-release.yml` mounts it (idempotent, fail-closed, additive — symlink swap only, no nginx interaction, rollback on failed public verification). Operator-side prerequisites and the current runner blocker are recorded in the Admin-Manual (`SERVERS/standroid-automated-mount-proposal-2026-08-15.md`, status IMPLEMENTED). Until the runner is reachable, pushes queue the mount rather than performing it manually.
- Root cause and fix record: `DOCS/2026-08-15-0935-office-mass-differential-probe-v1.31.66058.md` Phase 5 (D14) and `DOCS/MISSAL-DB-VERSIONS.md` (corpus ledger, entry `corpus-2026.08.16-0902`).
- The stops' tappability contract: a stop is clickable exactly when the reader will render its anchor that day (`readerAnchorsForDay` + `stationAnchorFor`); any future station must resolve through it.

## v1.32.80451 — 2026-08-15

The Divine Office now generates as Divinum Officium does, hour by hour, on
every kind of day.

- Matins lessons sit inside their nocturns on great feasts and follow the psalms as one block on Sundays, vigils and simpler feasts — opened by the Pater noster as the reference does.
- The psalmody of each hour follows the 1960 arrangement: Sundays and major feasts sing the festal psalms and the invariable Compline, penitential ferias and vigils take the second Lauds scheme with Psalm 50, and penitential Wednesdays break Psalm 49 into three in place of Psalm 50.
- The Gospel canticle at Lauds is once again the Benedictus (Canticum Zachariæ), not the Canticle of Moses.
- The eve of a major feast sings First Vespers of the feast: its antiphons, psalms, chapter, hymn, Magnificat antiphon and collect, with the festal Compline.
- Simpler saint's days read the occurring Scripture for their first two Matins lessons and the saint's legend for the third, as the reference engine arranges them.
- Commemorations are sung only where the rubric places them (Laudes and Vespers) and now render their real collects, falling back to the Sunday's collect on ferial days.
- Compline carries its confession block again, and the plain prayers the skeleton marks (Pater noster, the greeting before the collect, Prime's morning offering) render as text instead of placeholders.
- Scripture citation markers no longer leak into the text of the Office or the Mass propers; they render as parenthetical references, and source comments the reference engine discards are discarded.

### Known limitations

- Some proper texts (a canticle antiphon here, a responsory there) still render Latin-only; the English joins are a corpus-ingest task.
- Preces, the Prime Martyrologium announcement, Matins absolutions and blessings, and seasonal doxology switching remain unimplemented, as do the Triduum and Paschaltide arrangements.

### For maintainers

- The full divergence enumeration, root causes and the convergence evidence live in `DOCS/2026-08-15-0935-office-mass-differential-probe-v1.31.66058.md` (Phases 1–4).
- The convergence sweep is `tests/.tmp/diffprobe/sweep.mjs` (working artifact): five day-types × eight hours compared structure-token by structure-token against the vendored Divinum Officium reference render.
- **Release-ops record (2026-08-15):** the v1.32.80451 push initially failed because Forgejo (CT 130) was at 100% disk; the operator-directed record of the resulting 32 G rootfs resize is in the Admin-Manual (`SERVERS/pve-ct130-forgejo-rootfs-resize-2026-08-15.md`). The web release was mounted manually once (including one unnecessary nginx reload — a symlink swap alone suffices); that ad-hoc path is now prohibited. Mounting is being converted to the flag-only pattern: the release push itself is the "new release" flag (`version.json` + `dist/release-manifest-v<V>.json` + the web-pwa zip on Forgejo master), the agent never touches the server, and a **Forgejo Action** is the operator's preferred implementation for the mount step — see `SERVERS/standroid-automated-mount-proposal-2026-08-15.md` in the Admin-Manual.

## v1.26.60862 — 2026-08-02

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
