# §L partial — Audiobook (L.6) · 2026-11-06

Binding partial of `DOCS/ARCHITECTURE.md` §L (L.6); architecture only. Ratified under R1 (operator, 2026-11-06). Value principle R2: the audiobook is part of the paid
`catena-aurea-en` edition. Runtime bytes follow R3. Verification is the `DOCS/TEST_RUBRIC.md` gauntlet
on stamped release artifacts. There are no unit tests (W13).

Sibling partials (same wave): `L-content-modules-search-20261106.md` (module keys, `modules.json`,
`ModuleInstaller`), `L-native-embed-engine-20261106.md` (runtime-asset manifest, `ModelPreloader`),
`L-bookstore-ui-20261106.md` (MyBooksPanel, LibraryReader, card and concept-card content). Where a
sibling owns a format, this partial names the exact field it consumes.

## 1. Scope

**Findings resolved:** - **#12.** This partial adds `Voice.synthesize`, records the K.4 pipeline supersession for audiobooks,
  and names the owning tasks.
- **#6 (part).** It defines the chapterKey consumption grammar, the Evangelist map and the
  ChunkStore `<revision>`.
- **#22 (part).** Voice state, rate, network cost, download group, audio owner and the Media Session
  action set are closed, and each carries a marker.
- **#23 (part).** It binds every selector in the TTS export dock and assigns new stable ids.
- **#26 (audiobook partial).** Every entity row has an observable acceptance.
- **#25.** No audiobook entity goes into a file over 500 lines.
- **#3 (voice bytes).** Supertonic bytes come from the R3 origin and never from `public/`.

**§2 entities resolved:**
- `Voice.synthesize`
- Media Session handler map
- IndexedDB `sanctissimissa.audiobook.v1`/`chunks`
- sidecar keys `audiobook.position.<editionId>`, `audiobook.rate`, `downloads.metered.<group>`
- the chapterKey grammar and Evangelist map, as consumed here
- TTS dock selectors `#supertonic-tts-dock`, `#tts-play-toggle`, `.karaoke-vernacular`,
  `.karaoke-word-active`, `.tts-track-scrub`, `.tts-track-progress`
- new ids for the speed select, render-ahead status span and concept card
- the metered-consent gate shared with `ModelPreloader`

**Code facts this rests on (CodeGraph, 2026-11-06):**
- `src/core/voice/` does **not exist yet**. TT.1–TT.3 are unchecked (`CHECKLIST.md:2781-2795`), so
  `voice.ts` is created by TT.1 with the amended contract below. Nothing is retrofitted.
- `CorpusDb.commentaryFor(book, ch)` (`src/core/data/corpusDb.ts:423-464`):
  - returns the chapter's `kind='commentary'` blocks;
  - follows `COMMENTS_ON` edges to `verse:<Book>/<ch>/%`;
  - parses source and verseStart from `commentary:<source>/<Book>/<ch>/<verseStart>`;
  - sorts by source, then verseStart.
  - `getBooks()` (`:300`) gives chapter counts.
  - corpusDb.ts has 989 lines. **Nothing is added to it.**
- Catena keys are written at `scripts/ingest-commentary.mjs:214`. Book codes come from
  `CATENA_DIRS` (`:94`): `Matt|Marc|Luc|Joann`, which equal the `BOOK_MAP` keys
  (`scripts/ingest-bible.mjs:93-96`).
- Sidecar settings: `SidecarDb.getSetting/setSetting` (`src/core/accompaniment/store.ts:435-447`),
  then `persist()` (`:221`).
- Downloads: `DownloadManager.acquire(asset, sourceUrl)` (`src/core/model-store/download-manager.ts:73`)
  over the content-addressed `models/sha256/<digest>` library (`src/core/model-store/store.ts:272-336`).
  The factory is `makeDownloadManager` (`src/core/chat/models.ts:103`).
- Diagnostics: `debugEvent` (`src/core/diagnostics/store.ts:60`); `isTauri()` (`src/core/data/loadCorpus.ts:13`).
- Dependencies `onnxruntime-web ^1.31.1` and `phonemizer ^1.2.1` are already in `package.json:45-46`.
- The export dock has **no CSS rules**. The `<style>` block at lines 11–798 contains no `.tts-*` or
  `.karaoke-*` rule, and the PNG shows it unstyled. Styles are therefore authored (E10).

## 2. Formats and closed sets

```ts
// src/core/voice/voice.ts (TT.1) — §K.4 contract, amended (additive)
export type VoiceBackend = 'webgpu' | 'wasm';                         // Closed set, Phase K
export type SynthPriority = 'interactive' | 'background';             // Closed set, Phase L
export interface SynthesizedAudio { pcm: Float32Array; sampleRate: number; durationSec: number }
export interface Voice {
  backend: VoiceBackend;
  speak(text: string, opts: { signal?: AbortSignal }): Promise<void>;  // K.4, unchanged
  synthesize(text: string, opts: { signal?: AbortSignal; priority?: SynthPriority }): Promise<SynthesizedAudio>;
  stop(): void;
  dispose(): Promise<void>;
}
```

**`synthesize` contract:**
- **Input.** Exactly one sentence, as produced by §2.4. It is phonemized as a whole sentence with
  punctuation retained (K.4 discipline).
- **Output.** Mono PCM in [-1, 1] at the engine's native rate.
  - `sampleRate` is read from the Supertonic config. It is never a literal.
  - `durationSec = pcm.length / sampleRate`.
