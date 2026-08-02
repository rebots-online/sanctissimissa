# Bug-wave plan — v1.27 baseline and the renovation behind it

**Authored:** 2026-08-02 from a working session with the operator.
**Source bug list:** `DOCS/BUGS/BUGS-v.1.25-31jul2026.md`.
**Status:** decisions settled in discussion; not yet folded into `CHECKLIST.md`
or `DOCS/ARCHITECTURE.md`.

---

## Principles settled this session

Cross-cutting; each decides several bugs at once.

**P1 — One reader, instantiated many times.** Operator, verbatim: *"The readers
should all be one thing instantiated multiple times, not several independent
readers anyway."* The collinear rule, one rung up from the data layer.

**P2 — One rich-text editor, instantiated everywhere.** Journal, homily,
accompaniment, notes, later the Publishing Desk. What exists is "woefully
unpresentable and lacking in rich features." OSS-base-versus-built is
immaterial to the principle. Note TinyMCE is GPL-or-commercial dual-licensed
and this app is proprietary, so the MIT cores (Lexical, TipTap/ProseMirror,
Slate) are the practical candidates. Host-agnostic from day one — the same
EnZIME-lift requirement already on the module system.

**P3 — The graph is LLM-inferred at ingest, static at runtime.** Not
morphological, not dictionary word-similarity. The model reads the corpus once
at build time and emits **typed** relations with rationale; the shipped
artifact stays plain SQLite that sql.js reads identically everywhere. Runtime
stays fully offline. Relation vocabulary is designed, not scored — "alludes
to", "develops", "fulfils", "prefigures", "shares occasion with" — so a
surfaced neighbour can say *why* it is adjacent.
*Consequence:* current `embeddings` are 128-d hashed trigrams
(`src/core/vector/embed.ts`) — character overlap, not meaning. Fine for lexical
neighbours, inadequate for the force-directed semantic graph. Schema is already
model-agnostic, so it is a swap, not a migration.

**P4 — One panel manager.** Adjunct content docks; it does not hover. Same
argument as P1/P2. Tenants: Liturgibot, the meaning/vector panel, the
force-directed mini-graph, the journal sidecar.

**P5 — Language primacy is a property of the rite, not a user preference.**
Nobody says a Latin Mass in English, so an English-primary EF reader would
render something that does not exist. EF → Latin normative, English is reached
for. Novus Ordo → both wordings official, so language choice is legitimate
there (though ICEL copyright means we ship structure and explanation, not
verbatim text). Study surfaces — Scripture reader, concordance, search, meaning
panel — are a different context where English-primary is fine.

**P6 — Nothing is fabricated, and supplied content is visibly supplied.**
Extends the existing no-placeholder rule to authored translations.

---

## Live corpus state (measured 2026-08-02 against shipped `assets/missal.db`)

```
nodes 95,796 · edges 232,130 · text_blocks 91,471 · embeddings 84,954

latin present, english missing    14,170
english present, latin missing    25,046
both present                      52,235

nodes flagged 'filled'               186
nodes flagged 'translationSupplied'    0
```

- **`meta.translationSupplied` is specified but unimplemented.** Nothing writes
  it, nothing reads it, so a reader cannot tell our English from DO's.
- **`DOCS/MISSING-REFERENCES.md` needs regenerating.** It reports 263
  English-only against 25,046 measured. Different units (34,957 *sections* vs
  91,471 *text_blocks*), but too divergent to plan against.

---

## Per-bug disposition

| # | Item | Disposition |
|---|---|---|
| 1 | Origin Story from `.env`; gating/RevenueCat/payments | **Split.** 1a prose — ready, text boundaries decided. 1a media — **parked** on operator's GIF + still. 1b payments — own discussion. |
| 2 | Hover echo + flyout missing outside Missal; context-menu defects | **Planned (SR.1–SR.7).** Same defect as #10; #11 rides the same menu. |
| 3 | Sidebar hamburger + icon-rail overflow | **Specified below.** |
| 4 | Liturgibot, subgraph, Bookstore, NO analysis | Liturgibot settled · subgraph gated on P3 · **Bookstore blocked on Stitch screens** · NO analysis **deferred**. |
| 5 | Omnisearch bar | **Open** — channel-cost question below. |
| 6 | Splash copyright year | ✅ **Done** — `e18c2ba5`. |
| 7 | MSI/MSIX error out | **In the v1.27 deliverable** (superseded 2026-08-02; BUGS file updated). Never once succeeded. |
| 8 | Chatbot | Placement settled; **inference stack decided** below. |
| 9 | Subway map re-scope per view | **Deferred.** |
| 10 | Dual-barrelled highlight only in Mass | **Same as #2.** |
| 11 | Context-menu "Highlight" + index | **SR.7.** |
| 12 | Journaling | **Deferred** — depends on P2. |
| 13 | **NEW — rubric/translation parity** | Root-caused; see below. |

