# missal.db — descriptive version history

> **This file is the version history of `assets/missal.db` itself.**
> Every ingest of the corpus adds an entry here, and the same identity is
> **mirrored inside the database file** in the `corpus_meta` table
> (`corpus_version`, `built_at`, `vendored_commit`, `ingest_script_sha`,
> `files`, `sections`, `description`) — the db self-describes, so any copy
> of the binary can be interrogated for exactly which corpus it is.
>
> **Why this ledger exists:** `missal.db`'s contents are a function of the
> vendored Divinum Officium snapshot plus the ingest script — on
> 2026-08-15 an entire source file (`missa/Latin/Ordo/Prayers.txt`, the
> home of the Asperges and the Mass Confiteor/Alleluia) was silently
> absent from every corpus ever built because the ingest never listed it,
> and nothing about the file's name or contents revealed that. **The
> corpus artifact must be semantically and version named** — its identity
> belongs in its name and inside its bytes, not implied by the app version
> that ships it. Runtime surfaces (About/splash) should read
> `corpus_meta.corpus_version` and show it.

## Entry format

One entry per ingest, newest first:

- `corpus-<version>` — the identity row written into `corpus_meta`.
- What changed in the corpus and why.
- Vendored Divinum Officium commit the snapshot was at.
- Scale (files / sections) and where the app first shipped it.

## Entries

### corpus-2026.11.07-0400-q3e256 — semantic re-embed (Qwen3-Embedding-0.6B, 256-d) and Catena module split

- Derived from `corpus-2026.11.07-0210` by `scripts/embed-corpus.mjs` (model `qwen3-embedding:0.6b`, blob `sha256-06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439`, Ollama 0.34.2).
- Vendored Divinum Officium commit: `e9a9055cc235`.
- Catena moved to module `catena-aurea-en` r2 (R2), so the base no longer contains `commentary:catena-aurea/*`.
- Trigram auto-concept INSTANCE_OF edges archived in `edges_trigram_archive` (1309 rows); trigram vectors kept as `embeddings_trigram`.
- Counts: nodes 109016; embeddings (dim 256) 104836; SIMILAR_TO 836664; semantic INSTANCE_OF 257668.
- Semantic INSTANCE_OF per revised §3.1 step 5 (per node top 3 concepts with cosine ≥ 0.50): 257,668 edges from 98,028 sources in the full corpus (max 3 per source); base asset 219,899 edges from 85,123 sources, mean weight 0.674. Base asset `assets/corpus/missal.corpus-2026.11.07-0400-q3e256.db` is 314,572,800 bytes (1.43× the 220,246,016-byte input `stage2-graph.db`); module `catena-aurea-en-r2.db` is 71,880,704 bytes.
- Rerun from the `corpus-2026.11.07-0210-q3e256` work file (phases `instance_of`, `probe`, `finalize` redone; vectors, centroids and SIMILAR_TO reused).
- Rollback: prior corpus file untouched; revert the pointer commit.

### corpus-2026.11.07-0210-q3e256 — semantic re-embed (Qwen3-Embedding-0.6B, 256-d) and Catena module split

- Derived from `corpus-2026.11.07-0210` by `scripts/embed-corpus.mjs` (model `qwen3-embedding:0.6b`, blob `sha256-06507c7b42688469c4e7298b0a1e16deff06caf291cf0a5b278c308249c3e439`, Ollama 0.34.2).
- Vendored Divinum Officium commit: `e9a9055cc235`.
- Catena moved to module `catena-aurea-en` r1 (R2), so the base no longer contains `commentary:catena-aurea/*`.
- Trigram auto-concept INSTANCE_OF edges archived in `edges_trigram_archive` (1309 rows); trigram vectors kept as `embeddings_trigram`.
- Counts: nodes 109016; embeddings (dim 256) 104836; SIMILAR_TO 836664; semantic INSTANCE_OF 13361062.
- Rollback: prior corpus file untouched; revert the pointer commit.
- **Status: NOT SHIPPABLE — do not vendor or release (BA.10 `[/]`, 2026-11-06).** The §3.1 step 5 rule (cosine ≥ 0.45 to a concept centroid) is applied as written, but on 256-d Qwen3 vectors it admits nearly every pair. Measured on the base asset `assets/corpus/missal.corpus-2026.11.07-0210-q3e256.db` (1,617,481,728 bytes, versus 220,246,016 for the input `stage2-graph.db`): 12,235,970 semantic INSTANCE_OF edges from 89,683 sources into 253 concepts (≈ 136 concepts per node), mean weight 0.563. Edges and sources at or above each weight: 0.50 → 8,837,839 / 86,298; 0.60 → 3,536,544 / 70,548; 0.70 → 1,016,676 / 40,202; 0.80 → 117,062 / 12,266. No single threshold both bounds the size and keeps coverage. The INSTANCE_OF rule needs an architect revision, for example a per-node top-k, before this pipeline is rerun under a new `<V>`.
- **Superseded by `corpus-2026.11.07-0400-q3e256`** (per-node top-3 INSTANCE_OF, 2026-11-06). Remains NOT SHIPPABLE.

