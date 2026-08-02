/**
 * parallels — the Gospel-synopsis spine (ARCHITECTURE §7.7, CHECKLIST BM.4).
 *
 * PERICOPES lists the major synoptic/Johannine pericopes with their parallel
 * references, so the reader can hop between the four accounts of one scene
 * and the connections panel can group evidence by scenario cluster.
 *
 * Ref grammar: `<chapter>:<verseStart>[-<verseEnd>]` (single chapter — a
 * cross-chapter sweep like the whole Sermon on the Mount is represented by
 * its constituent pericopes instead).
 *
 * Book keys are the canonical Vulgate-abbreviation keys of BOOK_MAP in
 * scripts/ingest-bible.mjs — `Matt`, `Marc`, `Luc`, `Joann` (NOT Mt/Mc/Lc/Jo:
 * the node keys of the Bible plane are verse:Matt/…, verse:Marc/…, etc., and
 * a second vocabulary would fork the graph). Chapter:verse ranges follow the
 * Douay-Rheims / Vulgate versification of the vendored corpus (e.g. the
 * Transfiguration is Marc 9:1–9, not 9:2–10 as in KJV numbering) — every
 * range below is validated against VENDORED/douay-rheims by tests/parallels.test.ts.
 */

export interface Pericope {
  id: string;
  title: string;
  /** SCENARIO_CLUSTERS id. */
  cluster: string;
  /** Parallel refs per Gospel, `<chapter>:<verseStart>[-<verseEnd>]`. */
  refs: { Matt?: string; Marc?: string; Luc?: string; Joann?: string };
}

/**
 * The eight salvation-history scenario clusters (§7.7). The four OT clusters
 * anchor the Bible-wide imagery layer; Gospel pericopes live in the last four.
 */
export const SCENARIO_CLUSTERS: { id: string; label: string }[] = [
  { id: 'creation-fall', label: 'Creation & Fall' },
  { id: 'exodus-desert', label: 'Exodus & Desert' },
  { id: 'kingdom-exile', label: 'Kingdom & Exile' },
  { id: 'wisdom-psalter', label: 'Wisdom & Psalter' },
  { id: 'incarnation', label: 'Incarnation' },
  { id: 'public-ministry', label: 'Public Ministry' },
  { id: 'passion', label: 'Passion' },
  { id: 'resurrection-church', label: 'Resurrection & Church' },
];

