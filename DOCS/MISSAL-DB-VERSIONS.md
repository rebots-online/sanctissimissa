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