---

## #1a — Origin Story (prose ready, media parked)

`src/content/about.ts` ships a **fabricated** origin — "St. Android of the
Circuits, the patron saint of technology". Unattributable and live now.

**`content/origin-story.md`** (new, **tracked — not gitignored**), containing
the operator's draft **from "A project originally borne of necessity,"** to
"…in the same relative places as in the modern 'Novus Ordo' Mass". Two
exclusions:

- The opening third-person paragraph ("Originally launched as 'Hello, Word,' …
  serving millions of users worldwide") — **injected text**, most likely an
  aggressive IDE autocomplete. Verified to exist **nowhere else**: not in
  tracked source, not on helloword.robin.mba, never committed (`git log -S`
  across all branches is empty). Tracking the file makes any future injection
  appear as a diff.
- The trailing `(To be continued…)` marker — authoring scaffolding.

**`src/content/about.ts`** — `origin` becomes
`import story from '../../content/origin-story.md?raw'`. Tracked file makes the
direct import correct, and a missing file then **fails the build** — the
loudest possible flag, and it makes a fabricated fallback impossible by
construction.

**`src/ui/AboutView.tsx`** — render it; no placeholder branch anywhere. Also
fix the splitter: `ABOUT_CONTENT.origin.split('\n')` splits on every newline, so
blank lines emit empty `<p>`s. Split on blank lines.

**`.env` is NOT touched.** The `ORIGIN_STORY` block stays.

### Media (parked on operator)

Layout: **GIF far right**, **photo lower-left**, prose wrapping both.

The GIF **links out**; no `<iframe>`. An embed would be the app's first
third-party request, would need a `youtube.com` CSP hole in `tauri.conf.json`,
and would falsify the Privacy section's "does not transmit any data to external
servers" on the About page itself.

Video resolved from helloword.robin.mba's `SITE_CONFIG` (JS-concatenated, which
is why two extraction passes missed it):

```js
youtubeVideoId: 'YAgsf998UMc',   youtubeStartSec: 5,
```

→ `https://www.youtube.com/watch?v=YAgsf998UMc`, current still
`https://img.youtube.com/vi/YAgsf998UMc/hqdefault.jpg`, caption "Robin serves
the *Missa Lecta* — 2013". `start=5` hints the GIF window.
*(Correction on record: the `src="about:blank"` there is not a broken image —
it is the lazy-load lightbox iframe, set to the embed URL only on click.)*

Assets land in `content/`, **tracked**.

### Ordering rule

Nothing is removed from its original home on source changes alone. The `.env`
block and the source photo/GIF stay until there is a working APK, EXE,
AppImage, MSI and MSIX that **contain the content and have been launched**.
Source compiling is not evidence.

---

## #2 / #10 / #11 — one reader (after the baseline)

### Root cause (verified)

`OfficeView` renders through its own private `OfficeText`
(`src/ui/OfficeView.tsx:35`): bare `<span>` per line, no `data-line`, no echo
class, no handlers, hand-rolled `<div className="bilingual">`, plus a duplicate
`bangLineClass` already at `src/ui/BilingualText.tsx:24`. Never mounted in
Breviary.

Rendering primitives are correct and shared. In `TextLines`
(`BilingualText.tsx:118`) a line beginning with `!` takes an early return —
`<span className="rubric-text">` with **no `data-line`, no echo class, and no
trailing newline** — while ordinary lines get `data-line={i}`, `xlate-echo` when
hovered, and *do* emit `'\n'`. That asymmetry is why the rubric flows inline as
a red italic prefix yet cannot receive the highlight: **only the spoken sentence
lights up**, which is the entire point. Sentence granularity comes from the
corpus — DO puts each spoken sentence on its own line.

The **interaction** layer is the problem: align + callout + `Menu` +
`SelectionAction` live in `ReaderView` (`:31`, `:50`, `:75`, `:266`, `:398`,
`:442`, `:572`); `BibleView` carries a second copy (`:60`, `:128`, `:137`,
`:448`, `:607`). A third in `OfficeView` guarantees every future fix is made
three times.