- **No side effects on playback.** It never touches an AudioContext and never plays.
- **Abort.** When `signal` aborts, it rejects with `DOMException('AbortError')` and frees its pool slot.
- **Priority.** `priority` defaults to `'background'`. `speak()` uses `'interactive'` internally. The
  pool always dequeues interactive jobs first.
- **Concurrency.** Concurrent calls are safe. They are served by `SynthesisPool`
  (`src/core/voice/pool.ts`, TT.2): `synthWorkers` dedicated Web Workers, each owning its own ORT
  session set.

**`calibrate()` (TT.2) result is amended to:**

```ts
{
  backend,
  threads,                                   // = min(hardwareConcurrency − 1, 8), ≥ 1 (unchanged)
  synthWorkers: backend === 'webgpu'
    ? 1
    : clamp(min(threads, 4, memCap), 1, 4),
  ortThreadsPerWorker: crossOriginIsolated
    ? max(1, floor(threads / synthWorkers))
    : 1,
}
// memCap = navigator.deviceMemory ? max(1, floor(navigator.deviceMemory / 2)) : 2
```

### 2.1 Audiobook constants (`src/core/audiobook/constants.ts`)

| Name | Value | Marker |
|---|---|---|
| `AUDIOBOOK_EDITIONS` | `['catena-aurea-en']` | Closed set, Phase L |
| `EDITION_SOURCE` | `{'catena-aurea-en':'catena-aurea'}` | Closed set, Phase L |
| `BOOK_ORDER` | `['Matt','Marc','Luc','Joann']` | Closed set, Phase L |
| `EVANGELIST` | `{Matt:'Matthew', Marc:'Mark', Luc:'Luke', Joann:'John'}` | Closed set, Phase L |
| `AUDIOBOOK_RATES` | `[0.85, 1, 1.2]` | Closed set, Phase L |
| `RATE_OPTIONS` | `[{value:'0.85x',rate:0.85,label:'0.85x (Liturgical Chant Pace)'},{value:'1.0x',rate:1,label:'1.0x (Standard Lectio)'},{value:'1.2x',rate:1.2,label:'1.2x (Fast Study)'}]`; labels are verbatim from the export (`:956-958`) | Closed set, Phase L |
| `SKIP_SEC` | `15` | — |
| `BUFFER_AHEAD_SEC` | `120` | — |
| `IDLE_FILL_RTF_EFF` | `0.5` | — |
| `RTF_ALPHA` / `RTF_WARMUP` | `0.3` / `3` chunks | — |
| `LONG_SENTENCE_CHARS` | `300` | — |
| `DEFAULT_SEC_PER_CHAR` | `0.065` | — |
| `CHUNK_STORE_BUDGET_BYTES` | `536870912` (512 MiB) | — |
| Sleep timer | none; the export has no sleep control | Closed set, Phase L (empty) |

```ts
type AudiobookRate = 0.85 | 1 | 1.2;                                            // Closed set, Phase L
type VoiceState = 'loading' | 'ready' | 'waiting-metered' | 'error';            // Closed set, Phase L
type NetworkCost = 'unmetered' | 'metered';                                     // Closed set, Phase L
type DownloadGroup = 'voice' | 'embed-models';                                  // Closed set, Phase L
type AudioOwner = 'audiobook' | 'sacristan' | 'reading';                        // Closed set, Phase L
type SentenceStatus = 'missing' | 'inflight' | 'stored' | 'failed';             // Closed set, Phase L
```

### 2.2 chapterKey (consumed; the sibling content-modules partial owns module keys)

```
chapterKey   := Book "/" Chapter          e.g. "Matt/5"
Book         := "Matt" | "Marc" | "Luc" | "Joann"        (BOOK_ORDER; Closed set, Phase L)
Chapter      := [1-9][0-9]?                               (no leading zero)
```

- **Order.** Books follow `BOOK_ORDER`. Within a book, chapters sort ascending by number.
- **Chapter list.** `chaptersOf(corpus, editionId)` keeps chapter `ch` of book `B`, for
  `ch ∈ 1..getBooks().find(k=B).chapters`, iff
  `commentaryFor(B, ch).some(s => sourceOf(s) === EDITION_SOURCE[editionId])`. The list is memoized
  per corpus instance and module attach.
  - Expected result for the Catena: 28 + 16 + 24 + 21 = **89**.
- **Source parsing.** `sourceOf(s)` is the regex group from `commentaryFor`'s own key parse:
  `^commentary:([^/]+)/`.
- **Keys this requires.** Module pericope nodes keep key `commentary:catena-aurea/<Book>/<ch>/<verseStart>`,
  kind `commentary`, with `COMMENTS_ON` edges to verse keys. This is the same shape as
  `ingest-commentary.mjs:214`. Quotation nodes (`kind:'quotation'`) are never read aloud: they are
  sub-spans of a pericope and would otherwise duplicate it.
- **Labels.** `chapterLabel(k) = "St. " + EVANGELIST[Book] + ", Chapter " + Chapter`;
  `locator(Book, ch, vs) = EVANGELIST[Book] + " " + ch + ":" + vs`.

### 2.3 Sidecar keys (`SidecarDb` settings; write, then `persist()`)

