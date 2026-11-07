# The Divinum Officium Flat-Text Schema — and How To Modify It Locally

The liturgical corpus is the vendored snapshot at `VENDORED/divinum-officium/`
(see its `PROVENANCE.md`). `scripts/ingest-corpus.mjs` parses the flat-text
tree into `assets/missal.db`. Nothing refers outside this repository.

## Tree layout (what the ingest reads)

| Corpus path key | Source in vendored tree |
| --- | --- |
| `Tempora/<f>`, `Sancti/<f>` | `web/www/missa/<lang>/{Tempora,Sancti}/<f>.txt` (merged with same-path horas file when both exist) |
| `Commune/<f>` | `web/www/horas/<lang>/Commune/<f>.txt` (the Commune serves both Mass and Office) |
| `Psalterium/<rel>` | `web/www/horas/<lang>/Psalterium/**.txt` |
| `Ordo/Missae` | `web/www/missa/<lang>/Ordo/Ordo.txt` (`#`-heading format) |
| `Horas/Tempora/<f>`, `Horas/Sancti/<f>` | `web/www/horas/<lang>/{Tempora,Sancti}/<f>.txt` |

Languages: `Latin` (normative) and `English`, merged into bilingual
`text_blocks`. A missing English file simply yields `english = NULL`.

## File format

```
[SectionName] (optional qualifier)
content lines …
```

- **`[Section]` headers** — one per section; an optional parenthesized
  qualifier (e.g. `(communi Summorum Pontificum)`) is preserved in the section
  node's `meta.qualifier`.
- **`!` lines** — scripture citations (`!Ps 27:8-9`) or rubrics. The reader
  styles them as citations; the ingest treats a citation with no following
  text as an *orphan* and gap-fills it (see below).
- **`v.` / `V.` / `R.` / `S.` / `M.`** — speaker/verse markers, kept verbatim.
- **`[Rank]`** — `name;;class;;num;;extra`, e.g. `;;Duplex;;3;;vide C4b`.
  `num` is the precedence rank (float). A `vide <C-ref>` names the Commune
  file that supplies missing sections → `CROSS_REF` edge.
- **`[Rule]`** — rubrical switches (Gloria, Credo, `Prefatio=…`, `vide C4b;`).
  Stored as a meta section; `vide` here also produces the `CROSS_REF`.

## Directives (resolved inline at ingest)

| Directive | Meaning | Graph edge |
| --- | --- | --- |
| `@Path/File` | include the *same-named* section from another file | `INCLUDES` |
| `@Path/File:Section` | include a specific section | `INCLUDES` |
| `@Path/File:Section:xform` | include + transform: a line range (`2-4`), one or more `s/…/…/` substitutions, or both (`1 s/a/b/`) | `INCLUDES` |
| `&Name` / `$Name` | expand a named prayer from `missa/<lang>/Ordo/Prayers.txt` (falling back to `horas/<lang>/Psalterium/Common/Prayers.txt`) | `EXPANDS` |
| `&psalm(N)` | insert Psalm N from `Psalterium/Psalmorum/PsalmN.txt` | `EXPANDS` |

Unknown engine-function macros (hour-construction calls that only make sense
at office-assembly time) are kept as italic rubric markers `![Name]` and
logged.

## Gap-fill policy (V0.7 — generation never breaks)

Occasional hiccoughs exist in the corpus: directives whose targets are
missing (e.g. `@Sancti/12-25:Octava` where no `[Octava]` exists), or
citations with the quoted text still missing. Resolution chain:

1. **Same section elsewhere** — the include path is retried against both the
   `missa` and `horas` trees (they share path space).
2. **The file's `vide` Commune** — the section is sought in the cross-ref'd
   Commune file.
3. **Vendored scripture** — if a citation can be parsed, the verse text is
   served from `VENDORED/vulgate-clementina/vul.tsv` (Latin) or
   `VENDORED/douay-rheims/EntireBible-DR.json` (English).
4. **Placeholder** — `![Section — Path (textus deest)]`, clearly marked.

Every fill is recorded in **`DOCS/CORPUS-FILL-LOG.md`** (regenerated each
ingest) with the broken directive verbatim, the resolution, the filled
content, its citation, and the supplying source. Filled sections carry
`meta.filled = true` on their graph node so the UI can indicate supplied text.

