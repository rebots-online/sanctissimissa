# St. Android's Missal v1.33.81185

The subway map's stops now lead somewhere, and the corpus names itself.

- Every station on the Mass map now opens its own text: the Confiteor stop lands on the Confiteor itself (not the top of the foot-of-the-altar block), the Alleluia stop finds the Alleluia verse wherever the day keeps it — its own section on some feasts, the paschal-gradual text on others, inside the Gradual on Sundays — and stops whose text the day genuinely lacks (the Alleluia on ember days and vigils, the sprinkling rite on weekdays) are greyed out instead of doing nothing when tapped.
- The sprinkling rite (Asperges me / Vidi aquam) and the other prayers of the Mass Ordinary that were missing from the corpus entirely are now present, Latin and English.
- The Alleluia verse is displayed again at feasts outside Paschaltide — a regression where it silently vanished from the reader.
- The liturgical corpus file now carries its own version identity inside it (build stamp, exact source-snapshot commit, and a one-line description of what changed), and a descriptive version history of the corpus begins in `DOCS/MISSAL-DB-VERSIONS.md`. Every future corpus rebuild states what changed in it.

### For maintainers

- Root cause and fix record: `DOCS/2026-08-15-0935-office-mass-differential-probe-v1.31.66058.md` Phase 5 (D14) and `DOCS/MISSAL-DB-VERSIONS.md` (corpus ledger, entry `corpus-2026.08.16-0902`).
- The stops' tappability contract: a stop is clickable exactly when the reader will render its anchor that day (`readerAnchorsForDay` + `stationAnchorFor`); any future station must resolve through it.

---

Built from commit 1569183617e3e3113ba3435b743b7c01f5366ec2. See the adjacent release manifest for exact artifact hashes and verification state.