| Key | Value grammar | Writer |
|---|---|---|
| `audiobook.position.<editionId>` | JSON `{"chapterKey":chapterKey,"sentenceIndex":int≥0,"offsetSec":number≥0}` | the controller, at every sentence start and on pause; debounced 2 s |
| `audiobook.rate` | `"0.85"` \| `"1"` \| `"1.2"`; absent means `"1"` | `setRate` |
| `downloads.metered.<group>` | `"1"` once granted; absent means not granted. Never revoked this phase | `grantMeteredConsent` |

### 2.4 Sentence units (`chapterSentences`)

For each block of `commentaryFor(Book, ch)` filtered by source, in returned order:
- `blockIndex` counts 0.. over **all** filtered blocks, including blocks whose `english` is empty.
- Each block's English is split with `segmentSentences` (TT.1).
- Any sentence longer than `LONG_SENTENCE_CHARS` is sub-split, repeatedly:
  1. at the last `;` or `:` at or before character 300; else
  2. at the last `,` at or before 300; else
  3. at the last whitespace at or before 300.
- The TT.1 anti-drop invariant holds for the whole chapter:
  `units.map(u => u.text).join(' ')` equals the blocks' English joined by `' '`, after whitespace
  normalization.

```ts
interface AudioSentence {
  index: number;          // 0.. across the chapter
  blockIndex: number;
  blockKey: string;
  verseStart: number;
  text: string;
}
```

### 2.5 ChunkStore — IndexedDB `sanctissimissa.audiobook.v1`, version 1

```
store chunks    key "<editionId>/<revision>/<voiceKey>/<chapterKey>/<sentenceIndex>"
                value { pcm: Int16Array, sampleRate: number, durationSec: number, text: string,
                        bytes: number, chapterRef: string, createdAt: number }
                index byChapter on chapterRef
store chapters  key chapterRef = "<editionId>/<revision>/<voiceKey>/<chapterKey>"
                value { editionId, revision, voiceKey, chapterKey, sentenceCount, storedCount,
                        totalSec: number|null, bytes, lastAccess: number }
```

- **`revision`** is the integer `revision` of the installed module for `editionId`, as recorded by
  `ModuleInstaller` from `modules.json` (content-modules partial). For the Catena it is never the
  base corpus version.
- **`voiceKey`** is the first 16 hex characters of the sha256 of the voice group's asset sha256s,
  sorted ascending and joined by `"\n"`. It comes from the runtime-asset manifest (R3).
- **PCM conversion.**
  - Stored as Int16: `round(clamp(x, -1, 1) × 32767)`.
  - Read back as `x / 32767`.
  - `bytes = pcm.byteLength`.
- **A read is a miss when** the key is absent, or `value.text` is not equal to the sentence text
  derived now.
- **The store is a regenerable cache, not a source of truth.**
  - `open(editionId)` deletes chunks and chapters of that edition whose revision or voiceKey differ
    from the current ones.
  - Eviction runs when `Σ chapters.bytes > CHUNK_STORE_BUDGET_BYTES`. It removes whole chapters in
    ascending `lastAccess` order.
  - Eviction never removes the current chapter or the chapter after it.

### 2.6 Network cost and consent (`src/core/net/metered.ts`, shared with ModelPreloader)

- `networkCost()` returns `'metered'` iff `navigator.connection` exists **and** one of these holds:
  - `saveData === true`;
  - `type === 'cellular'`;
  - `effectiveType ∈ {'slow-2g','2g','3g'}`.

  Otherwise it returns `'unmetered'`. This includes the case where the API is absent, as in desktop
  WebKitGTK.
- `onNetworkCostChange(cb): () => void` subscribes to the `navigator.connection` `change` event.
- `mayDownload(sidecar, group) = networkCost() === 'unmetered' || getSetting('downloads.metered.' + group) === '1'`.
- `grantMeteredConsent(sidecar, group)` sets the key, then calls `persist()`.
- **Android.** When the manifest row's Play asset pack is delivered `install-time` or `fast-follow`,
  Play governs the network and `mayDownload` is not consulted. It is consulted only for `on-demand`
  packs and for HTTP fetches.

## 3. Flows

**F1 — Voice runtime boot** (`src/core/voice/runtime.ts`, BA.7). Order is voice first, then models.
1. After first paint (`requestIdleCallback`, falling back to `setTimeout(0)` after `load`), the
   runtime checks `mayDownload(sidecar, 'voice')`.
2. If false, voice becomes `waiting-metered`. The runtime subscribes to `onNetworkCostChange` and
   proceeds as soon as the network turns unmetered or `downloadVoice()` grants consent.
3. The runtime acquires each `voice` manifest row through `DownloadManager.acquire(asset, mirror_url)`:
   - `mirror_url` is on `https://sanctissimissa.robin.mba`, or the Android Play asset pack (R3);
   - sha256 is verified by the model store;
   - the upstream URL is provenance only and is never a fallback.

   During acquisition voice is `loading`, with `voiceProgress = Σreceived / Σtotal`.
4. It runs `createSupertonicVoice({ assets: locators, calibration })`. When this succeeds, voice is
   `ready`; on failure it is `error`.
5. `settled(): Promise<void>` resolves at the first `ready`, `error` or `waiting-metered`.
   `ModelPreloader` awaits it before it starts the embedding models (L.4 "after Supertonic").

**F2 — open(editionId, chapterKey?, sentenceIndex?).** Never starts playback.
1. Abort the queue for any other edition.
2. Resolve the position. The first available source wins:
   - the explicit arguments;
   - `audiobook.position.<editionId>`;
   - `library.progress.<editionId>` (chapter only; L.5);
   - the first `chaptersOf` entry.
