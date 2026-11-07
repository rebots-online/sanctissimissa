/**
 * catena-fathers — the closed Father slug/alias table of the Catena Aurea
 * graph (CHECKLIST BA.11; DOCS/ARCHITECTURE/L-content-modules-search-20261106.md
 * §2.6 "Father slug/alias table", Closed set, Phase L).
 *
 * 51 slugs, derived from all 89 vendored chapter files (54 observed labels,
 * 12,708 attributions). `aliases` are the observed attribution labels
 * VERBATIM, source misspellings included (`ISIDORE OF PELEUSIUM`,
 * `CLEMENT OF ALEXENDRIA`) and the line-wrapped hyphen forms
 * (`PSEUDO- CHRYSOSTOM`). Titles marked † in §2.6 keep the source label as
 * their title; the † itself is documentation only (identity not asserted)
 * and is dropped here.
 *
 * `class` ∈ {father, pseudonymous, gloss, council, anonymous, medieval, other}
 * (Closed set, Phase L). An unknown label fails the graph run (exit 4) —
 * the table is closed; extending it is an architecture change, not a fix-up.
 */

/** @typedef {'father'|'pseudonymous'|'gloss'|'council'|'anonymous'|'medieval'|'other'} FatherClass */
/** @typedef {{ slug: string, title: string, aliases: string[], class: FatherClass }} CatenaFather */

