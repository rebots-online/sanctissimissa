# Gregorian Chant and Mass Reference — research and product proposal

Date: 2026-09-13. Status: researched proposal; no claim that these features or content imports exist. Scope: two new sidebar destinations for SanctissiMissa. This brief does not inspect implementation source, replace the architecture entity table, or authorize coder work. The architect must promote the chosen design into the architecture and an executable checklist after design review.

## Product recommendation

Add **Gregorian Chant** and **Mass Reference** as visible sidebar destinations. Join them to the selected Mass, calendar, Library reader, and personal study tools through stable content references. A parish director should be able to prepare next Sunday's music; a person in the pew should be able to understand and learn the same chants in the order they encounter them.

The default planning profile is **Roman Missal 1962**. A future current Roman Missal profile must be separately selected and separately sourced. Every plan, score recommendation, posture instruction, exported booklet, and shared link carries the profile and locale. A Gregorian melody alone does not identify the applicable liturgical rules.

The product should distinguish prescribed text, a permitted musical setting or option, and an additional devotional hymn. Attractive hymns must not silently replace the Mass propers. Suggested difficulty describes the performance task; it never changes the required text.

## Gregorian Chant navigation and screens

| Screen | Practical result |
|---|---|
| Today / Upcoming Mass | See the selected celebration, why it was selected, its ordered chants, and what is available offline. |
| Plan a Mass | Resolve calendar and local observance; choose appropriate Ordinary settings; allocate singers; prepare a rehearsal set and service booklet. |
| Learn through the Mass | Follow the Mass order with a brief explanation, text, translation, score, practice audio, and a clear indication of who sings. |
| Browse Chants | Filter by liturgical function, season, celebration, incipit, scriptural reference, mode, difficulty, source edition, notation, language, and available media. |
| My Rehearsal Sets | Resume practice, loop difficult phrases, review director notes, and keep private recordings and progress. |

Keep the catalogue accessible in an ordinary list as well as score cards. Latin incipits need accent-insensitive search; show the normalized Latin title and the source's spelling. For most Gregorian works, attribution is traditional or anonymous: browse by source or tradition as well as author, rather than inventing named composers.

### Plan a Mass flow

1. Start from the calendar or choose a date and parish profile. The parish profile contains country, diocese, parish patron/dedication, supported local calendar, liturgical edition, language, and time zone.
2. Resolve the celebration and permissible alternatives. Show the source behind the decision. Identify Mass type, including sung/solemn/low Mass, Requiem, votive, nuptial, and special ceremonies. A manually selected observance is visibly a director choice; preserve its reason and source.
3. Generate an ordered run sheet with variable-length reading/chant groups. Each item shows its function, incipit, source page, assigned singer(s), score/translation/audio availability, and explanation of any omission.
4. Offer compatible Ordinary settings and chant editions. Display seasonal associations as guidance where appropriate, not as a claim that one numbered Kyriale Mass is universally mandatory for that season.
5. Assign priest/deacon/cantor/schola/congregation roles and pronunciation or breath notes. Mark familiar/new/rehearse. Estimate rehearsal effort from the actual selected settings and local notes, without claiming a universal difficulty ranking.
6. Preview a director run sheet, schola score packet, and congregation booklet. Export only assets whose rights permit that export, with source and license credits. Congregation output omits private director and member notes.
7. Save a revision. Share an explicit frozen revision so changes made after rehearsal do not silently alter everyone's music. Copying a plan to another date re-resolves the liturgical data and asks the director to review incompatible selections.

### Rule cases that the design must make representable

The following are requirements for curated rules and review fixtures, not a complete rubric engine specification:

| Case | Design requirement |
|---|---|
| Ordinary Sunday or feast | Proper text and Ordinary choice remain separate. Gloria and Credo eligibility are resolved independently. |
| Septuagesima and Lent | Seasonal suppression/replacement of Alleluia must come from the selected 1962 formulary; never apply a current-rite Lent-only switch. |
| Easter | Support two-Alleluia arrangements where assigned, octave-specific material, and the transition back to other patterns. |
| Ember days | Permit additional reading/chant groups and the applicable full or shorter Saturday order. |
| Requiem | Use its distinct text, Ordinary, dismissal, and sequence conditions; funeral rites after Mass are separate ordered stages. |
| Holy Week | Model Palm Sunday procession, Good Friday liturgy, and Easter Vigil as their own service orders. Do not force them into an ordinary Sunday template. |
| Local feasts and transferred Sundays | Resolve local propers and precedence; show an unsupported calendar explicitly instead of substituting unrelated chants. |

Concrete 1962 verification anchors include the **1960 Code of Rubrics**, nos. 298 (transferred Sundays), 399 (Dies irae), 467–470 (readings and sequence order), 475–476 (Credo), 477 (Vigil Offertory omission), and 507 (dismissal). Sequence placement differs from the current GIRM's no. 64. These differences make edition-specific ordered data essential. Sources: [official 1960 rubrics, AAS 52](https://www.vatican.va/archive/aas/documents/AAS-52-1960-ocr.pdf) and [GIRM, including US adaptations](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html).

### Practice and participation

**Director/schola mode:** complete score, larger notation, phrase-level marks, rehearsal order distinct from liturgical order, sung text and literal translation, editable starting pitch, instrument-free reference tone, A–B loops, playback speed with pitch preservation, and private rehearsal recordings. A synthetic melody is labeled as a pitch demonstration; it does not teach an authoritative interpretation of rhythm or pronunciation.

**Congregation mode:** show the parts assigned to the congregation, simple explanations, pronunciation help, and deliberate practice segments. Avoid presenting a vocalist's entire solo line as something every participant must sing.

**During-Mass mode:** quiet score/text view, large manual next/previous controls, offline operation, no autoplay, purchase prompts, progress rewards, or automatic microphone activation. Practice playback is a rehearsal tool. The 1958 instruction distinguishes recorded teaching aids from machines replacing singers in the liturgy; it also has detailed seasonal rules for instrumental support and exceptions. Cite the selected profile's reviewed guidance rather than a generic “organ allowed” badge. Source: [De musica sacra et sacra liturgia, nos. 71 and 80–85, AAS 50 (1958), pp. 652–655](https://www.vatican.va/archive/aas/documents/AAS-50-1958-ocr.pdf).

**Study tools:** bookmarks, text highlights, annotations, comments, and recordings should use the same conceptual services as Library study. Text marks anchor to a stable edition/segment; musical marks additionally anchor to score revision and phrase/neume coordinates; audio notes anchor to track revision and time range. A later score correction must never silently move a user's mark onto different music. Private recordings remain private unless explicitly shared.

## Preliminary content programme

This is an acquisition and editorial programme, not a claim that the scores, translations, or audio have been downloaded and cleared.

| Collection | Preliminary scope and purpose |
|---|---|
| Mass essentials | Kyriale Masses I–XVIII; associated dismissals where supplied; Credo settings; common dialogues and responses. Start teaching with a small familiar subset, while preserving the wider collection. |
| Sunday propers | Every Sunday and required festal observance of the supported 1962 general calendar, with Introit, interlection chants, Offertory, and Communion. Include explicit coverage for Advent, Christmas/Epiphany, Septuagesima, Lent/Passiontide, Easter/Ascension/Pentecost and time after Pentecost. |
| Common and occasional Masses | Commons of saints; Requiem; nuptial and permitted votive formularies; local calendars added only with a documented source. |
| Holy Week and processions | Palm Sunday, Holy Thursday, Good Friday, Easter Vigil, Rogations and other supported processions. Each receives its own reviewed order. |
| Eucharistic learning | Adoro te devote, Ave verum corpus, O salutaris Hostia, Pange lingua/Tantum ergo, Panis angelicus; each setting identified individually. |
| Marian learning | Alma Redemptoris Mater, Ave Regina caelorum, Regina caeli, Salve Regina, Ave maris stella. Distinguish Office/devotional use from Mass assignments. |
| Seasonal learning | Creator alme siderum, Veni veni Emmanuel, Attende Domine, Parce Domine, Vexilla Regis, Crux fidelis, O filii et filiae, Veni Creator Spiritus and Te Deum. |
| Notation and Latin | Four-line staff, C/F clefs, intervals, common neumes, phrasing, text accent, ecclesiastical Latin pronunciation, psalm tones and antiphon/verse structure. Present interpretative traditions accurately and identify the selected teaching method. |