3. Purge stale chunks (§2.5).
4. Build `chapterSentences` and load per-sentence status from ChunkStore.
5. Emit state, then call `RenderQueue.pump()`.

**F3 — RenderQueue.pump()** (`src/core/audiobook/queue.ts`). It runs on: open, play, pause, seek,
chunk stored, chunk failed, voice ready, and network change.
1. If voice is not `ready`, return.
2. Set `N = calibrate().synthWorkers`. Set `rtf` to the EWMA (α 0.3) of `wallSec / durationSec` per stored chunk, and `rtfEff = rtf / N`.
   Mode is **idle-fill** iff at least 3 samples exist and `rtfEff ≤ 0.5`. Otherwise it is
   **buffer**.
4. **Priority 1:** missing sentences from the playhead sentence forward to the end of the chapter,
   in order.
5. **Buffer mode.**
   - Compute `aheadSec`: the sum over the contiguous stored or inflight run starting at the playhead
     sentence, using `durationSec` for stored sentences and `text.length × secPerChar` for inflight
     ones, minus `offsetSec`.
   - While `inflight < N` and `aheadSec < 120`, dispatch the next missing sentence of that run.
   - When the chapter ends inside the window, continue into the next chapter's sentence 0.
6. **Idle-fill mode.** While `inflight < N`, dispatch the next missing sentence in this order:
   - Priority 1;
   - then the current chapter from 0 up to the playhead;
   - then each following chapter in order, stopping before any chapter whose admission would exceed
     `CHUNK_STORE_BUDGET_BYTES` after the §2.5 eviction.
7. Dispatch calls `voice.synthesize(text, { signal, priority:'background' })`.
   - **On success:** put the chunk, update the chapter row (`storedCount`, `bytes`; `totalSec` once
     `storedCount === sentenceCount`), update `rtf` and `secPerChar = Σdur / Σchars`, then call pump.
   - **On first failure:** retry once.
   - **On second failure:** mark the sentence `failed` and log `debugEvent('audiobook', 'synth-failed', …)`.
     Playback skips failed sentences.
8. After a reload, F2 reloads statuses from the store, so generation resumes at the first missing
   sentence.
9. Abort covers every inflight job (one AbortController per job) when the edition changes, when the
   controller is disposed, or when the Sacristan claims the pool. Interactive jobs pre-empt only by
   priority; they do not abort background jobs.

**F4 — Playback** (`src/core/audiobook/player.ts`).
- **Elements.** Two `HTMLAudioElement`s, A and B, are created with `preservesPitch = true` and
  `playbackRate = rate`. Each sentence is played from `URL.createObjectURL(wav(chunk))`:
  - the WAV is RIFF PCM16 mono at `sampleRate`, with a 44-byte header plus the chunk's Int16 bytes;
  - while A plays sentence i, B preloads i+1 (the next non-failed sentence);
  - on A's `ended`, play B, then load i+2 into A;
  - the object URL is revoked when that element's `ended` fires or the element is reused.
- **Buffering.** If the next sentence is missing, `buffering = true`; playback resumes when its chunk
  is stored.
- **Chapter end.** At the end of a chapter, `open(next chapterKey, 0)` runs and playback continues.
  At the end of the edition, playback pauses with `positionSec = chapterDurationSec`.
- **Clock.** `currentTime()` is the active element's `currentTime` in source seconds. Word times
  (§F6) are therefore valid at every rate.
- **Audio focus.** `claimAudio(owner: AudioOwner)` on the voice runtime pauses whichever other owner
  is playing. The Sacristan's K.4 `speak` claims `'sacristan'`, and the audiobook claims
  `'audiobook'` on play.

**F5 — Commands** (all on `AudiobookController`):
- **`skip(±15)`.** `seek(clamp(positionSec ± 15, 0, chapter end))`; never crosses a chapter.
- **`seek(sec)`.** Walk the sentences, adding `durationSec` for stored sentences and `estimateSec`
  (= `text.length × secPerChar`) otherwise, to find the sentence containing `sec`.
  - If that sentence is stored, play from `sec − start`.
  - If not, play from that sentence's start and re-pump.
- **`seekFraction(f)`** = `seek(f × (chapterDurationSec ?? estimated chapter total))`.
- **`nextBlock()`.** Go to the first sentence whose `blockIndex > current.blockIndex`. Otherwise go
  to the next chapter's sentence 0.
- **`setRate(r)`.** Sets `playbackRate` on both elements and persists `audiobook.rate`. Synthesis is
  never redone.
- **`positionSec`** = Σ(stored ? durationSec : estimateSec) over the sentences before the current one,
  plus `currentTime()`.
- **`chapterDurationSec`** = `totalSec` once the chapter is fully stored, and `null` until then.

**F6 — approxWordTimes(sentence, durationSec)** (`src/core/audiobook/timing.ts`, a pure function):
1. Tokens are the matches of `/\S+/g`, keeping `charStart` and `charEnd`. Zero tokens returns `[]`.
2. `letters(w)` = the count of `/[\p{L}\p{N}]/gu`, with a minimum of 1.
3. Compute `tail` as `w` with trailing `/[”’"')\]»]+$/` stripped. The bonus is:
   - +4 if `tail` ends with one of `. ! ? …`;
   - else +2 if it ends with one of `, ; : —`;
   - else 0.