## Modifying the vendored corpus locally

1. Edit the `.txt` file(s) under `VENDORED/divinum-officium/web/www/…`
   directly — this snapshot is ours; there is no upstream to conflict with.
2. Record every modification in the **Local modification log** table of
   `VENDORED/divinum-officium/PROVENANCE.md` (file, date, reason).
3. Re-run `npm run ingest` and review `DOCS/CORPUS-FILL-LOG.md` — a good
   modification usually *removes* fill-log rows.
4. Run `npm test` (parser + corpus invariants must hold).

## Output schema (`assets/missal.db`)

- `nodes(kind ∈ {file, section, concept}, key, title, category, rank_class, rank_num, color, meta)`
  — keys `file:<path>` / `section:<path>#<Section>` / `concept:<id>`.
  Concept nodes have `category ∈ {curated, auto}` and `meta.description` +
  `meta.source`.
- `edges(src, dst, rel ∈ {HAS_SECTION, CROSS_REF, INCLUDES, EXPANDS, INSTANCE_OF, BROADER_THAN}, meta)`
  — directive text preserved in `meta.directive`.
  - `INSTANCE_OF`: section → concept (section is an instance of a liturgical concept)
  - `BROADER_THAN`: parent concept → child concept (taxonomy hierarchy)
- `text_blocks(node_id, section, latin, english)` — resolved bilingual text.
  Original text preserved for rendering; never normalized.
- `embeddings(node_id, dim, vec)` — 256-d Qwen3-Embedding-0.6B, first 256 of 1024 (Matryoshka), L2-renormalized, int8 ×127; identity in `embed_meta`. Pre-q3e256 files carry 128-d trigram.
- `embed_meta(key, value)` — exactly seven rows (`model`, `artifact_sha256`,
  `dim`, `quant`, `prefix_query`, `prefix_doc`, `norm`), equal to
  `RUNTIME_EMBED_META` (`src/core/vector/meta.ts`); written by
  `scripts/embed-corpus.mjs` finalize. A file lacking it runs lexical-only.
- `edges_trigram_archive(src_key, dst_key, rel, weight, meta)` — the trigram
  INSTANCE_OF edges into `category='auto'` concepts, archived (by key) when
  the semantic re-embed replaced them; `embeddings_trigram` keeps the old
  128-d vectors.
- `embed_progress(phase, completed_at)` — embed-corpus phases (`copy`,
  `vectors`, `centroids`, `instance_of`, `similar_to`, `probe`, `finalize`);
  a file without the `finalize` row is incomplete.
- Additional rels (Phase L): `SIMILAR_TO` (node → its top-8 semantic
  neighbours, cosine ≥ 0.35, weight = cosine, `meta.method='semantic'`;
  semantic `INSTANCE_OF` carries the same meta, cosine ≥ 0.45), `PART_OF`
  (quotation → pericope), `ATTRIBUTED_TO` (quotation → father), `CITES`
  (quotation → verse).
- Additional kinds (Phase L): `quotation` (`catena:<Book>/<ch>/<verseStart>/q<n>`)
  and `father` (`father:<slug>`) — module-only (Catena Aurea module
  `catena-aurea-en`; never in the base corpus).
- `search` — FTS5 over `(key, section, content)`, meta sections excluded.
  Content is **normalized** via `normalizeText()` (lowercase, strip diacritics,
  map ligatures æ→ae / œ→oe, collapse non-letters to spaces) so that user
  queries without diacritics match corpus text that has them.

## Shipped parts (`missal.<V>.{text,graph,vectors}.db`)

Normative source: `DOCS/ARCHITECTURE/L-corpus-split-20261106.md` §2, §3. Built by
`npm run corpus:split -- --in <base asset> --out-dir assets/corpus/`
(`scripts/split-corpus.mjs`; exit 0 ok · 3 an output exists · 4 invalid input; outputs are immutable).

From §2 (Decision):

