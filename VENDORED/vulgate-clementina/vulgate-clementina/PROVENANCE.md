# PROVENANCE — Clementine Vulgate (vendored snapshot)

Full untracked snapshot per Admin-Manual vendoring policy. Used by the ingest
gap-fill pipeline (V0.7) to supply Latin scripture for broken corpus directives.

| Field | Value |
| --- | --- |
| Upstream | https://github.com/LukeSmithxyz/vul |
| Text origin | Clementine Text Project (vulsearch.sourceforge.net) — public domain |
| Pinned commit | `10d9d6191dd81f110a9788e66b4818483f32d31d` |
| Snapshot taken | 2026-07-05 |
| Files kept | `vul.tsv` (book / abbrev / book# / chapter / verse / text), upstream `README.md` |

## Local modification log

| Date | File | Reason |
| --- | --- | --- |
| — | — | (none yet) |

## Supplement — vul-deutero.tsv (added 2026-08-17)

| Field | Value |
| --- | --- |
| Upstream | https://github.com/theunpleasantowl/vul-complete |
| Text origin | Clementine Text Project (same lineage as vul.tsv above) — public domain |
| Pinned commit | `0eb32a6af1a119ba76fcaf0f1c639a60ca2034b1` |
| Snapshot taken | 2026-08-17 |
| Files kept | `vul-deutero.tsv` — the five deuterocanonical books the LukeSmith snapshot lacks (Tobiae, Judith, Sapientia, Ecclesiasticus, Baruch), 2,888 verses |

## Local modification log (continued)

| Date | File | Reason |
| --- | --- | --- |
| 2026-08-17 | vul-deutero.tsv | Added: five deuterocanonical books extracted from vul-complete@master, DEDUPED (upstream file repeats every row 3×; byte-identical triples confirmed before dedupe). Format unchanged (6-col TSV, abbrevs Tob/Jdt/Sap/Sir/Bar). |