4. Each word's weight is `letters(w) + bonus`, and `total` is the sum of all weights.
5. `start_i = durationSec × Σ_{j<i} w_j / total`. `end_i = start_{i+1}`, and the last word's end is
   `durationSec`. There is no forced alignment (W6).
6. Return `{ start, end, charStart, charEnd }[]`.
7. The active word is the last `i` with `start_i ≤ currentTime()`. It is computed in the dock's
   `requestAnimationFrame` loop, never through controller state.

**F7 — Media Session** (`src/core/audiobook/mediaSession.ts`). It runs when `'mediaSession' in navigator`.

| Action | Handler | Marker |
|---|---|---|
| `play` | `controller.play()` | Closed set, Phase L |
| `pause` | `controller.pause()` | |
| `seekbackward` | `controller.skip(-15)`; `details.seekOffset` is ignored | |
| `seekforward` | `controller.skip(+15)` | |
| `nexttrack` | `controller.nextBlock()` | |
| `previoustrack`, `seekto`, `stop` | set to `null` explicitly | |

- **Metadata** is refreshed at every chapter change:
  - `title = chapterLabel(chapterKey)`;
  - `artist` = the catalogue edition `author`;
  - `album` = the catalogue edition `title`;
  - `artwork` = the catalogue cover asset when one exists, otherwise `[]`.
- **`playbackState`** ∈ `'playing'|'paused'|'none'`; **`setPositionState({ duration, playbackRate, position })`** only while `chapterDurationSec !== null`.
- **Platform reach.** System UI appears where the platform surfaces it: web and PWA on Chrome,
  and WebView2 on Windows (SMTC). Where it does not (Android System WebView, WebKitGTK), the handlers
  are still registered and observable in devtools. A native media notification is not in this
  phase's scope.

## 4. AudiobookDock bindings (`src/ui/library/AudiobookDock.tsx`; export `original/library-tts-karaoke-studio.html:895-962`)

**Mounting:** in `MyBooksPanel` directly before `#download-manager` (export order), and in
`LibraryReader` above `#book-reader-host`.
- The dock renders iff the user holds `free`, `owned` or `subscription` access to at least one
  edition in `AUDIOBOOK_EDITIONS`.
- On first mount with `state.editionId === null`, the dock calls `open(<first such edition>)`.
  It does not play.

New ids carry the marker "Closed set, Phase L"; nothing else gets a new id.

| # | Export selector / line | Binding |
|---|---|---|
| E1 | `#supertonic-tts-dock.tts-dock-banner` `:895` | Root. `role="region"`. `aria-label` is verbatim. Class `is-playing` while `playing && !buffering`. |
| E2 | `.tts-wave-anim` / five `.tts-wave-bar` `:898-903` | Decorative (`aria-hidden`). Bars animate only under `#supertonic-tts-dock.is-playing`. Under `prefers-reduced-motion` they stay static. |
| E3 | Label span "Supertonic Neural Voice Synthesis" `:907` | Static copy, kept. |
| E4 | Render-ahead span `:909` → **new id `#tts-render-status`** | The status grammar in §4.1. The specimen "3 chaps cached…" never renders. |
| E5 | Title div `:911` → **new id `#tts-now-title`** | `<edition title> — <chapterLabel>`. |
| E6 | `.tts-param-tag` ×2 and the `⚙ Voice Mode` button `:917-919` | **Not mounted** (W5). |
| E7 | `.karaoke-display` header label `:925` | Static copy "Verse Synchronized Karaoke (Teleprompter)". |
| E8 | Locator span `:926` → **new id `#tts-karaoke-locator`** | `locator(Book, ch, verseStart) • Word <i+1> of <n>`. Shows only `locator` while `buffering`. |
| E9 | `.karaoke-latin` `:928` | **Not mounted** (W5). |
| E10 | `.karaoke-vernacular` `:931` | The current `AudioSentence.text`, `font-weight: 700` on the whole line. Each word is a span; the active word (F6) carries `.karaoke-word-active` (gold glow; reduced-motion: colour only). |
| E11 | `↺ 15s` `:938` → **new id `#tts-rewind`** | `skip(-15)`. `title="Rewind 15s"` is kept. |
| E12 | `#tts-play-toggle.tts-play-main` `:939` | The label grammar in §4.2. Click maps to `downloadVoice()` when voice is `waiting-metered`, and to `toggle()` otherwise. |
| E13 | `↻ 15s` `:940` → **new id `#tts-forward`** | `skip(+15)`. |
| E14 | `⏭ Next Verse` `:941` → **new id `#tts-next-block`** | `nextBlock()`. The label is verbatim. |
| E15 | `.tts-track-scrub` `:944` | Click or drag, keyboard ←/→ ±15 s. `role="slider"`, `aria-valuenow = positionSec`. Calls `seekFraction(x / width)`. |
| E16 | `.tts-track-progress` `:945` | `width = positionSec / (chapterDurationSec ?? estimate) × 100%`. |
| E17 | `.tts-ticks` spans `:948-950` → **new ids `#tts-tick-elapsed`, `#tts-tick-anchor`, `#tts-tick-length`** | Elapsed `mm:ss`. Anchor `✦ <locator of current block>`. Length `mm:ss (Chapter <ch> end)`, or `preparing…` while `chapterDurationSec === null`. |
| E18 | Speed `<label>` + `<select class="tts-param-tag">` `:954-959` → **new id `#tts-speed-select`**; label `for` it | Options are exactly `RATE_OPTIONS`. Selected = `audiobook.rate`. `onChange` calls `setRate`. |