`DOCS/ARCHITECTURE.md` row P-B already specifies `SectionReader`
(`src/ui/SectionReader.tsx`) as the shared renderer owning this,
"(`SelectionAction` definition moves here)". **The file does not exist.** This
completes specified-but-unbuilt architecture and satisfies P1.

### Reuse, do not rewrite

`alignPhrase`/`alignSelection`/`wordEcho`/`wordAtPoint` (`src/core/text/align.ts`
— `wordAtPoint(x, y)` at `:347` is exactly what right-click-with-no-selection
needs); `placeFloatingCallout`/`reconcileCallout`
(`src/core/ui/calloutPlacement.ts` — its non-intersection guarantee means a
callout physically cannot cover the block it belongs to);
`TextLines`/`BilingualText`/`SelectionEcho`; `annotationsFor`/`addAnnotation`/
`removeAnnotation` (`src/core/annotations/store.ts`) for #11.

### Checklist

`[ ]` not started · `[/]` in progress · `[X]` implemented · ✅ verified by running code

- `[ ]` **SR.1 Extract `SectionReader`** — `src/ui/SectionReader.tsx` (new),
  `src/ui/ReaderView.tsx` — entities `SectionReader`, `SelectionAction` (moves
  here; `ReaderView` re-exports), `ReaderEntry`. Owns bilingual rendering,
  hover echo, phrase echo, callout placement, selection menu. `ReaderView`
  migrates with **no behaviour change** — Missal is the regression baseline.
- `[ ]` **SR.2 Migrate `BibleView`** — deletes its duplicate copy.
  `BibleWordCallout` and the BX.1R `reconcileCallout` termination fix must
  survive intact.
- `[ ]` **SR.3 Migrate `OfficeView`** — removes private `OfficeText` and the
  duplicate `bangLineClass`. **Closes #2's Breviary half and #10.**
- `[ ]` **SR.4 Context-menu dismissal** — ESC and outside-click both close it.
  Today it cannot be cancelled, forcing a disruptive choice.