> The shipped base corpus is **three SQLite files of one `corpus_version`**, split from the BA.10 base asset by a build step:
>
> | Part (Closed set, Phase L) | Tables carrying rows | Android delivery | Needed for |
> |---|---|---|---|
> | `text` | every table of the base asset **except** the ones listed for graph/vectors and the dropped set; `edges` and `embeddings` exist **empty** with their original schema and indexes | install-time asset pack `corpus_text` | Mass, Office, calendar, reader, FTS search: app is fully usable on this part alone |
> | `graph` | `edges` (all rows) | fast-follow asset pack `corpus_graph` | concept surfacing, CITES/COMMENTS_ON navigation, SIMILAR_TO, Sacristan graph hits |
> | `vectors` | `embeddings` (all rows), `embed_meta` (copy) | fast-follow asset pack `corpus_vectors` | semantic similarity, Sacristan vector hits |
>
> Dropped from all parts (kept in the full/work files only): `embeddings_trigram`, `edges_trigram_archive`, `embed_work`,
> `embed_progress`, `similar_done`. Not changed in this release (non-goal, to avoid a wide query-layer change): the FTS5 `search`
> table keeps its own content copy.
>
> Node ids are identical across the three parts (one source file), so the merge copies rows verbatim — **no key remapping**.

From §3 (Formats, Closed set, Phase L):

> - Every part has `corpus_meta(key,value)` with `corpus_version=<V>` and `corpus_part=text|graph|vectors`.
> - The `text` part also has `corpus_parts(part TEXT PRIMARY KEY, file TEXT NOT NULL, sha256 TEXT NOT NULL, bytes INTEGER NOT NULL)`
>   with one row each for `graph` and `vectors`. `file` = `missal.<V>.<part>.db`.
> - The `text` part keeps `embed_meta` (module attach refuses a base without it, `moduleAttach.ts:49`); the `vectors` part's
>   `embed_meta` must equal it row for row.
> - File names: `missal.<V>.text.db`, `missal.<V>.graph.db`, `missal.<V>.vectors.db`.

Build detail (§4): in `graph` and `vectors` the `edges` / `embeddings` tables have the input's columns
without `REFERENCES` clauses, and `idx_edges_src` / `idx_edges_dst` as in the input. Each part's
`corpus_meta` carries the input's rows plus `corpus_part`. Delivery per platform: L-corpus-split §5
(`DOCS/sdk/play-asset-delivery/integrate-java.md`, `DOCS/sdk/play-asset-delivery/size-limits.md`).

## Text normalization (`src/core/text/normalize.ts`)

Every text string entering any search path (FTS5, vector, concept graph,
future LLM queries) passes through `normalizeText()`:

1. Lowercase
2. Map liturgical ligatures: æ→ae, ǽ→ae, œ→oe
3. NFD decompose + strip combining diacritics
4. Collapse non-letters to spaces
5. Trim

The **original text is never mutated** — only the indexed/query form is
normalized. `text_blocks` preserves original Latin/English for rendering;
FTS5 `search.content` stores the normalized form. `concordance()` in
`CorpusDb` normalizes the user's query term before FTS5 MATCH. Vector
embeddings (`embedText()`) normalize internally before trigram hashing.

## Concept taxonomy (`src/core/ontology/concepts.ts`)

A curated taxonomy of ~30 liturgical concepts (Doxology, Collect, Preface,
Canon, Kyrie, Sanctus, Agnus Dei, etc.) plus auto-derived concepts from
embedding clustering. Each `ConceptDef` has:

- `id` — stable identifier (e.g. `doxology`)
- `label` — display name
- `description` — what the concept means
- `broader` — optional parent concept id (hierarchy)
- `sectionNames` — DO section names that map to this concept (e.g. `Collect`, `Oratio`)
- `patterns` — regex patterns matched against normalized text
- `keywords` — normalized substrings for fuzzy matching

### Ingest passes

- **Pass 3a (curated):** For each `ConceptDef`, create a concept node, scan
  all section nodes for matches (by section name, regex, or keyword), create
  `INSTANCE_OF` edges, compute and store centroid embedding. Create
  `BROADER_THAN` edges for the hierarchy.
- **Pass 3b (auto-derived):** Greedy threshold clustering (cosine > 0.85,
  min cluster size 3) on sections not already tagged by curated concepts.
  Creates `auto_<n>` concept nodes with `INSTANCE_OF` edges and centroid
  embeddings.