Outside the dock, the audiobook entry points in the library export work as follows. The host cards
and the concept card belong to the bookstore-ui partial.

| # | Export selector / line | Binding |
|---|---|---|
| E19 | `section.concept-graph-card` `:982` → **new id `#concept-surfacing-card`** | The id only, assigned here. Content binding (`nucleatedSimilarToText` groups, `contextScore`%) is L.1 / bookstore-ui. The items' `🎧 Preview TTS` / `🎧 Play TTS` buttons (`:1013`, `:1032`) mount only for hits whose block belongs to an attached `AUDIOBOOK_EDITIONS` edition. Click: `open(edition, chapterKeyOf(hit), firstSentenceOf(hit block))`, then `play()`. |
| E20 | Card `🎧 Listen (TTS)` buttons (`:1100`, `:1173`, `:1209`) | Mounted only on `AUDIOBOOK_EDITIONS` cards with access. Label `🎧 Playing (TTS)` while this edition is playing. Click: `open(edition)`, `play()`, then scroll `#supertonic-tts-dock` into view (`behavior:'smooth'`; reduced motion uses `'auto'`). |
| E21 | Card `.tts-badge-offline` / `.tts-badge-sync` (`:1074`, `:1184`) | Offline badge `⚡ Audio ready offline` iff `readyThrough !== null` for that edition. Sync badge `☁ Preparing audio…` while the queue has inflight jobs for it. Neither badge renders otherwise. The specimen strings never render. |

`chapterKeyOf(nodeKey)` matches `/(Matt|Marc|Luc|Joann)\/(\d+)\/(\d+)(?:\/q\d+)?$/` and returns
`` `${m[1]}/${m[2]}` ``. A quotation key resolves to its pericope's chapter and verse.

**Styles.** `src/ui/library/audiobook.css` is new and scoped under `#supertonic-tts-dock`. It uses
the export's inline tokens:
- colours: `--gold-bright`, `--gold`, `#9cb8a5`, `#6d6252`, `#9c9182`, `#a69b8b`, `#2b231b`, `#4a3e30`;
- dock title font: `var(--serif)` 15 px / 600, colour `#fff`;
- banner: dark ground `#2b231b` with a `#4a3e30` border, which matches the select chrome.

The export has no `.tts-*` rules, so these values are the authority, with the PNG for layout order.

### 4.1 `#tts-render-status` grammar (Closed set, Phase L)

| Condition (evaluated in order) | Text |
|---|---|
| voice `waiting-metered` | `English voice not downloaded (≈<MB> MB)`, where MB = Σ voice-row `size_bytes` / 1048576 rounded to the nearest 10 |
| voice `loading`, `voiceProgress < 1` | `Downloading English voice… <round(voiceProgress × 100)>%` |
| voice `loading`, `voiceProgress === 1` | `Preparing English voice…` |
| voice `error` | `English voice could not be prepared — tap Play to retry` |
| `readyThrough !== null` | `Audio ready through <chapterLabel(readyThrough)>` |
| otherwise | `Preparing audio… <storedCount>/<sentenceCount>` (current chapter) |

`readyThrough` is the greatest chapterKey `c` such that every chapter from the current one through
`c` is fully stored. If the current chapter is incomplete, it is `null`.

### 4.2 `#tts-play-toggle` labels (Closed set, Phase L)

| State | Label |
|---|---|
| `waiting-metered` | `⬇ Download voice` |
| `error` | `▶ Play`; click calls `VoiceRuntime.retry()` |
| `playing` | `❚❚ Pause` (also while buffering) |
| otherwise | `▶ Play` |

## 5. Entity table

Every row's acceptance is checked on stamped release artifacts with the TEST_RUBRIC gauntlet. Each
check is observable, has no side effects and can be re-run. BA.9 copies these as rubric rows L.7-6a…6m.

**SDK directories.** All paths below are under `DOCS/sdk/`:
`media-session/`, plus four required but missing from the TC7 list: `onnxruntime-web-1.31/`,
`network-information/`, `html-media-element/` (`preservesPitch`, `playbackRate`), `indexeddb/`.

