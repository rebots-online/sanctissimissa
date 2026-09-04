# VENDORED/catena-aurea — St. Thomas Aquinas, Catena Aurea (provenance lock)

Written BEFORE content placement per INC-15 (vendor-clone-at-home; provenance
lock before assimilation; additive — nothing deleted).

## Source

- **Work:** *Catena Aurea — Commentary on the Four Gospels collected out of
  the works of the Fathers* by St. Thomas Aquinas (13th c.), in the English
  translation edited by **John Henry Newman, Oxford: John Henry Parker,
  1841–1845** (the "Oxford Movement" translation named in
  `DOCS/ScripturalReferences-PublicDomain.md`). Text identity verified by
  sampling: the vendored Matthew 3 opens "PSEUDO-CHRYSOSTOM. The Sun as he
  approaches the horizon…", the Newman/Parker wording.
- **Transmission chain:** Newman/Parker 1841–45 → ecatholic2000.com HTML
  edition (`https://www.ecatholic2000.com/catena/`) → the vendored repository,
  which scraped ecatholic2000 into per-chapter Markdown plus a knowledge-graph
  JSON (the scraper, `catena_scraper.py`, and its URL list,
  `chapter_urls.json`, are included in the clone and document the chain).

## Retrieval

- **Method:** `git clone https://github.com/tj06man/catena-aurea-project.git`
  cloned once, at home, into `VENDORED/catena-aurea/catena-aurea-project/`.
- **Remote:** `https://github.com/tj06man/catena-aurea-project`
- **Branch / commit:** `main` @ `d3829bbb8b31b72796073d8e8218d36179b62720`
  (committed 2025-09-29T21:31:07Z).
- **Retrieved:** 2026-07-14
- **Assimilation:** the embedded `.git/` directory was removed after this file
  and the commit hash above were recorded (INC-15 assimilation step). No other
  file was altered or deleted.

## Licensing

- Aquinas (d. 1274); Newman's translation published 1841–1845 (all
  contributors long dead; publication predates every copyright horizon) —
  **public domain** worldwide.
- The repository adds only mechanical scraping/markup around the PD text; the
  Markdown chapters carry residual ecatholic2000 site navigation which the
  ingest parser strips (the prayed text itself is untouched Newman
  translation).

## File inventory

- `catena-aurea-project/markdown_chapters/{matthew,mark,luke,john}/…_chapter_NN.md`
  — 89 chapter files (Matthew 28, Mark 16, Luke 24, John 21); each contains
  site-nav cruft, then `# Catena Aurea by St. Thomas Aquinas`, then
  `### <ch>:<verseStart>[–<verseEnd>]` pericope headings with the quoted
  Gospel text and the chained patristic commentary (**FATHER**-attributed
  paragraphs) beneath.
- `catena-aurea-project/catena_aurea_graph.json` — the scraper's knowledge
  graph (15,018 nodes / 26,140 edges) — retained for reference, not ingested.
- `catena-aurea-project/catena_scraper.py`, `chapter_urls.json`, `*.md` docs —
  provenance of the scrape; retained.
- **Coverage:** all four Gospels, complete (the Catena covers only the
  Gospels by design).

## Consumption

`scripts/ingest-commentary.mjs` (source id `catena-aurea`) parses the
`### <ch>:<vs>[–<ve>]` headings of each chapter file into
`commentary:catena-aurea/<Book>/<ch>/<vs>` nodes with `COMMENTS_ON` edges to
the Bible plane, stripping site-nav lines and Markdown link/bold markup while
preserving the Newman text verbatim.

## Modification log

- 2026-07-14 — initial vendoring; `.git/` removed (assimilation); no content
  edits.
