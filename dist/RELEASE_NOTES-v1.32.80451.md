# St. Android's Missal v1.32.80451

The Divine Office now generates as Divinum Officium does, hour by hour, on
every kind of day.

- Matins lessons sit inside their nocturns on great feasts and follow the psalms as one block on Sundays, vigils and simpler feasts — opened by the Pater noster as the reference does.
- The psalmody of each hour follows the 1960 arrangement: Sundays and major feasts sing the festal psalms and the invariable Compline, penitential ferias and vigils take the second Lauds scheme with Psalm 50, and penitential Wednesdays break Psalm 49 into three in place of Psalm 50.
- The Gospel canticle at Lauds is once again the Benedictus (Canticum Zachariæ), not the Canticle of Moses.
- The eve of a major feast sings First Vespers of the feast: its antiphons, psalms, chapter, hymn, Magnificat antiphon and collect, with the festal Compline.
- Simpler saint's days read the occurring Scripture for their first two Matins lessons and the saint's legend for the third, as the reference engine arranges them.
- Commemorations are sung only where the rubric places them (Laudes and Vespers) and now render their real collects, falling back to the Sunday's collect on ferial days.
- Compline carries its confession block again, and the plain prayers the skeleton marks (Pater noster, the greeting before the collect, Prime's morning offering) render as text instead of placeholders.
- Scripture citation markers no longer leak into the text of the Office or the Mass propers; they render as parenthetical references, and source comments the reference engine discards are discarded.

### Known limitations

- Some proper texts (a canticle antiphon here, a responsory there) still render Latin-only; the English joins are a corpus-ingest task.
- Preces, the Prime Martyrologium announcement, Matins absolutions and blessings, and seasonal doxology switching remain unimplemented, as do the Triduum and Paschaltide arrangements.

### For maintainers

- The full divergence enumeration, root causes and the convergence evidence live in `DOCS/2026-08-15-0935-office-mass-differential-probe-v1.31.66058.md` (Phases 1–4).
- The convergence sweep is `tests/.tmp/diffprobe/sweep.mjs` (working artifact): five day-types × eight hours compared structure-token by structure-token against the vendored Divinum Officium reference render.

---

Built from commit 6d4051964a053cda460542fe5038cccb1942babf. See the adjacent release manifest for exact artifact hashes and verification state.
