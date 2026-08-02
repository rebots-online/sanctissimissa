/**
 * Station and hour companion notes — the "what is this?" layer behind the
 * map flyouts. One-breath descriptions (sober, factual register) plus the
 * planned media asset for each stop; the full four-field historical lore
 * (what/origins/evolution/novusOrdo — CHECKLIST C1) will join this file.
 *
 * Media assets are PLANNED, not present: the flyout renders the slot as an
 * explicitly-flagged placeholder until the asset ships (no fabricated
 * content). The complete inventory lives in DOCS/MEDIA-PLAN.md — regenerate
 * that table when entries here change.
 */

export interface PlannedMedia {
  /** Asset path under the app's media root, e.g. media/stations/canon.mp4 */
  id: string;
  kind: 'video' | 'photo';
  /** What the asset should show — doubles as the production brief. */
  caption: string;
}

export interface StationInfo {
  /** 1–2 sentences: what this section or reading is about. */
  about: string;
  media: PlannedMedia;
}

const v = (id: string, caption: string): PlannedMedia => ({ id: `media/stations/${id}.mp4`, kind: 'video', caption });
const p = (id: string, caption: string): PlannedMedia => ({ id: `media/stations/${id}.jpg`, kind: 'photo', caption });

export const STATION_INFO: Record<string, StationInfo> = {
  asperges: {
    about: 'The Sunday sprinkling of holy water before the principal Mass, recalling baptism; in Paschaltide it becomes the Vidi aquam.',
    media: v('asperges', 'Priest in cope sprinkling clergy and faithful down the nave; aspergillum close-up.'),
  },
  iudica: {
    about: 'Psalm 42 recited at the foot of the altar — the priest’s approach: “I will go in unto the altar of God, to God who giveth joy to my youth.”',
    media: v('iudica', 'Priest and servers at the altar steps, alternating the psalm; low angle from the sanctuary floor.'),
  },
  confiteor: {
    about: 'The double confession of sin — the priest’s, then the ministers’ — with the plea for the saints’ intercession before ascending to the altar.',
    media: v('confiteor', 'Deep bow at the Confiteor; striking of the breast at mea culpa, three beats.'),
  },
  introitus: {
    about: 'The proper entrance chant — antiphon, psalm verse and Gloria Patri — that announces the mystery of the day.',
    media: p('introitus', 'Illuminated Introit page of a Missale Romanum with the day’s antiphon rubricated.'),
  },
  kyrie: {
    about: 'The ninefold Greek plea for mercy, three to each Divine Person — the oldest Greek remnant in the Roman Mass.',
    media: p('kyrie', 'Kyrie from a chant book (square notation, Mass VIII), candlelit.'),
  },
  gloria: {
    about: 'The angelic hymn from Bethlehem expanded into a doxology of praise; sung on feasts, omitted in penitential seasons and Requiems.',
    media: v('gloria', 'Celebrant intoning Gloria in excelsis Deo at the altar, bells briefly rung, full choir answering.'),
  },
  oratio: {
    about: 'The Collect — the day’s proper prayer that gathers (“collects”) the whole assembly’s intention into one petition offered through Christ.',
    media: p('oratio', 'Priest at the missal, hands extended in the orans posture; server lifting the missal cover.'),
  },
  'lectio-l1': {
    about: 'The additional Ember-Day lesson read before the Epistle on the quarterly fast days — an older, fuller cycle of readings preserved four weeks a year.',
    media: p('lectio-l1', 'Open missal showing the sequence of Ember Saturday lessons with their collects.'),
  },
  'graduale-l1': {
    about: 'The chant answering the Ember lesson, as the Gradual answers the Epistle.',
    media: p('graduale-l1', 'Chant book detail: Ember-day gradual verse in square notation.'),
  },
  'oratio-l1': {
    about: 'The second collect of the Ember Day, following its lesson — prayer and reading alternating in the ancient vigil pattern.',
    media: p('oratio-l1', 'Missal page with Flectamus genua rubric before the Ember collect.'),
  },
  lectio: {
    about: 'The Epistle — the day’s first reading, usually apostolic, chanted by the subdeacon at Solemn Mass facing the altar.',
    media: v('lectio', 'Subdeacon chanting the Epistle on the epistle side, book held by hands or lectern.'),
  },
  graduale: {
    about: 'The meditative chant after the Epistle — the most ancient and most ornate of the proper chants, a psalm distilled to two verses.',
    media: p('graduale', 'Gradual in square notation with its melismatic verse, gold-edged folio.'),
  },
  alleluia: {
    about: 'The joyful acclamation with its proper verse, preparing the Gospel; its final vowel carries the long jubilus melisma.',
    media: p('alleluia', 'Alleluia with jubilus notated in full, from a gradual book.'),
  },
  tractus: {
    about: 'The penitential substitute for the Alleluia from Septuagesima through Lent — psalm verses sung straight through, “in one tract.”',
    media: p('tractus', 'Tract of the First Sunday of Lent (Qui habitat) spanning a full page of chant.'),
  },
  'graduale-p': {
    about: 'In Paschaltide the Gradual itself gives way to a second Alleluia — two proper verses of paschal joy where penance once stood.',
    media: p('graduale-p', 'Paschal Mass page: doubled Alleluia rubricated Tempore Paschali.'),
  },
  evangelium: {
    about: 'The day’s Gospel — the summit of the Mass of the Catechumens, heard standing, greeted with signs of the cross on brow, lips and breast.',
    media: v('evangelium', 'Gospel procession with candles and incense; deacon chanting from the north side.'),
  },
  credo: {
    about: 'The Nicene-Constantinopolitan Creed professed on Sundays and greater feasts; all kneel at Et incarnatus est.',
    media: v('credo', 'Congregation kneeling in unison at the Incarnatus during a sung Credo.'),
  },
  offertorium: {
    about: 'The proper antiphon accompanying the offering of bread and wine and the preparation of the altar for the Sacrifice.',
    media: v('offertorium', 'Paten and host offered at eye level; chalice prepared with wine and the drop of water.'),
  },
  lavabo: {
    about: 'The washing of the priest’s fingers with Psalm 25 — “I will wash my hands among the innocent” — purity asked before the Canon.',
    media: v('lavabo', 'Close-up: server pouring water over the priest’s fingertips, towel and cruets.'),
  },
  'orate-fratres': {
    about: 'The priest’s turn to the people: pray, brethren, that my sacrifice and yours may be acceptable to God the Father almighty.',
    media: v('orate-fratres', 'Priest turning to face the people mid-sanctuary for the Orate fratres, then back.'),
  },
  secreta: {
    about: 'The proper prayer over the offerings, said in silence — the “secret” — and concluded aloud with Per omnia sæcula sæculorum.',
    media: p('secreta', 'Missal detail: Secreta text with its silent-voice rubric.'),
  },
  praefatio: {
    about: 'The solemn thanksgiving that opens the way to the Canon — common, seasonal or festal — ending in the Sanctus.',
    media: v('praefatio', 'Sung Preface dialogue (Sursum corda) with the celebrant’s extended hands.'),
  },
  sanctus: {
    about: 'The thrice-holy of Isaias joined to the Benedictus of Palm Sunday — earth’s praise joining heaven’s as the Canon begins.',
    media: v('sanctus', 'Bells at the Sanctus; servers kneeling, torches entering at a Solemn Mass.'),
  },
  canon: {
    about: 'The Roman Canon — the still center of the Mass, said in silence: Te igitur through the consecration to the final doxology.',
    media: v('canon', 'The elevation of the Host and the chalice in silence, bells and incense; shot from the nave through candlelight.'),
  },
  'pater-noster': {
    about: 'The Lord’s Prayer with its embolism Libera nos — the ancient bridge from the Canon to Communion.',
    media: p('pater-noster', 'Missal page: Pater noster with the embolism Libera nos quæsumus.'),
  },
  'agnus-dei': {
    about: 'The threefold Lamb of God during the fraction of the Host, pleading mercy, mercy, and peace.',
    media: v('agnus-dei', 'The fraction over the chalice during the Agnus Dei; particle placed in the chalice.'),
  },
  communio: {
    about: 'The proper antiphon sung while the faithful communicate — the day’s mystery received and tasted.',
    media: v('communio', 'Faithful kneeling along the communion rail, houseling cloth over the rail.'),
  },
  postcommunio: {
    about: 'The proper thanksgiving after Communion, asking that the sacrament received bear its fruit in life.',
    media: p('postcommunio', 'Priest at the missal for the Postcommunion, chalice veiled again.'),
  },
  'super-populum': {
    about: 'On Lenten ferias, a final proper “prayer over the people,” received bowed — the old daily blessing of the fasting Church.',
    media: p('super-populum', 'Rubric and text of an Oratio super populum with Humiliate capita vestra Deo.'),
  },
  ite: {
    about: 'The dismissal — Ite, missa est, answered Deo gratias; Benedicamus Domino on days the Gloria was not said.',
    media: v('ite', 'Deacon turning to chant Ite missa est; the festive tone mirrored from the Kyrie.'),
  },
  'ultimum-evangelium': {
    about: 'The Last Gospel — the Prologue of St. John read at the Gospel side as the Mass’s final contemplation: Et Verbum caro factum est.',
    media: v('ultimum-evangelium', 'Priest reading John 1 from the altar card, genuflecting at Et Verbum caro factum est.'),
  },
};