export const PERICOPES: Pericope[] = [
  // ── Incarnation ────────────────────────────────────────────────────
  { id: 'prologue', title: 'The Word made flesh (Prologue)', cluster: 'incarnation', refs: { Joann: '1:1-18' } },
  { id: 'genealogy', title: 'Genealogy of Christ', cluster: 'incarnation', refs: { Matt: '1:1-17', Luc: '3:23-38' } },
  { id: 'annunciation', title: 'The Annunciation', cluster: 'incarnation', refs: { Luc: '1:26-38' } },
  { id: 'visitation', title: 'The Visitation', cluster: 'incarnation', refs: { Luc: '1:39-56' } },
  { id: 'nativity', title: 'The Nativity', cluster: 'incarnation', refs: { Matt: '1:18-25', Luc: '2:1-20' } },
  { id: 'magi', title: 'Adoration of the Magi', cluster: 'incarnation', refs: { Matt: '2:1-12' } },
  { id: 'flight-egypt', title: 'Flight into Egypt', cluster: 'incarnation', refs: { Matt: '2:13-23' } },
  { id: 'presentation', title: 'Presentation in the Temple', cluster: 'incarnation', refs: { Luc: '2:22-40' } },
  { id: 'finding-temple', title: 'Finding in the Temple', cluster: 'incarnation', refs: { Luc: '2:41-52' } },

  // ── Public ministry ────────────────────────────────────────────────
  { id: 'john-baptist-preaching', title: 'Preaching of John the Baptist', cluster: 'public-ministry', refs: { Matt: '3:1-12', Marc: '1:1-8', Luc: '3:1-18', Joann: '1:19-28' } },
  { id: 'baptism', title: 'Baptism of Jesus', cluster: 'public-ministry', refs: { Matt: '3:13-17', Marc: '1:9-11', Luc: '3:21-22', Joann: '1:29-34' } },
  { id: 'temptation', title: 'Temptation in the desert', cluster: 'public-ministry', refs: { Matt: '4:1-11', Marc: '1:12-13', Luc: '4:1-13' } },
  { id: 'call-first-disciples', title: 'Call of the first disciples', cluster: 'public-ministry', refs: { Matt: '4:18-22', Marc: '1:16-20', Luc: '5:1-11', Joann: '1:35-51' } },
  { id: 'cana', title: 'Wedding at Cana', cluster: 'public-ministry', refs: { Joann: '2:1-11' } },
  { id: 'cleansing-temple', title: 'Cleansing of the Temple', cluster: 'public-ministry', refs: { Matt: '21:12-17', Marc: '11:15-19', Luc: '19:45-48', Joann: '2:13-22' } },
  { id: 'nicodemus', title: 'Nicodemus and the new birth', cluster: 'public-ministry', refs: { Joann: '3:1-21' } },
  { id: 'samaritan-woman', title: 'The Samaritan woman at the well', cluster: 'public-ministry', refs: { Joann: '4:5-42' } },
  { id: 'rejection-nazareth', title: 'Rejection at Nazareth', cluster: 'public-ministry', refs: { Matt: '13:53-58', Marc: '6:1-6', Luc: '4:16-30' } },
  { id: 'beatitudes', title: 'Sermon on the Mount/Plain: the Beatitudes', cluster: 'public-ministry', refs: { Matt: '5:1-12', Luc: '6:20-26' } },
  { id: 'salt-light', title: 'Salt of the earth, light of the world', cluster: 'public-ministry', refs: { Matt: '5:13-16' } },
  { id: 'lords-prayer', title: "The Lord's Prayer", cluster: 'public-ministry', refs: { Matt: '6:9-15', Luc: '11:1-4' } },
  { id: 'house-on-rock', title: 'House built upon the rock', cluster: 'public-ministry', refs: { Matt: '7:24-29', Luc: '6:47-49' } },
  { id: 'leper', title: 'Cleansing of a leper', cluster: 'public-ministry', refs: { Matt: '8:1-4', Marc: '1:40-45', Luc: '5:12-16' } },
  { id: 'centurion', title: "Healing of the centurion's servant", cluster: 'public-ministry', refs: { Matt: '8:5-13', Luc: '7:1-10' } },
  { id: 'peters-mother-in-law', title: "Healing of Peter's mother-in-law", cluster: 'public-ministry', refs: { Matt: '8:14-17', Marc: '1:29-34', Luc: '4:38-41' } },
  { id: 'stilling-storm', title: 'Stilling of the storm', cluster: 'public-ministry', refs: { Matt: '8:23-27', Marc: '4:35-40', Luc: '8:22-25' } },
  { id: 'gerasene-demoniac', title: 'The Gerasene demoniac', cluster: 'public-ministry', refs: { Matt: '8:28-34', Marc: '5:1-20', Luc: '8:26-39' } },
  { id: 'paralytic', title: 'Healing of the paralytic', cluster: 'public-ministry', refs: { Matt: '9:1-8', Marc: '2:1-12', Luc: '5:17-26' } },
  { id: 'call-matthew', title: 'Call of Matthew (Levi)', cluster: 'public-ministry', refs: { Matt: '9:9-13', Marc: '2:13-17', Luc: '5:27-32' } },
  { id: 'jairus-hemorrhage', title: "Jairus' daughter and the woman with the issue of blood", cluster: 'public-ministry', refs: { Matt: '9:18-26', Marc: '5:21-43', Luc: '8:40-56' } },
  { id: 'mission-twelve', title: 'Mission of the Twelve', cluster: 'public-ministry', refs: { Matt: '10:1-15', Marc: '6:7-13', Luc: '9:1-6' } },
  { id: 'death-john-baptist', title: 'Death of John the Baptist', cluster: 'public-ministry', refs: { Matt: '14:1-12', Marc: '6:14-29', Luc: '9:7-9' } },
  { id: 'feeding-5000', title: 'Feeding of the five thousand', cluster: 'public-ministry', refs: { Matt: '14:13-21', Marc: '6:30-44', Luc: '9:10-17', Joann: '6:1-15' } },
  { id: 'walking-on-water', title: 'Walking on the water', cluster: 'public-ministry', refs: { Matt: '14:22-33', Marc: '6:45-52', Joann: '6:16-21' } },
  { id: 'bread-of-life', title: 'Bread of Life discourse', cluster: 'public-ministry', refs: { Joann: '6:22-60' } },
  { id: 'sower', title: 'Parable of the Sower', cluster: 'public-ministry', refs: { Matt: '13:1-23', Marc: '4:1-20', Luc: '8:4-15' } },
  { id: 'mustard-seed', title: 'Parable of the mustard seed', cluster: 'public-ministry', refs: { Matt: '13:31-32', Marc: '4:30-32', Luc: '13:18-19' } },
  { id: 'wheat-tares', title: 'Parable of the wheat and the cockle', cluster: 'public-ministry', refs: { Matt: '13:24-30' } },
  { id: 'treasure-pearl', title: 'Hidden treasure and the pearl of great price', cluster: 'public-ministry', refs: { Matt: '13:44-46' } },
  { id: 'good-samaritan', title: 'Parable of the Good Samaritan', cluster: 'public-ministry', refs: { Luc: '10:25-37' } },
  { id: 'martha-mary', title: 'Martha and Mary', cluster: 'public-ministry', refs: { Luc: '10:38-42' } },
  { id: 'lost-sheep', title: 'Parable of the lost sheep', cluster: 'public-ministry', refs: { Matt: '18:12-14', Luc: '15:1-7' } },
  { id: 'prodigal-son', title: 'Parable of the Prodigal Son', cluster: 'public-ministry', refs: { Luc: '15:11-32' } },
  { id: 'dives-lazarus', title: 'The rich man and Lazarus', cluster: 'public-ministry', refs: { Luc: '16:19-31' } },
  { id: 'pharisee-publican', title: 'The Pharisee and the publican', cluster: 'public-ministry', refs: { Luc: '18:9-14' } },
  { id: 'laborers-vineyard', title: 'Laborers in the vineyard', cluster: 'public-ministry', refs: { Matt: '20:1-16' } },
  { id: 'wicked-husbandmen', title: 'Parable of the wicked husbandmen', cluster: 'public-ministry', refs: { Matt: '21:33-46', Marc: '12:1-12', Luc: '20:9-19' } },
  { id: 'wedding-feast', title: 'The marriage feast / great supper', cluster: 'public-ministry', refs: { Matt: '22:1-14', Luc: '14:16-24' } },
  { id: 'ten-virgins', title: 'Parable of the ten virgins', cluster: 'public-ministry', refs: { Matt: '25:1-13' } },
  { id: 'talents', title: 'Parable of the talents / pounds', cluster: 'public-ministry', refs: { Matt: '25:14-30', Luc: '19:11-27' } },
  { id: 'last-judgment', title: 'The sheep and the goats (Last Judgment)', cluster: 'public-ministry', refs: { Matt: '25:31-46' } },
  { id: 'peters-confession', title: "Peter's confession at Caesarea Philippi", cluster: 'public-ministry', refs: { Matt: '16:13-20', Marc: '8:27-30', Luc: '9:18-21' } },
  { id: 'transfiguration', title: 'The Transfiguration', cluster: 'public-ministry', refs: { Matt: '17:1-9', Marc: '9:1-9', Luc: '9:28-36' } },
  { id: 'blessing-children', title: 'Blessing of the children', cluster: 'public-ministry', refs: { Matt: '19:13-15', Marc: '10:13-16', Luc: '18:15-17' } },
  { id: 'rich-young-man', title: 'The rich young man', cluster: 'public-ministry', refs: { Matt: '19:16-30', Marc: '10:17-31', Luc: '18:18-30' } },
  { id: 'blind-jericho', title: 'Healing of the blind at Jericho (Bartimaeus)', cluster: 'public-ministry', refs: { Matt: '20:29-34', Marc: '10:46-52', Luc: '18:35-43' } },
  { id: 'zacchaeus', title: 'Zacchaeus', cluster: 'public-ministry', refs: { Luc: '19:1-10' } },
  { id: 'adulteress', title: 'The woman taken in adultery', cluster: 'public-ministry', refs: { Joann: '8:1-11' } },
  { id: 'good-shepherd', title: 'The Good Shepherd discourse', cluster: 'public-ministry', refs: { Joann: '10:1-21' } },
  { id: 'lazarus-raised', title: 'Raising of Lazarus', cluster: 'public-ministry', refs: { Joann: '11:1-44' } },

  // ── Passion ────────────────────────────────────────────────────────
  { id: 'triumphal-entry', title: 'Triumphal entry into Jerusalem', cluster: 'passion', refs: { Matt: '21:1-11', Marc: '11:1-10', Luc: '19:28-40', Joann: '12:12-19' } },
  { id: 'anointing-bethany', title: 'Anointing at Bethany', cluster: 'passion', refs: { Matt: '26:6-13', Marc: '14:3-9', Joann: '12:1-8' } },
  { id: 'last-supper', title: 'Institution of the Eucharist', cluster: 'passion', refs: { Matt: '26:26-29', Marc: '14:22-25', Luc: '22:14-20' } },
  { id: 'washing-feet', title: 'Washing of the feet', cluster: 'passion', refs: { Joann: '13:1-15' } },
  { id: 'gethsemane', title: 'Agony in Gethsemani', cluster: 'passion', refs: { Matt: '26:36-46', Marc: '14:32-42', Luc: '22:39-46' } },
  { id: 'arrest', title: 'Arrest of Jesus', cluster: 'passion', refs: { Matt: '26:47-56', Marc: '14:43-52', Luc: '22:47-53', Joann: '18:1-12' } },
  { id: 'sanhedrin', title: 'Trial before the Sanhedrin', cluster: 'passion', refs: { Matt: '26:57-68', Marc: '14:53-65', Luc: '22:63-71' } },
  { id: 'peters-denial', title: "Peter's denial", cluster: 'passion', refs: { Matt: '26:69-75', Marc: '14:66-72', Luc: '22:54-62', Joann: '18:15-27' } },
  { id: 'pilate', title: 'Trial before Pilate', cluster: 'passion', refs: { Matt: '27:11-26', Marc: '15:1-15', Luc: '23:1-25', Joann: '18:28-40' } },
  { id: 'mockery', title: 'Crowning with thorns and mockery', cluster: 'passion', refs: { Matt: '27:27-31', Marc: '15:16-20', Joann: '19:1-5' } },
  { id: 'crucifixion', title: 'The Crucifixion', cluster: 'passion', refs: { Matt: '27:32-44', Marc: '15:21-32', Luc: '23:26-43', Joann: '19:17-27' } },
  { id: 'death-on-cross', title: 'Death on the Cross', cluster: 'passion', refs: { Matt: '27:45-56', Marc: '15:33-41', Luc: '23:44-49', Joann: '19:28-37' } },
  { id: 'burial', title: 'Burial of Jesus', cluster: 'passion', refs: { Matt: '27:57-66', Marc: '15:42-47', Luc: '23:50-56', Joann: '19:38-42' } },

  // ── Resurrection & Church ──────────────────────────────────────────
  { id: 'empty-tomb', title: 'The empty tomb', cluster: 'resurrection-church', refs: { Matt: '28:1-10', Marc: '16:1-8', Luc: '24:1-12', Joann: '20:1-10' } },
  { id: 'emmaus', title: 'The road to Emmaus', cluster: 'resurrection-church', refs: { Luc: '24:13-35' } },
  { id: 'appearance-thomas', title: 'Appearance to the disciples and Thomas', cluster: 'resurrection-church', refs: { Luc: '24:36-43', Joann: '20:19-29' } },
  { id: 'tiberias', title: 'Appearance at the Sea of Tiberias', cluster: 'resurrection-church', refs: { Joann: '21:1-14' } },
  { id: 'feed-my-sheep', title: "Peter's charge: feed my sheep", cluster: 'resurrection-church', refs: { Joann: '21:15-19' } },
  { id: 'great-commission', title: 'The Great Commission', cluster: 'resurrection-church', refs: { Matt: '28:16-20', Marc: '16:14-18' } },
  { id: 'ascension', title: 'The Ascension', cluster: 'resurrection-church', refs: { Marc: '16:19-20', Luc: '24:50-53' } },
];
