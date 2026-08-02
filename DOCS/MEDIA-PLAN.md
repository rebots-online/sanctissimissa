# Media Plan — map flyout assets

Every photo/video the map flyouts reserve space for. Source of truth for the
*definitions* is `src/core/model/stationLore.ts` (`STATION_INFO` / `HOUR_INFO`);
this table is the production inventory — regenerate it when entries there
change. Until an asset ships, the flyout renders the slot as an explicitly
flagged **planned** placeholder (never fabricated content).

Conventions: assets live under `media/stations/` (bundled with the app, same
offline-first rule as the corpus); video ≤ 20 s, silent-loop friendly, 16:9;
photos ≥ 1600 px wide. All captures from celebrations of the 1962 books or
period-appropriate liturgical books.

## Mass stations (31)

| Asset ID | Station | Kind | Content to create | Status |
|----------|---------|------|-------------------|--------|
| `media/stations/asperges.mp4` | Asperges me | video | Priest in cope sprinkling clergy and faithful down the nave; aspergillum close-up. | needed |
| `media/stations/iudica.mp4` | Iudica me (Ps. 42) | video | Priest and servers at the altar steps, alternating the psalm; low angle from the sanctuary floor. | needed |
| `media/stations/confiteor.mp4` | Confiteor | video | Deep bow at the Confiteor; striking of the breast at mea culpa, three beats. | needed |
| `media/stations/introitus.jpg` | Introitus | photo | Illuminated Introit page of a Missale Romanum with the day's antiphon rubricated. | needed |
| `media/stations/kyrie.jpg` | Kyrie eleison | photo | Kyrie from a chant book (square notation, Mass VIII), candlelit. | needed |
| `media/stations/gloria.mp4` | Gloria in excelsis | video | Celebrant intoning Gloria in excelsis Deo at the altar, bells briefly rung, full choir answering. | needed |
| `media/stations/oratio.jpg` | Oratio (Collecta) | photo | Priest at the missal, hands extended in the orans posture; server lifting the missal cover. | needed |
| `media/stations/lectio-l1.jpg` | Lectio prior (Ember) | photo | Open missal showing the sequence of Ember Saturday lessons with their collects. | needed |
| `media/stations/graduale-l1.jpg` | Graduale I (Ember) | photo | Chant book detail: Ember-day gradual verse in square notation. | needed |
| `media/stations/oratio-l1.jpg` | Oratio altera (Ember) | photo | Missal page with Flectamus genua rubric before the Ember collect. | needed |
| `media/stations/lectio.mp4` | Lectio (Epistola) | video | Subdeacon chanting the Epistle on the epistle side, book held by hands or lectern. | needed |
| `media/stations/graduale.jpg` | Graduale | photo | Gradual in square notation with its melismatic verse, gold-edged folio. | needed |
| `media/stations/alleluia.jpg` | Alleluia | photo | Alleluia with jubilus notated in full, from a gradual book. | needed |
| `media/stations/tractus.jpg` | Tractus | photo | Tract of the First Sunday of Lent (Qui habitat) spanning a full page of chant. | needed |
| `media/stations/graduale-p.jpg` | Alleluia paschale | photo | Paschal Mass page: doubled Alleluia rubricated Tempore Paschali. | needed |
| `media/stations/evangelium.mp4` | Evangelium | video | Gospel procession with candles and incense; deacon chanting from the north side. | needed |
| `media/stations/credo.mp4` | Credo | video | Congregation kneeling in unison at the Incarnatus during a sung Credo. | needed |
| `media/stations/offertorium.mp4` | Offertorium | video | Paten and host offered at eye level; chalice prepared with wine and the drop of water. | needed |
| `media/stations/lavabo.mp4` | Lavabo (Ps. 25) | video | Close-up: server pouring water over the priest's fingertips, towel and cruets. | needed |
| `media/stations/orate-fratres.mp4` | Orate, fratres | video | Priest turning to face the people mid-sanctuary for the Orate fratres, then back. | needed |
| `media/stations/secreta.jpg` | Secreta | photo | Missal detail: Secreta text with its silent-voice rubric. | needed |
| `media/stations/praefatio.mp4` | Praefatio | video | Sung Preface dialogue (Sursum corda) with the celebrant's extended hands. | needed |
| `media/stations/sanctus.mp4` | Sanctus | video | Bells at the Sanctus; servers kneeling, torches entering at a Solemn Mass. | needed |
| `media/stations/canon.mp4` | Canon Missae | video | The elevation of the Host and the chalice in silence, bells and incense; shot from the nave through candlelight. | needed |
| `media/stations/pater-noster.jpg` | Pater noster | photo | Missal page: Pater noster with the embolism Libera nos quæsumus. | needed |
| `media/stations/agnus-dei.mp4` | Agnus Dei | video | The fraction over the chalice during the Agnus Dei; particle placed in the chalice. | needed |
| `media/stations/communio.mp4` | Communio | video | Faithful kneeling along the communion rail, houseling cloth over the rail. | needed |
| `media/stations/postcommunio.jpg` | Postcommunio | photo | Priest at the missal for the Postcommunion, chalice veiled again. | needed |
| `media/stations/super-populum.jpg` | Oratio super populum | photo | Rubric and text of an Oratio super populum with Humiliate capita vestra Deo. | needed |
| `media/stations/ite.mp4` | Ite, missa est | video | Deacon turning to chant Ite missa est; the festive tone mirrored from the Kyrie. | needed |
| `media/stations/ultimum-evangelium.mp4` | Ultimum Evangelium | video | Priest reading John 1 from the altar card, genuflecting at Et Verbum caro factum est. | needed |

## Canonical hours (8)

| Asset ID | Hour | Kind | Content to create | Status |
|----------|------|------|-------------------|--------|
| `media/stations/hour-matutinum.jpg` | Matutinum | photo | Choir stalls by candlelight before dawn, open antiphonal. | needed |
| `media/stations/hour-laudes.jpg` | Laudes | photo | East window at sunrise over the choir; psalter open to the Laudate psalms. | needed |
| `media/stations/hour-prima.jpg` | Prima | photo | Martyrology lectern with the day's entry; morning light on a chapter room. | needed |
| `media/stations/hour-tertia.jpg` | Tertia | photo | Mid-morning light through a rose window; breviary open at Terce. | needed |
| `media/stations/hour-sexta.jpg` | Sexta | photo | Noon shadow on a sundial inscribed with a psalm verse. | needed |
| `media/stations/hour-nona.jpg` | Nona | photo | Late-afternoon light falling on a crucifix; breviary at None. | needed |
| `media/stations/hour-vesperae.mp4` | Vesperae | video | Sung Vespers: incensation of the altar during the Magnificat. | needed |
| `media/stations/hour-completorium.mp4` | Completorium | video | Salve Regina by candlelight at the end of Compline, church otherwise dark. | needed |

**Totals: 39 assets — 19 video, 20 photo.**