| Entity | Type | File:line (target) | Signature / fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance (observable) | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| `Voice.synthesize`, `SynthesizedAudio`, `SynthPriority` | interface member | `src/core/voice/voice.ts:1` (new, TT.1) | §2 | SynthPriority: Closed, Phase L | #12, §L.6, R1 | TT.1 (contract), TT.2 (impl) | After warm-up with networking disabled, the audiobook still renders new sentences. Devtools `performance` shows no fetch during synthesis. | `onnxruntime-web-1.31/` |
| `calibrate()` amendment (`synthWorkers`, `ortThreadsPerWorker`) | function | `src/core/voice/calibrate.ts:1` (TT.2) | §2 formula | — | #12, L.4 no-COOP/COEP | TT.2 | Diagnostics shows `calibrate {backend, threads, synthWorkers, ortThreadsPerWorker}` once per launch, and the values match the formula for that device. | `onnxruntime-web-1.31/` |
| `SynthesisPool` | class | `src/core/voice/pool.ts:1` (new) | `constructor(n, ortThreads, assets)`; `run(text, {signal, priority}): Promise<SynthesizedAudio>`; `abortAll()` | priority as above | #12 | TT.2 | During a Sacristan reply while the audiobook queue is busy, the reply starts speaking before the queued background jobs finish. | `onnxruntime-web-1.31/` |
| `VoiceRuntime` | module | `src/core/voice/runtime.ts:1` (new) | `status(): {voice: VoiceState, voiceProgress: number\|null, downloadMB: number}`; `subscribe(l): () => void`; `getVoice(): Promise<Voice>`; `downloadVoice(): void`; `retry(): void`; `settled(): Promise<void>`; `claimAudio(o: AudioOwner): void` | VoiceState, AudioOwner | R3, W10, §L.6 | BA.7 | Cold start on unmetered Wi-Fi: `#tts-render-status` progresses Downloading → Preparing → audio states, and the network panel shows voice bytes only from `sanctissimissa.robin.mba`. | `media-session/` (n/a); `network-information/` |
| `networkCost`, `onNetworkCostChange`, `mayDownload`, `grantMeteredConsent` | functions | `src/core/net/metered.ts:1` (new) | §2.6 | NetworkCost, DownloadGroup | W10, §L.4, §L.6 | BA.7 (consumed by ModelPreloader, BA.13/BA.14 per sibling) | With Chrome devtools set to "3G" or Data Saver on Android, a fresh install shows `English voice not downloaded (≈… MB)` and `⬇ Download voice`, and no voice or model bytes are fetched. After one tap the download starts, and the choice survives a relaunch. | `network-information/` |
| `AUDIOBOOK_EDITIONS`, `EDITION_SOURCE`, `BOOK_ORDER`, `EVANGELIST`, `RATE_OPTIONS`, constants | consts | `src/core/audiobook/constants.ts:1` (new) | §2.1 | as marked | #6, #22 | BA.7 | The dock's speed select lists exactly three options with the export labels. | — |
| `chaptersOf`, `chapterSentences`, `chapterLabel`, `locator`, `chapterKeyOf` | functions | `src/core/audiobook/text.ts:1` (new) | `chaptersOf(corpus, editionId): string[]`; `chapterSentences(corpus, editionId, chapterKey): AudioSentence[]`; §2.2, §2.4 | Book, EVANGELIST | #6, §L.5, §L.6 | BA.7 | With Catena attached: 89 chapters; the first title reads `St. Matthew, Chapter 1`; listening to a full chapter, the spoken text never skips a word visible in the reader for that chapter. | — |
| `ChunkStore` | class | `src/core/audiobook/store.ts:1` (new) | `get(key)`, `put(key, audio)`, `chapter(ref)`, `purgeStale(editionId, revision, voiceKey)`, `evict(keep: string[])`, `summary(editionId): {readyThrough}`; §2.5 | — | §L.6, R5 (cache, not source data) | BA.7 | Devtools › Application › IndexedDB `sanctissimissa.audiobook.v1` has stores `chunks` (index `byChapter`) and `chapters`, with keys of the §2.5 form; total bytes stay ≤ 512 MiB plus the current and next chapters. | `indexeddb/` |
| `RenderQueue` | class | `src/core/audiobook/queue.ts:1` (new) | `constructor({voiceRuntime, store, calibration})`; `pump()`; `setPlayhead(chapterKey, sentenceIndex, offsetSec)`; `abortAll()`; `stats(): {mode:'buffer'\|'idle-fill', rtf, rtfEff, inflight}` | mode: Closed, Phase L | #12, §L.6 | BA.7 | While playing, `Audio ready through …` advances. After a reload mid-chapter, `Preparing audio… n/N` resumes from the earlier n, not 0. Diagnostics shows `stats.mode`. | `onnxruntime-web-1.31/` |
| `AudiobookPlayer` | class | `src/core/audiobook/player.ts:1` (new) | `load(sentences, statusOf)`, `playFrom(i, offsetSec)`, `pause()`, `setRate(r)`, `currentTime(): number`, events `sentence-start`, `buffering`, `chapter-end`; F4 | — | §L.6 (supersession S3) | BA.7 | At 0.85x and 1.2x the voice keeps its pitch, and the gap between sentences is no longer than a natural pause. | `html-media-element/` |
| `AudiobookController` (+ `audiobook()` accessor, `initAudiobook({corpus, sidecar, voiceRuntime, installer})`) | class + singleton | `src/core/audiobook/controller.ts:1` (new), `src/core/audiobook/index.ts:1` (new) | `open(editionId, chapterKey?, sentenceIndex?)`, `play()`, `pause()`, `toggle()`, `skip(±15)`, `nextBlock()`, `seek(sec)`, `seekFraction(f)`, `setRate(r: AudiobookRate)`, `downloadVoice()`, `subscribe(l)`, `getState(): AudiobookState`, `currentTime()` | AudiobookRate, VoiceState | §L.6 | BA.7 | Playback continues when switching the rail to Holy Mass and back. Relaunching reopens the same chapter and sentence. | — |
| `AudiobookState` | type | `src/core/audiobook/controller.ts` | `{editionId, chapterKey, chapterLabel, blockIndex, sentenceIndex, sentenceCount, storedCount, positionSec, chapterDurationSec: number\|null, playing, buffering, rate, readyThrough: string\|null, voice: VoiceState, voiceProgress: number\|null, voiceDownloadMB: number}` (wordIndex lives in the dock's rAF, F6) | fields closed, Phase L | §L.6 | BA.7 | Rendered values in E4, E8, E12, E16 and E17 reflect it. | — |
| `approxWordTimes` | pure function | `src/core/audiobook/timing.ts:1` (new) | F6 | — | W6 (operator) | BA.7 | The `.karaoke-word-active` glow advances word by word, never runs backwards within a sentence, and reaches the last word as the sentence ends. | — |
| Media Session map | module | `src/core/audiobook/mediaSession.ts:1` (new) | `bindMediaSession(controller, catalogue): () => void`; F7 | actions: Closed, Phase L | §L.6 | BA.8 | On Chrome Android (PWA) and Windows, system media controls show `St. Matthew, Chapter N` and their play/pause/±15/next drive the dock. On every platform, `navigator.mediaSession.metadata.title` equals `#tts-now-title`'s chapter part. | `media-session/` |
| `AudiobookDock` | component | `src/ui/library/AudiobookDock.tsx:1` (new, < 300 lines) | props `{controller: AudiobookController}`; §4 | §4.1, §4.2 | #23, §L.1, §L.6, W5, W6 | BA.8 | Every E1–E18 binding is visible; no specimen string from the export renders; `.karaoke-latin`, `⚙ Voice Mode` and the param tags are absent. | — |
| New ids `#tts-render-status`, `#tts-now-title`, `#tts-karaoke-locator`, `#tts-rewind`, `#tts-forward`, `#tts-next-block`, `#tts-tick-elapsed`, `#tts-tick-anchor`, `#tts-tick-length`, `#tts-speed-select`, `#concept-surfacing-card` | DOM ids | `AudiobookDock.tsx`; `MyBooksPanel.tsx` (concept card) | §4 | Closed set, Phase L | #23 | BA.8 (dock), BA.6 (concept card) | `document.querySelectorAll` finds each id exactly once while My Books is open. | — |
| `audiobook.css` | stylesheet | `src/ui/library/audiobook.css:1` (new) | §4 styles | — | TC12, FREEZE 1 | BA.8 | The dock matches the export's order and colours; reduced motion stops the wave and the glow pulse. | — |
| E19–E21 audiobook entry points on cards and concept items | bindings | `src/ui/library/MyBooksPanel.tsx` (host: bookstore-ui partial) | §4 | — | #23, L.1 | BA.6 | `🎧 Listen (TTS)` on Catena starts audio and scrolls to the dock; Haydock shows no Listen button. | — |
| Host wiring | delegating import | `src/App.tsx` (+ ≤ 3 lines: `initAudiobook(...)` after corpus and sidecar open; `startVoiceRuntime()` after first paint) | — | — | rule 11 | BA.7 | The dock works from the first launch after install. | — |
| Sidecar keys `audiobook.position.<editionId>`, `audiobook.rate`, `downloads.metered.<group>` | settings | `settings` table via `SidecarDb` (`store.ts:435-447`) | §2.3 | grammars closed, Phase L | §L.5, W10 | BA.7 | Settings › Sync export snapshot contains the keys after listening. | — |

**No new task is needed.** All rows map to BA.6–BA.8 or to TT.1–TT.2. TT.1–TT.3 keep their Do
clauses; their Verify clauses are replaced by the acceptances here (W13).

## 6. Supersessions recorded

- **S1 — §K.4 `Voice` gains `synthesize` and `SynthPriority` (#12).** This is additive; `speak`,
  `stop` and `dispose` are unchanged.
- **S2 — RenderQueue replaces the K.4 one-ahead `SpeakingPipeline` for audiobooks only.** The
  Sacristan's replies and the reading-view glow (TT.3/TT.4) keep K.4 unchanged.
- **S3 — Playback (L.6 "uses §K.4's AudioWorklet") is superseded for audiobooks.** They use the
  pitch-preserving `HTMLAudioElement` pair in F4.
  - Precipitating issue: worklet resampling at 0.85x/1.2x shifts pitch by 15–20%, and media
    elements are what system media controls attach to.
  - The K.4 worklet remains for Sacristan replies.
- **S4 — ChunkStore format (L.6 `Float32Array`, `sampleRate:24000`).**
  - Values become Int16 with the engine's real sample rate, which halves storage.
  - The key gains `<voiceKey>`, so a voice update never replays stale audio.
  - `<revision>` = the `modules.json` revision.
- **S5 — Worker count (L.6 `N = min(calibrate().threads, 4)`) becomes `calibrate().synthWorkers`.**
  - Precipitating constraint: there is no COOP/COEP (L.4), so there is no SharedArrayBuffer and ORT
    runs single-threaded per worker. Parallelism therefore comes from workers, bounded by memory.
  - On WebGPU it is 1.
- **S6 — `rtf` is measured by RenderQueue from real chunks, not by `calibrate()`.**
- **S7 — Idle fill (L.6 "then following chapters") is bounded by `CHUNK_STORE_BUDGET_BYTES`.**
  The current and next chapters are always kept.
- **S8 — TT.2 asset origin (`VITE_VOICE_ASSETS_BASE`, default `/voice/`; `provision-voice-assets.mjs`
  into `public/voice/`) is superseded by R3.**
  - Voice rows in the runtime-asset manifest (sibling native-embed partial) are fetched through the
    model store from `https://sanctissimissa.robin.mba`, sha256-pinned, or from Play asset packs.
  - `public/voice/` is never populated. The natally.surge.sh mention in §K.4 remains engine
    provenance only.
- **S9 — TT.1–TT.3 tests/Verify clauses → §5 acceptances (W13). S10 — audiobook glow = line-bold + approximate word glow (W6).**
