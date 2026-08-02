# Missing-Reference Register & Resolution Policy

**Generated:** 2026-07-06 from `DOCS/CORPUS-FILL-LOG.md` (ingest v2 run) + `assets/missal.db`. Regenerate with the ingest v3 audit stage.
**Policy (operator-directed, 2026-07-06):** production release is NOT held up by missing primary material. Every gap resolves through the first applicable route, always flagged in-UI (lighter-weight ink on tinted background — `meta.translationSupplied` / `meta.filled`) and logged with source:

- **Route S — Scripture-first (PRIMARY PREFERRED; operator correction 2026-07-06).** If the text is scriptural — an explicit `!` citation, or a derivable one (psalm number, lesson/capitulum incipit) — and we hold one language, the counterpart is **looked up**: Latin from the Clementine Vulgate, English from Douay-Rheims (both vendored, public domain). Canonical lookup always beats substitution or generation.
- **Route A — DO-internal substitution.** Non-scriptural (or citation-less) text that exists elsewhere in the vendored DO tree in >=1 language -> substitute it; where the counterpart language is missing and no citation is derivable, supply an **in-style ecclesiastical-Latin / hieratic-English cross-translation** of DO's own text (metre and constructions matched for hymnodic material).
- **Route C — Generation (Ordinary/euchology only).** Text that is part of the Ordinary/euchology (not scripture) and absent from DO: generate in-style under our own license. If NEITHER language exists (or a licensing impediment blocks a source): two steps — (1) an original **interpretation** of the reference in ecclesiastical register, our-licensed; (2) **our translation of our interpretation** for the counterpart language. Both steps logged; both texts flagged.

