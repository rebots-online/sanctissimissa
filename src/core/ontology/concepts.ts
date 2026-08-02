/**
 * Curated liturgical concept taxonomy — the ontology layer that groups
 * search results by concept (e.g. "Doxology") instead of returning flat
 * lists of individual loci. Concepts are detected at ingest time by
 * matching section names, regex patterns on normalized text, and keywords.
 *
 * Detection rules operate on normalizeText()-transformed content so they
 * match regardless of diacritics, ligatures, or capitalization.
 */

export interface ConceptDef {
  id: string;
  label: string;
  description: string;
  broader?: string;
  sectionNames: string[];
  patterns: RegExp[];
  keywords: string[];
}

export const CONCEPTS: ConceptDef[] = [
  {
    id: 'doxology',
    label: 'Doxology',
    description: 'A formula of praise to God, typically Trinitarian in form — e.g. Gloria Patri, the Greater Doxology (Gloria in excelsis), or the Sanctus-Trinitarian ascription.',
    broader: 'prayer_of_praise',
    sectionNames: [],
    patterns: [
      /gloria patri et filio et spiritui sancto/i,
      /gloria patri.*filii.*spiritu[i]? sancto/i,
      /sicut erat in principio.*nunc.*semper.*in saecula saeculorum/i,
      /glory be to the father.*son.*holy (ghost|spirit)/i,
      /glory to the father.*son.*holy (ghost|spirit)/i,
    ],
    keywords: ['gloria patri', 'glory be to the father', 'doxology', 'sicut erat in principio'],
  },
  {
    id: 'trinitarian_formula',
    label: 'Trinitarian Formula',
    description: 'Explicit invocation of the three Persons of the Trinity — the Father, the Son, and the Holy Ghost — in nominal or genitive form.',
    broader: 'doxology',
    sectionNames: [],
    patterns: [
      /in nomine patris et filii et spiritus sancti/i,
      /pater.*filius.*spiritus sanctus/i,
      /father.*son.*holy (ghost|spirit)/i,
    ],
    keywords: ['patris et filii et spiritus sancti', 'father son holy ghost', 'father son holy spirit'],
  },
  {
    id: 'prayer_of_praise',
    label: 'Prayer of Praise',
    description: 'A prayer whose primary mode is adoration and glorification of God, distinct from petition or contrition.',
    sectionNames: [],
    patterns: [],
    keywords: [],
  },
  {
    id: 'collect',
    label: 'Collect',
    description: 'The opening prayer of the Mass or Office hour, collecting the petitions of the faithful into a single prayer addressed to God through Christ.',
    sectionNames: ['Collect', 'Oratio', 'Collecta', 'Oratio Solemnis'],
    patterns: [
      /^collect\b/i,
      /^oratio\b/i,
    ],
    keywords: ['collect', 'oratio'],
  },
  {
    id: 'preface',
    label: 'Preface',
    description: 'The introductory part of the Canon, a prayer of thanksgiving leading into the Sanctus, varying by season or feast.',
    sectionNames: ['Praefatio', 'Prefatio'],
    patterns: [
      /vere dignum et iustum est.*nos.*tibi gratias agere/i,
      /it is truly meet and just.*right and salutary/i,
    ],
    keywords: ['praefatio', 'preface', 'vere dignum et iustum', 'sursum corda', 'habemus ad dominum'],
  },
  {
    id: 'canon',
    label: 'Canon of the Mass',
    description: 'The central Eucharistic prayer, from the Te igitur to the doxology before the Pater Noster — the unvarying core of the Roman Rite Mass.',
    sectionNames: ['Canon', 'Canon Actionis', 'Te Igitur', 'Memento', 'Communicantes', 'Hanc Igitur', 'Quam Oblationem', 'Qui Pridie', 'Unde et Memores', 'Supra Quae', 'Supplices', 'Memento Etiam', 'Nobis Quoque', 'Per Quem'],
    patterns: [
      /te igitur clementissime pater/i,
      /we therefore humbly beseech thee/i,
    ],
    keywords: ['canon', 'te igitur', 'memento vivorum', 'memento defunctorum', 'communicantes', 'hanc igitur'],
  },
  {
    id: 'kyrie',
    label: 'Kyrie Eleison',
    description: 'The triple invocation for mercy — Kyrie eleison, Christe eleison, Kyrie eleison — the Greek remnant of the ancient Roman liturgy.',
    sectionNames: ['Kyrie', 'Kyrie Eleison'],
    patterns: [
      /kyrie eleison/i,
      /lord have mercy/i,
    ],
    keywords: ['kyrie', 'eleison', 'lord have mercy'],
  },
  {
    id: 'gloria_in_excelsis',
    label: 'Gloria in Excelsis',
    description: 'The Greater Doxology — the angelic hymn from Luke 2:14 expanded into a Trinitarian prayer of praise, sung at solemn Masses.',
    broader: 'doxology',
    sectionNames: ['Gloria', 'Gloria in Excelsis'],
    patterns: [
      /gloria in excelsis deo/i,
      /glory to god in the highest/i,
    ],
    keywords: ['gloria in excelsis', 'glory to god in the highest', 'gloria'],
  },
  {
    id: 'sanctus',
    label: 'Sanctus',
    description: 'The acclamation of God\'s holiness from Isaiah 6:3 and Revelation 4:8, joined to the Benedictus from Matthew 21:9.',
    sectionNames: ['Sanctus'],
    patterns: [
      /sanctus sanctus sanctus dominus deus sabaoth/i,
      /holy holy holy lord god of hosts/i,
    ],
    keywords: ['sanctus', 'holy holy holy', 'benedictus qui venit', 'hosanna in excelsis'],
  },
  {
    id: 'agnus_dei',
    label: 'Agnus Dei',
    description: 'The invocation of Christ as the Lamb of God, sung during the Fraction — a plea for mercy and peace.',
    sectionNames: ['Agnus Dei'],
    patterns: [
      /agnus dei qui tollis peccata mundi/i,
      /lamb of god who takest away the sins of the world/i,
    ],
    keywords: ['agnus dei', 'lamb of god', 'qui tollis peccata mundi', 'miserere nobis', 'dona nobis pacem'],
  },
  {
    id: 'credo',
    label: 'Credo',
    description: 'The Nicene-Constantinopolitan Creed — the profession of faith sung at solemn Masses.',
    sectionNames: ['Credo', 'Symbolum Nicaenum'],
    patterns: [
      /credo in unum deum/i,
      /i believe in one god/i,
    ],
    keywords: ['credo', 'i believe in one god', 'credo in unum deum', 'symbolum'],
  },
  {
    id: 'pater_noster',
    label: 'Pater Noster',
    description: 'The Lord\'s Prayer — the model prayer given by Christ in Matthew 6:9-13, sung before Communion in the Mass.',
    sectionNames: ['Pater Noster', 'Oratio Dominica'],
    patterns: [
      /pater noster qui es in caelis/i,
      /our father who art in heaven/i,
    ],
    keywords: ['pater noster', 'our father', 'qui es in caelis', 'fiat voluntas tua', 'panem nostrum quotidianum'],
  },
  {
    id: 'psalm',
    label: 'Psalm',
    description: 'A psalm from the Book of Psalms — the foundational prayer poetry of both Mass and Office.',
    sectionNames: ['Psalmus', 'Psalm'],
    patterns: [
      /^psalmus\b/i,
    ],
    keywords: ['psalmus', 'psalm'],
  },
  {
    id: 'hymn',
    label: 'Hymn',
    description: 'A metrical hymn sung at each Office hour — a non-scriptural poetic prayer of praise or petition.',
    sectionNames: ['Hymnus', 'Hymnus Matutinum', 'Hymnus Laudes', 'Hymnus Vespera'],
    patterns: [
      /^hymnus\b/i,
    ],
    keywords: ['hymnus', 'hymn'],
  },
  {
    id: 'antiphon',
    label: 'Antiphon',
    description: 'A short verse sung before and after a psalm or canticle, framing it with a thematic or seasonal context.',
    sectionNames: ['Ant Laudes', 'Ant Vespera', 'Ant Matutinum', 'Ant Completorium', 'Ant 1', 'Ant 2', 'Ant 3'],
    patterns: [
      /^ant\b/i,
    ],
    keywords: ['antiphon', 'ant laudes', 'ant vespera', 'ant matutinum'],
  },
  {
    id: 'responsory',
    label: 'Responsory',
    description: 'A responsorial chant following a lesson in the Office of Matins — a short verse response to a longer chant.',
    sectionNames: ['Responsory', 'Responsory Breve', 'Responsory Breve Prima', 'Responsory Breve Tertia', 'Responsory Breve Sexta', 'Responsory Breve Nona'],
    patterns: [
      /^responsory\b/i,
    ],
    keywords: ['responsory', 'responsory breve'],
  },
  {
    id: 'lesson',
    label: 'Lesson / Reading',
    description: 'A scriptural or patristic reading from the Office of Matins or a lesson in the Mass.',
    sectionNames: ['Lectio', 'Lectio1', 'Lectio2', 'Lectio3', 'Lectio4', 'Lectio5', 'Lectio6', 'Lectio7', 'Lectio8', 'Lectio9', 'Lectio Prima', 'Lectio brevis', 'Epistola', 'Evangelium'],
    patterns: [
      /^lectio\b/i,
      /^epistola\b/i,
      /^evangelium\b/i,
    ],
    keywords: ['lectio', 'epistola', 'evangelium', 'lesson', 'reading'],
  },
  {
    id: 'versicle',
    label: 'Versicle and Response',
    description: 'A short call-and-response exchange — the V. (versicle) and R. (response) — used throughout the Office.',
    sectionNames: ['Versum', 'Versum 2', 'Versum 3', 'Versum Prima', 'Versum Tertia', 'Versum Sexta', 'Versum Nona', 'Nocturn Versum'],
    patterns: [
      /^versum\b/i,
    ],
    keywords: ['versum', 'versicle', 'v. r.'],
  },
  {
    id: 'blessing',
    label: 'Blessing',
    description: 'A benediction — an invocation of God\'s favor upon persons or things.',
    sectionNames: ['Benedictio', 'Benedictio Esca', 'Benedictio Candelarum'],
    patterns: [
      /^benedictio\b/i,
      /benedicat vos omnipotens/i,
    ],
    keywords: ['benedictio', 'blessing', 'benedicat', 'benedic'],
  },
  {
    id: 'introitus',
    label: 'Introit',
    description: 'The entrance chant of the Mass — an antiphon with psalm verse, setting the tone for the feast or season.',
    broader: 'chant_propers',
    sectionNames: ['Introitus'],
    patterns: [
      /^introitus\b/i,
    ],
    keywords: ['introitus', 'introit'],
  },
  {
    id: 'graduale',
    label: 'Gradual',
    description: 'The chant after the Epistle — a responsorial psalm, elaborate in melisma, the older of the two chants between the readings.',
    broader: 'chant_propers',
    sectionNames: ['Graduale'],
    patterns: [
      /^graduale\b/i,
    ],
    keywords: ['graduale', 'gradual'],
  },
  {
    id: 'alleluia',
    label: 'Alleluia',
    description: 'The jubilant chant before the Gospel — replaced by the Tract during Septuagesima-Lent and doubled in Paschaltide.',
    broader: 'chant_propers',
    sectionNames: ['Alleluia'],
    patterns: [
      /^alleluia\b/i,
    ],
    keywords: ['alleluia', 'alleluia'],
  },
  {
    id: 'tractus',
    label: 'Tract',
    description: 'The penitential chant replacing the Alleluia during Septuagesima and Lent — a direct psalm setting without responsorial structure.',
    broader: 'chant_propers',
    sectionNames: ['Tractus'],
    patterns: [
      /^tractus\b/i,
    ],
    keywords: ['tractus', 'tract'],
  },
  {
    id: 'offertorium',
    label: 'Offertory',
    description: 'The chant accompanying the preparation of the gifts — an antiphon with psalm verses from the Proper.',
    broader: 'chant_propers',
    sectionNames: ['Offertorium'],
    patterns: [
      /^offertorium\b/i,
    ],
    keywords: ['offertorium', 'offertory'],
  },
  {
    id: 'communio',
    label: 'Communion',
    description: 'The chant during the distribution of Communion — an antiphon with psalm verse from the Proper.',
    broader: 'chant_propers',
    sectionNames: ['Communio'],
    patterns: [
      /^communio\b/i,
    ],
    keywords: ['communio', 'communion'],
  },
  {
    id: 'marian_antiphon',
    label: 'Marian Antiphon',
    description: 'A devotional antiphon to the Blessed Virgin Mary sung at the end of Compline — seasonal (Alma Redemptoris, Ave Regina, Regina Caeli, Salve Regina).',
    broader: 'antiphon',
    sectionNames: ['Ant Mariana', 'Maria Antiphon'],
    patterns: [
      /alma redemptoris mater/i,
      /ave regina caelorum/i,
      /regina caeli laetare/i,
      /salve regina mater misericordiae/i,
    ],
    keywords: ['alma redemptoris', 'ave regina', 'regina caeli', 'salve regina', 'marian antiphon'],
  },
  {
    id: 'confiteor',
    label: 'Confiteor',
    description: 'The confession of sins at the beginning of Mass or before Compline — a penitential prayer acknowledging fault and seeking intercession.',
    sectionNames: ['Confiteor'],
    patterns: [
      /confiteor deo omnipotenti/i,
      /i confess to almighty god/i,
    ],
    keywords: ['confiteor', 'i confess', 'mea culpa', 'mea maxima culpa'],
  },
  {
    id: 'asperges',
    label: 'Asperges',
    description: 'The sprinkling of holy water before the principal Sunday Mass — a penitential rite using Psalm 50 (51).',
    sectionNames: ['Asperges', 'Asperges Me'],
    patterns: [
      /asperges me domine hyssopo/i,
      /thou shalt sprinkle me/i,
    ],
    keywords: ['asperges', 'sprinkle', 'hyssopo'],
  },
  {
    id: 'ite_missa_est',
    label: 'Ite Missa Est',
    description: 'The dismissal at the end of Mass — the deacon\'s charge sending the faithful forth.',
    sectionNames: ['Ite Missa Est'],
    patterns: [
      /ite missa est/i,
      /go the mass is ended/i,
    ],
    keywords: ['ite missa est', 'go the mass is ended', 'dismissal'],
  },
  {
    id: 'chant_propers',
    label: 'Proper Chants',
    description: 'The variable chants of the Mass Proper — Introit, Gradual, Alleluia/Tract, Offertory, Communion — changing with the feast or season.',
    sectionNames: [],
    patterns: [],
    keywords: [],
  },
];