export const HOUR_INFO: Record<string, StationInfo> = {
  matutinum: {
    about: 'The night office — invitatory, hymn, and nocturns of psalms with lessons; the Church’s longest hour, kept in vigil before dawn.',
    media: p('hour-matutinum', 'Choir stalls by candlelight before dawn, open antiphonal.'),
  },
  laudes: {
    about: 'Morning praise at first light, crowned by the Benedictus of Zachary — the day consecrated at its rising.',
    media: p('hour-laudes', 'East window at sunrise over the choir; psalter open to the Laudate psalms.'),
  },
  prima: {
    about: 'The first hour of the working day: psalms, the martyrology’s roll of the saints, and a blessing on the day’s work.',
    media: p('hour-prima', 'Martyrology lectern with the day’s entry; morning light on a chapter room.'),
  },
  tertia: {
    about: 'The third hour — the hour the Holy Ghost descended at Pentecost; the little hour of the Spirit.',
    media: p('hour-tertia', 'Mid-morning light through a rose window; breviary open at Terce.'),
  },
  sexta: {
    about: 'Midday prayer, at the hour the Lord was nailed to the Cross — work paused at the sun’s height.',
    media: p('hour-sexta', 'Noon shadow on a sundial inscribed with a psalm verse.'),
  },
  nona: {
    about: 'The ninth hour — the hour of the Lord’s death; the afternoon’s brief return to the psalter.',
    media: p('hour-nona', 'Late-afternoon light falling on a crucifix; breviary at None.'),
  },
  vesperae: {
    about: 'Evening prayer with the Magnificat of Our Lady — the day’s solemn thanksgiving as lamps are lit.',
    media: v('hour-vesperae', 'Sung Vespers: incensation of the altar during the Magnificat.'),
  },
  completorium: {
    about: 'The day’s completion before sleep: examination of conscience, Nunc dimittis, and the seasonal antiphon of Our Lady.',
    media: v('hour-completorium', 'Salve Regina by candlelight at the end of Compline, church otherwise dark.'),
  },
};