- `[ ]` **SR.5 Right-click targets hovered word** — reuses `wordAtPoint(x, y)`.
- `[ ]` **SR.6 Copy action** — selection when drag-selected, else hovered word.
- `[ ]` **SR.7 Highlight (#11)** — dual-pane persisted highlight through the
  existing `mark.ann` pipeline, plus a categorised index.

### Acceptance, stated as purpose not mechanism

BK.2 was marked `[X]` on "suite fail 0, tsc clean" — proxy attestation, and
`[X]` is not ✅ under the project's own contract. The redo's acceptance is:
**on a phone, during the Gospel, you can keep your place.** Anything that
doesn't do that isn't done, however green the suite.

Architect debt caused it: the task said "renders line pairs" without defining a
*line*. In the Ordo a line is a spoken sentence; a Gospel pericope is one line.
The unit definition belongs in the architecture, not left to the implementer.

---

## Responsive behaviour — one breakpoint, two changes

`useNarrow(1100)` already drives the reader. **The rail collapse must use the
same source of truth**, not a separate CSS media query, or they desync — an
icons-only rail beside a two-column reader, or the reverse.

### Below the breakpoint

**Reader: Latin only, English on tap.** Not stacked, not interleaved. This
**supersedes BK.2's interleaved mode on narrow**. Rationale: the Latin is what
is being prayed and deserves the screen; stacked columns put the English a page
and a half away, so following along means scrolling off, hunting, and losing
your place in both languages — worst for exactly the reader this is built for.

- Tap a block → English callout. **Overlay, never inline expansion** — an
  expander pushes the Latin down and you lose your place, the failure everything
  else here prevents.
- Dismiss instantly: tap off, tap the same block again, Android Back, or scroll.
- Short fade only, or it stops feeling like a glance.
- The callout cannot cover the block it belongs to — `placeFloatingCallout`
  already guarantees non-intersection.
- No English-only or English-default mode (P5).

**Rail: icons only.** Nothing renders that cannot fit the icon column.

- **Favicon at the very top** — the mark, not the words. "St. Android's Missal"
  does not render in this state.
- **Hamburger below it**, standard top-left.
- **Nav icons.**
- **Calendar emoji at the bottom** replacing the feast text; flies out into the
  main area on tap.

Expanded state keeps the hamburger plus a hold-open affordance.

*Observed in v1.25.59353 on device: the collapsed rail renders "St. Andr / Miss"
clipped across three lines at top and "me / ter / entecost / Sunday / Pent10-"
bleeding out at the bottom. Map strip labels truncate to `ORATI…`, `LECTIO…`.*

### Above the breakpoint

Two-column layout unchanged.

---

## Panel manager (P4)

Desktop: **docked by default, undockable, freely resizable windowlets.**

Foundation exists: `ResizableInspectorLayout` does the docked-split half —
pointer and keyboard separator, `role="separator"`, arrow/Home/End, width
clamped by `clampInspectorWidth`, persisted as `layout.inspectorWidth` in the
sidecar. Undocking into a free windowlet is the new part.

- **Persistence extends naturally** — dock state, position and size per panel go
  to the same sidecar settings store.
- **No floating below the breakpoint** — panels become full-area flyouts, same
  as the calendar. Undock is not offered rather than offered and broken.
- **Clamp windowlets to the app viewport**, and keep a re-dock-everything
  action; drag-half-offscreen is the classic failure.

Uniform shape for the whole adjunct family: rail icon → docked panel by default
→ undock/resize on desktop → full-area flyout on narrow.

---

## Liturgibot (#4 placement, #8 stack)

**Placement supersedes bug #8's "mostly minimized, like Intercom Chat" line** —
mark that line replaced or the bubble gets built later from the written spec. A
bottom-right bubble floats over the text, which during Mass is the one place it
must never be. It becomes a **rail icon → docked panel**, first tenant of P4.

Icon: a robot with mitre and crozier. Must survive **~24px** — silhouette only,
mitre profile plus the crook curve; design at small size and scale up.

**Inference stack decided — supersedes `CHECKLIST.md` BI.1's LiteRT-LM Gemma 4
E2B.** Vendor in **atomic.chat's turboquant llama.cpp**, using their internals
and model catalogue. Trial default: the **770 MB LFM2**. Evidence the runtime
scales: it runs **Bonsai 1-bit 27B**, well past LiteRT-LM's ceiling. Operator
tested LFM2 in atomic.chat — "hella fast, loaded invisibly, no delay." That is
the acceptance bar: a model that announces itself with a loading spinner during
Mass has failed regardless of benchmark. wllama for web per #8.

---

## #13 — rubric and translation parity

### ROOT CAUSE — the Ordinary gap is a join on the wrong key

Observed: the whole **Offertory · Lavabo · Orate fratres** block has a full
Latin column and a **completely empty English one**. The Lavabo psalm above and
the Secreta below both have English. Blank, not wrong. Also `! Gloria` renders
**literally, exclamation mark visible**, in both panes — raw corpus syntax on
screen.

`scripts/ingest-corpus.mjs:329-338` reads **both** `missa/Latin/Ordo/Ordo.txt`
and `missa/English/Ordo/Ordo.txt`, parses each with `parseOrdoFile` (`#`
headings), then:

```js
const engByName = new Map(eng.map((s) => [s.name, s]));   // :329 keyed by ENGLISH heading
for (const s of lat) {                                     // :335 iterate LATIN sections
  const e = engByName.get(s.name);                         // :336 look up by LATIN name
  const er = e ? resolveLang(…) : { text: null, filled: false };  // :338
```

DO localises the headings, so only **7 of 20** match:

| Latin | English |
|---|---|
| `# Offertorium` | `# Offertory` |
| `# Introitus` | `#Introit` |
| `# Credo` | `# Creed` |
| `# Graduale` | `# Gradual` |
| `# Lectio` | `# Lesson` |
| `#Oratio` | `# Collect` |
| `# Præfatio` | `# Preface` |
| `# Communio` | `# Communion` |
| `# Postcommunio` | `# Post Communion` |
| `# Conclusio` | `# Conclusion` |
| `# Incensatio` | `#Incense` |
| `# Preparatio Communionis` | `# Preparation for Communion` |
| `# Orationes Leonis XIII` | `# Leonine Prayers` |

Matching: `# Incipit`, `# Kyrie`, `# Evangelium` ×3, `# Canon` — exactly why
Kyrie and Canon show English and the Offertory does not. A second, quieter loss:
the loop iterates `lat` only, so any English-only section is never visited.

**Fix:** both files carry the same 20 headings in the same order and
`parseOrdoFile` suffixes duplicates deterministically, so pair by **ordinal
index**, keeping a name map as an assertion that ordinals have not drifted. **No
Route C generation is needed for the Ordinary** — the English was in the
vendored tree the whole time. Requires a re-ingest to take effect.

Confirmed against DO's own output for 2026-08-02
(`DOCS/BUGS/divinumofficium-for-sun-2aug2026.pdf`,
`divinumofficium-gloria-sun-2aug2026.png`): their English column carries the
full Gloria rubric that our render leaves blank.

### The mis-filed rubric

At the Collect, DO's English carries catechesis where the rubric translation
belongs:

- Latin: *"Postea dicit: Orémus, et Orationes, unam aut plures…"* — a directive.
- English: *"The Collects mean the collected prayers of all the faithful…"* —
  an explanation.

Not a translation pair. Operator's reading: **a data-entry error** — someone
typed a commentary into the slot that called for the directions. Not a format
limitation and not a marker to infer, so it will be **sporadic**. `!` is the
rubric marker and is already documented as overloaded
(`DOCS/CORPUS-SCHEMA.md:30`: "scripture citations … **or rubrics**"), with no
marker for commentary at all — line 14 of both files is `!`-marked, Latin bare
directive, English directive-plus-catechesis fused.

**Detection is a mismatch check, not a taxonomy:** for every paired `!` line,
does the English actually translate the Latin? Where it doesn't:

1. Supply the real English rubric, flagged `translationSupplied='en'`.
2. Relocate the mis-filed catechesis to the **walkthrough layer** — it is
   structural teaching, not commentary on the reading. `MapFlyout`'s
   `FlyoutData` already has an `about` slot; the subway map is the spine of the
   Mass and each station is a structural element. "Collects: explained" goes
   there, keyed to the station.
3. Split fused lines — directive pairs with the Latin, catechetical tail goes to
   the station.

That is the meet-and-exceed: DO has the material but files it as rubric, so it
reads as clutter inline. We render the rubric where a rubric belongs and their
teaching where someone with "Mass panic" would look for it.

### Remaining genuinely-missing material

No portion lacks *both* languages, so there is always one side to work from.
Routes already recorded in `DOCS/MISSING-REFERENCES.md` (§1: **166 distinct,
307 occurrences**; A=5, B=0, C=161 under v2 heuristics that the register itself
flags as inflated):

- **Route S — scriptural.** Citation derivable → look up the counterpart from
  vendored PD sources (Clementine Vulgate, Douay-Rheims). Self-healing: because
  the corpus is a database, this re-resolves on every ingest.
- **Route A — DO-internal.** Text existing elsewhere in the tree → substitute;
  in-style cross-translation where a language is missing.
- **Route C — Ordinary/euchology.** The Mass is not officially said in English,
  so no authoritative English is displaced; author in-style under our licence.

**Non-negotiable:** every supplied side flagged `meta.translationSupplied`
(`'en'`/`'la'`) and rendered through `--supplied-ink`/`--supplied-bg` with a
provenance affordance. Both specified in §3 of the register; **neither
implemented**. At this volume the English becomes substantially *our* work, so
the provenance boundary is the trust mechanism, not bookkeeping — and the
About/licensing text will need to say so accurately.

### Renderer must know what it is rendering

Today the renderer gets two opaque strings and splits on `\n` at display time.
It cannot tell a versicle/response pair from a spoken sentence from a rubric
from a pericope, so it cannot make a responsive decision — responsiveness here
is about *what the thing is*, not width. A V/R pair stays together at any size;
a pericope breaks at sentences; a rubric never pairs.

So the unit handed to the renderer must be **structured segments with pairing
already established**, produced once at ingest (consistent with P3), leaving the
runtime to lay out what it is told.

**Sequencing:** regenerates `assets/missal.db` (193 MB LFS). `BA.2R` already
owns "the single `assets/missal.db` re-ingest" for this wave — this rides with
it. Renovation-phase, not baseline.

---

## #5 — omnisearch (open)

*"An overall omnisearch bar that categorizes ajax-style results as you type, by
semantic, graph, parts of Mass, readings, etc."*

Retrieval mostly exists: FTS5 over `search`, `normalizeText()` on every query
path, and `CorpusDb.conceptsForText()`, `sectionsByConcept()`,
`groupedConcordance()`, `groupedSimilarToText()`, with `MeaningPanel` rendering
concept-grouped results and `organizeResultsByCanon` for canonical Bible order.
Missing: the single entry point that fans out and categorises live.

**Constraint:** channels differ wildly in cost. FTS5 prefix matching is fine per
keystroke. The vector channel is a brute-force scan over **84,954 embeddings**
in sql.js WASM — not viable per keystroke on a phone, and worse if trigrams are
replaced by real sentence embeddings.

**Proposed, undecided:** lexical and parts-of-Mass respond per keystroke;
semantic and graph fill in after a debounce, so the panel populates
progressively rather than blocking on the slowest channel. Categories to be
confirmed.

---

## Icon / favicon

Current `public/icon.png` is the St. Lawrence Christmas photograph. Three
compounding problems:

- **Letterboxed, not cropped** — white bands top and bottom, so content occupies
  ~⅔ of the height before anything else happens; platform masking (Android
  adaptive icons crop to circle/squircle with a safe zone) then eats further in.
  That is the cut-off top: clipped twice.
- **Cross centred horizontally but low vertically**, so a circular mask takes
  the arch and the cross's upper arm together.
- **At rail size the photograph fights itself** — the two lit trees are the
  brightest elements, so at 24px they survive as white blobs while the dark
  cross vanishes against the dark altar.

**Resolution: two assets, one identity.** Keep the photograph where it has room
— splash, store listing, About. Derive a **mark** for small contexts, cropped
tight and centred on the cross so a cross silhouette is what reads at 24px.
Android wants an adaptive icon (foreground layer with safe zone, separate
background) regardless, so the split is the format the platform already expects.

---

## v1.27 baseline (do first)

Purpose: a last known-good artifact set to fall back to before significant
renovation, plus the **first ever working MSI and MSIX**.

- **Minimal change surface.** Only #1a content rides along. No build-system
  edits, no refactors, nothing opportunistic.
- **Pipeline runs unmodified** — it stamps first, so 1.26 → 1.27.x naturally.
  No pre-bump, no contract churn inside the baseline.
- **Windows-side only**; never WSL.
- **Root-cause the installers before rebuilding** — they built at v1.25 and
  errored on use, so this is not a compile failure. Inspect
  `scripts/build-windows.sh`, `scripts/build-windows-msix.sh`,
  `Package.appxmanifest`, `src-tauri/tauri.conf.json` bundle block. Suspects:
  MSIX publisher identity vs. the `devcert.pfx` subject, that cert not trusted
  in the local machine store, WebView2 bootstrapper policy, and the ~200 MB
  standalone EXE from `include_bytes!` of the 193 MB corpus.
- **Acceptance is installation.** Per installer: install (`msiexec /i /qn` with
  verbose log; `Add-AppxPackage`), launch, confirm splash version and © 2026
  **and that the corpus loads**, then uninstall. v1.25 staged both without ever
  installing either — that is the defect.
- **Tag the commit** so the restore point is addressable by name; set the
  manifest's CC8 status honestly — `stable` only if the installers genuinely
  passed, else `tester` with `working_status` naming the failure.
- `src-tauri/gen/android/keystore.properties` is absent from the canonical
  checkout and needed for Android signing.

---

## Deferred: move the version bump to the last step of a successful build

**Not in this build** — changing the release driver's stamp ordering inside the
one artifact set that must be trustworthy adds risk exactly where it is least
affordable.

Semantics: `version.txt`/`version.json` name the version the current source
*will produce*, not the version last built; `dist/manifest.json` answers what
was last built. Operator's framing: the instant a byte changes, the tree is no
longer the codebase that produced the last release, so the version must move —
and bump-on-successful-build is the implementation that needs no tree-hash
bookkeeping.

Order matters — archive the lock to `dist/rubric-runs/`, **delete
`release.lock`, then** stamp. The lock freezes MAJOR/MINOR/BUILD, so a stamp
taken while it exists re-stamps the identical version and never increments.

Inverts a tested, documented contract: `tests/releaseState.test.ts` asserts
`run-command.log` reads `stamp` **first** and exactly once, in
`['stamp','test','web','linux','windows','android-debug','android-release','symbols','collect']`,
and `DOCS/ARCHITECTURE.md` §9.10 records that order verbatim as the BT.2R3
two-spawn idempotency proof. Both update in the same pass.

---

## Tooling notes

- **Stitch MCP added** at user scope (`claude mcp add --transport http --scope
  user stitch https://stitch.googleapis.com/mcp --header "…"`). Name and URL
  must precede `--header`, which is variadic and otherwise swallows the URL.
  **Requires a session restart to connect.**
- `DOCS/BUGS/BUGS-v.1.25-31jul2026.md` preamble updated: front-end/UI generated
  through the **Stitch** MCP, not Open Design (which is failing `ENOENT`).
- `LIBS/UI/STITCH/` does not exist — no frozen design artifacts in-repo yet.
- Bookstore work is blocked until the screens are fetched and frozen there.
