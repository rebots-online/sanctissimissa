# §L partial — content modules, semantic corpus pipeline and search (2026-11-06)

Binding partial of ARCHITECTURE §L (TC13 per-domain curation). Where it is more specific than §L.4/§L.5/§L.8, this partial governs;
every place it replaces §L wording is listed in §5. Authority: R1–R5 (operator resolutions 2026-11-06), decisions 18–21, D1–D12
(`semantic-embedding-research-20261106.md`, ratified by R1). LS vocabulary (`library-study-20260913.md`) is reused:
`editionId`, `ReaderSection`, `NucleusSourceManifest`, `sanctissimissa.library.packages.v1`. Code facts are cited `file:line` from CodeGraph.

## 1. Scope

**Findings resolved** (audit `wwgs0x6ku`): #4 (corpus pipeline table, release inputs in two places), #6 (all formats this domain
owns), #7 (every `embedText` caller, async signatures, await wiring), #9 (closed by R2: Catena wholly paid), #10 (non-mutating,
versioned corpus, defined rerun semantics), #11 (module delivery: non-public, stamped, robin.mba, module-core restored),
#20 (precache exclusion; the returning-visitor row is the release partial's), #22 (Father slug/alias table, attribution grammar,
edge-rel closure), #24 (embed-corpus interruption safety), #25 (all new code retargeted out of >500-line files), #27 (BA.11
graph completed). Partially: #3 (module bytes origin; GGUF/wasm/Supertonic rows belong to the native-embed partial),
#14 (Catena `NucleusSourceManifest`; the Catena `RightsEvidence` entry and `accessFor`→`canPublishEdition` are the
bookstore-commerce partial's, per R4).