### corpus-2026.09.09-2054 — shipped corpus, retroactive entry (vendored by BA.9)

- **Retroactive** (L-release-20261106.md §1, §3 F1 step 5; R5): this corpus shipped from
  2026-09-09 onward as `assets/missal.db` but never received a ledger entry or a tracked copy.
  Its identity is read from its own `corpus_meta` row; no ingest was rerun to write this entry.
- `corpus_meta`: `built_at` 2026-09-09T20:54:59.301Z; `vendored_commit` `ab5673212182`;
  `ingest_script_sha` `077b8986fdb9`; description unset at ingest.
- Scale: 2,709 files / 34,673 sections. Trigram-era embeddings (pre-§L).
- Bytes: sha256 `7286cd357d43b75132d83aabbf8c64cb0dc7b3c44f6fd1e016729a592a14d2fa`,
  195,137,536 bytes.
- Vendored as `VENDORED/corpus/sanctissimissa-corpus-2026.09.09-2054.db` (LFS) by
  `node scripts/release-inputs.mjs --vendor`; `VENDORED/corpus/CURRENT.json` points at it with
  `previous: null`. It is the rollback target of the next corpus pointer.

### corpus-2026.08.16-1459 — `#` sub-heading markers stripped from section text

- **Fixed:** DO's `#` sub-heading lines inside `[Section]` bodies
  (`# Asperges me`, `#Vidi aquam`, …) leaked into `text_blocks` as literal
  leading-`#` body lines — 85 sections rendered a `# …` line in the reader
  (operator report 2026-08-16). `resolveLang` now strips `^\s*#` lines at
  resolve time, both languages; the reader already shows each section's own
  heading, so the marker duplicated it. Verified post-ingest: 0 text blocks
  carry `#` lines (was 85); `Ordo/Prayers#Asperges me` now opens directly
  with `Ant. Aspérges me…`.
- Section count unchanged (32,126): no sections were added or removed —
  this is a text-content-only rebuild.
- Vendored Divinum Officium commit: `db7d02896e78`.
- Scale: 2,451 files / 32,126 sections. Ingest script sha `077b8986fdb9`.
- First shipped in: the release built after this stamp.

### corpus-2026.08.16-0902 — Ordo/Prayers ingested; subway stops gain their text homes

- **Added:** `Ordo/Prayers` file — the 51 sections of
  `missa/Latin/Ordo/Prayers.txt` with English twins (`[Asperges me]`,
  `[Vidi aquam]`, the Mass `[Confiteor]`, `[Alleluia]`, `[IteMissa]`,
  `[Ultima Evangelium]`, …). These are the text homes of the subway map's
  Asperges/Confiteor/Alleluia stops; before this ingest they did not exist
  in the corpus at all (D14 root cause).
- First shipped in: the release built after `71e4b688` (v1.33.x).
- Vendored Divinum Officium commit: `db7d02896e78`.
- Scale: 2,451 files / 32,126 sections. Ingest script sha `455c3bccd219`.
- This entry is also the ledger's boundary marker: **corpora built before
  this stamp carry no `corpus_meta` table and no version identity** —
  including every db shipped through v1.32.80451. Their contents can only
  be inferred from the app version that embedded them.

### Pre-ledger corpora (retroactive, unversioned)

- `missal.db` builds from ingest v1 (July 2026) through v1.32.80451
  (2026-08-15) exist only as LFS objects tied to their release commits.
  Notable known corpus states in that span, reconstructable from
  `DOCS/CORPUS-SCHEMA.md`, `DOCS/CORPUS-FILL-LOG.md` and git history:
  - ingest v3 + office plane (2026-07-18) — `office_skeletons`,
    `office_psalm_schema`, `office_nocturn_versicle` tables; the runtime
    OfficeEngine era.
  - Ordo English ordinal pairing fix (2026-08-02, BUGS #13) — the
    Ordinary's English columns populated.
  - 2026-08-15 rebuilds during the differential-probe remediation —
    identical schema; the office fixes of that date were engine-side, not
    corpus-side.