/** @type {readonly CatenaFather[]} */
export const CATENA_FATHERS = Object.freeze([
  { slug: 'chrysostom', title: 'St. John Chrysostom', aliases: ['CHRYSOSTOM'], class: 'father' },
  { slug: 'augustine', title: 'St. Augustine', aliases: ['AUGUSTINE'], class: 'father' },
  { slug: 'bede', title: 'St. Bede the Venerable', aliases: ['BEDE'], class: 'father' },
  { slug: 'theophylact', title: 'Theophylact', aliases: ['THEOPHYLACT'], class: 'medieval' },
  { slug: 'jerome', title: 'St. Jerome', aliases: ['JEROME'], class: 'father' },
  { slug: 'origen', title: 'Origen', aliases: ['ORIGEN'], class: 'father' },
  { slug: 'ambrose', title: 'St. Ambrose', aliases: ['AMBROSE'], class: 'father' },
  { slug: 'gregory-the-great', title: 'St. Gregory the Great', aliases: ['GREGORY'], class: 'father' },
  { slug: 'pseudo-chrysostom', title: 'Pseudo-Chrysostom', aliases: ['PSEUDO-CHRYSOSTOM', 'PSEUDO- CHRYSOSTOM'], class: 'pseudonymous' },
  { slug: 'hilary', title: 'St. Hilary of Poitiers', aliases: ['HILARY'], class: 'father' },
  { slug: 'gloss', title: 'Glossa Ordinaria', aliases: ['GLOSS'], class: 'gloss' },
  { slug: 'cyril-of-alexandria', title: 'St. Cyril of Alexandria', aliases: ['CYRIL OF ALEXANDRIA'], class: 'father' },
  { slug: 'remigius', title: 'Remigius', aliases: ['REMIGIUS'], class: 'medieval' },
  { slug: 'rabanus', title: 'Rabanus Maurus', aliases: ['RABANUS'], class: 'medieval' },
  { slug: 'pseudo-jerome', title: 'Pseudo-Jerome', aliases: ['PSEUDO-JEROME', 'PSEUDO- JEROME'], class: 'pseudonymous' },
  { slug: 'alcuin', title: 'Alcuin', aliases: ['ALCUIN'], class: 'medieval' },
  { slug: 'basil', title: 'St. Basil the Great', aliases: ['BASIL'], class: 'father' },
  { slug: 'greek-expositor', title: 'Greek Expositor', aliases: ['GREEK EXPOSITOR'], class: 'anonymous' },
  { slug: 'gregory-of-nyssa', title: 'St. Gregory of Nyssa', aliases: ['GREGORY OF NYSSA'], class: 'father' },
  { slug: 'eusebius', title: 'Eusebius', aliases: ['EUSEBIUS'], class: 'father' },
  { slug: 'titus-bostrensis', title: 'Titus of Bostra', aliases: ['TITUS BOSTRENSIS'], class: 'father' },
  { slug: 'athanasius', title: 'St. Athanasius', aliases: ['ATHANASIUS'], class: 'father' },
  { slug: 'pseudo-augustine', title: 'Pseudo-Augustine', aliases: ['PSEUDO-AUGUSTINE', 'PSEUDO- AUGUSTINE'], class: 'pseudonymous' },
  { slug: 'leo', title: 'St. Leo the Great', aliases: ['LEO'], class: 'father' },
  { slug: 'chrysologus', title: 'St. Peter Chrysologus', aliases: ['CHRYSOLOGUS'], class: 'father' },
  { slug: 'gregory-nazianzen', title: 'St. Gregory Nazianzen', aliases: ['GREGORY NAZIANZEN'], class: 'father' },
  { slug: 'cyprian', title: 'St. Cyprian', aliases: ['CYPRIAN'], class: 'father' },
  { slug: 'damascene', title: 'St. John Damascene', aliases: ['DAMASCENE'], class: 'father' },
  { slug: 'maximus', title: 'Maximus', aliases: ['MAXIMUS'], class: 'father' },
  { slug: 'haymo', title: 'Haymo', aliases: ['HAYMO'], class: 'medieval' },
  { slug: 'isidore-of-pelusium', title: 'St. Isidore of Pelusium', aliases: ['ISIDORE OF PELEUSIUM'], class: 'father' },
  { slug: 'didymus', title: 'Didymus the Blind', aliases: ['DIDYMUS'], class: 'father' },
  { slug: 'severianus', title: 'Severian of Gabala', aliases: ['SEVERIANUS'], class: 'father' },
  { slug: 'epiphanius', title: 'St. Epiphanius', aliases: ['EPIPHANIUS'], class: 'father' },
  { slug: 'cassian', title: 'John Cassian', aliases: ['CASSIAN'], class: 'father' },
  { slug: 'council-of-ephesus', title: 'Council of Ephesus', aliases: ['THE COUNCIL OF EPHESUS'], class: 'council' },
  { slug: 'theodotus', title: 'Theodotus', aliases: ['THEODOTUS'], class: 'father' },
  { slug: 'isidore', title: 'Isidore', aliases: ['ISIDORE'], class: 'father' },
  { slug: 'ambrosiaster', title: 'Ambrosiaster', aliases: ['AMBROSIASTER'], class: 'pseudonymous' },
  { slug: 'pseudo-athanasius', title: 'Pseudo-Athanasius', aliases: ['PSEUDO-ATHANASIUS'], class: 'pseudonymous' },
  { slug: 'cyril-of-jerusalem', title: 'St. Cyril of Jerusalem', aliases: ['CYRIL OF JERUSALEM'], class: 'father' },
  { slug: 'clement-of-alexandria', title: 'Clement of Alexandria', aliases: ['CLEMENT OF ALEXENDRIA'], class: 'father' },
  { slug: 'dionysius-of-alexandria', title: 'St. Dionysius of Alexandria', aliases: ['DIONYSIUS OF ALEXANDRIA'], class: 'father' },
  { slug: 'gennadius', title: 'Gennadius', aliases: ['GENNADIUS'], class: 'father' },
  { slug: 'petrus-alfonsus', title: 'Petrus Alfonsi', aliases: ['PETRUS ALFONSUS'], class: 'medieval' },
  { slug: 'josephus', title: 'Flavius Josephus', aliases: ['JOSEPHUS'], class: 'other' },
  { slug: 'nemesius', title: 'Nemesius of Emesa', aliases: ['NEMESIUS'], class: 'father' },
  { slug: 'anselm', title: 'St. Anselm', aliases: ['ANSELM'], class: 'medieval' },
  { slug: 'second-council-of-constantinople', title: 'Second Council of Constantinople', aliases: ['SECOND COUNCIL OF CONSTANTINOPLE'], class: 'council' },
  { slug: 'paschasius', title: 'Paschasius', aliases: ['PASCHASIUS'], class: 'medieval' },
  { slug: 'lanfranc', title: 'Lanfranc', aliases: ['LANFRANC'], class: 'medieval' },
]);

/** §2.6 label normalization: `\s+`→` `, then `-\s`→`-`, then trim. */
export function normalizeFatherLabel(label) {
  return String(label).replace(/\s+/g, ' ').replace(/-\s/g, '-').trim();
}

const ALIAS_INDEX = new Map();
for (const f of CATENA_FATHERS) {
  for (const a of f.aliases) ALIAS_INDEX.set(normalizeFatherLabel(a), f.slug);
}

/** Observed attribution label → Father slug, or null when the closed table has no match. */
export function aliasToSlug(label) {
  return ALIAS_INDEX.get(normalizeFatherLabel(label)) ?? null;
}

/** slug → table row (title lookup for quotation titles). */
export const FATHER_BY_SLUG = new Map(CATENA_FATHERS.map((f) => [f.slug, f]));
