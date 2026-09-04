# VENDORED/haydock — Haydock Catholic Bible Commentary (provenance lock)

Written BEFORE content placement per INC-15 (vendor-clone-at-home; provenance
lock before assimilation; additive — nothing deleted).

## Source

- **Work:** *The Holy Catholic Bible … with useful notes, critical, historical,
  controversial, and explanatory* — the **Haydock Catholic Bible Commentary**
  by Rev. George Leo Haydock (first published 1811–1814; the well-known
  one-volume commentary edition circulated from 1859).
- **Edition transcribed:** the **1883 "expanded" edition** printed by Edward
  Dunigan and Brother, New York (per the transcription's own `\periph
  Publication Data` block in `00-FRT-…p.sfm`). Same commentary corpus as the
  1859 edition named in `DOCS/ScripturalReferences-PublicDomain.md`; the 1883
  printing is the edition the machine-readable transcription was made from.
  Abbreviations in the printed footnotes were expanded by the transcriber.
- **Base Bible text:** Douay-Rheims, Challoner revision (files are labelled
  `DRC1750`); commentary rides as USFM footnotes (`\f + \fr <ch>:<v> \ft …\f*`),
  scripture cross-references as `\x` entries.

## Retrieval

- **Method:** `git clone https://github.com/cmahte/ENG-B-Haydock1883-pd-PSFM.git`
  cloned once, at home, into `VENDORED/haydock/ENG-B-Haydock1883-pd-PSFM/`.
- **Remote:** `https://github.com/cmahte/ENG-B-Haydock1883-pd-PSFM`
- **Branch / commit:** `master` @ `0332c84aedf35638a0d87b0185cc01eb14a65492`
  (committed 2019-03-17T17:08:03Z; repository has been static since).
- **Retrieved:** 2026-07-14
- **Assimilation:** the embedded `.git/` directory was removed after this file
  and the commit hash above were recorded (INC-15 assimilation step). No other
  file was altered or deleted.

## Licensing

- The Haydock commentary (Haydock d. 1849; editions 1811–1883) and the
  Douay-Rheims Challoner text (1750) are **public domain** worldwide (author
  death + any publication date long past every copyright horizon).
- The repository filenames carry the transcriber's own `[pd]` (public domain)
  marker; the repo publishes the transcription without a restrictive license
  file. Faithful transcriptions of public-domain texts do not create a new
  copyright over the text itself.

## File inventory

- `ENG-B-Haydock1883-pd-PSFM/NN-BBB-ENG[B]DRC1750[pd].p.sfm` — 73 canonical
  books (Douay canon, Vulgate psalm numbering), USFM ("PSFM") markup:
  - `00-FRT…` front matter (title page, transcriber's notes) — not ingested
  - `01-GEN…` … `46-2MA…` Old Testament (Tobias, Judith, Wisdom,
    Ecclesiasticus, Baruch, Machabees included)
  - `48-INT…` NT introduction — not ingested
  - `49-MAT…` … `76-REV…` New Testament
  - `77-BAK…` back matter (CPDV2009-labelled colophon page) — not ingested
- **Coverage:** complete 73-book canon, commentary at verse level via `\f`
  footnotes (≈ whole-Bible coverage; density varies by book, heaviest in the
  Gospels, Psalms and Pentateuch).

## Consumption

`scripts/ingest-commentary.mjs` (source id `haydock`) parses the `\f + \fr
<ch>:<v>\ft …\f*` footnotes per book into `commentary:haydock/<Book>/<ch>/<v>`
nodes with `COMMENTS_ON` edges to the Bible plane. `\x` cross-reference
entries and the `\f` "about the year A.D. …" chronological marginalia are
real Haydock apparatus and are kept by the parser (merged per verse).

## Modification log

- 2026-07-14 — initial vendoring; `.git/` removed (assimilation); no content
  edits.
