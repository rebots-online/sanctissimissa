# §L partial — Three-part corpus: text at install, graph and vectors fast-follow (2026-11-06)

Authorized by: operator 2026-11-06 ("fast follow corpus then"; "if we keep it as three separate files" → chose **Split; text at
install**). Siblings amended: `L-content-modules-search-20261106.md` (§2.3 module attach, §3.1 build), `L-release-20261106.md`
(§2.6 vendoring, `inputHashes`), `L-native-embed-engine-20261106.md` (pack plugin pattern, mirror fallback).

## 1. Problem (measured, `corpus-2026.11.07-0400-q3e256` base asset, 314,572,800 B; gzip ≈ 100.5 MB)

- `src-tauri/src/lib.rs:10` compiles the whole corpus into every native binary (`include_bytes!("../../assets/missal.db")`).
  On Android the corpus therefore sits inside `libapp_lib.so` in the **base module** (Play limit 500 MB compressed; ≈ 100 MB
  today, so it fits, but every corpus growth such as the 61 works and the reranker/voice assets eats the same budget). The whole
  install is one download larger than the **200 MB mobile-data dialog threshold** (a warning, not a limit), and nothing can
  open until all of it is installed. Limits: `DOCS/sdk/play-asset-delivery/size-limits.md` (500 MB base, 1.5 GB per asset pack,
  4 GB base + install-time cumulative, 30 GB fast-follow + on-demand cumulative).
- Per-table size (`dbstat`, MB): edges 61.5 + idx_edges_dst 26.7 + idx_edges_src 26.5 (graph ≈ 115); text_blocks 50.1 +
  search_content 47.0 + search_data 39.2 + nodes 7.4 + node indexes 4.5 + small tables (text ≈ 150); embeddings 23.8 (vectors);
  dead weight never read by `src/`: embeddings_trigram 11.8, edges_trigram_archive 0.1, embed_work/embed_progress/similar_done.

## 2. Decision

The shipped base corpus is **three SQLite files of one `corpus_version`**, split from the BA.10 base asset by a build step:

| Part (Closed set, Phase L) | Tables carrying rows | Android delivery | Needed for |
|---|---|---|---|
| `text` | every table of the base asset **except** the ones listed for graph/vectors and the dropped set; `edges` and `embeddings` exist **empty** with their original schema and indexes | install-time asset pack `corpus_text` | Mass, Office, calendar, reader, FTS search: app is fully usable on this part alone |
| `graph` | `edges` (all rows) | fast-follow asset pack `corpus_graph` | concept surfacing, CITES/COMMENTS_ON navigation, SIMILAR_TO, Sacristan graph hits |
| `vectors` | `embeddings` (all rows), `embed_meta` (copy) | fast-follow asset pack `corpus_vectors` | semantic similarity, Sacristan vector hits |

Dropped from all parts (kept in the full/work files only): `embeddings_trigram`, `edges_trigram_archive`, `embed_work`,
`embed_progress`, `similar_done`. Not changed in this release (non-goal, to avoid a wide query-layer change): the FTS5 `search`
table keeps its own content copy.

Node ids are identical across the three parts (one source file), so the merge copies rows verbatim — **no key remapping**.

## 3. Formats (Closed set, Phase L)

- Every part has `corpus_meta(key,value)` with `corpus_version=<V>` and `corpus_part=text|graph|vectors`.
- The `text` part also has `corpus_parts(part TEXT PRIMARY KEY, file TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL)`
  with one row each for `graph` and `vectors`. `file` = `missal.<V>.<part>.db`.
- The `text` part keeps `embed_meta` (module attach refuses a base without it, `moduleAttach.ts:49`); the `vectors` part's
  `embed_meta` must equal it row for row.
- File names: `missal.<V>.text.db`, `missal.<V>.graph.db`, `missal.<V>.vectors.db`.

## 4. Build — `scripts/split-corpus.mjs` (new, < 300 lines)

`node scripts/split-corpus.mjs --in <base asset> --out-dir assets/corpus/` (runs after `build-modules`):
1. Refuse (exit 4) an input without complete `embed_meta` or `embed_progress.finalize`, or whose `corpus_meta.corpus_version`
   is missing. Refuse (exit 3) if any of the three output files already exists (immutable outputs; never overwrite).
2. `graph`: new DB; `CREATE TABLE edges` with the input's column list **without** the `REFERENCES` clauses; copy all rows;
   create `idx_edges_src`, `idx_edges_dst` as in the input; write `corpus_meta`; `VACUUM`.