Acquisition sources include the [CMAA resource collection](https://musicasacra.com/resource-lists/) and [GregoBase's source-indexed catalogue](https://gregobase.selapa.net/scores.php). The CMAA list separates historical Roman books, current-rite books, religious-order sources, and teaching resources. Use those distinctions in the catalogue. Older musical witnesses can supply eligible melodies but cannot supply a 1962 calendar merely by being old.

Release the first **complete named scope**, such as “1962 General Calendar: Sundays and principal feasts,” only after every event in that scope has verified mappings and source references. Until then show a specific coverage statement and the unavailable items; do not advertise “complete Gregorian chant for every Mass.”

## Rights and purchase/download boundaries

Track these independently for every asset: original words; translation; melody; edition/arrangement/editorial markings; GABC transcription; scan/typesetting; performance recording; contributor annotations. Store the rights holder, license or public-domain basis, applicable territory, source URL, source edition/year/page, attribution text, evidence date, redistribution/export permission, and checksum.

The principal verified findings are:

- **GregoBase** states that its chant transcriptions are CC0. That is a useful transcription permission, not a warranty that a recent underlying composition or edition has no other rights. [GregoBase About](https://gregobase.selapa.net/?page_id=2).
- **GABC** has separate `gabc-copyright` and `score-copyright` headers. Preserve both during import. This distinction is directly supported by the [Gregorio format documentation](https://gregorio-project.github.io/gabc/index.html). Its [legal-issues page](https://gregorio-project.github.io/legalissues.html) contains dated copyright-term examples and should not be treated as current legal clearance.
- **Parish Book of Chant, second edition:** its colophon identifies CMAA's work as CC BY 3.0 and separately reserves copyright in ICEL's 2010 English Roman Missal excerpts. Select eligible components; do not mark the whole PDF public domain. The PDF text extraction was partially garbled, so the colophon must be visually checked during asset clearance. [Publisher PDF, PDF page 5](https://media.churchmusicassociation.org/books/pbc_2nd.pdf#page=5).
- **CMAA practice audio:** the publisher provides professional tracks and says they are freely downloadable. The inspected page did not supply an explicit commercial redistribution grant for those recordings. Link to them while clearance is unresolved; obtain a documented grant or commission recordings before bundling them in paid downloads. [Publisher's recording and score description](https://churchmusicassociation.org/pbc0/).
- A composition and a performance recording are separate protected works, commonly licensed separately. Ancient chant does not make a modern recording free to resell. [US Copyright Office explanation](https://www.copyright.gov/engage/musicians/).

Purchase state and rights state are separate. A successful payment cannot release an uncleared asset. Conversely, subscription expiry must not erase personal notes or change the underlying public-domain status. Preserve accessible license notices and any reuse freedoms required by the supplied license; payment may cover curation, corrected editions, hosting, recorded lessons, and parish workflow services.

Recommended commercial division, subject to the parent's payment architecture: free Mass-order reference and an introductory chant collection; individual offline study packs and commissioned recording packs as durable purchases; optional parish tools for shared planning, revision distribution, and rehearsal administration. Identify precisely whether a purchase licenses one individual or a parish's agreed use. Avoid implying ownership of public-domain prayer itself.

## Mass Reference

Make this an indexed reference and a contextual companion to today's Mass. Its landing page offers **Walk through the Mass**, **What am I seeing?**, **Words and objects**, **The liturgical year**, and **Sources**.

Each Mass-stage article answers: what happens; who acts or sings; what the prayer expresses; what varies by the selected edition and celebration; what the congregation may do; and where the source says so. Offer an expandable original source citation with edition, paragraph/page, language and publication date. A doctrinal explanation, a ceremonial rule, historical commentary, and an approved local custom receive different labels.

Preliminary reference contents:

| Group | Articles |
|---|---|
| The whole Mass | Eucharistic sacrifice and thanksgiving; Word and Eucharist; priest and congregation; ordinary/propers; silent prayer and participation. |
| 1962 walkthrough | Preparation and prayers at the foot; Introit; Kyrie; Gloria; Collect; lessons and intervening chants; Gospel; homily; Credo; Offertory; Secret; Preface; Sanctus/Benedictus; Roman Canon; Pater noster; Agnus Dei; Communion; Postcommunion; dismissal/blessing; Last Gospel and exceptions. |
| Things one sees | Altar and sanctuary; vestments and colours; vessels and linens; incense; candles; bells; signs of the cross; bows and genuflections. |
| Celebrations and calendars | Temporal/sanctoral; feast precedence; parish patrons/dedications; Low/Sung/Solemn Mass; Requiem; votives; Ember and Rogation days; Holy Week. |
| Participating and learning | Following Latin; understanding the readings; responses; when to sing; posture and accessibility; preparation and thanksgiving; glossary and pronunciation. |
| Further reading | Link stage-specific passages to eligible Library works, including historical Mass commentaries, with author/date and a distinction between interpretation and binding rubrics. |

The [Catechism's account of the Eucharistic celebration, nos. 1345–1355](https://www.vatican.va/content/catechism/en/part_two/section_two/chapter_one/article_3/iv_the_liturgical_celebration_of_the_eucharist.html) can ground original explanatory summaries about the unity and meaning of the celebration. Link to modern official texts; do not assume permission to bundle an entire modern translation.

For posture, distinguish celebrant/ministers, clerical choir, schola, and congregation. Do not copy rubrics addressed to clergy in choir into universal instructions for every lay person. For a future current-rite profile, GIRM no. 43 and territorial adaptations matter; the Vatican English page used in this research expressly includes **US adaptations**, so it must not become a silent Canadian or worldwide default. Source: [GIRM](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html).

## Design contract and release readiness

Design review should cover six linked screens: chant landing; Mass-plan editor; schola rehearsal reader; congregation lesson; Mass Reference landing; contextual Mass-stage article. Show desktop sidebar and narrow-screen navigation, score zoom, long Latin text, missing audio, incomplete coverage, offline state, rights-restricted export, and a saved annotation. The score needs selectable or accessible text alongside the image/SVG.

Before implementation tasks, the architecture must name the exact entities for the liturgical profile, resolved celebration, chant work versus score edition, ordered service stage, chosen setting, rehearsal set, recording, rights evidence, and Mass-reference article. Record the mapping to shared reader/annotation services and design screen IDs there. This proposal intentionally does not invent existing implementation filenames or signatures.

**Functionality gate:** deterministic plan resolution; ordered variable stages; edit/save/revision behavior; explicit profile and locale; offline score/text access; shared annotation persistence; usable rehearsal controls; accessible navigation; rights-aware exports; no automatic playback in Mass view.

**Data gate:** the advertised calendar scope is fully mapped; the transcription is checked against its declared edition; article/rubric claims have precise sources; local custom is identified; rights are cleared per included asset and sale territory; every released recording matches its advertised score edition. Passing the functionality gate alone does not establish corpus completeness.

**Independent review:** a competent 1962 liturgy reviewer and a practising chant director should review the release dataset and service outputs. Record this as an editorial/operator protocol. Automated acceptance should assert reproducible committed fixtures, content coverage, entity references, and export behavior; live external-site checks and manual choir rehearsals are not idempotent checklist acceptance clauses.

**Release blockers:** unresolved 1962/calendar/locale contract; unidentified source editions; incomplete mappings inside the advertised scope; unclear score or recording resale rights; insufficient annotation anchors; or missing parish sharing/purchase semantics. Lack of a recording for a clearly labeled text-and-score pack does not block that pack. A missing supported-date proper does block a claim of complete planning for that scope.

## Proposed deterministic seed fixtures

These inputs are resolved liturgical cases, not assumptions about the current device date. The parent architecture must commit the final entity vocabulary and local fixture paths before dispatch. Compare committed expected output; the test must not contact the Vatican or infer a locale from the machine.

| Fixture ID | Input | Expected assertion | Source anchor |
|---|---|---|---|
| `chant-1962-ember-saturday-full` | 1962 Ember Saturday, conventual Mass, full order | Five lessons precede the Epistle; preserve each intervening group in order. | 1960 Rubrics 468. |
| `chant-1962-easter-vigil` | 1962 Easter Vigil Mass | No Offertory antiphon, no Credo, no Last Gospel. | 1960 Rubrics 476, 477, 510. |
| `chant-1962-requiem-dismissal` | 1962 Mass for the dead | Dismissal is Requiescant in pace, response Amen. | 1960 Rubrics 507. |
| `chant-1962-sequence-order` | 1962 formulary containing a sequence and Alleluia | Sequence precedes the last Alleluia. | 1960 Rubrics 470. |
| `chant-current-sequence-order` | Separately selected current Roman Missal profile, Easter Sunday | Sequence precedes Alleluia and is required. | GIRM 64. |
| `chant-unresolved-locale` | Calendar profile absent from committed coverage manifest | Report unsupported coverage; produce no guessed proper assignments. | Product requirement. |
| `chant-score-only-rights` | Eligible score and translation; recording redistribution unresolved | Offline score pack succeeds; audio is not included or advertised as purchased. | Product requirement and per-asset rights distinction. |
| `chant-private-note-export` | Plan with a private note and public source credit | Congregation export excludes the note and retains the credit. | Product requirement. |

Rubric sources: [1960 official rubrics](https://www.vatican.va/archive/aas/documents/AAS-52-1960-ocr.pdf) and [GIRM](https://www.vatican.va/roman_curia/congregations/ccdds/documents/rc_con_ccdds_doc_20030317_ordinamento-messale_en.html). None of these fixtures establishes full-year completeness or the correctness of a melody transcription.

Starter article records should contain stable ID, display title, applicable profile, Mass-stage reference, original summary, source URL and paragraph, and editorial status. Suggested initial records:

| Record ID | Title | Source and bounded editorial purpose |
|---|---|---|
| `mass-reference-eucharistic-celebration` | Understanding the celebration | Catechism 1345–1355: an original introductory explanation of its meaning and unity. |
| `mass-reference-1962-chant-sequence` | The chants between the readings | 1960 Rubrics 467–470: source-linked explanation of variable stages. |
| `mass-reference-1962-dismissal` | The end of Mass | 1960 Rubrics 507–510: explain why particular concluding elements vary. |
| `mass-reference-posture-local-practice` | Posture and local practice | Explain that the profile, role, and territory determine the applicable source; identify GIRM's US adaptation explicitly. |
| `chant-reference-practise-at-home` | Learning before Sunday | 1958 instruction 71: explain the distinction between rehearsal playback and participation at Mass. |
| `chant-reference-editions-and-recordings` | Reading a chant's source label | Gregorio GABC header documentation and US Copyright Office recording guidance: explain why edition and recording credits are separate. |

These are proposed records to author and review, not placeholders to expose as completed articles or sell as finished content.