**§2 entities resolved:** `sidecar_embeddings_pending`; `modules.json` schema + writer + readers; DDL `module_meta`/`mnodes`/
`mtext`/`medges`/`memb`/`msearch`; `embed-probe.json` schema + 40-item rule; `chapterKey` grammar + Evangelist map; module
base-URL constant; module-core `Module`, `MODULE_GATES`, `attachModule(id, bytes)`; Catena `NucleusSourceManifest`;
`release-state` stages `modules-stage`/`modules-deploy` (commands; STAGE_ORDER edit is BA.9's); corpus-pipeline npm scripts;
migrated callers `similarToText`, `nucleatedSimilarToText`, `conceptsForText`, `interpretiveNucleiForText`, `bestClause`,
`companion/memory.ts`, `accompaniment/store.ts`, `JournalSidecar.tsx:276`, MeaningPanel/JournalSidecar await wiring, the
three `ingest-*.mjs`, the end state of `embed.ts`; the pre-ready selector; `migrateSidecarVectors` timing; `sacristanContext`
item type; `graphNeighbours`; Catena `quotation` node/key, `father:<slug>` + aliases, `COMMENTS_ON`.

**Not here (sibling partials):** `SemanticEmbedder`/`Reranker` implementations, `EMBED_MODEL_ASSETS`, wllama vendoring, fork pin
(native-embed-engine); `EntitlementController`, `RightsEvidence`, `entitlements.cache.v1` (bookstore-commerce); UI selectors
(bookstore-ui); `Voice.synthesize`, `ChunkStore` (audiobook); STAGE_ORDER, rpm, dist qualifiers (release, BA.9).
HomilyPlanner has **no** similarity call site (CodeGraph: no caller of any search API in `src/ui/HomilyPlanner.tsx`); it needs no wiring.

## 2. Formats and closed sets

### 2.1 Corpus files, identity and pointer (R5)

| File | Written by | Tracked | Content |
|---|---|---|---|
| `assets/missal.db` | nothing in this pipeline (read-only input forever) | gitignored (`.gitignore:13`) | today's corpus `corpus-2026.09.09-2054`, 128-d trigram |
| `build/corpus/stage1-ingest.db` | `corpus:ingest` | gitignored (`/build/`, new) | fresh ingest incl. Catena pericopes |
| `build/corpus/stage2-graph.db` | `corpus:catena-graph` | gitignored | stage1 + quotation/father nodes, PART_OF/ATTRIBUTED_TO/CITES |
| `build/corpus/embed-work.db` | `corpus:embed` (resumable) | gitignored | work copy; never shipped |
| `build/corpus/missal.<V>.full.db` | `corpus:embed` finalize | gitignored | full semantic corpus incl. Catena |
| `assets/corpus/missal.<V>.db` | `corpus:modules` | gitignored (`/assets/corpus/`, new) | **new base corpus, no Catena rows** |
| `build/modules/catena-aurea-en-r<N>.db` | `corpus:modules` | gitignored | paid module, revision N |
| `assets/corpus.current.json` | `corpus:modules` (last write) | **tracked** | pointer `{schema:1, file:"corpus/missal.<V>.db", corpusVersion:"<V>", sha256:"<hex64>"}` |
| `dist/sanctissimissa-v<APP>-corpus-<V>.db`, `dist/sanctissimissa-v<APP>-module-catena-aurea-en-r<N>.db`, `dist/sanctissimissa-v<APP>-content-manifest.json` | `modules-stage` | tracked, LFS (`dist/**/*.db`, new `.gitattributes` rule) | stamped release inputs (second place, #4) |

- `<V>` grammar: `corpus-YYYY.MM.DD-HHMM-q3e256` (UTC, assigned once when `corpus:embed` creates its work file). Existing
  `corpus-YYYY.MM.DD-HHMM` (ingest-corpus.mjs:765) stays valid for pre-semantic files. `<N>`: integer ≥ 1. `<APP>`: `version.json` `version`.
- **One resolver** `scripts/corpus-current.mjs` → `currentCorpusPath(): string` reads the pointer, verifies the file's sha256,
  throws `corpus pointer sha256 mismatch` otherwise. Consumers: `scripts/sync-db.mjs:8` (SRC), `scripts/release-state.mjs:234`
  (input-hash key becomes the resolved relative path plus `assets/corpus.current.json`), `scripts/collect-artifacts.mjs:76-87`
  (validates those two keys), `scripts/verify-calendar.mjs:45`, `scripts/db-adapter.mjs:21` default.
- Rust: `src-tauri/build.rs` reads the pointer (`serde_json` in `[build-dependencies]`), emits
  `cargo:rustc-env=SAM_CORPUS_PATH=<abs path>` and `cargo:rerun-if-changed=../assets/corpus.current.json`; `src-tauri/src/lib.rs:10`
  becomes `include_bytes!(env!("SAM_CORPUS_PATH"))`.
- Clean clone: `npm run corpus:restore` copies the pointer's file from `dist/sanctissimissa-v*-corpus-<V>.db` (LFS) into
  `assets/corpus/` after sha256 check; no host ever re-embeds to build a release (#4).
- **`corpus_meta` keys written by the pipeline** (closed set, Phase L): existing seven (ingest-corpus.mjs:765-772) plus
  `derived_from` (input corpus_version), `embed_ollama_version`, `embed_completed_at`, `modules_split` (`'catena-aurea-en'`).
- **Rollback:** the prior corpus file is never touched, so rollback = revert the commit that changed `assets/corpus.current.json`
  (and, if code must also roll back, the previous release tag). New code on a corpus without a compatible `embed_meta` runs in
  `lexical` mode permanently (§3.4) — functional, never broken.
- **`DOCS/MISSAL-DB-VERSIONS.md` entry** (prepended, existing format): heading `### <V> — semantic re-embed (Qwen3-Embedding-0.6B, 256-d) and Catena module split`;
  bullets: derived from `<input version>`; vendored DO commit; Catena moved to module `catena-aurea-en` r<N> (R2) — base no longer
  contains `commentary:catena-aurea/*`; trigram auto-concept edges archived in `edges_trigram_archive`; counts (nodes, embeddings,
  SIMILAR_TO, semantic INSTANCE_OF); rollback line above.
- **`DOCS/CORPUS-SCHEMA.md:96`** replaced by: "`embeddings(node_id, dim, vec)` — 256-d Qwen3-Embedding-0.6B, first 256 of 1024
  (Matryoshka), L2-renormalized, int8 ×127; identity in `embed_meta`. Pre-q3e256 files carry 128-d trigram." Add: tables
  `embed_meta`, `edges_trigram_archive(src_key,dst_key,rel,weight,meta)`, `embed_progress(phase,completed_at)`; rels `SIMILAR_TO`,
  `PART_OF`, `ATTRIBUTED_TO`, `CITES`; kinds `quotation`, `father` (module-only).

### 2.2 `embed_meta` (D5) — Closed set, Phase L

`CREATE TABLE embed_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);` exactly seven rows, in base corpus and every module:
`model`=`qwen3-embedding:0.6b` · `artifact_sha256`=`06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439` ·
`dim`=`256` · `quant`=`int8` · `prefix_query`=`Instruct: Given a passage of Catholic liturgy, Scripture or commentary, retrieve passages relevant to this query\nQuery:{text}`
(literal `\n` is a newline; `{text}` literal placeholder) · `prefix_doc`=`` (empty) · `norm`=`l2`.
`RUNTIME_EMBED_META` (src/core/vector/meta.ts) holds the same seven values; `compatible(a,b)` = all seven keys present and equal.

### 2.3 Module database DDL (BA.1 writes, BA.2 reads) — schema 1

```sql
CREATE TABLE module_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE embed_meta  (key TEXT PRIMARY KEY, value TEXT NOT NULL);           -- §2.2, identical rows
CREATE TABLE mnodes (key TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT, category TEXT, rank_class TEXT,
                     rank_num REAL, color TEXT, meta TEXT, ord INTEGER NOT NULL); -- ord = insertion/TOC order
CREATE TABLE mtext  (node_key TEXT PRIMARY KEY REFERENCES mnodes(key), section TEXT NOT NULL, latin TEXT, english TEXT);
CREATE TABLE medges (src_key TEXT NOT NULL, dst_key TEXT NOT NULL, rel TEXT NOT NULL, weight REAL NOT NULL DEFAULT 1.0,
                     meta TEXT, PRIMARY KEY (src_key, dst_key, rel));          -- dst_key may be a base-corpus key
CREATE TABLE memb   (node_key TEXT PRIMARY KEY REFERENCES mnodes(key), dim INTEGER NOT NULL, vec BLOB NOT NULL);
CREATE VIRTUAL TABLE msearch USING fts5(key, section, content);                -- no tokenize= option: default unicode61
                                                                               -- remove_diacritics 1, identical to base `search`
                                                                               -- (ingest-corpus.mjs:101); content = normalizeText()
```
`module_meta` keys (Closed set, Phase L): `schema_version`(`1`), `module_id`, `edition_id`, `revision`, `title`, `corpus_version`
(base `<V>` it was split from), `built_at`, `content_digest`, `source_sha256`, `nucleus_source`, `authority_kind`,
`nucleus_manifest` (JSON `NucleusSourceManifest`, §2.9), `node_count`, `edge_count`, `quotation_count`, `father_count`,
`cites_unresolved`. `content_digest` = sha256 over the canonical dump: for each table in order `embed_meta, mnodes, mtext, medges,
memb, msearch`, rows `ORDER BY` primary key (msearch by key), fields tab-joined, BLOBs hex, rows `\n`-joined; `module_meta` excluded.

**Module node set (Catena):** keys matching `^commentary:catena-aurea/`, `^catena:`, `^father:`. Module edges = every full-corpus
edge whose src or dst is in that set. Edge rels allowed in modules (Closed set, Phase L): `PART_OF`, `ATTRIBUTED_TO`, `CITES`,
`COMMENTS_ON`, `INSTANCE_OF`, `SIMILAR_TO`.

### 2.4 `modules.json` (`content/library/modules.json`, tracked; mirrored at `${MODULE_BASE_URL}/modules.json`)

```json
{ "schema": 1, "generatedAt": "<ISO>",
  "modules": [ { "moduleId": "catena-aurea-en", "editionId": "catena-aurea-en", "title": "Catena Aurea",
    "file": "catena-aurea-en-r<N>.db", "revision": <N>, "appVersion": "<version.json at build>", "corpusVersion": "<V>",
    "sizeBytes": <int>, "sha256": "<hex64 of file>", "contentDigest": "<hex64>", "entitlementId": "reference_catena-aurea-en",
    "nucleusSource": "catena-aurea", "authorityKind": "patristics", "androidPack": "module_catena_aurea_en",
    "embedMeta": { "<7 keys of §2.2>": "..." } } ] }
```
Writer: `scripts/build-modules.mjs` only. Readers: `ModuleInstaller.catalogue()` (bundled import = floor; runtime `fetch(\`${MODULE_BASE_URL}/modules.json\`,{cache:'no-store'})`
replaces an entry when its `revision` is greater). **"Newer"** = integer `revision` strictly greater than the installed record's.
`androidPack` grammar: `module_` + editionId with `-`→`_`. Module ids (Closed set, Phase L): `catena-aurea-en`.

### 2.5 Module host, naming and deploy (R3, decision 19)

- `MODULE_BASE_URL` = `import.meta.env.VITE_MODULE_BASE_URL ?? 'https://sanctissimissa.robin.mba/runtime/modules'` in
  `src/core/library/moduleHost.ts` (host file; the module core never reads it). Same URL on web, PWA, Linux, Windows, sideload APK.
  Surge stays the web-PWA deploy only; no Surge or upstream URL is ever a fallback.
- Host file names are immutable: `modules/catena-aurea-en-r<N>.db`; a new revision is a new name. `modules/modules.json` is the
  only mutable host file and is uploaded last.
- Android Play AAB: on-demand asset pack `module_catena_aurea_en` (decision 18/19, R3): Gradle module
  `src-tauri/gen/android/module_catena_aurea_en/build.gradle.kts` (`plugins { id("com.android.asset-pack") }`,
  `assetPack { packName.set("module_catena_aurea_en"); dynamicDelivery { deliveryType.set("on-demand") } }`), asset path
  `src/main/assets/modules/catena-aurea-en-r<N>.db` (copied by `modules-stage`; gitignored), app `assetPacks += listOf(":module_catena_aurea_en")`.
- **Nothing paid in `public/` or any bundle:** module DBs are never under `public/`; `vite.config.ts:39` workbox gains
  `globIgnores: ['**/modules/**', '**/*.db', '**/*.gguf', '**/vendor/wllama/**']` (#20). `public/missal.db` (free base) stays
  outside the precache as today (`globPatterns` has no `db`).
- CORS precondition (checked by `modules-deploy`): `GET ${MODULE_BASE_URL}/modules.json` answers `Access-Control-Allow-Origin: *`.

### 2.6 Catena graph (D8, R2) — keys, grammar, Father table

- Pericope (existing kind `commentary`): `commentary:catena-aurea/<Book>/<ch>/<verseStart>`; meta gains `moduleId:'catena-aurea-en'`,
  `chapterFile` (file-name chapter), `ord` (global TOC order). Heading grammar extended (ingest-commentary.mjs:130) to
  `^(\d+):(\d+)(?:[–-](\d+)(?::(\d+))?)?$`; the one cross-chapter heading `### 15:39–16:4` (matthew_chapter_16.md:18, today
  skipped) becomes chapter 15, verseStart 39, `chapterEnd` 16, verseEnd 4; COMMENTS_ON covers 15:39..last existing verse of 15
  and 16:1..16:4. Pericopes: **816** (was 815).
- Quotation: kind `quotation`, key `catena:<Book>/<ch>/<verseStart>/q<n>` (`n` 1-based ordinal of the attribution within the
  pericope), title `<Father title> on <Evangelist> <ch>:<verseStart>`, category `Catena`, meta
  `{source:'catena-aurea', moduleId:'catena-aurea-en', father:<slug>, label, locator, ordinal:n, chapterFile}`; `mtext.english` = quotation text, latin NULL.
- Father: kind `father`, key `father:<slug>`, meta `{aliases:[observed labels], class, moduleId:'catena-aurea-en'}`; no text, no vector.
- **Attribution grammar** (applied to raw Markdown after the existing nav/footer trim, ingest-commentary.mjs:123-125, before
  `cleanMarkdown`): `ATTR := "**" LABEL "**."` where LABEL matches `[^*]+?` and may span a newline; normalize LABEL by
  `\s+`→` ` then `-\s`→`-`, trim. Optional LOCATOR: if the next non-space char is `(`, the balanced-paren span (depth-counted,
  ≤ 200 chars) → `meta.locator` without outer parens, else null. Quotation text = from the end of ATTR(+LOCATOR) to the next ATTR
  or pericope end, `cleanMarkdown`ed; empty → skipped (counted). Text before the first ATTR (the lection) stays only in the pericope.
  An unknown LABEL (not in the table) fails the run (exit 4) — the table is closed.
- **CITES grammar:** `[\(\[]((?:[1-4] ?)?[A-Z][a-z]+)\.? ?(\d+):(\d+)(?:[-–](\d+))?` over quotation text; abbreviation via the
  closed map below; one edge per existing `verse:<Key>/<ch>/<v>` (range ≤ 30), deduped, weight 1.0. Unmapped/excluded → `cites_unresolved`.
  Map (Closed set, Phase L): Gen→Gen; Ex,Exod,Exodus→Ex; Lev,Levit→Lev; Num,Numb→Num; Deut→Deut; Josh,Joshua→Jos; Judges→Judic;
  1 Sam→1Reg; 1 Chron→1Par; 2 Chron→2Par; Ezra→1Esdr; Tobit→Tob; Job→Job; Prov→Prov; Eccl,Eccles,Ecc→Eccle; Cant→Cant;
  Wisd,Sap→Sap; Ecclus→Eccli; Is,Isa,Isai,Isaiah→Is; Jer,Jerem→Jer; Lam→Thren; Ez,Ezek→Ezech; Dan→Dan; Hos,Hosea→Os; Joel→Joel;
  Amos→Amos; Jonah→Jon; Mic,Micah→Mich; Hab→Hab; Hag→Agg; Zech→Zach; Mal→Mal; 1 Macc→1Mach; Matt,Mat→Matt; Mark→Marc; Luke→Luc;
  John→Joann; Acts,Act→Act; Rom→Rom; 1 Cor→1Cor; 2 Cor→2Cor; Gal→Gal; Eph,Ephes→Eph; Phil,Philip→Phil; Col,Colos,Coloss→Col;
  1 Thess,1 Thes,1 These→1Thess; 2 Thess→2Thess; 1 Tim→1Tim; 2 Tim→2Tim; Tit→Tit; Heb→Hebr; James,Jam→Jac; 1 Pet→1Petr;
  2 Pet→2Petr; 1 John→1Joann; Rev,Apoc→Apoc. **Excluded:** Ps, Psalm (Hebrew vs Vulgate numbering), 1 Kings, 2 Kings (Samuel/Kings
  ambiguity), Infra, Luck.
- **Father slug/alias table** (Closed set, Phase L; derived from all 89 files: 54 observed labels, 51 slugs, 12,708 attributions).
  `class` ∈ {father, pseudonymous, gloss, council, anonymous, medieval, other}. Titles marked † keep the source label (identity not asserted).

| slug | title | aliases (observed labels) | class |
|---|---|---|---|
| chrysostom | St. John Chrysostom | CHRYSOSTOM | father |
| augustine | St. Augustine | AUGUSTINE | father |
| bede | St. Bede the Venerable | BEDE | father |
| theophylact | Theophylact | THEOPHYLACT | medieval |
| jerome | St. Jerome | JEROME | father |
| origen | Origen | ORIGEN | father |
| ambrose | St. Ambrose | AMBROSE | father |
| gregory-the-great | St. Gregory the Great | GREGORY | father |
| pseudo-chrysostom | Pseudo-Chrysostom | PSEUDO-CHRYSOSTOM, PSEUDO- CHRYSOSTOM | pseudonymous |
| hilary | St. Hilary of Poitiers | HILARY | father |
| gloss | Glossa Ordinaria | GLOSS | gloss |
| cyril-of-alexandria | St. Cyril of Alexandria | CYRIL OF ALEXANDRIA | father |
| remigius | Remigius† | REMIGIUS | medieval |
| rabanus | Rabanus Maurus | RABANUS | medieval |
| pseudo-jerome | Pseudo-Jerome | PSEUDO-JEROME, PSEUDO- JEROME | pseudonymous |
| alcuin | Alcuin | ALCUIN | medieval |
| basil | St. Basil the Great | BASIL | father |
| greek-expositor | Greek Expositor | GREEK EXPOSITOR | anonymous |
| gregory-of-nyssa | St. Gregory of Nyssa | GREGORY OF NYSSA | father |
| eusebius | Eusebius† | EUSEBIUS | father |
| titus-bostrensis | Titus of Bostra | TITUS BOSTRENSIS | father |
| athanasius | St. Athanasius | ATHANASIUS | father |
| pseudo-augustine | Pseudo-Augustine | PSEUDO-AUGUSTINE, PSEUDO- AUGUSTINE | pseudonymous |
| leo | St. Leo the Great | LEO | father |
| chrysologus | St. Peter Chrysologus | CHRYSOLOGUS | father |
| gregory-nazianzen | St. Gregory Nazianzen | GREGORY NAZIANZEN | father |
| cyprian | St. Cyprian | CYPRIAN | father |
| damascene | St. John Damascene | DAMASCENE | father |
| maximus | Maximus† | MAXIMUS | father |
| haymo | Haymo† | HAYMO | medieval |
| isidore-of-pelusium | St. Isidore of Pelusium | ISIDORE OF PELEUSIUM | father |
| didymus | Didymus the Blind | DIDYMUS | father |
| severianus | Severian of Gabala | SEVERIANUS | father |
| epiphanius | St. Epiphanius | EPIPHANIUS | father |
| cassian | John Cassian | CASSIAN | father |
| council-of-ephesus | Council of Ephesus | THE COUNCIL OF EPHESUS | council |
| theodotus | Theodotus† | THEODOTUS | father |
| isidore | Isidore† | ISIDORE | father |
| ambrosiaster | Ambrosiaster | AMBROSIASTER | pseudonymous |
| pseudo-athanasius | Pseudo-Athanasius | PSEUDO-ATHANASIUS | pseudonymous |
| cyril-of-jerusalem | St. Cyril of Jerusalem | CYRIL OF JERUSALEM | father |
| clement-of-alexandria | Clement of Alexandria | CLEMENT OF ALEXENDRIA | father |
| dionysius-of-alexandria | St. Dionysius of Alexandria | DIONYSIUS OF ALEXANDRIA | father |
| gennadius | Gennadius† | GENNADIUS | father |
| petrus-alfonsus | Petrus Alfonsi | PETRUS ALFONSUS | medieval |
| josephus | Flavius Josephus | JOSEPHUS | other |
| nemesius | Nemesius of Emesa | NEMESIUS | father |
| anselm | St. Anselm | ANSELM | medieval |
| second-council-of-constantinople | Second Council of Constantinople | SECOND COUNCIL OF CONSTANTINOPLE | council |
| paschasius | Paschasius† | PASCHASIUS | medieval |
| lanfranc | Lanfranc | LANFRANC | medieval |

The abbreviations `Chrys.`, `Aug.`, `Gloss.` occur only inside locators (29/23/9 occurrences), never as attribution labels; they
are not aliases. `authorityKind` `patristics` is metadata/facet only, never a score input (decision 21).

### 2.7 `chapterKey`, Evangelist map, reader anchors (L.5)

`chapterKey := Book "/" chapterFile`, `Book ∈ {Matt, Marc, Luc, Joann}` (Closed set, Phase L), `chapterFile` 1..28 / 1..16 / 1..24 /
1..21 (89 chapters). TOC order: Matt, Marc, Luc, Joann, then chapter ascending; blocks within a chapter by `meta.ord`.
Evangelist map: Matt→Matthew, Marc→Mark, Luc→Luke, Joann→John. Chapter label `St. <Evangelist>, Chapter <chapterFile>`.
Anchor `book:catena-aurea-en#<Book>/<ch>/<verseStart>` (pericope heading chapter). Default open: `Matt/1`.
`moduleKeyTarget(key)` maps `commentary:catena-aurea/B/c/v` and `catena:B/c/v/qn` → `{editionId:'catena-aurea-en', anchor:'book:catena-aurea-en#B/c/v'}`; `father:*` → null.

### 2.8 `embed-probe.json` (`content/library/embed-probe.json`, tracked; written by `corpus:embed` phase `probe`)

`{ schema:1, corpusVersion:"<V>", embedMeta:{§2.2}, ollamaVersion:"<x.y.z>", items:[{ id:"d01".."d20"|"q01".."q20", role:"doc"|"query", key:"<node key>", text:"<exact string embedded, without prefix>", vec:"<base64 of 256 int8>" }] }`.
**Deterministic 40:** strata (5 each, base corpus only): Mass `section:` not `section:Horas/`; Office `section:Horas/`; `verse:`;
`commentary:haydock/`. Candidates: doc text (`latin` + `\n\n` + `english`, null parts omitted) of 200–1200 chars; order by
`sha256(key)` hex ascending; take first 5 → `d01..d20`. Query `qNN` pairs with `dNN`: the first `splitClauses` clause
(clause.ts:48) of its English (Latin if no English) of 25–200 chars; embedded with `prefix_query`.

### 2.9 Catena `NucleusSourceManifest` (decision 21; types.ts:90 shape) — in `module_meta.nucleus_manifest`

`{id:'catena-aurea', label:'Catena Aurea', authorityKind:'patristics', workDate:'1262–1264', editionDate:'1841', translationDate:'1841–1845', languages:['en'], translator:'John Henry Newman (ed.), Oxford translation', publicationPlace:'Oxford: John Henry Parker', rightsBasis:'Public domain (pre-1900); commercial use and redistribution allowed; all territories; reviewed by Robin L. M. Cheung, MBA, 2026-11-06 (R4)', provenanceUrl:'https://github.com/tj06man/catena-aurea-project/tree/d3829bbb8b31b72796073d8e8218d36179b62720', sha256:<source_sha256>, moduleId:'catena-aurea-en'}`.
`source_sha256` = sha256 of the 89 chapter files concatenated in path-sorted order.

### 2.10 Sidecar vector queue DDL (BA.14)

```sql
CREATE TABLE IF NOT EXISTS sidecar_embeddings_pending (
  ref_id TEXT PRIMARY KEY, source TEXT NOT NULL CHECK (source IN ('accompaniment','lore')),  -- Closed set, Phase L
  text TEXT NOT NULL, enqueued_at TEXT NOT NULL, embedded_at TEXT);                         -- due when embedded_at IS NULL OR < enqueued_at
```
`sidecar_embeddings` (store.ts:41) unchanged; rows with `dim=256` are semantic, `dim=128` are legacy and **ignored by every reader**.
Settings key `vector.migrated.q3e256` (ISO time) marks the one-time legacy enqueue.

### 2.11 Search types (src/core/vector/search.ts)

`type SearchMode = 'semantic' | 'lexical'` (Closed set, Phase L). `SimilarHit` (types.ts:39) gains optional `rerank?: number`.
`interface GraphNeighbour { key: string; title: string | null; rel: GraphRel; weight: number; direction: 'out' | 'in' }`;
`type GraphRel = 'SIMILAR_TO' | 'ATTRIBUTED_TO' | 'CITES' | 'COMMENTS_ON'` (Closed set, Phase L).
`interface SacristanContextItem { key: string; title: string; text: string /* english ?? latin, ≤600 chars */; source: SacristanSource; via: 'vector' | 'lexical' | 'graph'; score: number }`;
`type SacristanSource = 'missal' | 'office' | 'bible' | 'haydock' | 'catena-aurea-en'` (Closed set, Phase L) from key: `section:Horas/`→office,
other `section:`→missal, `verse:`→bible, `commentary:haydock/`→haydock, Catena keys→catena-aurea-en.
Consumed contract (owned by BA.13, `src/core/vector/embedder.ts`): `getEmbedder(): { state(): EmbedState; onState(l): () => void; embedQuery(t): Promise<Int8Array>; embedDocs(ts): Promise<Int8Array[]> }`,
`getReranker(): { state(): EmbedState; rerank(query, docs: string[]): Promise<number[]> }`, `EmbedState = 'absent'|'downloading'|'ready'|'error'`;
vectors are 256 int8 per §2.2; device doc truncation 512 tokens (ingest uses 8192; probe items fit 512).

## 3. Flows

### 3.1 Corpus pipeline (npm scripts; run when the corpus changes, never per release)

| # | npm script | Command | Input → output | Release-state stage |
|---|---|---|---|---|
| 1 | `corpus:ingest` | `CORPUS_DESC=… node --experimental-strip-types scripts/ingest-corpus.mjs build/corpus/stage1-ingest.db` | VENDORED → stage1 | none |
| 2 | `corpus:catena-graph` | `node --experimental-strip-types scripts/ingest-commentary.mjs --catena-graph build/corpus/stage1-ingest.db build/corpus/stage2-graph.db` | stage1 (read-only, `VACUUM INTO`) → stage2 | none |
| 3 | `corpus:embed` | `node --experimental-strip-types scripts/embed-corpus.mjs build/corpus/stage2-graph.db [--restart]` | stage2 → work → `missal.<V>.full.db` + probe | none |
| 4 | `corpus:modules` | `node --experimental-strip-types scripts/build-modules.mjs build/corpus/missal.<V>.full.db` | full → base + module + modules.json + pointer | none |
| 5 | `corpus:restore` | `node scripts/corpus-restore.mjs` | dist LFS copy → `assets/corpus/` | none |
| 6 | — | `modules-stage` / `modules-deploy` (§3.2) | outputs → `dist/` / robin.mba | `modules-stage`, `modules-deploy` |

Step 1 note: ingest-corpus still mirrors its output to `public/missal.db` (ingest-corpus.mjs:806-811); `prebuild`/`predev` re-sync
from the pointer (sync-db), so the mirror is transient. Step 1 is the only invocation of ingest-corpus; its argument keeps it off
`assets/missal.db` (R5). The CI/host prerequisite: Ollama with `qwen3-embedding:0.6b` (blob per §2.2) — model vendoring is the native-embed partial's.

**embed-corpus phases** (`embed_progress(phase TEXT PRIMARY KEY, completed_at TEXT NOT NULL)`; phases Closed set, Phase L:
`copy`, `vectors`, `centroids`, `instance_of`, `similar_to`, `probe`, `finalize`):
1. Preflight: `POST /api/show {model:'qwen3-embedding:0.6b'}` → `modelfile` line `^FROM (.+)$`; basename must be
   `sha256-<artifact_sha256>` and sha256 of that file must equal it; `GET /api/version` → `embed_ollama_version`. Fail → exit 2.
2. `copy`: if `build/corpus/embed-work.db` absent: `VACUUM INTO` it from the input; table `embed_work(key,value)` gets
   `input_sha256`, `corpus_version=<V>`, `started_at`. If present and `input_sha256` differs → exit 3 (message names `--restart`);
   `--restart` renames the old work file to `embed-work.<started_at>.abandoned.db` (never deleted).
3. `vectors`: `CREATE TABLE IF NOT EXISTS embeddings_q3e256(node_id INTEGER PRIMARY KEY, dim INTEGER NOT NULL, vec BLOB NOT NULL)`.
   Pending = `text_blocks` rows with non-empty latin or english and `node_id NOT IN embeddings_q3e256`, `ORDER BY node_id`. Batches
   of 32: `POST /api/embed {model, input:[docText…], truncate:true, options:{num_ctx:8192}}`; per vector take [0..256), L2
   renormalize, `round(x·127)` clamped ±127; **one transaction per batch**. Interrupt at any point → rerun resumes at the first missing node.
4. `centroids` (one transaction): curated concepts = mean of members' semantic vectors over existing INSTANCE_OF edges whose dst
   concept has `category='curated'`; auto concepts (`category='auto'`) = mean over their trigram-cluster members. Then
   `CREATE TABLE edges_trigram_archive AS SELECT src.key src_key, dst.key dst_key, e.rel, e.weight, e.meta …` for INSTANCE_OF
   edges into `auto` concepts, and those edges are removed from `edges` **in the work file only**; centroid vectors written to
   `embeddings_q3e256`. Swap: `embeddings` → `embeddings_trigram` (renamed, kept), `embeddings_q3e256` → `embeddings`.
5. `instance_of` (one transaction): delete edges with `json_extract(meta,'$.method')='semantic'`, then insert INSTANCE_OF
   section/verse/commentary/quotation → concept where cosine ≥ 0.45, weight = cosine, meta `{"method":"semantic"}`, skipping
   pairs that already have a curated edge.
6. `similar_to`: per batch of 1000 source nodes (table `similar_done(node_id PRIMARY KEY)`, one transaction per batch): top 8
   neighbours with cosine ≥ 0.35, weight = cosine, meta `{"method":"semantic"}`; concept nodes excluded as source and target.
   Universe: for a module node (§2.3 set) all nodes; for a base node only base nodes (so the base never points into a module).
7. `probe`: write `content/library/embed-probe.json` (§2.8) via Ollama.
8. `finalize` (last): write `embed_meta` (§2.2), `corpus_meta` (`corpus_version=<V>`, `derived_from`, `embed_*`), then
   `VACUUM INTO build/corpus/missal.<V>.full.db`. A file without all seven `embed_meta` rows or without `embed_progress.finalize`
   is incomplete. Exit codes (Closed set, Phase L): 0 ok, 2 model/Ollama, 3 work-file mismatch, 4 invalid input.

**build-modules:** refuses (exit 4) an input lacking complete `embed_meta` or `embed_progress.finalize`. (a) Module: copy §2.3 set
into `catena-aurea-en` schema; compute `content_digest`; if it equals the current `modules.json` entry's `contentDigest` → print
`unchanged` and exit 0 (rerun is a no-op); else `revision = previous + 1` (1 if none); refuse (exit 3) if
`build/modules/catena-aurea-en-r<N>.db` exists. (b) Base: `VACUUM INTO assets/corpus/missal.<V>.db` from the full file, then in
the copy delete module nodes and their `text_blocks`, `embeddings`, `search` rows, edges touching them and archive rows naming their
keys; set `corpus_meta.modules_split`; `VACUUM`. (c) Write `modules.json` (§2.4). (d) Write the pointer last (§2.1).
Postconditions: base has 0 nodes with `key LIKE 'commentary:catena-aurea/%' OR key LIKE 'catena:%' OR key LIKE 'father:%'`.

### 3.2 Release staging and deploy (commands; BA.9 inserts the stages between `web-deploy` and `linux`)

- `modules-stage` (`node scripts/modules-stage.mjs`, both environments): copies the pointer's base file and each `modules.json`
  file to the §2.1 stamped `dist/` names, writes `dist/sanctissimissa-v<APP>-content-manifest.json`
  `{corpus:{file,corpusVersion,sha256,sizeBytes}, modules:[{editionId,revision,file,sha256,sizeBytes}]}`, copies module files into
  the Android pack asset path (§2.5). Never overwrites an existing `dist/` file with different bytes (exit 3).
- `modules-deploy` (`node scripts/modules-deploy.mjs`, Ubuntu environment only, once): `rsync --ignore-existing` each module file
  to `${SANCTISSIMISSA_RUNTIME_SSH}:${SANCTISSIMISSA_RUNTIME_ROOT}/modules/` (the release partial's env keys, operator-provisioned in `.env`, keys listed in `.env.example`), verifies
  `GET ${MODULE_BASE_URL}/<file>` sha256, then uploads `modules.json` and verifies it plus the CORS header. Any mismatch → exit 1.

### 3.3 Install and attach (BA.2)

1. Startup: after `CorpusDb.open` (App.tsx:318-319) and the first entitlement refresh, `attachInstalledModules(db, installer, registry)`
   (`src/core/library/moduleBoot.ts`): for each registry module with `kind:'content'`, `delivery≠'builtin'`, installed bytes present
   and `isEntitled(module)` true → `db.attachModule(id, bytes)`.
2. After purchase/restore (bookstore-commerce partial calls `installAndAttach(editionId)`): `installer.install` → `db.attachModule`.
3. `ModuleInstaller.install(editionId, signal, onProgress)`: entry from `catalogue()`; bytes from `fetch(\`${MODULE_BASE_URL}/${file}\`)`
   or, on Android Play builds, `invoke('module_pack_fetch', {pack, file})`; sha256 must equal the entry; store in IndexedDB
   `sanctissimissa.library.packages.v1` store `packages` (key `editionId`, value `{editionId, revision, sha256, sizeBytes, storedAt, bytes}`).
4. `CorpusDb.attachModule(id, bytes)` → `attachModuleRows` (`src/core/data/moduleAttach.ts`): open bytes as a second sql.js
   Database; refuse with `AttachRefusal` if `module_meta.schema_version≠'1'`, `embed_meta` incompatible with the base, or
   `id` already in runtime table `module_attach`; inside one transaction insert `mnodes` (an existing key is kept, counted
   `skippedExistingKeys`), `mtext`→`text_blocks`, `memb`→`embeddings`, `msearch`→`search`, `medges` resolved key→id (unresolvable
   counted `unresolvedEdges`); record `module_attach(module_id PRIMARY KEY, revision, attached_at, first_node_id, last_node_id,
   nucleus_source)`; reset the vector cache; close the module Database. Revocation (explicit RevenueCat "not entitled" only) →
   `window.location.reload()`, after which step 1 skips the module.
5. `#download-manager` "Update available" when `catalogue()` revision > stored revision.

### 3.4 Query path and pre-ready selector (D7, decision 20)

`searchMode(q)` = `'semantic'` iff `getEmbedder().state()==='ready'` and the base `embed_meta` is `compatible` with `RUNTIME_EMBED_META`; else `'lexical'`.
- `similarToText(text,k,excludeKey)`: semantic → `embedQuery`; int8 cosine over `vectorRows()` (base + attached, `dim=256` only);
  top `max(k,20)`; if reranker ready, rerank the first 20 (`rerank` set, those 20 reordered by it), cosine order after; return top k
  (`score` stays cosine). Lexical → if `excludeKey` names a node with `SIMILAR_TO` edges, those edges by weight (score = weight);
  else FTS: normalized words of length ≥ 4, first 12 distinct, quoted, joined ` OR `, `ORDER BY rank LIMIT k`, score `(k−i)/k`.
- `interpretiveNucleiForText`: as today (corpusDb.ts:471-542) with vectors from `embedQuery`, default sources `nucleusSources()` =
  `['haydock', …module_attach.nucleus_source]`; lexical → `[]`.
- `bestClause(text, query, ctx)` async: clause vectors from `ClauseVectorCache` (LRU 8192, key = normalized clause) filled by one
  `embedDocs` call per query; `bestClauses(items, query)` batches all candidates + nuclei of one nucleation. Lexical → clause with
  most shared normalized words (ties: first), `score` 0.
- `nucleatedSimilarToText`: identical grouping/completeness to corpusDb.ts:549-635; awaits the above; lexical → affinity 0.
- `conceptsForText`: semantic → cosine to concept centroids; lexical → `[]`.
- `graphNeighbours(key,k)`: outgoing rels ∈ GraphRel plus incoming `COMMENTS_ON`/`CITES`/`ATTRIBUTED_TO`; dedupe by key (max weight);
  order weight desc, key asc; works in both modes.
- UI await wiring via hooks in `src/ui/hooks/useSimilarity.ts`: `useNucleatedSimilarity(db, term, opts)` →
  `{status:'pending'|'ready', mode: SearchMode, set: NucleatedSimilaritySet | null}`, `useConceptsForText`, `useBestClause`;
  each re-runs on `getEmbedder().onState`. Pending renders `Ranking by meaning…`.

### 3.5 Sidecar vectors and memory (BA.14)

`save()` (store.ts:403-408) and `distill()` (memory.ts:107-112) stop embedding; they call `enqueueSidecarEmbedding(db, refId, source, text)`.
`bootSidecarVectors(sidecar)` is called once where `SidecarDb.open()` resolves (App.tsx:326): if `vector.migrated.q3e256` is unset it
enqueues every live accompaniment (text as store.ts:403) and every `lore` row lacking a `dim=256` vector (**migrateSidecarVectors**),
sets the key, then starts the drain: on embedder `ready` and after each enqueue, batches of 16 due rows → `embedDocs` →
`INSERT OR REPLACE sidecar_embeddings(ref_id, 256, vec)`, set `embedded_at`, `sidecar.persist()`. Readers `sidecarSimilar(db, query, k)`
(`embedQuery`, rows `dim=256` only; lexical → `[]`) replace `SidecarDb.similar` (store.ts:428) and `CompanionMemory.recall` (memory.ts:81, now async).

### 3.6 Sacristan turn (D9, BA.15)

`ChatView.send` (ChatView.tsx:478-491) awaits `buildCompanionSystemContext({question, memory, db})` (`src/core/chat/systemContext.ts`)
before `controller.generate`: guide context + lore + `## Recalled memories` (async recall) + `## Retrieved passages` from
`sacristanContext(db, question)`: semantic → top 5 of `similarToText(question,5)` + top 5 `graphNeighbours(firstHit.key,5)` not
already listed; lexical → top 5 FTS (§3.4) + graph of the first; lines `- [<source>] <title> (<key>): <text>`. ChatView gains prop
`db?: CorpusDb | null`, passed at App.tsx:750.

## 4. Entity table (BA ids per §L.8; no BA.16 needed)

| Entity | Type | File:line (target) | Signature/fields | Closed set + phase | Authorized-by | Engaged-by | Acceptance (observable, re-runnable) | Local SDK doc |
|---|---|---|---|---|---|---|---|---|
| corpus npm scripts | config | `package.json` scripts | `corpus:ingest`, `corpus:catena-graph`, `corpus:embed`, `corpus:modules`, `corpus:restore` (§3.1) | 5 names, Phase L | R5, #4 | BA.10, BA.1 | `npm run` lists all five; each prints its output path | n/a |
| `.gitignore` / `.gitattributes` rules | config | repo root | `/build/`, `/assets/corpus/`, `src-tauri/gen/android/module_*/src/main/assets/`; `dist/**/*.db filter=lfs diff=lfs merge=lfs -text` | — | R5, CC13 | BA.1 | `git check-ignore build/x assets/corpus/x` both ignored; `git check-attr filter dist/a.db` = lfs | n/a |
| trigram lib (ingest-only) | module | `scripts/lib/trigram-embed.mjs` (new) | exports `embedText`, `cosine`, `EMBED_DIM=128`, re-export `normalizeText`; moved from embed.ts:13-46 | — | D6/D7, #7 | BA.10 | `grep -rn embedText src/` → 0 hits; ingest-corpus.mjs:30, ingest-bible.mjs:29, ingest-commentary.mjs:24 import it (one-line edits) | n/a |
| `embed.ts` end state | module | `src/core/vector/embed.ts` | only `cosine`, `normalizeText` re-export, `EMBED_DIM=256`; prior file on branch `archive/trigram-embed-20261106` | — | D6, #7 | BA.14 | file < 40 lines; `git branch --list archive/trigram-embed-20261106` non-empty | n/a |
| `parseCatena` extension | function | `scripts/ingest-commentary.mjs:115` (regex at :130) | records gain `chapterFile`, `ord`, `chapterEnd?`; heading grammar §2.6; ingestCommentary COMMENTS_ON spans `chapterEnd` | — | D8, R2 | BA.11 | stage1: `count(*) nodes where key like 'commentary:catena-aurea/%'` = 816 | n/a |
| `parseCatenaQuotations` + `--catena-graph` CLI | function | `scripts/catena-graph.mjs` (new; ingest-commentary.mjs gains a 3-line CLI delegation) | `(rawPericope) → {quotations:[{label,slug,locator,text,ordinal}], skipped}`; writes quotation/father nodes, PART_OF/ATTRIBUTED_TO/CITES | ATTR grammar, CITES map, edge rels: Closed set, Phase L | D8, #22, #27 | BA.11 | stage2: father nodes = 51; quotation count = attribution census (12,708) minus logged skips; unknown label → exit 4 | n/a |
| `CATENA_FATHERS` | const | `scripts/catena-fathers.mjs` (new) | `{slug,title,aliases[],class}[]` exactly §2.6 | 51 slugs, Closed set, Phase L | D8, #22 | BA.11 | every quotation meta.father ∈ table; `meta.aliases` equals table | n/a |
| `CATENA_CITE_BOOKS` | const | `scripts/catena-graph.mjs` | abbreviation → BOOK_MAP key (ingest-bible.mjs:46) per §2.6 | Closed set, Phase L | D8 | BA.11 | `module_meta.cites_unresolved` printed; CITES dst all `verse:` | n/a |
| `embed-corpus.mjs` | script | `scripts/embed-corpus.mjs` (new) | phases §3.1; exit codes 0/2/3/4 | phases + exit codes, Closed set, Phase L | D1, D5, D6, R5, #24 | BA.10 | kill during `vectors`, rerun → completes with `count(embeddings where dim=256)` = text-bearing nodes + concepts; input file sha256 unchanged | `DOCS/sdk/ollama-embed/`, `DOCS/sdk/qwen3-embedding/` |
| `embed_meta` | table | every corpus/module | §2.2 seven keys | Closed set, Phase L | D5 | BA.10 | `select count(*) from embed_meta` = 7 in base and module | `DOCS/sdk/qwen3-embedding/` |
| `edges_trigram_archive`, `embeddings_trigram` | tables | full/base corpus | §3.1 step 4 | — | R5, #10 | BA.10 | archive row count = INSTANCE_OF edges into `category='auto'` concepts of the input (1,309 in `corpus-2026.09.09-2054`) | n/a |
| `embed-probe.json` | data | `content/library/embed-probe.json` | §2.8 | 40 items, rule closed, Phase L | D4 | BA.10 | rerun on same input yields byte-identical `items` keys/text | `DOCS/sdk/ollama-embed/` |
| `build-modules.mjs` | script | `scripts/build-modules.mjs` (new) | §3.1 (a)–(d) | — | dec. 19, R2, R5, #10/#11 | BA.1 | second run prints `unchanged`; base Catena-key count 0; module DDL = §2.3 | n/a |
| module DB `catena-aurea-en-r<N>.db` | data | `build/modules/` | §2.3 | module ids Closed set, Phase L | R2, dec. 19 | BA.1 | `module_meta.node_count` = 816 + quotations + 51 | n/a |
| `modules.json` | data | `content/library/modules.json` | §2.4 | schema 1 | dec. 19, #6 | BA.1 (writer), BA.2 (reader) | `sha256sum` of file = entry `sha256` | n/a |
| corpus pointer + resolver | data+module | `assets/corpus.current.json`, `scripts/corpus-current.mjs` (new) | §2.1 | — | R5 | BA.1 | `node -e` import resolves path; tampered sha → throws | n/a |
| `build.rs` corpus path | build | `src-tauri/build.rs:1`, `src-tauri/src/lib.rs:10` | `SAM_CORPUS_PATH` env, `include_bytes!(env!(…))` | — | R5, dec. 18 | BA.1 | Linux and Windows builds embed the pointer file: `corpus_meta.corpus_version` in About = `<V>` | `DOCS/sdk/tauri-plugins-ipc/` |
| `corpus-restore.mjs` | script | `scripts/corpus-restore.mjs` (new) | copies dist LFS copy → assets/corpus after sha check | — | #4 | BA.1 | on clean clone + `git lfs pull`, `npm run prebuild` succeeds | n/a |
| MISSAL-DB-VERSIONS / CORPUS-SCHEMA updates | docs | `DOCS/MISSAL-DB-VERSIONS.md:30` (under `## Entries`), `DOCS/CORPUS-SCHEMA.md:96` | §2.1 texts | — | R5, #10 | BA.10 | entry heading contains `<V>`; schema line names 256-d | n/a |
| `modules-stage`, `modules-deploy` | scripts | `scripts/modules-stage.mjs`, `scripts/modules-deploy.mjs` (new); stage names in `scripts/release-state.mjs:260` STAGE_ORDER (BA.9) | §3.2; env `SAM_ASSET_HOST_RSYNC` | 2 stage names, Phase L | R3, CC12/CC14, #11 | BA.9 (stage list), BA.1 (scripts) | `dist/` holds stamped `.db` + manifest with matching hashes; `curl -sI ${MODULE_BASE_URL}/modules.json` shows ACAO `*` | n/a |
| workbox `globIgnores` | config | `vite.config.ts:46` | §2.5 | — | R3, #20 | BA.1 | `grep -cE '\.(db|gguf)"' dist-web/sw.js` = 0; `find dist-web -name '*.db' ! -name missal.db` empty | n/a |
| Android module pack | gradle | `src-tauri/gen/android/module_catena_aurea_en/build.gradle.kts`, app `build.gradle.kts` `assetPacks` | §2.5 | pack names Closed set, Phase L | dec. 18/19, R3 | BA.2 | `bundletool dump manifest --module module_catena_aurea_en` shows on-demand; base APK has no `.db` besides corpus | `DOCS/sdk/play-asset-delivery/` (**new snapshot required**, not in the TC7 list) |
| `module_pack_fetch` + `ModulePackPlugin` | Rust cmd + Kotlin | `src-tauri/src/module_pack.rs` (new), `…/mba/robin/sanctissimissa/ModulePackPlugin.kt` (new), `lib.rs` invoke_handler | `module_pack_fetch(pack: String, file: String) -> tauri::ipc::Response` (bytes; `run_mobile_plugin("fetch",{pack})` → `{path}`; file must match `^[a-z0-9-]+-r\d+\.db$`); non-Android → `Err("unsupported-platform")` | — | dec. 18, R3 | BA.2 | Play internal track: install → bytes sha = modules.json | `DOCS/sdk/tauri-plugins-ipc/`, `DOCS/sdk/play-asset-delivery/` |
| module core | module | `src/core/modules/core.ts` (new; **no imports outside `src/core/modules/`**) | `Module {id; kind:'content'|'feature'; title; railIcon?; entitlement: string|null; delivery:'builtin'|'asset-pack'|'download'; version:number}`; `ModuleGates = Readonly<Record<string,string|null>>`; `interface ModuleAttachTarget { attachModule(id:string, bytes:Uint8Array): Promise<AttachResult> }`; `AttachResult {moduleId,revision,nodes,edges,embeddings,searchRows,skippedExistingKeys,unresolvedEdges}`; `AttachRefusal = 'schema-unsupported'|'embed-meta-incompatible'|'already-attached'|'sha256-mismatch'|'not-entitled'`; `createModuleRegistry(modules, gates, isEntitled)` → `{list(), get(id), gate(id), canAttach(id)}` | kind, delivery, refusal: Closed set, Phase L | dec. 19 portability mandate, #11 | BA.2 | `grep -E "from '\.\./(data|library|ui)" src/core/modules/core.ts` → 0 | n/a |
| host registry `MODULES`, `MODULE_GATES` | const | `src/core/library/moduleRegistry.ts` (new) | `[{id:'haydock',kind:'content',title:'Haydock Commentary',entitlement:null,delivery:'builtin',version:1},{id:'catena-aurea-en',kind:'content',title:'Catena Aurea',entitlement:'reference_catena-aurea-en',delivery:'download'|'asset-pack' (Play build),version:<modules.json revision>}]`; `isEntitled` = `accessFor(editionId).state ∈ {free,owned,subscription}` | 2 ids, Closed set, Phase L | dec. 19, R2 | BA.2 | unentitled: Catena absent from search and reading (L.7 row 8) | n/a |
| `MODULE_BASE_URL` | const | `src/core/library/moduleHost.ts` (new) | §2.5 | — | R3, dec. 19 | BA.2 | network log shows module GET only to `sanctissimissa.robin.mba` | n/a |
| `ModuleInstaller` | class | `src/core/library/modules.ts` (new) | `catalogue(): Promise<ModuleEntry[]>`; `install(editionId, signal, onProgress:(f:number)=>void): Promise<InstalledModule>`; `load(editionId): Promise<Uint8Array|null>`; `remove(editionId): Promise<void>`; `InstalledModule {editionId,revision,sha256,sizeBytes,storedAt}` | — | dec. 19, LS | BA.2 | after purchase, IndexedDB `packages` holds the entry; corrupted bytes → install rejects `sha256-mismatch` | n/a |
| `attachModuleRows` / `CorpusDb.attachModule(id, bytes)` | function / method | `src/core/data/moduleAttach.ts` (new); corpusDb.ts gains ≤ 3 delegating lines | §3.3 step 4 | refusals per core | dec. 19, D5, #11 | BA.2 | attach then `concordance('chrysostom')` returns Catena keys; reattach → `already-attached` | n/a |
| `attachInstalledModules`, `installAndAttach` | functions | `src/core/library/moduleBoot.ts` (new); App.tsx:318 +1 call line | §3.3 steps 1–2 | — | dec. 19 | BA.2 | cold start with entitlement: MeaningPanel shows Catena hits (L.7 row 4) | n/a |
| `moduleKeyTarget`, `chapterKey` helpers | functions | `src/core/library/moduleKeys.ts` (new) | `moduleKeyTarget(key)` §2.7; `parseChapterKey(s): {book, chapter}|null`; `chapterLabel(key)`; `EVANGELIST` map | Book set, Closed set, Phase L | L.5 | BA.6 | TOC lists 89 chapters, first `St. Matthew, Chapter 1` (L.7 row 5) | n/a |
| Catena `NucleusSourceManifest` | data | `module_meta.nucleus_manifest` | §2.9 | — | dec. 21, R4 | BA.1 | JSON parses to types.ts:90 shape | n/a |
| `EmbedMeta`, `RUNTIME_EMBED_META` | module | `src/core/vector/meta.ts` (new) | `readEmbedMeta(rows): EmbedMeta|null`; `compatible(a,b): boolean` | 7 keys, Closed set, Phase L | D5 | BA.14 | module with altered `dim` row → `embed-meta-incompatible` | n/a |
| search stack | module | `src/core/vector/search.ts` (new) | `searchMode(q)`; `similarToText(q,text,k,excludeKey?): Promise<SimilarHit[]>`; `nucleatedSimilarToText(q,text,opts): Promise<NucleatedSimilaritySet>`; `interpretiveNucleiForText(q,text,opts): Promise<InterpretiveNucleus[]>`; `conceptsForText(q,text,k): Promise<ConceptHit[]>`; `graphNeighbours(q,key,k): GraphNeighbour[]`; `nucleusSources(q): string[]`; `q: CorpusQuery = {sqlRows(sql,params), vectorRows()}` | SearchMode, GraphRel: Closed set, Phase L | D3, D7, D9, dec. 20, #7, #25 | BA.14 | airplane-mode first launch: Meaning panel lists FTS results, no error; after models ready the same panel lists semantic results | `DOCS/sdk/qwen3-reranker/` |
| CorpusDb delegations | methods | `src/core/data/corpusDb.ts:471,549,768,829` | same names, now `async`, one-line bodies calling search.ts; `sqlRows`/`vectorRows` public (vectorRows filters `dim=256`); `groupedSimilarToText` (956, zero callers) removed, kept on the archive branch | — | #7, #25 | BA.14 | corpusDb.ts line count decreases | n/a |
| `bestClause`, `bestClauses`, `ClauseVectorCache` | functions | `src/core/vector/clause.ts:84` | `bestClause(text, query): Promise<(Clause&{score})|null>`; `bestClauses(texts: string[], query): Promise<…[]>`; cache LRU 8192 | — | dec. 20, #7 | BA.14 | MeaningPanel row shows bold clause after `Ranking by meaning…` | n/a |
| UI hooks | module | `src/ui/hooks/useSimilarity.ts` (new) | §3.4 | status Closed set, Phase L | #7 | BA.14 | MeaningPanel.tsx:313,630,682,726 and :219 use hooks at component top level; net line delta ≤ 0 | n/a |
| connection cards | module | `src/ui/journal/connectionCards.tsx` (new) | `buildConnectionCards(args): Promise<ConnectionCard[]>` = JournalSidecar.tsx:194-~300 moved, awaiting search + `sidecarSimilar`; `themeSuggestions` (JournalSidecar.tsx:430) uses `useNucleatedSimilarity` | — | #7, #25 | BA.14 | Journal capture shows Catena connection cards when entitled; JournalSidecar.tsx shrinks | n/a |
| `sidecar_embeddings_pending`, queue + `migrateSidecarVectors` | table + module | `src/core/accompaniment/sidecarVectors.ts` (new): `ensureSidecarVectorSchema(db)`, `enqueueSidecarEmbedding(db,refId,source,text)`, `bootSidecarVectors(sidecar): () => void`, `sidecarSimilar(db,query,k): Promise<{id,score}[]>`; store.ts:403-408, :428 and memory.ts:83,107-112 delegate; App.tsx:326 +1 call | §2.10, §3.5 | source Closed set, Phase L | D6, #7 | BA.14 | upgrade a profile with notes: after models ready `select count(*) from sidecar_embeddings where dim=256` = live notes + lore; store.ts net lines ≤ 0 | n/a |
| `CompanionMemory.recall` | method | `src/core/companion/memory.ts:81` | `recall(query,k): Promise<MemoryHit[]>` via `sidecarSimilar` | — | #7 | BA.14 | Sacristan context lists `## Recalled memories` after a distilled turn | n/a |
| `verifyEmbedParity` | function | `src/core/vector/parity.ts` (new) | `(): Promise<{platform, minCosine, items:{id,cosine}[], pass:boolean}>`; runs once per launch on embedder ready; `debugEvent('embed','parity',result)` | — | D4 | BA.14 | diagnostics log shows `embed parity` with `minCosine ≥ 0.99` on web, Linux, Windows, Android (L.7 row 10) | `DOCS/sdk/llama-cpp-2/`, `DOCS/sdk/wllama-3.8.1/` |
| `sacristanContext`, `buildCompanionSystemContext` | functions | `src/core/chat/retrieval.ts`, `src/core/chat/systemContext.ts` (new); ChatView.tsx:358-372 replaced by delegation, :491 awaits; prop `db` | §2.11, §3.6 | SacristanSource Closed set, Phase L | D9 | BA.15 | ask about the day's Gospel with Catena owned: reply cites a `[catena-aurea-en]` item (L.7 row 4); ChatView.tsx net lines ≤ 0 | n/a |

## 5. Supersessions recorded (this partial governs the listed §L wording)

1. §L.4 "emits `public/modules/<editionId>.db`" → `build/modules/catena-aurea-en-r<N>.db`, stamped `dist/` copy, host `robin.mba`, Play pack (§2.5).
2. §L.4 "deletes the module's rows from `assets/missal.db`" and "rewrites `embeddings`" → never; new files per §2.1 (R5).
3. §L.4 "It is idempotent" → `content_digest` no-op rerun + new revision on change (§3.1).
4. §L.4 "`https://sanctissimissa.surge.sh` on Tauri" → `MODULE_BASE_URL` (R3).
5. §L.4 "`CorpusDb.attachModule(bytes)`" → `attachModule(id, bytes)` behind the host-agnostic module core (decision 19).
6. §L.4 "consume it unchanged" → async signatures and hooks (§3.4–3.6).
7. §L.4 "These replace the trigram cluster edges" → archived in `edges_trigram_archive` within the new file.
8. §L.4 "`meta.aliases` (… e.g. `Chrys.`, `Aug.`, `Pseudo-Chrys.`, `Gloss.`)" → observed-label table §2.6.
9. §L.4 nucleus source list "`['haydock', …attached module ids]`" → `['haydock', …module_attach.nucleus_source]` (ids differ: `catena-aurea-en` vs `catena-aurea`).
10. §L.4 "embedder verifies the blob digest" → mechanism of §3.1 step 1.
11. §L.5 `<Book>`/chapter → `chapterKey` §2.7 (file chapter; 816 pericopes incl. 15:39–16:4).
12. LS `sanctissimissa.library.packages.v1` stores `staging`/`active` → store `packages` only (Phase L).
13. `CORPUS-SCHEMA.md:96` 128-d trigram → §2.1 text; release input `assets/missal.db` → pointer-resolved file.
14. Decision 19 non-operator sentence → superseded by R2 (commit 4cde88fe); Catena moves wholly into the module.
