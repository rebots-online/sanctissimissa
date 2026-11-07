/**
 * Edition copy for the Bookstore catalogue and detail drawer
 * (L-bookstore-commerce-20261106.md §4.2; Closed set, Phase L: `catena-aurea-en` only).
 * The preview text is verbatim from the Oxford Catena (Matthew 16, Jerome).
 */

export interface EditionCopy {
  synopsis: string;
  benefits: readonly string[];
  integrationBullet: string;
  previewCitation: string;
  previewText: string;
  historicalDate: string;
}

const EDITION_COPY: Readonly<Record<string, EditionCopy>> = {
  'catena-aurea-en': {
    synopsis:
      "St. Thomas Aquinas's verse-by-verse chain of the Church Fathers on the four Gospels, in the Oxford translation edited by John Henry Newman (1841–1845).",
    benefits: [
      'Every pericope linked to its Gospel verses in Sacred Scripture',
      "Each Father's quotation a searchable, attributed entry",
      'Found by meaning search beside the Mass, the Office and Haydock',
      'Read aloud as an audiobook with line and word highlighting',
      "Drawn on by the Sacristan when you ask about the day's Gospel",
    ],
    integrationBullet: 'Linked with Sacred Scripture, the Mass and the Office',
    previewCitation: 'St. Matthew 16:13–19 · Jerome',
    previewText:
      'I suppose the gates of hell to mean vice and sin, or at least the doctrines of heretics by which men are ensnared and drawn into hell.',
    historicalDate: '1841–1845',
  },
};

export function editionCopy(editionId: string | null): EditionCopy | null {
  return editionId ? EDITION_COPY[editionId] ?? null : null;
}