3. `vectors`: same for `embeddings` (no FK) and a copy of `embed_meta`; `corpus_meta`; `VACUUM`.
4. `text`: `VACUUM INTO` a copy of the input; in it `DELETE FROM edges`, `DELETE FROM embeddings`, `DROP TABLE` the dropped set,
   write `corpus_meta.corpus_part=text`, create and fill `corpus_parts` from the sha256 and size of the files of steps 2–3; `VACUUM`.
5. Print one JSON line `{corpusVersion, parts:{text|graph|vectors:{file,sha256,bytes}}}`; exit codes 0/3/4 (Closed set, Phase L).
Accept: row counts of `edges`/`embeddings` in graph/vectors equal the input's; text part has 0 rows in both; sum of the three
sizes < input size.

## 5. Delivery per platform

- **Android (AAB).** Three asset-pack Gradle modules under `src-tauri/gen/android/`: `corpus_text` (`install-time`),
  `corpus_graph` and `corpus_vectors` (`fast-follow`), each with `src/main/assets/corpus/missal.<V>.<part>.db`; added to
  `assetPacks` in `app/build.gradle.kts` and to `settings.gradle`. Staged by `scripts/stage-corpus-packs.mjs` (new; mirrors
  `stage-model-packs.mjs`) from `VENDORED/corpus/`. See `DOCS/sdk/play-asset-delivery/integrate-java.md` §Install-time
  delivery (AssetManager), §Fast-follow and on-demand delivery.
  - `CorpusPackPlugin.kt` (new; same shape as `ModelPackPlugin.kt`): `readText()` returns the text part bytes via
    `createPackageContext(packageName,0).assets.open("corpus/<file>")`; `location(part)`, `fetch(part)`, `state(part)`,
    `confirmCellular(part)` for the fast-follow packs. **Every launch** calls `location`; if null, `fetch` (resumes a
    cancelled/paused fast-follow). `WAITING_FOR_WIFI` → status `waiting-wifi`, surfaced, `confirmCellular` on user action only.
  - Sideloaded/universal APK where a pack is unavailable (`location` null and `fetch` fails or status `unknown`/`not-installed`
    after fetch): mirror `https://sanctissimissa.robin.mba/runtime/corpus/<V>/<file>`, verified against `corpus_parts.sha256`
    before use (same rule as model packs' `mirror_url`).
- **Desktop (Linux, Windows).** `include_bytes!` is removed. The three files are Tauri bundle resources (`bundle.resources`
  `corpus/*.db` in `tauri.conf.json`); Rust command `load_corpus_part(part) -> ipc::Response` reads
  `resource_dir()/corpus/missal.<V>.<part>.db` (V from a generated `src-tauri/corpus-version.txt`). `load_corpus` is removed.
- **Web/PWA.** `scripts/sync-db.mjs` is replaced by `scripts/sync-corpus.mjs` copying the three parts to
  `public/corpus/<V>/`; fetched as `/corpus/<V>/<part>.db`. All three use a CacheFirst runtime route (not precache — size);
  `<V>` is injected at build time as `import.meta.env.VITE_CORPUS_VERSION`.

## 6. Runtime

1. Boot: `loadCorpusPart('text')` → `CorpusDb` opens → first render. Nothing waits for graph/vectors.
2. Then, in background, `graph` and `vectors` independently: obtain bytes (platform path above) → `corpus.attachPart(part, bytes)`.
3. `attachPart` (`src/core/data/corpusParts.ts`, new): open the part with sql.js; refuse (status `error`, reason
   `version-mismatch`) unless its `corpus_meta.corpus_version` equals the text part's and `corpus_part` equals `part`; for
   `vectors` also refuse on `embed_meta` mismatch; copy rows into the base table in one transaction (batches of 5,000 via
   prepared `INSERT`); then `this.vectors = null` (vectors) so the similarity cache rebuilds. A part attaches once (second call
   → `already-attached`). Module attach (Catena) is independent of part order: module edges/embeddings carry module-allocated ids.
4. State: `CorpusPartStatus = 'absent'|'downloading'|'waiting-wifi'|'attaching'|'ready'|'error'` (Closed set, Phase L);
   `corpusParts(): {graph: CorpusPartStatus, vectors: CorpusPartStatus}` with `subscribeCorpusParts(fn)`.
5. Consumers degrade, never fake: `searchMode` is lexical while `vectors !== 'ready'` (existing fallback); `graphNeighbours`
   returns `[]` while `graph !== 'ready'`; `sacristanContext` therefore carries only what exists. Diagnostics event
   `corpus part` `{part, status, ms, bytes}` per transition.
6. UI: Settings › Search models section gets one row "Corpus graph & vectors" showing the two statuses; `waiting-wifi` shows a
   "Download on mobile data" button calling `confirmCellular`. No modal, no blocking screen.

## 7. Release amendments

- `L-release` §2.6: `VENDORED/corpus/sanctissimissa-<V>-<part>.db` (three files, immutable) replace the single base file;
  `CURRENT.json` gains `parts:{text,graph,vectors:{file,sha256,bytes}}`. `assets/missal.db` and its `inputHashes` entry are
  retired (no `include_bytes!`); `inputHashes` lists the three part files instead.
- The runtime host upload (OP.3) adds `/runtime/corpus/<V>/<file>` for the Android mirror fallback.

## 8. Entity table

| Entity | Type | File (target) | Signature / fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance (observable) | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| `split-corpus.mjs` | script | `scripts/split-corpus.mjs` | §4 CLI, exit 0/3/4 | exit codes, Phase L | operator 2026-11-06 | CS.1 | §4 Accept on `corpus-2026.11.07-0400-q3e256` | — |
| `corpus_meta.corpus_part`, `corpus_parts` | tables | all parts / text part | §3 | parts Closed, Phase L | §3 | CS.1, CS.3 | `sqlite3` shows the rows; sha256 matches files | — |
| `corpus_text`, `corpus_graph`, `corpus_vectors` | Gradle asset packs | `src-tauri/gen/android/<pack>/build.gradle.kts` | install-time / fast-follow / fast-follow | pack names Closed, Phase L | §5 | CS.2 | `bundletool dump manifest --module <pack>` shows the delivery type; base APK has no corpus `.db` | `DOCS/sdk/play-asset-delivery/integrate-java.md` |
| `stage-corpus-packs.mjs` | script | `scripts/stage-corpus-packs.mjs` | copies `VENDORED/corpus/*` into pack assets | — | §5 | CS.2 | packs contain the three files with matching sha256 | — |
| `CorpusPackPlugin` + `corpus_pack.rs` | Kotlin/Rust | `…/CorpusPackPlugin.kt`, `src-tauri/src/corpus_pack.rs` | `readText`, `location`, `fetch`, `state`, `confirmCellular` | statuses as ModelPackPlugin | §5 | CS.2 | internal-track install: text opens offline at first launch; graph/vectors reach `ready` | `DOCS/sdk/play-asset-delivery/integrate-java.md`, `DOCS/sdk/tauri-plugins-ipc/` |
| `load_corpus_part` | Tauri command | `src-tauri/src/lib.rs` | `(part: String) -> ipc::Response` | parts Closed | §5 | CS.2 | Linux/Windows binaries < 100 MB; app reads parts from resources | `DOCS/sdk/tauri-plugins-ipc/` |
| `loadCorpusPart` | function | `src/core/data/loadCorpus.ts` | `(part: CorpusPart) => Promise<Uint8Array>` | `CorpusPart` Closed | §5 | CS.3 | web fetches `/corpus/<V>/<part>.db`; Tauri invokes per platform | — |
| `CorpusDb.attachPart`, `corpusParts`, `subscribeCorpusParts`, `CorpusPartStatus` | method/functions/type | `src/core/data/corpusParts.ts`, `corpusDb.ts` | §6 | statuses Closed, Phase L | §6 | CS.3 | first render before graph/vectors; after attach, edge/embedding counts equal the parts' | — |
| Search/graph degradation | behaviour | `src/core/vector/search.ts` | §6.5 | — | §6 | CS.3 | with graph/vectors absent: FTS results, no concept card errors; after ready: semantic | — |
| "Corpus graph & vectors" row | UI | Settings › Search models | §6.6 | — | §6 | CS.3 | statuses shown; `waiting-wifi` button works | — |
| `sync-corpus.mjs`, `VITE_CORPUS_VERSION`, CacheFirst route | build | `scripts/sync-corpus.mjs`, `vite.config.ts` | §5 web | — | §5 | CS.3 | offline reload after warm-up opens text and both parts | — |
| Release vendoring of parts | release | `scripts/release-inputs.mjs`, `L-release` §2.6 | §7 | — | §7 | CS.4 | `VENDORED/corpus/CURRENT.json` lists three parts; no `assets/missal.db` input | — |