/**
 * Imagery / metaphor / typology concepts — the great scriptural images that
 * recur across Mass and Office texts. Keyword seeds are given in BOTH Latin
 * and English so detection works on either column of a text block.
 * Merged into CONCEPTS below, so the ingest (scripts/ingest-corpus.mjs, which
 * imports CONCEPTS) picks these up automatically on the next re-ingest.
 */
export const IMAGERY_CONCEPTS: ConceptDef[] = [
  {
    id: 'sacred_imagery',
    label: 'Sacred Imagery',
    description: 'The recurring scriptural images, metaphors, and types through which the liturgy speaks of God and salvation — light, shepherd, vine, water, bread, lamb, and their kin.',
    sectionNames: [],
    patterns: [],
    keywords: [],
  },
  {
    id: 'light_darkness',
    label: 'Light & Darkness',
    description: 'The image of God and Christ as light dispelling the darkness of sin and death — from the creation of light through John\'s prologue to the Paschal candle.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /lumen de lumine/i,
      /light of light/i,
    ],
    keywords: ['lux', 'lumen', 'tenebrae', 'illumina', 'light', 'darkness', 'lumen christi', 'light of the world', 'lux mundi'],
  },
  {
    id: 'shepherd_flock',
    label: 'Shepherd & Flock',
    description: 'Christ the Good Shepherd and the faithful as His flock — Psalm 22 (23), Ezekiel 34, and John 10.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /dominus regit me/i,
      /ego sum pastor bonus/i,
      /the lord is my shepherd/i,
    ],
    keywords: ['pastor', 'ovis', 'oves', 'grex', 'agni', 'shepherd', 'sheep', 'flock', 'pastor bonus', 'good shepherd'],
  },
  {
    id: 'vine_vineyard',
    label: 'Vine & Vineyard',
    description: 'Israel and the Church as God\'s vineyard, and Christ the true vine whose branches bear fruit — Isaiah 5, Psalm 79 (80), and John 15.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /ego sum vitis vera/i,
      /i am the true vine/i,
    ],
    keywords: ['vitis', 'vinea', 'palmes', 'palmites', 'vine', 'vineyard', 'branches', 'vinea domini'],
  },
  {
    id: 'water_baptism',
    label: 'Water & Baptism',
    description: 'Water as the sign of cleansing and rebirth — the Red Sea passage, the rock in the desert, the living water of John 4, and the font of Baptism.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /vidi aquam/i,
      /aqua viva/i,
      /living water/i,
    ],
    keywords: ['aqua', 'aquae', 'fons', 'baptisma', 'baptismum', 'water', 'fountain', 'baptism', 'font', 'wellspring'],
  },
  {
    id: 'bread_from_heaven',
    label: 'Bread from Heaven',
    description: 'The manna of the Exodus fulfilled in the Eucharist — Christ the living bread come down from heaven in John 6.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /panem de caelo/i,
      /panis vivus/i,
      /bread from heaven/i,
    ],
    keywords: ['panis', 'manna', 'panis angelicus', 'panem de caelo', 'bread', 'bread from heaven', 'living bread', 'bread of life'],
  },
  {
    id: 'lamb_sacrifice',
    label: 'Lamb & Sacrifice',
    description: 'Christ the Paschal Lamb whose sacrifice takes away sin — the Passover lamb of Exodus 12, Isaiah 53, and the Lamb of the Apocalypse.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /ecce agnus dei/i,
      /behold the lamb of god/i,
    ],
    keywords: ['agnus', 'hostia', 'victima', 'immolatus', 'sacrificium', 'lamb', 'sacrifice', 'paschal lamb', 'victim', 'oblation'],
  },
  {
    id: 'king_kingdom',
    label: 'King & Kingdom',
    description: 'Christ as King and the reign of God — the royal psalms, the kingship of David fulfilled, and the kingdom proclaimed in the Gospels.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /rex regum/i,
      /king of kings/i,
      /adveniat regnum tuum/i,
    ],
    keywords: ['rex', 'regnum', 'thronus', 'rex gloriae', 'king', 'kingdom', 'throne', 'reign', 'king of glory'],
  },
  {
    id: 'bridegroom_bride',
    label: 'Bridegroom & Bride',
    description: 'Christ the Bridegroom and the Church (or the soul) His bride — the Canticle of Canticles, Psalm 44 (45), and the wedding feast of the Lamb.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /ecce sponsus venit/i,
      /behold the bridegroom/i,
    ],
    keywords: ['sponsus', 'sponsa', 'nuptiae', 'thalamus', 'bridegroom', 'bride', 'wedding feast', 'marriage', 'espoused'],
  },
  {
    id: 'desert_exile',
    label: 'Desert & Exile',
    description: 'The wilderness as the place of testing, purification, and longing for the promised land — the forty years of the Exodus, the Babylonian exile, and Christ\'s forty days.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /super flumina babylonis/i,
      /by the waters of babylon/i,
    ],
    keywords: ['desertum', 'eremus', 'solitudo', 'exsilium', 'peregrinatio', 'desert', 'wilderness', 'exile', 'pilgrimage', 'sojourn'],
  },
  {
    id: 'mountain_of_god',
    label: 'Mountain of God',
    description: 'The holy mountain as the place of encounter with God — Sinai, Sion, Tabor, and Calvary.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /in monte sancto/i,
      /mons sion/i,
      /holy mountain/i,
    ],
    keywords: ['mons', 'montes', 'mons sanctus', 'sion', 'mountain', 'holy mountain', 'mount sion', 'hill of the lord'],
  },
  {
    id: 'temple_dwelling',
    label: 'Temple & Dwelling',
    description: 'God dwelling among His people — the tabernacle of the desert, the temple of Jerusalem, Christ\'s body as temple, and the faithful as living stones.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /domus dei/i,
      /templum dei/i,
      /house of god/i,
    ],
    keywords: ['templum', 'tabernaculum', 'domus dei', 'habitatio', 'sanctuarium', 'temple', 'tabernacle', 'dwelling', 'house of god', 'sanctuary'],
  },
  {
    id: 'harvest_vintage',
    label: 'Harvest & Vintage',
    description: 'Sowing and reaping as the image of God\'s word bearing fruit and of the final judgment — the parable of the sower and the harvest at the end of the age.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /messis quidem multa/i,
      /the harvest indeed is great/i,
    ],
    keywords: ['messis', 'seges', 'vindemia', 'fructus', 'primitiae', 'harvest', 'vintage', 'firstfruits', 'reap', 'sow'],
  },
  {
    id: 'way_journey',
    label: 'The Way / Journey',
    description: 'The life of faith as a road walked with God — the paths of the psalms, the Emmaus road, and Christ who is Himself the Way.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /ego sum via/i,
      /vias tuas domine/i,
      /i am the way/i,
    ],
    keywords: ['via', 'viae', 'iter', 'semita', 'semitae', 'way', 'path', 'journey', 'walk', 'shew me thy ways'],
  },
  {
    id: 'rock_foundation',
    label: 'Rock & Foundation',
    description: 'God as the rock of refuge and Christ the cornerstone rejected by the builders — Psalm 17 (18), Matthew 7 and 16, and 1 Peter 2.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /lapis angularis/i,
      /super hanc petram/i,
      /corner ?stone/i,
    ],
    keywords: ['petra', 'lapis', 'fundamentum', 'firmamentum', 'rock', 'stone', 'foundation', 'cornerstone', 'upon this rock'],
  },
  {
    id: 'fire_spirit',
    label: 'Fire & Spirit',
    description: 'Fire as the sign of God\'s presence and of the Holy Ghost — the burning bush, the pillar of fire, and the tongues of flame at Pentecost.',
    broader: 'sacred_imagery',
    sectionNames: [],
    patterns: [
      /ignis divini amoris/i,
      /tongues.*of fire/i,
      /veni sancte spiritus/i,
    ],
    keywords: ['ignis', 'flamma', 'spiritus sanctus', 'pentecostes', 'fire', 'flame', 'holy ghost', 'pentecost', 'tongues of fire'],
  },
];

// Merge into the aggregate the ingest consumes — scripts/ingest-corpus.mjs
// imports CONCEPTS, so a future re-ingest picks these up automatically.
CONCEPTS.push(...IMAGERY_CONCEPTS);