**Register caveat:** the Route column in §1 below was computed with ingest-v2 heuristics (weak scripture detection), which is why C dominates. The ingest v3 audit stage recomputes with full scripture-detection (psalm refs, `!` lines, lesson incipits) — most census items in §2 are scriptural and will resolve via **Route S**; the Octava-commemoration cluster in §1 is euchology and additionally rule-derivable (a commemoration of the octave draws the feast's own antiphon/versicle/collect).

**Licensing note:** Clementine Vulgate text — public domain. Douay-Rheims (1899 American ed.) — public domain. Divinum Officium corpus — upstream license recorded in `VENDORED/divinum-officium/PROVENANCE.md`. Route C therefore triggers today **only** for entries with no text and no citation.

## 1. Unresolvable-directive register (166 distinct; 307 occurrences)

Route counts (v2 heuristic, see caveat): **A = 5** (DO text exists — substitution/cross-translation) · **B = 0** (citation → Vulgate/DR) · **C = 161** (two-step generation).

| # | Source file | Section | Broken directive | Target | DO Latin? | DO English? | Citation | Route | Occ. |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Commune/C12A | Ant Matutinum | `@Commune/C11::s/After thy delivery.*\./The Angel of the Lord * announced unto Mary, and she conceived of the Holy Spirit./` | Commune/C11#Ant Matutinum | ✓ | — | — | **A** | 1 |
| 2 | Psalterium/Special/Matutinum Special | MM Capitulum Quad5 | `@Psalterium/Special/Minor Special:Responsory Quad5 SextaC_` | Psalterium/Special/Minor Special#Responsory Quad5 SextaC_ | ✓ | — | — | **A** | 2 |
| 3 | Sancti/01-02 | Oratio | `@Sancti/12-26:Oratio1` | Sancti/12-26#Oratio1 | ✓ | — | — | **A** | 2 |
| 4 | Sancti/11-02 | Oratio mortuorum1 | `@Commune/C9:Oratio_a_porta:s/&psalm.*\)//s` | Commune/C9#Oratio_a_porta | ✓ | — | — | **A** | 2 |
| 5 | Sancti/11-02 | Oratio mortuorum2 | `@Commune/C9:Oratio_a_porta:s/&psalm.*\)//s` | Commune/C9#Oratio_a_porta | ✓ | — | — | **A** | 2 |
| 6 | Commune/C12N | Minor final | `@:Pre oratio` | Commune/C12N#Pre oratio | — | — | — | **C** | 5 |
| 7 | Commune/C12N | Special Prima | `@:Minor intro` | Commune/C12N#Minor intro | — | — | — | **C** | 1 |
| 8 | Commune/C12N | Special Prima | `@:Hymnus minor` | Commune/C12N#Hymnus minor | — | — | — | **C** | 1 |
| 9 | Commune/C12N | Special Prima | `@:Capitulum Prima` | Commune/C12N#Capitulum Prima | — | — | — | **C** | 1 |
| 10 | Commune/C12N | Special Tertia | `@:Minor intro` | Commune/C12N#Minor intro | — | — | — | **C** | 1 |
| 11 | Commune/C12N | Special Tertia | `@:Hymnus minor` | Commune/C12N#Hymnus minor | — | — | — | **C** | 1 |
| 12 | Commune/C12N | Special Tertia | `@:Capitulum Tertia` | Commune/C12N#Capitulum Tertia | — | — | — | **C** | 1 |
| 13 | Commune/C12N | Special Sexta | `@:Minor intro` | Commune/C12N#Minor intro | — | — | — | **C** | 1 |
| 14 | Commune/C12N | Special Sexta | `@:Hymnus minor` | Commune/C12N#Hymnus minor | — | — | — | **C** | 1 |
| 15 | Commune/C12N | Special Sexta | `@:Capitulum Sexta` | Commune/C12N#Capitulum Sexta | — | — | — | **C** | 1 |
| 16 | Commune/C12N | Special Sexta | `@:Versum 2` | Commune/C12N#Versum 2 | — | — | — | **C** | 1 |
| 17 | Commune/C12N | Special Nona | `@:Minor intro` | Commune/C12N#Minor intro | — | — | — | **C** | 1 |
| 18 | Commune/C12N | Special Nona | `@:Hymnus minor` | Commune/C12N#Hymnus minor | — | — | — | **C** | 1 |
| 19 | Commune/C12N | Special Nona | `@:Capitulum Nona` | Commune/C12N#Capitulum Nona | — | — | — | **C** | 1 |
| 20 | Commune/C12N | Special Nona | `@:Verse Nona` | Commune/C12N#Verse Nona | — | — | — | **C** | 1 |
| 21 | Commune/C12N | Special Completorium | `@:Pre oratio` | Commune/C12N#Pre oratio | — | — | — | **C** | 1 |
| 22 | Commune/C2a-1 | Lectio in 3 loco | `@Sancti/06-19:Lectio` | Sancti/06-19#Lectio | — | — | — | **C** | 1 |
| 23 | Commune/C2p | Ant Vespera 3 | `@:Ant Vespera` | Commune/C2p#Ant Vespera | — | — | — | **C** | 1 |
| 24 | Commune/C5 | Versum 3 | `@:Versum 2` | Commune/C5#Versum 2 | — | — | — | **C** | 1 |
| 25 | Commune/C5a | Hymnus1M Vespera | `@Commune/C4a` | Commune/C4a#Hymnus1M Vespera | — | — | — | **C** | 1 |
| 26 | Commune/C5a | HymnusM Vespera | `@Commune/C4a` | Commune/C4a#HymnusM Vespera | — | — | — | **C** | 1 |
| 27 | Commune/C6a-1 | Evangelium in 2 loco | `@Commune/C6` | Commune/C6#Evangelium in 2 loco | — | — | — | **C** | 1 |
| 28 | Commune/C9 | Oratio_a_porta→A porta inferi | `@:Aportainferi` | Commune/C9#Aportainferi | — | — | — | **C** | 9 |
| 29 | Commune/C9 | Oratio_a_porta→A porta inferi | `@:Requiescant` | Commune/C9#Requiescant | — | — | — | **C** | 9 |
| 30 | Commune/C9 | Oratio_a_porta→A porta inferi | `@:Dominus:3-4` | Commune/C9#Dominus | — | — | — | **C** | 9 |
| 31 | Commune/C9 | Oratio 21→A porta inferi | `@:Aportainferi` | Commune/C9#Aportainferi | — | — | — | **C** | 1 |
| 32 | Commune/C9 | Oratio 21→A porta inferi | `@:Requiescant` | Commune/C9#Requiescant | — | — | — | **C** | 1 |
| 33 | Commune/C9 | Oratio 21→A porta inferi | `@:Dominus:3-4` | Commune/C9#Dominus | — | — | — | **C** | 1 |
| 34 | Psalterium/Special/Major Special | Preces feriales Laudes→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Major Special#Dominus | — | — | — | **C** | 1 |
| 35 | Psalterium/Special/Major Special | Preces feriales Vespera→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Major Special#Dominus | — | — | — | **C** | 1 |
| 36 | Psalterium/Special/Minor Special | Preces Dominicales→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Minor Special#Dominus | — | — | — | **C** | 1 |
| 37 | Psalterium/Special/Preces | Preces feriales Laudes→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Preces#Dominus | — | — | — | **C** | 5 |
| 38 | Psalterium/Special/Prima Special | Preces Dominicales Prima 2→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Prima Special#Dominus | — | — | — | **C** | 2 |
| 39 | Psalterium/Special/Prima Special | Commemoratio defunctorum→Domine exaudi | `@:Dominus:3-4` | Psalterium/Special/Prima Special#Dominus | — | — | — | **C** | 1 |
| 40 | Psalterium/Special/Prima Special | Commemoratio defunctorum→deus veniae | `@:deus veniae_: s/$/~/` | Psalterium/Special/Prima Special#deus veniae_ | — | — | — | **C** | 1 |
| 41 | Psalterium/Special/Prima Special | Commemoratio defunctorum→Requiem2 | `@:Requiem:s/\ \*//g` | Psalterium/Special/Prima Special#Requiem | — | — | — | **C** | 1 |
| 42 | Sancti/01-02 | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 43 | Sancti/01-02 | Commemoratio 2 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 44 | Sancti/01-03 | Commemoratio | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 45 | Sancti/01-15 | Communio | `@Commune/C2ap` | Commune/C2ap#Communio | — | — | — | **C** | 2 |
| 46 | Sancti/01-15cc | Versum 2 | `@Commune/C5:Versum 1` | Commune/C5#Versum 1 | — | — | — | **C** | 2 |
| 47 | Sancti/01-16 | Responsory8 | `@Commune/C2a` | Commune/C2a#Responsory8 | — | — | — | **C** | 2 |
| 48 | Sancti/01-23 | Versum 0 | `@Commune/C2a::s/N\./Raymúnde/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 49 | Sancti/01-23 | Versum 0 | `@Commune/C2a::s/N\./Raymond/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 50 | Sancti/04-05 | Versum 0 | `@Commune/C2a::s/N\./Vincénti/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 51 | Sancti/04-14t | Versum 1 | `@Commune/C3p:Versum 2` | Commune/C3p#Versum 2 | — | — | — | **C** | 2 |
| 52 | Sancti/04-14t | Versum 1 | `@Commune/C3p` | Commune/C3p#Versum 1 | — | — | — | **C** | 2 |
| 53 | Sancti/04-14t | Ant 1 | `@Commune/C3p:Ant 2` | Commune/C3p#Ant 2 | — | — | — | **C** | 2 |
| 54 | Sancti/04-14t | Ant 1 | `@Commune/C3p` | Commune/C3p#Ant 1 | — | — | — | **C** | 2 |
| 55 | Sancti/04-14t | Versum 2 | `@Commune/C3p:Versum 1` | Commune/C3p#Versum 1 | — | — | — | **C** | 2 |
| 56 | Sancti/04-14t | Versum 2 | `@Commune/C3p` | Commune/C3p#Versum 2 | — | — | — | **C** | 2 |
| 57 | Sancti/04-14t | Ant 2 | `@Commune/C3p:Ant 1` | Commune/C3p#Ant 1 | — | — | — | **C** | 2 |
| 58 | Sancti/04-14t | Ant 2 | `@Commune/C3p` | Commune/C3p#Ant 2 | — | — | — | **C** | 2 |
| 59 | Sancti/04-23pl | Introitus | `@Commune/C2ap` | Commune/C2ap#Introitus | — | — | — | **C** | 1 |
| 60 | Sancti/04-29 | Versum 0 | `@Commune/C2a::s/N\./Petre/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 61 | Sancti/05-05 | Versum 0 | `@Commune/C2a::s/N\./Pie/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 62 | Sancti/05-08pl | Introitus | `@Commune/C2ap` | Commune/C2ap#Introitus | — | — | — | **C** | 1 |
| 63 | Sancti/05-10 | Versum 0 | `@Commune/C2a::s/N\./Antoníne/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 64 | Sancti/05-16pl | Introitus | `@Commune/C2-1p:Introitus` | Commune/C2-1p#Introitus | — | — | — | **C** | 1 |
| 65 | Sancti/05-16pl | Graduale | `@Commune/C2ap:Graduale` | Commune/C2ap#Graduale | — | — | — | **C** | 1 |
| 66 | Sancti/05-16pl | Evangelium | `@Commune/C2ap:Evangelium` | Commune/C2ap#Evangelium | — | — | — | **C** | 1 |
| 67 | Sancti/05-16pl | Offertorium | `@Commune/C2ap:Offertorium` | Commune/C2ap#Offertorium | — | — | — | **C** | 1 |
| 68 | Sancti/05-16pl | Communio | `@Commune/C2ap:Communio` | Commune/C2ap#Communio | — | — | — | **C** | 1 |
| 69 | Sancti/06-20 | Versum 3 | `@Commune/C2a:Versum 1` | Commune/C2a#Versum 1 | — | — | — | **C** | 2 |
| 70 | Sancti/06-20 | Ant 3 | `@Commune/C2a:Ant 1` | Commune/C2a#Ant 1 | — | — | — | **C** | 2 |
| 71 | Sancti/08-03 | Versum 1 | `@Commune/C2a` | Commune/C2a#Versum 1 | — | — | — | **C** | 4 |
| 72 | Sancti/08-03 | Versum 1 | `@CommuneCist/C2a` | CommuneCist/C2a#Versum 1 | — | — | — | **C** | 2 |
| 73 | Sancti/08-10 | Versum 0 | `@Commune/C2a::s/N\./Laurenti/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 74 | Sancti/08-28 | Versum 0 | `@Commune/C2a::s/N\./Augustíne/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 75 | Sancti/08-29 | Responsory4 | `@Commune/C2a:Responsory2` | Commune/C2a#Responsory2 | — | — | — | **C** | 2 |
| 76 | Sancti/08-29 | Responsory7 | `@Commune/C2a:Responsory5` | Commune/C2a#Responsory5 | — | — | — | **C** | 2 |
| 77 | Sancti/08-29 | Responsory8 | `@Commune/C2a:Responsory6` | Commune/C2a#Responsory6 | — | — | — | **C** | 2 |
| 78 | Sancti/08-29 | Versum 0 | `@Commune/C2a::s/N\./Joánnes Baptísta/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 79 | Sancti/10-04 | Versum 0 | `@Commune/C2a::s/N\./Pater Francísce/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 80 | Sancti/11-09 | Commemoratio 5 | `@Commune/C2:Oratio proper` | Commune/C2#Oratio proper | — | — | — | **C** | 2 |
| 81 | Sancti/11-11 | Versum 0 | `@Commune/C2a::s/N\./Martíne/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 82 | Sancti/11-15 | Versum 0 | `@Commune/C2a::s/N\./Albérte/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 83 | Sancti/11-23 | Responsory1 | `@Commune/C2a` | Commune/C2a#Responsory1 | — | — | — | **C** | 2 |
| 84 | Sancti/11-23 | Responsory2 | `@Commune/C2a` | Commune/C2a#Responsory2 | — | — | — | **C** | 2 |
| 85 | Sancti/11-23 | Responsory3 | `@Commune/C2a` | Commune/C2a#Responsory3 | — | — | — | **C** | 2 |
| 86 | Sancti/11-23 | Versum 0 | `@Commune/C2a::s/N\./Clemens/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 87 | Sancti/12-06 | Versum 0 | `@Commune/C2a::s/N\./Nicoláe/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 88 | Sancti/12-16 | Responsory8 | `@Commune/C2a:Responsory8 non Effusorum` | Commune/C2a#Responsory8 non Effusorum | — | — | — | **C** | 2 |
| 89 | Sancti/12-26 | Versum 1 | `@Commune/C2a` | Commune/C2a#Versum 1 | — | — | — | **C** | 2 |
| 90 | Sancti/12-26 | Commemoratio | `@CommuneCist/C3:Oratio proper` | CommuneCist/C3#Oratio proper | — | — | — | **C** | 4 |
| 91 | Sancti/12-26 | Versum 0 | `@Commune/C2a::s/N\./Stéphane/` | Commune/C2a#Versum 0 | — | — | — | **C** | 2 |
| 92 | Sancti/12-29 | Ant Vespera 3 | `@CommuneCist/C2:Ant Vespera` | CommuneCist/C2#Ant Vespera | — | — | — | **C** | 2 |
| 93 | Sancti/12-29o | Responsory1 | `@Commune/C2a` | Commune/C2a#Responsory1 | — | — | — | **C** | 2 |
| 94 | Sancti/12-29o | Responsory2 | `@Commune/C2a` | Commune/C2a#Responsory2 | — | — | — | **C** | 2 |
| 95 | Sancti/12-29o | Responsory3 | `@Commune/C2a` | Commune/C2a#Responsory3 | — | — | — | **C** | 2 |
| 96 | Sancti/aliquibus locis/10-23-Redemptor | Responsory8 | `@Tempore/Pent01-0` | Tempore/Pent01-0#Responsory8 | — | — | — | **C** | 1 |
| 97 | Sancti/Bavaria/03-27 | Versum 1 | `@Commune/C5a:Versum 2` | Commune/C5a#Versum 2 | — | — | — | **C** | 1 |
| 98 | Sancti/Bavaria/03-27 | Versum 2 | `@Commune/C5a:Versum 1` | Commune/C5a#Versum 1 | — | — | — | **C** | 1 |
| 99 | Sancti/Bavaria/03-27 | Versum 3 | `@Commune/C5a:Nocturn 2 Versum` | Commune/C5a#Nocturn 2 Versum | — | — | — | **C** | 1 |
| 100 | Sancti/Bavaria/Monacensis/07-31-Bathonis | Versum 1 | `@Commune/C5:Versum 2` | Commune/C5#Versum 2 | — | — | — | **C** | 1 |
| 101 | Sancti/Bavaria/Monacensis/07-31-Bathonis | Versum 2 | `@Commune/C5:Versum 1` | Commune/C5#Versum 1 | — | — | — | **C** | 1 |
| 102 | Sancti/Bavaria/Monacensis/09-02 | Versum 1 | `@Commune/C5:Versum 2` | Commune/C5#Versum 2 | — | — | — | **C** | 1 |
| 103 | Sancti/Bavaria/Monacensis/09-02 | Versum 2 | `@Commune/C5:Versum 1` | Commune/C5#Versum 1 | — | — | — | **C** | 1 |
| 104 | Sancti/Bavaria/Monacensis/09-02 | Versum 3 | `@Commune/C5:Versum 1` | Commune/C5#Versum 1 | — | — | — | **C** | 1 |
| 105 | Sancti/Urbis/05-25o | Lectio4 | `@Sancti/05-25o:Lectio94` | Sancti/05-25o#Lectio94 | — | — | — | **C** | 1 |
| 106 | Sancti/Urbis/05-27-JoannisIUrbaniIEleutherii | Lectio5 | `@Sancti:05-25o:Lectio93` | Sancti#05-25o | — | — | — | **C** | 1 |
| 107 | Sancti/Urbis/05-27-JoannisIUrbaniIEleutherii | Lectio6 | `@Sancti:05-26o:Lectio93` | Sancti#05-26o | — | — | — | **C** | 1 |
| 108 | Sancti/Urbis/06-20 | Responsory8 | `@Commune/C2b:Responsory8 non Effusorum` | Commune/C2b#Responsory8 non Effusorum | — | — | — | **C** | 1 |
| 109 | Sancti/Urbis/08-02o | Lectio4 | `@Sancti/08-02o:Lectio4:s/Sed\,.*//` | Sancti/08-02o#Lectio4 | — | — | — | **C** | 1 |
| 110 | Sancti/Urbis/08-02o | Lectio5 | `@Sancti/08-02o:Lectio4:s/.*?(Sed)/$1/ s/Quare\,.*//` | Sancti/08-02o#Lectio4 | — | — | — | **C** | 1 |
| 111 | Sancti/Urbis/08-02o | Lectio6 | `@Sancti/08-02o:Lectio4:s/.*?(Quare)/$1/` | Sancti/08-02o#Lectio4 | — | — | — | **C** | 1 |
| 112 | Sancti/Urbis/09-01 | Versum 1 | `@Commune/C5:Versum 2` | Commune/C5#Versum 2 | — | — | — | **C** | 1 |
| 113 | Sancti/Urbis/09-01 | Versum 2 | `@Commune/C5:Versum 1` | Commune/C5#Versum 1 | — | — | — | **C** | 1 |
| 114 | Sancti/Urbis/10-07t | Lectio4 | `@Sancti/10-07:Lectio93` | Sancti/10-07#Lectio93 | — | — | — | **C** | 1 |
| 115 | Sancti/Urbis/11-13-NicolausI | Oratio 3 | `@Commune/C4-1` | Commune/C4-1#Oratio 3 | — | — | — | **C** | 1 |
| 116 | Sancti/Urbis/11-13-NicolausI-Deusdedit | Lectio4 | `@Sancti/Urbis/11-13-NicolaiI:: s/$/~/` | Sancti/Urbis/11-13-NicolaiI#Lectio4 | — | — | — | **C** | 1 |
| 117 | Sancti/Urbis/11-13-NicolausI-Deusdedit | Lectio4 | `@Sancti/Urbis/11-13-NicolaiI:Lectio5` | Sancti/Urbis/11-13-NicolaiI#Lectio5 | — | — | — | **C** | 1 |
| 118 | Sancti/Urbis/11-13-NicolausI-Deusdedit | Lectio5 | `@Sancti/Urbis/11-13-NicolaiI:Lectio6: s/$/~/` | Sancti/Urbis/11-13-NicolaiI#Lectio6 | — | — | — | **C** | 1 |
| 119 | Sancti/Urbis/11-19o | Lectio4 | `@Sancti/11-19o` | Sancti/11-19o#Lectio4 | — | — | — | **C** | 1 |
| 120 | Tempora/Nat1-0 | Commemoratio | `@Sancti/12-25:Octava` | Sancti/12-25#Octava | — | — | — | **C** | 4 |
| 121 | Tempora/Nat1-0 | Commemoratio | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 122 | Tempora/Nat1-0 | Commemoratio | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 123 | Tempora/Nat1-0 | Commemoratio | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 124 | Tempora/Nat1-0 | Commemoratio 3 | `@Sancti/12-25:Octava` | Sancti/12-25#Octava | — | — | — | **C** | 4 |
| 125 | Tempora/Nat1-0 | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 126 | Tempora/Nat1-0 | Commemoratio 3 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 127 | Tempora/Nat1-0 | Commemoratio 3 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 128 | Tempora/Nat1-0a | Commemoratio 1 | `@Sancti/12-25:Octava` | Sancti/12-25#Octava | — | — | — | **C** | 2 |
| 129 | Tempora/Nat1-0a | Commemoratio 1 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 130 | Tempora/Nat1-0a | Commemoratio 1 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 131 | Tempora/Nat27 | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 132 | Tempora/Nat27 | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 133 | Tempora/Nat28 | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 134 | Tempora/Nat28 | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 135 | Tempora/Nat28 | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 136 | Tempora/Nat28 | Commemoratio 3 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 137 | Tempora/Nat29 | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 138 | Tempora/Nat29 | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 139 | Tempora/Nat29 | Commemoratio 2 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 140 | Tempora/Nat29 | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 141 | Tempora/Nat29 | Commemoratio 3 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 142 | Tempora/Nat29 | Commemoratio 3 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 143 | Tempora/Nat29o | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 144 | Tempora/Nat29o | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 145 | Tempora/Nat29o | Commemoratio 2 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 146 | Tempora/Nat29o | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 147 | Tempora/Nat29o | Commemoratio 3 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 148 | Tempora/Nat29o | Commemoratio 3 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 149 | Tempora/Nat30o | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 150 | Tempora/Nat30o | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 151 | Tempora/Nat30o | Commemoratio 2 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 152 | Tempora/Nat30o | Commemoratio 3 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 153 | Tempora/Nat30o | Commemoratio 3 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 154 | Tempora/Nat30o | Commemoratio 3 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 155 | Tempora/Nat31o | Commemoratio 2 | `@Sancti/12-26:Octava` | Sancti/12-26#Octava | — | — | — | **C** | 2 |
| 156 | Tempora/Nat31o | Commemoratio 2 | `@Sancti/12-27:Octava` | Sancti/12-27#Octava | — | — | — | **C** | 2 |
| 157 | Tempora/Nat31o | Commemoratio 2 | `@Sancti/12-28:Octava` | Sancti/12-28#Octava | — | — | — | **C** | 2 |
| 158 | Tempora/Pasc6-0 | Commemoratio | `@TemporaCist/Pasc5-4:Oratio` | TemporaCist/Pasc5-4#Oratio | — | — | — | **C** | 2 |
| 159 | Tempora/Pent02-0 | Commemoratio | `@TemporaCist/Pent01-4:Oratio` | TemporaCist/Pent01-4#Oratio | — | — | — | **C** | 4 |
| 160 | Tempora/Pent02-2 | Ant 2 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant 2 | — | — | — | **C** | 2 |
| 161 | Tempora/Pent02-2 | Ant Vespera 3 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant Vespera 3 | — | — | — | **C** | 2 |
| 162 | Tempora/Pent02-2 | Ant 3 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant 3 | — | — | — | **C** | 2 |
| 163 | Tempora/Pent02-3 | Ant 2 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant 2 | — | — | — | **C** | 2 |
| 164 | Tempora/Pent02-3 | Ant Vespera 3 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant Vespera 3 | — | — | — | **C** | 2 |
| 165 | Tempora/Pent02-3 | Ant 3 | `@Tempora/Pent01-5` | Tempora/Pent01-5#Ant 3 | — | — | — | **C** | 2 |
| 166 | Tempora/Pent06-1 | Responsory2 | `@TemporaM/Pent01-3:Responsory2` | TemporaM/Pent01-3#Responsory2 | — | — | — | **C** | 2 |

## 2. Missing-translation census (Route A cross-translation, en masse)

| Area | Sections | Latin-only (no English) | English-only (no Latin) |
|---|---|---|---|
| Horas | 17593 | 7467 | 119 |
| Sancti | 7645 | 2661 | 57 |
| Tempora | 7050 | 2275 | 45 |
| Commune | 1641 | 794 | 5 |
| Psalterium | 1007 | 385 | 37 |
| Ordo | 21 | 14 | 0 |
| **Total** | **34957** | **13596** (38.9%) | **263** |

- **Latin-only → Route A English cross-translation** (hieratic register, DR-consistent vocabulary), flagged `meta.translationSupplied = 'en'`.
- **English-only → Route A ecclesiastical-Latin transcription** (metre/constructions matched), flagged `meta.translationSupplied = 'la'`. Samples: `Tempora/Pasc3-2Feria#Ant 3`, `Tempora/Pasc6-4r#Lectio5`, `Tempora/Pasc6-4r#Lectio6`, `Tempora/Pasc6-4r#Lectio8`, `Tempora/Pent02-0o#Rank`, `Tempora/Pent02-0r#Lectio4` …

## 3. Rendering contract

Supplied content renders in every theme via the token pair `--supplied-ink` / `--supplied-bg` (lighter-weight ink, tinted background), with a per-section provenance affordance (hover/tap shows route + source + fill-log row). Gauntlet row O-16 admits a `textus deest` placeholder ONLY if this register lists it — after Routes A–C run at ingest v3, the expected shipped-placeholder count is **0**.
